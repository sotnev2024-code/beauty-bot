"""Side-channel push to the master via the public bot."""

from __future__ import annotations

import logging
from zoneinfo import ZoneInfo

from app.models import Booking, Client, Master, Service

log = logging.getLogger(__name__)


def format_booking_push(
    *, master: Master, client: Client, service: Service | None, booking: Booking
) -> str:
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    when = booking.starts_at.astimezone(tz).strftime("%d.%m %H:%M")
    name = client.name or f"клиент #{client.telegram_id}"
    svc = f" · {service.name}" if service else ""
    return f"Новая запись: {name}, {when}{svc}."


async def push_master_about_booking(
    *,
    bot,
    master: Master,
    client: Client,
    service: Service | None,
    booking: Booking,
) -> None:
    if master.telegram_id is None:
        return
    text = format_booking_push(master=master, client=client, service=service, booking=booking)
    try:
        await bot.send_message(chat_id=master.telegram_id, text=text)
    except Exception:
        log.exception("failed to push master about booking %s", booking.id)
