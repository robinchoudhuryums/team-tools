---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB1.2 (handbook app plan, operator 2026-10-28) — handbook-app/, a second Apps Script project serving the handbook read-only to the whole domain, fed by a derived copy of Team Tools' readers
Files modified: handbook-app/Handbook.js (new), handbook-app/index.html (new), handbook-app/appsscript.json (new), handbook-app/.clasp.json (new), handbook-app/kb_shared.js + shared/script_manual_render.html + kb/script_manual_diagrams.html + script_icons.html (new, GENERATED), scripts/handbook-sync.mjs (new), scripts/lint-server.mjs, test/client/run.js, package.json, package-lock.json, .github/workflows/client-tests.yml, CLAUDE.md, README.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md
Estimate: M-L (~5 h) — written before the first edit
Actual: ~3 h (scoping the server closure 0.5 · Handbook.js + sync 1 · lint split, tests, bites 1 · docs 0.5)

CHANGES:
HB1.2 | handbook-app/Handbook.js | the ENVIRONMENT under Team Tools' names — getEmployeeInfo_ (any signed-in caller, never an admin, so no draft is served), getKbSS_ (HANDBOOK_KB_SS_ID, unset said by name), getOrCreateKbSheet_ (reads; a missing KB tab is named, never created), fmtDate_ (CONFIG.TIMEZONE via the sync) — and the 12 public endpoints: the shared reader's 9 server needs, getManualRecent (published changes), doGet, include. getManualParts adds a chunked 5-minute cache that never caches a refusal; getReferenceItem serves handbook sections only; feedback, Drive thumbnails and distances say "not available in the handbook app yet" in their caller's failure shape
HB1.2 | scripts/handbook-sync.mjs | copies the three reader partials byte for byte under a banner, and writes kb_shared.js: every Team Tools name Handbook.js uses, plus all it reaches (acorn walk over the pushed server files, property names excluded), stopping at what Handbook.js declares; `ttXxx_` copies `xxx` privately; HB_TT_CONFIG picks CONFIG literals; refuses a copied write (sheet/property/lock/mail/Drive mutation), a reach into CONFIG, and a tt-name with no original; --check exits 1 while a copy is stale; --root for tests. Today: 44 declarations from 00_config.js + 70_kb.js, 4 supplied names, 6 renames
HB1.2 | handbook-app/appsscript.json, .clasp.json, index.html | domain access, run as deployer, two scopes (spreadsheets.readonly, userinfo.email); scriptId placeholder; a setup-check page (version, chapters, sections, or the named failure) that HB1.3 replaces
HB1.2 | scripts/lint-server.mjs | lints each project's global scope alone (advancedServiceGlobals(dir)); the F-50 pin calls it with a directory
HB1.2 | CI, package.json | the sync --check after npm ci; the syntax loop covers handbook-app/*.js; acorn a declared devDependency; npm run handbook:sync / handbook:push
HB1.2 | test/client/run.js | HB1.2-a..e (copies current + the environment/rename sets + wiring; three refusals through --root; the server driven in a vm over fake services: drafts, Reference articles, news, cache, anonymous, unset property, missing tab; public surface ⊇ SHELL NEEDS, manifest) — 9/9 bites

TEST RESULTS: pure 1437/1437, DOM 301/301, lint-server clean over 2 projects (18 files), handbook-sync --check clean, counts --check clean, cycle-closeout --check in step. Regression Scenarios: NOT APPLICABLE — no web-app/ file changed (the handbook app is new code; Team Tools' behaviour is untouched).
REGRESSION RISKS: lint-server's restructure could hide a web-app problem — mitigated: same rules, same file set, and it still reports "18 server files" (16 web-app + 2 handbook). A future web-app change to a copied reader must be re-synced; CI enforces.
INVARIANTS AT RISK: None — Team Tools' code is unchanged. The handbook app's draft rule is Team Tools' own (copied), with isAdmin always false.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Create the project: `mkdir /tmp/hb && cd /tmp/hb && clasp create --type standalone --title "UMS Handbook"`; copy the scriptId into handbook-app/.clasp.json; commit | BLOCKS DEPLOY: Y (handbook app only)
- `npm run handbook:push` | BLOCKS DEPLOY: Y (handbook app only)
- Script Property HANDBOOK_KB_SS_ID = the KB spreadsheet id (same as Team Tools' KB_SS_ID) | BLOCKS DEPLOY: Y (handbook app only)
- Deploy → New deployment → Web app, Execute as Me, Anyone within the organisation; authorise the two scopes; open the URL and see the chapter list | BLOCKS DEPLOY: Y (handbook app only)
Deploy: N/A for Team Tools — nothing in web-app/ changed. Handbook app: `npm run handbook:push`, then a deployment as above.

FOLLOW-ON ITEMS:
- HB1.3: the frame — it needs the 11 script_core shell names (22 declarations, ~19 KB, incl. the error beacon, which calls a Team Tools server function) and their styles; the sync can extract them the way it extracts the server.
- HB1.4: search (Team Tools' searchReference writes the search signal and reads KB_SEARCH_SYNONYMS, a Team Tools Script Property — decide both), feedback routed to chapter owners, visual scenarios, docs/handbook-app.md.
- The handbook app shows a publish within five minutes (its cache is its own); if that is too slow, a generation cell in the KB spreadsheet written by Team Tools' invalidateKbCache_ would key the handbook's caches.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (CLAUDE.md projects/development/deploy lines + decision and operator index lines, README, the decision, the operator entry, the harness log, the Subsystems map).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
