---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-06, the I3 follow-up the operator approved after asking about confidence and "cannot read" cases)
New capabilities (G/ST): I3a — a per-value "Check this one" mark from the reader's own confidence (no percentage); "Not found on the card — type it" in empty boxes; each image read on its own with a broken one named; the Rx BIN/PCN/group no longer offered (operator: not used)
Files modified: web-app/intake/script_intake.html, test/client/i3-card-lines.json, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: S (~1.5 h) — written to STATE before the first edit (commit 1d1eba8)
Actual: ~2 h (over: the first measure — a line's least-sure character — flagged 133 of 200 lines, so confidence had to be carried per character to the value's own span; then the payer needed its letters only)

CHANGES:
I3a | web-app/intake/script_intake.html | The recognizer returns each character's probability (`probs`); `intakeCardRows_` carries them through trimming and levelling; `intakeCardMbiAt_` returns where an MBI sits; `intakeCardParse_` marks `unsure[key]` when the least-sure of the VALUE's own characters is below `INTAKE_CARD_SURE` (0.8) — the payer on its letters and digits; `intakeCardMerge_` carries each mark with its value. The panel marks such a box amber with "Check this one" (aria-describedby; never a percentage), clears it when the rep edits the box, and gives empty boxes "Not found on the card — type it". `intakeCardRead_` reads each image on its own: a broken one is named ("Could not read image N — what is shown comes from the others"), a lone broken one says "try a clearer photo", "could not be read in this browser" is kept for a reader that will not start (g142). Status lines wrap beside their icon. Then (operator, same day): the Rx BIN, PCN and group are no longer offered — their labels became `skip` labels, recognised so their values cannot run into the group or member ID, and removed from the output, the merge, the line and the panel.
I3a | test/client/i3-card-lines.json | Re-captured with per-character probabilities (same four cards × four conditions, fake data).

TEST RESULTS: Pure 1542/1542, DOM 383/383; `lint:server` clean; `counts.mjs --check` agrees. Threshold measured on the spike (four cards × five conditions incl. a blurry one): every true misread's least-sure character sat under 0.35; at 0.8, 2 of 80 correctly read values were marked (0 at the token level); after the Rx removal, 2 of the ~48 offered values in the fixture. Bite-checks: 9 of 9 I3a mutations BITE (flag over the whole row, the under-label value judged sure, the payer judged on its spaces, the flag lost in the merge, one broken image aborting all, a broken image blamed on the browser, the not-found placeholder removed, the flag surviving an edit, the flag never shown); the Rx change: 2 of 2 BITE (Rx values offered again; the Rx-group label dropped, so "Rx Group 1234567" became the group). Visual: intake-card-read light-wide and dark-mobile (now a flagged group and a broken second image), 0 overflow; the shot found the failure line's icon alone on its own line — fixed.
REGRESSION RISKS: (1) The confidence threshold was measured on generated photos; real cards may mark more or fewer values — S161 is the check, and the constant is one line. (2) A pre-I3a reader output without `probs` reads as fully sure (no marks) — only the stood-in engines in tests do that.
INVARIANTS AT RISK: None — INV-402 widened (the mark, the not-found boxes, per-image reading, the Rx `skip` labels).
NET SCORE: 1 production fix − 0 new failure modes = 1 (the broken-image case blamed the browser — a wrong-source diagnostic in I3, caught by the operator's question before deploy; the rest is new capability)

OPERATOR ACTIONS / DEPLOY:
- Walk S161 on DEV with specimen cards, now including a second unreadable image and noting which values are marked "Check this one" | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then New version (rides with I1/I2/I3)

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- If real cards mark too many or too few values, tune `INTAKE_CARD_SURE` from the S161 walk.

DOCUMENTATION UPDATES NEEDED:
- None — the decision entry (I3a + the Rx removal), modules.md, INV-402, S161 and the running totals were written in this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
