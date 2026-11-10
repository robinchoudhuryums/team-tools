---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PT2 (operator 2026-11-10, sheets arrived 2026-11-09) — payor tables by state: the source sheet's UHC By State and BCBS tabs as two more allowlisted payor tables (UhcPayors, BcbsPayors) through the one converter, which now reads a sheet grouped by state; each plan carries its State (and, on BCBS, its insurer), the search finds a plan by either, a card shows its state and insurer and a catch-all row says what it covers; the legend reads SI, PR/SI, INN and "In Network" as the operator defined them
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: L (~7 h) — written to STATE.md's Estimates line before the first edit
Actual: ~6 h

CHANGES:
PT2 tables | web-app/00_config.js | `KB_DATA_TABLES.UhcPayors` (payorTable 'UHC by state') and `BcbsPayors` ('BCBS / Anthem'), sourceFormat payorAcceptance — searched with Medicare / MA and Primary Medicaid as one ranking (PT1).
PT2 converter | web-app/70_kb.js | `insPayorFromSource_`: the plan name is column B when column A is mostly empty and B mostly filled (BCBS), column A then a state section or the insurer (a derived `Company` column); state sections open at a column-A state name, "Not state specific" / "Nationwide", or a catch-all row ("not listed below", "Unlisted", "unless … below" — `insPayorCatchAll_`), reaching back over the rows above that begin with the same state; three or more sections add a derived `State` column, rows before the first read "Multi-state / other"; `insStateLead_` reads a state name (run into the next word, misspelt within one edit or two for a long name, DC however written, never a two-letter code alone) and every misspelling read is listed; a plan naming a different state than its section keeps the section's and is listed; a section with no plan kept is not named. An untitled column with data is dropped and named with its count; a name with nothing recorded is dropped as a reminder; a sheet's own State/Company column is kept as "(sheet)"; `insPayorNoteTidy_` removes the "Added:" wrapper and BCBS's run-in "Plan Name" title; `insCodeHeaderClean_` strips a stray leading dash ("K0825 - Up to 435").
PT2 search | web-app/70_kb.js | `insPayorRowObj_` maps State / Company and marks `catchAll`; `searchInsurancePayors` scores each row's name with its State and Company cells (the first three columns, by header) so a plan whose name never says its state is found by it.
PT2 client | web-app/kb/script_kb.html | A card's head carries a `.kb-ins-state` chip; the meta names the insurer; a catch-all row draws `.kb-ins-catch` "Covers any <State> plan this sheet does not list by name" (no state for Multi-state / Not state specific), all escaped. Legend: `INS_IS.si` (SI = secondary insurance), `siPr` takes PR/SI, `accepted` takes INN and "In Network" and never a negated in-network; the SI/PR term is the Sales team's rule verbatim; SI is warn-toned and explained.
PT2 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Five pure pins (the UHC tab and the BCBS tab converted over their real header strings; insStateLead_ / catch-all / note grid; the search over State and Company + the table specs; the legend), one DOM drive (state chip, insurer, catch-all line with and without a state, escaped, no chip without a state); the T3 DOM drive's SI/PR definition updated to the operator's wording; the D1–D3 and wiring pins follow the widened name read; fixtures with four tables; INV-411, S170, the decision `#pt2-payor-tables-by-state`, the module note, the operator entry + inventory link, the storage map; reference scenarios reshot and the new groups probed in light and dark (0 overflow).

TEST RESULTS: pure 1600/1600, DOM 401/401, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten. All four real exports run through the converter: Medicare / MA unsectioned as before; Primary Medicaid 51 sections (two trailing MCO rows named under Wyoming); UHC 51 sections incl. DC and Texas, misspellings Conneticut / Louisianna / Wisonsin read and listed, 17 rows "Multi-state / other", 10 untitled row-fill columns dropped; BCBS name in column B, insurer as Company, 51 sections + Not state specific, untitled column X dropped (567 cells), 51 name-only reference rows dropped. Bite-checks: running at this commit — the first ten (8 pure, 2 DOM) bite but one: the catch-all reach-back had no fixture row, now added (c79e8b0); the tally lands in the next commit. Regression: the insurance lookup scenarios (T1/T3/PT1a/PT1 DOM drives, the reference visual scenarios) — PASS; S170 new — operator walk owed.
REGRESSION RISKS: The name read widens to the first three columns when one is titled State/Company (bounded per tab as before). A Medicare / MA or Medicaid upload is unchanged unless its sheet has three or more state sections (Medicaid does — its plans now carry a State, which only adds a chip and a search term). The legend's SI rule colours a bare "SI" amber where it was untoned.
INVARIANTS AT RISK: None — INV-411 added; INV-409/410 unchanged (the conversion's earlier steps and the one ranking); INV-46 bounded reads kept; the KB_DATA_TABLES allowlist boundary kept.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PT2 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (carries PT1a and PT1 too) | BLOCKS DEPLOY: N
- After the deploy, upload the UHC By State export on "UHC by state acceptance" and the BCBS export on "BCBS / Anthem acceptance"; read each preview before Replace | BLOCKS DEPLOY: N
- Say what BCBS's untitled column X is (it mirrors K0863 in 535 of 567 rows) — if a code with a missing title, title it in the source and re-upload | BLOCKS DEPLOY: N
- Walk S170 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- BCBS column X (above). Medicaid's "Washington D.C MCOs" / "Florida MCOs" rows sit under Wyoming in the source and keep it (named in the preview). BCBS's note keeps a stray TRY and its typos as written.
- A state name shorter than six letters is never read through a misspelling (Ohio, Iowa, Utah, Maine, Texas) — none was misspelt in the four exports.
- The operator's next payor sheet is "significantly different" and is processed on its own.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
