# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Projects

- **web-app/** — Multi-module browser web app deployed at one Web App
  URL. Hosts three modules today, registered side-by-side in the
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
   - **Metrics** — CDR integration module that reads DQE Historical
     Data from the CDR Report spreadsheet (the same sheet backing the
     `call-data-reporting` repo's Department Dashboard). Two tabs:
     "My Stats" (self-view for all reps — today's KPIs, 30-day
     % Answered trend sparkline, note-to-call coverage ratio) and
     "Team Metrics" (manager-only — per-rep table with date-range
     support and preset chips). The CDR data layer (`getCdrSS_()`,
     `getCdrAgentMetrics_()`, `getCdrDailyBreakdown_()`) is isolated
     behind helpers so a future swap to Neon Postgres (Option C)
     replaces only those functions. CDR metrics also enrich the
     Call Notes Stats tab (`managerGetShiftStats`) via a best-effort
     try/catch overlay — CDR failure never breaks existing stats.
     Backs the CDR Report spreadsheet (`CONFIG.CDR_SS_ID`).
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

- **CDR duration columns MUST use `getDisplayValues()`.** The CDR
  Report spreadsheet has a timezone mismatch (spreadsheet TZ
  `America/Mexico_City` vs script TZ `America/Chicago`). Duration
  columns (TTT col I, ATT col J, AvgAbdWait col AG,
  CsrAvgAbdWait col AH) get a phantom offset if read via
  `getValue()`. `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()`
  both read the full range with `getDisplayValues()` and parse the
  H:MM:SS strings via `cdrParseHms_()`. Never use `getValue()` for
  these columns. Same gotcha exists in `call-data-reporting`'s
  `Data.gs` — see that repo's CLAUDE.md for the full explanation.
- **CDR enrichment in `managerGetShiftStats` is best-effort.**
  The CDR overlay that adds `cdr` and `noteCoverage` fields to each
  rep's shift-stats card is wrapped in a try/catch. If the CDR
  spreadsheet is unreachable (missing `CDR_SS_ID` Script Property,
  deployer account lost access, etc.) the existing call-notes stats
  still return normally — the `cdr` field is simply absent. Client
  rendering checks `r.cdr` before showing CDR rows.
- **Secrets via Script Properties, not CONFIG.** `getAdpSS_()`,
  `getCdrSS_()`, `getManagerEmails_()`, `getDepartmentEmails_()`, and
  `getStateTaxRates_()` read `ADP_SS_ID`, `CDR_SS_ID`,
  `MANAGER_EMAILS`, `CN_DEPARTMENT_EMAILS`, and
  `CN_STATE_TAX_RATES` from Script
  Properties first, falling back to the CONFIG placeholders.
  Set the real values once in Apps Script editor → Project Settings
  → Script Properties (or use the Admin tab for dept/rate config);
  clasp pull/push leaves Script Properties untouched, so the
  committed `Code.js` never has to be scrubbed.
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
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v5`).
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
  `managerSubmitTimeOff`, `getEmployeesList`,
  `getEmployeeTimesheetForManager`, `managerGetCallNotes`,
  `managerSearchCallNotes`, `managerGetTrainingQueue`,
  `managerGetReviewCandidates`, `getEnrolledCallNotesReps`,
  `exportCallNotesRange`, `setCallNoteTrainingReply`,
  `managerGetShiftStats`, `managerGetUnresolvedActionCount`,
  `getTeamMetrics`,
  `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`,
  `saveUpdateSuggestions`, `removeAutomationTriggers`.
  Returning a dashboard or accepting writes without this check is a
  privilege escalation.
- **Trigger-handler endpoints are reachable via `google.script.run`.**
  The four time-based trigger handlers — `sendDailyMissedPunchAlerts`,
  `runDailyExportCheck`, `sendCallNotesEodDigest`,
  `sendCallNotesWeeklyDigests` — are top-level (required: Apps Script
  time-based triggers won't bind to underscore-suffix functions), which
  also means a logged-in rep can fire them from the browser console.
  Each calls `assertManagerCaller_(label)` at the top — throws if
  `getActiveUserEmail_()` ∉ `getManagerEmails_()`. In a trigger context
  the active user is the installer (always a manager via
  `installAutomationTriggers`'s own check), so the gate is a no-op for
  triggers. Any new public function that walks the roster, hits Mail,
  or otherwise has side effects you wouldn't want a rep firing should
  apply the same gate. `removeAutomationTriggers` also uses this
  gate — without it, a non-manager rep could silently disable all
  automation triggers.
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
  to `Logger.log` / `console.warn` only. `emailFromCallNote`
  is more careful: it sends via MailApp first (failure returns
  `success: false`), then stamps EmailedAt / EmailDepartments /
  Subform metadata in a separate try/catch. A stamp failure AFTER
  a successful send is logged to console but the call still returns
  `success: true` so the rep doesn't re-send a duplicate.
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
  from the in-app aesthetic. Plus three UMS-brand entries (`brand` =
  navy `#223b5d`, `brandSoft` = pale blue `#e6f2ff`, `logoUrl` = the
  UMS Presentation Logo) — these are NOT design-token-derived; they're
  the legacy `closeOrderEmail.js` / `updateOrderEmail.js` identity
  carried forward into the new web-app emails (Call Details table
  header, alternating row tint, top-of-email logo bar). Subform
  detail borders (shipping, resupply, OOP) also use resolved hex —
  `#b1d1c4` for good-transparent and `#e7bda3` for warn-transparent.
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
  endpoint rejects calls on other flag types. Switching flag types
  (e.g. action → training) clears `Resolved` as a side-effect, so
  stale `resolved=TRUE` from a prior action cycle doesn't resurface
  if the rep flips back to action.
- **EOD trigger is per-manager-tz with a window check, not per-rep tz.**
  `sendCallNotesEodDigest` runs once at `CONFIG.CALL_NOTES.EOD_WARNING_HOUR`
  in the manager's tz, then walks the roster. For each enrolled rep it
  checks whether *their* local clock is currently within
  ± `EOD_WARNING_WINDOW_MINUTES` of the same hour. Reps in zones far
  from the manager's tz get no digest on the day their local 5pm
  doesn't intersect the trigger window — a tradeoff for keeping a
  single trigger. If you have reps spread across more than ~6h of
  timezones, switch to per-tz triggers or widen the window. The
  window check uses circular distance (`Math.min(diff, 1440 - diff)`)
  so a near-midnight `EOD_WARNING_HOUR` wraps correctly — dormant
  for the default 17:00 hour, latent otherwise.
- **`SubformData` (column P) is a generic per-note metadata JSON blob.**
  Originally introduced to persist email-composer subform selections
  (so a "re-send same departments" flow can re-open the composer
  pre-populated), the blob now also stores: `trainingQuestion`
  (set on submit when training flag is selected),
  `trainingReply` / `trainingReplyBy` / `trainingReplyAt`
  (set by `setCallNoteTrainingReply` when a manager answers),
  `pinned` / `pinnedAt` (set by `setCallNotePinned`), and
  `completionSeconds` (form-start-to-submit duration captured on
  submit, used by `managerGetShiftStats`'s median calc). Future
  per-note metadata should also live here rather than spawning new
  columns. `callNoteRowToObject_` tries `JSON.parse` and returns
  `null` on failure rather than throwing — corrupted blobs should
  never break a read.
- **Late `google.script.run` successHandlers in Call Notes loaders
  guard on `currentView`.** Every Call Notes loader (`cnLoadToday_`,
  `cnLoadDate_`, `cnFireSearch_`, `cnMgrLoadQueue_`,
  `cnMgrLoadRepNotes_`) captures `const requestedView = currentView;`
  and skips the render branch on success/failure when
  `currentView !== requestedView`. Without this guard, a slow-network
  nav-away clobbers the new view's innerHTML because every view writes
  into the same `#view-area` node. State updates (CN_STATE.*) still
  happen unconditionally so the cache stays warm for when the rep
  returns. Apply the same pattern to any new Call Notes loader.
- **`cnRenderSubforms_` is shape-keyed via `host.dataset.shapeKey`.**
  Re-rendering the same shape is a no-op so typing into the Update
  Type field doesn't wipe in-progress subform values on every
  keystroke. When the shape changes (e.g. user switches from
  "Verified Shipping" to "Close Order"), the function first calls
  `cnGatherComposerSelections_()` in a try/catch to snapshot the
  prior DOM into state — so flipping back to the original shape
  restores their values.
- **`cnToggleComposerDept_` updates the modal in place, no full re-render.**
  Earlier versions re-rendered the entire modal innerHTML on every
  chip click, which flashed visibly. The current implementation calls
  `cnUpdateComposerDeptUI_` which mutates only the parts that depend
  on dept selection: chip `aria-pressed` states, the conditional
  "Other" email row, and the update-type datalist's option set. The
  `cnGatherComposerSelections_()` call up front is still defensive —
  it snapshots any in-progress subform values into state so a future
  re-render (e.g., subform shape-key change) doesn't lose typing. Any
  new dept-dependent UI must be added inside `cnUpdateComposerDeptUI_`,
  not in `cnRenderComposerFormStep_` alone, or it won't track toggles.
- **Optimistic UI for submit / flag / resolve on Call Notes.**
  Submitting, flagging, and resolving notes are optimistic — the
  client mutates `CN_STATE.rollingNotes` and calls render BEFORE the
  server RPC fires. Pending notes carry `_pending: true` and render
  with reduced opacity + a "Saving" badge in place of action buttons.
  Server failure triggers `cnRevertPendingSubmit_` (for submit) or
  restores the prior flag/resolved state (for toggles), and surfaces
  a clear toast. Flag/resolve/pin attempts on a pending note show
  "Just a moment — still saving" since the server has no record of
  it yet. A per-note `_flagInFlight` guard drops rapid double-clicks
  on flag / resolve / pin toggles — the second click is silently
  ignored while the first RPC is in flight. Edits and emails remain
  pessimistic — they require a server-issued noteId.
- **Form-completion timer is persisted to localStorage.**
  `cnFormTimerStartIfNeeded_` writes the start ms to
  `localStorage['umsCallNotesFormStartedAt']` on the first form
  input event; survives reloads (refresh mid-note shouldn't reset
  the clock). On submit, `cnFormTimerEndAndGet_` returns the elapsed
  seconds — capped at 30 min as null (rep walked away mid-note,
  shouldn't pollute the median). The value rides into the server
  payload as `subformData.completionSeconds`; the manager Stats tab
  medians over notes that captured one. Any new form-clearing path
  must call `cnFormTimerReset_` or the next note will inherit the
  prior session's elapsed time.
- **Sticky form draft is auto-saved on every input.**
  `cnPersistActiveFormDraft_` writes the active form contents to
  `localStorage['umsCallNotesActiveFormDraft']` debounced 400ms.
  `cnRestoreActiveFormDraft_` runs on Log view enter and surfaces a
  "Draft restored" toast when a draft was present. Both the
  successful-submit path and the explicit Clear Note button call
  `cnClearStickyFormDraft_`. **If you add a new form-clearing code
  path, call it there too** or the draft will resurrect on next load
  even though the rep meant to start fresh.
- **Voice dictation routes audio outside the BAA boundary.**
  `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED` is off by default. When on,
  the mic button uses `webkitSpeechRecognition`, which in Chrome
  routes the audio to Google's speech-to-text service — and the Web
  Speech API is NOT covered by a typical Google Workspace BAA. The
  operator must confirm the org's HIPAA stance before flipping the
  flag; patient names, device types, and addresses dictated into the
  mic leave the browser. The flag is surfaced via
  `getCallNotesDepartments` → `CN_STATE.deptConfig.voiceInputEnabled`,
  so the UI never renders the mic when the flag is false.
- **`safeTimezone_` validates roster timezone strings.**
  `safeTimezone_(tz)` tries `Utilities.formatDate(new Date(), tz, 'z')`
  and falls back to `CONFIG.TIMEZONE` with a `Logger.log` warning on
  failure. Used by `sendCallNotesEodDigest` and
  `sendDailyMissedPunchAlerts`. New code reading timezone values from
  the roster for trigger/automation contexts should route through this
  helper rather than raw `|| CONFIG.TIMEZONE` fallback.
- **Personal-sheet sync failures log to the audit trail.**
  `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a
  `PersonalSheetSyncFail` audit row on failure. Monitor AuditLog for
  this action type — it means a rep's personal Sheet is inaccessible
  and drifting from the ADP source of truth.
- **CN card buttons use `data-cn-action` delegation, not inline onclick.**
  `cnInstallCardDelegation_(area)` installs a single click listener on
  the view container that dispatches to `cnToggleFlag_`,
  `cnToggleResolved_`, `cnTogglePinned_`, `cnCopyNoteAgain_`,
  `cnOpenEmailComposer_`, `cnBeginEdit_`, `cnSaveEdit_`,
  `cnCancelEdit_`, `cnDeleteNote_`, `cnFindPriorCallsForTrx_`, and
  `cnToggleMoreMenu_` via the button's `data-cn-action` attribute.
  The note's ID is read from the closest `[data-note-id]` ancestor.
  A `_cnDelegationInstalled` flag on the area element prevents
  duplicate listeners when the user navigates between CN views
  (Log / History / Search share the same `#view-area` DOM node).
  Action handlers call `cnReRenderActiveView_()` instead of
  `cnRenderStack_()` directly — the dispatcher routes to
  `cnRenderStack_` in Log and `cnRenderHistoryStack_` in History so
  flag/pin/edit/delete updates render correctly in both views.
- **Training questions email managers immediately.**
  `submitCallNote` calls `notifyManagerTrainingQuestion_()` (best-
  effort, try/catch) when `flagType=training` and
  `subformData.trainingQuestion` is non-empty. Previously, managers
  only saw training questions in the weekly digest.
- **`setCallNoteFlag` accepts an optional `trainingQuestion`.**
  When flagging an existing note as `training` from a card button,
  the client prompts for a question and passes it as the third arg.
  The server merges it into `subformData.trainingQuestion` inside
  the same lock. This parallels the active-form path where the
  question is set during `submitCallNote`.
- **`getMyCallNotesRange` caps at 90 days.** The date-range History
  endpoint validates both dates and rejects spans > 90 days. The
  client presets (Last 7, Last 30) stay within this cap; custom
  ranges could hit it. Returns notes sorted newest-first with the
  same response shape as `getMyCallNotes`.
- **Call-note delete window.** `deleteCallNote` enforces
  `CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS` (5 min). Reps can only
  delete notes within 5 minutes of creation — older notes must be
  edited in place. The window matches the time-clock `selfDeletePunch`
  pattern. The client's delete button (via `cnDeleteNote_`) shows the
  server's error if the window has passed.
- **`getCallNotesDepartments` requires an enrolled employee.** Added
  an auth check so unregistered domain users can't read internal
  department email addresses. The CN client calls this after employee
  state loads, so the auth is always present.
- **Call Notes ambient polling stops on tool switch.** `showView()`
  calls `cnStopAmbientPolling_()` when navigating to a non-Call Notes
  tool. Without this, the 60-second `getCallNotesAmbient` interval
  fired continuously even in Time Clock views.
  `cnStartAmbientPolling_()` restarts it on return to any CN tab.
- **Modals close on Escape and trap focus.** A shared keydown handler
  in `script_core.html` closes any `.overlay.open` on Escape. A
  `focusin` handler returns focus to the modal's first focusable
  element if focus escapes. Both are generic — they cover the Adjust,
  Day Detail, Day Edit, Export, Manager Time-Off, and Call Notes
  Export modals.
- **Public form endpoints have no employee auth — token is the
  credential.** `getFormByToken` and `submitFormByToken` are the
  only server functions accessible without `getEmployeeInfo_()`
  auth. They validate via UUID token (checked against the
  `FormTokens` sheet tab). Never add PHI-returning logic to these
  endpoints beyond what the token already authorizes. The token
  contains the form type and prefill data — it does NOT grant
  access to the rep's call notes, employee roster, or any other
  internal data. `serveExternalForm_` serves `form_public.html`
  which is a standalone page with no `include()` of internal
  partials.

## Key Design Decisions

- **Multi-tool registry with tab sub-navigation.** The `TOOLS` object
  at the top of `script_core.html` is the single source of truth. Each
  top-level entry is a TOOL (Time Clock, Call Notes, Metrics); each tool
  declares a `sidebarIcon`, a `defaultTab`, and a `tabs` map whose
  keys are globally unique tab identifiers. The sidebar + mobile-nav
  show ONE button per tool. Sub-navigation is a horizontal tab bar
  (`#tool-tab-bar`) rendered above the view area, populated by
  `renderToolTabBar(toolKey)` whenever a tool is opened.
  `enterTool(toolKey, tabKey)` is the entry point — it sets the
  sidebar active state, swaps the sidebar sub-label, renders the tab
  bar, and dispatches to the chosen tab (or `defaultTab` if none
  given, or the URL `?tool=<tabKey>` deep-link if present).
  `showView(tabKey)` dispatches to the specific tab's enter handler
  via `window[TOOLS[toolKey].tabs[tabKey].enter]`. `currentView` holds
  the active tab key, so existing guards like
  `if (currentView === 'callNotes') ...` continue to work — tab keys
  are deliberately globally unique across tools.
  Adding a new tab: append it to its tool's `tabs` map + implement
  the `enter*` handler in the tool's partial. Adding a new tool:
  add a TOOLS entry + drop tab partials + `include()` them from
  `index.html`. The shell auto-rebuilds either way.
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
  parameterizing functions. Exception: `DEPARTMENT_EMAILS`,
  `STATE_TAX_RATES`, and `UPDATE_SUGGESTIONS_BY_DEPT` are now read
  through getter helpers (`getDepartmentEmails_()`,
  `getStateTaxRates_()`, `getUpdateSuggestions_()`) that check
  Script Properties first, so they can be edited via the Admin tab
  without a redeploy.
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
  for full runs. `setupTestEnvironment` provisions a test call-notes
  Sheet for the India test employee (creates or reuses, stores the
  ID in column L); `cleanupTestData` wipes its Notes tab.
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
- **Secrets via Script Properties.** `ADP_SS_ID`, `MANAGER_EMAILS`,
  `CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`, and
  `CN_UPDATE_SUGGESTIONS` are read from Script Properties first (set
  in Apps Script editor → Project Settings → Script Properties, or
  via the Admin tab for the latter three), falling back to the
  placeholders in CONFIG. This lets the repo stay clean of real
  values without manual scrubbing on every `clasp pull`, since
  Script Properties live on the deployed project and are never
  touched by clasp.
- **Web app runs as the deployer, open to ANYONE_ANONYMOUS.**
  `web-app/appsscript.json` declares `webapp.executeAs:
  "USER_DEPLOYING"` and `webapp.access: "ANYONE_ANONYMOUS"`.
  The deployer's account is therefore the one that grants OAuth
  consent for every Sheet open (ADP roster + per-rep call-notes
  Sheets), every `MailApp.sendEmail`, and the `UrlFetchApp` calls
  used by the automated export and form PDF downloads. That
  account must have edit access to the ADP spreadsheet AND to
  every per-rep call-notes Sheet — redeploying as a different
  account silently fails until those Sheets are reshared.
  `ANYONE_ANONYMOUS` is required for the external fillable-forms
  feature (the `?form=<token>` route). The internal app is
  protected by a domain gate in `doGet()`: only `@umsupply.com`
  users see the internal tool; all others get "Access Restricted".
  All `google.script.run` endpoints still require
  `getEmployeeInfo_()` (returns null for non-employees), so the
  internal API surface is inaccessible to external visitors. The
  only public endpoints are `getFormByToken` and
  `submitFormByToken`, which validate via UUID token.
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
  underlying `color-mix(in oklch, …)` everywhere. Fallback hex
  values are declared first; `@supports (color: color-mix(...))`
  overrides with the dynamic `color-mix` versions for modern
  browsers — pre-2023 browsers get the static approximations.
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
  Clock's Time Off and Manager views also render `.compact-header`
  when `COMPACT_MODE === true`. The Clock tab's hero layout needs
  no explicit header. Per-class compact-mode tuning lives in the
  styles partial.
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
  before send. The preview→send handoff is body-hash guarded:
  `previewCallNoteEmail` returns a SHA-256 `bodyHash` over
  (htmlBody, subject, to); `emailFromCallNote` re-renders, recomputes,
  and refuses to send when the hash differs. Catches the case where
  the rep edits the note in another tab between Preview and Send —
  the previewed body and the sent body always match, or the send is
  rejected with a clear error.
- **Auto-copy format is a CONFIG template.** `CONFIG.CALL_NOTES.AUTO_COPY_FORMAT`
  uses `{caller}`, `{callback}`, `{patientAndTrx}`, `{issue}`,
  `{resolution}`, `{timestamp}`, `{transferredTo}`, etc. tokens —
  Robin can tune the CRM-paste-friendly serialization without code
  changes. The replacement is straight string-replace; no escaping
  (the clipboard is plain text). The default is now multi-line
  labeled (`Callback Number: ... \n Caller Name: ... \n ...`); the
  prior single-line pipe-separated format was retired in commit
  b87a1fe. `{transferredTo}` substitutes "N/A" when blank — mirrors
  the email body's defaulting so paste + email line up.
- **Client-side persistence is four localStorage keys.** All per-
  browser, all wrapped in try/catch so a privacy-mode browser
  doesn't break:
  - `umsTimeClockMode` — dark/light preference (read by the boot
    script in `index.html`).
  - `umsCallNotesLastDept` — the rep's last email-composer department
    selection (re-applied as the default on the next compose click).
  - `umsCallNotesActiveFormDraft` — the in-progress Call Notes form
    auto-saved on every input (debounced 400ms); restored on next
    Log view enter with a "Draft restored" toast. Cleared on
    successful submit or explicit Clear Note.
  - `umsCallNotesFormStartedAt` — start-ms of the active form's
    completion timer; persists across refresh so a mid-form reload
    doesn't reset the clock. Captured into `subformData.completionSeconds`
    on submit.
  Clearing browser data wipes all four; only the form-draft loss is
  user-visible (and only if the rep had a draft mid-call).
- **Optimistic UI is the perceived-speed mechanism for the Call Notes
  hot path.** Apps Script web-app RPCs add 300–800ms baseline; for the
  most-frequent actions (submit a note, toggle a flag, toggle resolved)
  the client mutates `CN_STATE.rollingNotes` and re-renders BEFORE
  firing the RPC. The rep sees zero perceived latency — same speed as
  pasting into a Sheet. Server sync happens in the background; failures
  trigger an explicit revert (`cnRevertPendingSubmit_` for submit;
  in-place state restore for flag/resolve) with a clear toast. Auto-copy
  to clipboard also runs in the optimistic path so the rep can paste
  into the CRM before the network has acknowledged anything. Email
  and edit actions stay pessimistic — they need a server-issued noteId
  and can't easily undo.
- **Combined Clock+Timesheet is one tab, two sections.**
  `enterClockCombinedView` (in `tc/script_clock.html`) creates two
  sibling sections inside `#view-area`: `#clk-section` (clock UI) and
  `#clk-ts-section` (the rep's current timesheet). Punch handlers and
  self-undo re-renders target `getClockArea_()` — which returns
  `#clk-section` when the combined view is mounted, else `#view-area`
  — so the timesheet section below isn't wiped on each clock-side
  interaction. `loadTimesheet(start, end, targetArea)` accepts an
  optional 3rd arg that scopes its re-render to the combined view's
  sub-section; without it the function falls back to `#view-area`.
  `renderTimesheetView(area, data, { combined: true })` suppresses the
  redundant breadcrumb / h1 since the tab bar already says "Clock".
- **Day Edit modal on Live Status cards.** Each employee card in the
  manager Live Status grid has a pencil button that opens the Day
  Edit modal. The modal has a date picker (defaults to today),
  pre-populates existing punch times via
  `getEmployeeTimesheetForManager`, and submits via `managerSaveDay`.
  The manager can add, edit, or remove individual punch slots and
  must provide a reason for edits older than
  `CONFIG.OLD_ADJUST_ALERT_DAYS`.
- **Personal pin is per-rep, capped at 3, stored in `subformData`.**
  Rep toggles the pin via the bookmark icon on a card. State lives in
  `subformData.pinned` + `subformData.pinnedAt` — no schema migration.
  The 3-pin cap is enforced server-side inside the same `ScriptLock`
  as the toggle so two parallel pin requests can't both squeak past it.
  Pinned notes render in `#cn-pinned-tray` above the rolling stack on
  the Log view; `cnRenderStack_` deduplicates so the same noteId never
  appears in both the tray and the stack. `getMyPinnedCallNotes`
  returns the rep's pinned notes across ALL dates (not just today) so
  a complex case pinned last week stays visible. The pinned tray
  header shows `X/3` capacity; at 3/3 the count goes warn-colored
  and un-pinned cards' bookmark buttons are dimmed with a
  "Unpin a note first" tooltip.
- **Manager Q&A reply on training-flagged notes.** Training-flagged
  notes can carry a free-text question (`subformData.trainingQuestion`,
  set client-side when the rep picks the training flag) and a manager
  reply (`subformData.trainingReply` + `trainingReplyBy` +
  `trainingReplyAt`, set by `setCallNoteTrainingReply`). Rep's Log
  view renders the answer line directly below their question (green
  check icon vs the question's blue bulb); manager Per-Rep view shows
  an inline reply input on each training card; weekly training digest
  renders Q: and A: side-by-side. Reply is only meaningful on
  training-flagged notes — server rejects calls on other flag types
  (parallels the resolve-only-on-action invariant). Audit row
  `CallNoteTrainingReply` carries the manager's email as actor.
- **Email body restored to the UMS legacy aesthetic.** Call-note
  emails sent from the new web app now match the prior
  `closeOrderEmail.js` / `updateOrderEmail.js` identity: UMS logo bar
  at the top, navy `#223b5d` Call Details table header, pale-blue
  `#e6f2ff` alternating rows, and a template-specific update banner
  (Close Order = red, OOP Order = orange, Verified Shipping / Repeat
  Resupply = green, default = navy). The brand colors live in
  `CN_EMAIL_PALETTE.brand` / `brandSoft` / `logoUrl` — see the gotcha
  about that constant for the maintenance rule. Email-client
  compatibility is preserved by inlining the hex (no CSS variables;
  email clients strip `<style>` blocks).
- **Department emails and state tax rates are editable via the Admin
  tab.** Call Notes → Admin (manager-only) reads the current config
  from `getDepartmentEmails_()` / `getStateTaxRates_()` and writes
  changes to Script Properties (`CN_DEPARTMENT_EMAILS`,
  `CN_STATE_TAX_RATES`) via `saveDepartmentEmails` /
  `saveStateTaxRates`. Both save endpoints are manager-gated and
  write an `AdminConfigChange` audit row. Changes take effect
  immediately — no redeploy needed. CONFIG values in `Code.js` serve
  as the fallback when no Script Property is set.
- **Stale-flag badge on the manager CN landing.**
  `managerGetUnresolvedActionCount` scans the flag + resolved columns
  (2 cols only, not full rows) across all enrolled reps' Sheets and
  returns `{ count }`. The Team Notes view renders the count as a
  badge on page load.
- **Client-side undo window handles midnight wrap.**
  `timeDiffSecondsClient` computes `86400 + diff` when the raw diff
  is negative (punch at 23:58, now at 00:02), capping at
  `SELF_UNDO_WINDOW_SECONDS` so yesterday's punches don't falsely
  appear eligible. The server re-validates independently.
- **Bulk approve/deny fires parallel RPCs.** The manager Pending
  Time Off section has checkboxes + a bulk bar when 2+ requests are
  pending. Bulk approve/deny calls `updateTimeOffStatus` once per
  checked request in parallel. Each call acquires its own
  `ScriptLock` independently, so the operations serialize safely.
  A single toast summarizes successes vs. failures; the dashboard
  refreshes once all RPCs complete.
- **Dashboard analytics are computed from existing data.**
  `getManagerDashboard` derives `punchTrend` (daily punch counts for
  the last 7 days) and `toSummary` (approved/pending/denied time-off
  requests for the current month) from the `adpRows` and `toRows`
  already loaded by the function — no additional Sheet reads. The
  client renders an inline SVG bar chart and a color-coded summary
  card.
- **CN card actions use a primary/secondary split.** Frequently used
  actions (flag-action, flag-training, pin, copy, email) are always
  visible. Less-frequent actions (flag-review, resolve, edit,
  find-prior-TRX) are behind a chevron-down `data-cn-action="more"`
  toggle that opens an inline `cn-more-menu` popover.
- **Email subforms are color-coded by type.** `sf-shipping` /
  `sf-resupply` = green left border, `sf-close` = red, `sf-oop` =
  orange. Matches the legacy email identity palette. The email
  composer form step also shows a "Note Reference" panel at the
  bottom with all 7 note fields so the rep can cross-check while
  composing.
- **Email composer modal is draggable + resizable.** The title bar
  has `cursor: move` and a `mousedown` handler
  (`cnStartDragModal_`) that repositions the modal via
  `position: fixed`. The modal also has `resize: both` for the
  browser's native resize grip.
- **Keyboard shortcuts accelerate the Call Notes hot path.**
  Ctrl/⌘+Enter saves & copies (existing). Ctrl/⌘+Shift+Enter
  saves & opens the email composer. Ctrl/⌘+1/2/3 toggle
  action/training/review flags on the active form. Ctrl/⌘+Backspace
  clears the form. Ctrl/⌘+/ or bare ? opens a shortcuts help
  overlay. Shortcuts only bind in the Log view's active form; the
  ? handler skips when focus is in an input/textarea. The help
  overlay uses the shared `.overlay` pattern (Escape closes it).
- **Training Q&A tray surfaces manager answers on the Log view.**
  A collapsible "Training Answers" section renders between the
  pinned tray and the filter bar, showing the rep's last 5
  training-flagged notes that have a manager reply (from
  `getMyTrainingQA`). An "Answered" filter chip also appears in
  the filter bar. Both give the rep visibility into manager
  feedback without navigating to History.
- **History view supports date ranges.** The History tab defaults
  to "Last 7 Days" with From/To date inputs and presets (Yesterday,
  Last 7 Days, Last 30 Days, This Week, Last Week). Multi-date
  results render with date-separator headers grouping notes by day.
  Single-date mode (start === end) uses the original `getMyCallNotes`
  endpoint; ranges use `getMyCallNotesRange` (90-day cap). The
  client stores both `CN_STATE.historyDate` (start) and
  `CN_STATE.historyEndDate`.
- **Manager cross-rep search in Team Notes.** A Search tab in the
  Team Notes view calls `managerSearchCallNotes` with the same
  All/Caller/Issue field tabs as the rep search. Results show
  `repName` on each card. 500-result cap.
- **Stats drill-down links to Per-Rep View.** Rep names in the
  Stats tab are clickable — clicking one navigates to the Per-Rep
  View for that rep and the same date.
- **Email department display on note cards.** Note cards show which
  departments an email was sent to (from `emailDepartments`) next
  to the sent timestamp. The `title` attribute includes the full
  list for overflow.
- **External email for customers and providers.** A standalone
  "Send External" button on the Call Notes Log view opens a modal
  for sending branded emails to customers or providers — not tied
  to a specific note (though optionally linkable). The modal offers
  recipient type (customer/provider), email + name, form attachment
  checkboxes from `CONFIG.CALL_NOTES.FORM_CATALOG`, and an optional
  message. PDFs are fetched from the repo's `/forms/` folder via
  `UrlFetchApp` from `CONFIG.CALL_NOTES.FORM_BASE_URL` (raw GitHub
  URL). Customer emails use a warm tone; provider emails use a
  clinical tone. Both use `CN_EMAIL_PALETTE` brand colors. The
  `sendExternalEmail` endpoint stamps `subformData.externalEmails[]`
  on the linked note (if any) and writes an `ExternalEmailSent`
  audit row. Adding a form: upload the PDF to `/forms/` in the repo,
  add an entry to `FORM_CATALOG`, redeploy.
- **Interactive fillable web forms via token-gated public route.**
  The `?form=<token>` route in `doGet` serves `form_public.html` —
  a standalone, UMS-branded, mobile-responsive page where external
  recipients fill out forms digitally. Tokens are UUID-based, stored
  in the `FormTokens` sheet tab, and expire after
  `CONFIG.FORM_TOKEN_EXPIRY_HOURS` (72h). Each token is one-time-use
  (status transitions: pending → submitted or expired). Three form
  templates: EAA (Economic Assistance Application), PT/OT Rx, and
  Seating Evaluation — each with a canvas-based signature pad
  (mouse + touch). A HIPAA privacy notice with consent checkbox
  gates form field visibility. Submissions are stored in the
  `FormSubmissions` sheet tab, the creating rep is notified via
  email, and the linked call note (if any) gets a
  `subformData.formSubmission` stamp. The external email modal
  offers a per-form toggle: "Attach PDF" vs "Send as fillable form"
  — fillable forms generate tokens and embed "Complete this form"
  CTA buttons in the email body. Reps can pre-fill key fields
  (patient name, dates) before sending.

## Operator State Checklist

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:

- **Set Script Property `ADP_SS_ID`** to the real spreadsheet ID in
  Apps Script editor → Project Settings → Script Properties. Without
  it, `getAdpSS_()` falls back to the inert `'YOUR_ADP_SPREADSHEET_ID'`
  placeholder in CONFIG and fails on first sheet open.
- **Set Script Property `CDR_SS_ID`** to the CDR Report spreadsheet
  ID (the same spreadsheet backing the `call-data-reporting`
  Department Dashboard). `getCdrSS_()` reads this before CONFIG.
  Without it, the Metrics tool and the shift-stats CDR enrichment
  will show "No call data found" or gracefully degrade (the CDR
  overlay in `managerGetShiftStats` is best-effort). The deployer
  account must have at least Viewer access to this spreadsheet.
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
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. The
  installer now wires four triggers:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm)
    - `sendCallNotesEodDigest` (call-notes, daily manager-tz 5pm)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am)
  Triggers do not survive an Apps Script project re-clone. After
  install, `installAutomationTriggers` emails `MANAGER_EMAILS` a
  reminder about the cross-account trigger-ownership pitfall: Apps
  Script's `ScriptApp.getProjectTriggers()` only returns triggers
  owned by the current user, so duplicates from a previous installer
  are invisible to a fresh run. If a different account ever
  installed these triggers before, have that account run
  `removeAutomationTriggers()` first.
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
- **Call-notes department list + state tax rates** are read by
  `getDepartmentEmails_()` and `getStateTaxRates_()`, which check
  Script Properties (`CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`)
  first, then fall back to `CONFIG.CALL_NOTES.DEPARTMENT_EMAILS` /
  `STATE_TAX_RATES`. Adding or changing a department or rate: use the
  **Admin tab** in Call Notes (manager-only), which writes to Script
  Properties and takes effect immediately. Alternatively, set the
  Script Properties directly or edit CONFIG and redeploy.
  `STATE_ABBR_TO_NAME` remains CONFIG-only (no admin UI — rarely
  changes). Similarly, `CN_UPDATE_SUGGESTIONS` stores the
  per-department update-type datalist suggestions as JSON; editable
  via the Admin tab or Script Properties directly.
- **Call-notes EOD + weekly digest knobs** are
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (default 17),
  `EOD_WARNING_WINDOW_MINUTES` (default 30), and the
  `installAutomationTriggers()` schedule (Friday 8am for the weekly
  digest). Changing the hour requires re-running
  `installAutomationTriggers()` so the trigger picks up the new value.
- **`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`** controls the
  voice-to-text mic on Issue / Resolution fields. Default `false`.
  Flip to `true` only after confirming the org's stance on audio
  routed to the browser vendor's speech-to-text service (Chrome →
  Google, NOT covered by typical Google Workspace BAA — PHI in the
  rep's spoken note leaves the browser). Requires a redeploy to
  propagate to clients. When false, the UI never renders the mic
  button (no surface area for accidents).
- **`FormTokens` and `FormSubmissions` sheet tabs** are auto-created
  in the ADP spreadsheet on first use of the external forms feature.
  `FormTokens` tracks pending/submitted/expired form links (token,
  formType, recipientEmail, expiresAt, status, prefillData, noteId).
  `FormSubmissions` stores completed form data + signature base64.
  Both are append-only. No manual setup needed — the
  `getOrCreateFormTokensSheet_()` / `getOrCreateFormSubmissionsSheet_()`
  helpers provision them with headers on first call.
- **Form catalog** is configured in
  `CONFIG.CALL_NOTES.FORM_CATALOG` — each entry maps an ID to a
  filename in the repo's `/forms/` folder. Adding a form: upload
  the PDF to `/forms/`, add an entry to FORM_CATALOG with
  `{id, name, fileName, category}`, and redeploy. PDFs are fetched
  via `UrlFetchApp` from the raw GitHub URL
  (`CONFIG.CALL_NOTES.FORM_BASE_URL`). Interactive (fillable) forms
  must also have a rendering function in `form_public.html`.

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
Client (Metrics views):
  web-app/metrics/script_metrics.html
Client (public forms):
  web-app/form_public.html
Test Suite:
  web-app/Tests.js

### Invariant Library
INV-01 | All mutating server functions acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` | Subsystem: Server
INV-02 | All manager-gated functions verify `callerEmp.isManager` before any side effect and return `{ error: 'Manager access required.' }` (or `success: false`) on failure | Subsystem: Server
INV-03 | PTO balance changes in `updateTimeOffStatus` fire only on Pending→Approved (deduct) or Approved→non-Approved (restore) transitions | Subsystem: Server
INV-04 | Date inputs match `/^\d{4}-\d{2}-\d{2}$/` and time inputs match `/^([01]\d|2[0-3]):[0-5]\d$/` (enforces 24-hour validity, not just `HH:mm` shape) before any sheet write | Subsystem: Server
INV-05 | Future-dated punches are rejected: both `date > todayStr` and same-day `time > nowTime` | Subsystem: Server
INV-06 | Employee adjustments beyond `CONFIG.ADJUST_WINDOW_DAYS` are rejected; beyond `CONFIG.OLD_ADJUST_ALERT_DAYS` a non-empty reason is required | Subsystem: Server
INV-07 | Manager punch deletes are rejected when older than `CONFIG.MGR_DELETE_WINDOW_DAYS` (daysBack computed in the target employee's timezone) | Subsystem: Server
INV-08 | Every state-changing manager action writes an audit row via `writeAuditLog_` before returning success, with the caller's email recorded | Subsystem: Server
INV-09 | Adjustments are stored as `ADJ-{punchType}` in the COMMENTS column; `normalizeType_` strips the prefix consistently on read | Subsystem: Server
INV-10 | Roster cache (`ROSTER_CACHE_KEY`) is invalidated after any write that mutates employee-sheet columns (`adjustLeaveBalance_`, test setup, etc.) | Subsystem: Server
INV-11 | Employee-scoped endpoints use the caller's identity (`getEmployeeInfo_`); only manager wrappers accept a target employee ID | Subsystem: Server
INV-12 | `tzAbbr_` passes unknown timezone strings through unchanged; it never throws | Subsystem: Server
INV-13 | `getManagerDashboard` reads the audit sheet via a bounded range (last ~20 rows), never the full sheet | Subsystem: Server
INV-14 | Email sends (`notifyEmployeeOfDecision_`, `sendDailyMissedPunchAlerts`, `sendAutomatedExport_`) are wrapped in try/catch and never block the API result | Subsystem: Server
INV-15 | Automation triggers can only be installed by emails in `MANAGER_EMAILS` (Script Properties or CONFIG, via `getManagerEmails_()`); `installAutomationTriggers` throws otherwise | Subsystem: Server
INV-16 | Empty timezone strings fall back to `CONFIG.TIMEZONE`; empty leave-balance cells parse as 0. Trigger handlers route roster timezone values through `safeTimezone_()`, which validates via `Utilities.formatDate` and logs invalid values before falling back | Subsystem: Server
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
INV-28 | Whenever the `EMP` enum gains or changes columns, `ROSTER_CACHE_KEY` is bumped (currently `employee_roster_v5`) so old cached entries with the wrong column shape are not served | Subsystem: Server
INV-29 | `normalizeDate_` uses the spreadsheet's timezone (`getAdpSS_().getSpreadsheetTimeZone()`) to format Date cells — not `CONFIG.TIMEZONE` — so dates round-trip consistently regardless of the script's timezone configuration | Subsystem: Server
INV-30 | All mutating Call Notes server functions (`submitCallNote`, `updateCallNote`, `setCallNoteFlag`, `setCallNoteResolved`, `deleteCallNote`, `emailFromCallNote`, `setCallNoteTrainingReply`, `setCallNotePinned`) acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` (INV-01 generalized) | Subsystem: Server
INV-31 | Manager-gated Call Notes endpoints (`managerGetCallNotes`, `managerSearchCallNotes`, `managerGetTrainingQueue`, `managerGetReviewCandidates`, `setCallNoteTrainingReply`, `managerGetShiftStats`, `managerGetUnresolvedActionCount`, `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`) verify `callerEmp.isManager` before any side effect (INV-02 generalized) | Subsystem: Server
INV-32 | Every state-changing Call Notes action writes an audit row via `writeAuditLog_` (`CallNoteCreate` / `Edit` / `Flag` / `Resolve` / `Delete` / `Email` / `TrainingReply` / `Pin`) with `noteId=<uuid>` in the notes field — the audit log is the only cross-rep trail of call-note activity. Manager-actor rows (TrainingReply) carry the manager's email as actor via the actorEmail parameter | Subsystem: Server
INV-33 | `submitCallNote` does NOT send a department email. Sending is a separate two-stage flow: `previewCallNoteEmail` (returns rendered HTML for confirm-before-send) then `emailFromCallNote` (sends + stamps EmailedAt/EmailDepartments + writes audit). Exception: when `flagType=training` and `subformData.trainingQuestion` is non-empty, `submitCallNote` fires a best-effort manager notification via `notifyManagerTrainingQuestion_()` (try/catch, does not block the response — see INV-58) | Subsystem: Server
INV-34 | `setCallNoteResolved` rejects calls when `FlagType !== 'action'`; only action-flagged notes have a resolved state | Subsystem: Server
INV-35 | `getCallNotesSheet_(emp)` throws "Your call-notes Sheet is not configured" when `emp.callNotesSheetId` is missing — call-notes endpoints surface this as the enrollment-missing splash in the client; no auto-provision path exists | Subsystem: Server
INV-36 | Call-note email sends (`emailFromCallNote`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`) are wrapped in try/catch and never block the API result (INV-14 generalized) | Subsystem: Server
INV-37 | `sanitizeFlagType_` only allows `''` / `'action'` / `'training'` / `'review'` to be written to FlagType; unknown values silently coerce to `''` rather than corrupting the column | Subsystem: Server
INV-38 | Compact-mode is a shell-level attribute (`data-compact="1"` on `documentElement`); set from the `?compact=1` URL param on boot and consumed via CSS selectors in `styles.html`. Tool views render `.compact-header` instead of `.view-title-row` when `COMPACT_MODE === true` | Subsystem: Client (shell)
INV-39 | `getCallNotesAmbient` is authenticated to the caller (requires registered employee), read-only — returns only `{enrolled, unresolvedActionCount, staleActionCount, todayTotal, staleFlagHours}` for the calling rep. Cached for `CN_AMBIENT_CACHE_TTL` (60s) under `CN_AMBIENT_CACHE_PREFIX + emp.id`. The cache is purely TTL-driven; mutating endpoints do NOT eagerly invalidate (the 60s ceiling matches the sidebar polling interval). Used by the sidebar badge polling; never leaks cross-rep data | Subsystem: Server
INV-40 | `setCallNoteFlag` clears `Resolved` (sets to `'FALSE'`) on any flag-type transition (`oldFlag !== t`), not only on full clear — so stale `resolved=TRUE` from a prior action-flag cycle doesn't resurface when the rep flips back to action | Subsystem: Server
INV-41 | `previewCallNoteEmail` returns `bodyHash` (SHA-256 hex over `htmlBody + subject + to`). `emailFromCallNote(noteId, payload, expectedBodyHash)` requires the hash and refuses to send when the freshly re-rendered body's hash doesn't match — guards against the rep editing the note between Preview and Send | Subsystem: Server
INV-42 | `emailFromCallNote` sends via MailApp first (wrapped in its own try/catch — failure returns `success: false`), then stamps `EmailedAt` / `EmailDepartments` / `Subform` metadata in a separate try/catch. A stamp failure after a successful send logs to console and returns `success: true` so the rep doesn't re-send a duplicate | Subsystem: Server
INV-43 | Mutating CN endpoints do NOT eagerly invalidate the ambient cache. The 60s `CN_AMBIENT_CACHE_TTL` is the sole freshness ceiling and matches the sidebar polling interval — badge can be at most 60s stale, same as if invalidation happened on every mutation. `invalidateCnAmbientCache_` is retained for manual operator use (e.g., after a direct Sheet edit that should reflect in the badge immediately) but is no longer called from the mutation hot path | Subsystem: Server
INV-44 | The four trigger-handler endpoints (`sendDailyMissedPunchAlerts`, `runDailyExportCheck`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`) call `assertManagerCaller_(label)` at the top. Required because they're top-level (time-based triggers won't bind to underscore-suffix functions) and therefore reachable via `google.script.run` | Subsystem: Server
INV-45 | `searchMyCallNotes(query, field, dateRange, exact)` — when `exact === true`, matches `patientAndTrx` exactly (case-insensitive, trimmed) and ignores `field`. Otherwise substring matching across (caller, callback, patientAndTrx) for `field='caller'|'all'` and (issue, resolution) for `field='issue'|'all'`. Used by the "Find prior calls for this TRX" card button | Subsystem: Server
INV-46 | `exportCallNotesRange(startDate, endDate)` is manager-gated, read-only across all enrolled reps' Sheets. Creates a new Sheet with a 15-column schema (RepId, RepName, DateLocal, Timestamp, Callback, Caller, Relationship, PatientAndTRX, Issue, TransferredTo, Resolution, FlagType, Resolved, EmailedAt, EmailDepartments) and writes a `CallNotesExport` audit row before returning. A broken per-rep Sheet doesn't fail the run — caught and logged, skipping that rep | Subsystem: Server
INV-47 | `getManagerDashboard` pending[] entries carry `conflictsOff: [{name, status, type}]` (other reps off the same day, excluding self) and `holidayName: string|null` (US holiday name). Computed from a date→requests index built once per dashboard load + a holiday map keyed by years present in pending requests. The manager dashboard surfaces both inline on each pending card and echoes them into the Approve confirm dialog | Subsystem: Server
INV-48 | Optimistic UI on the Call Notes hot path: `cnSubmitActiveForm_`, `cnToggleFlag_`, and `cnToggleResolved_` mutate `CN_STATE.rollingNotes` and re-render BEFORE the server RPC fires. Pending notes carry `_pending: true` and render with reduced opacity + a "Saving" badge in place of action buttons. Server failure triggers `cnRevertPendingSubmit_` (for submit) or restores the prior flag/resolved state (for toggles), and surfaces a clear toast. Auto-copy also runs in the optimistic path so the rep can paste into the CRM before the network acknowledges anything | Subsystem: Client (Call Notes views)
INV-49 | `setCallNoteTrainingReply(repId, noteId, reply)` is manager-gated, locked, and rejects calls on non-training-flagged notes (parallels INV-34's resolve-only-on-action rule). Merges the reply + author email + reply timestamp into the target rep's `subformData.trainingReply` / `trainingReplyBy` / `trainingReplyAt` keys (no schema migration). Empty reply clears the keys. Writes a `CallNoteTrainingReply` audit row with the manager's email as actor | Subsystem: Server
INV-50 | `setCallNotePinned(noteId, pinned)` is caller-scoped (operates on the caller's own per-rep Sheet), locked, and enforces `CN_PIN_LIMIT` (currently 3) inside the lock so two parallel pin requests can't both squeak past the cap. Pin state lives in `subformData.pinned` (boolean) + `subformData.pinnedAt` (timestamp). Writes a `CallNotePin` audit row | Subsystem: Server
INV-51 | `getMyPinnedCallNotes` returns the caller's pinned notes across ALL dates (no date filter), sorted newest-pinned first. The Log view's pinned tray spans the rep's entire pin history — a complex case pinned last week is still visible today | Subsystem: Server
INV-52 | `managerGetShiftStats(date)` is manager-gated, read-only across all enrolled reps' Sheets. Per-rep aggregates: `totalNotes`, `flagCounts {action, training, review}`, `resolvedCount`, `emailsSent`, `medianCompletionSeconds`, `shiftSpan {first, last}`. Median (not mean) is used for completion seconds; outliers > 30 min are stored as null in `subformData.completionSeconds` upstream so they never enter the dataset. A broken per-rep Sheet doesn't fail the run — caught and logged, skipping that rep | Subsystem: Server
INV-53 | Voice-to-text dictation is opt-in via `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED` (default false). When true, `cnVoiceMicMarkup_` renders mic buttons next to Issue and Resolution; clicking uses `webkitSpeechRecognition`, which in Chrome routes audio to Google's speech-to-text service — NOT covered by a typical Google Workspace BAA. The flag must stay false until the operator confirms the org's HIPAA stance. When false, the UI never renders the mic (no DOM surface for accidents) | Subsystem: Server + Client (Call Notes views)
INV-54 | Form-completion timer captures duration from the first input event in the active form to the submit. Start time persists to `localStorage['umsCallNotesFormStartedAt']` so a mid-form reload doesn't reset the clock. On submit, `cnFormTimerEndAndGet_` returns elapsed seconds (capped at 30 min as null — rep walked away mid-note). The value rides into the server payload as `payload.subformData.completionSeconds`; the manager Stats tab medians over notes that captured one | Subsystem: Client (Call Notes views)
INV-55 | Sticky form auto-saves the active draft to `localStorage['umsCallNotesActiveFormDraft']` on every input (debounced 400ms via `cnPersistActiveFormDraft_`). On Log view enter, `cnRestoreActiveFormDraft_` restores values + flag + training-question if a draft is present, with a "Draft restored" toast. Successful submit and explicit Clear Note both clear the draft via `cnClearStickyFormDraft_` — any new form-clearing path must call it too or the draft will resurrect on next load | Subsystem: Client (Call Notes views)
INV-56 | `cnToggleFlag_`, `cnToggleResolved_`, and `cnTogglePinned_` set `note._flagInFlight = true` before firing the RPC and clear it in both success and failure handlers. A second click while the first RPC is in flight is silently dropped. Prevents the double-click race where two concurrent RPCs capture the same snapshot and clobber each other's revert | Subsystem: Client (Call Notes views)
INV-57 | `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, and `saveUpdateSuggestions` are manager-gated. Save endpoints validate input (email format for depts, rate range 0–1 for taxes, array-of-strings structure for suggestions) and write an `AdminConfigChange` audit row with the manager's email. Config is persisted to Script Properties (`CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`, `CN_UPDATE_SUGGESTIONS`); `getDepartmentEmails_()` / `getStateTaxRates_()` / `getUpdateSuggestions_()` read Script Properties first, falling back to CONFIG | Subsystem: Server
INV-58 | `submitCallNote` calls `notifyManagerTrainingQuestion_()` (best-effort, try/catch) when `flagType === 'training'` and `subformData.trainingQuestion` is non-empty. The notification is a plain-text email to `getManagerEmails_()` with the rep's name, question, and date. Failure does not block the submit response (INV-14 pattern) | Subsystem: Server
INV-59 | `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a `PersonalSheetSyncFail` audit row on failure (nested try/catch so the audit write itself can't throw). The audit row records the punch type and error message. Personal-sheet failures are never surfaced to the user — the ADP Sheet (source of truth) was already written successfully | Subsystem: Server
INV-60 | `deleteCallNote` rejects deletion when the note is older than `CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS` (300s). The elapsed-time check uses `parseTimestampMs_` against the note's `TIMESTAMP` column. Notes without a parseable timestamp bypass the check (fail-open for legacy data) | Subsystem: Server
INV-61 | `removeAutomationTriggers` calls `assertManagerCaller_` — non-manager reps cannot disable automation triggers via `google.script.run` | Subsystem: Server
INV-62 | `cnFindNoteAnywhere_` searches `CN_STATE.rollingNotes`, `historyNotes`, and `pinnedNotes`. `cnReplaceNoteInState_` updates all three. Actions on pinned notes from past dates no longer silently fail, and flag/resolve changes propagate to the pinned tray | Subsystem: Client (Call Notes views)
INV-63 | `getMyCallNotesRange(startDate, endDate)` is caller-scoped via `getEmployeeInfo_()`, validates both dates with regex, rejects `startDate > endDate`, and caps the span at 90 days. Returns notes sorted newest-first. Used by the History view for multi-day queries; single-date queries still use `getMyCallNotes` | Subsystem: Server
INV-64 | CDR data reading uses `getDisplayValues()` for duration columns (TTT, ATT, AvgAbdWait, CsrAvgAbdWait) and `cdrParseHms_()` to convert H:MM:SS strings to seconds. Never use `getValue()` for these columns — the CDR Report spreadsheet has a timezone mismatch that adds a phantom offset. Same constraint as `call-data-reporting/Data.gs::parseHmsDisplay_` | Subsystem: Server
INV-65 | `getMyMetrics(date)` is caller-scoped via `getEmployeeInfo_()`, read-only. Returns the rep's own CDR metrics for the given date + a 30-day trend array + note-to-call coverage ratio. CDR data is fetched via `getCdrDailyBreakdown_()` (single-agent filter). The trend window is the 30 days ending on the given date. Returns `cdr: null` if the agent has no DQE data (not an error) | Subsystem: Server
INV-66 | `getTeamMetrics(from, to)` is manager-gated (INV-02). Accepts a date range; single date collapses to `from === to`. CDR aggregation uses `getCdrAgentMetrics_()` for the range, note counts scan each enrolled rep's call-notes Sheet across the full range. Returns a 30-day team trend in single-day mode only (`trend` field is null for multi-day ranges). `unmatchedAgents` lists CDR agent names not on the team-tools roster | Subsystem: Server
INV-67 | CDR enrichment in `managerGetShiftStats` is wrapped in a try/catch after the core call-notes aggregation loop. Failure does not break the existing response — `reps[i].cdr` is simply absent. CDR cache (`CDR_CACHE_KEY`, 5-min TTL) is shared across `getCdrAgentMetrics_()` calls but NOT across `getCdrDailyBreakdown_()` (the latter is uncached since it returns per-day granularity needed only for trend rendering) | Subsystem: Server
INV-68 | `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()` are the isolated CDR data layer. Both open the CDR Report spreadsheet via `getCdrSS_()`, read `DQE Historical Data`, filter by date range + optional roster names, skip queue-sentinel rows (`A_Q_*`, `Backup CSR`). Designed as the Option A (direct spreadsheet read) implementation — a future swap to Neon Postgres (Option C) replaces only these two functions + `getCdrSS_()` | Subsystem: Server

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

S26 | Manager per-rep Call Notes view | Subsystem: Server, Client (Call Notes)
  Steps:
    - As a manager, open Call Notes → Team Notes
    - Click the "Per-Rep View" tab
    - From the rep dropdown, pick an enrolled rep; in the date input, pick a date with known notes
    - Change the rep; change the date back
    - Inspect the cards — try clicking the flag / email / edit icons (should be absent)
  Expected: Rep dropdown lists only reps with a `CallNotesSheetId` set (from `getEnrolledCallNotesReps`). The rep's notes for the chosen date load via `managerGetCallNotes` and render as read-only cards (no flag / email / edit / delete actions — only static flag/sent pills). Switching rep or date re-fires the load with a stale-selection guard that drops late callbacks. A non-manager calling `managerGetCallNotes` directly gets "Manager access required."

S27 | Time-off conflict hint on pending card | Subsystem: Server, Client (Time Clock)
  Steps:
    - As an employee, file a Full Day request for a date that's a US holiday (e.g., 2026-07-03 Independence Day observed)
    - As another employee, file an Approved (or Pending) request for the SAME date
    - As a manager, open Manage → Pending Time Off
    - Read the conflict hint on the first rep's pending card
    - Click Approve and read the confirm dialog
  Expected: The pending card shows a small mono-font conflict line: `INDEPENDENCE DAY (US HOLIDAY) · 1 APPROVED OFF` (or `1 PENDING` depending on the other rep's status). The Approve confirm dialog echoes the same hint as `⚠ Heads up: ...`. Approving still works; the hint is informational only.

S28 | Patient cross-reference + exact-match search | Subsystem: Server, Client (Call Notes)
  Steps:
    - As an enrolled rep with multiple notes for the same `PatientAndTRX`, open Call Notes
    - Click the search-icon button on any card that has a non-empty patient/TRX
    - Inspect the Search view's "Exact: <TRX> · clear" badge
    - Click "clear" — badge disappears, results widen to substring matches
    - Type something else into the search box; verify exact mode is dropped
    - Click a field tab (Caller / Issue) while in exact mode
  Expected: The card button only renders when `patientAndTrx` is non-empty. Clicking it jumps to the Search view with `searchExact=true`, `searchExactTrx=<TRX>`, and results filtered to rows where `patientAndTrx` matches the TRX exactly (case-insensitive, trimmed). Clearing or typing or switching field tab all drop exact mode and re-fire as a substring search with the same query.

S29 | Call Notes bulk export | Subsystem: Server, Client (Call Notes)
  Steps:
    - As a manager, open Team Notes → click "Export Range"
    - Try a preset (This Week / Last Week / Last 7 / Last 30)
    - Click Generate Export
    - Inspect the new Sheet that opens
    - Check the AuditLog tab
    - Try start > end and confirm it's rejected
  Expected: Modal opens with default 7-day range. Preset buttons set start/end correctly in the manager's tz. Generate fires `exportCallNotesRange`, opens the new Sheet in a tab; the Sheet has a 15-column schema with one row per note across all enrolled reps in the range, sorted by date → rep → timestamp. AuditLog has a `CallNotesExport` row with note count + new fileId. Empty range returns a friendly error. Non-manager call returns "Manager access required."

S30 | Trigger handlers reject non-manager callers via google.script.run | Subsystem: Server
  Steps:
    - As a non-manager rep, open the deployed web app
    - In the browser DevTools console, call (one at a time):
      `google.script.run.withFailureHandler(e => console.log('OK rejected:', e.message)).sendDailyMissedPunchAlerts()`
      and the same for `runDailyExportCheck`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`
    - Repeat as a manager, expecting them to run normally (or no-op for empty queues)
  Expected: Each non-manager call throws "manager access required" via `assertManagerCaller_`. No emails are sent, no Sheets are created, no roster work is done. Manager calls proceed as the time-based triggers do.

S31 | Optimistic submit + failure revert | Subsystem: Client (Call Notes views), Server
  Steps:
    - Open Chrome DevTools → Network → throttle to "Slow 3G"
    - As an enrolled rep, fill out a note and press Ctrl/⌘+Enter
    - Observe the rolling stack DURING the in-flight request
    - Wait for the server response
    - Repeat with the spreadsheet ID temporarily wrong (force an RPC failure)
  Expected: The new card appears in the stack IMMEDIATELY with reduced opacity + a "Saving" badge in place of action buttons. Form is cleared at the same time; clipboard already holds the formatted note (paste works before the network returns). Once the server confirms, the card swaps to its confirmed state with full action buttons. On forced failure, the pending card disappears, the form values are restored from the snapshot, and a "Save failed — note restored" toast appears. AuditLog has `CallNoteCreate` only on success.

S32 | Sticky form auto-save + restore | Subsystem: Client (Call Notes views)
  Steps:
    - As an enrolled rep, partially fill the Call Notes form (e.g., Callback + Caller + Issue) but do NOT submit
    - Close the browser tab (or refresh the page)
    - Re-open the web app and navigate to Call Notes
  Expected: A "Draft restored" toast appears on Log view enter and the form is pre-populated with the prior values, the prior flag selection, and the training question (if training was selected). The completion timer continues from the original start time (so a refresh doesn't reset the clock). Pressing Clear Note clears the draft from localStorage; the next view enter starts fresh.

S33 | Phone-number auto-format on Callback field | Subsystem: Client (Call Notes views)
  Steps:
    - Open Call Notes → New Note → focus the Callback field
    - Type `5551234567` digit by digit
    - Erase and type `15551234567`
    - Erase and type `5551234567 x12345`
  Expected: As digits arrive the field shows `(5`, `(55`, `(555`, `(555) 1`, … through `(555) 123-4567`. 11-digit number starting with 1 → `+1 (555) 123-4567`. 11+ digit non-1-leading number → extension format `(555) 123-4567 x12345`. Cursor stays at end (forward typing isn't fought).

S34 | Save & Compose combo button | Subsystem: Client (Call Notes views), Server
  Steps:
    - Fill a Call Notes form completely
    - Click "Save & Compose" (the secondary submit button, not "Save & Copy")
    - Observe the rolling stack, the clipboard, and the compose modal
  Expected: Same optimistic behavior as Save & Copy (card appears immediately, clipboard set, form cleared). Once the server confirms with a real noteId, the email composer opens automatically for that note. The composer's noteId matches the server-confirmed one (not the temp `pending_*`). Closing the composer leaves the saved note in the stack as normal.

S35 | Manager Q&A reply on training-flagged notes | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As a rep, submit a note with the Training flag and a question typed in
    - As a manager, open Call Notes → Team Notes → Per-Rep View → pick the rep + the right date
    - Type a reply in the inline reply input on that card, click Send
    - As the rep, navigate to History (or Log if today) and look at the same note
    - As the manager, click the Clear (x) button on the reply
  Expected: Reply input shows the existing reply (or empty placeholder if none). After Send, the per-rep view refreshes with a green-check answer line under the question. Rep's card shows the same answer line. Weekly training digest emails render `Q:` + `A:` lines for the same note. AuditLog has a `CallNoteTrainingReply` row with the manager's email as actor. Clearing the reply removes the answer line; AuditLog has a second `CallNoteTrainingReply` row noting `reply cleared`. Attempting `setCallNoteTrainingReply` on a non-training-flagged note returns "Only training-flagged notes can carry a reply."

S36 | Personal pin — toggle, 3-cap, tray, dedupe | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As an enrolled rep with several notes, click the bookmark icon on three different cards (across the today / history mix)
    - Confirm the pinned tray appears above the rolling stack with "Pinned · 3"
    - Try to pin a 4th note
    - Open History (a different date) — is the pinned-from-today note still in the tray?
    - Unpin one; pin a different one
    - Delete a currently-pinned note from the Log view
  Expected: Each pin triggers an optimistic tray update (card moves up immediately, before server response); on failure the tray reverts. The 4th pin returns "You already have 3 pinned notes (the max). Unpin one before pinning another." Pinned-from-today does NOT also appear in the rolling stack (cnRenderStack_ dedupes by noteId). The pinned tray spans all dates so a pin from another day stays visible. Deleting a pinned note removes it from both the tray cache and the audit log shows `CallNoteDelete` (not `CallNotePin`).

S37 | End-of-shift Stats tab with median completion time | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As a manager, open Call Notes → Team Notes → Stats tab
    - Confirm the default date is today (in manager tz)
    - Inspect the per-rep cards
    - Pick a prior date that had activity
    - Submit a note as a rep (with optimistic UI tracking completion time), then re-open Stats for today
  Expected: One card per enrolled rep. Each shows total notes, flag breakdown (action/training/review), resolved count, emails sent, median note completion time, shift span. Median is in `Xm Ys` format; outliers > 30 min are excluded from the median (stored as null upstream). Reps with no `completionSeconds` data (notes filed before the timer was instrumented) show "no data yet" for median. Stats refresh on date-picker change.

S38 | Voice-to-text dictation (manual, behind flag) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - In Apps Script editor, set `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED = true` and redeploy
    - As an enrolled rep using Chrome, open Call Notes
    - Notice the mic icon next to the Issue and Resolution labels
    - Click the Issue mic → grant browser mic permission → speak a short sentence
    - Click the mic again to stop early (or pause speaking and let it auto-stop)
    - Disable the flag, redeploy, reload
  Expected: With the flag on, mic icons appear; clicking starts speech recognition (browser-handled), transcription appears at the cursor with a leading space if needed; mic icon pulses red while listening; clicking again stops. With the flag off (default), no mic icons render anywhere. Reps on non-Chrome browsers (Firefox) never see the mic because `webkitSpeechRecognition` isn't defined.

S39 | Combined Clock+Timesheet view behavior | Subsystem: Client (Time Clock views)
  Steps:
    - Open Time Clock → Clock tab (default landing)
    - Verify the clock UI shows on top and a "Your Timesheet" divider followed by the full timesheet below
    - Click Clock In / Lunch Out / etc.
    - Click Previous / Next on the timesheet section
    - Toggle Pay Period vs Month view (if biweekly)
  Expected: Punch interactions re-render only `#clk-section` (timesheet below stays intact). Timesheet navigation re-renders only `#clk-ts-section` (clock above stays intact). The timesheet block omits its own breadcrumb / h1 (the tab bar already says "Clock"). Compact-mode pop-out renders both stacked vertically without horizontal overflow.

S40 | Multi-line auto-copy format + N/A defaulting on Transferred To | Subsystem: Client (Call Notes views), Server
  Steps:
    - Submit a note with Transferred To LEFT BLANK
    - Open a text editor and paste from clipboard
    - Open the call-note email composer for the same note and send (preview will be enough — don't actually email)
  Expected: Clipboard contents are multi-line labeled:
    Callback Number: ...
    Caller Name: ...
    Relationship: ...
    Issue: ...
    Transferred To: N/A
    Resolution: ...
  Empty Transferred To renders as literal `N/A` in both the paste and the email body's Call Details table. AUTO_COPY_FORMAT is overridable in CONFIG; changing it requires a redeploy but no code change.

S41 | Metrics — My Stats self-view with sparkline | Subsystem: Server, Client (Metrics views)
  Steps:
    - As an enrolled rep, open Metrics → My Stats
    - Confirm the default date is today; KPI tiles render if CDR data exists for today
    - Change the date to a prior working day with known CDR activity
    - Inspect the 30-day trend sparkline below the notes correlation section
  Expected: KPI tiles show Rung, Answered, Missed, % Answered, Total Talk, Avg Talk for the selected date. Notes Correlation section shows Notes Filed, Calls Answered, Note Coverage with a color-coded badge (green ≥80%, yellow ≥50%, red <50%). Sparkline renders a 30-day % Answered polyline with the most recent data point highlighted. If CDR_SS_ID is not configured, shows a friendly "No call data found" message + notes count.

S42 | Metrics — Team Metrics date-range + presets | Subsystem: Server, Client (Metrics views)
  Steps:
    - As a manager, open Metrics → Team Metrics
    - Confirm default is today with From=To; KPI tiles + per-rep table render
    - Click the "Last 7 Days" preset chip
    - Confirm From/To inputs update and the table re-fetches with aggregated data
    - Click "Last 30 Days"; confirm the table includes more data
    - Set From > To manually in the inputs
  Expected: Preset chips set both date inputs and trigger a fresh load. Per-rep table shows aggregate totals for the range: Rung, Answered, Missed, % Answered, ATT, Notes, Coverage. Single-day view also shows the 30-day team trend sparkline; multi-day range hides the sparkline. From > To auto-corrects (the input that changed drags the other to match). Non-manager calling `getTeamMetrics` directly gets "Manager access required."

S43 | Metrics — CDR unavailable fallback | Subsystem: Server, Client (Metrics views)
  Steps:
    - Temporarily remove the CDR_SS_ID Script Property (or set it to an invalid ID)
    - As a rep, open Metrics → My Stats
    - As a manager, open Metrics → Team Metrics
    - Open Call Notes → Team Notes → Stats tab
  Expected: My Stats shows "No call data found for <date>." with notes count still visible. Team Metrics shows an error or empty table. Stats tab still renders all note-based stats (total notes, flags, median, shift span); CDR rows (calls answered, % answered, ATT) are absent — no error, no broken cards.

S44 | Metrics — shift stats CDR enrichment | Subsystem: Server, Client (Call Notes views)
  Steps:
    - With CDR_SS_ID configured, open Call Notes → Team Notes → Stats tab
    - Pick a date with known CDR + call-notes activity
    - Inspect a rep card that has both notes and CDR data
  Expected: Below the existing note stats (flag breakdown, emails sent, median note time), a CDR section appears with a thin separator showing Calls answered, Calls missed (warn-colored if > 0), % Answered, Avg Talk Time. A "Note coverage" row shows the notes-to-calls ratio. All CDR values sourced from DQE Historical Data for that rep + date.

### Deploy Command
Server: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy. Web app picks up the change on next page load.
Client: same single `clasp push -f` ships all HTML files alongside `Code.js`; same deploy step.
Test Suite: same `clasp push -f`. Tests don't ship to end users — run them from the editor with `runSmokeTests()` (safe on prod) or `runAllTests()` (writes TEST_ rows, cleans up at end).
