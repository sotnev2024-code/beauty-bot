"""Unit coverage for booking_create._validate_within_schedule.

The bot's anti-hallucination guard relies on this server-side check rejecting
slots that fall outside the master's working window, inside a recurring
break, or on a TimeOff date — even when the LLM proposes them. These tests
exercise each branch directly so a regression here surfaces in CI rather
than in production.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Client,
    Master,
    Schedule,
    ScheduleBreak,
    Service,
    TimeOff,
)
from app.services.booking_create import BookingError, create_booking

pytestmark = pytest.mark.asyncio


async def _seed(session: AsyncSession, *, tg: int) -> tuple[Master, Service, Client]:
    master = Master(telegram_id=tg, timezone="Europe/Moscow", name="Sched Tester")
    session.add(master)
    await session.flush()
    svc = Service(
        master_id=master.id,
        name="Маникюр",
        duration_minutes=60,
        price=Decimal("1500"),
        is_active=True,
    )
    session.add(svc)
    cl = Client(master_id=master.id, telegram_id=tg + 1, name="Тест Клиент")
    session.add(cl)
    await session.commit()
    await session.refresh(master)
    await session.refresh(svc)
    await session.refresh(cl)
    return master, svc, cl


def _next_monday_at(local_hour: int, local_minute: int = 0) -> datetime:
    """A future Monday at the given Moscow-local time, returned as UTC."""
    today_local = datetime.now(UTC).astimezone()
    days_ahead = (0 - today_local.weekday()) % 7 or 7
    target_local_date = today_local.date() + timedelta(days=days_ahead)
    moscow_offset = timedelta(hours=3)
    naive_local = datetime.combine(
        target_local_date, time(local_hour, local_minute)
    )
    return (naive_local - moscow_offset).replace(tzinfo=UTC)


async def test_rejects_when_no_schedule_seeded(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20001)
    starts = _next_monday_at(11)
    with pytest.raises(BookingError, match="not working"):
        await create_booking(
            test_session, master=master, client=cl, service=svc, starts_at=starts
        )


async def test_accepts_inside_working_window(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20002)
    test_session.add(
        Schedule(
            master_id=master.id,
            weekday=0,
            start_time=time(10, 0),
            end_time=time(20, 0),
            is_working=True,
        )
    )
    await test_session.commit()
    starts = _next_monday_at(11)
    booking = await create_booking(
        test_session, master=master, client=cl, service=svc, starts_at=starts
    )
    assert booking.id is not None


async def test_rejects_outside_working_window(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20003)
    test_session.add(
        Schedule(
            master_id=master.id,
            weekday=0,
            start_time=time(10, 0),
            end_time=time(12, 0),
            is_working=True,
        )
    )
    await test_session.commit()
    # 11:30 + 60min = 12:30 — overruns the 12:00 close.
    starts = _next_monday_at(11, 30)
    with pytest.raises(BookingError, match="outside master's working hours"):
        await create_booking(
            test_session, master=master, client=cl, service=svc, starts_at=starts
        )


async def test_rejects_inside_break(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20004)
    test_session.add_all(
        [
            Schedule(
                master_id=master.id,
                weekday=0,
                start_time=time(10, 0),
                end_time=time(20, 0),
                is_working=True,
            ),
            ScheduleBreak(
                master_id=master.id,
                weekday=0,
                start_time=time(14, 0),
                end_time=time(15, 0),
                skip_dates=[],
            ),
        ]
    )
    await test_session.commit()
    starts = _next_monday_at(14, 30)
    with pytest.raises(BookingError, match="overlaps a scheduled break"):
        await create_booking(
            test_session, master=master, client=cl, service=svc, starts_at=starts
        )


async def test_break_skip_date_allows_booking(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20005)
    monday = _next_monday_at(14, 30)
    iso = monday.astimezone().date().isoformat()
    test_session.add_all(
        [
            Schedule(
                master_id=master.id,
                weekday=0,
                start_time=time(10, 0),
                end_time=time(20, 0),
                is_working=True,
            ),
            ScheduleBreak(
                master_id=master.id,
                weekday=0,
                start_time=time(14, 0),
                end_time=time(15, 0),
                skip_dates=[iso],
            ),
        ]
    )
    await test_session.commit()
    booking = await create_booking(
        test_session, master=master, client=cl, service=svc, starts_at=monday
    )
    assert booking.id is not None


async def test_rejects_during_time_off(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20006)
    monday = _next_monday_at(11)
    monday_local_date = monday.astimezone().date()
    test_session.add_all(
        [
            Schedule(
                master_id=master.id,
                weekday=0,
                start_time=time(10, 0),
                end_time=time(20, 0),
                is_working=True,
            ),
            TimeOff(
                master_id=master.id,
                date_from=monday_local_date - timedelta(days=1),
                date_to=monday_local_date + timedelta(days=1),
                reason="отпуск",
            ),
        ]
    )
    await test_session.commit()
    with pytest.raises(BookingError, match="time-off"):
        await create_booking(
            test_session, master=master, client=cl, service=svc, starts_at=monday
        )


async def test_rejects_when_weekday_marked_non_working(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, tg=20007)
    test_session.add(
        Schedule(
            master_id=master.id,
            weekday=0,
            start_time=time(10, 0),
            end_time=time(20, 0),
            is_working=False,
        )
    )
    await test_session.commit()
    starts = _next_monday_at(11)
    with pytest.raises(BookingError, match="not working"):
        await create_booking(
            test_session, master=master, client=cl, service=svc, starts_at=starts
        )
