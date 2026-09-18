---CYCLE SUMMARY BLOCK---
Scope: Server (all fourteen files), Client (shell, Time Clock, Call Notes, Metrics, Intake, Reference, QA, public forms), Test Suite, CI | Cycle: 20 / 2026-09-17..18 (the /broad-scan of 2026-09-17 and all SEVEN batches of its plan)
Production fixes: 28 — severity: 3 High (every price-quoted external send refused on the operator's real sheet shape; a same-minute clock-in/out paid a 24-hour day into payroll, the pay statement and the accrual index; two modals unclosable since 2026-09-02), 12 Medium (a failed department fetch cached as an empty config for the session; the Dashboard carousels reading an outage as "No call data"; the geocoder's quota telling a rep their ADDRESS was wrong; a failed DQE read counted as "0 calls without a note"; the coverage strip's failure indistinguishable from a quiet day; the KB landing's failed counts read as zero; a badge captioned "below 85%" while judging against 92; the ambient badge silent every Monday and the morning after a holiday; PatientTrx rows sitting on the payroll sheet with two comments calling the store PHI-free; the Admin KPI strip captioning the caller's own counts "across team"; the boot-failure Retry rendering a blank iframe; the Spanish stats card and the list below it disagreeing every day), 13 Low (an untouched intake toggle rendering as "No"; feedback thanking before the server recorded it; "US holiday" copy on six manager surfaces; a stale automation error rendering "unknown error" for ever; a test manager left in MANAGER_EMAILS by a killed suite run; a tag rename reporting success for a rep it skipped; an apostrophe in an agent name throwing on click; five static modals plus the shortcuts overlay never restoring focus; a manager told they wrote the rep's question; a public form's five accordions with no exposed state; a quick-chip row labelled "this week" over all-time counts; the ADP export's URL lost to a pop-up blocker; an open or unparseable day painted as a 0-hour bar)
New capabilities/features: 0 — two findings (F-08, F-09) shipped a small Admin → System diagnostic as part of the fix rather than as a feature, and are counted with their fixes.
Defensive/structural: 25
New failure modes: 3 — severity: 3 Low. (1) The cycle's dominant theme created a matching hazard: eight honest-failure fixes changed helpers from `value | null` to `{value, unavailable}` or to a meaningful `null`, so a caller written as `if (!x)` now reads an unavailable service as a present-but-empty answer, and one written as arithmetic gets NaN. Every current caller was enumerated and pinned; the trap is for the next one, and three separate batch blocks named it as a regression risk while none counted it. (2) F-16's ambiguity refusal is silent: an agent whose roster name is duplicated now sees NONE of their own QA reviews rather than possibly someone else's, with nothing telling them or a reviewer why. The fail direction is right; the silence is a new hole. (3) F-34's fold puts a voicemail resolved by a member reply into the Spanish response-time series, so the median mixes a real request-to-reply gap with the gap between an 8x8 notification and someone replying on a no-reply thread, and `vmSuppressed` steps up because the duration gate now runs before the resolution check.
Net score: 28 − 3 = 25
Invariant candidates: INV-225 (a read that widens from `value | null` to `{value, flag}` enumerates and PINS every caller, because a truthiness check now misreads an unavailable service as an empty answer) · INV-226 (a gate that refuses on AMBIGUITY surfaces what it refused — withholding silently is not the safe direction, it is a second failure) · INV-227 (a change that MOVES a number an operator watches states the direction of the step in the operator log, not just that the number changed)
Most structurally significant change: the honest-failure sweep — eight degraded reads in Batch 2 alone, and more in every later batch, stopped rendering an absence as data; the project now has a reflex (`{value, unavailable}`, `errorStateHtml_`, a lower bound rather than a total) where it previously had eight independent `catch → 0` sites.
Should-have-been-deferred: F-52's fourth pin. Three of the four structural pins were drivable and the rewrites were worth the day; the width-cap one is an absence assertion with no function to call, and the hour spent establishing that — then writing a pin that says so — bought a comment. It should have been logged as a known limit of that pin and left alone.
---END CYCLE SUMMARY BLOCK---

## Corrections to the self-reports

The seven implementation blocks sum to 30 − 1 = 29. Re-derived strictly this
cycle is 28 − 3 = 25. Four corrections, in both directions:

1. **F-07 is defensive, not a production fix (Batch 3, −1).** Its own block
   hedged: "if the operator reads this as 'not this month', score it
   defensive". The seed install publishes CSR 92 / 2 WITH an amber band, so the
   Metrics table and the Clock card agree today. The split fires only once a
   standard is published without a band, which has not happened. Doing it was
   right — two surfaces deciding independently what a null means is exactly the
   drift the H2 round shipped — but it had not fired.
2. **F-31 is defensive, not a production fix (Batch 7, −1).** Its block scored
   it YES on the grounds that the DEV instance is a surface the operator uses
   daily. STATE.md says the dev instance does not exist yet — standing it up is
   cycle 19's step 8, still owed. `runAllTests` refuses on prod, so the cache
   leak had nowhere to fire. This is the sharper lesson of the two: a block
   reasoned from an environment the project has been planning for a month and
   does not have.
3. **F-16 introduced a new failure mode its block reported as "the one
   behaviour a reader should know" (Batch 5, +1 failure mode).** A legacy shared
   recording under a duplicated roster name is now invisible to everyone until
   someone re-attributes it. The skill's rule is explicit: if the post-cycle
   state is worse under any realistic scenario, count it rather than bury it as
   a tradeoff. Refusing the PHI-adjacent release is right; doing it silently is
   the part that is worse.
