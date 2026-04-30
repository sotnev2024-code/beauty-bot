"""Service reminder scheduler — «напомнить через N дней после визита».

Runs once an hour. For each master with `bot_settings.reminders_enabled` and
local time == SEND_HOUR_LOCAL (default 11:00), finds completed bookings
where `starts_at + service.reminder_after_days * 1 day <= today` and there's
no existing ReminderLog row for that (client_id, service_id, source_booking_id)
triple. If the client has an active ReturnCampaign, the reminder is logged
with was_skipped_due_to_return=true and not sent.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from typing import Awaitable, Callable
from zoneinfo import ZoneInfo

from sqlalchemy import and_, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    BotSettings,
    BusinessConnection,
    Client,
    Conversation,
    Master,
    Message,
    MessageDirection,
    ReminderLog,
    ReturnCampaign,
    Service,
)
from app.services.proactive_message import render_service_reminder

log = logging.getLogger(__name__)

SEND_HOUR_LOCAL = 11

Sender = Callable[..., Awaitable[None]]


async def send_due_service_reminders(
    session: AsyncSession,
    *,
    sender: Sender,
    now: datetime | None = None,
    force_master_id: int | None = None,
) -> int:
    now = now or datetime.now(UTC)

    masters_q = (
        select(Master)
        .join(BotSettings, BotSettings.master_id == Master.id)
        .where(BotSettings.reminders_enabled.is_(True))
    )
    if force_master_id is not None:
        masters_q = masters_q.where(Master.id == force_master_id)
    masters = (await session.execute(masters_q)).scalars().all()

    sent_total = 0
    for master in masters:
        if force_master_id is None and not _is_send_hour(master, now):
            continue
        bs = await session.get(BotSettings, master.id)
        if bs is None or not bs.reminders_enabled:
            continue
        bc = await _active_business_connection_id(session, master.id)
        if bc is None:
            continue
        voice_tone = bs.voice_tone

        candidates = await _find_due_reminders(
            session, master_id=master.id, today_local=_today_local(master, now)
        )
        for booking, service in candidates:
            try:
                logged = await _send_or_skip(
                    session,
                    sender=sender,
                    master=master,
                    booking=booking,
                    service=service,
                    business_connection_id=bc,
                    voice_tone=voice_tone,
                    now=now,
                )
                if logged and not logged.was_skipped_due_to_return:
                    sent_total += 1
            except Exception:
                log.exception(
                    "service reminder failed for master=%s booking=%s",
                    master.id,
                    booking.id,
                )
    return sent_total


# ---------------------------------------------------------------- internals


def _is_send_hour(master: Master, now: datetime) -> bool:
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    return now.astimezone(tz).hour == SEND_HOUR_LOCAL


def _today_local(master: Master, now: datetime) -> date:
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    return now.astimezone(tz).date()


async def _find_due_reminders(
    session: AsyncSession, *, master_id: int, today_local: date
) -> list[tuple[Booking, Service]]:
    """Bookings where starts_at + service.reminder_after_days days falls today."""
    # Active services with reminder_after_days set.
    services = (
        (
            await session.execute(
                select(Service).where(
                    Service.master_id == master_id,
                    Service.is_active.is_(True),
                    Service.reminder_after_days.isnot(None),
                )
            )
        )
        .scalars()
        .all()
    )
    if not services:
        return []
    by_id = {s.id: s for s in services}

    # ReminderLog uniqueness — skip pairs already logged.
    has_log = exists().where(
        and_(
            ReminderLog.master_id == master_id,
            ReminderLog.client_id == Booking.client_id,
            ReminderLog.service_id == Booking.service_id,
            ReminderLog.source_booking_id == Booking.id,
        )
    )

    rows = (
        (
            await session.execute(
                select(Booking)
                .where(
                    Booking.master_id == master_id,
                    Booking.status == BookingStatus.DONE,
                    Booking.service_id.in_(list(by_id.keys())),
                    ~has_log,
                )
            )
        )
        .scalars()
        .all()
    )

    out: list[tuple[Booking, Service]] = []
    for b in rows:
        svc = by_id.get(b.service_id) if b.service_id else None
        if svc is None or svc.reminder_after_days is None:
            continue
        target_date = (b.starts_at.date() + timedelta(days=svc.reminder_after_days))
        if target_date == today_local:
            out.append((b, svc))
    return out


async def _send_or_skip(
    session: AsyncSession,
    *,
    sender: Sender,
    master: Master,
    booking: Booking,
    service: Service,
    business_connection_id: str,
    voice_tone: str,
    now: datetime,
) -> ReminderLog | None:
    client = await session.get(Client, booking.client_id)
    if client is None:
        return None

    # Active return campaign? Log skipped, don't send.
    has_active_return = (
        await session.execute(
            select(ReturnCampaign).where(
                ReturnCampaign.master_id == master.id,
                ReturnCampaign.client_id == client.id,
                ReturnCampaign.status == "sent",
                ReturnCampaign.discount_valid_until > now,
            )
        )
    ).scalar_one_or_none()

    if has_active_return is not None:
        rlog = ReminderLog(
            master_id=master.id,
            client_id=client.id,
            service_id=service.id,
            source_booking_id=booking.id,
            sent_at=now,
            was_skipped_due_to_return=True,
        )
        session.add(rlog)
        await session.flush()
        return rlog

    conv = (
        await session.execute(
            select(Conversation)
            .where(
                Conversation.master_id == master.id,
                Conversation.client_id == client.id,
            )
            .order_by(Conversation.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if conv is None:
        return None

    days_since = max(1, (now.date() - booking.starts_at.date()).days)
    text = render_service_reminder(
        voice_tone=voice_tone,
        client_name=client.name,
        service_name=service.name,
        days_since_visit=days_since,
    )

    await sender(
        client_telegram_id=client.telegram_id,
        business_connection_id=business_connection_id,
        text=text,
    )

    msg = Message(
        conversation_id=conv.id,
        direction=MessageDirection.OUT,
        text=text,
        is_proactive=True,
        llm_meta={"proactive_kind": "service_reminder"},
    )
    session.add(msg)
    await session.flush()

    rlog = ReminderLog(
        master_id=master.id,
        client_id=client.id,
        service_id=service.id,
        source_booking_id=booking.id,
        sent_at=now,
        message_id=msg.id,
        was_skipped_due_to_return=False,
    )
    session.add(rlog)
    await session.flush()
    return rlog


async def _active_business_connection_id(session: AsyncSession, master_id: int) -> str | None:
    row = (
        await session.execute(
            select(BusinessConnection).where(
                BusinessConnection.master_id == master_id,
                BusinessConnection.is_enabled.is_(True),
            )
        )
    ).scalar_one_or_none()
    return row.telegram_business_connection_id if row else None
