#!/usr/bin/env python3
"""Footnotes for the manual — ONE transform shared by build.py (HTML, Word) and
export_reference.py (Reference articles), so every output numbers them alike.

Source syntax, inside any level-2 section:

    The patient can return it within 30 days.[^1]

    [^1]: Unless the item was custom-ordered.

Markers are numbered per level-2 section, in order of first use, and drawn as
superscript digits (¹ ² ³). The definitions leave the body and are gathered
under a short "Notes" list at the END of their level-2 section, preceded by a
`<!--notes-->` marker line: make_html.py styles what follows it, md2model.py
drops the marker, and the export's HTML-comment strip removes it — so no
output ever prints it. The result is plain Markdown in every output: nothing
the Reference renderer (an escape-first renderer, g160) could print literally.

A marker with no definition, or a definition no marker cites, is an error.
"""
import re

SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
MARK = re.compile(r"\[\^([\w-]{1,20})\]")
DEF = re.compile(r"^\[\^([\w-]{1,20})\]:[ \t]+(.+)$", re.M)
SECTION = re.compile(r"^(?=## (?!#))", re.M)


def _one(sec, where, errors):
    defs = {}
    for m in DEF.finditer(sec):
        if m.group(1) in defs:
            errors.append(f"{where}: footnote [^{m.group(1)}] is defined twice")
        defs[m.group(1)] = m.group(2).strip()
    body = DEF.sub("", sec)
    order = []
    for m in MARK.finditer(body):
        if m.group(1) not in order:
            order.append(m.group(1))
    if not order and not defs:
        return sec
    for k in order:
        if k not in defs:
            errors.append(f"{where}: footnote [^{k}] has no definition")
    for k in defs:
        if k not in order:
            errors.append(f"{where}: footnote [^{k}] is defined but never cited")
    num = {k: str(i).translate(SUP) for i, k in enumerate(order, 1)}
    body = MARK.sub(lambda m: num.get(m.group(1), m.group(0)), body)
    notes = [f"{num[k]} {defs[k]}" for k in order if k in defs]
    body = re.sub(r"\n{3,}", "\n\n", body).rstrip("\n")
    # a trailing rule stays the section's last line, after its notes
    tail = ""
    mrule = re.search(r"\n+(-{3,})\s*$", body)
    if mrule:
        tail, body = "\n\n" + mrule.group(1), body[:mrule.start()]
    return body + "\n\n<!--notes-->\n**Notes**\n\n" + "\n\n".join(notes) + tail + "\n\n"


def apply(text, where, errors):
    """Footnotes resolved in one source file's text; problems appended to errors."""
    if "[^" not in text:
        return text
    parts = SECTION.split(text)
    return "".join(_one(p, where, errors) if p.startswith("## ") else p for p in parts)


if __name__ == "__main__":
    errs = []
    src = ("# Part 9\n\n## §9-1 One\n\nReturn it.[^a] Or keep it.[^b] Again.[^a]\n\n"
           "[^b]: Second.\n[^a]: First.\n\n---\n\n## §9-2 Two\n\nNo notes here.\n")
    out = apply(src, "selftest", errs)
    assert not errs, errs
    assert "Return it.¹ Or keep it.² Again.¹" in out, out
    assert out.index("<!--notes-->") < out.index("## §9-2"), out
    assert "¹ First.\n\n² Second." in out and "[^" not in out, out
    assert out.rstrip().endswith("No notes here."), out
    apply("## §1-1 X\n\nA[^1]\n", "t", errs)
    apply("## §1-1 X\n\nA\n\n[^1]: orphan\n", "t", errs)
    assert len(errs) == 2 and "no definition" in errs[0] and "never cited" in errs[1], errs
    print("footnotes selftest ok")
