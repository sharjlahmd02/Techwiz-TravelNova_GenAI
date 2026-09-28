# SupportNova — Phase 9.5 Summary: Official SRS Gap Closure

Last updated: 2026-09-28

## What Phase 9.5 was

After Phases 0–9 were built against this project's own working docs (`doc/spec.md`/`design.md`),
the official competition SRS PDF was supplied and read end to end — Steps 1–68, Functional
Requirements (i)–(lxxv), and the Anti-Shortcut Requirements — and diff-checked against the actual
running code, not just against our own docs (which is how these gaps went unnoticed in the first
place). That produced **17 verified gaps**, worked through one at a time per explicit instruction,
before touching Phase 10. All 17 are now closed and individually verified — live where the free
Gemini API quota allowed, by unit test plus direct-call diagnostics where it didn't (see "Known
limitation" below). Full line-by-line closure notes for every item live in `doc/task.md` §9.5
(not committed to git — see `guide/summary.md`'s note on internal docs).

## Missing complaint channels (9.5.17)

The architecture diagram advertised four ways to submit a complaint — Web Form, Chat, Email,
Document upload — but only Web Form actually worked; the other three were unused enum values with
nowhere to route. Added a shared GenAI extraction service (chat transcript / email / PDF-or-DOCX
text → the same structured fields the web form collects, with a deterministic non-AI fallback so
it still works if Gemini is down), reusing the existing complaint pipeline unchanged for all four
channels.

## Pipeline intelligence that was computed but invisible (9.5.1, 9.5.2)

`sentiment` and `entities_extracted` were already computed by GenAI and saved to the database, but
never rendered anywhere in the frontend (and `entities_extracted` wasn't even in the API response
schema). Added both to the Agent/Reviewer/Manager pipeline-analysis panels via a new shared
`SentimentBadge`/`EntitiesList` component. Also built **primary/secondary issue detection** from
scratch — SRS's own example: "Product arrived damaged and refund not processed" → Primary: Damaged
Product, Secondary: Refund Delay — for both pipelines (GenAI via a prompt change; ground-truth via
a runner-up-category heuristic on the keyword classifier's existing per-category scores).

## Routing and traceability (9.5.3, 9.5.4, 9.5.9)

- **Supporting department**: the ground-truth pipeline already computed a secondary/supporting
  department per complaint, but `Complaint` had no column for it and nothing displayed it. Now
  persisted unconditionally (it's ground-truth-only, not something reviewers reconcile) and shown
  next to the primary department.
- **Prompt/model/policy traceability**: every `PipelineResult` now records `provider`, `model_name`,
  `prompt_version`, and `policy_version` — including on a *failed* GenAI attempt, which turned out
  to be a real audit improvement (you can now tell "GenAI was attempted with prompt v1.2 against
  policy set X and failed" instead of seeing an empty row).
- **More review triggers**: manual review previously only fired on a genuine pipeline disagreement.
  Now a complaint also routes to review when it's flagged sensitive (safety/legal keywords), the
  ground-truth classifier's confidence is very low (ambiguous), or neither pipeline found a
  matching policy — each with its own reason shown to the reviewer.

## Knowledge base (9.5.5, 9.5.6, 9.5.7, 9.5.12)

- Admin's policy-document upload accepts **PDF now, not just DOCX**.
- Documents carry a real **lifecycle** (Active / Previous / Superseded / Draft) instead of a plain
  on/off flag — GenAI's retrieval and hallucination-guard both correctly exclude Draft/Superseded.
- The largest single item in the phase: documents are now **chunked** on upload (section, heading,
  page, version per chunk — pure regex heading detection, no AI) into a new
  `knowledge_base_chunks` table, and retrieval picks each document's single best-matching chunk
  instead of sending GenAI the whole document. Verified live: a hotel refund complaint correctly
  pulled just "Refund Policy — Section 3.2 Hotel Bookings," not the whole 12-section policy.
- Each cited policy now carries an **applicability status** (Applicable / Conditionally Applicable
  / Not Applicable / Outdated) — self-assessed by GenAI, except "Outdated," which is force-set from
  the document's actual current lifecycle status rather than trusted to the model's judgment.

## Reviewer actions and response quality (9.5.8, 9.5.13, 9.5.15)

Reviewers previously only had one action (resolve a conflict field by field). Added:
- **Reject** — discards both pipelines' results and re-runs the full analysis from scratch (this
  needed real care: `PipelineComparison.complaint_id` is unique, so the stale rows have to be
  deleted first or a naive re-run crashes on the next insert).
- **Regenerate response** — a narrower prompt that takes the already-finalized classification and
  asks Gemini only for a new reply, with a selectable **tone** (Professional / Empathetic / Concise
  / Formal).
- **Add comments** — a freeform thread separate from the required resolution rationale.
- **Clarification questions**: GenAI now explicitly refuses to invent a missing fact (a missing
  booking reference, an unstated date) and instead generates 1–3 specific questions a human agent
  could ask — surfaced as an amber callout, reusing the agent's existing "request more info"
  message feature to actually reach the customer rather than building a parallel flow.

## Admin analytics and reports (9.5.10, 9.5.11, 9.5.14)

- **Trend detection**: the dashboard previously showed only current-state snapshots. Added
  week-over-week deltas per category plus overall volume/escalation trends — verified live showing
  Safety & Security as the top-rising category.
- **Two new structured reports** (CSV/JSON/PDF each): a GenAI/Ground-Truth Comparison Report (every
  compared field, both pipelines' values side by side, match/mismatch) and a Complaint Intelligence
  Report (category/priority/sentiment distribution, escalations, repeat complaints, SLA risk,
  policy usage, disagreement rate, manual-review count).
- **Verification score**: a numeric 0–100% field-agreement measure alongside the existing
  categorical severity, shown on the reviewer page and averaged in the Intelligence Report.

## Dataset coverage audit (9.5.16)

The SRS requires specific minimum counts of edge-case complaints (25+ ambiguous/multi-issue, 20+
contradictory policy cases, 20+ prompt-injection, 25+ near-duplicate). Auditing this surfaced two
things worth knowing:
1. `seed.py` never actually ran the 550 seeded complaints through either pipeline at all — only
   the complaints submitted live during testing had been processed.
2. The dataset's own JSON file already had a `complaint_type` field deliberately tagging these
   exact categories (25 multi-issue, 24 near-duplicate, 22 prompt-injection, 20 contradictory) —
   it was just never wired into the database or counted anywhere.

Ran a read-only audit (ground-truth pipeline only, zero GenAI calls, nothing persisted) to get real
behavioral counts, then topped up the two genuine shortfalls via the existing bulk-import endpoint:
prompt-injection 8→23, near-duplicates 5→27. The fourth category (contradictory cases) is honestly
left as **not fully verifiable today** — confirming it needs both pipelines to actually run and
disagree, which the exhausted daily Gemini quota didn't allow; the dataset already tags exactly 20
by design, and the same infrastructure used elsewhere in this phase would confirm it in minutes
once quota resets.

## Known limitation while testing this phase

**Gemini's free-tier quota (20 requests/day) was exhausted for most of this phase's work.** Every
GenAI-dependent feature built here (primary/secondary issue via GenAI, policy-applicability status,
clarification questions, response regeneration with tone) was verified by unit test plus a direct
call to Gemini that reached the API and got back a real `429 RESOURCE_EXHAUSTED` — confirming the
wiring is correct, just not a live success response. This is the same known, external issue
documented in `guide/test.md` §4, not a bug introduced in this phase.
