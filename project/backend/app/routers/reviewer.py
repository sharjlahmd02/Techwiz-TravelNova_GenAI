import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.database import get_db
from app.models.user import User
from app.schemas.pipeline import ConflictResolutionSchema, PipelineComparisonSchema
from app.schemas.staff import PaginatedStaffComplaints, StaffComplaintDetail, StaffComplaintSummary
from app.services.reviewer_service import ReviewerService
from app.services.staff_service import build_staff_detail

router = APIRouter(prefix="/api/reviewer", tags=["reviewer"])


@router.get("/conflicts", response_model=PaginatedStaffComplaints)
async def list_conflicts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    service = ReviewerService(db)
    items, total = await service.list_conflicts(page, page_size)
    return PaginatedStaffComplaints(
        items=items, total=total, page=page, page_size=page_size, has_next=page * page_size < total
    )


@router.get("/conflicts/{complaint_id}", response_model=StaffComplaintDetail)
async def get_conflict(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    service = ReviewerService(db)
    complaint, _ = await service.get_conflict(complaint_id)
    return await build_staff_detail(db, complaint)


@router.post("/conflicts/{complaint_id}/resolve", response_model=StaffComplaintDetail)
async def resolve_conflict(
    complaint_id: uuid.UUID,
    data: ConflictResolutionSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    service = ReviewerService(db)
    complaint, comparison = await service.get_conflict(complaint_id)
    complaint = await service.resolve(complaint, comparison, current_user, data)
    return await build_staff_detail(db, complaint)


@router.get("/history", response_model=list[PipelineComparisonSchema])
async def my_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer")),
):
    service = ReviewerService(db)
    items, _ = await service.my_history(current_user, page, page_size)
    return items
