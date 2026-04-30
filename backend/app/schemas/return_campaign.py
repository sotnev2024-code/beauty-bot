from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReturnCampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    master_id: int
    client_id: int
    sent_at: datetime
    discount_percent: int
    discount_valid_until: datetime
    status: str
    responded_at: datetime | None
    booking_id: int | None
    message_id: int | None
    created_at: datetime
