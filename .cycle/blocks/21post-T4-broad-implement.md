---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T4 — keyboard navigation through the lookup results · copy a price with the g76 clipboard failover · collapse the two eligibility verdicts when they AGREE (amends INV-209 and its decision entry)
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, .cycle/config.md, docs/design-decisions.md, CLAUDE.md, .cycle/STATE.md
Estimate: T4 M (~3 h)
Actual: ~3 h

CHANGES:
T4 (keyboard) | `kb/script_kb.html` | ArrowDown from a lookup field walks into its results; arrows move between rows, Home/End jump, Enter activates the row's primary control, Escape returns to the field. Off the TOP returns to the field so the rep can keep typing; off the BOTTOM stays put, because wrapping would answer "show me the next one" with the first one. Rows are focusable but NOT tab stops, so Tab still goes field → field. Enter belongs to the row ONLY when the row itself has focus — on a control inside it, it is that control's, or every button in a row would do the row's action. The landing and the drawer are two independent pairs: the mapping is two pure functions over the ids (`kbNavHostIdFor_` / `kbNavInputIdFor_`), pinned as a total, round-tripping map rather than a list, so a suffix cannot leak between them and walk a rep from the drawer's field into off-screen results.
T4 (copy) | `kb/script_kb.html` | One copy button per priced column. **It copies the FIGURE, never a quote-shaped line, and that is the whole design.** The composer's picker inserts a line the SEND rebuilds from the live sheet and refuses if it has moved (INV-208); a line pasted from here would never be recorded as a quote, so never re-verified — and would sit in the customer's email looking exactly like one that was. A bare figure cannot be mistaken for a verified quote. The value is read from the payload parked on the results host, addressed by index, never scraped back out of the DOM (INV-208, g49); the parked payload is cleared on EVERY render path, so a stale index resolves to nothing and refuses rather than copying whatever now sits there. On a row with ONE price the copy button is the row's Enter target; with three it is not, because there is no "the" price and picking one is the guess this module refuses to make.
T4 (honest copy) | `kb/script_kb.html` | `kbCopyText_` REPORTS whether the copy worked. `execCommand` returns **false** when denied rather than throwing, and reading `navigator.clipboard` can itself throw in a sandboxed frame — every other copy helper in this app (five of them) swallows both and says "Copied ✓" regardless. For a link that is mildly annoying; for a price it is the rep pasting the previous clipboard contents and reading them to a customer. A failure opens the manual failover with the figure pre-selected and says plainly that nothing was copied.
T4 (verdicts — AMENDS INV-209) | `kb/script_kb.html`, `.cycle/config.md`, `docs/design-decisions.md` | The rule was "both verdicts shown, LABELLED, rather than behind a payment-method toggle", and its stated reason is that the rep is usually deciding BETWEEN them. When they agree there is nothing to decide, and the duplicate row is what made a real disagreement hard to spot — the case the pair exists for. So the ROW collapses and the CLAIM does not: the single row is labelled "Through insurance or out of pocket", naming both routes, so it can never read as an answer about one. A disagreement renders as two labelled rows, unchanged. Nothing is behind an interaction either way, which is what the decision actually forbade. Agreement is STRICT — verdict, near AND why. Both the invariant and the design-decision entry carry the amendment and its reasoning.

TEST RESULTS: passed. Pure 923 → **925**, DOM 140 → **142**, lint clean, manifest current, counts block agrees, all 14 `reference-*` visual scenarios 0px overflow with no console errors.
**THIRTEEN bite-checks, all BITE** (six pure, seven DOM): agreement ignoring `near` · the collapsed verdict naming one route · agreement ignoring `why` · the scalar price fallback made unreachable · the scalar appended instead of falling back · the copy handler numbering prices itself · a denied `execCommand` reported as success · ArrowDown wrapping at the bottom · ArrowUp not returning to the field · Enter hijacked from controls inside a row · a blocked clipboard toasting instead of opening the failover · a stale index copying anyway · the failover not pre-selecting the figure.
**THREE NO BITEs, every one a real gap, all closed:**
 1. Agreement ignoring `why` — the pin READ `.why` out of the source. No fixture anywhere had two verdicts matching on verdict and near but differing in REASON, which is a real case (insurance yes because inside the radius, out of pocket yes because the state limit does not apply) and collapsing it would print one reason as covering both. Now DRIVEN, with the three near-misses beside it.
 2. The scalar price fallback — same shape. Nothing ever put a scalar-only payload through it, which is exactly what an older deployment answers a newer client with, i.e. every tab already open during a New Version deploy. Now driven in both harnesses, including that the array WINS over the scalar rather than appending.
 3. `oopPriceHtml_`'s `idx == null` guard could not be made to fail because its one caller always passes an index — dead defensive code. REMOVED rather than dressed up (g138): a caller that forgets one now renders a button whose index does not resolve, and the "no longer on screen" refusal already covers that. One path instead of two, and that path is driven.
