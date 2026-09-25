---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- T5 — a morning half day was graded against the full shift start (~half a shift "late"), and `empIsOffToday_` treated any half day as a whole day off, silencing the not-clocked-in reminder for the half the rep works
- T4 — punctuality "Lunch on-time %" graded the day's EARLIEST LunchOut, so anyone punching a morning break scored ~100%
- T7 — multi-day time-off ranges (server and client preview) skipped weekends but not company holidays, so approving a range deducted PTO for a closed day
- T8 — shift reminders ignored the Company Holidays calendar (the chimed "not clocked in" nag on Labor Day)
- T9 — the Dashboard's Needs-you list was not invalidated in the browser when a task was done (a finished item stayed up to 60 s — g67 on the client)
- T10 — `voidDoc`, `voidCoaching`, `revokeTrainingAssignment` and `releaseDoc` did not bust the rep's pending-tasks cache (up to 2 min stale)
- T11 — `getMyTraining` judged "overdue" in the rep's timezone while the team matrix and the digest used the manager's
- D3 — QA sync counted already-indexed files against its 500-file budget and restarted from the top every run, so a folder past 500 files could never be fully indexed ("sync again for the rest" was false); the whole Drive walk ran inside the global lock
- D5 — every audio chunk request re-downloaded the whole recording blob
- M10 — the CSR Transfer tab was read whole on every call, no date-span bound and no cache (up to 4 reads on a cold Dashboard)
- M5 — the voicemail fold read only the first message of a Gmail thread, so repeat voicemails threaded into one conversation vanished once the first was resolved
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/40_metrics.js, web-app/51_spanish.js, web-app/80_training.js, web-app/81_empdocs.js, web-app/82_coaching.js, web-app/90_qa.js, web-app/script_core.html, web-app/tc/script_timeoff.html, web-app/tc/script_clock.html, web-app/cn/script_callnotes.html, web-app/metrics/script_deptrequests.html, web-app/train/script_coaching.html, web-app/train/script_empdocs.html, web-app/train/script_training.html, web-app/qa/script_qa.html, test/client/run.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md (running totals only), .cycle/STATE.md
Estimate: L (~13 h) — T5 M 2h · T4 S 1.5h · T7 S 1.5h · T8 S 1h · T9 S 0.5h · T10 S 0.5h · T11 S 0.5h · D3 M 2h · D5 S 1h · M10 S 1h · M5 S 1.5h
Actual: ~4 h

