"""Return-flow settings: trigger threshold, discount %, validity window."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.api.deps import CurrentMaster, SessionDep
from app.models import ReturnSettings
from app.schemas import ReturnSettingsRead, ReturnSettingsUpdate

router = APIRouter(prefix="/bot/return-settings", tags=["bot"])


async def _get_or_create(session: SessionDep, master_id: int) -> ReturnSettings:
    rs = await session.get(ReturnSettings, master_id)
    if rs is not None:
        return rs
    rs = ReturnSettings(master_id=master_id)
    session.add(rs)
    await session.flush()
    return rs


@router.get("", response_model=ReturnSettingsRead)
async def get_settings(
    master: CurrentMaster, session: SessionDep
) -> ReturnSettingsRead:
    rs = await _get_or_create(session, master.id)
    await session.commit()
    return ReturnSettingsRead.model_validate(rs)


@router.patch("", response_model=ReturnSettingsRead)
async def patch_settings(
    payload: ReturnSettingsUpdate, master: CurrentMaster, session: SessionDep
) -> ReturnSettingsRead:
    rs = await _get_or_create(session, master.id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(rs, k, v)
    if data and rs.configured_at is None:
        rs.configured_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(rs)
    return ReturnSettingsRead.model_validate(rs)


@router.post("/enable", response_model=ReturnSettingsRead)
async def enable(master: CurrentMaster, session: SessionDep) -> ReturnSettingsRead:
    rs = await _get_or_create(session, master.id)
    rs.is_enabled = True
    if rs.configured_at is None:
        rs.configured_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(rs)
    return ReturnSettingsRead.model_validate(rs)


@router.post("/disable", response_model=ReturnSettingsRead)
async def disable(master: CurrentMaster, session: SessionDep) -> ReturnSettingsRead:
    rs = await _get_or_create(session, master.id)
    rs.is_enabled = False
    await session.commit()
    await session.refresh(rs)
    return ReturnSettingsRead.model_validate(rs)
