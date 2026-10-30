# Static-render visual audit harness

Renders the **production partials** (the real `index.html` with every
`include()` inlined) in a real headless Chromium with a fixture-backed
`google.script.run` mock, and screenshots a scenario matrix
(tool × viewport × light/dark). This is the layer neither Node harness can
see: actual pixels — overflow, wrap, collision, dead space, dark-mode holes.

The full matrix is **manual / on-demand** (like the editor suite): its
findings need human eyes. Run it before cutting a deploy that touched
`styles*.html` or any view partial, and after any layout-affecting change.

**A subset runs in CI (cycle 25 E5, ST4).** `node shoot.mjs --ci` shoots the
scenarios `ci-gate.cjs` names (every tool, at the widths its layout defects have
lived) and exits non-zero on what a screenshot cannot show: sideways overflow,
a page taller than its content (`verticalRunawayPx` past 200px), a text column
narrower than a word (`narrowText`), an RPC with no fixture, or an uncaught page
error. The workflow's `visual-layout` job installs Playwright's Chromium and keeps
the shots as an artifact when it fails. A finding owned elsewhere goes in
`ci-gate.cjs`'s `KNOWN` list with its reason — the list only shrinks: an entry
whose finding stops firing fails the run, so remove it with the fix. A subset
name the matrix lacks is refused before the browser starts.

**axe on every handbook screen (HB2.4).** `node shoot.mjs --axe` runs
axe-core (pinned in `package.json`) over every scenario whose page is the
handbook app, against WCAG 2.1 A and AA, after each scenario's post hook — no
screenshots. It writes `axe-report.json` (each violation's rule, impact, count,
first targets and failure summary) and exits non-zero on any violation, or when
a filter after `--axe` matched no handbook scenario. CI runs it in the same
job, after the layout gate and even when that failed. A new handbook screen is
checked by giving it a scenario.

**pdf.js (HB4.1).** The handbook's form viewer loads pdf.js from cdnjs; the
harness has no network, so every context routes that URL to the same pinned
build in `node_modules/pdfjs-dist` (a dev dependency here). The form PDFs are
the repo's own (`forms/`), inlined by `build.mjs` as `window.__FORM_PDFS__`.

**Where the rest of this lives** (the Doc map in
[`CLAUDE.md`](../../CLAUDE.md) is the index): the **Visual Audit Stage** —
which every `/broad-scan` must run, what to compare, and the standing
uncovered-surface list — is in
[`.cycle/config.md`](../../.cycle/config.md); the fixture rules it enforces
are INV-185 in the same file. **How many scenarios there are** is not written
down anywhere on purpose: run `node ../../scripts/counts.mjs`, or read the
generated running-totals block in `CLAUDE.md`. This README carried a
hand-typed "44" long after the matrix passed 100.

## Run

```bash
cd test/visual
npm ci                 # playwright package only (browser download is skipped
                       #   when PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is set and a
                       #   system Chromium is provided — see below)
node build.mjs         # composes web-app/ partials -> page.html (generated)
node shoot.mjs         # every scenario -> shots/*.png + report.json
node shoot.mjs cn-log compact   # substring filter: only matching scenarios
node a13-measure.mjs   # spot-measure: is a tag swap really pixel-identical?
node map-check.mjs     # spot-measure: the ```map block + article-image fallback
node settings-check.mjs # spot-measure: the Settings flyout + View-as preview
node manual-fixtures.mjs <manual.json>  # refresh the procedures-manual fixtures
```

The Reference reader's manual scenarios read REAL sections, router rows,
changelog entries and images copied verbatim from a built `manual.json`
(`mock.js`'s generated `MANUAL-FIXTURES` block and `manual-images.json`). After a
manual change, build the manual (`manual/make_all.sh`) and run
`node manual-fixtures.mjs <MANUAL_OUT>/reference/manual.json` so the shots show
the manual as it is. The one hand-written section, 0.11, is a feature fixture
under the real 0.11's headings (see the comment in `manualSection`).

`a13-measure.mjs` exists because a screenshot cannot answer "did this element
change size" for a surface the matrix does not reach (Team Training is behind
the `develop` tool's manager tab; the matrix lands on My Training). It renders
the old and new markup side by side and diffs computed style + bounding box.
**Measure inside the REAL parent** — its first version put the elements in a
plain `<div>` and reported `display: inline -> block` for two of three cases,
which was pure fixture artifact: both live in `display: flex` heads, where any
child is blockified regardless. Same rule as the RPC fixtures below.

`map-check.mjs` (operator 2026-08-13) drives the ` ```map ` warehouse block
through the REAL `kbMd_` on the built page — structure, a mocked
`kbMapDistances` lookup (sorted results, per-row chips, percent-encoded
Directions hrefs), the lazy embed toggle's live `aria-expanded`, 400px
no-overflow — and the article-image fallback (a broken Drive thumbnail swaps
to a mocked data URL; two imgs of one file fan into one fetch; an external
image is left alone). Screenshots land in `shots/map-*.png`.

