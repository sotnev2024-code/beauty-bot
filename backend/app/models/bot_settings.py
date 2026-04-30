from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class BotSettings(Base):
    __tablename__ = "bot_settings"

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), primary_key=True
    )
    greeting: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Здравствуйте! Подскажите, чем могу помочь?",
    )
    voice_tone: Mapped[str] = mapped_column(String(20), nullable=False, default="warm")
    message_format: Mapped[str] = mapped_column(String(20), nullable=False, default="hybrid")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    configured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
