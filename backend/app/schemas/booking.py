from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BookingStatus


class BookingCreate(BaseModel):
    service_id: int = Field(gt=0)
    client_telegram_id: int
    client_name: str | None = None
    client_phone: str | None = None
    starts_at: datetime
    source: str | None = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    service_id: int | None
    client_id: int
    starts_at: datetime
    ends_at: datetime
    status: BookingStatus
    price: Decimal | None
    source: str | None
    notes: str | None
