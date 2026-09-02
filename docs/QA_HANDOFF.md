# Handoff: UMS Team Tools — QA module

## Overview
A design pass over the QA module's three views. **Target:** `web-app/qa/script_qa.html`.
**Reference:** `QA Redesign.dc.html` (sections 01–06).

Built on the existing Console token system and icon registry — no new framework, colour, font, or
icon. As with the Coaching and Manage handoffs, the mock inlines literal hex because a Design
Component cannot reference the app's stylesheet; **use the token variable** in the codebase.

## First, what's already right
The module is carefully built and most of it should be left alone:
- Seq guards on every async path (`seq`, `audioSeq`, `statsSeq`, `myRevSeq`, `myRevAudioSeq`) —
  INV-156, including the `if (QA_STATE.det) return` that stops a background queue refresh from
  stomping an open detail.
- The waveform is strictly **decoration**: the size gate, an undecodable format, a missing
  `OfflineAudioContext`, or any throw all leave playback exactly as Phase 1 shipped it. The
  low-rate 8 kHz mono decode instead of a naive 44.1 kHz stereo one, and the buffer copy because
  `decodeAudioData` detaches its input.
- Shared builders — `qaScorecardListHtml_` and `qaDrawWaveOn_` — so the reviewer and agent
  surfaces cannot drift.
- The agent player uses the scoped `getMyQaReviewAudioChunk`, never the reviewer-gated
  `qaGetAudioChunk`, and its failures deliberately carry no Drive link.
- `esc()` on every server string; the `isContentEditable` + tagName guard on the keyboard handler;
  `.qa-wave[hidden]` defending against the `display:block` specificity gotcha.

**None of that changes.** §6 of the mock repeats it as a do-not-break list.

---

# 1 · The framing finding

QA is used for **periodic audits of a few sampled calls per employee**, scored and compared to
find who needs coaching, with consistently high scorers exempted.

The queue is built as a **flat list of files**. It answers "what recordings exist" — but the job is
"which employees have we covered this period, and who still needs calls pulled." Nothing in the
module knows about an audit *period* or a per-employee *target*, so a reviewer cannot tell whether
the quarter is finished without counting cards by hand.

This is the same shape as the Coaching and Punctuality findings: the surface was organised
per-item when the job is per-person.

Half of it is already built and unexposed: **`qaSampleRecordings` already assigns
least-reviewed-agents-first.** That is coverage-fair sampling with no coverage display to justify
it or verify it worked.

---

# 2 · Recordings tab — coverage first, list second

### 2a. Chrome
All three views use `.view-title-row` + a bare `<h1>` ("QA · Recordings", "QA · Stats", "My
Reviews"). Swap for the shared `.app-bar`: breadcrumb `Tools › QA › Recordings` (separator `›`,
per the Manage handoff §3a) + `.display-title`. The `QA ·` prefix is doing a breadcrumb's job by
hand and goes with it.

Note the module already uses `mtRenderTable_` + `.m-table-wrap` on the Stats tab — it adopted the
shared table but not the shared chrome. This closes that gap.

### 2b. Audit period
A period control in `.app-bar-right`: `Aug 2026` · `Q3 2026` · `Q2 2026`. This is **not**
`mtDateRange_` from the Manage handoff — audit periods are discrete named buckets, not arbitrary
ranges, and a reviewer picking "last 37 days" would produce a coverage number that means nothing.
Same visual vocabulary (`.toolbar-tabs`, `aria-pressed`), different control.

Persist the choice per browser the way `umsCoachingMode` does; default to the current period.

### 2c. Summary strip
Four cells: **Coverage** (9/15 calls with a progress bar and "3 employees short"), **Team avg**
with a delta vs the previous period, **Below 3.5** with the names, **Days left** in the period.
`Below 3.5` carries `inset 3px 0 0 var(--destructive)` when non-zero.

The Coverage cell is the one that didn't exist and is the reason for the whole section.

