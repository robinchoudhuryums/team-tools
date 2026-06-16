# Team Tools

Internal tooling for the UMS CSR team. Each tool is a separate Apps
Script project synced via [clasp](https://github.com/google/clasp).

## Projects

- **web-app/** — Multi-module browser app deployed at one Web App URL.
  Hosts six modules today, registered side-by-side in the `TOOLS`
  registry in `script_core.html`:
  - **Time Clock** — cross-timezone time tracking, PTO requests,
    manager dashboard, ADP-format export.
  - **Call Notes** — rolling-note panel for CSR call logging. Each
    rep writes to their own per-rep Google Sheet; Ctrl/⌘+Shift+C saves
    and auto-copies a CRM-friendly serialization. Department emails
    are a separate two-stage flow with preview gate. Three flag
    types (action / training / review) with EOD reminders for
    unresolved action flags and weekly manager digests.
  - **Metrics** — CDR integration reading DQE Historical Data from
    the CDR Report spreadsheet. Two tabs: "My Stats" (self-view —
    today's KPIs, 30-day % Answered trend, note-to-call coverage)
    and "Team Metrics" (manager-only — per-rep table with date-range
    and preset chips). CDR metrics also enrich the Call Notes Stats
    tab via a best-effort overlay.
  - **Intake** — patient-intake forms ported from the bound
    `form-generator` Apps Script. PPD (a 45-question intake driving a
    clinical HCPCS recommendation engine) plus PMD/PAP account-creation
    forms with image attachments. Each renders a branded email (two-stage,
    bodyHash-guarded) and persists a PHI backup row to the Intake
    spreadsheet; the shared AuditLog row stays PHI-free.
  - **Reference** — in-app knowledge base: a per-department tree +
    section-aware full-text search + reader for training/policy docs.
    Markdown articles (rendered with HTML-escape-first) and embedded
    Drive Doc/Sheet/file previews, plus a per-item Doc→article
    converter with Drive image export and paste-a-screenshot upload
    in the editor. A Ctrl/⌘+K slide-over drawer gives reps mid-call
    lookup from any tool, with an optional AI guidance card
    (Anthropic API, whitelisted call facets only — no note text ever
    leaves the app; feature-flagged off by default). Managers edit
    inline; reps browse read-only. PHI-free by policy.
  - **Training & Employee Docs** — manager-assigned training built on
    the Reference content layer: assign any KB article/embed to
    employees (or everyone) with an optional due date; reps work a
    My Training checklist with an in-app reader and mark items
    complete; managers see a per-rep completion matrix. Re-assigning
    an item resets its completion (re-certification). Interactive
    quizzes: manager-authored, graded server-side (answer keys never
    reach the browser), unlimited retries with attempt tracking — a
    pass completes the item. Per-employee signable documents (reviews,
    PIPs, policy acknowledgments) live in a dedicated HR spreadsheet:
    content is frozen and hashed at issue, employees sign on a canvas
    pad, signature records are append-only and tamper-evident, and
    manager visibility is per-team (fail-closed via the roster's
    ManagerEmail column).

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
- **call-notes/** — Legacy Workspace Add-on scaffold; superseded by
  the Call Notes module inside `web-app/`. Kept on disk for reference
  during the transition. The Add-on path was abandoned because admin
  policy on the org domain blocks Marketplace install without
  ticket-driven allowlisting; the web-app pattern works today with
  zero admin involvement.

## Development

From any project folder: `clasp pull` to sync down, `clasp push -f` to
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
first). `npm test` runs both. A GitHub Action
(`.github/workflows/client-tests.yml`) runs the pure harness, then
`npm ci` + the DOM harness, plus a `node --check` of `Code.js` /
`Tests.js` on every push and PR — the project's only automated check.
