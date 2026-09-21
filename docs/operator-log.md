# Operator log

Dated deploy-round entries, moved out of CLAUDE.md by Batch D1 (2026-09-14).
Each says what a round changed for the operator — usually "adds NO operator
state", which is the point: the absence is the record. VERBATIM, in the order
they stood in CLAUDE.md.

**`/sync-docs` appends future rounds HERE, newest-first, directly below this
line** — the `.cycle/HISTORY.md` pattern. CLAUDE.md's Operator State Checklist
keeps the standing state (the storage map, the property inventory and the
per-property entries); this file keeps the history of how it got there.

## 2026-09-18 (R) — Reference: the price and eligibility lookups became one panel

**Adds NO operator state.** No Script Property, no sheet, no tab, no new
permission, no migration. The `OopPricing` and `LocationAcceptance` tabs are
read exactly as before. Ships on the ordinary `clasp push -f` + New-version
deploy.

**What the operator sees.** The Reference landing had three stacked lookups,
which pushed Bookmarks, Recently viewed, Most used and Review due below the
fold. It now has two side by side: **Insurance lookup** on the left,
**OOP price & area eligibility** on the right. The Ctrl/⌘+K drawer carries the
same two, stacked, as before.

The merged panel takes an **Item** and an optional **Address or ZIP**. An item
alone answers with prices and no verdicts; adding an address upgrades those same
rows in place with the two verdicts. A blank item with an address filled still
lists everything, as the eligibility check always did.

**One defect this fixes was live.** For the working day between the 2026-09-16
round and this one, the eligibility check showed only the FIRST price column for
each item — on the real sheet, the pick-up total. An item with pick-up /
with-shipping / with-tech-delivery prices answered a delivery question with the
collect-in-person number and hid the other two. It did not show on the
post-deploy check because the item tried had a single price. The eligibility
rows now show every priced column, labelled, exactly as the price lookup does.

**And one thing that now behaves better than before.** If the address service is
unreachable or the address will not resolve, the panel no longer goes blank: the
prices still render, under a warn-toned line reading "No eligibility verdict —"
followed by the reason the server gave. No verdict is shown when nothing was
checked. With the Item box empty there is nothing to fall back to, so that case
stays a plain error.

**To walk it:** S112, whose Reference steps were rewritten for the one panel,
and S73, which now covers the band at phone width and the field pair in the
drawer on a wide screen.

## 2026-09-18 (after the merge) — the first full editor run of the integration tier

**Adds NO operator state.** Nothing in this round changes a Script Property, a
sheet, a tab or a deploy step, and no production code was touched.

**What happened.** The operator ran `runAllTestsPartA` and `runAllTestsPartB`
against the deployed project. Part A was clean; Part B reported one failure of
122, with the expected-registration line matching, so the suite itself was
intact. This was the first time the integration tier has ever run against the
deployed project, which is the gap cycle 19's reflection named and which let
F-01's red pin count as green.

**The one failure was a test defect, not a product defect.**
`accrualReconcile_topsUpLateData` expected one rep topped up and got zero. An
earlier test in the same execution credits the same test employee for the same
month and clears only the Timesheet afterwards; the AuditLog is append-only and
only swept at the end of the suite, and the accrual ledger reads the HIGHEST
hours per employee and month. So the reconcile test measured the earlier test's
credit instead of its own. The accrual code is unchanged and correct: that
high-water mark is what stops a credited month being credited twice.

**What an operator should take from it.** Nothing about PTO balances is in
doubt. The accrual job, its reconcile pass and its ledger behaved exactly as
designed throughout. The ONLY thing that was wrong was a test's starting
assumption. If you had been about to hand-check a rep's balance because of this
failure, you do not need to.

**One thing to re-run.** After the next `clasp push -f`, run
`runAllTestsPartB` once more. Expect that test to pass and the other 121 to be
unaffected, since only that one test body changed.

## 2026-09-18 (final) — Batch 7 of the cycle-20 scan: test and docs hygiene

**Adds NO operator state.** No Script Property, no sheet, no tab, no migration,
no deploy step beyond the usual push and New version. Two things an operator
will nevertheless SEE after the deploy, and one number in the docs that moved.

**The manager live-status sparkline gained a third bar.** A day the server
could not measure — the rep is still clocked in at the moment you open the
page, or one of their stamps would not parse — now draws as a hatched
full-height bar reading "no data" instead of the flat zero bar it used to
share with a genuine day off. The total under the bars counts only the days it
could measure and carries a `·N?` suffix saying how many it could not. Nothing
about the underlying punches changed; the card had been reporting "0 hours
worked" about days it had no hours for.

**The Spanish Inbox stats card counts voicemails now, so its numbers move.**
8x8 mails each member's individual inbox rather than the group address, so the
card had been counting none of them while the list directly below it folded
them in — four pending cards under a card that said three, every day. Resolved,
Pending, Avg time and Median all step as a result, and the step appears
immediately rather than after the cache TTL because the payload change bumped
the cache key. The head note now names how many voicemails are in the figures
and how many short ones the duration gate hid, and it says "voicemails not
counted — fold not configured" rather than a zero when `SPANISH_VM_SENDER` and
`SPANISH_VM_SUBJECT_FILTER` are unset. **If you have been watching
`vmSuppressed`, expect it to tick up:** the gate now runs before the resolution
check, so it counts a short voicemail even when someone later resolved it, and
its meaning is "hang-ups hidden from both surfaces".

**"Manager-gated" was wrong in twenty-one places, and the endpoint count with
it.** Nineteen endpoints that the docs described as manager-gated in fact
enforce `isAdmin`: every Admin-tab surface — Storage Health, Automation Health,
Deploy readiness, the retention and feature-flag saves, the department-email and
tax-rate saves, the tag taxonomy and its rename/merge/archive actions, the
compliance audit search, the KB Doc converter. **A manager who is not also in
`ADMIN_EMAILS` is refused by all of them.** That matters when sizing
`ADMIN_EMAILS`, which is what INV-31 is read for. In the same pass the
"Manager-gated endpoints" figure in the running-totals block went from 61 to 95,
because it had been counting one refusal message and missing every endpoint
gated by `assertManagerCaller_` — the trigger handlers among them — and a new
row was added for the QA tier. The figures are derived from the code in three
families now, so none of them can drift again.

Nothing else here reaches an operator: the linter stopped pre-approving six
Google advanced services the project does not enable, a test seam moved out of
production code, the CDR metrics cache stopped leaking between fixture runs and
real reads on the dev instance, the queue-inventory panel stopped warning
"possibly incomplete" on every run, and four test pins were rewritten to check
the behaviour they were named for.

## 2026-09-18 (last) — Batch 6 of the cycle-20 scan: shell, accessibility and copy

Adds NO Script Property and no sheet change; every fix is client-side. What an
operator notices after the push + New version: (1) when the app fails to load,
the **Retry** button on the "Couldn't Load" screen actually reloads the app —
it used to refetch the sandboxed inner frame and paint blank, so the only way
out was the browser's own reload; (2) the five Time Clock dialogs (Adjust, Day
Detail, Day Edit, Export, Manager Time-Off) and the Call Notes shortcuts
dialog now move focus into themselves on open and hand it back to the button
you pressed on close — keyboard users stop landing at the top of the page
after every close; (3) **Manage → Admin → Overview's KPI strip now reports the
TEAM**: the first cell is every enrolled rep's notes all-time (expect a much
larger number than the week-of-your-own-notes it used to show) and Unresolved
is the cross-rep count, with each cell captioned with its own scope; if a rep's
Notes Sheet cannot be read it says `≥ N` rather than a confident total; (4) the
**ADP export dialog stays open** on success and shows an "Open the export
sheet" link — if your browser blocks the new tab the URL is still there, where
before it was lost and you had to regenerate; (5) pressing **Pop out** with
pop-ups blocked now tells you so and names the remedy (it was silent); (6) on
the public form, the five collapsible sections announce whether they are open;
(7) the Reference drawer announces itself and returns focus to the field you
opened it from; (8) two labels stopped lying — the quick-chip row says "all
time" (its counts always did) and a training thread you read as a manager says
"Rep", not "You". Registrations unchanged at 337.

## 2026-09-18 (later still) — Batch 5 of the cycle-20 scan: access boundary and data integrity

Adds NO Script Property you must set, but makes ONE worth setting visible.
What an operator notices after the push + New version: (1) Manage → Admin →
System's Storage inventory gains a **Dept Requests (PHI-adjacent)** row, and
it WARNS while `DEPT_REQUESTS_SS_ID` is unset — the tracker's rows have named
a patient since 2026-09-10 (the `PatientTrx` column) and by default they sit
on the ADP/payroll sheet; set the property to the Intake spreadsheet's id to
move new rows onto the PHI store (existing rows stay put, and nothing reads
them afterwards, so move or leave them as you prefer); (2) QA: attributing a
recording now stores the agent's roster ID beside the name, and My Reviews
matches on that — if two roster rows share a name, attribution stores no id
and neither agent sees the review, which is the point; re-attribute anything
shared before this deploy whose agent's name is duplicated; (3) the QA
coverage table's Grant/Revoke exemption buttons work for an agent whose name
carries an apostrophe (they threw silently before); (4) a tag rename or merge
that cannot open a rep's Notes Sheet now says so — a warning naming the rep,
and `skipped=<n> (<ids>)` in the audit row — instead of reporting success
while that rep's notes keep the old tag; (5) an Employee Doc with no integrity
hash on record (a hand-entered row, never an app-issued one) is REFUSED at
signing with the reason, and Verify says "Integrity NOT verified" instead of a
reassuring "legacy row" note; (6) an OopPricing Area Eligibility cell that
names a state beside a radius ("TX, 100 miles of Dallas") reads UNKNOWN in the
diagnostics — split the cell, or accept unknown; a warehouse's own state
("100 miles of the Dallas TX warehouse") is unaffected; (7) intake emails are
unchanged for an English completion — the labels now come from the server, so
a Spanish completion is English whatever the client sends. Registrations
unchanged at 337.

## 2026-09-18 (later) — Batch 4 of the cycle-20 scan: automation liveness and accrual diagnostics

Adds NO Script Property to set and no sheet change; three auto-managed
properties grow. What an operator notices after the push + New version: (1)
Manage → Admin → System → Automation detail lists three more heartbeats —
"Daily missed-punch alerts" (8am), "Daily ADP export check" (12pm) and
"Automation-health failure digest" (9am) — reading "no heartbeat recorded yet"
until each has run once, then stale past 26h; a dead trigger for any of them
is now a finding, and a payroll export that silently never went out is no
longer possible without one; (2) a stamped job failure on the Admin card shows
its MESSAGE (every one had read "unknown error"); (3) a rep credited for two
or more months at once gets one `PtoAccrualCredit` row per month, and the
balance moves by exactly what `previewPtoAccruals` predicted; (4) switching
`enablePtoTracking` off no longer leaves last month's shortfall alarming; (5)
a fresh deployment's team calendar renders before the first time-off request;
(6) a killed test run no longer leaves a test address in `MANAGER_EMAILS` or
TEST_ rows on the DeptRequests / ClientErrors tabs — `cleanupTestData` sweeps
both by key. Registrations unchanged at 337. Walk S107 once with a rep two
months behind, and S9 to see the heartbeat land.

## 2026-09-18 — Batch 3 of the cycle-20 scan (H1/H2 follow-through), the editor-test fix, and cycle 19's last reflection

