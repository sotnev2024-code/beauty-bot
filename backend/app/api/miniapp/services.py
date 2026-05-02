from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentMaster, SessionDep
from app.core.config import settings
from app.models import Service, ServiceAddon, ServiceCategory
from app.schemas import (
    ServiceAddonCreate,
    ServiceAddonRead,
    ServiceAddonUpdate,
    ServiceCreate,
    ServiceRead,
    ServiceUpdate,
)

router = APIRouter(prefix="/services", tags=["services"])


def _serialize(svc: Service) -> ServiceRead:
    """Service + sorted addons."""
    addons = sorted(
        (svc.__dict__.get("addons") or []),
        key=lambda a: (a.position, a.id),
    )
    return ServiceRead.model_validate(
        {
            "id": svc.id,
            "name": svc.name,
            "duration_minutes": svc.duration_minutes,
            "price": svc.price,
            "description": svc.description,
            "group": svc.group,
            "category_id": svc.category_id,
            "reminder_after_days": svc.reminder_after_days,
            "is_active": svc.is_active,
            "addons": [ServiceAddonRead.model_validate(a) for a in addons],
        }
    )


async def _load_service_with_addons(
    session: SessionDep, master_id: int, service_id: int
) -> Service:
    svc = (
        await session.execute(
            select(Service)
            .where(Service.id == service_id, Service.master_id == master_id)
            .options(selectinload(Service.addons))
        )
    ).scalar_one_or_none()
    if svc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="service not found"
        )
    return svc


@router.get("", response_model=list[ServiceRead])
async def list_services(master: CurrentMaster, session: SessionDep) -> list[ServiceRead]:
    result = await session.execute(
        select(Service)
        .where(Service.master_id == master.id)
        .order_by(Service.id)
        .options(selectinload(Service.addons))
    )
    return [_serialize(s) for s in result.scalars()]


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
    if payload.category_id is not None:
        await _verify_category(session, master.id, payload.category_id)
    svc = Service(master_id=master.id, **payload.model_dump())
    session.add(svc)
    await session.commit()
    svc = await _load_service_with_addons(session, master.id, svc.id)
    return _serialize(svc)


@router.patch("/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: int,
    payload: ServiceUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> ServiceRead:
    svc = await _get_owned(session, master.id, service_id)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and data["category_id"] is not None:
        await _verify_category(session, master.id, data["category_id"])
    for field, value in data.items():
        setattr(svc, field, value)
    await session.commit()
    svc = await _load_service_with_addons(session, master.id, svc.id)
    return _serialize(svc)


async def _verify_category(session, master_id: int, category_id: int) -> None:
    cat = await session.get(ServiceCategory, category_id)
    if cat is None or cat.master_id != master_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid category_id"
        )


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_service(service_id: int, master: CurrentMaster, session: SessionDep) -> None:
    svc = await _get_owned(session, master.id, service_id)
    await session.delete(svc)
    await session.commit()


# ---------------------------------------------------------------- addons

@router.post(
    "/{service_id}/addons",
    response_model=ServiceAddonRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_addon(
    service_id: int,
    payload: ServiceAddonCreate,
    master: CurrentMaster,
    session: SessionDep,
) -> ServiceAddonRead:
    svc = await _get_owned(session, master.id, service_id)
    addon = ServiceAddon(service_id=svc.id, **payload.model_dump())
    session.add(addon)
    await session.commit()
    await session.refresh(addon)
    return ServiceAddonRead.model_validate(addon)


@router.patch(
    "/{service_id}/addons/{addon_id}",
    response_model=ServiceAddonRead,
)
async def update_addon(
    service_id: int,
    addon_id: int,
    payload: ServiceAddonUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> ServiceAddonRead:
    addon = await _get_owned_addon(session, master.id, service_id, addon_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(addon, k, v)
    await session.commit()
    await session.refresh(addon)
    return ServiceAddonRead.model_validate(addon)


@router.delete(
    "/{service_id}/addons/{addon_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_addon(
    service_id: int,
    addon_id: int,
    master: CurrentMaster,
    session: SessionDep,
) -> None:
    addon = await _get_owned_addon(session, master.id, service_id, addon_id)
    await session.delete(addon)
    await session.commit()


async def _get_owned_addon(
    session, master_id: int, service_id: int, addon_id: int
) -> ServiceAddon:
    addon = await session.get(ServiceAddon, addon_id)
    if addon is None or addon.service_id != service_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="addon not found")
    # Confirm parent service belongs to this master.
    svc = await session.get(Service, service_id)
    if svc is None or svc.master_id != master_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="addon not found")
    return addon


async def _get_owned(session, master_id: int, service_id: int) -> Service:
    result = await session.execute(
        select(Service).where(Service.id == service_id, Service.master_id == master_id)
    )
    svc = result.scalar_one_or_none()
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service not found")
    return svc
