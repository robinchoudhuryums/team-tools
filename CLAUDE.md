# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Doc map — which file holds what

Batch D1 (2026-09-14) split this file. It had grown to 12,661 lines, which is
long enough that a reader stops reading and a `/sync-docs` pass starts guessing
where an update belongs. Nothing was rewritten — the entries moved VERBATIM and
this file keeps an index into each.

<!-- DOCMAP:BEGIN -->
| File | Holds | Read it when |
|---|---|---|
| `CLAUDE.md` (this file) | The MAPS and INDEXES: the module map, the Common Gotchas index (rule · trigger · pointer), the Key Design Decisions index, the Operator State Checklist, Development, the running-totals block, Cycle State & Memory | You are about to change code and need to know what has bitten before |
| [`docs/design-decisions.md`](docs/design-decisions.md) | Every Key Design Decision in full — WHY the code is shaped as it is | You are about to change a decision, or want the reasoning behind one |
| [`docs/operator-log.md`](docs/operator-log.md) | The dated deploy-round entries — what each round changed for the operator | You are reconstructing when a setting or behaviour appeared |
| [`docs/modules.md`](docs/modules.md) | The per-module narrative behind the Projects map table | You need to know what a tool actually does, or why |
| [`docs/gotchas.md`](docs/gotchas.md) | Every Common Gotcha in full — the incident, the reasoning, the pin | The index rule is not enough and you need the story |
| [`.cycle/config.md`](.cycle/config.md) | Cycle Workflow Config: Test Command, Health Dimensions, Axis B, Subsystems, the Invariant Library, the Visual Audit Stage, Policy, Seams cadence, Regression Scenarios, Frozen Subsystems, Deploy Command | A workflow command says "read CLAUDE.md's Cycle Workflow Config" |
| [`.cycle/STATE.md`](.cycle/STATE.md) | The CURRENT cycle only | Resuming work; `/cycle-status` |
| [`.cycle/HISTORY.md`](.cycle/HISTORY.md) | Closed-cycle STATE blocks, newest first | Reconstructing a past cycle |
| [`PROJECT_HEALTH.md`](PROJECT_HEALTH.md) | Current Standing + Score History | `/health-pulse`, portfolio reporting |
| [`test/client/README.md`](test/client/README.md) | How the Node + DOM harnesses work | Writing or debugging a pin |
| [`test/visual/README.md`](test/visual/README.md) | How the visual matrix works | Before a `/broad-scan`'s Visual Audit Stage |
| [`docs/test-harness-log.md`](docs/test-harness-log.md) | What each batch added to each harness; the editor-test hazards; the fixture rules | A pin's history, or why a harness rule exists |
| [`docs/deployment.md`](docs/deployment.md) | Blue-green: the dev instance alongside prod | Standing up or using the DEV project |
<!-- DOCMAP:END -->

**Append-only archives** — `.cycle/STATE.md`, `.cycle/HISTORY.md`,
`PROJECT_HEALTH.md`. A count written in one of these is a FACT OF ITS DATE
("the post-push run read 315/315"), not a live claim, so the running-totals ban
skips them; every other file above is live guidance and must cite the block.
Adding an archive means naming it on this line — the pin derives the exclusion
from here, so an undeclared file is scanned.

**Where a `/sync-docs` update belongs:** a new gotcha or a change to how the code
behaves → this file. A decision and its reasoning → `docs/design-decisions.md`
(add a line to the index here). A dated round note → `docs/operator-log.md`,
newest-first at the top. A new invariant, scenario or subsystem →
`.cycle/config.md`. **Every number any of them quotes → nowhere: cite the
generated running-totals block below, which CI checks.**

## Projects

**`web-app/` is the only project directory** and the only clasp project. It is a
multi-module browser web app served at ONE Web App URL; every module is an entry
in the `TOOLS` registry in `script_core.html`, and `Object.keys(TOOLS).length` is
the authority on how many there are (it read "six" in the docs for a whole cycle
after the Manage module shipped — the MODULE-MAP pin now derives this table's
rows from the registry, so the two cannot drift again).

