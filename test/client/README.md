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

Out of scope: functions that genuinely drive the DOM, fire `google.script.run`
RPCs, or depend on cross-file `const`/`let` module state (vm scripts don't share
block-scoped bindings across files — only function declarations / explicit
globals cross). Those still rely on the manual Regression Scenarios. A future
upgrade to jsdom would widen coverage to DOM-rendering functions.

## Extending

Add a pure helper to `run.js`: either it's already a global after
`buildSandbox` (function declaration), or pull it with `loadFunction(...)`. If a
helper resolves a global by free-variable name (e.g. the metrics date helpers
call `empTz()`), you can override that global on the sandbox to control inputs:
`sb.empTz = () => 'Asia/Kolkata';`.

This harness lives outside `web-app/`, so `clasp push` never sees it.
