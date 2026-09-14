---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch F2 of the post-cycle-19 next-steps plan (the Code.js split — the last batch in the plan), plus the four follow-on items from Batch F1's block.
  F2a | `00_config.js` — CONFIG, every enum, every top-level constant, first in filePushOrder
  F2b | Move-only split into thirteen more prefixed module files
  F2c | GUARD: the declaration set and every body identical to pre-split Code.js; plus the duplicate-name pin
  F2d | Tests.js / DevTools.js untouched; `filePushOrder` explicit; Code.js gone
  F2e | Docs: the Subsystems list, the One-CONFIG decision, the mock banner, CLAUDE.md, modules.md, the README
  FO-1 | `bite.sh` refuses a file with uncommitted changes — committed as `scripts/bite.sh`
  FO-2 | The duplicate-function-name pin F1 asked for (folded into F2c)
  FO-3 | `test/visual/mock.js`'s "VERBATIM copies from web-app/Code.js" banner
  FO-4 | `.cycle/config.md`'s Subsystems Server file list

Files modified: web-app/Code.js (DELETED, split into web-app/{00_config,10_core,20_timeclock,30_callnotes,40_metrics,50_deptrequests,51_spanish,60_intake,61_forms,70_kb,80_training,81_empdocs,82_coaching,90_qa}.js), web-app/.clasp.json, web-app/.clasp.dev.json.example, test/client/harness.js, test/client/run.js, test/client/server-split-manifest.json (new), test/visual/mock.js, scripts/bite.sh (new), CLAUDE.md, README.md, docs/modules.md, docs/design-decisions.md, .cycle/config.md, .cycle/STATE.md
Estimate: L (~6 h) — recorded in STATE.md 2026-09-14 18:40Z BEFORE the first edit (the plan says L/~2 days incl. re-verification; the split is script-driven here)
Actual: ~2.5 h

