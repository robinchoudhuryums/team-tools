---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F5 | The DeptRequests Status cell had four readers that disagreed (INV-183, on a fifth column) + the calendar's untrimmed TO.STATUS
- F2 | Break + not-clocked-in reminders fired on weekends and approved-PTO days, chimed and sticky
- F7 | The accrual PTO tile footer wrapped to two lines in the 240px desktop rail, and its MTD line REPLACED the planned/projected line
- F10 | The accrual credit ran at 6am CT — the offshore shift tail — holding the global lock through a full Timesheet read on the 1st

Files modified:
- web-app/Code.js
- web-app/script_core.html
- web-app/tc/script_timeoff.html
- test/client/run.js
- test/visual/mock.js

CHANGES:
F5 | web-app/Code.js | New `drStatus_(row)` predicate — THE one reader of the DeptRequests Status cell, trimmed + lowercased with the 'open' default the one already-correct reader applied. Four call sites routed through it: `drFindOpenRequest_` (raw `=== 'open'` → the re-send dedupe missed, opening DUPLICATE requests, INV-131 silently void), `markDeptRequestResolved_` (raw `=== 'resolved'` → the idempotence check missed, so a second click OVERWROTE ResolvedAt/ResolvedBy and re-audited), `deptRequestsOverdueOpen_` (raw → a resolved request nagged in the daily SLA digest forever), and `getDeptRequests` (already correct; moved onto the shared predicate so the property has one home).
F5 | web-app/Code.js | `buildCalendarForEmployee_` now TRIMS TO.STATUS at its single read. It lowercased without trimming, so a padded cell fell through the teammate filter AND rode to the client raw, where the calendar's `st === 'approved'` cell-class test missed it and painted a rep's own APPROVED day as pending.
F2 | web-app/Code.js | New `empIsOffToday_(empId, dateIso)` — BOUNDED (three columns via getRange, not getDataRange — INV-46) because `getEmployeeState` is the hottest endpoint (boot, every punch, the ticker's <=1/10min refresh). Approved-only, normalized status (INV-183), coercion-recovered date (INV-29), and fails toward FALSE ("not known to be off") — a missed reminder is the safe direction; a false positive would SILENCE a real one. Shipped as the additive `offToday` on `getEmployeeState`.
F2 | web-app/script_core.html | New `remindIsDayOff_(tz)` (rep-tz weekday via isoDateTz — never browser-local, the F6 discipline — OR the server `offToday`), applied PER BRANCH in `remindersTick_`: (a) break reminders and (c) the not-clocked-in nudge are suppressed; (b) the still-clocked-in nudge deliberately is NOT, because a forgotten Saturday punch is exactly when it matters. An early `return` would have taken (b) with it — caught and restructured after the first attempt contradicted its own comment.
F7 | web-app/tc/script_timeoff.html | Terse labels ("+0.46d this month" / "96h worked") replace the ones that wrapped, and the planned/projected footer is factored into `plannedFtr` and APPENDED beneath the earning line instead of being replaced by it. Projections stay out (INV-187) but PENDING days are arithmetic on existing rows and need no forecast.
F10 | web-app/Code.js | `creditMonthlyPtoAccruals` trigger moves 6am → 18:00 manager-tz, matching `archiveOldTimesheetRows`, which chose that hour for the identical lock-starvation reason (INV-153). The old comment claimed both jobs "take the lock briefly" — true on 29 days a month, false on the 1st.
F2 | test/visual/mock.js | `getEmployeeState` fixture mirrors the new `offToday` field (INV-185).

TEST RESULTS: passed.
- Pure harness: 570 passed, 0 failed (was 562; +8 tests)
- DOM harness: 75 passed, 0 failed (unchanged — no DOM-lifecycle surface touched)
- node --check: Code.js / Tests.js / DevTools.js clean
- Visual matrix: 42 scenarios, 0 missing / 0 overflow / 0 non-network console errors
- Bite-checks: 13 mutations, ALL confirmed biting (4 F5, 6 F2, 2 F7, 1 F10)
- THREE pre-existing pins were test doubles encoding the OLD behaviour and were reconciled as part of the fix, not reactively: the cycle-16 F8 pin asserted the literal raw-read spelling `getDeptRequests` used (the property is unchanged; only its spelling moved into the predicate, and the pin is now STRICTER — zero raw reads where it previously allowed one); the accrual-tile pin asserted the long labels; and my own F5 pin subtracted a write count that was never in the read set.
- F7 verified by MEASUREMENT, not screenshot: footer spans are 11px at the 240px desktop rail (were 22px = wrapped), both footers render, overflow 0 at 1440 and 390.
- Regression Scenarios walked (Test Command is `manual`): S46 PASS (Time/PTO renders, accrual tile measured, both footers present); S74 LOGIC-ONLY (the four DR readers are pinned behaviourally + by source; the end-to-end sheet walk is editor/operator-only); S76 LOGIC-ONLY (the branch gating and `remindIsDayOff_` are pinned behaviourally in a vm; a real Saturday toast+chime is an operator check — the scenario already is one); S4/S3 NOT RUN (editor-only, sheet writes); S86/S62/S64 NOT APPLICABLE (no KB change this batch).

REGRESSION RISKS:
- `offToday` is ADDITIVE and read behind an `empState &&` guard, so both deploy-skew directions degrade safely: an older client ignores it; an older server leaves it undefined and the ticker falls back to the weekend-only guard.
- The calendar now ships a TRIMMED status. All five client consumers already did `String(r.status||'').toLowerCase()`, so trimming can only make their comparisons match more often — verified by reading each.
- `getDeptRequests` still ships the same normalized `status` value it shipped before the change, so no client contract moved.
- BEHAVIOUR CHANGE worth stating: a rep who genuinely works a weekend now gets no break reminders that day. The app's own configured posture is weekdays-only (`COVERAGE_WEEKDAYS_ONLY`), and the still-clocked-in nudge remains live, but this is a real trade and belongs in the follow-ons rather than buried.
- F10 takes effect only on `installAutomationTriggers()` re-run; until then the old 6am trigger persists. Not worse, just unchanged.

INVARIANTS AT RISK:
- INV-183 is EXTENDED, not risked: the family it describes now has its fifth column closed by a predicate, which is the shape the invariant prescribes. Its text names the three raw DR sites as a known-open gap — that sentence is now stale and is listed under documentation.
- INV-190 (reminders) gains a day-off precondition; the three-channel degradation, the cross-window fired-set and the unknown-never-nags posture are untouched.
- INV-46 honored by `empIsOffToday_` (bounded read); INV-29 (coercion-recovered date); INV-187 (no projection re-added to the accrual tile — pinned).
- INV-153's quiet-window reasoning is now applied to a second job rather than contradicted by one.
- INV-185 held: the fixture was updated in the same session as the server field.
- No other invariant touched.

NET SCORE: 4 − 0 = 4
(a) Would it have fired in production this month? F5 YES on two of its four sites (a hand-edited Status cell is the documented trigger, and the SLA digest nag is permanent once it happens); F2 YES — every Saturday and Sunday for any rep with the app open; F7 YES — visible to every accruing rep at desktop width, and the dropped planned line every time they check before requesting; F10 NO in the sense of an observed outage — it is a latent lock-contention window that fires once a month at a bad hour.
(b) New failure modes introduced? None identified. The weekend-worker trade above is a deliberate behaviour change, documented, not a defect.

OPERATOR ACTIONS / DEPLOY:
- Re-run `installAutomationTriggers()` once so the PTO accrual credit moves to 18:00 (F10). Without it the old 6am trigger keeps firing — correct, just unimproved | BLOCKS DEPLOY: N
- Run `runAllTests()` from the Apps Script editor after deploying (S2 — editor-only) | BLOCKS DEPLOY: N
- Reps who WORK weekends will no longer get break reminders on those days. If any rep on this roster works Sat/Sun, say so — the guard would need a per-rep working-days source, which the roster does not currently carry | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.
(Not complete in production until the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The roster has no working-days column, so `remindIsDayOff_` infers weekends. A rep on a genuine Sat/Sun shift is mis-served. A column-O-style per-rep working-days override would close it; not built, because nothing indicates such a rep exists.
- `hasActiveTimeOffOnDate_` still reads the full TimeOffRequests sheet. `empIsOffToday_` deliberately does not reuse it (the bounded read is the point), so the two now answer adjacent questions differently. Worth unifying if a third caller appears.
- Batches 5–8 of the scan remain untouched: Batch 5 (accessibility — unnamed dialogs + ~65 unnamed controls), Batch 6 (fixture drift F14, timeoff mobile scenario F8), Batch 7 (getTeamMetrics span cap F3, ViewUsage retention F11), Batch 8 (completeness gaps).
- PROCESS: a `git checkout` bite-revert wiped the uncommitted Code.js work mid-session — the exact accident CLAUDE.md's cycle-17 note describes. Re-applied from context, then COMMITTED BEFORE bite-checking, which made the later imprecise reverts a clean `git checkout` recovery. Two of the reverse edits also matched a DIFFERENT occurrence than intended (`getDataRange()` and `</div>\``), the ambiguous-anchor half of the same documented trap.

DOCUMENTATION UPDATES NEEDED:
- INV-183: its text lists the three raw `DR.STATUS` reads as a known-open gap ("the right close is a `drStatus_(row)` predicate plus a tripwire banning the raw read — the INV-167 shape"). That is now DONE; the paragraph should record the close and add the calendar's `TO.STATUS` trim as the fourth site.
- INV-190: add the day-off precondition and the deliberate (b) exemption.
- INV-194 / the trigger list: the accrual credit is now 18:00 manager-tz, not 6am; the operator checklist's "re-run installAutomationTriggers()" line should say why.
- Operator State Checklist: `offToday` needs no operator action, but the weekend-reminder behaviour change is worth a round entry.
- Test-count narrative: pure 562 → 570.
- Time/PTO KDD: the accrual tile now renders BOTH the earning line and the planned line.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
