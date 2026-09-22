---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T7 — the exact-city eligibility rule the operator could not express, rules that COMBINE, and the three stacked silences that made them rewrite correct sheet data
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, CLAUDE.md, docs/gotchas.md, docs/operator-state.md, docs/design-decisions.md, .cycle/STATE.md
Estimate: T7 L (~7 h)
Actual: ~5 h

CHANGES:
T7 (the capability) | `70_kb.js` | The operator's scooter rule — eligible in a list of named service cities — **could not be written in `Area Eligibility` at all.** The grammar had four kinds (open / states / radius / unknown) and no way to name a city list, so K0800–K0803 read "confirm manually" for a rule they had specified precisely. `cities` DELEGATES to the `LocationAcceptance` city rows rather than enumerating them per item: the column states the RULE, the registry supplies its PARAMETER, which is the shape the radius rule already had. That is why it does not reopen the 2026-09-16 decision keeping city rows out of verdicts — what that ruled out was city rows as an INDEPENDENT overlay that could contradict the column, and a value explicitly handing the question to the list is the opposite of a second opinion.
T7 (rules that combine) | `70_kb.js` | The operator's answer was that EITHER the distance or the city qualifies, so the grammar gained a union (`any`) rather than a fifth flat kind. The city clause is detected, STRIPPED, and the remainder parsed on its own, then the two are joined; `open` absorbs a city clause. **The load-bearing half is the failure direction:** an unreadable clause beside a readable one yields `unknown` for the WHOLE cell. Returning the city rule from `gibberish, or listed cities` would make an item restricted by a rule we could not parse eligible in every listed city — g41 wearing the union's hat, and F-23's lesson in the other direction.
T7 (the fold) | `70_kb.js` | Any branch YES is YES. An UNMEASURABLE branch beside a plain NO is **UNKNOWN, never NO** — the one fold that would quietly turn "we could not tell" into "not eligible" and send a rep to the wrong next action (INV-187). Every branch speaks in the `why`, so a rep told "could not measure the distance" also learns the city list was checked. A solid YES outranks a near-boundary one, because warning about a boundary another rule already cleared trains reps to ignore the real ones. A city limit does NOT lift out of pocket — the 2026-09-16 generalisation (WHO IS PAYING vs HOW IT GETS THERE) settled the fourth value without a new table row, which is the test it was written to survive.
T7 (silence 1) | `70_kb.js` | **A `LocationAcceptance` tab that yielded nothing reported no error.** Theirs had headers in row 2 and no `Name` column, so every row read as blank, the registry came back empty with `error` unset, every radius rule fell to `unknown`, and the rep-facing message blamed the pricing sheet's eligibility column. They then rewrote good cells in that column to match what the app appeared to be asking for, losing the distances and warehouse names. A tab that reads zero usable rows now states which of three reasons applies.
T7 (silence 2) | `70_kb.js` | A distance naming a warehouse the registry does not hold is no longer conflated with a value we cannot parse. `noWarehouse` carries the cause to the verdict, which names the warehouses the table DOES hold and says **fix `LocationAcceptance`, not the pricing sheet.**
T7 (silence 3) | `70_kb.js`, `script_kb.html` | Per-row drops (a warehouse with no address, an unclassifiable row) reached ONLY `getOopPricingDiagnostics` — an admin endpoint with **no caller anywhere in the client**, so in practice they reached nobody. They now render on the rep's own panel, and are ABSENT when the table is clean (a permanent banner is g02 again, so the pin drives both directions).
T7 (the counter) | `70_kb.js` | `getOopPricingDiagnostics` enumerated open/states/radius and derived the unknown total by SUBTRACTION, so a new kind made one counter `NaN` and mis-stated the other. It counts what it sees, and the pin DERIVES the kind list from the parser so the next kind cannot be forgotten here (g137).
T7 (the note) | `script_kb.html` | The delivery-cities line said "Reference only — the verdicts below come from the item's Area Eligibility", which stopped being true. It now scopes itself: "Applies only to items whose Area Eligibility names the city list". The 2026-09-16 guarantee underneath is intact and still pinned — the list is never an independent overlay.
INV-236/237/238 | `.cycle/config.md`, S64, g142 | The union's parse rule, the union's fold rule, and the honest-diagnostic rule. S64 gains SIX T7 walk steps, including renaming the `Name` header to see the new finding fire.

