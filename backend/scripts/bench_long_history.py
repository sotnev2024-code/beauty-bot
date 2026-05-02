"""Token / latency / cost report for a 50-turn dialog.

Real conversations grow long. The prod path caps history at
`settings.LLM_HISTORY_MESSAGES` (currently 20), but every cached turn
still counts against the prompt budget on each new request. This bench
runs an N-turn dialog through the live LLM and reports actual prompt and
completion token usage so we can sanity-check cost before a master with
chatty clients blows up the bill.

Usage:
    DEEPSEEK_API_KEY=... python scripts/bench_long_history.py [N]

N defaults to 50 turns. Output: per-turn token counts, totals, and a
projected daily/monthly cost using DeepSeek's published pricing.
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import tempfile
import time
import urllib.error
import urllib.request

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "").strip()
if not DEEPSEEK_KEY:
    print("ERROR: set DEEPSEEK_API_KEY", file=sys.stderr)
    sys.exit(1)

USER_AGENT = "Mozilla/5.0 BeautyDev-LongHistoryBench/1.0"

# Public pricing — keep in sync with https://api-docs.deepseek.com
PRICE_PER_M_PROMPT_USD = 0.27
PRICE_PER_M_PROMPT_CACHED_USD = 0.07
PRICE_PER_M_COMPLETION_USD = 1.10

SYSTEM_PROMPT = (
    "Ты — личный ассистент мастера маникюра. Отвечай на «вы», коротко, "
    "1-2 предложения. Возвращай только JSON {\"reply\":\"...\"}."
)

# Realistic-looking small-talk that will keep accumulating in the history.
TURNS = [
    "Здравствуйте",
    "А вы делаете маникюр с гель-лаком?",
    "А сколько стоит?",
    "Понятно. А когда у вас свободно?",
    "А в субботу?",
    "А во сколько?",
    "Запишите на 14:00",
    "Меня зовут Анна",
    "+7 999 111 22 33",
    "Спасибо. Кстати, вы где находитесь?",
    "Это далеко от метро?",
    "Хорошо. А оплата как?",
    "Картой можно?",
    "А есть какие-то скидки?",
    "Понятно. А что лучше — гель-лак или обычный?",
    "А сколько держится?",
    "А снять потом сложно?",
    "А не вредно для ногтей?",
    "Окей, тогда гель-лак. Цвет какой посоветуете?",
    "Нюд",
    "А дизайн делаете?",
    "Сколько стоит?",
    "Хорошо, добавьте дизайн на 2 ногтя",
    "Спасибо! А долго будет?",
    "Понятно. Ещё вопрос — у меня после прошлого мастера остался гель",
    "Снять заранее или у вас?",
    "Хорошо, тогда у вас",
    "А если опоздаю на 10 минут?",
    "Спасибо. А вы работаете в праздники?",
    "А 8 марта?",
    "Понятно. А кстати, у вас есть Insta?",
    "Можно посмотреть портфолио?",
    "Спасибо! Очень красиво",
    "А вот этот дизайн с цветами — сколько такой стоит?",
    "Хорошо, в следующий раз попробую",
    "А парафинотерапию делаете?",
    "Жаль. А массаж рук?",
    "Хорошо. Тогда увидимся в субботу",
    "Ой, а можно перенести на воскресенье?",
    "Хорошо, оставим субботу",
    "А вы напомните накануне?",
    "Спасибо большое",
    "Ещё один вопрос — можно прийти с подругой?",
    "Она запишется отдельно?",
    "Хорошо",
    "До встречи!",
    "Ой, забыла — а аллергия на материалы бывает?",
    "А если у меня чувствительная кожа?",
    "Понятно. Спасибо за подробный ответ",
    "Тогда всё, до субботы",
]


def _post(body: dict, timeout: float = 60.0):
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_KEY}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "https://api.deepseek.com/v1/chat/completions",
        data=data,
        headers=headers,
        method="POST",
    )
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8")), time.monotonic() - t0
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode("utf-8", errors="replace")}, time.monotonic() - t0
    except Exception as e:
        return 0, {"error": str(e)}, time.monotonic() - t0


def main() -> None:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    n = min(n, len(TURNS))
    history: list[dict] = []
    rows: list[dict] = []
    print(f"# Long-history bench — {n} turns, DeepSeek\n")
    print("| # | prompt_tok | cached | completion | latency | reply |")
    print("|---|---|---|---|---|---|")

    for i in range(n):
        user = TURNS[i]
        msgs = (
            [{"role": "system", "content": SYSTEM_PROMPT}]
            + history
            + [{"role": "user", "content": user}]
        )
        body = {
            "model": "deepseek-chat",
            "messages": msgs,
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
            "max_tokens": 200,
        }
        status, payload, latency = _post(body)
        if status != 200:
            print(f"| {i+1} | error | | | | {payload.get('error', '?')[:60]} |")
            break
        usage = payload.get("usage") or {}
        prompt_tok = usage.get("prompt_tokens", 0)
        cached = usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)
        comp_tok = usage.get("completion_tokens", 0)
        try:
            reply_text = payload["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError):
            reply_text = ""
        rows.append(
            {
                "turn": i + 1,
                "user": user,
                "prompt_tokens": prompt_tok,
                "cached_tokens": cached,
                "completion_tokens": comp_tok,
                "latency_s": round(latency, 2),
                "reply": reply_text,
            }
        )
        snippet = reply_text.replace("\n", " ")[:60]
        print(
            f"| {i+1} | {prompt_tok} | {cached} | {comp_tok} "
            f"| {latency:.2f}s | {snippet} |"
        )
        history.append({"role": "user", "content": user})
        history.append({"role": "assistant", "content": reply_text})

    if not rows:
        sys.exit(1)

    total_prompt = sum(r["prompt_tokens"] for r in rows)
    total_cached = sum(r["cached_tokens"] for r in rows)
    total_uncached_prompt = total_prompt - total_cached
    total_completion = sum(r["completion_tokens"] for r in rows)
    avg_latency = round(statistics.mean(r["latency_s"] for r in rows), 2)

    cost_prompt = total_uncached_prompt / 1_000_000 * PRICE_PER_M_PROMPT_USD
    cost_cached = total_cached / 1_000_000 * PRICE_PER_M_PROMPT_CACHED_USD
    cost_completion = total_completion / 1_000_000 * PRICE_PER_M_COMPLETION_USD
    total_cost = cost_prompt + cost_cached + cost_completion

    print("\n## Totals\n")
    print(f"- prompt tokens:          {total_prompt} (cached {total_cached}, uncached {total_uncached_prompt})")
    print(f"- completion tokens:      {total_completion}")
    print(f"- avg latency:            {avg_latency}s")
    print(f"- cost this dialog:       ${total_cost:.6f}")

    # Project: 100 masters × 50 client conversations/day × this many turns each.
    daily_cost = total_cost * 100 * 50
    monthly_cost = daily_cost * 30
    print(f"- projected daily (100m × 50conv): ${daily_cost:.2f}")
    print(f"- projected monthly:               ${monthly_cost:.2f}")

    out = os.path.join(tempfile.gettempdir(), "bench_long_history.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(
            {
                "rows": rows,
                "total_prompt_tokens": total_prompt,
                "total_cached_tokens": total_cached,
                "total_completion_tokens": total_completion,
                "avg_latency_s": avg_latency,
                "total_cost_usd": total_cost,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\n_Full log: {out}_")


if __name__ == "__main__":
    main()
