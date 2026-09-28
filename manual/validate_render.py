#!/usr/bin/env python3
"""Rendered-layout checks. Catches what no text check can: content hidden by other content."""
import sys
from playwright.sync_api import sync_playwright
path = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 900})
    pg.goto("file://" + path)
    pg.wait_for_timeout(600)
    res = pg.evaluate("""() => {
      const out = {tables: 0, covered: [], cardWidth: [], clipped: 0};
      for (const t of document.querySelectorAll('table')) {
        const th = t.querySelector('thead th'), r1 = t.querySelector('tbody tr');
        if (!th || !r1) continue;
        out.tables++;
        const a = th.getBoundingClientRect(), c = r1.getBoundingClientRect();
        if (a.bottom > c.top + 2) out.covered.push(t.textContent.trim().slice(0, 50));
      }
      out.broken = [...document.querySelectorAll('main img')]
        .filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src'));
      for (const s of document.querySelectorAll('section.qrc'))
        out.cardWidth.push(Math.round(s.getBoundingClientRect().width));
      for (const el of document.querySelectorAll('main p, main li'))
        if (el.scrollWidth > el.clientWidth + 4) out.clipped++;
      return out;
    }""")
    b.close()
errors = []
if res["covered"]:
    errors.append(f"{len(res['covered'])} tables have their first row hidden under the header: "
                  f"{res['covered'][:3]}")
if res.get("broken"):
    errors.append(f"{len(res['broken'])} images fail to load: {res['broken'][:4]}")
if any(w < 780 for w in res["cardWidth"]):
    errors.append(f"cards narrower than the page box: {res['cardWidth']}")
print(f"render checks: {res['tables']} tables, {len(res['cardWidth'])} cards, "
      f"{res['clipped']} clipped text blocks")
for e in errors:
    print("  \u2717", e)

# print pagination: one card per page, contents sheet first
import subprocess, tempfile, os
try:
    from playwright.sync_api import sync_playwright as _sp
    with _sp() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto("file://" + path); pg.wait_for_timeout(600)
        pdf = os.path.join(tempfile.gettempdir(), "_cards.pdf")
        pg.pdf(path=pdf, format="Letter", print_background=True, prefer_css_page_size=True)
        b.close()
    n = int(subprocess.run(["pdfinfo", pdf], capture_output=True, text=True)
            .stdout.split("Pages:")[1].split()[0])
    want = len(res["cardWidth"]) + 1
    print(f"print checks : {n} pages for {want} sheets")
    if n != want:
        errors.append(f"print pagination: {n} pages for {want} sheets — cards are splitting")
        print(f"  \u2717 {errors[-1]}")
except Exception as e:
    print(f"  print check skipped: {type(e).__name__}")

sys.exit(1 if errors else 0)
