---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): ED2 (operator plan 2026-11-05) — the Employee Docs box editor & zoom: placed boxes move and resize on a 1/8-inch grid of their page (Alt free), arrow-key nudge and Shift-resize, Duplicate; zoom (Fit width / 100% / + / −) in the issue form and the reader; upload warnings (non-Letter/A4, rotated pages, small text); boxes off the PDF refused (client + server); a fillable PDF's own form fields offered as boxes
Files modified: web-app/train/script_empdocs.html, web-app/20_timeclock.js, web-app/81_empdocs.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/shoot.mjs, test/visual/mock.js, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~5 h) — written to STATE.md's Estimates line before the first edit (commit 691319d)
Actual: ~4.5 h

CHANGES:
ED2 editor | web-app/train/script_empdocs.html | Pure `edBoxSnap_` / `edBoxMoved_` / `edBoxResized_` / `edBoxNudge_` / `edBoxDuplicate_` / `edBoxDupLabel_` (9-point grid of the box's own page, clamped whole onto it, never below one line of its type or 1/4 inch wide). An edit box is focusable (aria-label says how), carries Duplicate beside Remove and a corner resize handle; `edIssuePdfPointer_` drags the body to move and the corner to resize (a press under 3 px only selects; Alt places freely), arrow keys nudge (Shift resizes); `edBoxCommit_` repaints and re-focuses the box (g141); `edDuplicateBox_` inserts the copy after the original, stopping at `ED_FIELD_CAP` (= `EMPDOC_FIELD_CAP`).
ED2 zoom | web-app/train/script_empdocs.html | `edRenderPdfPages_` keeps its pages on `host._edPdf`; `edPdfDrawPage_` draws a canvas at the host's zoom (cancelling a running draw); `edPdfSetZoom_` / `edZoomNext_` / `edZoomLabel_` / `edZoomBarHtml_` / `edZoomBarShow_` — Fit width, 100% (96 px an inch), + / − over 50–300%, page widths set and only canvases redrawn, so box layers and typed answers stay; a zoomed document scrolls sideways in its column. The bar is in the issue form and the reader.
ED2 upload notes | web-app/train/script_empdocs.html | `edRenderPdfPages_` gains `inspect` → `edPdfInspectPage_` (pdf.js text sizes and widget annotations); `edPdfWarnings_` (non-Letter/A4 either way up, stored rotation, median text under 7 pt — grouped by page, advisory) and `edPdfFormBoxes_` (Tx/Ch → text, multi-line → paragraph, name says date/initials → those, Sig → signature; checkboxes/buttons counted, hidden skipped, one box per field name, tooltip or readable name, raised to one line, kept on the page); `edIssuePdfNotes_` shows both; `edUseFormBoxes_` adds them (to the cap) and turns "Require signature" on only if it was off.
ED2 off-page | web-app/train/script_empdocs.html, web-app/20_timeclock.js, web-app/81_empdocs.js | `edBoxesOffPage_` refuses an Issue with a box past the last page or an edge, and the issue sends `pdfPages`. Server: `empDocPdfPageCount_` reads the largest clear /Type /Pages /Count from the bytes (nested dictionaries skipped), `empDocPdfItem_` carries it, `empDocPdfPagesOf_` picks bytes > the browser's whole-number count > unknown, and `empDocValidateFields_` refuses a box past it by name.
ED2 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Six pure pins (geometry, duplicate/off-page/cap mirror, zoom, warnings, form boxes, the server bound incl. two of the repo's real forms), four DOM drives (warnings + offer, pointer/keyboard/duplicate, zoom keeps layers and typed answers, off-page refusal), four visual scenarios with a 3-page fillable PDF fixture (`ED2_FORM_PDF_URI`); INV-403, S162, the decision entry `#ed2-box-editor-and-zoom`, the module note, the CLAUDE.md index link and running totals.

TEST RESULTS: pure 1548/1548, DOM 387/387, `lint:server` clean, `counts.mjs --check` clean; the visual matrix's ED2 + Batch H/ED1 Employee Docs scenarios report 0 overflow, 0 runaway, no narrow text, no errors. Real pdf.js (the visual harness's pinned 3.11.174) read the repo's seating form as 17 text fields + 153 checkboxes and the fixture as 4 boxes, 1 checkbox and three warnings. Bite-checks: 28 of 28 mutations bite (20 pure over geometry, duplicate, off-page, zoom steps, warnings, form boxes and the server page bound; 8 DOM over zoom widths, layers rebuilt, the 3 px press, Alt, re-focus, the off-page refusal, the signature switch and the checkbox count) — one, the duplicate name's `while`→`if`, was a NO BITE first (its case needed one skip); the pin now needs two and bites. Regression scenarios: S156/S157 (Batch H / ED1 PDF issue and sign) — PASS by the unchanged Batch H and ED1 DOM drives and pins; S162 new — operator walk owed.
REGRESSION RISKS: `edRenderPdfPages_` now keeps pdf.js page objects on the host for the zoom (released when the host is re-rendered); the certificate viewer uses the same renderer but has no zoom bar. A PDF whose page tree is in a compressed object stream is bounded on the server by the browser's count (a manager could forge it, but a manager is the author). Creation by a drag is not snapped (ED1's point sizes stand).
INVARIANTS AT RISK: None — INV-403 added; Batch H's box shape (page + 4-place fractions) and ED1's point sizes unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (ED2 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with ED1) | BLOCKS DEPLOY: N
- Walk S162 on DEV with a fillable PDF (the repo's seating form) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version

FOLLOW-ON ITEMS:
- A box cannot be dragged onto another page (remove and place it there).
- A Fit-width page is not redrawn when the window resizes (as before ED2).
- On a phone at Fit width a very small box's handles cover it (zoom in).
- ED3 must map boxes on a page stored rotated when it writes the filled PDF (the upload now warns about such pages).

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