Adds NO Script Property and no sheet change. What an operator notices after
the push + New version: (1) both Metrics heroes say where the answer target
comes from — "target 92% · from the Dashboard Standards tab" — and when there
is none, WHY (a missing row in muted text; an unreadable tab as a warning);
(2) Manage → Admin → System's CDR Report row gained a chevron whose detail
states which holiday calendar and which answer standard are LIVE, with a
finding for every fallback state — on a normal deployment two more ok facts,
otherwise the first place a federal-list fallback or a missing standard has
ever been visible; (3) a standard published WITHOUT an Amber Band tones one
point under the target RED on the team table and the Dashboard card alike
(the card used to say amber); (4) the manager sidebar badge now judges the
previous WORKDAY — it can fire on a Monday (Friday's rate) and the morning
after a holiday, two mornings it was silent — and its tooltip names the
Dashboard Standards target instead of a literal 85; (5) a window with nothing
answered or missed shows a dash, not 0%; (6) the time-off legend, conflict
card and manager chips read "Company holiday". Registrations unchanged at 337;
one editor test corrected (`test_teamBenchmark_subtractsPublishedExcludes`
expected 85.7 where the formula has rounded whole since H2 — it had never
run). Walk S111 step 5 and S110 step 5 (the two new findings) with the batch.
Cycle 19 is fully reflected (`19-e`: the H1–H3 round, net 5 − 2 = 3 — the two
new failure modes H2 shipped are exactly what this batch closed).

## 2026-09-17 (later still) — the cycle-20 /broad-scan, Batches 1 and 2

Adds NO Script Property and no sheet change. Fourteen fixes from the scan, all
in code; what an operator notices after the push + New version: (1) a quoted
price SENDS again from the external composer on the real `OopPricing` sheet
(every quoted send had been refused as "no longer lists" since OOP-C, because
the verifier still keyed column A); (2) the eligibility check finds an item by
NAME; (3) the Scheduled-reminders and Scratchpad modals CLOSE (Close, Escape,
backdrop had all been dead since 2026-09-02); (4) an equal Clock In / Clock
Out is zero hours, not a 24-hour day — run the sheet doctor once and read
"inverted pairs" for any such day that was paying 24 h, then Day Edit it; Day
Edit refuses an equal pair by name and its Save waits for the punches to load;
(5) a failed read no longer looks like data on the Dashboard carousels, the
coverage chip, the Needs-you notes row, the composer's department list, the
Intake Sent viewer (an untouched toggle is N/A, not "No"), the Reference
landing's manager blocks, the "Was this helpful?" bar, and the eligibility /
map geocoder (a quota or outage says "the address service could not be
reached", not "wrong address"). Walk S112 (OOP, renumbered from the duplicate
S110) first, then S7's two new steps, then S113 (the two modals). Registrations
337 (one new smoke test); read the count off the run.

## 2026-09-17 (later) — H2: one answer rate, one standard, shared with the Department Dashboard

Adds NO Script Property that must be set (`CDR_DASHBOARD_DEPT` is an optional
override of the CONFIG seed `CSR`). RETIRES `CDR_ALERT_THRESHOLD`. Answer % is
now the dashboard's `answered / (answered + missed)` (it divided by rung, a
different number whenever a leg carried a third disposition), and the target
line, the table band, the Clock KPI tone and the manager sidebar badge all
judge against the dashboard's PUBLISHED per-dept standard (its new `Dashboard
Standards` tab in the CDR Report workbook — for CSR that is 92 with a 2-pt
amber band, not 85 with a 50-floor), while the anonymized team benchmark
subtracts the dashboard's Team Avg Excludes. Operator steps: none here; on the
dashboard side, re-run `setup()` (creates + publishes the tab) — until then
this app shows NO target line, tone or badge rather than the old 85. Every
rate-carrying cache key bumped, so the first load after the deploy recomputes.

## 2026-09-17 — H1: one holiday calendar, shared with the Department Dashboard

Adds NO Script Property. The `call-data-reporting` repo now publishes its
company-holiday list as a `Company Holidays` tab in the CDR Report workbook
(its `setup()` creates it), and this app reads that tab through
`getCompanyHolidays_` — the accessor every business-day walk now uses in place
of the hard-coded US-federal list, which survives only as the fail-open when
the tab is absent, empty or unreadable. Operator steps: none here; on the
dashboard side, re-run `setup()`, move the dates from the old
`COMPANY_HOLIDAYS` property into the tab, clear the property. Until the tab
holds a row this app behaves exactly as before (federal list). The Metrics
"previous workday" walk and the 30-day trend axes are the visible change: the
morning after a company holiday, "Yesterday" is the last real workday.

## 2026-09-16 (late) — the REAL OopPricing shape (OOP-C)

The operator supplied their actual header row after the round had merged.
Running it through the live reader found the feature **did not work against it**
— found before the deploy, not after.

  `HCPCS | Category | Item | Image | OOP Price | Shipping | Pick-Up Cost |`
  `W/ Shipping Cost | W/ Tech Delivery Cost | Area Eligibility | Comments |`
  `EffectiveDate`

  (**`Pick-Up Cost` was dropped 2026-09-17** — it was always equal to
  `OOP Price`, existing to show that collecting from the warehouse costs no
  extra. Two columns that must stay equal is an invariant the spreadsheet cannot
  enforce, and the day they diverge the picker offers a rep two different
  correct prices for one item. The distinction belongs in the header wording,
  which is what the customer reads.)

**Adds NO operator state** — it makes the reader match the sheet the operator
already built. Three things changed for them:

1. **Searching by product name works.** The reader had assumed column A is the
   item; theirs is the billing code, with the item in column C. Every name
   search scored zero and rendered the deliberate "not in the sheet — do not
   quote a similar item" refusal about an item that WAS in the sheet. The name
   column is now found by header, column A kept only as the fallback, and the
   search matches the item name OR the HCPCS code so a rep can use whichever the
   customer gave them.
2. **The quote names the item, not the billing code.** The composer would have
   inserted `K0800 (C/C) — $920.00` into a customer email.
3. **The picker offers one labelled Insert per priced column.** The sheet
   carries pick-up / with-shipping / with-tech-delivery totals, all correct for
   different fulfilments, and the reader was quoting the leftmost — a $150
   shortfall for any customer whose item ships. The inserted line now names
   which: `Drive Scout 3 Wheel (W/ Shipping Cost) — $1,070.00 (price effective
   09/16/2026)`. A component column (a bare `Shipping`) matches no price stem
   and stays a detail; an `Image` column is dropped rather than rendered beside
   a price.

**And a gap in the diagnostics.** Against this sheet the panel reported
`missing: []` and read CLEAN while every lookup returned nothing — the one
assumption that was wrong was the one it never showed. It now reports the name
column and whether it was FOUND by header or fallen back to.

## 2026-09-16 — OOP pricing, the price picker, area eligibility, and the store move

The back half of the same testing round (`OOP-A`, `OOP-B`, `ELIG`), plus a
same-day store move the operator asked for once it had shipped. Blocks:
`.cycle/blocks/20pre-OOP-broad-implement.md`.

**Operator state ADDED — two tabs in the KB spreadsheet, and no new Script
Property.** Full schemas in the Operator State Checklist's
`OopPricing` / `LocationAcceptance` entry; the short version:

- **`OopPricing`** — item name in column A, then `Price`, `Area Eligibility` and
  `EffectiveDate` matched BY HEADER STEM (reorder freely; unrecognised columns
  are shown verbatim beside the result rather than dropped).
- **`LocationAcceptance`** — `Type` / `Name` / `Address` / `State` / `Accepts` /
  `Notes`. `warehouse` rows carry the word you write in `Area Eligibility` plus
  a **full street address** (it gets geocoded); `city` rows carry a POV/scooter
  delivery city. Both are read on every eligibility check.

**Operator state REMOVED:** `OOP_SS_ID` and `TEST_OOP_SS_ID` — both can be
deleted; nothing reads them. The tables shipped that morning as a NINTH
spreadsheet and moved into the KB store the same afternoon, so the property
never outlived the day. **Nine stores became eight.**

**Two things the operator must actually do, and why each matters:**

1. **Put a REAL STREET ADDRESS on every warehouse row.** A bare city name
   geocodes to the city CENTRE, so a warehouse twenty miles out of town measures
   every distance from downtown and a near-boundary radius verdict is wrong by up
   to twenty miles — in the permissive direction. The registry that shipped
   in the morning had a CONFIG seed of exactly that shape and it was removed the
   same day for exactly this reason (g122); the operator can reintroduce it by
   hand in one cell.
2. **Read Manage → Admin → the OOP pricing diagnostics ONCE after deploying.**
   It lists every `Area Eligibility` value the parser could not read, BY ITEM,
   plus the warehouse registry and any addressless or unreadable location row.
   An unreadable value renders "cannot tell" on the rep's screen, which reads
   like caution rather than like a typo — this panel is the only place the
   difference is visible.

**What the round changed for a rep.** The Reference landing and the Ctrl/⌘+K
drawer each gained an OOP price lookup and an area-eligibility check; the Call
Notes external email composer gained a price picker whose number is re-verified
against the live sheet at SEND time and refuses the send if the price moved, the
item vanished, the price was blanked, or the inserted line was hand-edited (a
line the rep DELETED sends normally and audits nothing). Eligibility answers
twice per item — through insurance and paying out of pocket — because the sheet's
column states the insurance rule and paying OOP lifts a state limit but not a
delivery radius.

**What it did NOT change.** The `ExternalEmailSent` audit row still carries the
recipient DOMAIN only; the quoted item and exact price were added beside it, and
g36's minimization is not relaxed by a quote being commercially significant.

## 2026-09-16 — operator testing round (Spanish Inbox · manager PTO visibility)

Five items from a testing pass, planned as nine findings in five batches
(`.cycle/blocks/20pre-operator-2026-09-16-plan.md`). Three shipped this round;
OOP-A, OOP-B and ELIG remain.

**Adds ONE piece of operator state:** Script Property `SPANISH_VM_MIN_SECONDS`
(optional — CONFIG seeds 5, so the gate is on at deploy with no action; set `0`
to disable). Its entry is in the checklist. Everything else here is behaviour.

**What changed for you:**

- **Spanish Inbox — "Mark resolved" now updates the list.** The Auto-assign
  button's unclaimed count, the "Pending · N" header and the cached list were
  all stale after a manual resolve; the card also came back on re-entry. The
  card now dims while the request is in flight and fades out, and Expand /
  Collapse is a chevron rather than the words.
- **Spanish Inbox — 8x8 hang-ups no longer become tasks.** A voicemail under
  the threshold is suppressed, and **what was suppressed is stated on the
  Pending header**, with a separate warning-toned count for voicemails whose
  duration could not be read (those are SHOWN, never hidden). If that second
  number starts climbing, 8x8 has changed its email format. **Auto-assign
  inherits the gate**, so the hourly job will assign fewer requests than before
  by however many hang-ups the window holds — expected, not a fault.
- **Spanish Inbox — a voicemail card now shows the TRANSCRIPT.** It used to
  show the first 240 characters of the 8x8 body, roughly 220 of which were
  boilerplate, so the message itself was cut off just as it began.
- **Manage → a rep's PTO balance is visible without a pending request.** It
  shows on the live-status card and on the team-calendar off chip, where the
  approve decision is made. A rep with PTO tracking off shows NO balance rather
  than a zero — a zero would read as "used it all".

**Deploy:** `clasp push -f` + a New version deployment. Nothing here is
retroactive and nothing writes to a store, so there is no migration.

Some CONFIG constants and caps are documented ONLY here, in the round that
introduced them. The checklist's inventory names every operator-SETTABLE one;
the rest are code-only tuning values that live with their round.

- **The daily open-punch check (2026-09-15) — ONE new auto-managed Script
  Property, and the trigger count does NOT change.** `checkOpenPunches` runs at
  8am manager-tz and reports every rep with a day the Timesheet cannot turn into
  hours. It is the PREVENTION half of the accrual work: the reconcile pass
  recovers the PTO after a day is fixed, this tells you the day is broken while
  it still can be.

  **Where you will see it.** Manage → Admin → System, and the 9am automation-health
  email — the scan sends no mail itself, it stamps at 8am and the existing digest
  reads the stamp an hour later. A finding names the rep, the day count and the
  window it checked.

  **What it will NOT tell you, on purpose.** A day from today or yesterday (a rep
  mid-shift is not a defect, and the PH team is twelve hours ahead of the manager
  anchor). And a day older than `CONFIG.ADJUST_WINDOW_DAYS` (30) — past that both
  the Day Edit range apply and the adjustment queue refuse the date, so the fix
  the finding implies no longer exists. Days within a week of crossing that line
  get their own sharper line, which is your cue to act.

  **The trigger count is unchanged (still what `installAutomationTriggers`
  reports).** `sendCallNotesUrgentDigest` moved out of its own standalone trigger
  into a new `runDailyChecks` group beside the scan. **Re-run
  `installAutomationTriggers` after the push** — it removes the old standalone
  trigger by itself (the retired list is derived), but until you do, the scan has
  nothing to run it.

  **`OPEN_PUNCH_CHECK`** — auto-managed, written by the scan, read by the health
  panel. Delete it to clear a stale flag; never set it by hand. A scan that
  FAILS stamps the failure, so an empty finding list is never a clean board.

- **The accrual reconciles late data (2026-09-15) — ONE new auto-managed Script
  Property, nothing to set.** `creditMonthlyPtoAccruals` now re-values the last
  three completed months on every run and credits the difference, so a
  missing-punch adjustment approved after the month closed is no longer lost
  behind the column-R stamp.

  **What you will see change.** A month that gains hours after it was credited
  produces a SECOND `PtoAccrualCredit` audit row naming itself `TOP-UP +N
  day(s)` and saying what changed — that is the system working, not a fault.
  `previewPtoAccruals` gained a Reconcile section listing what the next run
  would top up. Admin → Automation Health gained findings for the things the
  pass deliberately will NOT fix: a month that now reads FEWER hours than were
  credited (reported, never clawed back — look for a deleted punch), a month it
  could not value, a ledger read that hit its row cap, and days still lacking a
  usable clock-in/clock-out pair.

  **`PTO_ACCRUAL_RECONCILE`** — auto-managed, written by the credit, read by the
  health panel. Delete it to clear a stale flag; never set it by hand.
  **`PTO_ACCRUAL_RECONCILE_MONTHS`** (3) is a CODE constant, not a property:
  widening it costs nothing at read time (the range index reads the whole tab
  regardless) and only lengthens the in-memory per-month slicing.

  **One thing to know about the ledger.** "What has already been credited" is
  read back from the `PtoAccrualCredit` audit rows themselves — there is no
  separate ledger tab. So those rows are now load-bearing: do not hand-edit or
  delete a `PtoAccrualCredit` row's Notes cell. Deleting one does not
  over-credit silently — the pass fails closed and reports — but editing the
  `hoursWorked=` figure in one would change what the next run believes was paid.

- **`previewPtoAccrualsLastMonth` — the one-click form of the inspection
  (2026-09-15, same day).** The Apps Script editor's ▶ Run button calls the
  selected function with NO arguments, so `previewPtoAccruals('2026-08')` could
  not be run from the picker at all: the inspect form shipped unreachable from
  the only place it is used. Pick `previewPtoAccrualsLastMonth` instead — it
  inspects the previous completed month, which is the recurring question. For
  an older month, paste a scratch function into the editor
  (`function q(){ previewPtoAccruals('2026-05'); }`), run it, and delete it —
  it is not in the repo, so the next `clasp push -f` removes it anyway. Adds NO
  operator state.

- **The accrual dry run gains an INSPECT month (2026-09-15) — still NO new
  operator state.** `previewPtoAccruals('2026-08')` reports what one COMPLETED
  month is worth on the Timesheet as it reads now, ignoring the column-R stamp.

  **Why, one day after the preview shipped.** The first live run read:

  ```
  Timesheet read: none needed — no rep owes a completed month.
    · Anne Garcia [PH0001] — nothing owed (column R already 2026-08).
    · Margie Ingay [PH0002] — nothing owed (column R already 2026-08).
    · Julienne Inaanuran [PH0003] — nothing owed (column R already 2026-08).
  ```

  Correct, and useless. The stamp closes a month permanently, so the month you
  want to look at is always one the owed-months report cannot see — a
  forward-looking tool answering a backward-looking question. Inspect mode is
  the missing half.

  **Reading an inspection.** It ignores the stamp, so it says so: the header
  names the month, a line states column R was IGNORED, each rep the stamp has
  already settled is marked SETTLED with the rewind remedy beside it, and the
  total is phrased as a valuation ("Total 2026-08 is WORTH") with no
  "re-run creditMonthlyPtoAccruals" suggestion — because for a settled month
  running the credit would do nothing at all.

  **Two refusals.** A malformed month (`2026-13`, `2026-8`, `August`) and the
  CURRENT month are both refused outright with nothing read. The current-month
  refusal matters: the accrual rule is in arrears, so a partial month reports
  real hours that are simply not all of them, and an operator would act on the
  smaller number.

  **The August 2026 finding this came from.** All three PH reps were credited
  ZERO for August on the 2026-09-01 run — two with incomplete days (2 and 4),
  one with none at all — while the Timesheet now shows complete days for them,
  assembled from `ADJ-` rows that the missing-punch approval flow writes. The
  working hypothesis is a TIMING one rather than a defect: at 6pm on Sep 1 those
  days were still open (clock-in, no clock-out), the credit correctly declined
  to count them, the stamp advanced, and the adjustments were approved
  afterwards. Inspect mode is how that gets confirmed or refuted — and if
  confirmed, the remedy is the documented rewind of column R.

- **The PTO accrual dry run (`previewPtoAccruals`, 2026-09-14) adds NO new
  operator state** — no Script Property, no trigger, no roster column, no
  migration. It is a manager-gated, read-only function you run from the Apps
  Script editor; the summary lands in the execution log. What it changes is the
  question you can answer: for every accruing rep it prints the months owed,
  the hours the Timesheet actually yields for them, the days NOT counted and
  why, and the credit that would land tonight — sharing `planPtoAccrualRun_`
  with the real job, so it is a prediction rather than a second opinion.

  **The round it came from.** Admin → Automation Health showed a live
  `PtoAccrualCredit` row reading `hoursWorked=0; rate=3.08/80h; days=0;
  months=2026-08; through=2026-08; no worked hours in the period`. That sentence
  covered three unrelated situations — a genuine month off, no Timesheet rows at
  all under that employee id, or punches that never formed a complete
  clock-in/clock-out pair — and column R had already advanced past the month, so
  the daily job would never retry it. Three changes came out of it, all
  additive: the zero audit row now NAMES which of the three it saw (and, in the
  "no rows" case, the employee id it looked for); a clock-OUT with no clock-in
  is now COUNTED and reported instead of being skipped without trace; and the
  preview answers the same question before the job runs rather than after.

  **Running it:** Apps Script editor → pick `previewPtoAccruals` → ▶, and read
  the execution log. It is safe on prod — it takes no ScriptLock and writes
  nothing — but note the flip side: a preview taken WHILE the 18:00 credit is
  running can read half-applied state, so treat the job's audit rows as the
  record. See the column-R entry in the Operator State Checklist for how to
  re-credit a month that was wrongly zero.

- **The 2026-06 redesign + deferred follow-ons #1–#4 + niceties #8–#10
  add NO new operator state** — no new Script Properties, no new triggers,
  no migrations. The new endpoints (`getMyMetricsRange`,
  `getMyNoteHourBuckets`) read existing stores. It deploys with the normal
  single `clasp push -f` + New version. The redesign record (per-commit
  scope, before/after) is
  `docs/design_handoff_team_tools_redesign/IMPLEMENTATION_PLAN.md`.
- **The 2026-08-06 operator rounds (pop-out fit, Spanish combined view, Dept
  Requests rebuild + dept filter) AND the metrics improvements #1–#10 add NO
  new operator state** — no Script Properties, triggers, migrations, or new
  CONFIG constants (`SPANISH_OVERDUE_HOURS`=24 is a client-code constant);
  every new server field is ADDITIVE and client-guarded, so deploy skew in
  either direction renders as before. Behaviour changes to expect post-deploy:
  (a) the Team Metrics green band now starts at `CDR_ALERT_THRESHOLD` (85) —
  reps at 80–84.9% turn AMBER; that is the #4 alignment with the sidebar
  alert, not a data change; (b) multi-day team ranges show a per-day
  sparkline; (c) the raw date inputs on both Metrics tabs live behind a
  "Custom…" chip; (d) the two CDR reference lists are folded behind "Match
  diagnostics (N)"; (e) the Spanish Inbox and Dept Requests tabs render ONE
  combined color-coded status list each (green resolved / amber pending /
  red overdue) instead of separate sections; (f) the Call Notes pop-out
  self-sizes on launch so the whole template is visible. The round-2
  follow-ups add two more, still with NO operator state: (g) the Dashboard
  Team/Department card now shows the team aggregate at ANY cohort (the N=3
  hide dropped by operator decision — `dash_metrics_v2` cache bump, so the
  change is visible within 5 minutes of deploy; the My Stats anonymized
  series guard is unchanged); (h) filter/tab switches on Dept Requests,
  Spanish Inbox, and the Team Metrics scope switcher play a brief staggered
  fade+rise (reduced-motion-safe). **Post-deploy: run `runAllTests()`** as
  usual.
- **The team-member onboarding flow (2026-08-07) adds NO new operator state** —
  no Script Properties, triggers, migrations, or CONFIG constants; it WRITES
  the existing stores (a validated Employees-sheet append; the same Call Notes
  provisioning the Enrollment panel already runs). Two NEW audit actions
  appear in the AuditLog (`EmployeeAdd`, `EmployeeOffboard` — neutral-toned in
  the admin sheet viewer). Post-deploy: adding the first pilot rep THROUGH the
  panel doubles as the S75 verification walk; the gate cases run with the
  standing `runAllTests()`.
- **The 2026-08-11 pilot-feedback round (reminders, onboarding-panel split,
  pop-out header) adds NO new operator state** — no Script Properties,
  triggers, migrations, or CONFIG constants. It adds ONE admin-gated endpoint
  (`getOnboardingCdrReadiness`, joining the INV-136 admin tier) and one
  per-browser localStorage key (`umsNotify`). Behaviour changes to expect
  post-deploy: (a) the Admin → Config **Team Members** panel appears
  immediately and its "Phone system" chips fill in a moment later — the CDR
  read moved off the panel's critical path, so "checking…" briefly is the fix
  working; (b) the panel's readiness list is an aligned column grid;
  (c) **break reminders now fire on every tab, including the pinned pop-out**,
  with a chime ON BY DEFAULT — the bell in the sidebar (and mobile header)
  turns it off per browser; (d) a new "still clocked in" nudge appears
  5–120 min after a rep's scheduled shift end; (e) the pop-out no longer shows
  the tool-name strip at the top, so its fitted window is ~44px shorter.
  **Desktop notifications are expected to be REFUSED** by most browsers here
  (the app renders in a cross-origin iframe) — the toggle says so and the
  chime + in-app alert still work; there is nothing to configure server-side.
- **The interactive roster block + its Tier 1 views (2026-08-11) add NO new
  operator state** — no Script Properties, triggers, migrations or endpoints;
  it is a new fenced block type in the KB renderer plus its styling. Existing articles are
  unaffected (an ordinary fence still renders `<pre><code>`). To use it: put a
  ` ```roster ` fence in any Reference article, or convert a banded sheet and
  it is emitted for you. **Operator-visible behaviour:** converting a roster
  spreadsheet now produces the INTERACTIVE block rather than static headings —
  reps get a filter box, tag tooltips and click-to-copy, and the whole thing
  works in the Ctrl/⌘+K drawer, which an embedded sheet never did. The block
  also carries Teams / Capabilities / Chart / Flow / Coverage views — note that
  **Coverage reports facts, not a staffing verdict**, so a capability held by
  one person is flagged as a single point of contact and the judgement is left
  to you, and **Chart shows team structure, not reporting lines**, because the
  roster records membership and not who reports to whom.
