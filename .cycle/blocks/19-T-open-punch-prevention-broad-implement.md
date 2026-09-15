---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T1 — nothing warned that a punch was sitting open; the in-progress month had NO open-punch visibility at all, because the accrual only ever looked at months it owed. T2 — the warning needed a daily home without growing the trigger count. T3 — the two bounds that keep such a report worth reading. T4 — a failed scan must not read as a clean board.
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/Tests.js, test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md

Estimate: M (~4 h) — recorded 2026-09-15 in STATE.md BEFORE the first edit
Actual: ~2.5 h

CHANGES:
T1 | web-app/20_timeclock.js | `checkOpenPunches` + the pure `planOpenPunchCheck_`. Walks the WHOLE roster via `empRosterEmail_` (INV-183) — an open day breaks the ADP export, the pay statement and the punctuality report long before it touches PTO, so it does NOT consult `enablePtoTracking` and does not skip reps without an accrual rate. Reuses `workedHoursByEmpForRange_`, so "a broken day" means the same thing it means to the accrual, and distinguishes a missing clock-out from an orphan clock-out because the remedies differ. READ-ONLY: no ScriptLock, no cell, no audit row.
T2 | web-app/00_config.js, web-app/10_core.js | A new `runDailyChecks` dispatcher at 8am manager-tz. `sendCallNotesUrgentDigest` moved out of its own standalone trigger into it, so the installed count is UNCHANGED against the quota that already bit this deployment on 2026-09-11; `RETIRED_TRIGGER_HANDLERS` is derived, so a re-install removes the old trigger by itself. The 8am/9am gap is the wiring: the scan stamps, and `sendAutomationHealthDigest` reads that stamp an hour later, so a finding reaches a manager by email without this job sending mail of its own.
T3 | web-app/20_timeclock.js | Both bounds chosen rather than inherited. The window ENDS `OPEN_PUNCH_GRACE_DAYS` (2) before today — a rep clocked in now is open by definition, and a rep twelve hours ahead of the manager anchor looks open for most of a manager's day. It STARTS at `CONFIG.ADJUST_WINDOW_DAYS`, because past it `managerSaveDayRange` and the adjustment queue both refuse the date and the finding would name a remedy that does not exist; days within `OPEN_PUNCH_EXPIRING_DAYS` of crossing get their own sharper line.
T4 | web-app/20_timeclock.js, web-app/10_core.js | The catch stamps the FAILURE into `OPEN_PUNCH_CHECK`, and `automationProblems_` renders "the scan could not run … an empty open-punch list below is NOT a clean board". Deliberately NOT `stampAutomationError_`: that map is cleared by a registered job's next clean run, and this job writes no audit row (so it is correctly outside `AUTOMATION_JOB_CHECKS`) — an entry there would be unclearable.
T5 | test/client/run.js | Three pins were RESTATING counts this batch legitimately changes (three dispatchers, eight retired handlers, a pre-fix set of 21). All three now derive from `TRIGGER_GROUPS`, parsed ONCE at module scope instead of twice. The historical 21 is deliberately not re-derived — a job added later was never in that set, and the load-bearing claim is that expanding the dispatchers exceeds the quota.
T6 | web-app/00_config.js | `AUTOMATION_TRIGGER_QUOTA` moved back beside its own explaining comment, which the previous batch's insertion had separated it from.

TEST RESULTS: passed. Pure harness 825/825 (+1 pin), DOM 113/113, `counts.mjs --check` and `split-manifest.mjs --check` green. Editor registrations 320 → 322 (gates on BOTH `checkOpenPunches` and `runDailyChecks` — a dispatcher's gate does not stand in for its job's).
Bite-checks — SIX written, SIX bite: T1 the tail grace is dropped (a rep mid-shift is reported) · T2 the lookback stops deriving from the adjust window · T3 a failed scan leaves the last clean result standing · T4 the check takes the ScriptLock · T5 the orphan kind is flattened away · T6 it starts consulting the PTO flag.
TWO THINGS THE BITE-CHECKS AND PINS CAUGHT, both mine, both recorded as g116 cases an hour before they happened: the T2 assertion matched a bare `CONFIG.ADJUST_WINDOW_DAYS` that also appears in the stamp's window block, so a mutation replacing the lookback with a hard-coded 90 days left the harness green (tightened to pin the derivation); and a new TQ-3 assertion used `deepStrictEqual` against an array returned from the vm, which compares realms rather than values.

