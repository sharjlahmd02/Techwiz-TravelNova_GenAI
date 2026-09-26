import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.database import get_db
from app.models.enums import ComplaintStatus, Priority
from app.models.user import User
from app.schemas.manager import (
    AgentCreate,
    AgentResponse,
    AgentUpdate,
    ComplaintOverride,
    EscalateRequest,
    ManagerAnalytics,
)
from app.schemas.staff import PaginatedStaffComplaints, StaffComplaintDetail, StaffComplaintSummary
from app.services.manager_service import ManagerService
from app.services.staff_service import build_staff_detail

router = APIRouter(prefix="/api/manager", tags=["manager"])


@router.get("/complaints", response_model=PaginatedStaffComplaints)
async def list_complaints(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    department_id: uuid.UUID | None = None,
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    priority_filter: Priority | None = Query(default=None, alias="priority"),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    items, total = await service.list_complaints(
        page, page_size, department_id, status_filter, priority_filter, search
    )
    return PaginatedStaffComplaints(
        items=items, total=total, page=page, page_size=page_size, has_next=page * page_size < total
    )


@router.get("/complaints/{complaint_id}", response_model=StaffComplaintDetail)
async def get_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    complaint = await service.get_complaint(complaint_id)
    return await build_staff_detail(db, complaint)


@router.patch("/complaints/{complaint_id}/override", response_model=StaffComplaintDetail)
async def override_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintOverride,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    complaint = await service.get_complaint(complaint_id)
    complaint = await service.override_field(complaint, current_user, data)
    return await build_staff_detail(db, complaint)


@router.post("/complaints/{complaint_id}/escalate", response_model=StaffComplaintDetail)
async def escalate_complaint(
    complaint_id: uuid.UUID,
    data: EscalateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    complaint = await service.get_complaint(complaint_id)
    complaint = await service.escalate(complaint, current_user, data.reason, data.level)
    return await build_staff_detail(db, complaint)


@router.get("/agents", response_model=list[AgentResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    return await service.list_agents()


@router.post("/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    return await service.create_agent(data)


@router.patch("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    data: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    return await service.update_agent(agent_id, data)


@router.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    await service.deactivate_agent(agent_id)


@router.get("/analytics", response_model=ManagerAnalytics)
async def analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    service = ManagerService(db)
    return await service.analytics()
