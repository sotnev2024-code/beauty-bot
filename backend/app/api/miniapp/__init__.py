from fastapi import APIRouter

from app.api.miniapp import bookings, funnels, me, schedule, services, slots

router = APIRouter()
router.include_router(me.router)
router.include_router(services.router)
router.include_router(schedule.router)
router.include_router(slots.router)
router.include_router(funnels.router)
router.include_router(bookings.router)
