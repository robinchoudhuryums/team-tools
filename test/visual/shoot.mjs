// Playwright driver for the visual audit: scenarios × viewport × theme.
// Run `node build.mjs` first (page.html is generated, not committed).
// Usage: node shoot.mjs [name-substring ...]   — no args shoots everything.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(HERE, 'page.html');
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// Chromium resolution: explicit env override → the pre-provisioned pw-browsers
// install (any version) → Playwright's own default download.
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) {
        const exe = path.join(root, hit, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return exe;
      }
    } catch (e) { /* root absent — keep looking */ }
  }
  return undefined; // let Playwright resolve its own managed browser
}

const WIDE = { width: 1440, height: 900 };
const COMPACT = { width: 480, height: 800 };
const COMPACT_SM = { width: 360, height: 640 };
const MOBILE = { width: 390, height: 844 };

// [name, {tool, tab}, viewport, mode, query, post?]
// `post` (optional 6th element) is a JS expression evaluated in the page AFTER
// the nav settles — the first mechanism for shooting a MODAL state (the
// Visual Audit Stage lists modal/overlay states as an uncovered gap; tab
// landings alone cannot reach them).
const SCENARIOS = [
  ['clock-light-wide',      { tool: 'timeClock', tab: 'clock' },      WIDE, 'light', ''],
  ['clock-dark-wide',       { tool: 'timeClock', tab: 'clock' },      WIDE, 'dark',  ''],
  // Operator 2026-08-31 — the rep forgot to punch in and has a request
  // AWAITING approval: the chip must be visible above the punch buttons, which
  // is the whole point (it is what stops them punching again "to be safe").
  ['clock-pendingadj-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?pendingadj=1'],
  ['timeoff-light-wide',    { tool: 'timeClock', tab: 'timeoff' },    WIDE, 'light', ''],
  ['timeoff-dark-wide',     { tool: 'timeClock', tab: 'timeoff' },    WIDE, 'dark',  ''],
  ['manage-light-wide',     { tool: 'manage',    tab: 'manage' },     WIDE, 'light', ''],
  ['manage-dark-wide',      { tool: 'manage',    tab: 'manage' },     WIDE, 'dark',  ''],
  ['cn-log-light-wide',     { tool: 'callNotes', tab: 'callNotes' },  WIDE, 'light', ''],
  ['cn-log-dark-wide',      { tool: 'callNotes', tab: 'callNotes' },  WIDE, 'dark',  ''],
  ['metrics-light-wide',    { tool: 'metrics',   tab: null },         WIDE, 'light', ''],
  ['metrics-dark-wide',     { tool: 'metrics',   tab: null },         WIDE, 'dark',  ''],
  // Cycle-14 Phase 2 — Team Metrics was never in the matrix, and it is now the
  // home of the sub-queue views (segmented bars are exactly what code review
  // cannot verify).
  ['metrics-team-light-wide', { tool: 'metrics', tab: 'metricsTeam' },   WIDE, 'light', ''],
  ['metrics-team-dark-wide',  { tool: 'metrics', tab: 'metricsTeam' },   WIDE, 'dark',  ''],
  ['intake-light-wide',     { tool: 'intake',    tab: null },         WIDE, 'light', ''],
  ['intake-catalog-light-wide', { tool: 'intake', tab: 'intakeCatalog' }, WIDE, 'light', ''],
  // 2026-08-31 coverage pass — the matrix covered 18 of 29 registry tabs.
  // These three were the highest-value misses: BOTH Intake account forms are
  // PHI-bearing 20+ field layouts that only the PPD sibling was ever shot
  // against, and Team Notes is the manager surface for the whole Call Notes
  // module (training queue, review candidates, per-rep, stats).
  ['intake-pmd-light-wide', { tool: 'intake', tab: 'intakePmdAccount' }, WIDE, 'light', ''],
  ['intake-pap-light-wide', { tool: 'intake', tab: 'intakePapAccount' }, WIDE, 'light', ''],
  ['cn-teamnotes-light-wide', { tool: 'callNotes', tab: 'callNotesManage' }, WIDE, 'light', ''],
  ['intake-dark-wide',      { tool: 'intake',    tab: null },         WIDE, 'dark',  ''],
  ['reference-light-wide',  { tool: 'reference', tab: null },         WIDE, 'light', ''],
  ['training-light-wide',   { tool: 'develop',   tab: null },         WIDE, 'light', ''],
  ['coaching-light-wide',   { tool: 'develop',   tab: 'coaching' },   WIDE, 'light', ''],
  ['clock-light-compact',   { tool: 'timeClock', tab: 'clock' },      COMPACT, 'light', '?compact=1'],
  ['cn-log-light-compact',  { tool: 'callNotes', tab: 'callNotes' },  COMPACT, 'light', '?compact=1'],
  ['cn-log-dark-compact',   { tool: 'callNotes', tab: 'callNotes' },  COMPACT, 'dark',  '?compact=1'],
  ['clock-light-mobile',    { tool: 'timeClock', tab: 'clock' },      MOBILE, 'light', ''],
  ['cn-log-light-mobile',   { tool: 'callNotes', tab: 'callNotes' },  MOBILE, 'light', ''],
  // Cycle-16 Batch 4 — the matrix shot five of nine tools at ONE viewport, and
  // that gap is why F2 survived two interface-focused cycles: Reference's
  // reader measured 70px at 390px and `kb/script_kb.html` carried zero media
  // queries, but the only Reference scenario was `reference-light-wide`, where
  // the two-column shell is correct. Every REP-FACING tool now has a mobile
  // scenario, and the two mid-task tools (the ones whose pop-out the KB drawer
  // edge-tab treats as first-class) have a compact one.
  ['reference-light-mobile',  { tool: 'reference', tab: null },              MOBILE,  'light', ''],
  ['reference-light-compact', { tool: 'reference', tab: null },              COMPACT, 'light', '?compact=1'],
  ['intake-light-mobile',     { tool: 'intake',    tab: null },              MOBILE,  'light', ''],
  ['intake-light-compact',    { tool: 'intake',    tab: null },              COMPACT, 'light', '?compact=1'],
  ['metrics-light-mobile',    { tool: 'metrics',   tab: null },              MOBILE,  'light', ''],
  ['metrics-team-light-mobile', { tool: 'metrics', tab: 'metricsTeam' },     MOBILE,  'light', ''],
  ['training-light-mobile',   { tool: 'develop',   tab: null },              MOBILE,  'light', ''],
  // Cycle-17 Batch 7 — three coverage gaps the Visual Audit Stage had been
  // carrying as known-uncovered: (a) dark parity for Reference / Training /
  // Coaching (light-only until now — a theme defect there was unshootable);
  // (b) the Admin panel at ANY viewport (needed the getAutomationHealth-family
  // fixtures); (c) the first ERROR-STATE shots — `?failrpc=<name>` makes the
  // mock invoke the FAILURE handler for the named RPCs, so the
  // errorStateHtml_ paths (A12/INV-175: warn card + glyph, never an
  // empty-state) render on camera instead of only in source pins.
  ['reference-dark-wide',     { tool: 'reference', tab: null },              WIDE, 'dark',  ''],
  ['training-dark-wide',      { tool: 'develop',   tab: null },              WIDE, 'dark',  ''],
  ['coaching-dark-wide',      { tool: 'develop',   tab: 'coaching' },        WIDE, 'dark',  ''],
  ['admin-light-wide',        { tool: 'manage',    tab: 'callNotesAdmin' },  WIDE, 'light', ''],
  ['admin-dark-wide',         { tool: 'manage',    tab: 'callNotesAdmin' },  WIDE, 'dark',  ''],
  ['metrics-error-light-wide',    { tool: 'metrics',   tab: null },          WIDE,   'light', '?failrpc=getMyMetrics'],
  ['cn-log-error-light-wide',     { tool: 'callNotes', tab: 'callNotes' },   WIDE,   'light', '?failrpc=getMyCallNotes'],
  ['reference-error-light-mobile', { tool: 'reference', tab: null },         MOBILE, 'light', '?failrpc=getReferenceTree'],
  // Operator feedback 2026-08-06 — the two redesigned status views (combined
  // color-coded lists): fixtures cover all four DR tones + an overdue Spanish
  // pending card, so the tone vocabulary itself is on camera.
  ['spanish-light-wide',   { tool: 'metrics', tab: 'metricsSpanish' }, WIDE, 'light', ''],
  ['deptreq-light-wide',   { tool: 'metrics', tab: 'metricsDeptReq' }, WIDE, 'light', ''],
  // Operator 2026-08-17 (full-width round): the new .sp-top head+chart grid
  // stacks <1024px — shoot the stacked form so the breakpoint is on camera.
  ['spanish-light-mobile', { tool: 'metrics', tab: 'metricsSpanish' }, MOBILE, 'light', ''],
  // Operator 2026-08-18 (width round): Punctuality had never been shot — the
  // inner 780/820px caps survived two width passes because of it.
  ['punctuality-light-wide', { tool: 'manage', tab: 'punctuality' }, WIDE, 'light', ''],
  // QA module Phase 1 (2026-08-27): the queue list — status tones, assignee
  // pills, filter chips. The detail/player needs chunked audio and stays an
  // uncovered scenario (noted in the Visual Audit Stage).
  ['qa-queue-light-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'light', ''],
  ['qa-queue-light-mobile', { tool: 'qa', tab: 'qaQueue' }, MOBILE, 'light', ''],
  // QA Phase 2 — the per-agent stats table (mtRenderTable_ with dynamic
  // criterion columns; em dashes for null averages, the '(unassigned)' row).
  ['qa-stats-light-wide', { tool: 'qa', tab: 'qaStats' }, WIDE, 'light', ''],
  // QA Phase 3 — the agent-facing read-only My Reviews tab (canSeeQa-gated
  // since the 2026-08-28 operator decision; the persona here is a QA member).
  // The post hook presses Play on the first card, so the follow-on's
  // per-card player + waveform (real decode of the mock's WAV) are on camera.
  ['qa-myreviews-light-wide', { tool: 'qa', tab: 'qaMyReviews' }, WIDE, 'light', '', "qaMyRevPlay_('qaFileCccccccc3')"],
  // The recording DETAIL (follow-on 2026-08-28 — the standing matrix gap):
  // player assembled from the mock's real 1s WAV chunk, waveform, scorecard
  // form + list, comment timeline. Opened via the post hook (the sched-modal
  // precedent).
  ['qa-detail-light-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'light', '', "qaOpenDetail_('qaFileBbbbbbbb2')"],
  // F8 (cycle 18): Time / PTO is the most recently RESTRUCTURED rep-facing page
  // (consolidated to one page 2026-08-18 — quick-actions card + stacked rail)
  // and was shot only at 1440px, so the stacking of that new rail was never on
  // camera. Every other rep-facing tool has a mobile scenario; this closes the
  // gap the Visual Audit Stage's own claim already implied.
  ['timeoff-light-mobile', { tool: 'timeClock', tab: 'timeoff' }, MOBILE, 'light', ''],
  // Operator 2026-08-18 (fluid pop-out type, then the same day's narrow
  // round): the CN pop-out shrunk BELOW its 480px launch width. At 360px this
  // now shows the ≤400px STACKED framing — one-column trio, labels above
  // values, one-column save quadrant, note cards without the timestamp
  // column — with the clamp() type near its floor. Between 401 and 480px the
  // compact grids still hold (2-up trio, 84px labels) and only the type
  // scales; this scenario is the stacked side of that boundary, on camera.
  ['cn-log-light-compact-sm', { tool: 'callNotes', tab: 'callNotes' }, COMPACT_SM, 'light', '?compact=1'],
  // Pilot round 2 (2026-08-24): the scheduled-call reminders modal — the
  // matrix's first modal-state scenario (via the `post` hook). The fixture
  // carries one upcoming + one 2h-overdue item, so the overdue tone and the
  // Done/Cancel controls are on camera; the create form's label-for naming is
  // what a11y-names.mjs cannot reach (it walks tab landings too).
  ['cn-sched-modal-light-wide', { tool: 'callNotes', tab: 'callNotes' }, WIDE, 'light', '', 'cnOpenSchedModal_()'],
  // Round-3 follow-through: dark parity + the compact pop-out form of the same
  // modal (a theme or compact defect there was unshootable while the modal had
  // one scenario — the reference/training dark-parity lesson, batch ⑦).
  ['cn-sched-modal-dark-wide',     { tool: 'callNotes', tab: 'callNotes' }, WIDE,    'dark',  '', 'cnOpenSchedModal_()'],
  ['cn-sched-modal-light-compact', { tool: 'callNotes', tab: 'callNotes' }, COMPACT, 'light', '?compact=1', 'cnOpenSchedModal_()'],
  // Round-3 follow-ons: the OPEN Reference reader — comments thread (edit/
  // delete cluster, add form) + the feedback bar were unshootable while the
  // matrix only walked the Reference landing.
  ['reference-reader-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('kb-1')"],

  // Admin lands on OVERVIEW, so the CONFIG pane — where the operator-facing
  // editors live, incl. the 2026-08-25 Reference data-table upload — had no
  // coverage at all. One post-hook closes it (the sched-modal precedent).
  ['admin-config-light-wide', { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '', "cnAdminTab_('config')"],

  // A4 (2026-09-01): the Day Edit modal, rebuilt from four fixed slots to an
  // N-row break list. It had never been shot at all, which is how a modal that
  // silently collapsed a two-break day stayed invisible for as long as it did.
  // The fixture day carries TWO breaks, so the list, its numbering and the
  // remove controls are on camera; compact covers the pop-out width, where a
  // 3-column row (leave / return / remove) is the geometry most at risk.
  ['dayedit-light-wide',    { tool: 'manage', tab: 'manage' }, WIDE,    'light', '',
    "openDayEditModal('E-1077', 'Nina Patel')"],
  ['dayedit-dark-wide',     { tool: 'manage', tab: 'manage' }, WIDE,    'dark',  '',
    "openDayEditModal('E-1077', 'Nina Patel')"],
  ['dayedit-light-compact', { tool: 'manage', tab: 'manage' }, COMPACT, 'light', '?compact=1',
    "openDayEditModal('E-1077', 'Nina Patel')"],

  // Follow-on (2026-09-01): Manage Time was covered only at WIDE, so an inline
  // `grid-template-columns:1fr 1fr` on the analytics pair — which beats every
  // stylesheet rule, media queries included — kept a 44px page overflow at
  // 390px until it was measured by hand. On camera now so the next one is not.
  ['manage-light-mobile', { tool: 'manage', tab: 'manage' }, MOBILE, 'light', ''],
];

const only = process.argv[2] ? process.argv.slice(2) : null;
const report = [];
const browser = await chromium.launch({ executablePath: chromiumPath() });

for (const [name, nav, vp, mode, query, post] of SCENARIOS) {
  if (only && !only.some((o) => name.includes(o))) continue;
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode === 'dark' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  // umsTzWarnedDay: the fixture roster tz (Asia/Kolkata) never matches the
  // sandbox browser (UTC), so the once-a-day sticky tz-mismatch toast
  // (9c5df81) would cover the top of EVERY screenshot. Seed "already warned
  // today" — the steady state, same posture as the tour-seen flag.
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, mode);
  const fake = new Date(); fake.setUTCHours(9, 0, 0, 0);   // 14:30 IST mid-shift
  await page.clock.install({ time: fake });
  await page.goto(PAGE + query, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (nav.tool) {
    await page.evaluate(([tool, tab]) => { try { window.enterTool(tool, tab || undefined); } catch (e) { console.error('enterTool threw: ' + e.message); } }, [nav.tool, nav.tab]);
    await page.waitForTimeout(1800);
  }
  if (post) {
    await page.evaluate((code) => { try { (0, eval)(code); } catch (e) { console.error('post hook threw: ' + e.message); } }, post);
    await page.waitForTimeout(1000);
  }
  // Compact/mobile use viewport-clipped frames: a fullPage capture PAINTS
  // off-viewport fixed elements (the closed KB drawer, the mobile nav) into
  // the stitched image — artifacts that read as bugs. Wide uses fullPage.
  const clipView = vp.width < 900;
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !clipView });
  if (clipView) { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + '-bottom.png') }); }
  const missing = await page.evaluate(() => Array.from(new Set(window.__MISSING__ || [])));
  const view = await page.evaluate(() => (typeof currentView !== 'undefined' ? currentView : '?'));
  // Cycle-16 Batch 4 — the one thing a SCREENSHOT cannot tell you. CLAUDE.md's
  // A2 gotcha states the rule ("a squeezed layout and an overflowing one look
  // identical in a screenshot — re-measure scrollWidth vs clientWidth after any
  // stacking change") and the harness never implemented it, so every check was
  // a manual side-run. `overflowPx > 0` means the page scrolls sideways.
  // Elements inside a legitimate overflow-x:auto scroller (the tool tab bar)
  // do NOT count — only the DOCUMENT's own scroll width does.
  const layout = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  const overflowPx = Math.max(0, layout.scrollW - layout.clientW);
  report.push({
    name, view, missing,
    viewport: vp.width + 'x' + vp.height,
    overflowPx,
    errors: Array.from(new Set(errors)).slice(0, 8),
  });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
const overflowing = report.filter((r) => r.overflowPx > 0);
if (overflowing.length) {
  console.log('\nHORIZONTAL OVERFLOW (the page scrolls sideways — measure, do not eyeball):');
  overflowing.forEach((r) => console.log('  ' + r.name + '  +' + r.overflowPx + 'px @ ' + r.viewport));
}
const fixtureGaps = report.filter((r) => r.missing.length);
if (fixtureGaps.length) {
  console.log('\nMISSING FIXTURES (these scenarios rendered a LOADER, not the real view):');
  fixtureGaps.forEach((r) => console.log('  ' + r.name + '  ' + r.missing.join(', ')));
}
