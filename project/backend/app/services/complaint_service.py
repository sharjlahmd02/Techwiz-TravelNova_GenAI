"""Core complaint submission and pipeline orchestration. create_complaint()
runs synchronously in the request; process_complaint() runs as a background
task after the response has already been returned to the customer.
"""

import asyncio
import re
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.category import Category, Subcategory
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.customer_message import CustomerMessage
from app.models.department import Department
from app.models.enums import (
    ComplaintStatus,
    HistoryAction,
    KnowledgeBaseStatus,
    MessageSender,
    PipelineType,
    Priority,
    Urgency,
)
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.knowledge_base_chunk import KnowledgeBaseChunk
from app.models.pipeline_comparison import PipelineComparison
from app.models.pipeline_result import PipelineResult
from app.models.user import User
from app.schemas.complaint import ComplaintCreate
from app.services.genai.injection_detector import detect as detect_injection
from app.services.pipeline_cache import get_pipelines
from app.services.pipeline_comparator import compare_pipelines
from app.utils.complaint_id import next_complaint_id

RECENT_COMPLAINT_WINDOW = timedelta(days=7)
MAX_RELEVANT_POLICIES = 5


class ComplaintService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_complaint(self, data: ComplaintCreate, user: User) -> Complaint:
        injection = detect_injection(data.description)

        previous_complaint_id = None
        if data.previous_complaint_reference:
            # Silently ignored (not a validation error) if it doesn't resolve to a complaint
            # the submitting customer actually owns -- this is a convenience link, not a
            # security-sensitive lookup, so no error is raised either way.
            previous = await self.db.scalar(
                select(Complaint).where(
                    Complaint.complaint_id == data.previous_complaint_reference.strip(),
                    Complaint.customer_id == user.id,
                )
            )
            previous_complaint_id = previous.id if previous else None

        complaint = Complaint(
            complaint_id=await next_complaint_id(self.db),
            customer_id=user.id,
            title=data.title,
            description=data.description,
            channel=data.channel,
            product_type=data.product_type,
            booking_reference=data.booking_reference,
            customer_selected_category=data.customer_selected_category,
            previous_complaint_id=previous_complaint_id,
            preferred_contact_channel=data.preferred_contact_channel,
            status=ComplaintStatus.SUBMITTED,
            is_prompt_injection=injection.is_injection,
            attachments=[data.source_payload] if data.source_payload else None,
        )
        self.db.add(complaint)
        await self.db.flush()

        self.db.add(
            CustomerMessage(
                complaint_id=complaint.id,
                sender=MessageSender.SYSTEM,
                message=(
                    f"Thanks for reaching out. Your complaint {complaint.complaint_id} has been "
                    "received and is being reviewed. We'll follow up with an update shortly."
                ),
            )
        )

        self.db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                action=HistoryAction.CREATED,
                performed_by=user.id,
                new_value={"status": ComplaintStatus.SUBMITTED.value},
            )
        )

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def list_my_complaints(self, user: User, page: int, page_size: int) -> tuple[list[Complaint], int]:
        base = select(Complaint).where(Complaint.customer_id == user.id).order_by(Complaint.created_at.desc())
        total = len((await self.db.scalars(base)).all())
        items = (
            await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))
        ).all()
        return list(items), total

    async def get_my_complaint(self, complaint_id: uuid.UUID, user: User) -> Complaint | None:
        complaint = await self.db.get(Complaint, complaint_id)
        if complaint is None or complaint.customer_id != user.id:
            return None
        return complaint

    async def add_message(self, complaint: Complaint, message: str) -> CustomerMessage:
        msg = CustomerMessage(complaint_id=complaint.id, sender=MessageSender.CUSTOMER, message=message)
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def rate_satisfaction(self, complaint: Complaint, rating: int) -> Complaint:
        complaint.satisfaction_rating = rating
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint


async def _recent_complaints_for_customer(db: AsyncSession, customer_id: uuid.UUID, exclude_id: uuid.UUID) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - RECENT_COMPLAINT_WINDOW
    result = await db.execute(
        select(Complaint).where(
            Complaint.customer_id == customer_id,
            Complaint.id != exclude_id,
            Complaint.created_at >= cutoff,
        )
    )
    return [
        {"complaint_id": c.complaint_id, "description": c.description, "booking_reference": c.booking_reference}
        for c in result.scalars().all()
    ]


