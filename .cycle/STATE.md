# Cycle State

## Current
Cycle: 20 — OPEN (the /broad-scan of 2026-09-17 opened it; cycle 19's whole
block moved to `.cycle/HISTORY.md` at that point, per the close-out procedure —
**with cycle 19's `/reflect` still OWED; it reads the archived block**).
Phase: reflect — DONE 2026-09-18 (`.cycle/blocks/20-a-reflect.md`, net 28 − 3 = 25;
the seven batch blocks sum to 30 − 1 = 29 and the reflection corrects them in
four places — read the REFLECT block for the cycle's tally, never the
implementation blocks). Batches 1–6 of the scan's IMPLEMENTATION BATCH PLAN are
DONE (`.cycle/blocks/20-batch1-broad-implement.md`, net 5 − 0 = 5;
`.cycle/blocks/20-batch2-broad-implement.md`, net 6 − 0 = 6;
`.cycle/blocks/20-batch3-broad-implement.md`, net 4 − 0 = 4;
`.cycle/blocks/20-batch4-broad-implement.md`, net 3 − 0 = 3;
`.cycle/blocks/20-batch5-broad-implement.md`, net 3 − 0 = 3;
`.cycle/blocks/20-batch6-broad-implement.md`, net 6 − 0 = 6;
`.cycle/blocks/20-batch7-broad-implement.md`, net 3 − 1 = 2). **ALL SEVEN
BATCHES OF THE PLAN ARE DONE** — every one of the scan's 53 findings is either
implemented or the one deferred item (F-09's holiday fallback, an operator
decision). NOT DEPLOYED: everything since Batch 1 is live only after
`clasp push -f` + a New version.
Scope: broad
Test Command: manual
Estimates: **Batch 7 (F-52 four structural pins made behavioural · F-50 lint-server's advanced-service globals derived from appsscript.json · F-51 the manager-gated endpoint count covers all three gates · F-53 _TEST_OVERRIDE_COACH_MAIL moves out of production code · F-31 the CDR agent-metrics cache bypassed under the test override + the roster hash · F-33 cdrQueueInventory_ span-bound · F-34 Spanish telemetry counts voicemails · F-26 "manager-gated" over admin gates · F-39 the timesheet computeRange mirror pinned · F-48 an open day is no bar, not a 0h bar) — M (~4.5 h), recorded 2026-09-18 BEFORE the first edit — ~4.5 h ACTUAL.** · **Batch 6 (F-14 boot Retry through reloadApp_ · F-12 the Admin KPI strip's "across team" labels own counts · F-40 five static modals never move/restore focus · F-30 the shortcuts overlay outside ensureOverlay · F-29 duplicate aria-label + "You" under a manager · F-42 public-form accordions lack aria-expanded · F-43 the KB drawer has no dialog role/label/focus restore · F-36 export window.open after an async RPC · F-37 the pop-out blocked toast is unreachable · F-28 the quick-chip row's "this week" over all-time counts) — M (~6 h), recorded 2026-09-18 BEFORE the first edit — ~2.5 h ACTUAL.** · **Batch 5 (F-16 QA My Reviews + audio scoped by roster ID · F-10 tag transforms report skipped reps · F-11 DeptRequests PHI comments/map/Storage Health row · F-17 QA exemption onclick apostrophe · F-24 hash-less doc refuses to sign, verify reports contentMatch null · F-23 eligibility states + radius · F-27 intake labels from the server bank) — M (~6 h), recorded 2026-09-18 BEFORE the first edit — ~2.5 h ACTUAL.** · **Batch 4 (F-20 automation liveness: two JOB_CHECKS rows, a digest heartbeat, computeAutomationHealth_ stamps its own failure · F-19 per-month accrual ledger keys · F-46 the accrual job's early returns rewrite/clear PTO_ACCRUAL_RECONCILE · F-21 cleanup strips MANAGER_EMAILS residue · F-22 TEST_ rows on DeptRequests/ClientErrors deleted by key + cleanup backstop · F-49 getTeamCalendar through the time-off provisioner) — M (~7 h), recorded 2026-09-18 BEFORE the first edit — ~2 h ACTUAL.** · **Batch 3 (F-07 one null-band tone rule · F-08 standardSource rendered + the residual 85 · F-09 holiday source surfaced · F-35 ambient badge uses the previous workday · F-32 cdrAnswerPct_ null on no denominator · F-38 "Company holiday" copy) — M (~6 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** · **Batch 2 (F-06 dept-config cached empty · F-13 dashboard carousels "No call data" on failure · F-18 Sent detail blank→"No" · F-15 geocoder failure reads as a bad address · F-47 pending tasks DQE failure = 0 missing · F-41 coverage strip blank on failure · F-25 KB count helpers {} on failure · F-45 KB feedback "Thanks" before the RPC) — M (~7 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** · **Batch 1 (F-01 OOP verify column-A · F-03 the 24-hour equal-minute day · F-02 the two unclosable modals · F-04 eligibility column-A · F-05 Day Edit Save during prefill · F-44 undefined `text`) — M (~7.5 h), recorded 2026-09-17 BEFORE the first edit — ~1.5 h ACTUAL.** The scan's own estimates for the remaining batches, as written at scan time: B2 — ~7 h · B3 — ~6 h · B4 — ~7 h · B5 — ~6 h · B6 — ~6 h · B7 — ~4.5 h.
Subsystem cycles since last Seams audit: 6 — **the every-4 cadence has now been
missed twice over; cycle 20's reflection (20-a, 2026-09-18) incremented it to 6.
The next `/audit` MUST be a Seams & Invariants audit**, and cycle 20 makes the
case louder rather than quieter: the library gained twelve entries this cycle
(INV-213..224, plus INV-225..227 proposed by the reflection) and nothing has
probed the older ones.
Updated: 2026-09-18

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
- F-20 | web-app/10_core.js, web-app/20_timeclock.js, web-app/cn/script_callnotes.html | heartbeats for missed-punch / export-check / the failure digest; each stamps its own failure; untabled stamps reach the digest; the Admin finding shows the stamped message
- F-19 | web-app/20_timeclock.js | one PtoAccrualCredit row per MONTH (accrualMonthRows_); the earned total is the per-month sum (accrualEarnedByMonth_)
- F-46 | web-app/20_timeclock.js | accrualNothingToDo_ rewrites PTO_ACCRUAL_RECONCILE + clears the error on both early returns
- F-21 / F-22 | web-app/Tests.js | cleanup strips MANAGER_EMAILS residue; DeptRequests + ClientErrors tidied and backstopped by KEY
- F-49 | web-app/20_timeclock.js | getTeamCalendar through getOrCreateTimeOffSheet_
- pins (Batch 4) | test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json | pure 878 → 883; twelve bite-checks bite; manifest 1289
- F-16 | web-app/00_config.js, web-app/90_qa.js | QaRecordings AgentId column; qaRowIsMine_ scopes the agent-facing reads by roster id (legacy name match only when unique; an ambiguous name resolves to nobody)
- F-10 | web-app/30_callnotes.js, web-app/cn/script_callnotes.html | tag rename/merge report skippedReps in the return, the audit row and a warn toast
- F-11 | web-app/10_core.js, web-app/50_deptrequests.js, CLAUDE.md, docs/operator-state.md | the DeptRequests store is PHI-adjacent: probed by Storage Health (Forms fallback posture), named in the map (nine stores), comments corrected
- F-17 | web-app/qa/script_qa.html | exemption buttons via data-qa-exempt + one delegated listener
- F-24 | web-app/81_empdocs.js, web-app/train/script_empdocs.html | a hash-less doc is refused at signing; verify carries a warning when it cannot verify
- F-23 | web-app/70_kb.js | a state beside a radius (not the warehouse's own address) is UNKNOWN
- F-27 | web-app/00_config.js, web-app/60_intake.js | the server holds the English banks (pinned equal to the client's) and builds every intake email's rows from bank + answers
- pins (Batch 5) | test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json | pure 883 → 890; twelve bite-checks bite; manifest 1300
- F-14 / F-37 | web-app/script_core.html | the boot Retry goes through reloadApp_ (+ a location.reload tripwire over nine files); a blocked pop-out is detected by the RETURN value, not a catch
- F-12 | web-app/cn/script_callnotes.html, test/visual/mock.js | the Admin KPI strip reads team-wide sources; a partial walk is "≥ N", an unreadable one a dash with the reason
- F-40 / F-30 | web-app/tc/*.html, web-app/cn/script_callnotes.html | five static modals + the shortcuts overlay open through ensureOverlay and close through closeOverlay; day-overlay's hover-mode is carried
- F-29 | web-app/cn/script_callnotes.html | one aria-label per input; the Q&A thread says "Rep" when a manager reads it
- F-42 / F-43 | web-app/form_public.html, web-app/kb/script_kb.html | the public form's accordions expose aria-expanded/aria-controls; the Reference drawer is a named dialog that hands focus back
- F-36 | web-app/tc/script_manager.html, web-app/modals.html | the export link renders into #exp-result before the blockable window.open, and the dialog stays open
- F-28 | web-app/cn/script_callnotes.html | the quick-chip label says "all time", matching its counts
- pins (Batch 6) | test/client/run.js, test/visual/mock.js | pure 890 → 898; thirteen bite-checks bite; a11y-names re-run clean

- F-52 | test/client/run.js, test/visual/mock.js | three structural pins REPLACED by drives (archiveSheetRowsOlderThan_, getDepartmentEmails_/saveDepartmentEmails, clientBuildHash_); the width pin stays structural and says why
- F-50 | scripts/lint-server.mjs | advancedServiceGlobals() derives the advanced-service globals from appsscript.json's enabledAdvancedServices; the six hardcoded names are gone
- F-51 | scripts/counts.mjs, CLAUDE.md | three gate families counted by their refusal literals — admin 51, manager 95 (now incl. assertManagerCaller_), QA 17 (new block row)
- F-53 | web-app/00_config.js, web-app/Tests.js | _TEST_OVERRIDE_COACH_MAIL declared in Tests.js beside the other eight; production reads it through typeof
- F-31 | web-app/40_metrics.js, web-app/Tests.js | getCdrAgentMetrics_ bypasses its cache under _TEST_OVERRIDE_CDR_SS_ID at BOTH ends; _clearCdrCacheForDate_ hashes through empRosterEmail_
- F-33 | web-app/40_metrics.js | cdrQueueInventory_ reads the window via cdrDqeWindowSpan_; truncated means the WINDOW outgrew the cap, not the tab
- F-34 | web-app/51_spanish.js, web-app/metrics/script_metrics.html | spanishVmFold_ is the ONE voicemail fold; the stats card counts voicemails and states its own vm figures; cache key v2 → v3
- F-26 | web-app/10_core.js, 30_callnotes.js, 70_kb.js, .cycle/config.md, docs/design-decisions.md | 21 "manager-gated" claims over admin gates corrected (nine the scan named, ten more it did not, INV-31/INV-82, two decision paragraphs)
- F-39 | test/client/run.js | computeRange ↔ getCurrentBiweeklyRange_ driven over 70 consecutive days across three period boundaries
- F-48 | web-app/20_timeclock.js, web-app/tc/script_manager.html, web-app/styles.html | an unmeasurable sparkline day ships null and renders as a hatched gap; the total names how many it could not measure
- pins (Batch 7) | test/client/run.js, test/visual/mock.js, CLAUDE.md | pure 898 → 908 (three weak pins retired, thirteen added); ~25 bite-checks bite; three NO BITEs were real pin weaknesses and were fixed or deleted; counts block gains the QA row

## Pending / not yet done
- ~~Batch 7 of `.cycle/blocks/20-scan-batch-plan.md`~~ DONE 2026-09-18. The plan is exhausted; the only scan item left is the DEFERRED one (F-09's holiday fallback — keep g123's federal fail-open, or match the dashboard's no-fallback; an operator decision, and Batch 3 surfaces the source either way).
- ~~`/sync-docs` for Batch 7~~ DONE 2026-09-18 — g136/g137/g138, g02/g22/g116 amended, INV-222..224 (+ INV-169 amended), S10/S80 expected text, three decisions, both module narratives, the operator and harness logs; counts block invariants 224.
- ~~`/reflect` for cycle 20~~ DONE 2026-09-18 (`.cycle/blocks/20-a-reflect.md`). INV-225..227 are PROPOSED there and not yet in the library — add them with the next round that can verify them, or let the Seams audit adopt them. **Those three numbers are now RESERVED by name in `.cycle/config.md`** so nothing else claims them; the accrual-ledger rule from the 2026-09-18 editor run took INV-228 rather than renumbering the reflection's record.
- **OPERATOR — the full editor suite RAN on 2026-09-18, and that changes the deploy picture.** `runAllTestsPartA` + `runAllTestsPartB` executed against the deployed project, which means `clasp push -f` HAS happened at least once since Batch 1. **Whether a New version deployment was cut is UNCONFIRMED** — that is the separate step, and it is what the web app serves, so the 52 fixes may still not be reaching users. Confirm before assuming. Part A clean; Part B 121/122 with `accrualReconcile_topsUpLateData` failing, diagnosed as a TEST defect (see below) and fixed in PR #261. **Re-run `runAllTestsPartB` after the next push** — expect 122/122.
- ~~`bite.sh` span guard~~ DONE 2026-09-18 (see Open follow-on items).
- **OPERATOR — still owed from cycle 19's post-deploy walk** (archived in HISTORY.md, "Where I left off"): step 2 (the editor lists FOURTEEN server files, no `Code.js`), step 5 (Manage → Admin → OOP pricing diagnostics: `nameCol` = `Item`, `nameByHeader: true`, three price columns, the first `OOP Price – pick-up`; unknown eligibility values now named by ITEM), step 6 (`previewPtoAccruals('2026-08')` — the three PH reps' zero row), step 7 (S112 — OOP, renumbered from the duplicate S110 — then S108/S109/S97 the next morning), step 8 (`INSTANCE_IS_PROD=true` + stand up the dev instance — the integration tier has NEVER run against the deployed project, which is how F-01's red pin counted as green).
- ~~`/reflect` for cycle 19~~ DONE 2026-09-18 (`.cycle/blocks/19-e-reflect.md`, net 5 − 2 = 3 for the H1/H2/H3 round; every other cycle-19 round was already in 19-a..19-d and their estimates rows were already written). Cycle 19 is fully reflected.
- Two follow-ons from the OOP round remain real work: the shared geocode quota
  (no cap, no honest exhausted-message — now also scan finding F-15) and the
  eligibility RULE not shown in the price lookup itself.

## Open follow-on items
- Test Suite: the integration tier is the only place `test_oop_verifyQuotes_currentStaleAndDeleted` executes; it was RED for a day and unrun. Until the dev instance exists, every "integration pin touched by a round" should be run by hand from the editor after a push.
- 20_timeclock.js: the LIVE punch path still accepts a Clock Out in the same minute as a Clock In (it now pays 0 h and the doctor reports it). A live-path refusal is a UX decision not taken in Batch 1.
- `cn-export-overlay` is a SIXTH static modal with F-40's exact defect (and F-36's window.open), left untouched because the finding named five; `train/script_training.html` + `script_empdocs.html` close four dynamic overlays without closeOverlay's restore.
- `ensureOverlay` rewrites `className`, so any static modal carrying a second class loses it (F-40 hit this on day-overlay's hover-mode) — a preserving variant, or a pin banning extra classes, would close the trap.
- The Admin KPI strip now paints only when all FOUR sources land; a per-cell skeleton would beat the all-or-nothing gate.
- `oopEligibilityParse_`'s STATES branch reads "TX or CA" as Texas + Oregon + California (uppercased "or") — the class F-23 closed for the radius branch, untouched.
- The GATE-SHAPE pin follows the FIRST `return helper_(` in an endpoint as a delegate — a callback's return inside the endpoint is mis-read (F-27's first draft tripped it); a top-level-return regex would fix it.
- Existing DeptRequests rows stay on the ADP sheet once `DEPT_REQUESTS_SS_ID` is set — no migration tool.
- ~~`scripts/bite.sh` cannot tell which function a mutation hit~~ FIXED 2026-09-18. The class fired a SECOND time (the accrual ledger fix: two NO BITEs running, both about `test_getTodayPunches_sortsOutOfOrderBackfill` rather than the intended test, because the mutation matched the first of 24 identical call sites). `bite.sh --fn <function>` now resolves that function's span and mutates inside it, refusing a missing/ambiguous/malformed name; a NO BITE prints the real diff before restoring, so the hunk header names what was actually edited. Six branches verified by direct execution — bite.sh cannot bite itself.
- A legacy multi-month accrual ledger key (none expected in prod) produces a daily `skipped` line until it ages out of the ledger read; no tooling splits it.
- Tests.js:1897 `test_teamBenchmark_subtractsPublishedExcludes` expects 85.7; `cdrAnswerPct_` rounds whole since H2 (run.js H2-2 says 86) — that editor test is RED as written and has never run. One line for `/test-sync`.
- 40_metrics.js:1927 hand-carries `pctAnswered: cdr ? cdr.pctAnswered : 0` for a rep with no CDR row (F-32's class one level up); the "weekends and US holidays excluded" strings (deptrequests/metrics/coaching + `00_config.js:1266`, pinned at run.js:16930) are F-38's class outside its six sites.
- Visual: the no-standard / federal-fallback warn states of the two new CDR findings are pinned, not on camera (a `?fixture=` variant of admin-system).
- `gatedEndpointsFromSource_` in run.js (F9's coverage pin + the omnibus tier-link pin) still knows TWO gate families while counts.mjs now derives three; widening it would require every `assertManagerCaller_` / `canSeeQa_` endpoint to have a gate test named in the omnibus.
- `docs/gotchas.md` has no entry for the F-52 lesson — a pin whose NAME promises a behaviour must drive it; an absence assertion must say it cannot. It belongs beside g116.
- Three bite-checks on Batch 7's own pins reported NO BITE and each was real: the archive fake accepted a zero-row `setValues` Sheets refuses (fixed); the missing-partial assertion varied index.html's own text so it could not isolate the marker (fixed); and the "the marker NAMES the lost file" claim is not hash-observable at all (assertion deleted, reasoning kept in place). A fourth NO BITE was an equivalent rewrite — `ceil(n/14) === floor((n+13)/14)` for every integer — verified rather than assumed.
- F-34 changed what `vmSuppressed` counts: the duration gate now runs before the resolution check, so a short voicemail that was later resolved is counted as suppressed. The number can step up; its meaning is "hang-ups the gate hid from BOTH surfaces".
- docs: `/sync-docs` ran 2026-09-18 after Batch 6 — g134 (ensureOverlay rewrites className) + g135 (a blocked window.open returns null), g69 + g100 amended, INV-221 (every overlay through ensureOverlay/closeOverlay) + INV-187 amended, S8/S25/S47/S51/S64 expected text, the Admin-KPI and overlay-accessibility decisions, modules.md (Time Clock, Call Notes, Reference), operator-log and test-harness-log entries; counts block invariants 221. The Subsystems file lists and the operator-state inventory were both checked and need nothing (Batch 6 is client-only). Nothing outstanding from Batch 6.
- docs: `/sync-docs` ran 2026-09-18 after Batch 5 — g133 (an onclick literal cannot carry a name) + g43 amended (the English rule is server-side now), INV-220 (a cross-rep walk reports its skips) + INV-196/INV-209 amended, S90/S100/S53/S59/S60 expected text, the QA operator entry (AgentId), the intake-email and tag-taxonomy decisions, modules.md QA + Intake, operator-log and test-harness-log entries; counts block invariants 220. Nothing outstanding from Batch 5.
- docs: `/sync-docs` ran 2026-09-18 after Batch 4 — g132 + the g116 fourth direction, INV-219 (+ INV-205 amended), S9/S107 expected, the AUTOMATION_DIGEST_LAST_RUNS + daily-triggers operator entries, the two storage-map lines, the accrual and Automation Health decisions, modules.md Time Clock, operator-log and test-harness-log entries; counts block invariants 219. Nothing outstanding from Batch 4.
- docs: `/sync-docs` ran 2026-09-18 after Batch 3 + the 19-e reflection — g131 + the g123/g124 amendments, INV-216..218 (+ INV-211 amended), S110/S111 gained a step and their expected text, the two CDR operator-state entries, modules.md Metrics, the H2 + Storage Health decisions, operator-log and test-harness-log entries; counts block invariants 218. Nothing outstanding from Batch 3.
- docs: `/sync-docs` ran 2026-09-17 after Batch 2 — g126–g130, INV-213–215 (+ INV-159/209 amendments), S7/S19/S112/S113 (the OOP scenario was a duplicate `S110`, renumbered S112), the two decision entries, modules.md, operator-log.md and test-harness-log.md; the two Dashboard error scenarios are on camera. Nothing outstanding from Batches 1–2.

## Decisions made (so the next session doesn't re-litigate)
- An equal-minute Clock In / Clock Out is ZERO hours, not an overnight wrap and not null — it is a genuine zero the doctor reports; the manager writers refuse it by name; the live path keeps accepting it (a rep may legitimately clock straight back out).
- Both OopPricing search surfaces score through ONE helper (`oopMatchScore_`) on the header-discovered row object; no OOP function reads a cell at position 0 (pinned). The OOP-B fixture carries the operator's shape (code in A, item in C) and a guard forbids putting the item in A.
- A registered `onClose` hook OWNS the close: `closeOverlay` will not remove the class for it (INV-145 lets a hook refuse), so every hook must remove its overlay itself. The DOM sweep pin closes every registered hook's overlay while nothing is in flight.
- Day Edit Save is dead for the prefill's duration (typically 1–3 s) — the pending window is the one that deleted punches.
- Every overlay opens through `ensureOverlay` and closes through `closeOverlay` — the open stashes the trigger, the close hands focus back, and a static modal keeps its own aria from modals.html. `day-overlay` proves the trap: ensureOverlay rewrites `className`, so a second class (hover-mode) must be carried through `extraClass`.
- The Reference drawer is `role="dialog"` with a name but deliberately NO `aria-modal` — it does not trap focus, and the shell's trap exempts it; claiming modality it does not enforce would be the lie the a11y family exists to remove.
- The Admin KPI strip reports TEAM scope from cross-rep sources, and each cell states its own scope rather than the strip implying one; a partial cross-rep walk renders as a lower bound.
- The agent-facing QA reads scope by ROSTER ID (the AgentId cell written at attribution); a legacy row matches by name only when that name is unique, and an ambiguous name resolves to nobody — a PHI-adjacent release to the wrong agent is the failure being refused.
- The intake email's labels come from a SERVER-held English bank that mirrors the client's byte-for-byte (pinned equal); the client's labels are never rendered. The mirror was accepted over shipping the bank to the client because a drift costs a wrong label, never a refused send (g120).
- The DeptRequests store is PHI-ADJACENT (PatientTrx) and is probed with the Forms posture: unset warns and recommends the Intake spreadsheet.
- The three daily jobs that write no audit row (missed-punch alerts, the export check, the failure digest) are LIVE by heartbeat, not by a JOB_CHECKS row — a JOB_CHECKS row needs an audit action, and a row per run would be two AuditLog rows a day for jobs whose signal is "I ran".
- A catch-up accrual credit writes one ledger row per MONTH, and its total is the SUM of the per-month roundings (≤0.01 day per extra month from the once-rounded total) — the ledger must add up to the balance moved, and the preview shares the sum.
- A published standard with NO Amber Band has NO amber tier — one point under the target is red on the Metrics table AND the Clock card (mtAnswerBand_); Transfer % keeps its local 5-pt slack because it has no published standard at all.
- `cdrAnswerPct_` is null (not 0) when answered + missed is zero; `0 / 3` is still a real 0%. Every surface dashes null; every average skips it.
- The holiday FALLBACK to the federal list is unchanged (deferred to the operator); Batch 3 only makes the live calendar's source visible on Admin → System.
- Cycle 19 was closed in substance by the 2026-09-17 deploy; the new /broad-scan opened cycle 20 and the block moved to HISTORY.md even though 19's /reflect is owed — the reflection reads the archive.

- A gate figure is counted by what the endpoint REFUSES with, never by a mention of its helper: `getEmployeeState` calls `canSeeQa_` to ship a flag and gates nothing. `canSeeQa_` gets its OWN counts row rather than joining the manager one — it admits `isManager OR QA_MEMBERS`, so folding it in would replace an undercount with a wrong claim about who may call.
- An UNMEASURABLE sparkline day is a third state, not a zero: no punch rows is a real 0 (the V-10 dim bar), punched-but-uncomputable ships null (a hatched gap), and a measured 0.0h is told apart from both by PRESENCE in the map rather than truthiness.
- ONE voicemail fold serves the Spanish list and the Spanish stats card, and its duration gate runs BEFORE the resolution check so a hang-up is work on neither surface. The two surfaces disagreeing daily was worth the small change in what `vmSuppressed` counts.
- A pin that NAMES a behaviour drives it; the structural halves that are genuinely about shape (which caller passes a bound, which scriptlet form injects a value) stay structural and say so. An assertion that cannot be made to fail is deleted rather than dressed up — the build hash's "the marker names the file" claim went that way after two attempts to isolate it.

## Where I left off
ALL SEVEN BATCHES are implemented, pinned, bite-checked and committed on
`claude/festive-noether-unougu` (pushed); pure 908/908, DOM 126/126, lint clean,
manifest current (1300), counts block agrees. The scan's plan is exhausted —
53 findings, 52 implemented, one deferred to the operator (F-09's holiday
fallback).

Next, in order: `/sync-docs` for Batch 7 (two gotchas, three invariant
candidates, modules.md, the harness log — the block lists them). Then open the
PR when the operator asks. After the merge + New version, walk S112 first (OOP),
then S111 step 5 and S110 step 5 (the two Admin → System findings), then S7's
two new steps, then the sheet doctor; Batch 7 adds no operator action of its
own but changes two surfaces worth a look — the manager live-status sparkline
(a hatched bar where a rep is still clocked in) and the Spanish stats card
(its Pending must now equal the list's count).

Cycle 20 is CLOSED in substance: implemented, documented and reflected
(`.cycle/blocks/20-a-reflect.md`, net 25), and merged to `main` as PR #260.

**Deploy status, 2026-09-18, stated precisely because it changed:** the full
editor suite RAN against the deployed project, so `clasp push -f` has happened.
Whether a **New version** deployment was cut is UNCONFIRMED, and that is the
step the web app actually serves from — do not assume the 52 fixes are reaching
users until someone checks Manage → Admin → Overview or the beacon prompt.
When the New-version deploy IS confirmed, move this whole block into
`.cycle/HISTORY.md` and reset STATE.md from the template, per the close-out
procedure.

**Post-merge work, 2026-09-18 (PR #261 merged, plus the bite.sh guard):** the
editor run found one failure, `accrualReconcile_topsUpLateData`. It was a TEST
defect, not a product one — an earlier test in the same execution credits the
same rep for the same month, the AuditLog is append-only and swept only at the
end of a run, and the accrual ledger reads the HIGHEST hours per (rep, month),
so the reconcile test measured the sibling's credit. Fixed with
`_clearTestState` and pinned (g139, INV-228). Bite-checking that fix hit g116's
fourth direction twice, which is why `bite.sh` now has `--fn`.

The seam counter is 6 and the every-4 cadence has been missed twice, so the
NEXT `/audit` must be a Seams & Invariants audit rather than another broad scan.
Cycle 19 is fully reflected (19-a..19-e).
