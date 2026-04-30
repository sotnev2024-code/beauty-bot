"""Auto-segmentation per DEV_PROMPT.

Segments:
- regular — 3+ visits (DONE bookings)
- new     — 1 visit, < 30 days ago
- risky   — had visits, last visit's gap > master's typical interval
- lost    — last visit > 90 days ago
- vip     — top 20% by total revenue (within master)

The recompute is idempotent: it deletes existing rows for a master and
re-inserts the current set in one transaction.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    Client,
    ClientSegment,
    Master,
    Segment,
)

LOST_DAYS = 90
NEW_DAYS = 30
REGULAR_VISITS = 3
RISKY_GAP_MULTIPLIER = 2.0
VIP_TOP_FRACTION = 0.2


async def recompute_for_master(
    session: AsyncSession,
    *,
    master_id: int,
    now: datetime | None = None,
) -> dict[Segment, int]:
    """Recalculate ClientSegment rows for one master. Returns counts per segment."""
    now = now or datetime.now(UTC)

    rows = (
        (
            await session.execute(
                select(Booking).where(
                    Booking.master_id == master_id,
                    Booking.status == BookingStatus.DONE,
                )
            )
        )
        .scalars()
        .all()
    )

    by_client: dict[int, list[Booking]] = defaultdict(list)
    for b in rows:
        by_client[b.client_id].append(b)

    # Compute typical-interval per client (median of consecutive deltas).
    interval_days: dict[int, float] = {}
    for cid, bks in by_client.items():
        bks.sort(key=lambda b: b.starts_at)
        if len(bks) < 2:
            continue
        deltas = [(bks[i].starts_at - bks[i - 1].starts_at).days for i in range(1, len(bks))]
        deltas.sort()
        mid = len(deltas) // 2
        interval_days[cid] = float(deltas[mid] if deltas else 0)

    # VIP set — top fraction by revenue.
    revenue: dict[int, Decimal] = {}
    for cid, bks in by_client.items():
        revenue[cid] = sum(
            (Decimal(b.price) for b in bks if b.price is not None), start=Decimal("0")
        )
    if revenue:
        sorted_clients = sorted(revenue.items(), key=lambda kv: kv[1], reverse=True)
        cutoff = max(1, int(len(sorted_clients) * VIP_TOP_FRACTION))
        vip_set = {cid for cid, _ in sorted_clients[:cutoff]}
    else:
        vip_set = set()

    # Wipe existing segments for this master's clients.
    await session.execute(
        delete(ClientSegment).where(
            ClientSegment.client_id.in_(select(Client.id).where(Client.master_id == master_id))
        )
    )

    counts: dict[Segment, int] = {s: 0 for s in Segment}

    # All clients (including ones with zero done bookings).
    clients = (
        (await session.execute(select(Client).where(Client.master_id == master_id))).scalars().all()
    )

    for c in clients:
        bks = by_client.get(c.id, [])
        last_visit = bks[-1].starts_at if bks else None
        days_since_last = (now - last_visit).days if last_visit else None
        n_visits = len(bks)

        seg: Segment | None = None
        if days_since_last is not None and days_since_last > LOST_DAYS:
            seg = Segment.LOST
        elif n_visits >= REGULAR_VISITS:
            typical = interval_days.get(c.id, 0)
            if (
                days_since_last is not None
                and typical > 0
                and days_since_last > typical * RISKY_GAP_MULTIPLIER
            ):
                seg = Segment.RISKY
            else:
                seg = Segment.REGULAR
        elif n_visits == 1 and days_since_last is not None and days_since_last <= NEW_DAYS:
            seg = Segment.NEW
        elif n_visits >= 1:
            seg = Segment.RISKY if days_since_last and days_since_last > 45 else None

        if seg is not None:
            session.add(ClientSegment(client_id=c.id, segment=seg, updated_at=now))
            counts[seg] += 1
        if c.id in vip_set:
            session.add(ClientSegment(client_id=c.id, segment=Segment.VIP, updated_at=now))
            counts[Segment.VIP] += 1
    await session.flush()
    return counts


async def recompute_all(session: AsyncSession) -> int:
    masters = (await session.execute(select(Master.id))).scalars().all()
    total = 0
    for mid in masters:
        counts = await recompute_for_master(session, master_id=mid)
        total += sum(counts.values())
    return total
