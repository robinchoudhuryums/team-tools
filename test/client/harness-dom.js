'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DOM-lifecycle test harness for the web-app HtmlService partials.
//
// Companion to the dependency-free `harness.js` (which stays the fast parse-guard
// + pure-helper net). This one loads the FULL <script> bodies of the chosen
// partials into a real `jsdom` window, so tests can exercise the layer the pure
// harness can't reach: innerHTML render/escape, overlay lifecycle, optimistic-UI
// revert, late-callback `currentView` guards, focus traps, double-fire guards.
//
// HOW IT WORKS
//  • runScripts:'outside-only' gives getInternalVMContext() — a vm context where
//    window === globalThis (matching the pure harness's bare-name resolution) but
//    with a REAL document. DOMContentLoaded is NOT auto-fired, so module-top init
//    listeners (tour auto-start, ambient polling, boot fetch) stay dormant.
//  • Partials are loaded in order with separate runInContext calls; they SHARE the
//    global lexical scope (browser <script> semantics — verified), so a later
//    partial sees an earlier one's top-level const/let.
//  • Module state is declared with const/let (CN_STATE const, currentView/empState
//    let), so it is NOT reachable as a context property. A trailing BRIDGE script
//    (run in the same scope) closes over those bindings and exposes get/set on
//    `window.__t`, which tests use to seed/read state. typeof-guarded so a partial
//    that wasn't loaded just yields null.
//  • google.script.run is a programmable mock: each terminal `.method(args)` is
//    recorded with its registered success/failure handlers; a test drives the
//    server response with run.resolve()/reject().
//
// Requires the `jsdom` dev dependency (npm ci). Lives outside web-app/, so clasp
// never pushes it.
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const { JSDOM } = require('jsdom');
const { extractScript, extractMarkup } = require('./harness');

// Foundation partials every window needs (icons → core).
const FOUNDATION = ['script_icons.html', 'script_core.html'];

// Default shell DOM — the nodes the client renders into. Tests can override via
// opts.html (appended INSIDE <body> after these).
const DEFAULT_SHELL =
  '<div class="app-shell">' +
  '<aside id="sidebar" class="sidebar"></aside>' +
  '<div id="tool-tab-bar"></div>' +
  '<main id="view-area"></main>' +
  '<div id="toast-host"></div>' +
  '</div>';

/** Programmable google.script.run mock + controller. */
function createMockRun() {
  const calls = [];
  function make(handlers) {
    return new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'withSuccessHandler') return (fn) => make(Object.assign({}, handlers, { success: fn }));
        if (prop === 'withFailureHandler') return (fn) => make(Object.assign({}, handlers, { failure: fn }));
        if (prop === 'withUserObject')     return (uo) => make(Object.assign({}, handlers, { userObject: uo }));
        if (typeof prop === 'symbol') return undefined;
        // Any other property name is a server method — terminal call.
        return function (...args) {
          calls.push({ method: prop, args, handlers, settled: false });
          return undefined;
        };
      },
    });
  }
  const ctl = {
    run: make({}),
    calls,
    last() { return calls[calls.length - 1] || null; },
    lastFor(method) { for (let i = calls.length - 1; i >= 0; i--) if (calls[i].method === method) return calls[i]; return null; },
    pending() { return calls.filter((c) => !c.settled); },
    countFor(method) { return calls.filter((c) => c.method === method).length; },
    resolveCall(call, value) {
      if (!call) throw new Error('mockRun: no call to resolve');
      call.settled = true;
      if (call.handlers.success) call.handlers.success(value, call.handlers.userObject);
      return value;
    },
    rejectCall(call, err) {
      if (!call) throw new Error('mockRun: no call to reject');
      call.settled = true;
      if (call.handlers.failure) call.handlers.failure(err || new Error('rpc failed'), call.handlers.userObject);
    },
    resolve(value) { return this.resolveCall(this.last(), value); },
    reject(err) { return this.rejectCall(this.last(), err); },
    resolveLastFor(method, value) { return this.resolveCall(this.lastFor(method), value); },
    rejectLastFor(method, err) { return this.rejectCall(this.lastFor(method), err); },
    clear() { calls.length = 0; },
  };
  return ctl;
}

