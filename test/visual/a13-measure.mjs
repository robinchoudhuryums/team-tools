// A13 spot-measure: prove the <h2> conversion is pixel-identical to the
// <span>/<div> it replaced, for the three section-heading classes. The scenario
// matrix does not reach Team Training (its `develop` shot lands on My Training),
// so tr-card-title needs a direct measurement rather than a screenshot.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Same Chromium resolution as shoot.mjs — the managed download is absent here.
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) {
        const exe = path.join(root, hit, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return exe;
      }
    } catch (e) { /* keep looking */ }
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.setContent(fs.readFileSync(path.join(dir, 'page.html'), 'utf8'), { waitUntil: 'load' });

// Each case is measured INSIDE its real parent. That matters: .tr-card-h and
// .dash-card-head are `display: flex`, which blockifies any child — so a bare
// `display: inline -> block` delta measured in a plain div is an artifact of
// the fixture, not of the app. Mirroring the real contract is the harness's own
// rule (test/visual/README.md).
const CASES = [
  // cls,             oldTag, parent markup,                              sibling
  ['card-label', 'div', '<div class="card"></div>', '<span>Label</span>', ''],
  ['tr-card-title', 'span', '<div class="tr-card"><div class="tr-card-h"></div></div>', 'Label',
    '<span class="tr-card-badge">3</span>'],
  ['dash-seclabel', 'span', '<div class="dash-card"><div class="dash-card-head"></div></div>', 'Label',
    '<span class="tr-card-badge">3</span>'],
];

const out = await page.evaluate((cases) => {
  const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'color',
    'textTransform', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'display', 'lineHeight'];
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px';
  document.body.appendChild(host);
  const read = (tag, cls, parentHtml, inner, sibling) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = parentHtml;
    host.appendChild(wrap);
    // Deepest element of the parent chain is where the heading goes.
    let slot = wrap.firstElementChild;
    while (slot.firstElementChild) slot = slot.firstElementChild;
    const el = document.createElement(tag);
    el.className = cls;
    el.innerHTML = inner;
    slot.appendChild(el);
    if (sibling) slot.insertAdjacentHTML('beforeend', sibling);
    const cs = getComputedStyle(el);
    const o = {};
    PROPS.forEach((p) => { o[p] = cs[p]; });
    const r = el.getBoundingClientRect();
    o._box = [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100].join('x');
    // The whole head row's height is what a reader actually perceives.
    o._row = Math.round(slot.getBoundingClientRect().height * 100) / 100;
    return o;
  };
  return cases.map(([cls, oldTag, parentHtml, inner, sibling]) => {
    const oldS = read(oldTag, cls, parentHtml, inner, sibling);
    const newS = read('h2', cls, parentHtml, inner, sibling);
    const diffs = Object.keys(oldS).filter((k) => String(oldS[k]) !== String(newS[k]));
    return { cls, oldTag, diffs: diffs.map((k) => k + ': ' + oldS[k] + ' -> ' + newS[k]),
      h: [oldS._box + ' row ' + oldS._row, newS._box + ' row ' + newS._row] };
  });
}, CASES);

let bad = 0;
out.forEach((r) => {
  const ok = r.diffs.length === 0;
  if (!ok) bad++;
  console.log((ok ? 'IDENTICAL ' : 'DIFFERS   ') + r.cls + '  (<' + r.oldTag + '> -> <h2>)  height ' +
    r.h[0] + ' -> ' + r.h[1] + (ok ? '' : '\n    ' + r.diffs.join('\n    ')));
});
await browser.close();
process.exit(bad ? 1 : 0);
