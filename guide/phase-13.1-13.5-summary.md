# SupportNova — Phase 13 (13.1–13.5) Summary & Test Guide

Last updated: 2026-09-28

## What this covers

Phase 13 is a second gap-analysis pass against the official SRS, this time against
`doc/Development Phase of the Application.md` (Steps 1–68 + the dataset Hint + Hidden Evaluation
Dataset section). Most of its 68 steps were already covered by Phase 9.5; this phase captures the
remaining genuine gaps, filtered for what's actually relevant to a travel company (e.g. Step 30's
"Replacement Eligibility" for physical products was excluded — a flight booking isn't "replaced").

12 gaps were identified in total (`doc/task.md` §Phase 13). This guide covers the first five —
**13.1 through 13.5** — which are implemented, tested, and committed. 13.6–13.12 are documented but
not yet started.

Both dev servers were left running after verification (frontend `:5174`, backend `:8000`), so you
can test 13.1/13.2/13.4 immediately without restarting anything.

---

## 13.1 — Knowledge base document expiry dates

**Where:** Admin → Knowledge Base

**What changed:** `KnowledgeBaseDocument` now has an `expiry_date` field. An Active document past
its expiry is excluded from new GenAI policy retrieval, and if it's ever cited anyway, it's
force-marked "Outdated" (same treatment as a Superseded doc) instead of flagged as a hallucination.

**How to test it:**
1. Open any policy doc's row — there's a new "Expiry" date input.
2. Set a date within the next 30 days → an amber **"Expires in Nd"** badge appears.
3. Set a date in the past → a red **"Expired"** badge appears.
4. Clear the date field → badge disappears, saved as `null`.

---

## 13.2 — Previous complaint reference + preferred contact channel

**Where:** Customer → Submit Complaint → any of the 4 channels (Web Form, Chat, Email, Document) →
the review step before final submit

**What changed:** `ComplaintCreate` accepts an optional `previous_complaint_reference` (resolved
server-side to a FK, distinct from the system's own duplicate detection) and
`preferred_contact_channel` (Email/Phone/SMS). Wired into all four submission channels via a shared
review-step component.

**How to test it:**
1. Log in as a customer with existing complaint history.
2. Start a new complaint via any channel and reach the review step.
3. Two new optional dropdowns appear: **"Related to an earlier complaint?"** (populated from your own
   complaint history) and **"Preferred contact method"**.
4. Pick both, submit, then open the new complaint's detail page — you'll see
   **"Preferred contact: [your choice]"** listed.

---

## 13.3 — Location entity extraction

**Where:** Agent/Manager/Reviewer complaint detail → "Entities extracted" under GenAI's Pipeline
Results

**What changed:** GenAI's `entities_extracted` schema gained a `locations` field (departure/
destination cities, airports, hotels). Prompt version bumped 1.2 → 1.3.

**How to test it:** ⚠️ Needs a **live Gemini call** to populate — our free-tier quota (20/day) is
currently exhausted, so this won't show up until quota resets or you use a working key. Once GenAI
succeeds on a complaint mentioning a place ("delayed flight from Karachi to Dubai"), a new
**"Locations: Karachi, Dubai"** line appears alongside Booking ref / Amounts / Flight # / Names /
Dates.

---

## 13.4 — Repeat-complaint priority escalation

**Where:** Ground Truth panel on a new complaint's Pipeline Results

**What changed:** A complaint matching an already-**Resolved/Closed** prior complaint (from the same
customer) now bumps priority one level and forces `escalation_required = true` in the ground-truth
pipeline — purely from the objective repeat-after-resolution fact, never from tone (Golden Rule 2 is
preserved). A same-day duplicate of a still-*open* complaint does **not** get this bump.

**How to test it:**
1. As a customer, find one of your own complaints marked **Resolved**.
2. Submit a *new* complaint with very similar wording (close to the same text/issue).
3. Open the new complaint in Manager/Agent view — the Ground Truth panel's priority should be one
   level higher than a first-time submission of that text would normally get, and escalation should
   be required.

---

## 13.5 — Missing required-action detection

**Where:** ⚠️ Not visible in any UI yet — internal only for now

**What changed:** `response_validator.validate_response()` cross-checks GenAI's `required_actions`
against the ground-truth-matched resolution rule's `required_actions` and flags any GenAI silently
dropped (`missing_required_action:'<action>'`). Additive only — never rewrites GenAI's own output.

**How to test it:** Only testable via the backend test suite right now, since surfacing this in the
UI is a separate item (13.9, not yet built):
```bash
cd project/backend
./venv/Scripts/python -m pytest tests/test_response_validator.py -v
```
Look for `test_missing_required_action_is_flagged` and its three siblings.

---

## Verification notes

- Backend: 75 tests passing, 2 skipped (the pre-existing Gemini-quota-dependent skips), throughout
  all five items.
- Frontend: `tsc -b && vite build` clean throughout.
- Each item was committed individually (5 commits) with `[SRS 13.N]`-style messages.
- 13.1, 13.2, 13.4, and 13.5's backend wiring were all verified **live** against real data (real DB
  writes, a real customer submission flow, a real resolution rule) rather than assumed from the code
  alone. 13.3 could only be confirmed via a direct schema/validator check plus a manual DB write to
  prove the UI renders it correctly, since Gemini's quota was exhausted for the entire phase.

## What's next (documented, not started)

`doc/task.md` §Phase 13 also lists 13.6 (follow-up scheduling), 13.7 (agent-facing complaint
summary), 13.8 (surfacing `required_actions`/`prohibited_actions` in the UI), 13.9 (persisting and
surfacing GenAI validation issues, including 13.5's new check), 13.10 (customer-visible department
name), 13.11 (admin department-distribution + resolution-time analytics), and 13.12 (search/filter by
sentiment/category/escalation status) — all gap-analyzed and ready to pick up on request.
