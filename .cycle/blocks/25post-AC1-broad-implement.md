---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): AC1 (operator 2026-11-11) — activity levels: each presence ping, and a counts-only flush after a two-minute pause, carries how many clicks and keystrokes fell in each 10-minute block (counts only, never what was typed or clicked); the ActivityLog and ActivitySummary rows keep them; Day Edit draws bar heights (per 10 minutes or per hour) instead of on/off, and the Team Punches day table gets an App activity column per rep; labelled "this app only … context, not a score"
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/script_core.html, web-app/tc/script_manager.html, web-app/styles.html, web-app/Tests.js, handbook-app/styles.html (sync), test/visual/mock.js, test/visual/shoot.mjs, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: S–M (~4 h) — written to STATE.md's Estimates line before the first edit
Actual: ~4 h

CHANGES:
AC1 config | web-app/00_config.js | ACTIVITY_LOG_HEADERS gains Counts + Kind; ACTIVITY_COUNTS_KIND ('counts'), ACTIVITY_COUNTS_MAX_ENTRIES (48), ACTIVITY_COUNTS_MAX_PER_BLOCK (5000), ACTIVITY_COUNTS_MAX_AGE_MS (6 h); ACTIVITY_SUMMARY_HEADERS gains Counts, its text index 9.
AC1 server | web-app/20_timeclock.js | `recordPresence(counts)` writes the ping's counts as a ping; `recordActivityCounts(counts)` — rep-gated, the pause flush, NO presence stamp, Kind 'counts'; `activityCountsClean_` (the client clock corrected by whole blocks from `at`, the last six hours, a block's entries summed, a count capped, the newest 48 kept, anything else dropped); the "NcNkN" cell codec (`activityCountsEncode_` / `Decode_`) and its by-day form (`activityDayCountsEncode_` / `Decode_`); `activityDayView_` returns level / clicks / keys / hasCounts / activeMin (a counts-only block is active); `activityCondense_` never reads a 'counts' row as a ping and files each count by its BLOCK's day; the summary keeps Counts; `activityHealHeader_` names new header cells (blank only) on both tabs, nightly; `activityDaysFor_` — one summary span and ONE raw slice (running six hours past the day's end) for any number of reps, which `managerGetDayActivity` now uses; `activityHourly_`; `managerGetTeamActivity(date)` — manager-gated, roster inclusion (INV-183), each rep on their own day.
AC1 shell | web-app/script_core.html | `actCount_` counts pointerdown / keydown per epoch 10-minute block (a held key once; nothing about the key or target read) and re-arms the two-minute pause flush; `actTake_` / `actRestore_` / `actFlush_`; the ping carries `actTake_()` and restores on a failed send.
AC1 manager | web-app/tc/script_manager.html, web-app/styles.html | Day Edit: level bars from `actBarsHtml_` (height against the busiest bar, never under 8% for a non-zero), the totals in the head, a 10 min / Hour switch that keeps focus, the "this app only … context, not a score" note; a day without counts is the on/off strip it was. Team Punches: an App activity column (`tcalActCellHtml_` — hourly bars on one shared range, at least 8 hours, the total, a dash for nothing, "…" while out), filled in place by `tcalActFill_` (the calendar is not rebuilt), the note under the table; one read per day (`TEAMACT`), a past day reused, today re-read, a failure said and never cached.
AC1 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Eight pure pins (clean, codec, day view, condense, the shared day read + team endpoint, the flush + header heal, the shell source, the bars), one row-width assertion on the Batch G nightly pin, the E2a / Batch G / D-N10 doubles updated to the new shapes; three DOM drives (the shell's counting, flush and restore; Day Edit levels and the switch; Team Punches filled in place, a past day reused, a failure not cached); the gate case in Tests.js; mock fixtures for both new RPCs; the dayedit-activity-hourly scenario; INV-414, S173, the decision `#ac1-activity-levels`, the module note, the operator entry + inventory link, the storage map line.

TEST RESULTS: pure 1617/1617, DOM 406/406, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest current. Visual: dayedit-activity (light wide, dark mobile, hourly), manage-light-wide / dark-wide / light-mobile / periodic-light-mobile — 0 overflow, 0 runaway, no narrow text; the Team Punches column and both Day Edit scales read on camera. Bite-checks: BITE_TALLY. Regression: the app-activity scenarios (E2a / Batch G / D-N10 pins and DOM drives, the dayedit-activity and manage visual scenarios) — PASS; S173 new — operator walk owed.
REGRESSION RISKS: ActivityLog rows are now five columns (old rows read with blank Counts / Kind — every reader treats blank Kind as a ping, as before). The raw day read now spans six hours past the day's end (a few hundred more rows on a busy day). recordPresence now runs activityCountsClean_ per ping (cheap, pure). A counts-only row is a second row per pause per window in the ActivityLog — the tab grows by roughly one row per break.
INVARIANTS AT RISK: None — INV-414 added; the E2 / Batch G invariants (one ping per window per gap, condense before purge, summary first) unchanged and still pinned.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (AC1 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with the payor batches) | BLOCKS DEPLOY: N
- `npm run handbook:push` + New version (its styles.html copy changed) | BLOCKS DEPLOY: N
- Tell the team the app now shows how much each person used it, block by block — this app only | BLOCKS DEPLOY: N
- Walk S173 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version); `npm run handbook:push` (then New version)

FOLLOW-ON ITEMS:
- Counts a window holds when it closes are lost (the pause flush is two minutes after the last gesture); measure on DEV before adding a page-hide send.
- recordActivityCounts has no server-side throttle (nor does recordPresence); add a per-rep cache throttle if the tab grows unexpectedly.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
