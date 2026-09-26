from app.services.ground_truth.keyword_classifier import KeywordClassifier

CATEGORIES = {
    "Flight Problems": ["Flight Delay (3-6 hours)", "Flight Cancellation", "Denied Boarding"],
    "Billing & Payments": ["Duplicate Charge", "Incorrect Charge"],
    "Hotel Complaints": ["Pest Infestation", "Room Quality Below Standard"],
}


def test_classifies_flight_delay():
    classifier = KeywordClassifier(CATEGORIES)
    result = classifier.classify("My flight was delayed 5 hours and nobody told us anything.")
    assert result.category == "Flight Problems"
    assert result.subcategory == "Flight Delay (3-6 hours)"
    assert result.confidence > 0


def test_classifies_duplicate_charge():
    classifier = KeywordClassifier(CATEGORIES)
    result = classifier.classify("I was charged twice for my booking, please refund the duplicate charge.")
    assert result.category == "Billing & Payments"
    assert result.subcategory == "Duplicate Charge"


def test_no_match_returns_none_with_zero_confidence():
    classifier = KeywordClassifier(CATEGORIES)
    result = classifier.classify("asdkj qwoeiu zxcvb")
    assert result.category is None
    assert result.subcategory is None
    assert result.confidence == 0.0


def test_real_categories_classify_sensibly(real_ground_truth_data):
    categories, _, _ = real_ground_truth_data
    classifier = KeywordClassifier(categories)

    result = classifier.classify(
        "My luggage was lost on flight TK903 to Singapore 3 days ago. I have no clothes or toiletries."
    )
    assert result.category == "Luggage & Baggage"

    result = classifier.classify(
        "The room at the hotel looks nothing like the photos. Stained carpets, broken AC."
    )
    assert result.category == "Hotel Complaints"
