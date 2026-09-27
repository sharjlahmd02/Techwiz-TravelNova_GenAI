import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PipelineResultSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline: str
    category: str | None
    subcategory: str | None
    primary_issue: str | None
    secondary_issue: str | None
    sentiment: str | None
    sentiment_score: float | None
    urgency: str | None
    priority: str | None
    escalation_required: bool
    escalation_level: int
    refund_eligible: bool
    compensation_eligible: bool
    suggested_response: str | None
    confidence_score: float | None
    entities_extracted: dict | None
    policy_references: list | None
    processing_time_ms: int | None
    provider: str | None
    model_name: str | None
    prompt_version: str | None
    policy_version: str | None
    created_at: datetime


class PipelineComparisonSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    has_conflict: bool
    conflict_fields: list[str] | None
    conflict_severity: str
    genai_values: dict | None
    ground_truth_values: dict | None
    final_values: dict | None
    reviewer_rationale: str | None
    resolved_at: datetime | None


class ConflictFieldDecision(BaseModel):
    field: str
    source: str  # "genai" | "ground_truth" | "custom"
    custom_value: str | None = None


class ConflictResolutionSchema(BaseModel):
    decisions: list[ConflictFieldDecision]
    rationale: str


class ConflictRejectSchema(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


class ReviewerCommentSchema(BaseModel):
    comment: str = Field(min_length=1, max_length=5000)


class RegeneratedResponseSchema(BaseModel):
    suggested_response: str
