from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    duration_minutes: int = Field(ge=5, le=600)
    price: Decimal = Field(ge=0)
    description: str | None = None
    group: str | None = Field(default=None, max_length=64)
    category_id: int | None = None
    reminder_after_days: int | None = Field(default=None, ge=1, le=365)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    duration_minutes: int | None = Field(default=None, ge=5, le=600)
    price: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    group: str | None = Field(default=None, max_length=64)
    category_id: int | None = None
    reminder_after_days: int | None = Field(default=None, ge=1, le=365)
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    duration_minutes: int
    price: Decimal
    description: str | None
    group: str | None
    category_id: int | None
    reminder_after_days: int | None
    is_active: bool
    addons: list["ServiceAddonRead"] = []


from app.schemas.service_addon import ServiceAddonRead  # noqa: E402

ServiceRead.model_rebuild()
