"""Full audit of the Beauty.dev bot — runs realistic conversation scenarios
against the configured LLM provider and produces a markdown report.

Coverage:
  * Conversation flow (greeting, service pick, time, contacts, booking)
  * Edge cases (day-off, break-time, busy slot, past time, garbled time,
    out-of-list services)
  * Knowledge-base questions (address present, sterilization absent →
    escalate, etc.)
  * Add-ons (bot offers addon buttons, picks correct addon_id)
  * Voice tone matrix (warm / neutral / casual)
  * Message-format matrix (text / buttons / hybrid)

Usage on the server:
    docker compose -f docker-compose.host-nginx.yml exec -T backend \
      python scripts/audit_bot.py

Required env (already in /opt/beauty-bot/.env on prod):
    DEEPSEEK_API_KEY     OR    KIE_API_KEY
    LLM_PROVIDER=deepseek (default) or kie

Output:
    Markdown report on stdout.
    /tmp/audit_bot.json — full per-test trace.
"""

from __future__ import annotations

import json
import os
import re
import statistics
import sys
import time
import tempfile
import urllib.error
import urllib.request

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "").strip()
KIE_KEY = os.environ.get("KIE_API_KEY", "").strip()
PROVIDER = os.environ.get("LLM_PROVIDER", "deepseek").strip().lower()
USER_AGENT = "Mozilla/5.0 (Linux x86_64) BeautyDev-Audit/1.0"


# ---------------------------------------------------------------- prompt parts

VOICE_INSTRUCTIONS = {
    "warm": (
        "Тон голоса — тёплый и заботливый. Обращайся на «вы» с уважением. "
        "Используй мягкие формулировки: «с радостью», «конечно», «подскажу»."
    ),
    "neutral": (
        "Тон голоса — нейтрально-деловой. На «вы». Без эмоций, без эмодзи."
    ),
    "casual": (
        "Тон голоса — дружеский, на «ты». Свободные формулировки, можно "
        "«привет», «расскажи», «давай подберу время»."
    ),
}

FORMAT_INSTRUCTIONS = {
    "text": (
        "Формат сообщений — ТОЛЬКО ТЕКСТ. Поле \"buttons\" ВСЕГДА должно быть "
        "пустым массивом `[]`, без исключений. Это критическое правило — "
        "клиенту бот будет отправлять сообщение без какой-либо клавиатуры. "
        "Любая попытка положить варианты в buttons — нарушение настройки "
        "мастера. Если у клиента есть выбор — перечисли варианты в самом "
        "тексте reply через запятую или тире на новой строке."
    ),
    "buttons": (
        "Формат сообщений — кнопочный. Везде, где у клиента есть выбор "
        "(услуга, дата, время, да/нет, ещё-варианты), ОБЯЗАТЕЛЬНО заполняй "
        "массив \"buttons\" короткими 1-4-словными вариантами (3–6 штук). "
        "В reply коротко формулируй вопрос («Какая услуга?» / «Когда удобно?»). "
        "НЕ перечисляй сами варианты в тексте — пусть это делают кнопки."
    ),
    "hybrid": (
        "Формат сообщений — гибрид. На этапах с явным выбором (услуга, "
        "день, время, да/нет/другое) заполняй \"buttons\" 3–6 короткими "
        "вариантами и пиши лаконичный вопрос в reply без перечисления "
        "вариантов. На уточняющих или открытых вопросах (имя, телефон, "
        "пожелания, благодарность) оставляй \"buttons\" пустым и пиши "
        "обычный свободный текст."
    ),
}


SERVICES_BLOCK = """- id=1: Маникюр, 60 мин, 1500 ₽
    + addon id=11: Покрытие гель-лак (+30 мин, +500 ₽)
    + addon id=12: Дизайн на 2 ногтя (+15 мин, +300 ₽)
- id=2: Педикюр, 90 мин, 2500 ₽
- id=3: Брови (коррекция + окрашивание), 30 мин, 800 ₽"""

