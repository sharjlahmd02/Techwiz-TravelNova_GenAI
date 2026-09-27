from app.services.pipeline_comparator import compare_pipelines

BASE = {
    "status": "ok",
    "category": "Flight Problems",
    "subcategory": "Flight Delay (1-3 hours)",
    "priority": "P2",
    "urgency": "medium",
    "department": "DEPT-02",
    "escalation_required": False,
    "escalation_level": 0,
    "refund_eligible": False,
    "compensation_eligible": False,
}


def test_identical_results_have_no_conflict():
    result = compare_pipelines(dict(BASE), dict(BASE))
    assert result.has_conflict is False
    assert result.conflict_severity == "none"
    assert result.final_values == {k: BASE[k] for k in result.final_values}


def test_priority_mismatch_is_critical():
    genai = dict(BASE, priority="P0", urgency="critical")
    result = compare_pipelines(genai, dict(BASE))
    assert result.has_conflict is True
    assert result.conflict_severity == "critical"
    assert "priority" in result.conflict_fields
    assert result.final_values is None


def test_three_plus_non_critical_mismatches_is_major():
    genai = dict(BASE, category="Hotel Complaints", subcategory="Room Quality Below Standard", department="DEPT-03")
    result = compare_pipelines(genai, dict(BASE))
    assert result.conflict_severity == "major"


def test_one_non_critical_mismatch_is_minor():
    genai = dict(BASE, department="DEPT-03")
    result = compare_pipelines(genai, dict(BASE))
    assert result.conflict_severity == "minor"


def test_genai_failure_always_routes_to_review():
    genai_failed = {"status": "failed", "reason": "api_error"}
    result = compare_pipelines(genai_failed, dict(BASE))
    assert result.has_conflict is True
    assert result.conflict_severity == "genai_unavailable"
    assert result.genai_values is None
    assert result.ground_truth_values["priority"] == "P2"
    assert result.verification_score is None


def test_verification_score_is_full_when_pipelines_agree():
    result = compare_pipelines(dict(BASE), dict(BASE))
    assert result.verification_score == 1.0


def test_verification_score_reflects_partial_agreement():
    # 1 of 9 COMPARED_FIELDS differs (department) -> 8/9 agreement.
    genai = dict(BASE, department="DEPT-03")
    result = compare_pipelines(genai, dict(BASE))
    assert result.verification_score == round(8 / 9, 3)
