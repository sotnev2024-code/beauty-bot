from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import FunnelType

if TYPE_CHECKING:
    from app.models.master import Master


class Funnel(IdMixin, TimestampMixin, Base):
    __tablename__ = "funnels"

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[FunnelType] = mapped_column(String(16), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    preset_key: Mapped[str | None] = mapped_column(String(64), nullable=True)

    master: Mapped["Master"] = relationship(back_populates="funnels")
    steps: Mapped[list["FunnelStep"]] = relationship(
        back_populates="funnel",
        cascade="all, delete-orphan",
        order_by="FunnelStep.position",
    )


class FunnelStep(IdMixin, Base):
    __tablename__ = "funnel_steps"

    funnel_id: Mapped[int] = mapped_column(
        ForeignKey("funnels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    transition_conditions: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    collected_fields: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    funnel: Mapped["Funnel"] = relationship(back_populates="steps")
