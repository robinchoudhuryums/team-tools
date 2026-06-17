# Client-side test harness

Unit tests for the web-app's client JS (inside `web-app/*.html` HtmlService
partials). A pure-helper harness plus DOM-lifecycle harnesses, by what they reach:

1. **Pure-helper harness** (`run.js` + `harness.js`) — dependency-free, a Node
   `vm` sandbox over a no-op Proxy DOM. Pure string/date/format helpers + a
   parse-guard net over every JS-bearing partial.
2. **DOM-lifecycle harnesses** — a real [jsdom](https://github.com/jsdom/jsdom)
   window with the partials loaded, so tests can exercise what the pure harness
   can't: innerHTML render/escape, overlay lifecycle (Esc/`ensureOverlay`),
   optimistic-UI revert, late-callback `currentView` guards, focus traps,
   double-fire guards. There are currently **two** (a parallel-session
   artifact — consolidation is a tracked follow-on):
   - `run-dom.js` + `harness-dom.js` — `buildDomWindow(files, opts)`; a
     programmable `google.script.run` mock driven by `run.resolve()`/`run.reject()`.
   - `dom/runDom.js` + `dom/boot.js` — `boot()` with `bootShell()` (fires the
     shell `load` + renders the initial tool), `setField`/`click`/`read(expr)`,
     and a controllable run (`run.flushSuccess(value, method)` /
     `flushFailure` / `respond` / `pending`).

## Run

```bash
npm test            # all harnesses (from repo root)
npm run test:client # pure-helper harness only (no deps)
npm run test:dom    # both DOM-lifecycle harnesses (needs `npm ci` for jsdom)
```

The pure harness needs no `npm install`. The DOM harnesses need the `jsdom`
devDependency (`npm ci`). Nothing here ships — `clasp push` only touches
`web-app/`. All exit non-zero on failure (CI runs all — see
`.github/workflows/client-tests.yml`).

## How the pure harness works

`harness.js` extracts the `<script>` bodies from a partial, evaluates them in a
Node `vm` sandbox that stubs the browser/GAS globals (`window` (= `globalThis`,
like a real browser), `document`, `localStorage`, `google.script.run`, …), and
exposes the loaded functions so `run.js` can call them and assert.

- `buildSandbox(files, extraGlobals)` — load whole partials (foundational ones:
  `script_icons`, `script_core`, tool views). A load failure throws with the
  file name — itself a useful signal (the partial has a load-time side effect
  the stubs don't cover).
- `loadFunction(sandbox, file, name)` — brace-match and eval a single function
  out of a large partial without loading the whole thing. Safe only for
  functions with no `{`/`}` inside string literals.

Out of scope for the pure harness: functions that genuinely drive the DOM, fire
`google.script.run` RPCs, or depend on cross-file `const`/`let` module state —
those are the DOM-lifecycle harnesses' job. Out of scope even there: anything
needing real layout/paint (`getBoundingClientRect` is 0 under jsdom — so
position/canvas-resize cases stay in the manual Regression Scenarios).

## DOM-lifecycle harness — `dom/boot.js` (`boot()`)

`boot()` seeds a jsdom window with the **real shell skeleton** (`#app` +
`#toast-stack` + the `modals.html` overlays), loads **every** partial's
`<script>`, and installs a controllable `google.script.run`. Returns:

- `run` — `run.calls`, `run.pending(method?)`, `run.flushSuccess(value, method?)`,
  `run.flushFailure(err, method?)`, `run.respond(method, fn)` (auto-answer),
  `run.drain()`. Each `google.script.run` access is an independent chain;
  nothing auto-resolves unless you `respond()`.
- `bootShell(stateOverrides?)` — fires the shell `load` handler + satisfies
  `getEmployeeState`, so `renderShell` builds `#view-area` + the initial tool
  renders. Other enter-fired RPCs stay PENDING for the test to flush/drain.
- `dispatchKey`, `click(selOrEl)`, `setField(id, value)` (fires `input`; handles
  `[contenteditable]`), `$`/`$$`, `flushTimers()`.
- `read(expr)` — evaluate an expression in the window's global scope (read
  top-level `let`/`const` bindings like `currentView`, `CN_STATE`).

## DOM-lifecycle harness — `harness-dom.js` (`buildDomWindow`)

`buildDomWindow(files, opts)` → `{ window, document, ctx, run, t, flush, dispatchKey, $, $$ }`.
`opts.markup: ['modals.html']` mounts shared markup into `<body>` before the
tool scripts run. `run` records each terminal `.method(args)` with its handlers;
drive responses with `run.resolve(value)` / `run.reject(err)` /
`run.resolveLastFor(method, value)`; inspect with `run.last()`/`run.lastFor(m)`/
`run.countFor(m)`/`run.pending()`. `flush()` drains microtasks.

## Extending

Pure harness: add a helper to `run.js` — already a global after `buildSandbox`,
or pull it with `loadFunction(...)`; override a free-variable global on the
sandbox to control inputs (`sb.empTz = () => 'Asia/Kolkata';`).

DOM harness: add a `test(...)` to whichever `*-dom.js` / `dom/runDom.js` suite
fits — drive the real functions, flush the RPCs you want resolved, and assert on
the DOM + module state. Every future client fix should land its regression test
here instead of relying on a manual S-scenario.

All harnesses live outside `web-app/`, so `clasp push` never sees them.
