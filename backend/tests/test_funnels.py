"""Stage 5 — funnel CRUD, presets seeding, selection logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import build_test_init_data
from app.models import (
    Booking,
    BookingStatus,
    Client,
    Conversation,
    ConversationState,
    Funnel,
    FunnelStep,
    FunnelType,
    Master,
    Service,
)
from app.services.funnel import (
    seed_funnel_from_preset,
    select_funnel_for_conversation,
)
from app.services.funnel_presets import PRESETS

pytestmark = pytest.mark.asyncio

TOKEN = "funnels-test-token"


@pytest.fixture(autouse=True)
def _override(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)


def _auth(user_id: int) -> dict[str, str]:
    init = build_test_init_data(TOKEN, user={"id": user_id, "first_name": "M"})
    return {"X-Telegram-Init-Data": init}


# --------------------------------------------------------- API endpoints


async def test_list_presets_endpoint(client: AsyncClient) -> None:
    headers = _auth(8001)
    r = await client.get("/api/funnels/presets", headers=headers)
    assert r.status_code == 200
    body = r.json()
    keys = {p["key"] for p in body}
    assert keys == {"manicure", "brows_lashes", "return", "cold"}


async def test_seed_preset_creates_steps_and_activates(client: AsyncClient) -> None:
    headers = _auth(8002)
    r = await client.post(
        "/api/funnels/seed-preset",
        json={"preset_key": "manicure", "activate": True},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["preset_key"] == "manicure"
    assert body["type"] == "main"
    assert body["is_active"] is True
    assert len(body["steps"]) == len(PRESETS["manicure"].steps)
    # Steps come back in position order
    positions = [s["position"] for s in body["steps"]]
    assert positions == sorted(positions)


async def test_seed_unknown_preset_400(client: AsyncClient) -> None:
    headers = _auth(8003)
    r = await client.post(
        "/api/funnels/seed-preset",
        json={"preset_key": "nope"},
        headers=headers,
    )
    assert r.status_code == 400


async def test_only_one_main_funnel_active(client: AsyncClient) -> None:
    headers = _auth(8004)
    r1 = await client.post(
        "/api/funnels/seed-preset",
        json={"preset_key": "manicure", "activate": True},
        headers=headers,
    )
    r2 = await client.post(
        "/api/funnels/seed-preset",
        json={"preset_key": "brows_lashes", "activate": True},
        headers=headers,
    )
    assert r1.status_code == 201 and r2.status_code == 201

    listing = await client.get("/api/funnels", headers=headers)
    assert listing.status_code == 200
    actives = [f for f in listing.json() if f["is_active"]]
    # Only the latest seeded MAIN funnel should remain active.
    assert len(actives) == 1
    assert actives[0]["preset_key"] == "brows_lashes"


async def test_create_custom_funnel(client: AsyncClient) -> None:
    headers = _auth(8005)
    payload = {
        "name": "Кастом",
        "type": "main",
        "is_active": True,
        "steps": [
            {"position": 0, "system_prompt": "Привет!", "goal": "поздоровайся"},
            {"position": 1, "system_prompt": "Подбери услугу", "goal": "услуга"},
        ],
    }
    r = await client.post("/api/funnels", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Кастом"
    assert body["is_active"] is True
    assert len(body["steps"]) == 2


async def test_delete_funnel(client: AsyncClient) -> None:
    headers = _auth(8006)
    r = await client.post(
        "/api/funnels/seed-preset",
        json={"preset_key": "cold", "activate": False},
        headers=headers,
    )
    fid = r.json()["id"]
    r = await client.delete(f"/api/funnels/{fid}", headers=headers)
    assert r.status_code == 204
    listing = await client.get("/api/funnels", headers=headers)
    assert listing.json() == []


# --------------------------------------------------------- selection logic


async def _seed_master(session: AsyncSession, telegram_id: int) -> Master:
    master = Master(telegram_id=telegram_id, timezone="Europe/Moscow", name="M")
    session.add(master)
    await session.flush()
    return master


async def _seed_client(session: AsyncSession, master_id: int, telegram_id: int) -> Client:
    cl = Client(master_id=master_id, telegram_id=telegram_id, name="C")
    session.add(cl)
    await session.flush()
    return cl


async def _seed_conv(session: AsyncSession, master_id: int, client_id: int) -> Conversation:
    conv = Conversation(master_id=master_id, client_id=client_id, state=ConversationState.BOT)
    session.add(conv)
    await session.flush()
    return conv


async def test_select_funnel_new_client_picks_cold(test_session: AsyncSession) -> None:
    master = await _seed_master(test_session, telegram_id=8101)
    cl = await _seed_client(test_session, master.id, telegram_id=99001)
    conv = await _seed_conv(test_session, master.id, cl.id)
    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="cold", activate=True
    )
    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="manicure", activate=True
    )
    await test_session.commit()

    funnel = await select_funnel_for_conversation(
        test_session, master_id=master.id, client_id=cl.id, conversation=conv
    )
    assert funnel is not None
    assert funnel.type == FunnelType.COLD


async def test_select_funnel_returning_client_picks_return(
    test_session: AsyncSession,
) -> None:
    master = await _seed_master(test_session, telegram_id=8102)
    cl = await _seed_client(test_session, master.id, telegram_id=99002)
    conv = await _seed_conv(test_session, master.id, cl.id)

    # Old booking — > 14 days ago.
    old_time = datetime.now(UTC) - timedelta(days=30)
    test_session.add(
        Booking(
            master_id=master.id,
            client_id=cl.id,
            starts_at=old_time,
            ends_at=old_time + timedelta(hours=1),
            status=BookingStatus.DONE,
        )
    )
    await test_session.flush()

    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="return", activate=True
    )
    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="manicure", activate=True
    )
    await test_session.commit()

    funnel = await select_funnel_for_conversation(
        test_session, master_id=master.id, client_id=cl.id, conversation=conv
    )
    assert funnel is not None
    assert funnel.type == FunnelType.RETURN


async def test_select_funnel_recent_client_picks_main(
    test_session: AsyncSession,
) -> None:
    master = await _seed_master(test_session, telegram_id=8103)
    cl = await _seed_client(test_session, master.id, telegram_id=99003)
    conv = await _seed_conv(test_session, master.id, cl.id)

    # Recent booking → 3 days ago.
    recent = datetime.now(UTC) - timedelta(days=3)
    test_session.add(
        Booking(
            master_id=master.id,
            client_id=cl.id,
            starts_at=recent,
            ends_at=recent + timedelta(hours=1),
            status=BookingStatus.DONE,
        )
    )
    await test_session.flush()

    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="manicure", activate=True
    )
    await test_session.commit()

    funnel = await select_funnel_for_conversation(
        test_session, master_id=master.id, client_id=cl.id, conversation=conv
    )
    assert funnel is not None
    assert funnel.type == FunnelType.MAIN


async def test_select_funnel_falls_back_to_main_when_cold_missing(
    test_session: AsyncSession,
) -> None:
    """New client but only main funnel exists → main."""
    master = await _seed_master(test_session, telegram_id=8104)
    cl = await _seed_client(test_session, master.id, telegram_id=99004)
    conv = await _seed_conv(test_session, master.id, cl.id)
    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="manicure", activate=True
    )
    await test_session.commit()
    funnel = await select_funnel_for_conversation(
        test_session, master_id=master.id, client_id=cl.id, conversation=conv
    )
    assert funnel is not None
    assert funnel.type == FunnelType.MAIN


# --------------------------------------------------------- dialog wiring


class _SequenceLLM:
    """Returns a queued LLMResult per call."""

    def __init__(self, results: list) -> None:
        self.results = list(results)
        self.calls: list[dict] = []

    async def generate(self, *, system_prompt, history, user_message):
        self.calls.append({"system": system_prompt, "user": user_message})
        return self.results.pop(0)


@pytest.mark.skip(
    reason="Funnel-step advancement removed in Step 2 (bot hub refactor); deleted in Step 9"
)
async def test_dialog_advances_step_when_llm_hints_next_step(
    test_session: AsyncSession,
) -> None:
    from app.llm.base import LLMResult
    from app.services.dialog import process_client_message

    master = await _seed_master(test_session, telegram_id=8200)
    master.name = "Аня"
    cl = await _seed_client(test_session, master.id, telegram_id=99200)
    conv = await _seed_conv(test_session, master.id, cl.id)
    test_session.add(
        Service(
            master_id=master.id,
            name="Маникюр",
            duration_minutes=60,
            price=Decimal("1500"),
        )
    )
    await seed_funnel_from_preset(
        test_session, master_id=master.id, preset_key="manicure", activate=True
    )
    await test_session.commit()

    funnel = (
        await test_session.execute(select(Funnel).where(Funnel.master_id == master.id))
    ).scalar_one()
    steps = (
        (
            await test_session.execute(
                select(FunnelStep)
                .where(FunnelStep.funnel_id == funnel.id)
                .order_by(FunnelStep.position)
            )
        )
        .scalars()
        .all()
    )
    assert len(steps) >= 2

    llm = _SequenceLLM([LLMResult(reply="Привет!", next_step_id=steps[1].id, escalate=False)])

    msg = await process_client_message(
        test_session,
        master=master,
        conversation=conv,
        user_text="привет",
        llm=llm,
    )
    await test_session.commit()
    await test_session.refresh(conv)

    assert conv.current_funnel_id == funnel.id
    assert conv.current_step_id == steps[1].id
    assert msg.llm_meta and msg.llm_meta["step_id"] == steps[0].id

    # Verify services block ended up in the system prompt
    assert any("Маникюр" in c["system"] for c in llm.calls)


async def test_dialog_falls_back_when_llm_errors(test_session: AsyncSession) -> None:
    from app.llm.base import LLMServiceError
    from app.services.dialog import FALLBACK_REPLY, process_client_message

    class _BoomLLM:
        async def generate(self, **_kwargs):
            raise LLMServiceError("boom")

    master = await _seed_master(test_session, telegram_id=8300)
    cl = await _seed_client(test_session, master.id, telegram_id=99300)
    conv = await _seed_conv(test_session, master.id, cl.id)
    await test_session.commit()

    msg = await process_client_message(
        test_session,
        master=master,
        conversation=conv,
        user_text="hi",
        llm=_BoomLLM(),
    )
    assert msg.text == FALLBACK_REPLY
    assert msg.llm_meta and msg.llm_meta["fallback"] is True
