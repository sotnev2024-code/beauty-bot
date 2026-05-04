"""Inline-keyboard builders for the deterministic button-only flow.

callback_data format: «<scope>:<verb>[:<arg>]» — must stay ≤ 64 bytes
(Telegram's hard cap). Scopes:
  * bk:*   — booking funnel
  * ask:*  — knowledge-base question branch
  * noop   — disabled cells (occupied days/slots, day-off)
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.models import KnowledgeBaseItem, Service, ServiceAddon, ServiceCategory

# ---------------------------------------------------------------- common


def _row(*btns: InlineKeyboardButton) -> list[InlineKeyboardButton]:
    return [b for b in btns if b is not None]


_BACK_BTN = InlineKeyboardButton(text="← Назад", callback_data="bk:back")
_CANCEL_BTN = InlineKeyboardButton(text="✕ Отмена", callback_data="bk:cancel")
_NOOP = "noop"

WEEKDAY_HEADERS = ("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
RU_MONTHS = (
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
)


# ---------------------------------------------------------------- root


def kb_root() -> InlineKeyboardMarkup:
    """Greeting screen — two top-level actions."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📅 Записаться", callback_data="bk:start")],
            [InlineKeyboardButton(text="❓ Задать вопрос", callback_data="ask:start")],
        ]
    )


# ---------------------------------------------------------------- categories


def kb_categories(categories: list[ServiceCategory]) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=c.name, callback_data=f"bk:cat:{c.id}")]
        for c in categories
    ]
    rows.append([_BACK_BTN, _CANCEL_BTN])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------- services


def kb_services(services: list[Service]) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    for s in services:
        price = _format_price(s.price)
        label = f"{s.name} · {s.duration_minutes}м · {price}"
        # Telegram caps button text at ~64 visible chars; truncate.
        if len(label) > 60:
            label = label[:59] + "…"
        rows.append(
            [InlineKeyboardButton(text=label, callback_data=f"bk:svc:{s.id}")]
        )
    rows.append([_BACK_BTN, _CANCEL_BTN])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------- addons


def kb_addons(
    addons: list[ServiceAddon], selected: set[int]
) -> InlineKeyboardMarkup:
    """Pick the right widget based on count:
      * 1 addon  → 2 single-select buttons («Без добавок» / «+ Имя»);
                   tap immediately advances to the next step.
      * 2+ addons → multi-select with ✅/⬜ checkmarks + a «Далее» button.
    Toggle is handled by the bk:addon callback: single-select replaces
    state.addon_ids with [tapped]; multi-select toggles the value.
    """
    rows: list[list[InlineKeyboardButton]] = []
    if len(addons) == 1:
        a = addons[0]
        rows.append(
            [
                InlineKeyboardButton(
                    text="Без добавок",
                    callback_data="bk:addon-single:none",
                )
            ]
        )
        delta_min = f"+{a.duration_delta}м" if a.duration_delta else "0м"
        delta_pr = (
            f"+{int(a.price_delta)}₽" if a.price_delta and a.price_delta > 0
            else "0₽"
        )
        label = f"+ {a.name} ({delta_min}, {delta_pr})"
        if len(label) > 60:
            label = label[:59] + "…"
        rows.append(
            [
                InlineKeyboardButton(
                    text=label,
                    callback_data=f"bk:addon-single:{a.id}",
                )
            ]
        )
        rows.append([_BACK_BTN, _CANCEL_BTN])
        return InlineKeyboardMarkup(inline_keyboard=rows)

    # 2+ — multi-select
    for a in addons:
        check = "✅" if a.id in selected else "⬜"
        delta_min = f"+{a.duration_delta}м" if a.duration_delta else "0м"
        delta_pr = (
            f"+{int(a.price_delta)}₽" if a.price_delta and a.price_delta > 0
            else "0₽"
        )
        label = f"{check} {a.name} ({delta_min}, {delta_pr})"
        if len(label) > 60:
            label = label[:59] + "…"
        rows.append(
            [InlineKeyboardButton(text=label, callback_data=f"bk:addon:{a.id}")]
        )
    rows.append(
        [InlineKeyboardButton(text="Далее →", callback_data="bk:addons-done")]
    )
    rows.append([_BACK_BTN, _CANCEL_BTN])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------- calendar


