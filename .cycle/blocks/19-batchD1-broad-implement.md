---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- D1a | The Cycle Workflow Config moved to `.cycle/config.md`; CLAUDE.md keeps a redirecting stub
- D1b | The 137 Key Design Decisions moved to `docs/design-decisions.md`; CLAUDE.md keeps a 137-link index
- D1c | The 67 dated deploy-round entries moved to `docs/operator-log.md`; the 74 per-property entries STAY in CLAUDE.md, now with an inventory index
- D1d | CLAUDE.md opens with a Doc map: which file holds what, where a `/sync-docs` update belongs, and which files are append-only archives
- D1e | The three `run.js` pins that read the moved text repointed; README cross-links; the counts + context scripts prefer the new home

Files modified:
- .cycle/config.md (NEW, 2712 lines)
- docs/design-decisions.md (NEW, 3946 lines)
- docs/operator-log.md (NEW, 1541 lines)
- CLAUDE.md (12,662 -> 4,873 lines)
- README.md
- scripts/counts.mjs
- test/client/run.js
- test/client/README.md
- test/visual/README.md
- test/visual/mock.js
- .cycle/STATE.md

Estimate: M (~6 h) — the plan's figure, recorded in STATE.md before the first edit.
Actual: ~3.5 h.

CHANGES:
D1a | .cycle/config.md, CLAUDE.md | The whole Cycle Workflow Config moved VERBATIM, minus the Running totals subsection, which stays in CLAUDE.md because it is a project-wide fact sheet rather than cycle machinery and because `counts.mjs --check` compares it there. CLAUDE.md keeps a stub under the same heading: the eleven workflow commands that say "read CLAUDE.md's Cycle Workflow Config" are synced byte-identical from the template and cannot be edited locally, so the stub IS the redirect mechanism. It also RESTATES the Test Command, because every implement command reads that first and should not pay a second file open for it.
D1a | scripts/counts.mjs | `libraryFile()` prefers `.cycle/config.md` and falls back to CLAUDE.md; the two derived rows label their source accordingly. INV-202 in code: a derived count that reads a source file BY PATH is coupled to that file's layout, so a doc move must carry the derivation with it. `cycle-context.mjs` already had the fallback and needed no change — verified, not assumed (`node scripts/cycle-context.mjs` prints "Invariant library: 201 invariants (see .cycle/config.md)").
D1b | docs/design-decisions.md, CLAUDE.md | 137 decisions moved byte-identical apart from one inline `<a id="slug"></a>` per entry. CLAUDE.md keeps an index of 137 links. Fidelity verified by diffing the extracted bodies, not by reading them.
D1c | docs/operator-log.md, CLAUDE.md | The 67 dated round entries moved in source order; the 74 per-property entries STAYED. See REGRESSION RISKS for why that departs from the plan. The checklist gained an inventory index, plus explicit rows for three operator-settable properties (`QA_AUDIT_TARGET_PER_PERIOD`, `QA_SCORECARD_CRITERIA`, `CN_AUTO_TAG_RULES`) that had been documented ONLY inside a dated round entry — findable while scrolling a 12k-line file, invisible once the rounds moved.
D1d | CLAUDE.md | A Doc map table naming each file, what it holds, and when to read it; a "where a /sync-docs update belongs" paragraph; and a DECLARATION of which files are append-only archives. The last is load-bearing — see D1e.
D1e | test/client/run.js | One shared `configDoc_()` resolver (prefer `.cycle/config.md`, fall back to CLAUDE.md). F7 (INV-136's admin-endpoint count), VIS-COVER (the `VISUAL-GAP-TABS:` marker) and PR3-5 (the coverage assert) read through it.
D1e | test/client/run.js | Batch C's running-totals ban now DERIVES its file set from the Doc map block and its archive exclusion from that declaration. Without this it would have silently narrowed to the 3,800 lines left in CLAUDE.md the moment ~9,000 lines of the prose it guards moved out — INV-179's exact failure mode, one week after INV-179 was written. An UNDECLARED file is scanned, so adding an archive is a deliberate edit to the doc rather than a quiet edit to the pin.
D1e | test/client/run.js | TWO NEW PINS for the coupling the split CREATED: the 137-link index vs the 137 anchors, asserted in BOTH directions (a dead link sends the reader to nothing; a missing link hides a decision from the only place anyone looks), plus anchor uniqueness and an entry count that still counts an UNANCHORED entry; and the stub's existence, its naming of config.md, its restated Test Command, and config.md carrying the five sections the commands need.
D1e | README.md, test/client/README.md, test/visual/README.md | Cross-links. README gains a Documentation table. Both test READMEs say where the Invariant Library, the Regression Scenarios and the Visual Audit Stage now live. Two source comments pointing at "CLAUDE.md's Visual Audit Stage" repointed (`mock.js`, `run.js`).
D1e | test/visual/README.md | Its hand-typed "all 44 scenarios" — stale since the matrix passed 100 — now points at the generated block. The C4 ban did not catch it (its three patterns are `expects N`, an arrow running total, and the admin-tier size); see FOLLOW-ON ITEMS.

TEST RESULTS: passed.
- Pure harness: 810 passed, 0 failed (808 + the two new D1 pins)
- DOM harness: 113 passed, 0 failed
- `node scripts/counts.mjs --check`: CLAUDE.md agrees with the tree (the block was regenerated when the two pins moved the total — the derived-count system doing its job)
- `node --check` on Code.js / Tests.js / DevTools.js: OK
- `node scripts/cycle-context.mjs`: prints the invariant count from `.cycle/config.md` (the plan's acceptance criterion)
- Fidelity: 137 index links resolve to 137 anchors, 0 unresolved; 74 property entries + 67 round entries = 141, exactly what HEAD carried, none lost, none duplicated; 201 invariants and 101 scenarios now in config.md and 0 in CLAUDE.md
- Bite-checks: 14 mutations, 14 bites. TWO were corrected mid-batch and one mutation was itself wrong — see REGRESSION RISKS.

Regression Scenarios walked (Test Command is `manual`; the only subsystem overlapping a modified file is Test Suite — `scripts/counts.mjs`, `test/client/run.js`, `test/visual/mock.js`):
- S1 Smoke test suite | NOT APPLICABLE — no Apps Script file changed. `git diff origin/main..HEAD -- web-app/` is empty (0 files).
- S2 Full integration test suite | NOT APPLICABLE — same reason. `node --check web-app/Tests.js` passes, confirming no incidental damage.
No other scenario names Test Suite; every Server / Client-partial scenario is NOT APPLICABLE by construction, since this batch ships no deployable file.

REGRESSION RISKS:
- DELIBERATE DEPARTURE FROM THE PLAN, flagged rather than silently done: D1c asked for the 74 operator property entries to be compressed to one line each (~150 lines). They were NOT compressed. Compression is a lossy REWRITE, and D1's whole method is "moved VERBATIM"; the detail in those entries is deploy-critical procedure (the ALL-CST roster runbook, the tz-repair run ORDER, the 24-handler trigger list, the accrual pre-flight) where a one-line summary would be an instruction an operator cannot follow. The line reduction D1 was after came from moving the 67 ROUND entries instead — the genuinely historical half. Compression belongs in D2, whose stated method is already "rule + trigger + verify pointer"; recorded as a follow-on so it is a decision rather than an omission.
- FOUND AND FIXED DURING THE BATCH — a silently-dead pin, the second instance of Batch C's class. PR3-5's coverage assert is NEGATIVE-only (`!marker-contains-coverage`), so when the marker moved to config.md it passed vacuously instead of going red. The existence assert added alongside the repoint was ITSELF vacuous on the first write: the Visual Audit Stage MENTIONS `VISUAL-GAP-TABS:` in prose, so a bare `/VISUAL-GAP-TABS:/` test matched the sentence describing the marker even with the marker line deleted. It now parses the marker LINE the way VIS-COVER does; bite-checked, and deleting the line fails both pins.
- One bite-check mutation was itself wrong, not the pin: removing the `[.cycle/config.md]` LINK from the stub did not break the redirect, because the stub names the file again two paragraphs later — which is a stub that still redirects. Re-aimed at the property (no mention anywhere in the stub); it bites.
- CI time is unchanged. The two new pins are file reads.
- `counts.mjs --check` reports a red harness as a Node stack trace rather than a clean message, because it spawns `run.js` and `execFileSync` throws. The exit code is 1 either way, so the gate holds — this is a Batch C ergonomic wart surfaced by a D1 bite-check, not something D1 introduced. Follow-on.
- No interface, return type or default changed for any consumer. `libraryFile()` is new and exported; `docLists()` keeps its signature and return shape. No `web-app/` file changed at all.

INVARIANTS AT RISK: None.
- INV-179 (derive scan sets, never hand-copy) — this batch is a direct application: the C4 ban's file set and archive exclusion are derived from the Doc map, so the split widened the ban instead of narrowing it. The failure mode INV-179 names would otherwise have fired here.
- INV-202 (a derived count reading a source file by path is coupled to that file's layout) — proposed by the reflection two hours earlier and applied here for the first time: `counts.mjs` moved with the text it counts. This is the batch that makes it real, and F1 inherits the obligation.
- INV-72 / INV-185 (parallel sources must be pinned) — the split CREATED a parallel source (index ↔ anchors) and pinned it in the same batch rather than leaving it to a hand-run script.
- INV-188 (strip comments before a source scan) — the two source comments repointed in this batch are the reason it keeps recurring; no new ban was written over a file documenting its own drift.
- No PHI, access-control, gating or Sheets-coercion surface was touched.

NET SCORE: production fixes 0 − new failure modes 0 = 0.
(a) Would this have fired in production this month? NO for every item — this batch ships no deployable code. Its value is structural: the file a reader gives up on is 4,873 lines rather than 12,662, and a /sync-docs pass now has a stated place to put each kind of update. It CAUGHT two live problems on the way: a pin that had been passing vacuously since PR 3, and a README scenario count stale by 58.
(b) Did any fix introduce a new failure mode? NO — the one that would have (a ban silently narrowing to the 3,800 lines left behind) is derived from the Doc map and bite-checked in both directions.

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: N/A — no `web-app/` file changed, so nothing reaches the Apps Script project. No `clasp push`, no New version, no trigger re-install.

FOLLOW-ON ITEMS:
- D1c's compression of the 74 operator property entries is DEFERRED TO D2 on purpose (see REGRESSION RISKS). D2's method — "rule + trigger + verify pointer" — is the right shape for it; doing it inside a VERBATIM-move batch was not.
- The C4 running-totals ban has three patterns (`expects N`, an arrow running total, the admin-tier size) and missed `test/visual/README`'s "all 44 scenarios" — a plain restated total in a file the ban now scans. Widening it needs care (four large docs, false-positive risk on measurements and date ranges); worth a deliberate pass rather than a line added in passing.
- `counts.mjs --check` should catch its own spawn failure and print "the harness is red — fix that first" instead of letting `execFileSync` throw a 70k-character stack trace. Exit code is already correct.
- INV-202 and INV-203 were PROPOSED by the 2026-09-14 reflection and are not yet written into the Invariant Library. INV-202 is now load-bearing for F1 (which must grow `counts.mjs`'s `Code.js` derivations before F2 splits that file).

DOCUMENTATION UPDATES NEEDED:
- Done in-batch: the Doc map; the `.cycle/` directory inventory now lists `config.md`; README's Documentation table; both test READMEs' cross-links.
- None outstanding. (`/sync-docs` is not needed for this batch — it IS a documentation batch, and its own acceptance criteria were verified above.)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
