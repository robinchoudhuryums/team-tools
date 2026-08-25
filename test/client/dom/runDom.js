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

test('blue-green: the DEV banner renders only when instanceLabel is set', () => {
  const prod = boot();
  prod.bootShell();                                   // default fixture — no instanceLabel
  assert.ok(!prod.$('.instance-banner'), 'no banner on prod (instanceLabel unset)');

  const dev = boot();
  dev.bootShell({ instanceLabel: 'DEV' });
  const banner = dev.$('.instance-banner');
  assert.ok(banner, 'a labeled dev instance renders the banner');
  assert.ok(/DEV/.test(banner.textContent), 'the banner shows the instance label');
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

test('overlay focus lifecycle: focus moves in on open, restores on close (batch H)', () => {
  const h = boot();
  const doc = h.window.document;
  const trigger = doc.createElement('button');
  trigger.id = 'trg';
  doc.body.appendChild(trigger);
  trigger.focus();
  assert.strictEqual(doc.activeElement, trigger, 'trigger focused pre-open');
  const el = h.window.ensureOverlay('ov-f', { onClose: () => { el.classList.remove('open'); } });
  el.innerHTML = '<div class="modal"><button id="in-dlg">ok</button></div>';
  h.flushTimers();  // fire the deferred focus-into
  assert.strictEqual(doc.activeElement && doc.activeElement.id, 'in-dlg', 'focus moved into the dialog');
  h.window.closeOverlay(el);
  assert.strictEqual(doc.activeElement, trigger, 'focus restored to the trigger on close');
  trigger.remove();
});

test('closeOverlay does NOT restore focus when the hook refuses to close (INV-145 class)', () => {
  const h = boot();
  const doc = h.window.document;
  const trigger = doc.createElement('button');
  doc.body.appendChild(trigger);
  trigger.focus();
  const el = h.window.ensureOverlay('ov-g', { onClose: () => { /* refuses: stays open */ } });
  el.innerHTML = '<div class="modal"><button id="in-g">ok</button></div>';
  h.flushTimers();
  h.window.closeOverlay(el);
  assert.ok(el.classList.contains('open'), 'overlay stayed open (hook refused)');
  assert.notStrictEqual(doc.activeElement, trigger, 'focus NOT yanked back while the overlay is still up');
  trigger.remove();
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

test('stacked uiConfirms: one Escape resolves ONLY the topmost (INV-83, M-10 pin)', async () => {
  // Cycle-8 fix, unpinned until now: each dialog's document-level CAPTURE
  // keydown acts only when its own overlay is the topmost .ui-dialog and
  // handles via stopImmediatePropagation — plain stopPropagation can't stop
  // same-node-same-phase siblings, so one Escape used to resolve BOTH stacked
  // dialogs (the bottom one with false, cancelling its flow).
  const h = boot();
  const s1 = settle(h.window.uiConfirm({ title: 'bottom' }));
  const s2 = settle(h.window.uiConfirm({ title: 'top' }));
  h.dispatchKey('Escape');
  await tick();
  assert.strictEqual(s2.value, false, 'topmost dialog resolved false');
  assert.strictEqual(s1.done, false, 'bottom dialog NOT resolved by the same Escape');
  assert.ok(h.$('.ui-dialog'), 'bottom dialog still open');
  h.dispatchKey('Escape');
  await tick();
  assert.strictEqual(s1.value, false, 'second Escape resolves the bottom dialog');
});

test('Enter aimed inside #kb-drawer does NOT confirm an open dialog (INV-83 L-32, M-10 pin)', async () => {
  // The drawer is exempt from the dialog focus trap (z-55, above the dialog)
  // and Ctrl/⌘+K opens it while a dialog is up — an Enter aimed at the
  // drawer's search box used to confirm a danger dialog it never targeted.
  const h = boot();
  h.window.kbDrawerToggle_();
  const s = settle(h.window.uiConfirm({ title: 'Delete?', tone: 'danger' }));
  const q = h.$('#kbd-q');
  assert.ok(q, 'drawer search box present');
  h.dispatchKey('Enter', { target: q });
  await tick();
  assert.strictEqual(s.done, false, 'drawer-targeted Enter did NOT resolve the dialog');
  h.dispatchKey('Enter');
  await tick();
  assert.strictEqual(s.value, true, 'a plain Enter still confirms the dialog');
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

// Cycle 9 · M-4 — a STRUCTURED {success:false} (enrollment/validation error)
// on a Save & Compose flow hit the success handler's error branch, which —
// unlike the withFailureHandler throw path — never cleared CN_STATE.composeFlow
// nor tore down the envelope overlay: every later submit was refused with
// "Still saving this note…" until the rep Esc'd the stuck envelope (which then
// ran a misleading rollback). Pin the teardown parity.
test('C9 M-4: structured {success:false} on Save & Compose clears composeFlow — next submit is not wedged', () => {
  const h = bootLog();
  h.setField('cn-fld-issue', 'Compose me');
  h.window.cnSubmitActiveForm_({ keepForm: true });
  assert.ok(h.read('CN_STATE.composeFlow'), 'compose flow armed (transactional save)');
  h.run.flushSuccess({ success: false, error: 'Your call-notes Sheet is not configured' }, 'submitCallNote');
  assert.strictEqual(h.read('CN_STATE.composeFlow'), null, 'composeFlow cleared on structured failure');
  assert.strictEqual(h.read('CN_STATE.rollingNotes.length'), 0, 'pending card removed');
  assert.strictEqual(h.read("cnGetFieldValue_('cn-fld-issue')").trim(), 'Compose me', 'keepForm text still in the form');
  h.window.cnSubmitActiveForm_();
  assert.strictEqual(h.run.pending('submitCallNote').length, 1, 'follow-up submit fires — the re-entry guard no longer wedges');
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

// ── Cycle-14 Phase 2 — sub-queue disclosure + scope switch ──────────────────
// The static visual harness cannot CLICK, so the two interactive halves of
// Phase 2 are verified here in a real DOM instead of left unchecked.
test('Phase 2: the transfers disclosure reveals its detail row and updates aria-expanded', () => {
  const h = boot();
  const w = h.window;
  const rep = { repId: 'E-1042', repName: 'Avery Blake', totalRung: 46, totalAnswered: 41,
    totalMissed: 5, pctAnswered: 89.1, attFormatted: '0:04:41', attSeconds: 281,
    noteCount: 35, noteCoverage: 85, noteCountUnavailable: false,
    transferred: 14, queues: { A_Q_Sales: 6, A_Q_Billing: 3 }, queueTotal: 9, queueUnattributed: 5 };
  const html = w.mtRenderTable_({
    rows: [rep],
    columns: [{ key: 'repName', label: 'Rep', name: true, cell: function (r) { return w.esc(r.repName); } },
      { key: 'transferred', label: 'Transfers', numeric: true, cell: function (r) {
          const rid = 'm-q-' + r.repId;
          return '<button type="button" class="m-qtoggle" aria-expanded="false" aria-controls="' + rid +
            '" onclick="mToggleQueueRow_(this)">' + w.esc(r.transferred) + '</button>'; } }],
    rowId: function (r) { return 'm-q-' + r.repId; },
    detailRow: function (r) { return w.mQueueDetailHtml_(r); },
  });
  const host = w.document.createElement('div');
  host.innerHTML = html;
  w.document.body.appendChild(host);

  const row = w.document.getElementById('m-q-E-1042');
  const btn = host.querySelector('.m-qtoggle');
  assert.ok(row, 'the detail row is emitted with the id the button controls');
  assert.strictEqual(row.hasAttribute('hidden'), true, 'collapsed by default');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'false', 'button starts collapsed');
  // The detail must carry the INV-180 fraction, not just the queue rows.
  assert.ok(/9 of 14 transfers attributed/.test(row.textContent), 'the attributed fraction is in the DOM');

  w.mToggleQueueRow_(btn);
  assert.strictEqual(row.hasAttribute('hidden'), false, 'expands');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'true', 'aria-expanded follows the visual state');
  w.mToggleQueueRow_(btn);
  assert.strictEqual(row.hasAttribute('hidden'), true, 'collapses again');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'false', 'and the attribute follows back');
});

test('Phase 4: the by-department mode folds queues and keeps Ungrouped visible', () => {
  const h = boot();
  const w = h.window;
  const groupRows = [
    { group: 'Sales', transferred: 75, reps: 5,
      queues: [{ queue: 'A_Q_Sales', transferred: 40, reps: 5 }, { queue: 'A_Q_PAP', transferred: 35, reps: 3 }] },
    { group: 'Ungrouped', transferred: 900, reps: 9,
      queues: [{ queue: 'A_Q_Legacy_Unmapped', transferred: 900, reps: 9 }] },
  ];
  const html = w.mtRenderTable_({
    rows: groupRows,
    columns: [{ key: 'group', label: 'Department', name: true, cell: function (g) {
        const gid = 'm-g-' + String(g.group).replace(/[^\w.$-]/g, '');
        return '<button type="button" class="m-qtoggle" aria-expanded="false" aria-controls="' + gid +
          '" onclick="mToggleQueueRow_(this)">' + w.esc(g.group) + '</button>'; } },
      { key: 'transferred', label: 'Transferred', numeric: true, cell: function (g) { return w.esc(g.transferred); } }],
    rowId: function (g) { return 'm-g-' + String(g.group); },
    detailRow: function (g) { return w.mGroupDetailHtml_(g); },
  });
  const host = w.document.createElement('div');
  host.innerHTML = html;
  w.document.body.appendChild(host);

  // The member queues are in the DOM, collapsed, and expand on the same
  // machinery as the per-rep split.
  const row = w.document.getElementById('m-g-Sales');
  assert.ok(row, 'the Sales detail row exists');
  assert.strictEqual(row.hasAttribute('hidden'), true, 'collapsed by default');
  assert.ok(/A_Q_Sales/.test(row.textContent) && /A_Q_PAP/.test(row.textContent),
    'member queues are listed in the disclosure');
  assert.ok(/2 queue\(s\) in this group/.test(row.textContent), 'the member count is stated');
  const btn = host.querySelector('.m-qtoggle');
  w.mToggleQueueRow_(btn);
  assert.strictEqual(row.hasAttribute('hidden'), false, 'expands');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'true', 'aria follows');

  // An unmapped queue must remain nameable in the UI, not silently absorbed.
  const ung = w.document.getElementById('m-g-Ungrouped');
  assert.ok(ung && /A_Q_Legacy_Unmapped/.test(ung.textContent),
    'the Ungrouped bucket names the queues that need mapping');
});

test('Phase 2: the scope switch re-renders and survives a missing dataset', () => {
  const h = boot();
  const w = h.window;
  // No teamData cached — the switch must not throw (it fires before any load
  // on a fast double-click).
  w.mQueueScope_('queue');
  assert.strictEqual(w.M_STATE.teamScope, 'queue', 'scope recorded without data present');
  w.mQueueScope_('combined');
  assert.strictEqual(w.M_STATE.teamScope, 'combined', 'toggles back');
  // Anything not 'queue' normalises to combined — a stray value cannot wedge
  // the view into a mode with no renderer.
  w.mQueueScope_('nonsense');
  assert.strictEqual(w.M_STATE.teamScope, 'combined', 'unknown scope falls back to combined');
});

test('mRenderTrendSection_ degrades to empty when series is absent (old server)', () => {
  const h = boot();
  assert.strictEqual(h.window.mRenderTrendSection_({}), '', 'no series → no section');
});



// ═════════════════════════════════════════════════════════════════════════════
// PORTED from the (now-removed) run-dom.js harness on harness consolidation —
// escape-discipline render tests + intake/training opportunistic coverage +
// onboarding-tour gates. Re-expressed on boot(): all partials load, render fns
// are window globals, INTAKE_STATE is a var global, and a target container is
// mounted per test.
// ═════════════════════════════════════════════════════════════════════════════
const XSS = '<img src=x onerror=alert(1)><script>alert(2)<\/script>';
function mount_(h, id) { const d = h.document.createElement('div'); d.id = id; h.document.body.appendChild(d); return d; }
function fullTeamData_(over) {
  return Object.assign({
    from: '2026-06-15', to: '2026-06-15', date: '2026-06-15',
    teamTotals: { pctAnswered: 50, rung: 2, answered: 1, missed: 1, tttFormatted: '0:00:20', noteCount: 1, noteCoverage: 100 },
    reps: [], trend: null, unmatchedAgents: [], rosterWithNoCdr: [],
  }, over || {});
}

section('DOM harness — escape discipline (render with hostile input)');

test('mRenderTeamMetrics_: hostile repName + CDR agent name render escaped (F2)', () => {
  const h = boot(); mount_(h, 'm-team-content');
  h.window.mRenderTeamMetrics_(fullTeamData_({
    reps: [{ repName: XSS, totalRung: 1, totalAnswered: 1, totalMissed: 0, pctAnswered: 100, attFormatted: '0:00:10', noteCount: 1, noteCoverage: 100 }],
    unmatchedAgents: [XSS],
  }));
  const el = h.$('#m-team-content');
  assert.strictEqual(el.querySelectorAll('script,img').length, 0, 'no live node from repName / agent name');
  assert.ok(el.textContent.indexOf('onerror') >= 0, 'hostile strings survive as inert text');
});

test('mRenderMyStats_: hostile server error string renders escaped', () => {
  const h = boot(); mount_(h, 'm-my-content');
  h.window.mRenderMyStats_({ error: XSS });
  const el = h.$('#m-my-content');
  assert.strictEqual(el.querySelectorAll('script,img').length, 0, 'no live node from data.error');
  assert.ok(el.textContent.indexOf('onerror') >= 0);
});

test('cnRenderCardCore_: hostile note fields render escaped (INV-89 card class)', () => {
  const h = boot(); const area = mount_(h, 'view-area');
  area.innerHTML = h.window.cnRenderCardCore_({
    noteId: 'n1', timestamp: '2026-06-15T10:00:00', dateLocal: '2026-06-15',
    callback: '', caller: XSS, relationship: '', patientAndTrx: '"><script>x<\/script>',
    issue: XSS, transferredTo: '', resolution: '', flagType: '', resolved: false,
    emailedAt: '', emailDepartments: '', subform: '', subformData: {},
  }, false);
  assert.strictEqual(area.querySelectorAll('script,img').length, 0, 'no live node from note fields');
  assert.ok(area.textContent.indexOf('onerror') >= 0, 'hostile caller/issue survives as inert text');
});

section('DOM harness — opportunistic coverage (intake / training)');

test('F3: intakeClearForm_ nulls INTAKE_STATE.preview (drops cached patient PHI)', () => {
  const h = boot(); mount_(h, 'view-area');
  h.window.INTAKE_STATE.preview = { formType: 'PPD', payload: { patientInfo: 'Jane PHI', answers: { 38: '250' } }, bodyHash: 'abc' };
  h.window.intakeClearForm_('ppd');
  assert.strictEqual(h.window.INTAKE_STATE.preview, null, 'cached preview (patient answers) cleared on form clear');
});

test('intakeRenderSentList_: hostile patientInfo renders escaped (INV-89/116)', () => {
  const h = boot(); const area = mount_(h, 'view-area');
  area.innerHTML = h.window.intakeRenderSentList_(
    [{ formType: 'PPD', patientInfo: XSS, timestamp: '2026-06-15', recipient: 'x@y.com', repName: 'r' }], true);
  assert.strictEqual(area.querySelectorAll('script,img').length, 0, 'no live node from a Sent-list patient label');
  assert.ok(area.textContent.indexOf('onerror') >= 0, 'hostile patientInfo survives as inert text');
});

test('trainRenderReader_: hostile embed title renders escaped (no live node)', () => {
  const h = boot(); mount_(h, 'train-reader-overlay');
  h.window.trainRenderReader_({ id: 'i1', type: 'embed', title: XSS,
    embedUrl: 'https://docs.google.com/document/d/x/preview', openUrl: 'https://docs.google.com/document/d/x/edit' });
  const ov = h.$('#train-reader-overlay');
  assert.strictEqual(ov.querySelectorAll('script').length, 0, 'no <script> from the embed title');
  assert.strictEqual(ov.querySelectorAll('img').length, 0, 'hostile title did not create an <img>');
  assert.strictEqual(ov.querySelectorAll('iframe').length, 1, 'the intended embed iframe is present');
  assert.ok(ov.textContent.indexOf('onerror') >= 0, 'hostile title survives as inert text');
});

section('DOM harness — onboarding tour (script_tour)');

test('T-1: tourEnsureNodes_ is idempotent — no duplicate nodes on re-entry', () => {
  const h = boot();
  h.window.tourEnsureNodes_();
  h.window.tourEnsureNodes_();
  assert.strictEqual(h.$$('#tour-block').length, 1, 'guard prevents a duplicate tour-block');
});

test('T-2: auto-start is SUPPRESSED on a deep-link landing (?tool=…)', () => {
  const h = boot({ serverQueryParams: { tool: 'callNotes' } });
  let scheduled = 0;
  h.window.setTimeout = function () { scheduled++; return 0; };
  h.window.localStorage.removeItem('umsTour');
  h.window.tourMaybeAutoStart_();
  assert.strictEqual(scheduled, 0, 'deep-link landing suppresses the auto-start');
});

test('T-2 contrast: no deep-link + unseen → auto-start IS scheduled', () => {
  const h = boot({ serverQueryParams: {} });
  let scheduled = 0;
  h.window.setTimeout = function () { scheduled++; return 0; };
  h.window.localStorage.removeItem('umsTour');
  h.window.tourMaybeAutoStart_();
  assert.strictEqual(scheduled, 1, 'no deep-link → auto-start scheduled');
});

// ═════════════════════════════════════════════════════════════════════════════
// CYCLE 7 · Turn 1+2 fixes — punch failure feedback, intake draft lifecycle,
// search stale-guard trim parity.
// ═════════════════════════════════════════════════════════════════════════════
section('DOM harness — cycle 7 fixes (punch failure / intake draft / search guard)');

test('M-1: submitPunch failure restores the clicked button + does not throw', () => {
  const h = boot();
  const wrap = h.document.createElement('div');
  wrap.className = 'actions';
  wrap.innerHTML = '<button class="prime" data-action="ClockIn">Clock In</button>';
  h.document.body.appendChild(wrap);
  h.window.submitPunch('ClockIn');
  const btn = h.$('.actions [data-action="ClockIn"]');
  assert.ok(/Working/.test(btn.innerHTML), 'in-flight label shown');
  // Pre-fix: the failure handler read the undeclared `prime`/`primeHtml`
  // (pre-F3 names) — the ReferenceError propagated here, no toast fired, and
  // the button stayed stuck on "Working…".
  h.run.flushFailure('network down', 'recordPunch');
  assert.strictEqual(btn.innerHTML, 'Clock In', 'button restored after a transport failure');
  assert.strictEqual(btn.disabled, false, 'buttons re-enabled');
});

test('M-2: a debounced intake draft save firing after view teardown does NOT wipe the draft', () => {
  const h = boot();
  const good = { ppd: { answers: { '38': '250', '43': 'MS' }, patientInfo: 'Jane Doe TRX1', at: Date.now() } };
  h.window.localStorage.setItem('umsIntakeDrafts', JSON.stringify(good));
  // No #intk-ppd-form anywhere — the rep typed, then navigated within 400ms.
  h.window.intakeSaveDraft_('ppd');
  h.flushTimers();   // pre-fix: collected an all-empty snapshot and overwrote the draft
  const after = JSON.parse(h.window.localStorage.getItem('umsIntakeDrafts'));
  assert.strictEqual(after.ppd.answers['38'], '250', 'answers survive a post-teardown debounce fire');
  assert.strictEqual(after.ppd.patientInfo, 'Jane Doe TRX1', 'patient info survives');
});

test('M-2: intakeFlushDraftNow_ captures a pending save synchronously while the DOM is intact (+ L-15 untouched toggle reads as empty)', () => {
  const h = boot();
  const form = h.document.createElement('div');
  form.id = 'intk-pmd-form';
  form.innerHTML = '<input data-intk-idx="1" value="Jane Doe">' +
    '<div class="intk-yn" data-idx="22" data-val="">' +
    '<button data-set="TRUE">Yes</button><button data-set="FALSE">No</button></div>';
  h.document.body.appendChild(form);
  h.window.localStorage.removeItem('umsIntakeDrafts');
  h.window.intakeSaveDraft_('pmd');    // debounce armed, not yet fired
  h.window.intakeFlushDraftNow_();     // the showView navigation flush
  const draft = JSON.parse(h.window.localStorage.getItem('umsIntakeDrafts') || '{}');
  assert.ok(draft.pmd, 'pending draft flushed synchronously on navigation');
  assert.strictEqual(draft.pmd.answers['1'], 'Jane Doe', 'typed value captured');
  // L-15: an UNTOUCHED .intk-yn toggle serializes as '' (was 'FALSE'), so a
  // restore can no longer fabricate a deliberately-lit "No".
  assert.strictEqual(draft.pmd.answers['22'], '', 'untouched toggle stays unanswered');
});

test('M-9: composer refuses to close while a send is in flight, closes once settled', () => {
  const h = boot();
  h.read('CN_STATE.composer = { noteId: "n1", selections: { departments: [] }, sending: true, step: "preview" }');
  h.window.ensureOverlay('cn-compose-overlay', { onClose: h.window.cnCloseComposerModal_ });
  h.window.closeOverlay(h.$('#cn-compose-overlay'));   // the Esc / backdrop-click path
  assert.ok(h.$('#cn-compose-overlay'), 'overlay still mounted mid-send (no rollback fired)');
  assert.ok(h.read('CN_STATE.composer') !== null, 'composer state intact mid-send');
  h.read('CN_STATE.composer.sending = false');
  h.window.closeOverlay(h.$('#cn-compose-overlay'));
  assert.strictEqual(h.$('#cn-compose-overlay'), null, 'closes normally once the send settled');
  assert.strictEqual(h.read('CN_STATE.composer'), null, 'composer state cleared on the real close');
});

test('composer: the editable Note Reference commits through updateCallNote and repaints IN PLACE', () => {
  const h = boot();
  const NOTE = {
    noteId: 'n-edit', callback: '(555) 111-2222', caller: 'Maria Lopez', relationship: 'Patient',
    patientAndTrx: 'TRX-100 · P. Sample', issue: 'Asking about **resupply** timing',
    transferredTo: '', resolution: 'Confirmed ship date', flagType: '', resolved: false,
    subformData: { departments: [], flags: [], tags: [] },
  };
  h.read('CN_STATE.rollingNotes = ' + JSON.stringify([NOTE]));
  h.window.cnOpenEmailComposer_('n-edit');

  const val = (k) => h.$('#cnC-nr-' + k).textContent;
  assert.strictEqual(val('patientAndTrx'), 'TRX-100 · P. Sample', 'fields seed from the note');
  // The marker survives editing because the editable row shows RAW text — the
  // formatter is a render step, and a <strong> round-trip would save as markup.
  assert.strictEqual(val('issue'), 'Asking about **resupply** timing', 'Issue shows raw marker text');
  assert.ok(h.$('#cnC-nr-transferredTo').classList.contains('empty'),
    'a BLANK field still renders (the old read-only list omitted it, so it could never be filled)');
  assert.strictEqual(h.$('#cnC-nr-dirty').innerHTML, '', 'nothing dirty on open');

  // Edit two fields — the dirty bar + per-field marks repaint without a
  // re-render (a re-render would drop the caret mid-word).
  const trx = h.$('#cnC-nr-patientAndTrx');
  trx.textContent = 'TRX-999 · P. Corrected';
  h.window.cnComposerNoteEdited_(trx);
  const tt = h.$('#cnC-nr-transferredTo');
  tt.textContent = 'Billing';
  h.window.cnComposerNoteEdited_(tt);
  assert.ok(/2 unsaved changes/.test(h.$('#cnC-nr-dirty').textContent), 'the dirty count is per FIELD');
  assert.ok(h.$('#cnC-nr-save'), 'an explicit Save appears (edit without previewing)');
  assert.strictEqual(h.document.querySelectorAll('.cn-nr-row .ce.is-changed').length, 2, 'only the changed fields are marked');
  assert.ok(!tt.classList.contains('empty'), 'a filled field drops its placeholder state');
  assert.strictEqual(trx.textContent, 'TRX-999 · P. Corrected', 'the repaint never rewrites the field being typed in');

  h.window.cnComposerSaveNoteEdits_();
  const call = h.run.pending('updateCallNote')[0];
  assert.ok(call, 'commits through updateCallNote — the card editor’s own endpoint');
  assert.strictEqual(call.args[0], 'n-edit', 'scoped to this note');
  assert.strictEqual(call.args[1].patientAndTrx, 'TRX-999 · P. Corrected', 'the edit rides the payload');
  assert.strictEqual(call.args[1].issue, 'Asking about **resupply** timing', 'and an UNTOUCHED field is sent verbatim, markers intact');

  const saved = Object.assign({}, NOTE, { patientAndTrx: 'TRX-999 · P. Corrected', transferredTo: 'Billing' });
  h.run.flushSuccess({ success: true, note: saved }, 'updateCallNote');
  assert.strictEqual(h.read('CN_STATE.rollingNotes[0].patientAndTrx'), 'TRX-999 · P. Corrected', 'the cached note is replaced');
  assert.strictEqual(h.read('CN_STATE.composer.note.patientAndTrx'), 'TRX-999 · P. Corrected',
    'and the composer is RE-POINTED at the server copy — cnReplaceNoteInState_ swaps the array slot, so a held reference would go stale');
  assert.strictEqual(h.$('#cnC-nr-dirty').innerHTML, '', 'dirty cleared against the new baseline');
  assert.strictEqual(h.document.querySelectorAll('.cn-nr-row .ce.is-changed').length, 0, 'and the per-field marks with it');
  assert.ok(/TRX-999/.test(h.$('#cnC-sub').textContent), 'the header line the note feeds is refreshed too');
});

test('composer: Preview SAVES pending edits before rendering, and a failed save aborts the chain', () => {
  const h = boot();
  h.read('CN_STATE.rollingNotes = ' + JSON.stringify([{
    noteId: 'n-p', callback: '', caller: 'Ana', relationship: '', patientAndTrx: 'TRX-1',
    issue: 'x', transferredTo: '', resolution: 'y', flagType: '', resolved: false,
    subformData: { departments: [], flags: [], tags: [] },
  }]));
  h.read('CN_STATE.deptConfig = { departments: ["Billing"], suggestionsByDept: {}, defaultSuggestions: ["Verified Shipping"] }');
  h.window.cnOpenEmailComposer_('n-p');
  h.window.cnToggleComposerDept_('Billing');
  h.$('#cnC-update-info').value = 'Verified Shipping';
  h.window.cnComposerUpdateInfoChanged_();   // the oninput handler is what commits it to state
  const el = h.$('#cnC-nr-patientAndTrx');
  el.textContent = 'TRX-2';
  h.window.cnComposerNoteEdited_(el);

  h.window.cnComposerGoToPreview_();
  // The ORDER is the contract: previewing first would build the body — and the
  // INV-41 bodyHash the send is checked against — from the STALE stored note.
  assert.strictEqual(h.run.pending('previewCallNoteEmail').length, 0, 'no preview while the note edit is uncommitted');
  assert.strictEqual(h.run.pending('updateCallNote').length, 1, 'the save goes first');
  const btn = h.$('#cnC-preview-btn');
  assert.ok(/Saving note/.test(btn.textContent) && btn.disabled, 'the button reports the save phase');

  h.run.flushFailure(new Error('nope'), 'updateCallNote');
  assert.strictEqual(h.run.pending('previewCallNoteEmail').length, 0, 'a FAILED save never previews unsaved text');
  assert.ok(!h.$('#cnC-preview-btn').disabled, 'and the button is restored so the rep can retry');

  // Retry: this time the save lands, and only then does the preview fire.
  h.window.cnComposerGoToPreview_();
  h.run.flushSuccess({ success: true, note: Object.assign({}, h.read('CN_STATE.composer.note'), { patientAndTrx: 'TRX-2' }) }, 'updateCallNote');
  assert.strictEqual(h.run.pending('previewCallNoteEmail').length, 1, 'the preview runs once the note is committed');
  assert.ok(/Building preview/.test(h.$('#cnC-preview-btn').textContent), 'and the button reports the second phase');
});

test('M-8: a late Team Notes queue response cannot clobber the sub-tab opened after it', () => {
  const h = boot();
  const host = h.document.createElement('div');
  host.id = 'cn-mgr-results';
  h.document.body.appendChild(host);
  h.read('currentView = "callNotesManage"');
  h.window.cnMgrLoadQueue_('training');            // slow queue fetch in flight
  h.window.cnMgrLoadSearchView_();                 // manager switches to Search
  assert.ok(h.$('#cn-mgr-search-q'), 'search sub-tab rendered');
  h.run.flushSuccess({ results: [] }, 'managerGetTrainingQueue');   // late response lands
  assert.ok(h.$('#cn-mgr-search-q'), 'late training-queue response dropped — Search body survives');
});

test('F16: a failed retention-config load renders an error, not a silent blank', () => {
  const h = boot();
  const slot = h.document.createElement('div');
  slot.id = 'cn-admin-retention';
  h.document.body.appendChild(slot);
  h.read('currentView = "callNotesAdmin"');
  h.window.cnLoadRetentionPanel_();
  h.run.flushFailure(new Error('transport blew up'), 'getRetentionConfig');
  const html = h.$('#cn-admin-retention').innerHTML;
  assert.ok(html.trim() !== '', 'the slot is NOT blanked — a blank reads as "no retention panel in this deploy"');
  assert.ok(/role="alert"/.test(html), 'renders the shared error state');
  assert.ok(html.indexOf('transport blew up') >= 0, 'names the reason so the manager can act');
});

test('Turn A: a post-teardown CN draft-persist fire does NOT delete the sticky draft', () => {
  const h = boot();
  const good = JSON.stringify({ values: { issue: 'wheelchair repair' }, flags: [], tags: [], at: Date.now() });
  h.window.localStorage.setItem('umsCallNotesActiveFormDraft', good);
  // No #cn-active-form in the DOM — the rep typed, then navigated within 400ms.
  h.window.cnPersistActiveFormDraft_();   // pre-fix: all fields read '' → removeItem destroyed the draft
  assert.strictEqual(h.window.localStorage.getItem('umsCallNotesActiveFormDraft'), good,
    'sticky draft survives a debounce fire against a torn-down form');
});

test('M-5: search results are NOT dropped when the query carries trailing whitespace', () => {
  const h = boot();
  h.read('currentView = "callNotesSearch"');
  h.read('CN_STATE.searchQuery = "TRX441 "');   // raw input value, trailing space
  h.window.cnFireSearch_();
  h.run.flushSuccess({ results: [{ noteId: 'n1' }] }, 'searchMyCallNotes');
  assert.strictEqual(h.read('CN_STATE.searchResults.length'), 1,
    'trimmed-vs-raw stale-guard no longer discards the response');
});

section('Client error beacon (#1, INV-150) — window hooks, dedupe, session cap');

test('a window error posts ONE recordClientError with the bounded payload; repeats dedupe', () => {
  const h = boot();
  const beaconCalls = () => h.run.calls.filter((c) => c.method === 'recordClientError');
  const before = beaconCalls().length;   // boot noise, if any
  h.window.dispatchEvent(new h.window.ErrorEvent('error', {
    message: 'boom XYZ', error: new Error('boom XYZ'), filename: 'x.js', lineno: 7,
  }));
  const after1 = beaconCalls();
  assert.strictEqual(after1.length, before + 1, 'one beacon RPC fired');
  const payload = after1[after1.length - 1].args[0];
  assert.strictEqual(payload.message, 'boom XYZ');
  assert.strictEqual(payload.source, 'onerror');
  assert.strictEqual(Object.keys(payload).sort().join(','), 'message,source,stack,view',
    'payload shape is closed (PHI posture — no field-value slot)');
  h.window.dispatchEvent(new h.window.ErrorEvent('error', { message: 'boom XYZ' }));
  assert.strictEqual(beaconCalls().length, before + 1, 'identical message deduped');
});

test('unhandledrejection posts with its source tag; distinct errors cap at 5 per session', () => {
  const h = boot();
  const beaconCalls = () => h.run.calls.filter((c) => c.method === 'recordClientError');
  const before = beaconCalls().length;
  const rej = new h.window.Event('unhandledrejection');
  rej.reason = new Error('rejected ABC');
  h.window.dispatchEvent(rej);
  const calls1 = beaconCalls();
  assert.strictEqual(calls1.length, before + 1, 'rejection beacon fired');
  assert.strictEqual(calls1[calls1.length - 1].args[0].source, 'unhandledrejection');
  for (let i = 0; i < 10; i++) {
    h.window.dispatchEvent(new h.window.ErrorEvent('error', { message: 'distinct err ' + i }));
  }
  assert.ok(beaconCalls().length - before <= 5,
    'session cap (ERR_BEACON_MAX_PER_SESSION) holds — an error loop cannot flood the tab');
});

section("What's new panel (#4, INV-152) — overlay render, dismissal stamps seen");

test('whatsNewOpen_ renders the KB article via kbMd_ into an ensureOverlay modal', () => {
  const h = boot();
  h.window.WHATSNEW_STATE = {
    id: 'kb1', title: 'What\'s new <b>&</b>', bodyMd: '# July updates\n\nFaster **saves**.', stamp: 'S1',
  };
  h.window.whatsNewOpen_();
  const ov = h.$('#whatsnew-overlay');
  assert.ok(ov && /\bopen\b/.test(ov.className), 'overlay mounted + open');
  assert.ok(/July updates/.test(ov.innerHTML), 'kbMd_ rendered the article body');
  assert.ok(ov.innerHTML.indexOf('<b>&</b>') === -1 && /&lt;b&gt;/.test(ov.innerHTML),
    'title is esc()-escaped before innerHTML');
});

test('Escape dismisses through the close hook and stamps the seen-flag (no re-show)', () => {
  const h = boot();
  h.window.WHATSNEW_STATE = { id: 'kb1', title: 'T', bodyMd: 'hello', stamp: 'S2' };
  h.window.whatsNewOpen_();
  h.dispatchKey('Escape');
  const ov = h.$('#whatsnew-overlay');
  assert.ok(ov && !/\bopen\b/.test(ov.className), 'Escape closed the overlay via its hook');
  const stored = h.window.localStorage.getItem('umsWhatsNew');
  assert.ok(stored && JSON.parse(stored).seenStamp === 'S2', 'dismissal stamped seen');
  assert.strictEqual(h.window.whatsNewShouldShow_(stored, 'S2'), false, 'same stamp stays quiet');
  assert.strictEqual(h.window.whatsNewShouldShow_(stored, 'S3-edited'), true, 'an edit re-surfaces it');
});

// ═════════════════════════════════════════════════════════════════════════════
// Sticky reminder toasts (operator 2026-08-12). The source pin can assert the
// shape; only a real DOM can prove the LIFECYCLE — that a reminder is still on
// screen after the auto-dismiss window the rep missed, that clicking its × is
// the way out, and that the stack cap cannot silently evict it.
// ═════════════════════════════════════════════════════════════════════════════
section('Reminder toasts — sticky lifecycle (operator 2026-08-12)');

test('a reminder outlives the auto-dismiss window; a routine toast does not', () => {
  const h = boot();
  h.bootShell();
  h.window.showToast('Saved', 'toast-success');          // routine
  h.window.notifyRemind_('Break in 10 min', 'toast-warn'); // reminder
  assert.strictEqual(h.$$('#toast-stack .toast').length, 2, 'both rendered');
  h.flushTimers();   // run every pending setTimeout — i.e. past the 3.5s window
  // (jsdom never fires animationend, so removal is the CLASS, not the node.)
  const routine = h.$$('#toast-stack .toast:not(.toast-sticky)')[0];
  const remind = h.$('#toast-stack .toast-sticky');
  assert.ok(/toast-leave/.test(routine.className), 'the routine toast timed out');
  assert.ok(remind && !/toast-leave/.test(remind.className), 'the reminder did NOT');
  assert.ok(/Break in 10 min/.test(remind.textContent), 'with its message intact');
});

test('the × dismisses it, and the stack cap evicts routine toasts first', () => {
  const h = boot();
  h.bootShell();
  h.window.notifyRemind_('Your shift ended — clock out', 'toast-warn');
  // Five routine toasts AFTER it: the cap is 5, so something must go. The
  // reminder the rep has not read must not be what goes.
  for (let i = 0; i < 5; i++) h.window.showToast('Note ' + i, 'toast-info');
  const stack = h.$('#toast-stack');
  assert.ok(stack.children.length <= 5, 'the cap is still a real bound');
  assert.strictEqual(h.$$('#toast-stack .toast-sticky').length, 1, 'the reminder survived the eviction');
  const x = h.$('#toast-stack .toast-sticky .toast-x');
  assert.ok(x && x.tagName === 'BUTTON' && x.getAttribute('aria-label'),
    'a real, named button is the way out (INV-173)');
  x.dispatchEvent(new h.window.Event('click', { bubbles: true }));
  assert.ok(/toast-leave/.test(h.$('#toast-stack .toast-sticky').className),
    'clicking it starts the same leave animation a timed-out toast uses');
});

// ═════════════════════════════════════════════════════════════════════════════
// KB interactive blocks — the fence-source round-trip (F1 / INV-193).
//
// WHY THESE LIVE HERE AND NOT IN run.js: the defect is a property of the DOM,
// not of the string. kbMd_ escapes `<` before a fence is captured, so the FIRST
// render is inert and every pure pin over it passes. But the source is stashed
// in `data-src`, and an attribute DECODES on read — so the SECOND render (a
// mode switch, Expand, a decision answer) parsed `<img src=x onerror=…>` and
// put a live element into the article. The pure harness cannot see it: it has
// no HTML parser, so it can never perform the decode that causes the bug, and
// run.js:7790 pinned the vulnerable line as the CORRECT shape.
//
// The rule this encodes: a component that reads its own state back out of the
// DOM gets a DOM test, not a string test.
// ═════════════════════════════════════════════════════════════════════════════
section('KB blocks — fence source survives the DOM round-trip');

/** Render an article body through the real kbMd_ into a mounted .kb-article. */
function mountArticle(h, body) {
  const host = h.window.document.createElement('div');
  host.className = 'kb-article';
  host.innerHTML = h.window.kbMd_(body);
  h.window.document.body.appendChild(host);
  return host;
}

test('a roster fence cannot inject a live element on ANY view switch', () => {
  const h = boot();
  const host = mountArticle(h, [
    '```roster',
    'dept| Ops — Owner',
    'flow| Ops -> Ops',
    'team| Ops > Sub: <img src=x onerror="window.__PWNED__=1"> (C)',
    '```',
  ].join('\n'));
  const root = host.querySelector('.kb-roster');
  assert.ok(root, 'the block rendered');
  assert.strictEqual(host.querySelectorAll('img').length, 0, 'the first render is inert');
  // Every mode re-renders the body from the stored source.
  ['capabilities', 'chart', 'flow', 'coverage', 'teams'].forEach((mode) => {
    const btn = root.querySelector('.kb-ros-mode[data-mode="' + mode + '"]');
    if (!btn) return;
    h.window.kbRosterSetMode_(btn);
    assert.strictEqual(root.querySelectorAll('img').length, 0,
      'no live element after switching to ' + mode);
  });
  // Expand builds a whole fresh instance from the same source.
  const exp = root.querySelector('.kb-ros-expand');
  if (exp) {
    h.window.kbRosterExpand_(exp);
    const ov = h.window.document.getElementById('kb-roster-overlay');
    assert.ok(ov, 'the expand overlay mounted');
    assert.strictEqual(ov.querySelectorAll('img').length, 0, 'and it is inert too');
  }
  assert.strictEqual(h.window.__PWNED__, undefined, 'nothing executed');
});

test('the person panel renders parsed source, not decoded source', () => {
  const h = boot();
  const host = mountArticle(h, [
    '```roster', 'dept| Ops — Owner',
    'team| Ops: <img src=x onerror="window.__PWNED2__=1">',
    '```',
  ].join('\n'));
  const root = host.querySelector('.kb-roster');
  const btn = root.querySelector('.kb-ros-name');
  assert.ok(btn, 'the person button rendered');
  h.window.kbRosterOpenPerson_(btn);
  assert.strictEqual(root.querySelectorAll('img').length, 0,
    'the detail panel injects the ESCAPED name');
  assert.strictEqual(h.window.__PWNED2__, undefined, 'nothing executed');
});

test('a decision fence cannot inject a live element when an answer is picked', () => {
  const h = boot();
  const host = mountArticle(h, [
    '```decision',
    'ask| a: <img src=y onerror="window.__PWNED3__=1">?',
    'opt| a: Yes -> b',
    'do| b: <img src=z onerror="window.__PWNED3__=1">',
    '```',
  ].join('\n'));
  assert.strictEqual(host.querySelectorAll('img').length, 0, 'the first render is inert');
  // Call the handler directly: jsdom under runScripts:'outside-only' does not
  // compile inline onclick attributes, so dispatching a click here would be a
  // no-op and the assertion below would pass vacuously.
  h.window.kbDecideChoose_(host.querySelector('.kb-dec-opt'));
  assert.strictEqual(h.window.document.querySelectorAll('.kb-decision img').length, 0,
    'and so is the answer it walks to');
  assert.strictEqual(h.window.__PWNED3__, undefined, 'nothing executed');
});

test('re-escaping the source does not break matching on & < > values', () => {
  const h = boot();
  // A decision option label with an ampersand — the escaped source says
  // `PT &amp; OT` while data-opt decodes to `PT & OT`; both sides must land on
  // the same string or the guide dead-ends.
  let host = mountArticle(h, [
    '```decision', 'ask| q1: Which eval?', 'opt| q1: PT & OT -> q2',
    'ask| q2: Which site?', 'opt| q2: North -> a1', 'do| a1: Schedule it', '```',
  ].join('\n'));
  h.window.kbDecideChoose_(host.querySelector('.kb-dec-opt'));
  let dec = h.window.document.querySelector('.kb-decision');
  assert.strictEqual(dec.querySelector('.kb-dec-title').textContent, 'Which site?',
    'the ampersand option still resolves to the next question');
  assert.strictEqual(dec.querySelector('.kb-dec-crumb-a').textContent, 'PT & OT',
    'and the crumb shows the human form, not the entity');
  // A SECOND step is what exercises the stored path: answer one is now read
  // back out of `data-path` (its own decoded channel) and re-matched. A
  // one-step walk never reads it, so it would not test this at all.
  h.window.kbDecideChoose_(dec.querySelector('.kb-dec-opt'));
  dec = h.window.document.querySelector('.kb-decision');
  assert.strictEqual(dec.querySelector('.kb-dec-title').textContent, 'Schedule it',
    'the second answer resolves THROUGH the stored ampersand answer');
  assert.strictEqual(dec.querySelectorAll('.kb-dec-crumb').length, 2, 'both crumbs survive');

  // A person name with an ampersand — the panel lookup keys off the parsed index.
  host = mountArticle(h, [
    '```roster', 'dept| Ops — Owner', 'team| Ops: Smith & Jones (C)', '```',
  ].join('\n'));
  const root = host.querySelector('.kb-roster');
  const btn = root.querySelector('.kb-ros-name');
  assert.strictEqual(btn.textContent, 'Smith & Jones', 'the name renders in human form');
  h.window.kbRosterOpenPerson_(btn);
  const panel = root.querySelector('.kb-ros-panel');
  assert.strictEqual(panel.hidden, false, 'their detail panel still opens');
  assert.strictEqual(panel.querySelector('b').textContent, 'Smith & Jones', 'with their name');
  assert.strictEqual(panel.querySelector('.kb-ros-copy').getAttribute('data-name'), 'Smith & Jones',
    'and Copy name still yields the human form, not an entity');
});

// ═══════════════════════════════════════════════════════════════════════════
// Intake polish batch (operator 2026-08-25): response-button unselect,
// PPD notes field, strongly-recommended soft check.
// ═══════════════════════════════════════════════════════════════════════════
section('DOM harness — intake polish (unselect toggle / notes / recommended check)');

test('unselect: re-clicking the selected Yes clears the group (data-val + aria)', () => {
  const h = boot();
  const form = h.document.createElement('div');
  form.id = 'intk-ppd-form';
  form.innerHTML = h.window.intakeYnControlHtml_('data-qnum="8"', 'Q8');
  h.document.body.appendChild(form);
  const yes = form.querySelector('.intk-yn-btn.yes');
  h.window.intakePick_(yes);
  const grp = form.querySelector('.intk-yn');
  assert.strictEqual(grp.getAttribute('data-val'), 'Yes', 'first click selects');
  h.window.intakePick_(yes);   // the operator's accidental-click case
  assert.strictEqual(grp.getAttribute('data-val'), '', 're-click clears the stored value');
  assert.ok(!form.querySelector('.intk-yn-btn.on'), 'no button stays lit');
  form.querySelectorAll('[data-set]').forEach((b) =>
    assert.strictEqual(b.getAttribute('aria-checked'), 'false', 'aria-checked cleared'));
  // and the cleared group reads back as unanswered through the one accessor
  assert.strictEqual(h.window.intakePpdGetVal_(form, '8'), '', 'GetVal reads unanswered');
});

test('unselect: ynnum (Q40) re-click clears the Yes AND the typed hours', () => {
  const h = boot();
  const form = h.document.createElement('div');
  form.id = 'intk-ppd-form';
  form.innerHTML = h.window.intakeYnNumControlHtml_({ unit: 'hours' }, '40', 'Q40');
  h.document.body.appendChild(form);
  const yes = form.querySelector('.intk-yn-btn.yes');
  h.window.intakeYnNumPickYn_(yes);
  const inp = form.querySelector('.intk-ynnum-num input');
  inp.value = '12';
  assert.strictEqual(h.window.intakePpdGetVal_(form, '40'), 'Yes: 12 hours', 'serialized with hours');
  h.window.intakeYnNumPickYn_(yes);   // re-click the lit Yes
  assert.strictEqual(h.window.intakePpdGetVal_(form, '40'), '', 'value fully cleared');
  assert.strictEqual(inp.value, '', 'orphaned hours cleared too — no stale count can ride');
  assert.strictEqual(form.querySelector('.intk-ynnum-num').style.display, 'none', 'number field re-hidden');
});

test('recommended check: marks only listed blanks, confirm gates, filling clears the mark', async () => {
  const h = boot();
  const form = h.document.createElement('div');
  form.id = 'intk-pmd-form';
  // idx 1 (name, recommended) filled · idx 2 (phone, recommended) blank ·
  // idx 3 (secondary ph, NOT recommended) blank — must never be flagged.
  form.innerHTML =
    '<div class="intk-row"><label>Name</label><input data-intk-idx="1" value="Jane Doe"></div>' +
    '<div class="intk-row" id="row2"><label>Phone</label><input data-intk-idx="2" value=""></div>' +
    '<div class="intk-row" id="row3"><label>Secondary</label><input data-intk-idx="3" value=""></div>' +
    '<div class="intk-yn" data-idx="22" data-form="pmd" data-val=""></div>';
  h.document.body.appendChild(form);
  let confirmOpts = null;
  h.window.uiConfirm = (o) => { confirmOpts = o; return Promise.resolve(false); };
  const res = h.window.intakeWarnRecommended_('pmd');
  const row2 = h.document.getElementById('row2');
  assert.ok(row2.classList.contains('intk-recwarn'), 'the blank recommended row is marked');
  assert.ok(row2.querySelector('.intk-recwarn-note'), 'with its strongly-recommended note');
  assert.ok(!h.document.getElementById('row3').classList.contains('intk-recwarn'),
    'a blank NON-listed field is never flagged (the operator rule)');
  let proceeded = null; res.then((v) => { proceeded = v; });
  await tick();
  assert.ok(confirmOpts && /strongly-recommended/.test(confirmOpts.message), 'one confirm, naming the count');
  assert.strictEqual(proceeded, false, 'Go back resolves false — the preview does not fire');
  // fill the field → the mark clears itself on input
  row2.querySelector('input').value = '555-0100';
  row2.dispatchEvent(new h.window.Event('input', { bubbles: true }));
  assert.ok(!row2.classList.contains('intk-recwarn'), 'mark clears when the field gains a value');
  assert.ok(!row2.querySelector('.intk-recwarn-note'), 'note removed with it');
  // and with nothing blank the check resolves true with zero UI
  confirmOpts = null;
  const clean = await h.window.intakeWarnRecommended_('pmd');
  assert.strictEqual(clean, true, 'no blanks → proceed');
  assert.strictEqual(confirmOpts, null, 'and no dialog');
});

test('PPD notes: rendered inside the form, collected under a NON-numeric key, ring untouched', () => {
  const h = boot();
  const html = h.window.intakeRenderPpdSections_('EN');
  assert.ok(/data-intk-qnum="notes"/.test(html), 'notes textarea rides data-intk-qnum');
  assert.ok(/id="intk-ppd-sec-notes"/.test(html), 'in its own trailing panel');
  // The 46-question ring: sections derive from the BANK, so 'notes' never
  // enters mainQNums (the denominator the E14 seed literal pins).
  const secs = h.window.intakePpdSections_('EN');
  const allMain = [].concat(...secs.map((x) => x.mainQNums));
  assert.strictEqual(allMain.indexOf('notes'), -1, 'notes is not a counted question');
  assert.strictEqual(allMain.length, 46, 'denominator stays 46');
  // Collect round-trip: the pseudo-key lands in answers + rows for the email.
  const form = h.document.createElement('div');
  form.id = 'intk-ppd-form';
  form.innerHTML = html;
  h.document.body.appendChild(form);
  form.querySelector('[data-intk-qnum="notes"]').value = 'Lives with caregiver; call after 2pm';
  const snap = h.window.intakeCollectPpd_();
  assert.strictEqual(snap.answers.notes, 'Lives with caregiver; call after 2pm', 'collected into answers');
  const noteRow = snap.rows.filter((r) => r.qNum === 'notes')[0];
  assert.ok(noteRow && noteRow.value === 'Lives with caregiver; call after 2pm',
    'and pushed as a row — the server email builder renders rows verbatim, no server change');
});
