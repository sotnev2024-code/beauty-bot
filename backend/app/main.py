import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.miniapp import router as miniapp_router
from app.api.telegram import router as telegram_router
from app.core.config import settings

# Honour LOG_LEVEL from .env so INFO-level lifecycle and worker messages
# actually surface in `docker logs` instead of being filtered out by
# Python's default WARNING threshold.
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

ALLOWED_UPDATES = [
    "message",
    "callback_query",
    "business_connection",
    "business_message",
    "edited_business_message",
    "deleted_business_messages",
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from app.workers.scheduler import shutdown_scheduler, start_scheduler

    if settings.ENVIRONMENT != "test":
        start_scheduler()

    polling_task: asyncio.Task | None = None
    webhook_ready = (
        settings.ENVIRONMENT != "test"
        and settings.TELEGRAM_BOT_TOKEN
        and settings.TELEGRAM_WEBHOOK_URL
    )
    polling_ready = (
        settings.ENVIRONMENT != "test"
        and settings.TELEGRAM_BOT_TOKEN
        and not settings.TELEGRAM_WEBHOOK_URL
    )

    if webhook_ready:
        from aiogram.types import BotCommand

        from app.bot import get_bot

        bot = get_bot()
        try:
            await bot.set_webhook(
                url=settings.TELEGRAM_WEBHOOK_URL,
                secret_token=settings.TELEGRAM_WEBHOOK_SECRET or None,
                drop_pending_updates=True,
                allowed_updates=ALLOWED_UPDATES,
            )
            await bot.set_my_commands(
                [
                    BotCommand(command="start", description="Открыть Beauty.dev"),
                    BotCommand(command="help", description="Помощь"),
                ]
            )
            log.info("webhook configured: %s", settings.TELEGRAM_WEBHOOK_URL)
        except Exception:
            log.exception("failed to set webhook on startup")
    elif polling_ready:
        # Local-dev fallback: no public URL, so we long-poll instead. Useful
        # for testing on your laptop without a tunnel — just leave
        # TELEGRAM_WEBHOOK_URL empty in .env.
        from app.bot import get_bot
        from app.bot.dispatcher import get_dispatcher

        bot = get_bot()
        dp = get_dispatcher()
        try:
            # If a webhook is still set on Telegram's side (e.g. from a prior
            # deploy), polling will silently receive nothing. Clear it first.
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception:
            log.exception("delete_webhook before polling failed (continuing)")
        polling_task = asyncio.create_task(
            dp.start_polling(bot, allowed_updates=ALLOWED_UPDATES)
        )
        log.info("long-polling started (TELEGRAM_WEBHOOK_URL empty)")

    yield

    if polling_task is not None:
        polling_task.cancel()
        try:
            await polling_task
        except (asyncio.CancelledError, Exception):
            pass
    if settings.ENVIRONMENT != "test":
        shutdown_scheduler()


app = FastAPI(
    title="Beauty.dev API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENVIRONMENT}


app.include_router(miniapp_router, prefix="/api")
app.include_router(telegram_router, prefix="/api/telegram")
