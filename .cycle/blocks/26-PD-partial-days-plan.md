---PLAN: Batch PD — Partial Days (cycle 26; from call-data-reporting's handoff of 2026-11-16, adjusted 2026-11-18)---

STATUS: planned, NOT built. Its own batch, sequenced AFTER Batch 10 (Stats): Batch 10's F24 reworks the
stamped call-data reader this builds on. A new capability from another repo, not a scan finding — /reflect
counts it under "New capabilities", never as a production fix. Estimate: L (~10 h).

SOURCE (from the handoff, unchanged)
- Workbook: the CDR Report this app already opens (CDR_SS_ID). Tab: `Partial Days`. Row 1 is the header:
    Date | Agent | Credit | Reason | Added By | Added At
- Read columns A–C ONLY. Never read, store, log or show column D (Reason) — admins only. Not E–F either.
- The tab may not exist yet (the dashboard creates it on first use).
- One row per (date, agent); if a hand edit leaves two, use the first.
- Date: normally the text YYYY-MM-DD; a real Date cell is formatted in the SPREADSHEET's timezone
  (America/Mexico_City) — this app's existing cdrRowDateIso_ rule.
- Credit: a number with 0 <= credit < 1 (0, 0.25, 0.5, 0.75 in practice). Skip blank, non-numeric,
  negative and anything >= 1 — a Credit-1 row is a "reviewed: whole day" dismissal, not a mark.
- A day counts for an agent only if they had a call on it. Calls on a marked day STAY in every count.
- Answer rates, totals and talk time never change. This app never writes to the workbook.
- An agent sees this for their OWN numbers only. Dates and shares only — never a reason.

WHAT THIS APP HAS (the handoff's "first check")
There is no "answered per day" figure. Three places divide or compare call counts by days:
  1. Dashboard, My Calls card: "On pace for ~N answered by …" (MTD / YTD) — answered ÷ workdays elapsed × workdays in the period.
  2. Dashboard, MTD deltas on Answered and Missed — this month's count minus last month's over the same number of workdays.
  3. My Stats → Trends, Answered and Missed — each day's own count against the team average per reporting rep that day (cohort ≥ 3).
Not affected: Team Metrics (the manager table), the adjusted figures, rates, talk time, the Team card.

ADJUSTMENTS TO THE HANDOFF (operator accepted all four recommendations, 2026-11-18)
  A1. Divisor basis. This app divides by WORKDAYS (a day off already counts as a zero day), not by days
      with calls. A mark subtracts (1 − credit) from the existing workday divisor, for a marked day the
      rep had a call on. An unmarked rep's numbers do not change. The handoff's worked example still
      gives 19.75 (21 workdays, marks of 0.5 and 0.25).
  A2. Daily trend. A single partial day is under one credited day, which the handoff would draw as a
      dash. Here the rep's own count is kept and the point is MARKED as a partial day (with its share on
      hover); the team average for that day divides by the SUM of credits of the reps it includes.
  A3. MTD deltas stay in calls, compared like for like: this month's count against last month's scaled
      by (this window's credited days ÷ last window's credited days). With no mark in either window the
      ratio is 1 and the delta is what it is today. If either window has under one credited day, totals
      are compared as before.
  A4. The Team card (department totals and its "on pace" line) is NOT adjusted — partial days are an
      individual matter.
  A5. Names. `Agent` is matched through this app's alias map (`Agent Alias Overrides`) to the Team Tools
      roster name, as the call-data reader does. A mark for a name not on the roster is ignored and
      counted on Storage Health.
  A6. A failed read. A missing tab is "no marks" (steady state, silent). A read that THROWS also means
      no marks for that response, but it is never cached, and the Storage Health CDR row states the tab's
      state (read · absent · bad header · unreadable) — the Company Holidays / Dashboard Standards pattern.
  A7. Caching is three layers here. The tab's columns A–C join the CDR data stamp (so every window
      total keyed by it turns over); the Dashboard card's own six-hour key gains the marks' hash; the
      My Stats key is bumped. The hourly read-ahead uses the same stamp, so its keys match.
  A8. For the other repo's records: `Partial Days` is the NINTH CDR tab this app reads, not the sixth
      (DQE Historical Data, CSR Transfer Historical Data, Agent Alias Overrides, Inbound Calls,
      Outbound Calls, Company Holidays, Dashboard Standards, DO NOT EDIT!).

STEPS
  PD1 Reader — one function in 40_metrics.js: the tab by name, getRange(…, 3 columns), header checked
      (Date | Agent | Credit), dates through cdrRowDateIso_, credit rules as above, first row wins,
      alias-mapped names. Returns its `source` state and the marks by agent and date.
  PD2 Stamp and keys — add the tab (A–C) to cdrDataStamp_'s probes; bump dash_metrics and metrics_my keys;
      the dashboard key carries the marks' hash.
  PD3 Maths — a pure credited-days helper. getCdrAgentMetrics_ emits, per agent, the credited share to
      subtract and the marked dates that had calls (small — the year-to-date payload must stay under the
      100 KB cache limit; no per-agent date lists).
  PD4 Dashboard My Calls card — the projection over (workdays elapsed − uncredited share), omitted under
      one credited day; the MTD deltas per A3; the attendance line "19.75 of 21 workdays, 2 partial"
      and the hover "Partial days: Tue Nov 10 (0.5 day), Fri Oct 30 (0.25 day)" (credit 0 reads
      "not counted") — only when at least one day is marked; only the caller's own marks leave the server.
  PD5 My Stats trends — per A2, for Answered and Missed only.
  PD6 Storage Health CDR row; the editor suite's CDR fixture gains the tab; visual fixtures and two
      scenarios (a marked rep's Dashboard card, a trend with a partial day); docs (the storage map's CDR
      row, operator-state, an invariant, a scenario); the report-back text for call-data-reporting.

TESTS (the handoff's list, plus this repo's)
  - Parser: text date; Date cell in the spreadsheet timezone; credit 0 / 0.25 / 0.75 kept; 1, 1.5, −0.1,
    blank and "x" skipped; blank agent skipped; duplicate row → the first; missing tab → no marks;
    a thrown read → no marks, not cached, state "unreadable".
  - Maths: the worked example (419 answered, 21 workdays, marks 0.5 and 0.25 → 19.75); under one credited
    day → no projection; an unmarked rep byte-identical to before; the Team card unchanged.
  - Privacy: the read is exactly three columns wide; the word "Reason" and no reason text in any payload;
    another rep's marks never in the caller's payload.
  - Bite-check every new pin.

REPORT BACK (for call-data-reporting, after it is built)
  - The three figures above, and which were changed.
  - The tab name and columns A–C read as described; A5 (alias map) and A1 (workday divisor) differ from
    the dashboard's own rule and why.
  - Their operator-state #68: a ninth tab, and a rename or a move of A–C is a two-repo edit; #94 → built.
---END PLAN---
