# Handoff: UMS Team Tools — Time Clock (Dashboard)

## Overview
A structural pass over the Time Clock view, reframed around your description of its job:
**a dashboard for a rep's own and team metrics, their pending tasks, and clocking in/out.**

**Target:** `web-app/tc/script_clock.html` (`renderClockView` and the rail components).
**Reference:** `Time Clock Redesign.dc.html` (sections 01–03).

Built on the existing Console token system — no new framework, colour, font, or icon. The mock
inlines literal hex because a Design Component cannot reference the app's stylesheet; **use the
token variable** in the codebase.

## Decisions taken from you
| Question | Answer |
|---|---|
| Metrics carousels | **Leave as they are** — untouched here |
| Greeting rotator | **Keep rotating, never rotate away from an active shift** |
| Sky clock | **Open to reworking** |
| Punch actions leading the page | *skipped* — read as declining the reframe; actions stay in the rail, given room rather than relocated |

---

# 1 · The finding

Three jobs. Two are well served.

**Own + team metrics** — well served. Two carousels × three periods, with deltas, target banding,
projections, and an honest `prevUnavailable` state (INV-187: "no arrows" and "no change" must not
look alike). Left alone per your call.

**Clock in / out** — works, but `renderActions` is *fifth* in the rail: below the sky card, the
shift-strip header, the day ribbon, and the break chips, in a 360px column. Not relocated — the
things above it are compressed so it rises.

**Pending tasks — not staffed.** Two of five sources appear, in a row the code calls "extras"
(Training, Requests). Coaching, QA and missing call notes never reach this page. A rep can be
behind on all three and this dashboard looks clean. That gap is the main thing this pass fixes.

### Duplication that follows from having no owner for "what's outstanding"
1. **Hours render twice, ~100px apart.** `buildStatusSentence_` emits "5h 54m worked · 32m lunch"
   and the shift-strip `hoursReadout` emits the same. The `#5a` comment says hours "moved off the
   old ledger here" — the move happened, the sentence was never trimmed.
2. **Breaks render three times** — `#clk-next-break` inside the clock card, the B1/Lunch/B2 chips
   from `clkBreakScheduleHtml_`, and the ribbon's own scheduled band.
3. **Two animations compete on the hero** — the cross-fading sky with star field and
   `clkShootMaybe_`, and `clkUpdateRegions_` rotating US zones.
4. **The state pill is far from the state.** `.dash-onclock` sits in the greeting bar; the clock
   card 200px below doesn't say whether you're on shift.

---

# 2 · Needs you

A new block leading the main column, above the carousels.

```
Needs you  (4)                                    nothing overdue
──────────────────────────────────────────────────────────────────
▎🎓  Coaching note to acknowledge                          Open ›
     Minor · logged 23 Aug by R. Choudhury
▎🛡  QA review to acknowledge                              Open ›
     Scored 84 · 2 comments · 28 Aug
  📄  3 calls without a note                               File ›
     Answered today · notes at 84%
  🎓  Training module pending                              Start ›
     PAP resupply refresher · due 5 Sep
```

Overdue rows carry `inset 3px 0 0 var(--warn)` (or `--destructive` past due) and say the word;
never colour alone.

### `getMyPendingTasks()` — one aggregate, rep-callable
Returns a flat sorted array of `{ kind, title, detail, dueIso, overdue, route }`. Five sources,
four already reachable from the client today:

| Source | Where it comes from |
|--------|--------------------|
| Coaching | unacknowledged items from `getMyCoaching` |
| QA | unacknowledged reviews (the My Reviews ack in the QA handoff) |
| Notes | answered-minus-logged, already computed by `loadCoverageStrip_`; reuse `fileMissingCalls_` and its `CLK_NAV_HINT` |
| Training | `getMyTraining` — today's extras card |
| Requests | pending punch-edit / PTO — today's extras card |

Sort overdue first, then by due date. **Render nothing when the list is empty.** The extras row
keeps Spanish Inbox and Requests; Training folds into Needs you.

Why one aggregate rather than five client fetches: the dashboard already pays ~3 RPCs for the
carousels plus 2 for extras, on every focus wake past the SWR window. A sixth, seventh and eighth
would be felt on the Apps Script webview.

---

# 3 · The rail

Order becomes **clock card → punch actions → shift strip**.

### 3a. Clock card
- Time-of-day gradient **stays**, night sub-phases included. It is the app's one piece of warmth,
  and the IST overnight case (Dusk → Nightfall → Midnight → Late night → Pre-dawn) is real.
