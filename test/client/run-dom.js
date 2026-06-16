'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DOM-lifecycle tests for the web-app client partials. Run: `node test/client/run-dom.js`
// (requires the jsdom dev dependency: `npm ci`). Companion to run.js (pure helpers).
//
// Phase 1 = foundation + smoke tests proving the harness loads real partials,
// renders through a real DOM, seeds/reads module state via the bridge, and drives
// google.script.run round-trips. Phases 2–3 (overlay lifecycle, escape discipline,
// optimistic-UI / late-callback guards) build on these primitives.
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const { buildDomWindow } = require('./harness-dom');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && (e.stack || e.message) || e)); }
}

// ── Meta: every tool partial loads into a fresh real DOM without throwing ────
// A load failure is itself a signal — a module-top side effect the stubs don't
// cover. (script_core + script_icons are the implicit foundation in each.)
console.log('\ndom-harness — every tool partial loads into a real jsdom window');
// Tool partials with module-top listeners that bind to shared modal nodes mount
// modals.html (as index.html does); the rest need only the default shell.
[
  { files: ['metrics/script_metrics.html'] },
  { files: ['cn/script_callnotes.html'] },
  { files: ['tc/script_clock.html'], markup: ['modals.html'] },
  { files: ['tc/script_timeoff.html'], markup: ['modals.html'] },
  { files: ['tc/script_manager.html'], markup: ['modals.html'] },
  { files: ['intake/script_intake.html'] },
  { files: ['kb/script_kb.html'] },
  { files: ['train/script_training.html'] },
  { files: ['train/script_empdocs.html'] },
  { files: ['script_tour.html'] },
].forEach((spec) => {
  test(spec.files.join(' + ') + ' loads', () => {
    const h = buildDomWindow(spec.files, { markup: spec.markup });
    assert.strictEqual(typeof h.ctx.esc, 'function', 'core esc() present');
  });
});

// ── Foundation primitives ────────────────────────────────────────────────────
console.log('\ndom-harness — foundation primitives');

test('esc() output injected via REAL innerHTML produces no script/img node', () => {
  const h = buildDomWindow([]);
  const hostile = '<img src=x onerror=alert(1)><script>alert(2)<\/script>"q\'q';
  h.$('#view-area').innerHTML = '<div class="cell">' + h.ctx.esc(hostile) + '</div>';
  assert.strictEqual(h.$$('#view-area script').length, 0, 'no <script> materialized');
  assert.strictEqual(h.$$('#view-area img').length, 0, 'no <img> materialized');
  assert.ok(h.$('.cell').textContent.indexOf('onerror') >= 0, 'hostile text survives as inert text');
});

test('mockRun records a call and drives the SUCCESS handler on resolve', () => {
  const h = buildDomWindow([]);
  let got = null;
  h.window.google.script.run
    .withSuccessHandler((res) => { got = res; })
    .withFailureHandler(() => { throw new Error('failure handler should not fire'); })
    .getSomething('a', 2);
  const call = h.run.last();
  assert.strictEqual(call.method, 'getSomething');
  assert.deepStrictEqual(call.args, ['a', 2]);
  assert.strictEqual(h.run.pending().length, 1, 'call pending until resolved');
  h.run.resolve({ ok: true });
  assert.deepStrictEqual(got, { ok: true });
  assert.strictEqual(h.run.pending().length, 0, 'no longer pending');
});

test('mockRun drives the FAILURE handler on reject', () => {
  const h = buildDomWindow([]);
  let err = null, ok = false;
  h.window.google.script.run
    .withSuccessHandler(() => { ok = true; })
    .withFailureHandler((e) => { err = e; })
    .doThing();
  h.run.reject(new Error('boom'));
  assert.strictEqual(ok, false, 'success handler not fired');
  assert.strictEqual(err.message, 'boom');
});

test('mockRun lastFor / countFor target a method across interleaved calls', () => {
  const h = buildDomWindow([]);
  const r = h.window.google.script.run;
  r.withSuccessHandler(() => {}).alpha(1);
  r.withSuccessHandler(() => {}).beta(2);
  r.withSuccessHandler(() => {}).alpha(3);
  assert.strictEqual(h.run.countFor('alpha'), 2);
  assert.deepStrictEqual(h.run.lastFor('alpha').args, [3]);
  assert.deepStrictEqual(h.run.lastFor('beta').args, [2]);
});

