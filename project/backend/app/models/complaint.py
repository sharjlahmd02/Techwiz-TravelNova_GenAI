import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ComplaintChannel, ComplaintStatus, PreferredContactChannel, Priority, Urgency
from app.utils.datetime import new_uuid, utcnow


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    complaint_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[ComplaintChannel] = mapped_column(
        Enum(ComplaintChannel, name="complaint_channel"), nullable=False
    )
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    booking_reference: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    customer_selected_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Customer-declared link to an earlier complaint they consider related (SRS Step 9) --
    # distinct from `duplicate_of`, which is the system's own similarity-based detection.
    previous_complaint_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("complaints.id"), nullable=True
    )
    preferred_contact_channel: Mapped[PreferredContactChannel | None] = mapped_column(
        Enum(PreferredContactChannel, name="preferred_contact_channel"), nullable=True
    )

    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status"),
        default=ComplaintStatus.SUBMITTED,
        nullable=False,
        index=True,
    )
    priority: Mapped[Priority | None] = mapped_column(Enum(Priority, name="priority"), nullable=True, index=True)
    urgency: Mapped[Urgency | None] = mapped_column(Enum(Urgency, name="urgency"), nullable=True)

    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    subcategory_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("subcategories.id"), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )
    supporting_department_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True
    )
    assigned_agent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    escalation_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    escalation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("complaints.id"), nullable=True)
    is_prompt_injection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    has_conflict: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    conflict_resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    conflict_resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Set whenever this complaint is routed to a reviewer for a reason OTHER than (or in
    # addition to) a pipeline field mismatch -- e.g. "missing_policy_support",
    # "ambiguous_classification", "sensitive_complaint" (SRS Step 57). None if it was never
    # flagged, or if it only ever went to review for a plain pipeline_conflict.
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    sla_response_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_resolution_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_response_met: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    sla_resolution_met: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    satisfaction_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attachments: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    pipeline_results: Mapped[list["PipelineResult"]] = relationship(back_populates="complaint")
    comparison: Mapped["PipelineComparison | None"] = relationship(back_populates="complaint", uselist=False)
    history: Mapped[list["ComplaintHistory"]] = relationship(back_populates="complaint")
    messages: Mapped[list["CustomerMessage"]] = relationship(back_populates="complaint")
