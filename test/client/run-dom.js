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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
