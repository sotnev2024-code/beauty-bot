from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import desc, select

from app.api.deps import CurrentMaster, SessionDep
from app.core.config import settings
from app.models import (
    Client,
    Conversation,
    ConversationState,
    Message,
)
from app.schemas.conversation import (
    ConversationDetail,
    ConversationSummary,
    MessageRead,
    TakeoverRequest,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    master: CurrentMaster,
    session: SessionDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ConversationSummary]:
    rows = (
        (
            await session.execute(
                select(Conversation)
                .where(Conversation.master_id == master.id)
                .order_by(desc(Conversation.last_message_at).nullslast())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )

    out: list[ConversationSummary] = []
    for c in rows:
        client_name = await session.scalar(select(Client.name).where(Client.id == c.client_id))
        last_text = await session.scalar(
            select(Message.text)
            .where(Message.conversation_id == c.id)
            .order_by(Message.id.desc())
            .limit(1)
        )
        out.append(
            ConversationSummary(
                id=c.id,
                client_id=c.client_id,
                client_name=client_name,
                state=c.state,
                takeover_until=c.takeover_until,
                last_message_at=c.last_message_at,
                last_message_preview=(last_text or "")[:120] or None,
            )
        )
    return out


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    master: CurrentMaster,
    session: SessionDep,
    msg_limit: int = Query(50, ge=1, le=500),
) -> ConversationDetail:
    return await _conversation_detail(session, master.id, conversation_id, msg_limit)


@router.post("/{conversation_id}/takeover", response_model=ConversationDetail)
async def takeover_conversation(
    conversation_id: int,
    payload: TakeoverRequest,
    master: CurrentMaster,
    session: SessionDep,
) -> ConversationDetail:
    conv = await _get_owned(session, master.id, conversation_id)
    hours = payload.hours or settings.HUMAN_TAKEOVER_HOURS
    conv.state = ConversationState.HUMAN_TAKEOVER
    conv.takeover_until = datetime.now(UTC) + timedelta(hours=hours)
    await session.commit()
    return await _conversation_detail(session, master.id, conversation_id)


@router.post("/{conversation_id}/release", response_model=ConversationDetail)
async def release_conversation(
    conversation_id: int,
    master: CurrentMaster,
    session: SessionDep,
) -> ConversationDetail:
    conv = await _get_owned(session, master.id, conversation_id)
    conv.state = ConversationState.BOT
    conv.takeover_until = None
    await session.commit()
    return await _conversation_detail(session, master.id, conversation_id)


async def _conversation_detail(
    session: SessionDep, master_id: int, conversation_id: int, msg_limit: int = 50
) -> ConversationDetail:
    conv = await _get_owned(session, master_id, conversation_id)
    client_name = await session.scalar(select(Client.name).where(Client.id == conv.client_id))
    msgs = (
        (
            await session.execute(
                select(Message)
                .where(Message.conversation_id == conv.id)
                .order_by(Message.id.desc())
                .limit(msg_limit)
            )
        )
        .scalars()
        .all()
    )
    msgs = list(reversed(msgs))
    return ConversationDetail(
        id=conv.id,
        client_id=conv.client_id,
        client_name=client_name,
        state=conv.state,
        takeover_until=conv.takeover_until,
        last_message_at=conv.last_message_at,
        messages=[MessageRead.model_validate(m) for m in msgs],
    )


async def _get_owned(session: SessionDep, master_id: int, conversation_id: int) -> Conversation:
    conv = (
        await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id, Conversation.master_id == master_id
            )
        )
    ).scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conversation not found")
    return conv
