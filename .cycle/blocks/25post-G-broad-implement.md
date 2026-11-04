---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch G of the plan agreed in chat: "Activity Tracking keeps logs for 60 days then deletes; need to have it condense, archive condensed, then delete")
New capabilities (G/ST): Batch G — the activity log condenses, then purges:
  - G1 each night every FINISHED day of app activity (the rep's own day) becomes ONE row per rep in a new, auto-provisioned ActivitySummary tab on the ADP sheet — Date · EmpId · Timezone · Pings · First · Last · ActiveMin · Blocks (the day's 10-minute map, one base-36 digit per block) · CondensedAt, the text columns written as plain text (g144) — kept indefinitely; a day is never condensed twice, and never before it has ended
  - G2 the raw ActivityLog pings are then kept 14 days (was 60), and `activityPurgeIndexes_` deletes a ping only when it is older than that AND its day has a summary row; a condense that throws purges nothing and the job reports a partial run (ST2); the raw purge has its OWN per-run budget (`ACTIVITY_LOG_PURGE_MAX_PER_RUN`), apart from the 2,000-row budget the three diagnostic tabs share
  - G3 Day Edit's activity read takes a day's summary row first (complete by construction — raw pings at the window's edge can be a part-day), the raw pings for a day not condensed yet, and ships `keptFrom`, so its "No app activity recorded" adds "activity before <date> was not kept" for an older day
  - G4 the editor suite's cleanup sweeps TEST_ rows from both tiers
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/10_core.js, web-app/tc/script_manager.html, web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md (INV-395, S154), CLAUDE.md (the storage map's ADP row and the ActivityLog inventory line, edited in place; counts), .cycle/STATE.md
Estimate: M (~4 h) — written to STATE.md before the first edit
Actual: S–M (~2 h)

CHANGES:
G1 | web-app/00_config.js, 20_timeclock.js | `ACTIVITY_SUMMARY_TAB` / `_HEADERS` / `_TEXT_IDX`; the pure `activityBlocksEncode_`, `activityBlocksDecode_`, `activityCondense_`; `getOrCreateActivitySummarySheet_`, `activitySummaryKeys_`
G2 | web-app/00_config.js, 20_timeclock.js, 10_core.js | `ACTIVITY_LOG_DAYS` 60 → 14, `ACTIVITY_LOG_PURGE_MAX_PER_RUN`; the pure `activityPurgeIndexes_`; `activityLogCondenseAndPurge_` (condense, then purge, under the job's lock); `purgeOldDiagnostics` calls it in place of the shared-budget timestamp purge, catches a failure into a named partial outcome, and its audit row counts the condensed days
G3 | web-app/20_timeclock.js, tc/script_manager.html, test/visual/mock.js | `managerGetDayActivity` reads the summary first and ships `fromSummary` / `keptFrom`; `deActivityHtml_`'s no-activity line
G4 | web-app/Tests.js | `cleanupTestData` sweeps TEST_ rows from ActivitySummary and ActivityLog

TEST RESULTS: Test Command is `manual`. Regression Scenarios touching Day Edit's activity strip and the diagnostics purge were walked by reading against the change: a day with raw pings and no summary reads exactly as before; a condensed day draws the same blocks from its summary (pinned equal); the purge's other tabs keep their shared budget unchanged. S154 is new and NOT RUN (it needs the editor and a night of data on DEV).
  Pure 1506/1506 (three new pins; E2a's sandbox and purge pin, S2's appender lists and RT-1's purge contract moved). DOM 365/365 (the Day Edit no-activity case rewritten for keptFrom). Visual: N/A (no layout change; the Day Edit fixture carries keptFrom). lint-server clean; counts in step; the manifest revision recorded; handbook-sync in step.
  Bite-checks (10, scratch worktree): 9 BITE — today condensed; a day condensed twice; an unsummarised ping purged; a recent summarised ping purged (a NO BITE first — the fixture had no summarised day inside the window; one added, re-bitten); counts capped below the map's range; a failed summary write still purging; the summary never read; a failed condense reported ok; the kept-from line not said. 1 EQUIVALENT (recorded, g116): widening the purge's summarised set to every raw day changes nothing reachable — every raw row past the 14-day window lies in a finished day, which the same run has just summarised; the nothing-before-kept rule is held by the failed-write case.
REGRESSION RISKS: (a) The first night after the deploy condenses the whole 60-day backlog in one run — a few hundred summary rows and up to `ACTIVITY_LOG_PURGE_MAX_PER_RUN` deletions, under the nightly lock; more drains over the following nights. (b) Its oldest day may be a part-day if the old 60-day purge had cut into it — said in the operator docs. (c) A rep whose roster timezone changes after a day was condensed keeps that day's summary in the old zone (the row records it). (d) A raw row with no id or an unreadable time is never summarised and so never purged — it stays; none are written by the app.
INVARIANTS AT RISK: None. INV-395 (new); g144 (text columns re-asserted '@' through appendRowsTextSafe_); g17 / S2 (the appender runs under the job's ScriptLock — named caller-locked); g145 (appendRowsTextSafe_ grows the grid; the delete keeps a spare row); ST2 / g53 (a failed condense is a partial run, never "ok"); the E2a activity rules (blocks, first / last, the rep's frame) unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability; the shared purge budget that ActivityLog could outgrow was a latent risk, not counted)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — N/A (unchanged)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the plan: F (Coaching 1-on-1s), H (PDF signing).
- No surface reads ActiveMin yet — it is recorded for the long-term view the operator described; a report over the summary tab is a later ask.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