SCHEDULE_BLOCK = """- Пн: 10:00–20:00 (перерыв 14:00–15:00)
- Вт: 10:00–20:00 (перерыв 14:00–15:00)
- Ср: 10:00–20:00
- Чт: 10:00–20:00
- Пт: 10:00–20:00
- Сб: 12:00–18:00
- Вс: выходной"""

BUSY_SLOTS_BLOCK = """- 04.05 (Пн) 11:00–12:00 — занято
- 06.05 (Ср) 16:00–17:00 — занято"""

KB_BLOCK = """- Адрес и как добраться: г. Казань, ул. Завойского 21бк2. От метро Северный вокзал 7 минут пешком.
- Координаты адрес: 55.760000, 49.180000
- Способы оплаты: наличные, перевод по СБП или картой через терминал.
- Стерилизация и санитария: НЕ УКАЗАНО МАСТЕРОМ — на вопросы по этой теме НИКОГДА не отвечай конкретикой, ставь escalate=true и пиши «уточню у мастера и вернусь»."""


def system_prompt(voice: str, fmt: str, *, today: str = "пятница, 02.05.2026 11:00") -> str:
    return f"""Ты — личный ассистент мастера Анна в Telegram. Ниша: маникюр и брови.

Принципы:
- Коротко: 1–3 предложения.
- Никогда не упоминай, что ты бот.
- НЕ ВЫДУМЫВАЙ факты, которых нет в контексте. Если темы нет — escalate=true.
- НИКОГДА не предлагай услуги/процедуры/специалистов вне списка. Никаких «могу порекомендовать массажистов».

Правило по записи:
- Когда клиент назвал имя И телефон (любой формат) И время согласовано — ОБЯЗАТЕЛЬНО эмить create_booking в том же ответе. Текст «записал» без действия — недопустим.
- При наличии добавок к услуге: после выбора услуги предложи опции кнопками; передай выбранные в addon_ids.

Время записи:
- Не записывай в выходной, отпуск, нерабочие часы или перерыв.
- Не записывай в занятый слот (см. блок «ЗАНЯТЫЕ СЛОТЫ»).
- Если время невалидно — извинись и предложи альтернативу.

{VOICE_INSTRUCTIONS[voice]}

{FORMAT_INSTRUCTIONS[fmt]}

Текущее время: {today}. Часовой пояс: Europe/Moscow.

Услуги мастера:
{SERVICES_BLOCK}

Расписание мастера (использовать ТОЛЬКО эти окна):
{SCHEDULE_BLOCK}

ЗАНЯТЫЕ СЛОТЫ (ближайшие 14 дней — НИ В КОЕМ СЛУЧАЕ не записывать):
{BUSY_SLOTS_BLOCK}

Что известно мастеру:
{KB_BLOCK}

ФОРМАТ ОТВЕТА:
Ты ВСЕГДА отвечаешь ОДНИМ JSON-объектом со схемой:
{{
  "reply": "<строка>",
  "buttons": [<массив строк, может быть пустым>],
  "actions": [<массив, может быть пустым>],
  "escalate": <boolean>,
  "collected": {{}}
}}

Допустимые actions:
- {{"type": "create_booking", "service_id": <int>, "starts_at": "<ISO с offset>", "client_name": "<>", "client_phone": "<>", "addon_ids": [<int…>]}}
- {{"type": "send_portfolio"}}
- {{"type": "send_location"}}

КРИТИЧНО: ответ — ОДИН JSON, без markdown, без ```. Первый символ «{{», последний «}}»."""


# ---------------------------------------------------------------- scenarios

# Each scenario: (id, category, history, user_message, expectations dict)
# Expectations keys:
#   reply_nonempty: bool
#   reply_max_len: int (sanity)
#   no_actions: bool
#   no_create_booking: bool
#   must_create_booking: bool
#   service_id: int (assert create_booking has this id)
#   addon_ids_include: list[int] (assert)
#   addon_ids_excluded: list[int] (assert NOT include)
#   no_external_recommendation: bool
#   address_present: bool
#   escalate: bool
#   buttons_required: bool (must emit non-empty buttons)
#   buttons_forbidden: bool (must emit empty buttons)
#   contains_no_kb_topic: list[str] (reply must NOT volunteer specific
#                                   numbers/brands for an unfilled KB topic)


