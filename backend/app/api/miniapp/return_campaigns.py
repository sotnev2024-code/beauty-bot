"""Return campaign queries — per-master listing and per-client history."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import Client, ReturnCampaign
from app.schemas import ReturnCampaignRead

router = APIRouter(tags=["bot"])


@router.get("/bot/return-campaigns", response_model=list[ReturnCampaignRead])
async def list_campaigns(
    master: CurrentMaster,
    session: SessionDep,
    status_filter: str | None = Query(default=None, alias="status"),
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[ReturnCampaignRead]:
    q = select(ReturnCampaign).where(ReturnCampaign.master_id == master.id)
    if status_filter:
        q = q.where(ReturnCampaign.status == status_filter)
    if from_date:
        q = q.where(ReturnCampaign.sent_at >= from_date)
    if to_date:
        q = q.where(ReturnCampaign.sent_at <= to_date)
    q = q.order_by(ReturnCampaign.sent_at.desc()).limit(200)
    rows = (await session.execute(q)).scalars().all()
    return [ReturnCampaignRead.model_validate(r) for r in rows]


@router.get("/clients/{client_id}/return-history", response_model=list[ReturnCampaignRead])
async def client_history(
    client_id: int, master: CurrentMaster, session: SessionDep
) -> list[ReturnCampaignRead]:
    cl = await session.get(Client, client_id)
    if cl is None or cl.master_id != master.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="client not found"
        )
    rows = (
        (
            await session.execute(
                select(ReturnCampaign)
                .where(
                    ReturnCampaign.master_id == master.id,
                    ReturnCampaign.client_id == client_id,
                )
                .order_by(ReturnCampaign.sent_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [ReturnCampaignRead.model_validate(r) for r in rows]
