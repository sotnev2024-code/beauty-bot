from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.core.redis import get_redis
from app.models import Service
from app.schemas import SlotLockRequest, SlotLockResponse, SlotRead, SlotsResponse
from app.services.booking import (
    Slot,
    acquire_slot_lock,
    filter_locked_slots,
    find_available_slots,
    slot_lock_ttl,
)

router = APIRouter(prefix="/slots", tags=["slots"])


@router.get("", response_model=SlotsResponse)
async def list_slots(
    master: CurrentMaster,
    session: SessionDep,
    service_id: int = Query(..., gt=0),
    from_date: date | None = Query(None),
    days_ahead: int = Query(7, ge=1, le=30),
) -> SlotsResponse:
    svc = (
        await session.execute(
            select(Service).where(Service.id == service_id, Service.master_id == master.id)
        )
    ).scalar_one_or_none()
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service not found")

    base_day = from_date or date.today()
    result = await find_available_slots(
        session,
        master=master,
        service=svc,
        from_date=base_day,
        days_ahead=days_ahead,
    )

    redis = get_redis()
    try:
        free = await filter_locked_slots(redis, master.id, result.slots)
    finally:
        await redis.aclose()

    return SlotsResponse(
        service_id=svc.id,
        duration_minutes=svc.duration_minutes,
        slots=[SlotRead(starts_at=s.starts_at, ends_at=s.ends_at) for s in free],
        next_available_day=(
            result.next_available_day.isoformat() if result.next_available_day else None
        ),
    )


@router.post("/lock", response_model=SlotLockResponse)
async def lock_slot(
    payload: SlotLockRequest,
    master: CurrentMaster,
    session: SessionDep,
) -> SlotLockResponse:
    svc = (
        await session.execute(
            select(Service).where(Service.id == payload.service_id, Service.master_id == master.id)
        )
    ).scalar_one_or_none()
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service not found")

    starts_at = payload.starts_at
    ends_at = starts_at + timedelta(minutes=svc.duration_minutes)
    holder = secrets.token_urlsafe(16)

    redis = get_redis()
    try:
        ok = await acquire_slot_lock(
            redis, master_id=master.id, starts_at=starts_at, holder_id=holder
        )
        if ok:
            ttl = await slot_lock_ttl(redis, master_id=master.id, starts_at=starts_at)
            return SlotLockResponse(
                locked=True,
                starts_at=starts_at,
                ends_at=ends_at,
                expires_in_seconds=ttl if ttl > 0 else None,
            )

        # Failed: suggest next free slot in the same day
        result = await find_available_slots(
            session,
            master=master,
            service=svc,
            from_date=starts_at.date(),
            days_ahead=2,
        )
        free = await filter_locked_slots(redis, master.id, result.slots)
        alt = _first_after(free, starts_at)
        return SlotLockResponse(
            locked=False,
            starts_at=starts_at,
            ends_at=ends_at,
            alternative=(SlotRead(starts_at=alt.starts_at, ends_at=alt.ends_at) if alt else None),
        )
    finally:
        await redis.aclose()


def _first_after(slots: list[Slot], cutoff: datetime) -> Slot | None:
    for s in slots:
        if s.starts_at > cutoff:
            return s
    return None
