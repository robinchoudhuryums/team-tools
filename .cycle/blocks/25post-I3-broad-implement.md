---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-06, batch I3 added to the approved plan)
New capabilities (G/ST): I3 — insurance cards read in the browser (PaddleOCR on ONNX Runtime Web, every file checksum-pinned); the payer, member ID, group, Rx BIN/PCN/group or Medicare ID offered in correctable boxes and written into the primary or secondary insurance on Use
Files modified: web-app/intake/script_intake.html, test/client/i3-card-lines.json (new), test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: L (~7 h) — written to STATE before the first edit
Actual: ~6.5 h (in range; the spike, the oriented boxes and the glued-label parser were most of it)

CHANGES:
I3 (spike, scratch only) | — | Four specimen cards (original Medicare, a commercial PPO, a Medicare Advantage HMO, a commercial table layout; fake data) rendered in Chromium in four conditions (clean; phone with glare; rotated 5° with glare, shadow, blur; small and compressed). PaddleOCR (PP-OCRv4 det+rec, ONNX Runtime Web) 88/88 text fields vs Tesseract.js (best_int English) 67/88 — after PaddleOCR's boxes were cut along each line's own angle (it read nothing on rotated photos before). ONNX Runtime pinned at 1.30.0 (1.31.1 was under two weeks old).
I3 | web-app/intake/script_intake.html | `INTAKE_OCR_FILES` (runtime, its loader + WebAssembly, two models, the dictionary — each a pinned jsDelivr path and a SHA-256); `intakeOcrFetch_` checks every file before use; `intakeOcrEngine_` injects the runtime from the checked bytes, hands the WebAssembly over as bytes and the loader as a blob of checked bytes, runs single-threaded on the page (the sandbox's no-cross-origin-worker rule), and never keeps a failed load; `INTAKE_OCR_PIPE` — detection map → connected regions → oriented, unclipped boxes → recognition (CTC greedy), no OpenCV. Pure: `intakeCardRows_` (levelled by the lines' median tilt), `intakeCardMbiIn_`, `intakeCardParse_` (labels glued or spaced, a value under its label by column, tail words cut, field shapes enforced, Advantage never an MBI, payers by known name), `intakeCardMerge_`, `intakeCardLine_`. UI: a "Read the insurance details from the card" button under the card images, a status line, the suggestion panel (correctable boxes, the line it makes, Use as primary/secondary — asking before replacing — Dismiss), a failure line with Try again; Clear, a send and a draft open drop what was read. ES strings throughout.
I3 | test/client/i3-card-lines.json | The REAL reader's output for the four cards × four conditions (fake data), parsed by the pins and shown by the visual scenarios.

TEST RESULTS: Pure 1541/1541, DOM 382/382; `lint:server` clean; `counts.mjs --check` agrees (pure, DOM, visual, invariants, scenarios updated by hand). End to end in Chromium through the production module and its checksum loader: 72/72 card fields; a changed checksum is refused ("keys did not match its checksum"). Bite-checks: 16 mutations — 14 BITE first time; 2 NO BITE, both real: (1) the parser's explicit "Rx Grp is not the group" exclusion was DEAD CODE (the label order and the letter lookbehind already cover it) — removed rather than pinned (g138), with the spaced "Rx Grp" form pinned; (2) the Advantage-voids-MBI guard was unreached by the pin's fixture — the pin now carries a labelled Medicare number on an Advantage card, and that mutation BITES. Visual: intake-card-read light-wide and dark-mobile, 0 overflow, no squeezed text; the first shot found the suggestion boxes unstyled (light text on a white box in dark mode) — fixed. Test Command is `manual`: S161 written; the reader has NOT yet run inside the Apps Script page — S161 is that check.
REGRESSION RISKS: (1) The reader needs cdn.jsdelivr.net at first use; a blocked network gives the "type the details" line, never a wrong value. (2) ~30 MB on first use per browser (kept by the browser cache afterwards). (3) A recognised value can still be wrong (a misread digit) — the panel tells the rep to check each against the card, and nothing is written until Use. (4) The ONNX Runtime loader is imported from a blob URL; if the sandbox refuses that import the reader fails closed with the same line.
INVARIANTS AT RISK: None — INV-402 added; g146 held (the failure line names no value), g129 held (a failed load is not kept), g112 untouched (nothing persisted by I3; the line rides the I2 draft only after Use).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (I3 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Walk S161 on DEV with specimen cards (an insurer's sample card or a card with the personal details covered — never a real patient's); it is the first check that the reader loads inside the Apps Script page | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version (rides with I1/I2)

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- If S161 shows the blob-URL import refused by the sandbox, the fallback is the pinned jsDelivr URL for that one loader file (its WebAssembly would still be checked bytes) — a one-line change, decided after the walk.
- Names and dates on the card are not read (not asked for).

DOCUMENTATION UPDATES NEEDED:
- None — the decision (`#i3-insurance-cards-read-in-the-browser`), modules.md, INV-402, S161 and the running totals were written in this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
