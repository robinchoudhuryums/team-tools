---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design Phase 2 (operator 2026-10-09: "Include the styles.html fix, then /broad-implement Phase 2") — M8 reader bar + scroll-spy, M10 tree rows, the styles.html white-on-accent fix; plus reader-only scrolling (found by measurement, required for M8)
Files modified: web-app/kb/script_kb.html, web-app/styles.html, test/client/run.js, test/client/dom/runDom.js, docs/operator-log.md, .cycle/manual-reader-design-plan.md, .cycle/STATE.md, CLAUDE.md (counts block)
Estimate: M (~4 h) — written in STATE.md before the first edit
Actual: ~3 h

CHANGES:
styles fix | web-app/styles.html | .toast-act (the deploy toast's Reload) reads var(--paper-card) on --accent, not #fff; the print-block comment names kbPrintSectionById_
M8 | web-app/kb/script_kb.html | one sticky band (.kb-man-top: the Back row above the reader bar, top/margin = minus .kb-main's padding, g162) with scroll-padding-top so a target lands below it; the bar names the chapter (short name; badge in --man-c) and the section in view (chip + title) and carries Bookmark, Print (kbPrintSectionById_, replacing kbPrintSection_) and ‹ › (section, then the neighbouring chapter's first section — "Ch 06" / "App C"); the per-section star/Print are gone (an admin's Publish stays on its draft); the spy is ONE rAF-throttled scroll listener bound once per reader (kbManualSpyBind_/kbManualSpy_, pick by kbManualSpyPick_), not an IntersectionObserver — it marks the tree row (kept in view by the tree's scrollTop) and never records an open or moves the comments; a smooth explicit open holds it 800 ms; a container query drops the chapter name below 560px
M8 (measured) | web-app/kb/script_kb.html | kbReaderScroll_ scrolls #kb-main only — scrollIntoView also scrolled the app's page (136px before Phase 2, 196px with the band), hiding the bar under the shell's tab strip; kbManualFocus_ and kbFlashBlock_ use it; an element outside the reader (the drawer) keeps scrollIntoView
M10 | web-app/kb/script_kb.html | a manual chapter toggle reads "05 Power Mobility" (full name in data-dept + tooltip; .kb-dept[data-chap] carries the chapter colour); a manual row is a number column + title (kbManualSplitTitle_, shared with the heading chip); kbManualTreeUpd_ dots a row updated inside KB_MANUAL_UPDATED_DAYS (the Updated badge's own window), dated in its tooltip; the tree asks for the meta once a session so the dots show before a chapter opens
Tests | run.js, runDom.js | MRD-2 (pure, driven: the title split, chapter names, neighbours, spy pick; structural: no open recorded by the spy, bound once, tree scrollTop, no per-section Print/star, reader-only scroll, the toast fix) + MRD-2 DOM (tree rows + dots; bar; spy moves bar/star/Print/tree mark without recording or moving comments; smooth-open hold; next chapter; no scrollIntoView inside the reader); M4 DOM rewritten for the bar's Print; M5a-FU2 pins the band; M1/M2 DOM read data-dept; MP2-4 extracts the bar helpers. Bite-checked 10 mutations — all BITE

TEST RESULTS: pure 1257/0, DOM 225/0, lint:server clean, counts --check agrees. Visual: all 45 `reference` matrix scenarios — no page errors, no missing fixtures (only the sandbox's Google Fonts fetch); focused shots of a real chapter scrolled (light, dark, Plum dark, Sand, 480 compact, 390 dark) — spy lands on 5.2, tree marks it, ‹ › step to Ch 06, 0px bar and page overflow, page scroll 0. Regression scenarios: no S* names the Reference reader's bar/tree (manual Test Command) — NOT APPLICABLE beyond the harnesses above.
REGRESSION RISKS: (1) Bookmark/Print are no longer on each section — a rep finds them in the bar (operator-visible change, in the log); (2) the spy's 800 ms hold after a smooth open is a time window — a scroll the rep makes inside it is named on the next scroll event; (3) the tree now asks for getManualMeta on render (one cached call a session; a failed read is not cached and retries on the next render).
INVARIANTS AT RISK: None — g162 (the band reaches past the padding, pinned), g64 (still one print block; the bar sits outside the section and is hidden by rule 4), g57 (no var(--man-c, …) — pinned), A2 (the narrow rule is a container query, so pop-out, phone and drawer alike), g141 (the bar repaints targeted nodes; no input in it).
NET SCORE: 2 production fixes (the toast's unreadable Reload in dark mode; the reader scrolling the app page, hiding the page title — pre-existing, measured) − 0 new failure modes = 2; M8/M10 are capabilities.

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + Deploy → Manage deployments → New version (with Phase 1 if not yet deployed) | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- metrics/script_metrics.html `.m-scope-btn.on` and qa/script_qa.html `.qa-btn.prime` also put #fff on --accent (unreadable in dark mode) — outside this plan.
- At 390px the bar's title truncates hard; Phase 7 (M13) turns ‹ › into 44px icons.
- Phase 3 (M9 masthead) absorbs the version line kept under the chapter title.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference) and docs/design-decisions.md could name the reader bar once the remaining phases land — /sync-docs at the end of the design thread.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
