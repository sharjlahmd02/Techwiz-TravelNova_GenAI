"""Extracts objective, structured facts from complaint text via regex and keyword
detection. Used to drive urgency/priority/escalation decisions -- never sentiment.
"""

import re
from dataclasses import dataclass, field

SAFETY_KEYWORDS = [
    "stranded", "unsafe", "emergency", "medical emergency", "medical attention",
    "accident", "gas leak", "fire", "danger", "dangerous", "injured", "injury",
    "assault", "harassment", "slipped", "fell", "hospital", "ambulance",
    "unconscious", "evacuation", "evacuate", "terrorism", "kidnapped",
    "syringe", "needle", "weapon", "loose railing", "locked from outside",
]

LEGAL_KEYWORDS = [
    "lawyer", "attorney", "legal action", "sue", "suing", "lawsuit", "court",
    "consumer protection", "legal counsel", "ombudsman", "regulator", "regulatory",
]

BOOKING_TYPE_KEYWORDS = [
    "non-refundable", "refundable", "economy", "premium economy", "business class",
    "first class",
]

PROFANITY_WORDS = {"damn", "hell", "crap", "shit", "fuck", "ass", "bastard"}

MONEY_PATTERN = re.compile(r"(?:USD|PKR|\$)\s?([\d,]+(?:\.\d+)?)", re.IGNORECASE)
DURATION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(hour|hr|day|minute|min)s?\b", re.IGNORECASE)
GROUP_SIZE_PATTERN = re.compile(r"(?:group of|party of)\s*(\d+)|(\d+)\s*(?:travelers|passengers|people)\b", re.IGNORECASE)
OLD_REFUND_PATTERN = re.compile(
    r"(\d+)\s*months?\s*ago|over a year|more than (?:a|1|one) year|(\d+)\s*years?\s*ago",
    re.IGNORECASE,
)

DURATION_TO_HOURS = {"hour": 1, "hr": 1, "day": 24, "minute": 1 / 60, "min": 1 / 60}


@dataclass
class Conditions:
    amounts: list[float] = field(default_factory=list)
    max_amount: float | None = None
    delay_hours: list[float] = field(default_factory=list)
    max_delay_hours: float | None = None
    booking_types: list[str] = field(default_factory=list)
    has_safety_keywords: bool = False
    has_legal_keywords: bool = False
    is_stranded: bool = False
    group_size: int | None = None
    has_old_refund_request: bool = False
    caps_ratio: float = 0.0
    exclamation_count: int = 0
    profanity_count: int = 0

    def get(self, key, default=None):
        return getattr(self, key, default)


def _caps_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    upper = sum(1 for c in letters if c.isupper())
    return round(upper / len(letters), 3)


def extract_conditions(text: str) -> Conditions:
    text_lower = text.lower()

    amounts = [float(m.replace(",", "")) for m in MONEY_PATTERN.findall(text)]

    delay_hours = []
    for value, unit in DURATION_PATTERN.findall(text):
        delay_hours.append(float(value) * DURATION_TO_HOURS[unit.lower()])

    booking_types = [kw for kw in BOOKING_TYPE_KEYWORDS if kw in text_lower]

    group_size = None
    group_match = GROUP_SIZE_PATTERN.search(text)
    if group_match:
        group_size = int(next(g for g in group_match.groups() if g))

    return Conditions(
        amounts=amounts,
        max_amount=max(amounts) if amounts else None,
        delay_hours=delay_hours,
        max_delay_hours=max(delay_hours) if delay_hours else None,
        booking_types=booking_types,
        has_safety_keywords=any(re.search(rf"\b{re.escape(kw)}\b", text_lower) for kw in SAFETY_KEYWORDS),
        has_legal_keywords=any(re.search(rf"\b{re.escape(kw)}\b", text_lower) for kw in LEGAL_KEYWORDS),
        is_stranded="stranded" in text_lower,
        group_size=group_size,
        has_old_refund_request=bool(OLD_REFUND_PATTERN.search(text_lower)) and "refund" in text_lower,
        caps_ratio=_caps_ratio(text),
        exclamation_count=text.count("!"),
        profanity_count=sum(1 for w in PROFANITY_WORDS if re.search(rf"\b{w}\b", text_lower)),
    )
