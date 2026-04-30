from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.core.redis import get_redis
from app.models import Booking, BookingStatus, Client, Service
from app.schemas import BookingCreate, BookingDetail, BookingRead, BookingUpdate
from app.services import BookingError, create_booking, push_master_about_booking

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking_endpoint(
    payload: BookingCreate,
    master: CurrentMaster,
    session: SessionDep,
) -> BookingRead:
    svc = (
        await session.execute(
            select(Service).where(Service.id == payload.service_id, Service.master_id == master.id)
        )
    ).scalar_one_or_none()
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service not found")

    client = (
        await session.execute(
            select(Client).where(
                Client.master_id == master.id,
                Client.telegram_id == payload.client_telegram_id,
            )
        )
    ).scalar_one_or_none()
    if client is None:
        client = Client(
            master_id=master.id,
            telegram_id=payload.client_telegram_id,
            name=payload.client_name,
            phone=payload.client_phone,
        )
        session.add(client)
        await session.flush()
    else:
        if payload.client_name and not client.name:
            client.name = payload.client_name
        if payload.client_phone and not client.phone:
            client.phone = payload.client_phone

    redis = get_redis()
    try:
        booking = await create_booking(
            session,
            master=master,
            client=client,
            service=svc,
            starts_at=payload.starts_at,
            redis=redis,
            source=payload.source or "miniapp",
        )
    except BookingError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    finally:
        await redis.aclose()

    await session.commit()
    await session.refresh(booking)

    # Push master via the public bot. We swallow failures — the booking is
    # already persisted; a missed push is logged in notify.py.
    try:
        from app.bot import get_bot

        bot = get_bot()
        await push_master_about_booking(
            bot=bot,
            master=master,
            client=client,
            service=svc,
            booking=booking,
        )
    except Exception:
        # Bot token missing / invalid / network — non-fatal.
        pass

    return BookingRead.model_validate(booking)


@router.get("", response_model=list[BookingDetail])
async def list_bookings(
    master: CurrentMaster,
    session: SessionDep,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    status_filter: BookingStatus | None = Query(None, alias="status"),
    limit: int = Query(200, ge=1, le=500),
) -> list[BookingDetail]:
    base = (datetime.now(UTC).date(), datetime.now(UTC).date() + timedelta(days=14))
    f = from_date or base[0]
    t = to_date or base[1]
    win_start = datetime.combine(f, time(0), tzinfo=UTC)
    win_end = datetime.combine(t + timedelta(days=1), time(0), tzinfo=UTC)

    stmt = (
        select(Booking)
        .where(
            Booking.master_id == master.id,
            Booking.starts_at < win_end,
            Booking.ends_at > win_start,
        )
        .order_by(Booking.starts_at)
        .limit(limit)
    )
    if status_filter is not None:
        stmt = stmt.where(Booking.status == status_filter)

    rows = (await session.execute(stmt)).scalars().all()

    out: list[BookingDetail] = []
    for b in rows:
        cl = await session.get(Client, b.client_id)
        svc = await session.get(Service, b.service_id) if b.service_id else None
        out.append(
            BookingDetail(
                **BookingRead.model_validate(b).model_dump(),
                client_name=cl.name if cl else None,
                client_phone=cl.phone if cl else None,
                service_name=svc.name if svc else None,
            )
        )
    return out


@router.patch("/{booking_id}", response_model=BookingDetail)
async def update_booking(
    booking_id: int,
    payload: BookingUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> BookingDetail:
    b = await _get_owned_booking(session, master.id, booking_id)
    data = payload.model_dump(exclude_unset=True)

    if "starts_at" in data and data["starts_at"] is not None:
        # Reschedule: shift starts_at and recompute ends_at from duration.
        old_duration = b.ends_at - b.starts_at
        b.starts_at = data["starts_at"].astimezone(UTC)
        b.ends_at = b.starts_at + old_duration
    if "status" in data and data["status"] is not None:
        b.status = data["status"]
    if "notes" in data:
        b.notes = data["notes"]
    await session.commit()
    await session.refresh(b)
    cl = await session.get(Client, b.client_id)
    svc = await session.get(Service, b.service_id) if b.service_id else None
    return BookingDetail(
        **BookingRead.model_validate(b).model_dump(),
        client_name=cl.name if cl else None,
        client_phone=cl.phone if cl else None,
        service_name=svc.name if svc else None,
    )


@router.delete(
    "/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def cancel_booking(booking_id: int, master: CurrentMaster, session: SessionDep) -> None:
    """Soft-cancel: status=cancelled. Hard-delete is not exposed."""
    b = await _get_owned_booking(session, master.id, booking_id)
    b.status = BookingStatus.CANCELLED
    await session.commit()


async def _get_owned_booking(session: SessionDep, master_id: int, booking_id: int) -> Booking:
    b = (
        await session.execute(
            select(Booking).where(Booking.id == booking_id, Booking.master_id == master_id)
        )
    ).scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="booking not found")
    return b
