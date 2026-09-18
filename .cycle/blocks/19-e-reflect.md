---CYCLE SUMMARY BLOCK---
Scope: Server (CDR bridge: holidays, answer standard, DQE reads), Client (Metrics views, Time Clock views), Test Suite, CI | Cycle: 19 / 2026-09-18 (FIFTH reflection — the H1/H2/H3 cross-repo round of 2026-09-17, the last unreflected work of cycle 19)
Production fixes: 5 — severity: 3 Medium (the morning after a company holiday "Yesterday" was the holiday and every rate read zero — Labor Day 2026-09-07 fired it this month; % Answered divided by rung where the dashboard divides by answered + missed, so a rep and their manager read different numbers off the same DQE row every day; the warn cutoff was a hand-carried 85 while the dashboard tints at 92 with a 2-pt band — a rep at 88 was green here and amber there), 2 Low (the coverage/punctuality/PTO surfaces marked Columbus and Veterans Day as closures the company does not observe; the anonymized team benchmark included the manager's token call volume the dashboard subtracts)
New capabilities/features: 0
Defensive/structural: 6 (H3 entire: the Sheets-serial date branch with no observed serial cell; the CDR_CACHE_TTL comment; the span-bounded DQE read — a cost, every cold open read the 34-column tab twice, but no user-visible defect; the MAIL-SWEEP pin; the LF policy; the CI TZ pin)
New failure modes: 2 — severity: 1 Medium (H2 let the amber band be NULL and left two consumers to decide what null means — the Metrics table said 0 pt, the Clock card said the local 5 pt, so the same value toned differently on two surfaces the moment a standard published without a band), 1 Low (H2 replaced the 85 cutoff everywhere except the badge tooltip's `res.threshold || 85`, so a badge judged against 92 was captioned "below 85% threshold"). Both were found by the cycle-20 /broad-scan (F-07, F-08) and closed in its Batch 3 on 2026-09-17 — counted here because H2 shipped them.
Net score: 5 − 2 = 3
Invariant candidates: INV-216 (a value that is PUBLISHED by another system and rendered as a verdict here carries its SOURCE to every surface that renders the verdict — a silent fallback or a silent "no standard" is indistinguishable from the real thing; held by Batch 3's F-08/F-09 pins) · INV-217 (two surfaces that tone the same published number share ONE band rule, and a null band is a rule, not a per-surface default; held by `mtAnswerBand_` and the F-07 grid pin) · INV-218 (a client string that captions a server-published number never carries a literal of it — `|| 85`, `|| 5` — the `threshold || \d` ban in the F-08 pin)
Most structurally significant change: `getCdrDashboardStandard_` + `cdrStandardShip_` — the answer standard is READ from the dashboard's published tab and shipped with a source verdict through one shape, and `CDR_ALERT_THRESHOLD` is gone: the first mirrored-config value between the two repos to become a published one, and the pattern the queue/dept vocabulary is queued to follow.
Should-have-been-deferred: H3's three infrastructure ports (MAIL-SWEEP, `.gitattributes`, the CI TZ pin). Each is sound, none fired, and they rode the same session as two behaviour changes to the CDR bridge on the day of a deploy — the hours would have been better spent on the two H2 leftovers the scan found four hours later (the null-band split and the tooltip's 85), which were in the H2 diff and visible to a re-read.
---END CYCLE SUMMARY BLOCK---

## Scope note

Cycle 19 has four earlier reflections (19-a: the scan batches; 19-b: P/S/Q/C;
19-c: D1/D2/F1/F2; 19-d: previewPtoAccruals, R, T, perDay/lint, the fixtures,
SP/SP2/PTO, OOP-A/B/C, ELIG, the store move). STATE.md's "still owed" line named
the estimates rows for D1…OOP-C and H1–H3; every row but H1–H3's was already in
`.cycle/estimates.csv` (19-c and 19-d wrote them). What was actually unreflected
is the H1/H2/H3 round of 2026-09-17 (PR #259), so this reflection covers exactly
that. The 19-a…19-d rows are NOT superseded.

## Corrections to the self-reports

1. **H1 and H2 have NO implementation block on disk.** The round was a
   cross-repo session; only H3 wrote a block (`20pre-H3-bridge-infra-…`, named
   for cycle 20 although the work is cycle 19's — recorded here, not renamed).
   Their tallies above are derived from the commit messages (e43b5b0, 20446bc),
   the operator-log entries, gotchas g123/g124 and the H1-1..H2-4 pins. This is
   the second round in the project's record without a block (cycle 12 predates
   the convention; this one post-dates it).
2. **H1 and H2 recorded no estimate.** No `Estimates:` line was written for
   either (the sixth skip of the Batch P rule; the SessionStart hook prints the
   reminder and it was skipped again in a session that had no `.cycle/` context
   loaded — the cross-repo session started from the other repo). Their
   estimates.csv rows carry the actual only.
3. **H3's block scored B3 (the span-bounded read) as a production fix and a
   call-data-reporting CI job as a new failure mode (1 − 1 = 0).** Strict: the
   span read is a COST reduction with no user-visible defect (no timeout, no
   wrong number was reported) → defensive; the registry dependency of the lint
   job belongs to the other repo's ledger → not counted here. H3 in team-tools
   is 0 − 0.
4. **H2 self-reported no new failure mode; it introduced two** (the block did
   not exist to report either). Both are in the tally.

## Honest impact summary

- **What changed for a user right now:** nothing yet from THIS reflection —
  the round was deployed 2026-09-17 with the smoke suite green, so as of that
  deploy: the morning after a holiday, My Stats shows the last real workday
  (Friday for a Monday holiday) instead of a zero day; a rep's % Answered is
  the same whole number their manager sees on the Department Dashboard, toned
  against the same 92 / 2-pt standard; Columbus and Veterans Day no longer
  read as closures on the coverage, punctuality and PTO surfaces; the team
  benchmark omits the manager. Until Batch 3 deploys, the badge tooltip still
  says 85 and a band-less standard tones the Clock card and the table
  differently.
- **For the next developer:** there is now ONE holiday accessor
  (`getCompanyHolidays_`), ONE answer formula (`cdrAnswerPct_`), ONE standard
  reader with a source verdict, and `getUsHolidays_` / `CDR_ALERT_THRESHOLD`
  are no longer things to reach for (pinned). The DQE readers read a span; a
  new reader that reads the whole tab fails H3-4.
- **Safer under scale:** the two DQE readers stopped scanning the whole
  34-column tab twice per cold Dashboard open; the standard and holiday reads
  are 1h-cached with `unavailable` never cached.
- **Effort on dead code / future-proofing:** H3's three infrastructure ports
  (see should-have-been-deferred) and the serial-date branch, for which no
  serial cell has been observed.

## Estimate calibration

H3: S (~3 h) + S (~3 h) estimated, ~2.5 h actual across both repos (~0.6 h of
it in team-tools) — 0.4x, the S-band's usual inflation when the work is
mechanical ports. H1 ≈ 0.75 h and H2 ≈ 0.5 h actual (commit spacing
16:05→16:50→17:20 UTC), no estimate to compare. Trend: S/M rows across
cycle 19 sit at 0.6–0.75x; the two L rows at 0.44x; unrecorded estimates
are now the larger calibration problem than inflated ones.

## Seam counter

"Subsystem cycles since last Seams audit" 4 → 5. The every-4 cadence was
already met at 19-d; the next `/audit` should still be a Seams & Invariants
audit.
