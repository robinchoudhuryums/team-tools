#!/usr/bin/env bash
# Departmental review packets: Markdown and Word, generated from the built manual.
# Run after make_all.sh (it reads out/CSR-Procedures-Manual-v3.0.md). Output: $MANUAL_OUT/review-packets.
set -e
cd "$(dirname "$0")"
OUT="${MANUAL_OUT:-dist}"
mkdir -p "$OUT/review-packets/word"
python3 make_review_packets.py
python3 packet_model.py > /dev/null
for k in p2 p3 p4 p5 p6 p7 p8 p9 p10; do
  name=$(python3 -c "import json,re;print(re.sub(r'[^A-Za-z0-9]+','-',json.load(open('/tmp/packet_$k.json'))['title'].split(': ',1)[1]).strip('-'))")
  node render_packet.js "/tmp/packet_$k.json" "$OUT/review-packets/word/Review-Packet-${k^^}-$name.docx" > /dev/null
done
echo "packets complete -> $OUT/review-packets"
