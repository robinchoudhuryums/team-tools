---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PT1 (operator 2026-11-05 plan, sheet arrived 2026-11-09) — payor tables: the source sheet's Primary Medicaid tab as a second allowlisted payor table (MedicaidPayors), uploaded through PT1a's converter; one insurance search across every payor table, grouped by table on screen, each group with its own standing note and the key from its own sheet
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~5 h) — written to STATE.md's Estimates line before the first edit
Actual: ~3 h

CHANGES:
PT1 tables | web-app/00_config.js, web-app/70_kb.js | `KB_DATA_TABLES.MedicaidPayors` (tab MedicaidPayors, sourceFormat payorAcceptance, payorTable 'Primary Medicaid'); InsurancePayors labelled 'Medicare / MA'. `insPayorTables_` = exactly the entries with a `payorTable` label (the allowlist stays the security boundary). The converter names an "Out-of-Network" / "Network" title Network Status (the Medicaid export's network column).
PT1 search | web-app/70_kb.js | `searchInsurancePayors` scans every present payor table's name column and ranks all matches together (excluded state last, score, then configured order); each plan carries `table`; the answer ships `tables` — label, note, sheet key and a note-read error per present table; none present is "not set up yet". The code join is unchanged. `kbSuggestPayorSynonyms` reads every payor table's names.
PT1 notes | web-app/70_kb.js | `INS_PAYOR_NOTE` becomes one map `{tableKey: {text, key, at, by}}` (`insPayorNotesParse_` / `insPayorNotes_`); PT1a's single value reads as InsurancePayors'. A source import writes only its own table's entry, with its export's key; an unreadable map is replaced with this table's entry and the loss is said (`noteWarning`). The dry run's current note and the Admin row read the table's own entry.
PT1 client | web-app/kb/script_kb.html | `insRenderResults_` draws a group per table with matches, in the server's table order: the table's name (two or more tables), `insNoteHtml_` ("For every plan in Primary Medicaid: …"), its plans in ranked order, and `insKeyHtml_` ("Sheet key: Try = …", escaped); not listed shows every table's note then the TRY guide; an answer without `tables` reads as one unnamed table (`insTablesOf_`). CSS `.kb-ins-group*`, `.kb-ins-key`.
PT1 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Three pure pins (the Medicaid export converted over its real header strings; the search as one ranking over two tables with notes, keys, a skipped table, a non-payor tab never searched and an unreadable map; the allowlist, the per-table map write, the alias suggestion), one DOM drive (groups, order, named notes, escaped key, not-listed notes, one table unheaded), four PT1a pins and the ELIG named-tab pin moved to the map / the table list; fixtures with two tables; INV-410, S169, the decision `#pt1-payor-tables`, the module note, the operator entry + inventory link, the storage map; reference scenarios reshot (0 overflow, the two groups visible).

TEST RESULTS: pure 1595/1595, DOM 400/400, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten. The real Medicaid export run through the in-app converter: 405 plans, each reader slot from one column, every code header parses, the key with Try captured. Bite-checks: 15 of 15 mutations bite (10 pure, 5 DOM); the search pin was first given a cross-table tie and an allowlisted non-payor tab, without which two of its rules could not fail. Regression: the insurance lookup scenarios (T1/T3/PT1a DOM drives, the reference visual scenarios) — PASS; S169 new — operator walk owed.
REGRESSION RISKS: The lookup now reads up to two tabs per search (one name column each, then the top rows) — bounded as before per tab. Until MedicaidPayors is imported the lookup is Medicare / MA alone, as today. The Medicaid sheet's 16 bare "L" cells (K0800) are a value its key does not define and render untoned.
INVARIANTS AT RISK: None — INV-410 added; INV-409 (the conversion) unchanged but for the network-title rename; INV-46 bounded reads kept per table; INV-64 display values kept; the KB_DATA_TABLES allowlist boundary kept (a table is a code change).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PT1 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (carries PT1a too) | BLOCKS DEPLOY: N
- After the deploy, upload both source exports once — Medicare / MA on "Insurance payor acceptance", Primary Medicaid on "Primary Medicaid acceptance" — so each table's note and key are stored | BLOCKS DEPLOY: N
- Walk S168 and S169 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- The legend popover explains TRY the Medicare / MA way; Medicaid's own meaning shows on its group's Sheet key line, not in the popover.
- A further payor tab (another family, other codes) is one allowlisted entry; its codes join the pricing tab the same way.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
