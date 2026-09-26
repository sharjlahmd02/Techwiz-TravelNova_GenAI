from datetime import datetime, timezone

from app.services.ground_truth.sla_calculator import calculate_sla


def test_p0_silver_baseline():
    submitted = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)  # Monday
    result = calculate_sla("P0", "silver", submitted)
    assert result.response_deadline == datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc)
    assert result.resolution_deadline == datetime(2026, 1, 5, 13, 0, tzinfo=timezone.utc)


def test_p2_platinum_is_faster_than_baseline():
    submitted = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)  # Monday
    result = calculate_sla("P2", "platinum", submitted)
    # response: 12h * 0.5 = 6h
    assert result.response_deadline == datetime(2026, 1, 5, 15, 0, tzinfo=timezone.utc)
    # resolution: 3 business days * 0.5 = 1.5 -> ceil to 2 business days from Monday -> Wednesday
    assert result.resolution_deadline == datetime(2026, 1, 7, 9, 0, tzinfo=timezone.utc)


def test_p3_no_loyalty_tier_uses_baseline():
    submitted = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)  # Monday
    result = calculate_sla("P3", None, submitted)
    assert result.response_deadline == datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    # 7 business days from Monday -> following Wednesday (skips 2 weekends)
    assert result.resolution_deadline == datetime(2026, 1, 14, 9, 0, tzinfo=timezone.utc)


def test_business_days_skip_weekend():
    submitted = datetime(2026, 1, 9, 9, 0, tzinfo=timezone.utc)  # Friday
    result = calculate_sla("P2", "silver", submitted)
    # 3 business days from Friday -> Mon, Tue, Wed
    assert result.resolution_deadline == datetime(2026, 1, 14, 9, 0, tzinfo=timezone.utc)


def test_diamond_is_fastest_tier():
    submitted = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
    platinum = calculate_sla("P1", "platinum", submitted)
    diamond = calculate_sla("P1", "diamond", submitted)
    assert diamond.resolution_deadline < platinum.resolution_deadline
