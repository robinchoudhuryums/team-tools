# Cycle State

## Current
Cycle: 20 — OPEN (the /broad-scan of 2026-09-17 opened it; cycle 19's whole
block moved to `.cycle/HISTORY.md` at that point, per the close-out procedure —
**with cycle 19's `/reflect` still OWED; it reads the archived block**).
Phase: implement — Batches 1, 2 and 3 of the scan's IMPLEMENTATION BATCH PLAN are
DONE (`.cycle/blocks/20-batch1-broad-implement.md`, net 5 − 0 = 5;
`.cycle/blocks/20-batch2-broad-implement.md`, net 6 − 0 = 6;
`.cycle/blocks/20-batch3-broad-implement.md`, net 4 − 0 = 4); Batches 4–7 are
in `.cycle/blocks/20-scan-batch-plan.md`. NOT DEPLOYED: everything since Batch 1
is live only after `clasp push -f` + a New version.
Scope: broad
Test Command: manual
Estimates: **Batch 3 (F-07 one null-band tone rule · F-08 standardSource rendered + the residual 85 · F-09 holiday source surfaced · F-35 ambient badge uses the previous workday · F-32 cdrAnswerPct_ null on no denominator · F-38 "Company holiday" copy) — M (~6 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** · **Batch 2 (F-06 dept-config cached empty · F-13 dashboard carousels "No call data" on failure · F-18 Sent detail blank→"No" · F-15 geocoder failure reads as a bad address · F-47 pending tasks DQE failure = 0 missing · F-41 coverage strip blank on failure · F-25 KB count helpers {} on failure · F-45 KB feedback "Thanks" before the RPC) — M (~7 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** · **Batch 1 (F-01 OOP verify column-A · F-03 the 24-hour equal-minute day · F-02 the two unclosable modals · F-04 eligibility column-A · F-05 Day Edit Save during prefill · F-44 undefined `text`) — M (~7.5 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** The scan's own estimates for the remaining batches, as written at scan time: B2 — ~7 h · B3 — ~6 h · B4 — ~7 h · B5 — ~6 h · B6 — ~6 h · B7 — ~4.5 h.
Subsystem cycles since last Seams audit: 4 — **the every-4 cadence was met at 19-d;
the next `/audit` should be a Seams & Invariants audit** (carried forward; the
2026-09-17 /broad-scan was a broad scan, not the seams round).
Updated: 2026-09-17

## In progress (facts to carry forward — NOT judgments)
- The 2026-09-17 /broad-scan ran with eight parallel readers + the mandatory
  visual stage (102/102 rendered, no missing fixtures, no page overflow;
  a11y-names and print-check clean). Fifty-three findings, none Critical, three
  High — all three re-verified by me, two by execution (F-02 reproduced in
  jsdom; F-03 by running `calcHours_`).
- Batches 1 and 2 are committed on `claude/festive-noether-unougu` (67cbe2d,
  263a0fe, 22342f8 + this checkpoint) and NOT merged, NOT deployed.
- The next concrete step: merge, push, New version; then walk S112 FIRST (OOP — renumbered from the duplicate S110; the
  composer send and the by-name eligibility check both failed before Batch 1),
  then S7's two new Day Edit steps, then run the sheet doctor once for any
  equal-minute day that was paying 24 h.

## Completed this cycle
- F-01 | web-app/70_kb.js | oopVerifyQuotes_ keys the live sheet by oopNameCol_, not column A
- F-04 | web-app/70_kb.js | oopMatchScore_ is the one scorer for searchOopPricing AND checkOopEligibility; diagnostics name the item
- F-03 | web-app/20_timeclock.js, web-app/00_config.js | calcHours_ wraps on strict `<`; managerClockOrderError_ in both manager writers; the doctor compares in minutes
- F-02 | web-app/cn/script_callnotes.html | the sched + scratchpad close hooks remove their overlay
- F-05 | web-app/tc/script_manager.html | Day Edit Save disabled until the prefill lands
- F-44 | web-app/intake/script_intake.html | the default control branch reads ariaLabel
- pins | web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js | registrations 336 → 337; pure 865 → 867; DOM 121 → 122; seven bite-checks bite
- F-06 | web-app/cn/script_callnotes.html | a failed dept-config fetch is not cached as an empty config
- F-13 | web-app/tc/script_clock.html | dashboard carousels render a failed read as the warn card, never "No call data"
- F-18 | web-app/intake/script_intake.html | Sent detail: an untouched toggle is blank, only FALSE is No
- F-15 | web-app/70_kb.js | geocoder service failure is `{unavailable, status}` + kbGeocodeUnavailableMsg_; both callers and the cache honour it
- F-47 | web-app/40_metrics.js, web-app/20_timeclock.js | getMyMetrics ships cdrUnavailable; pending tasks treat it as unavailable
- F-41 | web-app/tc/script_clock.html | coverage strip renders "coverage unavailable" on a failed read
- F-25 | web-app/70_kb.js, web-app/kb/script_kb.html | the four KB count helpers return {map, unavailable}; both endpoints and the landing name the failed reads
- F-45 | web-app/kb/script_kb.html | feedback bar thanks only after the server records it
- pins (Batch 2) | test/client/run.js, test/client/dom/runDom.js | pure 867 → 871; DOM 122 → 126; eight bite-checks bite
- F-07 | web-app/script_core.html, web-app/metrics/script_metrics.html, web-app/tc/script_clock.html | mtAnswerBand_ is the ONE null-band rule (no band → no amber tier) on the table AND the Clock card
- F-08 | web-app/metrics/script_metrics.html, web-app/10_core.js, web-app/cn/script_callnotes.html | standardSource rendered on both heroes (mStandardSourceHtml_); the badge tooltip's `|| 85` gone; cdrStandardProbe_ on the CDR Storage Health row + cnStandardFindings_
- F-09 | web-app/10_core.js, web-app/cn/script_callnotes.html | cdrHolidayProbe_ on the same row + cnHolidayFindings_ (the federal fallback itself unchanged — deferred)
- F-35 | web-app/40_metrics.js | getMetricsAmbient judges prevWorkdayIso_(todayMgr)
- F-32 | web-app/40_metrics.js, web-app/metrics/script_metrics.html, web-app/Tests.js | cdrAnswerPct_ null on no denominator; heroes + table dash it
- F-38 | web-app/tc/script_manager.html, web-app/tc/script_timeoff.html | "Company holiday" copy at the six sites
- pins (Batch 3) | test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json | pure 871 → 878; ten bite-checks bite; manifest 1286

## Pending / not yet done
- Batches 4–7 of `.cycle/blocks/20-scan-batch-plan.md` (the operator chooses).
- `/sync-docs` after Batch 3 — its block lists the edits (S110/S111 expected text, g123/g124, the two operator-state entries, modules.md, the log entries).
- **OPERATOR — still owed from cycle 19's post-deploy walk** (archived in HISTORY.md, "Where I left off"): step 2 (the editor lists FOURTEEN server files, no `Code.js`), step 5 (Manage → Admin → OOP pricing diagnostics: `nameCol` = `Item`, `nameByHeader: true`, three price columns, the first `OOP Price – pick-up`; unknown eligibility values now named by ITEM), step 6 (`previewPtoAccruals('2026-08')` — the three PH reps' zero row), step 7 (S112 — OOP, renumbered from the duplicate S110 — then S108/S109/S97 the next morning), step 8 (`INSTANCE_IS_PROD=true` + stand up the dev instance — the integration tier has NEVER run against the deployed project, which is how F-01's red pin counted as green).
- **`/reflect` for cycle 19 is OWED** and reads the archived block: the estimates.csv rows for D1, D2, F1, F2, R, T, SP, SP2, PTO, OOP-A, OOP-B, ELIG, OOP-C and H1–H3 (the archived `Estimates:` line carries estimate AND actual for each).
- Two follow-ons from the OOP round remain real work: the shared geocode quota
  (no cap, no honest exhausted-message — now also scan finding F-15) and the
  eligibility RULE not shown in the price lookup itself.

## Open follow-on items
- Test Suite: the integration tier is the only place `test_oop_verifyQuotes_currentStaleAndDeleted` executes; it was RED for a day and unrun. Until the dev instance exists, every "integration pin touched by a round" should be run by hand from the editor after a push.
- 20_timeclock.js: the LIVE punch path still accepts a Clock Out in the same minute as a Clock In (it now pays 0 h and the doctor reports it). A live-path refusal is a UX decision not taken in Batch 1.
- Tests.js:1897 `test_teamBenchmark_subtractsPublishedExcludes` expects 85.7; `cdrAnswerPct_` rounds whole since H2 (run.js H2-2 says 86) — that editor test is RED as written and has never run. One line for `/test-sync`.
- 40_metrics.js:1927 hand-carries `pctAnswered: cdr ? cdr.pctAnswered : 0` for a rep with no CDR row (F-32's class one level up); the "weekends and US holidays excluded" strings (deptrequests/metrics/coaching + `00_config.js:1266`, pinned at run.js:16930) are F-38's class outside its six sites.
- Visual: the no-standard / federal-fallback warn states of the two new CDR findings are pinned, not on camera (a `?fixture=` variant of admin-system).
- docs: `/sync-docs` ran 2026-09-17 after Batch 2 — g126–g130, INV-213–215 (+ INV-159/209 amendments), S7/S19/S112/S113 (the OOP scenario was a duplicate `S110`, renumbered S112), the two decision entries, modules.md, operator-log.md and test-harness-log.md; the two Dashboard error scenarios are on camera. Nothing outstanding from Batches 1–2.

## Decisions made (so the next session doesn't re-litigate)
- An equal-minute Clock In / Clock Out is ZERO hours, not an overnight wrap and not null — it is a genuine zero the doctor reports; the manager writers refuse it by name; the live path keeps accepting it (a rep may legitimately clock straight back out).
- Both OopPricing search surfaces score through ONE helper (`oopMatchScore_`) on the header-discovered row object; no OOP function reads a cell at position 0 (pinned). The OOP-B fixture carries the operator's shape (code in A, item in C) and a guard forbids putting the item in A.
- A registered `onClose` hook OWNS the close: `closeOverlay` will not remove the class for it (INV-145 lets a hook refuse), so every hook must remove its overlay itself. The DOM sweep pin closes every registered hook's overlay while nothing is in flight.
- Day Edit Save is dead for the prefill's duration (typically 1–3 s) — the pending window is the one that deleted punches.
- A published standard with NO Amber Band has NO amber tier — one point under the target is red on the Metrics table AND the Clock card (mtAnswerBand_); Transfer % keeps its local 5-pt slack because it has no published standard at all.
- `cdrAnswerPct_` is null (not 0) when answered + missed is zero; `0 / 3` is still a real 0%. Every surface dashes null; every average skips it.
- The holiday FALLBACK to the federal list is unchanged (deferred to the operator); Batch 3 only makes the live calendar's source visible on Admin → System.
- Cycle 19 was closed in substance by the 2026-09-17 deploy; the new /broad-scan opened cycle 20 and the block moved to HISTORY.md even though 19's /reflect is owed — the reflection reads the archive.

## Where I left off
Batches 1, 2 and 3 are implemented, pinned, bite-checked and committed on
`claude/festive-noether-unougu` (pushed); the harnesses, lint, manifest and counts
are all green. Next: `/sync-docs` for Batch 3 (the block's DOCUMENTATION UPDATES
list), then open the PR when the operator asks; after the merge + New version,
walk S112 first (OOP), then S111 step 5 and S110 step 5 (the two new Admin →
System findings), then S7's two new steps, then the sheet doctor. Then pick the
next batch from `.cycle/blocks/20-scan-batch-plan.md` (Batch 4, automation
liveness + accrual diagnostics) — and cycle 19's `/reflect` is still owed.
