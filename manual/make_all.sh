#!/usr/bin/env bash
# Full build: markdown -> HTML + Word for every artifact, then the review packets.
# Output goes to $MANUAL_OUT (default: ./dist).
set -e
cd "$(dirname "$0")"
OUT="${MANUAL_OUT:-dist}"
mkdir -p "$OUT/docx" "$OUT/build"
python3 make_diagrams.py
python3 make_flow_diagrams.py
rm -f out/*.md            # a renamed part must not leave a stale extract behind
python3 build.py
python3 make_html.py out/CSR-Procedures-Manual-v3.0.md "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 validate_html.py "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 validate_render.py "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 check_svg_fit.py "$OUT/CSR-Procedures-Manual-v3.0.html"
rm -f "$OUT"/docx/*.docx
for f in out/*.md; do
  base=$(basename "$f" .md)
  python3 md2model.py "$f" /tmp/_m.json > /dev/null
  node render_docx.js /tmp/_m.json "$OUT/docx/$base.docx" "CSR Procedures Manual v3.0"
done
rm -f "$OUT"/build/*.md
cp out/*.md "$OUT/build/"
echo "build complete -> $OUT"
