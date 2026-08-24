# Pilot-feedback Round 2 — broad-implement block (2026-08-24)

Roadmap round 2 (operator-approved sequence): Spanish Inbox claim/assign (#4)
+ scheduled-call reminders (#3). Commits 87→ (feature) + 3188e79 (wrap fix)
on `claude/team-tools-roadmap-6e2l97`, stacking on rounds 1 + follow-ons.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- R2-#4 | Spanish Inbox claim / manager-assign on pending requests (advisory)
- R2-#3 | Scheduled-call reminders (rep-created, shell-delivered)

Files modified: web-app/Code.js, web-app/script_core.html,
web-app/metrics/script_metrics.html, web-app/cn/script_callnotes.html,
web-app/styles.html, web-app/Tests.js, test/client/run.js

CHANGES:
R2-#4 | Code.js | New `SpanishClaims` tab on the ADP sheet (auto-provisioned,
  APPEND-ONLY, PHI-free: threadId + internal emails + ms NUMBER cells — the
  SpanishManualResolved posture; never subject/body). Pure Node-pinned
  `spanishClaimsFold_` (LATEST row per thread wins — claims genuinely change
  hands, unlike resolve's idempotent first-wins; a 'release' row clears;
  assignedBy recorded only when actor ≠ claimant) + bounded-tail
  `spanishClaimsMap_`. `claimSpanishThread(threadId, assigneeEmail?)`:
  canSeeSpanishInbox_-gated, Gmail scope-guarded like resolveSpanishThread,
  locked (INV-01); self-claim for any member; assigning someone ELSE is
  manager-only and the assignee must be a configured member; a non-manager
  cannot claim over someone else's live claim (advisory ≠ free-for-all).
  `releaseSpanishThread`: claimant-or-manager, idempotent, locked. Both audit
  `SpanishInboxClaim` (threadId + claimant — internal identities only).
  `getSpanishInboxPending` now attaches `claim` per item + ships `members` +
  `self` (all additive — the dashboard Spanish card and older fixtures ignore
  them).
R2-#4 | metrics partial + styles.html | Pure pinned `spanishClaimPillHtml_`
  ("you" for own claim, name + tooltip otherwise, nothing when unclaimed) +
  `spanishClaimControlsHtml_` (Claim when unclaimed; Release for claimant or
  manager; manager-only Assign select over members, aria-labeled). Handlers
  update the item's claim in state (the SWR cache half shares the object
  reference) and re-render the list only. CSS: `.sp-claim-pill(.mine)` /
  `.sp-assign` / `.sp-claim-release`; `.sp-task-actions` gained flex-wrap
  (five controls overflowed the no-wrap row at 390px — intrinsic reflow, no
  A2 breakpoint owed).
R2-#3 | Code.js | New `ScheduledCalls` tab on the FORMS PHI STORE
  (getFormsSS_ — the label plausibly names a patient, so it lives beside
  FormTokens, never a PHI-free tab); times are EPOCH-MS NUMBER cells (immune
  to the whole Sheets date/locale-coercion class). Pure pinned
  `schedValidateShape_` (INV-04 regexes, label trim + 300 cap + neutral
  default, lead clamp 0..120 default 5). `createScheduledCall` (caller-scoped,
  locked, wall time parsed in the REP's OWN tz server-side via
  Utilities.parseDate — no client tz arithmetic; past-reject + 60-day
  horizon; 20-active per-rep cap; audit row carries the id ONLY — the label
  never reaches the shared AuditLog, INV-32), `getMyScheduledCalls`
  (caller-scoped, bounded tail, soonest-first, rowIndex never leaves the
  server), `setScheduledCallStatus` (done/cancelled, OWN rows only — a
  foreign id reads as not-found, locked). Status compare normalized in the
  ONE reader from birth (the DR.STATUS/INV-183 lesson).
R2-#3 | script_core.html | Shell delivery: `SCHED_STATE` + pure pinned
  `schedDue_` (fires from whenMs − lead to 30 min past due; non-active/junk
  never) + `schedTick_` as section (d) of `remindersTick_` — deliberately
  NOT behind the dayOff gate (a self-scheduled Saturday call is deliberate;
  the INV-190 per-branch rule). Fires through `remindOnce_` ('sched:'+id) so
  the chime + sticky toast dedupe across every open window incl. the pinned
  pop-out. RPC discipline (INV-190): one boot fetch (+7s, off the critical
  path), a refetch after every mutation, and a 10-min-throttled refetch ONLY
  while a non-empty active list exists — an empty list never polls. A
  reminder created in ANOTHER window appears after the next boot/mutation
  (documented v1 limit); a CLOSED browser gets nothing (Apps Script has no
  background push — stated in the modal copy).
R2-#3 | cn partial | CRUD surface: a bell button in the Log header + a
  "schedule call-back" More-menu action on note cards (prefills the label
  from caller/TRX). `ensureOverlay('cn-sched-overlay', {label, onClose})`
  modal (A14-named; idempotent close): date/time/label/lead create form
  (all inputs label-for named — the A14 ratchet holds), an upcoming list
  with overdue tone + Done/Cancel (aria-labeled), esc()'d labels throughout.
  `cnSchedListChanged_` is the core→CN typeof-guarded refresh hook (the
  INV-148 cross-partial pattern).
