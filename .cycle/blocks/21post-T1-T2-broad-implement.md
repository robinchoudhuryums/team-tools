---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T1 the landing re-render destroyed typed lookup input · T1b one payor status, two looks · T1c the OOP meta was a run-on sentence · T2 the acceptance legend was forced inline · T2b acceptance values now explain themselves
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/mock.js, .cycle/config.md, CLAUDE.md, .cycle/STATE.md
Estimate: T1 S (~2 h) · T2 M (~3 h)
Actual: ~3 h combined

CHANGES:
T1 | `kb/script_kb.html` | The landing is split: `kbLandingBandHtml_` renders the lookup band ONCE, `kbLandingBlocksHtml_` renders the content blocks, and `kbRenderLanding_` patches only the blocks when the band is already mounted. Three manager-only loaders call it on completion and it used to do `main.innerHTML = h`, so a manager who opened Reference and started typing an address lost it 0.5–3s later. Restoring the VALUES would not have sufficed — focus and the caret go with the nodes, so the band survives AS nodes, and the pin asserts the address element is literally the same object.
T1b | `kb/script_kb.html` | A pill's tone is a CLAIM. When `insToneCls_` recognises nothing in the value there is no claim to make, so it renders in the neutral style, verbatim. A cell literally reading `status not recorded` used to get the uppercase untoned pill while a BLANK cell got the lowercase neutral one — one meaning, two looks, side by side in one result list.
T1c | `kb/script_kb.html` | The OOP meta line became chips via `oopMetaChip_`. It mixes a billing code, a date, a delivery rule, money and colour options; one `·`-joined sentence made every one equally hard to find.
T2 | `kb/script_kb.html` | The legend is a tethered popover — `ensureOverlay` with `hover-mode` riding `extraClass` (g134), opened through the hooks (g100), positioned by `kbTetherPopover_` (the `positionDayPopover_` shape). It had been sharing `insToggleLegend_` with the per-payor code disclosure, which wants the opposite treatment and stays inline beside its row. No `hidden` `<dl>` is emitted per host any more; the popover builds from one source.
T2b | `kb/script_kb.html` | `INS_TERMS` is the single source for the legend, the per-value explanations, and — by pin — agreement with the tone. Each acceptance VALUE the vocabulary knows is a real `<button>` with a dotted underline that explains itself; a value nobody has defined stays inert text and says so. A COMBINED value explains every rule in it (`Location-based ( Up To 285) & SI/PR` → Location-based, SI/PR, A & B), because one explanation for a combined rule is a partial answer.

TEST RESULTS: passed. Pure 917 → **919**, DOM 133 → **135**, lint clean, manifest current, counts block agrees. Visual matrix: all eleven `reference-*` scenarios 0px overflow and no console errors, and the wide / drawer / compact shots were READ.
**Six bite-checks, all BITE:** rebuilding the landing wholesale · reverting the pill to two looks · hand-writing `INS_LEGEND` instead of deriving it · dropping `hover-mode` · putting the legend back inline · explaining only the first rule of a combined value.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** (KB reference drawer) — UPDATED with the T1/T2 steps and Expected. Needs the operator's walk on the deployed instance. No scenario mentioned the acceptance legend at all before this, which is why it could be unusable in the drawer without anything saying so.
- **S112** (OOP pricing) — NOT APPLICABLE to T1/T2's changes beyond the meta chips; its price/verdict assertions are untouched and the DOM pins cover them.
- **S62, S63, S65, S66, S71, S86, S104** — NOT APPLICABLE: they exercise the reader, the Doc converter, screenshot upload, the AI card, review-due, interactive blocks and the Drive signal. None was touched.
- **S73** (phone-width grids) — NOT APPLICABLE: no grid track changed; the band and field rules are as batch R left them, and the mobile/compact shots are unchanged.

REGRESSION RISKS:
- `kbRenderLanding_` keeps its signature and every caller works unchanged; the only behavioural change is that a mounted band is preserved. A cold render still builds both halves — pinned.
- `insToneCls_` is UNTOUCHED. Its cascade decides the colour on a compliance-adjacent field and was deliberately not rewritten to share code with a tooltip; the agreement between tone and explanation is held by a pin instead of by construction.
- `INS_LEGEND` changed from a literal to a derived value. Nothing outside this file reads it (checked).
- Caught on camera and fixed: `.kb-term` zeroes background/padding for the inline case, which stripped an `IN-NETWORK` pill to bare underlined text. A number could not see it.

INVARIANTS AT RISK: None violated. g49 avoided by design (the term is read from `textContent`, never a `data-*` round trip). g134 and g100 both honoured explicitly. g116 fired during the work — `deepStrictEqual` on a vm-realm array — and was closed with the documented JSON round-trip.

NET SCORE: 2 − 0 = 2
(Production fixes: T1 the input-loss defect — Medium, fires for any manager who types within ~3s of opening Reference, which is the normal way to use a mid-call lookup; T1b the two-look pill — Low, a user-visible inconsistency on a path reps hit. Capabilities: 1, the per-value explanations. Defensive/structural: 2, the meta chips and the legend popover — both are legibility on a surface that already worked. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **FOUR acceptance values are toned and have NO operator definition** — `OON`, `Plan Specific`, `OUT-OF-NETWORK`, `MDX Hawaii`. Each is a coloured pill a rep cannot learn the meaning of. The pin NAMES them rather than skipping them; the fix is operator text, not code, and it is a question for the operator.
- `insToneCls_` treats an exact `out-of-network` as `bad` but a value merely CONTAINING it as `warn`. Pre-existing, possibly deliberate, not touched — but it is the reason the tone/term pin cannot assert a tone for that term.
- T3 (the payor × item join) and T4 (keyboard, copy-price, verdict collapse) remain unstarted.

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` — the Reference narrative describes neither the split landing nor the term popover.
- `docs/gotchas.md` + the CLAUDE.md index — the drawer `.kbd-sec` defect from PR #264 has bitten production and still has no entry; T1's re-render class (an async loader destroying user input because the renderer owns too much) belongs beside it.
- `docs/test-harness-log.md` — the six bites, and g116 firing again on a vm-realm array.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
