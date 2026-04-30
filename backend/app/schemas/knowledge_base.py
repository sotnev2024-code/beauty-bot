from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

KBType = Literal[
    "address",
    "payment",
    "techniques",
    "sterilization",
    "preparation",
    "whats_with",
    "guarantees",
    "restrictions",
    "custom",
]


class KnowledgeItemCreate(BaseModel):
    type: KBType
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1)
    geolocation_lat: float | None = Field(default=None, ge=-90, le=90)
    geolocation_lng: float | None = Field(default=None, ge=-180, le=180)
    yandex_maps_url: str | None = None
    is_short: bool = False
    position: int = 0


class KnowledgeItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    content: str | None = Field(default=None, min_length=1)
    geolocation_lat: float | None = Field(default=None, ge=-90, le=90)
    geolocation_lng: float | None = Field(default=None, ge=-180, le=180)
    yandex_maps_url: str | None = None
    is_short: bool | None = None
    position: int | None = None


class KnowledgeItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    master_id: int
    type: str
    title: str
    content: str
    geolocation_lat: float | None
    geolocation_lng: float | None
    yandex_maps_url: str | None
    is_short: bool
    position: int
    created_at: datetime
    updated_at: datetime
