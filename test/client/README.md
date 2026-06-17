# Client-side test harness

Unit tests for the web-app's client JS (inside `web-app/*.html` HtmlService
partials). Two harnesses, by what they reach:

1. **Pure-helper harness** (`run.js` + `harness.js`) — dependency-free, a Node
   `vm` sandbox over a no-op Proxy DOM. Pure string/date/format helpers + a
   parse-guard net over every JS-bearing partial.
2. **DOM-lifecycle harness** (`dom/runDom.js` + `dom/boot.js`) — a real
   [jsdom](https://github.com/jsdom/jsdom) window with the **whole shell**
   booted and a **controllable `google.script.run`**. Reaches the
   render/escape + overlay/optimistic-UI/re-render lifecycle the pure harness
   can't — the bug class prior cycles shipped into (Esc closing the wrong
   overlay, document-listener leaks, optimistic-revert clobbers, stale-callback
   clobbers, hostile-input render escaping, KB-drawer-wiped-by-re-render).

## Run

```bash
npm test            # both harnesses (from repo root)
npm run test:client # pure-helper harness only (no deps)
npm run test:dom    # DOM-lifecycle harness only (needs `npm ci` for jsdom)
```

The pure harness needs no `npm install`. The DOM harness needs the `jsdom`
devDependency (`npm ci`). Neither ships — `clasp push` only touches `web-app/`.
Both exit non-zero on failure (CI runs both — see `.github/workflows/client-tests.yml`).

## How the pure harness works

`harness.js` extracts the `<script>` bodies from a partial, evaluates them in a
Node `vm` sandbox that stubs the browser/GAS globals (`window` (= `globalThis`,
like a real browser), `document`, `localStorage`, `google.script.run`, …), and
exposes the loaded functions so `run.js` can call them and assert.

- `buildSandbox(files, extraGlobals)` — load whole partials (foundational ones:
  `script_icons`, `script_core`, tool views). A load failure throws with the
  file name — itself a useful signal (a load-time side effect the stubs don't
  cover).
- `loadFunction(sandbox, file, name)` — brace-match and eval a single function
  out of a large partial without loading the whole thing. Safe only for
  functions with no `{`/`}` inside string literals.
- `extractRawFunction('Code.js', name)` — pull a server function source for a
  pure unit test (e.g. `metricsTeamAvgSeries_`, `trainQuizAnalytics_`).

Out of scope for the pure harness: functions that genuinely drive the DOM, fire
`google.script.run` RPCs, or depend on cross-file `const`/`let` module state —
those are the DOM-lifecycle harness's job.

## DOM-lifecycle harness (`dom/`)

`dom/boot.js`'s `boot(opts?)` seeds a jsdom window with the **real shell
skeleton** (`#app` + `#toast-stack` + the `modals.html` overlays), loads
**every** partial's `<script>` (so the SHIPPED functions wire to that
document), and installs a controllable `google.script.run`. `dom/runDom.js`
holds the suites. `opts.serverQueryParams` seeds `window.SERVER_QUERY_PARAMS`
before load (e.g. a `?tool=` deep-link for the tour gate).

`boot()` returns:

- `run` — controllable RPC: `run.calls`, `run.pending(method?)`,
  `run.flushSuccess(value, method?)`, `run.flushFailure(err, method?)`,
  `run.respond(method, fn)` (auto-answer), `run.drain()`. Each
  `google.script.run` access is an independent chain; nothing auto-resolves
  unless you `respond()` — so optimistic-UI timing is fully controllable.
- `bootShell(stateOverrides?)` — fires the shell `load` handler + satisfies
  `getEmployeeState`, so `renderShell` builds `#view-area` + the initial tool
  renders. Other enter-fired RPCs stay PENDING for the test to flush/drain.
- `dispatchKey(key, {ctrl,meta,shift,type,target})`, `click(selOrEl)`,
  `setField(id, value)` (fires `input`; handles `[contenteditable]`), `$`/`$$`,
  `flushTimers()`.
- `read(expr)` — evaluate an expression in the window's global scope (read
  top-level `let`/`const` bindings like `currentView`, `CN_STATE`). Top-level
  `function`/`var` declarations are window globals (`h.window.fn`).

For a render-function test that targets a specific container, mount it first
(`document.createElement` + append) — e.g. `m-team-content`, `view-area`.

Out of scope even here: anything needing real layout/paint —
`getBoundingClientRect` is 0 under jsdom, so position/canvas-resize cases (the
signature-pad 0-width bug, drag/resize geometry, hover-grace timing) stay in the
manual Regression Scenarios.

## Extending

Pure harness: add a helper to `run.js` — already a global after `buildSandbox`,
or pull it with `loadFunction(...)` / `extractRawFunction(...)`.

DOM harness: add a `test(...)` to `dom/runDom.js` — `boot()`, drive the real
functions (`bootShell`, `enterTool`, `dispatchKey`, `click`, `setField`), flush
the RPCs you want resolved, and assert on the DOM + `read('CN_STATE…')`. Every
future client fix should land its regression test here instead of relying on a
manual S-scenario.

Both harnesses live outside `web-app/`, so `clasp push` never sees them.
