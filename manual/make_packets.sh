#!/usr/bin/env bash
# Departmental review packets: Markdown and Word, generated from the built manual.
# Run after make_all.sh (it reads out/CSR-Procedures-Manual-v3.0.md). Output: $MANUAL_OUT/review-packets.
set -e
cd "$(dirname "$0")"
OUT="${MANUAL_OUT:-dist}"
mkdir -p "$OUT/review-packets/word"
python3 make_review_packets.py
python3 packet_model.py > /dev/null
for k in $(python3 -c "import json;print(' '.join(json.load(open('packets/spec.json'))))"); do
  name=$(python3 -c "import make_review_packets as m;print(m.NAMES['$k'])")
  node render_packet.js "/tmp/packet_$k.json" "$OUT/review-packets/word/Review-Packet-$name.docx" > /dev/null
done
echo "packets complete -> $OUT/review-packets"
