from fastapi import APIRouter

from app.api.miniapp import me, schedule, services, slots

router = APIRouter()
router.include_router(me.router)
router.include_router(services.router)
router.include_router(schedule.router)
router.include_router(slots.router)
