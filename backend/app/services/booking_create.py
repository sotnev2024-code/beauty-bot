"""create_booking: validate slot, create row, release lock, schedule reminders."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    Client,
    Master,
    Service,
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

    booking = Booking(
        master_id=master.id,
        client_id=client.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=BookingStatus.SCHEDULED,
        price=service.price,
        source=source,
    )
    session.add(booking)
    await session.flush()

    await schedule_booking_reminders(session, booking=booking)

    if redis is not None and lock_holder is not None:
        try:
            await release_slot_lock(
                redis, master_id=master.id, starts_at=starts_at, holder_id=lock_holder
            )
        except Exception:
            log.exception("failed to release slot lock for booking %s", booking.id)

    return booking
