"""Validates and sanitizes Gemini's JSON response -- the hallucination guard.
Never trusts the model's output at face value: unknown categories/policy IDs
are stripped, malformed fields get safe defaults, and a few heuristic checks
flag responses worth a human's attention.
"""

import re
from dataclasses import dataclass, field

from app.services.genai.prompt_builder import POLICY_APPLICABILITY_STATUSES
from app.services.ground_truth.condition_extractor import extract_conditions
from app.services.ground_truth.sla_calculator import PRIORITY_SLA

VALID_SENTIMENTS = {"Positive", "Neutral", "Negative", "Very Negative"}
VALID_URGENCY = {"critical", "high", "medium", "low"}
VALID_PRIORITY = {"P0", "P1", "P2", "P3"}
CONFIDENCE_THRESHOLD = 0.5
MAX_CLARIFICATION_QUESTIONS = 3

# "business day" isn't a real duration, but this is only used to sanity-check
# a promised timeline against the SLA order of magnitude, not to schedule anything.
_HOURS_PER_BUSINESS_DAY = 24
PROMISED_TIMELINE_PATTERN = re.compile(
    r"within\s+(\d+(?:\.\d+)?)\s*(hour|day|minute)s?\b", re.IGNORECASE
)


def _resolution_hours(priority: str) -> float:
    _, value, unit = PRIORITY_SLA[priority]
    return value if unit == "hours" else value * _HOURS_PER_BUSINESS_DAY

UNSUPPORTED_PROMISE_PATTERNS = [
    r"\byou are guaranteed\b",
    r"\bwe promise\b",
    r"\bimmediately\s+(?:refund|compensat)",
    r"\b100%\s+(?:refund|guaranteed)\b",
    r"\bfull\s+refund\s+(?:right\s+away|immediately|today)\b",
]


@dataclass
class ValidationResult:
    data: dict
    issues: list[str] = field(default_factory=list)


def _coerce_bool(value, default: bool) -> bool:
    return value if isinstance(value, bool) else default


def _coerce_float(value, lo: float, hi: float, default: float) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    return f if lo <= f <= hi else default


