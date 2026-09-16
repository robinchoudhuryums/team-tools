# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Doc map — which file holds what

Batches D1 and D2 (2026-09-14) split this file. It had grown to 12,661 lines,
which is long enough that a reader stops reading and a `/sync-docs` pass starts
guessing where an update belongs; it is ~830 now. Nothing was rewritten — every
entry moved VERBATIM and this file keeps an INDEX into each, so the thing you
need is one link away and the thing you are scanning past is one line.

**This file is maps and indexes.** A narrative that grows past a few lines
belongs in the file its index points at; the CLAUDE-SIZE pin holds the ceiling
so the map cannot silt back into a log.

<!-- DOCMAP:BEGIN -->
| File | Holds | Read it when |
|---|---|---|
| `CLAUDE.md` (this file) | The MAPS and INDEXES: the module map, the Common Gotchas index (rule · trigger · pointer), the Key Design Decisions index, the Operator State Checklist, Development, the running-totals block, Cycle State & Memory | You are about to change code and need to know what has bitten before |
| [`docs/design-decisions.md`](docs/design-decisions.md) | Every Key Design Decision in full — WHY the code is shaped as it is | You are about to change a decision, or want the reasoning behind one |
| [`docs/operator-log.md`](docs/operator-log.md) | The dated deploy-round entries — what each round changed for the operator | You are reconstructing when a setting or behaviour appeared |
| [`docs/modules.md`](docs/modules.md) | The per-module narrative behind the Projects map table | You need to know what a tool actually does, or why |
| [`docs/gotchas.md`](docs/gotchas.md) | Every Common Gotcha in full — the incident, the reasoning, the pin | The index rule is not enough and you need the story |
| [`docs/operator-state.md`](docs/operator-state.md) | Every operator item in full — setup, defaults, failure modes, run order | You are deploying, or a Script Property / roster column needs setting |
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

**Where a `/sync-docs` update belongs:** a new gotcha → a RULE line in this
file's index plus the narrative in `docs/gotchas.md`. A change to how a module
behaves → `docs/modules.md`. New operator state → `docs/operator-state.md`, with
its line in the inventory here. A decision and its reasoning → `docs/design-decisions.md`
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
place that mapping lives. Server endpoints live in the FOURTEEN server files
`web-app/.clasp.json`'s `filePushOrder` names — `00_config.js` first, then one
per module in the numeric order the filenames advertise (Batch F2 split them out
of `Code.js`; they are ONE Apps Script global scope). The per-module narrative — what each tool actually does, the
redesigns, the operator rounds that shaped it — is [`docs/modules.md`](docs/modules.md).

