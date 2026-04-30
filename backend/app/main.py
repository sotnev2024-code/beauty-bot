import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.miniapp import router as miniapp_router
from app.api.telegram import router as telegram_router
from app.core.config import settings

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    webhook_ready = (
        settings.ENVIRONMENT != "test"
        and settings.TELEGRAM_BOT_TOKEN
        and settings.TELEGRAM_WEBHOOK_URL
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
                allowed_updates=[
                    "message",
                    "business_connection",
                    "business_message",
                    "edited_business_message",
                    "deleted_business_messages",
                ],
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
    yield
    # Don't deleteWebhook on shutdown — production replicas restart frequently
    # and we don't want updates to fall on the floor.


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
