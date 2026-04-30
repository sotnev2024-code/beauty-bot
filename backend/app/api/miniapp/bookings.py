from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.core.redis import get_redis
from app.models import Client, Service
from app.schemas import BookingCreate, BookingRead
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
