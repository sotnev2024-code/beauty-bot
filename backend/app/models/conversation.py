from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import ConversationState, MessageDirection

if TYPE_CHECKING:
    from app.models.client import Client


class Conversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "conversations"

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    current_funnel_id: Mapped[int | None] = mapped_column(
        ForeignKey("funnels.id", ondelete="SET NULL"), nullable=True
    )
    current_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("funnel_steps.id", ondelete="SET NULL"), nullable=True
    )
    state: Mapped[ConversationState] = mapped_column(
        String(16), default=ConversationState.BOT, nullable=False
    )
    takeover_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    client: Mapped["Client"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(IdMixin, TimestampMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    direction: Mapped[MessageDirection] = mapped_column(String(8), nullable=False)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_meta: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
