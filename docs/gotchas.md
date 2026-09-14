# Common Gotchas — full entries

Moved VERBATIM out of CLAUDE.md by Batch D2 (2026-09-14). Nothing was
rewritten: the section had grown to 2,124 lines, long enough that a reader
looking for "does this bite what I am about to change?" stops reading. CLAUDE.md
keeps the RULE, the TRIGGER and a pointer here, grouped by family and ordered by
how often a change hits it; this file keeps every word of the reasoning, the
incident that produced it, and the pin that holds it.

Order here is the ORIGINAL document order, so a `git log -L` on the old section
still reads straight. The index is CLAUDE.md's `## Common Gotchas`.

---


<a id="g00-cdr-duration-columns-must-use-getdisplayvalues"></a>

- **CDR duration columns MUST use `getDisplayValues()`.** The CDR
  Report spreadsheet has a timezone mismatch (spreadsheet TZ
  `America/Mexico_City` vs script TZ `America/Chicago`). Duration
  columns (TTT col I, ATT col J) get a phantom offset if read via
  `getValue()`. (`AvgAbdWait` col AG / `CsrAvgAbdWait` col AH are also
  duration columns but were removed from the `CDR` enum as unused — if
  you ever wire them in, they MUST use `getDisplayValues()` too.) `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()`
  both read the full range with `getDisplayValues()` and parse the
  H:MM:SS strings via `cdrParseHms_()`. Never use `getValue()` for
  these columns. Same gotcha exists in `call-data-reporting`'s
  `Data.gs` — see that repo's CLAUDE.md for the full explanation.

<a id="g01-dqe-has-one-row-per-agent-date"></a>

- **DQE has ONE row per (agent, date) — per-queue rep metrics do not exist
  (cycle-14 Phase 0).** Measured against the operator's live sheet, not
  assumed. Two consequences worth knowing before anyone re-opens this:
  (a) `answered`/`missed`/`% answered`/talk-time can never be broken down by
  queue, because the row carrying them is not queue-scoped; (b) **`CDR.QUEUE_EXT`
  (col 4) is NOT a queue key** — it holds comma-separated MEMBERSHIP lists
  (`103,108`, and `108,103` / `103,138,108` — the same sets in different
  orders), i.e. which extensions an agent covered that day. It is a dimension
  of the AGENT, not of the call, and anything reading it must treat it as an
  unordered set. Per-queue attribution exists only for TRANSFERS — see the
  Phase 1 Key Design Decision. The `A_Q_*` queue-aggregate rows
  `isCdrQueueSentinel_` skips are real but far too sparse to build a series on
  (8 queues / ~12 rows in a week).

<a id="g02-a-diagnostic-that-can-never-be-clean"></a>

- **A diagnostic that can never be clean is worse than none — the CDR
  name-match card (cycle 15).** Both roster↔CDR mismatch directions are
  PERMANENTLY non-empty on this deployment, so neither can drive a status
  card: `unmatchedAgents` lists every CDR agent not on our roster, but the CDR
  Report covers the WHOLE phone system (it is owned by `call-data-reporting`)
  while our roster is one team — **there is no department filter;
  `CONFIG.CDR_DEPARTMENT` is declared and read NOWHERE** (its only other
  mention was a `getCdrAgentMetrics_` doc comment claiming it filtered, now
  corrected). Reported 78 strangers in practice. The reverse list
  `rosterWithNoCdr` fails identically: the roster set is every NAMED employee
  row, so managers, admin staff, and anyone on PTO across the whole window are
  in it forever — swapping the tone to it just moves the always-amber problem.
  The **intersection** is the signal: a roster rep with no call data whose name
  resembles an unmatched CDR agent is one person spelled two ways, which means
  their calls are silently missing from every metric. `cdrLikelyNameMismatches_`
  (pure, Node-pinned) pairs them on **normalized-equal OR ≥2 shared name
  tokens** — two, not one, because a shared surname is a coincidence on any
  real roster; a nickname sharing only a surname ("Robert Smith" vs "Bob
  Smith") is a deliberate false NEGATIVE, since under-reporting is the safe
  direction for something that raises a warning. That set is normally EMPTY,
  so the card reaches green, and it names the exact `Agent Alias Overrides`
  row to add. **The general rule: before toning a health indicator off a
  count, ask what that count reads on a healthy production system — if the
  answer is not zero, it is reference detail, not a signal.**

<a id="g03-roster-inclusion-goes-through-emprosteremail-row-the"></a>

- **Roster INCLUSION goes through `empRosterEmail_(row)` — the one predicate
  (cycle-15 F3).** Offboarding here means clearing the email while KEEPING the
  name, so a name-only row is not a person to count. FOURTEEN walks each decided
  that for themselves and did not agree: NINE tested raw truthiness
  (`if (!rows[i][EMP.EMAIL]) continue;`), THREE trimmed, and TWO tested nothing.
  A WHITESPACE-ONLY email cell therefore made the first two groups DISAGREE —
  the identical shape column L had before `cnEnrolledSheetId_` (INV-167), on a
  second column. The un-guarded pair mattered unequally: `getTeamMetrics` ACTS
  on it (its gate is `if (cdr || noteCount > 0 || …)`, and an offboarded name
  still matching DQE history satisfies it, so a departed employee got a full row
  in the manager's team table AND their volume flowed into `teamTotals`), while
  `getPunctualityReport` was harmless only by coincidence downstream
  (`if (!dates.length) return` drops a rep with no punches). The predicate
  returns the TRIMMED email or `''`, so it can only NARROW the nine raw call
  sites — the correct direction, matching INV-167's resolution. It is NOT an
  authorization check; `getEmployeeInfo_` still identifies the caller. Pinned by
  the F3 tripwire, which bans the raw guard shape ANYWHERE in the server source (derived,
  not a hand list — INV-179) rather than enumerating today's fourteen walks.

<a id="g04-a-declared-but-unread-config-key-enum"></a>

- **A declared-but-unread CONFIG key / enum member is a defect, not clutter
  (cycle-15 F1/F2).** The next reader assumes it is wired. Removed:
  `CDR_DEPARTMENT` (whose `getCdrAgentMetrics_` doc comment CLAIMED it filtered
  the read — it never did; there is no department filter, which is why the CDR
  name-match diagnostic is permanently non-empty), `TRAINING_DIGEST_WEEKDAY` /
  `REVIEW_DIGEST_WEEKDAY` (the weekly-digest trigger hardcodes
  `ScriptApp.WeekDay.FRIDAY`, so editing these was a SILENT no-op for an
  operator trying to move the digest), and `CALL_NOTES.SUBFORM_COL_JSON` (a
  toggle that never existed). `EOD_WARNING_WINDOW_MINUTES` is deliberately
  retained and is now marked `DEAD` at its declaration — the allowlist entry in
  the F1 tripwire REQUIRES that marker, so "retained on purpose" and "forgotten"
  stay distinguishable. Same class in the enums: `CDR.QUEUE_EXT` was read by
  cycle-14 Phase 0 yet stayed dead because the read used bare positional
  offsets — now DERIVED from the enum, so the read follows a column move
  instead of silently reading its neighbour. **Col 4 remains the one CDR column
  absent from `CDR_EXPECTED_HEADERS`, deliberately and temporarily:** that
  validator substring-matches, so an entry whose text is not in the real header
  raises a FALSE "Column drift" warning and flips the CDR health card amber —
  the same always-wrong-signal class this cycle removed. The real col-4 header
  text in the `call-data-reporting`-owned sheet has never been recorded, and
  guessing it is worse than the gap. **Operator: read the col-4 header off the
  DQE tab and add `4: '<that text>',`** — a one-line close. Exposure meanwhile
  is small (an INSERT at col 4 shifts 5..10 and IS caught; only an in-place
  repurpose slips through, into a manual diagnostic rather than a metric).
  Pinned by the F1 tripwire (every CONFIG key has a reader, allowlist must
  self-declare).

<a id="g05-cdr-enrichment-in-managergetshiftstats-is-best-effort"></a>

- **CDR enrichment in `managerGetShiftStats` is best-effort.**
  The CDR overlay that adds `cdr` and `noteCoverage` fields to each
  rep's shift-stats card is wrapped in a try/catch. If the CDR
  spreadsheet is unreachable (missing `CDR_SS_ID` Script Property,
  deployer account lost access, etc.) the existing call-notes stats
  still return normally — the `cdr` field is simply absent. Client
  rendering checks `r.cdr` before showing CDR rows.

<a id="g06-secrets-via-script-properties-not-config"></a>

- **Secrets via Script Properties, not CONFIG.** `getAdpSS_()`,
  `getCdrSS_()`, `getManagerEmails_()`, `getDepartmentEmails_()`, and
  `getStateTaxRates_()` read `ADP_SS_ID`, `CDR_SS_ID`,
  `MANAGER_EMAILS`, `CN_DEPARTMENT_EMAILS`, and
  `CN_STATE_TAX_RATES` from Script
  Properties first, falling back to the CONFIG placeholders.
  Set the real values once in Apps Script editor → Project Settings
  → Script Properties (or use the Admin tab for dept/rate config);
  clasp pull/push leaves Script Properties untouched, so the
  committed server source never has to be scrubbed.
  Projects that haven't migrated can still set CONFIG values directly,
  but then every clasp pull will pull real values and require a scrub
  before commit.

<a id="g07-script-properties-are-capped-9kb-per-value"></a>

- **Script Properties are CAPPED — ~9KB per value, 500KB per store — and the
  advertised entry caps were never the binding constraint (Batch Q, 2026-09-11).**
  `saveEmailTemplates` admits 50 templates × 4000 chars, i.e. ~200KB into a slot
  that holds ~9KB; `saveQaScorecardCriteria`, `saveBreakSchedules`,
  `saveUpdateSuggestions` and ten more are the same shape. A `setProperty` past the
  cap throws, and every one of those endpoints writes its `AdminConfigChange` audit
  row BEFORE the save returns — so the operator saw an opaque platform error with an
  audit row claiming the change landed. **`propSetBounded_(key, value, opts)` is the
  ONE writer for every JSON-blob property**, and the split is deliberate: the 14
  OPERATOR-edited blobs **REFUSE by name with nothing written** (the error names the
  key, the byte size, the cap and what to shorten — there is a person to tell, so
  telling them beats guessing what to drop), while the 6 AUTO-MANAGED blobs
  **DEGRADE** through a caller-supplied shrinker (`propShrinkDropOldest_` for the
  stamp maps, `propShrinkStripFields_` for the self-test result, two custom ones) —
  nobody is watching a heartbeat write, so refusing would just lose it. **Size is
  measured in BYTES via `utf8Len_`, never `.length`:** a JS string length counts
  UTF-16 units, so it under-counts every non-ASCII character (an emoji in a template
  is 4 bytes, not 2). Three rules for anything new: (a) a blob write goes through the
  helper — the Q-1 pin is DERIVED, so a bare `setProperty` of a known blob key fails
  CI; (b) a SCALAR write (a day count, a dollar cap, a model key, a folder id, a
  generation counter) may stay on `setProperty` but must be allowlisted BY NAME with
  a reason; (c) a degrade that cannot shrink **deletes the property and logs why**
  rather than leaving a stale value — every degrade target is a cache or heartbeat
  that regenerates, and "no heartbeat recorded yet" is honest where a frozen old
  stamp is not. `propShrinkDropOldest_` drops oldest-first UNTIL IT FITS rather than
  one entry per call, because a caller's retry loop is a safety net and a large map
  would exhaust it and clear the property. See INV-201.

<a id="g08-a-test-function-defined-twice-silently-wins"></a>

- **A test function defined TWICE silently wins, and the registration count stays
  right (Batch S, 2026-09-11).** `Tests.js` is one file of top-level `function
  test_X()` declarations; a second declaration of the same name HOISTS OVER the
  first, so both registrations run the later body, the earlier test's assertions
  never execute, and the summary still reports the full count — the failure is
  invisible in every direction a reader looks. It fired: #239 added
  `test_triggerGate_weeklyDigests_nonManagerThrows` for the `runWeeklyDigests`
  DISPATCHER beside the existing one for `sendCallNotesWeeklyDigests`, so that
  digest's own gate went unverified while the suite read a clean 315. The dispatcher
  test is `test_triggerGate_runWeeklyDigests_nonManagerThrows` now, and the S1/S4
  pin fails CI on ANY test function defined twice — the net, not the rename.

<a id="g09-sheets-coerces-true-false-strings-to-native"></a>

- **Sheets coerces `'TRUE'`/`'FALSE'` strings to native booleans.** On
  write, `setValue('FALSE')` stores boolean `false`; on read,
  `getValues()` returns the boolean. Naive `String(value || '').trim()`
  then short-circuits `false` to `''` and downstream `=== 'false'`
  checks miss — `ptoEnabled` defaulted to TRUE for contractors marked
  FALSE until this was fixed. Always handle null/undefined/`''`
  explicitly before stringifying any TRUE/FALSE column.

<a id="g10-sheets-auto-coerces-hh-mm-ss-strings"></a>

- **Sheets auto-coerces `HH:mm:ss` strings to Date objects.** On
  read, `row[ADP.TIME]` may come back as a JavaScript Date —
  `String(date)` produces `"Sat Dec 30 1899 ..."` and breaks all
  downstream display logic. Always read times through
  `normalizeTime_()`, which detects Dates and re-formats them via
  the spreadsheet's timezone.

<a id="g11-auditlog-timestamp-cells-coerce-to-dates-too"></a>

- **AuditLog timestamp cells coerce to Dates too — read via
  `normalizeAuditTs_()`.** `writeAuditLog_` appends a
  `yyyy-MM-dd HH:mm:ss` string (CONFIG.TIMEZONE wall time) that Sheets
  coerces to a datetime; `String(cell)` yields `"Tue Jun 10 2026 ..."`,
  which silently fails every `substring(0,10)` date filter and
  `convertAuditTs_` parse. The compliance audit panel returned ZERO rows
  in this state until the first full `runAllTests` exposed it.
  `getManagerDashboard` (recent audits), `cnReadCallNoteAuditRows_`, and
  `getAutomationHealth` all route through `normalizeAuditTs_` now —
  any new AuditLog timestamp read must too. **The AuditLog's OTHER coerced
  columns bit the same way (cycle 7 M-3/M-4):** the `PunchTime` cell (col 7,
  written `HH:mm:ss`) coerces to a time-of-day Date — read it via
  `normalizeTime_` (a raw `String()` rendered a constant "12:00 AM" in the
  manager Recent Activity feed) — and `IsAdjustment` (col 8, written
  `'TRUE'`/`'FALSE'`) coerces to a native boolean, so `String(x) === 'TRUE'`
  is always false (compare case-insensitively; the ADJ badge + adjustment
  reason never rendered until fixed). **The `PunchDate` cell (col 5, written
  `yyyy-MM-dd`) coerces to a Date the SAME way (F cycle-8):**
  `cnReadCallNoteAuditRows_` read it raw into `dateLocal`, so the compliance-panel
  "View note" deep-link handed a `"Wed Jul 15 2026 …"` string to
  `managerGetCallNotes` (whose `^\d{4}-\d{2}-\d{2}$` guard rejects it) → the
  drill-through silently died while the panel looked fine (the visible timestamp
  uses the correctly-normalized `timestampMgr`). Now read via `normalizeDate_`,
  matching `getManagerDashboard`'s col-5 read; pinned by a `dateLocal`-shape
  assertion in `test_auditPanel_searchAndHistory`. **Batch 3 (cycle-8) gave the
  AuditLog the named `AUDIT` column enum it lacked plus a single typed reader
  `auditRowObj_(row)` — the ONE coercion-recovery point (TS / PunchDate /
  PunchTime / IsAdjustment recovered once via the normalize helpers). All four
  AuditLog readers now route through `AUDIT.*` (the two coerced-column readers,
  `getManagerDashboard` + `cnReadCallNoteAuditRows_`, via `auditRowObj_`; the two
  non-coerced ones, `computeAutomationHealth_` + `adminSheetView`, via `AUDIT.*`
  for TS/action/name/notes). A GLOBAL Node tripwire (the INV-142 pattern) now
  fails CI on ANY raw read of a coerced `AUDIT` column outside `auditRowObj_` —
  the F1-catching net the old per-function M-3/M-4 tripwire (replaced) couldn't
  provide. NEW AuditLog reads must go through `auditRowObj_`, never a bare index
  (`auditData[i][5]`) — the bare-index style was the root cause F1 exposed.** The
  SAME class applies to
  every other `yyyy-MM-dd HH:mm:ss` column in the ADP spreadsheet:
  `TO.SUBMITTED_AT` (a raw `String()` read flattened the manager
  pending-trend sparkline to zero since it shipped, and it doubles as
  the row-match key for `updateTimeOffStatus` / `cancelTimeOffRequest` —
  BOTH the key-producing reads and the matchers normalize identically)
  and `PAR.SUBMITTED_AT` (sort/display). A Node tripwire fails CI on any
  raw `String(rows[i][TO|PAR.SUBMITTED_AT])` read in the server source / `Tests.js`.

<a id="g12-cn-coercion-recovery-formats-in-the-host"></a>

- **CN coercion recovery formats in the HOST sheet's own tz — a drifted
  per-rep sheet tz no longer breaks note reads (Part A, operator
  2026-08-27).** A coercing sheet interprets stored digits in ITS OWN tz, so
  recovery must format in that SAME tz or the digits shift by the tz delta.
  This bit LIVE twice at once: the operator's per-rep sheet (tz
  America/Chicago) coerced a `…T14:16` timestamp to 14:16 Chicago, and the
  old recovery in the ADP tz (Asia/Kolkata) displayed it as **1:46 AM the
  next day**; a PH rep's `DateLocal` (midnight Asia/Manila) recovered in IST
  as **21:30 the previous day**, so their just-logged note vanished from the
  rolling stack and surfaced under yesterday in History. (The first diagnosis
  — a blank roster Timezone cell — was FALSIFIED by the operator checking
  column H; the write side was always correct, the stored strings were never
  wrong, only the read-side recovery tz was.) Now: `getCallNotesSheet_` (the
  single per-rep opener, INV-167 boundary) memos the host sheet's tz per
  execution (`cnHostTz_`, degrading to the ADP tz on a failed read — the
  pre-fix behavior, never worse); `cnTimestampString_` and the new
  `cnDateLocalString_` (the CN twin of `normalizeDate_`, swapped in at all
  26 CN-region `CN.DATE_LOCAL` sites) format in it. Round-trip holds BY
  CONSTRUCTION for any sheet tz — a no-op on pinned sheets, and it
  retroactively corrects the DISPLAY of every historical note on a drifted
  one. "Last-opened wins" is safe: every cross-rep walk converts rows INLINE
  within its own rep's iteration (verified). `provisionCallNotesSheet` /
  `setupTestEnvironment` still pin new sheets to the ADP tz (defense in
  depth — non-CN consumers like `parseRetentionDateMs_`'s purge windows
  still assume it, an accepted off-by-hours on day-granularity windows).
  Pinned by PTA-1/2/3 (both symptoms driven against a real Intl oracle +
  a derived ban on `normalizeDate_` over `CN.DATE_LOCAL`).

<a id="g13-sheet-locale-not-just-timezone-can-coerce"></a>

- **Sheet LOCALE (not just timezone) can coerce stored ISO-T strings to
  Dates — and `SpreadsheetApp.create()` inherits the SCRIPT tz + deployer
  locale.** Two sides of one class (cycle 7 H-2/M-14): (a) some locales
  coerce the `yyyy-MM-dd'T'HH:mm:ss` form on read (the reason
  `formTokenCellMs_` exists) — the CN `Timestamp` column now routes through
  `cnTimestampString_` (recovers a coerced Date back to the as-written
  T-form digits **in the HOST sheet's own tz** — Part A 2026-08-27, see the
  host-tz gotcha above; raw `String()` silently broke sorting/shift-span/EOD
  displays and FAIL-OPENED the 5-min delete window); Storage Health surfaces
  each store's locale with a warn pill when it differs from the ADP sheet's.
  (b) `createPinnedSpreadsheet_(name)` is the ONLY sanctioned way to create
  a spreadsheet — it pins BOTH tz and locale to the ADP sheet's (a bare
  `SpreadsheetApp.create()` inherits the script tz `America/Chicago`, which
  shifted raw coerced Date/time cells copied into the ADP payroll export).
  A Node tripwire fails CI on any bare `SpreadsheetApp.create(` outside the
  factory and pins the factory's tz+locale calls + the three call sites
  (export, CN export, provisioning).

