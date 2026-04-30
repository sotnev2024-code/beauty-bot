from fastapi import APIRouter

from app.api.deps import CurrentMaster, SessionDep
from app.schemas import MasterRead, MasterUpdate

router = APIRouter(tags=["miniapp"])


@router.get("/me", response_model=MasterRead)
async def get_me(master: CurrentMaster) -> MasterRead:
    return MasterRead.model_validate(master)


@router.patch("/me", response_model=MasterRead)
async def update_me(
    payload: MasterUpdate, master: CurrentMaster, session: SessionDep
) -> MasterRead:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(master, field, value)
    await session.commit()
    await session.refresh(master)
    return MasterRead.model_validate(master)
