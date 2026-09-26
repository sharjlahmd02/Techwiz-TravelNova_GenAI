"""Shared staff-facing schemas -- these expose internal data (pipeline
outputs, department, conflict details) that customer-facing schemas in
complaint.py deliberately omit."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ComplaintChannel, ComplaintStatus, Priority, Urgency
from app.schemas.message import CustomerMessageResponse
from app.schemas.pipeline import PipelineComparisonSchema, PipelineResultSchema


class StaffComplaintSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: str
    title: str
    product_type: str
    status: ComplaintStatus
    priority: Priority | None
    urgency: Urgency | None
    department_id: uuid.UUID | None
    has_conflict: bool
    is_duplicate: bool
    sla_response_deadline: datetime | None
    sla_resolution_deadline: datetime | None
    created_at: datetime


class HistoryEntry(BaseModel):
    action: str
    performed_by: uuid.UUID | None
    old_value: dict | None
    new_value: dict | None
    notes: str | None
    created_at: datetime


class StaffComplaintDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: str
    title: str
    description: str
    channel: ComplaintChannel
    product_type: str
    booking_reference: str | None
    customer_selected_category: str | None
    status: ComplaintStatus
    priority: Priority | None
    urgency: Urgency | None
    escalation_level: int
    escalation_reason: str | None
    is_duplicate: bool
    duplicate_of: uuid.UUID | None
    is_prompt_injection: bool
    has_conflict: bool
    sla_response_deadline: datetime | None
    sla_resolution_deadline: datetime | None
    satisfaction_rating: int | None
    created_at: datetime
    closed_at: datetime | None

    customer_id: uuid.UUID
    department_id: uuid.UUID | None
    assigned_agent_id: uuid.UUID | None

    pipeline_results: list[PipelineResultSchema] = []
    comparison: PipelineComparisonSchema | None = None
    messages: list[CustomerMessageResponse] = []
    history: list[HistoryEntry] = []