- **The Sheet→article converter (2026-08-11) adds NO new operator state and NO
  new OAuth scope** — `SpreadsheetApp` is already authorized, so unlike the Doc
  converter there is nothing to re-authorize. It adds ONE admin-gated endpoint
  (`kbConvertDriveSheet`, joining the INV-136 admin tier). Nothing converts
  automatically: a sheet embed gains a **Convert to article** button in the
  Reference reader, and the editor's embed mode converts a pasted Sheet URL —
  both review-before-save, both leaving the Sheet itself untouched. **Operator
  workflow for a spreadsheet you want reps to actually FIND:** embed it as
  today → open it in Reference → Convert to article → read the warnings (they
  name any truncation and any highlight colours whose meaning is not written
  down) → add a legend line → Save. Re-run the same Convert when the sheet
  changes; because it is manual, an article you have since edited by hand is
  never silently overwritten.
- **The branded-email restyle (2026-08-11) adds NO new operator state** — no
  Script Properties, triggers, migrations or CONFIG constants; it changes the
  shared wrapper + `brandedKvRows_` and the options each caller passes. EVERY
  automated notification email changes appearance at once (Time Clock, Payroll,
  Time Off, Training, Employee Docs, Coaching, Call Notes Q&A, the daily brief,
  the digests and the health/self-test pushes) — the dept/Intake/form emails,
  which have their own builders, are untouched. **CORRECTION (2026-08-13):**
  "every" turned out to exclude the three Call Notes digests (EOD / weekly
  Training+Review queues / Urgent), which have their own hand-rolled table
  builder and only joined the branded chrome on 2026-08-13 after an
  email-alignment audit enumerated all 30 `MailApp.sendEmail` sites — the
  items table is kept as the wrapper's `bodyHtml`, tones are warn (EOD) /
  danger (Urgent) / info (queues), and each carries a real
  `safeWebAppUrl_` CTA (`callNotes` for reps, `callNotesManage` for
  managers). Pinned by the digest-chrome Node test. New in the mail: a green CTA
  button on the emails that ask for an action, so the missed-clock-out reminder
  finally links to the app. **Post-deploy: send yourself one** (approve a test
  PTO request, or run `sendDailyMissedPunchAlerts` from the editor) and confirm
  the UMS logo loads in your client — the HTML-email restyle is the one thing
  CI cannot verify, and it is the standing spot-check for any email change.
- **The 2026-08-13 settings/speed round adds NO operator state to set up** —
  no Script Properties, triggers, migrations, or CONFIG constants; two new
  per-browser localStorage keys (`umsTzWarnedDay`, `umsDashMetrics` — count
  now sixteen) and one new server-side CacheService entry
  (`team_metrics_v2:<from>:<to>`, self-managing). **ONE OPERATOR ACTION from
  the 9:30 PM note report: open the Employees sheet and set YOUR OWN row's
  Timezone cell to `America/Chicago`** — a blank cell falls back to
  `CONFIG.TIMEZONE` (Asia/Kolkata), which is why a note logged mid-morning
  CST carried a 9:30 PM (IST) stamp and yesterday's note appeared in today's
  Log. Existing rows keep their as-written stamps; new writes are correct the
  moment the cell is fixed (the roster cache refreshes within 5 min).
  Behaviour changes to expect post-deploy: (a) the sidebar's Theme / Palette /
  Alerts rows are consolidated behind a **Settings gear** (sidebar + mobile
  header) opening a small flyout; (b) admins get a **View as** row in that
  flyout (Me / Manager / Spanish CSR / CSR) — a session-only preview of each
  role's tabs with a blue banner + Exit; data still loads with the admin's
  real access; (c) anyone whose browser timezone disagrees with their roster
  timezone sees a once-a-day sticky warning naming both zones — that is the
  9:30 PM class being surfaced, not a new fault; (d) My Stats / Team Metrics /
  Spanish Inbox re-enters paint instantly from the last load and refresh
  behind the "Refreshing…" pill; Team Metrics is also server-cached ≤5 min
  (org-wide per range); (e) the Dashboard holds its full 4-card layout from
  the first frame (no more Spanish/Requests pop-in), the extras RPCs start in
  parallel with the metrics RPCs, and a same-day reload paints the metric
  cards instantly from the local blob while refreshing in the background.
  **Post-deploy: run `runAllTests()`** as usual.
- **The cycle-18 pre-audit batches 3+4 (2026-08-19) add NO operator state to set
  up, but change ONE operator action and ONE rep-visible behaviour.**
  **ACTION (DONE — operator re-ran it 2026-08-21): re-run
  `installAutomationTriggers()` once** — the PTO accrual credit
  moves from 6am to **18:00** manager-tz (F10; 6am CT is the tail of the offshore
  shift, and on the 1st of the month that run holds the global lock through a
  full Timesheet read — the INV-153 quiet-window reasoning applied to a second
  job). Until it is re-run the old 6am trigger keeps firing: correct, just
  unimproved. **BEHAVIOUR: break reminders and the "you are not clocked in"
  nudge no longer fire on weekends or approved-PTO days** (F2) — they were
  firing with a chime and a sticky toast for any rep who had the app open on a
  day off. The "still clocked in past your shift" nudge deliberately still fires
  every day, since a forgotten Saturday punch is exactly when it matters.
  **OPERATOR ANSWER (2026-08-21): NO rep works Saturdays or Sundays**, so the
  inferred weekend is correct for this roster and the F2 gate has no false
  positives today. The roster still carries no working-days column, so this is a
  fact about the CURRENT team rather than a guarantee — onboarding a
  weekend-working rep would silently cost them their break reminders, and
  closing that needs a per-rep working-days source (the column-O shape).
  Two more rep-visible fixes need nothing from you: the accrual tile's footer no
  longer wraps and now shows planned days beside the month-to-date earning, and
  a department request with a hand-edited Status cell is now read the same way
  by the tracker, the re-send dedupe, the resolve link and the SLA digest.
  **Post-deploy: run `runAllTests()`** as usual.
- **Pilot round 3 + its follow-ons (2026-08-24) add NO operator state to set
  up** — no Script Properties, triggers, migrations, CONFIG constants, OAuth
  scopes, or localStorage keys (the scratchpad is SERVER-backed — that is the
  point), and NO admin-tier endpoints (INV-136's count is unchanged; the six
  new endpoints — `getMyScratchpad`/`saveMyScratchpad`,
  `kbAddComment`/`kbGetComments`/`kbEditComment`/`kbDeleteComment` — are all
  rep-callable). TWO auto-managed tabs appear on first use: **`Scratchpad`**
  (one plain-text-pinned cell in each rep's own Call Notes spreadsheet — the
  per-rep PHI store, since scratch text plausibly names patients; never
  archived/purged) and **`KbComments`** (KB spreadsheet — append-only rows,
  moderation is a soft-delete Status flip, PHI-free by policy like the rest
  of the KB). Behaviour changes to expect post-deploy: (a) a **scratchpad
  fab** joins the bell + ? in the Call Notes header — personal notes that
  follow the rep across devices/windows, autosaved (last write wins, stated
  in the modal); (b) **every Reference article/embed carries a comment
  thread** in BOTH readers (tab + Ctrl/⌘+K drawer) — reps post/edit their
  own comments (edit is author-only; managers can remove any comment), with
  a PHI-free-by-policy reminder on the form; (c) the manager Most-used /
  Review-due rows gain a **comment-count chip** beside the thumbs tallies;
  (d) **ArrowUp/ArrowDown hop between Intake text fields** at a field's
  first/last character (the Call Notes pattern — mid-text arrows and every
  non-text control are untouched). **Post-deploy: run `runAllTests()`** —
  incl. the three new integration tests (`scheduledCalls_flow`,
  `scratchpad_saveReadRoundTrip`, `kb_comments_flow`).
- **The 2026-08-25 operator round (batches 1–6: intake polish, Spanish
  voicemails, insurance lookup, intake amend, note formatting, intake
  analytics) needs ONE operator import and offers two OPTIONAL Script
  Properties.** THE IMPORT: open the KB spreadsheet (`KB_SS_ID`), File →
  Import → the payor-acceptance CSV → "Insert new sheet(s)", and rename the
  tab **exactly `InsurancePayors`** — until it exists the lookup card says
  the tab is missing by name; re-import a fresh copy the same way to update
  (the update flow is import-a-copy by operator decision). The OPTIONAL
  pair: `SPANISH_VM_SENDER` / `SPANISH_VM_SUBJECT_FILTER` override the
  CONFIG defaults (`no-reply@8x8.com` / `via A_Q_Spanish`) without a
  redeploy; blanking either disables the voicemail path. **The import is now
  also possible IN-APP** (the same-day follow-on): Manage → Admin → Config →
  **Reference data tables** takes the CSV directly and replaces the tab, so the
  manual File → Import → rename is only needed for the FIRST import if you
  prefer it. NO new triggers,
  migrations, or OAuth scopes (the KB file-drop's Drive conversion deliberately
  uses the REST endpoint with the token the project already holds, so there is
  no advanced service to enable and nothing for IT to approve — a domain that
  restricts the API costs the CONVERSION, not the feature); one new manager
  endpoint (`getIntakeVolumeStats`), one rep endpoint (`searchInsurancePayors`),
  and three admin endpoints (`getKbDataTables`/`kbImportDataTable`/`kbIngestFile`);
  the intake submission tabs' trailing `AmendsId` column self-heals on
  first use. Behaviour changes to expect post-deploy: (a) clicking a
  selected intake response button now UNSELECTS it; (b) intake submit may
  show a warn-highlighted "strongly recommended" list with Continue
  anyway / Go back — never a hard block; (c) the PPD form ends with an
  optional Additional Notes section; (d) a sent intake submission can be
  amended & re-sent — the recipient gets `AMENDED:` + a banner naming the
  changed fields, and the Sent tab marks the amended/superseded pair;
  (e) A_Q_Spanish voicemail notifications appear as VM-pilled pending
  cards in the Spanish Inbox (manual-resolve-only — they never enter
  response-time stats); (f) Reference + the Ctrl/⌘+K drawer gain the
  insurance payor lookup; (g) `**bold**`/`__underline__`/`==highlight==`
  markers (and Ctrl/⌘+B / U / Shift+H) format note Issue/Resolution text
  in cards + emails — the CRM paste stays plain; (h) My Stats gains an
  "Intake calls" rail row, the Team table an Intake column, and Team
  Metrics a manager-only monthly intake-volume block. **Post-deploy: run
  `runAllTests()`** — incl. the new `insurance_search_requiresEmployee`
  test and the `getIntakeVolumeStats` omnibus gate case.
- **The 2026-08-27 break-schedule editor + QA Phase 2 round adds NO operator
  state to SET UP** — no triggers, migrations, CONFIG constants to choose, or
  new OAuth scopes. TWO Script Properties exist for it, both hands-off:
  `SHIFT_BREAK_SCHEDULES` (auto-managed — written by Manage → Admin → Config →
  **Break schedules**, the answer to "where does the break schedule
  information go?": breaks + the reminder lead are now edited IN-APP with no
  redeploy; `CONFIG.SHIFT_SCHEDULE` stays the seed until the first save, and
  saving everything back to the app default deletes the property again) and
  `QA_SCORECARD_CRITERIA` (optional — JSON `[{key,label}]` overriding the
  seeded five scorecard criteria; unset is fine; prefer adding/removing
  criteria over renaming a key, which orphans old ratings from that column;
  since 2026-08-28 edited in-app via Manage → Admin → Config → QA scorecard
  criteria, so hand-editing the property is no longer needed).
  Behaviour changes to expect post-deploy: (a) the Admin → Config sub-tab
  gains a **Break schedules** card — Default + per-timezone sections,
  inherited sections read-only until Customize, times in each rep's OWN
  timezone; a save reaches reps on their next state refresh (page load, or
  within ~10 minutes in an open window) — **and since 2026-09-02 a
  "Per-agent breaks" section below them** (pick an agent from the roster,
  edit their own slots, Save; Remove falls back to the timezone/default
  list; a warn pill flags an agent whose roster timezone disagrees with the
  CST anchor — fix the roster row, the times are read in that zone). NO new
  operator state: the same `SHIFT_BREAK_SCHEDULES` property gains an
  `employees` key only once you save one; (b) the QA recording detail gains an
  **Agent** field (datalist of roster names — free text allowed for
  ex-agents), a **Scorecard** card (1–5 per criterion + notes; re-saving
  replaces your previous score for that recording), and — where the browser
  can decode the audio — a **waveform** with click-to-seek (a recording it
  cannot decode keeps the plain timeline; nothing is wrong); (c) QA gains a
  second tab, **Stats** — per-agent recordings / reviewed / scorecards /
  averages, where "(unassigned)" counts recordings nobody has attributed yet
  and an em dash means no data, not zero; (d) the detail's **Start review /
  Mark done / Reopen buttons now WORK** — Phase 1 shipped them pointing at a
  wrong handler name (nothing else was affected, and Phase 1 was never
  deployed). **The same day's QA Phase 3 round adds NO operator state
  either** — no properties, triggers, or migrations (the `SharedMs` column
  extends the recordings header in place; QA is merged but undeployed and
  `QA_SS_ID` is unset everywhere, so no live tab exists to migrate).
  Behaviour changes to expect, all Phase 3: (e) ~~every agent now sees the
  QA tool with ONE read-only tab, My Reviews~~ — **SUPERSEDED the next day
  (2026-08-28): the operator hid the QA tool from non-admin/non-QA reps
  again, so agents currently see nothing** (the My Reviews machinery ships
  dormant; see the 2026-08-28 entry below); nothing is shared
  automatically, and agents still cannot reach the queue or stats; (f) the recording detail's
  agent row gains a **Share with agent / Unshare** button — sharing is
  refused until the recording is attributed to its agent, and what the
  agent sees is the scorecards + timestamped comments (no audio);
  (g) the queue toolbar gains **"Sample 3 for me"** — assigns un-reviewed,
  un-assigned recordings to YOU, favoring the least-reviewed agents;
  (h) the Stats tab gains a **Calibration** table (recordings scored by 2+
  reviewers, reviewer averages + spread + widest per-criterion gap —
  facts, not a verdict on who is right). **Post-deploy: run
  `runAllTests()`** — still **295** (the omnibus + QA gate cases grew IN
  PLACE: `saveBreakSchedules` joined the admin set, and the QA case now
  covers 14 endpoints + the `getMyQaReviews` read-shape rejection).
  **The 2026-08-28 round (operator gate change + the Phase-3 follow-ons)
  adds NO operator state to set up** — no new properties, triggers, or
  migrations; `QA_SCORECARD_CRITERIA` already existed and is now
  auto-managed by the new Admin editor (hand-editing still works).
  Behaviour changes to expect: (a) **the QA tool disappears from every
  non-admin/non-QA rep's sidebar** — the operator's "hide for now"; the
  agent-facing My Reviews machinery stays built and dormant, and
  re-opening it is a one-line registry change (drop `managerOnly`/`also`
  from `qaMyReviews` in `script_core.html`'s TOOLS — the comment there
  says so); (b) Manage → Admin → Config gains a **QA scorecard criteria**
  card — add/remove/relabel the 1–5 scorecard criteria with no property
  editing; it WARNS that renaming a key orphans stored ratings (add/remove
  instead), and saving the app-default list exactly clears the override;
  (c) **My Reviews cards gain a Play recording button** — playback of a
  SHARED recording through a scoped endpoint (only the recording's own
  attributed agent, only while shared; unsharing revokes it), currently
  reachable only by QA members/managers because of (a); (d) the visual
  matrix gains the QA recording DETAIL scenario (player + waveform +
  scorecard + comment timeline on camera — the standing gap). The QaScorecards/QaComments retention tier was deferred here
  (a window on review records needs an operator decision) and shipped the
  SAME DAY as default-OFF machinery — see the follow-ons + perf entry
  below: the window choice stays the operator's. **Post-deploy: run `runAllTests()`** —
  still **295** (the omnibus gained `saveQaScorecardCriteria` and the QA
  gate case gained the audio-chunk read-shape rejection, both IN PLACE).
