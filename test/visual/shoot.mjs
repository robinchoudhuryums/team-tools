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
const MOBILE = { width: 390, height: 844 };

// [name, {tool, tab}, viewport, mode, query]
const SCENARIOS = [
  ['clock-light-wide',      { tool: 'timeClock', tab: 'clock' },      WIDE, 'light', ''],
  ['clock-dark-wide',       { tool: 'timeClock', tab: 'clock' },      WIDE, 'dark',  ''],
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
];

const only = process.argv[2] ? process.argv.slice(2) : null;
const report = [];
const browser = await chromium.launch({ executablePath: chromiumPath() });

for (const [name, nav, vp, mode, query] of SCENARIOS) {
  if (only && !only.some((o) => name.includes(o))) continue;
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode === 'dark' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); } catch (e) {} }, mode);
  const fake = new Date(); fake.setUTCHours(9, 0, 0, 0);   // 14:30 IST mid-shift
  await page.clock.install({ time: fake });
  await page.goto(PAGE + query, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (nav.tool) {
    await page.evaluate(([tool, tab]) => { try { window.enterTool(tool, tab || undefined); } catch (e) { console.error('enterTool threw: ' + e.message); } }, [nav.tool, nav.tab]);
    await page.waitForTimeout(1800);
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
