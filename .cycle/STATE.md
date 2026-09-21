# Cycle State

## Current
Cycle: 21 — CLOSED 2026-09-21 (batch R deployed and operator-confirmed; batch S
needed no deploy; reflected net +1; the whole block is in `.cycle/HISTORY.md`).
**No cycle is open.** The next `/audit` or `/broad-scan` opens cycle 22.
Phase: implement (between-cycles operator work — T1 + T2)
Scope: —
Test Command: manual
Estimates: T1 (landing re-render + pill + meta chips): S (~2 h) · T2 (legend
popover + per-value terms): M (~3 h) — both written BEFORE the first edit.
Actual ~3 h combined. Between-cycles operator work, the 19pre pattern.
Subsystem cycles since last Seams audit: 0 — reset by the 2026-09-18 audit,
whose findings shipped as batch S. The cadence is every 4; next due at cycle 25.
Updated: 2026-09-21

## In progress (facts to carry forward — NOT judgments)
- Nothing is in flight against an OPEN cycle. **PR #264 is open and green** —
  the three pre-existing Reference-lookup defects the cycle-21 deploy exposed,
  plus the pins, fixtures and scenarios that would have caught them. It needs
  merging and one `clasp push -f` + New-version deploy.
- A FOUR-BATCH plan (T1–T4) for the Reference lookups was agreed with the
  operator on 2026-09-21 and is not yet started. It is in the session transcript
  and summarised under "Pending".

## Completed this cycle
- (Cycle 21's record is in `.cycle/HISTORY.md` and the three blocks
  `21-reference-lookups-broad-implement.md`, `21-seams-broad-implement.md`
  and `21-a-reflect.md`. Nothing has been completed against a NEW cycle.)

## Pending / not yet done
- **PR #264** — merge, deploy, then walk S112 and S73.
- ~~T1~~ and ~~T2~~ are DONE — block `21post-T1-T2-broad-implement.md`, net
  2 − 0. Not deployed. The tone/explanation guarantee is held by a PIN rather
  than by one shared matcher: `insToneCls_` was left alone deliberately, since
  rewriting a classifier that colours a compliance-adjacent field to share code
  with a tooltip trades a real guarantee for a tidy one.
- **Operator question raised by T2:** FOUR toned acceptance values have no
  definition on file — `OON`, `Plan Specific`, `OUT-OF-NETWORK`, `MDX Hawaii`.
  A rep sees a coloured pill and cannot learn why. The pin names them; the fix
  is operator text.
- **T3 (L, ~1 day)** — the payor × item JOIN. Payor `details` are keyed by the
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
T1 and T2 are done and pushed. The tree is clean; every harness is green and the
Reference shots were read, not just measured.

**PR #264 is still open and now carries the cycle-21 close-out, T1 and T2 as
well** — its title and body describe only the original drawer/card fixes and
need updating before it merges, or it should be split. Decide that first.

Then: deploy, walk S64 (updated with the T1/T2 steps) and S112, and put the
four undefined acceptance values to the operator. T3 (the payor × item join)
and T4 (keyboard, copy, verdict collapse) are unstarted; T3 carries the safety
rule about never asserting coverage from an unparseable code.
