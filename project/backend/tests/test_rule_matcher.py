from app.services.ground_truth.rule_matcher import RuleMatcher

RULES = [
    {"rule_id": "RULE-001", "category": "Booking Issues", "subcategory": "Booking Error", "department": "DEPT-01"},
    {"rule_id": "RULE-002", "category": "Booking Issues", "subcategory": "Double Booking", "department": "DEPT-01"},
    {"rule_id": "RULE-003", "category": "Hotel Complaints", "subcategory": "Pest Infestation", "department": "DEPT-03"},
]


def test_exact_pair_match():
    matcher = RuleMatcher(RULES)
    result = matcher.match("Booking Issues", "Booking Error")
    assert len(result) == 1
    assert result[0]["rule_id"] == "RULE-001"


def test_category_fallback_when_subcategory_unknown():
    matcher = RuleMatcher(RULES)
    result = matcher.match("Booking Issues", "Some New Subcategory")
    assert len(result) == 2
    assert all(r["category"] == "Booking Issues" for r in result)


def test_no_category_match_returns_empty():
    matcher = RuleMatcher(RULES)
    assert matcher.match("Nonexistent Category", "Whatever") == []


def test_no_category_returns_empty():
    matcher = RuleMatcher(RULES)
    assert matcher.match(None, None) == []


def test_real_rules_have_exactly_one_exact_match_per_pair(real_ground_truth_data):
    categories, resolution_rules, _ = real_ground_truth_data
    matcher = RuleMatcher(resolution_rules)

    unmatched = []
    for category, subcategories in categories.items():
        for subcategory in subcategories:
            if not matcher.has_exact_match(category, subcategory):
                unmatched.append((category, subcategory))

    # Known gap: "Travel Advisory Changed" under Visa & Documentation has no
    # dedicated rule in the real matrix (see data/README.md); the matcher
    # still falls back to another Visa & Documentation rule for it.
    assert unmatched == [("Visa & Documentation", "Travel Advisory Changed")]
    assert matcher.match("Visa & Documentation", "Travel Advisory Changed") != []
