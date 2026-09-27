# Cycle State

## Current
Cycle: 22post — between-cycles OPERATOR work (the 21post pattern): the operator's
testing notes of 2026-09-25, planned 2026-09-27 as five batches (A–E, below).
Cycle 22 is CLOSED (deployed 2026-09-25, reflected +17; its whole block is in
`.cycle/HISTORY.md`). The next `/audit` or `/broad-scan` opens cycle 23.
Phase: implement
Scope: operator notes — Call Notes (Close Order, Scratchpad), Dashboard (live
view, widgets), Dept Requests (reply-resolution, sort/filter, layout), Spanish
Inbox (assign notifications)
Test Command: manual
Estimates: Batch A (1 Close reason · 2a Scratchpad fixes · 6 DR sort/filter · 7 DR manager layout): M (~6 h) — 1 S 1.5h · 2a S 1.5h · 6 S 1.5h · 7 S 1.5h — written BEFORE the first edit
Subsystem cycles since last Seams audit: 2 — reset to 0 by the 2026-09-18 audit; incremented by cycle 22's /reflect (2026-09-25). The cadence is every 4.
Updated: 2026-09-27

## The plan (operator testing notes, agreed 2026-09-27)
- **Batch A — quick fixes (M, ~6 h):**
  - **1 Close Order reason REQUIRED (S, 1.5 h).** A reason dropdown + "Other — type
    it"; presets (CONFIG): Changing suppliers · Dissatisfied with services · Due to
    cost · Patient deceased · Insurance change · No longer needed · Patient
    request · Other. Preview is blocked with the field marked; the server refuses
    a Close Order with no reason on preview AND send (validateEmailSelections_).
    The win-back nudge fires on the "Changing suppliers" preset exactly, and
    still reads free text for "Other".
  - **2a Scratchpad fixes (S, 1.5 h).** Standard modal buttons (the `.cn-act-btn`
    rule is scoped to cards, so Save/Close render unstyled); open paints the last
    text instantly and refreshes behind it; saves skip the uncached full-roster
    read; closing never waits on a save.
  - **6 DR sort + date filter (S, 1.5 h).** A visible sort (Newest · Oldest ·
    Longest open; default Newest, open first) and a date filter (7/30/90 days or
    a custom range, the shared mtDateRange_) across every list; the page says
    when the server's load window limits the results.
  - **7 DR manager/admin layout (S, 1.5 h).** A top row of the summary cards
    beside "Resolution time by department" (stacks narrow/compact); then
    team-wide Oldest open, Incoming, My requests. Managers' summary cards are
    TEAM-WIDE, labelled so.
- **Batch B — Scratchpad rework (M–L, ~7 h):**
  - **2b Floating panel (M, 3 h).** No backdrop or blur, usable while filling in
    notes; draggable by its header through ONE shared pointer-events drag helper
    (viewport-clamped; the two email composers switch to it); resizable with a
    minimum; position + size remembered (a new `ums…` key); Escape closes only
    with focus inside.
  - **2c Formatting (M–L, 4 h).** Toolbar: bold, italic, underline, three sizes,
    a token colour palette, bulleted and numbered lists, clear formatting.
    Stored as allowlisted HTML (sanitized by the server on save and by the
    client on render); a legacy plain-text pad converts on first open; a
    visible character counter against SCRATCHPAD_MAX_CHARS.
- **Batch C — notifications and presence (M, ~6 h):**
  - **8 Spanish assign → notify (M, 3.5 h), BOTH channels.** A PHI-free branded
    email to the assignee (who assigned it + a link; auto-assign sends one
    summary per assignee per run) AND a `spanish` kind in the Dashboard's
    Needs-you list (claims + the cached Spanish aggregate, never a live Gmail
    read on the dashboard path), busted on assign / release / resolve.
  - **3 Presence on the live team view (M, 2.5 h).** The presence cache stores
    the last-activity TIME. **Non-Philippines** reps with app activity and no
    clock-in show as fully IN; **Philippines** reps show amber "Active · not
    clocked in (last seen hh:mm)". PH is identified by PAY_CYCLE biweekly (the
    roster tz no longer separates the teams — all CST since 2026-08-28). The
    punch stays the payroll authority: activity never writes or implies a punch
    record; the manager view labels an activity-derived "in" as such.
