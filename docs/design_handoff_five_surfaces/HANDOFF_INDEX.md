# UMS Team Tools — design handoff (index, as received 2026-09-01)

> Saved verbatim from the operator's paste so the implementation plan beside it has its
> companion in-repo. The five detail docs and five `.dc.html` mocks this index references
> were NOT supplied — see `IMPLEMENTATION_PLAN.md` § X1.

> **Reviewed against the repo 2026-09-01** (branch `claude/team-tools-roadmap-6e2l97`, tree
> `df931a9f`). The repo moved a long way after these handoffs were written — cycle 18 closed, and
> the 19pre rounds shipped QA Phase 3, the ALL-CST policy, business-hours arithmetic, Workstreams
> A/A4/B and the Admin sub-tab coverage work. **Part 6 records what that invalidates.** Read it
> before building anything below: four recommendations are already built, one contradicts a
> deliberate security posture, and one would fail CI as written.

Five surfaces, reviewed and redesigned in sequence. Each has its own detailed handoff; this
document is the index, the cross-cutting work, and the build order.

| # | Surface | Detail doc | Mock |
|---|---------|-----------|------|
| 1 | **Training › Coaching** (+ critical-notification email) | `COACHING_HANDOFF.md` | `Coaching Redesign.dc.html` |
| 2 | **Manage** — Punctuality, Manage Time, Coverage | `MANAGE_HANDOFF.md` | `Manage Redesign.dc.html` |
| 3 | **QA** — Recordings, Detail, My Reviews | `QA_HANDOFF.md` | `QA Redesign.dc.html` |
| 4 | **Manage › Admin** (System details) | `ADMIN_HANDOFF.md` | `Admin Redesign.dc.html` |
| 5 | **Time Clock** (as a dashboard) | `TIME_CLOCK_HANDOFF.md` | `Time Clock Redesign.dc.html` |

*Parked at your request: the intake emails (`INTAKE_EMAILS_HANDOFF.md`, `Intake Emails Redesign.dc.html`).*

## How to use this document

**The codebase always takes priority.** Everything here is a design proposal written against a
snapshot of the repo. Where this document and the code disagree, the code is right and this
document is stale — the repo has already moved once under these recommendations (see Part 6), and
it will move again.

**Notate every conflict, no matter how trivial.** If a field name, a function name, a threshold, a
count, a label, a colour token, a payload shape or a described behaviour does not match what you
find in the code:

1. Build what the codebase supports, not what this document describes.
2. Record the conflict — what the doc said, what the code does, and what you built. A one-line note
   in the PR or the cycle block is enough.
3. Collect anything that needs a judgement call and **raise it with the operator at the end of the
   pass**, in one list, rather than deciding silently mid-implementation.

The bar for "worth notating" is deliberately low. A renamed helper or an off-by-one count is
exactly the kind of small mismatch that signals the design was written against an older surface —
several such notes in one area usually mean that section needs re-reading before it is built, not
that the notes were trivial. Part 6 exists because these small mismatches accumulated into four
recommendations that were already built and one that was wrong.

**What needs a decision goes to the operator, not into the code.** Anything that changes who sees
what, opens a security boundary, alters a stored enum, or picks between two defensible designs is
an operator call. Park it, note it, and carry on with the rest of the pass. Open ones as of the
last review are in Part 6c.

All five are built on the existing Console token system in `web-app/styles_design_tokens.html` and
the existing icon registry — no new framework, colour, font or icon anywhere. The `.dc.html` files
are **design references**, not production code: they inline literal hex because a Design Component
can't reach the app's stylesheet. In the codebase, always use the token variable.

---

# Part 1 — What each surface needed

## 1 · Training › Coaching
The one Training-module surface the earlier `design_handoff_team_tools_redesign*` bundles skipped.

- **Composer moves into a drawer** behind one primary button. What takes its place is a per-rep
  signal board — severity mix over 30 days, last-coached, and a derived Priority/Watch/Steady/
  Clear/No-signal tier — so "who needs a 1-on-1, how urgently" is answered above the fold.
