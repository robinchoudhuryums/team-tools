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

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3 — optimistic-UI / RPC sequencing (Call Notes hot path)
// ═════════════════════════════════════════════════════════════════════════════
// Render the Call Notes Log view with an optional set of confirmed notes.
function bootLog(notes) {
  const h = boot();
  h.bootShell();
  h.window.enterTool('callNotes');
  h.run.flushSuccess({ departments: [], suggestionsByDept: {}, defaultSuggestions: [], flags: {}, emailTemplates: [], externalLinks: [] }, 'getCallNotesDepartments');
  h.run.flushSuccess({ notes: notes || [], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  return h;
}
function noteFixture(over) {
  return Object.assign({
    noteId: 'n1', timestamp: '2026-06-16 10:00:00', dateLocal: '2026-06-16',
    callback: '', caller: 'Jane', relationship: '', patientAndTrx: 'P1',
    issue: 'orig issue', transferredTo: '', resolution: 'done',
    flagType: '', resolved: false, emailedAt: '', emailDepartments: '',
    subform: '', subformData: null,
  }, over || {});
}

section('DOM harness — optimistic submit (Call Notes)');

test('empty form: submit shows a warning and fires NO RPC', () => {
  const h = bootLog();
  h.window.cnSubmitActiveForm_();
  assert.strictEqual(h.run.pending('submitCallNote').length, 0, 'no submitCallNote queued');
});

test('submit is optimistic: pending card appears + form clears BEFORE the RPC resolves', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'Patient called about a refill');
  h.window.cnSubmitActiveForm_();
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 1, 'pending note in the stack');
  assert.strictEqual(h.read('CN_STATE.rollingNotes[0]._pending'), true, 'marked _pending');
  assert.ok(/^pending_/.test(h.read('CN_STATE.rollingNotes[0].noteId')), 'temp pending_ id');
  assert.strictEqual(h.run.pending('submitCallNote').length, 1, 'submitCallNote queued');
  assert.strictEqual(h.read("cnGetFieldValue_('cn-fld-issue')").trim(), '', 'form cleared optimistically');
});

test('submit success: array slot REPLACED + held undo ref re-pointed (stale-pending bug)', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'Refill request');
  h.window.cnSubmitActiveForm_();
  // The regression: lastSaveUndo held the pending object; the array slot is
  // replaced on confirm, so the held ref must be re-pointed at res.note.
  h.run.flushSuccess({ success: true, note: noteFixture({ noteId: 'real-1', issue: 'Refill request', _pending: false }) }, 'submitCallNote');
  assert.strictEqual(h.read('CN_STATE.rollingNotes[0].noteId'), 'real-1', 'confirmed note in the slot');
  assert.ok(!h.read('CN_STATE.rollingNotes[0]._pending'), 'no longer pending');
  assert.strictEqual(h.read('CN_STATE.lastSaveUndo.note.noteId'), 'real-1', 'undo ref re-pointed at the confirmed note');
});

test('submit failure: reverts and restores the snapshot into an EMPTY form', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'Snapshot me');
  h.window.cnSubmitActiveForm_();
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 1);
  h.run.flushFailure(new Error('network down'), 'submitCallNote');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 0, 'pending card removed');
  assert.strictEqual(h.read("cnGetFieldValue_('cn-fld-issue')").trim(), 'Snapshot me', 'typed note restored to the (empty) form');
});

test('submit failure: does NOT clobber new typing started during the in-flight save', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'First note');
  h.window.cnSubmitActiveForm_();                  // optimistic clear
  h.setField('cn-fld-issue', 'Second note in progress');   // rep starts the next call
  h.run.flushFailure(new Error('boom'), 'submitCallNote');
  assert.strictEqual(h.read("cnGetFieldValue_('cn-fld-issue')").trim(), 'Second note in progress', 'in-progress typing left untouched');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 0, 'failed pending card still removed');
});

section('DOM harness — flag toggle in-flight guard + revert (INV-56)');

test('double flag-toggle while the first RPC is in flight fires exactly ONE RPC', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', flagType: '' })]);
  h.window.cnToggleFlag_('n1', 'action');
  h.window.cnToggleFlag_('n1', 'action');   // dropped by _flagInFlight
  assert.strictEqual(h.run.pending('setCallNoteFlag').length, 1, 'only one setCallNoteFlag in flight');
  assert.strictEqual(h.read("CN_STATE.rollingNotes[0]._flagInFlight"), true, 'guard set');
});

test('flag toggle reverts the optimistic flagType on server failure', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', flagType: '' })]);
  h.window.cnToggleFlag_('n1', 'action');
  assert.strictEqual(h.read("CN_STATE.rollingNotes[0].flagType"), 'action', 'optimistically flagged');
  h.run.flushFailure(new Error('save fail'), 'setCallNoteFlag');
  assert.strictEqual(h.read("CN_STATE.rollingNotes[0].flagType"), '', 'reverted to prior flagType');
  assert.ok(!h.read("CN_STATE.rollingNotes[0]._flagInFlight"), 'in-flight guard cleared');
});

