from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentMaster, SessionDep
from app.core.config import settings
from app.models import Service
from app.schemas import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceRead])
async def list_services(master: CurrentMaster, session: SessionDep) -> list[ServiceRead]:
    result = await session.execute(
        select(Service).where(Service.master_id == master.id).order_by(Service.id)
    )
    return [ServiceRead.model_validate(s) for s in result.scalars()]


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: ServiceCreate, master: CurrentMaster, session: SessionDep
) -> ServiceRead:
    count = await session.scalar(
        select(func.count()).select_from(Service).where(Service.master_id == master.id)
    )
    if (count or 0) >= settings.MAX_SERVICES_PER_MASTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"max {settings.MAX_SERVICES_PER_MASTER} services per master",
        )
    svc = Service(master_id=master.id, **payload.model_dump())
    session.add(svc)
    await session.commit()
    await session.refresh(svc)
    return ServiceRead.model_validate(svc)


@router.patch("/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: int,
    payload: ServiceUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> ServiceRead:
    svc = await _get_owned(session, master.id, service_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(svc, field, value)
    await session.commit()
    await session.refresh(svc)
    return ServiceRead.model_validate(svc)


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_service(service_id: int, master: CurrentMaster, session: SessionDep) -> None:
    svc = await _get_owned(session, master.id, service_id)
    await session.delete(svc)
    await session.commit()


async def _get_owned(session, master_id: int, service_id: int) -> Service:
    result = await session.execute(
        select(Service).where(Service.id == service_id, Service.master_id == master_id)
    )
    svc = result.scalar_one_or_none()
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service not found")
    return svc