_WORD_RE = re.compile(r"[a-z0-9]+")


def _words(text: str) -> set[str]:
    return set(_WORD_RE.findall(text.lower()))


async def select_relevant_policies(
    db: AsyncSession, product_type: str, complaint_text: str, gt_result: dict
) -> tuple[list[dict], str | None]:
    policy_ids: list[str] = list(gt_result.get("policy_references") or [])

    result = await db.execute(
        select(KnowledgeBaseDocument).where(KnowledgeBaseDocument.status == KnowledgeBaseStatus.ACTIVE)
    )
    # Expired documents stay "Active" until an admin manually supersedes them (their
    # status is a lifecycle field, expiry_date is just a date), but they shouldn't be
    # newly recommended to GenAI once lapsed -- task.md 13.1.
    today = date.today()
    docs = [d for d in result.scalars().all() if d.expiry_date is None or d.expiry_date >= today]

    product_lower = product_type.lower()
    for doc in docs:
        if len(policy_ids) >= MAX_RELEVANT_POLICIES:
            break
        if doc.document_id in policy_ids:
            continue
        if product_lower in doc.title.lower():
            policy_ids.append(doc.document_id)

    by_id = {doc.document_id: doc for doc in docs}
    selected_docs = [by_id[pid] for pid in policy_ids if pid in by_id]

    # SRS 9.5.7: feed GenAI the specific matched section, not a whole document.
    # Pick each selected document's best-overlapping chunk (plain word-overlap
    # against the complaint text -- no AI, chunking already did the real work at
    # upload time). Falls back to the whole document's text if it has no chunks
    # yet (pre-9.5.7 docs never re-uploaded) or nothing overlaps.
    chunks_by_doc: dict[uuid.UUID, list[KnowledgeBaseChunk]] = {}
    if selected_docs:
        doc_uuids = [d.id for d in selected_docs]
        chunk_rows = (
            await db.scalars(select(KnowledgeBaseChunk).where(KnowledgeBaseChunk.document_id.in_(doc_uuids)))
        ).all()
        for chunk in chunk_rows:
            chunks_by_doc.setdefault(chunk.document_id, []).append(chunk)

    complaint_words = _words(complaint_text)

    snippets: list[dict] = []
    policy_version_parts: list[str] = []
    for pid in policy_ids:
        doc = by_id.get(pid)
        if not doc:
            continue

        best_chunk = None
        doc_chunks = chunks_by_doc.get(doc.id, [])
        if doc_chunks and complaint_words:
            scored = [(len(_words(c.content_text) & complaint_words), c) for c in doc_chunks]
            best_score, best_chunk = max(scored, key=lambda pair: pair[0])
            if best_score == 0:
                best_chunk = None

        if best_chunk:
            label_bits = [f"Section {best_chunk.section}" if best_chunk.section else None, best_chunk.heading]
            label = " ".join(b for b in label_bits if b)
            title = f"{doc.title} -- {label}" if label else doc.title
            content = best_chunk.content_text
            policy_version_parts.append(f"{pid}@{best_chunk.version}")
        else:
            title = doc.title
            content = (doc.content_text or "")[:1500]
            policy_version_parts.append(f"{pid}@{doc.version}")

        snippets.append({"document_id": pid, "title": title, "content_text": content})

    # SRS req. liii wants each analysis to record which policy version(s) it was
    # produced against -- every used document/chunk's own `version` field, joined.
    policy_version = ", ".join(policy_version_parts) or None
    return snippets, policy_version


