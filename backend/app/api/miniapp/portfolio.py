"""Portfolio: list / upload (multipart) / delete."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import PortfolioPhoto
from app.services.portfolio import PortfolioError, save_photo
from app.services.portfolio import delete_photo as svc_delete_photo

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


@router.post("", response_model=PortfolioPhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    master: CurrentMaster,
    session: SessionDep,
    file: UploadFile = File(...),
) -> PortfolioPhotoRead:
    raw = await file.read()
    try:
        row = await save_photo(session, master=master, raw=raw, original_filename=file.filename)
    except PortfolioError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    await session.commit()
    return PortfolioPhotoRead.model_validate(row)


@router.delete(
    "/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_photo(photo_id: int, master: CurrentMaster, session: SessionDep) -> None:
    ok = await svc_delete_photo(session, master_id=master.id, photo_id=photo_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="photo not found")
    await session.commit()
