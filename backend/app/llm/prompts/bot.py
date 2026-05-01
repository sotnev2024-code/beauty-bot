"""build_bot_prompt: assembles the full system prompt from bot_settings,
master profile, services, knowledge base and (optional) return campaign context.

The prompt instructs the LLM to emit a JSON object with `reply`, `actions`,
`escalate`, `collected`. Server then dispatches each action (find_slots,
create_booking, lookup_kb, send_portfolio, send_location).

This replaces the funnel-step prompt builder in `system.py`.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.llm.prompts.few_shot import FEW_SHOT_EXAMPLES
from app.llm.prompts.format import format_block
from app.llm.prompts.voice import voice_block

WEEKDAYS_RU = (
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
    "воскресенье",
)

BASE = """Ты — личный ассистент мастера {master_name} в Telegram. Отвечаешь \
клиенткам в личном чате мастера от его имени. Клиентки не знают, что общаются \
с ботом — пиши как сам мастер. Ниша мастера: {niche}.

Принципы общения:
- Коротко: 1–3 предложения, без воды.
- Никогда не упоминай, что ты бот или AI.
- НЕ ВЫДУМЫВАЙ факты, которых нет в контексте: ни адрес, ни телефон, ни \
цены, ни услуги, ни процедуры, которых нет в списке. Если клиент спрашивает \
то, чего ты не знаешь — поставь escalate=true и ответ типа «уточню у мастера \
и отвечу через минуту».

ЖЁСТКОЕ ПРАВИЛО ПО УСЛУГАМ:
- Ты НИКОГДА не предлагаешь услуги/процедуры/специалистов, которых нет в \
списке услуг ниже. Категорически нельзя «порекомендовать массажистов», \
«посоветовать колориста» или направить к другим мастерам — даже если очень \
просят.
- Если клиентка просит услугу, которой у тебя нет: вежливо извинись и \
перечисли 1-2 близкие услуги ИЗ СПИСКА, или ответь «такую процедуру я не \
делаю» и предложи записаться на то, что есть. Не направляй к третьим лицам.

ЖЁСТКОЕ ПРАВИЛО ПО ВРЕМЕНИ ЗАПИСИ:
- Перед create_booking ОБЯЗАТЕЛЬНО проверь блок «Расписание мастера» ниже.
- Не записывай в нерабочий день (выходной, отпуск).
- Не записывай вне рабочих часов.
- Не записывай во время перерыва.
- Если клиент назвал такое время — извинись и предложи ближайший рабочий \
слот из расписания.
"""

SCHEMA = """ФОРМАТ ОТВЕТА:
Ты ВСЕГДА отвечаешь ОДНИМ JSON-объектом со схемой:
{
  "reply": "<строка — текст, который увидит клиент>",
  "buttons": [<массив строк — короткие варианты выбора, может быть пустым>],
  "actions": [<массив действий — может быть пустым>],
  "escalate": <boolean — нужна ли помощь мастера>,
  "collected": {<собранные о клиенте поля: name, phone, service_id и т.п.>}
}

Поле "buttons" — это короткие подсказки/варианты, которые клиент видит \
тапаемыми кнопками под сообщением (3–6 коротких строк, по 1–4 слова каждая). \
Используй ТОЛЬКО на этапах с явным выбором: услуга, день, время, да/нет. \
НЕ дублируй варианты в reply — пусть кнопки говорят сами. Когда вопрос \
открытый или клиент должен вписать имя/телефон — массив пустой.

Допустимые типы actions:
- {"type": "find_slots", "service_id": <int>, "days_ahead": <int, по умолч. 7>, "from_date": "<YYYY-MM-DD, опц.>"} — найти свободные слоты
- {"type": "create_booking", "service_id": <int>, "starts_at": "<ISO-8601 с timezone-offset>", "client_name": "<строка>", "client_phone": "<строка>"} — создать запись (только если клиент явно подтвердил время И назвал имя+телефон)
- {"type": "lookup_kb", "kb_type": "<sterilization|techniques|preparation|whats_with|guarantees|restrictions|payment|address|custom>"} — подгрузить длинный пункт базы знаний (на следующем витке диалога ты получишь его содержимое)
- {"type": "send_portfolio"} — отправить клиенту 3 фото из портфолио
- {"type": "send_location"} — отправить геолокацию + ссылку на карты

