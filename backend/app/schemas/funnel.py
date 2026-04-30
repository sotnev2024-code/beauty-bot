from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FunnelType


class FunnelStepCreate(BaseModel):
    position: int = Field(ge=0)
    system_prompt: str
    goal: str | None = None
    transition_conditions: dict[str, Any] | None = None
    collected_fields: list[str] | None = None


class FunnelStepRead(FunnelStepCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class FunnelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    type: FunnelType = FunnelType.MAIN
    is_active: bool = False
    preset_key: str | None = None
    steps: list[FunnelStepCreate] = Field(default_factory=list)


class FunnelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    type: FunnelType | None = None
    is_active: bool | None = None
    steps: list[FunnelStepCreate] | None = None


class FunnelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: FunnelType
    is_active: bool
    preset_key: str | None
    steps: list[FunnelStepRead] = Field(default_factory=list)


class FunnelSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: FunnelType
    is_active: bool
    preset_key: str | None


class SeedPresetRequest(BaseModel):
    preset_key: str = Field(description="manicure|brows_lashes|return|cold")
    activate: bool = True
