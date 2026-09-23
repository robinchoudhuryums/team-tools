# Key Design Decisions

Moved out of CLAUDE.md by Batch D1 (2026-09-14). CLAUDE.md keeps a
one-line-per-decision INDEX that links into this file; the entries below are
VERBATIM — only an inline `<a id>` anchor was added to each, so the index can
deep-link and nothing else about the text changed.

Each entry states a decision and the reasoning behind it. They are the record
of WHY the code is shaped as it is; the Invariant Library in `.cycle/config.md`
states what must stay true, and CLAUDE.md's Common Gotchas state what has bitten.


- <a id="multi-tool-registry-with-tab-sub-navigation"></a>**Multi-tool registry with tab sub-navigation.** The `TOOLS` object
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
  server-side** — the Admin-exclusive endpoints (INV-136's list; the generated
  block in the Cycle Workflow Config carries how many) gate on
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
- <a id="tool-view-partials-live-in-their-own-subfolder"></a>**Tool view partials live in their own subfolder.** Time Clock's
  four views (`script_clock.html`, `script_timesheet.html`,
  `script_timeoff.html`, `script_manager.html`) are under `web-app/tc/`
  and `include`d as `tc/script_clock` etc. from `index.html`. Apps
  Script supports `/` in filenames and renders them nested in the
  editor; clasp pushes the subdirectory verbatim (works because
  `.clasp.json` has `skipSubdirectories: false`). New tools should
  follow the same pattern: `web-app/<tool-shortname>/script_*.html`.
- <a id="one-config-object"></a>**One `CONFIG` object** in `web-app/00_config.js` (it was `Code.js` until Batch F2 split the server) holds all
  tunable values (windows, thresholds, automation hours, feature
  flags). Adjust behavior by editing CONFIG rather than
  parameterizing functions. Exception: `DEPARTMENT_EMAILS`,
  `STATE_TAX_RATES`, and `UPDATE_SUGGESTIONS_BY_DEPT` are now read
  through getter helpers (`getDepartmentEmails_()`,
  `getStateTaxRates_()`, `getUpdateSuggestions_()`) that check
  Script Properties first, so they can be edited via the Admin tab
  without a redeploy.
- <a id="audit-log-is-append-only"></a>**Audit log is append-only**, one row per state-changing action,
  with the actor email recorded for manager operations. Dashboard
  reads are bounded to the last ~20 rows to stay within Apps
  Script quota and execution-time budgets.
- <a id="best-effort-email-notifications"></a>**Best-effort email notifications.** Email failures never block
  or fail the API call that triggered them — the spreadsheet write
  is the source of truth; the email is a convenience.
- <a id="the-editor-suite-is-sharded-into-three-registrars-and-its-ex"></a>**The editor suite is SHARDED into three registrars, and its expected count is
  DERIVED (Batch S, 2026-09-11).** `_runAllTests` is `_registerSmokeTests_` (118)
  + `_registerIntegrationA_` (91 — Time Clock punches / adjustments / PTO / the
  adjust queue / managerSaveDay) + `_registerIntegrationB_` (107 — Call Notes,
  forms, metrics/CDR, KB, training + docs + coaching, intake, trigger gates,
  audit rows). `runAllTests` runs all three in ONE execution as before;
  `runAllTestsPartA` (smoke + A) and `runAllTestsPartB` (B) go through
  `_runSuitePart_` (prod guard, own setup + cleanup in `finally`) so a mid-shift
  run can be split across two executions rather than contending for the one
  project ScriptLock — **together they are exactly `runAllTests`**, which holds
  only because every test at a shard boundary clears its own state
  (`_clearTestState` / `_clearTestCallNotes`), verified per boundary and pinned as
  a disjoint-union. **No entry point carries a typed-in count:** a
  `_TEST_COUNTING` mode makes `_smokeTest`/`_integrationTest` record the name and
  return before `_test`, `_expectedTestCount_(parts)` walks the requested shards,
  and `_printSummary` prints `Expected: N registrations (S smoke · A · B)` plus a
  `⚠ Recorded X of N` line on a short run and `⚠ Duplicate registration name(s)`
  by name — so the count is read off the run, never off a doc (the figure in this
  file has drifted before). `_suiteEnvCheck_` runs as the FIRST statement of
  `setupTestEnvironment` — before the prod guard, so the log explains a refusal —
  and prints the `── Suite environment ──` block naming every deployment setting
  the outcome depends on: the instance markers and the app's own
  `isDevInstance_`/`isProdInstance_` verdict, `ADMIN_EMAILS` classified through
  `_testAdminEmailsSplit_`, `MANAGER_EMAILS` and whether the test manager is
  listed, the four fixture properties, the three save/restore properties, the
  store ids, and the three TEST roster rows. It reads only and never throws. The
  runbook that goes with it is smoke on prod, full on dev nightly.
- <a id="smoke-vs-integration-tests"></a>**Smoke vs. integration tests.** `runSmokeTests()` is safe to run
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
  in-memory + CacheService CDR caches around each). **Three editor-test hazards — the first two found by the cycle-14 run
  after `runAllTests` had not been run since cycle 10.** (a) **A test that
  writes "today" in a TARGET employee's tz is time-of-day dependent.**
  `managerSaveDayRange_appliesAcrossDays` built its range in `CONFIG.TIMEZONE`
  (Asia/Kolkata) but targeted the PH employee, and the INV-05/L-4 guard
  evaluates "is this slot time still in the future" in the TARGET's tz — so any
  run before 09:00 Manila failed on a CORRECT guard. It had been silently flaky
  since cycle 9. Windows that don't need today should end YESTERDAY; a test that
  genuinely needs the boundary must derive its times from the target's own clock
  and SKIP near midnight there. **The class bit AGAIN on its post-deploy debut
  (2026-08-21), through a different door — MIXED-FRAME DERIVATION:**
  `submitTimeOffRange_weekendSkipAtomicCaps` picked its Monday anchor via
  `base.getDay()` (SCRIPT tz, Chicago) but formatted its labels in
  `CONFIG.TIMEZONE` (Kolkata, ~+10.5h), so any run after ~13:30 Chicago shifted
  every label +1 day — its "sat..sun" range was really Sun..Mon, the server
  CORRECTLY wrote the Monday, and the failure looked like a weekend-skip bug.
  The rule: a test derives day-of-week AND the label from the SAME tz frame
  (`Utilities.formatDate(d, tz, 'EEE')` beside the `'yyyy-MM-dd'`), stepping
  days as exact 24h ms — never `getDay()` beside a `formatDate` in another zone. (b) **A fix that closes a creation path breaks
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
  before anyone saw it. (c) **A test whose fixture MONTH can overlap another test's fixture DATES is
  calendar-dependent (operator run, 2026-09-01).** `test_creditPtoAccrual_
  seedCreditIdempotent` writes two 8-hour days into the month being credited
  and asserts the credit those 16 hours imply. But the accrual reads EVERY
  Timesheet row that employee has in the month, and `_TEST_DATE_OLD` /
  `_TEST_DATE_VERY_OLD` are today−14 / today−20 — so on any run in the first
  three weeks of a month, other tests' punches for the SAME employee land
  inside the credited month and the assertion is measuring more than its own
  fixture. Written on 2026-08-19 it passed (last month was July, the old dates
  were August); on 2026-09-01 it credited 35h against an expected 16 and read
  as an accrual bug. The test now clears that employee's rows for the whole
  credited month before writing its fixture. The general rule is the date-axis
  sibling of hazard (a): **a test that pins an amount derived from "the rows in
  a window" owes that window an isolation step**, because the shared fixture
  employee is written by dozens of other tests. It is also the sharpest
  argument for running the suite on the DEV instance — on a real roster those
  extra rows would be a real rep's real hours.
  **A MID-SHIFT full run races LIVE traffic for the
  ONE project ScriptLock — a lock timeout in a locked-endpoint test is
  ENVIRONMENTAL, not a regression (operator run, 2026-08-28 post-deploy).**
  Every mutating endpoint shares one `waitLock(15000)` lock (INV-01), and with
  real agents on the app a live punch/note write queuing ahead can push a
  test's wait past 15s — `punchAdjust_submitApproveWritesPunch` failed exactly
  this way ("Lock timeout: another process was holding the lock for too long")
  on a 2:13–2:32 PM CST run that took 18.7 min (the documented quiet-window
  figure is ~6), with ZERO commits touching that path since its last green
  run. The classification test: the verbatim lock-timeout message + no code
  change on the failing path = re-run, don't debug. The flip side is why the
  advice is a QUIET WINDOW rather than a retry loop: while the suite runs,
  LIVE punches queue behind TEST writes too — run `runAllTests` before the
  CST shift or in the ~6pm CT all-team quiet window (the INV-153 reasoning),
  and a retry-once in the test would only mask genuine deadlocks.
  **TWO OVERLAPPING `runAllTests` EXECUTIONS CORRUPT EACH OTHER AND LEAVE
  RESIDUE THAT OUTLIVES BOTH (operator 2026-09-04 — ▶ pressed twice).** The
  editor lets executions overlap, and the suite's fixtures assume exclusive
  ownership: the twin's `_clearTestState` deletes rows this run just wrote
  ("Those rows are out of bounds" from a bottom-up `deleteRow` walk whose
  snapshot is stale, "Request not found", "Note not found", an audit count
  that drops from 6 to 0 inside one test, KB/HR fixture rows vanishing
  mid-test) — 30 failures with ZERO code change. The shape that OUTLIVES the
  run: `test_adminEmails_subsetOfManagersEnforced` restores the property it
  read at its start, and the second run read the first run's TEMPORARY test
  address, so `ADMIN_EMAILS` was left at `do-not-send-india@example.invalid`
  — the next solo run then failed every admin-gated endpoint (`kbSaveItem`
  included, which surfaces only as "item created" false) and its own
  adminEmails test put the residue back. A twin stopped by hand or by the
  execution limit also skips `cleanupTestData`, so its `TEST_` rows are
  inherited by the next run. Three self-heals since: `setupTestEnvironment`
  DELETES an `ADMIN_EMAILS` holding only `@example.invalid` addresses (never
  a real one — and since 2026-09-11 it APPENDS the test manager to a REAL
  list for the run while `cleanupTestData` strips it back out, because the
  SAME ten failures fired on the operator's own narrowed Admin tier, which
  this self-heal correctly refused to undo; see the `ADMIN_EMAILS` operator
  entry), the two `selfDeletePunch` tests clear the manager's state
  instead of assuming it, and `_clearTestCallNotes` tops the fixture tab's
  grid back up to `_TEST_CN_MIN_GRID_ROWS` (deleteCallNote shrinks it one row
  per run; at two rows with row 1 frozen, deleting the only note is REFUSED by
  Sheets — `cn_deleteCallNote_basic` passed or failed by whether a neighbour
  had regrown the grid). The classification rule: a failure set spanning
  unrelated stores with no commit on any failing path = look for a second
  execution in the Executions panel, then re-run ALONE.
  **A GATE test must assert the shape its endpoint
  RETURNS (post-deploy 2026-08-25).** A READ gate returns a bare `{error}`
  (`getReferenceTree`, `searchReference`, `getTeamMetrics`,
  `searchInsurancePayors`…); a WRITE gate returns `{success:false, error}`
  (`kbRecordView`, `kbFlagItem`, `intakeSendPPD`). `_assertFailure` requires
  `success === false`, so pointing it at a read FAILS AGAINST A CORRECT
  REJECTION — which is exactly how `insurance_search_requiresEmployee`
  reported red on its first live run, with `{"error":"Not authorized."}`
  printed as the "failure". Assert `r.error` for a read. Now pinned by the
  derived GATE-SHAPE tripwire, which resolves each
  `_assertFailure(<var>, 'Not authorized')` back to the endpoint that test
  called through `_asUser` — its first, coarser form flagged every endpoint
  called anywhere in the body and false-alarmed on a sibling read the same
  test asserts correctly, so it links the asserted VARIABLE to its call (a
  pin that nags on correct code is the INV-186 class).
  **And it must assert the right TIER (post-deploy 2026-08-25, same day).**
  The omnibus `test_managerGates_rejectNonManager` picks its expected message
  from a hand-maintained `ADMIN_GATED` map, so an endpoint added to the case
  list but not to that map is asserted against `'Manager access'` and fails on
  a CORRECT admin rejection — how `getKbDataTables` reported red hours after
  the shape sibling above. Note the reporting shape: `_assertContains` throws,
  so the forEach stops at the FIRST mismatch and the single reported failure
  was masking three (`kbImportDataTable` and `kbIngestFile` too). Pinned by the
  derived GATE-TIER tripwire, which links every omnibus case to the tier its
  endpoint actually enforces in `Code.js` and fails in BOTH directions — an
  admin endpoint missing from the map, and a manager endpoint listed in it. The
  same hand-list-falls-behind class as INV-171, one level down. **Mid-body skips
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
- <a id="pto-bucket-state-lives-in-the-employees-sheet"></a>**PTO bucket state lives in the Employees sheet** (columns
  I/J = AnnualLeaveBalance / SickLeaveBalance; column K =
  PtoEnabled per-employee toggle). Time-off rows in
  TimeOffRequests don't carry balance — they trigger balance
  updates on approve/revert transitions.