4. **The widened return shapes are a cycle-level new failure mode that no
   single batch owned (+1).** Batches 2 and 3 each named it as a regression
   risk in their own scope — "a future caller that checks only `if (!g)`", "a
   FUTURE consumer that does arithmetic on `pctAnswered` gets NaN" — and each
   was right that its own callers were covered. Nobody counted it, because at
   batch scope it always looks like someone else's future problem. At cycle
   scope it is one hazard the cycle created, eight times over.

Four production fixes are **YES for the class, occurrence unverified**: F-03
(a same-minute punch pair is legal on the live path and nothing guarded it),
F-15 (the shared geocoder quota is uncapped), F-10 (an unreadable rep Sheet is
the recurring g47/g89 condition), F-46 (a stale accrual shortfall survives a
tracking-off toggle). They are counted because in each case the wrong answer is
produced on every occurrence and nothing would have surfaced it. **F-03 is
settleable and is not yet settled**: the post-deploy sheet-doctor run lists
every equal-minute day that was paying 24 hours, and that run is still owed.

## Honest impact summary

- **For a user right now: nothing, and that is the headline.** Fifty-two
  findings are implemented, pinned and pushed to `claude/festive-noether-unougu`
  and NONE of it is deployed. Everything below describes what lands on the
  first `clasp push -f` plus New version, not what a rep sees today. The
  backlog is now seven batches deep on top of the cycle-19 work that was
  already waiting.
- **After that deploy:** an OOP-quoted external send stops being refused; a
  same-minute punch pair stops paying a 24-hour day and the doctor lists the
  historical ones; the Scheduled-reminders and Scratchpad modals close; eight
  surfaces that rendered a failed read as real data now say they could not read
  it; a rep's answer rate is toned against the published standard with its
  source named; a manager's Admin KPI strip stops calling their own week the
  team's; five modals and the shortcuts overlay hand focus back; the public
  form's accordions announce their state; the export dialog keeps the link a
  blocker used to eat; the live-status sparkline stops reporting "0 hours
  worked" for a rep who is still clocked in; and the Spanish stats card finally
  agrees with the list beneath it.
- **For the next developer:** the honest-failure posture is now a reflex with
  a vocabulary — `{value, unavailable}`, `errorStateHtml_`, "≥ N" for a partial
  cross-rep walk — rather than eight independent `catch → 0` sites. Every
  overlay goes through `ensureOverlay`/`closeOverlay` (INV-221). A gate claim
  in a comment, an invariant or a counted figure is derived from the refusal
  literal (INV-224), so "manager-gated" cannot sit over an admin gate again.
  And the pins themselves are now expected to DRIVE what they are named for
  (INV-222) — the single most useful thing this cycle produced for whoever
  reads the suite next.
- **Safer under scale:** two DQE readers plus the queue-inventory panel read a
  date SPAN rather than scanning the tail, so a cold Dashboard open stops
  re-reading a 34-column tab twice; the accrual credit is idempotent per month
  rather than per catch-up window; a killed suite run no longer leaves a TEST
  manager in the gate.
- **Effort on dead code / future-proofing:** F-24 (a hash-less issued doc that
  does not exist), F-23 (an eligibility cell nobody has), F-53 (a test seam
  that broke nothing), F-50 (six advanced services nothing uses), F-39 (a
  mirror that has not drifted). Five of fifty-three, which is a reasonable
  share — but F-50 and F-53 are the kind whose whole value is the trap they
  disarm for whoever reaches for them first.

## Invariant growth

- **INV-225** | A read that widens from `value | null` to `{value, flag}`
  enumerates and PINS every caller in the same change, because `if (!x)` now
  reads an unavailable service as a present-but-empty answer and arithmetic on
  a meaningful `null` gets NaN. The pin's caller list grows with every new
  caller. | Subsystem: Server seam (KB counts, the geocoder, `cdrAnswerPct_`,
  `getMyMetrics.cdrUnavailable`) | Verify: the F-25/F-15/F-32 caller-list
  assertions, which must fail when a new caller reads the bare value.
- **INV-226** | A gate that refuses on AMBIGUITY surfaces what it refused.
  Withholding silently is not the conservative direction — it is a second
  failure wearing the first one's clothes. | Subsystem: QA (the duplicated
  roster name), and any scope predicate that resolves to nobody | Verify: an
  assertion that the agent-facing QA read reports the count it suppressed and
  why, not merely an empty list.
- **INV-227** | A change that MOVES a number an operator watches states the
  DIRECTION of the step in the operator log, not just that the number changed.
  | Subsystem: Operator docs | Verify: the Batch 7 operator-log entry, which
  says `vmSuppressed` will tick up and why.

## Estimate calibration

Seven batches, every one estimated M, every estimate written BEFORE the first
edit — the first complete set in the project's record, and INV-203 working as
intended. Estimated 44 h against ~16 h actual, **0.36x overall**. The shape is
the interesting part: batches 1 through 6 ran 0.20x to 0.42x, and Batch 7 ran
**1.0x** — the only batch on target all cycle, and the only one whose work was
writing test drives rather than changing product code. The M band is not
mis-sized for this project; it is mis-sized for FIXES, where the scan has
already done the diagnosis. Reading a finding that names the file, the line and
the wrong behaviour and then changing it is a fraction of the work the estimate
imagines. Writing a pin that drives a function against a fake Sheets API is
not.

## Seam counter

"Subsystem cycles since last Seams audit" 5 → 6. The every-4 cadence has now
been missed twice over. The next `/audit` should be a Seams & Invariants audit,
and cycle 20 makes the case louder rather than quieter: the library gained
twelve entries this cycle (INV-213..224) and nothing has probed the older ones.
