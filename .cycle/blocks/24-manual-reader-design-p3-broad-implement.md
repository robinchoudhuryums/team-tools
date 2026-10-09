---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design Phase 3 (operator 2026-10-09: "still open items, Phase 3") — M9 chapter masthead + skeleton loading, M11 previous / next chapter cards; Phase 2's two open items: the reader bar at narrow widths, and the white-on-accent buttons outside the reader (the app-wide sweep found six, not two)
Files modified: web-app/kb/script_kb.html, web-app/metrics/script_metrics.html, web-app/qa/script_qa.html, web-app/train/script_coaching.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, docs/operator-log.md, .cycle/manual-reader-design-plan.md, .cycle/STATE.md, CLAUDE.md (counts block)
Estimate: M (~5 h) — written in STATE.md before the first edit
Actual: ~3 h

CHANGES:
Open item 1 | web-app/kb/script_kb.html | inside the bar's narrow container query (≤560px) ‹ › show only their chevrons (the separator goes too); each keeps its name as title + aria-label — at 390px the section title went from ~45px to 137px
Open item 2 | metrics, qa, coaching, cn (×3) | six filled-accent rules read var(--paper-card), not #fff/white: .m-scope-btn.on, .qa-btn.prime, .coach-primary, .cn-filter-chip.cn-fc-training[aria-pressed=true], .cn-nr-save, .cn-mgr-reply-save:hover; MRD-3 sweeps every web-app/ HTML file (CSS blocks and inline styles)
M9 | web-app/kb/script_kb.html | kbManualMastheadHtml_ — kicker ("Procedures manual · Chapter 05"), the badge at 44px, the short name, a meta line (section count; kbManualPaintMeta_ fills "N updated in the last M months" — M derived from KB_MANUAL_UPDATED_DAYS — and the version line, moved here), "In this chapter" (two columns, one when the reader is narrow; each row opens by kbOpenItem_; Updated pill, or Draft); replaces the old .kb-man-head (its two CSS rules removed); ONE renderer for the skeleton and the painted chapter
M9 loading | web-app/kb/script_kb.html | kbManualSkeletonHtml_ replaces the full-panel loSweep for an uncached chapter: the bar (target named, buttons hidden until the chapter lands), the masthead from the tree, the target heading and the app's .skel lines (aria-busy) — no section element, so no focus/open/comments/spy/Print run on it; kbManualLoadFail_ keeps the masthead and puts errorStateHtml_ where the bodies were (all three failure paths); the meta now paints the skeleton too
M11 | web-app/kb/script_kb.html | kbManualPaintChapNav_ — after the last section, "Previous · Chapter NN" / "Next · Chapter NN" cards (badge in the chapter's colour; Next always in the right column), opening the neighbouring chapter's first section from the bar's one chapter list (kbManualDepts_); one column when narrow
Tests | run.js, runDom.js | MRD-3 (pure: the app-wide sweep, non-vacuous; the narrow nav; the masthead driven — index, escaping, drafts, one section, appendix, any other department; the skeleton has no section and uses .skel; no loSweep, every failure through kbManualLoadFail_; the derived window; cards from the one list) + MRD-3 DOM (skeleton → meta → chapter under the same masthead, nothing recorded until real; Next card opens Chapter 10; a failure keeps the masthead and clears busy); MP2-4 now reads the masthead. Bite-checked 9 mutations — all BITE

TEST RESULTS: pure 1258/0, DOM 226/0, lint:server clean, counts --check agrees. Visual: focused shots (light/dark 1440, 480 compact, 390 dark) of the skeleton, masthead and chapter end — 0px page and reader overflow, the page never scrolls, no page errors; the reference matrix re-run (see STATE for the result). Regression scenarios: none names the Reference reader (manual Test Command) — NOT APPLICABLE beyond the harnesses above.
REGRESSION RISKS: (1) the old chapter title (.kb-man-head) is gone — anything outside the repo that scraped it would miss it (nothing in the repo does); (2) the masthead's index lengthens a long chapter's top (Chapter 10 has 26 rows in two columns); (3) the skeleton's bar is inert until the chapter lands — a click on its hidden actions is impossible (visibility: hidden).
INVARIANTS AT RISK: None — g141 (the skeleton holds no input), g146 (the failure message is the server's, not rep input), g129 (a failed chapter read is still not cached), A2 (every narrow rule is a container query), T6 (every new class has a rule; the class with none, kb-man-ver, was dropped for its data attribute).
NET SCORE: 1 production fix (six buttons with white text on the accent, unreadable in dark mode, on surfaces reps and managers use daily) − 0 new failure modes = 1; the narrow-bar change is an interface fix to this session's own Phase 2 (not counted); M9 / M11 / skeleton are capabilities.

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + Deploy → Manage deployments → New version (with Phases 1–2 if not yet deployed) | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- Phase 1's callout kicker leaves a stray leading "—" when the source puts the dash OUTSIDE the bold label ("**Note** — If the note reads…", seen in real 5.2.4): kbManualDecorate_ only wraps a dash inside the <strong>; the fix is to fold a leading "— " text node after the label into the hidden separator. Not fixed here (Phase 1 scope).
- White text on other semantic fills (--warn, --good, …) in nine rules (e.g. Call Notes filter chips) — the same dark-mode question for different tokens; outside this plan.
- Phase 4 next: M17 (footnotes + glossary in the popover), M18 (manual search hits).

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference) and docs/design-decisions.md should name the reader bar, masthead and chapter cards — /sync-docs at the end of the design thread.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