- **The 2026-08-31 punch-adjustment feedback round adds NO operator state** —
  no properties, triggers, migrations, or endpoints (one additive
  `getEmployeeState` field + a client chip + one email). Behaviour changes to
  expect post-deploy: (a) **an approved same-day adjustment now catches up on
  the rep's screen within ~3 minutes** without them reloading — the Clock view
  reconciles on a timer while it is open and visible (nothing polls from other
  tabs); (b) **a rep with a request awaiting approval sees an "Awaiting
  approval · Clock In 08:30" chip directly above their punch buttons**, saying
  the manager still has to approve it and they need not punch again; (c)
  **approving OR denying a punch adjustment now emails the rep** (branded, with
  an Open Time Clock button) — previously the only request type with no
  notification at all, which made a denial look exactly like an approval that
  had not propagated. Time-off decisions already emailed and are unchanged.
  **Post-deploy: run `runAllTests()`** — still **296**.
- **The 2026-08-31 test-coverage round adds NO operator state and changes NO
  app behaviour** — it is tests, fixtures and one doc marker. `runAllTests()`
  gains six cases: four covering the PMD/PAP intake preview + send
  paths (which had no test of any kind, while their PPD sibling was well
  covered) and two covering five small read endpoints that had none. Every
  new case only READS or asserts a refusal — nothing sends mail, writes a row
  or touches Drive — so it is as safe on the live project as the existing
  suite. The visual matrix gains three scenarios (both Intake account forms + Team
  Notes). Nothing to configure; the only operator-visible change is the
  higher expected pass count.
- **The 2026-08-31 business-hours round adds NO operator state** — no
  properties, triggers, migrations, or new CONFIG constants (it REUSES the
  Coverage planner's existing `COVERAGE_BUSINESS_START_HOUR` /
  `COVERAGE_BUSINESS_END_HOUR` / `COVERAGE_WEEKDAYS_ONLY`, so changing the
  business window moves the coverage bands and these figures together — the
  correct coupling). **Behaviour change to expect post-deploy, and it is the
  point of the round: every response-time figure you have been reading will
  get SMALLER.** The Spanish Inbox median/average and the Dept-Request elapsed
  times now count business hours only — weekends, US holidays and after-hours
  are excluded — so a Friday-afternoon request answered at Monday's open reads
  as ~2 hours instead of ~3 days. The wall-clock number is not gone: it is the
  sub-line under each KPI cell and the tooltip on each card, and both surfaces
  carry a one-line note saying what is excluded. **Dept-Request SLA bands move
  with it** — a request that only looked overdue because it sat through a
  weekend will now read on-time, and the daily SLA reminder digest agrees with
  the tracker (before this round they used different arithmetic and could
  disagree). Nothing is recomputed retroactively in any sheet; the stored
  `CreatedAt`/`ResolvedAt` stamps are untouched and only the DERIVED figures
  change. **Post-deploy: run `runAllTests()`** — **305** since the 2026-09-01 Workstream B round (302 after the 2026-08-31 coverage round's four PMD/PAP intake cases + two small-endpoint cases; then `calcHours_multipleBreaks` (A1), `managerSaveDay_multipleBreaks` (A4) and `punchAdjust_resumeConvertsClockOut` (B3)).
- **The 2026-09-01 Workstream B round (adjust prefill, manager notification,
  resume path) adds NO operator state to SET UP** — no Script Properties,
  triggers, migrations, or CONFIG values. ONE auto-managed column appears: a
  trailing **`Action`** on the `PunchAdjustRequests` tab, whose header
  self-heals on first use; an existing row reads `''` and means the ordinary
  punch write. Behaviour changes to expect post-deploy: (a) **you will now be
  emailed when a rep files a punch-adjustment request** — until this round that
  queue told nobody, so a request was seen only if you happened to open Manage
  Time; (b) the shift-complete state's **Adjust** button opens on Clock In,
  the punch that state implies is missing; (c) a rep whose day is closed and
  who is working again gets a **Resume shift** button. Approving it does NOT
  delete their clock-out — it turns that clock-out into a break and ends the
  break at the time they came back, so **the hours they were away are unpaid**.
  That is the deliberate model: deleting the clock-out would have paid the gap
  silently. The queue row, the rep's confirmation and the decision email all say
  so. Denying changes nothing. **A genuine second SHIFT is still not supported**
  — for a rep who works two separate stints on one date, use Day Edit.
  **Post-deploy: run `runAllTests()`** — it adds the new
  `punchAdjust_resumeConvertsClockOut` case; check the run against the count its
  own `Expected:` line prints. (This entry used to carry a figure and warn that
  earlier entries carried stale ones — every round since PR #176 ships on ONE
  deploy, so a per-round number was wrong the moment the next round landed. The
  run derives its own expectation now, and the generated block in the Cycle
  Workflow Config carries the current total.)
- **The 2026-09-04 late round (the English-email fix + five logged follow-ons)
  adds NO operator state** — no Script Properties, triggers, migrations,
  endpoints or CONFIG values. Behaviour changes to expect post-deploy: (a) **an
  intake form completed in Spanish now previews and emails in ENGLISH** — the
  question text, section headers and notes title are always the English bank
  (this fired live the same afternoon: a PPD reached the Power dept in
  Spanish); the answer values were already English, free text stays as typed,
  and the Sent tab still shows which language the agent completed it in; (b)
  **the Metrics trend sparklines (My Stats hero + the five KPI cards, Team
  Metrics single-day and range) plot WORKDAYS only** — the two weekend gaps
  per week are gone and the headings say so; the three endpoint caches were
  bumped so a stale calendar-day payload is never served (up to 5 minutes
  after deploy the OLD shape can still paint); (c) **changing a QA criterion's
  TYPE in the Admin editor asks first** (a danger confirm naming the criteria
  and what old answers will look like); (d) **the QA Log gains an Agent
  filter** beside the search (refetch-free, with an Unattributed bucket); (e)
  the disabled-by-default archive tiers gain a guard against the Sheets
  "cannot delete all non-frozen rows" refusal — invisible while both windows
  are 0; (f) the external customer/provider email bodies and the
  form-submission table now fold CRLF line breaks like the note email does.
  **Post-deploy: run `runAllTests()`** — still **308**; then re-send yourself
  ONE PPD from the Spanish form and confirm the email is English (the one
  check CI cannot make, since the email body is built from the client's rows).
- **The 2026-09-04 QA Log round adds NO operator state** — no Script Properties,
  triggers, migrations, OAuth scopes or CONFIG values; two new QA-tier endpoints
  (`getQaLog`, `qaCreateManualRecording` — the `canSeeQa_` tier, so INV-136's
  admin count is unchanged), one new audit action (`QaManualRecording`,
  id-only), and the existing `QA_SCORECARD_CRITERIA` property gains OPTIONAL
  `type` / `options` fields that the Admin editor writes (an existing property
  blob reads exactly as before — every criterion without a type is a 1–5
  scale). Behaviour changes to expect post-deploy: (a) **QA gains a fourth
  tab, Log** — your audits one entry per recording, newest first, with 7d /
  30d / QTR presets, a search box, and a summary strip; as a manager a
  reviewer picker shows every reviewer's log; (b) **Manage → Admin → Config →
  QA scorecard criteria gains a Type column** — Scale 1–5 / Yes-No / Dropdown
  (comma-separated options; a bare-number option is refused by name — the guard asks `Number()`, so `4.`, `1e0` and `0x5` are refused too) — this is
  where the rubric gets defined; the scorecard form renders a Yes/No pair or a
  dropdown for those criteria, and the Log/detail chips read Yes/No or the
  option text; the Stats averages count ONLY scale answers; (c) **"Log an
  audit"** on the Log tab picks one of your open assignments or, LAST, a
  manual entry with no recording — that mints an in_review recording row
  assigned to you (pilled "no recording", no player) and opens it so the
  scorecard is saved exactly as for a real recording. **Post-deploy: run
  `runAllTests()`** — still **308** (the QA gate case grew IN PLACE to 17
  endpoints).
- **The 2026-09-11 follow-ons round (the diagnostics retention tier + the
  suggestion follow-ons — RT / BP / SA / TW / DR) adds NO operator state to
  SET UP — but re-run `installAutomationTriggers()` ONCE** so the TWENTIETH
  and TWENTY-FIRST triggers exist: `purgeOldDiagnostics` (daily manager-tz 2am)
  and `autoAssignSpanishThreadsScheduled` (hourly). Both are inert until you
  configure them — the purge while `VIEW_USAGE_RETENTION_DAYS` /
  `CLIENT_ERR_RETENTION_DAYS` are 0 (their default; OPTIONAL Script Properties,
  set from Manage → Admin → Config → Retention → "Diagnostics tabs (PHI-free)",
  irreversible per the danger confirm; a large first run drains at 2000 rows
  per night and the `DiagnosticsPurge` audit row says `hitPerRunCap`
  meanwhile), the auto-assign while the `spanishAutoAssign` feature toggle is
  OFF (its default; flip it in Manage → Admin → Feature Toggles once the
  bilingual-members list is set — it heartbeats even while off, so Admin →
  System shows the trigger is alive first; it never consults PTO, like the
  button). NO new OAuth scopes, migrations or CONFIG values to choose. **One
  editor action: run `reportBreakPairingChanges()` once** (read-only,
  MANAGER_EMAILS gate) — `reportMultiBreakDays()` was CLEAN on 2026-09-01 but
  that report cannot see cycle-19 F1's one-leave/two-return shape; this one
  can, and a listed day means the greedy pairing now deducts a break the
  positional one had paid (nothing needs correcting either way). Behaviour
  changes to expect post-deploy: (a) the Retention panel gains the two
  diagnostics rows and the Storage inventory's ADP row names their windows;
  (b) the sheet-doctor card can show an "Unpaired break stamps" list for a
  two-break day with an extra stamp — REPORT-only, Day Edit is the fix — and
  the Manage Time Periodic summary counts them; (c) Admin → System's digest
  heartbeats gain a "Spanish Inbox auto-assign" row; (d) the Dept Requests
  Expand reads one column + one row instead of the whole tab (no visible
  change). **Post-deploy: run `runAllTests()`** — it adds the two new
  trigger-gate cases; check the run against the count its own `Expected:` line prints.
- **The 2026-09-11 trigger-quota round (the operator's `installAutomationTriggers()`
  threw `This script has too many triggers`) adds NO operator state to SET UP —
  but re-run `installAutomationTriggers()` ONCE after the `clasp push`, and
  understand what the failed run left behind.** Apps Script allows 20
  installable triggers per user per script; the follow-ons round had taken the
  installer to 21 and the throw came on the LAST create — AFTER the dedupe loop
  had deleted every existing trigger — so the deployment holds 20 triggers and
  NO `creditMonthlyPtoAccruals` until the re-install (August's credit landed on
  Sept 1; the next is due on/after Oct 1 and the col-R stamp catches up, so
  nothing is lost by re-installing before then, and even a later re-install
  credits in arrears). The re-install on the fixed code deletes all 20 (the
  eight retired standalone triggers included, via `RETIRED_TRIGGER_HANDLERS`)
  and creates SIXTEEN — three dispatchers (`runHourlyJobs`, `runWeeklyDigests`,
  `runNightlyPurges`) plus the thirteen stand-alones — and the confirmation
  email lists each dispatcher's jobs. Behaviour changes to expect: (a) the
  editor's Triggers panel shows 16 rows, not 21, and the eight grouped
  handlers no longer appear there by name; (b) `purgeExpiredFormData` runs at
  2am instead of 3am (inside the purge dispatcher; it no-ops while
  `FORM_DATA_RETENTION_DAYS` is unset); (c) a future install that would
  exceed the quota REFUSES with nothing deleted, naming the foreign triggers
  to remove; (d) if a dispatcher's job ever throws, Admin → System shows it
  under the JOB's name. **Post-deploy: `clasp push -f`, re-run
  `installAutomationTriggers()` once (expect the "16 of the 20" log line),
  then `runAllTests()` — it adds three dispatcher gate tests; check the run
  against the count its own `Expected:` line prints.**
- **Batches S and Q of the post-cycle-19 next-steps plan (2026-09-11) add NO
  operator state — no Script Property, trigger, migration, OAuth scope or CONFIG
  value to choose — but three things change on the deployment.** (a) **The suite
  runbook is now smoke on prod, full on dev nightly**, and `runAllTests` on prod
  is the exception rather than the routine (with `INSTANCE_IS_PROD=true` it
  refuses outright). When a full run must happen mid-shift, `runAllTestsPartA`
  and `runAllTestsPartB` split it across two executions and together are exactly
  `runAllTests` — the point is the ONE project ScriptLock, which a long run makes
  live punches queue behind. Every run now prints `Expected: N registrations`
  DERIVED from the registration list (so no count needs carrying in a doc) and a
  `── Suite environment ──` block naming every deployment setting the outcome
  depends on — read that block FIRST when a run surprises you, because the last
  three surprising runs were all deployment state rather than code. (b) **Every
  Admin config editor now shows the size of what it is about to save** against the
  ~9KB-per-value Script Property cap, and a save past the cap is **REFUSED BY NAME
  with nothing written** instead of throwing an opaque platform error beside an
  audit row claiming it landed. Nothing on this deployment is near the cap today;
  the largest value is `CN_EMAIL_TEMPLATES`. (c) **Admin → System gains a Script
  Properties line** beside Drive and mail routing, stating the store's real usage —
  which is the number this work was reasoning about without being able to see.
  **Post-deploy: `runAllTests()` — check it against the count its own `Expected:` line prints.**
- **The Drive finding is CORRECT and the remedy is REVOKE-then-re-consent
  (operator diagnostic, 2026-09-14).** A mid-Batch-Q follow-on suspected the
  Admin → System Drive finding of being a false positive, because the operator
  redeployed, ran a function in the editor as instructed, and got NO
  re-authorization prompt. The one-paste `driveDiag_` settled it: in a single
  execution `DriveApp.getRootFolder()` failed with the runtime's missing-scope
  refusal AND `driveAccessStatus_()` returned `granted:false` with an empty
  `error` — they agree, so the probe is telling the truth and the scope is
  genuinely absent. **No prompt appears because Apps Script compares the required
  set against a STORED authorization record that can read "authorized" while the
  granted set is short** (granular consent with Drive unticked), so running
  another function will keep doing nothing. Fix it once, as the DEPLOYING account:
  myaccount.google.com → Data & privacy → Third-party apps & services → the script
  → **Remove access**, then run any function in the Apps Script editor and accept
  the consent screen with **every permission ticked**. Until then article images
  stay placeholders, `KB_IMAGES_FOLDER_ID` stays unset (so the `kbGetImageData`
  fallback is inert — it has no folder to scope against), the KB embed-reachability
  check cannot run, and QA recording playback is unavailable.
- **The 2026-09-11 post-push `runAllTests()` read 302/312 — ten `Admin access
  required.` failures — and the cause was OPERATOR STATE, not the round.**
  `ADMIN_EMAILS` is SET on this deployment (the Admin tier narrowed to the
  operator, exactly as the property's own entry invites), and the suite's
  manager fixture was not in it, so every admin-tier call it made was
  CORRECTLY refused: the first failure was test #97 of 312, well before the
  `adminEmails` test at #247, so the property held that value from the start
  (not overlapped-run residue, which the 2026-09-04 self-heal would have
  deleted — it refuses to touch a real address, by design). No commit in #236
  or #237 touched an admin gate, `empIsAdmin_`, `setupTestEnvironment`'s
  self-heal, or the fixture. The fix is suite-only, NO app behaviour change:
  setup appends the test manager to a real list for the run and cleanup
  strips it (the `ADMIN_EMAILS` entry above has the contract). **Post-deploy:
  `clasp push -f` (no New version needed — `Tests.js` runs from the editor),
  then re-run `runAllTests()` ALONE — expect a CLEAN run (zero failures against
  the count its own `Expected:` line prints) — and KEEP `ADMIN_EMAILS` exactly as it is.** The 17-minute runtime says the run was mid-shift (the
  documented ~6-minute quiet-window figure vs ~18 mid-shift); no lock timeout
  fired this time, but the quiet window still applies.
- **The 2026-09-10 operator testing-notes round (Batches A–D, notes 1–10) adds
  NO operator state to SET UP** — no Script Properties to create, no triggers,
  no migrations, no CONFIG values, no OAuth scopes. Three things appear on their
  own: two trailing columns on the `DeptRequests` tab (`ResolvedVia`,
  `PatientTrx` — the header self-heals to 14 wide on first use; existing rows
  read blank), one auto-managed CacheService key family
  (`presence_v1:<empId>`, ~30-min TTL — never a sheet row, never audited), and
  `QA_MEMBERS` becomes editable IN-APP (Manage → Admin → Config → **QA
  reviewers**; the property set by hand still works). Behaviour changes to
  expect post-deploy: (a) **the Dept Requests Avg/Median RESET to "—" until
  email-link resolves accumulate** — only a resolve made through the emailed
  link is timed now; a "Mark resolved" pressed in the app reads "marked in
  app" with no figure, a legacy resolved row (no source recorded) is likewise
  untimed, and the manager table's new "Not timed" column counts both;
  (b) **the Spanish Inbox median/average DROP as manual mark-resolves leave the
  sample** — the strip note names how many were timed vs marked manually, a
  manually-resolved card reads "not timed", and the resolution-share chart
  still counts them (the figures move within 5 minutes — the stats cache key
  was bumped, so a pre-deploy median is never served); (c) **Dept Requests
  cards carry the patient & TRX** in their subject and an Expand button that
  shows the sender's note (a card whose note cannot be read says why — never an
  empty panel); the daily SLA digest and the AuditLog stay label-only, but the
  `DeptRequests` tab itself is no longer PHI-free — an operator decision, the
  store stays inside the Workspace; (d) a manager-only **Auto-assign N
  unclaimed** button beside the Spanish Inbox filter strip hands every
  unclaimed request (voicemails included) to the least-loaded configured
  member, disabled with its reason when there is nothing to do — the scheduled
  version shipped 2026-09-11 as trigger #21 behind the `spanishAutoAssign`
  toggle (default OFF); (e) the Spanish "Show full request" expand
  and the Dept Requests Expand are real toggles that keep their state across a
  re-render; (f) the quiz editor no longer re-renders the whole modal when an
  option is added or removed; (g) the Team Notes Per-Rep "Coach on this"
  button is styled (it had no stylesheet rule); (h) the training-overdue
  digest and the manager brief read "Moderate", never the stored `major`;
  (i) **Team Right Now shows an "active · not clocked in" chip** for a
  teammate who has clicked or typed in the app in the last ~30 minutes but is
  not clocked in ("active · clocked out" after a clock-out) — the shell sends
  ONE `recordPresence` per real user gesture per 10 minutes per window, an
  idle or left-open window sends nothing and a poll never stamps, self is
  never flagged, and the chip's tooltip states the v1 limit: shift hours and
  PTO are NOT checked (gating them is a logged operator decision).
  **Post-deploy: run `runAllTests()`** — it adds
  `test_deptReq_detailScoped` and `test_presence_stampAndFlag` (check it against
  the count its own `Expected:` line prints);
  `test_getTeammateStatus_shapeRestricted` grew in place; the omnibus gained
  `saveQaMembers` on the admin tier and `autoAssignSpanishThreads` on the
  manager tier; `test_deptRequest_resolveLinkIdempotent` now appends a 13-col
  row and asserts `ResolvedVia` through the reader).
- **The 2026-09-09 cycle-19 audit batches (F1–F8) add NO operator state** —
  no Script Properties, triggers, migrations, endpoints, OAuth scopes or
  CONFIG values; one existing property (`MAIL_BCC_ALL`) becomes VISIBLE, which
  is the point of one of the fixes rather than a setup step. FOUR behaviour
  changes to expect post-deploy, and the first two are the ones to know about
  before someone asks. (a) **Computed hours go DOWN on any historical day that
  carried a break stamp the old pairing could not use** — a stray or inverted
  Lunch In used to un-pair the WHOLE day, so the rep was paid for every real
  break they took; the direction is always down, never up, and nothing needs
  correcting (the figures were wrong before and are right after). No existing
  report enumerates the affected days: `reportMultiBreakDays()` compares
  against the last-wins rule, not against the old index-locked pairing, and
  the sheet doctor's inverted-lunch test does not match this shape — the
  `reportBreakPairingChanges()` twin SHIPPED 2026-09-11 (run it once, see the
  Workstream-A entry) and the doctor now reports such days as `unpaired`. (b) **Manage →
  Admin → System gains a mail-routing line, and on a deployment where
  `MAIL_BCC_ALL` is set it is a standing WARNING (BLOCKING if the address is
  off-domain) that was not there yesterday, so the System badge count goes up
  by one.** That is the finding, not a regression: read the line, decide
  whether those copies are still wanted, and clear the property if not — it is
  the only way to learn the live answer, since nothing outside the deployment
  can read Script Properties. (c) On a deployment where a no-fallback store
  (`HR_DOCS_SS_ID`) is deliberately unset, reps STOP seeing "Couldn't check
  coaching, employee docs" under the Dashboard's Needs-you block, and that
  block can now reach its clean-empty state and disappear; Storage Health
  still reports the unset store, which is where an unset store belongs.
  (d) The Needs-you block now updates as soon as a rep finishes something —
  previously a completed item stayed listed for up to two minutes. **Post-deploy:
  run `runAllTests()`** — still **308** (no Tests.js change in any of the four
  batches).
- **The 2026-09-09 Drive-capability round adds NO operator state to set up —
  but it names one you already owe.** No Script Properties, triggers,
  migrations, endpoints or CONFIG values; one auto-managed CacheService entry
  (`drive_access_v1`, 5 min). Behaviour changes to expect post-deploy:
  (a) **Manage → Admin → System now reports Drive** — a line above the
  Storage inventory and a matching finding. On this deployment it will read
  **Drive access not granted (BLOCKING)** until the deploying account
  re-authorizes, because `KB_IMAGES_FOLDER_ID` has never been set and the
  running grant is missing `/auth/drive`; see the operator-state entry for
  that property for the three-outcome test that distinguishes a missing
  re-consent from a genuine Workspace block. (b) **A failed image export now
  says WHY** — the sticky save toast names the unset property or the stored
  folder that would not open, carries Apps Script's own message, and appends
  the re-auth instruction only when the failure is actually a scope refusal.
  Once the grant is in place, expect the SECOND, already-documented block
  behind it: this domain forbids the folder's domain-link sharing, so the
  Drive thumbnails 403 for reps and the `kbGetImageData` fallback renders the
  images instead — that is working as designed. **Post-deploy: run
  `runAllTests()`** — still **308** (no Tests.js change; the four new pins are
  Node-side, which is the point — the editor suite makes no DriveApp calls).
- **The 2026-09-04 boot-timing + QA icon round adds NO operator state** — no
  properties, triggers, migrations, endpoints or CONFIG values; the `ViewUsage`
  tab gains a trailing `BootTiming` column whose header self-heals on the
  first beacon after deploy (older rows read as untimed). Behaviour changes to
  expect post-deploy: (a) **Admin → Overview → Feature usage gains a "Startup
  time · 7d" line** — median and p90 seconds to the shell, to the first server
  call, and to the first content paint, from boots recorded since the deploy;
  it reads "no timed boots yet" until reps have opened the app on the new
  build, and it deliberately excludes the Google sign-in redirect (the page
  cannot see it). Read it for a week before deciding on a pre-shift warm-up —
  the honest answer to "warm the app before each shift" is that a trigger
  cannot reach the browser and the 5-minute caches expire before the shift;
  an open tab or pinned pop-out left overnight IS the warm start, and the
  pop-out tooltip now says so; (b) **the QA sidebar + Recordings tab carry a
  waveform glyph** instead of the headset. Admin QA access needed no change:
  `canSeeQa_` admits every manager, and admins are a subset of managers, so
  the operator already sees all four QA tabs; `QA_MEMBERS` is only for
  non-manager reviewers. **Post-deploy: run `runAllTests()`** — still **308**.
- **The 2026-09-03 Manage Time feedback round adds ONE optional Script
  Property (`MAIL_BCC_ALL`, its own entry above) and no other operator state**
  — no triggers, migrations or CONFIG values; one new MANAGER-gated endpoint
  (`updatePunchAdjustStatusBulk`). Behaviour changes to expect post-deploy:
  (a) **Pending Time Off and Pending Punch Adjustments sit side by side**, the
  adjustments card carries checkboxes + Approve/Deny Selected once there are
  two or more, and a decided row leaves the list the moment you click — the
  full round trip (lock, Timesheet write, mirror, decision email) still runs,
  it just no longer holds the screen; (b) **the Punch Activity chart and every
  live-status sparkline skip weekends** ("last 8 workdays"); the Pending
  sparkline keeps calendar days on purpose; (c) **the live-status cards are
  wider with the Edit-day / Pay-statement buttons top-right and a taller
  chart**; (d) **Day Edit no longer overwrites a time you typed before its
  punches loaded**, and a prefill that fails disables Save instead of offering
  a blank form whose save would delete the day's punches; (e) with
  `MAIL_BCC_ALL` set you receive a copy of every email the app sends. Two
  answers from the round worth recording: **Day Edit sends NO email to the
  agent** (only the adjust-REQUEST decisions and time-off decisions email the
  rep — `managerSaveDay` never has), and **a manager edits a rep's day
  directly with Day Edit; the request queue is the rep-side flow**, there is
  no manager-filed adjust request and none is needed. (The Metrics 30-day
  trends walked calendar days until the 2026-09-04 follow-ons round — see
  that entry; they walk workdays now.)
  **Post-deploy: run `runAllTests()`** — still **308** (the omnibus gained
  the `updatePunchAdjustStatusBulk` case IN PLACE).
- **Design handoff PR 6 (2026-09-02, the Time Clock surface) adds NO operator
  state** — no Script Properties, triggers, migrations or CONFIG values; ONE
  new rep-callable read endpoint (`getMyPendingTasks`, read-only, per-rep
  cached 2 min on clean rounds only) that composes six EXISTING reads, so
  nothing new must be shared or granted. Behaviour changes to expect
  post-deploy, all on the Dashboard: (a) **a "Needs you" block leads the main
  column** — overdue coaching, unsigned docs, due call-backs, yesterday's
  calls without a note, pending training and open/incoming department
  requests, overdue first, each row a link into the right tab; it disappears
  entirely when a rep has nothing outstanding, and a source that could not be
  read is NAMED at the bottom rather than silently omitted; (b) **the punch
  buttons sit directly under the clock card** (measured: their top moved from
  704px to 367px at 1440×900), above the shift strip; (c) **the clock card
  carries a state line** ("On the clock · 5h 54m worked") on a dark scrim, and
  the hours figure appears ONLY there — the greeting sentence and the shift
  strip no longer repeat it; (d) **the world-clock strip, the shooting star,
  the greeting's "On the clock" pill and the pending-Training card are gone**
  — training now lives in Needs you, and the extras row shows Spanish Inbox
  beside Requests for bilingual reps or Requests alone for everyone else;
  (e) **break chips show their state** (taken struck through, the next one
  outlined with "· in Nm" inside 90 minutes) instead of a separate next-break
  chip; (f) **the greeting no longer rotates What's-new slides while a rep is
  on the clock.** The pinned pop-out is unchanged: it hides the block and
  makes no extra call. **Post-deploy: run `runAllTests()`** — it adds the new
  `pendingTasks_requiresEmployeeAndShape` case (check it against the count its own `Expected:` line prints). **The operator's
  2026-09-02 4:35 PM run read 303/308:** one REAL bug (the coaching nudge's
  once-per-day guard compared frames — fixed, `coachStampDayMgr_`) and four
  test-side faults (the TEST rows' timezones had been flipped with the real
  agents' — setup now restores them; the resume test read `day.incomplete`
  where the builder returns `isIncomplete`; the multi-break test still refused
  a trailing open break the 2026-09-02 fix accepts by design). The run took
  25 minutes mid-shift — the documented lock-contention window, though no
  lock timeout fired. Re-run after the next `clasp push -f` and expect a CLEAN
  run (the six design-handoff PRs ship on one deploy, so one run covers them all;
  its own `Expected:` line carries the count).
- **The break coverage planner (operator 2026-09-03) adds NO operator state to
  SET UP — but its demand layer reads a tab another repo writes.** The strip at
  the top of Manage → Admin → Config → Break schedules computes who is on the
  desk per 15 minutes from the schedules as edited (unsaved), over a background
  layer of average inbound call volume by time of day. That layer reads the
  CDR Report spreadsheet's **`Inbound Calls`** export tab, written by
  `call-data-reporting`'s `inboundCallsExport.js` (its Op State #49 — the
  "Inbound Calls tab export" trigger must be installed there, and the tab must
  carry the `Call Start` / `Is Internal` columns 16–17). Missing tab, missing
  columns, or no rows in the trailing window → the strip renders WITHOUT the
  layer and names why; nothing else on the card degrades. Seven CONFIG keys
  ship seeded (`CDR_INBOUND_TAB`, `CDR_INBOUND_PST_TO_CST_HOURS` — a
  hand-mirror of the CDR repo's `INBOUND_HEATMAP_CST_SHIFT_HOURS`,
  `BREAK_COVERAGE_SLOT_MIN` 15, `BREAK_COVERAGE_VOLUME_DAYS` 28,
  `BREAK_COVERAGE_VOLUME_MAX_ROWS`, `BREAK_COVERAGE_VOLUME_CACHE_SEC` 1h,
  `BREAK_COVERAGE_VOLUME_QUEUES` = the four Customer Success entry queues —
  empty = every inbound queue); all CONFIG-only. ONE new admin endpoint
  (`getBreakCoverage`, joining the INV-136 admin tier). **Behaviour changes to expect
  post-deploy, and the second one is the point:** (a) the Admin card leads
  with the strip — cells toned by the Coverage planner's own thresholds,
  click a cell for who is away; it re-derives as you type and says "Live
  preview"; (b) **Manage → Coverage will show MORE amber/red hours than
  before** — the planner counted a rep on lunch as present until now, and a
  team whose lunches cluster at noon will see its noon band drop. That is the
  fix reporting a gap that was always there, not a data change. **Post-deploy:
  run `runAllTests()`** — still **308** (the omnibus gained the
  `getBreakCoverage` admin case IN PLACE).
