---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-05, batch I1 of the approved plan)
New capabilities (G/ST): I1 — intake form safeguards on the PMD and PAP account forms (warnings only, formats read loosely, tidied on leaving a field), one question before Preview, and an opt-in Google Maps address check
Files modified: web-app/00_config.js, web-app/60_intake.js, web-app/70_kb.js, web-app/intake/script_intake.html, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M–L (~6 h) — written to STATE before the first edit (commit 47e256a)
Actual: ~5.5 h (in range; the harness's synchronous auto-responder and the fail-closed flag read cost the extra over M)

CHANGES:
I1 | web-app/intake/script_intake.html | `INTAKE_FMT_FIELDS` maps PMD/PAP question numbers to readers (checked against the English banks by a pin). Pure readers: `intakeFmtPhone_` (+1/1 dropped, 10 digits, area code not 0/1, extension kept → 469-111-3333), `intakeFmtDate_` (several shapes → MM/DD/YYYY; a two-digit year ASKED; a future DOB, an age over 120, a past discharge warned), `intakeFmtEmail_` (shape + common domain typos, "Did you mean …?"), `intakeFmtInsurance_` (the Medicare ID found with or without dashes, spaces or lower case → 1EG4-TE5-MK72; an invalid one warned; Advantage/supplement lines left alone), `intakeFmtAddress_` (ZIP and state — upper-case codes or full names), `intakeFmtHeight_` (→ 5'4", 3–7.5 ft), `intakeFmtSsn_`, `intakeFmtCheck_` (secondary phone equal to the primary). `intakeFmtOnChange_` tidies, saves the draft and writes an amber `.intk-fmt-note` (role=status) under the field; `intakeFmtIssues_` lists what still looks off; `intakeWarnRecommended_` asks ONE question (blank recommended + format issues, Go back / Continue anyway). Phone, SSN and email fields carry inputmode; the SSN is masked while not focused. `intakeAddrCheck_` fails closed (`empState.flags.intakeAddressCheck === true` only), sends the address line alone, guards on a sequence number and the current value, and offers Use this for a full match only; `intakeAddrMessage_` keeps found / partly matched / not found / outside / could not check apart.
I1 | web-app/60_intake.js | `checkIntakeAddress(address)` — employee-gated, the flag re-read server-side, 6..300 chars else `skipped`, cached 6 h under a SHA-256 of the lowercased text, `intakeAddrCheckReserve_` caps 1,000 a day (24 hourly buckets in `INTAKE_ADDR_CHECKS_24H`), a failure never cached, no audit row or log; `intakeAddrVerdict_` reads the geocoder's answer into found / area / partial / outside / notFound / unavailable.
I1 | web-app/70_kb.js | `kbGeocodeOne_` carries the result's match `types` (first 8) so a street match can be told from an area.
I1 | web-app/00_config.js | `INTAKE_ADDR_CHECK_PROP` / `_CAP` / `_CACHE_SECONDS`; the `intakeAddressCheck` toggle (default OFF, scope both, a danger note naming Google Maps and the BAA).
I1 | test/visual | a `checkIntakeAddress` mock fixture (X1) and two scenarios, `intake-pmd-checks-light-wide` and `intake-pmd-checks-dark-mobile` — 0 overflow, no squeezed text; the mobile note icon was found wrapping alone and fixed (flex-start, no wrap).

TEST RESULTS: Pure harness 1532/1532 and DOM 380/380 green; `npm run -s lint:server` clean; `counts.mjs --check` agrees. CI green on bd01817 (code). Bite-checks: 23 of 23 mutations BITE (19 pure, 4 DOM) — one (lower-case words read as states) first failed to APPLY through the shell's backslash quoting and was re-run with a backslash-free mutation of the same line, which bites. Regression scenario S159 written (operator walk owed); S1xx intake scenarios for the PMD/PAP send path: NOT APPLICABLE to a code change here beyond Preview's ask, which S159 covers. Test Command is `manual`: the editor suite was not run (no Tests.js change).
REGRESSION RISKS: (1) Leaving a field now REWRITES a readable value — a rep who typed a deliberate odd format sees it tidied (only shapes the reader fully understood; anything else is left as typed). (2) The pre-preview question now appears for a format issue alone, where before only blank recommended fields asked — one extra click, never a block. (3) `kbGeocodeOne_`'s result gained a field; its other callers ignore unknown keys.
INVARIANTS AT RISK: None — INV-400 added. INV-208/209 (geocoder consumers) unaffected by the added `types` field; the PHI boundary (g146) held — the address check's failure text never echoes the address.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (I1 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Confirm Google Maps may see a patient's address under the BAA before turning `intakeAddressCheck` on (Manage → Admin → Feature Toggles; OFF by default) | BLOCKS DEPLOY: N
- Walk S159 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version (no handbook copy changed)

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The PPD form is not covered (its controls are engine values, not free text) — out of scope by design.
- The SSN still reaches the intake email exactly as before; the mask is on screen only.

DOCUMENTATION UPDATES NEEDED:
- None — design decision (`#i1-intake-safeguards-and-address-check`), modules.md, operator-state.md (the toggle + `INTAKE_ADDR_CHECKS_24H`), INV-400, S159 and the running totals were written in this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---

AMENDED 2026-11-06 (operator: "Height should actually be in inches … or could just add (inches) next to the Height field"): the PMD/PAP label is "Height (inches)" / "Estatura (pulgadas)" in the client and server banks (the email's label comes from the server bank, so it names the unit whatever was typed), the placeholder reads "e.g. 64", and `intakeFmtHeight_` now tidies 64 / 64 in / 64" / 64 inches / 5'4" / 5 4 / 5ft 4in to the number of inches ("64", a half inch kept), warned outside 36–90 inches and left as typed when unreadable (163 cm, 5'14"). Pins updated (the I1 pure pin, both bank-label pins, a DOM step on field 15); 4 of 4 new mutations bite; the intake-pmd visual scenarios re-shot, 0 overflow.