section('DOM harness — stale-callback + transactional Save & Compose');

test('nav-away during the dept-config fetch suppresses the notes load (M5 guard)', () => {
  const h = boot();
  h.bootShell();
  h.window.enterTool('callNotes');           // requestedView captured = 'callNotes'
  h.read('currentView = "clock"');           // simulate nav-away mid fetch
  h.run.flushSuccess({ departments: [], suggestionsByDept: {}, defaultSuggestions: [], flags: {}, emailTemplates: [], externalLinks: [] }, 'getCallNotesDepartments');
  assert.strictEqual(h.run.pending('getMyCallNotes').length, 0, 'notes load never fired after nav-away');
});

test('Save & Compose: cancelling the composer while the save is in flight rolls the save back', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'Compose me');
  h.window.cnSubmitActiveForm_({ keepForm: true });   // transactional: composeFlow set, form KEPT
  assert.ok(h.read('CN_STATE.composeFlow') , 'composeFlow armed');
  assert.strictEqual(h.read("cnGetFieldValue_('cn-fld-issue')").trim(), 'Compose me', 'form text kept (transactional)');
  h.window.cnCloseComposerModal_();                   // cancel while save in flight
  assert.strictEqual(h.read('CN_STATE.rollingNotes[0]._deleteOnConfirm'), true, 'rollback deferred to save-confirm');
  assert.strictEqual(h.read('CN_STATE.composeFlow'), null, 'composeFlow detached');
  h.run.flushSuccess({ success: true, note: noteFixture({ noteId: 'real-x', _pending: false }) }, 'submitCallNote');
  assert.strictEqual(h.run.pending('deleteCallNote').length, 1, 'rollback delete fired on confirm');
  h.run.flushSuccess({ success: true }, 'deleteCallNote');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 0, 'rolled-back note removed from the stack');
});

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 — Log persistence on nav-away/return (diagnose the operator report
// "short-term notes reset when navigating back"). The Log is a today-only view
// re-fetched on every enter (getMyCallNotes); History uses ranges. These tests
// pin whether the CLIENT re-fetches AND re-renders on return — if they pass, the
// client persistence path is sound and the report points at the server "today"
// boundary (midnight rollover) or a deployed-version lag, not a client bug.
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — Log persistence on nav-away/return (Step 1 diagnosis)');

test('returning to Log re-fetches today\'s notes (does not render a stale/empty stack)', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', issue: 'first call' })]);
  assert.ok(/first call/.test(h.$('#cn-stack').innerHTML), 'n1 shows on first Log entry');

  // Log a second note (optimistic + server confirm).
  h.setField('cn-fld-issue', 'second call');
  h.window.cnSubmitActiveForm_();
  h.run.flushSuccess({ success: true, note: noteFixture({ noteId: 'n2', issue: 'second call', _pending: false }) }, 'submitCallNote');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 2, 'both notes in the stack after submit');

  // Navigate away, then back to Log (the operator's "navigating back from other pages").
  h.read('currentView = "clock"');
  h.window.enterTool('callNotes');
  // The Log MUST re-fetch on re-entry (not render a stale/empty in-memory stack).
  assert.strictEqual(h.run.pending('getMyCallNotes').length, 1, 're-entry re-fetched today\'s notes');

  // Server still has both (they persisted — same as History would show).
  h.run.flushSuccess({ notes: [
    noteFixture({ noteId: 'n2', issue: 'second call' }),
    noteFixture({ noteId: 'n1', issue: 'first call' }),
  ], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');

  const stack = h.$('#cn-stack').innerHTML;
  assert.ok(/first call/.test(stack) && /second call/.test(stack), 'both notes re-render after nav-back');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 2, 'rolling stack repopulated from the server');
});

