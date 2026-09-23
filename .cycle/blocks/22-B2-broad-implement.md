---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- T1 (High) — Day Edit round-trips a break the rep is ON (an open LunchOut) instead of deleting it
- T3 (Medium) — a resume approved after its day has ended closes the day with the rep's filed finish; a past-day resume with no finish is refused
- T2 (Medium) — the two Timesheet repair tools re-verify their planned rows inside the lock and write nothing if one moved
- T6 (Low-Medium) — the sheet doctor no longer collapses a finished break when the rep is on another one
- C1 (Medium-High, latent) — the archive mover grows the archive grid's rows before its positional write (both tiers)
- C5 (Low-Medium, latent) — the retention purge keeps a spare row so it never asks Sheets to empty the grid

Files modified:
- web-app/20_timeclock.js (breakOpenLeave_, openBreak on the day shape; T3 attach/approve/email/queue payloads, parEndTime_; repairRowsMoved_ + both repair tools; tsDoctorLegitBreaks_)
- web-app/00_config.js (PAR.END_TIME + 'EndTime' header)
- web-app/10_core.js (purgeSheetRowsOlderThan_)
- web-app/30_callnotes.js (archiveSheetRowsOlderThan_)
- web-app/tc/script_manager.html (Day Edit prefill; resume card copy)
- web-app/tc/script_clock.html (pending resume chip; Adjust toast)
- web-app/Tests.js (new test_managerSaveDay_openBreakRoundTrips; test_punchAdjust_resumeConvertsClockOut rewritten to the T3 flow)
- test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/client/server-split-manifest.json
- CLAUDE.md (running totals: pure 941 → 945, DOM 145 → 146, editor 337 → 338)
- .cycle/STATE.md, .cycle/blocks/22-B2-broad-implement.md
Estimate: M (~11.5 h) — T1 M 3h · T3 M 3h · T2 S 1.5h · T6 S 1.5h · C1 S 1.5h · C5 S 1h
Actual: ~4.5 h (T3 grew: the batch plan's "refuse or free the dup guard" could not be right on its own — the finish had to ride the resume request)

CHANGES:
T1 | 20_timeclock.js, tc/script_manager.html, Tests.js, run.js, runDom.js, mock.js | `breakOpenLeave_(lunchOut, lunchIn, clockInMins)` — the latest leave after every return, on breakPairs_' clock-in anchor (overnight-safe) — ships as the day's `openBreak`; `deSetBreaksFromDay_` renders it as a trailing half row, which managerParseBreakSlots_ already accepts as an open break and managerPlanDay_ leaves untouched. Before, a manager saving the day of a rep on lunch deleted the LunchOut (rep flipped to "clocked in", LunchIn refused, lunch paid). Pinned: Node end-to-end (server shape → prefill rule → parser → plan: no deletion, no re-add; overnight both ways), DOM (the real prefill + read-back; the empty state is not shown for a rep on lunch), editor (real read endpoint + real save: both leaves survive). Visual fixture carries `openBreak: null`.
T3 | 00_config.js, 20_timeclock.js, tc/script_manager.html, tc/script_clock.html, Tests.js, run.js, runDom.js, mock.js | PAR gains a trailing self-healing `EndTime`. A Clock Out filed (Adjust) for a day whose RESUME is pending ATTACHES to that request as its finish (refused before as a duplicate; a finish ≤ the resume time is refused by name) — one request, so approval order cannot matter. Approval: `resumeShiftForEmployee_` refuses a past-day resume with no finish BEFORE any write (naming the way out), refuses a finish ≤ resume time, and after converting writes the finish as the new Clock Out. `parEndTime_` reads '' for absent/blank/short-row/junk (normalizeTime_(undefined) is the string "undefined"). The manager card, the rep's pending chip (never naming the consumed Clock Out), the Adjust toast and the approval email state which case applies. The editor resume test had asserted the INCOMPLETE day as correct; it now drives refuse → attach → approve and asserts an 11 h complete day.
T2 | 20_timeclock.js, run.js | `repairRowsMoved_(rows, expected)` (pure): repairTimesheetTimezone and repairSplitDayPunches re-read INSIDE the lock and throw "Refusing: N planned row(s) changed…" — nothing written — unless every planned row (and each add's existing row) still holds exactly the planned punch. Pinned driven (a shifted and a vanished row are named) + wiring (lock → verify → guarded refuse → first write in both tools; a NO BITE on the first form of the pin led to asserting the throw is guarded by `drift.length`). TZR-4's "ONE Timesheet read" now states the second read is verification only.
T6 | 20_timeclock.js, run.js | `tsDoctorLegitBreaks_`: one leave more than returns, where the extra leave is the OPEN break (breakOpenLeave_ — the rule Day Edit shares), is legal data; a double-punched leave stays damage. The A3 pin's E2 case had encoded the defect as correct; it now states the open-break reading and adds both double-punch shapes. An unreachable `li.length >= 1` guard was removed after a NO BITE (g138).
C1 | 30_callnotes.js, run.js | `archiveSheetRowsOlderThan_` grows the archive grid's ROWS before `getRange(lastRow+1, …)` (it grew only columns): a new archive tab's 1000-row grid threw on the first run with 1000+ eligible rows — nothing lost, but the rep was skipped nightly and the audit read smaller. Shared by the CN and Timesheet tiers. The pin's fake archive is now a real small GRID that throws past its edge.
C5 | 10_core.js, run.js | `purgeSheetRowsOlderThan_` inserts a spare row when the purge would delete every non-frozen row — the archive mover's guard. It threw on the LAST delete after N-1 PHI rows were gone, and the audit under-reported. Used by the CN live/cold purges and the forms purge. Pinned driven against a grid that refuses the final delete as Sheets does.

TEST RESULTS: pure 945/945 (+4 new pins, 4 updated), DOM 146/146 (+1 new, 1 extended), `lint:server` clean, `counts --check` clean. Visual matrix re-shot: 114 scenarios, 0 px overflow anywhere; the only missing fixtures are the 16 pre-existing Admin ones (X1, Batch 5); the Manage shot shows the resume card reading "back at 19:00 · finished 21:15". 17 bite-checks: 17 BITE after two follow-ups (T1 ×4, T3 ×4, T2 ×4, T6 ×2, C1 ×1, C5 ×2); the two NO BITEs were acted on (a strengthened T2 guard assertion; a deleted unreachable T6 guard). Editor suite NOT run (one new test + one rewritten; registrations now 338).
Regression scenarios (Test Command `manual`) overlapping this batch — S3 (golden path), S7 (Day Edit), S92 (approved adjustment), S106 (diagnostics purge), S109 (open-punch scan) and the Doctor/retention paths — all NOT APPLICABLE here (need the editor or the live app); the walk is under OPERATOR ACTIONS.

REGRESSION RISKS:
- T1: an unpaired leave that is NOT trailing (damaged data, e.g. leaves [10:30, 12:30] with a return at 12:45) is still not shipped, and Day Edit still removes it on save as before; a trailing leave on a CLOSED past day (forgot LunchIn) now shows as an open half row the manager can complete — previously it was silently deleted.
- T3: a same-day approval with no finish is unchanged (the rep clocks out live). A rep who never files a finish leaves a past-day resume unapprovable — by design, the manager denies it. The manager's approve-all will now report that one as a per-row failure with the reason.
- T2: a busy mid-shift run can now refuse and ask for a re-run where it used to (sometimes) corrupt; refusal is the intended trade.
- T6: a day with leaves [12:00, 17:00] and return [12:30] where 17:00 really was a double-punch of 12:00 (not plausible — 5 h apart) is now treated as an open break rather than collapsed.

INVARIANTS AT RISK: None broken. g14 (append order) — breakOpenLeave_ sorts by the clock-in-anchored key like breakPairs_. g15 (Day Edit reconciles) — the plan is unchanged; only its input is complete. g10 (HH:mm coercion) — EndTime is read through normalizeTime_ inside parEndTime_. g17 (lock) — T2's verification runs inside the lock; no new writer outside it. g127 (equal-minute) — untouched.

NET SCORE: 1 production fix − 0 new failure modes = +1. T1 fired whenever a manager saved Day Edit for a rep on lunch — a routine action (confirm against the AuditLog: a `PunchDelete` of a LunchOut on the current day by a manager). T3 fires on any resume approved the next day (plausible, unconfirmed); T2, T6, C1, C5 are latent or conditional (retention/archive are off by default; the repair tools are editor-run). Scored conservatively; the reflection should check the AuditLog for T1 and T3 firings before re-scoring.

OPERATOR ACTIONS / DEPLOY:
- Deploy (rides with Batch 1 and S2) | BLOCKS DEPLOY: N
- Post-deploy walk: (1) S7 — a rep punches ClockIn, LunchOut (on lunch); a manager opens Day Edit from Live Status → the break list shows the leave with an empty return; change the clock-in by a minute and save → the rep is still "On lunch" and can punch LunchIn; (2) T3 — a rep clocks out, resumes (Resume shift), then later files Adjust → Clock Out with their finish → the toast says it was added to the pending resume; the manager card reads "finished HH:mm"; approve → the day shows the break and the finish, complete; a resume with no finish approved next day is refused with the reason; (3) editor `runAllTestsPartA`/`PartB` on the DEV instance (or smoke on prod) → Failed: 0, including `managerSaveDay_openBreakRoundTrips` and the rewritten `punchAdjust_resumeConvertsClockOut` | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- `51_spanish.js` auto-assign writes its claim batch with `getRange(getLastRow() + 1, …)` — the C1 class: once SpanishClaims passes its 1000-row grid, every auto-assign run throws. One-line fix (grow first, or appendRowsTextSafe_-style); not in this batch's scope.
- T1: a NON-trailing unpaired leave (damage) is still dropped from the Day Edit prefill and deleted on save; showing it (or refusing the save) would make Day Edit fully lossless.
- T3: the manager daily brief / needs-you counts do not yet distinguish "resume waiting for a finish" from an ordinary pending request.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + index: amend g15 (Day Edit) — the prefill must carry the OPEN break (`openBreak`), or a save deletes it; a new rule — a positional write at `getLastRow() + 1` must grow the grid first (C1, and the Spanish follow-on); amend the resume decision (B3) with the T3 finish-rides-the-request rule.
- docs/design-decisions.md: "Resuming a closed day…" — the finish time rides the resume request; a past-day resume needs one.
- docs/operator-state.md: PunchAdjustRequests gains the trailing EndTime column (self-heals); the repair tools now refuse on drift (re-run).
- .cycle/config.md: walk steps on S7 (open break) and on the resume scenario; an invariant for "open break round-trips" and "positional writes grow the grid".
---END BROAD SCAN IMPLEMENTATION SUMMARY---
