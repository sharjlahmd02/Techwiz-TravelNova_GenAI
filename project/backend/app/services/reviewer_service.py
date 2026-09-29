import uuid

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, HistoryAction, PipelineType
from app.models.pipeline_comparison import PipelineComparison
from app.models.pipeline_result import PipelineResult
from app.models.user import User
from app.schemas.pipeline import ConflictResolutionSchema
from app.services.complaint_service import apply_final_values, select_relevant_policies
from app.services.genai.gemini_client import call_gemini
from app.services.genai.prompt_builder import DEFAULT_RESPONSE_TONE, build_response_regeneration_prompt
from app.services.ground_truth.sla_calculator import calculate_sla
from app.services.pipeline_comparator import COMPARED_FIELDS
from app.services.staff_service import log_history
from app.utils.datetime import utcnow

from app.models.customer_message import CustomerMessage
from app.models.enums import MessageSender

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

    async def reject(self, complaint: Complaint, reviewer: User, reason: str) -> Complaint:
        """SRS Step 58's "Reject" action: neither pipeline's classification is
        trusted, so both are discarded and the complaint is sent back through
        the full dual-pipeline analysis from scratch. Deletes the existing
        PipelineResult/PipelineComparison rows first -- PipelineComparison.
        complaint_id is unique, so process_complaint() would otherwise hit an
        integrity error trying to insert a second comparison for this complaint."""
        old_status = complaint.status.value

        await self.db.execute(delete(PipelineResult).where(PipelineResult.complaint_id == complaint.id))
        await self.db.execute(delete(PipelineComparison).where(PipelineComparison.complaint_id == complaint.id))

        complaint.has_conflict = False
        complaint.conflict_resolved_by = None
        complaint.conflict_resolved_at = None

        await log_history(
            self.db, complaint.id, HistoryAction.REJECTED, reviewer.id,
            old_value={"status": old_status}, new_value={"status": "processing"}, notes=reason,
        )

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def add_comment(self, complaint: Complaint, reviewer: User, comment: str) -> None:
        await log_history(self.db, complaint.id, HistoryAction.REVIEWER_COMMENT, reviewer.id, notes=comment)
        await self.db.commit()

    async def regenerate_response(self, complaint: Complaint, reviewer: User, tone: str = DEFAULT_RESPONSE_TONE) -> str:
        comparison = await self.db.scalar(
            select(PipelineComparison).where(PipelineComparison.complaint_id == complaint.id)
        )
        classification = (comparison.final_values if comparison else None) or (
            comparison.ground_truth_values if comparison else None
        ) or {}
        if not classification.get("category"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No finalized classification available yet to base a response on",
            )

        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GenAI is not configured"
            )

        policy_snippets, _ = await select_relevant_policies(
            self.db, complaint.product_type, complaint.description, {"policy_references": []}
        )
        system_prompt, user_prompt = build_response_regeneration_prompt(
            complaint.description, classification, policy_snippets, tone
        )
        result = await call_gemini(system_prompt, user_prompt, settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        if not result.success or not isinstance(result.data, dict) or not result.data.get("suggested_response"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not regenerate a response right now -- try again shortly",
            )

        new_response = str(result.data["suggested_response"]).strip()

        genai_result = await self.db.scalar(
            select(PipelineResult).where(
                PipelineResult.complaint_id == complaint.id, PipelineResult.pipeline == PipelineType.GENAI
            )
        )
        if genai_result:
            genai_result.suggested_response = new_response

        await log_history(
            self.db, complaint.id, HistoryAction.RESPONSE_REGENERATED, reviewer.id,
            notes=f"[{tone} tone] {new_response[:1000]}",
        )
        await self.db.commit()
        return new_response

    async def send_response_to_customer(self, complaint: Complaint, reviewer: User, message: str) -> CustomerMessage:
        msg = CustomerMessage(complaint_id=complaint.id, sender=MessageSender.AGENT, message=message)
        self.db.add(msg)
        await log_history(
            self.db, complaint.id, HistoryAction.RESPONSE_SENT, reviewer.id,
            notes="Reviewer sent the AI-drafted response to the customer",
        )
        await self.db.commit()
        await self.db.refresh(msg)
        return msg