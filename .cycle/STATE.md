# Cycle State

## Current
Cycle: 22 — opened 2026-09-23 by a `/broad-scan` (99 findings: 0 Critical /
3 High; nine-batch implementation plan). Cycle 21 + 21post are in HISTORY.md.
Phase: implement
Scope: broad — Batch 1 DONE (S1, X2, S3, S4, S9) + S2 DONE + Batch 2 DONE (T1, T3, T2, T6, C1, C5) + follow-ons F1–F5 DONE + Batch 3 DONE (I1, C4, K2, K6, C3, D6, D7, C6, C10, C11) + Batch 4 DONE (M4, M1, X3, M2, M8, M3, M7, M9, D1, D2) + Batch 5 DONE (K3, K1, K4, K5, X1, K7, K9, K12, K11, K13, K10) + Batch 6 DONE (A1, A2, C2, A3, S7, A4, A5, A6, A8) + Batch 7 DONE (T5, T4, T7, T8, T9, T10, T11, D3, D5, M10, M5)
Test Command: manual
Estimates: Batch 1: M (~11.5 h) — S1 M 3h · S2 M 4h · S3 S 1.5h · S4 S 0.5h · S9 S 1h · X2 S 1.5h | Actual: ~4 h for the five delivered (S2 not spent) · S2 (phased, blanket): L (~9 h) — helper+pin 1h · wrap every write site ~180 + pin repairs 6h · derived pin + bite-checks 2h | S2 Actual: ~5 h · Batch 2: M (~11.5 h) — T1 M 3h · T3 M 3h · T2 S 1.5h · T6 S 1.5h · C1 S 1.5h · C5 S 1h | Batch 2 Actual: ~4.5 h · Follow-ons F1–F5: M (~7 h) — F1 cleanup lock S 1h · F2 TSV twin S 1h · F3 stored-formula scan M 2h · F4 Spanish grid + grow-first net S 1h · F5 Day Edit stray leaves M 2h | Follow-ons Actual: ~3.5 h · Batch 3: L (~12 h) — I1 M 2.5h · C4 S 1.5h · K2 S 1.5h · K6 S 1h · C3 S 1h · D6 S 1.5h · D7 S 1h · C6 S 1h · C10 S 1h · C11 S 0.5h | Batch 3 Actual: ~5 h · Batch 4: L (~11 h) — M4 S 1.5h · M1 S 1h · X3 S 0.5h · M2 S 1h · M3 S 1.5h · M7 S 1.5h · M8 S 1h · M9 S 1h · D1 S 1.5h · D2 S 0.5h | Batch 4 Actual: ~3.5 h · Batch 5: L (~12 h) — K3 M 2.5h · K1 S 1.5h · K4 M 2h · K5 S 1.5h · X1 S 1h · K7 S 1h · K9 S 0.5h · K12 S 1h · K11 S 0.5h · K13 S 0.5h · K10 S 0.25h | Batch 5 Actual: ~3 h · Batch 6: L (~12 h) — A1 M 3h · A2 M 3h · C2 S 1h · A3 S 1h · S7 S 1.5h · A4 S 1h · A5 S 0.5h · A6 S 0.5h · A8 S 0.5h | Batch 6 Actual: ~3.5 h · Batch 7: L (~13 h) — T5 M 2h · T4 S 1.5h · T7 S 1.5h · T8 S 1h · T9 S 0.5h · T10 S 0.5h · T11 S 0.5h · D3 M 2h · D5 S 1h · M10 S 1h · M5 S 1.5h | Batch 7 Actual: ~4 h
Subsystem cycles since last Seams audit: 1 — reset to 0 by the 2026-09-18 audit
(batch S), +1 for the 21post reflection. The cadence is every 4.
Updated: 2026-09-25

