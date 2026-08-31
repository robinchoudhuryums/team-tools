---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- T1 | intakePreviewPMD / intakeSendPMD / intakePreviewPAP / intakeSendPAP had
  ZERO coverage of any kind, while their PPD sibling was well covered — same
  PHI store, same two-stage preview hash gate.
- T2 | Five more public endpoints had zero coverage: getIntakeAgents,
  getFormCatalog, getMySentForms, authorizeGmailScope, getMyCallNotesRange.
- T3 | The visual matrix covered 18 of 29 registry tabs; both Intake ACCOUNT
  forms and Team Notes (the Call Notes manager surface) were never shot.
- T4 | The documented uncovered-tab list was prose and had drifted to naming
  3 of 11 real gaps.
(T0 — the un-run editor suite — was closed by the operator: 296/296 green.)

Files modified:
- web-app/Tests.js
- test/client/run.js
- test/visual/mock.js
- test/visual/shoot.mjs
- CLAUDE.md
- README.md
- .cycle/STATE.md

CHANGES:
T1 | web-app/Tests.js | Four cases. The account-form email builder gets the
  escaping pin its PPD twin has had since INV-89 — same class of patient field,
  same innerHTML preview modal, same sent email — exercising BOTH layouts and
  both branches (a header row reaches the cell differently than a value row).
  Preview succeeds on both forms, returns a real 64-hex hash, and the two forms
  hash DIFFERENTLY: a PAP preview must not authorize a PMD send. The send hash
  gate is checked three ways per form — no hash (the direct-RPC path that skips
  Preview), a stale hash, and the sibling form's genuinely VALID hash, which a
  garbage hash cannot reach. Auth and blank-patient refusals assert the shape
  each endpoint actually returns (bare {error} for the preview reads,
  {success:false} for the send writes). Every rejection fires before recipient
  resolution and MailApp, so nothing sends or stores.
T1 | test/client/run.js | GATE-SHAPE now follows a one-line DELEGATING wrapper
  to its delegate. The four intake endpoints are `return intakeSendAcct_(…)`
  inside a try/catch whose own `success: false` satisfied the check regardless
  of the delegate — a pin that could not fail on them. Found by bite-checking
  T1's assertions against it.
T2 | web-app/Tests.js | Two cases. For the four reads the value is in what they
  REFUSE and what they DON'T return, so that is what is asserted:
  getIntakeAgents must return {id, name} exactly — agent emails are resolved
  server-side precisely so they never reach a client — and getFormCatalog
  metadata only, never the fileName or fetch URL. Key sets are asserted
  exactly, so an added field fails rather than slipping through.
  authorizeGmailScope's gate is pinned to throw BEFORE GmailApp.
  getMyCallNotesRange gets its validation, its 90-day cap and the boundary
  (an 89-day span must not be refused — asserted as "does not say exceeded"
  so it stays independent of the test rep's enrollment).
T3 | test/visual/{mock.js,shoot.mjs} | Scenarios for intakePmdAccount,
  intakePapAccount and callNotesManage. The Team Notes fixtures mirror
  callNoteRowToObject_'s return plus the two fields managerAggregateFlagged_
  attaches (INV-185).
T4 | test/client/run.js + CLAUDE.md | VIS-COVER derives the uncovered-tab set
  from the TOOLS registry vs shoot.mjs (resolving defaultTab for
  {tool, tab:null} scenarios) and checks it against a VISUAL-GAP-TABS marker
  line. It does NOT demand full coverage — a scenario needs fixtures and some
  tabs are low-value — only that the doc and the matrix agree, so a gap can be
  accepted deliberately but never grow silently. Modal/overlay states are not
  tab-shaped and stay outside the marker, which the doc says.

TEST RESULTS: pure 697 passed / 0 failed (was 696); DOM 82 passed / 0 failed;
visual matrix 58 scenarios, 0 missing, 0 overflow (was 55). The editor suite
grows 296 → 302 and executes at the operator's next run. Regression scenarios
walked: S59/S60 (intake PPD + PMD/PAP send — the new cases are the automated
half of S60's preview/hash steps), S26 (manager per-rep Team Notes — now also
on camera). 3 mutations bite-checked, 3 bite: dropping a tab from the marker,
dropping a SCENARIO, and turning the intake send delegate read-shaped (which
did NOT bite before the GATE-SHAPE fix — that is what exposed it).

REGRESSION RISKS:
- None to app behaviour: no `web-app/*.html` or `Code.js` change in this round.
- The editor suite's expected count moves, so a stale "expect 296" would read
  as a failure. Updated in CLAUDE.md in both places it appears.

INVARIANTS AT RISK: None. INV-89/111 gain coverage they were asserted to have
but did not; INV-185 honored in the new fixtures; INV-179 extended (the gap
list joins the derived-not-hand-listed family).

NET SCORE: 0 production fixes − 0 new failure modes = 0 (a coverage round; the
value is in what it now guards, not in a behaviour change)

OPERATOR ACTIONS / DEPLOY:
- Next `runAllTests()` expects 302, not 296. | BLOCKS DEPLOY: N
Deploy: rides the existing pending deploy; no new step.

FOLLOW-ON ITEMS:
- Eight tabs remain unshot (the marker names them). callNotesHistory /
  callNotesSearch reuse the Log view's card vocabulary; myDocs / docsManage /
  trainingManage are the two halves of Training & Employee Docs.
- 79% of the pure harness is source-scanning rather than behavioural (462 of
  584 blocks, measured). Often correct for wiring and coupling invariants, but
  worth biasing new work toward behavioural pins where the logic is real.
- The DOM harness is concentrated in the shell and Call Notes; Time Clock's
  punch state machine has one test.

DOCUMENTATION UPDATES NEEDED: None outstanding — README 55→58 scenarios,
CLAUDE.md gained the VISUAL-GAP-TABS marker, a coverage-round operator entry,
the 302 expectation in both places, and the narrative pin count; STATE.md's
Test Command line updated.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
