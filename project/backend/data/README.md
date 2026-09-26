# Data Assets

Drop the pre-built data assets here before running `python -m app.seed`. Expected layout:

```
data/
├── config/
│   ├── categories.json
│   └── departments.json
├── rules/
│   ├── complaint_resolution_rule_matrix.json
│   └── escalation_rules.json
├── policies/
│   └── TN-POL-001.docx ... TN-POL-022.docx
└── complaints/
    └── complaints_dataset.json
```

## `config/categories.json`

Array of categories, each with a nested list of subcategories.

```json
[
  {
    "code": "CAT-01",
    "name": "Booking Issues",
    "description": "Problems with creating or confirming a booking",
    "subcategories": [
      { "code": "SUB-001", "name": "Booking Error", "description": "Wrong dates, names, or details on the booking" },
      { "code": "SUB-002", "name": "Double Booking", "description": "Customer charged/booked twice" }
    ]
  }
]
```

Minimums (per spec.md §11.1): 14 categories, 68 subcategories total.

## `config/departments.json`

```json
[
  { "code": "DEPT-BS", "name": "Booking Support", "description": "..." },
  { "code": "DEPT-BP", "name": "Billing & Payments", "description": "..." }
]
```

Minimum: 10 departments. Names per spec.md §10.5: Booking Support, Billing & Payments, Refunds & Cancellations, Flight Operations, Hotel Services, Car Rental Support, Travel Insurance, Customer Relations, Compliance & Legal, Safety & Emergency.

## `rules/complaint_resolution_rule_matrix.json`

Array of rule objects, one field set per spec.md §7.6:

```json
[
  {
    "rule_id": "RULE-001",
    "category": "Booking Issues",
    "subcategory": "Booking Error",
    "conditions": { "booking_type": "any" },
    "department": "DEPT-BS",
    "urgency": "medium",
    "priority": "P2",
    "policy_id": "TN-POL-001",
    "escalation_required": false,
    "escalation_level": 0,
    "required_actions": ["Verify booking details", "Issue corrected confirmation"],
    "prohibited_actions": ["Cancel without customer consent"],
    "follow_up": "Confirm resolution within 24h",
    "compensation_eligible": false,
    "refund_eligible": false
  }
]
```

`category`/`subcategory` are matched by **name** against `categories.json` (not code). `department` is matched by **code**. Minimum: 105 rules.

## `rules/escalation_rules.json`

```json
[
  {
    "rule_id": "ESC-001",
    "trigger_condition": "Safety keywords detected (stranded, unsafe, medical, gas leak, fire)",
    "level": 5,
    "level_name": "Critical Management",
    "response_time": "15min",
    "is_mandatory": true
  }
]
```

Minimum: 35 rules.

## `policies/*.docx`

22 Word documents named `TN-POL-001.docx` through `TN-POL-022.docx`. The seed script extracts full text via `python-docx` and stores it alongside the file path. The document's title is taken from the first non-empty paragraph (or the filename if the file has no readable heading).

## `complaints/complaints_dataset.json`

Array of raw complaint submissions (matches the customer-facing web form fields in spec.md §3.1.1):

```json
[
  {
    "title": "Flight delayed 5 hours with no communication",
    "description": "My flight EK123 was delayed 5 hours and no one from the airline...",
    "customer_name": "Ahmed Khan",
    "email": "ahmed.khan@example.com",
    "phone": "+923001234567",
    "product_type": "Flight",
    "booking_reference": "BKG-00234",
    "customer_selected_category": "Flight Issues",
    "loyalty_tier": "gold"
  }
]
```

Required: `title`, `description`, `customer_name`, `email`, `product_type`. Optional: `phone`, `booking_reference`, `customer_selected_category`, `loyalty_tier` (`silver`/`gold`/`platinum`). Minimum: 530 records, with the mixes described in spec.md §10.6 (multi-issue, incomplete, urgency traps, prompt injection attempts, duplicates, policy contradictions).

Customers are created/reused by email during seeding (password `customer123` for any new customer created this way — for demo/eval purposes only).
