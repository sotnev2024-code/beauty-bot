from fastapi import APIRouter

from app.api.deps import CurrentMaster
from app.schemas import MasterRead

router = APIRouter(tags=["miniapp"])


@router.get("/me", response_model=MasterRead)
async def get_me(master: CurrentMaster) -> MasterRead:
    return MasterRead.model_validate(master)
