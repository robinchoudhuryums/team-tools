---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- BIZ-1 | Elapsed-time arithmetic counted the CALENDAR, not working hours —
  a pure, bounded business-minutes core (weekends, US holidays, after-hours).
- BIZ-2 | Applied to every surface that reports an elapsed time: the Spanish
  inbox stats, the per-thread resolved card, Dept Requests' elapsed + SLA
  bands, and the daily SLA reminder digest.
- BIZ-3 | Clients lead with the business figure, keep wall clock as the
  secondary, and NAME what is excluded.

Files modified:
- web-app/Code.js
- web-app/metrics/script_metrics.html
- web-app/metrics/script_deptrequests.html
- web-app/tc/script_clock.html
- test/client/run.js
- test/visual/mock.js
- CLAUDE.md
- .cycle/STATE.md

CHANGES:
BIZ-1 | web-app/Code.js | `businessHours_()` (reads the Coverage planner's
  existing COVERAGE_BUSINESS_START_HOUR / _END_HOUR / COVERAGE_WEEKDAYS_ONLY,
  so "working hour" has ONE definition across coverage bands and response
  times); `BIZ_MAX_SPAN_DAYS`=400; the PURE `bizMinutesLocal_` (takes
  pre-converted {date,min} points + a holiday set, walks days UTC-anchored
  with no Utilities dependency — which is what makes it Node-testable);
  `bizPointInTz_`; and the `businessMinutesBetween_` wrapper defaulting to
  CONFIG.MANAGER_TIMEZONE (the operating anchor, NOT CONFIG.TIMEZONE, the
  storage frame). Per-day overlap handles every clamp uniformly. A span
  wholly outside business hours yields 0 — a real answer; a reversed pair,
  corrupt stamp, absurd span or inverted window yields null (UNKNOWN), never
  a plausible substitute (the F8 rule).
BIZ-2 | web-app/Code.js | `getSpanishInboxStats` computes a business sample
  (a null duration is DROPPED, never coerced to 0) and ships
  avgBusinessMinutes / medianBusinessMinutes / businessCount / businessHours
  ADDITIVELY beside the KEPT wall-clock pair. `getSpanishInboxResolved`'s
  per-thread `resolveMinutes` is now the business figure with
  `resolveWallMinutes` alongside — the card and the aggregate above it must
  share a unit or they contradict each other on one screen.
  `getDeptRequests`: `elapsedMin` IS the business figure (so `deptStats`
  avg/median follow with no extra wiring), `elapsedWallMin` + `slaBusiness`
  are additive, and `slaStatus` bands on business minutes — banding on wall
  clock while displaying business would be two verdicts.
  `deptRequestsOverdueOpen_` (the daily SLA digest) moved to the SAME helper:
  it and the tracker read one store and previously used different arithmetic,
  so a request could be "overdue" in an email and on-time on screen.
BIZ-3 | metrics/script_metrics.html | The Spanish KPI strip leads with the
  business figure and renders "wall clock <X>" as its sub-line, detected from
  the payload so an OLDER server falls back to wall clock as the headline; a
  one-line note names the window and what is excluded. The resolved card
  carries both units in its title.
BIZ-3 | tc/script_clock.html | The dashboard Spanish card's median (both the
  pending-preview head and the KPI tiles) prefers the business figure with a
  wall-clock fallback.
BIZ-3 | metrics/script_deptrequests.html | A gated business note
  (`drBusinessNoteHtml_`, rendered only when the server sets `slaBusiness`)
  and the wall-clock figure in each card's title. MEASURED FIX: the `dr-kpi`
  id moved off the `.telemetry` grid onto a WRAPPER around strip+note, because
  `drRepaintKpi_` replaces that element's outerHTML on an in-place resolve and
  a note rendered as a sibling would stack one copy per patch.
Pins | test/client/run.js | BIZ-1 behavioural (the motivating case — Fri 16:00
  → Mon 09:00 = 2 business hours, not 3 days — plus clamps, a full day = the
  9-hour window, a whole intervening weekday, holiday exclusion proven
  load-bearing by asserting BOTH directions, and every null path); BIZ-2
  wiring (one wrapper, the manager tz, the guarded push, all four surfaces,
  and a BAN on a raw wall-clock age returning to the digest); BIZ-3 client
  wiring (business headline with fallback, the note gated, the dr-kpi wrapper
  shape, both dashboard paths moved together).
Fixtures | test/visual/mock.js | Business fields on the Spanish stats
  DELIBERATELY smaller than the wall-clock pair beside them (that contrast is
  the thing a screenshot must show), both units on the resolved cards, and
  business/wall/slaBusiness on every DR item (INV-185).

TEST RESULTS: pure 696 passed / 0 failed (was 692); DOM 82 passed / 0 failed;
visual matrix 55 scenarios, 0 missing, 0 overflow. 13 mutations bite-checked,
13 bite — ONE pin was weaker than its property on the first attempt (it
passed against `bizMin == null ? 0 : bizMin`, which keeps both a `push(` and
a `null` mention) and was tightened to the guarded push shape before it bit.
Regression scenarios walked: S74 (Dept-Request tracking end to end — the
elapsed/SLA half re-read against the new unit), S80 (Spanish resolution
share — unaffected, it counts resolvers not durations). Both PASS by
inspection + the visual shoot; the Gmail-backed halves are operator-only.

REGRESSION RISKS:
- Every new server field is ADDITIVE and every client read is guarded, so
  deploy skew in either direction renders as before: an old client ignores
  the business fields, an old server makes the new client fall back to wall
  clock as the headline and suppress the note.
- `deptStats` avg/median change value because `elapsedMin` changed meaning.
  That is intended (the department aggregate should describe the team, not
  the calendar) and is stated in the operator entry, but it IS the one place
  a number moves without a visible label change.
- The SLA bands move: a request that only looked overdue because it sat
  through a weekend now reads on-time. Intended, and the digest agrees.

INVARIANTS AT RISK: None. INV-187 is strengthened (a null duration is
dropped from the sample rather than counted as 0, and an uncomputable age is
skipped rather than nagged about); INV-138's SLA clause and the Spanish
tracking entry were amended to match; INV-185 honored in the fixture.

NET SCORE: 2 production fixes (the Spanish median counting weekends; the
digest/tracker disagreeing about overdue) − 0 new failure modes = +2

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments →
Edit → Version: New version. (Rides the still-owed PR #176/#177 deploy.)

FOLLOW-ON ITEMS:
- The business window is CONFIG-only (no Script Property override), so
  changing 8 AM–5 PM needs a redeploy. Deliberate for now — it is shared with
  the Coverage planner, and an Admin editor would need to say that out loud.
- `getSpanishInboxPending`'s fixture still carries an unused `medianMinutes`
  key; harmless, not mine to change in this round.

DOCUMENTATION UPDATES NEEDED: None outstanding — CLAUDE.md gained the
business-hours Key Design Decision, a 2026-08-31 operator-state entry stating
that every response-time figure gets smaller post-deploy, and amendments to
the Spanish tracking entry + INV-138's SLA clause; STATE.md carries NEWEST #12.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
