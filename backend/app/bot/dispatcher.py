"""aiogram 3 Bot + Dispatcher singletons.

The Bot is created lazily so tests / alembic / CLI tooling that don't need
Telegram I/O won't crash on missing TELEGRAM_BOT_TOKEN.
"""

from __future__ import annotations

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode

from app.core.config import settings

_bot: Bot | None = None
_dp: Dispatcher | None = None


def get_bot() -> Bot:
    global _bot
    if _bot is None:
        if not settings.TELEGRAM_BOT_TOKEN:
            raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
        session = AiohttpSession(proxy=settings.HTTP_PROXY_URL) if settings.HTTP_PROXY_URL else None
        kwargs: dict = {
            "token": settings.TELEGRAM_BOT_TOKEN,
            "default": DefaultBotProperties(parse_mode=ParseMode.HTML),
        }
        if session is not None:
            kwargs["session"] = session
        _bot = Bot(**kwargs)
    return _bot


def get_dispatcher() -> Dispatcher:
    global _dp
    if _dp is None:
        from app.bot.handlers import business, master_commands

        _dp = Dispatcher()
        _dp.include_router(master_commands.router)
        _dp.include_router(business.router)
    return _dp


# Convenience module-level lazy proxies for code that imports `bot` / `dp` directly.
class _LazyBot:
    def __getattr__(self, name: str) -> object:
        return getattr(get_bot(), name)


class _LazyDp:
    def __getattr__(self, name: str) -> object:
        return getattr(get_dispatcher(), name)


bot: Bot = _LazyBot()  # type: ignore[assignment]
dp: Dispatcher = _LazyDp()  # type: ignore[assignment]
