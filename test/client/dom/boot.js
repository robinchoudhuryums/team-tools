'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DOM-lifecycle test harness — BOOT INFRASTRUCTURE (Phase 1).
//
// The pure-helper harness (test/client/harness.js) evaluates the client
// <script> partials against a no-op Proxy DOM and can only exercise pure
// functions. The DOM-lifecycle bug class the project keeps getting bitten by
// (Esc closing the wrong overlay, document-listener leaks, optimistic-revert
// clobbers, stale-callback clobbers, KB-drawer-wiped-by-re-render) lives in
// the region that harness explicitly excludes: real tree + class selectors +
// event dispatch + RPC sequencing.
//
// This module boots a jsdom window seeded with the real shell skeleton
// (#app + #toast-stack + the modals.html overlays), loads EVERY client
// partial's <script> into it so the SHIPPED functions wire to that document,
// installs a CONTROLLABLE google.script.run, and returns a small test API.
// Tests then drive the real functions and assert lifecycle + state.
//
// jsdom is a devDependency (see package.json). It is NOT pushed by clasp
// (clasp only pushes web-app/), so the "harness never ships" property holds;
// only the prior "zero npm install" property is traded for spec-accurate DOM.
//
// Scope of THIS file: boot + the controllable run + the test API. The actual
// lifecycle assertions live in runDom.js (Phase 2/3).
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const WEB_APP = path.resolve(__dirname, '../../../web-app');

// Partials are loaded in the SAME order index.html includes them — script_core
// must precede the tool partials (they call esc/icon/showView at runtime).
const PARTIALS = [
  'script_icons.html',
  'script_core.html',
  'tc/script_clock.html',
  'tc/script_timesheet.html',
  'tc/script_timeoff.html',
  'tc/script_manager.html',
  'cn/script_callnotes.html',
  'metrics/script_metrics.html',
  'metrics/script_deptrequests.html',   // cycle-9 M-10 — was outside every harness net
  'intake/script_intake.html',
  'kb/script_kb.html',
  'train/script_training.html',
  'train/script_empdocs.html',
  'train/script_coaching.html',         // cycle-9 M-10 — was outside every harness net
  'qa/script_qa.html',                  // QA module Phase 1 (2026-08-27)
  'script_tour.html',
];

/** Concatenate the JS inside every <script> of a partial, stripping the tags
 *  and any GAS scriptlets (<? … ?> / <?!= … ?>). Mirrors harness.extractScript
 *  but kept local so the DOM harness has no coupling to the pure harness. */
function extractScript(file) {
  const src = fs.readFileSync(path.join(WEB_APP, file), 'utf8');
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  return blocks.join('\n;\n').replace(/<\?[\s\S]*?\?>/g, '""');
}

/** The static (non-script) modal markup. modals.html is pure HTML (no <script>),
 *  so the real overlay nodes (#adjust-overlay, #day-overlay, …) are present for
 *  the overlay-lifecycle suite. Scriptlets are stripped defensively. */
function modalsHtml() {
  return fs
    .readFileSync(path.join(WEB_APP, 'modals.html'), 'utf8')
    .replace(/<\?[\s\S]*?\?>/g, '');
}