- **The rotating world-clock strip goes.** `clkUpdateRegions_` animates continuously, sits beside
  a second animation, and a CSR working one timezone never acts on it. The tz `<select>` already
  covers a deliberate lookup, which is the actual use case.
- **`clkShootMaybe_` goes.** A randomized shooting star on a timer is motion with no information,
  and it is the one element that can fire while a rep is reading the card. The static star field
  stays — it's what makes the night phases read as night.
- **`#clk-next-break` goes** (see 3c).
- **A state line arrives** at the card foot: dot + `On the clock` / `On lunch` / `Not in`, and
  hours worked on the right. This is where "am I clocked in" belongs.

Net: roughly 70px shorter, and the punch buttons clear the fold.

### The state line needs a scrim — a literal colour is NOT sufficient here

Every gradient in `clkSkyFor_` is `135deg`, so its **second stop lands at the bottom-right** —
exactly where a full-width status line at the card foot puts its right-hand readout. On the
daytime phases that stop is light: Sunrise `#f6c177`, Morning `#9ec9e8`, Mid-afternoon `#f0c674`,
Dusk `#e0916a`. White at `.92` with the card's `text-shadow` measures ≈1.4:1 over `#f0c674`.

The existing card never hit this because `.clk-meta` and `.clk-regions` are **left-aligned** —
nothing today reaches the light end. Left-aligning the new line only half-fixes it (bottom-left
sits mid-gradient, ≈2.6:1 at 11px).