<!-- MODULE-MAP:BEGIN -->
| Tool (`TOOLS` key) | Tabs | Store | Gate | Detail |
|---|---|---|---|---|
| **Dashboard** / Time Clock (`timeClock`) | Dashboard · Time / PTO | ADP (`ADP_SS_ID`) | employee | [modules.md](docs/modules.md#time-clock) |
| **Call Notes** (`callNotes`) | Log · History · Search · Sent Forms · Team Notes* | per-rep Sheet (roster col L); Forms PHI store | employee; Team Notes manager | [modules.md](docs/modules.md#call-notes) |
| **Metrics** (`metrics`) | My Stats · Team Metrics · Spanish Inbox*† · Dept Requests | CDR Report (`CDR_SS_ID`, read-only); DeptRequests | employee; Spanish `canSeeSpanishInbox_` | [modules.md](docs/modules.md#metrics) |
| **Intake** (`intake`) | PPD · PMD Account · PAP Account · Sent · Catalog | Intake (`INTAKE_SS_ID`) — **PHI** | employee | [modules.md](docs/modules.md#intake) |
| **Reference** (`reference`) | Browse (+ the Ctrl/⌘+K drawer, shell-wide) | KB (`KB_SS_ID`) — PHI-free by policy | employee; authoring admin | [modules.md](docs/modules.md#reference) |
| **Training & Employee Docs** (`develop`) | My Training · Team Training* · Coaching · My Docs · Issue Docs* | KB (training tabs) + HR (`HR_DOCS_SS_ID`, never purged) | employee; manager surfaces team-scoped | [modules.md](docs/modules.md#training-employee-docs) |
| **QA** (`qa`) | Recordings · Stats · Log · My Reviews | QA (`QA_SS_ID`) + a Drive recordings folder | manager **or** `QA_MEMBERS` (`canSeeQa_`) | [modules.md](docs/modules.md#qa) |
| **Manage** (`manage`) | Manage Time* · Coverage* · Punctuality* · Admin** | every store (it is the admin surface) | manager; Admin tab `isAdmin` | see the multi-tool-registry decision |
<!-- MODULE-MAP:END -->

`*` manager-only · `**` admin-only · `†` also gated on `canSeeSpanishInbox_`.
Client partials per module: `.cycle/config.md`'s **Subsystems** section — the one
place that mapping lives. Server endpoints are all in `web-app/Code.js` until
Batch F2 splits it. The per-module narrative — what each tool actually does, the
redesigns, the operator rounds that shaped it — is [`docs/modules.md`](docs/modules.md).

**Adding a new tool:** append an entry to `TOOLS`, drop a partial in
`web-app/<tool>/script_*.html`, `include()` it from `index.html`, add server
endpoints to `Code.js` alongside existing ones — and add a row to the map above,
which the MODULE-MAP pin requires.
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
**The runbook is smoke on prod, full on dev nightly (Batch S, 2026-09-11):**
`runNightlySelfTest` runs the full suite on the DEV instance every night, and
`runAllTests` on prod is the exception, not the routine (with
`INSTANCE_IS_PROD=true` it refuses outright). When a full run must be split —
a mid-shift manual run contends for the one project ScriptLock — run
`runAllTestsPartA` and `runAllTestsPartB` as two executions; together they are
exactly `runAllTests`. The summary's `Expected: N registrations` line is
DERIVED from the registration list — read the expected count off the run,
never off a doc — and the `── Suite environment ──` block at the top of the
log names every deployment setting the outcome depends on (instance markers,
`ADMIN_EMAILS`, `MANAGER_EMAILS`, the fixture properties, the TEST rows).

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

Each entry has bitten this project in production. **Read the family that covers
what you are about to change** — the families are ordered by how often a change
lands in one. The RULE is here; the incident, the reasoning and the pin are in
[`docs/gotchas.md`](docs/gotchas.md), one click behind each entry.

Adding one: write the rule here (rule · when it fires · how it is held) and the
narrative there, under an anchor. The GOTCHA-INDEX pin requires every entry here
to resolve to an anchor that exists, and every anchor there to be indexed here.

<!-- GOTCHA-INDEX:BEGIN -->

### Sheets coercion & typed reads

Read a cell the wrong way and it does not throw — it silently lies. This family has cost more cycles than any other.

- **Sheets coerces `'TRUE'`/`'FALSE'` strings to native booleans.** Fires when you read a TRUE/FALSE column. [Detail](docs/gotchas.md#g09-sheets-coerces-true-false-strings-to-native)
- **Sheets auto-coerces `HH:mm:ss` strings to Date objects.** Fires when you read a `HH:mm:ss` column. [Detail](docs/gotchas.md#g10-sheets-auto-coerces-hh-mm-ss-strings)
- **AuditLog timestamp cells coerce to Dates too — read via `normalizeAuditTs_()`.** Fires when you read any AuditLog cell. [Detail](docs/gotchas.md#g11-auditlog-timestamp-cells-coerce-to-dates-too)
- **CN coercion recovery formats in the HOST sheet's own tz — a drifted per-rep sheet tz no longer breaks note reads (Part A, operator 2026-08-27).** Fires when you recover a coerced CN cell — the tz you format in is the HOST sheet’s. Verify: PTA-1/2/3. [Detail](docs/gotchas.md#g12-cn-coercion-recovery-formats-in-the-host)
- **Sheet LOCALE (not just timezone) can coerce stored ISO-T strings to Dates — and `SpreadsheetApp.create()` inherits the SCRIPT tz + deployer locale.** Fires when you create a spreadsheet, or read a stored ISO-T string. [Detail](docs/gotchas.md#g13-sheet-locale-not-just-timezone-can-coerce)
- **`CN.DATE_LOCAL` is a Sheets-coerced Date on read.** Fires when you read `CN.DATE_LOCAL`. [Detail](docs/gotchas.md#g16-cn-date-local-is-a-sheets-coerced)
- **`normalizeType_` strips the `ADJ-` prefix.** Fires when you compare a punch type read from COMMENTS. [Detail](docs/gotchas.md#g18-normalizetype-strips-the-adj-prefix)

### Timezone frames

Three distinct concepts (storage tz, manager anchor, the rep’s roster frame) that are easy to conflate and expensive to confuse.

- **A "same day" compare between a CONFIG.TIMEZONE stamp and a MANAGER-tz "today" must CONVERT the stamp first (post-deploy `runAllTests`, 2026-09-02).** Fires when you compare a `fmtDate_` stamp against a manager-tz "today". [Detail](docs/gotchas.md#g51-a-same-day-compare-between-a-config)
- **The TEST roster rows keep their FIXTURE timezones, and setup restores them (operator 2026-09-02).** Fires when you are tempted to normalise the TEST roster rows to CST. [Detail](docs/gotchas.md#g52-the-test-roster-rows-keep-their-fixture)
- **`safeTimezone_` validates roster timezone strings.** Fires when you read a roster timezone in an automation context. [Detail](docs/gotchas.md#g88-safetimezone-validates-roster-timezone-strings)

### Gates, auth & the PHI boundary

What a caller may reach, and what may be written where everyone can read it.

- **`_TEST_OVERRIDE_EMAIL` only intercepts `getActiveUserEmail_()`.** Fires when a code path calls `Session.getActiveUser()` directly. [Detail](docs/gotchas.md#g23-test-override-email-only-intercepts-getactiveuseremail)
- **Manager-only operations check `callerEmp.isManager`.** Fires when you add ANY manager-gated endpoint. [Detail](docs/gotchas.md#g25-manager-only-operations-check-calleremp-ismanager)
- **Trigger-handler endpoints are reachable via `google.script.run`.** Fires when you add a public function that walks the roster or sends mail. [Detail](docs/gotchas.md#g26-trigger-handler-endpoints-are-reachable-via-google)
- **`getTeammateStatus` is the low-privilege view.** Fires when you add a field to the teammate-status response. [Detail](docs/gotchas.md#g33-getteammatestatus-is-the-low-privilege-view)
- **CallNoteEmail audit row is deliberately PHI-free.** Fires when you are tempted to add the subject or recipients to the audit row. [Detail](docs/gotchas.md#g35-callnoteemail-audit-row-is-deliberately-phi-free)
- **ExternalEmailSent audit row logs only the recipient domain.** Fires when you log an external recipient anywhere shared. [Detail](docs/gotchas.md#g36-externalemailsent-audit-row-logs-only-the-recipient)
- **Voice dictation routes audio outside the BAA boundary.** Fires when you consider enabling voice dictation. [Detail](docs/gotchas.md#g87-voice-dictation-routes-audio-outside-the-baa)
- **`getCallNotesDepartments` requires an enrolled employee.** Fires when an unregistered domain user calls it. [Detail](docs/gotchas.md#g96-getcallnotesdepartments-requires-an-enrolled-employee)
- **Public form endpoints have no employee auth — token is the credential.** Fires when you add logic to the public form endpoints. [Detail](docs/gotchas.md#g101-public-form-endpoints-have-no-employee-auth)
- **Form submissions are PHI and segregated, hashed, and consent-stamped.** Fires when you touch the form submission pipeline, or choose where its PHI lives. [Detail](docs/gotchas.md#g102-form-submissions-are-phi-and-segregated-hashed)

### Escaping & injection

Every one of these guards an `innerHTML` sink or a template injection.

- **`buildCallNoteEmailHtml_` must `esc_` every user-supplied field.** Fires when you add a field to the call-note email builder. Verify: `test_cn_buildEmailHtml_escapesUserFields`. [Detail](docs/gotchas.md#g37-buildcallnoteemailhtml-must-esc-every-user-supplied-field)
- **Note marker formatting runs POST-escape, and its regexes are a client↔server MIRROR (operator 2026-08-25).** Fires when you add a formatting marker, or convert newlines. [Detail](docs/gotchas.md#g38-note-marker-formatting-runs-post-escape-and)
- **Metrics client must `esc()` every server string before `innerHTML`.** Fires when you render a server string into the Metrics DOM. [Detail](docs/gotchas.md#g39-metrics-client-must-esc-every-server-string)
- **Intake email builders must `esc_` every patient field; the justification is the ONE raw exception.** Fires when you add a field to an intake email builder. [Detail](docs/gotchas.md#g44-intake-email-builders-must-esc-every-patient)
- **A value written to a `data-*` attribute comes back DECODED — never re-render it raw (cycle-18 F1).** Fires when a value round-trips through a `data-*` attribute back into `innerHTML`. [Detail](docs/gotchas.md#g49-a-value-written-to-a-data-attribute)
- **`form_public.html` must inject `FORM_TOKEN` via the unescaped `<?!=` scriptlet.** Fires when you inject a value into `form_public.html`, or write `<?` in a JS comment. [Detail](docs/gotchas.md#g108-form-public-html-must-inject-form-token)
- **`form_public.html`'s local `esc()` escapes quotes (F cycle-8) — don't "simplify" it back to `textContent`→`innerHTML`.** Fires when you "simplify" the public page’s local `esc()`. [Detail](docs/gotchas.md#g110-form-public-html-s-local-esc-escapes)

### Locks, caches & invalidation

Who waits for whom, and what goes stale.

- **ScriptLock around every mutating op.** Fires when you add a server function that writes to a sheet. [Detail](docs/gotchas.md#g17-scriptlock-around-every-mutating-op)
- **Roster cache invalidation + key bump.** Fires when you edit an Employees column, or change the `EMP` enum shape. [Detail](docs/gotchas.md#g19-roster-cache-invalidation-key-bump)
- **`timeToMins_` returns `null`, never `NaN` — and an ARITHMETIC caller must guard EXPLICITLY (A3, cycle-13 — FIXED).** Fires when you do arithmetic on `timeToMins_` output. Verify: the A3 behavioural + caller-shape tripwires and the `timeToMins_nullOnUnparseable` smoke test. [Detail](docs/gotchas.md#g55-timetomins-returns-null-never-nan-and-an)
- **A per-rep result cache on a surface that lists TASKS owes an invalidation from every flow that COMPLETES one (F4, cycle 19).** Fires when a flow COMPLETES a task that a cached list names. [Detail](docs/gotchas.md#g67-a-per-rep-result-cache-on-a)
- **Late `google.script.run` successHandlers in Call Notes loaders guard on `currentView`.** Fires when you add a Call Notes loader, or handle a structured `{error}`. Verify: the C17-5 pin. [Detail](docs/gotchas.md#g81-late-google-script-run-successhandlers-in-call)
- **Tag admin operations hold the global ScriptLock across all enrolled rep Sheets.** Fires when you add reps in volume, or add a cross-rep tag transform. [Detail](docs/gotchas.md#g90-tag-admin-operations-hold-the-global-scriptlock)
- **Clock view coverage strip is SWR-cached per day (cycle-9 M-6).** Fires when you cache the Clock coverage strip. [Detail](docs/gotchas.md#g104-clock-view-coverage-strip-is-swr-cached)
- **`getMyMetrics` is ALSO server-result-cached (L-1).** Fires when you wonder why a Metrics re-enter costs nothing. [Detail](docs/gotchas.md#g105-getmymetrics-is-also-server-result-cached-l)

### Honest failure — a degraded read must never read as data

The recurring shape: a `catch` that returns 0, or a plausible substitute for a missing value. Both become data the moment they render.

- **A diagnostic that can never be clean is worse than none — the CDR name-match card (cycle 15).** Fires when you tone a health card off a count. [Detail](docs/gotchas.md#g02-a-diagnostic-that-can-never-be-clean)
- **CDR enrichment in `managerGetShiftStats` is best-effort.** Fires when the CDR store is unreachable and shift-stats still render. [Detail](docs/gotchas.md#g05-cdr-enrichment-in-managergetshiftstats-is-best-effort)
- **An operator-maintained data source that a DECISION ENGINE reads needs a shape check, and the fail direction on unreadable data must be CHOSEN (F9, cycle-16 — FIXED).** Fires when an engine reads operator-maintained data it cannot parse. [Detail](docs/gotchas.md#g41-an-operator-maintained-data-source-that-a)
- **A failed note-count read must be SURFACED, never rendered as 0 (cycle-12 F5).** Fires when a note-count read fails and a coverage surface still renders. [Detail](docs/gotchas.md#g48-a-failed-note-count-read-must-be)
- **A best-effort overlay whose ABSENCE is reassuring must announce itself (F4, cycle-16 — FIXED).** Fires when you wrap an overlay read in a bare `catch`. [Detail](docs/gotchas.md#g53-a-best-effort-overlay-whose-absence-is)
- **An UNKNOWN duration is not the same as an elapsed one — never substitute "now − start" for a missing END timestamp (F8, cycle-16 — FIXED).** Fires when a duration needs two timestamps and one is missing. [Detail](docs/gotchas.md#g54-an-unknown-duration-is-not-the-same)

### Punch, PTO & roster semantics

The payroll-facing rules. Getting one wrong costs money or a balance.

- **Roster INCLUSION goes through `empRosterEmail_(row)` — the one predicate (cycle-15 F3).** Fires when you read the roster email column to decide who counts as a person. [Detail](docs/gotchas.md#g03-roster-inclusion-goes-through-emprosteremail-row-the)
- **Timesheet rows are in APPEND order, not time order.** Fires when you consume same-day punch rows. Verify: `test_getTodayPunches_sortsOutOfOrderBackfill`. [Detail](docs/gotchas.md#g14-timesheet-rows-are-in-append-order-not)
- **The live punch path enforces the client's own state machine; Day Edit reconciles duplicates (cycle-10 M-1).** Fires when you add a punch path, or reconcile a day. [Detail](docs/gotchas.md#g15-the-live-punch-path-enforces-the-client)
- **`PtoEnabled` defaults to TRUE.** Fires when you touch PTO display OR the deduction. [Detail](docs/gotchas.md#g20-ptoenabled-defaults-to-true)
- **Sick leave is UI-removed but backend-dormant (deferred #2 / C1).** Fires when you are tempted to re-add `Sick Leave` to `TIME_OFF_TYPES`. [Detail](docs/gotchas.md#g21-sick-leave-is-ui-removed-but-backend)
- **PTO balance transitions.** Fires when you change a time-off status. [Detail](docs/gotchas.md#g27-pto-balance-transitions)
- **Time-off submit has a duplicate-date guard + leave-type whitelist — and the multi-day `submitTimeOffRange` shares BOTH, atomically.** Fires when you add a time-off submit path. [Detail](docs/gotchas.md#g28-time-off-submit-has-a-duplicate-date)
- **Bi-weekly anchor read.** Fires when you blank or add a biweekly `PayAnchor` cell. [Detail](docs/gotchas.md#g29-bi-weekly-anchor-read)
- **Future punches are rejected by `recordPunch`.** Fires when you add a punch writer. [Detail](docs/gotchas.md#g30-future-punches-are-rejected-by-recordpunch)
- **Min-interval debounce on live punches only.** Fires when you wonder why an adjustment lands 2s after a punch. [Detail](docs/gotchas.md#g31-min-interval-debounce-on-live-punches-only)
- **Self-undo is narrow on purpose.** Fires when you widen what a rep may delete themselves. [Detail](docs/gotchas.md#g32-self-undo-is-narrow-on-purpose)
- **The Coverage planner counted a rep on lunch as PRESENT until 2026-09-03 — a schedule consumer that reads `breaks` must SUBTRACT them, and a DRAFT preview must go through the ONE resolver.** Fires when a schedule consumer reads `sched.breaks`, or previews an unsaved draft. Verify: BCV-1. [Detail](docs/gotchas.md#g59-the-coverage-planner-counted-a-rep-on)
- **`LEAVE_DEDUCTION_CLIENT` mirrors the server's `getLeaveDeduction_` exactly.** Fires when you add a leave type. [Detail](docs/gotchas.md#g103-leave-deduction-client-mirrors-the-server-s)

### Email, audit rows & digests

What leaves the building, who it looks like it is from, and what the shared log may carry.

- **Fire-and-forget email.** Fires when you add a rep-initiated send, or put mail inside a lock. [Detail](docs/gotchas.md#g34-fire-and-forget-email)
- **`CN_EMAIL_PALETTE` is hand-resolved from design tokens.** Fires when a palette value moves, or you add colour to an email. [Detail](docs/gotchas.md#g75-cn-email-palette-is-hand-resolved-from)
- **EOD digest runs hourly and matches each rep's local EOD hour.** Fires when you change the EOD hour or its trigger. [Detail](docs/gotchas.md#g79-eod-digest-runs-hourly-and-matches-each)
- **Personal-sheet sync failures log to the audit trail.** Fires when a rep’s personal Sheet drifts from the ADP source of truth. [Detail](docs/gotchas.md#g89-personal-sheet-sync-failures-log-to-the)
- **Training questions email managers immediately.** Fires when a note is flagged `training` with a question. [Detail](docs/gotchas.md#g92-training-questions-email-managers-immediately)

### CDR / Metrics contract

A foreign spreadsheet owned by another repo. Its shape is a constraint, not a choice.

- **CDR duration columns MUST use `getDisplayValues()`.** Fires when you read any CDR duration column (TTT col I, ATT col J). [Detail](docs/gotchas.md#g00-cdr-duration-columns-must-use-getdisplayvalues)
- **DQE has ONE row per (agent, date) — per-queue rep metrics do not exist (cycle-14 Phase 0).** Fires when you try to break a rep metric down by queue, or read `CDR.QUEUE_EXT`. [Detail](docs/gotchas.md#g01-dqe-has-one-row-per-agent-date)
- **Metrics enters call `stopClock` to avoid an interval leak.** Fires when you add a view enter that leaves the Clock view. [Detail](docs/gotchas.md#g106-metrics-enters-call-stopclock-to-avoid-an)

### Intake contracts

A clinical recommendation engine reads these values. Changing one changes what is recommended.

- **Intake Offerings catalog is read `A2:F` in a FIXED column order.** Fires when you reorder an Offerings column, or retire a catalog row. [Detail](docs/gotchas.md#g40-intake-offerings-catalog-is-read-a2-f)
- **Intake PPD controls are engine-safe via CANONICAL-ENGLISH VALUES, not free-text (redesign Phase 2).** Fires when you change a PPD control value, or renumber a question. [Detail](docs/gotchas.md#g42-intake-ppd-controls-are-engine-safe-via)
- **The intake payload's LABELS are always the English bank — the email is English whatever language the form was completed in (operator 2026-09-04, FIRED LIVE: a testing agent sent a PPD to the Power dept with Spanish labels).** Fires when you touch either intake collector, or the ES bank. Verify: INTK-EN + INTK-EN-DOM. [Detail](docs/gotchas.md#g43-the-intake-payload-s-labels-are-always)
- **Intake PMD/PAP layout is duplicated client↔server — keep them equal.** Fires when you add or remove a PMD/PAP question. [Detail](docs/gotchas.md#g45-intake-pmd-pap-layout-is-duplicated-client)
- **Intake account Yes/No toggles read/write through `.intk-yn` groups (deferred #10).** Fires when you add an account Yes/No field. [Detail](docs/gotchas.md#g46-intake-account-yes-no-toggles-read-write)

### Call Notes contracts

The hot path: the form, the cards, the composer, the per-rep store.

- **Call Notes Sheet enrollment — one-click auto-provision (or manual).** Fires when a rep has no Call Notes panel, or you read roster column L. [Detail](docs/gotchas.md#g47-call-notes-sheet-enrollment-one-click-auto)
- **`Notes` tab provisions on first touch.** Fires when you change `CN_HEADERS`. [Detail](docs/gotchas.md#g74-notes-tab-provisions-on-first-touch)
- **Clipboard API often fails in HtmlService iframes.** Fires when you rely on the clipboard inside the HtmlService iframe. [Detail](docs/gotchas.md#g76-clipboard-api-often-fails-in-htmlservice-iframes)
- **Call-notes flag enum vs. blank.** Fires when you write to `FlagType` or `Resolved`. [Detail](docs/gotchas.md#g78-call-notes-flag-enum-vs-blank)
- **`SubformData` (column P) is a generic per-note metadata JSON blob.** Fires when you add per-note metadata, or append to a `subformData` array. [Detail](docs/gotchas.md#g80-subformdata-column-p-is-a-generic-per)
- **`cnRenderSubforms_` is shape-keyed via `host.dataset.shapeKey`.** Fires when a subform re-render could wipe in-progress values. [Detail](docs/gotchas.md#g82-cnrendersubforms-is-shape-keyed-via-host-dataset)
- **`cnToggleComposerDept_` updates the modal in place, no full re-render.** Fires when you add dept-dependent UI to the composer. [Detail](docs/gotchas.md#g83-cntogglecomposerdept-updates-the-modal-in-place-no)
- **Optimistic UI for submit / flag / resolve on Call Notes.** Fires when you add an optimistic action to a note card. [Detail](docs/gotchas.md#g84-optimistic-ui-for-submit-flag-resolve-on)
- **Form-completion timer is persisted to localStorage.** Fires when you add a form-clearing path. [Detail](docs/gotchas.md#g85-form-completion-timer-is-persisted-to-localstorage)
- **Sticky form draft is auto-saved on every input.** Fires when you add a form-clearing path (the draft is separate from the timer). [Detail](docs/gotchas.md#g86-sticky-form-draft-is-auto-saved-on)
- **CN card buttons use `data-cn-action` delegation, not inline onclick.** Fires when you add a card button or a keyboard handler to a CN view. [Detail](docs/gotchas.md#g91-cn-card-buttons-use-data-cn-action)
- **`setCallNoteFlag` accepts an optional `trainingQuestion`.** Fires when you flag an existing note as training from a card. [Detail](docs/gotchas.md#g93-setcallnoteflag-accepts-an-optional-trainingquestion)
- **`getMyCallNotesRange` caps at 90 days.** Fires when you widen a History range. [Detail](docs/gotchas.md#g94-getmycallnotesrange-caps-at-90-days)
- **Call-note delete window.** Fires when a rep asks why they cannot delete an older note. [Detail](docs/gotchas.md#g95-call-note-delete-window)
- **Call Notes ambient polling stops on tool switch.** Fires when you navigate between tools with a CN poller running. [Detail](docs/gotchas.md#g97-call-notes-ambient-polling-stops-on-tool)
- **The Log rolling stack live-refreshes (#3).** Fires when a note is logged in another window. [Detail](docs/gotchas.md#g98-the-log-rolling-stack-live-refreshes-3)
- **Call Notes form fields are contenteditable `.ce` divs, not input/textarea.** Fires when you read or write a CN form field, or add a document-level key handler. [Detail](docs/gotchas.md#g111-call-notes-form-fields-are-contenteditable-ce)

### Shell: overlays, navigation & client state

The iframe sandbox, the overlay lifecycle, and what persists per browser.

- **An `outerHTML` patch replaces ONE element, so that element must contain everything its renderer emits (operator 2026-08-31).** Fires when a renderer grows a new sibling and something patches it by id. Verify: the BIZ-3 wrapper-shape assertion. [Detail](docs/gotchas.md#g66-an-outerhtml-patch-replaces-one-element-so)
- **An ASYNC prefill must fill only the fields the user has not typed into, and a FAILED prefill must not leave a saveable blank form (operator 2026-09-03).** Fires when a modal prefills asynchronously. Verify: the Day Edit DOM test. [Detail](docs/gotchas.md#g68-an-async-prefill-must-fill-only-the)
- **`location.reload()` reloads the IFRAME, not the app — and that URL is session-bound (operator 2026-09-01).** Fires when client code navigates or reloads the app. Verify: BCN-3. [Detail](docs/gotchas.md#g69-location-reload-reloads-the-iframe-not-the)
- **A class-wide attribute write assumes every member of the class is yours (operator 2026-08-11).** Fires when a writer selects by a class that something else borrows for its looks. [Detail](docs/gotchas.md#g70-a-class-wide-attribute-write-assumes-every)
- **`showToast(msg, type)` normalizes the variant — pass either form.** Fires when you call `showToast`. [Detail](docs/gotchas.md#g77-showtoast-msg-type-normalizes-the-variant-pass)
- **Sidebar badge selectors use `data-tool`, not `data-view`.** Fires when a badge poller queries the sidebar. [Detail](docs/gotchas.md#g99-sidebar-badge-selectors-use-data-tool-not)
- **Modals close on Escape THROUGH their close hook — dynamic overlays must be created via `ensureOverlay`.** Fires when you create an overlay dynamically. [Detail](docs/gotchas.md#g100-modals-close-on-escape-through-their-close)
- **Apps Script's HtmlService iframe sandboxes `window.location.search`.** Fires when client code reads the URL or the app’s own address. Verify: a Node tripwire. [Detail](docs/gotchas.md#g107-apps-script-s-htmlservice-iframe-sandboxes-window)
- **`form_public.html`'s signature canvas must be resized when its section becomes visible.** Fires when a hidden section containing a canvas becomes visible. [Detail](docs/gotchas.md#g109-form-public-html-s-signature-canvas-must)
- **Eighteen client-side localStorage keys total.** Fires when you add a client-side persisted key. [Detail](docs/gotchas.md#g112-eighteen-client-side-localstorage-keys-total)

### CSS & layout

Nearly all of these were found by MEASUREMENT, not by reading. A squeezed layout and an overflowing one look identical in a screenshot.

- **`:root[data-compact]` is the POP-OUT, not a viewport breakpoint (A2, cycle-13; FOUR MORE instances found and fixed in cycle-16 F3).** Fires when you write a fixed multi-column grid with a `data-compact` override. Verify: the A2 tripwire. [Detail](docs/gotchas.md#g50-root-data-compact-is-the-pop-out)
- **`color-mix` for a SEMANTIC colour must interpolate `in oklab`, never `in oklch` (V-1, cycle-12 visual audit — FIXED).** Fires when you add or "correct" a `-deep` colour alias. [Detail](docs/gotchas.md#g56-color-mix-for-a-semantic-colour-must)
- **A `var(--x, fallback)` on a token the tokens partial DEFINES is banned (design handoff C4, PR 1 — 2026-09-02).** Fires when you write `var(--x, fallback)` on a defined token, or a canvas fallback. Verify: the P2 ribbon-token pin. [Detail](docs/gotchas.md#g57-a-var-x-fallback-on-a-token)
- **Text on a FIXED-palette surface must use a fixed colour, not a theme token (V-2, cycle-12 visual audit — FIXED).** Fires when text sits on a surface whose palette does not flip with the theme. [Detail](docs/gotchas.md#g58-text-on-a-fixed-palette-surface-must)
- **A `max-height` on a GRID CONTAINER does not constrain its row (V-9, cycle-12 visual audit).** Fires when you cap a grid that must also hug short content. [Detail](docs/gotchas.md#g60-a-max-height-on-a-grid-container)
- **The app has ONE primary-button vocabulary: `--accent` green (V-8, cycle-12).** Fires when you add a primary action. [Detail](docs/gotchas.md#g61-the-app-has-one-primary-button-vocabulary)
- **A state that can be ZERO must not be painted in a SURFACE colour (V-10, cycle-12).** Fires when a chart state can legitimately be zero. [Detail](docs/gotchas.md#g62-a-state-that-can-be-zero-must)
- **Two chip rows with the same shape must not do different things (V-12, cycle-12).** Fires when two chip rows share a shape but not a behaviour. [Detail](docs/gotchas.md#g63-two-chip-rows-with-the-same-shape)
- **The app prints through ONE `@media print` block, and its two non-obvious rules are load-bearing (cycle-18 batch 8).** Fires when you change what prints, or hide chrome from the printout. [Detail](docs/gotchas.md#g64-the-app-prints-through-one-media-print)
- **A pill tab strip must scroll inside itself, or it pushes the whole page sideways (operator 2026-08-11).** Fires when a pill strip can outgrow the viewport. [Detail](docs/gotchas.md#g71-a-pill-tab-strip-must-scroll-inside)
- **Two layout lessons that only MEASUREMENT found, both from one chip (operator testing note 10, 2026-09-10).** Fires when a nowrap pill sits in a `1fr` track, or you fight a shared descendant rule. [Detail](docs/gotchas.md#g72-two-layout-lessons-that-only-measurement-found)
- **The `hidden` attribute LOSES to any class rule that sets `display` (operator #2 batch, 2026-08-06 — MEASURED).** Fires when an element carries a display-setting class AND the `hidden` attribute. [Detail](docs/gotchas.md#g73-the-hidden-attribute-loses-to-any-class)

### Test & tooling hazards

Ways the suite can be green and wrong, and ways a tool can eat your work.

- **A declared-but-unread CONFIG key / enum member is a defect, not clutter (cycle-15 F1/F2).** Fires when you add a CONFIG key or an enum member. Verify: the F1 tripwire. [Detail](docs/gotchas.md#g04-a-declared-but-unread-config-key-enum)
- **Secrets via Script Properties, not CONFIG.** Fires when you add a secret, sheet id or recipient list. [Detail](docs/gotchas.md#g06-secrets-via-script-properties-not-config)
- **Script Properties are CAPPED — ~9KB per value, 500KB per store — and the advertised entry caps were never the binding constraint (Batch Q, 2026-09-11).** Fires when you write a JSON blob to a Script Property. [Detail](docs/gotchas.md#g07-script-properties-are-capped-9kb-per-value)
- **A test function defined TWICE silently wins, and the registration count stays right (Batch S, 2026-09-11).** Fires when you add a test to `Tests.js`. [Detail](docs/gotchas.md#g08-a-test-function-defined-twice-silently-wins)
- **A test fixture that writes DIRECTLY to a store behind a RESULT CACHE owes the production writer's invalidation (operator run, 2026-08-19).** Fires when you add a result cache, or a fixture writes straight to a cached store. Verify: an ordering assert. [Detail](docs/gotchas.md#g22-a-test-fixture-that-writes-directly-to)
- **`TEST_` prefix is the cleanup key.** Fires when you name a production employee id, or hand-offboard a TEST row. Verify: the re-onboard/re-offboard Node pin. [Detail](docs/gotchas.md#g24-test-prefix-is-the-cleanup-key)
- **A bite-check ends in `git checkout`, so never run one against a file with uncommitted edits (cycle-18 batch 5B).** Fires when you bite-check a pin. [Detail](docs/gotchas.md#g65-a-bite-check-ends-in-git-checkout)

<!-- GOTCHA-INDEX:END -->

## Key Design Decisions

**The decisions themselves live in [`docs/design-decisions.md`](docs/design-decisions.md)**
— moved out of this file by Batch D1. This is the index: one line
each, linking to the entry. Read the index to find the decision; read the entry
for the reasoning, which is usually the part that matters.

- [Multi-tool registry with tab sub-navigation](docs/design-decisions.md#multi-tool-registry-with-tab-sub-navigation)
- [Tool view partials live in their own subfolder](docs/design-decisions.md#tool-view-partials-live-in-their-own-subfolder)
- [One `CONFIG` object](docs/design-decisions.md#one-config-object)
- [Audit log is append-only](docs/design-decisions.md#audit-log-is-append-only)
- [Best-effort email notifications](docs/design-decisions.md#best-effort-email-notifications)
- [The editor suite is SHARDED into three registrars, and its expected count is DERIVED (Batch S, 2026-09-11)](docs/design-decisions.md#the-editor-suite-is-sharded-into-three-registrars-and-its-ex)
- [Smoke vs. integration tests](docs/design-decisions.md#smoke-vs-integration-tests)
- [PTO bucket state lives in the Employees sheet](docs/design-decisions.md#pto-bucket-state-lives-in-the-employees-sheet)
- [Per-employee PTO opt-out via `EMP.PTO_ENABLED` column](docs/design-decisions.md#per-employee-pto-opt-out-via-emp-pto-enabled-column)
- [Self-undo vs. Adjust split](docs/design-decisions.md#self-undo-vs-adjust-split)
- [Resuming a closed day CONVERTS the clock-out into a break — it never deletes it (B3, operator 2026-09-01)](docs/design-decisions.md#resuming-a-closed-day-converts-the-clock-out-into-a-break-it)
- [Punch-adjustment requests are a TimeOffRequests-style queue (#4a)](docs/design-decisions.md#punch-adjustment-requests-are-a-timeoffrequests-style-queue)
- [`normalizeTime_` as the universal read shim](docs/design-decisions.md#normalizetime-as-the-universal-read-shim)
- [Timezone display split](docs/design-decisions.md#timezone-display-split)
- [Secrets via Script Properties](docs/design-decisions.md#secrets-via-script-properties)
- [Web app runs as the deployer, open to ANYONE_ANONYMOUS](docs/design-decisions.md#web-app-runs-as-the-deployer-open-to-anyone-anonymous)
- [Design tokens are the single source of truth for color, typography, radii, shadows, and motion](docs/design-decisions.md#design-tokens-are-the-single-source-of-truth-for-color-typog)
- [Colour palettes are a SECOND attribute overlay, orthogonal to light/dark (operator 2026-08-12)](docs/design-decisions.md#colour-palettes-are-a-second-attribute-overlay-orthogonal-to)
- [Dark mode is an attribute overlay, not a separate stylesheet](docs/design-decisions.md#dark-mode-is-an-attribute-overlay-not-a-separate-stylesheet)
- [Chrome icons are SVG via `icon(name, size)` from `script_icons.html`, never emoji](docs/design-decisions.md#chrome-icons-are-svg-via-icon-name-size-from-script-icons-ht)
- [The two Stage-0 partials are the shared foundation for future tools in this repo](docs/design-decisions.md#the-two-stage-0-partials-are-the-shared-foundation-for-futur)
- [Compact mode is a shell-level attribute, not per-tool CSS](docs/design-decisions.md#compact-mode-is-a-shell-level-attribute-not-per-tool-css)
- [Pop-out uses a PER-TOOL named window target](docs/design-decisions.md#pop-out-uses-a-per-tool-named-window-target)
- [Per-rep call-notes Sheets are the storage substrate](docs/design-decisions.md#per-rep-call-notes-sheets-are-the-storage-substrate)
- [Team-member onboarding is an Admin flow (operator request 2026-08-07, pre-pilot)](docs/design-decisions.md#team-member-onboarding-is-an-admin-flow-operator-request-202)
- [Settings live behind ONE gear, in a flyout panel (operator 2026-08-13)](docs/design-decisions.md#settings-live-behind-one-gear-in-a-flyout-panel-operator-202)
- [View-as is an ADMIN-ONLY, SESSION-ONLY, CLIENT-ONLY preview (operator 2026-08-13)](docs/design-decisions.md#view-as-is-an-admin-only-session-only-client-only-preview-op)
- [The slow tabs paint last-good INSTANTLY and refresh behind the pill (operator 2026-08-13 — "My Stats / Team Metrics / Spanish Inbox take a while")](docs/design-decisions.md#the-slow-tabs-paint-last-good-instantly-and-refresh-behind-t)
- [Pre-pilot observability round (operator 2026-08-13 — "I want to know what is working, if any issues arise, and what parts of the web app are priorities")](docs/design-decisions.md#pre-pilot-observability-round-operator-2026-08-13-i-want-to)
- [Deploy-version beacon — open clients PROMPT to reload after a New-version deploy (operator 2026-08-27)](docs/design-decisions.md#deploy-version-beacon-open-clients-prompt-to-reload-after-a)
- [Reminders are a SHELL capability, not a Clock-view one (operator 2026-08-11)](docs/design-decisions.md#reminders-are-a-shell-capability-not-a-clock-view-one-operat)
- [Two-way Sheet entry via the reconcile pass (#8)](docs/design-decisions.md#two-way-sheet-entry-via-the-reconcile-pass-8)
- [Two-stage email is the safety mechanism](docs/design-decisions.md#two-stage-email-is-the-safety-mechanism)
- [Auto-copy format is a CONFIG template](docs/design-decisions.md#auto-copy-format-is-a-config-template)
- [Client-side persistence is localStorage-based](docs/design-decisions.md#client-side-persistence-is-localstorage-based)
- [Optimistic UI is the perceived-speed mechanism for the Call Notes hot path](docs/design-decisions.md#optimistic-ui-is-the-perceived-speed-mechanism-for-the-call)
- [Pay statement — own-data payroll self-check (operator 2026-08-17)](docs/design-decisions.md#pay-statement-own-data-payroll-self-check-operator-2026-08-1)
- [Time / PTO merge (Round 2 · 8b) → ONE page (operator 2026-08-18)](docs/design-decisions.md#time-pto-merge-round-2-8b-one-page-operator-2026-08-18)
- [Day Edit modal on Live Status cards](docs/design-decisions.md#day-edit-modal-on-live-status-cards)
- [Team punches calendar (Manage → Manage Time, operator 2026-08-31)](docs/design-decisions.md#team-punches-calendar-manage-manage-time-operator-2026-08-31)
- [Manage Time is a GROUPED scroll — Needs you, then Periodic collapsed (design handoff PR 3, 2026-09-02)](docs/design-decisions.md#manage-time-is-a-grouped-scroll-needs-you-then-periodic-coll)
- [Personal pin is per-rep, capped at 3, stored in `subformData`](docs/design-decisions.md#personal-pin-is-per-rep-capped-at-3-stored-in-subformdata)
- [Auto-tag rules (operator 2026-08-13)](docs/design-decisions.md#auto-tag-rules-operator-2026-08-13)
- [Intake recommendation feedback (operator 2026-08-13)](docs/design-decisions.md#intake-recommendation-feedback-operator-2026-08-13)
- [Manager Q&A reply on training-flagged notes](docs/design-decisions.md#manager-q-a-reply-on-training-flagged-notes)
- [Manager comments on ANY note, not just training (item 9)](docs/design-decisions.md#manager-comments-on-any-note-not-just-training-item-9)
- [Automated notification emails are branded (item 2)](docs/design-decisions.md#automated-notification-emails-are-branded-item-2)
- [Email body restored to the UMS legacy aesthetic](docs/design-decisions.md#email-body-restored-to-the-ums-legacy-aesthetic)
- [Intake emails share the app's email chrome (operator 2026-08-11)](docs/design-decisions.md#intake-emails-share-the-app-s-email-chrome-operator-2026-08)
- [Department emails and state tax rates are editable via the Admin tab](docs/design-decisions.md#department-emails-and-state-tax-rates-are-editable-via-the-a)
- [Runtime feature toggles via a registry + the Admin tab](docs/design-decisions.md#runtime-feature-toggles-via-a-registry-the-admin-tab)
- [Stale-flag badge on the manager CN landing](docs/design-decisions.md#stale-flag-badge-on-the-manager-cn-landing)
- [Client-side undo window handles midnight wrap](docs/design-decisions.md#client-side-undo-window-handles-midnight-wrap)
- [Bulk approve/deny fires parallel RPCs](docs/design-decisions.md#bulk-approve-deny-fires-parallel-rpcs)
- [Dashboard analytics are computed from existing data](docs/design-decisions.md#dashboard-analytics-are-computed-from-existing-data)
- [PTO balance reconciliation (drift detection)](docs/design-decisions.md#pto-balance-reconciliation-drift-detection)
- [CN card actions use a primary/secondary split](docs/design-decisions.md#cn-card-actions-use-a-primary-secondary-split)
- [Card-level urgent toggle lives in the More menu](docs/design-decisions.md#card-level-urgent-toggle-lives-in-the-more-menu)
- [Email subforms are color-coded by type](docs/design-decisions.md#email-subforms-are-color-coded-by-type)
- [Email composer modal is draggable + resizable](docs/design-decisions.md#email-composer-modal-is-draggable-resizable)
- [Keyboard shortcuts accelerate the Call Notes hot path](docs/design-decisions.md#keyboard-shortcuts-accelerate-the-call-notes-hot-path)
- [Training Q&A tray surfaces manager answers on the Log view](docs/design-decisions.md#training-q-a-tray-surfaces-manager-answers-on-the-log-view)
- [History view supports date ranges](docs/design-decisions.md#history-view-supports-date-ranges)
- [Manager cross-rep search in Team Notes](docs/design-decisions.md#manager-cross-rep-search-in-team-notes)
- [Stats drill-down links to Per-Rep View](docs/design-decisions.md#stats-drill-down-links-to-per-rep-view)
- [Email department display on note cards](docs/design-decisions.md#email-department-display-on-note-cards)
- [External email for customers and providers](docs/design-decisions.md#external-email-for-customers-and-providers)
- [Interactive fillable web forms via token-gated public route](docs/design-decisions.md#interactive-fillable-web-forms-via-token-gated-public-route)
- [In-app form-submission viewer](docs/design-decisions.md#in-app-form-submission-viewer)
- [Sent Forms tab (rep-facing, read-only)](docs/design-decisions.md#sent-forms-tab-rep-facing-read-only)
- [Intake Sent tab (rep-facing, read-only) — same model for intake submissions](docs/design-decisions.md#intake-sent-tab-rep-facing-read-only-same-model-for-intake-s)
- [Form-submission notification renders the completed form](docs/design-decisions.md#form-submission-notification-renders-the-completed-form)
- [Cross-rep manager aggregates are cached](docs/design-decisions.md#cross-rep-manager-aggregates-are-cached)
- [Paired-timezone chip + signal chip vocabulary](docs/design-decisions.md#paired-timezone-chip-signal-chip-vocabulary)
- [Time Clock → Dashboard (the Clock tab is a two-column Dashboard)](docs/design-decisions.md#time-clock-dashboard-the-clock-tab-is-a-two-column-dashboard)
- [Clock view: hero + shift-strip + ledger architecture](docs/design-decisions.md#clock-view-hero-shift-strip-ledger-architecture)
- [The DONE state NAMES the punch it was derived from (operator 2026-09-01)](docs/design-decisions.md#the-done-state-names-the-punch-it-was-derived-from-operator)
- [Day ribbon (Clock view)](docs/design-decisions.md#day-ribbon-clock-view)
- [Manager telemetry strip with sparklines](docs/design-decisions.md#manager-telemetry-strip-with-sparklines)
- [Live-status sparkline](docs/design-decisions.md#live-status-sparkline)
- [Metrics hero + rail layout](docs/design-decisions.md#metrics-hero-rail-layout)
- [Per-queue attribution exists ONLY for TRANSFERS (cycle-14 Phase 1)](docs/design-decisions.md#per-queue-attribution-exists-only-for-transfers-cycle-14-pha)
- [Note coverage + count have a single source of truth](docs/design-decisions.md#note-coverage-count-have-a-single-source-of-truth)
- [Cross-rep call-note reads are bounded too](docs/design-decisions.md#cross-rep-call-note-reads-are-bounded-too)
- [Manager day-edit date picker is bounded `[today-N, today]`](docs/design-decisions.md#manager-day-edit-date-picker-is-bounded-today-n-today)
- [The Call Notes pop-out's type is FLUID below its launch width (operator 2026-08-18)](docs/design-decisions.md#the-call-notes-pop-out-s-type-is-fluid-below-its-launch-widt)
- [Compact pop-out defaults to 480×800, then remembers (#4) — PER TOOL](docs/design-decisions.md#compact-pop-out-defaults-to-480-800-then-remembers-4-per-too)
- [Resizable sidebar with snap (Round 2 · 8a)](docs/design-decisions.md#resizable-sidebar-with-snap-round-2-8a)
- [Hover-triggered day modal (Round 2 · 8c)](docs/design-decisions.md#hover-triggered-day-modal-round-2-8c)
- [Rectangular PTO tile (Round 2 · 8d)](docs/design-decisions.md#rectangular-pto-tile-round-2-8d)
- [Coverage-strip nav hint (Round 2 · 8z)](docs/design-decisions.md#coverage-strip-nav-hint-round-2-8z)
- [Call Notes vertical layout + contenteditable (Round 2 · 8e)](docs/design-decisions.md#call-notes-vertical-layout-contenteditable-round-2-8e)
- [Manual-copy failover on `#cn-frame` (Round 2 deferred 8e; RESCOPED operator 2026-08-13)](docs/design-decisions.md#manual-copy-failover-on-cn-frame-round-2-deferred-8e-rescope)
- [Multi-select flag toolbar + free-text tags (Round 2 · 8e)](docs/design-decisions.md#multi-select-flag-toolbar-free-text-tags-round-2-8e)
- [Multi-turn Q&A thread on training notes (Round 2 · 8g)](docs/design-decisions.md#multi-turn-q-a-thread-on-training-notes-round-2-8g)
- [Admin tab augmented with KPIs + tag taxonomy (Round 2 · 8h; 2nd-pass consolidation; design handoff PR 2, 2026-09-02)](docs/design-decisions.md#admin-tab-augmented-with-kpis-tag-taxonomy-round-2-8h-2nd-pa)
- [External-email message template library (Admin tab)](docs/design-decisions.md#external-email-message-template-library-admin-tab)
- [Quick Links picker (Admin tab + external composer)](docs/design-decisions.md#quick-links-picker-admin-tab-external-composer)
- [Reference tool: native markdown articles + Drive embeds, one store](docs/design-decisions.md#reference-tool-native-markdown-articles-drive-embeds-one-sto)
- [KB Phase 2: per-item Doc→article converter, review-before-save](docs/design-decisions.md#kb-phase-2-per-item-doc-article-converter-review-before-save)
- [Interactive roster block (` ```roster `, operator 2026-08-11)](docs/design-decisions.md#interactive-roster-block-roster-operator-2026-08-11)
- [A fenced block is ATOMIC in search-chunk truncation (operator 2026-08-11)](docs/design-decisions.md#a-fenced-block-is-atomic-in-search-chunk-truncation-operator)
- [Decision / task-guide block (` ```decision `, operator 2026-08-11)](docs/design-decisions.md#decision-task-guide-block-decision-operator-2026-08-11)
- [Glossary block (` ```glossary `, operator 2026-08-11)](docs/design-decisions.md#glossary-block-glossary-operator-2026-08-11)
- [Warehouse map block (` ```map `, operator 2026-08-13 — Tier A, NO billing)](docs/design-decisions.md#warehouse-map-block-map-operator-2026-08-13-tier-a-no-billin)
- [Article images fall back to server-served data when Drive blocks the thumbnail (operator 2026-08-13)](docs/design-decisions.md#article-images-fall-back-to-server-served-data-when-drive-bl)
- [Apps Script's missing-SCOPE refusal is NOT an admin block, and a green `runAllTests()` does not vouch for Drive (operator 2026-09-09)](docs/design-decisions.md#apps-script-s-missing-scope-refusal-is-not-an-admin-block-an)
- [Sheet→article conversion (operator 2026-08-11)](docs/design-decisions.md#sheet-article-conversion-operator-2026-08-11)
- [KB Phase 2b — converter images export to Drive at SAVE time](docs/design-decisions.md#kb-phase-2b-converter-images-export-to-drive-at-save-time)
- [KB Phase 3 — paste-a-screenshot upload in the article editor](docs/design-decisions.md#kb-phase-3-paste-a-screenshot-upload-in-the-article-editor)
- [KB AI Phase A — facet-based guidance card in the Reference drawer](docs/design-decisions.md#kb-ai-phase-a-facet-based-guidance-card-in-the-reference-dra)
- [KB reference drawer — mid-call lookup as a shell capability](docs/design-decisions.md#kb-reference-drawer-mid-call-lookup-as-a-shell-capability)
- [KB usage feedback loop ("most referenced during calls")](docs/design-decisions.md#kb-usage-feedback-loop-most-referenced-during-calls)
- [Self-improving-KB loop — rep freshness signal + content-gap requests (INV-139)](docs/design-decisions.md#self-improving-kb-loop-rep-freshness-signal-content-gap-requ)
- [Win-back nudge on a "changing suppliers" close](docs/design-decisions.md#win-back-nudge-on-a-changing-suppliers-close)
- [Compliance audit panel (Admin tab)](docs/design-decisions.md#compliance-audit-panel-admin-tab)
- [Deploy-readiness checklist (Admin Overview headline)](docs/design-decisions.md#deploy-readiness-checklist-admin-overview-headline)
- [Patient/TRX timeline (rep-facing, read-only)](docs/design-decisions.md#patient-trx-timeline-rep-facing-read-only)
- [Storage Health leads with DRIVE, which no store row can see (operator 2026-09-09)](docs/design-decisions.md#storage-health-leads-with-drive-which-no-store-row-can-see-o)
- [Storage Health panel (Admin tab, #1)](docs/design-decisions.md#storage-health-panel-admin-tab-1)
- [Automation Health panel (Admin tab)](docs/design-decisions.md#automation-health-panel-admin-tab)
- ["Open Email" button (Round 2 · 8f)](docs/design-decisions.md#open-email-button-round-2-8f)
- [Email composer Internal/External tab merge](docs/design-decisions.md#email-composer-internal-external-tab-merge)
- [Tag taxonomy rename/merge/archive batch-edits across reps](docs/design-decisions.md#tag-taxonomy-rename-merge-archive-batch-edits-across-reps)
- [`uiConfirm` / `uiPrompt` replace native `window.confirm` / `window.prompt`](docs/design-decisions.md#uiconfirm-uiprompt-replace-native-window-confirm-window-prom)
- [Training rides ON the Reference/KB layer (T1)](docs/design-decisions.md#training-rides-on-the-reference-kb-layer-t1)
- [Operator feedback round (2026-06-12) — note-template ergonomics for the pinned pop-out workflow](docs/design-decisions.md#operator-feedback-round-2026-06-12-note-template-ergonomics)
- [Onboarding tour — hand-rolled coach-marks (`script_tour.html`)](docs/design-decisions.md#onboarding-tour-hand-rolled-coach-marks-script-tour-html)
- [The Script-Property budget badge has ONE home (`propBudgetHtml_` + `.prop-budget`, Batch Q)](docs/design-decisions.md#the-script-property-budget-badge-has-one-home-propbudgethtml)
- [Shared `mtRenderTable_` table component (`script_core.html`)](docs/design-decisions.md#shared-mtrendertable-table-component-script-core-html)
- [Shared date-range control `mtDateRange_` + percent band `mtPctTone_` (`script_core.html`, design handoff PR 1 — 2026-09-02)](docs/design-decisions.md#shared-date-range-control-mtdaterange-percent-band-mtpcttone)
- [Admin sheet viewer (Tier 2 — `getAdminSheetView`)](docs/design-decisions.md#admin-sheet-viewer-tier-2-getadminsheetview)
- [Icon library additions (`script_icons.html`)](docs/design-decisions.md#icon-library-additions-script-icons-html)
- [Punch-button motion (dashboard-feedback batch)](docs/design-decisions.md#punch-button-motion-dashboard-feedback-batch)
- [Unified loader + motion system (2nd-pass; `styles.html` + `script_core.html`)](docs/design-decisions.md#unified-loader-motion-system-2nd-pass-styles-html-script-cor)
- [Cross-view hints are PARKED on `window`, consumed-and-nulled on the target's enter, never persisted (design handoff C8 — named 2026-09-02)](docs/design-decisions.md#cross-view-hints-are-parked-on-window-consumed-and-nulled-on)
- [Tag-suggestion autocomplete on the Log view](docs/design-decisions.md#tag-suggestion-autocomplete-on-the-log-view)

## Operator State Checklist

### Spreadsheet / storage map (one-screen reference)

Eight distinct spreadsheets, split deliberately along PHI / payroll / HR /
PHI-free / external lines and by retention policy — **consolidation is NOT
advised** (the boundaries are the point); manage them as a set instead. The
manager **Call Notes → Admin → Storage Health** panel (`getStorageHealth`)
shows each store's configured / reachable / **tz-vs-CONFIG** status live — the
one-pane-of-glass for this table. Keep all eight in one Drive folder for sanity.

| Store | Script Property (fallback) | Tabs | Class | Retention | Resolver |
|-------|----------------------------|------|-------|-----------|----------|
| Time Clock / ADP | `ADP_SS_ID` (CONFIG placeholder) | Employees (roster), Timesheet, TimesheetArchive (cold tier, INV-153 — **read back by the ADP export**, F1), TimeOffRequests, AuditLog, PunchAdjustRequests, ClientErrors (INV-150), ViewUsage (feature-usage telemetry, 2026-08-13), SpanishManualResolved, SpanishClaims (advisory claim/assign, append-only PHI-free — pilot round 2) | Payroll + shared audit | kept (archive moves, never deletes) | `getAdpSS_` |
| CDR Report | `CDR_SS_ID` (CONFIG placeholder) | DQE Historical Data, CSR Transfer Historical Data, Agent Alias Overrides | External (read-only) | owned by `call-data-reporting` | `getCdrSS_` |
| Intake | `INTAKE_SS_ID` (CONFIG placeholder) | Offerings, PPD/PMD/PAPSubmissions | **PHI** | optional purge | `getIntakeSS_` |
| Forms | `FORMS_SS_ID` (**falls back to the ADP sheet**) | FormTokens, FormSubmissions, ScheduledCalls (scheduled-call reminders — labels may name a patient, so PHI-class; epoch-ms NUMBER cells; pilot round 2) | **PHI** | 90-day purge (if enabled; ScheduledCalls is NOT purged) | `getFormsSS_` |
| Knowledge Base + Training | `KB_SS_ID` (CONFIG placeholder) | KB, KbViews, KbFeedback, KbContentRequests, KbComments (per-article discussion — append-only + soft-delete moderation, pilot round 3), KbRevisions, TrainingAssignments, TrainingCompletions, Quizzes, QuizAttempts, InsurancePayors (OPERATOR-IMPORTED payor-acceptance table — read-only, the insurance lookup, 2026-08-25) | PHI-free by policy | kept | `getKbSS_` |
| Employee Docs (HR) | `HR_DOCS_SS_ID` (**no fallback**) | EmpDocs, DocSignatures, EmpDocTemplates, Coaching | HR — keep-forever | **never purged** (INV-122/INV-134) | `getHrDocsSS_` |
| QA (recordings) | `QA_SS_ID` (**no fallback**) | QaRecordings (Drive-folder index: status/assignee/agent/shared — Phase 2 added the trailing Agent column; Phase 3 the SharedMs release stamp, 0 = unshared; design handoff PR 5 added DurationSec + SkipReason, header self-heals), QaExemptions (PR 5 — the audit-period exemption ledger: EmpName/Period/GrantedBy/GrantedMs/Active, append-only, latest row per (name, period) wins; written only by the manager-gated `qaSetExemption`), QaComments (timestamped review comments — soft-delete, append-only), QaScorecards (structured review scores — append-only, latest per (recording, reviewer) wins) | QA/HR-adjacent (comments may name patients; reviews reference agents) | optional review-record purge (`QA_REVIEW_RETENTION_DAYS`, default 0 — QaComments + QaScorecards ONLY; the recordings index + Drive files are never touched) | `getQaSS_` |
| Call Notes (per-rep) | `Employees` col L (`CallNotesSheetId`) | Notes, NotesArchive (cold tier), Scratchpad (one plain-text-pinned cell — the server-backed personal scratchpad, pilot round 3; PHI-plausible free text, so it rides the per-rep PHI store; NOT touched by the archive/purge tiers) — one Sheet **per rep** | **PHI** | optional archive + optional purge (live + cold) | `getCallNotesSheet_` |

**Every store's timezone MUST equal `CONFIG.TIMEZONE`** (coerced date/time reads
drift otherwise — the S1.1 tripwire `config_adpSheetTzMatchesConfig` enforces it
for the ADP sheet; Storage Health surfaces it for all). **Recommended
consolidation (the only one):** set `FORMS_SS_ID` to the Intake spreadsheet so
form PHI isn't co-located with the ADP/payroll sheet (the back-compat fallback) —
since pilot round 2 this recommendation also covers the `ScheduledCalls` tab
(reminder labels plausibly name patients, so they belong on the PHI store too).
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


### Inventory — what exists, and where it is documented

One line per standing item. The detail is the entry of the same name below;
the dated round entries that used to sit here moved to
[`docs/operator-log.md`](docs/operator-log.md) (Batch D1).

- [Blue-green (a personal dev instance alongside the team's prod) — see `docs/deployment.md`](#operator-blue-green-a-personal-dev-instance-alongside-the-team-s-prod)
- [The Timesheet timezone REPAIR (operator 2026-09-02 — the PH roster flip done mid-shift)](#operator-the-timesheet-timezone-repair-operator-2026-09-02-the-ph-ros)
- [The QA module Phase 1 (operator 2026-08-27) needs THREE Script Properties and one Drive folder before it does anything](#operator-the-qa-module-phase-1-operator-2026-08-27-needs-three-script)
- [Set Script Property `ADP_SS_ID`](#operator-set-script-property-adp-ss-id)
- [Set Script Property `CDR_SS_ID`](#operator-set-script-property-cdr-ss-id)
- [Script Property `TEST_CDR_SS_ID`](#operator-script-property-test-cdr-ss-id)
- [Set Script Property `INTAKE_SS_ID`](#operator-set-script-property-intake-ss-id)
- [Intake recipient addresses are Script-Property-backed](#operator-intake-recipient-addresses-are-script-property-backed)
- [Script Property `TEST_INTAKE_SS_ID`](#operator-script-property-test-intake-ss-id)
- [Set Script Property `KB_SS_ID`](#operator-set-script-property-kb-ss-id)
- [Script Property `KB_IMAGES_FOLDER_ID`](#operator-script-property-kb-images-folder-id)
- [Script Property `KB_SEARCH_SYNONYMS`](#operator-script-property-kb-search-synonyms)
- [Quiz import from Google Forms requires the Google Forms OAuth scope](#operator-quiz-import-from-google-forms-requires-the-google-forms-oaut)
- [KB Phase 2 converter requires the Google Docs OAuth scope](#operator-kb-phase-2-converter-requires-the-google-docs-oauth-scope)
- [Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card (Phase A)](#operator-set-script-property-kb-ai-api-key-to-enable-the-kb-ai-guidan)
- [Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`](#operator-script-properties-kb-ai-daily-cap-kb-ai-model)
- [Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`](#operator-script-properties-kb-ai-generation-kb-ai-spend)
- [Script Property `KB_MAP_GEOCODE_CACHE`](#operator-script-property-kb-map-geocode-cache)
- [`CDR_ALERT_THRESHOLD`](#operator-cdr-alert-threshold)
- [Set Script Property `MANAGER_EMAILS`](#operator-set-script-property-manager-emails)
- [Script Property `ADMIN_EMAILS`](#operator-script-property-admin-emails)
- [Punctuality tracking (Manage module tab)](#operator-punctuality-tracking-manage-module-tab)
- [Coverage planner is business-hours/weekday scoped](#operator-coverage-planner-is-business-hours-weekday-scoped)
- [Spanish-inbox tracking (Gmail) needs 3 things](#operator-spanish-inbox-tracking-gmail-needs-3-things)
- [Elapsed time is BUSINESS hours, and ONE pure core computes it (operator 2026-08-31)](#operator-elapsed-time-is-business-hours-and-one-pure-core-computes-it)
- [Inter-department request tracking (`DeptRequests` / Part B)](#operator-inter-department-request-tracking-deptrequests-part-b)
- [External fillable-form links must be the canonical anonymous `/exec` URL](#operator-external-fillable-form-links-must-be-the-canonical-anonymous)
- [External anonymous web-app access is BLOCKED by Workspace admin policy on this domain — the `?form=<token>` fillable-form route is non-functional for external recipients](#operator-external-anonymous-web-app-access-is-blocked-by-workspace-ad)
- [`Employees` sheet column K = `PtoEnabled`](#operator-employees-sheet-column-k-ptoenabled)
- [Onboarding a NEW team member no longer needs a hand-edit of the Employees sheet (2026-08-07)](#operator-onboarding-a-new-team-member-no-longer-needs-a-hand-edit-of)
- [Daily automation triggers](#operator-daily-automation-triggers)
- [Call-notes retention is OFF by default](#operator-call-notes-retention-is-off-by-default)
- [Call-notes cold-archive is the SAFE retention tier (also OFF by default)](#operator-call-notes-cold-archive-is-the-safe-retention-tier-also-off)
- [Call-notes 3rd-tier cold-store purge (also OFF by default)](#operator-call-notes-3rd-tier-cold-store-purge-also-off-by-default)
- [Include-archive search](#operator-include-archive-search)
- [Admin "Retention" panel (Config sub-tab)](#operator-admin-retention-panel-config-sub-tab)
- [Form-data retention is OFF by default](#operator-form-data-retention-is-off-by-default)
- [Forms PHI store — set `FORMS_SS_ID` to segregate (forms-hardening)](#operator-forms-phi-store-set-forms-ss-id-to-segregate-forms-hardening)
- [`FORM_CONSENT_VERSION` in CONFIG](#operator-form-consent-version-in-config)
- [`MANAGER_TIMEZONE`](#operator-manager-timezone)
- [Timezone model — three distinct concepts, don't conflate them](#operator-timezone-model-three-distinct-concepts-don-t-conflate-them)
- [`CONFIG.COVERAGE_MIN_STAFF`](#operator-config-coverage-min-staff)
- [`CONFIG.KB.REVIEW_DUE_DAYS`](#operator-config-kb-review-due-days)
- [`CONFIG.SHIFT_SCHEDULE`](#operator-config-shift-schedule)
- [`Employees` sheet column L = `CallNotesSheetId`](#operator-employees-sheet-column-l-callnotessheetid)
- [`Employees` sheet column M = `ManagerEmail`](#operator-employees-sheet-column-m-manageremail)
- [`Employees` sheet column N = `Departments`](#operator-employees-sheet-column-n-departments)
- [`Employees` sheet column O = `Schedule`](#operator-employees-sheet-column-o-schedule)
- [Script Property `CDR_QUEUE_GROUPS`](#operator-script-property-cdr-queue-groups)
- [Script Property `DR_SLA_TARGETS`](#operator-script-property-dr-sla-targets)
- [Set Script Property `HR_DOCS_SS_ID`](#operator-set-script-property-hr-docs-ss-id)
- [`Employees` sheet column P = `PayRate`](#operator-employees-sheet-column-p-payrate)
- [`Employees` sheet column Q = `PtoAccrual`](#operator-employees-sheet-column-q-ptoaccrual)
- [`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)](#operator-config-pto-accrual-basis-hours-80-config-pto-hours-per-day-8)
- [`Employees` sheet column R = `AccruedThrough`](#operator-employees-sheet-column-r-accruedthrough)
- [`ROSTER_CACHE_KEY` = `'employee_roster_v11'`](#operator-roster-cache-key-employee-roster-v11)
- [Call-notes department list + state tax rates](#operator-call-notes-department-list-state-tax-rates)
- [Script Property `CN_ARCHIVED_TAGS`](#operator-script-property-cn-archived-tags)
- [Script Property `CN_EMAIL_TEMPLATES`](#operator-script-property-cn-email-templates)
- [Script Property `CN_EXTERNAL_LINKS`](#operator-script-property-cn-external-links)
- [Script Property `CN_FEATURE_FLAGS`](#operator-script-property-cn-feature-flags)
- [Script Property `AUTOMATION_DIGEST_LAST_RUNS`](#operator-script-property-automation-digest-last-runs)
- [Consolidated manager daily brief is OFF by default (INV-151)](#operator-consolidated-manager-daily-brief-is-off-by-default-inv-151)
- [`ClientErrors` sheet tab](#operator-clienterrors-sheet-tab)
- [`ViewUsage` sheet tab](#operator-viewusage-sheet-tab)
- [Script Property `WHATSNEW_KB_ID`](#operator-script-property-whatsnew-kb-id)
- [Script Property `MAIL_BCC_ALL`](#operator-script-property-mail-bcc-all)
- [Script Property `REP_SENDER_FROM`](#operator-script-property-rep-sender-from)
- [Timesheet cold-archive is OFF by default (INV-153)](#operator-timesheet-cold-archive-is-off-by-default-inv-153)
- [Call-notes EOD + weekly digest knobs](#operator-call-notes-eod-weekly-digest-knobs)
- [`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`](#operator-config-call-notes-voice-input-enabled)
- [`FormTokens` and `FormSubmissions` sheet tabs](#operator-formtokens-and-formsubmissions-sheet-tabs)
- [`PunchAdjustRequests` sheet tab (#4a)](#operator-punchadjustrequests-sheet-tab-4a)
- [Form catalog](#operator-form-catalog)

Documented ONLY in the operator log, because the round that introduced them is
the only place they are explained — all three are operator-settable, so they are
named here so the checklist is complete:

- `QA_AUDIT_TARGET_PER_PERIOD` — sampled calls per employee per QA audit period
  (CONFIG seed 3; Script Property overrides 1..50; unset is fine) —
  [design handoff PR 5](docs/operator-log.md)
- `QA_SCORECARD_CRITERIA` — the QA rubric; seeded in CONFIG, overridable by the
  same-named property, and edited in-app at Manage → Admin → Config → QA
  scorecard criteria — [the 2026-08-27 and 2026-09-04 rounds](docs/operator-log.md)
- `CN_AUTO_TAG_RULES` — auto-managed; written by Manage → Admin → Config →
  Auto-tag rules, seeded from `CONFIG.AUTO_TAG_RULES` —
  [the 2026-08-13 operator round](docs/operator-log.md)

<a id="operator-blue-green-a-personal-dev-instance-alongside-the-team-s-prod"></a>
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
<a id="operator-the-timesheet-timezone-repair-operator-2026-09-02-the-ph-ros"></a>
- **The Timesheet timezone REPAIR (operator 2026-09-02 — the PH roster flip
  done mid-shift).** Flipping a roster `Timezone` cell changes how EXISTING
  Timesheet rows are READ, not what they hold: every punch was stamped as the
  rep's local date + wall time at the moment it was recorded, so a CST shift
  worked under `Asia/Manila` sits in the sheet as ClockIn on date D at 21:30
  and ClockOut on D+1 at 06:00 — read as Chicago digits, BOTH halves are
  incomplete days (excluded from totals, pay statements, the team calendar and
  the accrual). `repairTimesheetTimezone(opts)` (editor-run, MANAGER_EMAILS
  gate, DRY-RUN BY DEFAULT) re-formats each stored instant in the new zone so
  a split shift collapses onto one date; `flippedAt` (the new-zone wall time
  the cell was changed) is REQUIRED so post-flip punches are never shifted
  twice; it reads through `TimesheetArchive`, writes only the DATE + TIME
  cells in place (COMMENTS' `ADJ-` marker survives), is bounded
  (`TZ_REPAIR_MAX_ROWS`), locked on apply, re-points the personal-sheet
  mirror best-effort, and writes one counts-only `TimesheetTzRepair` audit row
  per employee. **The dry run's collision lines are the review step:** a row
  landing on a (date, type) another row holds is a hand edit made after the
  flip or a double punch across the old midnight — the tool REPORTS it and the
  manager decides which punch is real. **APPLIED 2026-09-03** (Anne Garcia + Margie Ingay, Manila → Chicago,
  flippedAt 2026-09-02 15:00): 14 rows moved, one post-flip row correctly
  skipped, and the eight collision warnings were four SELF-colliding pairs —
  a real morning clock-in plus a spurious ~noon-CST clock-in on 08-28,
  08-31 (both agents) and 09-02, the midnight-PHT bug's fingerprint (the
  agent pressed the only button the split day offered, at what was Lunch Out
  time); those days also lack lunch pairs, and 08-27/08-28 lack clock-outs
  entirely. Fix path is Day Edit with the MORNING time (the sheet doctor
  would collapse to the LAST row, i.e. the noon one). The one-time constant
  + wrappers were deleted afterwards; the tool itself stays, called with an
  opts object.** RUN ORDER: dry run BEFORE hand-editing today's rows (a
  hand-corrected 08:30 would be read as Manila digits and moved to the wrong
  day); then apply; then fix any reported duplicates in Day Edit. Two knock-ons
  the repair does NOT do: the August accrual already ran against the split
  days (top up by hand from the pay statement's corrected hours vs the
  `PtoAccrualCredit` row's `hoursWorked=` — never backdate column R, credits
  are deltas), and any ADP export cut while the rows were split is short those
  shifts (re-export). Call-note `DateLocal` stamps are left alone (cosmetic).
  Pinned by TZR-1 (planner behavioural) + TZR-2 (gate / dry-run default /
  bounded / locked / in-place / audited / collisions reported). **The
  operator's first dry run (2026-09-03) died on a NULL sheet — the roster read
  said `CONFIG.EMPLOYEES_TAB` where the declared key is `EMPLOYEE_TAB`, and a
  misspelled CONFIG key reads as `undefined` rather than throwing, so
  `getSheetByName(undefined)` handed back null.** The F1 tripwire checks
  declared → read; nothing checked read → declared. `F1-inverse` now does
  (every `CONFIG.<KEY>` read across the web-app tree names a declared
  top-level key); its first run found exactly this one. **The Day Edit
  follow-ups are now an editor-run tool too (operator 2026-09-03 — "can those
  changes not be done via Apps Script function?"): `repairSplitDayPunches(opts)`.**
  The duplicate clock-ins are DETERMINISTIC — the later ClockIn on a date is
  always the midnight-PHT re-clock — so the tool keeps the EARLIEST, deletes
  the rest bottom-up, re-points the personal-sheet mirror at the kept time
  (the tz repair's last mirror write was the noon row), and writes ONE
  `PunchDelete` audit row per removed row naming the kept time. ClockIn ONLY:
  any other duplicate pair (or an unparseable time) is NAMED in the result and
  left alone (INV-187). The `adds` list is the second half — the lunch and
  clock-out punches the agents confirm for 08-27/08-28 and the four dates —
  each validated BEFORE the dry-run return (date inside the window, HH:mm, a
  real punch type, one roster target, not a duplicate group in the same run)
  and written through `writeAdjustPunchForEmployee_`, the manager-approval
  writer (ADJ- row + mirror + audit, caller as actor). Adds run BEFORE deletes
  inside the lock so the row indices from the ONE Timesheet read stay valid.
  Dry-run by default; MANAGER_EMAILS gate; live tab only. Editor use:
  `repairSplitDayPunches({ employees: ['Anne Garcia','Margie Ingay'], from: '2026-08-27', to: '2026-09-02' })`,
  read the log, then the same with `dryRun: false` and
  `adds: [{ employee: 'Anne Garcia', date: '2026-08-27', type: 'ClockOut', time: '17:00' }, …]`.
  **The editor's ▶ button passes NO arguments, so a bare call refuses (the
  operator hit exactly this on 2026-09-03)** — a one-time
  `SPLIT_REPAIR_2026_09_03` constant + `_dryRun/_apply` wrappers carried the
  opts for that run; the repair was applied, the missing punches were entered
  by hand in Day Edit, and all three were DELETED on 2026-09-04 (the tz-repair
  precedent). The tool itself stays, called with an opts object.
  Target resolution moved into the shared `tzRepairResolveTargets_` so the two
  tools cannot resolve a name differently. Pinned by TZR-3 (planner) + TZR-4
  (contract; the add guards asserted LIVE, not just worded — a `if (false)`
  beside the message passed the first draft).
<a id="operator-the-qa-module-phase-1-operator-2026-08-27-needs-three-script"></a>
- **The QA module Phase 1 (operator 2026-08-27) needs THREE Script Properties
  and one Drive folder before it does anything.** Setup: (1) create a FRESH
  dedicated spreadsheet and set **`QA_SS_ID`** to its id (never point it at an
  existing store — recordings and review comments plausibly reference agents
  AND patients, and there is deliberately NO fallback: unset = a friendly
  not-configured screen, nothing breaks); (2) create (or pick) the Drive
  folder recordings get dropped into, share it with the DEPLOYING account
  (edit not required — read is enough), and set **`QA_RECORDINGS_FOLDER_ID`**
  to its id; (3) set **`QA_MEMBERS`** to a comma-separated list of the QA
  rep(s)' emails — managers see the tool without a listing; an EMPTY list =
  managers only; since operator testing note 8 (2026-09-10) the list is edited
  IN-APP at Manage → Admin → Config → **QA reviewers** and the property is only
  the store. Agents saw nothing in v1; Phase 3 briefly gave every rep a
  read-only My Reviews tab, and the operator hid it again the next day —
  the QA tool is currently invisible to non-QA reps (the registry comment
  says how to re-open it). Workflow: drop
  audio files in the folder → QA → Recordings → **Sync from Drive** (manual,
  idempotent — re-running never duplicates; non-audio files are skipped and
  counted; a >500-file scan says it was capped and a second Sync continues).
  Playback streams through the app in chunks; a recording over ~40 MB is
  refused with an "Open in Drive" link instead (Drive streams it natively).
  Timestamped comments anchor to the playback position — click a timestamp or
  a timeline marker to jump there; authors (and managers) can remove them.
  The two QA tabs auto-provision on first touch; no triggers, no migrations,
  no new OAuth scopes (DriveApp is already authorized). **Post-deploy: run
  `runAllTests()`** — it adds the new `qa_gates_rejectNonMember`
  case — then drop one recording in the folder, Sync, play it, and leave a
  comment at a timestamp.
<a id="operator-set-script-property-adp-ss-id"></a>
- **Set Script Property `ADP_SS_ID`** to the real spreadsheet ID in
  Apps Script editor → Project Settings → Script Properties. Without
  it, `getAdpSS_()` falls back to the inert `'YOUR_ADP_SPREADSHEET_ID'`
  placeholder in CONFIG and fails on first sheet open.
<a id="operator-set-script-property-cdr-ss-id"></a>
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
<a id="operator-script-property-test-cdr-ss-id"></a>
- **Script Property `TEST_CDR_SS_ID`** (test-only, auto-managed). The
  CDR fixture spreadsheet `setupTestEnvironment` / `_setupTestCdrFixture_`
  creates (or reuses) for the Metrics integration tests. Created on
  first `runAllTests`; not used in production. Documented here so it's
  recognizable when inspecting Script Properties.
<a id="operator-set-script-property-intake-ss-id"></a>
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
  image/brochure shows. "Real URLs" means **`http(s)://`-schemed** — every sink
  (rec cards, sent email, Catalog tab) scheme-whitelists these columns via
  `intakeHttpOnly_`, so a schemeless `www.x.com` (or a `javascript:` value)
  silently renders no link anywhere; since the round-1 follow-ons (2026-08-24)
  `intakeCatalogIssues_` WARNS on such a non-blank cell in the Automation
  Health "Intake Offerings catalog" card, naming the row + the `https://` fix
  (a healthy catalog still reads zero issues, INV-186).
  **Column C (weight capacity) is now LOAD-BEARING in a
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
<a id="operator-intake-recipient-addresses-are-script-property-backed"></a>
- **Intake recipient addresses are Script-Property-backed.**
  `INTAKE_SALES_EMAIL` (PMD default), `INTAKE_SLEEP_EMAIL` (PAP default),
  `INTAKE_BCC_EMAIL` (BCC on every intake email), and
  `INTAKE_ALL_AGENTS_EMAIL` (PPD "All Agents") read Script Properties first,
  falling back to the placeholders in `CONFIG.INTAKE`. Agent recipients are
  resolved from the Employees roster (name→email at send via
  `intakeResolveRecipient_`), so agent addresses never reach the client and
  no domain is hardcoded. Set the four addresses once; no redeploy.
<a id="operator-script-property-test-intake-ss-id"></a>
- **Script Property `TEST_INTAKE_SS_ID`** (test-only, auto-managed). The
  Intake fixture spreadsheet `setupTestEnvironment` / `_setupTestIntakeFixture_`
  creates (or reuses) for the Intake endpoint integration tests — an
  `Offerings` tab with two catalog rows (K0823 captain + K0861 Group-3
  solid). `getIntakeSS_()` honors the `_TEST_OVERRIDE_INTAKE_SS_ID` global
  (set via `_withTestIntake_`, which also resets the per-execution
  `_intakeOfferingsCache`); the pure engine tests need no spreadsheet.
  Created on first `runAllTests`; not used in production. Documented here
  so it's recognizable when inspecting Script Properties.
<a id="operator-set-script-property-kb-ss-id"></a>
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
<a id="operator-script-property-kb-images-folder-id"></a>
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
  account may be prompted to re-authorize once. **THAT PROMPT IS NOT
  OPTIONAL, and on this deployment it has never been accepted: as of
  2026-09-09 the property is UNSET** — the folder has never been created, so
  every article image has been a placeholder and the 2026-08-13
  `kbGetImageData` fallback has been inert (it returns 'Not available.' with
  no folder id to scope against). The fix is not a code change: open the
  Apps Script editor as the DEPLOYING account, run any function, and accept
  the Drive permission — Apps Script prompts against the whole project's
  scope set, so any function will do, and a `clasp push` + New version never
  prompts. Three outcomes tell you which problem you have: the screen
  appears and you accept (it was only a missing re-consent); it appears with
  per-permission CHECKBOXES and Drive unticked (Google's granular consent —
  tick it); or Google refuses ("Access blocked", "your admin has
  restricted"), which is the one case that is genuinely a Workspace policy
  block, and you then have the exact scope name to give IT. Admin → System →
  Storage inventory reports which of these you are in (INV-197).
<a id="operator-script-property-kb-search-synonyms"></a>
- **Script Property `KB_SEARCH_SYNONYMS`** (auto-managed, #8). JSON array of
  ≥2-term lowercase synonym groups (e.g. `[["cpap","pap"],["pmd","power chair"]]`)
  that expand Reference search recall (`kbExpandSynonymTokens_`). Edited via the
  admin-only "Synonyms" modal in the Reference tree header (`kbSaveSearchConfig`,
  admin-gated, `AdminConfigChange` audit); created on first save, read by
  `getKbSearchSynonyms_` (sanitize-on-read → corrupt blob degrades to `[]`). No
  manual setup — unset = no expansion (today's behavior). Documented so it's
  recognizable when inspecting Script Properties.
<a id="operator-quiz-import-from-google-forms-requires-the-google-forms-oaut"></a>
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
<a id="operator-kb-phase-2-converter-requires-the-google-docs-oauth-scope"></a>
- **KB Phase 2 converter requires the Google Docs OAuth scope.**
  `kbConvertDriveDoc` is the project's first `DocumentApp` call, so the deploy
  that ships it adds the `documents` scope to the auto-detected scope set. The
  DEPLOYING account must re-authorize once (the editor prompts on the next run
  / deploy — accept the new scope) or every conversion fails with an auth
  error. The converter reads Docs with the deployer's access, the same trust
  boundary as embedding them.
<a id="operator-set-script-property-kb-ai-api-key-to-enable-the-kb-ai-guidan"></a>
- **Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card
  (Phase A).** An Anthropic API key (console.anthropic.com); without it,
  `kbGetFacetGuidance` silently returns `{none}` even with the `kbAiGuidance`
  feature flag on. The key is deliberately NOT settable or readable through
  any endpoint — editor-only, same posture as `ADP_SS_ID`. Also set a **hard
  spend cap in the Anthropic console** as the backstop behind the app's soft
  daily cap. Then flip the `kbAiGuidance` feature toggle (Admin tab; default
  OFF, danger confirm names the external vendor) — INV-119 documents the
  privacy boundary (whitelisted enum facets + own KB excerpts only).
<a id="operator-script-properties-kb-ai-daily-cap-kb-ai-model"></a>
- **Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`** (Admin-managed).
  Written by the Call Notes → Admin → "AI Guidance (Reference)" section
  (`saveKbAiSettings`, manager-gated). Defaults when unset: $3/day org-wide,
  `claude-haiku-4-5`. The model must be a `KB_AI_MODEL_PRICES` key (Code.js)
  so spend accounting always has real rates — adding a new model option means
  adding its $/MTok rates there and redeploying.
<a id="operator-script-properties-kb-ai-generation-kb-ai-spend"></a>
- **Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`** (auto-managed).
  The guidance-cache generation salt (bumped by every KB save/delete via
  `invalidateKbCache_`) and the `{date, usd, calls}` daily spend counter.
  No manual setup — documented so they're recognizable when inspecting
  Script Properties. Delete `KB_AI_SPEND` to reset today's budget; bump
  `KB_AI_GENERATION` to force-invalidate all cached guidance.
<a id="operator-script-property-kb-map-geocode-cache"></a>
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
<a id="operator-cdr-alert-threshold"></a>
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
<a id="operator-set-script-property-manager-emails"></a>
- **Set Script Property `MANAGER_EMAILS`** to a comma-separated list
  (e.g. `alice@umsupply.com,bob@umsupply.com`). `getManagerEmails_()`
  reads this before CONFIG; without it, no one passes the
  `isManager` check and manager features stay locked out.
<a id="operator-script-property-admin-emails"></a>
- **Script Property `ADMIN_EMAILS`** (optional) — comma-separated list of the
  above-manager **admin tier** (the Manage module's Admin tab). `getAdminEmails_()`
  reads it; **UNSET/empty falls back to `MANAGER_EMAILS`** so a fresh deploy never
  hides Admin from the deployer, and **SET narrows** Admin to exactly that list
  (admins are a SUBSET of managers — an admin always passes `isManager`). Drives
  `empState.isAdmin` → the `adminOnly` tab gate. **To restrict the Admin tab to
  just yourself, set `ADMIN_EMAILS=you@umsupply.com`** (otherwise every manager
  keeps Admin access). No redeploy needed to change it. This gates the Admin tab
  CLIENT-side AND the Admin-exclusive endpoints SERVER-side (`emp.isAdmin`,
  `'Admin access required.'` — INV-136 holds the machine-checked list). Because
  unset ⇒ admin == manager, a fresh deploy behaves exactly as before; setting it
  narrows both surfaces at once. Make sure YOUR email is in the list before
  setting it. **The test suite accommodates a SET list (operator 2026-09-11):**
  `setupTestEnvironment` appends its own manager fixture
  (`do-not-send-mgr@example.invalid`) to a real list for the run's duration and
  `cleanupTestData` strips every `@example.invalid` entry back out — the
  re-onboard/re-offboard symmetry the roster rows already have (INV-21), both
  sides reading the ONE predicate `_testAdminEmailsSplit_`. Before that, a
  narrowed list made every admin-tier call from the TEST manager read
  `Admin access required.` — ten failures, 302/312 on the 2026-09-11 post-push
  run, with no commit on any failing path — because the suite silently ASSUMED
  the property unset while this very entry invited setting it. A real address
  is never removed by the suite; you do NOT unset the property to run it.
<a id="operator-punctuality-tracking-manage-module-tab"></a>
- **Punctuality tracking (Manage module tab).** `getPunctualityReport(from,
  to)` (manager-gated, read-only, PHI-free) backs the managerOnly **Manage →
  Punctuality** tab (moved from Time Clock into the Manage module; tab key
  `punctuality` unchanged). Per rep over the range it compares the first `ClockIn`
  against the rep's scheduled start (`getShiftSchedule_(tz).startMin`, resolved in
  the rep's own tz) and flags a late start when it exceeds
  `CONFIG.PUNCTUALITY_GRACE_MIN` (default 5), plus a lunch-adherence pass;
  least-punctual reps sort first. CONFIG-only (`PUNCTUALITY_GRACE_MIN`; no Script
  Property) — redeploy to change. Reuses the per-tz shift (no per-rep schedule,
  the INV-127 limitation). **Design handoff PR 3 (2026-09-02) made it a
  DIAGNOSTIC surface rather than a ranked list, all ADDITIVE on the payload:**
  the range is capped at `CONFIG.PUNCT_MAX_RANGE_DAYS` (92 — the QTR preset
  fits; the endpoint was the one manager range read with no cap), the SAME
  Timesheet scan also buckets the PRIOR range of equal length (`prevFrom`/
  `prevTo`; per rep `prevDays`/`prevOnTime`/`prevOnTimePct`) so the summary
  strip shows a delta the manager did not have to compute, and each rep carries
  `worstDate`, four `weekly` buckets (oldest-first, clipped to the range —
  `punctWeeklyBuckets_`, pure) and a per-day `dayDetail` whose `state` comes
  from the pure `punctDayState_`: `ontime` / `late` / `off` (approved PTO from
  a best-effort TimeOffRequests read — `ptoUnavailable` when it fails, so a day
  off can only degrade to `nopunch`, never to `late`) / `holiday` /
  **`nopunch`** — the FIFTH state, which the handoff's four-state list lacked:
  a weekday with no ClockIn is DRAWN as an absence rather than left as a gap
  (INV-187 — a gap reads as "nothing to see"). Weekends are `null` and omitted.
  `days` stays the graded COUNT it always was, beside the new array. Client
  (`punctRender_`): a summary strip (team on-time % with the prior-range delta,
  late starts, worst rep + date), an **Outliers** panel that renders ONLY when
  `punctOutliers_` finds a rep under 75% on-time OR averaging more than 15
  minutes late (an empty panel would read as "no outliers" for the wrong reason
  — nothing renders instead), the shared `mtRenderTable_` with a real sort and
  an expandable per-rep detail row (the day strip with a summarising
  `aria-label`, the weekly trend chip from `punctTrend_` — Worsening / Flat /
  Improving at ±5 points across the first and last bucket — and a **Coach on
  this** button that parks `window.COACH_PREFILL` with a `what` narrative and
  `enterTool('develop', 'coaching')`, the C8 hint pattern; the composer's
  textarea prefills from it). The tri-tone band is `mtPctTone_(p, 90, 75)`.
  The handoff's Export button in the app-bar was NOT built (not in the plan's
  M1–M8) — a logged follow-on.
<a id="operator-coverage-planner-is-business-hours-weekday-scoped"></a>
- **Coverage planner is business-hours/weekday scoped.** `getCoveragePlan` now
  returns a per-day `closed` flag plus `businessStartHour` / `businessEndHour` /
  `weekdaysOnly`, driven by CONFIG `COVERAGE_BUSINESS_START_HOUR` (8) /
  `COVERAGE_BUSINESS_END_HOUR` (17) / `COVERAGE_WEEKDAYS_ONLY` (true). Understaffed
  flags fire only inside the business-hours window; weekends (when
  `weekdaysOnly`) render as closed rather than as understaffed. CONFIG-only —
  redeploy to change. Refines INV-127's flagging (the `< COVERAGE_MIN_STAFF`
  rule still applies, now only within business hours). **Since design handoff
  PR 3 (2026-09-02) the range control is the shared `mtDateRange_`** with
  FORWARD presets (This week / Next week / Next 2 weeks — a planner looks
  ahead, where Punctuality's presets look back), `COV_STATE` holding
  `from`/`to`/`customOpen`, the D5 midnight re-anchor of the DEFAULT range only,
  and the `Manage › Coverage` app-bar; the hand-rolled `cov-controls` row and
  `toneCol` are retired (INV-184).
<a id="operator-spanish-inbox-tracking-gmail-needs-3-things"></a>
- **Spanish-inbox tracking (Gmail) needs 3 things.** The Metrics → **Spanish
  Inbox** tab (`getSpanishInboxStats`, manager-gated, read-only, 5-min cached)
  scans the **deploying account's** Gmail for threads addressed to the group
  inbox and times first-inbound → first-reply-from-a-member — **in BUSINESS
  hours since 2026-08-31** (weekends, US holidays and after-hours excluded; the
  wall-clock figure rides alongside as the KPI sub-line and the per-card
  tooltip — see the business-hours Key Design Decision). To work:
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
  before returning a body slice) backs the per-card "Show full request" expand —
  since operator testing note 5 (2026-09-10) a real Expand ⇄ Collapse TOGGLE:
  the body is fetched ONCE and cached in `SPANISH_STATE.bodies[threadId]`,
  Collapse restores the snippet from the PAYLOAD with no RPC, and the open set
  (`SPANISH_STATE.expanded`) survives a list re-render, so a claim or a filter
  chip never closes a card someone is reading (scenario
  `spanish-expanded-light-wide`; DOM test A5).
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
  **Claim / manager-assign on pending requests (pilot round 2, 2026-08-24):**
  a pending card carries a claim pill ("you" for the caller's own claim; the
  claimant's name + tooltip otherwise) and Claim / Release / manager-only
  Assign controls. Claims are ADVISORY — no locking of the underlying thread:
  an append-only PHI-free `SpanishClaims` tab on the ADP sheet (threadId +
  internal emails + ms NUMBER cells — the SpanishManualResolved posture;
  never subject/body), folded latest-wins by the pure `spanishClaimsFold_`
  (a `release` row clears; `assignedBy` recorded when actor ≠ claimant).
  Rules: any member self-claims; assigning someone ELSE is manager-only and
  the assignee must be a configured member; a non-manager cannot claim over
  another's live claim (the steal guard); release is claimant-or-manager and
  idempotent. Both endpoints gate on `canSeeSpanishInbox_` (the INV-31
  seven-endpoint set), are Gmail-scope-guarded like resolve, locked, and
  audit `SpanishInboxClaim` (threadId + claimant only).
  `getSpanishInboxPending` attaches `claim` per item + ships `members`/`self`
  (additive — the Dashboard Spanish card ignores them). Two agents claiming
  in the same second both succeed in sequence (latest wins; the earlier
  claimant sees the pill change on the next refresh) — accepted by design.
  **Auto-assign (operator testing note 4, 2026-09-10):** a MANAGER-only
  "Auto-assign N unclaimed" button beside the filter strip hands every
  unclaimed pending request (voicemails included) to the least-loaded configured
  member through `autoAssignSpanishThreads` — see INV-31 (iii) for the gate
  (MANAGER, not `canSeeSpanishInbox_`), the pure picker and the in-lock
  re-derivation. The button is disabled WITH ITS REASON while the list loads,
  when no members are configured, or when everything is already claimed; a
  confirm names the count and the members before ONE RPC and ONE re-render
  (the cards' claim pills and the button's count move together). The scheduled
  trigger the operator said "might follow" SHIPPED 2026-09-11 —
  `autoAssignSpanishThreadsScheduled` (trigger #21, hourly, business-hours
  gated, behind the `spanishAutoAssign` toggle, default OFF) calls the same
  `spanishAutoAssignCore_` unchanged; see the trigger list.
  **A_Q_Spanish VOICEMAILS in the pending list (operator 2026-08-25):** 8x8
  notifies individual MEMBER inboxes (never spanishcalls@) with subject
  "New voicemail from <caller> via A_Q_Spanish" from `no-reply@8x8.com`, so
  the deploying account's copy of those notifications is the proxy — the
  in-app scan beats Gmail forwarding (threading + the real From survive).
  `getSpanishInboxPending` runs a SECOND Gmail search (`spanishVmQuery_` —
  the quoted subject filter, embedded quotes stripped) and folds matching
  threads in as `kind: 'voicemail'` cards (info-toned VM pill via
  `spanishVmPillHtml_`; caller parsed by `spanishVmCaller_`; deduped
  against already-seen ids + the manual-resolved map; each thread's FIRST
  message is re-checked through `spanishVmMatch_` — exact-address sender +
  ci subject substring, BOTH required). VMs are **manual-resolve-only**:
  the resolved fold lists them from the manual map ONLY with
  `resolveMinutes: null` — a reply to a notification email is not a
  response time, so no fake duration ever enters the stats (INV-187).
  Gated entirely on the pair `SPANISH_VM_SENDER` (CONFIG default
  `no-reply@8x8.com`) + `SPANISH_VM_SUBJECT_FILTER` (default
  `via A_Q_Spanish`) — Script Properties override without a redeploy, and
  blanking EITHER property disables the whole VM path (both halves
  required). `spanishThreadInScope_` (inbox-addressed OR VM shape) now
  guards ThreadBody/resolve/claim so a member can expand/resolve/claim a
  VM card like any request; `vmTruncated` folds into the existing
  `truncated` note.
<a id="operator-elapsed-time-is-business-hours-and-one-pure-core-computes-it"></a>
- **Elapsed time is BUSINESS hours, and ONE pure core computes it (operator
  2026-08-31).** The operator asked whether the Spanish-inbox median counted
  weekends; it did. A Friday-afternoon request answered at Monday's open read
  as a **3-day reply**, which made the headline number describe the CALENDAR
  rather than the team — and the same arithmetic drove the Dept-Request SLA
  bands, so a request could go "overdue" purely by sitting through a weekend.
  `businessMinutesBetween_(startMs, endMs, tz?)` subtracts nights, weekends and
  US holidays, defaulting to **`CONFIG.MANAGER_TIMEZONE`** — the app's
  operating anchor, NOT `CONFIG.TIMEZONE` (the storage frame). It reuses the
  window the Coverage planner already owns (`COVERAGE_BUSINESS_START_HOUR` /
  `_END_HOUR` / `COVERAGE_WEEKDAYS_ONLY`, via `businessHours_()`) and
  `getUsHolidays_`, so "what counts as a working hour" has ONE definition
  across coverage bands and response times. **This is tractable only because of
  the ALL-CST policy** — every agent shares one business calendar, so there is
  a single frame to subtract against rather than a per-rep timezone question.
  Four properties are load-bearing:
   - **The core is PURE and takes pre-converted points.** `bizMinutesLocal_`
     takes `{date:'yyyy-MM-dd', min}` pairs already expressed in the business
     tz plus a holiday set, and walks days UTC-anchored — no `Utilities`
     dependency, which is what makes it Node-testable off-platform. The thin
     `bizPointInTz_` wrapper is the only part that touches Apps Script.
   - **Per-day overlap handles every clamp uniformly.** A start before the
     window opens counts from the open; a start after it closes contributes
     nothing that day; a weekend or holiday contributes nothing at all. A span
     lying wholly outside business hours legitimately yields **0** — that is a
     real answer ("nothing was owed during it"), distinct from `null`.
   - **`null` means UNKNOWN and is never substituted (the F8 rule).** A
     reversed pair, a corrupt stamp, an absurd span (bounded by
     `BIZ_MAX_SPAN_DAYS`=400, so a decade-old open request cannot spin the
     per-day loop through the execution budget), or an inverted window all
     yield `null`; the Spanish sample DROPS such a pair rather than pushing a
     0, and the SLA digest skips the row rather than nagging.
   - **Every surface that reports an elapsed time routes through the ONE
     wrapper.** `deptRequestsOverdueOpen_` (the daily SLA digest) previously
     aged requests with raw wall clock while the tracker displayed business
     minutes — two readers of one store, disagreeing about whether a request
     is overdue. Both call the helper now, and a pin bans a raw age from
     returning to the digest.
  **Where it shows:** the Spanish KPI strip leads with the business figure and
  keeps the wall-clock number as its sub-line (`avgBusinessMinutes` /
  `medianBusinessMinutes` / `businessCount` / `businessHours` are ADDITIVE, so
  an older client renders exactly as before, and an older SERVER makes the
  client fall back to wall clock as the headline); the per-thread resolved card
  shows business minutes with the calendar gap in its `title`
  (`resolveWallMinutes`); Dept Requests' `elapsedMin` IS the business figure
  (so `deptStats` avg/median follow with no extra wiring) with `elapsedWallMin`
  beside it and `slaBusiness: true` telling the client to say so. Both surfaces
  render a one-line note naming what is excluded — **an unexplained drop from
  "3d" to "2h" reads as a bug**, which is why the note is not optional.
  **Since operator testing notes 2/3 (2026-09-10) a MANUAL Spanish resolve and an
  IN-APP Dept Requests resolve are EXCLUDED from the sample on both surfaces and
  NAMED beside the timed count** — the Spanish strip reads "· N timed · M marked
  manually, not timed" and the Dept Requests median sub-line names the excluded
  in-app resolves (only the receiver's EMAIL-LINK resolve measures the
  department). A resolve stamp records when someone pressed a button, not when
  the requester was answered, so a duration built from it would be a
  substitute (INV-187). See INV-31 (ii) and INV-138.
  A MEASURED detail worth keeping: the Dept-Requests note had to live INSIDE
  the `#dr-kpi` wrapper, because `drRepaintKpi_` replaces that element's
  `outerHTML` on an in-place resolve and a note rendered as a SIBLING would
  stack another copy per patch — so the id moved off the `.telemetry` grid onto
  a wrapper around both.
<a id="operator-inter-department-request-tracking-deptrequests-part-b"></a>
- **Inter-department request tracking (`DeptRequests` / Part B).** Tracking is
  **AUTOMATIC**: every department email an agent sends from Call Notes
  (`emailFromCallNote`) auto-logs a `DeptRequests` row (PHI-free until operator
  testing note 6, 2026-09-10 — see the Store note below) AND appends a
  **"✓ Mark this request resolved"** link (`drResolveCtaHtml_`) to the SENT email
  body — added AFTER the INV-41 preview-hash check, so the hash contract is
  untouched. The row carries the dept label + the update CATEGORY only
  (`selections.updateInfo`) + the source `noteId` (col `NOTE_ID`, a back-compat
  trailing add); note CONTENT never enters it — since operator note 6 (2026-09-10)
  the capped patient & TRX (`PatientTrx`, col 13) DOES, by operator decision (see
  the Store note below). The
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
  optional Script Property **`DEPT_REQUESTS_SS_ID`** (a dedicated sheet); falls
  back to the ADP sheet. **The store was PHI-free until 2026-09-10 (operator
  testing note 6):** the email BODY still never enters it and the row keeps its
  short `label`, but a trailing **`PatientTrx`** column (`DR.PATIENT_TRX:13`,
  `DR_HEADERS` 14 wide, header self-heals; capped `DR_PATIENT_TRX_MAX`=120)
  now carries the constructed subject's second half, so a Dept Requests card
  reads `<label> · <patient & TRX>` (the label alone on a legacy row) and a real
  Expand ⇄ Collapse button (`.sp-more.dr-expand`, `aria-expanded` +
  `aria-controls`; the `.dr-detail` panel is rendered FROM STATE —
  `DR_STATE.bodies` / `expanded`, the Spanish A5 shape — so an in-place resolve
  repaint keeps an open card open and a second Expand costs no RPC) opens the
  scoped `getDeptRequestDetail` read of the SENDER's own note (whitelist-built;
  `note: null` + a NAMED reason when it cannot be read — INV-138). The daily
  SLA digest (`deptRequestsOverdueOpen_`) and every `DeptRequest*` audit row
  stay LABEL-ONLY (pinned). A trailing **`ResolvedVia`** column (col 12,
  `email`/`app`, read only through `drResolvedVia_`) records HOW a request was
  resolved — only an email-link resolve is TIMED (INV-138, operator notes 2/3;
  scenario `deptreq-expanded-light-wide`). The
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
<a id="operator-external-fillable-form-links-must-be-the-canonical-anonymous"></a>
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
<a id="operator-external-anonymous-web-app-access-is-blocked-by-workspace-ad"></a>
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
<a id="operator-employees-sheet-column-k-ptoenabled"></a>
- **`Employees` sheet column K = `PtoEnabled`** — added in the
  current schema; existing sheets must have this column added
  (header row 1, leave blank for back-compat = enabled, write
  `FALSE` for contractors). `setupTestEnvironment()` auto-writes
  the header on test runs if missing, but production rows still
  need it set manually.
<a id="operator-onboarding-a-new-team-member-no-longer-needs-a-hand-edit-of"></a>
- **Onboarding a NEW team member no longer needs a hand-edit of the
  Employees sheet (2026-08-07):** Manage → Admin → Config → **Team Members**
  → Add team member (validated form; optionally provisions the Call Notes
  Sheet in the same action), then check the same panel's per-rep readiness
  chips (notes / manager / tz / CDR — the CDR chip names the exact Agent
  Alias Overrides row to add when the phone system spells the name
  differently). Offboarding is the panel's Offboard button (clears the login
  email, keeps the name + history — the documented roster convention). The
  manual sheet-edit path still works; the panel is the recommended one.
<a id="operator-daily-automation-triggers"></a>
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. **The
  installer wires SIXTEEN triggers for twenty-four handlers — a trigger per
  SLOT, never per job (operator 2026-09-11).** Apps Script allows at most
  `AUTOMATION_TRIGGER_QUOTA` = **20 installable triggers per user per
  script**; the follow-ons round had taken the installer to 21, and the
  operator's install threw `This script has too many triggers` on the LAST
  create — AFTER the dedupe loop had deleted every existing trigger — so
  the deployment sat with 20 of 21 and NO `creditMonthlyPtoAccruals` until
  the re-install. Same-slot jobs now run inside one of three DISPATCHERS
  driven by `TRIGGER_GROUPS` (the ONE source for the dispatcher bodies, the
  derived `RETIRED_TRIGGER_HANDLERS` dedupe list, the install email and the
  TQ pins): `runHourlyJobs` (hourly → `sendCallNotesEodDigest`,
  `autoAssignSpanishThreadsScheduled`), `runWeeklyDigests` (Friday
  manager-tz 8am → `sendCallNotesWeeklyDigests`, `sendCoachingRecapDigest`)
  and `runNightlyPurges` (daily manager-tz 2am → `purgeOldDiagnostics`,
  `purgeOldQaReviews`, `purgeExpiredFormData`, `purgeArchivedCallNotes` — the
  four DELETE-ONLY retention purges, bounded first, cross-rep walk last).
  `runTriggerGroup_` runs each job in its own try/catch (a throw is stamped
  under the JOB name into `AUTOMATION_LAST_ERRORS`, a clean run clears it,
  a typo'd name is stamped by name), and every grouped handler keeps its
  own `assertManagerCaller_` gate, audit rows and heartbeat, so Automation
  Health's per-job liveness is UNCHANGED. **Known limit: a group shares one
  six-minute execution** — all eight grouped jobs are cheap by default (the
  purges no-op while their windows are 0), but a purge enabled against a
  large backlog that runs long is killed WITH the jobs after it; their own
  liveness rows then read stale, which is the signal to re-order or split.
  The installer is FAIL-CLOSED now: it counts its own set plus any other
  trigger this account owns BEFORE the delete loop and refuses with
  nothing touched when the total would exceed the quota; a throw mid-
  creation rethrows naming the handlers NOT installed. **The TQ-1 pin holds
  the created count at ≤ 19 (quota minus one) — adding a trigger fails CI
  until the job is folded into a same-slot dispatcher.** Three handlers
  deliberately keep their OWN trigger for stated reasons: `sendManagerDailyBrief`
  (`managerBriefSuppressionActive_({checkTrigger:true})` looks for a live
  trigger on THAT name — folding it in would silently un-suppress the
  digests it replaces), and the 18:00 pair `archiveOldTimesheetRows` +
  `creditMonthlyPtoAccruals` (both hold the ONE project lock and either can
  run long on the night that matters; a shared execution would raise the
  duplicate-append hazard cycle-12 F3 exists to prevent); the two
  row-MOVING retention jobs (`archiveOldCallNotes` 3am, `purgeOldCallNotes`
  4am) keep theirs because their ORDER after the 2am purges is load-bearing
  (archive-first). The handlers, by trigger:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm — since cycle-8 M-1 the
      automated exports fire the morning AFTER the period completes: biweekly
      when `range.end === yesterday`, monthly on the 1st exporting the prior
      month. The old on-period-end gate ran mid-shift for both offshore teams
      and silently omitted the final day's afternoon punches; the export email
      now arrives ~a day later but complete. `isLastBusinessDayOfMonth_` was
      removed with the old gate)
    - `runHourlyJobs` (hourly — the dispatcher for the two hourly jobs below)
    - `sendCallNotesEodDigest` (call-notes, hourly INSIDE `runHourlyJobs` since 2026-09-11 — emails each rep at their local EOD hour)
    - `runWeeklyDigests` (Friday manager-tz 8am — the dispatcher for the two weekly digests)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am INSIDE `runWeeklyDigests` since 2026-09-11)
    - `sendCallNotesUrgentDigest` (call-notes, daily manager-tz 8am — recent urgent-flagged notes; sends nothing when none)
    - `runNightlyPurges` (daily manager-tz 2am — the dispatcher for the four delete-only retention purges, in this order: `purgeOldDiagnostics`, `purgeOldQaReviews`, `purgeExpiredFormData`, `purgeArchivedCallNotes`; every window defaults to 0, so installing it changes nothing)
    - `purgeArchivedCallNotes` (call-notes, daily manager-tz 2am INSIDE `runNightlyPurges` — 3rd tier: irreversibly deletes `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS`; the ONLY deleter of archived notes; read-only re tab existence; no-ops while archive retention is disabled)
    - `purgeExpiredFormData` (forms, daily manager-tz **2am INSIDE `runNightlyPurges`** since 2026-09-11 — was its own 3am trigger; the hour was never load-bearing — no-ops while retention is disabled)
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
    - `purgeOldQaReviews` (QA review-record retention, daily manager-tz 2am INSIDE `runNightlyPurges` since 2026-09-11 — irreversibly deletes `QaComments` + `QaScorecards` rows older than `QA_REVIEW_RETENTION_DAYS` (Script Property → `CONFIG.QA_REVIEW_RETENTION_DAYS`, default **0 = disabled**); the `QaRecordings` INDEX and the Drive audio files are NEVER touched — the operator manages recordings in Drive. A 0/garbage `CreatedMs` stamp is never deleted (fail-safe), the disabled/unconfigured early-returns precede the lock, and every enabled run writes a counts-only `QaReviewPurge` audit row (the job-liveness heartbeat; its `AUTOMATION_JOB_CHECKS` row is gated on window>0 AND `QA_SS_ID` set, INV-186). No-ops entirely while the window is 0 or the QA store is unset, so installing it is harmless. INV-196)
    - `sendCoachingRecapDigest` (coaching, **Friday** manager-tz 8am INSIDE `runWeeklyDigests` since 2026-09-11 — design handoff PR 4, operator decision 1: ONE branded recap per AGENT listing the non-critical coaching (minor / moderate / praise) logged for them in the trailing `CONFIG.COACHING_RECAP_DAYS` (7) — severity label, date, who logged it, acknowledged-or-not, any revisit date — with NO narrative and NO patient/TRX (the detail lives behind the login). Critical items are emailed immediately at create instead and never appear here. Heartbeat `coachingRecap` (stale > 192h, the `weekly` window) stamped on BOTH exits; the digest is agent-facing so it NEVER consults the `managerDailyBrief` flag (INV-151). Silent for an agent with nothing logged in the window. The cadence is one line away from a change — the `onWeekDay(FRIDAY)` call on `runWeeklyDigests`' trigger in `installAutomationTriggers`, which moves BOTH weekly digests)
    - `purgeOldDiagnostics` (diagnostics retention, daily manager-tz 2am — FIRST inside `runNightlyPurges` since 2026-09-11, being the bounded one — cycle-18 F11's follow-on, 2026-09-11: irreversibly deletes `ViewUsage` and `ClientErrors` rows whose column-A timestamp is older than `VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS` (Script Property → CONFIG, BOTH default **0 = disabled**; edited in Manage → Admin → Config → Retention under "Diagnostics tabs (PHI-free)"). A timestamp that cannot be parsed is NEVER deleted (fail-safe); rows go as CONTIGUOUS bottom-up `deleteRows` runs under a 2000-row per-run budget (the ONE project lock — INV-153/INV-159's starvation reasoning) with the spare-row guard against Sheets' "cannot delete all non-frozen rows" refusal; the counts-only `DiagnosticsPurge` audit row is the job-liveness heartbeat, and its `AUTOMATION_JOB_CHECKS` row is gated on a window being set (INV-186). A failed run stamps `AUTOMATION_LAST_ERRORS` and a clean one clears it. Both early-returns precede the lock, so installing it changes nothing)
    - `autoAssignSpanishThreadsScheduled` (Spanish Inbox, **hourly** INSIDE `runHourlyJobs` since 2026-09-11 — operator note 4's "a scheduled trigger might follow", shipped 2026-09-11 behind the `spanishAutoAssign` feature toggle, server scope, default **OFF**. It heartbeats `spanishAutoAssign` BEFORE the flag check (INV-151 — liveness observable while off), acts ONLY inside business hours through `businessMinutesBetween_` (a null window reads as NOT inside), runs the SAME `spanishAutoAssignCore_` as the manager button — one scope rule, one voicemail fold, one picker, one claim-row shape — with the installer's roster row as the actor and the SYSTEM placeholder as the fallback (the reconcile precedent), and stamps a refused run (no members configured, a Gmail read that threw) into `AUTOMATION_LAST_ERRORS`. PTO-blind like the button: a member on approved leave can be handed claims — a logged follow-on)
  The install + remove TARGETS arrays both list all sixteen (pinned equal to
  the `newTrigger` set), and BOTH delete loops also consult the derived
  `RETIRED_TRIGGER_HANDLERS`, so re-running install dedupes cleanly AND
  removes the eight standalone triggers an older install created (a missing
  entry would silently duplicate that trigger on the next install). Triggers do not survive an Apps Script project re-clone. After
  install, `installAutomationTriggers` emails `MANAGER_EMAILS` a
  reminder about the cross-account trigger-ownership pitfall: Apps
  Script's `ScriptApp.getProjectTriggers()` only returns triggers
  owned by the current user, so duplicates from a previous installer
  are invisible to a fresh run. If a different account ever
  installed these triggers before, have that account run
  `removeAutomationTriggers()` first.
<a id="operator-call-notes-retention-is-off-by-default"></a>
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
<a id="operator-call-notes-cold-archive-is-the-safe-retention-tier-also-off"></a>
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
<a id="operator-call-notes-3rd-tier-cold-store-purge-also-off-by-default"></a>
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
<a id="operator-include-archive-search"></a>
- **Include-archive search.** `searchMyCallNotes` and `managerSearchCallNotes`
  take an `includeArchive` flag (default off — back-compat: existing 4-arg
  callers like `getPatientTimeline` are unaffected); when true they ALSO scan the
  cold `NotesArchive` tab (read-only `getSheetByName`, never creates it) and tag
  hits `_archived`. The client renders a read-only **"Include archived"** checkbox
  on both the rep and manager Search bars (`CN_STATE.searchIncludeArchive` /
  `mgrSearchIncludeArchive`) and an "archived" pill on archived hits. The
  field-scope match logic (INV-45 phone/trx/caller/issue/all) is byte-identical —
  factored into a per-source closure and applied to the extra source.
<a id="operator-admin-retention-panel-config-sub-tab"></a>
- **Admin "Retention" panel (Config sub-tab).** Manager-gated editor for the
  three call-note windows (+ the two diagnostics windows since 2026-09-11 —
  `VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS`, rendered under
  "Diagnostics tabs (PHI-free)"; the client sends each key ONLY when its row
  rendered, so an older client can never reset a window to 0, and the server
  writes each only when present): `getRetentionConfig` (read-only — each window's resolved value +
  source (`Script Property` / `CONFIG` / `default`) + safety-ordering warnings via
  the pure, Node-pinned `retentionWarnings_(archive, purge, archivePurge)`) and
  `saveRetentionConfig` (writes the three Script Properties, whole-days
  validation, `AdminConfigChange` audit — INV-57 family). The client
  (`cnLoadRetentionPanel_`) surfaces current values + the recommended SAFE setup +
  inline warnings, and **danger-confirms** (uiConfirm) only when a manager
  ENABLES or RAISES one of the two irreversible purge windows. Takes effect on the
  next nightly run (re-run `installAutomationTriggers()` once if not yet done).
<a id="operator-form-data-retention-is-off-by-default"></a>
- **Form-data retention is OFF by default.** `purgeExpiredFormData`
  (daily manager-tz 2am, inside the `runNightlyPurges` dispatcher since
  2026-09-11) deletes `FormSubmissions` (responses + signatures) and
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
<a id="operator-forms-phi-store-set-forms-ss-id-to-segregate-forms-hardening"></a>
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
<a id="operator-form-consent-version-in-config"></a>
- **`FORM_CONSENT_VERSION` in CONFIG** stamps every form submission with the
  Privacy-Notice version the signer saw (server-authoritative — the client's
  reported version is ignored). **Bump it whenever the consent copy in
  `form_public.html` changes** so stored submissions prove which language was
  shown. Change requires a redeploy (CONFIG, no Script Property override).
<a id="operator-manager-timezone"></a>
- **`MANAGER_TIMEZONE`** in CONFIG drives manager-dashboard
  display tz; change requires a redeploy.
<a id="operator-timezone-model-three-distinct-concepts-don-t-conflate-them"></a>
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
  per-employee **`Timezone`** roster column is the rep's **SCHEDULE FRAME** —
  it drives their display / EOD-digest hour / shift + break interpretation /
  day-off gate, and **punches + `DateLocal` are stamped in it** (`recordPunch`
  → `empTz_`), all independent of the sheet tz. **ALL-CST POLICY (operator
  2026-08-28): every agent, regardless of physical location, operates on the
  CST work schedule** — PH agents work 8:30 AM–5 PM **CST**, India agents
  8:00 AM–5 PM **CST** — so this column should read `America/Chicago` on
  EVERY row. A physical-location value (`Asia/Manila`, `Asia/Kolkata`) makes
  the app interpret the schedule, breaks, "today", and the punch state
  machine in the wrong frame: an offshore CST shift straddles the rep-local
  midnight, so both halves of a day's punches read INCOMPLETE (excluded from
  timesheet totals, pay statements, and the hours-driven PTO accrual), the
  rolling note stack rolls over MID-SHIFT (the recurring "my note is
  missing from today"), and post-local-midnight punches see "no ClockIn
  today". Any pre-policy mention in this document of Manila-local shifts /
  rep-local frames describes the OLD configuration. The multi-tz MACHINERY
  (`empTz_`, `safeTimezone_`, per-tz conversion, the IST/PHT test fixtures)
  is deliberately KEPT — the policy is a data convention, not a code
  removal. **Operator consequence:** to fix a
  sheet-tz drift, set the spreadsheet(s) to `CONFIG.TIMEZONE` (`Asia/Kolkata`) —
  do NOT need to change `CONFIG.TIMEZONE` to CST (that's a coordinated migration
  of all seven sheets + a one-time reinterpretation of the bookkeeping columns,
  with no manager-display benefit since `MANAGER_TIMEZONE` already covers it);
  **the roster-column flip is INDEPENDENT of the sheet-tz axis** — verified
  2026-08-28: the sheet-tz machinery (`tzEquivalent_`/`adpSheetTz_`/
  `getSpreadsheetTimeZone`) never reads `EMP.TIMEZONE`, so setting every row
  to `America/Chicago` touches none of the coercion round-trips, the S1.1
  tripwire, or Storage Health. With every row on `America/Chicago` the whole
  roster shares one DST rule, so there is no cross-row DST skew.
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
  as-written stamps. The code half is `tzMismatchCheck_` (`script_core.html`)
  — **REDESIGNED for the ALL-CST policy (2026-08-28):** at boot the client
  compares the rep's PROFILE timezone (`empState.timezone`) against the
  server-shipped WORK ANCHOR (`empState.workAnchorTz` =
  `CONFIG.MANAGER_TIMEZONE`, additive on `getEmployeeState`) — by UTC
  OFFSET, never id, so `America/Chicago` vs `US/Central` must not warn — and
  shows a STICKY warn toast at most once per browser-local day
  (`umsTzWarnedDay`) naming both zones and where a manager fixes it. The
  original browser-vs-roster comparison is RETIRED: under the policy an
  offshore agent's browser offset legitimately differs from their (correct)
  CST profile every day, so the browser compare would nag exactly the people
  configured right; profile-vs-anchor instead catches the dangerous states
  for everyone — a blank cell falling back to Asia/Kolkata (this
  paragraph's original bug), and a pre-policy Manila/Kolkata row. Guards: an
  Intl sanity-probe of UTC gates the check so a broken browser can't nag, an
  unresolvable anchor or absent `workAnchorTz` (older server) disables it
  silently, and an unresolvable PROFILE id still warns (it will be stamped
  in the fallback tz — the dangerous state). Pinned by the rewritten
  `tzOffsetMinAt_` pin in run.js (anchor comparison + a ban on
  `getTimezoneOffset` returning to the function).
<a id="operator-config-coverage-min-staff"></a>
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
<a id="operator-config-kb-review-due-days"></a>
- **`CONFIG.KB.REVIEW_DUE_DAYS`** (default 90) sets the KB review-due
  staleness window (#4). CONFIG-only; change requires a redeploy. The KB
  sheet gained trailing `ReviewedAt`/`ReviewedBy` columns — the header
  **self-heals on the first post-deploy KB read/save** (no manual
  migration); legacy rows fall back to `UpdatedAt` until first reviewed.
<a id="operator-config-shift-schedule"></a>
- **`CONFIG.SHIFT_SCHEDULE`** sets the Clock-view ribbon/countdown
  shift: `DEFAULT` 8:00–17:00 CST; **`BY_TIMEZONE` ships EMPTY under the
  ALL-CST policy (2026-08-28)** — the old PH `Asia/Manila: 8:30–17:00`
  entry was removed because it was wrong twice over: it keyed on a roster
  value the policy retires, and its times were written as Manila-LOCAL
  when PH agents actually work 8:30–17:00 **CST**. PH agents' 8:30 start
  now rides Employees **column O** (`8:30-17:00`, interpreted in the rep's
  roster tz = `America/Chicago` under the policy); India agents are the
  8:00–17:00 `DEFAULT` and need no column O. The `BY_TIMEZONE` MECHANISM is
  kept (resolved per the rep's roster timezone by `getShiftSchedule_`) for
  a future genuine per-timezone exception. Change requires a redeploy
  (CONFIG, no Script
  Property override). **PER-REP exceptions need no redeploy (Turn D):** put
  `H:mm-H:mm` in Employees column O — `empShiftSchedule_` resolves
  override-over-tz for every consumer. **Breaks (item 1):** each shift entry may carry a
  `breaks: [{label, start:'HH:mm', len:<min>}]` array (a tz entry without
  its own `breaks` inherits `DEFAULT.breaks`), and `BREAK_REMINDER_MINUTES`
  sets the reminder lead time. **Since 2026-08-27 the CONFIG breaks are only
  the SEED: Manage → Admin → Config → "Break schedules"** (`saveBreakSchedules`,
  admin-gated INV-136; Script Property `SHIFT_BREAK_SCHEDULES`, auto-managed —
  reads ride `getAdminConfig.breakSchedules`) **edits breaks + the reminder
  lead with NO redeploy.** The property wins when it has an applicable entry
  (tz key, else its DEFAULT key; an EXPLICITLY EMPTY list = "no breaks for
  this key", deliberately distinct from absent = inherit), else the CONFIG
  chain applies unchanged; shift START/END stay CONFIG + column O — the
  editor deliberately edits breaks only. `getBreakSchedules_` sanitizes on
  read (L-12) + memoizes per execution (the coverage walks call
  `getShiftSchedule_` per-rep-per-day); saving zero custom schedules at the
  CONFIG reminder DELETES the property (the umsTheme posture). **PER-AGENT
  breaks (operator 2026-09-02):** the property also carries an optional
  `employees: { <rosterId>: [...] }` map — each agent has their OWN staggered
  slots so the desk is never empty, which a per-timezone list structurally
  cannot express. The ONE resolver `empShiftSchedule_(empLike, tz)` (INV-149)
  layers it ABOVE the tz/DEFAULT entry (`prop.employees[id] !== undefined` —
  an explicitly EMPTY list means "this agent has no breaks", exactly the
  explicit-empty rule the tz layer uses, and `[]` is truthy so the hazardous
  mutation is a `.length` guard, not bare truthiness — bite-checked); every
  caller passes the rep's `id` (`getEmployeeState`, `getCoveragePlan`,
  `getPunctualityReport`, the admin view — a caller that drops the id
  silently loses the layer, pinned). Column O still governs start/length
  only. The save refuses an id that is malformed or not on the roster BY
  NAME (a typo'd id would otherwise be a silent no-op forever); an
  OFFBOARDED id (email cleared, row kept — INV-183) still resolves, since the
  id is reserved. The blob carries `employees` only when non-empty, in the
  sanitizer's key order (read ≡ write byte-for-byte), and an employees-only
  save is NOT a reset. The Admin card's "Per-agent breaks" section (roster
  picker seeded from the DEFAULT section; "Remove (use default)" falls
  back) names the timezone each agent's times are READ in and warn-pills a
  profile that disagrees with the CST work anchor — the timezone class this
  app keeps meeting, surfaced where the times are typed. Pinned by
  BRK-1..5 (BRK-5 = the resolver behavioural). **The BREAK COVERAGE PLANNER
  (operator 2026-09-03) sits at the top of the same card:** `getBreakCoverage`
  (admin READ) resolves EVERY roster rep under the editor's unsaved draft
  (`withBreakSchedulesProp_` + `empShiftSchedule_` with the rep id, converted
  to the CST anchor on today's date via `convertDateTime_`), buckets them with
  the pure `breakCoverageSlots_` (15-min slots across the Coverage business
  window; a partial overlap counts as AWAY — over-reporting absence is the safe
  direction; `away[]` names who and which break), and — once per card open —
  attaches `getCdrInboundVolume_`: average inbound calls per weekday per slot
  from the CDR Report's `Inbound Calls` export (pure `inboundVolumeBuckets_`;
  display values; widening tail scan bounded + truncation reported; clean-round
  1h cache; every failure named as `unavailable`). The client (`cnBreakCovStripHtml_`)
  tones cells by the planner's `minStaff`/`goodStaff`, draws the volume as a
  background bar scaled to the window's max, opens a who-is-away line on click
  (real buttons, `aria-pressed`), and refreshes debounced + seq-guarded on every
  edit through `cnBreakCollectDraft_(true)` — the SAME collector Save uses
  strictly — keeping last-good with a warn line on a failed refresh (C17-5). It
  is a SCHEDULE view (every rep on shift, breaks subtracted); approved PTO stays
  on the Coverage planner, which now subtracts breaks too. Pinned by BCV-1..4;
  on camera in `admin-config-*` + `admin-config-covfail-light-wide`. `getShiftSchedule_` resolves the tz layer to
  `{breaks:[{label,startMin,lenMin}], breakReminderMin}` on `CLK_SCHEDULE`.
  The Clock view shows a "Next break" chip (`#clk-next-break`) and fires a
  one-time reminder toast `breakReminderMin` before each break — but ONLY
  while the Clock tab is open (Apps Script web apps have no background
  push); the reminded-set dedupes per break per day (and is cleared on day
  rollover so it can't grow unbounded in a long-lived pinned pop-out — F6).
<a id="operator-employees-sheet-column-l-callnotessheetid"></a>
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
<a id="operator-employees-sheet-column-m-manageremail"></a>
- **`Employees` sheet column M = `ManagerEmail`** — each employee's
  manager (an email from `MANAGER_EMAILS`). Drives the FAIL-CLOSED
  Employee Docs team scoping (INV-122): a manager sees a doc only if
  they issued it OR they are this column's value for that employee.
  Blank = only the issuer (and the employee) can see the doc — fill
  the column for every employee who will receive docs. Header row 1;
  no other module reads it yet.
<a id="operator-employees-sheet-column-n-departments"></a>
- **`Employees` sheet column N = `Departments`** (DeptRequests v2, INV-138) —
  a `;`/`,`-separated list of department names (matching the `DEPARTMENT_EMAILS`
  keys, case-insensitive) the rep STAFFS. Drives the Metrics → Dept Requests
  **Incoming inbox** (open requests addressed to a dept the rep staffs) + lets a
  dept member resolve in-app. Blank for most reps; fill it only for dept-desk
  staff. Unknown names are dropped (`drParseDepartments_`). `ROSTER_CACHE_KEY`
  was bumped to `employee_roster_v7` for this column — stale v6 cache entries
  expire within 5 min (or run `clearCaches_()`).
<a id="operator-employees-sheet-column-o-schedule"></a>
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
<a id="operator-script-property-cdr-queue-groups"></a>
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
<a id="operator-script-property-dr-sla-targets"></a>
- **Script Property `DR_SLA_TARGETS`** (optional, auto-managed) — JSON
  `{deptName: hours}` per-dept resolution-SLA overrides for DeptRequests, written
  by the Admin → Config **Dept-Request SLA targets** editor (`saveDeptRequestSla`,
  admin-gated, 1–720h, entries equal to the default are dropped). Unset/blank for
  a dept → the `CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS` default (**48h**). A
  request past its SLA shows "Overdue" on the tracker + rides the daily
  `sendDeptRequestReminderDigest` manager summary. No manual setup needed.
<a id="operator-set-script-property-hr-docs-ss-id"></a>
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
<a id="operator-employees-sheet-column-p-payrate"></a>
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
<a id="operator-employees-sheet-column-q-ptoaccrual"></a>
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
  **STANDING PRE-FLIGHT before any month's credit (operator 2026-08-31):
  open an accruing rep's PAY STATEMENT for that month and look at the day
  rows.** The accrual reads each day through the SAME `calcHours_` as the
  statement (`workedHoursByEmpForRange_` — a date with a ClockIn but no
  ClockOut contributes ZERO hours, never a partial, INV-176), so whatever
  the statement calls INCOMPLETE contributes nothing to the credit. That
  makes the statement an EXACT preview of what the credit will see, and it
  is a better check than reasoning about timezones because it needs no
  inference — it renders the same numbers the trigger will read. The class
  it catches: an offshore rep whose roster tz is not the CST work anchor
  splits every shift across two rep-local dates, so BOTH halves read
  incomplete and the month credits ≈0 (see the timezone-model entry). Check
  BEFORE the 1st; afterwards the credit is a delta you top up by hand from
  the audit row's `hoursWorked=`.
<a id="operator-config-pto-accrual-basis-hours-80-config-pto-hours-per-day-8"></a>
- **`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)**
  (operator 2026-08-19) — the two halves of the accrual unit conversion:
  column Q's rate is *per basis hours worked*, and the earned PTO hours are
  divided by hours-per-day to reach the DAYS column I stores. Both are
  CONFIG-only (no Script Property), so changing either is a redeploy — and
  changing the basis silently re-scales every column-Q rate, so change the
  cells in the same pass. `PTO_ACCRUAL_CATCHUP_MAX_MONTHS` (12) bounds a
  cold-start catch-up.
<a id="operator-employees-sheet-column-r-accruedthrough"></a>
- **`Employees` sheet column R = `AccruedThrough`** (operator 2026-08-18) —
  AUTO-MANAGED `yyyy-MM` stamp: the last month whose accrual has been
  credited. Written only by `creditMonthlyPtoAccruals`; leave it alone.
  Blank = seeds on the next run (stamps last month, credits nothing).
  Hand-edit ONLY to deliberately re-credit or skip months. **A FORWARD stamp
  (ahead of last month) is honored as a deliberate skip and left alone
  — fixed 2026-08-31; before that fix `accrualMonthsToCredit_` returned
  `newStamp: <last month>` on that branch and the caller's write rewound the
  cell, so a same-day run undid the skip and the next month credited exactly
  what the operator had said to skip.** Write it zero-padded (`2026-09`, not
  `2026-9`) — `accrualStampYm_` matches `^\d{4}-\d{2}` and anything else
  reads as blank, which SEEDS (fail-safe: credits nothing) rather than
  skipping. Backdating it
  credits the intervening months on the next run, each from the hours that
  month's Timesheet rows actually record (the index reads through
  `TimesheetArchive`, so an old month is not silently worth zero; capped at
  `PTO_ACCRUAL_CATCHUP_MAX_MONTHS`=12, with any capped overflow NAMED in
  the audit row rather than silently absorbed). Sheets may coerce the cell
  to a Date — every read routes through `accrualStampYm_` (the
  `normalizeDate_` class). `ROSTER_CACHE_KEY` bumped to v11.
<a id="operator-roster-cache-key-employee-roster-v11"></a>
- **`ROSTER_CACHE_KEY` = `'employee_roster_v11'`** — bumped for the
  `AccruedThrough` column (R, automated accrual credits, 2026-08-18);
  previously v10 for `PtoAccrual` (Q, same day), v9 for
  `PayRate` (P, pay statement, 2026-08-17), v8 for the `Schedule`
  column (O, Turn D per-rep shift override), v7 for Departments/DeptRequests
  v2, v6 for `ManagerEmail`/T3, v5 for CallNotesSheetId. After deploying,
  stale v10 cache entries expire naturally within 5 min (or run
  `clearCaches_()` from the editor).
<a id="operator-call-notes-department-list-state-tax-rates"></a>
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
<a id="operator-script-property-cn-archived-tags"></a>
- **Script Property `CN_ARCHIVED_TAGS`** (auto-managed). JSON array
  of lowercase tag strings marked as archived via the Call Notes →
  Admin tab's tag actions. Created on first archive, deleted when
  the last tag is unarchived. No manual setup needed — documented
  here so it's visible when inspecting Script Properties. Read by
  `getArchivedTagsSet_()`; written by `setArchivedTagsSet_()` from
  `archiveCallNoteTag`. Archive does NOT modify any notes; tags
  remain on every existing note's `subformData.tags[]`.
<a id="operator-script-property-cn-email-templates"></a>
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
<a id="operator-script-property-cn-external-links"></a>
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
<a id="operator-script-property-cn-feature-flags"></a>
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
<a id="operator-script-property-automation-digest-last-runs"></a>
- **Script Property `AUTOMATION_DIGEST_LAST_RUNS`** (auto-managed). JSON
  object `{ eod|urgent|weekly|trainingOverdue|deptReqReminder|managerBrief|selfTest|coachingRecap|spanishAutoAssign:
  "yyyy-MM-dd HH:mm:ss" }` (CONFIG.TIMEZONE
  wall time) stamped by each digest run (`stampDigestLastRun_`) — the
  heartbeat behind the Automation Health panel's "Digest heartbeats"
  block. Created on the first post-deploy digest run; no manual setup.
  Until each digest has run once, the panel shows "no heartbeat recorded
  yet" — not an error. (`managerBrief` stamps on every 8am run even while
  the `managerDailyBrief` flag is off — the trigger's liveness is
  observable independent of the feature toggle, INV-151. `spanishAutoAssign`
  does the same on every hourly run while the `spanishAutoAssign` toggle is
  off — stale past 2h; the reported heartbeat set is DERIVED from
  `DIGEST_STALE_HOURS`, so a new key with a window is read the day it lands.)
<a id="operator-consolidated-manager-daily-brief-is-off-by-default-inv-151"></a>
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
<a id="operator-clienterrors-sheet-tab"></a>
- **`ClientErrors` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first client-error beacon, INV-150). PHI-free diagnostics — exception
  message/stack + view key per row, never form-field values. Read by the
  Admin → Automation Health "Client errors" section (bounded tail scan,
  7-day window). Grows slowly (client dedupes + caps 5/session; server caps
  20/hour/rep). **Retention since 2026-09-11:** `CLIENT_ERR_RETENTION_DAYS`
  (Script Property → CONFIG, default 0 = disabled) — set from Manage → Admin →
  Config → Retention; `purgeOldDiagnostics` (trigger #20) deletes older rows
  nightly, and Storage Health's ADP row names the live window. Unset = kept
  forever, trim by hand. The `runAllTests` beacon test deletes its own
  `TEST_` rows.
<a id="operator-viewusage-sheet-tab"></a>
- **`ViewUsage` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first view-enter after the 2026-08-13 observability deploy). PHI-free
  feature-usage telemetry — Timestamp / EmployeeId / View / Mode per row,
  plus a trailing `BootTiming` JSON cell on the landing-view row since
  2026-09-04 (`{shell,state,view}` ms — see the boot-timing note in the
  observability KDD), never content. Written by `recordViewEnter` (rep-gated, USER lock,
  rate-capped 120/hr/rep; the client throttles to one send per view per
  5 min and skips View-as previews); read by the admin-gated
  `getViewUsageStats` behind the Admin → Overview "Feature usage" panel
  (bounded 8000-row tail, 7d/30d windows). Grows slowly. **Retention since
  2026-09-11:** `VIEW_USAGE_RETENTION_DAYS` (Script Property → CONFIG, default
  0 = disabled), edited beside `CLIENT_ERR_RETENTION_DAYS` in Manage → Admin →
  Config → Retention → "Diagnostics tabs (PHI-free)" (danger-confirmed like the
  call-note purges), purged nightly by `purgeOldDiagnostics` (trigger #20 —
  2000 rows per run, contiguous bottom-up deletes, an unparseable timestamp
  never deleted, the `DiagnosticsPurge` audit row as the heartbeat checked
  only while a window is set), and reported on Storage Health's ADP row.
  This CLOSES cycle-18 F11 — until then these were the only two stores with
  NO retention tier at all, "trim manually" was an obligation nobody was
  reminded of, and neither tab was surfaced by Storage Health. Both windows
  default 0, so a fresh deploy still keeps everything; set them only when
  the tabs bother you.
<a id="operator-script-property-whatsnew-kb-id"></a>
- **Script Property `WHATSNEW_KB_ID`** (optional — the "What's new" panel,
  INV-152). Set it to the ID of a PUBLISHED Reference **article** (create a
  "What's new" article in the Reference tool, copy its id from the KB sheet
  or the reader URL-free id in the editor) and every rep gets a one-time
  dismissible panel rendering it on next load — re-surfaced automatically
  whenever the article is EDITED (the edit timestamp is the seen-stamp).
  Unset = feature fully dormant. Drafts/embeds never show; maintain the
  changelog like any other KB article.
<a id="operator-script-property-mail-bcc-all"></a>
- **Script Property `MAIL_BCC_ALL`** (optional — operator 2026-09-03: "any
  email the app sends, BCC me"). A comma-separated address list appended as
  BCC to EVERY email the app sends — the 26 automated senders through the one
  `appSendMail_` seam, and the rep-identity `sendRepEmail_` on both its
  branches. Unset = no change. It never clobbers a caller's own bcc (the
  intake `INTAKE_BCC_EMAIL`, the agent self-BCC), and an address already in
  to/cc/bcc is not added twice; a malformed entry is dropped; read once per
  execution. Set it to your address while testing; clear it when you no longer
  want the copies. No redeploy to change. **Since 2026-09-09 it is VISIBLE:**
  Manage → Admin → System carries a mail-routing capability line above the
  Storage inventory and a matching finding, so a copy left on is discoverable
  in one look instead of only from Script Properties. Set-and-internal reads
  as a standing warning naming the address and what those copies carry; an
  address OUTSIDE the deploying account's own domain reads as BLOCKING; unset
  reads as a fact under "checks passing", never a warning. The report never
  changes what is sent — an address you typed is always honoured, because a
  silent drop would leave you believing in copies you are not getting.
<a id="operator-script-property-rep-sender-from"></a>
- **Script Property `REP_SENDER_FROM`** (optional — the NEUTRAL shared sender
  for rep-initiated emails; pilot round-1 follow-ons, 2026-08-24; DORMANT
  until configured — the `WHATSNEW_KB_ID` posture). Rep-initiated sends
  (dept / external / intake — all six routes go through `sendRepEmail_`)
  always carry the agent's display name (the agent's name alone since the
  2026-08-27 operator correction) + Reply-To + an agent self-BCC; the true
  From ADDRESS is
  the deployer's, because the app runs `executeAs: USER_DEPLOYING` and no
  code change can alter that. To send from a neutral shared address instead:
  (1) in the DEPLOYING account's Gmail → Settings → Accounts → "Send mail
  as", add the shared alias — **on this deployment the operator's choice is
  `customersuccess@universalmedsupply.com`, already registered as a send-as
  option on the deploying account** — (2) set this property to
  that address. No redeploy — the next send picks it up. The value is
  validated against `GmailApp.getAliases()` per execution: set-but-
  unregistered, or any Gmail failure, falls back to the normal MailApp path
  with a console warning, so a typo'd property can never break sending.
  Side effect worth knowing: when active, sends go via GmailApp, which ALSO
  writes each email to the deployer's Gmail **Sent** folder (MailApp does
  not) — an audit trail, not a leak; the send quota pool is unchanged.
  Automated digests/alerts/exports never use it (system identity).
<a id="operator-timesheet-cold-archive-is-off-by-default-inv-153"></a>
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
<a id="operator-call-notes-eod-weekly-digest-knobs"></a>
- **Call-notes EOD + weekly digest knobs** are
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (default 17 — the local hour at
  which each rep gets the EOD digest) and the
  `installAutomationTriggers()` schedule (Friday 8am for the weekly
  digest; the EOD digest is an hourly trigger). `EOD_WARNING_WINDOW_MINUTES`
  is legacy — no longer consulted by the EOD gate (which is now
  local-hour-equality). The EOD trigger is hourly, so deploying the
  hourly change OR changing `EOD_WARNING_HOUR` requires re-running
  `installAutomationTriggers()` for the new schedule/value to take effect.
<a id="operator-config-call-notes-voice-input-enabled"></a>
- **`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`** controls the
  voice-to-text mic on Issue / Resolution fields. Default `false`.
  Flip to `true` only after confirming the org's stance on audio
  routed to the browser vendor's speech-to-text service (Chrome →
  Google, NOT covered by typical Google Workspace BAA — PHI in the
  rep's spoken note leaves the browser). Requires a redeploy to
  propagate to clients. When false, the UI never renders the mic
  button (no surface area for accidents).
<a id="operator-formtokens-and-formsubmissions-sheet-tabs"></a>
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
<a id="operator-punchadjustrequests-sheet-tab-4a"></a>
- **`PunchAdjustRequests` sheet tab (#4a)** is auto-created in the ADP
  spreadsheet on first adjustment request (`getOrCreatePunchAdjustSheet_`).
  Tracks employee-requested punch corrections (ReqId, EmpId, EmpName, Date,
  PunchType, RequestedTime, Reason, Status, SubmittedAt) pending manager
  approval. No manual setup needed.
<a id="operator-form-catalog"></a>
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
- `.cycle/config.md` — **the Cycle Workflow Config** (Batch D1, 2026-09-14):
  Test Command, Health Dimensions, Axis B, Subsystems, the Invariant Library,
  the Visual Audit Stage, Policy, the Seams cadence, the Regression Scenarios,
  Frozen Subsystems, Deploy Command. It is the one file here that is NOT a
  rolling record — it is stable configuration, and it lives in `.cycle/` because
  that is what every workflow command already reads for cycle machinery.
  CLAUDE.md keeps a stub under the same heading so the commands (which are
  synced byte-identical and cannot be edited locally) still land somewhere that
  redirects. `scripts/counts.mjs` and `scripts/cycle-context.mjs` both PREFER
  this file and fall back to CLAUDE.md, so the move is safe in both directions.
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
  **Its inputs are the implement blocks' `Estimate:` / `Actual:` lines and
  STATE.md's `Estimates:` line (Batch P, 2026-09-11)** — written BEFORE the
  first edit, so the row is a measurement rather than a memory. Five consecutive
  reflections (13, 16, 18, 19pre, 19) skipped the calibration row for want of
  exactly that line; the SessionStart hook now says so on every session.
- `.cycle/blocks/` — **the verbatim handoff blocks** (template R19, adopted
  2026-07-27). The three implement commands and `/reflect` write their summary
  block here at CHECKPOINT: `<cycle>-<version-or-scope>-broad-implement.md`,
  `…-targeted-implement.md`, `…-implement.md`, `<cycle>-<letter>-reflect.md`.
  **Every implement block carries `Estimate: S/M/L (h)` and `Actual:` lines
  directly under `Files modified` (Batch P)** — the estimate as it stood in the
  plan message, never reconstructed afterwards; the command template's block
  shape is untouched (it is synced byte-identical), so this is a project
  convention the hook reminds you of, not a template field.
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

**Command templates: synced to `claude-workflow-tools` v1.33.0 (2026-09-09).**
`.claude/commands/` carries 19 of the template's 20 commands, verified
byte-identical at sync time; `/pr-review` is the one not installed (it sits
under the template's separate "Per-Change Review" heading). Record the version
here on every `/sync-commands` — before this line existed the previous version
had to be INFERRED from which features were missing (it was ≤1.18.0, five
releases of command semantics behind: R18's interface lens and R19's block
persistence were both absent). The 1.23.0 → 1.33.0 sync updated four commands,
all additively: **`/broad-scan`** gained a closing **IMPLEMENTATION BATCH PLAN**
(1.26.0) that groups every finding from Stages 1–3 into sequential
`/broad-implement`-sized batches ordered by impact then dependency — a guard
that would turn CI red goes AFTER the batch closing the gap it guards, and
every finding appears exactly once or under `Deferred`; **`/cycle-init`**
inlines the PROJECT_HEALTH.md skeleton instead of cross-referencing a §7 the
command file cannot see, and warns that `portfolio.mjs` / the console Dashboard
parse the labels `Overall (weighted avg):` and the two `Top … priority:` lines
verbatim; **`/reflect`** requires double-quoting ANY metrics field containing a
comma (the `subsystem` column especially — an unquoted comma shifts every later
column); **`/setup-cycle`** rewrites the `Policy threshold` recommendation for
1.33.0's RELATIVE policy trigger. That trigger is the substantive change: §6a
now fires on (a) a decline over `Consecutive cycles`, (b) a sharp drop of ≥1.5
in one cycle, (c) lowest-scoring for `Consecutive cycles` AND not improving, or
(d) the old absolute floor at `Policy threshold` — kept only as a backstop,
because a fixed floor never fired once in six cycles of the template repo,
including one where a category fell 9.0 → 7.0. Note a deliberate scoring discontinuity that
came with R18: cycles ≤11 scored user-visible interface defects as
defensive/structural and excluded them from `net_score`, while 12 onward counts
them as production fixes — nothing was rewritten retroactively, so cumulative
`net_score` spans two rules at that boundary.

Fully optional + additive: with no `.cycle/`, every command behaves as before
(emit the handoff/summary block in chat). `scripts/cycle-context.mjs` IS
installed here and wired as a **SessionStart hook** via `.claude/settings.json`
— it auto-loads the substrate (STATE Current / Where-I-left-off / Pending +
PROJECT_HEALTH Current Standing + invariant count) into each new session, and
since Batch P prints the estimate reminder (record S/M/L + hours per batch
BEFORE the first edit) beneath it
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
Estimates: [per batch — "P: S (~2 h) · S: M (~4 h)" — written BEFORE the first edit; /reflect copies estimate vs actual into estimates.csv]
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

## Running totals (generated — do not hand-edit)

Every number below is DERIVED from the thing that defines it by
`scripts/counts.mjs`, and CI fails on drift (`node scripts/counts.mjs --check`).
**Do not restate one of these in prose.** Each has drifted at least once while
it was hand-carried — the visual-scenario count two high for weeks, INV-136's
admin-endpoint count four times, the harness totals through ~40 batch
paragraphs — and a `/sync-docs` pass that checks file paths and Script
Properties mechanically will still READ a sentence rather than check it. Cite
this block, or the command that prints the number.

<!-- COUNTS:BEGIN -->
<!-- GENERATED by scripts/counts.mjs — do not hand-edit; run `node scripts/counts.mjs --check`. -->

| Count | Value | Derived from |
|---|---|---|
| Pure harness tests | 812 | `node test/client/run.js` |
| DOM harness tests | 113 | `node test/client/dom/runDom.js` |
| Visual matrix scenarios | 102 | `shoot.mjs`'s `SCENARIOS` |
| Editor suite registrations | 316 | `Tests.js`; a run prints its own `Expected:` line |
| Admin-tier endpoints (INV-136) | 50 | `'Admin access required.'` in `Code.js` |
| Manager-gated endpoints | 61 | `'Manager access required.'` in `Code.js` |
| Installable triggers created | 16 | `installAutomationTriggers` |
| Jobs riding a dispatcher | 8 | `TRIGGER_GROUPS` |
| localStorage keys | 18 | `ums…` literals in `web-app/` |
| Invariant library entries | 203 | `.cycle/config.md` |
| Regression scenarios (S*) | 101 | `.cycle/config.md` |

Every figure above is DERIVED. Do not restate one in prose — a second
copy is a second source of truth, and each of these has drifted at least
once while it was hand-carried. Cite the block or the command instead.
<!-- COUNTS:END -->

## Cycle Workflow Config

**Moved to [`.cycle/config.md`](.cycle/config.md).** Commands that say "read
CLAUDE.md's Cycle Workflow Config" should read that file: it carries the Test
Command, Health Dimensions, the Horizontal (Axis B) Categories, Subsystems, the
Invariant Library, the Visual Audit Stage, Policy Configuration, the Seams Audit
Cadence, the Regression Scenarios, Frozen Subsystems and the Deploy Command.

**Test Command: `manual`** — restated here because every implement command reads
it first. The editor suite runs from the Apps Script editor; the Node harnesses
run in CI; the visual matrix is manual. `.cycle/config.md` has the full narrative.

The running-totals block above stays in CLAUDE.md deliberately: it is a
project-wide fact sheet rather than cycle machinery, and `counts.mjs --check`
compares it here.
