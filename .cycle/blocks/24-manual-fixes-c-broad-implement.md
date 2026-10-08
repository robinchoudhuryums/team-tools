---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: change list C1 (photo cells — hardened) · C2 (numbered lists never restart) · C3 (callout leads lowercase in Word) · C4 (labels and rows split across pages) · C5 (equal column widths) · C6 (raw **, backticks, _ in the text) · C7 (footer "Page" size — hardened); plus the operator's request ahead of it: a Purchase row on the rental timeline (ca6dc6c). C8 is plan 2.4 (operator).
Files modified: manual/render_docx.js, manual/md2model.py, manual/build.py, test/client/run.js, CLAUDE.md (generated counts), .cycle/STATE.md; ca6dc6c: manual/mocks_b1.py, manual/diagrams/rental-timeline.svg, web-app/kb/script_manual_diagrams.html
Estimate: M (~4 h)
Actual: ~2 h

CHANGES:
Timeline | mocks_b1.py (+ svg, partial) | "Purchase — walkers, nebulizers, braces: Billed once — the patient owns it from delivery | Medicare covers repairs, with cost-sharing", above capped rental; checked in light and dark, 0 overflows
C1 | render_docx.js cell() | a cell holding a photo gets single spacing (no `line`), so no renderer can read an exact height and clip it — the XML never had an exact rule; likely LibreOffice-only
C2 | render_docx.js | each ordered list its own numbering instance (docx writes startOverride 1 — verified: 12 w:num, one per list); hanging indent 240 → 360 for "10."
C3 | md2model.py | after the label is split off, the first letter is upper-cased when it is a lowercase ASCII letter — make_html.py's rule; 0 lowercase leads left (was 145/238)
C4 | render_docx.js | cantSplit on every data row and on the callout's one row; the callout label keepNext (headings already were)
C5 | render_docx.js colWidths() | weight = 0.5·mean + 0.5·min(max, 80) chars, capped 60; each column ≥ its longest word (100 twips/char + 240, ≤ 3700) and ≥ 1000; the roomy columns shrink to fit. B.1 → Role 2318 · Holder 2251 · Backup 1810 · How to reach 3701; changelog Change ≈ 6600
C6 | md2model.py, build.py | ``` fences → code paragraphs; **`x`** parsed inside the bold; bold round a cross-reference/image/link split first, its ** markers paired left to right (the first attempt paired a closing ** with the next opening one and bolded the text between); build.py's generated _italic_ lines → *italic*. 0 ** / ` / _x_ left in the Word text
C7 | render_docx.js | "Page ", PAGE, " of ", NUMPAGES each their own run at size 15 (render_packet.js already prints the page number alone)
Pin | test/client/run.js MC-1 | drives colWidths (fills the page; an address column holds the address even when its share alone would wrap it; a date never wraps) + the shapes of C1–C4, C6, C7; bite-checked: the 3700 cap → 2400 (bit only after adding the crowded-table case — the first fixture never needed the minimum), the list instance removed, bold pairing reverted to adjacent

TEST RESULTS: Test Command `manual`; no Regression Scenario covers the Word renderer. make_all.sh ERRORS 0, print 12/12, 0 SVG overflows; Word XML checked (numbering, cantSplit 2172, footer runs, widths, no raw markup, capitals). Pure 1253/0 (+MC-1), DOM 223/0, lint ok, counts ok (block regenerated). No PDF — LibreOffice cannot load files in this container.
REGRESSION RISKS: cantSplit on a row taller than a page — Word breaks it anyway, so nothing is lost; a very wide table (n × 1000 > the page) falls back to equal widths. The column rule is Word-only; the HTML is untouched.
INVARIANTS AT RISK: None
NET SCORE: 6 − 0 = 6 (production: C2, C3, C4, C5, C6 on the printed manual, + the timeline row; C1/C7 hardening counted defensive)

OPERATOR ACTIONS / DEPLOY:
- Open the Word manual in Word and confirm the photos (C1) and the footer (C7) | BLOCKS DEPLOY: N
- `clasp push -f` + New version — the diagram partial changed (timeline) | BLOCKS DEPLOY: Y
Deploy: clasp push -f, then a New version

FOLLOW-ON ITEMS:
- C8 (landscape diagram pages) and A6 (cover + contents) wait on plan 2.4
- D (HTML), F2, E

DOCUMENTATION UPDATES NEEDED:
- None
---END BROAD SCAN IMPLEMENTATION SUMMARY---