def _h(role: str, text: str) -> dict:
    return {"role": role, "content": text}


SCENARIOS: list[dict] = [
    # ----------- A. Conversation flow -----------------------------------
    {
        "id": "FLOW_GREETING",
        "category": "flow",
        "history": [],
        "user": "Здравствуйте",
        "expect": {
            "reply_nonempty": True,
            "no_actions": True,
            "no_persona_leak": True,
        },
    },
    {
        "id": "FLOW_SERVICE_INQUIRY",
        "category": "flow",
        "history": [_h("assistant", "Здравствуйте! Какая процедура интересует?")],
        "user": "Хочу маникюр",
        "expect": {"reply_nonempty": True, "no_create_booking": True},
    },
    {
        "id": "FLOW_BROWSE",
        "category": "flow",
        "history": [],
        "user": "Что у вас есть?",
        "expect": {
            "reply_nonempty": True,
            "no_create_booking": True,
            "no_external_recommendation": True,
        },
    },
    {
        "id": "FLOW_TIME_PICK",
        "category": "flow",
        "history": [
            _h("user", "Хочу маникюр"),
            _h("assistant", "Хорошо. Когда удобно — на этой неделе или на следующей?"),
        ],
        "user": "На этой",
        "expect": {"reply_nonempty": True, "no_create_booking": True},
    },
    {
        "id": "FLOW_CONFIRM_BOOKING",
        "category": "flow",
        "history": [
            _h("user", "Хочу брови"),
            _h("assistant", "Хорошо. Когда удобно?"),
            _h("user", "В среду 7 мая в 12:00"),
            _h("assistant", "Отлично, записываю. Подскажите имя и телефон?"),
        ],
        "user": "Анна, +79991112233",
        "expect": {"must_create_booking": True, "service_id": 3},
    },
    {
        "id": "FLOW_CONTACTS_GLUED",
        "category": "flow",
        "history": [
            _h("user", "Хочу маникюр"),
            _h("assistant", "Когда удобно?"),
            _h("user", "Среда 12:00"),
            _h("assistant", "Отлично. Имя и телефон?"),
        ],
        "user": "Алексей 79375774593",
        "expect": {"must_create_booking": True, "service_id": 1},
    },
    # ----------- B. Edge cases ------------------------------------------
    {
        "id": "EDGE_DAY_OFF",
        "category": "edge",
        "history": [
            _h("user", "Маникюр"),
            _h("assistant", "Когда удобно?"),
        ],
        "user": "В воскресенье 4 мая в 14:00",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "id": "EDGE_BREAK_TIME",
        "category": "edge",
        "history": [
            _h("user", "Брови"),
            _h("assistant", "Когда удобно?"),
        ],
        "user": "В понедельник 5 мая в 14:30",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "id": "EDGE_BUSY_SLOT",
        "category": "edge",
        "history": [
            _h("user", "Маникюр"),
            _h("assistant", "Когда удобно?"),
        ],
        "user": "В понедельник 4 мая в 11:00",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "id": "EDGE_PAST_TIME",
        "category": "edge",
        "history": [
            _h("user", "Маникюр"),
            _h("assistant", "Когда удобно?"),
        ],
        "user": "Вчера в 14:00",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "id": "EDGE_GARBLED_TIME",
        "category": "edge",
        "history": [
            _h("user", "Маникюр на пятницу"),
            _h("assistant", "Какое время?"),
        ],
        "user": "16:90",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "id": "EDGE_OUT_OF_LIST",
        "category": "edge",
        "history": [],
        "user": "У вас есть массаж лица?",
        "expect": {
            "reply_nonempty": True,
            "no_external_recommendation": True,
        },
    },
    {
        "id": "EDGE_OUT_OF_LIST_HAIRCUT",
        "category": "edge",
        "history": [],
        "user": "Хочу подстричься",
        "expect": {
            "reply_nonempty": True,
            "no_external_recommendation": True,
        },
    },
    # ----------- C. KB / objections -------------------------------------
    {
        "id": "KB_ADDRESS",
        "category": "kb",
        "history": [],
        "user": "Где вы находитесь?",
        "expect": {
            "reply_nonempty": True,
            "address_present": True,
        },
    },
    {
        "id": "KB_PAYMENT",
        "category": "kb",
        "history": [],
        "user": "Какие способы оплаты у вас?",
        "expect": {
            "reply_nonempty": True,
            "must_match_one_of": [r"наличн", r"перевод", r"терминал"],
        },
    },
    {
        "id": "KB_STERILIZATION_UNFILLED",
        "category": "kb",
        "history": [],
        "user": "Как обрабатываете инструменты?",
        "expect": {
            # Master hasn't filled this in — must escalate, must NOT
            # invent specific facts (180°C, brands, etc).
            "escalate_or_no_facts": True,
        },
    },
    {
        "id": "KB_PORTFOLIO",
        "category": "kb",
        "history": [],
        "user": "Можете показать примеры работ?",
        "expect": {
            "reply_nonempty": True,
            "must_have_action": "send_portfolio",
        },
    },
    {
        "id": "KB_PRICE_OBJECTION",
        "category": "kb",
        "history": [
            _h("user", "Сколько стоит маникюр?"),
            _h("assistant", "Маникюр — 1500 ₽."),
        ],
        "user": "Дороговато…",
        "expect": {
            "reply_nonempty": True,
            "no_invented_discount": True,
        },
    },
    # ----------- D. Add-ons ---------------------------------------------
    {
        "id": "ADDON_OFFER",
        "category": "addons",
        "history": [
            _h("assistant", "Какая процедура?"),
        ],
        "user": "Маникюр",
        "expect": {
            # Bot should offer at least one of the addon names in reply or buttons
            "addon_offered": True,
        },
    },
    {
        "id": "ADDON_PICK_GEL",
        "category": "addons",
        "history": [
            _h("user", "Маникюр"),
            _h("assistant", "Хотите добавить покрытие гель-лак (+30 мин, +500 ₽)?"),
        ],
        "user": "Да, с гель-лаком",
        "expect": {
            "no_create_booking": True,
            "reply_nonempty": True,
        },
    },
    {
        "id": "ADDON_FULL_BOOKING",
        "category": "addons",
        "history": [
            _h("user", "Маникюр с гель-лаком"),
            _h("assistant", "Когда удобно?"),
            _h("user", "Среда 7 мая 12:00"),
            _h("assistant", "Имя и телефон?"),
        ],
        "user": "Анна, +79991112233",
        "expect": {
            "must_create_booking": True,
            "service_id": 1,
            "addon_ids_include": [11],
        },
    },
]

