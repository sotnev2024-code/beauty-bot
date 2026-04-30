"""Billing API: plan info, history, ROI, checkout, YooKassa webhook."""

from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.core.config import settings
from app.models import Payment
from app.models.enums import Plan
from app.services.billing import (
    apply_webhook_event,
    compute_roi,
    is_subscription_active,
    start_checkout,
)
from app.services.yookassa_client import YooKassaError

router = APIRouter(prefix="/billing", tags=["billing"])
log = logging.getLogger(__name__)


class PlanInfo(BaseModel):
    plan: Plan
    trial_ends_at: datetime | None
    subscription_active_until: datetime | None
    is_active: bool
    pro_price_monthly: int
    pro_plus_price_monthly: int
    annual_discount_percent: int


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Decimal
    currency: str
    status: str
    period_start: datetime | None
    period_end: datetime | None
    created_at: datetime


class CheckoutRequest(BaseModel):
    plan: Plan = Field(description="pro | pro_plus")
    annual: bool = False


class CheckoutResponse(BaseModel):
    payment_id: int
    yookassa_id: str
    confirmation_url: str | None
    amount: Decimal


class RoiResponse(BaseModel):
    period_days: int
    revenue: Decimal
    cost: Decimal
    roi_x: Decimal | None


@router.get("/plan", response_model=PlanInfo)
async def get_plan(master: CurrentMaster) -> PlanInfo:
    return PlanInfo(
        plan=master.plan,
        trial_ends_at=master.trial_ends_at,
        subscription_active_until=master.subscription_active_until,
        is_active=is_subscription_active(master),
        pro_price_monthly=settings.PRO_PRICE_MONTHLY,
        pro_plus_price_monthly=settings.PRO_PLUS_PRICE_MONTHLY,
        annual_discount_percent=settings.ANNUAL_DISCOUNT_PERCENT,
    )


@router.get("/history", response_model=list[PaymentRead])
async def history(master: CurrentMaster, session: SessionDep) -> list[PaymentRead]:
    rows = (
        (
            await session.execute(
                select(Payment).where(Payment.master_id == master.id).order_by(Payment.id.desc())
            )
        )
        .scalars()
        .all()
    )
    return [PaymentRead.model_validate(p) for p in rows]


@router.get("/roi", response_model=RoiResponse)
async def roi(master: CurrentMaster, session: SessionDep) -> RoiResponse:
    data = await compute_roi(session, master=master)
    return RoiResponse(
        period_days=int(data["period_days"]),
        revenue=Decimal(data["revenue"]),
        cost=Decimal(data["cost"]),
        roi_x=Decimal(data["roi_x"]) if data["roi_x"] is not None else None,
    )


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutRequest, master: CurrentMaster, session: SessionDep
) -> CheckoutResponse:
    if payload.plan == Plan.TRIAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="trial cannot be purchased",
        )
    try:
        payment, yk = await start_checkout(
            session, master=master, plan=payload.plan, annual=payload.annual
        )
    except YooKassaError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    await session.commit()
    return CheckoutResponse(
        payment_id=payment.id,
        yookassa_id=yk.id,
        confirmation_url=yk.confirmation_url,
        amount=payment.amount,
    )


@router.post("/yookassa-webhook", status_code=status.HTTP_200_OK)
async def yookassa_webhook(request: Request, session: SessionDep) -> dict[str, bool]:
    """No bearer auth — YooKassa pushes from a known IP set; we re-fetch each
    payment from the API inside apply_webhook_event to verify it's real."""
    body = await request.json()
    log.info("yookassa webhook: %s", body.get("event"))
    try:
        await apply_webhook_event(session, event=body)
        await session.commit()
    except Exception:
        log.exception("yookassa webhook handler failed")
        await session.rollback()
        # Still 200 — YooKassa retries indefinitely on non-2xx.
    return {"ok": True}
