---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the four FOLLOW-ON ITEMS recorded in Batch D1's block, plus Batch D2 of the post-cycle-19 next-steps plan.
  FO-1 | D1c's deferred compression of the 74 operator property entries (folded into D2, using D2's method)
  FO-2 | The C4 running-totals ban missed a plain restated total ("all 44 scenarios")
  FO-3 | `counts.mjs --check` printed a 70k-character stack trace when the harness was red
  FO-4 | INV-202 and INV-203 were proposed by the 2026-09-14 reflection and never written into the library
  D2a  | Common Gotchas (2,124 lines) -> a rule index; narratives to docs/gotchas.md
  D2b  | Projects (534 lines) -> a module MAP table; narratives to docs/modules.md
  D2c  | The Test Command narrative (1,065 lines) -> docs/test-harness-log.md
  D2d  | A one-sided CLAUDE.md line ceiling

Files modified: CLAUDE.md, README.md, .cycle/config.md, .cycle/STATE.md, scripts/counts.mjs, test/client/run.js, test/client/README.md, docs/gotchas.md (new), docs/modules.md (new), docs/operator-state.md (new), docs/test-harness-log.md (new)
Estimate: L (~7 h) — recorded in STATE.md 2026-09-14 17:05Z BEFORE the first edit (D2 is M/~6 h in the plan; the four follow-ons add ~1 h)
Actual: ~3 h

