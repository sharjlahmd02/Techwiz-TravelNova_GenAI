# SupportNova — Test Two: Recent Changes Checklist

Short, focused checklist for what's changed since `guide/test.md` was written. Same app, same
demo accounts (see `guide/test.md` §3), same startup steps (§2). This just covers the newer stuff.

## 1. New complaint channels (Chat / Email / Document upload)

1. Log in as `customer@example.com` → **Submit Complaint**.
2. You'll now see 4 channel cards instead of just a form: **Web Form**, **Chat**, **Email**,
   **Upload a Document**.
3. Try **Chat**: answer the two scripted questions, confirm it drafts a complaint and shows an
   editable review screen before submitting.
4. Try **Email**: fill From/Subject/Message, confirm the draft description doesn't leak a literal
   "Subject:" line.
5. Try **Upload a Document**: drag a `.pdf` or `.docx` onto the dropzone (or click to browse) —
   confirm the border highlights on drag-over, a spinner shows while reading, and it lands on the
   same editable draft screen as the other two.
6. Whichever channel you used, confirm the submitted complaint shows up normally in **My
   Complaints** — channel choice shouldn't change anything downstream.

## 2. Sentiment, entities, and primary/secondary issue (staff views)

1. Submit a complaint with two distinct problems, e.g.:
   > "My hotel room had a broken air conditioner and stained carpet. I complained and was
   > promised a refund but it still hasn't been processed after two weeks."
2. Log in as `manager@travelnova.com`, open the complaint → **Pipeline Results** panel.
3. Under the **GENAI** row (if Gemini isn't quota-exhausted, see `test.md` §4) you should see a
   **Sentiment** badge and **Entities extracted** list.
4. Under *either* pipeline row you should see an **Issue:** line — e.g. "Room Quality Below
   Standard" as primary, with a secondary issue if the second problem's keyword signal was strong
   enough (a single incidental word deliberately won't trigger one — that's by design, not a bug).
5. Open the same complaint as `reviewer@travelnova.com` (if it landed in the conflict queue) —
   confirm the same sentiment/entities/issue info appears above the comparison table, labeled
   "informational only, not a Pipeline 1/2 comparison field."

## 3. Supporting department

1. Submit: *"I made a booking two weeks ago but I still haven't received any confirmation email.
   My booking is not confirmed."*
2. As Manager, open it — under the complaint text you should see a
   **Department: X · Supporting: Y** line (e.g. Booking Support · Supporting: Billing & Finance).
3. If this complaint lands in the Reviewer conflict queue, the primary Department may show "—"
   until a reviewer resolves it — the Supporting department should still be filled in regardless
   (it's ground-truth-only, not part of the conflict).

## 4. Prompt/model/policy traceability

1. Same Manager complaint view as above, scroll to the bottom of each pipeline result block.
2. You should see a small metadata line, e.g.:
   `gemini · gemini-3.8-flash · prompt v1.0 · policy: DEL-POL-04@1.0, HTL-POL-15@1.0`
   or for ground truth: `ground_truth · keyword_classifier+rule_matcher+escalation_checker · policy: ...`
3. This should appear even if GenAI failed (quota exhausted) — the metadata records the attempt,
   not just successes.

## 5. Knowledge base: PDF upload + status lifecycle

1. Log in as `admin@travelnova.com` → **Knowledge Base**.
2. Click **Upload Policy**, pick a `.pdf` file this time (previously DOCX-only) — confirm it
   uploads and appears in the list with status **Active**.
3. Each row's **Status** column is now a dropdown (Active / Previous / Superseded / Draft), not a
   plain Active/Inactive label. Change one doc to **Draft**.
4. Submit a new complaint whose product type matches that doc's title — confirm GenAI's analysis
   no longer cites that document (it's excluded from retrieval once Draft/Superseded, not just
   hidden from the list).

## 6. Logo / branding

1. Landing page, login/register, and both customer and staff sidebars should show the actual
   `logo.png` image (shield + "SupportNova" wordmark), not the old icon-square + text lockup.
2. Sidebar logos should read clearly next to the page heading (e.g. "My Complaints") — not
   noticeably smaller than the heading text.
