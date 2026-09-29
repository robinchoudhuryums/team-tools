#!/usr/bin/env python3
"""Flags SVG text that spills outside the box or diamond it sits in."""
import sys, json
from playwright.sync_api import sync_playwright
page = sys.argv[1]
JS = r"""
() => {
  const out = [];
  document.querySelectorAll('main .fig svg').forEach((svg, si) => {
    const shapes = [...svg.querySelectorAll('rect, polygon')].map(s => {
      const r = s.getBoundingClientRect(); return {b: {x: r.left, y: r.top, width: r.width, height: r.height}, poly: s.tagName === 'polygon'};
    }).filter(s => s.b.width > 24 && s.b.height > 14 && s.b.width < svg.getBoundingClientRect().width * 0.94);
    svg.querySelectorAll('text').forEach(t => {
      const r = t.getBoundingClientRect(); if (!t.textContent.trim()) return;
      const tb = {x: r.left, y: r.top, width: r.width, height: r.height};
      const ax = tb.x + tb.width / 2, ay = tb.y + tb.height / 2;
      const hosts = shapes.filter(s => ax > s.b.x && ax < s.b.x + s.b.width && ay > s.b.y && ay < s.b.y + s.b.height)
                          .sort((a, c) => a.b.width * a.b.height - c.b.width * c.b.height);
      if (!hosts.length) return;
      const h = hosts[0].b, pad = 2;
      let over = Math.max(h.x + pad - tb.x, tb.x + tb.width - (h.x + h.width - pad), 0);
      if (hosts[0].poly) {           // diamond: usable half-width shrinks away from the centre line
        const cy = h.y + h.height / 2, dy = Math.abs(ay - cy);
        const half = (h.width / 2) * (1 - dy / (h.height / 2));
        over = Math.max(Math.abs(ax - (h.x + h.width / 2)) + tb.width / 2 - half + pad, 0);
      }
      if (over > 1) out.push({svg: si, text: t.textContent.trim().slice(0, 44), over: Math.round(over)});
      // text running into a neighbouring box it doesn't belong to
      for (const s of shapes) {
        if (hosts.includes(s) || s.poly) continue;
        const b = s.b;
        const ix = Math.min(tb.x + tb.width, b.x + b.width) - Math.max(tb.x, b.x);
        const iy = Math.min(tb.y + tb.height, b.y + b.height) - Math.max(tb.y, b.y);
        if (ix > 2 && iy > 2) { out.push({svg: si, text: t.textContent.trim().slice(0, 44), over: Math.round(ix), into: true}); break; }
      }
    });
  });
  return out;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.goto("file://" + page); pg.wait_for_timeout(800)
    res = pg.evaluate(JS); b.close()
print(f"{len(res)} text elements overflow their container")
for r in res: print(f"  svg {r['svg']}: {r['over']:>3}px  {'runs into another box: ' if r.get('into') else ''}{r['text']}")
sys.exit(1 if res else 0)
