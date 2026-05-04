"""Telegram Business API handlers.

Two events we care about now:

1. business_connection — fired when a master enables/disables the bot in their
   Telegram Business settings. We upsert a BusinessConnection row.

2. business_message — every message in a Business chat (incoming from a client
   OR outgoing from the master themselves). When the master writes a reply
   manually, we flip the conversation to human_takeover for HUMAN_TAKEOVER_HOURS.
   Real LLM-powered bot replies will plug into this in Stage 5; for now we just
   record the message and update conversation state.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from aiogram import F, Router
from aiogram.types import (
    BusinessConnection,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import get_bot
from app.core.config import settings
from app.core.db import session_factory
from app.llm import get_llm
from app.models import (
    BusinessConnection as BusinessConnectionModel,
)
from app.models import (
    Client,
    Conversation,
    ConversationState,
    Master,
)
from app.models import (
    Message as MessageModel,
)
from app.models import (
    MessageDirection as MessageDirectionEnum,
)
from app.services import process_client_message

router = Router(name="business")
log = logging.getLogger(__name__)


@router.business_connection()
async def on_business_connection(connection: BusinessConnection) -> None:
    """Master toggled bot in Telegram Business settings."""
    async with session_factory() as session:
        await _upsert_business_connection(
            session,
            master_telegram_id=connection.user.id,
            telegram_username=connection.user.username,
            connection_id=connection.id,
            is_enabled=connection.is_enabled,
        )
        await session.commit()
    log.info(
        "business_connection: master_tg=%s id=%s enabled=%s",
        connection.user.id,
        connection.id,
        connection.is_enabled,
    )


@router.business_message()
async def on_business_message(message: Message) -> None:
    """A message in a Business chat — either client → master or master → client."""
    if message.business_connection_id is None:
        return

    async with session_factory() as session:
        conn_row = await _find_connection(session, message.business_connection_id)
        if conn_row is None:
            log.warning(
                "business_message: unknown connection_id=%s", message.business_connection_id
            )
            return

        master_id = conn_row.master_id
        # The "master" is the user that owns the Business account.
        # Telegram echoes their outgoing messages with from_user == master.
        master_tg_id = await _master_telegram_id(session, master_id)

        is_master_outgoing = message.from_user is not None and message.from_user.id == master_tg_id

        # In Business chats, the "other side" is the client. When the master
        # is outgoing, the chat is the client's chat (chat.id == client tg id).
        client_tg_id: int | None
        client_name: str | None
        if is_master_outgoing:
            client_tg_id = message.chat.id
            client_name = message.chat.first_name or (
                message.chat.full_name if hasattr(message.chat, "full_name") else None
            )
        else:
            if message.from_user is None:
                return
            client_tg_id = message.from_user.id
            client_name = (
                " ".join(
                    p for p in (message.from_user.first_name, message.from_user.last_name) if p
                )
                or None
            )

        client = await _get_or_create_client(
            session, master_id=master_id, telegram_id=client_tg_id, name=client_name
        )
        conversation = await _get_or_create_conversation(
            session, master_id=master_id, client_id=client.id
        )

        now = datetime.now(UTC)
        client.last_seen_at = now
        if client.first_seen_at is None:
            client.first_seen_at = now
        conversation.last_message_at = now

        if is_master_outgoing:
            direction = MessageDirectionEnum.MASTER
            conversation.state = ConversationState.HUMAN_TAKEOVER
            conversation.takeover_until = now + timedelta(hours=settings.HUMAN_TAKEOVER_HOURS)
        else:
            direction = MessageDirectionEnum.IN

        text = message.text or message.caption
        session.add(
            MessageModel(
                conversation_id=conversation.id,
                direction=direction,
                text=text,
            )
        )
        await session.flush()

        # Bot replies only to the client when not in human-takeover AND
        # the master hasn't flipped the global kill switch.
        master = await _load_master(session, master_id)
        should_reply = (
            not is_master_outgoing
            and text
            and master.bot_enabled
            and _bot_active(conversation, now)
        )
        if should_reply:
            out_msg = await process_client_message(
                session,
                master=master,
                conversation=conversation,
                user_text=text,
                llm=get_llm(),
            )
            await session.commit()
            meta = out_msg.llm_meta or {}
            # The dialog layer may flag a reply as silent (billing inactive,
            # nothing to say). Persist for analytics but don't ping the
            # client.
            if meta.get("silent"):
                return
            try:
                buttons = meta.get("buttons") or []
                reply_markup = _build_reply_keyboard(buttons)
                await get_bot().send_message(
                    chat_id=message.chat.id,
                    text=out_msg.text or "",
                    business_connection_id=message.business_connection_id,
                    reply_markup=reply_markup,
                )
            except Exception:
                log.exception("business_message: failed to deliver bot reply")

            # Send portfolio if the LLM flagged the request.
            if meta.get("portfolio_request"):
                from app.services.portfolio import send_portfolio_photos

                try:
                    await send_portfolio_photos(
                        bot=get_bot(),
                        master_id=master.id,
                        chat_id=message.chat.id,
                        session=session,
                        business_connection_id=message.business_connection_id,
                    )
                except Exception:
                    log.exception("business_message: portfolio send failed")
        else:
            await session.commit()

    log.info(
        "business_message: master_id=%s client_tg=%s dir=%s takeover_until=%s",
        master_id,
        client_tg_id,
        direction,
        conversation.takeover_until,
    )


CALLBACK_PREFIX = "ch:"


@router.callback_query(F.data.startswith(CALLBACK_PREFIX))
async def on_choice_tap(callback: CallbackQuery) -> None:
    """Client tapped one of the bot's inline-keyboard choice buttons.

    Telegram delivers this as a regular callback_query, but if the tap
    happened on a business message, `callback.message.business_connection_id`
    is populated. We treat the button label as if the client typed it,
    so the conversation thread continues naturally and the LLM sees a
    consistent history.
    """
    if not callback.data:
        await callback.answer()
        return
    label = callback.data[len(CALLBACK_PREFIX):]
    msg = callback.message
    if msg is None or msg.business_connection_id is None:
        # Not a business chat (regular bot DM) — same code path is fine,
        # just answer to dismiss the spinner.
        await callback.answer()
        return

    business_connection_id = msg.business_connection_id
    chat_id = msg.chat.id
    client_tg_id = callback.from_user.id if callback.from_user else None

    async with session_factory() as session:
        conn_row = await _find_connection(session, business_connection_id)
        if conn_row is None:
            await callback.answer()
            return
        master_id = conn_row.master_id
        master = await _load_master(session, master_id)
        client = await _get_or_create_client(
            session,
            master_id=master_id,
            telegram_id=client_tg_id or chat_id,
            name=callback.from_user.first_name if callback.from_user else None,
        )
        conversation = await _get_or_create_conversation(
            session, master_id=master_id, client_id=client.id
        )

        now = datetime.now(UTC)
        client.last_seen_at = now
        if client.first_seen_at is None:
            client.first_seen_at = now
        conversation.last_message_at = now

        # Persist the tap as if the client typed the label — this keeps
        # the message thread coherent and gives the LLM the same context
        # in subsequent turns.
        session.add(
            MessageModel(
                conversation_id=conversation.id,
                direction=MessageDirectionEnum.IN,
                text=label,
            )
        )
        await session.flush()

        if not (master.bot_enabled and _bot_active(conversation, now)):
            await session.commit()
            await callback.answer()
            return

        out_msg = await process_client_message(
            session,
            master=master,
            conversation=conversation,
            user_text=label,
            llm=get_llm(),
        )
        await session.commit()
        meta = out_msg.llm_meta or {}
        if meta.get("silent"):
            await callback.answer()
            return
        try:
            keyboard = _build_reply_keyboard(meta.get("buttons") or [])
            await get_bot().send_message(
                chat_id=chat_id,
                text=out_msg.text or "",
                business_connection_id=business_connection_id,
                reply_markup=keyboard,
            )
        except Exception:
            log.exception("on_choice_tap: failed to deliver bot reply")

    await callback.answer()


def _build_reply_keyboard(
    buttons: list[str] | None,
) -> InlineKeyboardMarkup | None:
    """Render LLM-suggested choice buttons as an inline keyboard.

    Inline keyboards (rather than ReplyKeyboardMarkup) because Telegram
    Business API silently drops reply-keyboard updates on outgoing messages
    sent by the bot on behalf of a business account — taps never reach us.
    Inline buttons are delivered correctly and produce a callback_query.

    callback_data carries the label itself (clipped to Telegram's 64-byte
    cap so a long «Маникюр + гель-лак + дизайн» still survives).
    """
    if not buttons:
        return None
    rows: list[list[InlineKeyboardButton]] = []
    bucket: list[InlineKeyboardButton] = []
    for label in buttons[:6]:
        text = (label or "").strip()
        if not text:
            continue
        # callback_data has a 64-byte budget. Prefix is 3 chars, leave room.
        callback_data = (CALLBACK_PREFIX + text)[:60]
        btn = InlineKeyboardButton(text=text, callback_data=callback_data)
        bucket.append(btn)
        # Two short ones per row when both fit, single-column otherwise.
        if len(bucket) == 2 and all(len(b.text) <= 12 for b in bucket):
            rows.append(bucket)
            bucket = []
        elif len(text) > 12:
            rows.append(bucket)
            bucket = []
    if bucket:
        rows.append(bucket)
    if not rows:
        return None
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _bot_active(conversation: Conversation, now: datetime) -> bool:
    if conversation.state != ConversationState.HUMAN_TAKEOVER:
        return True
    if conversation.takeover_until is None:
        return True
    if conversation.takeover_until <= now:
        # Window expired — flip back to bot.
        conversation.state = ConversationState.BOT
        conversation.takeover_until = None
        return True
    return False


async def _load_master(session: AsyncSession, master_id: int) -> Master:
    result = await session.execute(select(Master).where(Master.id == master_id))
    return result.scalar_one()


# --- helpers ---------------------------------------------------------------


async def _upsert_business_connection(
    session: AsyncSession,
    *,
    master_telegram_id: int,
    telegram_username: str | None,
    connection_id: str,
    is_enabled: bool,
) -> BusinessConnectionModel:
    master = await _get_or_create_master(
        session, telegram_id=master_telegram_id, telegram_username=telegram_username
    )
    result = await session.execute(
        select(BusinessConnectionModel).where(
            BusinessConnectionModel.telegram_business_connection_id == connection_id
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = BusinessConnectionModel(
            master_id=master.id,
            telegram_business_connection_id=connection_id,
            is_enabled=is_enabled,
            connected_at=datetime.now(UTC) if is_enabled else None,
        )
        session.add(row)
    else:
        row.is_enabled = is_enabled
        if is_enabled and row.connected_at is None:
            row.connected_at = datetime.now(UTC)
    return row


async def _find_connection(
    session: AsyncSession, connection_id: str
) -> BusinessConnectionModel | None:
    result = await session.execute(
        select(BusinessConnectionModel).where(
            BusinessConnectionModel.telegram_business_connection_id == connection_id,
            BusinessConnectionModel.is_enabled.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def _master_telegram_id(session: AsyncSession, master_id: int) -> int:
    result = await session.execute(select(Master.telegram_id).where(Master.id == master_id))
    return result.scalar_one()


async def _get_or_create_master(
    session: AsyncSession,
    *,
    telegram_id: int,
    telegram_username: str | None,
) -> Master:
    from app.services.billing import ensure_trial

    result = await session.execute(select(Master).where(Master.telegram_id == telegram_id))
    master = result.scalar_one_or_none()
    if master is None:
        master = Master(
            telegram_id=telegram_id,
            telegram_username=telegram_username,
            timezone=settings.DEFAULT_TIMEZONE,
        )
        session.add(master)
        await session.flush()
    elif telegram_username and master.telegram_username != telegram_username:
        master.telegram_username = telegram_username
    # Whether brand-new or returning, make sure a trial window exists so the
    # bot's billing gate doesn't immediately silence them.
    ensure_trial(master)
    return master


async def _get_or_create_client(
    session: AsyncSession, *, master_id: int, telegram_id: int, name: str | None
) -> Client:
    result = await session.execute(
        select(Client).where(Client.master_id == master_id, Client.telegram_id == telegram_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        client = Client(master_id=master_id, telegram_id=telegram_id, name=name)
        session.add(client)
        await session.flush()
    elif name and client.name is None:
        client.name = name
    return client


async def _get_or_create_conversation(
    session: AsyncSession, *, master_id: int, client_id: int
) -> Conversation:
    result = await session.execute(
        select(Conversation).where(
            Conversation.master_id == master_id, Conversation.client_id == client_id
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            master_id=master_id,
            client_id=client_id,
            state=ConversationState.BOT,
        )
        session.add(conv)
        await session.flush()
    return conv
