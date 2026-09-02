// PR 6 (Time Clock) — MEASURE the fold claim rather than assert it: the rail
// reorder (clock card → punch actions → shift strip) + the retired world-clock
// strip / next-break chip are supposed to bring the punch buttons above the
// fold at 1440×900. Prints the primary punch button's top edge + the clock
// card's height on the LIVE clock scenario. Run before and after; the diff is
// the evidence. `node build.mjs` first.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) { const exe = path.join(root, hit, 'chrome-linux', 'chrome'); if (fs.existsSync(exe)) return exe; }
    } catch (e) { /* keep looking */ }
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const html = fs.readFileSync(path.join(dir, 'page.html'), 'utf8');
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => window.enterTool && window.enterTool('timeClock', 'clock'));
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) }; };
  return { sky: r('#clk-sky'), prime: r('.actions .prime'), actions: r('.actions'), strip: r('.shift-strip'), needsyou: r('#dash-needsyou'),
    viewport: window.innerHeight, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
});
console.log(JSON.stringify(out));
await browser.close();
