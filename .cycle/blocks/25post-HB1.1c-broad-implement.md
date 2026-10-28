---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: HB1.1c (handbook app plan, Phase 1) — what HB1.1b left: the shared partial's needs from its page stated and pinned; a sweep for tools that read kb/script_kb.html for moved code; the host-styled rules decided. (The batch's ORIGINAL content, the test-source alias, landed in HB1.1a, which needed it to stay green.)
New capabilities (G/ST): HB1.1c — the SHELL NEEDS contract the handbook app (HB1.2) builds against (groundwork; no production defect fixed)
Files modified: web-app/shared/script_manual_render.html (header comment), manual/export_reference.py (docstring), test/client/run.js, docs/design-decisions.md, docs/test-harness-log.md, CLAUDE.md, .cycle/STATE.md
Estimate: S (~1.5 h) — written before the first edit
Actual: ~1 h

CHANGES:
HB1.1c | shared/script_manual_render.html | header gains SHELL NEEDS: script_core (closeOverlay, copyText_, copyWithFeedback_, currentView, ensureOverlay, errorStateHtml_, esc, loSweep, manualCopyModal_, showToast; animateListSwap_ optional), script_icons (icon), kb/script_manual_diagrams (KB_MANUAL_DIAGRAMS), server (getKbImages, getManualImages, getManualMeta, getManualPart, getManualParts, getReferenceItem, kbFlagItem, kbGetImageData, kbMapDistances). Comment only — no code change.
HB1.1c | test/client/run.js | the HB1.1c pin derives the list (top-level names and global./window. exports of every other partial index.html includes, used by the shared code; public server functions called as .name( ) and requires the header to equal it; one named exception (pad, a local) re-checked as still local.
HB1.1c | manual/export_reference.py | the xref-report docstring names the shared partial (the script itself was repointed in HB1.1b). No other tool reads kb/script_kb.html for moved code (shoot.mjs's mention is historical).
HB1.1c | docs/design-decisions.md | the HB1.1b decision records the SHELL NEEDS contract and that host-styled rules stay with the host: `.kb-man-bar .kb-bm.on` (the button is bookmarkBtnHtml's) and `.kb-main:has(> .kb-man-top)` (Reference's page layout).

TEST RESULTS: passed — node test/client/run.js 1432/1432 (+1: the HB1.1c pin); node test/client/dom/runDom.js 301/301; lint:server, counts --check, cycle-closeout --check clean. Bites 3/3 BITE (an unlisted script_core use; a stale header entry; a server call left out of the header). No visual run: no style, markup or runtime code changed.
Regression scenarios (Test Command `manual`; Reference views overlap): NOT APPLICABLE — the batch changed a comment header, a Python docstring, a test and docs; no runtime behaviour in any scenario's path.
REGRESSION RISKS: None — no runtime code changed.
INVARIANTS AT RISK: None.
NET SCORE: 0 production fixes − 0 new failure modes = 0

OPERATOR ACTIONS / DEPLOY:
- None (nothing deployed changed in behaviour; the next New version carries the header comment) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- HB1.2: the handbook app must supply every SHELL NEEDS name (or include script_core/script_icons/script_manual_diagrams) and serve the nine server functions read-only; kbFlagItem (the reader bar's helpful/not-helpful vote) and getReferenceItem (a link to a hand-written Reference article) need a decision there — serve, or degrade with a stated message.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
