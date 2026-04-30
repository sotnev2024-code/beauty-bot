from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import BookingStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.master import Master


class Booking(IdMixin, TimestampMixin, Base):
    __tablename__ = "bookings"

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        String(16), default=BookingStatus.SCHEDULED, nullable=False
    )
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_applied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    discount_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    return_campaign_id: Mapped[int | None] = mapped_column(
        ForeignKey("return_campaigns.id", ondelete="SET NULL", use_alter=True),
        nullable=True,
    )

    master: Mapped["Master"] = relationship(back_populates="bookings")
    client: Mapped["Client"] = relationship(back_populates="bookings")
