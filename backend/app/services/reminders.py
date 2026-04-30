"""Reminder templates + send / schedule helpers."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking, Client, Master, Reminder, ReminderType

log = logging.getLogger(__name__)


# Format strings — referenced by send_reminder.
TEMPLATES: dict[ReminderType, str] = {
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


def render(
    type_: ReminderType,
    *,
    client_name: str,
    starts_at_local: str,
    service_name: str | None,
) -> str:
    service_line = f" Услуга: {service_name}." if service_name else ""
    return TEMPLATES[type_].format(
        client_name=client_name or "",
        time=starts_at_local,
        service_line=service_line,
    )


async def schedule_booking_reminders(
    session: AsyncSession,
    *,
    booking: Booking,
) -> list[Reminder]:
    """Create reminder rows for a fresh booking. APScheduler picks them up."""
    rows: list[Reminder] = []
    if booking.starts_at - timedelta(hours=24) > datetime.now(booking.starts_at.tzinfo):
        rows.append(
            Reminder(
                type=ReminderType.BOOKING_24H,
                target_at=booking.starts_at - timedelta(hours=24),
                booking_id=booking.id,
                client_id=booking.client_id,
            )
        )
    rows.append(
        Reminder(
            type=ReminderType.BOOKING_2H,
            target_at=booking.starts_at - timedelta(hours=2),
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
    now = now or datetime.now(tz=__import__("datetime").UTC)
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

        starts_local = booking.starts_at.astimezone(_master_tz(master)).strftime("%H:%M")
        text = render(
            r.type,
            client_name=client.name or "",
            starts_at_local=starts_local,
            service_name=service_name,
        )

        try:
            await sender(
                client_telegram_id=client.telegram_id,
                business_connection_id=await _active_business_connection_id(session, master.id),
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


def _master_tz(master: Master):
    from zoneinfo import ZoneInfo

    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")
