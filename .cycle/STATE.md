# Cycle State

## Current
Cycle: 13
Phase: idle
Scope: —
Test Command: manual
Subsystem cycles since last Seams audit: 2 (cycle 11 was the seams audit;
  /reflect increments — cadence is every 4, so 2 more subsystem cycles before
  the next Seams & Invariants audit is due)
Updated: 2026-07-27

NUMBERING NOTE: `Cycle: 13` is RESERVED, not started. CLAUDE.md's rule is that
the number increments when a NEW audit cycle BEGINS (a fresh `/broad-scan` or
`/audit` after the prior `/reflect`); it was set here at cycle-12 close-out on
the operator's instruction. No cycle-13 audit has run, so nothing should be
recorded against 13 until one does — and if the next audit is a Seams audit or
a targeted cycle, it still takes this number.

## In progress (facts to carry forward — NOT judgments)
- Nothing in progress. Cycle 12 is closed: audit + visual addendum, all 27
  findings shipped across six batches, reflected (net 11), docs synced, and
  PR #143 merged to main on green CI (3ad80d8).

## Completed this cycle
- (nothing yet — cycle 13 has not started)

## Pending / not yet done
- **CARRIED FROM CYCLE 12 — the operator deploy is still UNCONFIRMED.** Cycle 12
  was closed out on instruction before the deploy was verified, so this is the
  one piece of cycle-12 work still outstanding:
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → Version:
     **New version** → Deploy
  3. Run `runAllTests()` in the editor — the F3 bounded-move behavioural case,
     the F2 sheet-doctor contract, the F6 cache-reset effect and the two NEW
     smoke tests (`cn_enrolledSheetId_trimsAndNullGuards`,
     `cn_appendBounded_capsAndRollsBack`) execute ONLY there.
  Expect three visible changes: the anonymized team line may hide on days it
  previously showed (F4 cohort fix), every modal primary is now `--accent` green
  (V-8, one shared class behind ~25 call sites), and sidebar/mobile nav labels
  are SHORT with the full label on hover (V-5/6/7).
  NOTE this deploy also covers cycle 11's follow-up visual batch, which was
  never separately deployed.
- Cycle 12's handoff blocks are NOT on disk. The `.cycle/blocks/` convention was
  adopted mid-cycle with the v1.23.0 command sync (template R19), so cycle 12's
  six implementation blocks + one cycle-summary block exist only in that
  session's scrollback. They can be reconstructed from the record, but only as
  RECONSTRUCTIONS — a reconstruction filed as the verbatim block is worse than
  an absent one. Cycle 13 onward writes them automatically.

## Open follow-on items
Carried forward from cycle 12 (see the HISTORY.md block for the full list):
- `Code.js getSpanishInboxStats` | `pendingList` is a DEAD field — no client
  reads it (both the Spanish tab and the dashboard card use the separate,
  uncapped `getSpanishInboxPending`). Its F18 cap flag is therefore
  correct-but-unobservable; removing the field is the real cleanup, deferred as
  a response-shape change.
- `Code.js` | the OTHER Timesheet-archive readers are still live-tab-only:
  `buildTimesheetForEmployee_` (employee calendar), `getPunctualityReport`,
  `tsDoctorScan_`. F1 fixed the money path (the ADP export) only.
- `tc/script_clock.html loadCoverageStrip_` | blanks the strip on a COLD-miss
  failure. Deliberate + documented as the SWR keep-last-good rule, so F16 left
  it alone — but it is the one remaining place a failed load reads as absence.
- `tc/script_clock.html` | the clock card's AMBER gradient end is ~1.5:1 against
  white for `.clk-time` ITSELF, not just the AM/PM span V-2 fixed. A card-level
  design call (scrim, or a darker amber end) — needs an operator decision.
- `Code.js archiveOldTimesheetRows` | `hitPerRunCap` reads "more remain" on a run
  that moved exactly the cap with nothing left. Cosmetic, audit-note only.
- V-9's other two dead-space instances (dashboard rail 284px shorter than the
  main column; Metrics hero 119px shorter than its rail) are shorter COLUMNS
  with no stretched card — rebalancing means moving content between columns, an
  operator design call.
- **V-13 (deferred by decision)** — Metrics' four competing date controls +
  30-point sparklines rendered into ~145×40px with no axis or baseline. A
  redesign needing an operator opinion, not a defect.
- No visual Regression Scenarios exist yet (72 scenarios, none visual). The
  freshly-synced `/broad-scan` emits OPERATOR VISUAL CHECKS in exactly the
  Regression-Scenario format for direct promotion, so the next scan should
  start producing them.
- `/pr-review` is the one template command not installed (it sits under the
  template's separate "Per-Change Review" heading, not Tier 3).

## Decisions made (so the next session doesn't re-litigate)
- Cycle 12's full decision record lives in its HISTORY.md block. The two worth
  carrying into any future work on the same surfaces:
  - A `max-height` on a GRID CONTAINER does not constrain its row (measured: a
    long article grew the page to 13.7k px and the reader's internal scroll was
    gone). Caps on a content-sized-but-capped grid belong on the ITEMS. This is
    now a Common Gotcha in CLAUDE.md.
  - `/reflect` Q1 counts a user-visible interface defect as a PRODUCTION FIX
    (template R18, adopted this cycle). Cycles ≤11 scored those as
    defensive/structural and excluded them from `net_score`, so cumulative
    `net_score` spans two rules at the 11/12 boundary — deliberate, documented
    upstream, and nothing was rewritten retroactively.

## Where I left off
Cycle 12 is CLOSED and merged (PR #143 → main, 3ad80d8); its block is archived
in `.cycle/HISTORY.md` and this file is reset. The ONLY outstanding cycle-12
work is the operator deploy above — do that first, and if `runAllTests()`
surfaces anything, it belongs to cycle 12, not 13. Otherwise cycle 13 starts
with a fresh `/broad-scan` (or `/audit`); the Seams audit is due in 2 more
subsystem cycles. The command templates are current (workflow-tools v1.23.0,
19/20 installed), so the next `/broad-scan` will include the interface lens and
the next implement/reflect will persist their blocks to `.cycle/blocks/`.

## History
Closed-cycle records live in `.cycle/HISTORY.md` (append-only, newest first).
This file holds ONLY the current cycle — see CLAUDE.md "Cycle State & Memory"
for the close-out procedure.
