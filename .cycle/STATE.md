# Cycle State

## Current
Cycle: 16
Phase: reflect — COMPLETE. Cycle 16 is CLOSED except for the DEPLOY, which is
  an operator action. Block: `.cycle/blocks/16-a-reflect.md`; metrics row
  appended (net 7 = 8 fixes − 1 new failure mode).
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 2 (cycle 15 was the seams audit and
  reset the counter to 0; cycles 15→16 have since completed. Cadence is every 4,
  so the next Seams audit is due after cycle 18)
Updated: 2026-08-03

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
- **Batch 2 + Batch 3 (F10, F11, the fixture mirror, F6, F7, F8) are
  IMPLEMENTED** in a third session. Block:
  `.cycle/blocks/16-batch2-batch3-broad-implement.md`. Pure 403→407, DOM 69,
  visual 29/29 (0 missing, 0 overflow). **Every finding from the cycle-16 scan
  is now implemented.**
- `/sync-docs` HAS now run for ALL THREE sessions. (A line here previously said
  it was outstanding for Batch 4 / F9 — that was wrong; commit `419d4c1` covered
  F1–F5 and the Batch-4/F9 pass had already landed. Verified by grep, not by
  memory.) The Batch 2 / Batch 3 pass applied nine edits: the INV-175 history
  rewrite + its Subsystem widened to "all view partials", the empty-state class
  set restated as a CONVENTION rather than a list, the running test count
  403 → 407 with the two-pins-failed-first lesson, INV-181 (F7 mirror + F11
  assertion), INV-185 (`cnNoteCoverage_` + derived copied set), INV-183 (the
  `DR.STATUS` third column, flagged PARTIALLY closed), a new Common Gotchas
  entry for the unknown-duration class, INV-83 + S54 for the `uiPrompt` a11y
  contract, a new **S74** covering Dept Requests end to end, and the operator
  entry extended with the two Batch-2/3 behaviour changes.

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
- F10 | kb(10) cn(4) tc/manager(4) tc/clock(3) coaching(4) intake(2) deptreq(1) = 28 sites | Load failures now render `errorStateHtml_` instead of the tool's designed empty state; every converted site DROPS the outer `esc()` (the helper escapes internally).
- F10 (tripwire) | test/client/run.js | A12 GENERALIZED — file set from `A11Y_SCAN_PARTIALS`, class set derived from the markup by naming convention (`-empty` / `no-data`). Plus a companion double-escape pin. `A11Y_SCAN_PARTIALS` moved above A12 (TDZ, not a hoist).
- F11 | Tests.js | Replaced `_assertTrue(true, 'Ungrouped sorted last')` with a real index assertion and removed the `if (salesGroup)` guard that skipped the mapping check in exactly the failing case.
- mirror | test/visual/mock.js | Verbatim `cnNoteCoverage_` inside the DO-NOT-EDIT region (INV-185); the F4 pin now DERIVES the copied set from that region instead of naming one function.
- F6 | script_core.html | `uiPrompt` input gains `aria-labelledby` + `aria-describedby`; `.ui-dialog-err` gains `role="alert"` so a validator rejection is announced.
- F7 | metrics/script_metrics.html | `M_QUEUE_UNGROUPED` named, used in both lookup and hint, pinned against the server constant, added to `MIRROR_INDEX`.
- F8 | Code.js `getDeptRequests` | `DR.STATUS` normalized ONCE (the raw-vs-normalized split was the INV-167/183 whitespace class on a third column); a resolved row with no usable `ResolvedAt` now yields `null` elapsed instead of an ever-growing age that compounds into dept avg/median.
- Tests | 3 new Batch-3 pins, ALL bite-checked (revert each → exactly its own pin fails).

## Pending / not yet done
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
- **NEW (post-reflection, from the F9 operator check): the Offerings catalog has
  no way to DISABLE a row.** The operator's column-C scan returned exactly one
  malformed row — sheet row 23 / `E1161`, capacity blank — which they identify
  as a scratch/exception entry, not a real product. But
  `intakeFilterRecommendations_` skips a row ONLY when column B (HCPCS) is empty
  (`hcpcsNum === 0 → return false`), so a scratch row carrying an HCPCS is a
  live catalog member: pre-F9 its blank capacity passed the weight gate for
  every patient, and post-F9 it is STILL eligible whenever **Q38 weight is
  blank**, because the fix guards with `if (patient.weight > 0)`. The inert
  state (empty column B) is documented nowhere as the mechanism. **Operator fix
  for row 23: delete it, or clear B23.**
