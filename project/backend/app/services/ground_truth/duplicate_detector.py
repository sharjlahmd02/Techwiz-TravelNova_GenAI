"""Duplicate/near-duplicate detection against a customer's recent complaints.
Pure function -- the orchestrator queries the DB for candidates (same
customer, last 7 days) and passes them in here.
"""

import re
from dataclasses import dataclass

STOPWORDS = {
    "a", "an", "the", "of", "for", "to", "and", "or", "by", "at", "in", "on",
    "with", "i", "my", "me", "is", "was", "it", "this", "that", "please",
}

SIMILARITY_THRESHOLD = 0.7
RESOLVED_STATUSES = {"resolved", "closed"}


@dataclass
class DuplicateResult:
    is_duplicate: bool = False
    duplicate_of: str | None = None
    similarity_score: float = 0.0
    # True when the matched prior complaint was already Resolved/Closed -- i.e. this is a
    # genuine repeat AFTER a resolution attempt, not just two same-day duplicate submissions
    # (SRS Steps 21/54: "repeated complaint after failed resolution" is a tricky priority
    # case that should escalate, unlike a same-day accidental double-submit).
    repeat_after_resolution: bool = False


def _significant_words(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def _jaccard_similarity(a: str, b: str) -> float:
    words_a, words_b = _significant_words(a), _significant_words(b)
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def check_duplicate(
    description: str,
    booking_reference: str | None,
    recent_complaints: list[dict],
) -> DuplicateResult:
    """recent_complaints: [{complaint_id, description, booking_reference, status}, ...] for
    the same customer within the last 7 days."""
    best_score = 0.0
    best_match = None
    best_match_status = None

    for candidate in recent_complaints:
        score = _jaccard_similarity(description, candidate["description"])

        same_booking = bool(booking_reference) and booking_reference == candidate.get("booking_reference")
        if same_booking:
            score = max(score, SIMILARITY_THRESHOLD)

        if score > best_score:
            best_score = score
            best_match = candidate["complaint_id"]
            best_match_status = candidate.get("status")

    is_duplicate = best_score >= SIMILARITY_THRESHOLD
    return DuplicateResult(
        is_duplicate=is_duplicate,
        duplicate_of=best_match if is_duplicate else None,
        similarity_score=round(best_score, 3),
        repeat_after_resolution=is_duplicate and best_match_status in RESOLVED_STATUSES,
    )
