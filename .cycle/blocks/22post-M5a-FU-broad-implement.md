---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- M5a-FU-A — the 119 "unanchored links preview the opening": measured first (54 targets with no sub-headings — nothing to anchor; 13 Appendix B contacts named by the link; ~50 with sub-headings). A link whose text names ONE row focuses it (13 fixed in the reader); the report splits "by design" from anchorable and warns only on the latter (41), each with a suggested sub-section. A sub-section tier was measured (~6 in 10 right) and kept OUT of the reader.
- M5a-FU-B — the tab's "Back to" chip stays in reach: a sticky, opaque band that reaches past #kb-main's padding.
- M5b NOT included (advised separately: server + cache + invalidation net, L ~7 h).
Files modified: web-app/kb/script_kb.html, scripts/manual-xref-report.mjs, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md, docs/modules.md, docs/design-decisions.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: S–M (~3.5 h) — (A) S–M 2h · (B) S 1h · tests/visual S 0.5h (written in STATE before the first edit, 2026-09-30)
Actual: ~1.5 h

CHANGES:
M5a-FU-A | script_kb.html | kbNamedRow_ (exactly one table row whose first cell reads the link's text, else null); kbXrefFocus_(bodyMd, anchor, ctx, text) tries it before the context score; the preview passes the link's text, nav carries it, and both landings (tab, drawer) use it.
M5a-FU-A | scripts/manual-xref-report.mjs | loads kbNamedRow_; subSections() (top-level numbered sub-sections, each with all its words); an opening is byDesign when the link is anchored or the target has < 2 sub-sections or one block; warnings carry `suggest` (kbBestBlock_ over sub-sections — report-only). Real manual: 255 of 465 focus, 169 open by design, 41 warn.
M5a-FU-B | script_kb.html | .kb-man-back: position sticky, top −18px, margin/padding ±22px (= .kb-main's padding), opaque --paper-card, bottom rule — found by probing the scroller in Playwright (sticky stops at the scroller's padding edge).

TEST RESULTS: passed — pure 1097/1097, DOM 179/179, lint:server clean, counts --check agrees, manifest current; visual: the 42 reference/whatsnew/manual-copy/training scenarios at 0 px overflow, no missing fixtures, no console errors beyond the known CDN cert line; the band read in both backchip shots. 10 bite-checks: 9 BITE first run; 1 NO BITE acted on (the rows-only rule tested through a list item, whose label is not its text) — now BITES.
Regression scenarios (Test Command: manual — via the harness + visual matrix, NOT the live app): S127 PASS (steps extended for the follow-ons); S124–S126 PASS (their pins green); S67/S68 NOT APPLICABLE (training reader untouched this round).
REGRESSION RISKS: kbXrefFocus_ gained a 4th parameter — every caller passes it or relies on undefined (named-row off); the report's JSON gained byDesign/suggest (additive; its one consumer is the export's stdout). A named row wins over the context, so a link whose text accidentally equals an unrelated row's first cell would focus that row — only exact, unique matches count, and the report's focused count would show it.
INVARIANTS AT RISK: None — INV-341 and INV-343 extended in place; INV-345 new.
NET SCORE: 2 production fixes (13 directory links previewing the directory's opening; the chip out of reach after a landing scrolled the part) − 0 new failure modes = +2

OPERATOR ACTIONS / DEPLOY:
- Optional, editorial: decide whether to add numbered-heading anchors in the manual source for the 41 links `node scripts/manual-xref-report.mjs --list` names (it changes the number the manual prints) | BLOCKS DEPLOY: N
Deploy: Client (Reference views): `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- M5b (search: stemmer, glossary phrase synonyms, router phrases, cached index + invalidation net) — next, separately.
- The 41 anchorable links are an editorial decision, not code.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — written with the batch (modules, design decision, operator log/state, harness log, INV-341/343 amended + INV-345, S127 steps, running totals).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
