"""Funnel management: presets seeding, selection, and step advancement.

Selection rule (DEV_PROMPT):
- New client (no Bookings, conversation just started) → cold funnel if exists.
- Risky/regular client whose first message in 14+ days → return funnel.
- Otherwise → main funnel.

A master can have several funnels of each type. We pick the active one
(is_active=true). Triggered funnels (return/cold) are auto-fired by the
selector even if not explicitly active — `is_active` is mostly relevant for
the main funnel.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Booking,
    Conversation,
    Funnel,
    FunnelStep,
    FunnelType,
)
from app.services.funnel_presets import FunnelPreset, get_preset

NEW_CLIENT_FUNNEL_HOURS = 24  # conversation younger than this → "new"
RETURN_AFTER_DAYS = 14


async def seed_funnel_from_preset(
    session: AsyncSession,
    *,
    master_id: int,
    preset_key: str,
    activate: bool = True,
) -> Funnel:
    preset = get_preset(preset_key)
    funnel = Funnel(
        master_id=master_id,
        name=preset.name,
        type=preset.type,
        is_active=False,
        preset_key=preset.key,
    )
    session.add(funnel)
    await session.flush()
    for step in preset.steps:
        session.add(
            FunnelStep(
                funnel_id=funnel.id,
                position=step.position,
                system_prompt=step.system_prompt,
                goal=step.goal,
                collected_fields=step.collected_fields,
                transition_conditions=step.transition_conditions,
            )
        )
    await session.flush()
    if activate:
        await _activate_funnel(session, funnel)
    return funnel


async def _activate_funnel(session: AsyncSession, funnel: Funnel) -> None:
    """Only one active funnel of the same type per master."""
    result = await session.execute(
        select(Funnel).where(
            Funnel.master_id == funnel.master_id,
            Funnel.type == funnel.type,
            Funnel.id != funnel.id,
        )
    )
    for other in result.scalars():
        if other.is_active:
            other.is_active = False
    funnel.is_active = True


async def activate_funnel(session: AsyncSession, funnel: Funnel) -> None:
    await _activate_funnel(session, funnel)


async def select_funnel_for_conversation(
    session: AsyncSession,
    *,
    master_id: int,
    client_id: int,
    conversation: Conversation,
    now: datetime | None = None,
) -> Funnel | None:
    now = now or datetime.now(UTC)
    funnel_type = await _classify(session, master_id=master_id, client_id=client_id, now=now)

    # Try the matching type, falling back to main if the triggered one isn't set up.
    for ft in (funnel_type, FunnelType.MAIN):
        funnel = await _active_funnel(session, master_id=master_id, type_=ft)
        if funnel is not None:
            return funnel
    return None


async def _classify(
    session: AsyncSession, *, master_id: int, client_id: int, now: datetime
) -> FunnelType:
    bookings_count = await session.scalar(
        select(Booking.id)
        .where(Booking.master_id == master_id, Booking.client_id == client_id)
        .limit(1)
    )
    if not bookings_count:
        return FunnelType.COLD

    # Has prior bookings — check recency.
    last_booking_at = await session.scalar(
        select(Booking.starts_at)
        .where(Booking.master_id == master_id, Booking.client_id == client_id)
        .order_by(Booking.starts_at.desc())
        .limit(1)
    )
    if last_booking_at and now - last_booking_at >= timedelta(days=RETURN_AFTER_DAYS):
        return FunnelType.RETURN
    return FunnelType.MAIN


async def _active_funnel(
    session: AsyncSession, *, master_id: int, type_: FunnelType
) -> Funnel | None:
    result = await session.execute(
        select(Funnel).where(
            Funnel.master_id == master_id,
            Funnel.type == type_,
            Funnel.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def funnel_step_by_id(session: AsyncSession, step_id: int) -> FunnelStep | None:
    return await session.get(FunnelStep, step_id)


async def first_step(session: AsyncSession, funnel_id: int) -> FunnelStep | None:
    result = await session.execute(
        select(FunnelStep)
        .where(FunnelStep.funnel_id == funnel_id)
        .order_by(FunnelStep.position)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def step_after(session: AsyncSession, step: FunnelStep) -> FunnelStep | None:
    """Next step in the same funnel by position."""
    result = await session.execute(
        select(FunnelStep)
        .where(FunnelStep.funnel_id == step.funnel_id, FunnelStep.position > step.position)
        .order_by(FunnelStep.position)
        .limit(1)
    )
    return result.scalar_one_or_none()


# Re-export for convenience
__all__ = [
    "FunnelPreset",
    "activate_funnel",
    "first_step",
    "funnel_step_by_id",
    "seed_funnel_from_preset",
    "select_funnel_for_conversation",
    "step_after",
]
