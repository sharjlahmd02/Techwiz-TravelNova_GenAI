import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import LoyaltyTier, UserRole


class AgentCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    department_id: uuid.UUID


class AgentUpdate(BaseModel):
    full_name: str | None = None
    department_id: uuid.UUID | None = None
    is_active: bool | None = None


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department_id: uuid.UUID | None
    is_active: bool
    created_at: datetime


class ComplaintOverride(BaseModel):
    field: str
    value: str
    reason: str = Field(min_length=1, max_length=1000)


class EscalateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
    level: int = Field(ge=1, le=5)


class DepartmentMetrics(BaseModel):
    department_id: uuid.UUID
    department_name: str
    open_complaints: int
    resolved_complaints: int
    avg_resolution_hours: float | None
    sla_compliance_rate: float | None


class ManagerAnalytics(BaseModel):
    total_open: int
    by_priority: dict[str, int]
    sla_compliance_rate: float | None
    conflict_rate: float | None
    departments: list[DepartmentMetrics]