// The body skeleton mirrors index.html's static body: modals, the toast stack,
// and the #app loading shell. renderShell() replaces #app's innerHTML and
// creates #view-area / the sidebar, exactly as in production.
function skeletonHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>UMS Team Tools (test)</title></head>
<body>
${modalsHtml()}
<div class="toast-stack" id="toast-stack" role="region" aria-live="polite"></div>
<div id="app"><div class="state-center"><div class="spinner"></div><div class="state-label">Loading…</div></div></div>
</body></html>`;
}

// ── Controllable google.script.run ──────────────────────────────────────────
// Real shape: google.script.run.withSuccessHandler(fn).withFailureHandler(fn)
//             .withUserObject(o).METHOD(args…)
// Each access of `google.script.run` yields a FRESH chain (matching GAS, where
// each runner is independent), so concurrent in-flight calls don't share
// handler state. A terminal METHOD call records { method, args, success,
// failure, resolved } onto `calls`. Nothing auto-responds — tests drive the
// round-trip with flushSuccess/flushFailure (so optimistic-UI timing is fully
// controllable). respond(method, fn) opts a method into auto-answering (used by
// bootShell for getEmployeeState).
function makeRun() {
  const calls = [];          // FIFO of recorded, not-yet-resolved calls
  const responders = {};     // method → fn(args…) → value | throws (auto-answer)

  function freshChain() {
    const state = { success: null, failure: null };
    const handler = {
      get(_t, prop) {
        if (prop === 'withSuccessHandler') return (fn) => { state.success = fn; return chain; };
        if (prop === 'withFailureHandler') return (fn) => { state.failure = fn; return chain; };
        if (prop === 'withUserObject') return () => chain;
        // Any other property is a server method name. Calling it is terminal.
        return function (...args) {
          const call = {
            method: String(prop), args, success: state.success,
            failure: state.failure, resolved: false,
          };
          if (Object.prototype.hasOwnProperty.call(responders, String(prop))) {
            try {
              const v = responders[String(prop)].apply(null, args);
              call.resolved = true;
              if (call.success) call.success(v);
            } catch (e) {
              call.resolved = true;
              if (call.failure) call.failure(e);
            }
          } else {
            calls.push(call);
          }
          return undefined;
        };
      },
    };
    var chain = new Proxy(function () {}, handler);
    return chain;
  }

  function find(method) {
    for (let i = 0; i < calls.length; i++) {
      if (!calls[i].resolved && (!method || calls[i].method === method)) return i;
    }
    return -1;
  }

  const api = {
    calls,
    /** The runner object placed at google.script.run (fresh chain per access). */
    get runner() { return freshChain(); },
    /** Register an auto-responder: the next/every call to `method` resolves
     *  immediately with fn(args…)'s return (or rejects if it throws). */
    respond(method, fn) { responders[method] = fn; return api; },
    clearResponder(method) { delete responders[method]; return api; },
    /** Pending (unresolved, no auto-responder) calls, optionally filtered. */
    pending(method) { return calls.filter((c) => !c.resolved && (!method || c.method === method)); },
    /** Resolve the oldest pending call (optionally of a given method) with success. */
    flushSuccess(value, method) {
      const i = find(method);
      if (i < 0) throw new Error('flushSuccess: no pending call' + (method ? ' for ' + method : ''));
      const c = calls[i]; c.resolved = true;
      if (c.success) c.success(value);
      return c;
    },
    /** Resolve the oldest pending call (optionally of a given method) with failure. */
    flushFailure(err, method) {
      const i = find(method);
      if (i < 0) throw new Error('flushFailure: no pending call' + (method ? ' for ' + method : ''));
      const c = calls[i]; c.resolved = true;
      const e = err instanceof Error ? err : new Error(String(err || 'error'));
      if (c.failure) c.failure(e);
      return c;
    },
    /** Mark every pending call resolved without invoking handlers (drain noise
     *  like prewarm/ambient pollers a test doesn't care about). */
    drain() { calls.forEach((c) => { c.resolved = true; }); return api; },
    reset() { calls.length = 0; for (const k in responders) delete responders[k]; return api; },
  };
  return api;
}

// ── Default employee-state fixture for bootShell ────────────────────────────
// Shape pulled from getEmployeeState's consumers in script_core.html's load
// handler + renderShell. Override per-test via bootShell(overrides).
function defaultEmpState(over) {
  return Object.assign({
    id: 'TEST_E1', name: 'Test Rep', email: 'rep@umsupply.com',
    isManager: true, timezone: 'Asia/Kolkata', timezoneAbbr: 'IST',
    ptoEnabled: true, annualLeaveBalance: 15, sickLeaveBalance: 10,
    adjustWindowDays: 30, adjustReasonThresholdDays: 7, selfUndoWindowSeconds: 300,
    payCycle: 'Monthly', payAnchor: '', schedule: { startMin: 480, lengthMin: 540 },
    flags: {},
  }, over || {});
}

/** Boot a fresh jsdom window with every partial loaded + a controllable run.
 *  Does NOT fire the shell load handler — call api.bootShell() for that.
 *  opts.serverQueryParams seeds window.SERVER_QUERY_PARAMS BEFORE the partials
 *  load, so __URL_PARAMS / INITIAL_VIEW_FROM_URL capture it (e.g. a ?tool=
 *  deep-link for the onboarding-tour gate). */
function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM(skeletonHtml(), {
    url: 'https://example.test/',
    runScripts: 'outside-only',  // enables getInternalVMContext for vm.runInContext
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const ctx = dom.getInternalVMContext();
  const run = makeRun();

  // Stubs jsdom doesn't provide / we want controllable.
  window.SERVER_QUERY_PARAMS = opts.serverQueryParams || {};
  window.SERVER_WEB_APP_URL = 'https://example.test/exec';
  window.google = { script: { get run() { return run.runner; } } };
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  }
  if (!window.navigator.clipboard) {
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
  }
  window.open = () => null;
  window.scrollTo = () => {};
  // jsdom does not implement HTMLElement.isContentEditable (returns undefined),
  // but the Call Notes form fields are contenteditable `.ce` divs and the
  // shipped cnGetFieldValue_/cnSetFieldValue_ branch on it. Provide a
  // spec-accurate getter (nearest contenteditable ancestor wins) so the
  // SHIPPED accessors behave exactly as in a real browser.
  Object.defineProperty(window.HTMLElement.prototype, 'isContentEditable', {
    configurable: true,
    get() {
      let el = this;
      while (el && el.nodeType === 1) {
        const v = el.getAttribute && el.getAttribute('contenteditable');
        if (v === 'true' || v === '') return true;
        if (v === 'false') return false;
        el = el.parentElement;
      }
      return false;
    },
  });
  // Globals defined in index.html's <head> (not a partial, so not loaded here)
  // that renderShell / theme toggles call by bare name.
  // (Pinned by run.js: this stub set must cover every window.* the index.html
  // boot script defines — adding one there silently broke 19 DOM tests once.)
  window.setTimeClockMode = () => {};
  window.syncThemeToggleState = () => {};
  window.setTimeClockPalette = () => {};
  window.syncPaletteToggleState = () => {};
  // Deterministic timers — capture instead of firing on the real clock, so a
  // background poller/ambient interval can't perturb a test. api.flushTimers()
  // runs captured one-shots if a test needs a deferred render.
  const timers = [];
  window.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  window.clearTimeout = () => {};
  window.setInterval = () => 0;
  window.clearInterval = () => {};
  window.requestAnimationFrame = (fn) => { timers.push(fn); return timers.length; };
  window.cancelAnimationFrame = () => {};

  // Load every partial's <script> into the window's global scope. A load
  // failure is itself a signal (a partial has a load-time side effect the
  // skeleton/stubs don't cover) — surface it with the file name.
  for (const f of PARTIALS) {
    try {
      vm.runInContext(extractScript(f), ctx, { filename: f });
    } catch (e) {
      throw new Error(`Failed to load ${f} into the DOM harness: ${e.message}`);
    }
  }

  const api = {
    window,
    document: window.document,
    run,
    /** Evaluate an expression in the window's global scope. Needed to read
     *  top-level `let`/`const` module bindings (e.g. `currentView`, `CN_STATE`)
     *  — those are lexical, so they are NOT properties of `window`. */
    read(expr) { return vm.runInContext(expr, ctx); },
    $(sel) { return window.document.querySelector(sel); },
    $$(sel) { return Array.from(window.document.querySelectorAll(sel)); },
    /** Dispatch a real KeyboardEvent (default keydown) on a target. Default
     *  target is document.body so the event traverses a real capture→bubble
     *  path through document — the shell's bubble-phase keydown handler and the
     *  ui-dialog capture-phase handlers both depend on that propagation (a bare
     *  dispatch ON document collapses the phases and is not representative). */
    dispatchKey(key, opts) {
      const o = opts || {};
      const ev = new window.KeyboardEvent(o.type || 'keydown', {
        key, bubbles: true, cancelable: true, ctrlKey: !!o.ctrl, metaKey: !!o.meta, shiftKey: !!o.shift,
      });
      (o.target || window.document.body).dispatchEvent(ev);
      return ev;
    },
    /** Click a target by selector or element (real bubbling MouseEvent). */
    click(target) {
      const el = typeof target === 'string' ? api.$(target) : target;
      if (!el) throw new Error('click: no element for ' + target);
      el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      return el;
    },
    /** Set an input/textarea value (or a [contenteditable] textContent) and
     *  fire an `input` event, like a real keystroke. */
    setField(id, value) {
      const el = window.document.getElementById(id);
      if (!el) throw new Error('setField: no element #' + id);
      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') el.textContent = value;
      else el.value = value;
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
      return el;
    },
    /** Run + clear captured setTimeout/rAF callbacks (deferred renders).
     *  F(cycle-8): a throwing deferred callback is a REAL client bug — it used
     *  to be silently swallowed, so a test relying on flushed timers could
     *  pass over a crashing code path. All timers still run (one bad callback
     *  can't shadow the others); the first error then surfaces as the test's
     *  failure. */
    flushTimers() {
      const t = timers.splice(0);
      let firstErr = null;
      t.forEach((fn) => { try { fn(); } catch (e) { if (!firstErr) firstErr = e; } });
      if (firstErr) throw firstErr;
    },
    /** Fire the shell `load` handler and satisfy getEmployeeState with a fixture
     *  so renderShell builds #view-area + the initial tool renders. Returns the
     *  empState used. Other RPCs fired during enter (prewarm, dept config, notes,
     *  ambient) remain PENDING for the test to flush or drain. */
    bootShell(stateOverrides) {
      const state = defaultEmpState(stateOverrides);
      run.respond('getEmployeeState', () => state);
      window.dispatchEvent(new window.Event('load'));
      run.clearResponder('getEmployeeState');
      return state;
    },
  };
  return api;
}

module.exports = { boot, makeRun, extractScript, PARTIALS, defaultEmpState };
