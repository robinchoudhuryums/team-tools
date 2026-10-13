#!/usr/bin/env bash
# Departmental review packets: Markdown and Word, generated from the built manual.
# Run after make_all.sh (it reads out/CSR-Procedures-Manual-v3.0.md and the built HTML,
# whose diagrams it screenshots). Output: $MANUAL_OUT/review-packets.
set -e
cd "$(dirname "$0")"
OUT="${MANUAL_OUT:-dist}"
mkdir -p "$OUT/review-packets/word"
python3 packet_diagrams.py
python3 make_review_packets.py
python3 packet_model.py > /dev/null
python3 - "$OUT" <<'PY'
import glob, os, subprocess, sys
from make_review_packets import BUILDS, build_name
# a packet dropped from the spec (the Oxygen packet, 2026-10-12) leaves its old files
# in the output folder; remove them so a stale packet cannot be sent by mistake
want = {build_name(k, v) for k, v in BUILDS}
for f in glob.glob(f"{sys.argv[1]}/review-packets/Review-Packet-*.md") + glob.glob(f"{sys.argv[1]}/review-packets/word/Review-Packet-*.docx"):
    if os.path.basename(f).split(".")[0][len("Review-Packet-"):] not in want:
        os.remove(f); print("removed stale packet", os.path.basename(f))
for k, v in BUILDS:
    n = build_name(k, v)
    subprocess.run(["node", "render_packet.js", f"/tmp/packet_{n}.json",
                    f"{sys.argv[1]}/review-packets/word/Review-Packet-{n}.docx"], check=True, capture_output=True)
PY
python3 make_review_pdfs.py   # the full manual and each reviewed chapter as PDFs (LibreOffice)
echo "packets complete -> $OUT/review-packets"
