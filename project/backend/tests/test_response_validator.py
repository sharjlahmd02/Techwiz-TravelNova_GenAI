from app.services.genai.response_validator import validate_response

CATEGORIES = {"Flight Problems": ["Flight Delay (1-3 hours)", "Flight Cancellation"]}
DEPARTMENTS = {"DEPT-02"}
POLICIES = {"FLT-POL-14": "active"}


def _valid_raw(**overrides):
    base = {
        "category": "Flight Problems",
        "subcategory": "Flight Delay (1-3 hours)",
        "sentiment": "Negative",
        "sentiment_score": -0.5,
        "urgency": "medium",
        "priority": "P2",
        "department": "DEPT-02",
        "escalation_required": False,
        "escalation_level": 0,
        "policy_references": [{"document_id": "FLT-POL-14", "status": "Applicable"}],
        "required_actions": ["Apologize"],
        "prohibited_actions": [],
        "refund_eligible": False,
        "compensation_eligible": False,
        "suggested_response": "We're sorry for the delay and will follow up shortly.",
        "confidence": 0.8,
        "entities_extracted": {"booking_reference": "TNV-123"},
    }
    base.update(overrides)
    return base


def test_valid_response_passes_through_cleanly():
    result = validate_response(_valid_raw(), "My flight was delayed 2 hours.", CATEGORIES, DEPARTMENTS, POLICIES)
    assert result.issues == []
    assert result.data["category"] == "Flight Problems"
    assert result.data["priority"] == "P2"


def test_unknown_category_is_stripped():
    result = validate_response(
        _valid_raw(category="Made Up Category"), "text", CATEGORIES, DEPARTMENTS, POLICIES
    )
    assert result.data["category"] is None
    assert any("unknown_category" in i for i in result.issues)


def test_hallucinated_policy_reference_is_removed():
    result = validate_response(
        _valid_raw(
            policy_references=[
                {"document_id": "FLT-POL-14", "status": "Applicable"},
                {"document_id": "FAKE-POL-999", "status": "Applicable"},
            ]
        ),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert result.data["policy_references"] == [{"document_id": "FLT-POL-14", "status": "Applicable"}]
    assert "hallucinated_policy_reference" in result.issues


def test_policy_reference_accepts_bare_string_and_defaults_status():
    result = validate_response(
        _valid_raw(policy_references=["FLT-POL-14"]), "text", CATEGORIES, DEPARTMENTS, POLICIES
    )
    assert result.data["policy_references"] == [{"document_id": "FLT-POL-14", "status": "Applicable"}]
    assert "hallucinated_policy_reference" not in result.issues


def test_non_active_policy_is_forced_outdated_regardless_of_self_reported_status():
    policies = {"FLT-POL-14": "superseded"}
    result = validate_response(
        _valid_raw(policy_references=[{"document_id": "FLT-POL-14", "status": "Applicable"}]),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        policies,
    )
    assert result.data["policy_references"] == [{"document_id": "FLT-POL-14", "status": "Outdated"}]
    assert "hallucinated_policy_reference" not in result.issues


def test_invalid_self_reported_status_defaults_to_applicable():
    result = validate_response(
        _valid_raw(policy_references=[{"document_id": "FLT-POL-14", "status": "Definitely Maybe"}]),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert result.data["policy_references"] == [{"document_id": "FLT-POL-14", "status": "Applicable"}]


def test_invalid_priority_defaults_to_p3():
    result = validate_response(_valid_raw(priority="P9"), "text", CATEGORIES, DEPARTMENTS, POLICIES)
    assert result.data["priority"] == "P3"
    assert any("invalid_priority" in i for i in result.issues)


def test_low_confidence_flagged():
    result = validate_response(_valid_raw(confidence=0.3), "text", CATEGORIES, DEPARTMENTS, POLICIES)
    assert "low_confidence" in result.issues


def test_unsupported_promise_language_flagged():
    result = validate_response(
        _valid_raw(suggested_response="You are guaranteed a full refund immediately!"),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert "unsupported_promise_language" in result.issues


def test_critical_urgency_from_very_negative_sentiment_without_facts_is_flagged():
    result = validate_response(
        _valid_raw(sentiment="Very Negative", urgency="critical", priority="P0"),
        "I am SO ANGRY my flight was 20 minutes late, this is the WORST!!",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert "unsupported_critical_urgency" in result.issues


def test_timeline_promise_much_faster_than_sla_is_flagged():
    result = validate_response(
        _valid_raw(priority="P3", suggested_response="We will resolve this within 1 hour."),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert "timeline_faster_than_sla" in result.issues


def test_timeline_promise_within_sla_not_flagged():
    result = validate_response(
        _valid_raw(priority="P2", suggested_response="We will resolve this within 3 days."),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert "timeline_faster_than_sla" not in result.issues


def test_critical_urgency_with_real_safety_facts_not_flagged():
    result = validate_response(
        _valid_raw(sentiment="Very Negative", urgency="critical", priority="P0"),
        "There is a gas leak in my room, I am scared and need help now!!",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert "unsupported_critical_urgency" not in result.issues


def test_no_clarification_questions_by_default():
    result = validate_response(_valid_raw(), "text", CATEGORIES, DEPARTMENTS, POLICIES)
    assert result.data["clarification_questions"] == []
    assert "missing_information" not in result.issues


def test_clarification_questions_are_kept_and_flagged():
    result = validate_response(
        _valid_raw(clarification_questions=["What is your booking reference?", "  ", "When did this happen?"]),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert result.data["clarification_questions"] == ["What is your booking reference?", "When did this happen?"]
    assert "missing_information" in result.issues


def test_clarification_questions_are_capped():
    result = validate_response(
        _valid_raw(clarification_questions=[f"Question {i}?" for i in range(10)]),
        "text",
        CATEGORIES,
        DEPARTMENTS,
        POLICIES,
    )
    assert len(result.data["clarification_questions"]) == 3
