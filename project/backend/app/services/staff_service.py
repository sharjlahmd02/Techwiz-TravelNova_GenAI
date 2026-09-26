"""Shared helpers used by agent/reviewer/manager/admin services to build the
full staff-facing complaint view (pipeline outputs, comparison, history)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.customer_message import CustomerMessage
from app.models.enums import HistoryAction
from app.models.pipeline_comparison import PipelineComparison
from app.models.pipeline_result import PipelineResult
from app.schemas.message import CustomerMessageResponse
from app.schemas.pipeline import PipelineComparisonSchema, PipelineResultSchema
from app.schemas.staff import HistoryEntry, StaffComplaintDetail


async def get_complaint_or_404(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint | None:
    return await db.get(Complaint, complaint_id)


async def build_staff_detail(db: AsyncSession, complaint: Complaint) -> StaffComplaintDetail:
    pipeline_results = (
        await db.scalars(select(PipelineResult).where(PipelineResult.complaint_id == complaint.id))
    ).all()
    comparison = await db.scalar(select(PipelineComparison).where(PipelineComparison.complaint_id == complaint.id))
    messages = (
        await db.scalars(
            select(CustomerMessage)
            .where(CustomerMessage.complaint_id == complaint.id)
            .order_by(CustomerMessage.created_at.asc())
        )
    ).all()
    history = (
        await db.scalars(
            select(ComplaintHistory)
            .where(ComplaintHistory.complaint_id == complaint.id)
            .order_by(ComplaintHistory.created_at.asc())
        )
    ).all()

    # Built explicitly (not via model_validate(complaint)) because the schema's
    # list field names (pipeline_results, comparison, messages, history) collide
    # with Complaint's own lazy-loaded async relationships of the same name,
    # which Pydantic's attribute traversal can't await into.
    return StaffComplaintDetail(
        id=complaint.id,
        complaint_id=complaint.complaint_id,
        title=complaint.title,
        description=complaint.description,
        channel=complaint.channel,
        product_type=complaint.product_type,
        booking_reference=complaint.booking_reference,
        customer_selected_category=complaint.customer_selected_category,
        status=complaint.status,
        priority=complaint.priority,
        urgency=complaint.urgency,
        escalation_level=complaint.escalation_level,
        escalation_reason=complaint.escalation_reason,
        is_duplicate=complaint.is_duplicate,
        duplicate_of=complaint.duplicate_of,
        is_prompt_injection=complaint.is_prompt_injection,
        has_conflict=complaint.has_conflict,
        sla_response_deadline=complaint.sla_response_deadline,
        sla_resolution_deadline=complaint.sla_resolution_deadline,
        satisfaction_rating=complaint.satisfaction_rating,
        created_at=complaint.created_at,
        closed_at=complaint.closed_at,
        customer_id=complaint.customer_id,
        department_id=complaint.department_id,
        assigned_agent_id=complaint.assigned_agent_id,
        pipeline_results=[PipelineResultSchema.model_validate(pr) for pr in pipeline_results],
        comparison=PipelineComparisonSchema.model_validate(comparison) if comparison else None,
        messages=[CustomerMessageResponse.model_validate(m) for m in messages],
        history=[
            HistoryEntry(
                action=h.action.value,
                performed_by=h.performed_by,
                old_value=h.old_value,
                new_value=h.new_value,
                notes=h.notes,
                created_at=h.created_at,
            )
            for h in history
        ],
    )


async def log_history(
    db: AsyncSession,
    complaint_id: uuid.UUID,
    action: HistoryAction,
    performed_by: uuid.UUID | None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    notes: str | None = None,
) -> None:
    db.add(
        ComplaintHistory(
            complaint_id=complaint_id,
            action=action,
            performed_by=performed_by,
            old_value=old_value,
            new_value=new_value,
            notes=notes,
        )
    )
