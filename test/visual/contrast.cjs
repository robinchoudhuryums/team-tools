// The visual matrix's contrast sweep (cycle 26, second pass over the Batch 8
// follow-ons).
//
// WHY IT EXISTS. `node shoot.mjs --axe` is the handbook's WCAG gate, and a local
// PASS was not CI's: axe marks a colour pair it cannot resolve "incomplete"
// (not a violation), and which pairs it can resolve differs between Chromium
// builds — three runs went red in CI on pairs the same command had passed
// here (a 3.34:1 kicker, a 4.34:1 chip, a 4.34:1 pill). This sweep does not
// ask axe. It reads every text element's own colour and the colours actually
// painted behind it, composites them the way the browser does, and computes
// the WCAG 2.1 ratio itself — so the answer is the same on every build.
//
// WHAT IT CANNOT SEE, and says so: text over a background IMAGE or gradient is
// counted `unchecked`, never passed; SVG text (drawn with `fill`) is not read;
// a positioned element is judged against its DOM ancestors, not against
// whatever it happens to float over. Placeholder text and disabled controls
// are outside WCAG 1.4.3 and are skipped.
//
// CommonJS, and the maths is separate from the DOM walk, so the Node harness
// drives the maths and `contrast-check.mjs` drives the walk in Chromium.
'use strict';

// WCAG 2.1 relative luminance of an sRGB colour [r, g, b] (0–255).
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// 1.4.3: 3:1 for large text (24px, or 18.66px bold), 4.5:1 otherwise.
function need(px, weight) {
  return (px >= 24 || (px >= 18.66 && weight >= 700)) ? 3 : 4.5;
}
// `top` [r, g, b, a] painted over the opaque `under` [r, g, b].
function over(top, under) {
  const a = top[3] === undefined ? 1 : top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a)];
}
// An element with `opacity: o` is painted as a group: what it drew over its
// backdrop, mixed back with the backdrop.
function mix(o, inner, backdrop) {
  return [inner[0] * o + backdrop[0] * (1 - o), inner[1] * o + backdrop[1] * (1 - o), inner[2] * o + backdrop[2] * (1 - o)];
}
// The pair one text element shows. `chain` is the element's ancestors from the
// root down to the element itself: [{ bg: [r,g,b,a], op }], and
// `fg` the text colour [r,g,b,a]. Returns { fg, bg } as opaque colours.
function paint(chain, fg, canvas) {
  const walk = (i, backdrop, text) => {
    const e = chain[i];
    const here = over(e.bg, backdrop);
    const inner = i === chain.length - 1 ? (text ? over(fg, here) : here) : walk(i + 1, here, text);
    return mix(e.op, inner, backdrop);
  };
  return { fg: walk(0, canvas, true), bg: walk(0, canvas, false) };
}

// Runs IN THE PAGE (serialised by `SWEEP` below). `m` is the maths above.
function inPage(m) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const seen = new Map();
  // Any CSS colour the browser computes — rgb(), color(srgb …), oklab() —
  // read back as sRGB through a canvas rather than parsed by hand.
  const rgba = (css) => {
    if (seen.has(css)) return seen.get(css);
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    const out = [d[0], d[1], d[2], d[3] / 255];
    seen.set(css, out);
    return out;
  };
  const low = [];
  const keys = new Set();
  let checked = 0, unchecked = 0, lowCount = 0;
  const all = document.body ? document.body.getElementsByTagName('*') : [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el instanceof SVGElement) continue;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'OPTION' || tag === 'TEMPLATE') continue;
    let own = '';
    for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility !== 'visible') continue;
    if ((cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*(50|100)%/.test(cs.clipPath))) continue;
    if (el.closest('[disabled], [aria-disabled="true"], [inert], [aria-hidden="true"]')) continue;
    // Every ancestor, to the root: a colour painted opaque covers what is above
    // it — unless a group in between is itself see-through (`opacity` under 1),
    // which lets it show again. An image that is not covered cannot be judged.
    const chain = [];
    let image = false, gone = false, covered = false;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const s = a === el ? cs : getComputedStyle(a);
      let op = parseFloat(s.opacity);
      if (isNaN(op)) op = 1;
      if (op === 0) { gone = true; break; }
      const bg = rgba(s.backgroundColor);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !(covered && op === 1)) { image = true; break; }
      chain.unshift({ bg, op });
      if (op < 1) covered = false;
      else if (bg[3] === 1) covered = true;
    }
    if (gone) continue;
    if (image) { unchecked++; continue; }
    checked++;
    const shown = m.paint(chain, rgba(cs.color), [255, 255, 255]);
    const got = m.ratio(shown.fg, shown.bg);
    const px = parseFloat(cs.fontSize) || 0;
    const wt = parseInt(cs.fontWeight, 10) || 400;
    const want = m.need(px, wt);
    // Two decimals, as axe reports it — 4.496 is under 4.5.
    if (Math.round(got * 100) / 100 < want) {
      lowCount++;
      const name = tag.toLowerCase() + (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      const hex = (c) => '#' + c.map((v) => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
      const key = name + ' ' + hex(shown.fg) + ' ' + hex(shown.bg);
      if (keys.has(key)) continue;
      keys.add(key);
      if (low.length < 12) low.push({ el: name, ratio: Math.round(got * 100) / 100, need: want, fg: hex(shown.fg), bg: hex(shown.bg), px: Math.round(px), text: own.slice(0, 24) });
    }
  }
  return { low, lowCount, checked, unchecked };
}

// The expression `page.evaluate` runs: the walk, handed the same maths the
// Node harness drives. The maths is declared by NAME inside the expression,
// because each function calls its siblings by name.
const MATHS = [lum, ratio, need, over, mix, paint];
const SWEEP = '(function () { ' + MATHS.map((f) => f.toString()).join('\n') +
  '\nreturn (' + inPage.toString() + ')({ ' + MATHS.map((f) => f.name).join(', ') + ' }); })()';

module.exports = { lum, ratio, need, over, mix, paint, inPage, SWEEP };
