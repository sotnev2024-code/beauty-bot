"""Stage 10 — billing flow."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import build_test_init_data
from app.models import (
    Booking,
    BookingStatus,
    Client,
    Master,
    Payment,
    Service,
)
from app.models.enums import Plan
from app.services.billing import (
    apply_webhook_event,
    compute_roi,
    ensure_trial,
    expire_lapsed_subscriptions,
    is_subscription_active,
)

pytestmark = pytest.mark.asyncio

TOKEN = "billing-test-token"


@pytest.fixture(autouse=True)
def _override(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)
    monkeypatch.setattr(settings, "TRIAL_DAYS", 14)
    monkeypatch.setattr(settings, "PRO_PRICE_MONTHLY", 900)
    monkeypatch.setattr(settings, "PRO_PLUS_PRICE_MONTHLY", 2400)


def _auth(user_id: int) -> dict[str, str]:
    init = build_test_init_data(TOKEN, user={"id": user_id, "first_name": "M"})
    return {"X-Telegram-Init-Data": init}


# ---------------------------------------------------------- pure logic


async def test_ensure_trial_idempotent() -> None:
    m = Master(telegram_id=1, timezone="UTC")
    ensure_trial(m)
    first = m.trial_ends_at
    assert first is not None
    ensure_trial(m)
    assert m.trial_ends_at == first


async def test_is_subscription_active_trial_window() -> None:
    m = Master(telegram_id=1, timezone="UTC")
    m.trial_ends_at = datetime.now(UTC) + timedelta(days=2)
    assert is_subscription_active(m) is True

    m.trial_ends_at = datetime.now(UTC) - timedelta(days=1)
    assert is_subscription_active(m) is False


# ---------------------------------------------------------- webhook


async def test_apply_webhook_succeeded_extends_subscription(
    test_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    master = Master(telegram_id=42100, timezone="UTC", plan=Plan.TRIAL)
    test_session.add(master)
    await test_session.flush()

    pending = Payment(
        master_id=master.id,
        amount=Decimal("900"),
        currency="RUB",
        status=__import__("app.models", fromlist=["PaymentStatus"]).PaymentStatus.PENDING,
        yookassa_id="yk-test-1",
    )
    test_session.add(pending)
    await test_session.commit()

    # Stub fetch_payment so we don't hit the network.
    async def fake_fetch(payment_id, client=None):
        return {
            "id": payment_id,
            "status": "succeeded",
            "amount": {"value": "900.00", "currency": "RUB"},
            "metadata": {
                "master_id": str(master.id),
                "plan": "pro",
                "annual": "false",
            },
        }

    monkeypatch.setattr("app.services.billing.fetch_payment", fake_fetch)

    event = {"event": "payment.succeeded", "object": {"id": "yk-test-1"}}
    await apply_webhook_event(test_session, event=event)
    await test_session.commit()
    await test_session.refresh(master)
    await test_session.refresh(pending)

    assert master.plan == Plan.PRO
    assert master.subscription_active_until is not None
    assert master.subscription_active_until > datetime.now(UTC) + timedelta(days=20)
    assert str(pending.status) == "succeeded" or pending.status == "succeeded"
    assert pending.period_end == master.subscription_active_until


async def test_apply_webhook_canceled_marks_payment(
    test_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    master = Master(telegram_id=42101, timezone="UTC", plan=Plan.TRIAL)
    test_session.add(master)
    await test_session.flush()
    pending = Payment(
        master_id=master.id,
        amount=Decimal("900"),
        currency="RUB",
        status=__import__("app.models", fromlist=["PaymentStatus"]).PaymentStatus.PENDING,
        yookassa_id="yk-test-2",
    )
    test_session.add(pending)
    await test_session.commit()

    async def fake_fetch(payment_id, client=None):
        return {"id": payment_id, "status": "canceled", "metadata": {}}

    monkeypatch.setattr("app.services.billing.fetch_payment", fake_fetch)

    await apply_webhook_event(
        test_session,
        event={"event": "payment.canceled", "object": {"id": "yk-test-2"}},
    )
    await test_session.commit()
    await test_session.refresh(pending)
    assert str(pending.status) == "cancelled" or pending.status == "cancelled"


# ---------------------------------------------------------- expire


async def test_expire_lapsed_subscriptions_demotes_to_trial(
    test_session: AsyncSession,
) -> None:
    long_ago = datetime.now(UTC) - timedelta(days=5)
    expired = Master(
        telegram_id=42200,
        timezone="UTC",
        plan=Plan.PRO,
        subscription_active_until=long_ago,
        trial_ends_at=long_ago,
    )
    still_ok = Master(
        telegram_id=42201,
        timezone="UTC",
        plan=Plan.PRO,
        subscription_active_until=datetime.now(UTC) + timedelta(days=5),
    )
    test_session.add_all([expired, still_ok])
    await test_session.commit()

    n = await expire_lapsed_subscriptions(test_session)
    await test_session.commit()
    await test_session.refresh(expired)
    await test_session.refresh(still_ok)
    assert n == 1
    assert expired.plan == Plan.TRIAL
    assert still_ok.plan == Plan.PRO


# ---------------------------------------------------------- ROI


async def test_compute_roi_with_revenue(test_session: AsyncSession) -> None:
    master = Master(telegram_id=42300, timezone="UTC", plan=Plan.PRO)
    test_session.add(master)
    await test_session.flush()
    cl = Client(master_id=master.id, telegram_id=99001, name="C")
    svc = Service(
        master_id=master.id,
        name="S",
        duration_minutes=60,
        price=Decimal("3000"),
    )
    test_session.add_all([cl, svc])
    await test_session.flush()
    test_session.add(
        Booking(
            master_id=master.id,
            client_id=cl.id,
            service_id=svc.id,
            starts_at=datetime.now(UTC) - timedelta(days=1),
            ends_at=datetime.now(UTC),
            status=BookingStatus.DONE,
            price=Decimal("3000"),
        )
    )
    await test_session.commit()

    data = await compute_roi(test_session, master=master)
    assert Decimal(data["revenue"]) >= Decimal("3000")
    assert Decimal(data["cost"]) > 0
    assert data["roi_x"] is not None


# ---------------------------------------------------------- API endpoints


async def test_billing_plan_includes_trial_after_signup(
    client: AsyncClient,
) -> None:
    headers = _auth(42400)
    await client.get("/api/me", headers=headers)
    r = await client.get("/api/billing/plan", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["plan"] == "trial"
    assert body["is_active"] is True  # trial just started
    assert body["pro_price_monthly"] == 900


async def test_checkout_rejects_trial_plan(client: AsyncClient) -> None:
    headers = _auth(42401)
    await client.get("/api/me", headers=headers)
    r = await client.post("/api/billing/checkout", json={"plan": "trial"}, headers=headers)
    assert r.status_code == 400


async def test_checkout_returns_503_when_yookassa_not_configured(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "YOOKASSA_SHOP_ID", "")
    monkeypatch.setattr(settings, "YOOKASSA_SECRET_KEY", "")
    headers = _auth(42402)
    await client.get("/api/me", headers=headers)
    r = await client.post("/api/billing/checkout", json={"plan": "pro"}, headers=headers)
    assert r.status_code == 503


async def test_yookassa_webhook_always_200_even_on_unknown_payment(
    client: AsyncClient,
) -> None:
    r = await client.post(
        "/api/billing/yookassa-webhook",
        json={"event": "payment.succeeded", "object": {"id": "unknown-id"}},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}
