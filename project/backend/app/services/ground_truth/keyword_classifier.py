"""Pure keyword/regex classifier for the ground-truth pipeline. No AI, no ML model --
just weighted phrase matching against TravelNova's real category/subcategory names
(see data/organization.json) plus a curated keyword list per category.
"""

import re
from dataclasses import dataclass

STOPWORDS = {
    "a", "an", "the", "of", "for", "to", "and", "or", "by", "at", "in", "on",
    "with", "not", "met", "due", "from", "issue", "issues", "problem", "problems",
}

# Matches numeric-range qualifiers like "(1-3 hours)" or "(6+ hours)" that
# subcategory names use to bucket by duration. Plain keyword scoring can't
# tell these apart (they share the same base phrase after stripping the
# parens), so classify() cross-checks this against extracted delay hours.
DURATION_RANGE_PATTERN = re.compile(r"\((\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\+?\s*hours?\)", re.IGNORECASE)
DURATION_RANGE_BONUS = 5


def _duration_range(name: str) -> tuple[float, float] | None:
    match = DURATION_RANGE_PATTERN.search(name)
    if not match:
        return None
    low = float(match.group(1))
    if match.group(2):
        high = float(match.group(2))
    elif "+" in match.group(0):
        high = float("inf")
    else:
        high = low
    return (low, high)

# Curated, domain-grounded keywords per category -- informed by the real complaint
# samples in data/complaints/complaints_dataset.json and each category's meaning.
# Subcategory keywords are derived automatically from their names (see _subcategory_phrases)
# so this only needs enough signal to disambiguate between the 15 categories.
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    # "Booking Issues" and "Flight Problems" deliberately avoid bare "booking" /
    # "flight" -- nearly every complaint mentions a booking or flight number as
    # incidental context (e.g. "Booking TNV-XXXXX"), so those single words are
    # a near-universal false-positive magnet. See data/README.md's evaluation
    # note. Multi-word phrases about the actual defect are required instead.
    "Booking Issues": [
        "confirmation shows", "confirmation for", "wrong dates", "wrong destination",
        "overbooked", "double booking", "booking error", "booking not confirmed",
        "booking modification", "wrong person", "accessibility needs", "wheelchair",
        "travel advisory", "misspelled", "no confirmation email", "haven't received any confirmation",
    ],
    "Flight Problems": [
        "flight delayed", "flight delay", "flight cancelled", "flight cancellation",
        "missed my connection", "missed connection", "denied boarding", "downgraded",
        "stranded passenger", "in-flight", "seat assignment", "connecting flight",
        "delayed by", "delayed", "stuck at", "no meals provided", "tight connection",
    ],
    "Hotel Complaints": [
        "hotel room", "check-in", "check-out", "housekeeping", "front desk",
        "noise complaint", "pest", "infestation", "cockroach", "bed bugs",
        "stained carpet", "broken ac", "hotel overbooking", "dirty sheets",
        "mold", "uncomfortable bed", "smells terrible", "given to someone else",
    ],
    "Billing & Payments": [
        "charged twice", "billed twice", "duplicate charge", "overcharged",
        "invoice", "unauthorized transaction", "currency conversion",
        "hidden fee", "price match", "deceptive pricing", "installment",
        "didn't authorize", "wasn't authorized", "charged me", "on my statement",
        "quoted", "charges of",
    ],
    "Refund Disputes": [
        "refund", "reimbursement", "money back", "refund denied", "travel credit",
        "non-refundable",
    ],
    "Cancellation Issues": [
        "cancellation fee", "free cancellation", "cancelled my booking", "no-show",
        "group cancellation", "hospitalized", "supplier cancellation",
    ],
    "Customer Service Quality": [
        "rude", "hung up", "raised their voice", "interrupted", "long wait",
        "on hold", "misinformed", "unresolved complaint", "broken promise",
        "your agent", "your representative", "rolled their eyes", "sarcastically",
        "dismissive", "no acknowledgment", "nobody resolves", "chat agent",
        "third time", "treated differently",
    ],
    "Technical Issues": [
        "website crashed", "app crash", "app crashes", "payment gateway",
        "account locked", "account hacked", "system error", "booking disappeared",
        "can't access my account", "error message", "500 error", "accessed my account",
        "disappeared from the system", "unlock my account",
    ],
    "Luggage & Baggage": [
        "luggage", "baggage", "suitcase", "lost luggage", "damaged luggage",
        "excess baggage", "pir",
    ],
    "Visa & Documentation": [
        "visa", "passport", "travel document", "denied entry", "name mismatch",
        "name on my passport",
    ],
    "Safety & Security": [
        "injured", "injury", "unsafe", "danger", "assault", "harassment", "fraud",
        "stranded abroad", "medical emergency", "safety incident", "slipped",
        "medical attention", "lawyer", "lawsuit",
    ],
    "Privacy & Data": [
        "data breach", "personal information", "marketing emails", "promotional",
        "unwanted marketing", "sms", "opted out", "shared my data", "my data",
    ],
    "Loyalty Program": [
        "points", "loyalty", "rewards", "tier status", "redemption", "miles",
        "redeem", "loyalty points",
    ],
    "Package & Tour Issues": [
        "tour guide", "package", "itinerary change", "guided tour", "excursion",
        "activity cancellation", "minibus", "private tour",
    ],
    "Transportation & Transfers": [
        "transfer", "shuttle", "car rental", "rental car", "cruise", "taxi",
        "pickup", "airport transfer", "windshield", "cracked",
    ],
}


