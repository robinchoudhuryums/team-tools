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

// ── The server source, as one string ────────────────────────────────────────
// Every pin that reads server code goes through here rather than naming a file,
// so splitting Code.js is a move of text between files that no pin can see.
//
// The file LIST is derived from `web-app/.clasp.json`'s `filePushOrder` — the
// declaration `clasp push` obeys for LOAD ORDER — so the harness and the
// deployment agree on which files are the APP server and in what order they
// load. It is NOT the deployed surface: clasp pushes every .js in web-app/, so
// Tests.js and DevTools.js ship too and are google.script.run-reachable. A pin
// about what a caller can REACH must read the directory (PUBLIC-GATE, cycle 22
// X2) — reading serverSource() put the whole test suite outside every gate net.
// It is deliberately NOT a fallback-to-Code.js: an empty list means the
// declaration was lost, and reading one file anyway would make the derivation
// vacuous exactly when it stopped being true (INV-179, INV-202).
// `'Code.js'` is an ALIAS for "the server". Batch F2 split that file into the
// fourteen below, and ~500 pins name it; the name was always shorthand for the
// whole server, so it keeps resolving rather than becoming 500 edits with no
// behaviour change. `isServerFile()` is the one place that decides.
const SERVER_ALIAS = 'Code.js';
function isServerFile(file) {
  return file === SERVER_ALIAS || serverFiles().indexOf(file) >= 0;
}

let _serverFiles = null;
function serverFiles() {
  if (_serverFiles) return _serverFiles;
  const clasp = JSON.parse(fs.readFileSync(path.join(WEB_APP, '.clasp.json'), 'utf8'));
  const order = (clasp.filePushOrder || []).filter((f) => /\.js$/i.test(f));
  if (!order.length) {
    throw new Error(
      'harness: web-app/.clasp.json has no .js entries in filePushOrder — it is the ' +
      'declaration of what the server source IS. List the server files there, in load order.');
  }
  // Name the missing file HERE. Without this, a filePushOrder entry for a file
  // that does not exist surfaces as an ENOENT thrown out of whichever pin first
  // asks for the server — a stack trace pointing at a test that has nothing to
  // do with it. The pin below states the same contract; this makes the failure
  // legible when the harness dies before reaching it.
  const gone = order.filter((f) => !fs.existsSync(path.join(WEB_APP, f)));
  if (gone.length) {
    throw new Error(
      'harness: web-app/.clasp.json filePushOrder names ' + gone.join(', ') +
      ', which do(es) not exist. `clasp push` would fail the same way.');
  }
  _serverFiles = order;
  return _serverFiles;
}

/** The whole server as one string, files concatenated in load order. With a
 *  single-entry filePushOrder this is BYTE-EQUAL to that file (the join adds
 *  nothing to a one-element array) — F1b pins exactly that. */
let _serverSource = null;
function serverSource() {
  if (_serverSource !== null) return _serverSource;
  _serverSource = serverFiles()
    .map((f) => fs.readFileSync(path.join(WEB_APP, f), 'utf8'))
    .join('\n');
  return _serverSource;
}

/** Brace-match a single top-level `function NAME(...) { … }` out of a RAW
 *  file (no <script> extraction) — for pure helpers living in Code.js. Same
 *  caveat as extractFunction (no `{`/`}` inside string literals in the body).
 *
 *  A SERVER file name (anything in filePushOrder) resolves through
 *  `serverSource()`, not through that one file: the 500-odd pins that say
 *  `extractRawFunction('Code.js', …)` keep working after the function moves to
 *  another server file, because "Code.js" was always shorthand for "the server".
 *  Any other file is read directly, as before. */
