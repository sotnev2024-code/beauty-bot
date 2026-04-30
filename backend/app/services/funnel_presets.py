"""4 ready-made funnel presets — see DEV_PROMPT.md (Stage 5)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.models.enums import FunnelType


@dataclass(slots=True, frozen=True)
class PresetStep:
    position: int
    system_prompt: str
    goal: str | None
    collected_fields: list[str] | None = None
    transition_conditions: dict[str, Any] | None = None


@dataclass(slots=True, frozen=True)
class FunnelPreset:
    key: str
    name: str
    type: FunnelType
    steps: list[PresetStep]


MANICURE = FunnelPreset(
    key="manicure",
    name="Маникюр / педикюр",
    type=FunnelType.MAIN,
    steps=[
        PresetStep(
            position=0,
            goal="Поприветствовать и узнать, какая услуга интересна.",
            system_prompt=(
                "Это первый контакт. Тепло поздоровайся, представь мастера и "
                "спроси, что интересует: классический маникюр, аппаратный, с покрытием, "
                "педикюр или комбо."
            ),
            collected_fields=["service_intent"],
        ),
        PresetStep(
            position=1,
            goal="Уточнить детали и предпочтения по дизайну.",
            system_prompt=(
                "Услуга названа. Уточни: пожелания по форме, длине, дизайн (френч, "
                "однотон, рисунок). Если клиент не уверен — предложи 2-3 варианта."
            ),
            collected_fields=["design_preference"],
        ),
        PresetStep(
            position=2,
            goal="Предложить ближайшие свободные слоты.",
            system_prompt=(
                "Услуга и дизайн ясны. Из доступных услуг подбери подходящую и предложи "
                "2-3 ближайших слота. Спроси, какое время удобно."
            ),
        ),
        PresetStep(
            position=3,
            goal="Подтвердить запись и собрать имя/телефон.",
            system_prompt=(
                "Клиент выбрал время. Подтверди слот, попроси имя и телефон для записи. "
                "Когда всё собрано — заполни slot_intent объектом {starts_at, service_id}."
            ),
            collected_fields=["name", "phone"],
        ),
    ],
)

BROWS_LASHES = FunnelPreset(
    key="brows_lashes",
    name="Брови / ресницы",
    type=FunnelType.MAIN,
    steps=[
        PresetStep(
            position=0,
            goal="Поприветствовать, понять интерес.",
            system_prompt=(
                "Тепло поздоровайся. Спроси, что интересует: оформление бровей, "
                "окрашивание, ламинирование, ресницы (наращивание/ламинирование)."
            ),
            collected_fields=["service_intent"],
        ),
        PresetStep(
            position=1,
            goal="Уточнить пожелания и опыт.",
            system_prompt=(
                "Услуга названа. Уточни эффект: натуральный, выразительный, как "
                "обычно. Спроси, делал(а) ли что-то подобное раньше."
            ),
            collected_fields=["preferred_effect"],
        ),
        PresetStep(
            position=2,
            goal="Предложить слоты.",
            system_prompt="Подбери услугу и предложи 2-3 ближайших слота.",
        ),
        PresetStep(
            position=3,
            goal="Подтвердить запись.",
            system_prompt=(
                "Подтверди время, попроси имя и телефон. По готовности заполни " "slot_intent."
            ),
            collected_fields=["name", "phone"],
        ),
    ],
)

RETURN = FunnelPreset(
    key="return",
    name="Возврат постоянной",
    type=FunnelType.RETURN,
    steps=[
        PresetStep(
            position=0,
            goal="Тёплое касание после паузы.",
            system_prompt=(
                "Это постоянная клиентка, давно не была. Без давления напомни о себе, "
                "поинтересуйся, как дела, и предложи записаться на привычную услугу."
            ),
            collected_fields=["interest"],
        ),
        PresetStep(
            position=1,
            goal="Предложить слоты.",
            system_prompt=(
                "Если интерес есть — предложи 2-3 ближайших слота, можно "
                "адаптировать под её привычное расписание."
            ),
        ),
        PresetStep(
            position=2,
            goal="Подтвердить запись.",
            system_prompt=(
                "Зафиксируй время, проверь актуальность телефона. По готовности — " "slot_intent."
            ),
            collected_fields=["name", "phone"],
        ),
    ],
)

COLD = FunnelPreset(
    key="cold",
    name="Холодная заявка",
    type=FunnelType.COLD,
    steps=[
        PresetStep(
            position=0,
            goal="Понять источник и потребность.",
            system_prompt=(
                "Это незнакомый клиент. Узнай, как нашёл мастера, и что именно " "интересует."
            ),
            collected_fields=["source", "service_intent"],
        ),
        PresetStep(
            position=1,
            goal="Снять возражения, рассказать о подходе.",
            system_prompt=(
                "Расскажи коротко о подходе мастера (опыт, материалы, как проходит "
                "процедура), ответь на сомнения. Не дави."
            ),
        ),
        PresetStep(
            position=2,
            goal="Предложить слоты, если есть интерес.",
            system_prompt="Если интерес есть — предложи 2-3 ближайших слота.",
        ),
        PresetStep(
            position=3,
            goal="Подтвердить запись.",
            system_prompt=("Фиксируй время, имя, телефон. По готовности — slot_intent."),
            collected_fields=["name", "phone"],
        ),
    ],
)


PRESETS: dict[str, FunnelPreset] = {p.key: p for p in (MANICURE, BROWS_LASHES, RETURN, COLD)}


def get_preset(key: str) -> FunnelPreset:
    if key not in PRESETS:
        raise KeyError(f"unknown preset: {key}")
    return PRESETS[key]


def list_presets() -> list[FunnelPreset]:
    return list(PRESETS.values())