**So the state line is a full-bleed strip with its own scrim:** `rgba(10,13,20,.72)`, edge-to-edge
at the card foot (negative side margins against the card's padding), `text-shadow: none` inside
it. That clears 4.5:1 on all nine phases including the lightest, and it reads as a deliberate
status bar rather than text hoping for a friendly background. It also removes the need for the
hairline top border.

> **This is the V-2 / OP-3 failure class, and the third time it has bitten this card.** V-2: the
> AM/PM span was painted with a theme-flipping token against a fixed gradient. OP-3: "the #fff
> first cut measured illegible in dark mode and was corrected." The rule those two produced —
> *use a literal colour on this card* — is necessary but not sufficient; the literal also has to
> be measured against **both** gradient stops of **every** phase. Anything new placed at the
> bottom-right of this card needs a scrim.

### 3b. Punch actions
Primary becomes **full-width** — the existing `renderActions` state machine is unchanged
(ClockIn → LunchIn → LunchOut → ClockOut, with the `afterLunch` reorder that demotes LunchOut once
a LunchIn exists). Secondaries and Adjust sit in a 2-up row beneath. On the 360px rail and on the
phone layout this is a better target than the current inline run.

### 3c. Shift strip
- Header keeps state-adjacent facts only: lunch total and note coverage. **Hours move out of the
  sentence, not out of the strip** — finish the `#5a` move by trimming `buildStatusSentence_` to
  "clocked in since X · Yh Zm until end of shift".
- Ribbon unchanged.
- **Break chips absorb the next-break chip**: taken breaks struck through, the next one outlined
  with its countdown. One row instead of three components.
  Keep `clkNextBreak_` — the shell's `remindersTick_` still calls it.

### 3d. Punch list
Undo becomes a labelled button with its live remaining time (`Undo 4:12`) instead of a bare `×`
with a `title`. It is a payroll record inside a 5-minute window; it deserves a label.

> Keep the eligibility guard exactly. `timeDiffSecondsClient` returns the `-1` sentinel for
> malformed and past-window times, and `-1 <= 300` is true — which is why the check is
> `undoDiff >= 0 && undoDiff <= SELF_UNDO_WINDOW_SECONDS`. A countdown label must not reintroduce
> that bug.

Adjustment rows keep `.adj-pill`.

---

# 4 · The rotator

Your call, as specified: keep the rotation, **never rotate away from an active shift.**

In `clkGreetRotStart_`, hold on slide 0 whenever `stats.state` is `working` or `lunch`; resume
when the rep is `out` or hasn't clocked in.

The held state must be **visible**. A rep who saw a What's-new slide yesterday and sees a frozen
line today reads it as a stuck page. Hence the small **Held** chip beside the sentence — which
doubles as the affordance to step through updates manually. Keep both existing early-outs
(`COMPACT_MODE`, and the global reduced-motion neutralization).

---

# 5 · Do not break these
- **The compact pop-out gate.** `clkLoadDashboard_` / `clkLoadDashboardExtras_` early-out under
  `COMPACT_MODE` (cycle-8 M-12) — before that fix the hidden column cost ~3 RPCs per launch and
  again on every ≥20s focus wake. `getMyPendingTasks` needs the same gate or it reintroduces
  exactly that cost.
- **Pending ≠ empty.** `undefined` renders a skeleton, `null` renders "couldn't load". Needs you
  must follow it — a failed fetch reading as "nothing pending" is the worst failure this card can
  have. Same family as the E7/F16 failed≠absent rule.
- **SWR without the flash.** Cache Needs you the way `CLK_DASH` does (60s freshness, paint from
  cache then refresh silently). `clkRefreshState_` re-renders the whole view on every focus and
  visibilitychange; without SWR the card would blink on each one.
- **Card-shaped skeletons.** The operator picked these on 2026-07-10 because the sweep bar read as
  a stray line and the layout jumped on arrival. Needs you gets one too.
- **`esc()`** on every server-derived string.
- The day-rollover refresh (`_clkLastDay`) and the `currentView` late-callback guards stay.

# 6 · Accessibility
- Needs you is a real `<ul>`/`<li>` of real links, count announced
  (`aria-label="Needs you, 4 items"`), overdue carried in words.
- The Held chip is a `<button>` with `aria-pressed`, not a decorative span — it's the manual
  step-through control.
- The full-width punch primary and the undo button both clear 44px.
- Removing two continuous animations is itself a motion-sensitivity gain; the reduced-motion block
  keeps covering the sky cross-fade.

# 7 · Visual coverage
`test/visual/mock.js` needs a `getMyPendingTasks` fixture **and a zero-item variant** — the empty
state is what changes most under this design and a populated fixture will never show it. That is
the third time this gap has appeared (the Coaching handoff's `getMyCoaching` returning `{items:[]}`,
the Admin all-clear path, now this); worth fixing as a fixture-coverage rule rather than one
case at a time.

Add `clock-dashboard-light-wide`, `clock-dashboard-dark-wide` (an overnight-tz rep, so the night
sub-phases get on camera at all), and `clock-needsyou-empty-light-wide`.

**Also pin `clkSkyFor_` across the phase boundaries.** It is already Node-pinned as a pure
helper; extend the pin to assert the hour → phase mapping at each edge (5, 8, 12, 17, 20, 23, 2,
4), since the night walk wraps midnight (`h >= 23 || h < 2`) and an off-by-one there is invisible
to anyone not working that shift. For reference, the mapping is:

| Hours | Phase | Gradient | Stars |
|-------|-------|----------|-------|
| 5–8 | Sunrise | `#e8835a,#f6c177` | 0 |
| 8–12 | Morning | `#4a89c8,#9ec9e8` | 0 |
| 12–17 | Mid-afternoon | `#3f78c0,#f0c674` | 0 |
| 17–20 | Dusk | `#6a4a8c,#e0916a` | 1 |
| 20–23 | Nightfall | `#2b3163,#54406e` | 2 |
| 23–2 | Midnight | `#141a36,#2c2452` | 3 |
| 2–4 | Late night | `#1a2144,#3b2d5c` | 3 |
| 4–5 | Pre-dawn | `#232a52,#7a4a63` | 1 |

The dark board in the mock is the `Late night` row, at 2:54 AM.


---

# Addendum — reviewed against the repo, 2026-09-01

**The ALL-CST policy (2026-08-28) retires the night sub-phases in practice.** Every roster row
becomes `America/Chicago`; PH agents take `8:30-17:00` in Employees column O, India takes the
8:00–17:00 default. `CONFIG.TIMEZONE` stays Asia/Kolkata as the storage frame only, and
`tzMismatchCheck_` was redesigned to compare the rep's profile tz against a server-shipped work
anchor rather than the browser offset — precisely so correctly-configured offshore agents stop
being nagged daily.

Consequence for the sky card: **Nightfall / Midnight / Late night / Pre-dawn cover 20:00–05:00, and
no agent now works those hours.**

- The `clkSkyFor_` phase table in this document stays accurate and the boundary pin is still worth
  writing — the wrap at midnight (`h >= 23 || h < 2`) is still an off-by-one waiting to happen.
- But **the dark board should be a working-hours phase**, not the 2:54 AM `Late night` render it
  currently shows, and the recommendation to shoot `clock-dashboard-dark-wide` "with an
  overnight-tz rep so the night sub-phases get on camera" is now advice to photograph a state no
  user will reach. Shoot dark mode at a real shift hour instead.
- The four night gradients are not dead code — a manager checking in at 22:00 gets Nightfall — but
  they are now decoration for a rare case rather than coverage for a real shift. Worth knowing
  before anyone spends time tuning them.

**Also relevant:** Manage Time and both Training views gained SWR paint-last-good in the same
period, which was the operator-reported slow-load complaint. The Time Clock dashboard's own load
path was not part of that round.