function extractRawFunction(file, name) {
  const js = isServerFile(file)
    ? serverSource()
    : fs.readFileSync(path.join(WEB_APP, file), 'utf8');
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
    SERVER_COMPANY_HOLIDAYS: [],
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

/** Parse the server files into TOP-LEVEL declarations the way the F2 split
 *  did: a declaration starts at COLUMN 0 and runs to just before the next one,
 *  with trailing blank / pure-comment lines dropped (so a file banner or a
 *  moved comment is not a changed declaration).
 *
 *  ONE definition on purpose. The split manifest is a hash comparison, and a
 *  SECOND implementation of the same canonicalization is exactly what produced
 *  43 spurious mismatches while F2 was being built — the generator and the
 *  verifier disagreed about whether a trailing comment belonged to the unit
 *  above it. The pin and the regenerator now read the same function.
 *
 *  → { decls: Map<name, {kind, file, sha}>, dupes: string[] } */
function serverDecls() {
  const crypto = require('crypto');
  const DECL = /^(function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;
  const CMT = /^\s*(\/\/|\/\*|\*|\*\/)/;
  const out = new Map();
  const dupes = [];
  serverFiles().forEach((f) => {
    const lines = fs.readFileSync(path.join(WEB_APP, f), 'utf8').split('\n');
    const starts = [];
    lines.forEach((t, i) => { if (DECL.test(t)) starts.push(i); });
    starts.forEach((i, k) => {
      let e = k + 1 < starts.length ? starts[k + 1] : lines.length;
      while (e - 1 > i && CMT.test(lines[e - 1]) && lines[e - 1].trim()) e--;
      const body = lines.slice(i, e);
      while (body.length && (!body[body.length - 1].trim() || CMT.test(body[body.length - 1]))) body.pop();
      const m = DECL.exec(lines[i]);
      const rec = {
        kind: m[1], file: f,
        sha: crypto.createHash('sha256').update(body.join('\n')).digest('hex').slice(0, 16),
      };
      if (out.has(m[2])) dupes.push(m[2] + ' (' + out.get(m[2]).file + ' and ' + f + ')');
      out.set(m[2], rec);
    });
  });
  return { decls: out, dupes };
}

/** Every server declaration whose body CALLS `marker(`, sorted, excluding the
 *  marker's own declaration.
 *
 *  This exists for the ENUMERATED-READER pins — the ones shaped
 *  `['a','b','c'].forEach((fn) => assert(/marker_\(/.test(extractRawFunction(…))))`.
 *  Their hand-written lists drift from the code silently: the 2026-09-18 seams
 *  audit sampled ten and found six short, the worst covering 12 of 23 actual
 *  callers on a pin whose name was "every column-L read goes through
 *  cnEnrolledSheetId_". Nothing had told anyone, because the list only asserts
 *  about the functions it already names.
 *
 *  Pair a list with this and the pin fails when an eleventh caller appears.
 *
 *  NOT for blind use across every such pin. Some of them BAN their marker, so a
 *  caller outside the list is the expected case; others guard a deliberately
 *  narrow set ("exactly the four daily manager streams"). Applying this to
 *  those over-reports — measured: a naive sweep flagged 13 and most were false.
 *  Use it only where the list is meant to be EVERY caller.
 *
 *  Splits the same way serverDecls does (top-level declaration starts, per
 *  file), so a call inside `const x = function () { … }` counts too. */
function serverCallersOf(marker) {
  const DECL = /^(function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;
  const out = [];
  serverFiles().forEach((f) => {
    const lines = fs.readFileSync(path.join(WEB_APP, f), 'utf8').split('\n');
    const starts = [];
    lines.forEach((t, i) => { if (DECL.test(t)) starts.push(i); });
    starts.forEach((i, k) => {
      const name = DECL.exec(lines[i])[2];
      const body = lines.slice(i, k + 1 < starts.length ? starts[k + 1] : lines.length).join('\n');
      if (name !== marker && body.indexOf(marker + '(') >= 0) out.push(name);
    });
  });
  return out.sort();
}

/** Eval an extracted function body into an already-built sandbox. */
function loadFunction(sandbox, file, name) {
  vm.runInContext(extractFunction(file, name), sandbox, { filename: `${file}#${name}` });
  return sandbox[name];
}

module.exports = { extractScript, extractMarkup, extractFunction, extractRawFunction, serverFiles, serverSource, isServerFile, serverDecls, serverCallersOf, buildSandbox, loadFunction, fakeEl };
