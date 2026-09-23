# Cycle State

## Current
Cycle: 21 — CLOSED 2026-09-21 (batch R deployed and operator-confirmed; batch S
needed no deploy; reflected net +1; the whole block is in `.cycle/HISTORY.md`).
**No cycle is open.** The next `/audit` or `/broad-scan` opens cycle 22.
Phase: idle (between-cycles operator work T1–T9 — ALL DEPLOYED; awaiting the S64 walk and a /reflect)
Scope: —
Test Command: manual
Estimates: T1 (landing re-render + pill + meta chips): S (~2 h) · T2 (legend
popover + per-value terms): M (~3 h) — both written BEFORE the first edit;
actual ~3 h combined. **T3 (the payor × item HCPCS join): L (~8 h)** — written
BEFORE the first edit, as it stood in the agreed four-batch plan ("L, ~1 day");
actual ~4 h. **T4 (keyboard nav · copy price · collapse agreeing verdicts):
M (~3 h)** — written BEFORE the first edit, as it stood in the plan;
actual ~3 h. **T5 (one honest copy helper, SEVEN call sites): M (~4 h)** —
written BEFORE the first edit; actual ~3.5 h. **T6 (the unstyled-class ratchet
+ the real defects it found): M (~3 h)** — written BEFORE the first edit;
actual ~3 h. **T7 (the exact-city eligibility rule, rules that COMBINE, and
the silences that cost the operator real sheet data): L (~7 h)** — written
BEFORE the first edit; actual ~5 h. **T7b (a radius over ANY warehouse, the
rule being about the NETWORK rather than a place): S (~2 h)** — written
BEFORE the first edit; actual ~3 h with T8. **T8 (an Admin home for the OOP
pricing diagnostics, which had none): S (~2 h)** — written BEFORE the
first edit; actual shared with T7b above. **T9 (the operator's answers: the code
shorthand as a CONFIRMED rule, OON = OUT-OF-NETWORK = red, Plan Specific
defined): S (~2 h)** — written BEFORE the first edit; actual ~1.5 h.
Between-cycles operator work, the 19pre pattern.
Subsystem cycles since last Seams audit: 0 — reset by the 2026-09-18 audit,
whose findings shipped as batch S. The cadence is every 4; next due at cycle 25.
Updated: 2026-09-23

## In progress (facts to carry forward — NOT judgments)
- Nothing is in flight against an OPEN cycle. **PR #264 MERGED 2026-09-21**
  (`2487fd1`) — the three pre-existing Reference-lookup defects the cycle-21
  deploy exposed, the cycle-21 close-out, and T1 + T2. The branch was restarted
  from `main` afterwards, per the merged-PR rule. **PR #265 and #266 have since
  merged too, and T1–T6 are deployed and operator-confirmed (2026-09-22).**
