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
  report.push({ name, view, missing, errors: Array.from(new Set(errors)).slice(0, 8) });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
