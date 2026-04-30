from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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
    bot_enabled: bool
    voice: str | None
    greeting: str | None
    rules: str | None
    address: str | None
    created_at: datetime


class MasterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    niche: str | None = Field(default=None, max_length=64)
    timezone: str | None = Field(default=None, max_length=64)
    voice: str | None = Field(default=None, max_length=32)
    greeting: str | None = None
    rules: str | None = None
    address: str | None = Field(default=None, max_length=255)
    bot_enabled: bool | None = None


class OnboardingStatus(BaseModel):
    """What's required before the master can land on /app."""

    profile_done: bool
    address_done: bool
    schedule_done: bool
    services_done: bool
    voice_done: bool
    # Legacy gate — always True post-Step 1 since we no longer gate on funnels.
    # Kept in the schema so the deployed frontend's STEP_ROUTES still parses;
    # removed in Step 10.
    funnel_done: bool
    business_connected: bool
    complete: bool
