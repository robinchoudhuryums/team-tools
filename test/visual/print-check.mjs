// One-off MEASUREMENT of the batch-8 print stylesheet (styles.html @media print).
// A print block cannot be verified by reading it: `print-color-adjust` and
// `:has()` interactions only exist in a real engine. Run after `node build.mjs`.
//   node print-check.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(HERE, 'page.html');
function chromiumPath() {
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) { const exe = path.join(root, hit, 'chrome-linux', 'chrome'); if (fs.existsSync(exe)) return exe; }
    } catch (e) {}
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: chromiumPath() });
const results = [];
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, mode);
  await page.goto(PAGE);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.enterTool('timeClock', 'timeoff'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.openPayStatement_(0, '', ''));
  await page.waitForTimeout(900);
  const screen = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
    return { sidebar: g('.sidebar') && g('.sidebar').display, ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() };
  });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(200);
  const p = await page.evaluate(() => {
    const disp = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent'; };
    const modal = document.querySelector('.overlay.open .modal');
    const cs = modal ? getComputedStyle(modal) : null;
    return {
      ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
      paper: getComputedStyle(document.documentElement).getPropertyValue('--paper-card').trim(),
      sidebar: disp('.sidebar'), tabbar: disp('.tool-tab-bar'), mobileNav: disp('.mobile-nav'),
      toasts: disp('.toast-stack'), appShell: disp('.app-shell'),
      noPrintBtn: disp('.overlay.open .no-print'),
      modalMaxHeight: cs && cs.maxHeight, modalOverflowY: cs && cs.overflowY,
      modalScrollH: modal && modal.scrollHeight, modalClientH: modal && modal.clientHeight,
      overlayPos: getComputedStyle(document.querySelector('.overlay.open')).position,
    };
  });
  results.push({ mode, screenInk: screen.ink, screenSidebar: screen.sidebar, print: p });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