> **Every number in this strip is a sum over the coverage table — derive it, never store it.**
>
> - `sampled` / `target` — column sums. Exempt employees contribute 0 to both, so the ratio reads
>   as progress against work actually owed.
> - `employees short` — every non-exempt employee under target: `sampled < target && !exempt`.
>   Define it by that condition, **not** by enumerating tier names: it spans `Short`,
>   `Short · low` *and* `Not started`, since an employee at 0/3 is under target — maximally so.
> - `Team avg` — **call-weighted**, not the mean of the per-employee averages. An employee with
>   three sampled calls carries three times the weight of one with a single call.
>
> A strip that disagrees with the table under it is worse than no strip, because the table is the
> thing an implementer can check.

### 2d. "Who still needs sampling"
`mtRenderTable_`, columns: `Employee · Sampled · Avg /5 · vs prev · Last review · Status`.
Sampled is a mini progress bar + `n/target`. Sorted by need: unstarted and short-with-low-scores
first.

| Status | Condition | Tone |
|--------|-----------|------|
| Short · low | under target **and** avg < 3.5 | `destructive` |
| Short | under target, avg ≥ 3.5 | `warn` |
| Not started | zero sampled this period | `info` |
| Covered | at target | `accent` |
| Exempt · {period} | active exemption | neutral, dashed border |

*Not started* is deliberately distinct from *Short* — a rep with zero calls pulled is a coverage
failure, not a partial one.

> **Wiring note.** The row rule (`opts.rowClass`) and the status pill must come from the *same*
> derivation — one `qaCoverageTier_(row)` returning the tier, with the rule colour and the pill
> label/tone both read off it. Deriving the rule from one condition and the pill from another is
> how a row ends up amber with a red pill.

A **Sample the gaps for me** primary button replaces "Sample 3 for me". Same
`qaSampleRecordings` endpoint, but the label should describe the coverage-fair behaviour it
already has, and the count should come from the actual gap rather than a hardcoded 3.

### 2e. Exemption — §1c of the mock
"Consistently high scorers can be exempted" has no representation in the code today. Proposed
rules, because an invisible exemption is indistinguishable from a missed audit:

- **Earned:** avg ≥ 4.5 across two consecutive periods with no single criterion below 4.
- **Granted by a manager**, never automatic — the system marks eligibility, a person decides.
- **Expires at period end** and must be re-earned. A permanent exemption silently becomes a
  permanent blind spot.
- **Visible in the table** as its own status with the expiring period named, and excluded from the
  coverage denominator (target 0/0) rather than counted as a failure.

---

# 3 · The recordings list

You left the shape to me: **a sortable table**, matching the Stats tab in this same file.
Cards cost roughly three times the vertical space per row and cannot be sorted, and for audit work
the scan is "which of these is long, unassigned, and belongs to someone I still owe calls for" —
that is a table question.

Columns: `Recording · Agent · Length · Dropped · Status · Reviewer ·` actions.

- **Length replaces file size.** `qaFmtSize_` shows MB, which is bitrate-dependent — a 4 MB file
  could be 3 minutes or 30. Duration is what decides whether you can review this before your next
  meeting. (§5 for the server field.)
- **Agent is promoted to a column**, since audit work sorts by person. Unattributed is called out
  with a warn icon rather than left blank: an unattributed recording is silently invisible to
  Stats, which is the one place these scores are read.
- **Done rows carry their score** (`4.7 avg · shared`) so a finished review doesn't need opening
  to see how it went.
- **Filter chips gain counts** — `All 24 · New 9 · In review 3 · Done 11 · Skipped 1 · Mine 3`.
  All client-side over `QA_STATE.queue.recordings`; no new call.
- **Search** (name + agent) and a **length filter** (short < 5m / medium 5–15m / long > 15m), also
  client-side. There is a "list capped" note today with no way to search past it.
- Default sort newest-dropped; every header sortable.