<a id="g14-timesheet-rows-are-in-append-order-not"></a>

- **Timesheet rows are in APPEND order, not time order.** A same-day
  back-fill (approved adjustment request, manager Day Edit add,
  employee immediate-adjust) appends its row AFTER later punches, so
  raw sheet order scrambles any "last punch wins" / state-machine
  consumer — live status read "On Lunch" after a rep had clocked out
  until this was fixed. `getTodayPunches_` and `getManagerDashboard`'s
  per-emp collector now sort chronologically at the source (normalized
  `HH:mm:ss` strings, lexicographic = chronological); `getTeammateStatus`
  max-time-selects. Any NEW consumer of same-day punch rows must sort
  by time (or reuse `getTodayPunches_`) — never derive order from raw
  row position. Pinned by `test_getTodayPunches_sortsOutOfOrderBackfill`.

<a id="g15-the-live-punch-path-enforces-the-client"></a>

- **The live punch path enforces the client's own state machine; Day Edit
  reconciles duplicates (cycle-10 M-1).** `recordPunchCore_`'s live (non-adjust)
  path (the guarded body behind the public `recordPunch` wrapper since
  2026-08-17 — the wrapper attaches a fresh `state` AFTER the lock releases so
  a punch confirms in ONE round trip) validates the punch type against `getNextActions_(todayPunches)` —
  the SAME function the client renders its buttons from — so a STALE window
  (second browser / pinned pop-out that missed a punch made elsewhere, or a
  direct RPC) can no longer append a duplicate ClockIn/ClockOut or an
  out-of-sequence lunch punch. A fresh client is never rejected; multi-lunch
  stays legal (LunchOut is re-offered after LunchIn); adjustments bypass (their
  own window/format guards apply); the guard runs AFTER the min-interval check
  so rapid-fire keeps its friendlier error. For rows that predate the guard:
  `findExistingPunch_` returns the LAST matching row (agreeing with
  `managerSaveDay`'s snapshot — first-match updates used to land on a
  different row than the one displayed), and `managerSaveDay` snapshots ALL
  rows per type — a blank slot deletes EVERY row of that type, a kept slot
  collapses extras to the displayed (last) row with `duplicate collapsed`
  audit rows (the S7 full-day-reconcile contract; note this also collapses a
  legitimate multi-lunch day to the 4 displayed slots — the modal can only
  express one pair). RELATED DECISION (C3, retracted finding): `calcHours_`'s
  overnight wrap (`out <= in` → +24h) is DELIBERATE, pinned by
  `test_calcHours_overnight` — it trades mis-keyed AM/PM pairs rendering as
  long days for same-date overnight pairs computing correctly; don't "fix"
  one direction without an operator decision. Pinned by
  `test_recordPunch_liveSequenceGuard` +
  `test_managerSaveDay_collapsesDuplicateRows` + the M-1 Node pins.

<a id="g16-cn-date-local-is-a-sheets-coerced"></a>

- **`CN.DATE_LOCAL` is a Sheets-coerced Date on read.** The
  `DateLocal` column is written as a `yyyy-MM-dd` string but Sheets
  coerces it to a Date object on read, so `String(row[CN.DATE_LOCAL])`
  produces a JS Date `toString` that never matches a `yyyy-MM-dd`
  comparison. Always read it via `cnDateLocalString_` (the host-tz CN twin
  of `normalizeDate_` since Part A 2026-08-27 — `normalizeDate_` formats in
  the ADP tz, which shifted a Manila-coerced midnight a day back). The
  Metrics module (`getMyMetrics` / `getTeamMetrics`) regressed on the raw
  read — note coverage silently reported 0 — fixed in cc58d53. Every
  CN-region `CN.DATE_LOCAL` read routes through `cnDateLocalString_`
  (a PTA-3 derived scan bans `normalizeDate_` over that column); ADP/TO/
  PAR/AUDIT date reads keep `normalizeDate_` — the ADP sheet is its own
  host.

<a id="g17-scriptlock-around-every-mutating-op"></a>

- **ScriptLock around every mutating op.** Every server function
  that writes to a sheet (`recordPunch`, `submitTimeOffRequest`,
  `updateTimeOffStatus`, `deletePunch`, `managerSaveDay`,
  `cancelTimeOffRequest`, `managerSubmitTimeOff`, `selfDeletePunch`)
  wraps its body in `LockService.getScriptLock().waitLock(15000)`
  and releases in `finally`. Skipping the lock causes interleaved
  approvals to double-deduct PTO balances.

<a id="g18-normalizetype-strips-the-adj-prefix"></a>

- **`normalizeType_` strips the `ADJ-` prefix.** Adjustments are
  stored in the COMMENTS column as `ADJ-ClockIn` / `ADJ-LunchOut` /
  etc. Reading `row[ADP.COMMENTS]` directly and comparing to
  `'ClockIn'` will silently miss adjustments. Always go through
  `normalizeType_()`.

<a id="g19-roster-cache-invalidation-key-bump"></a>