test('bridge reads CN_STATE (const) and gets/sets currentView (let)', () => {
  const h = buildDomWindow(['cn/script_callnotes.html']);
  const cn = h.t.getCN_STATE();
  assert.ok(cn && typeof cn === 'object', 'CN_STATE reachable via bridge');
  assert.strictEqual(h.t.getCurrentView(), 'clock', 'currentView default seeded by script_core');
  h.t.setCurrentView('callNotes');
  assert.strictEqual(h.t.getCurrentView(), 'callNotes', 'bridge can mutate the let binding');
});

test('a real CN render helper produces queryable, escaped markup', () => {
  const h = buildDomWindow(['cn/script_callnotes.html']);
  assert.strictEqual(typeof h.ctx.cnUrgentPillHtml_, 'function');
  // Non-urgent → empty; urgent → a pill. Render BOTH through a real node.
  h.$('#view-area').innerHTML = h.ctx.cnUrgentPillHtml_({ subformData: {} });
  const emptyLen = h.$('#view-area').innerHTML.length;
  h.$('#view-area').innerHTML = h.ctx.cnUrgentPillHtml_({ subformData: { flags: ['urgent'] } });
  assert.ok(h.$('#view-area').innerHTML.length > emptyLen, 'urgent note renders a pill');
  assert.strictEqual(h.$$('#view-area script').length, 0, 'no script node in rendered pill');
});

// ── Phase 2a: escape discipline (drive real renderers with hostile input) ────
// Pins the F2 / INV-89 class as regressions: a server/CDR field that reaches
// innerHTML must never materialize a live node. We assert BOTH that no <script>
// / <img> node appears AND that the hostile text survives as inert text.
console.log('\ndom-harness — escape discipline (render with hostile input)');

const XSS = '<img src=x onerror=alert(1)><script>alert(2)<\/script>';

function fullTeamData(overrides) {
  return Object.assign({
    from: '2026-06-15', to: '2026-06-15', date: '2026-06-15',
    teamTotals: { pctAnswered: 50, rung: 2, answered: 1, missed: 1,
      tttFormatted: '0:00:20', noteCount: 1, noteCoverage: 100 },
    reps: [], trend: null, unmatchedAgents: [], rosterWithNoCdr: [],
  }, overrides || {});
}

test('mRenderTeamMetrics_: hostile repName in the per-rep table renders escaped (F2)', () => {
  const h = buildDomWindow(['metrics/script_metrics.html'], { html: '<div id="m-team-content"></div>' });
  h.ctx.mRenderTeamMetrics_(fullTeamData({
    reps: [{ repName: XSS, totalRung: 1, totalAnswered: 1, totalMissed: 0,
      pctAnswered: 100, attFormatted: '0:00:10', noteCount: 1, noteCoverage: 100 }],
  }));
  const el = h.$('#m-team-content');
  assert.strictEqual(el.querySelectorAll('script').length, 0, 'no <script> node from repName');
  assert.strictEqual(el.querySelectorAll('img').length, 0, 'no <img> node from repName');
  assert.ok(el.textContent.indexOf('onerror') >= 0, 'hostile repName survives as inert text');
});

test('mRenderTeamMetrics_: hostile CDR agent name (cross-repo boundary) renders escaped', () => {
  const h = buildDomWindow(['metrics/script_metrics.html'], { html: '<div id="m-team-content"></div>' });
  h.ctx.mRenderTeamMetrics_(fullTeamData({ unmatchedAgents: [XSS] }));
  const el = h.$('#m-team-content');
  assert.strictEqual(el.querySelectorAll('script,img').length, 0, 'no live node from an unmatched CDR agent name');
  assert.ok(el.textContent.indexOf('onerror') >= 0, 'agent name survives as inert text');
});