# Format-matrix scenarios (subset focused on choice turns)
FORMAT_SCENARIOS_IDS = [
    "FLOW_GREETING",
    "FLOW_SERVICE_INQUIRY",
    "ADDON_OFFER",
]

# Voice-matrix: greeting only
VOICE_SCENARIOS_IDS = ["FLOW_GREETING"]


# ---------------------------------------------------------------- HTTP


def _post(url: str, headers: dict, body: dict, timeout: float = 60.0):
    headers = {"User-Agent": USER_AGENT, **headers}
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8"), time.monotonic() - t0
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace"), time.monotonic() - t0
    except Exception as e:
        return 0, f"network error: {e}", time.monotonic() - t0


def call_llm(scenario: dict, voice: str, fmt: str) -> dict:
    sys_text = system_prompt(voice, fmt)
    if PROVIDER == "kie":
        return _call_kie(scenario, sys_text)
    return _call_deepseek(scenario, sys_text)


def _call_deepseek(scenario: dict, sys_text: str) -> dict:
    """Mirror prod retry chain: 3 attempts, drop response_format on the third
    so the audit measures what real users get, not a single raw call."""
    if not DEEPSEEK_KEY:
        return {"http": 0, "raw": "DEEPSEEK_API_KEY missing", "latency_s": 0}
    msgs = [{"role": "system", "content": sys_text}]
    for h in scenario["history"]:
        msgs.append(h)
    msgs.append({"role": "user", "content": scenario["user"]})

    last_extract: dict = {}
    total_latency = 0.0
    attempts_used = 0
    for attempt in range(3):
        body = {
            "model": "deepseek-chat",
            "messages": msgs,
            "temperature": 0.3,
            "max_tokens": 1024,
        }
        if attempt < 2:
            body["response_format"] = {"type": "json_object"}
        status, raw, latency = _post(
            "https://api.deepseek.com/v1/chat/completions",
            {
                "Authorization": f"Bearer {DEEPSEEK_KEY}",
                "Content-Type": "application/json",
            },
            body,
        )
        attempts_used = attempt + 1
        total_latency += latency
        last_extract = _extract(status, raw, latency)
        # Success criteria: HTTP 200 with usable parsed content. Note: on
        # attempt 3 (response_format dropped) the model may emit prose
        # instead of JSON — _extract wraps that into a {reply,...} shape,
        # so .get("json") is non-None and counts as success.
        if last_extract.get("http") == 200 and last_extract.get("json"):
            break
    last_extract["latency_s"] = round(total_latency, 2)
    last_extract["attempts"] = attempts_used
    return last_extract


