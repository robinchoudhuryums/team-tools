---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- KB-1 — the STATES rule read the prose connective "or" as Oregon and "in" as Indiana ("TX or OK" → TX, OR, OK)
- KB2-1 — a state QUALIFYING the city list ("listed cities, TX" / "(TX)") parsed as an either-one union, and the state branch lifted out of pocket to "available anywhere in the US"
- KB2-2 — an Open parenthetical was judged by a deny-list, so "(lower 48)", "(continental US)", "(HI and AK extra charge)", "(call to confirm)" read as a plain YES
- KB2-3 — the geocoder never read the country; a Canadian/Mexican address got "available anywhere in the US", and a radius said yes across the border
- KB2-4 — overlapping warehouse names ("Dallas North" + "Dallas") widened a radius, order-dependently
- KB2-5 — a LocationAcceptance city row with a blank State matched that city name in every state
- KB2-7 — the send-time quote check was a bare substring, so "Scooter — $100" verified inside "Scooter — $1000"
- KB2-10 — three Lows: a revert stamped ReviewedAt = now; a duplicate warehouse row was dropped in silence; Save while a pasted screenshot was uploading stored the placeholder for good

Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md (generated running-totals row only), .cycle/STATE.md
Estimate: M (~11 h) — Batch 2 as planned (8 findings)
Actual: ~3.5 h