CHANGES:
FO-4 | .cycle/config.md | INV-202 (a derived count that reads a source file BY PATH is coupled to that file's layout — the repoint belongs in the moving commit, and the derivations are enumerable, so it is mechanical rather than remembered) and INV-203 (an obligation that is REMEMBERED drifts; derive it, or expect it missing). Both were APPLIED by Batch D1 before they existed as entries. INV-203's Verify pointer says the scan is NOT YET BUILT and names why the boundary is the hard part — a verify field that promises a check that does not exist is the drift this invariant is about.
FO-3 | scripts/counts.mjs | A red harness exits non-zero, so `execFileSync` threw BEFORE the "reported N failing" check could run — and its Error carried the child's whole stdout, so the operator got ~70k characters plus a stack trace for a one-line fact. The spawn is caught, the summary is read out of the captured output, and a new `CountsError` prints ONE line and exits 1. An unexpected throw still gets its full trace — a bug here should be loud, a red harness should not. Measured: 164 bytes, exit 1.
FO-2 | test/client/run.js | C4 gains pattern (d): a plain number in front of a noun the block counts. The noun list is narrow on purpose, and `triggers` is the instructive exclusion — the docs legitimately state the Apps Script QUOTA, a platform constant sharing the noun with a derived count. A wider `(?:\w+ ){0,2}` qualifier slop was rejected by probing: it matched "646** and two DOM tests", a DELTA sentence, which is exactly what the ban asks authors to write instead.
D2c | .cycle/config.md, docs/test-harness-log.md, test/client/README.md | 1,061 lines of narrative moved VERBATIM (diff-verified byte-identical) out of the Test Command section. config.md keeps `manual` plus a ~30-line summary: the editor suite's posture, a three-row table of the off-platform harnesses, the CI `--check` line, and the two rules that have each cost a cycle. config.md 2,711 -> 1,686.
D2b | CLAUDE.md, docs/modules.md | The seven module narratives moved verbatim behind anchors; CLAUDE.md keeps a 12-line table (tool + its TOOLS key, tabs, store, gate, detail link). Client partials are NOT restated — .cycle/config.md's Subsystems section is the one place that mapping lives.
D2b | test/client/run.js | NEW pin MODULE-MAP: brace-matches the TOOLS object in script_core.html, requires one table row per key with the key named in it, and requires every detail link to resolve to an anchor that exists. This is the fix for a real historical defect — the section opened "Hosts **eight** tools today" beside a hand-maintained list of the same fact, and read "six" for a whole cycle after the Manage module shipped.
D2a | CLAUDE.md, docs/gotchas.md | 113 entries moved verbatim, in the ORIGINAL order so `git log -L` on the old section still reads straight. CLAUDE.md keeps the RULE (the bolded lead, unchanged), a one-line TRIGGER, the pin where the source named one, and a link — GROUPED into 14 families ordered by how often a change lands in one (coercion, timezones, gates, escaping, locks/caches, honest failure, then the module families, CSS, tooling).
D2a | test/client/run.js | NEW pin GOTCHA-INDEX: both directions (no dead link, no orphaned narrative), counts agree, and every index line states a trigger. Its third assertion is D2's stated verify condition — code comments name gotchas by subject ("the [hidden] gotcha", "the CN.DATE_LOCAL gotcha"), so the pin harvests those subjects from the source tree and requires each to still resolve, token-wise since a comment writes shorthand no doc sentence carries verbatim.
FO-1 | CLAUDE.md, docs/operator-state.md | The 74 anchored operator entries moved verbatim (1,632 lines, diff-verified). CLAUDE.md keeps the storage map — the one-screen answer to "which spreadsheet holds what", deliberately NOT sent to a second file — and the inventory, whose 74 links were repointed.
FO-1 | test/client/run.js | NEW pin OPERATOR-INDEX: both directions, plus an assertion that the storage map is still in CLAUDE.md naming all seven store properties.
D2d | test/client/run.js | NEW pin: a one-sided CLAUDE.md line ceiling at 1,000.
D2  | CLAUDE.md, README.md | Doc map + README table follow the split (four new rows each side); the `/sync-docs` routing paragraph now names which file a gotcha, a module change and new operator state each belong in. Two restated totals dropped ("the 137 Key Design Decisions", "the 113 Common Gotchas") — both are pin-derived now, so the sentence was a third copy — and the localStorage rule's "Eighteen … keys total", a restated total spelled in words so no ban would ever see it.

TEST RESULTS: PASSED.
  - `node test/client/run.js` — 814 passed, 0 failed (810 -> 814: MODULE-MAP, GOTCHA-INDEX, OPERATOR-INDEX, the size ceiling).
  - `node test/client/dom/runDom.js` — 113 passed, 0 failed (unchanged).
  - `node scripts/counts.mjs --check` — agrees with the tree (regenerated four times as the harness total moved).
  - 14 mutations bite-checked / 14 bites, plus one deliberate INVERSE check (the Apps Script trigger-quota sentence must NOT trip the new ban — confirmed NO BITE, which is the pass).
  Regression Scenarios walked: S1 (smoke) and S2 (full integration) are the only scenarios whose Subsystem (Test Suite) overlaps a modified file. Both NOT APPLICABLE — they run `Tests.js` inside the Apps Script editor, and this batch modified no file under `web-app/`: not Tests.js, not Code.js, not a partial. Nothing it changed can alter their outcome. No other scenario's subsystem is touched: the batch is documentation plus two Node-harness files.

REGRESSION RISKS:
  - The three new index pins are the risk this batch creates and the mitigation for it: a split index CAN diverge from its entries, and each pin now refuses a merge where it has. All three check BOTH directions, because an orphaned narrative is as bad as a dead link — the index is what a reader scans.
  - The GOTCHA-INDEX pin's third assertion (code-comment subjects still resolve) is the WEAKEST of the four, by construction: it matches on tokens, so a gotcha renamed rather than deleted still passes. It bites when an entry is removed from both documents (verified) and is a backstop, not a guarantee. Stated here rather than left to be discovered.
  - The C4 ban is wider, so a legitimate sentence could trip it. Probed across every live doc before landing (zero hits) and the one known-legitimate shape — the Apps Script trigger quota — was checked as an explicit inverse bite.
  - The compressed gotcha entries are NEW writing over old rules; the trigger line is mine, the RULE is the original bolded lead verbatim. If a trigger is wrong it misleads a skimmer, which is why the narrative is one link away and the pin requires the link.
  - Nothing runtime changed. No `web-app/` file was touched, so there is no deployable surface in this batch.

INVARIANTS AT RISK: None violated; three applied.
  - INV-179 (derive the scan set) — the three new pins derive from the artefact (the TOOLS registry, the anchors, the inventory), not from a hand list; the C4 widening keeps deriving its file set from the Doc map, so the four new docs entered the ban automatically.
  - INV-202 — its first two applications after being written: `counts.mjs`'s `libraryFile()` already followed the Invariant Library into `.cycle/config.md` (D1), and nothing else in it reads a path this batch moved (verified: the `web-app/` reads are untouched).
  - INV-188 (strip comments before a source scan) — not at risk: the new scans read Markdown and a registry literal, not commented source.
  - INV-187 (never present a substitute as data) — honoured in the compressed entries: a Verify clause appears ONLY where the source named a pin. Fabricating 97 of them would have been the exact defect the family named "Honest failure" collects.
NET SCORE: 1 production fix − 0 new failure modes = 1
  (FO-3 is the one behaviour a person experiences: an operator or a CI reader hitting `counts.mjs --check` with a red harness got a 70k-character wall; they now get one line. FO-2 and the three new pins are guards — they prevent a class rather than fix a live defect. D2a/b/c/d + FO-1 are structural: byte-identical moves plus indexes, shipping no deployable code. FO-4 is a record.)

OPERATOR ACTIONS / DEPLOY:
- None. No file under `web-app/` was modified, so there is nothing to push and no New version to cut. | BLOCKS DEPLOY: N
Deploy: N/A — this batch ships no deployable code (the Deploy Command in `.cycle/config.md` applies to `web-app/` changes).

FOLLOW-ON ITEMS:
- INV-203's verify scan is NOT built: every `*-broad-implement.md` written after the convention landed should be asserted to carry both an `Estimate:` and an `Actual:` line. The honest boundary is the hard part — block filenames do not sort chronologically (P, S, Q, C, D1 ran in that order but sort C < D1 < P < Q < S) and a CI checkout has no useful mtimes, so the scan needs a DECLARED grandfather set, the same shape the Doc map uses for the append-only archives. Worth doing; not worth guessing at inside this batch.
- `counts.mjs` has no row for two figures the docs still carry by hand: the number of TOOLS entries and the number of Key Design Decisions. Both are now held by a PIN (MODULE-MAP, and D1's index-vs-anchors pin), which is why neither drifted here — but a `--json` row would let prose cite them the way it cites the rest, and would let the C4 ban cover them.
- The C4 ban's noun list deliberately excludes `triggers` because the Apps Script quota shares the noun with a derived count. If the quota sentence ever moves to a single home, the noun can be added.
- `docs/test-harness-log.md` is a dated LOG that is NOT declared an append-only archive. It passes the ban today; if a future edit trips it, the choice is to rewrite the sentence or to declare the file — decide then, deliberately.
- Batch F1 is next in the plan's sequence, and INV-202 binds it: `scripts/counts.mjs` reads `web-app/Code.js` by hardcoded path in `gatedEndpoints()` and `triggers()`, so F1's scope must grow those derivations through `serverSource()` BEFORE F2 splits Code.js, or the split lands with CI red on a false drift.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — this batch IS the documentation work. The Doc map, the README table and the `/sync-docs` routing paragraph were all updated in place, and every count it touched was regenerated rather than restated.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
