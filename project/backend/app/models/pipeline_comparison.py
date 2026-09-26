import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ConflictSeverity
from app.utils.datetime import new_uuid, utcnow


class PipelineComparison(Base):
    __tablename__ = "pipeline_comparisons"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("complaints.id"), unique=True, nullable=False, index=True
    )

    has_conflict: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    conflict_fields: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    conflict_severity: Mapped[ConflictSeverity] = mapped_column(
        Enum(ConflictSeverity, name="conflict_severity"), default=ConflictSeverity.NONE, nullable=False
    )
    genai_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ground_truth_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    final_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewer_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint: Mapped["Complaint"] = relationship(back_populates="comparison")
