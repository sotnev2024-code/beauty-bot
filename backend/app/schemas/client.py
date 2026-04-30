from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    telegram_id: int
    name: str | None
    phone: str | None
    first_seen_at: datetime | None
    last_seen_at: datetime | None
    source: str | None
    notes: str | None


class ClientStats(BaseModel):
    visits_total: int
    visits_done: int
    avg_check: Decimal | None
    last_visit_at: datetime | None
    tags: list[str]
    segments: list[str]


class ClientDetail(ClientRead):
    stats: ClientStats


class ClientListItem(ClientRead):
    visits_total: int
    last_visit_at: datetime | None
    segments: list[str]


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class TagPayload(BaseModel):
    tag: str = Field(min_length=1, max_length=64)
