# Client-side test harness

Unit tests for the web-app's client JS (inside `web-app/*.html` HtmlService
partials). Two harnesses, by what they can reach:

1. **Pure-helper harness** (`run.js` + `harness.js`) — dependency-free, a Node
   `vm` sandbox over a no-op Proxy DOM. Pure string/date/format helpers only.
2. **DOM-lifecycle harness** (`dom/runDom.js` + `dom/boot.js`) — a real
   [jsdom](https://github.com/jsdom/jsdom) window with the **whole shell**
   booted and a **controllable `google.script.run`**. Reaches the
   overlay/optimistic-UI/re-render lifecycle the pure harness can't — the
   bug class every prior cycle shipped into (Esc closing the wrong overlay,
   document-listener leaks, optimistic-revert clobbers, stale-callback
   clobbers, KB-drawer-wiped-by-re-render).

## Run

```bash
npm test            # both harnesses (from repo root)
npm run test:client # pure-helper harness only (no deps)
npm run test:dom    # DOM-lifecycle harness only (needs `npm ci` for jsdom)
```

The pure harness needs no `npm install`. The DOM harness needs the `jsdom`
devDependency (`npm ci`). Neither ships — `clasp push` only touches `web-app/`.
Both exit non-zero on failure (CI runs both — see `.github/workflows/client-tests.yml`).

## How it works

`harness.js` extracts the `<script>` bodies from a partial, evaluates them in a
Node `vm` sandbox that stubs the browser/GAS globals (`window` (= `globalThis`,
like a real browser), `document`, `localStorage`, `google.script.run`, …), and
exposes the loaded functions so `run.js` can call them and assert.

- `buildSandbox(files, extraGlobals)` — load whole partials (foundational ones:
  `script_icons`, `script_core`, tool views). A load failure throws with the
  file name — itself a useful signal (the partial has a load-time side effect
  the stubs don't cover).
- `loadFunction(sandbox, file, name)` — brace-match and eval a single function
  out of a large partial (e.g. the 6500-line Call Notes file) without loading
  the whole thing. Safe only for functions with no `{`/`}` inside string
  literals.

## Scope (and limits)

In scope: **pure** string/date/format helpers — `esc`, `empTz`, `isoDateTz`,
`mTodayIso_`/`mDaysAgo_`, `cnExtEmailPillHtml_`, etc.

Out of scope for the pure harness: functions that genuinely drive the DOM, fire
`google.script.run` RPCs, or depend on cross-file `const`/`let` module state.
Those are the DOM-lifecycle harness's job (below).

## DOM-lifecycle harness (`dom/`)

`dom/boot.js` boots a jsdom window seeded with the **real shell skeleton**
(`#app` + `#toast-stack` + the `modals.html` overlays), loads **every** partial's
`<script>` into it (so the SHIPPED functions wire to that document), and
installs a controllable `google.script.run`. `dom/runDom.js` holds the suites.

`boot()` returns a small API:

- `run` — controllable RPC: `run.calls`, `run.pending(method?)`,
  `run.flushSuccess(value, method?)`, `run.flushFailure(err, method?)`,
  `run.respond(method, fn)` (auto-answer), `run.drain()`. Each
  `google.script.run` access yields an independent chain (no handler
  cross-contamination), and nothing auto-resolves unless you `respond()` — so
  optimistic-UI timing is fully controllable.
- `bootShell(stateOverrides?)` — fires the shell `load` handler and satisfies
  `getEmployeeState` with a fixture, so `renderShell` builds `#view-area` + the
  initial tool renders, exactly as in production. Other enter-fired RPCs (prewarm,
  dept config, notes, ambient) stay PENDING for the test to flush/drain.
- `dispatchKey(key, {ctrl,meta,shift,type,target})`, `click(selOrEl)`,
  `setField(id, value)` (fires a real `input` event; handles `[contenteditable]`),
  `$`/`$$` (querySelector/All), `flushTimers()`.
- `read(expr)` — evaluate an expression in the window's global scope. Use this
  to read top-level `let`/`const` module bindings (e.g. `currentView`,
  `CN_STATE`) — those are lexical, NOT properties of `window`.

Out of scope even here: anything needing real layout/paint —
`getBoundingClientRect` returns zeros under jsdom, so position/canvas-resize
cases (the signature-pad 0-width bug, drag/resize geometry, hover-grace timing)
stay in the manual Regression Scenarios.

## Extending

Pure harness: add a helper to `run.js` — already a global after `buildSandbox`
(function declaration) or pull it with `loadFunction(...)`; override a
free-variable global on the sandbox to control inputs
(`sb.empTz = () => 'Asia/Kolkata';`).

DOM harness: add a `test(...)` to `dom/runDom.js` — `boot()`, drive the real
functions (`bootShell`, `enterTool`, `dispatchKey`, `click`, `setField`), flush
the RPCs you want resolved, and assert on the DOM + `read('CN_STATE…')`. Every
future client fix should land its regression test here instead of relying on a
manual S-scenario.

Both harnesses live outside `web-app/`, so `clasp push` never sees them.
