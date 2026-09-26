from app.services.ground_truth.condition_extractor import extract_conditions


def test_detects_safety_keywords():
    conditions = extract_conditions("There was a gas leak in my hotel room, I need this handled immediately.")
    assert conditions.has_safety_keywords is True


def test_all_caps_stranded_still_flags_safety_and_stranded():
    conditions = extract_conditions("I AM STRANDED AT THE AIRPORT WITH NO HELP FROM ANYONE!!!")
    assert conditions.is_stranded is True
    assert conditions.caps_ratio > 0.8
    assert conditions.exclamation_count == 3


def test_detects_legal_keywords():
    conditions = extract_conditions("I need to call my lawyer about this if it isn't resolved.")
    assert conditions.has_legal_keywords is True


def test_no_safety_or_legal_keywords_for_minor_complaint():
    conditions = extract_conditions("My flight was delayed 30 minutes, quite annoying honestly.")
    assert conditions.has_safety_keywords is False
    assert conditions.has_legal_keywords is False


def test_extracts_monetary_amount():
    conditions = extract_conditions("I was charged $150.50 twice for the same booking.")
    assert conditions.max_amount == 150.50


def test_extracts_delay_hours():
    conditions = extract_conditions("My flight was delayed 5 hours with no communication.")
    assert conditions.max_delay_hours == 5.0


def test_extracts_group_size():
    conditions = extract_conditions("We are a group of 12 travelers and none of our rooms were ready.")
    assert conditions.group_size == 12