REGRESSION SCENARIOS (Test Command is `manual` — this container has neither the Apps Script editor nor a browser):
- S109 Open-punch prevention (NEW this batch) | Subsystem: Server | NOT RUN HERE — editor-only. Written as the walk for this change; its last step is the trigger count, which is the claim most worth verifying on the real deployment.
- S1 / S2 | Subsystem: Test Suite | NOT RUN HERE — editor-only. S2 is where the two new gate tests execute.
- S97 Admin → System is findings-first | Subsystem: Client (Call Notes views) | NOT RUN HERE — browser-only. AT RISK: `automationProblems_` gained three more finding shapes and the visual fixture was extended to match (INV-185).
- S107 / S108 (accrual preview + reconciliation) | Subsystem: Server | NOT APPLICABLE — untouched by this batch; the shared reader `workedHoursByEmpForRange_` is read-only here and its signature is unchanged.

REGRESSION RISKS:
- THE TRIGGER INSTALLER IS THE RISK. `sendCallNotesUrgentDigest` no longer owns a trigger. Until `installAutomationTriggers` is re-run on the deployment, the old standalone trigger still exists AND `runDailyChecks` does not, so the urgent digest keeps working but the open-punch scan never runs. After the re-run both are correct. The count is unchanged either way, so the quota cannot be hit by this change.
- `automationProblems_` emits from a property that does not exist yet; the block is skipped entirely (`if (op)`) until the first 8am scan stamps it. Walk S97 after that scan, not before — a clean panel beforehand proves nothing.
- One more full Timesheet read per day, at 8am, WITHOUT the lock. It cannot starve a punch.

INVARIANTS AT RISK: none violated. INV-44 (both the job and the dispatcher carry their own gate, both pinned in the editor suite), INV-183 (the roster walk uses the one predicate), INV-185 (fixture extended in the same commit), INV-201 (the new stamp writes through `propSetBounded_` with a monotonic shrinker), and the trigger-quota rules (count-neutral, `RETIRED_TRIGGER_HANDLERS` still derived, no name in both a group and TARGETS) all hold and are pinned.

NET SCORE: 1 − 0 = 1
  a) Would this have fired in production this month? YES — it already did: three reps' August days sat open through the month close, and no surface said so.
  b) New failure mode? NO. The scan is read-only, unlocked, count-neutral on the quota, and fails toward a stated failure rather than a clean board. The one operational obligation it creates — re-run the installer — is listed below and is the same step every trigger change in this project has required.

OPERATOR ACTIONS / DEPLOY:
- `clasp push -f` + cut a New version. | BLOCKS DEPLOY: Y
- **Re-run `installAutomationTriggers`.** Without it `runDailyChecks` does not exist and the scan never runs. The count it reports should be unchanged. | BLOCKS DEPLOY: Y (the feature is inert otherwise)
- After the first 8am scan, walk S109 and S97. | BLOCKS DEPLOY: N
- No Script Property to set. `OPEN_PUNCH_CHECK` is auto-managed. | BLOCKS DEPLOY: N
Deploy: Server — `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- A day that ages PAST the adjust window stops being reported, by design — the in-app remedy is gone. Nothing currently records that it aged out unfixed, so a day can leave the report without ever being dealt with. A "left the window unfixed" counter would close that, and is the honest remaining hole in this batch.
- `OPEN_PUNCH_GRACE_DAYS` (2) is a global constant applied to a roster spanning Asia/Manila to America/Chicago. It is deliberately generous; a per-rep-timezone end bound would be sharper and is not worth the complexity yet.
- The check reports; it does not nudge the REP. A per-rep notice ("you have an unclosed day") would fix more of these before a manager ever sees them, and the shell already has the reminder machinery.

DOCUMENTATION UPDATES NEEDED: none outstanding — applied in this batch. Gotcha g117 (index + narrative), INV-206, regression scenario S109, a dated operator-log round, and `OPEN_PUNCH_CHECK` in CLAUDE.md's auto-managed diagnostics list.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
