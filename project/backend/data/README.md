# Data Assets

Real TravelNova data, supplied 2026-09-26. Loaded by `python -m app.seed` (idempotent — safe to re-run).

```
data/
├── organization.json                  # company info, departments, categories, priority/loyalty/protection tiers
├── rules/
│   ├── resolution_rule_matrix.json    # 105 resolution rules
│   └── escalation_rules.json          # 38 mandatory escalation rules
├── policies/
│   └── *.docx                         # 24 policy/SOP documents, e.g. CMP-POL-07_Complaint_Policy.docx
└── complaints/
    └── complaints_dataset.json        # 550 pre-labeled complaint records
```

## `organization.json`

- `departments`: `[{id: "DEPT-01", name, head, agents, handles: [category names]}]` — 10 departments. `id` is the department code used everywhere else (rules, etc).
- `complaint_categories`: `[{name, subcategories: [string, ...]}]` — 15 categories, 106 subcategories total (exceeds the SRS minimums of 10+/20+). No codes are given; the seed script assigns `CAT-NN` / `CAT-NN-SUB-NN` deterministically by list order.
- `priority_levels`, `loyalty_tiers`, `protection_plans`, `company`: reference data, not currently persisted to a table (used informationally / for future features).

## `rules/resolution_rule_matrix.json`

Shape: `{metadata, categories: [...], departments: {...}, rules: [...]}`. Each rule:

```json
{
  "rule_id": "RULE-001",
  "category": "Booking Issues",
  "subcategory": "Booking Error",
  "conditions": ["Incorrect booking details", "Wrong dates/destination"],
  "department": "DEPT-01",
  "supporting_department": "DEPT-04",
  "urgency": "Medium",
  "priority": "P2",
  "policy_id": "CMP-POL-07",
  "escalation_required": false,
  "escalation_level": "Supervisor Review",
  "required_actions": ["..."],
  "prohibited_actions": ["..."],
  "follow_up": true,
  "follow_up_days": 3
}
```

Notes for the seed script / future pipeline logic:
- `conditions` is a list of free-text condition descriptions, not structured key/value pairs — stored as-is in the `conditions` JSONB column.
- `escalation_level` is a **level name** (e.g. `"Supervisor Review"`), resolved to an int 0–5 via `escalation_rules.json`'s `escalation_levels` map before storing.
- `supporting_department` is optional (multi-department routing).
- There is no `compensation_eligible`/`refund_eligible` field in the source. The seed script derives them heuristically by keyword-scanning `required_actions` (`"refund"` → refund eligible; `"compensation"`/`"goodwill"`/`"voucher"`/`"credit"` → compensation eligible). This is a heuristic, not ground truth from TravelNova — revisit if the ground-truth pipeline needs more precision.
- `department`/`supporting_department` values are department **codes** (`DEPT-01` etc.), matching `organization.json`.

## `rules/escalation_rules.json`

Shape: `{metadata, escalation_levels: {"0": "No Escalation", ..., "5": "Critical Management Escalation"}, rules: [...]}`. Each rule:

```json
{
  "rule_id": "ESC-001",
  "trigger": "Safety concern involving physical harm or threat",
  "min_level": 4,
  "priority_override": "P0",
  "response_time": "1 hour"
}
```

One rule (`ESC-013`) has `min_level: "current+1"` — a *relative* escalation (escalate one level above whatever the complaint is currently at), not an absolute level. The `escalation_rules` table models this with `level` (nullable int) + `relative_level` (nullable string) — exactly one of the two is set. All 38 rules are treated as mandatory (the source document is literally titled "Mandatory Escalation Rules").

## `policies/*.docx`

24 files named `<CODE>-<TYPE>-<NN>_<Description>.docx` (e.g. `CMP-POL-07_Complaint_Policy.docx`, `ESC-SOP-08_Escalation_Procedure.docx`). The leading `<CODE>-<TYPE>-<NN>` segment is the `policy_id` referenced by resolution rules and is extracted via regex as the document's `document_id`. Every paragraph 0 is the company name (`"TravelNova Inc."`); the seed script skips it and uses paragraph 1 as the title.

## `complaints/complaints_dataset.json`

Shape: `{total_complaints: 550, complaints: [...]}`. Each record:

```json
{
  "complaint_id": "CMP-00001",
  "title": "Booking Error complaint",
  "description": "I booked a flight to Lisbon but the confirmation shows Barcelona...",
  "category": "Booking Issues",
  "subcategory": "Booking Error",
  "customer_type": "Platinum",
  "product_service": "Cruise",
  "channel": "Web Form",
  "date": "2026-03-23",
  "complaint_type": "standard",
  "order_reference": "TNV-65392",
  "duplicate_group": "TNV-29605"
}
```

Important: **there is no customer name or email anywhere in this dataset.** The seed script synthesizes a deterministic customer per `complaint_id` (`customer.cmp-00001@travelnova-demo.example`, password `customer123`) so re-running the seed is still idempotent and doesn't create duplicate customers.

Field mapping into `complaints`:
- `complaint_id` used directly as our `complaint_id` (already unique, already `CMP-XXXXX`) — after loading, the `complaint_number_seq` Postgres sequence is bumped past the highest number seen, so live submissions afterward continue at `CMP-00551`.
- `category` + `subcategory` → `customer_selected_category` (as `"Booking Issues / Booking Error"`); some records deliberately use `"Various"`/`"Unknown"` for edge-case types (near-duplicate, incomplete).
- `customer_type` → `loyalty_tier` where it matches Silver/Gold/Platinum/Diamond; `New`/`Regular`/`Corporate` map to no loyalty tier (they're not loyalty-program members per `organization.json`).
- `channel` → mapped to the `complaint_channel` enum (extended with `phone`, `social_media`, `mobile_app` to cover the real values — the SRS only anticipated web/chat/email/document).
- `product_service` → `product_type` (free-text column, no enum).
- `order_reference` → `booking_reference`.
- `date` → both `created_at` and `updated_at`, so historical volume charts reflect the dataset's real timeline rather than "today" for every row.
- `complaint_type` (`standard`/`multi_issue`/`near_duplicate`/`prompt_injection`/`contradictory`/`incomplete`/`emotional_low_urgency`/`calm_critical`) and `duplicate_group` are **not persisted** — they're the dataset's own answer key for the edge cases described in spec.md §10.6, useful for us when testing/evaluating the pipelines, not application data.
