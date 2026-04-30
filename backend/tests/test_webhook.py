"""Stage 2 — Telegram webhook + Business handlers."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    BusinessConnection,
    Client,
    Conversation,
    ConversationState,
    Master,
    Message,
    MessageDirection,
)

pytestmark = pytest.mark.asyncio

MASTER_TG = 50001
CLIENT_TG = 60001
CONNECTION_ID = "biz_conn_abc"


FAKE_TOKEN = "987654321:AABBccdd-eeFF_ggHHii-jjKKllMMnn_ooPP"


class _StubLLM:
    """Records calls and returns canned LLMResult."""

    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def generate(self, *, system_prompt, history, user_message):
        from app.llm.base import LLMResult

        self.calls.append({"system": system_prompt, "history": list(history), "user": user_message})
        return LLMResult(reply="ассистент: спасибо за сообщение!", escalate=False)


@pytest.fixture(autouse=True)
def _override_secrets(monkeypatch):
    from app.bot import dispatcher as bot_disp
    from app.llm import factory as llm_factory

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", FAKE_TOKEN)
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "shh-its-a-secret")
    monkeypatch.setattr(settings, "HUMAN_TAKEOVER_HOURS", 24)

    # Stub the LLM so the bot reply path runs without HTTP.
    stub = _StubLLM()
    llm_factory.set_llm(stub)

    # Prevent real Telegram API calls when handler tries to send the reply.
    async def _noop_send(*_args, **_kwargs):
        return None

    monkeypatch.setattr(bot_disp.get_bot(), "send_message", _noop_send)
    yield
    llm_factory.set_llm(None)


def _wrap_update(update_id: int, **fields: object) -> dict[str, object]:
    return {"update_id": update_id, **fields}


def _business_connection(enabled: bool = True) -> dict[str, object]:
    return _wrap_update(
        1,
        business_connection={
            "id": CONNECTION_ID,
            "user": {
                "id": MASTER_TG,
                "is_bot": False,
                "first_name": "Аня",
                "username": "anya_master",
            },
            "user_chat_id": MASTER_TG,
            "date": 1714000000,
            "rights": {
                "can_reply": True,
                "can_read_messages": True,
                "can_delete_outgoing_messages": False,
                "can_delete_all_messages": False,
                "can_edit_name": False,
                "can_edit_bio": False,
                "can_edit_profile_photo": False,
                "can_edit_username": False,
                "can_change_gift_settings": False,
                "can_view_gifts_and_stars": False,
                "can_convert_gifts_to_stars": False,
                "can_transfer_and_upgrade_gifts": False,
                "can_transfer_stars": False,
                "can_manage_stories": False,
            },
            "is_enabled": enabled,
        },
    )


def _client_message(text: str, message_id: int = 100) -> dict[str, object]:
    return _wrap_update(
        2,
        business_message={
            "message_id": message_id,
            "business_connection_id": CONNECTION_ID,
            "date": 1714000100,
            "chat": {"id": CLIENT_TG, "type": "private", "first_name": "Лена"},
            "from": {
                "id": CLIENT_TG,
                "is_bot": False,
                "first_name": "Лена",
            },
            "text": text,
        },
    )


def _master_outgoing(text: str, message_id: int = 200) -> dict[str, object]:
    return _wrap_update(
        3,
        business_message={
            "message_id": message_id,
            "business_connection_id": CONNECTION_ID,
            "date": 1714000200,
            "chat": {"id": CLIENT_TG, "type": "private", "first_name": "Лена"},
            # When the master replies manually, Telegram echoes the message
            # with from_user == the master themselves.
            "from": {
                "id": MASTER_TG,
                "is_bot": False,
                "first_name": "Аня",
            },
            "text": text,
        },
    )


async def _post(
    client: AsyncClient,
    body: dict[str, object],
    *,
    secret: str | None = "shh-its-a-secret",
):
    headers = {}
    if secret is not None:
        headers["X-Telegram-Bot-Api-Secret-Token"] = secret
    return await client.post("/api/telegram/webhook", json=body, headers=headers)


async def test_webhook_rejects_missing_secret(client: AsyncClient) -> None:
    r = await _post(client, _business_connection(), secret=None)
    assert r.status_code == 401


async def test_webhook_rejects_wrong_secret(client: AsyncClient) -> None:
    r = await _post(client, _business_connection(), secret="nope")
    assert r.status_code == 401


async def test_business_connection_creates_master_and_connection(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    r = await _post(client, _business_connection(enabled=True))
    assert r.status_code == 200, r.text

    master = (
        await test_session.execute(select(Master).where(Master.telegram_id == MASTER_TG))
    ).scalar_one()
    assert master.telegram_username == "anya_master"

    conn = (
        await test_session.execute(
            select(BusinessConnection).where(
                BusinessConnection.telegram_business_connection_id == CONNECTION_ID
            )
        )
    ).scalar_one()
    assert conn.is_enabled is True
    assert conn.master_id == master.id
    assert conn.connected_at is not None


async def test_business_connection_disable_flips_flag(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    await _post(client, _business_connection(enabled=True))
    await _post(client, _business_connection(enabled=False))

    conn = (
        await test_session.execute(
            select(BusinessConnection).where(
                BusinessConnection.telegram_business_connection_id == CONNECTION_ID
            )
        )
    ).scalar_one()
    assert conn.is_enabled is False


async def test_incoming_client_message_creates_conversation_and_bot_reply(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    await _post(client, _business_connection(enabled=True))
    r = await _post(client, _client_message("здравствуйте, можно записаться?"))
    assert r.status_code == 200

    conv = (await test_session.execute(select(Conversation))).scalar_one()
    assert conv.state == ConversationState.BOT
    assert conv.takeover_until is None

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    assert [m.direction for m in msgs] == [MessageDirection.IN, MessageDirection.OUT]
    assert msgs[0].text == "здравствуйте, можно записаться?"
    assert msgs[1].text and "ассистент" in msgs[1].text
    assert msgs[1].llm_meta and "escalate" in msgs[1].llm_meta

    cl = (await test_session.execute(select(Client))).scalar_one()
    assert cl.telegram_id == CLIENT_TG
    assert cl.first_seen_at is not None


async def test_master_outgoing_message_triggers_takeover(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    await _post(client, _business_connection(enabled=True))
    await _post(client, _client_message("привет"))
    # Bot replied (OUT) after the IN message; now master takes over.
    await _post(client, _master_outgoing("отвечу через час"))

    conv = (await test_session.execute(select(Conversation))).scalar_one()
    assert conv.state == ConversationState.HUMAN_TAKEOVER
    assert conv.takeover_until is not None

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    directions = [m.direction for m in msgs]
    assert directions == [MessageDirection.IN, MessageDirection.OUT, MessageDirection.MASTER]


async def test_takeover_blocks_bot_reply_until_window_expires(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    await _post(client, _business_connection(enabled=True))
    await _post(client, _client_message("первое"))
    await _post(client, _master_outgoing("я отвечу"))
    # While in takeover, an incoming client message should NOT trigger a bot OUT.
    await _post(client, _client_message("второе", message_id=101))

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    directions = [m.direction for m in msgs]
    # IN, OUT (initial bot reply), MASTER (takeover), IN (no bot OUT this time)
    assert directions == [
        MessageDirection.IN,
        MessageDirection.OUT,
        MessageDirection.MASTER,
        MessageDirection.IN,
    ]


async def test_business_message_without_known_connection_is_ignored(
    client: AsyncClient, test_session: AsyncSession
) -> None:
    # No business_connection event sent first → handler should drop the message.
    r = await _post(client, _client_message("hi"))
    assert r.status_code == 200

    convs = (await test_session.execute(select(Conversation))).scalars().all()
    assert convs == []
