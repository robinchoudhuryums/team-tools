#!/usr/bin/env python3
"""The handbook's form library — the build check (handbook app HB4.1).

The list is data/forms.json; the PDFs themselves are the repo's forms/ folder,
the same files Team Tools attaches to external emails (CONFIG.CALL_NOTES.
FORM_CATALOG), so one copy of each form serves both:

    {"forms": [
      {"id": "form-eaa", "title": "Economic Assistance Application (EAA)",
       "summary": "What it is for, in a sentence.",
       "file": "EAA (Economic Assistance Application) Form.pdf",
       "sections": ["§10-19.6", "§0-9"]}]}

`file` is a name inside forms/ (no folders). `sections` are section tokens as
the chapters write them — the sections whose quiz bar offers the form; the
first is the one the Forms page links to.

export_reference.py calls check() with its section index: a missing or
non-PDF file, a section that does not resolve, or any other problem below
FAILS the export like a broken cross-reference — nothing is written. The
checked forms ride manual.json as `forms`, each with its PDF as a data URI,
and Team Tools' Import stores them in the KB spreadsheet's ManualFiles tab
(kbManualFormsValidate_ in web-app/70_kb.js checks them again).

The limits below MIRROR web-app/00_config.js — the Node harness pins them equal.
Standard library only. `--check` runs the built-in self-test (CI does).
"""
import base64
import os
import re
import sys

ID_RE = re.compile(r"^form-[a-z0-9]+(?:-[a-z0-9]+)*$")   # KB_MANUAL_FORM_KEY_RE
ID_MAX = 48                    # KB_MANUAL_FORM_KEY_MAX
TITLE_MAX = 120                # KB_MANUAL_FORM_TITLE_MAX
SUMMARY_MAX = 300              # KB_MANUAL_FORM_SUMMARY_MAX
SECTIONS_MAX = 8               # KB_MANUAL_FORM_SECTIONS_MAX
FORMS_MAX = 40                 # KB_MANUAL_FORMS_MAX
MAX_BYTES = 1024 * 1024        # KB_MANUAL_FORM_MAX_BYTES — one PDF
FILE_RE = re.compile(r"^[A-Za-z0-9 ()._-]+\.pdf$")


def _text(v):
    return v.strip() if isinstance(v, str) else ""


def check(bank, resolve, read_file):
    """bank — the parsed forms.json; resolve(token) — a section token to
    {id, anchor, num}, or None; read_file(name) — the bytes of forms/<name>,
    or None when there is no such file. Returns (forms, errors): the export
    shape, and every problem found (each names the form)."""
    if not isinstance(bank, dict) or not isinstance(bank.get("forms"), list):
        return [], ["forms.json: expected {\"forms\": [...]}"]
    errors, out, seen, files = [], [], set(), set()
    if len(bank["forms"]) > FORMS_MAX:
        errors.append(f"forms.json: at most {FORMS_MAX} forms")
    for fi, fm in enumerate(bank["forms"][:FORMS_MAX]):
        if not isinstance(fm, dict):
            errors.append(f"form {fi + 1}: not an object")
            continue
        fid = _text(fm.get("id"))
        where = f"form {fid or fi + 1}"
        before = len(errors)
        if not ID_RE.match(fid) or len(fid) > ID_MAX:
            errors.append(f"{where}: id must look like form-eaa (lowercase, hyphens, {ID_MAX} at most)")
            continue
        if fid in seen:
            errors.append(f"{where}: id used twice")
            continue
        seen.add(fid)
        title = _text(fm.get("title"))
        if not title or len(title) > TITLE_MAX:
            errors.append(f"{where}: a title is required ({TITLE_MAX} characters at most)")
        summary = _text(fm.get("summary"))
        if len(summary) > SUMMARY_MAX:
            errors.append(f"{where}: the summary is longer than {SUMMARY_MAX} characters")
        secs = fm.get("sections")
        resolved = []
        if not isinstance(secs, list) or not 1 <= len(secs) <= SECTIONS_MAX:
            errors.append(f"{where}: needs 1–{SECTIONS_MAX} sections")
        else:
            for tok in secs:
                t = resolve(_text(tok))
                if not t:
                    errors.append(f"{where}: section {tok!r} is not a section of the handbook")
                elif any(r["id"] == t["id"] and r["anchor"] == t["anchor"] for r in resolved):
                    errors.append(f"{where}: section {tok!r} is listed twice")
                else:
                    resolved.append({"id": t["id"], "anchor": t["anchor"], "num": t["num"]})
        name = fm.get("file")
        data = None
        if not isinstance(name, str) or not FILE_RE.match(name) or name.startswith("."):
            errors.append(f"{where}: file must be a PDF's name inside forms/ (no folders)")
        elif name in files:
            errors.append(f"{where}: {name!r} is already another form's file")
        else:
            files.add(name)
            data = read_file(name)
            if data is None:
                errors.append(f"{where}: forms/{name} does not exist")
            elif not data.startswith(b"%PDF-"):
                errors.append(f"{where}: forms/{name} is not a PDF")
            elif len(data) > MAX_BYTES:
                errors.append(f"{where}: forms/{name} is larger than {MAX_BYTES:,} bytes")
        if len(errors) == before:   # a form is exported only when it raised nothing
            out.append({"key": fid, "title": title, "summary": summary, "sections": resolved,
                        "dataUri": "data:application/pdf;base64," + base64.b64encode(data).decode("ascii")})
    return out, errors


