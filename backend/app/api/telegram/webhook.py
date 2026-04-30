"""Telegram webhook receiver.

Telegram delivers updates here when the bot is registered with setWebhook.
We verify the secret_token header and feed the raw JSON to aiogram.
"""

from __future__ import annotations

import logging

from aiogram.types import Update
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.bot import get_bot, get_dispatcher
from app.core.config import settings

router = APIRouter(tags=["telegram"])
log = logging.getLogger(__name__)

SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token"


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None, alias=SECRET_HEADER),
) -> dict[str, bool]:
    if (
        settings.TELEGRAM_WEBHOOK_SECRET
        and x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET
    ):
        log.warning("webhook: bad secret token from %s", request.client)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad secret")

    payload = await request.json()
    try:
        update = Update.model_validate(payload, context={"bot": get_bot()})
    except Exception as e:
        log.exception("webhook: failed to parse Update")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid update") from e

    try:
        await get_dispatcher().feed_update(get_bot(), update)
    except Exception:
        # Always 200 back to Telegram so it doesn't queue retries; handler errors
        # are logged and addressed out-of-band.
        log.exception("webhook: handler raised for update_id=%s", update.update_id)
    return {"ok": True}
