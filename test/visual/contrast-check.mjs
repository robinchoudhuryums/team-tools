// The contrast sweep, checked against pairs whose answer is known (cycle 26).
//
// contrast.cjs's maths is driven by the Node harness; its WALK — which
// elements it reads, what it composites behind them, what it refuses to judge
// — only means something in a browser that lays a page out and computes its
// colours. This loads a small page of known pairs in Chromium and compares the
// sweep's answer with the one worked out by hand. A sweep that reported
// nothing would pass every screen it was pointed at; this is what says it can
// fail.
//
//   node contrast-check.mjs        (CI runs it in the visual job; no build needed)
import { chromium } from 'playwright';
import { chromiumPath } from './chromium-path.cjs';
import contrast from './contrast.cjs';

const PAGE = `<!doctype html><html><head><style>
  body { margin: 0; background: #fff; color: #000; font: 16px/1.4 sans-serif; }
  div, button { margin: 4px; padding: 4px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style></head><body>
  <div class="c-pass">black on white, twenty-one to one</div>
  <div class="c-low" style="color:#777">grey 777 on white is 4.48</div>
  <div class="c-edge" style="color:#767676">grey 767676 on white is 4.54</div>
  <div class="c-large" style="color:#777; font-size:24px">large text needs three</div>
  <div class="c-bold" style="color:#777; font-size:19px; font-weight:700">bold at 19px is large</div>
  <div class="c-bold18" style="color:#777; font-size:18px; font-weight:700">bold at 18px is not</div>
  <div style="background:#fff"><div class="c-alpha" style="background:rgba(0,0,0,.5); color:#fff">white on half black over white</div></div>
  <div style="opacity:.5"><div class="c-opacity" style="color:#000; background:#fff">black at half opacity</div></div>
  <div class="c-image" style="background-image:linear-gradient(#fff,#eee); color:#ccc">over a gradient</div>
  <div style="background-image:linear-gradient(#fff,#eee)"><div style="background:#222"><div class="c-covered" style="color:#555">an opaque colour covers the gradient</div></div></div>
  <div style="background:#222"><div class="c-inherit" style="color:#fff">white on the parent's dark</div></div>
  <button class="c-disabled" disabled style="color:#ccc; background:#fff">disabled is outside 1.4.3</button>
  <div class="c-none" style="display:none; color:#eee">not displayed</div>
  <div class="c-invisible" style="opacity:0; color:#eee">fully transparent</div>
  <div class="sr c-sr" style="color:#eee">visually hidden</div>
  <div class="c-mix" style="color:color-mix(in oklab, red, white 50%)">a colour the browser mixes</div>
  <div class="c-twice" style="color:#777">the same pair again</div>
  <div class="c-twice" style="color:#777">the same pair again</div>
</body></html>`;

// What each class must be: 'low' (reported), or 'ok' (read and passed).
const WANT_LOW = {
  'div.c-low': 4.48,
  'div.c-bold18': 4.48,
  'div.c-alpha': 3.98,      // #fff on #7f7f7f–#808080 (a half alpha is 127 or 128 of 255)
  'div.c-opacity': 3.95,    // #808080 on #fff
  'div.c-covered': 2.14,    // #555 on #222 — judged against the colour that covers the gradient
  'div.c-twice': 4.48,      // listed once, counted twice
};

const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
await page.setContent(PAGE, { waitUntil: 'load' });
const got = await page.evaluate(contrast.SWEEP);
await browser.close();

const problems = [];
const byEl = new Map(got.low.map((l) => [l.el, l]));
Object.keys(WANT_LOW).forEach((el) => {
  const l = byEl.get(el);
  if (!l) problems.push(el + ': not reported (wanted ' + WANT_LOW[el] + ':1)');
  else if (Math.abs(l.ratio - WANT_LOW[el]) > 0.04) problems.push(el + ': ' + l.ratio + ':1, wanted ' + WANT_LOW[el] + ':1');
});
got.low.forEach((l) => { if (!(l.el in WANT_LOW) && l.el !== 'div.c-mix') problems.push(l.el + ': reported at ' + l.ratio + ':1 and should not be'); });
// The mixed colour: read as the pink it is (not as black, which is what an unparsed colour falls back to).
const mix = byEl.get('div.c-mix');
if (!mix) problems.push('div.c-mix: a colour-mix() pink on white was not reported — was it read as black?');
else if (!(mix.ratio > 1.5 && mix.ratio < 3.5)) problems.push('div.c-mix: ' + mix.ratio + ':1 (' + mix.fg + '), wanted a mid pink');
// 12 elements are read (everything but the gradient, the disabled button and the three hidden ones); 1 is over an image.
if (got.checked !== 13) problems.push('checked ' + got.checked + ' elements, wanted 13');
if (got.unchecked !== 1) problems.push('unchecked ' + got.unchecked + ', wanted 1 (the text over a gradient is not judged, and is counted)');
if (got.lowCount !== 8) problems.push('lowCount ' + got.lowCount + ', wanted 8 (the repeated pair counts twice and lists once)');

console.log('CONTRAST CHECK (' + (Object.keys(WANT_LOW).length + 4) + ' known pairs): ' + (problems.length ? 'FAIL' : 'PASS'));
problems.forEach((p) => console.log('  ' + p));
if (problems.length) { console.log(JSON.stringify(got, null, 2)); process.exit(1); }