tests | +7 pins (600 → 607), ALL bite-checked (8 mutations, 8 bites):
  fold behavioural, endpoint contract pins (gate/scope/assign/steal/lock/
  PHI-free audit), pending-payload additive fields, role-based claim UI
  behavioural (incl. esc), schedValidateShape_ behavioural, sched endpoint
  contract (rep-tz parse, horizon, cap, id-only audit — the mutation planted
  the label into the audit note and the pin bit), schedDue_ behavioural +
  ticker/fetch/hook wiring. Tests.js: claimSpanishThread +
  releaseSpanishThread joined the omnibus Spanish gate cases (must reject
  non-members BEFORE any Gmail/store access).

TEST RESULTS: pure 607/607, DOM 75/75, node --check clean (Code.js +
Tests.js). Scenario walk (Server/shell/Metrics/CN/styles): S80 PASS
(resolved path untouched); S76 PASS by analysis + pins (ticker adds zero
per-minute RPCs; new section fires only from a fetched non-empty list);
S25 PASS (sched reminders fire in pop-outs by design — the feature's point);
S54 PASS via the A14 dialog pin; S18/S20 PASS (More menu addition additive);
S1/S2 NOT APPLICABLE off-editor (the extended omnibus Spanish cases run at
the post-deploy runAllTests()).

REGRESSION RISKS:
- getSpanishInboxPending now also reads the bounded SpanishClaims tail per
  call (same cost class as the existing manual-resolved map read).
- The visual matrix's Spanish fixture predates `claim`/`members`/`self` —
  cards render as unclaimed with a Claim button (guarded, correct), but the
  claimed-state UI is unshootable until the fixture gains a claim item
  (follow-on; the INV-185 posture).
- Claim races are ADVISORY by design: two agents claiming in the same second
  both succeed in sequence (latest wins, the earlier claimant sees the pill
  change on next refresh) — accepted, documented in the server comment.

INVARIANTS AT RISK: None — INV-01 (all four new mutators locked,
finally-released; the structural scan passed), INV-31 (Spanish gate + omnibus
extended), INV-32 (both audit families PHI-free — pinned, incl. the
label-never-in-AuditLog mutation), INV-83 (ensureOverlay + named dialog +
idempotent onClose), INV-04 (regex reuse), INV-190 (cost discipline pinned),
INV-114 (ScheduledCalls rides getFormsSS_ — the standing FORMS_SS_ID
segregation recommendation now also covers it), INV-169 (list cap 50 > the
20-active cap, so never silently short).

NET SCORE: 0 − 0 = 0 (two capabilities; no production bug claimed).

OPERATOR ACTIONS / DEPLOY:
- None new. Standing recommendation now carries more weight: set
  `FORMS_SS_ID` (Intake spreadsheet) so scheduled-call labels — which may
  name patients — live on the PHI store rather than the ADP fallback.
  | BLOCKS DEPLOY: N
- Standard deploy (stacks with PR #176 + #177 + rounds 1/follow-ons — ONE
  `clasp push -f` + New version ships everything), then post-deploy
  `runAllTests()` (now incl. the two new Spanish gate cases) + a hands-on
  spot-check: claim a pending Spanish request from a second account and
  confirm the pill renders for the first; schedule a reminder 2 minutes out
  and confirm the chime + sticky toast fire in a pop-out. | BLOCKS DEPLOY: Y
Deploy: Server + Client (shell/Metrics/CN): `cd web-app && clasp push -f` +
New version. Test Suite: nothing to deploy.

FOLLOW-ON ITEMS:
- Visual matrix: add a claimed-state item + members/self to the Spanish
  pending fixture, and (optionally) a sched-modal scenario, next re-shoot.
- Editor integration test for the scheduled-calls flow (create → list →
  status → cleanup incl. a ScheduledCalls sweep hook in cleanupTestData) —
  deliberately not hand-written un-runnable here; route via /test-sync.
- Claim info on the Dashboard Spanish card previews (skipped for scope).
- Roadmap round 3 (intake arrow-key nav, server-backed scratchpad,
  Reference comments Phase A) is next.

DOCUMENTATION UPDATES NEEDED (adds to the two owed /sync-docs lists):
- Storage map: `SpanishClaims` tab (ADP, PHI-free, append-only) +
  `ScheduledCalls` tab (forms PHI store) rows; the FORMS_SS_ID
  recommendation now names scheduled calls too.
- INV-31 amendment text: seven Spanish-gated endpoints (claim/release
  joined), omnibus set updated.
- Spanish Inbox KDD: claim/assign paragraph (advisory semantics, steal
  guard, audit action `SpanishInboxClaim`).
- Reminders KDD/INV-190: section (d) scheduled calls — per-branch dayOff
  exemption, fetch discipline, cross-window dedupe, closed-browser limit.
- New audit actions for the admin sheet-viewer tone map if desired
  (`SpanishInboxClaim`, `ScheduledCallCreate`, `ScheduledCallStatus` —
  neutral tone by default today).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
