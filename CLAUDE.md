# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each tool ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Tools

- **time-clock/** — Cross-timezone time tracking, PTO requests, manager
  dashboard, and ADP-format export. Backs a shared Google Sheet
  (`CONFIG.ADP_SS_ID` in `time-clock/Code.js`).

## Development

Each tool is a separate clasp project.

```bash
cd <tool-name>
clasp pull         # sync the deployed Apps Script down to disk
clasp push -f      # push local changes back up
clasp open         # open the project in the Apps Script editor
```

After `clasp push`, the Web App URL still serves the previous version
until you cut a new deployment: Apps Script editor → Deploy → Manage
deployments → Edit → Version: **New version** → Deploy. Web app users
see the change on next page load.

For Apps Script tests (`Tests.js` in each tool), run them from the
editor: pick a `runSmokeTests` / `runAllTests` function and click ▶.

## Common Gotchas

These accumulate as audits surface real production hazards. Treat
each entry as something that has bitten the project before — read
this section before touching the relevant area.

- **ScriptLock around every mutating op.** Every server function
  that writes to a sheet (`recordPunch`, `submitTimeOffRequest`,
  `updateTimeOffStatus`, `deletePunch`, `managerSaveDay`,
  `cancelTimeOffRequest`) wraps its body in
  `LockService.getScriptLock().waitLock(15000)` and releases in
  `finally`. Skipping the lock causes interleaved approvals to
  double-deduct PTO balances.
- **`normalizeType_` strips the `ADJ-` prefix.** Adjustments are
  stored in the COMMENTS column as `ADJ-ClockIn` / `ADJ-LunchOut` /
  etc. Reading `row[ADP.COMMENTS]` directly and comparing to
  `'ClockIn'` will silently miss adjustments. Always go through
  `normalizeType_()`.
- **Roster cache invalidation.** Employee data is cached for 300s
  under `ROSTER_CACHE_KEY` (`employee_roster_v3`). After editing
  any Employees-sheet column (`adjustLeaveBalance_`, manual edits
  for test setup, etc.) call `invalidateRosterCache_()` or
  subsequent reads will return stale balances for up to 5 minutes.
- **`_TEST_OVERRIDE_EMAIL` only intercepts `getActiveUserEmail_()`.**
  Any code path that calls `Session.getActiveUser()` directly will
  bypass the test impersonation and use the real running user.
- **`TEST_` prefix is the cleanup key.** `cleanupTestData()` deletes
  every row in Timesheet / TimeOffRequests / AuditLog whose
  employee ID starts with `TEST_`. Production employee IDs must
  never start with `TEST_`.
- **Manager-only operations check `callerEmp.isManager`.** Any new
  manager-gated endpoint MUST start with the same check used by
  `getManagerDashboard`, `updateTimeOffStatus`, `deletePunch`,
  `managerSaveDay`, `exportAdpRange`, `installAutomationTriggers`,
  etc. Returning a dashboard or accepting writes without this
  check is a privilege escalation.
- **PTO balance transitions.** `updateTimeOffStatus` only changes
  balances on Pending→Approved (deduct) or Approved→non-Approved
  (restore). Skipping the transition guard double-deducts on
  re-approval or fails to restore on revert.
- **Bi-weekly anchor read.** `getCurrentBiweeklyRange_` reads the
  FIRST row whose PayCycle is `'biweekly'`. Multiple biweekly
  anchors in the Employees sheet are not supported — the second
  one is silently ignored.
- **Future punches are rejected by `recordPunch`.** Both
  `date > todayStr` and same-day `time > nowTime` checks must
  remain in place; the manager edit-day flow has its own future-
  date guard (`daysBack < 0`).
- **Fire-and-forget email.** Decision emails
  (`notifyEmployeeOfDecision_`), missed-punch alerts, and
  automated exports are wrapped in try/catch — the API call
  returns success even when the email fails. Failures are logged
  to `Logger.log` / `console.warn` only.

## Key Design Decisions

- **One `CONFIG` object** in `time-clock/Code.js` holds all
  tunable values (windows, thresholds, automation hours, feature
  flags). Adjust behavior by editing CONFIG rather than
  parameterizing functions.
- **Audit log is append-only**, one row per state-changing action,
  with the actor email recorded for manager operations. Dashboard
  reads are bounded to the last ~20 rows to stay within Apps
  Script quota and execution-time budgets.
- **Best-effort email notifications.** Email failures never block
  or fail the API call that triggered them — the spreadsheet write
  is the source of truth; the email is a convenience.
- **Smoke vs. integration tests.** `runSmokeTests()` is safe to run
  on the production spreadsheet (pure logic only — no writes).
  `runAllTests()` writes `TEST_` rows to the live spreadsheet and
  cleans up at the end; prefer a TEST copy of `CONFIG.ADP_SS_ID`
  for full runs.
- **PTO bucket state lives in the Employees sheet** (columns
  I/J = AnnualLeaveBalance / SickLeaveBalance). Time-off rows in
  TimeOffRequests don't carry balance — they trigger balance
  updates on approve/revert transitions.
- **Timezone display split.** Each row in the manager dashboard
  shows the employee's last punch in BOTH the employee's local
  tz (e.g. IST/PHT) and the manager's tz (CST). All conversions
  go through `convertDateTime_`; abbreviations come from
  `TZ_ABBR` with passthrough for unknown zones.

## Cycle Workflow Config

The workflow templates that drive `/broad-scan`, `/broad-implement`,
`/targeted-audit`, `/targeted-implement`, `/test-sync`, and
`/sync-docs` all read this section. Keep it the single source of
truth — update via `/setup-cycle` rather than ad-hoc edits.

### Test Command
manual

Tests live in `time-clock/Tests.js` and run inside the Apps Script
editor (no Node test runner). Use the Regression Scenarios below
as the canonical verification path; `runSmokeTests()` and
`runAllTests()` automate scenarios S1–S2.

### Health Dimensions
Overall, Correctness, Security & Access Control, Data Integrity, Timezone Correctness, Concurrency Safety, Test Coverage, Code Clarity & Docs, Apps Script Best Practices, Manager UX, Employee UX, Automation Reliability

### Subsystems
Server:
  time-clock/Code.js, time-clock/appsscript.json, time-clock/.clasp.json
Client:
  time-clock/index.html, time-clock/modals.html, time-clock/styles.html, time-clock/script_core.html, time-clock/script_clock.html, time-clock/script_timesheet.html, time-clock/script_timeoff.html, time-clock/script_manager.html
Test Suite:
  time-clock/Tests.js

### Invariant Library
INV-01 | All mutating server functions acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` | Subsystem: Server
INV-02 | All manager-gated functions verify `callerEmp.isManager` before any side effect and return `{ error: 'Manager access required.' }` (or `success: false`) on failure | Subsystem: Server
INV-03 | PTO balance changes in `updateTimeOffStatus` fire only on Pending→Approved (deduct) or Approved→non-Approved (restore) transitions | Subsystem: Server
INV-04 | Date inputs match `/^\d{4}-\d{2}-\d{2}$/` and time inputs match `/^\d{2}:\d{2}$/` before any sheet write | Subsystem: Server
INV-05 | Future-dated punches are rejected: both `date > todayStr` and same-day `time > nowTime` | Subsystem: Server
INV-06 | Employee adjustments beyond `CONFIG.ADJUST_WINDOW_DAYS` are rejected; beyond `CONFIG.OLD_ADJUST_ALERT_DAYS` a non-empty reason is required | Subsystem: Server
INV-07 | Manager punch deletes are rejected when older than `CONFIG.MGR_DELETE_WINDOW_DAYS` | Subsystem: Server
INV-08 | Every state-changing manager action writes an audit row via `writeAuditLog_` before returning success, with the caller's email recorded | Subsystem: Server
INV-09 | Adjustments are stored as `ADJ-{punchType}` in the COMMENTS column; `normalizeType_` strips the prefix consistently on read | Subsystem: Server
INV-10 | Roster cache (`ROSTER_CACHE_KEY`) is invalidated after any write that mutates employee-sheet columns (`adjustLeaveBalance_`, test setup, etc.) | Subsystem: Server
INV-11 | Employee-scoped endpoints use the caller's identity (`getEmployeeInfo_`); only manager wrappers accept a target employee ID | Subsystem: Server
INV-12 | `tzAbbr_` passes unknown timezone strings through unchanged; it never throws | Subsystem: Server
INV-13 | `getManagerDashboard` reads the audit sheet via a bounded range (last ~20 rows), never the full sheet | Subsystem: Server
INV-14 | Email sends (`notifyEmployeeOfDecision_`, `sendDailyMissedPunchAlerts`, `sendAutomatedExport_`) are wrapped in try/catch and never block the API result | Subsystem: Server
INV-15 | Automation triggers can only be installed by emails in `CONFIG.MANAGER_EMAILS`; `installAutomationTriggers` throws otherwise | Subsystem: Server
INV-16 | Empty timezone strings fall back to `CONFIG.TIMEZONE`; empty leave-balance cells parse as 0 | Subsystem: Server
INV-17 | `getLeaveDeduction_` is case-insensitive and trims whitespace; unknown types default to `{ bucket: 'annual', days: 1.0 }`; `'Unpaid Leave'` returns `{ bucket: null, days: 0 }` | Subsystem: Server
INV-18 | Bi-weekly period boundaries are computed from the FIRST `'biweekly'` anchor row in the Employees sheet via the anchor-floor formula in `getCurrentBiweeklyRange_` | Subsystem: Server
INV-19 | US holiday observance shift: Saturday → previous Friday, Sunday → following Monday (handled by `fixedHoliday_`) | Subsystem: Server
INV-20 | Test impersonation uses `_TEST_OVERRIDE_EMAIL`, consumed only by `getActiveUserEmail_()`, and is cleared in `finally` by every entry point | Subsystem: Test Suite
INV-21 | `cleanupTestData()` removes every row whose employee ID starts with `TEST_` across Timesheet, TimeOffRequests, and AuditLog; production IDs must never start with `TEST_` | Subsystem: Test Suite

### Policy Configuration
Policy threshold: 4/10
Consecutive cycles: 2

### Regression Scenarios
S1 | Smoke test suite | Subsystem: Test Suite
  Steps:
    - Open the Apps Script editor for the time-clock project
    - In Tests.js, select `runSmokeTests` and click ▶
    - Wait for Logger output
  Expected: `Failed: 0`. Pure-logic tests run with no spreadsheet writes; integration tests show as `SKIP`.

S2 | Full integration test suite | Subsystem: Test Suite
  Steps:
    - Confirm the editor is pointing at a TEST copy of `CONFIG.ADP_SS_ID` (or accept that production gets `TEST_*` rows that auto-clean)
    - Select `runAllTests` and click ▶
    - Wait for Logger output
  Expected: `Failed: 0`. `cleanupTestData()` removes all `TEST_*` rows at the end and resets test-employee balances to 15 annual / 10 sick.

S3 | Employee golden path: clock in → lunch → clock out | Subsystem: Server, Client
  Steps:
    - Open the deployed web app as a non-manager employee
    - Click ClockIn, then LunchOut, then LunchIn, then ClockOut
    - Open the ADP `Timesheet` tab for today
  Expected: Each click acknowledged within ~2s. Four rows appear with correct IN/OUT direction and the punch type in COMMENTS. State chips on the page transition Working → On lunch → Working → Done.

S4 | Time-off submit, manager approve, balance deducts | Subsystem: Server, Client
  Steps:
    - As employee: submit a Full Day request for a future date
    - As manager: open Manage → Time-Off Requests → Approve
    - Refresh the employee Calendar tab and check the Employees sheet
  Expected: TimeOffRequests row Status = `Approved`; AuditLog has a `TimeOffStatusChange` row keyed to the request; employee's AnnualLeaveBalance decremented by 1.0; decision email sent (best-effort).

S5 | Adjustment beyond 7 days requires reason | Subsystem: Server
  Steps:
    - As employee, open Adjust for a date 10 days back, leave reason blank, submit
    - Re-submit with a non-empty reason
  Expected: First attempt fails with "A reason is required for adjustments more than 7 days back."; second attempt succeeds, an `ADJ-{type}` row is written, and `notifyManagerOldAdjustment_` sends a manager alert (best-effort).

S6 | Manager punch delete window | Subsystem: Server
  Steps:
    - As manager: locate a punch ≤7 days old in Recent Punches → Delete
    - Attempt to find a punch >7 days old in the widget
  Expected: Recent punch deletes (audit row + mirror clear on personal sheet); old punches don't surface as deletable in the UI. Calling `deletePunch` directly with an old date returns "Cannot delete punches older than 7 days."

S7 | Manager edit-day diff-and-apply | Subsystem: Server
  Steps:
    - As manager, pick an employee + date with 4 punches → modify two times, clear one, leave one unchanged
    - Submit with a reason
  Expected: One update, one delete, one no-op, zero adds; three audit rows (one per change), each tagged `ADJ-{type}` in COMMENTS for the updates, and including the manager's email and the reason.

S8 | ADP-format export (manual range) | Subsystem: Server
  Steps:
    - As manager: Manage → Export → set date range covering recent activity → run
  Expected: A new Sheet is created in Drive, rows sorted by date / empId / time, COMMENTS column cleared, two-row header copied. AuditLog has an `AdpExport` row recording the row count and file ID.

S9 | Automated daily missed-punch alert | Subsystem: Server
  Steps:
    - Insert a TEST_ ClockIn punch dated yesterday with no matching ClockOut
    - In the Apps Script editor, run `sendDailyMissedPunchAlerts`
    - Run `cleanupTestData()` afterwards
  Expected: Logger shows one missed entry; one employee-targeted email and one manager-targeted summary email are queued via MailApp; no exception thrown if `MANAGER_EMAILS` is empty.

S10 | Cross-timezone live status on dashboard | Subsystem: Server
  Steps:
    - As manager (`MANAGER_TIMEZONE = America/Chicago`), open Manage → Live Status
    - Inspect employee rows whose `Timezone` is `Asia/Kolkata` or `Asia/Manila`
  Expected: Each row shows last-punch time in BOTH the employee's tz abbreviation (IST / PHT) and the manager's (CST). Conversion matches `convertDateTime_` (e.g. 14:30 IST May 17 → 04:00 CST May 17).

### Deploy Command
Server: `cd time-clock && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy. Web app picks up the change on next page load.
Client: same single `clasp push -f` ships all HTML files alongside `Code.js`; same deploy step.
Test Suite: same `clasp push -f`. Tests don't ship to end users — run them from the editor with `runSmokeTests()` (safe on prod) or `runAllTests()` (writes TEST_ rows, cleans up at end).
