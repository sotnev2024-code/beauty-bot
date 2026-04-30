"""Portfolio endpoints. List/delete are real; upload is fully implemented in Stage 11."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import PortfolioPhoto

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class PortfolioPhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    public_url: str
    created_at: datetime


@router.get("", response_model=list[PortfolioPhotoRead])
async def list_photos(master: CurrentMaster, session: SessionDep) -> list[PortfolioPhotoRead]:
    rows = (
        (
            await session.execute(
                select(PortfolioPhoto)
                .where(PortfolioPhoto.master_id == master.id)
                .order_by(PortfolioPhoto.id.desc())
            )
        )
        .scalars()
        .all()
    )
    return [PortfolioPhotoRead.model_validate(p) for p in rows]


@router.delete(
    "/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_photo(photo_id: int, master: CurrentMaster, session: SessionDep) -> None:
    p = (
        await session.execute(
            select(PortfolioPhoto).where(
                PortfolioPhoto.id == photo_id, PortfolioPhoto.master_id == master.id
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="photo not found")
    await session.delete(p)
    await session.commit()
