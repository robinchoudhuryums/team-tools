---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- SP-2: a requester's follow-up on an email thread never became pending.
  - The first member reply resolved a Spanish Inbox email thread for ever, so a follow-up question after the answer never became pending work.
  - A manual mark-resolved hid the thread for good (`if (manual[tid]) return;`), whatever came after it.
  - Now a thread is a SEQUENCE of requests. A follow-up after an answer, or after a click, is pending again. The operator's 2026-10-05 decision: the reopened request comes back UNCLAIMED.
  - Fixed with it: the voicemail resolved list read `msgs[0]` and listed only manual resolves. It now reads the same fold as the stats card.

Files modified:
- web-app/51_spanish.js
- web-app/20_timeclock.js (the Needs-you Spanish item passes the claim floors)
- web-app/metrics/script_metrics.html
- web-app/styles.html (the `.sp-followup-pill` rule)
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- test/visual/mock.js (a reopened pending item, `followUp: true`)
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: M (~7 h) — Batch 13, written before the first edit
Actual: ~3 h

CHANGES:
SP-2 | 51_spanish.js | The rule (all pure, all Node-pinned):
  - `spanishThreadRoles_(msgs, kind, …)` gives each message a role: 'request', 'resolver' or 'other'.
    - A request is the requester writing again, or any 8x8 voicemail.
    - A resolver is a member reply. A member's message answers even on a thread a member opened, as the first-reply rule read it. With no member list, any other sender answers (the old fallback).
    - 'other' is a cc'd non-member. It is NEUTRAL: it neither answers nor reopens.
  - `spanishEpisodes_(entries, manualRec)` walks the messages in time order, with the manual resolve placed AT its stamp.
    - A request opens an episode or joins the open one (a double-send is one request).
    - A reply closes the open episode. The FIRST close wins: a second reply, or a reply after the click, closes nothing.
    - The click closes what was open at its stamp. A legacy unstamped row closes whatever is open at the end, as before.
    - Returns the episodes plus `floorMs`, the last close before the open episode.
  - `spanishClaimLive_(claim, floorMs)`: a claim older than the floor was on the answered request, so it reads as null.
  - `spanishThreadFloorMs_`: one thread's floor, email or voicemail. On a voicemail thread the walk opens on the same voicemails M5's per-voicemail rule leaves pending.
SP-2 | 51_spanish.js | The readers:
  - `getSpanishInboxStats` counts, times and pends each EPISODE. A manual close is still counted and never timed (INV-187). Cache key v3 → v4 (INV-85).
  - `spanishPendingCore_`: the card is the thread's OPEN episode.
    - Aged from that episode's first request; the snippet is its newest request message.
    - `claim` goes through the floor.
    - New additive fields `followUp` and `claimFloorMs`.
    - Voicemail cards get the same floor through new `floorMs` / `resolverFrom` fields on the `spanishVmFold_` rows.
    - The pending-ids cache stores `floors` beside the ids (timestamps only); new `spanishPendingFloorsGet_` reads them.
  - `getSpanishInboxResolved`:
    - One row per answered email episode, each with its own resolver.
    - Voicemail rows come from `spanishVmFold_`, one per resolved voicemail: a member reply is timed and attributed; a manual resolve is untimed.
    - VM truncation rides the `truncated` flag.
  - `spanishThreadBodyMessage_`: Expand on an email thread shows the requester's NEWEST message (what the card shows). A one-message request reads as before.
SP-2 | 51_spanish.js, 20_timeclock.js | Claims read through the floor:
  - `spanishMyOpenClaims_` (Needs-you) and `spanishOpenLoad_` (auto-assign load) take optional floors.
  - Inside the auto-assign lock, the still-unclaimed filter uses the floor.
  - `claimSpanishThread` computes the floor BEFORE the lock (a Gmail walk plus the manual map). An old claim neither blocks a teammate nor counts as "already".
  - `getMyPendingTasks` passes the cached floors, or the live read's on a miss.
SP-2 | metrics/script_metrics.html, styles.html | The client:
  - New `spanishFollowUpPillHtml_`: a warn-toned "follow-up" pill on a reopened pending card, with its own CSS rule (g140).
  - The resolve confirm adds "If the requester writes again, it comes back as a new request, unclaimed."
  - The "permanently hide" comment is corrected.
