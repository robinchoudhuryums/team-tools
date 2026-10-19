---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: operator round 2 (2026-10-16), planned and approved in session — no scan finding IDs.
  B0 the resume-shift DOM test failed once a day at 18:30 UTC (test pins the rep frame's clock)
  B1 PMD drew the required primary phone as optional and the secondary as required; the progress ring counted optional rows
New capabilities (G/ST): none from a scan — operator requests:
  B1 Other Notes as its own section; attestations amber/green on the form; example text (EN/ES)
  B2 the intake call note in the standard note template (patient as caller, Self, primary phone)
  B3 insurance-card images added at the bottom of the PMD/PAP form; survive the preview
  B4 pay statement: a manager's Edit day (opens Day Edit, reopens after save); each adjusted day's request reason + status
  B5 ME / PPD Availability as a weekday × AM/PM grid with Open, plus notes; one string answer
  B6 Sales and PAP teams as intake recipients from the CDR roster (first.last@universalmedsupply.com)
  B7 the intake emails redesigned (light blue; ledger; attestation boxes; cards in Insurance; the PPD grouped as on the form)
  B8 Manage Time flags a clocked-in rep idle 30+ min, scheduled breaks excluded (in-app)
  B9 (follow-on, operator 2026-10-19) insurance-card photos fitted in the browser before they are kept (kbImgPrepare_: 1600 px / 1.5 MB)
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/60_intake.js, web-app/intake/script_intake.html,
  web-app/tc/script_timeoff.html, web-app/tc/script_manager.html, test/client/run.js, test/client/dom/runDom.js,
  test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md (counts), .cycle/config.md (INV-388..391, S144..S146), .cycle/STATE.md
Estimate: B0 S (~0.5 h) · B1 S (~3 h) · B2 S (~1.5 h) · B3 M (~3 h) · B4 M (~3.5 h) · B5 M (~4 h) · B6 M (~4.5 h) · B7 M-L (~6 h) · B8 M (~4 h) — ~30 h, written before the first edit
Actual: ~9 h of session time across the nine batches (B0 0.3 · B1 1.5 · B2 0.5 · B3 1 · B4 1 · B5 1 · B6 1 · B7 1.7 · B8 1); every batch came in well under its estimate

CHANGES:
B0 | test/client/dom/runDom.js | rebinds timeHmTz to midday for the resume test; a new test drives the refusal side (bitten)
B1 | 00_config.js, script_intake.html, run.js | PMD secondary [2→3] client + server; ring skips secondary rows; Other Notes a closing section; attest rows tinted by :has(data-val); INTAKE_ACCT_PLACEHOLDERS
B2 | script_intake.html | intakeNoteFields_ (pure) + intakeAutoLogNote_ through cnFormatNoteForCopy_
B3 | script_intake.html | intakeImagesSectionHtml_ on the form; preview keeps images and states the count; one session paste listener (intakePasteImage_) that skips text pastes into fields
B4 | 20_timeclock.js, script_timeoff.html, script_manager.html, mock.js | payStmtAdjustments_ (pure) + adjError; Edit day + return ticket (payStmtEditDay_ / payStmtReturnAfterEdit_); Day Edit clears a stale ticket and hands back on save
B5 | script_intake.html | intakeAvailSerialize_/Parse_ (pure, 1024-subset round trip), the grid control, delegated wiring, repaint on restore
B6 | 00_config.js, 60_intake.js, script_intake.html | intakeTeamEmail_/intakeTeamRosterParse_ (pure), intakeTeamRoster_ (cached on success), kind:'team' resolved against today's roster; optgroups + address hint; intakeRecipientSpec_ shared
B7 | 00_config.js, 60_intake.js | intake palette (info tokens); new account and PPD builders; intakePpdEmailUnits_ (pure); tones/picked mirrored + pinned; images inside Insurance, none when absent
B8 | 00_config.js, 20_timeclock.js, script_manager.html, mock.js | PRESENCE_LAST stamp (6 h); repIdleMinutes_ + liveIdleMin_ (pure-ish); idleMin on liveStatus; chip + summary line
B9 | script_intake.html | intakeProcessImage_ fits each image through kbImgPrepare_ before keeping it; a refused image is toasted, never attached (Estimate S ~1 h, actual ~0.4 h; bitten)

TEST RESULTS: Test Command is manual. Node harness 1394/1394, DOM harness 280/280, lint-server clean, counts --check agrees; every pushed commit's CI read green through B3 at the time of writing (B4–B8 runs to be read). Bite-checks: B0 guard, B1 ring + notes, B6 roster check, B7 images + tones, B8 break overlap — all BITE. Regression scenario walks (S144–S146, and the intake/time-clock scenarios S25, S59–S62, S128, S137) need the deployed app — NOT walked; owed after the deploy.
REGRESSION RISKS: (1) The intake email is rebuilt — a recipient's mail filter keyed on the old navy layout or the "Attached Images" heading would miss it. (2) A team address is built from the roster name; a person whose real address does not follow first.last is sent to a wrong address — the picker shows the address before sending, and the operator says all follow the pattern. (3) The idle chip reads a long call with the app untouched as idle (stated in its tooltip). (4) The paste listener now acts on the whole PMD/PAP page while its drop zone is on screen.
INVARIANTS AT RISK: INV-41 (preview hash) — preserved: the account send hashes the image-free body; INV-89 (esc_ on every patient field) — pinned for both new builders; g33 (peer view) — idleMin never on getTeammateStatus (pinned).
NET SCORE: 2 production fixes (B1 required/optional phone; B1 ring counting optional rows) − 1 new failure mode (B6 name-derived address can be wrong for an off-pattern name) = +1

OPERATOR ACTIONS / DEPLOY:
- Deploy: cd web-app && clasp push -f, then New version | BLOCKS DEPLOY: N
- Check the CDR Report's "DO NOT EDIT!" tab has columns headed exactly "Sales" and "PAP" (any case) before the first preview; anyone with a non first.last address needs a Custom send | BLOCKS DEPLOY: N
- Walk S144–S146 on DEV or prod after the deploy | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then Apps Script editor → Deploy → Manage deployments → Edit → New version → Deploy

FOLLOW-ON ITEMS:
- (done as B9, 2026-10-19) the image shrink step.
- The idle alert is in-app only; an email/digest version would need a 15-minute trigger (one more installable trigger) — the operator chose in-app first.
- PAP Q (a PAP child department on the roster) is not listed — only "Sales" and "PAP" as asked.
- A visual scenario for the pay statement modal does not exist; B4 was checked by DOM drives only.

DOCUMENTATION UPDATES NEEDED:
- Done by /sync-docs 2026-10-19: modules.md (Intake, Time Clock), operator-state.md (the DO NOT EDIT! roster tab), design-decisions.md (two decisions + the intake-chrome amendment), operator-log.md (2026-10-19), gotchas.md (g129 amendment, new g172).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
