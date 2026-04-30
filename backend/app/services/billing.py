"""Billing logic — checkout, webhook, subscription expiry, ROI.

Subscription model:
- master.plan ∈ {trial, pro, pro_plus}
- master.trial_ends_at — set when the master first signs up
- master.subscription_active_until — extended by successful payments
- A master is "active" iff trial_ends_at > now OR subscription_active_until > now
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    Booking,
    BookingStatus,
    Master,
    Payment,
    PaymentStatus,
    Plan,
)
from app.services.yookassa_client import (
    PaymentCreated,
    YooKassaError,
    create_payment,
    fetch_payment,
)

log = logging.getLogger(__name__)

PLAN_PRICES_MONTHLY: dict[Plan, int] = {
    Plan.PRO: 0,  # filled in get_plan_price
    Plan.PRO_PLUS: 0,
}


def get_plan_price(plan: Plan, *, annual: bool = False) -> Decimal:
    if plan == Plan.PRO:
        monthly = settings.PRO_PRICE_MONTHLY
    elif plan == Plan.PRO_PLUS:
        monthly = settings.PRO_PLUS_PRICE_MONTHLY
    else:
        raise ValueError(f"plan {plan!r} is not purchasable")
    if not annual:
        return Decimal(monthly)
    discount = Decimal(settings.ANNUAL_DISCOUNT_PERCENT) / Decimal(100)
    return (Decimal(monthly) * 12 * (Decimal(1) - discount)).quantize(Decimal("0.01"))


def is_subscription_active(master: Master, *, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    sub_active = bool(master.subscription_active_until and master.subscription_active_until > now)
    trial_active = bool(master.trial_ends_at and master.trial_ends_at > now)
    return sub_active or trial_active


def ensure_trial(master: Master) -> None:
    """Idempotently start a trial on first signup."""
    if master.trial_ends_at is None:
        master.trial_ends_at = datetime.now(UTC) + timedelta(days=settings.TRIAL_DAYS)


# ----------------------------------------------------------------- Checkout


async def start_checkout(
    session: AsyncSession,
    *,
    master: Master,
    plan: Plan,
    annual: bool = False,
) -> tuple[Payment, PaymentCreated]:
    if plan == Plan.TRIAL:
        raise ValueError("trial plans are auto-issued, not purchased")

    amount = get_plan_price(plan, annual=annual)
    period_months = 12 if annual else 1
    description = f"Beauty.dev · {plan.value} · {period_months} мес"

    payment_row = Payment(
        master_id=master.id,
        amount=amount,
        currency="RUB",
        status=PaymentStatus.PENDING,
    )
    session.add(payment_row)
    await session.flush()

    metadata = {
        "master_id": str(master.id),
        "plan": plan.value,
        "annual": "true" if annual else "false",
        "internal_payment_id": str(payment_row.id),
    }
    yk = await create_payment(
        amount_rub=amount,
        description=description,
        return_url=settings.YOOKASSA_RETURN_URL or settings.MINI_APP_URL,
        metadata=metadata,
    )
    payment_row.yookassa_id = yk.id
    await session.flush()
    return payment_row, yk


# ----------------------------------------------------------------- Webhook


async def apply_webhook_event(
    session: AsyncSession,
    *,
    event: dict[str, Any],
) -> Payment | None:
    """Process a YooKassa webhook event, idempotently."""
    et = event.get("event")
    obj = event.get("object") or {}
    payment_id = obj.get("id")
    if not payment_id:
        log.warning("webhook missing payment id: %s", et)
        return None

    # Re-fetch from YooKassa to validate the payload (defense against forgery).
    try:
        verified = await fetch_payment(str(payment_id))
    except YooKassaError as e:
        log.warning("webhook re-fetch failed (using payload): %s", e)
        verified = obj

    payment = (
        await session.execute(select(Payment).where(Payment.yookassa_id == str(payment_id)))
    ).scalar_one_or_none()
    if payment is None:
        # Out-of-band payment — try to map by metadata.
        meta = verified.get("metadata") or {}
        master_id = meta.get("master_id")
        if not master_id:
            log.warning("webhook payment unknown to us: %s", payment_id)
            return None
        payment = Payment(
            master_id=int(master_id),
            yookassa_id=str(payment_id),
            amount=Decimal(str((verified.get("amount") or {}).get("value", "0"))),
            currency=str((verified.get("amount") or {}).get("currency", "RUB")),
            status=PaymentStatus.PENDING,
        )
        session.add(payment)
        await session.flush()

    new_status = _map_status(et, verified.get("status"))
    if new_status is None or new_status == payment.status:
        return payment

    payment.status = new_status

    if new_status == PaymentStatus.SUCCEEDED:
        master = await session.get(Master, payment.master_id)
        if master is not None:
            meta = verified.get("metadata") or {}
            plan_str = meta.get("plan") or master.plan.value
            annual = (meta.get("annual") or "").lower() == "true"
            await _extend_subscription(master, plan=Plan(plan_str), annual=annual, payment=payment)
    return payment


def _map_status(event_name: str | None, body_status: str | None) -> PaymentStatus | None:
    if event_name == "payment.succeeded" or body_status == "succeeded":
        return PaymentStatus.SUCCEEDED
    if event_name == "payment.canceled" or body_status == "canceled":
        return PaymentStatus.CANCELLED
    if event_name == "refund.succeeded" or body_status == "refunded":
        return PaymentStatus.REFUNDED
    return None


async def _extend_subscription(
    master: Master, *, plan: Plan, annual: bool, payment: Payment
) -> None:
    months = 12 if annual else 1
    delta = timedelta(days=30 * months)
    now = datetime.now(UTC)
    base = (
        master.subscription_active_until
        if master.subscription_active_until and master.subscription_active_until > now
        else now
    )
    master.subscription_active_until = base + delta
    master.plan = plan
    payment.period_start = base
    payment.period_end = master.subscription_active_until


# ----------------------------------------------------------------- Expiry tick


async def expire_lapsed_subscriptions(session: AsyncSession) -> int:
    """Demote masters whose subscription_active_until and trial both lapsed."""
    now = datetime.now(UTC)
    rows = (await session.execute(select(Master).where(Master.plan != Plan.TRIAL))).scalars().all()
    demoted = 0
    for m in rows:
        if (m.subscription_active_until is None or m.subscription_active_until <= now) and (
            m.trial_ends_at is None or m.trial_ends_at <= now
        ):
            m.plan = Plan.TRIAL
            demoted += 1
    return demoted


# ----------------------------------------------------------------- ROI


async def compute_roi(session: AsyncSession, *, master: Master, days: int = 30) -> dict[str, Any]:
    now = datetime.now(UTC)
    win_start = now - timedelta(days=days)
    revenue_q = await session.execute(
        select(Booking).where(
            Booking.master_id == master.id,
            Booking.status == BookingStatus.DONE,
            Booking.starts_at >= win_start,
        )
    )
    revenue = sum(
        (Decimal(b.price) for b in revenue_q.scalars() if b.price is not None),
        start=Decimal("0"),
    )
    monthly_cost = (
        Decimal(settings.PRO_PRICE_MONTHLY)
        if master.plan != Plan.PRO_PLUS
        else Decimal(settings.PRO_PLUS_PRICE_MONTHLY)
    )
    cost = monthly_cost * Decimal(days) / Decimal(30)
    roi_x = (revenue / cost) if cost > 0 else None
    return {
        "period_days": days,
        "revenue": str(revenue),
        "cost": str(cost.quantize(Decimal("0.01"))),
        "roi_x": str(roi_x.quantize(Decimal("0.01"))) if roi_x is not None else None,
    }
