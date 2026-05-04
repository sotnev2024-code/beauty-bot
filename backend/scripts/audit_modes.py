"""End-to-end audit of hybrid + text modes against the running stack.

Bypasses Telegram and calls `process_client_message` directly with synthetic
client conversations. For each scenario captures:
  - bot reply text
  - actions emitted (create_booking, find_slots, send_portfolio…)
  - hybrid widget chosen (addons / time / confirm)
  - escalate / silent flags

Usage inside the running backend container:

    docker compose exec backend python scripts/audit_modes.py

Each scenario creates a fresh fake client (telegram_id 9_000_000+i) so
state doesn't bleed between tests; the conversation row is also fresh
each run. The seed master is `seed_test_master.py` defaults.
"""

from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass

from sqlalchemy import select

from app.core.db import session_factory
from app.llm import get_llm
from app.models import (
    BotSettings,
    Client,
    Conversation,
    ConversationState,
    Master,
)
from app.services.dialog import process_client_message

DEFAULT_MASTER_TG = 1724263429


@dataclass(slots=True)
class Scenario:
    name: str
    history: list[tuple[str, str]]
    user: str
    expected_widget: str | None = None
    expected_action: str | None = None
    forbidden_actions: tuple[str, ...] = ()
    must_escalate: bool = False
    must_be_silent: bool = False
    note: str = ""


SCENARIOS: list[Scenario] = [
    Scenario(
        name="GREETING",
        history=[],
        user="Здравствуйте!",
        expected_widget=None,
        forbidden_actions=("create_booking", "find_slots"),
        note="плейн приветствие — никаких виджетов",
    ),
    Scenario(
        name="SERVICE_PICK_TRIGGERS_ADDONS",
        history=[("assistant", "Здравствуйте! Какая процедура?")],
        user="Маникюр",
        expected_widget="addons",
        forbidden_actions=("create_booking",),
    ),
    Scenario(
        name="DAY_PICK_TRIGGERS_TIME_SLOTS",
        history=[
            ("user", "Маникюр"),
            ("assistant", "Хорошо, маникюр. Хотите добавки?"),
            ("user", "без добавок"),
            ("assistant", "Когда удобно?"),
        ],
        user="Завтра",
        expected_widget="time",
        expected_action="find_slots",
    ),
    Scenario(
        name="SHORTCUT_FULL_BOOKING_IN_ONE_MSG",
        history=[],
        user="Хочу записаться на маникюр 6 мая в 17:00, я Алексей 79991112233",
        expected_widget="confirm",
        forbidden_actions=("create_booking",),
        note=(
            "клиент сразу даёт всё. В hybrid create_booking должен быть "
            "перехвачен и заменён на confirm-card."
        ),
    ),
    Scenario(
        name="SUNDAY_DAY_OFF",
        history=[("user", "Маникюр"), ("assistant", "Когда удобно?")],
        user="В воскресенье в 14:00",
        forbidden_actions=("create_booking",),
        note="воскресенье — выходной, не должно быть записи",
    ),
    Scenario(
        name="DURING_LUNCH_BREAK",
        history=[("user", "Маникюр"), ("assistant", "Когда удобно?")],
        user="Понедельник 14:30",
        forbidden_actions=("create_booking",),
        note="14:00–15:00 — перерыв, бот не должен бронировать",
    ),
    Scenario(
        name="OUT_OF_LIST_SERVICE",
        history=[],
        user="У вас есть массаж лица?",
        forbidden_actions=("create_booking",),
    ),
    Scenario(
        name="CANCEL_INTENT",
        history=[],
        user="Хочу отменить свою запись",
        must_escalate=True,
        must_be_silent=True,
        note=(
            "cancel должен идти в escalate=true с пустым reply, бот "
            "молчит (silent=true)."
        ),
    ),
    Scenario(
        name="ADDRESS_QUESTION",
        history=[],
        user="А где вы находитесь?",
        forbidden_actions=("create_booking",),
    ),
    Scenario(
        name="UNKNOWN_QUESTION_ESCALATE",
        history=[],
        user="Можно прийти с собакой? У неё специальный поводок.",
        must_escalate=True,
        must_be_silent=False,
        note=(
            "у мастера нет ответа в KB про животных — escalate=true с "
            "reply «уточню у мастера», бот не молчит."
        ),
    ),
    Scenario(
        name="BACKSTEP_CHANGE_SERVICE",
        history=[
            ("user", "Маникюр"),
            ("assistant", "Хорошо, маникюр. Хотите добавки?"),
            ("user", "без добавок"),
            ("assistant", "Когда удобно прийти?"),
        ],
        user="Хочу всё-таки педикюр",
        forbidden_actions=("create_booking",),
        note="клиент в середине меняет услугу — бот должен подхватить",
    ),
    Scenario(
        name="VAGUE_TIME_NO_WIDGET",
        history=[("user", "Маникюр"), ("assistant", "Когда удобно?")],
        user="Не знаю, как у вас лучше",
        expected_widget=None,
        note="клиент не назвал день — виджет НЕ должен сработать",
    ),
]


async def _ensure_master(session) -> Master:
    row = (
        await session.execute(
            select(Master).where(Master.telegram_id == DEFAULT_MASTER_TG)
        )
    ).scalar_one_or_none()
    if row is None:
        raise RuntimeError(
            f"master telegram_id={DEFAULT_MASTER_TG} not found — "
            "run seed_test_master.py first"
        )
    return row


