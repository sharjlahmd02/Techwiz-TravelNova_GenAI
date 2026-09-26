"""Checks a complaint against TravelNova's 38 mandatory escalation rules
(data/rules/escalation_rules.json). Each rule gets its own small detector,
authored from its trigger_condition text -- some are pure keyword checks,
others need structured signals (amounts, delay hours, loyalty tier, or
complaint-history facts the orchestrator supplies via `metadata`).

Two rules are intentionally never triggered here:
  - ESC-013 (SLA breach exceeding 48 hours) is relative ("current+1") and only
    meaningful for a complaint that has been open a while -- that belongs to
    the periodic SLA monitor job (Phase 8), not first-pass classification.
"""

import re
from dataclasses import dataclass, field

from app.services.ground_truth.condition_extractor import Conditions

PRIORITY_RANK = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}

KEYWORD_TRIGGERS: dict[str, list[str]] = {
    "ESC-002": [
        "data breach", "hacked", "leaked my", "personal information exposed", "identity theft",
        "personal details", "passport number", "visible on the public", "publicly visible",
    ],
    "ESC-007": ["medical emergency", "hospital", "ambulance", "unconscious", "need medical attention", "medical attention"],
    "ESC-008": ["fraud", "fraudulent", "unauthorized transaction", "unauthorized charge", "stolen card"],
    "ESC-009": ["regulator", "government inquiry", "consumer protection agency", "ombudsman", "filed a complaint with"],
    "ESC-011": [
        "my child", "my son", "my daughter", "minor child", "child safety", "children unsupervised",
        "child was separated", "separated from their family", "child alone", "unaccompanied minor",
    ],
    "ESC-012": ["discriminat", "racist", "racism", "refused service because of my"],
    "ESC-014": ["executive", "vice president", "corporate office", "partner airline manager"],
    "ESC-016": ["kill myself", "suicide", "end my life", "self-harm", "hurt myself"],
    "ESC-017": ["pest", "infestation", "cockroach", "bed bugs", "rats in the room", "insects in the room"],
    "ESC-020": ["denied boarding", "bumped from the flight", "overbook"],
    "ESC-021": ["force majeure", "natural disaster", "pandemic", "act of god"],
    "ESC-022": ["wheelchair", "accessib", "disab", "mobility assistance", "hearing impaired", "visually impaired"],
    "ESC-024": ["agent told me", "misinformed", "incorrect information from your agent"],
    "ESC-025": ["harass", "stalked", "inappropriate advances"],
    "ESC-026": ["system error", "website crashed", "booking disappeared", "lost my booking"],
    "ESC-027": ["terroris", "political instability", "civil unrest", "war zone", "conflict zone"],
    "ESC-028": ["account hacked", "unauthorized booking", "account compromised"],
    "ESC-030": ["many other customers", "systemic", "widespread issue", "everyone i know who booked"],
    "ESC-032": ["currency display", "wrong currency", "currency conversion error"],
    "ESC-034": ["shared my data", "without my consent", "sold my information", "shared with third part"],
    "ESC-035": ["points stolen", "fraudulent points", "unauthorized redemption of my points"],
    "ESC-036": ["unsafe conditions", "exposed wiring", "no smoke detector", "structurally unsound"],
}


def _is_flight_context(text: str) -> bool:
    return "flight" in text or "airline" in text


def _package_issue_count(text: str) -> int:
    phrases = ["didn't show", "never showed up", "never arrived", "was wrong", "cancelled", "not as described"]
    return sum(text.count(p) for p in phrases)


SPECIAL_TRIGGERS: dict = {
    "ESC-001": lambda text, cond, meta: cond.get("has_safety_keywords", False),
    "ESC-003": lambda text, cond, meta: cond.get("has_legal_keywords", False),
    "ESC-004": lambda text, cond, meta: cond.get("is_stranded", False) and ("abroad" in text or "overseas" in text or "stranded" in text),
    "ESC-005": lambda text, cond, meta: (cond.get("max_amount") or 0) > 10000,
    "ESC-006": lambda text, cond, meta: meta.get("prior_open_complaint_count", 0) >= 2,
    "ESC-010": lambda text, cond, meta: (meta.get("channel") == "social_media") and ("viral" in text or bool(re.search(r"\b(\d{5,})\s*followers\b", text))),
    "ESC-013": lambda text, cond, meta: False,  # handled by the periodic SLA monitor, not first-pass intake
    "ESC-015": lambda text, cond, meta: meta.get("same_provider_complaint_count_7d", 0) >= 5,
    "ESC-018": lambda text, cond, meta: (cond.get("group_size") or 0) >= 10,
    "ESC-019": lambda text, cond, meta: meta.get("loyalty_tier") in ("platinum", "diamond"),
    "ESC-023": lambda text, cond, meta: cond.get("has_old_refund_request", False),
    "ESC-029": lambda text, cond, meta: (cond.get("max_delay_hours") or 0) > 6 and _is_flight_context(text),
    "ESC-031": lambda text, cond, meta: "visa" in text and ("denied boarding" in text or "denied entry" in text or "turned away" in text),
    "ESC-033": lambda text, cond, meta: meta.get("is_reopened", False),
    "ESC-037": lambda text, cond, meta: "package" in text and _package_issue_count(text) >= 3,
    "ESC-038": lambda text, cond, meta: (cond.get("max_amount") or 0) > 500 and "compensation" in text,
}


@dataclass
class EscalationResult:
    required: bool = False
    level: int = 0
    matched_rule_ids: list[str] = field(default_factory=list)
    priority_override: str | None = None
    response_time: str | None = None


def check_escalation(rules: list[dict], text: str, conditions: Conditions, metadata: dict | None = None) -> EscalationResult:
    """rules: list of escalation_rules rows as dicts (rule_id, trigger_condition, level,
    relative_level, level_name, priority_override, response_time, is_mandatory)."""
    metadata = metadata or {}
    text_lower = text.lower()

    matched = []
    for rule in rules:
        detector = SPECIAL_TRIGGERS.get(rule["rule_id"])
        if detector is not None:
            fired = detector(text_lower, conditions, metadata)
        else:
            keywords = KEYWORD_TRIGGERS.get(rule["rule_id"], [])
            fired = any(kw in text_lower for kw in keywords)
        if fired:
            matched.append(rule)

    if not matched:
        return EscalationResult()

    levels = [r["level"] for r in matched if r.get("level") is not None]
    level = max(levels) if levels else 0

    overrides = [r["priority_override"] for r in matched if r.get("priority_override")]
    priority_override = min(overrides, key=lambda p: PRIORITY_RANK.get(p, 99)) if overrides else None

    response_times = [r["response_time"] for r in matched if r.get("response_time")]
    response_time = _fastest_response_time(response_times)

    return EscalationResult(
        required=True,
        level=level,
        matched_rule_ids=[r["rule_id"] for r in matched],
        priority_override=priority_override,
        response_time=response_time,
    )


def _fastest_response_time(response_times: list[str]) -> str | None:
    if not response_times:
        return None
    if "immediate" in response_times:
        return "immediate"

    def minutes(rt: str) -> float:
        match = re.match(r"(\d+(?:\.\d+)?)\s*(hour|minute)", rt)
        if not match:
            return float("inf")
        value, unit = match.groups()
        return float(value) * (60 if unit == "hour" else 1)

    return min(response_times, key=minutes)