**Shots READ, not just measured.** The drawer shot carries both branches one above the other — the agreeing item as one line, the state-limit item as two — and the disagreement is now the one that catches the eye, which is the entire point of the amendment. The three prices also stopped running together, because each now leads with its own copy affordance.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** (KB reference drawer) — UPDATED with four T4 steps: the arrow walk in both hosts (and that the drawer's arrows never reach the landing's results), copying the SHIPPING figure specifically, the blocked-clipboard failover, and seeing an agreeing row beside a lifting one.
- **S112** (OOP pricing) — its composer price-picker and send-verification steps are UNTOUCHED and were deliberately not widened: T4 adds a second way to get a price onto the clipboard and explicitly not a second way to get one into an email.
- **S73** (phone-width grids) — NOT APPLICABLE: no grid track changed; the compact and mobile shots were read.
- **S62, S63, S65, S66, S71, S86, S104** — NOT APPLICABLE: reader, Doc converter, screenshot upload, AI card, review-due, interactive blocks, Drive signal. None touched.

REGRESSION RISKS:
- **The verdict collapse changes what a rep sees on the most consequential surface in the module.** Mitigated by the label naming both routes and by the strictness of the agreement test; the risk that remains is that a rep who learned the two-row layout reads the single row as one answer. That is why the label was changed rather than kept.
- `oopItemRowHtml_` / `oopPriceHtml_` gained a parameter. One call site each, both updated, both pinned.
- A document-level `keydown` listener is new. It returns immediately unless the target is a lookup field or inside a lookup results host, and it never preventDefaults a key it does not handle — pinned, including that the fields keep ArrowUp/Home/End/Enter.
- `host._oopItems` is new state on a DOM node. Cleared on every render path including the error returns, pinned.

INVARIANTS AT RISK: **INV-209 is deliberately AMENDED**, in the library and in `docs/design-decisions.md`, with the reasoning rather than just the new behaviour. INV-208 is honoured and reinforced — the price does not round-trip through the DOM, and the copy is deliberately NOT the composer's canonical line so it cannot masquerade as a verified quote. g76 is the reason the copy reports failure; g100 is honoured (the failover is a real overlay through the hooks); g49 by construction; INV-175/187's honest-failure rule is what the failover is.

NET SCORE: 0 − 0 = 0
(Production fixes: 0 — nothing here was broken. New capabilities: 3. Defensive/structural: 0. New failure modes: 0. The value is a rep keeping their hands on the keyboard mid-call, not transcribing a price by eye, and seeing a disagreement because it is the only two-row answer on screen.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- Still outstanding from T2: `OON`, `Plan Specific`, `OUT-OF-NETWORK` and `MDX Hawaii` have no definition on file.
- Still outstanding from T3: how many `OopPricing` codes use the `K0821/23/16` shorthand — each is a code the join declines, and splitting them into whole codes needs no code change.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T1, T2, T3 and T4 all ship in this ONE deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Five copy helpers in this app swallow failure and report success** — `cnFallbackCopy_`, `kbLinkCardCopyFallback_`, the two in `script_intake.html`, and `mCopyFallback_`. `kbCopyText_` is the honest one; the KB link card is the closest neighbour and still says "Copied ✓" unconditionally. Out of T4's scope (T4 is the price), worth a pass of its own.
- `kb/script_kb.html:2196` copies a name with `navigator.clipboard.writeText` and NO fallback at all — a g76 defect with no failover, latent. Untouched, out of scope.
- The keyboard walk covers the two LOOKUP panels only. The article tree and search results on the same landing are still mouse-only; the same two-function mapping would extend to them.

DOCUMENTATION UPDATES NEEDED:
- `docs/design-decisions.md` — DONE for the INV-209 amendment (it is part of the change, not drift).
- `docs/modules.md` — the Reference narrative still describes neither the split landing (T1), the term popover (T2), the join (T3), nor T4's three.
- `docs/gotchas.md` + the CLAUDE.md index — still owed from T1/T2: the drawer `.kbd-sec` defect and the re-render class. T4 adds a candidate: a copy helper that cannot fail is a copy helper that lies (g76's second face), with five live instances.
- `docs/operator-state.md` — `InsurancePayors` still has no entry of its own.
- `docs/test-harness-log.md` — the thirteen bites, the three NO BITEs and what each meant, `bite.sh --dom`, and the two jsdom limits these pins had to state around (inline `onclick` is not evaluated; `navigator.clipboard` needs `defineProperty`).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
