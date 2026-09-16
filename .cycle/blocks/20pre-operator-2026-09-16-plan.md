# Operator testing round 2026-09-16 — IMPLEMENTATION BATCH PLAN

Five operator items, planned as nine findings in five `/broad-implement`-sized
batches. Ordered by IMPACT then DEPENDENCY: SP first (it is the only actual
defect), then PTO (a daily papercut, no dependencies), then the OOP table —
which OOP-B and ELIG both need before they can exist.

Every finding appears exactly once. Nothing is Deferred.

## Operator decisions, 2026-09-16

1. **A quoted OOP price is a COMMITMENT.** The sheet exists so the agent can
   reference it while processing payment on the call.
2. **The OOP sheet is a SEPARATE spreadsheet**, in the same Workspace as the other
   eight stores.

**These interact, and (1) changed the architecture of (2).** The original OOP1
reused the payor sheet's CSV-upload pattern; a price that is collected on cannot
be served from a copy that lags its source, so OOP1 is now a ninth store read
LIVE. The estimate below is unchanged — the store pattern is well-trodden here and
replaces work the upload path would have needed.

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

## Batch SP2 — voicemail duration gate + transcript snippet (SP4 · SP5) — S (~2 h)

Added 2026-09-16 after the operator supplied two real 8x8 notification bodies.

### SP4 — suppress voicemail cards under `SPANISH_VM_MIN_SECONDS`
An 8x8 A_Q_Spanish voicemail notification carries `Duration: MM:SS` in its body.
A 1-second voicemail is a hang-up and should never become a task.

**It costs no new Gmail read.** `getSpanishInboxPending` already calls
`getPlainBody()` for every voicemail thread to build the snippet
(`51_spanish.js:302-303`, twice — the non-VM loop at `:256` correctly hoists it
once). The gate reads a string already in hand.

**Parse RIGHT-TO-LEFT.** Both samples are under a minute (`00:01`, `00:18`), so
they do not reveal whether 8x8 renders 90s as `01:30` or `00:01:30`. Reading the
LAST group as seconds, the second-to-last as minutes and a third as hours is
correct under either, and needs no sample to settle. (Fail-open covers the rest:
every plausible misparse of a long duration still lands far above the threshold.)

**Fail direction, chosen:** an unparseable duration SHOWS the card. The source is
a VENDOR body — 8x8 can change it in a release note nobody here reads — so the
failure has to be "hang-ups reappear" (annoying), never "voicemails stop
appearing" (a Spanish-speaking patient dropped from the queue). g41, pointed at a
source the operator does not even own.

**TWO counts, not one.** A suppressed card is invisible by definition, so the
list reports `vmSuppressed` (parsed, genuinely short) and `vmUnparsed` (no
Duration found) SEPARATELY, with the threshold named. One count could not tell
"three hang-ups today" from "8x8 changed the format and the parser is dead" —
and the second reads as a quiet day. The g02 class aimed at a filter.

### SP5 — the transcript is the snippet
The 240-char snippet for a voicemail is almost entirely 8x8 boilerplate: the
heading, "Your extension 138 just received…", "Received on: …", "Duration: …"
consume roughly 220 of it, so the rep sees a few words of the transcript at most
— the one part that says what the call is about. Since SP4 already parses the
body, extracting the transcript and using THAT as the snippet is the same line.
Falls back to the existing whole-body snippet when no transcript section exists
(not every voicemail is transcribed), so the change can only add information.

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

### OOP1 — a NINTH store, read LIVE (revised 2026-09-16 by the operator's answers)

**The original plan had this as a `KB_DATA_TABLES` entry — a CSV the operator
uploads into a tab on the KB spreadsheet. The commitment answer kills that
design, and it is worth being explicit about why, because the two operator
answers interact.**

The payor sheet is ADVISORY: an unlisted plan falls through to the TRY rules, and
a copy that lags the source costs a re-check. A price the rep **takes payment on
during the call** is not advisory. Under an upload model the app's copy can lag
the operator's spreadsheet by however long it has been since the last upload, and
the failure mode is a rep quoting — and collecting — a superseded price. Nobody
finds out from the app; they find out from the customer.

So: **read the operator's spreadsheet live.** It already lives in the same
Workspace as the other eight stores, so this is the standard store pattern, not a
new integration.

- Script Property **`OOP_SS_ID`**, **no fallback** — the `getHrDocsSS_` / `getQaSS_`
  posture. An unset property is a friendly not-configured error, never a silent
  read of the wrong sheet. A price lookup that quietly resolves somewhere else is
  the one outcome worse than not working.
- Resolver `getOopSS_`, plus a `_TEST_OVERRIDE_OOP_SS_ID` **that a `_withTestOop_`
  fixture actually assigns** — g119 was written this week about exactly the branch
  that gets declared and never wired, and the new `fixtures:` pin will fail the
  build if this one is added read-only.
- A row in the storage map, a Storage Health entry, and the tz-equals-
  `CONFIG.TIMEZONE` requirement every other store carries. PHI-free by policy,
  same class as KB; retention: kept.
- The sheet should carry an **`EffectiveDate`** column. With a live read the "as
  of" is implicit, but a dispute is reconstructed from what was effective *then*,
  not from what the sheet says today.

Cost of the change: one cross-spreadsheet `openById` per lookup, which is what
every other resolver already does. Cache it the way the payor read is cached, but
**cache SHORT** — a long TTL re-introduces exactly the staleness this design
exists to remove.

**The shape check still applies**, it just moves: the column-semantics-by-header
discovery and the price-parse warning come out of `kbDataTableSummary_` and into
the reader, reported on the lookup rather than at upload time. `KB_DATA_TABLES`
stays untouched — this batch adds no entry to it.

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

**Both decisions are now ANSWERED (operator, 2026-09-16) and they raise the bar
on this batch:**

1. **A quoted price IS a commitment** — the tool exists so the agent can process
   payment on that call. So the inserted line carries the **effective date**, and
   the send writes an **audit row naming the item and the exact price quoted**.
   That row is not bookkeeping: it is the only way to reconstruct what a customer
   was told when they dispute a charge, and the sheet will have moved on by then.
   Follow the `ExternalEmailSent` posture (**g36**) — log the item and price, and
   the recipient DOMAIN only, never the customer's address.
2. **The OOP sheet is its own spreadsheet in the same Workspace** (see OOP1), so
   the picker reads through `getOopSS_` and writes nothing back. It inserts into
   the email body; nothing patient-linked goes near the pricing store.

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

**Where the validator runs, now that OOP1 reads live.** There is no upload step to
validate at, so the parse report moves to a lookup-time summary the operator can
see on demand: how many rows parsed, how many are UNKNOWN, and a sample of the
values that did not parse. Surface it in the Admin tab beside Storage Health —
the operator edits the sheet directly, so they need a way to ask "did my edit
parse?" that does not involve running a patient lookup and eyeballing the result.

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
