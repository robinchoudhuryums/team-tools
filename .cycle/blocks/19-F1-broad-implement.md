---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch F1 of the post-cycle-19 next-steps plan — the harness shim, a no-op landing BEFORE the Code.js split.
  F1a | `serverSource()` derived from `.clasp.json` filePushOrder; every server read routes through it; CI's `node --check` becomes a loop
  F1b | Pins: byte-equality with the single named file, the filePushOrder declaration, load-order evaluation, and a ban on reading the server by filename
  INV-202 | `scripts/counts.mjs`'s two `web-app/Code.js` derivations grow through the shim — the invariant's own acceptance criterion, and the reason it was written before this batch

Files modified: test/client/harness.js, test/client/run.js, test/client/README.md, scripts/counts.mjs, web-app/.clasp.json, web-app/.clasp.dev.json.example, .github/workflows/client-tests.yml, CLAUDE.md (generated counts block only), .cycle/STATE.md
Estimate: S–M (~3 h) — recorded in STATE.md 2026-09-14 18:05Z BEFORE the first edit (F1 is S/~2 h in the plan; INV-202 adds counts.mjs to its scope)
Actual: ~1.5 h

CHANGES:
F1a | test/client/harness.js | NEW `serverFiles()` + `serverSource()`. The file LIST is derived from `web-app/.clasp.json`'s `filePushOrder` — the same declaration `clasp push` obeys — so the harness and the deployment cannot disagree about what the server is or in what order it loads. There is deliberately NO fallback to Code.js: an empty list THROWS, because reading one file anyway would make the derivation vacuous exactly when it stopped being true (INV-179). A filePushOrder entry naming a missing file is refused BY NAME — added after a bite-check showed it otherwise surfaced as a bare ENOENT out of whichever pin first asked for the server.
F1a | web-app/.clasp.json | `filePushOrder` was `[]`; it names `Code.js`. Inert today (clasp pushes that file first, then the rest — same files, same content) and required by F2d.
F1a | test/client/harness.js | `extractRawFunction(file, name)` resolves through `serverSource()` when `file` is a server file, so the ~500 pins that say `'Code.js'` keep working after a function moves — `'Code.js'` was always shorthand for "the server". Non-server names are read directly, exactly as before.
F1a | test/client/run.js | The 73 direct `readFileSync` reads of the server go through `serverSource()`. `extractConstObject` got the same treatment. The two hand-listed loops that included the server — the SUBMITTED_AT alias-proof scan (`['Code.js','Tests.js']`) and D2's gotcha-subject scan — derive from `serverFiles()` now.
INV-202 | scripts/counts.mjs | `gatedEndpoints()` and `triggers()` read the server through the shim (imported via `createRequire`) instead of by path. Every figure is unchanged, which is the point. The two ROWS labels that said "in `Code.js`" now say "in the server source".
F1a | .github/workflows/client-tests.yml | The syntax check is a LOOP over `web-app/*.js` with a guard against matching nothing, not three named files — a hand-listed check would stop covering the new files on the very commit that creates them.
F1b | test/client/run.js | FOUR new pins. (1) `serverSource()` equals the files joined in order, and with a ONE-entry list is byte-identical to that file — the no-op proof this batch exists to provide. (2) `filePushOrder` is declared, every file it names exists, `Tests.js`/`DevTools.js` are NOT in it, and the committed `.clasp.dev.json.example` declares the SAME list (push:dev swaps it over .clasp.json, so a drifted dev config would push the server in a different order). (3) The source EVALUATES top-to-bottom under GAS stubs with no ReferenceError — as ONE concatenation, which is the faithful model of Apps Script's shared global scope, since a vm script's top-level `const`/`let` never reach the context. Two non-vacuity assertions (`doGet` and `recordPunch` reached the global scope) keep an empty source from passing. (4) Nothing reads the server by filename, in run.js OR counts.mjs — the second half added after a bite-check found reverting counts.mjs left the suite green, which was INV-202's acceptance criterion going unenforced.
F1a | test/client/README.md | A "Reading the server" section: the API, why there is no fallback, and the rule that a pin never uses `readFileSync` on the server.

