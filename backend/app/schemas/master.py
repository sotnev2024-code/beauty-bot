from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import Plan


class MasterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    telegram_username: str | None
    name: str | None
    niche: str | None
    timezone: str
    plan: Plan
    trial_ends_at: datetime | None
    subscription_active_until: datetime | None
    created_at: datetime
