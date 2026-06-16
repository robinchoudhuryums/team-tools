'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DOM-lifecycle test suite runner.
//
//   Phase 1 — BOOT INFRASTRUCTURE: jsdom boots, all partials load, controllable
//             google.script.run, full shell + Call Notes Log render smoke.
//   Phase 2 — OVERLAY + DIALOG LIFECYCLE: the highest historical bite-rate bug
//             class (Esc closing the wrong overlay / hidden-but-stateful reuse,
//             uiConfirm/uiPrompt resolution, focus-trap + KB-drawer exemption,
//             drawer survives a #view-area re-render).
//   Phase 3 — (next) optimistic-UI / RPC sequencing.
//
// Run: `node test/client/dom/runDom.js`  (needs `npm ci` for jsdom)
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const { boot, makeRun } = require('./boot');

// ── Tiny async-capable sectioned runner ─────────────────────────────────────
let pass = 0, fail = 0, curSection = null;
const tests = [];
function section(name) { tests.push({ section: name }); }
function test(name, fn) { tests.push({ name, fn }); }
/** Resolve the microtask + immediate queue so a Promise.then has run. */
const tick = () => new Promise((r) => setImmediate(r));
/** Track a promise's settled state without awaiting it inline. */
function settle(p) { const s = { done: false, value: undefined }; p.then((v) => { s.done = true; s.value = v; }); return s; }

async function runAll() {
  for (const t of tests) {
    if (t.section) { curSection = t.section; console.log('\n' + curSection); continue; }
    try { await t.fn(); pass++; console.log('  ✓ ' + t.name); }
    catch (e) { fail++; console.log('  ✗ ' + t.name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e)); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0) process.exit(1);
}
// Run after the synchronous section()/test() registrations below have all run.
setImmediate(runAll);

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 1 — controllable run + boot
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — controllable google.script.run');

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

section('DOM harness — boot loads all partials');

test('boot() loads every client partial with no throw', () => {
  const h = boot();
  assert.ok(h.window && h.document, 'window + document exist');
  ['esc', 'icon', 'enterTool', 'showView', 'renderShell', 'ensureOverlay', 'closeOverlay', 'uiConfirm']
    .forEach((fn) => assert.strictEqual(typeof h.window[fn], 'function', fn + ' is defined'));
  assert.ok(h.$('#adjust-overlay'), '#adjust-overlay seeded from modals.html');
  assert.ok(h.$('#app'), '#app skeleton present');
});

section('DOM harness — shell boot + Call Notes Log render (smoke)');

test('bootShell builds the real shell (#view-area, sidebar) via renderShell', () => {
  const h = boot();
  h.bootShell();
  assert.ok(h.$('#view-area'), 'renderShell created #view-area');
  assert.ok(h.$('.sidebar .sb-link[data-tool="callNotes"]'), 'sidebar rendered tool links');
});

