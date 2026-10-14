---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: operator requests 2026-10-12 → 2026-10-13 (manual-update thread, after the 2026-10-12 corrections block)
- Review packets: Resupply / Sales / Power / Field Ops / Service / Billing / Denials question changes; Oxygen and After Hours packets dissolved (After Hours → Field Ops, marked ▲ for Parth Shah); questions reordered so no excerpt repeats; strong + optional merges; excerpt trims
- Per-recipient packets (`recipients` in packets/spec.json: only/skip markers), each ending on the closing "Anything else?"; a recipient in two chapters gets ONE combined packet with ONE closing question (Ozaire: Review-Packet-C5-C6-Ozaire-Hawa)
- Power directory question links the live Power Roster Google Sheet (`link` replaces `paste`)
- New questions: overridden orders (Manual Mobility Q9; folded into Field Ops Q6), "OON w/ PA" / "TRY" (Sales Q8, ◆ April)
- Review PDFs (`manual/make_review_pdfs.py`, run by make_packets.sh): the full handbook + each reviewed chapter (2, 3, 4, 5, 6, 7, 10), printed by Chromium from the HTML handbook's new print-doc mode — the digital design, a cover, linked contents, page numbers, clickable cross-references and bookmarks; links out of a chapter read "(in the full handbook)"
- Rename: "CSR Procedures Manual" → "Policies & Procedures Handbook" everywhere a reader sees it (covers, headers/footers, HTML title/sidebar, guide banners, built file names, the handbook's self-references, the packets' "From the handbook" labels, the app's Reference reader labels)
- Covers and footers carry no version or build date

Files modified: manual/packets/spec.json, manual/make_review_packets.py, manual/packet_model.py, manual/render_packet.js, manual/make_packets.sh, manual/make_review_pdfs.py (new), manual/make_html.py, manual/render_docx.js, manual/build.py, manual/md2model.py, manual/make_all.sh, manual/export_reference.py, manual/packet_diagrams.py, manual/make_diagrams.py, manual/src/*.md, manual/data/{glossary,changelog,roster}.json, manual/README.md, web-app/kb/script_kb.html, web-app/script_core.html, web-app/00_config.js, web-app/70_kb.js, test/client/run.js (PK-1..PK-7), test/client/dom/runDom.js (PK-7 DOM), test/client/server-split-manifest.json, README.md, CLAUDE.md (counts), docs/operator-log.md, docs/test-harness-log.md
Estimate: not recorded (operator-driven iterative requests, no plan message)
Actual: ~1.5 days across two sessions

TEST RESULTS: pure harness and DOM harness all pass (counts in CLAUDE.md's running-totals block); `counts.mjs --check` and `lint:server` clean. Bite-checked: PK-2..PK-7 and PK-7 DOM (each mutation BIT).
REGRESSION RISKS: the HTML handbook's card print rule now reads `body:not(.print-sec,.print-doc)` — ONE :not so `main > section.qrc` still outranks it (two :nots printed 1 page for 15; validate_render's print check caught it).
INVARIANTS AT RISK: None
NET SCORE: n/a (operator feature work)

OPERATOR ACTIONS / DEPLOY:
- Deploy the web app (`cd web-app && clasp push -f` + New version): the Reference reader's handbook labels | BLOCKS DEPLOY: N
- Re-export and import the handbook (`manual/make_all.sh` → Reference → Handbook → Choose File → Check → Import → Publish): section titles changed ("How to use this handbook", "A.1 Handbook terms") | BLOCKS DEPLOY: N
- Send each reviewer their packet + their chapter PDF + the full handbook PDF (review-packets/pdf/) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version

FOLLOW-ON ITEMS:
- The built file names still carry "v3.0" (`Policies-and-Procedures-Handbook-v3.0.*`); the HTML handbook's sidebar still shows "v3.0 draft · built …" — the operator removed the version from covers and footers only.
- make_all.sh's LibreOffice PDF (from the Word file) keeps the Word design; the review PDFs come from the HTML.
- Code comments in web-app/00_config.js and 70_kb.js still say "CSR Procedures Manual" (comments only — a change would need a manifest revision).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (operator-log, harness log, manual/README incl. the cloud-container build recipe)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
