---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none from a scan — operator requests and defects reported 2026-10-19, done ad hoc and written up here after the fact (the operator asked for the broad-implement close-out). Two are defect fixes:
  R3-1 Intake: the thumbnail's ✕ remove button was clipped by its own thumbnail (overflow hidden) — seen live
  R3-2 Handbook reader: a NAMED step ("Referral") was drawn inside the 24px number circle, which crossed the word (0.8, 0.14, 6.5) — seen live
  R3-3 Handbook content: 0.10, its icon guide and 0.11.1 put the Messages button at the bottom RIGHT; it is along the bottom, a third of the way in (D9) — wrong text in production
  R3-4 Found by this close-out's review: R3-2's fix was table-wide, so 10.20's numbered EAA steps (1, 2, 3, then "Turnaround") lost every circle — fixed per row before any deploy of R3-2 was confirmed
New capabilities (G/ST): none from a scan — operator requests:
  R3-a Intake email: a deliberate No attestation leads with ✗ (unanswered keeps ○)
  R3-b Intake form: a blank strongly-recommended field is light red, not amber
  R3-c Intake preview: the attached card images show where the email puts them (a slot OUTSIDE the hashed body; the browser fills it)
  R3-d Intake email: card images 340px (CSS + width attribute for Outlook), not the 560px column
  R3-e Handbook source: the Open items tables rewritten to what is actually pending (stripped from every output)
  R3-f Handbook content: 2.12, 3.14 and 7.15 resource links; 3.12.2 the one compliance table with HCPCS codes, 3.12.3 removed (A5)
  R3-g Handbook reader + HTML: a table that fits keeps its header row in view under the reader band / context bar (measured)
  R3-h Handbook reader + HTML + Word: {{gallery:…}} tutorial slideshows — one slide at a time, ← / →, wraps; every slide on paper (print rule 7) and in Word; 8.2.2's ticket screenshots first
  R3-i The Service chapter's icon is a single wrench (app icon set + chapter_style.json, pinned equal)
  R3-j The operator's handbook checklist page (artifact Rd6WRv6Qn3sijJyAGRqs9E — db-backed, 79 items; not repo content)
Files modified: web-app/60_intake.js, web-app/intake/script_intake.html, web-app/kb/script_kb.html, web-app/script_icons.html, web-app/styles.html, manual/render.py, manual/make_html.py, manual/export_reference.py, manual/README.md, manual/src/p0–p10.md, manual/data/changelog.json, manual/data/icons.json, manual/data/chapter_style.json, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, docs/modules.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: intake polish not written before the first edit (missed) — retro S (~1.5 h) · handbook reader round S (~0.3 h) + S-M (~1.5 h) + M (~3 h), written before the first edit
Actual: intake polish ~1 h · handbook content ~1 h · reader round ~2.5 h (icon 0.2 · sticky 1 · gallery 1.3) · close-out review + R3-4 ~0.7 h

