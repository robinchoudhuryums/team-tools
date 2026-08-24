# Pilot-feedback Round 1 FOLLOW-ONS — broad-implement block (2026-08-24)

Scope interpretation (stated up front in-session): the four actionable code
follow-ons from the round-1 block + STATE.md's open list. NOT included:
roadmap round 2 (its own round) and the two operator-only items (CDR col-4
header, FORMS_SS_ID segregation). Commit 86c64df on
`claude/team-tools-roadmap-6e2l97` (stacks on round 1's c15eec7).

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- FO-A | Neutral shared sender, DORMANT until configured (REP_SENDER_FROM)
- FO-B | {callDirection} available to the AUTO_COPY_FORMAT copy template
- FO-C | Outbound-call count chip in History date-group headers
- FO-D | intakeCatalogIssues_ warns on non-http pdfLink/imageUrl (seams-18 F1 follow-on)

Files modified: web-app/Code.js, web-app/cn/script_callnotes.html, test/client/run.js

CHANGES:
FO-A | Code.js | New `repSenderFrom_()` (per-execution cached): Script
  Property `REP_SENDER_FROM` names a Gmail "Send mail as" alias of the
  DEPLOYING account; validated against `GmailApp.getAliases()` — set but
  unregistered / any throw ⇒ '' with a console warning, so a bad property can
  never break sending (fail-safe, the WHATSNEW_KB_ID dormant posture). New
  `sendRepEmail_(emp, opts)` wrapper: merges repSenderOpts_ (name + replyTo)
  always; alias resolved ⇒ GmailApp positional send with `from` (options
  never repeat to/subject/body); else MailApp single-object — byte-identical
  to round-1 behavior. All SIX rep-initiated sends converted to the wrapper
  (emailFromCallNote ×3, sendExternalEmail, intakeSendPPD, intakeSendAcct_).
  No new OAuth scope (GmailApp already used by the Spanish inbox); same send
  quota. Callers' throw/catch semantics unchanged.
FO-B | cn partial | `callDirection` joined cnFormatNoteForCopy_'s token map
  ('Outbound'/'Inbound'); the DEFAULT template (server CONFIG + client
  fallback) deliberately unchanged, so existing pastes are byte-identical —
  the operator opts in by adding "Direction: {callDirection}" to
  CONFIG.CALL_NOTES.AUTO_COPY_FORMAT (the documented tuning point).
FO-C | cn partial | cnHistGroupChips_ counts notes with
  subformData.callDirection === 'outbound' per date group; info-toned
  `.cn-hg-outbound` chip renders only when > 0 (an all-inbound day is
  byte-identical to before).
FO-D | Code.js | intakeCatalogIssues_: a NON-BLANK col E/F value that fails
  the shared `intakeHttpOnly_` scheme whitelist is a WARN naming the row +
  the https:// fix — every sink (rec cards, sent email, Catalog tab) already
  scheme-whitelists these columns, so a schemeless "www.x.com" silently
  rendered no link anywhere (INV-187). Healthy catalogs (real https URLs,
  the documented operator requirement) still read ZERO issues (INV-186).
tests | run.js | +5 pins (595 → 600), all bite-checked (6 mutations, 6
  bites): repSenderFrom_ behavioural ×4 cases (unset / registered /
  unregistered / GmailApp-throw), sendRepEmail_ behavioural (dormant MailApp
  path with identity, GmailApp path with from + no positional-key repeats +
  ''-body), non-http E/F warning + https-with-query-string stays clean,
  {callDirection} substitution + default-template-unchanged, history-chip
  count + all-inbound-renders-nothing. The R1 #8 wiring pin REPOINTED at the
  wrapper (each sender uses sendRepEmail_, none also sends bare MailApp,
  emailFromCallNote count = 3, wrapper merges repSenderOpts_). TWO veteran
  intake ordering pins (M-5 cap-before-send, feedback-CTA mint-before-send)
  anchored on the literal 'MailApp.sendEmail' and correctly FAILED on the
  rename — repointed at 'sendRepEmail_(emp' with explicit -1 guards (the
  property they pin — ordering relative to THE SEND — is unchanged). The F9
  fixture rows' placeholder 'pdf'/'img' E/F values were exactly the
  schemeless class FO-D warns on — upgraded to real https URLs (the
  test-doubles-encoding-old-behavior rule).

TEST RESULTS: pure 600/600, DOM 75/75, node --check clean. Editor suites
(S1/S2) owed post-deploy as usual; verified the editor intake fixture uses
real https URLs (no new warnings) and no editor test anchors on the renamed
send. Scenario walk (Server + CN views): S19/S59/S60 PASS by analysis + the
dormant-path behavioural pin (unset property ⇒ MailApp with identity,
byte-identical to round 1); S18/S40 PASS (default paste byte-identical —
pinned); S49 PASS (unchanged path); S1/S2 NOT APPLICABLE off-editor.

REGRESSION RISKS:
- When (and only when) REP_SENDER_FROM is configured: sends switch to
  GmailApp, which ALSO writes each email to the deployer's Gmail Sent folder
  (MailApp does not) — arguably a feature (audit trail), noted so it isn't
  read as a leak. Quota pool is shared/unchanged.
- The Automation Health "Intake Offerings catalog" card may show NEW warnings
  after deploy if the live sheet holds schemeless E/F values — that is the
  fix reporting an existing silent dead link, not a new fault.

INVARIANTS AT RISK: None — M-7 no-mail-in-lock tripwire green (the wrapper
enters the sender inventory transitively; emailFromCallNote stays the one
allowlisted locked sender); INV-41/111 hash inputs untouched; INV-42
send-then-stamp unit unchanged; INV-186 (zero on healthy) holds for FO-D;
INV-129 (getIntakeCatalogHealth_ shape) untouched; INV-14 unchanged.

NET SCORE: 0 − 0 = 0 (three capabilities + one defensive visibility item —
scored strictly: FO-D's silent dead link is not a confirmed live failure
this month).

OPERATOR ACTIONS / DEPLOY:
- To ACTIVATE the neutral sender (optional, any time, no redeploy): in the
  deploying account's Gmail → Settings → Accounts → "Send mail as", add the
  shared alias (e.g. teamtools@umsupply.com; Workspace admin may need to
  create the group/alias first); then set Script Property REP_SENDER_FROM to
  that address. Until both halves exist the feature is dormant and behavior
  is exactly round 1's. A typo'd property falls back safely and logs.
  | BLOCKS DEPLOY: N
- Standard deploy (stacks with PR #176 + #177 + round 1 — one deploy ships
  all): `cd web-app && clasp push -f` → New version → post-deploy
  `runAllTests()` + the round-1 email spot-check; if the alias is configured,
  also confirm the From ADDRESS is the alias. | BLOCKS DEPLOY: Y (the deploy)
Deploy: Server + Client (Call Notes views): `cd web-app && clasp push -f` +
New version. Test Suite: nothing to deploy.

FOLLOW-ON ITEMS:
- Roadmap round 2 (Spanish Inbox claim/assign + scheduled-call reminders) —
  next, as its own /broad-implement round.
- Operator-only, still open: CDR col-4 header one-liner; FORMS_SS_ID
  segregation.
- If the operator adds "Direction: {callDirection}" to the copy template,
  consider mirroring the line into the email body's Call Details table for
  paste↔email parity (only then).

DOCUMENTATION UPDATES NEEDED (adds to round 1's /sync-docs list):
- Operator State Checklist: new OPTIONAL Script Property REP_SENDER_FROM
  (what it does, the Gmail-alias prerequisite, fail-safe fallback, the Sent-
  folder side effect, no redeploy needed).
- AUTO_COPY_FORMAT decision entry: {callDirection} token available (default
  template unchanged).
- Intake Offerings checklist entry: cols E/F must be REAL http(s) URLs — a
  schemeless value now warns in the Automation Health catalog card.
- History-view decision entry: date-group chips include an outbound count.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
