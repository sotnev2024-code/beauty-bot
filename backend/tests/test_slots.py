"""Stage 4 — slot finder + Redis lock."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import build_test_init_data
from app.models import (
    Booking,
    BookingStatus,
    Master,
    Schedule,
    ScheduleBreak,
    Service,
    TimeOff,
)
from app.services.booking import (
    acquire_slot_lock,
    find_available_slots,
    release_slot_lock,
)

pytestmark = pytest.mark.asyncio

TOKEN = "slots-test-token"
TZ_NAME = "Europe/Moscow"


@pytest.fixture(autouse=True)
def _override(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)
    monkeypatch.setattr(settings, "SLOT_LOCK_MINUTES", 5)
    monkeypatch.setattr(settings, "DEFAULT_TIMEZONE", TZ_NAME)


@pytest.fixture(autouse=True)
async def _clear_redis():
    """Wipe slotlock:* keys between tests to keep them isolated."""
    redis = get_redis()
    try:
        async for key in redis.scan_iter("slotlock:*"):
            await redis.delete(key)
        yield
        async for key in redis.scan_iter("slotlock:*"):
            await redis.delete(key)
    finally:
        await redis.aclose()


async def _seed_master_with_schedule(
    session: AsyncSession,
    *,
    master_tg: int = 9100,
    duration: int = 60,
    work_start: time = time(10, 0),
    work_end: time = time(18, 0),
    weekdays: tuple[int, ...] = tuple(range(7)),
) -> tuple[Master, Service]:
    master = Master(
        telegram_id=master_tg,
        timezone=TZ_NAME,
        name="Master",
    )
    session.add(master)
    await session.flush()
    for wd in weekdays:
        session.add(
            Schedule(
                master_id=master.id,
                weekday=wd,
                start_time=work_start,
                end_time=work_end,
                is_working=True,
            )
        )
    svc = Service(
        master_id=master.id,
        name="Маникюр",
        duration_minutes=duration,
        price=Decimal("1500"),
        is_active=True,
    )
    session.add(svc)
    await session.commit()
    await session.refresh(master)
    await session.refresh(svc)
    return master, svc


async def _next_workday(weekday_target: int | None = None) -> date:
    """Pick a future date that won't be 'today' (avoids past-slot filtering)."""
    today = datetime.now(ZoneInfo(TZ_NAME)).date()
    return today + timedelta(days=2)


async def test_find_slots_basic_window(test_session: AsyncSession) -> None:
    master, svc = await _seed_master_with_schedule(test_session, master_tg=9100)
    day = await _next_workday()
    res = await find_available_slots(
        test_session, master=master, service=svc, from_date=day, days_ahead=1
    )
    # 10–18 with 60-min duration on a 15-min grid → starts 10:00,10:15,...,17:00
    assert len(res.slots) == 8 * 4 - 3  # 32 - 3 = 29 (last fitting start = 17:00)
    starts = [s.starts_at.astimezone(ZoneInfo(TZ_NAME)).strftime("%H:%M") for s in res.slots]
    assert starts[0] == "10:00"
    assert starts[-1] == "17:00"


async def test_find_slots_respects_break(test_session: AsyncSession) -> None:
    master, svc = await _seed_master_with_schedule(test_session, master_tg=9101)
    day = await _next_workday()
    test_session.add(
        ScheduleBreak(
            master_id=master.id,
            weekday=day.weekday(),
            start_time=time(13, 0),
            end_time=time(14, 0),
        )
    )
    await test_session.commit()
    res = await find_available_slots(
        test_session, master=master, service=svc, from_date=day, days_ahead=1
    )
    starts = {s.starts_at.astimezone(ZoneInfo(TZ_NAME)).strftime("%H:%M") for s in res.slots}
    # 12:00–13:00 ends exactly when the break starts → allowed (adjacent, not overlapping).
    assert "12:00" in starts
    # Anything that would overlap the 13:00–14:00 break is dropped.
    assert "12:15" not in starts
    assert "12:30" not in starts
    assert "12:45" not in starts
    assert "13:00" not in starts
    assert "13:30" not in starts
    # 14:00–15:00 starts exactly when the break ends → allowed.
    assert "14:00" in starts


async def test_find_slots_skips_time_off(test_session: AsyncSession) -> None:
    master, svc = await _seed_master_with_schedule(test_session, master_tg=9102)
    day = await _next_workday()
    test_session.add(TimeOff(master_id=master.id, date_from=day, date_to=day, reason="отпуск"))
    await test_session.commit()
    res = await find_available_slots(
        test_session, master=master, service=svc, from_date=day, days_ahead=1
    )
    assert res.slots == []


