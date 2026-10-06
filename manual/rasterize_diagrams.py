#!/usr/bin/env python3
"""Render every diagrams/*.svg to out/diagrams/<name>.png for the Word build.

Word cannot draw the diagrams' CSS (they colour themselves with var(--p4) and
the like), so the docx used to print "[ Diagram — see the online manual ]" in
their place — and so did any PDF made from it. Each diagram is drawn in the
browser with the HTML manual's own LIGHT palette (read from make_html.py, never
copied) and saved at twice its size, which stays sharp in print.
"""
import os, re, sys
from playwright.sync_api import sync_playwright

os.makedirs("out/diagrams", exist_ok=True)
tpl = open("make_html.py", encoding="utf-8").read()
root = re.search(r":root\{.*?\}", tpl, re.S).group(0)      # the first :root block is the light theme
names = sorted(f[:-4] for f in os.listdir("diagrams") if f.endswith(".svg"))
page = ("<!DOCTYPE html><html><head><meta charset='utf-8'><style>" + root +
        "body{margin:0;background:#fff;font-family:'IBM Plex Sans',sans-serif}"
        ".d{display:inline-block;padding:8px;background:#fff}"
        ".d svg{display:block;width:1100px;height:auto}</style></head><body>" +
        "".join(f'<div class="d" id="d-{n}">{open(f"diagrams/{n}.svg", encoding="utf-8").read()}</div>'
                for n in names) + "</body></html>")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(device_scale_factor=2, viewport={"width": 1200, "height": 900})
    pg.set_content(page)
    for n in names:
        pg.locator(f"#d-{n}").screenshot(path=f"out/diagrams/{n}.png")
    b.close()
print(f"diagrams rasterized   : {len(names)} -> out/diagrams/")
