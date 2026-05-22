# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Projects

- **web-app/** — Multi-module browser web app deployed at one Web App
  URL. Hosts two modules today, registered side-by-side in the
  `TOOLS` registry in `script_core.html`:
   - **Time Clock** — cross-timezone time tracking, PTO requests,
     manager dashboard, ADP-format export. Backs a shared Google
     Sheet (`CONFIG.ADP_SS_ID` in `web-app/Code.js`).
   - **Call Notes** — rolling-note panel for CSR call logging. Each
     rep writes to their own per-rep Google Sheet (`Notes` tab in the
     spreadsheet whose ID is in `EMP.CALL_NOTES_SHEET_ID`, column L
     of the Employees roster). Ctrl/⌘+Enter saves + auto-copies a
     CRM-friendly serialization; email composer is a separate
     two-stage flow with preview gate. Three flag types
     (action / training / review) with EOD reminders for unresolved
     action flags and weekly manager digests for training + review.
  Adding a new tool: append an entry to `TOOLS`, drop a partial in
  `web-app/<tool>/script_*.html`, `include()` it from `index.html`,
  add server endpoints to `Code.js` alongside existing ones.
- **call-notes/** — Legacy Workspace Add-on scaffold; superseded by
  the Call Notes module inside `web-app/`. Kept on disk for reference
  during the transition. New work happens in `web-app/cn/` and the
  Call-Notes section of `web-app/Code.js`. The Workspace Add-on path
  is abandoned because admin policy on the org domain prevents
  install of Marketplace Add-ons without ticket-driven allowlisting;
  the web-app pattern works today with zero admin involvement.

## Development

Each project is a separate clasp project.

```bash
cd <project-name>
clasp pull         # sync the deployed Apps Script down to disk
clasp push -f      # push local changes back up
clasp open         # open the project in the Apps Script editor
```

After `clasp push`, the Web App URL still serves the previous version
until you cut a new deployment: Apps Script editor → Deploy → Manage
deployments → Edit → Version: **New version** → Deploy. Web app users
see the change on next page load.

For Apps Script tests (`Tests.js` in each project), run them from the
editor: pick a `runSmokeTests` / `runAllTests` function and click ▶.

## Common Gotchas

These accumulate as audits surface real production hazards. Treat
each entry as something that has bitten the project before — read
this section before touching the relevant area.

- **Secrets via Script Properties, not CONFIG.** `getAdpSS_()` and
  `getManagerEmails_()` read `ADP_SS_ID` and `MANAGER_EMAILS` from
  Script Properties first, falling back to the CONFIG placeholders.
  Set the real values once in Apps Script editor → Project Settings
  → Script Properties; clasp pull/push leaves Script Properties
  untouched, so the committed `Code.js` never has to be scrubbed.
  Projects that haven't migrated can still set CONFIG values directly,
  but then every clasp pull will pull real values and require a scrub
  before commit.
- **Sheets coerces `'TRUE'`/`'FALSE'` strings to native booleans.** On
  write, `setValue('FALSE')` stores boolean `false`; on read,
  `getValues()` returns the boolean. Naive `String(value || '').trim()`
  then short-circuits `false` to `''` and downstream `=== 'false'`
  checks miss — `ptoEnabled` defaulted to TRUE for contractors marked
  FALSE until this was fixed. Always handle null/undefined/`''`
  explicitly before stringifying any TRUE/FALSE column.
- **Sheets auto-coerces `HH:mm:ss` strings to Date objects.** On
  read, `row[ADP.TIME]` may come back as a JavaScript Date —
  `String(date)` produces `"Sat Dec 30 1899 ..."` and breaks all
  downstream display logic. Always read times through
  `normalizeTime_()`, which detects Dates and re-formats them via
  the spreadsheet's timezone.
- **ScriptLock around every mutating op.** Every server function
  that writes to a sheet (`recordPunch`, `submitTimeOffRequest`,
  `updateTimeOffStatus`, `deletePunch`, `managerSaveDay`,
  `cancelTimeOffRequest`, `managerSubmitTimeOff`, `selfDeletePunch`)
  wraps its body in `LockService.getScriptLock().waitLock(15000)`
  and releases in `finally`. Skipping the lock causes interleaved
  approvals to double-deduct PTO balances.
- **`normalizeType_` strips the `ADJ-` prefix.** Adjustments are
  stored in the COMMENTS column as `ADJ-ClockIn` / `ADJ-LunchOut` /
  etc. Reading `row[ADP.COMMENTS]` directly and comparing to
  `'ClockIn'` will silently miss adjustments. Always go through
  `normalizeType_()`.
- **Roster cache invalidation + key bump.** Employee data is cached
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v4`).
  After editing any Employees-sheet column (`adjustLeaveBalance_`,
  manual edits for test setup, etc.) call `invalidateRosterCache_()`
  or subsequent reads will return stale balances for up to 5
  minutes. Whenever the `EMP` enum changes shape (new column),
  bump the cache key — old cached entries would have wrong column
  indices.
- **`PtoEnabled` defaults to TRUE.** Column K (`EMP.PTO_ENABLED`)
  defaults to enabled when blank — for back-compat with rows
  added before the column existed. Contractors who don't accrue
  paid leave need an explicit `FALSE` / `no` / `n` / `0` in this
  column. The PTO UI then hides for them entirely (employee Calendar
  ring, decision email balance line, etc.).
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
  `managerSubmitTimeOff`. Returning a dashboard or accepting writes
  without this check is a privilege escalation.
- **PTO balance transitions.** `updateTimeOffStatus` only changes
  balances on Pending→Approved (deduct) or Approved→non-Approved
  (restore). `managerSubmitTimeOff` with `autoApprove=true` skips
  the Pending stage and deducts immediately. Skipping the
  transition guard double-deducts on re-approval or fails to
  restore on revert.
- **Bi-weekly anchor read.** `getCurrentBiweeklyRange_` reads the
  FIRST row whose PayCycle is `'biweekly'`. Multiple biweekly
  anchors in the Employees sheet are not supported — the second
  one is silently ignored.
- **Future punches are rejected by `recordPunch`.** Both
  `date > todayStr` and same-day `time > nowTime` checks must
  remain in place; the manager edit-day flow has its own future-
  date guard (`daysBack < 0`).
- **Min-interval debounce on live punches only.** `recordPunch`
  rejects a non-adjustment punch within `MIN_PUNCH_INTERVAL_SECONDS`
  (30s) of the previous one. Adjustment punches (`custom` set)
  bypass this check intentionally — back-fills need to land
  arbitrarily close to other times.
- **Self-undo is narrow on purpose.** `selfDeletePunch` only
  removes (a) today's punches, (b) within `SELF_UNDO_WINDOW_SECONDS`
  (5 min), (c) that are NOT adjustments. Older or remote mistakes
  must go through Adjust so they leave a clear `ADJ-*` row in the
  audit log. Self-undo writes a `PunchSelfUndo` audit row before
  deletion.
- **`getTeammateStatus` is the low-privilege view.** Returns name +
  status + isSelf only. Adding email, employee ID, last-punch
  time, or tz to the response would leak data to non-managers who
  can call this. Add fields only after auditing what the Clock
  page actually needs.
- **Fire-and-forget email.** Decision emails
  (`notifyEmployeeOfDecision_`), missed-punch alerts, and
  automated exports are wrapped in try/catch — the API call
  returns success even when the email fails. Failures are logged
  to `Logger.log` / `console.warn` only.
- **Call Notes Sheet enrollment is manual.** A rep has no Call
  Notes panel until column L (`CallNotesSheetId`) of the Employees
  roster has their per-rep spreadsheet ID. `getCallNotesSheet_(emp)`
  throws "Your call-notes Sheet is not configured" if missing; the
  client renders the enrollment-missing splash. There is intentionally
  no auto-provision path — Robin still copies the template Sheet and
  pastes the ID in by hand, matching the existing workflow.
- **`Notes` tab provisions on first touch.** `getCallNotesSheet_`
  creates the tab + header row if it doesn't exist, so a freshly
  enrolled rep's first `submitCallNote` "just works." The header row
  comes from `CN_HEADERS` — any change there must be paired with a
  schema migration plan because existing reps' tabs won't auto-rewrite.
- **`CN_EMAIL_PALETTE` is hand-resolved from design tokens.** Email
  clients strip `<style>` blocks and don't honor CSS variables, so the
  call-note email bodies inline literal hex from a CN_EMAIL_PALETTE
  constant in `Code.js`. If `styles_design_tokens.html` palette values
  change in a meaningful way (slate → different palette), re-resolve
  the hex equivalents in CN_EMAIL_PALETTE or the email aesthetic drifts
  from the in-app aesthetic.
- **Clipboard API often fails in HtmlService iframes.** The auto-copy
  feature tries `navigator.clipboard.writeText` first and falls back
  to a `<textarea>` + `document.execCommand('copy')` shim
  (`cnFallbackCopy_`). Both fire from the Ctrl/⌘+Enter user gesture so
  permissions are usually granted, but never assume one path alone
  works.
- **Call-notes flag enum vs. blank.** `FlagType` is `''` / `'action'`
  / `'training'` / `'review'`. `sanitizeFlagType_()` lowercases + range-
  checks; bad values fall back to `''` rather than throwing, so
  experimental UI tweaks can't write garbage into the column.
  `Resolved` is only meaningful when `FlagType=action`; the resolve
  endpoint rejects calls on other flag types.
- **EOD trigger is per-manager-tz with a window check, not per-rep tz.**
  `sendCallNotesEodDigest` runs once at `CONFIG.CALL_NOTES.EOD_WARNING_HOUR`
  in the manager's tz, then walks the roster. For each enrolled rep it
  checks whether *their* local clock is currently within
  ± `EOD_WARNING_WINDOW_MINUTES` of the same hour. Reps in zones far
  from the manager's tz get no digest on the day their local 5pm
  doesn't intersect the trigger window — a tradeoff for keeping a
  single trigger. If you have reps spread across more than ~6h of
  timezones, switch to per-tz triggers or widen the window.
- **`SubformData` (column P) is a JSON blob.** Stored as a JSON string
  on email send (so a "re-send same departments" flow can re-open the
  composer pre-populated). `callNoteRowToObject_` tries `JSON.parse`
  and returns `null` on failure rather than throwing — corrupted blobs
  should never break a read.

## Key Design Decisions

- **Multi-tool registry in `script_core.html`.** The `TOOLS` object
  at the top of `script_core.html` is the single source of truth for
  which tools/views exist, their sidebar label, icon, and the name of
  their `enter*` handler. `renderShell` builds the sidebar links and
  mobile-nav buttons by iterating `TOOLS`; `showView` dispatches to
  the handler by name via `window[...]`. Adding a new view means
  appending one entry to `TOOLS` and defining one `enter*` function
  — the shell auto-rebuilds. The active tool's `label` is mirrored
  into `#sb-tool-label` (the sidebar `.sb-brand-sub`) on every
  navigation so the user always sees which tool they're in.
- **Tool view partials live in their own subfolder.** Time Clock's
  four views (`script_clock.html`, `script_timesheet.html`,
  `script_timeoff.html`, `script_manager.html`) are under `web-app/tc/`
  and `include`d as `tc/script_clock` etc. from `index.html`. Apps
  Script supports `/` in filenames and renders them nested in the
  editor; clasp pushes the subdirectory verbatim (works because
  `.clasp.json` has `skipSubdirectories: false`). New tools should
  follow the same pattern: `web-app/<tool-shortname>/script_*.html`.
- **One `CONFIG` object** in `web-app/Code.js` holds all
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
  I/J = AnnualLeaveBalance / SickLeaveBalance; column K =
  PtoEnabled per-employee toggle). Time-off rows in
  TimeOffRequests don't carry balance — they trigger balance
  updates on approve/revert transitions.
- **Per-employee PTO opt-out via `EMP.PTO_ENABLED` column.**
  Contractors (e.g. PH team) get `FALSE` in column K; their UI
  hides the PTO ring and balance line entirely. Single codebase
  serves both paid and unpaid populations without forks.
- **Self-undo vs. Adjust split.** Live mistakes within 5 minutes
  go through `selfDeletePunch` (audit row, no Manager
  involvement). Anything older — or any adjustment — must go
  through Adjust, which leaves a permanent `ADJ-*` row visible
  to managers. The intent: keep the audit trail honest while
  letting employees fix typos quickly.
- **`normalizeTime_` as the universal read shim.** Because Sheets
  auto-coerces time strings to Dates on read, every read of
  `row[ADP.TIME]` goes through `normalizeTime_`. New code must
  follow this pattern; raw `String(row[ADP.TIME])` is a bug.
- **Timezone display split.** Each row in the manager dashboard
  shows the employee's last punch in BOTH the employee's local
  tz (e.g. IST/PHT) and the manager's tz (CST). All conversions
  go through `convertDateTime_`; abbreviations come from
  `TZ_ABBR` with passthrough for unknown zones.
- **Secrets via Script Properties.** `ADP_SS_ID` and `MANAGER_EMAILS`
  are read from Script Properties first (set in Apps Script editor →
  Project Settings → Script Properties), falling back to the
  placeholders in CONFIG. This lets the repo stay clean of real
  values without manual scrubbing on every `clasp pull`, since
  Script Properties live on the deployed project and are never
  touched by clasp.
- **Design tokens are the single source of truth for color,
  typography, radii, shadows, and motion.** All declared in
  `web-app/styles_design_tokens.html` and consumed via CSS
  variables (`var(--paper)`, `var(--ink)`, `var(--accent)`,
  `var(--mono)`, etc.). Hardcoded hex/rgba is reserved for the
  canonical token declarations inside that file; outside it the
  only acceptable "raw" colors are `rgba(0,0,0,X)` for
  invariant-across-modes scrims and overlays. Five derived semantic
  aliases (`--border-strong`, `--success-deep`, `--warning-deep`,
  `--danger-deep`, `--info-deep`) are also declared in the partial
  because they appear too often to be worth repeating the
  underlying `color-mix(in oklch, …)` everywhere.
- **Dark mode is an attribute overlay, not a separate stylesheet.**
  A bootstrap script in `index.html` reads
  `localStorage.umsTimeClockMode` (or falls back to
  `prefers-color-scheme` on first visit) and sets
  `data-mode="dark"` on `documentElement` synchronously in `<head>`
  so the first paint already reflects the persisted mode — no
  light-mode flash on dark-mode reloads. The dark-mode block in
  the tokens partial flips `--paper` / `--paper-2` / `--paper-card`
  / `--ink` / `--muted` / `--line` and the `*-soft` variants;
  semantic accents, geometry, and motion stay the same.
  `window.setTimeClockMode('light' | 'dark' | null)` is the
  programmatic flipper — bound to the sidebar / mobile-header
  sun/moon toggle and also exposed globally for debugging
  (`null` clears the stored preference so OS preference takes
  over again).
- **Chrome icons are SVG via `icon(name, size)` from
  `script_icons.html`, never emoji.** Every nav button, action
  tile, status pill, table action, and toast variant pulls its
  glyph from the ~30-icon library; SVGs use `stroke="currentColor"`
  so tone inheritance and dark-mode flips work automatically.
  Emoji remain only inside `confirm()` browser dialog strings
  (where SVG can't render) and in the legacy-prefix-strip safety
  regex inside `showToast()`. Adding a new icon means appending
  one path-data entry to `ICONS` in `script_icons.html`; new
  callers should pass the icon name to `icon()` rather than
  inlining SVG markup.
- **The two Stage-0 partials are the shared foundation for future
  tools in this repo.** A new tool dropped into
  `team-tools/<new-tool>/` can `include('styles_design_tokens')` +
  `include('script_icons')` (or copy the files in if the new tool
  is a separate clasp project that can't reach across directories)
  to inherit the slate-default warm-paper system, the dark-mode
  bootstrap-readiness, and the icon library. Tool-specific CSS
  layers on top in the new tool's own `styles.html` and consumes
  the canonical tokens directly — no per-tool color palette, no
  per-tool font declarations. The slate palette is the default;
  future palettes can be added in the tokens partial alongside it.
- **Compact mode is a shell-level attribute, not per-tool CSS.**
  `?compact=1` (set by the pop-out button in `script_core.html`)
  toggles `data-compact="1"` on `documentElement`. Sidebar +
  mobile-nav + mobile-header all collapse via `:root[data-compact]`
  selectors in `styles.html`. Tool views are responsible for
  rendering a `.compact-header` slim strip at the top when they
  detect `COMPACT_MODE === true` and for ensuring their layouts
  reflow at ~360px width. The Call Notes view does this; Time
  Clock views use the same shell so they inherit compact-mode
  collapse automatically, with per-class compact-mode tuning in
  the styles partial.
- **Pop-out uses a named window target.** `popOutCurrentView()` calls
  `window.open(url, 'umsTeamToolsCompact', ...)`. The named target
  means subsequent clicks of the pop-out button focus the existing
  window rather than spawning duplicates — important for the "single
  always-visible panel" workflow. Closing the pop-out clears the
  reference and the next click opens a fresh window.
- **Per-rep call-notes Sheets are the storage substrate.** Same
  pattern as the time-clock module's `EMP.SHEET_ID` (per-rep month
  Sheet) — each rep's notes live in a Sheet Robin owns, mapped via
  `EMP.CALL_NOTES_SHEET_ID`. Robin can pop the rep's Sheet open
  any time for retrospective; the script-as-Me has full access.
  No centralized call-log Sheet exists by design — per-rep isolation
  matches the legacy workflow Robin already maintains.
- **Two-stage email is the safety mechanism.** Submit logs only,
  zero risk of accidental send. The envelope icon on each note card
  is the only way to compose; that opens the form modal, which
  requires explicit Preview, which then requires explicit Send. The
  preview shows the actual rendered HTML body + subject + recipients
  so the rep can catch wrong dept selection, wrong patient TRX, etc.
  before send.
- **Auto-copy format is a CONFIG template.** `CONFIG.CALL_NOTES.AUTO_COPY_FORMAT`
  uses `{caller}`, `{callback}`, `{patientAndTrx}`, `{issue}`,
  `{resolution}`, `{timestamp}`, etc. tokens — Robin can tune the
  CRM-paste-friendly serialization without code changes. The replacement
  is straight string-replace; no escaping (the clipboard is plain text).

## Operator State Checklist

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:

- **Set Script Property `ADP_SS_ID`** to the real spreadsheet ID in
  Apps Script editor → Project Settings → Script Properties. Without
  it, `getAdpSS_()` falls back to the inert `'YOUR_ADP_SPREADSHEET_ID'`
  placeholder in CONFIG and fails on first sheet open.
- **Set Script Property `MANAGER_EMAILS`** to a comma-separated list
  (e.g. `alice@umsupply.com,bob@umsupply.com`). `getManagerEmails_()`
  reads this before CONFIG; without it, no one passes the
  `isManager` check and manager features stay locked out.
- **`Employees` sheet column K = `PtoEnabled`** — added in the
  current schema; existing sheets must have this column added
  (header row 1, leave blank for back-compat = enabled, write
  `FALSE` for contractors). `setupTestEnvironment()` auto-writes
  the header on test runs if missing, but production rows still
  need it set manually.
- **`ROSTER_CACHE_KEY` = `'employee_roster_v4'`** — bumped when
  PTO_ENABLED column landed. After deploying, run `clearCaches()`
  once to flush any stale `_v3` cache entries.
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. The
  installer now wires four triggers:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm)
    - `sendCallNotesEodDigest` (call-notes, daily manager-tz 5pm)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am)
  Triggers do not survive an Apps Script project re-clone.
- **`MANAGER_TIMEZONE`** in CONFIG drives manager-dashboard
  display tz; change requires a redeploy.
- **`Employees` sheet column L = `CallNotesSheetId`** — per-rep
  call-notes Spreadsheet ID. Robin still copies the template Sheet,
  renames it for the rep, shares with the script-owner account, and
  pastes the ID here. Blank means the rep has no Call Notes
  enrollment yet; their panel renders the enrollment-missing splash.
  Must be added manually to existing rows (the schema bump in
  `EMP.CALL_NOTES_SHEET_ID = 11` doesn't auto-fill).
- **`ROSTER_CACHE_KEY` = `'employee_roster_v5'`** — bumped when
  CallNotesSheetId column landed. After deploying, run `clearCaches_()`
  once from the Apps Script editor to flush any stale `_v4` cache
  entries (or wait 5 min for natural TTL expiry).
- **Call-notes department list + state tax rates** live in
  `CONFIG.CALL_NOTES.DEPARTMENT_EMAILS` and
  `CONFIG.CALL_NOTES.STATE_TAX_RATES` (resp. `STATE_ABBR_TO_NAME`).
  Adding a new department or rate: edit `web-app/Code.js`, push,
  cut a new deployment — there is no admin UI for these.
- **Call-notes EOD + weekly digest knobs** are
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (default 17),
  `EOD_WARNING_WINDOW_MINUTES` (default 30), and the
  `installAutomationTriggers()` schedule (Friday 8am for the weekly
  digest). Changing the hour requires re-running
  `installAutomationTriggers()` so the trigger picks up the new value.

## Cycle Workflow Config

The workflow templates that drive `/broad-scan`, `/broad-implement`,
`/targeted-audit`, `/targeted-implement`, `/test-sync`, and
`/sync-docs` all read this section. Keep it the single source of
truth — update via `/setup-cycle` rather than ad-hoc edits.

### Test Command
manual

Tests live in `web-app/Tests.js` and run inside the Apps Script
editor (no Node test runner). Use the Regression Scenarios below
as the canonical verification path; `runSmokeTests()` and
`runAllTests()` automate scenarios S1–S2.

### Health Dimensions
Overall, Correctness, Security & Access Control, Data Integrity, Timezone Correctness, Concurrency Safety, Test Coverage, Code Clarity & Docs, Apps Script Best Practices, Manager UX, Employee UX, Automation Reliability

### Subsystems
Server:
  web-app/Code.js, web-app/appsscript.json, web-app/.clasp.json
Client (shell):
  web-app/index.html, web-app/modals.html, web-app/styles.html, web-app/styles_design_tokens.html, web-app/script_core.html, web-app/script_icons.html
Client (Time Clock views):
  web-app/tc/script_clock.html, web-app/tc/script_timesheet.html, web-app/tc/script_timeoff.html, web-app/tc/script_manager.html
Client (Call Notes views):
  web-app/cn/script_callnotes.html
Test Suite:
  web-app/Tests.js

### Invariant Library
INV-01 | All mutating server functions acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` | Subsystem: Server
INV-02 | All manager-gated functions verify `callerEmp.isManager` before any side effect and return `{ error: 'Manager access required.' }` (or `success: false`) on failure | Subsystem: Server
INV-03 | PTO balance changes in `updateTimeOffStatus` fire only on Pending→Approved (deduct) or Approved→non-Approved (restore) transitions | Subsystem: Server
INV-04 | Date inputs match `/^\d{4}-\d{2}-\d{2}$/` and time inputs match `/^([01]\d|2[0-3]):[0-5]\d$/` (enforces 24-hour validity, not just `HH:mm` shape) before any sheet write | Subsystem: Server
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
INV-15 | Automation triggers can only be installed by emails in `MANAGER_EMAILS` (Script Properties or CONFIG, via `getManagerEmails_()`); `installAutomationTriggers` throws otherwise | Subsystem: Server
INV-16 | Empty timezone strings fall back to `CONFIG.TIMEZONE`; empty leave-balance cells parse as 0 | Subsystem: Server
INV-17 | `getLeaveDeduction_` is case-insensitive and trims whitespace; unknown types default to `{ bucket: 'annual', days: 1.0 }`; `'Unpaid Leave'` returns `{ bucket: null, days: 0 }` | Subsystem: Server
INV-18 | Bi-weekly period boundaries are computed from the FIRST `'biweekly'` anchor row in the Employees sheet via the anchor-floor formula in `getCurrentBiweeklyRange_` | Subsystem: Server
INV-19 | US holiday observance shift: Saturday → previous Friday, Sunday → following Monday (handled by `fixedHoliday_`) | Subsystem: Server
INV-20 | Test impersonation uses `_TEST_OVERRIDE_EMAIL`, consumed only by `getActiveUserEmail_()`, and is cleared in `finally` by every entry point | Subsystem: Test Suite
INV-21 | `cleanupTestData()` removes every row whose employee ID starts with `TEST_` across Timesheet, TimeOffRequests, and AuditLog; production IDs must never start with `TEST_` | Subsystem: Test Suite
INV-22 | Live (non-adjustment) punches in `recordPunch` are rejected if within `CONFIG.MIN_PUNCH_INTERVAL_SECONDS` (30s) of the previous punch; adjustments bypass this check | Subsystem: Server
INV-23 | `selfDeletePunch` only deletes punches that are (a) today's, (b) within `CONFIG.SELF_UNDO_WINDOW_SECONDS` (300s), and (c) not adjustments; it writes a `PunchSelfUndo` audit row before deletion | Subsystem: Server
INV-24 | `getTeammateStatus` response is restricted to `{ name, status, isSelf }` per teammate — no emails, IDs, last-punch times, or timezones leak to non-managers | Subsystem: Server
INV-25 | `managerSubmitTimeOff` requires `callerEmp.isManager`; when `autoApprove=true` it skips the Pending stage, applies the PTO deduction in the same call, and emails the employee a decision notice | Subsystem: Server
INV-26 | All reads of `row[ADP.TIME]` (and any cell that may hold a time value) go through `normalizeTime_`, which detects Date objects and re-formats via the spreadsheet's timezone | Subsystem: Server
INV-27 | PTO UI visibility is the conjunction of `CONFIG.ENABLE_PTO_TRACKING` (global) AND `emp.ptoEnabled` (per-row, defaulting to TRUE when column K is blank/missing) — applied in `getEmployeeState` and `buildCalendarForEmployee_` | Subsystem: Server
INV-28 | Whenever the `EMP` enum gains or changes columns, `ROSTER_CACHE_KEY` is bumped (currently `employee_roster_v4`) so old cached entries with the wrong column shape are not served | Subsystem: Server
INV-29 | `normalizeDate_` uses the spreadsheet's timezone (`getAdpSS_().getSpreadsheetTimeZone()`) to format Date cells — not `CONFIG.TIMEZONE` — so dates round-trip consistently regardless of the script's timezone configuration | Subsystem: Server
INV-30 | All mutating Call Notes server functions (`submitCallNote`, `updateCallNote`, `setCallNoteFlag`, `setCallNoteResolved`, `deleteCallNote`, `emailFromCallNote`) acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` (INV-01 generalized) | Subsystem: Server
INV-31 | Manager-gated Call Notes endpoints (`managerGetCallNotes`, `managerSearchCallNotes`, `managerGetTrainingQueue`, `managerGetReviewCandidates`) verify `callerEmp.isManager` before any side effect (INV-02 generalized) | Subsystem: Server
INV-32 | Every state-changing Call Notes action writes an audit row via `writeAuditLog_` (`CallNoteCreate` / `Edit` / `Flag` / `Resolve` / `Delete` / `Email`) with `noteId=<uuid>` in the notes field — the audit log is the only cross-rep trail of call-note activity | Subsystem: Server
INV-33 | `submitCallNote` does NOT send any email. Sending is a separate two-stage flow: `previewCallNoteEmail` (returns rendered HTML for confirm-before-send) then `emailFromCallNote` (sends + stamps EmailedAt/EmailDepartments + writes audit) | Subsystem: Server
INV-34 | `setCallNoteResolved` rejects calls when `FlagType !== 'action'`; only action-flagged notes have a resolved state | Subsystem: Server
INV-35 | `getCallNotesSheet_(emp)` throws "Your call-notes Sheet is not configured" when `emp.callNotesSheetId` is missing — call-notes endpoints surface this as the enrollment-missing splash in the client; no auto-provision path exists | Subsystem: Server
INV-36 | Call-note email sends (`emailFromCallNote`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`) are wrapped in try/catch and never block the API result (INV-14 generalized) | Subsystem: Server
INV-37 | `sanitizeFlagType_` only allows `''` / `'action'` / `'training'` / `'review'` to be written to FlagType; unknown values silently coerce to `''` rather than corrupting the column | Subsystem: Server
INV-38 | Compact-mode is a shell-level attribute (`data-compact="1"` on `documentElement`); set from the `?compact=1` URL param on boot and consumed via CSS selectors in `styles.html`. Tool views render `.compact-header` instead of `.view-title-row` when `COMPACT_MODE === true` | Subsystem: Client (shell)
INV-39 | `getCallNotesAmbient` is unauthenticated read-only — returns only `{enrolled, unresolvedActionCount, staleActionCount, todayTotal, staleFlagHours}` for the calling rep. Used by the sidebar badge polling; never leaks cross-rep data | Subsystem: Server

### Policy Configuration
Policy threshold: 4/10
Consecutive cycles: 2

### Regression Scenarios
S1 | Smoke test suite | Subsystem: Test Suite
  Steps:
    - Open the Apps Script editor for the web-app project
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

S11 | Min-interval debounce on live punches | Subsystem: Server, Client
  Steps:
    - As employee, click ClockIn, then immediately click LunchOut within ~5s
    - Wait until 30s have elapsed since the ClockIn and retry
  Expected: Second click within 30s returns `Your last punch was just Xs ago. Please wait Ys before punching again (if you made a mistake, use Adjust instead).` and writes no row. After the window elapses, the second punch succeeds. Adjustments via the Adjust modal are NOT blocked by this rule.

S12 | Self-undo within 5 minutes | Subsystem: Server, Client
  Steps:
    - As employee, click ClockIn now
    - Click the Undo button on the just-recorded punch within 5 minutes
    - Check the ADP Timesheet sheet and AuditLog
    - Wait > 5 minutes (or set system clock forward) and try to undo a fresh punch
    - Try to undo an adjustment punch via the same UI (manual call to `selfDeletePunch` if needed)
  Expected: Within window — punch row removed; AuditLog has a `PunchSelfUndo` row (not `PunchDelete`); personal-sheet mirror cleared. After window — "Self-undo only works within 5 minutes…" error. Adjustment punch — "Cannot self-undo an adjustment. Use Adjust again to fix it." error.

S13 | Manager files time-off (with auto-approve) | Subsystem: Server, Client
  Steps:
    - As manager, in the Manage tab open the "File time-off on behalf of employee" modal
    - Pick an employee, type=Full Day, future date, check Auto-approve, submit
    - Check TimeOffRequests sheet, AuditLog, and the employee's AnnualLeaveBalance
    - Repeat without Auto-approve and confirm Pending behavior
  Expected: With auto-approve — row written with Status=`Approved` directly (no Pending stage); balance decremented by 1.0; AuditLog row notes `filed by manager, auto-approved`; employee gets the decision email. Without auto-approve — Status=`Pending`, no balance change yet, no email; an `updateTimeOffStatus` to Approved later behaves identically to S4.

S14 | Teammate status low-privilege view | Subsystem: Server, Client
  Steps:
    - As a non-manager employee, open the Clock page
    - Observe the teammate status card below Actions
    - Inspect the network response for `getTeammateStatus` in DevTools
  Expected: Card shows teammate names + their current status (clocked_in / on_lunch / not_in / clocked_out). The response payload contains ONLY `{ name, status, isSelf }` per teammate — no email, no employee ID, no last-punch time, no timezone field. If `CONFIG.SHOW_TEAMMATE_STATUS = false`, response is `{ enabled: false, teammates: [] }`.

S15 | Per-employee PTO toggle | Subsystem: Server, Client
  Steps:
    - In the Employees sheet, set column K (`PtoEnabled`) to `FALSE` for a contractor row
    - As that employee, reload the web app and open the Calendar tab
    - Submit a time-off request and have a manager approve it
    - Check the decision email body
  Expected: Calendar tab hides the PTO ring + balance line entirely; the leave-balance UI does not render. Time-off submit/approve still works (the TimeOffRequest row is created, AuditLog written), but no balance is deducted because the contractor's `ptoEnabled` short-circuits both `getEmployeeState` and the decision email's balance line. Setting back to blank or `TRUE` restores the full UI.

S16 | Sheet auto-coercion of time strings | Subsystem: Server
  Steps:
    - Manually edit the Timesheet sheet: pick a row, retype its Time cell as `09:00:00` so Sheets coerces it to a Date object
    - Refresh the manager dashboard and the employee Timesheet view; run `runSmokeTests` (which doesn't cover this) plus an integration test against the edited row
  Expected: Both views still render `09:00:00` / `9:00 AM` correctly because `normalizeTime_` reformats the coerced Date back through the spreadsheet's timezone. A regression here surfaces as `Sat Dec 30 1899 …` strings in the UI.

S17 | Call Notes — enrollment-missing splash | Subsystem: Server, Client (Call Notes)
  Steps:
    - Pick an enrolled rep; temporarily blank out their Employees column L (`CallNotesSheetId`)
    - As that rep, open the web app and navigate to Call Notes
    - Restore column L afterwards
  Expected: While unset, the panel renders the enrollment-missing splash ("Not enrolled in Call Notes — ask your manager to set it up") instead of the form. Every Call Notes endpoint returns the same enrollment error. After restoring the ID, a hard refresh shows the active form.

S18 | Call Notes — submit, auto-copy, rolling stack appends | Subsystem: Client (Call Notes), Server
  Steps:
    - As an enrolled rep, open Call Notes
    - Fill all 7 fields, press Ctrl/⌘+Enter
    - Inspect clipboard, the rolling stack, and the rep's `Notes` tab
    - Press the copy button on the just-saved card and re-inspect clipboard
  Expected: A new card appears at the top of the rolling stack with animation; clipboard holds the serialized note matching `CONFIG.CALL_NOTES.AUTO_COPY_FORMAT`; the form cleared and re-focused on Callback; AuditLog has a `CallNoteCreate` row with `noteId=<uuid>`. Manual copy re-renders the same string.

S19 | Call Notes — email composer with preview gate | Subsystem: Client (Call Notes), Server
  Steps:
    - As an enrolled rep with at least one note today, click the envelope on a card
    - Select one or more departments, type "Verified Shipping" into Update Type, fill the shipping subform, click Preview →
    - Confirm the preview reflects departments + subject + rendered HTML body
    - Click Send Email
    - Inspect Mail (or test mailbox), the note row's EmailedAt + EmailDepartments columns, and AuditLog
  Expected: Preview returns rendered HTML matching the warm-paper aesthetic (no CSS variables — inline hex), correct To/CC/Subject. After Send, the card shows the envelope as filled (is-sent); EmailedAt is populated; AuditLog has a `CallNoteEmail` row. Closing the modal mid-flow at the form step or the preview step does NOT send.

S20 | Call Notes — flag trio + resolved state | Subsystem: Server, Client (Call Notes)
  Steps:
    - As a rep, click the flag icon (action) on a note — card gains a warn ring
    - Click again — flag clears, ring disappears
    - Re-flag action, then click the lightbulb (training) — flag transitions to training
    - Re-flag action, wait > `CONFIG.CALL_NOTES.STALE_FLAG_HOURS`, refresh
    - Click the check (resolve) — card loses the stale pulse
    - Try to call `setCallNoteResolved` against a training-flagged or unflagged note
  Expected: Each toggle updates the FlagType column and writes a `CallNoteFlag` audit row. Flag types are mutually exclusive — switching from action to training also clears the Resolved column. Stale-flag pulse renders only on action-flag + unresolved + past STALE_FLAG_HOURS. `setCallNoteResolved` rejects non-action flags with "Only action-flagged notes can be resolved."

S21 | Call Notes — inline-edit-in-place from rolling card | Subsystem: Client (Call Notes), Server
  Steps:
    - Click the pencil/edit icon on a saved note
    - Card expands; modify Issue + Resolution; press Ctrl/⌘+Enter
    - Inspect the Notes tab + AuditLog
  Expected: Card collapses to the new content; row in `Notes` reflects the diff; AuditLog has a `CallNoteEdit` row enumerating which fields changed. Cancel button discards edits without writing.

S22 | Call Notes — EOD digest fires for stale action flags | Subsystem: Server
  Steps:
    - As a rep, file an action-flagged note with timestamp older than `STALE_FLAG_HOURS` (manually edit the timestamp cell in the Notes tab to a few hours ago)
    - From the Apps Script editor, run `sendCallNotesEodDigest`
  Expected: Logger shows the rep was emailed (matches their local-tz EOD window) and unresolved-action count > 0. The email body has the warm-paper aesthetic + lists the unresolved note. A rep with no enrolled Sheet or no unresolved action flags is silently skipped.

S23 | Call Notes — search by caller / issue | Subsystem: Server, Client (Call Notes)
  Steps:
    - As a rep, navigate to Call Notes → Search
    - Type a substring of a known past caller's name → results show by-caller matches
    - Toggle the field tab to "Issue" → searches Issue + Resolution columns only
    - Type a 1-character query → no search fires (minimum 2)
  Expected: Sub-second results for ≤ 10K notes per rep, sorted newest-first. Manager search (`managerSearchCallNotes`) returns cross-rep results with `repName` + `repId` attached per hit.

S24 | Call Notes — manager training-queue + review-candidate digests | Subsystem: Server
  Steps:
    - Have several reps file training-flagged + review-flagged notes across the past week
    - From the Apps Script editor, run `sendCallNotesWeeklyDigests`
    - Inspect the manager mailbox
  Expected: Two separate emails arrive (Training Queue, Review Candidates), each listing notes from the past 7 days with rep name + caller + issue + resolution. Empty queues are silently skipped (no email). The function never throws.

S25 | Compact mode + pop-out (cross-tool) | Subsystem: Client (shell)
  Steps:
    - From any view, click the pop-out icon (top-right of sidebar or mobile header)
    - Confirm a new 440x780 chromeless window opens with sidebar + header collapsed
    - In the pop-out, navigate between views (Call Notes ↔ Time Clock ↔ Manage)
    - Click the pop-out icon again from the original window
    - Resize the pop-out down to ~360px width
  Expected: Pop-out window is named `umsTeamToolsCompact` — second pop-out click focuses the existing window instead of spawning a duplicate. All tool views render without horizontal overflow; modals near-full-window; field-row and ts-summary collapse to single column; action grid (Time Clock) and dept-chip grid (Call Notes) stack 2-col → 1-col gracefully.

### Deploy Command
Server: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy. Web app picks up the change on next page load.
Client: same single `clasp push -f` ships all HTML files alongside `Code.js`; same deploy step.
Test Suite: same `clasp push -f`. Tests don't ship to end users — run them from the editor with `runSmokeTests()` (safe on prod) or `runAllTests()` (writes TEST_ rows, cleans up at end).
