from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReturnSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    master_id: int
    is_enabled: bool
    trigger_after_days: int
    discount_percent: int
    discount_valid_days: int
    configured_at: datetime | None
    updated_at: datetime


class ReturnSettingsUpdate(BaseModel):
    trigger_after_days: int | None = Field(default=None, ge=14, le=365)
    discount_percent: int | None = Field(default=None, ge=1, le=70)
    discount_valid_days: int | None = Field(default=None, ge=1, le=60)