def kb_calendar(
    *,
    year: int,
    month: int,
    today: date,
    available_days: set[date],
    earliest_navigable: date | None = None,
) -> InlineKeyboardMarkup:
    """Render a month-grid keyboard.

    `available_days` — only these days are tappable. Everything else
    in the month renders as a non-clickable placeholder so the client
    can see the day exists but it's not bookable (day-off, time-off,
    fully booked, or in the past).

    `earliest_navigable` — first calendar day for which we still have
    seedable bookings; default = first day of `today.replace(day=1)`.
    Used to disable the «← Prev» button when at the earliest month.
    """
    title = f"{RU_MONTHS[month - 1].capitalize()} {year}"
    rows: list[list[InlineKeyboardButton]] = [
        [InlineKeyboardButton(text=title, callback_data=_NOOP)]
    ]

    rows.append(
        [
            InlineKeyboardButton(text=h, callback_data=_NOOP)
            for h in WEEKDAY_HEADERS
        ]
    )

    # 6×7 grid. `monthcalendar` returns weeks of (day-of-month or 0).
    for week in calendar.monthcalendar(year, month):
        row: list[InlineKeyboardButton] = []
        for d in week:
            if d == 0:
                row.append(InlineKeyboardButton(text=" ", callback_data=_NOOP))
                continue
            day = date(year, month, d)
            if day in available_days:
                mark = "•" if day == today else ""
                row.append(
                    InlineKeyboardButton(
                        text=f"{mark}{d}",
                        callback_data=f"bk:day:{day.isoformat()}",
                    )
                )
            else:
                # Not bookable — show as muted placeholder so the user
                # still sees there's a day there, just not for them.
                if day < today:
                    label = f"·{d}·"
                else:
                    label = f"✕"  # day-off, vacation, or fully booked
                row.append(InlineKeyboardButton(text=label, callback_data=_NOOP))
        rows.append(row)

    nav_row: list[InlineKeyboardButton] = []
    earliest = earliest_navigable or today.replace(day=1)
    prev_year, prev_month = (year, month - 1) if month > 1 else (year - 1, 12)
    prev_first = date(prev_year, prev_month, 1)
    if prev_first >= earliest.replace(day=1):
        nav_row.append(
            InlineKeyboardButton(
                text="← Прошлый",
                callback_data=f"bk:cal:{prev_year}-{prev_month:02d}",
            )
        )
    next_year, next_month = (year, month + 1) if month < 12 else (year + 1, 1)
    nav_row.append(
        InlineKeyboardButton(
            text="Следующий →",
            callback_data=f"bk:cal:{next_year}-{next_month:02d}",
        )
    )
    rows.append(nav_row)
    rows.append([_BACK_BTN, _CANCEL_BTN])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------- time slots


def kb_time_slots(slot_times: list[str]) -> InlineKeyboardMarkup:
    """`slot_times` = list of «HH:MM» strings, master-tz-local."""
    rows: list[list[InlineKeyboardButton]] = []
    bucket: list[InlineKeyboardButton] = []
    for t in slot_times:
        bucket.append(InlineKeyboardButton(text=t, callback_data=f"bk:time:{t}"))
        if len(bucket) == 3:
            rows.append(bucket)
            bucket = []
    if bucket:
        rows.append(bucket)
    if not rows:
        # Edge case: no slots — handled at handler level by skipping
        # straight to a different day, but render a polite back button.
        rows.append(
            [InlineKeyboardButton(text="Нет свободного времени", callback_data=_NOOP)]
        )
    rows.append([_BACK_BTN, _CANCEL_BTN])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------- contacts/confirm


def kb_contacts_pending() -> InlineKeyboardMarkup:
    """While we wait for the «Имя +телефон» message — only Back/Cancel."""
    return InlineKeyboardMarkup(inline_keyboard=[[_BACK_BTN, _CANCEL_BTN]])


def kb_confirm() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✅ Подтвердить", callback_data="bk:confirm")],
            [_BACK_BTN, _CANCEL_BTN],
        ]
    )


def kb_after_booking() -> InlineKeyboardMarkup:
    """Shown after a successful create_booking — quick way to start over."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📅 Записаться ещё раз", callback_data="bk:start")],
            [InlineKeyboardButton(text="❓ Задать вопрос", callback_data="ask:start")],
        ]
    )


# ---------------------------------------------------------------- KB / Q&A


def kb_qa_topics(items: list[KnowledgeBaseItem]) -> InlineKeyboardMarkup:
    """List every filled KB item the master configured. Each tap opens
    a screen showing the item's content with a Back button."""
    rows: list[list[InlineKeyboardButton]] = []
    for it in items:
        label = it.title if len(it.title) <= 60 else it.title[:59] + "…"
        rows.append(
            [
                InlineKeyboardButton(
                    text=label,
                    callback_data=f"ask:topic:{it.id}",
                )
            ]
        )
    rows.append([InlineKeyboardButton(text="← Назад", callback_data="ask:back")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def kb_qa_answer() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="← К темам", callback_data="ask:start")],
            [InlineKeyboardButton(text="📅 Записаться", callback_data="bk:start")],
        ]
    )


# ---------------------------------------------------------------- helpers


def _format_price(price: Decimal | None) -> str:
    if price is None:
        return "по запросу"
    try:
        return f"{int(price)}₽"
    except Exception:
        return f"{price}₽"
