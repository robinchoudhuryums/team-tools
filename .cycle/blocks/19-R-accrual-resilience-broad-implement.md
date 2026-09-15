---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: R1 — the accrual credit closed each month permanently at the first run after the 1st, so late Timesheet data (a missing-punch adjustment approved days later, a manager day edit, a direct Sheet edit) was silently lost behind the column-R stamp. R2 — the ledger of what has already been credited, derived from the PtoAccrualCredit audit rows. R3 — detection: reconciliation reported in previewPtoAccruals and surfaced as Automation Health findings. R4 — the regression test that replays the live 2026-08 sequence.
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/Tests.js, test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md

Estimate: M (~4–5 h) — recorded 2026-09-15 in STATE.md BEFORE the first edit
Actual: ~3 h

CHANGES:
R1 | web-app/20_timeclock.js, web-app/00_config.js | The credit is idempotent on HOURS ALREADY PAID FOR rather than on "this month was processed". Every run re-values a trailing window (PTO_ACCRUAL_RECONCILE_MONTHS = 3) of completed months and credits the difference in DAYS, so the running total always equals days(total hours) and a re-run credits nothing. planAccrualReconcile_ is pure and returns one of four verdicts — topup / ok / shortfall / skipped. Only `topup` reaches adjustLeaveBalance_. A shortfall (fewer readable hours than were credited) is REPORTED, never clawed back. A month-set outside the window, hours that will not compute, and a truncated ledger read all FAIL CLOSED.
R2 | web-app/20_timeclock.js | The ledger is the PtoAccrualCredit audit rows themselves — no new tab, no new store that can disagree with the log. Two costs paid explicitly: the note format is now a CONTRACT, so accrualCreditNote_ / accrualZeroNote_ / accrualTopUpNote_ and parseAccrualLedger_ are a mirror pair with a round-trip pin; and the row is load-bearing, so all three accrual writes moved from writeAuditLog_ (fire-and-forget) to writeWitnessAuditLog_. readAccrualLedger_ reads a BOUNDED tail (ACCRUAL_LEDGER_MAX_ROWS) and reports `truncated` when it could not reach past the window.
R1b | web-app/20_timeclock.js | Cost control: the reconcile window rides the resolver's EXISTING range rather than opening a second full-sheet read inside the ScriptLock (the C17-9 / INV-153 rule). Pass 3's range-wide fast path (`if (p.months.length === 1) use rec.hours`) is REMOVED — it was correct only while the range WAS the single owed month, and the window widened it.
R3 | web-app/20_timeclock.js, web-app/10_core.js | previewPtoAccruals gained a Reconcile section listing what the next run would top up, what it would skip and why. creditMonthlyPtoAccruals stamps PTO_ACCRUAL_RECONCILE (bounded per INV-201, degrading one detail entry at a time); automationProblems_ turns shortfalls, skipped month-sets, a truncated ledger read and days still lacking a usable clock-in/clock-out pair into health findings. A top-up is NOT reported as a problem — it is the system working.
R4 | web-app/Tests.js, test/client/run.js | Editor test accrualReconcile_topsUpLateData replays the live sequence: open day credits zero and the stamp closes the month → the approval lands late → the next run TOPS UP → a re-run does not → a deleted punch reports instead of clawing back. Node pin "R:" drives all four verdicts, the round-trip mirror, the window (year boundary, current-month exclusion), and the structural rules.

TEST RESULTS: passed. Pure harness 824/824 (was 823 — one new pin), DOM harness 113/113, `node scripts/counts.mjs --check` green, `node scripts/split-manifest.mjs --check` green (1224 declarations). Editor suite registrations 319 → 320 (derived; a run prints its own Expected line).
Bite-checks — EIGHT written, EIGHT bite: C1 every verdict becomes a top-up (a shortfall would claw back) · C2 an out-of-window month is valued instead of skipped · C3 an unreadable note reads as never-credited · C4 the ledger keeps the last hours instead of the max · C5 the reconcile opens its own Timesheet read · C6 the ledger read goes back to the whole sheet · C7 an accrual row goes back to fire-and-forget · C8 the note stops carrying the months it covered.
TWO DEFECTS THE PINS CAUGHT DURING THE WORK, both mine: parseAccrualLedger_ read capture group 2 of a one-group regex (it would have returned undefined for every months list, i.e. no ledger at all); and three deepStrictEqual comparisons compared vm-realm Array prototypes rather than values.

