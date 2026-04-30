from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import Insight

router = APIRouter(prefix="/insights", tags=["insights"])


class InsightRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    week_start: date
    type: str
    text: str | None
    payload: dict[str, Any] | None
    created_at: datetime


@router.get("", response_model=list[InsightRead])
async def list_insights(master: CurrentMaster, session: SessionDep) -> list[InsightRead]:
    rows = (
        (
            await session.execute(
                select(Insight)
                .where(Insight.master_id == master.id)
                .order_by(Insight.id.desc())
                .limit(50)
            )
        )
        .scalars()
        .all()
    )
    return [InsightRead.model_validate(r) for r in rows]
