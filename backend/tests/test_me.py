"""Integration tests for /api/me. Run inside docker compose stack."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import build_test_init_data
from app.models import Master

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _override_bot_token(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "test-bot-token-for-suite")


async def test_me_creates_master_on_first_call(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    init = build_test_init_data(
        "test-bot-token-for-suite",
        user={"id": 9001, "first_name": "Аня", "username": "anya", "is_premium": True},
    )

    response = await client.get("/api/me", headers={"X-Telegram-Init-Data": init})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["telegram_id"] == 9001
    assert body["telegram_username"] == "anya"
    assert body["name"] == "Аня"
    assert body["plan"] == "trial"
    assert body["timezone"] == settings.DEFAULT_TIMEZONE

    # Persisted in DB
    result = await test_session.execute(select(Master).where(Master.telegram_id == 9001))
    master = result.scalar_one()
    assert master.telegram_username == "anya"


async def test_me_returns_existing_master_on_second_call(client: AsyncClient) -> None:
    init = build_test_init_data("test-bot-token-for-suite", user={"id": 7777, "first_name": "Lera"})

    first = await client.get("/api/me", headers={"X-Telegram-Init-Data": init})
    second = await client.get("/api/me", headers={"X-Telegram-Init-Data": init})

    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


async def test_me_updates_username_when_telegram_changes_it(client: AsyncClient) -> None:
    init1 = build_test_init_data(
        "test-bot-token-for-suite", user={"id": 5, "first_name": "K", "username": "old"}
    )
    init2 = build_test_init_data(
        "test-bot-token-for-suite", user={"id": 5, "first_name": "K", "username": "new"}
    )

    r1 = await client.get("/api/me", headers={"X-Telegram-Init-Data": init1})
    r2 = await client.get("/api/me", headers={"X-Telegram-Init-Data": init2})

    assert r1.json()["telegram_username"] == "old"
    assert r2.json()["telegram_username"] == "new"
    assert r1.json()["id"] == r2.json()["id"]


async def test_me_rejects_missing_header(client: AsyncClient) -> None:
    response = await client.get("/api/me")
    assert response.status_code == 401
    assert "missing" in response.json()["detail"].lower()


async def test_me_rejects_invalid_signature(client: AsyncClient) -> None:
    response = await client.get(
        "/api/me", headers={"X-Telegram-Init-Data": "user=%7B%22id%22%3A1%7D&hash=deadbeef"}
    )
    assert response.status_code == 401


async def test_me_rejects_stale_init_data(client: AsyncClient) -> None:
    old = datetime.now(UTC) - timedelta(days=2)
    init = build_test_init_data("test-bot-token-for-suite", user={"id": 1}, auth_date=old)
    response = await client.get("/api/me", headers={"X-Telegram-Init-Data": init})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()
