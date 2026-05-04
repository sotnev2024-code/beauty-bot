"""Deterministic button-only flow handler.

Called from `business.py` when the master's bot_settings.message_format is
`buttons`. The LLM is bypassed for the booking funnel; only the «Задать
вопрос» branch reads from the knowledge base.

Public surface:
  * `start_or_resume(...)` — entry point on every inbound text message
    (greeting, free text inside funnel, name+phone collection).
  * `router` — aiogram router exposing the bk:* and ask:* callback
    handlers; merged into the main dispatcher.

State lives in `Conversation.flow_state` (JSONB).
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from aiogram import F, Router
from aiogram.types import CallbackQuery
from aiogram.types import Message as TgMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import get_bot
from app.bot.flow import keyboards as kb
from app.bot.flow.state import FlowState, Step
from app.core.db import session_factory
from app.models import (
    BotSettings,
    BusinessConnection as BusinessConnectionModel,
    Client,
    Conversation,
    ConversationState,
    KnowledgeBaseItem,
    Master,
    Message as MessageModel,
    MessageDirection as MessageDirectionEnum,
    Schedule,
    Service,
    ServiceAddon,
    ServiceCategory,
    TimeOff,
)
from app.services.booking import find_available_slots
from app.services.booking_create import BookingError, create_booking

router = Router(name="business_buttons")
log = logging.getLogger(__name__)


# ============================================================ entrypoint


async def start_or_resume(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    business_connection_id: str,
    chat_id: int,
    text: str | None,
) -> None:
    """Inbound business_message arrived and the master is in `buttons` mode.

    Three sub-cases:
      1. State is None / `root` — show greeting + 2 root buttons.
      2. State step is `contacts` — try to parse «Имя +телефон» and advance.
      3. Otherwise — text is unexpected (client typed something instead
         of tapping). Re-render the current step so they're not stuck.
    """
    state = FlowState.from_dict(conversation.flow_state)

    if state.step == "contacts" and text:
        await _handle_contacts_input(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text=text,
        )
        return

    # Cancel/reschedule detection — when the client types free text at
    # the root step, run a tiny LLM classifier to decide whether they're
    # asking to cancel an existing booking. If so, escalate to the master
    # silently (no client-facing reply) so the master can handle it
    # themselves, which empirically saves more bookings than a bot offer.
    if text:
        from app.services.cancel_intent import detect_cancel_intent
        from app.services.escalate import escalate_to_master

        if await detect_cancel_intent(text):
            await escalate_to_master(
                session,
                master=master,
                conversation=conversation,
                client_message=text,
                reason="cancel_request",
            )
            # Do NOT render the menu — the conversation just flipped into
            # human-takeover and the bot should stay quiet.
            return

    # Always (re-)show root for inbound text. This keeps the UX
    # predictable: «if I write anything, I get the menu».
    state.reset()
    await _render_root(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
    )


# ============================================================ rendering


async def _send_menu(
    *,
    session: AsyncSession,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
    text: str,
    keyboard,
) -> None:
    """Common pattern: strip the keyboard off the previous interactive
    bot message, send a new one, persist its id as the new menu anchor."""
    bot = get_bot()
    if state.menu_message_id is not None:
        try:
            await bot.edit_message_reply_markup(
                chat_id=chat_id,
                message_id=state.menu_message_id,
                business_connection_id=business_connection_id,
                reply_markup=None,
            )
        except Exception:
            # Telegram races (message deleted, too old, no perms) — fine.
            pass

    sent: TgMessage = await bot.send_message(
        chat_id=chat_id,
        text=text,
        business_connection_id=business_connection_id,
        reply_markup=keyboard,
    )
    state.menu_message_id = sent.message_id
    conversation.flow_state = state.to_dict()
    # Also persist the OUT row so the chat list shows our reply.
    session.add(
        MessageModel(
            conversation_id=conversation.id,
            direction=MessageDirectionEnum.OUT,
            text=text,
            llm_meta={"flow_step": state.step, "buttons_mode": True},
        )
    )
    await session.flush()


async def _render_root(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    bs = await session.get(BotSettings, master.id)
    greeting = (bs.greeting if bs else None) or "Добрый день! Выберите действие:"
    state.step = "root"
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text=greeting,
        keyboard=kb.kb_root(),
    )


async def _render_categories_or_services(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    cats = (
        (
            await session.execute(
                select(ServiceCategory)
                .where(ServiceCategory.master_id == master.id)
                .order_by(ServiceCategory.position, ServiceCategory.id)
            )
        )
        .scalars()
        .all()
    )
    # Skip the category step entirely if 0 or 1 categories exist.
    used_cat_ids = await _categories_in_use(session, master.id)
    cats = [c for c in cats if c.id in used_cat_ids]
    if len(cats) >= 2:
        state.step = "category"
        state.category_id = None
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text="Выберите категорию:",
            keyboard=kb.kb_categories(cats),
        )
        return
    # No categories or only one — go straight to services.
    state.category_id = cats[0].id if cats else None
    await _render_services(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
    )


async def _render_services(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    q = select(Service).where(
        Service.master_id == master.id, Service.is_active.is_(True)
    )
    if state.category_id is not None:
        q = q.where(Service.category_id == state.category_id)
    q = q.order_by(Service.id)
    services = (await session.execute(q)).scalars().all()
    state.step = "service"
    state.service_id = None
    state.addon_ids = []
    if not services:
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text="Сейчас услуги не настроены. Загляните позже.",
            keyboard=kb.kb_after_booking(),
        )
        return
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text="Выберите услугу:",
        keyboard=kb.kb_services(services),
    )


async def _render_addons_or_calendar(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    addons = (
        (
            await session.execute(
                select(ServiceAddon)
                .where(ServiceAddon.service_id == state.service_id)
                .order_by(ServiceAddon.position, ServiceAddon.id)
            )
        )
        .scalars()
        .all()
    )
    if not addons:
        # No add-ons for this service — straight to the calendar.
        await _render_calendar(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    state.step = "addons"
    selected = set(state.addon_ids or [])
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text="Хотите что-то добавить?",
        keyboard=kb.kb_addons(addons, selected),
    )


async def _render_calendar(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    state.step = "day"
    state.day = None
    state.starts_at = None

    tz = _master_tz(master)
    today_local = datetime.now(tz).date()
    if not state.cal_year or not state.cal_month:
        state.cal_year = today_local.year
        state.cal_month = today_local.month

    available = await _available_days_for_month(
        session=session,
        master=master,
        service_id=state.service_id,
        addon_ids=state.addon_ids,
        year=state.cal_year,
        month=state.cal_month,
    )

    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text="Выберите день:",
        keyboard=kb.kb_calendar(
            year=state.cal_year,
            month=state.cal_month,
            today=today_local,
            available_days=available,
            earliest_navigable=today_local,
        ),
    )


async def _render_time_slots(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    state.step = "time"
    state.starts_at = None
    tz = _master_tz(master)
    day = date.fromisoformat(state.day)  # type: ignore[arg-type]
    svc = await session.get(Service, state.service_id)
    extra_minutes = await _addons_extra_minutes(session, state.addon_ids)
    res = await find_available_slots(
        session,
        master=master,
        service=svc,
        from_date=day,
        days_ahead=1,
        extra_minutes=extra_minutes,
    )
    times = sorted({s.starts_at.astimezone(tz).strftime("%H:%M") for s in res.slots})
    weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[day.weekday()]
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text=f"Выберите время на {weekday_short} {day:%d.%m}:",
        keyboard=kb.kb_time_slots(times),
    )


async def _render_contacts_or_confirm(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    """If the client already has name+phone on file, jump straight to the
    confirmation card. Otherwise prompt for «Имя +71234567890» and wait
    for the next inbound text message."""
    client = await session.get(Client, conversation.client_id)
    has_contacts = bool(
        client and (client.name or "").strip() and (client.phone or "").strip()
    )
    if has_contacts:
        await _render_confirm(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    state.step = "contacts"
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text=(
            "Подскажите ваше имя и номер телефона одной строкой "
            "(например: «Анна 79991112233»)."
        ),
        keyboard=kb.kb_contacts_pending(),
    )


async def _render_confirm(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    state.step = "confirm"
    summary = await _build_summary(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
    )
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text=summary,
        keyboard=kb.kb_confirm(),
    )


async def _do_create_booking(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    svc = await session.get(Service, state.service_id)
    client = await session.get(Client, conversation.client_id)
    if svc is None or client is None or not state.starts_at:
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text="Что-то пошло не так. Попробуем заново?",
            keyboard=kb.kb_after_booking(),
        )
        state.reset()
        return
    starts_at = datetime.fromisoformat(state.starts_at)
    try:
        booking = await create_booking(
            session,
            master=master,
            client=client,
            service=svc,
            starts_at=starts_at,
            source="bot_buttons",
            addon_ids=list(state.addon_ids or []),
        )
    except BookingError as e:
        log.warning("buttons-flow create_booking failed: %s", e)
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text=(
                "Это время только что заняли. Подберём другое — "
                "выберите день ещё раз."
            ),
            keyboard=kb.kb_after_booking(),
        )
        state.reset()
        return
    tz = _master_tz(master)
    starts_local = booking.starts_at.astimezone(tz)
    weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[starts_local.weekday()]
    text = (
        "Спасибо! Записала вас:\n"
        f"📅 {weekday_short} {starts_local:%d.%m} в {starts_local:%H:%M}\n"
        f"💅 {svc.name}"
    )
    if booking.addon_ids:
        addon_names = (
            (
                await session.execute(
                    select(ServiceAddon.name).where(
                        ServiceAddon.id.in_(booking.addon_ids)
                    )
                )
            )
            .scalars()
            .all()
        )
        if addon_names:
            text += " + " + ", ".join(addon_names)
    if booking.price is not None:
        text += f"\n💰 {int(booking.price)} ₽"
    text += "\nЕсли планы поменяются — напишите за сутки."
    state.reset()
    await _send_menu(
        session=session,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
        text=text,
        keyboard=kb.kb_after_booking(),
    )


# ============================================================ contacts input


_CONTACT_RE = re.compile(
    r"^\s*([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s\-]{0,40})[\s,]+"
    r"(\+?\d[\d\s\-()]{7,20}\d)\s*$"
)


def _parse_contacts(s: str) -> tuple[str, str] | None:
    m = _CONTACT_RE.match(s.strip())
    if not m:
        return None
    name = m.group(1).strip().title()
    phone_digits = re.sub(r"\D", "", m.group(2))
    if not (10 <= len(phone_digits) <= 15):
        return None
    if phone_digits.startswith("8") and len(phone_digits) == 11:
        phone_digits = "7" + phone_digits[1:]
    if not phone_digits.startswith("+"):
        phone_digits = "+" + phone_digits
    return name, phone_digits


async def _handle_contacts_input(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
    text: str,
) -> None:
    parsed = _parse_contacts(text)
    if parsed is None:
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text=(
                "Не разобрала. Напишите имя и номер одной строкой — "
                "например: «Анна 79991112233»."
            ),
            keyboard=kb.kb_contacts_pending(),
        )
        return
    name, phone = parsed
    client = await session.get(Client, conversation.client_id)
    if client is not None:
        client.name = name
        client.phone = phone
    await _render_confirm(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
    )


# ============================================================ callback router


@router.callback_query(F.data == "noop")
async def on_noop(callback: CallbackQuery) -> None:
    await callback.answer()


@router.callback_query(F.data.startswith("bk:"))
async def on_bk(callback: CallbackQuery) -> None:
    msg = callback.message
    if msg is None or msg.business_connection_id is None or callback.data is None:
        await callback.answer()
        return
    business_connection_id = msg.business_connection_id
    chat_id = msg.chat.id
    client_tg_id = callback.from_user.id if callback.from_user else None
    data = callback.data[len("bk:"):]

    async with session_factory() as session:
        ctx = await _resolve_context(
            session=session,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            client_tg_id=client_tg_id,
        )
        if ctx is None:
            await callback.answer()
            return
        master, conversation, state = ctx
        bs = await session.get(BotSettings, master.id)
        is_hybrid = bs is not None and bs.message_format == "hybrid"

        try:
            if is_hybrid:
                await _dispatch_bk_hybrid(
                    data=data,
                    session=session,
                    master=master,
                    conversation=conversation,
                    state=state,
                    business_connection_id=business_connection_id,
                    chat_id=chat_id,
                )
            else:
                await _dispatch_bk(
                    data=data,
                    session=session,
                    master=master,
                    conversation=conversation,
                    state=state,
                    business_connection_id=business_connection_id,
                    chat_id=chat_id,
                )
            await session.commit()
        except Exception:
            log.exception("bk callback handler failed (data=%r)", data)
            await session.rollback()
    await callback.answer()


async def _dispatch_bk(
    *,
    data: str,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    common = dict(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
    )

    if data == "start":
        state.reset()
        await _render_categories_or_services(**common)
        return

    if data == "cancel":
        state.reset()
        await _render_root(**common)
        return

    if data == "back":
        await _go_back(**common)
        return

    if data.startswith("cat:"):
        state.category_id = int(data.split(":", 1)[1])
        await _render_services(**common)
        return

    if data.startswith("svc:"):
        state.service_id = int(data.split(":", 1)[1])
        state.addon_ids = []
        await _render_addons_or_calendar(**common)
        return

    if data.startswith("addon-single:"):
        # Single-addon services: tap = pick (or «без добавок») + advance.
        choice = data.split(":", 1)[1]
        if choice == "none":
            state.addon_ids = []
        else:
            try:
                state.addon_ids = [int(choice)]
            except ValueError:
                state.addon_ids = []
        await _render_calendar(**common)
        return

    if data.startswith("addon:"):
        addon_id = int(data.split(":", 1)[1])
        ids = list(state.addon_ids or [])
        if addon_id in ids:
            ids.remove(addon_id)
        else:
            ids.append(addon_id)
        state.addon_ids = ids
        addons = (
            (
                await session.execute(
                    select(ServiceAddon)
                    .where(ServiceAddon.service_id == state.service_id)
                    .order_by(ServiceAddon.position, ServiceAddon.id)
                )
            )
            .scalars()
            .all()
        )
        new_kb = kb.kb_addons(addons, set(state.addon_ids))
        # Edit-in-place so toggles don't add new messages to the chat.
        if state.menu_message_id is not None:
            try:
                await get_bot().edit_message_reply_markup(
                    chat_id=chat_id,
                    message_id=state.menu_message_id,
                    business_connection_id=business_connection_id,
                    reply_markup=new_kb,
                )
                conversation.flow_state = state.to_dict()
                return
            except Exception:
                log.exception("addon toggle edit failed; sending new picker")
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text="Хотите что-то добавить?",
            keyboard=new_kb,
        )
        return

    if data == "addons-done":
        await _render_calendar(**common)
        return

    if data.startswith("cal:"):
        ym = data.split(":", 1)[1]
        y, m = ym.split("-")
        state.cal_year = int(y)
        state.cal_month = int(m)
        await _render_calendar(**common)
        return

    if data.startswith("day:"):
        state.day = data.split(":", 1)[1]
        await _render_time_slots(**common)
        return

    if data.startswith("time:"):
        time_str = data[len("time:"):]  # "HH:MM"
        tz = _master_tz(master)
        day = date.fromisoformat(state.day)  # type: ignore[arg-type]
        h, mn = (int(p) for p in time_str.split(":"))
        local_dt = datetime.combine(day, time(h, mn), tzinfo=tz)
        state.starts_at = local_dt.astimezone(UTC).isoformat()
        await _render_contacts_or_confirm(**common)
        return

    if data == "confirm":
        await _do_create_booking(**common)
        return


async def _go_back(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    """Step back to the prior screen. Fresh flow returns to root."""
    cur: Step = state.step
    if cur == "category" or cur == "service":
        state.reset()
        await _render_root(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    if cur == "addons":
        # Re-pick service.
        state.service_id = None
        state.addon_ids = []
        # Categories may or may not exist — let the renderer decide.
        await _render_categories_or_services(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    if cur == "day":
        await _render_addons_or_calendar(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    if cur == "time":
        await _render_calendar(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    if cur in ("contacts", "confirm"):
        await _render_time_slots(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return
    # Default: home.
    state.reset()
    await _render_root(
        session=session,
        master=master,
        conversation=conversation,
        state=state,
        business_connection_id=business_connection_id,
        chat_id=chat_id,
    )


# ============================================================ hybrid dispatch


async def _dispatch_bk_hybrid(
    *,
    data: str,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    """Tap handler for hybrid mode.

    Each interactive widget (addons, time, confirm) only fires here in
    hybrid mode. The pattern: update state from the tap, then either
    (a) push a synthetic user message back into the LLM so the dialog
    continues naturally, or (b) for `confirm` execute the deferred
    booking in `state.pending_booking` and reset.
    """
    if data == "cancel":
        # Drop the parked widget; next inbound message reverts to plain
        # LLM dialog.
        state.reset()
        conversation.flow_state = state.to_dict()
        await get_bot().send_message(
            chat_id=chat_id,
            text="Хорошо, отменила. Напишите когда будете готовы.",
            business_connection_id=business_connection_id,
        )
        return

    if data == "back":
        # No back-stack in hybrid v1 — same effect as cancel.
        state.reset()
        conversation.flow_state = state.to_dict()
        await get_bot().send_message(
            chat_id=chat_id,
            text="Хорошо, начнём заново. Напишите, какая услуга вас интересует.",
            business_connection_id=business_connection_id,
        )
        return

    if data.startswith("addon-single:"):
        choice = data.split(":", 1)[1]
        if choice == "none":
            state.addon_ids = []
            chosen_label = "без добавок"
        else:
            try:
                state.addon_ids = [int(choice)]
            except ValueError:
                state.addon_ids = []
                chosen_label = "без добавок"
            else:
                row = await session.get(ServiceAddon, state.addon_ids[0])
                chosen_label = row.name.lower() if row else "добавку"
        conversation.flow_state = state.to_dict()
        await _hybrid_continue_with_user_text(
            session=session,
            master=master,
            conversation=conversation,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            user_text=f"выбрала {chosen_label}",
        )
        return

    if data.startswith("addon:"):
        # Toggle in multi-select. Edit the keyboard in-place so we don't
        # spam a new picker message on every tap (a fresh message every
        # tap clutters the chat — UX from the live test was ugly).
        addon_id = int(data.split(":", 1)[1])
        ids = list(state.addon_ids or [])
        if addon_id in ids:
            ids.remove(addon_id)
        else:
            ids.append(addon_id)
        state.addon_ids = ids
        conversation.flow_state = state.to_dict()
        addons = (
            (
                await session.execute(
                    select(ServiceAddon)
                    .where(ServiceAddon.service_id == state.service_id)
                    .order_by(ServiceAddon.position, ServiceAddon.id)
                )
            )
            .scalars()
            .all()
        )
        new_kb = kb.kb_addons(addons, set(state.addon_ids))
        if state.menu_message_id is not None:
            try:
                await get_bot().edit_message_reply_markup(
                    chat_id=chat_id,
                    message_id=state.menu_message_id,
                    business_connection_id=business_connection_id,
                    reply_markup=new_kb,
                )
                return
            except Exception:
                # Fall through to a fresh message if Telegram refused
                # the edit (e.g. message too old, race).
                log.exception("addon toggle edit failed; sending new picker")
        await _send_menu(
            session=session,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            text="Выберите добавки или нажмите «Без добавок»:",
            keyboard=new_kb,
        )
        return

    if data == "addons-done":
        # Multi-select finalized — list chosen addons or «без добавок» as
        # fake user text, then let the LLM steer toward day/time.
        if not state.addon_ids:
            chosen_label = "без добавок"
        else:
            rows = (
                (
                    await session.execute(
                        select(ServiceAddon).where(
                            ServiceAddon.id.in_(state.addon_ids)
                        )
                    )
                )
                .scalars()
                .all()
            )
            chosen_label = ", ".join(a.name.lower() for a in rows) or "без добавок"
        conversation.flow_state = state.to_dict()
        await _hybrid_continue_with_user_text(
            session=session,
            master=master,
            conversation=conversation,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            user_text=f"добавки: {chosen_label}",
        )
        return

    if data.startswith("time:"):
        time_str = data[len("time:"):]
        # We saved the day in state when the slot widget was rendered.
        if state.day:
            tz = _master_tz(master)
            day = date.fromisoformat(state.day)
            h, mn = (int(p) for p in time_str.split(":"))
            local_dt = datetime.combine(day, time(h, mn), tzinfo=tz)
            state.starts_at = local_dt.astimezone(UTC).isoformat()
            conversation.flow_state = state.to_dict()
        await _hybrid_continue_with_user_text(
            session=session,
            master=master,
            conversation=conversation,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            user_text=time_str,
        )
        return

    if data == "confirm":
        # Execute the parked booking from pending_booking.
        await _hybrid_finalize_booking(
            session=session,
            master=master,
            conversation=conversation,
            state=state,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
        )
        return


async def _hybrid_continue_with_user_text(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    business_connection_id: str,
    chat_id: int,
    user_text: str,
) -> None:
    """Run the dialog as if the client typed `user_text`, then deliver the
    LLM's reply (with possible hybrid widget) to the chat."""
    from app.bot.handlers.business import _render_hybrid_widget
    from app.llm import get_llm
    from app.services.dialog import process_client_message

    out_msg = await process_client_message(
        session,
        master=master,
        conversation=conversation,
        user_text=user_text,
        llm=get_llm(),
    )
    meta = out_msg.llm_meta or {}
    if meta.get("silent"):
        return
    bot = get_bot()
    hybrid = meta.get("hybrid")
    if hybrid:
        await _render_hybrid_widget(
            session=session,
            master=master,
            conversation=conversation,
            bot=bot,
            chat_id=chat_id,
            business_connection_id=business_connection_id,
            llm_reply=out_msg.text or "",
            hybrid=hybrid,
        )
        return
    # Plain text reply — deliver as-is.
    await bot.send_message(
        chat_id=chat_id,
        text=out_msg.text or "",
        business_connection_id=business_connection_id,
    )


