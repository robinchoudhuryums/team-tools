'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Dependency-free client-side test harness for the web-app HtmlService partials.
//
// The client code lives inside <script> blocks in web-app/*.html and assumes
// browser globals (window, document, google.script.run, localStorage, …) plus
// the helpers defined across the partials (esc, icon, empTz, isoDateTz, …).
// This harness extracts those <script> bodies, evaluates them in a Node `vm`
// sandbox with minimal stubs, and lets tests call the PURE helper functions.
//
// No npm dependencies (uses Node's built-in vm/fs + native Intl/URLSearchParams).
// Lives outside web-app/ so `clasp push` never sees it.
//
// Scope: pure string/date helpers (esc, empTz, isoDateTz, mTodayIso_, mDaysAgo_,
// cnExtEmailPillHtml_, …). Functions that genuinely drive the DOM or fire RPCs
// are out of scope — those still need a real browser / the manual scenarios.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB_APP = path.resolve(__dirname, '../../web-app');

/** Concatenate the JS inside every <script> block of an HtmlService partial,
 *  stripping the tags and any GAS scriptlets (<? … ?>). */
function extractScript(file) {
  const src = fs.readFileSync(path.join(WEB_APP, file), 'utf8');
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  return blocks.join('\n;\n').replace(/<\?[\s\S]*?\?>/g, '""');
}

/** Return the NON-<script> markup of an HtmlService partial (strips <script>
 *  blocks and GAS scriptlets), for mounting shared DOM (e.g. modals.html) into
 *  the DOM harness — mirroring how index.html includes these partials before the
 *  tool scripts run. */
function extractMarkup(file) {
  const src = fs.readFileSync(path.join(WEB_APP, file), 'utf8');
  return src
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\?[\s\S]*?\?>/g, '');
}

/** Brace-match a single top-level `function NAME(...) { … }` out of a partial,
 *  for cases where loading the whole (large) file isn't worth the risk. Safe
 *  only for functions whose bodies contain no `{`/`}` inside string literals. */
function extractFunction(file, name) {
  const js = extractScript(file);
  // F(cycle-8): anchor on the OPEN PAREN — a bare `'function ' + name` prefix
  // match silently extracted the wrong body when `name` prefixes an
  // earlier-declared function (getQuiz vs getQuizzes/getQuizAnalytics was a
  // live latent collision, correct only by declaration order).
  const start = js.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(`function ${name} not found in ${file}`);
  let i = js.indexOf('{', start);
  let depth = 0;
  for (; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}' && --depth === 0) { i++; break; }
  }
  return js.slice(start, i);
}

/** Brace-match a single top-level `function NAME(...) { … }` out of a RAW
 *  file (no <script> extraction) — for pure helpers living in Code.js. Same
 *  caveat as extractFunction (no `{`/`}` inside string literals in the body). */
function extractRawFunction(file, name) {
  const js = fs.readFileSync(path.join(WEB_APP, file), 'utf8');
  const start = js.indexOf('function ' + name + '(');   // F(cycle-8): paren-anchored — see extractFunction
  if (start < 0) throw new Error(`function ${name} not found in ${file}`);
  let i = js.indexOf('{', start);
  let depth = 0;
  for (; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}' && --depth === 0) { i++; break; }
  }
  return js.slice(start, i);
}

/** A permissive fake DOM element — any unknown property read returns a chainable
 *  no-op so load-time DOM touches never throw. */
function fakeEl() {
  const base = {
    appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
    getBoundingClientRect() { return { width: 0, height: 0, left: 0, top: 0 }; },
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    value: '', textContent: '', innerHTML: '', checked: false,
  };
  return new Proxy(base, {
    get(t, p) { return p in t ? t[p] : function () { return fakeEl(); }; },
    set() { return true; },
  });
}

function makeRunProxy() {
  // google.script.run.withSuccessHandler(fn).withFailureHandler(fn).method() — a
  // chainable proxy that no-ops (tests target pure functions, not RPC paths).
  const proxy = new Proxy(function () {}, { get: () => () => proxy, apply: () => proxy });
  return proxy;
}

/** Build a vm sandbox with browser/GAS stubs and load the given partials into
 *  it (in order). Returns the sandbox so tests can call the loaded functions.
 *  Per-file load failures throw with the file name (a load failure is itself a
 *  useful signal: the partial has a load-time side effect the stubs don't cover). */
function buildSandbox(files, extraGlobals) {
  const store = {};
  const sandbox = {
    console,
    Intl, Date, Math, JSON, RegExp, URLSearchParams,
    Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    // Browser-shaped window globals, placed directly on the global object so
    // that `window === globalThis` below holds (a partial sets `global.icon`
    // via `(function(global){…})(window)`, so window must be the real global
    // or those exports wouldn't resolve as bare names).
    addEventListener() {}, removeEventListener() {}, open() { return null; },
    location: { search: '', href: 'https://example.test/' },
    SERVER_QUERY_PARAMS: {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
    setTimeClockMode() {}, syncThemeToggleState() {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    navigator: { userAgent: 'node-harness', clipboard: { writeText: () => Promise.resolve() } },
    document: {
      getElementById: () => fakeEl(), querySelector: () => null, querySelectorAll: () => [],
      createElement: () => fakeEl(), addEventListener() {}, removeEventListener() {},
      body: fakeEl(), documentElement: fakeEl(), execCommand: () => true,
    },
    google: { script: { run: makeRunProxy() } },
  };
  Object.assign(sandbox, extraGlobals || {});
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  sandbox.window = sandbox;  // window === globalThis, like a real browser
  for (const f of files) {
    try {
      vm.runInContext(extractScript(f), sandbox, { filename: f });
    } catch (e) {
      throw new Error(`Failed to load ${f} into harness: ${e.message}`);
    }
  }
  return sandbox;
}

/** Eval an extracted function body into an already-built sandbox. */
function loadFunction(sandbox, file, name) {
  vm.runInContext(extractFunction(file, name), sandbox, { filename: `${file}#${name}` });
  return sandbox[name];
}

module.exports = { extractScript, extractMarkup, extractFunction, extractRawFunction, buildSandbox, loadFunction, fakeEl };