test('mRenderMyStats_: hostile server error string renders escaped', () => {
  const h = buildDomWindow(['metrics/script_metrics.html'], { html: '<div id="m-my-content"></div>' });
  h.ctx.mRenderMyStats_({ error: XSS });
  const el = h.$('#m-my-content');
  assert.strictEqual(el.querySelectorAll('script,img').length, 0, 'no live node from data.error');
  assert.ok(el.textContent.indexOf('onerror') >= 0);
});

test('cnRenderCardCore_: hostile note fields render escaped (INV-89 card class)', () => {
  const h = buildDomWindow(['cn/script_callnotes.html']);
  const note = {
    noteId: 'n1', timestamp: '2026-06-15T10:00:00', dateLocal: '2026-06-15',
    callback: '', caller: XSS, relationship: '', patientAndTrx: '"><script>x<\/script>',
    issue: XSS, transferredTo: '', resolution: '', flagType: '', resolved: false,
    emailedAt: '', emailDepartments: '', subform: '', subformData: {},
  };
  h.$('#view-area').innerHTML = h.ctx.cnRenderCardCore_(note, false);
  const el = h.$('#view-area');
  assert.strictEqual(el.querySelectorAll('script').length, 0, 'no <script> node from note fields');
  assert.strictEqual(el.querySelectorAll('img').length, 0, 'no <img> node from note fields');
  assert.ok(el.textContent.indexOf('onerror') >= 0, 'hostile caller/issue survives as inert text');
});

// ── Phase 2b: overlay lifecycle (ensureOverlay / closeOverlay / Esc) ──────────
// Pins the documented "Esc left the node hidden-but-stateful → composer dead
// until reload" bug class: a reused overlay must come back VISIBLE.
console.log('\ndom-harness — overlay lifecycle (ensureOverlay / Esc)');

test('ensureOverlay reuse re-asserts `overlay open` (never hidden-but-stateful)', () => {
  const h = buildDomWindow([]);
  let closed = 0;
  const ov = h.ctx.ensureOverlay('t-ov', { onClose: () => { closed++; h.document.getElementById('t-ov').classList.remove('open'); } });
  assert.ok(ov.classList.contains('open'), 'created open');
  h.ctx.closeOverlay(ov);
  assert.strictEqual(closed, 1, 'closeOverlay ran the registered hook');
  assert.ok(!ov.classList.contains('open'), 'hook removed open');
  const ov2 = h.ctx.ensureOverlay('t-ov', { onClose: () => {} });
  assert.strictEqual(ov2, ov, 'reused the same node');
  assert.ok(ov.classList.contains('open'), 'reopen re-asserted open — renders into a VISIBLE node');
});

test('Escape closes only the TOPMOST open overlay, through its hook (stacking)', () => {
  const h = buildDomWindow([]);
  let aClosed = 0, bClosed = 0;
  h.ctx.ensureOverlay('ov-a', { onClose: () => { aClosed++; h.document.getElementById('ov-a').classList.remove('open'); } });
  h.ctx.ensureOverlay('ov-b', { onClose: () => { bClosed++; h.document.getElementById('ov-b').classList.remove('open'); } });
  h.dispatchKey('Escape');
  assert.strictEqual(bClosed, 1, 'topmost (last in DOM order) closed');
  assert.strictEqual(aClosed, 0, 'underlying overlay untouched');
  h.dispatchKey('Escape');
  assert.strictEqual(aClosed, 1, 'second Escape closes the now-topmost overlay');
});

test('closeOverlay degrades to a plain hide for a hookless modal AND a throwing hook', () => {
  const h = buildDomWindow([]);
  const s = h.document.createElement('div');
  s.id = 'static-ov'; s.className = 'overlay open'; h.document.body.appendChild(s);
  h.ctx.closeOverlay(s);   // no hook registered
  assert.ok(!s.classList.contains('open'), 'hookless static modal just loses open');
  const t = h.ctx.ensureOverlay('throw-ov', { onClose: () => { throw new Error('boom'); } });
  h.ctx.closeOverlay(t);   // hook throws
  assert.ok(!t.classList.contains('open'), 'throwing hook degrades to plain hide so Esc never gets stuck');
});

// ── Phase 2c: focus trap ─────────────────────────────────────────────────────
console.log('\ndom-harness — focus trap');

