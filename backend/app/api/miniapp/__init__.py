from fastapi import APIRouter

from app.api.miniapp import (
    analytics,
    billing,
    bookings,
    clients,
    conversations,
    funnels,
    me,
    portfolio,
    schedule,
    services,
    slots,
)

router = APIRouter()
router.include_router(me.router)
router.include_router(services.router)
router.include_router(schedule.router)
router.include_router(slots.router)
router.include_router(funnels.router)
router.include_router(bookings.router)
router.include_router(clients.router)
router.include_router(conversations.router)
router.include_router(analytics.router)
router.include_router(portfolio.router)
router.include_router(billing.router)
