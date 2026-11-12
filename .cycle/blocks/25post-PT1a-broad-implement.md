---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PT1a (operator 2026-11-09, ahead of PT1) — the InsurancePayors upload accepts the source "Payor/HCPCS Order Acceptance" sheet's own CSV export and converts it in the import's one parse, every step listed in the preview; the rule in the source's top-left cell is stored on import and shown above every insurance lookup answer
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~4 h) — written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
PT1a conversion | web-app/70_kb.js, web-app/00_config.js | Pure `insPayorFromSource_(grid)`: recognised by three or more code headers on row 2 and more than on row 1 (else null — a tab-shaped file imports untouched); one header row (row 2's title, else row 1's; column A "Insurance"); "Network Last Update" → "Last Update" and "OON reimbursement (% …)" → "OON Rate (% of Medicare)" (each would have filled the network-status / reimbursement slot), "Reimb. Status" → "Reimbursement Status", "Waystar…" / "Qualif…" given the slot names; code headers cleaned by `insCodeHeaderClean_` only when that makes them parse ("K0825 Up to 435 lbs" → "K0825 (Up to 435 lbs)", "K0843 (" → "K0843"); key columns ("X = Yes", "Y = …", "Z = Hawaii Only") and data-less columns dropped; blank and unnamed rows dropped by source row number; a cell that is exactly a key letter other than X/NO written "<meaning> (<letter>)". Returns the grid, the note (A1, spaces collapsed, capped at INS_PAYOR_NOTE_MAX; a bare title is not a note) and a `changes` list. The spec gains `sourceFormat: 'payorAcceptance'`.
PT1a import | web-app/70_kb.js | `kbImportDataTable` converts before every limit and the summary, so the preview is the write; the dry run carries `converted` and `currentNote`; a source write stores the note through `propSetBounded_` (INS_PAYOR_NOTE {text, at, by}) after the table write, deletes it for an empty A1, and leaves it for a tab-shaped file; the audit row adds `converted=source; note=set|cleared`. `kbDataTableSummary_` warns when `insPayorSlotOf_` (the reader's own if-chain) finds one slot filled by two columns — for every upload.
PT1a note | web-app/70_kb.js, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html | `insPayorNote_` (throws on an unreadable value); `searchInsurancePayors` returns `note` and `noteError`; `insNoteHtml_` draws "For every plan: …" (escaped) above a match and above the not-listed answer, and says so when the note could not be read; `getKbDataTables` carries the note to the Admin row, which shows it, its absence, or its read error. The preview lists every conversion step and the note it will set or remove.
PT1a tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Seven pure pins over a miniature of the real export (its own header strings), one DOM drive, fixtures (the note on the lookup, the conversion in the import preview); INV-409, S168, the decision `#pt1a-source-format-payor-import`, the module note, the operator entry + inventory link, running totals. The visual page was rebuilt and the Reference results/drawer scenarios reshot: the note renders above the results in light, dark and the drawer, 0 overflow.
PT1a data (operator deliverable, not committed) | scratchpad | The 11-09 export converted by hand and checked with the app's own parser, import summary, row reader, code parser and legend (InsurancePayors_2026-11-09.csv, sent). The in-app conversion matches it on every row except six cells that read exactly "Y", which the in-app version writes from the source's key.

TEST RESULTS: pure 1592/1592, DOM 399/399, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten. One `counts.mjs --check` DOM run failed the unrelated HB4.1 pdf.js viewer drive once; it passed in the DOM runs before and after — a timing flake outside this change. Bite-checks: 28 of 28 mutations bite (24 pure, 4 DOM); three pins were first given the case their rule exists for (a plain X stays X, a tab whose row 2 mentions codes, a code header still unreadable after cleaning). Regression: the Reference insurance lookup and the Admin data-table scenarios — PASS by their drives (T1/T3 DOM, ADM-05); S168 new — operator walk owed.
REGRESSION RISKS: A tab-shaped file whose row 2 holds three or more code-shaped cells AND more than row 1 would be read as the source shape; the preview names the conversion before anything is written. Until the first source upload after the deploy there is no note. "Y" cells now read their meaning from the source key (they were treated as stray shorthand before the file carried a key); they stay untoned.
INVARIANTS AT RISK: None — INV-409 added; INV-64 (a foreign sheet is read as displayed) — the conversion rewrites only headers and exact key-letter cells, every other value verbatim; the ADM-05 order (grow before clear, restore on a failed write) unchanged, and the note is written only after the table write succeeds; Q-1 (bounded property writes) — the note goes through propSetBounded_.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PT1a is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version | BLOCKS DEPLOY: N
- After the deploy, upload the source export itself once (Admin → Config → Reference data tables) so the standing note is stored | BLOCKS DEPLOY: N
- Fix the source slips if wanted (K0005 "1/13/23", "hris", "Humana", "SI", "0", "PR/SI" on SWHR) | BLOCKS DEPLOY: N
- Walk S168 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- The source's branch/driver location side list (in its "Y = …" key column) is dropped; it is not compared with LocationAcceptance's warehouse rows.
- PT1 proper (further payor sheets with their own keys) waits on the operator's sheets.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
