---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T7b — a radius over ANY warehouse (the operator's common case, previously inexpressible), a word-bounded warehouse-name match, and an unplaceable warehouse no longer answering NO · T8 — an Admin home for the OOP pricing diagnostics, which had no caller anywhere in the client
Files modified: web-app/70_kb.js, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, CLAUDE.md, docs/operator-state.md, .cycle/STATE.md
Estimate: T7b S (~2 h) · T8 S (~2 h)
Actual: ~3 h combined

CHANGES:
T7b (the capability) | `70_kb.js` | **The operator's common case could not be written.** Most items reach 100 miles from ANY warehouse; the ones naming Dallas or San Antonio are the technician-built exceptions. The grammar could only name PLACES, so `100 miles of any warehouse`, `any of our warehouses`, `all warehouses` and `a warehouse` all parsed as `unknown` — correctly refusing rather than guessing, but leaving the rule unsayable. An any-warehouse rule now carries no warehouse list and resolves against the registry AT CHECK TIME, so opening a warehouse extends every item written that way with no edit to the pricing sheet — the same delegation `cities` uses.
T7b (a real defect underneath) | `70_kb.js` | **The warehouse-name match was a bare substring**, live since the radius rule shipped: a site called `Ware` matched inside the word "warehouse" and one called `Mi` inside "miles", and every spurious hit BROADENS the rule to measure from a site it never named. Now word-bounded. More permissive is the wrong way to be wrong where a yes is a commitment (g41).
T7b (honest failure) | `70_kb.js` | An over-limit distance with any warehouse UNPLACEABLE used to answer **NO** with "One warehouse could not be placed." appended — a decision with a footnote. It is not a decision: the unplaced one might be nearer, so it is UNKNOWN, and it names the table to fix. A two-name rule made this rare; a rule spanning the whole registry makes it common (INV-187).
T8 | `script_callnotes.html` | `getOopPricingDiagnostics` has existed since 2026-09-16 with **no caller anywhere in the client** — admin-gated, editor-only, and it RETURNS its report rather than logging one, so a bare call leaves the execution log empty and looks like it did nothing. On 2026-09-22 it held every fact needed to explain the quiet lookups and reached nobody. It now loads with the Admin System tab, beside Storage Health: the tab read, every header's role, the roles no column matched, the warehouse registry with the addresses that get geocoded, the addressless rows, and how every Area Eligibility value parses with the unreadable ones named beside their cell. FACTS, not verdicts — judgement stays in the findings list, the split the storage inventory already uses.
INV-239 | `.cycle/config.md`, S64 | The network-radius rule, the word-bounded name match and the unplaceable-warehouse verdict. S64 gains three steps (two T7b, one T8).

TEST RESULTS: passed. Pure 930 → **931**, DOM 144 → **145**, lint clean, manifest revised twice (`--why`), counts block agrees (invariants 231 → 232).
**SIX pure bite-checks on T7b:** any-warehouse never detected · a named rule broadened to any-warehouse · resolving against the RULE not the registry · an unplaceable warehouse back to NO · an empty registry reading as not-eligible · the name match back to a bare substring. **FIVE DOM bite-checks on T8:** the panel never mounted · a failed read leaving an empty panel · the fallback-column caveat dropped · an addressless warehouse not called out · the unreadable values not named.
**TWO NO BITEs, both real, both mine, both fixed:**
1. *"the name match runs FIRST, silently narrowing a broad rule"* stayed green — because the returns key off `anyWh`, so ORDER was never what kept the two forms apart. The comment claimed a guarantee the code did not make (g138). Rewritten to say what is true; chasing it found the substring defect above, which is the real guard.
2. *"a failed read leaves an empty panel"* stayed green — because the pin injected the error markup itself rather than driving the loader. That proves the renderer can draw an error, which is not what the name promises. Rewritten to fail the RPC and drive the real path; it bites now.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** — UPDATED with three steps. Needs the operator's walk.
- **S112** — NOT re-walked: no price path changed.
- **S73** — NOT APPLICABLE: no track or box changed.

REGRESSION RISKS:
- **The word-bounded name match is a behaviour change on existing data.** A registry name that only ever matched as a substring stops matching. That is the fix, but an operator whose sheet says `100 miles of Dallas-Fort Worth` while the registry says `Dallas` now gets `unknown` (naming the registry) where it previously matched. Honest, and visible.
- **An over-limit answer with an unplaceable warehouse now reads "cannot tell" rather than "not eligible."** More items will read unknown until every warehouse has an address — which is the point, and the panel names them.
- The T8 panel adds one RPC to the Admin System tab enter. It is independent; a failure stays in its own slot.
- `oopEligibilityCheck_` now reads `where.warehouseNames` for an any-warehouse rule. A caller that does not ship it gets the "no warehouses in the table" unknown, never a yes.

INVARIANTS AT RISK: None violated. **INV-239 written.** INV-187 is what the unplaceable-warehouse verdict restores; g41 is the direction the word boundary protects; g142 is the gotcha T8 closes; g138 fired twice and is cited where it bit.

NET SCORE: 2 − 0 = 2
(Production fixes: **2** — the substring name match, which silently broadened a narrow rule (Medium), and the unplaceable-warehouse NO, which stated a verdict from incomplete data on a commitment surface (Medium). New capabilities: 2 — the network radius, and the diagnostics panel. Defensive/structural: 0. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- **Write the common case as `100 miles of any warehouse`** (or `…, or listed cities` for scooters). The named form is now reserved for the technician-built exceptions. | BLOCKS DEPLOY: N
- Still owed from T7: the `Type` column is DONE; `OopPricing` col I still needs restoring on the affected items.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T7, T7b and T8 ship together.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **An intermittent DOM pin**, untouched by either batch: `the resume request states the unpaid gap before it is filed` (runDom.js, "it confirms rather than firing on one click") failed once during T7 and has passed every run since. Still flagged.
- The `Accepts` column on a city row remains DISPLAY-ONLY; scoping is by which items carry the rule in col I.
- `intakeCopyImage_` still opens a tab on failure without checking the return (g135).

DOCUMENTATION UPDATES NEEDED:
- None outstanding. `docs/operator-state.md` carries the full grammar (both radius forms, the whole-word rule) and the Admin path replacing the "it has no button" warning T7 had to write; `.cycle/config.md` carries INV-239 and the three walk steps.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
