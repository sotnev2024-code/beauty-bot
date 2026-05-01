"""Run a fixed set of Beauty.dev-realistic dialog scenarios against two LLM
providers and print a comparison report.

Models:
  * DeepSeek V3.2 (deepseek-chat) — direct api.deepseek.com
  * Gemini 3 Flash via kie.ai

Usage on the server:
    cd /opt/beauty-bot
    docker compose -f docker-compose.host-nginx.yml exec -T backend \
        python scripts/compare_llm.py

Or locally:
    DEEPSEEK_API_KEY=... KIE_API_KEY=... python compare_llm.py

Environment:
    DEEPSEEK_API_KEY   required for DeepSeek leg
    KIE_API_KEY        required for Gemini leg

Output: a markdown report on stdout + a JSON dump in /tmp/llm_compare.json.
"""

from __future__ import annotations

import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "").strip()
KIE_KEY = os.environ.get("KIE_API_KEY", "").strip()

if not DEEPSEEK_KEY or not KIE_KEY:
    print("ERROR: set DEEPSEEK_API_KEY and KIE_API_KEY in env", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------- shared prompt

SCHEDULE_BLOCK = """- Пн: 10:00–20:00 (перерыв 14:00–15:00)
- Вт: 10:00–20:00 (перерыв 14:00–15:00)
- Ср: 10:00–20:00 (перерыв 14:00–15:00)
- Чт: 10:00–20:00 (перерыв 14:00–15:00)
- Пт: 10:00–20:00 (перерыв 14:00–15:00)
- Сб: 12:00–18:00
- Вс: выходной"""

SERVICES_BLOCK = """- id=1: Маникюр, 60 мин, 1500 ₽
- id=2: Педикюр, 90 мин, 2500 ₽
- id=3: Брови (коррекция + окрашивание), 30 мин, 800 ₽"""

KB_SHORT = """- Адрес: г. Казань, ул. Завойского 21бк2
- Координаты адреса: 55.760000, 49.180000
- Оплата: наличные или перевод на карту"""

SYSTEM_PROMPT = f"""Ты — личный ассистент мастера Анна в Telegram. Отвечаешь \
клиенткам в личном чате мастера от его имени. Клиентки не знают, что общаются \
с ботом — пиши как сам мастер. Ниша мастера: маникюр и брови.

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
делаю». Не направляй к третьим лицам.

ЖЁСТКОЕ ПРАВИЛО ПО ВРЕМЕНИ ЗАПИСИ:
- Перед create_booking ОБЯЗАТЕЛЬНО проверь блок «Расписание мастера» ниже.
- Не записывай в нерабочий день (выходной, отпуск).
- Не записывай вне рабочих часов.
- Не записывай во время перерыва.
- Если клиент назвал такое время — извинись и предложи ближайший рабочий \
слот из расписания.

Тон голоса — тёплый и заботливый. Обращайся на «вы» с уважением.

Текущее время: 2026-05-01T11:00 (пятница). Часовой пояс мастера: Europe/Moscow.

Услуги мастера:
{SERVICES_BLOCK}

Расписание мастера (использовать ТОЛЬКО эти окна для записи):
{SCHEDULE_BLOCK}

Что известно мастеру (короткие факты):
{KB_SHORT}

ФОРМАТ ОТВЕТА:
Ты ВСЕГДА отвечаешь ОДНИМ JSON-объектом со схемой:
{{
  "reply": "<строка — текст, который увидит клиент>",
  "actions": [<массив действий — может быть пустым>],
  "escalate": <boolean>,
  "collected": {{<собранные о клиенте поля: name, phone, service_id и т.п.>}}
}}

Допустимые типы actions:
- {{"type": "create_booking", "service_id": <int>, "starts_at": "<ISO-8601 с offset>", "client_name": "<строка>", "client_phone": "<строка>"}}
- {{"type": "lookup_kb", "kb_type": "..."}}
- {{"type": "send_portfolio"}}
- {{"type": "send_location"}}

КРИТИЧЕСКИ ВАЖНО: ответ — ОДИН JSON-объект. Никакого markdown, никаких \
```json, никакого текста до или после. Первый символ — `{{`, последний — `}}`."""

JSON_TAIL = " [reply with the JSON object only — first char `{`, last char `}`]"

# ---------------------------------------------------------------- scenarios

SCENARIOS = [
    {
        "name": "GREETING",
        "purpose": "Стандартное приветствие",
        "history": [],
        "user": "Здравствуйте, можно записаться?",
        "expect": {"reply_nonempty": True, "no_actions": True},
    },
    {
        "name": "SERVICE_INQUIRY",
        "purpose": "Клиент назвал услугу из списка",
        "history": [
            {"role": "assistant", "content": "Здравствуйте! Подскажите, какая процедура вас интересует?"},
        ],
        "user": "Хочу маникюр",
        "expect": {"reply_nonempty": True},
    },
    {
        "name": "OUT_OF_LIST",
        "purpose": "Клиент просит услугу не из списка — должен ОТКАЗАТЬ, не предлагать сторонних",
        "history": [],
        "user": "Здравствуйте, у вас есть массаж лица?",
        "expect": {
            "reply_nonempty": True,
            "must_not_contain": ["масса", "колорист", "стилист", "посоветую", "порекомендую", "обратитесь"],
        },
    },
    {
        "name": "DAY_OFF",
        "purpose": "Клиент просит запись на воскресенье — выходной. Не должен делать create_booking",
        "history": [
            {"role": "assistant", "content": "Какая процедура вас интересует?"},
            {"role": "user", "content": "Маникюр"},
            {"role": "assistant", "content": "Хорошо, когда удобно?"},
        ],
        "user": "Запишите на воскресенье 3 мая в 14:00",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "name": "BREAK_TIME",
        "purpose": "Клиент просит запись на 14:30 в будний день — попадает в перерыв 14:00-15:00",
        "history": [
            {"role": "assistant", "content": "Какая процедура?"},
            {"role": "user", "content": "Брови"},
            {"role": "assistant", "content": "Хорошо, когда удобно?"},
        ],
        "user": "Запишите на понедельник 4 мая в 14:30",
        "expect": {"no_create_booking": True, "reply_nonempty": True},
    },
    {
        "name": "CONFIRM_BOOKING",
        "purpose": "Контактные данные после согласования времени → должен эмитить create_booking",
        "history": [
            {"role": "user", "content": "Хочу маникюр"},
            {"role": "assistant", "content": "Хорошо! Когда удобно?"},
            {"role": "user", "content": "В понедельник 4 мая в 11:00"},
            {"role": "assistant", "content": "Отлично, запишу. Подскажите имя и телефон?"},
        ],
        "user": "Анна, +79991112233",
        "expect": {"must_create_booking": True, "service_id": 1},
    },
    {
        "name": "ADDRESS",
        "purpose": "Спрашивают где находитесь — должен отдать адрес из KB или предложить send_location",
        "history": [],
        "user": "А где вы находитесь?",
        "expect": {
            "reply_must_contain_one_of": ["Казань", "Завойского", "адрес"],
        },
    },
]

# ---------------------------------------------------------------- HTTP


def _post(url: str, headers: dict, body: dict, timeout: float = 60.0):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, raw, time.monotonic() - t0
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace"), time.monotonic() - t0
    except Exception as e:
        return 0, f"network error: {e}", time.monotonic() - t0


# ---------------------------------------------------------------- adapters


def call_deepseek(scenario):
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in scenario["history"]:
        msgs.append({"role": h["role"], "content": h["content"]})
    msgs.append({"role": "user", "content": scenario["user"] + JSON_TAIL})
    body = {
        "model": "deepseek-chat",
        "messages": msgs,
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 800,
    }
    status, raw, latency = _post(
        "https://api.deepseek.com/v1/chat/completions",
        {
            "Authorization": f"Bearer {DEEPSEEK_KEY}",
            "Content-Type": "application/json",
        },
        body,
    )
    return _extract("deepseek", status, raw, latency)


def call_gemini(scenario):
    def _content_blocks(text):
        return [{"type": "text", "text": text}]

    msgs = [{"role": "system", "content": _content_blocks(SYSTEM_PROMPT)}]
    for h in scenario["history"]:
        msgs.append({"role": h["role"], "content": _content_blocks(h["content"])})
    msgs.append({"role": "user", "content": _content_blocks(scenario["user"] + JSON_TAIL)})
    body = {
        "messages": msgs,
        "stream": False,
        "reasoning_effort": "low",
    }
    status, raw, latency = _post(
        "https://api.kie.ai/gemini-3-flash/v1/chat/completions",
        {
            "Authorization": f"Bearer {KIE_KEY}",
            "Content-Type": "application/json",
        },
        body,
    )
    return _extract("gemini-3-flash", status, raw, latency)


def _flatten(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        out = []
        for b in content:
            if isinstance(b, dict) and isinstance(b.get("text"), str):
                out.append(b["text"])
            elif isinstance(b, str):
                out.append(b)
        return "".join(out)
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
    # balanced-brace scan
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


def _extract(provider: str, status: int, raw: str, latency: float) -> dict:
    out = {
        "provider": provider,
        "http": status,
        "latency_s": round(latency, 2),
        "raw_excerpt": raw[:240],
        "content": "",
        "json": None,
        "usage": None,
    }
    if status != 200:
        return out
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return out
    out["usage"] = body.get("usage")
    try:
        out["content"] = _flatten(body["choices"][0]["message"]["content"])
    except (KeyError, IndexError):
        return out
    out["json"] = _extract_json(out["content"])
    return out


# ---------------------------------------------------------------- evaluation


def evaluate(scenario, result) -> dict:
    """Return dict of pass/fail booleans against the scenario's expectations."""
    e = scenario["expect"]
    j = result.get("json") or {}
    reply = (j.get("reply") if isinstance(j, dict) else None) or ""
    actions = j.get("actions") if isinstance(j, dict) else None
    if not isinstance(actions, list):
        actions = []

    checks = {
        "json_valid": result.get("json") is not None,
        "reply_nonempty": bool(reply.strip()) if e.get("reply_nonempty") else None,
    }
    if e.get("no_actions"):
        checks["no_actions"] = len(actions) == 0
    if e.get("must_not_contain"):
        low = reply.lower()
        leak = [w for w in e["must_not_contain"] if w.lower() in low]
        checks["no_forbidden_words"] = len(leak) == 0
        if leak:
            checks["forbidden_leak"] = leak  # for debug
    if e.get("no_create_booking"):
        checks["no_create_booking"] = not any(a.get("type") == "create_booking" for a in actions)
    if e.get("must_create_booking"):
        cb = [a for a in actions if a.get("type") == "create_booking"]
        checks["create_booking_emitted"] = len(cb) > 0
        if cb and e.get("service_id"):
            checks["correct_service_id"] = cb[0].get("service_id") == e["service_id"]
    if e.get("reply_must_contain_one_of"):
        low = reply.lower()
        hit = any(w.lower() in low for w in e["reply_must_contain_one_of"])
        checks["address_present"] = hit
    return {k: v for k, v in checks.items() if v is not None}


# ---------------------------------------------------------------- main


def main():
    full_log = []
    print("# LLM comparison: DeepSeek V3.2 vs Gemini 3 Flash")
    print()
    print(f"_System prompt size: {len(SYSTEM_PROMPT)} chars_")
    print()

    summary = {"deepseek": {"pass": 0, "fail": 0, "lat": []},
               "gemini-3-flash": {"pass": 0, "fail": 0, "lat": []}}

    for sc in SCENARIOS:
        print(f"## {sc['name']} — {sc['purpose']}")
        print(f"_user_: `{sc['user']}`\n")

        for caller in (call_deepseek, call_gemini):
            r = caller(sc)
            checks = evaluate(sc, r)
            entry = {"scenario": sc["name"], "result": r, "checks": checks}
            full_log.append(entry)

            provider = r["provider"]
            summary[provider]["lat"].append(r["latency_s"])
            passed = all(v for k, v in checks.items() if isinstance(v, bool))
            if passed:
                summary[provider]["pass"] += 1
            else:
                summary[provider]["fail"] += 1

            usage = r.get("usage") or {}
            print(f"### {provider}")
            print(f"- HTTP {r['http']} · latency {r['latency_s']}s · "
                  f"usage in/out = {usage.get('prompt_tokens', '?')}/{usage.get('completion_tokens', '?')}")
            j = r.get("json")
            if j is None:
                print(f"- ⛔ JSON not parsed. raw: `{r['raw_excerpt']}`")
            else:
                reply = j.get("reply") if isinstance(j, dict) else None
                actions = j.get("actions") if isinstance(j, dict) else None
                print(f"- reply: {json.dumps(reply, ensure_ascii=False) if reply else '∅'}")
                if actions:
                    print(f"- actions: {json.dumps(actions, ensure_ascii=False)}")
                else:
                    print(f"- actions: []")
            checks_str = ", ".join(
                ("✅ " if v else "❌ ") + k for k, v in checks.items() if isinstance(v, bool)
            )
            print(f"- checks: {checks_str}")
            if "forbidden_leak" in checks:
                print(f"- 🚨 leaked: {checks['forbidden_leak']}")
            print()

    # Final summary
    print("## SUMMARY\n")
    print("| Provider | Passed | Failed | Avg latency |")
    print("|---|---|---|---|")
    for p, s in summary.items():
        avg = round(statistics.mean(s["lat"]), 2) if s["lat"] else 0
        print(f"| {p} | {s['pass']}/{s['pass'] + s['fail']} | {s['fail']} | {avg}s |")

    with open("/tmp/llm_compare.json", "w", encoding="utf-8") as f:
        json.dump(full_log, f, ensure_ascii=False, indent=2)
    print("\n_Full per-scenario log: /tmp/llm_compare.json_")


if __name__ == "__main__":
    main()
