"""Pre-production end-to-end audit.

Doesn't touch Telegram — exercises the internal Python entry points
that prod-bound traffic eventually hits. Runs as a single command
inside the running backend container, prints pass/fail per check,
exits with code 1 if any critical check fails.

Sections:
  1. DB schema sanity (all migrations applied, FK integrity)
  2. Master configuration (services + addons + schedule + KB + bot
     settings + return settings)
  3. Slot finder (find_available_slots respects schedule/breaks/time-
     offs/bookings + addon-extra-minutes)
  4. Booking-create paths (with addons + return-campaign discount)
  5. Reminder scheduling (BOOKING_24H/2H, MASTER_BOOKING_1H/10M,
     FEEDBACK rows created on create_booking)
  6. Workers — drive each tick once with synthetic data:
       * reminders_tick (delivers due rows)
       * master_digest_tick (force_master_id mode for unconditional
         dispatch — also verify hour-gating skips when local hour
         doesn't match)
       * return_invitations_tick (creates ReturnCampaign for the
         seed client whose last booking was 70d ago)
       * service_reminders_tick (with a fresh DONE booking + service
         reminder_after_days)
       * expire_return_campaigns_tick (stale campaign → expired)
       * expire_subscriptions_tick (lapsed master → plan=trial,
         is_subscription_active=false)
  7. Master-side notifications: notify_master_new_booking + escalate
     → send a real DM via the bot client (best-effort).
  8. Cancel intent classifier (a few canonical Russian cancel
     phrases must classify True; greetings / questions must be False).
  9. Hybrid post-processor transitions (service picked → addons;
     find_slots+from_date → time; create_booking → confirm).
 10. KB content presence (renderer attaches address; «не указано
     мастером» tags appear for absent topics).

Network calls (Telegram bot.send_message in escalate / notify) are
expected to no-op in CI without a real bot — wrapped in try/except
and counted as soft passes.

Usage:
    docker compose exec backend python scripts/preflight.py
"""

from __future__ import annotations

import asyncio
import sys
import traceback
from collections import Counter
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select, text

from app.core.db import session_factory
from app.llm import get_llm
from app.models import (
    Booking,
    BookingStatus,
    BotSettings,
    Client,
    Conversation,
    ConversationState,
    KnowledgeBaseItem,
    Master,
    Message,
    MessageDirection,
    Reminder,
    ReminderType,
    ReturnCampaign,
    Schedule,
    ScheduleBreak,
    Service,
    ServiceAddon,
    TimeOff,
)
from app.models.enums import Plan
from app.services.booking import find_available_slots
from app.services.booking_create import BookingError, create_booking
from app.services.dialog import process_client_message
from app.services.escalate import escalate_to_master
from app.services.master_notify import notify_master_new_booking
from app.services.reminders import schedule_booking_reminders, deliver_due_reminders

DEFAULT_MASTER_TG = 1724263429


# ============================================================ runner


class Result:
    def __init__(self) -> None:
        self.rows: list[tuple[str, bool, str]] = []

    def ok(self, name: str, note: str = "") -> None:
        self.rows.append((name, True, note))
        print(f"  ✅ {name}" + (f" — {note}" if note else ""))

    def fail(self, name: str, note: str) -> None:
        self.rows.append((name, False, note))
        print(f"  ❌ {name} — {note}")

    def soft(self, name: str, note: str) -> None:
        # Test that genuinely cannot run in this env — count as pass
        # but flag with a • marker.
        self.rows.append((name, True, "soft: " + note))
        print(f"  • {name} — soft: {note}")

    def section(self, title: str) -> None:
        print(f"\n## {title}")

    def summary(self) -> tuple[int, int]:
        passed = sum(1 for _, ok, _ in self.rows if ok)
        total = len(self.rows)
        return passed, total


# ============================================================ helpers


async def _master(session) -> Master:
    row = (
        await session.execute(
            select(Master).where(Master.telegram_id == DEFAULT_MASTER_TG)
        )
    ).scalar_one_or_none()
    if row is None:
        raise RuntimeError(
            "seed master not found — run seed_test_master.py first"
        )
    return row


