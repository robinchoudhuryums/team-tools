# Cycle State

## Current
Cycle: 16
Phase: implement (F1–F5 done; F6–F11 selected-but-not-implemented)
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 1 (cycle 16 is a subsystem/broad cycle;
  cycle 15 was the seams audit and reset the counter to 0)
Updated: 2026-07-31

## In progress (facts to carry forward — NOT judgments)
- Cycle 15 is CLOSED and its block was archived to `.cycle/HISTORY.md` when this
  cycle opened. **The operator confirmed the deploy is DONE** — the cycles-11–15
  backlog that gated the last two sessions is cleared.
- Cycle 16's scan found **0 Critical / 0 High / 6 Medium / 5 Low** across two
  stages, plus the mandated visual stage (22/22 scenarios, all fixtures present).
- **F1–F5 are IMPLEMENTED** in this session. Block:
  `.cycle/blocks/16-F1-F5-broad-implement.md`. Pure harness 396→399, DOM 69,
  visual matrix re-shot 22/22 with `reference-light-wide` pixel-identical.
- The scan's remaining findings (F6–F11) are NOT implemented — see Pending.

## Completed this cycle
- F1 | Code.js + cn/script_callnotes.html | `managerGetShiftStats` now carries `notesUnavailable`; coverage is null on a failed read; all six note-derived columns render an em dash instead of 0, and the sort comparator groups them with the other unknowns.
- F2 | kb/script_kb.html | Added the file's FIRST media query — `.kb-wrap` stacks at ≤720px. Measured at 390px: reader 70px → 366px.
- F3 | cn/script_callnotes.html + intake/script_intake.html + test/client/run.js | Breakpoints for `.cnv-trio` / `.cnv-row` / `.intk-row`; the A2 tripwire GENERALIZED from three hand-listed fixes to a derived brace-matched scan with two documented carve-outs.
- F4 | Code.js + tc/script_manager.html | `getCoveragePlan` returns `ptoUnavailable`; the client renders a `role="alert"` banner and the green all-clear is downgraded when the PTO read failed.
- F5 | Code.js | `teamTotals.noteCoverage` is null when the note count is partial, suppressing the client's "Team-wide coverage below 80%" judgement.
- Tests | 3 new pins, ALL bite-checked; 2 of them failed their first bite-check and were tightened (documented in the block).

## Pending / not yet done
- **F6–F11 from the cycle-16 scan are unimplemented.** In rough value order:
  - **F10** — 28 load-failure sites across SIX partials render into empty-state
    containers instead of `errorStateHtml_`; the A12 tripwire scans 3 of 9
    partials. Same structural shape as F3, and the natural next batch.
  - **F9** — the PPD engine treats a blank/malformed Offerings weight-capacity
    cell as UNLIMITED (`parseInt('')` → NaN → every `>` comparison false), so a
    chair can be recommended regardless of patient weight. Clinically
    consequential; reproduced against the exact branch.
  - **F6** — `uiPrompt`'s input has no accessible name and its validation error
    has no `role="alert"`.
  - **F7** — `'Ungrouped'` hardcoded in `metrics/script_metrics.html:1267`,
    mirroring `CDR_QUEUE_UNGROUPED` with no pin (the visual FIXTURE is pinned;
    the shipping client is not).
  - **F8** — a `resolved` DeptRequest with an unparseable ResolvedAt reports its
    full age as resolution time, inflating dept avg/median forever; plus a raw
    vs normalized status compare in the same function.
  - **F11** — `Tests.js:5936` `_assertTrue(true, 'Ungrouped sorted last')` inside
    the condition that IS the assertion; cannot fail. The cycle-8 M-14 class
    returning. Low risk only because the pure harness pins the rule properly.
- **DEPLOY of THIS cycle's changes** (the cycles-11–15 deploy is done):
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → New version
  3. Run `runAllTests()` from the editor — it could not run in the container.
- Operator one-liner (cycle-15 F2, still open): read the col-4 header off the DQE
  tab and add `4: '<that text>',` to `CDR_EXPECTED_HEADERS`. Deliberately NOT
  guessed — a wrong guess flips the CDR health card amber.