**Adding a new tool:** append an entry to `TOOLS`, drop a partial in
`web-app/<tool>/script_*.html`, `include()` it from `index.html`, add server
endpoints to the module's server file (or a new one, listed in `filePushOrder`) —
and add a row to the map above,
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
- **A computed ZERO that could mean three different things must say WHICH — the accrual audit row (operator 2026-09-14).** Fires when you record or render a zero a reader could reach by more than one route. Verify: the `previewPtoAccruals` pin. [Detail](docs/gotchas.md#g114-a-zero-that-could-mean-three-different)
- **A job that CLOSES a period must RECONCILE it afterwards — the data it read was not final (operator 2026-09-15).** Fires when a job stamps a period as done and never looks again. Verify: the R reconcile pin + the editor suite's 2026-08 replay. [Detail](docs/gotchas.md#g115-a-job-that-closes-a-period-must)
- **A RECOVERY is not a PREVENTION, and shipping one can make the other feel done (operator 2026-09-15).** Fires when you fix a "the data arrived too late" bug — ask separately what made it late. Verify: the T open-punch pin. [Detail](docs/gotchas.md#g117-a-recovery-is-not-a-prevention)

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
- **Client-side persistence is localStorage only, every key `ums…`-prefixed and every read/write in a try/catch** (a privacy-mode browser must not break the app; the KEY COUNT is in the running-totals block, not here). Fires when you add a client-side persisted key. [Detail](docs/gotchas.md#g112-eighteen-client-side-localstorage-keys-total)

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
- **Read the server through `serverSource()` — never by FILENAME, and never by POSITION (Batch F2, 2026-09-14).** Fires when a pin reaches for server source: `'Code.js'` is an ALIAS for the fourteen files, and two declarations that were adjacent in one file no longer are. Verify: the F1a filename ban + F2c/F2d. [Detail](docs/gotchas.md#g113-read-the-server-through-serversource-never-by)
- **A bite-check ends in `git checkout`, so never run one against a file with uncommitted edits (cycle-18 batch 5B; `scripts/bite.sh` REFUSES a dirty file since Batch F2 — it fired a fourth time first).** Fires when you bite-check a pin. Verify: the F1-followon guard-ordering pin. [Detail](docs/gotchas.md#g65-a-bite-check-ends-in-git-checkout)
- **Your test TOOLING lies in both directions — a green pin is not a checked one (operator 2026-09-15).** Fires when you write a structural assertion, compare a value returned from the vm sandbox, or read a bite-check's verdict. [Detail](docs/gotchas.md#g116-your-test-tooling-lies-in-both)
- **A structural pin cannot see a ReferenceError — `no-undef` over the ONE global scope is the only static net for it (operator 2026-09-15).** Fires when you rely on source-shape pins over a function, or move a declaration out of the scope that uses it. Verify: `npm run lint:server`, bite-checked against the live `perDay` defect. [Detail](docs/gotchas.md#g118-a-structural-pin-cannot-see-a)
- **A store override that is READ but never ASSIGNED is not isolation — the resolver LOOKS isolated while every test writes to production (2026-09-16).** Fires when you add a `_TEST_OVERRIDE_*` branch to a store resolver, or find a cleanup routine reaching into a production store to undo test writes. Verify: the `fixtures: every _TEST_OVERRIDE_*` pin, bite-checked three ways. [Detail](docs/gotchas.md#g119-a-store-override-that-is-read)

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
- [The accrual credit is idempotent on HOURS PAID, not on months processed — and the ledger is the audit row (operator 2026-09-15)](docs/design-decisions.md#the-accrual-credit-is-idempotent-on-hours-paid-not-on-months)
- [The accrual dry run shares the ONE resolver and writes nothing (`previewPtoAccruals`, operator 2026-09-14)](docs/design-decisions.md#the-accrual-dry-run-shares-the-one-resolver-and-writes-nothin)
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
`TEST_KB_SS_ID` (cycle-10 M-9 — the KB fixture `_withTestKb_` provisions),
`TEST_FORMS_SS_ID` and `TEST_QA_SS_ID` (2026-09-16 — `_withTestForms_` /
`_withTestQa_`; before them the forms tests wrote to the LIVE forms store,
which is the ADP/payroll sheet when `FORMS_SS_ID` is unset). All six are
auto-provisioned on first use and reported by the suite's `── Suite
environment ──` block; delete one to force a fresh fixture.
Auto-managed diagnostics: `WITNESS_AUDIT_FAILS` (cycle-10 C4 — the
`{count, lastAt, lastAction}` lost-tamper-witness counter stamped by
`writeWitnessAuditLog_` after a failed retry; surfaced in Automation Health +
the failure digest's 48h window; delete the property to reset the counter)
`AUTOMATION_LAST_ERRORS` (cycle-18 F4 — `{job: {at, error}}` stamped by a trigger handler's own catch and cleared on its next clean run, because a handler that RETURNS an error object reaches nobody; read by `automationProblems_` onto the health dot + failure digest. Auto-managed — delete the property to clear a stale failure flag) `PTO_ACCRUAL_RECONCILE` (operator 2026-09-15 — `{at, window, toppedUp, days,
shortfalls[], skipped[], incomplete[], truncated}`, the last accrual reconcile
pass's outcome, stamped by `creditMonthlyPtoAccruals` and read by
`automationProblems_` onto the health dot + failure digest so a shortfall or an
unreconcilable month is visible without re-running two full sheet reads.
Auto-managed — delete the property to clear a stale flag) `OPEN_PUNCH_CHECK`
(operator 2026-09-15 — `{at, window, reps, days, expiring, detail[]}` or
`{at, error}`, the last daily open-punch scan, stamped by `checkOpenPunches`
at 8am and read by `automationProblems_` an hour later so the 9am health digest
emails it. A FAILED scan stamps the error, so an empty finding list is never a
clean board. Auto-managed — delete to clear) and `SELF_TEST_LAST_RESULT` (INV-162 — the nightly self-test outcome
`{date, mode, pass, fail, skip[, error]}`; delete to clear a stale failure
flag after fixing).

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:


### Inventory — what exists, and where it is documented

One line per standing item. The detail is the entry of the same name below;
the dated round entries that used to sit here moved to
[`docs/operator-log.md`](docs/operator-log.md) (Batch D1).

- [Blue-green (a personal dev instance alongside the team's prod) — see `docs/deployment.md`](docs/operator-state.md#operator-blue-green-a-personal-dev-instance-alongside-the-team-s-prod)
- [The server is FOURTEEN files, and `filePushOrder` is load-bearing (Batch F2) — incl. the one-time fix to an existing `.clasp.dev.json`](docs/operator-state.md#operator-the-server-is-fourteen-files-and-filepushorder-is-load-bearing)
- [The Timesheet timezone REPAIR (operator 2026-09-02 — the PH roster flip done mid-shift)](docs/operator-state.md#operator-the-timesheet-timezone-repair-operator-2026-09-02-the-ph-ros)
- [The QA module Phase 1 (operator 2026-08-27) needs THREE Script Properties and one Drive folder before it does anything](docs/operator-state.md#operator-the-qa-module-phase-1-operator-2026-08-27-needs-three-script)
- [Set Script Property `ADP_SS_ID`](docs/operator-state.md#operator-set-script-property-adp-ss-id)
- [Set Script Property `CDR_SS_ID`](docs/operator-state.md#operator-set-script-property-cdr-ss-id)
- [Script Property `TEST_CDR_SS_ID`](docs/operator-state.md#operator-script-property-test-cdr-ss-id)
- [Set Script Property `INTAKE_SS_ID`](docs/operator-state.md#operator-set-script-property-intake-ss-id)
- [Intake recipient addresses are Script-Property-backed](docs/operator-state.md#operator-intake-recipient-addresses-are-script-property-backed)
- [Script Property `TEST_INTAKE_SS_ID`](docs/operator-state.md#operator-script-property-test-intake-ss-id)
- [Set Script Property `KB_SS_ID`](docs/operator-state.md#operator-set-script-property-kb-ss-id)
- [Script Property `KB_IMAGES_FOLDER_ID`](docs/operator-state.md#operator-script-property-kb-images-folder-id)
- [Script Property `KB_SEARCH_SYNONYMS`](docs/operator-state.md#operator-script-property-kb-search-synonyms)
- [Quiz import from Google Forms requires the Google Forms OAuth scope](docs/operator-state.md#operator-quiz-import-from-google-forms-requires-the-google-forms-oaut)
- [KB Phase 2 converter requires the Google Docs OAuth scope](docs/operator-state.md#operator-kb-phase-2-converter-requires-the-google-docs-oauth-scope)
- [Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card (Phase A)](docs/operator-state.md#operator-set-script-property-kb-ai-api-key-to-enable-the-kb-ai-guidan)
- [Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`](docs/operator-state.md#operator-script-properties-kb-ai-daily-cap-kb-ai-model)
- [Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`](docs/operator-state.md#operator-script-properties-kb-ai-generation-kb-ai-spend)
- [Script Property `KB_MAP_GEOCODE_CACHE`](docs/operator-state.md#operator-script-property-kb-map-geocode-cache)
- [`CDR_ALERT_THRESHOLD`](docs/operator-state.md#operator-cdr-alert-threshold)
- [Set Script Property `MANAGER_EMAILS`](docs/operator-state.md#operator-set-script-property-manager-emails)
- [Script Property `ADMIN_EMAILS`](docs/operator-state.md#operator-script-property-admin-emails)
- [Punctuality tracking (Manage module tab)](docs/operator-state.md#operator-punctuality-tracking-manage-module-tab)
- [Coverage planner is business-hours/weekday scoped](docs/operator-state.md#operator-coverage-planner-is-business-hours-weekday-scoped)
- [Spanish-inbox tracking (Gmail) needs 3 things](docs/operator-state.md#operator-spanish-inbox-tracking-gmail-needs-3-things)
- [Elapsed time is BUSINESS hours, and ONE pure core computes it (operator 2026-08-31)](docs/operator-state.md#operator-elapsed-time-is-business-hours-and-one-pure-core-computes-it)
- [Inter-department request tracking (`DeptRequests` / Part B)](docs/operator-state.md#operator-inter-department-request-tracking-deptrequests-part-b)
- [External fillable-form links must be the canonical anonymous `/exec` URL](docs/operator-state.md#operator-external-fillable-form-links-must-be-the-canonical-anonymous)
- [External anonymous web-app access is BLOCKED by Workspace admin policy on this domain — the `?form=<token>` fillable-form route is non-functional for external recipients](docs/operator-state.md#operator-external-anonymous-web-app-access-is-blocked-by-workspace-ad)
- [`Employees` sheet column K = `PtoEnabled`](docs/operator-state.md#operator-employees-sheet-column-k-ptoenabled)
- [Onboarding a NEW team member no longer needs a hand-edit of the Employees sheet (2026-08-07)](docs/operator-state.md#operator-onboarding-a-new-team-member-no-longer-needs-a-hand-edit-of)
- [Daily automation triggers](docs/operator-state.md#operator-daily-automation-triggers)
- [Call-notes retention is OFF by default](docs/operator-state.md#operator-call-notes-retention-is-off-by-default)
- [Call-notes cold-archive is the SAFE retention tier (also OFF by default)](docs/operator-state.md#operator-call-notes-cold-archive-is-the-safe-retention-tier-also-off)
- [Call-notes 3rd-tier cold-store purge (also OFF by default)](docs/operator-state.md#operator-call-notes-3rd-tier-cold-store-purge-also-off-by-default)
- [Include-archive search](docs/operator-state.md#operator-include-archive-search)
- [Admin "Retention" panel (Config sub-tab)](docs/operator-state.md#operator-admin-retention-panel-config-sub-tab)
- [Form-data retention is OFF by default](docs/operator-state.md#operator-form-data-retention-is-off-by-default)
- [Forms PHI store — set `FORMS_SS_ID` to segregate (forms-hardening)](docs/operator-state.md#operator-forms-phi-store-set-forms-ss-id-to-segregate-forms-hardening)
- [`FORM_CONSENT_VERSION` in CONFIG](docs/operator-state.md#operator-form-consent-version-in-config)
- [`MANAGER_TIMEZONE`](docs/operator-state.md#operator-manager-timezone)
- [Timezone model — three distinct concepts, don't conflate them](docs/operator-state.md#operator-timezone-model-three-distinct-concepts-don-t-conflate-them)
- [`CONFIG.COVERAGE_MIN_STAFF`](docs/operator-state.md#operator-config-coverage-min-staff)
- [`CONFIG.KB.REVIEW_DUE_DAYS`](docs/operator-state.md#operator-config-kb-review-due-days)
- [`CONFIG.SHIFT_SCHEDULE`](docs/operator-state.md#operator-config-shift-schedule)
- [`Employees` sheet column L = `CallNotesSheetId`](docs/operator-state.md#operator-employees-sheet-column-l-callnotessheetid)
- [`Employees` sheet column M = `ManagerEmail`](docs/operator-state.md#operator-employees-sheet-column-m-manageremail)
- [`Employees` sheet column N = `Departments`](docs/operator-state.md#operator-employees-sheet-column-n-departments)
- [`Employees` sheet column O = `Schedule`](docs/operator-state.md#operator-employees-sheet-column-o-schedule)
- [Script Property `CDR_QUEUE_GROUPS`](docs/operator-state.md#operator-script-property-cdr-queue-groups)
- [Script Property `DR_SLA_TARGETS`](docs/operator-state.md#operator-script-property-dr-sla-targets)
- [Set Script Property `HR_DOCS_SS_ID`](docs/operator-state.md#operator-set-script-property-hr-docs-ss-id)
- [`Employees` sheet column P = `PayRate`](docs/operator-state.md#operator-employees-sheet-column-p-payrate)
- [`Employees` sheet column Q = `PtoAccrual`](docs/operator-state.md#operator-employees-sheet-column-q-ptoaccrual)
- [`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)](docs/operator-state.md#operator-config-pto-accrual-basis-hours-80-config-pto-hours-per-day-8)
- [`Employees` sheet column R = `AccruedThrough`](docs/operator-state.md#operator-employees-sheet-column-r-accruedthrough)
- [`ROSTER_CACHE_KEY` = `'employee_roster_v11'`](docs/operator-state.md#operator-roster-cache-key-employee-roster-v11)
- [Call-notes department list + state tax rates](docs/operator-state.md#operator-call-notes-department-list-state-tax-rates)
- [Script Property `CN_ARCHIVED_TAGS`](docs/operator-state.md#operator-script-property-cn-archived-tags)
- [Script Property `CN_EMAIL_TEMPLATES`](docs/operator-state.md#operator-script-property-cn-email-templates)
- [Script Property `CN_EXTERNAL_LINKS`](docs/operator-state.md#operator-script-property-cn-external-links)
- [Script Property `CN_FEATURE_FLAGS`](docs/operator-state.md#operator-script-property-cn-feature-flags)
- [Script Property `AUTOMATION_DIGEST_LAST_RUNS`](docs/operator-state.md#operator-script-property-automation-digest-last-runs)
- [Consolidated manager daily brief is OFF by default (INV-151)](docs/operator-state.md#operator-consolidated-manager-daily-brief-is-off-by-default-inv-151)
- [`ClientErrors` sheet tab](docs/operator-state.md#operator-clienterrors-sheet-tab)
- [`ViewUsage` sheet tab](docs/operator-state.md#operator-viewusage-sheet-tab)
- [Script Property `WHATSNEW_KB_ID`](docs/operator-state.md#operator-script-property-whatsnew-kb-id)
- [Script Property `MAIL_BCC_ALL`](docs/operator-state.md#operator-script-property-mail-bcc-all)
- [Script Property `REP_SENDER_FROM`](docs/operator-state.md#operator-script-property-rep-sender-from)
- [Timesheet cold-archive is OFF by default (INV-153)](docs/operator-state.md#operator-timesheet-cold-archive-is-off-by-default-inv-153)
- [Call-notes EOD + weekly digest knobs](docs/operator-state.md#operator-call-notes-eod-weekly-digest-knobs)
- [`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`](docs/operator-state.md#operator-config-call-notes-voice-input-enabled)
- [`FormTokens` and `FormSubmissions` sheet tabs](docs/operator-state.md#operator-formtokens-and-formsubmissions-sheet-tabs)
- [`PunchAdjustRequests` sheet tab (#4a)](docs/operator-state.md#operator-punchadjustrequests-sheet-tab-4a)
- [Form catalog](docs/operator-state.md#operator-form-catalog)

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


**The entries themselves are [`docs/operator-state.md`](docs/operator-state.md)**
— every link above lands there. Nothing was rewritten in the move; the
OPERATOR-INDEX pin requires every link to resolve to an anchor that exists
and every anchor there to be listed above.

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
| Pure harness tests | 830 | `node test/client/run.js` |
| DOM harness tests | 116 | `node test/client/dom/runDom.js` |
| Visual matrix scenarios | 102 | `shoot.mjs`'s `SCENARIOS` |
| Editor suite registrations | 323 | `Tests.js`; a run prints its own `Expected:` line |
| Admin-tier endpoints (INV-136) | 50 | `'Admin access required.'` in the server source |
| Manager-gated endpoints | 61 | `'Manager access required.'` in the server source |
| Installable triggers created | 16 | `installAutomationTriggers` |
| Jobs riding a dispatcher | 10 | `TRIGGER_GROUPS` |
| localStorage keys | 18 | `ums…` literals in `web-app/` |
| Invariant library entries | 207 | `.cycle/config.md` |
| Regression scenarios (S*) | 104 | `.cycle/config.md` |

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
