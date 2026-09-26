import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, HistoryAction
from app.models.pipeline_comparison import PipelineComparison
from app.models.user import User
from app.schemas.pipeline import ConflictResolutionSchema
from app.services.complaint_service import apply_final_values
from app.services.ground_truth.sla_calculator import calculate_sla
from app.services.pipeline_comparator import COMPARED_FIELDS
from app.services.staff_service import log_history
from app.utils.datetime import utcnow

_BOOL_FIELDS = {"escalation_required", "refund_eligible", "compensation_eligible"}
_INT_FIELDS = {"escalation_level"}


def _coerce_custom_value(field: str, raw: str):
    if field in _BOOL_FIELDS:
        return raw.strip().lower() in ("true", "1", "yes")
    if field in _INT_FIELDS:
        return int(raw)
    return raw


class ReviewerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_conflicts(self, page: int, page_size: int) -> tuple[list[Complaint], int]:
        base = (
            select(Complaint)
            .where(Complaint.status == ComplaintStatus.UNDER_REVIEW)
            .order_by(Complaint.created_at.asc())
        )
        total = len((await self.db.scalars(base)).all())
        items = (await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))).all()
        return list(items), total

    async def get_conflict(self, complaint_id: uuid.UUID) -> tuple[Complaint, PipelineComparison]:
        complaint = await self.db.get(Complaint, complaint_id)
        if complaint is None or complaint.status != ComplaintStatus.UNDER_REVIEW:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")
        comparison = await self.db.scalar(
            select(PipelineComparison).where(PipelineComparison.complaint_id == complaint.id)
        )
        if comparison is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pipeline comparison for this complaint")
        return complaint, comparison

    async def resolve(
        self, complaint: Complaint, comparison: PipelineComparison, reviewer: User, data: ConflictResolutionSchema
    ) -> Complaint:
        conflict_fields = set(comparison.conflict_fields or [])
        decided_fields = {d.field for d in data.decisions}
        missing = conflict_fields - decided_fields
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Must resolve all conflicting fields; missing: {sorted(missing)}",
            )

        final_values: dict = {}
        for field in COMPARED_FIELDS:
            if field not in conflict_fields:
                # Both pipelines already agreed on this one.
                final_values[field] = (comparison.ground_truth_values or {}).get(field)
                continue

            decision = next(d for d in data.decisions if d.field == field)
            if decision.source == "ground_truth":
                final_values[field] = (comparison.ground_truth_values or {}).get(field)
            elif decision.source == "genai":
                if comparison.genai_values is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"GenAI produced no value for {field!r} (pipeline failed) -- choose ground_truth or custom",
                    )
                final_values[field] = (comparison.genai_values or {}).get(field)
            elif decision.source == "custom":
                if decision.custom_value is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail=f"custom_value required for field {field!r}"
                    )
                final_values[field] = _coerce_custom_value(field, decision.custom_value)
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid source {decision.source!r}")

        comparison.final_values = final_values
        comparison.reviewer_id = reviewer.id
        comparison.reviewer_rationale = data.rationale
        comparison.resolved_at = utcnow()

        customer = await self.db.get(User, complaint.customer_id)
        loyalty_tier = customer.loyalty_tier.value if customer and customer.loyalty_tier else None
        sla = calculate_sla(final_values["priority"], loyalty_tier, complaint.created_at)
        gt_result_stub = {
            "sla_response_deadline": sla.response_deadline,
            "sla_resolution_deadline": sla.resolution_deadline,
        }
        await apply_final_values(self.db, complaint, final_values, gt_result_stub)

        old_status = complaint.status.value
        complaint.status = ComplaintStatus.ASSIGNED
        complaint.conflict_resolved_by = reviewer.id
        complaint.conflict_resolved_at = comparison.resolved_at

        await log_history(
            self.db, complaint.id, HistoryAction.CONFLICT_RESOLVED, reviewer.id,
            old_value={"status": old_status}, new_value={"status": complaint.status.value, "final_values": final_values},
            notes=data.rationale,
        )

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def my_history(self, reviewer: User, page: int, page_size: int) -> tuple[list[PipelineComparison], int]:
        base = (
            select(PipelineComparison)
            .where(PipelineComparison.reviewer_id == reviewer.id)
            .order_by(PipelineComparison.resolved_at.desc())
        )
        total = len((await self.db.scalars(base)).all())
        items = (await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))).all()
        return list(items), total
