---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- B2 — a Queens / Brooklyn address (Google gives no locality) read "Could not determine the city", so every city-list item was Cannot tell for the whole borough (operator screenshot, ZIP 11104)
New capabilities (G/ST):
- B1 — the eligibility header: the nearest warehouse on its own line with every distance folded under a toggle; unusable delivery-table rows as ONE line for a rep, the rows by name for an admin
- B3 — the item card: verdict label and word on one line, the reason full-width below; a union's No / Cannot tell gives one short line per rule; the facts are a two-column list and the Area line steps aside under a verdict
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: M (~3 h) — written to STATE before the first edit
Actual: ~2.2 h

CHANGES:
B2 | web-app/70_kb.js | kbGeocodeOne_: with no locality / postal_town, the sublocality_level_1 (borough), else the neighborhood, becomes `city`, with `cityFrom` 'borough' / 'neighborhood' ('' for a city proper, which always wins); checkOopEligibility passes cityFrom to the check and ships it. oopEligibilityCheck_'s cities branch: a stand-in city not on the list is UNKNOWN ("Google gives no city…; its borough, Queens, is not a listed service city — confirm the city"), never NO — the list may name the city proper (g41: the fail direction is chosen)
B3 | web-app/70_kb.js | new pure oopRuleLabel_ (Distance / City list / States / Anywhere / Rule); the `any` branch's NO / UNKNOWN carries `parts` [{rule, verdict, why}] beside the unchanged joined `why`
B1 | web-app/70_kb.js | checkOopEligibility ships isAdmin
B1 | web-app/kb/script_kb.html | oopEligHeaderHtml_: the stand-in city named ("city read as Queens (Google gave no city — this is its borough)"); "Nearest warehouse: X · N mi (straight-line)" + details "All warehouse distances (n)"; locationWarnings → one .kb-oop-warn line (rep: "tell a manager"; admin: "fix them in LocationAcceptance" + details listing each row)
B3 | web-app/kb/script_kb.html | eligVerdictHtml_ → eligWhyHtml_ (one .kb-elig-part per rule when parts > 1 on a non-yes, else the sentence; all esc()); .kb-elig-v grid is label + word, reason spanning below; oopItemRowHtml_ draws a <dl class="kb-oop-facts"> via oopFactHtml_ (Area only without verdicts); the now-dead oopMetaChip_ removed; CSS for every new class (T6)
Tests | test/client/run.js | B2/B3 pin: kbGeocodeOne_ driven over Queens / neighborhood-only / city-proper / nothing; the stand-in verdict (unknown off the list, yes on it, a city proper still a firm no); a union's parts (labels, answers, why unchanged), a yes without parts; oopRuleLabel_ grid; the endpoint ships cityFrom + isAdmin. ELIG pin follows the escape into eligWhyHtml_; the eligibility sandbox loads oopRuleLabel_
Tests | test/client/dom/runDom.js | new B DOM drive (stand-in city named, nearest leads + folded list, one line per rule with the rule name the only bold, a hostile reason inert, facts keys, area text absent under a verdict); OOP-A / R / ELIG / T1 / T7 drives moved to the facts list, the nearest line and the count line; T7 gains the admin case and a non-vacuity check on its clean-table case
Fixture | test/visual/mock.js, shoot.mjs | eligibility fixture: four warehouses, one unusable row, a union item with parts; scenarios reference-elig-cards-light-wide / -dark-mobile (poll for the rows, scroll the last into view)

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1415/1415, DOM 293/293, lint:server clean, split manifest regenerated, counts --check clean, visual CI gate PASS (24); reference-results-light-wide, reference-drawer-light-compact, reference-results-dark-wide and the two new card scenarios 0 overflow, no narrow text, no errors, read by eye. Bite-checked (bite.sh --fn): the borough fallback, the stand-in Cannot tell and the union parts (pure); the nearest sort, the admin gate, the per-rule escape and the hidden Area line (DOM) all BITE. Regression scenarios for Reference / OOP: the K1/K3/KB2 eligibility grids, T7-2's union rules and the K5 partial-geocode refusal all PASS unchanged (the union's `why` is byte-identical).
REGRESSION RISKS: a rep no longer sees WHICH delivery-table rows are unusable (operator's ask); the count line still says a No may be wrong. A borough stand-in that IS on the list now says yes where it said Cannot tell — correct for a list that names the borough. The send-time quote verifier and every other `why` reader are untouched (`parts` is additive).
INVARIANTS AT RISK: INV-187 / INV-209 (Cannot tell is never folded into No) — preserved and extended (a stand-in off the list is Cannot tell). g146 — the stand-in message names Google's borough, not the typed address. g140 (a class is a claim) — every new class has its rule.
NET SCORE: 1 production fix − 0 new failure modes = 1

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (client + server) | BLOCKS DEPLOY: N
- In LocationAcceptance: rename "Washington D.C" to "Washington" (State DC), and move "(Dallas)" / "(NO SCOOTER)" out of the Address cells into a Notes column; put "except Hawaii" in the scooter rows' Area Eligibility if Honolulu must not deliver scooters | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- None

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
