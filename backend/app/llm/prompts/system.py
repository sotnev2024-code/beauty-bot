"""Prompt templates. Tone-of-voice is locked: see docs/design/scenes/tone-and-system.jsx."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

BASE_SYSTEM = """Ты — ассистент бьюти-мастера в Telegram. Отвечаешь клиентам от лица мастера.

Принципы общения:
- На «ты», но уважительно. Тёплый, спокойный, заботливый тон.
- Коротко: 1–3 предложения, без воды.
- Без эмодзи (если только клиент сам не использует).
- НЕ ВЫДУМЫВАЙ факты, которых нет в контексте: ни адрес, ни телефон,
  ни цены, ни услуги. Если клиент спрашивает то, чего ты не знаешь —
  скажи «уточню у мастера и вернусь» и поставь escalate=true.
- Никогда не упоминай, что ты бот или AI. Ты — ассистент мастера.

Если клиент:
- просит примеры работ, портфолио, фото → portfolio_request=true.
- жалуется, агрессивен, говорит о медицинской проблеме → escalate=true.
- называет конкретное время и подтвердил его → ОБЯЗАТЕЛЬНО заполни
  slot_intent объектом {starts_at, service_id}, где starts_at — полная
  дата-время в ISO-8601 с timezone-offset (пример: "2026-05-01T10:00:00+03:00").
  Используй current_time + текущий timezone мастера для расшифровки
  «завтра», «послезавтра», «в субботу». НИКОГДА не используй год из
  прошлого."""


def _now_block(timezone: str) -> str:
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    now = datetime.now(tz)
    weekdays_ru = [
        "понедельник",
        "вторник",
        "среда",
        "четверг",
        "пятница",
        "суббота",
        "воскресенье",
    ]
    return (
        f"\n\nТекущее время: {now.isoformat(timespec='minutes')} "
        f"({weekdays_ru[now.weekday()]}). Часовой пояс мастера: {timezone}."
    )


def build_system_prompt(
    *,
    master_name: str | None,
    niche: str | None,
    timezone: str = "Europe/Moscow",
    address: str | None = None,
) -> str:
    parts = [BASE_SYSTEM, _now_block(timezone)]
    if master_name:
        parts.append(f"\nМастер: {master_name}.")
    if niche:
        parts.append(f"Ниша: {niche}.")
    if address:
        parts.append(f"\nАдрес салона: {address}. Сообщай его клиенту после подтверждения записи.")
    return "".join(parts)


def build_step_prompt(
    *,
    master_name: str | None,
    niche: str | None,
    timezone: str = "Europe/Moscow",
    address: str | None = None,
    step_goal: str | None,
    step_system_prompt: str | None,
    services_text: str | None,
) -> str:
    blocks = [
        build_system_prompt(
            master_name=master_name,
            niche=niche,
            timezone=timezone,
            address=address,
        )
    ]
    if step_system_prompt:
        blocks.append("\n\nКонтекст текущего шага воронки:\n" + step_system_prompt.strip())
    if step_goal:
        blocks.append("\n\nЦель шага: " + step_goal.strip())
    if services_text:
        blocks.append("\n\nДоступные услуги:\n" + services_text.strip())
    return "".join(blocks)
