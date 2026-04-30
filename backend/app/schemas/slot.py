from datetime import datetime

from pydantic import BaseModel


class SlotRead(BaseModel):
    starts_at: datetime
    ends_at: datetime


class SlotsResponse(BaseModel):
    service_id: int
    duration_minutes: int
    slots: list[SlotRead]
    next_available_day: str | None = None  # ISO date if same-day exhausted


class SlotLockRequest(BaseModel):
    service_id: int
    starts_at: datetime


class SlotLockResponse(BaseModel):
    locked: bool
    starts_at: datetime
    ends_at: datetime
    expires_in_seconds: int | None = None
    alternative: SlotRead | None = None
