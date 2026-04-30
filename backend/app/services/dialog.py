"""Process a client message: pick funnel, run LLM, advance step, persist reply."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.llm import LLMProvider, LLMServiceError
from app.llm.base import LLMMessage
from app.llm.prompts import build_step_prompt
from app.models import (
    Booking,
    Client,
    Conversation,
    FunnelStep,
    Master,
    Message,
    MessageDirection,
    Service,
)
from app.services.booking_create import BookingError, create_booking
from app.services.funnel import (
    first_step,
    funnel_step_by_id,
    select_funnel_for_conversation,
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
    """Run the funnel + LLM for one inbound message; persist the OUT row.

    Caller is responsible for committing the session and sending the reply.
    """
    history = await _load_history(session, conversation.id, limit=settings.LLM_HISTORY_MESSAGES)

    step = await _resolve_active_step(session, master=master, conversation=conversation)
    services_text = await _services_block(session, master.id)

    system_prompt = build_step_prompt(
        master_name=master.name,
        niche=master.niche,
        timezone=master.timezone or "Europe/Moscow",
        step_goal=step.goal if step else None,
        step_system_prompt=step.system_prompt if step else None,
        services_text=services_text,
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
            "step_id": step.id if step else None,
        }

        # Advance the conversation's funnel step.
        if step is not None:
            target = await _next_step(session, current=step, hinted_id=result.next_step_id)
            if target is not None and target.id != conversation.current_step_id:
                conversation.current_step_id = target.id
                conversation.current_funnel_id = target.funnel_id

        # If the model confirmed a slot — try to create a booking.
        if result.slot_intent:
            booking = await _try_create_from_slot_intent(
                session,
                master=master,
                conversation=conversation,
                slot_intent=result.slot_intent,
                collected=result.collected_data,
            )
            if booking is not None:
                meta["booking_id"] = booking.id
            else:
                meta["booking_skipped"] = True
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


async def _resolve_active_step(
    session: AsyncSession, *, master: Master, conversation: Conversation
) -> FunnelStep | None:
    if conversation.current_step_id:
        step = await funnel_step_by_id(session, conversation.current_step_id)
        if step:
            return step

    funnel = await select_funnel_for_conversation(
        session,
        master_id=master.id,
        client_id=conversation.client_id,
        conversation=conversation,
    )
    if funnel is None:
        return None

    step = await first_step(session, funnel.id)
    if step is not None:
        conversation.current_funnel_id = funnel.id
        conversation.current_step_id = step.id
    return step


async def _next_step(
    session: AsyncSession,
    *,
    current: FunnelStep,
    hinted_id: int | None,
) -> FunnelStep | None:
    """LLM may suggest next_step_id; fall back to the next position-wise step."""
    if hinted_id is not None and hinted_id != current.id:
        target = await funnel_step_by_id(session, hinted_id)
        if target is not None and target.funnel_id == current.funnel_id:
            return target
    return current  # default: stay


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
    return history


async def _try_create_from_slot_intent(
    session: AsyncSession,
    *,
    master: Master,
    conversation: Conversation,
    slot_intent: dict,
    collected: dict,
) -> Booking | None:
    starts_at_raw = slot_intent.get("starts_at")
    service_id = slot_intent.get("service_id")
    if not starts_at_raw:
        return None
    try:
        starts_at = datetime.fromisoformat(str(starts_at_raw))
    except ValueError:
        log.warning("slot_intent: invalid starts_at=%r", starts_at_raw)
        return None

    # Reject naive timestamps and anything in the past — protects against the
    # LLM hallucinating last-year dates when it doesn't know "today".
    if starts_at.tzinfo is None:
        log.warning("slot_intent: missing tz on starts_at=%r", starts_at_raw)
        return None
    if starts_at <= datetime.now(UTC):
        log.warning("slot_intent: starts_at in the past (%s)", starts_at.isoformat())
        return None

    svc: Service | None = None
    if service_id is not None:
        svc = await session.get(Service, int(service_id))
        if svc is None or svc.master_id != master.id or not svc.is_active:
            svc = None
    if svc is None:
        # Fall back to the first active service.
        svc = (
            await session.execute(
                select(Service)
                .where(Service.master_id == master.id, Service.is_active.is_(True))
                .order_by(Service.id)
                .limit(1)
            )
        ).scalar_one_or_none()
    if svc is None:
        return None

    client = await session.get(Client, conversation.client_id)
    if client is None:
        return None
    if not client.name and isinstance(collected.get("name"), str):
        client.name = collected["name"]
    if not client.phone and isinstance(collected.get("phone"), str):
        client.phone = collected["phone"]

    try:
        return await create_booking(
            session,
            master=master,
            client=client,
            service=svc,
            starts_at=starts_at,
            source="bot",
        )
    except BookingError as e:
        log.warning("slot_intent rejected: %s", e)
        return None


async def _services_block(session: AsyncSession, master_id: int) -> str | None:
    rows = (
        (
            await session.execute(
                select(Service)
                .where(Service.master_id == master_id, Service.is_active.is_(True))
                .order_by(Service.id)
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        return None
    lines = [
        f"- id={s.id}: {s.name}, {s.duration_minutes} мин, {s.price} ₽"
        + (f" — {s.description}" if s.description else "")
        for s in rows
    ]
    return "\n".join(lines)


__all__ = ["process_client_message"]
