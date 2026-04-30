"""APScheduler — runs reminder dispatch and other periodic jobs."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.db import session_factory
from app.services.billing import expire_lapsed_subscriptions
from app.services.insights import generate_for_master
from app.services.reminders import deliver_due_reminders
from app.services.segments import recompute_all as recompute_segments_all
from app.workers.return_campaigns import (
    expire_due_campaigns,
    send_due_return_invitations,
)
from app.workers.service_reminders import send_due_service_reminders

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _send_via_bot(
    *, client_telegram_id: int, business_connection_id: str | None, text: str
) -> None:
    from app.bot import get_bot

    bot = get_bot()
    kwargs: dict = {"chat_id": client_telegram_id, "text": text}
    if business_connection_id:
        kwargs["business_connection_id"] = business_connection_id
    await bot.send_message(**kwargs)


async def reminders_tick() -> None:
    async with session_factory() as session:
        try:
            n = await deliver_due_reminders(session, sender=_send_via_bot)
            await session.commit()
            if n:
                log.info("reminders dispatched: %s", n)
        except Exception:
            log.exception("reminders_tick failed")
            await session.rollback()


async def expire_subscriptions_tick() -> None:
    async with session_factory() as session:
        try:
            n = await expire_lapsed_subscriptions(session)
            await session.commit()
            if n:
                log.info("subscriptions expired: %s", n)
        except Exception:
            log.exception("expire_subscriptions_tick failed")
            await session.rollback()


async def segments_tick() -> None:
    async with session_factory() as session:
        try:
            n = await recompute_segments_all(session)
            await session.commit()
            log.info("segments recomputed: %s", n)
        except Exception:
            log.exception("segments_tick failed")
            await session.rollback()


async def return_invitations_tick() -> None:
    async with session_factory() as session:
        try:
            n = await send_due_return_invitations(session, sender=_send_via_bot)
            await session.commit()
            if n:
                log.info("return invitations dispatched: %s", n)
        except Exception:
            log.exception("return_invitations_tick failed")
            await session.rollback()


async def service_reminders_tick() -> None:
    async with session_factory() as session:
        try:
            n = await send_due_service_reminders(session, sender=_send_via_bot)
            await session.commit()
            if n:
                log.info("service reminders dispatched: %s", n)
        except Exception:
            log.exception("service_reminders_tick failed")
            await session.rollback()


async def expire_return_campaigns_tick() -> None:
    async with session_factory() as session:
        try:
            n = await expire_due_campaigns(session)
            await session.commit()
            if n:
                log.info("return campaigns expired: %s", n)
        except Exception:
            log.exception("expire_return_campaigns_tick failed")
            await session.rollback()


async def insights_tick() -> None:
    from app.llm.factory import _provider, get_llm
    from app.models import Master

    try:
        llm = get_llm() if _provider is not None else None
    except Exception:
        llm = None

    async with session_factory() as session:
        try:
            masters = (await session.execute(select(Master))).scalars().all()
            for m in masters:
                await generate_for_master(session, master=m, llm=llm)
            await session.commit()
            log.info("insights generated for %s masters", len(masters))
        except Exception:
            log.exception("insights_tick failed")
            await session.rollback()


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    sched = AsyncIOScheduler(timezone="UTC")
    sched.add_job(reminders_tick, "interval", minutes=1, id="reminders_tick", max_instances=1)
    sched.add_job(
        expire_subscriptions_tick,
        "cron",
        hour=3,
        minute=0,
        id="expire_subscriptions",
        max_instances=1,
    )
    sched.add_job(
        segments_tick,
        "cron",
        hour=3,
        minute=15,
        id="segments_tick",
        max_instances=1,
    )
    sched.add_job(
        insights_tick,
        "cron",
        day_of_week="mon",
        hour=4,
        minute=0,
        id="insights_tick",
        max_instances=1,
    )
    # Hourly hour-aligned tick — each worker filters by master.timezone == 11:00.
    sched.add_job(
        return_invitations_tick,
        "cron",
        minute=0,
        id="return_invitations_tick",
        max_instances=1,
    )
    sched.add_job(
        service_reminders_tick,
        "cron",
        minute=0,
        id="service_reminders_tick",
        max_instances=1,
    )
    sched.add_job(
        expire_return_campaigns_tick,
        "cron",
        minute=15,
        id="expire_return_campaigns_tick",
        max_instances=1,
    )
    sched.start()
    _scheduler = sched
    log.info("APScheduler started")
    return sched


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