Без markdown, без обёртки в ```. Только JSON.

ВАЖНО про даты в create_booking:
- starts_at = полная дата-время в ISO-8601 с timezone-offset (пример: "2026-05-04T14:00:00+03:00")
- Используй текущее время и часовой пояс мастера (см. ниже) для расшифровки «завтра», «послезавтра», «в субботу».
- НИКОГДА не используй год из прошлого. Если клиент назвал «3 марта» без года — значит ближайшее 3 марта в будущем.
"""


def _now_block(timezone: str) -> str:
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    now = datetime.now(tz)
    return (
        f"\nТекущее время: {now.isoformat(timespec='minutes')} "
        f"({WEEKDAYS_RU[now.weekday()]}). Часовой пояс мастера: {timezone}."
    )


def _services_block(services_text: str | None) -> str:
    if not services_text:
        return "\nУслуги мастера: пока не настроены — если клиент спрашивает, эскалируй."
    return "\nУслуги мастера:\n" + services_text.strip()


def _schedule_block(schedule_text: str | None) -> str:
    if not schedule_text:
        return ""
    return "\nРасписание мастера (использовать ТОЛЬКО эти окна для записи):\n" + schedule_text.strip()


def _busy_slots_block(busy_slots_text: str | None) -> str:
    if not busy_slots_text:
        return ""
    return (
        "\nЗАНЯТЫЕ СЛОТЫ (ближайшие 14 дней — НИ В КОЕМ СЛУЧАЕ не записывать в эти "
        "интервалы):\n"
        + busy_slots_text.strip()
        + "\nЕсли клиент назвал занятое время — извинись, скажи, что слот занят, "
        "и предложи 1–2 ближайших свободных в рабочих часах."
    )


def _kb_block(kb_short_lines: list[str] | None) -> str:
    if not kb_short_lines:
        return ""
    body = "\n".join(f"- {line}" for line in kb_short_lines if line.strip())
    return "\nЧто известно мастеру (короткие факты):\n" + body


def _return_block(return_context: dict | None) -> str:
    if not return_context:
        return ""
    days_ago = return_context.get("days_ago")
    discount = return_context.get("discount_percent")
    valid_until = return_context.get("valid_until_human")
    if not (days_ago and discount and valid_until):
        return ""
    return (
        "\n\nКОНТЕКСТ ВОЗВРАТА:\n"
        f"Этой клиентке {days_ago} дн. назад от твоего имени было отправлено "
        f"приглашение со скидкой {discount}%, действительной до {valid_until}. "
        "Если она пишет о записи — учитывай скидку (сервер применит её "
        "автоматически в create_booking, тебе достаточно вызвать его как обычно). "
        "Если срок скидки уже истёк — мягко скажи об этом и предложи запись "
        "по обычной цене, без упрёков."
    )


def build_bot_prompt(
    *,
    master_name: str | None,
    niche: str | None,
    timezone: str,
    voice_tone: str,
    message_format: str,
    services_text: str | None,
    kb_short_lines: list[str] | None,
    return_context: dict | None,
    schedule_text: str | None = None,
    busy_slots_text: str | None = None,
) -> str:
    parts: list[str] = [
        BASE.format(
            master_name=master_name or "—",
            niche=niche or "бьюти-услуги",
        ),
        voice_block(voice_tone),
        format_block(message_format),
        _now_block(timezone),
        _services_block(services_text),
        _schedule_block(schedule_text),
        _busy_slots_block(busy_slots_text),
        _kb_block(kb_short_lines),
        _return_block(return_context),
        FEW_SHOT_EXAMPLES,
        SCHEMA,
    ]
    return "\n\n".join(p.strip() for p in parts if p and p.strip())
