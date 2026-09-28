#!/usr/bin/env python3
"""Structural checks on the rendered HTML. Catches the class of bug the build can't see."""
import re, sys
from collections import Counter
h = open(sys.argv[1]).read()
h = re.sub(r"<script.*?</script>", "", h, flags=re.S)
errors = []
ids = re.findall(r'\sid="([^"]+)"', h)
dup = [k for k, v in Counter(ids).items() if v > 1]
if dup:
    errors.append(f"duplicate ids: {dup[:8]}")
if h.count("<div") != h.count("</div>"):
    errors.append(f"unbalanced divs: {h.count('<div')} open, {h.count('</div>')} close")
if "&amp;amp;" in h:
    errors.append(f"double-escaped entities: {h.count('&amp;amp;')}")
hrefs = set(re.findall(r'href="#([^"]+)"', h))
missing = sorted(x for x in hrefs if x not in set(ids))
if missing:
    errors.append(f"links to missing anchors: {missing[:8]}")
cards = [int(x) for x in re.findall(r'id="C-(\d+)"', h)]
if cards != sorted(cards):
    errors.append(f"quick reference cards out of order: {cards}")
for name, n in [("part headings", len(re.findall(r'<h1[^>]*class="part', h)))]:
    pass
print(f"html checks: {len(ids)} ids, {len(hrefs)} internal links, {len(cards)} cards")
for e in errors:
    print("  \u2717", e)
sys.exit(1 if errors else 0)
