---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): ED4 (operator plan 2026-11-05) — Employee Docs letterheads & written-document formatting: two letterheads kept in Admin (UniversalMed Supply, Infimed Solutions — name, logo upload, address, footer); a roster Company column; a per-document picker; a Write / Preview switch; alignment, a signature block and page breaks; the letterhead on the reader, the certificate and the printed copy
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/81_empdocs.js, web-app/train/script_empdocs.html, web-app/cn/script_callnotes.html, web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/shoot.mjs, test/visual/mock.js, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M–L (~6 h) — written to STATE.md's Estimates line before the first edit
Actual: ~5 h

CHANGES:
ED4 server | web-app/00_config.js, web-app/20_timeclock.js, web-app/81_empdocs.js | `EMP.COMPANY` (column S) and `ROSTER_CACHE_KEY` v12; `lookupEmployeeById_` carries `company`. EmpDocs gains a trailing `LetterheadId` (`ED.LETTERHEAD`), read by `empDocRowToObj_`, never by `empDocContentHash_`. Letterhead constants (`EMPDOC_LETTERHEADS_PROP`, the seed, ≤6, `LetterheadLogos` tab, PNG/JPEG, 300 KB). Pure `empDocLetterheadList_` (seed until saved; unreadable or empty → seed; slug ids, ≤4 address lines, logo keys of their shape), `empDocLetterheadFor_` (roster Company by id or name), `empDocLetterheadUpsert_`, `empDocLetterheadPick_`, `empDocHasSigBlock_`. Endpoints: `getEmpDocLetterheads` (manager; letterheads with logos, each employee's default, canEdit), `saveEmpDocLetterhead` / `deleteEmpDocLetterhead` / `setEmpDocLetterheadLogo` (admin, locked, through `propSetBounded_`, audited; a logo checked to start like a PNG/JPEG, stored by content; the last letterhead cannot be deleted). `issueDoc` refuses a removed letterhead and stores the id; `getMyDoc` carries the letterhead, the employee's name and the drawing for a `[signature]` body; the certificate is headed by the letterhead (a table — the HTML→PDF conversion — escaped, PNG/JPEG data-URL logo only) and ends with its footer.
ED4 client | web-app/train/script_empdocs.html, web-app/cn/script_callnotes.html | `edDocSegments_` (`:::center`/`:::right`…`:::`, `[page break]`, `[signature]`), `edLetterheadHtml_`, `edSigBlockHtml_`, `edDocBodyHtml_`, `edDocPaperHtml_` (the written reader on its paper), `edInsertDirective_` + Insert buttons, Write / Preview (`edIssueWritePreview_`, the picked letterhead and the employee's name), the letterhead picker (`edLoadLetterheads_` beside the form, `edFillLetterheadPicker_` keeping a manual pick, `edLetterheadDefault_` from the employee; a failed read disables it and issues with none); the admin editor `edLetterheadsMount_` mounted from Admin → Config (cards with a preview, Save, Delete after a confirm, Add, logo upload through `edFitLogo_` — shrunk to 600 × 240 px and the limit — and Remove logo). ED3's printed copy: `edCopyFlow_` takes a header (first page) and footer (every page) and aligned lines; `edCopyHead_`; `edCopyWritten_` follows the segments (alignment, a new page, the signature block where it stands, no second signature after the answers); `edBuildCopy_` embeds the PNG/JPEG logo.
ED4 tests/docs | test/*, web-app/Tests.js, docs/*, .cycle/config.md, CLAUDE.md | Six pure pins, four DOM drives (the reader, the issue form, the admin cards, the written copy over the real pdf-lib and pdf.js), five visual scenarios (a real logo PNG in the mock — a made-up one never returns from pdf-lib's embed), gate cases for the four endpoints, INV-136 names the three admin endpoints, INV-405, S164, the decision `#ed4-letterheads-and-formatting`, the module note, the operator-state entry and inventory line, the HR row of the storage map, running totals; two older pins widened for the new trailing column and cache key.

TEST RESULTS: pure 1562/1562, DOM 395/395, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean; the five ED4 visual scenarios report 0 overflow, 0 runaway, no narrow text, no errors. Bite-checks: running (22 mutations; the verdicts are added when they finish). Regression scenarios: S156/S157/S162/S163 (PDF issue, sign, editor, finished copy) — PASS by their unchanged drives and pins (two widened for the new column); S164 new — operator walk owed.
REGRESSION RISKS: The roster cache key changed (old entries expire in 5 minutes). A written document now renders through `edDocPaperHtml_` (its paper and markers) rather than a bare `kbMd_` — a body that happens to contain a line `[signature]`, `[page break]` or `:::center` now formats; existing documents are unlikely to. The admin endpoint count rose by three and the manager count by one.
INVARIANTS AT RISK: None — INV-405 added; INV-136 extended by name; INV-122/134 (HR never purged) untouched (the logo tab is append-only).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (ED4 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version | BLOCKS DEPLOY: N
- Manage → Admin → Config → Letterheads: addresses, footers and logos for both companies (until then they show by name) | BLOCKS DEPLOY: N
- Roster column S: `Infimed Solutions` for each India-based employee | BLOCKS DEPLOY: N
- Walk S164 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- The Team Members admin form does not edit column S (the sheet does).
- A letterhead is not frozen with a document (chosen: presentation, not content).
- A hand-made logo upload that starts like a PNG but is broken could stall the printed copy (every logo chosen in the app is re-encoded by the browser).
- Markers inside a fenced code block are read as markers.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