- **Roster cache invalidation + key bump.** Employee data is cached
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v11`).
  After editing any Employees-sheet column (`adjustLeaveBalance_`,
  manual edits for test setup, etc.) call `invalidateRosterCache_()`
  or subsequent reads will return stale balances for up to 5
  minutes. Whenever the `EMP` enum changes shape (new column),
  bump the cache key — old cached entries would have wrong column
  indices.

<a id="g20-ptoenabled-defaults-to-true"></a>

- **`PtoEnabled` defaults to TRUE.** Column K (`EMP.PTO_ENABLED`)
  defaults to enabled when blank — for back-compat with rows
  added before the column existed. Someone who earns no paid leave at all
  needs an explicit `FALSE` / `no` / `n` / `0` in this
  column — note this is NOT the same as "does not get a fixed annual
  allotment": an ACCRUING rep (roster column Q, INV-194) must stay `TRUE`,
  or the accrual credit skips them entirely. The PTO UI then hides for them entirely (employee Calendar
  ring, decision email balance line, etc.). **The per-row gate also
  guards the DEDUCTION, not just display** — `adjustLeaveBalance_`
  returns `null` (no change) for a `FALSE` employee even when the
  global `enablePtoTracking` flag is on, so approving / manager-filing
  a request for a contractor can't drive their balance negative. (Until
  the M-1 fix the deduction gated only on the global flag, silently
  contradicting S15; the read-side `getEmployeeInfo_`/`lookupEmployeeById_`
  parse the same coercion-safe `FALSE`/`no`/`n`/`0` values.)

<a id="g21-sick-leave-is-ui-removed-but-backend"></a>

- **Sick leave is UI-removed but backend-dormant (deferred #2 / C1).**
  `'Sick Leave'` was dropped from `TIME_OFF_TYPES` (and the `day-type`
  `<select>` options), so no NEW sick request can be created — via the UI
  picker OR a direct `submitTimeOffRequest`/`managerSubmitTimeOff` RPC
  (`isValidTimeOffType_` rejects it, INV-95). But the SICK BACKEND IS KEPT
  ON PURPOSE: `getLeaveDeduction_`'s `sick` mapping (+ its mirror
  `LEAVE_DEDUCTION_CLIENT`), `adjustLeaveBalance_`'s sick column (J), the
  PTO-reconciliation sick handling, and roster column J all stay so
  historical Approved-sick rows still revert/reconcile to the SICK bucket.
  Removing them would silently restore legacy sick reverts into the ANNUAL
  bucket (a balance-corruption regression). Treat the sick path as
  read/revert-only legacy — don't re-add `Sick Leave` to `TIME_OFF_TYPES`
  without re-deriving this.

<a id="g22-a-test-fixture-that-writes-directly-to"></a>

- **A test fixture that writes DIRECTLY to a store behind a RESULT CACHE owes
  the production writer's invalidation (operator run, 2026-08-19).** The
  2026-08-18 load-time round gave `getDeptRequests` a per-caller CacheService
  result cache keyed by a generation salt that its two PRODUCTION writers bump
  (`emailFromCallNote`'s auto-log append and `markDeptRequestResolved_`).
  `test_deptReq_incomingAndMemberResolve` builds its fixture by appending a row
  to the `DeptRequests` tab directly — a path production never takes — so no
  bump happened, and the read-back was served from the entry the omnibus gate
  test had warmed for that same employee minutes earlier. Red suite, correct
  code: the FIXTURE was stale, not the endpoint. It sat undetected because the
  editor suite had not been run since the cache shipped. The fix is one line
  (`drBumpCacheGen_()` between the append and the read, and again after the
  cleanup delete), and the general rule is the one this entry's title states —
  when you add a result cache, check whether any test writes to that store
  outside the endpoints you just taught to invalidate it. Pinned by an
  ordering assert (bump strictly between the append and the read — a bump only
  in `finally` is too late, which is how the first version of the pin failed to
  bite).

<a id="g23-test-override-email-only-intercepts-getactiveuseremail"></a>

- **`_TEST_OVERRIDE_EMAIL` only intercepts `getActiveUserEmail_()`.**
  Any code path that calls `Session.getActiveUser()` directly will
  bypass the test impersonation and use the real running user.

<a id="g24-test-prefix-is-the-cleanup-key"></a>

- **`TEST_` prefix is the cleanup key.** `cleanupTestData()` deletes
  every row in Timesheet / TimeOffRequests / AuditLog whose
  employee ID starts with `TEST_`. Production employee IDs must
  never start with `TEST_`. **The test ACCOUNTS live offboarded between
  runs (operator 2026-08-17):** with real agents on the app, an enrolled
  TEST_ account renders beside them on every team surface, so the operator
  offboarded them in the app — which clears ONLY the email (INV-183), and
  `setupTestEnvironment`'s old ID-keyed dedupe then never repaired them:
  every email-keyed impersonation resolved to null and 119 integration
  tests cascaded to "Employee not found." Now SYMMETRIC and self-healing:
  setup RE-ONBOARDS its rows (restores the canonical email when the cell
  disagrees) and cleanup RE-OFFBOARDS them at the end of every run, so the
  test accounts exist for the ~6 minutes of a run and are invisible
  everywhere `empRosterEmail_` guards otherwise. Offboarding them by hand
  is therefore always safe — the next run repairs itself. Pinned by the
  re-onboard/re-offboard Node pin. **The admin tier has the same shape since
  2026-09-11:** a narrowed `ADMIN_EMAILS` gets the test manager APPENDED for
  the run and stripped after (INV-21; the operator's real list is never
  touched).

<a id="g25-manager-only-operations-check-calleremp-ismanager"></a>

- **Manager-only operations check `callerEmp.isManager`.** Any new
  manager-gated endpoint MUST start with the same check used by
  `getManagerDashboard`, `updateTimeOffStatus`, `deletePunch`,
  `managerSaveDay`, `exportAdpRange`,
  `managerSubmitTimeOff`, `getEmployeesList`,
  `getEmployeeTimesheetForManager`, `managerGetCallNotes`,
  `managerSearchCallNotes`, `managerGetTrainingQueue`,
  `managerGetReviewCandidates`, `getEnrolledCallNotesReps`,
  `exportCallNotesRange`, `setCallNoteTrainingReply`,
  `managerGetShiftStats`, `managerGetUnresolvedActionCount`,
  `managerDeleteCallNote`,
  `getAutomationHealthBadge` (the shell health dot — batch K),
  `getTimesheetDoctor`, `fixTimesheetDuplicates` (the sheet doctor — INV-159),
  `getTeamMetrics` (since 2026-08-18 reps get the stripped team AGGREGATE —
  INV-66; the per-rep rows + diagnostics remain manager-only), `getMetricsAmbient`, `getIntakeVolumeStats`
  (the batch-6 intake-volume table, 2026-08-25), `getCoveragePlan`,
  `getTeamCalendar` (the Manage Time team-punches calendar, 2026-08-31),
  `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`,
  `saveUpdateSuggestions`, `removeAutomationTriggers`,
  `getCallNotesTagTaxonomy`, `getCallNotesTagTrends`, `renameCallNoteTag`,
  `mergeCallNoteTags`, `archiveCallNoteTag`,
  `saveEmailTemplates`, `getCallNotesAuditLog`,
  `getCallNoteAuditHistory`, `getPtoReconciliation`,
  `fixPtoReconciliation`, `getFeatureFlags`, `saveFeatureFlags`,
  `managerGetPendingAdjustments`, `updatePunchAdjustStatus`,
  `updatePunchAdjustStatusBulk` (the multi-select approve, operator 2026-09-03 —
  both delegate to the private `punchAdjustDecideAll_`),
  `managerSaveDayRange`, `setCallNoteManagerComment`, `reconcileCallNotes`,
  `getCallNotesEnrollment`, `provisionCallNotesSheet`, `getAutomationHealth`,
  `getStorageHealth`, `getDeployReadiness`, `getAdminSheetView`,
  `getRetentionConfig`, `saveRetentionConfig`,
  `kbConvertDriveDoc`, `kbGetUsageStats`, `kbGetReviewDue`,
  `kbMarkReviewed`, `saveKbAiSettings`,
  `getTrainingDashboard`, `saveTrainingAssignment`,
  `revokeTrainingAssignment`, `getQuizzes`, `saveQuiz`, `deleteQuiz`,
  `getQuizAnalytics`, `importQuizFromForm`,
  `getPunctualityReport` (the four Spanish-inbox endpoints +
  `resolveSpanishThread` are NOT in this list — they gate on
  `canSeeSpanishInbox_` = manager OR `SPANISH_INBOX_MEMBERS`, the INV-31
  amendment; cycle-10 F1 removed them here after the stale double-listing
  nearly invited a gate regression; likewise `installAutomationTriggers` /
  `removeAutomationTriggers` are NOT in this list — both gate on the
  MANAGER_EMAILS Script Property (INV-15/44/61), not the roster `isManager`
  column, and the cycle-17 scan found the stale listing here inviting the
  same class of confusion),
  `issueDoc`, `getDocsDashboard`, `voidDoc`, `verifyDocSignature`,
  `releaseDoc`
  (these five are ALSO team-scoped per INV-122 — the gate alone is
  not the boundary),
  `getEmpDocTemplates`, `saveEmpDocTemplate`, `deleteEmpDocTemplate`
  (org-wide PHI-free form shells — gated but NOT team-scoped, INV-135),
  `createCoaching`, `getCoachingDashboard`, `voidCoaching`,
  `setCoachingFollowUp`, `nudgeCoaching` (design handoff PR 4),
  `qaSetExemption` (design handoff PR 5 — the ONE QA endpoint on the MANAGER
  tier rather than `canSeeQa_`: a QA member reviews, a manager decides who may
  skip a period),
  `autoAssignSpanishThreads` (operator testing note 4, 2026-09-10 — the ONE
  Spanish endpoint on the MANAGER tier rather than `canSeeSpanishInbox_`: a
  member claims for themselves, a manager DISTRIBUTES; writer shape)
  (also team-scoped via `coachCanManagerSee_` per INV-134 — the EmpDocs
  fail-closed model; the gate alone is not the boundary).
  Returning a dashboard or accepting writes without this check is a
  privilege escalation. **EXCEPTION — the admin tier (INV-136):** the **50**
  Admin-exclusive endpoints (33 Manage-module Admin-tab config/system/roster
  endpoints — incl. the 2026-08-07 team-member onboarding trio
  `addEmployee`/`offboardEmployee`/`getOnboardingPanel` — + the Reference
  content-authoring set
  `kbSaveItem`/`kbDeleteItem`/`kbUploadImage`/`kbConvertDriveDoc` + the five
  authoring-adjacent KB endpoints `kbGetRevisions`/`kbPublishItem`/
  `kbRevertItem`/`kbGetSearchConfig`/`kbSaveSearchConfig` — the
  authoritative list is in INV-136. **This count has now drifted five times
  (24→28→30→35); do NOT hand-maintain it again** — derive it, or add the
  machine check described in INV-136's note. All 35 are covered by a
  non-manager gate assertion today, but that coverage is also hand-listed)
  gate on `emp.isAdmin` (not `isManager`) and return `'Admin access required.'`.
  `isAdmin` == `isManager` until Script Property `ADMIN_EMAILS` is set, so the
  endpoints in the lists above that moved to the admin tier still reject
  non-managers; see INV-136 for the full admin-gated list.

<a id="g26-trigger-handler-endpoints-are-reachable-via-google"></a>

- **Trigger-handler endpoints are reachable via `google.script.run`.**
  The time-based trigger handlers — `sendDailyMissedPunchAlerts`,
  `runDailyExportCheck`, `sendCallNotesEodDigest`,
  `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`,
  `sendTrainingOverdueDigest` (the T4 overdue-training/-docs nudge),
  `archiveOldCallNotes` (the non-destructive cold-archive tier),
  `purgeExpiredFormData` (the
  destructive PHI-retention purge), `reconcileCallNotes` (the
  non-destructive nightly Sheets back-fill), `sendAutomationHealthDigest`
  (the daily automation-FAILURE push), `sendDeptRequestReminderDigest`
  (the daily dept-request SLA reminder), `sendManagerDailyBrief`
  (the flag-gated consolidated morning brief, INV-151),
  `archiveOldTimesheetRows` (the Timesheet cold-archive, INV-153),
  `runNightlySelfTest` (the daily in-project self-test — smoke on prod,
  full suite on the dev instance; INV-162), `creditMonthlyPtoAccruals`
  (the monthly PTO accrual credit, INV-194) and `purgeOldQaReviews` (the QA
  review-record retention purge — QaComments + QaScorecards only, default
  OFF; INV-196), `sendCoachingRecapDigest` (the Friday agent coaching
  recap — design handoff PR 4), `purgeOldDiagnostics` (the ViewUsage /
  ClientErrors diagnostics-retention purge, both windows default OFF —
  2026-09-11) and `autoAssignSpanishThreadsScheduled` (the hourly Spanish
  Inbox auto-assign behind the `spanishAutoAssign` toggle, default OFF —
  2026-09-11) — plus the three same-slot DISPATCHERS `runHourlyJobs`,
  `runWeeklyDigests` and `runNightlyPurges` (operator 2026-09-11: Apps
  Script caps installable triggers at **20 per user per script**, the
  installer had reached 21 and threw on the LAST create after deleting every
  existing trigger; a trigger now belongs to a SLOT, and eight of the
  handlers above run inside a dispatcher instead of owning a trigger — see
  the trigger list in the Operator State Checklist) — are top-level
  (required: Apps Script
  time-based triggers won't bind to underscore-suffix functions), which
  also means a logged-in rep can fire them from the browser console.
  Each calls `assertManagerCaller_(label)` at the top — throws if
  `getActiveUserEmail_()` ∉ `getManagerEmails_()`. In a trigger context
  the active user is the installer (always a manager via
  `installAutomationTriggers`'s own check), so the gate is a no-op for
  triggers. Any new public function that walks the roster, hits Mail,
  or otherwise has side effects you wouldn't want a rep firing should
  apply the same gate. **That gate MUST be the MANAGER_EMAILS
  `assertManagerCaller_`, NEVER `emp.isAdmin` or the roster `isManager`** —
  the installer passes `installAutomationTriggers`'s own MANAGER_EMAILS
  check, so an admin/roster gate silently no-ops the nightly run under a
  narrowed `ADMIN_EMAILS` or a non-roster installer (the `reconcileCallNotes`
  F1/F2 cycle-6 regression — INV-109/INV-136). `removeAutomationTriggers` also uses this
  gate — without it, a non-manager rep could silently disable all
  automation triggers.

<a id="g27-pto-balance-transitions"></a>

- **PTO balance transitions.** `updateTimeOffStatus` only changes
  balances on Pending→Approved (deduct) or Approved→non-Approved
  (restore). `managerSubmitTimeOff` with `autoApprove=true` skips
  the Pending stage and deducts immediately. Skipping the
  transition guard double-deducts on re-approval or fails to
  restore on revert.

<a id="g28-time-off-submit-has-a-duplicate-date"></a>

- **Time-off submit has a duplicate-date guard + leave-type
  whitelist — and the multi-day `submitTimeOffRange` shares BOTH,
  atomically** (operator 2026-08-18: one Pending row per weekday in the
  range, weekends skipped, a conflict on any day rejects the whole batch
  naming the dates — see INV-94). `submitTimeOffRequest` and `managerSubmitTimeOff`
  reject a request when the employee already has a Pending or
  Approved row for that date (`hasActiveTimeOffOnDate_`) — without it
  two sibling rows for one day each pass the per-row transition guard
  above and double-deduct on dual approval (INV-03 is per-row only).
  Both also validate `type` against `TIME_OFF_TYPES`
  (`isValidTimeOffType_`, case/space-insensitive) before writing, so a
  garbage/typo'd type can't silently fall through `getLeaveDeduction_`'s
  annual/1.0 default. Denied/cancelled rows never deducted, so they
  don't block a re-request (INV-94 / INV-95). Two cycle-11 extensions:
  (a) the dup-date guard ALSO runs on `updateTimeOffStatus`'s →Approved
  transition (own row excluded) — flipping an old Denied row to Approved
  beside an existing Approved row was the last double-deduct creator;
  (b) both submit paths bound the date to a sanity horizon
  (`TIMEOFF_MAX_DAYS_AHEAD`=370 / `_BACK`=90, in the rep's/target's tz) —
  a typo'd year used to create an approvable, balance-deducting row no
  month view ever showed.

<a id="g29-bi-weekly-anchor-read"></a>

- **Bi-weekly anchor read.** `getCurrentBiweeklyRange_` reads the
  FIRST row whose PayCycle is `'biweekly'` AND whose `PAY_ANCHOR` cell is
  non-empty (cycle-11 doc fix — a blank-anchor biweekly row is silently
  skipped, so accidentally blanking the intended anchor makes a LATER
  rep's anchor the pay-period boundary with no warning). Multiple biweekly
  anchors in the Employees sheet are not supported — the second
  one is silently ignored.

<a id="g30-future-punches-are-rejected-by-recordpunch"></a>

- **Future punches are rejected by `recordPunch`.** Both
  `date > todayStr` and same-day `time > nowTime` checks must
  remain in place; the manager edit-day flow has its own future-
  date guard (`daysBack < 0`).

<a id="g31-min-interval-debounce-on-live-punches-only"></a>

- **Min-interval debounce on live punches only.** `recordPunch`
  rejects a non-adjustment punch within `MIN_PUNCH_INTERVAL_SECONDS`
  (30s) of the previous one. Adjustment punches (`custom` set)
  bypass this check intentionally — back-fills need to land
  arbitrarily close to other times.

<a id="g32-self-undo-is-narrow-on-purpose"></a>

- **Self-undo is narrow on purpose.** `selfDeletePunch` only
  removes (a) punches dated today or yesterday in the rep's tz —
  yesterday exists solely for the midnight wrap (punch 23:58, undo
  00:02; cycle-8 made the server honor what the client always
  offered), (b) within `SELF_UNDO_WINDOW_SECONDS` (5 min) of REAL
  elapsed time, (c) that are NOT adjustments. Older or remote
  mistakes must go through Adjust so they leave a clear `ADJ-*` row
  in the audit log. Self-undo writes a `PunchSelfUndo` audit row
  before deletion.

<a id="g33-getteammatestatus-is-the-low-privilege-view"></a>

- **`getTeammateStatus` is the low-privilege view.** Returns name +
  status + isSelf only. Adding email, employee ID, last-punch
  time, or tz to the response would leak data to non-managers who
  can call this. Add fields only after auditing what the Clock
  page actually needs.

<a id="g34-fire-and-forget-email"></a>

- **Fire-and-forget email.** Decision emails
  (`notifyEmployeeOfDecision_`), missed-punch alerts, and
  automated exports are wrapped in try/catch — the API call
  returns success even when the email fails. Failures are logged
  to `Logger.log` / `console.warn` only. `emailFromCallNote`
  is more careful: it sends first (failure returns
  `success: false`), then stamps EmailedAt / EmailDepartments /
  Subform metadata in a separate try/catch. A stamp failure AFTER
  a successful send is logged to console but the call still returns
  `success: true` so the rep doesn't re-send a duplicate.
  **Rep-initiated sends go through `sendRepEmail_(emp, opts)` (pilot
  round 1 + follow-ons):** all SIX routes — `emailFromCallNote` ×3,
  `sendExternalEmail`, `intakeSendPPD`, `intakeSendAcct_` — merge
  `repSenderOpts_(emp)` (From display name = **the agent's name ALONE** +
  Reply-To the agent; `{}` for a missing emp so the send proceeds with
  system identity — operator correction 2026-08-27: the former
  "· Universal Medical Supply" suffix was the WRONG company name and
  fired live on a pilot send — **the company is "UniversalMed Supply"**
  (operator-supplied 2026-08-27), and the same wrong form shipped in 14
  more user-facing strings (external email bodies, the public form page)
  before the sweep; the derived BRAND tripwire now bans the wrong literal
  across every shipped web-app file. Do not re-add an org suffix here —
  internal mail doesn't need one), then send via MailApp — or via
  GmailApp with `from` when the optional `REP_SENDER_FROM` alias is
  configured and validates against `GmailApp.getAliases()` (fail-safe:
  any problem falls back to MailApp). **The wrapper also self-BCCs the
  sending AGENT (operator 2026-08-27)** so they get their own copy in
  their inbox — a true Sent-folder entry in the agent's mailbox is
  impossible (the app sends as USER_DEPLOYING; only the DEPLOYER's Sent
  folder records the send, which the GmailApp path does when the alias
  is active). The self-BCC APPENDS to any caller bcc (the intake
  `INTAKE_BCC_EMAIL` shape), never clobbers it, and dedupes
  case-insensitively. Automated digests/alerts/exports
  deliberately keep the plain system identity. A NEW rep-initiated
  send should use the wrapper, never a bare MailApp call (pinned).
  **The SPLIT-SEND partial contract (cycle-17 C17-11):** a mixed
  dept+'Other' selection fires TWO sends; when the internal copy
  succeeded and the external/Other copy then failed, the call no longer
  returns a bare failure (which invited a duplicating full re-send) — it
  stamps EmailedAt for the DELIVERED internal depts only, writes the
  CallNoteEmail audit row with an `externalCopyFailed` marker, keeps the
  DR row/token live, and returns `success: true` + a `warning` telling the
  rep to send to the external recipient separately; the client surfaces
  the warning as a warn toast in place of the success toast.
  **NO mail inside the global ScriptLock (cycle-9 M-7).** A MailApp send
  is ~0.3–0.5s and every mutating write shares ONE lock with a 15s
  `waitLock` ceiling — an `'*'` training assignment looped the WHOLE
  roster's emails inside it. Nine locked mutators now defer their
  best-effort notification via a `notifyAfter` closure the `finally`
  invokes AFTER `lock.releaseLock()` (updateTimeOffStatus,
  managerSubmitTimeOff, submitCallNote, saveTrainingAssignment,
  acknowledgeDoc, issueDoc, releaseDoc, createCoaching,
  acknowledgeCoaching). A Node tripwire inventories every function
  touching `MailApp.` and fails CI on any locked try-region that
  reaches one outside a `notifyAfter` closure; the ONE allowlisted
  exception is `emailFromCallNote` (INV-42 — send-then-stamp is
  deliberately a single locked unit). New in-lock mail = move it to a
  post-lock closure or allowlist it WITH a reason.

<a id="g35-callnoteemail-audit-row-is-deliberately-phi-free"></a>

- **CallNoteEmail audit row is deliberately PHI-free.**
  `emailFromCallNote` writes its audit row as
  `noteId=<uuid>; depts=<label>; recipients=<count>` — NOT the email
  subject (which embeds the patient name / TRX) or the raw recipient
  addresses. The shared AuditLog tab must not carry PHI; the `noteId`
  lets an investigator open the rep's own Sheet for full detail
  (INV-32 still holds — the row keeps `noteId`). Don't "helpfully"
  re-add the subject / recipients to this audit row.

<a id="g36-externalemailsent-audit-row-logs-only-the-recipient"></a>

- **ExternalEmailSent audit row logs only the recipient domain.**
  `sendExternalEmail` writes `recipientDomain=<domain>; type=...;
  pdfForms=...; interactiveForms=...; noteId=...` — NOT the raw
  recipient address (a customer's personal email is PII; for a patient
  it can be PHI-adjacent). The full recipient lives on the linked note's
  `subformData.externalEmails[]`, surfaced to the sending rep on their own
  card AND to a manager in the Team Notes Per-Rep view via the shared
  `cnExtEmailPillHtml_` pill (the manager-only recipient lookup — F20).
  Logging only the domain in the shared AuditLog is therefore intentional
  PII/PHI minimization, not a forensic gap.
  Same discipline as the PHI-free `CallNoteEmail` row above. The
  `FormTokenCreated` / `FormSubmissionReceived` audit rows follow the
  same rule (`toDomain=` / `fromDomain=` — the full recipient lives on
  the FormTokens row, reachable via the token), and the submission row's
  synthetic actor identity is likewise de-identified ("External
  recipient" + domain, never the recipient's name or raw address).

<a id="g37-buildcallnoteemailhtml-must-esc-every-user-supplied-field"></a>

- **`buildCallNoteEmailHtml_` must `esc_` every user-supplied field.**
  The email-preview modal injects the server-rendered body raw via
  `innerHTML` (`cn/script_callnotes.html` `cnRenderComposerPreviewStep_`,
  the `${p.htmlBody}` slot). That's safe ONLY because every note field
  is HTML-escaped in the builder. Adding a new field to the email
  builder without `esc_` is stored XSS in the preview (and the sent
  email). Pinned by `test_cn_buildEmailHtml_escapesUserFields`.

<a id="g38-note-marker-formatting-runs-post-escape-and"></a>

- **Note marker formatting runs POST-escape, and its regexes are a
  client↔server MIRROR (operator 2026-08-25).** `cnFmtHtml_` (client) and
  `cnFmtEmailHtml_` (server) turn `**x**`/`__x__`/`==x==` in ESCAPED text
  into `<strong>`/`<u>`/`<mark>`(/inline-hex `<span>` for email — the
  CN_EMAIL_PALETTE rule), so the formatter can only WRAP inert text, never
  revive markup — the input contract is escaped text, always
  `cnFmtHtml_(esc(...))` / `cnFmtEmailHtml_(esc_(...))`, never raw. The
  three marker regexes are pinned BYTE-EQUAL across the two files (a
  MIRROR_INDEX entry — the INV-72 family), markers never span lines, an
  unpaired marker is content, and the CRM copy strips them via
  `cnStripFmt_` (the paste is plain text). The server applies it on the
  FREE-TEXT Resolution branch + the three digest issue lines only — the
  server-generated OOP resolution is never marker-processed. Adding a
  marker = one `CN_FMT_RULES` entry + its server twin + the mirror pin.
  **LINE BREAKS are a SERVER-SIDE step and the ORDER is load-bearing
  (operator 2026-09-02).** The `.ce` fields are `white-space: pre-wrap`, so
  Enter stores a real `\n` that `textContent` carries to the sheet — but HTML
  collapses a bare newline, so a Resolution written as paragraphs reached the
  email (and its preview, which injects the SAME server body) as one run-on
  block while the CRM paste stayed correct. `cnNlBr_` converts them and
  `cnFmtEmailHtml_` calls it **LAST**: every marker regex is written
  `[^…\n]+` precisely so a pair cannot span lines, so converting first would
  delete the `\n` those classes exclude on and `**a\nb**` would silently start
  matching. The rule already existed inline on the OOP branch; both callers
  share the helper now. **It is deliberately NOT in the client `cnFmtHtml_`** —
  that formatter also feeds the note CARDS, which are `white-space: nowrap` +
  ellipsis one-line previews by design, and a `<br>` breaks out of that
  regardless of nowrap. The three OTHER sites that wrote the same replace
  inline (external customer/provider message body ×2, the form-submission
  table cell) were routed through `cnNlBr_` on 2026-09-04 as their own
  follow-on (NLBR-2 pins ZERO inline `\n`→`<br>` replaces in the server source; the
  helper also folds CRLF, a small widening for those three).

<a id="g39-metrics-client-must-esc-every-server-string"></a>

- **Metrics client must `esc()` every server string before `innerHTML`.**
  `metrics/script_metrics.html` renders `repName`, CDR agent names
  (`unmatchedAgents` / `rosterWithNoCdr`), and `data.error` /
  `err.message` into the DOM via `innerHTML`. Each MUST route through
  `esc()` (defined in `script_core.html`) — same discipline as
  `buildCallNoteEmailHtml_`'s `esc_`. CDR agent names originate from the
  shared CDR Report's `Agent Alias Overrides` sheet (written by the
  `call-data-reporting` repo), so they cross a repo trust boundary — an
  unescaped name like `<img src=x onerror=…>` is stored XSS in the
  manager's session. These were unescaped until the F5 fix; keep any new
  Metrics field consistent. The Metrics client also derives "today" from the
  employee roster timezone via `empTz()` / `isoDateTz()` (`script_core.html`)
  — never `new Date()` browser-local time — as do the Coverage planner +
  Punctuality date defaults since cycle 7 (L-5) — so offshore reps (IST/PHT) and
  near-midnight users see the correct day's CDR data, matching how Clock /
  Time Off / Manager / Export derive dates (F6).

<a id="g40-intake-offerings-catalog-is-read-a2-f"></a>

- **Intake Offerings catalog is read `A2:F` in a FIXED column order.**
  `getIntakeOfferings_()` returns the raw 2D array `[features, HCPCS,
  weightCapacity, seatType, pdfLink, imageUrl]` and `intakeFilterRecommendations_`
  indexes those positions directly (e.g. `row[1]` = HCPCS for substitution
  lookups, `row[4]/row[5]` = pdf/image of the substitution target). Reordering
  or inserting an Offerings column silently corrupts recommendations — keep the
  A–F contract, or update the engine + the fixture catalog in the tests
  together. The catalog is cached in-memory per execution (`_intakeOfferingsCache`).
  **THERE IS NO "DISABLED ROW" — the ONLY inert state is an EMPTY column B
  (HCPCS)**, because `intakeFilterRecommendations_` drops a row solely on
  `hcpcsNum === 0`. Surfaced by the cycle-16 F9 operator check: the live catalog
  held one scratch/exception row (`E1161`, capacity blank) that the operator did
  not consider a product, but the engine did — pre-F9 its unreadable capacity
  passed the weight gate for every patient, and post-F9 it is STILL eligible
  whenever **Q38 weight is blank**, since the fix guards with
  `if (patient.weight > 0)`. To retire a row: delete it, or clear its HCPCS
  cell. Do NOT just blank the capacity — that is the fail-closed path, which
  only suppresses the row for patients who HAVE a recorded weight.
  **RELATED, and unfixed: the engine's HCPCS ladder is K-code-only.**
  `hcpcsNum = parseInt(hcpcs.replace(/\D/g, ''), 10)` maps `K0821`–`K0864` to
  821–864, and `isGroup3 = hcpcsNum >= 848` encodes exactly that range — so an
  **E-code clears the Group-3 cutoff by arithmetic accident** (`E1161` → 1161).
  Nothing in the code states the assumption. Adding any non-K HCPCS to this
  catalog needs a deliberate decision (reject non-K rows? a real category
  column?) — it is an operator/clinical call, not a code one.

<a id="g41-an-operator-maintained-data-source-that-a"></a>

- **An operator-maintained data source that a DECISION ENGINE reads needs a
  shape check, and the fail direction on unreadable data must be CHOSEN (F9,
  cycle-16 — FIXED).** The PPD weight filter did
  `maxCap = parseInt(product.weightCapacityStr, 10); if (weight > maxCap) return false;`.
  `parseInt('')` is `NaN` and **every** comparison against `NaN` is false, so a
  blank / `'n/a'` / `'300-'` / `'-450'` capacity cell passed the filter for ANY
  patient weight — the engine read an unreadable capacity as **unlimited** and
  could recommend a chair that cannot carry the patient. Both branches now
  `isFinite`-guard and EXCLUDE the product.
  **The deeper defect was an inconsistency nobody had noticed: the same engine
  already had the opposite behaviour for the same class of missing data.** Forty
  lines above, a catalog with no `K0821` row returns `{standard:[], complex:[]}`
  rather than silently dropping the mobile-home constraint — fail closed. The
  weight filter failed open. When one function handles "catalog data I cannot
  read" two opposite ways, at least one of them is wrong; pick the direction
  deliberately and say so at both sites.
  **Fail-closed is silent, so it ships WITH a detector.** Excluding the row
  turns a data-entry slip into a chair that quietly stops being recommended, so
  `intakeCatalogIssues_` (pure, Node-pinned) names the offending SHEET rows in
  an "Intake Offerings catalog" card in Admin → Automation Health. It checks
  only what the engine actually reads and only what is objectively wrong —
  never taste: unreadable/inverted capacity and a seat type containing neither
  `s` nor `c` are ERRORS; a non-ASCII dash (`300–450` reads as a flat 300 cap,
  since the range branch splits on ASCII `-` only), a blank seat type and blank
  pdfLink/imageUrl are WARNINGS. A well-formed catalog produces ZERO issues, so
  the card genuinely reaches green — the cycle-15 rule for any health
  indicator. `getIntakeCatalogHealth_` carries `ok:false` on a failed read so an
  unreachable Intake store cannot render as a clean catalog (INV-129). The scan
  rides the SAME opt-in gate as the cycle-14 queue inventory (`scanCatalog`,
  default OFF) because it opens the Intake spreadsheet and
  `getAutomationHealthBadge` polls every 10 minutes PER MANAGER; it is
  deliberately NOT in `automationProblems_` (no daily nag, and the field is null
  on that path anyway). **Known limit: the detector requires a manager to OPEN
  the panel — it is not pushed.**

<a id="g42-intake-ppd-controls-are-engine-safe-via"></a>

- **Intake PPD controls are engine-safe via CANONICAL-ENGLISH VALUES, not
  free-text (redesign Phase 2).** PPD questions render through TWO configs in
  `script_intake.html`: the legacy `INTAKE_PPD_TYPE` (`'yn'`/`'sev'`/`'num'`/
  `'text'`) AND the richer `INTAKE_PPD_CONTROL` (checked FIRST by
  `intakePpdRowHtml_`) for the new string-valued kinds — `choice` (single-select
  multi-button), `multi` (multi-select + optional exclusive option, comma-joined
  in OPTION order), `numunit` (number+unit), `reveal` (option → free-text box),
  `condition` (Phase-3 curated multi-select picker — a filter box over
  `INTAKE_CONDITION_LISTS[ctrl.list]` + option buttons + a selected-chip row + an
  "Add <typed>" escape for off-list values; value = comma-joined selected strings
  in `data-val`, round-trips exactly like `multi`), `ynreveal` (Phase-4 — a Yes/No
  whose `revealOn` reveals a sub-multi-select; value `''`/`No`/`Yes`/`Yes: SubA, SubB`
  — Q45 arthritis type), `ynnum` (operator feedback 2026-07-09 — a Yes/No whose
  Yes reveals a number-only field + unit text; value `''`/`No`/`Yes`/`Yes: 12 hours`,
  pure `intakeYnNumSerialize_`/`Parse_` Node-pinned — Q40 attendant hours, NOT
  engine-read). The same feedback round made `choice` groups render as separated
  pill buttons (the `multi` look — the joined segmented box wrapped awkwardly on
  Q2–Q6's long labels; CSS-only), added DISPLAY-ONLY `tone` per multi option
  (`warn`/`danger`/`no` selected-state colors on Q25/Q31a/Q34 — never part of the
  stored value, so the engine contract is untouched; Node-pinned tone map), and
  replaced the help glyph's native `title` with a tokened CSS tooltip
  (`data-tip` + `.intk-help::after`, hover + keyboard focus). EVERY
  kind serializes to/from a STRING via `intakePpdGetVal_`/`SetVal_`, so drafts,
  `intakeCollectPpd_`, the engine, and the email builder are unchanged. **The
  engine-critical questions Q25 (numbness), Q31a (stroke), Q34 (amputation) are
  now `multi` controls whose option VALUES are exactly the substrings
  `intakeDeriveClinicalFactors_` parses** (`Feet`/`Legs`; `Paralysis Left Arm`…
  comma-joined; `Left (Above Knee)`… with no stray `no`), Q38 (weight) is
  `numunit` (the engine parseFloat-parses it keeping the DECIMAL — cycle-8:
  the old `\D` strip turned "250.5" into 2505 lbs, failing every weight cap
  and reading as ≥285 for the Q39a mobile-home rule; units/commas still
  drop), and **Q39a (dwelling — operator rule
  2026-07-09) is an ENGINE-READ `choice`** (`House`/`Apartment`/`Mobile Home`;
  the engine substring-matches `mobile` → `livesInMobileHome`, and Mobile Home
  + weight under 285 lbs short-circuits the whole filter to **K0821 only** —
  the HOME constraint wins over the clinical gates by operator decision;
  ≥285 lbs / blank weight / no answer → standard logic; a catalog with no
  K0821 row → empty result). Never renumber around Q39a — the `39a` key rides
  stored answers + the engine, like 31a/33a. UNLIKE 31a/33a, Q39a COUNTS in
  the PPD progress ring/stepper (cycle-8: the bare-digit `mainQNums` filter
  excluded it, so a rep could see "45/45 complete" with the engine-critical
  dwelling answer blank — it's a full-weight primary question that's lettered
  only to avoid renumbering; the ring denominator is now 46). All of this is MORE reliable than the old free-text (no
  typos) and pinned by the Phase-0 engine-contract tests + the Phase-2 config
  drift-guard (`test/client/run.js` feeds the live config values back through the
  engine). **CANONICAL-ENGLISH VALUE RULE (load-bearing):** the stored value is
  always the option's English `v`; only the displayed `l` label is/ can be
  localized — the engine matches ENGLISH substrings, so a Spanish PPD emits the
  same engine-safe values (this also FIXED a latent bug where Spanish free-text
  never matched). **Phase 3 (shipped):** **Q29** (peripheral vascular disease),
  **Q41** (qualifying diagnoses), **Q42** (heart/lung), and **Q43** (neuro Dx) are
  now `condition` curated pickers backed by `INTAKE_CONDITION_LISTS`
  (`vascular`/`qualifying`/`cardiopulmonary`/`neuro`). Q29/Q41/Q42 are NOT read by
  the engine (display-only); **Q43 is engine-critical but read ONLY as
  truthy-vs-the-exclude-list** (`['no','n/a','none','','no.']`), so ANY non-empty
  curated (or custom-typed) value = valid neuro Dx and an empty selection = no Dx —
  pinned by the Phase-3 drift guard (feeds every `neuro` list value through the
  engine + asserts none collide with the exclude list). The condition lists are a
  **pure content constant SEEDED FOR CLINICAL REVIEW** — editable with zero engine
  risk; keep entries **comma-free** (the value is comma-joined). STILL free-text:
  **Q13** (falls — `isPositive` reads `'yes'`, result unused by the recommendation
  logic). NEVER change a Q25/Q31a/Q34 option value without re-running the
  drift-guard; NEVER reintroduce a bare `Yes`/`No` for those (it would feed the
  engine no location/side); NEVER add a Q43 `condition` option that lowercases into
  the exclude list. The server email builder already expects the comma-joined multi
  values (`INTAKE_PPD_YESNO_QS` coloring + the Q25/Q31a/Q34 chip split) — a
  server-only list, no client mirror; Q29/Q41/Q42/Q43 render as plain escaped
  comma-joined text (the `else` branch), so no server edit is needed. **Phase 4
  (shipped) — display-only polish, engine untouched, no server edit:** a hover-help
  glyph on select labels (`INTAKE_PPD_HELP`, e.g. Q32 spasticity), conditional-hide
  of secondary rows (`INTAKE_PPD_REVEAL` → `intakePpdApplyReveals_`, e.g. Q33a shows
  only when Q33=Yes — hidden rows are cleared), the Q45 `ynreveal` control (arthritis
  type sub-multi), and a Q37 numunit `parse:'height'` that normalizes a feet-inches
  entry (`5'1"` → `61`) to total inches on blur (`intakeParseHeightInches_`, pure).
  None of Q32/Q33a/Q37/Q45 are engine-read, so no drift-guard is needed; the pure
  serialize/parse helpers are Node-pinned. Optional Q31a body diagram DEFERRED.

