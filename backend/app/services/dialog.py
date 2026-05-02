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
from datetime import UTC, datetime, timedelta
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
    Schedule,
    ScheduleBreak,
    Service,
    ServiceCategory,
    TimeOff,
)
from app.services.booking_create import BookingError, create_booking

log = logging.getLogger(__name__)

FALLBACK_REPLY = "Секунду, уточняю детали и напишу через минуту."

import re

_CONFIRMATION_PATTERN = re.compile(
    r"\b(записал[ао]?|записан[ао]?|подтвержд(аю|ила|ил)|жду\s+вас|"
    r"забронир(овал[ао]?|ован[ао]?))\b",
    re.IGNORECASE,
)


def _looks_like_booking_confirmation(text: str | None) -> bool:
    if not text:
        return False
    return bool(_CONFIRMATION_PATTERN.search(text))


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
    schedule_text = await _schedule_text(session, master.id)
    busy_slots_text = await busy_slots_text_for_master(
        session, master.id, master_tz_name=master.timezone or "Europe/Moscow"
    )
    known_client = await _known_client_block(session, conversation.client_id)

    system_prompt = build_bot_prompt(
        master_name=master.name,
        niche=master.niche,
        timezone=master.timezone or "Europe/Moscow",
        voice_tone=bot_settings.voice_tone,
        message_format=bot_settings.message_format,
        services_text=services_text,
        kb_short_lines=kb_short_lines,
        return_context=return_context,
        schedule_text=schedule_text,
        busy_slots_text=busy_slots_text,
        known_client_text=known_client,
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
            "buttons": result.buttons,
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

        # If the LLM tried to book but the server rejected the slot
        # (out-of-hours, time-off, collision, etc.) the LLM's
        # «Записал вас, ...» reply is now a lie. Replace it with an apology
        # so the client doesn't believe a non-existent booking was made.
        if meta.get("booking_skipped"):
            reason = meta.get("booking_failed_reason") or "оно вне моего расписания"
            reply_text = (
                "Извините, выбранное время не получится — "
                + reason
                + ". Подберу другое время и предложу варианты."
            )

        # Defence-in-depth: the LLM sometimes phrases a confirmation
        # («Записал вас, ...») without actually emitting create_booking,
        # so the booking would never land in the DB. If the reply CLAIMS
        # a booking but no create_booking action ran, override.
        elif _looks_like_booking_confirmation(reply_text) and not meta.get("booking_id"):
            log.warning(
                "LLM claimed booking but no create_booking action fired; "
                "conversation_id=%s reply=%r",
                conversation.id,
                reply_text[:200] if reply_text else None,
            )
            meta["fake_confirm"] = True
            reply_text = (
                "Минуту — фиксирую детали. Подскажите ещё раз: какая услуга и "
                "точное время? Запишу как только подтвердите."
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


_STANDARD_KB_TYPES: list[tuple[str, str]] = [
    ("address", "Адрес и как добраться"),
    ("payment", "Способы оплаты"),
    ("sterilization", "Стерилизация и санитария"),
    ("techniques", "Техники и материалы"),
    ("preparation", "Как подготовиться к визиту"),
    ("whats_with", "Что взять с собой"),
    ("guarantees", "Гарантии и переделки"),
    ("restrictions", "Ограничения (беременность, аллергии и т.п.)"),
]


async def _known_client_block(
    session: AsyncSession, client_id: int
) -> str | None:
    """Block in the system prompt that lists the bits we already know about
    this client so the LLM stops re-asking name/phone on every booking.
    """
    cl = await session.get(Client, client_id)
    if cl is None:
        return None
    name = (cl.name or "").strip()
    phone = (cl.phone or "").strip()
    if not name and not phone:
        return None
    parts: list[str] = []
    if name:
        parts.append(f"имя: {name}")
    if phone:
        parts.append(f"телефон: {phone}")
    block = "Известный клиент — " + ", ".join(parts) + "."
    if name and phone:
        block += (
            " У тебя уже есть оба контакта — НЕ переспрашивай ни имя, ни телефон. "
            "Когда время согласовано, сразу зови create_booking, передавая "
            "client_name и client_phone из этого блока."
        )
    elif name:
        block += " Имя известно — НЕ спрашивай заново. Уточни только телефон."
    elif phone:
        block += " Телефон известен — НЕ спрашивай заново. Уточни только имя."
    return block


async def _kb_short_lines(session: AsyncSession, master_id: int) -> list[str]:
    """Render the KB block for the system prompt.

    Filled items are inlined verbatim. Standard topics that the master has
    NOT filled in are explicitly listed as «НЕ УКАЗАНО МАСТЕРОМ» so the
    model can't fall back to its training data and fabricate plausible
    answers (temperatures, brands, materials etc).
    """
    rows = (
        (
            await session.execute(
                select(KnowledgeBaseItem)
                .where(KnowledgeBaseItem.master_id == master_id)
                .order_by(KnowledgeBaseItem.position, KnowledgeBaseItem.id)
            )
        )
        .scalars()
        .all()
    )

    out: list[str] = []
    filled_types: set[str] = set()
    for r in rows:
        filled_types.add(r.type)
        body = r.content.strip().replace("\n", " ")
        if len(body) > 600:
            body = body[:597] + "…"
        out.append(f"{r.title}: {body}")
        if r.geolocation_lat is not None and r.geolocation_lng is not None:
            out.append(
                f"Координаты {r.title.lower()}: "
                f"{r.geolocation_lat:.6f}, {r.geolocation_lng:.6f}"
            )
        if r.yandex_maps_url:
            out.append(f"Яндекс.Карты: {r.yandex_maps_url}")

    # Mark missing standard topics as explicitly unknown.
    for kind, label in _STANDARD_KB_TYPES:
        if kind not in filled_types:
            out.append(
                f"{label}: НЕ УКАЗАНО МАСТЕРОМ — на вопросы по этой теме НИКОГДА "
                f"не отвечай конкретикой, ставь escalate=true и пиши «уточню у "
                f"мастера и вернусь»."
            )
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


async def schedule_text_for_master(session: AsyncSession, master_id: int) -> str | None:
    """Public wrapper used by both dialog.py (real Business chat) and the test
    chat endpoint. Same body as the original private helper.
    """
    return await _schedule_text(session, master_id)


async def busy_slots_text_for_master(
    session: AsyncSession,
    master_id: int,
    *,
    master_tz_name: str,
    days_ahead: int = 14,
) -> str | None:
    """List non-cancelled bookings in the next N days as a compact block."""
    from zoneinfo import ZoneInfo

    try:
        tz = ZoneInfo(master_tz_name or "Europe/Moscow")
    except Exception:
        tz = ZoneInfo("Europe/Moscow")

    now = datetime.now(UTC)
    until = now + timedelta(days=days_ahead)

    from app.models import Booking, BookingStatus  # local import to avoid cycle

    rows = (
        (
            await session.execute(
                select(Booking)
                .where(
                    Booking.master_id == master_id,
                    Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.NO_SHOW]),
                    Booking.starts_at >= now,
                    Booking.starts_at < until,
                )
                .order_by(Booking.starts_at)
                .limit(40)
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        return None

    weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    lines: list[str] = []
    for b in rows:
        s_local = b.starts_at.astimezone(tz)
        e_local = b.ends_at.astimezone(tz)
        lines.append(
            f"- {s_local.strftime('%d.%m')} ({weekdays[s_local.weekday()]}) "
            f"{s_local.strftime('%H:%M')}–{e_local.strftime('%H:%M')} — занято"
        )
    return "\n".join(lines)


async def _schedule_text(session: AsyncSession, master_id: int) -> str | None:
    """Render the master's weekly schedule + breaks + active time-offs as a
    compact human-readable block we can drop into the LLM system prompt.
    """
    weekdays_ru = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    schedules = (
        (
            await session.execute(
                select(Schedule)
                .where(Schedule.master_id == master_id)
                .order_by(Schedule.weekday)
            )
        )
        .scalars()
        .all()
    )
    breaks = (
        (
            await session.execute(
                select(ScheduleBreak)
                .where(ScheduleBreak.master_id == master_id)
                .order_by(ScheduleBreak.weekday)
            )
        )
        .scalars()
        .all()
    )
    today = datetime.now(UTC).date()
    offs = (
        (
            await session.execute(
                select(TimeOff)
                .where(TimeOff.master_id == master_id, TimeOff.date_to >= today)
                .order_by(TimeOff.date_from)
            )
        )
        .scalars()
        .all()
    )

    if not schedules and not breaks:
        return None

    by_day: dict[int, list[str]] = {}
    for s in schedules:
        if not s.is_working:
            by_day.setdefault(s.weekday, []).append("выходной")
            continue
        by_day.setdefault(s.weekday, []).append(
            f"{s.start_time.strftime('%H:%M')}–{s.end_time.strftime('%H:%M')}"
        )
    break_by_day: dict[int, list[str]] = {}
    for b in breaks:
        break_by_day.setdefault(b.weekday, []).append(
            f"{b.start_time.strftime('%H:%M')}–{b.end_time.strftime('%H:%M')}"
        )

    lines: list[str] = []
    for wd in range(7):
        windows = by_day.get(wd)
        if not windows:
            lines.append(f"- {weekdays_ru[wd]}: выходной")
            continue
        suffix = ""
        if wd in break_by_day:
            suffix = f" (перерыв {', '.join(break_by_day[wd])})"
        lines.append(f"- {weekdays_ru[wd]}: {', '.join(windows)}{suffix}")

    if offs:
        lines.append("Ближайшие отпуска:")
        for o in offs[:5]:
            r = f" ({o.reason})" if o.reason else ""
            if o.date_from == o.date_to:
                lines.append(f"- {o.date_from.strftime('%d.%m')}{r}")
            else:
                lines.append(
                    f"- {o.date_from.strftime('%d.%m')}–{o.date_to.strftime('%d.%m')}{r}"
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
                booking, fail_reason = await _action_create_booking(
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
                    if fail_reason:
                        meta["booking_failed_reason"] = fail_reason
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
) -> tuple[Any, str | None]:
    """Try to create a booking from an LLM action.

    Returns (booking, None) on success or (None, reason) on failure. The
    `reason` is a short Russian phrase suitable for use in a chat reply.
    """
    starts_at_raw = action.get("starts_at")
    if not starts_at_raw:
        return None, "не указано время"
    try:
        starts_at = datetime.fromisoformat(str(starts_at_raw))
    except ValueError:
        log.warning("create_booking: invalid starts_at=%r", starts_at_raw)
        return None, "не удалось распознать время"
    if starts_at.tzinfo is None:
        log.warning("create_booking: missing tz on starts_at=%r", starts_at_raw)
        return None, "не указан часовой пояс"
    if starts_at <= datetime.now(UTC):
        log.warning("create_booking: starts_at in the past (%s)", starts_at.isoformat())
        return None, "это время уже прошло"

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
        return None, "ни одной активной услуги в списке"

    client = await session.get(Client, conversation.client_id)
    if client is None:
        return None, "не удалось найти клиента"
    name = action.get("client_name") or collected.get("name")
    phone = action.get("client_phone") or collected.get("phone")
    if not client.name and isinstance(name, str):
        client.name = name
    if not client.phone and isinstance(phone, str):
        client.phone = phone

    try:
        booking = await create_booking(
            session,
            master=master,
            client=client,
            service=svc,
            starts_at=starts_at,
            source="bot",
        )
        return booking, None
    except BookingError as e:
        log.warning("create_booking rejected: %s", e)
        msg = str(e).lower()
        if "non-working" in msg:
            reason = "это нерабочий день"
        elif "outside" in msg or "working hours" in msg:
            reason = "это время вне моих рабочих часов"
        elif "break" in msg:
            reason = "в это время у меня перерыв"
        elif "time-off" in msg:
            reason = "у меня в этот день отпуск"
        elif "collide" in msg or "collision" in msg:
            reason = "на это время уже есть запись"
        else:
            reason = "оно недоступно для записи"
        return None, reason


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
