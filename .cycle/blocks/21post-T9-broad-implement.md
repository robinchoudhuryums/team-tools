---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T9 — the operator's answers to the two standing questions: the code shorthand as a CONFIRMED rule, the out-of-network vocabulary (one fact that rendered in two colours), and Plan Specific
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, docs/operator-state.md, docs/modules.md, .cycle/STATE.md
Estimate: T9 S (~2 h)
Actual: ~1.5 h

CHANGES:
T9 (the shorthand) | `70_kb.js` | `hcpcsParse_` refused `K0821/23/16` because `23` and `16` were codes by no rule we could defend (INV-233). The operator SUPPLIED the rule on 2026-09-22 — each digit fragment replaces that many trailing digits of the code before it — so it now reads as K0821, K0823, K0816. Applied in exactly the confirmed SHAPE: one bare whole code first, then only 1–3-digit fragments. Everything else still refuses whole: a fragment before any code, a fragment beside two whole codes (which one does it abbreviate?), a modifier-suffixed anchor, a four-digit fragment, and a range (`K0800-K0803`). One tokenizer, so the payor headers and the pricing codes change together and the join cannot drift.
T9 (one fact, two colours) | `script_kb.html` | Bare `OON` fell into the AMBER branch by substring while bare `OUT-OF-NETWORK` was RED. The operator confirmed they are the same and mean "don't accept", so every bare spelling (incl. spaced `out of network`) is now red and explained as out of network.
T9 (the qualified values) | `script_kb.html` | `OON w/ PA` and `Out-of-Network Benefits` were DELIBERATELY amber in the original tone pin ("OON *Benefits* is NOT the hard no"), and the operator's mid-turn clarification confirmed why: the plan is out of network but still leaves a route to an order (prior authorization; out-of-network benefits at higher co-insurance). Each now carries its own definition. The red refusal's matcher is the tone rule's own BARE-ONLY regex, so it can never be the explanation under an amber pill; `PA` is matched as a WORD so "Pacific" is not prior authorization.
T9 (Plan Specific) | `script_kb.html` | Defined in the operator's words: cannot be confirmed from the sheet, only by contacting the insurance or attempting submission. Stays amber.
T9 (fixtures) | `run.js`, `runDom.js` | Three pure pins and two DOM fixtures used `K0821/23/16` as their canonical UNCERTAIN example — a payload the server can no longer produce. Each still drives the refusal path, now with a range, which the server still refuses. Category A: the rule changed deliberately, and no assertion was weakened.
INV-233 | `.cycle/config.md` | AMENDED, not contradicted: the refusal's premise changed (a rule was supplied), not its reasoning (refuse what nobody has confirmed). S64 gains the T9 walk step and its T3 shorthand step now names a still-refused shape.

TEST RESULTS: passed. Pure **931**, DOM **145** (no count change — every change landed in existing pins), lint clean, manifest revised (`--why`), counts block agrees.
**EIGHT bite-checks, all BITE:** the shorthand never expanded · a fragment beside two whole codes expanded anyway · a modifier-suffixed anchor accepted · fragments replacing LEADING digits · bare OON back to amber · the OON refusal matching by substring · PA matched as a bare substring · Plan Specific losing its definition.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** — UPDATED. Needs the operator's walk on the deployed instance.
- **S112 / S73** — NOT APPLICABLE: no price path, track or box changed.

REGRESSION RISKS:
- **More joins.** Every `OopPricing` row and payor header written in the confirmed shorthand now joins on all its codes. That is the point; a code two rows now carry is named by neither and says how many, which is the existing honest answer to that ambiguity.
- **Bare OON turns red on every payor that carries it.** Deliberate, and the operator's answer. A rep who had been treating an amber OON as "check first" now sees "don't accept".
- **Any other text beside OON** (not PA, not benefits) reads as unexplained amber — honest, and visible, rather than guessed.

INVARIANTS AT RISK: None violated. INV-233 AMENDED with the reasoning. g41's fail direction holds: every unconfirmed shape still refuses. The T2 guarantee (a value the panel colours is a value it can explain) now covers five more values and holds the tone/term agreement in both directions.

NET SCORE: 1 − 0 = 1
(Production fixes: **1, Medium** — bare OON and bare OUT-OF-NETWORK rendered one fact in two colours, amber vs red, on a compliance-adjacent field; it fired on every payor row using the OON spelling. New capabilities: 2 — the confirmed shorthand joins, and five acceptance values now explain themselves. Defensive/structural: 0. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- Still open: `MDX Hawaii` is toned but undefined — one sentence of operator text.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T7, T7b, T8 and T9 ship together.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- `Hawaii only` is toned blue (info) in the tone pin and, like `MDX Hawaii`, has no definition; it is not on the known-gap list because it was not in the operator's live-values list. Worth one question alongside MDX Hawaii.
- The intermittent DOM pin (`the resume request states the unpaid gap before it is filed`) remains flagged, untouched.

DOCUMENTATION UPDATES NEEDED:
- None outstanding. `docs/operator-state.md` (the shorthand rule and what still refuses; the three meanings of out-of-network; MDX Hawaii as the one remaining gap), `docs/modules.md`, INV-233 and S64 are all part of this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
