"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.security import InitDataError, validate_init_data
from app.models import Master

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def current_master(
    session: SessionDep,
    x_telegram_init_data: Annotated[str | None, Header(alias="X-Telegram-Init-Data")] = None,
) -> Master:
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Telegram-Init-Data header missing",
        )
    try:
        payload = validate_init_data(x_telegram_init_data, settings.TELEGRAM_BOT_TOKEN)
    except InitDataError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"initData invalid: {e}"
        ) from e

    tg = payload.user
    result = await session.execute(select(Master).where(Master.telegram_id == tg.id))
    master = result.scalar_one_or_none()

    if master is None:
        master = Master(
            telegram_id=tg.id,
            telegram_username=tg.username,
            name=" ".join(p for p in (tg.first_name, tg.last_name) if p) or None,
            timezone=settings.DEFAULT_TIMEZONE,
        )
        session.add(master)
        await session.commit()
        await session.refresh(master)
    else:
        # Refresh display fields that may have changed in Telegram profile.
        changed = False
        if master.telegram_username != tg.username:
            master.telegram_username = tg.username
            changed = True
        full_name = " ".join(p for p in (tg.first_name, tg.last_name) if p) or None
        if full_name and master.name != full_name:
            master.name = full_name
            changed = True
        if changed:
            await session.commit()
            await session.refresh(master)

    return master


CurrentMaster = Annotated[Master, Depends(current_master)]
