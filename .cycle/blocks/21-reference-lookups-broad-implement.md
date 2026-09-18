---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: R-1 checkOopEligibility shipped `prices[0]` alone, so the delivery surface quoted the PICK-UP price · R-2 two render paths for one operator tab, merged to one · R-3 an eligibility failure blanked the panel and took the prices with it · R-4 the new band needs both g50 collapse triggers, and the field pair needs neither · R-5 the item field named itself with an aria-label whose placeholder vanished once filled
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: M (~4 h)
Actual: ~3.5 h

CHANGES:
R-1 | web-app/70_kb.js | `checkOopEligibility` ships the whole `oopRowObj_` shape (`prices`, `code`, `details`) instead of a hand-picked subset. `price` is `prices[0]` — the LEFTMOST price column — which on the operator's real sheet is the pick-up total, so the surface whose entire subject is delivery was quoting the collect-in-person number and silently dropping "W/ Shipping" and "W/ Tech Delivery". searchOopPricing already shipped and rendered them labelled: two readers of one operator tab, each picking its own subset (g126).
R-2 | web-app/kb/script_kb.html | `eligSecHtml_`/`eligInput_`/`eligRenderResults_` are gone. One panel takes an Item and an optional Address; one row renderer (`oopItemRowHtml_` → `oopPriceHtml_`) draws both payload shapes, so they cannot be styled apart again. The two TAIL lines stay separate on purpose — `truncated` means "more items than the cap" on one payload and "the sheet is longer than the scan limit, rows were never searched" on the other.
R-3 | web-app/kb/script_kb.html | `oopDegraded_`: an eligibility failure falls back to the price-only answer under a banner stating that no verdict was reached, carrying the SERVER's reason verbatim (only it knows whether the address was wrong or the service was down — g128). The seq token is CARRIED, not re-minted. Both failure channels route there (structured `{error}` and a thrown RPC), and only when there is an item to fall back to.
R-4 | web-app/kb/script_kb.html | `.kb-lookups` band on the landing host only, so the shared sections still serve the narrow drawer. Collapses on BOTH triggers (g50). `.kb-oop-fields` uses `auto-fit` instead, because neither trigger can see the case that breaks it: the drawer is ~340px on a 1920px desktop with data-compact unset. Results scroll inside their panel, cap on the scrolling element not the grid container (V-9). `.kb-land` widened to 1200px; `.kb-land-sec` keeps the 760px reading measure.
R-5 | web-app/kb/script_kb.html | Both fields carry a visible `<label for>`; the section heading is a plain div, since one heading cannot be the accessible name of two fields.

TEST RESULTS: passed. Pure 909 → 914, DOM 126 → 131, lint clean, manifest current (1300), counts block agrees. Visual matrix: all 6 `reference-*` scenarios 0px overflow, nothing missing, and the wide/dark/compact shots were READ — the band renders two columns at 1440, stacks at 480 and 390, and the content blocks are above the fold again.
Every new pin bite-checked. Two NO BITEs, both real and both acted on: (1) R-2's structural assertions stayed green against truncating the price map to `[prices[0]]` — the exact defect it is named for; the DOM pin catches that one and R-2 now SAYS it does not (g138). (2) The failure handler's item guard did not bite because nothing drove the thrown-RPC channel at all; a DOM assertion now drives it, and the guard bites.

REGRESSION RISKS:
- Checked and clear: `script_tour.html` targets none of the renamed ids; every landing content block is inside `.kb-land-sec`, so only the band takes the wider measure (confirmed in the 1440px shot).
- Checked and clear: geocode volume is unchanged. `eligInput_` was already bound to BOTH its address and item fields, so item keystrokes already fired the debounced geocode; the merged panel keeps one timer and one call per pause.
- Accepted, named: a rep can no longer read item A's price beside item B's eligibility. One panel means one item. No evidence anyone did this mid-call.
- Additive server payload: `price` is still shipped, so a stale cached client keeps working.

INVARIANTS AT RISK: None violated. INV-156 (seq/out-of-order) preserved and extended to the degraded path's carried token. INV-187 (unknown ≠ no, failed ≠ absent) strengthened — no verdict pill is invented when nothing was checked. INV-208/209 untouched (the composer's send-time re-verification path is separate; the OOP-B pins stay green). g02, g39, g50, g126, g128, V-9 all held and bite-checked.

NET SCORE: 2 − 1 = 1
(Production fixes: the `prices[0]` defect — High, live on prod today, fires for any multi-price item checked with an address; the unlabelled twin inputs — Low, a user-visible interface defect on a path reps hit. New failure mode: the degraded path issues a SECOND RPC, so a failing address during rapid typing roughly doubles request count on that path — Low, bounded by the seq check, failing path only. Capabilities: 1, the two-panel landing. Defensive/structural: 5.)

OPERATOR ACTIONS / DEPLOY:
- None. No new Script Property, no sheet change, no migration. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: **New version** → Deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- `.kb-land` at 1200px is a latent trap: a future landing block added WITHOUT `.kb-land-sec` renders at the full width instead of the reading measure. Nothing currently does. A pin over kbRenderLanding_'s blocks would close it.
- The eligibility row's meta now reads `area:` where it read `sheet:`; the price row already read `area:`. Deliberate — one wording for one renderer — but no pin holds the word.

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` — the Reference narrative describes three lookup panels.
- `docs/design-decisions.md` — the OOP-B and ELIG entries describe two surfaces; the merge and the reason for it (g126 made unrepresentable rather than remembered) belongs beside them.
- `docs/gotchas.md` + the CLAUDE.md index — g126 gains a second, shipped instance; a new rule is earned for the third responsive trigger (a shared section rendered into a host whose width neither the viewport nor data-compact describes).
- `docs/test-harness-log.md` — the R pins, and the two NO BITEs that changed them.
- `docs/operator-log.md` — the 2026-09-18 round.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
