"""Daily digest for masters at 10:00 local — list of today's bookings."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, time, timedelta
from typing import Awaitable, Callable
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking, BookingStatus, Client, Master, Service

log = logging.getLogger(__name__)

DIGEST_HOUR_LOCAL = 10

Sender = Callable[..., Awaitable[None]]


async def send_due_master_digests(
    session: AsyncSession,
    *,
    sender: Sender,
    now: datetime | None = None,
    force_master_id: int | None = None,
) -> int:
    """Send each master a list of today's bookings at 10:00 local.

    Idempotent within an hour: the cron tick fires once per hour at minute 0,
    and we only emit when local hour matches DIGEST_HOUR_LOCAL.
    """
    now = now or datetime.now(UTC)

    masters_q = select(Master)
    if force_master_id is not None:
        masters_q = masters_q.where(Master.id == force_master_id)
    masters = (await session.execute(masters_q)).scalars().all()

    sent_total = 0
    for master in masters:
        tz = _tz(master)
        local_now = now.astimezone(tz)
        if force_master_id is None and local_now.hour != DIGEST_HOUR_LOCAL:
            continue

        # Window: today 00:00–24:00 in master's tz.
        day_start_local = datetime.combine(local_now.date(), time(0), tzinfo=tz)
        day_end_local = day_start_local + timedelta(days=1)
        day_start = day_start_local.astimezone(UTC)
        day_end = day_end_local.astimezone(UTC)

        rows = (
            (
                await session.execute(
                    select(Booking)
                    .where(
                        Booking.master_id == master.id,
                        Booking.starts_at >= day_start,
                        Booking.starts_at < day_end,
                        Booking.status.notin_(
                            [BookingStatus.CANCELLED, BookingStatus.NO_SHOW]
                        ),
                    )
                    .order_by(Booking.starts_at)
                )
            )
            .scalars()
            .all()
        )

        text = await _render(session, master=master, bookings=rows, tz=tz)
        try:
            await sender(
                client_telegram_id=master.telegram_id,
                business_connection_id=None,
                text=text,
            )
            sent_total += 1
        except Exception:
            log.exception("master digest send failed master_id=%s", master.id)
    return sent_total


async def _render(
    session: AsyncSession, *, master: Master, bookings: list[Booking], tz: ZoneInfo
) -> str:
    if not bookings:
        return "☀️ Доброе утро! На сегодня записей нет — свободный день."

    lines = ["☀️ Записи на сегодня:"]
    for b in bookings:
        starts = b.starts_at.astimezone(tz).strftime("%H:%M")
        client = await session.get(Client, b.client_id) if b.client_id else None
        client_name = (client.name if client else None) or "клиент"
        svc = await session.get(Service, b.service_id) if b.service_id else None
        svc_name = svc.name if svc else "услуга"
        lines.append(f"• {starts} — {client_name} · {svc_name}")
    return "\n".join(lines)


def _tz(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")
