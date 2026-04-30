from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import ConversationState, MessageDirection


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    direction: MessageDirection
    text: str | None
    llm_meta: dict[str, Any] | None
    created_at: datetime


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    client_name: str | None
    state: ConversationState
    takeover_until: datetime | None
    last_message_at: datetime | None
    last_message_preview: str | None


class ConversationDetail(BaseModel):
    id: int
    client_id: int
    client_name: str | None
    state: ConversationState
    takeover_until: datetime | None
    last_message_at: datetime | None
    messages: list[MessageRead]


class TakeoverRequest(BaseModel):
    hours: int | None = None  # default = settings.HUMAN_TAKEOVER_HOURS
