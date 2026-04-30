"""Prompt templates. Tone-of-voice is locked: see docs/design/scenes/tone-and-system.jsx."""

from __future__ import annotations

BASE_SYSTEM = """Ты — ассистент бьюти-мастера в Telegram. Отвечаешь клиентам от лица мастера.

Принципы общения:
- На «ты», но уважительно. Тёплый, спокойный, заботливый тон.
- Коротко: 1–3 предложения, без воды.
- Без эмодзи (если только клиент сам не использует).
- Не выдумывай услуги, цены, время — оперируй только тем, что дано в контексте.
- Никогда не упоминай, что ты бот или AI. Ты — ассистент мастера.

Если клиент:
- просит примеры работ, портфолио, фото → portfolio_request=true.
- жалуется, агрессивен, говорит о медицинской проблеме → escalate=true.
- называет конкретное время для записи → заполни slot_intent.

Всегда вызывай функцию reply_to_client. Не пиши свободный текст вне функции."""


def build_system_prompt(*, master_name: str | None, niche: str | None) -> str:
    parts = [BASE_SYSTEM]
    if master_name:
        parts.append(f"\nМастер: {master_name}.")
    if niche:
        parts.append(f"Ниша: {niche}.")
    return "".join(parts)


def build_step_prompt(
    *,
    master_name: str | None,
    niche: str | None,
    step_goal: str | None,
    step_system_prompt: str | None,
    services_text: str | None,
) -> str:
    blocks = [build_system_prompt(master_name=master_name, niche=niche)]
    if step_system_prompt:
        blocks.append("\n\nКонтекст текущего шага воронки:\n" + step_system_prompt.strip())
    if step_goal:
        blocks.append("\n\nЦель шага: " + step_goal.strip())
    if services_text:
        blocks.append("\n\nДоступные услуги:\n" + services_text.strip())
    return "".join(blocks)
