import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import HistoryAction
from app.utils.datetime import new_uuid, utcnow


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id"), nullable=False, index=True)
    action: Mapped[HistoryAction] = mapped_column(Enum(HistoryAction, name="history_action"), nullable=False)
    performed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    complaint: Mapped["Complaint"] = relationship(back_populates="history")
