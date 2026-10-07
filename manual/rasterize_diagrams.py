#!/usr/bin/env python3
"""Render every diagrams/*.svg to out/diagrams/<name>.png for the Word build,
and each chapter's heading badge to out/icons/<part>.png.

Word cannot draw the diagrams' CSS (they colour themselves with var(--p4) and
the like), so the docx used to print "[ Diagram — see the online manual ]" in
their place — and so did any PDF made from it. Each diagram is drawn in the
browser with the HTML manual's own LIGHT palette (make_html.py's light theme,
whose part colours come from data/chapter_style.json — never copied) and saved
at twice its size, which stays sharp in print. The badges are the HTML part
heading's: the chapter's icon, white, in a circle of the chapter's light colour.
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

os.makedirs("out/diagrams", exist_ok=True)
os.makedirs("out/icons", exist_ok=True)
CH = json.load(open("data/chapter_style.json", encoding="utf-8"))
tpl = open("make_html.py", encoding="utf-8").read()
root = re.search(r":root\{.*?\}", tpl, re.S).group(0)      # the first :root block is the light theme
root = root.replace("__PAL_LIGHT__", " ".join(f"--{k}:{v['light']};" for k, v in CH["parts"].items()))
assert "__" not in root, "make_html.py's light :root has a placeholder this script does not fill"
names = sorted(f[:-4] for f in os.listdir("diagrams") if f.endswith(".svg"))
badges = "".join(
    f'<div class="b" id="b-{k}" style="background:{v["light"]}"><svg viewBox="0 0 24 24" fill="none" '
    f'stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
    f'{CH["icons"][v["icon"]]}</svg></div>' for k, v in CH["parts"].items())
page = ("<!DOCTYPE html><html><head><meta charset='utf-8'><style>" + root +
        "body{margin:0;background:#fff;font-family:'IBM Plex Sans',sans-serif}"
        ".d{display:inline-block;padding:8px;background:#fff}"
        ".d svg{display:block;width:1100px;height:auto}"
        ".b{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;margin:4px}"
        ".b svg{width:28px;height:28px}</style></head><body>" +
        "".join(f'<div class="d" id="d-{n}">{open(f"diagrams/{n}.svg", encoding="utf-8").read()}</div>'
                for n in names) + "<div>" + badges + "</div></body></html>")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(device_scale_factor=2, viewport={"width": 1200, "height": 900})
    pg.set_content(page)
    for n in names:
        pg.locator(f"#d-{n}").screenshot(path=f"out/diagrams/{n}.png")
    for k in CH["parts"]:
        pg.locator(f"#b-{k}").screenshot(path=f"out/icons/{k}.png", omit_background=True)
    b.close()
print(f"diagrams rasterized   : {len(names)} -> out/diagrams/, {len(CH['parts'])} chapter badges -> out/icons/")