async def _save_pipeline_result(db: AsyncSession, complaint_id: uuid.UUID, pipeline: PipelineType, result: dict) -> None:
    ok = result.get("status", "ok") == "ok"
    db.add(
        PipelineResult(
            complaint_id=complaint_id,
            pipeline=pipeline,
            category=result.get("category"),
            subcategory=result.get("subcategory"),
            primary_issue=result.get("primary_issue"),
            secondary_issue=result.get("secondary_issue"),
            sentiment=result.get("sentiment"),
            sentiment_score=result.get("sentiment_score"),
            urgency=result.get("urgency"),
            priority=result.get("priority"),
            escalation_required=bool(result.get("escalation_required", False)),
            escalation_level=int(result.get("escalation_level") or 0),
            refund_eligible=bool(result.get("refund_eligible", False)),
            compensation_eligible=bool(result.get("compensation_eligible", False)),
            matched_rule_ids=result.get("matched_rule_ids"),
            matched_escalation_ids=result.get("matched_escalation_ids"),
            policy_references=result.get("policy_references"),
            required_actions=result.get("required_actions"),
            prohibited_actions=result.get("prohibited_actions"),
            suggested_response=result.get("suggested_response"),
            entities_extracted=result.get("entities_extracted"),
            clarification_questions=result.get("clarification_questions"),
            confidence_score=result.get("confidence"),
            processing_time_ms=result.get("processing_time_ms"),
            raw_output=result.get("raw_output") if pipeline == PipelineType.GENAI else None,
            provider=result.get("provider"),
            model_name=result.get("model"),
            prompt_version=result.get("prompt_version"),
            policy_version=result.get("policy_version"),
        )
    )
    if not ok:
        db.add(
            ComplaintHistory(
                complaint_id=complaint_id,
                action=HistoryAction.NOTE_ADDED,
                performed_by=None,
                notes=f"{pipeline.value} pipeline failed: {result.get('reason')} -- {result.get('error')}",
            )
        )


async def apply_final_values(db: AsyncSession, complaint: Complaint, final_values: dict, gt_result: dict) -> None:
    category_id = None
    subcategory_id = None
    if final_values.get("category"):
        category = await db.scalar(select(Category).where(Category.name == final_values["category"]))
        if category:
            category_id = category.id
            if final_values.get("subcategory"):
                subcategory = await db.scalar(
                    select(Subcategory).where(
                        Subcategory.category_id == category.id, Subcategory.name == final_values["subcategory"]
                    )
                )
                subcategory_id = subcategory.id if subcategory else None

    department_id = None
    if final_values.get("department"):
        department = await db.scalar(select(Department).where(Department.code == final_values["department"]))
        department_id = department.id if department else None

    complaint.category_id = category_id
    complaint.subcategory_id = subcategory_id
    complaint.department_id = department_id
    complaint.priority = Priority(final_values["priority"]) if final_values.get("priority") else None
    complaint.urgency = Urgency(final_values["urgency"]) if final_values.get("urgency") else None
    complaint.escalation_level = final_values.get("escalation_level") or 0

    sla = gt_result.get("sla_response_deadline"), gt_result.get("sla_resolution_deadline")
    complaint.sla_response_deadline = sla[0]
    complaint.sla_resolution_deadline = sla[1]


AMBIGUOUS_CONFIDENCE_THRESHOLD = 0.35


def _additional_review_reason(gt_result: dict, genai_result: dict) -> str | None:
    """SRS Step 57 lists review triggers beyond "the two pipelines disagree":
    a sensitive complaint, an ambiguous classification, or no policy support
    found at all. Checked in this priority order since only one reason is
    stored (the most important one)."""
    conditions = gt_result.get("conditions")
    if conditions is not None and (
        getattr(conditions, "has_safety_keywords", False) or getattr(conditions, "has_legal_keywords", False)
    ):
        return "sensitive_complaint"

    if gt_result.get("confidence", 1.0) < AMBIGUOUS_CONFIDENCE_THRESHOLD:
        return "ambiguous_classification"

    gt_policies = gt_result.get("policy_references") or []
    genai_ok = genai_result.get("status") == "ok"
    genai_policies = genai_result.get("policy_references") or [] if genai_ok else None
    if not gt_policies and (genai_policies is not None and not genai_policies):
        return "missing_policy_support"

    return None


REVIEW_REASON_NOTES = {
    "sensitive_complaint": "Flagged for manual review -- safety or legal keywords detected",
    "ambiguous_classification": "Flagged for manual review -- ground-truth classification confidence too low",
    "missing_policy_support": "Flagged for manual review -- no policy found to support either pipeline's analysis",
}