CHANGES:
T5 | 20_timeclock.js, script_core.html, mock.js | `empIsOffToday_` → `empTimeOffToday_` (reads TYPE too) returning 'full' / 'morning' / 'afternoon' / null through the pure `timeOffDayKind_` + `timeOffKindsCombine_`; `getEmployeeState` ships `offToday: offKind === 'full'` plus additive `halfDayOff`. The reminder ticker narrows the shift window to the working half (`remindWorkWindow_`): the not-clocked-in nudge, the clock-out nudge and the break reminders all read it. Punctuality grades each day against `punctExpectedStartMin_` (mid-shift on a morning half day), shows that start in the day record, and does not lunch-grade a half day. The state fixture carries `halfDayOff: null` (INV-185).
T4 | 20_timeclock.js | Every LunchOut of a day is kept; the graded one is `punctLunchNearest_` — the punch nearest the scheduled lunch (ties to the earlier), not the earliest.
T7 | 20_timeclock.js, tc/script_timeoff.html | `submitTimeOffRange` skips days in `companyHolidayMap_` (the ONE calendar, g123) and returns `skippedHolidayDays`; a range of only closed days is refused by name. `countWeekdaysIso_` (the balance preview and the empty-range guard) skips `window.SERVER_COMPANY_HOLIDAYS`, and the toast names skipped holidays.
T8 | script_core.html | `remindIsDayOff_` treats a date in `window.SERVER_COMPANY_HOLIDAYS` as a day off (weekends and full-day PTO as before).
T9 | tc/script_clock.html + five partials | `clkNeedsYouInvalidate_()` marks the Needs-you list stale; `clkNeedsYouGo_` calls it on click, and the client success handler of every server flow that busts the server cache (scheduled-call status, dept-request resolve, coaching ack, doc sign/complete, training complete, quiz pass) calls it typeof-guarded.
T10 | 81_empdocs.js, 82_coaching.js, 80_training.js, 20_timeclock.js | `releaseDoc` / `voidDoc` bust the doc's rep, `voidCoaching` the coached rep, `revokeTrainingAssignment` the assignment's rep — or every rep for an everyone (`*`) assignment via the new `pendingTasksBustAll_` (one `removeAll` over the roster keys).
T11 | 80_training.js | `trainTodayIso_()` (manager-tz, the work anchor) is the ONE today for the rep checklist, the team matrix and the overdue digest.
D3 | 90_qa.js, 00_config.js, qa/script_qa.html | The Drive walk runs before the lock; only the append, the token write and the audit take it, and the known-FileId set is re-read under the lock so overlapping syncs never double-index. A capped walk saves the iterator's continuation token in `QA_SYNC_CONTINUATION` ({folderId, token}); the next run resumes (a token for another folder, or an expired one, restarts); a completed walk clears it. The result carries `resumed` and `resumable`, and the toast says "sync again to continue" only when that is true.
D5 | 90_qa.js | `qaReadChunkBytes_` asks Drive for the chunk's byte range (alt=media + Range, bearer token — the KB upload pattern) and accepts only an exact-length 206, or a 200 of the whole file which it slices; anything else falls back to the old whole-blob read. Only `qaAudioChunkFor_` (after the folder-parentage check) calls it.
M10 | 40_metrics.js | `getCsrTransferPerRepDaily_` is a result cache (the DQE key family + TTL, the F-31 fixture bypass, errors never cached, a separate key for the per-queue shape) over `csrTransferReadUncached_`, which reads only the Date-column SPAN (`cdrDqeWindowSpan_` gained an optional date column) and keeps the per-row date filter.
M5 | 51_spanish.js | `spanishVmFold_` makes a row for EVERY voicemail message in a thread; each is resolved only by a member reply after it or a manual resolve stamped at or after it (pure `spanishVmResolution_`; a legacy unstamped manual row still resolves all). The pending list keeps one card per thread (resolve / claim / body act on the thread) — its newest pending voicemail — with additive `vmPending`; the stats card counts each voicemail. A thread with one voicemail reads exactly as before, so this holds whether or not 8x8 really threads.

TEST RESULTS: passed — pure harness 999/999 (was 988; +11 Batch 7 pins), DOM 156/156, `npm run lint:server` clean, `node scripts/counts.mjs --check` agrees (pure 999), split manifest regenerated (F2c green). Pins updated for deliberate rule changes (Category A): the range pin's weekend check (T7), F2's renamed `empTimeOffToday_` (T5), the QA byte-boundary order (D5), the transfer attribution pin now reading `csrTransferReadUncached_` (M10), H3-4's helper regex (M10), F-34's sandbox loading `spanishVmResolution_` (M5). Bite-checked 23 mutations, all BITE: T4 earliest-again · T5 half day ignored · T5 half day as full (F2 pin; first aimed at the T5 pin, where the line is not asserted — re-aimed) · T5 window unused · T7 holidays requested · T7 preview charges holidays · T8 holiday ignored · T11 rep tz · T9 click no invalidate · T9 coaching ack unwired · T10 revoke no bust · T10 everyone busts one · T10 void coaching no bust · D3 no resume · D3 walk under lock · D5 whole blob always · M10 caches errors · M5 any reply resolves · M5 first message only. Visual matrix (clock-light-wide + -pht, timeoff-light-wide, spanish-light-wide, punctuality-light-wide, punctuality-expanded-light-wide, qa-queue-light-wide): 0px overflow, no missing fixture, no console error beyond the pre-existing proxy font-certificate noise; no fixture exercises a half day, a holiday range or a threaded voicemail, so nothing here photographs a changed pixel.
Regression Scenarios (Test Command `manual`) — every overlapping scenario needs the live app, so NOT APPLICABLE here, each with its harness stand-in: S4 / S13 / S46 time off (the T7 driven pin) · S76 reminders (the T5 window + T8 day-off pins) · S98 punctuality (the T4 + T5 pins) · S101 Needs-you (the T9 + T10 pins) · S67 training (the T11 pin) · S69 / S99 docs and coaching (the T10 pin) · S90 / S100 QA (the D3 + D5 driven pins) · S41 / S42 metrics transfers (the M10 cache pin) · S80 / S105 Spanish (the M5 pins).