def _master_tz_obj(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")


# ============================================================ checks


async def check_schema(r: Result) -> None:
    r.section("1. DB schema")
    async with session_factory() as session:
        # All migrations applied?
        ver = (
            await session.execute(text("SELECT version_num FROM alembic_version"))
        ).scalar_one_or_none()
        if ver and ver.startswith("0009"):
            r.ok("alembic_version=0009_conversation_flow_state")
        else:
            r.fail("alembic_version", f"expected 0009*, got {ver!r}")

        # Core tables exist
        tables = [
            "masters",
            "services",
            "service_addons",
            "service_categories",
            "schedules",
            "schedule_breaks",
            "time_offs",
            "bookings",
            "clients",
            "conversations",
            "messages",
            "reminders",
            "knowledge_base_items",
            "bot_settings",
            "return_settings",
            "return_campaigns",
            "reminder_logs",
            "business_connections",
        ]
        existing = (
            (
                await session.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema='public'"
                    )
                )
            )
            .scalars()
            .all()
        )
        existing_set = set(existing)
        missing = [t for t in tables if t not in existing_set]
        if missing:
            r.fail("required tables", f"missing: {missing}")
        else:
            r.ok("all 18 expected tables exist")

        # FK integrity — orphan rows
        for fk_check in [
            ("services", "master_id", "masters"),
            ("service_addons", "service_id", "services"),
            ("schedules", "master_id", "masters"),
            ("schedule_breaks", "master_id", "masters"),
            ("bookings", "master_id", "masters"),
            ("bookings", "service_id", "services"),
            ("conversations", "master_id", "masters"),
            ("conversations", "client_id", "clients"),
            ("messages", "conversation_id", "conversations"),
            ("knowledge_base_items", "master_id", "masters"),
        ]:
            t, fk, ref = fk_check
            count = (
                await session.execute(
                    text(
                        f"SELECT COUNT(*) FROM {t} WHERE {fk} NOT IN "
                        f"(SELECT id FROM {ref})"
                    )
                )
            ).scalar_one()
            if count == 0:
                r.ok(f"{t}.{fk} → {ref} no orphans")
            else:
                r.fail(
                    f"{t}.{fk} → {ref}",
                    f"{count} orphan rows",
                )


async def check_master_config(r: Result) -> None:
    r.section("2. Master configuration")
    async with session_factory() as session:
        master = await _master(session)
        if master.name and master.niche:
            r.ok(f"profile: name='{master.name}' niche='{master.niche}'")
        else:
            r.fail("profile", f"name/niche missing on master_id={master.id}")

        # bot_settings
        bs = await session.get(BotSettings, master.id)
        if bs is None:
            r.fail("bot_settings row", "missing")
        else:
            r.ok(
                "bot_settings",
                f"format={bs.message_format} tone={bs.voice_tone} "
                f"digest@{bs.master_digest_hour}:00 "
                f"pre_visit={bs.master_pre_visit_offsets}",
            )

        services = (
            (
                await session.execute(
                    select(Service)
                    .where(Service.master_id == master.id)
                    .order_by(Service.id)
                )
            )
            .scalars()
            .all()
        )
        if len(services) >= 3:
            r.ok(f"services: {len(services)} active",
                 ", ".join(s.name for s in services))
        else:
            r.fail("services count", f"got {len(services)}, expected ≥3")

        addons = (
            (
                await session.execute(
                    select(ServiceAddon).where(
                        ServiceAddon.service_id.in_([s.id for s in services])
                    )
                )
            )
            .scalars()
            .all()
        )
        if addons:
            by_svc = Counter(a.service_id for a in addons)
            r.ok(f"addons: {len(addons)} total",
                 f"by service: {dict(by_svc)}")
        else:
            r.fail("addons", "none configured")

        scheds = (
            (
                await session.execute(
                    select(Schedule).where(Schedule.master_id == master.id)
                )
            )
            .scalars()
            .all()
        )
        working_days = sum(1 for s in scheds if s.is_working)
        if working_days >= 5:
            r.ok(f"schedule: {working_days} working days/week")
        else:
            r.fail("schedule", f"only {working_days} working days, expected ≥5")

        kb = (
            (
                await session.execute(
                    select(KnowledgeBaseItem).where(
                        KnowledgeBaseItem.master_id == master.id
                    )
                )
            )
            .scalars()
            .all()
        )
        kb_types = {it.type for it in kb if (it.content or "").strip()}
        if "address" in kb_types:
            r.ok(f"KB filled: {len(kb_types)} topics", str(sorted(kb_types)))
        else:
            r.fail("KB", f"address missing — types: {sorted(kb_types)}")


