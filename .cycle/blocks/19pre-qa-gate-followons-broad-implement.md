# /broad-implement — QA gate change + Phase-3 follow-on items — 2026-08-28

Operator ask, verbatim scope: "Can hide QA module tab from the sidebar menu
for non-admin non-QA authorized reps for now. /broad-implement follow-on
items." The follow-on items are the four recorded in
`19pre-qa-phase3-broad-implement.md`; three were implemented and one was
deliberately skipped (needs an operator retention decision).

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (1) hide the QA tool from non-admin/non-QA reps
(qaMyReviews gated); follow-ons: (2) Admin editor for QA_SCORECARD_CRITERIA,
(3) scoped agent audio for SHARED reviews, (4) QA recording-detail visual
scenario. SKIPPED: the QaScorecards/QaComments retention tier (operator
decision needed — see FOLLOW-ON ITEMS).
Files modified: web-app/script_core.html, web-app/Code.js,
web-app/qa/script_qa.html, web-app/cn/script_callnotes.html,
web-app/Tests.js, test/client/run.js, test/visual/mock.js,
test/visual/shoot.mjs, CLAUDE.md, .cycle/STATE.md

CHANGES:
Gate | script_core.html | `qaMyReviews` now carries
  `managerOnly: true, also: 'canSeeQa'` like the reviewer tabs, so
  `toolVisibleForUser_` hides the whole QA tool from non-admin/non-QA reps
  — the operator's "for now". The My Reviews machinery ships DORMANT:
  re-opening agent visibility is dropping those two flags from this one
  registry line (the inline comment says so); the employee-gated,
  share-scoped server reads are unchanged either way. QA-14 rewritten in
  place, so a re-opened tab fails CI until the pin is deliberately
  rewritten too.
Criteria editor | Code.js, cn/script_callnotes.html, Tests.js |
  `saveQaScorecardCriteria` — INV-136's 48th admin endpoint (count + name
  machine-checked by F7/F9/GATE-TIER): strict named-error validation
  (key slug, canonical-key duplicate, label bounds; nothing written on any
  reject) over the lenient `qaCriteriaSanitize_` read — a save the
  validator accepts round-trips through the read UNCHANGED; saving the
  exact CONFIG seed DELETES the property (the umsTheme/breaks posture);
  count-only AdminConfigChange audit; returns + `getAdminConfig` ships
  `qaCriteria: {live, seed}`. Client: Admin → Config "QA scorecard
  criteria" card (add/remove/reset rows; post-save re-render from the
  SERVER-resolved list, INV-185 posture) with the rename-orphans-ratings
  warning stated to the operator.
