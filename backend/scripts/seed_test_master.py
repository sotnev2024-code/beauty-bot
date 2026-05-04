"""Seed a single «test» master so you can write to them from another
Telegram account and exercise the bot end-to-end.

Idempotent: re-running won't duplicate anything — services / KB items /
schedule rows are matched by (master_id, name/type/weekday) and either
updated or left alone.

Usage inside the local backend container:

    docker compose exec backend python scripts/seed_test_master.py

    # optional: pass a different telegram_id
    docker compose exec backend python scripts/seed_test_master.py 1234567890
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.db import session_factory
from app.models import (
    Booking,
    BookingStatus,
    BotSettings,
    Client,
    KnowledgeBaseItem,
    Master,
    Schedule,
    ScheduleBreak,
    Service,
    ServiceAddon,
)
from app.models.enums import Plan

DEFAULT_MASTER_TG = 1724263429


async def upsert_master(session, *, telegram_id: int) -> Master:
    row = (
        await session.execute(select(Master).where(Master.telegram_id == telegram_id))
    ).scalar_one_or_none()
    if row is None:
        row = Master(
            telegram_id=telegram_id,
            telegram_username="test_master",
            name="Анна",
            niche="маникюр и брови",
            timezone="Europe/Moscow",
            plan=Plan.TRIAL,
            trial_ends_at=datetime.now(UTC) + timedelta(days=14),
            bot_enabled=True,
        )
        session.add(row)
        await session.flush()
    else:
        # Make sure trial is fresh + bot is on, in case left in a weird state
        row.trial_ends_at = datetime.now(UTC) + timedelta(days=14)
        row.bot_enabled = True
        if not row.name:
            row.name = "Анна"
        if not row.niche:
            row.niche = "маникюр и брови"
    return row


async def upsert_bot_settings(session, master_id: int) -> None:
    bs = await session.get(BotSettings, master_id)
    if bs is None:
        bs = BotSettings(
            master_id=master_id,
            greeting="Здравствуйте! Я Анна — отвечу через минуту.",
            voice_tone="warm",
            message_format="hybrid",
            is_enabled=True,
            reminders_enabled=True,
            master_digest_enabled=True,
            master_digest_hour=10,
            master_pre_visit_enabled=True,
            master_pre_visit_offsets=[10, 60],
        )
        session.add(bs)
    else:
        bs.is_enabled = True
        bs.reminders_enabled = True
        bs.master_digest_enabled = True
        bs.master_pre_visit_enabled = True


async def upsert_schedule(session, master_id: int) -> None:
    # Mon-Fri 10:00-20:00, Sat 12:00-18:00, Sun off
    plan = {
        0: (time(10), time(20), True),
        1: (time(10), time(20), True),
        2: (time(10), time(20), True),
        3: (time(10), time(20), True),
        4: (time(10), time(20), True),
        5: (time(12), time(18), True),
        6: (time(0), time(0), False),
    }
    existing = {
        s.weekday: s
        for s in (
            (
                await session.execute(
                    select(Schedule).where(Schedule.master_id == master_id)
                )
            )
            .scalars()
            .all()
        )
    }
    for wd, (start, end, working) in plan.items():
        row = existing.get(wd)
        if row is None:
            session.add(
                Schedule(
                    master_id=master_id,
                    weekday=wd,
                    start_time=start,
                    end_time=end,
                    is_working=working,
                )
            )
        else:
            row.start_time = start
            row.end_time = end
            row.is_working = working

    # Mon-Fri lunch break 14:00-15:00 (weekdays only).
    existing_breaks = {
        b.weekday: b
        for b in (
            (
                await session.execute(
                    select(ScheduleBreak).where(ScheduleBreak.master_id == master_id)
                )
            )
            .scalars()
            .all()
        )
    }
    for wd in range(5):
        row = existing_breaks.get(wd)
        if row is None:
            session.add(
                ScheduleBreak(
                    master_id=master_id,
                    weekday=wd,
                    start_time=time(14),
                    end_time=time(15),
                    skip_dates=[],
                )
            )


async def upsert_services(session, master_id: int) -> dict[str, Service]:
    """Create Маникюр (with addons), Педикюр, Брови.

    Returns name → Service so the booking seeder can reference them.
    """
    spec = [
        {
            "name": "Маникюр",
            "duration_minutes": 60,
            "price": Decimal("1500"),
            "description": "Классический аппаратный маникюр",
            "addons": [
                {"name": "Покрытие гель-лак", "duration_delta": 30, "price_delta": Decimal("500"), "position": 1, "is_default": False},
                {"name": "Дизайн на 2 ногтя", "duration_delta": 15, "price_delta": Decimal("300"), "position": 2, "is_default": False},
                {"name": "Парафинотерапия", "duration_delta": 20, "price_delta": Decimal("400"), "position": 3, "is_default": False},
            ],
            "reminder_after_days": 30,
        },
        {
            "name": "Педикюр",
            "duration_minutes": 90,
            "price": Decimal("2500"),
            "description": "Аппаратный педикюр + покрытие",
            "addons": [],
            "reminder_after_days": 45,
        },
        {
            "name": "Брови (коррекция + окрашивание)",
            "duration_minutes": 30,
            "price": Decimal("800"),
            "description": None,
            "addons": [],
            "reminder_after_days": None,
        },
    ]

    out: dict[str, Service] = {}
    for s in spec:
        row = (
            await session.execute(
                select(Service).where(
                    Service.master_id == master_id, Service.name == s["name"]
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = Service(
                master_id=master_id,
                name=s["name"],
                duration_minutes=s["duration_minutes"],
                price=s["price"],
                description=s["description"],
                is_active=True,
                reminder_after_days=s["reminder_after_days"],
            )
            session.add(row)
            await session.flush()
        else:
            row.duration_minutes = s["duration_minutes"]
            row.price = s["price"]
            row.description = s["description"]
            row.is_active = True
            row.reminder_after_days = s["reminder_after_days"]

        existing_addons = {
            a.name: a
            for a in (
                (
                    await session.execute(
                        select(ServiceAddon).where(ServiceAddon.service_id == row.id)
                    )
                )
                .scalars()
                .all()
            )
        }
        for a in s["addons"]:
            ar = existing_addons.get(a["name"])
            if ar is None:
                session.add(
                    ServiceAddon(
                        service_id=row.id,
                        name=a["name"],
                        duration_delta=a["duration_delta"],
                        price_delta=a["price_delta"],
                        position=a["position"],
                        is_default=a["is_default"],
                    )
                )
            else:
                ar.duration_delta = a["duration_delta"]
                ar.price_delta = a["price_delta"]
                ar.position = a["position"]
                ar.is_default = a["is_default"]

        out[s["name"]] = row
    return out


async def upsert_kb(session, master_id: int) -> None:
    items = [
        {
            "type": "address",
            "title": "Адрес",
            "content": (
                "г. Казань, ул. Завойского 21, корпус 2, кв. 12. "
                "От метро «Северный вокзал» 7 минут пешком, поверните "
                "направо у жёлтого дома на углу. Домофон не нужен — "
                "позвоните, я открою."
            ),
            "geolocation_lat": 55.7600,
            "geolocation_lng": 49.1800,
            "yandex_maps_url": "https://yandex.ru/maps/?pt=49.18,55.76&z=17",
            "position": 0,
        },
        {
            "type": "payment",
            "title": "Способы оплаты",
            "content": "Наличные, перевод по СБП на телефон или картой через терминал.",
            "geolocation_lat": None,
            "geolocation_lng": None,
            "yandex_maps_url": None,
            "position": 1,
        },
        {
            "type": "sterilization",
            "title": "Стерилизация и санитария",
            "content": (
                "Все инструменты после каждого клиента проходят полный "
                "цикл стерилизации в сухожаровом шкафу. Одноразовые "
                "пилки, апельсиновые палочки и салфетки. На рабочей "
                "поверхности — антисептик."
            ),
            "geolocation_lat": None,
            "geolocation_lng": None,
            "yandex_maps_url": None,
            "position": 2,
        },
        # Intentionally leaving these standard topics empty so the bot
        # has to escalate (testing the «НЕ УКАЗАНО МАСТЕРОМ» path):
        # techniques, preparation, whats_with, guarantees, restrictions
    ]
    existing = {
        (i.master_id, i.type): i
        for i in (
            (
                await session.execute(
                    select(KnowledgeBaseItem).where(
                        KnowledgeBaseItem.master_id == master_id
                    )
                )
            )
            .scalars()
            .all()
        )
    }
    for it in items:
        row = existing.get((master_id, it["type"]))
        if row is None:
            session.add(
                KnowledgeBaseItem(master_id=master_id, **it)
            )
        else:
            row.title = it["title"]
            row.content = it["content"]
            row.geolocation_lat = it["geolocation_lat"]
            row.geolocation_lng = it["geolocation_lng"]
            row.yandex_maps_url = it["yandex_maps_url"]
            row.position = it["position"]


async def upsert_test_bookings(
    session, master: Master, services: dict[str, Service]
) -> None:
    """Create a couple of past + future bookings so the digest has
    something to render and the «return campaign» logic has a base."""
    import zoneinfo

    tz = zoneinfo.ZoneInfo(master.timezone)

    cl = (
        await session.execute(
            select(Client).where(
                Client.master_id == master.id, Client.name == "Лена"
            )
        )
    ).scalar_one_or_none()
    if cl is None:
        cl = Client(
            master_id=master.id,
            telegram_id=999000111,
            name="Лена",
            phone="+79991112233",
            first_seen_at=datetime.now(UTC) - timedelta(days=80),
        )
        session.add(cl)
        await session.flush()

    today_local = datetime.now(tz).date()

    # 1. A booking 70 days ago (status=DONE) — eligible for return-campaign
    past_date = today_local - timedelta(days=70)
    past_starts = datetime.combine(past_date, time(11), tzinfo=tz).astimezone(UTC)
    past_ends = past_starts + timedelta(minutes=60)
    if not (
        await session.execute(
            select(Booking).where(
                Booking.master_id == master.id,
                Booking.client_id == cl.id,
                Booking.starts_at == past_starts,
            )
        )
    ).scalar_one_or_none():
        session.add(
            Booking(
                master_id=master.id,
                client_id=cl.id,
                service_id=services["Маникюр"].id,
                starts_at=past_starts,
                ends_at=past_ends,
                status=BookingStatus.DONE,
                price=services["Маникюр"].price,
                source="manual",
                addon_ids=[],
            )
        )

    # 2. A booking for today at 16:00 local — so the morning digest has
    # at least one row to render when you trigger it manually.
    today_starts = datetime.combine(today_local, time(16), tzinfo=tz).astimezone(UTC)
    today_ends = today_starts + timedelta(minutes=60)
    if today_starts > datetime.now(UTC) and not (
        await session.execute(
            select(Booking).where(
                Booking.master_id == master.id,
                Booking.client_id == cl.id,
                Booking.starts_at == today_starts,
            )
        )
    ).scalar_one_or_none():
        session.add(
            Booking(
                master_id=master.id,
                client_id=cl.id,
                service_id=services["Маникюр"].id,
                starts_at=today_starts,
                ends_at=today_ends,
                status=BookingStatus.SCHEDULED,
                price=services["Маникюр"].price,
                source="manual",
                addon_ids=[],
            )
        )


async def main() -> None:
    tg = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MASTER_TG

    async with session_factory() as session:
        master = await upsert_master(session, telegram_id=tg)
        await upsert_bot_settings(session, master.id)
        await upsert_schedule(session, master.id)
        services = await upsert_services(session, master.id)
        await upsert_kb(session, master.id)
        await upsert_test_bookings(session, master, services)
        await session.commit()

    print(f"OK — master_id={master.id} telegram_id={master.telegram_id}")
    print(f"  name='{master.name}' niche='{master.niche}' tz={master.timezone}")
    print(f"  trial_ends_at={master.trial_ends_at:%Y-%m-%d} bot_enabled={master.bot_enabled}")
    print(f"  services: {', '.join(services.keys())}")
    print()
    print("NEXT: enable @beauty_dev_bot in Telegram → Business → Chatbots,")
    print("then write to this account from another Telegram user.")


if __name__ == "__main__":
    asyncio.run(main())
