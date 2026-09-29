"""Display numbering (design 4c).

Source keeps its §x-y identifiers — they are stable keys used by cross-references, anchors,
the changelog and the v2.0 crosswalk. Only the displayed form changes:

    §5-4.1  ->  5.4.1        sections: dotted
    §B-1    ->  B.1          appendix sections: dotted
    §10-B   ->  10.B         Billing's lettered sections
    §C-5    ->  CARD 5       quick reference cards: a filled block, not a section number
"""
import re

SEC = re.compile(r"§([0-9]+|[A-Z])-([0-9]+|[A-Z])((?:\.[0-9]+)*)")


def display(sec):
    m = SEC.fullmatch(sec.strip())
    if not m:
        return sec
    a, b, rest = m.groups()
    if a == "C":
        return f"CARD {b}"
    return f"{a}.{b}{rest}"


def old_forms(sec):
    """Every way someone might type this section, for search."""
    s = sec.lstrip("§")
    forms = {sec, s, s.replace("-", "."), display(sec)}
    if s.startswith("C-"):                  # cards were Appendix G before re-lettering
        g = "G-" + s[2:]
        forms |= {g, "§" + g, g.replace("-", ".")}
    return sorted(forms)
