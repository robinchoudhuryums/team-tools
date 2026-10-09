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
import subprocess, sys
from make_review_packets import NAMES, KEYS
for k in KEYS:
    subprocess.run(["node", "render_packet.js", f"/tmp/packet_{k}.json",
                    f"{sys.argv[1]}/review-packets/word/Review-Packet-{NAMES[k]}.docx"], check=True, capture_output=True)
PY
echo "packets complete -> $OUT/review-packets"
