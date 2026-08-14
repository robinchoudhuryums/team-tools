# Static-render visual audit harness

Renders the **production partials** (the real `index.html` with every
`include()` inlined) in a real headless Chromium with a fixture-backed
`google.script.run` mock, and screenshots a scenario matrix
(tool × viewport × light/dark). This is the layer neither Node harness can
see: actual pixels — overflow, wrap, collision, dead space, dark-mode holes.

It is **manual / on-demand** (like the editor suite), NOT wired into CI:
it needs a Chromium install and its findings need human eyes. Run it before
cutting a deploy that touched `styles*.html` or any view partial, and after
any layout-affecting change.

## Run

```bash
cd test/visual
npm ci                 # playwright package only (browser download is skipped
                       #   when PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is set and a
                       #   system Chromium is provided — see below)
node build.mjs         # composes web-app/ partials -> page.html (generated)
node shoot.mjs         # all 39 scenarios -> shots/*.png + report.json
node shoot.mjs cn-log compact   # substring filter: only matching scenarios
node a13-measure.mjs   # spot-measure: is a tag swap really pixel-identical?
node map-check.mjs     # spot-measure: the ```map block + article-image fallback
node settings-check.mjs # spot-measure: the Settings flyout + View-as preview
```

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
