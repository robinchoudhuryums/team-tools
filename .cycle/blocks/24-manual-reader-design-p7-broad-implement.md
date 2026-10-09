---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design Phase 7 (operator 2026-10-09: "Phase 7") — M13 compact pop-out: a one-row side (search + Contents), the tree folded except while a search has a query, a Contents dialog, 44px ‹ › in the reader bar
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, docs/operator-log.md, .cycle/manual-reader-design-plan.md, .cycle/STATE.md, CLAUDE.md (counts block)
Estimate: M (~4 h) — written in STATE.md before the first edit
Actual: ~2 h

CHANGES:
M13 side | web-app/kb/script_kb.html | enterReferenceView adds a Contents button (aria-haspopup="dialog") to .kb-side; in BOTH narrow triggers (:root[data-compact] and @media (max-width: 720px) — A2) the side is one row (the search box flex 1, 44px tall; Contents 44px), #kb-tree is hidden unless .kb-side has kb-side-q, and the bar's ‹ › are 44×44; .kb-toc-btn is display:none on a wide screen
M13 search | web-app/kb/script_kb.html | kbDoSearch_ toggles .kb-side-q by whether the box has text — set before any early return — so search results (rendered into the tree) show, and an empty box folds the tree again
M13 Contents | web-app/kb/script_kb.html | kbOpenToc_(dept): ensureOverlay('kb-man-toc-overlay', labelledBy its heading, an onClose hook that removes it); a chip per manual department (badge + number, aria-pressed; switching re-renders in place and keeps focus on the chip; the department rides a data attribute — g133), the chosen chapter's sections (number column + title, the open one aria-current), then "Other reference" — the hand-written articles by department, without a number column (adapted: the tree is folded on a narrow screen, so the dialog must reach every item); the × through closeOverlay; kbTocGo_ closes, then opens
Tests | run.js, runDom.js | MRD-7 (pure: the four rules in both triggers, the wide default, the class set before the early return, the overlay lifecycle, the chip's attribute, close-then-open) + MRD-7 DOM (the button; the search class on and off; the dialog's chips, rows, the open one marked, other reference; a chip switches in place with focus; a row closes and opens; Escape closes). The shell's derived overlay nets (SH-02, F-02) pass with the new overlay. Bite-checked 5 mutations — all BITE

TEST RESULTS: pure 1262/0, DOM 230/0, lint:server clean, counts --check agrees. Visual: measured at 1440 (unchanged: tree shown, no Contents), the 480 pop-out, 390 dark and a 720 viewport — the side 70px tall, the reader top at 179px in the pop-out, ‹ › 44px tall, Contents a named dialog with focus inside that fits the screen, chapter switch + row open + close, search shows the tree and clearing folds it, 0px page overflow, no page errors; all 45 `reference` matrix scenarios clean (no page errors, no missing fixtures); its compact scenario shows the one-row side with the lookups at the top. Regression scenarios: none names the Reference layout (manual Test Command) — NOT APPLICABLE beyond the harnesses above.
REGRESSION RISKS: (1) on a narrow screen the tree's admin buttons (Add item, Synonyms, Manual) and the router entry are folded away with it — the router is on the manual home and in Contents' chapter list's surroundings; an admin manages the library on a wide screen; (2) after a Contents row opens an item, focus returns to the Contents button (closeOverlay's restore), not the reader.
INVARIANTS AT RISK: None — A2 (both triggers, pinned), g100/g130/SH-02 (ensureOverlay + hook removes + × through closeOverlay; derived nets green), g133 (chips pass by attribute), g73 (no hidden attribute against a display class — the button is shown by a class rule), T6 (every new class has a rule).
NET SCORE: 1 production fix (the pop-out reader started below a tree up to 45vh tall — every narrow Reference open) − 0 new failure modes = 1; Contents is a capability.

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + Deploy → Manage deployments → New version (with Phases 1–6 if not yet deployed) | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- Phase 8 next: M14 the chapter's quick card in its masthead, M19 card print, the dark-mode print fix, card diagrams in the source (a manual release).
- The admin authoring buttons are not reachable on a narrow screen (folded with the tree) — by design here; say if an admin needs them in the pop-out.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference) and docs/design-decisions.md should name the reader bar, masthead, chapter cards, the footnote/glossary card, manual search hits, the reading trail, resume, the manual home and the compact Contents; docs/gotchas.md could record the --on-warn pairing — /sync-docs at the end of the design thread.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
