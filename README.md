# Team Tools

Internal tooling for the UMS CSR team. Each tool is a separate Apps
Script project synced via [clasp](https://github.com/google/clasp).

## Projects

- **web-app/** — Multi-module browser app deployed at one Web App URL.
  Hosts eight tools today, registered side-by-side in the `TOOLS`
  registry in `script_core.html` — the seven feature modules below plus
  **Manage**, the consolidated manager/admin home (Manage Time,
  Coverage, Punctuality, and an admin-only Admin tab — config,
  system health, compliance audit, and team-member onboarding:
  add a rep with a validated form that also provisions their Call
  Notes Sheet, check per-rep readiness, offboard):
  - **Time Clock** — cross-timezone time tracking, PTO requests
    (single-day or a date range, which files one request per weekday),
    manager dashboard, ADP-format export, and a manager-only Coverage
    planner (forward staffing across timezones with PTO overlaid and
    understaffed manager-tz hours flagged). Break and end-of-shift
    reminders fire from the shell, so they reach whichever tab or
    pop-out window is open; each shows a toast plus an optional chime
    (on by default, toggled by the sidebar bell) and, where the browser
    permits it, a desktop notification. A per-period pay statement
    (Time / PTO → the pay-period rail block) lets each rep check their own
    punches, hours, PTO, and — when a pay rate is on the roster — an
    estimated gross, clearly labeled an estimate. Agents who accrue
    leave get an accrual rate on the roster — PTO hours earned per hours
    WORKED (3.08 per 80 for the PH team) — and the app credits what each
    month's real punched hours earned, automatically and in arrears. Their
    leave tile shows the credited balance, the rate in its own terms, and
    what they have earned so far this month, instead of draining from a
    fixed allotment.
  - **Call Notes** — rolling-note panel for CSR call logging. Each
    rep writes to their own per-rep Google Sheet; Ctrl/⌘+Shift+C saves
    and auto-copies a CRM-friendly serialization. Department emails
    are a separate two-stage flow with preview gate. Three flag
    types (action / training / review) with EOD reminders for
    unresolved action flags and weekly manager digests. A manager
    Admin tab adds tag taxonomy + a weekly tag-trend panel (which
    issue types are spiking), department/tax config, and compliance
    audit.
  - **Metrics** — CDR integration reading DQE Historical Data from
    the CDR Report spreadsheet. Four tabs: "My Stats" (self-view —
    the previous workday's KPIs, a 30-day workday % Answered trend,
    note-to-call coverage; CDR data is never same-day), "Team
    Metrics" (the team aggregate for everyone; the per-rep table
    and diagnostics stay manager-only — date-range and preset
    chips), "Spanish Inbox" (bilingual-assistance request
    tracking with a per-member resolution-share chart), and "Dept
    Requests" (inter-department request tracking with SLA status).
    CDR metrics also enrich the Call Notes Stats tab via a
    best-effort overlay.
  - **Intake** — patient-intake forms ported from the bound
    `form-generator` Apps Script. PPD (a 46-item intake driving a
    clinical HCPCS recommendation engine) plus PMD/PAP account-creation
    forms with image attachments; each can be completed in English or
    Spanish, but the previewed and emailed form is always English. Each
    renders a branded email (two-stage, bodyHash-guarded) and persists a
    PHI backup row to the Intake spreadsheet; the shared AuditLog row
    stays PHI-free.
  - **Reference** — in-app knowledge base: a per-department tree +
    section-aware full-text search + reader for training/policy docs.
    Markdown articles (rendered with HTML-escape-first) and embedded
    Drive Doc/Sheet/file previews, plus a per-item Doc→article
    converter with Drive image export and paste-a-screenshot upload
    in the editor. A Ctrl/⌘+K slide-over drawer gives reps mid-call
    lookup from any tool, with an optional AI guidance card
    (Anthropic API, whitelisted call facets only — no note text ever
    leaves the app; feature-flagged off by default). Managers edit
    inline; reps browse read-only, and get a usage-sorted "Review due"
    queue for re-confirming stale articles. PHI-free by policy.
  - **Training & Employee Docs** — manager-assigned training built on
    the Reference content layer: assign any KB article/embed to
    employees (or everyone) with an optional due date; reps work a
    My Training checklist with an in-app reader and mark items
    complete; managers see a per-rep completion matrix. Re-assigning
    an item resets its completion (re-certification). Interactive
    quizzes: manager-authored (or imported from a Google Forms quiz),
    graded server-side (answer keys never reach the browser), unlimited
    retries with attempt tracking — a pass completes the item.
    Per-employee signable documents (reviews,
    PIPs, policy acknowledgments) live in a dedicated HR spreadsheet:
    content is frozen and hashed at issue, employees sign on a canvas
    pad, signature records are append-only and tamper-evident, and
    manager visibility is per-team (fail-closed via the roster's
    ManagerEmail column). Documents can be built from reusable
    templates (e.g. an annual review), carry employee-completable
    fields (free-text / paragraph / date in addition to the
    signature), and are saved as a draft then explicitly released to
    the employee; the deadline reminds both sides. Coaching: granular,
    non-routine manager feedback on a specific patient/TRX interaction
    (severity-graded, rep-acknowledged) with a team-scoped manager
    dashboard and analytics (ack-rate, median time-to-acknowledge,
    overdue, per-rep) — kept in the same HR store, never purged.
  - **QA** — call-recording review for managers plus listed QA members
    (currently hidden from other reps by operator decision). The
    operator drops recordings into one Drive folder; an idempotent
    "Sync from Drive" indexes them into a dedicated QA spreadsheet
    (no fallback store — recordings and comments may reference agents
    and patients). Reviewers get chunked in-app playback with a
    waveform and click-to-seek, timestamped comments rendered as
    seek markers, structured scorecards (criteria editable in Admin →
    Config), per-agent stats, coverage-fair "Sample 3 for me"
    self-assignment, and a reviewer-calibration table. Scorecard
    criteria carry a type (scale 1–5, Yes/No, or a dropdown) defined in
    that same Admin editor, and a **Log** tab lists one entry per
    recording audited (managers see every reviewer's log; a manual
    entry with no recording attached is the last-resort fallback).
    Sharing a
    review with its agent is an explicit per-recording release feeding
    a read-only My Reviews view (scorecards, comments, and scoped
    playback of the shared recording — dormant while the tool is
    hidden). An optional retention purge (default off) ages out review
    records only; the recordings index and Drive files are never
    touched.

  Adding a new tool: append a new entry to `TOOLS` (with its tabs)
  in `script_core.html`, drop tab partials in
  `web-app/<tool>/script_*.html`, `include()` them from
  `index.html`, and add server endpoints to `Code.js` alongside the
  existing ones. The sidebar shows one button per tool; sub-navigation
  is a horizontal tab bar above the view area. Shared chrome
  vocabulary (`.hero`, `.actions`, `.ledger`, `.telemetry`,
  `.tz-chip`, `.signals`/`.sig`, `.conflict`, `.balance-after`,
  `.ribbon-wrap`, `.cov`, `.m-hero`/`.m-rail`/`.m-row`) lives in
  `styles.html` and consumes the canonical design tokens directly —
  new tools should reach for these before adding tool-local
  variants.
`web-app/` is the only project directory. The legacy Workspace Add-on
scaffold and the pre-port bound `form-generator` script were deleted in
cycle 13 — the Add-on path was abandoned because admin policy on the org
domain blocks Marketplace install without ticket-driven allowlisting, and
the form-generator port shipped. Both live in git history.

## Development

From `web-app/`: `clasp pull` to sync down, `clasp push -f` to
deploy changes. After `clasp push`, cut a new deployment version in
the Apps Script editor (Deploy → Manage deployments → Edit → Version:
New version) so users see the change on next load.

A first-load onboarding tour (hand-rolled coach-marks in
`script_tour.html`) walks new reps through the shell and the core tools;
it auto-starts once and is replayable from the Call Notes **?** menu.

The Apps Script test suite (`web-app/Tests.js`) runs from the editor
(`runSmokeTests()` / `runAllTests()`). Client-side helpers have two
off-editor harnesses (both outside `web-app/`, so `clasp` never pushes
them): a **dependency-free** pure-helper + parse-guard harness
(`node test/client/run.js`, zero install) and a **DOM-lifecycle** harness
that loads the partials into a real `jsdom` window
(`npm run test:dom` — needs the `jsdom` dev dependency, so run `npm ci`
first). `npm test` runs both. A third, **static-render visual** harness
(`test/visual/`) renders a 67-scenario matrix in headless Chromium; it is
manual / on-demand, NOT in CI. A GitHub Action
(`.github/workflows/client-tests.yml`) runs a `node --check` of `Code.js` /
`Tests.js` / `DevTools.js` and the dependency-free pure harness FIRST, then
`npm ci` + the DOM harness, on every push and PR — the project's only
automated check. (The zero-install steps deliberately run before `npm ci`:
a registry or jsdom-resolution failure must not stop the only checks that
need no dependencies from running at all.)
