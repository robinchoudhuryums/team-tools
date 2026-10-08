#!/usr/bin/env python3
"""Render each diagram in the built HTML manual to a PNG, for the review packets.

Screenshots the real rendered diagram (light theme), so a packet shows exactly
what the manual shows. Writes $MANUAL_OUT/review-packets/images/<slug>.png and
index.json, keyed by the diagram's aria-label.
"""
import json, os, re
from playwright.sync_api import sync_playwright

OUT = os.environ.get("MANUAL_OUT", "dist")
HTML = os.path.join(OUT, "CSR-Procedures-Manual-v3.0.html")
IMG = os.path.join(OUT, "review-packets", "images")
os.makedirs(IMG, exist_ok=True)


def slug(label):
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


index = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1900, "height": 1200}, device_scale_factor=2, color_scheme="light")
    pg.goto("file://" + os.path.abspath(HTML))
    pg.wait_for_timeout(800)
    labels = pg.evaluate("() => [...new Set([...document.querySelectorAll('main .fig svg')].map(s => s.getAttribute('aria-label')))]")
    for label in labels:
        el = pg.query_selector(f'main .fig svg[aria-label="{label}"]')
        # capture at the diagram's own width: in the manual, wide diagrams scroll inside a narrower column
        pg.evaluate("""s => { const w = s.viewBox.baseVal.width, h = s.viewBox.baseVal.height;
            let p = s.parentElement; while (p && p.tagName !== 'MAIN') { p.style.overflow = 'visible'; p.style.maxWidth = 'none'; p = p.parentElement; }
            s.style.width = w + 'px'; s.style.height = h + 'px'; s.style.maxWidth = 'none'; }""", el)
        el.scroll_into_view_if_needed()
        pg.wait_for_timeout(80)
        name = slug(label) + ".png"
        el.screenshot(path=os.path.join(IMG, name))
        box = el.bounding_box()
        index[label] = {"file": name, "w": round(box["width"]), "h": round(box["height"])}
    b.close()
json.dump(index, open(os.path.join(IMG, "index.json"), "w"), indent=1)
print(f"{len(index)} diagrams rendered -> {IMG}")
