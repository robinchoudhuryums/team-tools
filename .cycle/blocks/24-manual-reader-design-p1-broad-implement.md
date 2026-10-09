---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design handoff (Claude Design, 2026-10-08), Phase 1 — the contrast fix (white text on a filled accent, five buttons), the duplicated reader CSS given one home per property, M1 reading width, M2 callout kicker/title/body, M3 two-column tables stack by container query, M4b step circles + arrows, M5 three inline looks (code chip, solid section link, dotted glossary), M6 one colour cue per level — option (b): the reader AND the HTML manual — and M7 a quieter feedback line. Operator decisions for later phases are recorded in .cycle/manual-reader-design-plan.md.
Files modified: web-app/kb/script_kb.html, manual/make_html.py, test/client/run.js (MRD-1), test/client/dom/runDom.js (MRD-1 DOM), docs/design_handoff_manual_reader/ (new: the handoff README, mockup, support.js, diagram subset — non-deployed reference), docs/operator-log.md, .cycle/manual-reader-design-plan.md (new), CLAUDE.md (counts), .cycle/STATE.md
Estimate: M (~4 h) — written before the first edit, 2026-10-09
Actual: ~2.5 h

CHANGES:
Contrast | web-app/kb/script_kb.html | `.kb-man-go`, `.kb-typetog button.on` and three inline Save/Publish buttons used `color:#fff` on `--accent` (#7af2a1 dark Console, #e5d2fe dark Plum — far below AA). Now `var(--paper-card)`, the app's own idiom (styles.html). The handoff named two of the five.
Duplicates | web-app/kb/script_kb.html | `.kb-man-part` max-width, `.kb-man-sec`, `.kb-man-sec-head`, `.kb-man-sec-h` and `.kb-man-fb` each had two rules; merged into one (the later values, plus the earlier rule's properties nothing overrode).
M1 | script_kb.html | `> p, ul, ol, blockquote` of a manual section capped at 68ch; tables, diagrams and snippets keep the column.
M2 | script_kb.html (CSS + kbManualDecorate_) | Hairline callout box (Critical keeps a 1.5px --danger border); the bold opener is wrapped as kicker (icon + mono label in the -deep tone) + title, the separator kept in the DOM visually hidden, so the text every other reader reads is unchanged. Adapted: the file's `--danger` names (the handoff assumed `--destructive`); the real "**Critical.**" opener keeps its full stop in the hidden separator instead of a lone "." title, and a label run straight into words ("Note that …") is left as written. 102 of 205 real callout openers were measured against the regex first.
M3 | script_kb.html | `kb-man-2col` on a non-matrix two-column table; `.kb-man-tw` is a size container and the table stacks under 480px of READER width (pop-out, phone, drawer — A2). Found while measuring: the 34% label column outranked the stack rule and wrapped labels into a sliver at pop-out width — the container query now resets it.
M4b | script_kb.html | Step number in a 24px circle in the chapter colour, the ↓ arrow kept and coloured; manual sections only.
M5 | script_kb.html | `a.kb-hcpcs` is a chip (one home: the rule it replaced); manual section links a solid 50%-accent underline; a link whose whole text is a number gets `kb-xref-num` (mono).
M6 | script_kb.html, manual/make_html.py | No chapter-title stripe and no section-head stripe — a hairline under the section head, weight 600, chip lifted to .25em; the per-section Bookmark/Print quiet until hovered. The HTML manual's h1.part and h2 match (operator option b); its cards keep their own heading; the Word copy keeps its stripe.
M7 | script_kb.html | Feedback line without the rule above, ghost buttons, "Suggest an edit" pushed right.
Pins | test/client/run.js, test/client/dom/runDom.js | MRD-1 (structural: no white-on-accent, one rule per selector, no stripes in reader or HTML manual, the container query and its label reset, M4b in --man-c, oklab mixes) and MRD-1 DOM (drives kbManualDecorate_: five real opener shapes keep their text, kicker/title split, "Critical." gets no title, run-on label untouched, 2col only on a short two-column table, number-only link, idempotent). Bite-checked five ways, all BITE (the matrix exclusion needed a 12-row two-column table in the fixture before it bit).

TEST RESULTS: Test Command is manual. Pure 1256/0 (+1), DOM 224/0 (+1), lint:server ok, counts ok. Manual build ERRORS 0, print check 12/12, manual.json byte-identical (HTML-only change). Visual matrix: the 29 manual/search/drawer scenarios — 0 overflow, 0 missing fixtures, no page errors; plus shots of the real 1.4 (step table, Critical, two-column tables) in light, dark, Plum dark, Sand and at 480px pop-out width, and the HTML manual's new heading. Regression Scenarios (Client (Reference views)): S125 reader, S126 in use (print hides the quieted buttons as before — the M4 print DOM test passes), S127 previews/back, S128 search — PASS by the DOM suites and shots; S62 browse/edit — PASS (the editor Save and type toggle changed colour only); S63, S64, S65, S66, S71, S73, S86, S104, S112, S124 — NOT APPLICABLE (no flow, markup or layout they exercise changed; S73's grids untouched).
REGRESSION RISKS: The HCPCS chip is global (every article, not only the manual) — by the handoff's design. Callout blockquotes in manual sections are capped at 68ch while tables stay full-width (the handoff's README CSS; its mockup note said callouts keep the column — the README wins by its own fidelity rule). The HTML manual's card headings rely on `section.qrc h2` outranking the new global h2 hairline (verified: print 12/12).
INVARIANTS AT RISK: None (CSS + a pure DOM wrap; the text of every node is unchanged, so landing, previews, search and copy read the same).
NET SCORE: 1 production fix (the dark-mode contrast on five buttons) + 8 presentation changes (M1–M7, duplicates) − 0 new failure modes = 1 production; the M3 label-width defect was found and fixed before shipping.

OPERATOR ACTIONS / DEPLOY:
- Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: N/A (it is the deploy)
- Re-share the HTML manual from a fresh `manual/make_all.sh` if you distribute it (no re-import needed) | BLOCKS DEPLOY: N
Deploy: clasp push -f + New version (web-app/kb/script_kb.html changed).

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- web-app/styles.html ~line 2408 also puts `#fff` on `--accent` (outside the reader).
- Phases 2–8 of .cycle/manual-reader-design-plan.md (M8–M19, the dark-mode print fix, the card diagrams) wait for the operator.

DOCUMENTATION UPDATES NEEDED:
- None beyond docs/operator-log.md (done); docs/modules.md gets the reader's new look when the later phases land.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