- **Praise splits from severity.** Kind (Coaching/Praise) becomes its own axis; severity becomes a
  three-step chip scale, and `Major` is relabelled **Moderate** (display only). Praise gets its own
  Recognition feed on both views and stops requiring acknowledgement. **The stored `severity` enum
  does not change** — this is a UI decomposition of one field, no migration.
- **Two stored-but-invisible fields surface:** the `noteId` link back to the Call Note, and
  `VoidReason`.
- **Reply on acknowledge** — the one real behaviour change, and the evidence for the 1-on-1 the
  board points at.
- **A critical-severity notification email**, carrying no narrative, patient, TRX or note id.

## 2 · Manage
Three unequal changes, not one redesign.

- **Punctuality — full redesign.** Outliers named at the top, the full roster below in
  `mtRenderTable_` with an expandable per-rep day detail. Keeps Punctuality's own 90/75 thresholds
  (not Metrics' 80/50) — a shared function with a passed threshold is the point; a shared threshold
  would be wrong.
- **Manage Time — same scroll, reordered by urgency**, with collapsible periodic panels. The rule
  that makes collapsing safe: **a collapsed panel still shows its state in the summary row.**
  Collapse that hides a problem is worse than a long scroll.
- **Coverage — chrome and controls only.** The heatmap is good; don't rebuild it.
- **A shared date-range control** (`mtDateRange_`) across the three surfaces that each had their own.

## 3 · QA
Framed around what you described: periodic audits of a few sampled calls per employee.

- **Recordings — coverage first, list second.** A "who still needs sampling" table answers the
  audit question; the recordings list becomes a sortable table matching Stats in the same file.
- **Recording detail — two panes with a pinned player.** Reviewing is listening *and* annotating;
  today the transport scrolls away the moment you read a comment.
- **Comment timestamps are wrong today.** `qaSubmitComment_` reads `audio.currentTime` at *submit* —
  hear something at 12:04, type for twenty seconds, and the comment anchors at 12:24. Pause-and-pin
  on focus, resume on submit.
- **`skipped` is unreachable** — in `QA_STATUS_LABELS`, has CSS, no button sets it.
- **My Reviews stays read-only** (your call), with a real player.
- **Review → coaching hand-off**, prefilled with the timestamped comments.

## 4 · Manage › Admin
- **System details is promoted to its own tab.** It had outgrown the disclosure it lived in —
  more content than the Tags or Compliance tabs, folded behind an unlabelled chevron with its own
  summary (the three status cards) detached from it by two unrelated panels.
- **Findings rank above all-clears.** `okLine()` gives a passing check a full row, so a healthy
  system renders a column of green sentences and an unhealthy one buries the warning among them.
  Problems get room and their fix; passing checks collapse to one expandable count.
- **The page is renamed Admin** under Manage — it governs storage, automation, retention, client
  errors and deploy readiness, not just Call Notes.
- **One real refactor:** split `cnRenderHealthPanel_` into a pure `cnHealthFindings_()` plus a
  renderer. Side benefit — the status cards can then derive from the *same* array instead of
  re-computing tone independently, which today lets a card disagree with the panel beneath it.

## 5 · Time Clock
Reframed on your description: a dashboard for own/team metrics, pending tasks, and clocking.

- **Metrics carousels untouched** — your call, and they're the best-built part of the page.
- **A "Needs you" block leads the main column.** Pending tasks were the unstaffed third of the
  page's job: two of five sources appeared, in a row the code calls "extras". Coaching, QA and
  missing call notes never reached it.
- **The clock card gets denser** — the rotating world-clock strip and the randomized shooting star
  go; the gradient and night sub-phases stay. Buys ~70px, which lifts the punch buttons above the
  fold without moving them off the rail.
- **The greeting rotator holds during an active shift** (your call), with a visible **Held** chip so
  a frozen line doesn't read as a stuck page.
- **Three duplicated readouts collapse:** hours worked rendered twice ~100px apart, breaks rendered
  three times.

---

# Part 2 — Cross-cutting work

These recurred on three or more surfaces. Doing each once is cheaper than the per-module cleanups
the individual handoffs each ask for.

### C1 · Chrome — six views still on the old title row
Coaching, all three QA views, and Admin render a bare `.view-title-row` + `<h1>`; Manage Time has
the shared `.app-bar` but stale content in it (`Time Clock › Manager Dashboard`, from before the
Manage reorg). All should be `.app-bar` + breadcrumb + `.display-title`, separator `›`.

### C2 · `mtRenderTable_` is under-adopted
Punctuality has its own `.punct-table`; the QA recordings list, the Admin storage inventory and
the Coaching per-employee table are all hand-rolled. Moving them onto the shared component brings
sortable headers, sticky header and tabular numerals for free, and deletes four CSS blocks.

### C3 · Data written and never shown
A recurring class, not four coincidences: Coaching's `noteId` and `VoidReason`, QA's `skipped`
status, Admin's void reason. Something is captured, stored, and silently dropped at the render
boundary. Worth a grep for other cases before you start.

### C4 · Token hygiene
- **`var(--accent-deep, …)` is not a defined token** — it always falls back to flat `var(--accent)`.
  Used by `.tr-complete-btn`, which Coaching uses for Acknowledge and the composer submit.
- Redundant fallbacks on tokens that *are* defined: `var(--warning-deep, var(--warn))`,
  `var(--success-deep, var(--accent))`, `var(--danger-soft, #fce5e5)`.
- `--muted-3` (the below-AA decoration token) used for instructional text in QA's `.qa-kbd-hint`.

### C5 · `.toolbar-tabs` overflows at 390px
The V-6 fix. Every module accumulates tabs over time and Admin will now have six. The control must
scroll inside itself rather than push the page sideways.

### C6 · Failed ≠ absent, and pending ≠ empty
Already fixed twice (E7/F16) and it keeps recurring. A panel that can't load says so; it never
renders blank, and never as "nothing here". This binds three new things: Admin's findings list,
Time Clock's Needs you, and QA's coverage strip. A failed fetch reading as "nothing pending" is the
worst failure any of those three can have.

### C7 · Visual fixtures return empty, so states have never been shot
`getMyCoaching` returns `{items: []}` — the rep Coaching view has never been screenshotted at all.
Same for the Admin all-clear path, and `getMyPendingTasks` will land in the same hole. Three
occurrences makes it a rule, not three fixes: **every fixture needs a populated variant and an
empty variant**, and the empty state is usually the one a redesign changes most.

### C8 · Coaching is becoming the spine
Four surfaces now hand off into it: Call Notes' "Coach on this" (exists), Punctuality's Log
coaching (new), QA detail's Turn this review into coaching (new), and Time Clock's Needs you
(new). They all use the same `COACH_PREFILL` / `CLK_NAV_HINT` park-and-consume pattern. Worth
naming that pattern in `CLAUDE.md` once rather than re-deriving it a fifth time.

---

# Part 3 — Server work, consolidated

| Surface | Work | Notes |
|---------|------|-------|
| Coaching | 3 columns: `RepResponse`, `FollowUpAt`, `NudgedAt` | Self-heal the header row the way `VoidReason` did (`COACH_HEADERS` 14 → 17) |
| Coaching email | none — call the shared branded builder | Fire after commit, **outside** the `ScriptLock` (cycle-9 M-7) |
| Punctuality | `days[]` per rep on `getPunctualityReport` | Existing team scoping unchanged |
| QA | 4 fields | See `QA_HANDOFF.md` §5 |
| Time Clock | 1 aggregate: `getMyPendingTasks()` | Needs the same `COMPACT_MODE` gate as the other loaders (cycle-8 M-12) |
| Admin | **none** | Entirely client-side over payloads already fetched |

**Timestamp discipline** applies to every new date field. `CreatedAt` is SPACE-form and
`parseTimestampMs_` was T-only — that mismatch is what made the cycle-7 H-1 overdue detector dead
on arrival. `FollowUpAt` feeds a digest and is exposed to the same class of bug; pin it with a
round-trip test.

---

# Part 4 — Build order

**Admin first.** No server work, no dependencies, and it's the one that makes the others' health
visible. Mostly markup reordering plus the one `cnHealthFindings_` refactor.

**Then Manage.** Punctuality's server change (`days[]`) is small and self-contained, and the
shared `mtDateRange_` control lands here for QA to reuse.

**Then Coaching and QA** — in either order, but both before Time Clock. They own the four new
fields, and Coaching's ack and QA's ack are two of the five sources Time Clock's Needs you reads.

**Time Clock last.** Its one new piece is an aggregate over things the other four surfaces expose.
Build it earlier and two of its five sources won't exist yet.

The token sweep (C4), the tabs overflow (C5) and the fixture rule (C7) can go in any pass — but
doing them once, up front, is cheaper than the four separate cleanups the individual handoffs
each request.

---

# Part 5 — What is not changing

Every guard in these files stays. Several were bought with real bugs, and they're named in the
individual handoffs so an implementer doesn't quietly remove one:

- Late-callback `currentView` guards, and the `_covSeq` / `_punctSeq` / QA `seq` same-view range
  races (cycle-9 L-31).
- Contained failure per panel — `errorStateHtml_` into `area` destroyed all five Admin panes and
  the slots six in-flight loaders were targeting (C17 batch-2). A sixth pane means a sixth slot.
- The M-8 re-enter fix: the enter path must do the same empty-pane load the click path does.
  **This applies directly to Admin's new System tab** — it's the exact bug that shipped for Sheets.
- The `_coachAckInFlight` double-click guard and server-side ack idempotency (INV-134).
- The undo-window sentinel: `timeDiffSecondsClient` returns `-1` for malformed and past-window
  times, and `-1 <= 300` is true.
- Fixed colours on the Time Clock sky card — its gradient is identical in both themes, so text on
  it uses literals, never `--muted`/`--ink` (V-2), and anything at its bottom-right needs a scrim.
- PHI posture throughout: narrative renders only behind the authenticated view, the audit log
  stays content-free, and `esc()` on every server-derived string.

---

# Part 6 — Checked against the repo, 2026-09-01

Not a refresh of the docs above. This is the diff between what they assume and what the repo now
does, so nothing here gets built twice or built wrong.

## 6a · Already built — delete these from the plan

| Recommendation | Shipped as | Note |
|---|---|---|
| QA: a real player on My Reviews | **FO-WAVE** (2026-08-28) | Waveform + click-to-seek, one shared `qaDrawWaveOn_` painter, decoration-only in its own try/catch so a waveform failure never costs playback. Better than what I specified. |
| QA: reviewer calibration | **P3-calibration** | Pure `qaCalibration_`, rendered through `mtRenderTable_`, facts-only with no verdict tone. |
| QA: two surfaces must not drift | **P3-myreviews** | `qaScorecardListHtml_` extracted as the shared builder. |
| C5: `.toolbar-tabs` overflow (Manage Time half) | **Workstream B** | The 390px overflow was an *inline* grid declaration the A2 tripwire structurally could not see; now a named class with a real breakpoint plus a derived scan banning the shape. |

## 6b · One recommendation is wrong — QA "My Reviews" audio

`TIME_CLOCK`-style parity was the wrong instinct here. `getMyQaReviews` has **no audio path by
design**: playback stays behind the `canSeeQa_` Drive boundary, and agent audio for shared reviews
is explicitly deferred to v3 because it would need a scoped chunk endpoint outside that gate.
FO-WAVE added the waveform to the *reviewer's* My Reviews, not an agent's.

**QA_HANDOFF's player-parity line should not be read as licence to open that boundary.** Corrected
in that doc's addendum.

## 6c · Two live design questions now waiting on you

Both were raised by the implementation work and explicitly handed to the design side:

1. **Should agents see their own QA reviews?** Phase 3 shipped this ungated — the QA tool appeared
   in every rep's sidebar as one read-only tab — and it has since been re-gated pending your
   decision. Re-opening it is *one registry line* (drop `managerOnly`+`also` from `qaMyReviews`)
   plus a deliberate QA-14 pin rewrite. The posture is conservative and correct as a default; the
   call is yours, and it materially changes who the My Reviews design serves.
2. **The Admin sub-tab strip scrolls at 390px with no affordance that it does.** Recorded verbatim
   as "an operator design call, not a structural defect." Reaching *Sheets* on a phone requires
   discovering a horizontal scroll. **My System tab makes this a six-tab strip**, so it gets worse
   before it gets better. A scroll-shadow or a chevron is the cheap fix; a two-row wrap or an
   overflow menu is the honest one.

## 6d · The System tab now owes a test the day it lands

The Admin sub-tab round added **VIS-ADMIN**, a pin that derives the Admin pane set from the
client's own `tab('key','Label')` call sites and **requires a mobile visual scenario per pane** —
written specifically so that "a sixth pane owes one the day it lands."

The System tab in `ADMIN_HANDOFF.md` *is* that sixth pane. It ships with an
`admin-system-light-mobile` scenario or CI fails. That round also found a real defect the same way
— `.cn-tax-head` shared the row's stacking rule, so the tag-taxonomy header rendered as six labels
in a column above the first row — which is a decent argument for taking the pin seriously rather
than working around it.

Counts in the individual docs are stale: the matrix is **67 scenarios**, pure **712**, DOM **101**,
`runAllTests()` **305**.

## 6e · Business-hours arithmetic now exists — Coaching should use it

`businessMinutesBetween_` / `bizMinutesLocal_` landed 2026-08-31, reading the Coverage planner's
own window so "working hour" has one definition app-wide. The round's stated rule: **a figure in a
digest and the same figure on screen must not use different arithmetic.**

Coaching's overdue tracking is calendar-day math — "Overdue 9d", "median 1.4 days", the >7d KPI,
and the accountability digest that reads the same data. An item sent Friday at 4pm is not
meaningfully three days overdue on Monday morning, and the digest and the card can now disagree in
exactly the way BIZ-2 was written to prevent. **Coaching's `FollowUpAt` and overdue window should
go through the shared helper.** Added to `COACHING_HANDOFF.md`.

## 6f · ALL-CST retires the Time Clock night phases

Every roster row becomes `America/Chicago`; PH agents get `8:30-17:00` in column O, India takes
the 8:00–17:00 default. `CONFIG.TIMEZONE` stays Asia/Kolkata as the *storage* frame only.

Consequence for the sky card: **its four night sub-phases are no longer reachable during any
agent's shift.** Nightfall / Midnight / Late night / Pre-dawn cover 20:00–05:00, and nobody now
works those hours. My dark board is a 2:54 AM `Late night` render, and my recommendation to shoot
`clock-dashboard-dark-wide` "with an overnight-tz rep, so the night sub-phases get on camera" is
now advice to photograph something no user will see.

That doesn't mean delete them — a manager checking in at 22:00 still gets Nightfall, and the code
is written and pinned. But the *dark board should be a working-hours phase*, and the four night
gradients are now decoration for a rare case rather than coverage for a real shift. Corrected in
`TIME_CLOCK_HANDOFF.md`.

## 6g · Manage — check before rebuilding

Workstreams A / A4 / B rebuilt more of Manage Time than `MANAGE_HANDOFF.md` assumes:
the Day Edit modal is now an N-row break list (was four fixed slots), the adjust modal prefills
from the done state, the manager is notified when an adjustment is *submitted*, and a Resume-shift
request converts a ClockOut into an unpaid break. Manage Time and both Training views also gained
SWR paint-last-good, which was the operator-reported slow-load complaint.

None of that conflicts with the Manage reorder — but **re-read `enterManagerView` before
implementing it**, because the surface it reorders is not the one the doc was written against.
The SWR work also adds a constraint the reorder must respect: a background refresh is deliberately
deferred while bulk checkboxes are checked or an overlay is open, so collapsible panels must not
become a third thing that silently swallows a refresh.

## 6h · Build order, revised

Unchanged in shape, with one correction: **Admin still goes first**, but it is no longer
zero-cost — it owes the VIS-ADMIN mobile scenario (6d) and it inherits the tab-affordance question
(6c). Time Clock still goes last, and its dependency argument is now stronger: two of the five
"Needs you" sources are the Coaching and QA acknowledgements, and QA's gate decision (6c) may
change whether the QA source exists for reps at all.