test('cross-context staleness: a note added elsewhere is absent until Log re-fetches (motivates #3 live-refresh)', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', issue: 'mine' })]);
  // Another browser context (pop-out) logs a note to the same Sheet — THIS
  // context's in-memory stack does not change without a re-fetch.
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 1, 'no live sync: stack unchanged while sitting on Log');
  // A re-enter (the only refresh trigger today) would pick it up — proving the
  // fix surface for #3 is "refresh the stack without a manual nav".
  h.read('currentView = "clock"');
  h.window.enterTool('callNotes');
  h.run.flushSuccess({ notes: [
    noteFixture({ noteId: 'n2', issue: 'from pop-out' }),
    noteFixture({ noteId: 'n1', issue: 'mine' }),
  ], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  assert.ok(/from pop-out/.test(h.$('#cn-stack').innerHTML), 're-fetch surfaces the other context\'s note');
});

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 — #2 caller-format helper + #3 live-refresh of the rolling stack
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — caller display format (#2)');

test('cnCallerDisplay_: bold name + (relation), suppressed for self/blank; XSS-escaped', () => {
  const h = boot();
  const f = h.window.cnCallerDisplay_;
  assert.ok(/\(spouse\)/.test(f({ caller: 'Bob', relationship: 'spouse' })), 'relation shown in parens');
  assert.ok(/Bob/.test(f({ caller: 'Bob', relationship: 'spouse' })), 'caller name present');
  assert.strictEqual(/\(/.test(f({ caller: 'Bob', relationship: 'self' })), false, 'self relation suppressed');
  assert.strictEqual(/\(/.test(f({ caller: 'Bob', relationship: 'SELF' })), false, 'self is case-insensitive');
  assert.strictEqual(/\(/.test(f({ caller: 'Bob', relationship: '' })), false, 'blank relation suppressed');
  assert.ok(/TRX123/.test(f({ caller: '', patientAndTrx: 'TRX123' })), 'falls back to patient/TRX');
  assert.ok(/unnamed/.test(f({})), 'falls back to unnamed');
  assert.ok(f({ caller: '<img src=x>' }).indexOf('<img src=x>') === -1, 'caller HTML-escaped (no raw tag)');
});

section('DOM harness — rolling-stack live refresh (#3)');

test('cnRefreshRollingStack_ re-fetches + surfaces another context\'s note WITHOUT a manual nav', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', issue: 'mine' })]);
  h.window.cnRefreshRollingStack_();                       // ambient/focus trigger
  assert.strictEqual(h.run.pending('getMyCallNotes').length, 1, 'live refresh fired a fetch');
  h.run.flushSuccess({ notes: [
    noteFixture({ noteId: 'n2', issue: 'from pop-out' }),
    noteFixture({ noteId: 'n1', issue: 'mine' }),
  ], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  assert.ok(/from pop-out/.test(h.$('#cn-stack').innerHTML), 'other context\'s note now visible without re-entering Log');
});

test('live refresh PRESERVES an in-flight optimistic note (not yet on the server)', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', issue: 'mine' })]);
  h.setField('cn-fld-issue', 'still saving');
  h.window.cnSubmitActiveForm_();                          // optimistic pending note; submitCallNote queued (unflushed)
  h.window.cnRefreshRollingStack_();
  h.run.flushSuccess({ notes: [noteFixture({ noteId: 'n1', issue: 'mine' })], autoCopyFormat: '', timezone: 'Asia/Kolkata' }, 'getMyCallNotes');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 2, 'pending note kept alongside the server set');
  assert.strictEqual(h.read('CN_STATE.rollingNotes[0]._pending'), true, 'pending note stays on top');
});

test('live refresh is skipped during an open inline edit (no clobber)', () => {
  const h = bootLog([noteFixture({ noteId: 'n1', issue: 'mine' })]);
  h.read('CN_STATE.editingNoteId = "n1"');
  h.window.cnRefreshRollingStack_();
  assert.strictEqual(h.run.pending('getMyCallNotes').length, 0, 'no fetch while editing');
});

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4c — Metrics My Stats own-vs-team trend section (#5/#6 client render)
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — Metrics own-vs-team trend (#5/#6)');

test('mRenderTrendSection_: 5 KPI cards, dual lines, cohort note; suppressed team reads "—"/last-non-null', () => {
  const h = boot();
  const data = { kpiMinCohort: 3, series: {
    pctAnswered: [{ date: '2026-05-14', own: 80, team: 84, cohort: 4 }, { date: '2026-05-15', own: 88, team: null, cohort: 2 }],
    answered:    [{ date: '2026-05-14', own: 8, team: 7, cohort: 4 }, { date: '2026-05-15', own: 9, team: 8, cohort: 3 }],
    missed:      [{ date: '2026-05-14', own: 2, team: 1, cohort: 4 }, { date: '2026-05-15', own: 1, team: 1, cohort: 3 }],
    attSeconds:  [{ date: '2026-05-14', own: 150, team: 140, cohort: 4 }, { date: '2026-05-15', own: 160, team: null, cohort: 2 }],
    transferPct: [{ date: '2026-05-14', own: 29.8, team: 25, cohort: 4 }, { date: '2026-05-15', own: 30, team: 26, cohort: 3 }],
  } };
  const html = h.window.mRenderTrendSection_(data);
  assert.ok(/Trends · you vs team avg/.test(html), 'section header');
  assert.ok(/% Answered/.test(html) && /Avg Talk/.test(html) && /Transfer %/.test(html), 'KPI cards rendered');
  assert.ok(/fewer than 3 reporting reps/.test(html), 'cohort/anonymity note present');
  assert.ok(/own-line/.test(html) && /team-line/.test(html), 'own + team lines drawn');
  assert.ok(/2:40/.test(html), 'avg talk own formatted m:ss (160s)');
  assert.ok(/team 2:20/.test(html), 'team avg talk falls back to the last non-null day (140s)');
});

test('mRenderTrendSection_ degrades to empty when series is absent (old server)', () => {
  const h = boot();
  assert.strictEqual(h.window.mRenderTrendSection_({}), '', 'no series → no section');
});