async def _hybrid_finalize_booking(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
    business_connection_id: str,
    chat_id: int,
) -> None:
    pending = state.pending_booking or {}
    svc_id = pending.get("service_id") or state.service_id
    starts_at_iso = pending.get("starts_at") or state.starts_at
    addon_ids = pending.get("addon_ids") or state.addon_ids or []
    name = pending.get("client_name")
    phone = pending.get("client_phone")
    bot = get_bot()
    if not svc_id or not starts_at_iso:
        await bot.send_message(
            chat_id=chat_id,
            text="Не хватает данных для записи. Давайте начнём заново — напишите, на какую процедуру.",
            business_connection_id=business_connection_id,
        )
        state.reset()
        conversation.flow_state = state.to_dict()
        return
    svc = await session.get(Service, svc_id)
    client = await session.get(Client, conversation.client_id)
    if client is not None:
        if name and not (client.name or "").strip():
            client.name = name
        if phone and not (client.phone or "").strip():
            client.phone = phone
    starts_at = datetime.fromisoformat(starts_at_iso)
    try:
        booking = await create_booking(
            session,
            master=master,
            client=client,
            service=svc,
            starts_at=starts_at,
            source="bot_hybrid",
            addon_ids=list(addon_ids),
        )
    except BookingError as e:
        log.warning("hybrid finalize_booking failed: %s", e)
        await bot.send_message(
            chat_id=chat_id,
            text=(
                "Это время только что заняли. Подберём другое — "
                "напишите, какой день удобен."
            ),
            business_connection_id=business_connection_id,
        )
        state.reset()
        conversation.flow_state = state.to_dict()
        return
    tz = _master_tz(master)
    starts_local = booking.starts_at.astimezone(tz)
    weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[starts_local.weekday()]
    addon_names_line = ""
    if booking.addon_ids:
        names = (
            (
                await session.execute(
                    select(ServiceAddon.name).where(
                        ServiceAddon.id.in_(booking.addon_ids)
                    )
                )
            )
            .scalars()
            .all()
        )
        if names:
            addon_names_line = " + " + ", ".join(names)
    text = (
        "Спасибо, записала вас!\n"
        f"📅 {weekday_short} {starts_local:%d.%m} в {starts_local:%H:%M}\n"
        f"💅 {svc.name}{addon_names_line}"
    )
    if booking.price is not None:
        text += f"\n💰 {int(booking.price)} ₽"
    await bot.send_message(
        chat_id=chat_id,
        text=text,
        business_connection_id=business_connection_id,
    )
    state.reset()
    conversation.flow_state = state.to_dict()


