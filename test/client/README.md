# Client-side test harness

Dependency-free unit tests for the web-app's **pure client helper functions**
(the JS inside `web-app/*.html` HtmlService partials). Closes the long-standing
gap where every client fix (F1/F2/F5/F6/F7/F20, …) was guarded only by the
manual Regression Scenarios because there was no way to run client JS off-browser.

## Run

```bash
node test/client/run.js      # or: npm test  (from repo root)
```

No `npm install` needed — uses only Node's built-in `vm`/`fs` + native
`Intl`/`URLSearchParams`. Exit code is non-zero if any test fails (CI-ready).

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

Out of scope **for this (pure) harness**: functions that genuinely drive the
DOM, fire `google.script.run` RPCs, or depend on lexically-scoped module state.
Those are covered by the **DOM-lifecycle harness** below.

## DOM-lifecycle harness (`harness-dom.js` / `run-dom.js`)

```bash
node test/client/run-dom.js   # or: npm run test:dom   (needs `npm ci` first)
npm test                      # runs BOTH harnesses
```

Loads the **full** `<script>` of the chosen partials into a real
[`jsdom`](https://github.com/jsdom/jsdom) window (a dev dependency — the only one)
so tests can exercise what the pure harness can't: innerHTML render/escape,
overlay lifecycle (Esc/`ensureOverlay`), optimistic-UI revert, late-callback
`currentView` guards, focus traps, double-fire guards.

- `buildDomWindow(files, opts)` → `{ window, document, ctx, run, t, flush, dispatchKey, $, $$ }`.
  - `runScripts:'outside-only'` ⇒ `getInternalVMContext()` where `window === globalThis`
    (bare-name resolution like the pure harness) **with a real document**;
    `DOMContentLoaded` is not auto-fired, so module-top init listeners stay dormant.
  - Partials load in order and **share** the global lexical scope (browser
    `<script>` semantics), so a trailing **bridge** (`window.__t` / `h.t`) can
    get/set the `const`/`let` module state (`CN_STATE`, `currentView`, `empState`).
  - `opts.markup: ['modals.html']` mounts shared markup into `<body>` before the
    tool scripts run (mirrors `index.html`) — needed by partials whose module-top
    listeners bind to modal nodes (the `tc/` views).
- `run` = the programmable `google.script.run` mock. Each terminal
  `.method(args)` is **recorded** with its registered handlers; the test drives
  the server response with `run.resolve(value)` / `run.reject(err)` (or
  `run.resolveLastFor(method, value)`). Inspect with `run.last()`, `run.lastFor(m)`,
  `run.countFor(m)`, `run.pending()`.
- `dispatchKey('Escape')` fires a real `keydown`; `flush()` drains microtasks.

This harness needs the `jsdom` dev dependency (`npm ci`); the pure harness above
stays the always-on, zero-install floor. Both live outside `web-app/`, so
`clasp push` never sees them.

## Extending

Add a pure helper to `run.js`: either it's already a global after
`buildSandbox` (function declaration), or pull it with `loadFunction(...)`. If a
helper resolves a global by free-variable name (e.g. the metrics date helpers
call `empTz()`), you can override that global on the sandbox to control inputs:
`sb.empTz = () => 'Asia/Kolkata';`.

This harness lives outside `web-app/`, so `clasp push` never sees it.
