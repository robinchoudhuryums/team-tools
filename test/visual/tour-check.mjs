// T1 (operator 2026-11-11) — the onboarding tour, walked in a real browser.
//
// For each role (the fixture admin, then View-as Manager / Spanish CSR / CSR)
// it starts the full tour and presses Next through every step the engine
// chose, and fails when a step's target never appears (the engine would skip
// it — silently, for the person taking the tour), when the card lands off
// screen, or when a role is shown a step its tabs do not allow. It also loads
// the page as someone who saw version 1 and checks that only the what's-new
// steps auto-start. Every painted step is photographed:
// shots/tour-<run>-<nn>-<step id>.png. Results: tour-report.json.
//
//   node build.mjs && node tour-check.mjs          (CI runs it after the layout gate)
//   node tour-check.mjs csr                        (only runs whose name contains "csr")
import { chromium } from 'playwright';
import { chromiumPath } from './chromium-path.cjs';   // F74 (cycle 26): the ONE resolver for every script here
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(HERE, 'page.html');
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);

const WIDE = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
// Steps a role must NEVER be shown (its tabs are gated away), and steps it
// must be shown — the gate is tabVisibleForUser_, so this is the browser-side
// half of the pure pin that drives it.
const MGR_ONLY = ['team-notes', 'team-training', 'manage'];
const RUNS = [
  { name: 'admin-wide', vp: WIDE, viewAs: null, must: ['admin', 'qa', 'spanish', 'manage'], never: [] },
  { name: 'manager-wide', vp: WIDE, viewAs: 'manager', must: MGR_ONLY.concat(['qa', 'spanish']), never: ['admin'] },
  { name: 'spanish-wide', vp: WIDE, viewAs: 'spanish', must: ['spanish'], never: MGR_ONLY.concat(['admin', 'qa']) },
  { name: 'csr-wide', vp: WIDE, viewAs: 'csr', must: ['welcome', 'clock', 'cn-frame', 'reference', 'intake', 'training'], never: MGR_ONLY.concat(['admin', 'qa', 'spanish']) },
  // Below 1024px the sidebar is display:none — its step is SKIPPED by design
  // (L-10); every other step must still find a visible target.
  { name: 'admin-mobile', vp: MOBILE, viewAs: null, must: [], never: [], mayMiss: ['sidebar'] },
];

const browser = await chromium.launch({ executablePath: chromiumPath() });
const report = [];
let failed = 0;
const fail = (run, msg) => { failed++; run.failures.push(msg); };

