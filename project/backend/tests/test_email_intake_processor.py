from app.services.email_intake.processor import COMPLAINT_ID_PATTERN


def test_bracketed_id_in_subject_matches():
    match = COMPLAINT_ID_PATTERN.search("Re: We received your complaint [CMP-1023]")
    assert match is not None
    assert match.group(1) == "CMP-1023"


def test_bare_id_in_subject_matches():
    match = COMPLAINT_ID_PATTERN.search("Re: CMP-1023 - still waiting")
    assert match is not None
    assert match.group(1) == "CMP-1023"


def test_lowercase_id_matches_case_insensitively():
    match = COMPLAINT_ID_PATTERN.search("re: [cmp-1023]")
    assert match is not None
    assert match.group(1).upper() == "CMP-1023"


def test_no_id_in_subject_does_not_match():
    assert COMPLAINT_ID_PATTERN.search("Do you offer Umrah packages for December?") is None
