"""Validates and sanitizes Gemini's JSON response -- the hallucination guard.
Never trusts the model's output at face value: unknown categories/policy IDs
are stripped, malformed fields get safe defaults, and a few heuristic checks
flag responses worth a human's attention.
"""

import re
from dataclasses import dataclass, field

from app.services.ground_truth.condition_extractor import extract_conditions
from app.services.ground_truth.sla_calculator import PRIORITY_SLA

VALID_SENTIMENTS = {"Positive", "Neutral", "Negative", "Very Negative"}
VALID_URGENCY = {"critical", "high", "medium", "low"}
VALID_PRIORITY = {"P0", "P1", "P2", "P3"}
CONFIDENCE_THRESHOLD = 0.5

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


def validate_response(
    raw: dict,
    complaint_text: str,
    valid_categories: dict[str, list[str]],
    valid_department_codes: set[str],
    valid_policy_ids: set[str],
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

    cited_policies = _coerce_list_of_str(raw.get("policy_references"))
    valid_cited = [p for p in cited_policies if p in valid_policy_ids]
    if len(valid_cited) != len(cited_policies):
        issues.append("hallucinated_policy_reference")
    data["policy_references"] = valid_cited

    data["required_actions"] = _coerce_list_of_str(raw.get("required_actions"))
    data["prohibited_actions"] = _coerce_list_of_str(raw.get("prohibited_actions"))
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
