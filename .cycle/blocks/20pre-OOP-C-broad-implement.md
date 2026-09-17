---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: OOP-C — the reader matches the operator's REAL `OopPricing` shape (name by header · search name OR code · one labelled Insert per priced column · the diagnostics report the name column)
Files modified: web-app/70_kb.js, web-app/30_callnotes.js, web-app/Tests.js, web-app/cn/script_callnotes.html, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~4 h), recorded in STATE.md BEFORE the first edit
Actual: ~3 h

HOW IT WAS FOUND, because the method is the point: the operator pasted their
header row and sample data. Rather than reading it against the code, the row was
RUN THROUGH THE LIVE READER in a vm sandbox. That printed the roles assigned to
each of the twelve headers, the object a rep would see, and the score for four
plausible queries. Three defects fell out of the output in one pass; reading the
code would have found the first and probably missed the third.

CHANGES:

OOP-C1 | 70_kb.js | THE NAME COLUMN IS FOUND BY HEADER. `oopRowObj_` hard-coded `row[0]`; the operator's column A is `HCPCS` and the item is column C, so `insPayorScore_` returned 0 for "Drive Scout" and 140 for "K0800". A rep typing the product name got the deliberate "not in the sheet — do not quote a similar item" refusal ABOUT AN ITEM THAT WAS IN THE SHEET. `oopNameCol_` finds the first name-role header; column A stays the fallback so a one-purpose sheet with a bare `Item` in A1 still works. Role order is load-bearing in three places now (`effective` before `price`, `price` before `name` so "Item Price" is money, `code` before `name` so "Item Code" is a code).

OOP-C2 | 70_kb.js | THE SEARCH MATCHES NAME **OR** CODE. A rep has whichever the customer gave them, and `K0800` already scored. `searchOopPricing` now reads the grid once and scores `max(name, code)` rather than scanning a single column and re-fetching the top N.

OOP-C3 | 70_kb.js, 30_callnotes.js, cn/script_callnotes.html, kb/script_kb.html | ONE LABELLED INSERT PER PRICED COLUMN. The sheet carries `OOP Price` $920, `Pick-Up Cost` $920, `W/ Shipping Cost` $1,070, `W/ Tech Delivery Cost` $1,220 — all correct, for different fulfilments. The reader took the leftmost, so the picker inserted $920 and the send verified $920: a $150 shortfall for any customer whose item ships, on the one path built so a wrong number cannot reach a customer. `oopRowObj_.prices[]` keeps every price-role column with its header as the label; `oopQuoteLine_` takes that label VERBATIM (inventing friendlier wording for "W/ Tech Delivery Cost" means guessing in an email someone pays against); `oopPriceByLabel_` resolves a quote against the column it NAMES. A single-price sheet passes no label and renders exactly as before. `Shipping` ($150) is a COMPONENT, matches no price stem, and stays a detail — promoting it would have offered a $150 "price" to quote.

OOP-C4 | 70_kb.js | THE DIAGNOSTICS REPORT THE NAME COLUMN. Against this sheet the panel said `missing: []` and read CLEAN while every lookup returned nothing, because the one assumption that was wrong was the one it never showed. It now reports the name column AND whether it was found by header or fallen back to. A diagnostic that cannot be wrong about itself is not a diagnostic.

OOP-C5 | 70_kb.js | An `Image` column is RECOGNISED so it can be DROPPED. Left unrecognised it rides along as a "detail", and the first Drive URL the operator pastes renders beside a price.

TEST RESULTS: PASSED. Pure + DOM + editor harnesses green, `lint-server` clean across 16 server files, `counts --check` green, split manifest regenerated twice.

FIVE PINS AGREED WITH THE BUG, and they share one shape:
  1. **The fixture had `Item` in column A** — exactly the layout that let the column-A assumption survive OOP-A and OOP-B. A fixture built from the same belief as the code cannot falsify it; it is a second copy of the assumption wearing a test's clothes. It now mirrors the operator's real header row.
  2. The `Image` drop was unobservable: the fixture's Image cell was BLANK, and an empty cell is filtered by the blank guard either way.
  3. The code half of the search was covered ONLY by an editor test this container cannot run, so deleting the code lookup left the pure harness green.
  4. The diagnostics' name-column report had no pure pin at all — and that report IS the fix for C4.
  5. **The mirror table drove three arguments when the label is the fourth** — g120's failure mode with a new field. A client/server disagreement about the label refuses EVERY multi-price OOP send.

