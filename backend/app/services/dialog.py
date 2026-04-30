"""Process a client message: load history, call LLM, persist outgoing reply.

Stage 3 deliberately keeps the funnel piece minimal — there are no funnels yet
(Stage 5). We feed the LLM the master's profile + last N messages, send the
reply back via the bot, and store the assistant message.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.llm import LLMProvider, LLMServiceError
from app.llm.base import LLMMessage
from app.llm.prompts import build_step_prompt
from app.models import (
    Conversation,
    Master,
    Message,
    MessageDirection,
)

log = logging.getLogger(__name__)

FALLBACK_REPLY = "Секунду, уточняю детали и напишу через минуту."


async def process_client_message(
    session: AsyncSession,
    *,
    master: Master,
    conversation: Conversation,
    user_text: str,
    llm: LLMProvider,
) -> Message:
    """Run the LLM for one inbound message; persist and return the outgoing message row.

    The caller is responsible for committing the session and actually sending
    the reply to the client (the bot handler does both).
    """
    history = await _load_history(session, conversation.id, limit=settings.LLM_HISTORY_MESSAGES)
    system_prompt = build_step_prompt(
        master_name=master.name,
        niche=master.niche,
        step_goal=None,
        step_system_prompt=None,
        services_text=None,
    )

    try:
        result = await llm.generate(
            system_prompt=system_prompt,
            history=history,
            user_message=user_text,
        )
        reply_text = result.reply
        meta = {
            "next_step_id": result.next_step_id,
            "escalate": result.escalate,
            "collected_data": result.collected_data,
            "slot_intent": result.slot_intent,
            "portfolio_request": result.portfolio_request,
        }
    except LLMServiceError as e:
        log.exception("LLM failed for conversation_id=%s: %s", conversation.id, e)
        reply_text = FALLBACK_REPLY
        meta = {"error": str(e), "fallback": True}

    out = Message(
        conversation_id=conversation.id,
        direction=MessageDirection.OUT,
        text=reply_text,
        llm_meta=meta,
    )
    session.add(out)
    await session.flush()
    return out


async def _load_history(
    session: AsyncSession, conversation_id: int, *, limit: int
) -> list[LLMMessage]:
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(limit)
    )
    rows = list(result.scalars().all())
    rows.reverse()
    history: list[LLMMessage] = []
    for row in rows:
        if not row.text:
            continue
        if row.direction == MessageDirection.IN:
            history.append(LLMMessage(role="user", content=row.text))
        elif row.direction == MessageDirection.OUT:
            history.append(LLMMessage(role="assistant", content=row.text))
        # MASTER messages are excluded — they're human takeover, not part of the
        # bot/client conversation thread the LLM is reasoning about.
    return history
