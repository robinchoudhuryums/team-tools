---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: HB1.1a (handbook app plan, Phase 1, option A) — move the handbook's rendering layer out of kb/script_kb.html into one shared partial, Team Tools unchanged
New capabilities (G/ST): HB1.1a — web-app/shared/script_manual_render.html, the renderer the stand-alone handbook app will include (groundwork; no production defect fixed)
Files modified: web-app/shared/script_manual_render.html (new), web-app/kb/script_kb.html, web-app/index.html, test/client/harness.js, test/client/run.js, test/client/dom/boot.js, test/client/README.md, docs/design-decisions.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: M-L (~5 h) — written before the first edit
Actual: ~3.5 h

CHANGES:
HB1.1a | shared/script_manual_render.html, kb/script_kb.html | 110 top-level declarations moved verbatim, in order, each with its leading comments: kbMd_ and its block renderers (roster, glossary, decision guide, map, diagram, slideshow + slide details, snippet), callouts, footnotes, HCPCS links, the manual and article image chips + hydrators, the full-size viewer, the peek, and the four load-time listener IIFEs. Selected by an acorn dependency graph; their only references into Reference are KB_STATE (a missing-image chip's admin note, typeof-guarded) and kbXrefOpen_ (a diagram's "open the section").
HB1.1a | same | 301 style rules moved verbatim and in order — every rule whose selectors name only rendering-layer classes, plus the base .kb-article typography; @media blocks split, wrappers reproduced. Mixed selector lists (render + .kb-man-*), the reader's .kb-man-* rules and two .kb-article .kb-diagram svg.kbdg rules stay for HB1.1b.
HB1.1a | kb/script_kb.html | cascade check of every moved rule against every earlier Reference rule (same specificity, overlapping key selector, shared property): 24 candidates, one real — `.kb-ed label` now overrides the editor live preview's decision-checklist label size — held by `.kb-ed-prev .kb-dec-todos label { font-size: .86rem; }`.
HB1.1a | web-app/index.html | include('shared/script_manual_render') before kb/script_manual_diagrams and kb/script_kb.
HB1.1a | test/client/harness.js, run.js, dom/boot.js | CLIENT_ALIASES + readWebFile: a harness read of kb/script_kb.html is the pair in include order (the client twin of the Code.js alias, g113); 39 raw fs reads in run.js go through readWebFile; parse guard + DOM boot list the shared file; the HB1.1a contract pin (both-files declarations, include order, reach == [KB_STATE, kbXrefOpen_] shrink-only, styles moved, the preview rule, the alias).
HB1.1a | docs | design decision + index line; Subsystems map; test README section; test-harness-log entry.

TEST RESULTS: passed — node test/client/run.js 1431/1431 (+1 parse guard, +1 contract pin); node test/client/dom/runDom.js 301/301; counts --check, lint:server, cycle-closeout --check clean; scripts/manual-xref-report.mjs identical output before and after; visual CI gate PASS. Bite-checks 5/5 BITE (new reach, duplicate declaration, include order, preview rule dropped, contract entry unused). Visual: 72 Reference/manual shots old vs new — 39 identical, 27 below the noise threshold, 4 run-to-run noise, 2 consistent text-pixel residues whose full computed styles and boxes are IDENTICAL on every element old vs new (1,307 and 1,596 elements) — rasterisation from the two extra style/script elements, not a style or layout change.
Regression scenarios (Test Command `manual`; Reference views overlap): S62, S64, S73, S86, S112, S125, S126, S127, S128, S141, S143, S148, S149 — PASS by harness + visual evidence (the move is behaviour-neutral: identical computed styles, every pin green, scenario shots unchanged); S63, S65, S66, S71, S104, S124 — PASS for their client half on the same evidence, server half NOT APPLICABLE (no server file touched). Live-app walk is the operator's on the next deploy.
REGRESSION RISKS: (1) A future raw fs.readFileSync of kb/script_kb.html in a pin silently misses the moved functions — documented in test/client/README.md. (2) The shared file must be included wherever kb/script_kb.html is (index.html is the only host today; pinned). (3) Load-time order: the shared file's IIFEs and var initializers now run before kb/script_kb.html's top-level code — no Reference top-level statement reads a moved var at load (checked in the dependency graph).
INVARIANTS AT RISK: None — the parse guard, the A11Y/registry scans, the T6 class ratchet (INV-235) and the one-print-block pin read the pair through the alias and pass; the peek's own print rule moved with it as before.
NET SCORE: 0 production fixes − 0 new failure modes = 0

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (clasp push -f carries the new shared/ folder; skipSubdirectories is false) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- HB1.1b: the reader screen behind a host contract; it takes the two contract names, the .kb-man-* styles, the mixed selector lists and the two svg.kbdg rules.
- The shared layer still calls shell globals (esc, icon, ensureOverlay, closeOverlay, showToast, google.script.run) from script_core/script_icons — the handbook app (HB1.2) must supply them or include those partials.
- The visual CI gate's advisory "squeezed text" note on reference-manual-diagram-light-mobile predates this batch.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (design decision + index, Subsystems, test README, harness log, running totals).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
