"""Builds and caches the ground-truth and GenAI pipelines from DB-loaded
categories/departments/rules, per claude.md's "load rules from DB at
startup (cache in memory)". Cached once per process; call `refresh()` after
an admin edits rules/categories (Phase 9) to pick up changes without a
restart.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.category import Category
from app.models.department import Department
from app.models.enums import KnowledgeBaseStatus
from app.models.escalation_rule import EscalationRule
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.resolution_rule import ResolutionRule
from app.services.genai_pipeline import GenAIPipeline
from app.services.ground_truth_pipeline import GroundTruthPipeline


@dataclass
class PipelineBundle:
    ground_truth: GroundTruthPipeline
    genai: GenAIPipeline
    categories: dict[str, list[str]]
    departments: list[dict]
    # document_id -> its current KnowledgeBaseStatus value ("active"/"previous"/"superseded").
    # Draft docs are excluded entirely (never published, so citing one is a hallucination);
    # Previous/Superseded ARE included here (unlike the retrieval query in
    # complaint_service.select_relevant_policies, which stays Active-only) so a citation of a
    # real-but-outdated policy gets marked "Outdated" (SRS 9.5.12) instead of being wrongly
    # treated as a hallucinated/invented policy ID.
    valid_policy_ids: dict[str, str]


_cache: PipelineBundle | None = None


def refresh() -> None:
    global _cache
    _cache = None


async def _load_categories(db: AsyncSession) -> dict[str, list[str]]:
    result = await db.execute(select(Category).options(selectinload(Category.subcategories)))
    categories = result.scalars().unique().all()
    return {c.name: [s.name for s in c.subcategories] for c in categories}


async def _load_departments(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Department))
    return [{"id": d.code, "name": d.name} for d in result.scalars().all()]


async def _load_resolution_rules(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(ResolutionRule))
    rules = result.scalars().all()
    return [
        {
            "rule_id": r.rule_id,
            "category": r.category,
            "subcategory": r.subcategory,
            "conditions": r.conditions,
            "department": r.department,
            "supporting_department": r.supporting_department,
            "urgency": r.urgency,
            "priority": r.priority,
            "policy_id": r.policy_id,
            "escalation_required": r.escalation_required,
            "escalation_level": r.escalation_level,
            "required_actions": r.required_actions,
            "prohibited_actions": r.prohibited_actions,
            "follow_up": r.follow_up,
            "follow_up_days": r.follow_up_days,
            "compensation_eligible": r.compensation_eligible,
            "refund_eligible": r.refund_eligible,
        }
        for r in rules
    ]


async def _load_escalation_rules(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(EscalationRule))
    rules = result.scalars().all()
    return [
        {
            "rule_id": r.rule_id,
            "trigger_condition": r.trigger_condition,
            "level": r.level,
            "relative_level": r.relative_level,
            "level_name": r.level_name,
            "priority_override": r.priority_override,
            "response_time": r.response_time,
            "is_mandatory": r.is_mandatory,
        }
        for r in rules
    ]


async def _load_policy_ids(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(
        select(KnowledgeBaseDocument.document_id, KnowledgeBaseDocument.status).where(
            KnowledgeBaseDocument.status != KnowledgeBaseStatus.DRAFT
        )
    )
    return {doc_id: status.value for doc_id, status in result.all()}


async def get_pipelines(db: AsyncSession) -> PipelineBundle:
    global _cache
    if _cache is not None:
        return _cache

    categories = await _load_categories(db)
    departments = await _load_departments(db)
    resolution_rules = await _load_resolution_rules(db)
    escalation_rules = await _load_escalation_rules(db)
    valid_policy_ids = await _load_policy_ids(db)

    _cache = PipelineBundle(
        ground_truth=GroundTruthPipeline(categories, resolution_rules, escalation_rules),
        genai=GenAIPipeline(categories, departments, settings.GEMINI_API_KEY, settings.GEMINI_MODEL),
        categories=categories,
        departments=departments,
        valid_policy_ids=valid_policy_ids,
    )
    return _cache
