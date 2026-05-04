"""Escalate a client message to the master.

Used when:
  * Buttons-mode bot detects cancel/reschedule intent in free text.
  * Hybrid/text-mode LLM emits `escalate=true` with reason="cancel_request".

Effects:
  1. Send the master a Telegram DM with the original client message,
     the active booking (if any) and a «ответьте лично» nudge.
  2. Flip the conversation to HUMAN_TAKEOVER for HUMAN_TAKEOVER_HOURS so
     the bot stops auto-replying and lets the master handle it.

Best-effort: a Telegram send failure logs but does not raise — the
takeover state still gets persisted so the bot stays silent.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    Booking,
    BookingStatus,
    Client,
    Conversation,
    ConversationState,
    Master,
    Service,
    ServiceAddon,
)

log = logging.getLogger(__name__)


async def escalate_to_master(
    session: AsyncSession,
    *,
    master: Master,
    conversation: Conversation,
    client_message: str,
    reason: str = "cancel_request",
    silence_bot: bool = True,
) -> None:
    """DM the master + (optionally) flip the conversation to HUMAN_TAKEOVER.

    Pass `silence_bot=False` for soft escalations like «не знаю ответ»
    where the bot has already replied «уточню у мастера и вернусь» and
    we just want the master to know there's a question waiting; the
    bot stays available for follow-up turns.

    Pass `silence_bot=True` (default) for cancel/reschedule requests:
    the bot stays quiet for HUMAN_TAKEOVER_HOURS so the master can
    handle it themselves.
    """
    booking_line = await _format_active_booking(session, master, conversation.client_id)
    client = await session.get(Client, conversation.client_id)
    client_line = (client.name or "Клиент") if client else "Клиент"
    if client and client.phone:
        client_line += f" · {client.phone}"

    title = {
        "cancel_request": "⚠️ Клиент просит изменить запись",
        "unknown_question": "❓ Клиент задал вопрос, на который не знаю ответа",
    }.get(reason, "⚠️ Запрос клиента")

    parts = [title, f"👤 {client_line}"]
    if booking_line:
        parts.append(booking_line)
    msg_short = (client_message or "").strip().replace("\n", " ")
    if len(msg_short) > 300:
        msg_short = msg_short[:297] + "…"
    parts.append(f"💬 «{msg_short}»")
    parts.append("Ответьте клиенту лично.")
    text = "\n".join(parts)

    if silence_bot:
        now = datetime.now(UTC)
        conversation.state = ConversationState.HUMAN_TAKEOVER
        conversation.takeover_until = now + timedelta(hours=settings.HUMAN_TAKEOVER_HOURS)

    try:
        from app.bot import get_bot

        if master.telegram_id is not None:
            await get_bot().send_message(chat_id=master.telegram_id, text=text)
    except Exception:
        log.exception(
            "escalate_to_master: failed to send DM master_id=%s", master.id
        )


async def _format_active_booking(
    session: AsyncSession, master: Master, client_id: int
) -> str | None:
    now = datetime.now(UTC)
    row = (
        await session.execute(
            select(Booking)
            .where(
                Booking.master_id == master.id,
                Booking.client_id == client_id,
                Booking.status == BookingStatus.SCHEDULED,
                Booking.starts_at >= now - timedelta(hours=2),
            )
            .order_by(Booking.starts_at)
            .limit(1)
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    starts_local = row.starts_at.astimezone(tz)
    weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[starts_local.weekday()]
    when = f"{weekday_short} {starts_local:%d.%m} в {starts_local:%H:%M}"
    svc = await session.get(Service, row.service_id) if row.service_id else None
    svc_name = svc.name if svc else "услуга"
    line = f"📅 {when} · {svc_name}"
    if row.addon_ids:
        names = (
            (
                await session.execute(
                    select(ServiceAddon.name).where(
                        ServiceAddon.id.in_(row.addon_ids)
                    )
                )
            )
            .scalars()
            .all()
        )
        if names:
            line += " + " + ", ".join(names)
    return line