def _call_kie(scenario: dict, sys_text: str) -> dict:
    if not KIE_KEY:
        return {"http": 0, "raw": "KIE_API_KEY missing", "latency_s": 0}

    def blocks(t: str):
        return [{"type": "text", "text": t}]

    msgs = [{"role": "system", "content": blocks(sys_text)}]
    for h in scenario["history"]:
        msgs.append({"role": h["role"], "content": blocks(h["content"])})
    msgs.append({"role": "user", "content": blocks(scenario["user"])})
    body = {"messages": msgs, "stream": False, "reasoning_effort": "low"}
    status, raw, latency = _post(
        "https://api.kie.ai/gemini-3-flash/v1/chat/completions",
        {
            "Authorization": f"Bearer {KIE_KEY}",
            "Content-Type": "application/json",
        },
        body,
    )
    return _extract(status, raw, latency)


def _flatten_content(c) -> str:
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "".join(b.get("text", "") for b in c if isinstance(b, dict))
    return ""


def _extract_json(text: str) -> dict | None:
    s = text.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:].strip()
    if not s.startswith("{"):
        m = re.search(r"\{", s)
        if not m:
            return None
        s = s[m.start():]
    depth = 0
    in_str = False
    esc = False
    end = -1
    for i, ch in enumerate(s):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end < 0:
        return None
    try:
        return json.loads(s[:end])
    except json.JSONDecodeError:
        return None


def _extract(status: int, raw: str, latency: float) -> dict:
    out = {"http": status, "latency_s": round(latency, 2), "raw_excerpt": raw[:240]}
    if status != 200:
        return out
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return out
    out["usage"] = body.get("usage")
    try:
        content = _flatten_content(body["choices"][0]["message"]["content"])
    except (KeyError, IndexError):
        return out
    out["content"] = content
    parsed = _extract_json(content)
    # Mirror prod fallback: when LLM returns prose instead of JSON (happens
    # on attempt 3 after we've dropped response_format), wrap short replies
    # into the schema instead of marking them invalid.
    if parsed is None:
        stripped = content.strip()
        if stripped and len(stripped) <= 500:
            parsed = {
                "reply": stripped,
                "actions": [],
                "buttons": [],
                "escalate": False,
                "collected_data": {},
                "_wrapped_prose": True,
            }
    out["json"] = parsed
    return out


# ---------------------------------------------------------------- evaluation