- **NEW (same check): the engine's HCPCS numeric ladder only holds for
  K-codes.** `hcpcsNum = parseInt(hcpcs.replace(/\D/g,''), 10)` maps
  `K0821`–`K0864` to 821–864, and `isGroup3 = hcpcsNum >= 848` encodes exactly
  that range. An **E-code lands above the cutoff by arithmetic accident** —
  `E1161` → 1161 → silently classified Group 3. Nothing in the code says the
  ladder assumes a K-code, so any E-code added later inherits it. NOT fixed:
  the right shape (reject non-K rows? add a real category column?) is an
  operator/clinical decision, not a code call.
- **NEW (Batch 3): three raw `DR.STATUS` comparisons remain** outside
  `getDeptRequests`, deliberately out of F8's scope — `Code.js:12099`
  `drFindOpenRequest_`, `:12135` `markDeptRequestResolved_`, `:12413`
  `deptRequestsOverdueOpen_`. A padded cell there means a re-send opens a
  DUPLICATE request (INV-131) and a resolved request nags in the SLA digest
  forever. The right fix is a `drStatus_(row)` predicate + a tripwire banning
  the raw read (the INV-167 shape), not three inline trims.
- **NEW (Batch 3): Dept Requests has NO Regression Scenario at any subsystem.**
  F8 changed it and there was nothing to walk.
- **NEW (Batch 2): error states are unshot by the visual harness** — every
  scenario fixtures the success path, so the 28 newly-converted surfaces have no
  screenshot, and `errorStateHtml_`'s fit in the 400px KB drawer / narrow tree
  column is unverified. A `*-error` variant driving `run.reject` is the natural
  next extension of Batch 4.
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
Cycle 16 has now had THREE implementation sessions: F1–F5, then Batch 4 + F9,
then Batch 2 + Batch 3. **Every finding from the cycle-16 scan is implemented.**
All green and bite-checked: pure **407**, DOM 69, visual 29/29 (0 missing
fixtures, 0 horizontal overflow), `node --check` clean. Nothing is half-finished.

**Next, in value order:**
1. ~~Operator: check Offerings column C~~ — **DONE.** One malformed row (23 /
   `E1161`, capacity blank), which the operator identifies as a scratch entry.
   F9's REASON changed (no real chair was mis-recommended); its score did not.
   Two follow-ons logged below. **Operator still to do: delete row 23 or clear
   B23** — until then a non-product stays eligible for blank-weight intakes.
2. ~~Deploy~~ — **DONE.** Merged as PR #152 (squash `17c8d6e`), deployed, and
   `runAllTests()` returned **286 passed / 0 failed / 0 skipped** — so S1/S2 and
   F11's corrected assertion have now genuinely executed. This also cleared the
   cycles-11–15 deploy backlog that had gated the previous three cycles.
3. ~~`/sync-docs`~~ — **DONE for all three sessions.** Nothing owed.
4. ~~`/reflect`~~ — **DONE.** Net 7 (8 production fixes − 1 new failure mode);
   it CORRECTED the Batch-4/F9 self-report DOWNWARD (that block claimed 0 new
   failure modes for the fail-closed weight filter; a chair silently vanishing
   behind a pull-based detector is one, Low/fail-safe). INV-187/188 proposed.
   The next cycle opens by moving this whole block into `HISTORY.md`.
   **INV-187/188 are now ADOPTED into the library** (a `/sync-docs` pass caught
   that they had been proposed and not written — the exact accumulation failure
   cycle 15 cleared for INV-181/182; do not let a cycle close on "proposed"),
   and INV-179 gained the coverage limit amendment. `PROJECT_HEALTH.md` Current
   Standing + Score History now carry cycle 16.
5. **Everything below this line is the residue cycle 16 deliberately left.** It should decide the invariant the F1–F5 block
   proposed (a surface aggregating a best-effort read must carry the outcome,
   and any judgement drawn from it suppressed when degraded) — three cycles have
   now fixed instances of that class one at a time — and consider a second on
   the tripwire-generalization theme (see below).

Three things worth carrying:
- **The cycle's theme is now COMPLETE and it is the cycle's finding.** Two
  independent tripwires (A2, A12) each named the right rule and then scanned a
  fixed list of past fixes. Generalizing A2 immediately surfaced a fifth
  candidate; generalizing A12 surfaced 28 violations across six partials — one
  of them using a class the tripwire already knew, in a file it did not scan.
  That is INV-179 twice in one cycle, and it argues the rule should be applied
  PROACTIVELY to the remaining hand-listed scans rather than one per audit.
- **A limit of that rule, worth stating before the next generalization:** the
  clipped Training heading Batch 4 found is A2-FAMILY but no derivation from
  `:root[data-compact]` will ever reach it, because that file has no compact
  override to derive from. A derived scan is only as wide as the thing it
  derives from.
- **Two pins failed their first write this session, both tripping on the
  code's own explanatory comments or the wrong occurrence of a string.** Strip
  comments before scanning a function that documents what it removed — the CDR
  health-card pin already learned this, and F8's pin re-learned it.
