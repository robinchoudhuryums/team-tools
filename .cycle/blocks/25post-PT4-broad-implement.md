---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PT4 (operator 2026-11-10) — the Manual Mobility items payor table: the non-PMD sheet (a row per payor, item categories over its codes, its key written below the table) as a fifth allowlisted payor tab through the one converter; codes carry their item and the card's code grid is grouped by it; the key below the table is the sheet key and its delivery locations the note; the sheet's words are coloured and explained
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: L (~6 h) — written to STATE.md's Estimates line before the first edit
Actual: ~4.5 h

CHANGES:
PT4 table | web-app/00_config.js | `KB_DATA_TABLES.ManualMobilityPayors` (payorTable 'Manual Mobility items', sourceFormat payorAcceptance); `INS_CODE_HEADER_FIXES` = { E1930 → E1390 } (operator-confirmed only).
PT4 converter | web-app/70_kb.js | `insPayorFromSource_`: multi-line header and value cells read as one line; row-1 item categories prefixed to each code header ("Walker: E0143 & E0156") only when they cover EVERY code column — a partial set is dropped and said (Medicare / MA, UHC keep none; Medicaid, BCBS keep Scooter / Power Chair / Complex Rehab); A1's "Payor/HCPCS…" title is never a note ("Use the row for the patient's primary insurance" instead); `insPayorBelowKey_` finds a key below the table by its arrow cells (an arrowless row of the same columns too), returns it merged AFTER the key-letter rewrite so no cell is rewritten, and its other cells join the standing note; the key's rows are not reported as nameless plans; `insPayorValueTidy_` corrects listed misspellings (Refferal, faclity, if patience asks, SanMarcos) and names "Need X's Exception" by role ("Needs a supervisor exception"); "BAV" → "billed as"; E1930 → E1390; every step listed. `insCodeHeaderClean_` leaves a header naming a second code of the same family ("K0007 billed as K0006") unreadable — out of the pricing join — while "K0001 w/ E1226" joins as K0001.
PT4 reader + search | web-app/70_kb.js | `insCodeGroupSplit_` → {group, label}; `insPayorRowObj_` details carry `group`; `insPayorCrossDiff_` parses the label; `searchInsurancePayors` ships `hasStatus` per table (a network status column or not).
PT4 client | web-app/kb/script_kb.html | `insGroupedCells_` draws the code grid under item headings (`.kb-ins-cat`, escaped) when the sheet names categories; a card from a table without a status column draws no "status not recorded" pill; legend: `INS_IS` qualYes / oop / medicaidOnly / priorityRef / branchArea / deliveryOnly / texasOnly / waiver / maPlanOnly / onRequest / npc / supervisorEx (amber, each with its own term — the key's and the operator's meanings) and `notAccepted` reads "NO (…)" (red).
PT4 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Five pure pins (the sheet in miniature over its real strings; categories only when complete; the below-key, value tidy, group split, second-chair and categorised cross-table compare; the allowlist + hasStatus + the fix map; the legend terms) and one DOM drive (grouped grid, escaped item, no pill vs. a pill, tones); the PT1 Medicaid pin follows its categories, the PT1 search pin `hasStatus`; the visual fixture carries a Manual Mobility card; INV-413, S172, the decision `#pt4-manual-mobility-items`, the module note, the operator entry + inventory link, the storage map.

TEST RESULTS: pure 1609/1609, DOM 403/403, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten. All five real exports through the converter: Manual Mobility — 26 payors, 17 categories, the 9-term key and the delivery-location note read, 22 "Need Nikunj's Exception" by role, 26 misspelt cells corrected, BAV and E1930 fixed, no nameless-plan rows; the four PMD sheets change only by the categories (Medicaid, BCBS) and no value tidy fires on them. Reference scenarios reshot (0 overflow); the grouped card probed light and dark. Bite-checks: 26 of 26 mutations bite (23 pure incl. the three legend rules, 3 DOM); the categorised cross-table compare had no pin until one was added before the run (ea91182). Regression: the insurance lookup scenarios (T1/T3/PT1a/PT1/PT2/PT3 DOM drives, the reference visual scenarios) — PASS; S172 new — operator walk owed.
REGRESSION RISKS: Re-uploading Medicaid / BCBS renames their code headers ("Power Chair: K0816"); every reader of a code header goes through insCodeGroupSplit_ or reads the detail label. A qualified "Yes, …" is now amber everywhere — Medicare / MA's "Yes, if Branch or Driver is located within 100 miles (Y)" included (it was uncoloured). A cell starting with the word "No" is red ("NO - K0837" on Medicare / MA).
INVARIANTS AT RISK: None — INV-413 added; INV-409 (the conversion) widened by categories and the below-key, its PMD behaviour otherwise unchanged; INV-410/411/412 unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PT4 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with PT1a–PT3) | BLOCKS DEPLOY: N
- After the deploy, upload the Manual Mobility sheet on "Manual mobility acceptance" and re-upload the Medicaid and BCBS exports | BLOCKS DEPLOY: N
- Ask the department what "T3 Purchase Order" means | BLOCKS DEPLOY: N
- Walk S172 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- "T3 Purchase Order" is shown as written (amber via DFW) until its meaning is known.
- Medicare / MA's and UHC's partial row-1 categories could be completed in the source sheets; the converter then keeps them on the next upload.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
