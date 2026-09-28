import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import EmailIntakeOutcome
from app.utils.datetime import new_uuid, utcnow


class EmailIntakeLog(Base):
    """One row per email the intake poller has looked at -- the audit trail
    behind the "unclassified bucket" and "manual review queue" concepts from
    the email complaint flow doc. `message_id` is unique so re-processing the
    same email is a no-op (dedup), independent of whether it's ever marked
    read on the mail server (belt-and-suspenders)."""

    __tablename__ = "email_intake_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    message_id: Mapped[str] = mapped_column(String(998), unique=True, index=True, nullable=False)
    from_address: Mapped[str] = mapped_column(String(320), nullable=False)
    subject: Mapped[str] = mapped_column(String(998), nullable=False)
    outcome: Mapped[EmailIntakeOutcome] = mapped_column(
        Enum(EmailIntakeOutcome, name="email_intake_outcome"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    complaint_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("complaints.id"), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
