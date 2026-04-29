from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Segment

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.conversation import Conversation
    from app.models.master import Master


class Client(IdMixin, TimestampMixin, Base):
    __tablename__ = "clients"
    __table_args__ = (UniqueConstraint("master_id", "telegram_id", name="uq_clients_master_tg"),)

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    telegram_id: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)

    master: Mapped["Master"] = relationship(back_populates="clients")
    tags: Mapped[list["ClientTag"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    segments: Mapped[list["ClientSegment"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


class ClientTag(IdMixin, Base):
    __tablename__ = "client_tags"

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tag: Mapped[str] = mapped_column(String(64), nullable=False)

    client: Mapped["Client"] = relationship(back_populates="tags")


class ClientSegment(IdMixin, Base):
    __tablename__ = "client_segments"
    __table_args__ = (UniqueConstraint("client_id", "segment", name="uq_client_segments"),)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    segment: Mapped[Segment] = mapped_column(String(16), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    client: Mapped["Client"] = relationship(back_populates="segments")