test('focusin outside the topmost modal pulls focus to its first focusable', () => {
  const h = buildDomWindow([], { html: '<div id="outside"><button id="ob">out</button></div>' });
  const ov = h.ctx.ensureOverlay('ft-ov', {});
  ov.innerHTML = '<div class="modal"><button id="mb1">one</button><button id="mb2">two</button></div>';
  // A focusin whose target is OUTSIDE the overlay must be pulled back to mb1.
  h.$('#ob').dispatchEvent(new h.window.FocusEvent('focusin', { bubbles: true }));
  assert.strictEqual(h.document.activeElement, h.$('#mb1'), 'focus trapped to first focusable in the modal');
});

// ── Phase 3: optimistic-UI + late-callback guards (the Call Notes hot path) ──
// Drives the real functions through the programmable mockRun. Pins INV-48
// (optimistic submit + the three revert branches), INV-56 (_flagInFlight
// double-fire), and the late-callback currentView guard.
console.log('\ndom-harness — optimistic UI + late-callback guards');

// Build the active-form DOM (7 contenteditable fields + training-q input). We
// populate/read fields through the code's own cnSetFieldValue_/cnGetFieldValue_
// so the test is consistent with how the app branches on isContentEditable.
const CN_FIELD_KEYS = ['callback', 'caller', 'relationship', 'patient', 'issue', 'transferred', 'resolution'];
function activeFormDom() {
  return '<div id="cn-active-form">' +
    CN_FIELD_KEYS.map((k) => '<div contenteditable="true" id="cn-fld-' + k + '"></div>').join('') +
    '<input id="cn-fld-training-q"></div>' +
    '<div id="cn-stack"></div><div id="cn-filter-bar"></div>';
}
function fullNote(over) {
  return Object.assign({
    noteId: 'n1', timestamp: '2026-06-15T10:00:00', dateLocal: '2026-06-15',
    callback: '', caller: 'Jane', relationship: '', patientAndTrx: '', issue: 'Wheelchair',
    transferredTo: '', resolution: '', flagType: '', resolved: false,
    emailedAt: '', emailDepartments: '', subform: '', subformData: {},
  }, over || {});
}

test('INV-48 optimistic submit: pending card appears, then swaps to the confirmed note', () => {
  const h = buildDomWindow(['cn/script_callnotes.html'], { html: activeFormDom() });
  const cn = h.t.getCN_STATE();
  cn.rollingNotes = []; cn.pinnedNotes = [];
  h.t.setCurrentView('callNotes');
  h.ctx.cnSetFieldValue_('cn-fld-caller', 'Jane');
  h.ctx.cnSetFieldValue_('cn-fld-issue', 'Wheelchair sizing');

  h.ctx.cnSubmitActiveForm_();
  // Optimistic: pending note in the stack BEFORE the server responds.
  assert.strictEqual(cn.rollingNotes.length, 1, 'pending note added optimistically');
  assert.strictEqual(cn.rollingNotes[0]._pending, true, 'marked _pending');
  assert.strictEqual(h.run.countFor('submitCallNote'), 1, 'one submit RPC fired');
  assert.ok(h.$('#cn-stack').innerHTML.indexOf('Jane') >= 0, 'pending card rendered into the stack');

  // Server confirms — the slot is REPLACED with the real note (no _pending).
  const confirmed = fullNote({ noteId: 'srv1' });
  h.run.resolveLastFor('submitCallNote', { success: true, note: confirmed });
  assert.strictEqual(cn.rollingNotes[0].noteId, 'srv1', 'pending slot replaced by confirmed note');
  assert.ok(!cn.rollingNotes[0]._pending, '_pending cleared');
});

test('INV-48 revert (form empty): pending dropped + snapshot restored into the form', () => {
  const h = buildDomWindow(['cn/script_callnotes.html'], { html: activeFormDom() });
  const cn = h.t.getCN_STATE();
  cn.rollingNotes = [{ noteId: 'pending_x', _pending: true }];
  h.t.setCurrentView('callNotes');
  const snap = { values: { caller: 'Jane', issue: 'Wheelchair' }, flag: '', flags: null, tags: null, trainingQ: '' };
  h.ctx.cnRevertPendingSubmit_('pending_x', snap, 'Save failed');
  assert.ok(!cn.rollingNotes.some((n) => n.noteId === 'pending_x'), 'pending note removed from the stack');
  assert.strictEqual(h.ctx.cnGetFieldValue_('cn-fld-caller'), 'Jane', 'snapshot restored into the empty form');
});

