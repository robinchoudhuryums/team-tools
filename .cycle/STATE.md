# Cycle State

## Current
Cycle: 22 — opened 2026-09-23 by a `/broad-scan` (99 findings: 0 Critical /
3 High; nine-batch implementation plan). Cycle 21 + 21post are in HISTORY.md.
Phase: implement
Scope: broad — Batch 1 DONE (S1, X2, S3, S4, S9) + S2 DONE + Batch 2 DONE (T1, T3, T2, T6, C1, C5) + follow-ons F1–F5 DONE
Test Command: manual
Estimates: Batch 1: M (~11.5 h) — S1 M 3h · S2 M 4h · S3 S 1.5h · S4 S 0.5h · S9 S 1h · X2 S 1.5h | Actual: ~4 h for the five delivered (S2 not spent) · S2 (phased, blanket): L (~9 h) — helper+pin 1h · wrap every write site ~180 + pin repairs 6h · derived pin + bite-checks 2h | S2 Actual: ~5 h · Batch 2: M (~11.5 h) — T1 M 3h · T3 M 3h · T2 S 1.5h · T6 S 1.5h · C1 S 1.5h · C5 S 1h | Batch 2 Actual: ~4.5 h · Follow-ons F1–F5: M (~7 h) — F1 cleanup lock S 1h · F2 TSV twin S 1h · F3 stored-formula scan M 2h · F4 Spanish grid + grow-first net S 1h · F5 Day Edit stray leaves M 2h | Follow-ons Actual: ~3.5 h
Subsystem cycles since last Seams audit: 1 — reset to 0 by the 2026-09-18 audit
(batch S), +1 for the 21post reflection. The cadence is every 4.
Updated: 2026-09-23

## In progress (facts to carry forward — NOT judgments)
- Batch 1, S2, Batch 2 and the follow-ons are committed on
  `claude/optimistic-newton-gkdb3v`; NOT deployed. Blocks: `.cycle/blocks/22-{B1,S2,B2,FO}-broad-implement.md`.
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
  the library yet. INV-243..248 were WRITTEN by cycle 22's /sync-docs.
  **Next free is INV-249.**
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
Batch 1, S2, Batch 2 and follow-ons F1–F5 of cycle 22 are committed and pushed;
none is deployed; their docs are synced. Next: deploy + the four walks (S1,
S7, S23, S42, S61, S96, S105, S114 carry the cycle-22 steps); or `/broad-implement Batch 3` (client state that carries PHI or loses
work — I1 cross-language intake amend, C4, K2, K6, C3, D6, D7, C6, C10, C11).
