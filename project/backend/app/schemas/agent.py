from pydantic import BaseModel, Field

from app.models.enums import ComplaintStatus


class AgentStatusUpdate(BaseModel):
    status: ComplaintStatus


class AgentNoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)


class AgentRequestInfo(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class AgentMetrics(BaseModel):
    resolved_count: int
    open_count: int
    avg_resolution_hours: float | None
    sla_compliance_rate: float | None
