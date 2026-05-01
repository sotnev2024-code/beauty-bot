"""create_booking: validate slot, create row, release lock, schedule reminders.

If the client has an active ReturnCampaign (status='sent', valid_until > now),
the discount is applied automatically and the campaign is marked as booked.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from redis.asyncio import Redis
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    Client,
    Master,
    ReturnCampaign,
    Schedule,
    ScheduleBreak,
    Service,
    TimeOff,
)
from app.services.booking import release_slot_lock
from app.services.reminders import schedule_booking_reminders

log = logging.getLogger(__name__)


class BookingError(Exception):
    """Raised when a booking can't be created (collision, bad input)."""


async def create_booking(
    session: AsyncSession,
    *,
    master: Master,
    client: Client,
    service: Service,
    starts_at: datetime,
    redis: Redis | None = None,
    source: str | None = None,
    lock_holder: str | None = None,
) -> Booking:
    if service.master_id != master.id:
        raise BookingError("service does not belong to master")
    if client.master_id != master.id:
        raise BookingError("client does not belong to master")

    starts_at = starts_at.astimezone(UTC)
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)

    # Honour the master's working hours / breaks / time-offs before anything
    # else. The bot ought to know about the schedule and not propose impossible
    # times, but if it does we reject server-side rather than book a slot the
    # master will have to manually decline.
    await _validate_within_schedule(
        session, master=master, starts_at=starts_at, ends_at=ends_at
    )

    # Hard collision check inside DB to defeat any race the Redis lock missed.
    existing = (
        (
            await session.execute(
                select(Booking).where(
                    Booking.master_id == master.id,
                    Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.NO_SHOW]),
                    or_(
                        and_(Booking.starts_at < ends_at, Booking.ends_at > starts_at),
                    ),
                )
            )
        )
        .scalars()
        .first()
    )
    if existing is not None:
        raise BookingError("slot collides with existing booking")

    # Look up an active return campaign for this client; apply its discount.
    now = datetime.now(UTC)
    campaign: ReturnCampaign | None = (
        await session.execute(
            select(ReturnCampaign)
            .where(
                ReturnCampaign.master_id == master.id,
                ReturnCampaign.client_id == client.id,
                ReturnCampaign.status == "sent",
                ReturnCampaign.discount_valid_until > now,
            )
            .order_by(ReturnCampaign.sent_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    base_price = service.price
    discount_applied = False
    discount_percent: int | None = None
    final_price = base_price

    if campaign is not None:
        discount_applied = True
        discount_percent = int(campaign.discount_percent)
        if base_price is not None:
            final_price = (
                Decimal(base_price)
                * (Decimal(100) - Decimal(discount_percent))
                / Decimal(100)
            ).quantize(Decimal("0.01"))

    booking = Booking(
        master_id=master.id,
        client_id=client.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=BookingStatus.SCHEDULED,
        price=final_price,
        source=source,
        discount_applied=discount_applied,
        discount_percent=discount_percent,
        return_campaign_id=campaign.id if campaign else None,
    )
    session.add(booking)
    await session.flush()

    if campaign is not None:
        campaign.status = "booked"
        campaign.responded_at = now
        campaign.booking_id = booking.id

    await schedule_booking_reminders(session, booking=booking)

    if redis is not None and lock_holder is not None:
        try:
            await release_slot_lock(
                redis, master_id=master.id, starts_at=starts_at, holder_id=lock_holder
            )
        except Exception:
            log.exception("failed to release slot lock for booking %s", booking.id)

    return booking


# ---------------------------------------------------------------- schedule check


async def _validate_within_schedule(
    session: AsyncSession,
    *,
    master: Master,
    starts_at: datetime,
    ends_at: datetime,
) -> None:
    """Reject the booking if it falls outside the master's working window,
    inside a recurring break (not skipped that day), or in a time-off range.
    """
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")

    starts_local = starts_at.astimezone(tz)
    ends_local = ends_at.astimezone(tz)
    weekday = starts_local.weekday()  # Mon=0
    iso = starts_local.date().isoformat()

    # 1. Time-off (vacation) range covering this date.
    offs = (
        (
            await session.execute(
                select(TimeOff).where(
                    TimeOff.master_id == master.id,
                    TimeOff.date_from <= starts_local.date(),
                    TimeOff.date_to >= starts_local.date(),
                )
            )
        )
        .scalars()
        .all()
    )
    if offs:
        reason = offs[0].reason or "отпуск"
        raise BookingError(f"this date is marked as time-off ({reason})")

    # 2. Working day + window check.
    schedules = (
        (
            await session.execute(
                select(Schedule).where(
                    Schedule.master_id == master.id,
                    Schedule.weekday == weekday,
                )
            )
        )
        .scalars()
        .all()
    )
    working = [s for s in schedules if s.is_working]
    if not working:
        raise BookingError("master is not working on this weekday")

    fits = False
    for s in working:
        win_start = starts_local.replace(
            hour=s.start_time.hour,
            minute=s.start_time.minute,
            second=0,
            microsecond=0,
        )
        win_end = starts_local.replace(
            hour=s.end_time.hour,
            minute=s.end_time.minute,
            second=0,
            microsecond=0,
        )
        if starts_local >= win_start and ends_local <= win_end:
            fits = True
            break
    if not fits:
        raise BookingError("slot is outside master's working hours")

    # 3. Recurring break overlap (skip dates honoured).
    breaks = (
        (
            await session.execute(
                select(ScheduleBreak).where(
                    ScheduleBreak.master_id == master.id,
                    ScheduleBreak.weekday == weekday,
                )
            )
        )
        .scalars()
        .all()
    )
    for b in breaks:
        if iso in (b.skip_dates or []):
            continue
        br_start = starts_local.replace(
            hour=b.start_time.hour,
            minute=b.start_time.minute,
            second=0,
            microsecond=0,
        )
        br_end = starts_local.replace(
            hour=b.end_time.hour,
            minute=b.end_time.minute,
            second=0,
            microsecond=0,
        )
        if starts_local < br_end and ends_local > br_start:
            raise BookingError("slot overlaps a scheduled break")
