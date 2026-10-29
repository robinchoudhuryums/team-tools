---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB2.3 (handbook app plan, operator 2026-10-28; operator answers 2026-10-29 — remembered in this browser, Atkinson Hyperlegible, any browser voice) — display settings (text size, line spacing, high contrast, reduced motion, an easier-reading font) and read aloud with the browser's speech
Files modified: handbook-app/index.html, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: M (~4 h) — written before the first edit (the plan said S–M (~3 h))
Actual: ~2 h (questions 0.2 · page 0.6 · DOM + pure drives 0.4 · visual + reading 0.3 · docs 0.2 · bites + the follow-up drive 0.3)

CHANGES:
HB2.3 | handbook-app/script_handbook.html, index.html | Display in the header opens a panel — text size (4 steps), line spacing (3), High contrast, Easier-reading font, Reduce motion; each choice applies at once, Reset returns to the defaults. Every setting is one data-hb-* attribute on <html>; hbDisplayAttrs_ decides them, the page stores them beside the prefs (umsHbDisplay), and index.html's head applies exactly what was stored (data-hb-[a-z]+ names, plain values) before first paint, adding the font's stylesheet only when it is on. Read aloud: Listen on the bar above a section speaks its title, then each paragraph, list item, heading, table row and caption (nothing hidden, no button labels) with the browser's speechSynthesis, in pieces Chrome will not cut off (a sentence ends at punctuation followed by a space — never inside "3.1" or "$1.50"), the block being read marked; Pause / Resume / Stop; every navigation stops it, and a sequence guard keeps a late onend from speaking on; voice and speed under Display → Read aloud (voices refreshed in place when the browser loads them — g141); no speech, no Listen.
HB2.3 | handbook-app/styles_handbook.html | rules for every data-hb-* value (root font size for text size, so the rem-sized reader grows and the px chrome stays; scoped light and dark high-contrast token sets; the reduced-motion rule forced); the panel's controls; the reading mark. The department picker gains min-width: 0 so it shrinks at the largest text (it overflowed 6px at 390px).
HB2.3 | tests | pure HB2.3-a (the prefs cleaned; the head's filter, read from index.html, admits every attribute the page can produce, and the stylesheet has a rule for each); DOM: five drives (the panel; the head before the page script; read aloud; hidden text and a late end inside a long paragraph — added after two NO BITEs; voice, speed and the chunker); visual: four scenarios (one on the CI gate). 11/11 bites.

TEST RESULTS: pure 1475/1475, DOM 337/337, lint-server clean, handbook-sync --check clean, counts --check clean, visual CI gate 33/33 PASS; the four new scenarios were read — the largest text at 390px overflowed through the department picker (fixed); the drive found the first chunker reading "3.1" as two sentences (fixed). Regression Scenarios: Team Tools untouched (no web-app/ file changed); every handbook drive passes with Listen added to the bar.
REGRESSION RISKS: the bar above a section carries one more button. At the largest text size the shared reader's chapter index (.kb-man-ix-t) is squeezed at phone width — the pre-existing masthead defect already on the follow-on list, made more visible; that scenario is not gated.
INVARIANTS AT RISK: None — page-only (no server call), Team Tools unchanged; nothing typed is spoken or stored.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Handbook app: `npm run handbook:push`, then Deploy → Manage deployments → New version (no new permission) | BLOCKS DEPLOY: Y (handbook app only)
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- The shared reader's chapter masthead index stays two columns in a narrow container, worse at large text (web-app/shared/script_manual_render.html — the existing cycle 25 Batch 9 follow-on).
- Text size scales rem-sized text only; px-sized chrome (header, buttons) stays its size by design.
- Read aloud does not continue into the next section; a reader presses Listen again.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, handbook-app.md section, harness log, Subsystems, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