- **Batch D — Dept Request reply = resolution (L, ~8 h).** The deployer's own
  mailbox (the CC address, the operator's) joins Reply-To beside the agent, so
  replies land where the app can read them; the thread id is recorded after
  each send; an hourly job (a dispatcher rider) reads each open request's thread.
  A reply RESOLVES only when ALL of these hold (the operator asked what can be
  added; these are the feasible ones):
  1. it arrived after the send (and after any reopen);
  2. it is not from the requesting agent, the deployer/CC address, or an
     automatic sender (Auto-Submitted / "Automatic reply" / out-of-office /
     mailer-daemon / no-reply);
  3. it is from the DEPARTMENT: an address in that department's configured
     email list, a roster member of that department (col N), or the department
     address's own domain;
  4. its NEW text (quoted history and signature stripped) is non-empty and does
     not read as a question or a hold — a "?" or a question/hold opener
     ("can you", "could you", "please confirm/send/provide", "need more info",
     "will look into", "working on", "pending", "following up").
  A reply that fails only rule 4 marks the request **Responded — needs a look**
  (shown on the tracker with a one-click Mark resolved), never resolved.
  Resolver = roster name, else the replier's email; resolved time = the
  reply's timestamp; ResolvedVia `reply`; counts toward response time. **Mark
  unresolved** for the sender, managers and the department's members; the scan
  then ignores replies before the reopen. New trailing columns ThreadId,
  ReopenedAt, RepliedAt/ReplyVerdict (the header self-heals).
- **Batch E — Dashboard widgets (L, ~8 h).** The dashboard main column becomes
  a widget registry (Needs you, Your numbers, Team numbers, Spanish, Requests,
  Today's punches, Team right now); the clock / punch / shift strip stay fixed.
  "Customize dashboard" (settings gear): show/hide, reorder, half/full width,
  reset. Resolution order: the rep's own layout (localStorage) → their
  manager's OPTIONAL team default (a small Script Property keyed by manager) →
  the BASE default (today's layout). A layout that would hide every widget is
  refused, and an empty or unreadable saved layout falls back to the base
  default, so the Dashboard is never empty.

## In progress (facts to carry forward — NOT judgments)
- Batch A starting (2026-09-27).

## Completed this cycle
- (none yet)

## Pending / not yet done
- Batches A–E above, in order.
- **Cycle 22's regression walks — NOT confirmed** (the deploy and its
  after-deploy steps were). The per-batch walks are in each `22-*` block and
  the new scenario steps in `.cycle/config.md` (S4, S25, S55, S59–S61, S68,
  S69, S74, S76, S80, S87, S90, S97, S98, S101, S114–S118).
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true`
  plus standing up the DEV instance (the weakest axis, Operator-Only State
  Gaps, three reflections running); steps 2, 5 and 6 unconfirmed.
- The cycle-20 post-deploy walk items (S111 step 5, S110 step 5, S7's Day Edit
  steps, S113, the sheet doctor run) and 21post's S64/S18/S112/S73 walks.
- **Operator sheet check (21post):** any `Local` left in `OopPricing` under
  Admin → System → Reference lookups → "Cannot read".
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK; what a
  LocationAcceptance city row's Accepts column decides.

## Open follow-on items
Carried from cycle 22 (full list in its HISTORY block, "Open follow-on items"):
- S6 is server-only (the QA detail still offers the controls on one's own
  recording) and does not cover self-assign or comments.
- The coaching business-days note and the Spanish auto-assign flag description
  still say "US holidays"; Save Departments lets two rows share a name.
- The half-day grade reads one ClockIn/ClockOut pair; a half day under an
  unreadable PTO overlay grades as a full day; the daily no-run check cannot
  tell "just enabled" from "missing".
- The client twin coachTsMs_ reads coaching stamps as UTC; M7's class survives
  in getMetricsAmbient, managerGetShiftStats' enrichment, getCdrDailyBreakdown_.
- X1 names 31 reads owed a fixture; the mock lacks `adminScanStoredFormulas`.
- No visual scenario for the CN export dialog, the shell-opened shortcuts
  overlay, the Intake Clear confirm, a failed quiz result, the SLA legacy note,
  an archive note, or the half-day states.
- An intermittent DOM pin (`the resume request states the unpaid gap before it
  is filed`) — flagged, not dismissed.
- assertNotProdInstance_ permits while INSTANCE_IS_PROD is unset (tied to the
  DEV instance).
- **Numbers — do not reuse:** INV-225..227 RESERVED (cycle 20); INV-229..232,
  INV-240..242 and INV-301..303 PROPOSED (cycles 21, 21post, 22), not in the
  library. **Next free: INV-304; gotcha g159; scenario S119.**

## Decisions made (so the next session doesn't re-litigate)
- **Close reasons (operator, 2026-09-27):** the presets include "Dissatisfied with
  services" and "Due to cost"; a reason is REQUIRED.
- **Scratchpad (operator, 2026-09-27):** the Batch B toolbar as planned; moving the
  store from plain text to formatted (allowlisted HTML) is accepted.
- **Presence (operator, 2026-09-27):** activity counts as fully IN for
  non-Philippines reps; Philippines reps get "Active · not clocked in".
- **Dashboard layout (operator, 2026-09-27):** per-browser saving for the rep;
  managers MAY set an optional team default; everyone has the base default
  (today's layout) so the Dashboard is never empty.
- **Reply tracking (operator, 2026-09-27):** the CC address is the deployer's
  mailbox; adding it to Reply-To is fine. Any department reply may resolve, but
  a question must not; the four rules in Batch D are the proposed stipulations.
- **Reopen (operator, 2026-09-27):** sender, managers and the department's
  members may mark a request unresolved.
- **DR defaults (operator, 2026-09-27):** sort Newest, open first; managers'
  summary cards team-wide.
- **Spanish notify (operator, 2026-09-27):** BOTH email and in-app; "Pending
  Tasks" means the Dashboard's Needs-you list.

## Where I left off
Cycle 22 closed into HISTORY.md; the 22post plan is recorded above. Next:
`/broad-implement Batch A` (items 1, 2a, 6, 7).
