from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScheduleEntry(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0=понедельник, 6=воскресенье")
    start_time: time
    end_time: time
    is_working: bool = True

    @model_validator(mode="after")
    def _validate_window(self) -> "ScheduleEntry":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        return self


class ScheduleEntryRead(ScheduleEntry):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ScheduleBreakEntry(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def _validate_window(self) -> "ScheduleBreakEntry":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        return self


class ScheduleBreakRead(ScheduleBreakEntry):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TimeOffEntry(BaseModel):
    date_from: date
    date_to: date
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _validate_range(self) -> "TimeOffEntry":
        if self.date_from > self.date_to:
            raise ValueError("date_from cannot be after date_to")
        return self


class TimeOffRead(TimeOffEntry):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ScheduleBundle(BaseModel):
    schedules: list[ScheduleEntryRead]
    breaks: list[ScheduleBreakRead]
    time_offs: list[TimeOffRead]
