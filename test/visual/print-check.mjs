// One-off MEASUREMENT of the print stylesheet (styles.html @media print): the
// batch-8 overlay rules, and (Batch M4) rule (4), one manual section by its Print button.
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
// Batch M4 — rule (4): ONE manual section printed by its Print button. The
// marks come off after the dialog, so print() is stubbed and the page is
// measured while they are on: only the section (and its ancestors) display,
// at full width, and its own controls do not.
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, mode);
  await page.goto(PAGE);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.enterTool('reference'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.kbOpenItem_('man-0-11'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.print = () => {}; window.kbPrintSection_(document.querySelector('#kb-man-sec-man-0-11 .kb-man-print')); });
  await page.emulateMedia({ media: 'print' });
  const one = await page.evaluate(() => {
    const vis = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; };
    const sec = document.getElementById('kb-man-sec-man-0-11');
    return {
      marked: document.documentElement.hasAttribute('data-print-one'),
      section: vis('#kb-man-sec-man-0-11'), otherSection: vis('#kb-man-sec-man-0-10'),
      sidebar: vis('.sidebar'), rail: vis('.kb-side'), title: vis('.view-title-row'),
      sectionButtons: vis('.print-one .kb-man-sec-acts'), feedback: vis('.print-one .kb-man-fb'),
      sectionLeft: Math.round(sec.getBoundingClientRect().left), sectionWidth: Math.round(sec.getBoundingClientRect().width),
      ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
    };
  });
  results.push({ mode, printOneSection: one });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
