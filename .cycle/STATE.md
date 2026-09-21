# Cycle State

## Current
Cycle: 21 — CLOSED 2026-09-21 (batch R deployed and operator-confirmed; batch S
needed no deploy; reflected net +1; the whole block is in `.cycle/HISTORY.md`).
**No cycle is open.** The next `/audit` or `/broad-scan` opens cycle 22.
Phase: implement (between-cycles operator work — T3)
Scope: —
Test Command: manual
Estimates: T1 (landing re-render + pill + meta chips): S (~2 h) · T2 (legend
popover + per-value terms): M (~3 h) — both written BEFORE the first edit;
actual ~3 h combined. **T3 (the payor × item HCPCS join): L (~8 h)** — written
BEFORE the first edit, as it stood in the agreed four-batch plan ("L, ~1 day");
actual ~4 h. **T4 (keyboard nav · copy price · collapse agreeing verdicts):
M (~3 h)** — written BEFORE the first edit, as it stood in the plan.
Between-cycles operator work, the 19pre pattern.
Subsystem cycles since last Seams audit: 0 — reset by the 2026-09-18 audit,
whose findings shipped as batch S. The cadence is every 4; next due at cycle 25.
Updated: 2026-09-21

## In progress (facts to carry forward — NOT judgments)
- Nothing is in flight against an OPEN cycle. **PR #264 MERGED 2026-09-21**
  (`2487fd1`) — the three pre-existing Reference-lookup defects the cycle-21
  deploy exposed, the cycle-21 close-out, and T1 + T2. The branch was restarted
  from `main` afterwards, per the merged-PR rule. **Still needs one
  `clasp push -f` + New-version deploy**, then S64 and S112.
- A FOUR-BATCH plan (T1–T4) for the Reference lookups was agreed with the
  operator on 2026-09-21. T1, T2 and T3 are all DONE and pushed; T4 is
  unstarted. Summarised under "Pending".

## Completed this cycle
- (Cycle 21's record is in `.cycle/HISTORY.md` and the three blocks
  `21-reference-lookups-broad-implement.md`, `21-seams-broad-implement.md`
  and `21-a-reflect.md`. Nothing has been completed against a NEW cycle.)

## Pending / not yet done
- **The deploy** — ONE `clasp push -f` + New-version covers T1, T2 and T3;
  then walk S64 (six new T3 steps), S112 and S73.
- ~~T1~~ and ~~T2~~ are DONE — block `21post-T1-T2-broad-implement.md`, net
  2 − 0. The tone/explanation guarantee is held by a PIN rather
  than by one shared matcher: `insToneCls_` was left alone deliberately, since
  rewriting a classifier that colours a compliance-adjacent field to share code
  with a tooltip trades a real guarantee for a tidy one.
- ~~T3~~ is DONE — block `21post-T3-broad-implement.md`, net 0 − 0 (1
  capability, 2 defensive; nothing here was broken). **Not deployed** — T1, T2
  and T3 all ship in ONE `clasp push -f` + New-version. **INV-233 written**
  (ambiguity refused as a SHAPE: `hcpcsParse_` fills `tokens` only on the
  certain path, so no consumer can assert from an uncertain parse). Eleven
  bite-checks, all BITE, and `scripts/bite.sh --dom` now drives the DOM harness
  — the follow-on that caused g65's fifth firing is closed.
- **Operator question raised by T2:** FOUR toned acceptance values have no
  definition on file — `OON`, `Plan Specific`, `OUT-OF-NETWORK`, `MDX Hawaii`.
  A rep sees a coloured pill and cannot learn why. The pin names them; the fix
  is operator text.
- **T3 was estimated L (~8 h) and took ~4 h.** For the record, the original
  scope note: the payor × item JOIN. Payor `details` are keyed by the
  sheet's column headers, which are HCPCS codes; OOP rows carry `code`. NOTE
  the correction this rests on: the batch-R plan said panel 1 had no join key
  to items, which was wrong. The key is the code. **Safety rule:** one
  tokenizer, exact-token matching, and anything it cannot parse confidently
  (`K0821/23/16` shorthand) is shown but NEVER used to assert coverage — a
  wrong join tells a rep a payor covers something it does not, on a surface
  where a quote is a commitment (g41, and the ELIG no-seed precedent).
- **T4 (M, ~3h)** — keyboard navigation in the results, copy-price with the
  g76 clipboard failover, and collapsing the two verdicts when they AGREE so
  the disagreements stand out. That last one **changes a documented decision**
  (ELIG / INV-209) and needs the decision entry rewritten, not just the code.
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
  the round that adopts them.
- `docs/gotchas.md` — the drawer/`.kbd-sec` defect and the mount-check lesson
  are recorded in PR #264's body and the HISTORY block, but no gotcha entry
  exists yet. It has bitten production, so it has earned one.

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

## Where I left off
T1, T2 and T3 are done. PR #264 merged 2026-09-21 (`2487fd1`); the branch was
restarted from `main` and carries T3. Every harness is green, the counts block
agrees, and the Reference shots were READ — the cross-reference's first layout
passed every measurement and was unreadable.

**Next: ONE deploy** (`clasp push -f` + New-version) covering T1 + T2 + T3,
then walk S64 — it now carries six T3 steps, including renaming the
`OopPricing` tab to see the degraded-join banner — and S112.

**`/sync-docs` is owed and has grown.** Four files: `docs/modules.md` (the
split landing, the term popover, AND the join), `docs/gotchas.md` + the
CLAUDE.md index (the drawer `.kbd-sec` defect and T1's re-render class, both
still unwritten), `docs/operator-state.md` (`InsurancePayors` has no entry of
its own, and T3 makes its column HEADERS load-bearing — they are the join key)
and `docs/test-harness-log.md`.

**Two questions for the operator**, both now blocking nothing: the four
undefined acceptance values, and how many `OopPricing` codes use the
`K0821/23/16` shorthand — every one of those is a code the join declines, and
splitting them into whole codes needs no code change.

T4 is unstarted; its verdict-collapse changes a documented decision
(ELIG / INV-209) and needs that entry rewritten, not just the code.
