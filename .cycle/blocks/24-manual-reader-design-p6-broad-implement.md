---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design Phase 6 (operator 2026-10-09: "drawer single-section view callout labels and numbered step circles, Phase 6") — M12 manual home on the Reference landing; Phase 5's open item: the Ctrl+K drawer's single-section view now draws the callout labels and step circles
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, docs/operator-log.md, .cycle/manual-reader-design-plan.md, .cycle/STATE.md, CLAUDE.md (counts block)
Estimate: M (~5 h) — written in STATE.md before the first edit
Actual: ~2.5 h

CHANGES:
Open item | web-app/kb/script_kb.html | the drawer marks a manual section's article (class kbd-man-art + its chapter class, data-kb-man) and runs kbDecorateCallouts_ on it; the eight callout/step CSS selectors moved from .kb-chunk-body[data-kb-man] to .kb-article[data-kb-man] (search chunks and the drawer alike); .kbd-man-art joins the --man-c default (an appendix falls back to --muted)
M12 | web-app/kb/script_kb.html | kbHomeHtml_ — the manual home: title + version line, the call-router card (three openers from the REAL router: the first rows whose targets the reader can see), the "Go to a section" card (an input on kbManualNumberTarget_ via kbJumpRowHtml_; Enter opens), and a tile per chapter / appendix (badge or letter, name, section count, updated count once the meta is in) — each tile a chapter-level open ({ chapter: true }), so it resumes (M16). Inserted ONCE ahead of the lookups by kbHomeEnsure_ (both kbRenderLanding_ paths; removed when the tree holds no manual), only its read-only parts repainted by kbHomePaint_ — the jump box survives the landing's re-renders as nodes (T1). Container queries reflow the tiles 4 → 3 → 2 columns and the cards to one
Order | web-app/kb/script_kb.html | .kb-land is a container; at ≤680px (the pop-out, a phone) the lookups take order -1 — measured: at 480px they had moved to 1,162px down below a 5-tile fixture grid (the real manual has 14 tiles); now 488px. Wide layout unchanged (the handoff's order). Flagged to the operator
Tests | run.js, runDom.js | MRD-6 (pure: the home inserted once in both landing paths, removed without a manual; the repaint never touches the jump box; tiles chapter-level; the one section-number reader; the drawer's marking + labels; the CSS rules on .kb-article[data-kb-man]; the narrow order rule) + MRD-6 DOM (home first; tiles + counts; openers only from reachable router rows, escaped; the version; the jump box survives a re-render with its node, value and focus; Enter opens; a tile resumes; no manual, no home; the drawer's section labelled in its chapter colour); MRD-4's selector count follows the move. Bite-checked 6 mutations — all BITE

TEST RESULTS: pure 1261/0, DOM 229/0, lint:server clean, counts --check agrees. Visual: all 45 `reference` matrix scenarios clean (no page errors, no missing fixtures); focused shots of the home (light/dark 1440, 480 compact, 390 dark) — 0px page and tile overflow, 3 / 2 columns by width; the drawer's real 5.2 with its WATCH-OUT label. Regression scenarios: none names the Reference landing (manual Test Command) — NOT APPLICABLE beyond the harnesses above.
REGRESSION RISKS: (1) the landing grew — a wide landing now opens with the manual home above the lookups (the handoff's choice; the narrow order keeps the mid-call tools first); (2) .kb-land became a flex column + container — its children's margins are unchanged, measured; (3) the "recently changed" list stays in the landing blocks rather than inside the home.
INVARIANTS AT RISK: None — g141/T1 (the jump box is never re-rendered; pinned and driven), A2 (every reflow is a container query), g133 (tiles pass ids by attribute), T6 (a ruleless class was dropped), g146 (the no-match line does not echo the typed text).
NET SCORE: 0 production fixes − 0 new failure modes = 0; the drawer decoration and M12 are capabilities (the drawer labels were never there, not broken).

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + Deploy → Manage deployments → New version (with Phases 1–5 if not yet deployed) | BLOCKS DEPLOY: N
- Decide: keep the narrow-only order (lookups first in the pop-out/phone, home first when wide), or one order everywhere | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- Phase 7 next: M13 compact pop-out (the reader full height, a Contents overlay).
- The drawer's single-section view still does not run the table decorator (two-column stacking) — it draws callouts and steps only, as asked.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference) and docs/design-decisions.md should name the reader bar, masthead, chapter cards, the footnote/glossary card, manual search hits, the reading trail, resume and the manual home; docs/gotchas.md could record the --on-warn pairing — /sync-docs at the end of the design thread.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
