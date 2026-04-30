from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    duration_minutes: int = Field(ge=5, le=600)
    price: Decimal = Field(ge=0)
    description: str | None = None
    group: str | None = Field(default=None, max_length=64)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    duration_minutes: int | None = Field(default=None, ge=5, le=600)
    price: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    group: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    duration_minutes: int
    price: Decimal
    description: str | None
    group: str | None
    is_active: bool