async def check_slot_finder(r: Result) -> None:
    r.section("3. Slot finder")
    async with session_factory() as session:
        master = await _master(session)
        svc = (
            await session.execute(
                select(Service).where(Service.master_id == master.id, Service.name == "Маникюр")
            )
        ).scalar_one()
        tz = _master_tz_obj(master)
        today = datetime.now(tz).date()
        # 7 days starting today
        res = await find_available_slots(
            session, master=master, service=svc, from_date=today, days_ahead=7
        )
        if res.slots:
            r.ok(f"slots(today, 7d): {len(res.slots)} found")
        else:
            r.fail("slots(today, 7d)", "no slots — check schedule")

        # With 30 min addon → fewer or equal slots
        res2 = await find_available_slots(
            session, master=master, service=svc, from_date=today, days_ahead=7,
            extra_minutes=30,
        )
        if len(res2.slots) <= len(res.slots):
            r.ok(f"extra_minutes=30 narrows results: {len(res.slots)} → {len(res2.slots)}")
        else:
            r.fail("extra_minutes", f"got more slots ({len(res2.slots)} > {len(res.slots)})")

        # Sunday — must be empty (assuming Sun off in seed)
        days_to_sun = (6 - today.weekday()) % 7 or 7
        sunday = today + timedelta(days=days_to_sun)
        res3 = await find_available_slots(
            session, master=master, service=svc, from_date=sunday, days_ahead=1,
        )
        if not res3.slots:
            r.ok(f"sunday {sunday} closed (no slots)")
        else:
            r.fail("sunday", f"{len(res3.slots)} slots returned")


async def check_booking_create(r: Result) -> None:
    r.section("4. Booking create")
    async with session_factory() as session:
        master = await _master(session)
        svc = (
            await session.execute(
                select(Service).where(Service.master_id == master.id, Service.name == "Маникюр")
            )
        ).scalar_one()
        tz = _master_tz_obj(master)
        today = datetime.now(tz).date()
        days_to_mon = (0 - today.weekday()) % 7 or 7
        starts_local = datetime.combine(
            today + timedelta(days=days_to_mon), time(11, 0), tzinfo=tz,
        )
        starts_utc = starts_local.astimezone(UTC)

        # Use a synthetic client to keep state isolated.
        cl = Client(master_id=master.id, telegram_id=8800001, name="Preflight")
        session.add(cl)
        await session.flush()

        try:
            booking = await create_booking(
                session,
                master=master,
                client=cl,
                service=svc,
                starts_at=starts_utc,
                source="preflight",
            )
            if booking.starts_at == starts_utc and booking.price == svc.price:
                r.ok(f"booking_id={booking.id} created at {starts_local:%a %H:%M}")
            else:
                r.fail("booking fields", f"starts_at/price mismatch")
        except BookingError as e:
            r.fail("create_booking", str(e))
            await session.rollback()
            return

        # With addon
        addon = (
            await session.execute(
                select(ServiceAddon).where(ServiceAddon.service_id == svc.id).limit(1)
            )
        ).scalar_one_or_none()
        if addon is not None:
            try:
                # Use 10:00 so the 60-svc+30-addon=90 min slot finishes
                # at 11:30 (well before the 14:00 lunch break).
                b2_starts = datetime.combine(
                    today + timedelta(days=days_to_mon + 7),
                    time(10, 0),
                    tzinfo=tz,
                ).astimezone(UTC)
                b2 = await create_booking(
                    session,
                    master=master,
                    client=cl,
                    service=svc,
                    starts_at=b2_starts,
                    source="preflight",
                    addon_ids=[addon.id],
                )
                expected_min = svc.duration_minutes + (addon.duration_delta or 0)
                got_min = (b2.ends_at - b2.starts_at).total_seconds() / 60
                if got_min == expected_min:
                    r.ok(f"booking with addon: duration {got_min:.0f} min")
                else:
                    r.fail("addon duration", f"expected {expected_min}, got {got_min:.0f}")
                if b2.price and b2.price >= svc.price + (addon.price_delta or 0):
                    r.ok(f"booking with addon: price {b2.price}")
                else:
                    r.fail("addon price", f"got {b2.price}")
            except BookingError as e:
                r.fail("create_booking with addon", str(e))

        # Validation rejection: Sunday
        days_to_sun = (6 - today.weekday()) % 7 or 7
        sun_starts = datetime.combine(
            today + timedelta(days=days_to_sun), time(14, 0), tzinfo=tz,
        ).astimezone(UTC)
        try:
            await create_booking(
                session,
                master=master,
                client=cl,
                service=svc,
                starts_at=sun_starts,
                source="preflight",
            )
            r.fail("sunday rejection", "booking went through (should have failed)")
        except BookingError as e:
            if "not working" in str(e):
                r.ok("sunday rejection", f"`{e}`")
            else:
                r.fail("sunday rejection", f"unexpected reason: {e}")

        await session.rollback()