REGRESSION SCENARIOS (Test Command is `manual` — this container has neither the Apps Script editor nor a browser):
- S1 Smoke test suite | Subsystem: Test Suite | NOT RUN HERE — editor-only. Owed by the operator after the push.
- S2 Full integration test suite | Subsystem: Test Suite | NOT RUN HERE — editor-only. This is where accrualReconcile_topsUpLateData actually executes; it is the acceptance test for this batch.
- S107 PTO accrual dry run | Subsystem: Server | NOT RUN HERE — editor-only. Its Expected text is unchanged; the preview gains a Reconcile section below it.
- S108 PTO accrual reconciliation (NEW this batch) | Subsystem: Server | NOT RUN HERE — editor-only. Written as the walk for this change.
- S15 Per-employee PTO toggle | Subsystem: Server, Client | NOT APPLICABLE — the per-row PTO gate moved verbatim into the resolver in an earlier batch and is untouched here; a FALSE rep is still skipped before any reconcile entry exists for them.
- S97 Admin → System is findings-first | Subsystem: Client (Call Notes views) | NOT RUN HERE — browser-only. AT RISK and worth walking first after deploy: automationProblems_ gained four new finding shapes, and the visual fixture was extended to match (INV-185).

REGRESSION RISKS:
- automationProblems_ now emits findings from a property that did not exist before. On a deployment where PTO_ACCRUAL_RECONCILE is absent the block is skipped entirely (`if (ar)`), so Admin → System is unchanged until the first credit run stamps it. Walk S97 after the first 18:00 run, not before.
- The daily credit now reads the Timesheet EVERY day (previously only when a month was owed) plus a bounded AuditLog tail. Both are inside the existing ScriptLock at 18:00 manager-tz, the documented all-team quiet window. This is a real cost increase and was taken deliberately over a day-of-month cadence, so that a fix lands the next night rather than the next month.
- The removed range-wide fast path was a correctness fix, not a regression risk: with the widened range it would have credited three months of hours against one month's ledger.

INVARIANTS AT RISK: none violated. INV-01 (the whole pass runs inside the existing lock), INV-27 (credits go through adjustLeaveBalance_), INV-44 (no new public surface — the reconcile is private to the already-gated credit), INV-176/187 (a null from accrualDaysForHours_ is a `skipped` verdict, never a zero), INV-201 (the new stamp writes through propSetBounded_ with a monotonic shrinker), INV-185 (the visual fixture was extended in the same commit), C17-9/INV-153 (still exactly one range index build per run) all hold and are pinned.

NET SCORE: 1 − 0 = 1
  a) Would this have fired in production this month? YES — it already did, on 2026-09-01, costing all three PH reps their August accrual.
  b) New failure mode? NO. The reconciliation only ever credits upward, fails closed on anything it cannot value, and its cost is bounded by construction. The one behaviour change a reader should know about — two audit rows for a month that gains hours — is intended and self-describing.

OPERATOR ACTIONS / DEPLOY:
- `clasp push -f` + cut a New version. | BLOCKS DEPLOY: Y (nothing in this batch is live until pushed)
- Run `runAllTestsPartA` / `runAllTestsPartB` on the deployment; registrations should read 320. | BLOCKS DEPLOY: N (it is the acceptance test, and S2 is owed)
- After the first 18:00 credit run, walk S97 (Admin → System) and S108. | BLOCKS DEPLOY: N
- No Script Property to set. PTO_ACCRUAL_RECONCILE is auto-managed — delete it only to clear a stale flag. | BLOCKS DEPLOY: N
Deploy: Server — `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- PREVENTION is still missing. This batch RECOVERS from late data; it does not stop a day sitting open for a week in the first place. A month-end check (last day of the month and again on the 1st) reporting reps with incomplete days in the closing month would catch it prospectively. Deliberately out of scope here — it needs its own trigger or a dispatcher slot, and the trigger quota is 16 of 20.
- The 2026-07 seed month was never credited for any PH rep (blank column R seeds by design). If the operator wants the ramp-up period reflected, that is a manual column-I correction, not something this pass will ever do.
- ACCRUAL_LEDGER_MAX_ROWS (5000) is a bare constant. If the AuditLog grows such that `truncated` starts firing routinely, the fix is a date-bounded read rather than a bigger cap.

DOCUMENTATION UPDATES NEEDED: none outstanding — applied in this batch. Gotcha g115 (index + narrative), INV-205, regression scenario S108, a Key Design Decision entry (+ index line), the column-R operator entry, a dated operator-log round, and PTO_ACCRUAL_RECONCILE in CLAUDE.md's auto-managed diagnostics list.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
