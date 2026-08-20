# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Projects

- **web-app/** — Multi-module browser web app deployed at one Web App
  URL. Hosts **seven** tools today, registered side-by-side in the
  `TOOLS` registry in `script_core.html` — the six feature modules below
  plus the consolidated manager/admin **Manage** module (see the
  multi-tool-registry Key Design Decision for its four tabs). The count
  said "six" until cycle 12 even though the Manage module shipped in the
  registry reorg; keep it in step with `Object.keys(TOOLS).length`:
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
     anyone out, INV-124) and "Team Metrics" (visible to EVERYONE since
     2026-08-18: reps get the whitelist-built team AGGREGATE — totals, trend,
     queue/department transfer folds — while the per-rep table + name
     diagnostics stay manager-only, INV-66; date-range support and preset
     chips; the Dashboard metric cards click through here). The CDR data layer
     (`getCdrSS_()`, `getCdrAgentMetrics_()`, `getCdrDailyBreakdown_()`,
     plus `getCsrTransferPerRepDaily_()` reading the separate
     `CSR Transfer Historical Data` tab for the Transfer KPI) is isolated
     behind helpers so a future swap to Neon Postgres (Option C)
     replaces only those functions. CDR metrics also enrich the
     Call Notes Stats tab (`managerGetShiftStats`) via a best-effort
     try/catch overlay — CDR failure never breaks existing stats.
     My Stats has Yesterday / 7D / 30D range presets — Yesterday = the previous
     WORKDAY (Monday shows Friday; operator 2026-08-17: CDR data is never
     populated same-day, so a Today preset always showed an empty day; the
     manager Team Metrics tab deliberately keeps Today for same-day note
     counts) — (server-aggregated via
     `getMyMetricsRange(from, to)` — caller-scoped self-aggregate, no team
     line/series), rail-row sparklines, and a sortable + sticky-header team
     table with tri-tone % cells (the table renders via the shared
     `mtRenderTable_` component, see Key Design Decisions).
     Backs the CDR Report spreadsheet (`CONFIG.CDR_SS_ID`).
   - **Intake** — patient-intake forms ported from the bound
     `form-generator` Apps Script (that reference copy was DELETED in
     cycle 13 — see the Frozen Subsystems note; it is in git history).
     Four tabs: **PPD** (Patient Profile &
     recommendation — a 46-item intake (Q1–Q45 plus the lettered but
     full-weight Q39a; the progress ring's denominator is 46, see the
     PPD-controls gotcha) that drives the clinical
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
The Workspace Add-on path (the old `call-notes/` scaffold — **deleted from the
tree in cycle 13**, see Frozen Subsystems) is abandoned
because admin policy on the org domain prevents install of Marketplace
Add-ons without ticket-driven allowlisting; the web-app pattern works
today with zero admin involvement. **`web-app/` is now the only project
directory** — see Frozen Subsystems for what was removed and why.

## Development

`web-app/` is the only clasp project.

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

**Blue-green (a personal dev instance alongside the team's prod):** run a
SEPARATE dev Apps Script project from this same source with `npm run push:dev`
(prod stays `npm run push:prod` / a bare `clasp push -f`). The dev instance has
its own copy Sheets + your-inbox email config so you can fully use it — send
emails, create notes — without touching the team's live data or inbox. Full
setup + operating procedure (incl. the `INSTANCE_LABEL` / `INSTANCE_IS_PROD`
Script Properties and the `DevTools.js` roster scrubber) is in
`docs/deployment.md`.

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
- **DQE has ONE row per (agent, date) — per-queue rep metrics do not exist
  (cycle-14 Phase 0).** Measured against the operator's live sheet, not
  assumed. Two consequences worth knowing before anyone re-opens this:
  (a) `answered`/`missed`/`% answered`/talk-time can never be broken down by
  queue, because the row carrying them is not queue-scoped; (b) **`CDR.QUEUE_EXT`
  (col 4) is NOT a queue key** — it holds comma-separated MEMBERSHIP lists
  (`103,108`, and `108,103` / `103,138,108` — the same sets in different
  orders), i.e. which extensions an agent covered that day. It is a dimension
  of the AGENT, not of the call, and anything reading it must treat it as an
  unordered set. Per-queue attribution exists only for TRANSFERS — see the
  Phase 1 Key Design Decision. The `A_Q_*` queue-aggregate rows
  `isCdrQueueSentinel_` skips are real but far too sparse to build a series on
  (8 queues / ~12 rows in a week).
- **A diagnostic that can never be clean is worse than none — the CDR
  name-match card (cycle 15).** Both roster↔CDR mismatch directions are
  PERMANENTLY non-empty on this deployment, so neither can drive a status
  card: `unmatchedAgents` lists every CDR agent not on our roster, but the CDR
  Report covers the WHOLE phone system (it is owned by `call-data-reporting`)
  while our roster is one team — **there is no department filter;
  `CONFIG.CDR_DEPARTMENT` is declared and read NOWHERE** (its only other
  mention was a `getCdrAgentMetrics_` doc comment claiming it filtered, now
  corrected). Reported 78 strangers in practice. The reverse list
  `rosterWithNoCdr` fails identically: the roster set is every NAMED employee
  row, so managers, admin staff, and anyone on PTO across the whole window are
  in it forever — swapping the tone to it just moves the always-amber problem.
  The **intersection** is the signal: a roster rep with no call data whose name
  resembles an unmatched CDR agent is one person spelled two ways, which means
  their calls are silently missing from every metric. `cdrLikelyNameMismatches_`
  (pure, Node-pinned) pairs them on **normalized-equal OR ≥2 shared name
  tokens** — two, not one, because a shared surname is a coincidence on any
  real roster; a nickname sharing only a surname ("Robert Smith" vs "Bob
  Smith") is a deliberate false NEGATIVE, since under-reporting is the safe
  direction for something that raises a warning. That set is normally EMPTY,
  so the card reaches green, and it names the exact `Agent Alias Overrides`
  row to add. **The general rule: before toning a health indicator off a
  count, ask what that count reads on a healthy production system — if the
  answer is not zero, it is reference detail, not a signal.**
- **Roster INCLUSION goes through `empRosterEmail_(row)` — the one predicate
  (cycle-15 F3).** Offboarding here means clearing the email while KEEPING the
  name, so a name-only row is not a person to count. FOURTEEN walks each decided
  that for themselves and did not agree: NINE tested raw truthiness
  (`if (!rows[i][EMP.EMAIL]) continue;`), THREE trimmed, and TWO tested nothing.
  A WHITESPACE-ONLY email cell therefore made the first two groups DISAGREE —
  the identical shape column L had before `cnEnrolledSheetId_` (INV-167), on a
  second column. The un-guarded pair mattered unequally: `getTeamMetrics` ACTS
  on it (its gate is `if (cdr || noteCount > 0 || …)`, and an offboarded name
  still matching DQE history satisfies it, so a departed employee got a full row
  in the manager's team table AND their volume flowed into `teamTotals`), while
  `getPunctualityReport` was harmless only by coincidence downstream
  (`if (!dates.length) return` drops a rep with no punches). The predicate
  returns the TRIMMED email or `''`, so it can only NARROW the nine raw call
  sites — the correct direction, matching INV-167's resolution. It is NOT an
  authorization check; `getEmployeeInfo_` still identifies the caller. Pinned by
  the F3 tripwire, which bans the raw guard shape ANYWHERE in `Code.js` (derived,
  not a hand list — INV-179) rather than enumerating today's fourteen walks.
- **A declared-but-unread CONFIG key / enum member is a defect, not clutter
  (cycle-15 F1/F2).** The next reader assumes it is wired. Removed:
  `CDR_DEPARTMENT` (whose `getCdrAgentMetrics_` doc comment CLAIMED it filtered
  the read — it never did; there is no department filter, which is why the CDR
  name-match diagnostic is permanently non-empty), `TRAINING_DIGEST_WEEKDAY` /
  `REVIEW_DIGEST_WEEKDAY` (the weekly-digest trigger hardcodes
  `ScriptApp.WeekDay.FRIDAY`, so editing these was a SILENT no-op for an
  operator trying to move the digest), and `CALL_NOTES.SUBFORM_COL_JSON` (a
  toggle that never existed). `EOD_WARNING_WINDOW_MINUTES` is deliberately
  retained and is now marked `DEAD` at its declaration — the allowlist entry in
  the F1 tripwire REQUIRES that marker, so "retained on purpose" and "forgotten"
  stay distinguishable. Same class in the enums: `CDR.QUEUE_EXT` was read by
  cycle-14 Phase 0 yet stayed dead because the read used bare positional
  offsets — now DERIVED from the enum, so the read follows a column move
  instead of silently reading its neighbour. **Col 4 remains the one CDR column
  absent from `CDR_EXPECTED_HEADERS`, deliberately and temporarily:** that
  validator substring-matches, so an entry whose text is not in the real header
  raises a FALSE "Column drift" warning and flips the CDR health card amber —
  the same always-wrong-signal class this cycle removed. The real col-4 header
  text in the `call-data-reporting`-owned sheet has never been recorded, and
  guessing it is worse than the gap. **Operator: read the col-4 header off the
  DQE tab and add `4: '<that text>',`** — a one-line close. Exposure meanwhile
  is small (an INSERT at col 4 shifts 5..10 and IS caught; only an in-place
  repurpose slips through, into a manual diagnostic rather than a metric).
  Pinned by the F1 tripwire (every CONFIG key has a reader, allowlist must
  self-declare).
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
  any new AuditLog timestamp read must too. **The AuditLog's OTHER coerced
  columns bit the same way (cycle 7 M-3/M-4):** the `PunchTime` cell (col 7,
  written `HH:mm:ss`) coerces to a time-of-day Date — read it via
  `normalizeTime_` (a raw `String()` rendered a constant "12:00 AM" in the
  manager Recent Activity feed) — and `IsAdjustment` (col 8, written
  `'TRUE'`/`'FALSE'`) coerces to a native boolean, so `String(x) === 'TRUE'`
  is always false (compare case-insensitively; the ADJ badge + adjustment
  reason never rendered until fixed). **The `PunchDate` cell (col 5, written
  `yyyy-MM-dd`) coerces to a Date the SAME way (F cycle-8):**
  `cnReadCallNoteAuditRows_` read it raw into `dateLocal`, so the compliance-panel
  "View note" deep-link handed a `"Wed Jul 15 2026 …"` string to
  `managerGetCallNotes` (whose `^\d{4}-\d{2}-\d{2}$` guard rejects it) → the
  drill-through silently died while the panel looked fine (the visible timestamp
  uses the correctly-normalized `timestampMgr`). Now read via `normalizeDate_`,
  matching `getManagerDashboard`'s col-5 read; pinned by a `dateLocal`-shape
  assertion in `test_auditPanel_searchAndHistory`. **Batch 3 (cycle-8) gave the
  AuditLog the named `AUDIT` column enum it lacked plus a single typed reader
  `auditRowObj_(row)` — the ONE coercion-recovery point (TS / PunchDate /
  PunchTime / IsAdjustment recovered once via the normalize helpers). All four
  AuditLog readers now route through `AUDIT.*` (the two coerced-column readers,
  `getManagerDashboard` + `cnReadCallNoteAuditRows_`, via `auditRowObj_`; the two
  non-coerced ones, `computeAutomationHealth_` + `adminSheetView`, via `AUDIT.*`
  for TS/action/name/notes). A GLOBAL Node tripwire (the INV-142 pattern) now
  fails CI on ANY raw read of a coerced `AUDIT` column outside `auditRowObj_` —
  the F1-catching net the old per-function M-3/M-4 tripwire (replaced) couldn't
  provide. NEW AuditLog reads must go through `auditRowObj_`, never a bare index
  (`auditData[i][5]`) — the bare-index style was the root cause F1 exposed.** The
  SAME class applies to
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
- **Sheet LOCALE (not just timezone) can coerce stored ISO-T strings to
  Dates — and `SpreadsheetApp.create()` inherits the SCRIPT tz + deployer
  locale.** Two sides of one class (cycle 7 H-2/M-14): (a) some locales
  coerce the `yyyy-MM-dd'T'HH:mm:ss` form on read (the reason
  `formTokenCellMs_` exists) — the CN `Timestamp` column now routes through
  `cnTimestampString_` (recovers a coerced Date back to the as-written
  T-form digits; raw `String()` silently broke sorting/shift-span/EOD
  displays and FAIL-OPENED the 5-min delete window); Storage Health surfaces
  each store's locale with a warn pill when it differs from the ADP sheet's.
  (b) `createPinnedSpreadsheet_(name)` is the ONLY sanctioned way to create
  a spreadsheet — it pins BOTH tz and locale to the ADP sheet's (a bare
  `SpreadsheetApp.create()` inherits the script tz `America/Chicago`, which
  shifted raw coerced Date/time cells copied into the ADP payroll export).
  A Node tripwire fails CI on any bare `SpreadsheetApp.create(` outside the
  factory and pins the factory's tz+locale calls + the three call sites
  (export, CN export, provisioning).
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
- **The live punch path enforces the client's own state machine; Day Edit
  reconciles duplicates (cycle-10 M-1).** `recordPunchCore_`'s live (non-adjust)
  path (the guarded body behind the public `recordPunch` wrapper since
  2026-08-17 — the wrapper attaches a fresh `state` AFTER the lock releases so
  a punch confirms in ONE round trip) validates the punch type against `getNextActions_(todayPunches)` —
  the SAME function the client renders its buttons from — so a STALE window
  (second browser / pinned pop-out that missed a punch made elsewhere, or a
  direct RPC) can no longer append a duplicate ClockIn/ClockOut or an
  out-of-sequence lunch punch. A fresh client is never rejected; multi-lunch
  stays legal (LunchOut is re-offered after LunchIn); adjustments bypass (their
  own window/format guards apply); the guard runs AFTER the min-interval check
  so rapid-fire keeps its friendlier error. For rows that predate the guard:
  `findExistingPunch_` returns the LAST matching row (agreeing with
  `managerSaveDay`'s snapshot — first-match updates used to land on a
  different row than the one displayed), and `managerSaveDay` snapshots ALL
  rows per type — a blank slot deletes EVERY row of that type, a kept slot
  collapses extras to the displayed (last) row with `duplicate collapsed`
  audit rows (the S7 full-day-reconcile contract; note this also collapses a
  legitimate multi-lunch day to the 4 displayed slots — the modal can only
  express one pair). RELATED DECISION (C3, retracted finding): `calcHours_`'s
  overnight wrap (`out <= in` → +24h) is DELIBERATE, pinned by
  `test_calcHours_overnight` — it trades mis-keyed AM/PM pairs rendering as
  long days for same-date overnight pairs computing correctly; don't "fix"
  one direction without an operator decision. Pinned by
  `test_recordPunch_liveSequenceGuard` +
  `test_managerSaveDay_collapsesDuplicateRows` + the M-1 Node pins.
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
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v11`).
  After editing any Employees-sheet column (`adjustLeaveBalance_`,
  manual edits for test setup, etc.) call `invalidateRosterCache_()`
  or subsequent reads will return stale balances for up to 5
  minutes. Whenever the `EMP` enum changes shape (new column),
  bump the cache key — old cached entries would have wrong column
  indices.
- **`PtoEnabled` defaults to TRUE.** Column K (`EMP.PTO_ENABLED`)
  defaults to enabled when blank — for back-compat with rows
  added before the column existed. Someone who earns no paid leave at all
  needs an explicit `FALSE` / `no` / `n` / `0` in this
  column — note this is NOT the same as "does not get a fixed annual
  allotment": an ACCRUING rep (roster column Q, INV-194) must stay `TRUE`,
  or the accrual credit skips them entirely. The PTO UI then hides for them entirely (employee Calendar
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
- **A test fixture that writes DIRECTLY to a store behind a RESULT CACHE owes
  the production writer's invalidation (operator run, 2026-08-19).** The
  2026-08-18 load-time round gave `getDeptRequests` a per-caller CacheService
  result cache keyed by a generation salt that its two PRODUCTION writers bump
  (`emailFromCallNote`'s auto-log append and `markDeptRequestResolved_`).
  `test_deptReq_incomingAndMemberResolve` builds its fixture by appending a row
  to the `DeptRequests` tab directly — a path production never takes — so no
  bump happened, and the read-back was served from the entry the omnibus gate
  test had warmed for that same employee minutes earlier. Red suite, correct
  code: the FIXTURE was stale, not the endpoint. It sat undetected because the
  editor suite had not been run since the cache shipped. The fix is one line
  (`drBumpCacheGen_()` between the append and the read, and again after the
  cleanup delete), and the general rule is the one this entry's title states —
  when you add a result cache, check whether any test writes to that store
  outside the endpoints you just taught to invalidate it. Pinned by an
  ordering assert (bump strictly between the append and the read — a bump only
  in `finally` is too late, which is how the first version of the pin failed to
  bite).
- **`_TEST_OVERRIDE_EMAIL` only intercepts `getActiveUserEmail_()`.**
  Any code path that calls `Session.getActiveUser()` directly will
  bypass the test impersonation and use the real running user.
- **`TEST_` prefix is the cleanup key.** `cleanupTestData()` deletes
  every row in Timesheet / TimeOffRequests / AuditLog whose
  employee ID starts with `TEST_`. Production employee IDs must
  never start with `TEST_`. **The test ACCOUNTS live offboarded between
  runs (operator 2026-08-17):** with real agents on the app, an enrolled
  TEST_ account renders beside them on every team surface, so the operator
  offboarded them in the app — which clears ONLY the email (INV-183), and
  `setupTestEnvironment`'s old ID-keyed dedupe then never repaired them:
  every email-keyed impersonation resolved to null and 119 integration
  tests cascaded to "Employee not found." Now SYMMETRIC and self-healing:
  setup RE-ONBOARDS its rows (restores the canonical email when the cell
  disagrees) and cleanup RE-OFFBOARDS them at the end of every run, so the
  test accounts exist for the ~6 minutes of a run and are invisible
  everywhere `empRosterEmail_` guards otherwise. Offboarding them by hand
  is therefore always safe — the next run repairs itself. Pinned by the
  re-onboard/re-offboard Node pin.
- **Manager-only operations check `callerEmp.isManager`.** Any new
  manager-gated endpoint MUST start with the same check used by
  `getManagerDashboard`, `updateTimeOffStatus`, `deletePunch`,
  `managerSaveDay`, `exportAdpRange`,
  `managerSubmitTimeOff`, `getEmployeesList`,
  `getEmployeeTimesheetForManager`, `managerGetCallNotes`,
  `managerSearchCallNotes`, `managerGetTrainingQueue`,
  `managerGetReviewCandidates`, `getEnrolledCallNotesReps`,
  `exportCallNotesRange`, `setCallNoteTrainingReply`,
  `managerGetShiftStats`, `managerGetUnresolvedActionCount`,
  `managerDeleteCallNote`,
  `getAutomationHealthBadge` (the shell health dot — batch K),
  `getTimesheetDoctor`, `fixTimesheetDuplicates` (the sheet doctor — INV-159),
  `getTeamMetrics` (since 2026-08-18 reps get the stripped team AGGREGATE —
  INV-66; the per-rep rows + diagnostics remain manager-only), `getMetricsAmbient`, `getCoveragePlan`,
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
  `getPunctualityReport` (the four Spanish-inbox endpoints +
  `resolveSpanishThread` are NOT in this list — they gate on
  `canSeeSpanishInbox_` = manager OR `SPANISH_INBOX_MEMBERS`, the INV-31
  amendment; cycle-10 F1 removed them here after the stale double-listing
  nearly invited a gate regression; likewise `installAutomationTriggers` /
  `removeAutomationTriggers` are NOT in this list — both gate on the
  MANAGER_EMAILS Script Property (INV-15/44/61), not the roster `isManager`
  column, and the cycle-17 scan found the stale listing here inviting the
  same class of confusion),
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
  privilege escalation. **EXCEPTION — the admin tier (INV-136):** the **43**
  Admin-exclusive endpoints (31 Manage-module Admin-tab config/system/roster
  endpoints — incl. the 2026-08-07 team-member onboarding trio
  `addEmployee`/`offboardEmployee`/`getOnboardingPanel` — + the Reference
  content-authoring set
  `kbSaveItem`/`kbDeleteItem`/`kbUploadImage`/`kbConvertDriveDoc` + the five
  authoring-adjacent KB endpoints `kbGetRevisions`/`kbPublishItem`/
  `kbRevertItem`/`kbGetSearchConfig`/`kbSaveSearchConfig` — the
  authoritative list is in INV-136. **This count has now drifted five times
  (24→28→30→35); do NOT hand-maintain it again** — derive it, or add the
  machine check described in INV-136's note. All 35 are covered by a
  non-manager gate assertion today, but that coverage is also hand-listed)
  gate on `emp.isAdmin` (not `isManager`) and return `'Admin access required.'`.
  `isAdmin` == `isManager` until Script Property `ADMIN_EMAILS` is set, so the
  endpoints in the lists above that moved to the admin tier still reject
  non-managers; see INV-136 for the full admin-gated list.
- **Trigger-handler endpoints are reachable via `google.script.run`.**
  The time-based trigger handlers — `sendDailyMissedPunchAlerts`,
  `runDailyExportCheck`, `sendCallNotesEodDigest`,
  `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`,
  `sendTrainingOverdueDigest` (the T4 overdue-training/-docs nudge),
  `archiveOldCallNotes` (the non-destructive cold-archive tier),
  `purgeExpiredFormData` (the
  destructive PHI-retention purge), `reconcileCallNotes` (the
  non-destructive nightly Sheets back-fill), `sendAutomationHealthDigest`
  (the daily automation-FAILURE push), `sendDeptRequestReminderDigest`
  (the daily dept-request SLA reminder), `sendManagerDailyBrief`
  (the flag-gated consolidated morning brief, INV-151),
  `archiveOldTimesheetRows` (the Timesheet cold-archive, INV-153),
  `runNightlySelfTest` (the daily in-project self-test — smoke on prod,
  full suite on the dev instance; INV-162) and `creditMonthlyPtoAccruals`
  (the monthly PTO accrual credit, INV-194) — are top-level (required: Apps Script
  time-based triggers won't bind to underscore-suffix functions), which
  also means a logged-in rep can fire them from the browser console.
  Each calls `assertManagerCaller_(label)` at the top — throws if
  `getActiveUserEmail_()` ∉ `getManagerEmails_()`. In a trigger context
  the active user is the installer (always a manager via
  `installAutomationTriggers`'s own check), so the gate is a no-op for
  triggers. Any new public function that walks the roster, hits Mail,
  or otherwise has side effects you wouldn't want a rep firing should
  apply the same gate. **That gate MUST be the MANAGER_EMAILS
  `assertManagerCaller_`, NEVER `emp.isAdmin` or the roster `isManager`** —
  the installer passes `installAutomationTriggers`'s own MANAGER_EMAILS
  check, so an admin/roster gate silently no-ops the nightly run under a
  narrowed `ADMIN_EMAILS` or a non-roster installer (the `reconcileCallNotes`
  F1/F2 cycle-6 regression — INV-109/INV-136). `removeAutomationTriggers` also uses this
  gate — without it, a non-manager rep could silently disable all
  automation triggers.
- **PTO balance transitions.** `updateTimeOffStatus` only changes
  balances on Pending→Approved (deduct) or Approved→non-Approved
  (restore). `managerSubmitTimeOff` with `autoApprove=true` skips
  the Pending stage and deducts immediately. Skipping the
  transition guard double-deducts on re-approval or fails to
  restore on revert.
- **Time-off submit has a duplicate-date guard + leave-type
  whitelist — and the multi-day `submitTimeOffRange` shares BOTH,
  atomically** (operator 2026-08-18: one Pending row per weekday in the
  range, weekends skipped, a conflict on any day rejects the whole batch
  naming the dates — see INV-94). `submitTimeOffRequest` and `managerSubmitTimeOff`
  reject a request when the employee already has a Pending or
  Approved row for that date (`hasActiveTimeOffOnDate_`) — without it
  two sibling rows for one day each pass the per-row transition guard
  above and double-deduct on dual approval (INV-03 is per-row only).
  Both also validate `type` against `TIME_OFF_TYPES`
  (`isValidTimeOffType_`, case/space-insensitive) before writing, so a
  garbage/typo'd type can't silently fall through `getLeaveDeduction_`'s
  annual/1.0 default. Denied/cancelled rows never deducted, so they
  don't block a re-request (INV-94 / INV-95). Two cycle-11 extensions:
  (a) the dup-date guard ALSO runs on `updateTimeOffStatus`'s →Approved
  transition (own row excluded) — flipping an old Denied row to Approved
  beside an existing Approved row was the last double-deduct creator;
  (b) both submit paths bound the date to a sanity horizon
  (`TIMEOFF_MAX_DAYS_AHEAD`=370 / `_BACK`=90, in the rep's/target's tz) —
  a typo'd year used to create an approvable, balance-deducting row no
  month view ever showed.
- **Bi-weekly anchor read.** `getCurrentBiweeklyRange_` reads the
  FIRST row whose PayCycle is `'biweekly'` AND whose `PAY_ANCHOR` cell is
  non-empty (cycle-11 doc fix — a blank-anchor biweekly row is silently
  skipped, so accidentally blanking the intended anchor makes a LATER
  rep's anchor the pay-period boundary with no warning). Multiple biweekly
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
  removes (a) punches dated today or yesterday in the rep's tz —
  yesterday exists solely for the midnight wrap (punch 23:58, undo
  00:02; cycle-8 made the server honor what the client always
  offered), (b) within `SELF_UNDO_WINDOW_SECONDS` (5 min) of REAL
  elapsed time, (c) that are NOT adjustments. Older or remote
  mistakes must go through Adjust so they leave a clear `ADJ-*` row
  in the audit log. Self-undo writes a `PunchSelfUndo` audit row
  before deletion.
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
  **The SPLIT-SEND partial contract (cycle-17 C17-11):** a mixed
  dept+'Other' selection fires TWO MailApp calls; when the internal copy
  succeeded and the external/Other copy then failed, the call no longer
  returns a bare failure (which invited a duplicating full re-send) — it
  stamps EmailedAt for the DELIVERED internal depts only, writes the
  CallNoteEmail audit row with an `externalCopyFailed` marker, keeps the
  DR row/token live, and returns `success: true` + a `warning` telling the
  rep to send to the external recipient separately; the client surfaces
  the warning as a warn toast in place of the success toast.
  **NO mail inside the global ScriptLock (cycle-9 M-7).** A MailApp send
  is ~0.3–0.5s and every mutating write shares ONE lock with a 15s
  `waitLock` ceiling — an `'*'` training assignment looped the WHOLE
  roster's emails inside it. Nine locked mutators now defer their
  best-effort notification via a `notifyAfter` closure the `finally`
  invokes AFTER `lock.releaseLock()` (updateTimeOffStatus,
  managerSubmitTimeOff, submitCallNote, saveTrainingAssignment,
  acknowledgeDoc, issueDoc, releaseDoc, createCoaching,
  acknowledgeCoaching). A Node tripwire inventories every function
  touching `MailApp.` and fails CI on any locked try-region that
  reaches one outside a `notifyAfter` closure; the ONE allowlisted
  exception is `emailFromCallNote` (INV-42 — send-then-stamp is
  deliberately a single locked unit). New in-lock mail = move it to a
  post-lock closure or allowlist it WITH a reason.
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
  — never `new Date()` browser-local time — as do the Coverage planner +
  Punctuality date defaults since cycle 7 (L-5) — so offshore reps (IST/PHT) and
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
  **THERE IS NO "DISABLED ROW" — the ONLY inert state is an EMPTY column B
  (HCPCS)**, because `intakeFilterRecommendations_` drops a row solely on
  `hcpcsNum === 0`. Surfaced by the cycle-16 F9 operator check: the live catalog
  held one scratch/exception row (`E1161`, capacity blank) that the operator did
  not consider a product, but the engine did — pre-F9 its unreadable capacity
  passed the weight gate for every patient, and post-F9 it is STILL eligible
  whenever **Q38 weight is blank**, since the fix guards with
  `if (patient.weight > 0)`. To retire a row: delete it, or clear its HCPCS
  cell. Do NOT just blank the capacity — that is the fail-closed path, which
  only suppresses the row for patients who HAVE a recorded weight.
  **RELATED, and unfixed: the engine's HCPCS ladder is K-code-only.**
  `hcpcsNum = parseInt(hcpcs.replace(/\D/g, ''), 10)` maps `K0821`–`K0864` to
  821–864, and `isGroup3 = hcpcsNum >= 848` encodes exactly that range — so an
  **E-code clears the Group-3 cutoff by arithmetic accident** (`E1161` → 1161).
  Nothing in the code states the assumption. Adding any non-K HCPCS to this
  catalog needs a deliberate decision (reject non-K rows? a real category
  column?) — it is an operator/clinical call, not a code one.
- **An operator-maintained data source that a DECISION ENGINE reads needs a
  shape check, and the fail direction on unreadable data must be CHOSEN (F9,
  cycle-16 — FIXED).** The PPD weight filter did
  `maxCap = parseInt(product.weightCapacityStr, 10); if (weight > maxCap) return false;`.
  `parseInt('')` is `NaN` and **every** comparison against `NaN` is false, so a
  blank / `'n/a'` / `'300-'` / `'-450'` capacity cell passed the filter for ANY
  patient weight — the engine read an unreadable capacity as **unlimited** and
  could recommend a chair that cannot carry the patient. Both branches now
  `isFinite`-guard and EXCLUDE the product.
  **The deeper defect was an inconsistency nobody had noticed: the same engine
  already had the opposite behaviour for the same class of missing data.** Forty
  lines above, a catalog with no `K0821` row returns `{standard:[], complex:[]}`
  rather than silently dropping the mobile-home constraint — fail closed. The
  weight filter failed open. When one function handles "catalog data I cannot
  read" two opposite ways, at least one of them is wrong; pick the direction
  deliberately and say so at both sites.
  **Fail-closed is silent, so it ships WITH a detector.** Excluding the row
  turns a data-entry slip into a chair that quietly stops being recommended, so
  `intakeCatalogIssues_` (pure, Node-pinned) names the offending SHEET rows in
  an "Intake Offerings catalog" card in Admin → Automation Health. It checks
  only what the engine actually reads and only what is objectively wrong —
  never taste: unreadable/inverted capacity and a seat type containing neither
  `s` nor `c` are ERRORS; a non-ASCII dash (`300–450` reads as a flat 300 cap,
  since the range branch splits on ASCII `-` only), a blank seat type and blank
  pdfLink/imageUrl are WARNINGS. A well-formed catalog produces ZERO issues, so
  the card genuinely reaches green — the cycle-15 rule for any health
  indicator. `getIntakeCatalogHealth_` carries `ok:false` on a failed read so an
  unreachable Intake store cannot render as a clean catalog (INV-129). The scan
  rides the SAME opt-in gate as the cycle-14 queue inventory (`scanCatalog`,
  default OFF) because it opens the Intake spreadsheet and
  `getAutomationHealthBadge` polls every 10 minutes PER MANAGER; it is
  deliberately NOT in `automationProblems_` (no daily nag, and the field is null
  on that path anyway). **Known limit: the detector requires a manager to OPEN
  the panel — it is not pushed.**
- **Intake PPD controls are engine-safe via CANONICAL-ENGLISH VALUES, not
  free-text (redesign Phase 2).** PPD questions render through TWO configs in
  `script_intake.html`: the legacy `INTAKE_PPD_TYPE` (`'yn'`/`'sev'`/`'num'`/
  `'text'`) AND the richer `INTAKE_PPD_CONTROL` (checked FIRST by
  `intakePpdRowHtml_`) for the new string-valued kinds — `choice` (single-select
  multi-button), `multi` (multi-select + optional exclusive option, comma-joined
  in OPTION order), `numunit` (number+unit), `reveal` (option → free-text box),
  `condition` (Phase-3 curated multi-select picker — a filter box over
  `INTAKE_CONDITION_LISTS[ctrl.list]` + option buttons + a selected-chip row + an
  "Add <typed>" escape for off-list values; value = comma-joined selected strings
  in `data-val`, round-trips exactly like `multi`), `ynreveal` (Phase-4 — a Yes/No
  whose `revealOn` reveals a sub-multi-select; value `''`/`No`/`Yes`/`Yes: SubA, SubB`
  — Q45 arthritis type), `ynnum` (operator feedback 2026-07-09 — a Yes/No whose
  Yes reveals a number-only field + unit text; value `''`/`No`/`Yes`/`Yes: 12 hours`,
  pure `intakeYnNumSerialize_`/`Parse_` Node-pinned — Q40 attendant hours, NOT
  engine-read). The same feedback round made `choice` groups render as separated
  pill buttons (the `multi` look — the joined segmented box wrapped awkwardly on
  Q2–Q6's long labels; CSS-only), added DISPLAY-ONLY `tone` per multi option
  (`warn`/`danger`/`no` selected-state colors on Q25/Q31a/Q34 — never part of the
  stored value, so the engine contract is untouched; Node-pinned tone map), and
  replaced the help glyph's native `title` with a tokened CSS tooltip
  (`data-tip` + `.intk-help::after`, hover + keyboard focus). EVERY
  kind serializes to/from a STRING via `intakePpdGetVal_`/`SetVal_`, so drafts,
  `intakeCollectPpd_`, the engine, and the email builder are unchanged. **The
  engine-critical questions Q25 (numbness), Q31a (stroke), Q34 (amputation) are
  now `multi` controls whose option VALUES are exactly the substrings
  `intakeDeriveClinicalFactors_` parses** (`Feet`/`Legs`; `Paralysis Left Arm`…
  comma-joined; `Left (Above Knee)`… with no stray `no`), Q38 (weight) is
  `numunit` (the engine parseFloat-parses it keeping the DECIMAL — cycle-8:
  the old `\D` strip turned "250.5" into 2505 lbs, failing every weight cap
  and reading as ≥285 for the Q39a mobile-home rule; units/commas still
  drop), and **Q39a (dwelling — operator rule
  2026-07-09) is an ENGINE-READ `choice`** (`House`/`Apartment`/`Mobile Home`;
  the engine substring-matches `mobile` → `livesInMobileHome`, and Mobile Home
  + weight under 285 lbs short-circuits the whole filter to **K0821 only** —
  the HOME constraint wins over the clinical gates by operator decision;
  ≥285 lbs / blank weight / no answer → standard logic; a catalog with no
  K0821 row → empty result). Never renumber around Q39a — the `39a` key rides
  stored answers + the engine, like 31a/33a. UNLIKE 31a/33a, Q39a COUNTS in
  the PPD progress ring/stepper (cycle-8: the bare-digit `mainQNums` filter
  excluded it, so a rep could see "45/45 complete" with the engine-critical
  dwelling answer blank — it's a full-weight primary question that's lettered
  only to avoid renumbering; the ring denominator is now 46). All of this is MORE reliable than the old free-text (no
  typos) and pinned by the Phase-0 engine-contract tests + the Phase-2 config
  drift-guard (`test/client/run.js` feeds the live config values back through the
  engine). **CANONICAL-ENGLISH VALUE RULE (load-bearing):** the stored value is
  always the option's English `v`; only the displayed `l` label is/ can be
  localized — the engine matches ENGLISH substrings, so a Spanish PPD emits the
  same engine-safe values (this also FIXED a latent bug where Spanish free-text
  never matched). **Phase 3 (shipped):** **Q29** (peripheral vascular disease),
  **Q41** (qualifying diagnoses), **Q42** (heart/lung), and **Q43** (neuro Dx) are
  now `condition` curated pickers backed by `INTAKE_CONDITION_LISTS`
  (`vascular`/`qualifying`/`cardiopulmonary`/`neuro`). Q29/Q41/Q42 are NOT read by
  the engine (display-only); **Q43 is engine-critical but read ONLY as
  truthy-vs-the-exclude-list** (`['no','n/a','none','','no.']`), so ANY non-empty
  curated (or custom-typed) value = valid neuro Dx and an empty selection = no Dx —
  pinned by the Phase-3 drift guard (feeds every `neuro` list value through the
  engine + asserts none collide with the exclude list). The condition lists are a
  **pure content constant SEEDED FOR CLINICAL REVIEW** — editable with zero engine
  risk; keep entries **comma-free** (the value is comma-joined). STILL free-text:
  **Q13** (falls — `isPositive` reads `'yes'`, result unused by the recommendation
  logic). NEVER change a Q25/Q31a/Q34 option value without re-running the
  drift-guard; NEVER reintroduce a bare `Yes`/`No` for those (it would feed the
  engine no location/side); NEVER add a Q43 `condition` option that lowercases into
  the exclude list. The server email builder already expects the comma-joined multi
  values (`INTAKE_PPD_YESNO_QS` coloring + the Q25/Q31a/Q34 chip split) — a
  server-only list, no client mirror; Q29/Q41/Q42/Q43 render as plain escaped
  comma-joined text (the `else` branch), so no server edit is needed. **Phase 4
  (shipped) — display-only polish, engine untouched, no server edit:** a hover-help
  glyph on select labels (`INTAKE_PPD_HELP`, e.g. Q32 spasticity), conditional-hide
  of secondary rows (`INTAKE_PPD_REVEAL` → `intakePpdApplyReveals_`, e.g. Q33a shows
  only when Q33=Yes — hidden rows are cleared), the Q45 `ynreveal` control (arthritis
  type sub-multi), and a Q37 numunit `parse:'height'` that normalizes a feet-inches
  entry (`5'1"` → `61`) to total inches on blur (`intakeParseHeightInches_`, pure).
  None of Q32/Q33a/Q37/Q45 are engine-read, so no drift-guard is needed; the pure
  serialize/parse helpers are Node-pinned. Optional Q31a body diagram DEFERRED.
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
  **The "is this rep enrolled?" predicate is `cnEnrolledSheetId_(row)` — the ONE
  reader of column L (cycle-9 L-11 → cycle-12 F14, now enforced).** It returns
  the trimmed id or `''`, so a WHITESPACE-ONLY cell reads as NOT enrolled
  everywhere. History worth keeping: the test was hand-written 21 times and 11
  copies tested RAW truthiness (`if (!sheetId) continue;`) while 10 trimmed, so
  such a cell made the two groups DISAGREE — the trimmed group correctly showed
  the rep the enrollment splash and offered the Admin provision button, while
  every untrimmed cross-rep walk called `openById(' ')`, threw into its per-rep
  try/catch, and **silently omitted the rep from the aggregate** (tag taxonomy,
  tag trends, the tag-transform walk, cross-rep search, shift stats, the
  unresolved-action badge, the CN export, team metrics, the EOD digest) — or, in
  Storage Health, reported a false "unreachable per-rep Sheet" for a rep who
  simply is not enrolled. A manager reading any of those numbers had no way to
  know a rep was missing. A Node tripwire now bans EVERY raw
  `EMP.CALL_NOTES_SHEET_ID` read outside the predicate (the only exemptions are
  the predicate body and `provisionCallNotesSheet`'s `setValue` WRITE) — the
  INV-142 / INV-154 boundary pattern. The employee-object builders
  (`getEmployeeInfo_`/`lookupEmployeeById_`/`submitFormByToken`) route through it
  as `cnEnrolledSheetId_(row) || null`, preserving their `null`-when-absent
  contract exactly.
- **A failed note-count read must be SURFACED, never rendered as 0 (cycle-12
  F5).** `countCallNotesInRange_` swallowed every error as `return 0`, which is
  indistinguishable from "the rep logged zero notes" — so `cnNoteCoverage_`
  produced 0% and the Clock shift-strip rendered "0% logged" in CRIT tone plus
  a **"File N missing"** CTA where N was every answered call, telling a rep to
  redo work they had already filed. Use the outcome-carrying
  **`cnCountNotesResult_(emp, from, to)` → `{count, unavailable, unenrolled}`**
  for anything user-facing. **`countCallNotesInRange_` NO LONGER EXISTS (A4,
  cycle 13).** F5 kept it as "a thin numeric wrapper for the callers that only
  want the number", but there were none — the sole remaining references were its
  own two tests, which ASSERTED it returns 0 on an unreadable Sheet. That left
  the silently-degrading variant alive under the most obvious name, pinned by
  tests enshrining the exact behaviour F5 existed to remove, waiting for the
  next author to reach for it. There is now ONE count path by construction; take
  `.count` off the result and decide what to do with `.unavailable`, which is
  the whole point. `unenrolled` (no
  Sheet configured, INV-35) is deliberately DISTINCT from `unavailable` (the
  Sheet exists but could not be read) — only the latter is an error. Every
  coverage surface nulls `noteCoverage` and sets `noteCountUnavailable` /
  `noteCountPartial` on an unavailable read, all THREE result caches skip their
  `put` on a degraded round (the L-3 / INV-129 rule), and the clients render
  "notes unavailable" / an em dash instead of a confident zero. This is the
  cycle-10 "error reads as empty" class (D1/D2a) in the one server helper it
  had never been applied to.
  **TWO SURFACES ESCAPED THAT SWEEP UNTIL CYCLE 16 — and the reason is worth
  knowing, because it is how the next one will escape too.** The sentence above
  ("every coverage surface") was written against the set of functions that CALL
  `cnCountNotesResult_`, and both misses were outside it:
  (a) **`managerGetShiftStats` counts INLINE** — it needs flags, emails and the
  completion median off the same read, so a count-only helper cannot serve it,
  and it therefore appeared in no search for the helper. Its per-rep catch
  swallowed the failure and pushed the rep with `totalNotes:0`, every
  `flagCount` 0 and `emailsSent:0`, then computed `noteCoverage` from that zero
  against the rep's REAL CDR answered count — so the manager's END-OF-SHIFT
  PERFORMANCE table showed a rep whose Sheet could not be opened identically to
  one who logged nothing all shift, CRIT-toned 0% badge included. It now carries
  `notesUnavailable` on the stats object, nulls the coverage, and the client
  renders an em dash across all six note-derived columns (Notes / Action /
  Training / Review / Emails / Median — they all come from that one read) with
  the sort comparator returning −1 so they group with the other unknowns.
  (b) **`getTeamMetrics` nulled the PER-REP coverage but computed the TEAM total
  unconditionally**, so the rail row said "partial — at least one rep Sheet was
  unreadable" while the hint four lines below it rendered a confident
  "Team-wide coverage below 80%" from the same contaminated numerator.
  **The generalizable rule: an aggregate is a coverage surface even when it
  never touches the helper.** Ask what a function DERIVES from a best-effort
  read, not which helper it calls.
- **A value written to a `data-*` attribute comes back DECODED — never re-render it
  raw (cycle-18 F1).** `setAttribute`/an HTML attribute stores TEXT, so the parser
  entity-decodes it on the way in and `getAttribute` hands back the decoded string.
  Write `data-x="&lt;img&gt;"` and you read back a literal `<img>`. That is fine for a
  comparison, a URL (`encodeURIComponent` re-encodes) or a `textContent` sink, and it is
  **stored XSS the moment the value re-enters `innerHTML`** — which is exactly what the
  roster and decision KB blocks did on every mode switch, Expand and decision answer
  (INV-193). Three rules: (a) a stored SOURCE gets re-escaped on read through one named
  boundary (`kbFenceSrc_`), never at each call site; (b) if you re-escape the source you
  must also re-escape every SIBLING channel the render MATCHES against (`data-opt`,
  `data-path`, `data-name`) or the comparison silently stops matching — the failure looks
  like a dead button, not like an escaping bug; (c) the INVERSE case exists too — a CSS
  attribute selector matches the DECODED value, so a selector built from escaped parsed
  data must be decoded first (`kbFenceDecode_`). **Attribute escapers are also easy to
  under-build:** `kbRosterAttr_` escapes quotes but NOT `&`, which is correct here only
  because every consumer compensates — an attribute that is compared against parsed data
  needs the `&` too. The glossary block is the SAFE shape to copy: it uses `setAttribute`
  + `textContent` throughout, so decoding is harmless by construction. A pin for this class
  cannot live in the pure harness — it has no HTML parser, so it cannot decode; use the DOM
  harness.
- **`:root[data-compact]` is the POP-OUT, not a viewport breakpoint (A2,
  cycle-13; FOUR MORE instances found and fixed in cycle-16 F3).**
  `data-compact="1"` is set from `?compact=1` by the pop-out button (INV-38); it
  says nothing about how wide the window is. Cycle 13 found three components
  that declared a fixed multi-column grid plus a `:root[data-compact]` override
  and NO media query, so they never stacked on a phone: `.m-layout`
  (`1.4fr 1fr` with a 42px hero numeral — and `metrics/script_metrics.html`
  carried **zero** media queries, on a REP-facing tab), plus the shared
  `.telemetry` strip and `.coach-kpis`, both `repeat(4, 1fr)`. The shell's own
  breakpoints (`styles.html` 1023px / 540px) adapt `.metric-grid` and
  `.emp-grid` but never reached these. Fixed with real media queries —
  `.m-layout` stacks at ≤720px (before either column gets narrower than the
  hero numeral), `.telemetry` + `.coach-kpis` go 2×2 at ≤540px.
  **Cycle 16 found FOUR more, all MEASURED at 390px rather than reasoned about:**
  `.kb-wrap` 280px tree / **70px reader** (a fixed `280px` track does not
  yield, so the `1fr` column absorbs the entire shortfall — and
  `kb/script_kb.html` had **zero** media queries, the same shape as metrics in
  cycle 13, on the rep-facing mid-call lookup tool); `.cnv-trio` 114 / 104 /
  94px on the app's most-used form; `.intk-row` 157 / 157px on a 46-question
  clinical intake; `.cnv-row` holding a 130px fixed label column. All now carry
  breakpoints (kb ≤720px; trio 2-up ≤720px then stacked ≤480px; intk-row
  ≤560px — the existing 760px query stacks the PPD *layout*, which still leaves
  ~350px per half, so 2-up only fails further down).
  **Pop-out geometry is unchanged because `:root[data-compact] .cnv-row` is
  specificity `(0,3,0)`** — `:root` pseudo-class + `[data-compact]` attribute +
  class — not `(0,2,0)` as this entry claimed until cycle 16. It out-specifies a
  `.cnv-row.full` media rule at `(0,2,0)`; VERIFIED BY MEASUREMENT (compact at
  480px and 700px both still render `84px 1fr`), which is the only way to be
  sure of a specificity claim you are relying on.
  **A grid that stacks in compact almost always needs a viewport breakpoint too
  — the two triggers are independent.**
  **Pinned by the A2 tripwire, which since cycle-16 F3 SCANS THE RULE rather
  than asserting three known fixes** (it previously hard-checked `.m-layout` /
  `.telemetry` / `.coach-kpis`, which is exactly why four more accumulated with
  CI green — the INV-179 lesson, and the same promotion A1/A11 got in cycle-13
  batch 5). It derives its file set from `A11Y_SCAN_PARTIALS` + `styles.html`
  and brace-matches every `@media` block.
  **Cycle-17 C17-1 (High, test integrity): the scan's regex was BLIND to
  `styles.html` in effect** — it matched only the bare `:root[data-compact]`
  the partials write, while every one of styles.html's ~67 compact overrides
  writes `:root[data-compact="1"]`, so the shared stylesheet contributed ZERO
  selectors and the file-set claim above was untrue (the `checked >= 8` floor
  was satisfied by the partials alone; INV-179's "a derived scan is only as
  wide as what it derives from", in regex form). The regex now matches both
  attribute forms, and the 9 obligations styles.html then surfaced were
  resolved per-selector: `.actions` (the LIVE punch grid — four fixed tracks
  at every real viewport) and `.field-row` (modal field pairs) gained REAL
  540px breakpoints; DEAD compact overrides for `.actions-grid`, `.ledger`
  (×3), `.ts-summary`, `.leave-balance-row` were REMOVED (INV-184 — zero
  markup emits them); `.preset-grid`'s compact `grid-template-columns` was
  dropped (it re-stated the base's identical tracks — a gap-only change that
  read as a re-columning). Carve-outs, all deliberate:
  `A2_INVERSE_OK` now holds THREE entries — `.rail-flags` (widens 2-up → 4-up
  in the pop-out — the INVERSE of stacking, so no breakpoint is owed),
  `.ts-recent-row` (base `auto 1fr auto` — content-sized tracks, one flexible
  middle; the compact override only drops the leading icon column), and
  `.hero` (the only live consumer, `.dash-hero`, sets `display:block`, so the
  base 2-col grid never applies — verified by the 390px clock scenario) —
  and `A2_INTRINSIC` (a base using `auto-fill`/`auto-fit`/`min()`/`clamp()`
  already reflows — `.m-kpi-grid` is `repeat(auto-fill, minmax(140px,1fr))` and
  its compact override exists only to PIN 3 columns). The last is a property
  of the RULE, so it lives in the rule, not the allowlist.
  **A side effect worth remembering: stacking a row can EXPOSE a latent
  overflow elsewhere in it.** Stacking `.intk-row` moved the help glyph to the
  end of a full-width question, and its `left:-10px` / 58vw tooltip then ran
  past the row — measured as document `scrollWidth` 468 against a 390 viewport,
  i.e. the whole page scrolled sideways. Right-anchoring the bubble inside the
  same breakpoint restores 390/390. Re-measure `scrollWidth` vs `clientWidth`
  after any stacking change; a squeezed layout and an overflowing one look
  identical in a screenshot.
- **A best-effort overlay whose ABSENCE is reassuring must announce itself
  (F4, cycle-16 — FIXED).** `getCoveragePlan`'s PTO read was wrapped in
  `catch (e) { /* best-effort — coverage still renders */ }`. Best-effort was
  the right call (a coverage grid with no PTO overlay still beats no grid), but
  SILENT was not: with `ptoMap` empty **every rep counts as working**, so the
  hourly strip renders green/adequate on a day half the team is off, and the
  "All business hours meet the N-rep minimum" all-clear becomes *guaranteed
  rather than earned*. A planner whose entire purpose is understaffing
  detection had, as its failure mode, the single most reassuring answer it can
  give — with no signal anywhere in the response for the client to render.
  It now returns `ptoUnavailable` (additive; an older client ignores it), the
  manager view shows a `role="alert"` banner stating PTO is not reflected and
  the bands are an UPPER BOUND, and the green all-clear is downgraded to a
  neutral "No understaffed hours found — but time-off data is missing, so this
  is not an all-clear." **The test to apply to any `catch` around an overlay:
  if the empty overlay makes the output MORE reassuring rather than less, the
  degradation must be visible.** Same family as the note-count entry above and
  INV-129; the difference is that here the swallowed read feeds a *judgement*
  (a staffing band, an all-clear) rather than a number, so suppressing the
  judgement matters as much as flagging the data.
- **An UNKNOWN duration is not the same as an elapsed one — never substitute
  "now − start" for a missing END timestamp (F8, cycle-16 — FIXED).**
  `getDeptRequests` computed a request's elapsed minutes as
  `(resolvedMs && createdMs) ? resolved − created : (createdMs ? now − created : null)`.
  Read the fallthrough carefully: it fires not only for an OPEN request (where
  "how long has this been waiting" is exactly right) but also for a request
  marked **resolved** whose `ResolvedAt` cell is blank or unparseable — where the
  honest answer is "unknown". That row then reported its **full age** as its
  resolution time, and because the age grows every day, it inflated the
  department's `avgMinutes` and `medianMinutes` a little more on each read,
  forever. Those are the numbers the per-dept SLA targets (`DR_SLA_TARGETS`) are
  chosen against, so the corruption feeds back into the thresholds. It is
  reachable two ways: a manual sheet edit, or a failure between
  `markDeptRequestResolved_`'s two `setValue` calls. The fix is one line —
  branch on the status FIRST, and yield `null` when a resolved row has no usable
  end stamp. **The general rule: when a duration needs two timestamps and one is
  missing, the result is `null`. A plausible substitute is worse than a gap,
  because a gap is visibly a gap and a substitute silently becomes data** —
  the same instinct as the note-count and PTO-overlay entries above, applied to
  arithmetic rather than to a read outcome.
- **`timeToMins_` returns `null`, never `NaN` — and an ARITHMETIC caller must
  guard EXPLICITLY (A3, cycle-13 — FIXED).** It used to return `NaN` on an
  unparseable Timesheet TIME cell, which is the worst possible sentinel here
  because every `NaN` comparison is FALSE and `NaN` arithmetic is contagious:
  `getPunctualityReport` did `if (lateMin > grace) late++; else onTime++;`, so a
  bad row fell through to the else and was scored **ON TIME** — and its
  earliest-punch pick (`mins < r.days[d].in`) was also false against `NaN`, so
  ONE bad row pinned the whole day even when a valid ClockIn existed on it;
  `calcHours_` returned `NaN` and `totalHours += NaN` turned an entire
  timesheet's total into `NaN`. Now `null`, so the callers' explicit
  "not computed" branches fire: punctuality `continue`s, the timesheet counts
  the day INCOMPLETE (**not** 0 hours — that would understate payroll
  silently), the dashboard sparkline and the calendar omit it. `calcHours_`
  propagates `null` for a corrupt CLOCK pair but a corrupt LUNCH pair only
  drops the deduction (the "no lunch recorded" shape) rather than voiding an
  otherwise-valid day. **THE TRAP:** `getCoveragePlan` does
  `dayDelta * 1440 + timeToMins_(...)`, and `x + null` **coerces to `x`** —
  placing the rep's shift at midnight, strictly WORSE than the `NaN` it
  replaced (which merely dropped them from the buckets). Any new caller that
  does arithmetic on the result needs an explicit `=== null` check, not a
  truthiness test (`0` is a valid midnight). Pinned by the A3 behavioural +
  caller-shape tripwires and the `timeToMins_nullOnUnparseable` smoke test.
- **`color-mix` for a SEMANTIC colour must interpolate `in oklab`, never
  `in oklch` (V-1, cycle-12 visual audit — FIXED).** The four `-deep` aliases
  declare correct fallback hexes (`--warning-deep: #8a4500` amber,
  `--danger-deep: #8a1f1f`, `--success-deep: #0b6e40`) and then an `@supports`
  block replaces them with a `color-mix`. With `in oklch` the hue interpolates
  **on the polar arc**, and light-mode `--ink` (`#0f1623`) sits at hue ≈264, so
  amber (h 70) travelled 70→0→264 — *through red*. Measured in Chromium before
  the fix: `--warning-deep` resolved to **hue 354.8 (RED)**, `--danger-deep` to
  330 (magenta), `--success-deep` to 204 (cyan); `--info-deep` was fine only
  because blue already matches `--ink`'s hue. Dark mode mixes 25% against
  `--paper-card` and was correct, so **the same token was a different hue family
  per theme** across 254 consumers — concretely `.actions .sec.act-lunchout`
  painted Lunch Out destructive-red in the default theme. All four now use
  **`in oklab`** (rectangular, no hue arc): worst remaining drift 10°.
  `--selection-bg` / `--border-strong` / `--ring-focus` deliberately stay on
  `in oklch` (hue-safe — they mix with `transparent` or a low-chroma neutral
  pair). Two things made this invisible: reading the token file suggests the
  fallbacks are what ship, and the `--muted-2` tripwire measures LUMINANCE,
  which a pure hue rotation leaves untouched. Now pinned by the V-1 tripwire
  (source-level `in oklab` + a computed ≤20° hue-drift bound, both modes) —
  don't add a `-deep` alias, or "correct" a fallback hex, without re-running it.
- **Text on a FIXED-palette surface must use a fixed colour, not a theme token
  (V-2, cycle-12 visual audit — FIXED).** The clock card's sky gradient does not
  flip with the theme, but `styles.html`'s
  `.hero .clk-time .ampm { color: var(--muted) }` (specificity 0,3,0) beat
  `tc/script_clock.html`'s (0,2,0) `.clk-sky .clk-time { color: #fff }`, so the
  AM/PM span alone tracked the theme while its background didn't — measured
  **1.20–2.00:1 across the whole card in dark mode**, i.e. illegible AM/PM on
  the live clock of a time-tracking app. Fixed by one rule,
  `.clk-sky .clk-time .ampm { color: rgba(255,255,255,.88) }` (theme-identical
  now: 3.89 / 2.45 / 1.52 against the gradient's blue end / midpoint / amber
  end). NOTE the amber-end ratio is a CARD-level question — `.clk-time` itself
  is white-on-amber at the same ~1.5:1 — so it needs an operator design call
  (scrim, or a darker gradient end), not a per-span patch.
- **A `max-height` on a GRID CONTAINER does not constrain its row (V-9,
  cycle-12 visual audit).** The Reference two-column shell (`.kb-wrap`) needs
  two things at once: a SHORT landing must hug its content (a fixed height left
  ~535px of empty card, reading as a half-failed load) while a LONG article must
  scroll INSIDE its panel rather than growing the page. Moving the fixed height
  to `max-height` on the WRAP looks like the fix and is not: measured in
  Chromium, the grid ROW grew to 13.7k px, the panel overflowed the capped
  container, and the reader's internal scroll was GONE. The cap belongs on the
  grid ITEMS (`.kb-wrap > * { min-height: 0; max-height: … }`) plus
  `align-items: start` so the shorter column doesn't stretch. Verified both
  directions after the fix (landing panel 260px hugging 241px of content; a
  400-paragraph article capped at the viewport and scrolling internally). Any
  new capped-but-content-sized grid here must be MEASURED, not reasoned.
- **The app has ONE primary-button vocabulary: `--accent` green (V-8,
  cycle-12).** `.btn-modal-ok` — the SHARED modal primary behind ~25 call sites
  — was `--ink` on `--ink`, the only inverted button in the app: a near-black
  full-width bar in light mode (on "Generate ADP Export", the money-facing
  action, where near-black reads as disabled/error) and near-WHITE in dark,
  where it visually out-competed the real green primary above it. It now matches
  `.actions .prime` / `.cn-action-prime` exactly. `.ui-dialog-ok.is-danger`
  still overrides at (0,2,0), so destructive confirms stay red. A new primary
  action belongs on this class, not a bespoke one — and never inverted.
- **A state that can be ZERO must not be painted in a SURFACE colour (V-10,
  cycle-12).** The live-status sparkline drew a zero-hour day in `--paper-2` at
  1px — 1.10:1 against the card in light mode and ≈ the card in dark — so a rep
  with 3 days off rendered as a 4-bar sparkline instead of 7 bars with 3 empty,
  making "didn't work" indistinguishable from "no data for that day". Now
  `--muted-3` at 3px (2.28:1 light / 2.20:1 dark). `--muted-3` is the
  DECORATION-ONLY tone per the token contract, which is exactly what a
  visible-but-quiet baseline is — don't reach for a text tone here, and don't
  reach for a surface tone either.
- **Two chip rows with the same shape must not do different things (V-12,
  cycle-12).** The CN Log view rendered a FILTER row (toggle pills with real
  `aria-pressed` state, filtering today's stack in place) and, ~400px below, a
  JUMP row (navigating to History for the week) — same 999px pills, same
  colours, same count-badge vocabulary, DIFFERENT numbers and DIFFERENT
  behaviour, distinguished only by an 11px mono kicker. The navigating row is
  now a link affordance (no pill outline, `--info-deep`, a per-chip chevron,
  underline on hover, and a label naming the destination); the filter row keeps
  the pill because it genuinely carries toggle state. Rule: reserve the pill for
  stateful toggles, use link treatment for navigation.
- **A class-wide attribute write assumes every member of the class is yours
  (operator 2026-08-11).** `index.html`'s theme reflector did
  `querySelectorAll('.sb-theme-btn')` and wrote `aria-pressed` on every hit —
  correct while that class had exactly two members, wrong the moment the
  reminder-alert toggles reused it for its look. The toggles rendered
  `aria-pressed="true"` in markup and read `false` in the live DOM on every
  load, so the sound toggle silently reset itself each session. The reflector
  now selects `.sb-theme-btn[data-theme-target]` — the attribute that actually
  means "this is a theme button". **Reusing a class for its APPEARANCE is
  normal; what is not safe is a writer keyed on that class rather than on the
  thing it identifies.** The bug is invisible to source review (the markup is
  right) and was found only by reading the attribute back in a real browser.
- **A pill tab strip must scroll inside itself, or it pushes the whole page
  sideways (operator 2026-08-11).** `.toolbar-tabs` is an `inline-flex` pill
  with no wrap and no scroll; the Admin sub-tabs are five of them, which
  measured 415px against a 390px viewport — the entire page scrolled
  horizontally. It now carries `max-width: 100%; overflow-x: auto` with
  `flex: 0 0 auto` tabs, so the strip scrolls internally and wide layouts are
  byte-identical (max-width only binds when the row would overflow). The
  Admin tab had never been shot at a mobile width, which is how a shared
  component used on several surfaces kept a phone-width defect — see the
  Visual Audit Stage's list of still-uncovered scenarios.
- **The `hidden` attribute LOSES to any class rule that sets `display`
  (operator #2 batch, 2026-08-06 — MEASURED).** The UA stylesheet's
  `[hidden] { display: none }` is ordinary specificity, so
  `.m-controls { display: flex }` beats it and the element renders visible
  with `hidden` set — the Metrics Custom… date rows shipped visible on the
  first shoot exactly this way. Any element that BOTH carries a
  display-setting class AND is toggled via the `hidden` attribute needs an
  explicit `.the-class[hidden] { display: none; }` companion rule
  (`.m-custom-row[hidden]` is the in-tree example, pinned by the #2 pin).
  The alternative idiom — toggling a `.collapsed`/`.open` class — avoids the
  trap but then owes the A11 tripwire its aria-expanded bookkeeping; either
  is fine, half-and-half is not.
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
  **A second email-safe rule (2026-08-11): never place `logoUrl` on a coloured
  fill** — it is a JPEG with no transparency, so a navy band frames it as a
  white rectangle. Every email puts the mark on the light card over a navy
  rule; and because most clients block remote images by default, the `alt`
  text carries the cell's own type styling so a blocked logo still reads as
  the brand.
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
  Every client-writable input into it is size-bounded: the submit-path keys
  via `sanitizeCallNotePayload_`'s caps (INV-143), and — since cycle 11
  (L-1) — the four email-composer subform detail objects via
  `CN_EMAIL_DETAILS_MAX_CHARS` (16k combined serialized, enforced in
  `validateEmailSelections_` so BOTH Preview and Send reject identically;
  `sanitizeEmailSelections_` also coerces non-object details to null). They
  were the one unbounded input: a huge pasted specialNote rode into the
  ~50k-cap cell, the post-send stamp failure was swallowed (INV-42), and a
  near-cap blob made every later pin/flag/feedback write on that note throw.
  **Cycle-12 F11 closed the same class in the LENGTH dimension:** the two
  APPEND-ONLY arrays (`feedback[]` — one entry per manager reply / comment /
  rep ack / clarification — and `externalEmails[]` — one per external send)
  had no bound at all, so a long coaching thread on one note, or a note
  emailed repeatedly, walks the cell toward the same limit. All FOUR appends
  now go through `cnAppendBounded_`, which enforces an entry-count cap
  (`CN_FEEDBACK_MAX_ENTRIES` 200 / `CN_EXTERNAL_EMAILS_MAX_ENTRIES` 100) AND a
  serialized-size check (`CN_SUBFORM_MAX_CHARS` 45k, under the cell limit),
  REFUSING with an actionable error and popping the entry back off rather than
  silently dropping the oldest (these arrays are the coaching/send RECORD — the
  INV-96 posture). **The non-growing writes (flag / resolve / pin) are
  deliberately NOT size-gated** — they set scalar fields and are the recovery
  path for an already-oversized note; gating them would make such a note
  unfixable. The `externalEmails[]` stamp runs after a successful send, so a
  refusal there only logs (INV-42) and skips the cell write.
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
  `cnLoadDateRange_`, `cnFireSearch_`, `cnMgrLoadQueue_`,
  `cnMgrLoadRepNotes_`) captures `const requestedView = currentView;`
  and skips the render branch on success/failure when
  `currentView !== requestedView`. (The dead `cnLoadDate_` wrapper was
  REMOVED in cycle-17 batch ⑥ together with this list's mention of it —
  the A4 precedent.) Without this guard, a slow-network
  nav-away clobbers the new view's innerHTML because every view writes
  into the same `#view-area` node. State updates (CN_STATE.*) still
  happen unconditionally so the cache stays warm for when the rep
  returns. Apply the same pattern to any new Call Notes loader.
  **A structured `{error}` response is NOT a wipe (cycle-17 C17-5):** only
  the not-configured (enrollment) branch may clear
  `rollingNotes`/`historyNotes`; any other `{error}` — and every transport
  failure — PRESERVES last-good, sets
  `rollingLoadFailed`/`historyLoadFailed`, and NULLS the SWR stamp
  (`rollingEntry`/`historyEntry`) so a failed round is never served as
  fresh (the INV-129 cache-only-on-success rule applied client-side). A
  failed load with NO last-good renders `errorStateHtml_` in the stack,
  never the empty-day state (the skip-render/INV-187 variant the A12
  tripwire cannot see). Pinned by the C17-5 pin.
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
  `cnStartAmbientPolling_()` restarts it on return to any CN tab —
  `showView` calls it symmetrically for `callNotes`-tool views (cycle-8
  fix; previously only the Log enter started it, so a deep-link/
  refresh-restore into History/Search left the badge + flag propagation
  dead). The start is IDEMPOTENT (a live timer is left alone) so
  CN-internal tab hops don't fire an extra RPC per nav.
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
  (the KB drawer is exempt). **Focus lifecycle (a11y batch H):** on a
  closed→open transition `ensureOverlay` stashes the trigger element and
  defer-focuses the first focusable inside the dialog (skipped for
  hover-mode popovers and when the module already placed focus inside);
  `closeOverlay` restores the trigger ONLY when the overlay actually
  closed — a hook may legitimately refuse (the INV-145 mid-send guard),
  and yanking focus then would fight the module (DOM-pinned).
  `uiConfirm`/`uiPrompt` also restore the trigger on cleanup.
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
- **Clock view coverage strip is SWR-cached per day (cycle-9 M-6).** The
  Clock view's `loadCoverageStrip_` paints `CLK_COVERAGE_CACHE` (date-keyed)
  instantly, then ALWAYS background-refetches `getMyMetrics(today)` and
  re-renders — the `CLK_NOTEVOL_CACHE` pattern. (The pre-cycle-9 cache-hit
  early-return froze "N% logged · File N missing" for the WHOLE day: the
  formerly documented nav-away-and-back refresh path re-entered the loader
  and hit the cache, so a rep who filed the missing notes kept seeing the
  stale CTA until reload/midnight — worst in the pinned all-shift pop-out.)
  Freshness is now bounded by `getMyMetrics`'s 5-min server result cache
  (L-1), and an error/failed refetch keeps the last-good render (blank only
  on a cold miss). Don't reintroduce a cache-hit early-return here.
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
  must re-resize the canvas the same way. **Typed-signature alternative
  (a11y):** both pads (this one and the EmpDocs twin) expose
  `setTypedName(name)` behind a "Can't use the pad? Type your signature
  instead" disclosure — the typed name renders ONTO the canvas in a script
  face, so the exported artifact stays the same PNG data-URL class as a
  drawn signature and the whole downstream pipeline (600px export cap,
  size caps, hashes, certificates, C13 dual-verify) is untouched. Node
  parity pin `both pads carry setTypedName` keeps the twins in lockstep.
- **`form_public.html`'s local `esc()` escapes quotes (F cycle-8) — don't
  "simplify" it back to `textContent`→`innerHTML`.** Unlike the shell's `esc()`,
  the standalone public page had its own copy that escaped only `&`/`<`/`>` (the
  `textContent`→`innerHTML` round-trip doesn't encode `"`/`'`), yet it's used in
  ATTRIBUTE contexts (`value="' + esc(x) + '"`). Every value there is a hard-coded
  literal today, so it was latent — but a future server/recipient string rendered
  into an attribute would break out. `esc()` now escapes `& < > " '` explicitly;
  keep it that way (matches the shell `esc()`).
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
  `#cn-frame` writes the full formatted CRM template via
  `cnFormatNoteForCopy_` — since 2026-08-13 ONLY when the selection is
  collapsed; a real selection copies what is selected (see the
  manual-copy-failover Key Design Decision for why the blanket
  intercept inverted into a bug once the fields became contenteditable).
  COROLLARY: any document-level keyboard handler that exempts form
  fields must check `document.activeElement.isContentEditable` in
  addition to the `INPUT`/`TEXTAREA`/`SELECT` tagName check — the `.ce`
  divs are DIVs, so a tagName-only guard misses them. The shell's
  bare-`?` shortcuts-overlay handler (`script_core.html`) regressed on
  exactly this (a literal `?` typed into Issue/Resolution opened the
  overlay and swallowed the keystroke) until the isContentEditable
  check was added.
- **Sixteen client-side localStorage keys total.** All per-browser, all
  wrapped in try/catch so a privacy-mode browser doesn't break:
  - `umsTimeClockMode` — dark/light preference (read by the boot
    script in `index.html`).
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
  - `umsKbPanel` — KB drawer preferences as ONE JSON blob:
    `recents[]` ({id, title}, capped 5, deduped) + `suggest` (bool,
    default true — the context-suggestions toggle) + `aiSeen`
    ({hash, date} — the Phase A guidance card's collapse-after-seen
    marker; same facet combo renders collapsed for the rest of the
    day) + `deptCollapsed` ({deptName: bool} — the Reference tab's
    collapsible-department open/closed state, written by `kbToggleDept_`)
    + `bookmarks[]` ({id, title}, capped 12, deduped — #5 per-rep favorites,
    toggled via the reader/drawer star `kbToggleBookmark_`/`kbBookmarksToggle_`,
    surfaced in a Bookmarks block atop the Reference landing + the drawer home).
    Sanitized on read (corrupt blob → `{}`); deliberately a
    single key so drawer prefs don't multiply the key count.
  - `umsLastView` — the active tab key, written by `showView` on every
    navigation EXCEPT in the compact pop-out (cycle-10 D8 — a pinned
    pop-out must not steer the main window's boot tab). On boot (when no
    `?tool=` deep-link is present) the shell
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
  - `umsCoachingMode` — the merged Coaching tab's Mine/Team mode (managers
    only; `'mine'` | `'team'`, default `'team'`). Reps never write it (they're
    always pinned to `'mine'` and never see the toggle). Read by
    `coachReadMode_`, written by `coachSwitchMode_`.
  - `umsWhatsNew` — the "What's new" seen-stamp (`{seenStamp}` — the designated
    KB article's edit timestamp at last panel dismissal, INV-152). Since the
    operator-feedback round (2026-07-09) the panel NO LONGER auto-opens:
    updates surface as rotating slides in the Dashboard greeting bar
    (`clkGreetRot*` + the pure `whatsNewItems_`), and the stamp gates the NEW
    accent on those slides. Clicking a slide / the sidebar star opens the full
    panel; ANY dismissal path (Got it, Esc, backdrop — the modal renders no
    separate X button) stamps it via
    `whatsNewClose_`. Corrupt blob = never seen (NEW accent shows — fail-open).
  - `umsNotify` — reminder-alert channels as ONE blob (`{sound, desktop}`,
    operator 2026-08-11). `sound` DEFAULTS ON (a corrupt/absent blob reads as
    sound-on, desktop-off); `desktop` is only ever set true after the browser
    actually GRANTS permission, so it can't promise a channel that will never
    fire. Read by `notifyPrefs_`, written by the sidebar/mobile-header bell +
    pop-out toggles. Being localStorage, it is shared origin-wide, so setting
    it in the main window also governs the compact pop-out (whose sidebar is
    hidden).
  - `umsTheme` — the colour PALETTE (operator 2026-08-12): `'sand'` / `'plum'`
    / `'teal'`, or ABSENT for the default Console. Console deliberately stores
    NOTHING rather than the string `'console'`, so an untouched browser and a
    deliberately-reset one look identical in localStorage — and the boot script
    validates against `PALETTE_KEYS`, so a corrupt value degrades to Console
    rather than being reflected onto `<html>`. Read + applied SYNCHRONOUSLY in
    the `<head>` (the `data-mode` discipline — a palette flash on every load
    would be worse than no palette), written by `setTimeClockPalette`.
  - `umsTzWarnedDay` — the roster-vs-browser timezone-mismatch warning's
    once-per-day stamp (operator 2026-08-13; the 9:30 PM note diagnosis).
    Written by `tzMismatchCheck_` when the browser's UTC offset disagrees
    with the roster timezone's; the sticky warn toast then fires at most
    once per browser-local day. Absent/corrupt = the check may warn today.
  - `umsDashMetrics` — the Dashboard metric cards' same-day SWR blob
    (`{day, data}` — the last COMPLETE, fully-successful
    getDashboardMetrics round for all three periods). Seeded on a same-day
    cold boot so a reload paints instantly; the refetch still runs
    (freshness is never inherited — INV-156), and partial/failed rounds
    are never persisted (INV-129). Aggregate call metrics only — no PHI.
  - `umsRemindFired` — the reminder ticker's CROSS-WINDOW fired-set
    (`{day, keys}`, operator 2026-08-17: the main window and a pinned
    pop-out each run `remindersTick_`, so every break/clock-out reminder
    toasted + chimed TWICE). `remindOnce_` checks + writes it, so a
    reminder fired in ANY window is marked for all; a different `day`
    resets it (the in-memory set's own rollover rule), and a
    localStorage-throwing privacy-mode browser degrades to per-window
    dedupe — the pre-fix behavior, never worse.
  Clearing browser data wipes all sixteen. (`umsMergeMode` — the Time/PTO
  Time Off ⇄ Timesheet mode — was RETIRED with the 2026-08-18 consolidation:
  the two modes were one page with a swapped 240px rail, so the rail now
  stacks both; a stale stored value is simply ignored.) (`umsCallNotesLastDept` — the
  composer's last-dept default — was REMOVED by operator decision 2026-08-13:
  pre-selecting the previous note's departments on an unrelated note invites a
  mis-send, and the failure mode is an email leaving the building rather than
  retyping. A re-send still restores the note's OWN stored departments. The KB
  AI facet-gather's department facet, which piggybacked on this key, is simply
  absent now.) (A prior key,
  `umsDashboardCompact` — an in-page Dashboard compact toggle — was REMOVED in
  the dashboard-feedback batch: the toggle button lived inside the column it
  hid, so once collapsed there was no way back, and the `?compact=1` pop-out
  already covers compact.)

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
  server-side** — the 43 Admin-exclusive endpoints (INV-136's list) gate on
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
  **`showView` re-checks `tabVisibleForUser_` before dispatching (F8,
  defense-in-depth):** it is the low-level dispatch reached by DIRECT callers
  (drill-throughs, `?tool=` deep-links, `umsLastView` restore, tab-bar clicks) —
  not only via `enterTool`, which already resolves a visible tab — so a direct
  call for a gated tab (`managerOnly`/`adminOnly`, no `also`) routes back through
  `enterTool` (which bumps to a visible tab). No recursion (`enterTool` re-enters
  with a visible tab that passes the guard); `empState` is set at boot before the
  first nav, so it never wrongly redirects. Server endpoints still re-gate — this
  is UI-only hardening.
  **`shortLabel` (optional per TOOL) is the nav-label source everywhere** — the
  mobile bottom nav (cycle-11 V-6), and since cycle-12 V-5/V-7 the sidebar link
  AND the sidebar sub-label too. The full `label` rides along as a `title`. It
  exists because the nav is width-constrained on three surfaces at once: at the
  shipped 168px sidebar default the full labels CSS-ellipsised 2 of 7 tools
  ("Call N…", "Training & …"), at 390px "Call Notes" was the one mobile label
  that wrapped, and the sub-label's two-line wrap pushed every sidebar nav item
  down 11px — so navigating MOVED the navigation. Set `shortLabel` on any tool
  whose label is longer than ~9 characters. (The two sidebar user fields carry
  titles for the same reason — they also truncate at the default width.)
  Adding a new tab: append it to its tool's `tabs` map + implement
  the `enter*` handler in the tool's partial. Adding a new tool:
  add a TOOLS entry + drop tab partials + `include()` them from
  `index.html`. The shell auto-rebuilds either way.
  **ACTIVE STATE MUST BE EXPOSED, NOT JUST PAINTED (A11, cycle-13).** Both nav
  levels set an `.active` class — `enterTool` on `.sb-link`/`.nav-btn`,
  `showView` on `.tt-btn` — and a class is invisible to assistive tech, so a
  screen-reader user was never told which TOOL or which TAB they were on. Both
  now set `aria-current="page"` in the same pass (and remove it on the others);
  any new nav surface must do the same. The rule generalizes to every stateful
  control: a segmented toggle uses `aria-pressed` (the Dashboard period
  switcher, kept in step by `clkDashSet_`) or, inside a `role="tablist"`,
  `role="tab"` + `aria-selected` (the Coaching Mine⇄Team toggle — whose wrapper
  already declared `role="tablist"` while its tabs carried no role at all — and
  the CN composer tabs, which were already correct); a disclosure uses
  `aria-expanded` + `aria-controls` (the Coverage day row, the CN
  Training-Answers tray). **An inline `onclick` that toggles a class cannot keep
  an attribute in step** — the CN tray's
  `this.parentElement.classList.toggle('collapsed')` was extracted to
  `cnToggleQaTray_` for exactly that reason. Pinned by the A11 tripwire (which
  batch 5 GENERALIZED from six hand-listed surfaces to a rule over every scanned
  partial — that promotion immediately surfaced eight more instances, so treat
  the tripwire, not this paragraph, as the enumeration).
  **A SECTION HEADING IS AN `<h2>`, NOT A STYLED `<div>` (A13, cycle-13).**
  Heading navigation is the primary way a screen-reader user moves through a
  dense page, and every view rendered exactly ONE heading — its `<h1>` — then
  used `<div>`/`<span>` for every card label below it, so that navigation
  stopped at the page title on ~30 surfaces. The three section-heading classes
  (`.card-label` 20 sites, `.tr-card-title` 5, `.dash-seclabel` 2) now render as
  `<h2>`. Each class already fully specified its own typography, so the
  conversion needed only a UA-margin reset (`margin-top: 0` on `.card-label`,
  which already set `margin-bottom`; `margin: 0` on the other two, which sit in
  flex head rows) — the render is pixel-identical, verified by re-shooting the
  visual matrix. `.kicker` stays a `<div>` (an eyebrow ABOVE a heading is not
  itself one) and `.rail-card` was already using `<h4>`. Pinned by the A13
  tripwire, which scans by CLASS rather than counting tags, so a NEW card added
  as a div fails.
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
  in-memory + CacheService CDR caches around each). **Two editor-test hazards, both found by the cycle-14 run
  after `runAllTests` had not been run since cycle 10.** (a) **A test that
  writes "today" in a TARGET employee's tz is time-of-day dependent.**
  `managerSaveDayRange_appliesAcrossDays` built its range in `CONFIG.TIMEZONE`
  (Asia/Kolkata) but targeted the PH employee, and the INV-05/L-4 guard
  evaluates "is this slot time still in the future" in the TARGET's tz — so any
  run before 09:00 Manila failed on a CORRECT guard. It had been silently flaky
  since cycle 9. Windows that don't need today should end YESTERDAY; a test that
  genuinely needs the boundary must derive its times from the target's own clock
  and SKIP near midnight there. (b) **A fix that closes a creation path breaks
  every test that used that path to build its fixture.** Cycle 11's M-1 (the
  INV-94 dup-date guard extended to the →Approved transition) made
  `fixPtoReconciliation_creditsAndIdempotent`'s setup unreachable — the test
  approved two same-date rows to simulate the legacy H1 damage the repair
  endpoint exists to undo. Such a fixture must forge the legacy row DIRECTLY
  (sheet write + manual `adjustLeaveBalance_`), which is also more faithful:
  that is how the damage exists in production. **THE TRAP, which cost a second
  failed run:** `hasActiveTimeOffOnDate_` excludes ONLY the row being approved,
  and matches Pending OR Approved — so TWO PENDING rows on one date make the
  **FIRST** approval fail, not the second. A fix that assumes only the second
  call is blocked (as the first attempt here did) still fails. The fixture must
  never hold two ACTIVE rows on the date at the moment it calls the endpoint:
  approve ONE row through the front door, then append the duplicate
  already-Approved. This is the "update the test doubles as part of the fix"
  rule — it was missed, and the editor-only suite meant three cycles passed
  before anyone saw it.
  **Mid-body skips
  are honest (cycle-8 M-14):** a test whose fixture/optional config is
  unavailable calls `_skipTest(reason)` — recorded as SKIP, never PASS
  (13 sites used to `_assertTrue(true, '…skipped')`, inflating the
  pass count and hiding fixture rot). The S1.1 ADP-tz tripwire is the
  deliberate exception: an unreachable ADP spreadsheet FAILS it (a
  broken deployment is not a skippable precondition). Expect SKIP rows
  in `runAllTests` output wherever fixtures aren't provisioned.
  **KB tests run against a fixture too (cycle-10 M-9):** `_withTestKb_`
  redirects `getKbSS_` at a `TEST_KB_SS_ID` fixture spreadsheet (created
  lazily via `createPinnedSpreadsheet_`; the shared tree cache is
  invalidated on entry AND exit since `KB_CACHE_KEY` isn't store-keyed).
  Before this, every full run mutated the LIVE KB store and appended
  permanent rows to the append-only `KbRevisions` tab. `cleanupTestData`
  backstop-sweeps `TEST_`-titled KB + KbRevisions rows (live + fixture)
  and the HR fixture's `Coaching`/`EmpDocTemplates` tabs; the HR fixture
  is factory-pinned (tz+locale) like the CN fixture. Since cycle 11 (M-3)
  `test_training_quizFlow` ALSO runs against the fixture (`_withTestKb_`),
  and `cleanupTestData` sweeps the Quizzes tab (live, `TEST_`-titled) plus
  the fixture's Quizzes/QuizAttempts — the live Quizzes tab was the one
  training tab with no backstop, so a timeout-killed run used to orphan
  `TEST_TRAINING_QUIZ` into the real manager quiz list permanently.
  **The public-form tests' witness rows have their own sweep key (cycle-11
  M-2):** `submitFormByToken` writes `FormSubmissionReceived` with the
  synthetic actor `EXTERNAL` (INV-113), which the `TEST_` prefix can never
  match — the tests' reserved recipient domain `example.invalid`
  (production-impossible TLD) is the cleanup key instead, applied to the
  AuditLog witness rows AND orphaned FormTokens/FormSubmissions rows.
- **PTO bucket state lives in the Employees sheet** (columns
  I/J = AnnualLeaveBalance / SickLeaveBalance; column K =
  PtoEnabled per-employee toggle). Time-off rows in
  TimeOffRequests don't carry balance — they trigger balance
  updates on approve/revert transitions.
- **Per-employee PTO opt-out via `EMP.PTO_ENABLED` column.**
  An employee who earns no paid leave gets `FALSE` in column K; their UI
  hides the PTO ring and balance line entirely, and `adjustLeaveBalance_`
  refuses to move their balance. Single codebase serves both paid and
  unpaid populations without forks. **The PH team is NOT such a population
  — operator 2026-08-19: they ACCRUE, so their column K is `TRUE` and their
  column Q carries a rate.** This document named them as the canonical
  `FALSE` example for months, and the two facts are load-bearing together:
  `creditMonthlyPtoAccruals` skips a `FALSE` rep, so if the example had been
  true the accrual feature would have credited nobody. Check column K before
  concluding a population does not accrue.
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
  **Contrast rule (batch I):** `--muted-2` is the SECONDARY-TEXT tone and
  must stay WCAG-AA (≥4.5:1) on every surface in both modes (light
  `#5f6878`, dark `#7b8496` — a run.js tripwire computes the ratios from
  this file and fails CI on a regression); `--muted-3` is DECORATION-ONLY
  (borders, chevrons, dashes) — never body text. **Type scale (batch J):**
  `--text-xs/sm/base/lg/xl` — adopt for NEW rules; existing sizes migrate
  opportunistically. `--radius-pill` (999px) is the pill idiom's token.
  **Register rule (batch J):** the mono-uppercase micro-label treatment is
  reserved for kickers, chips, and table headers; secondary labels
  (`.card-label`, CN field labels, `.cn-stat-lbl`, rail-card headings) are
  sentence-case `var(--ui)`.
- **Colour palettes are a SECOND attribute overlay, orthogonal to light/dark
  (operator 2026-08-12).** `data-palette` on `<html>` (+ `body`), set
  synchronously in the `<head>` from `localStorage.umsTheme` by the same
  no-flash bootstrap that applies `data-mode`. Five options — **Console**
  (default), **Sand** (warm paper, green accent), **Sage** (soft green paper,
  muted sage-green accent), **Plum** (mauve paper, violet accent), **Teal**
  (cool paper, teal accent) — **each with its OWN dark block**, not a shared
  one: a palette is a light block plus a dark block, so dark mode is re-tinted
  per palette too (Sage dark paper `#060f08` vs Console's `#0a0d14`). Picked
  from a swatch row
  in the sidebar + mobile header (`setTimeClockPalette`, reflected by
  `syncPaletteToggleState`). Console declares NO stylesheet block and stores
  NOTHING, so an unknown/corrupt value degrades to the shipped look.
  **TWO RULES make this safe, and both are pinned:**
  (1) **A palette may redefine ONLY the neutrals and the accent family — never
  `--good` / `--warn` / `--destructive` / `--info` or anything derived from
  them.** Those carry MEANING (green = resolved, amber = at risk, red =
  overdue), and a theme that restates a verdict in another hue would make every
  status chip in the app mean something different per user. In Console the
  accent happens to equal `--good`; in the others they differ, which the
  codebase already tolerates (the CN flag-stripe pin exists precisely because
  name-distinctness could not catch the `--accent`==`--good` alias).
  (2) **Every palette colour is a hue rotation at CONSTANT WCAG relative
  luminance.** The hexes were GENERATED by binary-searching OKLab L until each
  matched its Console counterpart exactly, so every contrast ratio the app was
  measured at is preserved BY CONSTRUCTION — `--muted-2` stays AA on every
  surface and `--ink` keeps its 18.1:1. Light `--paper-card` stays `#ffffff`
  because white is the only colour at luminance 1.0. **This is also why "a
  LIGHT green accent" is not on the table:** the accent is a button fill under
  white text, so raising its luminance would fail contrast outright — Sage gets
  its character from the paper tint and a DESATURATED accent (chroma 0.070 vs
  Console's 0.132) at the same luminance. The AA tripwire measures
  every block anyway; the construction is why it passes, not a substitute for
  measuring. **Specificity is load-bearing:** a bare `:root[data-palette="x"]`
  is (0,2,0) — the SAME as `:root[data-mode="dark"]` — so for a dark-mode user
  the winner would be decided by source order (the V-2/V-3 trap). Palette
  blocks are written `:root[data-palette="x"]:not([data-mode="dark"])` and
  `:root[data-palette="x"][data-mode="dark"]`, both (0,3,0), verified by
  MEASUREMENT in Chromium. **The picker swatch is a split disc** (paper on one
  half, accent on the other) because Sand differs from Console only in the
  paper — an accent-ring swatch made them indistinguishable at 14px, measured.
  Its colours come from `--pal-<key>-paper` / `--pal-<key>-accent`, declared in
  the token partial beside the blocks and PINNED equal to them (the first
  hand-typed swatch block had already drifted when it was written).
  **Emails do NOT follow a palette** — `CN_EMAIL_PALETTE` is hand-resolved hex
  with no user context, and a per-browser preference cannot reach a message
  that has already been sent. Adding a palette = one light block + one dark
  block in the token partial, one entry in `PALETTES` (script_core) and
  `PALETTE_KEYS` (index.html); the tripwires derive the rest.
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
  selectors in `styles.html`. Tool views are responsible for ensuring
  their layouts reflow at ~360px width. Per-class compact-mode tuning
  lives in the styles partial.
  **`.compact-header` is RETIRED (operator 2026-08-11).** Every tool used to
  render a slim in-view strip repeating the tool's own icon + name at the top
  of the pop-out — but the pop-out window's TITLE already says which tool it
  is, and the tab bar directly below already names the view, so the strip was
  ~44px of pure repetition at the top of the smallest window in the app. The
  operator's report was concrete: they had to scroll past it to shrink the
  window. The `cnCompactHeader_` helper, all twelve render sites (`cn`,
  `metrics` ×2, `kb`, `train` ×3, `intake`, `tc/manager`, `tc/timeoff`) and the
  CSS block are gone (INV-184 — a dead selector left behind is the next
  reader's false lead). One control was NOT dead and survives: the manager
  view's `#mgr-refresh` button, which now rides a bare right-aligned row.
  MEASURED at 480px compact: the Call Notes content bottom moved 772→728px and
  `cnPopoutFitToTemplate_` shrinks the launched window to match.
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
- **Team-member onboarding is an Admin flow (operator request 2026-08-07,
  pre-pilot).** Manage → Admin → Config → **Team Members** replaces the last
  manual onboarding step (hand-editing the payroll-adjacent Employees sheet).
  Three admin-gated endpoints (INV-136 tier): **`addEmployee(payload)`**
  (locked; validates INSIDE the lock against a fresh sheet read via the pure,
  Node-pinned `empValidateNewEmployee_` — unique email/ID/NAME (metrics +
  CDR matching are name-keyed), no `TEST_` IDs, tz shape, dept names against
  the configured list, `H:mm-H:mm`-only schedule (a bare `9-17` gets
  date-coerced), managerEmail ∈ MANAGER_EMAILS (fail-closed docs visibility),
  and a SECOND biweekly anchor rejected (INV-18) — then appends the 15-col
  row, invalidates the roster cache, audits `EmployeeAdd`, and optionally
  auto-provisions the Call Notes Sheet via `provisionCallNotesSheet` AFTER
  the lock releases (sequential re-acquire, never nested));
  **`offboardEmployee(repEmpId)`** (locked; clears ONLY the EMAIL cell — the
  INV-183 roster convention, name + history kept; self-offboard rejected;
  audits `EmployeeOffboard`); **`getOnboardingPanel()`** (read-only — per-rep
  readiness: enrolled / manager set+known / tz shape / CDR seen-in-7d with an
  alias suggestion from `cdrLikelyNameMismatches_` when the phone system
  spells the name differently; the CDR block is best-effort, INV-67 posture).
  PtoEnabled writes an EXPLICIT `TRUE`/`FALSE` (never blank). No cache-key
  bump (no `EMP` shape change, INV-28). **ONCE THE ROW IS APPENDED,
  `addEmployee` NEVER REPORTS FAILURE (operator report 2026-08-08 — INV-187
  applied to a WRITE).** Every step after `appendRow` used to sit under the
  one outer catch, so a throw in a FOLLOW-UP step returned a bare `{error}`
  while the roster row already existed; the admin saw "failed", retried, and
  hit `Employee ID already in use` for an ID nothing visibly owned. The
  reachable thrower is `provisionCallNotesSheet`, whose `waitLock` sits
  OUTSIDE its own try (a lock timeout throws rather than returning
  `{error}`) — it is now try//caught at the call site, the post-append
  bookkeeping is individually best-effort, and the outer catch returns
  `success:true` + a `provisionWarning` naming the follow-up failure when
  `appended` is set. The client mirrors it: the transport-failure toast says
  the employee MAY have been created, and a `_onboardSubmitting` flag blocks
  the double-click that queues two adds. **Conflict messages NAME the owning
  row** (`ctx.owners` → "used by Jane Doe (row 7)") and the ID message says
  IDs stay reserved after offboarding; the panel's offboarded line carries
  `{id, name}` so the reserved ID is visible somewhere in the UI. Pinned by
  the `empValidateNewEmployee_` behavioral + gate/lock/convention Node pins
  and the omnibus gate cases. **AN EMAIL-LESS ROW STILL RESERVES ITS ID, AND
  IS INVISIBLE IN EVERY IN-APP LIST (operator report 2026-08-08, second
  round).** `empRosterEmail_` excludes it (INV-183), so a HAND-STUBBED row
  (ID + name typed into the sheet, nothing else) blocked an add with an
  "already in use" error pointing at nothing the admin could see — the roster
  panel is not a substitute for column B. Two resolutions now: the conflict
  label SAYS the owning row has no login email and names both fixes (clear
  its ID, or fill in the email), and `getOnboardingPanel` splits email-less
  rows into **offboarded** (kept its roster data — `offboardEmployee` clears
  column A ONLY) vs **incomplete** (no timezone/pay cycle/balances → never
  onboarded), since the two resolve differently. NOTE the first diagnosis of
  this report was WRONG (a failed-add orphan was assumed); the shape of the
  row is what disproved it — no code path can write an ID with a blank
  column A, because `addEmployee` requires an email and always writes
  timezone + balances + PtoEnabled. **THE PANEL PAINTS FROM THE ROSTER ALONE
  (operator 2026-08-11 — "takes some time to load").** `getOnboardingPanel`
  used to compute CDR readiness inline, which meant the whole panel waited on
  a 7-day read of the CDR Report — the slowest call on the Admin tab and the
  only one touching a foreign spreadsheet — while everything else came off the
  5-min-cached roster. The CDR half is now `getOnboardingCdrReadiness` (same
  admin gate, same INV-67 best-effort posture): the client renders the roster
  panel, then patches each rep's `cdr` chip via `data-cdr-name` when the second
  read lands. **`cdr: {deferred:true}` on the panel is DISTINCT from
  `ok:false`** — deferred means "not read yet" (chip: "checking…"), ok:false
  means the read was attempted and failed (chip: "unknown", never "no calls" —
  INV-187). First render and the patch share ONE chip builder
  (`cnOnboardCdrChipHtml_`) so the two states cannot drift. **The readiness
  list is a COLUMN GRID** (`.cn-ob-grid`), not the prior wrapping chip row that
  put every rep's chips at a different x; the action column is
  `minmax(78px, auto)` because the caller's own row renders a "you" chip
  instead of an Offboard button and a bare `auto` track shifted that row's five
  readiness columns out of line. It stacks at ≤900px (the A2 rule).
- **Settings live behind ONE gear, in a flyout panel (operator 2026-08-13).**
  The three stacked sidebar rows (Theme / Palette / Alerts) consolidated into a
  gear button (sidebar + mobile header, both carrying `data-settings-toggle` —
  the INV-191 rule: writers key on the attribute that MEANS the thing) opening
  a fixed-position `.settings-panel` flyout. THE CONTROL MARKUP IS UNCHANGED
  (`data-theme-target` / `data-palette-target` / `data-remind`), so every
  reflector keeps working with zero edits. Three load-bearing details: the
  panel mounts at the SHELL ROOT, never inside the sidebar — the sidebar is
  `display:none` on mobile, where the header gear must still reach it; the
  panel's class sets `display:flex`, so it owes the
  `.settings-panel[hidden] { display: none; }` companion (the [hidden] gotcha
  — without it the panel ships permanently open); and its Esc handler is
  CAPTURE-phase with `stopPropagation`, so closing the flyout never also
  closes an overlay beneath it. Positioning is measured from whichever gear
  opened it (beside the sidebar gear, below the header gear, viewport-
  clamped). The old multi-row adjacency CSS (`.sb-theme + .sb-pal` etc.) is
  GONE with the rows it served (INV-184) — one settings row remains and
  `margin-top: auto` pins it to the sidebar bottom. MEASURED: the gear label
  needed 8px (not 10px) side padding to escape the "Setti…" ellipsis at the
  168px default sidebar — the INV-170 class.
- **View-as is an ADMIN-ONLY, SESSION-ONLY, CLIENT-ONLY preview (operator
  2026-08-13).** A "View as" row in the settings flyout (Me / Manager /
  Spanish CSR / CSR) overrides the three role flags on `empState`
  (`viewAsFlags_`, pure + Node-pinned), re-renders the shell, and lands on the
  Dashboard — so an admin can see which tabs and controls each role gets
  before distributing the app. THE BOUNDARIES ARE THE DECISION: admin-only
  (`viewAsSet_` refuses unless the REAL captured flags say admin — and
  bypassing it from a console grants nothing, because every manager/admin
  endpoint still gates on the server-side identity); session-only (nothing is
  persisted — a refresh restores reality by construction); and UI-only (the
  server answers with the admin's REAL access, so surfaces whose CONTENT
  branches server-side still show the admin's data — it is a preview of
  CHROME, not an impersonation, and the banner says so). While active, a
  fixed-blue `.viewas-banner` (INV-166 — a banner that must be unmistakable
  takes fixed colors) names the role and carries the exit; the View-as row
  itself keys off the REAL role so the way back always renders. `empState` is
  REPLACED by background refreshes (the reminder ticker + three Clock paths),
  so every one of those sites calls `viewAsReapply_()` — without it the
  preview silently snapped back mid-session. Pinned by the view-as pins.
- **The slow tabs paint last-good INSTANTLY and refresh behind the pill
  (operator 2026-08-13 — "My Stats / Team Metrics / Spanish Inbox take a
  while").** Three parts. (a) The My Stats + Team Metrics loaders now paint
  from ANY same-key cached payload, not only a `viewCacheFresh_` one — the
  45s-TTL-gated paint re-showed the loader on almost every re-enter, which
  read as "slow" even when the data was seconds old; the key is the exact
  query (day/range), so an old payload is never the WRONG data, and the
  refetch always runs behind the "Refreshing…" pill. (b) The Spanish tab
  (THREE Gmail-scanning RPCs) seeds all three parts from its last complete
  round (keyed by the days window): the stats refresh swaps ONLY
  `#spanish-head`, and the list refresh paints the seeded lists first and
  keeps last-good on a failed half — so the painted content is never
  disturbed mid-read. (c) `getTeamMetrics` — the one UNCACHED heavy manager
  endpoint — gained the sibling endpoint result cache (`team_metrics_v1:
  <from>:<to>`, org-wide since every manager sees the same aggregate,
  `CDR_CACHE_TTL`, `_TEST_OVERRIDE_CDR_SS_ID` bypass), with the put gated on
  a CLEAN round (`!noteCountPartial && !transferMeta.error` — INV-129: a
  degraded aggregate is never pinned for the TTL; a deployment with no
  Transfer tab simply stays uncached). First-load-of-the-day on the Spanish
  tab is still Gmail-bound — that read is deliberately live (INV-31).
- **Pre-pilot observability round (operator 2026-08-13 — "I want to know what
  is working, if any issues arise, and what parts of the web app are
  priorities").** Three parts, each riding an EXISTING posture rather than a
  new subsystem. (a) **Handled failures are now visible to the operator, not
  only to the rep:** `errorStateHtml_` — the single render path every
  A12/INV-175 failure site routes through — fires the INV-150 client-error
  beacon with source `errorState` before returning its markup, so "an RPC
  returned `{error}` and the rep saw a warn card" lands in the ClientErrors
  tab alongside uncaught exceptions. The beacon's session cap/dedupe/rate
  caps all still apply; the fire is try/catch'd so a beacon problem can never
  break the error card itself. (b) **Immediate notification is THRESHOLDED,
  not always-on:** `clientErrSpikeAlert_` (post-lock in `recordClientError` —
  M-7) emails managers ONE branded danger alert when ≥5 errors land within a
  rolling hour, 6h cooldown; `automationProblems_` entry (g) (≥10 errors in
  24h, off `clientErrorsSummary_`'s additive `last24h`) rides the shell
  health dot + daily failure digest. See the INV-150 amendment for the
  full contract — the original "a single benign quirk must not nag" rationale
  is preserved by the thresholds. (c) **Feature-usage telemetry answers "what
  parts are priorities":** `recordViewEnter(viewKey, mode)` (rep-callable,
  `getEmployeeInfo_`-gated, USER lock, appendRow into an auto-provisioned
  `ViewUsage` tab on the ADP sheet — the `kbRecordView`/ClientErrors posture:
  PHI-free rows of Timestamp/EmployeeId/View/Mode only, fire-and-forget,
  rate-capped `VIEW_USAGE_RATE_MAX_PER_HOUR`=120/rep). The client fires it
  from `showView` behind a 5-min per-view throttle (`recordViewUsage_`), and
  **View-as previews are excluded** (`VIEW_AS.active` skips the send — an
  admin browsing as a persona is not usage data). `getViewUsageStats()`
  (**admin-gated**, INV-136 — the 42nd admin endpoint) tail-scans
  `VIEW_USAGE_SCAN_MAX`=8000 rows and aggregates via the pure, Node-pinned
  `viewUsageAggregate_(events, cut7, cut30)` → per-view 7d/30d counts +
  distinct reps + per-rep totals with top view; rendered as a **Feature
  usage** panel on Admin → Overview (`cnUsagePanelHtml_` — bar rows resolved
  to TOOLS-registry labels via `cnUsageViewLabel_` with a raw-key fallback,
  every string `esc()`'d, `truncated` surfaced, Open↗ deep-link to the tab,
  stacking at ≤700px per A2). Pinned by the five observability-round Node
  tests (all bite-checked) + the `getViewUsageStats` omnibus gate case.
- **Reminders are a SHELL capability, not a Clock-view one (operator
  2026-08-11).** Break reminders used to fire only while the Clock tab was
  open — so the pinned Call Notes pop-out, the window a rep actually spends the
  shift in, never showed one. `remindersTick_` (`script_core.html`, 60s, started
  at boot) now owns them. THREE channels, each independently degradable so a
  blocked one never suppresses the others: the **toast** (always), a **chime**
  (`notifyChime_` — a Web Audio oscillator, synthesized because a fetched sound
  would be blocked by the iframe CSP, and whose context only unlocks after a
  real user gesture), and a **desktop notification** (best-effort — the app runs
  inside HtmlService's cross-origin iframe, where Permissions Policy blocks
  `notifications` in most browsers, so a refusal is EXPECTED and the toggle says
  which of the three still work rather than failing silently). Preferences live
  in `umsNotify`; the sidebar + mobile-header toggles are attribute-keyed
  (`data-remind`) because BOTH surfaces render a copy and two elements cannot
  share an id. Two reminders ship: the upcoming break (pure client-side
  arithmetic off `empState.schedule` — zero RPCs) and a **still-clocked-in**
  nudge after the shift ends, which needs punch state and therefore refreshes
  `getEmployeeState` at most once per 10 minutes, ONLY inside the
  end-of-shift+5..+120min window. An UNKNOWN punch state never nags (a false
  clock-out reminder to a rep who already clocked out is worse than a missed
  one; the daily missed-punch EMAIL remains the real backstop). Apps Script web
  apps have no background push, so a closed browser still gets nothing —
  the reminder is for a rep with the app open, which is the case the operator
  asked about.
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
  authoritative "Sixteen client-side localStorage keys total" entry in
  Common Gotchas for the full key list (`umsTimeClockMode`, `umsTheme`,
  `umsCallNotesActiveFormDraft`,
  `umsCallNotesFormStartedAt`, `umsSidebarW`,
  `umsKbPanel`, `umsLastView`, `umsTour`, `umsPopoutGeom`,
  `umsIntakeDrafts`, `umsCoachingMode`, `umsWhatsNew`,
  `umsNotify`) — all per-browser, all try/catch-wrapped.
  (An earlier version of this decision listed only four; Round 2 · 8a/8b added
  the sidebar-width and Time/PTO-mode keys, the KB drawer added its single
  `umsKbPanel` prefs blob, the refresh-restore behavior added `umsLastView`,
  #4 added `umsPopoutGeom`, the redesign added `umsIntakeDrafts` (Intake
  form drafts) + a `deptCollapsed` field inside `umsKbPanel`, the
  Clock-card background image added `umsClockBg`, the merged Coaching tab
  added `umsCoachingMode`, and the What's-new panel added `umsWhatsNew`.
  The dashboard-feedback batch REMOVED `umsDashboardCompact` — net 14 — the
  reminder-alert toggles added `umsNotify` — net 15 — and the operator retired
  the clock-card background image (2026-08-12), taking `umsClockBg` back out —
  net 14 — the colour palettes added `umsTheme`, net 15 — the operator
  removed the composer's `umsCallNotesLastDept` default (2026-08-13), net 14 —
  and the 2026-08-13 settings/speed round added `umsTzWarnedDay` +
  `umsDashMetrics`, net 16 — and the 2026-08-17 cross-window reminder dedupe
  added `umsRemindFired`, net 17 — and the 2026-08-18 Time/PTO consolidation
  RETIRED `umsMergeMode`, net 16.)
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
- **Pay statement — own-data payroll self-check (operator 2026-08-17).**
  Time / PTO (side-rail pay-period block since the 2026-08-18 consolidation)
  → **"View pay statement"** opens a per-period
  modal: every day's punches (missing weekdays SHOWN — a silently absent day
  is the discrepancy the view exists to catch), computed hours with
  INV-176 incomplete-day flags (never silently zeroed), approved PTO with
  `getLeaveDeduction_` days, period totals, and — when roster column P
  carries an hourly rate — an **estimated gross** (worked hours × rate),
  explicitly labeled an estimate ("excludes PTO pay, overtime rules, and
  payroll adjustments — not a payslip"); no rate on file → hours-only,
  stated. `getMyPayStatement(offset, repEmpId?)` is caller-scoped; the
  repEmpId branch (a manager/admin viewing any rep — the operator's
  own-data rule) is manager-gated (omnibus-pinned; note the gate case
  targets the PH id because the omnibus runs AS the India rep — a self-view
  legitimately succeeds). Periods resolve via the pure `payPeriodRange_`
  (biweekly = the org-anchor boundary the ADP export uses per INV-18,
  shifted 14 days per period; monthly = calendar arithmetic; offset clamped
  0..6) and the day data reuses `buildTimesheetForEmployee_` wholesale. The
  statement reads the LIVE Timesheet tab only, so with INV-153 archiving
  enabled an old period past the window carries `archiveNote` and the modal
  says rows may be missing (INV-187) — ask a manager for an export, which
  DOES read through the archive. **Click-through (operator 2026-08-18):**
  an incomplete or empty (weekday, no punches, no PTO) day row carries a
  "Request edit" button into the #4a adjust flow, prefilled to that date —
  gated to the employee adjust window (older days name the manager path)
  and suppressed entirely on a manager's view of ANOTHER rep's statement
  (the adjust modal submits for the CALLER); the statement modal closes
  BEFORE Adjust opens (the ensureOverlay node sits later in DOM order at
  the same z-index and would paint over it). `openAdjustModal(prefillDate)`
  honors the prefill only inside its own [min, today] picker bounds.
  The rate never leaves its one reader —
  see the column-P checklist entry. Manager-facing statement UI is a
  follow-on (the server branch already supports it).
- **Time / PTO merge (Round 2 · 8b) → ONE page (operator 2026-08-18).**
  The Phase-2 "Combined Clock + Timesheet" combined view was deliberately
  dismantled here. The Clock tab is now standalone (hero + actions +
  ribbon + cov + 3-cell ledger + today's punches + teammate); the
  timesheet section moved into the renamed **Time / PTO** tab — first as
  a Time Off ↔ Timesheet MODE TOGGLE, then **consolidated to one page**
  when the operator observed the two modes were nearly identical (the
  app-bar, month nav, calendar, legend, and request list were all
  shared; only the 240px side rail swapped). The toggle + its
  `umsMergeMode` localStorage key are RETIRED (`.mp-modes`/`.mp-mode`
  CSS deleted with the markup, INV-184; a stale stored value is
  ignored). The rail now stacks, top to bottom: the **quick-actions
  card** (`toActionsCardHtml_` — the operator-asked clear affordance:
  a date picker floored at today + "Request" opening the SAME pinned
  day modal a calendar tap opens via `openRequestForDate_` — same
  month directly, another month via the `TO_PENDING_DAY_OPEN` handoff
  through `calNavTo_`, consumed at the end of `renderTimeOffView`
  gated to the rendered month; **since the same day's range round the
  card carries an optional SECOND date and the handoff is
  `{date, through}`** — the through pre-fills the day modal's new
  "Through (optional)" field AFTER its per-open reset; plus
  "Request punch edit" → `openAdjustModal()`), the annual-leave
  `.pto-tile` (**two variants: roster column Q `PtoAccrual` > 0 flips it
  to the ACCRUING framing — the credited balance, the rate in its real
  terms (`ACCRUING 3.08H / 80H`), a server-computed month-to-date earned
  line, AND — since cycle-18 F7 — the planned/projected footer BENEATH it
  rather than instead of it (the MTD line used to REPLACE that footer, so
  an accruing rep lost the one number they want before requesting time
  off, and browsing to a past month brought it back, making one slot mean
  two different things; the labels were also shortened because both spans
  wrapped to two lines in the 240px DESKTOP rail — measured 22px vs 11px,
  a wrap the matrix cannot see because a wrap is not an overflow); blank Q
  = the fixed-allotment /15-days tile, byte-identical** — see the column-Q checklist entry; the SYSTEM credits
  the rate monthly in arrears from HOURS WORKED — see INV-194. The
  accrual variant carries NO year-end projection and NO fill bar: an
  accruing balance has no ceiling and no knowable future work pattern,
  so both would be invented numbers, INV-187), and the
  pay-period block (`#ts-side-rail` — pay-period tile + "View pay
  statement" + recent activity, lazy-loaded via
  `loadTimesheetSideRail_` on EVERY render now, its own
  `getTimesheetData` call — the legacy `loadTimesheet` render cluster
  was deleted in Cycle 2 · L11, see INV-74). TOOLS
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
- **Auto-tag rules (operator 2026-08-13).** Admin-curated keyword→tag rules
  (`CN_AUTO_TAG_RULES` Script Property, CONFIG seed `AUTO_TAG_RULES` — the
  seeded list derives from the update-type vocabulary and AWAITS OPERATOR
  REVIEW) matched case-insensitively as substrings against the Issue +
  Resolution text as the rep types (the existing 500ms suggestion debounce).
  A match ADDS its tag as a normal removable chip; REMOVING an auto-added tag
  dismisses that rule for the rest of the form session (`CN_STATE
  .autoTagApplied`/`autoTagDismissed`, reset on clear/submit — re-adding on
  the next keystroke would fight the rep for the chip). Distinct from the
  heuristic SUGGESTIONS, which stay one-click offers from the rep's own
  vocabulary. Everything runs client-side — note text never leaves the
  browser (the INV-119 posture that keeps the AI version unbuilt).
  `getAutoTagRules_` sanitize-on-read mirrors `saveAutoTagRules`'s validation
  (admin-gated, INV-136 — the count is now 42) so a rejected save and a
  sanitized read can never disagree; rules ride `getCallNotesDepartments`
  (reps) + `getAdminConfig` (the editor). Pinned by the auto-tag Node pins.
- **Intake recommendation feedback (operator 2026-08-13).** Every intake email
  (PPD/PMD/PAP) carries a "Send feedback on this recommendation" button — an
  email client can't host a live comment box (most strip forms), so the button
  links to a tiny signed-in page served by `doGet` (`?intakefb=<submissionId>
  &ft=<type>`, the `?resolve=` pattern with a textarea). The recipient is an
  internal agent (roster-resolved), so `submitIntakeFeedback` re-authenticates
  via `getEmployeeInfo_` — the page only collects text. The id is minted
  BEFORE the send; the CTA joins the FINAL body only, after the INV-41 hash
  check (the `drResolveCtaHtml_` placement), and an unresolvable exec URL
  drops the button rather than shipping a dead one. Rows are append-only in
  the Intake spreadsheet's `IntakeFeedback` tab (feedback may reference the
  patient — it stays in the PHI store; the `IntakeFeedback` audit row carries
  id + type only), written only when the submission EXISTS (a forged id can't
  seed junk rows), text bounded 4000 chars. Surfaced newest-first as a
  "Recipient feedback" block in the Intake Sent detail (all three forms; an
  empty list renders NOTHING — an empty section would read as "no complaints
  yet", which the data cannot support). Pinned by the feedback-loop Node pins.
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
  **RESTYLED (operator 2026-08-11 — "more in line with the rest of the web app
  and emails").** The wrapper had drifted from the Call Notes / Intake / form
  emails in four ways, each fixed: (a) it led with a TEXT wordmark while every
  other email leads with the **UMS mark over a navy rule** — it now uses the
  same treatment, and the mark stays ON THE CARD rather than in a navy band
  because `logoUrl` is a **JPEG with no transparency**, which a navy band would
  frame as a white rectangle (pinned); the `alt` is the styled fallback
  wordmark, since most clients block remote images by default. (b) The heading
  was an 11px mono chip — the least prominent thing in a message whose whole
  job is that one line; it is now a 22px heading with a short tone-coloured
  rule under it (the old semantic cue was a 9px dot). (c) `brandedKvRows_`
  rendered two columns of plain text; it now renders the **navy-tinted detail
  table** the department emails use, so the two stopped looking like different
  products. (d) The generic `Notification` eyebrow became `opts.subLabel` — the
  MODULE name ('Time Clock', 'Payroll', 'Employee Docs', …) — defaulting to
  EMPTY, because repeating the wordmark beside the wordmark is worse than
  blank. Two new options: `opts.statusLabel` overrides the tone's status pill
  word, and the long-supported-but-unused `ctaUrl`/`ctaLabel` are now WIRED —
  most consequentially on the missed-clock-out email, which asked a rep to go
  fix their timesheet and gave them no link at all. CTA destinations go through
  **`safeWebAppUrl_(tabKey)`**, which returns `''` when the web-app URL cannot
  be resolved: the wrapper renders the button only when BOTH url and label are
  present, so a resolution failure drops the button instead of shipping a dead
  one. A Node pin asserts every `safeWebAppUrl_` argument is a REGISTERED TOOLS
  tab key — a stale key still renders a button, it just lands on the wrong
  view, which is the silent failure this class invites.
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
- **Intake emails share the app's email chrome (operator 2026-08-11).** The
  PPD / PMD / PAP emails were the last builders still carrying their
  pre-web-app look — an 18px title line beside the logo and solid-navy section
  bars with centred white text — so they read as a different product from the
  Call Notes and branded-notification mail beside them in the same inbox.
  `intakeEmailShell_(title, innerHtml, subLabel)` now mirrors
  `buildBrandedEmailHtml_`'s chrome exactly: the UMS mark **on the card** over
  a 2px navy rule (never on a coloured fill — `logoUrl` is a transparency-free
  JPEG), a right-aligned mono module label (`Intake · PPD` / `· PMD` / `· PAP`,
  the wrapper's `subLabel` idea — repeating the wordmark beside the wordmark is
  worse than naming the module), the subject as a **22px heading** with the
  short brand rule under it, and the mono-uppercase `UMS Team Tools · Intake`
  footer. Inside the body, the shared `intakeSectionRowHtml_(label)` replaces
  both bodies' hand-rolled bars with the app's **kicker vocabulary** —
  mono-uppercase brand text on `navyTint` under a navy rule, left-aligned, not
  centred — and the Q/A rows moved from a bordered grid with strong blue zebra
  to **hairline separators + a quiet `paperCard`/`paper` zebra**, matching the
  in-app ledger tables. The recommendation cards, conditional answer tones and
  the raw-`justification` exception (INV-89) are untouched. Two things this
  restyle must not lose, both pinned: every patient field stays `esc_`'d, and
  the layout stays table-only (**no `display:flex` / `gap` / `filter`** — see
  the CN_EMAIL_PALETTE gotcha). **Deploy-window note:** the PPD body feeds
  `intakeBodyHash_`, so a preview taken before the deploy and sent after it is
  rejected with "The form changed since you previewed it" (INV-111). That is
  the guard working; re-previewing clears it, and the window is one page load
  wide.
- **Department emails and state tax rates are editable via the Admin
  tab.** Call Notes → Admin (manager-only) reads the current config
  from `getDepartmentEmails_()` / `getStateTaxRates_()` and writes
  changes to Script Properties (`CN_DEPARTMENT_EMAILS`,
  `CN_STATE_TAX_RATES`) via `saveDepartmentEmails` /
  `saveStateTaxRates`. Both save endpoints are manager-gated and
  write an `AdminConfigChange` audit row. Changes take effect
  immediately — no redeploy needed. CONFIG values in `Code.js` serve
  as the fallback when no Script Property is set. Since cycle 9 (L-12)
  `getStateTaxRates_` and `getUpdateSuggestions_` SANITIZE on read
  (whitelist-rebuilt — string→finite-rate 0–1 entries / deptName→
  array-of-strings), matching `getEmailTemplates_`/`getExternalLinks_`; a
  hand-edited property holding a scalar/array degrades to the CONFIG
  fallback instead of being returned as-is (an out-of-range rate is
  dropped — that state has no tax rate until re-saved). Cycle-17 batch ⑤
  closed the one getter that sweep skipped: `getDepartmentEmails_` now
  whitelist-rebuilds on read too (string dept names → plausible email-string
  values, entry-wise; an EMPTY rebuilt map falls back whole to CONFIG — so a
  malformed hand-edited entry silently drops from the composer list until
  re-saved via the Admin editor), and `saveDepartmentEmails` REJECTS
  comma/semicolon department names + bounds them 1–60 chars — a
  "Billing, West" name round-tripped as TWO phantom departments through
  every `drSplitDepts_` consumer (the INV-131 dedup, the Incoming inbox,
  per-dept SLA and `deptStats`).
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
  adjustment path so hiding the button can't be bypassed; `managerDailyBrief`
  (`server`, default off — the registry's FIRST pure-server-scope flag,
  INV-151) gates the consolidated manager morning brief + the four
  digest-suppression branches (email routing only — no client UI reads it,
  so it never rides `getClientFeatureFlags_`/`cnFlagsVersion_`). `getFeatureFlags` /
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
  returns `{ count, partial }` — `partial: true` when a rep's Sheet could
  not be read, making the count a LOWER BOUND (cycle-17 batch ②, INV-187;
  the client renders `≥ N … · some rep Sheets unreadable`, including at
  N=0 where it previously rendered nothing). The Team Notes view renders
  the count as a badge on page load. A CLEAN result is cached 2 min
  (`CN_UNRESOLVED_CACHE_KEY`, TTL-only freshness like the ambient
  cache, INV-43 — badge-appropriate) so the landing doesn't re-scan
  every rep's Sheet on each open; a PARTIAL round is never cached
  (INV-129 — the old shape cached the undercount for the full TTL).
- **Client-side undo window handles midnight wrap.**
  `timeDiffSecondsClient` computes `86400 + diff` when the raw diff
  is negative (punch at 23:58, now at 00:02), capping at
  `SELF_UNDO_WINDOW_SECONDS` so yesterday's punches don't falsely
  appear eligible; eligibility requires a NON-NEGATIVE diff (cycle-8:
  the -1 "malformed/beyond-window" sentinel satisfied `<= 300`, so a
  stale post-midnight list rendered undo buttons on everything). The
  server re-validates independently — and since cycle 8 it actually
  ACCEPTS the wrap (INV-23's today-or-yesterday elapsed-ms window),
  so the button works instead of dead-ending in a server error.
- **Bulk approve/deny fires parallel RPCs.** The manager Pending
  Time Off section has checkboxes + a bulk bar when 2+ requests are
  pending. Bulk approve/deny calls `updateTimeOffStatus` once per
  checked request in parallel. Each call acquires its own
  `ScriptLock` independently, so the operations serialize safely.
  A single toast summarizes successes vs. failures; the dashboard
  refreshes once all RPCs complete.
- **Dashboard analytics are computed from existing data.**
  `getManagerDashboard` derives `punchTrend` (daily punch counts for
  today + the 7 prior days = 8 bars, roster-filtered since cycle-10 C11 —
  off-roster/TEST_-remnant ids no longer inflate it) and `toSummary`
  (approved/pending/denied time-off
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
  `CN_STATE.historyEndDate`. **History honors `CN_STATE.filter`
  (cycle-8 M-10)** — the Log quick-chips' "jump to History filtered"
  now works: `cnRenderHistoryStack_` filters via `cnNoteMatchesFilter_`
  and renders a clearable `.cn-hist-filterpill` so the active filter is
  never invisible state. Range loads carry a current-selection guard
  (cycle-8 M-8): a response for a range the rep has since moved off is
  dropped, so a slow "Last 30" can't overwrite a fast "Yesterday".
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
  cache (INV-43). Since the 2026-08-13 speed round `getTeamMetrics` is ALSO
  endpoint-result-cached (`team_metrics_v1:<from>:<to>`, org-wide,
  `CDR_CACHE_TTL`; put gated on a clean round — see the slow-tabs KDD).
  Open-ended substring search (`managerSearchCallNotes`
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
  and pending PTO queue. **Wrap contract (V-10, cycle-11 visual batch):**
  `.seg` is `white-space: nowrap` and the chip is `flex-wrap: wrap` — a
  time like "8:05 AM" must never break internally; on a narrow card the
  chip wraps BETWEEN segments (local time stacked over manager time).
  Offshore reps' two-segment chips wrapped mid-time on the 4-up
  live-status grid until this was fixed.
- **Time Clock → Dashboard (the Clock tab is a two-column Dashboard).** The
  `clock` tab (key + `enterClockCombinedView` handler UNCHANGED — only the visible
  LABEL is now 'Dashboard', so `?tool=clock`/`currentView==='clock'`/`umsLastView`/
  pop-out all keep working) renders a `.dash-grid`. **The whole TOOL's sidebar
  label was also renamed 'Time Clock' → 'Dashboard'** (the `timeClock` TOOLS-registry
  KEY + `?tool=timeClock` are unchanged — only the `label` string), so the sidebar
  now reads 'Dashboard' with the first sub-tab also 'Dashboard'. (`360px minmax(0,1fr)` — the
  `minmax(0,1fr)` is LOAD-BEARING for the carousel viewports; the SHELL-level
  twin is `.app-shell > * { min-width: 0 }` in `styles.html` — V-1, cycle-11
  visual batch: without it any wide intrinsic content (the CN form's rail)
  propagated min-content width and forced the whole 480px compact pop-out to
  scroll sideways). The greeting is a
  **full-width header bar** (`.dash-greet-bar`, a subtle panel) ABOVE the grid —
  with an "On the clock"/"On lunch" pill — not trapped in the right column (the
  earlier right-column placement left the page unbalanced). The whole dashboard
  view widens to `max-width:1480px` (via `.view-area:has(#dash-grid)`) since it's
  an app surface, not prose. **Left rail:** the existing `#clk-hero` — now just the
  sky clock with the white `.hero` card frame STRIPPED on the dashboard
  (`.dash-hero` zeroes bg/border/padding/shadow) so the gradient IS the card, not
  a clock boxed inside a white card; `#clk-hero` is KEPT so all clock machinery
  works — + shift-strip. **Today's Punches + teammate moved OFF
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
  **Your numbers** (own) + **Team**/**Department** (whole-roster team aggregate;
  the N=3 cohort HIDE was DROPPED for this card by operator decision 2026-08-06
  — `getDashboardMetrics` uses `MIN_COHORT = 1` and `team: null` now only means
  "nobody reported at all"; INV-124's per-day My Stats series guard is
  UNCHANGED) — over **Yesterday / MTD / YTD**, fed by
  `getDashboardMetrics(periodKey)` (all three fetched up front, server-cached;
  cache key `dash_metrics_v4` — it bumps with every payload-semantics change; since 2026-08-18 the key carries the rep-local DAY and the TTL is 21600s — the CacheService max, operator-approved: the CDR data does not change again once the daily import lands, and the day in the key rolls the cache at the rep-local midnight; a load BEFORE the import can pin the pre-import aggregate for up to 6h, while the Metrics tabs keep their 5-min caches).
  **BOTH cards open on MTD** (operator 2026-08-12; `CLK_DASH_DEFAULT_IDX`,
  DERIVED from the period list so a reorder can't repoint it). Asked for on the
  Department card and applied to both, because they sit side by side with
  independent chips and two adjacent cards opening on different periods reads
  as a bug rather than a default. **KPI banding + month-over-month deltas
  (same round):** `dashPctTone_(value, target, lowerIsBetter)` tri-tones ONLY
  the two rate metrics — % Answered against the shipped `CDR_ALERT_THRESHOLD`
  (higher better) and Transfer % against `CONFIG.CDR_TRANSFER_TARGET_PCT`
  (LOWER better) — at/better than target = good, within `DASH_TONE_SLACK_PP`
  (5 points) = warn, beyond = crit. **Both thresholds RIDE THE PAYLOAD and are
  never mirrored client-side**, and a null target renders NO tone at all: a
  colour is a verdict, and Transfer % had no threshold anywhere in the app
  before this, so the operator can null the CONFIG key to switch its banding
  off rather than ship a verdict nobody chose. The MTD slide also carries a
  per-KPI delta against `prev` — the prior month's **same elapsed days**
  (`dashboardPrevRange_`, pure + Node-pinned), NOT the whole prior month:
  comparing 12 days of volume against 31 is an artifact that would read as a
  collapse every month and "recover" on the 31st. The day CLAMPS DOWN into a
  shorter month (Mar 31 → Feb 28/29), so the comparison can only under-report.
  **Volumes carry the arrow but no colour** — call load is not the rep's to be
  judged on, and % Answered already carries that dimension's verdict. The card
  foot NAMES the window ("vs Jul 1–23"), and a failed comparison read says
  "comparison unavailable" rather than silently dropping the arrows (INV-187);
  that round is also never cached (INV-129). MEASURED detail: `.dash-kpis` is
  `align-items: flex-end`, so on a card where some metrics have a comparison
  and some don't the delta-less KPI's label sat 14px low — the delta line is
  RESERVED (empty, aria-hidden) whenever the card has any comparison. **Annual PTO relocated** off the dashboard
  (already the `.pto-tile` on Time/PTO). Compact: the `?compact=1` pop-out
  collapses to the rail (`:root[data-compact] .dash-grid`); mobile
  (`max-width:860px`) stacks. (The earlier in-page `umsDashboardCompact` toggle
  was removed in the dashboard-feedback batch — its button sat inside the column
  it hid, so collapsing was a one-way trip; the pop-out already covers compact.)
  Every server string
  `esc()`'d; the team card's cohort guard is dropped per the operator decision
  above (the My Stats anonymized series keeps INV-124's). **Follow-ons
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
  clock + tz + date on the right), the
  `.shift-strip` (head + day ribbon + breaks + the `.actions` row —
  one `.prime` CTA ClockIn → LunchIn → ClockOut by state, Adjust last
  as a `.sec`; **after the rep has already taken a lunch today** (a LunchIn
  exists + currently working), `renderActions(actions, {afterLunch})` makes
  **ClockOut** the prime CTA instead of a second LunchOut — most CSRs take one
  lunch, so the big gold "Lunch Out" again risked accidental clicks; LunchOut
  stays as a `.sec`. The **break chips** are terse `B1 / Lunch / B2` with compact
  `clkFmtMinShort_` times on one wrapping row, the Lunch chip shaded darker
  (`.clk-brk-chip.lunch`)). **The 3-cell `.ledger.ledger-3` strip
  (Annual / Sick / Hours today) is RETIRED** — the Dashboard redesign moved
  hours into the shift-strip header and balances onto the Time/PTO tile, and
  no render emits `.ledger` markup anymore (cycle-17 C17-1 removed its dead
  COMPACT overrides when the fixed A2 scan surfaced them; batch ⑥ then deleted
  the BASES — ~240 lines across the `.hero-clock*` / `.actions-grid`/
  `.action-btn`/`.btn-*` / `.ledger` / `.lb-*` / `.ts-summary`/`.ts-stat*` /
  `.day-card` clusters, plus four compact halves the grid-only A2 scan
  couldn't see; a batch-⑥ pin bans every dead selector's return — INV-184
  closed for this class). **Note coverage is
  now INLINE in the
  shift-strip header (#3):** the per-hour note-volume bars behind the
  day ribbon (`ribbon-hist`, from `getMyNoteHourBuckets`) are the
  visual histogram, and the header shows a compact `% logged` +
  a "File N missing" link (`#clk-shift-cov`, `loadCoverageStrip_` →
  `renderCoverageStrip_`, fed by `getMyMetrics`; `fileMissingCalls_`
  CTA preserved). The old separate `.cov` donut/trend strip + its CSS
  were removed. Pay-period info moved to the Time /
  PTO tab's Timesheet-mode side rail in Round 2 · 8b — the Clock
  view no longer loads timesheet data. Today's Punches and teammate
  status render below the shift strip as the existing cards. A world-clock
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
  the `RIBBON_DEFAULT_*` constants if absent. Per-rep overrides exist since Turn D (cycle 7):
  Employees column O `H:mm-H:mm` wins over the per-tz entry
  (`empShiftSchedule_`); add a `BY_TIMEZONE` entry for a whole-tz exception. The now-cursor is refreshed every 60s by
  `startRibbonNowCursor_` / `stopRibbonNowCursor_`, which are
  bound to the existing `startClock` / `stopClock` lifecycle so
  the interval cleans up on tab nav-away. **Punch labels are two-row
  staggered (V-2, cycle-11 visual batch):** a greedy left-to-right pass
  assigns each mono label row 0 or row 1 (`.lbl.r2`) by estimated width —
  without it every LunchOut→LunchIn pair overlapped into garble; a label
  fitting neither row (a 3+ punch cluster within ~3.5 ribbon-hours) renders
  bar-only (`.lbl.collided`, hidden — Today's Punches carries the times).
  The `.ribbon` is 74px tall for the second row; compact mode fully
  re-specifies its 24px label-less geometry and is unaffected.
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
  **Operator improvements #1–#10 (2026-08-06) extended both pages:** all
  three metrics endpoints ship `alertThreshold` (=`CDR_ALERT_THRESHOLD`) and
  the client draws a dashed TARGET line on both hero sparklines
  (`mBuildHeroSparkSvg_`'s optional 4th arg — the y-domain EXTENDS to
  include the target so an above-all-data target renders instead of
  vanishing off-canvas), appends "· target N%" to the delta, and
  `mPctClass_(p, thr)` starts the table's GREEN band at the shipped
  threshold (absent field — a ≤5-min stale cached payload or the CN Stats
  caller, whose endpoint doesn't ship it — keeps the legacy 80 band; NO
  client mirror of 85 exists). Both rails gained a **Transfers** row
  (null-guarded — absence ≠ 0, INV-180; Team additionally gated on
  `transferMeta.available`, INV-175). Both tabs share ONE control
  vocabulary: pressed-state preset chips + a **Custom…** disclosure chip
  hiding the raw date inputs (`mCustomChip_`/`mToggleCustom_`; state in
  `M_STATE.customOpen`; NOTE `.m-custom-row[hidden]{display:none}` is
  load-bearing — see the [hidden] gotcha). My Stats range mode (#1) renders
  the you-vs-team trend section from the cached / background-fetched TODAY
  payload (seq-guarded, INV-156) instead of silently dropping it, plus
  best/worst-day chips (#7, pure `mBestWorstDays_`, Node-pinned) and a
  coverage-hint CTA (#6, `mCoverageCta_` → `fileMissingCalls_`/CLK_NAV_HINT,
  gated to single-day today). Team adds rep drill-through (#9 —
  `.m-rep-link` buttons riding data-* into `cnAuditDrillToNote_`), a
  scope-aware **Copy table** TSV (#10, pure `mTeamTableTsv_` — plain values,
  an unreadable notes Sheet exports blank, never 0), and the two
  permanently-non-empty CDR reference lists folded behind a
  "Match diagnostics (N)" disclosure (#3 — the INV-186 signal,
  `likelyMismatches`, stays always-visible; state in `M_STATE.diagOpen`
  survives sort re-renders). Pinned by the `metrics — operator improvements
  #1–#10` Node block (8 mutations bite-checked). **`.m-layout` is
  `align-items: start`** (V-8, cycle-11 visual batch — the `.dash-trk`
  natural-heights precedent): the hero card hugs its content instead of
  stretching to the 5-row rail's height with a dead band above the
  bottom-anchored sparkline (spark height 84px over a 60-unit viewBox —
  the `preserveAspectRatio:none` stretch is fine at 1.4x, but do NOT add
  `vector-effect: non-scaling-stroke` to the polyline: it moves the §4
  draw-in `stroke-dasharray` to screen space, where `--len:600`
  under-runs the stretched path and the "drawn" end state shows a gap).
- **Per-queue attribution exists ONLY for TRANSFERS (cycle-14 Phase 1).** Phase
  0's inventory settled the question against the operator's real sheet: **DQE
  carries ONE row per (agent, date)**, so `answered` / `missed` / `% answered` /
  talk-time can NEVER be split by queue — a future request for that should be
  answered "not in this data", not re-investigated. The `CSR Transfer
  Historical Data` tab is the exception: it is keyed by `CSR Rep Name`, so its
  per-queue `H:R` block IS per-rep attribution. `getCsrTransferPerRepDaily_`
  reads it behind **`opts.withQueues`, DEFAULT OFF** — attaching per-rep
  `queues {name: count}` to both the range aggregate and the per-day shape.
  Four rules, each load-bearing:
   - **The opt-in default is the compatibility contract, not tidiness.** The
     opt-out callers (`getDashboardMetrics` ×2, `getMyMetrics`'s trend, and —
     since the 2026-08-06 operator #5 batch — `getMyMetricsRange`'s
     own-transfer aggregate) CACHE their assembled results, so a flipped
     default would change those payloads with no INV-85 cache bump. Pinned by
     a test that counts 3-arg vs opted-in call sites (currently 4 vs 2).
   - **Columns are discovered BY HEADER NAME** (`csrTransferQueueColumns_`,
     bounded to `CSRT_QUEUE_COL_FIRST/LAST` = 0-indexed 7..17; 18 is Comments,
     6 is the grand total). The headers are written by the operator-owned
     `call-data-reporting` repo — name-reading is self-correcting under a
     reorder inside the block and creates no parallel source of truth to drift.
     Never replace it with a hardcoded queue list.
   - **The counts are a COMPONENT of `transferred`, never a partition of it.**
     A real sheet routes some transfers to destinations with no `A_Q_` column.
     `queueTotal` + `queueUnattributed` are reported so a UI can say "9 of 14
     attributed"; `transferred` is NEVER derived by summing queues (INV-180).
   - **A zero or blank cell is ABSENCE, not a queue with zero traffic** —
     otherwise every rep would appear to staff every queue. Accumulation is
     `+=` on collision, matching the cycle-9 L-14 rule the two totals already
     follow, so the per-day shape and the range aggregate cannot disagree.
  **Phase 2 — the manager UI.** Team Metrics gained a `role="tablist"` scope
  switcher over the same rows: **Combined** (per-rep, with the Transfers count
  as a real `<button>` disclosure + a segmented contribution bar, expanding to
  the per-queue split), **By department** (Phase 4, below) and **By queue**
  (rows are queues). A mode renders ONLY when its data exists — an inert
  switcher is worse than none. **INV-180 is enforced VISUALLY, not just in the
  payload:** the bar draws the unattributed remainder as its own muted segment
  and the detail states "N of M transfers attributed to a queue" in words; a
  bar built from queues alone would silently imply completeness. Queue colour
  is a deterministic hash (`mQueueHue_`) so a queue keeps its colour across
  renders and across modes. The Transfer read inside `getTeamMetrics` is
  BEST-EFFORT (the INV-67 posture) — a manager's whole team table must not
  vanish because one auxiliary tab is unreachable; a throw degrades to
  `transferMeta.error` and the client renders `errorStateHtml_` (INV-175).
  `mtRenderTable_` gained OPTIONAL `detailRow(r)` + `rowId(r)` for this; a
  caller passing neither renders byte-identically (see its own decision entry).
  **Phase 4 — queue→department grouping (operator-supplied, NOT inferred).**
  `CONFIG.CDR_QUEUE_GROUPS` seeds the four real departments (Sales / Customer
  Success / Field Operations / Power); Script Property `CDR_QUEUE_GROUPS`
  overrides without a redeploy; `getCdrQueueGroups_` sanitizes on read (the
  L-12 rule) and a queue claimed by two groups is kept only in the FIRST —
  the grouping is a PARTITION, and double-counting a queue is the INV-180 class.
  The fold `groupQueueRows_(queueRows, groups)` is pure and Node-pinned.
  **Sub-queues are DISJOINT from their parents (operator-confirmed 2026-07-31),
  so a group total is a plain SUM of its members.** If 8x8 ever rolls sub-queue
  traffic up into the parent column this MUST change — summing would then report
  a group at ~1.5x its real volume. Two shapes worth knowing: a queue in no
  group lands in a single trailing **"Ungrouped"** row that always sorts LAST
  regardless of volume (it is a gap to close, not a department to compare
  against), and the group `reps` figure is `max()` across member queues — a
  LOWER BOUND, not a headcount, because the per-queue figure is a count rather
  than a roster so a true union is not recoverable. The column is labelled
  "Reps (min)" for exactly that reason.
- **Note coverage + count have a single source of truth.**
  `cnNoteCoverage_(noteCount, answeredCalls)` (whole-number percent,
  or null when there's no answered-call denominator) and
  `cnCountNotesResult_(emp, from, to)` → `{count, unavailable, unenrolled}`
  (date-normalized note count WITH the read outcome; A4 removed the numeric-only
  `countCallNotesInRange_` wrapper — see the gotcha above)
  are used by `getMyMetrics`, `getTeamMetrics` (per-rep + team
  totals), and `managerGetShiftStats`. They exist so the three
  callsites can't drift apart — the F1 regression (raw
  `String(CN.DATE_LOCAL)` reads silently returning 0 coverage)
  happened because the count was duplicated inline. New Metrics /
  Stats surfaces must reuse these helpers rather than re-deriving the
  ratio; `cnCountNotesResult_` honors the `CN.DATE_LOCAL`
  normalize gotcha. Same maintenance discipline as `CN_EMAIL_PALETTE`
  and `LEAVE_DEDUCTION_CLIENT`. Both helpers use bounded reads instead
  of pulling each rep's full history: `cnCountNotesResult_` reads
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
  **Cycle-9 (batch 5) extended the family to the growth-class stores:**
  `getReferenceItem` id-scans + one-row-fetches (the hottest KB path pulled
  every article's BodyMd per open); `getMySentForms` tail-bounds at the
  newest 2000 FormTokens rows (the full-width read incl. PHI PrefillData
  blobs scanned every token ever; older tokens age off the in-app list —
  the raw sheet remains the archive); `intakeListMySubmissions` projects
  metadata columns only (INV-116); `trainReadAttempts_` takes a 4000-row
  analytics tail while `trainReadCompletions_` takes a deliberately-GENEROUS
  10,000-row backstop — **completions are STATE (INV-120: complete = the
  newest row strictly after the assignment), so a too-small cap would flip
  old completions back to Pending**; the horizon is decades out at this
  team's volume, and if scale ever ~10×es, revisit. `buildTimesheetForEmployee_`
  shape-validates + caps its span at 370 days (the per-day loop could spin
  ~2.9M iterations on a garbage range — every sibling range endpoint was
  already capped). `getMyMetricsRange` is endpoint-result-cached (INV-129).
  Relatedly (L-3), `getAdpSS_` and the ADP sheet tz (`adpSheetTz_`) are
  memoized per execution — the coercion-recovery helpers call them PER
  COERCED CELL inside whole-sheet loops.
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
- **The Call Notes pop-out's type is FLUID below its launch width (operator
  2026-08-18).** An agent who likes the framing but wants an even smaller
  window gets text that tracks the window width instead of the layout being
  the only thing that gives: two `clamp()` groups scoped to
  `:root[data-compact]` in the cn partial scale the form values 13px→11px and
  the labels / rail headings / save buttons / tag input 12px→10.5px linearly
  over 480→~340px, then STOP (the floors are the "to a certain extent" —
  never a bare vw that trails off). The clamp CEILINGS are the base rules'
  exact px values, so at ≥480px the pop-out is byte-identical to before —
  MEASURED: 13/12px at 480, 11.28/10.75px at 360, page overflow 0 throughout.
  vw only means the pop-out window because of the `data-compact` scope — the
  main window and phone views never scale. The compact grid overrides
  out-specify the ≤480px stacking breakpoints (the A2 precedent), so the 2-up
  trio + 84px label column HOLD while the type shrinks: same framing, smaller.
  Pinned (exact clamp formulas + a no-bare-vw floor scan) and on camera as
  `cn-log-light-compact-sm`. **Below 400px the framing itself YIELDS (the
  same day's narrow round — the operator's tall-and-skinny screenshot showed
  values wrapping one letter per line at ~300px):** a
  `@media (max-width: 400px)` block, every rule `:root[data-compact]`-scoped
  (phones are untouched — the non-compact ≤480px breakpoint already stacks
  them; the A2 two-independent-triggers rule), stacks the trio to one column
  (Caller under Callback), moves every `.cnv-row` label ABOVE its value
  (`.full` included), takes the save quadrant to one column, lets the note-
  card action row wrap, and **drops the note-card timestamp column**
  (operator-sanctioned — the time still rides the CRM copy and the History
  date-group headers). Declared AFTER the bare compact overrides so at equal
  specificity source order confines the yield to the media window — MEASURED:
  fully stacked with overflow 0 at 300px and 360px, byte-identical 2-up at
  480px. Pinned (block extraction by brace-match, all six rules, compact
  scope on every rule, source order, timestamp hidden EXACTLY once — 4
  mutations bite-checked). `cn-log-light-compact-sm` (360×640) now shows the
  stacked side of the boundary. The shoot harness also seeds
  `umsTzWarnedDay` (the fixture roster tz never matches the sandbox browser,
  so the 9c5df81 sticky tz-mismatch toast covered every screenshot's top —
  seeding "already warned today" is the steady state, the tour-seen posture).
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
  untouched. **Fit-to-template on launch (operator feedback 2026-08-06):**
  the Call Notes pop-out SELF-SIZES once per window via
  `cnPopoutFitToTemplate_` — gated to COMPACT_MODE + a
  `umsTeamToolsCompact_*` window name (never the main window), double-rAF
  after the Log render, measures the `.cnv-layout` bottom + the window's
  chrome delta (outer−inner), clamps to `screen.avail*`, skips within 8px,
  and `window.resizeTo`s so the whole note template is visible without a
  manual resize regardless of the machine's display scaling / remembered
  geometry. Later manual resizes are still captured + remembered per tool
  (the fit runs once per launch, before any persisted-geometry write).
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
  subsequent hover-opens behave correctly — and since cycle 9 (L-30)
  the PTO submit success handler resets it too (a request is typically
  submitted from a click-PINNED popover; that close path left the flag
  set, so every re-bound cell's mouseenter early-returned and
  hover-open was dead until an Esc or cell click). **The shell focus trap
  EXEMPTS `.overlay.hover-mode` (cycle-8):** a hover-opened popover is
  not modal — trapping yanked Tab/month-nav focus into the popover's
  Close button while the pointer merely rested on a cell; a
  click-PINNED popover drops `hover-mode` and traps normally.
- **Rectangular PTO tile (Round 2 · 8d).** The Time / PTO side rail
  (Time Off mode) renders a rectangular `.pto-tile` instead of the
  prior PTO donut. Head label + year/months-left meta + big tabular
  value + denominator + progress bar + footer with planned-upcoming
  days + projected balance after those plans land. The **planned-days tally**
  sums future-dated `pending`+`approved` requests' annual deductions from
  `data.allRequests` via `getLeaveDeductionClient_` (INV-72); the **projected
  balance** subtracts only the `pending` portion (F cycle-8 — an `approved`
  future request was ALREADY deducted server-side on the Pending→Approved
  transition (INV-03/25), so counting it in `annual - planned` double-subtracted
  it and understated the projection). The donut + `ptoRingSvg` +
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
- **Manual-copy failover on `#cn-frame` (Round 2 deferred 8e; RESCOPED
  operator 2026-08-13).** A bound `copy` event on `#cn-frame` writes the FULL
  formatted CRM template via `cnFormatNoteForCopy_` — but ONLY when the
  selection is COLLAPSED (nothing selected). A real selection copies exactly
  what is selected (browser default). The original blanket intercept solved
  the "drag-highlight → blank paste" failure of input/textarea fields, whose
  values don't contribute to a text selection — but the contenteditable
  refactor made selections carry real text, and the intercept inverted into
  the operator-reported bug: copying a phone number out of a note-in-progress
  pasted the whole template. The deliberate whole-note gesture survives as
  "click into the frame, ⌘C with nothing selected".
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
  anchor). The bold/italic/inline-code pass runs on link **text** at generation
  and the generated `<a>`/`<img>` markup is then stashed past the outer emphasis
  pass via a NUL-delimited sentinel (`\u0000L…\u0000`, the code-fence pattern —
  written as the `\u0000` ESCAPE, never a literal NUL byte, so the partial greps
  as text), so a URL containing `**`/backtick can't get `<strong>`/`<code>`
  injected into its `href`/`src` (F cycle-8; link-text emphasis still renders).
  That's the safety boundary; managers are the only
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
  **Draft→publish + revision history (#4, INV-140):** an admin can "Save as draft"
  (a trailing `Status` column; drafts are INVISIBLE to reps across every read path
  — tree/item/search/review-due) and later **Publish** (`kbPublishItem`); every
  edit snapshots the prior content to an append-only `KbRevisions` tab, viewable +
  restorable (`kbGetRevisions`/`kbRevertItem`, revert is itself reversible). Those
  three are admin-gated like the other authoring writes.
  **Copyable snippets (#6):** a ` ```snippet ` (or ` ```snippet: Label `) fenced
  block in an article body renders — via `kbMd_` — as a "canned response" card with
  a Copy button (`kbCopySnippet_`), so a rep pastes policy language straight into
  the CRM/email mid-call. It rides `kbMd_`'s existing escape boundary (the fenced
  content is HTML-escaped by the top-level pass BEFORE fence extraction, so the card
  is inert); the Copy button reads the rendered `<pre>`'s `textContent`, which the
  browser decodes back to the ORIGINAL raw snippet — no separate raw store, no new
  injection surface. `kbMd_` stays pure (the snippet markup is inlined, no `icon()`
  dep); pinned by a Node case asserting the card + Copy button + that a plain/`js`
  fence stays `<pre><code>` and the snippet body is still escaped. Works in the
  drawer reader too (shared `kbMd_`). **Per-rep bookmarks (#5):** a star toggle on
  the reader + drawer (`kbBookmarkBtnHtml_` → `kbToggleBookmark_`, pure Node-pinned
  `kbBookmarksToggle_`) stores explicit favorites in `umsKbPanel.bookmarks` (client-
  only, capped 12); surfaced in a Bookmarks block atop the Reference landing + the
  drawer home. Both #5/#6 are rep-facing (Employee-UX) and PHI-free-by-policy.
  Native-primary + Drive-fallback was chosen so 100% of content is navigable on
  day one (embed everything) while the most-referenced docs migrate to fast
  native articles over time. **Search is section-aware:** `searchReference`
  splits each article into heading-delimited sections (`kbSplitSections_`,
  fence-masked, pure), scores them with weighted distinct-token matching
  (`kbSearchScore_`, rebalanced 2026-08-17: heading 2 / body 1 per token,
  +1 per extra body occurrence capped +2/token (density — about-the-topic
  beats mentioned-in-passing), (matched−1)×3 coverage bonus (matching MORE
  of the query dominates; counts matched tokens so synonym-expanded tokens
  can't make it unreachable), title +3/token CAPPED at +4 total (a
  doc-level signal — uncapped, every section of a title-matching doc
  outranked the one section actually about the query, the "my result was
  further down" report), +3 exact phrase — a title-ONLY match emits a single
  doc-level hit instead of flooding every section in, and that doc-level
  hit's title score stays uncapped since "the doc named exactly this"
  belongs at the top), and returns the top 20
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
  **Search synonyms + filters (#8):** admin-editable synonym groups (Script
  Property `KB_SEARCH_SYNONYMS`, JSON array of ≥2-term lowercase groups, e.g.
  `[["cpap","pap"],["pmd","power chair"]]`) let a query token pull in the group's
  other tokens (`kbExpandSynonymTokens_` in `searchReference`; token-level, so
  multi-word terms split into tokens), so "cpap" finds "pap". Edited via a compact
  admin-only "Synonyms" modal in the Reference tree header
  (`kbGetSearchConfig`/`kbSaveSearchConfig`, **admin-gated** INV-136,
  `AdminConfigChange` audit; sanitize-on-read → corrupt blob degrades to `[]`, so
  unset = today's exact behavior). The Reference-tab search results also carry a
  client-side **filter bar** — type chips (All / Articles / Embeds, with counts)
  + a department `<select>` — that re-renders the cached `KB_STATE.searchResults`
  with NO re-query (`kbRenderSearchResults_`/`kbSearchFilterBarHtml_`); the drawer
  search is unchanged. **"See also" (#7):** the reader lazy-loads
  `kbGetRelated(itemId)` (rep-callable, read-only, bounded KbViews tail) — items a
  rep opened in the same (rep, day) session as this one, ranked by the pure,
  Node-pinned `kbCoViewRelated_` (distinct-session co-view count, **silent below
  `KB_RELATED_MIN_COVIEWS`=2** so thin data shows nothing, top `KB_RELATED_TOP`=5,
  deleted items + non-admin-drafts dropped). No AI, just counting; it improves as
  KbViews accumulates. Both #8 filters + #7 render only in the Reference tab (not
  the mid-call drawer). Pinned by the `kbCoViewRelated_` Node test + the
  `kbGetSearchConfig`/`kbSaveSearchConfig` gate cases + the `kbGetRelated`
  rep-auth case.
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
- **Interactive roster block (` ```roster `, operator 2026-08-11).** An
  employee/routing map is the one KB content type a static article serves
  badly: mid-call the rep's question is "who handles X", not "show me the
  org". A `roster` fence renders an interactive directory —
  filter-as-you-type across department/team/person/tag, tag tooltips from a
  legend, click-a-name-to-copy, and per-person badges. It follows the
  ` ```snippet ` precedent EXACTLY, which is what makes it safe: `kbMd_`
  escapes `& < >` BEFORE the fence is captured, so the APP draws interactive
  markup around text that is already inert — **article bodies still cannot
  carry HTML or script, and that boundary is untouched.** Syntax is
  deliberately hand-editable (`legend|`, `badge|`, `dept| Name — Owner`,
  `team| Team > Sub: Person (tags)*lead, …`) because the operator's stated
  plan is for the app to become the source of truth for this data.
  **Three things that are easy to get wrong:** (a) the fence content arrives
  HTML-ESCAPED, so an ampersand separator is `&amp;` — splitting tags on a bare
  `&` turns "C & ATP" into the tag "amp; ATP" (found by running it, invisible
  in review). **THE SAME TRAP BIT AGAIN AND SHIPPED**: `>` arrives as `&gt;`,
  so `team| A > B` parsed as ONE team literally named `A &gt; B` with an EMPTY
  sub-team, and it looked correct in every screenshot because the entity
  DISPLAYS as `>`. The pins missed it because they fed the parser RAW text —
  not the production contract. Every roster pin now escapes its input through
  `rosEsc()` first, every separator matches BOTH forms (`&gt;`/`>`,
  `-&gt;`/`->`, `&amp;`/`&`), and stage lookups normalise through
  `kbRosterKey_`. **The parser never unescapes** — decoding to a raw `<`/`>`
  and later emitting it would undo the very boundary the escape provides; (b) the top-level escape does NOT cover quotes and the renderer
  puts names into attributes, so attribute contexts need their own
  quote-escaping — the same gap `kbMd_`'s link/image rules guard; (c) a badge
  is an attribute of a PERSON, so it must follow them onto every team they
  appear on, which a separate list cannot do. **Searchability is preserved and
  is the point:** `kbSplitSections_` masks fences for HEADING detection only,
  so every name and team inside the block stays in the section text and
  `searchReference` finds it — verified, not assumed. Renders at 400px (the
  drawer is the surface it exists for): intrinsic `auto-fill` team grid,
  `align-items: start` so a 3-person team doesn't stretch to a 9-person one,
  stacking at ≤560px. Real `<button>`s (INV-173), a named filter input, an
  `aria-live` count, and tooltips on keyboard focus as well as hover.
  `kbConvertDriveSheet` emits this block for a BANDED sheet by default
  (`plain:true` opts out), carrying a highlighted cell across as `*lead` — so
  converting a roster spreadsheet gives the interactive version in one step. A
  TABULAR sheet is never forced into a roster; it stays a table.
  **Tier 1 (same block, more capability — operator 2026-08-11):** THREE views
  over one parsed source, switched by a `role="tablist"` segmented control
  (`kbRosterBodyHtml_(data, mode)`; the source rides on the root as `data-src`
  so a switch re-renders without re-running `kbMd_` over the article).
  **Teams** is the org's own shape; **Capabilities** regroups people by tag
  ACROSS teams — "who can take a Complex Rehab call" is a question the
  team-shaped sheet structurally cannot answer, and is the main reason a
  structured roster beats a picture of one; **Coverage** is an aggregate
  (people / teams / departments / capabilities, a per-capability table, and
  the teams with no lead marked). **Coverage states FACTS ONLY — never a
  staffing verdict**: the block has no idea what the target headcount is, so
  "understaffed" would be a confident-looking judgement drawn from data that
  cannot support it (INV-187); it reports single-point-of-contact rows and
  lets the reader judge. It is also never filtered — filtering an aggregate
  would report totals that quietly describe a subset. Clicking a person opens
  a **detail panel** (every team they are on) rather than copying; Copy moved
  into the panel. Clicking a tag filters by it. **Three things that bit during
  this batch, all found by measuring rather than reading:** (a) the count
  mixed units — distinct people on first paint, visible ROWS after a filter or
  mode switch — so a 46-person roster read "49 people" in the capability view
  where a person appears once per tag; it now counts distinct `data-name`s in
  every mode; (b) a tag click filtered by SUBSTRING, and the single-letter tags
  this data uses ("C", "P") also matched "Medical Review" and "Insurance
  Change" — 42 of 46 people; tags now ride pipe-delimited in `data-tags` and a
  `tag:` query matches exactly; (c) a person on two teams produced DUPLICATE
  DOM ids, which is invalid and breaks the very anchors the ids exist for —
  they now take the same `-2`/`-3` dedup walk `kbMd_` uses for repeated
  headings, with the first occurrence keeping the bare slug as the canonical
  target. **Chart (4th view, operator 2026-08-11):** a node-link tree with
  PROGRESSIVE DISCLOSURE — departments collapsed, expand one for its teams,
  expand a team for its people. **This is the correction to an earlier
  assessment that a chart was not viable**, whose reasoning assumed a STATIC
  chart: 46 leaves × ~90px is ~4100px, unreadable everywhere. A tree's width is
  set by its widest VISIBLE row, so under disclosure that becomes one
  department's team count (9 here, ~1350px) and people stack VERTICALLY inside
  their team, making an expanded team cost height rather than width. The whole
  tree is rendered and hidden with CSS rather than built on demand, so expand
  state lives in the DOM (nothing to lose on re-render) and a filter can simply
  reveal matching branches. It scrolls inside its OWN container so the page
  never scrolls sideways, and the scroll hint appears only when the row
  actually overflows. **It shows STRUCTURE, not reporting lines, and says so:**
  the source records team membership and does not say who reports to whom, so
  person-to-person edges would assert a relationship the data does not contain.
  Four defects fixed during the build, all found by measuring: the count read
  "0 people" (chart mode has no `.kb-ros-dept` walk for the row-counting filter
  — the mixed-units class again, so both aggregate views now report the index
  size); the connector rail stopped at each box's own right edge, leaving the
  flex gap unlined so the lines read as detached stubs; **the explanatory notes
  sat INSIDE the scrolling container and scrolled away with the tree**, losing
  the one statement of what the view shows exactly when a wide row made it most
  needed; and two department boxes at their wide min-width overflowed a 400px
  viewport before anything was expanded.
  **Flow (5th view) + Expand (operator 2026-08-11, from the first deployed
  screenshot).** A roster is org-SHAPED; an order moves through STAGES, and
  those are different questions — so a `flow| [Label:] A -> B -> C` line
  records the sequence and a **Flow** view renders it as numbered, wrapping
  stages. A stage naming a real team links to it (people count, lead,
  expandable inline); anything else renders as a plain step, so a flow may
  include stages that are not teams. **The tab appears ONLY when a `flow|`
  line exists, and the sequence is NEVER inferred from the sheet's layout** —
  the order work actually travels in is operational knowledge, and a guessed
  process shown to reps as fact is worse than no diagram; the empty state says
  so and prints the exact line to add. **Expand** opens the block nearly
  full-viewport via `ensureOverlay` (INV-83), because the Reference reader is a
  height-capped panel in a two-column shell and an interactive block ends up in
  a small window with nested scrollbars; the overlay hosts a FRESH instance
  from the same source, so closing it leaves the inline copy untouched.
  **A THIRD instance of the same count bug appeared here** (flow mode has no
  `.kb-ros-dept` walk, so the row-counting filter reported 0), so the bypass is
  now the RULE "not the dept/team grid" rather than a list of view names.
  **PROCESS GRAPH (operator's training diagram, 2026-08-11).** The real process
  is NOT linear, so `flow| A -> B -> C` could not express it: it has branches
  (Route A / Route B off one decision), a decision with two outcomes
  (Approved / Denied), a loop back through Appeals, four named phases, and an
  external feed (Sales) entering at two points. The block therefore takes
  `phase| Name: Node, Node*decision, Node` (with `phase| *: Name` for something
  outside the phases) and `step| From -> To: label`; the linear `flow|` form is
  kept as SUGAR that generates the same steps, so both notations feed ONE
  renderer rather than two that drift. **Edges are drawn by MEASURING the boxes
  CSS already placed** (phases are flex columns, nodes stack in declaration
  order) — no layout engine, and the diagram cannot disagree with what is on
  screen; it redraws after any expand/collapse, because opening a node moves
  every box below it. **Classify edges by the boxes' LEFT edges**: comparing
  source-RIGHT to target-LEFT calls every same-column vertical step a loop-back
  (8 of 14 on the real process), since a stacked sibling always sits left of
  its parent's right edge. Three cases — same column (vertical), forward
  (curve), backward (routed under). Connectors are hidden below 700px where the
  columns stack and lines between them would be meaningless; the per-node route
  labels carry the structure there. **A step naming a node no phase declares is
  REPORTED, never silently dropped** — a vanished connection leaves a diagram
  that looks complete (INV-187).
  **AN EDGE THAT SKIPS SOMETHING MUST NOT LOOK LIKE ONE THAT STEPS TO IT
  (operator correction, 2026-08-11).** Within a column, `PAR → Approval` and
  `PAR → Appeals` both drew as plain verticals at the same x, so they
  overlapped and read as a required chain `PAR → Appeals → Approval` — the
  OPPOSITE of the real process, where approval is reached directly and appeals
  is the denied branch. Adjacency now decides: a step to the next sibling draws
  straight, a skip past one arcs around the side, and an edge spanning more
  than one PHASE (an order entering past the first stage) arcs above the
  columns; both skips are dashed and info-toned. Related direction bug: an
  UPWARD same-column edge was drawn from the topmost box, so the arrowhead
  landed on the SOURCE — every edge now starts at its source. **Node order
  within a phase is therefore meaningful**: put the happy path in sequence and
  it renders as the straight spine, with detours visibly leaving it.
  **The classification is the pure `kbRosterEdgeKind_`** (step / skip /
  phaseSkip / forward / back, plus `down` and a reciprocal `lane`), extracted
  because EVERY drawing bug so far lived in that decision rather than in the
  path arithmetic — and none of it was testable while it sat inside a function
  that needs a real browser layout. It is now pinned behaviourally with stub
  rects; the remaining source pins only assert the wiring.
  **A RECIPROCAL pair gets one lane each way (operator, 2026-08-11):** an
  appointment can bounce between two stages, so `A → B` and `B → A` both
  exist; on one centre line they overlap into a single stroke with arrowheads
  at both ends and no way to tell which label belongs to which.
  **`*join` marks an AND-join** — a stage that waits for EVERY applicable
  inbound path, not any one of them (PWC Verification waits on whichever of
  PT Eval / ATP Eval the order needs, and neither is always required). Without
  it, several inbound edges read as alternatives, which is the opposite of the
  real rule; the node states the condition in words rather than relying on the
  arrows alone. Markers compose in either order (`X*decision*join`).
- **A fenced block is ATOMIC in search-chunk truncation (operator 2026-08-11).**
  `kbChunkTruncate_` cut at a paragraph boundary and then "repaired" an odd
  fence count by appending a closing fence — turning a HALF block into a
  syntactically VALID one. Measured on the live deployment: a truncated
  `roster` fence rendered as a confident interactive directory holding **10 of
  14 teams**, reporting **"40 people" for a 46-person roster**, with a mangled
  partial line as its only hint. A truncated `snippet` is worse still — it
  hands a rep a canned response to copy that stops mid-sentence. Prose can be
  cut with a "continues in the article" note; a fenced block cannot. The cut
  now extends to keep the whole fence when it fits `KB_CHUNK_FENCE_OVERAGE`
  (4×) and otherwise stops BEFORE the fence, never inside it. The odd-fence
  repair is retained for the DISTINCT case of a fence the SOURCE never closes —
  truncation did not break that, the article did.
- **Decision / task-guide block (` ```decision `, operator 2026-08-11).** Asked
  for as "guide me through a task, with actions at the leaves". A `decision`
  fence asks ONE question at a time and lands on an ACTION with tickable steps,
  so a rep mid-call is never reading a branching policy page while holding the
  branch in their head. Syntax matches the other blocks:
  `ask| id: Question`, `opt| id: Label -> targetId`, `do| id: Action`,
  `todo| id: Step`, `note| id: Caveat`. **The first `ask|` is the root**; ids
  are author-chosen and never shown. **Three authoring errors are REPORTED
  rather than hit as a dead end mid-call**: an option pointing at a node that
  does not exist, a node nothing can reach from the root (found by a walk), and
  a question with no answers. A node given a second title is refused — picking
  one silently would be worse. The trail of answers renders as crumbs, each a
  button back to that question, because a rep who mis-answers must not have to
  start again; `kbDecideResolve_` SKIPS an answer that no longer matches rather
  than throwing, since an author can edit the tree under a reader mid-walk.
  **Ticks are deliberately not carried across a re-render** — they belong to
  the action on screen, and restoring them onto a different action would assert
  work that was not done. Options and crumbs are real buttons (INV-173) and the
  question region is `aria-live` so the new question is announced.
- **Glossary block (` ```glossary `, operator 2026-08-11).** This department
  runs on acronyms — PPD, PAR, ATP, MDO, PWC, T3Q, GP1–3 — and a new rep meets
  them mid-call with no way to ask (five people on the live roster are marked
  `*new`). A `glossary` fence renders a filterable definition list from
  `Term| Definition` lines (`Term (aka Other, Alt)|` for extra spellings) AND
  teaches the article to explain itself: `kbGlossaryAnnotate_` marks the FIRST
  mention of each defined term elsewhere in the same article with a dotted
  underline and a hover/focus definition. **First mention only, on purpose** —
  marking every occurrence turns a page into a field of dotted underlines and
  stops reading as emphasis at all. **An ALL-CAPS term is treated as an acronym
  and matched case-SENSITIVELY**, so "par" in ordinary prose does not link to
  PAR; mixed-case terms match case-insensitively, and longer terms are matched
  first so "PT Eval" wins over "PT". A term defined twice is REFUSED (a second
  definition is ambiguous, and silently picking one is worse) and counted in the
  block's warning line. The annotator is a TEXT-NODE walk — the
  `kbHighlightTerms_` pattern, never string surgery on rendered HTML — skips the
  glossary block itself plus headings/code/links, and is wrapped in a catch
  because annotation is decoration and must never break the reader. Wired into
  BOTH readers (the Reference tab and the Ctrl/⌘+K drawer). **Scope limit worth
  knowing: terms annotate within the article that defines them.** App-wide
  linking would need a designated glossary article behind a Script Property (the
  `WHATSNEW_KB_ID` shape) — deliberately not built yet, since one glossary
  article that reps search for already answers "what does PAR mean" through the
  existing drawer search.
- **Warehouse map block (` ```map `, operator 2026-08-13 — Tier A, NO
  billing).** The operator's constraint was explicit: no cost, no billing —
  which rules out the Maps JavaScript/Places APIs (key + billing account) and
  selects Apps Script's FREE built-in **`Maps.newGeocoder()`** (no key, daily
  courtesy quota) plus the keyless `https://www.google.com/maps?q=…&output=embed`
  iframe. A `map` fence of `wh| Name: Street, City, ST ZIP` lines (split on the
  FIRST colon; cap 20 with the overflow REPORTED, INV-169) renders a warehouse
  directory — per-warehouse open-in-Google-Maps link + a lazy keyless embed
  behind a real `aria-expanded` toggle button — and a nearest-warehouse lookup:
  the query geocodes SERVER-side (`kbMapDistances`, rep-callable, bounded ≤20
  addresses / ≤200 chars each), straight-line miles come from the pure
  Node-pinned `kbHaversineMiles_`, and results sort nearest-first with a
  per-result **Directions ↗** link (real driving distance — the block never
  presents haversine as a drive figure, INV-187; the copy says "straight-line
  estimates"). **The privacy split is the load-bearing decision:** warehouse
  geocodes cache PERMANENTLY (Script Property `KB_MAP_GEOCODE_CACHE`, keyed by
  address HASH — operator-owned static addresses, and the cache keeps
  steady-state quota at ~ONE geocode per lookup), while **the rep's query is
  NEVER persisted** — no cache entry, no audit row, no log line — because a
  looked-up address may be a patient's; the input placeholder asks for a ZIP
  for the same reason. Pinned: the function's ONLY `setProperty` is the
  coordinate cache, written BEFORE the query geocode so the query cannot be in
  the blob, plus zero `UrlFetchApp` anywhere in the geo path (nothing to
  bill). Fence rules match roster/glossary: content arrives HTML-escaped
  (`&amp;` survives parse; only URL building decodes, then
  `encodeURIComponent` re-encodes — `%26`, never `&amp;`, reaches the URL),
  attributes are quote-escaped, values read back off `data-*` are DECODED so
  the lookup render `esc()`s them, and unknown lines are counted, never
  silently dropped. Rows are flex-wrap (intrinsic reflow — no A2 breakpoint
  owed; measured 400/400 at drawer width). Geocode failures per warehouse
  render "distance unavailable", never 0.
- **Article images fall back to server-served data when Drive blocks the
  thumbnail (operator 2026-08-13).** The KB Images folder's domain-link
  sharing is BLOCKED by Workspace policy on this domain (the documented
  `getOrCreateKbImagesFolder_` degradation), so the
  `drive.google.com/thumbnail` `<img>`s `kbMd_` renders 403'd for reps — alt
  text plus a Workspace "blocked" page behind the anchor. The web app runs as
  the folder-OWNING deployer, so `kbGetImageData(fileId)` (rep-callable,
  read-only, NO lock) serves the bytes as a base64 data URL. **The folder
  check is the security boundary:** the file's parents must include
  `KB_IMAGES_FOLDER_ID` BEFORE any bytes leave — without it, any signed-in
  employee could read ANY Drive file the deployer can open, by id — and every
  refusal path (unset property, bad id, missing file, out-of-folder, wrong
  type, oversize `KB_IMG_FETCH_MAX_BYTES` 4MB) returns the SAME generic
  'Not available.' so existence never leaks. Client: ONE document-level
  CAPTURE-phase `error` listener (error events don't bubble) covers every
  `kbMd_` render site — Reference reader, drawer, search chunks,
  training/empdocs readers, What's new — with zero per-site wiring; scoped
  STRICTLY to `.kb-article` imgs whose src starts with the Drive thumbnail
  origin (an external image failing must not send its arbitrary URL to our
  server), retry-guarded (`kbFbTried` — a failing swap can't loop),
  session-cached per fileId with a pending fan-out (two `<img>`s of one file
  fetch once) and a 'failed' marker (a broken file can't hammer the server on
  re-renders). Progressive enhancement: when the thumbnail loads normally
  (folder shared, policy relaxed), the endpoint is never called. The wrapping
  anchor keeps its Drive href — the open-full-size path for accounts with
  access, and a `data:` href would be blocked as top-level navigation anyway.
- **Sheet→article conversion (operator 2026-08-11).** A Drive SHEET embed is
  the WEAKEST item type in the KB, and the reason is structural, not cosmetic:
  `searchReference` treats every embed as a **title-only hit** ("No stored
  content to chunk"), and the Ctrl/⌘+K drawer refuses to host an iframe at
  400px and hands off to a browser tab. So a routing roster embedded as a
  sheet is invisible at exactly the moment a rep needs it mid-call — and the
  `/preview` iframe loads under the REP's credentials, so every rep also needs
  their own Drive access to the file. `kbConvertDriveSheet` (admin-gated,
  INV-136 tier; strictly READ-ONLY like `kbConvertDriveDoc`, INV-115) converts
  it to a native article: full-text searchable, section-anchored, drawer-
  readable, no per-rep Drive access. It uses `SpreadsheetApp`, already an
  authorized scope, so unlike the Doc converter it adds **no new OAuth scope**.
  **The conversion detects the sheet's SHAPE rather than assuming one**
  (`kbSheetGridToMarkdown_`, pure + Node-pinned): a sheet with no merges and a
  header row becomes a GFM table; a **banded** grid — the merged-cell layout
  people build by hand — becomes headings plus grouped member lines.
  **The load-bearing detail is that these grids partition by COLUMN, not by
  row:** two sub-teams sit side by side in the same rows, so a row-wise walk
  merges them into one line and tells a rep that PPD's people cover MDO. A
  full-width merge is a department band (`###`), a partial merge is a sub-team
  that CLAIMS THE COLUMNS from its own position to the next header (`####`),
  and members are collected per column range. The band test is "spans the used
  width", NOT a ratio of it — measured against a real roster, a 3-column
  sub-team merge cleared a 60%-of-6-columns bar and every sub-team was
  promoted to a department. Cell HIGHLIGHTS are preserved as bold and reported
  in a warning telling the operator to write the legend down: dropping them
  loses real information (which name is the lead) and inventing a meaning
  would be worse. Reads are bounded (`KB_SHEET_MAX_ROWS`/`_COLS`) with
  truncation REPORTED (INV-169), and cells are read with `getDisplayValues()`
  — a foreign spreadsheet's timezone/format is not ours to reinterpret
  (INV-64). Pinned by the column-separation behavioural test, the table/banded
  shape split, the highlight-legend warning, and a **round-trip through the
  real `kbMd_`** (the Doc converter's guard — the two are a parallel pair).
  **Deliberately NOT an automatic sync:** conversion is a manual,
  review-before-save action, so an article that has since been edited in-app is
  never silently overwritten — which is what makes "the sheet is the source
  for now, the app becomes the source later" a one-way door the operator walks
  through when they choose, rather than a migration.
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
  (`kbAiGatherFacets_`: form flags + tags; the department facet died with
  `umsCallNotesLastDept`, 2026-08-13) is a
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
- **Self-improving-KB loop — rep freshness signal + content-gap requests
  (INV-139).** Two rep-driven signals that turn the KB from static docs into a
  self-correcting library, both feeding the manager review workflow and both
  PHI-free-by-policy (two new deployer-only append-only tabs — `KbFeedback` +
  `KbContentRequests` — auto-provisioned on first touch; NO new operator state).
  **#2 (freshness):** every article/embed reader carries a "Was this helpful?
  Yes/No" + "Flag as out of date" bar (`kbFlagItem`). A `stale` flag jumps the
  item to the TOP of the manager Review-due queue regardless of age (the
  strictly-newer-than-last-review reset — `kbMarkReviewed` clears it, no status
  column; a same-day review clears a same-day flag via the datetime-granular
  `kbCellTs_`), showing the rep's note. This is the actionable complement to
  INV-126's purely age-based review-due — an article can be WRONG long before it
  is OLD. **#1 (content-gap):** a ZERO-RESULT Reference search offers a deliberate
  "Request an article" (`kbRequestArticle` → the manager `KbContentRequests`
  landing block); the deliberate action is the PHI-safety mechanism (the rep
  describes a topic, not a patient — the same posture as form-consent), chosen
  over raw zero-result-query logging precisely because a raw query could carry a
  pasted patient name. It hands managers a data-driven content roadmap instead of
  guessing. Rep writers are rep-callable/locked/append-only; the manager
  triage endpoints (`kbGetContentRequests`/`kbResolveContentRequest`) sit in the
  MANAGER review tier (alongside `kbGetReviewDue`/`kbMarkReviewed`), NOT the admin
  content-authoring tier. **Drawer parity (shipped):** the "Was this helpful? +
  Out of date" bar and the zero-result "Request an article" CTA also render in the
  Ctrl/⌘+K reference drawer (`kbDrawerOpenItem_` / `kbDrawerSearch_`); the feedback
  bar is located from the clicked button via `closest('.kb-feedback')` (NOT a DOM
  id) so the tab + drawer can show the same article's bar without an id collision.
  **👍/👎 counts (shipped):** `kbFeedbackCounts_()` (cumulative helpful/notHelpful
  per item over the bounded feedback tail) folds into the manager Most-used +
  Review-due landing rows (`kbFbCountHtml_`, a `thumbsUp N · thumbsDown M` chip,
  hidden when there's no feedback). See INV-139.
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
  PHI is the caller's own. Since cycle 9 (L-8) it tracks which of the three
  source streams FAILED (each delegate can throw OR return `{error}`) and
  returns `partial: true` + `failedSources[]`; the modal renders a warn banner
  naming the missing streams — on a patient-context surface a failed-to-load
  stream is meaningfully different from "no data" (the old bare catches made an
  authoritative-looking partial timeline). Surfaced as a Timeline button in the
  note-card more-menu (next to "Find prior calls for this TRX") → a read-only
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
  `configTimezone` for the hint. **Broken-embed / lost-access check (#3):**
  `getStorageHealth` also probes every KB **embed** for Drive reachability
  (`kbScanBrokenEmbeds_`, bounded `KB_EMBED_SCAN_CAP`=150, best-effort) — a Drive
  file that was deleted/moved or lost deployer access renders a dead `/preview`
  iframe that errors NOWHERE, so it's neither "stale" (INV-139) nor an unreachable
  *store*. Uses `DriveApp.getFileById(id).getName()` (forces the lazy access
  check; `DriveApp` is already a project scope — KB images/converter — so NO new
  OAuth). Returns `kbEmbeds:{total,probed,reachable,broken[],truncated}`; the
  panel renders a danger list of broken embeds (title · dept · kind · open ↗ ·
  reason — PHI-free, KB is PHI-free-by-policy) and folds a `N broken embed(s)`
  warn into the Overview Storage summary card. The scan is gated behind
  `getStorageHealth({scanEmbeds})` (default on) and **skipped by
  `getDeployReadiness`** (`{scanEmbeds:false}`), which only bands store config —
  so the Admin Overview doesn't double-scan Drive.
- **Automation Health panel (Admin tab).** Manager-only, read-only
  surfacing of the silent-degradation signals (`getAutomationHealth`,
  rendered by `cnLoadHealthPanel_`; since the 2nd-pass consolidation it sits
  behind the Overview "System details" disclosure, with the Automation + CDR
  System-status cards as its always-visible summary). One
  bounded AuditLog tail scan (`CN_AUDIT_MAX_SCAN` rows) yields (a) the
  `PersonalSheetSyncFail` count + 5 most recent entries over a 30-day
  window and (b) the last-seen audit row per automation job
  (`AUTOMATION_AUDIT_ACTIONS`: reconcile / ADP export / both form+note purges /
  the call-notes cold-archive / the cold-archive purge / the timesheet
  cold-archive / the PTO accrual credit) —
  each captioned with its expectation, since purges only write a row
  when retention is enabled and the export only fires at period end, so
  "never seen" isn't automatically "broken". A CDR block (5-min-cached
  unfiltered 7-day read) reports reachability, `columnWarning`, and
  roster↔agent name mismatches — canonicalized through
  `getCdrNameMap_()` first, because the unfiltered read doesn't apply
  aliases itself and every aliased agent would otherwise false-positive
  as unmatched. CDR failure degrades to a warning box (`cdr.ok:false`)
  without taking down the rest of the panel. Every server string is
  `esc()`'d before `innerHTML`.
  **The CDR status card tones off `likelyMismatches` — NEVER either raw name
  list** (see the "a diagnostic that can never be clean" gotcha): both raw
  directions are permanently non-empty on a real deployment, so either one
  pins the card amber forever. The two raw lists still render beneath it as
  muted reference detail, capped with an explicit "+N more" (INV-169), and
  joined with a MIDDOT because a name can itself contain a comma
  ("Smith, Bob" comma-joined reads as two agents).
  **Queue inventory (sub-queue Phase 0) — OPT-IN, panel only.** The app has
  always had queue data and always thrown it away: DQE rows whose Agent cell is
  `A_Q_*`/`Backup CSR` are dropped by `isCdrQueueSentinel_`, **`CDR.QUEUE_EXT`
  (col 4) is declared but read nowhere**, and the CSR Transfer tab's per-queue
  `H:R` block is fetched on every read and ignored. `cdrQueueInventory_(from,to)`
  is a READ-ONLY discovery scan reporting distinct queue identifiers, the
  skipped `A_Q_*` aggregates, which Transfer `H:R` columns actually carry data,
  and — the load-bearing one — **rows per (agent, date)**: whether DQE is one
  row per (agent, queue, date) or one per (agent, date) decides whether
  per-queue REP attribution exists in the data at all. The client
  (`cnQueueInventoryHtml_`) states that verdict in plain language and keeps
  "cannot determine" (an empty window) DISTINCT from the negative verdict.
  **It is gated OFF by default and that gate is load-bearing:**
  `computeAutomationHealth_(opts)` defaults `scanQueues` false because
  `getAutomationHealthBadge` polls it **every 10 minutes per manager** and
  `sendAutomationHealthDigest` runs it daily — both call it directly. Only
  `getAutomationHealth()` opts in; `getDeployReadiness` passes
  `{scanQueues:false}` (the `getStorageHealth({scanEmbeds:false})` precedent).
  The DQE read is 3 columns (not the sibling's 34) and tail-capped at
  `CDR_QUEUE_SCAN_MAX`, reporting `truncated` rather than silently describing
  part of the sheet; lists cap at `CDR_QUEUE_LIST_CAP`. Deliberately NOT folded
  into `getCdrAgentMetrics_`'s meta — that result is cached and consumed by
  every Metrics call, so widening it would tax the hot path and force an INV-85
  cache bump for a diagnostic. PHI-free (identifiers + tallies only).
  Since Phase 1 the block also renders **"Transfers by queue · in window"** —
  windowed transferred totals + contributing rep count per queue, sourced
  THROUGH the production reader (`getCsrTransferPerRepDaily_(…, {withQueues:
  true})`) rather than a second hand-rolled scan, so the Phase-1 code path is
  exercised on live data. It is a separate read of the Transfer tab from the
  occupancy scan above because they answer different questions ("do these
  columns carry data historically" vs "how much landed in the window"); both
  ride the same `scanQueues` gate.
  **"Jump to source" (Tier 1):** the panel
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
  **Detector liveness (Turn C, cycle 7):** the panel also renders a "Detector
  liveness" block from `automationDetectorChecks_()` — pure writer↔parser
  round-trips (coaching-overdue stamp, audit-staleness stamp, DR SLA stamp, the
  CN timestamp boundary, both form-token cell shapes) plus a CDR
  `offRosterAgents` channel-presence check appended by the existing CDR read.
  "The job ran" says nothing about "the job's detector works" — twice in cycle
  7 a detector shipped dead (H-1, M-11) and nothing surfaced it. A failing
  check renders DEAD in the panel, rides `sendAutomationHealthDigest` as a
  failure, and fails the `automationDetectorLiveness` smoke test; a Node
  tripwire pins the compute→return→digest wiring + the seven check keys
  (cycle 8 added `briefConfig` — a CONFIG-coherence check, not a parser
  round-trip: the `managerDailyBrief` flag ON without a fresh
  `managerBrief` heartbeat = the brief trigger was never installed; the
  fail-safe suppression keeps the individual digests sending meanwhile,
  and this check emails the misconfiguration via the failure digest —
  and F9 added `managerSource`: MANAGER_EMAILS ↔ roster `isManager` drift.
  The dual manager-source split is intentional (`assertManagerCaller_` gates
  triggers on the MANAGER_EMAILS property because a trigger runs as the
  INSTALLER; in-app endpoints gate on the roster `isManager` column) but the two
  can drift — a demoted/off-boarded manager removed from the roster yet still in
  MANAGER_EMAILS retains trigger + purge power via `google.script.run`. The pure,
  Node-pinned `managerSourceDrift_(propEmails, rosterPairs)` flags exactly those
  emails (in MANAGER_EMAILS AND a roster row marked NOT a manager); an email with
  NO roster row — a legit non-roster deployer/service account — is deliberately
  never flagged, so the check is false-positive-free and never nags a clean
  deployment. It changes NO gate logic (the split stays) and needs no new
  trigger — it only surfaces the hazard).
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
  `.cn-composer-tabs` + `.cn-composer-tab(.on,.disabled)` — the
  segmented-pill vocabulary (originally modeled on the Time/PTO mode
  toggle, RETIRED by the 2026-08-18 consolidation; the Coaching
  Mine ⇄ Team toggle is the surviving sibling).
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
  Copy / Save & Compose / Open Email / Clear; kbd-chips hidden (cycle-12 V-3
  made that rule actually WIN — it had been dead at equal specificity, so the
  chips rendered and the longest clipped in the 480px pop-out; both shortcuts
  now ride the buttons' `title`) — tooltips
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
  it render an unclassed `<tr>` exactly as before). **Cycle-12 V-11 added the
  third caller:** the Coaching "By employee" table was the one manager table
  still hand-rolled (`tr-table coach-rep-table` — no header treatment, hover, or
  sticky header, contradicting this decision); it now renders through the
  component with its overdue tint via `rowClass`, and the Coaching KPI strip was
  left-aligned to match its `.telemetry` twin (it was centred). A Node pin
  asserts the hand-rolled markup does not come back.
  **Cycle-14 Phase 2 added the second optional hook: `detailRow(r)` + `rowId(r)`
  emit a collapsed `<tr class="mt-detail" hidden>` beneath a row.** Additive
  like `rowClass` — a caller passing neither renders byte-identically, which is
  what makes it safe to extend a component with three live callers. The CALLER
  owns the disclosure `<button>` (so it can sit in whichever column suits) and
  must point its `aria-controls` at the row id; the id is charset-restricted in
  the component for the same reason the sort handler is (cycle-11 L-15 —
  entity-escaping is the wrong neutralizer in an attribute the browser decodes
  before use).
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
  The destination glyph EQUALS the next state's PRIMARY idle glyph (LunchOut→mug,
  then On-Lunch's primary is LunchIn, idle = mug; **LunchIn→`doorExit`**, because a
  lunch RETURN sets `afterLunch`, which makes ClockOut — idle = `doorExit` — the
  primary, NOT LunchOut), so the morph carries seamlessly through the re-render.
  (F7: `PUNCH_MORPH.LunchIn.to` was `headset` — the old pre-`afterLunch` primary's
  idle — and lagged the re-render by a half-step until it was set to `doorExit`.)
  Reduced motion snaps `.cm-to` on (the partial's existing prefers-reduced-motion
  block). Other punches keep the `lo-dots` "Working…" loader.
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
  indeterminate bar (admin/coverage/intake panel reloads — the DASHBOARD no
  longer uses it: operator pick 2026-07-10 replaced its loaders with
  card-shaped skeletons, `clkDashSkeleton_`/`clkDashSkelKpis_` composing the
  shared `.skel` shimmer into carousel/KPI shapes so loading holds the layout;
  a Node tripwire pins zero `loSweep(` in `tc/script_clock.html`); Role D `.lo-dots`.
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
  coverage-heatmap stagger; **list-swap** (operator 2026-08-06) —
  `animateListSwap_(container, selector?)` in `script_core.html` stamps
  `.swap-in` + a per-item `--d` stagger (capped 12) on a list a filter/tab
  switch just re-rendered IN PLACE (`@keyframes listSwapIn`, opacity/transform
  only, in `styles.html` beside the shared `.sp-task` block); wired at the DR
  status + dept chips, the Spanish tab chips, and the Team Metrics scope
  switcher — decoration only (blanket try/catch), reduced-motion-neutralized,
  pinned incl. a keyframes property whitelist; §8 `.kb-dept-body` /
  `.cn-qa-cards` max-height
  accordion (KB dept toggles its class LIVE now, not a re-render, so it can
  animate); §10 two stacked `.sky-layer`s cross-fade the Clock big-clock card
  (CSS can't transition between two gradients). **Night-sky decor (operator
  picks a+b+d, 2026-07-10):** `clkSkyFor_` walks night SUB-phases (Dusk /
  Nightfall / Midnight / Late night / Pre-dawn — overnight-local IST reps now
  cross ≥4 distinct looks per shift) each carrying a `stars` density 0–3;
  `clkSkyDecor_` renders a deterministic (index-hashed, never re-scatters)
  twinkling star field inside `.clk-sky-layers` (under the z-1 content). **The
  moon phase and the clock-card background photo were RETIRED by the operator
  on 2026-08-12** — `clkMoonPhase_`, the shade-disc render, the whole
  `umsClockBg` upload path and every `.clk-bg-*` / `.has-bg` / `.clk-moon`
  selector are gone (INV-184: a dead selector is the next reader's false lead),
  and the localStorage key count went 15 → 14. The star field and the
  shooting star are UNCHANGED; `clkShootMaybe_` (1Hz-tick piggyback) fires a shooting star
  every ~2.5–4.5 min ONLY in deep night (density ≥ 2) after the rep-local
  shift midpoint, and skips entirely under `prefers-reduced-motion` (a
  non-animating streak would linger — the twinkle keyframes are killed by the
  global block as usual). Overlay/modal entrance was
  already handled by `.overlay.open` (fadein) + `.modal` (modalin) + the
  `#kb-drawer` slide — NOT re-declared. Inline animation params
  (`--circ/--target/--len/--d`) carry defaults so the INV-128 token tripwire
  stays green. **Empty vs ERROR states (batch J; ENFORCED cycle-13 A12,
  GENERALIZED cycle-16 F10):** the empty-state classes are identified by
  CONVENTION, not by a list — **any class whose name ends `-empty`, plus the
  shared `.no-data`** (so `.cn-stack-empty`, `.m-empty`, `.tr-empty`,
  `.kb-empty`, `.kbd-empty`, `.dr-empty`, `.dash-empty`, `.intk-empty`, and any
  a future tool invents) — and they render as quiet
  dashed/muted cards; a LOAD FAILURE must render `errorStateHtml_(msg)`
  (script_core — warn-toned card + glyph + `role="alert"`, escapes
  internally) so "the fetch failed" never reads as "there's nothing here";
  `renderError` (boot) carries a Retry button. New tools should reuse
  `renderLoading` + `errorStateHtml_` + these classes rather than
  hand-rolling spinners/animations. **The decision was stated as universal but
  honored in only 2 of 11 tool partials (CN + Clock) until cycle-13 A12:**
  Metrics, Training, and EmpDocs routed 16 failure sites — RPC failures AND
  server-returned `data.error` — into their tool-local EMPTY-state container,
  so a transient CDR outage rendered as a quiet day with no data (the likeliest
  Metrics failure, on a rep-facing tab). All 16 now use `errorStateHtml_`.
  **Call sites must DROP the outer `esc()`** — `errorStateHtml_` escapes
  internally, so keeping it double-escapes.
  **AND THEN 28 MORE, because the tripwire scanned a LIST rather than the rule
  (cycle-16 F10).** Cycle 13 fixed the three partials it had looked at and
  pinned exactly those three by name, with a hand-copied list of THEIR
  empty-state classes — so six further partials sat behind a green CI:
  `kb/script_kb.html` (10 — the Reference tree AND the Ctrl/⌘+K drawer, i.e. a
  failed load read as an empty knowledge base *during a call*), `cn` (4),
  `tc/script_manager.html` (4), `tc/script_clock.html` (3),
  `train/script_coaching.html` (4), `intake` (2), `metrics/script_deptrequests.html`
  (1). Coaching is the sharpest illustration: it uses `.tr-empty`, a class the
  tripwire already knew, in a file it did not scan. The tripwire now derives
  BOTH sets — files from `A11Y_SCAN_PARTIALS` (INV-179), and classes from the
  markup by this codebase's own naming convention (any class ending `-empty`,
  plus `no-data`), so a new tool inventing `foo-empty` is covered the day it
  ships. A companion pin fails CI on `errorStateHtml_(esc(…))`, which is the
  mistake converting FROM the escaped empty-state form invites — 28 times over.

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
| Time Clock / ADP | `ADP_SS_ID` (CONFIG placeholder) | Employees (roster), Timesheet, TimesheetArchive (cold tier, INV-153 — **read back by the ADP export**, F1), TimeOffRequests, AuditLog, PunchAdjustRequests, ClientErrors (INV-150), ViewUsage (feature-usage telemetry, 2026-08-13), SpanishManualResolved | Payroll + shared audit | kept (archive moves, never deletes) | `getAdpSS_` |
| CDR Report | `CDR_SS_ID` (CONFIG placeholder) | DQE Historical Data, CSR Transfer Historical Data, Agent Alias Overrides | External (read-only) | owned by `call-data-reporting` | `getCdrSS_` |
| Intake | `INTAKE_SS_ID` (CONFIG placeholder) | Offerings, PPD/PMD/PAPSubmissions | **PHI** | optional purge | `getIntakeSS_` |
| Forms | `FORMS_SS_ID` (**falls back to the ADP sheet**) | FormTokens, FormSubmissions | **PHI** | 90-day purge (if enabled) | `getFormsSS_` |
| Knowledge Base + Training | `KB_SS_ID` (CONFIG placeholder) | KB, KbViews, KbFeedback, KbContentRequests, KbRevisions, TrainingAssignments, TrainingCompletions, Quizzes, QuizAttempts | PHI-free by policy | kept | `getKbSS_` |
| Employee Docs (HR) | `HR_DOCS_SS_ID` (**no fallback**) | EmpDocs, DocSignatures, EmpDocTemplates, Coaching | HR — keep-forever | **never purged** (INV-122/INV-134) | `getHrDocsSS_` |
| Call Notes (per-rep) | `Employees` col L (`CallNotesSheetId`) | Notes, NotesArchive (cold tier) — one Sheet **per rep** | **PHI** | optional archive + optional purge (live + cold) | `getCallNotesSheet_` |

**Every store's timezone MUST equal `CONFIG.TIMEZONE`** (coerced date/time reads
drift otherwise — the S1.1 tripwire `config_adpSheetTzMatchesConfig` enforces it
for the ADP sheet; Storage Health surfaces it for all). **Recommended
consolidation (the only one):** set `FORMS_SS_ID` to the Intake spreadsheet so
form PHI isn't co-located with the ADP/payroll sheet (the back-compat fallback).
Test-only twins: `TEST_CDR_SS_ID`, `TEST_INTAKE_SS_ID`, `TEST_HRDOCS_SS_ID`,
`TEST_KB_SS_ID` (cycle-10 M-9 — the KB fixture `_withTestKb_` provisions).
Auto-managed diagnostics: `WITNESS_AUDIT_FAILS` (cycle-10 C4 — the
`{count, lastAt, lastAction}` lost-tamper-witness counter stamped by
`writeWitnessAuditLog_` after a failed retry; surfaced in Automation Health +
the failure digest's 48h window; delete the property to reset the counter)
`AUTOMATION_LAST_ERRORS` (cycle-18 F4 — `{job: {at, error}}` stamped by a trigger handler's own catch and cleared on its next clean run, because a handler that RETURNS an error object reaches nobody; read by `automationProblems_` onto the health dot + failure digest. Auto-managed — delete the property to clear a stale failure flag) and `SELF_TEST_LAST_RESULT` (INV-162 — the nightly self-test outcome
`{date, mode, pass, fail, skip[, error]}`; delete to clear a stale failure
flag after fixing).

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:

- **Blue-green (a personal dev instance alongside the team's prod) — see
  `docs/deployment.md`.** Run TWO Apps Script projects from the SAME repo source:
  PROD (the committed `web-app/.clasp.json` scriptId, `ANYONE_ANONYMOUS`, real
  sheets) and a personal DEV project (`web-app/.clasp.dev.json`, gitignored;
  access "Only myself"; the `/dev` HEAD URL so every push is instantly live;
  Script Properties → COPY sheets + your-inbox recipients; PHI stores start
  EMPTY). `npm run push:dev` / `push:prod` (via `scripts/push-env.sh`) target
  each; `push:dev` restores the committed prod `.clasp.json` so a bare
  `clasp push` still hits prod. **Two Script Properties tag an instance —
  both UNSET on prod = zero behavior change:** `INSTANCE_LABEL`
  (e.g. `DEV`) renders a top banner (`getEmployeeState.instanceLabel` →
  `.instance-banner`) so the two tabs can't be confused; `INSTANCE_IS_PROD`
  (`true` on prod) makes the destructive `TEST_`-row writers (`runAllTests` /
  `setupTestEnvironment`) REFUSE via `assertNotProdInstance_`.
  **A5 (cycle 13) — DEV NOW REQUIRES BOTH, and `INSTANCE_IS_PROD` must be
  EXPLICITLY `false` on the dev project.** `isDevInstance_()` is the single
  predicate (`assertDevInstance_` and `runNightlySelfTest` both route through
  it), and an UNSET `INSTANCE_IS_PROD` now resolves to NOT-dev. The old test was
  "label set AND not `isProdInstance_()`", and `isProdInstance_()` is false
  whenever the property is unset — which is prod's DEFAULT state. So dev-ness
  was inferred from the mere PRESENCE of a banner label, and labelling prod (a
  thing this very paragraph recommends) silently flipped prod into dev:
  `runNightlySelfTest` would run the FULL destructive `runAllTests` against live
  payroll/audit/PHI every night at 1am (`assertNotProdInstance_` does NOT catch
  it — that only fires on `INSTANCE_IS_PROD === 'true'`), and `devScrubRoster_`
  would anonymize the LIVE roster. Failure direction is now "a dev tool refuses
  until dev is fully configured" instead of "prod quietly behaves like dev".
  **Operator action on an EXISTING dev project: add `INSTANCE_IS_PROD=false`**,
  or `devScrubRoster_`/`devShowConfig_` will refuse and the nightly run will
  drop to smoke — which it now SAYS, via a note on the Admin → Automation
  Health self-test line rather than silently. Dev-only tooling
  (`web-app/DevTools.js`: `devScrubRoster_(keeperEmail)` anonymizes a copied
  roster so dev's per-employee emails can't reach real staff; `devShowConfig_()`)
  is `assertDevInstance_`-guarded so it can never mutate the live roster even
  though it deploys to both. Pinned by the instance-guard Node tests (incl. the
  A5 "a LABEL alone is NOT dev" case) + the DEV-banner DOM test. Deploy: the
  same `clasp push -f` + New version; prod is unaffected until you set them.
- **The 2026-06 redesign + deferred follow-ons #1–#4 + niceties #8–#10
  add NO new operator state** — no new Script Properties, no new triggers,
  no migrations. The new endpoints (`getMyMetricsRange`,
  `getMyNoteHourBuckets`) read existing stores. It deploys with the normal
  single `clasp push -f` + New version. The redesign record (per-commit
  scope, before/after) is
  `docs/design_handoff_team_tools_redesign/IMPLEMENTATION_PLAN.md`.
- **The 2026-08-06 operator rounds (pop-out fit, Spanish combined view, Dept
  Requests rebuild + dept filter) AND the metrics improvements #1–#10 add NO
  new operator state** — no Script Properties, triggers, migrations, or new
  CONFIG constants (`SPANISH_OVERDUE_HOURS`=24 is a client-code constant);
  every new server field is ADDITIVE and client-guarded, so deploy skew in
  either direction renders as before. Behaviour changes to expect post-deploy:
  (a) the Team Metrics green band now starts at `CDR_ALERT_THRESHOLD` (85) —
  reps at 80–84.9% turn AMBER; that is the #4 alignment with the sidebar
  alert, not a data change; (b) multi-day team ranges show a per-day
  sparkline; (c) the raw date inputs on both Metrics tabs live behind a
  "Custom…" chip; (d) the two CDR reference lists are folded behind "Match
  diagnostics (N)"; (e) the Spanish Inbox and Dept Requests tabs render ONE
  combined color-coded status list each (green resolved / amber pending /
  red overdue) instead of separate sections; (f) the Call Notes pop-out
  self-sizes on launch so the whole template is visible. The round-2
  follow-ups add two more, still with NO operator state: (g) the Dashboard
  Team/Department card now shows the team aggregate at ANY cohort (the N=3
  hide dropped by operator decision — `dash_metrics_v2` cache bump, so the
  change is visible within 5 minutes of deploy; the My Stats anonymized
  series guard is unchanged); (h) filter/tab switches on Dept Requests,
  Spanish Inbox, and the Team Metrics scope switcher play a brief staggered
  fade+rise (reduced-motion-safe). **Post-deploy: run `runAllTests()`** as
  usual.
- **The team-member onboarding flow (2026-08-07) adds NO new operator state** —
  no Script Properties, triggers, migrations, or CONFIG constants; it WRITES
  the existing stores (a validated Employees-sheet append; the same Call Notes
  provisioning the Enrollment panel already runs). Two NEW audit actions
  appear in the AuditLog (`EmployeeAdd`, `EmployeeOffboard` — neutral-toned in
  the admin sheet viewer). Post-deploy: adding the first pilot rep THROUGH the
  panel doubles as the S75 verification walk; the gate cases run with the
  standing `runAllTests()`.
- **The 2026-08-11 pilot-feedback round (reminders, onboarding-panel split,
  pop-out header) adds NO new operator state** — no Script Properties,
  triggers, migrations, or CONFIG constants. It adds ONE admin-gated endpoint
  (`getOnboardingCdrReadiness`, taking INV-136's count to 39) and one
  per-browser localStorage key (`umsNotify`). Behaviour changes to expect
  post-deploy: (a) the Admin → Config **Team Members** panel appears
  immediately and its "Phone system" chips fill in a moment later — the CDR
  read moved off the panel's critical path, so "checking…" briefly is the fix
  working; (b) the panel's readiness list is an aligned column grid;
  (c) **break reminders now fire on every tab, including the pinned pop-out**,
  with a chime ON BY DEFAULT — the bell in the sidebar (and mobile header)
  turns it off per browser; (d) a new "still clocked in" nudge appears
  5–120 min after a rep's scheduled shift end; (e) the pop-out no longer shows
  the tool-name strip at the top, so its fitted window is ~44px shorter.
  **Desktop notifications are expected to be REFUSED** by most browsers here
  (the app renders in a cross-origin iframe) — the toggle says so and the
  chime + in-app alert still work; there is nothing to configure server-side.
- **The interactive roster block + its Tier 1 views (2026-08-11) add NO new
  operator state** — no Script Properties, triggers, migrations or endpoints;
  it is a new fenced block type in the KB renderer plus its styling. Existing articles are
  unaffected (an ordinary fence still renders `<pre><code>`). To use it: put a
  ` ```roster ` fence in any Reference article, or convert a banded sheet and
  it is emitted for you. **Operator-visible behaviour:** converting a roster
  spreadsheet now produces the INTERACTIVE block rather than static headings —
  reps get a filter box, tag tooltips and click-to-copy, and the whole thing
  works in the Ctrl/⌘+K drawer, which an embedded sheet never did. The block
  also carries Teams / Capabilities / Chart / Flow / Coverage views — note that
  **Coverage reports facts, not a staffing verdict**, so a capability held by
  one person is flagged as a single point of contact and the judgement is left
  to you, and **Chart shows team structure, not reporting lines**, because the
  roster records membership and not who reports to whom.
- **The Sheet→article converter (2026-08-11) adds NO new operator state and NO
  new OAuth scope** — `SpreadsheetApp` is already authorized, so unlike the Doc
  converter there is nothing to re-authorize. It adds ONE admin-gated endpoint
  (`kbConvertDriveSheet`, taking INV-136's count to 40). Nothing converts
  automatically: a sheet embed gains a **Convert to article** button in the
  Reference reader, and the editor's embed mode converts a pasted Sheet URL —
  both review-before-save, both leaving the Sheet itself untouched. **Operator
  workflow for a spreadsheet you want reps to actually FIND:** embed it as
  today → open it in Reference → Convert to article → read the warnings (they
  name any truncation and any highlight colours whose meaning is not written
  down) → add a legend line → Save. Re-run the same Convert when the sheet
  changes; because it is manual, an article you have since edited by hand is
  never silently overwritten.
- **The branded-email restyle (2026-08-11) adds NO new operator state** — no
  Script Properties, triggers, migrations or CONFIG constants; it changes the
  shared wrapper + `brandedKvRows_` and the options each caller passes. EVERY
  automated notification email changes appearance at once (Time Clock, Payroll,
  Time Off, Training, Employee Docs, Coaching, Call Notes Q&A, the daily brief,
  the digests and the health/self-test pushes) — the dept/Intake/form emails,
  which have their own builders, are untouched. **CORRECTION (2026-08-13):**
  "every" turned out to exclude the three Call Notes digests (EOD / weekly
  Training+Review queues / Urgent), which have their own hand-rolled table
  builder and only joined the branded chrome on 2026-08-13 after an
  email-alignment audit enumerated all 30 `MailApp.sendEmail` sites — the
  items table is kept as the wrapper's `bodyHtml`, tones are warn (EOD) /
  danger (Urgent) / info (queues), and each carries a real
  `safeWebAppUrl_` CTA (`callNotes` for reps, `callNotesManage` for
  managers). Pinned by the digest-chrome Node test. New in the mail: a green CTA
  button on the emails that ask for an action, so the missed-clock-out reminder
  finally links to the app. **Post-deploy: send yourself one** (approve a test
  PTO request, or run `sendDailyMissedPunchAlerts` from the editor) and confirm
  the UMS logo loads in your client — the HTML-email restyle is the one thing
  CI cannot verify, and it is the standing spot-check for any email change.
- **The 2026-08-13 settings/speed round adds NO operator state to set up** —
  no Script Properties, triggers, migrations, or CONFIG constants; two new
  per-browser localStorage keys (`umsTzWarnedDay`, `umsDashMetrics` — count
  now sixteen) and one new server-side CacheService entry
  (`team_metrics_v1:<from>:<to>`, self-managing). **ONE OPERATOR ACTION from
  the 9:30 PM note report: open the Employees sheet and set YOUR OWN row's
  Timezone cell to `America/Chicago`** — a blank cell falls back to
  `CONFIG.TIMEZONE` (Asia/Kolkata), which is why a note logged mid-morning
  CST carried a 9:30 PM (IST) stamp and yesterday's note appeared in today's
  Log. Existing rows keep their as-written stamps; new writes are correct the
  moment the cell is fixed (the roster cache refreshes within 5 min).
  Behaviour changes to expect post-deploy: (a) the sidebar's Theme / Palette /
  Alerts rows are consolidated behind a **Settings gear** (sidebar + mobile
  header) opening a small flyout; (b) admins get a **View as** row in that
  flyout (Me / Manager / Spanish CSR / CSR) — a session-only preview of each
  role's tabs with a blue banner + Exit; data still loads with the admin's
  real access; (c) anyone whose browser timezone disagrees with their roster
  timezone sees a once-a-day sticky warning naming both zones — that is the
  9:30 PM class being surfaced, not a new fault; (d) My Stats / Team Metrics /
  Spanish Inbox re-enters paint instantly from the last load and refresh
  behind the "Refreshing…" pill; Team Metrics is also server-cached ≤5 min
  (org-wide per range); (e) the Dashboard holds its full 4-card layout from
  the first frame (no more Spanish/Requests pop-in), the extras RPCs start in
  parallel with the metrics RPCs, and a same-day reload paints the metric
  cards instantly from the local blob while refreshing in the background.
  **Post-deploy: run `runAllTests()`** as usual.
- **The cycle-18 pre-audit batches 3+4 (2026-08-19) add NO operator state to set
  up, but change ONE operator action and ONE rep-visible behaviour.**
  **ACTION: re-run `installAutomationTriggers()` once** — the PTO accrual credit
  moves from 6am to **18:00** manager-tz (F10; 6am CT is the tail of the offshore
  shift, and on the 1st of the month that run holds the global lock through a
  full Timesheet read — the INV-153 quiet-window reasoning applied to a second
  job). Until it is re-run the old 6am trigger keeps firing: correct, just
  unimproved. **BEHAVIOUR: break reminders and the "you are not clocked in"
  nudge no longer fire on weekends or approved-PTO days** (F2) — they were
  firing with a chime and a sticky toast for any rep who had the app open on a
  day off. The "still clocked in past your shift" nudge deliberately still fires
  every day, since a forgotten Saturday punch is exactly when it matters.
  **OPERATOR QUESTION: does any rep on this roster genuinely work Saturdays or
  Sundays?** The roster carries no working-days column, so weekends are
  INFERRED — such a rep would silently lose their break reminders on those days,
  and closing that needs a per-rep working-days source (the column-O shape).
  Two more rep-visible fixes need nothing from you: the accrual tile's footer no
  longer wraps and now shows planned days beside the month-to-date earning, and
  a department request with a hand-edited Status cell is now read the same way
  by the tracker, the re-send dedupe, the resolve link and the SLA digest.
  **Post-deploy: run `runAllTests()`** as usual.
- **The cycle-18 pre-audit batches 1+2 (2026-08-19) add NO operator state to set up** — no
  Script Properties to create, no triggers, no migrations, no CONFIG values to choose. ONE
  auto-managed property appears on first use: `AUTOMATION_LAST_ERRORS` (see the storage-map
  note). Behaviour changes to expect post-deploy, both of them the point of the round:
  (a) **Admin → Automation Health and the daily failure digest may report NEW lines** — the
  per-job liveness check is now derived from a table covering seven audit-row jobs instead of
  only the nightly reconcile, so a retention/archive window enabled WITHOUT its trigger
  installed, or a PTO accrual that failed, now says so. That is a real gap being reported for
  the first time, not a new fault — re-run `installAutomationTriggers()` if a trigger is
  genuinely missing. A job that legitimately writes no row on a healthy deployment (retention
  disabled, no accruing rep) is never checked, so a clean deployment stays silent.
  (b) **The manager daily brief (if the flag is on) may arrive with an "Incomplete brief"
  banner** naming a source it could not read, and will send even when the readable sections
  are clear — previously it dropped the failed section silently while still suppressing the
  digest that covered it. **Post-deploy: run `runAllTests()`** as usual (the accrual +
  automation-health integration tests are editor-only).
- **The 2026-08-19 accrual REBUILD (operator: "3.08 PTO hours per 80 hours
  worked, 8 hours per day, and PtoEnabled will be TRUE") SUPERSEDES the
  days-per-calendar-month model of the two 2026-08-18 entries below.** Same
  machinery — same trigger, same column-R stamp, same in-arrears
  idempotence, same audit action, same `ROSTER_CACHE_KEY` v11 — only the
  AMOUNT changed: a credit is now the PTO earned from the hours the rep
  actually WORKED in each owed month, not a flat monthly figure. Two new
  CONFIG constants, `PTO_ACCRUAL_BASIS_HOURS` (80) and `PTO_HOURS_PER_DAY`
  (8); both CONFIG-only, so changing them is a redeploy. **What an operator
  must do differently from the 2026-08-18 instructions:** column Q now holds
  **PTO hours per 80 hours worked** (`3.08` for the PH team), NOT days per
  month — a cell left at `1.25` from the earlier round would now read as
  1.25 PTO hours per 80 worked, roughly a third of the intended rate, so
  **re-enter every column-Q value in the new units**. Everything else in the
  follow-up entry still holds: re-run `installAutomationTriggers()` once,
  and stop routine manual top-ups. Behaviour to expect: a rep who worked no
  hours in a month is credited NOTHING (correct under an hours rule) and
  still gets an audit row saying so; a day missing a clock-out is reported
  as `incomplete day(s) NOT counted` rather than counted as zero; and the
  Time/PTO tile drops the year-end projection and the progress bar it
  carried on 2026-08-18 — an accruing balance has no ceiling to fill and no
  knowable future work pattern to project from, so both were invented
  numbers. **Post-deploy: run `runAllTests()`** — the rewritten
  `test_creditPtoAccrual_seedCreditIdempotent` now writes two 8-hour test
  days and asserts the credit the hours imply.
- **The 2026-08-18 accrual-CREDIT follow-up — ITSELF SUPERSEDED the next day
  by the hours-driven REBUILD above; read this entry for the machinery
  (trigger, stamp, idempotence, enable convention), NEVER for the amount.**
  (operator: "I would rather the system compute the accrued balance") It
  superseded the display-only accrual model shipped earlier the same day. It adds ONE auto-managed roster
  column (R `AccruedThrough`), ONE new trigger (`creditMonthlyPtoAccruals`,
  daily manager-tz 18:00 — the seventeenth), the `PtoAccrualCredit` audit
  action, and `ROSTER_CACHE_KEY` v11. **THREE operator actions:**
  (1) **re-run `installAutomationTriggers()` once** — without it no credit
  ever fires (the trigger doesn't exist yet); (2) fill column Q for
  accruing agents (as before); (3) **STOP the routine manual monthly
  top-ups for those agents the day their rate is set** — the system now
  adds the accrual for each completed month on the 1st (in arrears — as of
  2026-08-19 that amount comes from the month's real worked hours, not a flat
  monthly figure), and a manual top-up on top of it double-credits. Enable convention: the balance is
  presumed current through the END of last month (the first automated
  credit lands on the 1st of next month, for this month). One-off
  corrections remain fine any time — credits are deltas, they compose.
  Verify after the first month boundary: Manage → Admin → Automation
  Health shows a "PTO accrual credit" last-seen row, and the AuditLog
  carries one `PtoAccrualCredit` row per accruing rep. **Post-deploy: run
  `runAllTests()`** — the new `test_creditPtoAccrual_seedCreditIdempotent`
  + `test_triggerGate_ptoAccrual_nonManagerThrows` execute only in the
  editor.
- **The 2026-08-18 range round adds NO operator state** — no Script
  Properties, triggers, or CONFIG constants; one new REP-callable endpoint
  (`submitTimeOffRange`, guarded per INV-94/95 — not manager-gated).
  (This round ALSO introduced column Q as a display-only accrual rate with
  `ROSTER_CACHE_KEY` v10; the accrual-credit follow-up above SUPERSEDED both
  the same day, before either shipped — take the column-Q/R instructions and
  the cache-key version from THAT entry, never this one. In particular its
  original "keep maintaining column-I balances by hand" instruction is now
  WRONG: the system credits them.)
  Behaviour changes to expect post-deploy: (a) the request-time-off card
  and day modal accept an optional SECOND date — a range writes one
  Pending row per weekday (weekends skipped, conflicts reject the whole
  batch naming the dates), so managers see and approve/deny each day
  individually (bulk approve already handles the multi-row case);
  (b) nothing else moves. **Post-deploy: run `runAllTests()`** — the new
  `test_submitTimeOffRange_weekendSkipAtomicCaps` executes only in the
  editor.
- **The 2026-08-18 Time/PTO consolidation round adds NO operator state** — no
  Script Properties, triggers, migrations, CONFIG constants, or endpoints
  (client-only + one optional client arg on `openAdjustModal`). Behaviour
  changes to expect post-deploy: (a) **the Time / PTO page loses its
  Time Off ⇄ Timesheet toggle** — one page now, with the right rail stacking
  a new **Requests card** (date picker + "Request" opening the same day
  modal a calendar tap opens; "Request punch edit" opening the adjustment
  modal), the Annual-leave tile, and the Pay-period block + "View pay
  statement" + Recent activity; a rep's remembered mode preference is
  simply ignored (the `umsMergeMode` browser key is retired — nothing to
  clean up); (b) **the pay statement's incomplete/empty days carry a
  "Request edit" button** (within the 30-day adjust window) that closes the
  statement and opens the Adjust modal pre-filled to that day — older days
  still say to ask a manager, and a manager viewing another rep's statement
  sees no buttons. **Post-deploy: run `runAllTests()`** as usual.
- **The 2026-08-18 operator round (width sweep + Spanish members editor +
  load-time sweep round 1) adds NO operator state to SET UP** — no new Script
  Properties to create, no triggers, no migrations; `SPANISH_INBOX_MEMBERS`
  is now editable IN-APP (Manage → Admin → Config → Spanish bilingual
  members) as the recommended path, with direct property editing still
  working. Behaviour changes to expect post-deploy: (a) **Punctuality and
  Admin fill the page width** (their inner 780–900px caps dropped); (b) the
  Admin **Auto-tag rules** card is a compact 2-up scrolling list that no
  longer grows with the rule count; (c) **Dashboard metric cards are served
  from a day-long server cache** (6h TTL — the CacheService max — with the
  rep-local day in the key, was 5 min; operator-approved since the CDR data
  does not change again once the daily import lands; a load BEFORE the
  import can pin the pre-import aggregate for up to 6h, while the Metrics
  tabs keep their 5-min caches); (d) **Dept Requests loads
  noticeably faster** (90s per-caller server cache, invalidated by every
  resolve/new request, + an SWR re-enter that paints instantly); (e) **Time /
  PTO re-enters paint instantly** from the month cache with a quiet
  background refresh. (f) **Team Metrics is
  visible to every rep** — as the team AGGREGATE only (hero + rail + trend +
  a "per-rep breakdown is visible to managers" note); managers see the page
  unchanged; (g) the two **Dashboard metric cards click through** to My
  Stats / Team Metrics ("MY STATS ›" / "TEAM METRICS ›" in the card heads) —
  the mini-trendline mock was reviewed and held, the click-through is the
  bridge to the full charts; (h) the dashboard server cache was subsequently
  extended to the 6h CacheService max (operator-approved — see (c)).
  (i) **the Call Notes pop-out's text
  shrinks with the window** below the 480px launch width (down to a readable
  floor at ~340px; at 480px and above nothing changes) — shrinking the pinned
  window past its old comfortable minimum now scales the template instead of
  clipping it. **Post-deploy: run `runAllTests()`** — including the new
  `saveSpanishInboxMembers` gate case and the REWRITTEN
  `test_metrics_getTeamMetrics_nonManagerRejected` (now a shape pin: rep gets
  the aggregate, never `reps[]`).
- **The 2026-08-17 THIRD round (full-width request pages + display cap +
  the one-test fixture fix) adds NO operator state** — no Script Properties,
  triggers, migrations, or CONFIG constants; two client-code constants
  (`SP_TASKS_CAP`=12, `SP_TASKS_PAGE`=24) bound the card lists. Behaviour
  changes to expect post-deploy: (a) **Spanish Inbox and Dept Requests use
  the full monitor width** (view widens to 1480px like the Dashboard; the
  card grid reflows to up to 4-up; Spanish puts the summary strip and the
  resolution-share chart side by side, stacking below 1024px); (b) **each
  card section renders at most 12 cards** with a "Show N more · M not shown"
  button revealing 24 per click — section headers keep the full counts, so
  nothing is hidden from the numbers, only from the initial DOM; (c) the one
  failing editor test (`publicForm_tokenLifecycle`) was a test-fixture
  artifact — its oversized signature lacked the `data:image/` prefix the
  cycle-17 shape guard (correctly) rejects first; **the next `runAllTests()`
  should be 286/286**.
- **The 2026-08-17 SECOND round (pay statement + Spanish share chart) adds ONE
  operator data column and no other state** — no Script Properties, triggers,
  or migrations. **Operator action: fill `Employees` column P (`PayRate`)**
  with each rep's hourly rate (plain number; blank = that rep's statement
  shows hours only — nothing breaks). `ROSTER_CACHE_KEY` bumped v8→v9, so
  stale roster cache entries expire within 5 min of deploy. Behaviour changes
  to expect: (a) Time / PTO → Timesheet mode gains a **"View pay statement"**
  button — per-period punches/hours/PTO with an estimated-gross line once a
  rate is on file (labeled an estimate, never a payslip); managers can pull
  any rep's statement server-side (UI follow-on); (b) the **Spanish Inbox tab
  gains a Resolution-share chart** — one bar per bilingual member incl. ZERO
  bars for members who resolved nothing, with a dashed even-split marker and
  no verdict colour (the judgement stays yours). **Post-deploy: run
  `runAllTests()`** — including the new `getMyPayStatement(other)` gate case.
- **The 2026-08-17 post-deploy operator round adds NO operator state** — no
  Script Properties, triggers, migrations, or CONFIG constants; one new
  per-browser localStorage key (`umsRemindFired`, count now seventeen).
  Behaviour changes to expect post-deploy: (a) **My Stats lands on
  "Yesterday" — the previous WORKDAY** (Monday shows Friday) instead of an
  always-empty Today; Team Metrics keeps its Today preset; (b) the PPD send
  footer offers **Custom email…** like PMD/PAP; (c) **a punch confirms in
  one round trip** — the toast and the button change land together,
  noticeably sooner; (d) **Reference search result ORDER changes** — the
  section actually about the query now outranks stray sections of
  title-matching docs (density + coverage weights, title bonus capped); if
  a familiar query surfaces different top results, that is the rebalance,
  not lost content; (e) **reminders no longer double-notify** when the main
  window and a pop-out are both open; (f) the timezone audit passed for the
  mass-adjustment path — one DST-transition cosmetic window fix shipped
  (Call Notes ambient week count). **Post-deploy: run `runAllTests()`** as
  usual.
- **The 2026-08-13 pre-pilot observability round adds NO operator state to set
  up** — no Script Properties, no triggers, no migrations, no CONFIG values to
  choose. ONE auto-managed sheet tab appears: **`ViewUsage`** in the ADP
  spreadsheet (like `ClientErrors` — PHI-free Timestamp/EmployeeId/View/Mode
  rows, auto-provisioned on the first view-enter after deploy; grows slowly,
  rate-capped 120/hr/rep, no purge — trim manually if it ever bothers you).
  Behaviour changes to expect post-deploy, all of them the point of the round:
  (a) **you may start receiving a "Client errors spiking" email** — sent only
  when ≥5 errors land within an hour, at most one email per 6h; a lone error
  still emails no one; (b) the Manage health dot / daily failure digest can
  now carry a "N client error(s) in the last 24h" line (threshold 10); (c)
  warn cards reps see (failed loads) now count in Admin → Automation Health →
  Client errors — an uptick after deploy is VISIBILITY of failures that were
  always happening, not new faults; (d) the three Call Notes digests (EOD /
  weekly queues / Urgent) arrive in the branded chrome with real buttons —
  the standing email spot-check applies (send yourself one); (e) Admin →
  Overview gains a **Feature usage** panel (per-tab opens 7d/30d + distinct
  reps + most-active reps) — this is the "what parts are priorities" answer,
  and it starts empty until reps navigate. View-as previews never count.
  **Post-deploy: run `runAllTests()`** as usual.
- **The 2026-08-13 follow-up round (image fallback + warehouse map) adds NO
  operator state to set up** — no triggers, no migrations, no API key, and
  deliberately NO billing (the operator constraint): the map block's whole geo
  stack is Apps Script's free built-in `Maps.newGeocoder()` (daily courtesy
  quota — the coordinate cache keeps steady-state use at ~one geocode per
  lookup) plus the keyless `output=embed` iframe. ONE auto-managed Script
  Property appears on first lookup: `KB_MAP_GEOCODE_CACHE` (warehouse
  lat/lng keyed by address hash — delete it to force re-geocoding after a
  warehouse moves; the rep's lookup query is NEVER stored in it or anywhere
  else). **To use the map: put a ` ```map ` fence in any Reference article**
  with one `wh| Name: Street, City, ST ZIP` line per warehouse — the
  addresses are authored in the article, so updating them is a normal KB
  edit. Behaviour change to expect post-deploy: **article images that
  previously showed only alt text + a Workspace "blocked" page now render
  inline for every rep** — the reader silently refetches a blocked Drive
  thumbnail through the server (`kbGetImageData`, scoped to the KB Images
  folder only). Nothing to configure; if Workspace link-sharing is ever
  allowed, the thumbnails load directly again and the fallback goes quiet.
- **The 2026-08-13 operator round adds NO new operator state to set up** — no
  triggers, no migrations; two AUTO-MANAGED Script Properties appear when
  first used (`CN_AUTO_TAG_RULES` — written by the Admin tab's new Auto-tag
  rules editor; the `IntakeFeedback` tab auto-provisions in the Intake
  spreadsheet on the first feedback). **One review item: the seeded auto-tag
  keyword list** (CONFIG `AUTO_TAG_RULES` — close-order / shipping / resupply
  / oop / billing / insurance / transfer / callback) is a starting point
  derived from the update-type vocabulary, editable live in Manage → Admin →
  Config → Auto-tag rules. Behaviour changes to expect post-deploy: (a) ⌘C
  with a real selection inside the note template copies the SELECTION; the
  full-template copy still fires when nothing is selected; (b) the internal
  email composer no longer pre-selects the last note's departments; (c) tags
  appear on their own as a rep types matching keywords — removable chips,
  and removing one stops that rule for the note; (d) the Dashboard metric
  cards paint as soon as the first period returns (YTD fills in a beat
  later as a skeleton swap); (e) a rep using the app mid-shift while not
  clocked in gets a once-a-day nudge; (f) intake emails carry a "Send
  feedback" button whose page requires an @umsupply sign-in, and feedback
  shows in the Intake Sent detail.
- **The colour palettes (operator 2026-08-12) add NO operator state** — no
  Script Properties, triggers, migrations or CONFIG constants; one per-browser
  localStorage key (`umsTheme`, taking the count back to 15) that each rep sets
  for themselves from the sidebar. Nothing is server-side, so there is nothing
  to configure and no way for one rep's choice to reach another. **Emails are
  deliberately unaffected** (`CN_EMAIL_PALETTE` is hand-resolved hex with no
  user context). Post-deploy: everyone stays on Console until they pick
  something else.
- **The 2026-08-12 operator round adds ONE optional CONFIG constant and removes
  one localStorage key** — no Script Properties, triggers, or migrations. New:
  `CONFIG.CDR_TRANSFER_TARGET_PCT` (default **20**) bands Transfer % on the two
  Dashboard metric cards. **This is the one number to confirm** — Transfer %
  had no threshold anywhere in the app before this, so 20 is a starting point,
  not a measured target; **set it to `null` to render Transfer % with no colour
  at all** rather than a verdict nobody chose. % Answered reuses the existing
  `CDR_ALERT_THRESHOLD` (85). Both require a redeploy to change (CONFIG, no
  Script Property override yet). Removed: `umsClockBg` — the clock-card
  background image is retired, so a rep who set one simply gets the sky back;
  the stored data-URL is orphaned in their browser and is cleared by the normal
  "clear browsing data" (it was never server-side). Behaviour changes to expect
  post-deploy: (a) both Dashboard metric cards **open on MTD**, not Yesterday;
  (b) Transfer % and % Answered are **colour-banded**, so a green card and a
  red card side by side is the banding working, not new data; (c) the MTD slide
  shows a per-KPI change **vs the prior month's same elapsed days** — the foot
  names the window ("vs Jul 1–23"), and volumes carry the arrow without a
  colour; (d) the `dash_metrics_v3` cache bump means the new cards appear
  within 5 minutes of deploy, not instantly; (e) **reminder toasts now stay
  until dismissed** — a break reminder still on screen an hour later is the fix,
  and the × clears it; (f) the clock card loses its image button and its moon.
- **The intake email restyle (operator 2026-08-11) adds NO new operator state**
  — no Script Properties, triggers, migrations or CONFIG constants; it changes
  `intakeEmailShell_`, the new shared `intakeSectionRowHtml_`, and the row
  styling in the PPD + PMD/PAP body builders. All three intake emails change
  appearance at once and now match the branded-notification and Call Notes
  mail. Recipients, attachments, recommendations and the PHI submission rows
  are untouched. **One transient effect worth knowing:** the PPD body feeds the
  preview→send `bodyHash` guard, so a rep who previewed BEFORE the new version
  went live and sends AFTER gets "The form changed since you previewed it" —
  the guard doing its job (INV-111); re-previewing clears it. **Post-deploy:
  send yourself one PPD and one PMD** and confirm the UMS mark loads — same
  standing spot-check as any email change.
- **Cycle 17 (top-5 + batches ②–⑦) adds NO new operator state** — no Script
  Properties, triggers, migrations, or CONFIG constants; every new response
  field is ADDITIVE (`skippedReps`, `partial`, `total`/`cap`, `warning`,
  `status` on search hits, `truncated` on the Spanish readers), so a
  not-yet-redeployed client renders as before.
  Behaviour changes to expect post-deploy: (a) warn toasts / `≥ N` badges /
  em-dashes / warn cards where silent zeros and clean-looking aggregates used
  to be — the INV-187 fixes reporting failures that were previously invisible,
  not new faults; (b) a mixed dept+'Other' email whose external half failed now
  reports success-with-warning instead of a failure that invited a duplicate
  re-send; (c) a department name containing a comma/semicolon is now REJECTED
  by the Admin editor (rename any existing such department first); (d) the
  intake Sent tab may show "server holds M total (list capped)" — the
  previously silent 100-row cap made visible; (e) time-off notes silently
  truncate at 1000 chars; (f) a multi-day Day Edit range apply is noticeably
  faster (one Timesheet read instead of ~124 — batch ⑥); (g) the Spanish tab
  may show "scan capped at 200 threads" on a busy window — the previously
  silent Gmail-search bound made visible. **Post-deploy: run `runAllTests()`**
  — incl. the not-yet-executed `test_updateTimeOff_mixedCaseStatusCell`
  follow-on if written at deploy time.
- **Cycle 16 (F1–F5, then Batch 4 + F9, then Batch 2 + Batch 3) adds NO new
  operator state** — no
  Script Properties, no triggers, no migrations, no new CONFIG constants. Four
  response fields are
  ADDITIVE (`notesUnavailable` on each `managerGetShiftStats` rep,
  `ptoUnavailable` on `getCoveragePlan`, `intakeCatalog` on
  `getAutomationHealth` — null on the badge/digest path, which is unchanged),
  and two existing fields
  (`teamTotals.noteCoverage`, `reps[].noteCoverage`) can now be `null` where
  every client consumer already guarded on `!= null` — so a client on a
  not-yet-redeployed server renders exactly as before. Deploys with the normal
  single `clasp push -f` + New version. **Post-deploy: run `runAllTests()`** —
  the Apps Script suite cannot execute off-editor, so scenarios S37 / S72 / S42
  rest on the Node pins until it is run. **ONE behaviour change an operator
  should expect:** on the manager Stats tab and the Coverage planner, a rep or a
  day whose underlying read failed now shows an em dash / a warning banner
  instead of zeros and a green all-clear. If "0 notes" rows or clean coverage
  days turn into dashes and warnings after this deploy, that is the fix
  reporting a failure that was previously invisible — investigate the rep's
  Sheet or the TimeOffRequests read, not the code.
  **A SECOND behaviour change from F9, and this one has an operator action:** an
  Offerings row whose column-C weight capacity is blank or non-numeric is now
  EXCLUDED from PPD recommendations instead of being offered to every patient.
  **Open the Offerings sheet and check column C** — that is what decides whether
  F9 was a live defect or a latent one, and after deploying, Manage → Admin →
  Automation Health → "Intake Offerings catalog" answers it for you (it names
  the exact sheet rows, and reports "all well-formed" when there is nothing to
  fix). If a chair stops appearing in recommendations after this deploy, that
  panel is the first place to look.
  **A THIRD and FOURTH behaviour change, both from the Batch 2 / Batch 3
  session, neither needing an operator action.** (a) Across nine tool partials,
  a failed load now renders a warn-toned card with a glyph instead of the quiet
  muted "nothing here" card — 28 sites, most visibly the Reference tree and the
  Ctrl/⌘+K drawer. Warn cards appearing where blank panels used to is the fix
  working, not a new fault; the underlying failure was always happening and was
  simply invisible. (b) **A department's average and median resolution time on
  Metrics → Dept Requests may CHANGE after this deploy**, because a resolved
  request whose `ResolvedAt` cell is blank or unparseable no longer contributes
  its (ever-growing) full age to those figures, and a whitespace-padded Status
  cell is now counted resolved by `deptStats` rather than open. Both are the fix
  reporting a corruption that was previously silently compounding; if the
  numbers move, look for a malformed row in the `DeptRequests` sheet, not at the
  code. Both sessions deploy with the same single `clasp push -f` + New version,
  and `runAllTests()` post-deploy matters slightly more now: F11 replaced a
  placeholder assertion in `test_metrics_getTeamMetrics_queueGrouping` that
  could never fail, and the corrected version has never actually executed.
- **Cycle 14 Phase 0 (CDR sub-queue discovery) adds NO new operator state** — no
  Script Property, trigger, migration, or CONFIG constant. But **the deploy IS
  the deliverable**: the queue inventory is how Phase 0 answers whether DQE
  carries a row per (agent, queue, date) or per (agent, date), and that answer
  decides whether the rest of the sub-queue feature can be built as designed.
  After deploying, open **Manage → Admin → Automation Health** and read the
  "Queue inventory · discovery" block. Two code-only constants
  (`CDR_QUEUE_SCAN_MAX`, `CDR_QUEUE_LIST_CAP`) bound the scan. One
  operator-visible cost note: the inventory runs whenever the Admin tab is
  opened (the Overview summary and the detail panels share ONE
  `getAutomationHealth` fetch by design), NOT on the 10-minute health-badge
  poll or the daily digest — those call `computeAutomationHealth_` directly and
  the scan is opt-in.
  **Phase 4 adds ONE optional Script Property, `CDR_QUEUE_GROUPS`** (see its own
  entry below) — optional because the four real departments ship seeded in
  CONFIG, so the "By department" mode works on deploy with no action. Phase 2
  adds none.
  **Phase 1 (transfer-only per-queue attribution) adds NO operator state
  either** — no Script Property, trigger, migration, or CONFIG constant, and
  deliberately NO queue→department grouping property (see the Phase 1 Key
  Design Decision for why that waits for Phase 2). Two code-only constants
  (`CSRT_QUEUE_COL_FIRST/LAST`) bound the H:R block. Its only visible effect is
  a **"Transfers by queue · in window"** list in the same Automation Health
  block, costing one additional read of the Transfer tab on that same
  Admin-tab open. **Nothing rep- or manager-facing shows queues yet** — the
  Metrics UI is Phase 2 and is unstarted.
- **Cycle 13 batch 3 changes ONE operator requirement (A5) and adds no other
  state.** An existing DEV project must add `INSTANCE_IS_PROD=false` — an unset
  value now reads as production, so without it `devScrubRoster_`/`devShowConfig_`
  refuse and the nightly self-test drops to smoke (and says so on the Admin
  self-test line). PROD is unaffected: with neither property set it behaves
  exactly as before. Nothing else in batch 3 or the follow-ons adds Script
  Properties, triggers, migrations, or CONFIG constants; two DEAD response
  fields were REMOVED (`getEmployeeState.annualPlannedUpcoming`,
  `getSpanishInboxStats.pendingList`) — neither had any client reader.
- **Cycle 13 batches 1–2 add NO new operator state** — no new Script
  Properties, no new triggers, no migrations, and no new CONFIG
  constants. Batch 2 (A4/A6/A8/A9) is server-helper + client-toast only; its one
  operator-visible effect is that the nightly `CallNotesArchive` audit row now
  stamps `hitPerRunCap` ONLY when an enrolled rep was left unvisited, so a clean
  final run of a draining backlog no longer reads as "still capped" (A9).
  Batch 1 is markup/CSS/ARIA plus one server-helper contract change. Both
  deploy with the normal single `clasp push -f` + New version.
  **Post-deploy: run `runAllTests()`** — `timeToMins_nullOnUnparseable` executes
  only in the editor, alongside cycle 12's still-unrun
  `cn_enrolledSheetId_trimsAndNullGuards` and `cn_appendBounded_capsAndRollsBack`.
  **ONE behaviour change an operator should expect:** a Timesheet row whose TIME
  cell is blank or unparseable (only reachable by a hand edit — the guarded
  writers cannot produce one) now renders as an INCOMPLETE day and is excluded
  from Punctuality, instead of silently scoring that day "on time" and turning
  the timesheet's total hours into `NaN`. If a rep's incomplete-day count rises
  after this deploy, the fix is to correct the offending cell (Manage → Day
  Edit), not to re-check the code.
- **The WHOLE of cycle 12 (all six batches) adds NO new operator state** — no
  new Script Properties, no new triggers, no migrations. Code-only CONFIG
  constants: `TS_DOCTOR_FIX_MAX_ROWS`, `TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN`,
  `CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN`, `SELF_TEST_STUCK_MS`,
  `CN_SUBFORM_MAX_CHARS`, `CN_FEEDBACK_MAX_ENTRIES`,
  `CN_EXTERNAL_EMAILS_MAX_ENTRIES`, `DR_LIST_CAP`, `KB_REVIEW_DUE_CAP`,
  `SPANISH_PENDING_LIST_CAP`. Every new endpoint field is ADDITIVE
  (`archivedRowCount`, `truncated`, `remaining`, `noteCountUnavailable`,
  `mineTotal`/`incomingTotal`/`allOpenTotal`/`listCap`, `total`/`cap`,
  `running`/`startedAt`/`stuck`) — a client on a not-yet-redeployed server
  renders exactly as before, which was verified per batch, and each client
  render is guarded so a missing field shows nothing rather than "of undefined".
  Deploys with the normal single `clasp push -f` + New version.
  **Post-deploy: run `runAllTests()`** — the F3 bounded-move behavioural case,
  the F2 detector contract, the F6 cache-reset effect and the two NEW smoke
  tests (`cn_enrolledSheetId_trimsAndNullGuards`,
  `cn_appendBounded_capsAndRollsBack`) execute only in the editor.
  **Three BEHAVIOUR changes an operator should expect:** (a) on a small team the
  anonymized team line may now be hidden on days it previously showed (F4 — the
  INV-124 cohort no longer counts roster rows with no email); (b) every modal's
  primary button is now `--accent` green instead of near-black/near-white (V-8 —
  one shared class, ~25 call sites); (c) the sidebar and mobile nav now show
  SHORT tool labels ("Notes", "Training") with the full label on hover (V-5/6/7
  — nothing ellipsises at the default width and the nav no longer shifts 11px
  when entering Training & Employee Docs).
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
  Transfer trend is simply absent (other KPIs unaffected). Since cycle 11
  (L-2) the tab's header layout is VALIDATED like the DQE tab's
  (`validateCsrTransferColumns_` against `CSR_TRANSFER_EXPECTED_HEADERS`,
  once per session, advisory): a column insert/reorder in the
  `call-data-reporting` repo now surfaces as "Column drift in CSR Transfer
  Historical Data" in Admin → Automation Health (`cdr.transferColumnWarning`)
  instead of silently feeding wrong cells into the Transfer KPI.
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
  image/brochure shows. **Column C (weight capacity) is now LOAD-BEARING in a
  way it was not before cycle-16 F9: a blank or non-numeric cell EXCLUDES that
  row for every patient with a recorded weight.** It previously read as
  UNLIMITED capacity (the `parseInt('') → NaN` fail-open), so a half-filled row
  was recommended to everyone; it now fails closed. Accepted forms are a flat
  cap (`"300"`) or an ASCII range (`"300-450"`) — note **ASCII hyphen only**, an
  EN dash makes `"300–450"` read as a flat 300 cap. **Admin → Automation Health
  → "Intake Offerings catalog" lists every offending sheet row**, so after a
  catalog edit that panel is the check; a well-formed catalog reports "all
  well-formed". **To RETIRE a row, delete it or clear its column-B HCPCS — an
  empty B is the only state the engine treats as inert.** A row you think of as
  scratch or "an exception" is a live catalog member as long as it carries an
  HCPCS, and blanking only its capacity is NOT a retirement: that is the
  fail-closed path, which suppresses the row for patients with a recorded weight
  while leaving it eligible whenever Q38 is blank. (The cycle-16 F9 check found
  exactly this: one `E1161` row, capacity blank, that the operator did not
  consider a product.) The `PPDSubmissions` / `PMDSubmissions` / `PAPSubmissions`
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
  and since the 2026-08-13 image fallback the readers recover on their own:
  a blocked thumbnail is refetched through the server (`kbGetImageData`,
  scoped to THIS folder only) and rendered as a data URL, so sharing the
  folder manually is now an optimization (direct thumbnail loads), not a
  requirement. Exported files are named
  `kbdoc-<fileId>-<n>` and are REUSED on re-save; delete a file to force a
  re-export after the source Doc's image changed. Phase 3 paste-uploads
  land in the same folder as `kbpaste-<stamp>-<rand>` files (orphans from
  never-saved pastes accumulate — trim manually). The first export also
  adds the Drive OAuth scope alongside the Docs scope — the deploying
  account may be prompted to re-authorize once.
- **Script Property `KB_SEARCH_SYNONYMS`** (auto-managed, #8). JSON array of
  ≥2-term lowercase synonym groups (e.g. `[["cpap","pap"],["pmd","power chair"]]`)
  that expand Reference search recall (`kbExpandSynonymTokens_`). Edited via the
  admin-only "Synonyms" modal in the Reference tree header (`kbSaveSearchConfig`,
  admin-gated, `AdminConfigChange` audit); created on first save, read by
  `getKbSearchSynonyms_` (sanitize-on-read → corrupt blob degrades to `[]`). No
  manual setup — unset = no expansion (today's behavior). Documented so it's
  recognizable when inspecting Script Properties.
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
- **Script Property `KB_MAP_GEOCODE_CACHE`** (auto-managed — the ` ```map `
  warehouse block, operator 2026-08-13). JSON map of warehouse coordinates
  keyed by an ADDRESS HASH, written best-effort by `kbMapDistances` so the
  free built-in geocoder is called ~once per warehouse ever (steady-state
  quota: one geocode per rep lookup, for the query itself). Contains ONLY
  the operator-authored warehouse addresses' lat/lng — never a rep's lookup
  query (a looked-up address may be a patient's; the query is deliberately
  never persisted anywhere). Delete the property to force re-geocoding after
  a warehouse address changes meaning (e.g. the geocoder had it wrong);
  over `KB_MAP_GEOCODE_CACHE_MAX` (200) entries it self-resets to the
  current article's warehouses. No manual setup.
- **`CDR_ALERT_THRESHOLD`** in CONFIG (default 85) sets the
  % Answered cutoff for the Metrics sidebar alert badge. Below
  this value, `getMetricsAmbient()` returns a warn badge showing
  yesterday's team answer rate. **Since the 2026-08-06 operator #4 batch it
  is ALSO shipped to the Metrics clients** (`alertThreshold` on
  `getMyMetrics`/`getMyMetricsRange`/`getTeamMetrics`): it draws the dashed
  target line on both hero sparklines and starts the team table's GREEN
  band — so changing it moves the in-page target AND the banding, not just
  the badge. CONFIG-only (no Script Property equivalent yet); changing it
  requires a redeploy.
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
  CLIENT-side AND the 43 Admin-exclusive endpoints SERVER-side (`emp.isAdmin`,
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
  (2) set the bilingual member list — **since 2026-08-18 via Manage → Admin →
  Config → "Spanish bilingual members"** (`saveSpanishInboxMembers`,
  admin-gated INV-136, `AdminConfigChange` audit; validates email shape,
  lowercases + dedupes, caps 30; saving an EMPTY list danger-confirms), which
  writes Script Property **`SPANISH_INBOX_MEMBERS`** (a comma-separated list —
  still directly editable) — "resolved" = first reply from one of
  them (with no list it falls back to "first reply from anyone but the
  requester"). No cache flush is needed on a save: the stats cache key hashes
  the member set (`spanishCacheHash_`). **As of the Dashboard work this property ALSO GATES FEATURE
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
  `docs/spanish-inbox-tracking-scope.md`. **Manual mark-resolved (operator
  feedback 2026-07-09):** a member/manager can mark a pending request resolved
  from its task card (`resolveSpanishThread` — uiConfirm-guarded, no in-app
  un-resolve) for requests handled OUTSIDE the thread (phone/CRM); the record
  is the PHI-free append-only `SpanishManualResolved` tab (auto-provisioned on
  the ADP sheet — threadId/resolver/ms only), the Resolved list labels those
  "marked manually", and the 5-min-cached stats pick it up on their next
  refresh. **Part A — pending-as-tasks:**
  `getSpanishInboxPending(days)` (manager-gated, live-read, never stored beyond
  the request) returns the open/unresponded threads with `{threadId, requester,
  ageHours, subject, snippet, permalink}`; `getSpanishInboxThreadBody(threadId)`
  (scope-guarded — verifies the thread's first message is addressed to the inbox
  before returning a body slice) backs the per-card "Show full request" expand.
  The body surfaces request content in-app (it may reference a patient/call), so
  it is deliberately manager-gated + live-read-only + "Open in Gmail" as the
  primary action — bodies are never written to a sheet or cache. **Combined
  view (operator feedback 2026-08-06):** the Spanish tab's separate
  Pending/Resolved sub-tabs were replaced by ONE color-coded list — All /
  Pending / Resolved filter chips over `.sp-task` status cards (pending
  oldest-first, then resolved), toned `st-pending` (amber) /
  `st-overdue` (red, pending > `SPANISH_OVERDUE_HOURS`=24 — a client
  constant) / `st-resolved` (green). The two RPCs fan in with seq-guarded
  state writes (INV-156); a failed half renders `errorStateHtml_` for that
  half only. The `.sp-task` card CSS is SHARED in `styles.html` (the Dept
  Requests page consumes the same vocabulary — INV-185-adjacent: one
  component, two views, no drift). Endpoints/gates unchanged.
  **Resolution-share chart (operator 2026-08-17):** between the KPI strip and
  the list, one accent bar per resolver over the already-fetched resolved
  list (count + % direct-labeled; manual mark-resolves attributed to the
  clicker; an `(unattributed)` bucket stays visible). `getSpanishInboxResolved`
  now ships `members` (the configured SPANISH_INBOX_MEMBERS, same gate) so a
  member who resolved NOTHING renders as a ZERO bar — the "completed equally"
  check is exactly about them. FACTS ONLY per the Coverage rule: no verdict
  tone (a member may be part-time; the judgement is the operator's); a dashed
  neutral marker shows the even-split share, and a capped scan is named. The
  pure `spanishResolverShares_` is Node-pinned.
  **Full-width + display cap (operator 2026-08-17, third round):** both
  request-tracking views widen to 1480px via the Dashboard `:has()` precedent
  (`.view-area:has(#spanish-body)` in the metrics partial;
  `.view-area:has(#dr-body)` in the DR partial — `drRender_` wraps BOTH
  branches in the `#dr-body` anchor so an error render keeps the width);
  `.sp-tasks` lost its 920px cap (the auto-fill grid reflows to up to 4-up),
  and Spanish's summary head + share chart sit side by side in the shared
  `.sp-top` 2-col grid (stacks <1024px — that breakpoint also covers the
  480px pop-out, so no `data-compact` override is owed; the SWR head-swap
  still targets only `#spanish-head`, which keeps its own slot in the grid).
  Every `.sp-tasks` card section on both pages renders through
  **`spCappedTasksHtml_`** (`script_core.html`): at most `SP_TASKS_CAP` (12)
  cards + a real Show-more `<button>` (INV-173) revealing `SP_TASKS_PAGE`
  (24) per click and stating the hidden count — the cap changes what is
  RENDERED, never what is REPORTED (INV-169: section headers keep the full
  counts). Per-section shown-state (`SPANISH_STATE.shown` / `DR_SHOWN`)
  resets on every full render / view enter so a stale expansion never pins a
  huge DOM in a long-lived window.
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
  open/resolved/avg/median) + oldest-open team list. **Redesigned onto the
  Spanish Inbox vocabulary (operator feedback rounds 2–3, 2026-08-06):** a
  `.telemetry` KPI strip (Open / Overdue / Resolved / Median), All/Open/
  Resolved status chips + a MULTI-SELECT department chip bar (renders only
  when >1 dept in the data; empty selection = ALL departments — the default
  view; matching is per `drDeptsOf_` component so a multi-dept send matches
  ANY of its departments, the INV-138 `drSplitDepts_` shape; chips re-render
  from the cached payload — never a refetch), and combined color-coded
  `.sp-task` status cards (shared component in `styles.html`) toned by the
  existing per-dept SLA machinery: `st-resolved` green / `st-pending` amber /
  `st-atrisk` amber-deep / `st-overdue` red. Section counts read "N of M"
  when a dept filter is active; the INV-169 cap notes stay keyed to the
  UNFILTERED lengths (a filtered-out item is not a server-capped one). (The legacy standalone
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
  `DeptRequestResolved` (reqId + dept only). **Resolution offers the email-link
  path, the sender/manager in-app button, AND (v2) a receiving-dept MEMBER
  button** (`resolveDeptRequest` widened to sender OR manager OR a member of the
  request's `toDept`). **v2 (shipped, INV-138):** roster **column N
  `Departments`** unblocks a true per-department **Incoming inbox**
  (`getDeptRequests` → `myDepts`+`incoming`, scoped by `empDepartments_`),
  **per-dept SLA targets** (Script Property `DR_SLA_TARGETS` + the 48h
  `DR_SLA_DEFAULT_HOURS` → `slaStatus` ontime/at-risk/overdue on the tracker + an
  Admin **Dept-Request SLA targets** editor), and a daily manager
  **SLA-reminder digest** (`sendDeptRequestReminderDigest` — PHI-free summary of
  overdue-open requests, the operator chose a manager summary over per-dept member
  nudges). See `docs/email-request-tracking-plan.md`.
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
- **Onboarding a NEW team member no longer needs a hand-edit of the
  Employees sheet (2026-08-07):** Manage → Admin → Config → **Team Members**
  → Add team member (validated form; optionally provisions the Call Notes
  Sheet in the same action), then check the same panel's per-rep readiness
  chips (notes / manager / tz / CDR — the CDR chip names the exact Agent
  Alias Overrides row to add when the phone system spells the name
  differently). Offboarding is the panel's Offboard button (clears the login
  email, keeps the name + history — the documented roster convention). The
  manual sheet-edit path still works; the panel is the recommended one.
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. The
  installer now wires seventeen triggers:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm — since cycle-8 M-1 the
      automated exports fire the morning AFTER the period completes: biweekly
      when `range.end === yesterday`, monthly on the 1st exporting the prior
      month. The old on-period-end gate ran mid-shift for both offshore teams
      and silently omitted the final day's afternoon punches; the export email
      now arrives ~a day later but complete. `isLastBusinessDayOfMonth_` was
      removed with the old gate)
    - `sendCallNotesEodDigest` (call-notes, hourly — emails each rep at their local EOD hour)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am)
    - `sendCallNotesUrgentDigest` (call-notes, daily manager-tz 8am — recent urgent-flagged notes; sends nothing when none)
    - `purgeArchivedCallNotes` (call-notes, daily manager-tz 2am — 3rd tier: irreversibly deletes `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS`; the ONLY deleter of archived notes; read-only re tab existence; no-ops while archive retention is disabled)
    - `purgeExpiredFormData` (forms, daily manager-tz 3am — no-ops while retention is disabled)
    - `archiveOldCallNotes` (call-notes, daily manager-tz 3am — SAFE cold-archive tier: moves notes older than `CN_NOTE_ARCHIVE_DAYS` to a `NotesArchive` tab in the same per-rep Sheet, data preserved; runs BEFORE the 4am purge so archive-first ordering holds; no-ops while archival is disabled)
    - `purgeOldCallNotes` (call-notes, daily manager-tz 4am — no-ops while note retention is disabled)
    - `reconcileCallNotes` (call-notes, daily manager-tz 5am — two-way Sheets back-fill of NoteId/Timestamp/DateLocal on rows added directly in a rep's Sheet; non-destructive + idempotent, so it's harmless to run daily)
    - `sendTrainingOverdueDigest` (training, daily manager-tz 7am — per-manager nudge of overdue training (org-wide) + overdue unsigned employee docs (team-scoped per INV-122); sends nothing to a manager with nothing overdue in their scope)
    - `sendAutomationHealthDigest` (automation, daily manager-tz 9am — org-wide automation-FAILURE push to `MANAGER_EMAILS`: reuses `computeAutomationHealth_()` and emails ONLY when a check is failing (stale digest heartbeat / stale nightly reconcile = the F1 class / personal-sheet sync-fails); silent when healthy. The watcher itself writes no audit row + has no heartbeat, so verify it from the trigger list. INV-137)
    - `sendDeptRequestReminderDigest` (DeptRequests v2, daily manager-tz 10am — PHI-free summary push to `MANAGER_EMAILS` of OPEN department requests past their SLA, grouped by dept; silent when none. Heartbeat-stamped `deptReqReminder`. INV-138)
    - `sendManagerDailyBrief` (daily manager-tz 8am — the consolidated manager morning brief behind the `managerDailyBrief` feature flag, default OFF. While off it only stamps its `managerBrief` heartbeat (installing it is harmless); while on it sends ONE per-manager branded email consolidating urgent notes / missed clock-outs / overdue training-docs-coaching / dept-SLA overdue, and those four handlers suppress their separate MANAGER emails (employee-facing reminders + weekly digests + the failure watchdog are untouched). Silent on an all-clear morning. INV-151)
    - `archiveOldTimesheetRows` (Timesheet cold-archive, daily manager-tz **6pm** — moved off 1am in cycle 8: 1am CT is mid-shift for IST/PHT and the move holds the global ScriptLock, so a large first run could starve offshore punches; 6pm CT is the all-team quiet window. MOVES Timesheet rows older than `TIMESHEET_ARCHIVE_DAYS` to a `TimesheetArchive` tab in the same ADP spreadsheet; NEVER deletes (payroll is keep-forever — no purge tier exists for it); sub-floor windows clamp UP to `TIMESHEET_ARCHIVE_MIN_DAYS` (120); no-ops while the window is 0 (the default). INV-153)
    - `runNightlySelfTest` (self-test, daily manager-tz 1am — the K-A alternative to editor-suite CI: runs `runSmokeTests` on any instance (pure logic, zero writes) and the FULL `runAllTests` suite ONLY on a confirmed dev instance (`isDevInstance_()` — BOTH `INSTANCE_LABEL` set and `INSTANCE_IS_PROD` explicitly not 'true'; unset = prod, A5). Heartbeat `selfTest`; outcome persists to Script Property `SELF_TEST_LAST_RESULT`, surfaces in Automation Health + the shell health dot + the failure digest, and a failing run also emails MANAGER_EMAILS the failed test names. INV-162)
    - `creditMonthlyPtoAccruals` (PTO accrual, daily manager-tz **18:00**, alongside the Timesheet cold-archive — NOT 6am (cycle-18 F10): 6am CT is ~4:30pm IST / 7pm PHT, the tail of the offshore shift, and on the 1st of the month this run holds the ONE project ScriptLock through a full Timesheet read, the exact starvation reasoning that moved `archiveOldTimesheetRows` off 1am (INV-153). The daily-with-idempotence cadence is unchanged, so a missed run still catches up via the col-R stamp — credits each accruing rep the PTO they EARNED from hours actually worked in each completed month (column-Q rate per `CONFIG.PTO_ACCRUAL_BASIS_HOURS` worked, converted to days by `CONFIG.PTO_HOURS_PER_DAY`) into the column-I balance IN ARREARS, idempotent via the column-R stamp; daily-with-idempotence rather than a monthly trigger so a missed 1st catches up instead of silently losing the month. Hours come from ONE range-wide, archive-aware Timesheet index — never a per-rep read inside the lock. No-ops for reps with no rate, so installing it is harmless. Audit row `PtoAccrualCredit` per credited rep (incl. zero-hour months). INV-194)
  The install + remove TARGETS arrays both list all seventeen, so re-running
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
  **Audited 2026-08-17 (pre-pilot sweep):** the mass-punch-adjustment path is
  clean end to end (every guard in the target's own tz); two DOCUMENTED
  latents remain — `sendTrainingOverdueDigest`'s manager-tz "today" reaches
  the rep-facing overdue-docs nudge (dashboards can disagree between
  rep-midnight and CST midnight; emails fire when the zones agree), and
  `getMonthRange_` reads script-tz (Chicago) calendar fields inside a
  Kolkata-anchored caller — correct ONLY because Chicago is always behind
  Kolkata; revisit if `AUTO_EXPORT_HOUR_IST` or the script tz ever changes.
  **A FOURTH consequence bit in pilot (operator 2026-08-13): a BLANK roster
  Timezone cell falls back to `CONFIG.TIMEZONE` (Asia/Kolkata), so everything
  that rep writes — punches, note timestamps, `DateLocal` — is silently
  stamped in IST.** The reported symptom was a CST rep's note showing 9:30 PM
  and yesterday's note sitting in today's Log: +5:30 is the only offset that
  puts a :30 on a whole-hour zone, which is how it was diagnosed. The fix is
  the roster cell (`America/Chicago` in the rep's row — the Team Members
  panel's tz chip flags blank/malformed cells); existing rows keep their
  as-written stamps. The code half is `tzMismatchCheck_` (`script_core.html`):
  at boot the client compares the browser's real UTC OFFSET against the
  roster timezone's (offsets, never ids — `America/Chicago` vs `US/Central`
  must not warn; an Intl sanity-probe of UTC gates the check so a broken
  browser can't nag) and shows a STICKY warn toast at most once per
  browser-local day (`umsTzWarnedDay`) naming both zones and where to fix it.
  The server cannot detect this class — only the browser knows where the rep
  actually sits.
- **`CONFIG.COVERAGE_MIN_STAFF`** (this deploy: **6**) + **`CONFIG.COVERAGE_STAFF_GOOD`**
  (this deploy: **7**) set the manager Coverage planner's three bands (#3): a
  manager-tz business hour with **≥ GOOD** confirmed reps renders green ("good"),
  **≥ MIN_STAFF** but below GOOD renders amber ("acceptable"), and **< MIN_STAFF**
  renders red ("concerning") + is listed in the Understaffed callout. Both are
  CONFIG-only (no Script Property / Admin UI yet — deliberate, per the operator
  decision); change requires a redeploy. `getCoveragePlan` ships both as
  `minStaff` / `goodStaff`; the client (`tc/script_manager.html`) bands on the
  CONFIRMED count (every shown hour is a business hour, so 0 is concerning, not
  neutral). The planner resolves each rep's shift via `empShiftSchedule_` — the roster
  column-O override wins, else the per-tz `CONFIG.SHIFT_SCHEDULE` (Turn D
  removed INV-127's per-tz-only limitation).
- **`CONFIG.KB.REVIEW_DUE_DAYS`** (default 90) sets the KB review-due
  staleness window (#4). CONFIG-only; change requires a redeploy. The KB
  sheet gained trailing `ReviewedAt`/`ReviewedBy` columns — the header
  **self-heals on the first post-deploy KB read/save** (no manual
  migration); legacy rows fall back to `UpdatedAt` until first reviewed.
- **`CONFIG.SHIFT_SCHEDULE`** sets the Clock-view ribbon/countdown
  shift: `DEFAULT` 8:00–17:00 CST + `BY_TIMEZONE` overrides (PH
  `Asia/Manila` 8:30–17:00). Resolved per the rep's roster timezone
  by `getShiftSchedule_`; add a `BY_TIMEZONE` entry for any new
  PER-TIMEZONE exception. Change requires a redeploy (CONFIG, no Script
  Property override). **PER-REP exceptions need no redeploy (Turn D):** put
  `H:mm-H:mm` in Employees column O — `empShiftSchedule_` resolves
  override-over-tz for every consumer. **Breaks (item 1):** each shift entry may carry a
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
- **`Employees` sheet column N = `Departments`** (DeptRequests v2, INV-138) —
  a `;`/`,`-separated list of department names (matching the `DEPARTMENT_EMAILS`
  keys, case-insensitive) the rep STAFFS. Drives the Metrics → Dept Requests
  **Incoming inbox** (open requests addressed to a dept the rep staffs) + lets a
  dept member resolve in-app. Blank for most reps; fill it only for dept-desk
  staff. Unknown names are dropped (`drParseDepartments_`). `ROSTER_CACHE_KEY`
  was bumped to `employee_roster_v7` for this column — stale v6 cache entries
  expire within 5 min (or run `clearCaches_()`).
- **`Employees` sheet column O = `Schedule`** (Turn D, cycle 7) — an OPTIONAL
  per-rep shift override, `H:mm-H:mm` in the REP's own timezone (e.g.
  `9:15-17:45`; the PARSER also accepts bare hours like `9-17`, BUT Google
  Sheets date-coerces a bare `9-17` typed into the cell — it becomes Sep 17,
  which fails the parse and the override silently no-ops. Type the `H:mm-H:mm`
  form, or prefix the cell with a leading apostrophe — cycle-8 scan finding).
  Blank = the per-timezone
  `CONFIG.SHIFT_SCHEDULE` (today's behavior). Drives the Clock ribbon/countdown
  (via `getEmployeeState.schedule`), the Coverage planner, and Punctuality —
  the INV-127 per-tz-only limitation is removed. Parsed by the pure, Node-pinned
  `parseShiftOverride_`; a typo'd/overnight/out-of-range cell silently falls
  back to the per-tz schedule (fail-safe — a bad cell can never break the
  ribbon). Breaks + the break reminder still come from the per-tz schedule
  (the override changes start/length only). Overnight shifts are unsupported.
  `ROSTER_CACHE_KEY` bumped to `employee_roster_v8` for this column.
- **Script Property `CDR_QUEUE_GROUPS`** (optional — cycle-14 Phase 4). JSON
  `{"Department": ["A_Q_Queue", ...]}` mapping transfer queues to departments
  for the Metrics → Team Metrics **"By department"** mode. **Unset is fine:**
  `CONFIG.CDR_QUEUE_GROUPS` already ships the four operator-supplied groups
  (Sales / Customer Success / Field Operations / Power), so the mode works on
  deploy with no action. Set the property only to change the mapping without a
  redeploy — e.g. when a new queue appears in the CSR Transfer tab's H:R block.
  Sanitize-on-read: a corrupt blob degrades to the CONFIG seed, a non-array
  member list is dropped, and **a queue listed under two departments is kept
  only in the FIRST** (the grouping is a partition — double-counting is the
  INV-180 class). Any queue not listed shows up under a trailing **"Ungrouped"**
  row in the UI, so an unmapped queue is visible rather than silently absorbed —
  that row is the cue to update this map. There is no Admin editor yet; edit the
  property in Apps Script editor → Project Settings, or the CONFIG seed.
- **Script Property `DR_SLA_TARGETS`** (optional, auto-managed) — JSON
  `{deptName: hours}` per-dept resolution-SLA overrides for DeptRequests, written
  by the Admin → Config **Dept-Request SLA targets** editor (`saveDeptRequestSla`,
  admin-gated, 1–720h, entries equal to the default are dropped). Unset/blank for
  a dept → the `CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS` default (**48h**). A
  request past its SLA shows "Overdue" on the tracker + rides the daily
  `sendDeptRequestReminderDigest` manager summary. No manual setup needed.
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
- **`Employees` sheet column P = `PayRate`** (operator 2026-08-17) — an
  OPTIONAL hourly pay rate per rep (plain number; `$18.50`-style entries
  parse too). Drives the **estimated gross** line on the rep-facing pay
  statement (Time / PTO → "View pay statement" in the pay-period rail
  block); BLANK =
  the statement shows hours only and says the rate is not on file. Read in
  exactly ONE place (`empPayRate_` behind `getMyPayStatement` — the
  INV-167/F14 boundary, Node-pinned) and never spread onto emp objects, so
  no other endpoint can leak a rate to a teammate surface. Fill it by hand
  in the sheet (the onboarding form deliberately doesn't ask — a rate is a
  payroll decision, not an onboarding field); `ROSTER_CACHE_KEY` was bumped
  to v9 for this column, so stale cache entries expire within 5 min.
- **`Employees` sheet column Q = `PtoAccrual`** (operator 2026-08-18) — an
  OPTIONAL PTO accrual rate in **PTO HOURS PER `CONFIG.PTO_ACCRUAL_BASIS_HOURS`
  HOURS WORKED** — the operator's real rule (2026-08-19). For the PH team
  that is **`3.08`** (3.08 PTO hours per 80 hours worked); unit-annotated
  cells like `3.08 h/80h` parse too (the first numeric token is read — do
  NOT strip non-digits, `3.08 h/80h` would become 3.088). Setting it does
  TWO things: (a) that rep's Time/PTO annual-leave tile flips to the
  ACCRUING framing (`ACCRUING 3.08H / 80H` + a month-to-date earned line,
  with the planned/projected line still shown beneath it — F7);
  (b) **the SYSTEM credits the earned amount into the column-I balance
  automatically** — the daily `creditMonthlyPtoAccruals` trigger reads the
  rep's ACTUAL worked hours for each owed month (one range-wide Timesheet
  index, archive-aware) and credits `hours × rate / basis ÷
  CONFIG.PTO_HOURS_PER_DAY` days, IN ARREARS (month M's accrual lands
  on/after the 1st of M+1), idempotent via the auto-managed column-R stamp
  (see below and INV-194). **A month with no worked hours credits nothing**
  — correct under an hours rule, and it still writes an audit row so the
  silence is visible.
  Shipped display-only for ~an hour, then operator-upgraded to
  system-computed the same day. Column I REMAINS the balance of record:
  the credit is a DELTA through `adjustLeaveBalance_`, so manual
  corrections still compose — but **STOP the routine manual monthly
  top-ups the day you fill column Q**, or each month double-credits.
  **Enable convention: the balance is presumed current through the END of
  last month at enable time** (a blank stamp SEEDS without back-crediting,
  so enabling never dumps a surprise catch-up). BLANK/garbage/zero = no
  accrual — the fixed-allotment tile and zero credits, exactly as before
  (`empPtoAccrual_` fail-safes to null, the `parseShiftOverride_`
  posture). Fill it by hand in the sheet for accruing agents only; the
  onboarding form deliberately doesn't ask. **A rate carried over from the
  2026-08-18 days-per-month round means something different now** — re-enter
  it in hours-per-80-worked.
- **`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)**
  (operator 2026-08-19) — the two halves of the accrual unit conversion:
  column Q's rate is *per basis hours worked*, and the earned PTO hours are
  divided by hours-per-day to reach the DAYS column I stores. Both are
  CONFIG-only (no Script Property), so changing either is a redeploy — and
  changing the basis silently re-scales every column-Q rate, so change the
  cells in the same pass. `PTO_ACCRUAL_CATCHUP_MAX_MONTHS` (12) bounds a
  cold-start catch-up.
- **`Employees` sheet column R = `AccruedThrough`** (operator 2026-08-18) —
  AUTO-MANAGED `yyyy-MM` stamp: the last month whose accrual has been
  credited. Written only by `creditMonthlyPtoAccruals`; leave it alone.
  Blank = seeds on the next run (stamps last month, credits nothing).
  Hand-edit ONLY to deliberately re-credit or skip months — backdating it
  credits the intervening months on the next run, each from the hours that
  month's Timesheet rows actually record (the index reads through
  `TimesheetArchive`, so an old month is not silently worth zero; capped at
  `PTO_ACCRUAL_CATCHUP_MAX_MONTHS`=12, with any capped overflow NAMED in
  the audit row rather than silently absorbed). Sheets may coerce the cell
  to a Date — every read routes through `accrualStampYm_` (the
  `normalizeDate_` class). `ROSTER_CACHE_KEY` bumped to v11.
- **`ROSTER_CACHE_KEY` = `'employee_roster_v11'`** — bumped for the
  `AccruedThrough` column (R, automated accrual credits, 2026-08-18);
  previously v10 for `PtoAccrual` (Q, same day), v9 for
  `PayRate` (P, pay statement, 2026-08-17), v8 for the `Schedule`
  column (O, Turn D per-rep shift override), v7 for Departments/DeptRequests
  v2, v6 for `ManagerEmail`/T3, v5 for CallNotesSheetId. After deploying,
  stale v10 cache entries expire naturally within 5 min (or run
  `clearCaches_()` from the editor).
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
  object `{ eod|urgent|weekly|trainingOverdue|deptReqReminder|managerBrief|selfTest:
  "yyyy-MM-dd HH:mm:ss" }` (CONFIG.TIMEZONE
  wall time) stamped by each digest run (`stampDigestLastRun_`) — the
  heartbeat behind the Automation Health panel's "Digest heartbeats"
  block. Created on the first post-deploy digest run; no manual setup.
  Until each digest has run once, the panel shows "no heartbeat recorded
  yet" — not an error. (`managerBrief` stamps on every 8am run even while
  the `managerDailyBrief` flag is off — the trigger's liveness is
  observable independent of the feature toggle, INV-151.)
- **Consolidated manager daily brief is OFF by default (INV-151).** Flip the
  `managerDailyBrief` feature toggle (Manage → Admin → Feature Toggles; it
  lives in `CN_FEATURE_FLAGS`, no dedicated Script Property) and **re-run
  `installAutomationTriggers()` once** so the daily manager-tz 8am
  `sendManagerDailyBrief` trigger exists. While on: ONE branded morning email
  per manager consolidates urgent notes / missed clock-outs / overdue
  training-docs-coaching / dept-SLA overdue, and those four streams suppress
  their separate MANAGER emails (employee reminders, the weekly digests, and
  the automation-failure watchdog still send). Silent on an all-clear morning.
  Flip it off to restore the individual digests instantly (next trigger runs).
- **`ClientErrors` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first client-error beacon, INV-150). PHI-free diagnostics — exception
  message/stack + view key per row, never form-field values. Read by the
  Admin → Automation Health "Client errors" section (bounded tail scan,
  7-day window). Grows slowly (client dedupes + caps 5/session; server caps
  20/hour/rep); no purge — trim manually if it ever bothers you. The
  `runAllTests` beacon test deletes its own `TEST_` rows.
- **`ViewUsage` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first view-enter after the 2026-08-13 observability deploy). PHI-free
  feature-usage telemetry — Timestamp / EmployeeId / View / Mode per row,
  never content. Written by `recordViewEnter` (rep-gated, USER lock,
  rate-capped 120/hr/rep; the client throttles to one send per view per
  5 min and skips View-as previews); read by the admin-gated
  `getViewUsageStats` behind the Admin → Overview "Feature usage" panel
  (bounded 8000-row tail, 7d/30d windows). Grows slowly; no purge — trim
  manually if it ever bothers you. **`ViewUsage` and `ClientErrors` are the
  only two stores in the app with NO retention tier at all** (cycle-18 F11):
  every other growing store has an archive and/or a purge, and both of these
  are append-only diagnostics that nothing ages out. At this team's volume the
  horizon is years and the reads are tail-bounded, so growth costs nothing
  today — but "trim manually" is an operator obligation nobody is reminded of,
  and neither tab is surfaced by Storage Health. A shared purge tier
  (`VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS`, default 0 =
  disabled, riding the existing `purgeExpiredFormData` posture) is the
  documented follow-on; until it exists, delete old rows by hand if either tab
  ever gets unwieldy.
- **Script Property `WHATSNEW_KB_ID`** (optional — the "What's new" panel,
  INV-152). Set it to the ID of a PUBLISHED Reference **article** (create a
  "What's new" article in the Reference tool, copy its id from the KB sheet
  or the reader URL-free id in the editor) and every rep gets a one-time
  dismissible panel rendering it on next load — re-surfaced automatically
  whenever the article is EDITED (the edit timestamp is the seen-stamp).
  Unset = feature fully dormant. Drafts/embeds never show; maintain the
  changelog like any other KB article.
- **Timesheet cold-archive is OFF by default (INV-153).** `archiveOldTimesheetRows`
  (daily manager-tz 6pm trigger — moved off 1am in cycle 8, the offshore
  mid-shift lock-contention window; re-run `installAutomationTriggers()` once
  to pick up the new hour) MOVES Timesheet rows whose date is older than
  `TIMESHEET_ARCHIVE_DAYS` — Script Property first, then
  `CONFIG.TIMESHEET_ARCHIVE_DAYS` (default **0 = disabled**) — into a
  `TimesheetArchive` tab in the SAME ADP spreadsheet. **Nothing is ever
  deleted** (payroll is keep-forever; there is deliberately NO purge tier),
  so enabling it is safe: it bounds the LIVE tab that `getManagerDashboard`,
  the exports, and the calendars read whole — the read volume that otherwise
  grows unboundedly. **Recommended: set Script Property
  `TIMESHEET_ARCHIVE_DAYS=365`** (a payroll year). Values below the
  `TIMESHEET_ARCHIVE_MIN_DAYS` (120) safety floor clamp UP so a typo can never
  strip active-window rows (adjust window 30d, current export period,
  dashboard trends). NOTE archived rows leave the in-app month navigation
  (the employee calendar / manager timesheet views read the live tab only) —
  they remain in `TimesheetArchive` for payroll audit. No redeploy to change
  the window; installing the trigger requires `installAutomationTriggers()`.
  **Two cycle-12 fixes make enabling this genuinely safe — do NOT enable it on
  a build older than that batch:** (a) F1 — the **ADP export now reads through**
  the archive when a requested range predates the live tab, so a retroactive
  payroll export is complete; before F1 the archive had no reader at all and
  such an export silently produced a PARTIAL `.xlsx` behind a success response.
  (b) F3 — the nightly move is **bounded to
  `TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN` (2000) rows**, so a large first enable
  drains over successive nights instead of timing out mid-run and re-appending
  (duplicating) payroll rows into the archive every night. Expect several
  nights of `rowsArchived=2000; hitPerRunCap=2000` audit rows on the first
  enable — that is the backlog draining, not an error. Still live-tab-only
  (accepted): the employee calendar, `getPunctualityReport`, and the sheet
  doctor's 92-day scan.
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
  three expiry sites route through it **and fail CLOSED on `!present` too**
  (F cycle-8): a blank/absent `ExpiresAt` is treated as expired. Such a cell
  only arises from corruption or a lossy `FORMS_SS_ID` migration —
  `createFormToken` writes the cell atomically in the appendRow — so the old
  `expX.present &&` guard (which read a blank cell as NOT-expired, a fail-OPEN
  asymmetry with the unparseable-`ms:null` case) let a blank-expiry token stay
  perpetually valid for anonymous PHI submission. Pinned by
  `test_publicForm_blankExpiryFailsClosed`. The client-returned `expiresAt` /
  `createdAt` go through the sibling `formTokenIsoString_` so a coerced Date
  never leaks back as a `"Sat Jun 27 …"` blob. Pinned by the `formTokenCellMs_`
  Node test. (This was latent on the ADP-fallback sheet, which didn't coerce; it
  surfaced when `FORMS_SS_ID` moved to the Intake sheet — a CODE bug, NOT
  fixable by the sheet tz alone.) **The submission-side `FS.SUBMITTED_AT`
  display reads route through `formTokenIsoString_` too (cycle-9 L-5):** the
  in-app submission viewer (`buildFormSubmissionResult_`) and
  `verifyFormSubmissionIntegrity_` were the last raw `String(row[FS.SUBMITTED_AT])`
  reads — on a coercing `FORMS_SS_ID` they rendered a Date blob in the
  "Completed by …" sub-line (harmless to the hash, which excludes submittedAt,
  but visibly wrong). The `markDeptRequestResolved_` `already`-branch
  `RESOLVED_AT` cell (surfaced in `serveResolvePage_`) got the same guard.
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
- `.cycle/STATE.md` — the CURRENT cycle ONLY (template below); written by the
  implement commands' CHECKPOINT step, read by `/cycle-resume` + `/cycle-status`
  and the SessionStart hook. **Split (2026-07-24):** STATE.md no longer rolls —
  closed-cycle blocks live in `.cycle/HISTORY.md`. **Close-out procedure:** when
  a new audit cycle opens (or the prior cycle's deploy is confirmed), move the
  finished cycle's whole block into HISTORY.md (newest first, directly below its
  header) and reset STATE.md from the template. **Editing rule (a truncation
  bit this file once):** template headings repeat across cycles, so never locate
  a section by first-occurrence heading SEARCH in a multi-cycle file — the split
  makes STATE.md's headings unique, but the rule still applies to any edit of
  HISTORY.md, which is append-only and must never be edited in place.
- `.cycle/HISTORY.md` — append-only archive of closed-cycle STATE blocks
  (newest first). Never edited after a block lands; heading names repeat freely.
- `.cycle/metrics.csv` — per-cycle metrics appended by `/reflect` / synthesis.
  Header: `date,cycle,subsystem,phase,net_score,prod_fixes,new_failure_modes,category_d_ratio,axis_b_lowest,notes,defensive_count`
  **Local convention:** the canonical `/reflect` leaves `category_d_ratio` +
  `axis_b_lowest` blank (a separate `/synthesis` step fills them), but this
  project has no `/synthesis` command, so fill both at reflect time (cycles 1–3
  did) — `category_d_ratio` = the Category-D/Low share of the cycle's findings,
  `axis_b_lowest` = the weakest Axis-B horizontal category that cycle.
- `.cycle/estimates.csv` — estimate-vs-actual calibration, appended by `/reflect`.
  Header: `date,cycle,action,estimate,estimated_hours,actual_hours,calibration_note`
- `.cycle/blocks/` — **the verbatim handoff blocks** (template R19, adopted
  2026-07-27). The three implement commands and `/reflect` write their summary
  block here at CHECKPOINT: `<cycle>-<version-or-scope>-broad-implement.md`,
  `…-targeted-implement.md`, `…-implement.md`, `<cycle>-<letter>-reflect.md`.
  It exists because the blocks previously lived ONLY in chat scrollback while
  STATE.md carried prose *about* them — a Verification Pass or Health Synthesis
  runs in a FRESH session with none of that context, so a block that never
  reached disk could not reach them. `/audit` deliberately does NOT write here
  (its first instruction is "do not make any changes to any files", so its
  Session Handoff Block still travels by paste). **Cycle 12 predates the
  adoption**, so its six implementation blocks + one cycle-summary block are not
  on disk. Cycle 13 is the first that writes them, and is the reference example
  of a complete set: four `*-broad-implement.md` blocks plus `13-a-reflect.md`.
  **Read the REFLECT block for a closed cycle's tally, not the implementation
  blocks** — cycle 13's reflection corrected its own batch reports in two
  directions (promoting eight interface fixes wrongly scored defensive, and
  counting one new failure mode the batches had reported as zero), so the two
  sources disagree by construction and the reflect block is the later, honest
  one.
- `PROJECT_HEALTH.md` (repo root) — Current Standing + Score History.

**Command templates: synced to `claude-workflow-tools` v1.23.0 (2026-07-27).**
`.claude/commands/` carries 19 of the template's 20 commands, verified
byte-identical at sync time; `/pr-review` is the one not installed (it sits
under the template's separate "Per-Change Review" heading). Record the version
here on every `/sync-commands` — before this line existed the previous version
had to be INFERRED from which features were missing (it was ≤1.18.0, five
releases of command semantics behind: R18's interface lens and R19's block
persistence were both absent). Note a deliberate scoring discontinuity that
came with R18: cycles ≤11 scored user-visible interface defects as
defensive/structural and excluded them from `net_score`, while 12 onward counts
them as production fixes — nothing was rewritten retroactively, so cumulative
`net_score` spans two rules at that boundary.

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
added to both), **plus a trigger-GATE-TYPE check (every install-`TARGETS`
handler calls `assertManagerCaller_` and references no `.isAdmin` in code — the
F1 class) and a declarative `COUPLING_REGISTRY` (the Axis-B drift net: each entry
extracts a `sub` + `sup` key-set from raw source and asserts `sub ⊆ sup`, so the
next parallel-source coupling is ONE entry — seeded with the F5 Automation-Health
label maps: `DIGEST_LABELS` ⊇ `DIGEST_STALE_HOURS` + `CN_HEALTH_RUN_LABELS` ⊇
`AUTOMATION_AUDIT_ACTIONS`; couplings needing a vm-loaded value or custom logic
keep bespoke tripwires)). Cycle 7 added the
next tripwire families: the spreadsheet-factory set (createPinnedSpreadsheet_
pins tz+locale; a comment-stripped count forbids bare `SpreadsheetApp.create(`
outside it; the three call sites route through it — INV-141), the CN-timestamp
boundary (the enumerated readers use `cnTimestampString_` PLUS, since cycle 8,
a GLOBAL whitelist scan of every `[CN.TIMESTAMP]` occurrence in Code.js — a
fifth reader added anywhere now trips it — INV-142),
the coaching-parser pin (H-1), the **AuditLog typed-reader family** (Batch 3,
cycle-8 — replaced the narrow dashboard M-3/M-4 pin: `auditRowObj_` recovers each
coerced `AUDIT` column via its normalize helper, both object-readers route through
it, and a GLOBAL scan fails CI on any raw coerced-`AUDIT`-column read outside it —
the F1-catching net + 2 runtime recovery tests),
the detector-liveness wiring (compute→return→digest + the check keys — five
at Turn C, six since cycle 8's `briefConfig`, seven since F9's `managerSource`
MANAGER_EMAILS↔roster drift check), the INV-72
`LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_`
BEHAVIORAL mirror (drives the real server function over every client key),
the `empShiftSchedule_` single-resolver check (zero bare `getShiftSchedule_`
calls — INV-149), and the cross-partial `intakeFlushDraftNow_` hook check
(INV-148). Cycle 8 generalized three tripwires that were narrower than their
invariants: the `TO/PAR.SUBMITTED_AT` raw-read scan is ANY-INDEX (the old
regex required the loop variable to literally be `i`), the CN-timestamp
boundary gained the global scan above, and the INV-72 mirror gained its
REVERSE direction (`TIME_OFF_TYPES` entries without a client preview entry
must resolve to the server's annual/1.0 default — a server-side branch added
without a client entry fails; default-served types like `Other` pass). The
harness itself was hardened in cycle 8: `extractFunction`/`extractRawFunction`
anchor on `'function name('` (a bare name-prefix match silently extracted the
wrong body when the name prefixes an earlier declaration — getQuiz vs
getQuizzes was a live latent collision), and the DOM harness's `flushTimers`
RETHROWS the first deferred-callback error instead of swallowing it (a
crashing deferred render used to pass silently). It also
parse-guards every JS-bearing `<script>` partial so a syntax error
anywhere in the client fails CI — **and since cycle 9 (M-10) the parse-guard
list (`PARSE_GUARD_PARTIALS`) is auto-tripwired against `index.html`'s
`include()` calls**, so a newly-included JS partial can't ship outside the
net (the class that let `metrics/script_deptrequests.html` +
`train/script_coaching.html` fall out of every harness list; both are now in
the parse-guard, DOM `PARTIALS`, and view-key scan lists). Cycle 9 also added
the **`enterTool` TOOL-key tripwire** (every `enterTool('…')` literal across
the partials must be a registered top-level TOOL key, extracted by a
brace-DEPTH WALK with comments stripped and `${…}` interpolations exempt —
the H-1 "Coach on this" dead-key class; do NOT simplify it to a regex char
class) and fixed the sibling `refreshViewIfCurrent` tripwire's `[^}]*` →
`[^{}]*` (it was capturing TOOL wrapper keys instead of leaf tab keys —
false-permissive for exactly that class; leaf-key asserts now pin the regex
itself). The six-rule `coachCanManagerSee_` unit pin (stubbed
roster, INV-134) also lives in the pure harness. **Cycle 9 (batch 7) added three more
nets:** a **no-mail-inside-the-lock tripwire** (M-7 — inventories every
function touching `MailApp.`, then fails CI on any locked try-region that
reaches one outside a post-lock `notifyAfter` closure; sole allowlist entry
`emailFromCallNote`, INV-42), a **payload-contract tripwire** (Strategic #2 —
every client-submitted `subformData` key, from `payload.subformData.X`
assignments + `subformData:{…}` submit literals across `cn`/`intake`, must be a
`rawSub.<key>` read in `sanitizeCallNotePayload_` — retires the M-3 drift class
where the client wrote keys a later whitelist silently dropped), and a
**`showView('…')` literal net** completing the `enterTool`/`refreshViewIfCurrent`
registry-key family. Plus L-35 behavioral/source pins:
`PUNCH_MORPH.LunchIn.to='doorExit'` (the F7 half-step class),
`spanishSearchQuery_`'s `{to: cc:}` brace-OR, `clkShootMaybe_` night-sky
gating, and the greeting-rotator `stopClock` teardown. CI's `node --check` step
covers `Code.js`, `Tests.js`, AND `DevTools.js`. It also runs a **design-token
hygiene tripwire** (INV-128) that fails CI on any `var(--token)` used in a shared
partial but defined nowhere in `styles_design_tokens.html` (the allowlist is
empty; `form_public.html` is excluded). The integration suite (`Tests.js`)
gained `test_cn_search_phoneTrxFieldScopes`, pinning the Phone/TRX search
field-scope isolation (INV-45). See `test/client/README.md`. It needs
no npm install and lives outside `web-app/`, so `clasp` never pushes it. A
GitHub Action (`.github/workflows/client-tests.yml`) runs this harness +
a `node --check` of `Code.js` / `Tests.js` on every push and PR — the
project's only automated check. **Cycle 10 additions:** the top-5/A–D fix
pins (M-1 recordPunch↔findExistingPunch_↔managerSaveDay agreement, M-2
target-tz Day Edit, M-3 tray routing, M-5 `intakeStoreOversizeError_`
behavioral + wiring, M-6 Metrics seq tokens, batch-C witness/guard wiring,
batch-D client guards); the INV-01 **structural scan** (every `waitLock(`
function finally-releases — ~60 sites, also closing the no-mail-in-lock
scan's skip-when-no-finally hole); `GmailApp.sendEmail` in the mail-sender
inventory; both coercion scans' write-exemption tightened to `=(?!=)` (a raw
comparison read no longer passes as a write); the INV-142 scan lost its
reconcile whole-line exemption (C1 made it unnecessary — and it was itself a
copyable false-pass hole). DOM harness: the two INV-83 pins (stacked-dialog
topmost Escape — bite-checked against the real guard — and the drawer-Enter
exemption). Editor suite: +7 (the M-1 pair + the five M-11 endpoint
contracts). **The post-scan a11y/visual/K/L batches added the next net:**
the `--muted-2` WCAG-AA contrast tripwire (computes ratios from the token
file, both modes × three surfaces), the CN flag-stripe exact-token pin
(deepStrictEqual — name-distinctness can't catch the `--accent`==`--good`
alias), the `mtRenderTable_` sortable-header a11y pin, two DOM
focus-lifecycle pins (restore-on-close + INV-145 no-restore-on-refusal),
the self-checking **MIRROR_INDEX** (every known parallel-source mirror in
one registry, each naming its live guard test — a renamed/deleted
tripwire breaks the index), the first AUTO_COPY_FORMAT machine check,
the batch-L pins (sheet-doctor coercion/last-row-wins/report-only; C13
NUL-default + dual-verify wiring), the typed-signature pad parity pin,
and the nightly self-test wiring pin. **Cycle 11 (the seams audit)
hardened the tripwire layer itself:** the payload-contract extractor is
balanced-brace + depth-masked (a nested object in a submit literal no
longer hides the keys after it — bite-checked); a new SUBMITTED_AT
LINE-whitelist scan over Code.js+Tests.js closes the one-variable-alias
hole (bite-checked); the no-mail-in-lock region extends to the last
`releaseLock()` (finally-before-release is scanned) and the sender
inventory is TRANSITIVE over notifyAfter-stripped bodies (bite-checked);
the registry-literal nets accept double-quoted literals and all three run
off ONE `REGISTRY_SCAN_PARTIALS` list derived from `PARSE_GUARD_PARTIALS`
(plus a `dom/boot.js` PARTIALS coverage check) — retiring the
four-hand-copies class; the INV-142 scan covers `[CN.EMAILED_AT]`;
MIRROR_INDEX gained its 3 missing entries (CN_INTERACTIVE_FORM_IDS,
errBeacon caps — now extracted from Code.js, not hardcoded — and a new
`KB_IMG_UPLOAD_MAX_CHARS` client-mirror guard) plus the
`CSR_TRANSFER_EXPECTED_HEADERS` ↔ `CSRT` behavioral pin. **Cycle 12 added five
bite-checked fix-pin groups (F1–F5):** the export archive read-through (gated,
live-duplicate-skipping, provenance-reporting), the sheet-doctor
truncation/bound contract on BOTH sides of the wire, the shared mover's
per-run bound + the CN callers' unchanged defaults, the no-email roster skip in
both Metrics walks (plus a guard that `getCoveragePlan` keeps its cycle-9 L-2
skip), and the note-read outcome across all four coverage surfaces and all
three result caches. **The rest of cycle 12 added five more pin groups across
five batches:** the V-1 hue-drift bound + V-2/V-3 specificity pins (batch A);
the F15 running-sentinel, F9 gate-coverage and F7 admin-count nets (batch B);
the F14 column-L ban, F11 bounded-append, F16 no-silent-blank and F18
truncation pins (batch C); and the F12 single-read, four F17 mirror guards and
the eight V-item source pins (batches D/E) — pure 330→356, DOM 66 (the DOM
addition is the F16 failure path driven in a real jsdom window). **Cycle 13
(batch 1) added six more — A1 (no span/div carries an inline `onclick`), A2
(every compact grid override has a matching viewport breakpoint), A3 (two:
`timeToMins_`/`calcHours_` behavioural + the caller-shape scan), A11 (nav +
toggles expose ARIA state), A12 (no failure renders into an empty-state
container) — putting the pure harness at 362, DOM unchanged at 66. Batch 2
added four more (A4 the removed 0-on-error wrapper stays removed, A6
`kbReloadTree_` surfaces both failure paths, A8 null-not-0, A9 the archive
stamps `hitPerRunCap` only on a genuinely truncated run) → 366. Batch 3 +
follow-ons added seven (A5 dev-detection, A7 header-only export guard, A10
grade-before-lock, FO-2 the last inverted primary, FO-3 the shift-header wrap,
FO-4 `_assertEq` NaN-vs-null, plus the FO-5 dead-field removals folded into the
A8 and F18 pins) → 373. Batch 5 GENERALIZED the two a11y pins from a hand-listed
file set to `A11Y_SCAN_PARTIALS` (derived from `PARSE_GUARD_PARTIALS`, so a new
tool's partial cannot ship outside the net) — the state-class rule then surfaced
eight instances the hand scan had missed → 374; batch 4 added the A13
heading-class scan → 375. Cycle 14's Phase 0 added four more (the queue
inventory's three-state verdict, its escaping of CDR-sourced strings, the
read-only/bounded reader shape, and — the load-bearing one — that the scan
stays OPT-IN so the 10-minute-per-manager health badge and the daily digest
never pay for a full-sheet read) → 379. Phase 1 added three more (header-name
column discovery with the REAL bounds read from source, the opt-in call-site
count, and the component-not-partition contract) → 382. Phase 2 added five
(queue colour determinism, the remainder segment, the stated fraction +
escaping, the shared component's optional detail row, and best-effort
degradation) → 387; Phase 4 added four (sum-not-max, Ungrouped-last,
count-once, sanitize-on-read + mode-only-with-data) → 391. DOM 66 → 69 and the
visual matrix 20 → 22 (Team Metrics had never been shot). Cycle 15 (seams) added
five → 396 — the CDR name-match pairing, the health-card tone source, the capped
name lists, the fixture-mirror pin and the every-CONFIG-key-has-a-reader scan
(this running total had stopped at 391 until cycle-16's /sync-docs caught up).
Cycle 16 added three → **399**: the F1 note-outcome pin (server field + catch +
null coverage + all six client columns), the F5 team-total-null pin, and the F4
PTO-surfaced pin (banner, `role="alert"`, and the all-clear gated on the read
having succeeded). It also GENERALIZED the A2 tripwire from three hand-listed
fixes to a derived rule-scan — see the A2 gotcha; that promotion immediately
surfaced a fifth candidate (`.m-kpi-grid`) which was verified NOT a defect and
resolved as a rule refinement, not an allowlist entry. Cycle 16's SECOND batch
added four more → **403** (the F9 malformed-capacity behavioural pin driving the
REAL engine, a well-formed-unchanged pin across seven cases, the catalog
validator, and the opt-in-gate + failed-read-distinguishable wiring). Cycle 16's
THIRD batch added four more → **407** (F6 `uiPrompt` accessible-name + announced
validator error; F7 the client `Ungrouped` sentinel mirroring the server's; F8
`getDeptRequests` normalize-once + the resolved-row elapsed fix; and the A12
double-escape companion) and GENERALIZED two more scans — A12 from three
hand-listed partials to a derived rule (which found 28 violations across six
files, see INV-175) and the cycle-15 F4 mirror pin from one named function to
whatever sits in `test/visual/mock.js`'s DO-NOT-EDIT region. **Two of those
three fix pins failed their FIRST write, and both times the pin was wrong about
the code rather than the reverse: F8's tripped on its own explanatory comment,
which quotes the raw read it removed — the exact trap the CDR name-match pin
already documents — and now strips comments before scanning; F6's sliced from
the wrong occurrence of `ui-dialog-err` (the id constant, not the div). Strip
comments before scanning a function that documents what it deleted.** DOM stays
69; the visual matrix went **22 → 29** — every rep-facing tool gained a mobile
scenario and the two mid-task tools a compact one, and each scenario now reports
`overflowPx` (see the Visual Audit Stage).** Cycle 17's top-5 batch added four
more → **411** (C17-2 `updateTimeOffStatus` normalize-once — TO.STATUS read
exactly once, lowercase comparisons, raw-cell revert; C17-5 the CN loaders'
preserve-last-good + failed-round-never-fresh + cold-failure error render;
C17-6 the export's skippedReps on response + audit row + toast; C17-7 the
three manager lazy cards' error-vs-empty split on both failure shapes — all
four comment-stripped per INV-188 and bite-checked individually) and fixed the
A2 scan's `[data-compact="1"]` blind spot (see the A2 gotcha), which is pinned
by the scan itself rather than a fifth test. Batch ② added four more → **415**
(C17-4 attSeconds-null finalize; the five cross-rep walks' skippedReps +
partial-uncached contract incl. digest gating; the CN client partial-notes /
badge / query-guarded search error states; the four sibling-branch stragglers
C17-14/15 + side rail + kbDrawer + admin containment) and WIDENED F3 (the
positive bare-truthiness ban + two named additions). Batches ③+④ added four
more → **419** (tour/banner color rule; the .tr-head real viewport wrap;
switch semantics + both CN disclosures' aria; the fixture payload-shape pin)
and GENERALIZED three more scans (A13 derived classes + first-attr +
CSS-definition check; A12 statement-scope; V-1 derived -deep set) plus the
A11 disclosure vocabulary — every widening bite-checked. Batch ⑤ added six
more → **425** (C17-12 clear-on-hide helper + call sites; C17-11 partial-send
contract incl. the client warn toast; C17-13 leading-negation vocabulary; the
bounded-cells group — prefill/signature/notes caps; the dept-config group —
whitelist-rebuild + comma guard; the list-contract group — intake `total`/`cap`
on both sides, searchReference `status` ×3 + the Draft pill, the conditional
cache-buster). Batches ⑥+⑦ added eight more → **433** (⑥: the C17-9
one-read-index + memoized mirror, the getNextActions_ BEHAVIORAL
garbage-row cases, the Spanish named-cap + truncated ×3 + client note, the
three fan-ins' per-handler seq-guard counts, the dead-selector ban incl.
cnLoadDate_; ⑦: failrpc-before-fixture-lookup, scenario coverage for
admin/dark/error, and the getAutomationHealth fixture keys DERIVED from
computeAutomationHealth_'s return block — INV-185/179). The operator-feedback
rounds (2026-08-06) added three more → **436** (pop-out fit wiring; the
Spanish combined-view fan-in + tones; the Dept Requests rebuild — Spanish
vocabulary, `.dr-row` retirement ban, refetch-free dept filter), and the
metrics-improvements batch added ten more → **446** (`metrics — operator
improvements #1–#10`: range-trend fill seq/cache, control unification + the
`.m-preset-chip` ban + the `[hidden]` specificity fix, diagnostics
disclosure, threshold ships-×3 + behavioral banding + behavioral
spark-domain, transfer null-guards + `transferThrew`, CTA gating, behavioral
best/worst, span-cap + best-effort range trend, drill button + data-*,
behavioral TSV — 8 mutations bite-checked; the F5 range-cache pin and the
Phase-1 opt-out caller count (3→4) were updated for the deliberate contract
changes). The operator round-2 follow-ups added two more → **448** (the
dashboard-cohort scope pin — dashboard `MIN_COHORT = 1` + `dash_metrics_v2`
+ `getMyMetrics` KEEPS 3 + the hidden-message ban; and the list-swap motion
pin — helper + keyframes property whitelist + the four wired switch sites —
3 mutations bite-checked). The team-member onboarding flow (2026-08-07) added
two more → **450** (the `empValidateNewEmployee_` behavioral pin — real EMP
enum + parseShiftOverride_ in one vm ctx, 15 rejection/canonicalization
cases; and the gate/lock/convention pin — validate-under-lock ordering,
provision-after-release, offboard's single EMAIL-only cell write + self-guard,
best-effort CDR readiness — 4 mutations bite-checked incl. the INV-136
doc-count net itself). The F14 column-L scan gained a third write-shape
exemption (the validator's enum-derived row-builder slot). The 2026-08-11
pilot-feedback round added five more → **455** (the onboarding CDR split —
panel makes no CDR call, deferred≠failed, paint-before-patch, shared chip
builder; the readiness column grid + its 900px breakpoint + the `.toolbar-tabs`
overflow guard + the minmax'd action column; the three reminder channels
degrading independently; the shell ticker's once-per-rep-day firing and
server-quiet mid-shift behaviour incl. the theme-reflector scope and the
no-duplicate-ids rule; and the `.compact-header` ban, derived over
`PARSE_GUARD_PARTIALS` + both stylesheets — 10 mutations bite-checked). The
branded-email restyle (operator 2026-08-11) added two more → **457** (the
email chrome — styled logo alt, logo never on a coloured fill, heading at
heading size, CTA only when url AND label are present, no generic eyebrow, no
flex/gap/filter; and the CTA deep-link keys checked against the live TOOLS
registry with the empty-url suppression — 6 mutations bite-checked). The
Sheet→article converter (operator 2026-08-11) added five more → **462** (the
banded grid's column separation — the misrouting regression — driven
behaviourally; the table-vs-banded shape split incl. pipe escaping; the
highlight-preserved-and-legend-warned contract; a round-trip through the real
`kbMd_` proving the section anchors are real; and the gate/read-only/bounded/
getDisplayValues source pin — 6 mutations bite-checked). **TWO of those pins
were WRONG ABOUT THE CODE on first write and were corrected rather than the
code: one asserted a banded-only behaviour against the TABLE branch, and one
banned `.getValues()` across the whole function when the itemId branch
legitimately uses it to read OUR OWN KB sheet — scope a "never call X" pin to
the read it actually governs.** The interactive roster block added five more
→ **467** (parse structure/flags/escaped-separator/badge-travel; fence
recognition leaving other fences alone; inert + attribute-breakout; drawer
reflow + focus-visible tooltips + searchability; and the banded-sheet →
roster-block emitter — 8 mutations bite-checked). The 2026-08-13 operator round added seven more → **514**
(copy-scope + no-last-dept; the dashboard one-read-pair + paint-on-first-
arrival/skeleton-not-empty/patch-not-rerender contract; the clock-in
reminder's four gates incl. confirmed-snapshot-only; the auto-tag matcher
behavioural + read/save mirror; and the intake feedback loop's gate/
existence/PHI-free-audit/CTA-outside-the-hash contract — 32 mutations
bite-checked; FOUR pins were strengthened after failing to bite: a comment
broke a wiring regex (INV-188 again), an audit-notes scan stopped at a
quoted semicolon, an indexOf(-1) passed a < comparison, and an
adjacent-text match survived a reorder). The 2026-08-13 follow-up round
(image fallback + map block) added six more → **520** (the image-fallback
pair — server folder-scope-checked-BEFORE-bytes + same-generic-refusal +
no-lock, and the client capture-phase/thumbnail-scoped/retry-guarded/
failure-cached listener with the pure `kbImgFileId_` driven behaviourally;
and the map-block four — escaped-contract parse + cap/truncated, attribute
quoting + %26-not-&amp; URLs + real controls + honest copy, fence inertness
+ lazy-embed aria + esc-on-read-back, and `kbHaversineMiles_` behavioural
(Dallas→Houston ≈225mi) + the never-store-the-query server contract:
exactly ONE property write (the coordinate cache), placed BEFORE the query
geocode, hashed keys, no audit/log line, and `Maps.newGeocoder()` with zero
`UrlFetchApp` so there is nothing to bill — 8 mutations bite-checked).
The 2026-08-17 SECOND round (pay statement + Spanish share) added three more
→ **542** (the pay-statement pure pin — `payPeriodRange_` biweekly shift /
clamp / monthly year-wrap + Feb length, `empPayRate_` tolerant-parse +
legacy-15-col null; the rate-boundary pin — EVERY `[EMP.PAY_RATE]` read
lives inside `empPayRate_`, emp objects never carry a rate, the other-rep
branch is manager-gated, PTO status normalized, `archiveNote` wired, both
client failure shapes render the error card, the money line labeled an
estimate; and the Spanish share pin — zero-bars for idle members driven
behaviourally, manual attribution, case-insensitive keying, the
`(unattributed)` bucket, the server shipping `members`, the render slot on
the fan-in path, and a NO-VERDICT-TONE scan over the chart renderer — 5
mutations bite-checked; the rate-leak bite was reverted with `git checkout`
and WIPED the uncommitted server block, re-applied from context — the
batch-⑥ lesson re-learned: bites revert via python inverse edits ONLY, and
the unit commits BEFORE its bite-checks where possible).
The self-healing test-accounts fix added one more → **543** (setup restores
the canonical email on an existing TEST row instead of skipping it; cleanup
re-offboards every TEST_ row with the cache invalidated AFTER — the INV-183
corollary applied to the suite's own rows). The 2026-08-17 THIRD round
(full-width + display cap) added two more → **545** (the full-width pin —
`.sp-tasks` carries no max-width, both 1480px `:has()` widen rules live in
their own partials, `drRender_` emits `#dr-body` on BOTH branches, `.sp-top`
is a 2-col grid with a real viewport breakpoint (A2) and the 660px inline
caps are gone; and the display-cap pin — `spCappedTasksHtml_` driven
behaviourally (cap, step, final-page reveal, no button when complete,
extraStyle pass-through, real `<button>` per INV-173) plus wiring: all five
card sections capped with distinct keys, both shown-state resets, no
uncapped `.sp-tasks` list left, headers keep full counts per INV-169 — 7
mutations bite-checked). The 2026-08-18 operator round added four more →
**549** (the Punctuality/Admin width pin — no 900px card caps, no
punct-table/card caps, uncapped summary strips; the compact auto-tag-rules
pin — no per-rule bordered box, internally-scrolling 2-up list, real labeled
remove button, save-contract classes unchanged; the Spanish-members pin —
the real `saveSpanishInboxMembers` driven in a vm (shape-reject before any
write, lowercase+dedupe+cap-30, empty-list valid), admin gate + audit +
`getAdminConfig` read + the client's empty-list danger-confirm and escaped
chips; and the load-time pin — the per-caller `dept_req_v1` key + gen salt
bumped at the resolve write and the auto-track append, success-only put,
an explicit guard that `getSpanishInboxPending` STAYS uncached (the
documented privacy decision), the DR SWR stamps (fresh-skip, failed-round
nulls, resolve busts before re-enter), `enterTimeoffView` riding
`calNavTo_`, and the `dash_metrics_v4` day-scoped key + `DASHBOARD_CACHE_TTL`
— 11 mutations bite-checked across the round). The same day's follow-up
(Team Metrics for reps) added one more → **550** (the exact-whitelist
`teamMetricsRepView_` strip driven behaviourally — an unknown future
manager-only field CANNOT leak because nothing rides unless named — plus
registry/client-guard/click-through wiring; the team-cache pin's gate anchor
moved to the auth check + a both-return-paths-strip assert — 4 mutations
bite-checked). The fluid-pop-out-type request added one more → **551** (the
exact clamp formulas for both groups — ceilings equal the base px so ≥480px
is byte-identical, floors carry the "to a certain extent" — plus a
no-bare-vw font-size scan over the partial; verified by MEASUREMENT at
480/400/360 and 3 mutations bite-checked, incl. a raised ceiling — the
mutation that would silently change the default launch look). The narrow
pop-out round (same day) added one more → **552** (the ≤400px compact-yield
block — brace-matched extraction, all six rules, compact scope on every
rule, the load-bearing source order, `.cn-card-time` hidden EXACTLY once,
plus a tzMismatchCheck_-declared-once guard against the duplicate-hoisting
near-miss this very round caught — 4 mutations bite-checked; stacked layout
verified by MEASUREMENT at 300/360, byte-identical at 480). The Time/PTO
consolidation round (same day) added one more → **553** (the toggle + key
retired from CODE — comment-stripped scans per INV-188; the rail composed
unconditionally + the unconditional pay-period fetch; the quick-actions
card's real buttons, today-floored picker, same-month vs pending-nav
branches and rendered-month guard; the pay-statement fix button's
fixable+in-window+own-statement gate, data-*+bound handler,
close-before-open order; and the openAdjustModal prefill bounds — 5
mutations bite-checked). The visual mock gained a `getTimesheetData`
fixture and the calendar fixture's `hoursByDate` → `workedHoursByDate`
INV-185 shape fix (the corner hour badges had never rendered in any
timeoff screenshot). The range + accrual round (same day) added one more →
**554** (server: submitTimeOffRange's atomic conflicts-before-append order,
weekend skip, named-dates rejection, notes bound, span cap, both horizon
ends — comment-stripped per INV-188; client: the Through field's per-open
reset + preview multiplier + dual submit routing, the countWeekdaysIso_
BEHAVIOURAL cases, and the accrual tile — EMP.PTO_ACCRUAL declared AND
read ×2 (the INV-184 class), ROSTER_CACHE_KEY v10 (INV-28), empPtoAccrual_
BEHAVIOURAL fail-safe cases, variant gating with the legacy tile preserved
— 5 mutations bite-checked incl. the atomicity order and a behavioural
counter mutation). Editor suite +1 (`test_submitTimeOffRange_weekendSkipAtomicCaps`)
≈ 303. The accrual-credit follow-up added two more → **556** — ONE
auto-generated by the derived trigger-wiring/gate nets the moment
`creditMonthlyPtoAccruals` entered the TARGETS arrays (the INV-179 promise
paying out again), plus the accrual-credit pin (behavioural
`accrualMonthsToCredit_` incl. seed / in-arrears / year-boundary /
cap-reported cases with the cap READ FROM SOURCE, credit-before-stamp
order, through-the-mutator, stamp read coercion-safe, action registered
— the one direction the labels ⊇ actions coupling registry cannot see,
since REMOVING an action keeps the subset true) — 5 mutations
bite-checked. Editor suite +2 (`test_creditPtoAccrual_seedCreditIdempotent`
with an ABSOLUTE balance restore in finally — a relative un-credit would
corrupt the fixture on partial failure — + the trigger-gate case) ≈ 305.
The 2026-08-19 accrual REBUILD (operator: hours-driven, 3.08 per 80 worked)
kept the count at **556** — both pins were REWRITTEN in place rather than
added, which is the honest bookkeeping when a contract changes under a
test. The credit pin now drives the earn arithmetic behaviourally
(80h → 3.08 PTO hours → 0.39 days; 2080h ≈ 10 days/year; a genuine 0 earns
0 while an UNREADABLE hours figure returns null — `Number(null)` is 0, so
without an explicit guard an unread month would credit and audit as a real
zero) and pins the read shape the lock demands: ONE range-wide index, no
`buildTimesheetForEmployee_`, exactly two `getDataRange().getValues()`
(live + archive), archive read-through with live-key dedupe, `calcHours_`
for per-day arithmetic, INCOMPLETE-not-zero on an unparseable day, and NO
`catch` (a failed read aborts the run rather than crediting from partial
hours). The tile pin gained a scoped ban on a fill BAR inside the accrual
branch — the first write of it asserted the absent projection but not the
absent bar, and a re-added bar passed, so the pin was tightened until it
bit. 11 mutations bite-checked, one of which (the digit-strip rate parser
turning `3.08 h/80h` into **3.088**) was a live defect the pin caught while
being written — a silently wrong rate feeding real balance credits. Cycle 18's pre-audit batches added six more → **562**, then eight more → **570**, then six more → **576** (batches 5–7: the three A14 accessible-name pins — dialog naming, no nested `role="dialog"`, and the two-sided unnamed-control ratchet — plus one each for the `getTeamMetrics` span cap, the argument-dependent `getMyMetrics` fixture and the Time/PTO mobile scenario), and the DOM harness 71 → **75**: the F1 fence-source pins are DOM tests by necessity (the pure harness has no HTML parser, so it cannot decode an attribute — which is why `run.js` had pinned the vulnerable line AS CORRECT), plus a source ban (exactly one `getAttribute('data-src')`, inside `kbFenceSrc_`, which must re-escape) and the derived `AUTOMATION_JOB_CHECKS` pins. **A HARNESS HAZARD worth knowing, which cost three silently-dead pins this session: `run.js` ends in `process.exit(fail ? 1 : 0)`, so a test block appended AFTER that line never executes and reports nothing.** It was caught only because every mutation was bite-checked — a block that never runs looks exactly like a block that passes. Append new tests ABOVE the exit, and treat 'the pin did not bite' as the first symptom to check. jsdom carries its own version of the same trap: under `runScripts:'outside-only'` an inline `onclick` is never compiled, so dispatching a click runs NOTHING — two of the four new DOM assertions were vacuous until the handlers were called directly.
The 2026-08-17 post-deploy operator round added seven more → **539**
(the `mPrevWorkdayIso_` behavioural pin — Monday lands on Friday, weekends
step back, zero-arg defaults to employee-tz today; the My-Stats-preset pin —
Yesterday preset + previous-workday default + the range-trend fill following
the warmed key, with Team Metrics' Today asserted KEPT; the PPD
custom-recipient pin — footer option + empty-guard + the SHARED server
resolver validating custom for every form type; the one-round-trip punch pin
— lock-free wrapper, state attached only to success, try/caught assembly,
client inline-apply + surviving fallback refetch (the M-1 pin repointed at
`recordPunchCore_`); the cross-window reminder-dedupe pin — vm-driven with
two windows over one stubbed localStorage, day rollover, corrupt-blob
degradation; the tz-audit S2 pin — both ends of the ambient week window in
the rep tz; and the `kbSearchScore_` rebalance pin — density, title cap, and
the motivating tied-at-7 flooding case — 10 mutations bite-checked; the
in-lock wrapper mutation was ALSO caught by the M-7 transitive mail scan,
and the old #1 range-fill pin was updated for the deliberate
previous-workday fill source and re-bitten).
The 2026-08-13 pre-pilot observability round added five more → **532**
(the digest-chrome pin — all three Call Notes digests through
`buildBrandedEmailHtml_` with real `safeWebAppUrl_` CTAs and per-digest
tones; the errorState-beacon pin — `errorStateHtml_` fires `errBeaconSend_`
with the new three-value source enum accepted by BOTH normalizers; the
spike-alert pin — called post-`releaseLock` (M-7), threshold + window +
cooldown constants asserted from source, recent-messages escaped, and the
`automationProblems_` (g) entry + `last24h` cutoff; the
`viewUsageAggregate_` behavioural pin — vm-driven with real events across
the 7d/30d windows, distinct-rep counts, top-view resolution, and the
malformed-event guard; and the usage-beacon wiring pin — server gate +
shape regex + rate cap + USER lock, client 5-min throttle +
`VIEW_AS.active` skip, panel esc()/A12/A2 asserts — 9 mutations
bite-checked, with one matcher lesson worth keeping: the bite-check
harness must match on the TEST NAME in the ✗ line, not a section-header
console string, or a biting mutation reads as NO-BITE).
The 2026-08-13 settings/speed round added seven more → **527** (the settings
flyout — attribute-keyed gears, capture-phase Esc + stopPropagation, all
three control groups inside the panel, the `[hidden]` display companion, and
the single-render-site + shell-root-mount contract folded into the rewritten
palette-picker pin; view-as — `viewAsFlags_` behavioural per role,
admin-gate, no-localStorage session-only, all four `empState`-refresh
reapply sites, banner + real-role row; `tzOffsetMinAt_` behavioural
(CDT −300 / IST +330 / unknown → null) + the offset-not-id compare, UTC
sanity probe, once-a-day key and sticky toast; the dashboard first-frame
4-card skeleton + parallel extras kick + `extraBusy` guard;
`clkDashSeedFromLs_` behavioural — same-day complete rounds only, freshness
never inherited, partial rounds never persisted; the three slow tabs'
paint-any-cache + Spanish head-only refresh + background last-good; and the
`getTeamMetrics` endpoint cache — read after the gate, put gated on a clean
round, test-override bypass — 12 mutations bite-checked; two pins updated
for the deliberate layout/contract changes rather than the code, both
verified to still bite). The colour palettes added seven more → **507**
(all seven are DERIVED, so adding the fifth palette (Sage) required no test
edit at all — the AA, constant-luminance, contract, swatch, key-list,
specificity and hue-drift pins all swept it in, which is the INV-179 promise
actually paying out; two Sage-specific mutations were bite-checked to confirm
the scan reaches it. The palette contract — neutrals + accent only, never a semantic colour, and a
block declares the FULL neutral set so it is verifiable alone; the
constant-luminance construction, which catches a hand-edited hex even when it
stays above 4.5:1; the swatch-equals-its-palette pin; the three key lists
agreeing + a corrupt value degrading to Console; the specificity form that
beats the base dark block in both directions; the picker's button semantics +
settings-row adjacency; and a DERIVED check that boot.js stubs every global
index.html defines — 13 mutations bite-checked). The **AA tripwire was
rewritten** from "exactly two hex declarations, light then dark" to a derived
block scan, and the V-1 hue-drift pin now runs per PALETTE (the -deep tokens
mix toward `--ink`/`--paper-card`, which a palette changes).
The 2026-08-12 operator round added seven more → **500**
(the clock-card photo + moon stay deleted, selector AND render — the star field
is asserted by its ASSIGNMENT, since a surviving CSS rule proves nothing about
what renders; `dashPctTone_` banding by direction with NO tone absent a target;
`dashDelta_` where an absent comparison is not "no change" and volumes carry no
verdict; `dashboardPrevRange_` like-for-like elapsed days clamped DOWN; the
one-shaper/best-effort-prev/uncached-degraded server contract; both cards
defaulting to a DERIVED MTD index; and the sticky-toast shape — 23 mutations
bite-checked, one of which exposed a pin weaker than its property and was
rewritten). DOM 69 → **71** (the sticky lifecycle: survives the auto-dismiss
window, × dismisses, the cap evicts routine toasts first — 4 more bite-checks).
The intake email restyle added two more → **494** (the shell's chrome
asserted against `buildBrandedEmailHtml_`'s own source so the two cannot drift
apart again, plus per-form module labels at all four call sites; and the ledger
vocabulary — mono-uppercase band on tint not centred, hairline separators, no
bordered grid, the shared band in BOTH bodies — with the email-safety and
`esc_` guarantees riding the same test — 10 mutations bite-checked).
The decision block added five more → **492** (parse; unwalkable-guide reporting;
path resolution incl. a stale answer; one-question-at-a-time + trail + fresh
ticks; fence inertness — 9 mutations bite-checked). The glossary block added three more → **487** (parse/aliases/duplicate-refusal,
fence + inertness + attribute quoting, first-mention-only + acronym case + skip
set + both readers wired — 8 mutations bite-checked). The join/reciprocal round added two more → **485**, then extracting the pure
classifier folded three source-shape pins into one behavioural one → **484**
(6 geometry decisions bite-checked). The skip/direction correction added one more → **483** (column+row
attributes, adjacency deciding step-vs-skip, phase-bypass arcs, source-anchored
arrows — 5 mutations bite-checked). The process-graph round added two more → **482**
(measured edges + left-edge classification + redraw + stacking; dangling steps
reported and malformed lines counted — 7 mutations bite-checked). The first
deployed-screenshot round added four
more → **480** (fence-atomic chunk truncation with constants DERIVED from
Code.js; separators surviving kbMd_ escaping — the pin that caught a SHIPPED
sub-team defect; Flow-only-when-recorded; the Expand overlay — 11 mutations
bite-checked). Roster Tier 1 added five
more → **472** (person index folds a multi-team person; three views from one
source + coverage-states-no-verdict; exact tag matching; unique person ids
with a canonical first; tablist ARIA + distinct-people count — 7 mutations
bite-checked), and the chart view four more → **476** (tree roles + all-collapsed
+ CSS disclosure + vertical leaves; structure-not-reporting; own-scroller with
notes OUTSIDE it + the 560px node width; aggregate views bypass the row count —
10 mutations bite-checked). **TWO of those pins did not bite on the first
write, both because the assertion was weaker than the property: an ordering
check (`note index < wrap index`) survived renaming the wrap, and an
initial-render check said nothing about whether the TOGGLE keeps aria-expanded
in step. Mutate against the property, not its neighbourhood.** **A pin that does not bite is not a pin: the verdict-word scan
passed against a mutation until the FIXTURE was given a single-point-of-contact
row, because the sentence it guards only renders in that case.** **A vm-realm trap worth
knowing: `assert.deepStrictEqual` compares PROTOTYPES, so an array created
inside a `vm` context fails against a plain `[]` even when the values match —
compare by value (`.join('|')`) instead.** TWO
lessons from that round's bite-checks, both about the REVERSAL rather than the
pin: a `python` inverse edit must anchor on a string that is unique in the file
— `flex: 0 0 auto` restored into `.instance-banner svg` instead of the grid
rule it came from, and `.sb-theme-btn` restored into a COMMENT — so verify the
restore by re-reading the anchor lines, not just by re-running the suite.
Two of
those six did NOT bite on the first attempt and were tightened: the A1 scan was
line-by-line and missed multi-line markup (it now scans the whole source, where
`[^>]` matches newlines), and the A3 input list held only no-colon cases, all
caught by the length guard, so it passed with the `isNaN` guard deleted (added
`'ab:cd'`, `':'`, `'x:30'`, `'09:mm'`). **Editor-suite hazard found while
writing the A3 smoke test: `_assertEq` compares via `JSON.stringify`, and
`JSON.stringify(NaN)` is the string `"null"` — so `_assertEq(NaN, null)`
PASSES.** Any null-vs-NaN assertion in `Tests.js` must use a strict
`=== null` check via `_assertTrue`, or it is blind to the exact regression it
exists to catch. Editor suite
+6 in cycle 10 (sheet-doctor flow, legacy-hash dual-verify, self-test gate + 3
omnibus gate cases) ≈ 297, +2 cycle-11 (updateTimeOff_dupApproveRejected;
rejectsBadDate horizon cases) ≈ 299, +cycle-12: assertions folded into the
existing `archiveSheetRowsOlderThan_behavioral` (a maxRows case proving bounded
AND monotonic progress), `test_sheetDoctor_detectsAndCollapsesDuplicates` and
the `cnCountNotesResult_` smoke tests (renamed from `countCallNotesInRange_*`
by cycle-13 A4), PLUS two new smoke tests for the
cycle-12 pure helpers (`cn_enrolledSheetId_trimsAndNullGuards`,
`cn_appendBounded_capsAndRollsBack`) ≈ 301, +1 cycle-13
(`timeToMins_nullOnUnparseable`) ≈ 302. Use
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

A third, **static-render VISUAL harness** lives in `test/visual/` (adopted from
the cycle-11 visual audit): `node build.mjs` inlines the production partials
into a standalone `page.html`, and `node shoot.mjs` renders a 43-scenario
matrix (tool × wide/compact/mobile × light/dark) in headless Chromium with a
fixture-backed `google.script.run` mock, writing `shots/*.png` + `report.json`.
It is **manual / on-demand like the editor suite — NOT in CI** (needs a
Chromium install; findings need human eyes). Run it before deploying changes to
`styles*.html` or any view partial. Two rules from its own README: **fixtures
MUST mirror the real server contract** (two fixture-shape bugs — a wrong
`coachAnalytics_` shape and a pre-formatted `lastPunchTimeMgr` — produced
convincing fake defects before this rule), and a `report.json` `missing` entry
means the scenario rendered a loader, not the real view — add the fixture
before trusting the screenshot. **A fixture must never REIMPLEMENT server logic
(cycle-15 F4):** the Team Metrics fixture hand-rolled the queue→department fold
and had already drifted — it omitted the per-group `queues.sort()` — so every
screenshot showed an ordering the server cannot produce. `mock.js` now carries
VERBATIM copies of `groupQueueRows_`, `CDR_QUEUE_UNGROUPED` and the
`CDR_QUEUE_GROUPS` seed under a DO-NOT-EDIT banner, pinned byte-identical by the
F4 mirror test. Copy server logic in and pin it; never paraphrase it.
See `test/visual/README.md`.

### Health Dimensions
Overall, Correctness, Security & Access Control, Data Integrity, Timezone Correctness, Concurrency Safety, Test Coverage, Code Clarity & Docs, Apps Script Best Practices, Manager UX, Employee UX, Automation Reliability, UI/UX & Accessibility

(**UI/UX & Accessibility** added 2026-07-27, template R18. It is the INTERFACE
dimension — keyboard/assistive access, empty/loading/error-state completeness,
responsive posture, theme completeness, design-token adherence, contrast, and
visual hierarchy across the nine client subsystems. It is deliberately DISTINCT
from Manager UX / Employee UX, which score workflow EFFECTIVENESS ("does this
surface serve the job well") rather than interface CORRECTNESS. Cycle 12 is why
it exists: an operator-requested visual addendum found two Mediums — the four
`-deep` semantic tokens resolving to the wrong hue family, and AM/PM at 1.20:1
in dark mode on the live clock — that eleven code-lens cycles could not reach,
and there was no dimension to score them against.)

### Horizontal (Axis B) Categories
Silent Degradation Posture | failures swallowed so the app continues with wrong results instead of surfacing an error (best-effort email, the CDR-overlay try/catch, optimistic-UI reverts, JSON-parse → null)
Parallel Source-of-Truth Drift | the same value duplicated across places that can diverge (`LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_` ↔ `TIME_OFF_TYPES` ↔ modal options; `CN_EMAIL_PALETTE` ↔ design tokens; `AUTO_COPY_FORMAT` server default ↔ client fallback)
Operator-Only State Gaps | setup living only in Script Properties / manual triggers / the operator's head (`ADP_SS_ID`, `CDR_SS_ID`, `MANAGER_EMAILS`, `CN_FEATURE_FLAGS`, trigger install, per-rep Sheet enrollment, form-retention window)
Sheets-Coercion & Timezone Integrity | Sheets coercing time/date/`TRUE`-`FALSE` on read, the CDR spreadsheet TZ mismatch (`getDisplayValues()`), per-rep-tz "today" derivation
PHI / Access-Boundary Leakage | audit rows staying PHI-free, manager-gating + caller-scoping, token-only public endpoints, `esc()`-before-`innerHTML`, voice/BAA, signature handling
Test Coverage Quality | whether tests actually guard regressions; the client DOM/RPC layer is manual-only; coupling tripwires (INV-95)
Visual / Interaction Regression Posture | whether a change to the shared layer (design tokens, `styles.html`, a shared component) silently breaks a surface no test renders — CSS specificity collisions between partials, `color-mix` hue drift, fixed-palette surfaces painted with theme tokens, dead rules that lose at equal specificity, hand-rolled components bypassing the shared ones (`mtRenderTable_`), and fixture/visual-harness fidelity

### Subsystems
Server:
  web-app/Code.js, web-app/DevTools.js, web-app/appsscript.json, web-app/.clasp.json, scripts/push-env.sh
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
  web-app/Tests.js, test/client/harness.js, test/client/run.js, test/client/dom/boot.js, test/client/dom/runDom.js, test/visual/build.mjs, test/visual/mock.js, test/visual/shoot.mjs, test/visual/a13-measure.mjs, test/visual/map-check.mjs, test/visual/settings-check.mjs, test/visual/package.json, .github/workflows/client-tests.yml, scripts/cycle-context.mjs, package.json

### Invariant Library
INV-01 | All mutating server functions acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally`. DOCUMENTED EXCEPTIONS (cycle-11 seams audit): the intake send endpoints (`intakeSendPPD`/`intakeSendAcct_`) are deliberately lock-free — append-only writes (atomic in Sheets) with an in-body MailApp send that the M-7 no-mail-in-lock rule would otherwise force out; `kbRecordView`/`recordClientError` use the USER lock (batch K-B — diagnostics appends must not queue punch writes) | Subsystem: Server
INV-02 | All manager-gated functions verify `callerEmp.isManager` before any side effect and return `{ error: 'Manager access required.' }` (or `success: false`) on failure | Subsystem: Server
INV-03 | PTO balance changes in `updateTimeOffStatus` fire only on Pending→Approved (deduct) or Approved→non-Approved (restore) transitions | Subsystem: Server
INV-04 | Date inputs match `/^\d{4}-\d{2}-\d{2}$/` and time inputs match `/^([01]\d|2[0-3]):[0-5]\d$/` (enforces 24-hour validity, not just `HH:mm` shape) before any sheet write | Subsystem: Server
INV-05 | Future-dated punches are rejected: both `date > todayStr` and same-day `time > nowTime`. Since cycle 9 (L-4) the MANAGER writers enforce the same-day future-time reject too — `managerSaveDay` and `managerSaveDayRange` reject any slot time past "now" in the TARGET employee's tz (the HH:mm-vs-HH:mm:ss lexicographic compare is correct: `'17:01' > '17:00:33'`), matching `recordPunch` and the cycle-7 adjust-queue guard. Documented edge: a pre-existing same-day future punch (only writable pre-fix) now blocks even its own no-op re-save until blanked/fixed | Subsystem: Server
INV-06 | Employee adjustments beyond `CONFIG.ADJUST_WINDOW_DAYS` are rejected; beyond `CONFIG.OLD_ADJUST_ALERT_DAYS` a non-empty reason is required | Subsystem: Server
INV-07 | Manager punch deletes are rejected when older than `CONFIG.MGR_DELETE_WINDOW_DAYS` (daysBack computed in the target employee's timezone). BACKWARD-only since cycle 10 (C7): the prior `Math.abs` made the window symmetric, blocking deletes of far-future garbage rows while contradicting this invariant's semantics — a future-dated row (un-creatable through the guards; direct-edit/legacy only) is now always deletable for cleanup — and since cycle 11 (L-14) the dashboard's `recentPunches.canDelete` matches (its `Math.abs` dropped), so the cleanup path is reachable from the UI. `deletePunch` is also duplicate-aware since cycle 11: it clears the personal-sheet mirror only when NO duplicate row of the same (emp, date, type) survives (pre-INV-155 leftovers), matching `managerSaveDay`'s M-1 collapse semantics | Subsystem: Server
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
INV-18 | Bi-weekly period boundaries are computed from the FIRST `'biweekly'` row in the Employees sheet **that also carries a non-empty `PAY_ANCHOR`** (cycle-11 doc fix — a blank-anchor biweekly row is silently skipped and a later anchored row wins) via the anchor-floor formula in `getCurrentBiweeklyRange_` | Subsystem: Server
INV-19 | US holiday observance shift: Saturday → previous Friday, Sunday → following Monday (handled by `fixedHoliday_`) | Subsystem: Server
INV-20 | Test impersonation uses `_TEST_OVERRIDE_EMAIL`, consumed only by `getActiveUserEmail_()`, and is cleared in `finally` by every entry point | Subsystem: Test Suite
INV-21 | `cleanupTestData()` removes every row whose employee ID starts with `TEST_` across Timesheet, TimeOffRequests, and AuditLog; production IDs must never start with `TEST_`. **AMENDED (operator 2026-08-17): cleanup also RE-OFFBOARDS the test roster rows** (clears their emails, keeping ID/name/balances/fixture-sheet id — the INV-183 convention) and `setupTestEnvironment` re-onboards them at the start of the next run, so between runs the test accounts never render beside real agents on team surfaces; the old ID-keyed setup dedupe could not repair a hand-offboarded row and cascaded 119 failures. Cycle-11 M-2/M-3 extensions: it ALSO sweeps `FormSubmissionReceived` witness rows + FormTokens/FormSubmissions orphans by the reserved test recipient domain `example.invalid` (the witness actor is `EXTERNAL`, not `TEST_`-matchable), and the KB store's Quizzes tab by `TEST_`-prefixed title (live + fixture, incl. fixture QuizAttempts) | Subsystem: Test Suite
INV-22 | Live (non-adjustment) punches in `recordPunch` are rejected if within `CONFIG.MIN_PUNCH_INTERVAL_SECONDS` (30s) of the previous punch; adjustments bypass this check | Subsystem: Server
INV-23 | `selfDeletePunch` only deletes punches that are (a) dated today OR yesterday in the rep's tz, (b) within `CONFIG.SELF_UNDO_WINDOW_SECONDS` (300s) of REAL elapsed time — computed from the punch's rep-local datetime in ms (cycle-8: the old same-day string-diff check rejected the documented midnight wrap twice over, so "punch 23:58, undo 00:02" never worked server-side; the yesterday allowance is bounded by the same 5-minute elapsed window, and an unparseable time fails closed) — and (c) not adjustments; it writes a `PunchSelfUndo` audit row for the deletion (cycle-11 doc fix: the row delete lands FIRST, then the audit row, inside the same lock — matching `cancelTimeOffRequest`'s ordering; a crash between the two loses the trail, accepted) | Subsystem: Server
INV-24 | `getTeammateStatus` response is restricted to `{ name, status, isSelf }` per teammate — no emails, IDs, last-punch times, or timezones leak to non-managers | Subsystem: Server
INV-25 | `managerSubmitTimeOff` requires `callerEmp.isManager`; when `autoApprove=true` it skips the Pending stage, applies the PTO deduction in the same call, and emails the employee a decision notice | Subsystem: Server
INV-26 | All reads of `row[ADP.TIME]` (and any cell that may hold a time value) go through `normalizeTime_`, which detects Date objects and re-formats via the spreadsheet's timezone | Subsystem: Server
INV-27 | PTO UI visibility is the conjunction of `CONFIG.ENABLE_PTO_TRACKING` (global) AND `emp.ptoEnabled` (per-row, defaulting to TRUE when column K is blank/missing) — applied in `getEmployeeState` and `buildCalendarForEmployee_` | Subsystem: Server
INV-28 | Whenever the `EMP` enum gains or changes columns, `ROSTER_CACHE_KEY` is bumped (currently `employee_roster_v11` — the AccruedThrough column R) so old cached entries with the wrong column shape are not served | Subsystem: Server
INV-29 | `normalizeDate_` uses the spreadsheet's timezone (`getAdpSS_().getSpreadsheetTimeZone()`) to format Date cells — not `CONFIG.TIMEZONE` — so dates round-trip consistently regardless of the script's timezone configuration | Subsystem: Server
INV-30 | All mutating Call Notes server functions (`submitCallNote`, `updateCallNote`, `setCallNoteFlag`, `setCallNoteResolved`, `deleteCallNote`, `emailFromCallNote`, `setCallNoteTrainingReply`, `setCallNotePinned`, `appendCallNoteFeedback`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`) acquire `LockService.getScriptLock()` with `waitLock(15000)` and release in `finally` (INV-01 generalized) | Subsystem: Server
INV-31 | Manager-gated Call Notes + Metrics endpoints (`managerGetCallNotes`, `managerSearchCallNotes`, `managerGetTrainingQueue`, `managerGetReviewCandidates`, `setCallNoteTrainingReply`, `managerGetShiftStats`, `managerGetUnresolvedActionCount`, `getTeamMetrics` (since 2026-08-18 NOT a rejection gate — a rep gets the whitelist-built aggregate, see INV-66; the shape boundary is pinned in `test_metrics_getTeamMetrics_nonManagerRejected`), `getMetricsAmbient`, `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`, `getCallNotesTagTaxonomy`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`, `managerGetFormSubmission`, `saveEmailTemplates`, `getCallNotesAuditLog`, `getCallNoteAuditHistory`, `getAutomationHealth`, `getStorageHealth`, `getDeployReadiness`, `getAdminSheetView`, `getRetentionConfig`, `saveRetentionConfig`, `kbConvertDriveDoc`, `kbGetUsageStats`, `getCallNotesTagTrends`, `kbGetReviewDue`, `kbMarkReviewed`) verify `callerEmp.isManager` before any side effect (INV-02 generalized; pinned in `test_managerGates_rejectNonManager` alongside `getPunctualityReport`, `getDeployReadiness`, and a `getDeptRequests` no-manager-fields-leak assertion). **AMENDMENT (Dashboard work):** the five Spanish-inbox endpoints (`getSpanishInboxStats`/`Pending`/`Resolved`/`ThreadBody`/`resolveSpanishThread`) are NO LONGER pure-manager-gated — they gate on `canSeeSpanishInbox_(emp)` = `isManager OR email ∈ SPANISH_INBOX_MEMBERS` (the bilingual reps who action the inbox get the FULL feature, bodies included; the gate still fires BEFORE any GmailApp access). `resolveSpanishThread` (operator feedback 2026-07-09) is the MANUAL mark-resolved for requests handled outside the thread: scope-guarded like `ThreadBody` (the thread must be addressed to the configured inbox — since cycle 8 an EXACT parsed-address match via `spanishAddrListIncludes_`, Node-pinned, not the old raw substring `indexOf` which passed `xspanishcalls@…`; and the Gmail scans use `spanishSearchQuery_`'s `{to: cc:}` brace-OR so Cc'd requests enter stats/pending/resolved too), locked (INV-01), idempotent, PHI-FREE (append-only `SpanishManualResolved` tab on the ADP sheet — threadId + resolver + ms only, the ms as a NUMBER cell so no date coercion; `SpanishInboxResolve` audit row carries the threadId only). All three readers consult `spanishManualResolvedMap_` (bounded 1000-row tail): pending drops the thread immediately (live-read), stats/resolved count it as resolved (in-thread reply wins when both exist; stats reflect within the 5-min cache TTL — the INV-43 posture). **Cycle-17 batch ⑥: all three readers scan via the named `SPANISH_THREAD_SCAN_MAX` (200 — the silent GmailApp.search bound) and return `truncated` (threads.length ≥ cap ⇒ possibly more; the INV-169 class)**; the Spanish tab renders "scan capped at 200 threads — figures may be incomplete; narrow the window" on the stats note and both list tabs (`spanishTruncNote_`). The Dashboard Spanish card deliberately omits the note (space); the field is additive. The gate test asserts a non-member rep is rejected with the `Spanish Inbox access` error on all five; `getEmployeeState` ships `canSeeSpanish` so the client gates the `metricsSpanish` tab + the dashboard Spanish card | Subsystem: Server
INV-32 | Every state-changing Call Notes action writes an audit row via `writeAuditLog_` (`CallNoteCreate` / `Edit` / `Flag` / `Resolve` / `Delete` / `Email` / `TrainingReply` / `Pin` / `Feedback` / `TagAdmin`) with `noteId=<uuid>` in the notes field — the audit log is the only cross-rep trail of call-note activity. Manager-actor rows (TrainingReply, TagAdmin) carry the manager's email as actor via the actorEmail parameter. `Feedback` (Round 2 · 8g) records agent acks + clarifications in the multi-turn Q&A thread. `TagAdmin` (Round 2 follow-on) records rename / merge / archive batch operations on the tag taxonomy with `{action, oldTag/newTag, repsTouched, notesUpdated}` summary in the notes field | Subsystem: Server
INV-33 | `submitCallNote` does NOT send a department email. Sending is a separate two-stage flow: `previewCallNoteEmail` (returns rendered HTML for confirm-before-send) then `emailFromCallNote` (sends + stamps EmailedAt/EmailDepartments + writes audit). Exception: when `flagType=training` and `subformData.trainingQuestion` is non-empty, `submitCallNote` fires a best-effort manager notification via `notifyManagerTrainingQuestion_()` (try/catch, does not block the response — see INV-58) | Subsystem: Server
INV-34 | `setCallNoteResolved` rejects calls when `FlagType !== 'action'`; only action-flagged notes have a resolved state | Subsystem: Server
INV-35 | `getCallNotesSheet_(emp)` throws "Your call-notes Sheet is not configured" when `emp.callNotesSheetId` is missing — call-notes endpoints surface this as the enrollment-missing splash in the client. Enrollment is either manual (paste the ID into column L) or one-click via the manager-gated `provisionCallNotesSheet` (INV-110); `getCallNotesSheet_` itself never auto-provisions a Sheet on a read | Subsystem: Server
INV-36 | Call-note email sends (`emailFromCallNote`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`) are wrapped in try/catch and never block the API result (INV-14 generalized) | Subsystem: Server
INV-37 | `sanitizeFlagType_` only allows `''` / `'action'` / `'training'` / `'review'` to be written to FlagType; unknown values silently coerce to `''` rather than corrupting the column | Subsystem: Server
INV-38 | Compact-mode is a shell-level attribute (`data-compact="1"` on `documentElement`); set from the `?compact=1` URL param on boot and consumed via CSS selectors in `styles.html`. Tool views SUPPRESS their `.view-title-row` when `COMPACT_MODE === true`. They no longer render a `.compact-header` in its place — that strip repeated the window title + the tab bar immediately below it, costing ~44px at the top of the app's smallest window; retired with its CSS and all twelve render sites (operator 2026-08-11) | Subsystem: Client (shell)
INV-39 | `getCallNotesAmbient` is authenticated to the caller (requires registered employee), read-only — returns `{enrolled, unresolvedActionCount, staleActionCount, todayTotal, weekTotal, flagCounts, staleFlagHours, flagsVersion}` for the calling rep (`weekTotal` + `flagCounts {all,action,training,review,unresolved,qa}` added in Phase 4 for the Log view's stats-mini + quick-chip-row; `flagsVersion` = `cnFlagsVersion_()`, a compact encoding of the client-deliverable feature flags so the poller can detect a manager toggle flip and refetch config within ≤60s — see the runtime-flag flip-semantics decision). Cached for `CN_AMBIENT_CACHE_TTL` (60s) under `CN_AMBIENT_CACHE_PREFIX + emp.id`. The cache is purely TTL-driven; mutating endpoints do NOT eagerly invalidate (the 60s ceiling matches the sidebar polling interval). Used by the sidebar badge polling + Log view stats; never leaks cross-rep data | Subsystem: Server
INV-40 | `setCallNoteFlag` clears `Resolved` (sets to `'FALSE'`) on any flag-type transition (`oldFlag !== t`), not only on full clear — so stale `resolved=TRUE` from a prior action-flag cycle doesn't resurface when the rep flips back to action | Subsystem: Server
INV-41 | `previewCallNoteEmail` returns `bodyHash` (SHA-256 hex over `htmlBody + subject + to`). `emailFromCallNote(noteId, payload, expectedBodyHash)` requires the hash and refuses to send when the freshly re-rendered body's hash doesn't match — guards against the rep editing the note between Preview and Send | Subsystem: Server
INV-42 | `emailFromCallNote` sends via MailApp first (wrapped in its own try/catch — failure returns `success: false`), then stamps `EmailedAt` / `EmailDepartments` / `Subform` metadata in a separate try/catch. A stamp failure after a successful send logs to console and returns `success: true` so the rep doesn't re-send a duplicate | Subsystem: Server
INV-43 | Mutating CN endpoints do NOT eagerly invalidate the ambient cache. The 60s `CN_AMBIENT_CACHE_TTL` is the sole freshness ceiling and matches the sidebar polling interval — badge can be at most 60s stale, same as if invalidation happened on every mutation. `invalidateCnAmbientCache_` is retained for manual operator use (e.g., after a direct Sheet edit that should reflect in the badge immediately) but is no longer called from the mutation hot path | Subsystem: Server
INV-44 | The seventeen trigger-handler endpoints (`sendDailyMissedPunchAlerts`, `runDailyExportCheck`, `sendCallNotesEodDigest`, `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`, `sendTrainingOverdueDigest`, `purgeExpiredFormData`, `purgeOldCallNotes`, `archiveOldCallNotes`, `purgeArchivedCallNotes`, `reconcileCallNotes`, `sendAutomationHealthDigest`, `sendDeptRequestReminderDigest`, `sendManagerDailyBrief`, `archiveOldTimesheetRows`, `runNightlySelfTest`, `creditMonthlyPtoAccruals`) call `assertManagerCaller_(label)` at the top. **A source-level Node tripwire (`run.js`) now asserts EVERY install-`TARGETS` handler calls `assertManagerCaller_` AND references no `.isAdmin` in code — the exact F1 regression class (a trigger gated on `emp.isAdmin` silently no-ops the nightly run under a narrowed `ADMIN_EMAILS`).** Required because they're top-level (time-based triggers won't bind to underscore-suffix functions) and therefore reachable via `google.script.run`. `purgeExpiredFormData` / `purgeOldCallNotes` / `purgeArchivedCallNotes` are destructive (delete FormSubmissions/FormTokens, per-rep live Notes, and per-rep NotesArchive rows past their retention windows) so the gate is load-bearing; `archiveOldCallNotes` is non-destructive (moves rows to a `NotesArchive` tab, data preserved) but still deletes from the live `Notes` tab, so it carries the same gate. `reconcileCallNotes` is fully non-destructive (it back-fills NoteId/Timestamp/DateLocal, never deletes) but carries the SAME gate because it walks every rep's Sheet + writes — and CRITICALLY a trigger handler's gate MUST be the MANAGER_EMAILS `assertManagerCaller_` (the installer is validated against MANAGER_EMAILS), NEVER `emp.isAdmin`/the roster gate, which would silently no-op the nightly run under a narrowed `ADMIN_EMAILS` or a non-roster installer (the reconcile F1/F2 regression, INV-109/INV-136). Pinned by `test_triggerGate_purgeOldCallNotes_nonManagerThrows` / `_archiveOldCallNotes_` / `_purgeArchivedCallNotes_` / `_purgeExpiredFormData_` (+ `test_reconcileCallNotes_nonManagerRejected` for the reconcile gate) | Subsystem: Server
INV-45 | `searchMyCallNotes(query, field, dateRange, exact)` — when `exact === true`, matches `patientAndTrx` exactly (case-insensitive, trimmed) and ignores `field`. Otherwise `field ∈ all \| caller \| issue \| phone \| trx`: `all` matches across (caller, callback, patientAndTrx, issue, resolution); `caller` matches (caller, callback, patientAndTrx); `issue` matches (issue, resolution); **`phone` matches the callback number ONLY; `trx` matches patientAndTrx ONLY** (scope-isolated — a `phone` search never matches a TRX token, and vice-versa). The same field-scope set applies to the manager-gated `managerSearchCallNotes`. Used by the "Find prior calls for this TRX" card button + the Search tab's field-scope tabs. Pinned by `test_cn_search_phoneTrxFieldScopes` | Subsystem: Server
INV-46 | `exportCallNotesRange(startDate, endDate)` is manager-gated, read-only across all enrolled reps' Sheets. Creates a new Sheet with a 15-column schema (RepId, RepName, DateLocal, Timestamp, Callback, Caller, Relationship, PatientAndTRX, Issue, TransferredTo, Resolution, FlagType, Resolved, EmailedAt, EmailDepartments) and writes a `CallNotesExport` audit row before returning. A broken per-rep Sheet doesn't fail the run — **but since cycle-17 C17-6 it no longer "skips that rep" silently either (that clause described the defect, the same INV-52 correction cycle-16 F1 made): the skipped set rides the response (`skippedReps`, additive), the audit row (`skippedReps=N (ids) — INCOMPLETE`), and a client warn toast, and an all-skipped run returns a read-failure error instead of "No notes found" — a PHI export can never read as complete when it isn't (INV-187).** Pinned by the C17-6 pin | Subsystem: Server
INV-47 | `getManagerDashboard` pending[] entries carry `conflictsOff: [{name, status, type}]` (other reps off the same day, excluding self) and `holidayName: string|null` (US holiday name). Computed from a date→requests index built once per dashboard load + a holiday map keyed by years present in pending requests. The manager dashboard surfaces both inline on each pending card and echoes them into the Approve confirm dialog | Subsystem: Server
INV-48 | Optimistic UI on the Call Notes hot path: `cnSubmitActiveForm_`, `cnToggleFlag_`, and `cnToggleResolved_` mutate `CN_STATE.rollingNotes` and re-render BEFORE the server RPC fires. Pending notes carry `_pending: true` and render with reduced opacity + a "Saving" badge in place of action buttons. Server failure triggers `cnRevertPendingSubmit_` (for submit) or restores the prior flag/resolved state (for toggles), and surfaces a clear toast. The submit snapshot captures the full multi-flag array (incl. `urgent`) + tags + training question — not just the single primary flag — so a failed submit recovers everything the rep typed (`cnRestoreFromSnapshot_` prefers `snap.flags`/`snap.tags`; F2 fix). The revert NEVER clobbers newer work: it restores into the form only when the form is still empty (same 5-field check as the Ctrl/⌘+Z path); with new typing present the form is left untouched (the failed note remains on the clipboard from the optimistic copy), and after a nav-away the snapshot is parked in the sticky-draft slot via `cnSaveSnapshotAsStickyDraft_` so the next Log view restores it (Cycle 2 · M4). Auto-copy also runs in the optimistic path so the rep can paste into the CRM before the network acknowledges anything | Subsystem: Client (Call Notes views)
INV-49 | `setCallNoteTrainingReply(repId, noteId, reply)` is manager-gated, locked, and rejects calls on non-training-flagged notes (parallels INV-34's resolve-only-on-action rule). Merges the reply + author email + reply timestamp into the target rep's `subformData.trainingReply` / `trainingReplyBy` / `trainingReplyAt` keys (no schema migration). Round 2 · 8g also appends `{role:'manager', kind:'reply', message, at, by}` to `subformData.feedback[]` for the multi-turn Q&A thread. Empty reply clears the three trainingReply keys but does NOT remove prior feedback[] entries (the thread is append-only). Writes a `CallNoteTrainingReply` audit row with the manager's email as actor. **Do NOT retire the legacy `trainingReply` write** (investigated as B4): it is the clearable "current answer" pointer — distinct from the append-only `feedback[]` history — and several readers key off it precisely so a *cleared* reply disappears (the 'answered' filter, the ambient QA count, `getMyTrainingQA`, the digest helper). Removing the write + making those readers feedback[]-aware would make a clear a no-op (feedback[] always wins), regressing S35. A safe retirement would first redefine clear as a `feedback[]` retraction marker — deferred | Subsystem: Server
INV-50 | `setCallNotePinned(noteId, pinned)` is caller-scoped (operates on the caller's own per-rep Sheet), locked, and enforces `CN_PIN_LIMIT` (currently 3) inside the lock so two parallel pin requests can't both squeak past the cap. Pin state lives in `subformData.pinned` (boolean) + `subformData.pinnedAt` (timestamp). Writes a `CallNotePin` audit row | Subsystem: Server
INV-51 | `getMyPinnedCallNotes` returns the caller's pinned notes across ALL dates (no date filter), sorted newest-pinned first. The Log view's pinned tray spans the rep's entire pin history — a complex case pinned last week is still visible today | Subsystem: Server
INV-52 | `managerGetShiftStats(date)` is manager-gated, read-only across all enrolled reps' Sheets. Per-rep aggregates: `totalNotes`, `flagCounts {action, training, review}`, `resolvedCount`, `emailsSent`, `medianCompletionSeconds`, `shiftSpan {first, last}`. Median (not mean) is used for completion seconds; outliers > 30 min are stored as null in `subformData.completionSeconds` upstream so they never enter the dataset. A broken per-rep Sheet doesn't fail the run — but since cycle-16 F1 it no longer "skips that rep" silently either (this clause described the defect): the rep is returned with **`notesUnavailable: true`** and a **null `noteCoverage`**, and the client renders an em dash across all six note-derived columns instead of the zeros that read as "logged nothing all shift". See the note-count gotcha — this surface counts INLINE, which is why the cycle-12 F5 sweep never reached it | Subsystem: Server
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
INV-66 | `getTeamMetrics(from, to)` requires an enrolled caller; since 2026-08-18 (operator: reps should have team metrics) a NON-manager gets the whitelist-BUILT team AGGREGATE via `teamMetricsRepView_` (`repView:true`; teamTotals/trend/queue+department folds/thresholds — NEVER the per-rep `reps[]` rows or the roster↔CDR name diagnostics: INV-124's individual-numbers posture), applied on BOTH return paths since the org-wide cache stores the FULL manager payload; managers get the full response as before. Accepts a date range **capped at 92 days** (cycle-18 F3 — it was the one range endpoint with no overall span cap, so a hand-typed decade both scanned every enrolled rep's notes Sheet across it and, being org-wide-cached by range, pinned that cost for the TTL; the sibling `getMyMetricsRange` had carried the same 92-day cap since it shipped); single date collapses to `from === to`. CDR aggregation uses `getCdrAgentMetrics_()` for the range, note counts scan each enrolled rep's call-notes Sheet across the full range. Single-day mode returns the 30-day team trend; **multi-day mode returns a per-day TEAM trend over the SELECTED range since the operator #8 batch (2026-08-06)** — span-capped 2–92 days (getTeamMetrics has no overall span cap, so an unbounded manual range must not trigger the extra per-day scan) and BEST-EFFORT (the INV-67 posture: a thrown range-trend read leaves `trend` null, the pre-#8 shape — a missing sparkline is not a reassuring degradation). The client delta line names its comparison ("vs period daily average" multi-day / "vs 30-day team average" single-day). Also ships `alertThreshold` (#4) and `teamTotals.transferPct` with its OWN Transfer-sheet denominator (`transferCalls`, never `rung`; null without it — INV-129). `unmatchedAgents` lists CDR agent names not on the team-tools roster (cycle 7 M-11: sourced from `getCdrAgentMetrics_`'s `meta.offRosterAgents`, recorded BEFORE its roster filter — the old loop over the roster-filtered result could never find one) | Subsystem: Server
INV-67 | CDR enrichment in `managerGetShiftStats` is wrapped in a try/catch after the core call-notes aggregation loop. Failure does not break the existing response — `reps[i].cdr` is simply absent. CDR cache (`CDR_CACHE_KEY`, 5-min TTL) is shared across `getCdrAgentMetrics_()` calls but NOT across `getCdrDailyBreakdown_()` (the latter is uncached since it returns per-day granularity needed only for trend rendering) | Subsystem: Server
INV-68 | `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()` are the isolated CDR data layer. Both open the CDR Report spreadsheet via `getCdrSS_()`, read `DQE Historical Data`, filter by date range + optional roster names, skip queue-sentinel rows via `isCdrQueueSentinel_()`. Both call `validateCdrColumns_()` on first access to check header positions against `CDR_EXPECTED_HEADERS` and `getCdrNameMap_()` to resolve Agent Alias Overrides before roster matching. Designed as the Option A (direct spreadsheet read) implementation — a future swap to Neon Postgres (Option C) replaces only these two functions + `getCdrSS_()` | Subsystem: Server
INV-69 | `getManagerDashboard` returns `pendingTrend` (14 days, new pending submissions per day, INCLUDES today) + `missedTrend` (14 days, missed-clockout instances per day, EXCLUDES today since reps still mid-shift would always register as missed). Both computed in-memory from already-loaded `toRows` / `adpRows` (INV-13 honored — no extra Sheet reads). Used by the V4·E2 telemetry-strip sparklines on Missed + Pending cells | Subsystem: Server
INV-70 | `getManagerDashboard` attaches `recentHours[]` (7 entries `{date, hours}`, oldest→newest, excludes today) to each `liveStatus` entry. Computed via one extra in-memory pass over already-loaded `adpRows` and `calcHours_`; days without both a `ClockIn` and a `ClockOut` are recorded as 0 hours. Used by the V4·E3 per-rep sparkline on the manager dashboard's live-status cards | Subsystem: Server
INV-71 | Clock view's "until end of shift" countdown (in `buildStatusSentence_`) and the day ribbon's scheduled band (in `renderDayRibbon_`) both anchor to the rep's first `ClockIn` + the scheduled length once they've clocked in; before that, both fall back to the rep's configured shift from `CONFIG.SHIFT_SCHEDULE` (default 8:00–17:00 CST, per-timezone overrides — e.g. PH `Asia/Manila` 8:30–17:00). The schedule is resolved server-side by `empShiftSchedule_(emp, tz)` — the roster column-O per-rep override wins, else the per-tz `getShiftSchedule_(timezone)` (Turn D, INV-149) — → `{startMin, lengthMin}`, shipped on `getEmployeeState`, and read client-side via `CLK_SCHEDULE` (`clkSchedStartMin_` / `clkSchedLenMin_`, falling back to `RIBBON_DEFAULT_*` if absent) | Subsystem: Server + Client (Time Clock views)
INV-72 | `LEAVE_DEDUCTION_CLIENT` in `tc/script_timeoff.html` must mirror server's `getLeaveDeduction_` (Code.js) for the PTO day modal's balance-after preview to compute correctly. The server still performs the actual deduction on submit (via `updateTimeOffStatus`'s Pending→Approved transition), so a drift causes UI mis-preview but not balance corruption. Adding a new leave type requires updating BOTH maps. Both maps RETAIN the `sick` mapping (mirror intact) even though `Sick Leave` is no longer a creatable type (INV-17/INV-95) — kept for legacy-row reverts/reconciliation | Subsystem: Client (Time Clock views) + Server
INV-73 | Day-ribbon now-cursor refresh interval (`_ribbonNowInterval`, 60s) is bound to the `startClock` / `stopClock` lifecycle via `startRibbonNowCursor_` / `stopRibbonNowCursor_`. When the Clock view is exited via tab navigation (Time Off / Manager / Call Notes / Metrics enters all call `stopClock` at the top), the interval clears alongside the 1Hz live-time interval | Subsystem: Client (Time Clock views)
INV-74 | (Removed in Round 2 · 8b.) The Clock view's pay-period ledger cell + the `lazyUpdatePayPeriodCell_` lazy hook were both removed when the timesheet section moved to the Time / PTO tab. The orphaned timesheet render cluster (`loadTimesheet` / `renderTimesheetView` / calendar+card renderers) was fully pruned in Cycle 2 (L11) — `tc/script_timesheet.html` now holds only the live `computeRange` / `isoFromMs` range helpers used by the Time / PTO side rail | Subsystem: Client (Time Clock views)
INV-75 | `submitCallNote` accepts `payload.flags[]` (multi-select via `sanitizeFlagsArray_`) and `payload.tags[]` (free-text kebab-case via `sanitizeTagsArray_`) in addition to the legacy `payload.flagType` single string (a lone `flagType='urgent'` with no flags[] folds into `flags:['urgent']` — cycle 7 L-13; previously accepted-then-discarded). **Cycle 7 M-15: client-supplied `subformData` keys are WHITELISTED at submit** — only `trainingQuestion` (≤2000 chars) + `completionSeconds` survive; `trainingReply*`/`feedback[]`/`pinned`/`formSubmission`/`externalEmails` are stripped (they are server-written by their own gated endpoints), so INV-49/50 are server-enforced, not client-honor-system (pinned by the sanitizeCallNotePayload_ Node tests). Server folds flags/tags into `subformData` (no new Sheet column required) and derives the `FlagType` column from `flags[]` via priority order (`action` > `training` > `review` > `urgent`). `urgent` never enters the `FlagType` column (INV-37 preserved — `sanitizeFlagType_` still rejects it); it lives in `subformData.flags` only so existing manager digests / queues are unaffected. Pin stays in `subformData.pinned` with its 3-cap (INV-50) — not in flags[] | Subsystem: Server
INV-76 | `appendCallNoteFeedback(noteId, message, kind)` (Round 2 · 8g) is rep-callable (operates on caller's own per-rep Sheet), locked, and rejects calls on non-training-flagged notes (parallels INV-34 + INV-49). Appends `{role:'agent', kind:'ack'\|'clarification', message, at, by}` to `subformData.feedback[]`. `kind='ack'` with empty message renders as 👍 Got it; `kind='clarification'` requires a non-empty message. Writes a `CallNoteFeedback` audit row | Subsystem: Server
INV-77 | `setCallNoteFlag(noteId, flagType)` accepts `'urgent'` as a card-level toggle (Round 2 deferred 8e). Urgent bypasses the `FlagType` column entirely (`sanitizeFlagType_` still rejects it, INV-37 preserved) — toggles membership in `subformData.flags` only. `action`/`training`/`review`/`''` paths still flow through `FlagType` + reset `Resolved` on transition (INV-40); after writing `FlagType` the new primary value is also mirrored into `subformData.flags` (pruning conflicting `CN_FLAG_TYPES` entries but preserving `'urgent'`) so the form's multi-flag state stays consistent with the column | Subsystem: Server
INV-78 | URL query params (`?compact=1`, `?tool=<tabKey>`, `?prefill=...`) are passed from `doGet` to the client via template evaluation (`tpl.serverQueryParams = e.parameter`) and exposed as `window.SERVER_QUERY_PARAMS` in `index.html`'s `<head>`. `__URL_PARAMS` in `script_core.html` reads from `SERVER_QUERY_PARAMS` first, falls back to `window.location.search` for local dev. Required because Apps Script's HtmlService iframe sandboxes `window.location.search` to the iframe's own URL — the user-facing deploy URL's query string is never visible to client JS through that path. The injected JSON is `<` → `<` escaped to prevent XSS via attacker-controlled query values containing `</script>`. Also applies to `form_public.html`'s `FORM_TOKEN` injection via `serveExternalForm_` (`tpl.formToken`): it uses the same unescaped `<?!=` print with the `<`→`<` guard — the escaping `<?=` mangles the token's JSON quotes, breaking the public form ("Form not found"). A related foot-gun: the literal scriptlet delimiters (`<?`/`?>`) or a literal `</script>` written inside a JS *comment* in these templates open a spurious scriptlet at `tpl.evaluate()` (the template engine ignores JS-comment boundaries), throwing a server-side "Unexpected token" — so comments must not contain those literals. The same injection path now also carries `window.SERVER_WEB_APP_URL` (the canonical `/exec` base from `getWebAppExecUrl_`) — `window.location.origin+pathname` inside the iframe is the session-bound googleusercontent URL, which renders BLANK as a top-level window and broke the pop-out until fixed; `popOutCurrentView` must use `SERVER_WEB_APP_URL` (Node-pinned). Pinned by `test_tpl_formToken_usesUnescapedScriptlet` + `test_tpl_noEscapedJsonInjection` + `test_tpl_formPublic_evaluatesWithoutError` (the last actually `.evaluate()`s the template, catching the comment-delimiter case) | Subsystem: Server + Client (shell)
INV-79 | Resizable sidebar width persists to `localStorage.umsSidebarW` (range 56–280px on restore — out-of-range values fall back to the default). Default 168px; snap threshold 100px determines the collapsed (icon-only) state. `initResizableSidebar_` sets `--sidebar-w` on both the `.sidebar` element AND `documentElement` so the `.app-shell` grid template recomputes. `.sidebar.collapsed` hides `.sb-lbl` labels + brand sub-name + user info text + section labels via CSS | Subsystem: Client (shell)
INV-80 | **AMENDED (operator 2026-08-18): the Time/PTO mode toggle is RETIRED — one consolidated page.** The original invariant (persisted `umsMergeMode` picking which side rail renders) is void: the two modes were one page with a swapped 240px rail, so the rail now stacks the quick-actions card + the annual-leave `.pto-tile` + the pay-period block unconditionally, and `loadTimesheetSideRail_` (its own `getTimesheetData` call; the legacy `loadTimesheet` cluster was deleted in Cycle 2 · L11 — INV-74) runs on every render. `umsMergeMode` is retired (a stale stored value is ignored; localStorage count 17→16) and the `.mp-mode` selectors are deleted (INV-184). What SURVIVES of the invariant: the TOOLS registry tab key stays `'timeoff'` even though the label is `'Time / PTO'`, so `?tool=timeoff` deep-links + `currentView === 'timeoff'` guards keep working. Verify: the consolidation pin (no `umsMergeMode`/`mp-mode` in code; rail composed unconditionally; unconditional rail fetch) | Subsystem: Client (Time Clock views)
INV-81 | The Clock view's coverage-strip "File N missing" CTA fires `fileMissingCalls_(date, missingCount)` which sets `window.CLK_NAV_HINT { source: 'coverageStrip', date, missingCount }` before calling `enterTool('callNotes')`. `cnConsumeNavHint_` on Log-view enter reads + nulls the hint and surfaces a confirmation toast. Per-call CDR data doesn't exist today (DQE Historical Data is per-(agent, date) aggregated only), so unmatched call IDs can't be passed via the hint yet — when a per-call source lands, extend the hint with `hint.calls[]` for prefill | Subsystem: Client (Time Clock views) + Client (Call Notes views)
INV-82 | Tag taxonomy admin endpoints (`renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`) are manager-gated (INV-02) and acquire `LockService.getScriptLock` with `waitLock(15000)` (INV-01). Rename and merge use `applyTagTransformAcrossReps_` to iterate every enrolled rep's per-rep Sheet and rewrite `subformData.tags[]` in place; dedupe handles the case where the target tag is already present on a note. Archive only mutates the `CN_ARCHIVED_TAGS` Script Property (JSON-encoded array of lowercase tags) — existing note tags are unchanged, so archive does NOT remove the tag from cards already in production. All three write a `CallNoteTagAdmin` audit row (INV-32 extension) with the manager's email + `{action, oldTag/newTag, repsTouched, notesUpdated}` summary. Per-rep Sheet failures are isolated via try/catch in the loop so one broken Sheet doesn't fail the whole rename. All three call `invalidateCnTaxonomyCache_()` after their audit write so the Admin table reflects the change immediately. `getCallNotesTagTaxonomy` returns the `archived` flag on each in-use tag plus an `archivedOnlyTags[]` array for archived tags no longer in active use, and is itself whole-result cached (`CN_TAXONOMY_CACHE_KEY`, 5 min). **Cycle-17 batch ②:** the taxonomy walk carries `skippedReps` (reps whose Sheets could not be read — the Admin merged table renders the warn note) and a PARTIAL round is never cached (INV-129/187); same contract on the trends sibling (INV-125) | Subsystem: Server
INV-83 | `uiConfirm({title?, message?, confirmLabel?, cancelLabel?, tone?})` and `uiPrompt({title?, message?, initialValue?, placeholder?, validator?, confirmLabel?, cancelLabel?})` in `script_core.html` are Promise-returning replacements for `window.confirm` / `window.prompt`. All 14 native-dialog callsites across `tc/script_clock.html`, `tc/script_manager.html`, `tc/script_timeoff.html`, and `cn/script_callnotes.html` are converted — no `window.confirm` / `window.prompt` usage remains in the codebase. Esc + click-outside resolve `false`/`null`; Enter on a confirm fires OK unless the Cancel button is focused (a keyboard user who Tabs to Cancel and presses Enter gets cancel — confirming from Cancel fired destructive actions until fixed); Enter inside the prompt input submits. `tone:'danger'` paints the OK button destructive via `.ui-dialog-ok.is-danger`. `validator` on uiPrompt returns an error string and the dialog shows it inline WITHOUT closing so the rep can fix and retry. **That inline error must be ANNOUNCED, and the input must be NAMED (cycle-16 F6).** `uiPrompt` is the one dialog in the app that validates, and its input carried no accessible name (the title and message held the meaning but were not associated with the field, and a `placeholder` is not a name — it is not reliably announced and vanishes on first keystroke) while `.ui-dialog-err` was an ordinary div. A screen-reader user therefore heard "edit, blank", typed, was refused, and heard nothing at all — the dialog read as one that simply will not close. The input now carries `aria-labelledby` (the title) and `aria-describedby` (message + error slot, the error id ALWAYS present and only the message half conditional), and the error slot carries `role="alert"`. `uiConfirm` needs neither — no field, no validation — which is why the fix is `uiPrompt`-only rather than a rule over both. A `resolved` sentinel inside each helper prevents double-resolution if Esc + click-outside fire in quick succession. **Cycle-9 L-32: an Enter whose `e.target` is inside `#kb-drawer` is IGNORED by the confirm's key handler** — the drawer is exempt from the dialog focus trap (z-55, above the dialog) and Ctrl/⌘+K still opens it while a dialog is up, so an Enter aimed at the drawer's search box used to confirm a danger dialog it never targeted. **Stacked dialogs (cycle-8): each dialog's document-level CAPTURE keydown acts only when its own overlay is the TOPMOST `.overlay.open.ui-dialog`, and handles via `stopImmediatePropagation()`** — `stopPropagation` can't stop same-node-same-phase siblings, so one Escape used to resolve BOTH stacked dialogs (the bottom one with `false`, cancelling its flow). Multi-statement continuations are extracted into helpers (`cnDoDeleteNote_`, `cnDoToggleFlag_`, `cnDoSelfUndo_`, `handleBulkActionConfirmed_`) so click-handler signatures stay synchronous from the dispatcher's perspective. **EVERY `ensureOverlay` DIALOG CARRIES A NAME (cycle-18 batch 5A).** The factory sets `role="dialog" aria-modal="true"` on every overlay it creates, and a `role="dialog"` with no accessible name announces as the bare word "dialog" — all FIFTEEN did, so a screen-reader user opening the email composer, the PPD preview, the KB editor or the pay statement heard the same meaningless word every time. `ensureOverlay` now takes `label` (a literal string) or `labelledBy` (the id of a heading already in the markup, preferred where one exists); the two are MUTUALLY EXCLUSIVE BY CONSTRUCTION — setting either REMOVES the other attribute, because a stale `aria-labelledby` pointing at a node a re-render replaced silently wins over the `aria-label` beside it. **An inner `.modal` must NOT repeat `role="dialog"`:** five did, nesting a second unnamed dialog inside the named one, which is what the reader actually lands on. Adding a new overlay means passing one of the two options — the A14 dialog pin fails CI on an `ensureOverlay` call that passes neither, and a companion pin bans a nested `role="dialog"` in the scanned partials | Subsystem: Client (shell)
INV-84 | `cnRenderComposerTabStrip_(active, noteId)` renders a shared Department | External segmented control prepended to both the department composer (`cn-compose-overlay`, in both `cnRenderComposerFormStep_` + `cnRenderComposerPreviewStep_`) and the external composer (`cn-ext-overlay`, in `cnBuildExternalEmailHtml_`). `cnSwitchComposerTab_(target)` captures the active composer's noteId from `CN_STATE.composer` / `CN_STATE.extComposer`, closes the active modal (clearing its state slot via the close handler), and opens the target modal preserving the noteId. The Department tab is disabled when no noteId is in scope — a dept email needs a saved note to stamp EmailedAt/EmailDepartments — and `cnSwitchComposerTab_` guards defensively with a toast if the disabled state is bypassed. Cycle-10 notes: the external composer's "Link to note" change re-renders the strip in place (E4 — a standalone-opened composer's Department tab used to stay disabled + handler-less even after linking a note), and the External→Department→External round-trip DISCARDS the typed external draft by design (the Department direction restores from `subformData`; the external composer has no persisted store — a deliberate asymmetry, assessed and kept in cycle 10) | Subsystem: Client (Call Notes views)
INV-85 | `getCdrAgentMetrics_()` cache key includes an MD5 hash of the sorted roster-names array via `cdrRosterHash_()` so that different roster filters for the same date range don't collide. Cache payload size is logged at 90KB as a warning (Apps Script CacheService limit is 100KB). Cache key prefix is versioned (`CDR_CACHE_KEY`, currently `cdr_metrics_v3` — v3 added `meta.offRosterAgents`, the M-11 fix); bump on any aggregation-rule change | Subsystem: Server
INV-86 | `getCdrNameMap_()` reads the `Agent Alias Overrides` sheet from the CDR Report spreadsheet (same sheet written by `call-data-reporting`'s `OrphanFix.gs`). Returns `{ oldName → canonicalName }` for active aliases. Cached in-memory for `CDR_CACHE_TTL` seconds. Used by both `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()` to resolve CDR agent names that don't directly match the team-tools roster. Missing or empty sheet degrades gracefully (empty map) | Subsystem: Server
INV-87 | `validateCdrColumns_()` reads row 1 of `DQE Historical Data` on first CDR access per script session and asserts that expected column names (from `CDR_EXPECTED_HEADERS`) appear at the expected 1-indexed positions. Mismatches are logged via `Logger.log` and surfaced in `meta.columnWarning` on the response — non-blocking. Column names are matched case-insensitively via `indexOf`. Validation runs at most once per session (`_cdrColumnsValidated` flag) | Subsystem: Server
INV-88 | `getMetricsAmbient()` is manager-gated (INV-02), read-only, 5-min cached under a threshold-suffixed key (`metrics_ambient_v1:<threshold>`) so editing `CONFIG.CDR_ALERT_THRESHOLD` takes effect on the next poll instead of serving a stale badge for up to 5 min. Returns `{ badge: { type: 'warn', label: 'XX.X%', date } }` when yesterday's (weekday only) team answer rate is below `CONFIG.CDR_ALERT_THRESHOLD` (default 85%), else `{ badge: null }`. The client polls every 5 minutes via `mStartAmbientPolling_()` (started on shell render regardless of active tool, but only for managers — `mStartAmbientPolling_` early-returns for non-managers since the badge is manager-only, F13) and renders an `.m-alert-badge` pill on the Metrics sidebar icon | Subsystem: Server + Client (Metrics views)
INV-89 | `buildCallNoteEmailHtml_` HTML-escapes every user-supplied note field via `esc_` before assembling the email body. The email-preview modal injects that body raw via `innerHTML` (the `${p.htmlBody}` slot in `cnRenderComposerPreviewStep_`), so the escaping is load-bearing — a new field added to the builder without `esc_` is stored XSS in the preview and the sent email. Pinned by `test_cn_buildEmailHtml_escapesUserFields` | Subsystem: Server + Client (Call Notes views)
INV-90 | `getFormSubmission(token)` is caller-scoped, read-only: it requires `getEmployeeInfo_()` (NOT a public endpoint) and returns submission data only when the calling employee's email matches the token's `FormTokens.CreatedBy` — a rep cannot read another rep's form submissions. Returns `{ submitted: false, status }` when the token isn't completed yet. Pinned by `test_cn_getFormSubmission_callerScoped` | Subsystem: Server
INV-91 | `managerGetFormSubmission(repEmpId, token)` is manager-gated (INV-02), read-only, and scoped to the target rep — the token must have been created by `repEmpId` (`FormTokens.CreatedBy`), so a manager can only view submissions for forms the selected rep sent. Shares `buildFormSubmissionResult_` with the caller-scoped `getFormSubmission` (INV-90). Surfaced via the form pill on the Team Notes Per-Rep read-only card. Pinned by `test_cn_managerGetFormSubmission_gatedAndScoped` | Subsystem: Server
INV-92 | `getCallNotesAuditLog(filters)` and `getCallNoteAuditHistory(noteId)` are manager-gated (INV-02), read-only over the shared AuditLog. Both read via the bounded tail helper `cnReadCallNoteAuditRows_` (at most `CN_AUDIT_MAX_SCAN`=4000 most-recent rows — the log is append-only/chronological — keeping only the `CN_AUDIT_ACTIONS` set; timestamp cells are recovered via `normalizeAuditTs_` since Sheets coerces them to Dates, and the `dateLocal` (PunchDate col 5) via `normalizeDate_` — the client's "View note" deep-link feeds it to `managerGetCallNotes`, which `^\d{4}-\d{2}-\d{2}$`-rejects a raw coerced Date, F cycle-8). The search filters by rep / action / date range (default start = last `CN_AUDIT_DEFAULT_DAYS`=30 in the manager tz; default END = today in `CONFIG.TIMEZONE` — the tz audit rows are stamped in, so IST-stamped rows written "tomorrow" relative to the US-afternoon manager aren't silently hidden), caps results at `CN_AUDIT_MAX_RESULTS`=500, and returns `truncated:true` when the result cap is hit or the scan window didn't reach the requested start date — since cycle 11 (L-4) keyed off the WINDOW's true oldest scanned day (`cnReadCallNoteAuditRows_` returns `oldestScannedDay` from the raw window, any action), not the oldest MATCHING row: a 4000-row punch-dominated stretch with zero CN rows used to render an empty result with no "narrow the range" hint while older CN rows sat beyond the scan cap. History returns every row carrying the `noteId` (parsed from the Notes field), oldest-first, independent of any date filter. Returned rows are PHI-free — note content never enters the AuditLog (INV-32); the client deep-links a row's `noteId` to the Team Notes Per-Rep view for content. Pinned by `test_auditPanel_searchAndHistory` + the gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server
INV-93 | `saveEmailTemplates(templates)` is manager-gated (INV-02, INV-57), persists to Script Property `CN_EMAIL_TEMPLATES` (JSON array of `{name, recipientType, body}`), validates each entry (non-empty name + body, `recipientType ∈ customer|provider|any`, count ≤ `CN_EMAIL_TEMPLATE_LIMIT`=50, body ≤ `CN_EMAIL_TEMPLATE_BODY_MAX`=4000), and writes an `AdminConfigChange` audit row. `getEmailTemplates_()` reads the property first (CONFIG fallback), sanitizing on read so a corrupt blob degrades to the fallback rather than throwing. Templates are exposed to reps via `getCallNotesDepartments` (rep-callable) for the external-email composer picker, and to managers via `getAdminConfig` for the editor | Subsystem: Server
INV-94 | `submitTimeOffRequest` and `managerSubmitTimeOff` reject a request when the employee already has a Pending or Approved row for that date (`hasActiveTimeOffOnDate_`, inside the existing ScriptLock). Prevents the double-deduct that INV-03's per-row transition guard cannot catch — two sibling rows for one day would each deduct on approval. Denied/cancelled rows don't block a re-request. **Cycle-11 M-1: the guard also runs on the STATUS-CHANGE path** — `updateTimeOffStatus` re-checks `hasActiveTimeOffOnDate_(sheet, empId, date, i)` (its own row excluded via the optional 4th arg) before any →Approved deduct, so flipping an old Denied/Pending row to Approved beside an existing Approved row can no longer recreate the double-deduct signature (the last creator of the H1 class `getPtoReconciliation` detects after the fact). Approving a lone Pending row is unaffected. Both submit paths ALSO bound the date to a sanity horizon (`TIMEOFF_MAX_DAYS_AHEAD`=370 / `TIMEOFF_MAX_DAYS_BACK`=90, measured in the rep's/target's tz — cycle-11 L-11: the time-off date was the module's only unbounded date write; a typo'd year created an approvable, balance-deducting row invisible to every month view). **Operator 2026-08-18: `submitTimeOffRange(start, end, type, notes)` (the multi-day path) carries the SAME guard per weekday, ATOMICALLY (the INV-106 posture): every weekday in the range is checked and a conflict on ANY of them rejects the whole batch NAMING the dates — nothing is written. Weekends are skipped; the store stays one-row-per-date, so every downstream reader (calendar, approval queue, INV-03 transitions, bulk approve, cancel) sees the rows as if filed singly.** Pinned by `test_updateTimeOff_dupApproveRejected` + the extended `test_submitTimeOff_rejectsBadDate` + `test_submitTimeOffRange_weekendSkipAtomicCaps` | Subsystem: Server
INV-95 | Both time-off submit paths validate `type` against `TIME_OFF_TYPES` via `isValidTimeOffType_` (case-insensitive, trimmed) before any write; an unknown/empty type is rejected rather than silently defaulting to `getLeaveDeduction_`'s annual/1.0 (INV-17). `TIME_OFF_TYPES` must stay a superset of the `day-type` `<select>` options in `modals.html` — pinned by a Node-harness coupling test. `TIME_OFF_TYPES` NO LONGER contains `'Sick Leave'` (deferred #2): the day-type `<select>` dropped it too (still ⊆), so no new sick request is creatable via the UI or a direct RPC; the sick BUCKET machinery is intentionally retained for legacy reverts (INV-17/INV-72) | Subsystem: Server
INV-96 | `submitFormByToken` (public, token-only) bounds the recipient-supplied payload before the append: field count ≤ 200 and per-cell char length ≤ 45000 (under the 50k Sheets cell limit) for both the data JSON and the signature. On exceed it returns a specific error and leaves the token `pending` for retry, rather than throwing mid-write; also caps the number of arbitrary keys an unauthenticated caller can persist; since cycle 9 (L-7) the recipient-supplied `_meta.openedAt` is length-capped too (64 chars — the one previously unbounded cell input). Cycle-17 batch ⑤ closed the REP-side family: `createFormToken` bounds `recipientName` (≤200 chars) and requires `prefillData` to be a plain object with ≤50 keys and ≤20k serialized JSON, rejected BEFORE the append — the last uncapped client-writable PHI cells. Defense-in-depth (B5): `form_public.html`'s `SIG_PAD.toDataURL` downscales the signature EXPORT to ≤ 600px wide (the capture canvas is `rect.width * devicePixelRatio`, large on retina/mobile) so a legitimate signature's base64 stays well under one cell and never trips this cap — capture stays full-res for smooth drawing. A B5 "store the signature in Drive" alternative was deliberately NOT built: it would split a HIPAA-attested append-only record (§164.312(c)) across two stores and require integrating the destructive `purgeExpiredFormData` to avoid orphaned PHI in Drive — disproportionate risk for a cap that the capture-side downscale already keeps from biting | Subsystem: Server + Client (public forms)
INV-97 | Feature toggles are gated by the `FEATURE_FLAGS` registry (`Code.js`): only registry keys are honored. `getFlag_(key)` reads Script Property `CN_FEATURE_FLAGS` first (sanitize-on-read: corrupt/non-object blob → registry defaults; unknown key → `false`), else the registry default (which mirrors the legacy CONFIG constant, so migrating a read to `getFlag_` is a behavioral no-op until a flag is set). A flag's `scope` decides enforcement: `client` flags only gate UI (delivered via `getEmployeeState` `empState.flags` + `getCallNotesDepartments` `deptConfig.flags`, read client-side via `flagOn_()`); `server`/`both` flags are ALSO enforced in their endpoint — hiding a button never disables an endpoint (INV-02/S30 preserved). Flags are consulted at request boundaries, never mid-transaction | Subsystem: Server + Client (shell)
INV-98 | `getFeatureFlags` and `saveFeatureFlags` are manager-gated (INV-02/INV-57 family). `saveFeatureFlags` accepts only registry keys with strict-boolean values (unknown key or non-boolean → rejected, never persisted), writes the `{key:bool}` map to Script Property `CN_FEATURE_FLAGS`, and records an `AdminConfigChange` audit row with the manager's email. `danger`-marked flags (`voiceInput` HIPAA/BAA, `enablePtoTracking` stateful) are gated behind a `uiConfirm({tone:'danger'})` in the Admin UI before save | Subsystem: Server + Client (Call Notes views)
INV-99 | `getPtoReconciliation` is manager-gated (INV-02) and strictly read-only — it never writes a balance or a sheet. It detects reps with >1 Approved time-off row on the same date (the H1 double-deduct signature) and quantifies the over-charge per bucket as `actual − expected`, where expected per date is the single largest deduction. Returns only reps with drift. Correction is performed by the mutating companion `fixPtoReconciliation` (INV-102), NOT by this read endpoint. Pinned by `test_getPtoReconciliation_detectsDoubleDeduct` + `_nonManagerRejected` | Subsystem: Server
INV-100 | `getCallNoteTagSuggestions` is rep-callable (requires `getEmployeeInfo_`), caller-scoped, and read-only: it returns only the calling rep's own unique, non-archived (`getArchivedTagsSet_`) tags via a column-bounded read of their own Sheet's `SubformData` column (INV-46-style). Not enrolled → `{tags:[]}`, never throws. No cross-rep data is read or returned. Feeds the Log-view tag-autocomplete `<datalist>`; every option is `esc()`'d client-side before `innerHTML` | Subsystem: Server + Client (Call Notes views)
INV-101 | `notifyRepOfFailedSubmission_` (B2) is best-effort (try/catch, INV-14) and fired by `submitFormByToken` only on a size-cap rejection (INV-96); it emails the token's `CreatedBy` so a silently-rejected recipient submission is visible to the sending rep. It never throws and never blocks the recipient's error response; a missing `createdBy` is a no-op. The notice is PHI-free beyond the recipient address the creating rep already holds | Subsystem: Server
INV-102 | `fixPtoReconciliation(empId)` is manager-gated (INV-02) and locked (INV-01) — the mutating companion to the read-only `getPtoReconciliation` (INV-99). Per date with >1 Approved row it keeps the single largest deduction and sets the extra Approved rows' status to `'Reconciled'` (every status reader — dashboard counts, calendar, the reconciliation scan, the INV-94 dup-guard — treats `'Reconciled'` as non-Approved), then credits the SERVER-recomputed over-charge back to the balances via `adjustLeaveBalance_` (positive delta; never trusts a client amount). **Since cycle 9 (M-2) the neutralize→credit runs PER BUCKET (annual then sick), each as a compensated unit:** a thrown credit reverts THAT bucket's rows to `'Approved'` and rethrows, so a re-run re-detects and re-credits cleanly (the old all-rows-then-credit shape left a thrown credit's rows `'Reconciled'` with the over-charge permanently invisible); a committed bucket can never double-credit (its rows are off `'Approved'`) and a partial commit writes its audit row best-effort before the rethrow. `managerSubmitTimeOff` got the sibling revert (a thrown auto-approve deduction deletes the just-appended Approved row, so retry isn't dup-guard-blocked and Deny→re-Approve can't phantom-credit). Idempotent by construction: the neutralized rows are no longer `'Approved'`, so a re-run finds no duplicates and credits nothing (returns `fixed:false`). Writes a `PtoReconciliationFix` audit row with the manager's email. Pinned by `test_fixPtoReconciliation_creditsAndIdempotent` + `_nonManagerRejected` | Subsystem: Server
INV-103 | `setCallNoteManagerComment(repEmpId, noteId, message)` (item 9) is manager-gated (INV-02) and locked (INV-01). It appends a `{role:'manager', kind:'comment', message, at, by}` entry to `subformData.feedback[]` on ANY of the rep's notes — not just training-flagged — reusing the Q&A thread (`cnRenderQAThread_`, now rendered for any note with a thread). Writes a PHI-free `CallNoteManagerComment` audit row (noteId only). `appendCallNoteFeedback` was relaxed so the rep can ack/clarify on any note that already has a feedback[] thread (training-flagged OR manager-commented), not training-only | Subsystem: Server + Client (Call Notes views)
INV-104 | `purgeOldCallNotes` (item 7) is a top-level trigger handler reachable via google.script.run, so it calls `assertManagerCaller_` (INV-44 family) and is locked (INV-01). It deletes per-rep `Notes` rows older than `CN_NOTE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS`, default 0 = disabled; irreversible PHI delete). Cross-rep; per-rep Sheet failures are skipped; writes a PHI-free `CallNotesPurge` audit row. The note date is read from `CN.DATE_LOCAL` via `parseRetentionDateMs_` (handles the Sheets Date coercion). Pinned by `test_triggerGate_purgeOldCallNotes_nonManagerThrows` | Subsystem: Server
INV-105 | Automated notification emails route their HTML through `buildBrandedEmailHtml_(heading, bodyHtml, opts)` (item 2), which `esc_`'s the heading; callers MUST `esc_` any user data placed in `bodyHtml` (same INV-89 discipline), and `brandedKvRows_` `esc_`'s both label and value. Converted senders keep a plain-text `body` fallback alongside `htmlBody`: `notifyEmployeeOfDecision_`, `sendDailyMissedPunchAlerts` (employee + manager digest), `notifyManagerOldAdjustment_`, `notifyManagerTrainingQuestion_`, and `sendAutomatedExport_` (all three branches — error / success-with-attachment / catch). `sendAutomatedExport_` keeps its `.xlsx` `attachments: [blob]` on the success email alongside the new `htmlBody` + plain `body` | Subsystem: Server
INV-106 | `submitPunchAdjustRequests(requests[])` (#4a) is caller-scoped + locked and writes only Pending rows (no punch). It is ATOMIC — every entry is validated (date `^\d{4}-\d{2}-\d{2}$`, time `^([01]\d|2[0-3]):[0-5]\d$`, `punchType ∈ PUNCH_LABELS_`, not future — BOTH `date > todayStr` AND a same-day not-yet-reached time (the L-2 fix; the time check was missing until cycle 7), ≤ `ADJUST_WINDOW_DAYS`, reason required beyond `OLD_ADJUST_ALERT_DAYS`) and the WHOLE batch is rejected if any entry fails (max 20). Duplicate-guarded: the batch is rejected when two entries target the same (date, punchType), or when the employee already has a `Pending` row for that (date, punchType) awaiting approval — preventing the queue from accumulating sibling requests that a manager could double-approve. Each Pending row gets a UUID `ReqId`. Writes a `PunchAdjustRequest` audit row. Pinned by `test_punchAdjust_batchInvalidRejected` + `test_punchAdjust_duplicatePendingRejected` | Subsystem: Server
INV-107 | `managerGetPendingAdjustments` + `updatePunchAdjustStatus(reqId, newStatus)` (#4a) are manager-gated (INV-02); the latter is locked (INV-01) and transition-guarded (acts only on a `Pending` row). Approve writes the single `ADJ-{punchType}` punch for the TARGET employee via `writeAdjustPunchForEmployee_` (find-existing-of-that-type-for-date → update, else append; + `writeToEmployeeSheet_` personal-sheet mirror; `ADJ-` convention INV-09; `normalizeTime_` reads INV-26) and an `ADJ-` audit row with the manager as actor — it must NEVER reuse `managerSaveDay` (full-day reconcile would delete other punch types). Approve also re-checks the adjust window AT APPROVAL TIME (in the target employee's tz): a request that has aged past `ADJUST_WINDOW_DAYS` while sitting in the queue is rejected with a deny-it message instead of writing a punch the employee could no longer request — the window is enforced at both submit and approve. Deny marks `Denied` + writes a `PunchAdjustStatusChange` audit row, no punch (and is allowed regardless of age). Pinned by `test_punchAdjust_submitApproveWritesPunch` + `_nonManagerRejected` + `test_punchAdjust_approveAgedPastWindowRejected` | Subsystem: Server + Client (Time Clock views)
INV-108 | `managerSaveDayRange(empId, fromDate, toDate, slots, reason)` (#4b) is manager-gated (INV-02), locked (INV-01), span-capped (≤31 days), and window-bounded (no future date; none beyond `ADJUST_WINDOW_DAYS`; reason required if the oldest date is beyond `OLD_ADJUST_ALERT_DAYS`; since cycle 9 a range ending TODAY also rejects same-day future slot times — INV-05/L-4, atomic like the other validations). It applies each NON-EMPTY slot to every date in the inclusive range via `writeAdjustPunchForEmployee_` — purely ADDITIVE (set/update that punch type only), so a blank slot is left untouched and other punch types are never deleted. **C17-9 (cycle-17 batch ⑥): the range run is ONE-READ-INDEXED** — `buildAdjustPunchIndex_` reads the Timesheet once for the whole range ({date|type} → LAST matching rowIndex, the findExistingPunch_/INV-155 agreement) and rides an optional `ctx` param into `writeAdjustPunchForEmployee_`; without it a 31-day × 4-slot range ran up to 124 full-Timesheet reads + 124 personal-sheet `openById` round-trips inside the ONE project ScriptLock (the INV-153 starvation reasoning). The personal-sheet mirror memoizes its spreadsheet handle per execution (`openPersonalSs_`, the L-3 pattern); single-punch callers (the adjust-queue approve) are unchanged (no ctx → findExistingPunch_). Pinned by the batch-⑥ C17-9 pin. It must NOT reuse `managerSaveDay` (full-day reconcile deletes blank slots). The immediate employee adjust path (`recordPunch` `custom`) is gated for non-managers by the `employeeImmediateAdjust` flag (default off). Pinned by `test_managerSaveDayRange_appliesAcrossDays` + `_nonManagerRejected` + `test_recordPunch_immediateAdjustGatedByFlag` | Subsystem: Server + Client (Time Clock views)
INV-109 | `reconcileCallNotes` (#8) is manager-gated (INV-02) and locked (INV-01). It scans every enrolled rep's `Notes` tab and, for rows with content but NO `noteId` (hand-entered directly in the Sheet), backfills a UUID `noteId` + a `Timestamp` + a yyyy-MM-dd `DateLocal` (derived from the human's values, else rep-tz now/today via `safeTimezone_`/`normalizeDate_`) so the row becomes flaggable/searchable/coverage-counted. Content columns are NEVER modified. Idempotent (a row with a `noteId` is skipped → re-run is a no-op). Per-rep Sheet failures are skipped; writes a `CallNotesReconcile` audit row. Runs both manually (Admin → "Reconcile Sheets") and as a daily manager-tz 5am trigger wired by `installAutomationTriggers`; because it is a TRIGGER handler it uses the `assertManagerCaller_` (MANAGER_EMAILS) trigger-handler gate (the INV-44 idiom, throws) — NOT `emp.isAdmin` or the roster `isManager`-returns-`{error}` gate, either of which would silently no-op the nightly run under a narrowed `ADMIN_EMAILS` or a non-roster installer (F1/F2, cycle 6 regression from #102/INV-136). The audit actor falls back to the SYSTEM placeholder (`_SYSTEM_AUDIT_EMP_`) when the trigger installer isn't a roster employee. Pinned by `test_reconcileCallNotes_backfillsHandEntered` + `_nonManagerRejected` (the latter now asserts the throw). | Subsystem: Server + Client (Call Notes views)
INV-110 | `provisionCallNotesSheet(repEmpId)` (auto-provision) is manager-gated (INV-02) and locked (INV-01, mutates the Employees sheet). It creates a fresh per-rep Sheet via `createPinnedSpreadsheet_` owned by the deploying account (the web app runs as `USER_DEPLOYING`), pinning the new Sheet's timezone AND locale to the ADP sheet's (the `normalizeDate_` DateLocal round-trip only holds when the coercing sheet shares the ADP tz), renames the default sheet to the `Notes` tab + writes the canonical `CN_HEADERS` header, writes the new spreadsheet ID into `EMP.CALL_NOTES_SHEET_ID` (column L) of the rep's roster row, calls `invalidateRosterCache_()` (INV-10), and writes a `CallNotesProvision` audit row with the manager's email. **Idempotent / no-clobber:** a rep who already has a non-empty `callNotesSheetId` is returned `{success, alreadyEnrolled:true, sheetId}` unchanged — it NEVER creates a second Sheet or overwrites column L (that would orphan the rep's note history). The companion read-only `getCallNotesEnrollment` (manager-gated) returns `{enrolled[], unenrolled[]}` for the Admin enrollment panel. Pinned by `test_provisionCallNotesSheet_nonManagerRejected` + `_idempotentNoClobber` (the create branch is exercised manually to avoid littering Drive in CI) | Subsystem: Server + Client (Call Notes views)
INV-111 | The Intake send endpoints (`intakeSendPPD`, `intakeSendPMD`, `intakeSendPAP`) require an enrolled rep (`getEmployeeInfo_`), build the email body server-side with every user field `esc_`'d (INV-89 discipline; pinned by `test_intake_buildPpdBody_escapesAnswers`), and re-render + hash-check the patient-answer body against the `expectedBodyHash` returned by the matching `intakePreview*` — the hash is REQUIRED (a send without one is rejected, so a direct RPC can't bypass the preview gate — L2 parity with `emailFromCallNote`) and the send is rejected when the form changed since preview (INV-41 pattern; selections/images ride at send and are NOT part of the hash). Patient answers persist to the append-only per-form submission tab in `INTAKE_SS_ID` — and since cycle 10 (M-5) that persistence is INTEGRITY-GUARDED: the store cells are size-capped BEFORE the send (`intakeStoreOversizeError_`, `INTAKE_STORE_CELL_MAX`=45k, INV-96 spirit — an oversized submission is rejected pre-send so no email ever lacks a record), and a post-send append failure is LOUD (the response carries `storeWarning` → client warn toast; a PHI-free `IntakeStoreFail` audit row records `type + submissionId + err` — the prior bare console.warn left the Sent tab/timeline silently recordless behind a success response). The shared AuditLog `IntakeSent` row is PHI-free (`type`, `submissionId`, recipient **domain** only — never the patient name or recipient address, same discipline as the `ExternalEmailSent` row). Recipients are resolved server-side via `intakeResolveRecipient_` (roster id→email, dept default, or validated custom), so agent addresses never reach the client | Subsystem: Server + Client (Intake views)
INV-112 | `intakeFilterRecommendations_(answers, allProducts)` is a PURE, self-contained port of the bound tool's recommendation engine — `answers` keyed by bare question number (`'38'` weight, `'43'` neuro, `'31a'` stroke, `'34'` amputation, `'33'` ulcers, `'32'` spasticity, `'35'` spine, `'36'` swelling, `'30'` catheters, `'44'` oxygen, `'25'` numbness, `'13'` falls, `'39a'` dwelling); `allProducts` is the raw `Offerings!A2:F` 2D array. It applies weight-cap, solid-seat/captain, Group-3/SPO/MPO eligibility, the `K0856→K0861` / `K0843→K0862` neuro substitutions, and justification building. **The weight filter FAILS CLOSED on catalog data it cannot read (cycle-16 F9): a blank / non-numeric / half-written / inverted capacity EXCLUDES the product rather than admitting it.** `parseInt('')` is `NaN` and every comparison against `NaN` is false, so the pre-F9 form read an unreadable capacity as UNLIMITED — see the operator-maintained-data-source gotcha for why the engine's two opposite behaviours for missing catalog data were the real defect. The companion `intakeCatalogIssues_` (pure, Node-pinned) names the offending sheet rows in Admin → Automation Health so the fail-closed direction is not silent. **The clinical decision-factor derivation (the `patient` flag bag + the neuro/SPO/MPO eligibility booleans + stroke/hemiplegia analysis) is factored into a shared pure helper `intakeDeriveClinicalFactors_(answers)`** that the engine destructures back into the SAME local names (the filter/substitution/justify logic is byte-for-byte unchanged), so the read-only **explainability** surface `intakeExplainFactors_(answers)` (a flat `{label,value}[]` of the factors that drove the recommendation, manager-auditable) can NEVER drift from what the engine actually evaluated. `intakeGetSubmission` returns `factors: intakeExplainFactors_(answers)` for a PPD submission (recomputed from the STORED answers — no schema change), rendered read-only in the Intake Sent detail. Pinned by `test_intake_engine_*` (Tests.js) + the Node harness (`intake — PPD engine` — which now loads `intakeDeriveClinicalFactors_`/`intakeExplainFactors_` into the engine vm ctx; engine behavior unchanged + `intakeExplainFactors_` drift-free assertions). **PPD redesign — the engine-critical answers are now STRUCTURED controls, not free-text (Phase 2):** Q25/Q31a/Q34 are `multi` controls in `INTAKE_PPD_CONTROL` whose option VALUES are exactly the substrings the engine parses (`Feet`/`Legs`; `Paralysis Left Arm`… comma-joined in option order; `Left (Above Knee)`… no stray `no`), Q38 is `numunit`; the value is always canonical ENGLISH (label may be localized) since the engine matches English. This is pinned two ways: the **Phase-0 engine-contract tests** (feed the exact emitted strings through the engine) + the **Phase-2 config drift-guard** (`intake — PPD redesign Phase 2` — loads the live `INTAKE_PPD_CONTROL` and feeds its values back through `intakeDeriveClinicalFactors_`, so renaming an option fails CI instead of silently breaking recommendations). **PPD redesign Phase 3 (shipped):** Q29/Q41/Q42/Q43 are `condition` curated pickers backed by `INTAKE_CONDITION_LISTS` (comma-joined value, `data-val` authoritative). Q29/Q41/Q42 are display-only (engine reads none of them); **Q43 is engine-read but ONLY as truthy-vs-exclude-list** (`hasValidNeuroDiagnosis`), so any non-empty curated/custom value = valid neuro Dx, empty = no Dx — pinned by the **Phase-3 drift guard** (`intake — PPD redesign Phase 3` — loads the live `INTAKE_PPD_CONTROL` + `INTAKE_CONDITION_LISTS`, feeds every `neuro` value through `intakeDeriveClinicalFactors_` → valid, asserts none collide with the exclude list, and that all list values are comma-free). The lists are a pure content constant SEEDED FOR CLINICAL REVIEW (editable with zero engine risk). Q13 (falls) stays free-text. NEVER reintroduce a bare `Yes`/`No` for Q25/Q31a/Q34 (it feeds the engine no location/side); NEVER change an option value without the drift-guard green; NEVER add a Q43 `condition` value that lowercases into the `['no','n/a','none','','no.']` exclude list. **Q39a dwelling (operator rule 2026-07-09, ENGINE-READ):** a `choice` (`House`/`Apartment`/`Mobile Home`) whose value the engine substring-matches for `mobile` → `patient.livesInMobileHome`; **Mobile Home + weight > 0 AND < 285 short-circuits the entire filter to K0821 only** (returned even when solid-seat/Group-3 gates would exclude it — the HOME constraint wins by operator decision; ≥285 / blank weight / absent answer → standard logic; no K0821 catalog row → empty result, never a fall-through). Explainability gains `Dwelling (Q39a)` + a conditional `Mobile-home restriction` row. Pinned by the Q39a engine-contract Node test + the config rename-guard + `test_intake_engine_mobileHomeRestriction` (editor). NEVER renumber Q39a (stored answers + the engine key ride it). **PPD redesign Phase 4 (shipped)** is display-only polish that DOESN'T touch the engine: a label hover-help map (`INTAKE_PPD_HELP`), conditional-hide of secondary rows (`INTAKE_PPD_REVEAL`/`intakePpdApplyReveals_` — hidden rows cleared), the Q45 `ynreveal` control (arthritis-type sub-multi), and a Q37 numunit `parse:'height'` (`intakeParseHeightInches_`, pure — `5'1"`→`61`). None of Q32/Q33a/Q37/Q45 are engine-read (no drift-guard needed); the pure `ynreveal`/height helpers are Node-pinned. See the "Intake PPD controls are engine-safe" gotcha. The PMD/PAP email STRUCTURAL layout (`INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT`, server-authoritative) is mirrored by the client render layouts (`INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`) for input rendering only; the two are pinned equal by the Node coupling tripwire (`intake — client render layout mirrors the server`) — same parallel-source discipline as `LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_` | Subsystem: Server + Client (Intake views)
INV-113 | `submitFormByToken` (public, token-only) extracts `signature` AND `_meta` before persisting responses, **rejects a non-empty signature that is not a `data:image/` data-URL** (cycle-17 batch ⑤ — an https:// value planted by an anonymous submitter would be fetched by the PHI reviewer's browser in the in-app viewer and by the server-side HTML→PDF conversion, a tracking-pixel/IP leak; an empty signature stays allowed for fields-only forms), **server-enforces consent** (requires `_meta.consentAgreed === true`; an absent `_meta` is rejected — the prior back-compat tolerance let a hand-crafted payload skip the consent record entirely), stamps the server-authoritative `CONFIG.FORM_CONSENT_VERSION` (never a client-sent version), and writes a tamper-evident `SubmissionHash` (`computeFormSubmissionHash_` over responses+signature+token+consentVersion — NOT `submittedAt`, which Sheets may coerce to a Date) + a `Certificate` JSON into trailing `FS` columns. The `FormSubmissionReceived` audit row carries `hash=` + `submittedAt=` as the append-only independent witness — written via `writeWitnessAuditLog_` since cycle 10 (C4: retry + `WITNESS_AUDIT_FAILS` stamp + Automation Health/digest surfacing, because `writeAuditLog_` swallows failures and a lost witness was previously invisible). `verifyFormSubmissionIntegrity_(token)` (manager-gated, read-only) recomputes + compares; a legacy row with no stored hash returns `match:null` (not a failure). `FS_HEADERS` grew by TRAILING columns only (back-compat like `CN_HEADERS`). `FormSubmissions` remains **append-only — no edit endpoint exists** (the immutability is a HIPAA §164.312(c) integrity control, and the hash makes any out-of-band alteration detectable) | Subsystem: Server + Client (public forms)
INV-114 | `getFormsSS_()` resolves the forms PHI store: Script Property `FORMS_SS_ID` first (segregates PHI off the ADP/payroll sheet — point it at `INTAKE_SS_ID`), else `getAdpSS_()` for back-compat; honors `_TEST_OVERRIDE_FORMS_SS_ID`. Both `getOrCreateFormTokensSheet_` / `getOrCreateFormSubmissionsSheet_` (and therefore `submitFormByToken`, `getFormByToken`, `serveExternalForm_`, the viewers, and `purgeExpiredFormData`) route through it, so the location is a single point of change. The invite-email builders (`buildCustomerEmailHtml_`/`buildProviderEmailHtml_`/`*Text_`) take only `(recipientName, message, formNames, formLinks)` and never read prefill — patient identifiers stay in the token, never the cleartext email body. Pinned by the `forms — invite email builders` Node guard | Subsystem: Server + Client (public forms)
INV-192 | **A Drive SHEET embed is a title-only search hit and cannot be read in the mid-call drawer — convert it.** Both limits are structural, not cosmetic: `searchReference` skips embeds with "No stored content to chunk", so a roster titled "Power Roster" is unfindable by any query naming a team or a person; and the Ctrl/⌘+K drawer renders embeds as an open-in-a-tab card because an iframe is useless at 400px. The `/preview` iframe also loads under the REP's credentials, so an embed silently fails for anyone the file was never shared with. `kbConvertDriveSheet` (admin-gated per INV-136; READ-ONLY per INV-115's posture — it writes neither the Sheet nor a KB row, and the normal `kbSaveItem` persists it after review) produces a native article instead. It adds NO new OAuth scope (`SpreadsheetApp` is already authorized). The conversion DETECTS the shape: no merges + a header row → GFM table; a banded grid → headings + grouped members. **Banded grids partition by COLUMN — sub-teams sit side by side in the same rows — so headers claim a COLUMN RANGE and members are collected per range; a row-wise walk silently merges two teams and misroutes calls.** A band is a merge spanning the USED WIDTH, not a ratio of it (a 3-column sub-team merge cleared a 60%-of-6 bar and every sub-team was promoted to a department — measured, not reasoned). Highlights become bold plus a warning to record the legend: dropping them loses which name is the lead, and inventing a meaning is worse. Conversion is MANUAL by design, so an article later edited in-app is never overwritten by a re-sync. Verify: the column-separation behavioural pin, the shape-split pin, the highlight-legend pin, the kbMd_ round-trip, and the gate/read-only/bounded source pin | Subsystem: Server + Client (Reference views)
INV-193 | **Interactive KB content comes from a RECOGNIZED FENCE, never from HTML in the article.** `kbMd_` escapes `& < >` before anything else, so an author cannot put a control into a document — the ` ```snippet ` block (a copy card) and now ` ```roster ` (an interactive directory) are the sanctioned shape: the app draws the markup, the content stays inert. Three failure modes a new block type must handle, all found the hard way on `roster`: the content arrives ESCAPED, so a separator like `&` is `&amp;` and a naive split mangles it; the top-level pass does NOT cover quotes, so any value going into an ATTRIBUTE needs its own quote-escaping (the gap `kbMd_`'s link/image rules already guard); and anything modelled as an attribute of a person/entity must travel with it across every group it appears in rather than living in one place. Searchability survives because `kbSplitSections_` masks fences only for HEADING detection — the block's text stays in the section markdown, so `searchReference` still finds it (verify this for any new block; it is the main advantage over an embed). Interactive blocks render in the 400px drawer, so they owe an intrinsic grid + a real breakpoint (A2) and full keyboard/ARIA treatment (INV-173/174). **THE ESCAPE BOUNDARY HOLDS FOR THE FIRST RENDER ONLY — a stored fence source must be RE-ESCAPED on read (cycle-18 F1, stored XSS, reproduced in Chromium).** The roster and decision blocks stash their source on the root as `data-src` so a mode switch / Expand / decision answer can re-render without re-running `kbMd_` — and **an attribute value is entity-DECODED by the parser**, so `getAttribute` hands back the RAW article text, `&lt;img&gt;` and all. Re-rendering that through `innerHTML` put a LIVE element into the article, executing in every reader's session (Reference tab and the Ctrl/⌘+K drawer alike) and reachable through `kbConvertDriveSheet`/`kbConvertDriveDoc` from cells an admin did not author. `kbFenceSrc_(root)` is now THE one reader of a stored source: it re-applies `kbMd_`'s exact top-level escape (`kbFenceEsc_`), restoring the contract every renderer was written against; `kbFenceDecode_` is the sanctioned INVERSE for non-markup sinks (a URL, the clipboard). EIGHT sites are coupled and must move together: the 3 `data-src` reads (`kbDecideRender_`, `kbRosterExpand_`, `kbRosterData_`), the 2 path channels the decision walk MATCHES on (`kbDecidePath_`, `kbDecideChoose_` — re-escaping only the source makes `o.label` escaped while `data-opt` stays decoded, dead-ending any guide whose option label contains `&`, `<` or `>`), the person-panel lookup (`kbRosterOpenPerson_`), and the flow-edge selector (`kbRosterDrawEdges_`, which needs the INVERSE — a CSS attribute selector matches the DECODED value). NOTE `kbRosterAttr_` is deliberately UNCHANGED (it escapes quotes, not `&`), so every human-facing attribute — `title`, `aria-label`, `data-tip`, and the Copy-name clipboard value — still round-trips to the human form; a blanket `&`-escape there is the smaller diff and breaks all four. **A pin for this class MUST live in the DOM harness:** the pure harness cannot parse HTML, so it cannot decode — `run.js` had literally pinned the vulnerable line as the correct shape. Verify: the roster parse/render/inert/reflow pins, the fence-recognition pin, the four DOM re-render tests, and the source ban (exactly one `getAttribute('data-src')`, inside `kbFenceSrc_`, which must re-escape) | Subsystem: Client (Reference views)
INV-194 | **PTO accrual is HOURS-DRIVEN, in arrears, idempotent, and fails toward VISIBLE over-credit.** The operator's rule is a rate of PTO HOURS per hours WORKED — column Q holds hours-per-`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80 by default; 3.08 for the PH team) and `CONFIG.PTO_HOURS_PER_DAY` (8) converts the earned hours to the days column I stores. `creditMonthlyPtoAccruals` (daily manager-tz trigger, INV-44 gate, INV-01 locked) credits `accrualDaysForHours_(hoursWorked, rate, basis, perDay)` through `adjustLeaveBalance_` — the one balance mutator, so the INV-27 per-row gate and roster-cache invalidation ride along; never a direct cell write. **Hours come from ONE range-wide Timesheet index** (`workedHoursByEmpForRange_`), not a per-rep `buildTimesheetForEmployee_` call: the run holds the global lock, so N full-sheet reads is the C17-9 / INV-153 lock-amplification trap. That index reads THROUGH `TimesheetArchive` when the catch-up range predates the live tab (INV-153/F1 — reading short would under-credit real earned PTO), counts a row present in both tabs once (INV-132), computes each day with the SAME `calcHours_` arithmetic as payroll, treats an unparseable day as INCOMPLETE rather than 0 hours (INV-176, and the audit row names the count), and THROWS on a failed read so the run aborts with no credits rather than crediting from partial hours. A month with genuinely zero worked hours credits zero and still writes an audit row, so unexpected silence is visible; an UNREADABLE hours figure (null/'' ) returns null instead of coercing to 0 through `Number()`, which would be indistinguishable from that real zero. The column-R `yyyy-MM` stamp is the idempotence state: `accrualMonthsToCredit_(stamp, nowYm)` owes stamp+1..now−1 (IN ARREARS — month M lands on/after the 1st of M+1); a blank/garbage/future stamp SEEDS (restamps to last month, credits NOTHING — enabling never dumps a surprise back-credit). Catch-up caps at `PTO_ACCRUAL_CATCHUP_MAX_MONTHS` (12) with the overflow NAMED in the audit row (INV-187). ORDER IS LOAD-BEARING: credit + audit row land BEFORE the stamp advances, so a mid-run failure re-credits next run — a VISIBLE over-credit (two audit rows for one month) beats a silent lost month. A pto-disabled rep is skipped WITH the stamp frozen. Column I stays the balance of record; the operator MUST stop routine manual top-ups once column Q is set. The stamp cell is a Sheets-coercion surface — every read routes through `accrualStampYm_`. **The tile states only what is TRUE** — the credited balance, the rate in its real terms, and the server-computed month-to-date earning; the old fixed-rate variant's Dec-31 projection and progress bar are GONE, because an hours-driven balance has no ceiling and no knowable future work pattern to project from (INV-187). **A FAILED run is now VISIBLE (cycle-18 F4):** the outer catch stamps `stampAutomationError_('PtoAccrualCredit', …)` and a clean run clears it, because the handler RETURNS `{success:false}` and nothing reads that — Apps Script's trigger-failure email fires on a THROW, so a job writing leave BALANCES reported failure to nobody. The stamp rides `automationProblems_` (INV-161) onto the health dot and the daily failure digest. Verify: the hours-driven accrual Node pin (behavioural earn arithmetic + null-not-zero, one indexed read, archive read-through + dedupe, incomplete-not-zero, credit-before-stamp order, through-the-mutator, zero-hour audit row, action registered) + the tile pin (rate line, MTD line, no projection, NO fill bar) + `test_creditPtoAccrual_seedCreditIdempotent` (real punched hours → the amount they imply) + `test_triggerGate_ptoAccrual_nonManagerThrows` | Subsystem: Server + Client (Time Clock views)
INV-115 | `kbConvertDriveDoc({itemId | driveUrl})` is **admin-gated** (`emp.isAdmin`, `'Admin access required.'` — KB content authoring, INV-136; was manager-gated) and strictly READ-ONLY — it never writes a KB row or modifies the Drive Doc; persisting the converted article happens only through the existing `kbSaveItem` after manager review in the editor. The `itemId` path accepts only `type=embed` + `driveKind=doc` rows; the `driveUrl` path accepts only URLs `kbParseDriveUrl_` resolves to `kind=doc`. The converter emits ONLY the `kbMd_`-renderable subset (bold+italic→bold, link `()`/whitespace percent-encoded, `[]` stripped from link text, non-http(s)/mailto links demoted to plain text; tables → GFM with row 0 as header and `\|`-escaped literal pipes) and reports lossy conversions (drawings, nested tables, multi-line cells, skipped elements) as `warnings[]` rather than silently dropping content — pinned by a Node round-trip tripwire that renders the converter's GFM through `kbMd_`. Phase 2b: `INLINE_IMAGE`s emit `kbdoc:<fileId>:<n>` tokens (the converter remains read-only); `kbSaveItem` resolves them at save via `kbResolveDocImages_` — Doc re-walk in converter order (`kbCollectDocInlineImages_`, a mirrored-walk pair pinned by a Node test), idempotent export to the `KB_IMAGES_FOLDER_ID` Drive folder (deterministic `kbdoc-<fileId>-<n>` names, reused on re-save), token → thumbnail-URL swap, per-token degradation to the italic placeholder on any failure. Resolution runs OUTSIDE the ScriptLock; the lock wraps only the sheet write. The Doc is opened with the deployer's access (DocumentApp) — same trust boundary as embedding it. Pinned by the `kb — Doc→markdown converter` Node stub tests + the `kbConvertDriveDoc` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-116 | `intakeListMySubmissions()` / `intakeGetSubmission(formType, submissionId)` (the Intake Sent tab) are read-only and caller-scoped: a rep sees only rows whose stored `repId` matches their own; a manager sees all (parallels INV-90/91). The list is metadata-only (id, timestamp, rep, patientInfo, language, recipient — never the answers JSON) AND, since cycle 9 (L-16), metadata-only at the READ layer too: two column-bounded reads per tab (the leading metadata columns + the Recipient column) skip the AnswersJSON/Recommendations/Selections blobs entirely instead of fetching full-width rows and projecting in memory. Newest-first, capped at `INTAKE_LIST_CAP_`=100, and skips an unreachable form-type tab rather than failing the whole list. Since cycle-17 batch ⑤ the list response carries `total` + `cap` (INV-169 — a manager's list spans all reps × 3 form types, so the silent cap read as "exactly 100 exist") and the client renders "N shown · server holds M total (list capped)" keyed off the UNFILTERED list length (additive — an older server renders nothing). The detail is a bounded lookup — id-column scan, then one full-row fetch — and parses the answers/recommendations/selections JSON defensively (corrupt blob → `{}`). For a PPD detail it ALSO returns `factors` — the read-only engine explainability (`intakeExplainFactors_`, recomputed from the stored answers, drift-free per INV-112) rendered as a "Why these recommendations · engine factors" block (every value `esc()`'d). Timestamps and the ACCT dob cell route through Date-coercion guards (`intakeTsString_`). The submission tabs remain APPEND-ONLY — no edit endpoint exists. Pinned by `test_intake_sentViewer_callerScopedAndManager` | Subsystem: Server + Client (Intake views)
INV-117 | `kbRecordView(itemId, context)` is rep-callable (requires `getEmployeeInfo_`), USER-locked (batch K-B: `LockService.getUserLock()` — an append-only fire-and-forget log must never make punch/note writes queue behind the ONE script lock; the user lock still serializes a rep's own double-fires, and the INV-01 finally-release structure is unchanged), and append-only — one PHI-free row (timestamp, itemId, repId, sanitized context) per open into the `KbViews` tab of the KB spreadsheet; it never reads or returns other reps' data. The client fires it best-effort (fire-and-forget) so a failure never blocks or surfaces in the reading UX. `kbGetUsageStats()` is manager-gated (INV-02/31), read-only, bounded (last `KB_VIEWS_MAX_SCAN`=4000 rows), windowed to `KB_USAGE_WINDOW_DAYS`=30, and joins titles from the KB sheet so deleted items drop out; timestamp cells are recovered in the KB spreadsheet's OWN tz (the tz that coerced them — same discipline as `normalizeAuditTs_`). Pinned by `test_kb_recordView_requiresEmployee` + the `kbGetUsageStats` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-118 | `kbUploadImage(dataUrl)` (KB Phase 3) is **admin-gated** (`emp.isAdmin`, `'Admin access required.'` — KB content authoring, INV-136; was manager-gated) and validates BEFORE any Drive work: data-URL shape via the pure `kbParseImageDataUrl_`, content-type whitelist `KB_IMG_UPLOAD_TYPES` (PNG/JPEG/GIF/WebP — SVG deliberately excluded, it's script-capable), and the `KB_IMG_UPLOAD_MAX_CHARS` (~3MB) cap mirrored client-side. On success it writes one file to the `KB_IMAGES_FOLDER_ID` folder (`kbpaste-<stamp>-<rand>`), writes a PHI-free `KbImageUpload` audit row with the manager as actor, and returns the Drive thumbnail URL. Deliberately NO ScriptLock — a Drive-only atomic write; holding the global lock through a multi-second upload would stall every punch/note write. Pinned by `test_kb_uploadImage_rejectsInvalidPayloads` + the `kbUploadImage` case in `test_managerGates_rejectNonManager` + the `kbParseImageDataUrl_` Node test | Subsystem: Server + Client (Reference views)
INV-119 | **No free text ever enters the KB AI vendor payload.** `kbGetFacetGuidance(facets)` (Phase A) is rep-callable (requires `getEmployeeInfo_`), gated server-side by the `kbAiGuidance` feature flag (scope `both`, default OFF, danger-marked), and best-effort — every failure path (flag off, no facets, thin retrieval, missing `KB_AI_API_KEY`, daily cap reached, vendor error) returns `{ none: true, reason }` and never throws to the client. The privacy boundary is `kbAiSanitizeFacets_`: every facet is whitelist-validated against server-side vocabularies (departments ∈ `getDepartmentEmails_()` keys; update types ∈ `UPDATE_SUGGESTIONS_DEFAULT` ∪ `getUpdateSuggestions_()`; flag ∈ `CN_FLAG_TYPES`+`urgent`; tags ∈ the CALLER's own established tag vocabulary from `getCallNoteTagSuggestions` — a novel tag typed this minute is DROPPED, never sent), and the prompt builder `kbAiBuildPrompt_(clean, chunks)` takes ONLY the sanitized facets + our own PHI-free-by-policy KB chunk excerpts — there is no parameter through which free-typed note text or patient data can reach the wire. Retrieval reuses `searchReference` over `kbAiQueryTerms_(clean)` with a score floor (`KB_AI_SCORE_FLOOR` — thin matches never hit the API and the none is cached). Results cache org-wide (`KB_AI_CACHE_PREFIX`, 6h) keyed by generation salt (`KB_AI_GENERATION`, bumped by `invalidateKbCache_` on every KB save/delete) + MD5 of the canonical order-insensitive facet string (`kbAiCanonicalFacets_`). Spend: each vendor call is costed from usage tokens via `KB_AI_MODEL_PRICES` (unknown model → most expensive known rates, the cap can never be undercounted) into the `KB_AI_SPEND` daily counter; at `KB_AI_DAILY_CAP` (default $3, Admin-adjustable) the endpoint returns none until the date rolls. Each vendor call writes a PHI-free `KbAiGuidance` audit row (canonical facets + model + cost). `saveKbAiSettings` (manager-gated, INV-57 family) validates cap 0–100 + model ∈ `KB_AI_MODEL_PRICES` and persists `KB_AI_DAILY_CAP`/`KB_AI_MODEL`; the API key is NEVER settable or readable through any endpoint. Pinned by the `kb — AI Phase A` Node tests (whitelist / canonical hash / prompt / source tripwire) + `test_kbAi_gatesAndSettingsValidation` + the `saveKbAiSettings` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-120 | Training T1 endpoints follow the established families: `getMyTraining` / `markTrainingComplete` are caller-scoped (the rep's own assignments/completions only; complete requires a LIVE effective assignment — `'kb:'+itemId` in `trainEffectiveForEmp_` — so a rep can't write completion rows for unassigned items, and is idempotent on an already-complete item); `markTrainingComplete` / `saveTrainingAssignment` / `revokeTrainingAssignment` are locked (INV-01); the three manager endpoints are gated (INV-02). `TrainingCompletions` is append-only; `TrainingAssignments` rows are never deleted — revoke sets `RevokedAt`. Completion semantics: an item is complete iff some completion row's `CompletedAt` is STRICTLY after the latest non-revoked matching assignment row's `AssignedAt` (re-assign = reset, the re-certification mechanism; `'*'` rows match every employee). All four timestamp/date cells are Sheets-coercion-guarded (`trainCellTs_`/`trainCellDate_`, recovered in the KB spreadsheet's OWN tz — the normalizeAuditTs_ discipline; lexicographic compare = chronological). Status derivation is the pure `trainDeriveStatus_` (Node-pinned), shared by checklist + dashboard; "today" is the rep's roster tz in `getMyTraining` (F6 discipline) and manager tz in the dashboard. Audit rows `TrainingAssign`/`TrainingRevoke`/`TrainingComplete` are content-free (itemId/assignId/counts only). Assignment notifications are best-effort per-recipient (INV-14). Training dashboards are deliberately NOT team-scoped (every manager sees all reps, matching managerGetShiftStats); only the T3 Employee Docs carry per-team scoping. Pinned by `test_training_assignCompleteFlow` + the three gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-121 | **Quiz answer keys never leave the server.** The `Quizzes` tab's `QuestionsJson` (including `correct` indices) is readable only by the manager-gated `getQuizzes` (managers author the keys); the rep-facing `getQuiz` returns ONLY the WHITELIST-built `trainStripQuizForRep_` shape (never a delete-key copy — a missed field can't leak), requires a live `quiz:` assignment (or manager caller), and `submitQuizAttempt` (rep-callable, locked INV-01, assignment-required) grades server-side via the pure `trainGradeQuiz_` and returns only `scorePct`/`passed`/per-question right-wrong booleans — correct options are NEVER revealed, pass or fail (operator decision §9.4; unlimited retries; attempt counts per assignment round ride back for display). A pass appends the `TrainingCompletions` row (`via='quiz'`, once per assignment round — the INV-120 reset semantics apply to attempts too); `QuizAttempts` is append-only and `PerQuestionJson` stores booleans only, never the rep's answers paired with a key. `saveQuiz` validates via the pure `trainValidateQuizDef_` (1–50 questions, 2–6 options, correct in range, passPct 0–100) and bounds the stored JSON under the Sheets cell cap (INV-96 spirit); `deleteQuiz` removes only the quiz row (attempt/completion history stays; orphaned assignments drop off via the title join, same as a deleted KB item). Audit rows `QuizSave`/`QuizDelete`/`QuizAttempt` carry ids/counts/scores — never question text. `importQuizFromForm` (manager-gated, READ-ONLY, review-before-save — FormApp opens the form with the deployer's access; only MC + single-answer checkbox items + their marked correct answers are read; the form is never modified and nothing persists until the manager saves) reuses the same `saveQuiz` validation path on save. Pinned by the `training — quiz` Node tests (validator / grader / strip + the `getQuiz` source tripwire + the `trainParseFormId_` URL parser) + `test_training_quizFlow` + the four gate cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-122 | **Employee Docs are team-scoped (fail-closed), frozen at issue, and tamper-evident.** All Employee Docs data lives ONLY in the dedicated `HR_DOCS_SS_ID` spreadsheet (`getHrDocsSS_` has NO fallback store — unset property → friendly error, never a silent write to the ADP/KB/PHI sheets), and the `EmpDocs`/`DocSignatures` tabs are EXCLUDED from every retention purge (HR records are keep-forever — the opposite of the PHI-minimization posture). **Scoping:** `getMyDocs`/`getMyDoc`/`acknowledgeDoc` are owner-scoped; manager read access (`getMyDoc`, `getDocsDashboard`, `voidDoc`, `verifyDocSignature`) requires `empDocCanManagerSee_` — caller issued the doc OR caller is the employee's roster `ManagerEmail` (column M); membership in `MANAGER_EMAILS` alone grants NOTHING, and a blank column M NARROWS visibility to owner+issuer (fail-closed, operator decision §9.3). Any manager may ISSUE to any employee (issuing reveals nothing). `acknowledgeDoc` is OWNER-only — managers cannot sign on behalf. **Integrity:** content is frozen at issue (`bodyMd` + `empDocContentHash_` over body+title+type+empId); signing re-verifies the content hash first (a tampered row refuses to sign), bounds the signature payload (INV-96; the pad export caps at 600px — Node-pinned parity with `form_public.html`), and writes an append-only `DocSignatures` row whose `SignatureHash` covers contentHash+empId+docId+signature+ackVersion but NOT the timestamp (Sheets coercion, INV-113 lesson) — the `EmpDocSigned` audit row (`hash=`+`signedAt=`) is the independent witness — written via `writeWitnessAuditLog_` since cycle 10 (C4: retry once, then stamp the `WITNESS_AUDIT_FAILS` Script Property; a lost witness surfaces in Automation Health, the Admin panel, and the failure digest's 48h window — `writeAuditLog_` alone swallows failures, so the witness claim was stronger than the code guaranteed; same treatment for `EmpDocCompleted` and `FormSubmissionReceived`) — and the server-authoritative `EMPDOC_ACK_VERSION` stamps which ack language was shown (bump it when `EMPDOC_ACK_TEXT` changes). `voidDoc` only flips status (never deletes, never edits the frozen body — a correction is a NEW doc; a signed doc keeps its signature row); `verifyDocSignature` recomputes both hashes (legacy/unsigned report explicitly, never as failures) and returns a definitive `tampered` flag (`contentMatch === false || match === false`) so a consumer can't check `match` alone and miss a body-only rewrite (L-4); the client surfaces tamper off that flag, and the append-only `EmpDocSigned` audit row is still the deeper witness. Audit rows `EmpDocIssue`/`EmpDocSigned`/`EmpDocVoid` are content-free (docId/empId/type/hash — never the title or body; the void reason lives only in the scoped HR sheet). Pinned by `test_empdocs_issueSignVerifyFlow` (incl. the fail-closed `empDocCanManagerSee_` cases + tamper detection) + the four gate cases in `test_managerGates_rejectNonManager` + the `empDocValidateIssue_`/`edChipHtml_`/pad-cap Node tests. **C13 AMENDMENT (batch L): see INV-160 — new hashes are NUL-delimited; legacy space-form hashes stay valid via dual-verify** | Subsystem: Server + Client (Training views)

INV-123 | **Training T4 — overdue digest + quiz analytics.** `sendTrainingOverdueDigest` is a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44 family) and best-effort (INV-14 — wrapped in try/catch, never throws). It builds the nudge PER MANAGER: the overdue-TRAINING list is org-wide (training dashboards are NOT team-scoped, INV-120, so every manager sees every rep's overdue training), but the overdue unsigned-DOCS list is TEAM-SCOPED via `empDocCanManagerSee_({email,isManager:true}, doc)` (INV-122 fail-closed — a manager only sees docs they issued or are the employee's roster `ManagerEmail` for). A manager with nothing overdue in their scope is not emailed. `empDocsOverdueAll_` returns `[]` (never throws) when `HR_DOCS_SS_ID` is unset so the training portion still sends. Heartbeat-stamped (`stampDigestLastRun_('trainingOverdue')`); surfaced in the Automation Health "Digest heartbeats" block (stale > 26h). Wired into BOTH `installAutomationTriggers`/`removeAutomationTriggers` TARGETS arrays (the trigger-wiring tripwire pins this). `getQuizAnalytics` is manager-gated (INV-02), read-only, and returns ONLY the per-quiz aggregate from the pure `trainQuizAnalytics_(quizzesMap, attempts)` (attempt counts, distinct reps attempted/passed, pass rate, avg score, avg tries) — no answer keys, no per-question booleans, no per-rep rows, so INV-121's "answer key never leaves the server" boundary is untouched. Pinned by `trainQuizAnalytics_` + the trigger-wiring Node tests, `test_triggerGate_trainingOverdue_nonManagerThrows`, and the `getQuizAnalytics` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Training views)

INV-124 | **Metrics anonymized team-avg is cohort-guarded; only aggregates leave the server.** `getMyMetrics` (rep-callable, caller-identified) reads the WHOLE roster's per-rep-per-day matrix (`getCdrDailyBreakdown_().perRepDaily` for DQE + `getCsrTransferPerRepDaily_()` for the separate **`CSR Transfer Historical Data`** tab) to compute a team benchmark, but returns ONLY aggregates: `series.{pctAnswered,answered,missed,attSeconds,transferPct}` as `[{date, own, team, cohort}]`. The `team` value is the pure `metricsTeamAvgSeries_` mean over reporting reps and is **null whenever that day's cohort < `kpiMinCohort` (3)** — so a small team can't be back-solved to an individual (the #5 privacy boundary). No individual rep's row is ever returned. **The roster filter that defines the cohort SKIPS rows with no `EMP.EMAIL` (cycle-12 F4)** — the skip every sibling roster walk applies (`getManagerDashboard`, `getTeammateStatus`, `getEmployeesList`, `computeMissedClockOuts_`, and `getCoveragePlan` since cycle-9 L-2). Both `getMyMetrics` and `getDashboardMetrics` had omitted it, so an offboarded/placeholder row (name kept, email cleared) whose name still appears in DQE history both INFLATED the cohort — un-hiding the team line on a day fewer than 3 CURRENT reps reported, i.e. weakening the very guard this invariant exists for — and contaminated the average reps are told to benchmark against. Consequence of the fix to expect on a small team: the team line may now be hidden on days it previously showed. The Transfer reader uses `getDisplayValues()` + the shared `cdrRowDateIso_` (Date is `M/D/YYYY`) + `metricsParsePercent_` (`"29.79%"`) per the CDR spreadsheet-tz discipline (INV-64), and since cycle 9 (L-14) its per-day `(rep, date)` cell ACCUMULATES on a collision (matching its `agents` aggregate + the DQE sibling's `prd.rung +=`) instead of overwriting — two rows collapsing to one canonical name on one date (an alias + a raw row, a duplicate import) previously made the per-day series keep only the last row while the aggregate double-counted; the single-row path keeps the sheet's stored pct byte-identical, only a genuine collision recomputes pct from the summed counts. The legacy `cdr`/`trend`/`noteCount`/`noteCoverage` fields are preserved (back-compat). Client (`metrics/script_metrics.html`) renders own (accent) vs team (muted dashed) sparklines per KPI with the cohort note; every server string is `esc()`'d (the Metrics-`esc()` gotcha). **Cycle-17 C17-4 (batch ②):** the per-rep-daily finalize yields `attSeconds: null` (absence) for an answered-nothing day — the literal `0` it used to emit passed `metricsTeamAvgSeries_`'s `v != null` filter and dragged the anonymized team Avg-Talk line (and the rep's own point) toward 0, while every sibling AGGREGATE already treats att≤0 as absence (the INV-180 zero-is-absence rule; agent-level aggregates keep their 0 — their consumers guard with `att > 0`). **SCOPE (operator decision 2026-08-06): this guard is the PER-DAY SERIES guard.** The Dashboard Team/Department card (`getDashboardMetrics`) is a period-AGGREGATE surface and the operator chose visibility there — its `MIN_COHORT` is 1 (cache `dash_metrics_v2`; `team:null` = no data at all), pinned together with the assertion that `getMyMetrics` KEEPS `MIN_COHORT = 3`. Do not read that change as license to relax THIS guard — the per-day series is the back-solvable surface. Pinned by `metricsParsePercent_` / `metricsTeamAvgSeries_` / `metricsBuildKpiSeries_` Node tests + the C17-4 finalize pin + the dashboard-cohort scope pin + `test_metrics_csrTransferFixture_parsesDateAndPercent` + the `mRenderTrendSection_` DOM test | Subsystem: Server + Client (Metrics views)
INV-125 | **Tag-trend analytics (#5).** `getCallNotesTagTrends()` is manager-gated (INV-02/31), read-only, cached (`cn_tag_trends_v1`, 5 min — invalidated alongside the taxonomy cache by the tag-admin ops via `invalidateCnTaxonomyCache_`), and PHI-free (tags + dates only). It reuses the taxonomy's bounded 2-column scan (`SubformData` tags + `DateLocal`) across enrolled reps but buckets by ISO week over the trailing `CN_TAG_TRENDS_WEEKS` (12) instead of total+lastSeen; archived tags are excluded and a window pre-filter (yyyy-MM-dd lexical = chronological) bounds the events array. The week-bucketing is the pure, Node-pinned `cnTrendWeekStarts_` (Monday-anchored, tz-safe day math via `cnIsoToDayNum_`/`cnDayNumToIso_`) + `cnTagTrendsFromEvents_` (bucket → sort by total → top-`CN_TAG_TRENDS_TOPK` (12) → this-wk-vs-prior delta). Client renders a per-tag sparkline + total + delta in the Admin "Tag Trends" panel (`#cn-admin-trends`), every tag label `esc()`'d (the Metrics/CN gotcha). **Cycle-17 batch ②:** the walk carries `skippedReps` and a partial round is never cached (INV-129/187). Pinned by the `cnTrendWeekStarts_`/`cnTagTrendsFromEvents_` Node tests + the batch-2 walks pin + the `getCallNotesTagTrends` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Call Notes views)
INV-126 | **KB review-due workflow (#4).** The KB schema gained trailing `ReviewedAt`/`ReviewedBy` columns (KB enum + `KB_HEADERS`); back-compat like `CN_HEADERS` (legacy rows read undefined and fall back to `UpdatedAt`), and `getOrCreateKbSheet_` self-heals the header width once post-deploy. **Editing counts as reviewing** — `kbSaveItem` stamps `ReviewedAt`/`ReviewedBy` on every save. `kbMarkReviewed(id)` is the no-edit "still accurate" path: manager-gated (INV-02), locked (INV-01), audited (`KbItemReviewed`), bumps only the two cells (no cache invalidation — the tree cache doesn't carry review state and `kbGetReviewDue` reads live). `kbGetReviewDue()` is manager-gated, read-only, PHI-free: items whose last review (or legacy last-edit) is older than `CONFIG.KB.REVIEW_DUE_DAYS` (90), sorted by 30-day usage desc via the factored `kbUsageCounts_` (shared with `kbGetUsageStats`). KB timestamp cells are recovered in the KB spreadsheet's OWN tz via `kbCellDateIso_` (Sheets-coercion discipline). Client renders a manager-only "Review due" block atop the Reference tree with Open + Mark-reviewed. Pinned by the `kbGetReviewDue`/`kbMarkReviewed` cases in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Reference views)
INV-127 | **Coverage planner (#3).** `getCoveragePlan(from, to)` is manager-gated (INV-02), read-only, range-capped (1–14 days), and PHI-free (names + per-tz schedule + PTO status only — never balances). For each manager-tz day it resolves each rep's shift via `empShiftSchedule_` (roster column-O per-rep override wins, else the per-tz schedule — the v1 per-tz-only limitation was removed in Turn D, INV-149) converted to the manager tz (`convertDateTime_`), overlays PTO (`Approved` = off, `Pending` = tentative), and overlays US holidays. Since cycle 9 (L-2) the roster walk skips rows with no EMAIL (sibling parity with `getManagerDashboard`/`getTeammateStatus`/`getEmployeesList`) — a name-only offboarded/placeholder row used to count as a full working shift every day, inflating the confirmed band. Cross-tz straddle is handled by padding rep-local dates ±1 and working in absolute manager-midnight minutes; the hourly distinct-rep concurrency bucketing is the pure, Node-pinned `coverageBucketHours_` (a confirmed rep is never double-counted as tentative; out-of-range clipped), and a rep row whose shift STARTS on the previous manager-tz day carries `startsPrevDay` → the client renders "(from prev. day)" (cycle-8 — a bare "9:30 PM – 6:30 AM" on an IST rep's card read as THIS day's evening coverage). Coverage is shown as THREE bands (returned as `minStaff` / `goodStaff`): ≥ `COVERAGE_STAFF_GOOD` green ("good"), ≥ `COVERAGE_MIN_STAFF` amber ("acceptable"), < `COVERAGE_MIN_STAFF` red ("concerning") + listed in the Understaffed callout; the client bands on the CONFIRMED count. (This deploy: GOOD=7, MIN_STAFF=6.) Surfaced as the managerOnly `coverage` tab in the **Manage** module (moved from Time Clock; `enterCoverageView` in `tc/script_manager.html`, tab key unchanged); every server string `esc()`'d. **The PTO overlay read is best-effort, and since cycle-16 F4 its failure is REPORTED: the response carries `ptoUnavailable` (additive), the client renders a `role="alert"` banner naming the bands as an upper bound, and the green all-clear is downgraded — with the overlay empty every rep counts as working, so silence made the planner report full staffing on a day half the team is off.** Pinned by the `coverageBucketHours_` Node tests + the F4 pin + the `getCoveragePlan` case in `test_managerGates_rejectNonManager` | Subsystem: Server + Client (Time Clock views)
INV-128 | **Design-token hygiene tripwire.** `test/client/run.js` fails CI if any `var(--token)` referenced in a SHARED design-token-consuming partial is defined nowhere in `styles_design_tokens.html` (or the allowlist). It guards against the redesign foot-gun of referencing a renamed/typo'd CSS custom property that silently renders as the fallback/transparent. `form_public.html` is EXCLUDED (it's a standalone page that ships its own inline palette, not the token partial); the explicit allowlist is currently empty (every token resolves). SCOPE precision (cycle-10 audit note): the implementation builds its defined-token set from ALL shared HTML files, not the token partial alone — so a token declared only in a tool partial passes (behaviorally-correct CSS; weaker than the single-source rule this entry implies — e.g. the two `--lo-*` loader aliases live in `styles.html`). Adding a new `var(--x)` to a shared partial means declaring `--x` in `styles_design_tokens.html` (or, rarely, allowlisting it) | Subsystem: Test Suite
INV-129 | `getMyMetricsRange(from, to)` is caller-scoped via `getEmployeeInfo_()`, read-only, validates both dates (`^\d{4}-\d{2}-\d{2}$`, `from ≤ to`) and caps the span at 92 days. It returns the rep's OWN aggregate CDR metrics + an own-only per-day trend + note count for the range — NO team line and NO anonymized team series (those are INV-124's `getMyMetrics` single-day surface). Powers the My Stats Yesterday/7D/30D range presets (Yesterday = the previous workday since 2026-08-17). Returns `cdr: null` (not an error) when the agent has no DQE data. Since cycle 9 (L-13) the assembled result is CacheService-cached per (rep, from, to) for `CDR_CACHE_TTL` — the exact L-1 pattern `getMyMetrics` uses (INV-67 stays literally true: `getCdrDailyBreakdown_` itself remains uncached, it just isn't re-called on a hit; error results never cached; bypassed under `_TEST_OVERRIDE_CDR_SS_ID`). **Cycle-11 L-3: "error results never cached" covers the PARTIAL failure too** — a thrown per-day trend read degrades to `trend: []` + `trendUnavailable: true` for that response but SKIPS the cache put, so a transient CDR failure can no longer pin an empty sparkline as fresh for the full TTL (Node-pinned). **Cycle-12 F5 generalizes the rule to the NOTE read and to the sibling endpoint caches:** a failed `cnCountNotesResult_` read degrades to `noteCountUnavailable: true` with `noteCoverage: null` and likewise skips the put — and the same guard now applies to `getMyMetrics`'s `metrics_my_v1:` cache and `getDashboardMetrics`'s `dash_metrics_v1:` cache, which previously would have pinned a degraded coverage figure for the full 5-minute TTL (the Clock strip reads `getMyMetrics`, so the stale round outlived the transient failure that caused it). **Operator #5 (2026-08-06) added the transfer read to the same set:** a THROWN `getCsrTransferPerRepDaily_` read in `getMyMetricsRange` degrades to `transfer: null` and skips the put (`!transferThrew` joins the guard); a reader-returned `meta.error` (Transfer tab absent — a steady CONFIG state, not transient) also yields null but stays cacheable, per the documented "Transfer trend simply absent" posture. Rule of thumb for any new result cache here: **cache only fully-successful rounds** | Subsystem: Server + Client (Metrics views)
INV-130 | `getMyNoteHourBuckets(date)` is caller-scoped via `getEmployeeInfo_()`, read-only, validates the date, and returns a 24-element array of the caller's own LOGGED-NOTE counts bucketed by REP-LOCAL hour (`empTz_`) for that day — sourced from the rep's call-notes Sheet (the bounded `readCallNoteRowsInRange_` + `normalizeDate_`/`CN.TIMESTAMP` coercion guards), NOT from CDR. PHI-free (hour counts only). Not enrolled → all-zero buckets (never throws). Powers the Clock-view day-ribbon note-volume histogram | Subsystem: Server + Client (Time Clock views)
INV-131 | The `emailFromCallNote` dept-request auto-log is IDEMPOTENT per open `(noteId, deptLabel)` request (A5): before send, `drFindOpenRequest_(noteId, deptLabel)` (bounded tail of `DR_MAX_SCAN` rows, newest-first) reuses an existing OPEN row's `ReqId` as the resolve token and the post-send block SKIPS the append (auditing `resend`), so re-sending the same note to the same dept re-notifies without opening a second request. The lookup is best-effort (any throw → fresh token, never fails the send) and hash-safe (the token rides the CTA appended AFTER the INV-41 check; only the token VALUE changes). The `DR.NOTE_ID` column (col 11) is a back-compat trailing add (`DR_HEADERS` 11→12, the `CN_HEADERS`/`FS_HEADERS` posture — legacy rows read `''` and never dedupe). The resolve-by-token scans (`resolveDeptRequest`/`markDeptRequestResolved_`) stay FULL and don't read `NOTE_ID`. Pinned by `test_deptReq_resendDedupLookup` | Subsystem: Server + Client (Call Notes views)

INV-132 | `archiveOldCallNotes` is the SAFE (non-destructive) cold-archive tier for call-note retention — a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44 family) and locked (INV-01). Across every enrolled rep's per-rep Sheet it MOVES `Notes` rows older than `CN_NOTE_ARCHIVE_DAYS` (Script Property → `CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS`, default **0 = disabled**) into a `NotesArchive` tab (`CONFIG.CALL_NOTES.ARCHIVE_TAB`) in the SAME spreadsheet via `archiveSheetRowsOlderThan_`, which **appends-then-deletes with a `flush()` between** — so a mid-run failure can only DUPLICATE into the cold archive, never lose (the source row survives and is re-archived next run). Data is preserved (the canonical record stays); the live `Notes` tab is bounded; no new operator store. Moved rows are normalized to max(canonical width, widest source row) — cycle-11 L-16: the old truncate-to-`CN_HEADERS`-width silently destroyed human-added trailing columns on the move, contradicting this invariant's "never lose" (two-way Sheet entry makes hand annotations plausible); the archive grid grows when a wider row needs it. Date read from `CN.DATE_LOCAL` via `parseRetentionDateMs_` (the Sheets-coercion guard). Cross-rep; per-rep Sheet failures are skipped; writes a PHI-free `CallNotesArchive` audit row (counts only; in `AUTOMATION_AUDIT_ACTIONS` so Automation Health surfaces last-run). Archived notes are NOT in the default in-app readers (all go through `getCallNotesSheet_`→`NOTES_TAB`); the opt-in include-archive search (INV-133) is the only reader that reaches the cold tab. `purgeOldCallNotes` never touches `NotesArchive` — the 3rd-tier `purgeArchivedCallNotes` (INV-133) is the only deleter of archived notes. Scheduled at manager-tz 3am, BEFORE the 4am `purgeOldCallNotes`, so archive-first ordering holds; wired into BOTH `installAutomationTriggers`/`removeAutomationTriggers` TARGETS (the trigger-wiring tripwire pins this). Pinned by `test_triggerGate_archiveOldCallNotes_nonManagerThrows` | Subsystem: Server

INV-133 | The call-note retention 3rd tier + its controls. (a) `purgeArchivedCallNotes` is a top-level trigger handler (reachable via `google.script.run`) gated with `assertManagerCaller_` (INV-44) and locked (INV-01); it irreversibly deletes each rep's `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS`, default **0 = disabled**) — the ONLY deleter of archived notes. READ-ONLY w.r.t. tab existence (`getSheetByName`, never creates `NotesArchive`); date from the preserved `CN.DATE_LOCAL` via `parseRetentionDateMs_`; cross-rep, per-rep failures skipped; PHI-free `CallNotesArchivePurge` audit (in `AUTOMATION_AUDIT_ACTIONS`). Scheduled manager-tz 2am (before the 3am archive); in BOTH TARGETS (trigger-wiring tripwire). Pinned by `test_triggerGate_purgeArchivedCallNotes_nonManagerThrows`. (b) `searchMyCallNotes`/`managerSearchCallNotes` accept a trailing `includeArchive` flag (default off — 4-arg callers unaffected) that ALSO scans the cold tab (read-only) and tags hits `_archived`; the INV-45 field-scope logic is byte-identical (factored into a per-source closure). (c) `getRetentionConfig` (read-only summary + `retentionWarnings_` safety ordering, Node-pinned) + `saveRetentionConfig` (writes the three Script Properties, whole-days validation, `AdminConfigChange` audit) are manager-gated (INV-31/INV-57 family, omnibus-pinned); the client danger-confirms enabling/raising either irreversible purge window | Subsystem: Server + Client (Call Notes views)

INV-134 | **Coaching is team-scoped (fail-closed), HR-class, and content-free in the audit log.** Coaching items (granular, non-routine manager feedback on a specific patient/TRX interaction; severity praise/minor/major/critical) live ONLY in a `Coaching` tab in the dedicated `HR_DOCS_SS_ID` spreadsheet (keep-forever, EXCLUDED from every retention purge — the EmpDocs posture; `getOrCreateEmpDocSheet_` auto-provisions it). **Scoping:** `getMyCoaching`/`acknowledgeCoaching` are owner-scoped (the rep's own `EmpId`); manager read/void (`getCoachingDashboard`, `voidCoaching`) require `coachCanManagerSee_` — caller CREATED the item OR is the employee's roster `ManagerEmail` (column M); `MANAGER_EMAILS` membership alone grants nothing, blank column M narrows to owner+issuer (the INV-122 fail-closed rule). `createCoaching`/`acknowledgeCoaching`/`voidCoaching` are locked (INV-01); the three manager endpoints are gated (INV-02). The patient/TRX + free-text narrative are HR-class PHI-adjacent and persist ONLY in the HR store — the shared `CoachingCreate`/`CoachingAck`/`CoachingVoid` audit rows are content-free (coachId/empId/severity only, never the patient/TRX or narrative). **The void REASON is free text that plausibly names a patient/TRX, so it persists ONLY in the Coaching tab's trailing `VoidReason` column (cycle-8 M-6; `COACH_HEADERS` 13→14, `CO.VOID_REASON:13`, header self-heals via `getOrCreateEmpDocSheet_` — the voidDoc pattern); until that fix `voidCoaching` wrote `reason=` into the shared AuditLog, which the compliance panel + admin sheet viewer surface. Never route it back there.** `acknowledgeCoaching` is idempotent (already-acked → friendly no-op). The pure `coachValidate_` (whitelist-built; severity ∈ `COACH_SEVERITIES`, caps `COACH_TEXT_MAX`/`COACH_TRX_MAX`) and `coachUnackedOverdue_` (open + non-praise + older than `CONFIG.COACHING_UNACK_REMINDER_DAYS`, default 7) are Node-pinned. Un-acked overdue coaching is folded into the existing daily `sendTrainingOverdueDigest` (team-scoped per manager via `coachCanManagerSee_` — NO new trigger), so 'praise' never nags. Notifications (rep on create, manager on ack) are best-effort (INV-14) and PHI-minimal — they name only the severity, never the narrative. Tied to the call-note training flag via the "Coach on this" button (`window.COACH_PREFILL`, the `CLK_NAV_HINT` pattern) — its deep-link is `enterTool('develop','coaching')` (the TOOL key is `develop`, NOT `training`; the cycle-9 H-1 wrong-key call was a silent no-op, now pinned by the enterTool TOOL-key tripwire). **Metrics:** `getCoachingDashboard` also returns an `analytics` block from the pure, Node-pinned `coachAnalytics_(items, nowMs, reminderDays)` (totals, by-severity, ack-rate, overdue-unacked, median days-to-acknowledge via `coachParseTs_`/`coachMedian_` — UTC-parsed so the tz cancels in the ack−created diff, and a per-rep breakdown most-overdue-first) — rendered as a metrics panel in the Coaching tab's Team mode; no new endpoint/gate (it rides the already team-scoped dashboard, PHI-free). **UI note:** the former rep `coaching` + manager `coachingManage` tabs were MERGED into one non-managerOnly `coaching` tab (`enterCoachingView`) with a manager-only Mine ⇄ Team toggle (`coachSwitchMode_`, persisted to `umsCoachingMode`) — a pure client reorganization; every endpoint, gate, scope, and audit row above is unchanged. Pinned by the `coachValidate_`/`coachUnackedOverdue_`/`coachAnalytics_`/`coachMedian_` Node tests + the three gate cases in `test_managerGates_rejectNonManager` + (cycle 9) the six-rule `coachCanManagerSee_` Node unit pin and the `test_coaching_createAckVoidFlowAndScoping` editor flow test | Subsystem: Server + Client (Training views)

INV-135 | **Employee Docs v2 — templates, fillable fields, draft→release, dual reminders (extends INV-122).** The `EmpDocs` tab gained TRAILING `FieldsJson`/`ResponsesJson` columns (back-compat like `CN_HEADERS`/`FS_HEADERS`; `getOrCreateEmpDocSheet_` self-heals a short header width once post-deploy — the INV-126 pattern). **Hash back-compat is load-bearing:** `empDocContentHash_(body,title,type,empId,fieldsJson)` and `empDocSignatureHash_(...,responsesJson)` append the new input ONLY when non-empty, so legacy 4-/5-arg rows hash identically (old stored hashes/signatures stay valid); callers MUST pass the RAW stored `fieldsRaw`/`responsesRaw` cell strings (not a re-serialized object) for byte-stable recompute, and `verifyDocSignature` does. **Fields:** the pure `empDocValidateFields_` (Node-pinned — slug-id from label, dedupe, type ∈ `text`/`textarea`/`date`, cap `EMPDOC_FIELD_CAP`) + `empDocValidateResponses_` (required filled, size/date bounds, only-known-ids kept) + `empDocNeedsAction_` (issued + signature-or-required-field). `acknowledgeDoc(docId, signature, responses)` now validates+stores responses (the responses are attested — folded into the signature hash); a fields-only doc (no `requiresSignature`) completes WITHOUT a signature → status `completed` (audit `EmpDocCompleted` — since cycle 9 carrying `hash=`; since cycle 11 (L-6) the issuer notification says "Completed:", not "Signed:" — `notifyEmpDocSigned_` takes a `completedOnly` flag, an HR paper-trail wording fix); the responses are persisted BEFORE the status flip. **Fields-only completions are hashed too (cycle-9 M-8):** completion appends a `DocSignatures` row with an EMPTY signature cell (the completion-row marker — don't "fix" it to a placeholder) whose hash is `empDocSignatureHash_` with an empty signature segment (no new hash function; recompute stays byte-stable via the stored `responsesRaw` cell), cert `kind:'completion'`. `verifyDocSignature` detects the empty-sig row → `{completed:true, signed:false, match, tampered}`, so an out-of-band `ResponsesJson` rewrite is detectable on BOTH paths; docs completed BEFORE this shipped have no row and still report unsigned/legacy (never tampered). Pinned by `test_empdocs_fieldsOnlyCompletionHash`. **Draft→release:** `issueDoc` accepts `release:false` → status `draft` (invisible to the employee — `getMyDocs`/`getMyDoc` hide drafts; no notify); `releaseDoc(docId)` (manager-gated, team-scoped, locked) flips draft→issued + notifies (audit `EmpDocRelease`). **Templates** (org-wide, PHI-free form shells — NOT team-scoped) live in an `EmpDocTemplates` tab: `getEmpDocTemplates`/`saveEmpDocTemplate` (upsert, `empDocTemplateValidate_`)/`deleteEmpDocTemplate`, all manager-gated; issuing prefills from one client-side. **Reminders:** `sendTrainingOverdueDigest` now also emails the EMPLOYEE about their own overdue docs (`sendEmployeeOverdueDocsEmail_`, one per employee, best-effort) and overdue covers fields-only docs (via `empDocNeedsAction_`). INV-122's team-scoping / frozen-content / append-only-signatures / never-purged guarantees are unchanged. Pinned by the `empDocValidateFields_`/`empDocValidateResponses_`/`empDocNeedsAction_` Node tests + the `releaseDoc`/`getEmpDocTemplates`/`saveEmpDocTemplate`/`deleteEmpDocTemplate` gate cases | Subsystem: Server + Client (Training views)

INV-136 | **Admin tier (Manage module).** A distinct above-manager role gating the Manage module's **Admin** tab + its config/system endpoints. `empIsAdmin_(email, isManager)`: when Script Property `ADMIN_EMAILS` is SET (comma-separated) admins are EXACTLY that email list; when UNSET/empty EVERY manager is an admin (so a fresh deploy + the test suite behave as before — admin == manager — keyed off the SAME roster `isManager` the endpoints use, NOT the `MANAGER_EMAILS` property, avoiding the F5 mismatch). Admins are a SUBSET of managers — ENFORCED in code since cycle 7 (M-10): `empIsAdmin_` returns false for any non-manager regardless of `ADMIN_EMAILS` membership (previously the subset was an unenforced operator obligation — a non-manager email in the property became an undocumented privilege tier). Shipped on `getEmployeeInfo_` (`emp.isAdmin`) + `getEmployeeState` (`empState.isAdmin`). **Client:** the `adminOnly` tab flag → `tabVisibleForUser_` (adminOnly→isAdmin) + `toolVisibleForUser_` hides the fully-gated Manage tool from non-managers; pinned by the `tabVisibleForUser_` + registry-reorg Node tests. **Server:** these **43 Admin-exclusive endpoints** now gate on `emp.isAdmin` returning `'Admin access required.'` (NOT `'Manager access required.'`): `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`, `saveUpdateSuggestions`, `saveEmailTemplates`, `saveExternalLinks`, `saveAutoTagRules`, `getFeatureFlags`, `saveFeatureFlags`, `getRetentionConfig`, `saveRetentionConfig`, `getDeptRequestSla`, `saveDeptRequestSla`, `saveSpanishInboxMembers` (the in-app Spanish bilingual-member editor, operator 2026-08-18 — reads ride `getAdminConfig.spanishMembers`) (NOTE: `getFeatureFlags` and `getDeptRequestSla` currently have NO client caller — the Admin UI reads both via `getAdminConfig`; kept by cycle-11 decision as the symmetric read APIs since they delegate to the same helpers, no parallel logic to drift), `saveKbAiSettings`, `getStorageHealth`, `getAutomationHealth`, `getDeployReadiness`, `getAdminSheetView`, `getCallNotesAuditLog`, `getCallNoteAuditHistory`, `getCallNotesTagTaxonomy`, `getCallNotesTagTrends`, `renameCallNoteTag`, `mergeCallNoteTags`, `archiveCallNoteTag`, `getCallNotesEnrollment`, `provisionCallNotesSheet`, the **team-member onboarding** set `addEmployee`, `offboardEmployee`, `getOnboardingPanel`, `getOnboardingCdrReadiness` (roster management — the validated in-app replacement for hand-editing the Employees sheet; operator request 2026-08-07, pre-pilot), the **Reference (KB) content-authoring** set `kbSaveItem`, `kbDeleteItem`, `kbUploadImage`, `kbConvertDriveDoc`, `kbConvertDriveSheet`, and the **authoring-adjacent KB** set `kbGetRevisions`, `kbPublishItem`, `kbRevertItem` (INV-140) + `kbGetSearchConfig`, `kbSaveSearchConfig` (the #8 synonym config), and `getViewUsageStats` (the pre-pilot feature-usage aggregate, operator 2026-08-13). **MACHINE-CHECKED since cycle-12 F7/F9** — this list drifted four times before the machine check (24→28→30→35; 38 with the onboarding trio, 39 once the panel's CDR half split off, 40 with the Sheet→article converter — each updated in the same commit that changed the set). Two Node tripwires now enumerate the functions returning `'Admin access required.'` straight from `Code.js` source: **F7** asserts the stated count equals the enforced count AND that every enforced admin endpoint is backtick-named in THIS paragraph; **F9** asserts every gated endpoint (admin or manager) is referenced by a gate test (`test_managerGates_rejectNonManager`'s cases or a dedicated `*_nonManagerRejected` / `*_nonManagerThrows` test), with one reasoned allowlist entry for the private helper `managerAggregateFlagged_`. So adding a gated endpoint now fails CI until both the doc list and a gate test catch up — edit this list when you change the gated set, don't re-grep by hand. **`getEnrolledCallNotesReps` stays MANAGER-gated** (shared with the Team Notes Per-Rep dropdown + the audit-panel rep filter). **`reconcileCallNotes` was REVERTED to the MANAGER_EMAILS `assertManagerCaller_` trigger gate** (cycle 6 F1/F2): #102 briefly admin-gated it, but it is a daily TRIGGER handler, so `emp.isAdmin`/roster gating silently no-op'd the nightly run under a narrowed `ADMIN_EMAILS` or a non-roster installer — see INV-109. All other manager surfaces (Manage Time / Coverage / Punctuality / Team Notes / Team Metrics, and the KB **review/analytics** endpoints `kbMarkReviewed` / `kbGetReviewDue` / `kbGetUsageStats`, plus Training/EmpDocs manager endpoints) stay `isManager`. **Reference client split:** `getReferenceTree` ships `isAdmin`; the Reference tool's authoring affordances (Add / Edit / Delete / Convert) gate on `KB_STATE.isAdmin`, while the manager "Most used" / "Review due" analytics blocks stay `KB_STATE.isManager`. This AMENDS the per-endpoint gating noted in INV-31/57/82/92/93/115/118/119/125/133 for the listed endpoints (manager→admin). Pinned by `test_managerGates_rejectNonManager` (the `ADMIN_GATED` set asserts `'Admin access'` — incl. the 4 KB endpoints), `test_cn_tagAdmin_nonManagerRejected`, `test_provisionCallNotesSheet_nonManagerRejected` (`test_reconcileCallNotes_nonManagerRejected` now pins the MANAGER trigger gate — see INV-109, not this admin set) | Subsystem: Server + Client (shell) + Client (Reference views)

INV-137 | **Automation-failure manager digest.** `sendAutomationHealthDigest` is a top-level TRIGGER handler (daily manager-tz 9am) reachable via `google.script.run`, so it carries the MANAGER_EMAILS `assertManagerCaller_` gate (INV-44 family, NOT `emp.isAdmin` — it runs as the installer; pinned by the trigger-gate Node tripwire + `test_triggerGate_automationHealthDigest_nonManagerThrows`) and is best-effort (INV-14 — try/catch, never throws past the catch). It reuses `computeAutomationHealth_()` — the UN-gated body factored out of `getAutomationHealth` so the push and the Admin panel share ONE computation (no parallel-source drift; the gate stays in the `getAutomationHealth` wrapper) — and emails `MANAGER_EMAILS` ONLY when a check is failing: a **stale digest heartbeat**, a **stale nightly reconcile** (the F1 class — `automationLastRuns[].last.ms`, the additive raw-ms field, older than 30h; reconcile is the one unconditional daily job that writes a row every run, so a stale last-run = a silently-dead trigger), or **personal-sheet sync-fails** — plus (Turn C) any **dead detector** from `automationDetectorChecks_()` (a failing writer↔parser round-trip or missing diagnostic channel — the failure class the other checks can't see). A HEALTHY system is silent (no daily nag), and "never ran yet" (no heartbeat / no reconcile row) is NOT flagged (fresh-deploy / not-yet-installed posture, matching the panel). CDR reachability is deliberately NOT pushed (it isn't a trigger; an unset `CDR_SS_ID` reads as unreachable and would false-nag a non-CDR deployment — the panels already surface it). PHI-free (counts + job names, all `esc_`'d via `buildBrandedEmailHtml_`, tone warn). The watcher writes no audit row + has no heartbeat of its own (verify it from the trigger list). Wired into BOTH `installAutomationTriggers`/`removeAutomationTriggers` TARGETS (the trigger-wiring tripwire pins this). | Subsystem: Server

INV-138 | **DeptRequests v2 — department membership, incoming inbox, SLA, reminder digest.** (a) **Membership:** roster **column N `Departments`** (`EMP.DEPARTMENTS=13`; `ROSTER_CACHE_KEY` bumped to `employee_roster_v7` per INV-28) is a `;`/`,`-separated list of dept names the rep staffs. `getEmployeeInfo_`/`lookupEmployeeById_` carry the raw cell as `departmentsRaw`; `empDepartments_(emp)` resolves it via the pure, Node-pinned `drParseDepartments_(raw, validKeys)` — canonical-cased + deduped + validated against the LIVE `getDepartmentEmails_()` keys (an unknown name is DROPPED so a typo can't route an inbox). `getEmployeeState` ships `departments` for client gating. (b) **Incoming inbox:** `getDeptRequests` returns `myDepts` + `incoming` (OPEN requests whose `toDept` ∈ the caller's departments; managers also get `allOpen`) — PHI-free (requester name + label + age; the request CONTENT stays in the email, never the store). `resolveDeptRequest` widens ownership to **sender OR manager OR a member of the request's receiving `toDept`** (the in-app "receiving agent marks resolved" path). (c) **SLA (wall-clock):** `CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS`=48 + per-dept overrides in Script Property `DR_SLA_TARGETS` (`{dept:hours}`, sanitize-on-read); `getDeptRequestSla_(dept, map)` resolves (config read ONCE per `getDeptRequests`, not per row); the pure, Node-pinned `drSlaStatus_(ageMin, slaHours)` bands ontime / at-risk (≥75%) / overdue (≥100%). Each request item carries `slaHours`+`slaStatus`; `deptStats` gains `overdueOpen`. The Admin **Dept-Request SLA targets** editor (`getDeptRequestSla`/`saveDeptRequestSla`, **admin-gated** INV-136, `AdminConfigChange` audit, 1–720h validation, also folded into `getAdminConfig.deptSla`). (d) **Reminder digest:** `sendDeptRequestReminderDigest` (INV-44 trigger handler, INV-137 sibling). (e) **Multi-dept sends (cycle-8 M-5):** a multi-select department email stores the JOINED label ("Billing, Shipping") in `ToDept`; every per-dept consumer routes through `drSplitDepts_` (component names, `'Other'` dropped — legacy `'Other'`-only rows fall back to the raw label): the Incoming inbox and member-resolve match ANY component, per-request SLA = `drSlaForToDept_` (the STRICTEST/minimum component SLA — every listed dept is expected to respond), and `deptStats` counts the request under EACH component department. Before this, a multi-dept send behaved as an unknown pseudo-department (no inbox, no member resolve, default SLA). The store stays PHI-free (no email body) and the dedicated `DEPT_REQUESTS_SS_ID` sheet's tz must equal `CONFIG.TIMEZONE` (the `drNowTs_` ISO-T form + `parseTimestampMs_` round-trip). Pinned by `drParseDepartments_` / `drSlaStatus_` / `drSplitDepts_` / `drSlaForToDept_` Node tests + `test_deptReq_incomingAndMemberResolve` + the `getDeptRequestSla`/`saveDeptRequestSla` cases in `test_managerGates_rejectNonManager` + `test_triggerGate_deptReqReminder_nonManagerThrows`. | Subsystem: Server + Client (Metrics views) + Client (Call Notes views)
INV-139 | **Self-improving-KB loop — rep freshness signal (#2) + content-gap requests (#1).** Both feed the manager review workflow via two new PHI-free-by-policy tabs in the KB spreadsheet (the KbViews posture — deployer-only, append-only, zero new operator state; auto-provisioned on first touch). **(#2 freshness):** `kbFlagItem(itemId, kind, note)` is rep-callable (requires `getEmployeeInfo_`), append-only, locked (INV-01); `kind ∈ helpful | notHelpful | stale` (validated before any write). A `stale` flag ("out of date") surfaces the item at the TOP of `kbGetReviewDue` REGARDLESS of age and sorts it first — an item is "flagged stale" when it has a `KbFeedback` stale row STRICTLY NEWER than the item's last `ReviewedAt` (the INV-120 completion-vs-assignment reset — `kbMarkReviewed` bumps `ReviewedAt` and the flag clears with NO status column; datetime-granular compare via `kbCellTs_`, recovered in the KB sheet's OWN tz per the `kbCellDateIso_`/`normalizeAuditTs_` discipline). Only the actionable `stale` kind writes an audit row (`KbItemFlagged`, id only — helpful/notHelpful are lightweight signal, un-audited like `kbRecordView`); the rep's note stays in the PHI-free-by-policy KB store, never the shared AuditLog. `kbGetReviewDue` items gain `staleFlags`+`staleNote` (back-compat: a fresh deploy with no `KbFeedback` tab → `kbStaleFlags_` returns `{}` → identical to prior behavior). **(#1 content-gap):** `kbRequestArticle(topic, note, query)` is rep-callable, append-only, locked — a DELIBERATE "please write an article about X" (fired from a ZERO-RESULT Reference search); the deliberate rep action is what keeps it PHI-free-by-policy (topic, not patient specifics; UI reminds). Lands in the manager `KbContentRequests` queue. `kbGetContentRequests` (read-only, bounded tail) + `kbResolveContentRequest(reqId, action∈resolved|dismissed)` (locked) are MANAGER-gated (INV-02 — the review-workflow tier alongside `kbGetReviewDue`/`kbMarkReviewed`, NOT the admin content-authoring tier of INV-136). Audit rows PHI-free: `KbContentRequest` / `KbContentRequestResolve` (reqId + action only). Client: reader "Was this helpful? Yes/No + Out of date" bar (`kbFeedbackBarHtml_`), zero-result "Request an article" CTA (`kbNoResultsHtml_` → `uiPrompt`), manager "Content requests" + stale-pill review-due blocks in the Reference landing; every server string `esc()`'d. The reader bar + zero-result CTA also render in the Ctrl/⌘+K drawer (`kbDrawerOpenItem_`/`kbDrawerSearch_`); the bar is located via `closest('.kb-feedback')` (no DOM id) so tab + drawer never collide. `kbFeedbackCounts_()` (cumulative helpful/notHelpful over the bounded feedback tail) folds into the manager Most-used + Review-due rows (`kbFbCountHtml_`, hidden when empty). Pinned by `test_kb_feedbackAndRequests_requireEmployee` (rep-auth + kind/topic validation) + the `kbGetContentRequests`/`kbResolveContentRequest` cases in `test_managerGates_rejectNonManager`. | Subsystem: Server + Client (Reference views)
INV-140 | **KB article revision history + draft→publish (#4).** The KB schema gained a TRAILING `Status` column (`KB.STATUS=12`, `KB_HEADERS` → 13; back-compat like `CN_HEADERS`/`FS_HEADERS` — a blank/legacy cell reads as `published` via the pure `kbRowStatus_`; `getOrCreateKbSheet_` self-heals the header width once post-deploy, the INV-126 pattern). `KB_CACHE_KEY` bumped `v1→v2` (the cached tree items now carry `status`). **Draft→publish:** `kbSaveItem` accepts `payload.status ∈ published|draft` (explicit wins; on a plain re-save the EXISTING row's status is PRESERVED so an edit never silently flips visibility; new items default published). A `draft` is INVISIBLE to reps/non-admins across ALL read paths — `getReferenceTree` (the cache holds every item incl. drafts, each tagged with status, and the draft filter is applied PER-VIEWER so one blob serves both), `getReferenceItem` (a rep gets `'Not found.'`, indistinguishable so existence doesn't leak), `searchReference` (draft rows skipped for non-admins; since cycle-17 batch ⑤ each hit carries the item `status` and the chunk-group header renders the Draft pill for admins — a draft chunk previously rendered identically to a published one; reps only ever receive `published`), and `kbGetReviewDue` (drafts aren't live content). `kbPublishItem(id)` flips draft→published (mirrors EmpDocs `releaseDoc`). Cycle 7: `searchReference(query, {publishedOnly:true})` is a narrowing-only option that forces the draft skip REGARDLESS of caller — used by `kbGetFacetGuidance`, whose result caches ORG-WIDE (an admin-triggered retrieval could otherwise serve reps draft-derived guidance + source titles, M-12); `kbConvertDriveDoc` returns the item's `status` and the convert flow seeds it into the editor (converting a draft embed then saving used to silently publish it, M-13); draft items are rejected by `saveTrainingAssignment`, hidden from `getMyTraining`, and excluded from the overdue digest (L-9). **Revision history:** every `kbSaveItem` UPDATE, every revert, AND (cycle-9 L-20) every `kbDeleteItem` snapshots the PRIOR/FINAL content to an append-only `KbRevisions` tab via `kbAppendRevision_` (best-effort — a revision-log failure must NEVER fail the save/delete; the delete snapshot uses action `delete`, and restoring a deleted item is a manual copy from `KbRevisions` today — an undelete endpoint is a follow-on). `kbGetRevisions(id)` (read-only, bounded newest-first) lists prior versions; `kbRevertItem(id, revId)` restores a snapshot's CONTENT (title/type/body/drive fields; dept/sortOrder/status/id stay current) and snapshots the current content first (action `revert`), so a revert is itself reversible. **All three (`kbGetRevisions`/`kbRevertItem`/`kbPublishItem`) are ADMIN-gated** (`emp.isAdmin`, `'Admin access required.'` — authoring-adjacent, the INV-136 tier alongside `kbSaveItem`); the mutating two are locked (INV-01). Audit rows PHI-free: `KbItemPublish`/`KbItemRevert` (id/revId only), and `KbItemSave` now carries `status=`. Client: a "Save as draft" checkbox in the editor, a "Draft" pill (tree + reader) + "hidden from reps" banner, and reader **Publish** / **History**(→restore) actions (all `KB_STATE.isAdmin`-gated); every server string `esc()`'d. PHI-free by policy (KB content). Pinned by the `kbGetRevisions`/`kbRevertItem`/`kbPublishItem` cases in `test_managerGates_rejectNonManager`. | Subsystem: Server + Client (Reference views)


INV-141 | `createPinnedSpreadsheet_(name)` is the ONLY sanctioned spreadsheet-creation path — it pins the new sheet's TIMEZONE and LOCALE to the ADP sheet's (a bare `SpreadsheetApp.create()` inherits the script tz `America/Chicago` + the deployer's locale: the tz shifted raw coerced Date cells in the payroll export (cycle 7 H-2); a coercing locale turns stored ISO-T strings into Dates on read (the M-14/`formTokenCellMs_` class)). Callers: `generateExportSheet_`, `exportCallNotesRange`, `provisionCallNotesSheet`. Pinned by three Node tripwires: the factory contains both pins; a comment-stripped count of `SpreadsheetApp.create(` in Code.js must be exactly 1 (inside the factory); all three call sites reference the factory | Subsystem: Server
INV-142 | Every read of the CN `Timestamp` column routes through `cnTimestampString_` (recovers a locale-coerced Date to the as-written `yyyy-MM-dd'T'HH:mm:ss` digits in the ADP sheet tz — valid because per-rep sheets are pinned to it, INV-110/141; strings pass through). Readers: `callNoteRowToObject_` (sorting, shift-span regex, EOD display), `deleteCallNote` (the 5-min window FAIL-OPENED on a coercing sheet), `getCallNotesAmbient` (stale-flag counter), `getMyTrainingQA` (sort key), and — since cycle 8 — `getMyNoteHourBuckets` (its old inline guard recovered in the REP's tz, not the sheet's, so a coercing-locale sheet put every CST rep's histogram ~11.5h off; the recovered string's hour digits are the as-written rep-local hour). `reconcileCallNotes` routes through the helper too since cycle 10 (C1 — its "equivalent" inline guard recovered in the REP's tz, not the sheet's, misdating CST reps' hand-entered rows; the scan's whole-line reconcile exemption was removed with it). **Cycle-11 L-5: `CN.EMAILED_AT` joins the boundary** — it is written in the same locale-coercible ISO-T form (`emailFromCallNote`'s stamp), `callNoteRowToObject_` reads it via `cnTimestampString_`, and the global scan covers `[CN.EMAILED_AT]` too. Pinned by the INV-142 source tripwire (enumerated readers + a global scan over BOTH columns with NO exemptions; the write-exemption regex is `=(?!=)` so a comparison read can't pass as a write) | Subsystem: Server
INV-143 | `sanitizeCallNotePayload_` WHITELISTS client-supplied `subformData` keys at submit: only `trainingQuestion` (trimmed, ≤2000 chars), `completionSeconds` (finite positive number, rounded), and — since cycle 9 (M-3) — `intakeType` (a BOUNDED `ppd`\|`pmd`\|`pap` enum, case-normalized, off-enum drops; the intake auto-log note's `cnIntakePillHtml_` chip keys off it, and the cycle-7 whitelist had silently stripped it so every intake-logged note persisted un-chipped) survive; a lone legacy `flagType:'urgent'` folds into `flags:['urgent']`. Everything else (`trainingReply*`, `feedback[]`, `pinned`/`pinnedAt`, `formSubmission`, `externalEmails`, …) is stripped — those keys are written ONLY by their own gated server endpoints, keeping INV-49/50 server-enforced (a crafted submit could previously forge a manager reply or bypass the 3-pin cap). The intake client sends its `intake-<type>` tag TOP-LEVEL via `p.tags` (the only tags path sanitize reads — tags nested inside `subformData` are dropped). A new client-sent submit key MUST be added to the whitelist or it is silently dropped. Pinned by the sanitizeCallNotePayload_ Node tests (incl. the C9 M-3 intakeType case) | Subsystem: Server
INV-144 | `empIsAdmin_` returns false for ANY non-manager regardless of `ADMIN_EMAILS` membership — admins ⊆ managers is ENFORCED, not an operator obligation (INV-136 amendment). A set `ADMIN_EMAILS` NARROWS admins to listed managers; unset ⇒ every manager is an admin. Pinned by `test_adminEmails_subsetOfManagersEnforced` (sets the property to a non-manager, asserts the direct helper + a gated endpoint reject; restores the property in finally) | Subsystem: Server
INV-145 | The department composer sets `composer.sending` for the duration of the send RPC: `cnComposerSend_` double-fire-guards on it, and `cnCloseComposerModal_` REFUSES to close (toast, overlay stays) until the RPC settles — an Esc/backdrop-click mid-send previously ran the Save&Compose rollback and deleted the note the in-flight email references. Both RPC handlers clear the flag before any close. **The EXTERNAL composer mirrors the same guard (cycle-8 M-4):** `cnCloseExternalEmailModal_` refuses to close while `extComposer.sending`, and the send success handler closes only its OWN composer instance (`CN_STATE.extComposer === c`) — previously an Esc mid-send closed silently and the late success handler tore down a reopened composer (destroying the new draft) or the rep re-sent, duplicating the customer email. Any NEW composer-style modal with a send RPC must carry both halves (close-refusal + instance-checked close). Pinned by the M-9 DOM test (close-refusal mid-send, normal close after settle) | Subsystem: Client (Call Notes views)
INV-146 | All five Team Notes sub-tab entry fns bump `CN_STATE.mgrSubSeq` (five bump sites: queue, rep-view fetch + cached branch, stats, search), and the async queue/rep-list handlers capture + re-check it alongside `requestedView` — the sub-tabs share one view key + `#cn-mgr-results`, so the view-level guard alone cannot stop a late response from overwriting a just-opened sub-tab. Any NEW Team Notes sub-tab must bump the token; any new async load into `#cn-mgr-results` must check it. Pinned by the M-8 DOM test (late training-queue response dropped after a Search switch) | Subsystem: Client (Call Notes views)
INV-147 | Draft KB items (INV-140) are excluded from EVERY rep-reaching surface beyond the core read paths: `searchReference(query, {publishedOnly:true})` is a narrowing-only option that skips drafts REGARDLESS of caller (used by `kbGetFacetGuidance`, whose result caches org-wide with no viewer role in the key); `saveTrainingAssignment` and `saveQuiz` (kbItemId link) reject drafts; `getMyTraining` and the overdue digest drop assigned-then-drafted items; `kbConvertDriveDoc` returns the row's `status` and the convert flow seeds it into the editor so a convert-then-save cannot silently publish. `kbRowStatus_` fails PUBLISHED on blank/unknown values (never hides content by accident). Pinned by `test_kb_draftLifecycleAndRevisions` (tree/item/search/publishedOnly/assign/quiz/plain-resave-preserves + revision revert round-trip) + the kbRowStatus_ Node cases | Subsystem: Server + Client (Reference/Training views)
INV-148 | Debounced client draft persisters are TEARDOWN-SAFE: the deferred save/persist SKIPS when its form root is gone from the DOM (intake `intakeDraftSaveNow_` root-guard; CN `cnPersistActiveFormDraft_` root-guard — a post-teardown fire read every field as '' and REMOVED the sticky draft), and intake additionally FLUSHES a pending debounce synchronously at the top of `showView` (`intakeFlushDraftNow_`, typeof-guarded + try/catch'd — a throw must never block navigation) while the outgoing DOM is intact; `intakeClearDraft_` cancels a pending timer for its form. Any NEW debounced persister must follow the same pattern. Pinned by the M-2 + Turn-A DOM tests and the cross-partial hook tripwire (`script_core` references + intake defines `intakeFlushDraftNow_`) | Subsystem: Client (Intake views) + Client (Call Notes views) + Client (shell)

INV-149 | **Per-rep shift override (Turn D).** Employees column O `Schedule` (`EMP.SCHEDULE=14`; `ROSTER_CACHE_KEY` bumped to `employee_roster_v8` per INV-28) holds an optional `H:mm-H:mm` override in the REP's own timezone, parsed by the pure `parseShiftOverride_` (bare hours OK; blank/garbage/overnight/out-of-range → null — FAIL-SAFE to the per-tz schedule, so a typo'd cell can never break the ribbon/coverage/punctuality; overnight shifts deliberately unsupported). `empShiftSchedule_(empLike, tz)` is the ONLY schedule resolver consumers may call: a valid override supplies start/length (flagged `override:true`) while breaks + the break reminder ALWAYS come from the per-tz `CONFIG.SHIFT_SCHEDULE`; `getShiftSchedule_` is called ONLY by the resolver. Consumers: `getEmployeeState` (ships `schedule` → `CLK_SCHEDULE`, the ribbon/countdown/next-break), `getCoveragePlan`, `getPunctualityReport`. `getEmployeeInfo_`/`lookupEmployeeById_` carry the raw cell as `scheduleRaw`. Pinned by the `parseShiftOverride_` Node cases + a source tripwire (all three consumers use `empShiftSchedule_`, zero bare `getShiftSchedule_` calls outside it) + `test_perRepSchedule_overrideAndFallback` (editor — override drives `getEmployeeState`, invalid cell falls back, breaks inherited) | Subsystem: Server + Client (Time Clock views)
INV-150 | **Client error beacon is PHI-safe by construction, gated, bounded, and rate-capped.** The shell's `window.onerror` + `unhandledrejection` hooks (`script_core.html`) post ONLY exception metadata — `{message, stack, view, source}`, the payload shape is CLOSED (a Node test pins the exact four keys) — never form-field values, note content, or DOM text; both sides truncate (client `errBeaconPayload_` mirrors the server `CLIENT_ERR_MSG_MAX`=400 / `CLIENT_ERR_STACK_MAX`=1500). The client dedupes identical messages and hard-caps `ERR_BEACON_MAX_PER_SESSION`=5 per session; `recordClientError` requires `getEmployeeInfo_` (NOT a public endpoint), acquires the USER lock (batch K-B — `getUserLock()`, not the global script lock: a diagnostics append must never stall punch writes; finally-release unchanged. It appends to the `ClientErrors` tab in the ADP spreadsheet, auto-provisioned by `getOrCreateClientErrorsSheet_`), and rate-caps `CLIENT_ERR_RATE_MAX_PER_HOUR`=20 per rep via CacheService. The beacon is fire-and-forget end to end — the send path is wrapped so it can never throw inside an error handler, and every server rejection returns quietly. Surfaced read-only in Admin → Automation Health via `clientErrorsSummary_` (bounded `CLIENT_ERR_SCAN_MAX`=2000 tail, 7-day window whose cutoff is formatted in `CONFIG.TIMEZONE` — the tz the rows are STAMPED in, cycle-9 L-15; a manager-tz cutoff over-included ~a day) on `computeAutomationHealth_().clientErrors`. **AMENDED for the pre-pilot observability round (2026-08-13):** (a) the beacon now ALSO fires from `errorStateHtml_` (source `errorState`) — the one choke point every A12/INV-175 call site routes through, so a HANDLED failure (an RPC that returned `{error}` and rendered a warn card the rep can see) reaches the operator too, not only uncaught exceptions; the `source` field is now a three-value enum (`onerror` / `unhandledrejection` / `errorState`), normalized identically on both sides. (b) The original "deliberately NOT pushed by the failure digest" stance is now THRESHOLDED rather than absolute — the rationale (a single benign browser quirk must not nag daily) is preserved by the thresholds, not reversed: `clientErrSpikeAlert_` (called AFTER `lock.releaseLock()` in `recordClientError` — the M-7 no-mail-in-lock rule) sends managers ONE immediate branded danger alert when ≥`CLIENT_ERR_ALERT_MIN` (5) errors land within the rolling hour (`CLIENT_ERR_ALERT_WINDOW_SEC`), cooldown-deduped to one email per `CLIENT_ERR_ALERT_COOLDOWN_SEC` (6h) via CacheService, best-effort end to end (its own try/catch — a failed alert never affects the beacon response); and `automationProblems_` gained entry (g): ≥`CLIENT_ERR_PROBLEM_MIN` (10) errors in the last 24h (`clientErrorsSummary_`'s additive `last24h` field) rides the shell health dot + the daily failure digest. A lone error still emails no one. Pinned by the `errBeaconPayload_` Node cases + the recordClientError/wiring source tripwires + the DOM dedupe/cap tests + the observability-round pins (errorState fire, post-lock spike alert, threshold/cooldown, problems entry) + `test_recordClientError_authBoundsAndAppend` (editor) | Subsystem: Server + Client (shell)
INV-151 | **Consolidated manager daily brief (flag-gated, suppression-symmetric).** `sendManagerDailyBrief` is a trigger handler (daily manager-tz 8am; INV-44 gate) behind the `managerDailyBrief` feature flag — the registry's first pure-`server`-scope flag, default OFF so a fresh deploy is a behavioral no-op. It stamps its `managerBrief` heartbeat BEFORE the flag check (trigger liveness stays observable while the feature is off) and, when on, builds ONE branded morning email PER MANAGER (docs + coaching are team-scoped, INV-122/134 — the sendTrainingOverdueDigest model) from the SAME factored computations the standalone digests use (`computeMissedClockOuts_`, `managerAggregateUrgent_`, `trainOverdueForRoster_`, `empDocsOverdueAll_`, `coachUnackedAll_`, `deptRequestsOverdueOpen_` — no parallel source to drift), with every data source individually try/catch'd and coaching rows PHI-minimal (INV-134). Exactly FOUR handlers suppress their separate MANAGER emails — `sendDailyMissedPunchAlerts` (manager summary only; employee reminders always send), `sendCallNotesUrgentDigest`, `sendTrainingOverdueDigest` (manager loop only; employee doc nudges always send), `sendDeptRequestReminderDigest` — each still stamping its heartbeat. **Suppression gates on `managerBriefSuppressionActive_({checkTrigger:true})` at the four digest call sites (cycle-8 M-11 + cycle-9 L-18), NEVER the bare flag: the flag must be ON, the `managerBrief` heartbeat fresh (<26h), AND a live `sendManagerDailyBrief` trigger must exist** — the heartbeat proves "the handler ran", not "a trigger exists", so a manual editor run used to open a ~26h window where the digests suppressed but no 8am brief would ever fire (invisible to the `briefConfig` detector, which reads suppression as active). The trigger check runs only at the DIGEST sites (in their trigger context the runner IS the installer, so `ScriptApp.getProjectTriggers()` sees the brief trigger); the PANEL detector calls the helper ARGLESS (a viewing manager isn't the installer — the check would false-alarm there). Fail direction on any check miss/error: NOT suppressed. Deliberate tradeoff: a digest run MANUALLY by a non-installer now double-emails for that run (a doubled email beats a silent outage — the M-11 decision). Flipping the flag without re-running `installAutomationTriggers()` used to silently stop EVERY daily manager notification (the brief never fired; the watchdog deliberately ignores a never-stamped heartbeat); now a missing/stale heartbeat FAILS SAFE (the individual digests keep sending — a doubled email beats a silent outage) and the `briefConfig` detector check surfaces the misconfiguration in the panel + failure digest; `sendCallNotesWeeklyDigests` (weekly cadence) and `sendAutomationHealthDigest` (the independent watchdog that reports a dead brief trigger — consolidating it would be circular) NEVER consult the flag. **An UNREADABLE source is now REPORTED, not silently omitted (cycle-18 Gap4):** each of the six best-effort sources is wrapped, and a failure records the source name, stamps an automation error, rides into the email as an 'Incomplete brief' banner naming what could not be read, and FORCES a send even when every readable section is clear. Before this the brief dropped the failed section while still suppressing the separate digest that covered it — so a manager's morning silence could mean 'nothing overdue' OR 'we could not look', with no way to tell. An all-clear morning still sends nothing, and that silence now means a TRUE all-clear. The pure `managerBriefSections_` drives section order/counts/send-decision. Pinned by the `managerBriefSections_` + suppression-set + registry-flag Node tests, the auto-covering TARGETS/gate-type/DIGEST_LABELS tripwires, and `test_triggerGate_managerDailyBrief_nonManagerThrows` (editor) | Subsystem: Server
INV-152 | **"What's new" panel is a dormant-until-configured broadcast of ONE published KB article.** `getWhatsNew` is rep-callable (requires `getEmployeeInfo_`), read-only, and returns `{none:true}` on EVERY quiet-failure path (unset `WHATSNEW_KB_ID` Script Property, missing item, non-article, any throw) so it can never break boot; a DRAFT article is invisible to EVERYONE including admins (INV-140/147 — a broadcast surface has no preview tier; admins preview in Reference). The returned `stamp` is the article's edit time (`kbCellTs_`, KB-sheet-tz recovered). **Surfacing (operator feedback 2026-07-09): the panel does NOT auto-open** — the article's list items rotate as upward-carousel slides in the Dashboard greeting bar (the pure Node-pinned `whatsNewItems_` extracts plain-text lines; `clkGreetRot*` in `tc/script_clock.html` rotates status-sentence ↔ update slides every 8s, hover-holds, ties to the startClock/stopClock lifecycle, reuses the world-clock slide-up animation and its reduced-motion neutralization). `whatsNewShouldShow_` (vs `localStorage.umsWhatsNew`; corrupt blob = never seen) now gates the NEW accent on those slides; clicking a slide or the sidebar star opens the full panel. The overlay is `ensureOverlay`-created (its `onClose` hook `whatsNewClose_` stamps seen on EVERY dismissal path) and renders the body via `kbMd_` — the same escape boundary as every Reference article; the title routes through `esc()`; never fetched in the compact pop-out. Pinned by the `whatsNewShouldShow_`/`getWhatsNew` Node cases, the DOM render/Esc-stamp tests, and `test_whatsNew_propertyGateAndDraftHidden` (editor) | Subsystem: Server + Client (shell)
INV-153 | **Timesheet cold-archive is MOVE-ONLY (payroll is keep-forever) with a clamped safety floor.** `archiveOldTimesheetRows` is a trigger handler (daily manager-tz 6pm — cycle-8 moved it off 1am, which is IST/PHT mid-shift; INV-44 `assertManagerCaller_` gate; INV-01 locked — it mutates the payroll tab, and holding the lock makes concurrent punch writes wait out the move). It MOVES Timesheet rows whose `ADP.DATE` is older than the window into a `TimesheetArchive` tab in the SAME ADP spreadsheet (created on first use by COPYING the live tab's two-row header) via the shared `archiveSheetRowsOlderThan_` — now parameterized with `opts {headerRows, width}` whose DEFAULTS (`headerRows:1`, `CN_HEADERS.length`) keep the CN call sites byte-identical; the Timesheet passes `headerRows:2` + its own width. There is deliberately NO purge tier for the Timesheet (unlike the CN 3-tier model) — nothing ever deletes from `TimesheetArchive`. Window: Script Property `TIMESHEET_ARCHIVE_DAYS` → `CONFIG.TIMESHEET_ARCHIVE_DAYS` (default **0 = disabled**); a value in `(0, TIMESHEET_ARCHIVE_MIN_DAYS=120)` **clamps UP to the floor** (never down), so an operator typo can never rip active-window payroll rows (adjust 30d, current export period ≤~31d, dashboard trends 14d) out of the live tab; garbage/negative → disabled. The helper scans data rows in sheet order (the Timesheet is APPEND order, not date order — back-fills land late) and append-then-deletes with a flush between (a mid-run failure can only duplicate into the archive, never lose a payroll row). **Cycle-12 F3 — the move is BOUNDED per run** (`opts.maxRows`, set to `TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN`=2000; absent ⇒ unbounded, so a caller that wants no bound is unchanged — **cycle-12 F3-sibling then bounded the CN twin too**: `archiveOldCallNotes` passes a WHOLE-RUN budget `CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN`=2000 shared across reps and STOPS the rep loop when it is spent, because that walk calls the mover once per rep inside one execution + one global lock, so a per-rep cap would not bound the run; reps drain in roster order over successive nights and a capped run stamps `hitPerRunCap=` in its `CallNotesArchive` audit row). Without it a large first enable (~20k rows for a year at this team's volume) could never finish inside the 6-minute ceiling, and because the append is flushed FIRST every killed run RE-APPENDED the rows it failed to delete — duplicating payroll into the archive run after run while the live tab barely shrank. Capped runs are finite and monotonic, so a multi-year backlog drains over a couple of weeks of quiet 6pm runs; a run that hits the cap stamps `hitPerRunCap=` in its audit row so a draining backlog doesn't look like a normal small run. **Archived rows leave MOST in-app surfaces** (old-month calendar/timesheet views, `getPunctualityReport`, and `tsDoctorScan_` read the live tab only) **but the ADP EXPORT reads through** (cycle-12 F1 — see the export note below): `generateExportSheet_` consults `TimesheetArchive` whenever the requested range predates the live tab's oldest row, so a retroactive payroll export is complete rather than silently short. Before F1 the archive tab had NO reader anywhere. Writes a PHI-free `TimesheetArchive` audit row on every enabled run (the Automation-Health last-seen heartbeat; in `AUTOMATION_AUDIT_ACTIONS` + the client `CN_HEALTH_RUN_LABELS`, pinned by the coupling registry). Pinned by the move-only/floor/CN-defaults Node tests + `test_triggerGate_timesheetArchive_nonManagerThrows` + `test_timesheetArchive_windowFloorAndDefault` (editor) | Subsystem: Server
INV-154 | **Every AuditLog READ routes through the `AUDIT` enum + the typed `auditRowObj_(row)` reader — the coercion-recovery boundary (Batch 3, cycle-8).** The shared AuditLog (ADP-spreadsheet tab) was the one core sheet with NO named column enum, so its Sheets-coerced cells were read by bare numeric index (`auditData[i][5]`) — untrippable by a source scan, which is exactly why the F1 raw-PunchDate read slipped every per-function tripwire (M-3/M-4/F1 are one class on this sheet). The named `AUDIT` enum (`{ TS:0, EMP_ID:1, EMP_NAME:2, ACTOR:3, ACTION:4, PUNCH_DATE:5, PUNCH_TIME:6, IS_ADJUSTMENT:7, DAYS_BACK:8, NOTES:9 }` — the `writeAuditLog_`/`getOrCreateAuditSheet_` header order) + the typed `auditRowObj_(row)` are now the SINGLE coercion-recovery point: `auditRowObj_` recovers TS via `normalizeAuditTs_`, PUNCH_DATE via `normalizeDate_`, PUNCH_TIME via `normalizeTime_`, and IS_ADJUSTMENT via a case-insensitive `=== 'TRUE'` — ONCE — and returns canonical fields; callers add their own display/derived fields (`timestampMgr` via `convertAuditTs_`, the `dateLocal` alias, `noteId` from `notes`). All four AuditLog readers route through it: the two coerced-column readers (`getManagerDashboard` recent-audits, `cnReadCallNoteAuditRows_`) build via `auditRowObj_`; the two non-coerced readers (`computeAutomationHealth_`, `adminSheetView`) use `AUDIT.*` for TS/ACTION/EMP_*/NOTES. A NEW AuditLog read MUST go through `auditRowObj_` (or `AUDIT.*` for non-coerced cols), never a bare index. Pinned by a GLOBAL Node tripwire (the INV-142 pattern) that fails CI on ANY raw read of a coerced `AUDIT` column (PUNCH_DATE/PUNCH_TIME/IS_ADJUSTMENT) outside `auditRowObj_`, a reader-delegation check (both object-readers reference `auditRowObj_`), a helper-usage check (`auditRowObj_` recovers each coerced col via its normalize helper), and 2 runtime recovery tests (a coerced-Date PunchDate + a native-boolean IsAdjustment). The AuditLog schema is UNCHANGED — the enum only names existing columns; behavior is byte-preserving vs. the prior inline reads. (ClientErrors + KbViews are DIFFERENT sheets with their own `instanceof Date` guards — out of this boundary.) Generalizes the retired dashboard M-3/M-4 pin (INV-92 still holds; this is its structural backstop) | Subsystem: Server
INV-155 | **Live punches obey the server-enforced next-action state machine (cycle-10 M-1).** `recordPunchCore_`'s live path (the guarded body behind the public `recordPunch` wrapper since 2026-08-17 — the wrapper attaches `state: getEmployeeState()` to a successful result AFTER the core's finally released the ScriptLock, so the client confirms in ONE round trip; a state-assembly failure degrades to the client's fallback refetch) validates `punchType` against `getNextActions_` over today's time-sorted punches — the same function the client's buttons render from, so a fresh client is never rejected and a stale window / direct RPC cannot append a duplicate ClockIn/ClockOut or an out-of-sequence lunch row. **Cycle-17 batch ⑥: `getNextActions_` derives the state from the last RECOGNIZED punch type** (`PUNCH_LABELS_` membership, scanning backward) — a hand-edited/garbage COMMENTS value is not a state; it previously became `last`, fell through to `['Adjust']`, and this very guard then locked the rep out of live punching for the rest of the day. A garbage-only day reads as not-clocked-in; all known-type transitions are byte-identical (behavioral pin). Guard order: min-interval first (INV-22 keeps its friendlier error), sequence guard second; adjustments bypass (their own INV-06 window/format guards apply); multi-lunch stays legal. The manager write paths are duplicate-TOLERANT for pre-guard rows: `findExistingPunch_` returns the LAST match (agreeing with `managerSaveDay`'s last-row-wins snapshot), and `managerSaveDay` snapshots ALL rows per type — a blank slot deletes every row of the type, a kept slot collapses extras to the displayed row (`duplicate collapsed` PunchDelete audit rows; the personal-sheet mirror is cleared only on full deletes). Pinned by `test_recordPunch_liveSequenceGuard`, `test_managerSaveDay_collapsesDuplicateRows`, and the M-1 Node source pins | Subsystem: Server
INV-156 | **SWR loaders carry same-view seq tokens and never stamp a failed round fresh (cycle-10 M-6/D2a — the `_covSeq` class generalized).** Any loader whose responses can arrive out of order for the SAME view key must bump-and-check a seq token in BOTH handlers (view-identity alone can't stop a same-view stale-range race): `mLoadMyStats_` (`M_STATE.mySeq`), `mLoadTeamMetrics_` (`M_STATE.teamSeq`), `spanishLoad_` (`SPANISH_STATE.seq`), plus the earlier `_covSeq`/`_punctSeq` and CN sites (INV-146). **Cycle-17 batch ⑥ extended the family to the three manager FAN-INS** — `trainLoadMgr_` (`TRAIN_STATE.mgrSeq`, 5 RPCs), `edLoadMgr_` (`ED_STATE.mgrSeq`, 3), `coachLoadMgr_` (`COACH_STATE.mgrSeq`, 2) — with one sharpening: a fan-in's token guards **every STATE WRITE, not just the render**, because the RPCs write into shared TRAIN/ED/COACH_STATE fields and a stale round-1 response landing after round 2 rendered overwrote one field last-writer-wins (the view guard alone can't stop it — currentView never changed on a post-mutation refresh). Pinned by the batch-⑥ fan-in pin (per-handler guard counts). Cache writes stay key-exact and may land before the seq check (a stale response warms its own key); only the RENDER is dropped. Companion posture: an SWR cache must never stamp a FAILED round as fresh — the Clock dashboard keeps last-good per period and sets `loadedAt=0` on any failure (retry on next re-render), and the extras row stamps freshness per-success with last-good kept on failure. A new SWR loader gets BOTH halves. Pinned by the M-6 + batch-D Node pins | Subsystem: Client (Metrics views) + Client (Time Clock views)
INV-157 | **The intake PHI store is integrity-guarded around the send (cycle-10 M-5).** `intakeSendPPD`/`intakeSendAcct_` size-cap every store cell BEFORE `MailApp.sendEmail` (`intakeStoreOversizeError_`, `INTAKE_STORE_CELL_MAX`=45000 — INV-96 spirit; reject pre-send so no email ever lacks a record) and treat a post-send append failure as LOUD: `intakeStoreFailWarn_` writes a PHI-free `IntakeStoreFail` audit row (`type + submissionId + trimmed err`) and the response carries `storeWarning`, which the client surfaces as a warn toast in place of the success toast. The store append remains deliberately best-effort AFTER a successful send (the email can't be unsent) — the guarantee is visibility, not atomicity. Pinned by the `intakeStoreOversizeError_` behavioral Node test + the wiring pins (cap-before-send, storeWarning in both returns) | Subsystem: Server + Client (Intake views)
INV-158 | **Witness-class audit rows are loss-visible (cycle-10 C4).** The three tamper-witness audit rows (`FormSubmissionReceived` INV-113; `EmpDocSigned`/`EmpDocCompleted` INV-122/135) are written via `writeWitnessAuditLog_`: one retry, then a best-effort `WITNESS_AUDIT_FAILS` Script Property stamp (`{count, lastAt, lastAction}` — a same-store signal can't work when the witness store itself failed, the PersonalSheetSyncFail posture). `writeAuditLog_` returns its outcome (all other callers ignore it). Surfacing: `computeAutomationHealth_` returns `witnessFails` (+`recent` = a loss in the last 48h), the Admin Automation panel renders the total, and `sendAutomationHealthDigest` pushes only a RECENT loss (an old blip never nags daily). A NEW witness-class row (one documented as independent tamper evidence) must use the wrapper, not bare `writeAuditLog_`. Pinned by the batch-C Node wiring pins | Subsystem: Server
INV-159 | **Timesheet sheet doctor (batch L)** — the `getPtoReconciliation`/`fixPtoReconciliation` pattern on the Timesheet. `getTimesheetDoctor` is manager-gated (INV-02), READ-ONLY, windowed (`TS_DOCTOR_WINDOW_DAYS`=92, two-row header, `normalizeDate_/Time_/Type_` coercion discipline): duplicate rows per (emp, date, punch type) — pre-INV-155 leftovers — plus INVERTED pairs, both clock (last ClockOut ≤ first ClockIn — the mis-keyed AM/PM class that `calcHours_`'s pinned C3 overnight wrap renders as a huge day) and lunch (last LunchIn ≤ first LunchOut; last-vs-first so a legitimate multi-lunch day never false-flags), each entry tagged `kind: 'clock'|'lunch'`. `fixTimesheetDuplicates(empIdFilter?)` is manager-gated, LOCKED (INV-01), IDEMPOTENT: a fresh in-lock re-scan (never client row indices) collapses each duplicate group to the LAST appended row — the same row `findExistingPunch_` updates and `managerSaveDay` displays (INV-155) — deleting earlier rows bottom-up with `duplicate collapsed (sheet doctor)` PunchDelete audit rows (INV-08); the optional empId filter scopes a run (the integration test uses it so a test can never collapse a real rep's rows). Inverted pairs are REPORT-ONLY (Day Edit is the fix — the C3 operator decision). **Cycle-12 F2 — the detector is TRUNCATION-HONEST and the collapse is BOUNDED.** `getTimesheetDoctor` returns `totalDuplicates` / `totalInverted` / `totalDuplicateRows` alongside the payload-capped lists plus a `truncated` flag and the server's `fixMaxRows`, because it previously stopped collecting at `TS_DOCTOR_MAX_GROUPS` (200) with NO signal — a 512-group backlog read as exactly 200 and the card looked complete (every sibling bounded reader — `getCallNotesAuditLog`, `getAdminSheetView`, `getStorageHealth`'s `kbEmbeds` — returns one). `fixTimesheetDuplicates` is bounded by `TS_DOCTOR_FIX_MAX_ROWS` (200) and returns `remaining`: it previously collapsed EVERY group the 92-day scan found regardless of what the button offered (so "Collapse 200 group(s)" could delete 500+ rows — a consent mismatch on a destructive, audited payroll op) with no ceiling on how long the ONE project-wide ScriptLock was held (~0.5s per row = deleteRow + audit appendRow, so every rep punch fails on `waitLock(15000)` meanwhile — the same starvation reasoning that moved the archive off 1am). The batch is a slice of the DESCENDING-rowIdx list, so bottom-up deletion and INV-155 last-row-wins hold on a PARTIAL run (a group's final row is never in the delete list at all); the op stays idempotent, so the operator re-clicks until `remaining` is 0. Surfaced as a lazy warn card beside the PTO-drift card in the Manager Dashboard (renders only when findings exist; uiConfirm-gated collapse; the card shows "showing N of M", labels the button with what the run will actually do, and the toast reports the leftover). Pinned by the batch-L Node pins (coercion scan / last-row-wins — bite-checked / report-only) + `test_sheetDoctor_detectsAndCollapsesDuplicates` + the two omnibus gate cases | Subsystem: Server + Client (Time Clock views)
INV-160 | **EmpDocs hashes are NUL-delimited for new writes; legacy space-form hashes stay valid via DUAL-VERIFY (C13, batch L).** `empDocContentHash_`/`empDocSignatureHash_` take a trailing `delim` param DEFAULTING to the NUL escape (the `computeFormSubmissionHash_` discipline — the old space join was field-boundary ambiguous since titles/bodies contain spaces); `EMPDOC_HASH_DELIM_LEGACY` (' ') is the legacy form. EVERY recompute site dual-verifies: `acknowledgeDoc`'s integrity gate via `empDocContentHashMatches_` (a pre-C13 doc must still SIGN), and `verifyDocSignature` for both the content check and the signature recompute — where the blank-stored-ContentHash fallback uses ITS OWN era's content hash per attempt (a pre-change sign hashed a space-form expect; a post-change sign hashes the NUL form). Genuine tamper still trips BOTH forms. INV-135's conditional-trailing-append byte-stability is preserved in both forms; callers still pass RAW stored cell strings. Pinned by the C13 Node pin (NUL default — bite-checked; dual-verify wiring) + `test_empdocs_legacyHashDualVerify` (legacy hash verifies + signs; tamper still detected) | Subsystem: Server
INV-161 | **The automation-failure derivation is SINGLE-SOURCED (batch K-E): `automationProblems_(report)`** — stale digest heartbeats (never-ran is NOT a problem), **per-job liveness DERIVED from the `AUTOMATION_JOB_CHECKS` table (cycle-18 Gap4 — replacing the ONE hardcoded `CallNotesReconcile` staleness check, which is why seven other audit-row jobs could fail forever in silence)**, personal-sheet sync-fails, a RECENT lost tamper-witness (INV-158), dead detectors, and a failing nightly self-test (INV-162). **The table is the mechanism, and its two columns are both load-bearing:** a `cadence` (`'daily'` | `'monthly'` — the monthly form checks IN ARREARS with a grace day, since a healthy monthly job legitimately shows 'last ran 25 days ago' mid-month) and an **`enabled()` predicate**, which is INV-186 expressed in code: a job that writes no row on a healthy deployment (retention disabled, no accruing rep on the roster) is NOT checked, rather than checked and permanently amber. `automationJobProblems_(report)` folds the table; `AUTOMATION_LAST_ERRORS` (stamped by a job's own catch — see INV-194) rides alongside it, because a trigger handler that RETURNS `{success:false}` reaches nobody: Apps Script's trigger-failure email fires on a THROW. **`AdpExportAuto` is DELIBERATELY absent** — it is period-based (biweekly anchor / month end), so neither cadence describes it honestly, and guessing was rejected; the omission is pinned as reasoned rather than left to look like an oversight. Adding a new audit-row job means adding a table row, not another hand-written check. BOTH consumers — `sendAutomationHealthDigest` and the manager shell health badge `getAutomationHealthBadge()` (manager-gated INV-02, returns only `{failing, count}`, 10-min org-wide cache, best-effort: any failure yields a silent `{failing:false}` since the digest/panel are the backstops) — consume it, so the badge and the daily email can never disagree. The shell polls the badge every 10 min for managers and lights a danger `.sb-health-dot` on the Manage nav buttons (`data-tool` selectors — the badge-selector gotcha). Pinned by the updated detector-wiring tripwire (helper covers every failure class; digest AND badge consume it; badge gated) + the omnibus gate case | Subsystem: Server + Client (shell)
INV-162 | **Nightly in-project self-test (the K-A alternative to editor-suite CI).** `runNightlySelfTest` is a trigger handler (daily manager-tz 1am; INV-44 `assertManagerCaller_` gate; in BOTH TARGETS arrays): it heartbeat-stamps `selfTest` BEFORE running (trigger liveness observable even if the suite crashes — the INV-151 posture), then runs `runSmokeTests` (pure logic, ZERO spreadsheet writes — safe on prod by construction) on any instance, and the FULL `runAllTests` suite ONLY on a CONFIRMED dev instance — `isDevInstance_()`, which requires `INSTANCE_LABEL` set AND `INSTANCE_IS_PROD` **explicitly present and not 'true'** (A5, cycle 13: an UNSET marker is prod's default state, so the old label-only inference let a labelled PROD project run the full destructive suite against live payroll nightly; `assertNotProdInstance_` is NOT a backstop for that, since it only fires on `INSTANCE_IS_PROD === 'true'`). A half-configured instance runs smoke and records a `note` saying why, surfaced on the Admin self-test line. The outcome persists to Script Property `SELF_TEST_LAST_RESULT` ({date, mode, pass, fail, skip[, error]}; a CRASHED run records fail:1 + the error), is returned by `computeAutomationHealth_().selfTest` (rendered in the Admin Automation panel; null = never ran, not an error), and a fail>0 result rides `automationProblems_` (INV-161 — health dot + failure digest) AND emails MANAGER_EMAILS the failed test names directly (best-effort INV-14, PHI-free). It tests the DEPLOYED code nightly — post-deploy regression detection, not pre-merge CI; the Node harness in GitHub Actions remains the pre-merge gate. Pinned by the self-test Node pin (heartbeat-first — bite-checked; dev-only full suite; problems/health wiring) + `test_triggerGate_selfTest_nonManagerThrows`; the trigger-wiring/gate-type/DIGEST-labels tripwires auto-cover the handler + heartbeat key | Subsystem: Server
INV-163 | *(number claimed by cycle 11's /reflect but never written to this library — its two proposals were lost between the reflection and the next sync-docs. Left deliberately vacant rather than reused, so the cycle-11 metrics note stays traceable; cycle-12 proposals start at INV-165.)* | — | —
INV-164 | *(as INV-163 — vacant, cycle-11 proposal never recorded.)* | — | —
INV-165 | **A `color-mix` producing a SEMANTIC colour must interpolate `in oklab`, never `in oklch`.** oklch interpolates hue on the POLAR arc, so mixing a chromatic token toward a near-neutral drags it through other hue families (light `--ink` sits at hue ≈264, so amber travelled 70→0→264 THROUGH RED: `--warning-deep` resolved to hue 355, `--danger-deep` 330, `--success-deep` 204 across ~254 consumers, and the SAME token meant a different hue family per theme). Hue-SAFE mixes may stay on oklch — `--selection-bg` (mixes with `transparent`), `--border-strong`/`--ring-focus` (low-chroma neutral pair) — as may the `@supports` probe, which only tests "is color-mix supported at all". Reading the token file MISLEADS here (the `@supports` fallback hexes above each mix are correct), and the `--muted-2` tripwire measures LUMINANCE, which a pure hue rotation leaves untouched. Verify: the V-1 tripwire — source-level `in oklab` on every `-deep` alias in BOTH mode blocks (since cycle-17 batch ③ the alias set is DERIVED from the token file, and a NEW alias fails until it gets a behavioural hue-pair entry), plus a computed hue-drift bound ≤20° from each source token (worst measured 10°) | Subsystem: Client (shell)
INV-166 | **Text on a FIXED-palette surface must use a literal colour, never a theme token.** The clock card's sky gradient does not flip with the theme, so a `--muted`/`--ink` token on it tracks the theme while its background doesn't — `.ampm` measured 1.20–2.00:1 in dark mode on the live clock of a time-tracking app, because `styles.html`'s (0,3,0) `.hero .clk-time .ampm` beat the (0,2,0) `.clk-sky .clk-time` white override. Every other element on that card was already correctly hardcoded. Verify: `.clk-sky` descendants carry literal colours; measured contrast identical in both modes (3.89 / 2.45 / 1.52 against the gradient's blue end / midpoint / amber end) | Subsystem: Client (Time Clock views)
INV-167 | **`cnEnrolledSheetId_(row)` is the ONLY reader of Employees column L**, returning the trimmed id or `''`, so a WHITESPACE-ONLY cell reads as not-enrolled everywhere. The test was hand-written 21 times and 11 copies tested RAW truthiness while 10 trimmed: with such a cell the trimmed group correctly showed the rep the enrollment splash while every untrimmed cross-rep walk called `openById(' ')`, threw into its per-rep try/catch, and SILENTLY omitted the rep from the aggregate (tag taxonomy, tag trends, the tag-transform walk, cross-rep search, shift stats, the unresolved-action badge, the CN export, team metrics, the EOD digest) — or, in Storage Health, reported a false "unreachable per-rep Sheet". The employee-object builders route through it as `cnEnrolledSheetId_(row) || null`, preserving their null-when-absent contract. Verify: the F14 global scan (no raw `EMP.CALL_NOTES_SHEET_ID` read outside the predicate + `provisionCallNotesSheet`'s setValue WRITE) + a 12-consumer delegation assert + the `cn_enrolledSheetId_trimsAndNullGuards` smoke test | Subsystem: Server
INV-168 | **The append-only `SubformData` arrays are bounded by entry count AND serialized size, REFUSING rather than dropping.** `feedback[]` grows per manager reply/comment/rep ack/clarification and `externalEmails[]` per external send; unbounded, either walks the cell to its ~50k limit, past which EVERY later write on that note throws — including the flag/pin/resolve ops a rep uses daily. All four appends route through `cnAppendBounded_` (`CN_FEEDBACK_MAX_ENTRIES` 200 / `CN_EXTERNAL_EMAILS_MAX_ENTRIES` 100 / `CN_SUBFORM_MAX_CHARS` 45k), which pops the entry back off on refusal so the caller never half-mutates the record; refuse-not-drop because these arrays ARE the coaching/send record (the INV-96 posture). **The non-growing flag/resolve/pin writes are deliberately NOT size-gated** — they are the recovery path for an already-oversized note. The `externalEmails[]` stamp runs after a successful send, so its refusal only logs (INV-42). Verify: the F11 pins + `cn_appendBounded_capsAndRollsBack` | Subsystem: Server
INV-169 | **A payload-capped reader must return its pre-slice total**, and the client must render "showing N of M" — and render NOTHING when the list is complete or the total is absent, so an un-redeployed server degrades to prior behaviour. `getDeptRequests` (`listCap` + `mineTotal`/`incomingTotal`/`allOpenTotal`, the magic 100 named `DR_LIST_CAP`), `kbGetReviewDue` (`total`/`cap`, and the landing pill shows the TRUE total, not the payload length), (`getSpanishInboxStats` was the third example, but cycle-13 FO-5 REMOVED both `pendingList` and `pendingListCap` as dead response fields — the honest resolution of a capped list no client reads is to delete it, not to cap it, and this entry kept citing them for two cycles after they were gone). Distinct from a SCAN cap: `getDeptRequests` keeps its separate `truncated` flag, and a run can scan 4000 rows and still have >100 to show. Verify: the F18 pins on both sides of the wire | Subsystem: Server + Client (Metrics/Reference views)
INV-170 | **`shortLabel` is the nav-label source on all three width-constrained surfaces** — mobile bottom nav, sidebar link, and sidebar sub-label — with the full `label` carried as a `title`. Set it on any tool label longer than ~9 characters. The nav is constrained on three surfaces at once: at the shipped 168px sidebar default the full labels CSS-ellipsised 2 of 7 tools, at 390px "Call Notes" was the one mobile label that wrapped, and the sub-label's two-line wrap pushed every sidebar nav item down 11px — so navigating MOVED the navigation. The two sidebar user fields (name, employee id) carry titles for the same reason. Verify: the V-5/6/7 pin (sidebar renders `shortLabel || label` + a full-label title; sub-label likewise; both user fields have titles) | Subsystem: Client (shell)
INV-171 | **The gated-endpoint set and the admin-exclusive set are DERIVED from `Code.js` source, not hand-listed.** Every function returning `'Manager access required.'` or `'Admin access required.'` must be referenced by a gate test (the omnibus `test_managerGates_rejectNonManager` cases or a dedicated `*_nonManagerRejected` / `*_nonManagerThrows` test), and INV-136's stated count AND backticked names must equal what the code enforces — that count drifted four times (24→28→30→35) while calling itself authoritative. Trigger handlers are outside the set by construction (they THROW via `assertManagerCaller_`, so they carry no returned error string) and keep their own INV-44 tripwire. One reasoned allowlist entry: the private helper `managerAggregateFlagged_`, whose public wrappers are both covered. Verify: the F9 + F7 tripwires | Subsystem: Test Suite
INV-172 | **The nightly self-test stamps a `{running:true, startedAt}` sentinel BEFORE the suite, and a STALE sentinel is a failure.** Extends INV-162: the outcome write happens only on a normal return or a CATCHABLE throw, and an Apps Script execution-limit kill is neither — so a chronically timing-out full suite left the PREVIOUS (green) result in place beside a FRESH heartbeat, i.e. the newest detector could not detect its own failure. `computeAutomationHealth_` derives `stuck` (running + older than `SELF_TEST_STUCK_MS` 2h); `automationProblems_` check (f) pushes it, so it rides the shell health dot AND the failure digest (INV-161); the Admin panel reports "never finished" INSTEAD of the stale pass/fail line, while a FRESH sentinel reads "Running now" and is not a problem. The sentinel is stamped AFTER the "test suite not present" early return, so a project without `Tests.js` never leaves one behind. Verify: the extended nightly-self-test pin (sentinel present + before the suite + carries startedAt + `stuck` from staleness + surfaced in problems and the panel) | Subsystem: Server + Client (Call Notes views)

INV-173 | **Every interactive control is a real `<button>`/`<a>` — never a `<span>`/`<div>` with an inline `onclick`.** Such an element is unreachable by keyboard, exposes no role to assistive tech, and receives no focus ring, so a whole class of user is silently blocked. Six shipped that way past ten cycles and cycle 10's dedicated a11y batch (which fixed the calendar, tables, and note fields but not these): the Metrics preset chips, the Dashboard period switcher, the Coverage day disclosure, the Intake PPD preferred-device star, the Intake image-remove ×, and the CN Training-Answers disclosure. The Intake star is the sharpest case — it marks the device starred in the clinical email actually SENT to the agent, with no alternative path. The codebase's own pattern was already `<button type="button">` (`cn-filter-chip`, `cn-history-preset-btn`, `intk-rec-mini`) in the very same files, so this is consistency, not new ground. Converting needs a CSS reset (`appearance`/`background`/`border`/`padding`/`font`) to stay pixel-identical, and where both are set `font: inherit` must precede `font-size` because the shorthand resets it. **A SEVENTH instance shipped LISTENER-BOUND (cycle-17 batch ④): the external composer's PDF⇄Fillable switch was a `<div>` wired with `addEventListener('click')` — keyboard-dead with NO alternative path to the fillable-form flow, and INVISIBLE to the A1 scan, which only sees inline `onclick`.** It is now a real `<button type="button" role="switch" aria-checked>`; the general lesson stands — listener-bound interactivity evades the A1 net, so a div/span acquiring a click listener is caught only by review. Verify: the A1 tripwire, which scans the WHOLE partial source (`[^>]` matches newlines, so multi-line markup cannot slip past a per-line scan — bite-checked) + the batch-4 switch-semantics pin | Subsystem: Client (all view partials)

INV-174 | **Active/selected/expanded state is exposed to assistive tech, never carried by a CSS class alone.** `enterTool` (`.sb-link`/`.nav-btn`) and `showView` (`.tt-btn`) both toggle `.active`, and until cycle-13 A11 that was the ONLY signal — a screen-reader user was never told which of the seven tools or which sub-tab was active. Both now set `aria-current="page"` in the same pass. The rule covers every stateful control: `aria-pressed` on a standalone toggle (the Dashboard period switcher, kept in step by `clkDashSet_`); `role="tab"` + `aria-selected` inside a `role="tablist"` (the Coaching Mine⇄Team toggle, whose wrapper declared the tablist while its tabs carried no role at all; the CN composer tabs were already correct); `aria-expanded` + `aria-controls` on a disclosure (the Coverage day row, the CN Training-Answers tray). **An inline `onclick` that toggles a class cannot keep an attribute in step** — extract it (the CN tray's `classList.toggle('collapsed')` became `cnToggleQaTray_`). **Cycle-17 batch ③/④:** the A11 rule-scan vocabulary gained the DISCLOSURE classes `collapsed`/`expanded`; `open`/`show` were deliberately NOT admitted (a dry-run found 17 of 19 such hits are the `.overlay.open` dialog-visibility idiom, governed by the ensureOverlay focus lifecycle — documented in the tripwire comment). Batch ④ closed the two CN disclosures the rule surfaced by review (more-menu popover + audit-history expander now carry `aria-expanded`, kept in step on every transition). Verify: the A11 tripwire (render-side attribute + a handler that updates it) + the batch-4 disclosures pin | Subsystem: Client (shell) + Client (all view partials)

INV-175 | **A load failure renders `errorStateHtml_`, never an empty-state container.** Batch J made this the rule; it was honored in 2 of 11 tool partials until cycle-13 A12 found 16 sites in Metrics, Training, and EmpDocs rendering both RPC failures AND server-returned `data.error` into `.m-empty` / `.no-data` / `.tr-empty` — quiet muted cards visually indistinguishable from "no data for this date". On Metrics, which is rep-facing and CDR-backed, that is the likeliest failure mode of all. `errorStateHtml_` gives the warn tone, the glyph, and `role="alert"` so the failure is both visible and announced. **Call sites must DROP the outer `esc()`** — the helper escapes internally, so keeping it double-escapes. **Cycle-16 F10 then found 28 MORE across six further partials, and the reason is the invariant's real lesson: cycle 13 pinned the three files it had looked at, by name, with a hand-copied list of their classes.** `train/script_coaching.html` is the proof — it renders into `.tr-empty`, a class the tripwire already KNEW, in a file it did not scan. Highest-stakes of the 28: `kb/script_kb.html`'s ten, covering the Reference tree and the Ctrl/⌘+K mid-call drawer, where a failed fetch read as an empty knowledge base mid-call. Verify: the A12 tripwire, which now DERIVES its file set from `A11Y_SCAN_PARTIALS` (INV-179) and its class set from the markup by naming convention (`-empty` suffix, plus `no-data`) rather than enumerating either — and since cycle-17 batch ③ scans STATEMENT-scoped, not line-scoped (a failure handler assembling its empty-state HTML across concatenation lines used to exit the net; the window extends while the statement visibly continues, capped 8 lines) — plus a companion pin banning `errorStateHtml_(esc(…))` | Subsystem: Client (all view partials)

INV-176 | **`timeToMins_` returns `null` (never `NaN`), and an arithmetic caller must guard EXPLICITLY.** `NaN` is uniquely dangerous here: every comparison against it is false and it is contagious through arithmetic. `getPunctualityReport` scored an unparseable day ON TIME (it fell through `lateMin > grace` into the else) and one bad row pinned the whole day (the earliest-punch pick `mins < r.days[d].in` is also false against `NaN`); `calcHours_` returned `NaN` and `totalHours += NaN` voided an entire timesheet total. With `null` the callers' existing "not computed" branches fire: punctuality skips the row, the timesheet counts the day INCOMPLETE (**not** 0 hours — that would understate payroll silently), the dashboard sparkline and calendar omit it. `calcHours_` propagates `null` for a corrupt CLOCK pair but a corrupt LUNCH pair only drops the deduction, so one bad cell cannot void a valid 8-hour day. **THE TRAP:** `x + null` COERCES to `x`, so `getCoveragePlan`'s `dayDelta * 1440 + timeToMins_(...)` would place a shift at midnight — strictly worse than the `NaN` it replaced, which merely dropped the rep from the buckets. Arithmetic callers need an explicit `=== null` check, not a truthiness test (`0` is a valid midnight). Verify: the A3 behavioural pin (both rejection paths — no-colon AND colon-with-non-numeric, bite-checked), the caller-shape scan, and the `timeToMins_nullOnUnparseable` smoke test (which must use a strict `=== null` check — `_assertEq` compares via `JSON.stringify`, where `NaN` and `null` are both `"null"`) | Subsystem: Server

INV-177 | **Dev-ness requires BOTH instance markers — `INSTANCE_LABEL` set AND `INSTANCE_IS_PROD` explicitly not `'true'`.** An UNSET marker resolves to PRODUCTION, because unset is production's default state. The old test was "label set AND not `isProdInstance_()`", and `isProdInstance_()` is false whenever the property is unset — so dev-ness was inferred from the mere PRESENCE of a banner label, and labelling prod (which the blue-green docs recommend) silently flipped prod into dev: `runNightlySelfTest` would run the full destructive `runAllTests` against live payroll/audit/PHI nightly, and `devScrubRoster_` would anonymize the LIVE roster. `assertNotProdInstance_` is NOT a backstop — it only fires on `INSTANCE_IS_PROD === 'true'`. `isDevInstance_()` is the single predicate; `assertDevInstance_` and `runNightlySelfTest` both route through it, and a half-configured instance says why on the Admin self-test line rather than degrading silently. This is the second time an absent marker was read as an affirmative signal, hence a library entry rather than a gotcha. Verify: the A5 dev-detection pin, including its "a LABEL alone is NOT dev" case | Subsystem: Server
INV-178 | **A section heading is an `<h2>`, not a styled `<div>`.** Heading navigation is the primary way a screen-reader user moves through a dense page; every view rendered exactly ONE heading (its `<h1>`) and used `<div>`/`<span>` for every card label below it, so that navigation stopped at the page title on ~30 surfaces. The three section-heading classes (`.card-label` 20 sites, `.tr-card-title` 5, `.dash-seclabel` 2) render as `<h2>`. Each class already fully specified its own typography, so the conversion is a UA-margin reset and nothing else (`margin-top: 0` on `.card-label`, which already set `margin-bottom`; `margin: 0` on the other two, which sit in flex head rows). `.kicker` stays a `<div>` (an eyebrow ABOVE a heading is not itself one) and `.rail-card` was already `<h4>`. **VERIFY BY MEASURING INSIDE THE REAL PARENT** — a plain-div fixture reports `display: inline -> block` for the two span cases, which is pure artifact, since both live in `display: flex` heads that blockify any child. **Cycle-17 batch ③/④ found a FOURTH class and generalized the scan:** `.tr-section-h` was used on two manager surfaces (EmpDocs team dashboard, Coaching "By employee") as a `<div>` and DEFINED IN NO STYLESHEET — the headings rendered as unstyled body text (INV-184 in reverse: read-but-never-declared). Both are `<h2>`s now with a defined style in the shared training partial. The A13 class set is DERIVED from the markup by naming convention (…card-label/…card-title/…seclabel/…section-h), the regex no longer requires `class` to be the FIRST attribute, and a NEW check requires every derived heading class to be DEFINED in some stylesheet. Verify: the A13 class-scan tripwire + the definition check + `test/visual/a13-measure.mjs` | Subsystem: Client (all view partials)
INV-179 | **When a convention is worth a tripwire, scan a DERIVED file list (`PARSE_GUARD_PARTIALS`), never a hand-copied one.** Hand-listed scan sets have been found short three times — cycle-9 M-10 (a newly-included JS partial outside every harness list), cycle-11 M-4 (four hand copies of the registry/DOM coverage lists), cycle-13 B5-1 (the a11y pins named six files by hand). The last is the clearest evidence: the moment the list was derived, the SAME rule surfaced eight live defects the human audit had missed. A hand-copied list silently narrows as the codebase grows, and CI stays green while it does. **Cycle 16 made it FOUR and FIVE** (A12's file+class sets, the visual fixture's copied-function set) — and added the limit worth knowing before the next promotion: **a derived scan is only as wide as the thing it derives from.** The clipped Training heading cycle-16's new mobile scenarios found is A2-FAMILY, but no derivation from `:root[data-compact]` will ever reach it, because that file has no compact override to derive from (FIXED in cycle-17 batch ④ by review + its own pin — the lesson stands). Deriving the set removes the *hand-copy* failure, not the *coverage* question. Verify: the `A11Y_SCAN_PARTIALS` derivation plus the existing `PARSE_GUARD_PARTIALS` ↔ `index.html` `include()` coupling check | Subsystem: Test Suite

INV-180 | **Per-queue transfer counts are a COMPONENT of `transferred`, never a partition of it.** The `CSR Transfer Historical Data` H:R block attributes some transfers to a named queue, but a real sheet routes others to destinations with no `A_Q_` column — so summing the queues UNDER-REPORTS the total. `getCsrTransferPerRepDaily_(…, {withQueues:true})` therefore reports `queueTotal` (the attributed subtotal) and `queueUnattributed` (the remainder) alongside the untouched `transferred`, so a consumer can say "9 of 14 attributed" instead of implying the breakdown is complete; `transferred` is NEVER derived from the queue sum. Related: a ZERO or BLANK queue cell is ABSENCE, not a queue with zero traffic (recording it would make every rep appear to staff every queue), and per-queue reading is opt-in because the opt-out callers cache their assembled payloads (INV-85) — FOUR since the 2026-08-06 operator #5 batch: the three pre-Phase-1 sites (getDashboardMetrics ×2, getMyMetrics's trend) plus getMyMetricsRange's own-transfer aggregate, which is also cached and also wants no queue payload. Verify: the Phase-1 pins (attributed-subtotal-not-substitute, zero/blank skipped, opt-in call-site count — all bite-checked) + `test_metrics_csrTransferQueues_optInAndTransparent` | Subsystem: Server

INV-181 | **A queue→department mapping is a PARTITION, and a group total is a plain SUM only because sub-queues are disjoint from parents.** A queue claimed by two groups is kept only in the FIRST — in both the resolver (`getCdrQueueGroups_`) and the fold (`groupQueueRows_`) — so a queue is counted exactly once. The plain sum is correct ONLY under the operator-confirmed fact (2026-07-31) that sub-queue traffic is NOT already rolled into the parent column; if 8x8 ever changes that, summing reports a group at roughly 1.5× its real volume and `groupQueueRows_` must change with it. A queue in no group lands in a trailing **`Ungrouped`** row that always sorts LAST regardless of volume — it is a gap to close, not a department to compare against. The group `reps` figure is `max()` across members, a deliberate **LOWER BOUND**: the per-queue figure is a COUNT, not a roster, so a true union is not recoverable, which is why the column is labelled "Reps (min)" rather than presented as a total. **The `Ungrouped` row is the operator's ONLY signal that a queue is unmapped, so the two things that surface it are load-bearing (cycle-16 F7/F11).** The client found the bucket by comparing against a bare `'Ungrouped'` literal, so a server-side rename of `CDR_QUEUE_UNGROUPED` would have silently stopped the "N queue(s) are not mapped to a department yet" hint from rendering while the row itself still appeared — the gap would have looked closed. It is now the named `M_QUEUE_UNGROUPED`, pinned against the server constant and listed in `MIRROR_INDEX`; note the shape of that miss, since cycle-15 F4 had pinned this very sentinel in the visual FIXTURE while leaving the shipping client on a literal. And the editor suite's ordering assertion was `_assertTrue(true, 'Ungrouped sorted last')` — a placeholder that cannot fail — beside a department-mapping assertion guarded by `if (salesGroup)`, i.e. skipped in exactly the case where the fold had dropped the group; both are real assertions now. Verify: the four Phase-4 pins (sum-not-max, Ungrouped-last, count-once, sanitize-on-read + mode-only-with-data), the F7 client-mirror pin, plus `test_metrics_getTeamMetrics_queueGrouping`, which asserts group totals sum EXACTLY to queue totals — nothing dropped, nothing double-counted | Subsystem: Server + Client (Metrics views)
INV-182 | **A shared component gains capability through OPTIONAL, GUARDED hooks — a caller passing none renders byte-identically.** That property is what makes it safe to extend a component with several live callers: `mtRenderTable_` took `rowClass` (cycle 12) and `detailRow`/`rowId` (cycle 14) without touching its existing three callers. The division of ownership is deliberate: the CALLER owns the disclosure `<button>` (so it can sit in whichever column suits that table), while the COMPONENT owns the row id's charset restriction — for the same reason the sort handler does (cycle-11 L-15: entity-escaping is the wrong neutralizer in an attribute the browser decodes before use). Verify: the Phase-2 additive-guard pin (the other callers' rendered output is unchanged) + the DOM disclosure test | Subsystem: Client (shell)
INV-183 | **Roster INCLUSION goes through `empRosterEmail_(row)` — the ONE predicate.** It returns the TRIMMED email or `''`, so a caller writes `if (!empRosterEmail_(row)) continue;` and also has the value. Offboarding here means clearing the email while KEEPING the name (so history still reads), and a name-only row is not a person to count — but FOURTEEN walks each decided that for themselves and did not agree: NINE tested raw truthiness (`if (!rows[i][EMP.EMAIL]) continue;`), THREE tested trimmed, and TWO tested nothing at all. A WHITESPACE-ONLY email cell therefore made the first two groups DISAGREE, the identical shape column L had before `cnEnrolledSheetId_` (INV-167), on a second column. The un-guarded pair mattered unequally: `getTeamMetrics` ACTS on it — its gate is `if (cdr || noteCount > 0 || …)`, which an offboarded name still matching DQE history satisfies, so a departed employee got a full row in the manager's team table AND their volume flowed into `teamTotals` — while `getPunctualityReport` was harmless only by coincidence downstream (`if (!dates.length) return`). Trimming can only NARROW the nine raw sites, which is the correct direction and matches INV-167's resolution. **NOT an authorization check** — `getEmployeeInfo_` still identifies the caller; this governs only whether a roster ROW is counted in a team-wide walk. **COROLLARY (operator report 2026-08-08): an EXCLUDED row is invisible, but its UNIQUENESS still binds.** The predicate hides a row from every in-app list, yet the employee-ID namespace spans the whole sheet — so a hand-stubbed row (ID + name typed into the sheet, no email) blocked an add with an "already in use" error pointing at nothing the admin could see, and no in-app panel could disprove it (only column B can). Any uniqueness check whose namespace includes excluded rows must NAME the owning row and say that it is excluded — see the onboarding KDD for the shape (`addEmployee`'s conflict labels + the panel's offboarded-vs-incomplete split). **THE FAMILY'S THIRD COLUMN, `DR.STATUS`, IS NOW CLOSED (cycle-16 F8 opened it; cycle-18 F5 finished it).** `getDeptRequests` compared the RAW cell on one line (`r[DR.STATUS] === 'resolved'`) and the normalized form on every other, so a padded or mixed-case cell made them disagree — the item's `status` excluded the row from `incoming` and `allOpen` while `deptStats` counted it OPEN. F8 normalized that one site into a local and NAMED the remaining three as an open gap — `drFindOpenRequest_`, `markDeptRequestResolved_` and `deptRequestsOverdueOpen_` — with the consequences: a re-send that fails to dedupe and opens a DUPLICATE request (INV-131 silently void), a second resolve click that OVERWRITES `ResolvedAt`/`ResolvedBy` and re-audits, and a resolved request that nags in the daily SLA digest forever. **Cycle-18 F5 closed it in the shape that entry prescribed:** `drStatus_(row)` is now THE one reader (trimmed + lowercased, keeping the `'open'` default a blank legacy cell relies on), all four readers delegate to it, and a pin asserts exactly ONE bracketed `[DR.STATUS]` read survives in the file — inside the predicate. **A FOURTH site went with it:** `buildCalendarForEmployee_` lowercased `TO.STATUS` without trimming, so a padded cell fell through the teammate filter AND rode to the client raw, where the calendar's `st === 'approved'` cell-class test missed it and painted a rep's own APPROVED day as pending; it now trims at the single read, so the value the server filters on and the value it ships are the same string. **A FOURTH column joined the family and is CLOSED: `TO.STATUS` (cycle-17 C17-2).** `updateTimeOffStatus` — the ONE function that mutates PTO balances — compared the raw trimmed cell against `'Approved'`/`'Reconciled'` exactly while every sibling STATUS reader lowercased, so a hand-edited `approved`/`APPROVED` row read as approved everywhere else yet NOT-approved here (re-deduct on approve, skipped restore on deny — the H1 signature), and a lowercased `reconciled` defeated the S1.3 terminal guard, letting the row re-approve and re-deduct the exact over-charge `fixPtoReconciliation` credited. Fixed with the F8 normalize-once shape: `oldStatusRaw` survives ONLY for the compensating revert + the audit note; every comparison lowercases, including the notify no-op check (`oldStatus !== newStatus.toLowerCase()` — lowercasing one side alone would have emailed on a no-op re-approve). `newStatus` needs no normalizing (server-whitelisted to canonical case). **Cycle-17 batch ② closed the FIFTEENTH walk and a THIRD guard shape:** `getMetricsAmbient` had NO inclusion guard at all (a shape the banned-pattern scan cannot see — it now routes through the predicate and is in the by-name list), and `saveTrainingAssignment` validated targets with raw POSITIVE truthiness (`if (rows[i][EMP.EMAIL])`) — the F3 tripwire now also bans that bare-truthiness form (comparison/identification reads deliberately don't match). A walk with no guard at all remains review-caught. Verify: the F3 tripwire bans the raw roster-guard shape ANYWHERE in `Code.js` (derived, not a hand list — INV-179) plus the positive bare-truthiness form, plus named assertions on the guarded walks (now incl. `getMetricsAmbient` + `saveTrainingAssignment`) and skip-before-collect in the cohort pair; the F8 pin asserts `getDeptRequests` reads `DR.STATUS` exactly once; the C17-2 pin asserts `updateTimeOffStatus` reads `TO.STATUS` exactly once, compares lowercase, and reverts with the raw cell | Subsystem: Server
INV-184 | **A declared-but-unread CONFIG key or enum member is a DEFECT, not clutter — the next reader assumes it is wired.** Four were removed in cycle 15: `CDR_DEPARTMENT` (whose `getCdrAgentMetrics_` doc comment CLAIMED it filtered the read — it never did, which is why the CDR name-match diagnostic is permanently non-empty), `TRAINING_DIGEST_WEEKDAY` / `REVIEW_DIGEST_WEEKDAY` (the weekly-digest trigger hardcodes `ScriptApp.WeekDay.FRIDAY`, so an operator editing them to move the digest got a SILENT no-op), and `CALL_NOTES.SUBFORM_COL_JSON` (a toggle that never existed). **Deliberate retention is allowed but must SELF-DECLARE:** `EOD_WARNING_WINDOW_MINUTES` is marked `DEAD` at its declaration, and the tripwire's allowlist REQUIRES that marker — so "retained on purpose" and "forgotten" stay distinguishable in the file itself, not only in this document. The same class exists in the enums: `CDR.QUEUE_EXT` was read by cycle-14 Phase 0 yet stayed dead because the read used bare positional offsets (now derived from the enum). Verify: the F1 tripwire (every CONFIG key has a reader; the allowlist must self-declare) | Subsystem: Server
INV-185 | **A test fixture must never REIMPLEMENT server logic — copy it VERBATIM and pin it byte-identical.** The Team Metrics visual fixture hand-rolled the queue→department fold and had ALREADY drifted: it omitted the per-group `queues.sort()`, so every By-department screenshot showed an ordering the server cannot produce. A paraphrase drifts silently and the harness then lies with total confidence — the failure mode its own README already documents twice (a wrong `coachAnalytics_` shape, a pre-formatted `lastPunchTimeMgr`). `test/visual/mock.js` now carries verbatim copies of `groupQueueRows_`, `CDR_QUEUE_UNGROUPED`, the `CDR_QUEUE_GROUPS` seed and — since cycle-16 — `cnNoteCoverage_`, all under a DO-NOT-EDIT banner. This makes the FIXTURE a mirror in the INV-72 sense, so it belongs in `MIRROR_INDEX` like any other parallel source. **The `cnNoteCoverage_` addition shows the class is not confined to elaborate logic:** the fixture computed `Math.round((noteCount / answered) * 100)` inline — three tokens' worth of paraphrase — and had already diverged where it matters, returning a number for `answered === 0` where the server returns `null` (the INV-129 contract cycle-16 F5 had just hardened). **The pin now DERIVES the copied set from the DO-NOT-EDIT region rather than naming one function** (INV-179), so the next verbatim copy is pinned the moment it lands. **Cycle-17 batch ③ extended the class from copied LOGIC to payload FIELD NAMES:** three fixture shapes had drifted — coaching rows carried `patientTrx` where the server ships `patientTRX` (the TRX chip was unrenderable in every screenshot), `kbGetReviewDue` used `usage30` where the server ships `views` (and omitted `total`/`cap`, so the F18 cap-note path was unshootable), and `kbGetContentRequests` returned a `{requests: []}` shape the client never reads. All three fixed + pinned by a fixture-shape pin. **Batch ⑦ made the first DERIVED shape pin:** the new Admin-scenario `getAutomationHealth` fixture's top-level keys are asserted against the key set extracted from `computeAutomationHealth_`'s OWN return block (INV-179 — a hand-copied key list here would drift exactly like the fixtures it checks); FULL derivation of fixture skeletons from server return sites remains the next promotion. **Cycle-18 F14 is the fifth instance and adds a rule of its own: a fixture whose response shape depends on its ARGUMENTS must be a FUNCTION of them, not a static object.** `getMyMetrics` was a frozen object carrying today's date, so the My Stats screenshot rendered "TODAY" as its hero label underneath a pressed "YESTERDAY" preset chip — the 2026-08-17 previous-workday default (the operator's own request) was UNSHOOTABLE, and the matrix had been reporting the contradiction as a clean render for months. The shape was correct; the fixture simply ignored the argument that decides it. Ask of every fixture: does the real endpoint's answer vary with what the client passes? If yes, the fixture is a function. Verify: the F4 mirror pin (every function in the region byte-identical to its `Code.js` original, plus the sentinel and group mapping, and the fixture actually CALLING the shared fold) + its MIRROR_INDEX entry + the batch-3 fixture-shape pin + the F14 argument-dependence pin | Subsystem: Test Suite
INV-186 | **Before toning a health indicator off a count, ask what that count reads on a HEALTHY production system — if the answer is not zero, it is reference detail, not a signal.** The Automation Health CDR card toned off `unmatchedAgents`, which is PERMANENTLY non-empty here: the CDR Report covers the whole phone system (it is owned by `call-data-reporting`) while our roster is one team, and there is no department filter. It read "78 unmatched" indefinitely, and a card that can never go green trains the reader to ignore it — strictly worse than having no card. The obvious swap is also wrong: `rosterWithNoCdr` is every NAMED employee with no calls, so managers, admin staff and full-window PTO pin it amber just as permanently. The signal is the INTERSECTION (`cdrLikelyNameMismatches_`): a roster rep with no call data whose name resembles an unmatched CDR agent is one person spelled two ways, so their calls are silently missing from every metric. That set is normally EMPTY — the card reaches green — and it names the exact `Agent Alias Overrides` row to add. **Known limit:** the pairing requires normalized-equality or ≥2 shared name tokens, so a nickname sharing only a surname is a deliberate false NEGATIVE (under-reporting is the safe direction for something that raises a warning), and the capped raw lists render beneath it for the human. **The same rule now has a CODE form: `AUTOMATION_JOB_CHECKS`'s per-job `enabled()` predicate (INV-161) — a job that legitimately writes no audit row on a healthy deployment is never checked, rather than being checked and permanently amber.** Verify: `CDR: the health card tones off likelyMismatches, never the raw lists` (which strips comments first — the function explains why the raw lists are unusable and would otherwise trip on its own rationale) | Subsystem: Server + Client (shell)
INV-187 | **A surface that aggregates or draws a JUDGEMENT from a best-effort read must carry the read OUTCOME, and every judgement derived from it must be suppressed when that outcome is degraded.** Three cycles fixed instances of this one at a time before it was named: cycle-12 F5 (a swallowed per-rep read rendered as a confident 0%, telling reps to re-file work they had already filed), cycle-16 F1 (`managerGetShiftStats` pushed a rep with an unreadable Sheet onto the manager's END-OF-SHIFT PERFORMANCE table with `totalNotes:0` and a CRIT-toned 0% badge), F5 (`getTeamMetrics` nulled the per-rep coverage but computed the TEAM total anyway, so the rail said "partial" while the hint below drew a confident below-80% judgement from the same contaminated numerator) and F4 (`getCoveragePlan` swallowed a failed PTO read, and with the overlay empty EVERY REP COUNTS AS WORKING — so an understaffing planner returned a green all-clear on a day half the team is off). **The test that generalizes them: if the DEGRADED output is MORE reassuring than the healthy one, silence is not an option.** A number can be nulled; a judgement (a percentage, a staffing band, an all-clear, a threshold hint) must be actively suppressed and the degradation named to the user, because a missing judgement reads as "fine" rather than "unknown". Note the reason this class keeps escaping sweeps: an aggregate is a coverage surface even when it never calls the shared helper — `managerGetShiftStats` counts INLINE (it needs flags, emails and a median off the same read) and so appeared in no search for `cnCountNotesResult_`. **Ask what a function DERIVES from a best-effort read, not which helper it calls.** **Cycle-17 completed the class:** the export (C17-6 `skippedReps` + INCOMPLETE audit marker), the CN loaders (C17-5 preserve-last-good + failed-round-never-fresh), the three manager lazy cards (C17-7), and batch ② — the flagged/urgent digest aggregates, manager search, tag taxonomy/trends (`skippedReps`, partial-rounds-uncached), the unresolved-action count (`{count, partial}`, undercount never cached, `≥ N` badge), the extras SWR whole-round stamp, the no-CDR Notes-Filed branch, and the timesheet side rail. Verify: for each of `managerGetShiftStats`, `getCoveragePlan`, `getTeamMetrics`, `getMyMetrics` — and the batch-2 pin for the five walks — assert the response carries an outcome flag AND that the derived judgement is gated on it — not merely that the number is nulled | Subsystem: Server + Client (all manager aggregates)
INV-188 | **A source-scanning tripwire must STRIP COMMENTS before matching.** The fix comment that explains what was removed quotes the removed code, so a naive scan trips on its own rationale — and the failure mode is a pin that looks like it caught a regression on the very commit that fixed one. It has now bitten twice in two cycles: cycle-15's F1 tripwire failed on its own allowlist because it searched a comment-stripped body for a marker that lives in a comment, and cycle-16's F8 pin reported `3 !== 1` raw `DR.STATUS` reads when two of the three were inside the comment explaining the fix. The related trap in the same family: slice from the RIGHT occurrence — cycle-16's F6 pin anchored on the first `ui-dialog-err`, which is the id CONSTANT, not the div it was checking. **Cycle-18 batch 5 added the MARKUP half:** an accessible-name census over the partials counted `<input>`/`<textarea>` elements inside `<!-- -->` blocks and reported ~30 controls that do not exist, which would have set a ratchet baseline no real fix could ever reach. A scan over HTML must strip `<!-- -->` for the same reason a scan over JS strips `//` — the rule is about COMMENTS, not about JavaScript. Verify: any pin asserting "N occurrences of X" strips `//`, `/* */` and `<!-- -->` before counting, and fails on a file whose comment mentions X | Subsystem: Test Suite
INV-189 | **A best-effort read that BLOCKS a cheap one belongs in its own endpoint.** `getOnboardingPanel` computed CDR readiness inline, so the whole Admin → Team Members panel — everything else in it coming off the 5-min-cached roster — waited on a 7-day read of a foreign spreadsheet (operator: "takes some time to load"). The split is `getOnboardingCdrReadiness` (same admin gate, same INV-67 posture): the client paints the roster panel, then patches each rep's chip via `data-cdr-name`. THREE properties make the split safe rather than merely faster: (a) the panel's `cdr: {deferred:true}` is DISTINCT from `ok:false` — "not read yet" renders "checking…", "read and failed" renders "unknown", and neither is ever "no calls in 7d", because an unread name is not an absent one (INV-187); (b) first render and the patch share ONE chip builder, so the states cannot drift; (c) the patch is DOM surgery keyed off an attribute, not a whole-panel re-render, so it cannot clobber a form the admin has begun filling in. The general rule: when one part of a response is an order of magnitude slower than the rest AND is decoration on top of it, splitting is not premature optimization — it is the difference between a panel that appears and one that hangs. Verify: the operator-2026-08-11 split pins (no CDR call in the panel; deferred marker; gate + best-effort on the split; paint-before-patch ordering; shared chip builder) | Subsystem: Server + Client (Call Notes views)
INV-190 | **Reminders are a SHELL capability with three independently-degradable channels.** Break reminders fired only while the Clock tab was open, so the pinned Call Notes pop-out — the window a rep spends the shift in — never showed one; `remindersTick_` (60s, started at shell boot) owns them now, and `clkUpdateBreak_` only paints its chip (firing in both places would double-toast). The channels are **toast** (always — never gated on a preference), **chime** (`notifyChime_`: a synthesized Web Audio oscillator, because a fetched asset would be blocked by the iframe CSP, whose context only unlocks on a real user gesture) and **desktop** (gated on BOTH the stored preference and an actually-granted permission). Desktop is expected to be REFUSED — the app renders inside HtmlService's cross-origin iframe, where Permissions Policy blocks `notifications` — so the toggle distinguishes 'denied' from 'unavailable' and names what still works instead of failing silently. Cost discipline: the break half is pure arithmetic off `empState.schedule` (zero RPCs); the still-clocked-in nudge needs punch state and therefore refreshes `getEmployeeState` at most once per 10 minutes, ONLY within the shift-end+5..+120min window. An UNKNOWN punch state never nags — a false clock-out reminder to a rep who already clocked out is worse than a missed one, and the daily missed-punch EMAIL is the real backstop. **A DAY OFF suppresses two of the three reminder kinds (cycle-18 F2).** A shift SHAPE exists every day of the week, so without a gate the break reminders and the not-clocked-in nudge fired on Saturdays, Sundays and approved-PTO days for anyone with the app open — a chimed, STICKY 'clock in so today counts on your timesheet' on a rep's day off, i.e. precisely the false positive that same nudge's own comment says 'teaches reps to ignore the channel', arriving weekly. `remindIsDayOff_(tz)` = rep-tz weekday (via `isoDateTz`, never browser-local — the F6 discipline) OR the server-computed `offToday` (approved PTO only; `empIsOffToday_`, a BOUNDED three-column read on the app's hottest endpoint, failing toward 'working' so a failed read costs a reminder rather than silencing one). **The gate is applied PER BRANCH, never as an early return: the still-clocked-in nudge is DELIBERATELY exempt**, because a rep who genuinely clocked in on a Saturday and forgot to clock out is exactly who that reminder exists for — an early `return` before `nowMin` would take it with them, and a pin asserts that shape cannot come back. KNOWN LIMIT: the roster carries no working-days column, so weekends are INFERRED; a rep on a genuine Sat/Sun shift gets no break reminders that day. Each reminder fires at most once per key per REP-LOCAL day — **across EVERY open window, not once per window (operator 2026-08-17):** the main window and a pinned pop-out each run the ticker, so before the fix every reminder toasted + chimed twice. `remindOnce_` now consults + writes a shared localStorage fired-set (`umsRemindFired`, `{day, keys}` — the same origin-wide-sharing property that lets `umsNotify` govern the pop-out); a different day resets it (the in-memory set's rollover rule, so it cannot grow in a long-lived pop-out), and a localStorage-throwing privacy-mode browser degrades to per-window dedupe — the pre-fix behavior, never worse. The sub-second race where two windows tick simultaneously before either writes is accepted: its worst case IS the pre-fix behavior. Apps Script has no background push: a closed browser still gets nothing. **AMENDMENT (operator 2026-08-12): the reminder toast is STICKY** — `notifyRemind_` passes `{sticky:true}` to `showToast`, which then skips the 3.5s auto-dismiss and renders a real, `aria-label`led × button (INV-173). The chime does its job from another window, and by the time the rep gets back to the one that fired it a 3.5s toast is long gone — a reminder is the one toast class that must wait for its reader. Two consequences the pins hold: the stack cap evicts the oldest NON-sticky toast first (a reminder the rep has not read must not be pushed off by routine toasts) while staying a real bound, and every existing 2-arg `showToast` caller is untouched. Verify: the reminder-channel + shell-ticker pins, the sticky-toast source pin, and the DOM lifecycle pair (survives the auto-dismiss window; × dismisses; cap evicts routine first) | Subsystem: Client (shell) + Client (Time Clock views)
INV-191 | **A writer keyed on a CLASS silently clobbers anything else that borrows the class for its looks.** `index.html`'s boot theme reflector wrote `aria-pressed` across every `.sb-theme-btn`; the moment the reminder-alert toggles reused that class for its appearance, they rendered `aria-pressed="true"` in markup and read `false` in the live DOM on every load — the sound toggle silently reset itself each session. The selector is now `.sb-theme-btn[data-theme-target]`: the attribute that actually MEANS "this is a theme button". Reusing a class for appearance is normal and cheap; what is not safe is a writer that treats class membership as identity. This is invisible to source review — the markup is correct — and was caught only by reading the attribute back in a real browser, which is the general lesson: **for any state an element renders AND some other code writes, verify by measuring the live attribute, not by reading the template.** Sibling shape: two rendered copies of one control cannot share an `id`, so `notifySyncToggles_` selects by `data-remind`. Verify: the theme-reflector scope pin + the no-duplicate-ids pin | Subsystem: Client (shell)
INV-195 | **A form control needs an accessible NAME, and a `placeholder` is not one.** A placeholder is not reliably announced, is not exposed as the name by every AT/browser pair, and VANISHES on the first keystroke — so a rep who tabs back to a half-filled field hears "edit, 555" with no idea what it is (the reason INV-83's `uiPrompt` fix rejected it in cycle 16; this generalizes that one dialog to the whole app). The sanctioned forms are a `<label for>`, an `aria-labelledby` pointing at a node that will still exist after the next re-render, or an `aria-label` — and **visual adjacency is not a name**: a `<div>` reading "Callback" beside an input names nothing, which is the single most common shape here. **The census, so the next author knows which bucket is cheap: 252 unnamed controls across the scanned partials — 75 with an ADJACENT label element (mechanical: give it an `id` and a `for`, or wrap it), 61 PLACEHOLDER-ONLY (also mechanical: promote the placeholder text to an `aria-label`), and 116 with NOTHING (these need an author to DECIDE what the field is called, so they are not a sweep — 92 of them live inside `cn/script_callnotes.html` template literals). That is ~3.9× the audit's estimate, which is why batch 5B was split out and left open rather than half-done.** The A14 tripwire is therefore a **two-sided RATCHET, not a pass/fail gate**: it fails if any bucket grows (a NEW unnamed control cannot ship) and it also fails if a bucket SHRINKS without the baseline being lowered in the same commit, so progress is recorded rather than silently absorbed. **The stated target is zero** — the baseline is a debt ledger, not an allowance. A markup census must strip `<!-- -->` first (INV-188), and the scan derives its file set from `A11Y_SCAN_PARTIALS` (INV-179). Verify: the three A14 pins — `ensureOverlay` dialogs are named, no nested `role="dialog"`, and the unnamed-control ratchet | Subsystem: Client (all view partials)


### Visual Audit Stage (project-local; every `/broad-scan` MUST run it)

**A `/broad-scan` of this project is not complete until the interface has been
LOOKED AT, not only read.** This is a project-local requirement recorded here
rather than in `.claude/commands/broad-scan.md`, because that directory is
verified byte-identical to `claude-workflow-tools` and a local edit would be
silently overwritten by the next `/sync-commands`. Every audit command's first
instruction is to read CLAUDE.md, so this reaches them.

**Why it is mandatory, in the project's own numbers:** cycle 12 shipped 13
production fixes and **9 came from a visual addendum the operator had to ASK
for** — eleven prior code-lens cycles could not reach the class. Cycle 13 then
found its top four items through the same lens. The two cycles agree: the code
lens is at diminishing returns here and the interface lens is not.

Run it as **Stage 1.5**, between the broad pass and the deep dives:
1. `cd test/visual && node build.mjs && node shoot.mjs` (needs `npm ci` there
   once; Chromium is pre-installed in the web container).
2. Read `report.json` — TWO machine checks, both printed as a summary at the end
   of the run:
   - a `missing` entry means the scenario rendered a LOADER, not the real view.
     Add the fixture before trusting that screenshot.
   - **`overflowPx > 0` means the PAGE scrolls sideways** (document
     `scrollWidth − clientWidth`). Added cycle-16 Batch 4, because this section
     already demanded the measurement and nothing performed it — a squeezed
     layout and an overflowing one look IDENTICAL in a screenshot. Content
     inside a legitimate `overflow-x: auto` scroller (the tool tab bar, a wide
     data table in `.m-table-wrap`) correctly does NOT count.
3. Actually OPEN the 42 PNGs. Compare light vs dark and wide vs compact vs
   mobile for the same scenario; that pairing is what surfaces theme and
   breakpoint defects. **Every rep-facing tool has a mobile scenario since
   cycle-16 Batch 4** — before that the matrix shot five of nine tools at ONE
   viewport, which is precisely why F2 (Reference's reader measuring 70px at
   390px) survived two interface-focused cycles. Batch 4's first run
   immediately surfaced a clipped Training heading that four sessions had
   missed. **Cycle-17 batch ⑦ closed the next three gaps:** dark parity for
   Reference / Training / Coaching, the Admin panel (light + dark — its
   `getAutomationHealth`-family fixtures now exist, with the fixture's
   top-level keys PINNED derived from the server's own return block, INV-185),
   and the first ERROR-STATE scenarios — a `?failrpc=name1,name2` query makes
   the mock invoke the FAILURE handler for those RPCs, so the
   `errorStateHtml_` paths (A12/INV-175) render on camera; a forced-fail RPC
   is NOT a missing fixture. Its first run immediately surfaced a live Low
   (the Reference LANDING pane hangs on a loader when the tree fetch fails).
   The operator-feedback round (2026-08-06) added the two redesigned status
   views — `spanish-light-wide` + `deptreq-light-wide` (fixtures cover all
   four DR tones + an overdue Spanish card) — and the 2026-08-17
   full-width round added `spanish-light-mobile` (the new `.sp-top` head+chart
   grid stacks <1024px — the breakpoint is on camera), and the 2026-08-18
   width round added `punctuality-light-wide` (the tab had never been shot —
   which is how its 780/820px caps survived two width passes), taking the
   matrix to **41** — and the fluid-pop-out-type round added
   `cn-log-light-compact-sm` (360×640, the shrunk-below-launch window the
   clamp() type exists for), taking it to **42**.
   **Still uncovered: Manage → Coverage, Sent Forms, EmpDocs
   My Docs, and modal/overlay states** (the matrix shoots tab landings only),
   and — the gap that bit on 2026-08-11 — **every ADMIN sub-tab at a mobile
   width**: the Admin scenarios are wide-only, so `.toolbar-tabs` (a SHARED
   component, also the CN search field tabs) kept a 25px page overflow at
   390px until it was measured by hand.
   Every scenario also logs the pre-existing Google-Fonts
   `ERR_CONNECTION_RESET` console line (no network in the sandbox) — ignore it.
4. Re-shoot after ANY change to `styles*.html`, `styles_design_tokens.html`, or
   a view partial's CSS, and verify the fix by MEASURING the new render. V-9
   (cycle 12) and A2/FO-3 (cycle 13) were each wrong on the first reasoned
   attempt and right only after measurement.

**Split findings by what you can actually verify** — structural facts (a missing
breakpoint, a roleless control, a token that resolves wrong) are findings;
appearance judgements are OPERATOR VISUAL CHECKS written as Regression
Scenarios. Never report "this looks cramped" as a finding.

**The harness is NOT in CI** (it needs Chromium and human eyes), so nothing
enforces this except this entry.

### Policy Configuration
Policy threshold: 4/10
Consecutive cycles: 2

### Seams Audit Cadence
every 4 subsystem cycles

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
  Expected: `Failed: 0`. `cleanupTestData()` removes all `TEST_*` rows at the end, resets test-employee balances to 15 annual / 10 sick, and RE-OFFBOARDS the test accounts (emails cleared) so they stay invisible to real agents between runs; the next run's setup restores the emails itself.

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
  Expected: Two separate emails arrive (Training Queue, Review Candidates), each listing notes from the past 7 days with rep name + caller + issue + resolution. A CLEAN-AND-EMPTY queue is silently skipped (no email) — but since cycle-17 batch ② a queue whose walk skipped unreadable rep Sheets SENDS, with a "N rep Sheet(s) could not be read … may be incomplete" warning line (a failed read is not an empty queue, INV-187); an empty-but-unreadable queue sends a warning-only digest. The function never throws.

S25 | Compact mode + per-tool pop-out (cross-tool) | Subsystem: Client (shell)
  Steps:
    - From Call Notes, click the pop-out icon → confirm a 480×800 chromeless window opens (sidebar + header collapsed)
    - Switch the main window to Time Clock, click pop-out again → confirm a SECOND window opens (the Call Notes pop-out stays open — both coexist)
    - From the main window on Call Notes, click pop-out again → confirm it FOCUSES the existing Call Notes pop-out (no duplicate); same for Time Clock
    - Resize each pop-out, close + reopen each → confirm each restores its OWN size/position
    - In a pop-out, navigate between views (Call Notes ↔ Time Clock ↔ Manage) and resize → confirm the geometry stays under the tool the window was opened for
  Expected: Window name is `umsTeamToolsCompact_<tool>` and geometry key `umsPopoutGeom_<tool>`, so one window per tool — Call Notes + Time Clock pop-outs coexist; a repeat click on a tool focuses that tool's window. A legacy `umsPopoutGeom` seeds size only. **The Call Notes pop-out additionally SELF-SIZES once on launch** (`cnPopoutFitToTemplate_`, operator feedback 2026-08-06): after the Log view renders, the window resizes so the whole note template (`.cnv-layout`) is visible — verify the save card isn't cut off on first open, on any display scaling; a later manual resize still persists and is restored. All tool views render without horizontal overflow; the compact Time Clock hides the world-clock strip + greeting kicker and tightens paddings; action grid (Time Clock) and dept-chip grid (Call Notes) stack 2-col → 1-col gracefully.

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
    - **(cycle-16 F1)** Temporarily blank one rep's Employees column L, or point it at an id the deployer cannot open, then re-open the Stats tab for a date that rep worked
  Expected: One card per enrolled rep. Each shows total notes, flag breakdown (action/training/review), resolved count, emails sent, median note completion time, shift span. Median is in `Xm Ys` format; outliers > 30 min are excluded from the median (stored as null upstream). Reps with no `completionSeconds` data (notes filed before the timer was instrumented) show "no data yet" for median. Stats refresh on date-picker change. **With an unreadable Sheet the rep is still LISTED (their CDR row is real) but every note-derived column — Notes / Action / Training / Review / Emails / Median — renders a warn-toned em dash with a "notes Sheet unreadable" tooltip, and Coverage renders an em dash, NOT `0` and NOT a CRIT-toned 0% badge.** Sorting by any of those columns groups the unavailable reps with the other unknowns rather than interleaving them with reps who genuinely logged zero. A rep with column L simply BLANK is not enrolled and does not appear at all (INV-35) — that is a different state from a failed read.

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
    - Switch to Time / PTO tab → confirm the timesheet content (pay-period tile + recent-activity list) lives in the consolidated side rail there (below the quick-actions card + annual-leave tile — the 2026-08-18 consolidation retired the mode toggle)
  Expected: The Clock view is timesheet-free post-8b. Punch interactions re-render the whole view-area cleanly (no #clk-section split anymore). The pay-period view lives in the Time / PTO rail. Compact pop-out renders the same layout, narrower.

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
    - Confirm the default is the **Yesterday** preset landing on the previous WORKDAY (on a Monday it shows Friday — operator 2026-08-17; CDR data is never same-day) and the hero label reads 'Yesterday'
    - Click **Custom…** → the Day + Range inputs reveal; change the Day to a prior working day with known CDR activity
    - Click the 7D preset → confirm the aggregate hero AND that the "Trends · you vs team avg" section STAYS rendered (headed "trailing 30 days ending <previous workday>") plus Best/Worst day chips under the delta
    - Inspect the hero sparkline (dashed avg baseline + dashed warn-toned target line) and the delta line's "· target 85%"
    - Check the rail's **Transfers** row (count + % of calls + sparkline in Today mode)
    - If coverage < 80% today, click "File them in Call Notes →" in the hint
  Expected: Hero shows % Answered + delta vs the period daily average + target; rail shows Notes Filed / Answered / Missed / Avg Talk / Transfers / Total Talk. The Custom row is HIDDEN while a preset is active (the [hidden] gotcha) and auto-opens when the selection matches no preset. The trend section renders in EVERY mode (#1 — in range mode it is filled from the Today payload, best-effort). The coverage CTA appears only for TODAY in single-day mode and lands on the Call Notes Log with a toast (the CLK_NAV_HINT mechanism). If CDR_SS_ID is not configured, shows a friendly "No call data found" message + notes count (an unreadable notes Sheet shows an em dash, never 0 — C17-14).

S42 | Metrics — Team Metrics date-range + presets | Subsystem: Server, Client (Metrics views)
  Steps:
    - As a manager, open Metrics → Team Metrics
    - Confirm default is today with From=To; KPI tiles + per-rep table render
    - Click the "7D" preset chip; confirm it shows PRESSED and the hidden From/To (behind **Custom…**) update; the table re-fetches with aggregated data
    - Click "30D"; confirm the table includes more data AND the hero shows a per-day sparkline over the SELECTED range with "vs period daily average" (#8)
    - Click Custom… and set From > To manually in the inputs
    - Click a rep's NAME in the table → confirm it opens Team Notes → Per-Rep View for that rep at the range's end date (#9)
    - Click **Copy table** and paste into a spreadsheet (#10); switch to By queue / By department and copy again
    - Click "Match diagnostics (N)" below the table (#3)
  Expected: Preset chips carry aria-pressed state; a manual range un-presses them (Custom shows pressed). Per-rep table shows Rung, Answered, Missed, % Answered (green band starts at the shipped 85 target — a rep at 80–84.9% is AMBER), ATT, Notes, Coverage, Transfers; the rail includes a Transfers row when the Transfer read succeeded. Multi-day ranges SHOW the range sparkline (single-day keeps the 30-day trend + "vs 30-day team average"). From > To auto-corrects. The copied TSV follows the current sort, has plain values only, and exports an unreadable notes Sheet as blank (never 0). The two info-tone reference lists are folded behind the diagnostics disclosure; the likely-name-mismatch warning stays visible above it. A non-manager opening Team Metrics (the tab is visible to everyone since 2026-08-18) sees the team hero + rail + trend with a "per-rep breakdown is visible to managers" note — and a direct `getTeamMetrics` call returns NO `reps[]`/diagnostics fields (`repView:true`).

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

S46 | Consolidated Time / PTO page + quick-actions card (operator 2026-08-18; replaces the retired mode toggle) | Subsystem: Client (Time Clock views)
  Steps:
    - Open Time / PTO; confirm ONE page — no Time Off ⇄ Timesheet segmented toggle anywhere — with the right rail stacking, top to bottom: the Requests quick-actions card, the Annual-leave tile (ptoEnabled reps), and the Pay-period tile + "View pay statement" + Recent activity
    - In the quick-actions card, confirm the date picker defaults to the next weekday and is floored at today; pick a date IN the displayed month → click Request → the pinned day modal opens for that date with the request form
    - Pick a date in ANOTHER month (within the +3-month horizon) → Request → the calendar navigates to that month and the pinned day modal opens there
    - Click "Request punch edit" → the #4a adjustment-request modal opens (its own bounded date picker)
    - In DevTools, set a stale `localStorage.umsMergeMode = 'timesheet'`; refresh → no effect (the key is retired and ignored)
    - Confirm the calendar renders worked-hours corner badges + PTO dots as before
    - **(range round, operator 2026-08-18)** In the quick-actions card, fill BOTH dates (a Mon and the Fri of the NEXT week) → Request → the pinned day modal opens on the Monday with "Through" pre-filled; the balance preview reads "N weekdays × 1d" and projects the multiplied deduction; Submit → toast reports "N request(s) submitted — 2 weekend day(s) skipped", the calendar shows a pending dot on each weekday, and Your Requests lists one row per day (each individually cancelable/approvable)
    - Submit a range overlapping an EXISTING pending/approved day → the whole batch is rejected naming the conflicting date(s), and NO rows were written (check the sheet)
    - In the day modal opened from a calendar tap, leave "Through" blank → the single-day flow is unchanged
    - **(accrual round, hours model 2026-08-19)** Put `3.08` in the rep's Employees column Q (`PtoAccrual` — PTO hours per 80 hours WORKED), wait out the 5-min roster cache (or run `clearCaches_()`), reload → the Annual-leave tile reads "ACCRUING 3.08H / 80H" over the credited balance, with a month-to-date line ("+0.46d earned this month · 96h worked so far") computed from the rep's real punches; there is deliberately NO year-end projection and NO progress bar (nothing to project or fill against). Blank the cell → the /15-days fixed-allotment tile returns, bar and all
    - **(automated credit — INV-194)** From the editor run `creditMonthlyPtoAccruals` as a manager: first run with a blank column R SEEDS (stamps last month, balance unchanged); hand-set column R one month further back and re-run → the balance grows by exactly the PTO the rep's PUNCHED HOURS in that month earned (`hours × rate / 80 ÷ 8` days) and an AuditLog `PtoAccrualCredit` row records `hoursWorked=`/`rate=`/`ptoHours=`/`days=`/`months=`/`through=`/`balance=`; a re-run credits nothing (idempotent); a rep who worked NO hours that month is credited nothing but still gets an audit row saying so; a rep with `PtoEnabled=FALSE` is skipped with the stamp FROZEN. Check the row also names any `incomplete day(s) NOT counted` — a day missing a clock-out is not zero hours. In production the daily **18:00** manager-tz trigger does this (moved off 6am by cycle-18 F10 — see the trigger list) — verify it exists after re-running `installAutomationTriggers()`
  Expected: One page; the rail's pay-period block lazy-loads via `loadTimesheetSideRail_` on every render (a failed load renders the error card in that slot only). The PTO path is the SAME day-modal submit flow a calendar tap uses (one submit path); closing/submitting the modal behaves per S47/S4. No `.mp-mode` markup or `umsMergeMode` read/write remains (pinned).

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
    - **(cycle-16 F6, screen reader or DevTools accessibility pane)** On the same uiPrompt, inspect the `.ui-dialog-input` and the `.ui-dialog-err` div; then submit an invalid value with a screen reader running
  Expected: All 15 dialogs use the custom modal. No `window.confirm` / `window.prompt` calls remain in the codebase. The `resolved` sentinel prevents double-resolution when Esc + click-outside fire near-simultaneously (no double-removal exception in the console). Multi-statement continuations route through helpers (`cnDoDeleteNote_`, `cnDoToggleFlag_`, `cnDoSelfUndo_`, `handleBulkActionConfirmed_`) so the post-confirm action fires exactly once. **The prompt's input has an accessible NAME (`aria-labelledby` → the dialog title) and is DESCRIBED by the message + the error slot (`aria-describedby`, the error id present even when `opts.message` is absent); `.ui-dialog-err` carries `role="alert"`, so a validator rejection is spoken rather than leaving the dialog silently refusing to close.** `uiConfirm` deliberately has neither (no field, no validation).

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
    - **(cycle-16 F9)** In the Offerings sheet, blank column C on ONE product row, then run a PPD with Q38 weight 400 and Preview
    - Open Manage → Admin → Automation Health → "Intake Offerings catalog"; restore the cell and re-check
  Expected: Recommendations reflect the engine (neuro → solid-seat/Group-3 upgrade, `K0856→K0861` / `K0843→K0862` substitutions, weight-cap exclusions, oxygen drops K0837). The sent email carries the marked star/badges; recipient resolves from the roster (agent) or `INTAKE_ALL_AGENTS_EMAIL`. A `PPDSubmissions` row stores the answers; the AuditLog `IntakeSent` row is PHI-free (`type=PPD; submissionId=…; recipientDomain=…`). Editing the form after preview makes the send fail with "The form changed since you previewed it" (bodyHash guard). **The blanked-capacity row is NOT recommended** — before F9 an unreadable capacity read as UNLIMITED and the row was offered to a 400 lb patient. The Automation Health card names that exact SHEET ROW as an error while the cell is blank, and reports "N catalog row(s), all well-formed" once restored. Engine pinned by `test_intake_engine_*` + the Node harness (incl. the F9 malformed-capacity + well-formed-unchanged pins). The result card's device-image cache-buster appends `?v=<hcpcs>` OR `&v=<hcpcs>` depending on whether the col-F URL already carries a query string — a Drive thumbnail URL (`…?id=X&sz=w1200`, the documented realistic col-F value) used to get its last param corrupted to `sz=w1200?v=K0821` (cycle-17 batch ⑤).

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
  Expected: Consent is server-stamped (authoritative version) + server-enforced (the payload must carry `consentAgreed:true` — a `false` OR absent `_meta` payload is rejected). The hash is deterministic + tamper-evident (`computeFormSubmissionHash_`, smoke-pinned), excludes `submittedAt` (coercion-safe), and the AuditLog is the independent timestamp witness. `FormSubmissions` stays append-only with NO edit endpoint (§164.312(c)); `verify` flags any out-of-band edit. Legacy 6-column rows (pre-hardening) verify as `match:null` ("legacy"), not a failure. The invite email stays PHI-minimal (Node-guarded). `getFormsSS_()` routes all form reads/writes/purge to the segregated store. **A non-empty signature must be a `data:image/` data-URL — an https:// value is rejected BEFORE the consent gate (it would be fetched by the PHI reviewer's browser in the in-app viewer and by the server-side HTML→PDF conversion — a tracking-pixel/IP leak); an EMPTY signature stays allowed (fields-only forms). Conditional sections (signer / govAssist / guardian) CLEAR their fields on re-hide, so a filled-then-hidden section's values never enter the stored record (cycle-17 batch ⑤).**

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
  Expected: Conversion is manager-gated ("Manager access required." for the non-manager call) and read-only — only the manager's explicit Save (kbSaveItem) persists anything (and, Phase 2b, exports the tokenized images to the KB Images folder at that moment); the Drive Doc is never modified. Lossy parts degrade with explicit warnings, never silently. A Doc the deployer can't open returns a friendly access error. POST-DEPLOY SPOT-CHECK (the original Phase 2b gate): as a REP, open the converted article and confirm the Drive-hosted image actually renders inside the HtmlService iframe — since the 2026-08-13 fallback a Workspace-blocked thumbnail is silently refetched through the server (`kbGetImageData`) and still renders, so a visible image no longer proves the folder is shared; a broken image now indicates the fallback ALSO failed (file outside the KB Images folder, over the 4MB fetch cap, or `KB_IMAGES_FOLDER_ID` unset). Pinned by the `kb — Doc→markdown converter` + `kb — Phase 2b` Node tests (INV-115).

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
    - **(cycle-16 F4)** Temporarily rename the `TimeOffRequests` tab (or otherwise make it unreadable) and re-open Coverage for a range where reps have approved PTO
  Expected: `getCoveragePlan` is manager-gated, read-only, range-capped (1–14 days), PHI-free (names + schedule + PTO status). Per-tz shifts (v1). The hourly distinct-rep math matches the pure `coverageBucketHours_` (Node-pinned); every server string `esc()`'d. INV-127. **With the PTO read broken, the grid still renders (best-effort by design) but a warn-toned `role="alert"` banner sits above it stating that time-off is NOT reflected and the bands are an upper bound; every rep shows as working; and the risk panel must NOT show the green "All business hours meet the N-rep minimum" check — it renders the neutral "No understaffed hours found — but time-off data is missing, so this is not an all-clear."** Restore the tab and confirm the banner disappears and the green all-clear returns.

S73 | Phone-width layout of the four unbreakpointed grids (cycle-16 F2/F3) | Subsystem: Client (Reference views), Client (Call Notes views), Client (Intake views)
  Steps:
    - On a real phone, or DevTools at 390×844, open **Reference** and tap any article
    - Open **Call Notes → Log** and look at the Callback / Caller / Relationship row
    - Open **Intake → PPD** and scroll to a question with a help (i) glyph; hover/focus it
    - In each view, check `document.documentElement.scrollWidth === clientWidth` in the console
    - Re-open all three in the compact pop-out (480px) and at desktop width
  Expected: Reference stacks — the tree sits above the reader and BOTH are full-width (~366px at 390px viewport), never a 280px tree beside a ~70px reader. The Call Notes trio stacks (or goes 2-up above 480px) so the phone number never wraps mid-value. PPD question text and its control each take the full row width. **No view scrolls horizontally** — `scrollWidth` equals `clientWidth`; in particular the PPD help tooltip opens LEFTWARD from the glyph and stays on-screen. Compact pop-out geometry and desktop layout are unchanged from before the fix (compact wins on specificity, `(0,3,0)` vs `(0,2,0)`).

S74 | Department-request tracking end to end (INV-131/138; the tracker had NO scenario until cycle-16 F8 changed it) | Subsystem: Server, Client (Metrics views), Client (Call Notes views)
  Steps:
    - As an enrolled rep, send a department email from a saved call note (Save & Compose → pick a department → Preview → Send)
    - Confirm the SENT email body ends with a "✓ Mark this request resolved" link, and that a `DeptRequests` row was appended (PHI-free: dept label + update category + `noteId`, `ToEmail` holding the recipient DOMAIN only)
    - Re-send the SAME note to the SAME department → confirm NO second row is appended and the CTA reuses the first row's token (the audit row is annotated `resend`, INV-131)
    - Open **Metrics → Dept Requests** as the sending rep → the request appears under "Mine" as an OPEN-toned (`st-pending` amber) status card with an elapsed time; the KPI strip counts it under Open
    - **(operator rounds 2–3)** Click the Open / Resolved status chips → the list filters in place (no refetch); with requests to 2+ departments, click a department chip → only that dept's cards remain and the section label reads "N of M"; click "All departments" → the filter clears (the default view shows every dept)
    - Age a request past its SLA (or hand-set CreatedAt) → its card tones `st-overdue` (red) with "Overdue · Xh SLA"; at ≥75% of the SLA it tones `st-atrisk`
    - Click "Mark resolved" in-app → status flips; re-open and confirm the elapsed figure FROZE at the resolution time and does not keep growing
    - As a receiving-dept member (roster column N lists that dept) → confirm it appears under **Incoming** and can be resolved there
    - As a signed-in internal recipient, click the emailed link instead → `?resolve=` marks it resolved, attributed, and is idempotent on a second click
    - As a manager, confirm the per-department aggregate (open / resolved / avg / median / overdue) renders and that a resolved request is NOT counted as open
    - **(cycle-16 F8, the two defects this scenario exists to catch)** In the `DeptRequests` sheet, hand-edit one resolved row's Status cell to `" resolved "` (padded) and BLANK another resolved row's `ResolvedAt`; reload the tracker
  Expected: One open request per (note, dept) — re-sending re-notifies without opening a duplicate. The padded-status row is counted RESOLVED everywhere (the item's `status`, the `incoming`/`allOpen` filters and `deptStats` all read the same normalized value — before F8 the first three excluded it while `deptStats` counted it OPEN). The blank-`ResolvedAt` row reports its elapsed time as **unknown (`null`)**, and is EXCLUDED from the department's average and median — before F8 it reported its full age as its resolution time, inflating both a little more every day against the very numbers the SLA targets are set from. **(cycle-18 F5) The padded row is now read identically by EVERY consumer** — `drStatus_` is the one reader, so the re-send dedupe, the resolve idempotence check and the SLA digest all agree with the tracker. Verify the third and fourth directly: re-send the same note to the same dept and confirm NO second row appears (the audit row is annotated `resend`), and click an already-resolved request's email link a second time — the original `ResolvedAt`/`ResolvedBy` must survive unchanged.

S75 | Team-member onboarding (Admin → Config → Team Members) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As an admin, open Manage → Admin → Config → Team Members; confirm the readiness list renders one row per rostered rep with chips (notes / manager / tz / cdr) and an Offboard button on every row EXCEPT your own
    - Click "Add team member" → the form reveals; submit with a duplicate email, a `TEST_` ID, a duplicate NAME, an unknown department, a bare `9-17` schedule, and a manager email outside MANAGER_EMAILS — each returns one specific error and writes NOTHING
    - Submit a valid rep (unique name spelled exactly as the CDR Report spells it, real tz, manager picked from the list, "Provision their Call Notes Sheet now" checked)
    - Confirm the success toast, the rep appears in the readiness list, a Call Notes Sheet exists in the deployer's Drive, column L is filled, and AuditLog has `EmployeeAdd` + `CallNotesProvision` rows
    - As the new rep (their Google login), open the web app → the shell loads with their name; Call Notes shows the active form (no enrollment splash)
    - Offboard a test rep → uiConfirm danger dialog; the row's email cell clears, the NAME stays, the rep moves to the "offboarded (name kept for history)" line, and AuditLog has `EmployeeOffboard`
    - Try `google.script.run...addEmployee({})` / `...offboardEmployee('x')` / `...getOnboardingPanel()` as a non-manager → all "Admin access required."
    - **(operator report 2026-08-08)** Add a rep whose ID matches an OFFBOARDED row → the error names the owning row ("used by Jo Tran (row 9)") and says IDs stay reserved; confirm the offboarded line at the bottom of the panel lists that ID
    - **(operator report 2026-08-08, second round — the case that actually fired)** Type an Employee ID + name straight into the Employees sheet, leaving column A (email) and D–L blank, then try to add that person through the form → the error names the owning row AND says it has NO login email, with both resolutions (clear its ID / fill in the email); confirm the panel lists it under **incomplete row(s)**, NOT under offboarded
  Expected: Validation is one-actionable-error-at-a-time and nothing is written on a reject; a biweekly anchor is rejected when one already exists (INV-18); the new rep can sign in immediately (the roster cache is invalidated on add). Offboard clears ONLY the email — history, sheets, and notes all keep reading. Self-offboard is rejected. The CDR chip is best-effort: with the CDR Report unreachable every rep reads "cdr: unknown", never "missing". **A follow-up failure AFTER the row is appended reports success-with-warning ("the employee WAS created, but…"), never a bare failure** — a bare failure is what made an admin retry and hit a phantom "ID already in use". **An ID conflict is always traceable from the error alone** — the owning row is named, and an email-less owner says so plus how to resolve it, because that row appears in NO in-app list (INV-183).

S76 | Break + clock-out reminders reach every tab, with sound (operator 2026-08-11) | Subsystem: Client (shell), Client (Time Clock views)
  Steps:
    - As a rep whose roster schedule carries breaks, note the bell in the sidebar (Alerts row) — sound is ON by default; the second button is desktop notifications
    - Open the Call Notes pop-out and leave it as the only visible window; wait until `breakReminderMin` before a scheduled break
    - Return to the main window and confirm the SAME break did not toast a second time
    - Click the bell to turn sound off, reload, and confirm it stayed off (and that switching light/dark theme does NOT switch it back on)
    - Click the desktop-notification button and read the resulting toast
    - Stay clocked in past your scheduled shift end and wait ~5 minutes
    - Open DevTools → Network and watch the ticker for a few minutes mid-shift
  Expected: The break reminder fires ONCE per break per rep-local day, in whichever window is open — the pop-out included (it used to fire only on the Clock tab). Each reminder shows a toast, plays a two-tone chime when sound is on, and posts a desktop notification only if the browser granted permission. The desktop button most likely reports that the browser blocked or disallows notifications for an embedded app — that is EXPECTED here (cross-origin iframe) and the message must say the toast + chime still work rather than failing silently. Turning sound off persists per browser via `umsNotify`, and a theme switch must not reset it (the theme reflector writes only to `[data-theme-target]` buttons). Past the shift end a "still clocked in" nudge appears once; it never fires when the punch state is unknown. Mid-shift the ticker makes ZERO server calls; inside the end-of-shift window it refreshes `getEmployeeState` at most once per 10 minutes. A closed browser gets nothing — the daily missed-punch email remains that backstop.

S77 | Team Members panel paints instantly; readiness reads as a column (operator 2026-08-11) | Subsystem: Server, Client (Call Notes views)
  Steps:
    - As an admin, open Manage → Admin → Config and watch the Team Members block appear
    - Read the "Phone system" column immediately, then again a moment later
    - Scan DOWN the Manager column across several reps
    - Find your OWN row and confirm the readiness columns line up with everyone else's
    - Temporarily unset `CDR_SS_ID` (or point it at an unreadable id) and reload the panel
    - Narrow the window to a phone width and check that the page does not scroll sideways
  Expected: The roster panel renders as soon as the roster read returns — it no longer waits on the CDR Report. Each rep's phone-system chip shows "cdr: checking…" first and is then patched in place to ✓ / an alias suggestion / "no calls in 7d". With CDR unreachable every chip reads "cdr: unknown" (never "no calls" — an unread name is not an absent one), and nothing else on the panel degrades. Readiness is a headed grid, so a gap on one rep sits directly under a pass on another; the caller's own row shows a "you" chip in the action column and stays column-aligned. At ≤900px the rows stack and the header hides; the Admin sub-tab strip scrolls inside itself rather than pushing the page sideways.

S78 | Pop-out has no repeated header strip (operator 2026-08-11) | Subsystem: Client (shell), Client (Call Notes views)
  Steps:
    - Pop out Call Notes; confirm the note template starts at the top with only the tab bar above it — no phone icon + "Call Notes" strip
    - Repeat for Metrics, Reference, Training, Intake, Dept Requests, Manage Time, and Time / PTO
    - In the Manage Time pop-out, click the refresh control and confirm the dashboard reloads
    - Shrink the pop-out as far as it will go and confirm nothing needs scrolling past to do it
  Expected: No tool renders the retired `.compact-header`. The pop-out window's own title already names the tool and the tab bar names the view, so the strip was pure repetition at the top of the smallest window in the app. The manager refresh button survived the retirement on its own right-aligned row and still works. The Call Notes pop-out self-sizes ~44px shorter than before.

S79 | Pay statement — own-data self-check with estimated gross | Subsystem: Server, Client (Time Clock views)
  Steps:
    - In the Employees sheet, set column P (`PayRate`) for a test rep (e.g. `18.50`) and leave it BLANK for another
    - As the rated rep: Time / PTO → click "View pay statement" in the side rail's pay-period block
    - Read the modal: period label + ‹ › nav; day rows (punches, hours, ADJ badges); a weekday with no punches; any incomplete day; approved PTO rows; totals; the estimated-gross box
    - Navigate ‹ two periods back and forward again; try to go past the current period
    - As the BLANK-rate rep, open the statement
    - As a non-manager, call `google.script.run...getMyPayStatement(0, '<another rep id>')` from the console; as a manager, the same call
    - If timesheet archiving is enabled, open a period older than the archive window
    - **(click-through, operator 2026-08-18)** On an INCOMPLETE day and on an empty weekday within the adjust window, click the row's "Request edit" button → the statement closes and the Adjust modal opens PRE-FILLED to that date (reason label tracks the date's age); an incomplete day OLDER than the adjust window shows NO button; as a MANAGER viewing another rep's statement, confirm NO "Request edit" buttons render anywhere (the adjust modal submits for the caller, not the viewed rep)
  Expected: The rated rep sees "Estimated gross: $X (Yh × $R/h)" with the "Estimate only … Not a payslip" disclaimer; the blank-rate rep sees the same statement hours-only with "Pay rate not on file". A weekday with no punches renders "no punches" (visible — a missing day IS the discrepancy); incomplete days are amber, EXCLUDED from the total, and the foot note points at the per-day "Request edit" buttons (in-window) or the manager for older days. Period boundaries match the ADP export (org biweekly anchor / calendar month); the ‹ › nav is bounded 0..6 and a slow older-period response never overwrites a newer one (seq-guarded). The non-manager cross-rep call returns "Manager access required."; the manager call returns the target's statement with a "Viewing: <name>" line. An archived-away period shows the "may have been moved to the timesheet archive" warning instead of presenting a short total as complete. The rate value appears NOWHERE outside this modal (teammate status, dashboards, and exports are unchanged).

S80 | Spanish Inbox — resolution-share chart | Subsystem: Server, Client (Metrics views)
  Steps:
    - Ensure `SPANISH_INBOX_MEMBERS` lists ≥2 members, at least one of whom has resolved nothing in the window
    - As a manager (or listed member), open Metrics → Spanish Inbox
    - Read the "Resolution share" card between the KPI strip and the request list
    - Mark a pending request resolved manually and refresh after the cache TTL
    - Switch the window (Last 7 / 30 / 90 days)
  Expected: One bar per resolver, count + % direct-labeled, sorted most-resolved first; a configured member with ZERO resolutions shows as a zero bar (never vanishes — the "completed equally" check is about them); a dashed neutral marker sits at the even-split share with a foot note naming it; manual resolves count toward whoever clicked, with an "N manual" suffix. NO verdict coloring anywhere on the chart — bars stay accent-toned regardless of share (the judgement is the operator's). A capped scan appends "shares may be incomplete". The chart re-renders with the window change and with background refreshes, and renders nothing (no empty card) when the window has no resolutions.

S86 | Interactive KB block re-render stays inert | Subsystem: Client (Reference views)
  Steps:
    - As an admin, create a Reference ARTICLE whose body contains a ```roster fence with a
      person name carrying markup, e.g. `team| Ops > Sub: <img src=x onerror="alert(1)"> (C)`
    - Open the article in the Reference tab. Confirm the name renders as INERT TEXT
    - Click through EVERY roster mode tab (Teams / Capabilities / Chart / Flow / Coverage),
      then Expand, then click a person to open the detail panel
    - Repeat the whole walk in the Ctrl/⌘+K drawer
    - In a ```decision fence, give an option a label containing an ampersand
      (`opt| q1: PT & OT -> a1`) and walk the guide, then click a crumb to go back
    - As a manager, run kbConvertDriveSheet on a roster sheet whose cells contain `<` or `&`
  Expected: NO alert fires and NO live element is ever created — `document.querySelectorAll('img')`
    inside the block stays 0 through every re-render (the payload renders as escaped text at
    every step, not just the first). The ampersand option RESOLVES (the guide advances and the
    crumb returns) — re-escaping the source without re-escaping the matched path channels
    dead-ends it silently. Copy name still yields the HUMAN form ("Smith & Jones", not an
    entity), and title/aria-label/tooltip text is likewise unescaped for the reader.
    Converted sheet cells are inert on first render AND after a mode switch.

### Frozen Subsystems
- **DELETED in cycle 13 (batch 5) — all three frozen directories are gone from the working tree and live only in git history (last present at commit `9586b29`).** They were `call-notes/` + `call-notes-legacy/` (the superseded Workspace Add-on scaffold) and `incoming/form-generator/` (the pre-port bound Apps Script the Intake module was rewritten from) — ~3k lines across 29 files that every grep hit, every agent read, and every audit had to consciously skip, while contributing nothing: `clasp` only ever pushed `web-app/`, and no live code, test, or CI step referenced them. The Add-on path is abandoned for good (org admin policy blocks Marketplace install without ticket-driven allowlisting, the same constraint that blocks the external `?form` route); the form-generator port shipped and was settled. Provenance comments in `Code.js` / `script_intake.html` now point at git history instead of a path that no longer exists.
- **To consult them:** `git show 9586b29:incoming/form-generator/filterRecommendations.js` (or `git checkout 9586b29 -- incoming/form-generator` into a scratch worktree). Nothing needs unfreezing to read them.
- The Frozen-Subsystem MECHANISM stays documented here for future use — a subsystem that is superseded but still on disk belongs in this section so audits skip it by default.

### Deploy Command
Server: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy. Web app picks up the change on next page load.
Client (shell), Client (Time Clock views), Client (Call Notes views), Client (Metrics views), Client (Intake views), Client (Reference views), Client (Training views), Client (public forms): same single `clasp push -f` ships all HTML partials alongside `Code.js`; same New-version deploy step.
Test Suite: same `clasp push -f`. Tests don't ship to end users — run them from the editor with `runSmokeTests()` (safe on prod) or `runAllTests()` (writes TEST_ rows, cleans up at end).