def _coerce_list_of_str(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    return []


def _validate_policy_references(raw_refs, valid_policy_ids: dict[str, str]) -> tuple[list[dict], bool]:
    """Each entry may be `{"document_id": ..., "status": ...}` (the current prompt
    schema) or, defensively, a bare string (older/malformed model output) --
    treated as `{"document_id": <string>, "status": "Applicable"}`. Any document_id
    not in valid_policy_ids is dropped as a hallucination. A document whose CURRENT
    KnowledgeBaseStatus isn't "active" is force-marked "Outdated" regardless of what
    the model self-reported -- that's an objective fact, not a judgment call."""
    if not isinstance(raw_refs, list):
        return [], False

    validated: list[dict] = []
    hallucinated = False
    for entry in raw_refs:
        if isinstance(entry, dict):
            document_id = entry.get("document_id")
            status = entry.get("status")
        elif isinstance(entry, str):
            document_id, status = entry, "Applicable"
        else:
            hallucinated = True
            continue

        if not isinstance(document_id, str) or document_id not in valid_policy_ids:
            hallucinated = True
            continue

        if status not in POLICY_APPLICABILITY_STATUSES:
            status = "Applicable"
        if valid_policy_ids[document_id] != "active":
            status = "Outdated"

        validated.append({"document_id": document_id, "status": status})

    return validated, hallucinated


def validate_response(
    raw: dict,
    complaint_text: str,
    valid_categories: dict[str, list[str]],
    valid_department_codes: set[str],
    valid_policy_ids: dict[str, str],
    expected_required_actions: list[str] | None = None,
) -> ValidationResult:
    issues: list[str] = []
    data: dict = {}

    category = raw.get("category")
    if category not in valid_categories:
        issues.append(f"unknown_category:{category!r}")
        category = None
    data["category"] = category

    subcategory = raw.get("subcategory")
    if category is None or subcategory not in valid_categories.get(category, []):
        if subcategory is not None:
            issues.append(f"unknown_subcategory:{subcategory!r}")
        subcategory = None
    data["subcategory"] = subcategory

    primary_issue = raw.get("primary_issue")
    data["primary_issue"] = primary_issue.strip() if isinstance(primary_issue, str) and primary_issue.strip() else None

    secondary_issue = raw.get("secondary_issue")
    data["secondary_issue"] = secondary_issue.strip() if isinstance(secondary_issue, str) and secondary_issue.strip() else None

    sentiment = raw.get("sentiment")
    if sentiment not in VALID_SENTIMENTS:
        issues.append(f"invalid_sentiment:{sentiment!r}")
        sentiment = "Neutral"
    data["sentiment"] = sentiment
    data["sentiment_score"] = _coerce_float(raw.get("sentiment_score"), -1.0, 1.0, 0.0)

    urgency = str(raw.get("urgency", "")).lower()
    if urgency not in VALID_URGENCY:
        issues.append(f"invalid_urgency:{raw.get('urgency')!r}")
        urgency = "low"
    data["urgency"] = urgency

    priority = raw.get("priority")
    if priority not in VALID_PRIORITY:
        issues.append(f"invalid_priority:{priority!r}")
        priority = "P3"
    data["priority"] = priority

    department = raw.get("department")
    if department not in valid_department_codes:
        issues.append(f"unknown_department:{department!r}")
        department = None
    data["department"] = department

    data["escalation_required"] = _coerce_bool(raw.get("escalation_required"), False)
    escalation_level = raw.get("escalation_level")
    data["escalation_level"] = escalation_level if isinstance(escalation_level, int) and 0 <= escalation_level <= 5 else 0

    validated_policies, hallucinated = _validate_policy_references(raw.get("policy_references"), valid_policy_ids)
    if hallucinated:
        issues.append("hallucinated_policy_reference")
    data["policy_references"] = validated_policies

    data["required_actions"] = _coerce_list_of_str(raw.get("required_actions"))
    data["prohibited_actions"] = _coerce_list_of_str(raw.get("prohibited_actions"))

    # Completeness check (SRS Step 28): the ground-truth-matched rule's required_actions
    # are the mandatory steps for this exact category/subcategory/condition -- flag any
    # GenAI silently dropped. This is an addition check, not a rewrite of GenAI's list;
    # it never removes or adds to required_actions itself, only surfaces the gap for a
    # reviewer (see task.md 13.9 for where this shows up in the UI).
    if expected_required_actions:
        present_lower = {a.strip().lower() for a in data["required_actions"]}
        for expected in expected_required_actions:
            if expected.strip().lower() not in present_lower:
                issues.append(f"missing_required_action:{expected!r}")
    data["refund_eligible"] = _coerce_bool(raw.get("refund_eligible"), False)
    data["compensation_eligible"] = _coerce_bool(raw.get("compensation_eligible"), False)

    suggested_response = raw.get("suggested_response")
    data["suggested_response"] = suggested_response if isinstance(suggested_response, str) else ""
    if data["suggested_response"]:
        for pattern in UNSUPPORTED_PROMISE_PATTERNS:
            if re.search(pattern, data["suggested_response"], re.IGNORECASE):
                issues.append("unsupported_promise_language")
                break

        timeline_match = PROMISED_TIMELINE_PATTERN.search(data["suggested_response"])
        if timeline_match:
            value, unit = float(timeline_match.group(1)), timeline_match.group(2).lower()
            promised_hours = value / 60 if unit == "minute" else (value * 24 if unit == "day" else value)
            if promised_hours < _resolution_hours(priority) * 0.5:
                issues.append("timeline_faster_than_sla")

    confidence = _coerce_float(raw.get("confidence"), 0.0, 1.0, 0.0)
    data["confidence"] = confidence
    if confidence < CONFIDENCE_THRESHOLD:
        issues.append("low_confidence")

    entities = raw.get("entities_extracted")
    data["entities_extracted"] = entities if isinstance(entities, dict) else {}

    clarification_questions = _coerce_list_of_str(raw.get("clarification_questions"))
    data["clarification_questions"] = [q.strip() for q in clarification_questions if q.strip()][:MAX_CLARIFICATION_QUESTIONS]
    if data["clarification_questions"]:
        issues.append("missing_information")

    # Sentiment/urgency cross-check: if the model marked something P0/critical
    # while very negative, verify the ground-truth condition extractor also
    # sees an objective safety/stranded/legal fact -- not just anger. This
    # doesn't override the AI's call (it may have caught something the simple
    # extractor missed), just flags it for a reviewer.
    if data["sentiment"] == "Very Negative" and data["urgency"] == "critical":
        conditions = extract_conditions(complaint_text)
        if not (conditions.has_safety_keywords or conditions.is_stranded or conditions.has_legal_keywords):
            issues.append("unsupported_critical_urgency")

    return ValidationResult(data=data, issues=issues)
