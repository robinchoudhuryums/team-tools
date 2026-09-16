---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: OOP-A (OOP1 the ninth store read live · OOP2 the dual-surface lookup) · OOP-B (OOP3 the composer price picker) · ELIG (EL1 the eligibility grammar · EL2 the address check, both verdicts)
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/30_callnotes.js, web-app/70_kb.js, web-app/Tests.js, web-app/cn/script_callnotes.html, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, CLAUDE.md
Estimate: OOP-A M (~5 h) · OOP-B S–M (~3 h) · ELIG L (~8 h, REVISED from M–L/~6 h by the operator's real column values) — all recorded in STATE.md BEFORE the first edit
Actual: OOP-A ~3 h · OOP-B ~2 h · ELIG ~3.5 h — ~8.5 h against ~16 h estimated

CHANGES:

OOP1 | 00_config.js, 10_core.js, 70_kb.js, Tests.js | A NINTH store, read LIVE. `getOopSS_` takes the `getQaSS_`/`getHrDocsSS_` posture — no fallback, an unset property is a friendly not-configured error, never a silent read of some other spreadsheet. Columns resolve BY HEADER STEM (the operator owns the file and may reorder it), `effective` tested before `price` so "Effective Price Date" cannot put a date in front of a customer as money, unknown columns riding along verbatim. No result cache, deliberately: the plan said "cache SHORT", and the honest answer on a price someone collects on is "do not cache at all". Storage Health gained the row; `_withTestOop_` seeds a header row because the reader discovers columns by header.

OOP2 | 70_kb.js, kb/script_kb.html | `searchOopPricing` reuses `insPayorScore_` rather than copying it — two scorers for two lookups is two things to keep in step and nobody would notice them diverging. Mounted on the Reference landing AND the Ctrl/⌘+K drawer. A no-match says NOT to quote a similar item; a blank price says "no price on file" in warning tone rather than rendering an empty cell that reads as free. `getOopPricingDiagnostics` (admin) reports the tab read and the role assigned to every header, and NAMES the roles it could not find — header discovery is invisible until it goes wrong, and without this the operator finds out from a rep mid-call.

OOP3 | 00_config.js, 30_callnotes.js, cn/script_callnotes.html | The composer price picker. `oopQuoteLine_` is the ONE canonical rendering, used by the picker to insert and by the send to rebuild from LIVE sheet data; the verification IS those two agreeing character for character. `oopVerifyQuotes_` fails CLOSED — unreadable store, vanished item, blanked price, stale price and hand-edited line each refuse with their own message; a DELETED line sends normally and audits nothing. Verification runs ahead of token creation, the PDF fetches and the send. The quoted prices ride the existing `ExternalEmailSent` row with item, exact price and effective date — and still the recipient DOMAIN only.

EL1 | 00_config.js, 70_kb.js | The eligibility grammar, against the operator's REAL values. `Open` → open; two-letter codes (whole value only) → states; a distance plus a name matched as a SUBSTRING against the `OOP_WAREHOUSES` registry → radius; everything else → UNKNOWN. `oopEligibilityForPayment_` carries the rule that generalises: a restriction that exists because of WHO IS PAYING lifts out of pocket, one that exists because of HOW IT PHYSICALLY GETS THERE does not. UNKNOWN never lifts.

EL2 | 70_kb.js, kb/script_kb.html | `checkOopEligibility` takes an address or ZIP and returns every matching item with BOTH verdicts, labelled. The state comes from the geocoder's `address_components`, never a string-parse of the formatted address. `kbGeocodeCached_` extracted from `kbMapDistances` so the radius check shares ONE coordinate cache. A radius NO is certain and a near-boundary YES says the drive is longer. Warehouses are geocoded only when some picked row is actually a radius rule.

TEST RESULTS: PASSED. Pure harness 832 → 844 · DOM harness 117 → 121 · editor registrations 323 → 327 (4 new integration tests against a real spreadsheet) · `lint-server` clean across 16 server files · `counts --check` green · split manifest regenerated three times.

WHAT THE PINS CAUGHT THAT READING DID NOT — seven, and two of them were in pins I had just written:
1. The compact-mode grid override shipped WITHOUT its viewport twin — g50, in the very file that has been bitten by it, under a comment citing g50. The A2 tripwire refused it.
2. The optional item input shipped with a placeholder and no accessible name. The A14 ratchet refused it.
3. `deepStrictEqual` on a payload handed back from the jsdom sandbox compares PROTOTYPES and failed on an identical object — g116 verbatim.
4. My "edited line" test failed because the implementation could not tell an edited line from a deleted one at all. That gap was real and shipped-shaped; the discriminator (the surviving price string) came from the test failing.
5. A bite-check found the straight-line caveat assertion was host-wide, and those words also appear inside a near-boundary verdict's reason — deleting the strip's own caveat left the pin green.
6. A bite-check found the "could not place a warehouse" branch had no DOM coverage: the fixture placed every warehouse, so deleting the branch bit nothing.
7. `_withTestOop_` shipped with OOP-A and nothing ever called it. A fixture declared and unread is the g04 class, and a worse instance than a CONFIG key because it LOOKS like coverage.
And one thing no pin caught, found by re-reading: the comment claiming radius-first ordering is what stops a state code inside a radius phrase parsing as a state rule was WRONG about today's code — the whole-value-is-codes rule already rejects it. The ordering is defence against a plausible future relaxation, and it now says that.

Bite-checks — 20 mutations, 20 bites (11 via `scripts/bite.sh` on the pure harness; 9 by hand on the DOM harness, which bite.sh does not drive):
  BITES — the OOP line's em dash becomes a hyphen on the server side (the mirror)
  BITES — fail-open on an unreadable pricing store
  BITES — quotes verified AFTER the send instead of before
  BITES — the audit row loses the quoted prices
  BITES — the audit row gains the raw recipient address (g36)
  BITES — the price is written into a data-* attribute (g49)
  BITES — UNKNOWN lifts out of pocket
  BITES — a RADIUS lifts out of pocket
  BITES — STATES relaxed to EXTRACT codes instead of requiring all tokens
  BITES — a blank eligibility cell reads as OPEN
  BITES — an unresolved state folds into NO
  BITES — a near-boundary YES loses its caveat
  BITES — a null warehouse distance counts as zero
  BITES — the picker's line built from a DOM read instead of the RPC payload
  BITES — chips rendered but the line never inserted
  BITES — removing a chip leaves the line
  BITES — a no-match renders an empty list
  BITES — a priceless row gets an Insert button
  BITES — chips render from the DOM and are lost on re-render
  BITES — a stale search paints over a cleared box (INV-156)
  BITES — the quote is not shipped to the server
  BITES — the drawer mount is deleted
  BITES — a 3-char stem fires a geocode
  BITES — the straight-line caveat is dropped from the strip (after the pin was fixed)
  BITES — an unplaceable warehouse is silently dropped (after the fixture was fixed)
  BITES — an unplaceable warehouse is listed among the measured

REGRESSION SCENARIOS (Test Command is `manual`):
  S110 OOP pricing — the lookup, the price picker, and area eligibility both ways | NEW, written this batch. NOT RUN IN THIS CONTAINER (needs the deployed instance, the real pricing spreadsheet and a browser). This whole feature — a new store, a price a rep quotes to a paying customer, and an eligibility engine — had NO manual scenario after OOP-A, which is exactly the gap this section exists to close. It walks the diagnostics, all three price-row states on both hosts, the four send outcomes (current / stale / hand-edited / deleted), the audit row, all four eligibility rule kinds, both distance bands, and an unmatched `Price` header.
  S1 / S2 Smoke + full integration suites | NOT RUN (editor only). 4 new registrations; the `Expected:` line must read 327. **S2 needs the DEV instance** — see the standing `INSTANCE_IS_PROD` item.
  S52 Email composer Internal/External tab transition | NOT RUN. DIRECTLY TOUCHED: the external composer gained a field row. The PDF/Fillable re-render path is the risk, and the DOM pin covers it — the chips render from STATE and survive a full `cnRenderExternalEmailModal_()`.
  S19 Call Notes — email composer with preview gate | NOT AFFECTED. That is the DEPARTMENT composer; the preview/hash gate is untouched.
  S62 / S64 Reference browse + the mid-call drawer | NOT RUN. Both gained a section. The drawer pin drives `kbDrawerRenderHome_`, not the section builder, so a deleted mount is visible (the OOP-A lesson).
  S73 Phone-width layout of the unbreakpointed grids | NOT RUN. DIRECTLY RELEVANT: this batch added a grid, and the A2 tripwire caught it shipping without its breakpoint. Worth an operator eye at phone width on the verdict rows.
  S104 Drive capability | NOT AFFECTED.

REGRESSION RISKS:
  1. **`kbMapDistances` was refactored** — `kbGeocodeCached_` extracted from the middle of a working function that carries a privacy contract. The contract is unchanged and its pin got STRONGER (it now spans three functions and anchors on "ONE writer, only operator-owned addresses in" rather than one function's statement order), but this is a refactor of live code and S62's "Find nearest" box is the thing to look at.
  2. **`kbGeocodeOne_` gained a field.** Additive; existing callers ignore `state`.
  3. **`sendExternalEmail` gained a pre-send read** that can refuse the send. Bounded: with no quote it never touches the store (pinned), so every send that worked yesterday still works.
  4. The Reference landing and drawer each grew a section. Vertical space on the drawer is now four sections deep.

INVARIANTS AT RISK: None violated. Two ADDED — INV-208 (a number a customer is charged is server-sourced at SEND time, and the stated boundary of that promise) and INV-209 (eligibility has two answers, and which restrictions lift is a rule rather than a table). g36's minimization is EXTENDED, not relaxed. INV-156, INV-46, INV-136, INV-187/g114 and g41 all re-applied and pinned.

NET SCORE: 0 production fixes − 2 new failure modes = −2.
  Stated plainly rather than massaged: this is a FEATURE batch, so there was no live defect to fix, and the template's net_score is built for audit-fix cycles. The two new failure modes are real:
  (a) **A client↔server character-for-character mirror that did not exist before.** A drift does not render slightly differently — it blocks every OOP send with a message the rep cannot satisfy. Mitigated by a behavioural mirror pin driving both sides over a table, but the coupling is new. MEDIUM.
  (b) **`checkOopEligibility` geocodes the customer address on every check, uncached and uncapped.** That is deliberate (a cached customer address is the privacy problem this design avoids), but the built-in Maps geocoder has a daily quota SHARED with the ```map block's "Find nearest". A rep leaning on the eligibility box could exhaust it and take the map's lookup down with it. The 700ms debounce and 4-character floor bound the rate, not the day. MEDIUM — logged as a follow-on.
  The seven defects the pins caught were all pre-ship and are NOT counted as production fixes.

OPERATOR ACTIONS / DEPLOY:
- Script Property `OOP_SS_ID` — already set by the operator (2026-09-16) | BLOCKS DEPLOY: N (done)
- The pricing sheet's `Area Eligibility` column — already added by the operator | BLOCKS DEPLOY: N (done)
- Script Property `OOP_WAREHOUSES` — OPTIONAL. `{"Dallas": "<full address>", "San Antonio": "<full address>"}`. The CONFIG seed uses bare city names, which geocode to the city centre; a real warehouse address makes every radius answer accurate rather than approximately right. **Set it before trusting a near-boundary verdict.** | BLOCKS DEPLOY: N
- Read Manage → Admin → the OOP pricing diagnostics ONCE after deploying, and look at the eligibility grouping. Any value the parser could not read is listed there BY ITEM. That list is the point of the panel — an unreadable value renders "cannot tell", which reads like caution rather than like a typo. | BLOCKS DEPLOY: N
- `clasp push -f` + a New-version deployment | BLOCKS DEPLOY: Y
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Geocode quota.** `checkOopEligibility` and the ```map block share the built-in Maps geocoder's daily quota, and neither has a per-day cap or a quota-exhausted message. Today a rep leaning on the eligibility box degrades the map's "Find nearest" to "Could not find that location" with no explanation. Worth a shared counter and an honest message — the failure currently reads as a bad address.
- **A radius verdict is straight-line only.** The code says so and the UI says so, but the honest fix for a near-boundary answer is a drive-distance lookup, which is a billed Maps API and therefore a Tier-B decision the operator has not been asked for.
- **The picker cannot catch an overtyped figure.** Documented as the stated boundary of INV-208 rather than hidden. A stricter design (a read-only inserted token the rep cannot edit) is possible but would need the message to stop being a plain textarea.
- **`OOP_WAREHOUSES` has no Admin editor.** It is a Script Property with a CONFIG seed, edited in the Apps Script console. Every other operator-editable registry in this app (auto-tag rules, email templates, quick links, QA criteria) has an Admin tab editor with the budget badge; this one should too.
- **Eligibility is not shown in the OOP price lookup itself** — only in the dedicated check, which needs an address. An item's raw eligibility string shows on the price row, unparsed. Rendering the RULE there (without an address: "Texas only through insurance; anywhere out of pocket") would answer the common case with no geocode at all.

DOCUMENTATION UPDATES NEEDED:
- ~~CLAUDE.md's store table~~ **DONE in the store move (below)** — the OOP row is gone, the KB row names all three lookup tables, and the `Area Eligibility` column is now flagged as READ BY AN ENGINE.
- ~~`docs/operator-state.md`~~ **DONE in the store move** — the `OOP_SS_ID` entry was replaced by an `OopPricing` + `LocationAcceptance` entry carrying both tab schemas, and CLAUDE.md's inventory line follows it.
- The Common Gotchas index has no entry for the client↔server line mirror (INV-208) — it belongs in the "Escaping & injection"/mirror family alongside g38 and g103. **STILL OWED.**
- `docs/design-decisions.md` should carry the WHO-IS-PAYING vs HOW-IT-GETS-THERE rule as a decision, since it is the thing a future reader would otherwise re-derive from a table. **STILL OWED**, and the store-placement reasoning (why the KB store and NOT the Intake store) belongs beside it.
(→ `/sync-docs`)

---

## ADDENDUM — the store move (operator, same day)

The operator asked whether the OOP spreadsheet could fold into `INTAKE_SS_ID`
to save a Script Property. It could not, for three reasons — and the third is
the one that would have been silent:

1. **The Intake store is PHI and the app WRITES to it** (`getIntakeSubmissionSheet_`
   appends submissions and calls `insertSheet`). Pricing there means anyone
   maintaining prices needs edit access to patient submissions.
2. **The saving was not real.** Script Properties are capped by BYTES (g07);
   per Batch Q the advertised entry caps were never the binding constraint.
3. **`oopSheet_` took `getSheets()[0]`.** Correct while the file existed for one
   purpose; in any shared spreadsheet it reads sheet 0 — and because columns are
   discovered BY HEADER it would not have thrown. It would have matched no
   `price` header and rendered every row "no price on file".

The counter-proposal the operator accepted: **`KB_SS_ID`**, which already holds
`InsurancePayors` — an operator-imported, read-only lookup table of the same
class, same maintainer, same access pattern, read through a NAMED tab, and whose
scorer `searchOopPricing` already reuses. Same saving, no boundary crossed.

Landed as `OopPricing` + `LocationAcceptance`:
- Both are NAMED tabs; `oopSheet_` throws and names the tab to create.
- `LocationAcceptance` REPLACES the `OOP_WAREHOUSES` Script Property and carries
  TWO row kinds under `Type` — warehouse (Name + geocoded Address) and city
  (Name + State + Accepts, the POV/scooter delivery list).
- **NO seed, NO fallback.** The property fell back to a CONFIG seed of bare city
  names, which geocode to city CENTRES: a warehouse twenty miles out of town
  silently made every near-boundary radius answer wrong by up to twenty miles.
  That is g114 inside the one verdict built to avoid it. A missing tab now yields
  an empty registry (every radius rule UNKNOWN) and is surfaced to the rep by
  name, because an unreadable registry left to produce UNKNOWNs reads like
  caution rather than like a tab nobody created (g02).
- **City rows are INFORMATION ONLY** (operator decision): shown outside every
  item row, labelled "reference only", never changing a verdict. Two tables that
  could disagree would leave nobody able to see which one decided.
- `kbGeocodeOne_` also returns the city (`locality`); `locCityMatches_` treats an
  undetermined city as matching NOTHING.
- `_withTestOop_` now rides `_withTestKb_` and seeds both tabs; the
  `_TEST_OVERRIDE_OOP_SS_ID` branch is gone rather than left reading a store that
  no longer exists (g119's shape, one week after g119 was written).

**Nine stores become eight.** Harnesses 844 → 848 pure, 121 DOM, 327 → 329
editor registrations.

FOUR MORE BITE-CHECK FINDINGS in the move, all fixed:
  1. `locCityMatches_`'s blank-city guard did NOT bite — a blank query fails to
     equal any real name anyway, so the assertion passed for the wrong reason.
     The fixture now carries a nameless row, which is what the guard is for.
  2. The no-seed pin would NOT have caught a warehouse hard-coded straight into
     `getLocationAcceptance_`. All three of its assertions watched for the OLD
     shape of the defect (a property, a CONFIG fallback). It now asserts the
     registry is BUILT EMPTY.
  3. The `locationError` render had no assertion behind it — deleting it bit
     nothing, while on screen every radius rule would read "cannot tell" with
     the items still rendering around it.
  4. My own `locRowKind_` assertion was wrong rather than the code: an
     unrecognised `Type` IS unreadable, but matching is by PREFIX, so
     "warehouse (north dock)" still lands. Documented rather than accidental.

Bite-checks for the move: 12 mutations, 12 bites (7 via `scripts/bite.sh`, 5 by
hand on the DOM harness) after the four pins above were repaired.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
