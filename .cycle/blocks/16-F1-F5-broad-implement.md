---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F1 | managerGetShiftStats rendered a failed per-rep Sheet read as "0 notes / 0 flags / 0% coverage" on the manager's end-of-shift performance table
- F2 | Reference `.kb-wrap` gave the article reader 70px at phone width (file had ZERO media queries)
- F3 | The A2 rule had three more live instances (.cnv-trio, .cnv-row, .intk-row) and its tripwire hand-listed three fixes instead of scanning the rule
- F4 | getCoveragePlan swallowed a PTO-read failure and reported full staffing
- F5 | getTeamMetrics computed the TEAM coverage total from a partial note count, which the client then rendered as "Team-wide coverage below 80%"

Files modified:
- web-app/Code.js
- web-app/cn/script_callnotes.html
- web-app/tc/script_manager.html
- web-app/kb/script_kb.html
- web-app/intake/script_intake.html
- test/client/run.js

CHANGES:

F1 | web-app/Code.js, web-app/cn/script_callnotes.html | Server: `managerGetShiftStats`'s per-rep stats object gains `notesUnavailable:false`; the per-rep catch now SETS it instead of only `console.warn`-ing; `noteCoverage` is null (not a percentage of an unknown numerator) when the read failed. Client: new shared `cnStatsUnavailCell_()` renders a warn em dash with a reason tooltip, and all six note-derived columns (Notes / Action / Training / Review / Emails / Median) use it; the sort comparator returns -1 for those columns on an unavailable rep so they cluster with the other unknowns instead of interleaving with genuine zeros.

F2 | web-app/kb/script_kb.html | Added the file's FIRST media query: `@media (max-width: 720px)` stacks `.kb-wrap` to one column and caps `.kb-side` at 45vh so a viewport-tall tree can't push the reader below the fold. The V-9 model is preserved — the height cap stays on the grid ITEMS, never moved to the container.

F3 | web-app/cn/script_callnotes.html, web-app/intake/script_intake.html, test/client/run.js | CSS: `.cnv-trio` goes 2-up at ≤720px and stacks at ≤480px; `.cnv-row`/`.cnv-row.full` narrow to a 96px label at ≤720px and stack at ≤480px; `.intk-row` stacks at ≤560px (the existing 760px query stacks the PPD LAYOUT, which still leaves ~350px per half — 2-up only fails further down). Tripwire: A2 GENERALIZED from three hand-listed fixes to a derived scan over `A11Y_SCAN_PARTIALS` + styles.html, brace-matching every @media block, with two documented carve-outs — `A2_INVERSE_OK` (`.rail-flags` widens 2-up→4-up in the pop-out, the inverse of stacking) and `A2_INTRINSIC` (a base using auto-fill/auto-fit/min()/clamp() already reflows, so `.m-kpi-grid` needs no breakpoint).

F4 | web-app/Code.js, web-app/tc/script_manager.html | Server: `getCoveragePlan` records `ptoUnavailable` in the PTO catch and returns it (additive — an older client ignores it). Client: `covRender_` renders a `role="alert"` warn banner stating that PTO is not reflected and the bands are an upper bound, and the green "All business hours meet the N-rep minimum" all-clear is downgraded to a neutral warn-toned "No understaffed hours found — but time-off data is missing, so this is not an all-clear."

F5 | web-app/Code.js | `teamTotals.noteCoverage` is null when `teamTotals.noteCountPartial` is set. The client already gated both consumers on non-null, so the "Team-wide coverage below 80%" hint now correctly disappears while the rail row keeps showing the count beside its existing "partial" warning.

