from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import distinct, func, select

from app.api.deps import CurrentMaster, SessionDep
from app.models import Booking, BookingStatus, Client, Conversation, ReturnCampaign

router = APIRouter(prefix="/analytics", tags=["analytics"])


class ReturnCampaignsBlock(BaseModel):
    sent: int
    booked: int
    expired: int
    revenue: Decimal


class OverviewResponse(BaseModel):
    period_from: date
    period_to: date
    bookings_total: int
    bookings_done: int
    bookings_cancelled: int
    revenue: Decimal
    new_clients: int
    active_conversations: int
    return_campaigns: ReturnCampaignsBlock


class DashboardResponse(BaseModel):
    today_bookings: int
    today_revenue: Decimal
    week_bookings: int
    week_revenue: Decimal
    pending_takeovers: int
    bot_enabled: bool


@router.get("/overview", response_model=OverviewResponse)
async def overview(
    master: CurrentMaster,
    session: SessionDep,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
) -> OverviewResponse:
    today = datetime.now(UTC).date()
    f = from_date or (today - timedelta(days=30))
    t = to_date or today

    win_start = datetime.combine(f, time(0), tzinfo=UTC)
    win_end = datetime.combine(t + timedelta(days=1), time(0), tzinfo=UTC)

    base = select(Booking).where(
        Booking.master_id == master.id,
        Booking.starts_at >= win_start,
        Booking.starts_at < win_end,
    )

    bookings_total = await session.scalar(select(func.count()).select_from(base.subquery()))
    bookings_done = await session.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.master_id == master.id,
            Booking.status == BookingStatus.DONE,
            Booking.starts_at >= win_start,
            Booking.starts_at < win_end,
        )
    )
    bookings_cancelled = await session.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.master_id == master.id,
            Booking.status == BookingStatus.CANCELLED,
            Booking.starts_at >= win_start,
            Booking.starts_at < win_end,
        )
    )
    revenue = await session.scalar(
        select(func.coalesce(func.sum(Booking.price), 0)).where(
            Booking.master_id == master.id,
            Booking.status == BookingStatus.DONE,
            Booking.starts_at >= win_start,
            Booking.starts_at < win_end,
        )
    )
    new_clients = await session.scalar(
        select(func.count(distinct(Client.id))).where(
            Client.master_id == master.id,
            Client.first_seen_at >= win_start,
            Client.first_seen_at < win_end,
        )
    )
    active_conv = await session.scalar(
        select(func.count())
        .select_from(Conversation)
        .where(
            Conversation.master_id == master.id,
            Conversation.last_message_at >= win_start,
        )
    )

    rc_sent = await session.scalar(
        select(func.count()).select_from(ReturnCampaign).where(
            ReturnCampaign.master_id == master.id,
            ReturnCampaign.sent_at >= win_start,
            ReturnCampaign.sent_at < win_end,
        )
    )
    rc_booked = await session.scalar(
        select(func.count()).select_from(ReturnCampaign).where(
            ReturnCampaign.master_id == master.id,
            ReturnCampaign.sent_at >= win_start,
            ReturnCampaign.sent_at < win_end,
            ReturnCampaign.status == "booked",
        )
    )
    rc_expired = await session.scalar(
        select(func.count()).select_from(ReturnCampaign).where(
            ReturnCampaign.master_id == master.id,
            ReturnCampaign.sent_at >= win_start,
            ReturnCampaign.sent_at < win_end,
            ReturnCampaign.status.in_(["expired", "expired_late_response"]),
        )
    )
    rc_revenue = await session.scalar(
        select(func.coalesce(func.sum(Booking.price), 0))
        .join(ReturnCampaign, ReturnCampaign.booking_id == Booking.id)
        .where(
            ReturnCampaign.master_id == master.id,
            ReturnCampaign.sent_at >= win_start,
            ReturnCampaign.sent_at < win_end,
            ReturnCampaign.status == "booked",
            Booking.status == BookingStatus.DONE,
        )
    )

    return OverviewResponse(
        period_from=f,
        period_to=t,
        bookings_total=bookings_total or 0,
        bookings_done=bookings_done or 0,
        bookings_cancelled=bookings_cancelled or 0,
        revenue=Decimal(revenue or 0),
        new_clients=new_clients or 0,
        active_conversations=active_conv or 0,
        return_campaigns=ReturnCampaignsBlock(
            sent=rc_sent or 0,
            booked=rc_booked or 0,
            expired=rc_expired or 0,
            revenue=Decimal(rc_revenue or 0),
        ),
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(master: CurrentMaster, session: SessionDep) -> DashboardResponse:
    now = datetime.now(UTC)
    today = now.date()
    today_start = datetime.combine(today, time(0), tzinfo=UTC)
    today_end = today_start + timedelta(days=1)
    week_start = today_start - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    today_bookings = await session.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.master_id == master.id,
            Booking.starts_at >= today_start,
            Booking.starts_at < today_end,
            Booking.status != BookingStatus.CANCELLED,
        )
    )
    today_revenue = await session.scalar(
        select(func.coalesce(func.sum(Booking.price), 0)).where(
            Booking.master_id == master.id,
            Booking.starts_at >= today_start,
            Booking.starts_at < today_end,
            Booking.status == BookingStatus.DONE,
        )
    )
    week_bookings = await session.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.master_id == master.id,
            Booking.starts_at >= week_start,
            Booking.starts_at < week_end,
            Booking.status != BookingStatus.CANCELLED,
        )
    )
    week_revenue = await session.scalar(
        select(func.coalesce(func.sum(Booking.price), 0)).where(
            Booking.master_id == master.id,
            Booking.starts_at >= week_start,
            Booking.starts_at < week_end,
            Booking.status == BookingStatus.DONE,
        )
    )
    pending_takeovers = await session.scalar(
        select(func.count())
        .select_from(Conversation)
        .where(
            Conversation.master_id == master.id,
            Conversation.takeover_until > now,
        )
    )

    return DashboardResponse(
        today_bookings=today_bookings or 0,
        today_revenue=Decimal(today_revenue or 0),
        week_bookings=week_bookings or 0,
        week_revenue=Decimal(week_revenue or 0),
        pending_takeovers=pending_takeovers or 0,
        bot_enabled=master.bot_enabled,
    )