def repo_reader(forms_dir):
    """read_file over a folder: the bytes of forms_dir/<name>, or None."""
    def read(name):
        p = os.path.join(forms_dir, name)
        return open(p, "rb").read() if os.path.isfile(p) else None
    return read


# ----------------------------------------------------------------- self-test ---
def _selftest():
    secs = {"§10-19.6": {"id": "man-10-19", "anchor": "10.19.6", "num": "10.19.6"},
            "§0-9": {"id": "man-0-9", "anchor": "", "num": "0.9"}}
    pdf = b"%PDF-1.7\n...\n%%EOF\n"
    disk = {"EAA.pdf": pdf, "notes.pdf": b"hello", "big.pdf": b"%PDF-" + b"x" * MAX_BYTES}
    read = disk.get
    fails = []

    def form(**kw):
        base = {"id": "form-eaa", "title": "EAA", "summary": "The application.", "file": "EAA.pdf", "sections": ["§10-19.6", "§0-9"]}
        base.update(kw)
        return {"forms": [base]}

    def expect(bank, needle, label):
        out, errs = check(bank, secs.get, read)
        if needle is None:
            if errs:
                fails.append(f"{label}: expected no errors, got {errs}")
        elif not any(needle in e for e in errs):
            fails.append(f"{label}: expected an error containing {needle!r}, got {errs}")
        elif bank.get("forms") and len(out) >= len(bank["forms"]):
            fails.append(f"{label}: a refused form was still exported")

    out, errs = check(form(), secs.get, read)
    if errs or len(out) != 1:
        fails.append(f"good bank: {errs}")
    else:
        f = out[0]
        if f["sections"] != [{"id": "man-10-19", "anchor": "10.19.6", "num": "10.19.6"}, {"id": "man-0-9", "anchor": "", "num": "0.9"}]:
            fails.append("sections resolve to the app's id and anchor, in order")
        if base64.b64decode(f["dataUri"].split(",", 1)[1]) != pdf or not f["dataUri"].startswith("data:application/pdf;base64,"):
            fails.append("the PDF rides as a data URI, byte for byte")
    expect({"forms": []}, None, "an empty list")
    expect({}, "expected {", "not a list")
    expect(form(id="EAA form"), "id must look like", "a bad id")
    expect({"forms": form()["forms"] * 2}, "id used twice", "a duplicate id")
    expect(form(title=""), "a title is required", "no title")
    expect(form(summary="x" * (SUMMARY_MAX + 1)), "summary is longer", "a long summary")
    expect(form(sections=[]), "needs 1–", "no section")
    expect(form(sections=["§9-9"]), "'§9-9' is not a section", "a missing section")
    expect(form(sections=["§0-9", "§0-9"]), "listed twice", "a section twice")
    expect(form(file="../secrets.pdf"), "inside forms/", "a path outside forms/")
    expect(form(file="EAA.docx"), "inside forms/", "not a .pdf name")
    expect(form(file="missing.pdf"), "does not exist", "a missing file")
    expect(form(file="notes.pdf"), "is not a PDF", "not PDF bytes")
    expect(form(file="big.pdf"), "larger than", "too large")
    two = form()
    two["forms"].append(dict(two["forms"][0], id="form-eaa-copy"))
    expect(two, "is already another", "one file, two forms")
    if fails:
        print("forms.py self-test FAILED:")
        for f in fails:
            print("  ✗", f)
        return 1
    print("forms.py self-test: ok (the good list, and 14 refusals)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        sys.exit(_selftest())
    sys.stderr.write("usage: forms.py --check   (export_reference.py runs check() on data/forms.json)\n")
    sys.exit(2)
