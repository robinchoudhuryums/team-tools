---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: HB1.1b (handbook app plan, Phase 1, option A) — the handbook reader screen into the shared partial behind a named host contract; the HB1.1a contract names become hooks; the reader's styles, the mixed selector lists and the svg.kbdg rules follow
New capabilities (G/ST): HB1.1b — MANUAL_HOST (18 hooks) + MANUAL_STATE: the reader the stand-alone handbook app can host (groundwork; no production defect fixed)
Files modified: web-app/shared/script_manual_render.html, web-app/kb/script_kb.html, scripts/manual-xref-report.mjs, test/client/run.js, test/client/dom/runDom.js, test/client/README.md, docs/design-decisions.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: L (~6 h) — written before the first edit
Actual: ~4.5 h

CHANGES:
HB1.1b | shared/script_manual_render.html, kb/script_kb.html | 105 declarations moved verbatim and in order (with leading comments): the reader screen (kbOpenManualSection_, the masthead and quick cards, the reader bar and its feedback, chapter nav, the scroll-spy, kbManualFocus_, trail, resume), the cross-reference system (KB_XREF, kbXrefOpen_/Show_/Hide_/Focus_, the kbBindXrefs_ listener, the footnote/glossary card popover) and their pure helpers (kbFindBlockEl_, kbBestBlock_/kbCtxTokens_/kbNamedRow_, kbMdPlain_, kbHighlightTerms_ + kbHl*, kbDeptCompare_/kbNaturalCompare_, kbTetherPopover_). Selected by an acorn dependency graph; every moved top-level initialiser reads only moved names (the file now loads first).
HB1.1b | same | the reader's 17 calls into Reference and its reads of the host's state became MANUAL_HOST hooks (state, openItem, prefs, savePrefs, markCurrent, revealInTree, treeUpdated, printSection, printAllCards, publishItem, suggestEdit, bookmarkBtnHtml, bookmarkBtnPatch, recordOpen, loadComments, drawerOpenItem, drawerOpen, drawerTitle) — in code and in emitted onclick strings. Reference installs them once after KB_STATE, LATE-BOUND (each calls the Reference function by name). The reader's own fields (manualMeta/Gen/Waiters, manualPart(s)/Gen/Loading, manualSeq, manualBarNav, manualFb, manualHeadsRo, manualSpyId/Hold, resumeKey/Line/Pending/Timer, trail) moved from KB_STATE to MANUAL_STATE; Reference reads manualMeta and manualPart there; manualRecent stays Reference's. install() throws on an unknown hook; defaults are harmless. HB1.1a's two contract names are gone (kbXrefOpen_ moved; the image chip's admin note reads MANUAL_HOST.state().isAdmin).
HB1.1b | same | 179 style rules moved (the chapter colours — the default and its pN overrides as one unit — masthead, cards, bar, chapter nav, trail, resume, the xref card, the steps/callout variants, svg.kbdg); classes Reference also emits on its own (the admin import's .kb-man-res/-import/…) stay. Order checked against the PRE-HB1.1a file, every pair both directions: 915/915 original rules found, no new flip two rules could both match.
HB1.1b | scripts/manual-xref-report.mjs | reads the scorer from READER_PARTIALS (shared + Reference).
HB1.1b | test/client/run.js, dom/runDom.js | manualHostInto_ gives a sandbox the REAL contract + the REAL install; seeds of moved fields on MANUAL_STATE; nine assertions on emitted onclick / source text name the hooks; MRD-7 finds the bar's ≤720px rule in the shared file's block; extractFnFrom stops at </script>; the contract pin becomes HB1.1a/b.
HB1.1b | docs | design decision + index line; modules.md note; test README; harness log; Subsystems line.

TEST RESULTS: passed — node test/client/run.js 1431/1431; node test/client/dom/runDom.js 301/301; lint:server, counts --check clean; scripts/manual-xref-report.mjs output identical; visual CI gate PASS. Bites 7/7 BITE (reader names a Reference function; reader reads KB_STATE; a hook not installed; a declared hook unused; install ignores a misspelt hook; Reference reads a reader field on KB_STATE; DOM: the openItem hook a no-op → MRD-5 DOM). Visual: 72 Reference/manual shots, HB1.1a code (git worktree) vs HB1.1b — 43 identical, 23 below threshold, one 5-px spot, five with text-pixel residue whose computed styles, boxes and text are IDENTICAL on every element old vs new (codes 959, compact drawer 1,002, polish-pak 1,307, HCPCS 1,604 elements). No page errors either side.
Regression scenarios (Test Command `manual`; Reference views overlap): S62, S64, S73, S86, S112, S125, S126, S127, S128, S141, S143, S148, S149 — PASS by harness + visual evidence (behaviour-neutral: identical computed styles, every pin green, the hooks driven by the DOM suite); S63, S65, S66, S71, S104, S124 — client half PASS on the same evidence, server half NOT APPLICABLE (no server file touched). Live-app walk is the operator's on the next deploy.
REGRESSION RISKS: (1) A Reference function renamed later must keep its MANUAL_HOST.install line in step — the pin fails on a hook not installed, but a hook installed to a renamed function fails only when called (the DOM suite drives openItem, prefs, printSection and the trail). (2) Tests seeding reader state must use MANUAL_STATE — documented in test/client/README.md. (3) Load order: the shared file loads first; no moved initialiser reads a Reference name (checked).
INVARIANTS AT RISK: None — the parse guard, the A11Y/registry scans, the T6 class ratchet (INV-235), the one-print-block pin and the onclick-literal pins (g133) pass over the pair; INV-341 (one scorer) holds — the report and the reader read the same functions from the shared file.
NET SCORE: 0 production fixes − 0 new failure modes = 0

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (clasp push -f carries shared/) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- HB1.1c (small): `.kb-man-bar .kb-bm.on` (the host's bookmark button inside the reader bar) and other host-styled pieces stay in Reference — the handbook app will style its own; decide then. The shared layer still calls shell globals (esc, icon, ensureOverlay, closeOverlay, showToast, google.script.run, reloadApp_?) from script_core/script_icons — HB1.2 must supply or include them.
- The visual CI gate's advisory squeezed-text note on reference-manual-diagram-light-mobile predates HB1.1a.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
