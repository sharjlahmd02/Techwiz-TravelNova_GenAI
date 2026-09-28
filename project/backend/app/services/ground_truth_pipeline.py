"""Pipeline 2 -- the pure-Python, no-AI ground-truth validation pipeline.
Runs on every complaint alongside the GenAI pipeline; its output is
authoritative when the two agree (see pipeline_comparator.py).
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from app.services.ground_truth.condition_extractor import extract_conditions
from app.services.ground_truth.duplicate_detector import check_duplicate
from app.services.ground_truth.escalation_checker import check_escalation
from app.services.ground_truth.keyword_classifier import KeywordClassifier
from app.services.ground_truth.rule_matcher import RuleMatcher
from app.services.ground_truth.sla_calculator import calculate_sla

FALLBACK_DEPARTMENT = "DEPT-08"  # Customer Relations -- used when nothing else matches
PRIORITY_RANK = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
URGENCY_FOR_PRIORITY = {"P0": "critical", "P1": "high", "P2": "medium", "P3": "low"}


class GroundTruthPipeline:
    def __init__(self, categories: dict[str, list[str]], resolution_rules: list[dict], escalation_rules: list[dict]):
        self.classifier = KeywordClassifier(categories)
        self.rule_matcher = RuleMatcher(resolution_rules)
        self.escalation_rules = escalation_rules

    def process(self, complaint_text: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        metadata = metadata or {}
        submitted_at: datetime = metadata.get("submitted_at") or datetime.now(timezone.utc)

        conditions = extract_conditions(complaint_text)
        classification = self.classifier.classify(complaint_text, max_delay_hours=conditions.max_delay_hours)

        candidates = self.rule_matcher.match(classification.category, classification.subcategory)
        rule = candidates[0] if candidates else None

        escalation = check_escalation(self.escalation_rules, complaint_text, conditions, metadata)

        duplicate = check_duplicate(
            complaint_text,
            metadata.get("booking_reference"),
            metadata.get("recent_complaints", []),
        )

        priority, urgency = self._determine_priority_urgency(rule, conditions, escalation, duplicate)

        escalation_required = (
            escalation.required or bool(rule and rule.get("escalation_required")) or duplicate.repeat_after_resolution
        )
        escalation_level = max(
            escalation.level, (rule or {}).get("escalation_level", 0), 1 if duplicate.repeat_after_resolution else 0
        )

        department = (rule or {}).get("department", FALLBACK_DEPARTMENT)

        sla = calculate_sla(priority, metadata.get("loyalty_tier"), submitted_at)

        next_follow_up_at = None
        if rule and rule.get("follow_up") and rule.get("follow_up_days"):
            next_follow_up_at = submitted_at + timedelta(days=rule["follow_up_days"])

        summary = self._build_extractive_summary(classification, conditions, escalation_required, duplicate)

        return {
            "category": classification.category,
            "subcategory": classification.subcategory,
            "primary_issue": classification.subcategory or classification.category,
            "secondary_issue": classification.second_category,
            "urgency": urgency,
            "priority": priority,
            "department": department,
            "supporting_department": (rule or {}).get("supporting_department"),
            "escalation_required": escalation_required,
            "escalation_level": escalation_level,
            "matched_rule_ids": [rule["rule_id"]] if rule else [],
            "matched_escalation_ids": escalation.matched_rule_ids,
            "required_actions": (rule or {}).get("required_actions") or [],
            "prohibited_actions": (rule or {}).get("prohibited_actions") or [],
            "refund_eligible": (rule or {}).get("refund_eligible", False),
            "compensation_eligible": (rule or {}).get("compensation_eligible", False),
            "policy_references": [rule["policy_id"]] if rule and rule.get("policy_id") else [],
            "confidence": classification.confidence,
            "is_duplicate": duplicate.is_duplicate,
            "duplicate_of": duplicate.duplicate_of,
            "duplicate_similarity_score": duplicate.similarity_score,
            "sla_response_deadline": sla.response_deadline,
            "sla_resolution_deadline": sla.resolution_deadline,
            "next_follow_up_at": next_follow_up_at,
            "summary": summary,
            "provider": "ground_truth",
            "model": "keyword_classifier+rule_matcher+escalation_checker",
            "prompt_version": None,
            "conditions": conditions,
        }

    @staticmethod
    def _determine_priority_urgency(rule: dict | None, conditions, escalation, duplicate) -> tuple[str, str]:
        # Safety keywords and stranded travelers ALWAYS override to P0/Critical,
        # regardless of tone. This must never be based on sentiment/caps/exclamation.
        if conditions.has_safety_keywords or conditions.is_stranded:
            return "P0", "critical"

        base_priority = rule["priority"] if rule else "P3"
        base_urgency = rule["urgency"].lower() if rule else "low"

        if escalation.priority_override and PRIORITY_RANK[escalation.priority_override] < PRIORITY_RANK.get(base_priority, 3):
            base_priority, base_urgency = escalation.priority_override, URGENCY_FOR_PRIORITY[escalation.priority_override]

        # A repeat of an already-Resolved/Closed complaint means the first resolution
        # attempt failed -- bump one priority level (never based on tone/sentiment,
        # only the objective fact that this exact issue was already "resolved" once
        # and the customer is back). SRS Steps 21/54.
        if duplicate.repeat_after_resolution:
            bumped_rank = max(PRIORITY_RANK[base_priority] - 1, PRIORITY_RANK["P0"])
            bumped_priority = next(p for p, rank in PRIORITY_RANK.items() if rank == bumped_rank)
            if PRIORITY_RANK[bumped_priority] < PRIORITY_RANK[base_priority]:
                return bumped_priority, URGENCY_FOR_PRIORITY[bumped_priority]

        return base_priority, base_urgency

    @staticmethod
    def _build_extractive_summary(classification, conditions, escalation_required: bool, duplicate) -> str:
        """No-AI fallback for SRS Step 44's agent-facing TL;DR, used when GenAI's own
        `summary` is missing (a failed call, or an older/malformed response) -- built
        purely from already-computed classification/condition facts, not a rewrite of
        the complaint text."""
        subject = classification.subcategory or classification.category or "an unclassified issue"
        parts = [f"Customer reports {subject.lower()}."]
        if conditions.has_safety_keywords or conditions.is_stranded:
            parts.append("Flags a safety or stranded-traveler concern.")
        if conditions.has_legal_keywords:
            parts.append("Mentions legal action.")
        if duplicate.repeat_after_resolution:
            parts.append("Repeat of a previously resolved complaint.")
        elif duplicate.is_duplicate:
            parts.append("Possible duplicate of a recent complaint.")
        if escalation_required:
            parts.append("Requires escalation.")
        return " ".join(parts)
