---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator-requested capability round; the B follow-up below is wording)
New capabilities (G/ST):
- C1 — the eligibility map: Show map (a static picture drawn by Apps Script's built-in Maps service — the address, the nearest warehouse and any within 300 mi, the 100-mile ring round the nearest; nothing drawn until pressed) and a Driving route link from the nearest warehouse to the address Google read
- B follow-up (operator 2026-10-27, "more concise, like '…from Dallas (>100 mi)'") — a distance verdict reads "1,380.6 mi from Dallas (>100 mi)" / "12 mi from Dallas (within 100 mi)"; only a near-the-limit yes still says the drive is longer than the straight line
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: M (~2.5 h) — written to STATE before the first edit (the wording follow-up was done first, unestimated, ~0.4 h)
Actual: ~2 h

CHANGES:
C1 | web-app/70_kb.js | OOP_MAP_RING_MILES (100) / OOP_MAP_NEARBY_MILES (300) / OOP_MAP_RING_POINTS (36); pure oopRingPoints_ (a closed great-circle ring) and oopMapPlan_ (nearest always, others within 300 mi, the rest counted as `omitted`, unplaced ignored, nothing placed → null); rep-callable oopEligibilityMap(address): employee gate, the address checks and geocode refusals checkOopEligibility uses (unavailable / partial / not found / outside the US), cached warehouse geocodes, Maps.newStaticMap with the ring path, W markers then the A marker, returned as a PNG data URL with ringMiles / nearest / shown / omitted; a draw failure returns a fixed message (the service's own carries the request URL and coordinates — g146); never cached. checkOopEligibility's warehouses carry their `address`
C1 | web-app/kb/script_kb.html | oopEligHeaderHtml_: a .kb-oop-mapbar under the nearest line — the Show map button (aria-expanded, the address in a data attribute used only as the RPC argument, g49) and the Driving route link (origin = the nearest warehouse's address, destination = the address Google read, _blank + noopener); oopToggleMap_ (one read per address in KB_OOP_MAPS, success only — g129; the answer dropped if the button was repainted away or closed — g147) and oopMapHtml_ (only a data:image/png;base64 source is used; alt text and a key); CSS for every new class
B follow-up | web-app/70_kb.js | oopMilesFmt_ (at most one decimal, thousands separator); the radius whys: "(within N mi)", "(>N mi)", the unplaced-warehouse variant shortened the same way
Tests | test/client/run.js | C1 pin: the ring (closed, every point ~100 mi by haversine), the plan (nearest whatever the order, 300-mi neighbour drawn, Honolulu counted, nothing placed → null), the endpoint DRIVEN with a stubbed Maps (37 path points, warehouse then address markers, the far warehouse not drawn, the data URL), a failed draw that does not echo the coordinates, the gates, the address on the payload. ELIG / T7-2 / B2B3 pins moved to the concise wording (+ a thousands-separator case); the eligibility sandbox loads oopMilesFmt_
Tests | test/client/dom/runDom.js | C1 DOM drive: route origin/destination/target, nothing read until pressed, a failure stated and re-asked, one read per address after success, the picture + key, Hide, a non-PNG source refused, the button's wiring
Fixture | test/visual/mock.js, shoot.mjs | oopEligibilityMap fixture (a placeholder PNG), Dallas carries its address; scenarios reference-elig-map-light-wide / -dark-mobile; the Honolulu fixture verdict in the new wording

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1416/1416, DOM 294/294, lint:server clean, split manifest regenerated, counts --check clean, visual CI gate PASS (24); the two map scenarios and reference-elig-cards-light-wide 0 overflow, no narrow text, no errors, read by eye. Regression scenarios for Reference / OOP: the K1/K3/KB2 grammar grids, K5's partial-geocode refusal and T7b's unplaced-warehouse UNKNOWN PASS — the radius verdicts changed WORDING only (verdict, near and parts unchanged).
REGRESSION RISKS: the static map is a second geocode of the address per press (never cached) and counts toward the Maps service's daily quota; one press per lookup at most. The real map's look is not on camera (the fixture is a placeholder) — the first live press is the check.
INVARIANTS AT RISK: g146 (an error never echoes typed input) — the map's errors are fixed text, pinned against the coordinates. g129 / g147 — a failure is not cached, a repainted panel drops a late answer.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one capability, one wording change)

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (client + server) | BLOCKS DEPLOY: N
- If Apps Script asks the deployer to re-authorize after the deploy, accept (the map uses the Maps service the address lookup already uses) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- "except Hawaii" in an Area Eligibility cell is read as UNKNOWN (K3: a restriction the grammar cannot evaluate), not as "insurance excludes HI, out of pocket allowed" — the operator's actual scooter rule. Teaching the grammar a state exclusion that lifts out of pocket (the ELIG lifting rule) is a separate, unbuilt change; put to the operator.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
