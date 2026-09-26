from app.services.ground_truth.condition_extractor import extract_conditions
from app.services.ground_truth.escalation_checker import check_escalation


def test_legal_threat_escalates_to_level_3(real_ground_truth_data):
    _, _, escalation_rules = real_ground_truth_data
    text = "I need to call my lawyer about this if you don't fix it."
    conditions = extract_conditions(text)

    result = check_escalation(escalation_rules, text, conditions)

    assert result.required is True
    assert result.level == 3
    assert "ESC-003" in result.matched_rule_ids
    assert result.priority_override == "P1"


def test_safety_concern_escalates_to_p0(real_ground_truth_data):
    _, _, escalation_rules = real_ground_truth_data
    text = "I slipped and got injured near the pool, I need medical attention."
    conditions = extract_conditions(text)

    result = check_escalation(escalation_rules, text, conditions)

    assert result.required is True
    assert result.priority_override == "P0"


def test_no_trigger_for_ordinary_complaint(real_ground_truth_data):
    _, _, escalation_rules = real_ground_truth_data
    text = "My flight was delayed by 30 minutes, could you check my booking status."
    conditions = extract_conditions(text)

    result = check_escalation(escalation_rules, text, conditions)

    assert result.required is False
    assert result.level == 0
    assert result.matched_rule_ids == []


def test_diamond_customer_triggers_review(real_ground_truth_data):
    _, _, escalation_rules = real_ground_truth_data
    text = "My hotel room wasn't ready on arrival, quite disappointing."
    conditions = extract_conditions(text)

    result = check_escalation(escalation_rules, text, conditions, metadata={"loyalty_tier": "diamond"})

    assert result.required is True
    assert "ESC-019" in result.matched_rule_ids


def test_highest_level_wins_when_multiple_rules_fire(real_ground_truth_data):
    _, _, escalation_rules = real_ground_truth_data
    text = "This is a data breach -- my personal information was exposed and I'm also stranded abroad."
    conditions = extract_conditions(text)

    result = check_escalation(escalation_rules, text, conditions)

    assert result.required is True
    assert result.level == 4  # ESC-002 (data breach) outranks ESC-004 (stranded, level 2)
