"""Stage 6 — booking creation, reminders, slot_intent integration."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import build_test_init_data
from app.models import (
    Booking,
    BookingStatus,
    Client,
    Conversation,
    ConversationState,
    Master,
    Reminder,
    ReminderType,
    Service,
)
from app.services import (
    BookingError,
    acquire_slot_lock,
    create_booking,
    deliver_due_reminders,
)

pytestmark = pytest.mark.asyncio

TOKEN = "bookings-test-token"


@pytest.fixture(autouse=True)
def _override(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)


def _auth(user_id: int) -> dict[str, str]:
    init = build_test_init_data(TOKEN, user={"id": user_id, "first_name": "M"})
    return {"X-Telegram-Init-Data": init}


@pytest.fixture(autouse=True)
async def _clear_redis():
    redis = get_redis()
    try:
        async for key in redis.scan_iter("slotlock:*"):
            await redis.delete(key)
        yield
        async for key in redis.scan_iter("slotlock:*"):
            await redis.delete(key)
    finally:
        await redis.aclose()


async def _seed(session: AsyncSession, master_tg: int) -> tuple[Master, Service, Client]:
    master = Master(telegram_id=master_tg, timezone="Europe/Moscow", name="Аня")
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
    cl = Client(master_id=master.id, telegram_id=master_tg + 1, name="Лена")
    session.add(cl)
    await session.commit()
    await session.refresh(master)
    await session.refresh(svc)
    await session.refresh(cl)
    return master, svc, cl


# ---------------------------------------------------------- service-level


async def test_create_booking_persists_and_schedules_reminders(
    test_session: AsyncSession,
) -> None:
    master, svc, cl = await _seed(test_session, master_tg=11000)
    starts = datetime.now(UTC) + timedelta(days=2)

    booking = await create_booking(
        test_session, master=master, client=cl, service=svc, starts_at=starts
    )
    await test_session.commit()

    assert booking.id is not None
    assert booking.status == BookingStatus.SCHEDULED
    assert booking.ends_at - booking.starts_at == timedelta(minutes=svc.duration_minutes)
    assert booking.price == svc.price

    reminders = (
        (await test_session.execute(select(Reminder).where(Reminder.booking_id == booking.id)))
        .scalars()
        .all()
    )
    types = {r.type for r in reminders}
    assert ReminderType.BOOKING_24H in types
    assert ReminderType.BOOKING_2H in types
    assert ReminderType.FEEDBACK in types


async def test_create_booking_24h_skipped_when_too_close(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, master_tg=11001)
    starts = datetime.now(UTC) + timedelta(hours=3)  # < 24h

    booking = await create_booking(
        test_session, master=master, client=cl, service=svc, starts_at=starts
    )
    await test_session.commit()
    types = {
        r.type
        for r in (
            await test_session.execute(select(Reminder).where(Reminder.booking_id == booking.id))
        ).scalars()
    }
    assert ReminderType.BOOKING_24H not in types
    assert ReminderType.BOOKING_2H in types


async def test_create_booking_rejects_collision(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, master_tg=11002)
    starts = datetime.now(UTC) + timedelta(days=2)
    await create_booking(test_session, master=master, client=cl, service=svc, starts_at=starts)
    await test_session.commit()

    with pytest.raises(BookingError):
        await create_booking(
            test_session,
            master=master,
            client=cl,
            service=svc,
            starts_at=starts + timedelta(minutes=15),  # overlaps
        )


async def test_create_booking_releases_redis_lock(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, master_tg=11003)
    starts = datetime.now(UTC) + timedelta(days=2, hours=10)
    holder = "h-test"

    redis = get_redis()
    try:
        ok = await acquire_slot_lock(redis, master_id=master.id, starts_at=starts, holder_id=holder)
        assert ok
        await create_booking(
            test_session,
            master=master,
            client=cl,
            service=svc,
            starts_at=starts,
            redis=redis,
            lock_holder=holder,
        )
        await test_session.commit()
        # Lock is gone — a fresh acquire should now succeed.
        ok2 = await acquire_slot_lock(
            redis, master_id=master.id, starts_at=starts, holder_id="h-fresh"
        )
        assert ok2
    finally:
        await redis.aclose()


async def test_deliver_due_reminders_marks_sent(test_session: AsyncSession) -> None:
    master, svc, cl = await _seed(test_session, master_tg=11004)
    starts = datetime.now(UTC) + timedelta(days=2, hours=4)
    booking = await create_booking(
        test_session, master=master, client=cl, service=svc, starts_at=starts
    )
    await test_session.commit()

    sent: list[dict] = []

    async def fake_sender(*, client_telegram_id, business_connection_id, text):
        sent.append(
            {
                "chat": client_telegram_id,
                "biz": business_connection_id,
                "text": text,
            }
        )

    # Force-due everything.
    future = datetime.now(UTC) + timedelta(days=10)
    n = await deliver_due_reminders(test_session, sender=fake_sender, now=future)
    await test_session.commit()
    assert n == 3
    rows = (
        (await test_session.execute(select(Reminder).where(Reminder.booking_id == booking.id)))
        .scalars()
        .all()
    )
    assert all(r.sent_at is not None for r in rows)
    # Idempotency: a second call sends nothing.
    n2 = await deliver_due_reminders(test_session, sender=fake_sender, now=future)
    assert n2 == 0


# --------------------------------------------------------------- API


async def test_post_bookings_endpoint(client: AsyncClient, test_session: AsyncSession) -> None:
    headers = _auth(11100)
    # Bootstrap master via /me.
    await client.get("/api/me", headers=headers)
    # Create service.
    r = await client.post(
        "/api/services",
        json={"name": "Маникюр", "duration_minutes": 60, "price": "1500"},
        headers=headers,
    )
    sid = r.json()["id"]

    starts = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    r = await client.post(
        "/api/bookings",
        json={
            "service_id": sid,
            "client_telegram_id": 700001,
            "client_name": "Лена",
            "starts_at": starts,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "scheduled"

    # Booking row exists in DB
    rows = (await test_session.execute(select(Booking))).scalars().all()
    assert len(rows) == 1


async def test_post_bookings_collision_returns_409(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    headers = _auth(11101)
    await client.get("/api/me", headers=headers)
    r = await client.post(
        "/api/services",
        json={"name": "Маникюр", "duration_minutes": 60, "price": "1500"},
        headers=headers,
    )
    sid = r.json()["id"]
    starts = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    payload = {
        "service_id": sid,
        "client_telegram_id": 700002,
        "client_name": "Лена",
        "starts_at": starts,
    }
    r1 = await client.post("/api/bookings", json=payload, headers=headers)
    r2 = await client.post(
        "/api/bookings",
        json={**payload, "client_telegram_id": 700003, "client_name": "Аня"},
        headers=headers,
    )
    assert r1.status_code == 201
    assert r2.status_code == 409


# --------------------------------------------------------------- slot_intent → booking


class _SlotIntentLLM:
    def __init__(self, slot_intent: dict, collected: dict | None = None) -> None:
        from app.llm.base import LLMResult

        self._result = LLMResult(
            reply="Записала, до встречи!",
            slot_intent=slot_intent,
            collected_data=collected or {},
        )

    async def generate(self, **_kwargs):
        return self._result


async def test_dialog_slot_intent_creates_booking(test_session: AsyncSession) -> None:
    from app.services.dialog import process_client_message

    master, svc, cl = await _seed(test_session, master_tg=11200)
    conv = Conversation(master_id=master.id, client_id=cl.id, state=ConversationState.BOT)
    test_session.add(conv)
    await test_session.flush()

    starts = datetime.now(UTC) + timedelta(days=2, hours=12)
    llm = _SlotIntentLLM(
        slot_intent={"starts_at": starts.isoformat(), "service_id": svc.id},
        collected={"name": "Лена", "phone": "+79991234567"},
    )

    msg = await process_client_message(
        test_session,
        master=master,
        conversation=conv,
        user_text="да, давай в это время",
        llm=llm,
    )
    await test_session.commit()
    assert msg.llm_meta and "booking_id" in msg.llm_meta

    bookings = (await test_session.execute(select(Booking))).scalars().all()
    assert len(bookings) == 1
    # Phone was collected
    await test_session.refresh(cl)
    assert cl.phone == "+79991234567"


async def test_dialog_slot_intent_with_invalid_starts_at_skips(
    test_session: AsyncSession,
) -> None:
    from app.services.dialog import process_client_message

    master, svc, cl = await _seed(test_session, master_tg=11201)
    conv = Conversation(master_id=master.id, client_id=cl.id, state=ConversationState.BOT)
    test_session.add(conv)
    await test_session.flush()

    llm = _SlotIntentLLM(slot_intent={"starts_at": "not-a-date"})
    msg = await process_client_message(
        test_session, master=master, conversation=conv, user_text="x", llm=llm
    )
    await test_session.commit()
    assert msg.llm_meta and msg.llm_meta.get("booking_skipped") is True
    bookings = (await test_session.execute(select(Booking))).scalars().all()
    assert bookings == []
