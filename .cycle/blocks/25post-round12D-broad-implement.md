---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (operator requests, not scan findings)
New capabilities (G/ST): 25post round 12 D (operator 2026-10-27) —
  D1 the insurance lookup matches states by code or full name, either way round, whole words only
  D2 payor aliases ride the Synonyms list (KB_SEARCH_SYNONYMS); an admin "Suggest payor aliases" offers groups from the InsurancePayors names
  D3 a plan whose name excludes the searched state ranks last with a "TX excluded" note
  D4 handbook and article image chips say Loading image… (a sized shimmer), not imported yet / not stored, or Couldn't load this image with Retry
  D5 "except <states>" in an Area Eligibility cell is an insurance-only exclusion, lifted out of pocket
Files modified: web-app/70_kb.js, web-app/00_config.js, web-app/Tests.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, .cycle/config.md, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, docs/operator-state.md, .cycle/STATE.md
Estimate: M-L (~4.5 h) — written before the first edit
Actual: ~3.5 h (D5 0.6 · D1–D3 1 · D2 seeding 0.4 · D4 0.8 · tests, bite-checks, two visual scenarios, docs 0.7)

CHANGES:
D1 | 70_kb.js | insStatesIn_ (a code counts in a payor name only in capitals; in a query in any case except "in"/"or"/"me"), insPayorMatch_ scores states apart from the rest of the query: the searched state +40, another state's plan −20, a state alone lists plans naming it; no state and no alias = the old insPayorScore_ exactly
D2 | 00_config.js, 70_kb.js, script_kb.html, Tests.js, config.md | INS_PAYOR_ALIAS_FAMILIES (no term is a state code), insPayorAliasSuggest_ (families a name carries + "Long Name (ABC)" acronyms; skips groups already in the list), kbSuggestPayorSynonyms (admin, read-only — INV-136 + the gate test); the editor appends the offered lines for review, Save stays the only write
D3 | 70_kb.js, script_kb.html | insPayorNameStates_ reads "other than / except / excluding / outside / not in / non-" tails; searchInsurancePayors sorts excluded plans last and ships excludedState; the card shows ".kb-ins-excl" "TX excluded" and mutes the name
D4 | script_kb.html | kbImgChipState_ (shared by kbManimgApply_/kbKbimgApply_/both hydrators): status line + the alt (kept in data-alt) + an admin pointer to Reference → Handbook → Import for a missing handbook image + a Retry button on a failure (kbImgRetry_ re-schedules; failures were never cached); CSS sized shimmer per kind (figure 480×160, thumb 140×96, icon a 22px square); the slideshow viewer names the state of a slide that has no image; the two DRV-3 rules it superseded removed
D5 | 70_kb.js | oopExceptStatesClause_ + kind 'except' {states, rule}: the check answers the rule underneath first (its NO stays the reason), then NO through insurance in an excluded state, unknown when the state is unknown; oopEligibilityForPayment_ lifts it out of pocket (open carries liftedExcept → "excludes HI for insurance orders only"); oopRuleLabel_, ruleNeedsRadius and the diagnostics counter know the kind; every word after the keyword must be a state, and an unreadable rest stays unknown

TEST RESULTS: pure 1418/1418, DOM 296/296, counts --check clean, lint:server clean, visual CI gate (24 scenarios) PASS; two new scenarios reference-img-states-light-wide / -dark-mobile shot and read (0 overflow, no errors). K3's pin changed by the operator's decision: "Open (except Hawaii and Alaska)" and "100 miles of Dallas except Oklahoma" are now exclusions, not unknown — its regression examples became "except Hawaii, call first" / "except weekends".
Bite-checks (all scoped with --fn):
  D1 state alone lists nothing — BITES; named-state bonus gone — BITES; aliases ignored — BITES; codes any case in names — BITES
  D1 "rest replaced by the whole query" — NO BITE: equivalent for the pinned names (the alias variant still matches); recorded, sharper mutations above bite
  D3 excluded dropped — BITES; sort — BITES; D3 DOM no chip — BITES
  D2 existing group re-offered — BITES; D2 DOM duplicates appended — BITES
  D5 lowercase code read as a state — BITES (the first form of this mutation was equivalent: the code list is upper case, recorded); clause rescues an unreadable rest — BITES; not lifted out of pocket — BITES; excluded state ignored — BITES; underneath NO not first — BITES (after the pin was sharpened to assert the distance is the reason)
  D4 no Retry — BITES; rep shown the admin pointer — BITES; Retry does not re-ask — BITES; alt taken from the status words — BITES
REGRESSION RISKS: payor ranking changes for queries that carry a state word (intended); a lowercase "pa"/"ok"/"hi" in a query now reads as a state — only ranking moves, nothing is hidden. The image chip's textContent is now status + alt, so any reader of a chip's text must read data-alt (the three in the codebase do).
INVARIANTS AT RISK: INV-136 (admin set — list updated, F7/F9 green); INV-209 (the eligibility engine — one new kind, unknown never lifts still holds); g41 (fail direction chosen: a clause with any non-state word stays unknown); g129 (a failed image is still never cached).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (five new capabilities)

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version | BLOCKS DEPLOY: N
- Reference → Synonyms → Suggest payor aliases → check the lines → Save | BLOCKS DEPLOY: N
- Add "(except Hawaii)" to the scooter rows' Area Eligibility AFTER the deploy (before it, the cell reads "cannot tell") | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (clasp push + Deploy → New version by hand)

FOLLOW-ON ITEMS:
- The Drive connector could not open the KB spreadsheet from this session, so the alias families are a general list plus what the sheet spells out; the in-app button reads the real names.
- reference-manual-diagram-light-mobile's pre-existing narrowText warning (span.kb-man-ix-t 37px) — not this round's.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, operator-state.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
