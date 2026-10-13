#!/usr/bin/env python3
"""The PDFs that go out beside the review packets (operator 2026-10-13).

Each reviewed chapter ALONE — cut from the built full manual, so its text is the
full manual's — rendered through the same Word renderer and converted to PDF by
LibreOffice, plus the full manual's PDF. A reviewer can read either.

The PDFs are interactive: a cross-reference inside the chapter is a link to its
section, a web address is a link, and the headings are the PDF's bookmarks. A
section the chapter does not carry is named "(in the full manual)" instead of a
link that would go nowhere — the same rule as the department guides.

Input : out/CSR-Procedures-Manual-v3.0.md (build.py), the rasterized diagrams,
        $MANUAL_OUT/docx/CSR-Procedures-Manual-v3.0.docx (make_all.sh)
Output: $MANUAL_OUT/review-packets/pdf/CSR-Procedures-Manual-v3.0.pdf
        $MANUAL_OUT/review-packets/pdf/CSR-Procedures-Manual-v3.0-Chapter-<N>-<Name>.pdf
Needs LibreOffice (soffice); without it the script says so and makes nothing.
"""
import json, os, re, shutil, subprocess, sys, tempfile
sys.path.insert(0, ".")
from make_review_packets import KEYS

FULL_MD = "out/CSR-Procedures-Manual-v3.0.md"
BASE = os.path.basename(FULL_MD)[:-3]
MANUAL_OUT = os.environ.get("MANUAL_OUT", "dist")
OUT = os.path.join(MANUAL_OUT, "review-packets", "pdf")
VERSION = re.search(r'^VERSION = "([^"]+)"', open("build.py").read(), re.M).group(1)
# the chapters a packet reviews — the Denials packet reviews Chapter 10, like Billing's
CHAPTERS = sorted({"p10" if k == "denials" else k for k in KEYS}, key=lambda k: int(k[1:]))


def chapter_md(full, key):
    """Chapter <n> alone: every H1 of the chapter (Chapter 10 has two), its own
    links kept, every link to a section it does not carry made plain text."""
    n = key[1:]
    heads = list(re.finditer(r"^# (.+)$", full, re.M))
    mine = [i for i, m in enumerate(heads) if m.group(1).startswith(f"Chapter {n} — ")]
    if not mine:
        raise SystemExit(f"chapter {n}: not in {FULL_MD}")
    end = heads[mine[-1] + 1].start() if mine[-1] + 1 < len(heads) else len(full)
    body = re.sub(r"\n-{3,}\s*$", "", full[heads[mine[0]].start():end].rstrip())
    title = heads[mine[0]].group(1).split(" — ", 1)[1]
    present = {m.group(1)[1:].replace(".", "_") for m in re.finditer(r"^#{2,3} (§[\w\-.]+) ", body, re.M)}
    body = re.sub(r'<a class="xr" href="#([\w\-.]+)">(.*?)</a>',
                  lambda m: m.group(0) if m.group(1) in present else f"{m.group(2)} (in the full manual)", body)
    return title, body + "\n"


def to_pdf(docx, outdir, profile):
    subprocess.run(["soffice", f"-env:UserInstallation=file://{profile}", "--headless",
                    "--convert-to", "pdf", "--outdir", outdir, docx],
                   check=True, capture_output=True, timeout=600)
    pdf = os.path.join(outdir, os.path.basename(docx)[:-5] + ".pdf")
    if not os.path.getsize(pdf):
        raise SystemExit(f"{pdf}: empty")
    return pdf


if __name__ == "__main__":
    if not shutil.which("soffice"):
        print("review pdfs           : not made (LibreOffice is not installed) — export the Word files from Word or Google Docs")
        sys.exit(0)
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):                 # a chapter no packet reviews any more must not linger
        if f.endswith(".pdf"):
            os.remove(os.path.join(OUT, f))
    full = open(FULL_MD, encoding="utf-8").read()
    with tempfile.TemporaryDirectory() as tmp:
        profile = os.path.join(tmp, "profile")
        jobs = [(os.path.join(MANUAL_OUT, "docx", BASE + ".docx"), BASE)]
        for key in CHAPTERS:
            title, md = chapter_md(full, key)
            name = f"{BASE}-Chapter-{key[1:]}-{title.replace(' & ', '-and-').replace(' ', '-')}"
            src = os.path.join(tmp, name + ".md")
            open(src, "w", encoding="utf-8").write(md)
            model = os.path.join(tmp, name + ".json")
            subprocess.run([sys.executable, "md2model.py", src, model], check=True, capture_output=True)
            m = json.load(open(model, encoding="utf-8"))
            assert m["meta"]["full"], "the file name gives the cover and contents (md2model's FULL)"
            m["meta"]["subtitle"] = f"Chapter {key[1:]} — {title}"
            m["meta"]["note"] = ("This chapter on its own, for review. A section number links to its section; "
                                 "a section in another chapter is marked \u201c(in the full manual)\u201d.")
            json.dump(m, open(model, "w", encoding="utf-8"), ensure_ascii=False)
            subprocess.run(["node", "render_docx.js", os.path.join(tmp, name + ".json"),
                            os.path.join(tmp, name + ".docx"), f"CSR Procedures Manual {VERSION}"],
                           check=True, capture_output=True)
            jobs.append((os.path.join(tmp, name + ".docx"), name))
        for docx, name in jobs:
            pdf = to_pdf(docx, tmp, profile)
            shutil.move(pdf, os.path.join(OUT, name + ".pdf"))
            subprocess.run([sys.executable, "check_pdf.py", os.path.join(OUT, name + ".pdf")], check=True)
            print(f"review pdf            : {name}.pdf")
