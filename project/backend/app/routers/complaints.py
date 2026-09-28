import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.database import get_db
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.customer_message import CustomerMessage
from app.models.enums import ComplaintStatus, HistoryAction
from app.models.user import User
from app.schemas.complaint import (
    ChatExtractRequest,
    ComplaintCreate,
    ComplaintCreateResponse,
    ComplaintDetail,
    ComplaintFieldsDraft,
    ComplaintStatusResponse,
    ComplaintTimelineEntry,
    DocumentExtractResponse,
    EmailExtractRequest,
    PaginatedComplaints,
    SatisfactionRatingCreate,
)
from app.schemas.message import CustomerMessageCreate, CustomerMessageResponse
from app.services.complaint_service import ComplaintService, process_complaint
from app.services.document_extractor import extract_text_from_upload
from app.services.genai.channel_extractor import extract_complaint_fields

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

# Internal-only actions (agent notes, pipeline failures, conflict routing,
# manual triage) are never surfaced to the customer -- only these are, and
# even then without their raw internal `notes` text.
CUSTOMER_VISIBLE_ACTIONS = {
    HistoryAction.CREATED,
    HistoryAction.STATUS_CHANGED,
    HistoryAction.ASSIGNED,
    HistoryAction.RESPONSE_SENT,
    HistoryAction.REOPENED,
    HistoryAction.CLOSED,
}


@router.post("/", response_model=ComplaintCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    service = ComplaintService(db)
    complaint = await service.create_complaint(data, current_user)
    background_tasks.add_task(process_complaint, complaint.id)
    return complaint


@router.post("/extract-chat", response_model=ComplaintFieldsDraft)
async def extract_from_chat(
    data: ChatExtractRequest,
    current_user: User = Depends(require_role("customer")),
):
    """Chat channel (spec.md 3.1.2): the frontend chat widget gathers the
    customer's free-text answers into one transcript and sends it here.
    Gemini turns it into a structured draft; nothing is saved to the DB yet
    -- the customer reviews/edits the draft, then submits it for real via the
    normal POST /api/complaints/ with channel="chat" and the transcript
    attached as source_payload."""
    draft = await extract_complaint_fields(data.raw_text)
    return ComplaintFieldsDraft(**draft)


@router.post("/extract-email", response_model=ComplaintFieldsDraft)
async def extract_from_email(
    data: EmailExtractRequest,
    current_user: User = Depends(require_role("customer")),
):
    """Email channel (spec.md 3.1.3): simulates the subject-as-title,
    body-as-description parsing a real inbound-email webhook would perform,
    without requiring a live mailbox integration -- the customer composes
    the email fields here instead of an external mail client."""
    raw_text = f"Subject: {data.subject}\n\n{data.body}"
    draft = await extract_complaint_fields(raw_text)
    return ComplaintFieldsDraft(**draft)


@router.post("/extract-document", response_model=DocumentExtractResponse)
async def extract_from_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("customer")),
):
    """Document-upload channel (spec.md 3.1.4): accepts a PDF or DOCX
    containing the complaint, extracts its text, then runs the same
    structured extraction as the other channels."""
    content = await file.read()
    text = extract_text_from_upload(file.filename or "upload", content)
    draft = await extract_complaint_fields(text)
    return DocumentExtractResponse(**draft, filename=file.filename or "upload", extracted_text_preview=text[:2000])


@router.get("/", response_model=PaginatedComplaints)
async def list_complaints(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    service = ComplaintService(db)
    items, total = await service.list_my_complaints(current_user, page, page_size)
    return PaginatedComplaints(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=page * page_size < total,
    )


async def _get_owned_complaint(complaint_id: uuid.UUID, db: AsyncSession, current_user: User) -> Complaint:
    service = ComplaintService(db)
    complaint = await service.get_my_complaint(complaint_id, current_user)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint


@router.get("/{complaint_id}", response_model=ComplaintDetail)
async def get_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    complaint = await _get_owned_complaint(complaint_id, db, current_user)
    return await ComplaintService(db).to_customer_detail(complaint)


@router.get("/{complaint_id}/status", response_model=ComplaintStatusResponse)
async def get_complaint_status(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    complaint = await _get_owned_complaint(complaint_id, db, current_user)
    history = (
        await db.scalars(
            select(ComplaintHistory)
            .where(ComplaintHistory.complaint_id == complaint.id)
            .order_by(ComplaintHistory.created_at.asc())
        )
    ).all()
    return ComplaintStatusResponse(
        complaint_id=complaint.complaint_id,
        status=complaint.status,
        timeline=[
            ComplaintTimelineEntry(action=h.action.value, notes=None, created_at=h.created_at)
            for h in history
            if h.action in CUSTOMER_VISIBLE_ACTIONS
        ],
    )


@router.get("/{complaint_id}/messages", response_model=list[CustomerMessageResponse])
async def list_messages(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    complaint = await _get_owned_complaint(complaint_id, db, current_user)
    return (
        await db.scalars(
            select(CustomerMessage)
            .where(CustomerMessage.complaint_id == complaint.id)
            .order_by(CustomerMessage.created_at.asc())
        )
    ).all()


@router.post("/{complaint_id}/messages", response_model=CustomerMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    complaint_id: uuid.UUID,
    data: CustomerMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    complaint = await _get_owned_complaint(complaint_id, db, current_user)
    service = ComplaintService(db)
    return await service.add_message(complaint, data.message)


@router.post("/{complaint_id}/rate", response_model=ComplaintDetail)
async def rate_satisfaction(
    complaint_id: uuid.UUID,
    data: SatisfactionRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    complaint = await _get_owned_complaint(complaint_id, db, current_user)
    if complaint.status not in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only rate a resolved or closed complaint",
        )
    service = ComplaintService(db)
    rated = await service.rate_satisfaction(complaint, data.rating)
    return await service.to_customer_detail(rated)
