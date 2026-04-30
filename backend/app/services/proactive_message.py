"""Static templates for proactive messages — return invitations and service
reminders. Picked by master.voice_tone so the wording matches the bot's voice.

Kept template-based (not LLM) for cost predictability. Can be swapped for
LLM generation later if richer wording is needed.
"""

from __future__ import annotations

from typing import Literal

ProactiveKind = Literal["return", "service_reminder"]

# {name} — client name (may be empty); use a graceful fallback
# {pct}, {until} — return params
# {service} — service name for service reminders
# {days} — days since last visit (service reminder)
RETURN_TEMPLATES: dict[str, str] = {
    "warm": (
        "{greet}, давно вас не было. Готовлю скидку {pct}% специально для вас — "
        "действует до {until}. Хотите подобрать удобное время?"
    ),
    "neutral": (
        "{greet}. Давно не виделись. Дарю скидку {pct}% до {until}. "
        "Подобрать время на ближайшие дни?"
    ),
    "casual": (
        "{greet}, привет! Совсем забегалась? Держи скидку {pct}% до {until}. "
        "Если хочется — давай подберём удобное время."
    ),
}

SERVICE_REMINDER_TEMPLATES: dict[str, str] = {
    "warm": (
        "{greet}, прошло {days} дней с последней процедуры ({service}). "
        "Если хотите повторить — напишите, подберу удобное время."
    ),
    "neutral": (
        "{greet}. {days} дней с последней процедуры ({service}). "
        "Если планируете повторить — отвечу с вариантами времени."
    ),
    "casual": (
        "{greet}, прошло уже {days} дней с того маникюра ({service}) :) "
        "Хочешь повторить? Напиши — подберём время."
    ),
}


def _greet(name: str | None, voice_tone: str) -> str:
    name_part = name.strip() if name else ""
    if voice_tone == "casual":
        return name_part or "Привет"
    return name_part or "Здравствуйте"


def render_return(
    *, voice_tone: str, client_name: str | None, discount_percent: int, valid_until_str: str
) -> str:
    template = RETURN_TEMPLATES.get(voice_tone, RETURN_TEMPLATES["warm"])
    return template.format(
        greet=_greet(client_name, voice_tone),
        pct=discount_percent,
        until=valid_until_str,
    )


def render_service_reminder(
    *,
    voice_tone: str,
    client_name: str | None,
    service_name: str,
    days_since_visit: int,
) -> str:
    template = SERVICE_REMINDER_TEMPLATES.get(voice_tone, SERVICE_REMINDER_TEMPLATES["warm"])
    return template.format(
        greet=_greet(client_name, voice_tone),
        days=days_since_visit,
        service=service_name,
    )
