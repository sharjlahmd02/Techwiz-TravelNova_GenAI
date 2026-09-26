import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MessageSender


class CustomerMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class CustomerMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender: MessageSender
    message: str
    created_at: datetime
