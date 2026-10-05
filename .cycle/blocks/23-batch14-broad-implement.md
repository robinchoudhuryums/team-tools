---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- TC2-9: the timesheet readers were not archive-aware.
  - Once Timesheet cold-archiving (INV-153) is on, several surfaces read the live tab only, so an archived period showed short hours, empty days, and "no clock-in" grades:
    - the pay statement (and the timesheet view and the manager's view of a rep, which share its builder);
    - the rep calendar;
    - the team punches calendar;
    - Punctuality, in both windows.
  - The payroll export and the accrual index did read the archive. But each had its own copy of the walk, gated on "the range starts before the live tab's OLDEST row". One late back-filled row for an old date makes the live tab look complete, so the archive was skipped and the period read short. For the export that means a short payroll file behind success; for the accrual, under-credited PTO.

Files modified:
- web-app/20_timeclock.js
- web-app/00_config.js (`TS_ARCHIVE_REACH_CACHE_KEY`)
- web-app/tc/script_manager.html (team calendar note, Punctuality note)
- web-app/tc/script_timeoff.html (pay statement note)
- test/client/run.js
- test/client/server-split-manifest.json
- CLAUDE.md (generated running-totals row only)
- .cycle/STATE.md
Estimate: M (~8 h) — Batch 14, written before the first edit
Actual: ~2.5 h

CHANGES:
TC2-9 | 20_timeclock.js, 00_config.js | The archive gate, `timesheetArchiveReach_(ss)`:
  - It reports how far back TimesheetArchive can hold rows. That is the later of two dates:
    - the newest date actually in the tab, read from ONE column and cached 6 h under `ts_archive_reach_v1` (a data value — g157);
    - the date the current window archives up to.
  - The union covers two cases: a cached value that predates a move, and a window that was lowered.
  - `archiveOldTimesheetRows` clears the cache after a move, outside the lock.
  - A failed column read throws to the reader.
TC2-9 | 20_timeclock.js | THE range reader, `timesheetRowsInRange_(start, end, opts)`:
  - It returns every live row in range, then archive rows when the range reaches the archive.
  - An archive row identical to a live one (id, date, time, COMMENTS) is skipped (INV-132).
  - `opts.keep` filters both tabs as they are walked.
  - `opts.liveValues` takes rows the caller already read, so there is never a second full read.
  - `opts.strict` makes a failed archive read throw. Otherwise it is returned as `archiveError` beside the live rows.
  - Never provisions a tab (INV-133).
TC2-9 | 20_timeclock.js | The six readers moved onto it:
  - `workedHoursByEmpForRange_` (accrual): strict.
  - `generateExportSheet_` (payroll): strict, with `liveValues`. It REFUSES on a failed archive read. A no-id archive row is skipped as before. The narrowing hint no longer names the live tab's oldest date.
  - `buildTimesheetForEmployee_` (pay statement, timesheet view, manager timesheet): ships `archivedRows` and `archiveError` (additive). `getMyPayStatement`'s `archiveNote` is now `!!ts.archiveError` — the real failure, not a guess from the window that showed whether or not anything was missing.
  - `buildCalendarForEmployee_`: ships `archiveError` (additive).
  - `getTeamCalendar`: the month's own range; `archiveNote` is the failure.
  - `getPunctualityReport`: both windows; ships `archiveUnavailable`.
TC2-9 | tc/script_manager.html, tc/script_timeoff.html | Client copy:
  - The team calendar and pay statement notes now say "the timesheet archive could not be read … may be missing" instead of "may have moved to the archive".
  - Punctuality adds a warning when `archiveUnavailable` is set.
(tests) | test/client/run.js | Moved pins:
  - F1 (export) and A7: the reader call is strict with `liveValues`; no live-tab coverage gate is left.
  - The accrual source pin: one strict reader call, no read of its own.
  - The pay-statement pin: the note is the failure.
  - T5's PTO-before-walk order: now checked against the reader call.
  - `getTeamCalendar` behavioural: an archived month now READS. It previously asserted the "predates" note, which is gone.
  - T5's sandbox loads the reader.
  - New shared helpers: `b14ReaderSrc_` and `b14Ss_`.

TEST RESULTS: passed.
- Node: 1226/1226 (was 1223). Three new pins, all DRIVEN over the REAL ADP enum:
  - The reader and its gate:
    - THE REGRESSION: a late live row for January no longer hides the archived January;
    - a duplicate counts once; `keep` filters both tabs;
    - a range past the archive reads one column, not the tab, and the second call is cached;
    - the window union defeats a stale cache; no tab means no read;
    - a failure is named, or thrown under strict; `liveValues` saves the read;
    - the archiver's clear happens after the lock.
  - Every reader:
    - the accrual's archived hours (12 h), and it throws on failure;
    - the export's file holds the archived rows, and it refuses on failure;
    - the statement is whole for an archived period, and carries the failure when the archive cannot be read;
    - the calendars and Punctuality call the reader and keep no live-only read;
    - the client copy.
  - Punctuality: an archived previous window is graded (prevOnTimePct 100, not "no clock-in"); a failed read ships `archiveUnavailable`.
- DOM: 219/219, unchanged. lint:server clean; counts --check agrees; manifest current.
- 21 bite-checks, all BITE:
  - the reader: gate, dedupe, strict, error naming, keep, liveValues;
  - the reach: cache, window union; the archiver's clear;
  - accrual ×2, export ×2, statement ×2, Punctuality ×2, team calendar ×2.
  - The client copy strings are source assertions, not bitten.
Regression Scenarios (Test Command `manual`), walked on paper against the changed paths; none run on a deployment:
- S8 / S129 (ADP export): PASS. With archiving off (the default) the archive is never read and the file is the live rows, as before. With it on, a back-filled live row no longer hides archived rows.
- S79 / S88 (pay statement): PASS. An archived period is now whole. The "may have been moved" note no longer appears on every old period; it appears only when the archive could not be read.
- S91 (team calendar): PASS. An archived month lists its punches. Archived days are past the 30-day Day Edit window, so no pencil can edit them.
- S98 (Punctuality): PASS. The previous-window delta reads archived days.
- S107 / S108 (accrual preview and reconcile): PASS. The same index with a corrected gate.
- S39 (the Time / PTO calendar): PASS. The rep calendar reaches back at most 3 months, inside the 120-day archive floor, so it never needs the archive. It goes through the reader for uniformity.
REGRESSION RISKS:
- **One date-column read per cache miss.** While a TimesheetArchive tab exists, the first range read after the 6 h cache expires reads its date column. Every later read in the window reads none. With no archive tab it costs nothing.
- **A failed CacheService call costs the column read every time.** It falls back to reading the column (never treats it as "no archive").
- **The export's in-file dedupe key changed.** It now uses the raw COMMENTS (the accrual's key), where before it used the normalised type. An archived "ADJ-ClockIn" at the same minute as a live "ClockIn" for the same day is now kept, as the live tab would keep it. A real mid-run duplicate is byte-identical, so it is still dropped.
- **The calendars and Punctuality do a second read of the payroll tab only when a range reaches the archive.** The common current-period case is unchanged.
- **Pay statement note semantics changed.** It appears only when the archive was needed and could not be read. A period archived by a window that was later lowered is still read (the tab reach is the tab's own newest date).
INVARIANTS AT RISK: None broken. Checked and holding:
- INV-153: the archive is still moved, never purged.
- INV-132: a duplicate counts once on every reader.
- INV-133: no reader provisions the tab.
- INV-187 / g53: a failed archive read is named on every display and refused for payroll and accrual.
- INV-176: unparseable days are still INCOMPLETE.
- g14: live rows first, in append order.
- g157: the cache holds a data value only.
- g129: only a successful column read is cached.
- g17: the cache clear happens outside the archiver's lock.
NET SCORE: 1 − 0 = 1.
- TC2-9 fired in production this month: NO. `TIMESHEET_ARCHIVE_DAYS` is 0 by default, and nothing records it being set on this deployment, so no row has been archived and every reader agreed. Counted as a latent fix that becomes live the day archiving is enabled.
- Scored as 1 because the back-filled-row gate defect sat in the payroll export path. This is a judgement for /reflect to confirm or demote.
- No new failure mode identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- None. Archiving stays off until `TIMESHEET_ARCHIVE_DAYS` is set; this batch makes enabling it safe for every surface. | BLOCKS DEPLOY: N
Deploy: Server + Client (Time Clock, Manage): `cd web-app && clasp push -f`, then a New version.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The two operator break reports (`tsPunchDaysWithArchive_`) and `repairTimesheetTimezone` read both tabs whole by design (they are history-wide, not range readers). They were left as they are.
- `getTimesheetData` and `getEmployeeTimesheetForManager` now ship `archiveError`, but their client views do not render it. Only the pay statement does. Those views stay inside the archive floor today.
- The rep calendar's client does not render `archiveError` (it cannot reach archived months).
- The visual mock carries no archive-failure fixture for the three notes.
- Editor-suite (Tests.js) cases for the reader are owed to Batch 15.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md: g152 — a bounded scan's absence is evidence only inside its window. The archive gate keyed on the live tab's oldest row was another instance (an index line amendment).
- docs/operator-state.md: the Timesheet cold-archive entry — every reader now reads through it, so enabling it no longer shortens any in-app view. Also the `ts_archive_reach_v1` cache.
- CLAUDE.md:
  - the storage map's TimesheetArchive cell ("read back by the ADP export" → every timesheet range reader);
  - the g152 index line.
- docs/design-decisions.md: a decision, "Every Timesheet range read goes through one archive-aware reader, gated on the archive's own reach", with an index line.
- docs/modules.md: Time Clock and Manage (archived periods read whole; the notes mean "could not be read").
- .cycle/config.md: an INV for the reader, and an extended INV-153; extend S79/S91/S98/S8 with an archived-period step.
- docs/test-harness-log.md: the Batch 14 entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
