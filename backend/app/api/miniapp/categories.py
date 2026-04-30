"""Service categories CRUD."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import Service, ServiceCategory
from app.schemas import (
    CategoryReorderRequest,
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[ServiceCategoryRead])
async def list_categories(
    master: CurrentMaster, session: SessionDep
) -> list[ServiceCategoryRead]:
    rows = (
        (
            await session.execute(
                select(ServiceCategory)
                .where(ServiceCategory.master_id == master.id)
                .order_by(ServiceCategory.position, ServiceCategory.id)
            )
        )
        .scalars()
        .all()
    )
    return [ServiceCategoryRead.model_validate(r) for r in rows]


@router.post("", response_model=ServiceCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: ServiceCategoryCreate, master: CurrentMaster, session: SessionDep
) -> ServiceCategoryRead:
    cat = ServiceCategory(
        master_id=master.id,
        name=payload.name.strip(),
        position=payload.position,
    )
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return ServiceCategoryRead.model_validate(cat)


@router.patch("/{category_id}", response_model=ServiceCategoryRead)
async def update_category(
    category_id: int,
    payload: ServiceCategoryUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> ServiceCategoryRead:
    cat = await session.get(ServiceCategory, category_id)
    if cat is None or cat.master_id != master.id:
        raise HTTPException(status_code=404, detail="category not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v.strip() if isinstance(v, str) else v)
    await session.commit()
    await session.refresh(cat)
    return ServiceCategoryRead.model_validate(cat)


@router.delete(
    "/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_category(
    category_id: int, master: CurrentMaster, session: SessionDep
) -> None:
    cat = await session.get(ServiceCategory, category_id)
    if cat is None or cat.master_id != master.id:
        raise HTTPException(status_code=404, detail="category not found")
    # Detach services that point at this category (FK is ON DELETE SET NULL,
    # but we run an explicit nullify so the detach is visible immediately
    # without relying on cascade timing).
    await session.execute(
        select(Service).where(Service.master_id == master.id, Service.category_id == cat.id)
    )
    for svc in (
        (
            await session.execute(
                select(Service).where(
                    Service.master_id == master.id, Service.category_id == cat.id
                )
            )
        )
        .scalars()
        .all()
    ):
        svc.category_id = None
    await session.delete(cat)
    await session.commit()


@router.post("/reorder", response_model=list[ServiceCategoryRead])
async def reorder_categories(
    payload: CategoryReorderRequest, master: CurrentMaster, session: SessionDep
) -> list[ServiceCategoryRead]:
    rows = (
        (
            await session.execute(
                select(ServiceCategory).where(ServiceCategory.master_id == master.id)
            )
        )
        .scalars()
        .all()
    )
    by_id = {r.id: r for r in rows}
    for idx, cid in enumerate(payload.ordered_ids):
        cat = by_id.get(cid)
        if cat is not None:
            cat.position = idx
    await session.commit()
    rows = sorted(rows, key=lambda r: (r.position, r.id))
    return [ServiceCategoryRead.model_validate(r) for r in rows]
