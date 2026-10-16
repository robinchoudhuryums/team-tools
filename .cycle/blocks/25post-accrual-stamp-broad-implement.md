---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: 25post-3 — a blank or unreadable AccruedThrough (Employees column R) SEEDED to last month and credited nothing, which is the enable-time rule but also what happened to a rep who HAD been accruing when the cell was cleared or mistyped ("2026-9"): last month was lost and no audit row said so (follow-on named by the 25post monitoring block; operator 2026-10-16: "make the blank AccruedThrough cell fix anyway")
New capabilities (G/ST): None
Files modified: web-app/20_timeclock.js, web-app/00_config.js, web-app/Tests.js, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, .cycle/config.md, .cycle/STATE.md, docs/operator-state.md, docs/operator-log.md
Estimate: NOT written before the first edit — the convention was missed this batch; retro S (~2 h), recorded as such so /reflect does not read it as a measurement
Actual: ~1.5 h

CHANGES:
25post-3 | 20_timeclock.js | `planPtoAccrualRun_` gains an optional `creditHistory(ids)`; after pass 1 it asks it ONCE, for the blank-stamp reps only, and `accrualStampRecovery_` (pure) plans a rep with history from the newest month paid for (an intact stamp is never second-guessed; a malformed history month is none). `accrualCreditHistory_` reads the side ledger and the WHOLE AuditLog newest-first in ACCRUAL_LEDGER_MAX_ROWS chunks, through `accrualHistoryScan_` (pure): the newest MONTH named wins, not the newest row (a top-up names an older month), and a rep settles once the walk is older than the 1st of best+2 less two days. An unreadable history throws — the run fails and retries, never seeds. The job writes a `PtoAccrualStamp` audit row (`accrualStampNote_`: seeded or recovered) with the cell rewrite, after the credit; the dry run plans through the same history, ships `recoveredFrom`, and prints which way each blank went.
25post-3 | Tests.js | the editor test's step 1 (blank stamp → seed) depended on the month of the test's last run once history counts; it is now step 3b — a blank stamp AFTER this run's own credit is recovered, rewritten to last month, and credits nothing twice. Registration count unchanged.
docs | 00_config.js (EMP note), operator-state col R entry, operator-log, INV-385 | the blank-stamp rule as it now is.

TEST RESULTS: Node 1378/1378; DOM 264/264; lint:server clean; split-manifest current; counts --check agrees (pure harness 1378, invariants 371); cycle-closeout --check in step. Four new pins; nine mutations, all bitten by their own pin (F2c excluded from the verdict): the planner ignoring recovery, first-hit-wins, settling a month early, asking for every rep, no stamp row, a swallowed history failure, a malformed history accepted, a silent dry run, an intact stamp second-guessed. The editor suite's step 3b runs on the next DEV nightly / editor run (not runnable here).
Regression scenarios (Test Command manual): walk at deploy — clear a TEST rep's column R after a credit and run `previewPtoAccruals()`: it names the recovery; the next run rewrites the cell and the AuditLog carries a PtoAccrualStamp row.
REGRESSION RISKS: a rep whose cell was blanked ON PURPOSE to restart accrual from now is now planned from their history instead — the documented lever for "skip" is a FORWARD stamp (unchanged), and the PtoAccrualStamp row names what happened. The full AuditLog walk runs only when an accruing rep's stamp reads blank, inside the credit's ScriptLock — rare, but on a very large log it is a longer hold than the tail read.
INVARIANTS AT RISK: INV-205 (idempotent on hours paid) — kept: recovery plans from the newest month PAID FOR, so nothing is credited twice; INV-194 (in arrears) — unchanged.
NET SCORE: 0 − 0 = 0 (latent: no blank stamp is known to have fired; the operator's check of PH0001/PH0002 column R is still open)

OPERATOR ACTIONS / DEPLOY:
- None new | BLOCKS DEPLOY: N
- Still open: PH0001/PH0002 column R and `previewPtoAccruals('2026-09')` — after this deploy, `previewPtoAccruals()` also says whether a blank cell would be recovered or seeded | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version

FOLLOW-ON ITEMS:
- None

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