async def process_complaint(complaint_id: uuid.UUID) -> None:
    """Runs in the background after submission -- opens its own DB session
    since the request-scoped session is gone by the time this runs. A GenAI
    failure never raises out of here; it just routes the complaint to review."""
    async with AsyncSessionLocal() as db:
        complaint = await db.get(Complaint, complaint_id)
        if complaint is None:
            return

        complaint.status = ComplaintStatus.PROCESSING
        await db.commit()

        bundle = await get_pipelines(db)

        customer = await db.get(User, complaint.customer_id)
        loyalty_tier = customer.loyalty_tier.value if customer and customer.loyalty_tier else None

        recent_complaints = await _recent_complaints_for_customer(db, complaint.customer_id, exclude_id=complaint.id)

        gt_metadata = {
            "loyalty_tier": loyalty_tier,
            "channel": complaint.channel.value,
            "submitted_at": complaint.created_at,
            "booking_reference": complaint.booking_reference,
            "recent_complaints": recent_complaints,
        }

        # Ground truth is near-instant (pure Python, ~1-2ms); run it first so
        # GenAI can be handed a lean, relevant policy set instead of all 24
        # docs on every call.
        gt_result = await asyncio.to_thread(bundle.ground_truth.process, complaint.description, gt_metadata)
        policy_snippets, policy_version = await select_relevant_policies(
            db, complaint.product_type, complaint.description, gt_result
        )
        gt_result["policy_version"] = policy_version

        genai_metadata = {
            "product_type": complaint.product_type,
            "booking_reference": complaint.booking_reference,
            "loyalty_tier": loyalty_tier,
        }
        genai_result = await bundle.genai.process(
            complaint.description, genai_metadata, policy_snippets, bundle.valid_policy_ids
        )
        genai_result["policy_version"] = policy_version

        await _save_pipeline_result(db, complaint.id, PipelineType.GROUND_TRUTH, gt_result)
        await _save_pipeline_result(db, complaint.id, PipelineType.GENAI, genai_result)

        comparison = compare_pipelines(genai_result, gt_result)
        stored_severity = comparison.conflict_severity if comparison.conflict_severity != "genai_unavailable" else "critical"
        db.add(
            PipelineComparison(
                complaint_id=complaint.id,
                has_conflict=comparison.has_conflict,
                conflict_fields=comparison.conflict_fields,
                conflict_severity=stored_severity,
                genai_values=comparison.genai_values,
                ground_truth_values=comparison.ground_truth_values,
                final_values=comparison.final_values,
                verification_score=comparison.verification_score,
            )
        )

        additional_reason = None if comparison.has_conflict else _additional_review_reason(gt_result, genai_result)

        old_status = complaint.status.value
        if comparison.has_conflict:
            complaint.status = ComplaintStatus.UNDER_REVIEW
            complaint.has_conflict = True
            complaint.review_reason = "pipeline_conflict"
        elif additional_reason:
            # The two pipelines actually agree here -- nothing is in dispute -- so the
            # computed values are applied as normal (a safety complaint should still show
            # up correctly prioritized/departmentalized while it waits). UNDER_REVIEW just
            # means a human should glance at it before it's worked, not that its
            # classification is unresolved.
            await apply_final_values(db, complaint, comparison.final_values, gt_result)
            complaint.status = ComplaintStatus.UNDER_REVIEW
            complaint.has_conflict = False
            complaint.review_reason = additional_reason
        else:
            await apply_final_values(db, complaint, comparison.final_values, gt_result)
            complaint.status = ComplaintStatus.ASSIGNED
            complaint.has_conflict = False
            complaint.review_reason = None

        complaint.is_duplicate = bool(gt_result.get("is_duplicate", False))
        if gt_result.get("duplicate_of"):
            dup = await db.scalar(select(Complaint).where(Complaint.complaint_id == gt_result["duplicate_of"]))
            complaint.duplicate_of = dup.id if dup else None

        # Ground-truth-only: not a compared/reconciled field (GenAI never computes a
        # supporting department), so it's set unconditionally rather than waiting on
        # conflict resolution -- same treatment as is_duplicate/duplicate_of above.
        if gt_result.get("supporting_department"):
            supporting_dept = await db.scalar(
                select(Department).where(Department.code == gt_result["supporting_department"])
            )
            complaint.supporting_department_id = supporting_dept.id if supporting_dept else None

        if comparison.has_conflict:
            history_notes = "Pipeline processing complete -- conflict, routed to reviewer"
        elif additional_reason:
            history_notes = f"Pipeline processing complete -- {REVIEW_REASON_NOTES[additional_reason]}"
        else:
            history_notes = "Pipeline processing complete -- pipelines agreed, auto-assigned"

        db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                action=HistoryAction.STATUS_CHANGED,
                performed_by=None,
                old_value={"status": old_status},
                new_value={"status": complaint.status.value},
                notes=history_notes,
            )
        )

        await db.commit()