<a id="g43-the-intake-payload-s-labels-are-always"></a>

- **The intake payload's LABELS are always the English bank — the email is
  English whatever language the form was completed in (operator 2026-09-04,
  FIRED LIVE: a testing agent sent a PPD to the Power dept with Spanish
  labels).** The server renders `payload.rows` verbatim (that is how the
  notes section and the amend banner got in with zero server edits), so the
  ROWS decide the email's language, and both collectors
  (`intakeCollectPpd_` / `intakeCollectAcct_`) used to read the bank by the
  DISPLAY language. They now read `INTAKE_PPD_Q.EN` / `intakeAcctBank_(form).EN`
  (+ `INTAKE_PPD_NOTES.EN`), pairing each English label with the answer
  collected by qNum / index from the rendered form — safe ONLY because the EN
  and ES banks are positionally equivalent, which INTK-EN pins (same qNums at
  the same positions; same PMD/PAP lengths). Answer VALUES were never the
  problem (the CANONICAL-ENGLISH VALUE RULE); free text stays as typed.
  `language` still records the COMPLETION language — the Sent tab re-renders
  against it and the amend replay is language-matched — and the in-app
  confirm list (`intakeRecwarnLabel_`) stays localized: only what LEAVES the
  app is forced English. Pinned by INTK-EN + INTK-EN-DOM (both collectors
  driven under `lang = 'ES'` in jsdom).

<a id="g44-intake-email-builders-must-esc-every-patient"></a>

- **Intake email builders must `esc_` every patient field; the justification
  is the ONE raw exception.** `intakeBuildPpdBodyHtml_` / `intakeBuildAcctBodyHtml_`
  inject the body into the preview modal via `innerHTML` and into the sent
  email, so every answer/label is `esc_`'d (INV-89; pinned by
  `test_intake_buildPpdBody_escapesAnswers`). The recommendation
  `justification` is server-generated (a fixed vocabulary + `Left`/`Right`
  hemiplegia side) and intentionally carries inline markup (`<strong>`,
  underline span), so it is injected raw — never put a user-supplied value into
  a justification string. HCPCS / pdfLink / imageUrl (from the Robin-owned
  Offerings sheet) are still `esc_`'d in attributes defensively.

<a id="g45-intake-pmd-pap-layout-is-duplicated-client"></a>

- **Intake PMD/PAP layout is duplicated client↔server — keep them equal.**
  The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` (email rendering,
  authoritative) and the client `INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`
  (input rendering) carry the same HEADER/CHECKBOX/SECONDARY row sets (the
  client headers are 0-based; the server's are 1-based — they differ by +1).
  A Node tripwire (`intake — client render layout mirrors the server`) fails CI
  if they drift. Adding/removing a PMD/PAP question means updating BOTH the
  question banks (client `INTAKE_*_Q`) AND both layouts. Same discipline as
  `LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_`.

<a id="g46-intake-account-yes-no-toggles-read-write"></a>

- **Intake account Yes/No toggles read/write through `.intk-yn` groups
  (deferred #10).** PMD/PAP account answers are gathered by
  `intakeAcctGetVal_` and re-applied by `intakeApplyAcctAnswers_`, both of
  which handle ANY `.intk-yn` group: a checkbox-style toggle stores
  `TRUE`/`FALSE`, while a select-style toggle marked `data-ynsel` (the
  `['', 'Yes', 'No']` shape, e.g. PAP's CPAP-history conditional) stores
  `Yes`/`No`. The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` select
  keys are UNCHANGED — only the client input control changed shape, so the
  layout-mirror tripwire still passes. New account Yes/No fields should
  reuse the `.intk-yn` (+ `data-ynsel` where a Yes/No string is needed)
  pattern rather than a raw checkbox/select.

<a id="g47-call-notes-sheet-enrollment-one-click-auto"></a>

