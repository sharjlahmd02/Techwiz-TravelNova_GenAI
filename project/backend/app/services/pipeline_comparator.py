"""Compares Pipeline 1 (GenAI) and Pipeline 2 (ground-truth) outputs on a
complaint. Ground truth is authoritative on agreement; any disagreement (or
a GenAI failure) routes to a human Reviewer -- never silently picks a side.
"""

from dataclasses import dataclass, field

COMPARED_FIELDS = [
    "category", "subcategory", "priority", "urgency",
    "department", "escalation_required", "escalation_level",
    "refund_eligible", "compensation_eligible",
]

CRITICAL_FIELDS = {"priority", "urgency", "escalation_required", "escalation_level"}


@dataclass
class FieldConflict:
    field: str
    genai_value: object
    ground_truth_value: object


@dataclass
class ComparisonResult:
    has_conflict: bool
    conflict_severity: str  # "none" | "minor" | "major" | "critical" | "genai_unavailable"
    conflict_fields: list[str] = field(default_factory=list)
    conflicts: list[FieldConflict] = field(default_factory=list)
    final_values: dict | None = None
    genai_values: dict | None = None
    ground_truth_values: dict | None = None
    # SRS req. li: a continuous 0.0-1.0 consistency/compliance measure, alongside the
    # categorical conflict_severity -- the fraction of COMPARED_FIELDS both pipelines
    # agreed on. None when there's nothing to compare against (GenAI unavailable), not 0.0
    # -- a missing pipeline isn't the same claim as "the two pipelines actively disagreed
    # on everything".
    verification_score: float | None = None


def compare_pipelines(genai_result: dict, ground_truth_result: dict) -> ComparisonResult:
    if genai_result.get("status") != "ok":
        # Gemini failed outright -- there's nothing to compare against, so this
        # always goes to a Reviewer rather than being silently auto-accepted.
        gt_values = {f: ground_truth_result.get(f) for f in COMPARED_FIELDS}
        return ComparisonResult(
            has_conflict=True,
            conflict_severity="genai_unavailable",
            ground_truth_values=gt_values,
            genai_values=None,
            verification_score=None,
        )

    conflicts = []
    for f in COMPARED_FIELDS:
        v1, v2 = genai_result.get(f), ground_truth_result.get(f)
        if v1 != v2:
            conflicts.append(FieldConflict(field=f, genai_value=v1, ground_truth_value=v2))

    has_conflict = bool(conflicts)
    if not has_conflict:
        severity = "none"
    elif any(c.field in CRITICAL_FIELDS for c in conflicts):
        severity = "critical"
    elif len(conflicts) >= 3:
        severity = "major"
    else:
        severity = "minor"

    genai_values = {f: genai_result.get(f) for f in COMPARED_FIELDS}
    gt_values = {f: ground_truth_result.get(f) for f in COMPARED_FIELDS}
    verification_score = round((len(COMPARED_FIELDS) - len(conflicts)) / len(COMPARED_FIELDS), 3)

    return ComparisonResult(
        has_conflict=has_conflict,
        conflict_severity=severity,
        conflict_fields=[c.field for c in conflicts],
        conflicts=conflicts,
        final_values=gt_values if not has_conflict else None,
        genai_values=genai_values,
        ground_truth_values=gt_values,
        verification_score=verification_score,
    )
