from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import ReminderType


class Reminder(IdMixin, TimestampMixin, Base):
    __tablename__ = "reminders"

    type: Mapped[ReminderType] = mapped_column(String(32), nullable=False)
    target_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True
    )
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=True
    )
