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
  // (Phase 2 renamed kbPrintSection_(btn) to kbPrintSectionById_(id); the 1.5s
  // clear timer is held off so the marks are still on when the page is measured)
  await page.evaluate(() => { window.print = () => {}; const st = window.setTimeout; window.setTimeout = (f, ms) => (ms === 1500 ? 0 : st(f, ms)); window.kbPrintSectionById_('man-0-11'); window.setTimeout = st; });
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
      // Phase 8: <body> carries data-mode too, so the ink must be read where the text inherits it
      bodyInk: getComputedStyle(document.body).getPropertyValue('--ink').trim(),
      textColor: getComputedStyle(sec.querySelector('.kb-article p')).color,
      chapterColor: getComputedStyle(sec).getPropertyValue('--man-c').trim(),
    };
  });
  results.push({ mode, printOneSection: one });
  await page.close();
}
// 2026-10-12 — dark mode prints the LIGHT accent: a cross-reference link in a
// dark-mode printout, in every palette, reads at least 4.5:1 on white paper.
const lum = (rgb) => {
  const c = (rgb.match(/[\d.]+/g) || []).slice(0, 3).map((v) => { v = +v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
for (const pal of ['console', 'sand', 'sage', 'plum', 'teal']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((p) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', 'dark'); if (p !== 'console') localStorage.setItem('umsTheme', p); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, pal);
  await page.goto(PAGE);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.enterTool('reference'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.kbOpenItem_('man-0-11'));
  await page.waitForTimeout(1200);
  const screenLink = await page.evaluate(() => getComputedStyle(document.querySelector('#kb-man-sec-man-0-11 a.kb-xref')).color);
  await page.evaluate(() => { window.print = () => {}; const st = window.setTimeout; window.setTimeout = (f, ms) => (ms === 1500 ? 0 : st(f, ms)); window.kbPrintSectionById_('man-0-11'); window.setTimeout = st; });
  await page.emulateMedia({ media: 'print' });
  const link = await page.evaluate(() => ({
    palette: document.documentElement.getAttribute('data-palette') || 'console',
    mode: document.documentElement.getAttribute('data-mode'),
    color: getComputedStyle(document.querySelector('#kb-man-sec-man-0-11 a.kb-xref')).color,
    // a color-mix() resolves to oklab(...): paint it to read it back as sRGB
    rgb: (() => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = getComputedStyle(document.querySelector('#kb-man-sec-man-0-11 a.kb-xref')).color; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')'; })(),
  }));
  link.screen = screenLink;
  link.contrastOnWhite = +(1.05 / (lum(link.rgb) + 0.05)).toFixed(2);
  results.push({ darkPrintLink: link });
  await page.close();
}
// Phase 8 (M19) — a Quick Reference Card from a chapter's masthead prints AS a
// card: the root flag, the chapter-colour band, two columns, the diagram after
// the text with a page break before it, and the light chapter colour in either mode.
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, mode);
  await page.goto(PAGE);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.enterTool('reference'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.kbOpenItem_('man-5-1'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.print = () => {}; const st = window.setTimeout; window.setTimeout = (f, ms) => (ms === 1500 ? 0 : st(f, ms)); window.kbPrintSectionById_('man-c-5'); window.setTimeout = st; });
  await page.emulateMedia({ media: 'print' });
  const card = await page.evaluate(() => {
    const c = document.querySelector('.kb-man-card.print-one');
    if (!c) return { marked: false };
    const fig = c.querySelector('.kb-man-card-art > figure'), cols = c.querySelector('.kb-man-card-cols');
    return {
      marked: document.documentElement.hasAttribute('data-print-card'),
      band: getComputedStyle(c.querySelector('.kb-man-card-h')).backgroundColor,
      columns: getComputedStyle(cols).columnCount,
      figureAfterText: !!(fig && (cols.compareDocumentPosition(fig) & 4)) && fig.getBoundingClientRect().top >= cols.getBoundingClientRect().bottom,
      figureBreak: fig ? getComputedStyle(fig).breakBefore : null,
      printButton: getComputedStyle(c.querySelector('.kb-man-card-pr')).display,
      chapterColor: getComputedStyle(c).getPropertyValue('--man-c').trim(),
    };
  });
  results.push({ mode, printCard: card });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
