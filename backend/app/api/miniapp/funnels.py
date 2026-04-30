from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentMaster, SessionDep
from app.models import Funnel, FunnelStep
from app.schemas import (
    FunnelCreate,
    FunnelRead,
    FunnelStepRead,
    FunnelSummary,
    FunnelUpdate,
    SeedPresetRequest,
)
from app.services.funnel import (
    activate_funnel,
    seed_funnel_from_preset,
)
from app.services.funnel_presets import list_presets

router = APIRouter(prefix="/funnels", tags=["funnels"])


@router.get("/presets", response_model=list[dict])
async def list_funnel_presets() -> list[dict]:
    return [
        {"key": p.key, "name": p.name, "type": p.type.value, "steps_count": len(p.steps)}
        for p in list_presets()
    ]


@router.post("/seed-preset", response_model=FunnelRead, status_code=status.HTTP_201_CREATED)
async def seed_preset(
    payload: SeedPresetRequest, master: CurrentMaster, session: SessionDep
) -> FunnelRead:
    try:
        funnel = await seed_funnel_from_preset(
            session,
            master_id=master.id,
            preset_key=payload.preset_key,
            activate=payload.activate,
        )
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"unknown preset: {e}"
        ) from e
    await session.commit()
    return await _load_full(session, funnel.id)


@router.get("", response_model=list[FunnelSummary])
async def list_funnels(master: CurrentMaster, session: SessionDep) -> list[FunnelSummary]:
    result = await session.execute(
        select(Funnel).where(Funnel.master_id == master.id).order_by(Funnel.id)
    )
    return [FunnelSummary.model_validate(f) for f in result.scalars()]


@router.get("/{funnel_id}", response_model=FunnelRead)
async def get_funnel(funnel_id: int, master: CurrentMaster, session: SessionDep) -> FunnelRead:
    funnel = await _get_owned(session, master.id, funnel_id)
    return await _load_full(session, funnel.id)


@router.post("", response_model=FunnelRead, status_code=status.HTTP_201_CREATED)
async def create_funnel(
    payload: FunnelCreate, master: CurrentMaster, session: SessionDep
) -> FunnelRead:
    funnel = Funnel(
        master_id=master.id,
        name=payload.name,
        type=payload.type,
        is_active=False,
        preset_key=payload.preset_key,
    )
    session.add(funnel)
    await session.flush()
    for step in payload.steps:
        session.add(FunnelStep(funnel_id=funnel.id, **step.model_dump()))
    if payload.is_active:
        await activate_funnel(session, funnel)
    await session.commit()
    return await _load_full(session, funnel.id)


@router.patch("/{funnel_id}", response_model=FunnelRead)
async def update_funnel(
    funnel_id: int,
    payload: FunnelUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> FunnelRead:
    funnel = await _get_owned(session, master.id, funnel_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        funnel.name = data["name"]
    if "type" in data:
        funnel.type = data["type"]
    if "is_active" in data and data["is_active"] is True:
        await activate_funnel(session, funnel)
    elif data.get("is_active") is False:
        funnel.is_active = False

    if "steps" in data and data["steps"] is not None:
        existing = (
            await session.execute(select(FunnelStep).where(FunnelStep.funnel_id == funnel.id))
        ).scalars()
        for s in existing:
            await session.delete(s)
        for step in data["steps"]:
            session.add(FunnelStep(funnel_id=funnel.id, **step))

    await session.commit()
    return await _load_full(session, funnel.id)


@router.delete(
    "/{funnel_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_funnel(funnel_id: int, master: CurrentMaster, session: SessionDep) -> None:
    funnel = await _get_owned(session, master.id, funnel_id)
    await session.delete(funnel)
    await session.commit()


# ----------------------------------------------------------------- helpers


async def _get_owned(session: SessionDep, master_id: int, funnel_id: int) -> Funnel:
    result = await session.execute(
        select(Funnel).where(Funnel.id == funnel_id, Funnel.master_id == master_id)
    )
    funnel = result.scalar_one_or_none()
    if funnel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="funnel not found")
    return funnel


async def _load_full(session: SessionDep, funnel_id: int) -> FunnelRead:
    funnel = (
        await session.execute(
            select(Funnel).where(Funnel.id == funnel_id).options(selectinload(Funnel.steps))
        )
    ).scalar_one()
    return FunnelRead(
        id=funnel.id,
        name=funnel.name,
        type=funnel.type,
        is_active=funnel.is_active,
        preset_key=funnel.preset_key,
        steps=[FunnelStepRead.model_validate(s) for s in funnel.steps],
    )