### 3a. `skipped` is currently unreachable
It is in `QA_STATUS_LABELS`, has a `.qa-status.st-skipped` CSS rule, and **no button in the app
sets it** — `qaRenderDetailHead_` offers only Start review / Mark done / Reopen. No filter chip
reaches it either, so a skipped row is invisible outside "All". Add a **Skip** action in the
detail (`qaSetRecordingStatus(id,'skipped')` — the endpoint exists), a filter chip, and a
`SkipReason` shown on the row, the way `VoidReason` pairs with a voided coaching item.

### 3b. Assign… is a picker rendered as a prompt
Today: `uiPrompt` with a typed email, the valid members comma-joined into the message text, and a
validator that rejects anything not in `QA_MEMBERS`. The set is known, small, and already
validated — make it a list. Show each member's open review count while you're there, so routing
work also shows who is loaded.

---

# 4 · Recording detail — two panes, pinned player

### 4a. Layout
Today: head → agent row → player → scorecard → comments, one column. Reviewing is listening **and**
annotating simultaneously, and the transport leaves the viewport as soon as you read a comment or
reach for a rating.

Two panes above 1000px. **Left, sticky:** agent attribution + player (waveform, timeline, elapsed,
transport, speed). **Right, scrolling:** scorecard, comments, and the coaching hand-off. Single
column below the breakpoint, player first.

The status actions (Skip / Share with agent / Mark done) move up into the detail header where they
read as decisions about the whole review.

### 4b. Agent attribution
It currently sits above the player as a bare label + input + Save, styled with inline
`font-size:12px;color:var(--muted-2)` — the field that feeds all of Stats, looking like an
afterthought. Move it into the player pane as a proper labelled block.

**It is free text with a datalist, and Stats groups by that string.** A typo silently forks a new
agent row: "Marcus Bel" becomes its own person with its own average. Keep free text (an ex-agent's
recording is still attributable — that reasoning is sound and documented in the source), but:
- Confirm a match: *"On the roster · 2 of 3 sampled this quarter"* — which also tells the reviewer
  whether this call helps close the period.
- Warn on a miss: *"Not on the roster — this will appear as its own row in Stats. Did you mean
  Marcus Bell?"* with the nearest roster name offered.

### 4c. Scorecard
- **Anchor the scale.** 1–5 with no anchors is used inconsistently between reviewers, which is
  precisely what the Calibration table then measures. One line under the heading:
  *1 = needs work · 3 = meets standard · 5 = exemplary.* Cheapest possible improvement to
  calibration.
- **Running average and completeness** in the header (`3.7 avg · 3 of 4 rated`), so a partial card
  is obvious before saving.
- Tint the selected chip by value so a weak card reads at a glance. **One threshold, used on both
  surfaces:** `≤2` destructive, `3` neutral, `≥4` accent. This must match the My Reviews chips
  (§6) exactly — `qaScorecardListHtml_` exists precisely so the reviewer and agent views can't
  drift, and a 4 rendering green in one place and grey in the other would reintroduce that drift
  through CSS instead of markup. Put the mapping in one helper both call sites use.
- Unrated criteria stay visibly unrated; never default to 3.

### 4d. Comments — pause, pin, resume
**The bug:** `qaSubmitComment_` reads `audio.currentTime` at *submit*. Hear something at 12:04,
type for twenty seconds, and the comment anchors at 12:24 — pointing at whatever came next. The
live-updating button label ("Comment at 12:24") makes it look deliberate, which is what makes it
hard to notice. Every comment in the system is late by however long it took to type.

**The fix (your pick — pause and pin):** the first keystroke in the textarea pauses playback and
captures the moment as an **editable chip**. Posting resumes from where it stopped.

- `QA_STATE.pinnedAtSec`, set on the first `input` event, cleared on post or discard.
  `qaSubmitComment_` sends the pinned value, not live `currentTime`.
- The chip is editable because the moment worth flagging usually starts a few seconds before you
  react to it.
- Two post buttons: **Post & resume** (primary) and **Post & stay paused** — a bad stretch of call
  usually earns two comments in a row.
