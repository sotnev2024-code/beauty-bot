"""Bot configuration endpoints — settings + enable/disable kill switch.

Test-chat (`/api/bot/test/*`) is added in Step 8 with Redis-backed sessions.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.api.deps import CurrentMaster, SessionDep
from app.models import BotSettings
from app.schemas import BotSettingsRead, BotSettingsUpdate

router = APIRouter(prefix="/bot", tags=["bot"])


async def _get_or_create(session: SessionDep, master_id: int) -> BotSettings:
    bs = await session.get(BotSettings, master_id)
    if bs is not None:
        return bs
    bs = BotSettings(
        master_id=master_id,
        greeting="Здравствуйте! Подскажите, чем могу помочь?",
        voice_tone="warm",
        message_format="hybrid",
        is_enabled=True,
        reminders_enabled=False,
    )
    session.add(bs)
    await session.flush()
    return bs


@router.get("/settings", response_model=BotSettingsRead)
async def get_settings(master: CurrentMaster, session: SessionDep) -> BotSettingsRead:
    bs = await _get_or_create(session, master.id)
    await session.commit()
    return BotSettingsRead.model_validate(bs)


@router.patch("/settings", response_model=BotSettingsRead)
async def patch_settings(
    payload: BotSettingsUpdate, master: CurrentMaster, session: SessionDep
) -> BotSettingsRead:
    bs = await _get_or_create(session, master.id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(bs, k, v)
    if data and bs.configured_at is None:
        bs.configured_at = datetime.now(UTC)
    # Mirror the kill-switch into the legacy master.bot_enabled flag for the
    # business handler that still checks it.
    if "is_enabled" in data:
        master.bot_enabled = bool(data["is_enabled"])
    await session.commit()
    await session.refresh(bs)
    return BotSettingsRead.model_validate(bs)


@router.post("/enable", response_model=BotSettingsRead)
async def enable_bot(master: CurrentMaster, session: SessionDep) -> BotSettingsRead:
    bs = await _get_or_create(session, master.id)
    bs.is_enabled = True
    master.bot_enabled = True
    await session.commit()
    await session.refresh(bs)
    return BotSettingsRead.model_validate(bs)


@router.post("/disable", response_model=BotSettingsRead)
async def disable_bot(master: CurrentMaster, session: SessionDep) -> BotSettingsRead:
    bs = await _get_or_create(session, master.id)
    bs.is_enabled = False
    master.bot_enabled = False
    await session.commit()
    await session.refresh(bs)
    return BotSettingsRead.model_validate(bs)
