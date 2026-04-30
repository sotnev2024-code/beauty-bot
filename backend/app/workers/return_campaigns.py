"""Return-flow scheduler logic — daily invitations + hourly expiry sweep.

`send_due_return_invitations` is invoked once per hour by the scheduler. It
short-circuits when the master's local time is not the configured send hour
(default 11:00). For each enabled master at the right hour, it finds clients
that:
  * Have at least one completed booking
  * Last booking >= `trigger_after_days` days ago
  * Have no active ReturnCampaign (status='sent', valid_until in future)
  * Have not received a campaign in the last 6 months (cooldown)
  * Have an open conversation with the master (so we have a chat_id)

Generates the invitation text from `proactive_message.render_return` (uses
the master's voice_tone), sends via Business API, creates ReturnCampaign +
Message rows.

`expire_due_campaigns` flips status `sent` → `expired` for campaigns whose
`discount_valid_until` is past.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Awaitable, Callable
from zoneinfo import ZoneInfo

from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    BookingStatus,
    BotSettings,
    BusinessConnection,
    Client,
    Conversation,
    Master,
    Message,
    MessageDirection,
    ReturnCampaign,
    ReturnSettings,
)
from app.services.proactive_message import render_return

log = logging.getLogger(__name__)

SEND_HOUR_LOCAL = 11
COOLDOWN_DAYS = 180  # Don't re-invite the same client more than once per ~6mo

Sender = Callable[..., Awaitable[None]]


async def expire_due_campaigns(session: AsyncSession) -> int:
    """Flip status 'sent' → 'expired' for campaigns past their valid_until."""
    now = datetime.now(UTC)
    rows = (
        (
            await session.execute(
                select(ReturnCampaign).where(
                    ReturnCampaign.status == "sent",
                    ReturnCampaign.discount_valid_until <= now,
                )
            )
        )
        .scalars()
        .all()
    )
    for r in rows:
        r.status = "expired"
    return len(rows)


async def send_due_return_invitations(
    session: AsyncSession,
    *,
    sender: Sender,
    now: datetime | None = None,
    force_master_id: int | None = None,
) -> int:
    """Run one tick of the return-invitation flow. Returns count of sends.

    `force_master_id` skips the local-hour gate for that master — useful for
    manual/admin triggers.
    """
    now = now or datetime.now(UTC)

    # Masters with enabled return + a registered business connection.
    masters_q = (
        select(Master)
        .join(ReturnSettings, ReturnSettings.master_id == Master.id)
        .where(ReturnSettings.is_enabled.is_(True))
    )
    if force_master_id is not None:
        masters_q = masters_q.where(Master.id == force_master_id)
    masters = (await session.execute(masters_q)).scalars().all()

    sent_total = 0
    for master in masters:
        if force_master_id is None and not _is_send_hour(master, now):
            continue
        rs = await session.get(ReturnSettings, master.id)
        if rs is None or not rs.is_enabled:
            continue
        bc = await _active_business_connection_id(session, master.id)
        if bc is None:
            continue
        bs = await session.get(BotSettings, master.id)
        voice_tone = bs.voice_tone if bs else "warm"

        candidates = await _find_due_clients(
            session, master_id=master.id, settings_=rs, now=now
        )
        for client, last_booking_at in candidates:
            try:
                await _send_one(
                    session,
                    sender=sender,
                    master=master,
                    client=client,
                    business_connection_id=bc,
                    settings_=rs,
                    voice_tone=voice_tone,
                    last_booking_at=last_booking_at,
                    now=now,
                )
                sent_total += 1
            except Exception:
                log.exception(
                    "return invitation failed for master=%s client=%s",
                    master.id,
                    client.id,
                )
    return sent_total


# ---------------------------------------------------------------- internals


def _is_send_hour(master: Master, now: datetime) -> bool:
    try:
        tz = ZoneInfo(master.timezone)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    return now.astimezone(tz).hour == SEND_HOUR_LOCAL


async def _find_due_clients(
    session: AsyncSession,
    *,
    master_id: int,
    settings_: ReturnSettings,
    now: datetime,
) -> list[tuple[Client, datetime]]:
    threshold_old = now - timedelta(days=settings_.trigger_after_days)
    threshold_cooldown = now - timedelta(days=COOLDOWN_DAYS)

    # Subquery: max(starts_at) per client of completed bookings.
    last_booking = (
        select(
            Booking.client_id.label("client_id"),
            func.max(Booking.starts_at).label("last_at"),
        )
        .where(
            Booking.master_id == master_id,
            Booking.status == BookingStatus.DONE,
        )
        .group_by(Booking.client_id)
        .subquery()
    )

    # Active campaign filter (sent + still valid).
    active_campaign = exists().where(
        and_(
            ReturnCampaign.client_id == Client.id,
            ReturnCampaign.master_id == master_id,
            ReturnCampaign.status == "sent",
            ReturnCampaign.discount_valid_until > now,
        )
    )

    # Recent campaign filter (any kind in last 6 months).
    recent_campaign = exists().where(
        and_(
            ReturnCampaign.client_id == Client.id,
            ReturnCampaign.master_id == master_id,
            ReturnCampaign.sent_at > threshold_cooldown,
        )
    )

    # Open conversation with the master — needed to have a chat to send into.
    has_conv = exists().where(
        and_(
            Conversation.client_id == Client.id,
            Conversation.master_id == master_id,
        )
    )

    rows = (
        await session.execute(
            select(Client, last_booking.c.last_at)
            .join(last_booking, last_booking.c.client_id == Client.id)
            .where(
                Client.master_id == master_id,
                last_booking.c.last_at <= threshold_old,
                ~active_campaign,
                ~recent_campaign,
                has_conv,
            )
            .limit(50)
        )
    ).all()
    return [(c, t) for c, t in rows]


async def _send_one(
    session: AsyncSession,
    *,
    sender: Sender,
    master: Master,
    client: Client,
    business_connection_id: str,
    settings_: ReturnSettings,
    voice_tone: str,
    last_booking_at: datetime,
    now: datetime,
) -> None:
    # Find the active conversation (latest one) so we attach the proactive
    # message to it — UI surfaces it to the master that way.
    conv = (
        await session.execute(
            select(Conversation)
            .where(
                Conversation.master_id == master.id,
                Conversation.client_id == client.id,
            )
            .order_by(Conversation.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if conv is None:
        log.warning("no conversation for client=%s master=%s; skipping", client.id, master.id)
        return

    valid_until = now + timedelta(days=settings_.discount_valid_days)
    text = render_return(
        voice_tone=voice_tone,
        client_name=client.name,
        discount_percent=settings_.discount_percent,
        valid_until_str=valid_until.astimezone(_master_tz(master)).strftime("%d.%m"),
    )

    await sender(
        client_telegram_id=client.telegram_id,
        business_connection_id=business_connection_id,
        text=text,
    )

    msg = Message(
        conversation_id=conv.id,
        direction=MessageDirection.OUT,
        text=text,
        is_proactive=True,
        llm_meta={"proactive_kind": "return"},
    )
    session.add(msg)
    await session.flush()

    campaign = ReturnCampaign(
        master_id=master.id,
        client_id=client.id,
        sent_at=now,
        discount_percent=settings_.discount_percent,
        discount_valid_until=valid_until,
        status="sent",
        message_id=msg.id,
    )
    session.add(campaign)
    await session.flush()

    msg.llm_meta = {"proactive_kind": "return", "campaign_id": campaign.id}


async def _active_business_connection_id(session: AsyncSession, master_id: int) -> str | None:
    row = (
        await session.execute(
            select(BusinessConnection).where(
                BusinessConnection.master_id == master_id,
                BusinessConnection.is_enabled.is_(True),
            )
        )
    ).scalar_one_or_none()
    return row.telegram_business_connection_id if row else None


def _master_tz(master: Master) -> ZoneInfo:
    try:
        return ZoneInfo(master.timezone)
    except Exception:
        return ZoneInfo("Europe/Moscow")