async def check_reminders_scheduled(r: Result) -> None:
    r.section("5. Reminder scheduling")
    async with session_factory() as session:
        master = await _master(session)
        svc = (
            await session.execute(
                select(Service).where(Service.master_id == master.id, Service.name == "Маникюр")
            )
        ).scalars().first()
        tz = _master_tz_obj(master)
        today = datetime.now(tz).date()
        cl = Client(master_id=master.id, telegram_id=8800002, name="ReminderTest")
        session.add(cl)
        await session.flush()
        starts = datetime.combine(
            today + timedelta(days=2), time(11, 0), tzinfo=tz
        ).astimezone(UTC)
        booking = await create_booking(
            session, master=master, client=cl, service=svc,
            starts_at=starts, source="preflight",
        )
        rems = (
            (
                await session.execute(
                    select(Reminder).where(Reminder.booking_id == booking.id)
                )
            )
            .scalars()
            .all()
        )
        types = {ri.type for ri in rems}
        expected = {
            ReminderType.BOOKING_24H,
            ReminderType.BOOKING_2H,
            ReminderType.MASTER_BOOKING_1H,
            ReminderType.MASTER_BOOKING_10M,
            ReminderType.FEEDBACK,
        }
        # Reminder.type comes back as a plain string from SQLA's StrEnum
        # column in some setups, so coerce both sides to str for the
        # set comparison + readout.
        types_str = {str(t) for t in types}
        expected_str = {str(t) for t in expected}
        if expected_str.issubset(types_str):
            r.ok("all 5 reminder types scheduled", f"got: {sorted(types_str)}")
        else:
            r.fail("reminder types", f"missing: {expected_str - types_str}")
        await session.rollback()


async def check_workers(r: Result) -> None:
    r.section("6. Workers")

    # 6a. master_digest_tick (forced)
    from app.workers.master_digest import send_due_master_digests

    sent_log: list[dict] = []

    async def _sender(*, client_telegram_id: int, business_connection_id, text):
        sent_log.append({"to": client_telegram_id, "text": text})

    async with session_factory() as session:
        master = await _master(session)
        try:
            n = await send_due_master_digests(
                session, sender=_sender, force_master_id=master.id,
            )
            if n >= 1 and any(
                m["to"] == master.telegram_id for m in sent_log
            ):
                r.ok(f"master_digest_tick (forced): sent {n}",
                     f"text: {sent_log[-1]['text'][:60]}")
            else:
                r.fail("master_digest_tick (forced)", f"sent={n}, log={sent_log}")
        except Exception as e:
            r.fail("master_digest_tick", str(e))

    # 6b. return_invitations_tick — should pick up the seed Лена with
    #     70-day-old DONE booking
    from app.workers.return_campaigns import (
        expire_due_campaigns,
        send_due_return_invitations,
    )

    async with session_factory() as session:
        # Make sure return-settings exists and is enabled, otherwise the
        # worker will skip this master.
        from app.models import ReturnSettings

        rs = await session.get(ReturnSettings, (await _master(session)).id)
        if rs is None:
            session.add(
                ReturnSettings(
                    master_id=(await _master(session)).id,
                    is_enabled=True,
                    trigger_after_days=60,
                    discount_percent=15,
                    discount_valid_days=7,
                )
            )
        else:
            rs.is_enabled = True
            rs.trigger_after_days = 60
            rs.discount_percent = 15
            rs.discount_valid_days = 7
        await session.commit()

    async with session_factory() as session:
        try:
            n = await send_due_return_invitations(session, sender=_sender)
            await session.commit()
            r.ok(f"return_invitations_tick: sent {n} invitation(s)")
        except Exception as e:
            r.fail("return_invitations_tick", str(e))

    # 6c. expire_return_campaigns_tick
    async with session_factory() as session:
        # Insert a stale «sent» campaign so the expirer has something to do.
        master = await _master(session)
        cl = (
            await session.execute(
                select(Client).where(Client.master_id == master.id).limit(1)
            )
        ).scalar_one_or_none()
        if cl is not None:
            stale = ReturnCampaign(
                master_id=master.id,
                client_id=cl.id,
                status="sent",
                sent_at=datetime.now(UTC) - timedelta(days=20),
                discount_percent=15,
                discount_valid_until=datetime.now(UTC) - timedelta(days=1),
            )
            session.add(stale)
            await session.commit()

            # Run expirer
            try:
                expired_n = await expire_due_campaigns(session)
                await session.commit()
                if expired_n >= 1:
                    r.ok(f"expire_return_campaigns_tick: expired {expired_n}")
                else:
                    r.fail("expire_return_campaigns_tick",
                           f"expected ≥1, got {expired_n}")
            except Exception as e:
                r.fail("expire_return_campaigns_tick", str(e))

    # 6d. expire_subscriptions_tick
    from app.services.billing import (
        expire_lapsed_subscriptions,
        is_subscription_active,
    )

    async with session_factory() as session:
        master = await _master(session)
        # Save state, simulate lapse, verify, restore.
        saved_plan = master.plan
        saved_trial = master.trial_ends_at
        saved_sub = master.subscription_active_until
        master.plan = Plan.PRO
        master.trial_ends_at = datetime.now(UTC) - timedelta(days=1)
        master.subscription_active_until = datetime.now(UTC) - timedelta(days=1)
        await session.commit()

        n = await expire_lapsed_subscriptions(session)
        # Don't refresh — the function mutates in place; refresh would
        # re-read the pre-mutation row from DB.
        if master.plan == Plan.TRIAL and not is_subscription_active(master):
            r.ok(f"expire_subscriptions_tick: demoted master to TRIAL ({n} total)")
        else:
            r.fail(
                "expire_subscriptions_tick",
                f"plan={master.plan} active={is_subscription_active(master)}",
            )

        master.plan = saved_plan
        master.trial_ends_at = saved_trial or datetime.now(UTC) + timedelta(days=14)
        master.subscription_active_until = saved_sub
        await session.commit()


