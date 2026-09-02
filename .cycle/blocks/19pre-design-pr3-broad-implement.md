# 19pre — design handoff PR 3 (Manage surface) — broad-implement block

Scope: docs/design_handoff_five_surfaces/IMPLEMENTATION_PLAN.md §4 PR 3 (M1–M8).
Written 2026-09-02 on branch claude/ums-team-tools-design-r8ar3o.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- M1 | Manage Time regrouped — Needs you (tone-carded Pending Time Off + Missed Clock-Outs, adjustment queue, Live Status, Team Punches) then Periodic collapsed (Export, PTO reconciliation, sheet doctor, Recent Punches, Recent Activity) behind a real aria-expanded disclosure; `.mgr-group[hidden]` companion rule
- M2 | Periodic summary row fed by the lazy cards themselves — all clear / drift / "check failed" (a failed scan never reads as clear)
- M3 | Coverage on the shared `mtDateRange_` with FORWARD presets (This week / Next week / Next 2 weeks); `cov-controls` + `toneCol` retired
- M4 | Punctuality on the shared `mtDateRange_` with BACKWARD presets (7d / 30d / QTR); `.punct-*` hand-rolled table/card/bar/preset rules retired
- M5 | `getPunctualityReport`: `PUNCT_MAX_RANGE_DAYS` cap (92), prior-range comparison, per-rep `worstDate`/`weekly`/`dayDetail` (pure `punctDayState_` + `punctWeeklyBuckets_`), approved-PTO overlay best-effort with `ptoUnavailable` — all additive beside `days`
- M6 | Punctuality client: summary strip with delta vs prior range + worst rep/date; Outliers panel rendered ONLY when `punctOutliers_` finds one; `mtRenderTable_` with real sort + expandable per-rep detail (day strip with summarising aria-label, weekly trend chip, Coach-on-this)
- M7 | Coach-on-this hand-off via `window.COACH_PREFILL` + `enterTool('develop','coaching')` (C8); the Coaching composer prefills its `what` textarea
- M8 | Visual fixtures (verbatim pure-helper mirrors; `getPunctualityReport` + `getCoveragePlan` as FUNCTIONS of the range) + 6 scenarios; `coverage` left the VISUAL-GAP-TABS marker
- (measured) | Shared `.app-bar` gains a ≤540px breakpoint — the right-hand control stacks under the title on a phone

Files modified: web-app/Code.js, web-app/tc/script_manager.html, web-app/train/script_coaching.html, web-app/styles_design_tokens.html, test/visual/mock.js, test/visual/shoot.mjs, test/client/run.js, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/19pre-design-pr3-broad-implement.md

CHANGES:
M1/M2 | web-app/tc/script_manager.html | renderManagerView template regrouped; `MGR_STATE` (session-only), `mgrToggleGroup_`, `mgrSetSummary_`, `mgrOldestPendingDays_`; loadPtoReconciliation_/loadSheetDoctor_ feed the summary on clean/drift/failure; `.mgr-*` CSS + `[hidden]` companion
M3 | web-app/tc/script_manager.html | `COV_STATE`/`COV_PRESETS`/`covActivePreset_`/`covPreset_`/`covToggleCustom_`; enterCoverageView on the shared control with the `Manage › Coverage` app-bar; D5 midnight re-anchor of the default only
M4/M6 | web-app/tc/script_manager.html | `PUNCT_STATE`/`PUNCT_PRESETS`; enterPunctualityView app-bar + control; `punctLoad_` (seq-guarded), `punctOutliers_`, `punctTrend_`, `punctTrendChip_`, `punctCoach_`, `punctSort_`, `punctDetailHtml_`, `punctRender_`; `.pt-*` CSS with the ≤720px breakpoint
M5 | web-app/Code.js | `CONFIG.PUNCT_MAX_RANGE_DAYS`; pure `punctDayState_` (ontime/late/off/holiday/nopunch/null) + `punctWeeklyBuckets_`; getPunctualityReport rewritten (cap, prev range in the same scan, dayDetail/weekly/worstDate, PTO overlay best-effort, holidays)
M7 | web-app/train/script_coaching.html | `coach-what` textarea prefills from `COACH_PREFILL.what`
M8 | test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md | mirrored helpers in the DO-NOT-EDIT region; range-driven fixtures; scenarios punctuality-{dark-wide,light-mobile,expanded-light-wide} + coverage-{light-wide,dark-wide,light-mobile}; marker updated
measured | web-app/styles_design_tokens.html | `@media (max-width: 540px) { .app-bar { flex-wrap: wrap } .app-bar-right { flex-basis: 100% } }`
pins | test/client/run.js | PR3-1..PR3-5 + the rewritten width pin; the cap pin tightened to the live guard SHAPE after `if (false && …)` survived the presence form

