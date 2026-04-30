"""Process a client message: build prompt from bot_settings + KB + services,
run LLM, dispatch declared actions, persist reply.

The funnel concept is gone — there's no `current_step_id` lookup. Instead:
  * We build the system prompt from the master's bot_settings (greeting,
    voice, format), short KB items, active services, and any active return
    campaign for this client.
  * The LLM emits {reply, actions[], escalate, collected}.
  * We dispatch each action: create_booking, send_portfolio, send_location,
    lookup_kb. find_slots is currently a no-op stub.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.llm import LLMProvider, LLMServiceError
from app.llm.base import LLMMessage
from app.llm.prompts import build_bot_prompt
from app.models import (
    BotSettings,
    Client,
    Conversation,
    KnowledgeBaseItem,
    Master,
    Message,
    MessageDirection,
    ReturnCampaign,
    Service,
    ServiceCategory,
)
from app.services.booking_create import BookingError, create_booking

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
    """Run the LLM for one inbound message; persist the OUT row.

    Caller is responsible for committing the session and sending the reply.
    """
    history = await _load_history(session, conversation.id, limit=settings.LLM_HISTORY_MESSAGES)
    bot_settings = await _load_or_default_bot_settings(session, master.id)

    services_text = await _services_block(session, master.id)
    kb_short_lines = await _kb_short_lines(session, master.id)
    return_context = await _return_context(session, master_id=master.id, client_id=conversation.client_id)

    system_prompt = build_bot_prompt(
        master_name=master.name,
        niche=master.niche,
        timezone=master.timezone or "Europe/Moscow",
        voice_tone=bot_settings.voice_tone,
        message_format=bot_settings.message_format,
        services_text=services_text,
        kb_short_lines=kb_short_lines,
        return_context=return_context,
    )

    meta: dict[str, Any]
    try:
        result = await llm.generate(
            system_prompt=system_prompt,
            history=history,
            user_message=user_text,
        )
        reply_text = result.reply
        # Back-compat: synthesize actions from legacy fields if the LLM
        # provider populated them but didn't fill `actions` (some test stubs
        # still construct LLMResult with slot_intent= directly).
        actions = list(result.actions or [])
        if not actions and result.slot_intent:
            actions.append({"type": "create_booking", **result.slot_intent})
        if not actions and result.portfolio_request:
            actions.append({"type": "send_portfolio"})

        meta = {
            "escalate": result.escalate,
            "collected_data": result.collected_data,
            "actions": actions,
        }

        # Dispatch declared actions. Each action runs against the same session
        # and contributes notes back into meta (e.g. booking_id).
        if actions:
            await _dispatch_actions(
                session,
                master=master,
                conversation=conversation,
                actions=actions,
                collected=result.collected_data,
                meta=meta,
            )
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


# ----------------------------------------------------------- prompt assembly


async def _load_or_default_bot_settings(
    session: AsyncSession, master_id: int
) -> BotSettings:
    bs = await session.get(BotSettings, master_id)
    if bs is not None:
        return bs
    # Defensive: post-migration this should never happen, but the LLM still
    # needs *something* to drive voice/format.
    return BotSettings(
        master_id=master_id,
        greeting="Здравствуйте! Подскажите, чем могу помочь?",
        voice_tone="warm",
        message_format="hybrid",
        is_enabled=True,
        reminders_enabled=False,
    )


async def _kb_short_lines(session: AsyncSession, master_id: int) -> list[str]:
    """Return the always-in-prompt short KB items (address, payment, ...)."""
    rows = (
        (
            await session.execute(
                select(KnowledgeBaseItem)
                .where(
                    KnowledgeBaseItem.master_id == master_id,
                    KnowledgeBaseItem.is_short.is_(True),
                )
                .order_by(KnowledgeBaseItem.position, KnowledgeBaseItem.id)
            )
        )
        .scalars()
        .all()
    )
    out: list[str] = []
    for r in rows:
        body = r.content.strip().replace("\n", " ")
        out.append(f"{r.title}: {body}")
        if r.geolocation_lat is not None and r.geolocation_lng is not None:
            out.append(
                f"Координаты {r.title.lower()}: "
                f"{r.geolocation_lat:.6f}, {r.geolocation_lng:.6f}"
            )
        if r.yandex_maps_url:
            out.append(f"Яндекс.Карты: {r.yandex_maps_url}")
    return out


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

    cats = {
        c.id: c
        for c in (
            (
                await session.execute(
                    select(ServiceCategory).where(ServiceCategory.master_id == master_id)
                )
            )
            .scalars()
            .all()
        )
    }

    lines = []
    for s in rows:
        cat_name = cats[s.category_id].name if (s.category_id and s.category_id in cats) else (
            s.group or None
        )
        cat_part = f" [{cat_name}]" if cat_name else ""
        desc_part = f" — {s.description}" if s.description else ""
        lines.append(
            f"- id={s.id}: {s.name}{cat_part}, {s.duration_minutes} мин, {s.price} ₽{desc_part}"
        )
    return "\n".join(lines)


async def _return_context(
    session: AsyncSession, *, master_id: int, client_id: int
) -> dict | None:
    now = datetime.now(UTC)
    campaign = (
        await session.execute(
            select(ReturnCampaign)
            .where(
                ReturnCampaign.master_id == master_id,
                ReturnCampaign.client_id == client_id,
                ReturnCampaign.status == "sent",
                ReturnCampaign.discount_valid_until > now,
            )
            .order_by(ReturnCampaign.sent_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if campaign is None:
        return None
    days_ago = max(0, (now - campaign.sent_at).days)
    return {
        "days_ago": days_ago,
        "discount_percent": int(campaign.discount_percent),
        "valid_until_human": campaign.discount_valid_until.strftime("%d.%m"),
    }


# ----------------------------------------------------------- action dispatch


async def _dispatch_actions(
    session: AsyncSession,
    *,
    master: Master,
    conversation: Conversation,
    actions: list[dict[str, Any]],
    collected: dict[str, Any],
    meta: dict[str, Any],
) -> None:
    for action in actions:
        kind = action.get("type")
        try:
            if kind == "create_booking":
                booking = await _action_create_booking(
                    session,
                    master=master,
                    conversation=conversation,
                    action=action,
                    collected=collected,
                )
                if booking is not None:
                    meta["booking_id"] = booking.id
                else:
                    meta["booking_skipped"] = True
            elif kind == "send_portfolio":
                meta["portfolio_request"] = True
            elif kind == "send_location":
                meta["send_location"] = True
            elif kind == "lookup_kb":
                meta.setdefault("kb_requested", []).append(action.get("kb_type"))
            elif kind == "find_slots":
                # Server doesn't pre-fetch slots in JSON-emit mode; the LLM is
                # expected to suggest a concrete time and we validate via the
                # booking collision check. Logging only.
                meta.setdefault("slots_requested", []).append(action)
            else:
                log.warning("unknown LLM action type=%r", kind)
        except Exception:
            log.exception("action %r failed", kind)


async def _action_create_booking(
    session: AsyncSession,
    *,
    master: Master,
    conversation: Conversation,
    action: dict[str, Any],
    collected: dict[str, Any],
):
    starts_at_raw = action.get("starts_at")
    if not starts_at_raw:
        return None
    try:
        starts_at = datetime.fromisoformat(str(starts_at_raw))
    except ValueError:
        log.warning("create_booking: invalid starts_at=%r", starts_at_raw)
        return None
    if starts_at.tzinfo is None:
        log.warning("create_booking: missing tz on starts_at=%r", starts_at_raw)
        return None
    if starts_at <= datetime.now(UTC):
        log.warning("create_booking: starts_at in the past (%s)", starts_at.isoformat())
        return None

    service_id = action.get("service_id")
    svc: Service | None = None
    if service_id is not None:
        svc = await session.get(Service, int(service_id))
        if svc is None or svc.master_id != master.id or not svc.is_active:
            svc = None
    if svc is None:
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
    name = action.get("client_name") or collected.get("name")
    phone = action.get("client_phone") or collected.get("phone")
    if not client.name and isinstance(name, str):
        client.name = name
    if not client.phone and isinstance(phone, str):
        client.phone = phone

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
        log.warning("create_booking rejected: %s", e)
        return None


# ----------------------------------------------------------- history loader


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


__all__ = ["process_client_message"]
