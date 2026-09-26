"""Parses the raw TravelNova JSON data assets into the plain-dict shapes the
ground-truth pipeline (and the seed script) work with. Pure parsing, no DB --
shared by app/seed.py and the pipeline/tests so the transformation logic
(escalation level name -> int, refund/compensation heuristics, etc.) lives
in exactly one place.
"""

import json
from pathlib import Path

REFUND_KEYWORDS = ("refund",)
COMPENSATION_KEYWORDS = ("compensation", "goodwill", "voucher", "credit")


def _load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _actions_suggest(actions: list[str] | None, keywords: tuple[str, ...]) -> bool:
    if not actions:
        return False
    text_blob = " ".join(actions).lower()
    return any(kw in text_blob for kw in keywords)


def load_organization(data_dir: Path) -> dict:
    return _load_json(data_dir / "organization.json")


def categories_from_org(org: dict) -> dict[str, list[str]]:
    return {c["name"]: list(c["subcategories"]) for c in org.get("complaint_categories", [])}


def departments_from_org(org: dict) -> list[dict]:
    return org.get("departments", [])


def load_escalation_rules(data_dir: Path) -> tuple[list[dict], dict[str, int]]:
    """Returns (rules, level_name_to_int). Each rule dict matches the
    escalation_rules table shape (rule_id, trigger_condition, level,
    relative_level, level_name, priority_override, response_time, is_mandatory)."""
    path = data_dir / "rules" / "escalation_rules.json"
    if not path.exists():
        return [], {}

    data = _load_json(path)
    level_name_to_int = {name: int(num) for num, name in data["escalation_levels"].items()}

    rules = []
    for r in data["rules"]:
        min_level = r["min_level"]
        is_relative = isinstance(min_level, str)
        rules.append(
            {
                "rule_id": r["rule_id"],
                "trigger_condition": r["trigger"],
                "level": None if is_relative else int(min_level),
                "relative_level": min_level if is_relative else None,
                "level_name": None if is_relative else data["escalation_levels"].get(str(min_level)),
                "priority_override": r.get("priority_override"),
                "response_time": r["response_time"],
                "is_mandatory": True,
            }
        )
    return rules, level_name_to_int


def load_resolution_rules(data_dir: Path, level_name_to_int: dict[str, int]) -> list[dict]:
    """Each rule dict matches the resolution_rules table shape."""
    path = data_dir / "rules" / "resolution_rule_matrix.json"
    if not path.exists():
        return []

    data = _load_json(path)
    rules = []
    for r in data["rules"]:
        required_actions = r.get("required_actions")
        escalation_level_name = r.get("escalation_level")
        rules.append(
            {
                "rule_id": r["rule_id"],
                "category": r["category"],
                "subcategory": r["subcategory"],
                "conditions": r.get("conditions"),
                "department": r["department"],
                "supporting_department": r.get("supporting_department"),
                "urgency": r["urgency"],
                "priority": r["priority"],
                "policy_id": r.get("policy_id"),
                "escalation_required": r.get("escalation_required", False),
                "escalation_level": level_name_to_int.get(escalation_level_name, 0) if escalation_level_name else 0,
                "required_actions": required_actions,
                "prohibited_actions": r.get("prohibited_actions"),
                "follow_up": r.get("follow_up", False),
                "follow_up_days": r.get("follow_up_days"),
                "compensation_eligible": _actions_suggest(required_actions, COMPENSATION_KEYWORDS),
                "refund_eligible": _actions_suggest(required_actions, REFUND_KEYWORDS),
            }
        )
    return rules


def load_ground_truth_data(data_dir: Path) -> tuple[dict[str, list[str]], list[dict], list[dict]]:
    """Convenience loader for GroundTruthPipeline: returns (categories, resolution_rules, escalation_rules)."""
    org = load_organization(data_dir)
    categories = categories_from_org(org)
    escalation_rules, level_name_to_int = load_escalation_rules(data_dir)
    resolution_rules = load_resolution_rules(data_dir, level_name_to_int)
    return categories, resolution_rules, escalation_rules