async def test_find_slots_skips_existing_booking(test_session: AsyncSession) -> None:
    from app.models import Client

    master, svc = await _seed_master_with_schedule(test_session, master_tg=9103)
    day = await _next_workday()
    tz = ZoneInfo(TZ_NAME)

    client = Client(master_id=master.id, telegram_id=99, name="C")
    test_session.add(client)
    await test_session.flush()

    booking_start = datetime.combine(day, time(12, 0), tzinfo=tz)
    test_session.add(
        Booking(
            master_id=master.id,
            client_id=client.id,
            service_id=svc.id,
            starts_at=booking_start.astimezone(UTC),
            ends_at=(booking_start + timedelta(minutes=60)).astimezone(UTC),
            status=BookingStatus.SCHEDULED,
        )
    )
    await test_session.commit()

    res = await find_available_slots(
        test_session, master=master, service=svc, from_date=day, days_ahead=1
    )
    starts = {s.starts_at.astimezone(tz).strftime("%H:%M") for s in res.slots}
    # 11:00–12:00 ends exactly when the booking starts → allowed (adjacent).
    assert "11:00" in starts
    # 11:15–12:15 overlaps booking (12:00–13:00) → blocked.
    assert "11:15" not in starts
    assert "11:45" not in starts
    assert "12:00" not in starts
    # 13:00–14:00 starts exactly when the booking ends → allowed.
    assert "13:00" in starts


async def test_find_slots_end_of_day_rule(test_session: AsyncSession) -> None:
    """If the service duration > remaining window time, no slots that day."""
    master, svc = await _seed_master_with_schedule(
        test_session,
        master_tg=9104,
        duration=180,
        work_start=time(10, 0),
        work_end=time(11, 0),  # only 1 hour open, service is 3 hours
    )
    day = await _next_workday()
    res = await find_available_slots(
        test_session, master=master, service=svc, from_date=day, days_ahead=1
    )
    assert res.slots == []


async def test_redis_lock_contention() -> None:
    redis = get_redis()
    try:
        starts_at = datetime(2030, 1, 15, 12, 0, tzinfo=UTC)
        master_id = 7777
        await release_slot_lock(
            redis, master_id=master_id, starts_at=starts_at, holder_id="cleanup"
        )

        ok1 = await acquire_slot_lock(
            redis, master_id=master_id, starts_at=starts_at, holder_id="A", ttl_minutes=1
        )
        ok2 = await acquire_slot_lock(
            redis, master_id=master_id, starts_at=starts_at, holder_id="B", ttl_minutes=1
        )
        assert ok1 is True
        assert ok2 is False

        released = await release_slot_lock(
            redis, master_id=master_id, starts_at=starts_at, holder_id="A"
        )
        assert released is True

        ok3 = await acquire_slot_lock(
            redis, master_id=master_id, starts_at=starts_at, holder_id="C", ttl_minutes=1
        )
        assert ok3 is True
        await release_slot_lock(redis, master_id=master_id, starts_at=starts_at, holder_id="C")
    finally:
        await redis.aclose()


async def test_lock_endpoint_second_caller_gets_alternative(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    master, svc = await _seed_master_with_schedule(test_session, master_tg=9105)
    init = build_test_init_data(TOKEN, user={"id": 9105, "first_name": "M"})
    headers = {"X-Telegram-Init-Data": init}

    day = await _next_workday()
    starts_at = datetime.combine(day, time(11, 0), tzinfo=ZoneInfo(TZ_NAME))

    r1 = await client.post(
        "/api/slots/lock",
        json={"service_id": svc.id, "starts_at": starts_at.isoformat()},
        headers=headers,
    )
    assert r1.status_code == 200, r1.text
    assert r1.json()["locked"] is True

    r2 = await client.post(
        "/api/slots/lock",
        json={"service_id": svc.id, "starts_at": starts_at.isoformat()},
        headers=headers,
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["locked"] is False
    assert body["alternative"] is not None
    # cleanup
    redis = get_redis()
    await release_slot_lock(redis, master_id=master.id, starts_at=starts_at, holder_id="anyone")
    await redis.aclose()


async def test_get_slots_endpoint(client: AsyncClient, test_session: AsyncSession) -> None:
    master, svc = await _seed_master_with_schedule(test_session, master_tg=9106)
    init = build_test_init_data(TOKEN, user={"id": 9106, "first_name": "M"})
    headers = {"X-Telegram-Init-Data": init}
    day = await _next_workday()
    r = await client.get(
        "/api/slots",
        headers=headers,
        params={"service_id": svc.id, "from_date": day.isoformat(), "days_ahead": 1},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["service_id"] == svc.id
    assert body["duration_minutes"] == 60
    assert len(body["slots"]) > 0