Bite-checks — 11 mutations, 11 bites, after the five repairs above:
  BITES — the name reverts to column A
  BITES — only the FIRST price is kept
  BITES — a vanished label falls back to the first price
  BITES — the search ignores the code column
  BITES — HCPCS is not recognised as a code
  BITES — the Image column rides along as a detail
  BITES — the diagnostics stop reporting the name column
  BITES — the quote line drops its label (SERVER side)
  BITES — the quote line drops its label (CLIENT side)
  BITES — the pricing tab falls back to the FIRST sheet (re-checked)
  BITES — an addressless warehouse is registered anyway (re-checked)

REGRESSION SCENARIOS (Test Command is `manual`):
  S110 | AMENDED by this batch and NOT RUN here (needs the deployed instance + the real sheet). It now walks a product-name search AND a code search, the per-column Insert buttons on a multi-price item, and the diagnostics' name-column report. **This is the batch most worth walking on the real sheet**, because the defect it fixes was invisible to every automated layer until the operator's actual headers arrived.
  S19 / S52 | NOT AFFECTED and NOT AFFECTED. The composer's dept tab and the Internal/External transition are untouched; the price picker's own DOM pin covers the re-render.
  S62 / S64 | NOT RUN. Both Reference surfaces render `prices[]` now instead of one figure.

REGRESSION RISKS:
  1. `oopRowObj_`'s shape CHANGED (`prices[]`, `code`, name-by-header). Every consumer in-tree was updated and pinned, but anything reading `.price` still works — it is the first entry.
  2. `searchOopPricing` now reads the whole grid once instead of a name column plus N row fetches. Same bound (`OOP_MAX_ROWS`), fewer round trips, but it is a different read pattern against a sheet this container cannot exercise.
  3. `oopQuoteLine_` gained a 4th parameter. Both sides of the mirror are pinned over a table that now includes labels.

INVARIANTS AT RISK: None violated. INV-208 EXTENDED with the label clause and `oopPriceByLabel_`'s two-directional refusal. INV-209 untouched. g121 (the positional tab read) and g120 (the blocking mirror) both gained a second instance — the mirror's new field is exactly what g120 warns about.

NET SCORE: 1 production fix − 0 new failure modes = **+1**.
  The fix counts: the feature was shipped, merged, and would have been deployed today with every product-name search failing and a billing code in customer emails. It had not reached production only because the deploy had not happened — a day's margin, and the operator's paste is what closed it.

OPERATOR ACTIONS / DEPLOY:
- No new operator state. This makes the reader match the sheet you already built. | BLOCKS DEPLOY: N
- The post-deploy walk in STATE.md is unchanged; step 5 (the OOP diagnostics) now also shows which column it treats as the item name. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version.

FOLLOW-ON ITEMS:
- **`Category` = `POV/Scooter` is not joined to anything.** It is the same vocabulary `LocationAcceptance`'s `Accepts` column uses, so an item's category could pick out the delivery cities that accept it. Not built — it would change what a verdict means, and city rows are information-only by decision.
- ~~**Two price columns can hold the same figure**~~ **RESOLVED 2026-09-17.** `OOP Price` and `Pick-Up Cost` were both $920, so the picker showed two Inserts for one number under different labels. The operator confirmed they are meant to be equal — `Pick-Up Cost` existed to show that collecting from the warehouse costs no extra — and dropped the column. The reason it had to go rather than stay is not tidiness: **two columns that must always be equal is an invariant the spreadsheet cannot enforce**, and the day they diverge the picker offers a rep two different correct prices for one item, either of which becomes a commitment under INV-208. The meaning it carried moves into the header wording, which is what the customer reads.
- Unchanged from the prior block: the shared geocode quota, and no Admin editor for the two tabs.

DOCUMENTATION UPDATES NEEDED: None outstanding — applied in this batch. CLAUDE.md's store table, `docs/operator-state.md`'s tab schema, INV-208, S110, `docs/operator-log.md` and `docs/test-harness-log.md` all described the OLD shape and now describe this one.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
