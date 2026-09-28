from app.services.email_intake.keyword_filter import looks_like_complaint


def test_clear_complaint_matches():
    assert looks_like_complaint(
        "Refund request",
        "My flight to Dubai (Booking BK-4821) was cancelled 10 days ago and I still haven't received my refund.",
    )


def test_missing_details_still_matches_on_domain_word():
    assert looks_like_complaint("", "The hotel in Murree was terrible.")


def test_unrelated_question_does_not_match():
    assert not looks_like_complaint("Umrah packages", "Do you offer Umrah packages for December?")


def test_case_insensitive():
    assert looks_like_complaint("REFUND", "MY BAGGAGE WAS LOST")


def test_empty_text_does_not_match():
    assert not looks_like_complaint("", "")