(tests) | test/client/run.js | Moved pins:
  - M4: the load call carries the floors; a pre-reopen claim is not load.
  - R2 #4: the claim goes through the floor.
  - Fold wiring: the resolved list reads the ONE fold.
  - BIZ-2 and N3-SP: per-episode literals; v4 key.
  - C-8: floors in the cache and in Needs-you.
  - F-34, M5 and SP-3/4: their sandboxes load the new helpers.

TEST RESULTS: passed.
- Node: 1222/1222 (was 1215). Seven new pins, six of them DRIVEN:
  - The episode grid: reply/close; follow-up → new episode with the reply as floor; double-send; second reply; cc neutral; click then follow-up; click at the request; legacy; first close wins; click after the answer raises the floor; the claim live test.
  - The role grid.
  - The pending list over a fake Gmail:
    - Reopened after a reply: aged from and showing the follow-up; unclaimed.
    - Reopened after a click: a post-reopen claim stands.
    - A first request reads as before. Answered and clicked threads are not pending.
    - The cached ids carry the floors.
  - The resolved list and stats over the same threads: two answers → two rows, two resolvers; the first close wins; 4 resolved, 2 manual, 1 pending.
  - The claim guard: a pre-reopen claim does not block; a post-reopen one does; the old claimant re-claims rather than "already".
  - The voicemail fold: the floor and the resolver through the real fold.
  - Plus one wiring pin: Expand's message; the Needs-you, auto-assign and claim wiring; the pill; the confirm; CSS; the fixture.
- DOM: 219/219 (was 218). New drive: a reopened card renders the pill and no claim pill and counts in "Auto-assign N unclaimed"; the resolve confirm carries the new sentence.
- lint:server clean; counts --check agrees; split manifest current.
- 19 bite-checks, all BITE, none NO BITE:
  - episodes ×2, pending claim, pending age, claim guard, Needs-you, load, Expand body;
  - resolved one-row-per-thread, stats first-episode-only, roles, VM floor ×2 (the first was caught only by a source assertion, so a driven VM pin was added and re-bitten), VM resolver, auto-assign;
  - getMyPendingTasks, DOM pill, DOM confirm.
- Visual: spanish-light-wide and spanish-light-mobile have no overflow (font-CDN certificate aside). The jrivera card shows the "↺ FOLLOW-UP" pill with no claim; the header reads "Auto-assign 2 unclaimed".
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S80 (resolution share): PASS, with a CHANGE.
  - Voicemails answered by a member reply now join the resolved list and the chart, credited to that member. Before, only manually resolved voicemails were listed.
  - A thread answered twice credits both answers.
  - The cycle 23 SP-1 step (a repeat voicemail after a resolve) reads as before: the resolve fold and the per-voicemail rule are unchanged.
- S105 (auto-assign): PASS. A reopened request is unclaimed, so it is offered, counted in the button and assigned. A pre-reopen claim is not counted as load.
- S121 (assignment → Needs-you): PASS. A rep's claim on an answered request leaves their Needs-you list when the request reopens. They see it again only if it is re-claimed or assigned.
- S93 (business hours): PASS, per request episode.
- S74, S101, S122 (Dept Requests): NOT APPLICABLE — untouched.
- No scenario covers SP-2 yet; S136 is owed to /sync-docs.
REGRESSION RISKS:
- **A "Gracias" reply reopens.** Any message from the requester after an answer is a new pending request, including "thank you". It is one click (Mark resolved) to clear, and it fails toward "a person should look", the direction g159 requires of a heuristic that closes work. But it is new noise on the pending list and in the stats' pending count. A "thanks-only" filter would be a closing heuristic and needs an operator decision.
- **A reply AFTER a manual resolve no longer wins.** Before, a member reply anywhere after the request timed the request even when someone had clicked resolve first. Now the click closed it, so it counts as manual (untimed). This is rare: the click is for requests handled outside the thread.
- **Pending counts and resolved counts rise:**
  - Threads hidden by a manual resolve or a first reply can come back.
  - Each answered follow-up is counted.
  - The v4 key retires the cached v3 aggregate.
