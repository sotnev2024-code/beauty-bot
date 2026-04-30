"""Billing read-only stubs. YooKassa wiring lives in Stage 10."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.core.config import settings
from app.models import Payment
from app.models.enums import Plan

router = APIRouter(prefix="/billing", tags=["billing"])


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


@router.get("/plan", response_model=PlanInfo)
async def get_plan(master: CurrentMaster) -> PlanInfo:
    now = datetime.now(UTC)
    is_active = (
        master.subscription_active_until is not None and master.subscription_active_until > now
    ) or (master.trial_ends_at is not None and master.trial_ends_at > now)
    return PlanInfo(
        plan=master.plan,
        trial_ends_at=master.trial_ends_at,
        subscription_active_until=master.subscription_active_until,
        is_active=is_active,
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
