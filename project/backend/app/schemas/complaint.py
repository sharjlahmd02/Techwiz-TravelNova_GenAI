import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintChannel, ComplaintStatus, Priority, Urgency


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=50, max_length=5000)
    product_type: str = Field(min_length=1, max_length=50)
    booking_reference: str | None = Field(default=None, max_length=20)
    customer_selected_category: str | None = Field(default=None, max_length=255)
    channel: ComplaintChannel = ComplaintChannel.WEB_FORM
    source_payload: dict | None = Field(
        default=None,
        description=(
            "Raw source material for non-web-form channels -- the chat transcript, the "
            "composed email fields, or the uploaded document's filename/extracted text. "
            "Stored verbatim on the complaint for traceability (spec.md 3.1.2-3.1.4)."
        ),
    )


class ComplaintFieldsDraft(BaseModel):
    """What extract_complaint_fields() returns -- shown to the customer for
    review/edit before they actually submit via POST /api/complaints/."""

    title: str
    description: str
    product_type: str
    booking_reference: str | None = None


class ChatExtractRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=10_000)


class EmailExtractRequest(BaseModel):
    from_email: str = Field(min_length=3, max_length=255)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=10_000)


class DocumentExtractResponse(ComplaintFieldsDraft):
    filename: str
    extracted_text_preview: str


class ComplaintCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: str
    status: ComplaintStatus
    created_at: datetime


class ComplaintSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: str
    title: str
    product_type: str
    status: ComplaintStatus
    priority: Priority | None
    created_at: datetime


class ComplaintDetail(BaseModel):
    """Customer-facing detail -- deliberately excludes pipeline internals,
    department assignment, conflict data, and agent notes (spec.md 2.1)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: str
    title: str
    description: str
    product_type: str
    booking_reference: str | None
    status: ComplaintStatus
    priority: Priority | None
    urgency: Urgency | None
    sla_response_deadline: datetime | None
    sla_resolution_deadline: datetime | None
    satisfaction_rating: int | None
    created_at: datetime
    closed_at: datetime | None


class ComplaintTimelineEntry(BaseModel):
    action: str
    notes: str | None
    created_at: datetime


class ComplaintStatusResponse(BaseModel):
    complaint_id: str
    status: ComplaintStatus
    timeline: list[ComplaintTimelineEntry]


class PaginatedComplaints(BaseModel):
    items: list[ComplaintSummary]
    total: int
    page: int
    page_size: int
    has_next: bool


class SatisfactionRatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