- **A claim needs the manual map.** `claimSpanishThread` now reads the manual-resolve tab and walks the thread's messages before the lock. A failed manual-map read fails the claim by name (SP-3 posture), where before the claim ignored that tab.
- **Short voicemails leave the resolved list.** A manually resolved voicemail under `SPANISH_VM_MIN_SECONDS` is no longer listed; it is suppressed as on the stats card.
- **Requester identity is the first message's sender.** A follow-up from a different address of the same person is 'other' (neutral) when a member list is set, so it does not reopen.
INVARIANTS AT RISK: None broken. Checked and holding:
- INV-85: cache key bumped.
- INV-187: a manual close is counted, never timed, on every surface.
- INV-31: every endpoint keeps its `canSeeSpanishInbox_` gate; the claim guard keeps the manager reassign rule.
- INV-01 / g17: claim and auto-assign writes stay inside the lock; the Gmail read happens before it.
- g34: notifications stay after the lock.
- g67 / C-8: a resolve still drops the id; Needs-you reads the same floors as the list.
- PHI: the cache holds ids and timestamps only; the resolved list still ships subject only; the audit rows are unchanged.
- M5 / SP-1: per-voicemail resolution and the latest-row resolve fold are unchanged (pins green).
- g140: the new pill class has a rule.
- g150 / X1: no new RPC.
NET SCORE: 1 − 1 = 0.
- SP-2 fired in production this month: YES (likely). A requester's follow-up question after an answer is ordinary email behaviour, and each one was invisible to the pending list, the stats and the Needs-you list.
- New failure mode, documented: YES. A courtesy "thank you" reply now reopens a request as pending work. It fails toward a look, but it is new noise.

OPERATOR ACTIONS / DEPLOY:
- Tell the Spanish Inbox members:
  - A requester writing again after an answer, or after Mark resolved, brings the request back as a new, unclaimed request with a "follow-up" pill.
  - A thank-you reply needs one Mark resolved.
  | BLOCKS DEPLOY: N
- Decide whether courtesy replies ("gracias", "thank you") should be ignored. That would be a closing heuristic: an operator call on which words count, and it must fail toward a look (g159). | BLOCKS DEPLOY: N
Deploy: Server + Client (Metrics, Dashboard): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- A courtesy-reply filter (see above). An operator decision first.
- The pending core's voicemail `seen` set is the PENDING email threads only, while the stats card and the resolved list use every group-address thread. A voicemail that also reached the group address and was answered there can be folded twice on the pending list. This is pre-existing (not changed here).
- `releaseSpanishThread` still releases a pre-reopen claim, appending a harmless release row. It has no Gmail scope by design.
- The Spanish subtitle reads "first reply from a group member", still true per request.
- No visual scenario photographs a reopened card in the expanded state.
- Editor-suite (Tests.js) cases for the episode rule and the claim floor are owed to Batch 15.
- Batch 5's follow-on ("email-request Spanish threads still read any manual resolve as resolving the whole thread") is CLOSED by this batch.

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md:
  - g155's index line: the first message is not the thread, and the first REPLY is not the end of it (SP-2).
  - g159 (a reopen fails toward a look) if wanted.
- docs/gotchas.md: g155's narrative gains SP-2.
- docs/design-decisions.md: a new decision, "A Spanish thread is a sequence of requests, and a reopened one comes back unclaimed", with an index line; amend "ONE voicemail fold serves the Spanish list and the Spanish stats card" (the resolved list reads it too).
- docs/modules.md: Metrics → Spanish Inbox (follow-ups, the pill, per-request resolved rows, member-replied voicemails attributed).
- docs/operator-state.md: the Spanish-inbox entry (a reopened request is unclaimed; the pending-ids cache carries floors).
- .cycle/config.md:
  - INVs for the episode rule, the claim floor everywhere a claim is read, and v4.
  - A new scenario S136 (follow-up after an answer and after a click; claim floor; Needs-you).
  - Extend S80 (member-replied voicemails attributed) and S105/S121.
- docs/test-harness-log.md: the Batch 13 entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