@dataclass
class ClassificationResult:
    category: str | None
    subcategory: str | None
    confidence: float
    category_score: int
    subcategory_score: int


def _phrase_weight(phrase: str) -> int:
    return 2 if " " in phrase.strip() else 1


def _score_keywords(text_lower: str, phrases: list[str]) -> int:
    score = 0
    for phrase in phrases:
        phrase = phrase.lower().strip()
        if not phrase:
            continue
        if " " in phrase:
            if phrase in text_lower:
                score += _phrase_weight(phrase)
        elif re.search(rf"\b{re.escape(phrase)}\b", text_lower):
            score += _phrase_weight(phrase)
    return score


def _subcategory_phrases(name: str) -> list[str]:
    """Derive matchable phrases from a subcategory name, e.g.
    'Flight Delay (3-6 hours)' -> ['flight delay', 'flight', 'delay']."""
    base = re.sub(r"\(.*?\)", "", name).strip().lower()
    words = [w for w in re.findall(r"[a-z]+", base) if w not in STOPWORDS and len(w) > 2]
    phrases = [base] if " " in base else []
    phrases.extend(words)
    return phrases


def _confidence(score: int) -> float:
    return round(score / (score + 2), 3) if score > 0 else 0.0


class KeywordClassifier:
    """categories: {category_name: [subcategory_name, ...]}"""

    def __init__(self, categories: dict[str, list[str]]):
        self.categories = categories

    def classify(self, text: str, max_delay_hours: float | None = None) -> ClassificationResult:
        text_lower = text.lower()

        category_scores: dict[str, int] = {}
        for category_name in self.categories:
            keywords = CATEGORY_KEYWORDS.get(category_name, [])
            # The category name itself is also a usable phrase.
            keywords = keywords + [category_name]
            category_scores[category_name] = _score_keywords(text_lower, keywords)

        best_category = max(category_scores, key=lambda k: category_scores[k], default=None)
        best_category_score = category_scores.get(best_category, 0) if best_category else 0

        if not best_category or best_category_score == 0:
            return ClassificationResult(None, None, 0.0, 0, 0)

        subcategory_scores: dict[str, int] = {}
        for sub_name in self.categories[best_category]:
            score = _score_keywords(text_lower, _subcategory_phrases(sub_name))
            if max_delay_hours is not None:
                duration_range = _duration_range(sub_name)
                if duration_range and duration_range[0] <= max_delay_hours <= duration_range[1]:
                    score += DURATION_RANGE_BONUS
            subcategory_scores[sub_name] = score

        best_subcategory = max(subcategory_scores, key=lambda k: subcategory_scores[k], default=None)
        best_subcategory_score = subcategory_scores.get(best_subcategory, 0) if best_subcategory else 0
        if best_subcategory_score == 0:
            best_subcategory = None

        combined_confidence = _confidence(best_category_score + best_subcategory_score)

        return ClassificationResult(
            category=best_category,
            subcategory=best_subcategory,
            confidence=combined_confidence,
            category_score=best_category_score,
            subcategory_score=best_subcategory_score,
        )
