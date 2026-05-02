"""Instant master DM when a new booking lands.

Distinct from `MASTER_BOOKING_1H/10M` which fire close to the booking's
start time. This message goes out immediately so the master sees
«🎉 Новая запись» the moment the bot (or Mini App) creates it.

Wrapped in best-effort error handling — a failed Telegram send never
breaks the actual booking creation.
"""

from __future__ import annotations

import logging
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking, Client, Master, Service, ServiceAddon

log = logging.getLogger(__name__)


async def notify_master_new_booking(
    session: AsyncSession,
    *,
    booking: Booking,
    source: str | None = None,
) -> None:
    """Send the master a short DM about the freshly-created booking.

    `source` is a human label («бот» / «вручную») appended to the message
    so the master knows whether the bot did it or they made it themselves.
    """
    try:
        master = await session.get(Master, booking.master_id)
        client = await session.get(Client, booking.client_id) if booking.client_id else None
        service = await session.get(Service, booking.service_id) if booking.service_id else None

        if master is None or master.telegram_id is None:
            return

        try:
            tz = ZoneInfo(master.timezone)
        except Exception:
            tz = ZoneInfo("Europe/Moscow")

        starts_local = booking.starts_at.astimezone(tz)
        weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[starts_local.weekday()]
        when = (
            f"{starts_local.strftime('%H:%M')} "
            f"{weekday_short} {starts_local.strftime('%d.%m')}"
        )

        client_line = (client.name or "клиент") if client else "клиент"
        if client and client.phone:
            client_line += f" · {client.phone}"

        service_line = service.name if service else "услуга"
        if booking.addon_ids:
            addons = (
                (
                    await session.execute(
                        ServiceAddon.__table__.select().where(
                            ServiceAddon.id.in_(booking.addon_ids)
                        )
                    )
                )
                .mappings()
                .all()
            )
            extras = ", ".join(a["name"] for a in addons)
            if extras:
                service_line += f" + {extras}"

        price_line = ""
        if booking.price is not None:
            price_line = f"\n💰 {int(booking.price)} ₽"
            if booking.discount_applied and booking.discount_percent:
                price_line += f" (со скидкой {booking.discount_percent}%)"

        source_line = ""
        if source:
            source_line = f"\n_(через {source})_"

        text = (
            f"🎉 Новая запись\n"
            f"👤 {client_line}\n"
            f"💅 {service_line}, {when}"
            f"{price_line}"
            f"{source_line}"
        )

        from app.bot import get_bot

        bot = get_bot()
        await bot.send_message(chat_id=master.telegram_id, text=text)
    except Exception:
        log.exception(
            "notify_master_new_booking failed for booking_id=%s", booking.id
        )