CHANGES:
KB-1 | web-app/70_kb.js | oopEligibilityParse_'s STATES branch skips lowercase "or"/"and" as connectives, and refuses (unknown) a lowercase token that is also an everyday English word (in, me, hi, ok, oh, de, la, pa, co, al, id, ma, ne, mo, wa). A lowercase non-word code ("tx") is still a code; UPPERCASE "OR" is still Oregon.
KB2-1 | web-app/70_kb.js | wrap(): a `states` remainder beside the city clause is T7's union only when a lowercase "or" is written and there are no parentheses; otherwise the whole value is unknown (and unknown never lifts).
KB2-2 | web-app/70_kb.js | the Open branch keeps its deny-list and adds an ALLOW-list: every parenthetical word must be an elaboration of "anywhere in the US", and Hawaii/Alaska/Puerto Rico count only beside an including-word.
KB2-3 | web-app/70_kb.js | kbGeocodeOne_ returns `country` (additive; the map block still reads lat/lng); checkOopEligibility refuses a non-US geocode before any rule (`kbGeoOutsideUs_`, `kbGeoOutsideUsMsg_`, `KB_GEO_US_COUNTRIES = ['US','PR']` — named explicitly because Canada's ISO "CA" is California in US_STATE_CODES, which the first draft did and the new pin caught). The message names no part of the address (g146).
KB2-4 | web-app/70_kb.js | oopRegistryNamesIn_ matches LONGEST names first and consumes each matched span (hits keep registry order); oopRadiusClause_ strips names longest-first so "Dallas or Dallas North" leaves no stray "North".
KB2-5 | web-app/70_kb.js | getLocationAcceptance_ flags a blank-State city row (stateBad, plus an unreadable entry "it has no State …"); locCityMatches_ never matches a row with no State; locCityUnreadable_ reports it, so the verdict there is "cannot tell" (K4's path).
KB2-7 | web-app/70_kb.js | new pure oopBodyHasLine_: a quote line verifies only whole (not followed by a digit or "."/"," + digit, not preceded by a letter/digit); oopVerifyQuotes_ uses it. A tenfold figure now falls to the existing "was edited" refusal.
KB2-10 | web-app/70_kb.js, web-app/kb/script_kb.html | kbRevertItem keeps the row's ReviewedAt/ReviewedBy (Updated is still now); getLocationAcceptance_ names a second warehouse row with the same name and a different address; kbSaveFromEditor_ refuses while the body carries `(kbpaste:pending)`.

TEST RESULTS: passed — pure 1114/1114 (was 1106; +8 new pins, and three pre-existing pins' doubles updated: the ELIG matcher pin's "a row with no state matches any state" assertion is REVERSED with its reason, the K4 loader regex now pins `stateBad: !stCode` + the blank-State finding, and the OOP-B/K7 verifier context loads oopBodyHasLine_), DOM 184/184, counts --check agrees, lint:server clean, node --check clean. 17 bite-checks, all BITE (KB-1 ×2, KB2-1 ×2, KB2-2 ×2, KB2-3 ×2, KB2-4 ×2, KB2-5 ×2, KB2-7 ×2, KB2-10 ×3). One NO BITE acted on: the matcher's `!r.state` guard was unobserved — with a geocoded state present, `st && r.state !== st` already rejects a blank row — so the ELIG pin gained the geocode-with-no-state case; re-bitten, BITES. The KB2-3 pin also caught a defect in the fix itself (CA = Canada vs California) before commit.
Test Command is `manual`. Overlapping Regression Scenarios — S112 (OOP pricing + area eligibility both ways), S64 (KB drawer), S65 (paste-a-screenshot) — were NOT walked: each needs the deployed app. Their changed behaviour is driven by the pins above; the walks are operator steps (below).
REGRESSION RISKS:
- KB-1, KB2-1, KB2-2 narrow the grammar: a cell that used to parse may now read "cannot tell" — a lowercase everyday-word code ("tx, ok"), a state written beside "listed cities" without "or", or an Open note with any word outside the elaboration list. That is the chosen fail direction (g41); the cells surface in Admin → System → Reference lookups as "Cannot read".
- KB2-5: a city row the operator deliberately left without a State (meaning "any state") now reads "cannot tell" for that city instead of yes. The ELIG pin's old assertion encoded that meaning when city rows only DISPLAYED; since T7 they decide.
- KB2-3: a geocode whose country component is missing is still treated as US (no evidence either way).
INVARIANTS AT RISK: None found broken. Checked: INV-209 (the Area Eligibility column is read by the engine — still the only source of the rule), INV-208 (a quoted price is re-verified at send — now stricter, still fails closed), the g41 fail direction (every change moves toward unknown, never toward yes), unknown-never-lifts (oopEligibilityForPayment_ untouched; every new unknown is pinned as not lifting), T7's "TX or listed cities" union + lift (pinned unchanged), K3/K4/K5 (pins green), g146 (the outside-US message names no address), INV-136 (kbRevertItem still admin-gated before any write).
NET SCORE: 0 − 2 = −2. No fix is known to have fired this month — each needs an operator cell, address or edit not known to exist; they are latent fail-open paths closed (defensive). The two new failure modes are deliberate fail-safe trade-offs, counted the way this project has counted them since cycle 8: legitimate cells that now read "cannot tell" (KB-1's lowercase everyday-word codes; KB2-5's deliberately State-less city rows).

OPERATOR ACTIONS / DEPLOY:
- After the push: Manage → Admin → System → Reference lookups — read "Cannot read" (any Area Eligibility cell now unreadable: a lowercase word-code, a state beside "listed cities" without "or", a restrictive Open note) and "Rows that could not be read in full" (city rows with no State; a duplicate warehouse name); fix those cells in the sheet | BLOCKS DEPLOY: N
- Walk S112's eligibility steps with a cell `TX or OK`, `listed cities, TX`, `Open (lower 48)`, and an address in Canada | BLOCKS DEPLOY: N
- Walk S65 once: paste a screenshot and press Save before the upload toast — it is refused with "still uploading" | BLOCKS DEPLOY: N
Deploy: Server + Client (Reference views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- KB2-6 (deferred, operator decision): "listed cities and 100 miles of Dallas" — does "and" mean BOTH? Today it is still a union.
- The map block's own "Find nearest" path (kbMapDistances) does not check the country; it measures distance only and makes no eligibility claim, so it was left out of KB2-3's scope.
- KB2-5's operator decision is worth confirming: if a State-less city row is meant to mean "any state", the alternative is an explicit `*` / "any" in the State cell rather than a blank.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index: g41 (or g156) — KB-1's connectives, KB2-1's qualifying state, KB2-2's allow-list, KB2-4's longest-first names; g126/OOP-B — KB2-7's whole-line quote match; g128 — "outside the US" is a fourth answer beside not-found / unavailable / partial (KB2-3).
- docs/operator-state.md (`OopPricing` / `LocationAcceptance`): a city row needs a State (blank = "cannot tell"); a state beside "listed cities" needs an explicit "or"; an Open note is read word by word; duplicate warehouse names are reported.
- docs/design-decisions.md (ELIG / T7 entries): AMENDED notes for KB2-1 and KB2-5.
- docs/modules.md (Reference): revert no longer counts as a review; Save waits for a pasted image.
- .cycle/config.md: S112 gains the cycle-23 steps above; S65 gains the save-while-uploading step.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