async function openPage(vp, seen) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript((s) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', 'light'); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: s })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, seen);
  const fake = new Date(); fake.setUTCHours(9, 0, 0, 0);
  await page.clock.install({ time: fake });
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

// Wait for step i to be painted (TOUR_I === i and the card faded in), or for
// the engine to have moved past it (a skip). Returns the painted state.
async function waitStep(page, i) {
  for (let t = 0; t < 60; t++) {
    const st = await page.evaluate((i) => {
      const pop = document.getElementById('tour-pop');
      const spot = document.getElementById('tour-spot');
      const s = TOUR_VISIBLE[i];
      const r = pop ? pop.getBoundingClientRect() : null;
      return {
        active: TOUR_ACTIVE, at: TOUR_I, painted: TOUR_I === i && !!pop && pop.classList.contains('in'),
        spot: !!spot && spot.classList.contains('show'), selector: s ? s.selector : null, id: s ? s.id : null,
        kicker: pop && pop.querySelector('.tour-kicker') ? pop.querySelector('.tour-kicker').textContent : '',
        pop: r ? { top: r.top, left: r.left, bottom: r.bottom, right: r.right } : null,
        view: currentView, vw: innerWidth, vh: innerHeight,
      };
    }, i);
    if (!st.active || st.at > i || st.painted) return st;
    await page.waitForTimeout(100);
  }
  return { timeout: true };
}

for (const R of RUNS) {
  if (only.length && !only.some((o) => R.name.includes(o))) continue;
  const run = { name: R.name, steps: [], skipped: [], failures: [] };
  const { ctx, page, errors } = await openPage(R.vp, 9999);
  if (R.viewAs) { await page.evaluate((r) => viewAsSet_(r), R.viewAs); await page.waitForTimeout(900); }
  await page.evaluate(() => tourStart('full'));
  const ids = await page.evaluate(() => TOUR_VISIBLE.map((s) => s.id));
  run.planned = ids;
  R.must.forEach((id) => { if (ids.indexOf(id) < 0) fail(run, 'role is not shown "' + id + '"'); });
  R.never.forEach((id) => { if (ids.indexOf(id) >= 0) fail(run, 'role is shown "' + id + '", which its tabs do not allow'); });
  if (ids.indexOf('whatsnew') >= 0) fail(run, 'the full tour opened with the what\'s-new card');
  for (let i = 0; i < ids.length; i++) {
    const st = await waitStep(page, i);
    if (st.timeout) { fail(run, 'step ' + ids[i] + ' neither painted nor skipped'); break; }
    if (!st.painted) {
      run.skipped.push(ids[i]);
      if (!(R.mayMiss || []).includes(ids[i])) fail(run, 'step "' + ids[i] + '": its target never appeared — the engine skipped it');
      if (!st.active) break;
      continue;
    }
    await page.waitForTimeout(450);   // the spotlight's 250ms move + smooth scroll
    const p = st.pop;
    if (!p || p.top < 0 || p.left < 0 || p.bottom > st.vh + 1 || p.right > st.vw + 1) fail(run, 'step "' + ids[i] + '": the card is off screen ' + JSON.stringify(p));
    if (st.selector && !st.spot) fail(run, 'step "' + ids[i] + '": no spotlight on ' + st.selector);
    if (!/^Step \d+ of \d+$/.test(st.kicker.trim())) fail(run, 'step "' + ids[i] + '": kicker reads "' + st.kicker + '"');
    run.steps.push({ id: ids[i], view: st.view, selector: st.selector });
    await page.screenshot({ path: path.join(OUT, 'tour-' + R.name + '-' + String(i + 1).padStart(2, '0') + '-' + ids[i] + '.png') });
    await page.evaluate(() => { const b = document.querySelector('#tour-pop [data-tour="next"]'); if (b) b.click(); });
  }
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ active: TOUR_ACTIVE, seen: JSON.parse(localStorage.getItem('umsTour') || '{}').seenVersion, v: TOUR_VERSION, nodes: !!document.getElementById('tour-pop') }));
  if (after.active || after.nodes) fail(run, 'the tour did not end after its last step');
  if (after.seen !== after.v) fail(run, 'the end stamped seenVersion ' + after.seen + ', not ' + after.v);
  run.errors = Array.from(new Set(errors)).slice(0, 5);
  if (run.errors.length) fail(run, 'page errors: ' + run.errors.join(' | '));
  report.push(run);
  await ctx.close();
}

// What's new: someone who finished version 1 gets only the newer steps, auto-started.
if (!only.length || only.some((o) => 'whatsnew'.includes(o) || o === 'whatsnew')) {
  const run = { name: 'whatsnew-v1', steps: [], skipped: [], failures: [] };
  const { ctx, page, errors } = await openPage(WIDE, 1);
  await page.waitForTimeout(900);   // tourMaybeAutoStart_'s 600ms beat
  const st0 = await page.evaluate(() => ({ active: TOUR_ACTIVE, mode: TOUR_MODE, ids: TOUR_VISIBLE.map((s) => s.id), since: TOUR_VISIBLE.map((s) => s.since || 1) }));
  run.planned = st0.ids;
  if (!st0.active || st0.mode !== 'new') fail(run, 'the what\'s-new run did not auto-start (' + JSON.stringify(st0) + ')');
  if (st0.ids[0] !== 'whatsnew') fail(run, 'it does not open with the what\'s-new card');
  if (st0.ids.indexOf('welcome') >= 0) fail(run, 'it opened with the full tour\'s welcome');
  if (st0.since.some((v) => v < 2)) fail(run, 'it shows a version-1 step');
  const first = await waitStep(page, 0);
  if (!/^What’s new · 1 of \d+$/.test((first.kicker || '').trim())) fail(run, 'kicker reads "' + first.kicker + '"');
  await page.screenshot({ path: path.join(OUT, 'tour-whatsnew-v1-01-whatsnew.png') });
  run.errors = Array.from(new Set(errors)).slice(0, 5);
  if (run.errors.length) fail(run, 'page errors: ' + run.errors.join(' | '));
  report.push(run);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(HERE, 'tour-report.json'), JSON.stringify(report, null, 2));
report.forEach((r) => console.log((r.failures.length ? 'FAIL ' : 'ok   ') + r.name + ' — ' + r.steps.length + ' painted' +
  (r.skipped.length ? ', skipped ' + r.skipped.join(',') : '') + (r.failures.length ? '\n     ' + r.failures.join('\n     ') : '')));
console.log('\nTOUR CHECK: ' + (failed ? 'FAIL (' + failed + ')' : 'PASS'));
process.exit(failed ? 1 : 0);