- CARRIED (cycle-13 A5), DEV PROJECT ONLY: set `INSTANCE_IS_PROD=false`.

## Open follow-on items
- `.cycle/HISTORY.md` has no block for **cycle 14** — it jumps 15 → 13. Cycle
  14's reflect block IS on disk (`.cycle/blocks/14-a-reflect.md`), so nothing is
  lost, but the archive is not contiguous. Left alone deliberately rather than
  silently reconstructing history.
- `test/visual/mock.js:161` computes `totals.noteCoverage` inline instead of
  calling shared logic — the INV-185 class (a fixture paraphrasing server logic),
  the same shape cycle-15 F4 pinned for `groupQueueRows_`. It exercises the
  unchanged path so F5 did not require touching it.
- Reference landing's `.kb-review-row` is cramped at 390px (title / "reviewed
  120d ago" / note / button overlap). Strictly better than the 70px panel it
  replaced; outside F2's scope, which was the column split.
- The visual matrix still has NO mobile or compact scenario for Reference,
  Intake, Team Metrics or Training — which is why F2 survived two
  interface-focused cycles. Adding them is the cheapest increase in the lens's
  reach.
- Carried, unchanged: write-only enum members have no deliberate/forgotten
  marker; a roster walk that omits the inclusion check entirely is caught only by
  review; no Admin editor for `CDR_QUEUE_GROUPS`; FO-6 remaining
  TimesheetArchive readers.

## Decisions made (so the next session doesn't re-litigate)
- **`.m-kpi-grid` is NOT an A2 defect.** The generalized tripwire flagged it; its
  base is `repeat(auto-fill, minmax(140px,1fr))`, which already reflows, so its
  compact override exists only to PIN 3 columns in the pop-out. Resolved as a
  RULE refinement (`A2_INTRINSIC`), not an allowlist entry, because it is a
  property of the rule rather than a per-selector exception.
- **`.rail-flags` is NOT an A2 defect either** — compact widens it 2-up → 4-up
  (denser icon rail), the inverse of stacking. Allowlisted WITH that reason in
  `A2_INVERSE_OK` rather than silently skipped.
- The intake help-tooltip right-anchor at ≤560px is scoped to that breakpoint on
  purpose: it fixes a PRE-EXISTING latent overflow that stacking exposed
  (measured document scrollWidth 468 vs a 390 viewport), and scoping keeps wide
  and pop-out rendering byte-identical.
- F1's fix carries the outcome on the stats object rather than routing
  `managerGetShiftStats` through `cnCountNotesResult_`: that function needs
  flags, emails and the median from the same read, so a count-only helper cannot
  serve it. This is why the cycle-12 F5 sweep missed it.
- Compact geometry was VERIFIED BY MEASUREMENT, not by reasoning about
  specificity — `:root[data-compact] .cnv-row` is 0-3-0 and correctly
  out-specifies the new 0-2-0 media rules.

## Where I left off
Cycle 16's F1–F5 are implemented, bite-checked and green (pure 399, DOM 69,
visual 22/22, `node --check` clean). Nothing is half-finished; the working tree
has six modified files and no strays.

**Next, in value order:**
1. **Deploy this cycle** (`clasp push -f` + New version), then `runAllTests()`
   from the editor — the Apps Script suite cannot run in the container.
2. **Implement F10 then F9.** F10 is the same structural shape as F3 (a tripwire
   enumerating known fixes instead of scanning its rule) and has 28 live
   instances; F9 is the clinically consequential one.
3. `/reflect` to close cycle 16, then `/sync-docs` — the block lists five
   documentation updates, including two CLAUDE.md gotchas whose text is now
   outdated by these fixes (the F5 note-count entry and the A2 entry).

The cycle's theme, worth carrying: **two independent tripwires (A2, A12) name
the right rule and then scan a fixed list of past fixes.** A2 is fixed; A12 is
F10 and still open. Auditing the tripwires against their own stated rules is
currently higher-yield than auditing the code.