test('INV-48 revert (form has new typing): the rep\'s current text is left untouched', () => {
  const h = buildDomWindow(['cn/script_callnotes.html'], { html: activeFormDom() });
  const cn = h.t.getCN_STATE();
  cn.rollingNotes = [{ noteId: 'pending_z', _pending: true }];
  h.t.setCurrentView('callNotes');
  h.ctx.cnSetFieldValue_('cn-fld-caller', 'NEW TYPING');   // rep started the next note
  h.ctx.cnRevertPendingSubmit_('pending_z', { values: { caller: 'OldNote' }, flag: '', flags: null, tags: null, trainingQ: '' }, 'fail');
  assert.strictEqual(h.ctx.cnGetFieldValue_('cn-fld-caller'), 'NEW TYPING', 'newer typing NOT clobbered by the revert');
});

test('INV-48 revert (form gone): snapshot parked in the sticky-draft localStorage slot', () => {
  const h = buildDomWindow(['cn/script_callnotes.html']);   // no #cn-active-form mounted
  const cn = h.t.getCN_STATE();
  cn.rollingNotes = [{ noteId: 'pending_y', _pending: true }];
  const key = h.t.eval('CN_FORM_STICKY_LS_KEY');
  h.window.localStorage.removeItem(key);
  h.ctx.cnRevertPendingSubmit_('pending_y', { values: { caller: 'Bob' }, flag: '', flags: null, tags: null, trainingQ: '' }, 'fail');
  const draft = JSON.parse(h.window.localStorage.getItem(key) || 'null');
  assert.ok(draft && draft.values && draft.values.caller === 'Bob', 'snapshot parked as a sticky draft for next Log enter');
});

test('INV-56 double-fire guard: a second flag toggle while the first RPC is in flight is dropped', () => {
  const h = buildDomWindow(['cn/script_callnotes.html'], { html: '<div id="cn-stack"></div><div id="cn-filter-bar"></div>' });
  const cn = h.t.getCN_STATE();
  cn.rollingNotes = [fullNote({ noteId: 'n1' })];
  h.t.setCurrentView('callNotes');
  h.ctx.cnToggleFlag_('n1', 'action');   // fires RPC #1, sets _flagInFlight
  h.ctx.cnToggleFlag_('n1', 'action');   // in flight → dropped
  assert.strictEqual(h.run.countFor('setCallNoteFlag'), 1, 'second click dropped while first RPC in flight');
  // Resolve → guard clears; a fresh toggle fires again.
  h.run.resolveLastFor('setCallNoteFlag', { success: true, note: fullNote({ noteId: 'n1', flagType: 'action' }) });
  h.ctx.cnToggleFlag_('n1', 'action');
  assert.strictEqual(h.run.countFor('setCallNoteFlag'), 2, 'guard cleared on resolve — next toggle fires');
});

test('late-callback guard: cnLoadToday_ resolving after nav-away updates state but skips render', () => {
  const h = buildDomWindow(['cn/script_callnotes.html']);
  const cn = h.t.getCN_STATE();
  h.t.setCurrentView('callNotes');
  let rendered = 0;
  h.ctx.cnLoadToday_(function () { rendered++; });
  h.t.setCurrentView('clock');   // rep navigated away during the round trip
  h.run.resolveLastFor('getMyCallNotes', { notes: [{ noteId: 'a' }], autoCopyFormat: '', timezone: 'UTC' });
  assert.strictEqual(cn.rollingNotes.length, 1, 'state updated unconditionally (cache stays warm)');
  assert.strictEqual(rendered, 0, 'render callback SKIPPED because the view changed');

  // Contrast: staying on the view fires the render callback.
  let rendered2 = 0;
  h.t.setCurrentView('callNotes');
  h.ctx.cnLoadToday_(function () { rendered2++; });
  h.run.resolveLastFor('getMyCallNotes', { notes: [], autoCopyFormat: '', timezone: 'UTC' });
  assert.strictEqual(rendered2, 1, 'render runs when the view is unchanged');
});

