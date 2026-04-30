"""APScheduler — runs reminder dispatch and other periodic jobs."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.db import session_factory
from app.services.billing import expire_lapsed_subscriptions
from app.services.reminders import deliver_due_reminders

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
    sched.start()
    _scheduler = sched
    log.info("APScheduler started")
    return sched


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
