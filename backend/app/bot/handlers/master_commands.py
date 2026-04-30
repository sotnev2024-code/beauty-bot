"""Direct (non-Business) commands the master sends to @beauty_dev_bot."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from app.core.config import settings

router = Router(name="master_commands")


@router.message(Command("start"), F.chat.type == "private")
async def cmd_start(message: Message) -> None:
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть Beauty.dev",
                    web_app=WebAppInfo(url=settings.MINI_APP_URL),
                )
            ]
        ]
    )
    await message.answer(
        "Привет! Я <b>Beauty.dev</b> — ассистент для бьюти-мастеров.\n\n"
        "Открой мини-приложение, чтобы подключить меня к своему Telegram Business "
        "и настроить воронки.",
        reply_markup=kb,
    )


@router.message(Command("help"), F.chat.type == "private")
async def cmd_help(message: Message) -> None:
    await message.answer(
        "Управление ботом — в мини-приложении. Команды:\n"
        "/start — открыть мини-приложение\n"
        "/help — это сообщение"
    )
