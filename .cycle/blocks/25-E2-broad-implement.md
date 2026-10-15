---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F19 (Medium): an offboarded rep's last-period open punches raised no alert and had no Day Edit entry point, yet the export still shipped them. This was deferred for an operator decision. The operator's decision (2026-10-15) was "find + fix". It ships in this batch because E2 depends on it.
New capabilities (G/ST):
- G1: a pay-period close checklist. The operator chose a STANDING card under Manage Time → Periodic. It covers open/incomplete days AND pending punch-adjustment and time-off requests in the period that just ended and in the current one, offboarded reps included.
Files modified: web-app/10_core.js, web-app/20_timeclock.js, web-app/tc/script_manager.html, web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~1 day ≈ 8 h, the plan's figure). Written before the first edit, after the operator's three answers (STATE.md Estimates line, 2026-10-15).
Actual: ~2.5 h

CHANGES:
F19 | web-app/20_timeclock.js | New `payrollSubjectId_(row)` returns the trimmed ID: the payroll predicate. `checkOpenPunches` now walks payroll subjects. `empRosterEmail_` still supplies an `offboarded` label. `planOpenPunchCheck_` and the stamp's `detail` carry that label.
F19 | web-app/10_core.js | `automationProblems_`' open-punch line names a rep as "<name>, offboarded (N)".
F19 | web-app/tc/script_manager.html | `openDayEditModal` takes an optional 4th tz hint. An offboarded rep has no Live Status card, so before this the modal fell back to the manager's timezone.
G1 | web-app/20_timeclock.js | `biweeklyRangeFor_(anchor, day)` (pure) is extracted, and `getCurrentBiweeklyRange_` (the automated export) delegates to it, so the export and the checklist share ONE period rule. `payPeriodsForClose_` (pure) returns, for each pay cycle with reps, the previous and current periods; biweekly with no anchor is an `error`. `planPayPeriodClose_` (pure) produces, per period and rep:<br>• open days through `min(end, today − OPEN_PUNCH_GRACE_DAYS)`, each marked editable only inside `ADJUST_WINDOW_DAYS`;<br>• pending time-off and punch-adjustment requests, status-normalized and matched by pay cycle and date;<br>• orphan requests (an ID no roster row carries), which are named and never dropped;<br>• counts and a `ready` flag.<br>`getPayPeriodClose()` is manager-gated before any read, read-only and lock-free. It makes ONE Timesheet range read through `workedHoursByEmpForRange_`; a failed read returns `{error}`.
G1 | web-app/tc/script_manager.html | `loadPayPeriodClose_` rides the dashboard render, alongside the PTO-drift and sheet-doctor loaders. The pure `renderPayCloseCard_` draws a block per period: "Ready to close", or reps with an "offboarded" label. An editable day is a data-* button calling `mgrPayCloseEdit_`; an older day reads "past the 30-day edit window: hand-edit the Timesheet". Pending requests show with dates, orphans are named, and every string is escaped. The pure `payCloseSummary_` sets the Periodic summary item: crit for an ENDED period with work left, warn for the current one, ready, or check failed. A failed read renders the warn card, never "ready".
Tests | web-app/Tests.js | `getPayPeriodClose` is added to the manager-gate omnibus.
Tests | test/client/run.js | New pins (four), each driven:<br>• the periods: January rollover, a leap February, contiguous biweekly periods, the export's delegation, no anchor reported, no cycle → no period;<br>• the plan: grace, the edit window, cycle separation, pending normalization, the offboarded rep included and labelled, orphans, ready;<br>• the endpoint: gate before reads, ONE range read, offboarded included, a failed read = error, the payroll predicate used ONLY by the two close-out walks, the real `checkOpenPunches` driven with an offboarded rep, and the 9am problem line;<br>• the card and summary: failed ≠ ready, buttons carry data-* and the timezone, the hand-edit wording, labels, orphans, escaping, the tones, and the wiring.<br>Old-shape updates: A4-4 (the Day Edit signature) and F-39 (it now loads `biweeklyRangeFor_`).
Tests | test/client/dom/runDom.js | The "E2 DOM" drive:<br>• the card loads with Manage Time and the collapsed summary row reads crit;<br>• the day button opens Day Edit for the OFFBOARDED rep on that date and loads their punches;<br>• a failed reload replaces the card with "check failed".
Tests | test/visual/mock.js, shoot.mjs | A `getPayPeriodClose` fixture: an ended period with an offboarded rep (an editable day and a hand-edit day), pending requests, ready periods and an orphan. Three scenarios open Periodic: `manage-periodic-light-wide`, `-light-mobile`, and `-error-light-wide` (a failed read).
Bites | — | 17 hand mutations, all red:<br>• the scan or the endpoint drops the offboarded;<br>• the offboarded flag is forced false;<br>• the gate is moved after the reads;<br>• the grace is ignored;<br>• every day is editable;<br>• the pending status is not normalized;<br>• orphans are dropped;<br>• the pay cycle is ignored;<br>• no-anchor goes silent;<br>• the January rollover is wrong;<br>• a card error reads ready;<br>• an ended period is only a warn;<br>• a hand-edit day is shown as a button;<br>• the problem line loses "offboarded";<br>• the DOM loader is not chained;<br>• the DOM tz/date hint is dropped.<br>"Scan drops offboarded" first came back NO BITE: its pin was only structural, and an extra skip slipped past it (g116's 7th direction). It is now driven through the real `checkOpenPunches`, and it bites.
Docs | CLAUDE.md, docs/*, .cycle/config.md | g03 is amended in both files: the payroll predicate is the named exception. A design decision is added, with an index line. INV-378 is new and INV-183 is amended. S140 is new. The operator log gets an entry, and the running totals are updated.

TEST RESULTS: passed.
- Pure harness 1334/1334; DOM harness 254/254.
- `npm run lint:server` clean; `counts.mjs --check` clean; `split-manifest.mjs --check` current (1691 declarations).
- Visual matrix `shoot.mjs manage`, 6 scenarios (3 of them new): 0 console errors beyond the fonts line, 0 overflow, 0 runaway, 0 squeezed text, 0 missing fixtures. The wide and phone shots of the card were read by eye.
- Test Command is `manual`. S140 needs the deployed DEV instance: NOT RUN. The editor suite's new gate case was not run either.
REGRESSION RISKS:
(1) Offboarded reps in the open-punch line. An offboarded rep with an open day inside the 30-day adjust window now appears in the daily open-punch check and its 9am digest line, where they never did before. This is the intended F19 behaviour. It ages out by itself once the day leaves the window.
(2) The shared biweekly rule. `getCurrentBiweeklyRange_` now delegates to `biweeklyRangeFor_`. The arithmetic moved unchanged, and F-39 still drives it day by day against the client.
(3) Two-month Timesheet read. The card does one Timesheet range read covering about two months on every Manage Time render, lock-free. That costs the same as the accrual's reader. Past the cold-archive window it reads the archive, the same as the export.
(4) Timezone of "today". "Today" is CONFIG.TIMEZONE, which is the export's frame. A manager in another timezone may see "checked through" one day apart from their local date.
(5) Day Edit window for offboarded reps. The editable flag uses CONFIG.TIMEZONE's today, while `managerSaveDay` checks the window in the rep's timezone. At the exact window boundary a button can be refused, and the server's refusal is authoritative and named.
INVARIANTS AT RISK:
- INV-183 is amended by design, not violated: a pin holds `payrollSubjectId_` to its two callers, and the F3 tripwire still bans raw email guards.
- INV-02 / INV-136: the new endpoint is manager-gated before reads (pinned and in the omnibus).
- INV-187: a failed read is never "ready".
- g133: the day buttons carry data-* only.
- INV-185: fixtures were added, and the X1 net passes.
- INV-176: incomplete and orphan days come from the same sentinels as the accrual.
NET SCORE: 1 production fix − 0 new failure modes = 1.
- F19: YES, it would have fired this month. Any offboarding mid-period leaves the last period's open days invisible while the export ships them, and the team offboards in the normal course.
- G1: a new capability, NO.
- New failure modes: NO for both.

OPERATOR ACTIONS / DEPLOY:
- Deploy: `clasp push -f` from `web-app/`, then a New version. This ships with the E1 deploy, which is still owed. No trigger change. | BLOCKS DEPLOY: N
- Walk S140 on the DEV instance. | BLOCKS DEPLOY: N
- Tell managers that Pay Period Close sits in Manage Time → Periodic, and that offboarded reps now appear in it and in the open-punch email line. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The card informs; the manual export dialog does not warn about open days. The operator chose the standing card over the dialog. A one-line pointer in the dialog would be a small add if wanted.
- The automated export email does not list the open days it shipped. That was another option offered, and it was not chosen.
- A pending time-off request is listed but cannot be decided from the card. It points to Needs you above.
- "Warn at offboarding" was offered and not chosen. The card now catches the case after the fact instead.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