- **Discard** clears the pin and resumes.
- If a reviewer manually resumes playback while typing, keep the pin. It was captured
  deliberately.

### 4e. Coaching hand-off
A panel at the foot of the right pane: **Turn this review into coaching**, prefilling a coaching
item for the attributed agent with the timestamped comments as the narrative.

Routes `enterTool('develop', 'coaching')` with a `COACH_PREFILL` — the Call Notes mechanism,
unchanged. Store a `reviewId` on the coaching record mirroring `noteId`, **and render it**: the
Coaching handoff documents `noteId` being stored and never displayed, and this would repeat that
mistake at a second call site.

> Tool key is `develop` — not `qa`, not `training`. `enterTool` returns silently on an unknown key,
> which is how Call Notes' "Coach on this" was a dead no-op for two cycles.

---

# 5 · Server work — 4 fields

| Field | Where | Why |
|-------|-------|-----|
| `DurationSec` | recordings index | The Length column and length filter. Capture at sync if Drive's `getSize`-adjacent metadata exposes it; otherwise write back on the first successful decode (the client already decodes for the waveform). |
| `AuditPeriod` | recordings index | The period a recording counts toward, so reviewing an old call doesn't credit the current quarter. Derive from the call date at sync, not review date. |
| `ExemptPeriods` | per-employee | Exemption grants + the period they expire in (§2e). |
| `SkipReason` | recordings index | Pairs with the now-reachable skipped status (§3a). |

`getQaQueue` gains a **coverage block**: per employee — sampled, target, avg, previous avg, last
reviewed, exempt-until. All derivable from data already in the QA spreadsheet plus the roster; no
new source.

Bound it the way the rest of the module is bounded — the coverage block is roster-sized, but the
recordings tail is already capped and should stay capped.

Self-heal the header row the way `QA_RECORDINGS_HEADERS` already grew a trailing column in the
Phase-3 block, and keep the `qaStoreConfigured_` / `notConfigured` early-return paths intact — a
fresh install with `QA_SS_ID` unset must still render its setup message, not a broken coverage
table.

---

# 6 · My Reviews — read-only, with a real player

**You chose to keep this read-only.** The scope option I offered bundled "acknowledge + reply"
with the player work; the specific answer wins, so there is no ack and no reply here. Coaching
remains the place a response is recorded. If that changes later, the Coaching ack + reply pattern
transfers directly.

What does change is **parity**. An agent hearing their own call gets a bare `<audio>` element —
no speed control, no ±5s, no keyboard shortcuts. Reviewers got all three because reviewing is hard
listening; hearing your own 30-minute call is the same work. `qaDrawWaveOn_` was already extracted
to share exactly this kind of chrome — extract `qaRenderTransport_` to take an audio element and
follow it.

Also:
- Move the read-only explanation to the **top**, once, as an `info`-toned callout. It currently
  sits at the bottom after every card, where the reader meets it last.
- Show the **average prominently** and tint each criterion chip by score, using the **same
  threshold as the detail scorecard** (§4c): `≤2` destructive, `3` neutral, `≥4` accent — one
  shared helper, not two hand-written mappings.
- Keep timestamped comments clickable (they already are) and keep the scoped audio endpoint.

---

# 7 · Smaller things worth fixing in the same pass
- `.qa-kbd-hint` uses `--muted-3` — the below-AA decoration token — for instructional text
  ("space · ← →"). Move to `--muted-2`. Its use inside `qaDrawWaveOn_` for unplayed bars is
  correct; that *is* decoration.
- `qaSetRating_` re-renders the whole form per click, rebuilding the notes textarea. Typed notes
  survive (handled deliberately), but the caret position does not — toggle the affected row's
  `aria-pressed` in place instead of a full repaint.
- **No unsaved-work guard.** A filled scorecard and a typed comment vanish silently on Queue.
  Reuse the `trainLoadMgr_` dirty-form pattern in `qaBackToQueue_`.
