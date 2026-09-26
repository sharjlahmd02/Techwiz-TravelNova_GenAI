import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.database import get_db
from app.models.enums import ComplaintStatus, Priority
from app.models.user import User
from app.schemas.agent import AgentMetrics, AgentNoteCreate, AgentRequestInfo, AgentStatusUpdate
from app.schemas.message import CustomerMessageResponse
from app.schemas.staff import StaffComplaintDetail, StaffComplaintSummary
from app.services.agent_service import AgentService
from app.services.staff_service import build_staff_detail

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/complaints", response_model=list[StaffComplaintSummary])
async def list_complaints(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    priority_filter: Priority | None = Query(default=None, alias="priority"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    if current_user.department_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent has no department assigned")
    service = AgentService(db)
    items, _ = await service.list_department_complaints(current_user, page, page_size, status_filter, priority_filter)
    return items


@router.get("/complaints/{complaint_id}", response_model=StaffComplaintDetail)
async def get_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    service = AgentService(db)
    complaint = await service.get_department_complaint(complaint_id, current_user)
    return await build_staff_detail(db, complaint)


@router.patch("/complaints/{complaint_id}/status", response_model=StaffComplaintDetail)
async def update_status(
    complaint_id: uuid.UUID,
    data: AgentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    service = AgentService(db)
    complaint = await service.get_department_complaint(complaint_id, current_user)
    complaint = await service.update_status(complaint, current_user, data.status)
    return await build_staff_detail(db, complaint)


@router.post("/complaints/{complaint_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_note(
    complaint_id: uuid.UUID,
    data: AgentNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    service = AgentService(db)
    complaint = await service.get_department_complaint(complaint_id, current_user)
    await service.add_note(complaint, current_user, data.note)
    return {"detail": "Note added"}


@router.post("/complaints/{complaint_id}/request-info", response_model=CustomerMessageResponse, status_code=status.HTTP_201_CREATED)
async def request_info(
    complaint_id: uuid.UUID,
    data: AgentRequestInfo,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    service = AgentService(db)
    complaint = await service.get_department_complaint(complaint_id, current_user)
    return await service.request_info(complaint, current_user, data.message)


@router.get("/metrics", response_model=AgentMetrics)
async def my_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    service = AgentService(db)
    return await service.my_metrics(current_user)
