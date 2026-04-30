"""Hybrid weekly insights: rule-based pattern detection + DeepSeek phrasing.

Patterns we look for over the past 7 days vs the prior 7 days:
- revenue_trend (up/down/flat)
- top_service (most-booked DONE service)
- new_client_share (share of bookings from new clients)
- gap_clients (count of clients flipped to RISKY/LOST since last week)
- weekday_peak (most-booked weekday)

Each pattern emits a structured payload + a Russian one-liner. If the LLM
provider is configured, we ask it to rewrite the lines into the master's
voice; if it errors, we keep the rule-based copy (bot never falls down).
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.base import LLMProvider, LLMServiceError
from app.llm.prompts import build_system_prompt
from app.models import (
    Booking,
    BookingStatus,
    Insight,
    Master,
    Service,
)

log = logging.getLogger(__name__)

PERIOD_DAYS = 7


async def generate_for_master(
    session: AsyncSession,
    *,
    master: Master,
    llm: LLMProvider | None = None,
    now: datetime | None = None,
) -> list[Insight]:
    now = now or datetime.now(UTC)
    week_start = (now - timedelta(days=PERIOD_DAYS)).date()
    prev_start = (now - timedelta(days=2 * PERIOD_DAYS)).date()

    bookings = await _bookings_window(session, master.id, prev_start, now)
    if len(bookings) < 3:
        # Not enough signal — surface the "accumulating data" placeholder once.
        existing = (
            (
                await session.execute(
                    select(Insight).where(
                        Insight.master_id == master.id,
                        Insight.week_start == week_start,
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing is None:
            placeholder = Insight(
                master_id=master.id,
                week_start=week_start,
                type="accumulating",
                payload={"have": len(bookings), "need": 3},
                text=(
                    "Накапливаем данные. Инсайты появятся, как только наберётся "
                    "пара недель работы."
                ),
            )
            session.add(placeholder)
            await session.flush()
            return [placeholder]
        return []

    rules = _detect_patterns(bookings, now=now)
    services_by_id = await _services_by_id(session, master.id)

    out: list[Insight] = []
    rule_lines: list[str] = []
    for r in rules:
        text = _render_rule(r, services_by_id)
        rule_lines.append(text)
        out.append(
            Insight(
                master_id=master.id,
                week_start=week_start,
                type=r["type"],
                payload=r,
                text=text,
            )
        )

    if llm is not None and rule_lines:
        try:
            await _polish_with_llm(out, master=master, llm=llm)
        except LLMServiceError as e:
            log.info("insight LLM polish skipped: %s", e)

    for ins in out:
        session.add(ins)
    await session.flush()
    return out


# ----------------------------------------------------------------- helpers


async def _bookings_window(
    session: AsyncSession, master_id: int, since: date, until: datetime
) -> list[Booking]:
    rows = (
        (
            await session.execute(
                select(Booking).where(
                    Booking.master_id == master_id,
                    Booking.starts_at >= datetime.combine(since, datetime.min.time(), tzinfo=UTC),
                    Booking.starts_at <= until,
                )
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


async def _services_by_id(session: AsyncSession, master_id: int) -> dict[int, str]:
    rows = (
        (await session.execute(select(Service).where(Service.master_id == master_id)))
        .scalars()
        .all()
    )
    return {s.id: s.name for s in rows}


def _detect_patterns(bookings: list[Booking], *, now: datetime) -> list[dict[str, Any]]:
    week_cut = now - timedelta(days=PERIOD_DAYS)
    prev_cut = now - timedelta(days=2 * PERIOD_DAYS)

    week = [b for b in bookings if b.starts_at >= week_cut]
    prev = [b for b in bookings if prev_cut <= b.starts_at < week_cut]

    out: list[dict[str, Any]] = []

    # Revenue trend
    rev_week = sum(
        (Decimal(b.price) for b in week if b.price and b.status == BookingStatus.DONE),
        Decimal("0"),
    )
    rev_prev = sum(
        (Decimal(b.price) for b in prev if b.price and b.status == BookingStatus.DONE),
        Decimal("0"),
    )
    if rev_prev > 0:
        delta_pct = float((rev_week - rev_prev) / rev_prev * 100)
    else:
        delta_pct = 100.0 if rev_week > 0 else 0.0
    direction = "flat"
    if delta_pct > 10:
        direction = "up"
    elif delta_pct < -10:
        direction = "down"
    out.append(
        {
            "type": "revenue_trend",
            "direction": direction,
            "delta_pct": round(delta_pct, 1),
            "rev_week": str(rev_week),
            "rev_prev": str(rev_prev),
        }
    )

    # Top service
    service_counts = Counter(b.service_id for b in week if b.service_id)
    if service_counts:
        sid, n = service_counts.most_common(1)[0]
        out.append({"type": "top_service", "service_id": sid, "count": n})

    # Weekday peak
    wd_counts = Counter(b.starts_at.weekday() for b in week)
    if wd_counts:
        wd, n = wd_counts.most_common(1)[0]
        out.append({"type": "weekday_peak", "weekday": wd, "count": n})

    # New-client share
    seen_before = {b.client_id for b in prev}
    new_in_week = {b.client_id for b in week if b.client_id not in seen_before}
    if week:
        share = round(len(new_in_week) / len(week) * 100, 1)
        out.append(
            {"type": "new_client_share", "share_pct": share, "new_clients": len(new_in_week)}
        )

    return out


WEEKDAY_RU = ["понедельник", "вторник", "среду", "четверг", "пятницу", "субботу", "воскресенье"]


def _render_rule(rule: dict[str, Any], services_by_id: dict[int, str]) -> str:
    t = rule["type"]
    if t == "revenue_trend":
        d = rule["direction"]
        pct = rule["delta_pct"]
        if d == "up":
            return f"Выручка за неделю выросла на {pct}% к прошлой неделе."
        if d == "down":
            return f"Выручка снизилась на {abs(pct)}% к прошлой неделе."
        return "Выручка держится на уровне прошлой недели."
    if t == "top_service":
        name = services_by_id.get(rule["service_id"], "услуга")
        return f"Топ-услуга недели — {name} ({rule['count']} записей)."
    if t == "weekday_peak":
        return f"Самый загруженный день — {WEEKDAY_RU[rule['weekday']]}."
    if t == "new_client_share":
        return (
            f"Новые клиенты составили {rule['share_pct']}% записей "
            f"({rule['new_clients']} человек)."
        )
    return ""


async def _polish_with_llm(insights: list[Insight], *, master: Master, llm: LLMProvider) -> None:
    """Optionally rewrite insight lines in the master's voice. Best-effort."""
    base_prompt = build_system_prompt(master_name=master.name, niche=master.niche)
    for ins in insights:
        if not ins.text:
            continue
        try:
            result = await llm.generate(
                system_prompt=(
                    base_prompt + "\n\nПерефразируй короткий инсайт ниже в одном-двух "
                    "предложениях, сохраняя цифры и тон."
                ),
                history=[],
                user_message=ins.text,
            )
            if result.reply:
                ins.text = result.reply
        except LLMServiceError:
            # Keep rule-based text — never block insights on LLM
            raise
