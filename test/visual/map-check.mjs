// Ad-hoc measurement for the ```map block + the article-image fallback
// (operator 2026-08-13). Not part of the matrix — run on demand.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const page_html = 'file://' + path.join(here, 'page.html');

// Same Chromium resolution as shoot.mjs.
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
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' && !/fonts|net::/i.test(m.text())) console.log('console.error:', m.text()); });
await page.goto(page_html, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

// 1 ── render a map fence through the real kbMd_ into a real .kb-article
const fence = [
  '# Warehouse locations', '',
  'Find the closest shipping point before quoting a delivery window.', '',
  '```map',
  'wh| Dallas Warehouse: 4600 S Westmoreland Rd, Dallas, TX 75237',
  'wh| Phoenix Warehouse: 2020 N 22nd Ave, Phoenix, AZ 85009',
  'wh| Tampa Warehouse: 5440 W Crenshaw St, Tampa, FL 33634',
  '```',
].join('\n');
await page.evaluate((src) => {
  document.body.insertAdjacentHTML('beforeend',
    '<div id="map-probe" style="position:fixed;inset:0;overflow:auto;background:var(--paper);z-index:9999;padding:20px;">' +
    '<div class="kb-article" style="max-width:760px;margin:0 auto;">' + window.kbMd_(src) + '</div></div>');
}, fence);
const structure = await page.evaluate(() => ({
  rows: document.querySelectorAll('#map-probe .kb-map-row').length,
  buttons: document.querySelectorAll('#map-probe .kb-map-embed-btn').length,
  count: document.querySelector('#map-probe .kb-ros-count')?.textContent,
  note: !!document.querySelector('#map-probe .kb-map-note'),
}));
console.log('structure:', JSON.stringify(structure));
await page.screenshot({ path: 'shots/map-wide.png' });

// 2 ── mocked lookup → results render, per-row chips fill, names escape
await page.evaluate(() => {
  window.google = { script: { run: {
    withSuccessHandler(fn) { this._ok = fn; return this; },
    withFailureHandler(fn) { this._ko = fn; return this; },
    kbMapDistances(q, addrs) {
      const ok = this._ok;
      setTimeout(() => ok({ success: true, formatted: 'Dallas, TX 75201, USA',
        results: [{ i: 0, miles: 6.2 }, { i: 1, miles: 887.4 }, { i: 2, miles: null }] }), 30);
    },
  } } };
  const input = document.querySelector('#map-probe .kb-map-q');
  input.value = '75201';
  window.kbMapLookup_(input);
});
await page.waitForTimeout(200);
const lookup = await page.evaluate(() => {
  const out = document.querySelector('#map-probe .kb-map-results');
  const chips = [...document.querySelectorAll('#map-probe [data-dist]')].map((c) => c.textContent);
  const items = [...out.querySelectorAll('li')].map((l) => l.textContent.trim());
  return { from: out.querySelector('.kb-map-from')?.textContent, items, chips,
    dirHrefs: [...out.querySelectorAll('a')].map((a) => a.href).slice(0, 1) };
});
console.log('lookup:', JSON.stringify(lookup, null, 1));
await page.screenshot({ path: 'shots/map-lookup.png' });

// 3 ── embed toggle: lazy iframe + aria-expanded in step (read the LIVE attr)
const embed = await page.evaluate(() => {
  const btn = document.querySelector('#map-probe .kb-map-embed-btn');
  window.kbMapToggleEmbed_(btn);
  const row = btn.closest('.kb-map-row');
  const f = row.querySelector('.kb-map-embed iframe');
  const open = { aria: btn.getAttribute('aria-expanded'), src: f && f.src, hidden: row.querySelector('.kb-map-embed').hasAttribute('hidden') };
  window.kbMapToggleEmbed_(btn);
  const closed = { aria: btn.getAttribute('aria-expanded'), hidden: row.querySelector('.kb-map-embed').hasAttribute('hidden') };
  return { open, closed };
});
console.log('embed:', JSON.stringify(embed));

// 4 ── 400px (drawer width): no horizontal overflow inside the probe
await page.setViewportSize({ width: 400, height: 800 });
await page.waitForTimeout(150);
const overflow = await page.evaluate(() => {
  const el = document.getElementById('map-probe');
  return { scrollW: el.scrollWidth, clientW: el.clientWidth };
});
console.log('400px overflow:', JSON.stringify(overflow));
await page.screenshot({ path: 'shots/map-drawer.png' });

// 5 ── image fallback: a broken Drive thumbnail swaps to the mocked data URL
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
await page.evaluate((px) => {
  window.google.script.run.kbGetImageData = function (fileId) {
    const ok = this._ok;
    setTimeout(() => ok({ success: true, dataUrl: px }), 30);
  };
  document.getElementById('map-probe').insertAdjacentHTML('beforeend',
    '<div class="kb-article" id="img-probe">' +
    '<img id="img-a" src="https://drive.google.com/thumbnail?id=fbTestFile01&sz=w1200" alt="a">' +
    '<img id="img-b" src="https://drive.google.com/thumbnail?id=fbTestFile01&sz=w1200" alt="b">' +
    '<img id="img-x" src="https://elsewhere.example/pic.png" alt="external"></div>');
}, PIXEL);
await page.waitForTimeout(900);
const imgs = await page.evaluate(() => ({
  a: document.getElementById('img-a').src.slice(0, 22),
  b: document.getElementById('img-b').src.slice(0, 22),
  x: document.getElementById('img-x').src.slice(0, 30),
  cacheKeys: Object.keys(window.KB_IMG_FB.cache),
}));
console.log('image fallback:', JSON.stringify(imgs));

await browser.close();
console.log('done');
