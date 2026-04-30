from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import Schedule, ScheduleBreak, TimeOff
from app.schemas import (
    ScheduleBreakEntry,
    ScheduleBreakRead,
    ScheduleBundle,
    ScheduleEntry,
    ScheduleEntryRead,
    TimeOffEntry,
    TimeOffRead,
)

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("", response_model=ScheduleBundle)
async def get_schedule(master: CurrentMaster, session: SessionDep) -> ScheduleBundle:
    schedules = (
        (
            await session.execute(
                select(Schedule).where(Schedule.master_id == master.id).order_by(Schedule.weekday)
            )
        )
        .scalars()
        .all()
    )
    breaks = (
        (
            await session.execute(
                select(ScheduleBreak)
                .where(ScheduleBreak.master_id == master.id)
                .order_by(ScheduleBreak.weekday)
            )
        )
        .scalars()
        .all()
    )
    offs = (
        (
            await session.execute(
                select(TimeOff).where(TimeOff.master_id == master.id).order_by(TimeOff.date_from)
            )
        )
        .scalars()
        .all()
    )
    return ScheduleBundle(
        schedules=[ScheduleEntryRead.model_validate(s) for s in schedules],
        breaks=[ScheduleBreakRead.model_validate(b) for b in breaks],
        time_offs=[TimeOffRead.model_validate(o) for o in offs],
    )


@router.put("", response_model=list[ScheduleEntryRead])
async def replace_schedule(
    entries: list[ScheduleEntry], master: CurrentMaster, session: SessionDep
) -> list[ScheduleEntryRead]:
    """Replace the whole weekly schedule in one call."""
    rows = (
        (await session.execute(select(Schedule).where(Schedule.master_id == master.id)))
        .scalars()
        .all()
    )
    for r in rows:
        await session.delete(r)
    new_rows = [Schedule(master_id=master.id, **e.model_dump()) for e in entries]
    session.add_all(new_rows)
    await session.commit()
    for r in new_rows:
        await session.refresh(r)
    return [ScheduleEntryRead.model_validate(r) for r in new_rows]


@router.post("/breaks", response_model=ScheduleBreakRead, status_code=status.HTTP_201_CREATED)
async def add_break(
    payload: ScheduleBreakEntry, master: CurrentMaster, session: SessionDep
) -> ScheduleBreakRead:
    row = ScheduleBreak(master_id=master.id, **payload.model_dump())
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return ScheduleBreakRead.model_validate(row)


@router.delete(
    "/breaks/{break_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_break(break_id: int, master: CurrentMaster, session: SessionDep) -> None:
    row = (
        await session.execute(
            select(ScheduleBreak).where(
                ScheduleBreak.id == break_id, ScheduleBreak.master_id == master.id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="break not found")
    await session.delete(row)
    await session.commit()


@router.post("/time-offs", response_model=TimeOffRead, status_code=status.HTTP_201_CREATED)
async def add_time_off(
    payload: TimeOffEntry, master: CurrentMaster, session: SessionDep
) -> TimeOffRead:
    row = TimeOff(master_id=master.id, **payload.model_dump())
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return TimeOffRead.model_validate(row)


@router.delete(
    "/time-offs/{time_off_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_time_off(time_off_id: int, master: CurrentMaster, session: SessionDep) -> None:
    row = (
        await session.execute(
            select(TimeOff).where(TimeOff.id == time_off_id, TimeOff.master_id == master.id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="time_off not found")
    await session.delete(row)
    await session.commit()
