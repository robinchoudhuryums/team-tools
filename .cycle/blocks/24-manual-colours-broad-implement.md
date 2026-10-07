---IMPLEMENTATION SUMMARY BLOCK---
Scope: the CSR Procedures Manual — chapter colours and icons (operator-approved 2026-10-07) | Cycle: 24 (manual-update thread)
Files modified: manual/data/chapter_style.json (new — the ONE source), manual/make_html.py, manual/render_docx.js, manual/rasterize_diagrams.py, manual/mocks_power.py, manual/diagrams/power-process.svg, web-app/script_icons.html, web-app/styles_design_tokens.html, web-app/kb/script_kb.html, web-app/kb/script_manual_diagrams.html (generated), test/client/run.js, CLAUDE.md (running totals)
Estimate: M (~4 h) — written before the first edit
Actual: ~3 h

What changed:
- The v2 palette (one stripe per chapter; the operator declined the two-tone family stripe) and eleven chapter icons — headset, phone, walker, PAP mask, clipboard, lightning bolt (Power), truck, the CRM's Repair hammer-and-wrench redrawn (Service), moon, oxygen tank, dollar — live in manual/data/chapter_style.json, keyed by TODAY's part keys.
- HTML: palette filled from the file at write time; part headings carry a round badge and take the chapter colour; the sidebar, section eyebrows, CARD chips and the cards' contents list carry the icon. Search hits and pins got their own tokens (--hit, --pin) so a chapter colour no longer repaints them.
- Word: light palette from the file; each chapter heading gets its badge (rasterize_diagrams.py draws out/icons/pN.png) and a left stripe. The rasterizer now fills the light palette from the file — it had read make_html.py's literal :root, which is now a placeholder (the diagrams would otherwise have lost every part colour).
- Reference reader: the seven new icons join ICONS; --man-pN tokens (light + dark); a part's title gets a badge and stripe, the tree shows the icon; --dg-pN map onto --man-pN, so the app's diagrams draw in the manual's chapter colours (they were mapped onto unrelated UI tokens).
- Power process diagram: its Field Ops lane and ATP Eval box used --p8 (now After Hours green) and use --p5 (Field Ops).
- Field Ops light #2F8456 → #2D7E52: MP2-1 measured 4.30:1 on the app's light paper (#f6f7f9).

Tests: pure 1250/1250 (MP2-1..MP2-4 new), DOM 222/222, lint:server clean, counts --check clean. Bite-checks: 13/13 BITE (contrast, icon fill, hand-typed palette, pin token, rasterizer fill, app icon path, dark token, reader map, diagram token, badge gating, own-property guard, escaping, tree gating). Manual build: 0 errors, the same 32 warnings as before; html 482 ids / 408 links; 0 clipped; print 12/12; Word 12 chapter headings with badge + stripe. Visual: the 19 reference-manual scenarios — 0 overflow, no missing fixtures.
Deploy: app part needs clasp push + New version (icons, tokens, reader, diagram partial); re-export + import manual.json is NOT needed for the colours (they are code), only for the Phase 1 content.
Follow-on: the Phase 4 renumber re-keys chapter_style.json, KB_MANUAL_CHAPTER_ICONS, --man-pN and --dg-pN together (MP2-1/MP2-3 hold them equal). Word's TOC may show the heading badges (unverified — LibreOffice cannot open files in the sandbox).
---END IMPLEMENTATION SUMMARY BLOCK---
