---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Batch 7 FU1 (Low) — `updateTimeOffStatus` re-read the whole TimeOffRequests tab for its duplicate-date check, inside the lock, although it already held the rows; the client's bulk time-off approve fires one such call per row (the F62 class)
- Batch 7 FU2 (Low) — adding a biweekly rep to a roster with no pay anchor was silent, and that rep then had no biweekly period (the calendar month on Time / PTO; the biweekly export has no period)
- Batch 7 FU3 (Low) — nothing reported how much of the Script Property store the F17 per-rep accrual side copies use, though they grow with the roster
New capabilities (G/ST): None
Files modified: web-app/10_core.js, web-app/20_timeclock.js, web-app/cn/script_callnotes.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: S (~2 h) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~1 h

CHANGES:
FU1 | web-app/20_timeclock.js | `updateTimeOffStatus`' approve-transition dup guard reads `timeOffActiveDates_(rows, empId, i)[date]` — the rows this call already read, its own row excluded (cycle-11 M-1) — instead of `hasActiveTimeOffOnDate_(sheet, …)`, a second full read in the lock
FU2 | web-app/20_timeclock.js | `empValidateNewEmployee_` returns an `anchorWarning` for a biweekly rep with no anchor of their own when the roster has none (`ctx.hasBiweeklyAnchor`), naming the fix (column F on ONE biweekly row, the first day of a pay period); `addEmployee` carries it onto its result. The add itself is unchanged
FU2 | web-app/cn/script_callnotes.html | the onboarding submit shows the warning as a sticky warn toast beside the usual success or provisioning toast
FU3 | web-app/10_core.js | `scriptPropertiesStatus_` adds `accrualLedger: {count, bytes}` — the `PTO_ACCRUAL_LEDGER_<empId>` keys and values, the `…_SINCE` marker excluded; still read-only, values counted and never returned
FU3 | web-app/cn/script_callnotes.html | new `cnPropLedgerNote_(ps)` (' · PTO accrual ledger copies: N reps, X bytes', '' when none or an older server); the Storage Health Script Properties line (escaped) and the Admin System finding detail both carry it
Tests | test/client/run.js | new driven pins "Batch 7 FU1" (through the real TC-04 time-off harness: a Denied row approved over another Pending row is refused with one read of the tab; a lone Pending row is not blocked by its own row, one read), "Batch 7 FU2" (the validator over five cases; the add's carry; the client's sticky toast), "Batch 7 FU3" (the status over a fake store; the clause; both call sites). Old-shape doubles updated: the structural `updateTimeOffStatus` dup-guard pin (now reads the rows), the TC-04 harness (loads `timeOffActiveDates_` — its stub `hasActiveTimeOffOnDate_: () => false` had meant the approve path's dup guard was never exercised there; it is real now), Q-3 (the two ledger constants in its sandbox). Bite-checked by hand, one site each: FU1 back to the re-read; FU1 own row not excluded (a NO BITE at first — the lone row in the fixture was Denied, which can never block itself; the fixture now uses a Pending row and the mutation is red); FU2 never warns; FU2 ignores the roster's anchor; FU2 not carried out; FU3 counts the SINCE marker; FU3 dropped from the finding — all seven red
Docs | docs/gotchas.md, .cycle/config.md, CLAUDE.md | g17 (FU1), g29 (FU2) and g152 (FU3) narratives amended; INV-94 (FU1) and INV-18 (FU2) amended; running totals updated

TEST RESULTS: passed — pure harness 1299/1299, DOM harness 250/250, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current (1652 declarations). Visual matrix `shoot.mjs admin` (19 scenarios): 0 console errors, 0 horizontal overflow, 0 missing fixtures. Test Command is `manual`: the touched scenarios (S46 for the pay period, the Admin Storage Health and onboarding scenarios) need the deployed app — NOT RUN here, owed to the operator after deploy.
REGRESSION RISKS: (1) FU1 — none in behaviour: the rule is the same predicate over the same rows (read once instead of twice inside the same lock). (2) FU2 — an admin adding several biweekly reps before setting an anchor sees the warning on each add, which is the intent. (3) FU3 — the Storage Health line is a clause longer when accrual copies exist.
INVARIANTS AT RISK: None violated — INV-94 (amended; same guard, own row still excluded — now driven), INV-18 (amended), INV-187 / Q-3 (a failed store read is still `bytes: null`; `accrualLedger` stays null with it), INV-136 (onboarding still admin-gated; the warning rides the existing result).
NET SCORE: 0 − 0 = 0 (FU1 NO — a latency risk under contention, no timeout reported; FU2 NO — the live roster has an anchor; FU3 NO — a reporting gap, the store is far from its cap; no new failure mode)

OPERATOR ACTIONS / DEPLOY:
- Walk S46 and the Admin Storage Health / onboarding scenarios on the deployed app | BLOCKS DEPLOY: N
Deploy: Server + Client (Call Notes views — the Admin tab): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- `hasActiveTimeOffOnDate_` still has two single-date callers (`submitTimeOffRequest`, `managerSubmitTimeOff`), each one read per call — correct and not amplified, left as is
- The onboarding form could also say so BEFORE the add (the panel already ships `hasBiweeklyAnchor`); the warning after the add is what this follow-up shipped
(see also the Batch 7 block)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (g17, g29, g152, INV-94, INV-18, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
