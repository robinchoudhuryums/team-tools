---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- M5a-1 — context-focused previews: a cross-reference previews the part of its target the link is about (clear winner only), and a click / the card's Open lands there
- M5a-2 — code links in more places: manual search results (tab + drawer), the preview card, a manual section opened as training
- M5a-3 — back to the section: the drawer's trail ("Back to …" above home, results, the router and the next section) and the tab's cross-part "Back to" chip
- (with 1) the export's WARNING-only report of unanchored links that still preview the opening, run on the app's own scorer
Files modified: web-app/kb/script_kb.html, web-app/train/script_training.html, scripts/manual-xref-report.mjs (new), manual/export_reference.py, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/modules.md, docs/design-decisions.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: M–L (~10 h) — (1) M–L 5h · (2) S 1.5h · (3) M 2.5h · tests/visual S 1h (written in STATE before the first edit, 2026-09-29)
Actual: ~3.5 h

CHANGES:
M5a-1 | script_kb.html | kbMdPlain_, kbNormText_, kbCtxTokens_, kbManualBlocks_ (row with header / item / callout / paragraph in kbMd_'s grouping), kbBestBlock_ (rarity-weighted; ≥ KB_CTX_MIN_SHARED=2 shared words and a KB_CTX_MARGIN=1.5 lead, else null), kbXrefFocus_ (anchored sub-section in full), kbMdLinkContexts_; DOM side kbElText_, kbXrefBlockEl_, kbXrefContext_, kbXrefLandOf_, kbFindBlockEl_, kbFlashBlock_, kbXrefLandEl_. kbXrefShow_ paints the focused block (header "title › label", matched words marked) or the old excerpt; its early-return is per LINK now (two rows → two cards). kbXrefOpen_ passes nav {ctx}; kbOpenItem_/kbOpenManualSection_/kbManualFocus_ and kbDrawerOpenItem_ land on the block (else the anchor, as before). CSS for the focus caption, the ring on a landed callout.
M5a-1 | scripts/manual-xref-report.mjs, manual/export_reference.py | the report READS the scorer out of script_kb.html (no copy, g126) and counts focused / opening / missing, warning on unanchored links into multi-block sections; the export runs it after writing manual.json and cannot be failed by it. Real manual: 242 of 465 links focus; 119 warn.
M5a-2 | script_kb.html, train/script_training.html | kbChunkGroupsHtml_ marks manual chunks (data-kb-man); kbLinkHcpcsInResults_ links them BEFORE kbHighlightTerms_ (tab + drawer); the preview card links a manual target's body; trainRenderReader_ links a manual item.
M5a-3 | script_kb.html | KB_DRAWER.stack/cur; kbDrawerLeave_ pushes {id, anchor, title, scrollTop} when the section view is replaced (home, results, router, another section), each id once, capped at 5; kbDrawerBackTo_ pops, restores the scroll and never pushes; kbDrawerClose_ clears. Sticky "Back to" row. Tab: KB_STATE.backTo set by a cross-reference into ANOTHER part, cleared by any open without nav; kbManualPaintBack_ / kbManualBack_ land on the block the rep left from.

TEST RESULTS: passed — pure 1095/1095, DOM 178/178, lint:server clean, counts --check agrees, split-manifest current; visual: the 42 reference/whatsnew/manual-copy/training scenarios at 0 px overflow, nothing missing, no console errors beyond the known CDN cert line. 22 bite-checks: 20 BITE on first run; 2 NO BITEs acted on (a Back from the drawer's HOME could not see "never pushes"; a callout table of one-letter cells hid the callout-vs-paragraph difference) — both now BITE.
Regression scenarios (Test Command: manual — walked through the harness + visual matrix, NOT in the live app): S127 PASS (every step has a DOM equivalent; the export step run for real on the manual); S124 / S125 / S126 PASS (their pins unchanged and green); S67 / S68 PASS (the training reader only gains code links on man- items); S62 / S64 NOT APPLICABLE beyond the shared reader (no change to article authoring or search ranking). The live walk of S127 is owed after the deploy.
REGRESSION RISKS: kbOpenItem_ now clears the tab chip on any open without nav — every existing caller passes two args, so none carries nav by accident. kbXrefShow_'s per-link key means moving between two links to the same target repaints (from cache) rather than keeping the card — intended. A clear-winner that is WRONG would mislead more than the opening did: the margin + two-word floor were calibrated on a read sample of the real manual; the report lists what does not focus, not what focuses wrongly.
INVARIANTS AT RISK: INV-338 (HCPCS links manual-only) — extended, not relaxed (INV-344); INV-339 (keyboard previews) — unchanged, the M4 keyboard pin still green; g126 (one reader per source) — the report reads the partial's functions; g141 (async re-render keeps input) — the drawer's home partial re-render still leaves the lookups alone (kbDrawerPaintBackTo_ patches only its own host). New: INV-341..344.
NET SCORE: 3 production fixes (the 249 unanchored links previewing the wrong part; codes dead in results/card/training; no way back after a jump — all live since M2–M4) − 0 new failure modes = +3

OPERATOR ACTIONS / DEPLOY:
- None new — no Script Property, tab or column. Optional: add numbered-heading anchors in the manual source for the links `node scripts/manual-xref-report.mjs --list` names | BLOCKS DEPLOY: N
Deploy: Client (Reference views), Client (Training views): `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version. (The export change is local to `manual/`; nothing to import.)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- 119 unanchored links still preview the opening; many are the call router's one-phrase rows in 1.1, whose context is too short to match — by design.
- The tab's "Back to" chip is not sticky (a sticky pill covered the section title at phone width); the drawer's row is.
- M5b (search: stemmer, glossary phrase synonyms, router phrases, cached index) is next.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — written with the batch: modules, a design decision (+ CLAUDE.md index line), operator-state (the manual import's report), operator log, harness log, INV-341..344, S127, the running totals.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
