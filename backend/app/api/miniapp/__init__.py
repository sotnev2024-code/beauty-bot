from fastapi import APIRouter

from app.api.miniapp import (
    analytics,
    billing,
    bookings,
    bot,
    bot_reminders,
    categories,
    clients,
    conversations,
    funnels,
    insights,
    knowledge,
    me,
    portfolio,
    return_campaigns,
    return_settings,
    schedule,
    services,
    slots,
    test_dialog,
)

router = APIRouter()
router.include_router(me.router)
router.include_router(services.router)
router.include_router(categories.router)
router.include_router(schedule.router)
router.include_router(slots.router)
# Funnels API still mounted (data left in DB) — frontend stops using it after
# Step 9, then we drop the routes + tables.
router.include_router(funnels.router)
router.include_router(bookings.router)
router.include_router(clients.router)
router.include_router(conversations.router)
router.include_router(analytics.router)
router.include_router(portfolio.router)
router.include_router(billing.router)
router.include_router(insights.router)
router.include_router(test_dialog.router)
router.include_router(bot.router)
router.include_router(knowledge.router)
router.include_router(return_settings.router)
router.include_router(bot_reminders.router)
router.include_router(return_campaigns.router)
