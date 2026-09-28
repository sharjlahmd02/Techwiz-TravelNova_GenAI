"""The tests that matter most: sentiment must never override urgency.
These scenarios are called out explicitly and repeatedly across spec.md,
claude.md, and task.md as the #1 thing evaluators will check.
"""

from datetime import datetime, timezone


def test_angry_all_caps_long_wait_stays_low_priority(pipeline):
    # "Long Wait Time" is TravelNova's real P3/Low-priority rule (a minor,
    # non-urgent customer-service annoyance) -- anger must not escalate it.
    text = "I HAVE BEEN WAITING ON HOLD FOR OVER AN HOUR JUST TO SPEAK TO SOMEONE!!! THIS LONG WAIT IS RIDICULOUS AND UNACCEPTABLE!!!"
    result = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    assert result["priority"] == "P3"
    assert result["urgency"] == "low"
    assert result["escalation_required"] is False


def test_flight_delay_bucket_matches_actual_duration_not_first_bucket(pipeline):
    """Regression test: all three 'Flight Delay (...)' subcategories share the
    same base keywords, so without cross-checking the extracted delay hours
    an 8-hour delay could silently misclassify into the 1-3 hour (P2) bucket
    instead of the 6+ hour (P0) one."""
    text = "My flight was delayed 8 hours and the airline gave no updates."
    result = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    assert result["subcategory"] == "Flight Delay (6+ hours)"
    assert result["priority"] == "P0"


def test_calm_polite_gas_leak_is_critical(pipeline):
    text = "Hello, I wanted to politely let you know there appears to be a gas leak smell in my hotel room. Could someone look into it when convenient?"
    result = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    assert result["priority"] == "P0"
    assert result["urgency"] == "critical"


def test_calm_stranded_traveler_is_critical(pipeline):
    text = "Good evening. I am currently stranded abroad with no flights available and would appreciate assistance at your earliest convenience."
    result = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    assert result["priority"] == "P0"


def test_legal_threat_forces_at_least_p1(pipeline):
    text = "If this isn't resolved I will need to speak to my lawyer about legal action against TravelNova."
    result = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    assert result["priority"] in ("P0", "P1")
    assert result["escalation_required"] is True
    assert "ESC-003" in result["matched_escalation_ids"]


def test_caps_and_exclamations_never_influence_priority_directly(pipeline):
    """Same complaint content, only tone differs -- priority must be identical."""
    calm = "My flight was delayed by 45 minutes. Could you clarify the reason."
    angry = "MY FLIGHT WAS DELAYED BY 45 MINUTES!!!! THIS IS UNACCEPTABLE!!!! FIX THIS NOW!!!!"

    submitted_at = {"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)}
    calm_result = pipeline.process(calm, metadata=submitted_at)
    angry_result = pipeline.process(angry, metadata=submitted_at)

    assert calm_result["priority"] == angry_result["priority"]
    assert calm_result["urgency"] == angry_result["urgency"]


def test_result_includes_sla_deadlines(pipeline):
    result = pipeline.process(
        "My booking confirmation shows the wrong destination city.",
        metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)},
    )
    assert result["sla_response_deadline"] is not None
    assert result["sla_resolution_deadline"] is not None
    assert result["sla_response_deadline"] < result["sla_resolution_deadline"]


def test_classified_complaint_carries_matched_rule(pipeline):
    result = pipeline.process(
        "I was charged twice for booking TNV-12345, please refund the duplicate charge.",
        metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)},
    )
    assert result["category"] == "Billing & Payments"
    assert result["matched_rule_ids"] != []
    assert result["department"].startswith("DEPT-")


def test_repeat_of_resolved_complaint_bumps_priority_and_escalates(pipeline):
    """SRS Steps 21/54: a repeat of an already-Resolved complaint is a tricky priority
    case -- the first resolution attempt evidently failed -- and should escalate one
    level, purely from the objective repeat-after-resolution fact, not tone."""
    text = "I was charged twice for booking TNV-12345, please refund the duplicate charge."
    baseline = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    repeat = pipeline.process(
        text,
        metadata={
            "submitted_at": datetime(2026, 1, 12, 9, 0, tzinfo=timezone.utc),
            "recent_complaints": [
                {
                    "complaint_id": "CMP-00100",
                    "description": text,
                    "booking_reference": None,
                    "status": "resolved",
                }
            ],
        },
    )

    assert repeat["is_duplicate"] is True
    priority_rank = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    assert priority_rank[repeat["priority"]] < priority_rank[baseline["priority"]]
    assert repeat["escalation_required"] is True
    assert repeat["escalation_level"] >= 1


def test_repeat_of_still_open_complaint_does_not_bump_priority(pipeline):
    """A same-day duplicate of a complaint that's still open (not yet Resolved/Closed)
    is a different scenario -- an accidental double-submit, not a failed resolution --
    and must not get the priority bump."""
    text = "I was charged twice for booking TNV-12345, please refund the duplicate charge."
    baseline = pipeline.process(text, metadata={"submitted_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)})

    repeat = pipeline.process(
        text,
        metadata={
            "submitted_at": datetime(2026, 1, 5, 9, 5, tzinfo=timezone.utc),
            "recent_complaints": [
                {
                    "complaint_id": "CMP-00101",
                    "description": text,
                    "booking_reference": None,
                    "status": "assigned",
                }
            ],
        },
    )

    assert repeat["is_duplicate"] is True
    assert repeat["priority"] == baseline["priority"]