- <a id="per-employee-pto-opt-out-via-emp-pto-enabled-column"></a>**Per-employee PTO opt-out via `EMP.PTO_ENABLED` column.**
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
- <a id="the-accrual-credit-is-idempotent-on-hours-paid-not-on-months"></a>**The accrual credit is idempotent on HOURS PAID, not on months processed — and the ledger is the audit row (operator 2026-09-15).**
  The column-R stamp is what makes a DAILY credit of a MONTHLY entitlement safe:
  a re-run owes nothing, and a missed run catches up. But it also froze each
  month's valuation at the instant of the first run after the 1st — and the
  Timesheet is not final then. A missing-punch adjustment approved on the 3rd, a
  manager day edit, a direct Sheet edit (which this project supports by design)
  all landed afterwards and were lost with no error and no retry. It fired: all
  three PH reps credited ZERO for 2026-08 on days closed by approvals days
  later. See the gotcha for the general rule about idempotency keys.

  **The reconciliation.** Every run re-values a trailing window of completed
  months (`PTO_ACCRUAL_RECONCILE_MONTHS`, 3) and credits the DIFFERENCE in days,
  so the running total always equals `days(total hours)` and a re-run credits
  nothing. Late data heals itself on the next nightly pass, with an audit row
  that names itself a top-up and says what changed.

  **The ledger is the `PtoAccrualCredit` audit rows themselves**, not a new tab.
  They already record the hours and the month-set; the log is append-only and
  never purged; a second store is a second thing that can disagree with the
  first. Two costs, both paid explicitly: the note format became a CONTRACT, so
  the builders and `parseAccrualLedger_` are a mirror pair with a round-trip pin
  (the pin caught a real defect on its first run — the parser read capture group
  2 of a one-group regex); and the row became load-bearing, so all three accrual
  writes moved from `writeAuditLog_` to `writeWitnessAuditLog_`, because a
  dropped row reads as "never credited" and would re-credit the whole month.

  **Three properties that generalise to any reconciliation.** UPWARD ONLY — a
  month that now reads FEWER hours than were credited is a reported shortfall,
  never a claw-back; a script does not quietly take PTO off a balance, and a
  deleted punch needs a person. FAIL CLOSED — a month-set outside the window,
  hours that will not compute, or a ledger read that never reached past the
  window are reported and skipped, because "cannot read what was credited" must
  not collapse into "nothing was credited". And ONE READ — the window rides the
  resolver's existing range rather than opening a second full-sheet read inside
  the ScriptLock (the C17-9 rule), while the ledger reads a bounded tail of the
  AuditLog and says so when the tail was not long enough.

  A casualty worth recording: pass 3's range-wide fast path (`if
  (p.months.length === 1) use rec.hours`) is gone. It was correct only while the
  range WAS the single owed month, and the window widened it — a shortcut that
  is right until an unrelated parameter changes is a defect on a schedule.

  **Not chosen: a grace period.** Delaying the credit to the 5th moves the cliff
  rather than removing it — an approval on the 6th is still lost, data corrected
  months later is still lost, and every legitimate credit is delayed for a rare
  case. The top-up subsumes it.

  **Batch 4 (2026-09-18, F-19): the ledger row is PER MONTH.** A catch-up
  credit (a first credit, a re-enabled rep) covered several months in ONE row
  keyed `2026-06,2026-07`, and the reconcile pass — which values months INSIDE
  its 3-month window — reported that key as unreconcilable every day for months
  once one member aged out. Now `accrualMonthRows_` turns one plan into one
  plan-shaped entry per month, the unchanged note builders write a single-month
  `months=`, and the ledger's keys are per month by construction. The rep's
  earned total is the SUM of the per-month roundings (`accrualEarnedByMonth_`)
  rather than a once-rounded total — they differ by ≤0.01 day per extra month,
  and the ledger must add up to the balance moved; the preview shares the sum,
  so it cannot promise a different amount than the job lands. A legacy
  multi-month key (none is expected in production) names itself when skipped.
  F-46 in the same batch made the reconcile stamp honest on EVERY path: the
  early returns (tracking off, no accruing reps) rewrite it to an empty pass
  with a `reason` and clear the job's error, so a stale shortfall stops
  alarming after the toggle.

- <a id="the-accrual-dry-run-shares-the-one-resolver-and-writes-nothin"></a>**The accrual dry run shares the ONE resolver and writes nothing (`previewPtoAccruals`, operator 2026-09-14).**
  `creditMonthlyPtoAccruals` runs unattended at 18:00 manager-tz, credits real
  leave balances, and advances a stamp that closes the month against retry. Its
  audit row is the only window into it, and that window is *after the fact* —
  when a live `2026-09-01` run recorded a rep at zero hours, the operator could
  neither tell WHY nor get the month back without hand-editing column R.
  `previewPtoAccruals` is the before-the-fact answer: manager-gated, read-only,
  and reporting per rep the months owed, the hours the Timesheet actually
  yields, the days NOT counted and why, and the credit that would land.

  **Two properties make it worth trusting, and both are pinned rather than
  intended.** First, it is not a second implementation: the decision half of
  the credit was extracted into `planPtoAccrualRun_`, which both functions call
  and neither duplicates — the g59 rule (a DRAFT preview goes through the ONE
  resolver) applied to payroll, because a preview that re-derives the plan
  reassures the operator about arithmetic nobody runs and drifts from the real
  job on the first policy change. Second, it writes nothing: no `setValue`, no
  `adjustLeaveBalance_`, no `writeAuditLog_`, in the preview OR the resolver,
  asserted directly on both bodies. "Nothing was written" is a claim an operator
  acts on, so it is checked, not asserted in a comment.

  Two deliberate differences from the credit. It takes NO ScriptLock — a
  diagnostic that queues behind (and ahead of) live punches costs more than it
  is worth, and the trade is that a preview taken mid-run can read half-applied
  state, which is why the job remains the record. And it does not short-circuit
  on the `enablePtoTracking` flag the way the credit does: "nothing will happen,
  and here is the switch that is off" is the more useful answer to an operator
  asking why nothing happened, so the flag is reported instead.

  Run it from the Apps Script editor (the formatted summary lands in the
  execution log via `text`); the structured `reps` array is there for a future
  manager surface, which is deliberately NOT built yet — the editor is where
  this question gets asked today.

  **INSPECT MODE — `previewPtoAccruals('2026-08')` (2026-09-15).** The first
  live run found the gap in the paragraph above: all three accruing reps were
  stamped through 2026-08, so the preview reported "nothing owed" for every one
  of them. That is TRUE and useless — the column-R stamp closes a month
  permanently, so the month an operator most wants to look at is precisely the
  one an owed-months report cannot see. A forward-looking tool answering a
  backward-looking question.

  Inspect mode reports what ONE completed month is worth on the Timesheet as it
  reads NOW, ignoring the stamp. It rides the same resolver (a third parameter
  replaces the owed-month list and changes nothing else — same inclusion
  predicate, same rate parse, same per-row PTO gate), so an inspection sees
  exactly the population a credit would.

  **Ignoring the stamp is the point, so the report says it is doing that.** The
  header names the month and states column R was ignored; every rep whose stamp
  already settles that month is marked SETTLED with the remedy on the same line;
  the total is phrased as a valuation ("Total 2026-08 is WORTH"), and the
  "re-run creditMonthlyPtoAccruals to apply" line is deliberately absent. Hours
  that are worth something and will never be paid must not read as a pending
  credit — the honest-failure family pointed the other way: not a degraded read
  rendering as data, but a hypothetical rendering as a commitment.

  **The editor cannot pass an argument, so the inspect form needs an entry
  point** (`previewPtoAccrualsLastMonth`, 2026-09-15). The Apps Script ▶ Run
  button invokes the selected function with none, so `previewPtoAccruals('…')`
  is unreachable from the one place an operator runs it — the feature shipped
  in a form nobody could invoke, which is the same defect class as an unusable
  preview, one layer out. The wrapper takes the PREVIOUS completed month
  because that is the question that recurs; an older month still needs a
  scratch function, which is fine for a rare case. Its month is DERIVED from
  `accrualMonthsToCredit_('', nowYm).newStamp` — the seed path already means
  "the last complete month", year boundary included — rather than composed,
  because a second piece of month arithmetic is a second definition of the
  accrual period. It carries its own INV-44 gate rather than inheriting one:
  the refusal should name what the caller actually invoked.

  Both guards REFUSE rather than degrade, and the guard is a PURE helper
  (`accrualInspectMonthError_`) for a reason worth recording: written inline
  first, its pin asserted only that the error message appeared in the source,
  and a bite-check that deleted the `if` around it left the harness green. A
  guard a pin cannot RUN is a guard nobody has checked.
- <a id="self-undo-vs-adjust-split"></a>**Self-undo vs. Adjust split.** Live mistakes within 5 minutes
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
- <a id="resuming-a-closed-day-converts-the-clock-out-into-a-break-it"></a>**Resuming a closed day CONVERTS the clock-out into a break — it never
  deletes it (B3, operator 2026-09-01).** A rep whose day shows "Shift complete
  for today" and who is working again — asked to stay late, called back, or
  clocked out by mistake — had no path at all except asking a manager to edit
  the sheet. **The obvious implementation is the wrong one:** removing the
  ClockOut so the day reopens silently PAYS the rep for every hour between
  clocking out and coming back. That is harmless for a mistaken clock-out
  resumed a minute later and a payroll error for the case the operator actually
  described (finished, went home, was asked to come back), and nothing on screen
  would show the difference. So approval CONVERTS: the ClockOut row keeps its
  TIME and becomes an `ADJ-LunchOut`, and an `ADJ-LunchIn` is written at the
  requested resume time. The away gap is a break, which is unpaid — the truth in
  both cases, exact to the minute in both, and needing NO new arithmetic,
  because `calcHours_` deducts every break pair since the 2026-09-01 multi-break
  round (INV-176). It is only expressible at all because of that round; before
  it, a second pair was silently discarded. Details worth keeping:
  it rides the ORDINARY approval queue (the operator's rule — no employee
  self-adjust without approval), so nothing changes until a manager says so;
  `PunchAdjustRequests` gained a TRAILING **`Action`** column (`''`/`set` =
  the ordinary punch write, `resume` = this — the header self-heals, and all
  four readers normalize at their one read, the DR.STATUS/INV-183 discipline);
  the clock-out's existence and the resume time's ordering are validated at
  SUBMIT **and re-validated at APPROVAL**, because the day can be edited while
  the request waits and converting a clock-out that is gone would leave an
  unpaired LunchIn that `breakPairs_` correctly drops — silently costing the rep
  the whole reopening; a refused resume returns `{success:false}` rather than
  marking the request Approved. **Every surface states the EFFECT rather than
  naming the punch it consumes** — the rep's confirm ("your 5:00 PM clock-out
  becomes a break that ends now, so the time you were away is unpaid"), the
  pending chip ("Resume shift · back at 19:00", never "Clock Out 19:00"), the
  manager queue row ("clock-out becomes a break — the gap is unpaid"), and the
  decision email. The button renders only when there IS a clock-out to convert
  and no resume is already pending. **A genuine SECOND SHIFT (a distinct
  clock-in/clock-out pair on one date) is still NOT supported** —
  `getNextActions_` collapses it and both repair paths treat a repeated clock
  punch as damage; this is deliberately the resume of ONE shift, not a
  multi-shift model. Verify: the three Workstream-B pins, the three DOM tests,
  and `test_punchAdjust_resumeConvertsClockOut`.
  **AMENDED (cycle 22 T3, 2026-09-23): the FINISH rides the resume request,
  and a past-day resume with no finish is refused.** Converting the clock-out
  leaves the day OPEN from the resume time. That is right while the rep is
  still working today, since they clock out live. For a resume approved AFTER
  its day has ended, though, the day stayed incomplete forever: the rep's
  real finish had been filed as an Adjust → Clock Out, and the duplicate
  guard refused it because a clock-out request was already pending (the
  resume, which targets the ClockOut). Two separate requests would also make
  approval ORDER matter. So a Clock Out filed for a day whose resume is
  pending now ATTACHES to that request as its finish.
  `PunchAdjustRequests` gains a trailing self-healing **`EndTime`** column,
  read through `parEndTime_`, which returns '' for absent, blank, short-row or
  junk. A finish at or before the resume time is refused by name. At approval,
  `resumeShiftForEmployee_` refuses a past-day resume with no finish BEFORE
  any write and names the way out. Otherwise it converts, then writes the
  finish as the day's new Clock Out. A same-day resume with no finish is
  unchanged. Every surface says which case applies: the manager card ("back at
  19:00 · finished 21:15" or "no finish filed yet"), the rep's pending chip
  (never naming the consumed Clock Out), the Adjust toast and the decision
  email. Verify: the T3 Node/DOM pins and the rewritten
  `test_punchAdjust_resumeConvertsClockOut` (refuse → attach → approve → an
  11 h complete day).
- <a id="punch-adjustment-requests-are-a-timeoffrequests-style-queue"></a>**Punch-adjustment requests are a TimeOffRequests-style queue (#4a).**
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
  **THE FEEDBACK LOOP AROUND IT (operator 2026-08-31 — three gaps, one
  report).** A rep forgot to clock in, requested a same-day fix, the manager
  approved it, and their dashboard still offered **Clock In**. The SERVER was
  right the whole time — an approved `ADJ-ClockIn` is a real punch, so
  `getTodayPunches_` includes it (`normalizeType_` strips the prefix) and
  `getNextActions_` returns Lunch Out / Clock Out. Nothing ASKED it: the
  three gaps were (a) the Clock view reconciled only on view-enter,
  focus/visibilitychange and day rollover, so an agent on a focused Dashboard
  never re-fetched; (b) a submitted request was visible ONLY inside the Adjust
  modal, so the rep saw a bare punch button and the natural move was to punch
  again "to be safe" (not destructive — the approval UPDATES the existing row
  — but nobody was told that); (c) **`updatePunchAdjustStatus` notified
  NOBODY** — adjustments were the one request type with no email, and a DENIAL
  was indistinguishable from an approval that had not propagated. Fixed as:
  **`clkPeriodicReconcile_`** (throttled `CLK_RECONCILE_MS`=3min, riding the
  EXISTING 1Hz tick per INV-190's cost rule — no second interval — gated to
  the Clock view being open AND visible, so nothing polls from Call Notes or a
  background tab; `clkRefreshState_` stamps the window on EVERY refresh so
  enter/focus/rollover all postpone it and an in-flight refresh is never
  re-queued); **`empPendingAdjustments_`** on `getEmployeeState` (today-scoped,
  RANGE-bounded like `empIsOffToday_`, NEVER provisions the tab — this is the
  app's hottest endpoint — status normalized at the one read, failing toward
  `[]` = the pre-fix behaviour) rendered by **`clkPendingAdjustHtml_`** as an
  info chip ABOVE the punch buttons (`role="status"`; renders NOTHING when the
  list is empty or the field absent, so an older server is unchanged); and
  **`notifyEmployeeOfAdjustDecision_`** on BOTH outcomes, deferred past
  `releaseLock` via the `notifyAfter` closure (M-7) and best-effort (INV-14).
  Scope note for the general question this raised: **time-off decisions have
  always emailed** (`notifyEmployeeOfDecision_`), and coaching / EmpDocs /
  training assignment all notify — punch adjustments were the ONLY hole, so
  this closes the set rather than starting a notification subsystem.
  **WORKSTREAM B (operator 2026-09-01) closed the other three gaps in the same
  loop.** (B1) The shift-complete state's Adjust button now PREFILLS the punch
  type: that state is derived from a trailing ClockOut, so the punch a rep is
  there to add is a ClockIn, and `openAdjustModal(prefillDate, prefillType)`
  validates the type against the select's OWN options (the prefillDate
  precedent) after RESETTING it — a `<select>` keeps its last value, and every
  other field in that modal is cleared on open, so a stale prefill would leak
  into an unrelated visit. (B2) `submitPunchAdjustRequests` notified NOBODY: it
  wrote its Pending rows, audited, and returned, while the queue lives inside
  the manager dashboard — so a request was seen only if a manager happened to
  look, and the rep waited believing it was with their manager.
  `notifyManagersOfAdjustRequests_` is branded, PHI-free, best-effort (INV-14)
  and deferred past `releaseLock` (M-7). (B3) **The RESUME path** — see its own
  Key Design Decision below.
- <a id="normalizetime-as-the-universal-read-shim"></a>**`normalizeTime_` as the universal read shim.** Because Sheets
  auto-coerces time strings to Dates on read, every read of
  `row[ADP.TIME]` goes through `normalizeTime_`. New code must
  follow this pattern; raw `String(row[ADP.TIME])` is a bug.
- <a id="timezone-display-split"></a>**Timezone display split.** Each row in the manager dashboard
  shows the employee's last punch in BOTH the employee's local
  tz (e.g. IST/PHT) and the manager's tz (CST). All conversions
  go through `convertDateTime_`; abbreviations come from
  `TZ_ABBR` with passthrough for unknown zones.
- <a id="secrets-via-script-properties"></a>**Secrets via Script Properties.** `ADP_SS_ID`, `MANAGER_EMAILS`,
  `CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`, and
  `CN_UPDATE_SUGGESTIONS` are read from Script Properties first (set
  in Apps Script editor → Project Settings → Script Properties, or
  via the Admin tab for the latter three), falling back to the
  placeholders in CONFIG. This lets the repo stay clean of real
  values without manual scrubbing on every `clasp pull`, since
  Script Properties live on the deployed project and are never
  touched by clasp.
- <a id="web-app-runs-as-the-deployer-open-to-anyone-anonymous"></a>**Web app runs as the deployer, open to ANYONE_ANONYMOUS.**
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
- <a id="design-tokens-are-the-single-source-of-truth-for-color-typog"></a>**Design tokens are the single source of truth for color,
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
- <a id="colour-palettes-are-a-second-attribute-overlay-orthogonal-to"></a>**Colour palettes are a SECOND attribute overlay, orthogonal to light/dark
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
- <a id="dark-mode-is-an-attribute-overlay-not-a-separate-stylesheet"></a>**Dark mode is an attribute overlay, not a separate stylesheet.**
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
- <a id="chrome-icons-are-svg-via-icon-name-size-from-script-icons-ht"></a>**Chrome icons are SVG via `icon(name, size)` from
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
- <a id="the-two-stage-0-partials-are-the-shared-foundation-for-futur"></a>**The two Stage-0 partials are the shared foundation for future
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
- <a id="compact-mode-is-a-shell-level-attribute-not-per-tool-css"></a>**Compact mode is a shell-level attribute, not per-tool CSS.**
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
- <a id="pop-out-uses-a-per-tool-named-window-target"></a>**Pop-out uses a PER-TOOL named window target.** `popOutCurrentView()`
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
- <a id="per-rep-call-notes-sheets-are-the-storage-substrate"></a>**Per-rep call-notes Sheets are the storage substrate.** Same
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
- <a id="team-member-onboarding-is-an-admin-flow-operator-request-202"></a>**Team-member onboarding is an Admin flow (operator request 2026-08-07,
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
- <a id="settings-live-behind-one-gear-in-a-flyout-panel-operator-202"></a>**Settings live behind ONE gear, in a flyout panel (operator 2026-08-13).**
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
- <a id="view-as-is-an-admin-only-session-only-client-only-preview-op"></a>**View-as is an ADMIN-ONLY, SESSION-ONLY, CLIENT-ONLY preview (operator
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
- <a id="the-slow-tabs-paint-last-good-instantly-and-refresh-behind-t"></a>**The slow tabs paint last-good INSTANTLY and refresh behind the pill
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
  endpoint — gained the sibling endpoint result cache (`team_metrics_v2:
  <from>:<to>`, org-wide since every manager sees the same aggregate,
  `CDR_CACHE_TTL`, `_TEST_OVERRIDE_CDR_SS_ID` bypass), with the put gated on
  a CLEAN round (`!noteCountPartial && !transferMeta.error` — INV-129: a
  degraded aggregate is never pinned for the TTL; a deployment with no
  Transfer tab simply stays uncached). First-load-of-the-day on the Spanish
  tab is still Gmail-bound — that read is deliberately live (INV-31).
  **EXTENDED 2026-08-28 (#2/#3 — operator: "Training and Manage take longer
  to load", then "check Team Notes next"):** the same session-state SWR now
  covers Training (My + Team — the five-RPC fan-in paints from TRAIN_STATE),
  Manage Time (mgrData — the app's heaviest live read), and Team Notes' two
  queue fetches + the per-DATE Stats cache (cross-rep Sheet walks). Shared
  rules across all of them: state writes land BEFORE the render guard
  (nothing is lost to a deferred render), a background refresh never wipes
  in-progress interaction (`trainMgrFormDirty_` / `mgrSwrRenderBlocked_`;
  Team Notes caches only CLEAN rounds so a degraded round is never the
  instant paint — INV-129/187), a failed refresh keeps last-good via a warn
  toast (C17-5) while cold failures keep the error card, and
  first-load-of-session is unchanged. Per-Rep + Search stay fetch-on-demand
  by design. Pinned by the PERF + TN-SWR pins.
- <a id="pre-pilot-observability-round-operator-2026-08-13-i-want-to"></a>**Pre-pilot observability round (operator 2026-08-13 — "I want to know what
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
  (**admin-gated**, INV-136 — one of the admin-tier set; the generated
  block in the Cycle Workflow Config carries its size) tail-scans
  `VIEW_USAGE_SCAN_MAX`=8000 rows and aggregates via the pure, Node-pinned
  `viewUsageAggregate_(events, cut7, cut30)` → per-view 7d/30d counts +
  distinct reps + per-rep totals with top view; rendered as a **Feature
  usage** panel on Admin → Overview (`cnUsagePanelHtml_` — bar rows resolved
  to TOOLS-registry labels via `cnUsageViewLabel_` with a raw-key fallback,
  every string `esc()`'d, `truncated` surfaced, Open↗ deep-link to the tab,
  stacking at ≤700px per A2). Pinned by the five observability-round Node
  tests (all bite-checked) + the `getViewUsageStats` omnibus gate case.
  **BOOT TIMING rides the same row (operator 2026-09-04 — "can the app be
  warmed up before each shift?").** The answer to that question was NO in the
  form asked: a pre-shift trigger cannot reach the browser (the app has no
  background presence — the reminders reasoning), every boot read is keyed to
  the CALLER (`getEmployeeState`, the dashboard/pending-tasks/metrics caches
  are per employee id and the only impersonation seam is the test-only
  override), and the shared caches it could fill (roster, CDR agent metrics,
  KB tree, build hash) live 5 minutes — cold again at shift start. Nothing
  measured which phase a cold boot spends its time on, so a warm-up would
  have been built against a guess. The client now stamps three durations off
  the iframe's own navigation start (`performance.now()`): `state` (the
  `getEmployeeState` round trip alone — stamped BEFORE the call is issued, so
  a synchronously-answered RPC still measures), `shell` (until the shell +
  landing view are mounted) and `view` (until the landing view's FIRST real
  data paint — `bootFirstPaint_()`, called by the Dashboard's card render and
  the Call Notes form render, the two realistic landing tabs; ignored for any
  other view and after the first paint). They ride `recordViewEnter`'s 3rd
  arg on the LANDING view's usage row — `recordViewUsage_` DEFERS that one
  row while `BOOT_T.arming` (the throttle stamp still lands) and
  `bootTimingSend_` fires it once at first paint or on a 20-second fallback
  with `view: null` — so there is no second endpoint and no second row. Server:
  `viewUsageTimingCell_` (pure) drops a null/blank/negative/over-cap phase —
  **`Number(null)` is 0, and the first draft recorded the fallback send's
  `view: null` as a confident 0 ms paint; BOOT-1 caught it** — and writes a
  JSON cell in a trailing `BootTiming` column (header self-heals);
  `viewUsageAggregate_` folds the 7-day window only (a month-old boot
  describes a build that may no longer be deployed) into `boot.{n7, shell,
  state, view}` as median + p90, null when nobody reported that phase
  (INV-187). The panel renders one "Startup time · 7d" line, em dash per
  unreported phase, and says the sign-in redirect is not included. The other
  half of the answer is operational and needs no code: **an open tab or the
  pinned pop-out left overnight IS the warm start** — the Clock view reconciles
  on day rollover and focus, and the SWR caches paint instantly — so the
  pop-out tooltip now says so. If the figures show the CDR-backed dashboard
  cards dominate, a pre-shift trigger CAN fill the 6-hour dashboard cache for
  every rep (that one cache outlives the lead), which needs the builder to
  take an employee rather than the caller — a logged follow-on, gated on the
  numbers. Pinned by BOOT-1 (sanitizer/parser/aggregate behavioural), BOOT-2
  (the wiring + ordering + both paint hooks + the panel's em dash) and the
  BOOT-DOM test (deferred at enter, ignores a foreign paint, sends ONCE with
  all three figures, plain navigation carries none).
- <a id="deploy-version-beacon-open-clients-prompt-to-reload-after-a"></a>**Deploy-version beacon — open clients PROMPT to reload after a New-version
  deploy (operator 2026-08-27).** A deploy updates the SERVER half instantly
  (every `google.script.run` call runs the newly deployed code), but an open
  tab keeps the CLIENT it booted with until reload — for most agents, the next
  morning. `clientBuildHash_()` fingerprints the served client (MD5 over
  `index.html`'s RAW template content plus every `include('...')` target
  DERIVED from it — INV-179: no version constant to forget to bump, and a new
  partial is covered the day it ships; memoized per execution + CacheService
  `client_build_hash_v1`, 5-min TTL). `doGet` stamps the page
  (`window.SERVER_BUILD_STAMP`, the INV-78 unescaped-`<?!=` pattern; catch →
  `''` so a hash failure can never break boot), and the shell's
  `buildStampTick_` — riding the 60s reminders ticker per INV-190's cost rule,
  ABOVE its early-returns and OUTSIDE the day-off gate (per-branch rule: a
  stale client on a Saturday is still stale) — polls the rep-gated
  `getDeployStamp` every ~15 min. On mismatch: ONE sticky toast per session
  with a real Reload button (`showToast`'s additive `actionLabel`/`onAction`
  option — INV-173), NEVER a forced reload (yanking the pinned pop-out
  mid-call is worse than a stale UI; the sticky drafts make a chosen reload
  safe). **The Reload button goes through `reloadApp_()`, NOT `location.reload()`
  (operator 2026-09-01).** `location` inside the shell is HtmlService's
  session-bound `googleusercontent.com` iframe URL — the very one
  `popOutCurrentView` refuses to reuse because it renders blank as a top-level
  document (INV-78) — so a plain reload repainted the inner frame WHITE while
  the real page above it never moved, and the rep had to press the browser's
  own reload. `reloadApp_` navigates the TOP window to `SERVER_WEB_APP_URL`
  via `Location.replace` (one of the two members a cross-origin Location
  exposes; the click supplies the user activation a sandboxed top-navigation
  needs), falling back to a `'_top'` `window.open` and only then to the
  in-frame reload — every fallback strictly better than a blank frame. An
  un-framed page (local dev, the visual harness) or a missing base reloads
  normally. A COMPACT reload carries `?compact=1&tool=<currentView>`, because
  `umsLastView` is deliberately not written in the pop-out (D8) and the pinned
  window must come back as the pop-out. Net prompt lag ≤ poll 15 min + cache TTL 5 min. Correctness property
  worth knowing: `google.script.run` executes the DEPLOYED version's code, so
  a bare `clasp push` with no New version changes neither the served files nor
  the hash — no false prompt; the hash moves exactly when a New version is
  cut. An empty boot stamp disables the check entirely (harness pages, hash
  failure). Pinned by BCN-1/BCN-2/BCN-3 + the DOM toast-action test +
  `test_deployStamp_requiresEmployeeAndHashes`.
- <a id="reminders-are-a-shell-capability-not-a-clock-view-one-operat"></a>**Reminders are a SHELL capability, not a Clock-view one (operator
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
- <a id="two-way-sheet-entry-via-the-reconcile-pass-8"></a>**Two-way Sheet entry via the reconcile pass (#8).** Because the per-rep
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
- <a id="two-stage-email-is-the-safety-mechanism"></a>**Two-stage email is the safety mechanism.** Submit logs only,
  zero risk of accidental send. The envelope icon on each note card
  is the only way to compose; that opens the form modal, which
  requires explicit Preview, which then requires explicit Send. The
  preview shows the actual rendered HTML body + subject + recipients
  so the rep can catch wrong dept selection, wrong patient TRX, etc.
  before send. **The Note Reference block is EDITABLE (operator 2026-08-25) —
  a mini version of the main note template.** All seven fields render as `.ce`
  contenteditable rows (a BLANK field renders too, so a missing Transferred To
  can be filled — the old read-only `<dl>` omitted blanks entirely), and edits
  write back to the note itself through the same caller-scoped + locked +
  audited `updateCallNote` the card editor uses — no new endpoint, no second
  write path, so the email that goes out and the stored note cannot disagree.
  **The save-then-preview ORDER is load-bearing:** `cnComposerGoToPreview_`
  commits pending edits BEFORE asking the server to render, because previewing
  first would build the body — and the INV-41 hash the send is checked against
  — from the STALE stored note and silently email the un-corrected text; a
  failed save aborts the chain rather than previewing unsaved text. Editing
  between Preview and Send stays impossible (the fields live on the FORM step
  only) — that is the hash guard working, not a gap. **Preview also warns on an
  EMPTY Patient Name & TRX (operator 2026-08-27 — a pilot email went out
  without one):** a dismissible uiConfirm (Continue anyway / Go back, the
  `intakeWarnRecommended_` posture — never a hard block) reading the LIVE
  editable field first so an un-saved fill-in already counts; "Go back" lands
  the rep on that very field to fix. Issue/Resolution show RAW
  marker text, exactly like the main template: `cnFmtHtml_` is a RENDER step
  and editing rendered HTML would destroy the markers on the way back. Details
  worth keeping: repaints are IN PLACE (`cnComposerNoteEdited_`) — a modal
  re-render would drop the caret mid-word and re-run `cnRenderSubforms_`; the
  save handler replaces the cached note BEFORE the composer instance guard
  (the server row is updated either way, so an early return would leave every
  card rendering pre-edit text) and then re-points `c.note` at the server copy
  (`cnReplaceNoteInState_` swaps the array slot — the r3 `lastSaveUndo`
  lesson); a note still saving (Save & Compose mid-flight) renders read-only,
  having no server row to update; and closing with uncommitted edits toasts
  "Note edits discarded" instead of losing them silently. **Preview also
  carries an in-button loader** (`cnComposerSetPreviewBtnBusy_`/`Idle_`, the
  shared Role-D `.lo-dots` vocabulary): "Saving note…" then "Building
  preview…", restored on BOTH failure paths — success needs no restore because
  the modal re-renders into the preview step. The preview→send handoff is
  body-hash guarded:
  `previewCallNoteEmail` returns a SHA-256 `bodyHash` over
  (htmlBody, subject, to); `emailFromCallNote` re-renders, recomputes,
  and refuses to send when the hash differs. Catches the case where
  the rep edits the note in another tab between Preview and Send —
  the previewed body and the sent body always match, or the send is
  rejected with a clear error.
- <a id="auto-copy-format-is-a-config-template"></a>**Auto-copy format is a CONFIG template.** `CONFIG.CALL_NOTES.AUTO_COPY_FORMAT`
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
  `cnFormatNoteForCopy_` carry the line; keep them in sync. A
  `{callDirection}` token is also available since the pilot round-1
  follow-ons (2026-08-24) — substitutes `Outbound`/`Inbound` from
  `subformData.callDirection` — but the DEFAULT template deliberately
  omits it, so existing pastes are byte-identical; the operator opts in
  by adding a `Direction: {callDirection}` line to the template.
- <a id="client-side-persistence-is-localstorage-based"></a>**Client-side persistence is localStorage-based.** See the
  authoritative "Eighteen client-side localStorage keys total" entry in
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
  RETIRED `umsMergeMode`, net 16 — and the design handoff's PR 4
  (2026-09-02) added `umsCoachingFilter`, net 17 — and its PR 5 (same day)
  added `umsQaPeriod`, net 18.)
- <a id="optimistic-ui-is-the-perceived-speed-mechanism-for-the-call"></a>**Optimistic UI is the perceived-speed mechanism for the Call Notes
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
- <a id="pay-statement-own-data-payroll-self-check-operator-2026-08-1"></a>**Pay statement — own-data payroll self-check (operator 2026-08-17).**
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
- <a id="time-pto-merge-round-2-8b-one-page-operator-2026-08-18"></a>**Time / PTO merge (Round 2 · 8b) → ONE page (operator 2026-08-18).**
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
- <a id="day-edit-modal-on-live-status-cards"></a>**Day Edit modal on Live Status cards.** Each employee card in the
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
  **Prefill (team calendar, 2026-08-31):** `openDayEditModal` takes an
  optional 3rd `prefillDate`, honored only inside the picker's own
  [min, today] bounds (the `openAdjustModal(prefillDate)` precedent) — the
  team-punches pencil uses it; the Live Status pencil is unchanged.
- <a id="team-punches-calendar-manage-manage-time-operator-2026-08-31"></a>**Team punches calendar (Manage → Manage Time, operator 2026-08-31).** The
  manager cut the app lacked: every rep's punch times for an ARBITRARY date
  in one place (Live Status is this view pinned to today; Day Edit is one
  rep at a time). Placement was deliberated — a role-scoped toggle on the
  rep-facing Time/PTO page was REJECTED for the registry-reorg convention
  (team-facing surfaces live in the Manage module, where the `managerOnly`
  machinery gates whole tabs) and because the Day Edit modal lives in the
  same partial. Shape (operator-picked): a month calendar in the Time/PTO
  `.cal-*` visual vocabulary (day cells: reps-punched corner badge, `+N`
  off-count, PTO dots, holiday star, warn tint when any day is incomplete;
  selection is a distinct `--info` inset ring so today + selected read as
  two facts) with a FULL-WIDTH team punch table below the selected day —
  one row per rep (ClockIn / LunchOut / LunchIn / ClockOut / Hours through
  the shared `mtRenderTable_`, ADJ chips, warn-tinted incomplete rows, and
  ABSENT reps as muted "no punches" rows merged from `mgrData.liveStatus`
  on past/current weekdays only, deduped by id AND name, never for a rep
  already listed off) — plus a pencil per row opening Day Edit prefilled
  to that rep + date (rendered only inside the adjust window). Server:
  `getTeamCalendar(month)` (manager-gated read; ONE Timesheet + ONE
  TimeOffRequests read per month; per-day per-rep derivation MIRRORS
  `buildTimesheetForEmployee_` — last punch per type wins, `calcHours_`
  null → incomplete never 0, in-progress on the rep's own today; garbage
  COMMENTS types are not punches; roster inclusion via `empRosterEmail_`;
  TO status trimmed+lowercased at the one read; `punchCount` reports
  collapsed extras). Live-tab-only by design (the calendar/Punctuality
  posture) — a month predating the live tab carries `archiveNote`
  (INV-187). Client SWR per month (key-exact cache write BEFORE the seq
  check per INV-156, clean rounds only per INV-129; painted refresh
  failure keeps last-good via warn toast, cold failure renders
  `errorStateHtml_` — C17-5); dates derive from the manager's roster tz
  (`isoDateTz(empTz())`, the F6 discipline); future-month nav refused.
  Pinned by the two team-calendar pins (behavioural endpoint drive +
  client wiring/prefill/fixture-shape) + the omnibus gate case.
- <a id="manage-time-is-a-grouped-scroll-needs-you-then-periodic-coll"></a>**Manage Time is a GROUPED scroll — Needs you, then Periodic collapsed
  (design handoff PR 3, 2026-09-02).** The tab had grown to eleven cards in
  historical order, so the two that need a decision today (Pending Time Off,
  Missed Clock-Outs) sat beside a payroll export and a sheet doctor. It now
  renders under two `<h2 class="mgr-group-h">` groups: **Needs you** — Pending
  Time Off (`data-tone="warn"`, with an "oldest N days" line from
  `mgrOldestPendingDays_`, derived in the manager's ROSTER tz per F6), Missed
  Clock-Outs (`data-tone="destructive"`, "fix before payroll"), the adjustment
  queue, Live Status and the team calendar — then **Periodic** behind a real
  `<button aria-expanded aria-controls>` disclosure (`mgrToggleGroup_`, INV-173/
  174; `.mgr-group[hidden] { display: none }` is the load-bearing companion —
  the `[hidden]` gotcha) holding Export, PTO reconciliation, the sheet doctor,
  Recent Punches and Recent Activity. Three rules: (a) the collapsed group's
  header carries a SUMMARY ROW fed by the lazy cards themselves —
  `loadPtoReconciliation_`/`loadSheetDoctor_` call `mgrSetSummary_` on clean
  ("all clear", ok tone), on drift (crit/warn) and on FAILURE ("check failed",
  warn — a failed scan must not read as all-clear, INV-187) — so a manager
  never has to expand it to learn whether something is wrong; (b) the periodic
  panels are NOT lazy-loaded behind the toggle (plan M5 decision) — they load
  as before, only their PAINT is folded; (c) collapse state is `MGR_STATE`,
  SESSION-only, and is deliberately NOT a `mgrSwrRenderBlocked_` reason (the
  blocker keeps exactly its two `return true;` — an open overlay and a dirty
  form; a folded group re-renders freely and re-folds). The crumb reads
  `Manage › Manage Time`. Pinned by PR3-3. **Operator 2026-09-03 round:** (a)
  **Pending Time Off and Pending Punch Adjustments share a two-column row**
  (`.mgr-needs-pair`, single column ≤900px) — both were full-width cards
  holding a handful of one-line rows; the queue's genuinely-empty state now
  renders a quiet "No pending requests" card rather than nothing, so the pair
  stays a pair, and the queue rows + bulk bar WRAP with content-sized buttons
  (nowrap buttons pushed the page 64px sideways at 390 — measured). (b) **The
  adjust queue has multi-select** (checkbox per row when >1, Select all,
  Approve/Deny Selected — the PTO bulk-bar vocabulary) through ONE endpoint,
  `updatePunchAdjustStatusBulk(reqIds, status)`: one lock, one queue read, ONE
  Timesheet index per target employee (the C17-9 ctx — the old per-request
  `findExistingPunch_` full read was most of the approve's latency), per-id
  outcomes, every decision email queued past the lock (M-7). The single-id
  `updatePunchAdjustStatus` delegates to the same body. (c) **The approve is
  optimistic on screen**: the row dims on click and is REMOVED on success (the
  count pill follows; the last row swaps in the empty card) or restored with
  the server's reason; the background re-fetch still reconciles. (d) **Every
  manager trend counts WORKDAYS** — `mgrWorkdaysEnding_` feeds the Punch
  Activity chart (8 workdays incl. today; the label derives its count), each
  live-status sparkline (7 workdays excl. today) and the missed-clock-out
  sparkline (14); `pendingTrend` deliberately stays on calendar days, because
  a PTO request can be SUBMITTED on a Saturday and that bar is data, not a
  structural zero. (The Metrics 30-day trends joined the workday rule on
  2026-09-04 via `metricsWorkdayIsos_`.) (e) **The live-status card's Edit-day / Pay-
  statement buttons sit in the card's top-right corner from 541px** and the
  sparkline doubled (36px track, total beneath). NOT below 541px: the shell
  makes `.emp-grid` two columns there, and the 66px right padding that keeps
  the name clear of the corner joins the top row's MIN-CONTENT width (a flex
  item's `min-width:0` does not shrink its min-content contribution), which
  pushed the page 78px sideways at 390 — measured, then gated. Pinned by
  OPS-1..4 + the Day Edit DOM test.
- <a id="personal-pin-is-per-rep-capped-at-3-stored-in-subformdata"></a>**Personal pin is per-rep, capped at 3, stored in `subformData`.**
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
- <a id="auto-tag-rules-operator-2026-08-13"></a>**Auto-tag rules (operator 2026-08-13).** Admin-curated keyword→tag rules
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
  (admin-gated, INV-136) so a rejected save and a
  sanitized read can never disagree; rules ride `getCallNotesDepartments`
  (reps) + `getAdminConfig` (the editor). Pinned by the auto-tag Node pins.
- <a id="intake-recommendation-feedback-operator-2026-08-13"></a>**Intake recommendation feedback (operator 2026-08-13).** Every intake email
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
  yet", which the data cannot support). **There is a THIRD state, and it must
  not look like the second (F8, cycle 19):** `intakeFeedbackFor_`'s catch
  returned `[]`, which is EXACTLY what a clean submission with no feedback
  returns — so an unreachable Intake store rendered "nobody has said anything
  about this recommendation", the one reading the data cannot support
  (INV-187). The read outcome now rides back additively as
  `feedbackUnavailable` and the client renders `errorStateHtml_` in that block
  instead (INV-175). Best-effort is preserved by construction: the rest of the
  submission detail still renders, and a genuinely empty list still renders
  nothing. Pinned by the feedback-loop Node pins.
- <a id="manager-q-a-reply-on-training-flagged-notes"></a>**Manager Q&A reply on training-flagged notes.** Training-flagged
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
- <a id="manager-comments-on-any-note-not-just-training-item-9"></a>**Manager comments on ANY note, not just training (item 9).**
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
- <a id="automated-notification-emails-are-branded-item-2"></a>**Automated notification emails are branded (item 2).** A shared
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
- <a id="email-body-restored-to-the-ums-legacy-aesthetic"></a>**Email body restored to the UMS legacy aesthetic.** Call-note
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
- <a id="intake-emails-share-the-app-s-email-chrome-operator-2026-08"></a>**Intake emails share the app's email chrome (operator 2026-08-11).** The
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

  **Batch 5 (2026-09-18, F-27): the LABELS are the server's, not the
  payload's.** The email builders rendered whatever `payload.rows[].label`
  arrived, so "the email is always English" (g43, after a Spanish PPD reached
  the Power dept live) was enforced in the client collector alone — a
  convention held by the one party that cannot be trusted to hold it. The
  server now carries the English banks and builds every preview and send's
  rows from the bank plus the client's ANSWERS map. The alternative — ship the
  bank to the client and keep rendering what comes back — was rejected for the
  same reason the original bug existed. The cost is a client↔server MIRROR of
  four literals, accepted because a drift shows up as a wrong LABEL rather
  than a refused send (the cheap side of the OOP-B question) and because the
  F-27 pin compares the banks by value, so a one-sided edit turns the harness
  red instead of shipping.
- <a id="department-emails-and-state-tax-rates-are-editable-via-the-a"></a>**Department emails and state tax rates are editable via the Admin
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
- <a id="runtime-feature-toggles-via-a-registry-the-admin-tab"></a>**Runtime feature toggles via a registry + the Admin tab.** A
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
  INV-151; `spanishAutoAssign` (`server`, default off, 2026-09-11) is its
  sibling — it gates trigger #21, `autoAssignSpanishThreadsScheduled`) gates the consolidated manager morning brief + the four
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
- <a id="stale-flag-badge-on-the-manager-cn-landing"></a>**Stale-flag badge on the manager CN landing.**
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
- <a id="client-side-undo-window-handles-midnight-wrap"></a>**Client-side undo window handles midnight wrap.**
  `timeDiffSecondsClient` computes `86400 + diff` when the raw diff
  is negative (punch at 23:58, now at 00:02), capping at
  `SELF_UNDO_WINDOW_SECONDS` so yesterday's punches don't falsely
  appear eligible; eligibility requires a NON-NEGATIVE diff (cycle-8:
  the -1 "malformed/beyond-window" sentinel satisfied `<= 300`, so a
  stale post-midnight list rendered undo buttons on everything). The
  server re-validates independently — and since cycle 8 it actually
  ACCEPTS the wrap (INV-23's today-or-yesterday elapsed-ms window),
  so the button works instead of dead-ending in a server error.
- <a id="bulk-approve-deny-fires-parallel-rpcs"></a>**Bulk approve/deny fires parallel RPCs.** The manager Pending
  Time Off section has checkboxes + a bulk bar when 2+ requests are
  pending. Bulk approve/deny calls `updateTimeOffStatus` once per
  checked request in parallel. Each call acquires its own
  `ScriptLock` independently, so the operations serialize safely.
  A single toast summarizes successes vs. failures; the dashboard
  refreshes once all RPCs complete.
- <a id="dashboard-analytics-are-computed-from-existing-data"></a>**Dashboard analytics are computed from existing data.**
  `getManagerDashboard` derives `punchTrend` (daily punch counts for
  today + the 7 prior days = 8 bars, roster-filtered since cycle-10 C11 —
  off-roster/TEST_-remnant ids no longer inflate it) and `toSummary`
  (approved/pending/denied time-off
  requests for the current month) from the `adpRows` and `toRows`
  already loaded by the function — no additional Sheet reads. The
  client renders an inline SVG bar chart and a color-coded summary
  card.
- <a id="pto-balance-reconciliation-drift-detection"></a>**PTO balance reconciliation (drift detection).** `getPtoReconciliation`
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
- <a id="cn-card-actions-use-a-primary-secondary-split"></a>**CN card actions use a primary/secondary split.** Frequently used
  actions (flag-action, flag-training, pin, copy, email) are always
  visible. Less-frequent actions (urgent-toggle, flag-review, resolve,
  edit, find-prior-TRX) are behind a chevron-down `data-cn-action="more"`
  toggle that opens an inline `cn-more-menu` popover.
- <a id="card-level-urgent-toggle-lives-in-the-more-menu"></a>**Card-level urgent toggle lives in the More menu.** A saved note can
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
- <a id="email-subforms-are-color-coded-by-type"></a>**Email subforms are color-coded by type.** `sf-shipping` /
  `sf-resupply` = green left border, `sf-close` = red, `sf-oop` =
  orange. Matches the legacy email identity palette. The email
  composer form step also shows a "Note Reference" panel at the
  bottom with all 7 note fields so the rep can cross-check while
  composing.
- <a id="email-composer-modal-is-draggable-resizable"></a>**Email composer modal is draggable + resizable.** The title bar
  has `cursor: move` and a `mousedown` handler
  (`cnStartDragModal_`) that repositions the modal via
  `position: fixed`. The modal also has `resize: both` for the
  browser's native resize grip.
- <a id="keyboard-shortcuts-accelerate-the-call-notes-hot-path"></a>**Keyboard shortcuts accelerate the Call Notes hot path.**
  Ctrl/⌘+Shift+C saves & copies (moved off plain Ctrl/⌘+Enter in the
  2026-06-12 r3 feedback round — too close to the Enter-nav muscle
  memory; plain Ctrl/⌘+Enter is now unbound). Ctrl/⌘+Shift+Enter
  saves & opens the email composer. Ctrl/⌘+1/2/3 toggle
  action/training/review flags on the active form. Ctrl/⌘+Backspace
  clears the form. Ctrl/⌘+/ or bare ? opens a shortcuts help
  overlay. Shortcuts only bind in the Log view's active form; the
  ? handler skips when focus is in an input/textarea. The help
  overlay uses the shared `.overlay` pattern (Escape closes it).
- <a id="training-q-a-tray-surfaces-manager-answers-on-the-log-view"></a>**Training Q&A tray surfaces manager answers on the Log view.**
  A collapsible "Training Answers" section renders between the
  pinned tray and the filter bar, showing the rep's last 5
  training-flagged notes that have a manager reply (from
  `getMyTrainingQA`). An "Answered" filter chip also appears in
  the filter bar. Both give the rep visibility into manager
  feedback without navigating to History.
- <a id="history-view-supports-date-ranges"></a>**History view supports date ranges.** The History tab defaults
  to "Last 7 Days" with From/To date inputs and presets (Yesterday,
  Last 7 Days, Last 30 Days, This Week, Last Week). Multi-date
  results render as **collapsible per-date groups**: each date is a
  `.cn-hist-group` with a clickable metadata header (caret + note count
  + per-flag-type count chips — urgent/action/training/review, plus an
  info-toned OUTBOUND count since the round-1 follow-ons (2026-08-24;
  `.cn-hg-outbound`, rendered only when > 0 so an all-inbound day is
  byte-identical) — from
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
- <a id="manager-cross-rep-search-in-team-notes"></a>**Manager cross-rep search in Team Notes.** A Search tab in the
  Team Notes view calls `managerSearchCallNotes` with the same
  All/Caller/Issue field tabs as the rep search. Results show
  `repName` on each card. 500-result cap.
- <a id="stats-drill-down-links-to-per-rep-view"></a>**Stats drill-down links to Per-Rep View.** Rep names in the
  Stats tab are clickable — clicking one navigates to the Per-Rep
  View for that rep and the same date.
- <a id="email-department-display-on-note-cards"></a>**Email department display on note cards.** A sent note shows which
  departments the email went to as a readable, info-toned **`cn-sent-pill`**
  (`cnDeptEmailPillHtml_`) in the caller line — it wraps the dept label instead
  of ellipsis-truncating it, with the send timestamp in the `title`. The mail
  ACTION button (sent state) is just the icon (click = send again). Used by both
  the rep card and the manager read-only card (its `sentPill`). Replaced the old
  truncated inline `.cn-email-depts` text-on-the-button (that class is gone).
- <a id="a-quoted-price-is-a-commitment-so-the-picker-inserts-and"></a>**A quoted price IS a commitment, so the picker inserts and the SEND
  re-verifies (OOP-B, operator 2026-09-16).** The operator's answer to "how
  binding is a quoted OOP price?" was that the rep processes payment on that
  same call. That single fact set the design. Three routes were considered:
  (a) the rep looks the price up in the drawer and types it — no machinery, no
  guardrail against a typo reaching a customer; (b) a picker in the external
  composer that inserts a formatted line; (c) a real template token
  (`{oop:ITEM}`). (c) is the most elegant and the most fragile — a template
  outlives the catalog, and a token that no longer resolves, in an email already
  sent, is the worst of the three. **(b) shipped**, with the number staying
  server-sourced end to end, which is the entire point of not having reps read
  the sheet.

  What "server-sourced" had to mean is the non-obvious part. It is not enough
  that the picker got the number from the server once: a lookup at 10:02 and a
  send at 10:40 can straddle an operator edit, and a textarea is a textarea. So
  `sendExternalEmail` rebuilds each quoted line from the LIVE sheet and refuses
  unless the message still carries it — a stale price, a vanished item, a
  blanked price, an unreadable store and a hand-edited line each refuse with
  their own message, because they are five different problems with five
  different fixes. A line the rep DELETED is not an error: nothing was quoted,
  so nothing is audited.

  **The boundary is stated rather than implied**, in the code and in a pin: a
  rep who overtypes the figure defeats this, exactly as one who types a price
  for an item they never picked does. The promise is that a price the PICKER
  inserted is server-sourced and current — not that no wrong number can reach an
  email. The second is unachievable from a free-text body, and claiming it would
  be the more dangerous error. Verification runs before token creation, the PDF
  fetches and the send, so a refusal costs nothing. The quoted prices ride the
  existing `ExternalEmailSent` audit row — item, exact price, effective date,
  and still the recipient DOMAIN only: g36's minimization is not relaxed by the
  quote being commercially significant. INV-208.
  **Batch 1 of the 2026-09-17 /broad-scan (F-01):** the verify path keyed the
  live sheet by column A while OOP-C had moved the picker's name to the
  header-discovered Item column, so on the operator's sheet every quoted send
  was refused — closed, as designed, but for a listed item. The verifier now
  keys `byName` on `oopNameCol_(headers)`; INV-213 makes "one resolver per
  operator tab" the rule and the OOP-B fixture carries the operator's shape.

- <a id="which-eligibility-restrictions-lift-out-of-pocket-is-a-rule"></a>**Which eligibility restrictions LIFT out of pocket is a RULE, not a
  table (ELIG, operator 2026-09-16).** The OOP sheet's `Area Eligibility` column
  states the rule for an order going THROUGH INSURANCE. Paying out of pocket
  transforms it, and the operator gave three examples: `Open` stays open; `TX`
  becomes the whole US; `100 miles of Dallas or San Antonio` stays 100 miles.

  Writing down those three rows would have been the obvious move and the wrong
  one — the fourth value, whenever it arrives, would get answered by whoever was
  looking at the table that day. The generalisation is:

  > **A restriction that exists because of WHO IS PAYING lifts when nobody is
  > billing insurance. A restriction that exists because of HOW IT PHYSICALLY
  > GETS THERE does not.**

  A state limit is licensure and network — it lifts. A delivery radius is a van
  — it does not. **UNKNOWN never lifts**, and that is the load-bearing line: a
  value the parser could not read might be a delivery constraint, and lifting it
  is the one guess that puts an undeliverable order in the system.

  **Both verdicts are shown, labelled, rather than behind a payment-method
  toggle.** The question a rep actually has mid-call is "can we deliver this, and
  does paying out of pocket change the answer?" — a toggle makes them ask it
  twice, and it is also the honest rendering of a column that genuinely means two
  things.

  **AMENDED 2026-09-21 (T4): when the two verdicts AGREE the ROW collapses, and
  the CLAIM does not.** The rule above is about DECIDING between the two answers,
  and when they agree there is nothing to decide — while the duplicate row is
  precisely what made a real disagreement hard to spot, which is the case the
  pair exists for. So an agreeing pair renders once, labelled "Through insurance
  or out of pocket", which names both routes and so can never be read as an
  answer about only one of them. A disagreement still renders as two labelled
  rows, unchanged. Nothing is behind a toggle in either case, which is what the
  original decision actually forbade. Agreement is STRICT — verdict, near AND
  why must all match: a near-boundary yes is not a flat yes, and two yeses
  reached for different stated reasons are two facts, so collapsing either pair
  would state one as the other. `eligVerdictsAgree_` is driven over all four of
  those cases, because a pin that merely read `.why` out of the source stayed
  green when a bite made the comparison ignore it.

  A radius NO is CERTAIN while a radius YES near the boundary is not,
  which is the opposite of what "straight-line is only an estimate" suggests: a
  straight line is never longer than the drive, so over-the-limit is over either
  way, and a close YES says so rather than implying precision. INV-209.

  **AMENDED 2026-09-22 (T7): the fourth value arrived, and the rule answered
  it.** The operator's scooters are eligible in a list of named service cities.
  Asked whether that lifts out of pocket, the generalisation above settles it
  without a new table row: a city service list is HOW IT PHYSICALLY GETS THERE,
  so it does NOT lift — a scooter outside a listed city is unavailable either
  way. That is the test the 2026-09-16 decision was written to survive, and it
  did.

  Two things came with it. **`cities` DELEGATES rather than enumerating:** the
  column says "listed cities" and the engine reads the city rows in
  `LocationAcceptance`, so a new service city is one row in one place instead of
  an edit to every scooter row in the pricing sheet. This is not a reversal of
  the rule that kept city rows out of verdicts — that ruled out city rows as an
  INDEPENDENT overlay that could silently contradict the column, and a value
  that explicitly hands the question to the list is the opposite of a second
  opinion. It is also the shape the radius rule already had: the column states
  the RULE, the registry supplies its PARAMETER, exactly as it already supplied
  the warehouse address.

  **And rules now COMBINE**, because the operator's answer was that either the
  distance or the city qualifies. In a union any branch's YES is a YES; a solid
  YES outranks a near-boundary one, so nobody is warned about a boundary another
  rule already cleared; every branch speaks in the explanation, so a rep can see
  both were checked; and an UNMEASURABLE branch beside a plain NO is UNKNOWN,
  never NO — the one fold that would quietly turn "we could not tell" into "not
  eligible". An unreadable clause takes the whole cell down with it, for the
  same reason UNKNOWN never lifts. INV-236, INV-237.

  **And a radius can be about the NETWORK (T7b, the same day).** Most items
  reach 100 miles from ANY warehouse; the ones naming Dallas or San Antonio are
  the technician-built exceptions. `N miles of any warehouse` names nothing and
  resolves against the registry at CHECK time — the same delegation, so opening
  a warehouse extends every item written that way with no edit to the pricing
  sheet. Two consequences are part of the decision rather than details of it:
  the NAMED form matches whole words only, because a substring hit silently
  widens a narrow rule; and an over-limit distance with any warehouse
  UNPLACEABLE is UNKNOWN, not NO, because the unplaced one might be nearer — a
  rule spanning the whole registry makes that common rather than rare.
  INV-239.

  **Batch 2 of the 2026-09-17 /broad-scan (F-15):** the geocoder's SERVICE
  failure (quota, denial, throw) is its own return shape and reaches the rep as
  "the address service could not be reached (<status>) — not a problem with
  the address"; the bad-address message is reserved for ZERO_RESULTS. Same
  batch, F-04: the eligibility filter scores through the ONE scorer the price
  lookup uses (name OR code), so a by-name query no longer reports "No item
  matched" for a listed item (INV-213).

- <a id="price-and-area-eligibility-are-one-panel-because-they-are"></a>**Price and area eligibility are ONE panel, because they are one
  question asked of one table (operator 2026-09-18).** They shipped as two
  cards two days apart and the split was an artefact of that order, not a
  distinction a rep makes: both read `OopPricing`, both resolve the row through
  `oopRowObj_`, and "what does this cost" and "can we get it there" are asked in
  the same breath on the same call. The split had a cost that a layout review
  would not have found — each panel chose its own subset of the row and its own
  renderer, and they diverged into quoting different prices for the same item
  (g126). So the merge is the structural fix, and the layout follows from it
  rather than the other way round.

  The ITEM is the key and the ADDRESS is an optional upgrade, never a gate: with
  an item alone the panel answers with prices and NO verdicts, because nothing
  was checked and nothing may look checked, and it says what an address would
  add rather than leaving the empty field to imply it. This is also why an
  eligibility failure degrades instead of erroring: as two panels an outage cost
  the rep eligibility only, since the price sat in the card above, and a merge
  that let the same outage blank both would have spent a capability on a layout.
  The banner states that no verdict was reached and hands the server's own
  reason through verbatim — from the client, "the address is wrong" and "the
  service is down" are not distinguishable, and they send a rep to two different
  next actions (g128).

  The band lives in the LANDING HOST, never in the section renderers. The same
  two sections render into the ~340px Ctrl/⌘+K drawer, and a renderer that knew
  about columns could not serve both. That also produced the one rule g50 does
  not cover: the band is an explicit ratio and takes g50's two independent
  triggers, but the Item/Address pair inside it uses `auto-fit`, because the
  drawer is ~340px wide on a 1920px desktop with `data-compact` unset — a
  viewport rule and a pop-out rule would BOTH pass while the two fields rendered
  at 160px each. A breakpoint can only describe hosts the breakpoint can see.

- <a id="the-operator-maintained-lookup-tables-are-named-tabs-in-the"></a>**The operator-maintained lookup tables are NAMED TABS in the KB store,
  not stores of their own (operator 2026-09-16, decided the day OOP shipped).**
  OOP pricing launched as a ninth spreadsheet with its own `OOP_SS_ID`. The
  operator asked the same day whether it could fold into `INTAKE_SS_ID` to save a
  Script Property. It could not, and the reasoning is worth keeping because the
  question will be asked again about some other table:

  - **Intake is PHI and the app WRITES to it.** Pricing there means anyone
    maintaining prices needs edit access to patient submissions. That is the
    disqualifier, and it applies to any read-only reference table.
  - **The saving was not real.** Script Properties are capped by BYTES (g07);
    per Batch Q the advertised entry caps were never the binding constraint. Two
    string ids cost nothing, so "one fewer property" is never the argument.
  - **The move would have failed silently.** See g121.

  `KB_SS_ID` was the right home because `InsurancePayors` was already there: the
  same class (PHI-free by policy), the same maintainer, the same read-only
  access pattern, read through a named tab — and `searchOopPricing` already
  reuses that lookup's scorer. **The test for "does this reference table belong
  in the KB store" is that list, not the property count.** `OopPricing` and
  `LocationAcceptance` joined it; nine stores became eight.

- <a id="external-email-for-customers-and-providers"></a>**External email for customers and providers.** A standalone
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
- <a id="interactive-fillable-web-forms-via-token-gated-public-route"></a>**Interactive fillable web forms via token-gated public route.**
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
- <a id="in-app-form-submission-viewer"></a>**In-app form-submission viewer.** Once a recipient submits a
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
- <a id="sent-forms-tab-rep-facing-read-only"></a>**Sent Forms tab (rep-facing, read-only).** A Call Notes tab
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
- <a id="intake-sent-tab-rep-facing-read-only-same-model-for-intake-s"></a>**Intake Sent tab (rep-facing, read-only) — same model for intake
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
- <a id="form-submission-notification-renders-the-completed-form"></a>**Form-submission notification renders the completed form.** When a
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
- <a id="cross-rep-manager-aggregates-are-cached"></a>**Cross-rep manager aggregates are cached.** Two parameterless
  manager aggregates that otherwise re-scan every enrolled rep's Sheet
  are whole-result cached: `getCallNotesTagTaxonomy`
  (`CN_TAXONOMY_CACHE_KEY`, 5 min) is eagerly invalidated by the
  tag-admin endpoints (`invalidateCnTaxonomyCache_` from
  rename/merge/archive) so the Admin table reflects a change
  immediately; `managerGetUnresolvedActionCount`
  (`CN_UNRESOLVED_CACHE_KEY`, 2 min) is TTL-only like the ambient
  cache (INV-43). Since the 2026-08-13 speed round `getTeamMetrics` is ALSO
  endpoint-result-cached (`team_metrics_v2:<from>:<to>`, org-wide,
  `CDR_CACHE_TTL`; put gated on a clean round — see the slow-tabs KDD).
  Open-ended substring search (`managerSearchCallNotes`
  without a date range) is intentionally NOT cached — speeding it up
  needs the full note text (a real index), which is out of scope; the
  date/column bounds (INV-46 reader) already cut its cell volume.
- <a id="paired-timezone-chip-signal-chip-vocabulary"></a>**Paired-timezone chip + signal chip vocabulary.** `.tz-chip` pairs
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
- <a id="time-clock-dashboard-the-clock-tab-is-a-two-column-dashboard"></a>**Time Clock → Dashboard (the Clock tab is a two-column Dashboard).** The
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
  the two rate metrics — % Answered against the shipped `CDR_ALERT_THRESHOLD` (since H2: the PUBLISHED dashboard target, with its amber band as the slack)
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
  Spanish-capable users (`canSeeSpanish`); **since design handoff PR 6
  (2026-09-02) everyone else gets the Requests card ALONE** (`.dash-pair
  .dash-pair-single`) — the pending-**Training** card (`clkDashTrainingCard_`)
  was RETIRED because its content is one of the six kinds the **Needs you**
  block above the carousels now lists (INV-184: the helper, its RPC branch and
  its skeleton twin are banned from returning). The **Requests** card shows the manager team aggregate
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
  shift header) is below — those pieces still render INSIDE
  the rail.
  **Design handoff PR 6 (2026-09-02) — the Time Clock surface is TASK-FIRST.**
  (a) **`#dash-main` LEADS with a Needs-you block** (`#dash-needsyou`, rendered
  BEFORE `#dash-cards`) fed by `getMyPendingTasks()` — rep-callable
  (`getEmployeeInfo_`, a bare `{error}` READ gate), read-only, cached per rep
  for `PENDING_TASKS_CACHE_TTL` (120s) and **cached ONLY on a clean round**
  (INV-129). It folds SIX sources, each in its own try/catch that pushes its
  kind to `unavailable[]` rather than dropping it (INV-187) — **or to the
  additive `notConfigured[]` when the store behind it is deliberately unset
  (F2, cycle 19): honest in the payload, SILENT in the UI, and never a reason
  to skip the cache.** A no-fallback store left unset is not a failed read, it
  is a feature that does not exist on that deployment, and Storage Health
  already reports it (INV-186); before the split, a deployment with no
  `HR_DOCS_SS_ID` showed every rep "Couldn't check coaching, employee docs" on
  every paint forever, never reached the clean-empty state that makes the block
  disappear, and never wrote the 120s cache. The CLIENT needed no change —
  `unavailable` keeps its exact meaning and still drives both the warn line and
  the freshness gate — which is the sign the shape is right: deploy skew is
  safe in both directions. The six sources are training
  (`getMyTraining`, pending/overdue), coaching (`getMyCoaching`, open
  non-praise; overdue = `ageDays ≥ CONFIG.COACHING_UNACK_REMINDER_DAYS`), notes
  (`getMyMetrics(prevWorkdayIso_(today))` — the PREVIOUS workday, since CDR
  never lands same-day; the item exists only when `answered − noteCount > 0`,
  and a `noteCountUnavailable` round throws into `unavailable` rather than
  rendering "0 missing"), requests (`getDeptRequests` mine open + incoming;
  overdue = `slaStatus === 'overdue'`), sched (`getMyScheduledCalls` due TODAY
  in the rep's tz) and docs (`getMyDocs` `needsAction`). **Operator decisions:
  the QA source is OMITTED; Requests means dept requests only** (own pending
  punch-edit stays the punch-area chip; pending PTO waits on the MANAGER, so it
  is not the rep's task); signable docs are the sixth kind. Items sort via the
  pure `pendingTasksSort_` (overdue first, due date asc with blank last, title)
  and are capped `PENDING_TASKS_CAP` (30) with the pre-slice `total` reported
  (INV-169). Every item carries a `{tool, tab}` ROUTE (pinned against the
  TOOLS registry) and the notes item a `hint` that the client hands to
  `fileMissingCalls_` — the C8 `CLK_NAV_HINT` park-and-consume, so "3 calls
  without a note" lands on the Call Notes Log with the same toast the coverage
  strip's CTA raises. Client (`clkNeedsYouHtml_`): a skeleton while unknown
  (`data === undefined`), `errorStateHtml_` on a cold failure (INV-175), a
  clean-empty round renders NOTHING (the block disappears rather than saying
  "all clear" — a degraded round is never that), an `Overdue` word on overdue
  rows (a stronger `is-past` tone when the due date has PASSED), real `<a>`
  rows at 44px (INV-173), and a warn line naming every kind that could not be
  checked ("Couldn't check scheduled calls — those may have items too"). SWR:
  `CLK_NEEDS` keeps last-good and stamps freshness ONLY on a clean round
  (`at = 0` on degraded/failed — INV-156); **the loader is gated on
  `!COMPACT_MODE` BEFORE any RPC** (the cycle-8 M-12 rule — the pinned pop-out
  never pays six reads for a block it hides), and `:root[data-compact]
  #dash-needsyou { display: none }` hides it there. Deploy skew is safe: an
  older server returns nothing the client reads as a list, so it renders the
  error card, never a fake all-clear. (b) **The clock card is DENSER and
  carries the shift STATE LINE**: the world-clock region strip
  (`#clk-regions`, `CLK_REGION_ZONES`, its rotation + `clkUpdateRegions_`), the
  shooting star (`clkShootMaybe_`) and the greeting "On the clock" pill are
  RETIRED (INV-184 — a derived ban pin holds every selector + helper out; the
  static star field and the tz `<select>` fed by the renamed `CLK_TZ_ZONES`
  survive), and a `.clk-state` row (state dot + "On the clock / On lunch /
  Shift complete / Not in" + the hours readout) sits INSIDE the gradient card
  on a LITERAL-colour scrim (`rgba(10,13,20,.72)` under white — the V-2/INV-166
  rule for a fixed-palette surface, and the amber bottom-right corner the
  cycle-12 audit flagged as a card-level contrast question). **Hours render
  ONCE** (operator decision 4): the state line carries `Nh Mm worked`; the
  shift-strip header keeps only `% logged` + `Nm lunch`, and the status
  SENTENCE no longer repeats them ("You're clocked in since 1:02 PM · 2h 33m
  until end of shift."). (c) **The greeting rotator is HELD while a shift is
  active** (`CLK_GREET_ROT.held = onClock`; the tick returns before rotating)
  — an active shift is not the moment to slide the status sentence away under
  a What's-new item; the plan's `.greet-held` indicator chip was NOT built (a
  held rotator needs no badge). (d) **The rail order is clock card → punch
  actions (`.clk-actions-block`, pending chip + `renderActions`) →
  shift-strip** — the operator's "buttons above the fold" ask, MEASURED at
  1440×900: the prime button's top moved from **704px to 367px** (the reorder
  did it; the card itself is 18px shorter), and `.actions` is now a 2-column
  base grid with `.prime` spanning both (the 540px re-columning and the
  compact override's grid lines are gone — only a compact `gap` remains, so
  the A2 scan owes nothing). (e) **The break chips ABSORB the next-break chip**
  (`#clk-next-break` retired): each chip carries `data-start`/`data-end` and
  `clkUpdateBreak_` (still called from the 1Hz tick, still PAINT-only per
  INV-190) marks them `taken` (struck), `now`, or `next` with an "· in Nm"
  countdown inside 90 minutes. **A minute-guard on a repainter must RESET when
  the DOM it paints is re-rendered:** `_clkLastBreakMin` skipped the second
  render of the same minute (`clkRefreshState_` re-renders on focus), so the
  fresh chips shipped with NO state until `clkBreakScheduleHtml_` began
  resetting the guard — found on camera, pinned in PR6-3. Verify: PR6-1..3
  (pure), the Needs-you DOM test, the seven clock scenarios incl.
  `clock-needsyou-empty-light-wide` (`?fixture=empty`) and
  `clock-needsyou-error-light-wide` (`?failrpc=`), `fold-measure.mjs`, and
  `test_pendingTasks_requiresEmployeeAndShape`.
- <a id="clock-view-hero-shift-strip-ledger-architecture"></a>**Clock view: hero + shift-strip + ledger architecture.** The
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
  status render below the shift strip as the existing cards. **The teammate card
  ("Team Right Now") carries the PRESENCE chip since operator testing note 10
  (2026-09-10):** a warn-toned `active · not clocked in` / `active · clocked
  out` chip (`clkActiveNotInChipHtml_`, `.emp-active-chip`) on a rep's status
  line whenever `getTeammateStatus` ships `activeNotIn === true` (STRICT — an
  older server ships no field and renders nothing), a NBSP-joined summary tail
  (" · N active but not in" — the count can never split from its phrase), and
  the head's two spans carry `emp-team-title` / `emp-team-summary`. See INV-24
  for the gesture-driven beacon and the measured-layout gotcha for why the chip
  is a wrapping BLOCK and the head rules sit at (0,3,1). On camera in all four
  Clock scenarios (Leo Kim's chip). **The
  world-clock region strip (`#clk-regions`, item 5 — the rep's offshore tz +
  ET / CT / PT / HST, rotating one zone at a time every 4.5s) was RETIRED by
  design handoff PR 6 (2026-09-02)** along with the shooting star: under the
  ALL-CST policy every agent works one frame, and the strip cost ~40px at the
  top of the rail where the punch buttons needed to be. `CLK_REGION_ZONES`
  became `CLK_TZ_ZONES`, whose ONLY consumer is the clock card's tz `<select>`
  (`tzSelectHtml_`); `clkBuildRegionFmts_` / `clkRotationZones_` /
  `clkUpdateRegions_` / `clkShootMaybe_` / `.clk-region*` / `.clk-shoot` are
  banned from returning (the PR6 T2 pin, INV-184). `@keyframes clkRegSlide`
  survives because the greeting rotator reuses it. See the PR 6 amendment on
  the Dashboard KDD above for what replaced the strip (the state line + the
  actions-first rail order).
- <a id="the-done-state-names-the-punch-it-was-derived-from-operator"></a>**The DONE state NAMES the punch it was derived from (operator 2026-09-01).**
  `getNextActions_` returns `['Adjust']` when the day's punches end with a
  ClockOut, and `renderActions` rendered that as a bare "Shift complete for
  today" — an ASSERTION the data may not support, which is INV-187's class in
  the punch UI. It fired live: an offshore rep whose roster tz still split a
  CST shift across two rep-local dates got the PREVIOUS shift's clock-out on
  today's date, was told their shift was finished before they had started it,
  and had Clock In simply absent with no hint why (the server agrees, so it is
  not a UI-only block — INV-155's live sequence guard rejects a ClockIn in that
  state too). The message now reads "Shift complete for today · clocked out at
  6:00 AM" plus a quiet "Didn't clock out? Use Adjust to add a missing punch, or
  ask your manager." Stating the evidence turns a dead end into something a rep
  can recognise as wrong and act on. The call site passes `opts.lastClockOut`
  (the trailing ClockOut off the already-time-sorted `punches`); the clause is
  conditional, so a caller passing nothing gets the bare message rather than
  "clocked out at undefined". **The fix for the underlying split-day state is
  the roster flip, not the copy** — see the timezone-model entry. Pinned by
  CLK-DONE (call-site wiring + the conditional clause + the hint class being
  DEFINED) and the DOM done-state assertions.
- <a id="day-ribbon-clock-view"></a>**Day ribbon (Clock view).** Horizontal 06:00–22:00 time ribbon
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
- <a id="manager-telemetry-strip-with-sparklines"></a>**Manager telemetry strip with sparklines.** The manager
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
- <a id="live-status-sparkline"></a>**Live-status sparkline.** Each live-status emp-card on the
  manager dashboard carries a 7-bar daily-hours sparkline + a
  `Xh·Nd` total/days-worked label. Driven by `recentHours[]` on
  each `liveStatus` entry (7 entries, oldest→newest, excludes today),
  computed via one extra in-memory pass over already-loaded
  `adpRows`. Bars are color-coded: zero days (`var(--paper-2)`),
  short days <6h (`var(--warn-soft)`), normal days (`var(--accent-soft)`).
  The total label uses `formatHoursShort` for compactness.
- <a id="metrics-hero-rail-layout"></a>**Metrics hero + rail layout.** Both My Stats and Team Metrics
  use a 1.4fr / 1fr hero+rail layout. Hero = big tabular % Answered
  + "vs 30-day avg" delta line (sign-toned green / red / neutral) +
  30-day sparkline with a dashed baseline at the trend average.
  Side rail = 5 `.m-row` entries (Notes / Answered / Missed /
  Avg Talk / Total Talk) with optional tonal value variants
  (`good` / `warn` / `crit`). Per-rep table preserved at the
  bottom of Team Metrics. Shared helpers: `mTrendAvg_`,
  `mBuildHeroSparkSvg_`, `mRailRow_`.
  **Operator improvements #1–#10 (2026-08-06) extended both pages:** all
  three metrics endpoints ship `alertThreshold` (=`CDR_ALERT_THRESHOLD` then; since H2 the published dashboard standard, plus `alertBand`) and
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
- <a id="per-queue-attribution-exists-only-for-transfers-cycle-14-pha"></a>**Per-queue attribution exists ONLY for TRANSFERS (cycle-14 Phase 1).** Phase
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
- <a id="note-coverage-count-have-a-single-source-of-truth"></a>**Note coverage + count have a single source of truth.**
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
- <a id="cross-rep-call-note-reads-are-bounded-too"></a>**Cross-rep call-note reads are bounded too.** `readCallNoteRowsInRange_`
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
- <a id="manager-day-edit-date-picker-is-bounded-today-n-today"></a>**Manager day-edit date picker is bounded `[today-N, today]`.**
  `openDayEditModal` sets `#de-date` min/max so a manager can't pick a
  future date (server rejects `daysBack<0`) or one past the adjust
  window — matching the Adjust modal. `N` is `CONFIG.ADJUST_WINDOW_DAYS`,
  now shipped to the manager client via `getManagerDashboard`'s
  `adjustWindowDays` field (falls back to 30 only if absent), so the
  picker tracks the real window if the CONFIG changes. The server stays
  authoritative regardless.
- <a id="the-call-notes-pop-out-s-type-is-fluid-below-its-launch-widt"></a>**The Call Notes pop-out's type is FLUID below its launch width (operator
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
- <a id="compact-pop-out-defaults-to-480-800-then-remembers-4-per-too"></a>**Compact pop-out defaults to 480×800, then remembers (#4) — PER TOOL.**
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
- <a id="resizable-sidebar-with-snap-round-2-8a"></a>**Resizable sidebar with snap (Round 2 · 8a).** The sidebar's
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
- <a id="hover-triggered-day-modal-round-2-8c"></a>**Hover-triggered day modal (Round 2 · 8c).** Calendar cells with
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
- <a id="rectangular-pto-tile-round-2-8d"></a>**Rectangular PTO tile (Round 2 · 8d).** The Time / PTO side rail
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
- <a id="coverage-strip-nav-hint-round-2-8z"></a>**Coverage-strip nav hint (Round 2 · 8z).** The Clock view's
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
- <a id="call-notes-vertical-layout-contenteditable-round-2-8e"></a>**Call Notes vertical layout + contenteditable (Round 2 · 8e).**
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
- <a id="manual-copy-failover-on-cn-frame-round-2-deferred-8e-rescope"></a>**Manual-copy failover on `#cn-frame` (Round 2 deferred 8e; RESCOPED
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
- <a id="multi-select-flag-toolbar-free-text-tags-round-2-8e"></a>**Multi-select flag toolbar + free-text tags (Round 2 · 8e).** The
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
- <a id="multi-turn-q-a-thread-on-training-notes-round-2-8g"></a>**Multi-turn Q&A thread on training notes (Round 2 · 8g).**
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
- <a id="admin-tab-augmented-with-kpis-tag-taxonomy-round-2-8h-2nd-pa"></a>**Admin tab augmented with KPIs + tag taxonomy (Round 2 · 8h; 2nd-pass
  consolidation; design handoff PR 2, 2026-09-02).** The Admin tab is split into
  **Overview / System / Tags / Compliance / Config / Sheets** sub-tabs
  (`cnAdminTab_(key, anchorId?)`, persisted in `CN_STATE.adminTab`; the optional
  anchor scrolls to a section — the Overview cards use it). **Overview** = the
  deploy-readiness checklist → a 3-card **System status** summary (Automation /
  CDR / Storage) → a 4-cell `.telemetry` KPI strip (Week notes / Unresolved /
  Tags / Reps) → the Feature-usage panel. **System (PR 2) is FINDINGS-FIRST:**
  a "Needs attention" list at the top, then the Storage inventory table, then
  the Automation detail panel. ONE pure derivation, `cnHealthFindings_(health,
  storage)` → `{items: [{id, area, severity: ok|warn|fail, title, detail, fix,
  link}], degraded}`, feeds the list, the three Overview cards (each a real
  `<button>` linking into the System tab's matching section — `cn-sys-sec-
  automation|cdr|storage`), AND the System tab's count badge (`cnSetSysBadge_`,
  with an aria-label text equivalent), so the three surfaces cannot disagree
  and the server payload is UNCHANGED (the fixture-key derivation pin still
  holds). Its severity rule is INV-186 in code: a check carries a non-ok
  severity ONLY when its count reads zero on a healthy deployment — the two raw
  CDR name lists ride an `ok` item's detail, a no-fallback store (External / HR /
  QA) left unset is an `ok` fact, and a FAILED load is a `fail` FINDING plus a
  `degraded[area]` marker (INV-187 — "could not check" must never render as
  "All OK"; the cards read "Unavailable"). The retired "System details"
  disclosure (`cnToggleSysDetails_`, `.cn-sys-details-btn`) and the second
  card derivation (`cnSetSysFromHealth_`) are banned from returning (INV-184,
  PR2-2/PR2-3). **Tags** = ONE merged **taxonomy + trends** table
  (`cnRenderAdminAugmentHtml_` joins `getCallNotesTagTaxonomy` rows with
  `getCallNotesTagTrends` `series[]` by tag): columns Tag / Usage bar / Notes /
  **Trend** (inline sparkline `cnTrendSparkSvg_`) / **Δ wk** / Actions
  (Rename / Merge / Archive); the prior separate "Tag Trends" panel +
  `#cn-admin-trends` slot were removed (the low-value "Last seen" column was
  dropped for Trend+Δ). ADMIN-gated (`callerEmp.isAdmin` — this read
  "manager-gated" until F-26, cycle 20, while every one of these endpoints
  refused a manager who is not also an admin). Taxonomy scans each enrolled rep's Sheet
  for `subformData.tags[]`, marking each with an `archived` flag from
  `CN_ARCHIVED_TAGS`; `archivedOnlyTags[]` surfaces archived tags no longer in
  use (Restore). Trends bucket by ISO week over the trailing 12 (INV-125,
  archived excluded). **Compliance** = the audit panel; **Config** = the
  dept-email / state-tax / suggestions controls (preserved unchanged).

  **Batch 6 (2026-09-18, F-12): the strip reports TEAM scope, and each cell
  states its own.** Two of the four cells took `getCallNotesAmbient` — the
  CALLER'S OWN Sheet — and captioned the first of them "across team", so an
  admin with a quiet week read the whole team as quiet. The convenient source
  was the wrong one: the endpoint exists to feed that admin's own sidebar.
  Notes is now `getCallNotesTagTaxonomy.totalNotes` (every enrolled rep's
  notes, all-time — the same walk the table below it already pays for) and
  Unresolved is `managerGetUnresolvedActionCount`, the 2-minute-cached
  cross-rep walk behind the Team Notes badge, added as a fourth parallel
  fetch. Scope moved OUT of the strip's implication and INTO each cell's
  sub-line, because two of the four are genuinely not team-wide-all-time and
  a single header would have to lie about one of them. The cross-rep walk
  already reported `partial` when a rep Sheet could not be read and nothing
  rendered it: `≥ N` with the reason now, a dash plus "could not be read" on
  an error, and a plain number only for a complete walk (INV-187).
- <a id="external-email-message-template-library-admin-tab"></a>**External-email message template library (Admin tab).** Manager-
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
- <a id="quick-links-picker-admin-tab-external-composer"></a>**Quick Links picker (Admin tab + external composer).** The same
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
- <a id="reference-tool-native-markdown-articles-drive-embeds-one-sto"></a>**Reference tool: native markdown articles + Drive embeds, one store.** The KB
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
- <a id="kb-phase-2-per-item-doc-article-converter-review-before-save"></a>**KB Phase 2: per-item Doc→article converter, review-before-save.**
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
- <a id="interactive-roster-block-roster-operator-2026-08-11"></a>**Interactive roster block (` ```roster `, operator 2026-08-11).** An
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
- <a id="a-fenced-block-is-atomic-in-search-chunk-truncation-operator"></a>**A fenced block is ATOMIC in search-chunk truncation (operator 2026-08-11).**
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
- <a id="decision-task-guide-block-decision-operator-2026-08-11"></a>**Decision / task-guide block (` ```decision `, operator 2026-08-11).** Asked
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
- <a id="glossary-block-glossary-operator-2026-08-11"></a>**Glossary block (` ```glossary `, operator 2026-08-11).** This department
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
- <a id="warehouse-map-block-map-operator-2026-08-13-tier-a-no-billin"></a>**Warehouse map block (` ```map `, operator 2026-08-13 — Tier A, NO
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
- <a id="article-images-fall-back-to-server-served-data-when-drive-bl"></a>**Article images fall back to server-served data when Drive blocks the
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
- <a id="apps-script-s-missing-scope-refusal-is-not-an-admin-block-an"></a>**Apps Script's missing-SCOPE refusal is NOT an admin block, and a green
  `runAllTests()` does not vouch for Drive (operator 2026-09-09).** A Doc
  conversion left its images as placeholders with `You do not have permission
  to call DriveApp.createFolder. Required permissions:
  https://www.googleapis.com/auth/drive`. That string is the Apps Script
  RUNTIME declining locally — it compares the method's required scope against
  the executing token and refuses BEFORE any request reaches Drive, which is
  why the execution log carries nothing further. **The three failures look
  different and must not be confused:** a missing scope fails at CALL time
  with that message; a Workspace **admin** restriction fails at
  AUTHORIZATION time ("Access blocked", "This app is blocked", an admin-policy
  line on the consent screen); and a Drive **sharing/DLP** restriction lets
  the call succeed and fails only the sharing step — the shape this domain
  already showed on 2026-08-13, which is why `getOrCreateKbImagesFolder_`
  catches `setSharing` separately. **`appsscript.json` declares no
  `oauthScopes`, so the set is AUTO-DETECTED** from the code, and `Code.js`
  calls `createFolder`/`createFile`/`setSharing` — so full `/auth/drive` is
  in the required set. **A `clasp push` + New version NEVER re-prompts:** the
  web app is `executeAs: USER_DEPLOYING`, so every rep's action runs on the
  grant the DEPLOYING account consented to earlier, and a deploy that widens
  the detected set leaves that grant short until someone runs a function from
  the editor and accepts (Google's granular consent also lets a user UNTICK
  the Drive permission on that screen — a real cause with exactly this
  symptom). **Nothing surfaced it: `Tests.js` contains ZERO `DriveApp`
  references** — the `kbUploadImage` cases only exercise the validation
  rejections, which all return before the Drive write — so 308/308 said
  nothing about Drive and the gap could sit unnoticed for weeks. Admin →
  System now reports it (see INV-197); the general rule is that **a green
  suite vouches only for what it calls.**
  **A FOURTH outcome exists and it is the one this deployment hit (operator
  2026-09-14): running a function produces NO PROMPT AT ALL and the scope is
  still missing.** Apps Script prompts by comparing the project's required set
  against a STORED authorization record, and Google's granular consent can
  leave that record reading "authorized" while the granted set is short (Drive
  unticked on an earlier accept) — so re-running a function is a no-op and
  re-running it again will stay a no-op. **The remedy is to REVOKE and
  re-consent**, not to run another function: myaccount.google.com → Data &
  privacy → Third-party apps & services → the script → Remove access, then run
  any function in the editor AS THE DEPLOYING ACCOUNT and accept with every
  permission ticked. **The probe is trustworthy here, and this was TESTED
  rather than assumed:** a mid-Batch-Q follow-on hypothesised that
  `driveAccessStatus_` might be lying — `ScriptApp.getOAuthToken()` returns the
  RUNNING EXECUTION's token, so a Storage Health run that never touches DriveApp
  could in principle yield a token without the scope while Drive works — and
  proposed rewriting the probe to attempt a read-only DriveApp call instead. The
  operator ran the decisive one-paste diagnostic and the hypothesis is
  FALSIFIED: in ONE execution `DriveApp.getRootFolder()` failed with the
  missing-scope refusal AND the probe returned `granted:false` with an EMPTY
  `error` (tokeninfo answered 200 and simply did not list the scope — a positive
  signal, not a probe failure). They agree, so **do not rewrite the probe**; it
  reported the truth. Keep the diagnostic for the next time the question comes
  up — it costs one paste and settles it:
      function driveDiag_() {
        try { Logger.log('DriveApp OK — root: ' + DriveApp.getRootFolder().getName()); }
        catch (e) { Logger.log('DriveApp FAILED: ' + e.message); }
        Logger.log('probe: ' + JSON.stringify(driveAccessStatus_()));
      }
- <a id="sheet-article-conversion-operator-2026-08-11"></a>**Sheet→article conversion (operator 2026-08-11).** A Drive SHEET embed is
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
- <a id="kb-phase-2b-converter-images-export-to-drive-at-save-time"></a>**KB Phase 2b — converter images export to Drive at SAVE time.** The
  converter (still strictly READ-ONLY, INV-115) emits a
  `![Doc image n](kbdoc:<fileId>:<n>)` token per `INLINE_IMAGE`
  (paragraph children, document order, cap `KB_DOC_IMAGE_CAP`=20/doc;
  drawings have no blob API and keep the italic placeholder). The editor
  preview renders the token as a visible **pending chip** ("Doc image N —
  appears after Save"; operator 2026-08-27 — the previous bare alt text
  read as "the images are missing"; `kbMd_` still demotes every other
  non-http image scheme to alt text — unchanged security boundary, no
  URL emitted). When the manager presses Save,
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
  toast, and the audit row carries `imagesExported=`. **A failed export is
  NAMED, STICKY, and AUDIT-RECORDED (operator live report 2026-08-27):**
  the token replacer's own catch reduces any throw to a bare null, so a
  `createFile`/`getFilesByName` failure (a domain Drive policy, a quota)
  used to surface only as the generic "N token(s) could not be resolved"
  — in a 3.5s toast the operator could not read. The per-image catch now
  pushes the Drive error's own message into the warnings, the client
  renders image warnings sticky (the INV-190 actionable-error rule), and
  the `KbItemSave` audit row records `imageWarnings=<n>: <first reason>`
  so the cause is readable afterward from Admin → Sheets → AuditLog.
  Re-saving the article is the retry — exports are idempotent. Pinned by the
  "kb — Phase 2b" Node tests (token emission, cap, extract/replace,
  walk mirror, preview/final kbMd_ render).
- <a id="kb-phase-3-paste-a-screenshot-upload-in-the-article-editor"></a>**KB Phase 3 — paste-a-screenshot upload in the article editor.** Pasting
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
- <a id="kb-ai-phase-a-facet-based-guidance-card-in-the-reference-dra"></a>**KB AI Phase A — facet-based guidance card in the Reference drawer.**
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
- <a id="kb-reference-drawer-mid-call-lookup-as-a-shell-capability"></a>**KB reference drawer — mid-call lookup as a shell capability.** A
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
- <a id="kb-usage-feedback-loop-most-referenced-during-calls"></a>**KB usage feedback loop ("most referenced during calls").** Every
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
- <a id="self-improving-kb-loop-rep-freshness-signal-content-gap-requ"></a>**Self-improving-KB loop — rep freshness signal + content-gap requests
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
- <a id="win-back-nudge-on-a-changing-suppliers-close"></a>**Win-back nudge on a "changing suppliers" close.** When a Close-Order
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
- <a id="compliance-audit-panel-admin-tab"></a>**Compliance audit panel (Admin tab).** Manager-only call-note
  AuditLog search living in the Admin tab below the tag taxonomy —
  resolving the deferred "compliance audit Admin panel." Backed by
  `getCallNotesAuditLog(filters)` (ADMIN-gated — `callerEmp.isAdmin`; the
  panel lives on the Admin tab and the gate always said so, F-26): filters by rep
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
- <a id="deploy-readiness-checklist-admin-overview-headline"></a>**Deploy-readiness checklist (Admin Overview headline).** A manager-gated,
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
- <a id="patient-trx-timeline-rep-facing-read-only"></a>**Patient/TRX timeline (rep-facing, read-only).** `getPatientTimeline(trx)`
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
- <a id="storage-health-leads-with-drive-which-no-store-row-can-see-o"></a>**Storage Health leads with DRIVE, which no store row can see (operator
  2026-09-09).** Every row in the inventory is a Spreadsheet, and Sheets ride
  a different scope — so all eight could read OK while the KB image export,
  the embed reachability check and QA recording playback were failing on a
  missing `/auth/drive` grant, which is exactly what happened. A capability
  line sits ABOVE the table (not in it: Drive has no timezone, retention or
  link column to fill) and the same state rides `cnHealthFindings_` as a
  `storage` finding, so it reaches the Overview Storage card and the System
  badge for free. See INV-197 for the probe's side-effect-freedom and its
  null-is-unknown rule. **A SECOND capability line joined it the same day
  (F3, cycle 19): mail routing.** `MAIL_BCC_ALL` is merged into every email
  the app sends — intake bodies carry full patient answers, department emails
  carry the patient name + TRX — and it appeared NOWHERE in the app: not
  Admin, not Storage Health, not Automation Health, not the feature-flag
  surface. Its documented purpose is transient ("set it while testing, clear
  it after"), which is exactly the setting most likely to be left on, and a
  silent standing PHI copy is what an audit finds rather than what an operator
  remembers. It rides `getStorageHealth` as a read-only `mailBccStatus_` and
  surfaces twice from ONE derivation, exactly as Drive does: the line above
  the table (mail has no timezone, retention or link column either) and a
  `cnHealthFindings_` item. Unset is an `ok` FACT (INV-186 — the tab must
  still reach "Nothing needs attention"), set-and-internal is a standing
  `warn` naming the address and what rides in those copies, and an address
  outside the deploying account's own domain is `fail`/blocking. The org
  domain comes from `Session.getEffectiveUser()` — the account that owns every
  store and sends every message — so there is no second copy of the domain to
  drift from `doGet`'s own check, and `external` is `null` when that account
  cannot be read (unknown, never "all clear"). **It REPORTS; it does not
  enforce** — silently dropping an address the operator deliberately typed
  would leave them believing in copies they are not getting, a worse failure
  than the one being guarded (INV-187's direction). The send path is
  untouched: `mailBccAll_` and `mailMergeBcc_` are byte-identical and the new
  function is a sibling between them. Blocking an off-domain BCC rather than
  flagging it is a deliberate policy change to `mailMergeBcc_` and an operator
  decision, not a defect.
  **A THIRD capability line joined them in Batch Q (2026-09-11): Script
  Properties.** Same reason as the other two — the store is app-wide, has no
  timezone, retention or link column, and no row in a table of SPREADSHEETS can
  carry it. `scriptPropertiesStatus_` reports bytes used against the 500KB store
  cap and the LARGEST single value against the ~9KB per-value cap (the one that
  actually bites — see the Script-Properties gotcha). It is strictly read-only
  and values are **COUNTED, never returned**: several of those properties hold
  operator config an audit would rather not see echoed into a health panel, and
  a byte count answers the question without quoting anything. A failed read is
  `bytes: null` — unknown, never OK (INV-187) — and it rides `cnHealthFindings_`
  as an **ok FACT** while the store is comfortable, warning only past
  `PROP_WARN_PCT` (80%) of either cap or on an unreadable read, so the System tab
  still reaches "Nothing needs attention" on a healthy deployment (INV-186).
- <a id="storage-health-panel-admin-tab-1"></a>**Storage Health panel (Admin tab, #1).** Manager-only, read-only
  one-pane-of-glass over every spreadsheet the app uses (`getStorageHealth`,
  rendered by `cnLoadStoragePanel_`). Since design handoff PR 2 (2026-09-02) it
  is the **Storage inventory** on the Admin **System** sub-tab — a real table
  through the shared `mtRenderTable_` (V-11: Store · Class · Status · Timezone
  · Retention · link, row-toned `sv-row-danger/warn`) with an expandable detail
  row per store (INV-182 `detailRow`/`rowId`; the disclosure is a real button
  driven by `cnToggleDetailRow_`, INV-174) carrying the note / per-rep problems
  / the exact tz fix — and, on the CDR Report row since Batch 3 (2026-09-17),
  which holiday calendar and which answer standard are LIVE (`cdrHolidayProbe_`
  / `cdrStandardProbe_`, each with a CDR-area finding for every fallback
  state, g123/g124); the VERDICTS live in the findings list above it (see the
  Admin KDD) and the Overview Storage card links here. The hand-rolled
  `.cn-storage-row/-main/-role/-meta` rows are retired (INV-184). For each of the
  eight stores (see the Operator State Checklist's storage map — the QA store joined 2026-08-28 #3, its retention field reflecting the LIVE `QA_REVIEW_RETENTION_DAYS` window so an enabled review-record purge is visible where every other store's policy is; its not-set pill is muted, the no-fallback-by-design tone) it reports which
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
- <a id="automation-health-panel-admin-tab"></a>**Automation Health panel (Admin tab).** Manager-only, read-only
  surfacing of the silent-degradation signals (`getAutomationHealth`,
  rendered by `cnLoadHealthPanel_`; since design handoff PR 2 (2026-09-02) it
  is the **Automation detail** panel at the foot of the Admin **System**
  sub-tab — REFERENCE behind the findings list, which is where the verdicts
  live; the Automation + CDR Overview cards link into it). One
  bounded AuditLog tail scan (`CN_AUDIT_MAX_SCAN` rows) yields (a) the
  `PersonalSheetSyncFail` count + 5 most recent entries over a 30-day
  window and (b) the last-seen audit row per automation job
  (`AUTOMATION_AUDIT_ACTIONS`: reconcile / ADP export / both form+note purges /
  the call-notes cold-archive / the cold-archive purge / the timesheet
  cold-archive / the PTO accrual credit / the diagnostics purge) —
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

  **Batch 4 (2026-09-18, F-20): every daily trigger has a liveness signal.**
  Three daily jobs wrote no audit row and had no heartbeat — the missed-punch
  alerts, the ADP export CHECK (its `AdpExportAuto` row lands only at a period
  end, deliberately absent from JOB_CHECKS) and the failure digest itself — so
  each could die silently. They heartbeat now (`missedPunch` / `exportCheck` /
  `automationHealth`, 26h) rather than gaining JOB_CHECKS rows, because a
  JOB_CHECKS row needs an audit action to compare against and a row per run
  would be two AuditLog rows a day for jobs whose only signal is "I ran".
  Each stamps its own failure, `automationProblems_` carries a stamp under ANY
  key (the table's rows stay with the table), and the Admin finding shows the
  stamp's message — it had read the wrong field and rendered every stamped
  failure as "unknown error".
- <a id="open-email-button-round-2-8f"></a>**"Open Email" button (Round 2 · 8f).** The Phase-4 "External"
  button on the Log view's action row was renamed "Open Email"
  (still binds `cn-ext-email-btn` → opens the external composer
  modal — customer/provider emails). Save & Compose still opens
  the department composer. Both composer modals share a tab-strip
  (see the next decision) so reps can flip between them without
  losing note context.
- <a id="email-composer-internal-external-tab-merge"></a>**Email composer Internal/External tab merge.**
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
- <a id="tag-taxonomy-rename-merge-archive-batch-edits-across-reps"></a>**Tag taxonomy rename/merge/archive batch-edits across reps.**
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

  **Batch 5 (2026-09-18, F-10): the per-rep try/catch REPORTS.** Isolating a
  failure per rep is right — one unreachable Sheet must not fail the other
  N−1 — but the catch was empty, so a rename that missed a rep returned
  success, wrote `reps=N−1` in the audit row with nothing marking the gap, and
  left that rep's notes on the old tag for good. The walk returns
  `skippedReps: [{id, error}]`; both callers append the ids to the audit row
  (`cnTagSkippedNote_` — ids only, INV-32) and ship the list; the Admin toast
  turns WARN and names the reps to re-share and re-run. INV-220 generalises
  it: a cross-rep walk that skips a member owes all three.
- <a id="uiconfirm-uiprompt-replace-native-window-confirm-window-prom"></a>**`uiConfirm` / `uiPrompt` replace native `window.confirm` /
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

  **Batch 6 (2026-09-18, F-40 + F-30): every overlay goes through the two
  functions, static ones included.** `uiConfirm`/`uiPrompt` and the dynamic
  overlays had the focus lifecycle from the day it was built; the six STATIC
  modals in `modals.html` never did, because they predate `ensureOverlay` and
  were opened with `classList.add('open')`. They kept their aria attributes
  (which is why the a11y sweep never flagged them) and quietly lacked the
  behaviour those attributes promise: focus stayed put on open and landed at
  the top of the document on close, on five dialogs a manager opens daily.
  Routing them through `ensureOverlay`/`closeOverlay` is additive — the helper
  writes `role`/`aria-*` only when asked — and it is now INV-221. The one
  wrinkle is worth the entry: `ensureOverlay` ASSIGNS `className`, so
  `day-overlay`'s `hover-mode` (it doubles as the calendar's tethered popover)
  had to be read off the node and handed back through `extraClass`, or a hover
  preview would have become a focus-stealing modal (g134).
- <a id="training-rides-on-the-reference-kb-layer-t1"></a>**Training rides ON the Reference/KB layer (T1).** Training content is
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
- <a id="operator-feedback-round-2026-06-12-note-template-ergonomics"></a>**Operator feedback round (2026-06-12) — note-template ergonomics for the
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
- <a id="onboarding-tour-hand-rolled-coach-marks-script-tour-html"></a>**Onboarding tour — hand-rolled coach-marks (`script_tour.html`).** A
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
- <a id="the-script-property-budget-badge-has-one-home-propbudgethtml"></a>**The Script-Property budget badge has ONE home (`propBudgetHtml_` +
  `.prop-budget`, Batch Q).** Eleven Admin editors and the Reference synonyms
  modal each save into a capped Script Property, and a size the operator cannot
  see is a cap they can only discover by hitting it — so every one of them shows
  the SERIALIZED size against the ~9KB per-value cap, built by one shell helper
  over one shared stylesheet rule (the `mtRenderTable_` / `mtDateRange_`
  precedent: a twelfth editor is a call, not a copy). The server ships the
  budget rather than the client computing it — `getAdminConfig.propBudget` for
  the 13 operator keys plus `propValueMax`, `kbGetSearchConfig` its own — because
  the size that matters is the STORED value's, which only the server can measure,
  and a client-side estimate of a JSON blob would drift from it. Two properties
  make it safe: it renders **NOTHING** without a server budget (an older
  client/server pair degrades to no badge rather than a fabricated "0%"), and the
  tone thresholds live in exactly one place, so no editor can disagree with
  another about what "nearly full" means. The synonyms modal reads the SOLE
  budget value rather than naming the server's property constant — no second name
  to keep in step.
- <a id="shared-mtrendertable-table-component-script-core-html"></a>**Shared `mtRenderTable_` table component (`script_core.html`).** One
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
- <a id="shared-date-range-control-mtdaterange-percent-band-mtpcttone"></a>**Shared date-range control `mtDateRange_` + percent band `mtPctTone_`
  (`script_core.html`, design handoff PR 1 — 2026-09-02).** Three range controls had
  drifted (Metrics: pressed presets + a `Custom…` disclosure; Punctuality:
  `.punct-preset` with no pressed state; Coverage: no presets at all). The Metrics
  vocabulary is now the shared `mtDateRange_(opts)` — the STRIP only (real
  `type="button"` chips, `data-preset` + `aria-pressed`, a Custom chip that is BOTH a
  state chip and a disclosure with `aria-expanded`/`aria-controls`, INV-173/174) —
  plus `mtDateRangeRow_(rowId, open, innerHtml)` for the inputs row,
  `mtDateRangeSync_(scope, active)` to re-press after a manual edit, and
  `mtDateRangeToggle_(scope, rowId)`, which returns the new open state so the CALLER
  remembers it (the helper owns markup and DOM, never state — Metrics keeps its
  `M_STATE.customOpen`; Punctuality (`PUNCT_STATE`) and Coverage (`COV_STATE`)
  adopted it in PR 3 the same day). Metrics is the first
  consumer (`mMyPresetBtn_`/`mTeamPresetBtn_`/`mCustomChip_` retired, INV-184); the
  `.m-custom-row` + its load-bearing `[hidden]` companion moved to the tokens partial
  with the control. `mtPctTone_(p, hi, lo)` is the ONE tri-tone band rule:
  `mPctClass_(p, thr)` delegates as `(thr|80, 50)` byte-identically (pinned across the
  grid), and Punctuality passes its own 90/75 — the doc's "reuse the mechanism, not
  the numbers", which the old `mPctClass_` could not do because its lower band was a
  hardcoded 50. Pinned by PR1-2/PR1-3 + the rewritten `#2` metrics pin.
- <a id="admin-sheet-viewer-tier-2-getadminsheetview"></a>**Admin sheet viewer (Tier 2 — `getAdminSheetView`).** A manager-gated
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
- <a id="icon-library-additions-script-icons-html"></a>**Icon library additions (`script_icons.html`).** The redesign added
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
- <a id="punch-button-motion-dashboard-feedback-batch"></a>**Punch-button motion (dashboard-feedback batch).** Two transform/opacity-only
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
- <a id="unified-loader-motion-system-2nd-pass-styles-html-script-cor"></a>**Unified loader + motion system (2nd-pass; `styles.html` + `script_core.html`).**
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
  and the localStorage key count fell by one. The star field and the
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

- <a id="cross-view-hints-are-parked-on-window-consumed-and-nulled-on"></a>**Cross-view hints are PARKED on `window`, consumed-and-nulled on the target's
  enter, never persisted (design handoff C8 — named 2026-09-02).** The pattern the
  app already used four times without a name: `COACH_PREFILL` (Call Notes "Coach on
  this" → the Coaching composer; `cnMgrCoachOnNote_`), `CLK_NAV_HINT` (the Clock
  coverage strip's "File N missing" → the Call Notes Log; `fileMissingCalls_` →
  `cnConsumeNavHint_`), `CN_STATE.mgrPendingRepDrill` (the audit panel → Team Notes
  Per-Rep), and `TO_PENDING_DAY_OPEN` (the Time/PTO quick-actions card → another
  month's day modal via `calNavTo_`). Rules: the SOURCE sets the hint then calls
  `enterTool`/`showView`; the TARGET's enter reads it FIRST, nulls it, then acts (so a
  stale hint can never fire on a later plain navigation); nothing is written to
  localStorage (a hint is one gesture, not a preference — the `umsLastView` boot
  restore must not replay it); the hint carries ids and prefill only, never a
  server-owned decision. The QA→Coaching and Punctuality→Coaching hand-offs (PRs 3/5)
  reuse `COACH_PREFILL`; a NEW hand-off adds a hint to this list rather than a fifth
  shape. The URL is NOT an alternative here — INV-78 (the HtmlService iframe
  sandboxes `window.location`) is why the in-memory hint exists.
Items identified during the V1–V4 + Round 2 redesign work that
were intentionally deferred. The redesign itself is complete; these
are polish/expansion items captured here so the next session can
pick them up without re-deriving the context.

- <a id="tag-suggestion-autocomplete-on-the-log-view"></a>**Tag-suggestion autocomplete on the Log view.** *(Implemented, B3.)*
  The Log-view tag input (`#cn-tag-input`) carries a `<datalist>`
  (`#cn-tag-suggestions`) populated on view enter by `cnLoadTagSuggestions_`
  → `getCallNoteTagSuggestions` (rep-callable, caller-scoped, read-only): a
  column-bounded read of the caller's own `SubformData` column that returns
  their unique, non-archived (`getArchivedTagsSet_`) tags. Cross-rep / shared-
  vocabulary suggestions were intentionally left out (the manager taxonomy
  aggregate is the expensive, manager-gated path); own-history keeps it cheap
  and leak-free. A future enhancement could surface team-wide active tags via
  a short-TTL cached cross-rep variant.

- <a id="the-answer-standard-is-the-department-dashboard-s-published"></a>**The answer standard is the Department Dashboard's, PUBLISHED and read -- never mirrored, and no standard means no verdict (H2, 2026-09-17)**

  A CSR rep opens this app every day; their manager opens the Department
  Dashboard (`call-data-reporting`). Both show the same DQE row's answer rate,
  and until H2 they disagreed three ways: the formula (rung vs answered+missed,
  and one decimal vs the dashboard's whole percent -- the same rounding now),
  the target (a CONFIG `85` here vs the dashboard's per-dept standard, CSR 92
  with a 2-pt amber band, which its admin can change without a redeploy), and
  the team benchmark (the dashboard subtracts a manager's token volume; this
  app did not). The decision has three parts.

  **The dashboard owns the standard; this app reads it.** The target, band and
  exclusions live in the dashboard's Script Properties and its Dept Config
  sheet -- nothing an external reader can see -- so the dashboard PUBLISHES its
  resolution into a `Dashboard Standards` tab in the CDR Report workbook (its
  Operator State #37), and `getCdrDashboardStandard_` reads that tab for
  `CONFIG.CDR_DASHBOARD_DEPT` (the dashboard's roster header, overridable by
  Script Property) with the `*` global row as the fallback. Publishing beats the
  alternatives: mirroring a number here re-creates the drift the moment the
  admin edits it; asking the dashboard's server for it is not viable (both apps
  resolve identity from `Session.getActiveUser()`, so one app's UrlFetch to the
  other arrives as the deployer); and a shared sheet is the channel the two
  apps already use for holidays (H1).

  **No standard means no verdict.** When the tab is absent, empty, unreadable
  or has neither the dept row nor `*`, the endpoints ship a NULL target and the
  clients render no target line, no tone and no sidebar badge -- the
  `getMetricsAmbient` response says `unavailable: 'standard'`. The legacy
  80/50 band and the 85 cutoff were verdicts on numbers nobody set (g122's
  rule, INV-187's spirit): a colour is a verdict, and a wrong one on a rep's own
  KPI is worse than none.

  **Exclusions leave the benchmark, never the totals.** The dashboard's R18
  ruling: `TEAM_AVG_EXCLUDES` applies to per-agent averages and benchmarks
  only, while dept totals and rates keep everyone. Here that is
  `dashboardTeamAggregate_` / `metricsTeamAvgSeries_` (the anonymized team
  line and the cohort benchmark) vs `getTeamMetrics.teamTotals`. An excluded
  rep still sees their OWN numbers against a benchmark that does not include
  them.

  **Batch 3 follow-through (cycle-20 scan, 2026-09-17).** H2 shipped the
  band and the source and left two things undecided: what a NULL band means
  (each consumer decided alone -- 0 pt on the table, the local 5 pt on the
  Clock card) and who reads `standardSource` (nobody). `mtAnswerBand_` is now
  the ONE null-band rule -- no published band means no amber tier, on every
  surface, because a band the dashboard did not publish is a number nobody
  set (the same reasoning as the null target); Transfer % keeps its local
  slack because it has no published standard at all. The source is rendered
  wherever the verdict is: beside the target on both heroes, and on the
  Admin → System CDR row with a finding. The badge tooltip's residual `|| 85`
  is gone (a badge exists only with a published target, so the caption needs
  no fallback). And a window with nothing answered or missed has NO rate --
  `cdrAnswerPct_` returns null, which every surface dashes -- because the 0
  it returned read as "every call missed". Gotcha g131; INV-216..218.

  Recorded in `.cycle/config.md` as INV-211 and scenario S111; the gotcha is
  g124. The formula change bumped every rate-carrying cache key (INV-85).

- <a id="a-sparkline-day-has-three-states-and-the-unknown-one"></a>**A sparkline day has THREE states, and the unknown one is drawn (Batch 7 of the cycle-20 scan, F-48, 2026-09-18)**

  The manager's live-status card carries a 7-workday hours sparkline. Its
  source map is sparse: a day lands in it only when both a Clock In and a
  Clock Out exist and `calcHours_` returns a number. The card filled the
  missing slots with `|| 0`, which merged three genuinely different days into
  one bar — the rep did not work, the rep is clocked in RIGHT NOW, and the
  rep's stamps would not parse.

  The alternatives were to drop the unknown day from the series, to leave it
  as a zero, or to draw it as itself. Dropping it was rejected because the
  strip is a WEEK: six bars where there should be seven silently shifts every
  other day's position, which is the V-10 mistake in a different costume.
  Leaving it as zero was the defect. So the unknown is drawn — a hatched
  full-height bar, its tooltip reading "no data", visibly not a measurement.
  Full height rather than a stub because the slot's job is to hold the day's
  place, and a hatch cannot be misread as a value.

  Three consequences follow, and all three are deliberate. The server tells
  the states apart by PRESENCE in the map rather than truthiness, so a genuine
  `0.0h` day is still a measured zero. The card's total counts only the days
  it could measure and carries a `·N?` suffix saying how many it could not,
  because a quietly under-reported total is the same lie one step on
  (INV-187). And a week of nothing BUT unknowns renders, where the old
  `totalHrs === 0` early return would have hidden it — that is the week most
  worth seeing, since it usually means a rep has not clocked out in days.

  Recorded as gotcha g136, scenario S10's third-state expectation, and the
  visual fixture's own null day (INV-185: a fixture that never produces null
  can never photograph the difference).

- <a id="one-voicemail-fold-serves-the-spanish-list-and-the"></a>**ONE voicemail fold serves the Spanish list and the Spanish stats card (Batch 7 of the cycle-20 scan, F-34, 2026-09-18)**

  8x8 sends its A_Q_Spanish voicemail notifications to each member's
  individual inbox, never to the Spanish group address, so a voicemail cannot
  match `spanishSearchQuery_`. The operator round of 2026-08-25 taught
  `getSpanishInboxPending` to run a second sender-and-subject search and fold
  those threads in. It did not teach `getSpanishInboxStats`, which computes
  from the same mailbox and renders directly ABOVE that list. The two had
  disagreed every day since: four pending cards under a card that said three.

  The fix could have been a second fold in the stats function. It is one
  shared fold instead, because the two had already drifted once on their own
  and the fold is where every judgement lives — which threads count, which are
  hang-ups, what counts as resolved. `spanishVmFold_` returns the surviving
  threads with a resolution stamp, and each caller builds its own shape from
  the thread, so the list pays for `getPermalink()` and the stats card does
  not.

  Two ordering decisions inside it. The SP4 duration gate runs BEFORE the
  resolution check, so a hang-up is work on neither surface; the cost is that
  `vmSuppressed` now counts a short voicemail that was later resolved, and
  the counter's meaning becomes "hang-ups the gate hid from both surfaces".
  And the fold reports `on` separately from an empty result, so a caller can
  tell "not configured" from "none came in" — the stats card renders those two
  differently rather than both as nothing (INV-187).

  The visual fixture had been photographing the disagreement for a month with
  nobody reading it as a bug, so the pin now requires the fixture's stats count
  to equal the number of cards it renders. Recorded as INV-223.

- <a id="a-gate-claim-is-derived-from-the-refusal"></a>**A gate CLAIM is derived from the refusal, never written by hand (Batch 7 of the cycle-20 scan, F-26 + F-51, 2026-09-18)**

  Twenty-one places in this repo said "manager-gated" about an endpoint that
  enforces `callerEmp.isAdmin`: nine doc comments the scan named, ten more it
  did not, INV-31 for nineteen endpoints, INV-82, and two paragraphs in this
  file. A manager who is not also in `ADMIN_EMAILS` is refused by every one of
  them. The cost is not academic — INV-31 is what an operator reads when
  deciding how wide `ADMIN_EMAILS` needs to be.

  The same hand-carrying ran through the generated counts block from the other
  end. "Manager-gated endpoints" counted the `'Manager access required.'`
  literal alone, so every endpoint gated by `assertManagerCaller_` — which
  THROWS rather than returning, and covers the trigger handlers — was missing
  from a figure captioned as the size of the manager surface, along with the
  whole QA tier.

  So the rule is one rule for both: the gate claim is DERIVED from what the
  endpoint refuses with. The doc-comment check walks every server function and
  compares the comment ending immediately above the declaration against the
  refusal literal in the body; the counts derive three families the same way.
  `canSeeQa_` gets a row of its own rather than joining manager, because it
  admits `isManager OR QA_MEMBERS` and folding it in would swap an undercount
  for a wrong claim about who may call. And a family is counted by its
  REFUSAL, never by a mention of its helper: `getEmployeeState` calls
  `canSeeQa_` to ship a flag to the client and gates nothing at all.

  Recorded as INV-224.
- <a id="every-sheet-write-crosses-one-boundary-and-plain-text"></a>**Every sheet write crosses ONE boundary, and plain-text cells are the one exception (cycle 22 S2, 2026-09-23)**
  — Sheets parses a written string as if typed, so text starting `=`, or
  `+`/`-`/`@` before a non-number, becomes a formula (g144). The audit found
  the class on a few rep-typed fields. The obvious fix was to wrap THOSE
  fields, and that is the approach that had already failed: every site was
  written by someone who judged its value "not user-supplied", and the
  judgement was wrong for callback notes, issue text, reasons, labels,
  roster-sourced names, QA comments and more. So the boundary is BLANKET.
  Every `setValue` / `setValues` / `appendRow` in the fourteen server files
  and `DevTools.js` goes through `sheetSafe_` / `sheetSafeRow_` /
  `sheetSafeRows_`, whatever the value. The helper is a no-op for numbers,
  Dates, booleans and ordinary text, so wrapping a value that could never be
  hostile costs nothing and requires no judgement. The SHEET-SAFE lint rule
  makes an unwrapped write a CI failure rather than a review comment.
  **Plain-text (`@`) cells are the exception, and the reason is the
  apostrophe.** An `@` cell never evaluates a formula, so the format IS the
  neutraliser, but it also stores input literally, so `sheetSafe_`'s
  apostrophe would be kept and read back. The scratchpad, the KB data-table
  import and the QA text columns therefore re-assert `@` on the cells they
  write and then write raw (`sheetText_` / `sheetTextRows_` /
  `appendRowsTextSafe_`). The format is re-asserted because one lost or never
  inherited by an appended row would otherwise turn the raw write back into
  a typed one. `Tests.js` is exempt: its fixtures write raw by design. The
  boundary cannot reach back, so formulas stored before it shipped are FOUND
  (Admin → System → Stored formulas, read-only) and fixed by hand, never
  rewritten by code. Verify: `npm run lint:server` (SHEET-SAFE), the S2 pins
  and the F2 mirror pin.
