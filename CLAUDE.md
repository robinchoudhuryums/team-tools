# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Projects

- **web-app/** — Multi-module browser web app deployed at one Web App
  URL. Hosts six modules today, registered side-by-side in the
  `TOOLS` registry in `script_core.html`:
   - **Time Clock** — cross-timezone time tracking, PTO requests,
     manager dashboard, ADP-format export, and a manager-only
     **Coverage** planner (forward staffing across timezones with PTO
     overlaid + understaffed-hour flagging — `getCoveragePlan`, INV-127;
     redesigned as a days×hours heatmap + understaffed callout). The Clock
     view was redesigned into a sky-gradient clock card + tz selector with
     the day ribbon as the primary control surface (hours/state header,
     break bands, a note-volume histogram via `getMyNoteHourBuckets(date)` —
     sourced from the rep's LOGGED NOTES per rep-local hour, NOT CDR — and
     the punch buttons mounted directly beneath it, lunch color-coded), plus
     a one-row Punches · Team · Annual-PTO layout. **Sick leave was removed
     from the UI** (backend kept for legacy reverts — see Common Gotchas).
     Backs a shared Google Sheet (`CONFIG.ADP_SS_ID` in `web-app/Code.js`).
   - **Call Notes** — rolling-note panel for CSR call logging. Each
     rep writes to their own per-rep Google Sheet (`Notes` tab in the
     spreadsheet whose ID is in `EMP.CALL_NOTES_SHEET_ID`, column L
     of the Employees roster). Ctrl/⌘+Shift+C saves + auto-copies a
     CRM-friendly serialization; email composer is a separate
     two-stage flow with preview gate. Three flag types
     (action / training / review) with EOD reminders for unresolved
     action flags and weekly manager digests for training + review.
     Redesign: Search renders real read-only cards with a result count,
     search-term highlight, a date filter, and **Phone / TRX** field scopes
     (alongside All / Caller / Issue — INV-45); the manager Stats view is a
     scannable table (shared `mtRenderTable_` component); and the Admin tab is
     split into **Overview / Tags / Compliance / Config** sub-tabs with
     system-status cards.
   - **Metrics** — CDR integration module that reads DQE Historical
     Data from the CDR Report spreadsheet (the same sheet backing the
     `call-data-reporting` repo's Department Dashboard). Two tabs:
     "My Stats" (self-view for all reps — today's KPIs, note-to-call
     coverage ratio, and **own-vs-team-avg 30-day trend charts** for 5
     KPIs — % Answered / Answered / Missed / Avg Talk / Transfer % —
     where the team line is **anonymized**: hidden on any day with fewer
     than 3 reporting reps, so peers can benchmark without singling
     anyone out, INV-124) and "Team Metrics" (manager-only — per-rep
     table with date-range support and preset chips). The CDR data layer
     (`getCdrSS_()`, `getCdrAgentMetrics_()`, `getCdrDailyBreakdown_()`,
     plus `getCsrTransferPerRepDaily_()` reading the separate
     `CSR Transfer Historical Data` tab for the Transfer KPI) is isolated
     behind helpers so a future swap to Neon Postgres (Option C)
     replaces only those functions. CDR metrics also enrich the
     Call Notes Stats tab (`managerGetShiftStats`) via a best-effort
     try/catch overlay — CDR failure never breaks existing stats.
     My Stats has Today / 7D / 30D range presets (server-aggregated via
     `getMyMetricsRange(from, to)` — caller-scoped self-aggregate, no team
     line/series), rail-row sparklines, and a sortable + sticky-header team
     table with tri-tone % cells (the table renders via the shared
     `mtRenderTable_` component, see Key Design Decisions).
     Backs the CDR Report spreadsheet (`CONFIG.CDR_SS_ID`).
   - **Intake** — patient-intake forms ported from the bound
     `form-generator` Apps Script (kept in `incoming/form-generator/`
     for reference). Four tabs: **PPD** (Patient Profile &
     recommendation — a 45-question intake that drives the clinical
     HCPCS recommendation engine `intakeFilterRecommendations_`,
     reading the **PMD Offerings** catalog), **PMD Account** and **PAP
     Account** (demographics/insurance/clinical account-creation forms
     with image attachments), and **Sent** (read-only sent-submissions
     viewer — `intakeListMySubmissions` / `intakeGetSubmission`,
     caller-scoped to the sending rep, managers see all; replaces
     opening the PHI spreadsheet). Each form renders a branded email and
     persists a PHI backup row. The unbound rewrite: the bound tool
     used the active sheet's cells as the form; here each form is a web
     form whose answers POST to two-stage, bodyHash-guarded
     `intakePreview*`/`intakeSend*` endpoints (mirrors the Call Notes
     email flow), every field `esc_`'d. PHI (patient answers) persists
     to append-only `PPDSubmissions`/`PMDSubmissions`/`PAPSubmissions`
     tabs in ONE Intake spreadsheet (`INTAKE_SS_ID`, which also holds
     the read-only `Offerings` tab); the shared AuditLog row stays
     PHI-free (`IntakeSent: submissionId + recipientDomain`). The
     Offerings catalog is isolated behind `getIntakeOfferings_()` (the
     `getCdrSS_()` pattern). Redesigned onto the shared `.app-bar` shell with
     PPD "Option A" structured controls (Yes/No toggles + severity chips,
     engine-safe — see Common Gotchas), a filterable/searchable Sent tab, and
     per-form draft autosave (`umsIntakeDrafts`). **All three forms (PPD / PMD
     Account / PAP Account) share a sticky side progress rail** (ring + count +
     Preview/Clear) via `intakeRingHtml_(form)`/`intakeRingSet_(form,…)` +
     `intakeAcctUpdateProgress_`, with a **per-form ring color** (PPD blue / PMD
     orange / PAP purple) from the `--intake-ppd`/`--intake-pmd`/`--intake-pap`
     design tokens. Backs the Intake spreadsheet
     (`CONFIG.INTAKE.SS_ID` / Script Property `INTAKE_SS_ID`).
   - **Reference** — in-app knowledge base (Phase 1). A per-department
     tree + full-text search + reader for training/policy docs, so the
     team stops fighting Drive's folder UI. Two item types: **`article`**
     (markdown source stored in the KB sheet, rendered client-side by
     `kbMd_` which escapes HTML first) and **`embed`** (a Google Doc/
     Sheet/file shown via its Drive `/preview` iframe + open-in-new-tab —
     the "Drive-linked fallback"). Managers add/edit/delete inline
     (`kbSaveItem`/`kbDeleteItem`, gated + locked + audited); reps get
     read-only browse + search (`getReferenceTree`/`getReferenceItem`/
     `searchReference`). **PHI-free by policy** (training/reference only —
     scrub patient data from screenshots). Backs a dedicated KB
     spreadsheet (`CONFIG.KB.SS_ID` / Script Property `KB_SS_ID`); reps
     read via the server and never open it. Phase 2 (shipped): a
     per-item Google-Doc→article converter (`kbConvertDriveDoc`) —
     review-before-save in the editor, for migrating embeds to fast
     native articles. Also shipped since: converter images export to
     Drive at save time (Phase 2b) + paste-a-screenshot upload in the
     editor (Phase 3), a Ctrl/⌘+K slide-over **drawer** for mid-call
     lookup (mounted on `document.body`, with content-aware
     suggestions + a usage log behind the manager "Most referenced"
     block + a manager **"Review due"** queue — items older than
     `CONFIG.KB.REVIEW_DUE_DAYS` (90), usage-sorted, with a one-click
     "Mark reviewed"; editing an item also counts as reviewing it —
     `kbGetReviewDue`/`kbMarkReviewed`, INV-126), and an optional
     **AI guidance card** (Phase A —
     `kbGetFacetGuidance`, Anthropic API, whitelisted enum facets
     only, feature-flagged OFF by default; INV-119). The Reference tab was
     redesigned with collapsible departments (state in `umsKbPanel.deptCollapsed`)
     and a landing panel (recent / most-used / review-due).
   - **Training & Employee Docs** — phased module
     (`docs/training-employee-docs-spec.md`). **T1 (shipped):**
     manager-assigned training built ON the Reference/KB content layer —
     a KB article/embed is assigned to employees (or `'*'` = everyone)
     with an optional due date; reps get a **My Training** checklist
     (status chips, reader modal reusing `kbMd_`/the Drive preview,
     "Mark complete"); managers get a **Team Training** completion
     matrix + assign/revoke. Tracking lives in two auto-provisioned
     tabs in the KB spreadsheet (`TrainingAssignments` append-+-revoke,
     `TrainingCompletions` append-only); re-assigning an item RESETS
     its completion (latest `assignedAt` wins — the re-certification
     mechanism). **T2 (shipped):** interactive quizzes — manager-authored
     in a Team Training editor (`Quizzes` tab, answer keys in
     `QuestionsJson` are SERVER-ONLY), assignable like KB items
     (`itemType='quiz'`), graded server-side (`submitQuizAttempt` →
     append-only `QuizAttempts`; a pass auto-writes the completion,
     `via='quiz'`). Per §9.4: unlimited retries, correct answers are
     NEVER revealed (only per-question right/wrong), attempt counts
     surface on the checklist + matrix. **T3 (shipped):** per-employee
     signable docs (reviews, PIPs, policy acks) in a DEDICATED
     `HR_DOCS_SS_ID` spreadsheet (never co-located with KB/ADP/PHI; NO
     fallback store): **My Docs** (rep — read, acknowledge+sign on a
     canvas pad) and **Issue Docs** (manager — issue with markdown
     frozen-at-issue + contentHash, optional Doc→markdown convert via
     `kbConvertDriveDoc`, dashboard, verify, void). Manager visibility
     is PER-TEAM and FAIL-CLOSED via roster column M `ManagerEmail`
     (owner + issuer + listed manager only; blank narrows, never
     widens). Signatures are append-only + tamper-evident
     (`DocSignatures`, hash excludes the timestamp — the audit row is
     the witness); the store is EXCLUDED from every retention purge.
     See INV-120/INV-121/INV-122. **T3 v2 (shipped):** reusable
     **templates** (an `EmpDocTemplates` tab — pick "Annual Performance
     Review" to prefill body + fields), **employee-completable fields**
     (text/textarea/date in addition to the signature — validated +
     stored as responses, attested in the signature hash), a
     **draft→Release** split (a draft is invisible until the manager
     Releases it), a per-employee grouped manager dashboard, and an
     **employee-side overdue reminder** (the digest now nudges both
     sides). Back-compat via trailing columns + conditional-append
     hashing. See INV-135. **T4 (partial — shipped):** an
     **overdue digest** (`sendTrainingOverdueDigest`, daily manager-tz
     7am trigger — org-wide overdue training + team-scoped overdue
     unsigned docs, heartbeat-stamped) and a **quiz-analytics** panel
     (`getQuizAnalytics`, manager-gated aggregate — pass rate / avg
     score / attempts, no answer keys) in Team Training. The remaining
     T4 item (Drive snapshot-to-PDF signing for signable embeds) stays
     on-demand. See INV-123. The rep My Training checklist was redesigned
     with completion rings; Team Training's matrix is now a reps×items CSS-grid
     status matrix. **Coaching (shipped):** ONE merged **Coaching** tab
     (`enterCoachingView`) for everyone. Reps see **My Coaching** (their received
     severity-chipped feedback cards with one-click Acknowledge) and never see a
     mode toggle; managers get a **Mine ⇄ Team** segmented toggle
     (`coachSwitchMode_`, persisted per-browser to `umsCoachingMode`, managers
     default to Team) where **My Coaching** is the manager's OWN received items
     (routine coaching) and **Team Coaching** is the composer + team-scoped
     dashboard + a metrics panel (ack-rate, median days-to-acknowledge, severity
     breakdown, overdue, per-rep). The two prior tabs (`coaching` rep +
     `coachingManage` manager) were merged into this single non-managerOnly tab;
     the "Coach on this" deep-link now opens `coaching` and forces Team mode via
     `window.COACH_PREFILL`. Granular, non-routine manager feedback on a SPECIFIC patient/TRX
     interaction (vs. the org-wide quizzes/assignments), stored in a `Coaching`
     tab in `HR_DOCS_SS_ID` (keep-forever, team-scoped) — `createCoaching` /
     `getMyCoaching` / `acknowledgeCoaching` / `getCoachingDashboard` /
     `voidCoaching`. Tied to the Call Notes training flag via a **"Coach on
     this"** button on the manager Per-Rep card; un-acked items past
     `CONFIG.COACHING_UNACK_REMINDER_DAYS` (7) nudge the manager in the existing
     overdue digest. See INV-134.
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

**Only `web-app/` is clasp-synced / deployed.** Everything else in the repo is
local-only and never reaches the live Apps Script project: `test/` (the Node
harnesses) and `docs/` — including **`docs/design_handoff_team_tools_redesign/`**
(the redesign mockups: `*.dc.html` static mockups, `support.js`, screenshots,
`icons_snippet.md`). Those design-handoff files are **non-deployed reference
artifacts**: `support.js` is mockup-support JS for the standalone `.dc.html`
files, NOT app code — do not `include()` it from `index.html` or wire it into
the shell. A redesign lands in the real partials under `web-app/<tool>/` +
`styles*.html` + `script_*.html`; the handoff folder is the spec to implement
*against*, not code to ship.

## Common Gotchas

These accumulate as audits surface real production hazards. Treat
each entry as something that has bitten the project before — read
this section before touching the relevant area.

- **CDR duration columns MUST use `getDisplayValues()`.** The CDR
  Report spreadsheet has a timezone mismatch (spreadsheet TZ
  `America/Mexico_City` vs script TZ `America/Chicago`). Duration
  columns (TTT col I, ATT col J) get a phantom offset if read via
  `getValue()`. (`AvgAbdWait` col AG / `CsrAvgAbdWait` col AH are also
  duration columns but were removed from the `CDR` enum as unused — if
  you ever wire them in, they MUST use `getDisplayValues()` too.) `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()`
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
- **AuditLog timestamp cells coerce to Dates too — read via
  `normalizeAuditTs_()`.** `writeAuditLog_` appends a
  `yyyy-MM-dd HH:mm:ss` string (CONFIG.TIMEZONE wall time) that Sheets
  coerces to a datetime; `String(cell)` yields `"Tue Jun 10 2026 ..."`,
  which silently fails every `substring(0,10)` date filter and
  `convertAuditTs_` parse. The compliance audit panel returned ZERO rows
  in this state until the first full `runAllTests` exposed it.
  `getManagerDashboard` (recent audits), `cnReadCallNoteAuditRows_`, and
  `getAutomationHealth` all route through `normalizeAuditTs_` now —
  any new AuditLog timestamp read must too. The SAME class applies to
  every other `yyyy-MM-dd HH:mm:ss` column in the ADP spreadsheet:
  `TO.SUBMITTED_AT` (a raw `String()` read flattened the manager
  pending-trend sparkline to zero since it shipped, and it doubles as
  the row-match key for `updateTimeOffStatus` / `cancelTimeOffRequest` —
  BOTH the key-producing reads and the matchers normalize identically)
  and `PAR.SUBMITTED_AT` (sort/display). A Node tripwire fails CI on any
  raw `String(rows[i][TO|PAR.SUBMITTED_AT])` read in `Code.js`/`Tests.js`.
- **Per-rep / fixture sheet timezones must match the ADP sheet's.**
  `normalizeDate_` recovers a coerced date cell by formatting in the
  ADP sheet's tz — but the cell was coerced in the tz of the sheet it
  lives in (a per-rep call-notes Sheet, the test fixture, etc.). The
  round-trip holds only when the two tzs match; a drifted sheet tz
  shifts EVERY date-filtered read (coverage, history, digests,
  reconcile) by a day, silently returning nothing.
  `provisionCallNotesSheet` and `setupTestEnvironment` now pin new /
  fixture Sheets to the ADP tz. A manually created per-rep Sheet must
  be checked (File → Settings → Time zone) before pasting its ID into
  column L.
- **Timesheet rows are in APPEND order, not time order.** A same-day
  back-fill (approved adjustment request, manager Day Edit add,
  employee immediate-adjust) appends its row AFTER later punches, so
  raw sheet order scrambles any "last punch wins" / state-machine
  consumer — live status read "On Lunch" after a rep had clocked out
  until this was fixed. `getTodayPunches_` and `getManagerDashboard`'s
  per-emp collector now sort chronologically at the source (normalized
  `HH:mm:ss` strings, lexicographic = chronological); `getTeammateStatus`
  max-time-selects. Any NEW consumer of same-day punch rows must sort
  by time (or reuse `getTodayPunches_`) — never derive order from raw
  row position. Pinned by `test_getTodayPunches_sortsOutOfOrderBackfill`.
- **`CN.DATE_LOCAL` is a Sheets-coerced Date on read.** The
  `DateLocal` column is written as a `yyyy-MM-dd` string but Sheets
  coerces it to a Date object on read, so `String(row[CN.DATE_LOCAL])`
  produces a JS Date `toString` that never matches a `yyyy-MM-dd`
  comparison. Always read it via `normalizeDate_`. The Metrics module
  (`getMyMetrics` / `getTeamMetrics`) regressed on this — note
  coverage silently reported 0 — fixed in cc58d53. Every located-row
  `CN.DATE_LOCAL` read routes through `normalizeDate_`; keep new ones
  consistent.
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
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v6`).
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
  ring, decision email balance line, etc.). **The per-row gate also
  guards the DEDUCTION, not just display** — `adjustLeaveBalance_`
  returns `null` (no change) for a `FALSE` employee even when the
  global `enablePtoTracking` flag is on, so approving / manager-filing
  a request for a contractor can't drive their balance negative. (Until
  the M-1 fix the deduction gated only on the global flag, silently
  contradicting S15; the read-side `getEmployeeInfo_`/`lookupEmployeeById_`
  parse the same coercion-safe `FALSE`/`no`/`n`/`0` values.)
- **Sick leave is UI-removed but backend-dormant (deferred #2 / C1).**
  `'Sick Leave'` was dropped from `TIME_OFF_TYPES` (and the `day-type`
  `<select>` options), so no NEW sick request can be created — via the UI
  picker OR a direct `submitTimeOffRequest`/`managerSubmitTimeOff` RPC
  (`isValidTimeOffType_` rejects it, INV-95). But the SICK BACKEND IS KEPT
  ON PURPOSE: `getLeaveDeduction_`'s `sick` mapping (+ its mirror
  `LEAVE_DEDUCTION_CLIENT`), `adjustLeaveBalance_`'s sick column (J), the
  PTO-reconciliation sick handling, and roster column J all stay so
  historical Approved-sick rows still revert/reconcile to the SICK bucket.
  Removing them would silently restore legacy sick reverts into the ANNUAL
  bucket (a balance-corruption regression). Treat the sick path as
  read/revert-only legacy — don't re-add `Sick Leave` to `TIME_OFF_TYPES`
  without re-deriving this.
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
  `managerDeleteCallNote`,
  `getTeamMetrics`, `getMetricsAmbient`, `getCoveragePlan`,
  `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`,
  `saveUpdateSuggestions`, `removeAutomationTriggers`,
  `getCallNotesTagTaxonomy`, `getCallNotesTagTrends`, `renameCallNoteTag`,
  `mergeCallNoteTags`, `archiveCallNoteTag`,
  `saveEmailTemplates`, `getCallNotesAuditLog`,
  `getCallNoteAuditHistory`, `getPtoReconciliation`,
  `fixPtoReconciliation`, `getFeatureFlags`, `saveFeatureFlags`,
  `managerGetPendingAdjustments`, `updatePunchAdjustStatus`,
  `managerSaveDayRange`, `setCallNoteManagerComment`, `reconcileCallNotes`,
  `getCallNotesEnrollment`, `provisionCallNotesSheet`, `getAutomationHealth`,
  `getStorageHealth`, `getDeployReadiness`, `getAdminSheetView`,
  `getRetentionConfig`, `saveRetentionConfig`,
  `kbConvertDriveDoc`, `kbGetUsageStats`, `kbGetReviewDue`,
  `kbMarkReviewed`, `saveKbAiSettings`,
  `getTrainingDashboard`, `saveTrainingAssignment`,
  `revokeTrainingAssignment`, `getQuizzes`, `saveQuiz`, `deleteQuiz`,
  `getQuizAnalytics`, `importQuizFromForm`,
  `getPunctualityReport`, `getSpanishInboxStats`, `getSpanishInboxPending`,
  `getSpanishInboxResolved`, `getSpanishInboxThreadBody`,
  `issueDoc`, `getDocsDashboard`, `voidDoc`, `verifyDocSignature`,
  `releaseDoc`
  (these five are ALSO team-scoped per INV-122 — the gate alone is
  not the boundary),
  `getEmpDocTemplates`, `saveEmpDocTemplate`, `deleteEmpDocTemplate`
  (org-wide PHI-free form shells — gated but NOT team-scoped, INV-135),
  `createCoaching`, `getCoachingDashboard`, `voidCoaching`
  (also team-scoped via `coachCanManagerSee_` per INV-134 — the EmpDocs
  fail-closed model; the gate alone is not the boundary).
  Returning a dashboard or accepting writes without this check is a
  privilege escalation. **EXCEPTION — the admin tier (INV-136):** the 29
  Manage-module Admin-tab config/system endpoints + the Reference content-
  authoring set (`kbSaveItem`/`kbDeleteItem`/`kbUploadImage`/`kbConvertDriveDoc`)
  gate on `emp.isAdmin` (not `isManager`) and return `'Admin access required.'`.
  `isAdmin` == `isManager` until Script Property `ADMIN_EMAILS` is set, so the
  endpoints in the lists above that moved to the admin tier still reject
  non-managers; see INV-136 for the full admin-gated list.
- **Trigger-handler endpoints are reachable via `google.script.run`.**
  The time-based trigger handlers — `sendDailyMissedPunchAlerts`,
  `runDailyExportCheck`, `sendCallNotesEodDigest`,
  `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`,
  `sendTrainingOverdueDigest` (the T4 overdue-training/-docs nudge),
  `archiveOldCallNotes` (the non-destructive cold-archive tier) and
  `purgeExpiredFormData` (the
  destructive PHI-retention purge) — are top-level (required: Apps Script
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
- **Time-off submit has a duplicate-date guard + leave-type
  whitelist.** `submitTimeOffRequest` and `managerSubmitTimeOff`
  reject a request when the employee already has a Pending or
  Approved row for that date (`hasActiveTimeOffOnDate_`) — without it
  two sibling rows for one day each pass the per-row transition guard
  above and double-deduct on dual approval (INV-03 is per-row only).
  Both also validate `type` against `TIME_OFF_TYPES`
  (`isValidTimeOffType_`, case/space-insensitive) before writing, so a
  garbage/typo'd type can't silently fall through `getLeaveDeduction_`'s
  annual/1.0 default. Denied/cancelled rows never deducted, so they
  don't block a re-request (INV-94 / INV-95).
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
- **CallNoteEmail audit row is deliberately PHI-free.**
  `emailFromCallNote` writes its audit row as
  `noteId=<uuid>; depts=<label>; recipients=<count>` — NOT the email
  subject (which embeds the patient name / TRX) or the raw recipient
  addresses. The shared AuditLog tab must not carry PHI; the `noteId`
  lets an investigator open the rep's own Sheet for full detail
  (INV-32 still holds — the row keeps `noteId`). Don't "helpfully"
  re-add the subject / recipients to this audit row.
- **ExternalEmailSent audit row logs only the recipient domain.**
  `sendExternalEmail` writes `recipientDomain=<domain>; type=...;
  pdfForms=...; interactiveForms=...; noteId=...` — NOT the raw
  recipient address (a customer's personal email is PII; for a patient
  it can be PHI-adjacent). The full recipient lives on the linked note's
  `subformData.externalEmails[]`, surfaced to the sending rep on their own
  card AND to a manager in the Team Notes Per-Rep view via the shared
  `cnExtEmailPillHtml_` pill (the manager-only recipient lookup — F20).
  Logging only the domain in the shared AuditLog is therefore intentional
  PII/PHI minimization, not a forensic gap.
  Same discipline as the PHI-free `CallNoteEmail` row above. The
  `FormTokenCreated` / `FormSubmissionReceived` audit rows follow the
  same rule (`toDomain=` / `fromDomain=` — the full recipient lives on
  the FormTokens row, reachable via the token), and the submission row's
  synthetic actor identity is likewise de-identified ("External
  recipient" + domain, never the recipient's name or raw address).
- **`buildCallNoteEmailHtml_` must `esc_` every user-supplied field.**
  The email-preview modal injects the server-rendered body raw via
  `innerHTML` (`cn/script_callnotes.html` `cnRenderComposerPreviewStep_`,
  the `${p.htmlBody}` slot). That's safe ONLY because every note field
  is HTML-escaped in the builder. Adding a new field to the email
  builder without `esc_` is stored XSS in the preview (and the sent
  email). Pinned by `test_cn_buildEmailHtml_escapesUserFields`.
- **Metrics client must `esc()` every server string before `innerHTML`.**
  `metrics/script_metrics.html` renders `repName`, CDR agent names
  (`unmatchedAgents` / `rosterWithNoCdr`), and `data.error` /
  `err.message` into the DOM via `innerHTML`. Each MUST route through
  `esc()` (defined in `script_core.html`) — same discipline as
  `buildCallNoteEmailHtml_`'s `esc_`. CDR agent names originate from the
  shared CDR Report's `Agent Alias Overrides` sheet (written by the
  `call-data-reporting` repo), so they cross a repo trust boundary — an
  unescaped name like `<img src=x onerror=…>` is stored XSS in the
  manager's session. These were unescaped until the F5 fix; keep any new
  Metrics field consistent. The Metrics client also derives "today" from the
  employee roster timezone via `empTz()` / `isoDateTz()` (`script_core.html`)
  — never `new Date()` browser-local time — so offshore reps (IST/PHT) and
  near-midnight users see the correct day's CDR data, matching how Clock /
  Time Off / Manager / Export derive dates (F6).
- **Intake Offerings catalog is read `A2:F` in a FIXED column order.**
  `getIntakeOfferings_()` returns the raw 2D array `[features, HCPCS,
  weightCapacity, seatType, pdfLink, imageUrl]` and `intakeFilterRecommendations_`
  indexes those positions directly (e.g. `row[1]` = HCPCS for substitution
  lookups, `row[4]/row[5]` = pdf/image of the substitution target). Reordering
  or inserting an Offerings column silently corrupts recommendations — keep the
  A–F contract, or update the engine + the fixture catalog in the tests
  together. The catalog is cached in-memory per execution (`_intakeOfferingsCache`).
- **Intake PPD "Option A" controls are engine-safe — some questions MUST
  stay free-text.** The redesign renders most PPD questions as structured
  controls via `INTAKE_PPD_TYPE` (`script_intake.html`): `'yn'` = Yes/No
  color-coded toggle, `'sev'` = None/Mild/Mod/Severe severity chips, `'num'`
  = number; anything not in the map (default `'text'`) renders free-text.
  The classification is LOAD-BEARING for the recommendation engine (INV-112):
  `intakeFilterRecommendations_` substring-matches the CONTENT of Q25
  (numbness 'feet'/'legs'), Q34 (amputation 'knee'/side), Q31a/Q33a
  (location), Q43 (real diagnosis vs the no/none/n-a exclude list), and Q13
  (falls — `isPositive` looks for 'yes'), so those MUST remain free-text —
  collapsing them to a Yes/No toggle would feed the engine a bare
  `Yes`/`No` and silently break the upgrade logic. Only purely-binary or
  `isPositive('yes')` questions become toggles. Keep `INTAKE_PPD_TYPE` and
  the engine in sync — same parallel-source discipline as the layouts below.
- **Intake email builders must `esc_` every patient field; the justification
  is the ONE raw exception.** `intakeBuildPpdBodyHtml_` / `intakeBuildAcctBodyHtml_`
  inject the body into the preview modal via `innerHTML` and into the sent
  email, so every answer/label is `esc_`'d (INV-89; pinned by
  `test_intake_buildPpdBody_escapesAnswers`). The recommendation
  `justification` is server-generated (a fixed vocabulary + `Left`/`Right`
  hemiplegia side) and intentionally carries inline markup (`<strong>`,
  underline span), so it is injected raw — never put a user-supplied value into
  a justification string. HCPCS / pdfLink / imageUrl (from the Robin-owned
  Offerings sheet) are still `esc_`'d in attributes defensively.
- **Intake PMD/PAP layout is duplicated client↔server — keep them equal.**
  The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` (email rendering,
  authoritative) and the client `INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`
  (input rendering) carry the same HEADER/CHECKBOX/SECONDARY row sets (the
  client headers are 0-based; the server's are 1-based — they differ by +1).
  A Node tripwire (`intake — client render layout mirrors the server`) fails CI
  if they drift. Adding/removing a PMD/PAP question means updating BOTH the
  question banks (client `INTAKE_*_Q`) AND both layouts. Same discipline as
  `LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_`.
- **Intake account Yes/No toggles read/write through `.intk-yn` groups
  (deferred #10).** PMD/PAP account answers are gathered by
  `intakeAcctGetVal_` and re-applied by `intakeApplyAcctAnswers_`, both of
  which handle ANY `.intk-yn` group: a checkbox-style toggle stores
  `TRUE`/`FALSE`, while a select-style toggle marked `data-ynsel` (the
  `['', 'Yes', 'No']` shape, e.g. PAP's CPAP-history conditional) stores
  `Yes`/`No`. The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` select
  keys are UNCHANGED — only the client input control changed shape, so the
  layout-mirror tripwire still passes. New account Yes/No fields should
  reuse the `.intk-yn` (+ `data-ynsel` where a Yes/No string is needed)
  pattern rather than a raw checkbox/select.
- **Call Notes Sheet enrollment — one-click auto-provision (or manual).**
  A rep has no Call Notes panel until column L (`CallNotesSheetId`) of the
  Employees roster has their per-rep spreadsheet ID. `getCallNotesSheet_(emp)`
  throws "Your call-notes Sheet is not configured" if missing; the
  client renders the enrollment-missing splash. A manager can now
  one-click enroll a rep from **Call Notes → Admin → Call Notes
  Enrollment**: `provisionCallNotesSheet(repEmpId)` (manager-gated,
  locked, INV-110) creates a fresh Spreadsheet owned by the deploying
  account, provisions the `Notes` tab with `CN_HEADERS`, writes the new
  ID into column L, invalidates the roster cache, and audits
  `CallNotesProvision`. It is **idempotent** — a rep who already has a
  sheetId is returned unchanged; it NEVER clobbers an existing Sheet
  (that would orphan their note history). The manual path (Robin copies
  the template Sheet and pastes the ID) still works for anyone who
  prefers it; auto-provision just removes the per-rep busywork.
- **`Notes` tab provisions on first touch.** `getCallNotesSheet_`
  creates the tab + header row if it doesn't exist, so a freshly
  enrolled rep's first `submitCallNote` "just works." The header row
  comes from `CN_HEADERS` — any change there must be paired with a
  schema migration plan because existing reps' tabs won't auto-rewrite.
- **`CN_EMAIL_PALETTE` is hand-resolved from design tokens.** Email
  clients strip `<style>` blocks and don't honor CSS variables, so the
  call-note email bodies inline literal hex from a CN_EMAIL_PALETTE
  constant in `Code.js`. If `styles_design_tokens.html` palette values
  change in a meaningful way (e.g., the Console → next palette swap),
  re-resolve the hex equivalents in CN_EMAIL_PALETTE or the email
  aesthetic drifts from the in-app aesthetic. Plus three UMS-brand
  entries (`brand` =
  navy `#223b5d`, `brandSoft` = pale blue `#e6f2ff`, `logoUrl` = the
  UMS Presentation Logo) — these are NOT design-token-derived; they're
  the legacy `closeOrderEmail.js` / `updateOrderEmail.js` identity
  carried forward into the new web-app emails (Call Details table
  header, alternating row tint, top-of-email logo bar). Subform
  detail borders (shipping, resupply, OOP) also use resolved hex —
  `#b1d1c4` for good-transparent and `#e7bda3` for warn-transparent.
  The 2nd-pass email restyle EXTENDED this palette with semantic email
  tokens (`accentBorder`/`dangerBorder`/`warnBorder`, `info` link, `star`,
  `muted2`/`muted3`, `navyTint`) and **routed the Intake/PPD builders onto
  it** (`intakePpdAnswerStyles_`, `intakeBuildPpdBodyHtml_`,
  `intakeBuildAcctBodyHtml_`, the PAP `CONDITIONAL_FORMATTING_ROWS` constants)
  — they previously hardcoded Material/Google hexes. Keep ALL email color on
  this palette; new email color belongs here, not inline. **Email-safe rule
  (re-affirmed by the PPD fix): NO `display:flex` / `gap` / `filter`** —
  Outlook drops them; `intakeRecListHtml_` was rebuilt from a flex `<li>` +
  `filter:grayscale` into 2-cell table rows with explicit grey for rejected.
- **Clipboard API often fails in HtmlService iframes.** The auto-copy
  feature tries `navigator.clipboard.writeText` first and falls back
  to a `<textarea>` + `document.execCommand('copy')` shim
  (`cnFallbackCopy_`). Both fire from the Ctrl/⌘+Enter user gesture so
  permissions are usually granted, but never assume one path alone
  works.
- **`showToast(msg, type)` normalizes the variant — pass either form.**
  Most callers pass the full class (`'toast-success'` / `'toast-error'` /
  `'toast-warn'` / `'toast-info'`), but the Training / EmpDocs partials pass
  bare names (`'success'` / `'error'` / `'warn'` / `'info'`). `showToast`
  (`script_core.html`) now normalizes via
  `cls = /^toast-/.test(cls) ? cls : (cls ? 'toast-' + cls : '')` so both
  render the colored rail + correct glyph. Before the 2nd-pass fix, bare
  names rendered with NO accent rail and fell through to the info glyph
  (18 Training/EmpDocs callsites). `.toast-info` was added at the same time
  (only success/error/warn existed). Either calling form is fine now —
  don't "fix" callers to one style.
- **Call-notes flag enum vs. blank.** `FlagType` is `''` / `'action'`
  / `'training'` / `'review'`. `sanitizeFlagType_()` lowercases + range-
  checks; bad values fall back to `''` rather than throwing, so
  experimental UI tweaks can't write garbage into the column.
  `Resolved` is only meaningful when `FlagType=action`; the resolve
  endpoint rejects calls on other flag types. Switching flag types
  (e.g. action → training) clears `Resolved` as a side-effect, so
  stale `resolved=TRUE` from a prior action cycle doesn't resurface
  if the rep flips back to action.
- **EOD digest runs hourly and matches each rep's local EOD hour.**
  `sendCallNotesEodDigest` is triggered `everyHours(1)`; on each run it
  walks the roster and emails a rep only when their local hour equals
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (hour-equality, not a ±minute
  window). This reliably reaches reps in every timezone — the prior
  once-at-manager-5pm window silently skipped offshore reps (IST/PHT)
  whose local 5pm never coincided with the manager's. Most hourly runs
  send nothing (no reps at their EOD hour with unresolved flags), so the
  cost is just a cached roster walk. `EOD_WARNING_WINDOW_MINUTES` is
  retained in CONFIG but is no longer used by the gate. A rare
  trigger-jitter could double-match a rep within the same local hour — a
  benign duplicate reminder, not a miss.
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
  `safeTimezone_(tz)` shape-checks the id first (IANA `Area/Location`
  or a `UTC`/`GMT±h[:mm]` token) and only then probes
  `Utilities.formatDate(new Date(), tz, 'z')`, falling back to
  `CONFIG.TIMEZONE` with a `Logger.log` warning. The shape gate is
  load-bearing: the V8 runtime's `formatDate` no longer throws on an
  unknown tz id (it silently resolves it to GMT), so the try/catch
  probe alone stopped catching roster typos. Residual gap: a
  well-shaped-but-unknown id like `Not/ATimezone` still passes (it
  formats as GMT). Used by `sendCallNotesEodDigest` and
  `sendDailyMissedPunchAlerts`. New code reading timezone values from
  the roster for trigger/automation contexts should route through this
  helper rather than raw `|| CONFIG.TIMEZONE` fallback.
- **Personal-sheet sync failures log to the audit trail.**
  `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a
  `PersonalSheetSyncFail` audit row on failure — it means a rep's
  personal Sheet is inaccessible and drifting from the ADP source of
  truth. These are surfaced (count + recent entries, 30-day window) in
  **Call Notes → Admin → Automation Health** (`getAutomationHealth`),
  so a manager sees the drift without reading the raw AuditLog.
- **Tag admin operations hold the global ScriptLock across all
  enrolled rep Sheets.** `renameCallNoteTag` / `mergeCallNoteTags`
  iterate the roster via `applyTagTransformAcrossReps_`, open each
  rep's Sheet, parse + rewrite `subformData.tags[]` — all inside one
  project-level `ScriptLock` held for the full iteration. Concurrent
  submits / flag toggles / pins across other reps wait until the
  tag mutation completes. Acceptable today (admin ops are rare and
  the working set is small), but if you add reps in volume re-
  evaluate. Per-rep Sheet failures are swallowed via try/catch so one
  broken Sheet doesn't fail the whole rename, but the audit row's
  `repsTouched` / `notesUpdated` counts reflect only successfully
  rewritten reps. `archiveCallNoteTag` is cheap — only the Script
  Property changes — but it still acquires the same lock so it can't
  race with a rename/merge that depends on the current archive set.
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
  `cnInstallCardDelegation_` also installs a delegated `keydown` on the
  same container: Cmd/Ctrl+Enter inside any `[id^="cnE-"]` inline-edit
  field saves that note (`cnSaveEdit_`). It's delegated (not a
  per-element listener) so it survives a mid-edit re-render — an
  optimistic flag toggle or ambient refresh recreates the edit field,
  which would otherwise drop a per-element listener; `cnBeginEdit_` only
  focuses the field.
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
- **The Log rolling stack live-refreshes (#3).** The Log view is a
  today-only, fetch-on-enter view (`getMyCallNotes` returns one day);
  `cnRefreshRollingStack_` re-fetches today's notes + re-renders so a note
  logged in ANOTHER context (the pop-out / a second window — they share the
  server Sheet but NOT in-memory `CN_STATE`) surfaces without a manual nav.
  Triggered from the 60s ambient poll (Log only) + window `focus`/
  `visibilitychange` (`cnEnsureLiveRefreshBound_`, 2s throttle, idempotent
  bind). It preserves optimistic `_pending` notes (filters them back on top of
  the server set) and is SKIPPED while an inline edit is open
  (`CN_STATE.editingNoteId`) so it can't wipe an editor. It re-renders only
  `#cn-stack` + the filter bar, not the form/modals. (NOTE: nav-back already
  re-fetched; this closes the cross-window staleness gap. The whole-stack
  re-render could diff-before-render to avoid a scroll jump — accepted as-is
  since the stack is small.)
- **Sidebar badge selectors use `data-tool`, not `data-view`.**
  The sidebar renders `data-tool="callNotes"` / `data-tool="metrics"`
  on its buttons. Badge pollers that query the sidebar must use
  `.sb-link[data-tool="..."]`, not `data-view`. A prior mismatch
  caused the CN stale-flag badge to silently never render. The
  Metrics alert badge follows the same `data-tool` pattern.
- **Modals close on Escape THROUGH their close hook — dynamic overlays
  must be created via `ensureOverlay`.** The shared keydown handler in
  `script_core.html` closes the **topmost** `.overlay.open` (last in
  DOM order, matching the focus trap) via `closeOverlay(el)`, which
  runs the close function registered in `OVERLAY_CLOSE_HOOKS` and only
  falls back to a plain `open`-class strip for static modals with no
  module state (Adjust, Day Detail, Day Edit, Export, Manager
  Time-Off, Call Notes Export). Dynamically-created overlays (CN
  dept/external composers, CN form-sub viewer, Intake preview, KB
  editor) are created via `ensureOverlay(id, { onClose })`, which
  ALWAYS re-asserts `overlay open` on reuse and registers the module's
  close function. This closed a real bug class: Esc used to strip only
  the class, leaving the node hidden-but-stateful — the CN composers
  then rendered into the hidden node forever (email flow dead until
  reload) and the Intake modal's document-level paste listener leaked
  app-wide, silently swallowing image pastes. Any NEW dynamic overlay
  must use `ensureOverlay` (never hand-roll `createElement` +
  `className = 'overlay open'`), and its `onClose` must be idempotent
  (safe to call when already closed). The `focusin` handler still
  returns focus to the topmost open overlay's first focusable element
  (the KB drawer is exempt).
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
  partials. `submitFormByToken` also bounds the recipient-supplied
  payload before writing — field-count (≤200) and per-cell char caps
  (~45k, under the 50k Sheets cell limit) on the data JSON and the
  signature — returning a specific, actionable error and leaving the
  token `pending` for retry instead of throwing mid-append on an
  oversized signature (INV-96).
- **Form submissions are PHI and segregated, hashed, and consent-stamped.**
  (Forms-hardening pass.) `getFormsSS_()` resolves `FormTokens`/`FormSubmissions`
  to Script Property `FORMS_SS_ID` (point it at `INTAKE_SS_ID` to move PHI off
  the ADP/payroll sheet) and falls back to the ADP SS only for back-compat — a
  fresh deploy that wants segregation MUST set `FORMS_SS_ID` and migrate the two
  tabs. `submitFormByToken` pulls `signature` AND `_meta` out before storing
  responses, **server-enforces consent** (the payload must carry
  `_meta.consentAgreed === true` — an absent `_meta` is now rejected too,
  closing the prior back-compat hole where a hand-crafted payload could omit
  it), stamps the **server-authoritative** `CONFIG.FORM_CONSENT_VERSION`
  (never trusts a client-sent version), and writes a **tamper-evident
  `SubmissionHash`** + a `Certificate` JSON into trailing `FS` columns. The hash
  (`computeFormSubmissionHash_`) covers responses+signature+token+consentVersion
  — **NOT `submittedAt`** (Sheets coerces an ISO datetime to a Date on read,
  which would break recompute); the timestamp's independent witness is the
  append-only `FormSubmissionReceived` audit row (which now carries `hash=` +
  `submittedAt=`). `verifyFormSubmissionIntegrity_(token)` (manager-gated,
  read-only) recomputes and compares — a mismatch means the stored row was
  altered. `FS_HEADERS` grew by trailing columns (back-compat like `CN_HEADERS`:
  old 6-col rows read back with the new fields undefined; `verify`/the viewer
  treat a missing hash as "legacy, can't verify", not a failure). **The invite
  email stays PHI-minimal** — prefill lives in the token, never the email body
  (pinned by the `forms — invite email builders` Node guard); the rep's freeform
  `subject`/`message` must not carry clinical PHI. **Suitability:** this pipeline
  is appropriate for patient-self-submission (EAA, self-serve PPD, demographics);
  it is NOT a signature-of-record for provider-signed clinical documents
  (PT/OT Rx, seating evals) submitted to payers — those need a certified e-sign
  vendor or a DMEPOS platform (CMS signature-validity + the supplier-can't-author
  rule + corroborating-record requirements are out of this tool's reach).
- **`LEAVE_DEDUCTION_CLIENT` mirrors the server's `getLeaveDeduction_`
  exactly.** Powers the live balance-after preview in the PTO day
  modal (`tc/script_timeoff.html`). Adding a new leave type means
  updating BOTH maps — plus `TIME_OFF_TYPES`, the server-side submit
  whitelist (INV-95), and the `day-type` `<select>` options in
  `modals.html` (a Node-harness tripwire pins that the options stay a
  subset of `TIME_OFF_TYPES`); the server still does the actual balance
  deduction on submit, so a drift causes the UI to mis-preview
  without corrupting state, but the rep sees a wrong projected
  number on hover/select. Same maintenance discipline as the
  `CN_EMAIL_PALETTE` constant.
- **Clock view coverage strip uses a per-day client cache.** The
  Clock view fires `getMyMetrics(today)` once per Clock-view enter
  and caches the response in `CLK_COVERAGE_CACHE` per date key.
  Mutations elsewhere (a newly filed call note, fresh CDR data)
  won't refresh the donut/trend until the rep navigates away and
  back, or the day rolls over. Acceptable for the use case; if
  real-time-ish freshness is ever required, invalidate the cache
  from `submitCallNote`'s success handler.
- **`getMyMetrics` is ALSO server-result-cached (L-1).** Independent
  of the client cache above, the endpoint caches its assembled result
  in `CacheService` for `CONFIG.CDR_CACHE_TTL` (5 min) keyed by
  `metrics_my_v1:<emp.id>:<date>`. It's the only rep-facing CDR read
  and per INV-124 it scans the WHOLE roster's per-rep matrix +
  the Transfer sheet UNCACHED on every open — the result cache keeps a
  Metrics-tab re-enter / date toggle from re-scanning. The cache is at
  the ENDPOINT layer, so INV-67 ("`getCdrDailyBreakdown_` is uncached")
  stays literally true — the helper just isn't re-called on a hit. Keyed
  by `emp.id` so no rep reads another rep's cached self-view; error
  results are never cached; same ≤5-min staleness tradeoff as
  `getMetricsAmbient` and the Clock strip. The cache is BYPASSED (read +
  write) whenever a test CDR override (`_TEST_OVERRIDE_CDR_SS_ID`) is active —
  the same special-casing `getCdrSS_`/`getIntakeSS_`/`getKbSS_` apply — so a
  fixture test's cached success can't mask a later test's CDR state (it was
  masking the `metrics_getMyMetrics_cdrUnavailableErrors` error-path test,
  since `_resetCdrCaches_` only clears the in-memory CDR caches, not this
  CacheService entry). Production is unaffected (the override is undefined).
- **Metrics enters call `stopClock` to avoid an interval leak.**
  `enterMetricsMyStatsView` and `enterMetricsTeamView` call
  `stopClock()` at the top (guarded by `typeof`) so the Clock view's
  1Hz live-time + 60s ribbon-now-cursor intervals don't keep firing
  in the background after navigating from Clock to Metrics — matching
  the Time Off / Manager / Call Notes enters. (Before this they didn't,
  a bounded leak: both tick functions early-return when their target
  elements aren't in the DOM, so it was wasted timer fires, no
  functional bug.)
- **Apps Script's HtmlService iframe sandboxes `window.location.search`.**
  The user-facing deploy URL's query string (`?compact=1`, `?tool=X`,
  `?prefill=...`) is invisible to client JS via `window.location.search`
  inside the iframe (`script.googleusercontent.com`). Read URL params
  from `window.SERVER_QUERY_PARAMS` instead — `doGet` evaluates
  `index.html` as a template with `serverQueryParams = e.parameter`,
  and the `<head>` script injects it into the window global. The XSS
  escape replaces `<` with `<` to prevent attacker-controlled query
  values containing `</script>` from breaking out. `__URL_PARAMS` in
  `script_core.html` consumes it with a `window.location.search`
  fallback for local dev. Pre-Round-2 deep-link contracts (compact
  pop-out, `?tool` deep-link) silently no-op'd in production because
  of this; the fix unblocked them all simultaneously. The SAME sandbox
  also poisons `window.location.origin + pathname`: it's the
  session-bound `googleusercontent.com` iframe URL, which renders a
  BLANK page when opened as a top-level window — the pop-out button
  shipped broken on exactly this until operator testing caught it.
  `doGet` now also injects `window.SERVER_WEB_APP_URL` (the normalized
  `/exec` base via `getWebAppExecUrl_`, shared with `buildFormUrl_`) and
  `popOutCurrentView` opens THAT. Any future client code that needs the
  app's own URL must use `SERVER_WEB_APP_URL`, never `window.location`.
  Pinned by a Node tripwire.
- **`form_public.html` must inject `FORM_TOKEN` via the unescaped
  `<?!=` scriptlet.** The standalone public form page receives its
  token through `serveExternalForm_`'s `tpl.formToken`. It must print
  via `<?!= JSON.stringify(formToken||'').replace(/</g,'<') ?>` —
  the escaping `<?=` variant HTML-encodes `JSON.stringify`'s
  double-quotes into `&quot;`, yielding invalid JS
  (`var FORM_TOKEN = &quot;…&quot;;`) and a mangled/empty token, so
  `getFormByToken` finds no row and the page shows "Form not found."
  Same `<`→`<` XSS guard and rationale as the
  `SERVER_QUERY_PARAMS` injection (INV-78). Pinned by
  `test_tpl_formToken_usesUnescapedScriptlet` +
  `test_tpl_noEscapedJsonInjection` (the latter forbids any escaping
  `<?=` JSON injection across HTML templates).
  ALSO: never write the literal scriptlet delimiters (`<?` / `?>`) or a
  literal closing `</script>` tag inside a JS *comment* in any
  HtmlService template (`form_public.html`, `index.html`). The template
  engine scans the raw file for scriptlet delimiters regardless of JS
  comments, so a comment containing one opens a spurious scriptlet whose
  body begins with stray text → a server-side "Unexpected token" error
  at `tpl.evaluate()` (Code.js `serveExternalForm_`). This regressed the
  fillable-form link until fixed — the page failed to load with
  `SyntaxError: Unexpected token ')'`. Now also pinned by
  `test_tpl_formPublic_evaluatesWithoutError`, which `.evaluate()`s the
  template (not just string-matches the raw file) so this class of bug
  is caught.
- **`form_public.html`'s signature canvas must be resized when its
  section becomes visible.** The signature `<canvas>` lives in
  `#sig-section`, which is `display:none` until the HIPAA-consent checkbox
  is checked. `initSignaturePad`'s `resizeCanvas()` reads
  `parentElement.getBoundingClientRect()` — while hidden that's a 0-width
  box, so the canvas gets a 0-width drawing bitmap and the first strokes
  land nowhere. Symptom: "I couldn't draw until I hit Clear" (Clear was the
  only other path that re-ran the resize). Fix: the consent `change`
  handler calls `SIG_PAD.resize()` when it reveals the section (guarded on
  `SIG_PAD.isEmpty()` so an uncheck→recheck can't wipe a drawn signature,
  since setting `canvas.width` clears the bitmap). A `.sig-placeholder`
  overlay ("Tap or click and drag here to sign") hides on first stroke /
  shows on Clear. Any new code path that toggles the section's visibility
  must re-resize the canvas the same way.
- **Call Notes form fields are contenteditable `.ce` divs, not
  input/textarea.** Read via `cnGetFieldValue_(id)` and write via
  `cnSetFieldValue_(id, value)` — both dispatch on `el.isContentEditable`
  so the helpers work transparently for the `.ce` divs AND legacy
  input/textarea (`cn-tag-input`, `cn-fld-training-q`, email modal
  fields). The setter also toggles the `.empty` class (for the
  `data-placeholder` pseudo-element) and dispatches an `input` event
  so persistence + completion-timer + phone-formatter listeners react
  the same way as user typing. Paste is sanitized to plain text via
  `execCommand('insertText')` on each `.ce`. A bound `copy` event on
  `#cn-frame` intercepts ⌘C anywhere inside the frame and writes the
  full formatted CRM template via `cnFormatNoteForCopy_` — drag-
  highlighting any subset still produces a complete CRM-ready note
  (the headline UX win that drove the contenteditable refactor).
  COROLLARY: any document-level keyboard handler that exempts form
  fields must check `document.activeElement.isContentEditable` in
  addition to the `INPUT`/`TEXTAREA`/`SELECT` tagName check — the `.ce`
  divs are DIVs, so a tagName-only guard misses them. The shell's
  bare-`?` shortcuts-overlay handler (`script_core.html`) regressed on
  exactly this (a literal `?` typed into Issue/Resolution opened the
  overlay and swallowed the keystroke) until the isContentEditable
  check was added.
- **Fourteen client-side localStorage keys total.** All per-browser, all
  wrapped in try/catch so a privacy-mode browser doesn't break:
  - `umsTimeClockMode` — dark/light preference (read by the boot
    script in `index.html`).
  - `umsCallNotesLastDept` — the rep's last email-composer department
    selection (re-applied as the default on the next compose click).
  - `umsCallNotesActiveFormDraft` — the in-progress Call Notes form
    auto-saved on every input (debounced 400ms); restored on next
    Log view enter with a "Draft restored" toast. Cleared on
    successful submit or explicit Clear Note. Round 2 · 8e extended
    the persisted shape to include `flags[]` (multi-select) + `tags[]`.
    Drafts carry an `at` ms stamp and expire after 24h
    (`CN_FORM_STICKY_MAX_AGE_MS`) — a stale draft from a prior shift
    is silently discarded (and the completion timer reset) instead of
    resurrecting day-old patient details into a fresh session.
  - `umsCallNotesFormStartedAt` — start-ms of the active form's
    completion timer; persists across refresh so a mid-form reload
    doesn't reset the clock. Captured into `subformData.completionSeconds`
    on submit.
  - `umsSidebarW` — sidebar width in px (Round 2 · 8a); range-checked
    on restore (56–280px). Default 168px when absent or out of range.
  - `umsMergeMode` — Time / PTO mode (Round 2 · 8b): `'timeoff'`
    (default) or `'timesheet'`. Picks the side-rail content + the
    segmented toggle's active state.
  - `umsKbPanel` — KB drawer preferences as ONE JSON blob:
    `recents[]` ({id, title}, capped 5, deduped) + `suggest` (bool,
    default true — the context-suggestions toggle) + `aiSeen`
    ({hash, date} — the Phase A guidance card's collapse-after-seen
    marker; same facet combo renders collapsed for the rest of the
    day) + `deptCollapsed` ({deptName: bool} — the Reference tab's
    collapsible-department open/closed state, written by `kbToggleDept_`).
    Sanitized on read (corrupt blob → `{}`); deliberately a
    single key so drawer prefs don't multiply the key count.
  - `umsLastView` — the active tab key, written by `showView` on every
    navigation. On boot (when no `?tool=` deep-link is present) the shell
    re-enters this tab instead of defaulting to Time Clock, so an
    accidental refresh mid-note lands back on the Log view where the
    sticky form draft restores the typed fields. `enterTool`'s
    managerOnly bump makes a stale manager-tab value safe for reps.
  - `umsTour` — onboarding-tour state: `{seenVersion}`. The coach-marks
    tour auto-starts once per `TOUR_VERSION` (bump to re-offer after a
    material UI change); stamped on finish/skip. Replayable anytime from
    the Call Notes ? menu regardless of this flag.
  - `umsPopoutGeom_<tool>` — compact pop-out window geometry `{w,h,x,y}`,
    **keyed per tool** (#4 + per-tool windows). Written by
    `popoutPersistGeometryInit_` (compact window only, debounced on resize +
    on `beforeunload`) under the tool the window was opened for; read by
    `popOutCurrentView` (in either window — same-origin localStorage is shared)
    via the pure, range-guarded `popoutParseGeom_` (corrupt/out-of-range → null
    → default 480×800). A legacy single-window `umsPopoutGeom` blob seeds the
    SIZE only (not position) so a fresh per-tool window doesn't stack on an
    existing one. So each tool's pop-out remembers its own size/position across
    launches. Position is best-effort (browsers restrict programmatic move of an
    existing window).
  - `umsIntakeDrafts` — in-progress Intake form answers (PPD / PMD / PAP)
    as ONE JSON blob keyed by form type (`INTAKE_DRAFT_KEY`), auto-saved on
    input, restored on the form's view enter, cleared on send + Clear. Like
    the Call Notes draft it carries an `at` ms stamp and expires after 24h.
    NOTE this is **PHI at rest in the browser** (patient answers) — the same
    posture as the Call Notes active-form draft; it lives only in the rep's
    own browser and is wiped on send/clear/expiry.
  - `umsClockBg` — optional per-browser Clock **greeting (hero) card** background
    image ("for fun"), a downscaled (≤1280px, JPEG re-encoded) raster **data-URL**
    set via the image control on the clock card. Applied behind the WHOLE hero
    card (`#clk-hero` / `.clk-hero-bg`) — both the greeting text and the clock
    tile sit on top of it; the clock tile keeps its own sky gradient (the photo is
    the card background, not the big-clock background). Client-only — NEVER
    server-side (so an accidental PHI image stays in this browser; zero operator
    state), raster-only (PNG/JPEG/WebP, no SVG), ~1.1MB cap after downscale,
    try/catch on read/write (quota-safe). A baked-in dark scrim keeps the greeting
    text legible (`clkBgApply_`); cleared via the card's × button.
  - `umsCoachingMode` — the merged Coaching tab's Mine/Team mode (managers
    only; `'mine'` | `'team'`, default `'team'`). Reps never write it (they're
    always pinned to `'mine'` and never see the toggle). Read by
    `coachReadMode_`, written by `coachSwitchMode_`.
  Clearing browser data wipes all fourteen. (A 15th key, `umsDashboardCompact`
  — an in-page Dashboard compact toggle — was REMOVED in the dashboard-feedback
  batch: the toggle button lived inside the column it hid, so once collapsed
  there was no way back, and the `?compact=1` pop-out already covers compact.)

## Key Design Decisions

- **Multi-tool registry with tab sub-navigation.** The `TOOLS` object
  at the top of `script_core.html` is the single source of truth. Each
  top-level entry is a TOOL (Time Clock, Call Notes, Metrics); each tool
  declares a `sidebarIcon`, a `defaultTab`, and a `tabs` map whose
  keys are globally unique tab identifiers. The sidebar + mobile-nav
  show ONE button per tool. Sub-navigation is a horizontal tab bar
  (`#tool-tab-bar`) rendered above the view area, populated by
  `renderToolTabBar(toolKey)` whenever a tool is opened.
  **`managerOnly: true` tabs are both hidden from non-managers AND visually
  marked for managers** — `renderToolTabBar` adds a `.tt-mgr` class (a subtle
  upward `--accent-soft` gradient wash) + a small `.tt-mgr-mark` `manage` glyph
  so the privileged team-facing tabs read distinctly from rep tabs.
  **`adminOnly: true` is the above-manager tier** (the Manage module's Admin
  tab): visible only when `empState.isAdmin` (server-derived from `ADMIN_EMAILS`,
  which falls back to `MANAGER_EMAILS` until set — admins are a SUBSET of
  managers). It carries the same `.tt-mgr` marker (titled "Admin-only"). The
  shared gate is `tabVisibleForUser_(tab)` (adminOnly→isAdmin; managerOnly→
  isManager OR an `also` empState flag like `canSeeSpanish`; else everyone) +
  `toolVisibleForUser_(toolKey)` (a tool is shown in the sidebar/nav ONLY if the
  user can see ≥1 of its tabs — so the Manage module is hidden entirely from
  non-managers). `enterTool` redirects to `timeClock/clock` if the requested
  tool is fully gated, and bumps a gated tab to the first visible tab.
  **The admin tier is enforced BOTH client-side (the `adminOnly` tab) AND
  server-side** — the 25 Admin-tab config/system endpoints now gate on
  `emp.isAdmin` (`empIsAdmin_`: ADMIN_EMAILS set → that email list, else
  `emp.isManager` — so admin == manager until ADMIN_EMAILS is set, keyed off the
  SAME roster source the endpoints already use, avoiding the F5 property-vs-roster
  mismatch). They return `'Admin access required.'` (vs `'Manager access
  required.'`). The list is in INV-136; `getEnrolledCallNotesReps` stays
  MANAGER-gated (shared with the Team Notes Per-Rep dropdown). The **Manage
  module** (`manage` tool, sidebar-last) is the consolidated
  manager/admin home: it hosts **Manage Time** (was Time Clock → Manage; key
  `manage`), **Coverage**, **Punctuality** (both moved from Time Clock), and
  **Admin** (`adminOnly`, moved from Call Notes → Admin; key `callNotesAdmin`).
  All four tab KEYS are unchanged, so `?tool=<key>` deep-links, `currentView ===`
  guards, `umsLastView`, and the tour all keep working; the enter-handlers stay
  in the `tc/`/`cn/` partials. Pinned by the `tabVisibleForUser_` + registry-reorg
  Node tests.
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
  ID in column L); `cleanupTestData` wipes its Notes tab. It also
  provisions a CDR fixture (`DQE Historical Data` with two test
  agents + an `A_Q_` queue sentinel, IDs stored in Script Property
  `TEST_CDR_SS_ID`) for the Metrics integration tests; `getCdrSS_`
  honors a `_TEST_OVERRIDE_CDR_SS_ID` global so those tests read the
  fixture instead of the real CDR Report (`_withTestCdr_` resets the
  in-memory + CacheService CDR caches around each).
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
  involvement). Anything older now goes through the **adjustment-request
  flow (#4a)** — the employee Adjust modal batches one or more requested
  corrections and submits them via `submitPunchAdjustRequests` (no punch
  is written); a manager approves from the dashboard, which writes the
  `ADJ-*` punch via `writeAdjustPunchForEmployee_`. The immediate
  employee-writes-`ADJ-` path is gated behind the `employeeImmediateAdjust`
  feature flag (default off): when ON, the Adjust modal also shows an
  "Apply now" button that uses the legacy `recordPunch(custom)` path for an
  immediate single fix — server-enforced by the same flag (a non-manager is
  rejected with a "submit a request" message when it's off), so hiding the
  button can't be bypassed. The intent: keep the audit trail honest while
  putting older corrections under manager review by default.
- **Punch-adjustment requests are a TimeOffRequests-style queue (#4a).**
  `PunchAdjustRequests` sheet tab (auto-created), enum `PAR`, keyed by a
  UUID `ReqId`. `submitPunchAdjustRequests(requests[])` is caller-scoped,
  locked, and **atomic** — it validates every entry with the same guards as
  `recordPunch`'s adjustment path (date/time shape, known punch type, future
  reject, `ADJUST_WINDOW_DAYS`, reason beyond `OLD_ADJUST_ALERT_DAYS`) and
  rejects the whole batch if any fails, writing `Pending` rows only on full
  success. `managerGetPendingAdjustments` (manager-gated queue) +
  `updatePunchAdjustStatus(reqId, 'Approved'|'Denied')` (manager-gated,
  locked, transition-guarded to Pending only). Approve calls
  `writeAdjustPunchForEmployee_`, which touches ONLY that one punch type
  (find-existing-for-date → update, else append) + the personal-sheet
  mirror — it must NOT reuse `managerSaveDay` (a full-day reconcile that
  would delete other punch types). See INV-106/107.
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
  feature (the `?form=<token>` route). `doGet()` renders an
  "Access Restricted" page only for a visitor it can positively
  identify as external — a non-empty Google login email that is
  neither `@umsupply.com` nor a registered employee. This is
  fail-open by design: anonymous / empty-email visitors (the
  `executeAs:USER_DEPLOYING` + `ANYONE_ANONYMOUS` "unreliable email"
  case) and registered non-`@umsupply.com` contractor logins still
  receive the inert shell. The load-bearing protection is therefore
  per-endpoint: all `google.script.run` endpoints still require
  `getEmployeeInfo_()` (returns null for non-employees), so the
  internal API surface is inaccessible to external visitors
  regardless of whether they reach the shell. The only public
  endpoints are `getFormByToken` and `submitFormByToken`, which
  validate via UUID token.
- **Design tokens are the single source of truth for color,
  typography, radii, shadows, and motion.** All declared in
  `web-app/styles_design_tokens.html` and consumed via CSS
  variables (`var(--paper)`, `var(--ink)`, `var(--accent)`,
  `var(--mono)`, etc.). Hardcoded hex/rgba is reserved for the
  canonical token declarations inside that file; outside it the
  only acceptable "raw" colors are `rgba(0,0,0,X)` for
  invariant-across-modes scrims and overlays. Six derived semantic
  aliases (`--border-strong`, `--success-deep`, `--warning-deep`,
  `--danger-deep`, `--info-deep`, `--selection-bg` — the text-selection
  highlight, deliberately STRONGER than `--accent-soft`, which was
  invisible against field backgrounds) are also declared in the partial
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
  Emoji remain only inside the legacy-prefix-strip safety regex
  inside `showToast()` — the prior carve-out for native `confirm()`
  strings is no longer relevant because `window.confirm` /
  `window.prompt` have been fully replaced by `uiConfirm` / `uiPrompt`
  (see the related Key Design Decision). Adding a new icon means
  appending one path-data entry to `ICONS` in `script_icons.html`;
  new callers should pass the icon name to `icon()` rather than
  inlining SVG markup.
- **The two Stage-0 partials are the shared foundation for future
  tools in this repo.** A new tool dropped into
  `team-tools/<new-tool>/` can `include('styles_design_tokens')` +
  `include('script_icons')` (or copy the files in if the new tool
  is a separate clasp project that can't reach across directories)
  to inherit the Console-redesign warm-paper system, the dark-mode
  bootstrap-readiness, and the icon library. Tool-specific CSS
  layers on top in the new tool's own `styles.html` and consumes
  the canonical tokens directly — no per-tool color palette, no
  per-tool font declarations. The Console palette is the default —
  editorial green-as-primary (`--accent` green), separate `--info`
  blue for info-only surfaces; future palettes can be added in the
  tokens partial alongside it.
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
- **Pop-out uses a PER-TOOL named window target.** `popOutCurrentView()`
  calls `window.open(url, 'umsTeamToolsCompact_' + popoutToolKey_(currentView),
  ...)` where `popoutToolKey_` maps the active tab to its tool via
  `VIEW_TO_TOOL`. Keying the window name by TOOL means a Call Notes pop-out
  and a Time Clock pop-out can be open **at the same time** (each tool gets
  its own window), while a repeat click on the same tool's pop-out focuses
  that tool's existing window rather than spawning a duplicate. Geometry is
  likewise per-tool (`umsPopoutGeom_<tool>`), captured at boot from the
  `?tool=` the window was opened for, so internal navigation doesn't move a
  window's remembered size to another tool's key. Each pop-out is a full app
  instance (own iframe + ambient/clock pollers) — linear cost, negligible at
  the 2–3 windows a rep would realistically open.
- **Per-rep call-notes Sheets are the storage substrate.** Same
  pattern as the time-clock module's `EMP.SHEET_ID` (per-rep month
  Sheet) — each rep's notes live in a Sheet Robin owns, mapped via
  `EMP.CALL_NOTES_SHEET_ID`. Robin can pop the rep's Sheet open
  any time for retrospective; the script-as-Me has full access.
  No centralized call-log Sheet exists by design — per-rep isolation
  matches the legacy workflow Robin already maintains. Onboarding a new
  rep is one click (manager → Admin → Call Notes Enrollment →
  `provisionCallNotesSheet`, which `SpreadsheetApp.create`s the Sheet in
  the deployer's Drive and writes its ID into column L) — see the
  enrollment gotcha + INV-110.
- **Two-way Sheet entry via the reconcile pass (#8).** Because the per-rep
  Sheets are real Google Sheets, a rep can type notes directly into the
  `Notes` tab. Such hand-entered rows lack the app-assigned `noteId`,
  `Timestamp`, and `DateLocal`, so they don't appear in flags / search /
  coverage until reconciled. `reconcileCallNotes` (manager-gated, locked;
  Admin → "Reconcile Sheets" button) scans every enrolled rep's Sheet and
  backfills those three fields on rows that have content but no `noteId`
  (deriving the date from whatever the human supplied, else rep-tz today) —
  **content cells are never touched**. Idempotent: a row with a `noteId` is
  skipped, so re-running is a no-op. Writes a `CallNotesReconcile` audit row.
  Metrics/CDR is already Sheet-sourced and independent, so the dashboard's
  metrics half needs no reconcile. Runs BOTH ways now: the Admin → "Reconcile
  Sheets" button (manual) AND a daily manager-tz 5am trigger wired by
  `installAutomationTriggers` (the function works unchanged in a trigger
  context — the installer is a manager so the `isManager` gate passes). The
  daily scan is cheap relative to the destructive purges that already run
  nightly, and non-destructive + idempotent so an empty run is a harmless
  no-op. See INV-109.
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
  the email body's defaulting so paste + email line up. The default
  template includes a `Patient & TRX:` line (the `{patientAndTrx}` token
  was always supported but was missing from the default template until
  it was added — it now mirrors the email Call Details field order). Both
  the server CONFIG default and the client fallback in
  `cnFormatNoteForCopy_` carry the line; keep them in sync.
- **Client-side persistence is localStorage-based.** See the
  authoritative "Fourteen client-side localStorage keys total" entry in
  Common Gotchas for the full key list (`umsTimeClockMode`,
  `umsCallNotesLastDept`, `umsCallNotesActiveFormDraft`,
  `umsCallNotesFormStartedAt`, `umsSidebarW`, `umsMergeMode`,
  `umsKbPanel`, `umsLastView`, `umsTour`, `umsPopoutGeom`,
  `umsIntakeDrafts`, `umsClockBg`, `umsCoachingMode`)
  — all per-browser, all try/catch-wrapped.
  (An earlier version of this decision listed only four; Round 2 · 8a/8b added
  the sidebar-width and Time/PTO-mode keys, the KB drawer added its single
  `umsKbPanel` prefs blob, the refresh-restore behavior added `umsLastView`,
  #4 added `umsPopoutGeom`, the redesign added `umsIntakeDrafts` (Intake
  form drafts) + a `deptCollapsed` field inside `umsKbPanel`, the
  Clock-card background image added `umsClockBg`, and the merged Coaching tab
  added `umsCoachingMode`. The dashboard-feedback batch then REMOVED
  `umsDashboardCompact` — net 14.)
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
- **Time / PTO merge (Round 2 · 8b).** The Phase-2 "Combined Clock +
  Timesheet" combined view was deliberately dismantled here. The Clock
  tab is now standalone (hero + actions + ribbon + cov + 3-cell ledger
  + today's punches + teammate); the timesheet section moved into the
  renamed **Time / PTO** tab as a mode toggle (Time Off ↔ Timesheet).
  Default mode = `timeoff`; persisted to `localStorage.umsMergeMode`.
  The calendar is shared between modes (always shows worked-hours +
  PTO badges); the side rail swaps content: Time Off mode renders the
  rectangular `.pto-tile` + upcoming-request context, Timesheet mode
  lazy-loads tsData via `loadTimesheetSideRail_` (its own
  `getTimesheetData` call — the legacy `loadTimesheet` render cluster
  was deleted in Cycle 2 · L11, see INV-74) and renders
  a pay-period `.pto-tile` mirror + recent-activity list. TOOLS
  registry tab key stays `timeoff` so `?tool=timeoff` deep-links +
  `currentView === 'timeoff'` guards across the codebase keep working;
  only the visible label changed.
- **Day Edit modal on Live Status cards.** Each employee card in the
  manager Live Status grid has a pencil button that opens the Day
  Edit modal. The modal has a date picker (defaults to today),
  pre-populates existing punch times via
  `getEmployeeTimesheetForManager`, and submits via `managerSaveDay`.
  The manager can add, edit, or remove individual punch slots and
  must provide a reason for edits older than
  `CONFIG.OLD_ADJUST_ALERT_DAYS`. **Multi-day mode (#4b):** filling the
  optional "To" date switches the submit to `managerSaveDayRange`, which
  applies the entered times to every day in `[From, To]` (≤31 days)
  ADDITIVELY — each non-empty slot is set/updated per day via
  `writeAdjustPunchForEmployee_`, and a BLANK slot is left unchanged (NOT
  removed). This deliberately differs from single-day mode (`managerSaveDay`,
  a full-day reconcile where a blank field deletes that punch), so a range
  apply can't silently wipe lunches on days it touches. See INV-108.
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
  `CallNoteTrainingReply` carries the manager's email as actor. The
  Log-view Training Answers tray and the manager Per-Rep read-only card
  resolve the latest reply via `cnLatestManagerReply_` (prefers the
  `feedback[]` thread, falls back to the legacy `trainingReply`), so a
  reply that lives only in `feedback[]` no longer shows a blank answer
  line.
- **Manager comments on ANY note, not just training (item 9).**
  `setCallNoteManagerComment(repEmpId, noteId, message)` (manager-gated,
  locked) appends a `{role:'manager', kind:'comment'}` entry to
  `subformData.feedback[]` on any of a rep's notes — for feedback / praise.
  It reuses the multi-turn Q&A machinery: `cnRenderQAThread_` now renders
  for ANY note with a thread (the training-only guard was dropped), so the
  rep sees the comment on their own card and can 👍/💬 back
  (`appendCallNoteFeedback` was relaxed to allow a rep response on any note
  that has a feedback[] thread). The manager Per-Rep card shows the
  specialized clearable reply editor on training notes and a general
  "Comment" box on every other note. Audit row `CallNoteManagerComment`
  (PHI-free: noteId only). See INV-103.
- **Automated notification emails are branded (item 2).** A shared
  `buildBrandedEmailHtml_(heading, bodyHtml, opts)` wrapper (logo bar +
  colored header + white card + footer, inline hex from `CN_EMAIL_PALETTE`
  since email clients strip `<style>`) + `brandedKvRows_` give the Time
  Clock automated emails the same identity as the Call Notes / external /
  form emails. Converted (each keeps a plain-text `body` fallback +
  `htmlBody`): PTO decision, missed-punch (employee + manager digest),
  old-adjustment alert, training-question notification, and
  `sendAutomatedExport_` (all three branches: error / success / catch). The
  header color is semantic (Approved = green, Denied = red, alerts =
  warn-amber, else navy). `heading` is `esc_`'d in the wrapper; callers
  `esc_` any user data in `bodyHtml` (INV-89/INV-105). `sendAutomatedExport_`'s
  success email keeps its `.xlsx` `attachments: [blob]` alongside the branded
  `htmlBody` — every automated sender is now branded (the prior plain-text
  follow-on is closed).
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
- **Runtime feature toggles via a registry + the Admin tab.** A
  manager-flippable boolean store lets features be turned on/off live,
  no redeploy. `FEATURE_FLAGS` (a `Code.js` constant) is the single
  source of truth — `{key, label, description, default, scope, danger}`
  per flag; **only registry keys are honored**, and each `default`
  mirrors the legacy CONFIG constant so migrating a read to `getFlag_()`
  is a behavioral no-op until a flag is set. `getFlag_(key)` reads the
  Script Property `CN_FEATURE_FLAGS` first (sanitize-on-read → corrupt
  blob degrades to defaults; unknown key → fail-safe `false`), else the
  registry default. **`scope` is the load-bearing decision:** `client`
  flags only gate UI (delivered on `empState.flags` +
  `deptConfig.flags`, read via the `flagOn_()` client helper);
  `server`/`both` flags are ALSO checked server-side in their endpoint —
  hiding a button never disables an endpoint (INV-02/S30). The migrated
  set is `showTeammateStatus` / `showTeammateType` /
  `enablePtoTracking` (all `both`) / `voiceInput` (`client`); the first
  custom flag is `oopSalesTax` (`client`, gates the OOP subform's
  sales-tax field + the email's tax line); `employeeImmediateAdjust`
  (`both`, default off) gates the employee "Apply now" immediate punch fix
  alongside the #4a approval queue — server-enforced in `recordPunch`'s
  adjustment path so hiding the button can't be bypassed. `getFeatureFlags` /
  `saveFeatureFlags` are manager-gated (INV-57 family, `AdminConfigChange`
  audit). **Flip semantics:** flags are consulted at request boundaries,
  never mid-transaction (a flip can't interrupt an in-flight locked
  write); the server honors a flip on the next RPC, while client UI lags
  until its next config fetch — page load, view enter, OR the 60s Call-Notes
  ambient poll, which carries a `flagsVersion` (`cnFlagsVersion_`) and refetches
  `getCallNotesDepartments` on change (`cnRefreshConfigForFlags_`), collapsing
  the client staleness window to ≤60s while a rep is in Call Notes. So a stale
  client either keeps working (display flags) or gets a clean
  failure-toast when a server-enforced kill-switch rejects the next call.
  `danger` flags (`voiceInput` = HIPAA/BAA; `enablePtoTracking` =
  stateful, don't flip mid-cycle) require a `uiConfirm({tone:'danger'})`
  in the Admin UI. Pinned by the `getFlag_` / registry-integrity Node
  tests.
- **Stale-flag badge on the manager CN landing.**
  `managerGetUnresolvedActionCount` scans the flag + resolved columns
  (2 cols only, not full rows) across all enrolled reps' Sheets and
  returns `{ count }`. The Team Notes view renders the count as a
  badge on page load. The result is cached 2 min
  (`CN_UNRESOLVED_CACHE_KEY`, TTL-only freshness like the ambient
  cache, INV-43 — badge-appropriate) so the landing doesn't re-scan
  every rep's Sheet on each open.
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
- **PTO balance reconciliation (drift detection).** `getPtoReconciliation`
  (manager-gated, read-only) detects the H1 bug class — a rep with more
  than one *Approved* time-off row on the same date was double-deducted.
  For each (rep, date) the legitimate charge is the single largest
  deduction; any additional approved rows are over-charge, summed per
  bucket (annual/sick). It returns only reps with drift, plus their
  duplicate dates + current stored balances. Absolute balances can't be
  recomputed (no recorded initial allotment), so this targets the
  detectable, high-value signature rather than a full audit. The manager
  view lazy-loads it into `#mgr-pto-recon` and renders a danger card ONLY
  when drift exists (invisible when clean). `getPtoReconciliation` itself is
  **read-only**; the companion `fixPtoReconciliation` (manager-gated, locked,
  surfaced as the uiConfirm-gated "Credit & reconcile" button on the drift
  card) does the correction — per duplicate date it keeps the single largest
  deduction and sets the extra Approved rows' status to `'Reconciled'` (a value
  every status reader ignores — dashboard counts, calendar, reconciliation
  itself, the INV-94 dup-guard), then credits the server-recomputed over-charge
  back to the balances via `adjustLeaveBalance_`. Idempotent by construction:
  the neutralized rows are no longer `'Approved'`, so a re-run finds no
  duplicates and credits nothing. New requests can no longer create duplicates
  (INV-94), so this surfaces pre-fix damage. Pinned by
  `test_getPtoReconciliation_detectsDoubleDeduct` +
  `test_fixPtoReconciliation_creditsAndIdempotent` (INV-99 / INV-102).
- **CN card actions use a primary/secondary split.** Frequently used
  actions (flag-action, flag-training, pin, copy, email) are always
  visible. Less-frequent actions (urgent-toggle, flag-review, resolve,
  edit, find-prior-TRX) are behind a chevron-down `data-cn-action="more"`
  toggle that opens an inline `cn-more-menu` popover.
- **Card-level urgent toggle lives in the More menu.** A saved note can
  be flagged urgent from its card via a danger-toned button
  (`data-cn-action="flag-urgent"`) in the `cn-more-menu` popover — the
  placement resolved the old "primary-vs-secondary action row is tight"
  deferral (the row stays at its frequently-used set). Unlike
  action/training/review, urgent never touches the `FlagType` column:
  the dispatcher routes to `cnToggleUrgent_`, which optimistically
  toggles membership of `'urgent'` in `subformData.flags[]` (NOT
  `note.flagType`) and calls `setCallNoteFlag(noteId, 'urgent')` — the
  server's urgent branch (INV-77) flips the same array. Shares the
  `_flagInFlight` guard (INV-56) so a double-click can't fire two
  clobbering RPCs. Urgent notes render a danger-toned inset ring
  (`.cn-card.is-urgent`, declared after the `flag-*` + `stale-action`
  rules so its source order wins the ring color) plus a danger `urgent`
  pill. `cnIsUrgent_(note)` + `cnUrgentPillHtml_(note)` are the single
  source of truth for both, shared by the rep card and the manager
  read-only card (`cnMgrRenderReadonlyCard_` shows the ring + pill
  informationally — no toggle, staying read-only per S26). Pinned by
  `cnIsUrgent_` / `cnUrgentPillHtml_` client-harness tests.
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
  Ctrl/⌘+Shift+C saves & copies (moved off plain Ctrl/⌘+Enter in the
  2026-06-12 r3 feedback round — too close to the Enter-nav muscle
  memory; plain Ctrl/⌘+Enter is now unbound). Ctrl/⌘+Shift+Enter
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
  results render as **collapsible per-date groups**: each date is a
  `.cn-hist-group` with a clickable metadata header (caret + note count
  + per-flag-type count chips — urgent/action/training/review, from
  `cnHistGroupChips_`) that toggles the group body via
  `cnToggleHistGroup_` (`.collapsed` class). Single-date mode
  (start === end) uses the original `getMyCallNotes`
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
- **Email department display on note cards.** A sent note shows which
  departments the email went to as a readable, info-toned **`cn-sent-pill`**
  (`cnDeptEmailPillHtml_`) in the caller line — it wraps the dept label instead
  of ellipsis-truncating it, with the send timestamp in the `title`. The mail
  ACTION button (sent state) is just the icon (click = send again). Used by both
  the rep card and the manager read-only card (its `sentPill`). Replaced the old
  truncated inline `.cn-email-depts` text-on-the-button (that class is gone).
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
- **In-app form-submission viewer.** Once a recipient submits a
  fillable form, the rep who sent it can review the entered data
  without opening the `FormSubmissions` sheet. Note cards carrying a
  `subformData.formSubmission` stamp render a clickable `.cn-form-pill`
  ("form") — present in every `cnRenderCard_` view (Log / History /
  pinned tray). Clicking calls `getFormSubmission(token)`, which is
  caller-scoped: the server verifies the calling employee created the
  token (`FormTokens.CreatedBy`) before returning the humanized
  field/value pairs + signature image, rendered in a read-only modal
  (`cn-form-sub-overlay`). It is NOT a public endpoint (requires
  `getEmployeeInfo_`). The rep-facing endpoint is caller-scoped (a rep
  can't pull another rep's submission). A manager-side viewer also
  exists: `managerGetFormSubmission(repEmpId, token)` is manager-gated
  and scoped so the token must have been created by the selected rep
  (`FormTokens.CreatedBy`); it's surfaced via the form pill on the
  Team Notes Per-Rep read-only card and reuses the same read-only
  modal. Both share `buildFormSubmissionResult_`. Pinned by
  `test_cn_getFormSubmission_callerScoped` +
  `test_cn_managerGetFormSubmission_gatedAndScoped`.
  The modal renders a server-built **branded card** (`submissionHtml` on
  the result, from `buildFormSubmissionCardHtml_`) — the navy-header
  responses table + embedded signature image — so the in-app view matches
  the submission email. It's injected via `innerHTML` and is safe because
  every field is `esc_`-escaped server-side (same INV-89 discipline as the
  email-preview body); the client keeps the old label/value list as a
  fallback when `submissionHtml` is absent. The render markup
  (`buildFormSubmissionTableHtml_` / `buildFormSubmissionSigHtml_`) is the
  single source of truth shared by the in-app card AND the rep
  notification email (`buildFormSubmissionHtml_`). A fillable form sent via
  "Open Email" with NO saved note (empty `noteId`) is never stamped onto a
  note (`submitFormByToken` stamps only `if (noteId)`), so it has no
  `.cn-form-pill` — the **Sent Forms** tab (below) is the in-app surface for
  those.
- **Sent Forms tab (rep-facing, read-only).** A Call Notes tab
  (`callNotesForms` → `enterCallNotesFormsView`) listing every fillable
  form the rep has sent. Backed by `getMySentForms`, caller-scoped to
  `FormTokens.CreatedBy` (a rep sees only their own tokens), newest-first,
  with a derived status chip — pending / submitted / expired, where a
  pending token past its `ExpiresAt` reads as expired on the fly even if
  the status cell wasn't flipped by a visit. Closes the standalone-form
  gap: a form sent without a linked note is findable here. "View
  submission" reuses the caller-scoped, read-only `getFormSubmission`
  viewer. **Read-only throughout** — `getMySentForms` returns only token
  metadata (never the responses), and there is NO endpoint anywhere that
  edits a submitted form's responses (`FormSubmissions` is append-only:
  the sole write is the `appendRow` in `submitFormByToken`). That
  immutability is deliberate — a patient-signed submission is an attested
  record, so altering it would be both a HIPAA integrity-control
  (§164.312(c)) violation and an ethical one.
- **Intake Sent tab (rep-facing, read-only) — same model for intake
  submissions.** A fourth Intake tab (`intakeSent` → `enterIntakeSentView`)
  listing the rep's sent PPD / PMD / PAP submissions, so reviewing what was
  sent no longer means opening the PHI spreadsheet. Backed by
  `intakeListMySubmissions` (metadata-only list across the three submission
  tabs, caller-scoped to the stored `repId`, manager sees all, newest-first,
  cap 100) + `intakeGetSubmission` (bounded id-column lookup, owner-or-manager
  scoped). The detail view re-renders answers against the client question
  banks/layouts (PPD: `INTAKE_PPD_Q`; ACCT: `INTAKE_PMD_CLIENT`/
  `INTAKE_PAP_CLIENT`) and, for PPD, the stored recommendations + the rep's
  accept/undecided/reject selections. Read-only throughout — the submission
  tabs stay append-only (same §164.312(c) discipline as Sent Forms). See
  INV-116.
- **Form-submission notification renders the completed form.** When a
  recipient submits a fillable form, `submitFormByToken` calls
  `notifyRepOfFormSubmission_` (best-effort, try/catch — never blocks the
  recipient's successful submit). The email is a branded HTML body
  (`buildFormSubmissionHtml_`) rendering every response in the navy-header
  table, plus two attachments: the signature as `signature.png`
  (`signatureDataUrlToBlob_` — Gmail strips `data:` `<img>` in the body, so
  the PNG is the reliable path) and a **best-effort** PDF of the whole form
  via `Utilities.newBlob(html,'text/html').getAs('application/pdf')` (the
  signature is embedded in the PDF's HTML; if the conversion is unavailable
  the email still sends with the HTML body + PNG). `formatFormFieldValue_`
  humanizes array/boolean/nested values for the table + plain-text
  fallback. The mirror case (B2): when a submission is rejected by the
  payload size caps (INV-96), `submitFormByToken` calls
  `notifyRepOfFailedSubmission_` (best-effort, try/catch — never blocks the
  recipient's error response) so a silently-rejected submission isn't
  invisible to the sending rep. The notice is PHI-free beyond the recipient
  address the rep already has, and names only the form + the size reason.
- **Cross-rep manager aggregates are cached.** Two parameterless
  manager aggregates that otherwise re-scan every enrolled rep's Sheet
  are whole-result cached: `getCallNotesTagTaxonomy`
  (`CN_TAXONOMY_CACHE_KEY`, 5 min) is eagerly invalidated by the
  tag-admin endpoints (`invalidateCnTaxonomyCache_` from
  rename/merge/archive) so the Admin table reflects a change
  immediately; `managerGetUnresolvedActionCount`
  (`CN_UNRESOLVED_CACHE_KEY`, 2 min) is TTL-only like the ambient
  cache (INV-43). Open-ended substring search (`managerSearchCallNotes`
  without a date range) is intentionally NOT cached — speeding it up
  needs the full note text (a real index), which is out of scope; the
  date/column bounds (INV-46 reader) already cut its cell volume.
- **Paired-timezone chip + signal chip vocabulary.** `.tz-chip` pairs
  the rep's local-tz and manager-tz time into a single two-segment
  chip (the second `.seg` auto-omits when the rep's tz matches the
  manager's). `.signals` is a wrapping row of `.sig` chips with
  `.hol` (info-toned holiday), `.team` (warn-toned teammates-off),
  and `.bal` / `.bal.neg` (neutral / destructive-toned projected
  balance) variants — surfaces the three actionable signals a
  manager needs before approving a PTO request, replacing the prior
  inline mono text rows. Both components live in `styles.html` and
  are consumed today by the manager dashboard's live-status cards
  and pending PTO queue.
- **Time Clock → Dashboard (the Clock tab is a two-column Dashboard).** The
  `clock` tab (key + `enterClockCombinedView` handler UNCHANGED — only the visible
  LABEL is now 'Dashboard', so `?tool=clock`/`currentView==='clock'`/`umsLastView`/
  pop-out all keep working) renders a `.dash-grid`. **The whole TOOL's sidebar
  label was also renamed 'Time Clock' → 'Dashboard'** (the `timeClock` TOOLS-registry
  KEY + `?tool=timeClock` are unchanged — only the `label` string), so the sidebar
  now reads 'Dashboard' with the first sub-tab also 'Dashboard'. (`360px minmax(0,1fr)` — the
  `minmax(0,1fr)` is LOAD-BEARING for the carousel viewports). The greeting is a
  **full-width header bar** (`.dash-greet-bar`, a subtle panel) ABOVE the grid —
  with an "On the clock"/"On lunch" pill — not trapped in the right column (the
  earlier right-column placement left the page unbalanced). The whole dashboard
  view widens to `max-width:1480px` (via `.view-area:has(#dash-grid)`) since it's
  an app surface, not prose. **Left rail:** the existing `#clk-hero` — now just the
  sky clock with the white `.hero` card frame STRIPPED on the dashboard
  (`.dash-hero` zeroes bg/border/padding/shadow) so the gradient IS the card, not
  a clock boxed inside a white card; `#clk-hero` is KEPT so `umsClockBg` + all
  clock machinery work — + shift-strip. **Today's Punches + teammate moved OFF
  the rail** into a 2-up `.dash-foot` row at the bottom of the main column (the
  rail was stacking them tall with blank space opposite); they stay visible in
  the compact pop-out because compact now hides `#dash-cards` (the briefing) but
  not `.dash-foot`. **Main column:** the briefing **carousels**, with the two
  metric carousels laid **2-up** (`.dash-pair`, `minmax(0,1fr) minmax(0,1fr)`,
  stacks < 1100px) and a **2-up extras row** below (`#dash-extra` → another
  `.dash-pair`), then the punches/teammate foot row. **Dashboard data is
  stale-while-revalidate cached** (`CLK_DASH.loadedAt`/`extraAt`, `CLK_DASH_FRESH_MS`
  60s): a re-render paints the cache instantly (no loader) and only refetches in
  the background when stale — `clkRefreshState_` re-renders the WHOLE Clock view
  on every window focus/visibilitychange (now also throttled 20s), which used to
  flash the dashboard loader on every alt-tab. Each carousel is a
  clipped `.dash-vp`/`.dash-trk` (transform-only slides) driven by a sliding
  **segmented chip** (`.dash-seg` + a translateX highlight pill; `clkDashSet_`
  switches period transform-only, reduced-motion-safe). **Carousel height fit:**
  `.dash-trk` is `align-items:flex-start` (so slides keep natural height — flex's
  default `stretch` would equalize them to the tallest) and `clkDashFit_(key)`
  pins each `.dash-vp` to its ACTIVE slide's `offsetHeight` (after render via
  rAF, on every `clkDashSet_`, and on a one-time-bound `resize`; skips a hidden
  0-height viewport). The `.dash-vp` **height** transition that animates the
  card grow/shrink is the ONE deliberate exception to the otherwise
  transform-only carousel motion — one element, user-triggered on a switch,
  neutralized by the partial's `prefers-reduced-motion` block. v1 ships two carousels —
  **Your numbers** (own) + **Team**/**Department** (cohort-guarded team) — over
  **Yesterday / MTD / YTD**, fed by `getDashboardMetrics(periodKey)` (all three
  fetched up front, server-cached). **Annual PTO relocated** off the dashboard
  (already the `.pto-tile` on Time/PTO). Compact: the `?compact=1` pop-out
  collapses to the rail (`:root[data-compact] .dash-grid`); mobile
  (`max-width:860px`) stacks. (The earlier in-page `umsDashboardCompact` toggle
  was removed in the dashboard-feedback batch — its button sat inside the column
  it hid, so collapsing was a one-way trip; the pop-out already covers compact.)
  Every server string
  `esc()`'d; team values respect the N=3 cohort guard (INV-124). **Follow-ons
  (shipped):** (a) the **2-up extras row** (`clkRenderDashboardExtras_`) — a left
  card + a **Requests** card side by side. The left card is **Spanish Inbox** for
  Spanish-capable users (`canSeeSpanish`) or a pending-**Training** card
  (`clkDashTrainingCard_`, `getMyTraining` — to-do / overdue / next-due) for
  everyone else. The **Requests** card shows the manager team aggregate
  (`deptStats`) or, for a rep, their own open/resolved (`getDeptRequests().mine`)
  — every agent now gets the extras row (previously only managers, via a
  Spanish↔Requests slider that was replaced). The Spanish card **surfaces
  pending-request previews** when there are open requests — a `mail`-iconed
  count + median-reply line + one request (requester · age · snippet) paged by a
  ‹ N/total › nav (`clkSpNav_`, wraps; `CLK_DASH.spIdx`), fed by a best-effort
  `getSpanishInboxPending(7)` — and **falls back to the count tiles** (Pending /
  Resolved / Median) when none are pending or the fetch errors. The snippet is
  PHI-adjacent but stays within the same `canSeeSpanish` gate as the rest of the
  card. (b) a **run-rate projection** —
  the pure, Node-pinned `dashProjection_(value, fromIso, toIso, periodKey)`
  projects an MTD/YTD volume to period end by elapsed fraction (≥3 days elapsed,
  not a complete period, volumes-only — never a rate), rendered as an "On pace
  for ~N answered by <EOM/EOY>" line on the own + team cards. (The full daily
  "cone" chart would need a per-day series in `getDashboardMetrics` — deferred.)
  The pre-dashboard layout decision (hero + shift-strip + ledger; coverage in the
  shift header; world-clock strip) is below — those pieces still render INSIDE
  the rail.
- **Clock view: hero + shift-strip + ledger architecture.** The
  Clock tab's `renderClockView` emits, in order: a `.hero` block
  (greet kicker + name + live status sentence on the left, live
  clock + tz + date on the right; the optional per-browser photo is
  the hero CARD background — see the `umsClockBg` gotcha), the
  `.shift-strip` (head + day ribbon + breaks + the `.actions` row —
  one `.prime` CTA ClockIn → LunchIn → ClockOut by state, Adjust last
  as a `.sec`; **after the rep has already taken a lunch today** (a LunchIn
  exists + currently working), `renderActions(actions, {afterLunch})` makes
  **ClockOut** the prime CTA instead of a second LunchOut — most CSRs take one
  lunch, so the big gold "Lunch Out" again risked accidental clicks; LunchOut
  stays as a `.sec`. The **break chips** are terse `B1 / Lunch / B2` with compact
  `clkFmtMinShort_` times on one wrapping row, the Lunch chip shaded darker
  (`.clk-brk-chip.lunch`)), and a 3-cell `.ledger.ledger-3` strip
  (Annual / Sick / Hours today). **Note coverage is now INLINE in the
  shift-strip header (#3):** the per-hour note-volume bars behind the
  day ribbon (`ribbon-hist`, from `getMyNoteHourBuckets`) are the
  visual histogram, and the header shows a compact `% logged` +
  a "File N missing" link (`#clk-shift-cov`, `loadCoverageStrip_` →
  `renderCoverageStrip_`, fed by `getMyMetrics`; `fileMissingCalls_`
  CTA preserved). The old separate `.cov` donut/trend strip + its CSS
  were removed. Pay-period info moved to the Time /
  PTO tab's Timesheet-mode side rail in Round 2 · 8b — the Clock
  view no longer loads timesheet data. Today's Punches and teammate
  status render below the ledger as the existing cards. A world-clock
  strip (`#clk-regions`, item 5) sits under the hero clock: the rep's own
  offshore tz (IST/PHT) when it isn't a US zone, plus the US customer
  regions ET / CT / PT / HST. Pure client-side `Intl.DateTimeFormat` with
  formatters cached once per render (`clkBuildRegionFmts_`) and refreshed
  in the existing 1Hz `startClock` tick (`clkUpdateRegions_`) — no server
  cost, no extra interval. Add/remove zones via `CLK_REGION_ZONES`. **The
  strip ROTATES (declutter): it shows ONE zone at a time and slides to the
  next every `CLK_REGION_ROTATE_MS` (4.5s)** — `clkRotationZones_` excludes the
  tz currently in the big clock (it's already the headline); the displayed
  zone's minute stays live each tick, the slide-in (`.clk-region-rot`) fires
  only on a rotation step and is neutralized by `prefers-reduced-motion`.
- **Day ribbon (Clock view).** Horizontal 06:00–22:00 time ribbon
  rendered between the actions row and the coverage strip. Shows a
  dashed scheduled band, filled accent-green work segments + dashed
  warn-toned lunch segment, vertical punch markers with mono
  labels, and a pulsing accent-green now-cursor while the rep is
  mid-shift. The scheduled band anchors to first-ClockIn + the
  scheduled length once the rep has clocked in; before that it shows
  the rep's configured shift from `CONFIG.SHIFT_SCHEDULE` — a default
  of 8:00 AM – 5:00 PM CST (9h, the shift most UMS CSR agents work,
  per C3) plus per-timezone overrides (PH agents `Asia/Manila` =
  8:30 AM – 5:00 PM = 8.5h). `getShiftSchedule_` resolves it
  server-side by the rep's timezone and ships `{startMin, lengthMin}`
  via `getEmployeeState`; the client reads it through `CLK_SCHEDULE`
  (helpers `clkSchedStartMin_` / `clkSchedLenMin_`), falling back to
  the `RIBBON_DEFAULT_*` constants if absent. There is still no
  per-rep (vs. per-tz) schedule UI — add a `BY_TIMEZONE` entry for
  any new exception. The now-cursor is refreshed every 60s by
  `startRibbonNowCursor_` / `stopRibbonNowCursor_`, which are
  bound to the existing `startClock` / `stopClock` lifecycle so
  the interval cleans up on tab nav-away.
- **Manager telemetry strip with sparklines.** The manager
  dashboard's hero is a 4-cell `.telemetry` strip (Active / On Lunch
  / Missed / Pending). Missed + Pending carry 14-day sparklines
  built from `missedTrend` + `pendingTrend` arrays returned by
  `getManagerDashboard` (missed excludes today since reps still
  mid-shift always register as 0 missed; pending includes today).
  Per the C6 decision, Active + On Lunch stay as static counts —
  no trend data for them. Each cell's sub-line surfaces the most
  actionable specific (first missed rep + day, oldest pending rep).
  Sparkline data is computed in-memory from already-loaded `toRows`
  / `adpRows` — no extra Sheet reads (INV-13 honored).
- **Live-status sparkline.** Each live-status emp-card on the
  manager dashboard carries a 7-bar daily-hours sparkline + a
  `Xh·Nd` total/days-worked label. Driven by `recentHours[]` on
  each `liveStatus` entry (7 entries, oldest→newest, excludes today),
  computed via one extra in-memory pass over already-loaded
  `adpRows`. Bars are color-coded: zero days (`var(--paper-2)`),
  short days <6h (`var(--warn-soft)`), normal days (`var(--accent-soft)`).
  The total label uses `formatHoursShort` for compactness.
- **Metrics hero + rail layout.** Both My Stats and Team Metrics
  use a 1.4fr / 1fr hero+rail layout. Hero = big tabular % Answered
  + "vs 30-day avg" delta line (sign-toned green / red / neutral) +
  30-day sparkline with a dashed baseline at the trend average.
  Side rail = 5 `.m-row` entries (Notes / Answered / Missed /
  Avg Talk / Total Talk) with optional tonal value variants
  (`good` / `warn` / `crit`). Per-rep table preserved at the
  bottom of Team Metrics. Shared helpers: `mTrendAvg_`,
  `mBuildHeroSparkSvg_`, `mRailRow_`.
- **Note coverage + count have a single source of truth.**
  `cnNoteCoverage_(noteCount, answeredCalls)` (whole-number percent,
  or null when there's no answered-call denominator) and
  `countCallNotesInRange_(emp, from, to)` (date-normalized note count)
  are used by `getMyMetrics`, `getTeamMetrics` (per-rep + team
  totals), and `managerGetShiftStats`. They exist so the three
  callsites can't drift apart — the F1 regression (raw
  `String(CN.DATE_LOCAL)` reads silently returning 0 coverage)
  happened because the count was duplicated inline. New Metrics /
  Stats surfaces must reuse these helpers rather than re-deriving the
  ratio; `countCallNotesInRange_` honors the `CN.DATE_LOCAL`
  normalize gotcha. Same maintenance discipline as `CN_EMAIL_PALETTE`
  and `LEAVE_DEDUCTION_CLIENT`. Both helpers use bounded reads instead
  of pulling each rep's full history: `countCallNotesInRange_` reads
  only the DateLocal column (~16x fewer cells), and
  `managerGetShiftStats` reads just the requested date's contiguous
  row slice — both rely on notes being appended in DateLocal order,
  the same contiguity assumption as `exportCallNotesRange` (INV-46).
- **Cross-rep call-note reads are bounded too.** `readCallNoteRowsInRange_`
  is the shared bounded reader: given a full `{start, end}` it scans
  only the 1-column date range to find the contiguous slice (INV-46
  append-order assumption) and reads just that block, else it returns
  all data rows. `managerSearchCallNotes` and `managerAggregateFlagged_`
  (e.g. the weekly digest's 7-day window) route through it — bounded
  when a date range is supplied, full scan for open-ended search.
  `getCallNotesTagTaxonomy` instead column-bounds: it reads only the
  `SubformData` + `DateLocal` columns (~8x fewer cells) since it has no
  date filter. A future per-rep cached summary could bound the truly
  open-ended scans further, but the column/date bounds already cut the
  cell volume materially. The single-row lookups `findCallNoteRow_` /
  `findFormTokenRow_` are bounded the same way: they scan only the
  NoteId / Token column to locate the row, then fetch just that one
  full row (instead of `getDataRange().getValues()`), so a single-note
  mutation / token validation no longer reads the whole Sheet.
  The per-rep self-reads are bounded the same way (A6 hardening):
  `getCallNotesAmbient` (the 60s poll) reads only 5 columns and
  JSON-parses `SubformData` just for answered training rows;
  `getMyPinnedCallNotes` scans the `SubformData` column with a
  `"pinned"` substring pre-filter then fetches only the pinned rows;
  `getMyTrainingQA` picks the 5 newest answered training notes from
  column scans and fetches just those; the EOD digest reads only the
  rep's today-slice via `readCallNoteRowsInRange_`. The date/search
  self-reads `getMyCallNotes` / `getMyCallNotesRange` / `searchMyCallNotes`
  route through `readCallNoteRowsInRange_` too (L-8 — a contiguous
  date-slice when a date/range is given, a column-bounded full scan
  otherwise), so they now share the INV-46 append-order contiguity
  assumption the rest of the module already makes (the per-row date
  re-checks stay as defensive guards); `setCallNotePinned`'s pin-count
  uses the same `"pinned"` 2-column pre-filter (L-7), and
  `findCallNoteRow_` fetches its located row at `CN_HEADERS.length`
  rather than `getLastColumn()` (L-10). `FormSubmissions`
  lookups (`buildFormSubmissionResult_`, `verifyFormSubmissionIntegrity_`)
  go through `findFormSubmissionRow_` (token-column scan, newest row
  wins) rather than reading every submission's responses + signature.
- **Manager day-edit date picker is bounded `[today-N, today]`.**
  `openDayEditModal` sets `#de-date` min/max so a manager can't pick a
  future date (server rejects `daysBack<0`) or one past the adjust
  window — matching the Adjust modal. `N` is `CONFIG.ADJUST_WINDOW_DAYS`,
  now shipped to the manager client via `getManagerDashboard`'s
  `adjustWindowDays` field (falls back to 30 only if absent), so the
  picker tracks the real window if the CONFIG changes. The server stays
  authoritative regardless.
- **Compact pop-out defaults to 480×800, then remembers (#4) — PER TOOL.**
  `popOutCurrentView()` opens the `umsTeamToolsCompact_<tool>` window at
  **480×800 by default** (widened from the prior 380×780 so the Call Notes
  note template + its flags/tags/save rail sit side-by-side on launch instead
  of collapsing to one column), overridden by that tool's last persisted
  geometry (`umsPopoutGeom_<tool>` via `popoutParseGeom_`). The per-tool named
  target means each tool keeps its own pop-out window (Call Notes + Time Clock
  can coexist) while a repeat click on the same tool focuses its window rather
  than spawning a duplicate — and because open-features are honored only on
  first open, later resizes are captured by `popoutPersistGeometryInit_` and
  restored next launch. **Compact Time Clock (`:root[data-compact]`):** the
  world-clock region strip + greeting kicker are hidden and the hero/shift/row3
  paddings tighten so the clock, punch buttons, and today's punches sit higher.
  **Compact Call Notes form (`:root[data-compact]`):** the `cn-head`
  stats-mini is not rendered, the flag toolbar collapses to an **icon-only**
  4-across rail (`.flag-lbl` hidden; title + `aria-label` carry meaning), and
  the **save card (`#cn-save-card`) is `position:sticky; bottom`** with a
  compact-only collapse chevron (`.cn-save-collapse` → toggles `.collapsed`)
  so Save & Copy / Compose stay reachable without a manual resize. All
  compact rules are additive and gated to `data-compact`; wide mode is
  untouched.
- **Resizable sidebar with snap (Round 2 · 8a).** The sidebar's
  width is rep-adjustable: drag the right-edge `.sidebar-grip`,
  double-click to snap between icon-only (~56px) and labeled
  (~168px). Default width is 168px (narrowed from the prior 240px
  for density parity with the Round 2 mockup). `--sidebar-w` lives
  in `styles_design_tokens.html`; `initResizableSidebar_` sets it
  on BOTH the `.sidebar` element AND `documentElement` so the
  `.app-shell` grid template recomputes. Width persists to
  `localStorage.umsSidebarW` with a 56–280px range guard on
  restore. The `.sidebar.collapsed` class hides `.sb-lbl` labels +
  brand sub-name + user info text when width < 100px (the snap
  threshold). Each nav button wraps its label in `<span class="sb-lbl">`
  so collapsing/labelling is purely CSS.
- **Hover-triggered day modal (Round 2 · 8c).** Calendar cells with
  `data-date` open the day modal on hover (120ms grace) and schedule
  close on leave (200ms grace, cancelled if the cursor enters the
  modal). Click pins until click-outside or Esc. In hover mode the
  overlay backdrop is transparent + `pointer-events:none`
  (`.overlay.hover-mode`); the modal absolute-positions next to the
  hovered cell with overflow-aware right→left flip + vertical clamp
  via `positionDayPopover_`. Touch devices (`(hover: none)` media
  query) skip the hover binding entirely — tap always pins. The
  shell's Esc handler still closes any open overlay; a piggybacked
  listener in `tc/script_timeoff.html` resets the pin flag so
  subsequent hover-opens behave correctly.
- **Rectangular PTO tile (Round 2 · 8d).** The Time / PTO side rail
  (Time Off mode) renders a rectangular `.pto-tile` instead of the
  prior PTO donut. Head label + year/months-left meta + big tabular
  value + denominator + progress bar + footer with planned-upcoming
  days + projected balance after those plans land. Planned days is
  summed from `data.allRequests` (future-dated `pending`/`approved`)
  via `getLeaveDeductionClient_` (INV-72). The donut + `ptoRingSvg` +
  `.pto-card`/`.pto-rings`/`.pto-ring`/`.pto-svg*` CSS were all
  deleted along with the last caller.
- **Coverage-strip nav hint (Round 2 · 8z).** The Clock view's
  coverage-strip "File N missing" CTA fires
  `fileMissingCalls_(date, missingCount)` which sets
  `window.CLK_NAV_HINT { source: 'coverageStrip', date, missingCount }`
  before calling `enterTool('callNotes')`. The Log view's
  `cnConsumeNavHint_` reads + nulls the hint on enter and surfaces a
  confirmation toast. Future-ready for prefilling unmatched calls
  when per-call CDR data lands — DQE Historical Data is per-(agent,
  date) aggregated only today, so unmatched call IDs don't exist as
  a queryable concept. The URL deep-link approach (per the V1·E3
  spec) was blocked twice over (Apps Script iframe + no per-call
  data); the in-memory hint is the practical bridge.
- **Call Notes vertical layout + contenteditable (Round 2 · 8e).**
  The Log view's form is a 2/3 + 1/3 vertical layout (`.cnv-layout`).
  Left = `.cnv-doc-frame` with 7 contenteditable `.ce` divs (one per
  field) stacked as label-value rows; right = `.cnv-rail` with three
  `.rail-card` blocks (Flags / Tags / Save). Fields are
  contenteditable (not input/textarea) so the whole frame is a
  selectable region — see the manual-copy failover decision below.
  Field IDs preserved (`cn-fld-callback`, `cn-fld-caller`, etc.) so
  all downstream helpers (`cnReadActiveForm_`, sticky drafts,
  completion timer, phone formatter, optimistic UI) keep working
  through the new accessor helpers.
- **Manual-copy failover on `#cn-frame` (Round 2 deferred 8e).** A
  bound `copy` event on `#cn-frame` intercepts ⌘C anywhere inside
  the frame, `preventDefault`s the browser's selection-text copy,
  and writes the FULL formatted CRM template via
  `cnFormatNoteForCopy_` — the same output Save & Copy produces.
  Drag-highlighting any subset of the frame still pastes a complete,
  CRM-ready note. Solves the "the button didn't work, let me drag-
  highlight → blank paste" failure mode that input/textarea couldn't
  address (their values don't contribute to text selection).
- **Multi-select flag toolbar + free-text tags (Round 2 · 8e).** The
  form's flag toolbar is multi-select (`.flag-btn[data-flag]` with
  `.on` class): action / training / review / urgent. Free-text tags
  (lowercase kebab-case, 2–24 chars, max 8 per note) live in
  `subformData.tags`. Both round-trip the sticky form draft. Server's
  `sanitizeCallNotePayload_` accepts `payload.flags[]` +
  `payload.tags[]`; folds into `subformData`; derives FlagType via
  priority (`action > training > review > urgent` — `urgent` never
  enters the column, INV-37 preserved). Pin stays in
  `subformData.pinned` with its 3-cap (INV-50) — not part of
  `flags[]`. `setCallNoteFlag` (card-level toggle) also accepts
  `'urgent'` and mirrors the primary FlagType into `subformData.flags`
  so both shapes stay consistent (INV-77).
- **Multi-turn Q&A thread on training notes (Round 2 · 8g).**
  Training-flagged notes carry `subformData.feedback[]` as the new
  source-of-truth array of `{ role, kind, message, at, by }` entries.
  Manager replies via `setCallNoteTrainingReply` append a
  `{role:'manager', kind:'reply'}` entry alongside the legacy
  `trainingReply` field (backward compat). Agent acks via
  `appendCallNoteFeedback` append `{role:'agent', kind:'ack'}`;
  clarifications append `{role:'agent', kind:'clarification', message}`.
  `cnRenderQAThread_` on rep-facing cards renders the union of
  `feedback[]` and the legacy `(trainingQuestion, trainingReply)`
  pair; 👍 + 💬 buttons appear when the last message is from the
  manager and the rep hasn't responded yet. Click delegation in
  `cnInstallCardDelegation_` routes `[data-qa-ack]` /
  `[data-qa-clarify]` / `.qa-clarify-submit` clicks to
  `cnAckTrainingFlag_` / `cnSubmitClarification_`. `cnRenderQAThread_`
  takes an optional `{readonly}` arg that suppresses the rep
  ack/clarify buttons; the manager Per-Rep read-only card renders the
  full thread read-only with it, so agent acks/clarifications are
  visible to the manager (previously the card showed only the legacy
  single `trainingReply`).
- **Admin tab augmented with KPIs + tag taxonomy (Round 2 · 8h; 2nd-pass
  consolidation).** The Call Notes Admin tab is split into **Overview / Tags /
  Compliance / Config** sub-tabs (`cnAdminTab_`, persisted in
  `CN_STATE.adminTab`). **Overview** = a 3-card **System status** summary
  (Automation / CDR / Storage, derived from the same `getAutomationHealth` +
  `getStorageHealth` fetches the detail panels use — no extra RPCs) + a 4-cell
  `.telemetry` KPI strip (Week notes / Unresolved / Tags / Reps). The full
  Automation/Storage Health detail panels are folded behind a **"System
  details" disclosure** (`cnToggleSysDetails_`, plain show/hide — the panels are
  tall/variable so a fixed-height accordion would clip) so Overview lands on the
  summary, not a long scroll. **Tags** = ONE merged **taxonomy + trends** table
  (`cnRenderAdminAugmentHtml_` joins `getCallNotesTagTaxonomy` rows with
  `getCallNotesTagTrends` `series[]` by tag): columns Tag / Usage bar / Notes /
  **Trend** (inline sparkline `cnTrendSparkSvg_`) / **Δ wk** / Actions
  (Rename / Merge / Archive); the prior separate "Tag Trends" panel +
  `#cn-admin-trends` slot were removed (the low-value "Last seen" column was
  dropped for Trend+Δ). Manager-gated. Taxonomy scans each enrolled rep's Sheet
  for `subformData.tags[]`, marking each with an `archived` flag from
  `CN_ARCHIVED_TAGS`; `archivedOnlyTags[]` surfaces archived tags no longer in
  use (Restore). Trends bucket by ISO week over the trailing 12 (INV-125,
  archived excluded). **Compliance** = the audit panel; **Config** = the
  dept-email / state-tax / suggestions controls (preserved unchanged).
- **External-email message template library (Admin tab).** Manager-
  curated canned message bodies for the external (customer/provider)
  email composer — resolving the deferred "template library Admin
  panel." Stored as JSON in Script Property `CN_EMAIL_TEMPLATES`
  (read first by `getEmailTemplates_()`, `CONFIG.CALL_NOTES.EMAIL_TEMPLATES`
  — default `[]` — the fallback), edited via the Admin tab's "Email
  Templates" section (name + recipient-type select + body textarea
  rows; `saveEmailTemplates` is manager-gated, validates name/type/body
  + caps count 50 / body 4000, writes an `AdminConfigChange` audit row —
  same family as `saveDepartmentEmails` etc., INV-57). Each template:
  `{ name, recipientType: 'customer'|'provider'|'any', body }`. The
  body supports a `{name}` token swapped for the recipient name at
  insert. Templates ride to reps via `getCallNotesDepartments`
  (`CN_STATE.deptConfig.emailTemplates`) — a rep-callable config
  endpoint, so reps can use them without the manager-gated
  `getAdminConfig`. In the external composer the picker
  (`cnExtTemplateRowHtml_` / `cnExtTemplateOptionsHtml_`) filters to
  templates matching the current recipient type plus `'any'`, renders
  only when ≥1 template is configured, and re-filters its options when
  the recipient type toggles (no full modal re-render). Selecting one
  replaces the message textarea with the (token-substituted) body.
  `getEmailTemplates_` sanitizes on read (bad blob → CONFIG fallback,
  never throws), so a corrupt property can't break the composer. Pinned
  by `cnExtTemplatesFor_` / `cnExtTemplateOptionsHtml_` client tests.
- **Quick Links picker (Admin tab + external composer).** The same
  manager-curated/Script-Property/sanitize-on-read pattern as email templates,
  for `{label, url}` external links — survey / feedback / Google-review URLs
  hosted OUTSIDE this app. It's the deliberate workaround for the admin-blocked
  external fillable-form route (anonymous web-app access is disabled on the
  domain): reps email a link to an external survey/review host instead of an
  in-app `?form` link. Stored in Script Property `CN_EXTERNAL_LINKS` (CONFIG
  `EXTERNAL_LINKS` fallback `[]`); edited via the Admin "Quick Links" section
  (`saveExternalLinks`, manager-gated, validates label + http(s) url, caps 50,
  `AdminConfigChange` audit — INV-57 family); delivered to reps via
  `getCallNotesDepartments` (`CN_STATE.deptConfig.externalLinks`). In the
  composer the picker (`cnExtLinkRowHtml_` / `cnExtLinkOptionsHtml_`) renders
  only when ≥1 link is configured and **appends** the chosen `label: url` to the
  message (unlike the template picker, which replaces). Unlike templates, links
  are recipient-type-agnostic. Pinned by `cnExtLinkOptionsHtml_` client tests.
  **Categorized (the official external-collection path).** Each link carries an
  optional `category` ∈ `CN_EXTERNAL_LINK_CATEGORIES` (`survey`/`review`/
  `feedback`/`other`) — back-compat: absent/unknown → `'other'`, sanitized on
  BOTH read (`getExternalLinks_`) and write (`saveExternalLinks`), so a legacy
  `{label,url}` blob upgrades silently with no migration. The composer picker
  groups options by category via `<optgroup>` while preserving each option's
  ORIGINAL index into `cnExtLinksAll_()` (the insert handler is unchanged); the
  Admin editor row adds a category `<select>`. Framed in the Admin UI as the
  official way to collect from external recipients, since the in-app `?form`
  route is admin-blocked on this domain. `cnExtLinkOptionsHtml_` inlines its
  category labels (no module-level dep) so it unit-tests in isolation.
- **Reference tool: native markdown articles + Drive embeds, one store.** The KB
  is a single `KB` tab (one row per item: `{id, department, title, type, BodyMd,
  DriveKind, DriveFileId, sortOrder, …}`). Articles store **markdown source** (not
  HTML) — `kbMd_` renders it client-side and **escapes HTML before applying the
  markdown subset**, so authored content can't inject script and links are
  restricted to `http(s)`/`mailto` with quotes percent-encoded in the URL —
  the top-level escape covers `&`/`<`/`>` but NOT quotes, so without the
  encoding a `"` in a link URL broke out of the `href` attribute (attribute
  injection). The subset also covers **GFM tables** (`|`-row + `|---|`
  separator, `:` alignment, `\|` for a literal pipe in a cell, body rows
  clamped to the header's column count) and **inline images**
  (`![alt](url)` — `http(s)` only, NO mailto/data:; quotes percent-encoded
  in the src AND entity-escaped in the alt, the same two attribute-breakout
  guards as link `href`; rendered lazy + wrapped in an open-full-size
  anchor). That's the safety boundary; managers are the only
  authors but defense-in-depth keeps a bad paste inert. Embeds store only a
  Drive `{kind, fileId}` and render the `/preview` iframe — no content copied, so
  the Drive doc stays the source of truth. The tree is whole-result cached
  (`KB_CACHE_KEY`, 5 min), invalidated on save/delete. Reps are read-only;
  **content-authoring writes are ADMIN-gated** (`kbSaveItem`/`kbDeleteItem`/
  `kbUploadImage`/`kbConvertDriveDoc` check `emp.isAdmin` — INV-136; the
  Reference tool's Add/Edit/Delete/Convert affordances gate on `KB_STATE.isAdmin`
  from `getReferenceTree`'s `isAdmin`), locked + audited
  (`KbItemSave`/`KbItemDelete`). The manager review/analytics endpoints
  (`kbMarkReviewed`/`kbGetReviewDue`/`kbGetUsageStats`) stay manager-gated.
  Native-primary + Drive-fallback was chosen so 100% of content is navigable on
  day one (embed everything) while the most-referenced docs migrate to fast
  native articles over time. **Search is section-aware:** `searchReference`
  splits each article into heading-delimited sections (`kbSplitSections_`,
  fence-masked, pure), scores them with weighted distinct-token matching
  (`kbSearchScore_`: heading 2 / body 1 per token, +3 per title token on
  qualifying sections, +2 exact phrase — a title-ONLY match emits a single
  doc-level hit instead of flooding every section in), and returns the top 20
  CHUNKS (≤3 per doc, ≤1200 chars each, paragraph-boundary truncated with
  odd-fence repair) with a `heading` + `anchor`. Both the Reference tab
  (compiled view in the main panel + doc/section nav in the tree column) and
  the drawer render chunks inline via `kbMd_` grouped by doc
  (`kbChunkGroupsHtml_`), with "Open ¶" jumping into the full article at the
  section. The jump works because `kbMd_` stamps `id="kb-h-<slug>"` on
  headings using a client `kbSlug_` that MUST stay identical to the server
  `kbSlug_` (a parallel source-of-truth pair like `LEAVE_DEDUCTION_CLIENT`;
  both de-escape kbMd_'s three entities so escaped-source and raw-markdown
  slugs agree; duplicate headings suffix -2/-3 in the same walk order —
  pinned by a Node parity test). Embeds have no stored content, so they
  surface as title-only hits — another native-first nudge. Pinned by
  `kbMd_` (escaping/links/tables/images/heading-ids) + `kbParseDriveUrl_` +
  the `kbSplitSections_`/`kbChunkTruncate_`/`kbSearchScore_` Node tests.
- **KB Phase 2: per-item Doc→article converter, review-before-save.**
  `kbConvertDriveDoc({itemId | driveUrl})` (manager-gated, READ-ONLY)
  opens a Google Doc with the DEPLOYER's access (same trust model as
  embedding it) and converts the body to the markdown subset `kbMd_`
  renders, via `kbDocBodyToMarkdown_` / `kbTextToRuns_` /
  `kbRunsToMarkdown_`. Tables convert faithfully to **GFM** (row 0 as the
  header since Docs tables have no header concept; cell formatting goes
  through the runs pipeline so bold/links survive; literal pipes escape
  as `\|`; ragged rows pad to the widest row). Lossy parts degrade
  explicitly with warnings: nested tables → flattened into the parent
  cell, multi-line cells → joined with spaces, unsupported elements
  skipped by name, drawings → italic placeholder; bold+italic collapses to bold
  and link URLs get `()`/whitespace percent-encoded so the output is
  always `kbMd_`-render-safe (a Node round-trip tripwire feeds the
  converter's GFM back through `kbMd_` and asserts a `<table>` renders —
  the two formats are a parallel source-of-truth pair). Two client entries — "Convert to article"
  on a doc-embed's reader view and "Convert this Doc to an article
  instead" in the editor's embed mode — both just PRE-FILL the existing
  editor (live preview); the save is the normal `kbSaveItem` in-place
  update, and the Drive file is never modified. A blind "convert ALL
  embeds" batch was deliberately not built (unreviewed conversions could
  silently replace working embeds with degraded articles). The walker
  compares `String(getType())` etc. against enum NAMES so the Node
  harness drives it with plain-object stubs ("kb — Doc→markdown
  converter" tests).
- **KB Phase 2b — converter images export to Drive at SAVE time.** The
  converter (still strictly READ-ONLY, INV-115) emits a
  `![Doc image n](kbdoc:<fileId>:<n>)` token per `INLINE_IMAGE`
  (paragraph children, document order, cap `KB_DOC_IMAGE_CAP`=20/doc;
  drawings have no blob API and keep the italic placeholder). The editor
  preview shows the token's alt text (`kbMd_` demotes non-http image
  schemes — unchanged security boundary). When the manager presses Save,
  `kbSaveItem` → `kbResolveDocImages_` re-walks the Doc with
  `kbCollectDocInlineImages_` (a walk that MUST stay mirrored with the
  converter's ordinal assignment or the wrong image exports — pinned by
  a Node walk-mirror test), exports each referenced blob to the
  deployer-owned **KB Images** Drive folder (Script Property
  `KB_IMAGES_FOLDER_ID`, auto-provisioned, domain-link-viewable), and
  swaps the token for the `drive.google.com/thumbnail?id=…&sz=w1200`
  URL `kbMd_` renders. Exports are **idempotent**: files are named
  `kbdoc-<fileId>-<n>` and REUSED on re-save (stable URLs, no folder
  litter) — delete the exported file to force a refresh after the Doc's
  image changed. Resolution runs BEFORE the ScriptLock (Drive exports
  are slow; only the sheet write holds the lock), every failure degrades
  per-token to the placeholder with a warning surfaced in the save
  toast, and the audit row carries `imagesExported=`. Pinned by the
  "kb — Phase 2b" Node tests (token emission, cap, extract/replace,
  walk mirror, preview/final kbMd_ render).
- **KB Phase 3 — paste-a-screenshot upload in the article editor.** Pasting
  an image into the editor textarea uploads it via `kbUploadImage`
  (**admin-gated** — KB content authoring, INV-136; PNG/JPEG/GIF/WebP whitelist
  — NO SVG, it's script-capable; ~3MB cap `KB_IMG_UPLOAD_MAX_CHARS`, mirrored
  client-side) into the same Phase 2b **KB Images** folder
  (`kbpaste-<stamp>-<rand>` names) and inserts
  `![Screenshot](<thumbnail URL>)` markdown. The paste listener is
  ELEMENT-scoped (the textarea — structurally immune to the Intake M7
  document-listener leak class); a unique placeholder token goes in at
  the cursor and is string-replaced when the upload resolves (live
  textarea first, the `KB_EDIT` snapshot as fallback), so mid-upload
  typing or a type-switch re-render can't misplace the markdown. No
  ScriptLock (Drive-only write); PHI-free-by-policy reminder sits under
  the textarea; orphaned uploads (pasted, never saved) stay in the
  folder — trim manually. Audit row `KbImageUpload` (INV-118).
- **KB AI Phase A — facet-based guidance card in the Reference drawer.**
  `kbGetFacetGuidance(facets)` sends ONLY whitelisted enum facets
  (department / update type / tags / flag type) + excerpts from our own
  PHI-free-by-policy KB articles to the **Anthropic Messages API**
  (`UrlFetchApp` → `/v1/messages`; key in Script Property
  `KB_AI_API_KEY`) and returns `{guidance, sources[]}` rendered as a
  "Guidance" card atop the drawer home with Open-¶ source links. The
  load-bearing privacy invariant is **INV-119: no free text ever enters
  the vendor payload** — `kbAiSanitizeFacets_` drops every
  non-vocabulary value (novel tags, typo'd enums, smuggled free text),
  and `kbAiBuildPrompt_(clean, chunks)` has no parameter through which
  note text could pass; the client's facet gather
  (`kbAiGatherFacets_`: form flags + tags + `umsCallNotesLastDept`) is a
  convenience, not the boundary. Cost funnel: canonical facet-hash cache
  (6h, generation-salted by KB edits) → retrieval score floor (thin
  matches never call the API, cached as none) → daily org spend cap
  (`KB_AI_DAILY_CAP`, default $3; costed from usage tokens via
  `KB_AI_MODEL_PRICES`, unknown model billed at the dearest known
  rates) → vendor. **The cap is race-safe (L-2):** the check + a
  per-call reservation (`KB_AI_CALL_RESERVE_USD`, $0.02) are applied
  atomically under a brief lock (`kbAiTryReserveSpend_`) BEFORE the
  vendor fetch, then reconciled to the real cost — or the reservation
  refunded on a failed/empty call — via `kbAiApplySpend_` (renamed from
  the old `kbAiRecordSpend_`). This closes the lost-update window where
  concurrent cache-misses each read spend < cap and all called the
  vendor. The lock is deliberately NOT held across the (slow) fetch (the
  `kbResolveDocImages_` lesson), and reservation fails OPEN on lock
  contention — the Anthropic-console hard cap remains the true backstop.
  Everything is best-effort: any failure returns
  `{none}` and the drawer's existing Suggested block stands alone.
  Gated by the `kbAiGuidance` feature flag (default OFF, scope `both`,
  danger-marked: external AI vendor). Admin tab "AI Guidance
  (Reference)" section edits the cap + model (`saveKbAiSettings`,
  manager-gated; the model `<select>` renders from the server's
  `KB_AI_MODEL_PRICES` keys so client/server can't drift) and shows
  today's spend + key status; the key itself is editor-only.
  Collapse-after-seen: the card collapses for the rest of the day per
  facet-hash (`umsKbPanel.aiSeen`). Model default `claude-haiku-4-5`
  ($1/$5 per MTok). Phase B (ask box) is deliberately NOT built —
  gated on observed demand. See INV-119 + S66.
- **KB reference drawer — mid-call lookup as a shell capability.** A
  slide-over panel (`#kb-drawer`, right edge, z-index 55 — ABOVE the
  `.overlay` layer (50) so it stays readable + usable while the email
  composer or other modals are open; the core focusin trap exempts
  `#kb-drawer` so its search box keeps focus, and Esc still closes the
  topmost overlay before the drawer) giving reps searchable
  Reference access without leaving the note form. Toggled by
  **Ctrl/⌘+K** (bound in `script_core.html`'s shared keydown — fires
  even when focus is in a form field, that's the point; the prior Call
  Notes V4 search-jump keybind on the same combo was REMOVED — both
  handlers fired and the Search-tab nav closed the freshly opened
  drawer) or a right-edge
  vertical tab shown only on the mid-task tools (Call Notes / Intake,
  per `VIEW_TO_TOOL`; hidden in compact mode). **Mounted on
  `document.body`, NOT `#view-area`** — Call Notes' optimistic
  re-renders rewrite `#view-area`'s innerHTML and would wipe a drawer
  mid-read at exactly the moment a rep is using it. `showView` calls
  `kbDrawerOnNavigate_` (typeof-guarded, the `cnStopAmbientPolling_`
  pattern) to close it on any navigation; Esc closes it only when no
  overlay is open. Search-first UX (250ms debounce → `searchReference`,
  stale responses dropped via a sequence counter); results render as the
  same compiled section-chunk view as the Reference tab (grouped by doc,
  chunks readable inline, "Open ¶" jumps to the section in the full
  article); articles render
  inline via `kbMd_` (sharing `.kb-article` styles); **Drive embeds get
  an open-in-new-tab card** — a 400px drawer can't host an iframe
  usefully, which quietly reinforces native-first conversion. Home view
  = "Suggested" + "Recent": recents live in the single `umsKbPanel`
  localStorage blob; suggestions are CONTENT-AWARE — the in-progress
  Issue field text is sent to `searchReference` (OUR server only — the
  same enrolled-gated, read-only endpoint the search box uses, and the
  same trust boundary the note itself is saved to; never any third
  party) and the top section hits render as suggestion rows with
  Open-¶ jumps. Cached per issue-text (`KB_DRAWER.suggestCache`) with a
  sequence guard; instant first paint comes from the client-side TITLE
  match (`kbSuggestMatches_`) while the content search runs, and a
  failed RPC silently keeps the title matches. Rendered only inside the
  drawer and behind a per-rep toggle (`umsKbPanel.suggest`, default on). Reuses the three
  enrolled-employee KB read endpoints — no new read surface. Pinned by
  the `kbRecentsPush_` / `kbSuggestMatches_` Node tests.
- **KB usage feedback loop ("most referenced during calls").** Every
  article/embed open — drawer or Reference tab — fires a best-effort
  `kbRecordView(itemId, context)` (rep-callable, locked INV-01,
  append-only `KbViews` tab in the KB spreadsheet; PHI-free row:
  timestamp + itemId + repId + sanitized context token like
  `drawer:callNotes` vs `reference`). `kbGetUsageStats` (manager-gated,
  read-only, bounded 4000-row tail scan) aggregates a 30-day top-5 with
  the in-call share broken out, rendered as a "Most referenced · 30d"
  block atop the manager's Reference tree — the signal for which guides
  to polish/convert next. Client calls are fire-and-forget; a failure
  never surfaces. See INV-117.
- **Win-back nudge on a "changing suppliers" close.** When a Close-Order
  department email is sent and the free-text `closeDetails.reason` matches a
  supplier-switch pattern (`cnIsSwitchingSuppliersReason_` — loose substring
  match; a false positive is just a dismissible prompt), the send success
  handler offers (`uiConfirm`) to open the external **customer** composer
  pre-filled with the win-back survey email. **Self-gating:** `cnMaybeWinbackNudge_`
  fires only when a manager has configured an email template whose NAME contains
  "win-back" (`cnFindWinbackTemplate_`, matches `/win[\s\-]?back/i`) — so it stays
  silent until set up, and a deployer disables it by removing/renaming that
  template. The nudge is wrapped in try/catch in the send handler so it can never
  break the email result, and it carries NO PHI (opens the non-PHI customer
  composer, pre-fills `{name}` from the note's caller + the win-back template
  body). The survey it links to must stay service-only — no clinical questions,
  no PHI in the link (it's a churn/quality survey = health-care operations).
  Pinned by `cnIsSwitchingSuppliersReason_` / `cnFindWinbackTemplate_` client
  tests. **Operator note:** name the win-back template "Win-Back Survey" (or
  anything containing "win-back") or the nudge won't find it.
- **Compliance audit panel (Admin tab).** Manager-only call-note
  AuditLog search living in the Admin tab below the tag taxonomy —
  resolving the deferred "compliance audit Admin panel." Backed by
  `getCallNotesAuditLog(filters)` (manager-gated): filters by rep
  (EmployeeId), action (the `CN_AUDIT_ACTIONS` call-note set), and date
  range (defaults to the last 30 days in the manager's tz). It reads the
  shared AuditLog via a **bounded** tail scan (`cnReadCallNoteAuditRows_`
  reads at most `CN_AUDIT_MAX_SCAN`=4000 of the most-recent rows — the
  log is append-only/chronological — then filters in memory, capping
  results at `CN_AUDIT_MAX_RESULTS`=500). Returns a `truncated` flag when
  the result cap is hit or the scan window didn't reach the requested
  start date, so the client can prompt the manager to narrow. Rows are
  **PHI-free** (timestamp, rep, actor email, action, `noteId` parsed from
  the Notes field) — note content never enters the AuditLog (INV-32).
  Clicking a row's caret expands its full lifecycle via
  `getCallNoteAuditHistory(noteId)` (a separate bounded scan, deliberately
  independent of the search date filter so earlier events still surface,
  returned oldest-first). "View note" deep-links to the Team Notes
  Per-Rep view (`cnAuditDrillToNote_` sets `CN_STATE.mgrRepView` +
  `mgrPendingRepDrill`, then `showView('callNotesManage')`; the Team
  Notes enter opens the Per-Rep view instead of the default training
  queue when the pending-drill flag is set) — that view is where the
  actual note content lives. All server strings route through `esc()`
  before `innerHTML`. Note IDs/dates/rep IDs pass via `data-*`
  attributes read in the handler (the `cnStatsDrillDown_` pattern), not
  inline string interpolation.
- **Deploy-readiness checklist (Admin Overview headline).** A manager-gated,
  read-only, PHI-free pre-deploy report (`getDeployReadiness`, rendered by
  `cnLoadDeployReadiness_` atop the Admin Overview pane). It does NOT re-scan —
  it **composes** the existing `getStorageHealth` (all 7 stores'
  configured/reachable/tz-vs-CONFIG) + `getAutomationHealth` (digest heartbeats,
  CDR) + the `getManagerEmails_()` count into a single pass/warn/fail checklist
  via the pure, Node-pinned `deployReadinessItems_(storage, automation,
  managerCount)`. Banding: required stores (`ADP_SS_ID`/`KB_SS_ID`/
  `INTAKE_SS_ID`) **fail** when unset; optional stores (CDR/Forms/HR/per-rep)
  **warn**; a configured-but-unreachable store **fails**; a tz mismatch **warns**
  (the silent coerced-read drift); no digest heartbeat yet **warns** (expected on
  a fresh deploy). Manager-gated (the omnibus pins it). Every server string
  `esc()`'d. Surfaces the operator-state gaps (sheet-tz drift, unset properties,
  uninstalled triggers) as one glance before cutting a new deployment version.
- **Patient/TRX timeline (rep-facing, read-only).** `getPatientTimeline(trx)`
  (rep-callable, **caller-scoped**) stitches everything the rep has on one
  patient/order into a single newest-first list: their OWN call notes (TRX
  substring via `searchMyCallNotes`), intake submissions (`patientInfo`
  substring via `intakeListMySubmissions`, **filtered to `emp.id` even for a
  manager** so it can't widen to cross-rep), and sent fillable forms (linked by
  source `noteId` via `getMySentForms`). The merge/sort is the pure, Node-pinned
  `buildPatientTimeline_(notes, submissions, forms, trx)` — heterogeneous source
  timestamps (`T`-form notes/forms vs space-form intake) normalize to a
  comparable `yyyy-MM-dd HH:mm:ss` prefix for display ordering (the cross-tz
  caveat never reorders same-source events). It reuses only existing
  caller-scoped/bounded endpoints — no new read surface, no PHI cross-leak. The
  PHI is the caller's own. Surfaced as a Timeline button in the note-card
  more-menu (next to "Find prior calls for this TRX") → a read-only
  `ensureOverlay` modal (`cnOpenPatientTimeline_` / `cnBuildTimelineHtml_`),
  every server string `esc()`'d. **v1 is rep's-own-patient context, NOT a
  cross-rep manager view** (a manager-gated variant reusing
  `managerSearchCallNotes` is the follow-on if needed).
- **Storage Health panel (Admin tab, #1).** Manager-only, read-only
  one-pane-of-glass over every spreadsheet the app uses (`getStorageHealth`,
  rendered by `cnLoadStoragePanel_`). Since the 2nd-pass consolidation it +
  Automation Health live behind the Overview **"System details" disclosure**
  (the always-visible 3-card System-status summary is the folded view of both;
  the full panels are the drill-down). For each of the
  seven stores (see the Operator State Checklist's storage map) it reports which
  Script Property resolves it, whether it's configured + reachable
  (`SpreadsheetApp.openById` in try/catch), and — the headline — whether the
  spreadsheet's timezone equals `CONFIG.TIMEZONE` (a mismatch silently drifts
  every coerced date/time read; the S1.1 tripwire only covers the ADP sheet,
  this covers all of them). It also flags the `FORMS_SS_ID`-unset → form-PHI-on-
  the-ADP-sheet case (the recommended consolidation) and probes each enrolled
  rep's per-rep Notes Sheet for reachability + tz drift (the established
  cross-rep walk cost). PHI-free: returns store metadata + names/urls + tz only,
  never row content. Every server string is `esc()`'d before `innerHTML`. The
  management surface is consolidated here without consolidating the data stores
  (whose PHI/payroll/HR/retention boundaries are deliberate). **"Jump to source"
  (Tier 1):** each store row carries an `Open ↗` link (`s.url` = `ss.getUrl()`);
  a tz-mismatched store ALSO renders an inline fix hint ("set this sheet's time
  zone to `<configTimezone>` · File → Settings → Time zone" + open link — the fix
  is a spreadsheet-level setting, not a cell), and each drifted/unreachable
  per-rep Notes Sheet links straight to its source (`problems[].url`, omitted for
  the unreachable ones we couldn't open). `getStorageHealth` already returns
  `configTimezone` for the hint.
- **Automation Health panel (Admin tab).** Manager-only, read-only
  surfacing of the silent-degradation signals (`getAutomationHealth`,
  rendered by `cnLoadHealthPanel_`; since the 2nd-pass consolidation it sits
  behind the Overview "System details" disclosure, with the Automation + CDR
  System-status cards as its always-visible summary). One
  bounded AuditLog tail scan (`CN_AUDIT_MAX_SCAN` rows) yields (a) the
  `PersonalSheetSyncFail` count + 5 most recent entries over a 30-day
  window and (b) the last-seen audit row per automation job
  (`AUTOMATION_AUDIT_ACTIONS`: reconcile / ADP export / both form+note purges /
  the call-notes cold-archive / the cold-archive purge) —
  each captioned with its expectation, since purges only write a row
  when retention is enabled and the export only fires at period end, so
  "never seen" isn't automatically "broken". A CDR block (5-min-cached
  unfiltered 7-day read) reports reachability, `columnWarning`, and
  roster↔agent name mismatches — canonicalized through
  `getCdrNameMap_()` first, because the unfiltered read doesn't apply
  aliases itself and every aliased agent would otherwise false-positive
  as unmatched. CDR failure degrades to a warning box (`cdr.ok:false`)
  without taking down the rest of the panel. Every server string is
  `esc()`'d before `innerHTML`. **"Jump to source" (Tier 1):** the panel
  header carries an `Open AuditLog ↗` deep-link to the AuditLog TAB
  (`res.auditLogUrl` = `auditSheet.getParent().getUrl() + '#gid=' +
  auditSheet.getSheetId()`, built in a try/catch) — the raw source of the
  sync-fail + automation-last-seen evidence. The EOD/weekly/urgent/training-overdue
  digests still write
  no audit rows (deliberate — the hourly EOD digest would crowd the
  bounded AuditLog tail scans); instead each run stamps a Script-Property
  heartbeat (`stampDigestLastRun_` → `AUTOMATION_DIGEST_LAST_RUNS`) and
  the panel renders a "Digest heartbeats" block with per-digest staleness
  flags (EOD stale > 2h, urgent > 26h, weekly > 8d, trainingOverdue > 26h),
  so a silently-dead digest trigger is visible without reading logs.
- **"Open Email" button (Round 2 · 8f).** The Phase-4 "External"
  button on the Log view's action row was renamed "Open Email"
  (still binds `cn-ext-email-btn` → opens the external composer
  modal — customer/provider emails). Save & Compose still opens
  the department composer. Both composer modals share a tab-strip
  (see the next decision) so reps can flip between them without
  losing note context.
- **Email composer Internal/External tab merge.**
  `cnRenderComposerTabStrip_(active, noteId)` renders a shared
  Department | External segmented control at the top of BOTH the
  department composer (`cn-compose-overlay`, in both form + preview
  steps) and the external composer (`cn-ext-overlay`).
  `cnSwitchComposerTab_(target)` captures the active composer's
  `noteId` from `CN_STATE.composer` / `CN_STATE.extComposer` and
  preserves it across the transition. The Department
  tab is disabled when no noteId is in scope (rep clicked "Open
  Email" from an unsaved form — there's no saved note to attach
  EmailedAt/EmailDepartments stamps to); `cnSwitchComposerTab_` also
  guards defensively with a toast. **Flicker-free ordering:** the
  TARGET modal is mounted BEFORE the SOURCE is torn down (the prior
  close-then-open order exposed a bare empty-backdrop frame). The
  synchronous direction (→ Department, and → External once the form
  catalog is cached) mounts target + removes source in one JS tick,
  so the browser never paints the in-between state. For External's
  async first open (form-catalog fetch) the Department overlay stays
  mounted until the fetch resolves — `cnOpenExternalEmailModal_` takes
  an optional `onMounted` callback that `cnSwitchComposerTab_` uses to
  call `cnCloseComposerModal_` only after the external modal is in the
  DOM. (The full one-shell consolidation is still unbuilt, but the
  observable flash is gone without it.) CSS in `styles.html`:
  `.cn-composer-tabs` + `.cn-composer-tab(.on,.disabled)`, matching
  the Time/PTO mode-toggle segmented-pill vocabulary.
- **Tag taxonomy rename/merge/archive batch-edits across reps.**
  Three new manager-gated endpoints in `Code.js`:
  `renameCallNoteTag(oldTag, newTag)` and
  `mergeCallNoteTags(sourceTag, targetTag)` walk every enrolled
  rep's Sheet via `applyTagTransformAcrossReps_` and rewrite
  `subformData.tags[]` in place — dedupe handles the case where
  both tags already exist on the same note. `archiveCallNoteTag(tag,
  archived)` only toggles membership in the `CN_ARCHIVED_TAGS`
  Script Property (JSON-encoded array of lowercase tags) and does
  NOT modify any notes — archived tags continue to render their
  chips on existing cards; archive only flags the tag for future
  tag-suggestion surfaces (none exist today) and visually segregates
  it in the Admin taxonomy table. All three: acquire a single
  project-level `ScriptLock` (INV-01), write a `CallNoteTagAdmin`
  audit row with the manager's email + counts, and isolate per-rep
  Sheet failures via try/catch in the rep loop. Rename + merge
  share the same row-level transform logic; the separate endpoint
  names exist purely for audit-trail clarity ("merge" tells future
  investigators that the manager expected the target to already
  exist on some notes).
- **`uiConfirm` / `uiPrompt` replace native `window.confirm` /
  `window.prompt`.** Promise-returning helpers in `script_core.html`
  that consume the existing `.overlay` + `.modal` vocabulary so
  dialogs match the Console-redesign typography and respect dark
  mode (native dialogs render with system-light chrome regardless
  of the app's theme). API:
  `uiConfirm({title?, message?, confirmLabel?, cancelLabel?, tone?})`
  → `Promise<boolean>`;
  `uiPrompt({title?, message?, initialValue?, placeholder?,
  confirmLabel?, cancelLabel?, validator?})` → `Promise<string|null>`.
  Esc + click-outside resolve `false`/`null`; Enter on a confirm fires
  OK unless the Cancel button is focused (then it cancels); Enter inside
  the prompt input submits. `tone:'danger'` paints
  the OK button destructive (red bg via `.ui-dialog-ok.is-danger`) —
  applied to delete / archive / cancel / deny-bulk actions.
  `validator` on uiPrompt returns an error string and the dialog
  shows it inline WITHOUT closing so the rep can fix and retry —
  cleaner than the prior prompt→confirm→toast loop. A `resolved`
  sentinel inside each helper prevents double-resolution if Esc +
  click-outside fire in quick succession. All 14 native-dialog
  callsites across `tc/script_clock.html`, `tc/script_manager.html`,
  `tc/script_timeoff.html`, `cn/script_callnotes.html` are
  converted — no `window.confirm` / `window.prompt` usage remains.
  Multi-statement continuations were extracted into helpers
  (`cnDoDeleteNote_`, `cnDoToggleFlag_`, `cnDoSelfUndo_`,
  `handleBulkActionConfirmed_`) so the click-handler signatures stay
  synchronous from the dispatcher's perspective.
- **Training rides ON the Reference/KB layer (T1).** Training content is
  just KB items — no second content store, editor, or renderer. The
  tracking overlay is two auto-provisioned tabs in the KB spreadsheet
  (`TrainingAssignments`, `TrainingCompletions` — PHI-free, deployer-only
  sheet access, the KbViews posture; zero new operator state).
  Assignment targets are roster ids or `'*'` (everyone); rows are never
  deleted (revoke stamps `RevokedAt`). **Completion = a completion row
  strictly newer than the latest live assignment row**, so re-assigning
  an item resets it — annual re-certification with no extra machinery
  (an edited KB article does NOT auto-reset; re-assign if a re-read is
  required). The rep checklist's reader modal reuses the global `kbMd_`
  / Drive `/preview` and fires `kbRecordView(itemId,'training')` into
  the existing usage loop. Mark-complete is honor-system by design
  (`via='read'`; KbViews corroborates) until T2 quizzes add
  server-graded completion (`via='quiz'`). The full module phasing
  (T2 quizzes, T3 per-employee signable docs with `HR_DOCS_SS_ID` +
  roster column M team scoping) lives in
  `docs/training-employee-docs-spec.md`; operator decisions are resolved
  in its §9. See INV-120 / S67.
- **Operator feedback round (2026-06-12) — note-template ergonomics for the
  pinned pop-out workflow.** The operator runs the compact pop-out pinned
  via PowerToys "Always On Top" beside the CRM, which drove a density +
  input-flow batch on the Call Notes form: Callback/Caller/Relationship
  share one `.cnv-trio` row (labels above values; 2-up in compact);
  Issue/Resolution default to ONE line and auto-grow; every field carries a
  visible `var(--line)` border (the old transparent-until-focus styling hid
  the field boundaries); flag buttons tint their icons per type even when
  OFF; the Clear button uses the danger style (`.cn-form-clear-btn`).
  Input flow: **Enter advances to the next field** (CN_FIELD_NAV_ORDER,
  ending at the tag input; Shift+Enter = newline; Ctrl/⌘+Shift+C saves
  as of r3), and a **fresh focus selects the field's content** (Sheets-style
  overwrite — `cnSelectAllIn_`; a drag-select on the focusing click wins,
  a second click collapses to a caret). **Ctrl/⌘+Z after a save is a TRUE
  undo**: the submit path arms `CN_STATE.lastSaveUndo` (live note ref +
  restore snapshot); within 30s on an empty form, undo deletes the
  just-saved note (server 5-min delete window applies; pending notes ask
  you to retry in a second) and restores the text — the manual-Clear
  snapshot keeps precedence. **Heuristic tag suggestions**
  (`cnSuggestTagsFromText_`, Node-pinned): the rep's OWN tag vocabulary
  (from `getCallNoteTagSuggestions`) matched against Issue/Resolution
  text renders one-click chips under the tag input — the AI version is
  deliberately NOT built (it would send note text to a vendor, the exact
  INV-119 boundary; revisit only with an explicit operator privacy
  decision). **Search-term highlight** in KB results (`kbHlRegex_`
  Node-pinned + `kbHighlightTerms_`): walks TEXT NODES of the rendered
  chunks and wraps matches in `<mark class="kb-hl">` (var(--selection-bg))
  — DOM-walk, never string-level HTML surgery, so the kbMd_ escaping
  boundary stays intact. **`managerDeleteCallNote(repEmpId, noteId)`**
  (manager-gated, locked, NO time window — the rep window stays 5 min
  INV-60): the path `deleteCallNote`'s error always pointed at; surfaced
  as an audited danger button on the Team Notes per-rep card. PowerToys
  itself can't be "integrated" (it's an OS utility) — the pop-out button's
  tooltip now carries the Win+Ctrl+T tip; an in-app 8x8 queue-status
  widget would need the 8x8 realtime API (future spec, on demand).
  **Round 2 (same day):** the save card is a 2×2 quadrant grid (Save &
  Copy / Save & Compose / Open Email / Clear; kbd-chips hidden — tooltips
  carry the hints) with the **?** shortcuts button moved to a circular
  `.cn-help-fab` in the Log header, shortening the rail so the filter bar
  + notes sit higher; saved-note card action icons carry the same
  per-type tints as the form's flag toolbar; the composer's department
  chips use an adaptive `repeat(auto-fit, minmax(140px,1fr))` grid (3-up
  at default width); **Save & Compose mounts the composer overlay
  immediately with an envelope animation** (`cnShowComposerLoading_` —
  same `cn-compose-overlay` id, so the real composer replaces it on
  confirm and `cnRevertPendingSubmit_` tears it down on failure — no
  re-click ambiguity); **arrow keys hop fields at text boundaries**
  (`cnCaretAtEdge_` — Down at end → next, Up at start → previous;
  line-by-line behavior inside multi-line text is untouched); the
  Reference drawer shows an in-flight auto-search spinner
  (`kbDrawerSetSearching_`, sequence-guarded), and KB links get a
  **Docs-style hover card** (`kbLinkCardShow_` — singleton fixed div,
  URL via textContent + Copy link / Open ↗; document-level delegated
  mouseover scoped to `.kb-article`/`.kb-chunk-body`/`#kbd-body` links
  only). An interactive onboarding tour was assessed as feasible
  (coach-marks overlay + per-rep seen flag) but deferred to its own
  pass; AI auto-tagging stays deferred on the INV-119 privacy decision.
  **Round 3 (same day):** **Save & Compose is TRANSACTIONAL** — the form
  KEEPS its text while the composer is open (`opts.keepForm` +
  `CN_STATE.composeFlow`); send success completes the action (form
  clears then); cancelling/Esc-ing the composer ROLLS THE SAVE BACK
  (the just-saved note is deleted via `cnDoDeleteNote_` — server 5-min
  window — with the text still in the form; a cancel while the save is
  in flight sets `_deleteOnConfirm`, honored when the server confirms;
  the Department→External tab-switch detaches the flow first — it is
  NOT a cancel). The confirm handler also RE-POINTS held references
  (`lastSaveUndo.note` / `composeFlow.note`) at the server's confirmed
  note object — the array slot is REPLACED on confirm, so the prior
  round's undo-save held a stale pending object and reported "still
  saving" forever (fixed). **Save & Copy moved to Ctrl/⌘+Shift+C**
  (plain Ctrl/⌘+Enter unbound; Ctrl/⌘+Shift+Enter keeps Save &
  Compose; the inline-edit save keybind is untouched). Deleting a note
  shows an in-flight state (`.is-deleting` — dim + desaturate +
  breathe pulse, pointer-events off so the RPC can't double-fire; both
  the rep path and the manager per-rep path). The Review flag icon is
  now `thumbsUp` (was `star`). Loader/animation vocabulary so far:
  CSS-keyframe micro-animations only (spinner, envelope `cnEnvFly`,
  card `cnCardDeleting`, drawer `kbdSpin`) — deliberately no Lottie/
  GIF deps; new loaders should extend this set with thematic
  keyframes.
- **Onboarding tour — hand-rolled coach-marks (`script_tour.html`).** A
  spotlight overlay (`#tour-block` click-catcher + `#tour-spot` box-shadow
  ring that dims everything but the target + `#tour-pop` tooltip) walks a
  declarative `TOUR_STEPS` registry (`{tool, view, selector, title, body,
  managerOnly?}`). The engine navigates to each step's tab via `enterTool`
  then spotlights its selector. Because views render ASYNCHRONOUSLY
  (e.g. `enterCallNotesView` shows a spinner and only builds `#cn-frame`
  after its RPCs return), the engine POLLS for the target after navigating
  (`tourGoTo_`, ~1.9s) rather than checking synchronously — a sync check
  wrongly skipped every async-rendered Call Notes step and jumped managers
  straight to the closing step. Only a genuine timeout skips a step (never
  strands); `managerOnly` steps are filtered for non-managers (the
  tab-gating pattern). The tooltip fades out before each transition and
  fades back in once repositioned (`.in` opacity class) so the new text
  never flashes at the old position. Mounted on `document.body` (the
  KB-drawer lesson — Call Notes' `#view-area` re-renders would wipe it).
  **Auto-starts once per `TOUR_VERSION`** on first load (gated on
  `umsTour.seenVersion`; never in the compact pop-out, never on a
  deep-link — the `?tool=` landing is honored instead); **replayable** from
  the Call Notes ? (shortcuts) overlay via `tourStart()`. On finish/skip the
  tour **restores the rep's entry view** (`tourStart` captures `currentView`,
  `tourEnd_` re-enters it) so it doesn't strand them on the last step's tab. Bump `TOUR_VERSION` to re-offer after a material UI
  change. Adding a step = one `TOUR_STEPS` entry; a Node tripwire asserts
  every step's `view` is a registered TOOLS tab key (a tab-key rename
  can't silently orphan a step — the M3 view-key discipline). v1 covers
  Time Clock (clock hero / actions / ribbon, Time-off tab), the shell
  (sidebar / tab bar / pop-out with the PowerToys pin tip), Call Notes
  (template / flags / tags / save quadrant / filter bar / ?+drawer), and
  a managers-only closing step. Interactive gating ("now type here…") was
  deliberately deferred — the passive spotlight teaches the same things
  without fighting the optimistic re-renders.
- **Shared `mtRenderTable_` table component (`script_core.html`).** One
  config-driven `.m-table` renderer (columns + rows + sort + sticky header +
  per-cell tone) backs BOTH the Metrics Team table AND the Call Notes manager
  Stats table, so the two scannable tables can't drift in markup/escaping/
  sort behavior — the same parallel-source discipline as `mtRenderTable_`'s
  callers each `esc()`-ing their own cell strings. The earlier ad-hoc
  `mTh_` header helper was removed when the two tables were unified onto this
  component. New manager tables should reuse it rather than hand-rolling
  `<table>` markup. **Optional `opts.rowClass(r)`** (Tier 2) adds a per-`<tr>`
  class for row-tone tinting — additive/backward-compatible (callers that omit
  it render an unclassed `<tr>` exactly as before).
- **Admin sheet viewer (Tier 2 — `getAdminSheetView`).** A manager-gated
  (INV-02/31), read-only, PHI-free in-app table view of a SAFE, **allowlisted**
  tab, surfaced as the Call Notes → Admin **"Sheets"** sub-tab
  (`cnLoadSheetView_` → `cnRenderSheetView_` via the shared `mtRenderTable_` +
  the new `rowClass` tint). **The view KEY is the security boundary:**
  `adminSheetViewKeys_()` is the allowlist — a caller can only request a
  pre-vetted, column-projected, PHI-free view; PHI/payroll/HR tabs
  (Intake/Forms/per-rep Notes/Timesheet/Employees/EmpDocs, and the Quizzes
  answer key) are deliberately ABSENT (INV-32/121/122), and there is NO write
  path (read-only). v1 (2a) ships ONE view — `auditLog` (the PHI-free shared
  AuditLog, INV-32): a newest-first bounded tail scan (the
  `cnReadCallNoteAuditRows_` pattern, capped `ADMIN_VIEW_MAX_ROWS`=300), every
  row tone-flagged by the pure `adminAuditRowTone_(action)` (danger =
  purge/delete/void; warn = sync-fail/PtoReconciliationFix; info =
  reconcile/export/archive/provision/install/remove/digest; else neutral) and
  carrying a per-row `#gid=…&range=A<n>` deep-link to that exact Sheets row (the
  Tier-1 pattern, per-row). Lazy-loaded on first open of the sub-tab
  (`CN_STATE._sheetsLoaded` — no AuditLog scan on every Admin landing). Every
  server string `esc()`'d before `innerHTML`. The client `CN_SHEET_VIEWS` picker
  list is a coupling-tripwired subset of the server allowlist (a Node test
  asserts client keys ⊆ `adminSheetViewKeys_()` — the picker can't offer a view
  the server won't honor). **2b (shipped):** three more PHI-free views via the
  shared `adminSheetViewBuild_` (bounded newest-first read + per-row deep-link +
  a `rowMapper` projection) — `kb` (the KB content tab, projected to metadata
  only — NO `BodyMd` — with review-due rows warn-tinted via the pure
  `adminKbReviewTone_`, mirroring INV-126), `trainingAssign` (revoked rows
  muted), and `trainingComplete` (browse). Each view returns its own
  server-driven `legend` (auditLog tones differ from kb/training), rendered by
  the client. The Quizzes answer key (`QuestionsJson`) + all PHI/HR tabs stay
  OUT of the allowlist. Pinned by the `adminAuditRowTone_` / `adminKbReviewTone_`
  + allowlist-subset Node tests + the `getAdminSheetView` case in
  `test_managerGates_rejectNonManager`.
- **Icon library additions (`script_icons.html`).** The redesign added
  `clipboardList`, `accessibility`, `airflow`, `outbox`, and `fileText` to the
  `ICONS` set, repointed the Intake tab + sidebar icons, and switched
  `kbItemIcon_`'s article glyph to `fileText` (and `image` was later added for
  the Clock-card background picker). The dashboard-feedback batch RENAMED the
  punch glyphs to semantic names (single source of truth — `PUNCH_META` + the
  history render are the only consumers): `headset` (was `clockIn`), `coffeeMug`
  (was `lunchOut`/`lunchIn`, collapsed to one), `doorExit` (was `clockOut`).
  PUNCH_META idle icons are now `headset` (ClockIn) / `coffeeMug`
  (LunchOut+LunchIn, history) / `doorExit` (ClockOut). The `coffeeMug` glyph was
  re-drawn so the handle sits on the RIGHT with the curve facing outward, joined
  to the cup frame (the earlier mirror-to-left read wrong). Same rule as before —
  add one path-data entry to `ICONS` and pass the name to `icon()`; never inline SVG.
- **Punch-button motion (dashboard-feedback batch).** Two transform/opacity-only
  effects, both reduced-motion-safe. (1) **Tactile press/hover** on every
  `.actions .prime`/`.sec` (`styles.html`): a `:hover` `translateY(-1px)` lift +
  an `:active` `scale(.96)` press — composited, free, snapped by the global
  reduced-motion block. (2) **Lunch icon morph** (`tc/script_clock.html`): the
  IDLE glyph of the LunchOut/LunchIn buttons is the rep's CURRENT state
  (`PUNCH_MORPH[a].from` via `clkIdleGlyph_` — LunchOut idle = `headset`, LunchIn
  idle = `coffeeMug`), and on punch the in-flight loading state (in `submitPunch`,
  in place of the dots loader) cross-fades the icon to its destination
  (`clkPunchMorphHtml_`: two stacked `.cm-from`/`.cm-to` glyphs, `clkMorphOut`/
  `clkMorphIn` keyframes, .42s, holds the destination until the state re-render).
  The destination glyph EQUALS the next state's idle glyph (LunchOut→mug, then
  On-Lunch shows LunchIn idle = mug), so the morph carries seamlessly through the
  re-render. Reduced motion snaps `.cm-to` on (the partial's existing
  prefers-reduced-motion block). Other punches keep the `lo-dots` "Working…"
  loader.
- **Unified loader + motion system (2nd-pass; `styles.html` + `script_core.html`).**
  One shared CSS+helper set for loading states and purposeful micro-animations,
  spec in `docs/design_handoff_team_tools_redesign_update/loaders_and_motion.md`.
  Principles: CSS-only where possible (animate `transform`/`opacity`/
  `stroke-dashoffset`), reveals are one-shot via `animation-fill-mode:both`, and
  a single global `@media (prefers-reduced-motion: reduce)` block (already in
  `styles_design_tokens.html`) neutralizes everything — don't add a second.
  **Loaders (4 roles):** Role A glyph-pulse via `renderLoading(area, label,
  iconName)` (the optional 3rd arg shows the module glyph pulsing; 2-arg keeps
  the spinner) — pass each tool's icon (Call Notes log = `adjust`/pencil,
  history/queues = `list`, sent forms = `outbox`, Clock/Manager/Time-Off =
  `clock`, Metrics = `chart`, Training = `check`, EmpDocs = `fileText`); Role B
  `loSkeleton(n)` shimmer rows (CN list/stack loads); Role C `loSweep()`
  indeterminate bar (admin/coverage/intake panel reloads); Role D `.lo-dots`.
  **Motion:** §1 view-enter fade+rise hooked ONCE in the router (`showView` adds
  `.view-enter` on each nav — optimistic re-renders call render fns directly so
  they're unaffected); a shared `MOTION_IO` IntersectionObserver +
  `observeReveals(container)` re-fires `.js-anim` on scroll-in; §6 settle
  (`settleRow_(row, labelSel, {dim,check,transient})` + `unsettleRow_` — dim +
  strike + drawn check, wired at Training mark-complete (persistent), CN flag
  resolve (transient, in the SUCCESS handler so the optimistic re-render can't
  clobber it, INV-48/56 revert untouched), and PPD status (accept→check,
  reject→dim)); §7 `.popping` + `flashCopied()` (flag/chip pop, copy-button
  flash); §3 `.ring-arc` (`--circ`/`--target` inline) on Training + Clock rings;
  §4 `.spark` (`--len` inline) on Metrics sparklines; §5 `.hm` (`--d` inline)
  coverage-heatmap stagger; §8 `.kb-dept-body` / `.cn-qa-cards` max-height
  accordion (KB dept toggles its class LIVE now, not a re-render, so it can
  animate); §10 two stacked `.sky-layer`s cross-fade the Clock big-clock card
  (CSS can't transition between two gradients). Overlay/modal entrance was
  already handled by `.overlay.open` (fadein) + `.modal` (modalin) + the
  `#kb-drawer` slide — NOT re-declared. Inline animation params
  (`--circ/--target/--len/--d`) carry defaults so the INV-128 token tripwire
  stays green. New tools should reuse `renderLoading` + these classes rather
  than hand-rolling spinners/animations.

Items identified during the V1–V4 + Round 2 redesign work that
were intentionally deferred. The redesign itself is complete; these
are polish/expansion items captured here so the next session can
pick them up without re-deriving the context.

- **Tag-suggestion autocomplete on the Log view.** *(Implemented, B3.)*
  The Log-view tag input (`#cn-tag-input`) carries a `<datalist>`
  (`#cn-tag-suggestions`) populated on view enter by `cnLoadTagSuggestions_`
  → `getCallNoteTagSuggestions` (rep-callable, caller-scoped, read-only): a
  column-bounded read of the caller's own `SubformData` column that returns
  their unique, non-archived (`getArchivedTagsSet_`) tags. Cross-rep / shared-
  vocabulary suggestions were intentionally left out (the manager taxonomy
  aggregate is the expensive, manager-gated path); own-history keeps it cheap
  and leak-free. A future enhancement could surface team-wide active tags via
  a short-TTL cached cross-rep variant.

## Operator State Checklist

### Spreadsheet / storage map (one-screen reference)

Seven distinct spreadsheets, split deliberately along PHI / payroll / HR /
PHI-free / external lines and by retention policy — **consolidation is NOT
advised** (the boundaries are the point); manage them as a set instead. The
manager **Call Notes → Admin → Storage Health** panel (`getStorageHealth`)
shows each store's configured / reachable / **tz-vs-CONFIG** status live — the
one-pane-of-glass for this table. Keep all seven in one Drive folder for sanity.

| Store | Script Property (fallback) | Tabs | Class | Retention | Resolver |
|-------|----------------------------|------|-------|-----------|----------|
| Time Clock / ADP | `ADP_SS_ID` (CONFIG placeholder) | Employees (roster), Timesheet, TimeOffRequests, AuditLog, PunchAdjustRequests | Payroll + shared audit | kept | `getAdpSS_` |
| CDR Report | `CDR_SS_ID` (CONFIG placeholder) | DQE Historical Data, CSR Transfer Historical Data, Agent Alias Overrides | External (read-only) | owned by `call-data-reporting` | `getCdrSS_` |
| Intake | `INTAKE_SS_ID` (CONFIG placeholder) | Offerings, PPD/PMD/PAPSubmissions | **PHI** | optional purge | `getIntakeSS_` |
| Forms | `FORMS_SS_ID` (**falls back to the ADP sheet**) | FormTokens, FormSubmissions | **PHI** | 90-day purge (if enabled) | `getFormsSS_` |
| Knowledge Base + Training | `KB_SS_ID` (CONFIG placeholder) | KB, KbViews, TrainingAssignments, TrainingCompletions, Quizzes, QuizAttempts | PHI-free by policy | kept | `getKbSS_` |
| Employee Docs (HR) | `HR_DOCS_SS_ID` (**no fallback**) | EmpDocs, DocSignatures, EmpDocTemplates, Coaching | HR — keep-forever | **never purged** (INV-122/INV-134) | `getHrDocsSS_` |
| Call Notes (per-rep) | `Employees` col L (`CallNotesSheetId`) | Notes, NotesArchive (cold tier) — one Sheet **per rep** | **PHI** | optional archive + optional purge (live + cold) | `getCallNotesSheet_` |

**Every store's timezone MUST equal `CONFIG.TIMEZONE`** (coerced date/time reads
drift otherwise — the S1.1 tripwire `config_adpSheetTzMatchesConfig` enforces it
for the ADP sheet; Storage Health surfaces it for all). **Recommended
consolidation (the only one):** set `FORMS_SS_ID` to the Intake spreadsheet so
form PHI isn't co-located with the ADP/payroll sheet (the back-compat fallback).
Test-only twins: `TEST_CDR_SS_ID`, `TEST_INTAKE_SS_ID`, `TEST_HRDOCS_SS_ID`.

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:

- **The 2026-06 redesign + deferred follow-ons #1–#4 + niceties #8–#10
  add NO new operator state** — no new Script Properties, no new triggers,
  no migrations. The new endpoints (`getMyMetricsRange`,
  `getMyNoteHourBuckets`) read existing stores. It deploys with the normal
  single `clasp push -f` + New version. The redesign record (per-commit
  scope, before/after) is
  `docs/design_handoff_team_tools_redesign/IMPLEMENTATION_PLAN.md`.
- **The 2nd-pass design batch (pop-up fixes, email styling, loader + motion
  system, Admin consolidation, §6 settle) ALSO adds no new operator state** —
  no Script Properties, triggers, or migrations; client CSS/JS + `Code.js`
  email-builder restyle only. Deploys with the same single `clasp push -f` +
  New version. **Post-deploy spot-check the emails** (Call Note + PPD) — the
  HTML-email restyle can't be verified in CI. The 2nd-pass spec lives in
  `docs/design_handoff_team_tools_redesign_update/` (`loaders_and_motion.md`,
  `email_styling.md`, `popups_addendum.md`).
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
  The CDR spreadsheet's `Agent Alias Overrides` sheet (if present)
  is read by `getCdrNameMap_()` to resolve name mismatches between
  the team-tools Employees roster and CDR canonical names.
  The My Stats **Transfer %** trend additionally reads a
  **`CSR Transfer Historical Data`** tab in this same spreadsheet
  (headers A1:S1: Month-Year, Week, Date `M/D/YYYY`, CSR Rep Name,
  Transfer %, Total Calls, Total Calls Transferred, per-queue `A_Q_*`,
  Comments — read via `getCsrTransferPerRepDaily_`). Missing tab → the
  Transfer trend is simply absent (other KPIs unaffected).
- **Script Property `TEST_CDR_SS_ID`** (test-only, auto-managed). The
  CDR fixture spreadsheet `setupTestEnvironment` / `_setupTestCdrFixture_`
  creates (or reuses) for the Metrics integration tests. Created on
  first `runAllTests`; not used in production. Documented here so it's
  recognizable when inspecting Script Properties.
- **Set Script Property `INTAKE_SS_ID`** to the Intake spreadsheet ID
  (the one Robin already used for the bound form-generator). `getIntakeSS_()`
  reads it before CONFIG; without it the Intake tool fails on first form
  preview/send. The deployer account must have **edit** access (it provisions
  submission tabs and reads Offerings). That spreadsheet must contain:
  (a) an **`Offerings` tab** with columns **A–F = features, HCPCS,
  weight-capacity (`"300"` or `"300-450"`), seatType (text containing `s`
  for solid / `c` for captain), pdfLink, imageUrl** — the PPD engine reads
  `A2:F` via `getIntakeOfferings_()`; a column-order change silently breaks
  recommendations. **Columns E (pdfLink) + F (imageUrl) must be populated with
  real URLs** (e.g. the brochure-PDF + device-image URLs from the marketing/image
  repo) — the PPD result cards make the device IMAGE clickable/openable (agent
  copies/saves it to text the patient, via `intakeCopyImage_` / `intakeCopyLink_`)
  and the HCPCS **code a link to the brochure** (pdfLink); blank E/F → no
  image/brochure shows. The `PPDSubmissions` / `PMDSubmissions` / `PAPSubmissions`
  PHI tabs auto-provision on first send (`getIntakeSubmissionSheet_`).
- **Intake recipient addresses are Script-Property-backed.**
  `INTAKE_SALES_EMAIL` (PMD default), `INTAKE_SLEEP_EMAIL` (PAP default),
  `INTAKE_BCC_EMAIL` (BCC on every intake email), and
  `INTAKE_ALL_AGENTS_EMAIL` (PPD "All Agents") read Script Properties first,
  falling back to the placeholders in `CONFIG.INTAKE`. Agent recipients are
  resolved from the Employees roster (name→email at send via
  `intakeResolveRecipient_`), so agent addresses never reach the client and
  no domain is hardcoded. Set the four addresses once; no redeploy.
- **Script Property `TEST_INTAKE_SS_ID`** (test-only, auto-managed). The
  Intake fixture spreadsheet `setupTestEnvironment` / `_setupTestIntakeFixture_`
  creates (or reuses) for the Intake endpoint integration tests — an
  `Offerings` tab with two catalog rows (K0823 captain + K0861 Group-3
  solid). `getIntakeSS_()` honors the `_TEST_OVERRIDE_INTAKE_SS_ID` global
  (set via `_withTestIntake_`, which also resets the per-execution
  `_intakeOfferingsCache`); the pure engine tests need no spreadsheet.
  Created on first `runAllTests`; not used in production. Documented here
  so it's recognizable when inspecting Script Properties.
- **Set Script Property `KB_SS_ID`** to a dedicated Knowledge-Base spreadsheet
  for the Reference tool (`getKbSS_()` reads it before `CONFIG.KB.SS_ID`). The
  `KB` tab auto-provisions on first use (`getOrCreateKbSheet_`, headers
  `KB_HEADERS`). The deploying account needs **edit** access; reps never open it
  (they read via `getReferenceTree`/`getReferenceItem`/`searchReference`). Keep
  it a **separate** spreadsheet from the PHI intake/forms sheets — the KB is
  broadly rep-readable and PHI-free by policy. (`_TEST_OVERRIDE_KB_SS_ID` is the
  test override.) A **`KbViews` tab** also auto-provisions in this spreadsheet
  on the first article open (`getOrCreateKbViewsSheet_`) — the append-only,
  PHI-free usage log behind the manager "Most referenced · 30d" block
  (INV-117). It grows one tiny row per open with no purge yet; the stats scan
  is bounded (last 4000 rows) so growth never slows reads — trim it manually
  if it ever bothers you.
- **Script Property `KB_IMAGES_FOLDER_ID`** (auto-managed, Phase 2b). The
  deployer-owned "KB Images" Drive folder that converted-article images
  export into on save. Auto-provisioned on the first image-bearing save:
  created in the deployer's Drive, set domain-link-viewable (so `<img>`
  tags render for any signed-in rep), id stored here. If Workspace policy
  blocks link sharing, the create still succeeds with a console warning —
  share the folder with the team manually or images render only as their
  alt text + open-in-Drive link. Exported files are named
  `kbdoc-<fileId>-<n>` and are REUSED on re-save; delete a file to force a
  re-export after the source Doc's image changed. Phase 3 paste-uploads
  land in the same folder as `kbpaste-<stamp>-<rand>` files (orphans from
  never-saved pastes accumulate — trim manually). The first export also
  adds the Drive OAuth scope alongside the Docs scope — the deploying
  account may be prompted to re-authorize once.
- **Quiz import from Google Forms requires the Google Forms OAuth scope.**
  `importQuizFromForm` (Team Training → New quiz → "Import from Google
  Forms") is the project's first `FormApp` call, so the deploy that ships it
  adds the `forms` scope to the auto-detected set. The DEPLOYING account must
  re-authorize once (the editor prompts on the next run / deploy — accept the
  new scope) AND must have at least view access to any form it imports
  (FormApp opens it with the deployer's access, same trust boundary as the
  Doc converter). It reads MULTIPLE_CHOICE + single-answer CHECKBOX items and
  their marked correct answers; other item types are skipped with a warning.
  READ-ONLY + review-before-save — the form is never modified and nothing
  persists until the manager clicks Save quiz. Paste the form's EDIT url
  (`/forms/d/<id>/edit`); the published `/forms/d/e/<id>/viewform` link is
  rejected with a hint (its id is the response endpoint, not openable).
- **KB Phase 2 converter requires the Google Docs OAuth scope.**
  `kbConvertDriveDoc` is the project's first `DocumentApp` call, so the deploy
  that ships it adds the `documents` scope to the auto-detected scope set. The
  DEPLOYING account must re-authorize once (the editor prompts on the next run
  / deploy — accept the new scope) or every conversion fails with an auth
  error. The converter reads Docs with the deployer's access, the same trust
  boundary as embedding them.
- **Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card
  (Phase A).** An Anthropic API key (console.anthropic.com); without it,
  `kbGetFacetGuidance` silently returns `{none}` even with the `kbAiGuidance`
  feature flag on. The key is deliberately NOT settable or readable through
  any endpoint — editor-only, same posture as `ADP_SS_ID`. Also set a **hard
  spend cap in the Anthropic console** as the backstop behind the app's soft
  daily cap. Then flip the `kbAiGuidance` feature toggle (Admin tab; default
  OFF, danger confirm names the external vendor) — INV-119 documents the
  privacy boundary (whitelisted enum facets + own KB excerpts only).
- **Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`** (Admin-managed).
  Written by the Call Notes → Admin → "AI Guidance (Reference)" section
  (`saveKbAiSettings`, manager-gated). Defaults when unset: $3/day org-wide,
  `claude-haiku-4-5`. The model must be a `KB_AI_MODEL_PRICES` key (Code.js)
  so spend accounting always has real rates — adding a new model option means
  adding its $/MTok rates there and redeploying.
- **Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`** (auto-managed).
  The guidance-cache generation salt (bumped by every KB save/delete via
  `invalidateKbCache_`) and the `{date, usd, calls}` daily spend counter.
  No manual setup — documented so they're recognizable when inspecting
  Script Properties. Delete `KB_AI_SPEND` to reset today's budget; bump
  `KB_AI_GENERATION` to force-invalidate all cached guidance.
- **`CDR_ALERT_THRESHOLD`** in CONFIG (default 85) sets the
  % Answered cutoff for the Metrics sidebar alert badge. Below
  this value, `getMetricsAmbient()` returns a warn badge showing
  yesterday's team answer rate. Tunable without a redeploy by
  editing CONFIG (no Script Property equivalent yet).
- **Set Script Property `MANAGER_EMAILS`** to a comma-separated list
  (e.g. `alice@umsupply.com,bob@umsupply.com`). `getManagerEmails_()`
  reads this before CONFIG; without it, no one passes the
  `isManager` check and manager features stay locked out.
- **Script Property `ADMIN_EMAILS`** (optional) — comma-separated list of the
  above-manager **admin tier** (the Manage module's Admin tab). `getAdminEmails_()`
  reads it; **UNSET/empty falls back to `MANAGER_EMAILS`** so a fresh deploy never
  hides Admin from the deployer, and **SET narrows** Admin to exactly that list
  (admins are a SUBSET of managers — an admin always passes `isManager`). Drives
  `empState.isAdmin` → the `adminOnly` tab gate. **To restrict the Admin tab to
  just yourself, set `ADMIN_EMAILS=you@umsupply.com`** (otherwise every manager
  keeps Admin access). No redeploy needed to change it. This gates the Admin tab
  CLIENT-side AND the 25 Admin config/system endpoints SERVER-side (`emp.isAdmin`,
  `'Admin access required.'` — INV-136). Because unset ⇒ admin == manager, a
  fresh deploy and the test suite behave exactly as before; setting it narrows
  both surfaces at once. Make sure YOUR email is in the list before setting it.
- **Punctuality tracking (Manage module tab).** `getPunctualityReport(from,
  to)` (manager-gated, read-only, PHI-free) backs the managerOnly **Manage →
  Punctuality** tab (moved from Time Clock into the Manage module; tab key
  `punctuality` unchanged). Per rep over the range it compares the first `ClockIn`
  against the rep's scheduled start (`getShiftSchedule_(tz).startMin`, resolved in
  the rep's own tz) and flags a late start when it exceeds
  `CONFIG.PUNCTUALITY_GRACE_MIN` (default 5), plus a lunch-adherence pass;
  least-punctual reps sort first. CONFIG-only (`PUNCTUALITY_GRACE_MIN`; no Script
  Property) — redeploy to change. Reuses the per-tz shift (no per-rep schedule,
  the INV-127 limitation).
- **Coverage planner is business-hours/weekday scoped.** `getCoveragePlan` now
  returns a per-day `closed` flag plus `businessStartHour` / `businessEndHour` /
  `weekdaysOnly`, driven by CONFIG `COVERAGE_BUSINESS_START_HOUR` (8) /
  `COVERAGE_BUSINESS_END_HOUR` (17) / `COVERAGE_WEEKDAYS_ONLY` (true). Understaffed
  flags fire only inside the business-hours window; weekends (when
  `weekdaysOnly`) render as closed rather than as understaffed. CONFIG-only —
  redeploy to change. Refines INV-127's flagging (the `< COVERAGE_MIN_STAFF`
  rule still applies, now only within business hours).
- **Spanish-inbox tracking (Gmail) needs 3 things.** The Metrics → **Spanish
  Inbox** tab (`getSpanishInboxStats`, manager-gated, read-only, 5-min cached)
  scans the **deploying account's** Gmail for threads addressed to the group
  inbox and times first-inbound → first-reply-from-a-member. To work:
  (1) the **deploying account must be a member** of the group
  `spanishcalls@universalmedsupply.com` (so its mailbox receives the threads);
  (2) set Script Property **`SPANISH_INBOX_MEMBERS`** to a comma-separated list
  of the bilingual group members' emails — "resolved" = first reply from one of
  them (with no list it falls back to "first reply from anyone but the
  requester"). **As of the Dashboard work this property ALSO GATES FEATURE
  ACCESS:** `canSeeSpanishInbox_(emp)` = `isManager OR email ∈
  SPANISH_INBOX_MEMBERS`, and the four Spanish endpoints now gate on THAT
  (not pure-manager — INV-31 amendment), so the bilingual reps get the full
  Spanish Inbox tab + dashboard card. **It must be populated** for Spanish reps
  to gain access (an empty property = managers only). The web app runs as the
  deployer, so a Spanish rep reads the deployer's Gmail through the server
  (they need no Gmail access of their own); (3) the deploy that ships `GmailApp` **adds the Gmail OAuth
  scope** (auto-detected — `appsscript.json` has no explicit `oauthScopes`), so
  the deployer **re-authorizes once** on the next deploy/run. The address
  defaults to `CONFIG.SPANISH_INBOX_ADDRESS` (Script Property
  `SPANISH_INBOX_ADDRESS` overrides). PHI-free: the tab returns counts +
  durations + requester email + age only — never subject/body. A scoping note +
  the "what else is possible" generalization live in
  `docs/spanish-inbox-tracking-scope.md`. **Part A — pending-as-tasks:**
  `getSpanishInboxPending(days)` (manager-gated, live-read, never stored beyond
  the request) returns the open/unresponded threads with `{threadId, requester,
  ageHours, subject, snippet, permalink}`; `getSpanishInboxThreadBody(threadId)`
  (scope-guarded — verifies the thread's first message is addressed to the inbox
  before returning a body slice) backs the per-card "Show full request" expand.
  The body surfaces request content in-app (it may reference a patient/call), so
  it is deliberately manager-gated + live-read-only + "Open in Gmail" as the
  primary action — bodies are never written to a sheet or cache.
- **Inter-department request tracking (`DeptRequests` / Part B).** Tracking is
  **AUTOMATIC**: every department email an agent sends from Call Notes
  (`emailFromCallNote`) auto-logs a PHI-free `DeptRequests` row AND appends a
  **"✓ Mark this request resolved"** link (`drResolveCtaHtml_`) to the SENT email
  body — added AFTER the INV-41 preview-hash check, so the hash contract is
  untouched. The row carries the dept label + the update CATEGORY only
  (`selections.updateInfo`) + the source `noteId` (col `NOTE_ID`, a back-compat
  trailing add); the subject (patient/TRX) and note content never enter it. The
  auto-log is best-effort (try/catch, like the other post-send stamps — never
  fails the send). **Re-send dedup (A5):** before sending, `drFindOpenRequest_`
  (bounded tail, the `DR_MAX_SCAN` philosophy) looks up an OPEN row for this
  `(noteId, deptLabel)`; if found it REUSES that row's token in the SENT email's
  resolve CTA and SKIPS the append (the audit row is annotated `resend`), so
  re-sending the same note to the same dept re-notifies without opening a second
  request. Legacy rows (no `noteId`) never dedupe; the lookup failing-open mints a
  fresh token. **Two resolve paths:** (1) the receiver
  (internal `@umsupply.com`) clicks the email link → `doGet`'s `?resolve=`
  branch → `serveResolvePage_` → `markDeptRequestResolved_` (locked,
  **idempotent**; requires a signed-in `getActiveUserEmail_` so it's attributed);
  (2) the **sender or a manager** clicks "Mark resolved" in-app →
  `resolveDeptRequest(requestId)` (rep-callable, owner-or-manager-checked) — for
  when the recipient replied "done" without clicking. The surface is the
  rep-visible **Metrics → Dept Requests** tab (`metricsDeptReq` →
  `enterDeptRequestsView`, read-only list + resolve buttons): `getDeptRequests`
  (rep-callable) returns the caller's own requests (open/resolved + elapsed);
  managers ALSO get a per-department resolution-time aggregate (`deptStats`
  open/resolved/avg/median) + oldest-open team list. (The legacy standalone
  `sendDeptRequest` composer endpoint was REMOVED — it had no caller; auto-tracking
  replaced the manual compose tab.) **Store:**
  optional Script Property **`DEPT_REQUESTS_SS_ID`** (a dedicated PHI-free sheet);
  falls back to the ADP sheet (the store is PHI-free — subject/message ride in
  the email only, never stored; the row keeps a short non-PHI `label`). The
  **`ToEmail` column stores recipient DOMAIN(s) only** (`drRecipientDomains_`),
  never the raw address: the `'Other'` department lets a rep enter a free-text
  external/customer email and the store can fall back to the payroll sheet, so
  this mirrors the `ExternalEmailSent` domain-only minimization above; the column
  is **write-only** (never read back by any endpoint), so domain-only loses no
  function. **A
  dedicated sheet's tz MUST equal `CONFIG.TIMEZONE`** (not surfaced by Storage
  Health yet) — `CreatedAt`/`ResolvedAt` are written in the ISO `'T'` form
  (`drNowTs_`) so Sheets keeps them as strings and `parseTimestampMs_` matches;
  a drifted sheet tz would skew the elapsed/resolution-time math. No new
  OAuth scope (MailApp already used). Audit rows `DeptRequestSent` /
  `DeptRequestResolved` (reqId + dept only). **Resolution offers both the
  email-link path AND an in-app button** because the roster has no per-employee
  department column (only the `DEPARTMENT_EMAILS` name→email map), so the app
  can't route a true per-department incoming inbox. **Roadmap (v2, not built):**
  an in-app per-department incoming-requests inbox (needs a roster department
  column or a dept-membership map), stale-open reminder digests, per-dept SLA
  targets. See
  `docs/email-request-tracking-plan.md`.
- **External fillable-form links must be the canonical anonymous `/exec` URL.**
  Inside a Google Workspace, `ScriptApp.getService().getUrl()` returns the
  **domain-scoped** form `https://script.google.com/a/<domain>/macros/s/<id>/exec`
  — the `/a/<domain>/` prefix routes through org login, so an external recipient
  (personal Gmail / customer) is blocked with a Drive "Sorry, unable to open the
  file at this time" error (works only for `@<domain>` accounts). `buildFormUrl_`
  runs the base through `normalizeWebAppExecUrl_`, which **strips `/a/<domain>/`**
  and rewrites a trailing `/dev`→`/exec` (pinned by the `normalizeWebAppExecUrl_`
  Node tests). Optionally set Script Property **`WEB_APP_URL`** to the published
  `/exec` URL to override the resolved base entirely. Also confirm the
  deployment's **"Who has access" = "Anyone"** (matches `appsscript.json`'s
  `ANYONE_ANONYMOUS`) — a domain-restricted deployment blocks externals even on
  the stripped URL. Always test an external form link from an incognito window or
  a non-Google email, never from the editor's dev URL.
- **External anonymous web-app access is BLOCKED by Workspace admin policy on
  this domain — the `?form=<token>` fillable-form route is non-functional for
  external recipients.** Confirmed on `universalmedsupply.com`: the deployment's
  "Who has access" dropdown offers only "Only myself" and "Anyone within
  Universal Medical Supply" — **not "Anyone"** — so `appsscript.json`'s
  `ANYONE_ANONYMOUS` silently downgrades to domain-only and Google issues the
  `/a/<domain>/` URL. A customer / personal-Gmail recipient therefore CANNOT open
  a form link (Drive "unable to open the file" error), and **no code change can
  fix this** — it needs the Workspace admin to allow anonymous web-app access (or
  allowlist this app), the same ticket-driven path that blocks Marketplace
  add-ons. **Scope:** this affects ONLY the external `?form` route; every
  internal tool (Time Clock, Call Notes, Metrics, the rep-filled Intake forms)
  works fine because reps are authenticated `@umsupply.com` users, and the
  forms-hardening (hash/consent/segregation) still stands — it just can't be
  exercised externally until the block is lifted. **Workaround for surveys /
  feedback / review requests** (low/no-PHI): host them on an external SaaS
  (Typeform / Jotform / Google Forms if its separate external-response policy
  allows) or send a direct Google-review link, and surface them via the
  manager-curated **Quick Links** picker in the external-email composer
  (`CN_EXTERNAL_LINKS`, below). Do NOT re-file the external-form block as a code
  bug — it's an environmental/admin constraint.
- **`Employees` sheet column K = `PtoEnabled`** — added in the
  current schema; existing sheets must have this column added
  (header row 1, leave blank for back-compat = enabled, write
  `FALSE` for contractors). `setupTestEnvironment()` auto-writes
  the header on test runs if missing, but production rows still
  need it set manually.
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. The
  installer now wires eleven triggers:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm)
    - `sendCallNotesEodDigest` (call-notes, hourly — emails each rep at their local EOD hour)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am)
    - `sendCallNotesUrgentDigest` (call-notes, daily manager-tz 8am — recent urgent-flagged notes; sends nothing when none)
    - `purgeArchivedCallNotes` (call-notes, daily manager-tz 2am — 3rd tier: irreversibly deletes `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS`; the ONLY deleter of archived notes; read-only re tab existence; no-ops while archive retention is disabled)
    - `purgeExpiredFormData` (forms, daily manager-tz 3am — no-ops while retention is disabled)
    - `archiveOldCallNotes` (call-notes, daily manager-tz 3am — SAFE cold-archive tier: moves notes older than `CN_NOTE_ARCHIVE_DAYS` to a `NotesArchive` tab in the same per-rep Sheet, data preserved; runs BEFORE the 4am purge so archive-first ordering holds; no-ops while archival is disabled)
    - `purgeOldCallNotes` (call-notes, daily manager-tz 4am — no-ops while note retention is disabled)
    - `reconcileCallNotes` (call-notes, daily manager-tz 5am — two-way Sheets back-fill of NoteId/Timestamp/DateLocal on rows added directly in a rep's Sheet; non-destructive + idempotent, so it's harmless to run daily)
    - `sendTrainingOverdueDigest` (training, daily manager-tz 7am — per-manager nudge of overdue training (org-wide) + overdue unsigned employee docs (team-scoped per INV-122); sends nothing to a manager with nothing overdue in their scope)
  The install + remove TARGETS arrays both list all eleven, so re-running
  install dedupes cleanly (a missing entry would silently duplicate that
  trigger on the next install). Triggers do not survive an Apps Script project re-clone. After
  install, `installAutomationTriggers` emails `MANAGER_EMAILS` a
  reminder about the cross-account trigger-ownership pitfall: Apps
  Script's `ScriptApp.getProjectTriggers()` only returns triggers
  owned by the current user, so duplicates from a previous installer
  are invisible to a fresh run. If a different account ever
  installed these triggers before, have that account run
  `removeAutomationTriggers()` first.
- **Call-notes retention is OFF by default.** `purgeOldCallNotes`
  (daily manager-tz 4am trigger) deletes per-rep `Notes` rows whose
  `DateLocal` is older than `CN_NOTE_RETENTION_DAYS` — Script Property
  first, then `CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS` (default **0 =
  disabled**, nothing is ever deleted). The delete is **irreversible**
  and the notes are PHI — confirm the canonical record lives elsewhere
  before enabling. Cross-rep (walks every enrolled rep's Sheet); a broken
  Sheet is skipped, not fatal. Writes a PHI-free `CallNotesPurge` audit
  row with counts. No redeploy needed to change the window, but installing
  the trigger requires `installAutomationTriggers()`.
- **Call-notes cold-archive is the SAFE retention tier (also OFF by
  default).** `archiveOldCallNotes` (daily manager-tz 3am trigger) **moves**
  per-rep `Notes` rows older than `CN_NOTE_ARCHIVE_DAYS` — Script Property
  first, then `CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS` (default **0 =
  disabled**) — into a `NotesArchive` tab (`CONFIG.CALL_NOTES.ARCHIVE_TAB`)
  in the SAME per-rep spreadsheet, then deletes them from the live `Notes`
  tab. **Data is preserved** (the canonical record stays in `NotesArchive`),
  the live tab is bounded (faster open-ended scans), and **no new operator
  store** is needed. Append-then-delete with a `flush()` between, so a
  mid-run failure can only DUPLICATE into the cold archive (never lose).
  Cross-rep; a broken Sheet is skipped; PHI-free `CallNotesArchive` audit
  row. **Archived notes are intentionally NOT in-app-searchable** (all
  readers go through `getCallNotesSheet_`→`NOTES_TAB`); `purgeOldCallNotes`
  never touches `NotesArchive` (a true cold store). **RECOMMENDED SAFE
  SETUP:** enable archive (`CN_NOTE_ARCHIVE_DAYS > 0`) and leave
  `CN_NOTE_RETENTION_DAYS` at 0 — bounded live tab, full history retained.
  If you enable BOTH, keep `CN_NOTE_ARCHIVE_DAYS ≤ CN_NOTE_RETENTION_DAYS`
  (the 3am archive runs before the 4am purge — the safe path is
  archive-first; the reverse can irreversibly delete rows the archive hasn't
  reached yet). No redeploy to change the window, but installing the trigger
  requires `installAutomationTriggers()`.
- **Call-notes 3rd-tier cold-store purge (also OFF by default).**
  `purgeArchivedCallNotes` (daily manager-tz 2am trigger — BEFORE the 3am
  archive) irreversibly deletes `NotesArchive` rows older than
  `CN_ARCHIVE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS`,
  default **0 = disabled**) — the ONLY mechanism that deletes archived notes
  (`archiveOldCallNotes` MOVES into the archive; `purgeOldCallNotes` never
  touches it). READ-ONLY w.r.t. tab existence (a rep with no `NotesArchive` is
  skipped — never created here). The archived row keeps its original
  `DateLocal`, so the window is measured from the note's original date. Keep
  `CN_ARCHIVE_RETENTION_DAYS ≥ CN_NOTE_ARCHIVE_DAYS` (the cold-store lifetime is
  longer than the move window). PHI-free `CallNotesArchivePurge` audit row; in
  `AUTOMATION_AUDIT_ACTIONS` so Automation Health surfaces last-run. This
  completes the 3-tier retention model: **archive** (move, safe) → **purge live**
  (delete from `Notes`) → **purge cold** (delete from `NotesArchive`).
- **Include-archive search.** `searchMyCallNotes` and `managerSearchCallNotes`
  take an `includeArchive` flag (default off — back-compat: existing 4-arg
  callers like `getPatientTimeline` are unaffected); when true they ALSO scan the
  cold `NotesArchive` tab (read-only `getSheetByName`, never creates it) and tag
  hits `_archived`. The client renders a read-only **"Include archived"** checkbox
  on both the rep and manager Search bars (`CN_STATE.searchIncludeArchive` /
  `mgrSearchIncludeArchive`) and an "archived" pill on archived hits. The
  field-scope match logic (INV-45 phone/trx/caller/issue/all) is byte-identical —
  factored into a per-source closure and applied to the extra source.
- **Admin "Retention" panel (Config sub-tab).** Manager-gated editor for the
  three windows: `getRetentionConfig` (read-only — each window's resolved value +
  source (`Script Property` / `CONFIG` / `default`) + safety-ordering warnings via
  the pure, Node-pinned `retentionWarnings_(archive, purge, archivePurge)`) and
  `saveRetentionConfig` (writes the three Script Properties, whole-days
  validation, `AdminConfigChange` audit — INV-57 family). The client
  (`cnLoadRetentionPanel_`) surfaces current values + the recommended SAFE setup +
  inline warnings, and **danger-confirms** (uiConfirm) only when a manager
  ENABLES or RAISES one of the two irreversible purge windows. Takes effect on the
  next nightly run (re-run `installAutomationTriggers()` once if not yet done).
- **Form-data retention is OFF by default.** `purgeExpiredFormData`
  (daily trigger) deletes `FormSubmissions` (responses + signatures) and
  `FormTokens` (recipient + prefill data) rows older than
  `FORM_DATA_RETENTION_DAYS` — Script Property first, then
  `CONFIG.FORM_DATA_RETENTION_DAYS` (default **0 = disabled**, nothing is
  ever deleted). To enable PHI minimization, set Script Property
  `FORM_DATA_RETENTION_DAYS` to a positive day count that matches your
  record-retention obligations (the purge is **irreversible**; an
  unparseable/blank date is never deleted — fail-safe). No redeploy needed
  to change the value, but installing the trigger requires
  `installAutomationTriggers()`. Each purge writes a PHI-free
  `FormDataPurge` audit row with the counts removed. The canonical record
  of an order typically lives in the downstream order system, not these
  collection sheets — confirm before choosing a window. **This deployment runs
  a 90-day window** — set Script Property `FORM_DATA_RETENTION_DAYS=90` (the
  committed CONFIG stays `0` so a fork/fresh deploy never auto-deletes) and
  ensure the `purgeExpiredFormData` trigger is installed.
- **Forms PHI store — set `FORMS_SS_ID` to segregate (forms-hardening).** By
  default `getFormsSS_()` falls back to the ADP/payroll spreadsheet (back-compat),
  co-locating form PHI with timesheet data. To segregate (recommended), set
  Script Property **`FORMS_SS_ID` to the `INTAKE_SS_ID` spreadsheet** and **one-
  time migrate** the existing `FormTokens` + `FormSubmissions` tabs into it (move
  the tabs, or copy rows — in-flight `pending` tokens live in `FormTokens`, so
  migrate while no forms are mid-flight, or accept that older pending links break).
  Fresh `FormSubmissions` tabs in the new location get the full 11-column
  `FS_HEADERS`; existing rows migrated from the ADP sheet keep their 6 columns
  (no hash/consent/certificate — `verify` reports them as legacy). The deployer
  account needs edit access to whatever `FORMS_SS_ID` points at (it already does
  for `INTAKE_SS_ID`).
- **`FORM_CONSENT_VERSION` in CONFIG** stamps every form submission with the
  Privacy-Notice version the signer saw (server-authoritative — the client's
  reported version is ignored). **Bump it whenever the consent copy in
  `form_public.html` changes** so stored submissions prove which language was
  shown. Change requires a redeploy (CONFIG, no Script Property override).
- **`MANAGER_TIMEZONE`** in CONFIG drives manager-dashboard
  display tz; change requires a redeploy.
- **Timezone model — three distinct concepts, don't conflate them.**
  (1) **`CONFIG.TIMEZONE`** (currently `Asia/Kolkata`) is the **storage /
  coercion** tz, NOT a business anchor: shared bookkeeping (AuditLog
  timestamps, `TO.SUBMITTED_AT`, `DateLocal`) is written in it, and **every
  spreadsheet's own tz MUST equal it** because the coercion-recovery helpers
  (`normalizeDate_`/`normalizeAuditTs_`/`trainCellDate_`) format coerced Date
  cells in the *sheet's* tz while the writers use `CONFIG.TIMEZONE` — the
  round-trip only holds when they match (the `config_adpSheetTzMatchesConfig`
  S1.1 tripwire pins this for the ADP sheet; Storage Health surfaces it for all
  seven). **Both the tripwire and Storage Health compare via `tzEquivalent_`
  (alias-aware): Google Sheets stores GMT+5:30 as the legacy `Asia/Calcutta`,
  which is functionally identical to CONFIG's `Asia/Kolkata` (same offset, no
  DST) — `Utilities.formatDate` treats them the same, so an alias passes; only a
  genuinely different zone (e.g. `America/Los_Angeles`) fails.** It can be ANY tz
  as long as the sheets match it. (2)
  **`MANAGER_TIMEZONE`** (`America/Chicago`) is the **manager display/automation
  anchor** — dashboard punch display, digest trigger hours, Coverage planner,
  exports, audit-panel default dates all use it. So CST is already the operating
  anchor for everything a manager sees, regardless of `CONFIG.TIMEZONE`. (3) The
  per-employee **`Timezone`** roster column drives each rep's own display /
  EOD-digest hour / shift; **punches are stamped in the rep's own tz**
  (`recordPunch` → `empTz_`), so an offshore rep's punch is their local
  wall-clock independent of the sheet tz. **Operator consequence:** to fix a
  sheet-tz drift, set the spreadsheet(s) to `CONFIG.TIMEZONE` (`Asia/Kolkata`) —
  do NOT need to change `CONFIG.TIMEZONE` to CST (that's a coordinated migration
  of all seven sheets + a one-time reinterpretation of the bookkeeping columns,
  with no manager-display benefit since `MANAGER_TIMEZONE` already covers it).
  Neither Kolkata nor Manila observes DST, so PH/India reps have no DST edge.
- **`CONFIG.COVERAGE_MIN_STAFF`** (this deploy: **6**) + **`CONFIG.COVERAGE_STAFF_GOOD`**
  (this deploy: **7**) set the manager Coverage planner's three bands (#3): a
  manager-tz business hour with **≥ GOOD** confirmed reps renders green ("good"),
  **≥ MIN_STAFF** but below GOOD renders amber ("acceptable"), and **< MIN_STAFF**
  renders red ("concerning") + is listed in the Understaffed callout. Both are
  CONFIG-only (no Script Property / Admin UI yet — deliberate, per the operator
  decision); change requires a redeploy. `getCoveragePlan` ships both as
  `minStaff` / `goodStaff`; the client (`tc/script_manager.html`) bands on the
  CONFIRMED count (every shown hour is a business hour, so 0 is concerning, not
  neutral). The planner reuses `CONFIG.SHIFT_SCHEDULE` (per-tz) for each rep's
  shift — there is still no per-rep schedule (INV-127).
- **`CONFIG.KB.REVIEW_DUE_DAYS`** (default 90) sets the KB review-due
  staleness window (#4). CONFIG-only; change requires a redeploy. The KB
  sheet gained trailing `ReviewedAt`/`ReviewedBy` columns — the header
  **self-heals on the first post-deploy KB read/save** (no manual
  migration); legacy rows fall back to `UpdatedAt` until first reviewed.
- **`CONFIG.SHIFT_SCHEDULE`** sets the Clock-view ribbon/countdown
  shift: `DEFAULT` 8:00–17:00 CST + `BY_TIMEZONE` overrides (PH
  `Asia/Manila` 8:30–17:00). Resolved per the rep's roster timezone
  by `getShiftSchedule_`; add a `BY_TIMEZONE` entry for any new
  shift exception. Change requires a redeploy (CONFIG, no Script
  Property override). **Breaks (item 1):** each shift entry may carry a
  `breaks: [{label, start:'HH:mm', len:<min>}]` array (a tz entry without
  its own `breaks` inherits `DEFAULT.breaks`), and `BREAK_REMINDER_MINUTES`
  sets the reminder lead time. `getShiftSchedule_` resolves these to
  `{breaks:[{label,startMin,lenMin}], breakReminderMin}` on `CLK_SCHEDULE`.
  The Clock view shows a "Next break" chip (`#clk-next-break`) and fires a
  one-time reminder toast `breakReminderMin` before each break — but ONLY
  while the Clock tab is open (Apps Script web apps have no background
  push); the reminded-set dedupes per break per day (and is cleared on day
  rollover so it can't grow unbounded in a long-lived pinned pop-out — F6).
- **`Employees` sheet column L = `CallNotesSheetId`** — per-rep
  call-notes Spreadsheet ID. Easiest path: **Call Notes → Admin →
  Call Notes Enrollment → Provision Sheet** (one click — creates the
  Sheet in the deployer's Drive and fills column L; INV-110). The
  manual path still works (copy the template Sheet, rename it for the
  rep, share with the script-owner account, paste the ID here). Blank
  means the rep has no Call Notes enrollment yet; their panel renders
  the enrollment-missing splash. Pre-existing rows are blank until
  provisioned/filled (the schema bump in
  `EMP.CALL_NOTES_SHEET_ID = 11` doesn't auto-fill).
- **`Employees` sheet column M = `ManagerEmail`** — each employee's
  manager (an email from `MANAGER_EMAILS`). Drives the FAIL-CLOSED
  Employee Docs team scoping (INV-122): a manager sees a doc only if
  they issued it OR they are this column's value for that employee.
  Blank = only the issuer (and the employee) can see the doc — fill
  the column for every employee who will receive docs. Header row 1;
  no other module reads it yet.
- **Set Script Property `HR_DOCS_SS_ID`** to a DEDICATED spreadsheet for
  Employee Docs (create an empty one; tabs `EmpDocs` + `DocSignatures`
  + `EmpDocTemplates` (v2 reusable templates) + `Coaching` auto-provision;
  the `EmpDocs` header self-heals to add the v2 `FieldsJson`/`ResponsesJson`
  columns on first post-deploy use — INV-135). There is deliberately NO fallback — without the
  property every Employee Docs endpoint returns a friendly
  "not configured" error. Keep it separate from the KB (broadly
  rep-readable), the ADP sheet (payroll), and the PHI sheets; the
  deployer needs edit access. NEVER point a retention purge at it —
  HR records are keep-forever (INV-122). `TEST_HRDOCS_SS_ID` is the
  auto-managed test fixture twin (created on first `runAllTests`).
- **`ROSTER_CACHE_KEY` = `'employee_roster_v6'`** — bumped when the
  `ManagerEmail` column (M) landed for Employee Docs team scoping
  (previously v5 for CallNotesSheetId). After deploying, stale v5
  cache entries expire naturally within 5 min (or run `clearCaches_()`
  from the editor).
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
- **Script Property `CN_ARCHIVED_TAGS`** (auto-managed). JSON array
  of lowercase tag strings marked as archived via the Call Notes →
  Admin tab's tag actions. Created on first archive, deleted when
  the last tag is unarchived. No manual setup needed — documented
  here so it's visible when inspecting Script Properties. Read by
  `getArchivedTagsSet_()`; written by `setArchivedTagsSet_()` from
  `archiveCallNoteTag`. Archive does NOT modify any notes; tags
  remain on every existing note's `subformData.tags[]`.
- **Script Property `CN_EMAIL_TEMPLATES`** (auto-managed). JSON array
  of `{name, recipientType, body}` external-email message templates,
  written by `saveEmailTemplates` from the Call Notes → Admin tab's
  "Email Templates" section. Created on first save; read by
  `getEmailTemplates_()` (falls back to `CONFIG.CALL_NOTES.EMAIL_TEMPLATES`,
  default `[]`). No manual setup needed — documented here so it's
  recognizable when inspecting Script Properties. Reps see the
  templates in the external-email composer's template picker (delivered
  via `getCallNotesDepartments`); a corrupt blob degrades to the CONFIG
  fallback rather than breaking the composer.
- **Script Property `CN_EXTERNAL_LINKS`** (auto-managed). JSON array of
  `{label, url, category}` manager-curated quick links (survey / feedback /
  Google-review URLs hosted OUTSIDE this app; `category` ∈
  `survey`/`review`/`feedback`/`other`, default `other` — back-compat, no
  migration), written by `saveExternalLinks` from the Call
  Notes → Admin tab's "Quick Links" section. Created on first save; read by
  `getExternalLinks_()` (sanitize-on-read — keeps only entries with a label +
  an http(s) url; falls back to `CONFIG.CALL_NOTES.EXTERNAL_LINKS`, default
  `[]`). Delivered to reps via `getCallNotesDepartments` (and managers via
  `getAdminConfig`); the external-email composer's quick-link picker appends the
  chosen `label: url` to the message. This is the workaround for the
  admin-blocked external fillable-form route — reps email a link to an external
  survey/review host instead. No manual setup needed.
- **Script Property `CN_FEATURE_FLAGS`** (auto-managed). JSON object
  `{ flagKey: bool }` of manager-set feature-toggle overrides, written by
  `saveFeatureFlags` from the Call Notes → Admin tab's "Feature Toggles"
  section. Created on first save; read by `getFlag_()` /
  `getFeatureFlagsResolved_()`, which fall back to the `FEATURE_FLAGS`
  registry defaults (each mirroring its legacy CONFIG constant) when a key
  is absent. A corrupt/non-object blob degrades to defaults (sanitize-on-
  read). No manual setup needed — documented here so it's recognizable
  when inspecting Script Properties. Only registry keys are honored; flips
  take effect server-side on the next request and client-side on the next
  config fetch.
- **Script Property `AUTOMATION_DIGEST_LAST_RUNS`** (auto-managed). JSON
  object `{ eod|urgent|weekly: "yyyy-MM-dd HH:mm:ss" }` (CONFIG.TIMEZONE
  wall time) stamped by each digest run (`stampDigestLastRun_`) — the
  heartbeat behind the Automation Health panel's "Digest heartbeats"
  block. Created on the first post-deploy digest run; no manual setup.
  Until each digest has run once, the panel shows "no heartbeat recorded
  yet" — not an error.
- **Call-notes EOD + weekly digest knobs** are
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (default 17 — the local hour at
  which each rep gets the EOD digest) and the
  `installAutomationTriggers()` schedule (Friday 8am for the weekly
  digest; the EOD digest is an hourly trigger). `EOD_WARNING_WINDOW_MINUTES`
  is legacy — no longer consulted by the EOD gate (which is now
  local-hour-equality). The EOD trigger is hourly, so deploying the
  hourly change OR changing `EOD_WARNING_HOUR` requires re-running
  `installAutomationTriggers()` for the new schedule/value to take effect.
- **`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`** controls the
  voice-to-text mic on Issue / Resolution fields. Default `false`.
  Flip to `true` only after confirming the org's stance on audio
  routed to the browser vendor's speech-to-text service (Chrome →
  Google, NOT covered by typical Google Workspace BAA — PHI in the
  rep's spoken note leaves the browser). Requires a redeploy to
  propagate to clients. When false, the UI never renders the mic
  button (no surface area for accidents).
- **`FormTokens` and `FormSubmissions` sheet tabs** are auto-created
  in the **forms (PHI) spreadsheet resolved by `getFormsSS_()`** (Script
  Property `FORMS_SS_ID`, else the ADP SS for back-compat — see the
  segregation operator note above) on first use of the external forms feature.
  `FormTokens` tracks pending/submitted/expired form links (token,
  formType, recipientEmail, expiresAt, status, prefillData, noteId).
  `FormSubmissions` stores completed form data + signature base64 **plus the
  forms-hardening trailing columns** (`SubmissionHash`, `ConsentVersion`,
  `ConsentAt`, `OpenedAt`, `Certificate`). Both are append-only. ALL timestamp
  cells in both tabs (`CreatedAt`, `ExpiresAt`, `SubmittedAt`) are written in
  `CONFIG.TIMEZONE` — every parse site (`getFormByToken`, `submitFormByToken`,
  `getMySentForms`, `parseRetentionDateMs_`) assumes that tz, and writing
  `ExpiresAt` in the creating rep's tz skewed token expiry by the tz offset
  (±~12h for CST reps) until fixed. Keep new timestamp columns consistent.
  **`ExpiresAt` reads MUST go through `formTokenCellMs_` (coercion-safe).**
  Some spreadsheet locales — notably the Intake sheet `FORMS_SS_ID` is
  segregated onto — COERCE the stored `yyyy-MM-dd'T'HH:mm:ss` string into a
  datetime, so `getValues()` returns a `Date`. The old `String()` +
  strict-`parseDate` threw on that Date and fail-closed EVERY fresh token to
  "expired" (the exact reason `computeFormSubmissionHash_` already excludes
  `submittedAt`). `formTokenCellMs_(cell)` returns `{present, ms}` — a `Date`
  → `getTime()`, a parseable string → ms, a non-empty unparseable string →
  `ms:null` (caller fail-closes as tamper, S2.1), empty → `present:false`. All
  three expiry sites route through it. The client-returned `expiresAt` /
  `createdAt` go through the sibling `formTokenIsoString_` so a coerced Date
  never leaks back as a `"Sat Jun 27 …"` blob. Pinned by the `formTokenCellMs_`
  Node test. (This was latent on the ADP-fallback sheet, which didn't coerce; it
  surfaced when `FORMS_SS_ID` moved to the Intake sheet — a CODE bug, NOT
  fixable by the sheet tz alone.)
  No manual setup needed — the `getOrCreateFormTokensSheet_()` /
  `getOrCreateFormSubmissionsSheet_()` helpers provision them with headers on
  first call.
- **`PunchAdjustRequests` sheet tab (#4a)** is auto-created in the ADP
  spreadsheet on first adjustment request (`getOrCreatePunchAdjustSheet_`).
  Tracks employee-requested punch corrections (ReqId, EmpId, EmpName, Date,
  PunchType, RequestedTime, Reason, Status, SubmittedAt) pending manager
  approval. No manual setup needed.
- **Form catalog** is configured in
  `CONFIG.CALL_NOTES.FORM_CATALOG` — each entry maps an ID to a
  filename in the repo's `/forms/` folder. Adding a form: upload
  the PDF to `/forms/`, add an entry to FORM_CATALOG with
  `{id, name, fileName, category}`, and redeploy. PDFs are fetched
  via `UrlFetchApp` from the raw GitHub URL
  (`CONFIG.CALL_NOTES.FORM_BASE_URL`). Interactive (fillable) forms
  must also have a rendering function in `form_public.html`.

## Cycle State & Memory

Claude Code has no memory between sessions; this project runs on Claude Code
on the web (ephemeral containers, repo re-cloned each session), so the
cross-session state lives in **committed** files — `.cycle/` + `PROJECT_HEALTH.md`.
Two memory channels — keep the boundary:
- **Substrate (carry forward):** the systems map, the Invariant Library, Common
  Gotchas, and the score history. Always load these into a new session.
- **Judgment (re-derive fresh):** audit findings + severity calls. A new audit
  uses fresh eyes; never inherit the prior scan's conclusions as authoritative.

`/cycle-resume` continues an *in-progress implementation thread* (substrate +
objective facts: what changed, what's pending, decisions made) — never prior
judgments. Starting a new audit is always fresh.

**Cycle numbering (single source of truth):** the `Cycle:` field in
`.cycle/STATE.md` is authoritative; it increments by 1 when a NEW audit cycle
begins (a fresh `/broad-scan` or `/audit` after the prior cycle's `/reflect`).
Every phase within a cycle (audit → plan → implement → regression → reflect)
carries the same number. `/cycle-status` surfaces it.

### `.cycle/` state directory (committed — survives the ephemeral container)
- `.cycle/STATE.md` — rolling "where I left off" (template below); written by the
  implement commands' CHECKPOINT step, read by `/cycle-resume` + `/cycle-status`.
- `.cycle/metrics.csv` — per-cycle metrics appended by `/reflect` / synthesis.
  Header: `date,cycle,subsystem,phase,net_score,prod_fixes,new_failure_modes,category_d_ratio,axis_b_lowest,notes,defensive_count`
  **Local convention:** the canonical `/reflect` leaves `category_d_ratio` +
  `axis_b_lowest` blank (a separate `/synthesis` step fills them), but this
  project has no `/synthesis` command, so fill both at reflect time (cycles 1–3
  did) — `category_d_ratio` = the Category-D/Low share of the cycle's findings,
  `axis_b_lowest` = the weakest Axis-B horizontal category that cycle.
- `.cycle/estimates.csv` — estimate-vs-actual calibration, appended by `/reflect`.
  Header: `date,cycle,action,estimate,estimated_hours,actual_hours,calibration_note`
- `PROJECT_HEALTH.md` (repo root) — Current Standing + Score History.

Fully optional + additive: with no `.cycle/`, every command behaves as before
(emit the handoff/summary block in chat). `scripts/cycle-context.mjs` IS
installed here and wired as a **SessionStart hook** via `.claude/settings.json`
— it auto-loads the substrate (STATE Current / Where-I-left-off / Pending +
PROJECT_HEALTH Current Standing + invariant count) into each new session
(fail-safe: prints nothing without `.cycle/`, never throws). The
`scripts/render-metrics.mjs` trend-report helper from workflow-tools is NOT
copied — add it if you want the metrics sparkline report.

`.cycle/STATE.md` template:

```
# Cycle State

## Current
Cycle: [N — single source of truth; increments only when a new audit cycle begins]
Phase: [audit | plan | implement | regression | verify | reflect | idle]
Scope: [subsystem(s) or "broad"]
Test Command: [from Cycle Workflow Config]
Subsystem cycles since last Seams audit: [K — /reflect increments, a Seams audit resets to 0]
Updated: [date]

## In progress (facts to carry forward — NOT judgments)
- [what is partially done]
- [the next concrete step]

## Completed this cycle
- [action ID] | [file(s)] | [one line]

## Pending / not yet done
- [action ID or description]

## Open follow-on items
- [File: area] — [what to check and why]

## Decisions made (so the next session doesn't re-litigate)
- [decision] — [rationale]

## Where I left off
[1–3 sentences: exactly what to do first on resume]
```

## Cycle Workflow Config

The workflow templates that drive `/broad-scan`, `/broad-implement`,
`/targeted-audit`, `/targeted-implement`, `/test-sync`, and
`/sync-docs` all read this section. Keep it the single source of
truth — update via `/setup-cycle` rather than ad-hoc edits.

### Test Command
manual

The Apps Script suite (`web-app/Tests.js`) runs inside the editor
(`runSmokeTests()` / `runAllTests()`, automating scenarios S1–S2; no
Apps Script runtime exists off-editor). Pure client-side helpers also
have a dependency-free Node harness — `node test/client/run.js` (or
`npm test` from the repo root) — that loads the HtmlService `<script>`
partials into a `vm` sandbox with browser/GAS stubs and unit-tests pure
functions (`esc`, `empTz` / `isoDateTz`, the metrics date helpers,
`cnExtEmailPillHtml_`, `cnIsUrgent_` / `cnUrgentPillHtml_`, the
external-email template-picker helpers `cnExtTemplatesFor_` /
`cnExtTemplateOptionsHtml_`, `cnLatestManagerReply_` (the training
feedback[]-vs-legacy precedence helper), and the server-side
`cnExtractAuditNoteId_` parser, the `buildPatientTimeline_` (#3 patient/TRX
timeline merge — substring TRX match + noteId-linked forms + newest-first
sort) and `deployReadinessItems_` (#1 pre-deploy checklist banding — required
fail / optional warn / tz-mismatch warn / heartbeat warn) and
`retentionWarnings_` (the 3-tier retention safety-ordering warnings) pure
helpers, plus the `isValidTimeOffType_` leave-type
validator extracted from `Code.js` via `extractRawFunction` — the latter
with a coupling tripwire asserting the `day-type` `<select>` options stay
a subset of `TIME_OFF_TYPES`, the feature-flag layer
(`FEATURE_FLAGS` registry integrity + `getFlag_` Script-Property override
/ fail-safe semantics, run in a stubbed `PropertiesService` context), the
branded-email builders (`buildBrandedEmailHtml_` esc_'s the heading +
embeds the caller-escaped body raw; `brandedKvRows_` esc_'s both label
and value — INV-105), and a source-level coupling tripwire asserting the
automation **trigger wiring is self-consistent** (every
`ScriptApp.newTrigger('X')` handler in `installAutomationTriggers` appears
in BOTH the install and `removeAutomationTriggers` `TARGETS` dedupe arrays
— the exact class of bug that duplicated `purgeOldCallNotes` until it was
added to both)); it also
parse-guards every JS-bearing `<script>` partial so a syntax error
anywhere in the client fails CI. It also runs a **design-token hygiene
tripwire** (INV-128) that fails CI on any `var(--token)` used in a shared
partial but defined nowhere in `styles_design_tokens.html` (the allowlist is
empty; `form_public.html` is excluded). The integration suite (`Tests.js`)
gained `test_cn_search_phoneTrxFieldScopes`, pinning the Phone/TRX search
field-scope isolation (INV-45). See `test/client/README.md`. It needs
no npm install and lives outside `web-app/`, so `clasp` never pushes it. A
GitHub Action (`.github/workflows/client-tests.yml`) runs this harness +
a `node --check` of `Code.js` / `Tests.js` on every push and PR — the
project's only automated check. Use
the Regression Scenarios below as the canonical full-system
verification path.

A second, **DOM-lifecycle** harness now sits alongside the pure one:
`node test/client/dom/runDom.js` (or `npm run test:dom`; `npm test` runs BOTH).
It loads the FULL `<script>` of the chosen partials into a real **jsdom**
window — the project's only dependency, dev-only, so `clasp` still never
pushes it — and tests the layer the pure harness can't reach: innerHTML
render/escape, overlay lifecycle (`ensureOverlay`/Esc), optimistic-UI
submit + revert (INV-48), `_flagInFlight` double-fire (INV-56), late-callback
`currentView` guards, and the focus trap. Mechanics (see
`test/client/README.md`): `runScripts:'outside-only'` →
`getInternalVMContext()` (window === globalThis, real document; no auto
`DOMContentLoaded`, so module-top init stays dormant); partials share lexical
scope so a trailing **bridge** (`h.t`) get/sets the `const`/`let` module state
(`CN_STATE`, `currentView`, `empState`); a programmable `google.script.run`
mock (`run.resolve`/`reject`/`lastFor`/`countFor`) drives the RPC paths;
`opts.markup:['modals.html']` mounts shared modal DOM for the `tc/` views. The
escape-discipline tests are proven to bite (reverting an `esc()` fails them) —
this is the regression net for the client overlay/lifecycle bug class that
every prior cycle shipped blind. The CI workflow runs it as a second step
(after `npm ci`); the zero-install pure step stays first as the always-on floor.

### Health Dimensions
Overall, Correctness, Security & Access Control, Data Integrity, Timezone Correctness, Concurrency Safety, Test Coverage, Code Clarity & Docs, Apps Script Best Practices, Manager UX, Employee UX, Automation Reliability

### Horizontal (Axis B) Categories
Silent Degradation Posture | failures swallowed so the app continues with wrong results instead of surfacing an error (best-effort email, the CDR-overlay try/catch, optimistic-UI reverts, JSON-parse → null)
Parallel Source-of-Truth Drift | the same value duplicated across places that can diverge (`LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_` ↔ `TIME_OFF_TYPES` ↔ modal options; `CN_EMAIL_PALETTE` ↔ design tokens; `AUTO_COPY_FORMAT` server default ↔ client fallback)
Operator-Only State Gaps | setup living only in Script Properties / manual triggers / the operator's head (`ADP_SS_ID`, `CDR_SS_ID`, `MANAGER_EMAILS`, `CN_FEATURE_FLAGS`, trigger install, per-rep Sheet enrollment, form-retention window)
Sheets-Coercion & Timezone Integrity | Sheets coercing time/date/`TRUE`-`FALSE` on read, the CDR spreadsheet TZ mismatch (`getDisplayValues()`), per-rep-tz "today" derivation
PHI / Access-Boundary Leakage | audit rows staying PHI-free, manager-gating + caller-scoping, token-only public endpoints, `esc()`-before-`innerHTML`, voice/BAA, signature handling
Test Coverage Quality | whether tests actually guard regressions; the client DOM/RPC layer is manual-only; coupling tripwires (INV-95)

### Subsystems
Server:
  web-app/Code.js, web-app/appsscript.json, web-app/.clasp.json
Client (shell):
  web-app/index.html, web-app/modals.html, web-app/styles.html, web-app/styles_design_tokens.html, web-app/script_core.html, web-app/script_icons.html, web-app/script_tour.html
Client (Time Clock views):
  web-app/tc/script_clock.html, web-app/tc/script_timesheet.html, web-app/tc/script_timeoff.html, web-app/tc/script_manager.html
Client (Call Notes views):
  web-app/cn/script_callnotes.html
Client (Metrics views):
  web-app/metrics/script_metrics.html, web-app/metrics/script_deptrequests.html
Client (Intake views):
  web-app/intake/script_intake.html
Client (Reference views):
  web-app/kb/script_kb.html
Client (Training views):
  web-app/train/script_training.html, web-app/train/script_empdocs.html, web-app/train/script_coaching.html
Client (public forms):
  web-app/form_public.html
Test Suite:
  web-app/Tests.js, test/client/harness.js, test/client/run.js, test/client/dom/boot.js, test/client/dom/runDom.js

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
INV-16 | Empty timezone strings fall back to `CONFIG.TIMEZONE`; empty leave-balance cells parse as 0. Trigger handlers route roster timezone values through `safeTimezone_()`, which shape-checks the id (IANA `Area/Location` or `UTC`/`GMT±h[:mm]`) before the `Utilities.formatDate` probe — the V8 runtime no longer throws on unknown tz ids, so the probe alone can't catch typos — and logs invalid values before falling back | Subsystem: Server
INV-17 | `getLeaveDeduction_` is case-insensitive and trims whitespace; unknown types default to `{ bucket: 'annual', days: 1.0 }`; `'Unpaid Leave'` returns `{ bucket: null, days: 0 }`. It STILL maps `'Sick Leave'` → `{ bucket: 'sick', ... }` even though `Sick Leave` was removed from `TIME_OFF_TYPES` (so no new sick request is creatable, INV-95) — the mapping is kept so historical Approved-sick rows revert/reconcile to the SICK bucket; removing it would route legacy sick reverts into ANNUAL | Subsystem: Server
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
INV-28 | Whenever the `EMP` enum gains or changes columns, `ROSTER_CACHE_KEY` is bumped (currently `employee_roster_v6`) so old cached entries with the wrong column shape are not served | Subsystem: Server
INV-29 | `normalizeDate_` uses the spreadsheet's timezone (`getAdpSS_().getSpreadsheetTimeZone()`) to format Date cells — not `CONFIG.TIMEZONE` — so dates round-trip consistently regardless of the script's timezone configuration | Subsystem: Server
INV-30 | All mutating Call Notes server functions (`submitCallNote`, `updateCallNote`, `setCallNoteFlag`, `setCallNoteResolved`, `deleteCallNote`, `emailFromCallNote`, `setCallNoteTrainingReply`, `setCallNotePinned`, `appendCallNoteFeedback`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`) acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` (INV-01 generalized) | Subsystem: Server
INV-31 | Manager-gated Call Notes + Metrics endpoints (`managerGetCallNotes`, `managerSearchCallNotes`, `managerGetTrainingQueue`, `managerGetReviewCandidates`, `setCallNoteTrainingReply`, `managerGetShiftStats`, `managerGetUnresolvedActionCount`, `getTeamMetrics`, `getMetricsAmbient`, `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`, `getCallNotesTagTaxonomy`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`, `managerGetFormSubmission`, `saveEmailTemplates`, `getCallNotesAuditLog`, `getCallNoteAuditHistory`, `getAutomationHealth`, `getStorageHealth`, `getDeployReadiness`, `getAdminSheetView`, `getRetentionConfig`, `saveRetentionConfig`, `kbConvertDriveDoc`, `kbGetUsageStats`, `getCallNotesTagTrends`, `kbGetReviewDue`, `kbMarkReviewed`) verify `callerEmp.isManager` before any side effect (INV-02 generalized; pinned in `test_managerGates_rejectNonManager` alongside `getPunctualityReport`, `getDeployReadiness`, and a `getDeptRequests` no-manager-fields-leak assertion). **AMENDMENT (Dashboard work):** the four Spanish-inbox endpoints (`getSpanishInboxStats`/`Pending`/`Resolved`/`ThreadBody`) are NO LONGER pure-manager-gated — they now gate on `canSeeSpanishInbox_(emp)` = `isManager OR email ∈ SPANISH_INBOX_MEMBERS` (the bilingual reps who action the inbox get the FULL feature, bodies included; the gate still fires BEFORE any GmailApp access). The gate test asserts a non-member rep is rejected with the `Spanish Inbox access` error; `getEmployeeState` ships `canSeeSpanish` so the client gates the `metricsSpanish` tab + the dashboard Spanish card | Subsystem: Server
INV-32 | Every state-changing Call Notes action writes an audit row via `writeAuditLog_` (`CallNoteCreate` / `Edit` / `Flag` / `Resolve` / `Delete` / `Email` / `TrainingReply` / `Pin` / `Feedback` / `TagAdmin`) with `noteId=<uuid>` in the notes field — the audit log is the only cross-rep trail of call-note activity. Manager-actor rows (TrainingReply, TagAdmin) carry the manager's email as actor via the actorEmail parameter. `Feedback` (Round 2 · 8g) records agent acks + clarifications in the multi-turn Q&A thread. `TagAdmin` (Round 2 follow-on) records rename / merge / archive batch operations on the tag taxonomy with `{action, oldTag/newTag, repsTouched, notesUpdated}` summary in the notes field | Subsystem: Server
INV-33 | `submitCallNote` does NOT send a department email. Sending is a separate two-stage flow: `previewCallNoteEmail` (returns rendered HTML for confirm-before-send) then `emailFromCallNote` (sends + stamps EmailedAt/EmailDepartments + writes audit). Exception: when `flagType=training` and `subformData.trainingQuestion` is non-empty, `submitCallNote` fires a best-effort manager notification via `notifyManagerTrainingQuestion_()` (try/catch, does not block the response — see INV-58) | Subsystem: Server
INV-34 | `setCallNoteResolved` rejects calls when `FlagType !== 'action'`; only action-flagged notes have a resolved state | Subsystem: Server
INV-35 | `getCallNotesSheet_(emp)` throws "Your call-notes Sheet is not configured" when `emp.callNotesSheetId` is missing — call-notes endpoints surface this as the enrollment-missing splash in the client. Enrollment is either manual (paste the ID into column L) or one-click via the manager-gated `provisionCallNotesSheet` (INV-110); `getCallNotesSheet_` itself never auto-provisions a Sheet on a read | Subsystem: Server
INV-36 | Call-note email sends (`emailFromCallNote`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`) are wrapped in try/catch and never block the API result (INV-14 generalized) | Subsystem: Server
INV-37 | `sanitizeFlagType_` only allows `''` / `'action'` / `'training'` / `'review'` to be written to FlagType; unknown values silently coerce to `''` rather than corrupting the column | Subsystem: Server
INV-38 | Compact-mode is a shell-level attribute (`data-compact="1"` on `documentElement`); set from the `?compact=1` URL param on boot and consumed via CSS selectors in `styles.html`. Tool views render `.compact-header` instead of `.view-title-row` when `COMPACT_MODE === true` | Subsystem: Client (shell)
INV-39 | `getCallNotesAmbient` is authenticated to the caller (requires registered employee), read-only — returns `{enrolled, unresolvedActionCount, staleActionCount, todayTotal, weekTotal, flagCounts, staleFlagHours, flagsVersion}` for the calling rep (`weekTotal` + `flagCounts {all,action,training,review,unresolved,qa}` added in Phase 4 for the Log view's stats-mini + quick-chip-row; `flagsVersion` = `cnFlagsVersion_()`, a compact encoding of the client-deliverable feature flags so the poller can detect a manager toggle flip and refetch config within ≤60s — see the runtime-flag flip-semantics decision). Cached for `CN_AMBIENT_CACHE_TTL` (60s) under `CN_AMBIENT_CACHE_PREFIX + emp.id`. The cache is purely TTL-driven; mutating endpoints do NOT eagerly invalidate (the 60s ceiling matches the sidebar polling interval). Used by the sidebar badge polling + Log view stats; never leaks cross-rep data | Subsystem: Server
INV-40 | `setCallNoteFlag` clears `Resolved` (sets to `'FALSE'`) on any flag-type transition (`oldFlag !== t`), not only on full clear — so stale `resolved=TRUE` from a prior action-flag cycle doesn't resurface when the rep flips back to action | Subsystem: Server
INV-41 | `previewCallNoteEmail` returns `bodyHash` (SHA-256 hex over `htmlBody + subject + to`). `emailFromCallNote(noteId, payload, expectedBodyHash)` requires the hash and refuses to send when the freshly re-rendered body's hash doesn't match — guards against the rep editing the note between Preview and Send | Subsystem: Server
INV-42 | `emailFromCallNote` sends via MailApp first (wrapped in its own try/catch — failure returns `success: false`), then stamps `EmailedAt` / `EmailDepartments` / `Subform` metadata in a separate try/catch. A stamp failure after a successful send logs to console and returns `success: true` so the rep doesn't re-send a duplicate | Subsystem: Server
INV-43 | Mutating CN endpoints do NOT eagerly invalidate the ambient cache. The 60s `CN_AMBIENT_CACHE_TTL` is the sole freshness ceiling and matches the sidebar polling interval — badge can be at most 60s stale, same as if invalidation happened on every mutation. `invalidateCnAmbientCache_` is retained for manual operator use (e.g., after a direct Sheet edit that should reflect in the badge immediately) but is no longer called from the mutation hot path | Subsystem: Server
INV-44 | The ten trigger-handler endpoints (`sendDailyMissedPunchAlerts`, `runDailyExportCheck`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`, `sendTrainingOverdueDigest`, `purgeExpiredFormData`, `purgeOldCallNotes`, `archiveOldCallNotes`, `purgeArchivedCallNotes`) call `assertManagerCaller_(label)` at the top. Required because they're top-level (time-based triggers won't bind to underscore-suffix functions) and therefore reachable via `google.script.run`. `purgeExpiredFormData` / `purgeOldCallNotes` / `purgeArchivedCallNotes` are destructive (delete FormSubmissions/FormTokens, per-rep live Notes, and per-rep NotesArchive rows past their retention windows) so the gate is load-bearing; `archiveOldCallNotes` is non-destructive (moves rows to a `NotesArchive` tab, data preserved) but still deletes from the live `Notes` tab, so it carries the same gate. Pinned by `test_triggerGate_purgeOldCallNotes_nonManagerThrows` / `_archiveOldCallNotes_` / `_purgeArchivedCallNotes_` / `_purgeExpiredFormData_` | Subsystem: Server
INV-45 | `searchMyCallNotes(query, field, dateRange, exact)` — when `exact === true`, matches `patientAndTrx` exactly (case-insensitive, trimmed) and ignores `field`. Otherwise `field ∈ all \| caller \| issue \| phone \| trx`: `all` matches across (caller, callback, patientAndTrx, issue, resolution); `caller` matches (caller, callback, patientAndTrx); `issue` matches (issue, resolution); **`phone` matches the callback number ONLY; `trx` matches patientAndTrx ONLY** (scope-isolated — a `phone` search never matches a TRX token, and vice-versa). The same field-scope set applies to the manager-gated `managerSearchCallNotes`. Used by the "Find prior calls for this TRX" card button + the Search tab's field-scope tabs. Pinned by `test_cn_search_phoneTrxFieldScopes` | Subsystem: Server
INV-46 | `exportCallNotesRange(startDate, endDate)` is manager-gated, read-only across all enrolled reps' Sheets. Creates a new Sheet with a 15-column schema (RepId, RepName, DateLocal, Timestamp, Callback, Caller, Relationship, PatientAndTRX, Issue, TransferredTo, Resolution, FlagType, Resolved, EmailedAt, EmailDepartments) and writes a `CallNotesExport` audit row before returning. A broken per-rep Sheet doesn't fail the run — caught and logged, skipping that rep | Subsystem: Server
INV-47 | `getManagerDashboard` pending[] entries carry `conflictsOff: [{name, status, type}]` (other reps off the same day, excluding self) and `holidayName: string|null` (US holiday name). Computed from a date→requests index built once per dashboard load + a holiday map keyed by years present in pending requests. The manager dashboard surfaces both inline on each pending card and echoes them into the Approve confirm dialog | Subsystem: Server
INV-48 | Optimistic UI on the Call Notes hot path: `cnSubmitActiveForm_`, `cnToggleFlag_`, and `cnToggleResolved_` mutate `CN_STATE.rollingNotes` and re-render BEFORE the server RPC fires. Pending notes carry `_pending: true` and render with reduced opacity + a "Saving" badge in place of action buttons. Server failure triggers `cnRevertPendingSubmit_` (for submit) or restores the prior flag/resolved state (for toggles), and surfaces a clear toast. The submit snapshot captures the full multi-flag array (incl. `urgent`) + tags + training question — not just the single primary flag — so a failed submit recovers everything the rep typed (`cnRestoreFromSnapshot_` prefers `snap.flags`/`snap.tags`; F2 fix). The revert NEVER clobbers newer work: it restores into the form only when the form is still empty (same 5-field check as the Ctrl/⌘+Z path); with new typing present the form is left untouched (the failed note remains on the clipboard from the optimistic copy), and after a nav-away the snapshot is parked in the sticky-draft slot via `cnSaveSnapshotAsStickyDraft_` so the next Log view restores it (Cycle 2 · M4). Auto-copy also runs in the optimistic path so the rep can paste into the CRM before the network acknowledges anything | Subsystem: Client (Call Notes views)
INV-49 | `setCallNoteTrainingReply(repId, noteId, reply)` is manager-gated, locked, and rejects calls on non-training-flagged notes (parallels INV-34's resolve-only-on-action rule). Merges the reply + author email + reply timestamp into the target rep's `subformData.trainingReply` / `trainingReplyBy` / `trainingReplyAt` keys (no schema migration). Round 2 · 8g also appends `{role:'manager', kind:'reply', message, at, by}` to `subformData.feedback[]` for the multi-turn Q&A thread. Empty reply clears the three trainingReply keys but does NOT remove prior feedback[] entries (the thread is append-only). Writes a `CallNoteTrainingReply` audit row with the manager's email as actor. **Do NOT retire the legacy `trainingReply` write** (investigated as B4): it is the clearable "current answer" pointer — distinct from the append-only `feedback[]` history — and several readers key off it precisely so a *cleared* reply disappears (the 'answered' filter, the ambient QA count, `getMyTrainingQA`, the digest helper). Removing the write + making those readers feedback[]-aware would make a clear a no-op (feedback[] always wins), regressing S35. A safe retirement would first redefine clear as a `feedback[]` retraction marker — deferred | Subsystem: Server
INV-50 | `setCallNotePinned(noteId, pinned)` is caller-scoped (operates on the caller's own per-rep Sheet), locked, and enforces `CN_PIN_LIMIT` (currently 3) inside the lock so two parallel pin requests can't both squeak past the cap. Pin state lives in `subformData.pinned` (boolean) + `subformData.pinnedAt` (timestamp). Writes a `CallNotePin` audit row | Subsystem: Server
INV-51 | `getMyPinnedCallNotes` returns the caller's pinned notes across ALL dates (no date filter), sorted newest-pinned first. The Log view's pinned tray spans the rep's entire pin history — a complex case pinned last week is still visible today | Subsystem: Server
INV-52 | `managerGetShiftStats(date)` is manager-gated, read-only across all enrolled reps' Sheets. Per-rep aggregates: `totalNotes`, `flagCounts {action, training, review}`, `resolvedCount`, `emailsSent`, `medianCompletionSeconds`, `shiftSpan {first, last}`. Median (not mean) is used for completion seconds; outliers > 30 min are stored as null in `subformData.completionSeconds` upstream so they never enter the dataset. A broken per-rep Sheet doesn't fail the run — caught and logged, skipping that rep | Subsystem: Server
INV-53 | Voice-to-text dictation is opt-in via `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED` (default false). When true, `cnVoiceMicMarkup_` renders mic buttons next to Issue and Resolution; clicking uses `webkitSpeechRecognition`, which in Chrome routes audio to Google's speech-to-text service — NOT covered by a typical Google Workspace BAA. The flag must stay false until the operator confirms the org's HIPAA stance. When false, the UI never renders the mic (no DOM surface for accidents) | Subsystem: Server + Client (Call Notes views)
INV-54 | Form-completion timer captures duration from the first input event in the active form to the submit. Start time persists to `localStorage['umsCallNotesFormStartedAt']` so a mid-form reload doesn't reset the clock. On submit, `cnFormTimerEndAndGet_` returns elapsed seconds (capped at 30 min as null — rep walked away mid-note). The value rides into the server payload as `payload.subformData.completionSeconds`; the manager Stats tab medians over notes that captured one | Subsystem: Client (Call Notes views)
INV-55 | Sticky form auto-saves the active draft to `localStorage['umsCallNotesActiveFormDraft']` on every input (debounced 400ms via `cnPersistActiveFormDraft_`). On Log view enter, `cnRestoreActiveFormDraft_` restores values + flag + training-question if a draft is present, with a "Draft restored" toast. Successful submit and explicit Clear Note both clear the draft via `cnClearStickyFormDraft_` — any new form-clearing path must call it too or the draft will resurrect on next load | Subsystem: Client (Call Notes views)
INV-56 | `cnToggleFlag_`, `cnToggleResolved_`, and `cnTogglePinned_` set `note._flagInFlight = true` before firing the RPC and clear it in both success and failure handlers. A second click while the first RPC is in flight is silently dropped. Prevents the double-click race where two concurrent RPCs capture the same snapshot and clobber each other's revert | Subsystem: Client (Call Notes views)
INV-57 | `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`, and `saveEmailTemplates` are manager-gated. Save endpoints validate input (email format for depts, rate range 0–1 for taxes, array-of-strings structure for suggestions, name/recipientType/body + count≤50 / body≤4000 for templates) and write an `AdminConfigChange` audit row with the manager's email. Config is persisted to Script Properties (`CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`, `CN_UPDATE_SUGGESTIONS`, `CN_EMAIL_TEMPLATES`); `getDepartmentEmails_()` / `getStateTaxRates_()` / `getUpdateSuggestions_()` / `getEmailTemplates_()` read Script Properties first, falling back to CONFIG. `getEmailTemplates_()` sanitizes on read (corrupt/non-array blob → CONFIG fallback, never throws) and templates also ride to reps via `getCallNotesDepartments` (rep-callable) for the external-email composer picker | Subsystem: Server
INV-58 | `submitCallNote` calls `notifyManagerTrainingQuestion_()` (best-effort, try/catch) when `flagType === 'training'` and `subformData.trainingQuestion` is non-empty. The notification is a plain-text email to `getManagerEmails_()` with the rep's name, question, and date. Failure does not block the submit response (INV-14 pattern) | Subsystem: Server
INV-59 | `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a `PersonalSheetSyncFail` audit row on failure (nested try/catch so the audit write itself can't throw). The audit row records the punch type and error message. Personal-sheet failures are never surfaced to the user — the ADP Sheet (source of truth) was already written successfully | Subsystem: Server
INV-60 | `deleteCallNote` rejects deletion when the note is older than `CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS` (300s). The elapsed-time check uses `parseTimestampMs_` against the note's `TIMESTAMP` column. Notes without a parseable timestamp bypass the check (fail-open for legacy data) | Subsystem: Server
INV-61 | `removeAutomationTriggers` calls `assertManagerCaller_` — non-manager reps cannot disable automation triggers via `google.script.run` | Subsystem: Server
INV-62 | `cnFindNoteAnywhere_` searches `CN_STATE.rollingNotes`, `historyNotes`, and `pinnedNotes`. `cnReplaceNoteInState_` updates all three. Actions on pinned notes from past dates no longer silently fail, and flag/resolve changes propagate to the pinned tray | Subsystem: Client (Call Notes views)
INV-63 | `getMyCallNotesRange(startDate, endDate)` is caller-scoped via `getEmployeeInfo_()`, validates both dates with regex, rejects `startDate > endDate`, and caps the span at 90 days. Returns notes sorted newest-first. Used by the History view for multi-day queries; single-date queries still use `getMyCallNotes` | Subsystem: Server
INV-64 | CDR data reading uses `getDisplayValues()` for duration columns (TTT, ATT, AvgAbdWait, CsrAvgAbdWait) and `cdrParseHms_()` to convert H:MM:SS strings to seconds. Never use `getValue()` for these columns — the CDR Report spreadsheet has a timezone mismatch that adds a phantom offset. Same constraint as `call-data-reporting/Data.gs::parseHmsDisplay_`. Pinned by the CDR test fixture, which stores TTT/ATT as coerced time values (Date via `getValues()`, H:MM:SS via `getDisplayValues()`) so a `getValues()` regression fails `test_metrics_cdrFixture_durationsUseDisplayValues` + the `attSeconds` integration assertion | Subsystem: Server
INV-65 | `getMyMetrics(date)` is caller-scoped via `getEmployeeInfo_()`, read-only. Returns the rep's own CDR metrics for the given date + a 30-day trend array + note-to-call coverage ratio. CDR data is fetched via `getCdrDailyBreakdown_()` (single-agent filter). The trend window is the 30 days ending on the given date. Returns `cdr: null` if the agent has no DQE data (not an error) | Subsystem: Server
INV-66 | `getTeamMetrics(from, to)` is manager-gated (INV-02). Accepts a date range; single date collapses to `from === to`. CDR aggregation uses `getCdrAgentMetrics_()` for the range, note counts scan each enrolled rep's call-notes Sheet across the full range. Returns a 30-day team trend in single-day mode only (`trend` field is null for multi-day ranges). `unmatchedAgents` lists CDR agent names not on the team-tools roster | Subsystem: Server
INV-67 | CDR enrichment in `managerGetShiftStats` is wrapped in a try/catch after the core call-notes aggregation loop. Failure does not break the existing response — `reps[i].cdr` is simply absent. CDR cache (`CDR_CACHE_KEY`, 5-min TTL) is shared across `getCdrAgentMetrics_()` calls but NOT across `getCdrDailyBreakdown_()` (the latter is uncached since it returns per-day granularity needed only for trend rendering) | Subsystem: Server
INV-68 | `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()` are the isolated CDR data layer. Both open the CDR Report spreadsheet via `getCdrSS_()`, read `DQE Historical Data`, filter by date range + optional roster names, skip queue-sentinel rows via `isCdrQueueSentinel_()`. Both call `validateCdrColumns_()` on first access to check header positions against `CDR_EXPECTED_HEADERS` and `getCdrNameMap_()` to resolve Agent Alias Overrides before roster matching. Designed as the Option A (direct spreadsheet read) implementation — a future swap to Neon Postgres (Option C) replaces only these two functions + `getCdrSS_()` | Subsystem: Server
INV-69 | `getManagerDashboard` returns `pendingTrend` (14 days, new pending submissions per day, INCLUDES today) + `missedTrend` (14 days, missed-clockout instances per day, EXCLUDES today since reps still mid-shift would always register as missed). Both computed in-memory from already-loaded `toRows` / `adpRows` (INV-13 honored — no extra Sheet reads). Used by the V4·E2 telemetry-strip sparklines on Missed + Pending cells | Subsystem: Server
INV-70 | `getManagerDashboard` attaches `recentHours[]` (7 entries `{date, hours}`, oldest→newest, excludes today) to each `liveStatus` entry. Computed via one extra in-memory pass over already-loaded `adpRows` and `calcHours_`; days without both a `ClockIn` and a `ClockOut` are recorded as 0 hours. Used by the V4·E3 per-rep sparkline on the manager dashboard's live-status cards | Subsystem: Server
INV-71 | Clock view's "until end of shift" countdown (in `buildStatusSentence_`) and the day ribbon's scheduled band (in `renderDayRibbon_`) both anchor to the rep's first `ClockIn` + the scheduled length once they've clocked in; before that, both fall back to the rep's configured shift from `CONFIG.SHIFT_SCHEDULE` (default 8:00–17:00 CST, per-timezone overrides — e.g. PH `Asia/Manila` 8:30–17:00). The schedule is resolved server-side by `getShiftSchedule_(timezone)` → `{startMin, lengthMin}`, shipped on `getEmployeeState`, and read client-side via `CLK_SCHEDULE` (`clkSchedStartMin_` / `clkSchedLenMin_`, falling back to `RIBBON_DEFAULT_*` if absent). Per-rep (vs. per-tz) schedules still aren't supported | Subsystem: Server + Client (Time Clock views)
INV-72 | `LEAVE_DEDUCTION_CLIENT` in `tc/script_timeoff.html` must mirror server's `getLeaveDeduction_` (Code.js) for the PTO day modal's balance-after preview to compute correctly. The server still performs the actual deduction on submit (via `updateTimeOffStatus`'s Pending→Approved transition), so a drift causes UI mis-preview but not balance corruption. Adding a new leave type requires updating BOTH maps. Both maps RETAIN the `sick` mapping (mirror intact) even though `Sick Leave` is no longer a creatable type (INV-17/INV-95) — kept for legacy-row reverts/reconciliation | Subsystem: Client (Time Clock views) + Server
INV-73 | Day-ribbon now-cursor refresh interval (`_ribbonNowInterval`, 60s) is bound to the `startClock` / `stopClock` lifecycle via `startRibbonNowCursor_` / `stopRibbonNowCursor_`. When the Clock view is exited via tab navigation (Time Off / Manager / Call Notes / Metrics enters all call `stopClock` at the top), the interval clears alongside the 1Hz live-time interval | Subsystem: Client (Time Clock views)
INV-74 | (Removed in Round 2 · 8b.) The Clock view's pay-period ledger cell + the `lazyUpdatePayPeriodCell_` lazy hook were both removed when the timesheet section moved to the Time / PTO tab. The orphaned timesheet render cluster (`loadTimesheet` / `renderTimesheetView` / calendar+card renderers) was fully pruned in Cycle 2 (L11) — `tc/script_timesheet.html` now holds only the live `computeRange` / `isoFromMs` range helpers used by the Time / PTO side rail | Subsystem: Client (Time Clock views)
INV-75 | `submitCallNote` accepts `payload.flags[]` (multi-select via `sanitizeFlagsArray_`) and `payload.tags[]` (free-text kebab-case via `sanitizeTagsArray_`) in addition to the legacy `payload.flagType` single string. Server folds both into `subformData` (no new Sheet column required) and derives the `FlagType` column from `flags[]` via priority order (`action` > `training` > `review` > `urgent`). `urgent` never enters the `FlagType` column (INV-37 preserved — `sanitizeFlagType_` still rejects it); it lives in `subformData.flags` only so existing manager digests / queues are unaffected. Pin stays in `subformData.pinned` with its 3-cap (INV-50) — not in flags[] | Subsystem: Server
INV-76 | `appendCallNoteFeedback(noteId, message, kind)` (Round 2 · 8g) is rep-callable (operates on caller's own per-rep Sheet), locked, and rejects calls on non-training-flagged notes (parallels INV-34 + INV-49). Appends `{role:'agent', kind:'ack'\|'clarification', message, at, by}` to `subformData.feedback[]`. `kind='ack'` with empty message renders as 👍 Got it; `kind='clarification'` requires a non-empty message. Writes a `CallNoteFeedback` audit row | Subsystem: Server
INV-77 | `setCallNoteFlag(noteId, flagType)` accepts `'urgent'` as a card-level toggle (Round 2 deferred 8e). Urgent bypasses the `FlagType` column entirely (`sanitizeFlagType_` still rejects it, INV-37 preserved) — toggles membership in `subformData.flags` only. `action`/`training`/`review`/`''` paths still flow through `FlagType` + reset `Resolved` on transition (INV-40); after writing `FlagType` the new primary value is also mirrored into `subformData.flags` (pruning conflicting `CN_FLAG_TYPES` entries but preserving `'urgent'`) so the form's multi-flag state stays consistent with the column | Subsystem: Server
INV-78 | URL query params (`?compact=1`, `?tool=<tabKey>`, `?prefill=...`) are passed from `doGet` to the client via template evaluation (`tpl.serverQueryParams = e.parameter`) and exposed as `window.SERVER_QUERY_PARAMS` in `index.html`'s `<head>`. `__URL_PARAMS` in `script_core.html` reads from `SERVER_QUERY_PARAMS` first, falls back to `window.location.search` for local dev. Required because Apps Script's HtmlService iframe sandboxes `window.location.search` to the iframe's own URL — the user-facing deploy URL's query string is never visible to client JS through that path. The injected JSON is `<` → `<` escaped to prevent XSS via attacker-controlled query values containing `</script>`. Also applies to `form_public.html`'s `FORM_TOKEN` injection via `serveExternalForm_` (`tpl.formToken`): it uses the same unescaped `<?!=` print with the `<`→`<` guard — the escaping `<?=` mangles the token's JSON quotes, breaking the public form ("Form not found"). A related foot-gun: the literal scriptlet delimiters (`<?`/`?>`) or a literal `</script>` written inside a JS *comment* in these templates open a spurious scriptlet at `tpl.evaluate()` (the template engine ignores JS-comment boundaries), throwing a server-side "Unexpected token" — so comments must not contain those literals. The same injection path now also carries `window.SERVER_WEB_APP_URL` (the canonical `/exec` base from `getWebAppExecUrl_`) — `window.location.origin+pathname` inside the iframe is the session-bound googleusercontent URL, which renders BLANK as a top-level window and broke the pop-out until fixed; `popOutCurrentView` must use `SERVER_WEB_APP_URL` (Node-pinned). Pinned by `test_tpl_formToken_usesUnescapedScriptlet` + `test_tpl_noEscapedJsonInjection` + `test_tpl_formPublic_evaluatesWithoutError` (the last actually `.evaluate()`s the template, catching the comment-delimiter case) | Subsystem: Server + Client (shell)
INV-79 | Resizable sidebar width persists to `localStorage.umsSidebarW` (range 56–280px on restore — out-of-range values fall back to the default). Default 168px; snap threshold 100px determines the collapsed (icon-only) state. `initResizableSidebar_` sets `--sidebar-w` on both the `.sidebar` element AND `documentElement` so the `.app-shell` grid template recomputes. `.sidebar.collapsed` hides `.sb-lbl` labels + brand sub-name + user info text + section labels via CSS | Subsystem: Client (shell)
INV-80 | Time / PTO mode (`localStorage.umsMergeMode`, `'timeoff'` \| `'timesheet'`, default `'timeoff'`) persists across reloads. `'timeoff'` mode renders the `.pto-tile` + upcoming-requests in the side rail; `'timesheet'` mode lazy-loads tsData via `loadTimesheetSideRail_` (its own `getTimesheetData` call; the legacy `loadTimesheet` cluster was deleted in Cycle 2 · L11 — INV-74) and renders a pay-period `.pto-tile` mirror + recent-activity list. The TOOLS registry tab key stays `'timeoff'` even though the label changed to `'Time / PTO'` so `?tool=timeoff` deep-links + `currentView === 'timeoff'` guards keep working | Subsystem: Client (Time Clock views)
INV-81 | The Clock view's coverage-strip "File N missing" CTA fires `fileMissingCalls_(date, missingCount)` which sets `window.CLK_NAV_HINT { source: 'coverageStrip', date, missingCount }` before calling `enterTool('callNotes')`. `cnConsumeNavHint_` on Log-view enter reads + nulls the hint and surfaces a confirmation toast. Per-call CDR data doesn't exist today (DQE Historical Data is per-(agent, date) aggregated only), so unmatched call IDs can't be passed via the hint yet — when a per-call source lands, extend the hint with `hint.calls[]` for prefill | Subsystem: Client (Time Clock views) + Client (Call Notes views)
INV-82 | Tag taxonomy admin endpoints (`renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`) are manager-gated (INV-02) and acquire `LockService.getScriptLock` with `waitLock(15000)` (INV-01). Rename and merge use `applyTagTransformAcrossReps_` to iterate every enrolled rep's per-rep Sheet and rewrite `subformData.tags[]` in place; dedupe handles the case where the target tag is already present on a note. Archive only mutates the `CN_ARCHIVED_TAGS` Script Property (JSON-encoded array of lowercase tags) — existing note tags are unchanged, so archive does NOT remove the tag from cards already in production. All three write a `CallNoteTagAdmin` audit row (INV-32 extension) with the manager's email + `{action, oldTag/newTag, repsTouched, notesUpdated}` summary. Per-rep Sheet failures are isolated via try/catch in the loop so one broken Sheet doesn't fail the whole rename. All three call `invalidateCnTaxonomyCache_()` after their audit write so the Admin table reflects the change immediately. `getCallNotesTagTaxonomy` returns the `archived` flag on each in-use tag plus an `archivedOnlyTags[]` array for archived tags no longer in active use, and is itself whole-result cached (`CN_TAXONOMY_CACHE_KEY`, 5 min) | Subsystem: Server
INV-83 | `uiConfirm({title?, message?, confirmLabel?, cancelLabel?, tone?})` and `uiPrompt({title?, message?, initialValue?, placeholder?, validator?, confirmLabel?, cancelLabel?})` in `script_core.html` are Promise-returning replacements for `window.confirm` / `window.prompt`. All 14 native-dialog callsites across `tc/script_clock.html`, `tc/script_manager.html`, `tc/script_timeoff.html`, and `cn/script_callnotes.html` are converted — no `window.confirm` / `window.prompt` usage remains in the codebase. Esc + click-outside resolve `false`/`null`; Enter on a confirm fires OK unless the Cancel button is focused (a keyboard user who Tabs to Cancel and presses Enter gets cancel — confirming from Cancel fired destructive actions until fixed); Enter inside the prompt input submits. `tone:'danger'` paints the OK button destructive via `.ui-dialog-ok.is-danger`. `validator` on uiPrompt returns an error string and the dialog shows it inline WITHOUT closing so the rep can fix and retry. A `resolved` sentinel inside each helper prevents double-resolution if Esc + click-outside fire in quick succession. Multi-statement continuations are extracted into helpers (`cnDoDeleteNote_`, `cnDoToggleFlag_`, `cnDoSelfUndo_`, `handleBulkActionConfirmed_`) so click-handler signatures stay synchronous from the dispatcher's perspective | Subsystem: Client (shell)
INV-84 | `cnRenderComposerTabStrip_(active, noteId)` renders a shared Department | External segmented control prepended to both the department composer (`cn-compose-overlay`, in both `cnRenderComposerFormStep_` + `cnRenderComposerPreviewStep_`) and the external composer (`cn-ext-overlay`, in `cnBuildExternalEmailHtml_`). `cnSwitchComposerTab_(target)` captures the active composer's noteId from `CN_STATE.composer` / `CN_STATE.extComposer`, closes the active modal (clearing its state slot via the close handler), and opens the target modal preserving the noteId. The Department tab is disabled when no noteId is in scope — a dept email needs a saved note to stamp EmailedAt/EmailDepartments — and `cnSwitchComposerTab_` guards defensively with a toast if the disabled state is bypassed | Subsystem: Client (Call Notes views)
INV-85 | `getCdrAgentMetrics_()` cache key includes an MD5 hash of the sorted roster-names array via `cdrRosterHash_()` so that different roster filters for the same date range don't collide. Cache payload size is logged at 90KB as a warning (Apps Script CacheService limit is 100KB). Cache key prefix is versioned (`CDR_CACHE_KEY`, currently `cdr_metrics_v2`); bump on any aggregation-rule change | Subsystem: Server
INV-86 | `getCdrNameMap_()` reads the `Agent Alias Overrides` sheet from the CDR Report spreadsheet (same sheet written by `call-data-reporting`'s `OrphanFix.gs`). Returns `{ oldName → canonicalName }` for active aliases. Cached in-memory for `CDR_CACHE_TTL` seconds. Used by both `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()` to resolve CDR agent names that don't directly match the team-tools roster. Missing or empty sheet degrades gracefully (empty map) | Subsystem: Server
INV-87 | `validateCdrColumns_()` reads row 1 of `DQE Historical Data` on first CDR access per script session and asserts that expected column names (from `CDR_EXPECTED_HEADERS`) appear at the expected 1-indexed positions. Mismatches are logged via `Logger.log` and surfaced in `meta.columnWarning` on the response — non-blocking. Column names are matched case-insensitively via `indexOf`. Validation runs at most once per session (`_cdrColumnsValidated` flag) | Subsystem: Server
INV-88 | `getMetricsAmbient()` is manager-gated (INV-02), read-only, 5-min cached under a threshold-suffixed key (`metrics_ambient_v1:<threshold>`) so editing `CONFIG.CDR_ALERT_THRESHOLD` takes effect on the next poll instead of serving a stale badge for up to 5 min. Returns `{ badge: { type: 'warn', label: 'XX.X%', date } }` when yesterday's (weekday only) team answer rate is below `CONFIG.CDR_ALERT_THRESHOLD` (default 85%), else `{ badge: null }`. The client polls every 5 minutes via `mStartAmbientPolling_()` (started on shell render regardless of active tool, but only for managers — `mStartAmbientPolling_` early-returns for non-managers since the badge is manager-only, F13) and renders an `.m-alert-badge` pill on the Metrics sidebar icon | Subsystem: Server + Client (Metrics views)
INV-89 | `buildCallNoteEmailHtml_` HTML-escapes every user-supplied note field via `esc_` before assembling the email body. The email-preview modal injects that body raw via `innerHTML` (the `${p.htmlBody}` slot in `cnRenderComposerPreviewStep_`), so the escaping is load-bearing — a new field added to the builder without `esc_` is stored XSS in the preview and the sent email. Pinned by `test_cn_buildEmailHtml_escapesUserFields` | Subsystem: Server + Client (Call Notes views)
INV-90 | `getFormSubmission(token)` is caller-scoped, read-only: it requires `getEmployeeInfo_()` (NOT a public endpoint) and returns submission data only when the calling employee's email matches the token's `FormTokens.CreatedBy` — a rep cannot read another rep's form submissions. Returns `{ submitted: false, status }` when the token isn't completed yet. Pinned by `test_cn_getFormSubmission_callerScoped` | Subsystem: Server
INV-91 | `managerGetFormSubmission(repEmpId, token)` is manager-gated (INV-02), read-only, and scoped to the target rep — the token must have been created by `repEmpId` (`FormTokens.CreatedBy`), so a manager can only view submissions for forms the selected rep sent. Shares `buildFormSubmissionResult_` with the caller-scoped `getFormSubmission` (INV-90). Surfaced via the form pill on the Team Notes Per-Rep read-only card. Pinned by `test_cn_managerGetFormSubmission_gatedAndScoped` | Subsystem: Server
INV-92 | `getCallNotesAuditLog(filters)` and `getCallNoteAuditHistory(noteId)` are manager-gated (INV-02), read-only over the shared AuditLog. Both read via the bounded tail helper `cnReadCallNoteAuditRows_` (at most `CN_AUDIT_MAX_SCAN`=4000 most-recent rows — the log is append-only/chronological — keeping only the `CN_AUDIT_ACTIONS` set; timestamp cells are recovered via `normalizeAuditTs_` since Sheets coerces them to Dates). The search filters by rep / action / date range (default start = last `CN_AUDIT_DEFAULT_DAYS`=30 in the manager tz; default END = today in `CONFIG.TIMEZONE` — the tz audit rows are stamped in, so IST-stamped rows written "tomorrow" relative to the US-afternoon manager aren't silently hidden), caps results at `CN_AUDIT_MAX_RESULTS`=500, and returns `truncated:true` when the result cap is hit or the scan window didn't reach the requested start date. History returns every row carrying the `noteId` (parsed from the Notes field), oldest-first, independent of any date filter. Returned rows are PHI-free — note content never enters the AuditLog (INV-32); the client deep-links a row's `noteId` to the Team Notes Per-Rep view for content. Pinned by `test_auditPanel_searchAndHistory` + the gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server
INV-93 | `saveEmailTemplates(templates)` is manager-gated (INV-02, INV-57), persists to Script Property `CN_EMAIL_TEMPLATES` (JSON array of `{name, recipientType, body}`), validates each entry (non-empty name + body, `recipientType ∈ customer|provider|any`, count ≤ `CN_EMAIL_TEMPLATE_LIMIT`=50, body ≤ `CN_EMAIL_TEMPLATE_BODY_MAX`=4000), and writes an `AdminConfigChange` audit row. `getEmailTemplates_()` reads the property first (CONFIG fallback), sanitizing on read so a corrupt blob degrades to the fallback rather than throwing. Templates are exposed to reps via `getCallNotesDepartments` (rep-callable) for the external-email composer picker, and to managers via `getAdminConfig` for the editor | Subsystem: Server
INV-94 | `submitTimeOffRequest` and `managerSubmitTimeOff` reject a request when the employee already has a Pending or Approved row for that date (`hasActiveTimeOffOnDate_`, inside the existing ScriptLock). Prevents the double-deduct that INV-03's per-row transition guard cannot catch — two sibling rows for one day would each deduct on approval. Denied/cancelled rows don't block a re-request | Subsystem: Server
INV-95 | Both time-off submit paths validate `type` against `TIME_OFF_TYPES` via `isValidTimeOffType_` (case-insensitive, trimmed) before any write; an unknown/empty type is rejected rather than silently defaulting to `getLeaveDeduction_`'s annual/1.0 (INV-17). `TIME_OFF_TYPES` must stay a superset of the `day-type` `<select>` options in `modals.html` — pinned by a Node-harness coupling test. `TIME_OFF_TYPES` NO LONGER contains `'Sick Leave'` (deferred #2): the day-type `<select>` dropped it too (still ⊆), so no new sick request is creatable via the UI or a direct RPC; the sick BUCKET machinery is intentionally retained for legacy reverts (INV-17/INV-72) | Subsystem: Server
INV-96 | `submitFormByToken` (public, token-only) bounds the recipient-supplied payload before the append: field count ≤ 200 and per-cell char length ≤ 45000 (under the 50k Sheets cell limit) for both the data JSON and the signature. On exceed it returns a specific error and leaves the token `pending` for retry, rather than throwing mid-write; also caps the number of arbitrary keys an unauthenticated caller can persist. Defense-in-depth (B5): `form_public.html`'s `SIG_PAD.toDataURL` downscales the signature EXPORT to ≤ 600px wide (the capture canvas is `rect.width * devicePixelRatio`, large on retina/mobile) so a legitimate signature's base64 stays well under one cell and never trips this cap — capture stays full-res for smooth drawing. A B5 "store the signature in Drive" alternative was deliberately NOT built: it would split a HIPAA-attested append-only record (§164.312(c)) across two stores and require integrating the destructive `purgeExpiredFormData` to avoid orphaned PHI in Drive — disproportionate risk for a cap that the capture-side downscale already keeps from biting | Subsystem: Server + Client (public forms)
INV-97 | Feature toggles are gated by the `FEATURE_FLAGS` registry (`Code.js`): only registry keys are honored. `getFlag_(key)` reads Script Property `CN_FEATURE_FLAGS` first (sanitize-on-read: corrupt/non-object blob → registry defaults; unknown key → `false`), else the registry default (which mirrors the legacy CONFIG constant, so migrating a read to `getFlag_` is a behavioral no-op until a flag is set). A flag's `scope` decides enforcement: `client` flags only gate UI (delivered via `getEmployeeState` `empState.flags` + `getCallNotesDepartments` `deptConfig.flags`, read client-side via `flagOn_()`); `server`/`both` flags are ALSO enforced in their endpoint — hiding a button never disables an endpoint (INV-02/S30 preserved). Flags are consulted at request boundaries, never mid-transaction | Subsystem: Server + Client (shell)
INV-98 | `getFeatureFlags` and `saveFeatureFlags` are manager-gated (INV-02/INV-57 family). `saveFeatureFlags` accepts only registry keys with strict-boolean values (unknown key or non-boolean → rejected, never persisted), writes the `{key:bool}` map to Script Property `CN_FEATURE_FLAGS`, and records an `AdminConfigChange` audit row with the manager's email. `danger`-marked flags (`voiceInput` HIPAA/BAA, `enablePtoTracking` stateful) are gated behind a `uiConfirm({tone:'danger'})` in the Admin UI before save | Subsystem: Server + Client (Call Notes views)
INV-99 | `getPtoReconciliation` is manager-gated (INV-02) and strictly read-only — it never writes a balance or a sheet. It detects reps with >1 Approved time-off row on the same date (the H1 double-deduct signature) and quantifies the over-charge per bucket as `actual − expected`, where expected per date is the single largest deduction. Returns only reps with drift. Correction is performed by the mutating companion `fixPtoReconciliation` (INV-102), NOT by this read endpoint. Pinned by `test_getPtoReconciliation_detectsDoubleDeduct` + `_nonManagerRejected` | Subsystem: Server
INV-100 | `getCallNoteTagSuggestions` is rep-callable (requires `getEmployeeInfo_`), caller-scoped, and read-only: it returns only the calling rep's own unique, non-archived (`getArchivedTagsSet_`) tags via a column-bounded read of their own Sheet's `SubformData` column (INV-46-style). Not enrolled → `{tags:[]}`, never throws. No cross-rep data is read or returned. Feeds the Log-view tag-autocomplete `<datalist>`; every option is `esc()`'d client-side before `innerHTML` | Subsystem: Server + Client (Call Notes views)
INV-101 | `notifyRepOfFailedSubmission_` (B2) is best-effort (try/catch, INV-14) and fired by `submitFormByToken` only on a size-cap rejection (INV-96); it emails the token's `CreatedBy` so a silently-rejected recipient submission is visible to the sending rep. It never throws and never blocks the recipient's error response; a missing `createdBy` is a no-op. The notice is PHI-free beyond the recipient address the creating rep already holds | Subsystem: Server
INV-102 | `fixPtoReconciliation(empId)` is manager-gated (INV-02) and locked (INV-01) — the mutating companion to the read-only `getPtoReconciliation` (INV-99). Per date with >1 Approved row it keeps the single largest deduction and sets the extra Approved rows' status to `'Reconciled'` (every status reader — dashboard counts, calendar, the reconciliation scan, the INV-94 dup-guard — treats `'Reconciled'` as non-Approved), then credits the SERVER-recomputed over-charge back to the balances via `adjustLeaveBalance_` (positive delta; never trusts a client amount). Idempotent by construction: the neutralized rows are no longer `'Approved'`, so a re-run finds no duplicates and credits nothing (returns `fixed:false`). Writes a `PtoReconciliationFix` audit row with the manager's email. Pinned by `test_fixPtoReconciliation_creditsAndIdempotent` + `_nonManagerRejected` | Subsystem: Server
INV-103 | `setCallNoteManagerComment(repEmpId, noteId, message)` (item 9) is manager-gated (INV-02) and locked (INV-01). It appends a `{role:'manager', kind:'comment', message, at, by}` entry to `subformData.feedback[]` on ANY of the rep's notes — not just training-flagged — reusing the Q&A thread (`cnRenderQAThread_`, now rendered for any note with a thread). Writes a PHI-free `CallNoteManagerComment` audit row (noteId only). `appendCallNoteFeedback` was relaxed so the rep can ack/clarify on any note that already has a feedback[] thread (training-flagged OR manager-commented), not training-only | Subsystem: Server + Client (Call Notes views)
INV-104 | `purgeOldCallNotes` (item 7) is a top-level trigger handler reachable via google.script.run, so it calls `assertManagerCaller_` (INV-44 family) and is locked (INV-01). It deletes per-rep `Notes` rows older than `CN_NOTE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS`, default 0 = disabled; irreversible PHI delete). Cross-rep; per-rep Sheet failures are skipped; writes a PHI-free `CallNotesPurge` audit row. The note date is read from `CN.DATE_LOCAL` via `parseRetentionDateMs_` (handles the Sheets Date coercion). Pinned by `test_triggerGate_purgeOldCallNotes_nonManagerThrows` | Subsystem: Server
INV-105 | Automated notification emails route their HTML through `buildBrandedEmailHtml_(heading, bodyHtml, opts)` (item 2), which `esc_`'s the heading; callers MUST `esc_` any user data placed in `bodyHtml` (same INV-89 discipline), and `brandedKvRows_` `esc_`'s both label and value. Converted senders keep a plain-text `body` fallback alongside `htmlBody`: `notifyEmployeeOfDecision_`, `sendDailyMissedPunchAlerts` (employee + manager digest), `notifyManagerOldAdjustment_`, `notifyManagerTrainingQuestion_`, and `sendAutomatedExport_` (all three branches — error / success-with-attachment / catch). `sendAutomatedExport_` keeps its `.xlsx` `attachments: [blob]` on the success email alongside the new `htmlBody` + plain `body` | Subsystem: Server
INV-106 | `submitPunchAdjustRequests(requests[])` (#4a) is caller-scoped + locked and writes only Pending rows (no punch). It is ATOMIC — every entry is validated (date `^\d{4}-\d{2}-\d{2}$`, time `^([01]\d|2[0-3]):[0-5]\d$`, `punchType ∈ PUNCH_LABELS_`, not future, ≤ `ADJUST_WINDOW_DAYS`, reason required beyond `OLD_ADJUST_ALERT_DAYS`) and the WHOLE batch is rejected if any entry fails (max 20). Duplicate-guarded: the batch is rejected when two entries target the same (date, punchType), or when the employee already has a `Pending` row for that (date, punchType) awaiting approval — preventing the queue from accumulating sibling requests that a manager could double-approve. Each Pending row gets a UUID `ReqId`. Writes a `PunchAdjustRequest` audit row. Pinned by `test_punchAdjust_batchInvalidRejected` + `test_punchAdjust_duplicatePendingRejected` | Subsystem: Server
INV-107 | `managerGetPendingAdjustments` + `updatePunchAdjustStatus(reqId, newStatus)` (#4a) are manager-gated (INV-02); the latter is locked (INV-01) and transition-guarded (acts only on a `Pending` row). Approve writes the single `ADJ-{punchType}` punch for the TARGET employee via `writeAdjustPunchForEmployee_` (find-existing-of-that-type-for-date → update, else append; + `writeToEmployeeSheet_` personal-sheet mirror; `ADJ-` convention INV-09; `normalizeTime_` reads INV-26) and an `ADJ-` audit row with the manager as actor — it must NEVER reuse `managerSaveDay` (full-day reconcile would delete other punch types). Approve also re-checks the adjust window AT APPROVAL TIME (in the target employee's tz): a request that has aged past `ADJUST_WINDOW_DAYS` while sitting in the queue is rejected with a deny-it message instead of writing a punch the employee could no longer request — the window is enforced at both submit and approve. Deny marks `Denied` + writes a `PunchAdjustStatusChange` audit row, no punch (and is allowed regardless of age). Pinned by `test_punchAdjust_submitApproveWritesPunch` + `_nonManagerRejected` + `test_punchAdjust_approveAgedPastWindowRejected` | Subsystem: Server + Client (Time Clock views)
INV-108 | `managerSaveDayRange(empId, fromDate, toDate, slots, reason)` (#4b) is manager-gated (INV-02), locked (INV-01), span-capped (≤31 days), and window-bounded (no future date; none beyond `ADJUST_WINDOW_DAYS`; reason required if the oldest date is beyond `OLD_ADJUST_ALERT_DAYS`). It applies each NON-EMPTY slot to every date in the inclusive range via `writeAdjustPunchForEmployee_` — purely ADDITIVE (set/update that punch type only), so a blank slot is left untouched and other punch types are never deleted. It must NOT reuse `managerSaveDay` (full-day reconcile deletes blank slots). The immediate employee adjust path (`recordPunch` `custom`) is gated for non-managers by the `employeeImmediateAdjust` flag (default off). Pinned by `test_managerSaveDayRange_appliesAcrossDays` + `_nonManagerRejected` + `test_recordPunch_immediateAdjustGatedByFlag` | Subsystem: Server + Client (Time Clock views)
INV-109 | `reconcileCallNotes` (#8) is manager-gated (INV-02) and locked (INV-01). It scans every enrolled rep's `Notes` tab and, for rows with content but NO `noteId` (hand-entered directly in the Sheet), backfills a UUID `noteId` + a `Timestamp` + a yyyy-MM-dd `DateLocal` (derived from the human's values, else rep-tz now/today via `safeTimezone_`/`normalizeDate_`) so the row becomes flaggable/searchable/coverage-counted. Content columns are NEVER modified. Idempotent (a row with a `noteId` is skipped → re-run is a no-op). Per-rep Sheet failures are skipped; writes a `CallNotesReconcile` audit row. Runs both manually (Admin → "Reconcile Sheets") and as a daily manager-tz 5am trigger wired by `installAutomationTriggers`; the `isManager`-returns-`{error}` gate (not `assertManagerCaller_`) passes in a trigger context because the installer is a manager. Pinned by `test_reconcileCallNotes_backfillsHandEntered` + `_nonManagerRejected` | Subsystem: Server + Client (Call Notes views)
INV-110 | `provisionCallNotesSheet(repEmpId)` (auto-provision) is manager-gated (INV-02) and locked (INV-01, mutates the Employees sheet). It `SpreadsheetApp.create`s a fresh per-rep Sheet owned by the deploying account (the web app runs as `USER_DEPLOYING`), pins the new Sheet's timezone to the ADP sheet's (the `normalizeDate_` DateLocal round-trip only holds when the coercing sheet shares the ADP tz), renames the default sheet to the `Notes` tab + writes the canonical `CN_HEADERS` header, writes the new spreadsheet ID into `EMP.CALL_NOTES_SHEET_ID` (column L) of the rep's roster row, calls `invalidateRosterCache_()` (INV-10), and writes a `CallNotesProvision` audit row with the manager's email. **Idempotent / no-clobber:** a rep who already has a non-empty `callNotesSheetId` is returned `{success, alreadyEnrolled:true, sheetId}` unchanged — it NEVER creates a second Sheet or overwrites column L (that would orphan the rep's note history). The companion read-only `getCallNotesEnrollment` (manager-gated) returns `{enrolled[], unenrolled[]}` for the Admin enrollment panel. Pinned by `test_provisionCallNotesSheet_nonManagerRejected` + `_idempotentNoClobber` (the create branch is exercised manually to avoid littering Drive in CI) | Subsystem: Server + Client (Call Notes views)
INV-111 | The Intake send endpoints (`intakeSendPPD`, `intakeSendPMD`, `intakeSendPAP`) require an enrolled rep (`getEmployeeInfo_`), build the email body server-side with every user field `esc_`'d (INV-89 discipline; pinned by `test_intake_buildPpdBody_escapesAnswers`), and re-render + hash-check the patient-answer body against the `expectedBodyHash` returned by the matching `intakePreview*` — the hash is REQUIRED (a send without one is rejected, so a direct RPC can't bypass the preview gate — L2 parity with `emailFromCallNote`) and the send is rejected when the form changed since preview (INV-41 pattern; selections/images ride at send and are NOT part of the hash). Patient answers persist to the append-only per-form submission tab in `INTAKE_SS_ID`; the shared AuditLog `IntakeSent` row is PHI-free (`type`, `submissionId`, recipient **domain** only — never the patient name or recipient address, same discipline as the `ExternalEmailSent` row). Recipients are resolved server-side via `intakeResolveRecipient_` (roster id→email, dept default, or validated custom), so agent addresses never reach the client | Subsystem: Server + Client (Intake views)
INV-112 | `intakeFilterRecommendations_(answers, allProducts)` is a PURE, self-contained port of the bound tool's recommendation engine — `answers` keyed by bare question number (`'38'` weight, `'43'` neuro, `'31a'` stroke, `'34'` amputation, `'33'` ulcers, `'32'` spasticity, `'35'` spine, `'36'` swelling, `'30'` catheters, `'44'` oxygen, `'25'` numbness, `'13'` falls); `allProducts` is the raw `Offerings!A2:F` 2D array. It applies weight-cap, solid-seat/captain, Group-3/SPO/MPO eligibility, the `K0856→K0861` / `K0843→K0862` neuro substitutions, and justification building. Pinned by `test_intake_engine_*` (Tests.js) + the Node harness (`intake — PPD engine`). The PMD/PAP email STRUCTURAL layout (`INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT`, server-authoritative) is mirrored by the client render layouts (`INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`) for input rendering only; the two are pinned equal by the Node coupling tripwire (`intake — client render layout mirrors the server`) — same parallel-source discipline as `LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_` | Subsystem: Server + Client (Intake views)
INV-113 | `submitFormByToken` (public, token-only) extracts `signature` AND `_meta` before persisting responses, **server-enforces consent** (requires `_meta.consentAgreed === true`; an absent `_meta` is rejected — the prior back-compat tolerance let a hand-crafted payload skip the consent record entirely), stamps the server-authoritative `CONFIG.FORM_CONSENT_VERSION` (never a client-sent version), and writes a tamper-evident `SubmissionHash` (`computeFormSubmissionHash_` over responses+signature+token+consentVersion — NOT `submittedAt`, which Sheets may coerce to a Date) + a `Certificate` JSON into trailing `FS` columns. The `FormSubmissionReceived` audit row carries `hash=` + `submittedAt=` as the append-only independent witness. `verifyFormSubmissionIntegrity_(token)` (manager-gated, read-only) recomputes + compares; a legacy row with no stored hash returns `match:null` (not a failure). `FS_HEADERS` grew by TRAILING columns only (back-compat like `CN_HEADERS`). `FormSubmissions` remains **append-only — no edit endpoint exists** (the immutability is a HIPAA §164.312(c) integrity control, and the hash makes any out-of-band alteration detectable) | Subsystem: Server + Client (public forms)
INV-114 | `getFormsSS_()` resolves the forms PHI store: Script Property `FORMS_SS_ID` first (segregates PHI off the ADP/payroll sheet — point it at `INTAKE_SS_ID`), else `getAdpSS_()` for back-compat; honors `_TEST_OVERRIDE_FORMS_SS_ID`. Both `getOrCreateFormTokensSheet_` / `getOrCreateFormSubmissionsSheet_` (and therefore `submitFormByToken`, `getFormByToken`, `serveExternalForm_`, the viewers, and `purgeExpiredFormData`) route through it, so the location is a single point of change. The invite-email builders (`buildCustomerEmailHtml_`/`buildProviderEmailHtml_`/`*Text_`) take only `(recipientName, message, formNames, formLinks)` and never read prefill — patient identifiers stay in the token, never the cleartext email body. Pinned by the `forms — invite email builders` Node guard | Subsystem: Server + Client (public forms)
INV-115 | `kbConvertDriveDoc({itemId | driveUrl})` is **admin-gated** (`emp.isAdmin`, `'Admin access required.'` — KB content authoring, INV-136; was manager-gated) and strictly READ-ONLY — it never writes a KB row or modifies the Drive Doc; persisting the converted article happens only through the existing `kbSaveItem` after manager review in the editor. The `itemId` path accepts only `type=embed` + `driveKind=doc` rows; the `driveUrl` path accepts only URLs `kbParseDriveUrl_` resolves to `kind=doc`. The converter emits ONLY the `kbMd_`-renderable subset (bold+italic→bold, link `()`/whitespace percent-encoded, `[]` stripped from link text, non-http(s)/mailto links demoted to plain text; tables → GFM with row 0 as header and `\|`-escaped literal pipes) and reports lossy conversions (drawings, nested tables, multi-line cells, skipped elements) as `warnings[]` rather than silently dropping content — pinned by a Node round-trip tripwire that renders the converter's GFM through `kbMd_`. Phase 2b: `INLINE_IMAGE`s emit `kbdoc:<fileId>:<n>` tokens (the converter remains read-only); `kbSaveItem` resolves them at save via `kbResolveDocImages_` — Doc re-walk in converter order (`kbCollectDocInlineImages_`, a mirrored-walk pair pinned by a Node test), idempotent export to the `KB_IMAGES_FOLDER_ID` Drive folder (deterministic `kbdoc-<fileId>-<n>` names, reused on re-save), token → thumbnail-URL swap, per-token degradation to the italic placeholder on any failure. Resolution runs OUTSIDE the ScriptLock; the lock wraps only the sheet write. The Doc is opened with the deployer's access (DocumentApp) — same trust boundary as embedding it. Pinned by the `kb — Doc→markdown converter` Node stub tests + the `kbConvertDriveDoc` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-116 | `intakeListMySubmissions()` / `intakeGetSubmission(formType, submissionId)` (the Intake Sent tab) are read-only and caller-scoped: a rep sees only rows whose stored `repId` matches their own; a manager sees all (parallels INV-90/91). The list is metadata-only (id, timestamp, rep, patientInfo, language, recipient — never the answers JSON), newest-first, capped at `INTAKE_LIST_CAP_`=100, and skips an unreachable form-type tab rather than failing the whole list. The detail is a bounded lookup — id-column scan, then one full-row fetch — and parses the answers/recommendations/selections JSON defensively (corrupt blob → `{}`). Timestamps and the ACCT dob cell route through Date-coercion guards (`intakeTsString_`). The submission tabs remain APPEND-ONLY — no edit endpoint exists. Pinned by `test_intake_sentViewer_callerScopedAndManager` | Subsystem: Server + Client (Intake views)
INV-117 | `kbRecordView(itemId, context)` is rep-callable (requires `getEmployeeInfo_`), locked (INV-01), and append-only — one PHI-free row (timestamp, itemId, repId, sanitized context) per open into the `KbViews` tab of the KB spreadsheet; it never reads or returns other reps' data. The client fires it best-effort (fire-and-forget) so a failure never blocks or surfaces in the reading UX. `kbGetUsageStats()` is manager-gated (INV-02/31), read-only, bounded (last `KB_VIEWS_MAX_SCAN`=4000 rows), windowed to `KB_USAGE_WINDOW_DAYS`=30, and joins titles from the KB sheet so deleted items drop out; timestamp cells are recovered in the KB spreadsheet's OWN tz (the tz that coerced them — same discipline as `normalizeAuditTs_`). Pinned by `test_kb_recordView_requiresEmployee` + the `kbGetUsageStats` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-118 | `kbUploadImage(dataUrl)` (KB Phase 3) is **admin-gated** (`emp.isAdmin`, `'Admin access required.'` — KB content authoring, INV-136; was manager-gated) and validates BEFORE any Drive work: data-URL shape via the pure `kbParseImageDataUrl_`, content-type whitelist `KB_IMG_UPLOAD_TYPES` (PNG/JPEG/GIF/WebP — SVG deliberately excluded, it's script-capable), and the `KB_IMG_UPLOAD_MAX_CHARS` (~3MB) cap mirrored client-side. On success it writes one file to the `KB_IMAGES_FOLDER_ID` folder (`kbpaste-<stamp>-<rand>`), writes a PHI-free `KbImageUpload` audit row with the manager as actor, and returns the Drive thumbnail URL. Deliberately NO ScriptLock — a Drive-only atomic write; holding the global lock through a multi-second upload would stall every punch/note write. Pinned by `test_kb_uploadImage_rejectsInvalidPayloads` + the `kbUploadImage` case in `test_managerGates_rejectNonManager` + the `kbParseImageDataUrl_` Node test | Subsystem: Server + Client (Reference views)
INV-119 | **No free text ever enters the KB AI vendor payload.** `kbGetFacetGuidance(facets)` (Phase A) is rep-callable (requires `getEmployeeInfo_`), gated server-side by the `kbAiGuidance` feature flag (scope `both`, default OFF, danger-marked), and best-effort — every failure path (flag off, no facets, thin retrieval, missing `KB_AI_API_KEY`, daily cap reached, vendor error) returns `{ none: true, reason }` and never throws to the client. The privacy boundary is `kbAiSanitizeFacets_`: every facet is whitelist-validated against server-side vocabularies (departments ∈ `getDepartmentEmails_()` keys; update types ∈ `UPDATE_SUGGESTIONS_DEFAULT` ∪ `getUpdateSuggestions_()`; flag ∈ `CN_FLAG_TYPES`+`urgent`; tags ∈ the CALLER's own established tag vocabulary from `getCallNoteTagSuggestions` — a novel tag typed this minute is DROPPED, never sent), and the prompt builder `kbAiBuildPrompt_(clean, chunks)` takes ONLY the sanitized facets + our own PHI-free-by-policy KB chunk excerpts — there is no parameter through which free-typed note text or patient data can reach the wire. Retrieval reuses `searchReference` over `kbAiQueryTerms_(clean)` with a score floor (`KB_AI_SCORE_FLOOR` — thin matches never hit the API and the none is cached). Results cache org-wide (`KB_AI_CACHE_PREFIX`, 6h) keyed by generation salt (`KB_AI_GENERATION`, bumped by `invalidateKbCache_` on every KB save/delete) + MD5 of the canonical order-insensitive facet string (`kbAiCanonicalFacets_`). Spend: each vendor call is costed from usage tokens via `KB_AI_MODEL_PRICES` (unknown model → most expensive known rates, the cap can never be undercounted) into the `KB_AI_SPEND` daily counter; at `KB_AI_DAILY_CAP` (default $3, Admin-adjustable) the endpoint returns none until the date rolls. Each vendor call writes a PHI-free `KbAiGuidance` audit row (canonical facets + model + cost). `saveKbAiSettings` (manager-gated, INV-57 family) validates cap 0–100 + model ∈ `KB_AI_MODEL_PRICES` and persists `KB_AI_DAILY_CAP`/`KB_AI_MODEL`; the API key is NEVER settable or readable through any endpoint. Pinned by the `kb — AI Phase A` Node tests (whitelist / canonical hash / prompt / source tripwire) + `test_kbAi_gatesAndSettingsValidation` + the `saveKbAiSettings` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-120 | Training T1 endpoints follow the established families: `getMyTraining` / `markTrainingComplete` are caller-scoped (the rep's own assignments/completions only; complete requires a LIVE effective assignment — `'kb:'+itemId` in `trainEffectiveForEmp_` — so a rep can't write completion rows for unassigned items, and is idempotent on an already-complete item); `markTrainingComplete` / `saveTrainingAssignment` / `revokeTrainingAssignment` are locked (INV-01); the three manager endpoints are gated (INV-02). `TrainingCompletions` is append-only; `TrainingAssignments` rows are never deleted — revoke sets `RevokedAt`. Completion semantics: an item is complete iff some completion row's `CompletedAt` is STRICTLY after the latest non-revoked matching assignment row's `AssignedAt` (re-assign = reset, the re-certification mechanism; `'*'` rows match every employee). All four timestamp/date cells are Sheets-coercion-guarded (`trainCellTs_`/`trainCellDate_`, recovered in the KB spreadsheet's OWN tz — the normalizeAuditTs_ discipline; lexicographic compare = chronological). Status derivation is the pure `trainDeriveStatus_` (Node-pinned), shared by checklist + dashboard; "today" is the rep's roster tz in `getMyTraining` (F6 discipline) and manager tz in the dashboard. Audit rows `TrainingAssign`/`TrainingRevoke`/`TrainingComplete` are content-free (itemId/assignId/counts only). Assignment notifications are best-effort per-recipient (INV-14). Training dashboards are deliberately NOT team-scoped (every manager sees all reps, matching managerGetShiftStats); only the T3 Employee Docs carry per-team scoping. Pinned by `test_training_assignCompleteFlow` + the three gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-121 | **Quiz answer keys never leave the server.** The `Quizzes` tab's `QuestionsJson` (including `correct` indices) is readable only by the manager-gated `getQuizzes` (managers author the keys); the rep-facing `getQuiz` returns ONLY the WHITELIST-built `trainStripQuizForRep_` shape (never a delete-key copy — a missed field can't leak), requires a live `quiz:` assignment (or manager caller), and `submitQuizAttempt` (rep-callable, locked INV-01, assignment-required) grades server-side via the pure `trainGradeQuiz_` and returns only `scorePct`/`passed`/per-question right-wrong booleans — correct options are NEVER revealed, pass or fail (operator decision §9.4; unlimited retries; attempt counts per assignment round ride back for display). A pass appends the `TrainingCompletions` row (`via='quiz'`, once per assignment round — the INV-120 reset semantics apply to attempts too); `QuizAttempts` is append-only and `PerQuestionJson` stores booleans only, never the rep's answers paired with a key. `saveQuiz` validates via the pure `trainValidateQuizDef_` (1–50 questions, 2–6 options, correct in range, passPct 0–100) and bounds the stored JSON under the Sheets cell cap (INV-96 spirit); `deleteQuiz` removes only the quiz row (attempt/completion history stays; orphaned assignments drop off via the title join, same as a deleted KB item). Audit rows `QuizSave`/`QuizDelete`/`QuizAttempt` carry ids/counts/scores — never question text. `importQuizFromForm` (manager-gated, READ-ONLY, review-before-save — FormApp opens the form with the deployer's access; only MC + single-answer checkbox items + their marked correct answers are read; the form is never modified and nothing persists until the manager saves) reuses the same `saveQuiz` validation path on save. Pinned by the `training — quiz` Node tests (validator / grader / strip + the `getQuiz` source tripwire + the `trainParseFormId_` URL parser) + `test_training_quizFlow` + the four gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-122 | **Employee Docs are team-scoped (fail-closed), frozen at issue, and tamper-evident.** All Employee Docs data lives ONLY in the dedicated `HR_DOCS_SS_ID` spreadsheet (`getHrDocsSS_` has NO fallback store — unset property → friendly error, never a silent write to the ADP/KB/PHI sheets), and the `EmpDocs`/`DocSignatures` tabs are EXCLUDED from every retention purge (HR records are keep-forever — the opposite of the PHI-minimization posture). **Scoping:** `getMyDocs`/`getMyDoc`/`acknowledgeDoc` are owner-scoped; manager read access (`getMyDoc`, `getDocsDashboard`, `voidDoc`, `verifyDocSignature`) requires `empDocCanManagerSee_` — caller issued the doc OR caller is the employee's roster `ManagerEmail` (column M); membership in `MANAGER_EMAILS` alone grants NOTHING, and a blank column M NARROWS visibility to owner+issuer (fail-closed, operator decision §9.3). Any manager may ISSUE to any employee (issuing reveals nothing). `acknowledgeDoc` is OWNER-only — managers cannot sign on behalf. **Integrity:** content is frozen at issue (`bodyMd` + `empDocContentHash_` over body+title+type+empId); signing re-verifies the content hash first (a tampered row refuses to sign), bounds the signature payload (INV-96; the pad export caps at 600px — Node-pinned parity with `form_public.html`), and writes an append-only `DocSignatures` row whose `SignatureHash` covers contentHash+empId+docId+signature+ackVersion but NOT the timestamp (Sheets coercion, INV-113 lesson) — the `EmpDocSigned` audit row (`hash=`+`signedAt=`) is the independent witness, and the server-authoritative `EMPDOC_ACK_VERSION` stamps which ack language was shown (bump it when `EMPDOC_ACK_TEXT` changes). `voidDoc` only flips status (never deletes, never edits the frozen body — a correction is a NEW doc; a signed doc keeps its signature row); `verifyDocSignature` recomputes both hashes (legacy/unsigned report explicitly, never as failures) and returns a definitive `tampered` flag (`contentMatch === false || match === false`) so a consumer can't check `match` alone and miss a body-only rewrite (L-4); the client surfaces tamper off that flag, and the append-only `EmpDocSigned` audit row is still the deeper witness. Audit rows `EmpDocIssue`/`EmpDocSigned`/`EmpDocVoid` are content-free (docId/empId/type/hash — never the title or body; the void reason lives only in the scoped HR sheet). Pinned by `test_empdocs_issueSignVerifyFlow` (incl. the fail-closed `empDocCanManagerSee_` cases + tamper detection) + the four gate cases in `test_managerGates_rejectNonManager` + the `empDocValidateIssue_`/`edChipHtml_`/pad-cap Node tests | Subsystem: Server + Client (Training views)

INV-123 | **Training T4 — overdue digest + quiz analytics.** `sendTrainingOverdueDigest` is a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44 family) and best-effort (INV-14 — wrapped in try/catch, never throws). It builds the nudge PER MANAGER: the overdue-TRAINING list is org-wide (training dashboards are NOT team-scoped, INV-120, so every manager sees every rep's overdue training), but the overdue unsigned-DOCS list is TEAM-SCOPED via `empDocCanManagerSee_({email,isManager:true}, doc)` (INV-122 fail-closed — a manager only sees docs they issued or are the employee's roster `ManagerEmail` for). A manager with nothing overdue in their scope is not emailed. `empDocsOverdueAll_` returns `[]` (never throws) when `HR_DOCS_SS_ID` is unset so the training portion still sends. Heartbeat-stamped (`stampDigestLastRun_('trainingOverdue')`); surfaced in the Automation Health "Digest heartbeats" block (stale > 26h). Wired into BOTH `installAutomationTriggers`/`removeAutomationTriggers` TARGETS arrays (the trigger-wiring tripwire pins this). `getQuizAnalytics` is manager-gated (INV-02), read-only, and returns ONLY the per-quiz aggregate from the pure `trainQuizAnalytics_(quizzesMap, attempts)` (attempt counts, distinct reps attempted/passed, pass rate, avg score, avg tries) — no answer keys, no per-question booleans, no per-rep rows, so INV-121's "answer key never leaves the server" boundary is untouched. Pinned by `trainQuizAnalytics_` + the trigger-wiring Node tests, `test_triggerGate_trainingOverdue_nonManagerThrows`, and the `getQuizAnalytics` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-124 | **Metrics anonymized team-avg is cohort-guarded; only aggregates leave the server.** `getMyMetrics` (rep-callable, caller-identified) reads the WHOLE roster's per-rep-per-day matrix (`getCdrDailyBreakdown_().perRepDaily` for DQE + `getCsrTransferPerRepDaily_()` for the separate **`CSR Transfer Historical Data`** tab) to compute a team benchmark, but returns ONLY aggregates: `series.{pctAnswered,answered,missed,attSeconds,transferPct}` as `[{date, own, team, cohort}]`. The `team` value is the pure `metricsTeamAvgSeries_` mean over reporting reps and is **null whenever that day's cohort < `kpiMinCohort` (3)** — so a small team can't be back-solved to an individual (the #5 privacy boundary). No individual rep's row is ever returned. The Transfer reader uses `getDisplayValues()` + the shared `cdrRowDateIso_` (Date is `M/D/YYYY`) + `metricsParsePercent_` (`"29.79%"`) per the CDR spreadsheet-tz discipline (INV-64). The legacy `cdr`/`trend`/`noteCount`/`noteCoverage` fields are preserved (back-compat). Client (`metrics/script_metrics.html`) renders own (accent) vs team (muted dashed) sparklines per KPI with the cohort note; every server string is `esc()`'d (the Metrics-`esc()` gotcha). Pinned by `metricsParsePercent_` / `metricsTeamAvgSeries_` / `metricsBuildKpiSeries_` Node tests + `test_metrics_csrTransferFixture_parsesDateAndPercent` + the `mRenderTrendSection_` DOM test | Subsystem: Server + Client (Metrics views)
INV-125 | **Tag-trend analytics (#5).** `getCallNotesTagTrends()` is manager-gated (INV-02/31), read-only, cached (`cn_tag_trends_v1`, 5 min — invalidated alongside the taxonomy cache by the tag-admin ops via `invalidateCnTaxonomyCache_`), and PHI-free (tags + dates only). It reuses the taxonomy's bounded 2-column scan (`SubformData` tags + `DateLocal`) across enrolled reps but buckets by ISO week over the trailing `CN_TAG_TRENDS_WEEKS` (12) instead of total+lastSeen; archived tags are excluded and a window pre-filter (yyyy-MM-dd lexical = chronological) bounds the events array. The week-bucketing is the pure, Node-pinned `cnTrendWeekStarts_` (Monday-anchored, tz-safe day math via `cnIsoToDayNum_`/`cnDayNumToIso_`) + `cnTagTrendsFromEvents_` (bucket → sort by total → top-`CN_TAG_TRENDS_TOPK` (12) → this-wk-vs-prior delta). Client renders a per-tag sparkline + total + delta in the Admin "Tag Trends" panel (`#cn-admin-trends`), every tag label `esc()`'d (the Metrics/CN gotcha). Pinned by the `cnTrendWeekStarts_`/`cnTagTrendsFromEvents_` Node tests + the `getCallNotesTagTrends` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Call Notes views)
INV-126 | **KB review-due workflow (#4).** The KB schema gained trailing `ReviewedAt`/`ReviewedBy` columns (KB enum + `KB_HEADERS`); back-compat like `CN_HEADERS` (legacy rows read undefined and fall back to `UpdatedAt`), and `getOrCreateKbSheet_` self-heals the header width once post-deploy. **Editing counts as reviewing** — `kbSaveItem` stamps `ReviewedAt`/`ReviewedBy` on every save. `kbMarkReviewed(id)` is the no-edit "still accurate" path: manager-gated (INV-02), locked (INV-01), audited (`KbItemReviewed`), bumps only the two cells (no cache invalidation — the tree cache doesn't carry review state and `kbGetReviewDue` reads live). `kbGetReviewDue()` is manager-gated, read-only, PHI-free: items whose last review (or legacy last-edit) is older than `CONFIG.KB.REVIEW_DUE_DAYS` (90), sorted by 30-day usage desc via the factored `kbUsageCounts_` (shared with `kbGetUsageStats`). KB timestamp cells are recovered in the KB spreadsheet's OWN tz via `kbCellDateIso_` (Sheets-coercion discipline). Client renders a manager-only "Review due" block atop the Reference tree with Open + Mark-reviewed. Pinned by the `kbGetReviewDue`/`kbMarkReviewed` cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-127 | **Coverage planner (#3).** `getCoveragePlan(from, to)` is manager-gated (INV-02), read-only, range-capped (1–14 days), and PHI-free (names + per-tz schedule + PTO status only — never balances). For each manager-tz day it resolves each rep's per-TIMEZONE shift (`getShiftSchedule_`, v1 limitation: per-tz not per-rep) converted to the manager tz (`convertDateTime_`), overlays PTO (`Approved` = off, `Pending` = tentative), and overlays US holidays. Cross-tz straddle is handled by padding rep-local dates ±1 and working in absolute manager-midnight minutes; the hourly distinct-rep concurrency bucketing is the pure, Node-pinned `coverageBucketHours_` (a confirmed rep is never double-counted as tentative; out-of-range clipped). Coverage is shown as THREE bands (returned as `minStaff` / `goodStaff`): ≥ `COVERAGE_STAFF_GOOD` green ("good"), ≥ `COVERAGE_MIN_STAFF` amber ("acceptable"), < `COVERAGE_MIN_STAFF` red ("concerning") + listed in the Understaffed callout; the client bands on the CONFIRMED count. (This deploy: GOOD=7, MIN_STAFF=6.) Surfaced as the managerOnly `coverage` tab in the **Manage** module (moved from Time Clock; `enterCoverageView` in `tc/script_manager.html`, tab key unchanged); every server string `esc()`'d. Pinned by the `coverageBucketHours_` Node tests + the `getCoveragePlan` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Time Clock views)
INV-128 | **Design-token hygiene tripwire.** `test/client/run.js` fails CI if any `var(--token)` referenced in a SHARED design-token-consuming partial is defined nowhere in `styles_design_tokens.html` (or the allowlist). It guards against the redesign foot-gun of referencing a renamed/typo'd CSS custom property that silently renders as the fallback/transparent. `form_public.html` is EXCLUDED (it's a standalone page that ships its own inline palette, not the token partial); the explicit allowlist is currently empty (every token resolves). Adding a new `var(--x)` to a shared partial means declaring `--x` in `styles_design_tokens.html` (or, rarely, allowlisting it) | Subsystem: Test Suite
INV-129 | `getMyMetricsRange(from, to)` is caller-scoped via `getEmployeeInfo_()`, read-only, validates both dates (`^\d{4}-\d{2}-\d{2}$`, `from ≤ to`) and caps the span at 92 days. It returns the rep's OWN aggregate CDR metrics + an own-only per-day trend + note count for the range — NO team line and NO anonymized team series (those are INV-124's `getMyMetrics` single-day surface). Powers the My Stats Today/7D/30D range presets. Returns `cdr: null` (not an error) when the agent has no DQE data | Subsystem: Server + Client (Metrics views)
INV-130 | `getMyNoteHourBuckets(date)` is caller-scoped via `getEmployeeInfo_()`, read-only, validates the date, and returns a 24-element array of the caller's own LOGGED-NOTE counts bucketed by REP-LOCAL hour (`empTz_`) for that day — sourced from the rep's call-notes Sheet (the bounded `readCallNoteRowsInRange_` + `normalizeDate_`/`CN.TIMESTAMP` coercion guards), NOT from CDR. PHI-free (hour counts only). Not enrolled → all-zero buckets (never throws). Powers the Clock-view day-ribbon note-volume histogram | Subsystem: Server + Client (Time Clock views)
INV-131 | The `emailFromCallNote` dept-request auto-log is IDEMPOTENT per open `(noteId, deptLabel)` request (A5): before send, `drFindOpenRequest_(noteId, deptLabel)` (bounded tail of `DR_MAX_SCAN` rows, newest-first) reuses an existing OPEN row's `ReqId` as the resolve token and the post-send block SKIPS the append (auditing `resend`), so re-sending the same note to the same dept re-notifies without opening a second request. The lookup is best-effort (any throw → fresh token, never fails the send) and hash-safe (the token rides the CTA appended AFTER the INV-41 check; only the token VALUE changes). The `DR.NOTE_ID` column (col 11) is a back-compat trailing add (`DR_HEADERS` 11→12, the `CN_HEADERS`/`FS_HEADERS` posture — legacy rows read `''` and never dedupe). The resolve-by-token scans (`resolveDeptRequest`/`markDeptRequestResolved_`) stay FULL and don't read `NOTE_ID`. Pinned by `test_deptReq_resendDedupLookup` | Subsystem: Server + Client (Call Notes views)

INV-132 | `archiveOldCallNotes` is the SAFE (non-destructive) cold-archive tier for call-note retention — a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44 family) and locked (INV-01). Across every enrolled rep's per-rep Sheet it MOVES `Notes` rows older than `CN_NOTE_ARCHIVE_DAYS` (Script Property → `CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS`, default **0 = disabled**) into a `NotesArchive` tab (`CONFIG.CALL_NOTES.ARCHIVE_TAB`) in the SAME spreadsheet via `archiveSheetRowsOlderThan_`, which **appends-then-deletes with a `flush()` between** — so a mid-run failure can only DUPLICATE into the cold archive, never lose (the source row survives and is re-archived next run). Data is preserved (the canonical record stays); the live `Notes` tab is bounded; no new operator store. Rows are normalized to `CN_HEADERS` width on move; date read from `CN.DATE_LOCAL` via `parseRetentionDateMs_` (the Sheets-coercion guard). Cross-rep; per-rep Sheet failures are skipped; writes a PHI-free `CallNotesArchive` audit row (counts only; in `AUTOMATION_AUDIT_ACTIONS` so Automation Health surfaces last-run). Archived notes are NOT in the default in-app readers (all go through `getCallNotesSheet_`→`NOTES_TAB`); the opt-in include-archive search (INV-133) is the only reader that reaches the cold tab. `purgeOldCallNotes` never touches `NotesArchive` — the 3rd-tier `purgeArchivedCallNotes` (INV-133) is the only deleter of archived notes. Scheduled at manager-tz 3am, BEFORE the 4am `purgeOldCallNotes`, so archive-first ordering holds; wired into BOTH `installAutomationTriggers`/`removeAutomationTriggers` TARGETS (the trigger-wiring tripwire pins this). Pinned by `test_triggerGate_archiveOldCallNotes_nonManagerThrows` | Subsystem: Server

INV-133 | The call-note retention 3rd tier + its controls. (a) `purgeArchivedCallNotes` is a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44) and locked (INV-01); it irreversibly deletes each rep's `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS`, default **0 = disabled**) — the ONLY deleter of archived notes. READ-ONLY w.r.t. tab existence (`getSheetByName`, never creates `NotesArchive`); date from the preserved `CN.DATE_LOCAL` via `parseRetentionDateMs_`; cross-rep, per-rep failures skipped; PHI-free `CallNotesArchivePurge` audit (in `AUTOMATION_AUDIT_ACTIONS`). Scheduled manager-tz 2am (before the 3am archive); in BOTH TARGETS (trigger-wiring tripwire). Pinned by `test_triggerGate_purgeArchivedCallNotes_nonManagerThrows`. (b) `searchMyCallNotes`/`managerSearchCallNotes` accept a trailing `includeArchive` flag (default off — 4-arg callers unaffected) that ALSO scans the cold tab (read-only) and tags hits `_archived`; the INV-45 field-scope logic is byte-identical (factored into a per-source closure). (c) `getRetentionConfig` (read-only summary + `retentionWarnings_` safety ordering, Node-pinned) + `saveRetentionConfig` (writes the three Script Properties, whole-days validation, `AdminConfigChange` audit) are manager-gated (INV-31/INV-57 family, omnibus-pinned); the client danger-confirms enabling/raising either irreversible purge window | Subsystem: Server + Client (Call Notes views)

INV-134 | **Coaching is team-scoped (fail-closed), HR-class, and content-free in the audit log.** Coaching items (granular, non-routine manager feedback on a specific patient/TRX interaction; severity praise/minor/major/critical) live ONLY in a `Coaching` tab in the dedicated `HR_DOCS_SS_ID` spreadsheet (keep-forever, EXCLUDED from every retention purge — the EmpDocs posture; `getOrCreateEmpDocSheet_` auto-provisions it). **Scoping:** `getMyCoaching`/`acknowledgeCoaching` are owner-scoped (the rep's own `EmpId`); manager read/void (`getCoachingDashboard`, `voidCoaching`) require `coachCanManagerSee_` — caller CREATED the item OR is the employee's roster `ManagerEmail` (column M); `MANAGER_EMAILS` membership alone grants nothing, blank column M narrows to owner+issuer (the INV-122 fail-closed rule). `createCoaching`/`acknowledgeCoaching`/`voidCoaching` are locked (INV-01); the three manager endpoints are gated (INV-02). The patient/TRX + free-text narrative are HR-class PHI-adjacent and persist ONLY in the HR store — the shared `CoachingCreate`/`CoachingAck`/`CoachingVoid` audit rows are content-free (coachId/empId/severity only, never the patient/TRX or narrative). `acknowledgeCoaching` is idempotent (already-acked → friendly no-op). The pure `coachValidate_` (whitelist-built; severity ∈ `COACH_SEVERITIES`, caps `COACH_TEXT_MAX`/`COACH_TRX_MAX`) and `coachUnackedOverdue_` (open + non-praise + older than `CONFIG.COACHING_UNACK_REMINDER_DAYS`, default 7) are Node-pinned. Un-acked overdue coaching is folded into the existing daily `sendTrainingOverdueDigest` (team-scoped per manager via `coachCanManagerSee_` — NO new trigger), so 'praise' never nags. Notifications (rep on create, manager on ack) are best-effort (INV-14) and PHI-minimal — they name only the severity, never the narrative. Tied to the call-note training flag via the "Coach on this" button (`window.COACH_PREFILL`, the `CLK_NAV_HINT` pattern). **Metrics:** `getCoachingDashboard` also returns an `analytics` block from the pure, Node-pinned `coachAnalytics_(items, nowMs, reminderDays)` (totals, by-severity, ack-rate, overdue-unacked, median days-to-acknowledge via `coachParseTs_`/`coachMedian_` — UTC-parsed so the tz cancels in the ack−created diff, and a per-rep breakdown most-overdue-first) — rendered as a metrics panel in the Coaching tab's Team mode; no new endpoint/gate (it rides the already team-scoped dashboard, PHI-free). **UI note:** the former rep `coaching` + manager `coachingManage` tabs were MERGED into one non-managerOnly `coaching` tab (`enterCoachingView`) with a manager-only Mine ⇄ Team toggle (`coachSwitchMode_`, persisted to `umsCoachingMode`) — a pure client reorganization; every endpoint, gate, scope, and audit row above is unchanged. Pinned by the `coachValidate_`/`coachUnackedOverdue_`/`coachAnalytics_`/`coachMedian_` Node tests + the three gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-135 | **Employee Docs v2 — templates, fillable fields, draft→release, dual reminders (extends INV-122).** The `EmpDocs` tab gained TRAILING `FieldsJson`/`ResponsesJson` columns (back-compat like `CN_HEADERS`/`FS_HEADERS`; `getOrCreateEmpDocSheet_` self-heals a short header width once post-deploy — the INV-126 pattern). **Hash back-compat is load-bearing:** `empDocContentHash_(body,title,type,empId,fieldsJson)` and `empDocSignatureHash_(...,responsesJson)` append the new input ONLY when non-empty, so legacy 4-/5-arg rows hash identically (old stored hashes/signatures stay valid); callers MUST pass the RAW stored `fieldsRaw`/`responsesRaw` cell strings (not a re-serialized object) for byte-stable recompute, and `verifyDocSignature` does. **Fields:** the pure `empDocValidateFields_` (Node-pinned — slug-id from label, dedupe, type ∈ `text`/`textarea`/`date`, cap `EMPDOC_FIELD_CAP`) + `empDocValidateResponses_` (required filled, size/date bounds, only-known-ids kept) + `empDocNeedsAction_` (issued + signature-or-required-field). `acknowledgeDoc(docId, signature, responses)` now validates+stores responses (the responses are attested — folded into the signature hash); a fields-only doc (no `requiresSignature`) completes WITHOUT a signature → status `completed` (audit `EmpDocCompleted`); the responses are persisted BEFORE the status flip. **Draft→release:** `issueDoc` accepts `release:false` → status `draft` (invisible to the employee — `getMyDocs`/`getMyDoc` hide drafts; no notify); `releaseDoc(docId)` (manager-gated, team-scoped, locked) flips draft→issued + notifies (audit `EmpDocRelease`). **Templates** (org-wide, PHI-free form shells — NOT team-scoped) live in an `EmpDocTemplates` tab: `getEmpDocTemplates`/`saveEmpDocTemplate` (upsert, `empDocTemplateValidate_`)/`deleteEmpDocTemplate`, all manager-gated; issuing prefills from one client-side. **Reminders:** `sendTrainingOverdueDigest` now also emails the EMPLOYEE about their own overdue docs (`sendEmployeeOverdueDocsEmail_`, one per employee, best-effort) and overdue covers fields-only docs (via `empDocNeedsAction_`). INV-122's team-scoping / frozen-content / append-only-signatures / never-purged guarantees are unchanged. Pinned by the `empDocValidateFields_`/`empDocValidateResponses_`/`empDocNeedsAction_` Node tests + the `releaseDoc`/`getEmpDocTemplates`/`saveEmpDocTemplate`/`deleteEmpDocTemplate` gate cases | Subsystem: Server + Client (Training views)

INV-136 | **Admin tier (Manage module).** A distinct above-manager role gating the Manage module's **Admin** tab + its config/system endpoints. `empIsAdmin_(email, isManager)`: when Script Property `ADMIN_EMAILS` is SET (comma-separated) admins are EXACTLY that email list; when UNSET/empty EVERY manager is an admin (so a fresh deploy + the test suite behave as before — admin == manager — keyed off the SAME roster `isManager` the endpoints use, NOT the `MANAGER_EMAILS` property, avoiding the F5 mismatch). Admins are a SUBSET of managers. Shipped on `getEmployeeInfo_` (`emp.isAdmin`) + `getEmployeeState` (`empState.isAdmin`). **Client:** the `adminOnly` tab flag → `tabVisibleForUser_` (adminOnly→isAdmin) + `toolVisibleForUser_` hides the fully-gated Manage tool from non-managers; pinned by the `tabVisibleForUser_` + registry-reorg Node tests. **Server:** these **29 Admin-exclusive endpoints** now gate on `emp.isAdmin` returning `'Admin access required.'` (NOT `'Manager access required.'`): `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`, `saveEmailTemplates`, `saveExternalLinks`, `getFeatureFlags`, `saveFeatureFlags`, `getRetentionConfig`, `saveRetentionConfig`, `saveKbAiSettings`, `getStorageHealth`, `getAutomationHealth`, `getDeployReadiness`, `getAdminSheetView`, `getCallNotesAuditLog`, `getCallNoteAuditHistory`, `getCallNotesTagTaxonomy`, `getCallNotesTagTrends`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`, `getCallNotesEnrollment`, `provisionCallNotesSheet`, `reconcileCallNotes`, and the **Reference (KB) content-authoring** set `kbSaveItem`, `kbDeleteItem`, `kbUploadImage`, `kbConvertDriveDoc`. **`getEnrolledCallNotesReps` stays MANAGER-gated** (shared with the Team Notes Per-Rep dropdown + the audit-panel rep filter). All other manager surfaces (Manage Time / Coverage / Punctuality / Team Notes / Team Metrics, and the KB **review/analytics** endpoints `kbMarkReviewed` / `kbGetReviewDue` / `kbGetUsageStats`, plus Training/EmpDocs manager endpoints) stay `isManager`. **Reference client split:** `getReferenceTree` ships `isAdmin`; the Reference tool's authoring affordances (Add / Edit / Delete / Convert) gate on `KB_STATE.isAdmin`, while the manager "Most used" / "Review due" analytics blocks stay `KB_STATE.isManager`. This AMENDS the per-endpoint gating noted in INV-31/57/82/92/93/115/118/119/125/133 for the listed endpoints (manager→admin). Pinned by `test_managerGates_rejectNonManager` (the `ADMIN_GATED` set asserts `'Admin access'` — incl. the 4 KB endpoints), `test_cn_tagAdmin_nonManagerRejected`, `test_provisionCallNotesSheet_nonManagerRejected`, `test_reconcileCallNotes_nonManagerRejected` | Subsystem: Server + Client (shell) + Client (Reference views)


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
    - Fill all 7 fields, press Ctrl/⌘+Shift+C
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
    - Card expands; modify Issue + Resolution; press Ctrl/⌘+Enter (inline-edit save keybind unchanged)
    - Inspect the Notes tab + AuditLog
  Expected: Card collapses to the new content; row in `Notes` reflects the diff; AuditLog has a `CallNoteEdit` row enumerating which fields changed. Cancel button discards edits without writing.

S22 | Call Notes — EOD digest fires for stale action flags | Subsystem: Server
  Steps:
    - As a rep, file an action-flagged note with timestamp older than `STALE_FLAG_HOURS` (manually edit the timestamp cell in the Notes tab to a few hours ago)
    - From the Apps Script editor, run `sendCallNotesEodDigest` while the rep's local time is within their EOD hour (`EOD_WARNING_HOUR`); in production an hourly trigger fires this automatically
  Expected: Logger shows the rep was emailed (their local hour equals the EOD hour) and unresolved-action count > 0. The email body has the warm-paper aesthetic + lists the unresolved note. A rep whose local hour isn't the EOD hour, or with no enrolled Sheet or no unresolved action flags, is silently skipped.

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

S25 | Compact mode + per-tool pop-out (cross-tool) | Subsystem: Client (shell)
  Steps:
    - From Call Notes, click the pop-out icon → confirm a 480×800 chromeless window opens (sidebar + header collapsed)
    - Switch the main window to Time Clock, click pop-out again → confirm a SECOND window opens (the Call Notes pop-out stays open — both coexist)
    - From the main window on Call Notes, click pop-out again → confirm it FOCUSES the existing Call Notes pop-out (no duplicate); same for Time Clock
    - Resize each pop-out, close + reopen each → confirm each restores its OWN size/position
    - In a pop-out, navigate between views (Call Notes ↔ Time Clock ↔ Manage) and resize → confirm the geometry stays under the tool the window was opened for
  Expected: Window name is `umsTeamToolsCompact_<tool>` and geometry key `umsPopoutGeom_<tool>`, so one window per tool — Call Notes + Time Clock pop-outs coexist; a repeat click on a tool focuses that tool's window. A legacy `umsPopoutGeom` seeds size only. All tool views render without horizontal overflow; the compact Time Clock hides the world-clock strip + greeting kicker and tightens paddings; action grid (Time Clock) and dept-chip grid (Call Notes) stack 2-col → 1-col gracefully.

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
      and the same for `runDailyExportCheck`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`, `purgeExpiredFormData`
    - Repeat as a manager, expecting them to run normally (or no-op for empty queues / disabled retention)
  Expected: Each non-manager call throws "manager access required" via `assertManagerCaller_`. No emails are sent, no Sheets are created, no roster work is done. Manager calls proceed as the time-based triggers do.

S31 | Optimistic submit + failure revert | Subsystem: Client (Call Notes views), Server
  Steps:
    - Open Chrome DevTools → Network → throttle to "Slow 3G"
    - As an enrolled rep, fill out a note and press Ctrl/⌘+Shift+C
    - Observe the rolling stack DURING the in-flight request
    - Wait for the server response
    - Repeat with the spreadsheet ID temporarily wrong (force an RPC failure)
  Expected: The new card appears in the stack IMMEDIATELY with reduced opacity + a "Saving" badge in place of action buttons. Form is cleared at the same time; clipboard already holds the formatted note (paste works before the network returns). Once the server confirms, the card swaps to its confirmed state with full action buttons. On forced failure, the pending card disappears and a "Save failed" toast states the recovery outcome: the snapshot is restored into the form ONLY if the form is still empty; if the rep has started typing the next note the form is left untouched (the failed note stays on the clipboard); if the rep navigated away the snapshot is parked in the sticky-draft slot and restores on the next Log view enter. AuditLog has `CallNoteCreate` only on success.

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

S39 | Clock view layout (Round 2 · 8b — replaces "Combined Clock+Timesheet") | Subsystem: Client (Time Clock views)
  Steps:
    - Open Time Clock → Clock tab (default landing)
    - Verify the view shows, top to bottom: hero (greet + status sentence + live clock) → actions row → day ribbon → cov strip (when call activity present) → 3-cell ledger (Annual / Sick / Hours today) → Today's Punches card → teammate status card
    - Confirm NO timesheet section / "Your Timesheet" divider below
    - Click Clock In / Lunch Out / etc.
    - Switch to Time / PTO tab → toggle Timesheet mode → confirm the timesheet content (pay-period tile + recent-activity list) now lives in the side rail there
  Expected: The Clock view is timesheet-free post-8b. Punch interactions re-render the whole view-area cleanly (no #clk-section split anymore). The pay-period view lives in Time / PTO → Timesheet mode. Compact pop-out renders the same layout, narrower.

S40 | Multi-line auto-copy format + N/A defaulting on Transferred To | Subsystem: Client (Call Notes views), Server
  Steps:
    - Submit a note with Transferred To LEFT BLANK
    - Open a text editor and paste from clipboard
    - Open the call-note email composer for the same note and send (preview will be enough — don't actually email)
  Expected: Clipboard contents are multi-line labeled:
    Callback Number: ...
    Caller Name: ...
    Relationship: ...
    Patient & TRX: ...
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

S45 | Resizable sidebar (Round 2 · 8a) | Subsystem: Client (shell)
  Steps:
    - Open any view; locate the `.sidebar-grip` hairline on the right edge of the sidebar
    - Drag the grip leftward until labels disappear; confirm icons remain centered and the sidebar narrows
    - Drag rightward until labels reappear
    - Double-click the grip; confirm it snaps to the opposite preset (icon-only ↔ labeled)
    - Refresh the page; confirm the width persists
    - Clear `localStorage.umsSidebarW` in DevTools; refresh; confirm default 168px
  Expected: Drag is real-time; snap happens at the 100px threshold; persistence round-trips. Out-of-range stored values (< 56 or > 280) fall back to default. The `.app-shell` grid template recomputes correctly because `--sidebar-w` is set on documentElement too.

S46 | Time / PTO mode toggle (Round 2 · 8b) | Subsystem: Client (Time Clock views)
  Steps:
    - Open Time / PTO (renamed from "Time Off"); confirm tab label
    - Click the "Timesheet" segmented button in the app-bar; confirm the side rail swaps from PTO tile + upcoming requests to pay-period tile + recent-activity list
    - Click "Time Off" to swap back
    - Refresh; confirm the last-chosen mode persists
    - In DevTools, set `localStorage.umsMergeMode = 'timesheet'`; refresh; confirm Timesheet mode loads by default
    - Confirm the calendar itself is unchanged across modes (worked-hours badges + PTO state both render)
  Expected: Mode toggle is instant (no calendar reload); persistence to `localStorage.umsMergeMode`. Timesheet-mode side rail lazy-loads tsData via `loadTimesheetSideRail_` (its own `getTimesheetData` call; the legacy `loadTimesheet` cluster no longer exists — INV-74).

S47 | Hover-triggered day modal (Round 2 · 8c) | Subsystem: Client (Time Clock views)
  Steps:
    - On Time / PTO, sweep the mouse across calendar cells; confirm the day modal opens after ~120ms on hover, closes ~200ms after the cursor leaves
    - Move the cursor INTO the modal; confirm it stays open
    - Click a cell to pin the modal; click outside or press Esc to unpin
    - On a touch device (or with `(hover: none)` simulated in DevTools), confirm hover does NOT open the modal — only tap does (and tap always pins)
    - Confirm the modal tethers to the hovered cell (not centered) when in hover mode
  Expected: 120ms / 200ms grace windows feel responsive but not chatty. Tethered position flips right→left near the viewport edge + vertical-clamps to keep the modal on-screen. Esc closes the modal and resets the pin flag.

S48 | Apps Script iframe query-param fix (Round 2 · 8x) | Subsystem: Server + Client (shell)
  Steps:
    - Pop out the current view via the sidebar pop-out button; confirm the new window loads in COMPACT mode (380px, no sidebar)
    - Visit a URL like `<deploy>?tool=callNotes` in a fresh browser tab; confirm the Call Notes Log view loads on first paint (not the default Time Clock view)
    - Open DevTools → Network on the deploy URL; confirm the response contains `window.SERVER_QUERY_PARAMS = { ... }` reflecting the URL's query params
  Expected: Compact pop-out + tool deep-links work in production for the first time. (Previously silently no-op'd due to the iframe sandbox.)

S49 | Call Notes manual-copy failover (Round 2 deferred 8e) | Subsystem: Client (Call Notes views)
  Steps:
    - Open Call Notes; fill in all 7 form fields
    - Drag-select a SMALL subset of the text inside `#cn-frame` (e.g., just the Issue line)
    - Press ⌘C / Ctrl+C
    - Paste into a text editor
  Expected: Clipboard contains the FULL formatted CRM template (all 7 fields + "Transferred To: N/A" fallback when blank), not just the highlighted fragment. Identical output to the Save & Copy button. Toast confirms "Copied (full note template)". Pasting rich HTML INTO a field inserts plain text only (paste sanitization).

S50 | Multi-turn Q&A thread on training notes (Round 2 · 8g) | Subsystem: Server + Client (Call Notes views)
  Steps:
    - As a rep, submit a note with the Training flag + a question
    - As a manager (Team Notes → Per-Rep View), reply to the training note via the inline reply input
    - As the rep, navigate to History and find the same note — confirm the manager's reply renders in a `.qa-thread` block with 👍 + 💬 buttons below
    - Click 👍 → confirm an "ack" entry appends to the thread + buttons hide
    - On a different note, click 💬 → type a follow-up question in the inline textarea → click Send → confirm the clarification appends to the thread
    - As the manager, reply again to the same note → confirm next reload shows the manager's new reply appended below the agent's clarification
  Expected: Thread is append-only; both legacy (`trainingQuestion` + `trainingReply`) and new (`subformData.feedback[]`) shapes coexist on cards. `appendCallNoteFeedback` writes `CallNoteFeedback` audit rows.

S51 | Call Notes Admin tab augment (Round 2 · 8h) | Subsystem: Server + Client (Call Notes views)
  Steps:
    - As a manager, open Call Notes → Admin
    - Confirm the KPI strip renders at the top: Week notes / Unresolved / Tags / Reps with tabular numerals
    - Confirm the tag taxonomy table below shows unique tags + usage bars + counts + last-seen dates + per-row action buttons
    - Confirm the existing department-email mapping + state-tax-rate + update-suggestions controls render BELOW the new sections (preserved unchanged)
    - As a rep (non-manager), open the Admin tab — confirm tab is hidden entirely
  Expected: KPI strip + tag table render correctly; existing admin controls work unchanged. `getCallNotesTagTaxonomy` is manager-gated. Rename / Merge / Archive action buttons are present per row (Restore button for archived tags); see S53 for the full action flow.

S52 | Email composer Internal/External tab transition (modal-tab merge) | Subsystem: Client (Call Notes views)
  Steps:
    - As an enrolled rep with at least one saved note today, click the envelope on a card → confirm the Department composer opens with the segmented tab strip at the top showing Department (active) | External
    - Click External → confirm the modal closes and the External composer opens, with External now active and Department clickable (because the noteId is still in scope)
    - Click Department → confirm the External composer closes and the Department composer reopens for the SAME note (noteId preserved across the transition)
    - Press the "Open Email" button on the Log view (no saved-note context) → External composer opens; in the tab strip confirm Department is greyed/disabled and clicking it shows a toast "Save the note first to send a department email"
    - On both modals, confirm the existing close handlers still work (X button, Escape)
  Expected: noteId is preserved across transitions when present. Department tab is disabled when no noteId is in scope (Save the note first…). CN_STATE.composer / CN_STATE.extComposer never leak — the close handler clears its state slot. The transition is flicker-free: the target modal mounts before the source is removed (one tick for the synchronous directions; for External's async first open the Department overlay stays mounted until the catalog fetch resolves). Verify no empty-backdrop flash and no orphaned overlays linger in the DOM.

S53 | Tag taxonomy admin actions (rename / merge / archive) | Subsystem: Server + Client (Call Notes views)
  Steps:
    - As a manager, open Call Notes → Admin
    - In the taxonomy table, pick a tag with a known usage count → click Rename → enter a new lowercase kebab-case name (2–24 chars) → confirm both dialogs
    - Re-open the table — confirm the tag is renamed and the count moved with it
    - On another tag, click Merge → enter an existing target tag → confirm both dialogs
    - Re-open — confirm source tag is gone and target's count is the sum (less any notes that already had both)
    - On a third tag, click Archive → confirm; refresh — the tag should appear in the archived section (or its row should be visually flagged) with a Restore button. Confirm rep-facing cards still show the tag chip (archive does NOT modify notes)
    - Click Restore on an archived tag → confirm it returns to the active table
    - Try Rename with an invalid value (1 char, or "Foo Bar" with spaces) — confirm the inline validator shows an error WITHOUT closing the dialog
    - Inspect AuditLog
  Expected: Each successful rename / merge / archive / restore writes a `CallNoteTagAdmin` audit row with the manager's email + `{action, oldTag/newTag, repsTouched, notesUpdated}` notes. Per-rep Sheet failures during rename/merge don't fail the whole run (caught and logged). Archive only toggles `CN_ARCHIVED_TAGS` Script Property — no note rows are touched. Validator catches malformed input client-side; server `normalizeTagForAdmin_` rejects invalid input too (returns `{success: false, error: 'Invalid …'}`).

S54 | Custom modal-styled confirm/prompt dialogs (uiConfirm/uiPrompt) | Subsystem: Client (shell)
  Steps:
    - Trigger several confirms across the app: self-undo a punch (Clock view); deny a pending PTO request (Manager view); cancel a time-off request (Time/PTO view); delete a call note (CN); clear a training reply (CN manager view)
    - On each: confirm the dialog renders with `.modal` chrome + Console-redesign typography (NOT system-light browser chrome) and respects dark mode if active
    - Press Esc on any open confirm → confirms it resolves to false (no destructive action fires)
    - Click outside (on the overlay backdrop) → also cancels
    - Press Enter inside an open confirm → fires OK
    - Verify destructive confirms (delete punch, archive tag, cancel request, deny bulk) show a red-tinted OK button via `.ui-dialog-ok.is-danger`
    - Trigger a uiPrompt — try the rename-tag flow: type an invalid new name → confirm the inline error renders WITHOUT closing the dialog → fix the value → confirm it submits cleanly
    - Press Esc on an open prompt → resolves to null (cancel)
  Expected: All 15 dialogs use the custom modal. No `window.confirm` / `window.prompt` calls remain in the codebase. The `resolved` sentinel prevents double-resolution when Esc + click-outside fire near-simultaneously (no double-removal exception in the console). Multi-statement continuations route through helpers (`cnDoDeleteNote_`, `cnDoToggleFlag_`, `cnDoSelfUndo_`, `handleBulkActionConfirmed_`) so the post-confirm action fires exactly once.

S55 | Daily urgent-flag digest | Subsystem: Server
  Steps:
    - As a rep, submit a note with the `urgent` flag (multi-flag toolbar) — `urgent` rides in `subformData.flags[]`, the FlagType column stays empty
    - From the Apps Script editor, run `sendCallNotesUrgentDigest` (in production a daily manager-tz 8am trigger fires it; install via `installAutomationTriggers`)
    - Inspect the manager mailbox
    - Submit a non-urgent note and re-run; confirm it is NOT included
    - As a non-manager rep, call `google.script.run...sendCallNotesUrgentDigest()` from the console
  Expected: One `Urgent` digest email arrives (warm-paper aesthetic, one row per urgent note across all enrolled reps in the yesterday→today manager-tz window) when ≥1 urgent note exists; nothing is sent when none. Non-urgent notes never appear. The non-manager console call throws "manager access required" via `assertManagerCaller_` (INV-44). Pinned by `test_cn_managerAggregateUrgent_findsUrgentNotOthers` + `test_triggerGate_urgentDigest_nonManagerThrows`.

S56 | Card-level urgent toggle + external-email template library | Subsystem: Client (Call Notes views), Server
  Steps:
    - As a rep, open a saved note's More menu (chevron) on its card → click the danger-toned "Mark urgent" button
    - Confirm the card gains a danger inset ring + an "urgent" pill (optimistic, before the RPC returns); click again to unflag
    - Confirm the manager Per-Rep read-only card shows the same ring + pill but NO toggle button (read-only per S26)
    - As a manager, Call Notes → Admin → Email Templates: add a template (name, recipient type = Customer, body containing `{name}`), click Save Templates; reload and confirm it persists
    - As a rep, click "Open Email" → set recipient type Customer + a recipient name → open the Template picker → select the template
    - Confirm the message textarea fills with the body and `{name}` is replaced by the recipient name
    - Toggle recipient type to Provider → confirm the picker re-filters (the customer-only template drops; `any` templates stay) without re-rendering the whole modal
    - As a non-manager, call `google.script.run...saveEmailTemplates([])` from the console
  Expected: Urgent toggles `subformData.flags[]` only (never the FlagType column, INV-77); `_flagInFlight` drops a double-click; failure reverts the array. Templates persist to Script Property `CN_EMAIL_TEMPLATES`; `saveEmailTemplates` writes an `AdminConfigChange` audit row and rejects the non-manager call with "Manager access required." (INV-93). The composer picker renders only when ≥1 template is configured, filters to `{any + current recipient type}`, and inserts the `{name}`-substituted body. A corrupt `CN_EMAIL_TEMPLATES` blob degrades to the CONFIG fallback (composer still works). Pinned by `cnIsUrgent_`/`cnUrgentPillHtml_` + `cnExtTemplatesFor_`/`cnExtTemplateOptionsHtml_` client tests.

S57 | Compliance audit panel (Admin tab) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As a manager, Call Notes → Admin → scroll to "Compliance Audit"
    - Confirm the default range is the last 30 days and results list call-note audit rows newest-first (timestamp · action · rep · actor)
    - Filter by a specific rep, then by an action, then narrow the date range; click Search — also try the "Last 7" / "Last 30" presets
    - Click a row's caret (rows with a noteId) → confirm the note's full lifecycle expands inline, oldest-first, even for events outside the search date window
    - Click "View note" → confirm it deep-links to Team Notes → Per-Rep View pre-selected to that rep + date
    - Confirm rows are PHI-free (timestamp / rep / actor email / action / noteId only — no note content)
    - As a non-manager, call `google.script.run...getCallNotesAuditLog({})` and `...getCallNoteAuditHistory('x')` from the console
  Expected: `getCallNotesAuditLog` is manager-gated (non-manager gets "Manager access required."), reads the AuditLog via a bounded tail scan (≤4000 rows), caps at 500 results, and shows a "capped — narrow the range" banner when `truncated` is set (result cap hit or scan didn't reach the start date). `getCallNoteAuditHistory` returns every row carrying the noteId oldest-first, independent of the date filter. The deep-link opens the Per-Rep view via `cnAuditDrillToNote_` + `CN_STATE.mgrPendingRepDrill`. All server strings are `esc()`-escaped before `innerHTML`; IDs/dates pass via `data-*` attributes. Pinned by `cnExtractAuditNoteId_` (Node harness + `test_cn_extractAuditNoteId_*` editor smoke) + `test_auditPanel_searchAndHistory` (filters, PHI-free rows, lifecycle ordering) + the `getCallNotesAuditLog`/`getCallNoteAuditHistory` cases in `test_managerGates_rejectNonManager`.

S58 | Call Notes auto-provision (one-click enrollment) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As a manager, open Call Notes → Admin → scroll to "Call Notes Enrollment"
    - Confirm the panel shows "N enrolled · M not yet enrolled" and a "Provision Sheet" button for each un-enrolled rep
    - Click Provision on an un-enrolled rep → confirm the uiConfirm dialog → confirm a success toast + the rep drops off the un-enrolled list
    - Open the deployer's Drive → confirm a new "Call Notes — <Name> (<id>)" Spreadsheet exists with a `Notes` tab carrying the `CN_HEADERS` header row
    - As that rep, hard-refresh and open Call Notes → confirm the active form renders (no enrollment splash)
    - Click Provision again on a rep who is ALREADY enrolled (e.g. re-run via console `provisionCallNotesSheet(id)`) → confirm `alreadyEnrolled:true` and that column L is unchanged (no second Sheet, no clobbered history)
    - As a non-manager, call `google.script.run...provisionCallNotesSheet('id')` and `...getCallNotesEnrollment()` from the console
  Expected: `provisionCallNotesSheet` is manager-gated + locked, creates the Sheet in the deployer's Drive, writes column L, invalidates the roster cache, and writes a `CallNotesProvision` audit row. Idempotent / no-clobber on an already-enrolled rep. `getCallNotesEnrollment` is manager-gated and read-only. Both non-manager console calls return "Manager access required." Pinned by `test_provisionCallNotesSheet_nonManagerRejected` + `_idempotentNoClobber` (the create branch is verified manually). See INV-110.

S59 | Intake — PPD recommendation + send | Subsystem: Server, Client (Intake views)
  Steps:
    - As an enrolled rep, open Intake → PPD; enter a Patient Name & Trx#
    - Fill clinical answers that should trigger an upgrade (e.g. Q43 a neuro Dx like "MS", Q38 weight 250)
    - Click "Preview & Recommend" → confirm the modal shows the rendered email body + a recommendation panel (star + accept/undecided/reject per HCPCS)
    - Mark one product Accepted + star it; pick an agent (or "All Agents") → Send
    - Inspect the recipient mailbox, the `PPDSubmissions` tab, and the AuditLog
    - Edit a form field AFTER previewing, then Send the stale preview
  Expected: Recommendations reflect the engine (neuro → solid-seat/Group-3 upgrade, `K0856→K0861` / `K0843→K0862` substitutions, weight-cap exclusions, oxygen drops K0837). The sent email carries the marked star/badges; recipient resolves from the roster (agent) or `INTAKE_ALL_AGENTS_EMAIL`. A `PPDSubmissions` row stores the answers; the AuditLog `IntakeSent` row is PHI-free (`type=PPD; submissionId=…; recipientDomain=…`). Editing the form after preview makes the send fail with "The form changed since you previewed it" (bodyHash guard). Engine pinned by `test_intake_engine_*` + the Node harness.

S60 | Intake — PMD/PAP account creation with image attach | Subsystem: Server, Client (Intake views)
  Steps:
    - As an enrolled rep, open Intake → PMD Account; toggle EN/ES and confirm in-progress answers survive the flip
    - Fill the demographics/insurance/clinical fields (incl. a checkbox row and, on PAP, a Yes/No conditional select)
    - Preview → confirm the rendered email matches; drag/drop or paste an image into the modal → confirm the thumbnail gallery
    - Pick "Default" (sales for PMD / sleep for PAP), a roster agent, or a custom email → Send
    - Inspect the recipient mailbox (inline image present), the submissions tab, and AuditLog
  Expected: Checkbox rows render a check/box, conditional-select answers get their tonal coloring in the email (server `INTAKE_*_LAYOUT`). Images ride inline (base64→CID, capped at 12). Default recipient = `INTAKE_SALES_EMAIL`/`INTAKE_SLEEP_EMAIL`; custom email is validated server-side. A submissions row stores the answers + image count; the AuditLog `IntakeSent` row is PHI-free. Client render layout is pinned equal to the server layout by the Node coupling tripwire (INV-112).

S61 | Fillable form — consent stored, tamper-evident, segregated, retained | Subsystem: Server, Client (public forms)
  Steps:
    - Set Script Property `FORMS_SS_ID` to the `INTAKE_SS_ID` spreadsheet (segregation); send an EAA fillable form to a test address
    - Open the link, fill it, check the consent box, sign, submit
    - In `INTAKE_SS_ID` → `FormSubmissions`: confirm the new trailing columns are populated — `SubmissionHash` (64-hex), `ConsentVersion` (= `CONFIG.FORM_CONSENT_VERSION`), `ConsentAt`, `OpenedAt`, `Certificate` (JSON)
    - As the sending rep, open the in-app submission viewer → confirm the "Certificate of Completion" block + "✓ Integrity verified (hash matches)"
    - As a manager, run `verifyFormSubmissionIntegrity_(token)` → `{ match: true }`
    - Hand-edit a response cell in `FormSubmissions`, re-run verify → `{ match: false }`; the viewer shows the mismatch warning
    - Inspect the `FormSubmissionReceived` AuditLog row → carries `hash=` + `submittedAt=`, no response content
    - Inspect the invite email body → no patient identifiers (prefill rode in the token, not the email)
    - Set `FORM_DATA_RETENTION_DAYS=90` + install triggers; confirm `purgeExpiredFormData` targets the `FORMS_SS_ID` store and no-ops when nothing is older than 90 days
  Expected: Consent is server-stamped (authoritative version) + server-enforced (the payload must carry `consentAgreed:true` — a `false` OR absent `_meta` payload is rejected). The hash is deterministic + tamper-evident (`computeFormSubmissionHash_`, smoke-pinned), excludes `submittedAt` (coercion-safe), and the AuditLog is the independent timestamp witness. `FormSubmissions` stays append-only with NO edit endpoint (§164.312(c)); `verify` flags any out-of-band edit. Legacy 6-column rows (pre-hardening) verify as `match:null` ("legacy"), not a failure. The invite email stays PHI-minimal (Node-guarded). `getFormsSS_()` routes all form reads/writes/purge to the segregated store.

S62 | Reference tool — browse, search, article + Drive embed, manager edit | Subsystem: Server, Client (Reference views)
  Steps:
    - Set Script Property `KB_SS_ID` to a dedicated spreadsheet (deployer has edit access)
    - As a manager, open **Reference** → "Add item" → type **Article**: set a department + title, write markdown (heading, bold, a list, a link, a `|`-table with a `|---|` separator, an `![alt](https://…)` image) → watch the live preview → Save
    - Confirm it appears under its department in the tree and renders as formatted HTML when opened
    - "Add item" → type **Embed Drive doc**: paste a Google Doc/Sheet/file share URL → Save → open it → confirm the Drive `/preview` iframe loads + "Open in new tab" works
    - Type a 2+ char query in the search box → the tree column lists matching docs with their matching SECTIONS indented beneath; the main panel shows the compiled view (every matching section rendered inline, grouped by doc, best score first); click a section row or a chunk's "Open ¶" → the article opens scrolled to that heading (flash highlight); clear the query → tree returns
    - Edit an item, then Delete one (confirm the uiConfirm danger dialog)
    - As a non-manager rep: confirm browse + search work but NO add/edit/delete affordances appear; from the console call `google.script.run...kbSaveItem({})` and `...kbDeleteItem('x')`
    - Paste raw `<script>` / a `javascript:` link / a `![x](javascript:…)` image into an article body and Save → open it
  Expected: Articles store markdown source; `kbMd_` renders escaped HTML (the `<script>`/`javascript:` content is inert — escaped/stripped, never executed; a non-http(s) image demotes to its alt text). The table renders in the app's ledger vocabulary (mono uppercase header row, hairline row separators — no bordered grid) and the image renders capped at container width, lazy, wrapped in an open-full-size link; article typography matches the Console register (display-font headings, accent-soft blockquote callouts). Embeds render the Drive preview + open-in-new-tab; the Drive file isn't copied. Tree is per-department, cached 5 min (invalidated on save/delete). `kbSaveItem`/`kbDeleteItem` are manager-gated (non-manager console calls return "Manager access required."), locked, and write `KbItemSave`/`KbItemDelete` audit rows. `getReferenceTree`/`getReferenceItem`/`searchReference` require an enrolled employee, read-only. Pinned by `kbMd_` + `kbParseDriveUrl_` Node tests.

S63 | Reference tool — Doc→article converter (KB Phase 2) | Subsystem: Server, Client (Reference views)
  Steps:
    - As a manager, embed a Google Doc (with a heading, bold text, a bullet list, a link, a table, and an image) the deployer account can read
    - Open the embed in the reader → click **Convert to article** → confirm the uiConfirm explains review-before-save → Convert
    - Confirm the EDITOR opens in article mode pre-filled with markdown + live preview; toasts list the conversions (N image(s) marked for export; nested/multi-line table cells if present)
    - Confirm headings/bold/list/link render in the preview; the table renders as a REAL table (first Doc row as the header); the image shows as its alt text ("Doc image 1") until save
    - Press Save → toast reads "Saved · N image(s) exported to Drive"; the article re-opens with the image RENDERED (Drive thumbnail URL); a "KB Images" folder exists in the deployer's Drive with a `kbdoc-<fileId>-1` file; re-saving the article re-uses the file (no duplicate); open the original Doc in Drive → confirm it is UNCHANGED
    - Add item → Embed mode → paste a Doc URL → click **Convert this Doc to an article instead** → confirm the editor flips to article mode with the body filled and the Doc's name as title (when title was blank)
    - Try converting a Sheet/file embed (no Convert button should render) and a Sheets URL from the editor (server rejects: "Only Google Docs convert…")
    - Cancel an editor after converting → confirm the embed item is untouched (nothing saved)
    - As a non-manager, call `google.script.run...kbConvertDriveDoc({driveUrl:'…'})` from the console
  Expected: Conversion is manager-gated ("Manager access required." for the non-manager call) and read-only — only the manager's explicit Save (kbSaveItem) persists anything (and, Phase 2b, exports the tokenized images to the KB Images folder at that moment); the Drive Doc is never modified. Lossy parts degrade with explicit warnings, never silently. A Doc the deployer can't open returns a friendly access error. POST-DEPLOY SPOT-CHECK (the original Phase 2b gate): as a REP, open the converted article and confirm the Drive-hosted image actually renders inside the HtmlService iframe — if the org's sharing policy blocks domain-link visibility, the image degrades to alt text + the open-full-size link, and the operator should share the KB Images folder with the team manually. Pinned by the `kb — Doc→markdown converter` + `kb — Phase 2b` Node tests (INV-115).

S64 | KB reference drawer — mid-call lookup + usage loop | Subsystem: Server, Client (Reference views), Client (shell), Client (Call Notes views)
  Steps:
    - As an enrolled rep, open Call Notes → Log; press **Ctrl/⌘+K** → confirm the drawer slides in from the right and focuses its search box; press Ctrl/⌘+K again (or Esc, or the X) → closes
    - Confirm the vertical "Reference" edge tab shows on Call Notes / Intake views, NOT on Time Clock / Metrics / Manager views, and not in compact mode
    - Type 2+ chars → matching SECTIONS render inline as chunk cards grouped by doc (readable without opening anything); a chunk's "Open ¶" opens the full article scrolled to that section; the Back button returns to the results
    - Click an EMBED result → an open-in-new-tab card (no iframe in the drawer)
    - Type some text into the note's Issue field (words that appear INSIDE an article body, not its title), open the drawer → a "Suggested" section first lists any title matches with a "Searching article content…" hint, then swaps to the content-matched sections (¶ heading shown; click jumps into the article); toggle "suggest" off → section explains it's off; re-check after reload (persists via umsKbPanel)
    - With the drawer open mid-read, save a note (Ctrl/⌘+Enter) → the drawer must NOT be wiped by the optimistic re-render
    - Open a uiConfirm (e.g. delete a note) with the drawer open → first Esc closes the dialog, second Esc closes the drawer
    - With the drawer open on an article, open the email composer → the drawer stays SHARP and usable above the modal backdrop (type in its search box — focus is not yanked into the modal); the draggable composer can be moved aside if it overlaps
    - Navigate to Time / PTO, hard-refresh the browser → the app returns to Time / PTO (not the Clock default); refresh mid-note on the Log view → returns to Log with the sticky draft restored
    - Navigate to another tool → drawer closes
    - Re-open: previously opened articles appear under "Recent"
    - As a manager, open Reference → confirm a "Most referenced · 30d" block atop the tree with open counts + in-call counts; as a rep confirm it does NOT render
    - From a non-registered session, call `google.script.run...kbRecordView('x','y')`; as a non-manager call `...kbGetUsageStats()`
  Expected: The drawer mounts on document.body (survives #view-area re-renders), closes on navigation/Esc-with-no-overlay, and never blocks modals (overlays stack above it). Suggestions are computed client-side from cached KB titles — the Issue text never leaves the browser; the toggle + recents persist in the single `umsKbPanel` localStorage blob. Every open writes a best-effort PHI-free KbViews row (`kbRecordView` — locked, append-only; "Not authorized." for non-employees); `kbGetUsageStats` is manager-gated, 30-day windowed, bounded tail scan. Pinned by the `kbRecentsPush_`/`kbSuggestMatches_` Node tests + `test_kb_recordView_requiresEmployee` + the `kbGetUsageStats` gate case (INV-117).

S65 | KB Phase 3 — paste-a-screenshot upload | Subsystem: Server, Client (Reference views)
  Steps:
    - As a manager, open Reference → Add item (or edit an article) → click into the Body textarea
    - Paste a screenshot from the clipboard (⌘/Ctrl+V)
    - Observe the placeholder `![uploading-1…](kbpaste:pending)` appear at the cursor and the live preview show its alt text
    - Wait for the "Image uploaded" toast → confirm the placeholder was replaced by `![Screenshot](https://drive.google.com/thumbnail?id=…)` and the preview renders the image
    - Type elsewhere in the body DURING a second paste's upload → confirm the replacement still lands where the placeholder is, not at the new cursor
    - Save → re-open the article → image renders; the KB Images folder contains a `kbpaste-…` file; AuditLog has a `KbImageUpload` row
    - Paste a >3MB image → warn toast, placeholder removed, nothing uploaded
    - Paste plain text → normal paste (the handler only intercepts image items)
    - As a non-manager, call `google.script.run...kbUploadImage('data:image/png;base64,AAAA')` from the console
  Expected: Upload is manager-gated ("Manager access required." for the console call) and validates type whitelist (no SVG) + size cap BEFORE any Drive write. The paste listener is scoped to the textarea (dies with the modal — no app-wide paste interception). Failed/oversized uploads remove the placeholder and toast; the body is never left with a dangling pending token by the resolve path. PHI reminder text sits under the textarea. Pinned by INV-118's tests.

S66 | KB AI Phase A — facet guidance card (drawer) | Subsystem: Server, Client (Reference views), Client (Call Notes views)
  Steps:
    - Set Script Property `KB_AI_API_KEY` to a real Anthropic API key; as a manager, Call Notes → Admin → Feature Toggles → enable "AI guidance (Reference drawer)" → confirm the danger dialog names the external vendor → Save
    - In the new "AI Guidance (Reference)" Admin section: confirm it shows "API key: set", today's spend ($0.00 initially), a Daily cap input (default 3), and a Model select (default `claude-haiku-4-5`); change the cap to 5 → Save → reload Admin → persists
    - As an enrolled rep with KB articles covering a known topic: open Call Notes → Log, add an established tag (one already on a prior saved note) and/or a flag to the form → press Ctrl/⌘+K
    - Confirm a "Guidance" card renders at the top of the drawer home: 2–4 sentences + source rows with ¶ headings; click a source → opens the article scrolled to that section
    - Close + reopen the drawer with the same facets → the card renders COLLAPSED ("Show guidance for this call type"); click it → expands (collapse-after-seen per facet-hash/day via `umsKbPanel.aiSeen`)
    - Type a BRAND-NEW tag (never used before) with no flag → no Guidance card (novel tag dropped by the whitelist → no-facets)
    - Edit/save any KB article, reopen the drawer → a fresh vendor call fires (generation salt invalidated the cache); check the AuditLog for `KbAiGuidance` rows carrying `facets=…; model=…; usd=…` (never note content)
    - Set the Daily cap to 0 → Save → reopen the drawer → no card (cap reached); restore the cap
    - Disable the feature toggle → no card, and `google.script.run...kbGetFacetGuidance({flagType:'action'})` returns `{none, reason:'disabled'}`
    - As a non-manager, call `google.script.run...saveKbAiSettings({dailyCap:3, model:'claude-haiku-4-5'})` from the console
  Expected: The card only ever renders from whitelisted enum facets + the team's own KB excerpts — the vendor payload never carries typed note text or patient data (INV-119; Node-pinned prompt-builder tests + source tripwire). Every failure path (flag off, no key, thin retrieval, cap, vendor error) silently yields no card and the existing Suggested block stands. Cached guidance serves for 6h per facet combo org-wide. `saveKbAiSettings` rejects the non-manager ("Manager access required."), caps outside 0–100, and unknown models. Pinned by the `kb — AI Phase A` Node tests + `test_kbAi_gatesAndSettingsValidation`.

S67 | Training T1 — assign, complete, matrix, re-assign reset | Subsystem: Server, Client (Training views)
  Steps:
    - As a manager, open Training & Employee Docs → Team Training
    - In "Assign training": pick a Reference item, check one employee, set a due date a week out, click Assign
    - As that employee, open Training & Employee Docs → My Training — confirm the item shows Pending with the due date; click the title → the reader modal renders the article (or Drive embed) — confirm a KbViews row is logged with context `training`
    - Click "Mark complete" (row or reader footer) → status flips to Done; the summary strip updates
    - As the manager, refresh Team Training → the matrix cell shows ✓ and the item header counts done/assigned
    - Re-assign the SAME item to the same employee → the rep's checklist returns to Pending (re-certification reset)
    - Revoke the assignment rows from the "Active assignments" table (uiConfirm danger) → the item leaves the rep's checklist
    - Assign with "All employees" checked → every roster employee sees it; spot-check one
    - As a non-manager, call `google.script.run...getTrainingDashboard()`, `...saveTrainingAssignment({})`, `...revokeTrainingAssignment('x')` from the console
  Expected: All three non-manager calls return "Manager access required." (INV-02). Assignment emails arrive best-effort (branded, INV-105). A rep cannot complete an unassigned item ("not assigned to you"). Past-due pending items render the Overdue chip (warn in the summary). The two tracking tabs auto-provision in the KB spreadsheet on first use. Pinned by `test_training_assignCompleteFlow` + the gate cases + the `trainDeriveStatus_`/`trainChipHtml_` Node tests (INV-120).

S68 | Training T2 — quiz author, take, fail/pass, attempt tracking | Subsystem: Server, Client (Training views)
  Steps:
    - As a manager, Training & Employee Docs → Team Training → "New quiz": title, pass threshold 100%, link a Reference item, add 2 questions (2–3 options each, mark the correct radio) → Save
    - Confirm the quiz appears in the Quizzes table and in the assignment picker's "Quizzes" group; assign it to one employee
    - As that employee, My Training shows the quiz row ("Quiz · N questions · pass ≥100%") with a "Take quiz" button + a "Review the material first" link when a Reference item is linked
    - Take the quiz with one wrong answer → the result view shows score %, "Not passed", attempt 1, and per-question ✓/✗ WITHOUT revealing any correct option; the checklist stays Pending with "attempts: 1 · last score …"
    - Leave a question unanswered and submit → a confirm warns it counts as wrong
    - Retake with all correct → "Passed", attempt 2; the checklist flips to Done; Team Training's matrix cell shows ✓ with the attempt count "(2)"
    - Inspect the rep payloads in DevTools (getQuiz + submitQuizAttempt responses) → no `correct` key anywhere
    - Try `google.script.run...markTrainingComplete('<quizId>')` as the rep → rejected ("completed by passing its quiz")
    - As a non-manager, call `...getQuizzes()`, `...saveQuiz({...})`, `...deleteQuiz('x')` → all "Manager access required."
    - As the manager, delete the quiz → uiConfirm danger; assignments referencing it drop off the rep checklist; QuizAttempts history rows remain
  Expected: Grading is server-side; the answer key exists only in the Quizzes tab + manager endpoints (INV-121). Re-assigning the quiz resets completion AND the attempt counter (counts are per assignment round). AuditLog rows QuizSave / QuizAttempt (score+attempt) / QuizDelete are content-free. Pinned by `test_training_quizFlow` + the quiz Node tests.

S69 | Employee Docs T3 — issue, scope, sign, verify, tamper, void | Subsystem: Server, Client (Training views)
  Steps:
    - Operator prep: set Script Property `HR_DOCS_SS_ID` to a fresh dedicated spreadsheet; fill Employees column M (`ManagerEmail`) for a test employee
    - As a manager, Training & Employee Docs → Issue Docs: pick the employee, type = Policy acknowledgment, set a due date, write a markdown body (or use "Convert a Google Doc"), leave Require signature checked → Issue (uiConfirm explains content freezing)
    - Confirm the employee receives the branded "Document for your signature" email; the `EmpDocs` tab gains a row with a 64-hex ContentHash
    - As the employee, My Docs shows the doc with a "Needs signature" chip → open it → the markdown renders; check the acknowledgment box → the signature pad REVEALS and is drawable immediately (0-width-canvas regression check); draw + Sign
    - Confirm the issuer gets the "Signed" email; the row flips to signed; `DocSignatures` gains an append-only row (SignatureHash + Certificate)
    - As a DIFFERENT rep, try `google.script.run...getMyDoc('<docId>')` and `...acknowledgeDoc('<docId>', 'data:image/png;base64,AAAA')` → both "Document not found."
    - As a manager who neither issued the doc nor is the employee's column-M manager → the doc must NOT appear in their Issue Docs dashboard (fail-closed)
    - As the issuing manager, click Verify → "Integrity verified"; hand-edit the doc's Title cell in the sheet → Verify now reports a content mismatch
    - Void the doc (danger confirm + optional reason) → employee's My Docs shows Void; the signature row survives; Verify still reports signed
    - As a non-manager, call `...issueDoc({...})`, `...getDocsDashboard()`, `...voidDoc('x','')`, `...verifyDocSignature('x')` → all "Manager access required."
  Expected: Owner-only signing (managers cannot sign on behalf); double-sign rejected; the AuditLog carries content-free `EmpDocIssue`/`EmpDocSigned` (hash= + signedAt= witness)/`EmpDocVoid` rows; no purge ever touches the HR store. Pinned by `test_empdocs_issueSignVerifyFlow` + the gate cases + the T3 Node tests (INV-122).

S70 | Tag-trend analytics panel (#5) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As a manager, open Call Notes → Admin → scroll to "Tag Trends" (below the tag taxonomy table)
    - Confirm a per-tag row with a weekly sparkline + total + a Δ-week badge (▲ red rising / ▼ green falling / ±0), trailing 12 weeks
    - Confirm archived tags do NOT appear; confirm tags reps applied across enrolled Sheets do
    - As a non-manager, call `google.script.run...getCallNotesTagTrends()` from the console
  Expected: `getCallNotesTagTrends` is manager-gated (non-manager → "Manager access required."), cached (`cn_tag_trends_v1`, 5 min; dropped by rename/merge/archive), PHI-free. The bucketing matches the pure `cnTrendWeekStarts_`/`cnTagTrendsFromEvents_` (Node-pinned); every tag label is `esc()`'d. INV-125.

S71 | KB review-due workflow (#4) | Subsystem: Server, Client (Reference views)
  Steps:
    - As a manager, open Reference; confirm a "Review due · 90d+" block atop the tree listing items whose last review/edit is ≥90 days old, most-used first, each with a Mark-reviewed (✓) button (reps never see it)
    - Click an item's ✓ → confirm a "Marked reviewed" toast and the item drops off the list on reload
    - Edit any KB item and Save → confirm it is NOT review-due afterward (editing == reviewing)
    - As a non-manager, call `google.script.run...kbGetReviewDue()` and `...kbMarkReviewed('x')` from the console
  Expected: `kbGetReviewDue` (read-only) + `kbMarkReviewed` (locked, audited `KbItemReviewed`) are manager-gated (non-manager → "Manager access required."). Items older than `CONFIG.KB.REVIEW_DUE_DAYS` (90); legacy rows with no `ReviewedAt` fall back to `UpdatedAt`. The KB header self-heals to include `ReviewedAt`/`ReviewedBy`. INV-126.

S72 | Coverage planner (#3) | Subsystem: Server, Client (Time Clock views)
  Steps:
    - As a manager, open Time Clock → Coverage (managerOnly tab); confirm a From/To range (default today..+6) and a per-day card list
    - Each day shows an hourly heat strip (manager tz) + per-rep rows: working reps show their shift converted to the manager's tz; an Approved-PTO rep shows "Off · <type>"; a Pending-PTO rep shows "Tentative · <type>"
    - Confirm understaffed hours (< `CONFIG.COVERAGE_MIN_STAFF`, default 2) render in the warn/low tone; confirm a US holiday is labeled
    - Confirm an offshore (IST/PHT) rep's shift lands on the correct manager-tz hours (cross-tz straddle)
    - As a non-manager: the Coverage tab is hidden; calling `google.script.run...getCoveragePlan('2026-06-17','2026-06-17')` returns "Manager access required."
  Expected: `getCoveragePlan` is manager-gated, read-only, range-capped (1–14 days), PHI-free (names + schedule + PTO status). Per-tz shifts (v1). The hourly distinct-rep math matches the pure `coverageBucketHours_` (Node-pinned); every server string `esc()`'d. INV-127.

### Frozen Subsystems
- Legacy Call Notes Add-on (`call-notes/`, `call-notes-legacy/`) — superseded by the Call Notes module in `web-app/cn/` + `Code.js`; the Workspace Add-on path is abandoned because org admin policy blocks Marketplace install without ticket-driven allowlisting. Unfreeze only if the org adopts Marketplace Add-ons (not anticipated). Skipped by default; name it explicitly to audit. (These dirs are not in the Subsystems list above — this entry documents why.)

### Deploy Command
Server: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy. Web app picks up the change on next page load.
Client (shell), Client (Time Clock views), Client (Call Notes views), Client (Metrics views), Client (Intake views), Client (Reference views), Client (Training views), Client (public forms): same single `clasp push -f` ships all HTML partials alongside `Code.js`; same New-version deploy step.
Test Suite: same `clasp push -f`. Tests don't ship to end users — run them from the editor with `runSmokeTests()` (safe on prod) or `runAllTests()` (writes TEST_ rows, cleans up at end).