CHANGES:
F2a/F2b | web-app/*.js | 30,789 lines became fourteen files in the load order `filePushOrder` declares, with the numeric prefixes matching that order. HOW it was made safe, since "move-only" is the whole basis for deploying it without re-testing the server: (1) Code.js was parsed into 1,204 top-level units (a declaration plus the comment block immediately above it); reassembling them in order reproduced the file BYTE-IDENTICALLY; (2) every unit was then checked STANDALONE with `node --check` — all 1,204 parse, which PROVES no boundary fell inside a string or template literal, using a real parser rather than my own scanner (I wrote one first and it disagreed with the naive rule on 400 lines — it was the scanner that was wrong, and `node --check` settled it); (3) each unit was written out verbatim. The only bytes this batch ADDS to the server are one banner comment per file.
F2c | test/client/server-split-manifest.json + run.js | The manifest records all 1,203 named declarations with a canonical hash and a target file, generated from Code.js at tag `pre-f2-split`. The new pin recomputes the same hashes from the tree and compares name set, body hash and file — so "nothing inside a function changed" is checked on every CI run, not asserted once. The hash is canonicalised (trailing blank / pure-comment lines dropped) so a file banner is not a changed declaration; interior lines are hashed exactly.
F2c | test/client/run.js | The duplicate-name pin Batch F1 asked for: no top-level name declared in two server files. This is the ONE way the F1 shim could hide a real defect — Apps Script resolves a duplicate to the LAST declaration evaluated while `serverSource()` brace-matches from the FIRST — and the split made it reachable for the first time.
F2d | run.js, web-app/.clasp.json | A pin holds the shape: Code.js is gone (a stray copy would be pushed AND shadow every declaration in it), the constants load first, `filePushOrder` runs in the numeric order the filenames advertise, and Tests.js / DevTools.js stay out of it and untouched.
F2 | test/client/harness.js | `'Code.js'` became an ALIAS for "the server" (`isServerFile`). ~500 pins name it, it was always shorthand, and F1 promised they would not need editing — without the alias they would all have thrown ENOENT the moment the file left the tree.
F2 | test/client/run.js | ONE pin needed a real fix, and it is the instructive one. TQ-3 grabbed the trigger constants with `slice(indexOf('const AUTOMATION_TRIGGER_QUOTA'), indexOf('function runTriggerGroup_'))` — a POSITIONAL slice between two landmarks that the split moved into different files, so it swallowed everything between them and evaluated it. It extracts the three constants BY NAME now. Writing that extractor surfaced a second trap worth naming: a multi-line `const X = Object.keys(Y)\n  .reduce(…)` truncated at the first depth-0 newline to `Object.keys(Y)` — a VALID expression, so it failed with a WRONG VALUE (3 retired handlers instead of 8) rather than a parse error.
F2e | .cycle/config.md, docs/design-decisions.md, docs/modules.md, CLAUDE.md, README.md, test/visual/mock.js | The live docs that named Code.js as "the server" now name the fourteen files or the module's own. HISTORICAL mentions (HISTORY.md, the blocks, the operator log, the gotcha narratives) are deliberately left: a statement about what happened is a fact of its date, and rewriting one makes the record less true. The F4 mirror pin's landmark moved with the mock banner it matches on.
FO-1 | scripts/bite.sh | The bite helper lived only in a scratchpad and its closing `git checkout -- <file>` has discarded uncommitted work FOUR times (three in cycle-18 batch 5B, once in Batch F1, where the discarded edit was then committed as a revert and only the next full run caught it). It is committed now, refuses a file with uncommitted changes BEFORE touching it, refuses a mutation that changed nothing (a no-op mutation proves nothing while reading as a passing bite), and refuses to bite ITSELF — bash reads a script incrementally, so mutating it mid-run makes the shell resume mid-token and die with the restore never firing. That last one was found the only way it could be: by trying it.
FO-1 | test/client/run.js | A pin that the guard comes BEFORE the mutation and the restore is still last — a refusal after the mutation is a restore, which is the thing being prevented.

TEST RESULTS: PASSED.
  - `node test/client/run.js` — 822 passed, 0 failed (818 -> 822: move-only, duplicate-name, the split shape, the bite.sh guard).
  - `node test/client/dom/runDom.js` — 113 passed, 0 failed (unchanged).
  - `node scripts/counts.mjs --check` — green, and EVERY derived figure is identical to pre-split (admin endpoints 50, manager endpoints 61, triggers 16, dispatcher jobs 8). The split is invisible to every derivation, which is what F1 was for.
  - `node --check` over `web-app/*.js` — OK across all 16 (the 14 server files plus Tests.js and DevTools.js).
  - `cd test/visual && node build.mjs` — reproduces `page.html` with no git diff.
  - 10 mutations bite-checked / 8 bites; 2 could not be driven through the helper and were verified another way (deleting a declaration that a pin extracts crashes the harness before F2c runs — re-aimed at one no pin names, which BITES; and bite.sh cannot bite itself, so the guard pin's assertions were driven from a probe, where removing the guard and removing the no-op check both bite).
  Regression Scenarios walked: 101 exist; 82 carry "Server" and 2 carry "Test Suite" — every one of them overlaps a file this batch modified, because this batch moved the entire server.
   - S1 (smoke) and S2 (full integration) — **NOT RUN, and they are the deploy gate.** They execute `Tests.js` inside the Apps Script editor, which this container cannot reach. They are listed under OPERATOR ACTIONS as BLOCKING, per F2d's own "smoke run on dev BEFORE prod".
   - The 82 Server scenarios — NOT RUN here for the same reason (they are manual, editor- and browser-driven). What stands in for them is the move-only PROOF rather than a claim: the declaration set is unchanged, every body is byte-identical, no name is declared twice, the constants still load first, and the whole source evaluates top-to-bottom with no ReferenceError. A scenario can only behave differently if one of those is false, and each is checked on every run. This is stated as a proof, not as a pass: if the operator's dev smoke run disagrees, the proof is wrong and the split comes back out.

REGRESSION RISKS:
  - **The deploy is the risk, not the diff.** `clasp push -f` will delete Code.js from the Apps Script project and add fourteen files. Apps Script keeps ONE global scope across them, so behaviour is unchanged if and only if the push lands completely — a partial push leaves the project with some files missing and every function in them undefined. F2d's dev-first order exists for exactly this, and it is a BLOCKING operator action.
  - Load ORDER is now something a person can get wrong. The constants file is first and the pin holds the numeric ordering, but a future file inserted with a prefix that sorts before `00_config.js` would put a const in its temporal dead zone. The load-order pin catches it (it evaluates the concatenation in filePushOrder order).
  - `'Code.js'` as an alias is a small lie in service of a large truth: the name resolves to the server even though no such file exists. Documented in the harness, in `test/client/README.md`, and enforced in one place (`isServerFile`).
  - The classification of 846 functions into modules is JUDGMENT, not a contract. Nothing depends on it — every file shares one scope — so a function in the "wrong" file is a readability miss, and the manifest pins where each one is so a later re-classification is a deliberate, visible edit.
  - Nothing inside any function changed, so no caller, return type or default value moved.

INVARIANTS AT RISK: None violated. Two applied, one fired three times.
  - INV-202 — the reason F1 came first: `counts.mjs` reads the server through `serverSource()`, so the split changed no figure. Verified, not assumed.
  - INV-179 (derive the scan set) — the split pins derive from `filePushOrder` and the manifest; the CI syntax check is a glob.
  - INV-188 (strip comments before a source scan) — fired THREE times in this batch, twice in the same pin: the bite.sh guard pin found its guard's own EXPLANATION with `indexOf`, and the restore assertion found the refusal message quoting `git checkout --`. A probe caught the first, which is the only reason it is not still green and wrong.
  - INV-141 (`createPinnedSpreadsheet_` is the only creation path) and INV-154 (the AuditLog reader boundary) are unaffected: both functions moved intact and their pins read through the shim.
NET SCORE: 0 production fixes − 0 new failure modes = 0
  (A move. It ships no behaviour change by construction and fixes no live defect. The bite.sh guard fixes a TOOL hazard that has cost real work four times, but it is not production code, so it is not scored as a production fix.)

OPERATOR ACTIONS / DEPLOY:
- **Push to the DEV instance first and run the editor suite there** — `npm run push:dev`, then `runAllTests` in the dev project's editor. This is S1/S2, the only check this container cannot run, and it is the one that proves the fourteen files load as one scope in the real runtime. | BLOCKS DEPLOY: **Y**
- After the dev run is green, push prod (`npm run push:prod` or `clasp push -f`) and confirm the editor's file list shows the fourteen files and NO `Code.js`. A leftover `Code.js` in the project would shadow every declaration in it — the tree cannot cause this, but a stale project file can. | BLOCKS DEPLOY: **Y**
- Cut a New version deployment as usual; there is no behaviour change to announce. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version (the Deploy Command for the Server subsystem). Dev first, per F2d.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The plan's SEQUENCE is now finished: 0 → P → S → Q → C → D1 → D2 → F1 → F2 are all done. What remains in `.cycle/blocks/19-next-steps-plan.md` is its DEFERRED set, which is operator and feature decisions rather than defect work.
- INV-203's verify scan (every implement block carries `Estimate:` / `Actual:`) is still unbuilt; it needs a declared grandfather set, the Doc-map-declaration shape.
- A Common Gotchas rule for "read the server through `serverSource()`, never by filename" is now worth writing — Batch F1 deferred it precisely until the server was actually several files, which it now is. INV-202 is the invariant behind it.
- `test/client/server-split-manifest.json` is 6,000 lines of generated data in the test tree. It earns its place while the split is fresh; once a few cycles have passed without a move-only question, consider whether the duplicate-name and load-order pins alone are enough.
- The module classification put 154 functions in `10_core.js`. Several are arguably module-owned (the branded-email chrome, the Script-Property budget). Worth a read-through when someone is next in there, and the manifest makes moving one a visible edit.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — F2e was part of the batch, and `test/client/README.md` already documents the shim and the alias from F1. The gotcha rule named under FOLLOW-ON ITEMS is new guidance rather than drift, so it belongs to a `/sync-docs` pass or the next batch, not to this one.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
