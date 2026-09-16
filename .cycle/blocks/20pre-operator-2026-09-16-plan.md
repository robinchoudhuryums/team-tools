# Operator testing round 2026-09-16 — IMPLEMENTATION BATCH PLAN

Five operator items, planned as nine findings in five `/broad-implement`-sized
batches. Ordered by IMPACT then DEPENDENCY: SP first (it is the only actual
defect), then PTO (a daily papercut, no dependencies), then the OOP table —
which OOP-B and ELIG both need before they can exist.

Every finding appears exactly once. Nothing is Deferred.

**Estimates are recorded here BEFORE the first edit** (Batch P's rule), so
`/reflect` has a measurement rather than a memory:
SP — S (~2 h) · PTO — S (~2 h) · OOP-A — M (~5 h) · OOP-B — S–M (~3 h) ·
ELIG — M–L (~6 h).

---

## Batch SP — Spanish Inbox (SP1 · SP2 · SP3) — S (~2 h)

### SP1 — resolve does not update the list state, so the unclaimed count stalls
**This is the only defect in the round; ship it first and do not let SP2/SP3
hold it.**

`spanishResolve_` (`web-app/metrics/script_metrics.html:2593`) ends its success
handler with `card.remove()`. The count comes from `spanishUnclaimedCount_()`
(`:2040`), which folds `SPANISH_STATE.pendingRes.pending`. Resolve never mutates
that array and never calls `spanishRefreshAutoAssign_()`, which only runs at the
tail of `spanishRenderList_()` (`:2342`). So the button keeps advertising a count
that includes requests that are gone.

Two consequences, and the second is the worse one:
1. The auto-assign button's "N unclaimed" is stale until something else re-renders.
2. `cacheHalf` stores the SAME object reference as `pendingRes`, so the SWR cache
   still holds the resolved item — leaving the tab and coming back re-renders the
   card that was just resolved.

The sibling action already does this correctly: `spanishClaimRpc_` (`:2520`)
routes through `spanishSetClaimLocal_`, which mutates state and re-renders.
Resolve is the one action that skips the pattern. **g67** — a cached list of
TASKS owes an invalidation from every flow that COMPLETES one.

**Fix:** add `spanishRemovePendingLocal_(tid)` mirroring `spanishSetClaimLocal_`
(splice from `pendingRes.pending`, leave the cache reference consistent), then
`spanishRenderList_()`. Delete `card.remove()` — the re-render owns the DOM.

**Verify:** a DOM pin driving resolve → the item leaves `pendingRes.pending`, the
count text drops by one, and a simulated re-enter from cache does not resurrect
the card. The count assertion must read the RENDERED button text, not
`spanishUnclaimedCount_()` — a pin that calls the counter proves the counter, not
the wiring, which is the SP1 bug exactly.

### SP2 — a fade on the resolved card
Falls out of SP1: animate the outgoing node, re-render on `animationend`. Two
rules: honour `prefers-reduced-motion` (the shell has one motion system — reuse
it, do not hand-roll a transition), and keep the toast. The animation is
reassurance; it must not become the only evidence the action worked, or a reduced-
motion user gets no feedback at all.

**Verify:** a reduced-motion pin — with the query matching, the card still leaves
and the count still updates (no `animationend` listener left holding the state).

### SP3 — Expand/Collapse becomes a chevron
`chevronDown` / `chevronUp` already exist in `script_icons.html`, so this is
`icon('chevronDown', 12)` — no new SVG (the chrome-icons decision: SVG via
`icon()`, never emoji).

**The trap:** the words "Expand"/"Collapse" are currently the button's ACCESSIBLE
NAME. Dropping them without an `aria-label` leaves an unnamed button.
`aria-expanded`/`aria-controls` (INV-174) stay in step — the button was made a
real toggle on 2026-09-10 after a version that REMOVED ITSELF, leaving no way
back, so the toggle semantics are load-bearing history, not decoration.

`.sp-more` is shared with the Mark-resolved button — **g70**: scope any styling to
the toggle, do not restyle the class.

**Verify:** the existing toggle pin extended to assert the accessible name is
non-empty in both states and that `aria-expanded` tracks.

---

## Batch PTO — manager-visible leave balances (PTO1 · PTO2) — S (~2 h)

The operator's read is correct, and it is a projection gap rather than a missing
feature. `getManagerDashboard` already builds `annualLeave` and `sickLeave` per
rep (`web-app/20_timeclock.js:1580`), but the only manager-facing render is the
`12 → 11 d` chip on a PENDING time-off card (`web-app/tc/script_manager.html:791`)
and the negative-balance warning in the approve confirm (`:1022`). A manager
therefore sees a balance only when that rep happens to have a request in flight.

### PTO1 — carry the balance on the live-status projection
`liveStatus` (`20_timeclock.js:1620`) is a deliberately narrow projection and does
NOT carry the balance. Add `annualLeave`, `sickLeave` and `ptoEnabled` to it, and
render a balance line on the `.emp-grid` card (`script_manager.html:719`).

**Two constraints, both load-bearing:**
- **Gate on `EMP.PTO_ENABLED`.** The cycle-8 bug showed a contractor a
  `12 → 11 d` projection even though `adjustLeaveBalance_` correctly no-ops for
  them. Same conjunction here: no balance line for a pto-disabled rep — and not a
  zero either, which would read as "used it all" (INV-187 / g114).
- **Never add it to `getTeammateStatus`.** That is the low-privilege peer view
  (**g33**); a balance is manager-tier. The `liveStatus` comment at `:1643` already
  records this reasoning for `timezone` — follow it.

### PTO2 — the balance on the team calendar
The same field on the Manage Time calendar, where the approve decision is actually
made. Reads from PTO1's field, so it is presentation only and carries no second
source of truth.

**Verify:** an editor-suite test that a pto-disabled rep's card carries NO balance
(the presence of the field is not enough — assert the ABSENCE for the disabled
case), plus a Node pin that `getTeammateStatus`'s response shape still has no
leave field, which is the g33 tripwire.

---

## Batch OOP-A — the pricing table and its lookup (OOP1 · OOP2) — M (~5 h)

### OOP1 — register the OOP price table
`KB_DATA_TABLES` (`web-app/00_config.js:1648`) is the allowlist-gated
CSV → named KB tab pattern, built for the insurance payor sheet. Its own comment
says the allowlist IS the security boundary and that adding an entry is "a
deliberate code change beside the reader that consumes it" — so this is the
intended second entry, not a workaround.

Add an `OopPricing` spec: `tab`, `label`, `describe`, a `nameHeader` regex for the
searched first column (item/product/description), `minCols`. `kbImportDataTable`
(`70_kb.js:765`) then gives us admin gating, a DRY RUN BY DEFAULT, the row/column
caps and the plain-text format set BEFORE the write — which matters here more than
it did for payors: a price like `1/2` or an item code would otherwise be coerced
to a date and handed to a rep reformatted (INV-64).

Extend `kbDataTableSummary_` (`:726`) with the price-column check: warn when the
price column does not parse as currency in most rows. **Warn, do not block** — the
operator owns the file (the `nameHeader` precedent, and INV-186: a check that
false-alarms stops being read).

### OOP2 — the deterministic lookup, on BOTH surfaces
Mirror `searchInsurancePayors` (`70_kb.js:658`): bounded scan of the name column,
top-N fetched full-width, column semantics discovered BY HEADER NAME. Keep its
failure posture verbatim — **a wrong price is a billing error, so the failure mode
is "no match" (visible), never a confident wrong number.**

Surface it in BOTH the Reference tab and the Ctrl/⌘+K drawer — pricing is a
mid-call lookup exactly like the payor check. The insurance lookup does this with
a `-d` id suffix on the drawer copy (`kb/script_kb.html:2430`); follow that shape
rather than inventing a second one.

**One thing the lookup must show that insurance does not:** an "as of" date for
the table. A price with no date is a number a rep will quote; the import already
knows when it ran.

**Verify:** a Node pin on the pure fold (scoring, the top-N bound, unknown headers
passed through verbatim) + an editor-suite gate test, both mirroring the payor
tests that already exist.

---

## Batch OOP-B — the price picker in the external composer (OOP3) — S–M (~3 h)

`CN_EMAIL_TEMPLATES` bodies are plain text with a single `{name}` token
(`00_config.js:266`) — there is no mechanism for a live value. Three routes were
considered; **this batch builds (b)**:

- (a) rep looks it up in the drawer and types the price in. No new machinery, no
  guardrail against a typo'd price reaching a customer.
- **(b) a price picker in the external composer that inserts a formatted line.**
  The number stays server-sourced, which is the entire point of not having reps
  read the sheet. Recommended.
- (c) a real template token (`{oop:ITEM}`). Most elegant, most fragile: a template
  outlives the catalog, and a token that no longer resolves — in an email already
  sent to a customer — is the worst of the three failure modes.

**Two decisions the operator owns before this ships:**
1. **Is a quoted price a commitment?** If yes it needs an effective-date in the
   inserted line and an audit row naming the item and the version quoted. If no,
   the inserted line needs explicit "estimate, subject to change" wording. The
   engineering differs; the answer does not come from the code.
2. **The KB store is PHI-free BY POLICY.** Prices are fine there. A quote tied to a
   patient is not — so the picker inserts into the email body and writes nothing
   patient-linked back to the KB store.

**Verify:** the inserted line is `esc_`-escaped like every other composer field
(**g44** family), and a pin that the picker cannot insert a price the server did
not return.

---

## Batch ELIG — area eligibility (EL1 · EL2) — M–L (~6 h)

The operator adding an **"Area Eligibility" column to the OOP sheet** removes the
blocker that made this a two-project item: the warehouse × item dataset now rides
the pricing table.

**The Reference map already exists** — the ` ```map ` block (2026-08-13, Tier A,
no billing) gives `wh| Name: Address` lines, a "Find nearest" ZIP box,
straight-line distances via `kbMapDistances` (`70_kb.js:1947`) and a lazy keyless
embed (`kb/script_kb.html:1204`). This batch adds the eligibility layer on top; it
does not rebuild the map.

### EL1 — the eligibility grammar, and its fail direction
**g41 governs this**: an operator-maintained source that a DECISION ENGINE reads
needs a shape check, and the fail direction on unreadable data must be CHOSEN
rather than inherited.

**The choice, stated: three states, never two.** ELIGIBLE / NOT ELIGIBLE /
**UNKNOWN**. A blank or unparseable cell is UNKNOWN — it renders as "can't
determine, check manually", and never as eligible. Telling a rep they can serve an
address they cannot is the expensive direction, and a two-state engine has nowhere
to put a typo (**g114** — a value a reader could reach by more than one route must
say which).

**v1 grammar — canonical values, not free text** (the **g42** posture: the intake
controls are engine-safe because the values are canonical):
- `US` / `ALL` — everywhere
- `AZ NV CA` — two-letter state codes, space- or comma-separated
- blank / anything else — UNKNOWN

**A radius form (`<=100mi Phoenix`) is deliberately NOT in v1.** It couples the
pricing sheet to warehouse names that live in an article's `wh|` lines — a
cross-store text dependency with no integrity check. State codes cover the common
case, need no geocode call at all, and prove the shape first. Add the radius in v2,
against a named article, once the state path is in use.

The validator runs at DRY-RUN time in `kbDataTableSummary_`, so the operator sees —
before the write — how many rows parsed, how many are UNKNOWN, and a sample of the
values that did not parse.

### EL2 — the address → eligible-items lookup
Input an address or ZIP; return the items whose eligibility covers it, plus the
UNKNOWN ones listed separately (never silently dropped — INV-169's spirit).

**The state comes from the geocoder, not from string-parsing the address.**
`kbGeocodeOne_` (`70_kb.js:1930`) currently returns `{lat, lng, formatted}`;
extend it to capture `address_components` and read
`administrative_area_level_1`'s short name. Parsing a state out of `formatted` is
brittle and would fail quietly, which is the one failure mode this feature cannot
have.

Distances keep coming from the existing haversine, and the block's existing
warning stays: **straight-line is not drive distance.** If eligibility is ever
contractual, straight-line is the wrong measure — another reason the radius form
waits for v2.

**Quota:** the geocoder is the quota'd Apps Script `Maps` service. The state-code
path needs ONE geocode per lookup (the query), and the warehouse side is already
cached by address hash. Note but do not pre-optimise; the query geocode is
deliberately never stored (it is the patient-adjacent half).

**Verify:** the grammar parser is PURE and Node-pinned, with every branch driven —
`US`, a state list, a mixed-case list, a blank, and a junk value — asserting the
junk and blank cases return UNKNOWN rather than eligible. That assertion is the
whole batch; bite-check it by inverting the default.

---

## What this plan does NOT do

- **No v2 radius eligibility** (EL1 says why).
- **No template token** for prices (OOP-B says why).
- **No change to `getTeammateStatus`** — explicitly out of scope, and PTO2's pin
  exists to keep it that way.