CHANGES:
R3-a | 60_intake.js | intakeBuildAcctBodyHtml_: ✗ for answerRaw 'FALSE', ○ for blank
R3-b | script_intake.html | .intk-recwarn → --destructive-soft / --danger-deep (both themed)
R3-c | 60_intake.js, script_intake.html | INTAKE_PREVIEW_IMG_SLOT in the PREVIEW html only (bodyHash still over the image-free body); intakePreviewFillImages_ fills it with esc()'d data URLs and the server's own styles, or removes it
R3-d | 60_intake.js | INTAKE_EMAIL_IMG_WIDTH 340 + intakeEmailImgStyle_ (shared by email and preview)
R3-1 | script_intake.html | .intk-thumb no longer clips; the image carries the rounding; the gallery pads for the overhang
R3-2/R3-4 | script_kb.html (kbMd_ tables), make_html.py | kb-steps-named widens the column; td.kb-step-name / td.stepname per ROW is the label (no circle); numbered rows keep theirs
R3-3, R3-e, R3-f | manual/src, data/changelog.json, data/icons.json | D9 wording ×4 + changelog; Open items per chapter; links; 3.12.2 HCPCS column, 3.12.3 removed + changelog
R3-g | script_kb.html (kbManualStickyHeads_ + CSS), make_html.py (.tw.fit + twFit) | fit by measurement (width 0 never fits; ResizeObserver / resize re-measure); header top = band − 18px (g162) / where #ctx sticks
R3-h | render.py, export_reference.py (gallery_md), script_kb.html (```gallery → kbGalleryHtml_/Go_/Step_/Key_), styles.html (print rule 7), make_html.py (carousel JS/CSS), src/p8.md | slides classed off (g73), key charset only into attributes
R3-i | script_icons.html, chapter_style.json | one wrench path

TEST RESULTS: Test Command is manual. Node: pure 1397/1397, DOM 284/284, lint:server clean, counts --check agrees. Bite-checked: the preview-image DOM test, the 340px assertion, the sticky-fit DOM test (unmeasured→fit), the gallery wrap DOM test, the gallery off-class pin, the per-row step pin (table-level mutation) — all bite. Visual: shoot --ci 24 scenarios PASS (one known squeezed-text KNOWN entry). Chromium measurements: sticky header meets the band with 0px gap at 1440 and 480 (app) and 1440 and 390 (HTML); nothing scrolls the page sideways at 390; gallery steps/wraps and prints all slides; Word model carries the four images in order. The manual build: ERRORS 0, export clean, validate_html clean; validate_render and check_svg_fit need Python Playwright (not installed here — CI runs them).
Regression scenarios walked (Test Command manual) — by the harness and the Chromium runs above, not on the deployed app:
  S60 PASS (preview/send path: the hash contract and inline images unchanged; preview now also shows the images)
  S73 PASS (390/480/1440: no sideways page scroll in the reader with fit tables)
  S86 PASS (the gallery is a recognized fence; label/caption escaped; only the key charset reaches attributes — INV-193)
  S124 PASS for the build/export half; the import/publish half NOT WALKABLE here (needs the deployed app)
  S125 PASS (reader tables, named steps, icons) — the live walk is owed (S148)
  S126 PASS for print (rule 7 inside the one block); the live print preview is owed
  S128 NOT APPLICABLE (search untouched; gallery captions stay in BodyMd)
  S144 PASS (form/preview pins); S145 PASS (email builder pins)
  New: S147 (intake polish) and S148 (handbook reader) added — owed after deploy

REGRESSION RISKS:
- Import before deploy: 8.2.2's ```gallery would render as a raw code block in the old reader (documented: deploy first — STATE, operator log, S148).
- Sticky headers depend on measuring: a table whose content grows without the wrapper resizing could overflow until the next measurement; ResizeObserver also watches height, and the CI gate measures sideways overflow.
- The ResMed mask-selector link carries a token= that may be account-specific (operator asked to try it in a private window).
INVARIANTS AT RISK: INV-41's intake mirror (preview hash) — held: the slot is only in the preview html, the hash is over the image-free body (pinned). INV-111 (intake esc_) — held. INV-193 (interactive KB content only from a recognized fence) — held. g64 one print block — rule 7 added inside it. g73 — slides classed off, never hidden. g162 — sticky top accounts for the scroller padding. g57 — no var() fallback on --kb-man-band (declared on .kb-main).
NET SCORE: 3 production fixes (R3-1, R3-2, R3-3) − 2 new failure modes (R3-4, introduced by R3-2 and fixed in-round; the import-before-deploy ordering hazard for galleries) = +1

OPERATOR ACTIONS / DEPLOY:
- Deploy first: cd web-app && clasp push -f, then New version | BLOCKS DEPLOY: N
- Then re-import the handbook: manual/make_all.sh → Reference → Handbook → Check → Import → Publish | BLOCKS DEPLOY: N (but must FOLLOW the deploy)
- Walk S147 and S148 | BLOCKS DEPLOY: N
Deploy: Server — cd web-app && clasp push -f, then New version

FOLLOW-ON ITEMS:
- The pick-up ticket (Ch 6) and Payment Processing (Ch 10) slideshows need their slide images to become galleries.
- The handbook checklist page and the source Open items tables are two copies; update both when work lands.
- validate_render.py / check_svg_fit.py were not run locally (no Python Playwright); CI runs them.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this close-out: g64 rule (7) (CLAUDE.md index + docs/gotchas.md), docs/modules.md (Intake + Reference), docs/operator-log.md (round 3 entry), manual/README.md ({{gallery:…}}), .cycle/config.md (S147, S148).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
