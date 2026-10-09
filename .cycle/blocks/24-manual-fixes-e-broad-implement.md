---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual fixes E1 (change list 2026-10-08 Part E) — the visual matrix's procedures-manual fixtures were pre-renumber ("0.10.2 Before you transfer", "Part 0", router "0.2, then 5.2", "10.1 How billing works"); they are now the real October manual, copied by a generator, so the reader screenshots show the manual as it is. E2 (export → import as drafts → spot-check in the live app) is the operator's. Also, before E and committed separately (d649d28): Card 3's header names 3.2 by its current title ("Department specific amendments"), and Card 7's ventilator line says "notify the On-Call RT" (both follow-ons from F2).
Files modified: test/visual/manual-fixtures.mjs (new), test/visual/mock.js, test/visual/manual-images.json, test/visual/shoot.mjs, test/visual/README.md, .cycle/STATE.md (and manual/src/appendix_c.md in d649d28)
Estimate: S (~1.5 h) — written before the first edit, 2026-10-09
Actual: ~1.5 h

CHANGES:
E1 | test/visual/manual-fixtures.mjs (new) | `node test/visual/manual-fixtures.mjs <manual.json>` rewrites mock.js's generated MANUAL-FIXTURES block — REAL_MANUAL (0.2, 0.10, 3.8, 5.1, 5.2, 6.2, 10.4 verbatim) and REAL_META (version, build date, the three router rows the scenarios use, their targets' titles, the search hit's real table row under 0.2.2, the fixture sections' changelog entries and the three newest) — and writes manual-images.json with every image those sections name plus the two the 0.11 fixture shows. It throws, naming what to update, if a section, router row or search row is missing from the export.
E1 | test/visual/mock.js | The hand-written 0.10 and 10.1 are gone (real 0.10 and 10.4 replace them). 0.11 stays hand-written on purpose — no real section carries HCPCS codes, a nested list, a Critical callout, a Script snippet, a figure, a photo, a not-imported image and anchored/anchorless/cross-chapter links together — but under the real 0.11's title and headings, with every link naming its real target (0.10.2 Trx State, 10.4 Deductibles and cost-sharing, the real figure caption). getReferenceItem, getManualPart, getManualParts (chapters derived from the sections), the Reference tree, getManualMeta (real router, version, build; the real 0.11 changelog entry re-dated so the Updated badge stays photographed), searchReference (the real router hit and the real 0.2.2 row), the What's-new recent list (the export's three newest, re-dated) and the import report's skipped titles all read the real data.
E1 | test/visual/shoot.mjs | Three selectors retargeted: the dark-wide scenario now photographs the nested list/Critical/snippet in 0.11.1 (real 0.10.2 has none), the images scenario 0.11.3, and the two back-chip scenarios the 10.4 link. No scenario added or removed.
E1 | test/visual/README.md | How and when to refresh the fixtures.
Found while shooting | test/visual/manual-fixtures.mjs | The router listed only its Money row: the client shows a row only when the reader can see one of its targets (kbRouterRows_ — correct app behaviour), and 0.2 and 6.2 were not in the fixture. Both are now real fixture sections.

TEST RESULTS: Test Command is manual. Pure 1255/0, DOM 223/0, lint:server ok, counts ok (no count changed). Visual matrix, the 32 manual-related scenarios (reference-manual*, reference-landing-manual*, whatsnew-manual, reference-search*, reference-drawer-backto): 0 horizontal overflow, 0 missing fixtures, no page errors (only the sandbox's blocked web-font fetch). Shots read: the real 0.10 with its diagram and icon tables (light and dark), the router filtered to "waiting" showing the real 0.2.2 row, the back-chip landing on real 10.4 with its cost-share diagram, the search hit on the real 0.2.2 table row, the landing's real recent changes, the 0.11 feature fixture's list/Critical/snippet and figure. Regression Scenarios: none covers test/visual (the matrix is manual and outside CI) — NOT APPLICABLE; no app code changed.
REGRESSION RISKS: Fixture content now follows the manual — after a manual change the shots differ until the generator is re-run (that is the point); a section removed from the manual makes the generator throw rather than leave a stale copy. manual-images.json grew from 4 to 45 images (~145 KB) — page.html is generated and not committed.
INVARIANTS AT RISK: None (INV-185, fixture shapes mirror the server returns: every fixture keeps its shape; only content changed).
NET SCORE: 0 production fixes (test-harness fidelity; no app or manual behaviour changed) + 2 card fixes in d649d28 (wording consistency) − 0 new failure modes = 0; counted as defensive/structural.

OPERATOR ACTIONS / DEPLOY:
- E2: re-export manual.json (manual/make_all.sh), import as drafts (Reference → Manual → Check → Import), and spot-check a chapter page, a diagram in dark mode, a cross-reference preview, the router and a section-number search — then Publish | BLOCKS DEPLOY: N
- Still owed from earlier batches: `clasp push -f` + New version (the diagram partial changed in F1/C), the Word check, sending the packets | BLOCKS DEPLOY: Y (the clasp push, for the diagrams)
Deploy: N/A for this batch — test/ is never deployed.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The DOM harness's own manual fixtures (test/client/dom/runDom.js) still use pre-renumber names ("Part 10 — Billing & Insurance", "10.1 How billing works"). They test reader logic, and the reader deliberately still accepts "Part NN" departments, so they were left alone; a later pass could move them to "Chapter NN" so the harness reads like the manual.
- F15 (Billing's packet answers) and the optional category-owner full names remain open.

DOCUMENTATION UPDATES NEEDED:
- None beyond test/visual/README.md (done).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
