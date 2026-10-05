---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Batch 15 (operator decision 2026-10-05): editor-suite (Tests.js) cases for the server rules added in Batches 10–14.
  - Each batch's own block listed these as owed.
  - The Node harness pinned each rule, but nothing in the deployed suite exercised them, so a drift between the harness's view of a function and the deployed code would only show in the browser.

Files modified:
- web-app/Tests.js (11 new cases and their registrations; one helper-free)
- test/client/run.js (one pin that registers and RUNS the smoke cases)
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: M (~5 h) — Batch 15, written before the first edit
Actual: ~1.5 h

CHANGES:
B15 | Tests.js | Nine SMOKE cases (pure — no sheet writes, so they run on prod too):
  - `c23_intakeNeuroDxByToken` (INT-1): negations and uncertainty are not a diagnosis, including an uncertainty phrase with no leading negation; the multi-select keeps only diagnoses.
  - `c23_intakeSeatKindsNegation` (INT2-1): "Not solid" / "Sling (no solid)" are not solid; "Captain's" is a captain seat.
  - `c23_intakeWeightUnitsAndBounds` (INT2-2 + Batch 11):
    - kg converts; a height is not a weight; a range reads its first number; the unit wins;
    - under 20 or over 1000 lbs is unreadable and named; the bound itself is readable; no number is unreadable.
  - `c23_orgEmailAndExternalIntakeConfirm` (CORE-05 + INT-3):
    - exact, case-insensitive org domains; look-alike prefixes and suffixes are refused;
    - an outside recipient is refused with its domain named, and passes only once that same domain is confirmed.
  - `c23_kbAiFacetCountsCarryNoValue` (KB-2): the audit line carries counts, never a facet value.
  - `c23_dashboardAlignToData` (MET-5 follow-up): pending, imported, and no-data-day cases.
  - `c23_trainQuizLockout` (TRN-1): the limit and wait constants; three fails lock from the last attempt; a fresh set opens after the wait; a pass resets the count.
  - `c23_kbImageItemContentKey` (DRV-3): a content key of the image charset; the same bytes give the same key; SVG and oversize are refused.
  - `c23_spanishEpisodesAndCourtesy` (SP-2 + follow-up):
    - a follow-up reopens with the reply as its floor; a click closes only what was open at its stamp; the first close wins; the claim floor;
    - courtesy versus a question, a number, or an empty new text.
B15 | Tests.js | Two Integration B cases (store-backed):
  - `c23_timesheetRangeReader` (TC2-9): TEST punches on an old date read back through `timesheetRowsInRange_`:
    - filtered by `keep`, each once, with no archive failure;
    - the same rows when handed `liveValues`;
    - the reach is a string;
    - `buildTimesheetForEmployee_` reads the 8-hour day with no `archiveError`;
    - `_clearTestState` runs in finally.
  - `c23_kbImagesStoreAndRead` (DRV-3), on the KB FIXTURE (`_withTestKb_`), since the tab is append-only:
    - a store, then the same bytes again reused;
    - an employee reads the image back whole as a data URL;
    - an unknown well-formed key is `missing`, not `failed`.
B15 | test/client/run.js | New pin "Batch 15":
  - The nine are in the SMOKE shard and the two are in Integration B.
  - The fixture and cleanup discipline holds.
  - It RUNS the nine smoke cases in a vm against the real server functions, the real constants and the real Tests.js assertions (`_describe_`/`_assertEq`/…). A case that cannot pass is caught before the operator's first editor run.

TEST RESULTS: passed.
- Node: 1227/1227 (was 1226).
- DOM: 219/219.
- lint:server clean (it covers Tests.js: no undeclared names in the new cases). counts --check agrees: editor registrations 340 → 351.
- 12 bite-checks against the Node runner, all BITE:
  - seat negation, the weight bounds, an org substring match, the quiz pass-reset, the courtesy "?", an AI facet value leak;
  - an unregistered case, the dashboard data-day anchor, the episodes' manual stamp, case-sensitive image type;
  - the neuro uncertainty phrase.
  - The neuro bite first read NO BITE: "Not sure" is also caught by its leading "not", so the phrase rule was untested. A case only the phrase rule catches was added (g116: a case that fails two guards proves neither).
- The two Integration B cases cannot run outside the Apps Script editor. They were checked by reading every call they make against the server code. They run on the DEV nightly (`runNightlySelfTest`) or a manual `runAllTestsPartB`.
Regression Scenarios: NOT APPLICABLE — only the editor suite and the Node harness changed; no app path.
REGRESSION RISKS:
- **The image case appends a row to the KB FIXTURE's KbImages tab on its first run.** It reuses that row on every later run (append-only, keyed by content), so the fixture grows by one row ever.
- **The reader case leaves TEST rows only until its finally.** A killed execution leaves two TEST_ punch rows, which the existing `cleanupTestData` TEST_ sweep removes.
INVARIANTS AT RISK: None.
- g143: every new `test_` function opens with `_assertSuiteCaller_()`, so the owner gate holds.
- INV-179 / S4: one shard each, no duplicate names, no function defined twice (g08).
- g119: KB writes go only to the fixture.
- F1 ratchet: no new row deletes outside the existing helpers.
NET SCORE: 0 − 0 = 0. No production defect is fixed; this is test coverage (defensive). No new failure mode.

OPERATOR ACTIONS / DEPLOY:
- After the push, run `runSmokeTests` on prod (the nine new cases are pure). Let the DEV nightly (or a manual `runAllTestsPartB` on DEV) run the two Integration B cases, and read its `Expected:` line (351). | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (Tests.js is pushed with the project); no New version needed for the editor suite.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Rules from Batches 10–14 still without an editor case. Each needs a send, a Gmail thread or a gate-property write, so each is an integration case with a backstop (g132):
  - CN-3 (the "Other" recipient domain on the audit row);
  - INT-2 (a superseded amend refused);
  - CORE-04 (a cleared department map);
  - the Spanish pending/resolved readers (Gmail).
- The smoke runner in Node covers only the pure cases; the two Integration B cases are verified by reading.

DOCUMENTATION UPDATES NEEDED:
- docs/test-harness-log.md: the Batch 15 entry, including the new "run the editor smoke cases in Node" pattern.
- .cycle/config.md: optionally an INV that a pure editor case is RUN by the Node harness (the pattern this batch adds).
- CLAUDE.md: none beyond the generated block (already updated).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
