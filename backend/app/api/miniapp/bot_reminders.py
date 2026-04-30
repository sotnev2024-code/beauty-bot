"""Master-level toggle for «напоминания о повторной записи».

Per-service `reminder_after_days` is set via PATCH /api/services/{id}.
This endpoint just flips the global on/off in bot_settings.reminders_enabled
and validates that at least one service has reminder_after_days set when
enabling.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentMaster, SessionDep
from app.models import BotSettings, Service
from app.schemas import BotSettingsRead

router = APIRouter(prefix="/bot/reminders", tags=["bot"])


async def _get_or_create_bot_settings(session: SessionDep, master_id: int) -> BotSettings:
    bs = await session.get(BotSettings, master_id)
    if bs is not None:
        return bs
    bs = BotSettings(master_id=master_id)
    session.add(bs)
    await session.flush()
    return bs


@router.post("/enable", response_model=BotSettingsRead)
async def enable(master: CurrentMaster, session: SessionDep) -> BotSettingsRead:
    has_any = await session.scalar(
        select(func.count())
        .select_from(Service)
        .where(
            Service.master_id == master.id,
            Service.is_active.is_(True),
            Service.reminder_after_days.isnot(None),
        )
    )
    if not has_any:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Чтобы включить напоминания, укажите срок «напомнить через N дней» "
                "хотя бы у одной услуги."
            ),
        )
    bs = await _get_or_create_bot_settings(session, master.id)
    bs.reminders_enabled = True
    await session.commit()
    await session.refresh(bs)
    return BotSettingsRead.model_validate(bs)


@router.post("/disable", response_model=BotSettingsRead)
async def disable(master: CurrentMaster, session: SessionDep) -> BotSettingsRead:
    bs = await _get_or_create_bot_settings(session, master.id)
    bs.reminders_enabled = False
    await session.commit()
    await session.refresh(bs)
    return BotSettingsRead.model_validate(bs)