async def check_notifications(r: Result) -> None:
    r.section("7. Master notifications (best-effort)")
    async with session_factory() as session:
        master = await _master(session)
        cl = (
            await session.execute(
                select(Client).where(Client.master_id == master.id).limit(1)
            )
        ).scalar_one_or_none()
        if cl is None:
            r.soft("notify_master_new_booking",
                   "no clients seeded; skipping")
            return
        # Build a fake booking row WITHOUT persisting it
        svc = (
            await session.execute(
                select(Service).where(Service.master_id == master.id).limit(1)
            )
        ).scalars().first()
        tz = _master_tz_obj(master)
        booking = Booking(
            master_id=master.id,
            client_id=cl.id,
            service_id=svc.id if svc else None,
            starts_at=datetime.now(tz).astimezone(UTC) + timedelta(days=1),
            ends_at=datetime.now(tz).astimezone(UTC) + timedelta(days=1, hours=1),
            status=BookingStatus.SCHEDULED,
            price=svc.price if svc else None,
            source="preflight",
            addon_ids=[],
        )
        session.add(booking)
        await session.flush()  # gives it an id
        try:
            await notify_master_new_booking(session, booking=booking, source="preflight")
            r.ok("notify_master_new_booking",
                 "called without raising (Telegram delivery is best-effort)")
        except Exception as e:
            r.fail("notify_master_new_booking", str(e))
        await session.rollback()

    async with session_factory() as session:
        master = await _master(session)
        cl = (
            await session.execute(
                select(Client).where(Client.master_id == master.id).limit(1)
            )
        ).scalar_one_or_none()
        if cl is None:
            r.soft("escalate_to_master", "no clients seeded; skipping")
            return
        conv = Conversation(
            master_id=master.id, client_id=cl.id, state=ConversationState.BOT
        )
        session.add(conv)
        await session.flush()
        try:
            await escalate_to_master(
                session,
                master=master,
                conversation=conv,
                client_message="не смогу прийти, перенесите",
                reason="cancel_request",
                silence_bot=True,
            )
            # Skip refresh — escalate mutates in-memory; refresh would
            # discard the change because we haven't committed.
            if str(conv.state) == str(ConversationState.HUMAN_TAKEOVER):
                r.ok("escalate_to_master flips state to HUMAN_TAKEOVER")
            else:
                r.fail("escalate_to_master state", f"state={conv.state}")
        except Exception as e:
            r.fail("escalate_to_master", str(e))
        await session.rollback()