TEST RESULTS: pure 727/0 (was 722; +5 pins), DOM 101/0, `node --check` on both partials OK. 9 mutations / 9 bites (drop `nopunch`; drop the cap — no-bite on first form, pin tightened, bites; outlier threshold; wrong coaching tool key — also caught by the enterTool registry net; a third `return true` in `mgrSwrRenderBlocked_`; `.punct-table` re-added; a scenario dropped; a coverage fixture key renamed; the app-bar breakpoint removed). Visual: 10 scenarios shot (manage ×3, punctuality ×4, coverage ×3) — all `missing: []`, `overflowPx: 0`, eyeballed light/dark/mobile/expanded; one measured defect (the app-bar subtitle squeeze) fixed + re-shot + intake-light-mobile re-shot for regression (none). Editor suite: NOT run (no runtime off-editor) — `runAllTests()` still expects 305; scenarios S72 (Coverage), S98 (new) walked against the matrix: PASS on the rendered halves, the server halves rest on PR3-1 + the omnibus gate case.

REGRESSION RISKS:
- `getPunctualityReport` response is additive (`days` unchanged; new fields client-guarded) — an older client renders as before. The new 92-day cap REJECTS a hand-typed range that used to succeed (deliberate, named error).
- Coverage/Punctuality default ranges are unchanged; the manual custom row is unchanged in shape.
- The shared `.app-bar` breakpoint affects EVERY app-bar consumer at ≤540px (Intake verified on camera; Manage Time's Refresh button now sits under the title on a phone — intended).
- `mgrSwrRenderBlocked_` untouched (exactly two reasons) — a background refresh re-folds Periodic, which is the documented session-only decision.

INVARIANTS AT RISK: INV-127 (Coverage — control only; planner logic untouched), INV-173/174 (new disclosure + presets are real buttons with aria state — pinned), INV-175/187 (summary "check failed" path; `ptoUnavailable` named; outliers panel renders nothing rather than an empty panel), INV-184 (retired selectors banned), INV-185 (fixtures mirror server literals — derived), F6 (oldest-pending days in roster tz), D5 (default-range-only midnight re-anchor). None violated.
NET SCORE: 2 − 0 = 2 (production fixes: the Punctuality range cap — the one uncapped manager range read — and the app-bar phone squeeze; the rest is interface/capability work scored per the R18 rule as capability, not fixes).

OPERATOR ACTIONS / DEPLOY:
- None | BLOCKS DEPLOY: N (one CONFIG constant, no Script Property/trigger/migration)
Deploy: Server + Client (Time Clock views) + Client (shell) + Client (Training views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy. Test Suite: same push; `runAllTests()` expects 305.

FOLLOW-ON ITEMS:
- The handoff's Export button in the Punctuality app-bar (not in M1–M8) — not built.
- `dayDetail` carries a fifth state `nopunch` the handoff's four-state list lacked (INV-187) — recorded as a doc conflict resolved in the codebase's favour.
- Periodic panels are not lazy-loaded behind the toggle (plan M5 decision) — a lazy variant is possible if the Manage Time load time is ever reported.
- Collapse state is session-only by decision; a per-browser preference would be a localStorage key (count 16 → 17) if ever asked for.

DOCUMENTATION UPDATES NEEDED:
- Done in this session: CLAUDE.md Manage Time KDD, Punctuality + Coverage operator entries, mtDateRange_ entry, count chain (727 / matrix 78 / app-bar note), operator-state entry for PR 3, S98, VISUAL-GAP-TABS marker.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
