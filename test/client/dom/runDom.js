'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DOM-lifecycle test suite runner.
//
// Phase 1 seeds this with BOOT-INFRASTRUCTURE smoke tests: prove the jsdom
// boot loads every partial, the controllable google.script.run behaves, and a
// real shell + Call Notes Log view renders end-to-end. Phases 2/3 append the
// overlay-lifecycle and optimistic-UI suites here.
//
// Run: `node test/client/dom/runDom.js`  (needs `npm ci` for jsdom)
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const { boot, makeRun } = require('./boot');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e)); }
}

// ── Controllable run: pure unit checks (no jsdom needed) ────────────────────
console.log('\nDOM harness — controllable google.script.run');

test('records a terminal call with its handlers, leaves it pending', () => {
  const run = makeRun();
  let ok = null;
  run.runner.withSuccessHandler((v) => { ok = v; }).getThing(1, 2);
  assert.strictEqual(run.pending().length, 1, 'one pending call');
  assert.strictEqual(run.calls[0].method, 'getThing');
  assert.deepStrictEqual(run.calls[0].args, [1, 2]);
  assert.strictEqual(ok, null, 'success not fired until flushed');
  run.flushSuccess('done');
  assert.strictEqual(ok, 'done');
  assert.strictEqual(run.pending().length, 0, 'resolved after flush');
});

test('each google.script.run access is an INDEPENDENT chain', () => {
  const run = makeRun();
  let a = null, b = null;
  run.runner.withSuccessHandler((v) => { a = v; }).first();
  run.runner.withSuccessHandler((v) => { b = v; }).second();
  // Flush in reverse order — handlers must not have cross-contaminated.
  run.flushSuccess('B', 'second');
  run.flushSuccess('A', 'first');
  assert.strictEqual(a, 'A');
  assert.strictEqual(b, 'B');
});

test('flushFailure invokes the failure handler with an Error', () => {
  const run = makeRun();
  let err = null;
  run.runner.withSuccessHandler(() => {}).withFailureHandler((e) => { err = e; }).boom();
  run.flushFailure('nope');
  assert.ok(err instanceof Error && /nope/.test(err.message));
});

test('respond() auto-answers without queuing', () => {
  const run = makeRun();
  let got = null;
  run.respond('getX', (n) => n * 2);
  run.runner.withSuccessHandler((v) => { got = v; }).getX(21);
  assert.strictEqual(got, 42);
  assert.strictEqual(run.pending().length, 0);
});

// ── Boot: every partial loads into jsdom ────────────────────────────────────
console.log('\nDOM harness — boot loads all partials');

test('boot() loads every client partial with no throw', () => {
  const h = boot();
  assert.ok(h.window && h.document, 'window + document exist');
  // Core functions wired to the real document.
  ['esc', 'icon', 'enterTool', 'showView', 'renderShell', 'ensureOverlay', 'closeOverlay', 'uiConfirm']
    .forEach((fn) => assert.strictEqual(typeof h.window[fn], 'function', fn + ' is defined'));
  // The real modal overlays from modals.html are present as real nodes.
  assert.ok(h.$('#adjust-overlay'), '#adjust-overlay seeded from modals.html');
  assert.ok(h.$('#app'), '#app skeleton present');
});

// ── Smoke: full shell + Call Notes Log render end-to-end ─────────────────────
console.log('\nDOM harness — shell boot + Call Notes Log render (smoke)');

test('bootShell builds the real shell (#view-area, sidebar) via renderShell', () => {
  const h = boot();
  h.bootShell();
  assert.ok(h.$('#view-area'), 'renderShell created #view-area');
  assert.ok(h.$('.sidebar .sb-link[data-tool="callNotes"]'), 'sidebar rendered tool links');
});

test('enterTool("callNotes") renders the Log form into #view-area', () => {
  const h = boot();
  h.bootShell();                         // lands on Time Clock by default
  h.window.enterTool('callNotes');       // navigate to Call Notes Log
  const area = h.$('#view-area');
  assert.ok(/Loading call notes/i.test(area.innerHTML), 'shows the Log loading state');
  // enter fires: cnPing (prewarm), then getCallNotesDepartments, then getMyCallNotes.
  h.run.flushSuccess({ departments: [], suggestionsByDept: {}, defaultSuggestions: [], flags: {}, emailTemplates: [], externalLinks: [] }, 'getCallNotesDepartments');
  h.run.flushSuccess({ notes: [], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  // After both resolve, cnRenderNotesView replaces the loading state with the form frame.
  const html = h.$('#view-area').innerHTML;
  assert.ok(/cn-frame|cnv-layout|cn-fld-/.test(html), 'Log form frame rendered (cn-frame / cnv-layout / fields)');
  assert.strictEqual(h.read('currentView'), 'callNotes', 'currentView tracks the active tab');
});

// ── Result ──────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