// ── Opportunistic coverage: other partials' escape + a shipped-fix regression ─
console.log('\ndom-harness — opportunistic coverage (intake / training)');

test('F3 regression: intakeClearForm_ nulls INTAKE_STATE.preview (drops patient PHI)', () => {
  const h = buildDomWindow(['intake/script_intake.html']);
  const st = h.ctx.INTAKE_STATE;   // declared with `var` → reachable as a context prop
  st.preview = { formType: 'PPD', payload: { patientInfo: 'Jane PHI', answers: { 38: '250' } }, bodyHash: 'abc' };
  h.ctx.intakeClearForm_('ppd');   // re-renders the PPD view into #view-area (default shell)
  assert.strictEqual(st.preview, null, 'cached preview (patient answers) cleared on form clear');
});

test('intakeRenderSentList_: hostile patientInfo renders escaped (INV-89/116 class)', () => {
  const h = buildDomWindow(['intake/script_intake.html']);
  const html = h.ctx.intakeRenderSentList_(
    [{ formType: 'PPD', patientInfo: XSS, timestamp: '2026-06-15', recipient: 'x@y.com', repName: 'r' }], true);
  h.$('#view-area').innerHTML = html;
  const el = h.$('#view-area');
  assert.strictEqual(el.querySelectorAll('script,img').length, 0, 'no live node from a Sent-list patient label');
  assert.ok(el.textContent.indexOf('onerror') >= 0, 'hostile patientInfo survives as inert text');
});

test('trainRenderReader_: hostile embed title renders escaped (no live node)', () => {
  const h = buildDomWindow(['train/script_training.html'], { html: '<div id="train-reader-overlay"></div>' });
  h.ctx.trainRenderReader_({ id: 'i1', type: 'embed', title: XSS,
    embedUrl: 'https://docs.google.com/document/d/x/preview', openUrl: 'https://docs.google.com/document/d/x/edit' });
  const ov = h.$('#train-reader-overlay');
  assert.strictEqual(ov.querySelectorAll('script').length, 0, 'no <script> from the embed title');
  assert.strictEqual(ov.querySelectorAll('img').length, 0, 'hostile title did not create an <img>');
  assert.strictEqual(ov.querySelectorAll('iframe').length, 1, 'the intended embed iframe is present');
  assert.ok(ov.textContent.indexOf('onerror') >= 0, 'hostile title survives as inert text');
});

// ── Onboarding tour (T-1 idempotency, T-2 deep-link gate) ────────────────────
console.log('\ndom-harness — onboarding tour (script_tour)');

test('T-1: tourEnsureNodes_ is idempotent — no duplicate nodes on re-entry', () => {
  const h = buildDomWindow(['script_tour.html']);
  h.ctx.tourEnsureNodes_();
  h.ctx.tourEnsureNodes_();   // with the old `tour-root` guard this created a 2nd set
  assert.strictEqual(h.$$('#tour-block').length, 1, 'guard prevents a duplicate tour-block');
});

test('T-2: auto-start is SUPPRESSED on a deep-link landing (?tool=…)', () => {
  const h = buildDomWindow(['script_tour.html'], { serverQueryParams: { tool: 'callNotes' } });
  let scheduled = 0;
  h.window.setTimeout = function () { scheduled++; return 0; };   // spy: did it schedule tourStart?
  h.window.localStorage.removeItem('umsTour');                    // unseen → would start if not gated
  h.ctx.tourMaybeAutoStart_();
  assert.strictEqual(scheduled, 0, 'deep-link landing suppresses the auto-start');
});

test('T-2 contrast: no deep-link + unseen → auto-start IS scheduled', () => {
  const h = buildDomWindow(['script_tour.html'], { serverQueryParams: {} });
  let scheduled = 0;
  h.window.setTimeout = function () { scheduled++; return 0; };
  h.window.localStorage.removeItem('umsTour');
  h.ctx.tourMaybeAutoStart_();
  assert.strictEqual(scheduled, 1, 'no deep-link → auto-start scheduled');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