- **Call Notes Sheet enrollment — one-click auto-provision (or manual).**
  A rep has no Call Notes panel until column L (`CallNotesSheetId`) of the
  Employees roster has their per-rep spreadsheet ID. `getCallNotesSheet_(emp)`
  throws "Your call-notes Sheet is not configured" if missing; the
  client renders the enrollment-missing splash. A manager can now
  one-click enroll a rep from **Call Notes → Admin → Call Notes
  Enrollment**: `provisionCallNotesSheet(repEmpId)` (manager-gated,
  locked, INV-110) creates a fresh Spreadsheet owned by the deploying
  account, provisions the `Notes` tab with `CN_HEADERS`, writes the new
  ID into column L, invalidates the roster cache, and audits
  `CallNotesProvision`. It is **idempotent** — a rep who already has a
  sheetId is returned unchanged; it NEVER clobbers an existing Sheet
  (that would orphan their note history). The manual path (Robin copies
  the template Sheet and pastes the ID) still works for anyone who
  prefers it; auto-provision just removes the per-rep busywork.
  **The "is this rep enrolled?" predicate is `cnEnrolledSheetId_(row)` — the ONE
  reader of column L (cycle-9 L-11 → cycle-12 F14, now enforced).** It returns
  the trimmed id or `''`, so a WHITESPACE-ONLY cell reads as NOT enrolled
  everywhere. History worth keeping: the test was hand-written 21 times and 11
  copies tested RAW truthiness (`if (!sheetId) continue;`) while 10 trimmed, so
  such a cell made the two groups DISAGREE — the trimmed group correctly showed
  the rep the enrollment splash and offered the Admin provision button, while
  every untrimmed cross-rep walk called `openById(' ')`, threw into its per-rep
  try/catch, and **silently omitted the rep from the aggregate** (tag taxonomy,
  tag trends, the tag-transform walk, cross-rep search, shift stats, the
  unresolved-action badge, the CN export, team metrics, the EOD digest) — or, in
  Storage Health, reported a false "unreachable per-rep Sheet" for a rep who
  simply is not enrolled. A manager reading any of those numbers had no way to
  know a rep was missing. A Node tripwire now bans EVERY raw
  `EMP.CALL_NOTES_SHEET_ID` read outside the predicate (the only exemptions are
  the predicate body and `provisionCallNotesSheet`'s `setValue` WRITE) — the
  INV-142 / INV-154 boundary pattern. The employee-object builders
  (`getEmployeeInfo_`/`lookupEmployeeById_`/`submitFormByToken`) route through it
  as `cnEnrolledSheetId_(row) || null`, preserving their `null`-when-absent
  contract exactly.

<a id="g48-a-failed-note-count-read-must-be"></a>

- **A failed note-count read must be SURFACED, never rendered as 0 (cycle-12
  F5).** `countCallNotesInRange_` swallowed every error as `return 0`, which is
  indistinguishable from "the rep logged zero notes" — so `cnNoteCoverage_`
  produced 0% and the Clock shift-strip rendered "0% logged" in CRIT tone plus
  a **"File N missing"** CTA where N was every answered call, telling a rep to
  redo work they had already filed. Use the outcome-carrying
  **`cnCountNotesResult_(emp, from, to)` → `{count, unavailable, unenrolled}`**
  for anything user-facing. **`countCallNotesInRange_` NO LONGER EXISTS (A4,
  cycle 13).** F5 kept it as "a thin numeric wrapper for the callers that only
  want the number", but there were none — the sole remaining references were its
  own two tests, which ASSERTED it returns 0 on an unreadable Sheet. That left
  the silently-degrading variant alive under the most obvious name, pinned by
  tests enshrining the exact behaviour F5 existed to remove, waiting for the
  next author to reach for it. There is now ONE count path by construction; take
  `.count` off the result and decide what to do with `.unavailable`, which is
  the whole point. `unenrolled` (no
  Sheet configured, INV-35) is deliberately DISTINCT from `unavailable` (the
  Sheet exists but could not be read) — only the latter is an error. Every
  coverage surface nulls `noteCoverage` and sets `noteCountUnavailable` /
  `noteCountPartial` on an unavailable read, all THREE result caches skip their
  `put` on a degraded round (the L-3 / INV-129 rule), and the clients render
  "notes unavailable" / an em dash instead of a confident zero. This is the
  cycle-10 "error reads as empty" class (D1/D2a) in the one server helper it
  had never been applied to.
  **TWO SURFACES ESCAPED THAT SWEEP UNTIL CYCLE 16 — and the reason is worth
  knowing, because it is how the next one will escape too.** The sentence above
  ("every coverage surface") was written against the set of functions that CALL
  `cnCountNotesResult_`, and both misses were outside it:
  (a) **`managerGetShiftStats` counts INLINE** — it needs flags, emails and the
  completion median off the same read, so a count-only helper cannot serve it,
  and it therefore appeared in no search for the helper. Its per-rep catch
  swallowed the failure and pushed the rep with `totalNotes:0`, every
  `flagCount` 0 and `emailsSent:0`, then computed `noteCoverage` from that zero
  against the rep's REAL CDR answered count — so the manager's END-OF-SHIFT
  PERFORMANCE table showed a rep whose Sheet could not be opened identically to
  one who logged nothing all shift, CRIT-toned 0% badge included. It now carries
  `notesUnavailable` on the stats object, nulls the coverage, and the client
  renders an em dash across all six note-derived columns (Notes / Action /
  Training / Review / Emails / Median — they all come from that one read) with
  the sort comparator returning −1 so they group with the other unknowns.
  (b) **`getTeamMetrics` nulled the PER-REP coverage but computed the TEAM total
  unconditionally**, so the rail row said "partial — at least one rep Sheet was
  unreadable" while the hint four lines below it rendered a confident
  "Team-wide coverage below 80%" from the same contaminated numerator.
  **The generalizable rule: an aggregate is a coverage surface even when it
  never touches the helper.** Ask what a function DERIVES from a best-effort
  read, not which helper it calls.

<a id="g49-a-value-written-to-a-data-attribute"></a>

- **A value written to a `data-*` attribute comes back DECODED — never re-render it
  raw (cycle-18 F1).** `setAttribute`/an HTML attribute stores TEXT, so the parser
  entity-decodes it on the way in and `getAttribute` hands back the decoded string.
  Write `data-x="&lt;img&gt;"` and you read back a literal `<img>`. That is fine for a
  comparison, a URL (`encodeURIComponent` re-encodes) or a `textContent` sink, and it is
  **stored XSS the moment the value re-enters `innerHTML`** — which is exactly what the
  roster and decision KB blocks did on every mode switch, Expand and decision answer
  (INV-193). Three rules: (a) a stored SOURCE gets re-escaped on read through one named
  boundary (`kbFenceSrc_`), never at each call site; (b) if you re-escape the source you
  must also re-escape every SIBLING channel the render MATCHES against (`data-opt`,
  `data-path`, `data-name`) or the comparison silently stops matching — the failure looks
  like a dead button, not like an escaping bug; (c) the INVERSE case exists too — a CSS
  attribute selector matches the DECODED value, so a selector built from escaped parsed
  data must be decoded first (`kbFenceDecode_`). **Attribute escapers are also easy to
  under-build:** `kbRosterAttr_` escapes quotes but NOT `&`, which is correct here only
  because every consumer compensates — an attribute that is compared against parsed data
  needs the `&` too. The glossary block is the SAFE shape to copy: it uses `setAttribute`
  + `textContent` throughout, so decoding is harmless by construction. A pin for this class
  cannot live in the pure harness — it has no HTML parser, so it cannot decode; use the DOM
  harness.

<a id="g50-root-data-compact-is-the-pop-out"></a>

- **`:root[data-compact]` is the POP-OUT, not a viewport breakpoint (A2,
  cycle-13; FOUR MORE instances found and fixed in cycle-16 F3).**
  `data-compact="1"` is set from `?compact=1` by the pop-out button (INV-38); it
  says nothing about how wide the window is. Cycle 13 found three components
  that declared a fixed multi-column grid plus a `:root[data-compact]` override
  and NO media query, so they never stacked on a phone: `.m-layout`
  (`1.4fr 1fr` with a 42px hero numeral — and `metrics/script_metrics.html`
  carried **zero** media queries, on a REP-facing tab), plus the shared
  `.telemetry` strip and `.coach-kpis`, both `repeat(4, 1fr)`. The shell's own
  breakpoints (`styles.html` 1023px / 540px) adapt `.metric-grid` and
  `.emp-grid` but never reached these. Fixed with real media queries —
  `.m-layout` stacks at ≤720px (before either column gets narrower than the
  hero numeral), `.telemetry` + `.coach-kpis` go 2×2 at ≤540px.
  **Cycle 16 found FOUR more, all MEASURED at 390px rather than reasoned about:**
  `.kb-wrap` 280px tree / **70px reader** (a fixed `280px` track does not
  yield, so the `1fr` column absorbs the entire shortfall — and
  `kb/script_kb.html` had **zero** media queries, the same shape as metrics in
  cycle 13, on the rep-facing mid-call lookup tool); `.cnv-trio` 114 / 104 /
  94px on the app's most-used form; `.intk-row` 157 / 157px on a 46-question
  clinical intake; `.cnv-row` holding a 130px fixed label column. All now carry
  breakpoints (kb ≤720px; trio 2-up ≤720px then stacked ≤480px; intk-row
  ≤560px — the existing 760px query stacks the PPD *layout*, which still leaves
  ~350px per half, so 2-up only fails further down).
  **Pop-out geometry is unchanged because `:root[data-compact] .cnv-row` is
  specificity `(0,3,0)`** — `:root` pseudo-class + `[data-compact]` attribute +
  class — not `(0,2,0)` as this entry claimed until cycle 16. It out-specifies a
  `.cnv-row.full` media rule at `(0,2,0)`; VERIFIED BY MEASUREMENT (compact at
  480px and 700px both still render `84px 1fr`), which is the only way to be
  sure of a specificity claim you are relying on.
  **A grid that stacks in compact almost always needs a viewport breakpoint too
  — the two triggers are independent.**
  **Pinned by the A2 tripwire, which since cycle-16 F3 SCANS THE RULE rather
  than asserting three known fixes** (it previously hard-checked `.m-layout` /
  `.telemetry` / `.coach-kpis`, which is exactly why four more accumulated with
  CI green — the INV-179 lesson, and the same promotion A1/A11 got in cycle-13
  batch 5). It derives its file set from `A11Y_SCAN_PARTIALS` + `styles.html`
  and brace-matches every `@media` block.
  **Cycle-17 C17-1 (High, test integrity): the scan's regex was BLIND to
  `styles.html` in effect** — it matched only the bare `:root[data-compact]`
  the partials write, while every one of styles.html's ~67 compact overrides
  writes `:root[data-compact="1"]`, so the shared stylesheet contributed ZERO
  selectors and the file-set claim above was untrue (the `checked >= 8` floor
  was satisfied by the partials alone; INV-179's "a derived scan is only as
  wide as what it derives from", in regex form). The regex now matches both
  attribute forms, and the 9 obligations styles.html then surfaced were
  resolved per-selector: `.actions` (the LIVE punch grid — four fixed tracks
  at every real viewport) and `.field-row` (modal field pairs) gained REAL
  540px breakpoints; DEAD compact overrides for `.actions-grid`, `.ledger`
  (×3), `.ts-summary`, `.leave-balance-row` were REMOVED (INV-184 — zero
  markup emits them); `.preset-grid`'s compact `grid-template-columns` was
  dropped (it re-stated the base's identical tracks — a gap-only change that
  read as a re-columning). Carve-outs, all deliberate:
  `A2_INVERSE_OK` now holds THREE entries — `.rail-flags` (widens 2-up → 4-up
  in the pop-out — the INVERSE of stacking, so no breakpoint is owed),
  `.ts-recent-row` (base `auto 1fr auto` — content-sized tracks, one flexible
  middle; the compact override only drops the leading icon column), and
  `.hero` (the only live consumer, `.dash-hero`, sets `display:block`, so the
  base 2-col grid never applies — verified by the 390px clock scenario) —
  and `A2_INTRINSIC` (a base using `auto-fill`/`auto-fit`/`min()`/`clamp()`
  already reflows — `.m-kpi-grid` is `repeat(auto-fill, minmax(140px,1fr))` and
  its compact override exists only to PIN 3 columns). The last is a property
  of the RULE, so it lives in the rule, not the allowlist.
  **A side effect worth remembering: stacking a row can EXPOSE a latent
  overflow elsewhere in it.** Stacking `.intk-row` moved the help glyph to the
  end of a full-width question, and its `left:-10px` / 58vw tooltip then ran
  past the row — measured as document `scrollWidth` 468 against a 390 viewport,
  i.e. the whole page scrolled sideways. Right-anchoring the bubble inside the
  same breakpoint restores 390/390. Re-measure `scrollWidth` vs `clientWidth`
  after any stacking change; a squeezed layout and an overflowing one look
  identical in a screenshot.

<a id="g51-a-same-day-compare-between-a-config"></a>

- **A "same day" compare between a CONFIG.TIMEZONE stamp and a MANAGER-tz
  "today" must CONVERT the stamp first (post-deploy `runAllTests`, 2026-09-02).**
  `nudgeCoaching` wrote `NudgedAt` via `fmtDate_`/`fmtTime_` (Asia/Kolkata) and
  guarded "once per day" with `nudgedAt.substring(0, 10) === todayIso` where
  `todayIso` is the Chicago day. Kolkata is 10.5 hours ahead, so from 13:30 CDT
  every afternoon the stamp reads TOMORROW's date and a second nudge is
  allowed; the next Chicago morning the stale stamp matches and a fresh nudge
  is refused. `coachStampDayMgr_(ts)` parses the stamp in `CONFIG.TIMEZONE` and
  formats it in `CONFIG.MANAGER_TIMEZONE`; both the guard and the dashboard's
  `nudgedToday` flag use it. The suite caught it only because the run happened
  after 13:30 CDT (the same frame class as the editor-test hazards). Any new
  "did this happen today" check over a `fmtDate_` stamp owes the same
  conversion. Pinned in PR4-1.

<a id="g52-the-test-roster-rows-keep-their-fixture"></a>

- **The TEST roster rows keep their FIXTURE timezones, and setup restores them
  (operator 2026-09-02).** The ALL-CST runbook says "every agent row →
  America/Chicago", and the operator applied it to `TEST_IN_001` /
  `TEST_PH_001` too — but the suite hardcodes `Asia/Kolkata` / `Asia/Manila`
  for them (the IST/PHT fixtures ARE the multi-timezone coverage, kept by
  design). Four tests failed on the frame mismatch (a fixture ClockOut written
  on the Kolkata date while `recordPunch` read today in Chicago; the note-hour
  bucket expected in Kolkata). `setupTestEnvironment` now restores column H on
  re-onboard exactly as it restores the email, so a flipped test row heals on
  the next run. Do not flip the TEST rows by hand; if you do, nothing breaks
  beyond one red run.

<a id="g53-a-best-effort-overlay-whose-absence-is"></a>

- **A best-effort overlay whose ABSENCE is reassuring must announce itself
  (F4, cycle-16 — FIXED).** `getCoveragePlan`'s PTO read was wrapped in
  `catch (e) { /* best-effort — coverage still renders */ }`. Best-effort was
  the right call (a coverage grid with no PTO overlay still beats no grid), but
  SILENT was not: with `ptoMap` empty **every rep counts as working**, so the
  hourly strip renders green/adequate on a day half the team is off, and the
  "All business hours meet the N-rep minimum" all-clear becomes *guaranteed
  rather than earned*. A planner whose entire purpose is understaffing
  detection had, as its failure mode, the single most reassuring answer it can
  give — with no signal anywhere in the response for the client to render.
  It now returns `ptoUnavailable` (additive; an older client ignores it), the
  manager view shows a `role="alert"` banner stating PTO is not reflected and
  the bands are an UPPER BOUND, and the green all-clear is downgraded to a
  neutral "No understaffed hours found — but time-off data is missing, so this
  is not an all-clear." **The test to apply to any `catch` around an overlay:
  if the empty overlay makes the output MORE reassuring rather than less, the
  degradation must be visible.** Same family as the note-count entry above and
  INV-129; the difference is that here the swallowed read feeds a *judgement*
  (a staffing band, an all-clear) rather than a number, so suppressing the
  judgement matters as much as flagging the data.

<a id="g54-an-unknown-duration-is-not-the-same"></a>

- **An UNKNOWN duration is not the same as an elapsed one — never substitute
  "now − start" for a missing END timestamp (F8, cycle-16 — FIXED).**
  `getDeptRequests` computed a request's elapsed minutes as
  `(resolvedMs && createdMs) ? resolved − created : (createdMs ? now − created : null)`.
  Read the fallthrough carefully: it fires not only for an OPEN request (where
  "how long has this been waiting" is exactly right) but also for a request
  marked **resolved** whose `ResolvedAt` cell is blank or unparseable — where the
  honest answer is "unknown". That row then reported its **full age** as its
  resolution time, and because the age grows every day, it inflated the
  department's `avgMinutes` and `medianMinutes` a little more on each read,
  forever. Those are the numbers the per-dept SLA targets (`DR_SLA_TARGETS`) are
  chosen against, so the corruption feeds back into the thresholds. It is
  reachable two ways: a manual sheet edit, or a failure between
  `markDeptRequestResolved_`'s two `setValue` calls. The fix is one line —
  branch on the status FIRST, and yield `null` when a resolved row has no usable
  end stamp. **The general rule: when a duration needs two timestamps and one is
  missing, the result is `null`. A plausible substitute is worse than a gap,
  because a gap is visibly a gap and a substitute silently becomes data** —
  the same instinct as the note-count and PTO-overlay entries above, applied to
  arithmetic rather than to a read outcome.

<a id="g55-timetomins-returns-null-never-nan-and-an"></a>

- **`timeToMins_` returns `null`, never `NaN` — and an ARITHMETIC caller must
  guard EXPLICITLY (A3, cycle-13 — FIXED).** It used to return `NaN` on an
  unparseable Timesheet TIME cell, which is the worst possible sentinel here
  because every `NaN` comparison is FALSE and `NaN` arithmetic is contagious:
  `getPunctualityReport` did `if (lateMin > grace) late++; else onTime++;`, so a
  bad row fell through to the else and was scored **ON TIME** — and its
  earliest-punch pick (`mins < r.days[d].in`) was also false against `NaN`, so
  ONE bad row pinned the whole day even when a valid ClockIn existed on it;
  `calcHours_` returned `NaN` and `totalHours += NaN` turned an entire
  timesheet's total into `NaN`. Now `null`, so the callers' explicit
  "not computed" branches fire: punctuality `continue`s, the timesheet counts
  the day INCOMPLETE (**not** 0 hours — that would understate payroll
  silently), the dashboard sparkline and the calendar omit it. `calcHours_`
  propagates `null` for a corrupt CLOCK pair but a corrupt LUNCH pair only
  drops the deduction (the "no lunch recorded" shape) rather than voiding an
  otherwise-valid day. **THE TRAP:** `getCoveragePlan` does
  `dayDelta * 1440 + timeToMins_(...)`, and `x + null` **coerces to `x`** —
  placing the rep's shift at midnight, strictly WORSE than the `NaN` it
  replaced (which merely dropped them from the buckets). Any new caller that
  does arithmetic on the result needs an explicit `=== null` check, not a
  truthiness test (`0` is a valid midnight). Pinned by the A3 behavioural +
  caller-shape tripwires and the `timeToMins_nullOnUnparseable` smoke test.

<a id="g56-color-mix-for-a-semantic-colour-must"></a>

- **`color-mix` for a SEMANTIC colour must interpolate `in oklab`, never
  `in oklch` (V-1, cycle-12 visual audit — FIXED).** The four `-deep` aliases
  declare correct fallback hexes (`--warning-deep: #8a4500` amber,
  `--danger-deep: #8a1f1f`, `--success-deep: #0b6e40`) and then an `@supports`
  block replaces them with a `color-mix`. With `in oklch` the hue interpolates
  **on the polar arc**, and light-mode `--ink` (`#0f1623`) sits at hue ≈264, so
  amber (h 70) travelled 70→0→264 — *through red*. Measured in Chromium before
  the fix: `--warning-deep` resolved to **hue 354.8 (RED)**, `--danger-deep` to
  330 (magenta), `--success-deep` to 204 (cyan); `--info-deep` was fine only
  because blue already matches `--ink`'s hue. Dark mode mixes 25% against
  `--paper-card` and was correct, so **the same token was a different hue family
  per theme** across 254 consumers — concretely `.actions .sec.act-lunchout`
  painted Lunch Out destructive-red in the default theme. All four now use
  **`in oklab`** (rectangular, no hue arc): worst remaining drift 10°.
  `--selection-bg` / `--border-strong` / `--ring-focus` deliberately stay on
  `in oklch` (hue-safe — they mix with `transparent` or a low-chroma neutral
  pair). Two things made this invisible: reading the token file suggests the
  fallbacks are what ship, and the `--muted-2` tripwire measures LUMINANCE,
  which a pure hue rotation leaves untouched. Now pinned by the V-1 tripwire
  (source-level `in oklab` + a computed ≤20° hue-drift bound, both modes) —
  don't add a `-deep` alias, or "correct" a fallback hex, without re-running it.

<a id="g57-a-var-x-fallback-on-a-token"></a>

- **A `var(--x, fallback)` on a token the tokens partial DEFINES is banned (design
  handoff C4, PR 1 — 2026-09-02).** A redundant fallback is a second source of truth
  for the value: `var(--success-deep, var(--accent))` meant "green" in one file and
  the deep alias everywhere else, and `var(--warning-deep, #b86e00)` froze a hex the
  palette round had already moved. Thirty-odd were swept (train ×3, tc, styles, tour,
  qa ×17, kb ×5, cn ×9). The ONLY exempt names are the inline animation parameters
  (`--d`, `--len`, `--circ`, `--target`) — set per element via `style="--d:…"`, defined
  in no tokens file, and their defaults ARE the value (the INV-128 note). Pinned by
  PR1-1, a DERIVED comment-stripped scan over every shared partial (INV-179/188):
  add a fallback to a defined token and CI names the file. NOTE the index's own
  examples were wrong (`--accent-deep` on `.tr-complete-btn`, a `--danger-soft`
  literal) — neither existed; the sweep list came from the tree, not the doc.
  **The CANVAS twin (TW-B, 2026-09-11):** a `<canvas>` cannot read `var(--x)`,
  so the QA waveform and the EmpDocs signature pad read the token through
  `getComputedStyle(...).getPropertyValue('--t') || '#hex'` — and the hex is
  the same second source of truth. Writing the scan found all THREE stale: the
  waveform fell back to `#0b6e40` for `--accent` (that is `--accent-2`'s
  value), the pad to `#101418` for `--ink`, the muted to `#9aa3b2` — values
  no token declares. The rule: a canvas fallback must EQUAL its token's
  Console-light value (`#0f8a52` / `#0f1623` / `#a5acb8` now), so a palette
  change fails CI here until the fallback moves. TW-B also bans any hex
  literal that EQUALS a declared token value anywhere in a scanned partial
  outside two named categories (those canvas fallbacks and INV-166 freezes
  listed with their reason — `.instance-banner` `#8a4500`, exactly once,
  inside its selector). `form_public.html` is excluded (the INV-128
  standalone-palette exemption). **Its third half — a two-sided per-file
  RATCHET counting every OTHER chromatic literal (hex / rgb / hsl) against a
  hand-reasoned baseline — was RETIRED in Batch P (2026-09-11):** cycle 19's
  reflection named it should-have-been-deferred, a maintenance obligation on
  every colour edit in exchange for guarding literals that fire on no real
  page. The one token candidate it had recorded — the clock ribbon's rgba
  fallback twins of `--accent`/`--warn` under their `color-mix` declarations,
  CONSOLE-ONLY, so a Sage/Plum browser without `color-mix` drew the wrong hue —
  rides `--accent-glow` and its new warn-family sibling `--warn-glow` now
  (declared in the two BASE blocks only: a palette never redefines a semantic
  colour), with the `color-mix` line still setting the real strength, so the
  render is byte-identical (re-shot and pixel-compared against the pre-edit
  baseline). Pinned by the P2 ribbon-token pin; the token-equality ban still
  catches a literal that duplicates a token, which is the case the ratchet was
  actually for. See INV-200.

<a id="g58-text-on-a-fixed-palette-surface-must"></a>

- **Text on a FIXED-palette surface must use a fixed colour, not a theme token
  (V-2, cycle-12 visual audit — FIXED).** The clock card's sky gradient does not
  flip with the theme, but `styles.html`'s
  `.hero .clk-time .ampm { color: var(--muted) }` (specificity 0,3,0) beat
  `tc/script_clock.html`'s (0,2,0) `.clk-sky .clk-time { color: #fff }`, so the
  AM/PM span alone tracked the theme while its background didn't — measured
  **1.20–2.00:1 across the whole card in dark mode**, i.e. illegible AM/PM on
  the live clock of a time-tracking app. Fixed by one rule,
  `.clk-sky .clk-time .ampm { color: rgba(255,255,255,.88) }` (theme-identical
  now: 3.89 / 2.45 / 1.52 against the gradient's blue end / midpoint / amber
  end). NOTE the amber-end ratio is a CARD-level question — `.clk-time` itself
  is white-on-amber at the same ~1.5:1 — so it needs an operator design call
  (scrim, or a darker gradient end), not a per-span patch.

<a id="g59-the-coverage-planner-counted-a-rep-on"></a>

- **The Coverage planner counted a rep on lunch as PRESENT until 2026-09-03 —
  a schedule consumer that reads `breaks` must SUBTRACT them, and a DRAFT
  preview must go through the ONE resolver.** `getCoveragePlan` pushed each
  shift as one `[absStart, absStart+lengthMin)` interval; `r.sched.breaks`
  rode along unread, so an hour where the whole desk was at lunch drew green.
  `coverageSplitAtBreaks_` (pure) now splits the interval at shift-RELATIVE
  offsets (`b.startMin − sched.startMin` — an offset is tz-free, so no second
  conversion), and the 15-minute strip on the Admin card is the granularity at
  which a quarter-hour break is visible at all (an hourly band still shows a
  rep present for an hour they left for 15 minutes — stated in the code).
  **The strip previews UNSAVED editor state through the SAME resolver** —
  `withBreakSchedulesProp_(prop, fn)` swaps the per-execution memo the tz
  layer (`getShiftSchedule_`) and the per-agent layer (`empShiftSchedule_`)
  both read, then restores it in `finally`; a second "merge the draft" code
  path would be the parallel-source class INV-149 exists to prevent, and the
  draft is run through `breakSchedSanitize_` first, so what the admin sees is
  exactly what a Save would store. **The demand layer's PST→CST shift is a
  HAND-MIRRORED constant** (`CDR_INBOUND_PST_TO_CST_HOURS` ↔ the CDR repo's
  `INBOUND_HEATMAP_CST_SHIFT_HOURS`; both zones observe DST, so a fixed 2h
  holds) and its columns are found BY HEADER NAME (the Phase-1 rule) with a
  missing column NAMED — a pre-extension export renders no bars, never a
  strip of zeros. Pinned by BCV-1..4 (11 mutations bite-checked).

<a id="g60-a-max-height-on-a-grid-container"></a>

- **A `max-height` on a GRID CONTAINER does not constrain its row (V-9,
  cycle-12 visual audit).** The Reference two-column shell (`.kb-wrap`) needs
  two things at once: a SHORT landing must hug its content (a fixed height left
  ~535px of empty card, reading as a half-failed load) while a LONG article must
  scroll INSIDE its panel rather than growing the page. Moving the fixed height
  to `max-height` on the WRAP looks like the fix and is not: measured in
  Chromium, the grid ROW grew to 13.7k px, the panel overflowed the capped
  container, and the reader's internal scroll was GONE. The cap belongs on the
  grid ITEMS (`.kb-wrap > * { min-height: 0; max-height: … }`) plus
  `align-items: start` so the shorter column doesn't stretch. Verified both
  directions after the fix (landing panel 260px hugging 241px of content; a
  400-paragraph article capped at the viewport and scrolling internally). Any
  new capped-but-content-sized grid here must be MEASURED, not reasoned.

<a id="g61-the-app-has-one-primary-button-vocabulary"></a>

- **The app has ONE primary-button vocabulary: `--accent` green (V-8,
  cycle-12).** `.btn-modal-ok` — the SHARED modal primary behind ~25 call sites
  — was `--ink` on `--ink`, the only inverted button in the app: a near-black
  full-width bar in light mode (on "Generate ADP Export", the money-facing
  action, where near-black reads as disabled/error) and near-WHITE in dark,
  where it visually out-competed the real green primary above it. It now matches
  `.actions .prime` / `.cn-action-prime` exactly. `.ui-dialog-ok.is-danger`
  still overrides at (0,2,0), so destructive confirms stay red. A new primary
  action belongs on this class, not a bespoke one — and never inverted.

<a id="g62-a-state-that-can-be-zero-must"></a>

- **A state that can be ZERO must not be painted in a SURFACE colour (V-10,
  cycle-12).** The live-status sparkline drew a zero-hour day in `--paper-2` at
  1px — 1.10:1 against the card in light mode and ≈ the card in dark — so a rep
  with 3 days off rendered as a 4-bar sparkline instead of 7 bars with 3 empty,
  making "didn't work" indistinguishable from "no data for that day". Now
  `--muted-3` at 3px (2.28:1 light / 2.20:1 dark). `--muted-3` is the
  DECORATION-ONLY tone per the token contract, which is exactly what a
  visible-but-quiet baseline is — don't reach for a text tone here, and don't
  reach for a surface tone either.

<a id="g63-two-chip-rows-with-the-same-shape"></a>

- **Two chip rows with the same shape must not do different things (V-12,
  cycle-12).** The CN Log view rendered a FILTER row (toggle pills with real
  `aria-pressed` state, filtering today's stack in place) and, ~400px below, a
  JUMP row (navigating to History for the week) — same 999px pills, same
  colours, same count-badge vocabulary, DIFFERENT numbers and DIFFERENT
  behaviour, distinguished only by an 11px mono kicker. The navigating row is
  now a link affordance (no pill outline, `--info-deep`, a per-chip chevron,
  underline on hover, and a label naming the destination); the filter row keeps
  the pill because it genuinely carries toggle state. Rule: reserve the pill for
  stateful toggles, use link treatment for navigation.

<a id="g64-the-app-prints-through-one-media-print"></a>

- **The app prints through ONE `@media print` block, and its two
  non-obvious rules are load-bearing (cycle-18 batch 8).** There were no print
  rules at all until then, and the defect that mattered was silent: every modal
  is `max-height: 86vh; overflow-y: auto`, so printing produced exactly one
  screenful — MEASURED, a 2359px pay statement printed 772px, dropping 1587px
  of payroll data with no indication anything was missing. (a) **The neutral
  tokens are forced with `!important`.** Browsers default to
  `print-color-adjust: economy` and drop background fills, so a dark-mode page
  prints a white sheet with `--ink` still near-white — invisible ink, not merely
  ugly. `!important` rather than specificity because the palette blocks are
  `:root[data-palette="x"][data-mode="dark"]` at (0,3,0) and would out-specify a
  plain `:root`; that set grows every time a palette is added. (b) **Chrome is
  hidden BY NAME, never by blanket-hiding `<button>`** — several surfaces use
  buttons to carry DATA (the transfer-count disclosure, KB roster person chips),
  and hiding them all would delete content from the printout. `.no-print` is the
  escape hatch for controls INSIDE printed content, and `body:has(.overlay.open)`
  makes an open modal the print subject so the page behind it does not print
  with it. Verify with `test/visual/print-check.mjs` — a print block cannot be
  checked by reading it, since `print-color-adjust` and `:has()` only exist in a
  real engine.

<a id="g113-read-the-server-through-serversource-never-by"></a>

- **Read the server through `serverSource()` — never by FILENAME, and never by
  POSITION (Batch F2, 2026-09-14).** The server is fourteen files now
  (`web-app/.clasp.json`'s `filePushOrder` is the declaration; Apps Script loads
  them into ONE global scope in that order). A pin that reaches for the server
  has two ways to be coupled to a layout that will move again:
  **(a) BY FILENAME.** `readFileSync(… 'web-app/Code.js')` was in 73 places and
  would have been 73 edits; they go through `serverSource()`, and
  `extractRawFunction('Code.js', name)` still works because `'Code.js'` is an
  ALIAS for "the server" (`isServerFile` is the one place that decides). The F1a
  pin fails CI on a filename read, in `run.js` AND in `scripts/counts.mjs` —
  the latter because a derived COUNT that reads a path is coupled the same way
  (INV-202).
  **(b) BY POSITION.** TQ-3 grabbed three constants with
  `slice(indexOf('const AUTOMATION_TRIGGER_QUOTA'), indexOf('function runTriggerGroup_'))`
  — two landmarks that were neighbours in `Code.js` and are now in different
  files, so the slice swallowed everything between them and evaluated it. Extract
  BY NAME. A pin that depends on two declarations being adjacent is a pin the
  next move breaks, and nothing warns you: it kept parsing, it just read the
  wrong text.
  **The trap inside the fix:** the by-name extractor first truncated a multi-line
  `const X = Object.keys(Y)\n  .reduce(…)` at the first depth-0 newline, leaving
  `Object.keys(Y)` — a VALID expression, so it failed with a WRONG VALUE (3
  retired trigger handlers instead of 8) rather than a parse error. A declaration
  continues while the next line is indented or starts a method chain.
  Verify: the F1a filename ban, F2c (move-only + no duplicate top-level name
  across files), F2d (Code.js is gone, constants load first, filePushOrder runs
  in the numeric order the filenames advertise).

<a id="g65-a-bite-check-ends-in-git-checkout"></a>

- **A bite-check ends in `git checkout`, so never run one against a file with
  uncommitted edits (cycle-18 batch 5B).** The helper mutates a file, runs the
  suite, then restores it with `git checkout -- <file>` — which reverts the file
  to HEAD, discarding any uncommitted work in it. This is the same class as the
  cycle-17 incident that cost an uncommitted `Code.js` block, and it fired THREE
  more times during the 5B sweep. The rule is: **commit before bite-checking**,
  which also makes an imprecise reverse-edit a safe `git checkout` recovery
  instead of lost work. The A14 ratchet caught the last occurrence.
  **It fired a FOURTH time in Batch F1** — the discarded edit was then committed
  as a revert, and only the next full harness run caught it — so the helper is
  committed as `scripts/bite.sh` now and REFUSES a file with uncommitted changes
  before touching it. It also refuses a mutation that changed nothing (a no-op
  mutation proves nothing while reading as a passing bite) and refuses to bite
  ITSELF: bash reads a script incrementally, so mutating it mid-run makes the
  shell resume mid-token and die with the restore never firing. The rule is
  still commit-before-biting; the difference is that the tool now enforces it
  instead of the rule living only in this paragraph. Verify: the F1-followon pin
  (the guard precedes the mutation, the restore is still last).

<a id="g66-an-outerhtml-patch-replaces-one-element-so"></a>

- **An `outerHTML` patch replaces ONE element, so that element must contain
  everything its renderer emits (operator 2026-08-31).** `drRepaintKpi_` does
  `host.outerHTML = drKpiStripHtml_(DR_LAST_DATA)` — the in-place resolve path
  that exists so marking a request resolved doesn't blank the list. When the
  business-hours round made that renderer emit an explanatory note AFTER the
  `.telemetry` div carrying `id="dr-kpi"`, the first render was correct and
  every SUBSEQUENT resolve appended another copy of the note beside the old
  one: the patch replaced the grid it was pointed at and left the sibling
  behind. The fix is structural, not a cleanup call — the id moved onto a
  WRAPPER around strip + note, so the element being replaced IS the whole
  rendered unit. The general rule: **when a renderer grows a new sibling,
  check whether anything patches it by id.** The failure is invisible on
  first paint and compounds once per interaction, which is exactly the shape
  that survives a screenshot review. Same family as the class-vs-identity
  entry below, one level up: there the SELECTOR was too broad, here the
  REPLACEMENT was too narrow. Pinned by the BIZ-3 wrapper-shape assertion.

<a id="g67-a-per-rep-result-cache-on-a"></a>

- **A per-rep result cache on a surface that lists TASKS owes an invalidation
  from every flow that COMPLETES one (F4, cycle 19).** The user's next act
  after finishing a task is to go and look, so a TTL that is fine for a
  read-only aggregate is a visible lie on a to-do list: `getMyPendingTasks`
  backs the Needs-you block, the first thing on the Dashboard, and a rep who
  had just marked training read, passed a quiz, acknowledged a coaching note,
  signed a doc, closed a call-back or resolved a dept request went back to a
  list still naming it for up to `PENDING_TASKS_CACHE_TTL` (120s). Seven call
  sites drop that rep's entry via `pendingTasksBust_(empId)`:
  `markTrainingComplete`, `submitQuizAttempt` (on a PASS — hooking only the
  read path would be a half-fix that looks whole), `acknowledgeCoaching`,
  `acknowledgeDoc`, `setScheduledCallStatus`, and BOTH dept-request resolve
  paths — the shared writer `markDeptRequestResolved_` clears the SENDER (both
  paths route through it) and the in-app `resolveDeptRequest` also clears the
  RESOLVER, the one case where the acting rep is not the owner. Keyed per rep,
  so a targeted `remove` is enough and no generation salt is needed (a salt
  would evict every rep's entry on every resolve — too blunt for a 2-minute
  cache on the busiest surface). Best-effort by construction: a cache miss is
  the correct fallback, so it can never throw into a write that already
  succeeded. TWO deliberate residuals: another member of the same receiving
  desk keeps a resolved request in their incoming list for the TTL (closing it
  needs the salt), and `submitCallNote` is NOT hooked — the notes row derives
  from `getMyMetrics`'s own 5-minute cache, so busting this key alone could not
  change the answer, which would be a claimed fix that does not fix.

<a id="g68-an-async-prefill-must-fill-only-the"></a>

- **An ASYNC prefill must fill only the fields the user has not typed into,
  and a FAILED prefill must not leave a saveable blank form (operator
  2026-09-03).** Day Edit opens blank and `getEmployeeTimesheetForManager`
  fills it about a second later; a manager who typed a corrected Clock In
  before that response landed had it OVERWRITTEN by the stored value, so the
  save sent the old time as a no-op while the lunch and clock-out typed
  afterwards landed — "it kept the old clock-in". Two guards now: a per-open
  sequence (`_deLoadSeq` — a superseded response never applies, even when its
  date matches) and a per-field TOUCHED flag (`_deTouched` — the prefill fills
  only untouched fields). The empty failure handler was the second half of the
  hazard: a blank slot DELETES that punch on save (S7), so a prefill that
  failed silently left a form whose Save would wipe the day; it now disables
  Save and says "reopen to retry". Apply the same two guards to any modal that
  prefills asynchronously. Pinned by the Day Edit DOM test.

<a id="g69-location-reload-reloads-the-iframe-not-the"></a>

- **`location.reload()` reloads the IFRAME, not the app — and that URL is
  session-bound (operator 2026-09-01).** The shell renders inside
  HtmlService's cross-origin iframe, so `window.location` is the
  `script.googleusercontent.com/userCodeAppPanel` URL. Refetching it paints a
  BLANK inner frame while the real `/exec` page above it never moves — which
  is what the deploy-beacon's Reload button did until an operator reported
  having to press the browser's own reload afterwards. This is the THIRD
  instance of one class: the iframe sandbox already poisoned
  `window.location.search` (INV-78, which silently no-op'd every deep link)
  and `origin + pathname` (which shipped the pop-out broken), and both were
  fixed by using the server-injected `SERVER_WEB_APP_URL` instead. **Any code
  that navigates or reloads the app must go through `reloadApp_()` /
  `SERVER_WEB_APP_URL`, never `window.location`.** `reloadApp_` moves the TOP
  window via `Location.replace` — one of only two members a cross-origin
  Location exposes, and a click supplies the user activation a sandboxed
  top-navigation needs — then falls back to a `'_top'` open and only last to
  the in-frame reload. Note the ordering is the contract, not decoration: an
  "obvious" simplification that reloads first short-circuits straight back to
  the blank frame, which is why the pin COUNTS the reloads rather than
  checking that one appears last (the first version of it did, and a
  reload-first mutation passed). Pinned by BCN-3.

<a id="g70-a-class-wide-attribute-write-assumes-every"></a>

- **A class-wide attribute write assumes every member of the class is yours
  (operator 2026-08-11).** `index.html`'s theme reflector did
  `querySelectorAll('.sb-theme-btn')` and wrote `aria-pressed` on every hit —
  correct while that class had exactly two members, wrong the moment the
  reminder-alert toggles reused it for its look. The toggles rendered
  `aria-pressed="true"` in markup and read `false` in the live DOM on every
  load, so the sound toggle silently reset itself each session. The reflector
  now selects `.sb-theme-btn[data-theme-target]` — the attribute that actually
  means "this is a theme button". **Reusing a class for its APPEARANCE is
  normal; what is not safe is a writer keyed on that class rather than on the
  thing it identifies.** The bug is invisible to source review (the markup is
  right) and was found only by reading the attribute back in a real browser.

<a id="g71-a-pill-tab-strip-must-scroll-inside"></a>

- **A pill tab strip must scroll inside itself, or it pushes the whole page
  sideways (operator 2026-08-11).** `.toolbar-tabs` is an `inline-flex` pill
  with no wrap and no scroll; the Admin sub-tabs are five of them, which
  measured 415px against a 390px viewport — the entire page scrolled
  horizontally. It now carries `max-width: 100%; overflow-x: auto` with
  `flex: 0 0 auto` tabs, so the strip scrolls internally and wide layouts are
  byte-identical (max-width only binds when the row would overflow). The
  Admin tab had never been shot at a mobile width, which is how a shared
  component used on several surfaces kept a phone-width defect — see the
  Visual Audit Stage's list of still-uncovered scenarios.

<a id="g72-two-layout-lessons-that-only-measurement-found"></a>

- **Two layout lessons that only MEASUREMENT found, both from one chip
  (operator testing note 10, 2026-09-10).** (a) **An inline
  `white-space: nowrap` pill inside a `1fr` grid track propagates its
  min-content width through the track.** The first presence chip on the Team
  Right Now card was a nowrap inline span; `report.json` flagged +34px page
  overflow on `clock-light-mobile`, and an element walk (skipping every element
  with an `overflow-x` ancestor — the misdiagnosis rule from the Manage Time
  gap) found both `.dash-foot` cards at 412px on the 390px phone: the shell's
  ≤540px `.emp-grid` could not shrink the track below the pill. The chip became
  a wrapping BLOCK (`display:block; width:fit-content; max-width:100%;
  white-space:normal`) and the page went 390/390. A squeezed card and an
  overflowing one look IDENTICAL in a screenshot — read `overflowPx`. (b) **A
  shared descendant rule beats a plain class rule at lower specificity, and the
  loss is invisible in source.** `.card-label > span:first-child { flex: 1;
  min-width: 0 }` is (0,2,1), so the (0,2,0) class rule written to keep the
  "Team Right Now" title on one line LOST to it — measured: title 10px wide,
  "Team / Right / Now" on three lines with the longer summary drawn over it.
  The head rules are (0,3,1) now (the title `flex: 0 0 auto; nowrap`, the
  summary the flexible, right-aligned, wrapping half — title 108px on one
  line, summary two lines beside it). Before fixing a layout under a shared
  rule, compute the specificity you are competing with; the reasoned fix was
  wrong here and the measured one right. Pinned in D-N10 (chip never nowrap,
  both head rules present).

<a id="g73-the-hidden-attribute-loses-to-any-class"></a>

- **The `hidden` attribute LOSES to any class rule that sets `display`
  (operator #2 batch, 2026-08-06 — MEASURED).** The UA stylesheet's
  `[hidden] { display: none }` is ordinary specificity, so
  `.m-controls { display: flex }` beats it and the element renders visible
  with `hidden` set — the Metrics Custom… date rows shipped visible on the
  first shoot exactly this way. Any element that BOTH carries a
  display-setting class AND is toggled via the `hidden` attribute needs an
  explicit `.the-class[hidden] { display: none; }` companion rule
  (`.m-custom-row[hidden]` is the in-tree example, pinned by the #2 pin).
  The alternative idiom — toggling a `.collapsed`/`.open` class — avoids the
  trap but then owes the A11 tripwire its aria-expanded bookkeeping; either
  is fine, half-and-half is not.

<a id="g74-notes-tab-provisions-on-first-touch"></a>

- **`Notes` tab provisions on first touch.** `getCallNotesSheet_`
  creates the tab + header row if it doesn't exist, so a freshly
  enrolled rep's first `submitCallNote` "just works." The header row
  comes from `CN_HEADERS` — any change there must be paired with a
  schema migration plan because existing reps' tabs won't auto-rewrite.

<a id="g75-cn-email-palette-is-hand-resolved-from"></a>

- **`CN_EMAIL_PALETTE` is hand-resolved from design tokens.** Email
  clients strip `<style>` blocks and don't honor CSS variables, so the
  call-note email bodies inline literal hex from a CN_EMAIL_PALETTE
  constant in the server source. If `styles_design_tokens.html` palette values
  change in a meaningful way (e.g., the Console → next palette swap),
  re-resolve the hex equivalents in CN_EMAIL_PALETTE or the email
  aesthetic drifts from the in-app aesthetic. Plus three UMS-brand
  entries (`brand` =
  navy `#223b5d`, `brandSoft` = pale blue `#e6f2ff`, `logoUrl` = the
  UMS Presentation Logo) — these are NOT design-token-derived; they're
  the legacy `closeOrderEmail.js` / `updateOrderEmail.js` identity
  carried forward into the new web-app emails (Call Details table
  header, alternating row tint, top-of-email logo bar). Subform
  detail borders (shipping, resupply, OOP) also use resolved hex —
  `#b1d1c4` for good-transparent and `#e7bda3` for warn-transparent.
  The 2nd-pass email restyle EXTENDED this palette with semantic email
  tokens (`accentBorder`/`dangerBorder`/`warnBorder`, `info` link, `star`,
  `muted2`/`muted3`, `navyTint`) and **routed the Intake/PPD builders onto
  it** (`intakePpdAnswerStyles_`, `intakeBuildPpdBodyHtml_`,
  `intakeBuildAcctBodyHtml_`, the PAP `CONDITIONAL_FORMATTING_ROWS` constants)
  — they previously hardcoded Material/Google hexes. Keep ALL email color on
  this palette; new email color belongs here, not inline. **Email-safe rule
  (re-affirmed by the PPD fix): NO `display:flex` / `gap` / `filter`** —
  Outlook drops them; `intakeRecListHtml_` was rebuilt from a flex `<li>` +
  `filter:grayscale` into 2-cell table rows with explicit grey for rejected.
  **A second email-safe rule (2026-08-11): never place `logoUrl` on a coloured
  fill** — it is a JPEG with no transparency, so a navy band frames it as a
  white rectangle. Every email puts the mark on the light card over a navy
  rule; and because most clients block remote images by default, the `alt`
  text carries the cell's own type styling so a blocked logo still reads as
  the brand.

<a id="g76-clipboard-api-often-fails-in-htmlservice-iframes"></a>

- **Clipboard API often fails in HtmlService iframes.** The auto-copy
  feature tries `navigator.clipboard.writeText` first and falls back
  to a `<textarea>` + `document.execCommand('copy')` shim
  (`cnFallbackCopy_`). Both fire from the Ctrl/⌘+Enter user gesture so
  permissions are usually granted, but never assume one path alone
  works.

<a id="g77-showtoast-msg-type-normalizes-the-variant-pass"></a>

- **`showToast(msg, type)` normalizes the variant — pass either form.**
  Most callers pass the full class (`'toast-success'` / `'toast-error'` /
  `'toast-warn'` / `'toast-info'`), but the Training / EmpDocs partials pass
  bare names (`'success'` / `'error'` / `'warn'` / `'info'`). `showToast`
  (`script_core.html`) now normalizes via
  `cls = /^toast-/.test(cls) ? cls : (cls ? 'toast-' + cls : '')` so both
  render the colored rail + correct glyph. Before the 2nd-pass fix, bare
  names rendered with NO accent rail and fell through to the info glyph
  (18 Training/EmpDocs callsites). `.toast-info` was added at the same time
  (only success/error/warn existed). Either calling form is fine now —
  don't "fix" callers to one style.

<a id="g78-call-notes-flag-enum-vs-blank"></a>

- **Call-notes flag enum vs. blank.** `FlagType` is `''` / `'action'`
  / `'training'` / `'review'`. `sanitizeFlagType_()` lowercases + range-
  checks; bad values fall back to `''` rather than throwing, so
  experimental UI tweaks can't write garbage into the column.
  `Resolved` is only meaningful when `FlagType=action`; the resolve
  endpoint rejects calls on other flag types. Switching flag types
  (e.g. action → training) clears `Resolved` as a side-effect, so
  stale `resolved=TRUE` from a prior action cycle doesn't resurface
  if the rep flips back to action.

<a id="g79-eod-digest-runs-hourly-and-matches-each"></a>

- **EOD digest runs hourly and matches each rep's local EOD hour.**
  `sendCallNotesEodDigest` is triggered `everyHours(1)`; on each run it
  walks the roster and emails a rep only when their local hour equals
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (hour-equality, not a ±minute
  window). This reliably reaches reps in every timezone — the prior
  once-at-manager-5pm window silently skipped offshore reps (IST/PHT)
  whose local 5pm never coincided with the manager's. Most hourly runs
  send nothing (no reps at their EOD hour with unresolved flags), so the
  cost is just a cached roster walk. `EOD_WARNING_WINDOW_MINUTES` is
  retained in CONFIG but is no longer used by the gate. A rare
  trigger-jitter could double-match a rep within the same local hour — a
  benign duplicate reminder, not a miss.

<a id="g80-subformdata-column-p-is-a-generic-per"></a>

- **`SubformData` (column P) is a generic per-note metadata JSON blob.**
  Every client-writable input into it is size-bounded: the submit-path keys
  via `sanitizeCallNotePayload_`'s caps (INV-143), and — since cycle 11
  (L-1) — the four email-composer subform detail objects via
  `CN_EMAIL_DETAILS_MAX_CHARS` (16k combined serialized, enforced in
  `validateEmailSelections_` so BOTH Preview and Send reject identically;
  `sanitizeEmailSelections_` also coerces non-object details to null). They
  were the one unbounded input: a huge pasted specialNote rode into the
  ~50k-cap cell, the post-send stamp failure was swallowed (INV-42), and a
  near-cap blob made every later pin/flag/feedback write on that note throw.
  **Cycle-12 F11 closed the same class in the LENGTH dimension:** the two
  APPEND-ONLY arrays (`feedback[]` — one entry per manager reply / comment /
  rep ack / clarification — and `externalEmails[]` — one per external send)
  had no bound at all, so a long coaching thread on one note, or a note
  emailed repeatedly, walks the cell toward the same limit. All FOUR appends
  now go through `cnAppendBounded_`, which enforces an entry-count cap
  (`CN_FEEDBACK_MAX_ENTRIES` 200 / `CN_EXTERNAL_EMAILS_MAX_ENTRIES` 100) AND a
  serialized-size check (`CN_SUBFORM_MAX_CHARS` 45k, under the cell limit),
  REFUSING with an actionable error and popping the entry back off rather than
  silently dropping the oldest (these arrays are the coaching/send RECORD — the
  INV-96 posture). **The non-growing writes (flag / resolve / pin) are
  deliberately NOT size-gated** — they set scalar fields and are the recovery
  path for an already-oversized note; gating them would make such a note
  unfixable. The `externalEmails[]` stamp runs after a successful send, so a
  refusal there only logs (INV-42) and skips the cell write.
  Originally introduced to persist email-composer subform selections
  (so a "re-send same departments" flow can re-open the composer
  pre-populated), the blob now also stores: `trainingQuestion`
  (set on submit when training flag is selected),
  `trainingReply` / `trainingReplyBy` / `trainingReplyAt`
  (set by `setCallNoteTrainingReply` when a manager answers),
  `pinned` / `pinnedAt` (set by `setCallNotePinned`),
  `completionSeconds` (form-start-to-submit duration captured on
  submit, used by `managerGetShiftStats`'s median calc), and — the
  pilot round-1 pair (2026-08-21), both client-writable and
  INV-143-whitelisted/bounded — `reviewComment` (optional free text on
  a review flag, trimmed + 2000-char cap, set at submit or via
  `setCallNoteFlag`'s 4th arg) and `callDirection` (stored ONLY as
  `'outbound'`; absent = inbound, a bounded enum like `intakeType` so
  no migration and no garbage values). Future
  per-note metadata should also live here rather than spawning new
  columns. `callNoteRowToObject_` tries `JSON.parse` and returns
  `null` on failure rather than throwing — corrupted blobs should
  never break a read.

<a id="g81-late-google-script-run-successhandlers-in-call"></a>

- **Late `google.script.run` successHandlers in Call Notes loaders
  guard on `currentView`.** Every Call Notes loader (`cnLoadToday_`,
  `cnLoadDateRange_`, `cnFireSearch_`, `cnMgrLoadQueue_`,
  `cnMgrLoadRepNotes_`) captures `const requestedView = currentView;`
  and skips the render branch on success/failure when
  `currentView !== requestedView`. (The dead `cnLoadDate_` wrapper was
  REMOVED in cycle-17 batch ⑥ together with this list's mention of it —
  the A4 precedent.) Without this guard, a slow-network
  nav-away clobbers the new view's innerHTML because every view writes
  into the same `#view-area` node. State updates (CN_STATE.*) still
  happen unconditionally so the cache stays warm for when the rep
  returns. Apply the same pattern to any new Call Notes loader.
  **A structured `{error}` response is NOT a wipe (cycle-17 C17-5):** only
  the not-configured (enrollment) branch may clear
  `rollingNotes`/`historyNotes`; any other `{error}` — and every transport
  failure — PRESERVES last-good, sets
  `rollingLoadFailed`/`historyLoadFailed`, and NULLS the SWR stamp
  (`rollingEntry`/`historyEntry`) so a failed round is never served as
  fresh (the INV-129 cache-only-on-success rule applied client-side). A
  failed load with NO last-good renders `errorStateHtml_` in the stack,
  never the empty-day state (the skip-render/INV-187 variant the A12
  tripwire cannot see). Pinned by the C17-5 pin.

<a id="g82-cnrendersubforms-is-shape-keyed-via-host-dataset"></a>

- **`cnRenderSubforms_` is shape-keyed via `host.dataset.shapeKey`.**
  Re-rendering the same shape is a no-op so typing into the Update
  Type field doesn't wipe in-progress subform values on every
  keystroke. When the shape changes (e.g. user switches from
  "Verified Shipping" to "Close Order"), the function first calls
  `cnGatherComposerSelections_()` in a try/catch to snapshot the
  prior DOM into state — so flipping back to the original shape
  restores their values.

<a id="g83-cntogglecomposerdept-updates-the-modal-in-place-no"></a>

- **`cnToggleComposerDept_` updates the modal in place, no full re-render.**
  Earlier versions re-rendered the entire modal innerHTML on every
  chip click, which flashed visibly. The current implementation calls
  `cnUpdateComposerDeptUI_` which mutates only the parts that depend
  on dept selection: chip `aria-pressed` states, the conditional
  "Other" email row, and the update-type datalist's option set. The
  `cnGatherComposerSelections_()` call up front is still defensive —
  it snapshots any in-progress subform values into state so a future
  re-render (e.g., subform shape-key change) doesn't lose typing. Any
  new dept-dependent UI must be added inside `cnUpdateComposerDeptUI_`,
  not in `cnRenderComposerFormStep_` alone, or it won't track toggles.

<a id="g84-optimistic-ui-for-submit-flag-resolve-on"></a>

- **Optimistic UI for submit / flag / resolve on Call Notes.**
  Submitting, flagging, and resolving notes are optimistic — the
  client mutates `CN_STATE.rollingNotes` and calls render BEFORE the
  server RPC fires. Pending notes carry `_pending: true` and render
  with reduced opacity + a "Saving" badge in place of action buttons.
  Server failure triggers `cnRevertPendingSubmit_` (for submit) or
  restores the prior flag/resolved state (for toggles), and surfaces
  a clear toast. Flag/resolve/pin attempts on a pending note show
  "Just a moment — still saving" since the server has no record of
  it yet. A per-note `_flagInFlight` guard drops rapid double-clicks
  on flag / resolve / pin toggles — the second click is silently
  ignored while the first RPC is in flight. Edits and emails remain
  pessimistic — they require a server-issued noteId.

<a id="g85-form-completion-timer-is-persisted-to-localstorage"></a>

- **Form-completion timer is persisted to localStorage.**
  `cnFormTimerStartIfNeeded_` writes the start ms to
  `localStorage['umsCallNotesFormStartedAt']` on the first form
  input event; survives reloads (refresh mid-note shouldn't reset
  the clock). On submit, `cnFormTimerEndAndGet_` returns the elapsed
  seconds — capped at 30 min as null (rep walked away mid-note,
  shouldn't pollute the median). The value rides into the server
  payload as `subformData.completionSeconds`; the manager Stats tab
  medians over notes that captured one. Any new form-clearing path
  must call `cnFormTimerReset_` or the next note will inherit the
  prior session's elapsed time.

<a id="g86-sticky-form-draft-is-auto-saved-on"></a>

- **Sticky form draft is auto-saved on every input.**
  `cnPersistActiveFormDraft_` writes the active form contents to
  `localStorage['umsCallNotesActiveFormDraft']` debounced 400ms.
  `cnRestoreActiveFormDraft_` runs on Log view enter and surfaces a
  "Draft restored" toast when a draft was present. Both the
  successful-submit path and the explicit Clear Note button call
  `cnClearStickyFormDraft_`. **If you add a new form-clearing code
  path, call it there too** or the draft will resurrect on next load
  even though the rep meant to start fresh.

<a id="g87-voice-dictation-routes-audio-outside-the-baa"></a>

- **Voice dictation routes audio outside the BAA boundary.**
  `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED` is off by default. When on,
  the mic button uses `webkitSpeechRecognition`, which in Chrome
  routes the audio to Google's speech-to-text service — and the Web
  Speech API is NOT covered by a typical Google Workspace BAA. The
  operator must confirm the org's HIPAA stance before flipping the
  flag; patient names, device types, and addresses dictated into the
  mic leave the browser. The flag is surfaced via
  `getCallNotesDepartments` → `CN_STATE.deptConfig.voiceInputEnabled`,
  so the UI never renders the mic when the flag is false.

<a id="g88-safetimezone-validates-roster-timezone-strings"></a>

- **`safeTimezone_` validates roster timezone strings.**
  `safeTimezone_(tz)` shape-checks the id first (IANA `Area/Location`
  or a `UTC`/`GMT±h[:mm]` token) and only then probes
  `Utilities.formatDate(new Date(), tz, 'z')`, falling back to
  `CONFIG.TIMEZONE` with a `Logger.log` warning. The shape gate is
  load-bearing: the V8 runtime's `formatDate` no longer throws on an
  unknown tz id (it silently resolves it to GMT), so the try/catch
  probe alone stopped catching roster typos. Residual gap: a
  well-shaped-but-unknown id like `Not/ATimezone` still passes (it
  formats as GMT). Used by `sendCallNotesEodDigest` and
  `sendDailyMissedPunchAlerts`. New code reading timezone values from
  the roster for trigger/automation contexts should route through this
  helper rather than raw `|| CONFIG.TIMEZONE` fallback.

<a id="g89-personal-sheet-sync-failures-log-to-the"></a>

- **Personal-sheet sync failures log to the audit trail.**
  `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a
  `PersonalSheetSyncFail` audit row on failure — it means a rep's
  personal Sheet is inaccessible and drifting from the ADP source of
  truth. These are surfaced (count + recent entries, 30-day window) in
  **Call Notes → Admin → Automation Health** (`getAutomationHealth`),
  so a manager sees the drift without reading the raw AuditLog.

<a id="g90-tag-admin-operations-hold-the-global-scriptlock"></a>

- **Tag admin operations hold the global ScriptLock across all
  enrolled rep Sheets.** `renameCallNoteTag` / `mergeCallNoteTags`
  iterate the roster via `applyTagTransformAcrossReps_`, open each
  rep's Sheet, parse + rewrite `subformData.tags[]` — all inside one
  project-level `ScriptLock` held for the full iteration. Concurrent
  submits / flag toggles / pins across other reps wait until the
  tag mutation completes. Acceptable today (admin ops are rare and
  the working set is small), but if you add reps in volume re-
  evaluate. Per-rep Sheet failures are swallowed via try/catch so one
  broken Sheet doesn't fail the whole rename, but the audit row's
  `repsTouched` / `notesUpdated` counts reflect only successfully
  rewritten reps. `archiveCallNoteTag` is cheap — only the Script
  Property changes — but it still acquires the same lock so it can't
  race with a rename/merge that depends on the current archive set.

<a id="g91-cn-card-buttons-use-data-cn-action"></a>

- **CN card buttons use `data-cn-action` delegation, not inline onclick.**
  `cnInstallCardDelegation_(area)` installs a single click listener on
  the view container that dispatches to `cnToggleFlag_`,
  `cnToggleResolved_`, `cnTogglePinned_`, `cnCopyNoteAgain_`,
  `cnOpenEmailComposer_`, `cnBeginEdit_`, `cnSaveEdit_`,
  `cnCancelEdit_`, `cnDeleteNote_`, `cnFindPriorCallsForTrx_`, and
  `cnToggleMoreMenu_` via the button's `data-cn-action` attribute.
  The note's ID is read from the closest `[data-note-id]` ancestor.
  A `_cnDelegationInstalled` flag on the area element prevents
  duplicate listeners when the user navigates between CN views
  (Log / History / Search share the same `#view-area` DOM node).
  Action handlers call `cnReRenderActiveView_()` instead of
  `cnRenderStack_()` directly — the dispatcher routes to
  `cnRenderStack_` in Log and `cnRenderHistoryStack_` in History so
  flag/pin/edit/delete updates render correctly in both views.
  `cnInstallCardDelegation_` also installs a delegated `keydown` on the
  same container: Cmd/Ctrl+Enter inside any `[id^="cnE-"]` inline-edit
  field saves that note (`cnSaveEdit_`). It's delegated (not a
  per-element listener) so it survives a mid-edit re-render — an
  optimistic flag toggle or ambient refresh recreates the edit field,
  which would otherwise drop a per-element listener; `cnBeginEdit_` only
  focuses the field.

<a id="g92-training-questions-email-managers-immediately"></a>

- **Training questions email managers immediately.**
  `submitCallNote` calls `notifyManagerTrainingQuestion_()` (best-
  effort, try/catch) when `flagType=training` and
  `subformData.trainingQuestion` is non-empty. Previously, managers
  only saw training questions in the weekly digest.

<a id="g93-setcallnoteflag-accepts-an-optional-trainingquestion"></a>

- **`setCallNoteFlag` accepts an optional `trainingQuestion`.**
  When flagging an existing note as `training` from a card button,
  the client prompts for a question and passes it as the third arg.
  The server merges it into `subformData.trainingQuestion` inside
  the same lock. This parallels the active-form path where the
  question is set during `submitCallNote`.

<a id="g94-getmycallnotesrange-caps-at-90-days"></a>

- **`getMyCallNotesRange` caps at 90 days.** The date-range History
  endpoint validates both dates and rejects spans > 90 days. The
  client presets (Last 7, Last 30) stay within this cap; custom
  ranges could hit it. Returns notes sorted newest-first with the
  same response shape as `getMyCallNotes`.

<a id="g95-call-note-delete-window"></a>

- **Call-note delete window.** `deleteCallNote` enforces
  `CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS` (5 min). Reps can only
  delete notes within 5 minutes of creation — older notes must be
  edited in place. The window matches the time-clock `selfDeletePunch`
  pattern. The client's delete button (via `cnDeleteNote_`) shows the
  server's error if the window has passed.

<a id="g96-getcallnotesdepartments-requires-an-enrolled-employee"></a>

- **`getCallNotesDepartments` requires an enrolled employee.** Added
  an auth check so unregistered domain users can't read internal
  department email addresses. The CN client calls this after employee
  state loads, so the auth is always present.

<a id="g97-call-notes-ambient-polling-stops-on-tool"></a>

- **Call Notes ambient polling stops on tool switch.** `showView()`
  calls `cnStopAmbientPolling_()` when navigating to a non-Call Notes
  tool. Without this, the 60-second `getCallNotesAmbient` interval
  fired continuously even in Time Clock views.
  `cnStartAmbientPolling_()` restarts it on return to any CN tab —
  `showView` calls it symmetrically for `callNotes`-tool views (cycle-8
  fix; previously only the Log enter started it, so a deep-link/
  refresh-restore into History/Search left the badge + flag propagation
  dead). The start is IDEMPOTENT (a live timer is left alone) so
  CN-internal tab hops don't fire an extra RPC per nav.

<a id="g98-the-log-rolling-stack-live-refreshes-3"></a>

- **The Log rolling stack live-refreshes (#3).** The Log view is a
  today-only, fetch-on-enter view (`getMyCallNotes` returns one day);
  `cnRefreshRollingStack_` re-fetches today's notes + re-renders so a note
  logged in ANOTHER context (the pop-out / a second window — they share the
  server Sheet but NOT in-memory `CN_STATE`) surfaces without a manual nav.
  Triggered from the 60s ambient poll (Log only) + window `focus`/
  `visibilitychange` (`cnEnsureLiveRefreshBound_`, 2s throttle, idempotent
  bind). It preserves optimistic `_pending` notes (filters them back on top of
  the server set) and is SKIPPED while an inline edit is open
  (`CN_STATE.editingNoteId`) so it can't wipe an editor. It re-renders only
  `#cn-stack` + the filter bar, not the form/modals. (NOTE: nav-back already
  re-fetched; this closes the cross-window staleness gap. The whole-stack
  re-render could diff-before-render to avoid a scroll jump — accepted as-is
  since the stack is small.)

<a id="g99-sidebar-badge-selectors-use-data-tool-not"></a>

- **Sidebar badge selectors use `data-tool`, not `data-view`.**
  The sidebar renders `data-tool="callNotes"` / `data-tool="metrics"`
  on its buttons. Badge pollers that query the sidebar must use
  `.sb-link[data-tool="..."]`, not `data-view`. A prior mismatch
  caused the CN stale-flag badge to silently never render. The
  Metrics alert badge follows the same `data-tool` pattern.

<a id="g100-modals-close-on-escape-through-their-close"></a>

- **Modals close on Escape THROUGH their close hook — dynamic overlays
  must be created via `ensureOverlay`.** The shared keydown handler in
  `script_core.html` closes the **topmost** `.overlay.open` (last in
  DOM order, matching the focus trap) via `closeOverlay(el)`, which
  runs the close function registered in `OVERLAY_CLOSE_HOOKS` and only
  falls back to a plain `open`-class strip for static modals with no
  module state (Adjust, Day Detail, Day Edit, Export, Manager
  Time-Off, Call Notes Export). Dynamically-created overlays (CN
  dept/external composers, CN form-sub viewer, Intake preview, KB
  editor) are created via `ensureOverlay(id, { onClose })`, which
  ALWAYS re-asserts `overlay open` on reuse and registers the module's
  close function. This closed a real bug class: Esc used to strip only
  the class, leaving the node hidden-but-stateful — the CN composers
  then rendered into the hidden node forever (email flow dead until
  reload) and the Intake modal's document-level paste listener leaked
  app-wide, silently swallowing image pastes. Any NEW dynamic overlay
  must use `ensureOverlay` (never hand-roll `createElement` +
  `className = 'overlay open'`), and its `onClose` must be idempotent
  (safe to call when already closed). The `focusin` handler still
  returns focus to the topmost open overlay's first focusable element
  (the KB drawer is exempt). **Focus lifecycle (a11y batch H):** on a
  closed→open transition `ensureOverlay` stashes the trigger element and
  defer-focuses the first focusable inside the dialog (skipped for
  hover-mode popovers and when the module already placed focus inside);
  `closeOverlay` restores the trigger ONLY when the overlay actually
  closed — a hook may legitimately refuse (the INV-145 mid-send guard),
  and yanking focus then would fight the module (DOM-pinned).
  `uiConfirm`/`uiPrompt` also restore the trigger on cleanup.

<a id="g101-public-form-endpoints-have-no-employee-auth"></a>

- **Public form endpoints have no employee auth — token is the
  credential.** `getFormByToken` and `submitFormByToken` are the
  only server functions accessible without `getEmployeeInfo_()`
  auth. They validate via UUID token (checked against the
  `FormTokens` sheet tab). Never add PHI-returning logic to these
  endpoints beyond what the token already authorizes. The token
  contains the form type and prefill data — it does NOT grant
  access to the rep's call notes, employee roster, or any other
  internal data. `serveExternalForm_` serves `form_public.html`
  which is a standalone page with no `include()` of internal
  partials. `submitFormByToken` also bounds the recipient-supplied
  payload before writing — field-count (≤200) and per-cell char caps
  (~45k, under the 50k Sheets cell limit) on the data JSON and the
  signature — returning a specific, actionable error and leaving the
  token `pending` for retry instead of throwing mid-append on an
  oversized signature (INV-96).

<a id="g102-form-submissions-are-phi-and-segregated-hashed"></a>

- **Form submissions are PHI and segregated, hashed, and consent-stamped.**
  (Forms-hardening pass.) `getFormsSS_()` resolves `FormTokens`/`FormSubmissions`
  to Script Property `FORMS_SS_ID` (point it at `INTAKE_SS_ID` to move PHI off
  the ADP/payroll sheet) and falls back to the ADP SS only for back-compat — a
  fresh deploy that wants segregation MUST set `FORMS_SS_ID` and migrate the two
  tabs. `submitFormByToken` pulls `signature` AND `_meta` out before storing
  responses, **server-enforces consent** (the payload must carry
  `_meta.consentAgreed === true` — an absent `_meta` is now rejected too,
  closing the prior back-compat hole where a hand-crafted payload could omit
  it), stamps the **server-authoritative** `CONFIG.FORM_CONSENT_VERSION`
  (never trusts a client-sent version), and writes a **tamper-evident
  `SubmissionHash`** + a `Certificate` JSON into trailing `FS` columns. The hash
  (`computeFormSubmissionHash_`) covers responses+signature+token+consentVersion
  — **NOT `submittedAt`** (Sheets coerces an ISO datetime to a Date on read,
  which would break recompute); the timestamp's independent witness is the
  append-only `FormSubmissionReceived` audit row (which now carries `hash=` +
  `submittedAt=`). `verifyFormSubmissionIntegrity_(token)` (manager-gated,
  read-only) recomputes and compares — a mismatch means the stored row was
  altered. `FS_HEADERS` grew by trailing columns (back-compat like `CN_HEADERS`:
  old 6-col rows read back with the new fields undefined; `verify`/the viewer
  treat a missing hash as "legacy, can't verify", not a failure). **The invite
  email stays PHI-minimal** — prefill lives in the token, never the email body
  (pinned by the `forms — invite email builders` Node guard); the rep's freeform
  `subject`/`message` must not carry clinical PHI. **Suitability:** this pipeline
  is appropriate for patient-self-submission (EAA, self-serve PPD, demographics);
  it is NOT a signature-of-record for provider-signed clinical documents
  (PT/OT Rx, seating evals) submitted to payers — those need a certified e-sign
  vendor or a DMEPOS platform (CMS signature-validity + the supplier-can't-author
  rule + corroborating-record requirements are out of this tool's reach).

<a id="g103-leave-deduction-client-mirrors-the-server-s"></a>

- **`LEAVE_DEDUCTION_CLIENT` mirrors the server's `getLeaveDeduction_`
  exactly.** Powers the live balance-after preview in the PTO day
  modal (`tc/script_timeoff.html`). Adding a new leave type means
  updating BOTH maps — plus `TIME_OFF_TYPES`, the server-side submit
  whitelist (INV-95), and the `day-type` `<select>` options in
  `modals.html` (a Node-harness tripwire pins that the options stay a
  subset of `TIME_OFF_TYPES`); the server still does the actual balance
  deduction on submit, so a drift causes the UI to mis-preview
  without corrupting state, but the rep sees a wrong projected
  number on hover/select. Same maintenance discipline as the
  `CN_EMAIL_PALETTE` constant.

<a id="g104-clock-view-coverage-strip-is-swr-cached"></a>

- **Clock view coverage strip is SWR-cached per day (cycle-9 M-6).** The
  Clock view's `loadCoverageStrip_` paints `CLK_COVERAGE_CACHE` (date-keyed)
  instantly, then ALWAYS background-refetches `getMyMetrics(today)` and
  re-renders — the `CLK_NOTEVOL_CACHE` pattern. (The pre-cycle-9 cache-hit
  early-return froze "N% logged · File N missing" for the WHOLE day: the
  formerly documented nav-away-and-back refresh path re-entered the loader
  and hit the cache, so a rep who filed the missing notes kept seeing the
  stale CTA until reload/midnight — worst in the pinned all-shift pop-out.)
  Freshness is now bounded by `getMyMetrics`'s 5-min server result cache
  (L-1), and an error/failed refetch keeps the last-good render (blank only
  on a cold miss). Don't reintroduce a cache-hit early-return here.

<a id="g105-getmymetrics-is-also-server-result-cached-l"></a>

- **`getMyMetrics` is ALSO server-result-cached (L-1).** Independent
  of the client cache above, the endpoint caches its assembled result
  in `CacheService` for `CONFIG.CDR_CACHE_TTL` (5 min) keyed by
  `metrics_my_v2:<emp.id>:<date>`. It's the only rep-facing CDR read
  and per INV-124 it scans the WHOLE roster's per-rep matrix +
  the Transfer sheet UNCACHED on every open — the result cache keeps a
  Metrics-tab re-enter / date toggle from re-scanning. The cache is at
  the ENDPOINT layer, so INV-67 ("`getCdrDailyBreakdown_` is uncached")
  stays literally true — the helper just isn't re-called on a hit. Keyed
  by `emp.id` so no rep reads another rep's cached self-view; error
  results are never cached; same ≤5-min staleness tradeoff as
  `getMetricsAmbient` and the Clock strip. The cache is BYPASSED (read +
  write) whenever a test CDR override (`_TEST_OVERRIDE_CDR_SS_ID`) is active —
  the same special-casing `getCdrSS_`/`getIntakeSS_`/`getKbSS_` apply — so a
  fixture test's cached success can't mask a later test's CDR state (it was
  masking the `metrics_getMyMetrics_cdrUnavailableErrors` error-path test,
  since `_resetCdrCaches_` only clears the in-memory CDR caches, not this
  CacheService entry). Production is unaffected (the override is undefined).

<a id="g106-metrics-enters-call-stopclock-to-avoid-an"></a>

- **Metrics enters call `stopClock` to avoid an interval leak.**
  `enterMetricsMyStatsView` and `enterMetricsTeamView` call
  `stopClock()` at the top (guarded by `typeof`) so the Clock view's
  1Hz live-time + 60s ribbon-now-cursor intervals don't keep firing
  in the background after navigating from Clock to Metrics — matching
  the Time Off / Manager / Call Notes enters. (Before this they didn't,
  a bounded leak: both tick functions early-return when their target
  elements aren't in the DOM, so it was wasted timer fires, no
  functional bug.)

<a id="g107-apps-script-s-htmlservice-iframe-sandboxes-window"></a>

- **Apps Script's HtmlService iframe sandboxes `window.location.search`.**
  The user-facing deploy URL's query string (`?compact=1`, `?tool=X`,
  `?prefill=...`) is invisible to client JS via `window.location.search`
  inside the iframe (`script.googleusercontent.com`). Read URL params
  from `window.SERVER_QUERY_PARAMS` instead — `doGet` evaluates
  `index.html` as a template with `serverQueryParams = e.parameter`,
  and the `<head>` script injects it into the window global. The XSS
  escape replaces `<` with `<` to prevent attacker-controlled query
  values containing `</script>` from breaking out. `__URL_PARAMS` in
  `script_core.html` consumes it with a `window.location.search`
  fallback for local dev. Pre-Round-2 deep-link contracts (compact
  pop-out, `?tool` deep-link) silently no-op'd in production because
  of this; the fix unblocked them all simultaneously. The SAME sandbox
  also poisons `window.location.origin + pathname`: it's the
  session-bound `googleusercontent.com` iframe URL, which renders a
  BLANK page when opened as a top-level window — the pop-out button
  shipped broken on exactly this until operator testing caught it.
  `doGet` now also injects `window.SERVER_WEB_APP_URL` (the normalized
  `/exec` base via `getWebAppExecUrl_`, shared with `buildFormUrl_`) and
  `popOutCurrentView` opens THAT. Any future client code that needs the
  app's own URL must use `SERVER_WEB_APP_URL`, never `window.location`.
  Pinned by a Node tripwire.

<a id="g108-form-public-html-must-inject-form-token"></a>

- **`form_public.html` must inject `FORM_TOKEN` via the unescaped
  `<?!=` scriptlet.** The standalone public form page receives its
  token through `serveExternalForm_`'s `tpl.formToken`. It must print
  via `<?!= JSON.stringify(formToken||'').replace(/</g,'<') ?>` —
  the escaping `<?=` variant HTML-encodes `JSON.stringify`'s
  double-quotes into `&quot;`, yielding invalid JS
  (`var FORM_TOKEN = &quot;…&quot;;`) and a mangled/empty token, so
  `getFormByToken` finds no row and the page shows "Form not found."
  Same `<`→`<` XSS guard and rationale as the
  `SERVER_QUERY_PARAMS` injection (INV-78). Pinned by
  `test_tpl_formToken_usesUnescapedScriptlet` +
  `test_tpl_noEscapedJsonInjection` (the latter forbids any escaping
  `<?=` JSON injection across HTML templates).
  ALSO: never write the literal scriptlet delimiters (`<?` / `?>`) or a
  literal closing `</script>` tag inside a JS *comment* in any
  HtmlService template (`form_public.html`, `index.html`). The template
  engine scans the raw file for scriptlet delimiters regardless of JS
  comments, so a comment containing one opens a spurious scriptlet whose
  body begins with stray text → a server-side "Unexpected token" error
  at `tpl.evaluate()` (`serveExternalForm_`). This regressed the
  fillable-form link until fixed — the page failed to load with
  `SyntaxError: Unexpected token ')'`. Now also pinned by
  `test_tpl_formPublic_evaluatesWithoutError`, which `.evaluate()`s the
  template (not just string-matches the raw file) so this class of bug
  is caught.

<a id="g109-form-public-html-s-signature-canvas-must"></a>

- **`form_public.html`'s signature canvas must be resized when its
  section becomes visible.** The signature `<canvas>` lives in
  `#sig-section`, which is `display:none` until the HIPAA-consent checkbox
  is checked. `initSignaturePad`'s `resizeCanvas()` reads
  `parentElement.getBoundingClientRect()` — while hidden that's a 0-width
  box, so the canvas gets a 0-width drawing bitmap and the first strokes
  land nowhere. Symptom: "I couldn't draw until I hit Clear" (Clear was the
  only other path that re-ran the resize). Fix: the consent `change`
  handler calls `SIG_PAD.resize()` when it reveals the section (guarded on
  `SIG_PAD.isEmpty()` so an uncheck→recheck can't wipe a drawn signature,
  since setting `canvas.width` clears the bitmap). A `.sig-placeholder`
  overlay ("Tap or click and drag here to sign") hides on first stroke /
  shows on Clear. Any new code path that toggles the section's visibility
  must re-resize the canvas the same way. **Typed-signature alternative
  (a11y):** both pads (this one and the EmpDocs twin) expose
  `setTypedName(name)` behind a "Can't use the pad? Type your signature
  instead" disclosure — the typed name renders ONTO the canvas in a script
  face, so the exported artifact stays the same PNG data-URL class as a
  drawn signature and the whole downstream pipeline (600px export cap,
  size caps, hashes, certificates, C13 dual-verify) is untouched. Node
  parity pin `both pads carry setTypedName` keeps the twins in lockstep.

<a id="g110-form-public-html-s-local-esc-escapes"></a>

- **`form_public.html`'s local `esc()` escapes quotes (F cycle-8) — don't
  "simplify" it back to `textContent`→`innerHTML`.** Unlike the shell's `esc()`,
  the standalone public page had its own copy that escaped only `&`/`<`/`>` (the
  `textContent`→`innerHTML` round-trip doesn't encode `"`/`'`), yet it's used in
  ATTRIBUTE contexts (`value="' + esc(x) + '"`). Every value there is a hard-coded
  literal today, so it was latent — but a future server/recipient string rendered
  into an attribute would break out. `esc()` now escapes `& < > " '` explicitly;
  keep it that way (matches the shell `esc()`).

<a id="g111-call-notes-form-fields-are-contenteditable-ce"></a>

- **Call Notes form fields are contenteditable `.ce` divs, not
  input/textarea.** Read via `cnGetFieldValue_(id)` and write via
  `cnSetFieldValue_(id, value)` — both dispatch on `el.isContentEditable`
  so the helpers work transparently for the `.ce` divs AND legacy
  input/textarea (`cn-tag-input`, `cn-fld-training-q`, email modal
  fields). The setter also toggles the `.empty` class (for the
  `data-placeholder` pseudo-element) and dispatches an `input` event
  so persistence + completion-timer + phone-formatter listeners react
  the same way as user typing. Paste is sanitized to plain text via
  `execCommand('insertText')` on each `.ce`. A bound `copy` event on
  `#cn-frame` writes the full formatted CRM template via
  `cnFormatNoteForCopy_` — since 2026-08-13 ONLY when the selection is
  collapsed; a real selection copies what is selected (see the
  manual-copy-failover Key Design Decision for why the blanket
  intercept inverted into a bug once the fields became contenteditable).
  COROLLARY: any document-level keyboard handler that exempts form
  fields must check `document.activeElement.isContentEditable` in
  addition to the `INPUT`/`TEXTAREA`/`SELECT` tagName check — the `.ce`
  divs are DIVs, so a tagName-only guard misses them. The shell's
  bare-`?` shortcuts-overlay handler (`script_core.html`) regressed on
  exactly this (a literal `?` typed into Issue/Resolution opened the
  overlay and swallowed the keystroke) until the isContentEditable
  check was added.

<a id="g112-eighteen-client-side-localstorage-keys-total"></a>

- **Eighteen client-side localStorage keys total.** All per-browser, all
  wrapped in try/catch so a privacy-mode browser doesn't break:
  - `umsTimeClockMode` — dark/light preference (read by the boot
    script in `index.html`).
  - `umsCallNotesActiveFormDraft` — the in-progress Call Notes form
    auto-saved on every input (debounced 400ms); restored on next
    Log view enter with a "Draft restored" toast. Cleared on
    successful submit or explicit Clear Note. Round 2 · 8e extended
    the persisted shape to include `flags[]` (multi-select) + `tags[]`;
    pilot round 1 (2026-08-21) added `reviewC` (the review-flag
    comment) + `direction` (the outbound toggle) — the full
    persist/restore/clear/snapshot/park round-trip carries both.
    Drafts carry an `at` ms stamp and expire after 24h
    (`CN_FORM_STICKY_MAX_AGE_MS`) — a stale draft from a prior shift
    is silently discarded (and the completion timer reset) instead of
    resurrecting day-old patient details into a fresh session.
  - `umsCallNotesFormStartedAt` — start-ms of the active form's
    completion timer; persists across refresh so a mid-form reload
    doesn't reset the clock. Captured into `subformData.completionSeconds`
    on submit.
  - `umsSidebarW` — sidebar width in px (Round 2 · 8a); range-checked
    on restore (56–280px). Default 168px when absent or out of range.
  - `umsKbPanel` — KB drawer preferences as ONE JSON blob:
    `recents[]` ({id, title}, capped 5, deduped) + `suggest` (bool,
    default true — the context-suggestions toggle) + `aiSeen`
    ({hash, date} — the Phase A guidance card's collapse-after-seen
    marker; same facet combo renders collapsed for the rest of the
    day) + `deptCollapsed` ({deptName: bool} — the Reference tab's
    collapsible-department open/closed state, written by `kbToggleDept_`)
    + `bookmarks[]` ({id, title}, capped 12, deduped — #5 per-rep favorites,
    toggled via the reader/drawer star `kbToggleBookmark_`/`kbBookmarksToggle_`,
    surfaced in a Bookmarks block atop the Reference landing + the drawer home).
    Sanitized on read (corrupt blob → `{}`); deliberately a
    single key so drawer prefs don't multiply the key count.
  - `umsLastView` — the active tab key, written by `showView` on every
    navigation EXCEPT in the compact pop-out (cycle-10 D8 — a pinned
    pop-out must not steer the main window's boot tab). On boot (when no
    `?tool=` deep-link is present) the shell
    re-enters this tab instead of defaulting to Time Clock, so an
    accidental refresh mid-note lands back on the Log view where the
    sticky form draft restores the typed fields. `enterTool`'s
    managerOnly bump makes a stale manager-tab value safe for reps.
  - `umsTour` — onboarding-tour state: `{seenVersion}`. The coach-marks
    tour auto-starts once per `TOUR_VERSION` (bump to re-offer after a
    material UI change); stamped on finish/skip. Replayable anytime from
    the Call Notes ? menu regardless of this flag.
  - `umsPopoutGeom_<tool>` — compact pop-out window geometry `{w,h,x,y}`,
    **keyed per tool** (#4 + per-tool windows). Written by
    `popoutPersistGeometryInit_` (compact window only, debounced on resize +
    on `beforeunload`) under the tool the window was opened for; read by
    `popOutCurrentView` (in either window — same-origin localStorage is shared)
    via the pure, range-guarded `popoutParseGeom_` (corrupt/out-of-range → null
    → default 480×800). A legacy single-window `umsPopoutGeom` blob seeds the
    SIZE only (not position) so a fresh per-tool window doesn't stack on an
    existing one. So each tool's pop-out remembers its own size/position across
    launches. Position is best-effort (browsers restrict programmatic move of an
    existing window).
  - `umsIntakeDrafts` — in-progress Intake form answers (PPD / PMD / PAP)
    as ONE JSON blob keyed by form type (`INTAKE_DRAFT_KEY`), auto-saved on
    input, restored on the form's view enter, cleared on send + Clear. Like
    the Call Notes draft it carries an `at` ms stamp and expires after 24h.
    NOTE this is **PHI at rest in the browser** (patient answers) — the same
    posture as the Call Notes active-form draft; it lives only in the rep's
    own browser and is wiped on send/clear/expiry.
  - `umsCoachingMode` — the merged Coaching tab's Mine/Team mode (managers
    only; `'mine'` | `'team'`, default `'team'`). Reps never write it (they're
    always pinned to `'mine'` and never see the toggle). Read by
    `coachReadMode_`, written by `coachSwitchMode_`.
  - `umsCoachingFilter` — the manager Team Coaching feed's filter strip choice
    (`'all'` | `'ack'` | `'overdue'` | `'praise'` | `'voided'`, default `'all'`;
    design handoff PR 4). Validated against `COACH_FILTERS` on read — a corrupt
    value falls back to All. Written by the strip's click handler.
  - `umsWhatsNew` — the "What's new" seen-stamp (`{seenStamp}` — the designated
    KB article's edit timestamp at last panel dismissal, INV-152). Since the
    operator-feedback round (2026-07-09) the panel NO LONGER auto-opens:
    updates surface as rotating slides in the Dashboard greeting bar
    (`clkGreetRot*` + the pure `whatsNewItems_`), and the stamp gates the NEW
    accent on those slides. Clicking a slide / the sidebar star opens the full
    panel; ANY dismissal path (Got it, Esc, backdrop — the modal renders no
    separate X button) stamps it via
    `whatsNewClose_`. Corrupt blob = never seen (NEW accent shows — fail-open).
  - `umsNotify` — reminder-alert channels as ONE blob (`{sound, desktop}`,
    operator 2026-08-11). `sound` DEFAULTS ON (a corrupt/absent blob reads as
    sound-on, desktop-off); `desktop` is only ever set true after the browser
    actually GRANTS permission, so it can't promise a channel that will never
    fire. Read by `notifyPrefs_`, written by the sidebar/mobile-header bell +
    pop-out toggles. Being localStorage, it is shared origin-wide, so setting
    it in the main window also governs the compact pop-out (whose sidebar is
    hidden).
  - `umsTheme` — the colour PALETTE (operator 2026-08-12): `'sand'` / `'plum'`
    / `'teal'`, or ABSENT for the default Console. Console deliberately stores
    NOTHING rather than the string `'console'`, so an untouched browser and a
    deliberately-reset one look identical in localStorage — and the boot script
    validates against `PALETTE_KEYS`, so a corrupt value degrades to Console
    rather than being reflected onto `<html>`. Read + applied SYNCHRONOUSLY in
    the `<head>` (the `data-mode` discipline — a palette flash on every load
    would be worse than no palette), written by `setTimeClockPalette`.
  - `umsTzWarnedDay` — the roster-vs-browser timezone-mismatch warning's
    once-per-day stamp (operator 2026-08-13; the 9:30 PM note diagnosis).
    Written by `tzMismatchCheck_` when the browser's UTC offset disagrees
    with the roster timezone's; the sticky warn toast then fires at most
    once per browser-local day. Absent/corrupt = the check may warn today.
  - `umsDashMetrics` — the Dashboard metric cards' same-day SWR blob
    (`{day, data}` — the last COMPLETE, fully-successful
    getDashboardMetrics round for all three periods). Seeded on a same-day
    cold boot so a reload paints instantly; the refetch still runs
    (freshness is never inherited — INV-156), and partial/failed rounds
    are never persisted (INV-129). Aggregate call metrics only — no PHI.
  - `umsRemindFired` — the reminder ticker's CROSS-WINDOW fired-set
    (`{day, keys}`, operator 2026-08-17: the main window and a pinned
    pop-out each run `remindersTick_`, so every break/clock-out reminder
    toasted + chimed TWICE). `remindOnce_` checks + writes it, so a
    reminder fired in ANY window is marked for all; a different `day`
    resets it (the in-memory set's own rollover rule), and a
    localStorage-throwing privacy-mode browser degrades to per-window
    dedupe — the pre-fix behavior, never worse.
  - `umsQaPeriod` — the QA Recordings tab's audit-period pick (design
    handoff PR 5, 2026-09-02): a `yyyy-MM` or `yyyy-Qn` key VALIDATED against
    the options the server shipped before it is stored; the server's echoed
    `period` always wins on load (an unknown key lands on the current
    month), so a stale pref can never pin a period the server would not
    compute. Absent = the current month.
  Clearing browser data wipes all eighteen. (`umsMergeMode` — the Time/PTO
  Time Off ⇄ Timesheet mode — was RETIRED with the 2026-08-18 consolidation:
  the two modes were one page with a swapped 240px rail, so the rail now
  stacks both; a stale stored value is simply ignored.) (`umsCallNotesLastDept` — the
  composer's last-dept default — was REMOVED by operator decision 2026-08-13:
  pre-selecting the previous note's departments on an unrelated note invites a
  mis-send, and the failure mode is an email leaving the building rather than
  retyping. A re-send still restores the note's OWN stored departments. The KB
  AI facet-gather's department facet, which piggybacked on this key, is simply
  absent now.) (A prior key,
  `umsDashboardCompact` — an in-page Dashboard compact toggle — was REMOVED in
  the dashboard-feedback batch: the toggle button lived inside the column it
  hid, so once collapsed there was no way back, and the `?compact=1` pop-out
  already covers compact.)