Agent audio | Code.js, qa/script_qa.html, Tests.js | The audio path Phase 3
  deferred. `qaAudioChunkFor_` extracted as the ONE shared Drive byte
  boundary (folder parentage BEFORE bytes, size cap from metadata,
  audio-only, pure slicing); `qaGetAudioChunk` = canSeeQa_ gate + shape +
  delegate; NEW `getMyQaReviewAudioChunk` = employee gate (bare read
  {error} — GATE-SHAPE) + the SAME double scope as getMyQaReviews
  (SharedMs set AND Agent = caller's roster name) resolved READ-ONLY from
  the store BEFORE any Drive access, generic 'Recording not found.' on
  every scope refusal so existence never leaks; unsharing revokes playback
  on the next chunk. Client: My Reviews per-card "Play recording" button →
  seq-guarded chunk loop (INV-156; Blob URL revoked on replace + re-enter)
  → plain audio element; failures never offer a Drive link (agents have no
  folder access). Currently reachable only by QA members/managers because
  of the gate change — dormant by design.
Detail scenario | test/visual/mock.js, shoot.mjs | The standing "detail
  needs chunked audio the mock cannot serve" gap closed: a REAL 1-second
  8 kHz 8-bit WAV (generated tone, so Chromium decodes it and the Phase-2
  waveform renders true shape) served as one qaGetAudioChunk fixture +
  qaListComments/qaListScorecards fixtures (INV-185 shapes) +
  `qa-detail-light-wide` via the post hook — matrix 53→54.
Pins | test/client/run.js 680→682 | NEW QA-15 (criteria editor behavioural
  in a vm + wiring) and QA-16 (agent-audio double scope: SHARED then NAME
  then the Drive delegate, in order; ≥5 generic refusals; no direct
  Drive; the Tests.js read-shape case). REWRITTEN in place: QA-2 (the
  boundary now lives in the shared helper; both callers banned from
  touching Drive directly) and QA-14 (gated tab; the Play button as the
  view's ONLY control, wired to the scoped endpoint). One INV-188
  recurrence caught at write time: the render fn's own comment names
  qaGetAudioChunk as the thing it must not call — QA-14's ban scans the
  comment-STRIPPED body.

TEST RESULTS: pure 682/682, DOM 82/82. 7 mutations / 7 bites:
(A) registry gate undone → QA-14; (B) criteria save gate deleted →
F7 + QA-15; (C) delete-on-reset removed → QA-15; (D) SHARED filter
dropped → QA-16; (E) name scope dropped → QA-16; (F) folder parentage
deleted from the shared boundary → QA-2; (G) the agent player switched to
the reviewer-gated endpoint → QA-14. Editor suite ≈311 test functions,
post-deploy runAllTests still expects 295 (the saveQaScorecardCriteria
omnibus admin case + the getMyQaReviewAudioChunk read-shape case grew IN
PLACE). Regression Scenarios walked: S90 (amended — the 2026-08-28 gate
step, playback + unshare-revokes, the criteria-editor step), S25/S48
registry N/A (keys unchanged), S54/S51 N/A (Admin card additive).

REGRESSION RISKS: The gate change reverts a one-day-old behaviour (agents
briefly saw My Reviews) — deliberate, operator-commanded, documented as a
supersession in the operator entries. The qaGetAudioChunk refactor is
byte-preserving for callers (same request/response shape; the Drive half
moved verbatim into the helper). getAdminConfig gained an additive field.

INVARIANTS AT RISK: INV-196 AMENDED (gate-change paragraph, the audio-path
sentence replaced by the scoped sibling + shared boundary, criteria editor
in (d), Verify line QA-1..16). INV-136 AMENDED (47→48,
saveQaScorecardCriteria named — F7 enforced it before the doc caught up,
exactly as designed). INV-32 held (count-only audit). INV-156 held (player
seq guards). GATE-SHAPE held (bare {error} reads). INV-185 held (detail
fixtures mirror server return blocks; post-save re-render from the
server-resolved list). INV-188 recurrence documented inside QA-14.

NET SCORE: 0 − 0 = 0 (a gate-posture change + capability round; no
production defect existed to fix, none introduced).

OPERATOR ACTIONS / DEPLOY:
- None — no new properties/triggers/migrations; QA_SCORECARD_CRITERIA is
  now Admin-editable in-app | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments →
Edit → Version: New version — ONE deploy still covers the whole pending
set (PR #176/#177 + Part A + QA 1–3 + break editor + beacon + this round).
Post-deploy `runAllTests()` expects 295; walk S90's amended steps.

FOLLOW-ON ITEMS:
- QaScorecards/QaComments retention tier — SKIPPED deliberately: a
  retention window on review records needs an operator decision (the QA
  store is HR-adjacent and currently keep-forever, the HR_DOCS posture;
  choosing a window is a policy call, not a code one).
- Re-opening agent visibility when the operator is ready: drop
  `managerOnly`/`also` from the `qaMyReviews` registry line + rewrite
  QA-14's gate assert (the pin will fail CI until then, by design).
- The waveform/click-to-seek in the My Reviews player (the detail's
  Phase-2 chrome) — the agent player is deliberately a plain audio element
  in v1 of this follow-on.

DOCUMENTATION UPDATES NEEDED: None outstanding — applied in this session:
CLAUDE.md (QA projects paragraph, INV-196 + INV-136 amendments, the
Phase-3 operator entry's behaviour (e) marked SUPERSEDED + the new
2026-08-28 entry, the QA_SCORECARD_CRITERIA property listing, S90,
narrative counts 680→682 / matrix 53→54), .cycle/STATE.md (NEWEST #6 +
Test Command counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