test('enterTool("callNotes") renders the Log form into #view-area', () => {
  const h = boot();
  h.bootShell();
  h.window.enterTool('callNotes');
  const area = h.$('#view-area');
  assert.ok(/Loading call notes/i.test(area.innerHTML), 'shows the Log loading state');
  h.run.flushSuccess({ departments: [], suggestionsByDept: {}, defaultSuggestions: [], flags: {}, emailTemplates: [], externalLinks: [] }, 'getCallNotesDepartments');
  h.run.flushSuccess({ notes: [], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  const html = h.$('#view-area').innerHTML;
  assert.ok(/cn-frame|cnv-layout|cn-fld-/.test(html), 'Log form frame rendered');
  assert.strictEqual(h.read('currentView'), 'callNotes', 'currentView tracks the active tab');
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2 — overlay lifecycle (ensureOverlay / closeOverlay / Esc handler)
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — overlay lifecycle (Esc / hooks / reuse)');

test('ensureOverlay creates "overlay open" + registers a close hook', () => {
  const h = boot();
  let closed = 0;
  const el = h.window.ensureOverlay('t-ov', { onClose: () => { closed++; } });
  assert.ok(el.classList.contains('overlay') && el.classList.contains('open'), 'overlay open set');
  assert.strictEqual(h.read("OVERLAY_CLOSE_HOOKS['t-ov']") ? 'fn' : 'none', 'fn', 'hook registered');
  h.window.closeOverlay(el);
  assert.strictEqual(closed, 1, 'closeOverlay ran the hook');
});

test('ensureOverlay REUSE re-asserts "open" (no hidden-but-stateful node)', () => {
  // The historical bug: Esc stripped only the `open` class, leaving the node
  // hidden-but-stateful; the next render targeted the hidden node forever.
  const h = boot();
  const el = h.window.ensureOverlay('t-ov', { onClose: () => {} });
  el.classList.remove('open');                 // simulate a stale class-strip
  h.window.ensureOverlay('t-ov', { onClose: () => {} });  // reuse path
  assert.ok(el.classList.contains('open'), 'reuse brought the node back visible');
});

test('Escape closes the TOPMOST overlay through its hook (not the first)', () => {
  const h = boot();
  let a = 0, b = 0;
  h.window.ensureOverlay('ov-a', { onClose: () => { a++; h.$('#ov-a').classList.remove('open'); } });
  h.window.ensureOverlay('ov-b', { onClose: () => { b++; h.$('#ov-b').classList.remove('open'); } });
  h.dispatchKey('Escape');
  assert.strictEqual(b, 1, 'topmost (last-in-DOM) hook ran');
  assert.strictEqual(a, 0, 'underlying overlay untouched');
  assert.ok(!h.$('#ov-b').classList.contains('open'), 'topmost actually closed (hook ran, not hidden-but-stateful)');
  h.dispatchKey('Escape');
  assert.strictEqual(a, 1, 'second Escape closes the next overlay down');
});

test('closeOverlay degrades to a class-strip when the hook throws', () => {
  const h = boot();
  const el = h.window.ensureOverlay('ov-c', { onClose: () => { throw new Error('boom'); } });
  assert.doesNotThrow(() => h.window.closeOverlay(el), 'a throwing hook never gets Esc stuck');
  assert.ok(!el.classList.contains('open'), 'degraded to plain hide');
});

test('Escape with no overlay open closes the KB drawer instead', () => {
  const h = boot();
  h.window.kbDrawerToggle_();                  // mounts + opens #kb-drawer on body
  assert.strictEqual(h.read('KB_DRAWER.open'), true, 'drawer open');
  assert.ok(h.$('#kb-drawer'), 'drawer mounted');
  h.dispatchKey('Escape');                     // no .overlay.open → drawer close hook
  assert.strictEqual(h.read('KB_DRAWER.open'), false, 'Escape closed the drawer');
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2 — uiConfirm / uiPrompt lifecycle
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — uiConfirm / uiPrompt');

test('uiConfirm: Escape resolves false', async () => {
  const h = boot();
  const s = settle(h.window.uiConfirm({ title: 'Q' }));
  h.dispatchKey('Escape');
  await tick();
  assert.strictEqual(s.value, false);
  assert.ok(!h.$('.ui-dialog'), 'dialog removed from the DOM');
});

test('uiConfirm: backdrop click resolves false', async () => {
  const h = boot();
  const s = settle(h.window.uiConfirm({ title: 'Q' }));
  h.click(h.$('.ui-dialog'));                  // click ON the overlay backdrop
  await tick();
  assert.strictEqual(s.value, false);
});

test('uiConfirm: Enter on the OK/default resolves true', async () => {
  const h = boot();
  const s = settle(h.window.uiConfirm({ title: 'Q' }));
  h.dispatchKey('Enter', { target: h.$('.ui-dialog-ok') });
  await tick();
  assert.strictEqual(s.value, true);
});

test('uiConfirm: Enter while the CANCEL button is focused resolves false', async () => {
  // INV-83: confirming from a Tab-focused Cancel fired destructive actions.
  const h = boot();
  const s = settle(h.window.uiConfirm({ title: 'Delete?', tone: 'danger' }));
  h.dispatchKey('Enter', { target: h.$('.ui-dialog-cancel') });
  await tick();
  assert.strictEqual(s.value, false, 'Enter from Cancel = cancel, not confirm');
});

test('uiConfirm: resolved sentinel — a second close path does not throw / re-resolve', async () => {
  const h = boot();
  const p = h.window.uiConfirm({ title: 'Q' });
  let resolves = 0; p.then(() => { resolves++; });
  const overlay = h.$('.ui-dialog');
  h.dispatchKey('Escape');                     // first resolution (false)
  // A near-simultaneous backdrop click on the now-detached node must no-op.
  assert.doesNotThrow(() => overlay.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true })));
  await tick();
  assert.strictEqual(resolves, 1, 'resolved exactly once');
});

test('uiPrompt: validator keeps the dialog open on invalid, resolves on valid', async () => {
  const h = boot();
  const s = settle(h.window.uiPrompt({ title: 'Tag', validator: (v) => (v.length < 2 ? 'too short' : '') }));
  const input = h.$('.ui-dialog-input');
  input.value = 'x';
  h.dispatchKey('Enter', { target: input });
  await tick();
  assert.strictEqual(s.done, false, 'invalid input did NOT resolve');
  assert.ok(h.$('.ui-dialog'), 'dialog still open');
  assert.strictEqual(h.$('.ui-dialog-err').style.display, '', 'inline error shown');
  input.value = 'urgent';
  h.dispatchKey('Enter', { target: input });
  await tick();
  assert.strictEqual(s.value, 'urgent', 'valid input resolves the typed value');
});

test('uiConfirm OVER a base overlay: Esc resolves the dialog WITHOUT running the base hook', async () => {
  // The dialog's capture-phase handler stopPropagation's, so the shell's
  // topmost-overlay close never fires — the dialog owns its own Esc lifecycle.
  const h = boot();
  let baseClosed = 0;
  h.window.ensureOverlay('ov-base', { onClose: () => { baseClosed++; } });
  const s = settle(h.window.uiConfirm({ title: 'Q' }));
  h.dispatchKey('Escape');
  await tick();
  assert.strictEqual(s.value, false, 'dialog resolved false');
  assert.strictEqual(baseClosed, 0, 'underlying overlay hook NOT triggered');
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2 — focus trap + KB drawer exemption + survives re-render
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — focus trap + KB drawer');

test('focusin outside the topmost overlay is pulled back into its modal', () => {
  const h = boot();
  h.window.uiConfirm({ title: 'Q' });          // overlay open with cancel+ok buttons
  const outside = h.document.createElement('input');
  h.document.body.appendChild(outside);
  outside.focus();
  outside.dispatchEvent(new h.window.FocusEvent('focusin', { bubbles: true }));
  const active = h.document.activeElement;
  assert.ok(active && active.classList.contains('ui-dialog-cancel'), 'focus trapped to the modal’s first focusable');
});

test('focusin from inside #kb-drawer is EXEMPT from the trap', () => {
  const h = boot();
  h.window.kbDrawerToggle_();                   // #kb-drawer with #kbd-q on body
  h.window.uiConfirm({ title: 'Q' });           // overlay open on top
  const q = h.$('#kbd-q');
  q.focus();
  q.dispatchEvent(new h.window.FocusEvent('focusin', { bubbles: true }));
  assert.strictEqual(h.document.activeElement, q, 'drawer search box keeps focus over a modal');
});

test('KB drawer survives a #view-area re-render (mounted on body, not #view-area)', () => {
  const h = boot();
  h.bootShell();
  h.window.kbDrawerToggle_();
  assert.ok(h.$('#kb-drawer') && h.read('KB_DRAWER.open') === true, 'drawer open');
  h.$('#view-area').innerHTML = '<div>optimistic re-render</div>';   // CN re-render
  assert.ok(h.$('#kb-drawer'), 'drawer node still present after #view-area was rewritten');
  assert.strictEqual(h.read('KB_DRAWER.open'), true, 'drawer still open');
});
