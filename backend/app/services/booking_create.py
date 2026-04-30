"""create_booking: validate slot, create row, release lock, schedule reminders.

If the client has an active ReturnCampaign (status='sent', valid_until > now),
the discount is applied automatically and the campaign is marked as booked.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from redis.asyncio import Redis
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    Client,
    Master,
    ReturnCampaign,
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
