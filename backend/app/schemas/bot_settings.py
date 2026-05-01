from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

VoiceTone = Literal["warm", "neutral", "casual"]
MessageFormat = Literal["text", "buttons", "hybrid"]


class BotSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    master_id: int
    greeting: str
    voice_tone: VoiceTone
    message_format: MessageFormat
    is_enabled: bool
    reminders_enabled: bool
    master_digest_enabled: bool
    master_digest_hour: int
    master_pre_visit_enabled: bool
    master_pre_visit_offsets: list[int]
    configured_at: datetime | None
    updated_at: datetime


class BotSettingsUpdate(BaseModel):
    greeting: str | None = Field(default=None, min_length=1, max_length=2000)
    voice_tone: VoiceTone | None = None
    message_format: MessageFormat | None = None
    is_enabled: bool | None = None
    master_digest_enabled: bool | None = None
    master_digest_hour: int | None = Field(default=None, ge=0, le=23)
    master_pre_visit_enabled: bool | None = None
    master_pre_visit_offsets: list[int] | None = None