async def _fresh_client_conv(
    session, master_id: int, scenario_name: str, idx: int
) -> tuple[Client, Conversation]:
    tg = 9_000_000 + idx
    cl = (
        await session.execute(
            select(Client).where(
                Client.master_id == master_id, Client.telegram_id == tg
            )
        )
    ).scalar_one_or_none()
    if cl is None:
        cl = Client(
            master_id=master_id,
            telegram_id=tg,
            name=f"Тест {scenario_name}",
        )
        session.add(cl)
        await session.flush()

    conv = (
        await session.execute(
            select(Conversation).where(
                Conversation.master_id == master_id, Conversation.client_id == cl.id
            )
        )
    ).scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            master_id=master_id,
            client_id=cl.id,
            state=ConversationState.BOT,
        )
        session.add(conv)
        await session.flush()
    else:
        conv.state = ConversationState.BOT
        conv.takeover_until = None
        conv.flow_state = None
    return cl, conv


def _evaluate(sc: Scenario, meta: dict, reply: str, format_name: str) -> dict:
    checks: dict[str, bool] = {}
    actions = meta.get("actions") or []
    actions_types = {a.get("type") for a in actions if isinstance(a, dict)}
    hybrid = (meta.get("hybrid") or {}).get("widget")

    # Widgets only exist in hybrid mode. For text/buttons modes we just
    # assert there's no widget at all (text = pure LLM, buttons = own FSM).
    if format_name != "hybrid":
        checks["no_widget"] = hybrid is None
    elif sc.expected_widget is None:
        checks["no_widget"] = hybrid is None
    else:
        checks[f"widget_{sc.expected_widget}"] = hybrid == sc.expected_widget

    if sc.expected_action:
        checks[f"action_{sc.expected_action}"] = sc.expected_action in actions_types
    for forbidden in sc.forbidden_actions:
        checks[f"no_{forbidden}"] = forbidden not in actions_types

    if sc.must_escalate:
        checks["escalated"] = bool(meta.get("escalate")) or bool(meta.get("escalated"))
    if sc.must_be_silent:
        checks["silent"] = bool(meta.get("silent"))
    elif sc.must_escalate:
        checks["not_silent"] = not bool(meta.get("silent"))
    return checks


async def run_for_format(format_name: str) -> list[dict]:
    async with session_factory() as session:
        master = await _ensure_master(session)
        bs = await session.get(BotSettings, master.id)
        if bs is None:
            raise RuntimeError("BotSettings missing for master")
        bs.message_format = format_name
        await session.commit()

    out: list[dict] = []
    llm = get_llm()
    for i, sc in enumerate(SCENARIOS):
        async with session_factory() as session:
            master = await _ensure_master(session)
            cl, conv = await _fresh_client_conv(session, master.id, sc.name, i)
            # Pre-load history as Message rows so process_client_message sees them.
            from app.models import Message, MessageDirection

            for role, text in sc.history:
                d = (
                    MessageDirection.IN if role == "user"
                    else MessageDirection.OUT
                )
                session.add(
                    Message(
                        conversation_id=conv.id, direction=d, text=text
                    )
                )
            await session.flush()

            try:
                msg = await process_client_message(
                    session,
                    master=master,
                    conversation=conv,
                    user_text=sc.user,
                    llm=llm,
                )
                meta = msg.llm_meta or {}
                reply = msg.text or ""
                checks = _evaluate(sc, meta, reply, format_name)
                row = {
                    "scenario": sc.name,
                    "format": format_name,
                    "user": sc.user,
                    "reply": reply[:200],
                    "actions": [
                        a.get("type") for a in (meta.get("actions") or [])
                        if isinstance(a, dict)
                    ],
                    "widget": (meta.get("hybrid") or {}).get("widget"),
                    "escalate": bool(meta.get("escalate")),
                    "silent": bool(meta.get("silent")),
                    "checks": checks,
                    "note": sc.note,
                }
                out.append(row)
                await session.rollback()  # don't persist test data
            except Exception as e:
                out.append(
                    {
                        "scenario": sc.name,
                        "format": format_name,
                        "user": sc.user,
                        "error": str(e),
                    }
                )
                await session.rollback()
    return out


def _format_result(rows: list[dict]) -> str:
    lines = []
    fmt = rows[0]["format"] if rows else "-"
    lines.append(f"\n## Format: {fmt}\n")
    lines.append(
        "| Scenario | reply | actions | widget | esc | silent | checks |"
    )
    lines.append("|---|---|---|---|---|---|---|")
    for r in rows:
        if "error" in r:
            lines.append(
                f"| {r['scenario']} | ERROR: {r['error'][:80]} | | | | | |"
            )
            continue
        reply = (r["reply"] or "").replace("|", "\\|").replace("\n", " ")[:80]
        actions = ",".join(r["actions"] or []) or "—"
        widget = r["widget"] or "—"
        esc = "✓" if r["escalate"] else ""
        sil = "✓" if r["silent"] else ""
        checks_summary = " ".join(
            ("✅" if v else "❌") + k for k, v in r["checks"].items()
        )
        lines.append(
            f"| {r['scenario']} | {reply} | {actions} | {widget} | {esc} | {sil} | {checks_summary} |"
        )
    return "\n".join(lines)


async def main() -> None:
    formats = sys.argv[1:] or ["hybrid", "text"]
    full: list[dict] = []
    for f in formats:
        rows = await run_for_format(f)
        print(_format_result(rows))
        full.extend(rows)

    pass_count = sum(
        1 for r in full
        if "checks" in r and all(r["checks"].values())
    )
    fail_count = len([r for r in full if "checks" in r]) - pass_count
    err_count = len([r for r in full if "error" in r])
    print(
        f"\n**Total**: pass={pass_count} fail={fail_count} error={err_count}"
    )

    with open("/tmp/audit_modes.json", "w", encoding="utf-8") as f:
        json.dump(full, f, ensure_ascii=False, indent=2)
    print("\n_Full log: /tmp/audit_modes.json_")


if __name__ == "__main__":
    asyncio.run(main())