- **Design handoff PR 5 (2026-09-02, the QA surface) adds ONE optional Script
  Property and no other operator state.** `QA_AUDIT_TARGET_PER_PERIOD` (1..50)
  overrides the CONFIG seed of **3** sampled calls per employee per audit
  period without a redeploy; unset is fine. No triggers, no migrations: the
  `QaRecordings` header SELF-HEALS its two new trailing columns
  (`DurationSec`, `SkipReason`) on first use, and a `QaExemptions` tab
  auto-provisions the first time a manager grants an exemption. Behaviour
  changes to expect post-deploy: (a) **the Recordings tab opens on
  COVERAGE** — a period control (this month / this quarter / last quarter),
  a summary strip, and a per-employee table saying who still owes a sampled
  call; the recordings themselves sit below it as a sortable table with a
  Skipped chip, a Length column (filled in as recordings are opened — the
  first open of each writes its duration back), and an amber
  "Unattributed" where no agent is set; (b) **"Sample 3 for me" became
  "Sample the gaps for me (N)"** — N is the team's shortfall this period,
  and the sampler no longer pulls a covered agent ahead of one still short;
  (c) **managers can Grant an exemption** to a rep with two covered periods
  at 4.5+ and no criterion under 4 (a `QaExemptions` ledger; one period at a
  time; Revoke on the same row) — a QA member who is not a manager sees the
  eligibility but no button; (d) **Skip asks for a reason**, which shows on
  the queue row; (e) **typing a comment PAUSES playback and pins the
  moment** — the time is editable, and Post & resume / Post & stay paused /
  Discard replace the single button; a comment now lands where you started
  typing, not where the player drifted to; (f) the detail is two panes on a
  wide screen with Skip / Start review / Mark done in the header, the
  scorecard carries 1/3/5 anchors + a running average, and every score chip
  is toned (≤2 red, 3 neutral, ≥4 green); (g) a manager gets **Coach on this
  call** on an attributed recording, which opens the Coaching composer with
  the timestamped comments as the narrative; (h) My Reviews (still hidden
  from agents per operator decision 13) leads with a read-only callout and
  carries the same ±5s / speed transport as the detail. **Post-deploy: run
  `runAllTests()`** — still **307** (the QA gate case grew IN PLACE to 15
  endpoints with `qaSetRecordingDuration`, and the omnibus gained
  `qaSetExemption` on the manager tier).
- **Design handoff PR 4 (2026-09-02, the Coaching surface) adds NO operator
  state to SET UP — but re-run `installAutomationTriggers()` once** so the
  NINETEENTH trigger (`sendCoachingRecapDigest`, Friday manager-tz 8am) exists;
  until it does, minor/moderate/praise coaching reaches reps only in the app
  (critical items email immediately regardless). ONE CONFIG constant
  (`CONFIG.COACHING_RECAP_DAYS`, 7, code-only) and FIVE auto-managed TRAILING
  columns on the HR store's `Coaching` tab (`RepResponse`, `FollowUpAt`,
  `NudgedAt`, `NoteDate`, `QaFileId` — the header self-heals on first use;
  existing rows read blank). Behaviour changes to expect post-deploy: (a) **the
  Coaching tab is rebuilt** — managers land on a "Who needs a 1-on-1" signal
  board with a filter strip and a side DRAWER for logging (Coaching ⇄ Praise,
  severity chips where the middle tier now READS "Moderate" — the stored value
  is still `major`, nothing migrates); reps get KPIs, a callout naming their
  oldest open item, a Recognition feed for praise and an optional reply box
  beside each Acknowledge; (b) **ages, the overdue window and the median count
  BUSINESS days** — an item logged Friday afternoon is not overdue on Monday,
  and the overdue counts you have been reading will get smaller, with a note
  under the KPI strip saying what is excluded; (c) **praise no longer counts as
  open or against the ack rate**, so both figures move; (d) **only a CRITICAL
  item emails the rep at once** (cc you; a critical void sends a withdrawal) —
  minor/moderate/praise arrive in a Friday recap per agent that names
  severity, date and who logged it but never the narrative; (e) managers gain
  **Nudge** (re-sends the reminder, once per item per day) and **Revisit**
  (a follow-up date; a past one flags the item) on each card; (f) the Voided
  filter is the only place a voided item appears — reps never see them.
  **Post-deploy: run `runAllTests()`** — it adds the recap trigger
  gate + the critical-only mail test, which drives `createCoaching` through
  the `_TEST_OVERRIDE_COACH_MAIL` seam so no real email leaves.