def evaluate(scenario: dict, result: dict) -> dict:
    e = scenario["expect"]
    j = result.get("json") or {}
    reply = (j.get("reply") if isinstance(j, dict) else None) or ""
    actions = (j.get("actions") if isinstance(j, dict) else None) or []
    if not isinstance(actions, list):
        actions = []
    buttons = (j.get("buttons") if isinstance(j, dict) else None) or []
    if not isinstance(buttons, list):
        buttons = []
    escalate = bool(j.get("escalate")) if isinstance(j, dict) else False

    checks: dict = {"json_valid": result.get("json") is not None}

    if e.get("reply_nonempty"):
        checks["reply_nonempty"] = bool(reply.strip())

    if e.get("no_actions"):
        checks["no_actions"] = len(actions) == 0

    if e.get("no_create_booking"):
        checks["no_create_booking"] = not any(a.get("type") == "create_booking" for a in actions)

    if e.get("must_create_booking"):
        cb = [a for a in actions if a.get("type") == "create_booking"]
        checks["create_booking_emitted"] = len(cb) > 0
        if cb and e.get("service_id"):
            checks["correct_service_id"] = cb[0].get("service_id") == e["service_id"]
        if cb and e.get("addon_ids_include"):
            ids = cb[0].get("addon_ids") or []
            ids = [int(x) for x in ids if isinstance(x, (int, str))]
            checks["addon_ids_include"] = all(x in ids for x in e["addon_ids_include"])

    if e.get("must_have_action"):
        kind = e["must_have_action"]
        checks[f"action_{kind}"] = any(a.get("type") == kind for a in actions)

    if e.get("must_match_one_of"):
        low = reply.lower()
        checks["match_one_of"] = any(re.search(p, low, re.IGNORECASE) for p in e["must_match_one_of"])

    if e.get("no_external_recommendation"):
        low = reply.lower()
        bad = [
            r"массажист",
            r"колорист",
            r"стилист",
            r"визажист",
            r"могу\s+(посоветовать|порекомендовать|направить)",
            r"обратитесь\s+к",
            r"направ(ить|лю)\s+вас",
        ]
        leak = [p for p in bad if re.search(p, low, re.IGNORECASE)]
        checks["no_external_rec"] = len(leak) == 0
        if leak:
            checks["_leak"] = leak  # debug

    if e.get("address_present"):
        low = reply.lower()
        checks["address_present"] = bool(re.search(r"казань|завойского", low))

    if e.get("escalate_or_no_facts"):
        # Either escalate=True, OR reply does NOT contain specific
        # fabricated facts (numbers, °C, brand-like terms).
        looks_invented = bool(
            re.search(r"\b\d{2,3}\s*°|сухожар|автоклав|стерильно|апельсиновы", reply, re.IGNORECASE)
        )
        checks["escalate_or_no_facts"] = escalate or not looks_invented

    if e.get("addon_offered"):
        # Bot should mention addon names somewhere (reply or buttons).
        haystack = (reply + " " + " ".join(buttons)).lower()
        offered = bool(re.search(r"гель-лак|дизайн", haystack))
        checks["addon_offered"] = offered

    if e.get("no_invented_discount"):
        # Bot must NOT promise discounts that don't exist.
        looks_discount = bool(re.search(r"скидк|снижу|дешевле|акци", reply, re.IGNORECASE))
        checks["no_invented_discount"] = not looks_discount

    if e.get("no_persona_leak"):
        # «я помощник мастера», «я ассистент Анны», «я отвечу за мастера» —
        # all blow the cover. The bot is supposed to BE the master.
        leak = bool(
            re.search(
                r"я\s+(?:помощник|ассистент|чат[- ]?бот|бот|ассистентк[аи])\b|"
                r"я\s+отвеч(?:у|ает|аю)\s+за\s+мастер",
                reply,
                re.IGNORECASE,
            )
        )
        checks["no_persona_leak"] = not leak

    return checks


def all_pass(checks: dict) -> bool:
    return all(v for k, v in checks.items() if isinstance(v, bool))


# ---------------------------------------------------------------- main


def run_scenario(scenario: dict, voice: str, fmt: str) -> dict:
    r = call_llm(scenario, voice, fmt)
    checks = evaluate(scenario, r)
    return {
        "id": scenario["id"],
        "category": scenario["category"],
        "voice": voice,
        "format": fmt,
        "result": r,
        "checks": checks,
        "passed": all_pass(checks),
    }


