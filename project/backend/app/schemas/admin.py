import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import EmailIntakeOutcome, KnowledgeBaseStatus, LoyaltyTier, UserRole


# ---- Resolution rules ----
class ResolutionRuleCreate(BaseModel):
    rule_id: str
    category: str
    subcategory: str
    conditions: list | dict | None = None
    department: str
    supporting_department: str | None = None
    urgency: str
    priority: str
    policy_id: str | None = None
    escalation_required: bool = False
    escalation_level: int = 0
    required_actions: list[str] | None = None
    prohibited_actions: list[str] | None = None
    follow_up: bool = False
    follow_up_days: int | None = None
    compensation_eligible: bool = False
    refund_eligible: bool = False


class ResolutionRuleUpdate(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    conditions: list | dict | None = None
    department: str | None = None
    supporting_department: str | None = None
    urgency: str | None = None
    priority: str | None = None
    policy_id: str | None = None
    escalation_required: bool | None = None
    escalation_level: int | None = None
    required_actions: list[str] | None = None
    prohibited_actions: list[str] | None = None
    follow_up: bool | None = None
    follow_up_days: int | None = None
    compensation_eligible: bool | None = None
    refund_eligible: bool | None = None


class ResolutionRuleResponse(ResolutionRuleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


# ---- Escalation rules ----
class EscalationRuleCreate(BaseModel):
    rule_id: str
    trigger_condition: str
    level: int | None = None
    relative_level: str | None = None
    level_name: str | None = None
    priority_override: str | None = None
    response_time: str
    is_mandatory: bool = True


class EscalationRuleUpdate(BaseModel):
    trigger_condition: str | None = None
    level: int | None = None
    relative_level: str | None = None
    level_name: str | None = None
    priority_override: str | None = None
    response_time: str | None = None
    is_mandatory: bool | None = None


class EscalationRuleResponse(EscalationRuleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


# ---- Categories ----
class SubcategoryCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class SubcategoryResponse(SubcategoryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    is_active: bool


class CategoryCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    is_active: bool


# ---- Departments ----
class DepartmentCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    is_active: bool


# ---- Users ----
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole
    department_id: uuid.UUID | None = None
    loyalty_tier: LoyaltyTier | None = None


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    department_id: uuid.UUID | None = None
    loyalty_tier: LoyaltyTier | None = None
    is_active: bool | None = None


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department_id: uuid.UUID | None
    is_active: bool
    loyalty_tier: LoyaltyTier | None
    created_at: datetime


# ---- Knowledge base ----
class KnowledgeBaseDocResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_id: str
    title: str
    category: str | None
    file_path: str
    version: str
    effective_date: date | None
    expiry_date: date | None
    is_active: bool
    status: KnowledgeBaseStatus


class KnowledgeBaseDocUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    is_active: bool | None = None
    status: KnowledgeBaseStatus | None = None
    effective_date: date | None = None
    expiry_date: date | None = None


# ---- Audit log ----
class AuditLogEntry(BaseModel):
    id: uuid.UUID
    complaint_id: uuid.UUID
    action: str
    performed_by: uuid.UUID | None
    old_value: dict | None
    new_value: dict | None
    notes: str | None
    created_at: datetime


class PaginatedAuditLog(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    page_size: int
    has_next: bool


# ---- System analytics ----
class CategoryTrendPoint(BaseModel):
    category: str
    this_week: int
    last_week: int
    delta: int


class WeekOverWeek(BaseModel):
    this_week: int
    last_week: int
    delta: int


class AdminAnalytics(BaseModel):
    total_complaints: int
    resolved_today: int
    pipeline_conflicts: int
    pipeline_agreement_rate: float | None
    data_assets: dict[str, int]
    category_distribution: dict[str, int]
    priority_distribution: dict[str, int]
    department_distribution: dict[str, int]
    avg_resolution_hours: float | None
    category_trend: list[CategoryTrendPoint]
    escalation_trend: WeekOverWeek
    volume_trend: WeekOverWeek


# ---- Email intake ----
class EmailIntakeLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    from_address: str
    subject: str
    outcome: EmailIntakeOutcome
    reason: str | None
    complaint_id: uuid.UUID | None
    received_at: datetime | None
    processed_at: datetime


# ---- Export / Import ----
class ExportRequest(BaseModel):
    format: str = Field(pattern="^(csv|json|pdf)$")
    scope: str = Field(default="all", pattern="^(all|department|date_range)$")
    department_id: uuid.UUID | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class ImportComplaintRecord(BaseModel):
    title: str
    description: str
    customer_name: str
    email: str
    product_type: str
    booking_reference: str | None = None
    customer_selected_category: str | None = None
    loyalty_tier: str | None = None


class ImportComplaintsRequest(BaseModel):
    complaints: list[ImportComplaintRecord]


class ImportComplaintsResponse(BaseModel):
    imported: int
    failed: int
    results: list[dict]
