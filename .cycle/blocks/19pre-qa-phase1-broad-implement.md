---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: QA module Phase 1 (operator /broad-implement,
2026-08-27) — call-recording review queue with Drive-drop ingestion,
chunked audio playback, and timestamped comments. Both locked operator
decisions honored: (1) recordings are dropped into ONE Drive folder and
indexed by a manual Sync; (2) agents do NOT see their reviews in v1 —
the whole tool is gated to managers + QA_MEMBERS.
Files modified: web-app/Code.js, web-app/script_core.html,
web-app/index.html, web-app/qa/script_qa.html (NEW), web-app/Tests.js,
test/client/run.js, test/client/dom/boot.js, test/visual/mock.js,
test/visual/shoot.mjs, CLAUDE.md, .cycle/STATE.md

CHANGES:
QA-server | web-app/Code.js | canSeeQa_ (managers + QA_MEMBERS — a THIRD
  gate tier, 'QA access required.', the canSeeSpanishInbox_ pattern);
  getQaSS_ (QA_SS_ID, NO fallback — the HR_DOCS_SS_ID posture);
  QaRecordings + QaComments provisioners (plain-text-pinned free-text
  columns, NUMBER ms cells); getQaQueue (notConfigured shape, bounded
  tail, comment counts, INV-169 cap+total); qaSyncRecordings (idempotent
  by FileId before any write, audio-mime-only, bounded + truncated
  reported, counts-only audit — file names can carry patient/agent
  names, INV-32); qaSetRecordingStatus (enum-bounded); qaAssignRecording
  (Spanish-claim rules: self-claim, manager assign-other validated
  against QA_MEMBERS, steal guard, idempotent release);
  qaGetAudioChunk (the kbGetImageData Drive boundary — folder parentage
  BEFORE bytes, size cap from metadata, >40MB names the Drive fallback,
  pure qaChunkRange_ slicing); qaListComments/qaAddComment/
  qaDeleteComment (target-must-exist, bounded anchor, refuse-over-cap,
  soft-delete author-or-manager, id-only audits). getEmployeeState ships
  canSeeQa.
QA-client | web-app/qa/script_qa.html + script_core.html + index.html |
  eighth TOOLS entry (qa/qaQueue, managerOnly + also:'canSeeQa' — hidden
  from agents via toolVisibleForUser_); view-as personas carry canSeeQa
  (csr/spanish false, manager true). Queue: filter chips (aria-pressed),
  status/assignee pills, claim/release/manager-assign (uiPrompt validated
  against members), Sync button. Detail: Blob-URL player assembled from
  base64 chunks (seq-guarded INV-156, object URLs revoked), speed chips,
  space/←/→ shortcuts (contenteditable-safe), click-to-seek comment
  timeline + markers, add-comment at playback position. Empty states
  .qa-empty; failures errorStateHtml_; A2 breakpoint at 700px; A14 names.

TEST RESULTS: pure 660→667 / DOM 82, all green. 6 mutations / 6 bites —
TWO pins strengthened when their first bite exposed them:
indexOf('known[id]') matched the map-BUILD site so deleting the
idempotence skip passed (now the consult form), and a bare >=2 count of
the audioSeq guard passed with the one before the chunk APPEND deleted
(now anchored between handler and append). QA-3's audit match hit the
INV-188 quoted-semicolon trap on first write (the notes string contains
'; ' separators) — re-anchored to the call's tail. Parse-guard +
DOM-PARTIALS + view-as pins extended in place for the new partial/flag.
Editor suite +1 (qa_gates_rejectNonMember) ≈ 311 — post-deploy
runAllTests expects 295. Visual matrix 49→51 (qa-queue wide + mobile):
full 51-scenario shoot 0 missing / 0 overflow, QA shots eyeballed
(status tones, "you" pill, 8-tool mobile nav holds).

REGRESSION RISKS: additive throughout — no existing endpoint, store, or
registry key changed shape; empState gains one boolean; the mobile
bottom nav shows 8 tools ONLY for QA members/managers (agents keep 7).
INVARIANTS AT RISK: none violated; INV-196 ADDED (gate tier + store +
Drive boundary contract). INV-136's admin count deliberately unchanged
(QA is the third tier, like Spanish).
NET SCORE: 0 production fixes (new capability) − 0 new failure modes = 0
(capability: 1)

OPERATOR ACTIONS / DEPLOY:
- Set QA_SS_ID to a FRESH dedicated spreadsheet | BLOCKS DEPLOY: N
  (unset = a friendly not-configured screen; nothing else is affected)
- Set QA_RECORDINGS_FOLDER_ID to the Drive drop folder (readable by the
  deploying account) | BLOCKS DEPLOY: N
- Set QA_MEMBERS to the QA rep email(s) (empty = managers only) |
  BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with the
pending PR set). Post-deploy: runAllTests() expect 295, then the S90
walk (drop a recording, Sync, play, comment at a timestamp).

FOLLOW-ON ITEMS:
- Phase 2 (scoped, unbuilt): waveform rendering, scorecards, per-agent
  stats. Phase 3: Coach-on-this-call, sampling, calibration, digest,
  agent-facing reviews (needs the v1 gate decision revisited).
- The QA recording DETAIL is an uncovered visual scenario (the player
  needs chunked audio the mock cannot serve) — noted in the Visual
  Audit Stage list.
- Optional later: a daily sync trigger (v1 is manual by design);
  video/training playback (operator to first test a direct-group-shared
  Drive embed in Reference).
- QaRecordings/QaComments have no retention tier (the ViewUsage class —
  append-only, tail-bounded reads, no purge; acceptable at this volume).

DOCUMENTATION UPDATES NEEDED: none — applied in-session (Projects
eight-tools + QA paragraph, storage-map QA row + "Eight distinct",
Subsystems Client (QA views), INV-196, S90, QA operator-state entry,
test narrative 660→667 + matrix 51, Visual Audit Stage uncovered note,
STATE.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