def by_id(sid: str) -> dict:
    for s in SCENARIOS:
        if s["id"] == sid:
            return s
    raise KeyError(sid)


def main() -> None:
    full_log: list[dict] = []
    print(f"# Beauty.dev — full bot audit  (provider={PROVIDER})")
    print()

    # 1) Functional flow with default voice=warm + format=hybrid.
    print("## 1. Functional flow (voice=warm, format=hybrid)\n")
    print("| Scenario | Category | Pass | Latency | Checks |")
    print("|---|---|---|---|---|")
    for sc in SCENARIOS:
        row = run_scenario(sc, "warm", "hybrid")
        full_log.append(row)
        cats = [
            ("✅" if v else "❌") + " " + k
            for k, v in row["checks"].items()
            if isinstance(v, bool)
        ]
        print(
            f"| {sc['id']} | {sc['category']} | "
            f"{'✅' if row['passed'] else '❌'} | "
            f"{row['result'].get('latency_s', '?')}s | "
            f"{', '.join(cats)} |"
        )

    # 2) Format matrix on choice-heavy scenarios.
    print("\n## 2. Format matrix (text / buttons / hybrid)\n")
    print("| Scenario | Format | buttons[] count | reply len | Pass |")
    print("|---|---|---|---|---|")
    for sid in FORMAT_SCENARIOS_IDS:
        sc = by_id(sid)
        for fmt in ("text", "buttons", "hybrid"):
            row = run_scenario(sc, "warm", fmt)
            full_log.append(row)
            j = row["result"].get("json") or {}
            btns = j.get("buttons") or []
            reply_len = len((j.get("reply") or ""))
            # Sanity: text → buttons must be empty; buttons/hybrid on choice
            # turns SHOULD have ≥1 button.
            ok = True
            if fmt == "text" and len(btns) > 0:
                ok = False
            if fmt == "buttons" and len(btns) == 0 and sid != "FLOW_GREETING":
                ok = False
            print(
                f"| {sid} | {fmt} | {len(btns)} | {reply_len} | "
                f"{'✅' if ok else '❌'} |"
            )

    # 3) Voice matrix on greeting.
    print("\n## 3. Voice matrix (warm / neutral / casual) — greeting\n")
    print("| Voice | Reply (first 120 chars) |")
    print("|---|---|")
    for sid in VOICE_SCENARIOS_IDS:
        sc = by_id(sid)
        for v in ("warm", "neutral", "casual"):
            row = run_scenario(sc, v, "hybrid")
            full_log.append(row)
            j = row["result"].get("json") or {}
            reply = (j.get("reply") or "").replace("\n", " ").replace("|", "\\|")
            print(f"| {v} | {reply[:120]} |")

    # Aggregate stats.
    flow_rows = [r for r in full_log if r["voice"] == "warm" and r["format"] == "hybrid"]
    by_cat: dict[str, list[dict]] = {}
    for r in flow_rows:
        by_cat.setdefault(r["category"], []).append(r)

    print("\n## 4. Aggregate stats\n")
    print("| Category | Passed | Total | Avg latency |")
    print("|---|---|---|---|")
    for cat in sorted(by_cat.keys()):
        rows = by_cat[cat]
        passed = sum(1 for r in rows if r["passed"])
        latencies = [r["result"].get("latency_s") or 0 for r in rows]
        avg = round(statistics.mean(latencies), 2) if latencies else 0
        print(f"| {cat} | {passed}/{len(rows)} | {len(rows)} | {avg}s |")

    overall_pass = sum(1 for r in flow_rows if r["passed"])
    overall_total = len(flow_rows)
    overall_avg = (
        round(statistics.mean([r["result"].get("latency_s") or 0 for r in flow_rows]), 2)
        if flow_rows
        else 0
    )
    print(f"\n**TOTAL**: {overall_pass}/{overall_total} passed · "
          f"avg latency {overall_avg}s")

    out_path = os.path.join(tempfile.gettempdir(), "audit_bot.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(full_log, f, ensure_ascii=False, indent=2)
    print(f"\n_Full per-scenario log: {out_path}_")


if __name__ == "__main__":
    main()
