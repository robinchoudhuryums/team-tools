---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the open follow-on items of the decisions block (DQ1–DQ3) and of Batches 9 and 10 that needed no operator decision, as FR1–FR4 (none is a numbered scan finding)
  FR2 — a partly failed bulk approve or deny said "1 succeeded, 1 failed" (time off) or gave one batch-level reason for every failed row (punch adjustments) (Batch 9)
  FR3 — Team Punches kept today's earlier activity bars after a failed re-read and said nothing (Batch 9)
  FR4 — a Spanish inbox refresh that failed behind a painted round was silent for a server error and for either list half (Batch 10)
New capabilities (G/ST): None from the scan's expansion plan. One follow-through of DQ3:
  FR1 — the Pay Period Close card lists the clock times set from app activity that nobody has confirmed
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/script_core.html, web-app/styles.html, web-app/tc/script_manager.html, web-app/metrics/script_metrics.html, handbook-app/shell_shared.html and handbook-app/styles.html (the derived copies), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, .cycle/config.md, docs/gotchas.md, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: M (~6 h), written to STATE.md's Estimates line before the first edit
Actual: ~5 h

CHANGES:
FR1 | web-app/20_timeclock.js, web-app/00_config.js, web-app/tc/script_manager.html, web-app/styles.html | The Timesheet range read the close card already makes also returns, per rep, the clock times whose shown row (the last of its type that day) is still marked Inferred. The close plan lists them per pay period — the rep, the day, the time, and whether the day is still inside the Day Edit window — and counts them. The card draws each as a button into Day Edit (text past the window), under a period that reads "Ready to close" too; the Periodic summary says "· N inferred to check". They are never part of "ready": the export file is the same either way.
FR2 | web-app/tc/script_manager.html, web-app/script_core.html | Both bulk bars answer a partial failure with a notice — "1 request not approved", then each undecided request with its own reason — that stays until OK is pressed. `uiConfirm` gained `hideCancel` for a one-button notice. The punch-adjustment row's checkbox now carries its date.
FR3 | web-app/tc/script_manager.html, web-app/styles.html | Each kept read of a day's app activity is timed. When today's re-read fails and an earlier read is still on screen, the note under the table begins "App activity could not be refreshed just now — these bars are from a read N min ago".
FR4 | web-app/metrics/script_metrics.html | A refresh that fails behind a painted round — the stats' server error or transport failure, or either list half — says "Couldn't refresh the Spanish inbox — showing last loaded", once per round. A cold failure still draws its error card.
Pins | test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs | Six pure pins, five DOM drives, one visual scenario. Six older pins followed the new helpers, constant and source shapes.

TEST RESULTS: passed. Pure 1761/1761, DOM 475/475; `lint-server`, `split-manifest --check`, `handbook-sync --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. Visual: the Periodic group at two widths and the bulk notice on a phone — no overflow, no narrow text, no console error; the close card and the notice were opened and read (one fix came from reading: a doubled dashed line above the inferred list).
  Bite-checks: 56 mutations, 55 bit (43 pure, 12 DOM). One DOM mutation bit only after its drive was strengthened (the refusal now lands first, so a notice shown before the last answer is seen). The one that did not bite was an equivalent mutant — a type guard in the range reader that the index's own filter already implies; the guard was removed.
  CI: run 1810 (3cf63d2, the code and pins) is GREEN on the first push — both jobs (client-tests; visual-layout). The two small follow-up commits and the docs commit are pushed with this block; their run is not read here.
  NOT verified here: nothing ran in a deployed Apps Script project. The editor suite was not run. FR1 reads column J of real Timesheet rows, which exist only on a deployed instance.
  Regression scenarios whose Subsystem overlaps the modified files (Server; Client (Time Clock views); Client (Metrics views); the shell's dialog): S41, S42, S43, S110, S111, S146, S152, S166, S174, S180, S187, S191 and the new S194 — NOT WALKED: each is a browser walk on a deployed instance (Test Command is `manual`). What stands in: the driven pins, the DOM drives and the Chromium shots.
REGRESSION RISKS: (1) FR1 — the close card's payload grows by up to forty entries a period; `workedHoursByEmpForRange_` does a little more work per row for its two other callers (the accrual run and its preview), which ignore the new field. (2) FR1 — the list counts a day inside the two-day grace, unlike open days; that is deliberate (a time is a time), and a manager may see a time from yesterday. (3) FR2 — a notice needs a press where a toast needed none; with many failures the list is cut at eight and says how many more. (4) FR2 — `uiConfirm` changed for every caller: without `hideCancel` its markup and bindings are what they were (driven by every existing dialog drive). (5) FR3 — the age is read off the browser's clock at the time the note is drawn; it does not tick. (6) FR4 — a list reload after an action counts as a new round, so a manager who acts repeatedly while offline gets one toast per action. (7) The handbook app's copied shell and stylesheet changed (the dialog option; rules it does not use).
INVARIANTS AT RISK: None broken. INV-432 (Confirm as is) is what FR1 reads against: the list uses `adpRowInferred_` on the day's shown row, so a confirmed time leaves it. INV-185 followed (the close-card fixture mirrors `counts.inferred` and `inferred`). The close card's own invariant (a failed check is never "ready"; offboarded reps included) is untouched — `ready` is computed exactly as before, pinned. New: INV-435.
NET SCORE: 3 production fixes − 0 new failure modes = 3 (1 capability follow-through). FR2: YES — any bulk decide in which another manager had already decided one request. FR3: YES — any failed re-read of today while Team Punches was open. FR4: YES — any Gmail quota error behind an open Spanish inbox. FR1: new capability (NO). No new failure mode found: FR1 adds a list and leaves `ready` alone; FR2 replaces a toast with a notice; FR3 and FR4 add a sentence to a state that already existed.

OPERATOR ACTIONS / DEPLOY:
- No Script Property, tab or column to set | BLOCKS DEPLOY: N
- Tell managers: the Pay Period Close card now lists unconfirmed inferred times (they do not hold up the export); a bulk approve or deny that partly fails names each request and why | BLOCKS DEPLOY: N
Deploy: Team Tools — `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version (rides the owed Team Tools deploys). Handbook app — `npm run handbook:push` keeps its copied shell and stylesheet in step; nothing a reader sees changes.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- NOT BUILT, needs your decision — a rep confirming their own inferred time (it would remove the second person DQ3 kept).
- NOT BUILT, needs your decision — Team Metrics' figures adjusted for partial days (Batch PD left them unadjusted on purpose).
- NOT BUILT, needs your decision — partial days shown in Day Edit and Team Punches: it would put a call-data read on the Timesheet path for a mark that judges call figures, not hours.
- NOT BUILT, needs your decision — a back-fill of the "amended" mark onto intake notes sent before DQ2: a heuristic write into the reps' PHI Sheets (matching notes to submissions by time). Without it the Intake count corrects itself as the 92-day windows roll.
- DEFERRED, measure first — a server rate limit on activity-count rows.
- DEFERRED by an earlier decision — the hourly read-ahead does not warm the outbound windows.
- LEFT AS IS, with the reason — My Stats' range reads its per-day breakdown per rep: a cohort's ninety days does not fit the 100 KB cache.
- web-app/tc/script_manager.html — the Recent Activity panel and the PTO drift card's "Credit & reconcile" were not checked for the FR2 pattern (a count where a reason exists).
- The scan's F36 items and Batches 11–14 stand as planned.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this batch: CLAUDE.md (clauses on g53 and g142; the decisions index; the counts block), docs/gotchas.md (two amendments), docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-435, S194).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
