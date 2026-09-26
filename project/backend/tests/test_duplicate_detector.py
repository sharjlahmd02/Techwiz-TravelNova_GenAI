from app.services.ground_truth.duplicate_detector import check_duplicate

RECENT = [
    {
        "complaint_id": "CMP-00100",
        "description": "I haven't received my refund for booking TNV-29605. It's been 2 weeks.",
        "booking_reference": "TNV-29605",
    },
    {
        "complaint_id": "CMP-00050",
        "description": "My hotel room had a broken air conditioner and no hot water.",
        "booking_reference": "TNV-11111",
    },
]


def test_same_booking_reference_flags_duplicate():
    result = check_duplicate(
        "I still haven't received my refund for TNV-29605, please expedite.",
        "TNV-29605",
        RECENT,
    )
    assert result.is_duplicate is True
    assert result.duplicate_of == "CMP-00100"


def test_unrelated_complaint_is_not_duplicate():
    result = check_duplicate(
        "The tour guide never showed up for our excursion in Cairo.",
        "TNV-99999",
        RECENT,
    )
    assert result.is_duplicate is False
    assert result.duplicate_of is None


def test_similar_text_without_booking_match_flags_duplicate():
    result = check_duplicate(
        "My hotel room had a broken air conditioner and no hot water at all.",
        None,
        RECENT,
    )
    assert result.is_duplicate is True
    assert result.duplicate_of == "CMP-00050"


def test_no_recent_complaints_is_not_duplicate():
    result = check_duplicate("Anything at all", "TNV-1", [])
    assert result.is_duplicate is False
