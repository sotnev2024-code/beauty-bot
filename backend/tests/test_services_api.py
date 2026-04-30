"""Stage 4 — services CRUD endpoint."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.security import build_test_init_data

pytestmark = pytest.mark.asyncio

TOKEN = "test-bot-token-services"


@pytest.fixture(autouse=True)
def _override(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)
    monkeypatch.setattr(settings, "MAX_SERVICES_PER_MASTER", 3)


def _auth(user_id: int = 1) -> dict[str, str]:
    init = build_test_init_data(TOKEN, user={"id": user_id, "first_name": "M"})
    return {"X-Telegram-Init-Data": init}


async def test_create_and_list(client: AsyncClient) -> None:
    headers = _auth(1)
    payload = {"name": "Маникюр", "duration_minutes": 60, "price": "1500.00"}
    r = await client.post("/api/services", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Маникюр"
    assert body["duration_minutes"] == 60

    r = await client.get("/api/services", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


async def test_max_services_limit(client: AsyncClient) -> None:
    headers = _auth(2)
    for i in range(3):
        r = await client.post(
            "/api/services",
            json={"name": f"S{i}", "duration_minutes": 30, "price": "100"},
            headers=headers,
        )
        assert r.status_code == 201
    r = await client.post(
        "/api/services",
        json={"name": "S4", "duration_minutes": 30, "price": "100"},
        headers=headers,
    )
    assert r.status_code == 400
    assert "max 3" in r.json()["detail"]


async def test_update_service(client: AsyncClient) -> None:
    headers = _auth(3)
    r = await client.post(
        "/api/services",
        json={"name": "Брови", "duration_minutes": 30, "price": "800"},
        headers=headers,
    )
    sid = r.json()["id"]
    r = await client.patch(f"/api/services/{sid}", json={"price": "900"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["price"] == "900.00"


async def test_delete_service(client: AsyncClient) -> None:
    headers = _auth(4)
    r = await client.post(
        "/api/services",
        json={"name": "X", "duration_minutes": 15, "price": "100"},
        headers=headers,
    )
    sid = r.json()["id"]
    r = await client.delete(f"/api/services/{sid}", headers=headers)
    assert r.status_code == 204
    r = await client.get("/api/services", headers=headers)
    assert r.json() == []


async def test_other_master_cannot_touch_my_service(client: AsyncClient) -> None:
    h1 = _auth(101)
    h2 = _auth(102)
    r = await client.post(
        "/api/services",
        json={"name": "Mine", "duration_minutes": 60, "price": "500"},
        headers=h1,
    )
    sid = r.json()["id"]
    r = await client.patch(f"/api/services/{sid}", json={"name": "hacked"}, headers=h2)
    assert r.status_code == 404
