# Operator State Checklist — the per-item entries

Moved VERBATIM out of CLAUDE.md by Batch D2 (2026-09-14), finishing the split
D1 deferred on purpose: these entries carry deploy-critical PROCEDURE (the
ALL-CST runbook, the timezone-repair run order, the trigger list and what rides
which dispatcher), so compressing them inside a verbatim-move batch was the one
thing not to do. Nothing here is rewritten.

CLAUDE.md keeps the **storage map** (the eight spreadsheets, one screen) and the
**inventory** — one line per item, linking here. Read that first; this file is
where each item's setup, defaults, failure modes and consequences live.

Where a thing is EDITED, in general: a Script Property in the Apps Script editor
(Project Settings -> Script Properties) unless an in-app editor is named; a
CONFIG constant needs a redeploy; an `Employees` sheet column is edited in the
sheet or, for onboarding, in Manage -> Admin -> Config -> Team Members. Each
entry says which it is.

---

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
<a id="operator-the-server-is-fourteen-files-and-filepushorder-is-load-bearing"></a>
- **The server is FOURTEEN files, and `filePushOrder` is load-bearing (Batch F2,
  2026-09-14).** `web-app/Code.js` no longer exists: it was split, as a MOVE, into
  `00_config.js` (CONFIG, the column enums, every top-level constant) plus one file
  per module, and `web-app/.clasp.json`'s **`filePushOrder`** declares the load
  order — the numeric prefixes advertise it. Apps Script gives every `.gs` file ONE
  global scope, so nothing about the app's behaviour changed; what changed is that
  the order is now something a person can get wrong. The constants file must stay
  FIRST (a constant read at load time from a later file would be in its temporal
  dead zone), and a run.js pin holds both the order and the fact that every
  declaration is byte-identical to the pre-split file.
  **ONE-TIME OPERATOR STEP, and it is easy to miss:** if you already have a
  `web-app/.clasp.dev.json` (it is gitignored, so it survives a pull), it still
  carries the OLD `"filePushOrder": []`. `npm run push:dev` swaps that file OVER
  `.clasp.json` to push, so a stale dev config pushes the server in a different
  order than prod. Copy the `filePushOrder` block from
  `web-app/.clasp.dev.json.example` into it — a pin holds the committed EXAMPLE
  equal to prod, but it cannot see your gitignored copy.
  **AT DEPLOY:** after `clasp push -f`, confirm the editor's file list shows the
  fourteen files and **no `Code.js`**. The tree cannot produce a stray one; a
  project that was never fully re-pushed can, and a leftover `Code.js` would
  SHADOW every declaration in it — the app would run the old server while the
  files beside it look current. Push to the DEV instance and run `runAllTests`
  there before prod (that is regression scenarios S1/S2, and the only check that
  exercises the real Apps Script runtime).

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
  **Both tools now REFUSE on drift (cycle 22 T2, 2026-09-23).** The plan is
  made from one read, but a live punch or a Day Edit landing between that read
  and the write used to shift the planned rows, so the tool could overwrite or
  delete a neighbour. Inside the lock, both re-read and verify every planned
  row (and each add's existing row) still holds exactly the planned punch.
  If any does not, they throw `Refusing: N planned row(s) changed…` and write
  NOTHING. That is not an error to work around: re-run the dry run, then the
  apply, ideally off-shift. Pinned by the T2 pins.
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
  **Since Batch 5 (2026-09-18) the `QaRecordings` tab carries a trailing
  `AgentId` column** (the header self-heals on a tab provisioned earlier, no
  action needed): attributing a recording resolves the agent's ROSTER ID and
  stores it beside the name, and the agent-facing My Reviews / playback reads
  scope by that id. Two consequences worth knowing: a recording attributed
  BEFORE this deploy has a blank id and still matches by name, but only when
  that name belongs to exactly ONE roster row; and if two roster rows share a
  name, attribution stores no id and NEITHER agent sees the review — resolve
  the duplicate name (or re-attribute after fixing it) rather than leaving it,
  because a review released to the wrong agent is the failure this refuses.
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
<a id="operator-the-company-holidays-tab-cdr-report-workbook"></a>
- **The `Company Holidays` tab (CDR Report workbook) — ONE holiday calendar
  shared with the Department Dashboard (H1, 2026-09-17).** Nothing to set in
  team-tools: the tab is created and maintained on the `call-data-reporting`
  side (its `setup()` creates it; its Operator State #27 is the grammar — one
  range per row in column `Dates`, `2026-12-25` or `2026-11-26..2026-11-27`,
  a comma list in one cell also parses; `Label` free text; `Active` blank/TRUE
  counts, FALSE parks a row). This app reads it read-only through `CDR_SS_ID`
  via `getCdrCompanyHolidayRanges_` (header-name read, one-hour CacheService
  tier `cdr_holidays_v1`, bypassed under the test override) and
  `getCompanyHolidays_(year)` is the ONE accessor every business-day consumer
  reads — Metrics "previous workday" + trend axes, the coverage planner,
  punctuality, the PTO conflict labels, the business-minutes core, the pay
  statement, and the client's `mPrevWorkdayIso_` via
  `window.SERVER_COMPANY_HOLIDAYS`. **Precedence: the tab WINS the moment it
  holds one range; the computed US-federal list (`getUsHolidays_`) serves ONLY
  while the tab is absent, empty or unreadable — never merged.** So after the
  dashboard operator populates the tab, Columbus Day and Veterans Day stop
  being holidays here (they were never company closures), and an UNLISTED
  YEAR is a year with no holidays in both apps — the tab is maintained yearly,
  which is the dashboard's rule too. A tab the deployer account cannot read
  (or a `CDR_SS_ID` that is unset) degrades to the federal list with a
  `Logger` line, never a thrown error. **Which calendar is LIVE is visible
  since Batch 3 (2026-09-17): Manage → Admin → System's CDR Report row
  carries `Company Holidays: <source> · N in <year>` in its detail, and a
  CDR-area finding says so** — ok when the tab lists dates this year; warn
  "No company holidays listed for <year>" when the tab has ranges but none
  this year (the yearly-maintenance reminder); warn "No Company Holidays tab"
  / "tab is empty" naming that the computed US-federal list is in use; warn
  "could not be read" with the reader's error. The probe reads through the
  same one-hour cache, so a row added on the dashboard side shows within the
  hour. (The dashboard's Health page has its own `company-holidays` row, which
  also warns when its old property is still set beside the tab.) Before renaming the
  tab or a header on the dashboard side, read its Operator State #68 — this
  app is the external reader it names.
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
  Written by the Manage → Admin → "AI Guidance (Reference)" section
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
<a id="operator-the-dashboard-standards-tab-cdr-report-workbook"></a>
- **The `Dashboard Standards` tab (CDR Report workbook) + `CDR_DASHBOARD_DEPT`
  — the answer target / amber band / team-avg excludes are the Department
  Dashboard's, published (H2, 2026-09-17; replaced `CDR_ALERT_THRESHOLD`).**
  The `call-data-reporting` repo's `setup()` creates the tab and republishes
  it whenever an admin saves the dashboard's Display standards or Dept Config
  (its Operator State #37): one row per dashboard dept plus a `*` global row
  — `Department | Answer Target | Amber Band | Team Avg Excludes | Published
  At | Published By`. This app reads it read-only via `CDR_SS_ID`
  (`getCdrDashboardStandard_`, header-name read, one-hour CacheService tier
  `cdr_standards_v1:<dept>`, bypassed under the test override) for the row
  named by `CONFIG.CDR_DASHBOARD_DEPT` (seed `CSR` — the DASHBOARD's roster
  header for this team, not this app's own department labels; the Script
  Property `CDR_DASHBOARD_DEPT` overrides it without a redeploy), falling
  back to the `*` row. The four metrics endpoints ship the result as
  `alertThreshold` / `alertBand` / `standardSource`: the dashed target line
  on both hero sparklines, the team table's three-tier band (green at/above
  target, amber within the band, red below), the Clock dashboard's %
  Answered tone, and the manager sidebar badge (`getMetricsAmbient`, which
  fires below the target) all judge against it, and the anonymized team
  benchmark subtracts the row's Team Avg Excludes. **Nothing to set here
  once the dashboard has run `setup()`.** Until it has (or if the deployer
  cannot read the workbook, or the dept has no row and there is no `*`
  row), the standard is UNAVAILABLE: no target line, no tone, no badge, and
  `getMetricsAmbient` answers `{ badge: null, unavailable: 'standard' }` —
  never a fallback number. **Since Batch 3 (2026-09-17) the state is
  VISIBLE:** both Metrics heroes render the source beside the target
  ("target 92% · from the Dashboard Standards tab"; a missing standard reads
  "no Dashboard Standards row for this department — no target, tone or
  badge" in muted text; an UNREADABLE tab reads warn — g128's split), and
  Manage → Admin → System's CDR Report row carries `Dashboard Standards:
  <source> · target N% · amber band N pt · dept CSR` with a CDR-area finding
  (ok on `sheet` / the `*` row; warn for no-row / empty / no-tab naming the
  three silences and the one-hour cache; warn with the error for
  unavailable). A standard published WITHOUT an Amber Band has no amber tier
  — one point under the target is red on the team table AND the Clock card
  (`mtAnswerBand_`, g131). (The dashboard's Health page has its own
  `dashboard-standards` row that warns when its published tab is stale — a
  standard edited outside its Alerts modal.) The
  formula behind every rate is the dashboard's, `answered / (answered +
  missed)` (`cdrAnswerPct_`, g124); a window with nothing answered or missed
  has NO rate (null, a dash), not 0%.
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
  member (load = claims on requests still PENDING, since cycle 22 M4) through `autoAssignSpanishThreads` — see INV-31 (iii) for the gate
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
  back to the ADP sheet — **recommended: set it to the Intake spreadsheet (the
  PHI store), the `FORMS_SS_ID` recommendation, because the row names a
  patient (below); Manage → Admin → System's Storage inventory carries a
  "Dept Requests (PHI-adjacent)" row since Batch 5 (2026-09-18) that warns
  while the property is unset.** **The store was PHI-free until 2026-09-10 (operator
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
  Health's per-job liveness is UNCHANGED. Since Batch 4 (2026-09-18) the two
  stand-alone daily jobs with no audit row — `sendDailyMissedPunchAlerts`
  and `runDailyExportCheck` — and the failure digest itself carry a
  heartbeat too (`AUTOMATION_DIGEST_LAST_RUNS`), so every daily trigger has a
  liveness signal. **Known limit: a group shares one
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
  call-notes Spreadsheet ID. Easiest path: **Manage → Admin →
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
<a id="operator-the-insurancepayors-tab-kb-spreadsheet"></a>
- **The `InsurancePayors` tab** (operator 2026-08-25) lives in the **KB
  spreadsheet** (`KB_SS_ID`) — no Script Property of its own. Import the payor
  acceptance CSV and name the tab exactly that. It is the same kind of thing as
  `OopPricing` and `LocationAcceptance` below: operator-maintained, read LIVE on
  every lookup, and **the app NEVER writes to it**. Refresh it from Manage →
  Admin → Config → Reference data tables, which replaces the tab wholesale.

  It had no entry of its own until 2026-09-21 — only a mention inside the
  `OopPricing` one — and T3 is what made that a real gap: its COLUMN HEADERS
  are now load-bearing.

  - **Column A is the payor / plan name.** It is the only column scanned for
    matching, capped at `INS_PAYOR_MAX_ROWS` rows; the full row is fetched only
    for the top `INS_PAYOR_TOP` matches.
  - **The named columns are found by header STEM**, so you may reorder them
    freely: `/waystar/`, `/network/`, `/qualif/` (the source header is
    misspelled "Qualifaction" — the stem is deliberate) and `/reimbur/`.
  - **Every other non-empty column rides along verbatim** in the per-payor
    details disclosure. Nothing is dropped and nothing is guessed at.
  - **A column header that is an HCPCS code is a JOIN KEY (T3, 2026-09-21).**
    `K0800`, `K0802` and the like are matched against the `OopPricing` tab's
    code column and the ITEM NAME is shown beneath the code, so a rep reading
    `K0802 — Not Accepted` can see what K0802 is. Consequences worth knowing
    before you edit a header:
    - **The digit shorthand is READ, in one shape** (T9, 2026-09-22):
      `K0821/23/16` means K0821, K0823 and K0816 — each digit fragment
      replaces that many trailing digits of the code in front of it. You
      confirmed that rule, so the app applies it. It applies ONLY when one
      whole code comes FIRST and every piece after it is 1–3 digits.
    - **Any other shorthand is SHOWN but never matched**, because a wrong join
      would tell a rep a payor covers an item it may not: a range
      (`K0800-K0803`), a fragment before any code (`23/K0800`), a fragment
      beside two whole codes (`K0800, K0801/23` — which one does it
      abbreviate?), or a code with a modifier suffix (`K0800BR/23`). Each
      renders verbatim with "not matched" beside it. Writing such a cell as
      whole codes (`K0800, K0801, K0802, K0803`) makes it joinable with no
      code change.
    - A code that **two** `OopPricing` rows carry names neither, and says "2
      items" instead: the spreadsheet allows the ambiguity and cannot resolve
      it, so naming one would be a guess printed as a fact.
    - A code the pricing tab does not carry is simply left alone. That is a
      fact about the pricing tab, not an error.
  - **The ACCEPTANCE VALUES are a vocabulary, and the app tones and explains
    them** (`INS_TERMS`): Not Accepted / NO, Out-of-network / OON, OON w/ PA,
    Out-of-Network Benefits, Plan Specific, Location-based, Location-based
    (285–325 lb), SI/PR, PR, TRY, Hawaii only, MDX Hawaii, A & B (combined),
    Accepted / X. A value the
    vocabulary knows becomes a clickable term with the operator's own
    definition behind it; a value it does not know renders VERBATIM in the
    neutral tone and says there is no definition on file — it is never a
    guessed verdict.
  - **Out-of-network has three meanings, and the app keeps them apart**
    (T9, 2026-09-22). A BARE `OON` or `OUT-OF-NETWORK` (any spelling) is RED:
    we don't accept orders for that plan. `OON w/ PA` is AMBER: the plan may
    approve an order through a Prior Authorization request. `Out-of-Network
    Benefits` is AMBER: members may use out-of-network suppliers, usually at a
    higher co-insurance rate. Anything written beside `OON` other than PA or
    benefits reads as unexplained amber, never as the red refusal.
  - **Every toned value in the live sheet now explains itself** (T10,
    2026-09-23). `Hawaii only` and `MDX Hawaii` are blue: the first is a rule
    (the item can only be provided in Hawaii with that plan), the second names
    the plan (an HMO/IPA coordinating Medicare Advantage care). A bare `Hawaii`
    matches neither and reads as unexplained. **If you add a new acceptance
    value, it renders neutral with "no definition on file" until someone
    supplies one sentence for it** — operator text, not a code change.
  - A payor the sheet does not list renders the operator's own
    plan-not-listed → **TRY** guidance rather than an empty result.

  The rep's QUERY is never persisted (the `kbMapDistances` privacy posture).

<a id="operator-the-ooppricing-and-locationacceptance-tabs-kb-spreadsheet"></a>
- **The `OopPricing` and `LocationAcceptance` tabs** (operator 2026-09-16) live
  in the **KB spreadsheet** (`KB_SS_ID`) — no Script Property of their own.
  They sit beside `InsurancePayors`, which is the same kind of thing: an
  operator-maintained, read-only lookup table.

  **The app NEVER writes to either tab.** Both are read LIVE on every lookup —
  not imported, not cached. A rep quotes an OOP price and takes payment on that
  call, so a copy that lags your sheet by an upload is a rep collecting a
  superseded price.

  They were briefly a separate spreadsheet (`OOP_SS_ID`, same day). Moving them
  here dropped a Script Property, a test-twin property and a Storage Health row.
  They are deliberately **not** in the Intake spreadsheet, which was the other
  candidate: Intake is PHI and the app writes to it, so pricing there would mean
  anyone maintaining prices needs edit access to patient submissions.

  ### `OopPricing`
  - **Every column is found BY HEADER, including the item name.** A header like
    `Item` / `Product` / `Description` is the name; column A is only the
    FALLBACK for a sheet that has no such header. This matters because the real
    sheet has `HCPCS` in column A and the item in column C — before 2026-09-16
    the reader assumed column A, so every search by product name found nothing
    and the composer would have quoted a billing code to a customer.
  - **The search matches the item name OR the code**, so a rep can use whichever
    the customer gave them.
  - **EVERY price-role column is kept, and the picker offers one labelled Insert
    per column.** `OOP Price – pick-up`, `W/ Shipping Cost` and
    `W/ Tech Delivery Cost` are all correct — for different fulfilments — so the
    inserted line names which one: `Drive Scout 3 Wheel (W/ Shipping Cost) —
    $1,070.00 (price effective 09/16/2026)`. A column that is a COMPONENT rather
    than a total (`Shipping` on its own) matches no price stem and stays a
    detail, which is right: it is not a number to quote.
  - **An `Image` column is dropped** rather than shown beside the price.
  - **The column header IS the customer-facing label.** It is rendered verbatim
    into the quote line, so name the column for the person who will read it:
    `Drive Scout 3 Wheel (W/ Shipping Cost) — $1,070.00`. Two consequences worth
    knowing before you edit a header. A PAREN in the header nests inside the one
    the line adds — `(OOP Price (pick-up))` — so use a dash or comma instead:
    `OOP Price – pick-up` — which is what the base-price column is now called,
    for exactly this reason. And **do not keep two columns that must always hold
    the same figure** (a `Pick-Up Cost` equal to `OOP Price` was dropped
    2026-09-17): that is an invariant the spreadsheet cannot enforce, and the
    day they diverge the picker offers a rep two different correct prices for
    one item, either of which becomes a commitment. Put the distinction in the
    header wording instead.
  - Then `Price`, `Area Eligibility` and `EffectiveDate`, matched **by header
    STEM**, not by position: "Patient Cost" and "OOP Amount" both read as the
    price, "Eligible Regions" as the area. Reorder freely. Any column the
    matcher does not recognise is shown VERBATIM beside the result rather than
    dropped.
  - **`Area Eligibility` is READ BY AN ENGINE, not displayed.** It is parsed
    into a rule and answered twice — once for an order through insurance and
    once for one paid out of pocket. The grammar and what each value means is
    INV-209; the short version is `Open` / a list of two-letter state codes /
    `N miles of any warehouse` / `N miles of <warehouse name>` / `listed
    cities`, and **anything else reads "cannot tell"**, never "eligible".
  - **`N miles of any warehouse` is the usual form** and is a rule about the
    NETWORK: it measures from whichever warehouse is nearest, resolved against
    `LocationAcceptance` at the moment of the check. Opening a warehouse
    extends every item written this way with no edit to this sheet. `any of our
    warehouses`, `all warehouses` and `a warehouse` all read the same.
  - `N miles of <warehouse name>` is the NARROW form, for items only certain
    sites can fulfil — e.g. the ones a technician has to build. Name one or
    several (`100 miles of Dallas warehouse, 100 miles of San Antonio
    warehouse`). Each NAME has to appear in `LocationAcceptance`, and it is
    matched as a WHOLE WORD, so a site named `Ware` is not found inside the
    word "warehouse".
  - **Two rules can share one cell, joined by `or`** (T7, 2026-09-22):
    `100 miles of Dallas warehouse, or listed cities` means EITHER qualifies,
    which is how the scooter rule is written. `listed cities` (also `exact
    city`, `service cities`) delegates to the city rows in
    `LocationAcceptance`, so the list is maintained in ONE place and adding a
    city needs no edit here. **If either half is unreadable the WHOLE cell
    reads "cannot tell"** — the readable half never becomes the answer on its
    own, because an item you restricted by a rule we could not parse would
    otherwise go eligible everywhere the other half allows.
  - A **city** limit does NOT lift when the customer pays out of pocket — it is
    about how the item physically gets there, not who is billing. A **state**
    limit still does.

  ### `LocationAcceptance`
  **The headers must be in ROW 1**, with data from row 2 down. A title row above
  them makes every column unreadable, every row read as blank, and the registry
  come back empty — which used to be silent and is now reported by name (T7).

  Columns, by header stem: `Type`, `Name`, `Address`, `State`, `Accepts`,
  `Notes`. Two row kinds under `Type`:

  | Type | Name | Address | State | Accepts |
  |---|---|---|---|---|
  | `warehouse` | the word you write in Area Eligibility | **full street address** | | |
  | `city` | the city | *(blank)* | two-letter code | e.g. `POV, scooter` |

  - A **warehouse** row's `Name` is matched as a SUBSTRING of the Area
    Eligibility text, so "100 miles of Dallas or San Antonio warehouse" resolves
    when both names are listed. Its `Address` is what gets geocoded — **use a
    real street address, not just the city.** A bare city name geocodes to the
    city centre, and a warehouse twenty miles out of town then makes every
    near-boundary radius answer wrong by up to twenty miles.
  - A warehouse row with **no address is dropped and reported** — its name would
    become vocabulary the grammar matches and can never measure.
  - A **city** row lists somewhere POVs/scooters can be delivered. **A `Name`
    is required** — a row with only a `State` is dropped. Without a `Type` of
    `city` a row with no address cannot be classified at all and is dropped
    too, since a blank `Type` is only ever read as a warehouse.
  - A city row is shown to the rep whenever they check an address in that city.
    Since T7 (2026-09-22) it **also decides, but only for an item whose own Area
    Eligibility names the city list** — never on its own. The column is still
    the only thing that chooses the rule; the city rows supply its parameter,
    exactly as they already supplied the warehouse address for a radius. An
    item that never mentions cities is unaffected by anything in this list.
  - `Type` matches by prefix, so `warehouse (north dock)` works. A `Type` the
    reader does not recognise makes the row unreadable and it is REPORTED, not
    guessed at. A blank `Type` is classified by shape: an address makes it a
    warehouse.

  **There is no default and no fallback.** A missing or empty
  `LocationAcceptance` tab makes every radius rule read "cannot tell" — never
  eligible, and never a guessed location.

  **Both tabs' timezone is the KB spreadsheet's**, which must equal
  `CONFIG.TIMEZONE` like every other store — `EffectiveDate` is a date read and
  a drifted tz shifts it. File → Settings → Time zone; Storage Health shows the
  mismatch on the Knowledge Base row.

  **Most problems now announce themselves on the rep's own eligibility panel**
  (T7): a tab that yields nothing usable says which of its three reasons
  applies, a dropped or addressless row is named on screen, and a radius naming
  a warehouse the registry does not hold says to fix THIS tab and not the
  pricing sheet — while a clean table shows no banner at all.

  **For the full picture: Manage → Admin → System → "Reference lookups ·
  pricing + delivery reach"** (T8, 2026-09-22). It loads with the tab.

  It reports the tab it read, every
  header and the role it assigned, any role it could not find, the warehouse
  registry, the city count, every addressless warehouse row — and **how every
  Area Eligibility value in the sheet parses, with the unreadable ones listed by
  item**. Run it after adding rows or renaming a column. Header discovery and
  the eligibility grammar are both invisible when they work and silent when they
  do not: an unreadable eligibility value renders "cannot tell", which reads
  like caution rather than like a typo.

  Both tabs are seeded into the KB test twin (`TEST_KB_SS_ID`) by
  `_withTestOop_`.

<a id="operator-script-property-spanish-vm-min-seconds"></a>
- **Script Property `SPANISH_VM_MIN_SECONDS`** (optional — operator 2026-09-16).
  An 8x8 A_Q_Spanish voicemail SHORTER than this many seconds is treated as a
  hang-up and never becomes a task card on Metrics → Spanish Inbox. **Unset is
  fine:** `CONFIG.SPANISH_VM_MIN_SECONDS` seeds **5**, so the gate is on from
  the first deploy with no action. Set the property to change the threshold, or
  to **`0` to disable the gate entirely** — that is the escape hatch if 8x8
  restyles its notification body and you want the noise back while the parser
  is fixed.

  The duration is read from the body's `Duration: MM:SS` line (`00:01` is one
  second, not one minute — the samples that set this rule were a 1-second
  hang-up and an 18-second request). Parsed RIGHT-TO-LEFT, so `01:30` and
  `00:01:30` both resolve correctly without the app having to know which form
  8x8 used.

  **It FAILS OPEN, and that is deliberate.** A voicemail whose duration cannot
  be read is SHOWN, never hidden: the body belongs to a vendor who can change
  it in a release note nobody here reads, and the failure that costs a
  Spanish-speaking patient a callback is the silent one (the g41 rule, pointed
  at a source the operator does not even own).

  **What it hides is REPORTED.** The Pending header carries two counts, kept
  separate on purpose: *"N short voicemails hidden (under 5s)"* — neutral, the
  feature working — and *"N voicemails with no readable duration — shown"*,
  warning-toned. **If that second number starts climbing, 8x8 has changed the
  email format and the filter has stopped measuring anything.** One combined
  count could not tell those apart, and a suppressed card is invisible by
  definition. Both render on an EMPTY pending list too, which is the state they
  exist for: "all caught up" with three suppressed voicemails would otherwise
  be indistinguishable from a quiet day.

  **Auto-assign inherits the gate.** `autoAssignSpanishThreads` and its
  scheduled twin distribute whatever `getSpanishInboxPending` returns, so a
  suppressed hang-up is no longer handed to a rep — intended, but it means the
  hourly job's assigned count drops by however many hang-ups the window holds.

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
  on/after the 1st of M+1). **A month with no worked hours credits nothing**
  — correct under an hours rule, and it still writes an audit row so the
  silence is visible.
  **Idempotence is on the HOURS ALREADY PAID FOR, not on "this month was
  processed" (2026-09-15, INV-205).** The auto-managed column-R stamp still
  decides which months are OWED (see below and INV-194), but it no longer
  closes a month against correction: every run re-values the last
  `PTO_ACCRUAL_RECONCILE_MONTHS` (3) completed months against what the
  `PtoAccrualCredit` audit rows say was credited, and tops up the difference.
  So a missing punch approved days after the month closed is picked up on the
  next nightly run rather than lost. The pass only ever credits UPWARD — a
  month that now reads FEWER hours than were credited is reported on
  Admin → Automation Health and the balance is left alone.
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
  **Before you backdate it, run the dry run** (2026-09-14): `previewPtoAccruals`
  from the Apps Script editor prints, per accruing rep, the months owed, the
  hours the Timesheet actually yields for them, the days that are NOT counted
  and why, and the credit that would land — and writes nothing at all. It goes
  through the same `planPtoAccrualRun_` the real job does, so what it prints is
  what tonight's 6pm run will do. Use it to answer the question the audit row
  alone cannot: a rep credited nothing may have taken the month off, may have no
  Timesheet rows under that employee id at all, or may have punches that never
  formed a complete clock-in/clock-out pair. **Recovering a month that was
  wrongly credited zero:** fix the cause first (the punches, or the employee-id
  mismatch), re-run the preview to confirm the hours now read, then set column R
  back to the month BEFORE the one you want re-credited and let the daily job
  pick it up — the credit is a delta onto column I, so it composes with whatever
  the balance already holds. **To look at a month the stamp has already
  closed** — which is every past month, so this is the usual case when something
  looks wrong — run `previewPtoAccruals('2026-08')` with the month you want.
  That reports what the month is worth on the Timesheet as it reads NOW,
  ignoring column R, and marks each rep the stamp has already settled. It is the
  check to run BEFORE rewinding a stamp and again after fixing punches.
  **From the Apps Script editor pick `previewPtoAccrualsLastMonth`** — the
  ▶ Run button passes no arguments, so the month form is not selectable
  there; that wrapper inspects the previous completed month, which is the case
  this usually is. For an OLDER month, paste a scratch function into the editor
  (`function q(){ previewPtoAccruals('2026-05'); }`) and run that — and delete
  it, or the next `clasp push -f` will, since the editor copy is not in the repo.
  **Since 2026-09-15 a closed month is no longer beyond reach automatically.**
  Every credit run re-values the last `PTO_ACCRUAL_RECONCILE_MONTHS` (3)
  completed months against what was already credited and TOPS UP the
  difference, so a missing punch approved after the month closed is picked up on
  the next nightly run without touching column R at all. You only need the
  hand-rewind for a month OLDER than that window. What the pass will not do is
  reduce a balance: a month that now reads fewer hours than were credited is
  reported on Admin → Automation Health as a shortfall and left alone.
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
  written by `saveEmailTemplates` from the Manage → Admin tab's
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
  `saveFeatureFlags` from the Manage → Admin tab's "Feature Toggles"
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
  object `{ eod|urgent|weekly|trainingOverdue|deptReqReminder|managerBrief|selfTest|coachingRecap|spanishAutoAssign|missedPunch|exportCheck|automationHealth:
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
  **Batch 4 (2026-09-18) added the three daily jobs that write NO audit row:**
  `missedPunch` (8am `sendDailyMissedPunchAlerts` — stamps once the read
  succeeded, BEFORE its no-work early return, so a quiet morning is a live
  trigger), `exportCheck` (12pm `runDailyExportCheck` — the export itself
  lands only at a period end as `AdpExportAuto`; the daily CHECK had no
  signal at all, and a dead trigger was a silently missing payroll export)
  and `automationHealth` (9am `sendAutomationHealthDigest` — stamps only
  once a report was computed, so a failing computation reads stale AND
  stamps `AutomationHealthDigest` into `AUTOMATION_LAST_ERRORS`). All three
  are stale past 26h. Each also stamps its own failure (`MissedPunchAlerts`,
  `DailyExportCheck`, `AutomationHealthDigest`), and a stamp under a key the
  JOB_CHECKS table does not know still reaches the failure digest.
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
  approval. No manual setup needed. Two TRAILING columns self-heal onto an
  existing tab: `Action` (B3 — `resume` marks a resume-shift request) and
  **`EndTime` (cycle 22 T3, 2026-09-23)** — the rep's filed FINISH for a
  pending resume, attached when they file an Adjust → Clock Out for that day.
  Leave both alone. A blank `EndTime` on a resume for a day that has already
  ended is why approval refuses it: ask the rep to file their finish, or deny
  the request.
<a id="operator-form-catalog"></a>
- **Form catalog** is configured in
  `CONFIG.CALL_NOTES.FORM_CATALOG` — each entry maps an ID to a
  filename in the repo's `/forms/` folder. Adding a form: upload
  the PDF to `/forms/`, add an entry to FORM_CATALOG with
  `{id, name, fileName, category}`, and redeploy. PDFs are fetched
  via `UrlFetchApp` from the raw GitHub URL
  (`CONFIG.CALL_NOTES.FORM_BASE_URL`). Interactive (fillable) forms
  must also have a rendering function in `form_public.html`.
<a id="operator-the-editor-suite-is-owner-only-cycle-22"></a>
- **The editor suite is OWNER-only (cycle 22 S1, 2026-09-23).** Every runner
  (`runAllTests`, `runAllTestsPartA`/`PartB`, `runSmokeTests`,
  `runSingleTest`), `setupTestEnvironment`, `cleanupTestData` and every
  `test_*` refuses unless the caller IS the script owner:
  `Session.getActiveUser()` must equal `Session.getEffectiveUser()`, both
  non-empty. From the Apps Script editor that is always true, so nothing
  changes for the operator. From the web app it is never true, since the app
  runs as the deployer and every visitor differs, so a rep, manager or admin
  can no longer fire the suite or its helpers from a browser console (they
  could until cycle 22 — see g143). The nightly self-test keeps its
  MANAGER_EMAILS trigger gate and runs as the installer. `INSTANCE_IS_PROD`
  is unchanged: unset still PERMITS the full suite. Treating unset as prod
  waits on standing up the DEV instance, and is still an operator decision.
<a id="operator-stored-formulas-one-time-clean-up-cycle-22"></a>
- **Stored formulas — a one-time clean-up (cycle 22 S2 + F3, 2026-09-23).**
  From this deploy every app write is stored as literal text (g144). Text a
  rep typed BEFORE it, starting `=`, or `+`/`-`/`@` before a word, may be
  sitting in a store as a live formula. **Manage → Admin → System → Stored
  formulas → Scan stores** (`adminScanStoredFormulas`, admin-only, READ-ONLY)
  walks every store the app writes plus every enrolled rep's Call Notes
  Sheet, and lists each formula cell by store, tab and cell. For each hit on
  a tab the app writes, open the cell and put an apostrophe in front of the
  text. A hit on a tab you maintain by hand (Employees, InsurancePayors,
  OopPricing, LocationAcceptance, Offerings) is labelled and may be yours on
  purpose. The CDR Report is not scanned. The result is clean only when it
  says "No stored formulas". A store it could not open, or one it did not
  reach in its four-minute budget, is NAMED; re-run to cover it. Optional,
  never blocking; once the list is empty it never needs running again.
