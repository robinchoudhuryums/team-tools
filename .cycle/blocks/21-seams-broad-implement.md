---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: F1 coerced-column nets omitted two columns · F2 an enumerated-reader pin guarded fewer callers than exist · F3 a renumber left two Verify clauses pointing at the wrong scenario · F4 nothing asserted id uniqueness · F5 the Verify-clause ratchet
Files modified: test/client/run.js, test/client/harness.js, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: M (~5 h)
Actual: ~2.5 h — under, because two of the five findings were smaller than the audit reported (see CORRECTIONS)

CHANGES:
F1 | test/client/run.js | `AUDIT.TS` (g11's own column) and `CN.DATE_LOCAL` (g16's, and the most recovery-guarded column in the codebase at 15 sites) joined the two global coerced-column scans. The column set is now declared ONCE — `COERCED_AUDIT_COLS` / `COERCED_CN_COLS` — and both scans build their regexes from it. A new pin runs the DERIVED direction: every column a recovery helper touches must appear in that set. Deriving the guarded set *from* the code would be self-defeating (delete the last `cnDateLocalString_` call and the column leaves the derived set at the same moment the raw read appears), so the set stays explicit and the derivation only ever adds pressure to widen it.
F2 | test/client/run.js, test/client/harness.js | `coachAnalytics_` joined H-1's guarded list — a genuine fifth consumer, unguarded, on the one sampled pin with no global-scan sibling. `serverCallersOf(marker)` added to the harness derives the caller set; H-1 now requires its list to account for all of it, with `automationDetectorChecks_` exempt BY NAME because it is the runtime self-check that drives both parsers on purpose.
F3 | .cycle/config.md | INV-208 and INV-209's "scenario S110" now name S112. S110 has been the Company-Holidays walk since the 2026-09-17 renumber, so both pointers resolved to a real but unrelated scenario and nothing errored.
F4 | test/client/run.js | A pin asserting every `S\d+` and `INV-\d+` id in `.cycle/config.md` is unique, plus the reserved INV-225..227 staying absent while STATE.md names them.
F5 | test/client/run.js | The ratchet: every live invariant from **INV-139** up must name its verification. Accepts the three phrasings already in use (`Verify:`, "Pinned by …", a named tripwire / `test_` function); deliberately-vacant numbers (INV-163/164) are exempt by shape.

TEST RESULTS: passed. Pure 914 → 917, DOM 132 unchanged, lint clean, manifest current (1300), counts block agrees. **Eleven bite-checks, all BITE**, run in a throwaway `git worktree` against committed state:
- F1: raw `AUDIT.TS` read · raw `CN.DATE_LOCAL` read · shrinking the explicit list · a recovery helper on an uncovered column
- F2: an unguarded sixth consumer · dropping `coachAnalytics_` from the list · a guarded consumer switching to the banned parser
- F4: a duplicate scenario id · a duplicate invariant id · reusing a RESERVED number
- F5: an invariant above the floor losing its clause

CORRECTIONS TO THE AUDIT (both in the same direction — it over-reported):
- **F2 was 1 of 6, not 6 of 6.** The audit measured "list shorter than caller set" and called it drift without checking whether each list was *meant* to be exhaustive. Five were not: **F14**'s own comment scopes its list to "the cross-rep walks that had the bug" and its strong half is a complete global scan over every `EMP.CALL_NOTES_SHEET_ID` line; **Turn D** asserts globally that `getShiftSchedule_` has exactly one call site; **A2**'s comment already accounts for `tsPunchDaysWithArchive_` by name; **F5**'s `cnNoteCoverage_` is the helper, not one of the rendering surfaces its contract is about; **Spanish**'s `resolveSpanishThread` uses the map for an idempotency check, not as one of the three readers. Only H-1 was a real gap.
- **F5 was 91 unnamed, not 165.** The audit's scan looked for the literal `Verify:`; 74 invariants name their verification in another phrasing. The 91 are almost entirely the oldest entries — the convention arrived partway through the library and has held since. Consequence: no backfill was needed, and the floor went to INV-139 (85 invariants covered) instead of the planned INV-213 (29).

REGRESSION RISKS: None to production — **no `web-app/` file was modified**. Harness-side: `serverCallersOf` is new and used by one pin; the hoisted column lists are read by exactly the two scans that previously hard-coded them, and both were bite-checked after the change.

INVARIANTS AT RISK: None violated. The batch strengthens the nets behind g11, g16, g65, g116, g126, g137, g138 and INV-142.

NET SCORE: 0 − 0 = 0
(Production fixes: **0**. Every finding was a hole in the safety net; no live defect existed and none was introduced. New failure modes: 0. Capabilities: 0. Defensive/structural: 5.)

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: **N/A — no `web-app/` file changed.** Nothing here ships to the Apps Script project.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- 91 invariants below INV-139 name no verification. Deliberately not backfilled. Lowering the ratchet floor means naming INV-130 and INV-138 first (the only two blockers between INV-130 and the floor).
- The audit's broad sweep flagged 13 marker-contracts as drifted; most are false for the reasons in CORRECTIONS. A future seams round wanting to widen F2's coverage must read each pin's intent — there is no mechanical shortcut.

DOCUMENTATION UPDATES NEEDED:
- `docs/gotchas.md` + the CLAUDE.md index — g11 and g16 gain the fact that their columns were untripwired until now; g116 gains the "a pin's list is only as good as its intent" direction.
- `docs/test-harness-log.md` — the batch, the eleven bites, and both audit corrections.
- `.cycle/config.md` — three invariant candidates: the two-sided net shape, id uniqueness, the ratchet. INV-225/226/227 are reserved and can take them at `/reflect`.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
