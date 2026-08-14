// Ad-hoc measurement: the Settings flyout + View-as preview (operator
// 2026-08-13). Not part of the matrix — run on demand.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(here, 'page.html');

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) { const exe = path.join(root, hit, 'chrome-linux', 'chrome'); if (fs.existsSync(exe)) return exe; }
    } catch {}
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(PAGE + '?tool=clock', { waitUntil: 'load' });
await page.waitForTimeout(900);

// 1 ── sidebar has ONE settings row (gear + pop-out), no stacked control rows
const shell = await page.evaluate(() => ({
  sidebarRows: document.querySelectorAll('.sidebar .sb-theme').length,
  sidebarPals: document.querySelectorAll('.sidebar .sb-pal-toggle').length,
  gears: document.querySelectorAll('[data-settings-toggle]').length,
  panelHidden: document.getElementById('settings-panel').hasAttribute('hidden'),
  panelDisplay: getComputedStyle(document.getElementById('settings-panel')).display,
}));
console.log('shell:', JSON.stringify(shell));

// 2 ── open the panel from the sidebar gear: position, live aria, controls
await page.click('.sb-settings-btn');
await page.waitForTimeout(120);
const open = await page.evaluate(() => {
  const p = document.getElementById('settings-panel');
  const r = p.getBoundingClientRect();
  const gear = document.querySelector('.sb-settings-btn');
  return {
    visible: !p.hasAttribute('hidden') && getComputedStyle(p).display !== 'none',
    onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    ariaSidebar: gear.getAttribute('aria-expanded'),
    ariaHeader: document.querySelector('.hdr-settings-btn').getAttribute('aria-expanded'),
    themeBtns: p.querySelectorAll('[data-theme-target]').length,
    palBtns: p.querySelectorAll('[data-palette-target]').length,
    remindBtns: p.querySelectorAll('[data-remind]').length,
    viewAsBtns: p.querySelectorAll('[data-viewas]').length,
  };
});
console.log('open:', JSON.stringify(open));
await page.screenshot({ path: 'shots/settings-open.png' });

// 3 ── Esc closes and aria follows
await page.keyboard.press('Escape');
await page.waitForTimeout(80);
const closed = await page.evaluate(() => ({
  hidden: document.getElementById('settings-panel').hasAttribute('hidden'),
  aria: document.querySelector('.sb-settings-btn').getAttribute('aria-expanded'),
}));
console.log('after Esc:', JSON.stringify(closed));

// 4 ── View as CSR: banner up, manager/admin chrome gone, exit restores
await page.click('.sb-settings-btn');
await page.click('[data-viewas="csr"]');
await page.waitForTimeout(700);
const csr = await page.evaluate(() => ({
  banner: !!document.querySelector('.viewas-banner'),
  bannerText: (document.querySelector('.viewas-banner') || {}).textContent?.trim().slice(0, 60),
  manageTool: !!document.querySelector('.sb-link[data-tool="manage"]'),
  spanishTab: !!document.querySelector('[data-view="metricsSpanish"]'),
  isMgrFlag: window.h ? undefined : undefined,
  tabs: [...document.querySelectorAll('#tool-tab-bar .tt-btn')].map((b) => b.textContent.trim()),
}));
console.log('as CSR:', JSON.stringify(csr));
await page.screenshot({ path: 'shots/settings-viewas-csr.png' });

// 5 ── exit preview via the banner
await page.click('.viewas-exit');
await page.waitForTimeout(700);
const back = await page.evaluate(() => ({
  banner: !!document.querySelector('.viewas-banner'),
  manageTool: !!document.querySelector('.sb-link[data-tool="manage"]'),
}));
console.log('after exit:', JSON.stringify(back));

// 6 ── mobile header gear at 390px: panel opens on-screen
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.click('.hdr-settings-btn');
await page.waitForTimeout(120);
const mobile = await page.evaluate(() => {
  const p = document.getElementById('settings-panel');
  const r = p.getBoundingClientRect();
  return { visible: !p.hasAttribute('hidden'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
console.log('mobile:', JSON.stringify(mobile));
await page.screenshot({ path: 'shots/settings-mobile.png' });

await browser.close();
console.log('done');
