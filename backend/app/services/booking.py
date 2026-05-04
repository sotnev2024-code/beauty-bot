"""Slot finding and Redis-backed slot locks.

`find_available_slots` walks days_ahead days, intersects working windows with
breaks, time_offs, and existing bookings, then yields slots aligned to the
service start cadence (15-min grid by default). The end-of-day rule from the
spec applies: if remaining time-of-day < service duration, that day is skipped
and the next working day is returned via `next_available_day` for UX.

`acquire_slot_lock` does Redis SET NX EX with TTL = SLOT_LOCK_MINUTES so two
clients can't double-book the same slot.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    BookingStatus,
)
from app.models.booking import Booking
from app.models.master import Master
from app.models.schedule import Schedule, ScheduleBreak, TimeOff
from app.models.service import Service

SLOT_GRID_MINUTES = 15


@dataclass(slots=True, frozen=True)
class Slot:
    starts_at: datetime
    ends_at: datetime


@dataclass(slots=True, frozen=True)
class SlotSearchResult:
    slots: list[Slot]
    next_available_day: date | None


async def find_available_slots(
    session: AsyncSession,
    *,
    master: Master,
    service: Service,
    from_date: date,
    days_ahead: int = 7,
    grid_minutes: int = SLOT_GRID_MINUTES,
    extra_minutes: int = 0,
) -> SlotSearchResult:
    """Find slots for `service` in the next `days_ahead` days.

    `extra_minutes` extends the slot duration to account for selected
    add-ons so the button-only funnel doesn't offer slots that are too
    short once add-ons are applied.
    """
    if service.master_id != master.id:
        raise ValueError("service does not belong to master")
    if not service.is_active:
        return SlotSearchResult([], None)

    tz = _master_tz(master)
    duration = timedelta(minutes=service.duration_minutes + max(0, extra_minutes))

    days = [from_date + timedelta(days=i) for i in range(days_ahead)]

    schedules = await _load_schedules(session, master.id)
    breaks = await _load_breaks(session, master.id)
    time_offs = await _load_time_offs(session, master.id, days[0], days[-1])
    bookings = await _load_bookings_window(
        session, master.id, days[0], days[-1] + timedelta(days=1), tz
    )

    slots: list[Slot] = []
    next_day: date | None = None

    for day in days:
        day_slots = _slots_for_day(
            day=day,
            tz=tz,
            duration=duration,
            schedules=schedules,
            breaks=breaks,
            time_offs=time_offs,
            bookings=bookings,
            grid_minutes=grid_minutes,
        )
        if day_slots:
            slots.extend(day_slots)
        elif slots == [] and next_day is None and day != from_date:
            # Suggest the first non-empty day for end-of-day-skipped UX.
            next_day = day

    if slots and next_day is None:
        next_day = None  # nothing extra to suggest
    return SlotSearchResult(slots=slots, next_available_day=next_day)


def _slots_for_day(
    *,
    day: date,
    tz: ZoneInfo,
    duration: timedelta,
    schedules: list[Schedule],
    breaks: list[ScheduleBreak],
    time_offs: list[TimeOff],
    bookings: list[Booking],
    grid_minutes: int,
) -> list[Slot]:
    if any(off.date_from <= day <= off.date_to for off in time_offs):
        return []

    weekday = day.weekday()
    working = [s for s in schedules if s.weekday == weekday and s.is_working]
    if not working:
        return []

    day_breaks = [b for b in breaks if b.weekday == weekday]

    now_local = datetime.now(tz)
    busy_intervals = _bookings_for_day(bookings, day, tz)

    out: list[Slot] = []
    for sched in working:
        win_start = datetime.combine(day, sched.start_time, tzinfo=tz)
        win_end = datetime.combine(day, sched.end_time, tzinfo=tz)

        if win_end - win_start < duration:
            # End-of-day rule: not enough time today even at the start of the window.
            continue

        cursor = _round_up(win_start, grid_minutes)
        while cursor + duration <= win_end:
            slot_end = cursor + duration

            # Past slots — skip.
            if cursor <= now_local:
                cursor += timedelta(minutes=grid_minutes)
                continue

            # Break overlap.
            in_break = False
            for br in day_breaks:
                br_start = datetime.combine(day, br.start_time, tzinfo=tz)
                br_end = datetime.combine(day, br.end_time, tzinfo=tz)
                if cursor < br_end and slot_end > br_start:
                    in_break = True
                    cursor = _round_up(br_end, grid_minutes)
                    break
            if in_break:
                continue

            # Booking collision.
            collide = False
            for bs, be in busy_intervals:
                if cursor < be and slot_end > bs:
                    collide = True
                    cursor = _round_up(be, grid_minutes)
                    break
            if collide:
                continue

            out.append(
                Slot(
                    starts_at=cursor.astimezone(UTC),
                    ends_at=slot_end.astimezone(UTC),
                )
            )
            cursor += timedelta(minutes=grid_minutes)
    return out


def _bookings_for_day(
    bookings: list[Booking], day: date, tz: ZoneInfo
) -> list[tuple[datetime, datetime]]:
    day_start = datetime.combine(day, time(0), tzinfo=tz)
    day_end = day_start + timedelta(days=1)
    out: list[tuple[datetime, datetime]] = []
    for b in bookings:
        if b.status in (BookingStatus.CANCELLED, BookingStatus.NO_SHOW):
            continue
        bs = b.starts_at.astimezone(tz)
        be = b.ends_at.astimezone(tz)
        if be <= day_start or bs >= day_end:
            continue
        out.append((bs, be))
    return out


def _round_up(dt: datetime, grid_minutes: int) -> datetime:
    minute = dt.minute
    remainder = minute % grid_minutes
    if remainder == 0 and dt.second == 0 and dt.microsecond == 0:
        return dt
    add = grid_minutes - remainder
    rounded = dt.replace(second=0, microsecond=0) + timedelta(minutes=add)
    return rounded


def _master_tz(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo(settings.DEFAULT_TIMEZONE)


async def _load_schedules(session: AsyncSession, master_id: int) -> list[Schedule]:
    result = await session.execute(select(Schedule).where(Schedule.master_id == master_id))
    return list(result.scalars().all())


async def _load_breaks(session: AsyncSession, master_id: int) -> list[ScheduleBreak]:
    result = await session.execute(
        select(ScheduleBreak).where(ScheduleBreak.master_id == master_id)
    )
    return list(result.scalars().all())


async def _load_time_offs(
    session: AsyncSession, master_id: int, from_day: date, to_day: date
) -> list[TimeOff]:
    result = await session.execute(
        select(TimeOff).where(
            TimeOff.master_id == master_id,
            TimeOff.date_to >= from_day,
            TimeOff.date_from <= to_day,
        )
    )
    return list(result.scalars().all())


async def _load_bookings_window(
    session: AsyncSession,
    master_id: int,
    from_day: date,
    to_day: date,
    tz: ZoneInfo,
) -> list[Booking]:
    win_start = datetime.combine(from_day, time(0), tzinfo=tz)
    win_end = datetime.combine(to_day, time(0), tzinfo=tz)
    result = await session.execute(
        select(Booking).where(
            Booking.master_id == master_id,
            Booking.starts_at < win_end,
            Booking.ends_at > win_start,
        )
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------- Redis lock


def _slot_lock_key(master_id: int, starts_at: datetime) -> str:
    return f"slotlock:{master_id}:{int(starts_at.astimezone(UTC).timestamp())}"


async def acquire_slot_lock(
    redis: Redis,
    *,
    master_id: int,
    starts_at: datetime,
    holder_id: str,
    ttl_minutes: int | None = None,
) -> bool:
    """Atomically reserve a slot. Returns True iff this caller wins the race."""
    ttl = ttl_minutes if ttl_minutes is not None else settings.SLOT_LOCK_MINUTES
    key = _slot_lock_key(master_id, starts_at)
    res = await redis.set(key, holder_id, ex=ttl * 60, nx=True)
    return bool(res)


async def slot_lock_ttl(redis: Redis, *, master_id: int, starts_at: datetime) -> int:
    return int(await redis.ttl(_slot_lock_key(master_id, starts_at)))


async def release_slot_lock(
    redis: Redis, *, master_id: int, starts_at: datetime, holder_id: str
) -> bool:
    """Release iff we still own the key (compare-and-delete via Lua)."""
    script = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """
    key = _slot_lock_key(master_id, starts_at)
    result = await redis.eval(script, 1, key, holder_id)
    return bool(result)


def _filter_locked(slots: Iterable[Slot], locked: set[int]) -> list[Slot]:
    return [s for s in slots if int(s.starts_at.timestamp()) not in locked]


async def filter_locked_slots(redis: Redis, master_id: int, slots: list[Slot]) -> list[Slot]:
    if not slots:
        return slots
    keys = [_slot_lock_key(master_id, s.starts_at) for s in slots]
    values = await redis.mget(keys)
    locked_ts = {
        int(s.starts_at.timestamp()) for s, v in zip(slots, values, strict=True) if v is not None
    }
    return _filter_locked(slots, locked_ts)
