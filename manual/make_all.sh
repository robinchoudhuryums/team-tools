#!/usr/bin/env bash
# Full build: markdown -> HTML + Word for every artifact, then the review packets.
# Output goes to $MANUAL_OUT (default: ./dist).
set -e
cd "$(dirname "$0")"
OUT="${MANUAL_OUT:-dist}"
mkdir -p "$OUT/docx" "$OUT/build"
python3 roles.py && python3 footnotes.py   # the shared resolvers' own checks
python3 make_diagrams.py
python3 make_flow_diagrams.py
rm -f out/*.md            # a renamed part must not leave a stale extract behind
python3 build.py
python3 make_html.py out/CSR-Procedures-Manual-v3.0.md "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 validate_html.py "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 validate_render.py "$OUT/CSR-Procedures-Manual-v3.0.html"
python3 check_svg_fit.py "$OUT/CSR-Procedures-Manual-v3.0.html"
rm -f "$OUT"/docx/*.docx
python3 rasterize_diagrams.py   # the diagrams as PNGs, so Word (and a PDF of it) shows them
for f in out/*.md; do
  base=$(basename "$f" .md)
  python3 md2model.py "$f" /tmp/_m.json > /dev/null
  node render_docx.js /tmp/_m.json "$OUT/docx/$base.docx" "CSR Procedures Manual v3.0"
done
# A PDF of the full manual, checked for blank pages — when LibreOffice is installed.
# (The operator's PDFs come from the Word file via Word or Google Docs; this is the
# same conversion, made here so a blank page fails the build instead of reaching print.)
if command -v soffice >/dev/null 2>&1; then
  mkdir -p "$OUT/pdf"
  if timeout 300 soffice --headless --convert-to pdf --outdir "$OUT/pdf" \
       "$OUT/docx/CSR-Procedures-Manual-v3.0.docx" >/dev/null 2>&1 \
       && [ -s "$OUT/pdf/CSR-Procedures-Manual-v3.0.pdf" ]; then
    python3 check_pdf.py "$OUT/pdf/CSR-Procedures-Manual-v3.0.pdf"
  else
    echo "pdf                   : not made (LibreOffice could not convert the Word file here)"
  fi
else
  echo "pdf                   : not made (LibreOffice is not installed) — export the Word file from Word or Google Docs"
fi
rm -f "$OUT"/build/*.md
cp out/*.md "$OUT/build/"
python3 export_reference.py   # Reference articles -> $OUT/reference (team-tools importer)
echo "build complete -> $OUT"
