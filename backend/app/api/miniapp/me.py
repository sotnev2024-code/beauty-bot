from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentMaster, SessionDep
from app.models import BotSettings, BusinessConnection, Schedule, Service
from app.schemas import MasterRead, MasterUpdate
from app.schemas.master import OnboardingStatus

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


@router.get("/me/onboarding-status", response_model=OnboardingStatus)
async def onboarding_status(master: CurrentMaster, session: SessionDep) -> OnboardingStatus:
    profile_done = bool(master.name and master.niche)
    address_done = bool(master.address)

    has_schedule = await session.scalar(
        select(func.count())
        .select_from(Schedule)
        .where(Schedule.master_id == master.id, Schedule.is_working.is_(True))
    )
    schedule_done = bool(has_schedule or 0)

    has_service = await session.scalar(
        select(func.count())
        .select_from(Service)
        .where(Service.master_id == master.id, Service.is_active.is_(True))
    )
    services_done = bool(has_service or 0)

    bs = await session.get(BotSettings, master.id)
    voice_done = bs is not None and bs.configured_at is not None

    has_biz = await session.scalar(
        select(func.count())
        .select_from(BusinessConnection)
        .where(
            BusinessConnection.master_id == master.id,
            BusinessConnection.is_enabled.is_(True),
        )
    )
    business_connected = bool(has_biz or 0)

    # `voice_done` is reported separately. We don't gate `complete` on it yet
    # because the deployed frontend has no `/onboarding/voice` route to redirect
    # to — that ships in Step 10.
    complete = (
        profile_done and address_done and schedule_done and services_done
    )
    return OnboardingStatus(
        profile_done=profile_done,
        address_done=address_done,
        schedule_done=schedule_done,
        services_done=services_done,
        voice_done=voice_done,
        # Always True: funnels are no longer required. Kept for legacy clients.
        funnel_done=True,
        business_connected=business_connected,
        complete=complete,
    )
