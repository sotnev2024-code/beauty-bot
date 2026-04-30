"""Knowledge base CRUD — fixed-type cards plus custom items."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.models import KnowledgeBaseItem
from app.schemas import KnowledgeItemCreate, KnowledgeItemRead, KnowledgeItemUpdate

router = APIRouter(prefix="/bot/knowledge", tags=["bot"])


@router.get("", response_model=list[KnowledgeItemRead])
async def list_items(
    master: CurrentMaster, session: SessionDep
) -> list[KnowledgeItemRead]:
    rows = (
        (
            await session.execute(
                select(KnowledgeBaseItem)
                .where(KnowledgeBaseItem.master_id == master.id)
                .order_by(KnowledgeBaseItem.position, KnowledgeBaseItem.id)
            )
        )
        .scalars()
        .all()
    )
    return [KnowledgeItemRead.model_validate(r) for r in rows]


@router.post("", response_model=KnowledgeItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: KnowledgeItemCreate, master: CurrentMaster, session: SessionDep
) -> KnowledgeItemRead:
    item = KnowledgeBaseItem(
        master_id=master.id,
        type=payload.type,
        title=payload.title.strip(),
        content=payload.content.strip(),
        geolocation_lat=payload.geolocation_lat,
        geolocation_lng=payload.geolocation_lng,
        yandex_maps_url=(payload.yandex_maps_url or "").strip() or None,
        is_short=payload.is_short,
        position=payload.position,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return KnowledgeItemRead.model_validate(item)


@router.patch("/{item_id}", response_model=KnowledgeItemRead)
async def update_item(
    item_id: int,
    payload: KnowledgeItemUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> KnowledgeItemRead:
    item = await session.get(KnowledgeBaseItem, item_id)
    if item is None or item.master_id != master.id:
        raise HTTPException(status_code=404, detail="knowledge item not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip() or None if k in ("yandex_maps_url",) else v.strip()
        setattr(item, k, v)
    await session.commit()
    await session.refresh(item)
    return KnowledgeItemRead.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int, master: CurrentMaster, session: SessionDep
) -> None:
    item = await session.get(KnowledgeBaseItem, item_id)
    if item is None or item.master_id != master.id:
        raise HTTPException(status_code=404, detail="knowledge item not found")
    await session.delete(item)
    await session.commit()
