"""Reminder templates + send / schedule helpers.

Two delivery channels:
  * client-targeted (BOOKING_24H/2H, FEEDBACK, RETURN_TRIGGER) — sent to
    the client's chat via the master's Business connection.
  * master-targeted (MASTER_BOOKING_1H, MASTER_BOOKING_10M,
    MASTER_DAILY_DIGEST) — sent directly to master.telegram_id (DM with
    the bot, no Business connection).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking, BookingStatus, Client, Master, Reminder, ReminderType

log = logging.getLogger(__name__)


# Format strings for client-targeted reminders.
CLIENT_TEMPLATES: dict[ReminderType, str] = {
    ReminderType.BOOKING_24H: (
        "Привет, {client_name}! Напоминаю, завтра в {time} у нас запись."
        "{service_line} До встречи!"
    ),
    ReminderType.BOOKING_2H: (
        "{client_name}, через ~2 часа жду на процедуру в {time}."
        " Если планы поменялись — дай знать."
    ),
    ReminderType.FEEDBACK: (
        "{client_name}, спасибо что были сегодня! Напишите как ощущения "
        "и пара слов, что понравилось — для меня важно."
    ),
    ReminderType.RETURN_TRIGGER: (
        "{client_name}, давно не виделись! Готова предложить пару удобных слотов "
        "на ближайшие дни — заглянете?"
    ),
}

# Master-targeted alerts.
MASTER_TEMPLATES: dict[ReminderType, str] = {
    ReminderType.MASTER_BOOKING_1H: (
        "🔔 Через час придёт {client_name} в {time}.{service_line}"
    ),
    ReminderType.MASTER_BOOKING_10M: (
        "⏰ Через 10 минут — {client_name} ({time}).{service_line}"
    ),
}


def _is_master_reminder(t: ReminderType) -> bool:
    return t in (
        ReminderType.MASTER_BOOKING_1H,
        ReminderType.MASTER_BOOKING_10M,
        ReminderType.MASTER_DAILY_DIGEST,
    )


def render(
    type_: ReminderType,
    *,
    client_name: str,
    starts_at_local: str,
    service_name: str | None,
) -> str:
    template = MASTER_TEMPLATES.get(type_) or CLIENT_TEMPLATES.get(type_)
    if template is None:
        return ""
    service_line = f" Услуга: {service_name}." if service_name else ""
    return template.format(
        client_name=client_name or "клиент",
        time=starts_at_local,
        service_line=service_line,
    )


async def schedule_booking_reminders(
    session: AsyncSession,
    *,
    booking: Booking,
) -> list[Reminder]:
    """Create reminder rows for a fresh booking. APScheduler picks them up.

    Schedules four entries:
      * client BOOKING_24H (only if 24h ahead is still in the future)
      * client BOOKING_2H
      * master MASTER_BOOKING_1H
      * master MASTER_BOOKING_10M
      * client FEEDBACK (2h after the booking ends)
    """
    rows: list[Reminder] = []
    now = datetime.now(booking.starts_at.tzinfo)

    if booking.starts_at - timedelta(hours=24) > now:
        rows.append(
            Reminder(
                type=ReminderType.BOOKING_24H,
                target_at=booking.starts_at - timedelta(hours=24),
                booking_id=booking.id,
                client_id=booking.client_id,
            )
        )
    if booking.starts_at - timedelta(hours=2) > now:
        rows.append(
            Reminder(
                type=ReminderType.BOOKING_2H,
                target_at=booking.starts_at - timedelta(hours=2),
                booking_id=booking.id,
                client_id=booking.client_id,
            )
        )
    if booking.starts_at - timedelta(hours=1) > now:
        rows.append(
            Reminder(
                type=ReminderType.MASTER_BOOKING_1H,
                target_at=booking.starts_at - timedelta(hours=1),
                booking_id=booking.id,
                client_id=booking.client_id,
            )
        )
    if booking.starts_at - timedelta(minutes=10) > now:
        rows.append(
            Reminder(
                type=ReminderType.MASTER_BOOKING_10M,
                target_at=booking.starts_at - timedelta(minutes=10),
                booking_id=booking.id,
                client_id=booking.client_id,
            )
        )
    rows.append(
        Reminder(
            type=ReminderType.FEEDBACK,
            target_at=booking.ends_at + timedelta(hours=2),
            booking_id=booking.id,
            client_id=booking.client_id,
        )
    )
    for r in rows:
        session.add(r)
    await session.flush()
    return rows


async def deliver_due_reminders(
    session: AsyncSession,
    *,
    sender,  # async callable: (chat_id, business_connection_id, text) -> None
    now: datetime | None = None,
    limit: int = 100,
) -> int:
    """Send reminders whose target_at <= now and sent_at IS NULL.

    Returns the number of reminders dispatched.
    """
    now = now or datetime.now(tz=UTC)
    result = await session.execute(
        select(Reminder)
        .where(Reminder.target_at <= now, Reminder.sent_at.is_(None))
        .order_by(Reminder.target_at)
        .limit(limit)
    )
    rows = list(result.scalars().all())
    sent = 0
    for r in rows:
        booking = await session.get(Booking, r.booking_id) if r.booking_id else None
        client = await session.get(Client, r.client_id) if r.client_id else None
        master = await session.get(Master, booking.master_id) if booking else None
        service_name = None
        if booking and booking.service_id:
            from app.models import Service

            svc = await session.get(Service, booking.service_id)
            service_name = svc.name if svc else None

        if booking is None or client is None or master is None:
            r.sent_at = now
            continue

        # Skip pre-visit reminders for cancelled/no-show bookings.
        if r.type in (
            ReminderType.BOOKING_24H,
            ReminderType.BOOKING_2H,
            ReminderType.MASTER_BOOKING_1H,
            ReminderType.MASTER_BOOKING_10M,
        ) and booking.status in (BookingStatus.CANCELLED, BookingStatus.NO_SHOW):
            r.sent_at = now
            continue

        starts_local = booking.starts_at.astimezone(_master_tz(master)).strftime("%H:%M")
        text = render(
            r.type,
            client_name=client.name or "",
            starts_at_local=starts_local,
            service_name=service_name,
        )
        if not text:
            r.sent_at = now
            continue

        try:
            if _is_master_reminder(r.type):
                # Direct DM to the master.
                await sender(
                    client_telegram_id=master.telegram_id,
                    business_connection_id=None,
                    text=text,
                )
            else:
                await sender(
                    client_telegram_id=client.telegram_id,
                    business_connection_id=await _active_business_connection_id(
                        session, master.id
                    ),
                    text=text,
                )
            r.sent_at = now
            sent += 1
        except Exception:
            log.exception("reminder %s failed for booking %s", r.id, r.booking_id)
    await session.flush()
    return sent


async def _active_business_connection_id(session: AsyncSession, master_id: int) -> str | None:
    from app.models import BusinessConnection

    row = (
        await session.execute(
            select(BusinessConnection).where(
                BusinessConnection.master_id == master_id,
                BusinessConnection.is_enabled.is_(True),
            )
        )
    ).scalar_one_or_none()
    return row.telegram_business_connection_id if row else None


def _master_tz(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")
