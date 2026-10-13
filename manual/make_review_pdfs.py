#!/usr/bin/env python3
"""The PDFs that go out beside the review packets (operator 2026-10-13).

The full handbook, and each reviewed chapter ALONE, printed from the built HTML
handbook by Chromium — so a PDF looks like the digital handbook: its chapter
colours and icons, section chips, banners and diagrams (operator 2026-10-13:
the Word-made PDFs "don't match the current style of the digital manual").

make_html.py's print-doc mode does the layout: a cover, a linked contents page,
and every section in the screen design. This script only chooses what prints:

  - a chapter PDF marks every other chapter .pdf-skip (Chapter 10 has two H1s,
    both class p10), names its chapter on the cover, and turns a link to a
    section it does not carry into plain text "(in the full handbook)" — never
    a link that goes nowhere;
  - every page carries the handbook's name and "Page N of M".

The PDFs are interactive: cross-references, the contents and web addresses are
links, and the headings are the PDF's bookmarks (Chromium's outline).

Input : $MANUAL_OUT/Policies-and-Procedures-Handbook-v3.0.html (make_all.sh)
Output: $MANUAL_OUT/review-packets/pdf/Policies-and-Procedures-Handbook-v3.0.pdf
        $MANUAL_OUT/review-packets/pdf/Policies-and-Procedures-Handbook-v3.0-Chapter-<N>-<Name>.pdf
Needs Python Playwright and a Chromium (its own, or CHROMIUM / PLAYWRIGHT_BROWSERS_PATH).
"""
import glob, os, re, subprocess, sys
sys.path.insert(0, ".")
from make_review_packets import KEYS

BASE = "Policies-and-Procedures-Handbook-v3.0"
MANUAL_OUT = os.environ.get("MANUAL_OUT", "dist")
HTML = os.path.join(MANUAL_OUT, BASE + ".html")
OUT = os.path.join(MANUAL_OUT, "review-packets", "pdf")
VERSION = re.search(r'^VERSION = "([^"]+)"', open("build.py").read(), re.M).group(1)
# the chapters a packet reviews — the Denials packet reviews Chapter 10, like Billing's
CHAPTERS = sorted({"p10" if k == "denials" else k for k in KEYS}, key=lambda k: int(k[1:]))

# Run in the page: keep one chapter. Every main child from the chapter's first H1
# up to the next H1 of another chapter stays; a link whose target is not kept
# becomes its text, plus "(in the full handbook)" for a cross-reference.
KEEP_CHAPTER = """(part) => {
  const main = document.querySelector('main');
  let on = false;
  for (const k of main.children) {
    if (k.id === 'pdfdoc' || k.id === 'ctx') continue;
    if (k.matches('h1.part')) on = k.classList.contains(part);
    if (!on) k.classList.add('pdf-skip');
  }
  document.querySelectorAll('#pdftoc li').forEach((li) => { if (li.dataset.part !== part) li.classList.add('pdf-skip'); });
  const kept = [...main.children].filter((k) => k.id !== 'pdfdoc' && k.id !== 'ctx' && !k.classList.contains('pdf-skip'));
  const ids = new Set();
  kept.forEach((k) => { if (k.id) ids.add(k.id); k.querySelectorAll('[id]').forEach((e) => ids.add(e.id)); });
  let localised = 0;
  kept.forEach((k) => k.querySelectorAll('a[href^="#"]').forEach((a) => {
    if (ids.has(decodeURIComponent(a.getAttribute('href').slice(1)))) return;
    a.replaceWith(document.createTextNode(a.textContent + (a.classList.contains('xr') ? ' (in the full handbook)' : '')));
    localised++;
  }));
  const h1 = main.querySelector('h1.part.' + part);
  return { title: h1 ? h1.textContent.trim() : '', localised, kept: kept.length };
}"""

NOTE = ("This chapter on its own, for review. A section number links to its section; "
        "a section in another chapter is marked “(in the full handbook)”.")

FOOTER = ('<div style="font-family:\'IBM Plex Sans\',Arial,sans-serif;font-size:7.5px;color:#5B6B7B;width:100%;'
          'padding:0 0.45in;display:flex;justify-content:space-between">'
          f'<span>UniversalMed Supply · Policies &amp; Procedures Handbook {VERSION} · Confidential — Internal Use Only</span>'
          '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>')


def chromium():
    """A pre-installed Chromium, for when Playwright's own download is not there."""
    if os.environ.get("CHROMIUM"):
        return os.environ["CHROMIUM"]
    found = sorted(glob.glob(os.path.join(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers"),
                                          "chromium-*", "chrome-linux", "chrome")))
    return found[-1] if found else None


def fonts_through_proxy(page):
    """Behind an HTTPS proxy (a cloud build) Chromium cannot verify the proxy's
    certificate, so the IBM Plex web fonts would fall back to a system font.
    Fetch them here instead, through the proxy and its CA bundle — verified."""
    if not os.environ.get("HTTPS_PROXY"):
        return
    import ssl, urllib.request
    opener = urllib.request.build_opener(urllib.request.ProxyHandler(), urllib.request.HTTPSHandler(
        context=ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)))
    def fetch(route):
        req = urllib.request.Request(route.request.url, headers={"User-Agent": route.request.headers.get("user-agent", "")})
        try:
            with opener.open(req, timeout=20) as r:
                route.fulfill(status=r.status, body=r.read(), headers={
                    "content-type": r.headers.get("content-type", ""), "access-control-allow-origin": "*"})
        except Exception:
            route.continue_()
    page.route(re.compile(r"^https://fonts\.(googleapis|gstatic)\.com/"), fetch)


def print_pdf(page, part, path):
    page.goto("file://" + os.path.abspath(HTML))
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(400)
    info = {}
    if part:
        info = page.evaluate(KEEP_CHAPTER, part)
        if not info["kept"] or not info["title"]:
            raise SystemExit(f"{part}: no chapter of that class in {HTML}")
        page.evaluate("""([t, note]) => {
          document.getElementById('pdfsub').textContent = t;
          document.getElementById('pdfnote').textContent = note;
        }""", [info["title"], NOTE])
    page.evaluate("document.body.classList.add('print-doc')")
    page.pdf(path=path, prefer_css_page_size=True, print_background=True, outline=True, tagged=True,
             display_header_footer=True, header_template="<div></div>", footer_template=FOOTER)
    return info


if __name__ == "__main__":
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("review pdfs           : not made (Python Playwright is not installed)")
        sys.exit(0)
    if not os.path.exists(HTML):
        raise SystemExit(f"{HTML}: run make_all.sh first")
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, "*.pdf")):   # a chapter no packet reviews any more must not linger
        os.remove(f)
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception:
            browser = p.chromium.launch(executable_path=chromium())
        page = browser.new_page()
        fonts_through_proxy(page)
        for part in [None] + CHAPTERS:
            tmp = os.path.join(OUT, "_printing.pdf")
            info = print_pdf(page, part, tmp)
            name = BASE
            if part:
                title = info["title"].split(" — ", 1)[1]
                name = f"{BASE}-Chapter-{part[1:]}-{title.replace(' & ', '-and-').replace(' ', '-')}"
            os.replace(tmp, os.path.join(OUT, name + ".pdf"))
            subprocess.run([sys.executable, "check_pdf.py", os.path.join(OUT, name + ".pdf")], check=True)
            print(f"review pdf            : {name}.pdf"
                  + (f" ({info['localised']} links to other chapters made plain text)" if part else ""))
        browser.close()