// The trailing bridge: closes over the partials' lexically-scoped module state
// and exposes get/set on window.__t. typeof-guarded so an unloaded partial's
// symbol yields null rather than a ReferenceError.
const BRIDGE_JS = `
  window.__t = {
    getCurrentView: function(){ return (typeof currentView !== 'undefined') ? currentView : null; },
    setCurrentView: function(v){ if (typeof currentView !== 'undefined') currentView = v; },
    getEmpState: function(){ return (typeof empState !== 'undefined') ? empState : null; },
    setEmpState: function(s){ if (typeof empState !== 'undefined') empState = s; },
    getCN_STATE: function(){ return (typeof CN_STATE !== 'undefined') ? CN_STATE : null; },
    getCompact: function(){ return (typeof COMPACT_MODE !== 'undefined') ? COMPACT_MODE : null; },
    // Escape hatch: run an arbitrary expression in module scope (read-only use).
    eval: function(expr){ return eval(expr); },
  };
`;

/**
 * Build a jsdom window with the client partials loaded.
 * @param {string[]} files  tool partials to load AFTER the foundation (e.g. ['cn/script_callnotes.html'])
 * @param {object}   [opts] { html, markup, globals, serverQueryParams }
 *   markup: shared markup partials to mount into <body> BEFORE the tool scripts
 *   run (e.g. ['modals.html']) — mirrors index.html, so module-top listeners that
 *   bind to modal nodes find them.
 * @returns {{window, document, dom, ctx, run, t, flush, dispatchKey, $, $$}}
 */
function buildDomWindow(files, opts) {
  opts = opts || {};
  const mountedMarkup = (opts.markup || []).map(extractMarkup).join('\n');
  const bodyHtml = DEFAULT_SHELL + mountedMarkup + (opts.html || '');
  const dom = new JSDOM(
    '<!DOCTYPE html><html><head></head><body>' + bodyHtml + '</body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
  const win = dom.window;
  const ctx = dom.getInternalVMContext();

  // ── browser/GAS globals ──
  const run = createMockRun();
  win.google = { script: { run: run.run, host: { close() {}, setHeight() {}, editor: { focus() {} } } } };
  win.SERVER_QUERY_PARAMS = opts.serverQueryParams || {};
  win.SERVER_WEB_APP_URL = 'https://example.test/exec';
  if (!win.matchMedia) win.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  try {
    if (!win.navigator.clipboard) {
      Object.defineProperty(win.navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') }, configurable: true,
      });
    }
  } catch (_) {}
  Object.assign(win, opts.globals || {});

  // ── load foundation + requested partials, then the bridge ──
  const all = FOUNDATION.concat(files || []);
  for (const f of all) {
    try { vm.runInContext(extractScript(f), ctx, { filename: f }); }
    catch (e) { throw new Error('Failed to load ' + f + ' into DOM harness: ' + e.message); }
  }
  vm.runInContext(BRIDGE_JS, ctx, { filename: '__bridge__' });
  const t = win.__t;

  // ── conveniences ──
  const flush = () => new Promise((r) => setImmediate(r));   // drain microtasks/promises
  const $ = (sel) => win.document.querySelector(sel);
  const $$ = (sel) => Array.from(win.document.querySelectorAll(sel));
  function dispatchKey(key, init) {
    const ev = new win.KeyboardEvent('keydown', Object.assign({ key: key, bubbles: true, cancelable: true }, init || {}));
    (init && init.target ? init.target : win.document).dispatchEvent(ev);
    return ev;
  }

  return { window: win, document: win.document, dom, ctx, run, t, flush, dispatchKey, $, $$ };
}

module.exports = { buildDomWindow, createMockRun, FOUNDATION };
