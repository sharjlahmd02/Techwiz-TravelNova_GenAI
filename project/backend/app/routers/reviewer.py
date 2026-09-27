import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.database import get_db
from app.models.user import User
from app.schemas.pipeline import (
    ConflictRejectSchema,
    ConflictResolutionSchema,
    PipelineComparisonSchema,
    RegenerateResponseRequest,
    RegeneratedResponseSchema,
    ReviewerCommentSchema,
)
from app.schemas.staff import PaginatedStaffComplaints, StaffComplaintDetail, StaffComplaintSummary
from app.services.complaint_service import process_complaint
from app.services.reviewer_service import ReviewerService
from app.services.staff_service import build_staff_detail, get_complaint_or_404

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


@router.post("/conflicts/{complaint_id}/reject", response_model=StaffComplaintDetail)
async def reject_conflict(
    complaint_id: uuid.UUID,
    data: ConflictRejectSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    service = ReviewerService(db)
    complaint, _ = await service.get_conflict(complaint_id)
    complaint = await service.reject(complaint, current_user, data.reason)
    background_tasks.add_task(process_complaint, complaint.id)
    return await build_staff_detail(db, complaint)


@router.post("/conflicts/{complaint_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    complaint_id: uuid.UUID,
    data: ReviewerCommentSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    complaint = await get_complaint_or_404(db, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    service = ReviewerService(db)
    await service.add_comment(complaint, current_user, data.comment)
    return {"detail": "Comment added"}


@router.post("/conflicts/{complaint_id}/regenerate-response", response_model=RegeneratedResponseSchema)
async def regenerate_response(
    complaint_id: uuid.UUID,
    data: RegenerateResponseRequest = RegenerateResponseRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "manager", "admin")),
):
    complaint = await get_complaint_or_404(db, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    service = ReviewerService(db)
    new_response = await service.regenerate_response(complaint, current_user, data.tone)
    return RegeneratedResponseSchema(suggested_response=new_response)


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
