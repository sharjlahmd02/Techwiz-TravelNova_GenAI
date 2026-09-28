"""Lightweight, no-AI gate deciding whether an inbound email is even
complaint-related before it's handed to the real pipeline -- deliberately
separate from and prior to GenAI/ground-truth classification (see the email
complaint flow doc, Step 3). A false negative here just means a real
complaint sits in the "unclassified bucket" for a quick manual check
(Scenario 5), not that it's lost."""

import re

COMPLAINT_KEYWORDS = [
    # Explicit complaint language
    "complaint", "complain", "issue", "problem", "disappointed", "unacceptable",
    "terrible", "awful", "worst", "unhappy", "frustrated", "angry", "upset",
    "poor service", "bad experience", "not satisfied", "dissatisfied",
    # Booking / travel domain
    "flight", "booking", "reservation", "itinerary", "ticket", "boarding",
    "hotel", "room", "check-in", "check-out", "cruise", "tour", "package",
    "car rental", "transfer", "visa", "insurance",
    # Common complaint triggers
    "refund", "cancelled", "canceled", "cancellation", "delay", "delayed",
    "baggage", "luggage", "lost", "damaged", "overcharged", "charged twice",
    "duplicate charge", "no confirmation", "not confirmed", "scam", "fraud",
    "rude", "unprofessional", "misleading", "stranded", "emergency",
]

_KEYWORD_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in COMPLAINT_KEYWORDS) + r")\b", re.IGNORECASE
)


def looks_like_complaint(subject: str, body: str) -> bool:
    text = f"{subject}\n{body}"
    return bool(_KEYWORD_PATTERN.search(text))