## In progress (facts to carry forward — NOT judgments)
- Batch 1, S2, Batch 2, the follow-ons, Batch 3 and Batch 4 are committed on
  `claude/optimistic-newton-gkdb3v` (Batch 3 and earlier merged to main via
  robinchoudhuryums/team-tools#271); NOT deployed. Blocks:
  `.cycle/blocks/22-{B1,S2,B2,FO,B3,B4,B5}-broad-implement.md`.
- The broad-scan's nine-batch plan is in the session report (not on disk —
  `/broad-scan` writes no block). Batches 2–9 remain; the finding IDs (S*, T*,
  M*, C*, K*, I*, D*, A*, U*, X*) are the scan's.

## Completed this cycle
- S1 | Tests.js, 10_core.js | the editor suite is owner-only (_assertSuiteCaller_ first in every non-pure public Tests.js function; runSingleTest takes test_ names only)
- X2 | run.js, harness.js | PUBLIC-GATE: every public function in every PUSHED file (the directory) carries a gate, a reasoned allow entry, or a gated delegate
- S3 | script_core.html, cn/script_callnotes.html | errorStateHtml_ beaconMsg override; search failures no longer ship the typed query to ClientErrors
- S4 | 61_forms.js | FormTokenCreated logs tokenRef=<8 chars>…, not the live token
- S9 | 61_forms.js | public submit validates the token shape + existence before the global lock; lock timeout is a polite retry
- T1 | 20_timeclock.js, tc/script_manager.html | Day Edit ships + renders the OPEN break (openBreak); a save no longer deletes it
- T3 | 00_config.js, 20_timeclock.js, tc/*.html | a Clock Out filed while a resume is pending ATTACHES as its finish (PAR EndTime); a past-day resume needs one; approval writes it
- T2 | 20_timeclock.js | repairRowsMoved_: both repair tools re-verify inside the lock and refuse on drift
- T6 | 20_timeclock.js | the doctor treats a finished break + one in progress as legal (breakOpenLeave_)
- C1 | 30_callnotes.js | the archive mover grows the grid's rows before its positional write (both tiers)
- C5 | 10_core.js | the purge keeps a spare row (never empties the grid)
  Block: `.cycle/blocks/22-B2-broad-implement.md`
- I1 | intake/script_intake.html | a cross-language amend holds only the amendment's answers (no snapshot restored over it, no draft in its gaps)
- C4 | cn/script_callnotes.html | the Save & Compose transaction follows the rep into External: its send completes it, its cancel rolls back
- K2 + K6 | kb/script_kb.html | the drawer home keeps the lookups being typed in; a fresh build forgets the last caller, stale responses dropped
- C3 | cn/script_callnotes.html | History notes render only under the range they were loaded for; the 90-day cap refused client-side
- D6 | train/script_empdocs.html | manager actions patch around the half-written document
- D7 | train/script_coaching.html | a coaching reply survives re-renders
- C6 | cn/script_callnotes.html | the Scratchpad saves text typed during an in-flight save, even after close
- C10 | cn/script_callnotes.html | a live refresh keeps a note confirmed after its request
- C11 | cn/script_callnotes.html | clearing the form ends running dictation first
  Block: `.cycle/blocks/22-B3-broad-implement.md`
- M4 | 51_spanish.js | Spanish auto-assign balances on claims held on PENDING requests (spanishOpenLoad_), not history
- M1 + X3 | 40_metrics.js, metrics/script_metrics.html, test/visual | a no-call rep has a null rate ("—", sorted lowest); the fixture's Today has no call data, new metrics-team-today-light-wide
- M2 + M8 | 40_metrics.js, tc/script_clock.html | Dashboard Yesterday = previous workday (labelled by date), an all-empty window uncached; MTD prior window lag-aligned; projection over dataThrough; key v6
- M3 | 40_metrics.js, 00_config.js | range ATT is answered-weighted in both DQE readers; CDR_CACHE_KEY v5
- M7 | 40_metrics.js | cdrAgentsOrThrow_ — a missing DQE tab is an error at onboarding readiness, the Dashboard and Team Metrics
- M9 | 40_metrics.js | trend days with no CDR row are null, never 0
- D1 + D2 | 82_coaching.js, train/script_coaching.html | coaching stamps parsed in CONFIG.TIMEZONE; an empty median is null → "nothing acknowledged yet"
  Block: `.cycle/blocks/22-B4-broad-implement.md`
- K3 + K1 | 70_kb.js | distance clauses parsed one by one (oopRadiusClause_): each distance governs the names after it, and any unconsumed word — or a restricting Open parenthetical — makes the value unknown
- K4 | 00_config.js, 70_kb.js | state names → codes, city spellings normalised (locStateCode_ / locCityNorm_); an unreadable State is "cannot tell"
- K5 | 70_kb.js, kb/script_kb.html | a partial geocode is refused (never measured or cached); a street address geocodes on Enter/blur, a ZIP by itself
- K7 | 70_kb.js, cn/script_callnotes.html | quotes carry the code; the send verifies against any same-named row
- K9 · K12 · K13 · K11 · K10 | 70_kb.js, kb, cn | blank rows skipped; header roles shown + docs; newest comments; word-bounded tone; no double escape
- X1 | test/visual/mock.js, run.js | the diagnostics fixture (pinned to the real resolvers) + the shrink-only "every client RPC has a fixture or is named" net
  Block: `.cycle/blocks/22-B5-broad-implement.md`
- A1 | 00_config.js, 10_core.js, cn/script_callnotes.html | per-job run ledger (AUTOMATION_RUN_<action>, stamped by writeAuditLog_); the audit window is reported and a monthly "not run" needs the window to reach the 1st
- A2 | 10_core.js, cn/script_callnotes.html | automationProblems_ {items:true}; getAutomationHealth ships the dot's list and the System tab renders every kind it has no branch for
- C2 | 30_callnotes.js | the weekly digest stamps a queue {error} and withholds the heartbeat
- A3 | 50_deptrequests.js | a configured Dept Requests store that will not open throws by name — no ADP fallback
- S7 | 20_timeclock.js, 10_core.js, cn/script_callnotes.html | offboarding removes the address from MANAGER_EMAILS / ADMIN_EMAILS (keeps a last entry, named), records OFFBOARDED_EMAILS; the drift detector keys on the list
- A4, A5, A6 | cn/script_callnotes.html, 10_core.js | named read failures: tag taxonomy, deploy readiness, ClientErrors
- A8 | 10_core.js | the automation-error map RMW serialised on the user lock (fail-open)
  Block: `.cycle/blocks/22-B6-broad-implement.md`
- T4, T5 | 20_timeclock.js, script_core.html | lunch graded nearest its schedule; half days graded from mid-shift, not lunch-graded, and a half day narrows the reminder window instead of silencing it (empTimeOffToday_, halfDayOff)
- T7, T8 | 20_timeclock.js, tc/script_timeoff.html, script_core.html | time-off ranges and their preview skip company holidays; the reminder ticker treats a holiday as a day off
- T9, T10 | tc/script_clock.html + five partials; 80/81/82 server files | Needs-you invalidated on click and on every completion; void / release / revoke bust the rep's cache (everyone-assignments bust all)
- T11 | 80_training.js | trainTodayIso_ — one manager-tz today for every training "overdue"
- D3, D5 | 90_qa.js, qa/script_qa.html | resumable QA sync (continuation token) with the Drive walk outside the lock; ranged per-chunk audio reads with the old read as fallback
- M10, M5 | 40_metrics.js, 51_spanish.js | transfer tab span-bound + result-cached; every voicemail in a thread is its own request
  Block: `.cycle/blocks/22-B7-broad-implement.md`
- F1 | Tests.js | every live-tab positional delete in the suite goes through _deleteRowsWhereLocked_ (ScriptLock from snapshot to last delete)
- F2 | script_core.html, metrics/script_metrics.html | tsvCell_/tsvRow_ — the client twin of sheetSafe_ on every "Copy table" line
- F3 | 10_core.js, cn/script_callnotes.html | adminScanStoredFormulas + Admin → System → Stored formulas (read-only, on demand)
- F4 | 10_core.js, 51_spanish.js | appendRowsSafe_ grows the grid first; the Spanish auto-assign batch rides it; derived grow-first net
- F5 | 20_timeclock.js, tc/script_manager.html | breakStrays_ → strayBreaks; Day Edit flags each stray and refuses the save until resolved
  Block: `.cycle/blocks/22-FO-broad-implement.md`
- S2 | 14 server files + DevTools.js, lint-server.mjs, run.js | every sheet write goes through sheetSafe_/Row_/Rows_ (183 sites, AST-wrapped); '@' writers use sheetText_/sheetTextRows_/appendRowsTextSafe_ after re-asserting '@'; SHEET-SAFE lint rule + derived pins. Block: `.cycle/blocks/22-S2-broad-implement.md`

## Pending / not yet done
- **Deploy Batch 2** with Batch 1 + S2, and its walk (block): Day Edit on a rep
  on lunch keeps the leave; a resume + a filed finish closes the day; the
  editor's new `managerSaveDay_openBreakRoundTrips` + rewritten resume test.
- **Deploy S2** with Batch 1 + S2's walk (its block): `=1+1` time-off note reads
  back as text; a `+1 555…` callback and a `- …` issue read back exactly; the
  scratchpad and a QA comment starting `- ` come back with no apostrophe.
- **Deploy the follow-ons** (F1–F5) with the rest, and their walk (block):
  Stored formulas scan + hand-fix each non-operator hit; Copy table pastes as
  text; Day Edit refuses a day with an unmatched break punch until resolved;
  editor `managerSaveDay_strayBreakRefused`.
- **Deploy Batch 1** + its walk (block's OPERATOR ACTIONS): editor
  runSmokeTests green; a non-owner's google.script.run.runSmokeTests() refused;
  a failed search's ClientErrors row carries no query; FormTokenCreated shows
  tokenRef=; a public form still submits.
- **Deploy T10** — `cd web-app && clasp push -f`, then New version.
- **The walk — NOTHING in T1–T10 has been walked**; its whole regression
  record is the harnesses. S64 (six T3 + four T4 + six T7 + two T7b + one T8 +
  one T9 step, and the T10-updated no-definition step), S18's denied-clipboard
  step, S112, S73.
- **Operator sheet check:** the `OopPricing` rows rewritten to `Local` on
  2026-09-22 should be back to `100 miles of Dallas warehouse, 100 miles of San
  Antonio warehouse` (the technician-built items). Manage → Admin → System →
  "Reference lookups" lists any `Local` still present under "Cannot read".
  Optional: rename `LocationAcceptance` col `Rule` → `Accepts` so the per-city
  item list is read.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true`
  plus standing up the DEV instance. Named the weakest axis (Operator-Only State
  Gaps) by cycle 21's reflection AND 21post's: without it the integration tier
  runs against PROD and writes TEST_ rows into live payroll and PHI stores.
  Steps 2, 5 and 6 of that walk are also unconfirmed.
- **The cycle-20 post-deploy walk items**, none blocking: S111 step 5 and
  S110 step 5, S7's two new Day Edit steps, S113, and the sheet doctor run.
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK — keep
  g123's federal fail-open, or match the Department Dashboard's no-fallback.

## Open follow-on items
- **Batch 1 follow-ons:** assertNotProdInstance_ still permits when
  INSTANCE_IS_PROD is unset (decision tied to the DEV instance); pre-deploy
  ClientErrors/AuditLog rows may hold typed queries / tokens (optional
  redaction). (The cleanup lock is DONE — F1.)
- **Batch 2 follow-ons:** the brief does not flag "resume waiting for a
  finish" (not implemented — the Manage card + rep chip say it). (Spanish grid
  growth and Day Edit strays are DONE — F4, F5.)
- **Docs synced 2026-09-23 (`/sync-docs`)** for Batch 1, S2, Batch 2 and the
  follow-ons: gotchas g143–g146 + g15/g26/g132 amended; INV-243..248; walk
  steps on S1/S7/S23/S42/S61/S96/S105 + new S114; the one-boundary decision +
  the resume amendment; operator-state (owner-only suite, stored-formula
  clean-up, PAR EndTime, repair refusal); modules, both logs, the test README.
- **Deploy Batch 3** with the rest, and its walk (22-B3 block): cross-language
  and same-language Intake amend; Save & Compose → External send/cancel; the
  drawer typed before the tree loads + reopen; History failure / over-cap;
  Employee Docs release beside a half-written doc; a coaching reply across a
  filter chip; the Scratchpad Save-now-type-close race.
- **Batch 3 follow-ons (22-B3 block):** a drawer search back to home still
  rebuilds the lookups; C4 changed when the "Note edits discarded" toast fires
  on a switch (confirm on the walk); Training's dirty guard could adopt D6's
  targeted patch. Docs SYNCED 2026-09-23: g141/g84/g85/g86/g94/g98
  amended, new g147, INV-249/250, walk steps on S34/S59/S64/S69/S99/S113 +
  new S115, the Save & Compose and Intake-amend decision amendments, module
  notes, both logs.
- **Deploy Batch 4** with the rest, and its walk (22-B4 block): Dashboard
  Monday/holiday Yesterday + MTD "vs" window and On-pace; Team Metrics Today
  all "—" and a no-call rep sorted last; a PTO day bridged in the trends;
  coaching overdue at the right hour + "nothing acknowledged yet"; Spanish
  auto-assign alternating between an old and a new member.
- **Deploy Batch 5** with the rest, and its walk (22-B5 block): the address
  confirm (Enter/blur, hint; a ZIP by itself); a partial address refused with
  Google's guess; an "except" Open cell; Ft./Fort city match; a duplicate-name
  quote sent; 100+ comments show the newest. After deploy read Admin → System
  → Reference lookups: the "Cannot read" list (K3 may have added cells with
  harmless extra words) and the delivery header roles.
- **Batch 7 follow-ons (22-B7 block):** task-CREATING flows do not bust the
  rep's pending-tasks cache; a repeat-voicemail card's expanded body is the
  thread's first message and `vmPending` is not rendered; punctuality's previous
  range ignores half days; client invalidation is per-window; M5 still depends on
  unverified 8x8 threading. OPERATOR QUESTION: is a half day "the afternoon
  starts at mid-shift"? T5 assumes so.
- **Batch 6 follow-ons (22-B6 block):** the urgent digest reads
  managerAggregateUrgent_'s {error} as empty (C2's shape); clientErrors.error
  is not on the dot; a daily job with no run on record stays silent; offboarding
  the trigger installer is undetected; QA_MEMBERS / SPANISH_INBOX_MEMBERS not
  edited by offboarding; one caption for the "cannot confirm" rows.
- **Batch 5 follow-ons (22-B5 block):** X1 names 31 reads owed a fixture; K3's
  connective list may need the operator's real words; K4 maps no city aliases
  beyond the abbreviations; the address hint is not photographed. STILL OPEN:
  what the city row's Accepts column decides (operator). Docs SYNCED
  2026-09-25: g41/g116/g126/g128 amended, new g150 (a client RPC with no mock
  fixture), INV-257..262, walk steps on S62/S64/S97/S112, the OOP-B and ELIG
  decisions amended, module notes, both logs.
- **Batch 4 follow-ons (22-B4 block):** the client twin coachTsMs_ still reads
  coaching stamps as UTC; M7's class survives in getMetricsAmbient,
  managerGetShiftStats' enrichment and getCdrDailyBreakdown_ (no error field
  at all); Dashboard MTD note coverage counts today's notes against calls
  through yesterday; the dashboard fixture's prior label is static; D2's
  sub-line is not photographed. Docs SYNCED 2026-09-23: g114/g123/g124/g128/g136
  amended, new g148 (lagged windows) + g149 (a "differences only" parser),
  INV-251..256, walk steps on S41/S42/S43/S99/S105/S110 + new S116, the
  Dashboard decision amended + a new weighted-ATT decision, module notes, both
  logs, the auto-assign operator-state line.
- **Follow-on follow-ons (22-FO block):** the stored-formula scan is on demand
  only (no findings-list entry, no resume past the budget); the mock lacks
  `adminScanStoredFormulas` (add with X1's Admin fixtures); the sheet doctor
  does not share `breakStrays_`.
- **S2 follow-ons:** (client TSV twin and the stored-formula scanner are DONE —
  F2, F3.) Platform assumption to confirm on the walk: a '@' cell stores a leading
  apostrophe literally (the reason for the plain-text path).
- **Invariant numbers — do not reuse any:** INV-225..227 RESERVED (cycle 20);
  INV-229..232 + an INV-213 amendment PROPOSED (cycle 21); INV-240..242
  PROPOSED (21post: fixtures the server can still produce · tone/explanation
  agree both ways · doc UI paths resolve against `TOOLS` labels). None is in
  the library yet. INV-243..262 were WRITTEN by cycle 22's /sync-docs passes.
  **Next free is INV-269; next gotcha g154; next scenario S118.**
- **An intermittent DOM pin**: `the resume request states the unpaid gap
  before it is filed` (runDom.js) failed once during T7 and has passed every
  run since. Flagged, not dismissed — a flake is not a root cause.
- **T4's document-level keydown handler** is scoped to the lookup inputs but
  was never verified against the Call Notes `.ce` fields (g111's trigger).
- `checkOopEligibility` ships a `rule` field no client reads (now with `cities`
  and `any` kinds in it).
- The four T6-grandfathered classes marked "intent unverified" (`dr-mgr`,
  `ny-card`, `coach-drawer`, `kb-gloss-search`); and an EMPTY CSS rule still
  satisfies the T6 ratchet (INV-235's stated limit).
- `intakeCopyImage_` opens a tab on failure without checking the return (g135).
- `Accepts` on a city row is DISPLAY-ONLY; which items a city rule covers is
  decided by which items carry `listed cities` in col I.

## Decisions made (so the next session doesn't re-litigate)
- **S2 deferred out of Batch 1** (operator, 2026-09-23) — then implemented in
  its most complete form on the operator's request: a BLANKET boundary over
  every write (not a per-field judgement of which text is user-supplied).
- **T3: the finish RIDES the resume request** (one request, attach on submit)
  rather than a second ClockOut request — two requests' approval order would
  matter. A past-day resume with no finish is refused, not guessed.
- **T2: verify-then-refuse inside the lock**, not re-plan — nothing is written
  on drift; the operator re-runs.
- **'@' cells write raw after re-asserting '@'** rather than through
  sheetSafe_: a plain-text cell would store the apostrophe literally.
- **The suite guard is "active === effective"**, not a MANAGER_EMAILS check:
  the editor and owner-installed triggers pass, every web visitor is refused;
  it reads Session directly so _TEST_OVERRIDE_EMAIL cannot satisfy it.
- **Test functions keep their names**; a first-statement guard (pinned) was
  chosen over renaming 337+ functions and their doc references.
- Price and area eligibility are ONE panel; the address UPGRADES the answer
  rather than gating it.
- The lookup band lives in the LANDING HOST, never the shared section renderer,
  which is what lets one section serve the ~340px drawer.
- A net that enumerates what it guards is paired with a DERIVED check running
  the other way; the guarded set itself is never derived from the code it
  guards (that derivation is self-defeating).
- No backfill of `Verify:` clauses below the ratchet floor.
- **Area Eligibility rules DELEGATE their parameter to `LocationAcceptance`**
  (`listed cities`, `any warehouse`): the column states the rule, the registry
  supplies it. Rules combine with `or` under a FAIL-CLOSED fold. A city limit
  does not lift out of pocket (INV-236/237/239; the ELIG decision's amendment).
- **The code shorthand is read ONLY in the operator-confirmed shape**; any
  wider reading needs the operator's word (INV-233, amended).
- **Bare `OON`/`OUT-OF-NETWORK` is the red refusal; the qualified values are
  amber** with their own explanations (operator, 2026-09-22).

## Where I left off
Batches 1–7, S2 and follow-ons F1–F5 of cycle 22 are committed and pushed;
none is deployed. Docs are synced through Batch 6; Batch 7 (working-day
semantics, scheduling, QA ingest) is implemented — block
`.cycle/blocks/22-B7-broad-implement.md`. Next: `/sync-docs` for Batch 7, then
deploy + the walks, or `/broad-implement Batch 8`.