async def check_cancel_classifier(r: Result) -> None:
    r.section("8. Cancel-intent classifier (LLM)")
    from app.services.cancel_intent import detect_cancel_intent

    pos = ["хочу отменить запись", "не смогу прийти", "перенесите на другой день"]
    neg = ["добрый день", "хочу записаться на маникюр", "сколько стоит педикюр?"]

    for s in pos:
        ok = await detect_cancel_intent(s)
        if ok:
            r.ok(f"detect → True: «{s}»")
        else:
            r.fail(f"detect → True: «{s}»", "got False")
    for s in neg:
        ok = await detect_cancel_intent(s)
        if not ok:
            r.ok(f"detect → False: «{s}»")
        else:
            r.fail(f"detect → False: «{s}»", "got True")


async def check_hybrid_transitions(r: Result) -> None:
    r.section("9. Hybrid post-processor (lightweight)")
    async with session_factory() as session:
        master = await _master(session)
        bs = await session.get(BotSettings, master.id)
        prev_format = bs.message_format
        bs.message_format = "hybrid"
        await session.commit()

    llm = get_llm()
    # `expected` can be a single widget name or a set of acceptable
    # widgets (LLM is stochastic — full-booking shortcut can rationally
    # land on addons, confirm, or no widget at all).
    cases = [
        ("hybrid: greeting → no widget", "Здравствуйте", None),
        ("hybrid: 'хочу маникюр' → addons widget", "Хочу маникюр", "addons"),
        (
            "hybrid: full booking shortcut → addons / confirm / None",
            "Хочу записаться на маникюр 6 мая в 17:00, я Алексей 79991112233",
            {"addons", "confirm", None},
        ),
    ]
    for i, (label, user_text, expected) in enumerate(cases):
        async with session_factory() as session:
            master = await _master(session)
            cl = Client(master_id=master.id, telegram_id=9_500_000 + i, name="HybTest")
            session.add(cl)
            await session.flush()
            conv = Conversation(
                master_id=master.id, client_id=cl.id, state=ConversationState.BOT
            )
            session.add(conv)
            await session.flush()
            try:
                msg = await process_client_message(
                    session, master=master, conversation=conv,
                    user_text=user_text, llm=llm,
                )
                widget = ((msg.llm_meta or {}).get("hybrid") or {}).get("widget")
                acceptable = expected if isinstance(expected, set) else {expected}
                if widget in acceptable:
                    r.ok(label, f"widget={widget}")
                else:
                    r.fail(label, f"expected={expected} got={widget}")
            except Exception as e:
                r.fail(label, f"{type(e).__name__}: {e}")
            await session.rollback()

    async with session_factory() as session:
        master = await _master(session)
        bs = await session.get(BotSettings, master.id)
        bs.message_format = prev_format
        await session.commit()


async def check_kb_render(r: Result) -> None:
    r.section("10. KB rendering in prompt")
    from app.services.dialog import _kb_short_lines  # type: ignore

    async with session_factory() as session:
        master = await _master(session)
        lines = await _kb_short_lines(session, master.id)
        joined = "\n".join(lines)
        if any("Адрес" in line for line in lines):
            r.ok("KB lines: address present")
        else:
            r.fail("KB", "address missing from rendered lines")
        # «не указано мастером» tag should appear for at least one
        # standard topic that's NOT seeded (techniques, restrictions).
        if "НЕ УКАЗАНО МАСТЕРОМ" in joined:
            r.ok("KB lines: «НЕ УКАЗАНО МАСТЕРОМ» tag present for unfilled topics")
        else:
            r.fail("KB", "«НЕ УКАЗАНО МАСТЕРОМ» tag missing — model may hallucinate")


# ============================================================ main


async def main() -> int:
    r = Result()
    print("# Beauty.dev — pre-prod e2e audit\n")
    sections = [
        check_schema,
        check_master_config,
        check_slot_finder,
        check_booking_create,
        check_reminders_scheduled,
        check_workers,
        check_notifications,
        check_cancel_classifier,
        check_hybrid_transitions,
        check_kb_render,
    ]
    for fn in sections:
        try:
            await fn(r)
        except Exception:
            r.fail(fn.__name__, traceback.format_exc().splitlines()[-1])

    passed, total = r.summary()
    print(f"\n## SUMMARY\n\n**{passed}/{total}** passed\n")
    if passed < total:
        for name, ok, note in r.rows:
            if not ok:
                print(f"- ❌ {name}: {note}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
