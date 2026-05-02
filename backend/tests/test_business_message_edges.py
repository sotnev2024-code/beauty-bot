"""Edge cases of the Telegram Business message handler.

These supplement test_webhook.py's happy-path coverage with the message
shapes that have caused production scares in the past:

  * Sticker / voice / photo without caption — no `text`, no `caption` →
    bot must NOT crash and must NOT generate an OUT row.
  * Two inbound messages back-to-back — the per-conversation advisory
    lock should serialize them, so the second one returns the
    «секунду — отвечаю на предыдущее» stub instead of racing the LLM.
  * Master with expired trial AND no paid window — the bot must stay
    silent (no Telegram send, no OUT text, just an analytic row).
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    Conversation,
    Master,
    Message,
    MessageDirection,
)

pytestmark = pytest.mark.asyncio

MASTER_TG = 70001
CLIENT_TG = 80001
CONNECTION_ID = "biz_conn_edges"
FAKE_TOKEN = "987654321:AABBccdd-eeFF_ggHHii-jjKKllMMnn_ooPP"


class _SlowStubLLM:
    """Always returns the same canned reply, but yields control once so two
    overlapping calls have a chance to interleave under the advisory lock."""

    def __init__(self) -> None:
        self.calls: int = 0

    async def generate(self, *, system_prompt, history, user_message):
        from app.llm.base import LLMResult

        self.calls += 1
        # Hold the lock long enough that a concurrent webhook arrives during
        # the await — this is what proves the advisory lock is doing work.
        await asyncio.sleep(0.2)
        return LLMResult(reply="ассистент: ответ", escalate=False)


@pytest.fixture(autouse=True)
def _override_secrets(monkeypatch):
    from app.bot import dispatcher as bot_disp
    from app.llm import factory as llm_factory

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", FAKE_TOKEN)
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "shh-its-a-secret")
    monkeypatch.setattr(settings, "HUMAN_TAKEOVER_HOURS", 24)
    llm_factory.set_llm(_SlowStubLLM())

    sent: list[dict] = []

    async def _record_send(*_args, **kwargs):
        sent.append(kwargs)
        return None

    monkeypatch.setattr(bot_disp.get_bot(), "send_message", _record_send)
    yield sent
    llm_factory.set_llm(None)


def _wrap(update_id: int, **fields) -> dict:
    return {"update_id": update_id, **fields}


def _connection(enabled: bool = True) -> dict:
    return _wrap(
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


def _sticker_message(message_id: int = 110) -> dict:
    return _wrap(
        2,
        business_message={
            "message_id": message_id,
            "business_connection_id": CONNECTION_ID,
            "date": 1714000100,
            "chat": {"id": CLIENT_TG, "type": "private", "first_name": "Лена"},
            "from": {"id": CLIENT_TG, "is_bot": False, "first_name": "Лена"},
            "sticker": {
                "file_id": "stk_xyz",
                "file_unique_id": "uniq_xyz",
                "type": "regular",
                "width": 512,
                "height": 512,
                "is_animated": False,
                "is_video": False,
            },
        },
    )


def _voice_message(message_id: int = 120) -> dict:
    return _wrap(
        3,
        business_message={
            "message_id": message_id,
            "business_connection_id": CONNECTION_ID,
            "date": 1714000110,
            "chat": {"id": CLIENT_TG, "type": "private", "first_name": "Лена"},
            "from": {"id": CLIENT_TG, "is_bot": False, "first_name": "Лена"},
            "voice": {
                "file_id": "voi_xyz",
                "file_unique_id": "uniq_voi",
                "duration": 3,
                "mime_type": "audio/ogg",
            },
        },
    )


def _text_message(text: str, message_id: int = 200) -> dict:
    return _wrap(
        4,
        business_message={
            "message_id": message_id,
            "business_connection_id": CONNECTION_ID,
            "date": 1714000200,
            "chat": {"id": CLIENT_TG, "type": "private", "first_name": "Лена"},
            "from": {"id": CLIENT_TG, "is_bot": False, "first_name": "Лена"},
            "text": text,
        },
    )


async def _post(client: AsyncClient, body: dict) -> None:
    r = await client.post(
        "/api/telegram/webhook",
        json=body,
        headers={"X-Telegram-Bot-Api-Secret-Token": "shh-its-a-secret"},
    )
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------- non-text


async def test_sticker_does_not_trigger_bot_reply(
    client: AsyncClient, test_session: AsyncSession, _override_secrets
) -> None:
    sent = _override_secrets
    await _post(client, _connection())
    await _post(client, _sticker_message())

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    # IN row stored with text=NULL; no OUT, no Telegram send.
    assert [m.direction for m in msgs] == [MessageDirection.IN]
    assert msgs[0].text is None
    assert sent == []


async def test_voice_does_not_trigger_bot_reply(
    client: AsyncClient, test_session: AsyncSession, _override_secrets
) -> None:
    sent = _override_secrets
    await _post(client, _connection())
    await _post(client, _voice_message())

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    assert [m.direction for m in msgs] == [MessageDirection.IN]
    assert sent == []


# ---------------------------------------------------------------- billing gate


async def test_expired_master_stays_silent(
    client: AsyncClient, test_session: AsyncSession, _override_secrets
) -> None:
    sent = _override_secrets
    await _post(client, _connection())
    # Simulate trial that ended yesterday and no paid window.
    master = (
        await test_session.execute(select(Master).where(Master.telegram_id == MASTER_TG))
    ).scalar_one()
    master.trial_ends_at = datetime.now(UTC) - timedelta(days=1)
    master.subscription_active_until = None
    await test_session.commit()

    await _post(client, _text_message("здравствуйте"))

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    # IN persists, OUT row exists for analytics with `silent` flag, but
    # the Telegram send was suppressed.
    assert [m.direction for m in msgs] == [MessageDirection.IN, MessageDirection.OUT]
    assert msgs[1].text == ""
    assert (msgs[1].llm_meta or {}).get("silent") is True
    assert sent == []


# ---------------------------------------------------------------- conversation lock


async def test_concurrent_messages_serialize_under_lock(
    client: AsyncClient, test_session: AsyncSession, _override_secrets
) -> None:
    """Two inbound messages in flight at once: the second should hit the
    advisory-lock fast path and return the «секунду» stub instead of
    starting a parallel LLM generation."""
    await _post(client, _connection())

    # Fire two concurrent webhook posts. The first acquires the lock and
    # awaits asyncio.sleep(0) inside the stub LLM; the second arrives
    # while the lock is still held.
    body_a = _text_message("первое", message_id=300)
    body_b = _text_message("второе", message_id=301)
    await asyncio.gather(_post(client, body_a), _post(client, body_b))

    msgs = (await test_session.execute(select(Message).order_by(Message.id))).scalars().all()
    out_msgs = [m for m in msgs if m.direction == MessageDirection.OUT]
    # Both inbound messages must have produced an OUT row, but exactly one
    # of them should be the lock-skipped stub.
    skipped = [m for m in out_msgs if (m.llm_meta or {}).get("skipped_due_to_lock")]
    assert len(out_msgs) == 2, [m.text for m in out_msgs]
    assert len(skipped) == 1, [m.llm_meta for m in out_msgs]


async def test_conversation_state_remains_bot_after_sticker(
    client: AsyncClient, test_session: AsyncSession, _override_secrets
) -> None:
    await _post(client, _connection())
    await _post(client, _sticker_message())
    conv = (await test_session.execute(select(Conversation))).scalar_one()
    assert conv.takeover_until is None
