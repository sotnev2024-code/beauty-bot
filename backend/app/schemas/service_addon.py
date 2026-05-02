from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServiceAddonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    duration_delta: int = Field(default=0, ge=-240, le=600)
    price_delta: Decimal = Field(default=Decimal("0"))
    is_default: bool = False
    position: int = 0


class ServiceAddonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    duration_delta: int | None = Field(default=None, ge=-240, le=600)
    price_delta: Decimal | None = None
    is_default: bool | None = None
    position: int | None = None


class ServiceAddonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    name: str
    duration_delta: int
    price_delta: Decimal
    is_default: bool
    position: int
