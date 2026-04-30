from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    position: int = 0


class ServiceCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    position: int | None = None


class ServiceCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    master_id: int
    name: str
    position: int
    created_at: datetime


class CategoryReorderRequest(BaseModel):
    """Pass the new ordered list of category ids; we set position by index."""

    ordered_ids: list[int] = Field(min_length=1)