REGRESSION RISKS:
- `getEmployeeState.offToday` is now TRUE only for a full day; a half day ships `halfDayOff`. An older client reading only `offToday` fires the full-shift reminders on a half day (the pre-F2 behaviour for that half), never silences a working half.
- `submitTimeOffRange` now writes fewer rows for a range that spans a company holiday; `skippedWeekendDays` excludes the holidays (a new `skippedHolidayDays` carries them).
- Punctuality lateness moves for morning-half-day days only; lunch % moves for every rep with more than one LunchOut a day (the intended change).
- The QA sync takes the lock later; a sync that fails AFTER the walk (a lock timeout) leaves the token unchanged, so the next run redoes the same slice — idempotent.
- The chunk path makes one UrlFetch per chunk; any failure falls back to the old read.
- Transfer figures can be up to `CDR_CACHE_TTL` old, the same staleness the DQE figures beside them already had.
- The Spanish stats card's pending/resolved counts can rise (each threaded voicemail counts); the pending LIST still has one card per thread.

INVARIANTS AT RISK: None violated. Checked: INV-01 (the QA append still runs under the ScriptLock; only the read-only Drive walk moved out) · INV-14 (every cache bust best-effort) · INV-29 / INV-183 (the time-off read stays coercion-recovered and status-normalised) · INV-46 (`empTimeOffToday_` still reads a bounded column window) · INV-85 (the transfer cache key carries `CDR_CACHE_KEY`) · INV-169 (the QA truncation is still reported, now with whether it resumes) · INV-185 (the state fixture mirrors `halfDayOff`) · INV-186 (nothing here tones a permanent count) · g67 (the server and client halves of the pending-tasks cache are now both invalidated by the same flows) · g123 (one holiday calendar: the server's, injected client-side).
NET SCORE: 3 − 1 = +2
- Production fixes (would have fired this month): T4 (every rep who punches a morning break as LunchOut reads ~100% lunch on-time) · T8 (Labor Day, 2026-09-07, chimed the not-clocked-in nag at anyone who opened the app) · T9 (every task finished from the Needs-you list reappeared on return for up to a minute).
- Defensive (fires only on an event not confirmed this month): T5, T7, T10, T11, D3, D5, M10, M5.
- New failure mode: (1) T5 — a morning half day is graded from MID-SHIFT (start + half the shift length, lunch included). If the half-day policy is something else (e.g. four paid hours ending at shift end), those days grade late or early by the difference. Low; documented as the assumption.

OPERATOR ACTIONS / DEPLOY:
- None required. `QA_SYNC_CONTINUATION` is a new auto-managed Script Property (the resume point of a capped QA sync; delete it to restart from the top) | BLOCKS DEPLOY: N
- Optional check after deploy: if a half day is not "the afternoon starts at mid-shift" in your policy, say so — T5's expected start is that assumption | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with Batches 1–6, S2 and the follow-ons, none of which are deployed yet)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The task-CREATING flows (`saveTrainingAssignment`, `issueDoc` for a non-draft, `createCoaching`) do not bust the target rep's pending-tasks cache, so a NEW task can take up to 2 minutes to appear (the T10 shape, the other direction).
- `getSpanishInboxThreadBody` returns the thread's FIRST message, so expanding a card for a repeat voicemail shows the first voicemail's text; the card's own snippet is the newest. The client does not render `vmPending` yet.
- Punctuality's previous-range comparison still grades a morning half day against the full start (the PTO overlay covers the report range only).
- The client Needs-you invalidation reaches only the window where the task was completed; another open window keeps its copy for up to a minute.
- M5 depends on real 8x8 threading, which is still unverified; the change is neutral if it does not thread.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index: amend g123 (the reminder ticker and time-off ranges now read the one calendar), g67 (the client half of the pending-tasks cache; the void / release / revoke flows), g125 (the transfer tab joins the span rule), g128/g53-adjacent for M5 ("the first message is the thread" was a hidden assumption); consider a new gotcha: a HALF day is neither a day off nor a normal day — every reader of time off must ask which part.
- docs/operator-state.md + CLAUDE.md auto-managed list: `QA_SYNC_CONTINUATION`.
- docs/modules.md (Time Clock reminders + time off + punctuality, Training, QA sync + playback, Metrics transfers, Spanish inbox), docs/operator-log.md (Batch 7 round), docs/test-harness-log.md (the 11 pins, 23 bite-checks).
- .cycle/config.md: invariants (next INV-269) for the half-day kinds, the holiday-aware range and reminders, the one training today, the resumable QA sync + walk outside the lock, the ranged chunk read inside the boundary, the per-message voicemail resolution; walk steps on S4, S76, S98, S101, S90, S80; scenario S118 if a single walk is wanted.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