- **Design handoff PR 3 (2026-09-02, the Manage surface) adds ONE CONFIG
  constant and no other operator state** — `CONFIG.PUNCT_MAX_RANGE_DAYS` (92,
  code-only; no Script Property, triggers, migrations or new endpoints — every
  new `getPunctualityReport` field is ADDITIVE and the client guards each one,
  so deploy skew in either direction renders as before). Behaviour changes to
  expect post-deploy: (a) **Manage → Manage Time is regrouped** — the cards
  that need a decision (Pending Time Off, Missed Clock-Outs, the adjustment
  queue, Live Status, Team Punches) come first under "Needs you", and Export /
  PTO reconciliation / sheet doctor / Recent Punches / Recent Activity sit
  under a collapsed "Periodic" heading whose summary line says "all clear" or
  names the drift without expanding; (b) **Punctuality gains presets** (7d /
  30d / QTR behind the same chips Metrics uses), a summary strip with a change
  vs the prior range, an Outliers panel that appears only when someone is
  under 75% or averaging >15 min late, and a chevron per rep opening a
  day-by-day strip (late / on time / off / holiday / no punch), a four-week
  trend and a "Coach on this" button that opens the Coaching composer
  pre-filled; a custom range longer than 92 days is now refused by name;
  (c) **Coverage gains forward presets** (This week / Next week / Next 2
  weeks) on the same chips; (d) **on a phone, every view's app-bar control
  (the Punctuality/Coverage presets, Intake's EN/ES toggle) now sits UNDER the
  title** instead of beside it — a shared-component fix the mobile shoot
  measured. **Post-deploy: run `runAllTests()`** — still **305**.
- **Design handoff PR 2 (2026-09-02, the Admin surface) adds NO operator
  state** — no properties, triggers, migrations, endpoints or server changes
  (the two health payloads are read as before; everything moved is client-side).
  Behaviour changes to expect post-deploy: (a) **Manage → Admin gains a
  System sub-tab** between Overview and Tags — a "Needs attention" list at the
  top (each item names the fix and links to the sheet or tab it concerns),
  the Storage inventory as a table with a chevron per row for its detail, and
  the Automation detail panel below; the tab carries a count badge while
  anything is open; (b) **the three Overview status cards are now buttons**
  that land on the matching System section — the old "System details"
  disclosure on Overview is gone; (c) **a failed health read now renders a
  warn card and a "could not be read" finding** instead of a muted line, and
  the card reads "Unavailable" rather than a stale tone. Expect the System tab
  to reach "Nothing needs attention" on a healthy deployment — the raw CDR
  name lists and the by-design-unset HR/QA/External stores are listed under
  "checks passing" with their counts, never as warnings. **Post-deploy: run
  `runAllTests()`** — still **305**.
- **The 2026-09-02 operator round (note line breaks + the Day Edit in-progress
  break) adds NO operator state** — no properties, triggers, migrations or
  CONFIG values. TWO behaviour changes, both visible immediately on deploy:
  (a) **a Resolution or Issue written with paragraph breaks now KEEPS them in
  the email and its preview.** The break was never lost in storage — the note
  fields are `white-space: pre-wrap`, so Enter stores a real newline and the
  CRM paste always carried it — but HTML collapses a bare newline, so the email
  rendered one run-on block. Existing notes re-render correctly; nothing needs
  re-typing. The same formatter feeds the three manager digests, so a
  multi-line Issue now renders multi-line there too and those rows will be
  taller. (b) **Day Edit saves normally for a rep who is on lunch RIGHT NOW.**
  The first A4 build refused a break with a leave and no return as malformed,
  which made the modal unsavable for anyone mid-break — so a manager could not
  correct a mistyped clock-in for someone out at that moment. A trailing
  open break is now accepted and round-trips as a lone Lunch Out; a return with
  no leave, and a half followed by further rows, are still refused by name.
  This was caught by `runAllTests()` on the operator's own pre-deploy run, in
  the window the runbook exists to create. **Post-deploy: run `runAllTests()`**
  — still **305**.
- **The 2026-09-01 multi-break round (Workstream A) adds NO operator state, but it
  CHANGES COMPUTED HOURS on some historical days — run the report before you
  deploy it.** `calcHours_` now deducts EVERY break pair instead of only the
  last, so a rep who took two breaks is no longer paid for the earlier one.
  Two 30-minute lunches used to deduct 30 minutes; they now deduct 60. **Every
  affected day gets SHORTER — there is no direction in which this pays more.**
  **OPERATOR ACTION, before the deploy: run `reportMultiBreakDays()` from the
  Apps Script editor** (and, since 2026-09-11, its twin
  `reportBreakPairingChanges()` — same gate, same reader, lists the days the
  cycle-19 F1 greedy pairing changed; see the follow-ons entry) (read-only — it writes no sheet, no audit row, no cache;
  manager-gated like the trigger handlers). It scans the live Timesheet AND
  `TimesheetArchive`, dedupes rows present in both, and logs every rep/date that
  moves with old-vs-new hours and the break times involved. A clean result logs
  "NO historical day changes", which is the expected outcome on a team that has
  not been taking second breaks. Nothing needs correcting either way — the
  figures were wrong before and are right after — but you should know which
  timesheets change before someone asks. Behaviour changes to expect
  post-deploy: (a) the hours figure on the timesheet, pay statement, team
  calendar, employee calendar and the PTO ACCRUAL all move together for such a
  day (they share one arithmetic); (b) the sheet doctor STOPS offering to
  collapse a matched second break pair — that offer would have deleted recorded
  unpaid time — while still flagging an UNPAIRED break row and a repeated
  Clock In/Clock Out; (c) an ordinary single-break day is byte-identical
  everywhere. **A4 (same day) closed the last gap: the Day Edit modal now lists
  every break pair with add/remove, so opening and saving a multi-break day is
  safe** — the earlier "avoid Day Edit on a day the report names" warning is
  lifted. Range mode (a filled **To** date) deliberately still accepts ONE break
  pair and refuses more by name: adding N pairs per day is not idempotent across
  a re-apply, and replacing them would contradict range mode's additive contract
  (a blank punch is left unchanged, INV-108).
  **Post-deploy: run `runAllTests()`** — it adds the new
  `calcHours_multipleBreaks` smoke case — the operator's split-shift day,
  two ordinary lunches, an unpaired leave, and overnight ordering; plus A4's
  `managerSaveDay_multipleBreaks` integration case.
- **The 2026-08-31 team-punches-calendar round adds NO operator state** — no
  properties, triggers, or migrations; one new MANAGER-gated read endpoint
  (`getTeamCalendar` — not admin-tier, so INV-136's count is unchanged).
  Behaviour change to expect post-deploy: **Manage → Manage Time gains a
  "Team Punches" card** below Live Status — a month calendar (the Time/PTO
  calendar's look: day cells carry a reps-punched badge, off-counts, PTO
  dots, holiday stars, and an amber tint when any rep's day is incomplete)
  with a full-width team punch table for the clicked day (one row per rep:
  ClockIn / LunchOut / LunchIn / ClockOut / Hours, ADJ chips, absent reps
  as muted "no punches" rows) and a pencil per row opening the existing Day
  Edit modal prefilled to that rep + date (only within the 30-day adjust
  window). Reading past the live Timesheet tab is deliberately NOT done —
  an archived-away month says so and points at the export. **Post-deploy:
  run `runAllTests()`** — still **296** (the omnibus gained the
  `getTeamCalendar` case IN PLACE).
- **The 2026-08-28 #4 round (ALL-CST policy companions) adds NO operator
  state to SET UP — but carries the roster RUNBOOK below, which is the
  point of the round.** The operator clarified that **every agent, offshore
  included, works a CST schedule** (PH 8:30–17:00 CST, India 8:00–17:00
  CST), which makes the roster `Timezone` column the schedule FRAME and
  `America/Chicago` the correct value on every row (see the amended
  Timezone-model entry). Code changes: `getEmployeeState` ships
  `workAnchorTz` (additive), `tzMismatchCheck_` now warns on
  profile-vs-work-anchor offset mismatch (the browser comparison is retired
  — an offshore browser differing from a correct CST profile is
  normal-by-policy), and `CONFIG.SHIFT_SCHEDULE.BY_TIMEZONE` ships empty
  (the Manila-local entry was wrong under the policy). Cleanliness was
  VERIFIED before the flip was recommended: the sheet-tz axis
  (`tzEquivalent_`, S1.1, Storage Health) never reads `EMP.TIMEZONE` —
  zero overlap. **RUNBOOK, in order:** (1) deploy this round (New
  version); (2) on a **WEEKEND** (no rep works Sat/Sun CST, so no shift
  straddles the seam), edit the Employees sheet: `Timezone` =
  `America/Chicago` on EVERY agent row, and column O = `8:30-17:00` for PH
  agents (India = the 8:00–17:00 DEFAULT, no column O); the roster cache
  picks it up within 5 min; (3) in Manage → Admin → Config → Break
  schedules, keep/put all break times in the **Default** section as CST
  wall times and Revert/delete any per-timezone section; (4) **before
  Sept 1** (the first hours-driven August accrual credit, 18:00 CST):
  review offshore agents' August timesheets — pre-flip split days read
  INCOMPLETE and under-credit the accrual; repair pairs via Day Edit onto
  one date, or top up balances manually afterward (credits are deltas and
  each audit row names `hoursWorked=`, so the shortfall is computable).
  **Use the STANDING PRE-FLIGHT for this** (column-Q entry): open the rep's
  PAY STATEMENT for the month — it reads days through the same `calcHours_`
  the credit does, so it shows exactly what the credit will see, with no
  timezone inference. To SKIP a month whose hours are unrecoverable, set
  column R to that month (zero-padded) — a forward stamp is honored;
  do it AFTER that day's 18:00 run so the seed round cannot race it;
  (5) between deploy and the flip, offshore agents see one sticky
  once-a-day warning naming their profile tz vs the CST anchor — that is
  the new check being accurate, and it stops the moment their row is
  flipped. Behaviour changes to expect post-deploy: the old
  browser-vs-roster daily warning disappears for correctly-configured
  offshore agents; agents whose roster row still carries a non-CST (or
  blank → Kolkata-fallback) tz get the new profile-vs-anchor warning
  instead. **Post-deploy: run `runAllTests()`** — still **296**.
- **The 2026-08-28 #3 round (Team Notes load speed + the Storage Health QA
  line, operator follow-up) adds NO operator state** — no properties,
  triggers, migrations, or endpoints (client SWR + one additive Storage
  Health row). Behaviour changes to expect post-deploy: (a) **Team Notes'
  Training / Review Candidates queues and the Stats tab RE-paint instantly**
  on a re-enter or tab switch from the session's last CLEAN round and
  refresh behind the "Refreshing…" pill — the first open of a session still
  does the real cross-rep Sheet walks, a degraded round (unreadable rep
  Sheets) renders with its warning but is never the instant paint, and a
  failed refresh keeps the painted queue with a warn toast (Per-Rep and
  Search deliberately stay fetch-on-demand — bounded reads, not the slow
  ones); (b) **Admin → Storage Health gains the QA (recordings) store row**
  — its retention column shows the LIVE `QA_REVIEW_RETENTION_DAYS` window
  ("Review-record purge ENABLED — N days …" once you set it, the disabled
  default otherwise), and an unset `QA_SS_ID` reads as a muted "not set"
  fact rather than a warning (no fallback store, by design). **Post-deploy:
  run `runAllTests()`** — still **296**.
- **The 2026-08-28 follow-ons + perf round (My Reviews waveform, QA review
  retention tier, Training/Manage load speed) adds NO operator state to
  SET UP — but re-run `installAutomationTriggers()` once** so the
  EIGHTEENTH trigger (`purgeOldQaReviews`, daily manager-tz 2am) exists.
  Installing it is harmless: the window defaults to **0 = disabled** and
  the run also no-ops while `QA_SS_ID` is unset. To ENABLE review-record
  retention later, set Script Property **`QA_REVIEW_RETENTION_DAYS`** to a
  day count — the purge irreversibly deletes `QaComments` + `QaScorecards`
  rows older than the window; the `QaRecordings` index and the Drive audio
  files are NEVER touched, and Automation Health shows a "QA review-record
  purge" last-seen row only while the window is set (INV-186). Behaviour
  changes to expect post-deploy: (a) **My Reviews' Play button now renders
  the waveform** with click-to-seek where the browser can decode the audio
  (decoration — an undecodable format keeps the plain player; currently
  reachable only by QA members/managers per the gate entry above);
  (b) **Training (My + Team) and Manage Time RE-enters paint instantly**
  from the session's last load and refresh behind the "Refreshing…" pill —
  the operator's "these pages take longer to load" report; the FIRST open
  of a session still does the real server work (Team Training fans in five
  RPCs; Manage runs the app's heaviest live read), a background refresh
  never wipes an in-progress assign form / checked bulk-select boxes / an
  open overlay (the fresh data waits, warm, for the next render), and a
  failed refresh keeps the painted view with a warn toast instead of an
  error screen (only a cold failure shows the error card). **Post-deploy:
  run `runAllTests()`** — it adds the new
  `triggerGate_qaReviewPurge_nonManagerThrows` case.
- **The 2026-08-27 correction rounds (sender identity, brand sweep, KB editor
  loaders — PRs #189/#190/#191) add NO new operator state to SET UP** — no
  triggers, migrations, CONFIG constants, or new endpoints; the one Script
  Property involved (`REP_SENDER_FROM`) already existed and **the operator SET
  it to `customersuccess@universalmedsupply.com` mid-round**, so rep-initiated
  sends now go out from that alias via GmailApp (which also records each send
  in the deployer's Gmail Sent folder — its own entry has the details).
  Behaviour changes to expect post-deploy: (a) **rep-initiated emails carry the
  agent's name ALONE as the From display name** — the former org suffix was
  the WRONG company name and fired live on a pilot send; (b) **the sending
  agent is self-BCC'd** their own copy of every dept/external/intake email
  (their inbox — a true agent Sent-folder entry is impossible, the app sends
  as the deployer); (c) **the composer warns dismissibly at Preview when
  Patient Name & TRX is empty** (Continue anyway / Go back — a pilot email
  went out without one); (d) **every user-facing string now reads
  "UniversalMed Supply"** — the wrong name shipped in 14 more places
  (external email greetings/sign-offs, the public form page, the
  Access-Restricted page), all corrected, with a derived BRAND tripwire
  banning the wrong literal from every shipped file; (e) **the KB editor's
  Save and both Doc/Sheet conversions show in-button loaders** (Save names
  the image-export count when that is the slow part), and a converted Doc's
  images preview as a dashed pending chip saying they appear after Save
  instead of bare alt text. **Post-deploy: re-do the email spot-check** (one
  dept + one intake email — From = the agent's name alone, sender address =
  the customersuccess@ alias, Reply-To = the agent, and the agent's own copy
  in their inbox) and press Save on the converted Doc from testing to see
  its images export. **A same-day follow-on added the deploy-version
  beacon** (also NO operator state — one auto-managed CacheService key,
  `client_build_hash_v1`): after every future New-version deploy, each open
  window shows a sticky "Team Tools was updated — reload" toast with a
  Reload button within ~20 minutes, instead of running the old client until
  the next morning's boot. Nothing to configure; deploys work exactly as
  before. Post-deploy `runAllTests()` gains the new
  `deployStamp_requiresEmployeeAndHashes` case. **The same day's Part A
  round (the live timezone reports) also adds NO operator state** — no
  properties, triggers, migrations, or sheet edits (the roster Timezone
  cells were checked and CORRECT; the fault was read-side recovery, not
  data). Behaviour changes to expect post-deploy: (a) **the displayed
  timestamps of ALL historical notes on a drifted-tz per-rep sheet
  self-correct** — the operator's own notes stop reading 1:46 AM and show
  the as-written CST wall time; (b) **the PH rep's "missing" notes reappear
  under the correct day** — today's rolling stack, History groups, EOD
  digests, coverage counts and search date filters all read the same
  corrected DateLocal (the stored rows were never wrong, so nothing needs
  re-entering); (c) re-pinning a drifted sheet's tz by hand is no longer
  required for note reads — though new sheets are still provisioned pinned.
  **Post-deploy spot-check: log a note and confirm the card's time matches
  your wall clock; have a PH agent confirm a fresh note appears in today's
  Log immediately.**
- **The Dept-Requests in-place resolve (operator 2026-08-24) adds NO operator
  state** — no Script Properties, triggers, migrations, CONFIG constants, or
  endpoints (client-only; `resolveDeptRequest` is unchanged). ONE behaviour
  change: **"Mark resolved" no longer reloads the Dept Requests page.** The
  one card shows a loader and swaps to its resolved tone in place, so the rest
  of the list keeps its position and any active status/department filter is
  preserved. A manager additionally sees the per-department aggregate refresh
  a moment later (that half IS server-derived, so it takes one quiet refetch);
  a rep's resolve makes exactly one server call. **Post-deploy: resolve one
  request and confirm the list does not blank** — that is the whole check.
- **The pilot-feedback rounds 1 + follow-ons + 2 (2026-08-21 → 2026-08-24)
  add NO operator state to SET UP** — no triggers, migrations, CONFIG
  constants, or new OAuth scopes (GmailApp was already authorized by the
  Spanish inbox). ONE new OPTIONAL Script Property exists (`REP_SENDER_FROM`
  — the dormant neutral-sender alias, its own entry below; nothing to do
  unless you want it), and two AUTO-MANAGED tabs appear on first use:
  `SpanishClaims` (ADP sheet, PHI-free) + `ScheduledCalls` (the forms PHI
  store — the standing `FORMS_SS_ID` recommendation now covers it).
  Behaviour changes to expect post-deploy: (a) **rep-initiated emails (dept /
  external / intake) arrive with the agent's identity** — From display name
  is the agent's name (the org suffix was dropped by operator correction
  2026-08-27 — wrong company name), Reply-To the agent — so replies land
  in the sending agent's inbox instead of the deployer's, and since the same
  correction round the sending agent is self-BCC'd their own copy (the org
  CC/BCC copies are unchanged; automated digests/alerts/exports keep the
  system identity); (b) flagging a note REVIEW offers an optional comment (the
  training-question pattern) which renders on cards/queue and as a `Comment:`
  line in the weekly Review digest; (c) the Call Notes form gains an
  **Outbound call** toggle — an info-toned pill on cards, an Outbound filter
  chip, an outbound count in History group headers, and an opt-in
  `{callDirection}` copy-template token (the default paste is byte-identical);
  (d) **Spanish Inbox pending cards gain Claim / Release / manager-Assign**
  (advisory, INV-31's seven-endpoint gate); (e) reps can **schedule call-back
  reminders** (bell in the Log header + note-card More-menu) that chime +
  sticky-toast in any open window incl. the pinned pop-out — a closed browser
  gets nothing, as the modal copy states; (f) the Automation Health catalog
  card may show NEW warnings naming Offerings E/F cells that are not real
  http(s) URLs — an existing silent dead link being reported, not a new
  fault. **Post-deploy: run `runAllTests()`** (incl. the two new Spanish gate
  cases) **+ the email spot-check** — one dept email + one intake email,
  confirming the From name + Reply-To; then claim a pending Spanish request
  from a second account and schedule a reminder 2 minutes out.
- **The cycle-18 SEAMS round F1–F5 (2026-08-21) adds NO operator state** — no
  Script Properties, triggers, migrations, CONFIG constants, or OAuth scopes;
  three of the five findings touch only tests/docs. ONE behaviour change to
  expect post-deploy: an Offerings column-E/F value that is not a real
  `http(s)://` URL (a `javascript:` scheme, a schemeless `www.example.com`)
  no longer renders as a brochure link / device image in the PPD
  recommendation cards — preview modal AND sent email — joining the
  blank-cell path, exactly as the Catalog tab already treated it. Real
  https URLs render byte-identically. If a brochure link stops appearing
  after this deploy, check the cell for a missing `https://` prefix.
  Deploys with the normal single `clasp push -f` + New version (it ships
  together with the still-owed PR #176 deploy). **Post-deploy: run
  `runAllTests()`** as usual.
- **The cycle-18 pre-audit batches 8 + 5B (2026-08-21) add NO operator state at
  all** — no Script Properties, triggers, migrations, CONFIG constants, or new
  OAuth scopes. Behaviour changes to expect post-deploy: (a) **Intake gains a
  fifth tab, Catalog** — a read-only browse of the same Offerings catalog the
  PPD engine recommends from, so a rep can look up a HCPCS code, a weight
  capacity or a brochure link without opening the Intake spreadsheet (which also
  holds the PHI submission tabs). It shows what is in columns A–F, so the
  operator note about **columns E (pdfLink) and F (imageUrl)** now applies to a
  rep-facing surface as well as to the recommendation cards: a blank E or F
  renders "no image"/an unlinked code on the browse card too. A row whose
  weight capacity is unrecorded says so rather than showing a blank, because
  that row is excluded by the engine (F9). (b) **Managers can open any rep's pay
  statement** from a second button on each live-status card — the server branch
  has been manager-gated since 2026-08-17 and simply had no UI; the per-day
  "Request edit" buttons are correctly absent when viewing someone else. (c)
  **Ctrl+P now produces a usable page** — previously a modal printed one
  screenful and dark mode printed near-white ink on white. The pay statement has
  its own Print button. (d) **Every form control now announces a name to a
  screen reader**, including all three public-form templates; nothing visual
  changed. **Post-deploy: run `runAllTests()`** as usual.
- **The cycle-18 pre-audit batches 1+2 (2026-08-19) add NO operator state to set up** — no
  Script Properties to create, no triggers, no migrations, no CONFIG values to choose. ONE
  auto-managed property appears on first use: `AUTOMATION_LAST_ERRORS` (see the storage-map
  note). Behaviour changes to expect post-deploy, both of them the point of the round:
  (a) **Admin → Automation Health and the daily failure digest may report NEW lines** — the
  per-job liveness check is now derived from a table covering seven audit-row jobs instead of
  only the nightly reconcile, so a retention/archive window enabled WITHOUT its trigger
  installed, or a PTO accrual that failed, now says so. That is a real gap being reported for
  the first time, not a new fault — re-run `installAutomationTriggers()` if a trigger is
  genuinely missing. A job that legitimately writes no row on a healthy deployment (retention
  disabled, no accruing rep) is never checked, so a clean deployment stays silent.
  (b) **The manager daily brief (if the flag is on) may arrive with an "Incomplete brief"
  banner** naming a source it could not read, and will send even when the readable sections
  are clear — previously it dropped the failed section silently while still suppressing the
  digest that covered it. **Post-deploy: run `runAllTests()`** as usual (the accrual +
  automation-health integration tests are editor-only).
- **The 2026-08-19 accrual REBUILD (operator: "3.08 PTO hours per 80 hours
  worked, 8 hours per day, and PtoEnabled will be TRUE") SUPERSEDES the
  days-per-calendar-month model of the two 2026-08-18 entries below.** Same
  machinery — same trigger, same column-R stamp, same in-arrears
  idempotence, same audit action, same `ROSTER_CACHE_KEY` v11 — only the
  AMOUNT changed: a credit is now the PTO earned from the hours the rep
  actually WORKED in each owed month, not a flat monthly figure. Two new
  CONFIG constants, `PTO_ACCRUAL_BASIS_HOURS` (80) and `PTO_HOURS_PER_DAY`
  (8); both CONFIG-only, so changing them is a redeploy. **What an operator
  must do differently from the 2026-08-18 instructions:** column Q now holds
  **PTO hours per 80 hours worked** (`3.08` for the PH team), NOT days per
  month — a cell left at `1.25` from the earlier round would now read as
  1.25 PTO hours per 80 worked, roughly a third of the intended rate, so
  **re-enter every column-Q value in the new units**. Everything else in the
  follow-up entry still holds: re-run `installAutomationTriggers()` once,
  and stop routine manual top-ups. Behaviour to expect: a rep who worked no
  hours in a month is credited NOTHING (correct under an hours rule) and
  still gets an audit row saying so; a day missing a clock-out is reported
  as `incomplete day(s) NOT counted` rather than counted as zero; and the
  Time/PTO tile drops the year-end projection and the progress bar it
  carried on 2026-08-18 — an accruing balance has no ceiling to fill and no
  knowable future work pattern to project from, so both were invented
  numbers. **Post-deploy: run `runAllTests()`** — the rewritten
  `test_creditPtoAccrual_seedCreditIdempotent` now writes two 8-hour test
  days and asserts the credit the hours imply.
- **The 2026-08-18 accrual-CREDIT follow-up — ITSELF SUPERSEDED the next day
  by the hours-driven REBUILD above; read this entry for the machinery
  (trigger, stamp, idempotence, enable convention), NEVER for the amount.**
  (operator: "I would rather the system compute the accrued balance") It
  superseded the display-only accrual model shipped earlier the same day. It adds ONE auto-managed roster
  column (R `AccruedThrough`), ONE new trigger (`creditMonthlyPtoAccruals`,
  daily manager-tz 18:00 — the seventeenth), the `PtoAccrualCredit` audit
  action, and `ROSTER_CACHE_KEY` v11. **THREE operator actions:**
  (1) **re-run `installAutomationTriggers()` once** — without it no credit
  ever fires (the trigger doesn't exist yet); (2) fill column Q for
  accruing agents (as before); (3) **STOP the routine manual monthly
  top-ups for those agents the day their rate is set** — the system now
  adds the accrual for each completed month on the 1st (in arrears — as of
  2026-08-19 that amount comes from the month's real worked hours, not a flat
  monthly figure), and a manual top-up on top of it double-credits. Enable convention: the balance is
  presumed current through the END of last month (the first automated
  credit lands on the 1st of next month, for this month). One-off
  corrections remain fine any time — credits are deltas, they compose.
  Verify after the first month boundary: Manage → Admin → Automation
  Health shows a "PTO accrual credit" last-seen row, and the AuditLog
  carries one `PtoAccrualCredit` row per accruing rep. **Post-deploy: run
  `runAllTests()`** — the new `test_creditPtoAccrual_seedCreditIdempotent`
  + `test_triggerGate_ptoAccrual_nonManagerThrows` execute only in the
  editor.
- **The 2026-08-18 range round adds NO operator state** — no Script
  Properties, triggers, or CONFIG constants; one new REP-callable endpoint
  (`submitTimeOffRange`, guarded per INV-94/95 — not manager-gated).
  (This round ALSO introduced column Q as a display-only accrual rate with
  `ROSTER_CACHE_KEY` v10; the accrual-credit follow-up above SUPERSEDED both
  the same day, before either shipped — take the column-Q/R instructions and
  the cache-key version from THAT entry, never this one. In particular its
  original "keep maintaining column-I balances by hand" instruction is now
  WRONG: the system credits them.)
  Behaviour changes to expect post-deploy: (a) the request-time-off card
  and day modal accept an optional SECOND date — a range writes one
  Pending row per weekday (weekends skipped, conflicts reject the whole
  batch naming the dates), so managers see and approve/deny each day
  individually (bulk approve already handles the multi-row case);
  (b) nothing else moves. **Post-deploy: run `runAllTests()`** — the new
  `test_submitTimeOffRange_weekendSkipAtomicCaps` executes only in the
  editor.
- **The 2026-08-18 Time/PTO consolidation round adds NO operator state** — no
  Script Properties, triggers, migrations, CONFIG constants, or endpoints
  (client-only + one optional client arg on `openAdjustModal`). Behaviour
  changes to expect post-deploy: (a) **the Time / PTO page loses its
  Time Off ⇄ Timesheet toggle** — one page now, with the right rail stacking
  a new **Requests card** (date picker + "Request" opening the same day
  modal a calendar tap opens; "Request punch edit" opening the adjustment
  modal), the Annual-leave tile, and the Pay-period block + "View pay
  statement" + Recent activity; a rep's remembered mode preference is
  simply ignored (the `umsMergeMode` browser key is retired — nothing to
  clean up); (b) **the pay statement's incomplete/empty days carry a
  "Request edit" button** (within the 30-day adjust window) that closes the
  statement and opens the Adjust modal pre-filled to that day — older days
  still say to ask a manager, and a manager viewing another rep's statement
  sees no buttons. **Post-deploy: run `runAllTests()`** as usual.
- **The 2026-08-18 operator round (width sweep + Spanish members editor +
  load-time sweep round 1) adds NO operator state to SET UP** — no new Script
  Properties to create, no triggers, no migrations; `SPANISH_INBOX_MEMBERS`
  is now editable IN-APP (Manage → Admin → Config → Spanish bilingual
  members) as the recommended path, with direct property editing still
  working. Behaviour changes to expect post-deploy: (a) **Punctuality and
  Admin fill the page width** (their inner 780–900px caps dropped); (b) the
  Admin **Auto-tag rules** card is a compact 2-up scrolling list that no
  longer grows with the rule count; (c) **Dashboard metric cards are served
  from a day-long server cache** (6h TTL — the CacheService max — with the
  rep-local day in the key, was 5 min; operator-approved since the CDR data
  does not change again once the daily import lands; a load BEFORE the
  import can pin the pre-import aggregate for up to 6h, while the Metrics
  tabs keep their 5-min caches); (d) **Dept Requests loads
  noticeably faster** (90s per-caller server cache, invalidated by every
  resolve/new request, + an SWR re-enter that paints instantly); (e) **Time /
  PTO re-enters paint instantly** from the month cache with a quiet
  background refresh. (f) **Team Metrics is
  visible to every rep** — as the team AGGREGATE only (hero + rail + trend +
  a "per-rep breakdown is visible to managers" note); managers see the page
  unchanged; (g) the two **Dashboard metric cards click through** to My
  Stats / Team Metrics ("MY STATS ›" / "TEAM METRICS ›" in the card heads) —
  the mini-trendline mock was reviewed and held, the click-through is the
  bridge to the full charts; (h) the dashboard server cache was subsequently
  extended to the 6h CacheService max (operator-approved — see (c)).
  (i) **the Call Notes pop-out's text
  shrinks with the window** below the 480px launch width (down to a readable
  floor at ~340px; at 480px and above nothing changes) — shrinking the pinned
  window past its old comfortable minimum now scales the template instead of
  clipping it. **Post-deploy: run `runAllTests()`** — including the new
  `saveSpanishInboxMembers` gate case and the REWRITTEN
  `test_metrics_getTeamMetrics_nonManagerRejected` (now a shape pin: rep gets
  the aggregate, never `reps[]`).
- **The 2026-08-17 THIRD round (full-width request pages + display cap +
  the one-test fixture fix) adds NO operator state** — no Script Properties,
  triggers, migrations, or CONFIG constants; two client-code constants
  (`SP_TASKS_CAP`=12, `SP_TASKS_PAGE`=24) bound the card lists. Behaviour
  changes to expect post-deploy: (a) **Spanish Inbox and Dept Requests use
  the full monitor width** (view widens to 1480px like the Dashboard; the
  card grid reflows to up to 4-up; Spanish puts the summary strip and the
  resolution-share chart side by side, stacking below 1024px); (b) **each
  card section renders at most 12 cards** with a "Show N more · M not shown"
  button revealing 24 per click — section headers keep the full counts, so
  nothing is hidden from the numbers, only from the initial DOM; (c) the one
  failing editor test (`publicForm_tokenLifecycle`) was a test-fixture
  artifact — its oversized signature lacked the `data:image/` prefix the
  cycle-17 shape guard (correctly) rejects first; **the next `runAllTests()`
  should be 286/286**.
- **The 2026-08-17 SECOND round (pay statement + Spanish share chart) adds ONE
  operator data column and no other state** — no Script Properties, triggers,
  or migrations. **Operator action: fill `Employees` column P (`PayRate`)**
  with each rep's hourly rate (plain number; blank = that rep's statement
  shows hours only — nothing breaks). `ROSTER_CACHE_KEY` bumped v8→v9, so
  stale roster cache entries expire within 5 min of deploy. Behaviour changes
  to expect: (a) Time / PTO → Timesheet mode gains a **"View pay statement"**
  button — per-period punches/hours/PTO with an estimated-gross line once a
  rate is on file (labeled an estimate, never a payslip); managers can pull
  any rep's statement server-side (UI follow-on); (b) the **Spanish Inbox tab
  gains a Resolution-share chart** — one bar per bilingual member incl. ZERO
  bars for members who resolved nothing, with a dashed even-split marker and
  no verdict colour (the judgement stays yours). **Post-deploy: run
  `runAllTests()`** — including the new `getMyPayStatement(other)` gate case.
- **The 2026-08-17 post-deploy operator round adds NO operator state** — no
  Script Properties, triggers, migrations, or CONFIG constants; one new
  per-browser localStorage key (`umsRemindFired`, count now seventeen).
  Behaviour changes to expect post-deploy: (a) **My Stats lands on
  "Yesterday" — the previous WORKDAY** (Monday shows Friday) instead of an
  always-empty Today; Team Metrics keeps its Today preset; (b) the PPD send
  footer offers **Custom email…** like PMD/PAP; (c) **a punch confirms in
  one round trip** — the toast and the button change land together,
  noticeably sooner; (d) **Reference search result ORDER changes** — the
  section actually about the query now outranks stray sections of
  title-matching docs (density + coverage weights, title bonus capped); if
  a familiar query surfaces different top results, that is the rebalance,
  not lost content; (e) **reminders no longer double-notify** when the main
  window and a pop-out are both open; (f) the timezone audit passed for the
  mass-adjustment path — one DST-transition cosmetic window fix shipped
  (Call Notes ambient week count). **Post-deploy: run `runAllTests()`** as
  usual.
- **The 2026-08-13 pre-pilot observability round adds NO operator state to set
  up** — no Script Properties, no triggers, no migrations, no CONFIG values to
  choose. ONE auto-managed sheet tab appears: **`ViewUsage`** in the ADP
  spreadsheet (like `ClientErrors` — PHI-free Timestamp/EmployeeId/View/Mode
  rows, auto-provisioned on the first view-enter after deploy; grows slowly,
  rate-capped 120/hr/rep; a retention window exists since 2026-09-11 —
  `VIEW_USAGE_RETENTION_DAYS`, default 0 = kept forever).
  Behaviour changes to expect post-deploy, all of them the point of the round:
  (a) **you may start receiving a "Client errors spiking" email** — sent only
  when ≥5 errors land within an hour, at most one email per 6h; a lone error
  still emails no one; (b) the Manage health dot / daily failure digest can
  now carry a "N client error(s) in the last 24h" line (threshold 10); (c)
  warn cards reps see (failed loads) now count in Admin → Automation Health →
  Client errors — an uptick after deploy is VISIBILITY of failures that were
  always happening, not new faults; (d) the three Call Notes digests (EOD /
  weekly queues / Urgent) arrive in the branded chrome with real buttons —
  the standing email spot-check applies (send yourself one); (e) Admin →
  Overview gains a **Feature usage** panel (per-tab opens 7d/30d + distinct
  reps + most-active reps) — this is the "what parts are priorities" answer,
  and it starts empty until reps navigate. View-as previews never count.
  **Post-deploy: run `runAllTests()`** as usual.
- **The 2026-08-13 follow-up round (image fallback + warehouse map) adds NO
  operator state to set up** — no triggers, no migrations, no API key, and
  deliberately NO billing (the operator constraint): the map block's whole geo
  stack is Apps Script's free built-in `Maps.newGeocoder()` (daily courtesy
  quota — the coordinate cache keeps steady-state use at ~one geocode per
  lookup) plus the keyless `output=embed` iframe. ONE auto-managed Script
  Property appears on first lookup: `KB_MAP_GEOCODE_CACHE` (warehouse
  lat/lng keyed by address hash — delete it to force re-geocoding after a
  warehouse moves; the rep's lookup query is NEVER stored in it or anywhere
  else). **To use the map: put a ` ```map ` fence in any Reference article**
  with one `wh| Name: Street, City, ST ZIP` line per warehouse — the
  addresses are authored in the article, so updating them is a normal KB
  edit. Behaviour change to expect post-deploy: **article images that
  previously showed only alt text + a Workspace "blocked" page now render
  inline for every rep** — the reader silently refetches a blocked Drive
  thumbnail through the server (`kbGetImageData`, scoped to the KB Images
  folder only). Nothing to configure; if Workspace link-sharing is ever
  allowed, the thumbnails load directly again and the fallback goes quiet.
- **The 2026-08-13 operator round adds NO new operator state to set up** — no
  triggers, no migrations; two AUTO-MANAGED Script Properties appear when
  first used (`CN_AUTO_TAG_RULES` — written by the Admin tab's new Auto-tag
  rules editor; the `IntakeFeedback` tab auto-provisions in the Intake
  spreadsheet on the first feedback). **One review item: the seeded auto-tag
  keyword list** (CONFIG `AUTO_TAG_RULES` — close-order / shipping / resupply
  / oop / billing / insurance / transfer / callback) is a starting point
  derived from the update-type vocabulary, editable live in Manage → Admin →
  Config → Auto-tag rules. Behaviour changes to expect post-deploy: (a) ⌘C
  with a real selection inside the note template copies the SELECTION; the
  full-template copy still fires when nothing is selected; (b) the internal
  email composer no longer pre-selects the last note's departments; (c) tags
  appear on their own as a rep types matching keywords — removable chips,
  and removing one stops that rule for the note; (d) the Dashboard metric
  cards paint as soon as the first period returns (YTD fills in a beat
  later as a skeleton swap); (e) a rep using the app mid-shift while not
  clocked in gets a once-a-day nudge; (f) intake emails carry a "Send
  feedback" button whose page requires an @umsupply sign-in, and feedback
  shows in the Intake Sent detail.
- **The colour palettes (operator 2026-08-12) add NO operator state** — no
  Script Properties, triggers, migrations or CONFIG constants; one per-browser
  localStorage key (`umsTheme`, taking the count back to 15) that each rep sets
  for themselves from the sidebar. Nothing is server-side, so there is nothing
  to configure and no way for one rep's choice to reach another. **Emails are
  deliberately unaffected** (`CN_EMAIL_PALETTE` is hand-resolved hex with no
  user context). Post-deploy: everyone stays on Console until they pick
  something else.
- **The 2026-08-12 operator round adds ONE optional CONFIG constant and removes
  one localStorage key** — no Script Properties, triggers, or migrations. New:
  `CONFIG.CDR_TRANSFER_TARGET_PCT` (default **20**) bands Transfer % on the two
  Dashboard metric cards. **This is the one number to confirm** — Transfer %
  had no threshold anywhere in the app before this, so 20 is a starting point,
  not a measured target; **set it to `null` to render Transfer % with no colour
  at all** rather than a verdict nobody chose. % Answered reuses the existing
  `CDR_ALERT_THRESHOLD` (85). Both require a redeploy to change (CONFIG, no
  Script Property override yet). Removed: `umsClockBg` — the clock-card
  background image is retired, so a rep who set one simply gets the sky back;
  the stored data-URL is orphaned in their browser and is cleared by the normal
  "clear browsing data" (it was never server-side). Behaviour changes to expect
  post-deploy: (a) both Dashboard metric cards **open on MTD**, not Yesterday;
  (b) Transfer % and % Answered are **colour-banded**, so a green card and a
  red card side by side is the banding working, not new data; (c) the MTD slide
  shows a per-KPI change **vs the prior month's same elapsed days** — the foot
  names the window ("vs Jul 1–23"), and volumes carry the arrow without a
  colour; (d) the `dash_metrics_v3` cache bump means the new cards appear
  within 5 minutes of deploy, not instantly; (e) **reminder toasts now stay
  until dismissed** — a break reminder still on screen an hour later is the fix,
  and the × clears it; (f) the clock card loses its image button and its moon.
- **The intake email restyle (operator 2026-08-11) adds NO new operator state**
  — no Script Properties, triggers, migrations or CONFIG constants; it changes
  `intakeEmailShell_`, the new shared `intakeSectionRowHtml_`, and the row
  styling in the PPD + PMD/PAP body builders. All three intake emails change
  appearance at once and now match the branded-notification and Call Notes
  mail. Recipients, attachments, recommendations and the PHI submission rows
  are untouched. **One transient effect worth knowing:** the PPD body feeds the
  preview→send `bodyHash` guard, so a rep who previewed BEFORE the new version
  went live and sends AFTER gets "The form changed since you previewed it" —
  the guard doing its job (INV-111); re-previewing clears it. **Post-deploy:
  send yourself one PPD and one PMD** and confirm the UMS mark loads — same
  standing spot-check as any email change.
- **Cycle 17 (top-5 + batches ②–⑦) adds NO new operator state** — no Script
  Properties, triggers, migrations, or CONFIG constants; every new response
  field is ADDITIVE (`skippedReps`, `partial`, `total`/`cap`, `warning`,
  `status` on search hits, `truncated` on the Spanish readers), so a
  not-yet-redeployed client renders as before.
  Behaviour changes to expect post-deploy: (a) warn toasts / `≥ N` badges /
  em-dashes / warn cards where silent zeros and clean-looking aggregates used
  to be — the INV-187 fixes reporting failures that were previously invisible,
  not new faults; (b) a mixed dept+'Other' email whose external half failed now
  reports success-with-warning instead of a failure that invited a duplicate
  re-send; (c) a department name containing a comma/semicolon is now REJECTED
  by the Admin editor (rename any existing such department first); (d) the
  intake Sent tab may show "server holds M total (list capped)" — the
  previously silent 100-row cap made visible; (e) time-off notes silently
  truncate at 1000 chars; (f) a multi-day Day Edit range apply is noticeably
  faster (one Timesheet read instead of ~124 — batch ⑥); (g) the Spanish tab
  may show "scan capped at 200 threads" on a busy window — the previously
  silent Gmail-search bound made visible. **Post-deploy: run `runAllTests()`**
  — incl. the not-yet-executed `test_updateTimeOff_mixedCaseStatusCell`
  follow-on if written at deploy time.
- **Cycle 16 (F1–F5, then Batch 4 + F9, then Batch 2 + Batch 3) adds NO new
  operator state** — no
  Script Properties, no triggers, no migrations, no new CONFIG constants. Four
  response fields are
  ADDITIVE (`notesUnavailable` on each `managerGetShiftStats` rep,
  `ptoUnavailable` on `getCoveragePlan`, `intakeCatalog` on
  `getAutomationHealth` — null on the badge/digest path, which is unchanged),
  and two existing fields
  (`teamTotals.noteCoverage`, `reps[].noteCoverage`) can now be `null` where
  every client consumer already guarded on `!= null` — so a client on a
  not-yet-redeployed server renders exactly as before. Deploys with the normal
  single `clasp push -f` + New version. **Post-deploy: run `runAllTests()`** —
  the Apps Script suite cannot execute off-editor, so scenarios S37 / S72 / S42
  rest on the Node pins until it is run. **ONE behaviour change an operator
  should expect:** on the manager Stats tab and the Coverage planner, a rep or a
  day whose underlying read failed now shows an em dash / a warning banner
  instead of zeros and a green all-clear. If "0 notes" rows or clean coverage
  days turn into dashes and warnings after this deploy, that is the fix
  reporting a failure that was previously invisible — investigate the rep's
  Sheet or the TimeOffRequests read, not the code.
  **A SECOND behaviour change from F9, and this one has an operator action:** an
  Offerings row whose column-C weight capacity is blank or non-numeric is now
  EXCLUDED from PPD recommendations instead of being offered to every patient.
  **Open the Offerings sheet and check column C** — that is what decides whether
  F9 was a live defect or a latent one, and after deploying, Manage → Admin →
  Automation Health → "Intake Offerings catalog" answers it for you (it names
  the exact sheet rows, and reports "all well-formed" when there is nothing to
  fix). If a chair stops appearing in recommendations after this deploy, that
  panel is the first place to look.
  **A THIRD and FOURTH behaviour change, both from the Batch 2 / Batch 3
  session, neither needing an operator action.** (a) Across nine tool partials,
  a failed load now renders a warn-toned card with a glyph instead of the quiet
  muted "nothing here" card — 28 sites, most visibly the Reference tree and the
  Ctrl/⌘+K drawer. Warn cards appearing where blank panels used to is the fix
  working, not a new fault; the underlying failure was always happening and was
  simply invisible. (b) **A department's average and median resolution time on
  Metrics → Dept Requests may CHANGE after this deploy**, because a resolved
  request whose `ResolvedAt` cell is blank or unparseable no longer contributes
  its (ever-growing) full age to those figures, and a whitespace-padded Status
  cell is now counted resolved by `deptStats` rather than open. Both are the fix
  reporting a corruption that was previously silently compounding; if the
  numbers move, look for a malformed row in the `DeptRequests` sheet, not at the
  code. Both sessions deploy with the same single `clasp push -f` + New version,
  and `runAllTests()` post-deploy matters slightly more now: F11 replaced a
  placeholder assertion in `test_metrics_getTeamMetrics_queueGrouping` that
  could never fail, and the corrected version has never actually executed.
- **Cycle 14 Phase 0 (CDR sub-queue discovery) adds NO new operator state** — no
  Script Property, trigger, migration, or CONFIG constant. But **the deploy IS
  the deliverable**: the queue inventory is how Phase 0 answers whether DQE
  carries a row per (agent, queue, date) or per (agent, date), and that answer
  decides whether the rest of the sub-queue feature can be built as designed.
  After deploying, open **Manage → Admin → Automation Health** and read the
  "Queue inventory · discovery" block. Two code-only constants
  (`CDR_QUEUE_SCAN_MAX`, `CDR_QUEUE_LIST_CAP`) bound the scan. One
  operator-visible cost note: the inventory runs whenever the Admin tab is
  opened (the Overview summary and the detail panels share ONE
  `getAutomationHealth` fetch by design), NOT on the 10-minute health-badge
  poll or the daily digest — those call `computeAutomationHealth_` directly and
  the scan is opt-in.
  **Phase 4 adds ONE optional Script Property, `CDR_QUEUE_GROUPS`** (see its own
  entry below) — optional because the four real departments ship seeded in
  CONFIG, so the "By department" mode works on deploy with no action. Phase 2
  adds none.
  **Phase 1 (transfer-only per-queue attribution) adds NO operator state
  either** — no Script Property, trigger, migration, or CONFIG constant, and
  deliberately NO queue→department grouping property (see the Phase 1 Key
  Design Decision for why that waits for Phase 2). Two code-only constants
  (`CSRT_QUEUE_COL_FIRST/LAST`) bound the H:R block. Its only visible effect is
  a **"Transfers by queue · in window"** list in the same Automation Health
  block, costing one additional read of the Transfer tab on that same
  Admin-tab open. **Nothing rep- or manager-facing shows queues yet** — the
  Metrics UI is Phase 2 and is unstarted.
- **Cycle 13 batch 3 changes ONE operator requirement (A5) and adds no other
  state.** An existing DEV project must add `INSTANCE_IS_PROD=false` — an unset
  value now reads as production, so without it `devScrubRoster_`/`devShowConfig_`
  refuse and the nightly self-test drops to smoke (and says so on the Admin
  self-test line). PROD is unaffected: with neither property set it behaves
  exactly as before. Nothing else in batch 3 or the follow-ons adds Script
  Properties, triggers, migrations, or CONFIG constants; two DEAD response
  fields were REMOVED (`getEmployeeState.annualPlannedUpcoming`,
  `getSpanishInboxStats.pendingList`) — neither had any client reader.
- **Cycle 13 batches 1–2 add NO new operator state** — no new Script
  Properties, no new triggers, no migrations, and no new CONFIG
  constants. Batch 2 (A4/A6/A8/A9) is server-helper + client-toast only; its one
  operator-visible effect is that the nightly `CallNotesArchive` audit row now
  stamps `hitPerRunCap` ONLY when an enrolled rep was left unvisited, so a clean
  final run of a draining backlog no longer reads as "still capped" (A9).
  Batch 1 is markup/CSS/ARIA plus one server-helper contract change. Both
  deploy with the normal single `clasp push -f` + New version.
  **Post-deploy: run `runAllTests()`** — `timeToMins_nullOnUnparseable` executes
  only in the editor, alongside cycle 12's still-unrun
  `cn_enrolledSheetId_trimsAndNullGuards` and `cn_appendBounded_capsAndRollsBack`.
  **ONE behaviour change an operator should expect:** a Timesheet row whose TIME
  cell is blank or unparseable (only reachable by a hand edit — the guarded
  writers cannot produce one) now renders as an INCOMPLETE day and is excluded
  from Punctuality, instead of silently scoring that day "on time" and turning
  the timesheet's total hours into `NaN`. If a rep's incomplete-day count rises
  after this deploy, the fix is to correct the offending cell (Manage → Day
  Edit), not to re-check the code.
- **The WHOLE of cycle 12 (all six batches) adds NO new operator state** — no
  new Script Properties, no new triggers, no migrations. Code-only CONFIG
  constants: `TS_DOCTOR_FIX_MAX_ROWS`, `TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN`,
  `CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN`, `SELF_TEST_STUCK_MS`,
  `CN_SUBFORM_MAX_CHARS`, `CN_FEEDBACK_MAX_ENTRIES`,
  `CN_EXTERNAL_EMAILS_MAX_ENTRIES`, `DR_LIST_CAP`, `KB_REVIEW_DUE_CAP`,
  `SPANISH_PENDING_LIST_CAP`. Every new endpoint field is ADDITIVE
  (`archivedRowCount`, `truncated`, `remaining`, `noteCountUnavailable`,
  `mineTotal`/`incomingTotal`/`allOpenTotal`/`listCap`, `total`/`cap`,
  `running`/`startedAt`/`stuck`) — a client on a not-yet-redeployed server
  renders exactly as before, which was verified per batch, and each client
  render is guarded so a missing field shows nothing rather than "of undefined".
  Deploys with the normal single `clasp push -f` + New version.
  **Post-deploy: run `runAllTests()`** — the F3 bounded-move behavioural case,
  the F2 detector contract, the F6 cache-reset effect and the two NEW smoke
  tests (`cn_enrolledSheetId_trimsAndNullGuards`,
  `cn_appendBounded_capsAndRollsBack`) execute only in the editor.
  **Three BEHAVIOUR changes an operator should expect:** (a) on a small team the
  anonymized team line may now be hidden on days it previously showed (F4 — the
  INV-124 cohort no longer counts roster rows with no email); (b) every modal's
  primary button is now `--accent` green instead of near-black/near-white (V-8 —
  one shared class, ~25 call sites); (c) the sidebar and mobile nav now show
  SHORT tool labels ("Notes", "Training") with the full label on hover (V-5/6/7
  — nothing ellipsises at the default width and the nav no longer shifts 11px
  when entering Training & Employee Docs).
- **The 2nd-pass design batch (pop-up fixes, email styling, loader + motion
  system, Admin consolidation, §6 settle) ALSO adds no new operator state** —
  no Script Properties, triggers, or migrations; client CSS/JS + `Code.js`
  email-builder restyle only. Deploys with the same single `clasp push -f` +
  New version. **Post-deploy spot-check the emails** (Call Note + PPD) — the
  HTML-email restyle can't be verified in CI. The 2nd-pass spec lives in
  `docs/design_handoff_team_tools_redesign_update/` (`loaders_and_motion.md`,
  `email_styling.md`, `popups_addendum.md`).
