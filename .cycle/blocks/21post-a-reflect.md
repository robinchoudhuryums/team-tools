---CYCLE SUMMARY BLOCK---
Scope: between-cycles operator work — the Reference lookups and area eligibility (T1–T10; PRs #264–#268 + the T10 branch) | Cycle: 21post / 2026-09-23
Production fixes: 8 — severity: 0 Critical / 2 High / 3 Medium / 3 Low
New capabilities/features: 11
Defensive/structural: 11
New failure modes: 0 — severity: none reached production (one introduced and closed inside the span, netted — see below)
Net score: 8 − 0 = 8
Invariant candidates:
  INV-240 | A test FIXTURE is a payload the server can still PRODUCE. When a production rule changes so a stubbed payload is no longer reachable, the fixture is rewritten to a still-producible shape rather than left describing a server that no longer exists — a fixture the server cannot produce tests nothing, and stays green while it does. T9 found three pure pins and two DOM fixtures stubbing `K0821/23/16` as UNCERTAIN after the server began reading it. | Test Suite + Server | Verify: a pin that runs every DOM fixture's stubbed `codes` object through the real `hcpcsParse_(codes.raw)` and asserts equality (derived over the fixtures, so a new one is covered)
  INV-241 | A tone classifier and its explanation vocabulary agree in BOTH directions: the first term that explains a value is the one whose tier set its colour, AND no term from a STRICTER tier explains a value toned in a looser one. Values the operator declares synonymous tone and explain identically. T9: bare `OON` was amber by substring while bare `OUT-OF-NETWORK` was red — one fact, two colours — and a naive fix (match `oon` anywhere) would have put the red refusal under the amber `OON w/ PA`. | Client (Reference views) | Verify: the T2 pin's synonym sweep + its qualified-value assertions, extended to DERIVE the tier of each term from `insToneCls_` and assert tier(term) == tier(value) for every REAL value
  INV-242 | A UI path the docs name (`Tool → Tab`) resolves against the `TOOLS` registry's LABELS. A registry KEY is not a path: `callNotesAdmin` is a Manage tab, and "Call Notes → Admin" survived in five places because the key still carried the old home. | Docs + Client (shell) | Verify: a pin that scans every file the Doc map names for `A → B` where A is a tool label, and asserts B is one of that tool's tab labels
Most structurally significant change: T7 turned Area Eligibility from a flat enum into a small composable rule language — rules DELEGATE their parameter to the delivery table (the city list, and after T7b the whole warehouse network) and COMBINE with a fail-closed fold (an unreadable clause sinks the cell; an unmeasurable branch beside a NO is UNKNOWN) — so every future rule the operator needs rides one grammar whose failure direction is already chosen.
Should-have-been-deferred: T6, the unstyled-class ratchet — engineer-proposed mid operator-round, its first draft passed while checking almost nothing, and it delivered two Low cosmetic fixes plus a 29-name grandfather list (four "intent unverified"); real value, but a seams-cycle job, not a between-cycles one.
---END CYCLE SUMMARY BLOCK---

## Per-action grading (strict, re-derived — NOT the blocks' sums)

The blocks self-report 11 production fixes and 0 new failure modes (net 11).
This reflection grades **8 − 0 = 8**. Three corrections, all in the same
direction — a fix scored for a defect that could not have fired this month:

| Action | Q1 fired this month? | Q2 new failure mode? | Grade |
|---|---|---|---|
| T1 lookup input destroyed by a background re-render | YES — any manager typing within ~3 s of opening Reference, the normal mid-call use | NO | fix, Medium |
| T1 the status pill had two looks for one meaning | YES — user-visible on a path reps hit | NO | fix, Low |
| T2 per-value explanations | — | **YES, netted:** invented `.modal-head`/`.modal-x` with NO CSS rule, so the popover's title and close button stacked unstyled. Merged in #264, fixed by T5 the same day, and T1–T6 deployed TOGETHER on 2026-09-22 — it never ran anywhere. The 19-d precedent nets such a pair to 0 on both sides, and T5 already scored the fix as defensive, so nothing is double-counted | capability |
| T2 meta chips · legend popover | NO — legibility on a surface that worked | NO | 2 defensive |
| T3 payor × item join | — | NO | capability |
| T3 delegated failure handler · `bite.sh --dom` | NO | NO | 2 defensive |
| T4 keyboard walk · copy price · agreeing-verdict collapse | — | NO (the walk adds a document-level keydown handler — g111's trigger — scoped to the lookup inputs; not observed to interfere, NOT verified against the CN `.ce` fields) | 3 capabilities |
| T5 seven copy sites reporting success they had not achieved | YES — the HtmlService iframe denies the clipboard as its documented normal state; on the Call Notes save path the rep then pastes the PREVIOUS patient's note into the CRM | NO — the failover is now interruptive for a browser that always denies, which is the honest behaviour replacing a silent wrong paste, not a new way to fail | fix, **High** |
| T5 the derived clipboard ban · the two CSS rules | NO | NO | 2 defensive |
| T6 `.mono` (15 elements) · `.m-vol-note` (a `role="alert"` degraded-read warning rendered as body text) | YES — both on every load of their surfaces | NO | 2 fixes, Low |
| T6 the ratchet | NO | NO | defensive |
| T7 the diagnostic that named the WRONG file | YES — **fired**: the operator rewrote correct pricing cells on 2026-09-22 because the message blamed the eligibility column | NO | fix, **High** |
| T7 an empty delivery registry reporting no error | YES — **fired**, same incident | NO | fix, Medium |
| T7 the diagnostics counter that broke on a new kind | **NO — CORRECTED from a Low fix.** Pre-T7 the counter was right for every kind that existed; it could only break on a kind T7 itself added. Keeping one's own change consistent is not a production fix | NO | defensive |
| T7 city rule + unions | — | NO | capability |
| T7 derived kind-list pin | NO | NO | defensive |
| T7b network radius (`any warehouse`) · T8 diagnostics panel | — | NO | 2 capabilities |
| T7b warehouse names matched as bare SUBSTRINGS | **NO — CORRECTED from a Medium fix.** It fires only for a registry name that is a substring of the rule's prose ("Ware", "Mi"); the live registry's names are Dallas and San Antonio. Real class, zero occurrence | NO | defensive |
| T7b an unplaceable warehouse answering NO rather than UNKNOWN | **NO — CORRECTED from a Medium fix.** Until 2026-09-22 the registry was EMPTY, so no radius was ever measured; after it, both registered warehouses have real street addresses and nothing shows either failed to geocode | NO | defensive |
| T9 bare `OON` amber while bare `OUT-OF-NETWORK` red | YES — both spellings are live values; a "don't accept" plan rendered as a caution | NO | fix, Medium |
| T9 confirmed shorthand · five definitions | — | NO | 2 capabilities |
| T10 `Hawaii only` · `MDX Hawaii` | — | NO | capability |

**Where the blocks were right, and why that matters.** Every batch reported
0 new failure modes, and after a deliberate search that holds for production.
Every correction here runs one way — a real CLASS of defect scored as if it had
an occurrence — which is the same error cycle 20's reflection corrected in F-31
and F-07. The tell is consistent: a block that reasons "this would have fired
when X" without checking whether X has ever been true.

## Honest impact summary

- **For a user, right now:** a rep can type into the lookups without losing it; every coloured acceptance pill explains itself; a payor's code columns say which item they mean; every copy button in the app says so when the clipboard is blocked, closing a real risk of pasting one patient's note into another's record; scooters and technician-built items get real eligibility answers; a mis-shaped delivery table names itself instead of blaming the pricing sheet; `OON` reads as the refusal it is. **All of this is deployed except T10**, and **none of it has been walked** — S64, S18, S112 and S73 are owed. The regression record for this series is the harnesses only.
- **For the next developer:** a composable eligibility grammar with its failure direction chosen; ONE honest copy helper that owns the success branch; a class-name ratchet; the derived kind-list; `bite.sh --dom`; g140, g141, g142 and g116's seventh direction.
- **Under scale / concurrency:** nothing material. T3 adds a pricing-tab read to a payor search that carries code columns; T8 adds one RPC to the Admin System tab.
- **Effort on dead code / future-proofing:** some. The eligibility payload still ships a `rule` field no client reads (now with two more kinds in it); T6's ratchet and T7's counter rework guard futures; the shorthand rule is deliberately narrow and will refuse the next unconfirmed shape.

**axis_b_lowest: Operator-Only State Gaps — for the second cycle running, and this time with a receipt.** The whole T7 incident was operator-maintained sheet state whose required shape (headers in row 1, a `Name` column, a `Type` column) the app neither documented nor validated, and the cost was real data rewritten by hand. The DEV instance owed since cycle 19 step 8 still does not exist. Test Coverage Quality improved again: over seventy bite-checks across T3–T10, and every NO BITE was investigated and acted on — two of them exposed a false comment and a pin that proved the wrong thing.