TEST RESULTS: PASSED.
  - `node test/client/run.js` — 818 passed, 0 failed (814 -> 818: the four F1b pins). Identical results to before the shim for every pre-existing pin.
  - `node test/client/dom/runDom.js` — 113 passed, 0 failed (unchanged).
  - `node scripts/counts.mjs --check` — green; every derived figure identical after the two derivations moved onto the shim.
  - `node --check` over `web-app/*.js` — OK (the new CI loop, run locally).
  - `cd test/visual && node build.mjs` — reproduces `page.html` with no git diff, i.e. the visual fixture pipeline is byte-identical.
  - 11 mutations bite-checked / 9 bites + 2 that crash the harness before the pin runs rather than failing it (a missing filePushOrder file, an empty serverSource) — both were then verified another way: the first now throws a NAMED error (a fix this batch made), the second by driving its non-vacuity assertion directly against an empty vm context.
  Regression Scenarios walked: 101 exist; 2 have a Subsystem overlapping a modified file directly (Test Suite: S1 smoke, S2 full integration) and 82 carry "Server", which includes `web-app/.clasp.json` in its file list.
   - S1, S2 — NOT APPLICABLE. They run `Tests.js` inside the Apps Script editor. No `.js` under `web-app/` changed; the editor suite cannot observe a Node harness, a CI workflow, or the clasp file-order hint.
   - The 82 Server scenarios — NOT APPLICABLE, as a class, for one stated reason: the only Server-subsystem file touched is `.clasp.json`, and only its `filePushOrder` array. That is clasp CLI metadata controlling the ORDER files upload in; it changes no file's content, the set of files pushed, or any runtime behaviour, and with a single entry the resulting Apps Script project is identical. Walking 82 runtime scenarios against a push-ordering hint would be theatre, so the honest record is the reason rather than 82 asserted passes. The one thing worth confirming at deploy time is named under OPERATOR ACTIONS.

REGRESSION RISKS:
  - `extractRawFunction` changed resolution for server file names: it reads the CONCATENATION rather than one file. With one entry these are the same string (pinned), so today the risk is zero by construction. After F2 a duplicate top-level function name across two server files would make it return the FIRST — which is also what Apps Script would do with the later declaration winning at runtime, i.e. a real defect the harness would then be hiding rather than creating. Worth a name-collision pin in F2c, which the plan already calls for.
  - `filePushOrder` is now non-empty, so `clasp push` orders Code.js first. Inert with one entry; the failure mode if a future entry names a file that does not exist is a refused push, and the harness refuses first, by name.
  - `scripts/counts.mjs` now requires `test/client/harness.js` — a script depending on the test harness. Deliberate: the alternative was a second `serverSource()` in counts.mjs, which is the parallel-source defect INV-202 exists to prevent. The coupling is one function and is exercised by CI.
  - Nothing runtime changed. No file that ships to Apps Script was modified.

INVARIANTS AT RISK: None violated; three applied and one FIRED on me.
  - INV-202 — this is its first real application and its acceptance criterion is now enforced by a pin rather than asserted in prose.
  - INV-179 (derive the scan set) — the shim derives from `.clasp.json`; the two scans that hand-listed the server derive from `serverFiles()`; the CI check is a glob.
  - INV-188 (strip comments before a source scan) — fired on the FIRST run of the filename-ban pin, whose own comment quotes the shape it bans. Stripped, as the rule says.
  - Gotcha g65 ("a bite-check ends in `git checkout`") — FIRED, on the batch that indexed it this morning. The f1-9 bite ran against an UNCOMMITTED edit to `.clasp.dev.json.example`; the closing `git checkout --` reverted it and the next commit captured the revert. The pin caught it on the next full run and it was re-applied and re-bitten. Recorded rather than quietly fixed, because the follow-on it argues for (bite.sh should refuse a dirty file) is now twice-evidenced.
NET SCORE: 0 production fixes − 0 new failure modes = 0
  (A deliberate no-op batch: it ships no runtime change and fixes no live defect. Its whole value is that the NEXT batch can move 40,000 lines between files without touching a pin, and that the move is checkable.)

OPERATOR ACTIONS / DEPLOY:
- On the next `clasp push`, confirm it reports the same file set as before (the `filePushOrder` entry changes upload ORDER only). If a `.clasp.dev.json` already exists locally, copy the `filePushOrder` line into it from `.clasp.dev.json.example` — `push:dev` swaps that file over `.clasp.json`. | BLOCKS DEPLOY: N
Deploy: N/A — no file that ships to Apps Script changed. A push is not required by this batch; when one next happens for another reason, the note above applies.

FOLLOW-ON ITEMS:
- `bite.sh` should REFUSE to run against a file with uncommitted changes. Gotcha g65 has now fired four times (three in cycle-18 batch 5B, once here); it is the only hazard in this repo whose documented mitigation is "remember".
- F2c should pin that no top-level function NAME is declared in two server files. `serverSource()` resolves a collision to the FIRST declaration while Apps Script resolves it to the LAST — the one way the shim could hide a real defect, and it only becomes reachable once there is more than one server file.
- `test/visual/mock.js`'s banner says "VERBATIM copies from web-app/Code.js". The F4 mirror test resolves through `serverSource()` and keeps working, but the banner's wording is F2e's to update.
- `.cycle/config.md`'s Subsystems section lists `web-app/Code.js` under Server; F2e updates that list, and doing it earlier would make it wrong today.

DOCUMENTATION UPDATES NEEDED:
- `test/client/README.md` — DONE in this batch (the "Reading the server" section).
- A Common Gotchas rule for "read the server through `serverSource()`, never by filename" would be the natural home for this, and INV-202 is the invariant behind it. Deferred deliberately: the rule is held by a pin today, and the gotcha reads better written once the server is actually several files (after F2), when the reason is visible rather than hypothetical.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
