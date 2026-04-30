"""Thin async wrapper around YooKassa REST API.

We use httpx directly rather than the official sync `yookassa` package so the
event loop isn't blocked. Only what we need:
  - create_payment(amount, description, return_url, metadata) → (id, confirmation_url)
  - get_payment(payment_id) → dict

Webhook signature verification is done at the endpoint level: YooKassa's
production guidance is to validate by source IP and re-fetching the payment
by id from the API rather than trusting the body. We do the latter when
YOOKASSA_SECRET_KEY is configured.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from uuid import uuid4

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

API_BASE = "https://api.yookassa.ru/v3"


class YooKassaError(Exception):
    pass


@dataclass(slots=True)
class PaymentCreated:
    id: str
    confirmation_url: str | None
    status: str


def _is_configured() -> bool:
    return bool(settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY)


def _client_kwargs(*, timeout: float, auth) -> dict:
    kwargs: dict = {"timeout": timeout, "auth": auth}
    if settings.HTTP_PROXY_URL:
        kwargs["proxy"] = settings.HTTP_PROXY_URL
    return kwargs


async def create_payment(
    *,
    amount_rub: Decimal,
    description: str,
    return_url: str,
    metadata: dict[str, str] | None = None,
    save_payment_method: bool = True,
    client: httpx.AsyncClient | None = None,
) -> PaymentCreated:
    if not _is_configured():
        raise YooKassaError("YooKassa is not configured")

    payload = {
        "amount": {"value": f"{amount_rub:.2f}", "currency": "RUB"},
        "capture": True,
        "description": description,
        "save_payment_method": save_payment_method,
        "confirmation": {"type": "redirect", "return_url": return_url},
        "metadata": metadata or {},
    }
    headers = {
        "Idempotence-Key": uuid4().hex,
        "Content-Type": "application/json",
    }
    auth = (settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)

    own = client is None
    cli = client or httpx.AsyncClient(**_client_kwargs(timeout=20.0, auth=auth))
    try:
        resp = await cli.post(f"{API_BASE}/payments", json=payload, headers=headers)
        if resp.status_code >= 400:
            log.warning("yookassa create_payment %s: %s", resp.status_code, resp.text)
            raise YooKassaError(f"yookassa rejected: {resp.status_code}")
        data = resp.json()
    finally:
        if own:
            await cli.aclose()

    return PaymentCreated(
        id=str(data["id"]),
        confirmation_url=(data.get("confirmation") or {}).get("confirmation_url"),
        status=str(data.get("status") or "pending"),
    )


async def fetch_payment(payment_id: str, client: httpx.AsyncClient | None = None) -> dict:
    if not _is_configured():
        raise YooKassaError("YooKassa is not configured")
    own = client is None
    cli = client or httpx.AsyncClient(
        **_client_kwargs(
            timeout=15.0,
            auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
        )
    )
    try:
        resp = await cli.get(f"{API_BASE}/payments/{payment_id}")
        if resp.status_code >= 400:
            raise YooKassaError(f"yookassa fetch failed: {resp.status_code}")
        return resp.json()
    finally:
        if own:
            await cli.aclose()