# ============================================================ Q&A branch


@router.callback_query(F.data.startswith("ask:"))
async def on_ask(callback: CallbackQuery) -> None:
    msg = callback.message
    if msg is None or msg.business_connection_id is None or callback.data is None:
        await callback.answer()
        return
    business_connection_id = msg.business_connection_id
    chat_id = msg.chat.id
    client_tg_id = callback.from_user.id if callback.from_user else None
    data = callback.data[len("ask:"):]

    async with session_factory() as session:
        ctx = await _resolve_context(
            session=session,
            business_connection_id=business_connection_id,
            chat_id=chat_id,
            client_tg_id=client_tg_id,
        )
        if ctx is None:
            await callback.answer()
            return
        master, conversation, state = ctx
        try:
            if data == "start":
                items = (
                    (
                        await session.execute(
                            select(KnowledgeBaseItem)
                            .where(
                                KnowledgeBaseItem.master_id == master.id,
                                KnowledgeBaseItem.content.isnot(None),
                            )
                            .order_by(
                                KnowledgeBaseItem.position,
                                KnowledgeBaseItem.id,
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                items = [
                    i for i in items if (i.content or "").strip()
                ]
                if not items:
                    state.step = "qa_topics"
                    await _send_menu(
                        session=session,
                        conversation=conversation,
                        state=state,
                        business_connection_id=business_connection_id,
                        chat_id=chat_id,
                        text="Пока нет готовых ответов. Задайте вопрос — отвечу лично.",
                        keyboard=kb.kb_qa_answer(),
                    )
                else:
                    state.step = "qa_topics"
                    await _send_menu(
                        session=session,
                        conversation=conversation,
                        state=state,
                        business_connection_id=business_connection_id,
                        chat_id=chat_id,
                        text="О чём хотите узнать?",
                        keyboard=kb.kb_qa_topics(items),
                    )
            elif data == "back":
                state.reset()
                await _render_root(
                    session=session,
                    master=master,
                    conversation=conversation,
                    state=state,
                    business_connection_id=business_connection_id,
                    chat_id=chat_id,
                )
            elif data.startswith("topic:"):
                topic_id = int(data.split(":", 1)[1])
                item = await session.get(KnowledgeBaseItem, topic_id)
                if (
                    item is None
                    or item.master_id != master.id
                    or not (item.content or "").strip()
                ):
                    text = "Эта тема пока не настроена."
                else:
                    text = f"*{item.title}*\n\n{item.content.strip()}"
                state.step = "qa_answer"
                state.qa_topic = str(topic_id)
                await _send_menu(
                    session=session,
                    conversation=conversation,
                    state=state,
                    business_connection_id=business_connection_id,
                    chat_id=chat_id,
                    text=text,
                    keyboard=kb.kb_qa_answer(),
                )
            await session.commit()
        except Exception:
            log.exception("ask callback handler failed (data=%r)", data)
            await session.rollback()
    await callback.answer()


# ============================================================ helpers


async def _resolve_context(
    *,
    session: AsyncSession,
    business_connection_id: str,
    chat_id: int,
    client_tg_id: int | None,
) -> tuple[Master, Conversation, FlowState] | None:
    conn = (
        await session.execute(
            select(BusinessConnectionModel).where(
                BusinessConnectionModel.telegram_business_connection_id
                == business_connection_id,
                BusinessConnectionModel.is_enabled.is_(True),
            )
        )
    ).scalar_one_or_none()
    if conn is None:
        return None
    master = await session.get(Master, conn.master_id)
    if master is None:
        return None
    tg_id = client_tg_id or chat_id
    client = (
        await session.execute(
            select(Client).where(
                Client.master_id == master.id, Client.telegram_id == tg_id
            )
        )
    ).scalar_one_or_none()
    if client is None:
        client = Client(master_id=master.id, telegram_id=tg_id)
        session.add(client)
        await session.flush()
    conv = (
        await session.execute(
            select(Conversation).where(
                Conversation.master_id == master.id,
                Conversation.client_id == client.id,
            )
        )
    ).scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            master_id=master.id,
            client_id=client.id,
            state=ConversationState.BOT,
        )
        session.add(conv)
        await session.flush()
    state = FlowState.from_dict(conv.flow_state)
    return master, conv, state


async def _categories_in_use(session: AsyncSession, master_id: int) -> set[int]:
    rows = (
        (
            await session.execute(
                select(Service.category_id).where(
                    Service.master_id == master_id,
                    Service.is_active.is_(True),
                    Service.category_id.isnot(None),
                )
            )
        )
        .scalars()
        .all()
    )
    return {r for r in rows if r is not None}


async def _addons_extra_minutes(
    session: AsyncSession, addon_ids: list[int]
) -> int:
    if not addon_ids:
        return 0
    rows = (
        (
            await session.execute(
                select(ServiceAddon).where(ServiceAddon.id.in_(addon_ids))
            )
        )
        .scalars()
        .all()
    )
    return sum(int(a.duration_delta or 0) for a in rows)


async def _addons_summary(
    session: AsyncSession, addon_ids: list[int]
) -> tuple[list[str], int, Decimal]:
    if not addon_ids:
        return [], 0, Decimal("0")
    rows = (
        (
            await session.execute(
                select(ServiceAddon).where(ServiceAddon.id.in_(addon_ids))
            )
        )
        .scalars()
        .all()
    )
    names = [a.name for a in rows]
    extra_min = sum(int(a.duration_delta or 0) for a in rows)
    extra_pr = sum((Decimal(a.price_delta or 0) for a in rows), Decimal("0"))
    return names, extra_min, extra_pr


async def _build_summary(
    *,
    session: AsyncSession,
    master: Master,
    conversation: Conversation,
    state: FlowState,
) -> str:
    svc = await session.get(Service, state.service_id)
    addon_names, extra_min, extra_pr = await _addons_summary(
        session, state.addon_ids
    )
    client = await session.get(Client, conversation.client_id)
    tz = _master_tz(master)
    starts_local = datetime.fromisoformat(state.starts_at).astimezone(tz)  # type: ignore[arg-type]
    weekday_short = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")[starts_local.weekday()]
    total_min = (svc.duration_minutes if svc else 0) + extra_min
    total_pr = (Decimal(svc.price) if svc and svc.price else Decimal("0")) + extra_pr
    parts = ["Подтверждаете запись?"]
    if client and client.name:
        line = f"👤 {client.name}"
        if client.phone:
            line += f" · {client.phone}"
        parts.append(line)
    parts.append(f"💅 {svc.name if svc else 'услуга'}")
    if addon_names:
        parts.append("    + " + ", ".join(addon_names))
    parts.append(f"📅 {weekday_short} {starts_local:%d.%m} в {starts_local:%H:%M} ({total_min} мин)")
    if total_pr > 0:
        parts.append(f"💰 {int(total_pr)} ₽")
    return "\n".join(parts)


async def _available_days_for_month(
    *,
    session: AsyncSession,
    master: Master,
    service_id: int | None,
    addon_ids: list[int],
    year: int,
    month: int,
) -> set[date]:
    """Return all calendar dates inside `year`/`month` on which at least
    one slot of length (service.duration + addon deltas) fits the master's
    schedule, breaks, time-offs, and existing bookings."""
    if service_id is None:
        return set()
    svc = await session.get(Service, service_id)
    if svc is None:
        return set()
    extra_minutes = await _addons_extra_minutes(session, addon_ids)
    tz = _master_tz(master)
    today_local = datetime.now(tz).date()
    first = date(year, month, 1)
    if month == 12:
        last = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    start_search = max(first, today_local)
    if start_search > last:
        return set()
    days_ahead = (last - start_search).days + 1
    res = await find_available_slots(
        session,
        master=master,
        service=svc,
        from_date=start_search,
        days_ahead=days_ahead,
        extra_minutes=extra_minutes,
    )
    out: set[date] = set()
    for s in res.slots:
        out.add(s.starts_at.astimezone(tz).date())
    return out


def _master_tz(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")
