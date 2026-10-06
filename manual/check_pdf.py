#!/usr/bin/env python3
"""Fail on a blank page in a PDF of the manual.

A page whose text layer is empty AND which carries no image is reported. (The
operator found page 42 of a PDF of the Word manual blank — a page-break
paragraph that had landed alone on a page.) Needs poppler's pdftotext and
pdfimages; without them the check says so and passes.
"""
import re, shutil, subprocess, sys

pdf = sys.argv[1]
if not shutil.which("pdftotext"):
    print("pdf check             : skipped (pdftotext not installed)")
    sys.exit(0)
text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
pages = text.split("\f")
if pages and not pages[-1].strip():
    pages = pages[:-1]                     # the form feed after the last page
with_images = set()
if shutil.which("pdfimages"):
    out = subprocess.run(["pdfimages", "-list", pdf], capture_output=True, text=True).stdout
    for ln in out.splitlines()[2:]:
        f = ln.split()
        if f and f[0].isdigit():
            with_images.add(int(f[0]))
# the running header and footer are on every page; a page with nothing else is blank
CHROME = re.compile(r"^\s*UniversalMed Supply\b|Confidential \u2014 Internal Use Only|Page \d+ of \d+")
def body(t):
    return "\n".join(ln for ln in t.splitlines() if not CHROME.search(ln)).strip()
blank = [i for i, t in enumerate(pages, 1) if not body(t) and i not in with_images]
print(f"pdf check             : {len(pages)} pages, {len(blank)} blank" + (f" — {blank[:12]}" if blank else ""))
sys.exit(1 if blank else 0)
