from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Plan

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.business_connection import BusinessConnection
    from app.models.client import Client
    from app.models.funnel import Funnel
    from app.models.service import Service


class Master(IdMixin, TimestampMixin, Base):
    __tablename__ = "masters"

    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    telegram_username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    niche: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Moscow", nullable=False)

    plan: Mapped[Plan] = mapped_column(String(16), default=Plan.TRIAL, nullable=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_active_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    business_connections: Mapped[list["BusinessConnection"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
    services: Mapped[list["Service"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
    funnels: Mapped[list["Funnel"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
    clients: Mapped[list["Client"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
