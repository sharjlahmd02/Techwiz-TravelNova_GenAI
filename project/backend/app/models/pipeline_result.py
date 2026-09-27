import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PipelineType, Priority, Urgency
from app.utils.datetime import new_uuid, utcnow


class PipelineResult(Base):
    __tablename__ = "pipeline_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id"), nullable=False, index=True)
    pipeline: Mapped[PipelineType] = mapped_column(Enum(PipelineType, name="pipeline_type"), nullable=False)

    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subcategory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_issue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    secondary_issue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    urgency: Mapped[Urgency | None] = mapped_column(Enum(Urgency, name="pr_urgency"), nullable=True)
    priority: Mapped[Priority | None] = mapped_column(Enum(Priority, name="pr_priority"), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    escalation_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    escalation_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    refund_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    compensation_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    matched_rule_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    matched_escalation_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    policy_references: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    required_actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    prohibited_actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    suggested_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_steps: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    entities_extracted: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    policy_version: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint: Mapped["Complaint"] = relationship(back_populates="pipeline_results")
