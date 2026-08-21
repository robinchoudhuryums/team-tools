# Pilot-feedback Round 1 — broad-implement block (2026-08-21)

Between-cycles operator feature round (the 18pre convention): pilot-agent
feedback items #8 / #1 / #2, operator-approved in-session. Commit c15eec7 on
branch `claude/team-tools-roadmap-6e2l97`.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- R1-#8 | Agent sender identity on rep-initiated emails (display name + replyTo)
- R1-#1 | Optional comment on the Review flag (trainingQuestion mechanism mirrored)
- R1-#2 | Inbound/outbound call-direction toggle on Call Notes

Files modified: web-app/Code.js, web-app/cn/script_callnotes.html, test/client/run.js

CHANGES:
R1-#8 | Code.js | New `repSenderOpts_(emp)` → `{name: '<agent> · Universal
  Medical Supply', replyTo: <agent email>}` ({} for a missing emp — Object.assign
  no-op, send proceeds with system identity). Applied via Object.assign to the
  SIX rep-initiated MailApp sends: emailFromCallNote ×3 (split-CTA internal,
  split external, single path), sendExternalEmail, intakeSendPPD,
  intakeSendAcct_ (PMD+PAP). The true From ADDRESS still cannot change
  (executeAs USER_DEPLOYING); a neutral shared sender needs a Workspace
  "Send mail as" alias — operator action, documented in the helper comment.
  Automated digests/alerts/exports deliberately keep the system identity.
R1-#1 | Code.js | sanitizeCallNotePayload_ whitelist += reviewComment (trim,
  2000-char cell cap — the trainingQuestion discipline, INV-143);
  setCallNoteFlag gains 4th param reviewComment with a `t === 'review'` branch
  mirroring the training one; sendManagerFlagDigest_ surfaces the comment in
  html + text bodies (esc_'d, gated on the CURRENT review flag).
R1-#1 | cn/script_callnotes.html | Form: `cn-review-c-row` (input
  cn-fld-review-c) shown while the review flag is selected (cnSetFormFlags_);
  card toggle prompts for an optional comment via uiPrompt (the training F8
  re-resolve pattern; cnDoToggleFlag_ widened to 6 args, all 3 call sites);
  cnReviewCommentLineHtml_ renders the comment (esc'd) on the rep card, the
  search-result card, and the manager read-only card; the Team Notes queue
  (cnMgrRenderQueue_) shows it inline. Draft/snapshot round-trip: persist /
  restore / clear / lastClearedSnapshot / submit restoreSnapshot / sticky park
  all carry `reviewC`.
R1-#2 | Code.js + cn partial | subformData.callDirection stored ONLY as
  'outbound' (absent = inbound — no migration; bounded enum, the intakeType
  posture). Client: full-width "Outbound call" toggle under the flag group,
  keyed on data-direction (NEVER data-flag — the flag writer and flags[]/
  FlagType never see it; INV-191 + INV-37/75/77 respected), state in
  form.dataset.direction via cnSetFormDirection_ (aria-pressed kept in step —
  A11); info-toned `cn-outbound-pill` on all three card renderers; 'Outbound'
  filter chip (CN_DEFAULT_FILTERS + cnNoteMatchesFilter_); server
  callNoteMatchesFilter_ mirrored for parity; drafts/snapshots carry
  `direction`.
tests | test/client/run.js | +10 pins (585 → 595), ALL bite-checked (7
  mutations, 7 bites): sanitize behavioural ×2 (cap + bounded enum), flag-
  branch source pin, digest both-bodies pin, repSenderOpts_ behavioural +
  wiring/count pin, client filter behavioural, pill behavioural, esc()/
  gating pin, draft-round-trip + identity-attribute pin. One first-write
  correction: the vm-realm deepStrictEqual prototype trap (documented in
  CLAUDE.md) — compare Object.keys().length, not a host {}.

TEST RESULTS: pure 595/595 passed, DOM 75/75 passed, node --check clean.
Editor suites (S1/S2) not runnable off-editor — post-deploy runAllTests()
owed as usual; existing Tests.js doubles verified compatible (no exact-key
subformData assertions; 2/3-arg setCallNoteFlag calls remain valid).
Regression scenarios walked (Server + CN views): S18/S19/S24/S26/S31/S32/
S49/S55/S56/S59/S60 PASS by analysis + pins; S20 PASS with a deliberate
delta (card-flagging REVIEW now shows an optional-comment prompt, the
training pattern); S1/S2 NOT APPLICABLE here (editor-only).

REGRESSION RISKS:
- Replies to dept/intake/external emails now land in the SENDING AGENT's
  inbox instead of the deployer's (the requested behavior — but the operator
  loses reply visibility they may have been relying on; dept emails still CC
  CONFIG.CALL_NOTES.CC_EMAIL and intake still BCCs INTAKE_BCC_EMAIL, so the
  org copy of the OUTBOUND mail is unchanged).
