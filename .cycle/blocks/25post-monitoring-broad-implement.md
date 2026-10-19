---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: 25post-1 — a digest or job that a deploy (or a setting) newly puts under watch was judged from the trigger install / the AuditLog window, so the first health email after the cycle-25 deploy said "the trigger may be missing" for the new Spanish escalation digest and the newly always-on diagnostics purge; 25post-2 — the monthly accrual line said "has not run this month — the trigger may be missing" although the job had run in October and written no credit row (operator 2026-10-16, from the post-deploy health email)
New capabilities (G/ST): None
Files modified: web-app/00_config.js, web-app/10_core.js, test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json, CLAUDE.md, .cycle/config.md, .cycle/STATE.md, docs/gotchas.md, docs/operator-state.md, docs/operator-log.md
Estimate: S (~2 h) — written before the first edit, 2026-10-16
Actual: ~1.5 h

CHANGES:
25post-1 | 00_config.js, 10_core.js | `AUTOMATION_WATCH_SINCE` ({'digest:<key>' | 'job:<action>': ms}) — `automationWatchMerge_` (pure) keeps it to the current set: the first record seeded with the install time, a new key gets now, a key whose check is disabled is dropped; `automationWatchSince_` writes only on change. computeAutomationHealth_ watches every digest and every enabled job; a digest's "never ran" counts from the later of install and first watch; the report ships `watchSince`. automationJobProblems_: a daily job's "no run on record" waits out its stale window from its first watch; a monthly job first watched this month makes no claim.
25post-2 | 00_config.js, 10_core.js | AUTOMATION_JOB_CHECKS entries may carry `ranAt` + `noRowHint`; the accrual's `ranAt` is the reconcile stamp's `at` (rewritten on every path). The report ships `jobRanAt`; a monthly job that RAN this month without its row reads "ran on <when> but wrote no row this month, so its trigger is running — <hint>" (check AccruedThrough column R, a blank cell is seeded without crediting; run previewPtoAccruals('<last month>')), never "re-run installAutomationTriggers()".
tests | run.js, mock.js, manifest | six 25post pins (merge, writer, daily gate, monthly lines, the real table entry incl. January → December, the report wiring driven through automationProblems_); the getAutomationHealth fixture carries the two new keys (INV-185); the F60 pin follows the anchored call; manifest regenerated.

TEST RESULTS: Node 1374/1374; DOM 264/264; lint:server clean; split-manifest current; counts --check agrees (pure harness 1374, invariants 370); cycle-closeout --check in step; visual `shoot.mjs admin-system` — 11 scenarios, no missing fixture, overflow, runaway, squeezed text or page error. Bite-checked (scratch copy, F2c's manifest failure excluded from the verdict): all 9 mutations caught by their own 25post pin — the daily watch gate, the ran-without-row branch, the monthly first-watch skip, seeding with now, a dropped key not counted as a change, writing on every read, watching disabled jobs, a dead `ranAt`, the January year.
Regression scenarios (Test Command manual): the Automation Health walk is owed at deploy — the next health email after the deploy should carry no "trigger may be missing" line for spanishEscalation or the diagnostics purge once each has run, and the accrual line, if still present, should read "ran on … but wrote no row".
REGRESSION RISKS: a job enabled by a setting is not alarmed on for its stale window (30h daily; the rest of the month for a monthly job first watched after its 1st) — deliberate, and a run on record that goes stale still alarms. A failed property write re-stamps later, which only widens a window. The health read now writes one Script Property when the watched set changes (not on every read).
INVARIANTS AT RISK: None — INV-384 written; INV-383 (the reflect's proposal) added to the HELD NUMBERS line.
NET SCORE: 2 − 0 = +2 (both fired in production on 2026-10-16: the operator's first post-deploy health email carried all three lines)

OPERATOR ACTIONS / DEPLOY:
- None new — `AUTOMATION_WATCH_SINCE` is auto-managed | BLOCKS DEPLOY: N
- Still open from the health email: check PH0001/PH0002 AccruedThrough (column R) and run previewPtoAccruals('2026-09') — September may not have been credited | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version

FOLLOW-ON ITEMS:
- A blank AccruedThrough cell is SEEDED to last month without crediting it — a rep whose column R is blanked loses that month silently (the audit row says nothing). Worth its own look if the operator's check finds a blank cell.

DOCUMENTATION UPDATES NEEDED:
- None (g142 amended in the index and the narrative, operator-state run-ledger entry, operator-log entry, the CLAUDE.md auto-managed list, INV-384)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
