import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MessageSender
from app.utils.datetime import new_uuid, utcnow


class CustomerMessage(Base):
    __tablename__ = "customer_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id"), nullable=False, index=True)
    sender: Mapped[MessageSender] = mapped_column(Enum(MessageSender, name="message_sender"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint: Mapped["Complaint"] = relationship(back_populates="messages")