TEST RESULTS: passed.
- Pure harness: 396 → **399 passed, 0 failed** (3 new pins: F1 outcome-carrying, F5 team-total null, F4 PTO surfaced).
- DOM harness: **69 passed, 0 failed** (unchanged).
- `node --check` on Code.js / Tests.js / DevTools.js: OK.
- Visual matrix re-shot: **22/22 scenarios, 0 with missing fixtures**; only the pre-existing sandbox `ERR_CONNECTION_RESET`. `reference-light-wide` is pixel-identical to the pre-change shot.
- All new pins BITE-CHECKED by reverting each fix individually (server halves and client halves separately). Two pins failed their first bite-check and were tightened: the F1 column check was anchored on `key: 'x'` and matched the default-sort object instead of the column definition (now anchors on `key: 'x', label:`); the F4 all-clear check used `lastIndexOf` and found the banner's own mention of the flag (now scopes the search to the risk ternary).
- The generalized A2 tripwire immediately surfaced a FIFTH candidate the audit's cruder scan had reported clean — `.m-kpi-grid`. Verified NOT a defect: its base is `repeat(auto-fill, minmax(140px,1fr))`, already viewport-adaptive. Resolved as a rule refinement (`A2_INTRINSIC`), not an allowlist entry, because it is a property of the rule rather than a per-selector exception.

Regression Scenarios (Test Command is `manual`; the Apps Script suite is editor-only and cannot run in this container):
- S62 Reference browse/search/reader — **PASS (by proxy)**: wide render pixel-identical; measured at 390px `.kb-side` 366px / `.kb-main` 366px (was 280 / **70**), no horizontal scroll.
- S64 KB drawer — **PASS (by proxy)**: `#kb-drawer` is `position:fixed` with its own width and is untouched by the `.kb-wrap` query; DOM harness drawer tests green.
- S59 / S60 Intake PPD + PMD/PAP — **PASS (by proxy)**: wide unchanged (388/388), compact pop-out unchanged (1 col), 390px now stacked at 324px with no horizontal scroll.
- S18 / S49 Call Notes submit + manual-copy failover — **PASS (by proxy)**: CSS-only change; field ids, `.ce` structure and the `#cn-frame` copy handler untouched; DOM harness (which exercises optimistic submit/render/escape) green; wide trio unchanged.
- S25 compact pop-out — **PASS (by proxy)**: all three touched grids measured unchanged at 480px compact (`:root[data-compact] .cnv-row` is specificity 0-3-0 and correctly out-specifies the new 0-2-0 media rule — verified by measurement, not assumed).
- S37 End-of-shift Stats tab — **NOT VERIFIABLE HERE**: needs the deployed app AND a genuinely unreadable rep Sheet to exercise the new branch. Covered by the bite-checked F1 pin. **Scenario text needs updating** (see DOCUMENTATION UPDATES).
- S72 Coverage planner — **NOT VERIFIABLE HERE**: same reason. Covered by the bite-checked F4 pin. **Scenario text needs updating.**
- S42 Team Metrics date-range — **NOT VERIFIABLE HERE**: needs a live CDR read plus an unreadable rep Sheet. Covered by the bite-checked F5 pin.
- S1 / S2 smoke + full Apps Script suite — **NOT VERIFIABLE HERE** (editor-only). Scanned for test doubles encoding the old behaviour: `Tests.js:5807` asserts `noteCoverage === 0` but on `getMyMetrics` with a readable fixture Sheet (unaffected); `Tests.js:4808/4828` only assert manager gating. No double required updating.

REGRESSION RISKS:
- `getCoveragePlan` and `getTeamMetrics` response shapes changed, both safely: `ptoUnavailable` is a NEW additive field (older clients ignore it), and `teamTotals.noteCoverage` can now be `null` — both client consumers already guarded on `!= null`, verified by reading and pinned.
- `managerGetShiftStats` reps gain `notesUnavailable`; `noteCoverage` can now be null there too. The only consumer is `cnMgrRenderStats_`, whose coverage column already handled null, and whose sort comparator already mapped null coverage to -1.
- CSS is additive `max-width` queries only, so wide rendering is unchanged by construction; compact geometry was measured rather than reasoned about.
- One side effect I introduced and fixed inside the same breakpoint: stacking `.intk-row` moved the help glyph to the end of a full-width question, and its `left:-10px` / 58vw tooltip then ran ~110px past the row — measured as document scrollWidth 468 vs a 390 viewport, i.e. the whole page scrolled sideways. Right-anchoring the bubble at ≤560px restores 390/390. This was a pre-existing latent tooltip overflow that the stacking exposed; the fix is scoped to the same query so wide and pop-out rendering are untouched.