TEST RESULTS: passed. Pure 927 → **930**, DOM 143 → **144**, lint clean, manifest revised (`--why`), counts block agrees (invariants 228 → 231).
**ELEVEN pure bite-checks, all BITE:** the city clause never detected · the unreadable neighbour dropped so the city rule alone wins · the `noWarehouse` flag removed · the union folding UNKNOWN into NO · near-boundary caution lost · the message blaming the pricing sheet again · a city limit LIFTING out of pocket · the empty registry going silent again · the unknown total derived by subtraction again · `needRadius` blind to a nested radius.
**TWO DOM bite-checks, both BITE:** the dropped registry rows going unrendered · the cities note going back to "Reference only".
**Non-vacuity driven, not asserted:** T7-1's is a value with NO city clause parsing exactly as before, and the T7 DOM pin drives a CLEAN table and asserts no warning line at all — both are true only if the feature works, per g116's seventh direction.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** — UPDATED with six T7 steps. Needs the operator's walk on the deployed instance.
- **S112** (OOP price lookup) — NOT re-walked: no price path changed. The eligibility verdict is a different field.
- **S73** (phone-width grids) — NOT APPLICABLE: no track or box changed.

REGRESSION RISKS:
- **One outdated assertion was updated, not weakened** (Category A): the ELIG DOM pin asserted the literal string "Reference only", which the batch deliberately changed. It now asserts the note scopes itself, which is what the assertion was guarding.
- A `LocationAcceptance` tab that was previously silent may now show a finding on the rep panel. That is the point, but an operator with a half-filled table will see it on the first load after deploy.
- `oopEligibilityCheck_` is now recursive (one level, over `rules`). A malformed `any` with no `rules` returns unknown rather than throwing.
- The new `cities` and `any` kinds ship in the `rule` field, which no client code reads today.

INVARIANTS AT RISK: None violated. **INV-236, INV-237, INV-238 written.** INV-209's decision entry is AMENDED in `docs/design-decisions.md` with the reasoning, and INV-187's unknown/no distinction is what the union fold preserves. g41's fail-closed posture is extended to the union. g02 is cited on both sides — the silence that was the defect, and the permanent banner that would have been the wrong fix. **g142 written.**

NET SCORE: 3 − 0 = 3
(Production fixes: **3** — one HIGH (a diagnostic that named the wrong file, which the operator acted on and lost real eligibility data to), one MEDIUM (a degraded read reporting nothing at all), one LOW (the diagnostics counter that would break on a new kind). New capabilities: 1 — the city rule and rules that combine. Defensive/structural: 1 — the derived kind-list check. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- **Add a `Type` column to `LocationAcceptance`** (`warehouse` / `city`). City rows are currently dropped: with no `Type`, a row with no address cannot be classified. | BLOCKS DEPLOY: N (but the city rule does nothing until it is done)
- **Restore `OopPricing` col I** on the affected items to `100 miles of Dallas warehouse, 100 miles of San Antonio warehouse` — `Local` parses as unknown. | BLOCKS DEPLOY: N
- **Optionally rename col D `Rule` → `Accepts`** so the per-city item list is read; as `Rule` it is ignored entirely. | BLOCKS DEPLOY: N
- To use the city rule, set the scooter rows' col I to `100 miles of Dallas warehouse, or listed cities`.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **T8: `getOopPricingDiagnostics` has no UI.** It is admin-gated and reachable only from the Apps Script editor, where it RETURNS its report rather than logging one — so a bare call leaves the execution log empty and looks like it did nothing. It had every fact needed to diagnose 2026-09-22 and reached nobody. An Admin panel is the fix; the operator-state entry now carries the `Logger.log` wrapper and an explicit warning that no button exists.
- **An intermittent DOM pin.** `the resume request states the unpaid gap before it is filed` (runDom.js:1702, "it confirms rather than firing on one click") failed once and then passed 3/3 on re-run. Untouched by this batch. Flagged rather than dismissed — this project's own rule is that a flake is not a root cause.
- The `Accepts` column is still DISPLAY-ONLY; it does not filter which items a city rule covers. Scoping is done by which items carry the rule in col I, which is the single-source model. If a city ever needs a different item set, the filter is real work and would need whole HCPCS codes (`K0800-K0803` is a range `hcpcsParse_` refuses, correctly).
- `intakeCopyImage_` still opens a tab on failure without checking the return (g135). Unchanged from T5.

DOCUMENTATION UPDATES NEEDED:
- None outstanding. `docs/operator-state.md` (the row-1 header rule, the `Type` requirement for city rows, the new grammar, and the removal of a claim that an Admin diagnostics panel exists — it does not), `docs/design-decisions.md` (the INV-209 amendment), `docs/gotchas.md` + the CLAUDE.md index (g142), `.cycle/config.md` (INV-236/237/238 + S64) are all part of this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
