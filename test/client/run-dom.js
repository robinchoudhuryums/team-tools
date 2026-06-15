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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