- A four-batch plan (T1–T4) for the Reference lookups was agreed with the
  operator on 2026-09-21; T5 followed from a T4 follow-on, T6 from a T5 one,
  and T7–T9 from the operator's 2026-09-22 deploy round. **All are DONE,
  MERGED (#264–#268) and DEPLOYED** — T1–T6 on 2026-09-22, T7–T9 on
  2026-09-23. Nothing is in flight.

## Completed this cycle
- (Cycle 21's record is in `.cycle/HISTORY.md` and the three blocks
  `21-reference-lookups-broad-implement.md`, `21-seams-broad-implement.md`
  and `21-a-reflect.md`. Nothing has been completed against a NEW cycle.)

## Pending / not yet done
- **The deploy** — T1–T6 are DEPLOYED and operator-confirmed (2026-09-22;
  `runAllTests` read 336 passed / 1 skipped, which matches the derived 337).
  **T7, T7b, T8 and T9 DEPLOYED 2026-09-23** (operator-confirmed). Still to
  WALK: S64 (six T3 + four T4 + six T7 + two T7b + one T8 + one T9 step),
  S18's clipboard step, S112, S73.
- **`/reflect` is OWED for the T1–T9 series.** Nine implement blocks exist
  (`21post-*-broad-implement.md`) with Estimate/Actual lines; no reflect block,
  no metrics row and no estimates rows have been written for them. Reflect
  BEFORE archiving this block to HISTORY.md — `/reflect` reads it.
- ~~T1~~ and ~~T2~~ are DONE — block `21post-T1-T2-broad-implement.md`, net
  2 − 0. The tone/explanation guarantee is held by a PIN rather
  than by one shared matcher: `insToneCls_` was left alone deliberately, since
  rewriting a classifier that colours a compliance-adjacent field to share code
  with a tooltip trades a real guarantee for a tidy one.
- ~~T3~~ is DONE — block `21post-T3-broad-implement.md`, net 0 − 0 (1
  capability, 2 defensive; nothing here was broken). Deployed 2026-09-22 with
  T1–T6. **INV-233 written** (AMENDED by T9)
  (ambiguity refused as a SHAPE: `hcpcsParse_` fills `tokens` only on the
  certain path, so no consumer can assert from an uncertain parse). Eleven
  bite-checks, all BITE, and `scripts/bite.sh --dom` now drives the DOM harness
  — the follow-on that caused g65's fifth firing is closed.
- **Operator question raised by T2 — ANSWERED 2026-09-22, shipped as T9.**
  `OON` = `OUT-OF-NETWORK` = don't accept (red); `OON w/ PA` and
  `Out-of-Network Benefits` stay amber with their own definitions; `Plan
  Specific` defined. **`MDX Hawaii` is the one value still undefined** (and
  `Hawaii only`, toned blue, is in the same position).
- **T3 was estimated L (~8 h) and took ~4 h.** For the record, the original
  scope note: the payor × item JOIN. Payor `details` are keyed by the
  sheet's column headers, which are HCPCS codes; OOP rows carry `code`. NOTE
  the correction this rests on: the batch-R plan said panel 1 had no join key
  to items, which was wrong. The key is the code. **Safety rule:** one
  tokenizer, exact-token matching, and anything it cannot parse confidently
  (`K0821/23/16` shorthand) is shown but NEVER used to assert coverage — a
  wrong join tells a rep a payor covers something it does not, on a surface
  where a quote is a commitment (g41, and the ELIG no-seed precedent).
- ~~T4~~ is DONE — block `21post-T4-broad-implement.md`, net 0 − 0 (3
  capabilities). **INV-209 is AMENDED**, in the library AND in
  `docs/design-decisions.md`, with the reasoning: an AGREEING verdict pair
  renders as ONE row labelled "Through insurance or out of pocket"; a
  disagreement still renders as two. Nothing is behind a toggle either way,
  which is what the decision actually forbade. Thirteen bite-checks, all BITE,
  after THREE NO BITEs that were each a real gap (agreement ignoring `why`;
  the scalar price fallback never driven; a dead `idx == null` guard, removed).
- ~~T5~~ is DONE — block `21post-T5-broad-implement.md`, net **1 − 0** (one
  HIGH production fix: SEVEN copy sites reported success they had not
  achieved, including the Call Notes save path whose clipboard the rep pastes
  into the patient record seconds later). `copyText_` / `manualCopyModal_` /
  `copyWithFeedback_` live in `script_core.html`; `copyWithFeedback_` OWNS the
  success branch, so a call site cannot claim a copy it did not make. The pin
  DERIVES the ban rather than listing callers — the survey said five and a grep
  found seven. Eight bite-checks, all BITE.
- ~~T6~~ is DONE — block `21post-T6-broad-implement.md`, net **2 − 0** (both
  Low: `.mono`, fifteen elements asking for monospace with no rule; and
  `.m-vol-note`, a `role="alert"` degraded-read warning rendering as plain
  body text). **The pin passed its first run while checking almost nothing** —
  its hook extractor harvested every `class="a b"` because this app builds
  markup in JS, and its non-vacuity check passed BECAUSE of that. Found by a
  bite-check that should have gone red. Six bites, all BITE now.
- ~~T7~~ is DONE — block `21post-T7-broad-implement.md`, net **3 − 0** (1
  capability + 3 production fixes, one of them HIGH). **The operator could not
  express their own rule:** scooters are eligible in a list of named service
  cities, and `Area Eligibility` had no way to say so. `cities` DELEGATES to
  the `LocationAcceptance` city rows (the column states the RULE, the registry
  supplies its PARAMETER — the shape radius already had, which is why it does
  not reopen the 2026-09-16 decision), and rules now COMBINE because either
  the distance or the city qualifies. **INV-236/237/238 + g142 written.**
  Thirteen bite-checks, all BITE.
  **The receipt this batch exists for:** their `LocationAcceptance` tab had
  headers in row 2 and no Name column, the registry came back empty with NO
  error, every radius rule fell to unknown, and the message blamed the pricing
  sheet — so they rewrote correct cells in it to `Local` and lost the distances
  and warehouse names. A diagnostic that names the wrong file is worse than a
  vague one, because it is actionable and the action is destructive.
- ~~T7b~~ and ~~T8~~ are DONE — block `21post-T7b-T8-broad-implement.md`, net
  **2 − 0** (2 production fixes + 2 capabilities). **T7b:** the operator's
  COMMON case was inexpressible — most items reach 100 miles from ANY
  warehouse, and the Dallas/San Antonio ones are the technician-built
  exceptions. An any-warehouse rule names nothing and resolves against the
  registry at CHECK time. Two real defects fell out: the name match was a bare
  SUBSTRING (a site called `Ware` matched inside "warehouse"), which broadened
  narrow rules; and an over-limit distance with an UNPLACEABLE warehouse
  answered NO with a footnote rather than UNKNOWN. **T8:** the OOP diagnostics
  finally have a home (Manage → Admin → System), closing g142's third failure.
  **INV-239 written.** Eleven bite-checks; **TWO NO BITEs, both real and both
  fixed** — a comment claiming a guarantee the code did not make, and a pin
  that injected its own error markup instead of driving the loader (g138
  twice). Chasing the first found the substring defect.
- ~~T9~~ is DONE — block `21post-T9-broad-implement.md`, net **1 − 0** (1
  Medium fix + 2 capabilities). The operator's answers: the code shorthand is
  a CONFIRMED rule (`K0821/23/16` = K0821/K0823/K0816), applied in exactly the
  confirmed shape with every other shorthand still refused (INV-233
  AMENDED — the premise changed, not the reasoning). Bare `OON` had been
  AMBER by substring while bare `OUT-OF-NETWORK` was RED — one fact, two
  colours; both are now the red refusal, and the qualified values stay amber
  with their own explanations. Eight bite-checks, all BITE.
- **`.modal-head` and `.modal-x` had NO CSS rule** (invented by T2, merged
  that way). Fixed here because the failover modal needed them; it also fixes
  the term popover. Now g140.
- **The `/sync-docs` pass owed since T1 is DONE** and shipped with T5: g76
  rewritten, g140 + g141 added and indexed, the Reference narrative brought up
  to T1–T5, a new `InsurancePayors` operator-state entry, and the harness-log
  round notes.
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK — keep
  g123's federal fail-open, or match the Department Dashboard's no-fallback.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true`
  plus standing up the DEV instance. Cycle 21's reflection named
  Operator-Only State Gaps the weakest axis on exactly this evidence: without
  the dev instance the integration tier runs against PROD and writes TEST_ rows
  into live payroll and PHI stores. Steps 2, 5 and 6 of that walk are also
  unconfirmed.
- **The cycle-20 post-deploy walk items**, none blocking: S111 step 5 and
  S110 step 5, S7's two new Day Edit steps, S113, and the sheet doctor run.
- **INV-225, INV-226 and INV-227 are RESERVED, not written** (cycle 20 holds
  them for three rules it could not verify). **INV-229..232 and an amendment to
  INV-213 are PROPOSED** by cycle 21's reflection and not yet written. Do not
  reuse any of these numbers.

## Open follow-on items
- `.cycle/config.md` — INV-229..232 + the INV-213 amendment, to be written by
  the round that adopts them. **INV-234 (the honest-helper rule) and INV-235
  (the class ratchet) are now WRITTEN.** Next free is **INV-236**.
- ~~The "every class has a CSS rule" pin~~ is DONE — T6, INV-235. **I was
  wrong that a sweep would over-report badly**: 118 raw, 33 after two
  derivations, hand-auditable. All 33 audited; the four grandfathered with
  "intent unverified" (`dr-mgr`, `ny-card`, `coach-drawer`, `kb-gloss-search`)
  are the only soft spot — each renders as its base component and the code
  cannot say whether that was intended.
- **An EMPTY rule satisfies the T6 ratchet** (deleting a rule's declarations
  does not bite; renaming its selector does). Closing that means parsing
  declarations — a different, larger tool. Recorded in INV-235.
- `intakeCopyImage_` opens a tab on failure without checking the return, so a
  blocked popup is invisible (g135). Out of T5's scope — it is the image path.

## Decisions made (so the next session doesn't re-litigate)
- Price and area eligibility are ONE panel; the address UPGRADES the answer
  rather than gating it.
- The lookup band lives in the LANDING HOST, never the shared section renderer,
  which is what lets one section serve the ~340px drawer.
- A net that enumerates what it guards is paired with a DERIVED check running
  the other way; the guarded set itself is never derived from the code it
  guards (that derivation is self-defeating).
- No backfill of `Verify:` clauses below the ratchet floor — writing prose
  against invariants nobody verifies puts unverified claims in the one file
  whose value is that its claims are true.

- **OPERATOR ACTIONS OWED BEFORE T7 DOES ANYTHING** (none block the deploy):
the `Type` column is DONE (operator, 2026-09-22). STILL OWED: restore
  `OopPricing` col I on the affected items — and note T7b changed what to
  write. The COMMON case is now `100 miles of any warehouse` (scooters:
  `100 miles of any warehouse, or listed cities`); the NAMED form
  (`100 miles of Dallas warehouse, 100 miles of San Antonio warehouse`) is
  reserved for the technician-built exceptions. Optionally rename col D
  `Rule` → `Accepts` so the per-city item list is read.
- **An intermittent DOM pin**, untouched by T7: `the resume request states the
  unpaid gap before it is filed` (runDom.js:1702) failed once, then passed 3/3.
  Flagged, not dismissed.

## Where I left off
**T1–T9 are ALL DEPLOYED (T1–T6 on 2026-09-22, T7–T9 on 2026-09-23) and every
PR is merged (#264–#268).** Every harness is green, the counts block agrees,
and a `/sync-docs` pass ran after the last deploy.

**First, in a fresh session: `/reflect` for the T1–T9 series.** Nine implement
blocks (`.cycle/blocks/21post-*-broad-implement.md`) carry Estimate/Actual
lines and have never been tallied — no reflect block, no `metrics.csv` row, no
`estimates.csv` rows. Then archive this whole block to `.cycle/HISTORY.md`
(newest first) and reset STATE.md from the template, carrying the standing
debts below across.

**The operator's walk:** S64 (six T3 + four T4 + six T7 + two T7b + one T8 +
one T9 step), S18's denied-clipboard step, S112 and S73.

**Standing debts that must survive the reset:** cycle 19 step 8 (the DEV
instance with `INSTANCE_IS_PROD=true` — the weakest axis in cycle 21's
reflection); F-09's holiday-fallback decision; INV-225–227 RESERVED and
INV-229–232 + an INV-213 amendment PROPOSED (next free is INV-240);
`MDX Hawaii` and `Hawaii only` undefined; the intermittent DOM pin (`the
resume request states the unpaid gap before it is filed`); `intakeCopyImage_`
not checking a blocked popup (g135); `Accepts` display-only on city rows.