INVARIANTS AT RISK: None violated; three reinforced.
- **INV-129** (cache only fully-successful rounds / a failed read must be surfaced, never rendered as a confident zero) — this is the invariant all three server fixes extend. No caching behaviour was touched: `managerGetShiftStats` and `getCoveragePlan` have no result cache, and `getTeamMetrics` has none either.
- **INV-175 / errorStateHtml_ posture** — the new coverage banner carries `role="alert"`, matching it.
- **A2 gotcha / INV-179** (derive scan sets, never hand-copy) — the A2 tripwire now derives from `PARSE_GUARD_PARTIALS`, which itself auto-tracks index.html's `include()` calls.
- **V-9** (`.kb-wrap`'s height cap must stay on the grid ITEMS, never the container) — explicitly preserved; the new query sets `grid-template-columns` and an item-level `max-height` only.
- **INV-52** (managerGetShiftStats contract) — extended additively, not changed.

NET SCORE: 5 production fixes − 0 new failure modes = **5**
(F1, F2, F4, F5 are production fixes; F3 is one production fix — the three responsive gaps — plus a structural tripwire generalization. The intake tooltip overflow was introduced and fixed within this session, so it is not a shipped failure mode; it is recorded above because it is the kind of thing that would otherwise have shipped silently.)

OPERATOR ACTIONS / DEPLOY:
- None. No new Script Properties, triggers, migrations, or CONFIG constants. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. (One push ships Code.js and all four HTML partials; `test/client/run.js` is outside `web-app/` and is never pushed.)
Post-deploy: run `runAllTests()` from the editor — the Apps Script suite could not be executed in this container.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **F10 (from the scan, NOT implemented — out of scope):** 28 load-failure sites across six partials render into empty-state containers instead of `errorStateHtml_`, and the A12 tripwire scans 3 of 9 partials. This is the same structural shape as F3 and is the natural next batch.
- **F9 (from the scan, NOT implemented):** the PPD engine treats a blank/malformed Offerings weight-capacity cell as unlimited capacity (`parseInt('')` → NaN → every `>` comparison false). Clinically consequential and clearly out of an F1–F5 scope.
- **F6, F7, F8** from the scan remain unimplemented.
- **New, noticed while verifying F2:** the Reference landing's `.kb-review-row` is cramped at 390px — the item title, "reviewed 120d ago", the note and the Reviewed button overlap. Strictly better than before (that panel was 70px wide), but it is now the narrowest thing on that view. Out of F2's scope, which was the column split.
- **New, noticed while scanning test doubles:** `test/visual/mock.js:161` computes `totals.noteCoverage` inline rather than calling shared logic — the INV-185 class (a fixture paraphrasing server logic). It does not set `noteCountPartial`, so it exercises the unchanged path and did not need updating for F5, but it is the same shape cycle-15 F4 pinned for `groupQueueRows_`.

DOCUMENTATION UPDATES NEEDED:
- **CLAUDE.md Common Gotchas — the F5 note-count entry**: it states "Every coverage surface nulls `noteCoverage` and sets `noteCountUnavailable`/`noteCountPartial`". That was not true of `managerGetShiftStats` (which counts inline) or of `getTeamMetrics`'s TEAM total; both now comply, and the entry should name them so the next reader knows the inline-count surface is included.
- **CLAUDE.md Common Gotchas — the A2 entry**: says "Pinned by the A2 tripwire (each compact grid override has a matching media query)". The tripwire only became that this cycle; the entry should record the generalization and the two carve-outs (`A2_INVERSE_OK`, `A2_INTRINSIC`), and note that `kb/script_kb.html` had zero media queries.
- **Regression Scenario S37** — add the unavailable-Sheet case (a rep whose Sheet cannot be read shows "—" across the note-derived columns, never 0).
- **Regression Scenario S72** — add the `ptoUnavailable` banner and the downgraded all-clear.
- **INV-52** (managerGetShiftStats) and **INV-127** (coverage planner) — both response shapes gained a field; worth a sentence each.
- Consider a new invariant for the class F1/F4/F5 share: *a surface that aggregates a best-effort read must carry the read outcome, and any judgement drawn from it (a percentage, a band, an all-clear) must be suppressed when the outcome is degraded.* Three cycles have now fixed instances of this one at a time.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
