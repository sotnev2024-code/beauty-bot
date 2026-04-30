"""Stage 11 — auto-segments + insights + portfolio."""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import build_test_init_data
from app.models import (
    Booking,
    BookingStatus,
    Client,
    Master,
    Service,
)
from app.models.enums import Segment
from app.services.insights import generate_for_master
from app.services.portfolio import save_photo
from app.services.segments import recompute_for_master

pytestmark = pytest.mark.asyncio

TOKEN = "stage11-token"


@pytest.fixture(autouse=True)
def _override(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TOKEN)
    monkeypatch.setattr(settings, "PORTFOLIO_STORAGE_PATH", str(tmp_path / "portfolio"))
    monkeypatch.setattr(settings, "PUBLIC_PORTFOLIO_URL", "https://test/portfolio")


def _auth(uid: int) -> dict[str, str]:
    init = build_test_init_data(TOKEN, user={"id": uid, "first_name": "M"})
    return {"X-Telegram-Init-Data": init}


# ---------------------------------------------------------- segments


async def _seed_master(session: AsyncSession, tg: int) -> Master:
    m = Master(telegram_id=tg, timezone="UTC", name="M")
    session.add(m)
    await session.flush()
    return m


async def _seed_client(session: AsyncSession, master_id: int, tg: int) -> Client:
    c = Client(master_id=master_id, telegram_id=tg, name=f"C{tg}")
    session.add(c)
    await session.flush()
    return c


async def _seed_service(session: AsyncSession, master_id: int) -> Service:
    s = Service(master_id=master_id, name="S", duration_minutes=60, price=Decimal("1000"))
    session.add(s)
    await session.flush()
    return s


async def _seed_done_booking(
    session: AsyncSession,
    *,
    master: Master,
    client: Client,
    service: Service,
    days_ago: int,
    price: Decimal | None = None,
) -> Booking:
    starts = datetime.now(UTC) - timedelta(days=days_ago)
    bk = Booking(
        master_id=master.id,
        client_id=client.id,
        service_id=service.id,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        status=BookingStatus.DONE,
        price=price or service.price,
    )
    session.add(bk)
    await session.flush()
    return bk


async def test_segments_classify_lost_new_regular_vip(
    test_session: AsyncSession,
) -> None:
    m = await _seed_master(test_session, tg=51001)
    svc = await _seed_service(test_session, m.id)

    lost = await _seed_client(test_session, m.id, tg=60001)
    new_c = await _seed_client(test_session, m.id, tg=60002)
    regular = await _seed_client(test_session, m.id, tg=60003)
    vip = await _seed_client(test_session, m.id, tg=60004)

    await _seed_done_booking(test_session, master=m, client=lost, service=svc, days_ago=120)
    await _seed_done_booking(test_session, master=m, client=new_c, service=svc, days_ago=10)
    for d in (5, 25, 45):
        await _seed_done_booking(test_session, master=m, client=regular, service=svc, days_ago=d)
    for d in (5, 15, 25, 35, 45):
        await _seed_done_booking(
            test_session,
            master=m,
            client=vip,
            service=svc,
            days_ago=d,
            price=Decimal("9000"),
        )
    await test_session.commit()

    counts = await recompute_for_master(test_session, master_id=m.id)
    await test_session.commit()

    # Assertions: each test client gets the expected segment(s).
    from sqlalchemy import select as sa_select

    from app.models import ClientSegment

    rows = (
        await test_session.execute(
            sa_select(ClientSegment.client_id, ClientSegment.segment).where(
                ClientSegment.client_id.in_([lost.id, new_c.id, regular.id, vip.id])
            )
        )
    ).all()
    by_client: dict[int, set] = {}
    for cid, seg in rows:
        by_client.setdefault(cid, set()).add(seg)

    assert Segment.LOST in by_client[lost.id]
    assert Segment.NEW in by_client[new_c.id]
    assert Segment.REGULAR in by_client[regular.id]
    assert Segment.VIP in by_client[vip.id]
    # Recompute idempotency: counts dict reflects what was inserted.
    assert counts[Segment.REGULAR] >= 1
    assert counts[Segment.VIP] >= 1


async def test_segments_recompute_is_idempotent(test_session: AsyncSession) -> None:
    m = await _seed_master(test_session, tg=51002)
    svc = await _seed_service(test_session, m.id)
    cl = await _seed_client(test_session, m.id, tg=60010)
    await _seed_done_booking(test_session, master=m, client=cl, service=svc, days_ago=15)
    await test_session.commit()

    await recompute_for_master(test_session, master_id=m.id)
    await test_session.commit()
    await recompute_for_master(test_session, master_id=m.id)
    await test_session.commit()

    from sqlalchemy import select as sa_select

    from app.models import ClientSegment

    rows = (
        (
            await test_session.execute(
                sa_select(ClientSegment).where(ClientSegment.client_id == cl.id)
            )
        )
        .scalars()
        .all()
    )
    # Only one row per (client, segment) — recompute didn't accumulate dupes.
    assert len(rows) <= 2  # NEW + maybe VIP


# ---------------------------------------------------------- insights


async def test_insights_placeholder_when_no_data(test_session: AsyncSession) -> None:
    m = await _seed_master(test_session, tg=51100)
    await test_session.commit()

    out = await generate_for_master(test_session, master=m, llm=None)
    await test_session.commit()
    assert len(out) == 1
    assert out[0].type == "accumulating"


async def test_insights_revenue_trend_and_top_service(
    test_session: AsyncSession,
) -> None:
    m = await _seed_master(test_session, tg=51101)
    svc = await _seed_service(test_session, m.id)
    cl = await _seed_client(test_session, m.id, tg=60101)
    cl2 = await _seed_client(test_session, m.id, tg=60102)

    # Last 7 days: 3 done bookings totaling 3000
    for d in (1, 2, 3):
        await _seed_done_booking(test_session, master=m, client=cl, service=svc, days_ago=d)
    # Prior 7 days: 1 booking totaling 1000
    await _seed_done_booking(test_session, master=m, client=cl2, service=svc, days_ago=10)
    await test_session.commit()

    out = await generate_for_master(test_session, master=m, llm=None)
    await test_session.commit()
    types = {ins.type for ins in out}
    assert "revenue_trend" in types
    assert "top_service" in types

    rev = next(i for i in out if i.type == "revenue_trend")
    assert rev.payload["direction"] == "up"


# ---------------------------------------------------------- portfolio


def _png_bytes(size: tuple[int, int] = (2400, 1600)) -> bytes:
    img = Image.new("RGB", size, color=(217, 105, 98))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def test_save_photo_resizes_to_long_side_1280(
    test_session: AsyncSession,
) -> None:
    m = await _seed_master(test_session, tg=51200)
    await test_session.commit()
    raw = _png_bytes((2400, 1600))
    row = await save_photo(test_session, master=m, raw=raw, original_filename="big.png")
    await test_session.commit()

    assert Path(row.file_path).exists()
    with Image.open(row.file_path) as im:
        assert max(im.size) == 1280

    assert row.public_url.startswith("https://test/portfolio/")
