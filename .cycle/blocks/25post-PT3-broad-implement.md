---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PT3 (operator 2026-11-10) — payor cross-checks: the lookup marks a plan that another payor table answers differently on a shared code ("Also on … — answer differs", both answers); the upload preview names a row filed under another state's section; the network status's obvious misspellings are corrected and listed; the legend reads OONB and "cannot service state". Beside it, the four exports' conflicts were listed for the payor department as the artifact "Payor Sheet Clarifications" (not code)
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~4 h) — written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
PT3 cross-table | web-app/70_kb.js, web-app/00_config.js | `searchInsurancePayors` keys every scanned name (`insPayorNameKey_`) and, for each matched plan, reads the same plan's listings in the OTHER payor tables — at most `INS_PAYOR_ALSO_MAX` (12) per search; `insPayorCrossDiff_` compares by code token (column titles differ between sheets), only codes both fill, spacing and case ignored, codes with one pair of answers grouped; a match carries `alsoIn: [{table, label, state, differs: [{codes, here, there}]}]` only when something differs.
PT3 preview | web-app/70_kb.js | `insPlanStatesNamed_` gives the states a name names — certain (a full name anywhere, longest first; DC however written; "(XX)"; a bare code; "XX-" plan-code prefixes) and loose (ME, OR, IN, PA, MA, LA, PR… and "(MA)"/"(PR)"); the converter names a row whose name names another state and not its own (replacing PT2's start-of-name check): "… (row N, under State; the name says XX)", up to 12 listed. `insNetworkTidy_` corrects "Out-f-Network", "outof" and a word two letters from "network"/"benefits" in the Network Status column; each correction is listed with its count.
PT3 client | web-app/kb/script_kb.html | `insAlsoHtml_` draws "Also on <table> (<state>) — answer differs: <codes, +N>: <here> here, <there> there" (role=note, the full code list in a title, escaped; no state for Multi-state / Not state specific); `INS_IS.oonB` (amber, explained by Out-of-Network Benefits — "OONB is the same"), `INS_IS.cannotService` (red, its own term "Cannot service state"); the OON-benefits explanation reads "a different co-insurance rate" (operator).
PT3 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Four pure pins (the state reader + the preview's misfiled row; the network tidy + its listing; the code-token diff; the search's alsoIn both ways, agreement silent, blanks no disagreement, the read cap), one DOM drive (the line, escaping, multi-state, title, the two legend pills), the T2 legend pin widened (OONB, cannot service) and moved to "different co-insurance"; PT2's UHC pin follows the new message; the visual fixture carries an alsoIn line; INV-412, S171, the decision `#pt3-payor-cross-checks`, the module note, the operator entry, the T9 legend line.

TEST RESULTS: pure 1604/1604, DOM 402/402, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten. The four real exports through the converter: the preview names 3 Medicaid, 3 UHC and 5 BCBS rows filed under another state (incl. "BCBS NC" ×2 under New Jersey, "Carefirst … of DC" under Washington) and none falsely ("(CT, ME, NH)" under Maine, "LA Care", "(MA)"), and corrects UHC's three misspelt statuses. Reference scenarios reshot (0 overflow); the alsoIn card probed light and dark. Bite-checks: 21 of 21 mutations bite (17 pure incl. the two legend rules, 4 DOM); one mutation first failed to apply (a backslash in its pattern) and bit when rewritten without one. Regression: the insurance lookup scenarios (T1/T3/PT1a/PT1/PT2 DOM drives, the reference visual scenarios) — PASS; S171 new — operator walk owed.
REGRESSION RISKS: A search now reads up to INS_PAYOR_ALSO_MAX extra rows when matched plans also sit in another table (bounded). The preview's misfiled list now catches codes anywhere in a name, so it lists more than PT2's did (the operator reads it; nothing is moved). A bare "SI"-like or word-like code in a name never accuses a row.
INVARIANTS AT RISK: None — INV-412 added; INV-411's misfiled clause now reads through insPlanStatesNamed_ (stricter, still listing only); INV-46 bounded reads kept.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PT3 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with PT1a–PT2) | BLOCKS DEPLOY: N
- Re-upload the UHC and BCBS exports after the deploy so the misspellings are corrected in the tabs | BLOCKS DEPLOY: N
- Share "Payor Sheet Clarifications" with the payor department and correct the source sheet from their answers, then re-upload | BLOCKS DEPLOY: N
- Walk S171 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- The "Also on" check compares listings of one plan across tables, not two listings inside one table (the clarification page lists those; 13 today).
- The power codes accepted in the seven "no power orders" states (55 rows) are listed for the department; the app does not judge a row against the standing note.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