- Some strict spam filters weight From-name/reply-to mismatches; watched-for,
  not expected (same sending address + SPF/DKIM as before).
- pendingNote.subformData may now carry empty-string keys pre-confirmation;
  every consumer truthiness-checks (verified) and the server strips empties.

INVARIANTS AT RISK: None violated — INV-143 extended intentionally (pinned);
INV-37/75/77 (outbound never enters flags[]/FlagType — pinned); INV-41/111
hash inputs untouched (options added AFTER the hash check); INV-89 (new
rendered strings esc'd — pinned); INV-48/55 (snapshot/draft completeness
extended — pinned); INV-56 (review prompt sets _flagInFlight before uiPrompt);
M-7 no-mail-in-lock (no new sends; repSenderOpts_ touches no MailApp);
INV-191 (data-direction identity — pinned).

NET SCORE: 1 − 0 = +1 (the #8 misattributed-sender pilot report was a live
production defect; #1 and #2 are capabilities, not fixes).

OPERATOR ACTIONS / DEPLOY:
- (Optional, non-blocking) For a true NEUTRAL sender: create/grant a Gmail
  "Send mail as" alias (e.g. teamtools@umsupply.com) on the deploying
  account; a follow-on code change would then pass `from` via GmailApp.
  | BLOCKS DEPLOY: N
- Standard deploy: `cd web-app && clasp push -f`, then Apps Script editor →
  Deploy → Manage deployments → Edit → New version → Deploy. NOTE this round
  stacks on the still-undeployed PR #176 + #177 — one deploy ships all three.
  | BLOCKS DEPLOY: Y (the deploy itself)
- Post-deploy: run runAllTests() in the editor; spot-check ONE dept email +
  ONE intake email — confirm the From display name reads
  "<Agent> · Universal Medical Supply" and Reply-To is the agent (the
  standing email spot-check — CI cannot verify mail headers).
Deploy: Server + Client (Call Notes views): `cd web-app && clasp push -f` +
New version. Test Suite: nothing to deploy (Node harness, CI-run).

FOLLOW-ON ITEMS:
- Neutral-sender alias (above) — revisit after the operator decides.
- Outbound could optionally join the CRM copy template ({callDirection}
  token) and manager Stats/history group chips — deferred, not asked for.
- History group chips (cnHistGroupChips_) count flags only; an outbound
  count there is a cheap add if the Spanish team asks.
- Round 2 of the roadmap (Spanish claim/assign + scheduled-call reminders)
  is next per the approved sequence.

DOCUMENTATION UPDATES NEEDED (for /sync-docs):
- CLAUDE.md SubformData gotcha: blob now also stores reviewComment +
  callDirection (client-writable, INV-143-whitelisted, bounded).
- INV-143 entry: whitelist is now trainingQuestion + completionSeconds +
  intakeType + reviewComment + callDirection('outbound' only).
- INV-77/S20/S35-adjacent text: setCallNoteFlag has a 4th reviewComment arg;
  card-flagging review prompts like training.
- localStorage entry: umsCallNotesActiveFormDraft shape gained reviewC +
  direction (same TTL).
- Operator State Checklist: add the round entry — NO new operator state; four
  behaviour changes to expect (agent name/reply-to on rep emails, review
  prompt, review comment lines in queue/digest, Outbound toggle + chip).
- Weekly-digest description: Review digest carries Comment lines.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
