---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): ED3 (operator plan 2026-11-05) — Employee Docs finished documents: a filled copy built in the browser (answers and signature drawn in, an overflow/answers page, the certificate appended, labelled a copy); Print with preview; Email with preview (the employee, optionally managers, an outside address only after a confirm, an audit row, an attachment size limit)
Files modified: web-app/train/script_empdocs.html, web-app/81_empdocs.js, web-app/00_config.js, web-app/styles.html, handbook-app/styles.html (sync copy), package.json, package-lock.json, test/visual/package.json, test/visual/package-lock.json, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/shoot.mjs, test/visual/mock.js, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: L (~7 h) — written to STATE.md's Estimates line before the first edit
Actual: ~5.5 h

CHANGES:
ED3 copy | web-app/train/script_empdocs.html | `edPdfLib_` loads pdf-lib 1.17.1 from jsDelivr's npm path only when a copy is first made, SHA-256 checked before it runs, run from the checked bytes, a failed load not kept. Pure `edWinAnsi_`, `edFillDate_` (MM/DD/YYYY), `edFillPoint_` (a shown-page point to PDF space for 0/90/180/270 and an offset crop box — matches pdf.js's convertToPdfPoint), `edFillWrap_`, `edFillLayout_` (10→7 pt as ED1; cut with "…" and marked over), `edCopyLabel_`, `edMdBlocks_`. `edBuildCopy_` loads the original (or creates pages for a written document via `edCopyFlow_` / `edCopyWritten_`), draws answers/signature/initials (`edCopyDrawBoxes_`), sets cut and box-less answers in full (`edCopyAnswers_`), appends the certificate, stamps every page (`edCopyStamp_`), sets the title/subject.
ED3 preview, Print, Email | web-app/train/script_empdocs.html, web-app/styles.html | Reader foot: Print… / Email… beside Certificate for a signed or completed document. `edOpenCopy_` fetches the original (re-hashed against `doc.pdf.sha` in the browser — a mismatch makes no copy) and the certificate, builds, previews with pdf.js and the ED2 zoom bar; Download, Print (`edPrintCopy_`: pages as images in `.ed-print-pages`, the one print subject through `kbPrintEls_`, print rule (8)), Email… (`edCopyMailOpen_` / `edCopyMailPreview_` / `edCopyMailSend_`: the server's preview, re-asked on each choice, an older answer dropped; an outside address confirmed; the copy's bytes sent; success closes the panel, a refusal stays). Email disabled over `ED_COPY_MAX_BYTES` (= `EMPDOC_COPY_MAX_BYTES`).
ED3 server | web-app/81_empdocs.js, web-app/00_config.js | `EMPDOC_COPY_MAX_BYTES` (10 MB), `EMPDOC_COPY_EXTRA_MAX` (5). Pure `empDocCopyRecipients_`, `empDocCopyFileName_`, `empDocCopyEmailParts_` (escaped; note capped), `empDocCopyAuditNote_` (outside addresses as domains, g36). `emailEmpDocCopy`: owner or `empDocCanManagerSee_`, signed/completed only, preview from the same builder, outside needs `outsideOk`, a PDF within the limit, `sendRepEmail_` with the attachment named for the title, `EmpDocCopyEmailed` audit row with the copy's SHA-256; a failed send is said.
ED3 tests/docs | test/*, package*.json, docs/*, .cycle/config.md, CLAUDE.md | pdf-lib + pdfjs-dist as root dev dependencies and pdf-lib in the visual harness (route serves it); eight pure pins (one hashing the installed pdf-lib); four DOM drives that build real copies with pdf-lib in the page and read them back with pdf.js (positions, the rotated page, the answers page, the certificate, the label, Download, the written document, the SHA mismatch and failed loads, the email flow); three visual scenarios and a mock `emailEmpDocCopy` (the fixture PDF's SHA-256 is now its real one); INV-404, S163, the decision entry `#ed3-finished-documents`, the module note, the CLAUDE.md index link and running totals.

TEST RESULTS: pure 1556/1556, DOM 391/391, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean; the three ED3 visual scenarios report 0 overflow, 0 runaway, no narrow text, no errors. Print measured in Chromium (print media): the three copy pages only, the preview, buttons and reader hidden, one image a sheet. Bite-checks: 25 of 25 mutations bite (19 pure over the font filter, the date, the rotation map and offset, wrapping, the one-line rule, the ellipsis, the label, the markdown links, the loader's failure state, the recipients, escaping, the audit domain, the outside confirm, the size limit, the gate, preview-sends-nothing and the status; 6 DOM over the original's hash, pdf-lib's checksum, the page label, the answers page, the rotated placement and the outside confirm) — two were first re-run because the mutation text did not apply through the shell (a `$` and a backslash), then bit. Regression scenarios: S156/S157/S162 (PDF issue, sign, editor) — PASS by their unchanged drives and pins; S163 new — operator walk owed.
REGRESSION RISKS: The reader's foot gains two buttons for signed/completed documents. The visual fixture's PDF SHA-256 changed to its real value (screenshots show it). Root devDependencies grew by pdf-lib and pdfjs-dist (CI's `npm ci` installs them; the dependency-free pure floor skips the one pin that hashes the installed file).
INVARIANTS AT RISK: None — INV-404 added; INV-122/134 (HR never purged) untouched: the copy is never stored.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (ED3 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with ED1/ED2) | BLOCKS DEPLOY: N
- `npm run handbook:push` + New version (the handbook's styles.html copy carries the new print rule) | BLOCKS DEPLOY: N
- Walk S163 on DEV (Print, Download, Email incl. an outside address; a written document; a blocked CDN) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version); `npm run handbook:push` (then New version)

FOLLOW-ON ITEMS:
- A written document's copy is plain text (no letterhead, alignment or page breaks) — ED4.
- Answer characters outside Windows-1252 print as "?" (the standard font); an embedded font would cover them.
- Print uses 144 dpi page images; Download gives the vector PDF.
- Whether the injected pdf-lib runs inside the Apps Script page is untested until S163 (the same open question as I3's reader, S161).

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
