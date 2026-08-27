---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: operator-asked (live pilot testing, 2026-08-27), not
scan-derived — three rounds, three PRs, merged same day:
  SND  | PR #189 — sender identity corrections + empty Patient & TRX warning
  BRD  | PR #190 — brand sweep: the company is "UniversalMed Supply"
  KBL  | PR #191 — KB editor loaders + converted-Doc images pending chip
Files modified: web-app/Code.js, web-app/form_public.html,
  web-app/cn/script_callnotes.html, web-app/kb/script_kb.html,
  test/client/run.js, test/visual/mock.js, CLAUDE.md, README.md

CHANGES:
SND-a | Code.js | `repSenderOpts_` display name = the agent's name ALONE.
  The "· Universal Medical Supply" suffix was the WRONG company name and
  fired live on a pilot agent's send; also unnecessary — dept mail is
  internal, external/intake mail carries the brand in its body chrome.
SND-b | Code.js | `sendRepEmail_` self-BCCs the sending agent on every
  rep-initiated send (both MailApp and GmailApp paths; append-not-clobber
  over caller bccs like INTAKE_BCC_EMAIL; case-insensitive dedupe). A true
  agent Sent-folder entry is impossible — the app sends as USER_DEPLOYING.
SND-c | cn partial | Preview warns dismissibly (uiConfirm, Continue anyway /
  Go back — the intakeWarnRecommended_ posture) when Patient Name & TRX is
  empty, reading the LIVE editable Note Reference field first; the chain
  tail split into `cnComposerPreviewChain_` so the async dialog resumes it,
  instance-guarded across the gap. A pilot email went out without a
  patient/TRX — user error a reminder would have caught.
SND-d | (no code) | The customersuccess@ sender ask was the dormant
  REP_SENDER_FROM property — the operator set it same-day; sends now go out
  from the alias via GmailApp, which also writes the deployer's Sent folder.
BRD   | Code.js + form_public.html | The wrong company name shipped in 14
  MORE user-facing strings: external customer/provider email greetings +
  sign-offs (html + text twins), the public form page ×5, the
  Access-Restricted page. All now "UniversalMed Supply" (operator-supplied
  exact name — the site is egress-blocked from the sandbox, so the name was
  confirmed via AskUserQuestion rather than guessed). The visual fixture
  still carried the retired "Avery Blake · Universal Medical Supply" From
  line (INV-185) — fixed, page.html rebuilt.
KBL-a | kb partial | `kbBtnBusy_`/`kbBtnIdle_` (the composer-Preview
  .lo-dots pattern) on Save + BOTH Doc/Sheet convert paths. Save's busy
  label names the kbdoc image-export count when that is the slow part.
  Busy disables — the L13 Save double-fire guard survives and now also
  covers the converts, which had NO guard (a double-click fired two
  conversions). Restored on every path incl. both mid-convert early
  returns.
KBL-b | kb partial | A converted Doc's images preview as a dashed PENDING
  chip ("Doc image N — appears after Save (exports to Drive)") instead of
  bare alt text, which the operator read as "the images are missing" —
  they export at Save by design (Phase 2b). kbMd_ security boundary
  unchanged: no <img>, no URL of any scheme emitted, alt stays escaped.

TEST RESULTS: pure 646 → 655, DOM 81, all green. Pins: repSenderOpts_ and
sendRepEmail_ behavioural pins REWRITTEN in place (strictEqual on the bare
name so ANY re-added suffix fails; self-BCC on both paths, append +
dedupe); CMP-4 rewritten for the chain split + warning contract; the
kbdoc-demotion pin rewritten for the chip; new KBL loader pin; new derived
BRAND tripwire (the banned literal built by concatenation so the pin never
trips on itself — INV-188 family; scans every shipped web-app file
recursively + the fixture). ~15 mutations bite-checked across the rounds.
TWO pin-integrity lessons, both recorded in CLAUDE.md: CMP-4's live-field
claim was string-presence rather than use (tightened to the ternary shape
before it bit), and the KBL round's first bite batch was TAINTED — a
broken onclick assertion kept the pin red for the wrong reason, and two
mutations silently no-opped by matching the em-dash RENDERING instead of
the file's literal — escape BYTES. Match the bytes; confirm the pin
is green before reading any bite.
REGRESSION RISKS: the self-BCC adds one recipient to every rep-initiated
send (agents' inbox volume rises — that is the feature); the TRX warning
adds one dialog to an empty-field Preview (dismissible by design).
INVARIANTS AT RISK: INV-41 (held — the warning sits BEFORE the save/
preview chain, hash contract untouched), INV-185 (fixture corrected),
INV-42/M-7 (self-BCC is inside the existing send call, no new mail site).
NET SCORE: not scored here — cycle 19's reflection owns it (treat these as
real-defect counts: the wrong-name-fired-live is a genuine production fix).

OPERATOR ACTIONS / DEPLOY:
- `cd web-app && clasp push -f` + Deploy → New version (the operator's two
  2026-08-27 deploys both PREDATE these PRs) | BLOCKS DEPLOY: Y
- Re-do the email spot-check post-deploy (From = agent name alone, sender
  address = customersuccess@, Reply-To = agent, self-BCC arrives) | N
- Press Save on the converted Doc from testing — its images export then | N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments →
Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- Batch 7 (structured intake feedback) — still BLOCKED on the operator.
- The `19pre-*` un-reflected block backlog is now 14.

DOCUMENTATION UPDATES NEEDED: None — /sync-docs applied in-session
(sender gotcha + REP_SENDER_FROM entry + two-stage-email KDD + Phase 2b
passage + S19/S63 scenarios + the 2026-08-27 operator-state entry +
README's stale manager-only Team Metrics line + narrative → 655).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
