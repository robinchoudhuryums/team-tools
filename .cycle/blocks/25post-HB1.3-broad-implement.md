---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding); plus the HB1.2 CI follow-up (the pushed HB1.2 run was red in the dependency-free floor)
New capabilities (G/ST): HB1.3 (handbook app plan, operator 2026-10-28) — the handbook app's frame: contents, department picker, home with the reader's chapter first and what changed since the last visit, chapters kept in the browser, ?s= section links and Back
Files modified: handbook-app/index.html, handbook-app/script_handbook.html (new), handbook-app/styles_handbook.html (new), handbook-app/Handbook.js, handbook-app/shell_shared.html + styles.html + styles_design_tokens.html + shared/script_manual_render.html (GENERATED), scripts/handbook-sync.mjs, web-app/script_core.html, web-app/shared/script_manual_render.html, test/client/run.js, test/client/dom/runDom.js, package.json, package-lock.json, .github/workflows/client-tests.yml, CLAUDE.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md
Estimate: L (~7 h) — written before the first edit (the plan said M (~4 h); scoping found the page shell, the styles and the browser cache)
Actual: ~4.5 h (CI follow-up 0.3 · scoping 0.7 · Team Tools refactors + sync shell 0.8 · page 1.2 · tests + bites 1.2 · docs 0.3)

CHANGES:
HB1.2-FU | test/client/run.js, CI | HB1.2-a/b spawn the sync (acorn) and ran in the floor before npm ci — testNeedsDeps skips them VISIBLY there; CI re-runs the harness after npm ci with REQUIRE_DEPS=1, where a missing package fails
HB1.3 | web-app/script_core.html | the anonymous Escape and focus-trap listeners' bodies named overlayEscapeClose_ / overlayFocusTrap_ (Team Tools' listeners call them; behaviour unchanged, DOM Escape/focus pins green)
HB1.3 | web-app/shared/script_manual_render.html | kbManualPartsAccept_ — kbPrefetchManualParts_'s success body, so the handbook hands the reader its kept chapters in the same shape (MR1 sandbox updated)
HB1.3 | scripts/handbook-sync.mjs | copies the tokens and styles partials; extracts shell_shared.html (23 page declarations from script_core + Reference: overlays, toasts, copy, print) by dependency walk from the handbook pages, stopping at what they declare; refuses a reach into KB_STATE and a copied call to a server function the app does not serve; the walk (server too) is now scope-analysed with eslint-scope (a local named like a top-level declaration is not a use — script_core's pad no longer rides along); the server copy is byte-identical
HB1.3 | handbook-app/script_handbook.html, index.html, styles_handbook.html | the host: all 18 MANUAL_HOST hooks; contents with chapter groups and "changed" dots; department picker; home (version, news since the last visit — 30 days on a first — published sections only, your chapter first, all chapters); IndexedDB kept copy checked against getManualStamp, failed read → kept copy + "may be out of date"; ?s= via doGet + kbManualNumberTarget_, google.script.history push/replace + change handler; unknown section → toast + home; Escape closes overlays then the narrow contents; feedback hidden until HB1.4; errBeaconSend_ is the page's own (console only); #toast-stack provided
HB1.3 | handbook-app/Handbook.js | doGet hands the page a section-shaped ?s= (anything else ''); getManualParts carries a stamp (FNV-1a + length), cached beside the parts; getManualStamp — one cache read while warm
HB1.3 | tests | pure HB1.3-a..e (helpers; every hook installed, derived; stamp + ?s= filter; literal element ids provided; no-undef over the assembled page with jsdom-derived browser globals); DOM: seven drives of the booted page; HB1.2-b extended to the page walk's refusals — 12/12 bites

TEST RESULTS: pure 1442/1442 (floor without packages: 1437 pass + 5 visibly skipped), DOM 308/308, lint-server clean (2 projects), handbook-sync --check clean (7 files, 44 server + 23 page declarations), counts --check clean. Regression Scenarios walked for the two Team Tools files touched: the overlay Escape/focus scenarios and the manual reader's chapter cache — PASS (their DOM/pure pins are green and the code paths are the same statements, named). Chromium render of the page (home, section, ?s=3.8.1, contents click, 390px, dark): no page errors, no sideways overflow.
REGRESSION RISKS: script_core's focusin listener is now a named function declared after its registration (hoisted — same behaviour). Copying styles.html whole brings Team Tools' global rules (body height, focus ring, print block) to the handbook page — intended (identical reader), and the page's own body rule overrides only display/overflow.
INVARIANTS AT RISK: None — Team Tools' behaviour is unchanged; the handbook app still writes nothing.
NET SCORE: 1 production fix (the red HB1.2 CI run) − 0 new failure modes = +1 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- The HB1.2 setup if not yet done (clasp create → scriptId into handbook-app/.clasp.json, HANDBOOK_KB_SS_ID, a domain deployment) | BLOCKS DEPLOY: Y (handbook app only)
- `npm run handbook:push`, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: Y (handbook app only)
- Team Tools: clasp push + New version — script_core and the shared partial changed (behaviour-neutral) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- HB1.4: search (decide the search signal and Team Tools-only synonyms), feedback routed to chapter owners (then un-hide the bar's vote), visual-matrix screens for the page (the scratch Chromium render here is not in the matrix), docs/handbook-app.md.
- The page's contents are buttons in groups without list semantics; HB2.4's accessibility audit should decide the contents' ARIA (a tree vs. plain buttons).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, operator entry, harness log, Subsystems map, CLAUDE.md's handbook-app line).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
