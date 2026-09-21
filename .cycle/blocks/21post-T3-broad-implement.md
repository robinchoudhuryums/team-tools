---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T3 — the payor × item join on the HCPCS code, with the shorthand refusal as a shape · T3b — bite.sh drives the DOM harness (the follow-on that caused g65's fifth firing)
Files modified: web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/mock.js, scripts/bite.sh, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: T3 L (~8 h)
Actual: ~4 h

CHANGES:
T3 (tokenizer) | `70_kb.js` | `hcpcsParse_` — ONE tokenizer, server-side, self-contained (the code shape is inside it, so a pin that loads it alone exercises the whole rule). Returns `{raw, shaped, certain, tokens}`, and **`tokens` is populated only on the certain path**. That is the safety rule expressed as a shape rather than a warning: a consumer cannot assert coverage from an uncertain parse because there is nothing there to assert from. `K0821/23/16` — which the operator really writes — refuses as a WHOLE string rather than yielding the readable leading `K0821`; keeping that would under-claim rather than over-claim, which sounds like the safe direction and is not, because the rep asked about three items and would be answered about one, silently. `shaped` separates "a code column we would not parse" from "not a code column", so the client can say which.
T3 (the join) | `70_kb.js` | `oopCodeIndex_` builds code → item-name over the pricing tab, live, refusing the same shorthand on the other side of the join; a token two rows carry keeps BOTH names. `insNameCodeDetail_` names an unambiguous code, refuses an ambiguous one and says how many, and never names from an uncertain parse. `searchInsurancePayors` builds the index ONLY when some result actually carries code-shaped columns — a payor with none costs no extra read — and ships `codeJoin: {attempted, error}`. `oopRowObj_` parses the join key, so both OOP surfaces carry it from the ONE resolver (g126); `checkOopEligibility`'s hand-list ships it too.
T3 (client) | `kb/script_kb.html` | `insCodeItemHtml_` draws the item name beside a payor's bare code, and the three states that are not a name. `oopPayorRulesFor_` / `oopPayorXrefHtml_` draw the reverse: what the payors ON SCREEN say about this item's code, with the shorthand stating its own refusal rather than going quiet. **The client never parses a code** — it joins on the server's tokens, so the rule has one home and no mirror to drift (g120). `KB_INS.last` / `KB_OOP.last` are a REPAINT cache, not a result cache: nothing is served from them, a failure stores `null` (g129), and each panel repaints the other so the cross-reference appears in either search order and leaves when the payor that justified it leaves.
T3 (honest failure) | `kb/script_kb.html` | A pricing tab the server could not read is ANNOUNCED, passing the server's reason through; `attempted` is the server's word, because bare codes with no names look exactly like a payor sheet whose columns were never codes (g53). A payor with no code columns gets no banner — a diagnostic that can never be clean is worse than none (g02).
T3 (strengthened) | `kb/script_kb.html`, `run.js` | The payor failure handler now DELEGATES to the renderer instead of painting `errorStateHtml_` at the host itself, so the stash is cleared on both failure paths. The wiring pin asserts both halves rather than being relaxed.
T3b | `scripts/bite.sh` | `--dom` drives the DOM harness. Every guard the tool had — dirty file, double quotes, the no-op check, `--fn` scoping, the diff on a NO BITE, the herestring — now covers both, and the verdict names which harness ran. This is the follow-on logged when a hand-rolled DOM bite loop discarded an uncommitted fix (g65's fifth firing); the guards are the tool's job, not the caller's memory.

TEST RESULTS: passed. Pure 919 → **923**, DOM 135 → **140**, visual matrix 109 → **112**, lint clean, manifest current, counts block agrees.
**ELEVEN bite-checks, all BITE** (five pure, six DOM — the first DOM bites this project has run through the tool): the shorthand keeping its readable fragments · tokens filled before certainty · an ambiguous code named from the first item · `itemCount` left stale · the row resolver dropping the join key · an uncertain code entering the index · the pricing tab re-read on every payor search · the panels not repainting each other · an unmatchable item code rendering as silence · an ambiguous code left unannotated · a missing code annotated like a failure · a degraded join unannounced · the banner firing when no join was attempted.
**One NO BITE, investigated and acted on:** the client's `certain` guard in `oopPayorRulesFor_` could not be made to fail, because `hcpcsParse_` structurally cannot emit tokens without certainty — so it was untested defence. A pin now hands the client a payload the server cannot produce (`certain:false` WITH matching tokens) and asserts it still refuses. The bite bites.
**Shots READ, not just measured:** the cross-reference's first layout put a long payor name — and they are long — into a wrapping inline row that squeezed its rule into a narrow twice-wrapped column. 0px overflow, no console error, and unreadable. Fixed to the `.kb-ins-cell` shape. The `.kb-ins-grid` min track went 150px → 190px for the same reason, before it bit.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** (KB reference drawer) — UPDATED with six T3 steps incl. renaming the `OopPricing` tab to see the degraded banner. Needs the operator's walk on the deployed instance.
- **S112** (OOP pricing) — NOT APPLICABLE beyond the new `codes` field; its price/verdict assertions are untouched and pinned.
- **S73** (phone-width grids) — NOT APPLICABLE: the `.kb-ins-grid` track widened, which REDUCES columns at narrow widths; the compact and drawer shots were read.
- **S62, S63, S65, S66, S71, S86, S104** — NOT APPLICABLE: reader, Doc converter, screenshot upload, AI card, review-due, interactive blocks, Drive signal. None touched.

REGRESSION RISKS:
- `searchInsurancePayors` now reads a SECOND tab. Gated on a result actually having code-shaped columns, pinned, and a failure degrades to named-bare-codes rather than failing the payor lookup.
- `oopItemRowHtml_` gained a second parameter. Both call sites are the one renderer's loop; a missing argument yields `undefined` → no cross-reference, which is the safe direction, and the pins drive both orders.
- `oopRowObj_` gained a field. Every consumer is pinned, and the eligibility endpoint's hand-list is asserted against it.
- `.kb-ins-cell .c` became a column stack. It carries the code and the name; the wide, drawer and compact shots were read.

INVARIANTS AT RISK: None violated. **INV-233 added** (the ambiguity-as-a-shape rule). g120 honoured by construction — there is no client-side parse. g126 honoured — one resolver, one tokenizer, both surfaces. g129, g53, g02, g41 all cited in the code where they apply. g65 fired ZERO times: the tree was committed before every bite, and the tool now covers the DOM harness that caused the last firing.

NET SCORE: 0 − 0 = 0
(Production fixes: 0 — nothing here was broken. New capabilities: 1, the join. Defensive/structural: 2 — the delegated failure handler, and `bite.sh --dom`. New failure modes: 0. The honest value is a rep stops leaving the panel mid-call to find out what K0802 is; it is not a bug fixed.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- Still outstanding from T2: FOUR toned acceptance values have no definition on file — `OON`, `Plan Specific`, `OUT-OF-NETWORK`, `MDX Hawaii`.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T1, T2 and T3 all ship in this one deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **An operator question T3 raises:** how many `OopPricing` codes are written in the `K0821/23/16` shorthand? Every one of them is a code the join declines. If it is a handful, splitting them into separate rows (or a comma-separated list of WHOLE codes) makes them joinable with no code change — the tokenizer already reads `K0800, K0801`.
- `insToneCls_` still treats an exact `out-of-network` as `bad` but a value merely CONTAINING it as `warn`. Pre-existing, untouched.
- T4 (keyboard, copy-price with the g76 failover, collapsing agreeing verdicts) remains unstarted; the last of those changes a documented decision (ELIG / INV-209).

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` — the Reference narrative describes neither the split landing (T1), the term popover (T2), nor the join (T3).
- `docs/gotchas.md` + the CLAUDE.md index — still owed from T1/T2: the drawer `.kbd-sec` defect and the re-render class. T3 adds nothing new to that family.
- `docs/operator-state.md` — `InsurancePayors` has no entry of its own, only a mention inside the `OopPricing` one. T3 makes its column headers load-bearing (they are the join key), which is operator state.
- `docs/test-harness-log.md` — the eleven bites, the NO BITE and what it meant, and `bite.sh --dom`.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