- The keyboard hint renders twice — in the transport and again in the comments note.
- `.qa-btn` / `.qa-chip` / `.qa-status` / `.qa-empty` duplicate the shared button, `.toolbar-tabs`,
  `.kicker-pill[data-tone]` and `.no-data` vocabularies. The module already reuses
  `mtRenderTable_`, `errorStateHtml_`, `esc`, `icon`, `showToast`, `uiConfirm`, `uiPrompt` — this
  is a partial adoption worth finishing, and it shrinks the Phase 1–3 CSS block substantially.

# 8 · Accessibility
- Sortable headers: `aria-sort` on the active column; header must be a real button (the L-15
  `mtRenderTable_` note).
- The coverage progress bars carry meaning in width alone — give each an `aria-label`
  ("2 of 3 sampled").
- Status is never colour-only: every pill carries its word, and *Short · low* says both things.
- The pinned-time chip is a labelled input, not a static span, and announces the pause
  (`aria-live="polite"` on the "paused & pinned" line).
- Two-pane layout keeps a sane tab order: player pane before the right pane in DOM order, which it
  already is.
- Keep the waveform `aria-hidden` with the transport as the accessible seek path — including on
  the new My Reviews transport.

# 9 · Visual coverage
Add to `test/visual/shoot.mjs`: `qa-coverage-light-wide`, `qa-coverage-dark-wide`,
`qa-recordings-light-wide`, `qa-detail-light-wide`, `qa-detail-dark-wide`,
`qa-myreviews-light-wide`. The fixture in `test/visual/mock.js` needs the coverage block, a
`DurationSec`, an exempt employee, and a skipped recording — the four states most likely to be got
wrong are exactly the ones a fixture without them can never shoot.


---

# Addendum — reviewed against the repo, 2026-09-01

QA Phase 3 and two follow-on rounds shipped after this document was written. Three items below are
**built**, one recommendation here is **wrong**, and one decision is **yours**.

**Built — do not rebuild:**
- **My Reviews player** (FO-WAVE, 2026-08-28) — waveform + click-to-seek via one shared
  `qaDrawWaveOn_` painter, decoded at 8 kHz mono behind a size gate, seq-guarded, wired in its own
  try/catch *after* the audio src is set so a waveform failure never costs playback.
- **Reviewer calibration** — pure `qaCalibration_`, per-reviewer means, spread, widest
  per-criterion gap where 2+ reviewers rated the same criterion, rendered via `mtRenderTable_`,
  facts-only.
- **Coverage-fair sampling** — `qaSampleRecordings(count)` + the pure `qaSamplePick_` (lowest
  done-reviews plus picked-this-round load per agent, random tie-break, injectable rand).
  **This changes the coverage board's job**: it should *surface what `qaSamplePick_` already
  computes*, not re-derive coverage in the client. The "Sample 3 for me" button is the action; the
  board is the explanation of why those three.
- `qaScorecardListHtml_` is the shared scorecard builder across reviewer detail and My Reviews.

**Wrong — correct this:** where this doc asks for player parity on the agent-facing view, that is
not available. `getMyQaReviews` has **no audio path by design** — playback stays behind the
`canSeeQa_` Drive boundary, and agent audio for shared reviews is deferred to v3 pending a scoped
chunk endpoint outside that gate. Do not open that boundary to satisfy a design note.

**Yours to decide:** Phase 3 shipped My Reviews **ungated** (the QA tool appeared in every rep's
sidebar as one read-only tab); it has since been re-gated pending your call. Re-opening is one
registry line plus a QA-14 pin rewrite. This changes who this view serves, so settle it before
building the My Reviews design.

**Also new:** an explicit per-recording share release (`SharedMs`, `qaSetRecordingShared`) that
refuses until the recording carries an Agent attribution, and a status flip never auto-shares. The
My Reviews design should show the share state, not assume reviews simply appear.

**Still an open gap:** the QA recording *detail* has no visual scenario — the mock cannot serve
chunked audio. That is the standing matrix gap, and it is the surface this document changes most.
