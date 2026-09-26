"""SLA deadline calculation. Priority response/resolution targets come from
data/organization.json's priority_levels. Loyalty-tier speed-ups per
claude.md (Platinum 50% faster, Gold 25% faster); Diamond isn't specified
there, so it's extended to 60% faster (it sits above Platinum in
organization.json's loyalty_tiers point thresholds) -- flag this assumption
if TravelNova specifies otherwise.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

# (response_hours, resolution_value, resolution_unit) -- resolution_unit is "hours" or "business_days"
PRIORITY_SLA: dict[str, tuple[float, float, str]] = {
    "P0": (1, 4, "hours"),
    "P1": (4, 24, "hours"),
    "P2": (12, 3, "business_days"),
    "P3": (24, 7, "business_days"),
}

TIER_MULTIPLIER: dict[str, float] = {
    "diamond": 0.4,
    "platinum": 0.5,
    "gold": 0.75,
    "silver": 1.0,
}


@dataclass
class SLAResult:
    response_deadline: datetime
    resolution_deadline: datetime


def _add_business_days(start: datetime, days: float) -> datetime:
    whole_days = max(1, math.ceil(days))
    current = start
    added = 0
    while added < whole_days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Monday=0 ... Friday=4
            added += 1
    return current


def calculate_sla(priority: str, loyalty_tier: str | None, submitted_at: datetime) -> SLAResult:
    response_hours, resolution_value, resolution_unit = PRIORITY_SLA[priority]
    multiplier = TIER_MULTIPLIER.get((loyalty_tier or "").lower(), 1.0)

    response_deadline = submitted_at + timedelta(hours=response_hours * multiplier)

    if resolution_unit == "hours":
        resolution_deadline = submitted_at + timedelta(hours=resolution_value * multiplier)
    else:
        resolution_deadline = _add_business_days(submitted_at, resolution_value * multiplier)

    return SLAResult(response_deadline=response_deadline, resolution_deadline=resolution_deadline)
