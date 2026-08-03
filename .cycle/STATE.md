# Cycle State

## Current
Cycle: 16
Phase: implement (F1–F5, F9 + Batch 4 done; F6/F7/F8/F10/F11 not implemented)
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
- **F1–F5 are IMPLEMENTED.** Block: `.cycle/blocks/16-F1-F5-broad-implement.md`.
  Pure 396→399, DOM 69, visual 22/22.
- **Batch 4 + Batch 1 (F9) are IMPLEMENTED** in a second session. Block:
  `.cycle/blocks/16-batch4-batch1-broad-implement.md`. Pure 399→403, DOM 69,
  visual matrix **22→29 scenarios**, 0 missing fixtures, 0 horizontal overflow.
- `/sync-docs` HAS run for F1–F5 (commit 419d4c1) — it corrected four CLAUDE.md
  claims the code had made false and fixed a pre-existing drift (the running
  test count had stopped at cycle 14). **It has NOT run for Batch 4 / F9** — see
  the block's DOCUMENTATION UPDATES (six items).
- The remaining findings (F6, F7, F8, F10, F11) are NOT implemented.

## Completed this cycle
- F1 | Code.js + cn/script_callnotes.html | `managerGetShiftStats` now carries `notesUnavailable`; coverage is null on a failed read; all six note-derived columns render an em dash instead of 0, and the sort comparator groups them with the other unknowns.
- F2 | kb/script_kb.html | Added the file's FIRST media query — `.kb-wrap` stacks at ≤720px. Measured at 390px: reader 70px → 366px.
- F3 | cn/script_callnotes.html + intake/script_intake.html + test/client/run.js | Breakpoints for `.cnv-trio` / `.cnv-row` / `.intk-row`; the A2 tripwire GENERALIZED from three hand-listed fixes to a derived brace-matched scan with two documented carve-outs.
- F4 | Code.js + tc/script_manager.html | `getCoveragePlan` returns `ptoUnavailable`; the client renders a `role="alert"` banner and the green all-clear is downgraded when the PTO read failed.
- F5 | Code.js | `teamTotals.noteCoverage` is null when the note count is partial, suppressing the client's "Team-wide coverage below 80%" judgement.
- Tests | 3 new pins, ALL bite-checked; 2 of them failed their first bite-check and were tightened (documented in the block).
- Batch 4 | test/visual/shoot.mjs | SEVEN new scenarios (22→29) giving every rep-facing tool a mobile shot and the two mid-task tools a compact one; plus a per-scenario `overflowPx` metric implementing the measurement CLAUDE.md's A2 gotcha already demanded.
- F9 | Code.js | The PPD weight filter fails CLOSED on an unreadable capacity (`parseInt('')` → NaN made `''`/`'n/a'`/`'300-'`/`'-450'` read as UNLIMITED). Well-formed behaviour verified byte-identical across 7 cases.
- F9 companion | Code.js + cn/script_callnotes.html | Pure `intakeCatalogIssues_` validator + an "Intake Offerings catalog" card in Admin → Automation Health, on the SAME opt-in gate as the cycle-14 queue inventory so the 10-min badge and the daily digest never pay for it.
- Tests | 4 new F9 pins, ALL bite-checked individually.

## Pending / not yet done
- **F6, F7, F8, F10, F11 are unimplemented.** In value order:
  - **F10** — 28 load-failure sites across SIX partials render into empty-state
    containers instead of `errorStateHtml_`; the A12 tripwire scans 3 of 9
    partials. Same structural shape as F3, and the largest remaining item.
    **Expect the count to GROW when A12 is generalized** — A2's generalization
    immediately found a fifth instance the hand-derivation had missed, and
    A12's hand-list is narrower.
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
- **NEW, found by Batch 4's first run — Training tab heading CLIPPED at 390px.**
  MEASURED: `.tr-head-title` `scrollWidth 94px` inside `clientWidth 18px` ("My
  Training" renders as "My Trai…"); `.tr-head-sub` 62px inside 18px. The ring +
  title + two KPI tiles sit in a row that never stacks. It is an A2-FAMILY
  instance that the A2 tripwire cannot flag, because the file has no
  `:root[data-compact]` grid override and so falls outside that rule's
  derivation — which is itself worth thinking about before the next tripwire
  generalization. Not fixed (out of both batches' scope).
- **The Admin → Automation Health panel has no visual scenario**, so the new
  F9 catalog card is not shot. Unlike Batch 4's seven, adding it needs a
  fixture (`test/visual/mock.js` stubs `getAutomationHealthBadge`, not
  `getAutomationHealth`).
- **Dark-mode coverage gap:** Reference, Training and Coaching have only
  `-light-` scenarios at any viewport, and dark-mode contrast is a documented
  defect class here (cycle-12 V-2). Batch 4's scope was mobile/compact only.
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
Cycle 16 has now had TWO implementation sessions: F1–F5, then Batch 4 + F9.
Everything is bite-checked and green (pure 403, DOM 69, visual 29/29 with zero
missing fixtures and zero horizontal overflow, `node --check` clean). Nothing is
half-finished.

**Next, in value order:**
1. **Operator, 5 minutes:** open the Offerings sheet and check column C for
   blank/non-numeric cells. That answers whether F9 was LIVE or latent — the one
   thing the net score above is honestly uncertain about. After deploying, the
   new Admin → Automation Health card answers it automatically.
2. **Deploy** (`clasp push -f` + New version), then `runAllTests()` from the
   editor — the Apps Script suite cannot run in the container.
3. **`/sync-docs`** for Batch 4 + F9 — the block lists SIX updates, including a
   brand-new gotcha for the F9 class and an Operator-State note that column C
   now excludes a row rather than being ignored.
4. **Implement F10** (Batch 2) — 28 load-failure sites plus the A12
   generalization, the cycle's structural theme and the largest item left.
5. `/reflect` to close cycle 16. It should also decide the invariant the F1–F5
   block proposed (a surface aggregating a best-effort read must carry the
   outcome, and any judgement drawn from it suppressed when degraded) — three
   cycles have now fixed instances of that class one at a time.

Two things worth carrying:
- **The cycle's theme holds and is half-done.** Two independent tripwires (A2,
  A12) name the right rule and then scan a fixed list of past fixes. A2 is
  generalized; A12 is F10 and still open.
- **Batch 4 paid for itself on its first run** — the new mobile scenarios
  immediately surfaced a clipped Training heading (measured 94px of text in an
  18px box) that four interface-focused sessions had never seen. That instance
  also shows a LIMIT of the A2 rule: it has no compact override, so no
  derivation from `:root[data-compact]` will ever find it. Worth weighing when
  generalizing A12.
