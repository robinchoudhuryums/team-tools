---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the follow-on items Batch 13 left that need no operator decision):
  FV1 — the card reader could split ONE card into two suggestions (a second photo with a character misread; a payer printed two ways) and the rep had no way to join them (Batch 13's own new failure mode)
  FV2 — the intake feedback endpoint, open to any org sign-in since F22, had no limit on calls per sender
  FV3 — the lookbehind pin checked one construct; nothing held the client scripts to a syntax level
  FV5 — the original I3 design note still described "front and back merge" as the whole rule (docs only)
  NOT implemented, though it was in this pass's estimate: FV4 — the card reader's toast and "Replace?" dialog in Spanish on the Spanish form. On reading the module, every Intake toast and dialog is English on the Spanish form (the Spanish is for the questions read to the patient); translating these two would have made them the exception.
New capabilities (G/ST): None
Files modified: web-app/intake/script_intake.html, web-app/60_intake.js, web-app/00_config.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/shoot.mjs, CLAUDE.md, .cycle/config.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: M (~5 h), written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
FV1 | web-app/intake/script_intake.html | Every offered card after the first carries "Same card as Card N" (the card above it). `intakeCardJoin_` replaces the upper card's fields with `intakeCardJoinFields_` — the upper value per field, a blank filled from the lower card, and every field the two reads DISAGREED on marked "Check this one" — keeps both cards' image numbers, removes the lower card, redraws and puts the cursor in the first marked box. Nothing reaches the form. The button is not offered, and a direct call refuses, where the join would drop a Medicare ID one of the two holds (`intakeCardCanJoin_`, derived from the merge itself).
FV2 | web-app/60_intake.js, web-app/00_config.js | `submitIntakeFeedback` asks `intakeFeedbackAllowed_` after it has identified the caller and before the lock: a cache counter per sender per hour (`INTAKE_FEEDBACK_MAX_PER_HOUR`, 12). Every identified call counts, refused ones too, so guessing submission ids spends the same allowance. Past the limit: "That is a lot of feedback in one hour — nothing more was sent. Try again later." The first refusal of an hour writes one AuditLog row (`IntakeFeedbackLimited` — the sender and the limit, nothing typed). A cache that cannot be read allows the call.
FV3 | test/client/run.js | A pin parses every script block of every client partial in both apps at ES2015 — the level they were measured to parse at — and fails on anything newer. No product code changed.
FV5 | docs/design-decisions.md | A note on the I3 entry: the merge runs only within a card since F21, and a split can be joined since FV1.
Pins | test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs | Three pure pins, one DOM drive; the mobile two-card visual scenario now shows two plan cards so the join button is on camera. One older pin followed (the F22 pin stands the limit in).

TEST RESULTS: passed. Pure 1800/1800 (with REQUIRE_DEPS), DOM 505/505; `lint-server`, `split-manifest --check`, `handbook-sync --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. The two two-card visual scenarios measure 0 px overflow, no runaway height, no squeezed text, no console error; the mobile shot with the join button was read.
  Bite-checks: 20 mutations (12 pure, 8 DOM), 20 bit, each on its first run.
  CI: both jobs (client-tests; visual-layout) completed with conclusion success on 50b2928 (the code, pins and drive) and e779387 (the docs). Batch 13's own last commit, 4b99c1b, whose run was not read when its block was written, is green too. The commit that adds this block's last lines and the checkpoint is pushed with it; its run is not read here.
  NOT verified here: nothing ran in a deployed Apps Script project, and the editor suite was not run. The feedback limit was driven against a stand-in cache, not the real CacheService (the activity-log limit it copies has an editor test against the real one; this has none). The join was driven over a fixture read with one character changed by hand — no real misread photo was used. FV3 checks syntax as acorn judges it; no old browser was opened.
  Regression scenarios whose Subsystem overlaps the modified files (Server; Client (Intake views)): every scenario of those subsystems, and the new S208 — NOT WALKED: each is a browser or editor walk on a deployed instance (Test Command is `manual`). What stands in: the driven pins, the DOM drive and the measured shots.
REGRESSION RISKS: (1) FV2 — a real person who sends a thirteenth piece of intake feedback inside one hour is refused (their text stays in the page). The limit is per sender across all submissions. (2) FV1 — a rep can join two cards that really are different (two plan cards); the result is one line with the disputed fields marked, which is what F21 removed, now by a person's press. There is no undo short of Dismiss and reading again. (3) FV1 — the upper card's value is kept; when the LOWER read was the right one the rep has to type it (the box is marked and focused). (4) FV2 — the counter is in the script cache, which HEAD and every versioned deployment of one project share, so a sender's allowance is one across them; the DEV instance is a separate project with its own. (5) FV3 — a contributor who needs newer syntax meets a red pin and must raise the level deliberately.
INVARIANTS AT RISK: None broken. INV-452 (Batch 13) holds: the grouping rule is unchanged, the merge still runs only within a card — a join is that same merge, asked for by the rep — and the feedback caller is still identified before the lock (the limit sits between the two, also before the lock; F58's driven pin passes). The PHI boundary holds: the new audit row carries no feedback text (pinned). g157 (the script cache is shared by every deployment): the counter does not depend on the code version. g129: a cache failure is not kept as a refusal. g141: the redraw after a join gives the focus back. g140: the new button adds no class without a rule. New: INV-453.
NET SCORE: 0 production fixes − 1 new failure mode = −1. (a) FV1 NO — the split is Batch 13's and has not been deployed. FV2 NO — the open endpoint is Batch 13's and has not been deployed. FV3 NO — no product change. (b) FV1 NO (risks 2 and 3 are a person's choice, marked on screen). FV2 YES — the refusal in risk 1. FV3 NO. Two of the three close gaps Batch 13 recorded against itself before it reached production.

OPERATOR ACTIONS / DEPLOY:
- No Script Property, tab or column to set | BLOCKS DEPLOY: N
- Still wanted from Batch 12: the decision on text that begins with an apostrophe | BLOCKS DEPLOY: N
Deploy: Team Tools — `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version (rides the owed Team Tools deploys). The handbook app is unchanged by this pass.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- FV2 — no editor test drives the limit against the real CacheService; twelve an hour is a guess at "more than a person sends" and is one constant to change.
- FV1 — no undo for a join; the join's toast is English on the Spanish form, like the rest of Intake's toasts.
- FV3 — syntax only: an API a browser lacks is not seen. Which browsers the app must open in is still written nowhere; raising the pin's level is where that decision has to be made.
- NOT taken, each a design choice or waiting on a decision: the Intake purge (G1, an expansion item); checking that a feedback sender was a recipient of that submission; adding the two-card scenarios to CI's fixed subset; the leading apostrophe (Batch 12).
- Batch 14 (Docs and tooling) and the scan's F36 items stand as planned.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this pass: CLAUDE.md (clauses on g173, g118 and g167; the decisions index; the counts block), docs/gotchas.md (three amendments), docs/design-decisions.md (the entry, with what was not taken; the I3 note), docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-453; S208).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