`settings-check.mjs` (operator 2026-08-13) drives the Settings flyout +
View-as preview on the built page: one settings row in the sidebar, both
gears' live `aria-expanded`, the panel opening on-screen with all four
control groups, Esc closing it, the CSR preview (banner up, Manage tool +
Spanish tab gone, exit restoring), and the 390px header-gear open with zero
page overflow. Screenshots land in `shots/settings-*.png`.

Chromium resolution order (`shoot.mjs`): `CHROMIUM_PATH` env var → newest
`chromium-*` under `PLAYWRIGHT_BROWSERS_PATH` or `/opt/pw-browsers` (the
Claude Code remote-env pre-install) → Playwright's own managed download.

## What to look at

- `report.json` — per-scenario console/page errors, missing RPC fixtures
  (`window.__MISSING__`), and the landed view key. **A missing fixture means
  the scenario rendered a loader/error state, not the real view** — add the
  endpoint to `mock.js` before trusting that screenshot.
- **Three layout measurements** ride every scenario in `report.json`, and the
  run prints a section for each one that fires — because a squeezed layout, an
  overflowing one and a runaway one all look fine in a screenshot:
  - `overflowPx` — the page scrolls SIDEWAYS (the document's scroll width past
    its client width).
  - `verticalRunawayPx` (cycle 25 F69) — the document scrolls PAST its content:
    its scroll height beyond the bottom of everything visibly laid out (a
    visually hidden box is excluded, since an escaped one is the usual cause —
    F67, g171). Over 200px prints under VERTICAL RUNAWAY.
  - `narrowText` (cycle 25 F69) — an element holding a real run of its own text
    laid out narrower than a word (under 48px); F68's 22px text column at 390px
    is the shape (g72). Printed under SQUEEZED TEXT.
- `shots/*.png` — the renders. Wide scenarios are fullPage; compact/mobile are
  viewport-clipped frames + a `-bottom` frame, because fullPage stitching
  PAINTS off-viewport fixed elements (the closed KB drawer, the mobile nav)
  into the image — those read as bugs but are capture artifacts.
- **Error-state scenarios** (cycle-17 batch ⑦): a scenario whose query is
  `?failrpc=name1,name2` makes the mock invoke the FAILURE handler for those
  RPCs instead of resolving, so the `errorStateHtml_` paths (A12/INV-175 —
  warn card + glyph, never an empty state) render on camera. A forced-fail RPC
  is NOT counted in `__MISSING__`. The Admin panel scenarios ride the
  `getAutomationHealth`-family fixtures whose top-level keys are pinned
  against the server's return site (run.js batch-7 pin — the INV-185 rule).
  Every scenario also reports the pre-existing Google-Fonts
  `ERR_CONNECTION_RESET` console line (no network in the sandbox) — ignore it.

## Anatomy

- `build.mjs` — inlines `include()`s, swaps the two `doGet` template
  scriptlets (query params come from the page URL, so scenarios can pass
  `?compact=1`), injects `mock.js` into `<head>`.
- `mock.js` — a chainable Proxy standing in for `google.script.run`:
  `withSuccessHandler(...).endpoint(args)` resolves async from the `FIXTURES`
  map. Unknown endpoints record into `window.__MISSING__` and never resolve
  (matching a hung RPC). Fixtures are deterministic — no `Date.now()` beyond
  the frozen page clock (`page.clock.install` in shoot.mjs pins time).
- `shoot.mjs` — the scenario matrix. Add a scenario = one array entry.
- `page.html`, `shots/`, `report.json` — generated, gitignored.

## Maintenance rules

- **New RPC endpoint rendered on view enter** → add a fixture to `mock.js`
  (the `report.json` `missing` list tells you exactly which).
- **New tool/tab worth auditing** → add a `SCENARIOS` entry.
- Keep fixtures PHI-free and obviously fake (TEST names, example.invalid
  emails) — screenshots may end up in PRs/issues.
- The mock intentionally implements only enough of `google.script.run` for
  render paths (success/failure handlers). It is NOT the DOM harness — for
  behavior/lifecycle assertions use `test/client/dom/`.
