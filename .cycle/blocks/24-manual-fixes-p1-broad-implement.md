---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: change list 2026-10-08 B1 (packet generator back to the approved format, with the repo's October features ported) · B2 (the 96 approved questions, renumbered, as packets/spec.json; the full October set kept) · plan 2.2 (the 11 rows the October text overtook: 7 reworded or kept, 2 replaced, 2 dropped) · plan 2.1 (Rajdeep Thakar on the Power packet)
Files modified: manual/make_review_packets.py, manual/packet_model.py, manual/render_packet.js, manual/packet_diagrams.py (new), manual/make_packets.sh, manual/packets/spec.json, manual/packets/spec-october-full.json (new), manual/README.md, .cycle/STATE.md, .cycle/manual-fixes-2026-10-08-{list,candidates,plan}.md (new)
Estimate: M (~3 h)
Actual: ~1.5 h

CHANGES:
B1 | make_review_packets.py, packet_model.py, render_packet.js, packet_diagrams.py, make_packets.sh | the approved generator (header, then one numbered list; no "How to answer", group headings, "why" lines or thank-you; page-number-only footer, no running header; `sec~filter` table rows; diagrams screenshotted from the built HTML at viewBox width and shown where "diagrams": true; [PENDING: URLs] → "[Links to be added]"; figure placeholders dropped) + ported from the repo: C<N> chapter names, the October FAQ map (no FAQ for Sales/After Hours; denials → 10.21), `roster` directory rows, `denials` key, optional `sec`, `_` keys ignored (KEYS); the fig-div regex now accepts the div's data-diagram attribute (the approved one matched a bare `<div class="fig">` and found no diagram in today's build)
B2 | packets/spec.json, packets/spec-october-full.json | the 96 approved questions at the October numbering (every sec resolves; every ~filter matches); C3·6 (E0471 → asked once, in Billing) and C10·13 (knowledge check → training) dropped → 94; rows renumbered; `_approved_sec`/`_check` stripped; `_about` note
2.2 | packets/spec.json | C2·5, C3·2, C6·5, C7·1, C7·12 reworded; C7·2 replaced by the October diagnostic-visit text with the asks folded in (incl. "free when a fault is repaired?"); C3·9 replaced by the team's directory rows (roster p3); C2·6, C5·7 kept as is
2.1 | packets/spec.json | Power header: Rajdeep Thakar (Power Manager) added as a main reader
Docs | manual/README.md | spec.json row (filters, diagrams, no "why", `_` notes), spec-october-full.json row, packet_diagrams.py on the make_packets line

TEST RESULTS: Test Command is `manual` — no Regression Scenario covers the review packets (config.md mentions them only in the build line). Ran anyway: manual make_all.sh ERRORS 0 (WARNINGS 25, unchanged); make_packets.sh builds all 9 packets, 16 diagrams rendered, no MISSING; exactly 3 diagram images (C4 Q5, C5 Q1, C8 Q2, as approved); no "How to answer"/"Why"/thank-you/figure placeholder left; structure diffed against the approved reference output (only the renumber, the rewordings and Rajdeep differ); Word: Arial, page-number footer, image embedded. Pure 1252/0, DOM 223/0, lint:server ok, counts --check ok.
REGRESSION RISKS: make_packets.sh now needs Python Playwright (packet_diagrams.py), as the approved bundle did; the packets read the BUILT HTML, so make_all.sh must run first (already the documented order). The Denials packet is not built until P2 adds its spec key.
INVARIANTS AT RISK: None (manual tooling only; nothing under web-app/ or test/ changed)
NET SCORE: 1 − 0 = 1 (the packets as built today carry the pre-trim ~290 questions and layout the operator had already rejected — they would have gone out wrong)

OPERATOR ACTIONS / DEPLOY:
- Review the sample packets (C5 Power, C7 Service) for format and the reworded rows | BLOCKS DEPLOY: N
Deploy: N/A — manual tooling; nothing in web-app/ changed

FOLLOW-ON ITEMS:
- P2: the approved candidates (plan 2.3), each rewritten so its ask is in its own text; the Denials packet (spec key `denials`, header from spec-october-full.json)
- The batches A, F1, C, D, F2, E of the plan

DOCUMENTATION UPDATES NEEDED:
- None beyond manual/README.md (done)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
