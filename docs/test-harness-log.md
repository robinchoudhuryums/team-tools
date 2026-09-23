# Test harness log — what each batch added, and what bit

Moved VERBATIM out of `.cycle/config.md`'s Test Command section by Batch D2
(2026-09-14). Nothing here was rewritten: the section had grown to 1,065 lines,
which is a LOG of every batch's additions and every editor-test hazard, not the
configuration a workflow command needs when it reads "Test Command". The
command now finds `manual` plus a ~30-line summary; the reasoning, the dated
rounds and the hazards are here.

**How to read it:** `test/client/README.md` is the HOW-TO (writing a pin,
running the harnesses, the `extractRawFunction` contract). This file is the
WHY and the WHEN — it is a record, so a count inside it is a fact of its date,
not a live claim. Every live figure is in CLAUDE.md's generated running-totals
block.

---

The Apps Script suite (`web-app/Tests.js`) runs inside the editor
(`runSmokeTests()` / `runAllTests()`, automating scenarios S1–S2; no
Apps Script runtime exists off-editor). Pure client-side helpers also
have a dependency-free Node harness — `node test/client/run.js` (or
`npm test` from the repo root) — that loads the HtmlService `<script>`
partials into a `vm` sandbox with browser/GAS stubs and unit-tests pure
functions (`esc`, `empTz` / `isoDateTz`, the metrics date helpers,
`cnExtEmailPillHtml_`, `cnIsUrgent_` / `cnUrgentPillHtml_`, the
external-email template-picker helpers `cnExtTemplatesFor_` /
`cnExtTemplateOptionsHtml_`, `cnLatestManagerReply_` (the training
feedback[]-vs-legacy precedence helper), and the server-side
`cnExtractAuditNoteId_` parser, the `buildPatientTimeline_` (#3 patient/TRX
timeline merge — substring TRX match + noteId-linked forms + newest-first
sort) and `deployReadinessItems_` (#1 pre-deploy checklist banding — required
fail / optional warn / tz-mismatch warn / heartbeat warn) and
`retentionWarnings_` (the 3-tier retention safety-ordering warnings) pure
helpers, plus the `isValidTimeOffType_` leave-type
validator extracted from `Code.js` via `extractRawFunction` — the latter
with a coupling tripwire asserting the `day-type` `<select>` options stay
a subset of `TIME_OFF_TYPES`, the feature-flag layer
(`FEATURE_FLAGS` registry integrity + `getFlag_` Script-Property override
/ fail-safe semantics, run in a stubbed `PropertiesService` context), the
branded-email builders (`buildBrandedEmailHtml_` esc_'s the heading +
embeds the caller-escaped body raw; `brandedKvRows_` esc_'s both label
and value — INV-105), and a source-level coupling tripwire asserting the
automation **trigger wiring is self-consistent** (every
`ScriptApp.newTrigger('X')` handler in `installAutomationTriggers` appears
in BOTH the install and `removeAutomationTriggers` `TARGETS` dedupe arrays
— the exact class of bug that duplicated `purgeOldCallNotes` until it was
added to both), **plus a trigger-GATE-TYPE check (every install-`TARGETS`
handler calls `assertManagerCaller_` and references no `.isAdmin` in code — the
F1 class) and a declarative `COUPLING_REGISTRY` (the Axis-B drift net: each entry
extracts a `sub` + `sup` key-set from raw source and asserts `sub ⊆ sup`, so the
next parallel-source coupling is ONE entry — seeded with the F5 Automation-Health
label maps: `DIGEST_LABELS` ⊇ `DIGEST_STALE_HOURS` + `CN_HEALTH_RUN_LABELS` ⊇
`AUTOMATION_AUDIT_ACTIONS`; couplings needing a vm-loaded value or custom logic
keep bespoke tripwires)). Cycle 7 added the
next tripwire families: the spreadsheet-factory set (createPinnedSpreadsheet_
pins tz+locale; a comment-stripped count forbids bare `SpreadsheetApp.create(`
outside it; the three call sites route through it — INV-141), the CN-timestamp
boundary (the enumerated readers use `cnTimestampString_` PLUS, since cycle 8,
a GLOBAL whitelist scan of every `[CN.TIMESTAMP]` occurrence in Code.js — a
fifth reader added anywhere now trips it — INV-142),
the coaching-parser pin (H-1), the **AuditLog typed-reader family** (Batch 3,
cycle-8 — replaced the narrow dashboard M-3/M-4 pin: `auditRowObj_` recovers each
coerced `AUDIT` column via its normalize helper, both object-readers route through
it, and a GLOBAL scan fails CI on any raw coerced-`AUDIT`-column read outside it —
the F1-catching net + 2 runtime recovery tests),
the detector-liveness wiring (compute→return→digest + the check keys — five
at Turn C, six since cycle 8's `briefConfig`, seven since F9's `managerSource`
MANAGER_EMAILS↔roster drift check), the INV-72
`LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_`
BEHAVIORAL mirror (drives the real server function over every client key),
the `empShiftSchedule_` single-resolver check (zero bare `getShiftSchedule_`
calls — INV-149), and the cross-partial `intakeFlushDraftNow_` hook check
(INV-148). Cycle 8 generalized three tripwires that were narrower than their
invariants: the `TO/PAR.SUBMITTED_AT` raw-read scan is ANY-INDEX (the old
regex required the loop variable to literally be `i`), the CN-timestamp
boundary gained the global scan above, and the INV-72 mirror gained its
REVERSE direction (`TIME_OFF_TYPES` entries without a client preview entry
must resolve to the server's annual/1.0 default — a server-side branch added
without a client entry fails; default-served types like `Other` pass). The
harness itself was hardened in cycle 8: `extractFunction`/`extractRawFunction`
anchor on `'function name('` (a bare name-prefix match silently extracted the
wrong body when the name prefixes an earlier declaration — getQuiz vs
getQuizzes was a live latent collision), and the DOM harness's `flushTimers`
RETHROWS the first deferred-callback error instead of swallowing it (a
crashing deferred render used to pass silently). It also
parse-guards every JS-bearing `<script>` partial so a syntax error
anywhere in the client fails CI — **and since cycle 9 (M-10) the parse-guard
list (`PARSE_GUARD_PARTIALS`) is auto-tripwired against `index.html`'s
`include()` calls**, so a newly-included JS partial can't ship outside the
net (the class that let `metrics/script_deptrequests.html` +
`train/script_coaching.html` fall out of every harness list; both are now in
the parse-guard, DOM `PARTIALS`, and view-key scan lists). Cycle 9 also added
the **`enterTool` TOOL-key tripwire** (every `enterTool('…')` literal across
the partials must be a registered top-level TOOL key, extracted by a
brace-DEPTH WALK with comments stripped and `${…}` interpolations exempt —
the H-1 "Coach on this" dead-key class; do NOT simplify it to a regex char
class) and fixed the sibling `refreshViewIfCurrent` tripwire's `[^}]*` →
`[^{}]*` (it was capturing TOOL wrapper keys instead of leaf tab keys —
false-permissive for exactly that class; leaf-key asserts now pin the regex
itself). The six-rule `coachCanManagerSee_` unit pin (stubbed
roster, INV-134) also lives in the pure harness. **Cycle 9 (batch 7) added three more
nets:** a **no-mail-inside-the-lock tripwire** (M-7 — inventories every
function touching `MailApp.`, then fails CI on any locked try-region that
reaches one outside a post-lock `notifyAfter` closure; sole allowlist entry
`emailFromCallNote`, INV-42), a **payload-contract tripwire** (Strategic #2 —
every client-submitted `subformData` key, from `payload.subformData.X`
assignments + `subformData:{…}` submit literals across `cn`/`intake`, must be a
`rawSub.<key>` read in `sanitizeCallNotePayload_` — retires the M-3 drift class
where the client wrote keys a later whitelist silently dropped), and a
**`showView('…')` literal net** completing the `enterTool`/`refreshViewIfCurrent`
registry-key family. Plus L-35 behavioral/source pins:
`PUNCH_MORPH.LunchIn.to='doorExit'` (the F7 half-step class),
`spanishSearchQuery_`'s `{to: cc:}` brace-OR, `clkShootMaybe_` night-sky
gating, and the greeting-rotator `stopClock` teardown. CI's `node --check` step
covers `Code.js`, `Tests.js`, AND `DevTools.js`. It also runs a **design-token
hygiene tripwire** (INV-128) that fails CI on any `var(--token)` used in a shared
partial but defined nowhere in `styles_design_tokens.html` (the allowlist is
empty; `form_public.html` is excluded). The integration suite (`Tests.js`)
gained `test_cn_search_phoneTrxFieldScopes`, pinning the Phone/TRX search
field-scope isolation (INV-45). See `test/client/README.md`. It needs
no npm install and lives outside `web-app/`, so `clasp` never pushes it. A
GitHub Action (`.github/workflows/client-tests.yml`) runs this harness +
a `node --check` of `Code.js` / `Tests.js` on every push and PR — the
project's only automated check. **Cycle 10 additions:** the top-5/A–D fix
pins (M-1 recordPunch↔findExistingPunch_↔managerSaveDay agreement, M-2
target-tz Day Edit, M-3 tray routing, M-5 `intakeStoreOversizeError_`
behavioral + wiring, M-6 Metrics seq tokens, batch-C witness/guard wiring,
batch-D client guards); the INV-01 **structural scan** (every `waitLock(`
function finally-releases — ~60 sites, also closing the no-mail-in-lock
scan's skip-when-no-finally hole); `GmailApp.sendEmail` in the mail-sender
inventory; both coercion scans' write-exemption tightened to `=(?!=)` (a raw
comparison read no longer passes as a write); the INV-142 scan lost its
reconcile whole-line exemption (C1 made it unnecessary — and it was itself a
copyable false-pass hole). DOM harness: the two INV-83 pins (stacked-dialog
topmost Escape — bite-checked against the real guard — and the drawer-Enter
exemption). Editor suite: +7 (the M-1 pair + the five M-11 endpoint
contracts). **The post-scan a11y/visual/K/L batches added the next net:**
the `--muted-2` WCAG-AA contrast tripwire (computes ratios from the token
file, both modes × three surfaces), the CN flag-stripe exact-token pin
(deepStrictEqual — name-distinctness can't catch the `--accent`==`--good`
alias), the `mtRenderTable_` sortable-header a11y pin, two DOM
focus-lifecycle pins (restore-on-close + INV-145 no-restore-on-refusal),
the self-checking **MIRROR_INDEX** (every known parallel-source mirror in
one registry, each naming its live guard test — a renamed/deleted
tripwire breaks the index), the first AUTO_COPY_FORMAT machine check,
the batch-L pins (sheet-doctor coercion/last-row-wins/report-only; C13
NUL-default + dual-verify wiring), the typed-signature pad parity pin,
and the nightly self-test wiring pin. **Cycle 11 (the seams audit)
hardened the tripwire layer itself:** the payload-contract extractor is
balanced-brace + depth-masked (a nested object in a submit literal no
longer hides the keys after it — bite-checked); a new SUBMITTED_AT
LINE-whitelist scan over Code.js+Tests.js closes the one-variable-alias
hole (bite-checked); the no-mail-in-lock region extends to the last
`releaseLock()` (finally-before-release is scanned) and the sender
inventory is TRANSITIVE over notifyAfter-stripped bodies (bite-checked);
the registry-literal nets accept double-quoted literals and all three run
off ONE `REGISTRY_SCAN_PARTIALS` list derived from `PARSE_GUARD_PARTIALS`
(plus a `dom/boot.js` PARTIALS coverage check) — retiring the
four-hand-copies class; the INV-142 scan covers `[CN.EMAILED_AT]`;
MIRROR_INDEX gained its 3 missing entries (CN_INTERACTIVE_FORM_IDS,
errBeacon caps — now extracted from Code.js, not hardcoded — and a new
`KB_IMG_UPLOAD_MAX_CHARS` client-mirror guard) plus the
`CSR_TRANSFER_EXPECTED_HEADERS` ↔ `CSRT` behavioral pin. **Cycle 12 added five
bite-checked fix-pin groups (F1–F5):** the export archive read-through (gated,
live-duplicate-skipping, provenance-reporting), the sheet-doctor
truncation/bound contract on BOTH sides of the wire, the shared mover's
per-run bound + the CN callers' unchanged defaults, the no-email roster skip in
both Metrics walks (plus a guard that `getCoveragePlan` keeps its cycle-9 L-2
skip), and the note-read outcome across all four coverage surfaces and all
three result caches. **The rest of cycle 12 added five more pin groups across
five batches:** the V-1 hue-drift bound + V-2/V-3 specificity pins (batch A);
the F15 running-sentinel, F9 gate-coverage and F7 admin-count nets (batch B);
the F14 column-L ban, F11 bounded-append, F16 no-silent-blank and F18
truncation pins (batch C); and the F12 single-read, four F17 mirror guards and
the eight V-item source pins (batches D/E) — pure +26, DOM 66 (the DOM
addition is the F16 failure path driven in a real jsdom window). **Cycle 13
(batch 1) added six more — A1 (no span/div carries an inline `onclick`), A2
(every compact grid override has a matching viewport breakpoint), A3 (two:
`timeToMins_`/`calcHours_` behavioural + the caller-shape scan), A11 (nav +
toggles expose ARIA state), A12 (no failure renders into an empty-state
container) — DOM unchanged. Batch 2
added four more (A4 the removed 0-on-error wrapper stays removed, A6
`kbReloadTree_` surfaces both failure paths, A8 null-not-0, A9 the archive
stamps `hitPerRunCap` only on a genuinely truncated run). Batch 3 +
follow-ons added seven (A5 dev-detection, A7 header-only export guard, A10
grade-before-lock, FO-2 the last inverted primary, FO-3 the shift-header wrap,
FO-4 `_assertEq` NaN-vs-null, plus the FO-5 dead-field removals folded into the
A8 and F18 pins). Batch 5 GENERALIZED the two a11y pins from a hand-listed
file set to `A11Y_SCAN_PARTIALS` (derived from `PARSE_GUARD_PARTIALS`, so a new
tool's partial cannot ship outside the net) — the state-class rule then surfaced
eight instances the hand scan had missed → 374; batch 4 added the A13
heading-class scan → 375. Cycle 14's Phase 0 added four more (the queue
inventory's three-state verdict, its escaping of CDR-sourced strings, the
read-only/bounded reader shape, and — the load-bearing one — that the scan
stays OPT-IN so the 10-minute-per-manager health badge and the daily digest
never pay for a full-sheet read). Phase 1 added three more (header-name
column discovery with the REAL bounds read from source, the opt-in call-site
count, and the component-not-partition contract). Phase 2 added five
(queue colour determinism, the remainder segment, the stated fraction +
escaping, the shared component's optional detail row, and best-effort
degradation); Phase 4 added four (sum-not-max, Ungrouped-last,
count-once, sanitize-on-read + mode-only-with-data). DOM +3 and the
visual matrix +2 (Team Metrics had never been shot). Cycle 15 (seams) added
five → 396 — the CDR name-match pairing, the health-card tone source, the capped
name lists, the fixture-mirror pin and the every-CONFIG-key-has-a-reader scan
(this running total had stopped at 391 until cycle-16's /sync-docs caught up).
Cycle 16 added three: the F1 note-outcome pin (server field + catch +
null coverage + all six client columns), the F5 team-total-null pin, and the F4
PTO-surfaced pin (banner, `role="alert"`, and the all-clear gated on the read
having succeeded). It also GENERALIZED the A2 tripwire from three hand-listed
fixes to a derived rule-scan — see the A2 gotcha; that promotion immediately
surfaced a fifth candidate (`.m-kpi-grid`) which was verified NOT a defect and
resolved as a rule refinement, not an allowlist entry. Cycle 16's SECOND batch
added four more (the F9 malformed-capacity behavioural pin driving the
REAL engine, a well-formed-unchanged pin across seven cases, the catalog
validator, and the opt-in-gate + failed-read-distinguishable wiring). Cycle 16's
THIRD batch added four more (F6 `uiPrompt` accessible-name + announced
validator error; F7 the client `Ungrouped` sentinel mirroring the server's; F8
`getDeptRequests` normalize-once + the resolved-row elapsed fix; and the A12
double-escape companion) and GENERALIZED two more scans — A12 from three
hand-listed partials to a derived rule (which found 28 violations across six
files, see INV-175) and the cycle-15 F4 mirror pin from one named function to
whatever sits in `test/visual/mock.js`'s DO-NOT-EDIT region. **Two of those
three fix pins failed their FIRST write, and both times the pin was wrong about
the code rather than the reverse: F8's tripped on its own explanatory comment,
which quotes the raw read it removed — the exact trap the CDR name-match pin
already documents — and now strips comments before scanning; F6's sliced from
the wrong occurrence of `ui-dialog-err` (the id constant, not the div). Strip
comments before scanning a function that documents what it deleted.** DOM stays
69; the visual matrix +7 — every rep-facing tool gained a mobile
scenario and the two mid-task tools a compact one, and each scenario now reports
`overflowPx` (see the Visual Audit Stage).** Cycle 17's top-5 batch added four
more → **411** (C17-2 `updateTimeOffStatus` normalize-once — TO.STATUS read
exactly once, lowercase comparisons, raw-cell revert; C17-5 the CN loaders'
preserve-last-good + failed-round-never-fresh + cold-failure error render;
C17-6 the export's skippedReps on response + audit row + toast; C17-7 the
three manager lazy cards' error-vs-empty split on both failure shapes — all
four comment-stripped per INV-188 and bite-checked individually) and fixed the
A2 scan's `[data-compact="1"]` blind spot (see the A2 gotcha), which is pinned
by the scan itself rather than a fifth test. Batch ② added four more
(C17-4 attSeconds-null finalize; the five cross-rep walks' skippedReps +
partial-uncached contract incl. digest gating; the CN client partial-notes /
badge / query-guarded search error states; the four sibling-branch stragglers
C17-14/15 + side rail + kbDrawer + admin containment) and WIDENED F3 (the
positive bare-truthiness ban + two named additions). Batches ③+④ added four
more → **419** (tour/banner color rule; the .tr-head real viewport wrap;
switch semantics + both CN disclosures' aria; the fixture payload-shape pin)
and GENERALIZED three more scans (A13 derived classes + first-attr +
CSS-definition check; A12 statement-scope; V-1 derived -deep set) plus the
A11 disclosure vocabulary — every widening bite-checked. Batch ⑤ added six
more → **425** (C17-12 clear-on-hide helper + call sites; C17-11 partial-send
contract incl. the client warn toast; C17-13 leading-negation vocabulary; the
bounded-cells group — prefill/signature/notes caps; the dept-config group —
whitelist-rebuild + comma guard; the list-contract group — intake `total`/`cap`
on both sides, searchReference `status` ×3 + the Draft pill, the conditional
cache-buster). Batches ⑥+⑦ added eight more (⑥: the C17-9
one-read-index + memoized mirror, the getNextActions_ BEHAVIORAL
garbage-row cases, the Spanish named-cap + truncated ×3 + client note, the
three fan-ins' per-handler seq-guard counts, the dead-selector ban incl.
cnLoadDate_; ⑦: failrpc-before-fixture-lookup, scenario coverage for
admin/dark/error, and the getAutomationHealth fixture keys DERIVED from
computeAutomationHealth_'s return block — INV-185/179). The operator-feedback
rounds (2026-08-06) added three more (pop-out fit wiring; the
Spanish combined-view fan-in + tones; the Dept Requests rebuild — Spanish
vocabulary, `.dr-row` retirement ban, refetch-free dept filter), and the
metrics-improvements batch added ten more (`metrics — operator
improvements #1–#10`: range-trend fill seq/cache, control unification + the
`.m-preset-chip` ban + the `[hidden]` specificity fix, diagnostics
disclosure, threshold ships-×3 + behavioral banding + behavioral
spark-domain, transfer null-guards + `transferThrew`, CTA gating, behavioral
best/worst, span-cap + best-effort range trend, drill button + data-*,
behavioral TSV — 8 mutations bite-checked; the F5 range-cache pin and the
Phase-1 opt-out caller count (3→4) were updated for the deliberate contract
changes). The operator round-2 follow-ups added two more (the
dashboard-cohort scope pin — dashboard `MIN_COHORT = 1` + `dash_metrics_v2`
+ `getMyMetrics` KEEPS 3 + the hidden-message ban; and the list-swap motion
pin — helper + keyframes property whitelist + the four wired switch sites —
3 mutations bite-checked). The team-member onboarding flow (2026-08-07) added
two more → **450** (the `empValidateNewEmployee_` behavioral pin — real EMP
enum + parseShiftOverride_ in one vm ctx, 15 rejection/canonicalization
cases; and the gate/lock/convention pin — validate-under-lock ordering,
provision-after-release, offboard's single EMAIL-only cell write + self-guard,
best-effort CDR readiness — 4 mutations bite-checked incl. the INV-136
doc-count net itself). The F14 column-L scan gained a third write-shape
exemption (the validator's enum-derived row-builder slot). The 2026-08-11
pilot-feedback round added five more (the onboarding CDR split —
panel makes no CDR call, deferred≠failed, paint-before-patch, shared chip
builder; the readiness column grid + its 900px breakpoint + the `.toolbar-tabs`
overflow guard + the minmax'd action column; the three reminder channels
degrading independently; the shell ticker's once-per-rep-day firing and
server-quiet mid-shift behaviour incl. the theme-reflector scope and the
no-duplicate-ids rule; and the `.compact-header` ban, derived over
`PARSE_GUARD_PARTIALS` + both stylesheets — 10 mutations bite-checked). The
branded-email restyle (operator 2026-08-11) added two more (the
email chrome — styled logo alt, logo never on a coloured fill, heading at
heading size, CTA only when url AND label are present, no generic eyebrow, no
flex/gap/filter; and the CTA deep-link keys checked against the live TOOLS
registry with the empty-url suppression — 6 mutations bite-checked). The
Sheet→article converter (operator 2026-08-11) added five more (the
banded grid's column separation — the misrouting regression — driven
behaviourally; the table-vs-banded shape split incl. pipe escaping; the
highlight-preserved-and-legend-warned contract; a round-trip through the real
`kbMd_` proving the section anchors are real; and the gate/read-only/bounded/
getDisplayValues source pin — 6 mutations bite-checked). **TWO of those pins
were WRONG ABOUT THE CODE on first write and were corrected rather than the
code: one asserted a banded-only behaviour against the TABLE branch, and one
banned `.getValues()` across the whole function when the itemId branch
legitimately uses it to read OUR OWN KB sheet — scope a "never call X" pin to
the read it actually governs.** The interactive roster block added five more (parse structure/flags/escaped-separator/badge-travel; fence
recognition leaving other fences alone; inert + attribute-breakout; drawer
reflow + focus-visible tooltips + searchability; and the banded-sheet →
roster-block emitter — 8 mutations bite-checked). The 2026-08-13 operator round added seven more
(copy-scope + no-last-dept; the dashboard one-read-pair + paint-on-first-
arrival/skeleton-not-empty/patch-not-rerender contract; the clock-in
reminder's four gates incl. confirmed-snapshot-only; the auto-tag matcher
behavioural + read/save mirror; and the intake feedback loop's gate/
existence/PHI-free-audit/CTA-outside-the-hash contract — 32 mutations
bite-checked; FOUR pins were strengthened after failing to bite: a comment
broke a wiring regex (INV-188 again), an audit-notes scan stopped at a
quoted semicolon, an indexOf(-1) passed a < comparison, and an
adjacent-text match survived a reorder). The 2026-08-13 follow-up round
(image fallback + map block) added six more (the image-fallback
pair — server folder-scope-checked-BEFORE-bytes + same-generic-refusal +
no-lock, and the client capture-phase/thumbnail-scoped/retry-guarded/
failure-cached listener with the pure `kbImgFileId_` driven behaviourally;
and the map-block four — escaped-contract parse + cap/truncated, attribute
quoting + %26-not-&amp; URLs + real controls + honest copy, fence inertness
+ lazy-embed aria + esc-on-read-back, and `kbHaversineMiles_` behavioural
(Dallas→Houston ≈225mi) + the never-store-the-query server contract:
exactly ONE property write (the coordinate cache), placed BEFORE the query
geocode, hashed keys, no audit/log line, and `Maps.newGeocoder()` with zero
`UrlFetchApp` so there is nothing to bill — 8 mutations bite-checked).
The 2026-08-17 SECOND round (pay statement + Spanish share) added three more (the pay-statement pure pin — `payPeriodRange_` biweekly shift /
clamp / monthly year-wrap + Feb length, `empPayRate_` tolerant-parse +
legacy-15-col null; the rate-boundary pin — EVERY `[EMP.PAY_RATE]` read
lives inside `empPayRate_`, emp objects never carry a rate, the other-rep
branch is manager-gated, PTO status normalized, `archiveNote` wired, both
client failure shapes render the error card, the money line labeled an
estimate; and the Spanish share pin — zero-bars for idle members driven
behaviourally, manual attribution, case-insensitive keying, the
`(unattributed)` bucket, the server shipping `members`, the render slot on
the fan-in path, and a NO-VERDICT-TONE scan over the chart renderer — 5
mutations bite-checked; the rate-leak bite was reverted with `git checkout`
and WIPED the uncommitted server block, re-applied from context — the
batch-⑥ lesson re-learned: bites revert via python inverse edits ONLY, and
the unit commits BEFORE its bite-checks where possible).
The self-healing test-accounts fix added one more (setup restores
the canonical email on an existing TEST row instead of skipping it; cleanup
re-offboards every TEST_ row with the cache invalidated AFTER — the INV-183
corollary applied to the suite's own rows). The 2026-08-17 THIRD round
(full-width + display cap) added two more (the full-width pin —
`.sp-tasks` carries no max-width, both 1480px `:has()` widen rules live in
their own partials, `drRender_` emits `#dr-body` on BOTH branches, `.sp-top`
is a 2-col grid with a real viewport breakpoint (A2) and the 660px inline
caps are gone; and the display-cap pin — `spCappedTasksHtml_` driven
behaviourally (cap, step, final-page reveal, no button when complete,
extraStyle pass-through, real `<button>` per INV-173) plus wiring: all five
card sections capped with distinct keys, both shown-state resets, no
uncapped `.sp-tasks` list left, headers keep full counts per INV-169 — 7
mutations bite-checked). The 2026-08-18 operator round added four more (the Punctuality/Admin width pin — no 900px card caps, no
punct-table/card caps, uncapped summary strips; the compact auto-tag-rules
pin — no per-rule bordered box, internally-scrolling 2-up list, real labeled
remove button, save-contract classes unchanged; the Spanish-members pin —
the real `saveSpanishInboxMembers` driven in a vm (shape-reject before any
write, lowercase+dedupe+cap-30, empty-list valid), admin gate + audit +
`getAdminConfig` read + the client's empty-list danger-confirm and escaped
chips; and the load-time pin — the per-caller `dept_req_v1` key + gen salt
bumped at the resolve write and the auto-track append, success-only put,
an explicit guard that `getSpanishInboxPending` STAYS uncached (the
documented privacy decision), the DR SWR stamps (fresh-skip, failed-round
nulls, resolve busts before re-enter), `enterTimeoffView` riding
`calNavTo_`, and the `dash_metrics_v4` day-scoped key + `DASHBOARD_CACHE_TTL`
— 11 mutations bite-checked across the round). The same day's follow-up
(Team Metrics for reps) added one more (the exact-whitelist
`teamMetricsRepView_` strip driven behaviourally — an unknown future
manager-only field CANNOT leak because nothing rides unless named — plus
registry/client-guard/click-through wiring; the team-cache pin's gate anchor
moved to the auth check + a both-return-paths-strip assert — 4 mutations
bite-checked). The fluid-pop-out-type request added one more (the
exact clamp formulas for both groups — ceilings equal the base px so ≥480px
is byte-identical, floors carry the "to a certain extent" — plus a
no-bare-vw font-size scan over the partial; verified by MEASUREMENT at
480/400/360 and 3 mutations bite-checked, incl. a raised ceiling — the
mutation that would silently change the default launch look). The narrow
pop-out round (same day) added one more (the ≤400px compact-yield
block — brace-matched extraction, all six rules, compact scope on every
rule, the load-bearing source order, `.cn-card-time` hidden EXACTLY once,
plus a tzMismatchCheck_-declared-once guard against the duplicate-hoisting
near-miss this very round caught — 4 mutations bite-checked; stacked layout
verified by MEASUREMENT at 300/360, byte-identical at 480). The Time/PTO
consolidation round (same day) added one more (the toggle + key
retired from CODE — comment-stripped scans per INV-188; the rail composed
unconditionally + the unconditional pay-period fetch; the quick-actions
card's real buttons, today-floored picker, same-month vs pending-nav
branches and rendered-month guard; the pay-statement fix button's
fixable+in-window+own-statement gate, data-*+bound handler,
close-before-open order; and the openAdjustModal prefill bounds — 5
mutations bite-checked). The visual mock gained a `getTimesheetData`
fixture and the calendar fixture's `hoursByDate` → `workedHoursByDate`
INV-185 shape fix (the corner hour badges had never rendered in any
timeoff screenshot). The range + accrual round (same day) added one more (server: submitTimeOffRange's atomic conflicts-before-append order,
weekend skip, named-dates rejection, notes bound, span cap, both horizon
ends — comment-stripped per INV-188; client: the Through field's per-open
reset + preview multiplier + dual submit routing, the countWeekdaysIso_
BEHAVIOURAL cases, and the accrual tile — EMP.PTO_ACCRUAL declared AND
read ×2 (the INV-184 class), ROSTER_CACHE_KEY v10 (INV-28), empPtoAccrual_
BEHAVIOURAL fail-safe cases, variant gating with the legacy tile preserved
— 5 mutations bite-checked incl. the atomicity order and a behavioural
counter mutation). Editor suite +1 (`test_submitTimeOffRange_weekendSkipAtomicCaps`)
≈ 303. The accrual-credit follow-up added two more — ONE
auto-generated by the derived trigger-wiring/gate nets the moment
`creditMonthlyPtoAccruals` entered the TARGETS arrays (the INV-179 promise
paying out again), plus the accrual-credit pin (behavioural
`accrualMonthsToCredit_` incl. seed / in-arrears / year-boundary /
cap-reported cases with the cap READ FROM SOURCE, credit-before-stamp
order, through-the-mutator, stamp read coercion-safe, action registered
— the one direction the labels ⊇ actions coupling registry cannot see,
since REMOVING an action keeps the subset true) — 5 mutations
bite-checked. Editor suite +2 (`test_creditPtoAccrual_seedCreditIdempotent`
with an ABSOLUTE balance restore in finally — a relative un-credit would
corrupt the fixture on partial failure — + the trigger-gate case) ≈ 305.
The 2026-08-19 accrual REBUILD (operator: hours-driven, 3.08 per 80 worked)
kept the count at **556** — both pins were REWRITTEN in place rather than
added, which is the honest bookkeeping when a contract changes under a
test. The credit pin now drives the earn arithmetic behaviourally
(80h → 3.08 PTO hours → 0.39 days; 2080h ≈ 10 days/year; a genuine 0 earns
0 while an UNREADABLE hours figure returns null — `Number(null)` is 0, so
without an explicit guard an unread month would credit and audit as a real
zero) and pins the read shape the lock demands: ONE range-wide index, no
`buildTimesheetForEmployee_`, exactly two `getDataRange().getValues()`
(live + archive), archive read-through with live-key dedupe, `calcHours_`
for per-day arithmetic, INCOMPLETE-not-zero on an unparseable day, and NO
`catch` (a failed read aborts the run rather than crediting from partial
hours). The tile pin gained a scoped ban on a fill BAR inside the accrual
branch — the first write of it asserted the absent projection but not the
absent bar, and a re-added bar passed, so the pin was tightened until it
bit. 11 mutations bite-checked, one of which (the digit-strip rate parser
turning `3.08 h/80h` into **3.088**) was a live defect the pin caught while
being written — a silently wrong rate feeding real balance credits. Cycle 18's pre-audit batches added six more, then eight more, then six more (batches 5–7: the three A14 accessible-name pins — dialog naming, no nested `role="dialog"`, and the two-sided unnamed-control ratchet — plus one each for the `getTeamMetrics` span cap, the argument-dependent `getMyMetrics` fixture and the Time/PTO mobile scenario), then six more (batch 8: the Offerings browse endpoint's PHI/read-only/cap contract, the catalog view's naming + error-vs-empty split, a behavioural pin on the seat filter mirroring the ENGINE's letter test, the manager pay-statement wiring incl. the INV-191 class-vs-identity split and the card-actions row, the print block, and the liveStatus fixture-shape drift — 20 mutations bite-checked, of which THREE exposed a pin weaker than the property it guarded and were rewritten rather than accepted), and the DOM harness +4: the F1 fence-source pins are DOM tests by necessity (the pure harness has no HTML parser, so it cannot decode an attribute — which is why `run.js` had pinned the vulnerable line AS CORRECT), plus a source ban (exactly one `getAttribute('data-src')`, inside `kbFenceSrc_`, which must re-escape) and the derived `AUTOMATION_JOB_CHECKS` pins. **A HARNESS HAZARD worth knowing, which cost three silently-dead pins this session: `run.js` ends in `process.exit(fail ? 1 : 0)`, so a test block appended AFTER that line never executes and reports nothing.** It was caught only because every mutation was bite-checked — a block that never runs looks exactly like a block that passes. Append new tests ABOVE the SUMMARY line (which prints LAST since the 2026-09-10 Batch B — the rule was always "above whatever runs last", and the exit used to be it), and treat 'the pin did not bite' as the first symptom to check. jsdom carries its own version of the same trap: under `runScripts:'outside-only'` an inline `onclick` is never compiled, so dispatching a click runs NOTHING — two of the four new DOM assertions were vacuous until the handlers were called directly. The cycle-18 SEAMS round (F1–F5, 2026-08-21) added three more (the F1 server↔client `intakeHttpOnly_` scheme-whitelist pin — both routes asserted AND the regex literal pinned byte-equal in both files; the F3 derived fixture-shape pin — pay-statement + offerings field names extracted from the server's own return blocks, the INV-185 liveStatus class; and the F4 `AUTOMATION_JOB_CHECKS` ⊆ `AUTOMATION_AUDIT_ACTIONS` coupling entry — 6 mutations bite-checked, one of which trips TWO independent nets). THREE first-write corrections, each now documented inside the pin it fixed: the ban regex tripped on mock.js's own fix comment (INV-188 again), the naive `//`-stripper ate `https://…` fixture URLs and the rows' closing braces with them (so comment-strip the BAN view but extract SHAPES from raw source), and a line-anchored `/^\s*(\w+):/gm` key matcher captured only each line's FIRST key on the server's packed return block — a renamed `totalHours` passed until the bite-check exposed the pin as weaker than its property (colon-space over the whole block now, floor 8→12).
The pilot-feedback rounds (2026-08-21 → 2026-08-24) added twenty-two more across three batches, every one bite-checked (21 mutations, 21 bites): round 1 +10 (sanitize behavioural ×2 — the reviewComment cap + the callDirection bounded enum — the setCallNoteFlag review branch, the digest both-bodies Comment line, `repSenderOpts_` behavioural + the six-sender wiring/count, the client outbound filter + pill behavioural, esc/gating, and the draft round-trip + `data-direction` identity-attribute pin per INV-191); the follow-ons +5 (`repSenderFrom_` behavioural ×4 cases incl. unregistered-alias and GmailApp-throw fallback, `sendRepEmail_` dormant-vs-GmailApp behavioural with no positional-key repeats, the non-http E/F warning with https-plus-query staying clean, {callDirection} substitution + default-template-unchanged, the History outbound chip; TWO veteran intake ordering pins correctly FAILED on the `MailApp.sendEmail` → `sendRepEmail_` rename and were repointed at the wrapper with explicit -1 guards, and the F9 fixtures' placeholder 'pdf'/'img' E/F values — exactly the schemeless class the new warning flags — were upgraded to real https URLs, the test-doubles-encoding-old-behavior rule); round 2 +7 (`spanishClaimsFold_` behavioural, the claim/release endpoint contract — gate/scope/assign/steal/lock/PHI-free audit, the pending-payload additive fields, role-based claim UI behavioural incl. esc, `schedValidateShape_` behavioural, the sched endpoint contract — rep-tz parse, horizon, cap, and the id-only audit whose mutation planted the label into the audit note and bit — and `schedDue_` + ticker/fetch/hook wiring). Tests.js's omnibus Spanish gate set gained `claimSpanishThread` + `releaseSpanishThread` cases (run at the post-deploy `runAllTests()`).
The round-2 FOLLOW-ONS (2026-08-24) added five more (the Spanish pending fixture's claim-state trio + the matrix's FIRST modal scenario via the new shoot.mjs `post` hook, the sched editor-flow wiring, the dashboard claim pill — 7 mutations / 7 bites; TWO pins were strengthened when their first bite exposed them: a joined-string `indexOf` substring-matched `at` inside `atMs`, and a first-item-only shape check missed item 2). Pilot round 3 (2026-08-24) added seven more: the caret-edge behavioural pin (strengthened when its bite exposed a missing boundary-anchored-selection case) + arrow-nav wiring, the scratchpad server pin (USER lock + never the script lock, cap-refuse BEFORE the sheet touch, `setNumberFormat('@')`, ms NUMBER stamp, no audit row), the scratchpad client pin (named overlay, flush-on-close, failed autosave stays dirty + visible, A12 ×2), the comments server pin (draft invisibility via `KB_STATUS_DRAFT || !!emp.isAdmin`, ownership-not-gate-literal refusals, soft-delete, INV-169 total/cap, END-OF-LINE audit matching — the notes string itself contains `';'`, the INV-188 family), the comments client pin, the derived fixture-shape pin (comment item keys EQUAL the server's own push literal; scratchpad fixture keys ⊆ the return keys with string LITERALS blanked first — the fixture's content value contains "Dr. Alvarez: x4102", and a bare colon-space matcher read "Alvarez" as a key on first write), and the fabs/sched-style pin (the two visual defects the round's own full re-shoot measured: bare fab buttons scattering as separate `.cn-head` grid items, and the sched modal's `.cn-act-btn`s rendering UNSTYLED — `.cn-act-btn` is styled only under `.cn-card-actions`, so the dark modal scenario's FIRST shot showed white native buttons). The round-3 FOLLOW-ONS (2026-08-24) added one more — the Phase A "drawer stays comment-free" pin was REWRITTEN in place for Phase B drawer parity (the honest bookkeeping when a contract changes under a test: dual-host render with per-host suffixed input ids + closest()-scoped handlers, the drawer loader's own L-18 guards, ONE shared renderer), the server pin gained the `kbEditComment` contract (author-ONLY with NO manager escape — narrower than delete by design — active-only, cap-refuse, id-only audit), and the ONE new pin is the **derived icon-key tripwire**: every `icon('name')` literal across the partials must be a real `ICONS` key, because `icon('unknown')` SILENTLY returns `''` — the comment-edit pencil shipped as an invisible 4px empty button (`icon('pencil')`; the key is `adjust`, and "pencil" appears only in the ICONS comment, which is exactly what a grep-for-existence check matched — INV-188 pointed at markup; found only by measuring the live button rect after the reader screenshot looked one-button). The key extractor anchors on the VALUE shape (`: '<`), not indentation — a fixed-indent anchor matched only 19 of 57 keys — 5 mutations / 5 bites across the follow-ons. Editor suite +3 across the rounds (`scheduledCalls_flow`, `scratchpad_saveReadRoundTrip`, `kb_comments_flow` incl. the edit steps) ≈ 308. The POST-DEPLOY fixture round (2026-08-24) added one more — a pin on `_clearTestCallNotes` after a live `runAllTests` reported "expected 2, actual 21" and then, once the clear was made loud, 22 failures reading `Sorry, it is not possible to delete all non-frozen rows`. The count was never wrong: the fixture clear had failed and swallowed it, so the failure surfaced ~20 tests away in an unrelated assertion (INV-187 applied to the test infrastructure itself). **The root cause is a Sheets property worth knowing: `deleteRows` permanently SHRINKS the grid, so once `maxRows == lastRow` on a tab with a frozen header, `deleteRows(2, last-1)` IS "delete every non-frozen row" and Sheets refuses it outright** — the tab had been shrunk by every prior run. It clears CONTENT now, throws + flushes + VERIFIES semantically (counting rows still carrying a `CN.DATE_LOCAL`, not a bare `getLastRow`, so a cleared-but-formatted grid cannot throw falsely), and the count test asserts the fixture and the app are looking at the SAME sheet. The same shape is latent in `archiveSheetRowsOlderThan_` and is recorded rather than fixed — it is reachable only with an archive window enabled, and both default 0. The Dept-Requests in-place resolve (operator 2026-08-24) added one more: the stale DR SWR pin was REWRITTEN in place (it asserted the removed whole-view re-entry — the accrual precedent), and the new pin covers the ordering the feature rests on (the CACHE is patched before the DOM, because `DR_LAST_DATA` is what every filter re-render reads), all three lists patched, the two things the client must NOT fabricate (`resolvedBy` is server-owned; `elapsedMin` is already correct at that instant), no `drRender_` from a repaint, no selector built from the decoded `data-req` (INV-193), and the reconcile being manager-only + nav-guarded + stamp-nulling on failure — 5 mutations bite-checked.
The 2026-08-25 operator round (batches 1–6) added twenty more, every one bite-checked (~30 mutations / 30 bites across the round; commit-before-bite throughout): batch 1 (intake polish) +3 pure — the `INTAKE_RECOMMENDED` mapping drift guard (bank labels asserted at each index + header-exclusion + the exact PPD list), `intakeRecommendedBlanks_` behavioural (incl. the Q40-Yes-without-hours half-answer), and the warn-flow wiring — plus DOM +4 (unselect round-trips for choice + ynnum, the recommended gate driven through a stubbed `uiConfirm` with per-row self-clear, and the PPD notes render/ring-46/collect round-trip; jsdom lesson: `offsetParent` is ALWAYS null there, so visibility guards must read inline `style.display`). Batch 2 (Spanish VMs) +3 — `spanishVmMatch_`/`Caller_`/`Query_` behavioural (a sender-substring mutation SURVIVED the first bite and the pin was strengthened with a display-name-spoof case: `"no-reply@8x8.com" <evil@attacker.com>` must NOT match), the `spanishThreadInScope_` predicate behavioural (two veteran scope pins rewritten onto it — the honest bookkeeping), and the pending/resolved fold wiring (VM cards manual-resolve-only, `resolveMinutes: null`). Batch 3 (insurance lookup) +3 — `insPayorScore_`/`insPayorRowObj_`/`insToneCls_` behavioural, and the wiring pin incl. the `[hidden]` display companion (the documented trap, caught pre-measure). Batch 4 (intake amend) +3 — `intakeAmendDiff_`/`BannerHtml_` behavioural, the owner-only source resolution, and the post-hash placement pin, whose FIRST write was VACUOUS: `indexOf('expectedBodyHash)')` matched the function SIGNATURE, so any placement passed — caught when a properly-built pre-hash mutation failed to bite, re-anchored on the OPERATION `'!== expectedBodyHash'` (the INV-188 corollary: anchor on the operation, never a string that also appears in a signature). The veteran intake-chrome pin was rewritten twice (the send sites moved to `sendSubject`, then the bare split also matched the DEFINITION). Batch 5 (note formatting) +3 — `cnFmtHtml_`/`cnStripFmt_` behavioural (escape-first: markers wrap INERT text, `**<img>**` escaped stays escaped; unpaired markers are content; markers never span lines), the byte-equal client↔server marker-regex mirror (a new MIRROR_INDEX entry), and the wiring (7+ render sites route `cnFmtHtml_(esc(`, copy strips both fields, keyboard preventDefault-always in `.ce`, OOP branch excluded, 3 digest lines, warn-soft CSS). Batch 6 (intake analytics) +4 — `intakeVolumeBuckets_` behavioural (newest-first across a year boundary, junk skipped, bad anchor → empty), the `cnCountIntakeNotesResult_` contract (bounded 2-col read, `"intakeType"` pre-filter BEFORE JSON.parse, unenrolled ≠ unavailable, failed read never 0), server wiring (3 attach sites null-on-unavailable, teamTotals partial flag, gate-before-read, bounded tail, named failedTypes), and client wiring (rail null-gate, em-dash, manager-only both halves, errorStateHtml_ ×2, nav guards, empty-renders-nothing); the behavioural TSV pin was rewritten in place for the deliberate Intake-column contract change, and the fixture's `intakeNotes` placement fired V-14 (moved AFTER `missingCount` — the fixture moved, not the pin). Editor suite +1 (`test_insurance_search_requiresEmployee`) + the `getIntakeVolumeStats` omnibus gate case ≈ 309. The POST-DEPLOY composer round (2026-08-25) added four pure pins → **646** and two DOM tests → **81** (CMP-1 the Preview in-button loader restored on BOTH failure paths; CMP-2 the editable rows are named, raw-markered and read-only while the note is still saving — the raw-text assertion is the load-bearing one, since editing rendered HTML would destroy the markers on the way back; CMP-3 the updateCallNote reuse + the state-replace-BEFORE-instance-guard ordering + the c.note re-point; CMP-4 the save-then-preview order and the discard warning; the DOM pair covers what a source scan cannot — the dirty compare, the in-place repaint that leaves the field being typed in alone, the payload sending untouched fields verbatim, and the two-phase Preview chain incl. a failed save aborting it — 6 mutations bite-checked). The Reference file-ingest round (2026-08-25) added five more: `kbParseCsv_` behavioural (quoted commas, "" escapes, embedded newlines, CRLF, BOM, ragged padding — measured against the operator's real 1037-row export, which has all of them), `kbDataTableSummary_` behavioural (duplicates/blanks/odd headers REPORTED with sheet row numbers; a well-formed file warns about nothing — INV-186), the import contract (allowlist-not-arbitrary-tab, dryRun-default-TRUE, gate-before-write, plain-text-before-write, lock, audit, no client-side parser), `kbIngestPlan_` behavioural routing, and the ingest contract (converter reuse, no lock, KB-sheet-read-only, the REST-not-advanced-service path, nothing declared in appsscript.json, both degradations named) — 7 mutations bite-checked, TWO of which corrected the pins rather than the code: the naive // comment-stripper ate `https://` and took the URL assertion with it (the seams-18 F3 rule — scan the STRIPPED view for bans, the RAW source for shapes), and a phrase shared by both embed messages meant deleting either still passed until the pin counted them. The POST-DEPLOY gate-shape fix (2026-08-25) added one more: the live `runAllTests` reported `insurance_search_requiresEmployee` red with `{"error":"Not authorized."}` — the CORRECT rejection — because the test reached for `_assertFailure` (which requires `success===false`, the WRITER shape) on a READ endpoint. The derived GATE-SHAPE tripwire now resolves every `_assertFailure(<var>, 'Not authorized')` back to the endpoint the same test called and requires that endpoint to carry `success:false`; its first form was too coarse and false-alarmed on a sibling read, so it links the asserted variable to its call (1 mutation, bites — it reproduces the exact live failure). The SECOND post-deploy `runAllTests` then reported `managerGates_rejectNonManager` red on another correct rejection, and the fix added one more: the three Reference-ingest endpoints (`getKbDataTables`/`kbImportDataTable`/`kbIngestFile`) are ADMIN-gated exactly as INV-136 documents, but the omnibus's hand-maintained `ADMIN_GATED` map had not been updated, so the case asserted the MANAGER message — the tier-level sibling of the shape class above, and (because `_assertContains` throws) the one reported failure was masking all three. The derived GATE-TIER tripwire links every omnibus case to the tier `Code.js` actually enforces and fails in BOTH directions (2 mutations bite-checked: an admin endpoint dropped from the map, and a manager endpoint added to it). The 2026-08-27 sender-correction round kept the count at **653** — three pins REWRITTEN in place for changed contracts (the honest bookkeeping): the `repSenderOpts_` behavioural pin now `strictEqual`s the display name to the agent alone (the org suffix was the WRONG company name and fired live — ANY re-added suffix fails), the `sendRepEmail_` behavioural pin covers the agent self-BCC on both send paths (append-not-clobber over a caller bcc, case-insensitive dedupe), and CMP-4 follows the Preview chain's split into `cnComposerPreviewChain_` + the empty-TRX warning contract (live-field-first, Continue-anyway/Go-back, instance-guarded resume). 6 mutations bite-checked; bite C exposed CMP-4's live-field claim as string-presence rather than use and the pin was tightened to the ternary shape before it bit. The KB-editor loader round (same day) added one more — `kbBtnBusy_`/`kbBtnIdle_` (the composer-Preview `.lo-dots` pattern) on Save + BOTH convert paths (Save's label names the kbdoc image-export count; busy disables, extending the L13 double-fire guard to the converts, which had none), and the kbdoc-token preview pin REWRITTEN in place for the pending-chip contract (a converted Doc's images previewed as bare alt text, read as "missing"; they export at Save by design and the chip now says so). 4 mutations re-verified GENUINELY after a lesson: the first bite round was tainted — a broken onclick assertion kept KBL red for the wrong reason, so its "bites" proved nothing, and two mutations silently no-opped by matching the em-dash RENDERING instead of the file's literal `\u2014` escape BYTES. Match the bytes; confirm the pin is green before reading any bite. The deploy-version beacon (same day, the operator's mid-shift-deploy question) added two pure pins + one DOM test → **657** / DOM **82**: BCN-1 (derived hash — include() set from index's own calls, raw index read, finite cache TTL, doGet catch→'' boot safety, the INV-78 injection form, and build.mjs replacing the scriptlet BEFORE its straggler strip, which alone would leave `window.SERVER_BUILD_STAMP = ;` — a head SyntaxError in the harness page), BCN-2 (piggybacked on the reminders ticker above its early-returns, 15-min throttle with the first window starting at boot, empty-stamp disable, one sticky prompt with a real Reload button, silent failure path), and the DOM toast-action test (fires once, dismisses after, plain toasts unchanged) — 7 mutations bite-checked. Editor suite +1 ≈ 310. The brand sweep the same day added one more: the operator supplied the CORRECT company name ("UniversalMed Supply") and the wrong form turned out to ship in 14 MORE user-facing strings (the external customer/provider email greetings + sign-offs in both html and text twins, the public form page ×5, the Access-Restricted page) plus the visual fixture's retired From line (INV-185 — page.html had been rendering a From string the server can no longer produce). The derived BRAND tripwire scans every shipped web-app file + the fixture for the banned literal (the string is built by concatenation so the pin never trips on itself — the INV-188 family), bite-checked in both a Code.js string and the fixture. The Part A host-tz round (same day — the live "2:16 PM shows 1:46 AM" / "PH rep's note missing from today" reports) added three more: PTA-1/PTA-2 behavioural (BOTH live symptoms driven against a real Intl oracle — the Chicago-coerced 14:16 recovering as-written vs the degraded path reproducing the reported 00:46-next-day shift, and the Manila-midnight DateLocal keeping its day vs the IST fallback shifting it BACK a day — plus the pinned-sheet no-op equality against `normalizeDate_`) and PTA-3 wiring (memo set off the freshly opened handle, recovery never reaches `adpSheetTz_` — comment-stripped per INV-188, since the fn's own comment names the old helper — the null-degradation catch, the derived `normalizeDate_`-over-`CN.DATE_LOCAL` ban, and the typed reader's `cnDateLocalString_` route); the B6 `normalizeDate_` assertion was REWRITTEN in place for the changed contract (the honest bookkeeping). 4 mutations bite-checked (helper-tz revert ×2, typed-reader revert, memo kill). A vm-realm lesson worth keeping beside the deepStrictEqual-prototype one: an OUTER-realm Date fails `instanceof Date` inside a `vm` context, silently routing the fixture down the string branch — shadow the vm global with the outer constructor (`ctx.Date = Date`). The QA module Phase 1 (same day) added seven more (six QA pins + the parse-guard test the derived list adds automatically for the new partial): QA-1 `qaChunkRange_` behavioural (empty/negative/fractional/past-the-end → null, exact-multiple and remainder slices), QA-2 the Drive boundary ORDER (gate before Drive, folder parentage before `getBlob`, size cap from metadata, audio-only, pure-helper slicing), QA-3 the sync contract (consult-form idempotence before any write, bounded + truncated reported, counts-only audit — the audit match runs to the call's TAIL, the INV-188 quoted-semicolon trap this exact pin shape hit once before), QA-4 the comments contract (QA-gated not merely employee, target-must-exist before append, bounded anchor, refuse-over-cap, soft-delete author-or-manager, id-only audits), QA-5 wiring (per-endpoint gate-before-store, the `also:'canSeeQa'` registry flag, no-fallback store, seq-guarded chunk append, esc/errorStateHtml_ discipline, Blob-URL revocation), QA-6 the client pure helpers (`qaFmtClock_`/`qaMarkerPct_` — junk/negative/past-the-end clamp, never NaN in the UI). 6 mutations / 6 bites, TWO pins strengthened when their first bite exposed them: `indexOf('known[id]')` matched the map-BUILD site so deleting the skip passed (now the consult form `if (known[id]) continue;`), and a bare ≥2 occurrence count of the audioSeq guard passed with the one before the chunk APPEND deleted (now anchored between the handler and the append). The view-as + parse-guard + DOM-PARTIALS pins were extended in place for the new flag/partial. Editor suite +1 (`qa_gates_rejectNonMember`) ≈ 311; visual matrix +2 (`qa-queue-light-wide` + `-mobile`, both machine-clean and eyeballed). The same day's KB image-export diagnosability fix added one more (KBI-3 — the per-image catch NAMES the Drive error, the KbItemSave audit row records `imageWarnings=`, and the client renders image warnings STICKY; 3 mutations / 3 bites — the operator's live report was precisely that the reason auto-dismissed before it could be read). The break-schedule editor (same day) added four more (BRK-1 `breakSchedSanitize_` behavioural — lenient whitelist-rebuild, explicit-empty kept, save-accepts ⇒ sanitize-keeps round-trip; BRK-2 the `getShiftSchedule_` merge behavioural — property tz→DEFAULT precedence, explicit-empty honored ([] is TRUTHY, so the hazardous mutation is a `.length` guard, not bare truthiness — the bite target), CONFIG chain byte-preserved when no entry applies; BRK-3 `saveBreakSchedules` behavioural in a vm — gate, named errors, canonical write, delete-on-reset; BRK-4 wiring — memoized single-read getter, memo reset on save, `!== undefined` consults in order, adminView shared by getAdminConfig + the save return and resolved through `empShiftSchedule_(null, …)` after the INV-149 tripwire caught the first direct call — 4 mutations / 4 bites). NOTE from that build: an Edit landed a literal NUL byte in `Code.js` (the exact hazard the kbMd_ sentinel note warns about — grep started reporting the file as binary); replaced with a plain space sentinel by a python bytes-edit. QA Phase 2 added four more (QA-7 `qaPeaks_` behavioural + the derived ONCLICK-RESOLVES scan — every `onclick` handler name in the qa partial must be a defined function, the net that holds the Phase-1 defect this round fixed: the detail's status buttons called the SERVER helper name `qaStatus_` instead of `qaChangeStatus_`, a dead reference jsdom's outside-only mode can never catch and no detail scenario could shoot; QA-8 `qaLatestScorecards_` + `qaStatsAggregate_` behavioural — re-score supersedes, a createdMs tie keeps the LATER appended row, `(unassigned)` visible, null-not-0 per-criterion, a card for an un-indexed recording never invents an agent; QA-9 the scorecard save contract — criteria sanitize, reject-unknown-key by name, target-must-exist BEFORE append, id-only audit anchored to the call tail, append-only; QA-10 Phase-2 wiring — Agent trailing column + enum + sync's empty cell, agent-name-never-in-audit, stats gate-before-store + truncation, the waveform's seq-guard-before-peaks + size gate + the `.qa-wave[hidden]` companion rule, aria-pressed rating buttons + selected-click-unselects, the `qaStats` registry entry under `also:'canSeeQa'` — 6 mutations / 6 bites). Editor suite unchanged ≈ 311 (the omnibus gained the `saveBreakSchedules` case and the QA gate case grew to 12 endpoints, both IN PLACE); visual matrix +1 (`qa-stats-light-wide`). QA Phase 3 added four more (QA-11 `qaSamplePick_` coverage-fair behavioural with an injected rand — lowest reviewed+picked load first, the tie-break actually consults rand — + the sample endpoint contract: gate-before-store, new+unassigned candidates only, assignment writes SELF with a count-only signature, counts-only audit; QA-12 the Phase-3 privacy boundary — share REFUSES until attributed, `getMyQaReviews` employee-gated with the bare read {error} shape, the SharedMs + name-scope filter lines pinned verbatim, read-only/never-provisions, active-comments-only, capped, plus the Tests.js read-shape case; QA-13 `qaCalibration_` behavioural — 2+ computable reviewers only, spread arithmetic, a criterion rated once never sets the widest gap, spread-desc sort, 1-dp rounding; QA-14 client wiring — the UNGATED `qaMyReviews` registry entry beside the still-gated queue/stats, the read-only no-controls/no-audio My Reviews render, ONE shared scorecard builder for detail + My Reviews, seq guards + errorStateHtml_ ×2, share/sample buttons, empty-calibration suppression + em-dash gap, and the fixture keys DERIVED from the server's own `mine.push({...})` literal (INV-185/188) — 6 mutations / 6 bites, ONE of which exposed an EQUIVALENT MUTANT: weakening `cards.length < 2` in `qaCalibration_` changes nothing observable because the `reviewers.length < 2` guard below it is the load-bearing one — the bite was re-aimed at the real guard, and the pin now documents which guard it mutates). Editor suite unchanged ≈ 311 (the QA gate case grew to 14 endpoints + the `getMyQaReviews` bare-read-shape rejection, IN PLACE); visual matrix +1 (`qa-myreviews-light-wide`). The 2026-08-28 gate change + follow-ons round added two more with two REWRITTEN in place (the honest bookkeeping): QA-14 now pins `qaMyReviews` GATED like the reviewer tabs (the operator's hide-for-now — a re-opened tab fails CI until the pin is deliberately rewritten) plus the My Reviews Play button as the view's ONLY control, wired to the SCOPED endpoint with seq-guard + Blob-URL revocation and NO Drive-fallback link (agents have no folder access); QA-2 now pins the Drive byte boundary in the SHARED `qaAudioChunkFor_` with both callers (reviewer wrapper + agent path) banned from touching Drive directly; NEW QA-15 (`saveQaScorecardCriteria` behavioural in a vm — gate, named errors incl. the canonical-key duplicate, nothing-written-on-reject, delete-on-reset, and the strict-save ⇒ lenient-read round-trip driven through the REAL `qaCriteriaSanitize_`) and QA-16 (the agent-audio double scope — SHARED then NAME then the Drive delegate, in that order, generic not-found refusals ≥5, no direct Drive, plus the Tests.js read-shape case) — 7 mutations / 7 bites (registry gate undone → QA-14; criteria gate deleted → F7+QA-15; delete-on-reset removed → QA-15; SHARED filter dropped → QA-16; name scope dropped → QA-16; folder parentage deleted → QA-2; the agent player switched to the reviewer-gated endpoint → QA-14). One INV-188 recurrence caught at write time: the render fn's own comment names `qaGetAudioChunk` as the thing it must not call, so QA-14's ban scans the comment-STRIPPED body. Editor suite ≈ 311 unchanged (the `saveQaScorecardCriteria` omnibus admin case + the audio-chunk read-shape case grew IN PLACE); visual matrix +1 (`qa-detail-light-wide` — the standing detail gap, closed by a real 1-second 8 kHz WAV chunk fixture the mock serves, so the player, WAVEFORM, scorecard form and comment timeline are all on camera). The same day's follow-ons + perf round (#2) added four more — ONE auto-generated by the derived trigger-wiring/gate-type nets the moment `purgeOldQaReviews` entered the TARGETS arrays (682→683, the INV-179 promise paying out again — the accrual trigger's exact precedent), plus QA-17 (the My Reviews waveform paints through the ONE shared `qaDrawWaveOn_` painter — the detail's `qaDrawWave_` is now a thin delegate — size-gated, seq-guarded inside the decode callback, wired as DECORATION in its own try/catch AFTER the audio mounts, and ON CAMERA: the mock aliases the agent chunk endpoint to the reviewer WAV fixture — both server routes delegate to `qaAudioChunkFor_`, so one fixture serves both, INV-185 — and the myreviews scenario now PRESSES Play via the post hook), QA-18 (the retention purge — recordings index + Drive never touched, scanned comment-STRIPPED since the fn's own doc comment names the tab it must not touch (INV-188); `ms > 0 &&` fail-safe; bottom-up delete; early-returns before the lock; counts-only audit anchored to the CALL; the job-check row gated on window>0 AND store per INV-186; the getter driven behaviourally in a vm — property wins, negative/garbage → 0, never NaN), and the PERF pin (Training My/Team + Manage Time SWR: paint-from-session-state + refreshing pill, state-write-BEFORE-render-guard so a deferred render never loses data, `mgrSwrRenderBlocked_`/`trainMgrFormDirty_` consulted before any refresh render, failed refreshes keep last-good via warn toast (C17-5) while cold failures still render the error card, and argless post-mutation callers keep cold semantics) — 6 mutations / 6 bites. Editor suite +1 ≈ 312 (`test_triggerGate_qaReviewPurge_nonManagerThrows`); visual matrix stays **54** (the myreviews scenario grew IN PLACE — Play pressed, waveform on camera). The same day's #3 round (Team Notes SWR + the Storage Health QA line) added two more: TN-SWR (the queue/stats paint-last-good — per-kind and per-DATE key-exact caches written BEFORE the seq check (INV-156) and CLEAN-round-only (INV-129/187: an {error} or skippedReps round renders but is never the instant paint), the C17-5 painted/cold failure split on both response shapes, and Per-Rep + Search asserted OUTSIDE the caches — deliberately cold) and SH-QA (the Storage Health QA row's retention BUILT from the live `qaReviewRetentionDays_()` with both branches present + the never-purged clause, the muted not-set pill set, and the fixture row per INV-185) — 5 mutations / 5 bites.
The same day's #4 round (the ALL-CST policy companions) kept the count at **688** — the `tzOffsetMinAt_`/mismatch-check pin was REWRITTEN in place for the changed contract (the honest bookkeeping): it now asserts the profile-vs-`workAnchorTz` offset comparison, the anchor-unresolvable/absent silent-disable guards, a BAN on `getTimezoneOffset` returning to the function (the retired browser comparison), the `workAnchorTz: CONFIG.MANAGER_TIMEZONE` wiring in `getEmployeeState` (comment-stripped per INV-188), and `BY_TIMEZONE: {}` with the Manila-local entry banned from returning — 3 mutations / 3 bites (browser-compare restored; workAnchorTz dropped; Manila entry re-added).
The same day's punch-adjustment feedback round added two more (ADJ-1/2: the reconcile rides the EXISTING tick with a minutes-scale throttle and the view-open/visible gate — a dropped gate makes it a shell-wide poll — the window stamped inside `clkRefreshState_` BEFORE the RPC so no trigger double-fires, plus the chip's array guard, empty-renders-nothing, escaping, `role="status"`, its position ABOVE the punch buttons, and the INV-185 fixture field + `?pendingadj=1` scenario; ADJ-2/3: the helper is read-only + RANGE-bounded + never provisions the tab + normalizes status at the one read + fails toward `[]`, and the decision email fires for BOTH outcomes, carries no MailApp inside the locked body, runs after `releaseLock`, is branded/escaped/best-effort, and says the timesheet is unchanged on a denial) — 6 mutations / 6 bites (view/hidden gate dropped; chip moved below the buttons; deny notification dropped; throttle dropped; approve mail inlined into the lock — caught by the M-7 net AND the new pin; helper switched to provision + full-sheet read).
The same day's business-hours round added four more (BIZ-1 behavioural — the motivating case Fri 16:00 → Mon 09:00 = 2 business hours rather than 3 days, plus both clamps, a full day equalling the 9-hour window, a whole intervening weekday, holiday exclusion asserted in BOTH directions so the holiday set is proven load-bearing, the weekdaysOnly knob, and every null path (reversed / absurd-span / malformed date / inverted window); BIZ-2 wiring — ONE wrapper on the MANAGER tz with a bounded holiday build, the GUARDED push, all four surfaces (Spanish stats, the per-thread card, DR elapsed + SLA bands, and the daily digest) plus a BAN on a raw wall-clock age returning to `deptRequestsOverdueOpen_`; BIZ-3 client wiring — business headline with an old-server fallback, the note gated on `slaBusiness`, both dashboard render paths moved together, and the `#dr-kpi` WRAPPER shape that keeps `drRepaintKpi_`'s outerHTML patch from stacking a note per resolve) — 13 mutations / 13 bites, one of which exposed a pin weaker than its property: the null-push assertion passed against `bizMin == null ? 0 : bizMin` (which keeps both a `push(` and a `null` mention) until it was tightened to the guarded shape.
The 2026-08-31 coverage round added one more (VIS-COVER — the documented uncovered-tab list is DERIVED from the TOOLS registry vs `shoot.mjs`, checked against a `VISUAL-GAP-TABS:` marker line in this file, and bite-checked in BOTH directions: dropping a tab from the marker fails, and dropping a SCENARIO fails too).  The same round's DOM half grew the harness by +9 — the punch state machine, which had ONE test (the M-1 failure restore) for the app's most consequential client logic: the primary-CTA rules driven through the REAL `renderActions` into a live DOM (incl. the operator's afterLunch flip, where ClockOut takes the prime slot and LunchOut is DEMOTED rather than removed), the F3 clicked-vs-prime morph target, all FOUR `submitPunch` response shapes (state-in-response = no second RPC; older server = the refetch fallback; a `{success:false}` rejection restoring the button with the SERVER's reason; and the D2b case where the punch succeeded but the refresh died — restore + a WARN toast saying it was recorded, because an error toast there tells a rep to punch again at the exact moment a duplicate is wrong), the pending-adjustment chip, and self-undo's midnight wrap incl. the −1 sentinel. 9 mutations / 9 bites — the ninth exposed a weak assertion rather than a defect: dropping the `a !== 'Adjust'` filter renders Adjust TWICE (the row appends a trailing one unconditionally), and last-ness, non-primacy and the class all still held, so the pin now counts occurrences. jsdom note: `empState`, `renderActions` and `SELF_UNDO_WINDOW_SECONDS` are lexical module bindings, NOT window properties — read them through the harness's `h.read()` vm bridge. It also strengthened the derived GATE-SHAPE tripwire to follow a one-line DELEGATING wrapper through to its delegate — the four intake account endpoints are `return intakeSendAcct_(…)` inside a try/catch whose own `success: false` satisfied the check regardless of what the delegate returned, so the pin could not fail on them; found by bite-checking the new intake tests against it.
The same day's Workstream A (multi-break correctness) added four more (A1 — `calcHours_` deducts every pair, driven behaviourally through the real function: the operator's 08:00–21:00 split-shift day reads 10.5h and NOT the old 11.0, three pairs, an unpaired leave dropped, a malformed pair contributing nothing, the overnight ORDERING that is the whole reason `breakPairs_` normalizes onto the shift timeline, and every pre-existing string-param case byte-preserved; A2 — `punchDayAdd_` behavioural (breaks accumulate, a second ClockIn still REPLACES) plus a derived scan that all five hours builders route through it and NONE still inlines a last-wins map, and that the two publishing builders keep their scalars while adding `breaks`; A3 — `tsDoctorLegitBreaks_` behavioural over matched/unpaired/clock/unknown-day cases with BOTH the detector and the collapse asserted to consult it; A5 — the impact report is gated, writes nothing, reads through the archive, dedupes live-vs-archive, and reproduces the OLD figure by feeding the SAME `calcHours_` the last stamp of each type rather than re-implementing removed arithmetic). Two of the four failed on first run for reasons worth keeping: the vm-realm `deepStrictEqual` prototype trap (compare by value), and a count that was right about the code and wrong about the pin — `reportMultiBreakDays` is a SIXTH `punchDayAdd_` caller by design. Three EXISTING pins legitimately went red and were updated as part of the fix rather than reactively: two vm sandboxes needed the new helpers loaded, and the derived team-calendar fixture-shape pin read the word "Additive:" out of a COMMENT inside the push literal as a key — INV-188 in its shape-extraction direction, fixed by stripping line comments from that literal (safe: it carries no URLs, the shape the seams-18 F3 note warns a naive stripper would eat).
The same day's **A4** (the Day Edit N-pair rebuild — the last path that destroyed legal break data) added four more and the DOM harness +7. Pure: A4-1 `managerParseBreakSlots_` behavioural (the list shape, the legacy-scalar fallback and which wins when both are present, an EMPTY list as a valid "delete every break", a wholly blank form row skipped, then every refusal by name — half a pair, an inverted pair, an overlap detected ORDER-INDEPENDENTLY, a break outside the clock span with the overnight carve-out, and a stated cap); A4-2 the reconcile driven through the freshly extracted pure `managerPlanDay_` (the two-break no-op save that the old modal collapsed, add/remove/empty, an edit landing on the row it was DISPLAYED against across a scrambled append order, overnight pairing, a stray unpaired half removed, and the S7 clock semantics byte-preserved — plus the apply ORDER, updates → deletes DESCENDING → appends); A4-3 the range refusal by name with no reach for the full-day reconcile; A4-4 the client (the four fixed slots gone from markup AND every read, escaping, labels, real buttons, prefill-prefers-array, snapshot-before-render, the list in the submit, the range cap, every emitted class DEFINED in a stylesheet, and the client cap mirrored from the server constant). DOM: the round-trip, the snapshot property (typing in row 1 survives pressing Add), removing the FIRST row, the disabled add being inert, reopening after a range session re-enabling Add with no RPC (a defect found by READING the open path — `deRenderBreaks_` re-syncs range mode off the live "To", so rendering before clearing it left Add disabled from the previous session, and the prefill's early return on a day with no rows is exactly when a manager is entering punches by hand), and a hostile stored time staying inside its attribute — asserted on `getAttribute`, because an `<input type="time">` sanitizes `.value` to `''` and would report success even if the escape had failed. 18 mutations / 18 bites; TWO were corrected first — ONE pin — `indexOf` on a deleted needle returns −1 and `-1 < anything` is true, so removing the snapshot read passed an ordering check silently (a `before()` helper now asserts presence first), and ONE MUTATION was wrong rather than the pin: re-ADDING the early render left the correct later one in place, so it did not reproduce the defect at all — the honest inverse MOVES the call. Editor suite +1 (`managerSaveDay_multipleBreaks`, walking write → no-op re-save → remove one → empty → refuse-malformed against the real sheet) ≈ **304**; visual matrix +3 (`dayedit-{light,dark}-wide` + `-light-compact` — the modal had NEVER been shot, which is how a modal that silently collapsed a two-break day stayed invisible; measured 0 page overflow at 480 and 1440, the modal scrolling internally at 480 with Save reachable).
The same day's **follow-on + Workstream B** added four more and the DOM harness +3. The follow-on is FO-A2, a derived scan banning a STATIC inline `grid-template-columns` across the scanned partials — the A2 tripwire reads stylesheets, so it could not see the manager analytics pair's inline `1fr 1fr`, which beats every stylesheet rule INCLUDING the shell's own media queries and kept a 44px page overflow at 390px. Computed values are exempt by rule (the coverage heatmap and the training matrix compute their column counts, which CSS cannot express, and both sit in scrollers); one reasoned allowlist entry, exempt on construction because the block it guards renders only behind an opt-in scan no visual scenario reaches. **The misdiagnosis is the part worth keeping:** the first measurement blamed the team-punches `.m-table`, because `getBoundingClientRect().right` on a table inside an `overflow-x` scroller reports its full layout width and looks exactly like an overflow — to find a real overflower, walk the elements past the viewport edge and SKIP any with an overflow-x ancestor. Workstream B added B1/B2 (the done-state Adjust prefill; the manager notification that never existed — asserted post-`releaseLock` per M-7) and two B3 pins (the CONVERT-not-delete model with a ban on `deleteRow`, submit- and approval-side validation, a refused resume not marking the request Approved, back-compat on the trailing `Action` column across all four readers; and that every surface — confirm, chip, queue row, decision email — states the EFFECT rather than naming the punch it consumes). DOM: the Resume button's render conditions (including that an UNRELATED pending adjustment must not hide it), the chip's wording, and the confirm stating the unpaid gap before anything is filed — `uiConfirm` is a LEXICAL binding rather than a window property, so the stub reassigns the binding through the vm bridge. 15 mutations / 15 bites, plus 3 for the follow-on. TWO pins were corrected first, both the SAME trap: `indexOf` on a deleted needle returns −1 and `-1 < anything` is true, so an ordering check passed silently — the `assertBefore` helper is now hoisted and shared. INV-188 recurred a third time, again in a ban-shaped assertion tripping on the code comment that explains the ban. Editor suite +1 (`punchAdjust_resumeConvertsClockOut`) ≈ **305**; visual matrix +1 (`manage-light-mobile` — the tab had been wide-only, which is how the overflow survived).
The same day's **Admin sub-tab follow-on** added one more: VIS-ADMIN, which DERIVES the Admin pane set from the client's own `tab('key','Label')` call sites and requires a mobile scenario per pane (INV-179 — the VIS-COVER marker works at TAB granularity, and all five Admin panes live inside ONE covered tab, which is how they stayed wide-only). Its first run found a live defect the matrix could not previously see: `.cn-tax-head` shared `.cn-tax-row`'s `1fr` stacking rule at ≤720px, so the tag-taxonomy header rendered as six labels stacked in a column above the first row, aligned with nothing, with the first row's usage bar riding over the word "Usage". The header is hidden when the row stacks and the two bare numerics carry their own labels; the delta label is the LITERAL `Δ`, because CSS consumes the space after a hex escape and `'\0394 wk'` renders as the joined-up "Δwk". A `getAdminSheetView` FIXTURE landed with it — the Sheets pane had none at any viewport, so its scenario rendered a loader and its "0 overflow" meant nothing; it is a FUNCTION of `viewKey` (the INV-185 F14 rule — the key decides label, columns, rows and legend). 7 mutations / 7 bites, incl. the class-closing one (a sixth pane with no scenario). Visual matrix +5.
The 2026-09-02 operator round added one more (NLBR — the note email keeps the rep's line breaks: the `.ce` fields are `white-space: pre-wrap` so Enter stores a real `\n`, and HTML collapsed it, so a Resolution written as paragraphs arrived as one run-on block while the CRM paste was correct. The pin drives the real `cnFmtEmailHtml_` and asserts the ORDERING property that makes it safe — breaks convert LAST, because the marker regexes are `[^…\n]+` and converting first would make `**a\nb**` start matching. 3 mutations / 3 bites, incl. the breaks-first ordering. Its first write over-reached: a ban on any inline `\n`→`<br>` found THREE pre-existing correct sites outside this fix's scope, so the ban is scoped to `buildCallNoteEmailHtml_` and the other three are a logged follow-on.)
The design handoff's PR 4 (2026-09-02, the Coaching surface) added six more, then one more (PR4-1 the server contract — the 19 trailing
headers ↔ `CO` indices, the full-width appendRow, validate accepting the three
new fields, the reply written only after BOTH terminal-state guards, praise
never open, voided capped + reported, the follow-up/nudge gate-scope-lock-audit
shape and the nudge's once-per-day guard; PR4-2 K9 driven BEHAVIOURALLY with an
injected minute counter — a Friday-16:00 → Monday-09:30 item is 0.2 business
days old where wall clock said 2.7, unknown is never overdue, praise never nags,
follow-up-due is its own flag, the ack-rate denominator excludes praise, and a
raw `86400000` is BANNED in the two consumers; PR4-3 the `COACH_SEV_LABELS`
byte-equal mirror + every label sink routing through it; PR4-4 the critical
mail builder run in a vm with four NON-content inputs (no parameter through
which the narrative could pass), the notify gate, the create/void wiring past
the lock, and the recap's gate / dual heartbeat / brief-flag ban /
`coachRecapBuckets_` behavioural; PR4-5 `coachRepSignal_` tiers incl. the
25-day-old critical and the INFO-toned no-signal precedence, the retired
`.coach-modes`/`.coach-row-overdue`/`coachNarrativeHtml_` banned, the validated
filter key, voided out of All, praise routed away from the ack card, the
≤720px board columns, the `[hidden]` companions, the drawer via
`ensureOverlay`; PR4-6 the fixtures' keys DERIVED from `coachRowToObj_`, the
seven scenarios, the `?role=rep` hook, the note-date hand-off and the QA hint's
read→null→act order). 10 mutations / 10 bites. **PR4-5 was WRONG ABOUT THE
CODE on first write:** it banned `coachSwitchMode_(`, which legitimately
survives as the handler behind the Mine ⇄ Team strip — only the `.coach-modes`
CSS vocabulary was retired; the pin now asserts the strip renders as shared
`role="tab"` buttons dispatching to it. DOM +1 (the drawer opens
prefilled from `COACH_PREFILL`, is a NAMED dialog, closes on Escape through
the shell handler, its close hook is idempotent, and a fresh open carries no
stale prefill) — **a harness trap worth keeping:** `flushTimers()` also fires
the onboarding tour's auto-start, whose CAPTURE-phase Escape handler ends the
tour and `stopImmediatePropagation()`s the key before the shell's overlay
handler sees it, so the drawer stayed open with `defaultPrevented` true; seed
`umsTour` as seen before `bootShell` in any DOM test that flushes timers and
then presses Escape. Visual matrix +9 (nine coaching scenarios —
manager light/dark/mobile, the drawer, empty, the rep view light/dark/mobile
via the new `?role=rep` hook, and a forced-fail error state; all machine-clean
and eyeballed). Editor suite +2 (`triggerGate_coachingRecap_nonManagerThrows`,
`coaching_criticalMailOnlyAndMailedFalse` via the `_TEST_OVERRIDE_COACH_MAIL`
seam) ≈ **307**.
The design handoff's PR 5 (2026-09-02, the QA surface) added four more and REWROTE three in place (QA-10 for the 14-column header + the
self-heal, QA-11 for the target-aware pick + the period-scoped endpoint,
QA-14 for the gaps-count sampler — the honest bookkeeping): QA-19
`qaCoverageRows_` driven behaviourally (one row per roster name, a case-
insensitive attribution, the period split, `avg` null-never-0, the exempt
target 0, an out-of-range rating counting as sampled but not scored); QA-21
the period arithmetic (year wrap, leap February, the three options),
eligibility as the operator stated it, and the exemption / duration / skip
contracts (manager tier, name never in the audit row, write-once, reason
cleared off a non-skip, the coverage join's outcome carried); QA-22 the
client pure helpers (`qaParseClock_` — a blank is NOT zero; the tone rule;
the tier rule; the summary's capped-at-target coverage and call-weighted
average); QA-23 the wiring (period strip + pref, strip-from-the-same-rows,
skip reason on the row, the pin-not-playhead post, ONE transport renderer,
the hand-off shape, the write-back, the two-pane breakpoint, the three
scenarios, the fixture calling the VERBATIM join, and the recording keys
DERIVED from the server push literal). DOM +1 — QA-20 drives the
pause-and-pin composer against a stubbed media element (jsdom implements
none): the first keystroke pauses + pins, a drift of the playhead to 99s
still posts at 42, the edited pin wins, stay-paused stays paused, a typo is
refused, discard resumes only a player that was playing. 12 mutations / 12
bites. **Two pins were wrong about the code on first write and were
corrected rather than the code:** the target-aware pick's expected order
(the uncapped `(unassigned)` bucket at load 0 legitimately goes FIRST), and
a hand-summed weighted average (36.5/9 is 4.06, not 4.11) — arithmetic in an
assertion deserves the same check as arithmetic in code. And the DOM test's
first `h.click` on `#qa-comment-btn` posted NOTHING, because jsdom's outside-
only mode never compiles an inline `onclick` — the documented trap, hit
again; the handlers are called directly. `mock.js` gained eleven VERBATIM
copies (the period helpers, `qaCardStats_`, `qaExemptEligible_`,
`qaCoverageRows_`, `qaLatestScorecards_`) so the QA fixture's coverage rows
come from the server's own join over its recordings + cards (INV-185) — the
F4 mirror pin picked them up unasked. Visual matrix +3
(`qa-queue-dark-wide`, `qa-queue-empty-light-wide`,
`qa-detail-light-mobile`); the first wide shoot found the row-actions
column wrapping every row to three lines, a duplicated composer
placeholder, and a keyboard hint on a page with no key handler — fixed and
pinned. Editor suite unchanged ≈ **307** (the QA gate case and the omnibus
grew IN PLACE).
The design handoff's PR 6 (2026-09-02, the Time Clock surface) added three
more → **741** and REWROTE five in place (the honest bookkeeping when a
contract changes under a test — the L-35 shooting-star pin became the `PR6
(T2)` DERIVED ban over every retired selector and helper; the INV-184
photo/moon pin gained the shooting star; V-4 now asserts the lunch readout +
the state line's `nowrap`; the skeleton pin counts `<div class="dash-pair` and
the CONDITIONAL extras pair; ADJ-2 re-anchored on `.clk-actions-block`):
PR6-1 the `getMyPendingTasks` contract (bare read gate, six sources each
catching into `unavailable`, the notes source THROWING on
`noteCountUnavailable`, the clean-round-only `cache.put`, every route checked
against the live TOOLS registry, `prevWorkdayIso_` + `pendingTasksSort_`
driven behaviourally); PR6-2 the client (compact gate BEFORE any RPC,
degraded rounds never fresh, clean-empty renders nothing, the notes hand-off
through `fileMissingCalls_`, the render driven in a vm across
skeleton/error/list/unavailable, and the fixture keys DERIVED from the
server's `items.push({` + `var result = {` literals — INV-185); PR6-3 the
surface (rail order, the literal-colour scrim, hours ONCE, the trimmed
sentence, the rotator hold ORDERED after the hover check, the break-chip
states + the `_clkLastBreakMin = -1` reset, the `.actions` base grid + no
540px re-columning). The `clkSkyFor_` edge pin now walks sixteen hours. DOM
+1 (the Needs-you lifecycle on the booted Dashboard: precedes
`#dash-cards`, skeleton → list with `aria-label` + "2 overdue" + `is-past` →
error card → clean-empty '' → unavailable line → freshness stamps → the
hand-off LAST, because it navigates away). 15 mutations / 15 bites. **The one
defect the round found was found ON CAMERA, not by a pin:** the break chips
rendered with no state because a minute-guard survived a same-minute
re-render — reading `clkUpdateBreak_` in isolation it was correct, and only
the screenshot showed every chip plain. The fix (reset the guard when the
chips are rebuilt) is pinned, and the fold claim was MEASURED before and
after with `test/visual/fold-measure.mjs` rather than reasoned (704 → 367).
Visual matrix +2 (`clock-needsyou-empty-light-wide` via
`?fixture=empty`, `clock-needsyou-error-light-wide` via `?failrpc=`); editor
suite +1 (`pendingTasks_requiresEmployeeAndShape`) ≈ **308**.
The browser-timezone dimension (operator 2026-09-02, "can I see what the PH
reps see?") added one more (VIS-TZ — the 7th tuple entry reaches the
Playwright context as `timezoneId`, the frozen instant is per scenario, the
mock honours `?tz=` for the ROSTER zone with abbreviations checked against the
server's own `TZ_ABBR`, and the PHT scenario's two zones are asserted DIFFERENT
— a scenario where they agree tests nothing). The R2-FU pin was rewritten in
place for the seven-entry destructuring. Visual matrix +1
(`clock-light-wide-pht`, clean on its first shoot).
The tz-repair dry-run failure (operator 2026-09-03) added one more
(`F1-inverse` — every `CONFIG.<KEY>` read names a declared key; the existing
F1 only checked the other direction, and a misspelled key reads as
`undefined`, which surfaced as a null sheet twenty lines later; bite-checked
against the original typo).
The Manage Time feedback round (operator 2026-09-03, later that afternoon)
added four more (OPS-1 `mgrWorkdaysEnding_` behavioural + the three
consumers wired + pendingTrend pinned CALENDAR + the fixture walking workdays;
OPS-2 the bulk approve's one-lock/one-read/one-index-per-employee/per-id
contract + the optimistic client + the omnibus case; OPS-3 the pair grid + its
breakpoint, the wrapping rows, and the corner actions gated to ≥541px with the
base top row carrying NO right padding — the 78px mobile overflow the first
shoot found; OPS-4 `mailMergeBcc_` behavioural — unset untouched, append,
malformed dropped, never clobber, never duplicate against to/cc/bcc — plus
exactly two direct MailApp sends in the file). DOM +1 (the Day Edit
prefill race: typed field survives, stale response dropped by SEQUENCE not
date, failed prefill disables Save). Three ADJ/B3 pins followed the decision
body into `punchAdjustDecideAll_` and the M-7 inventory floor moved to the
TRANSITIVE set (the direct set is two functions now).
The boot-timing beacon (operator 2026-09-04) added two more (BOOT-1
the sanitizer/parser/aggregate driven behaviourally — junk, negative, over-cap
and NULL phases dropped, 7-day window only, medians null-never-0; BOOT-2 the
same-row wiring, the stateStart-before-RPC ordering, both landing-view paint
hooks, the 20s fallback, every hook try/caught, the panel's em dash and the
fixture's boot shape) and DOM +1 (BOOT-DOM: deferred at enter, a
foreign view's paint ignored, ONE send with all three figures, plain
navigation carries none). The QA-5 registry pin was repointed for the
`waveform` icon. BOOT-1's first run caught a live defect in the sanitizer
(`Number(null)` recording a fallback send as a 0 ms paint), and BOOT-DOM's
first run caught an ordering one (a synchronously-answered `getEmployeeState`
ran the success handler before `stateStart` was stamped) — both fixed before
the pins went green.
The QA Log round (operator 2026-09-04, the same afternoon) added four more (QA-24 the typed criteria — canonical shape, the non-numeric option
rule at read AND at strict save, the normalizer by type driven behaviourally,
`qaSaveScorecard` routing every rating through it, `qaCardStats_` asserted
type-blind, the Admin editor's type select; QA-25 `qaLogEntries_` behavioural
— reviewer scope, an inclusive day window, an unindexed recording KEPT, avg
null-never-0, comment counts keyed by (recording, reviewer), newest-first;
QA-26 the `getQaLog` / `qaCreateManualRecording` contracts — bare-read gate
before the store, self-scope for a non-manager, span cap, pre-slice total, the
full-width manual row, an id-only audit, the audio boundary carrying NO manual
branch; QA-27 the client — registry gate, the shared range control, seq + view
guards, refetch-free search, the derived strip, the manual pill and the
player skipped, the named dialog, five scenarios and fixture keys DERIVED from
`qaLogEntries_`'s push literal + `getQaLog`'s base block) and DOM +1 (QA-LOG-DOM: the Log lists a manual entry with typed chips, opening it
consumes the hint and never asks for audio, the Yes/No pair and dropdown
render + unselect, the running average counts only the scale answer, and the
save carries STRINGS). 11 mutations / 11 bites. The vm-realm `deepStrictEqual`
trap bit THREE times in one write (two pure, one jsdom) — compare by JSON or
`.join('|')`; it is now the first thing to suspect when a fresh pin fails
on "same structure". Visual matrix +5 (`qa-log-light-{wide,mobile}`,
`qa-log-empty-light-wide`, `qa-log-error-light-wide`, `qa-log-new-light-wide`
— the dialog via the `post` hook).
The English-email fix + follow-ons round (operator 2026-09-04, late) added six
more → **768** (INTK-EN — both collectors read the EN bank, the completion
language still recorded, EN/ES bank POSITIONAL parity asserted, the server
builder renders the labels it is given; MW-1 — `metricsWorkdayIsos_`
behavioural incl. the 22-of-30 count, all four trend walks wired, no calendar
loop survives, three cache keys bumped and no v1 left, the fixture skipping
weekends, the headings saying workdays; QC-TYPE — `cnQaCritRetyped_`
behavioural + the gate-before-RPC wiring; ARCH-GUARD — the spare-row guard
between the flush and the deletes; NLBR-2 — zero inline replaces in Code.js,
the three sites through the helper; QA-28 — the agent filter's select,
unattributed bucket, filter-before-search and stale-pick drop) and DOM +1 (INTK-EN-DOM drives both collectors under `lang = 'ES'` — every PPD
label is EN-bank, none is ES-only, the notes rows are English, PMD rows pair
index-for-index with the EN bank; QA-LOG-DOM grew the agent filter — a
non-match hides every card and says so, the match is case-insensitive, three
filter changes make ZERO refetches). 10 mutations / 10 bites. Visual:
`metrics-light-wide`, `metrics-team-light-wide`, `metrics-light-mobile`,
`qa-log-light-wide` re-shot clean (the trend lines now continuous).
The Drive-capability round (operator 2026-09-09) added four more
(DRV-1 the shared scope-error shape rule; DRV-2 `getOrCreateKbImagesFolder_`
driven behaviourally — unset property vs unopenable stored folder, hint only
on a scope error, the replacement path preserved, a good id creating nothing;
DRV-3 `driveAccessStatus_` behavioural — granted/denied/unknown, folder
states, side-effect freedom, clean-round-only cache, the token never in the
URL, the deploy-readiness opt-out; DRV-4 the findings severities + the
inventory line + escaping + the scenarios), DOM unchanged at **108**, and the
visual matrix +2 (`admin-system-nodrive-light-{wide,mobile}` via a
new `?drive=denied` mock hook — the failing state carries the longest string
the line can render, so it is where wrapping breaks first; **the running
total above is the MEASURED one — `shoot.mjs`'s own SCENARIOS list is the
authority, and the hand-carried chain had drifted two high before cycle 19
caught it, which is the same reason the Visual Audit Stage tells you to read
the count off the run rather than from prose**). 13 mutations /
13 bites — **one did not bite on the first pass and the pin was wrong, not
the code: routing the probe through `getOrCreateKbImagesFolder_` provisions a
replacement, but its thrown message CARRIES the open reason, so the pin's
`/gone/` check passed the mutation; the side-effect assertion had to become a
create-count on the dead-folder path (plus a scoped source ban).** A
pre-existing pin (PR2-3) legitimately went red because the renderer it drives
gained a sibling helper — loaded into its sandbox as part of the fix, the
update-the-test-doubles rule.
Cycle 19's four implementation batches added five more, DOM
unchanged at **108**, visual matrix unchanged at **99**. Batches 1+2 (+2
named: the F2 `storeConfigured_` behavioural and the F4 wiring pin; A1 /
PR6-1 / B3 / PR6-2 grew IN PLACE) — the A1 pin gained the IN-direction break
cases it had never had, which is exactly why F1 survived the round that wrote
it, and every pre-existing `calcHours_` case was re-verified BY EXECUTION as
byte-identical. Batches 3+4 (+3 named: F3, F7, F8; F5 grew QA-24 in place,
and PR2-3 / DRV-4 / the intake-feedback pin were updated as test doubles of
the changed code rather than reactively). 20 mutations / 20 bites across the
four, every one against a COMMITTED tree per the `git checkout` hazard. Two
lessons worth keeping: a fixture-drift mutation first read as NO-BITE because
it was checked against the DOM harness when it is the PURE harness's PR6-2
derived key check that holds it (INV-185), and DRV-4's ordering assertion was
loosened to an explicit Drive-BEFORE-mail check rather than a regex that only
worked while nothing sat between the two capability lines.
The 2026-09-10 operator testing-notes round (Batches A–D, notes 1–10) added
eight more → **785**, DOM +5, visual matrix +3, editor suite
+2 (the follow-ons round below then took the pure harness to
**796** and the editor suite to **312**). Batch A (+1 → 778; DOM +2 → 110; matrix +2 —
`cn-teamnotes-rep-light-wide`, `spanish-expanded-light-wide`): PR4-3 extended
to the six coaching label sinks + the derived validation message, the A9
derived `cn-mgr-*-btn` definition check (the A13 shape), the Spanish
expand-toggle DOM test A5 and the quiz-editor block-swap DOM test A7 (the
`.modal` node IDENTITY survives an option add). Batch B (+3 → 781): N2 drives
the pure `drDeptStats_` fold over a Fri-16:00 → Mon-09:00 pair (business 120,
wall 3900 — the fold must never see the wall figure; a department whose only
resolve was manual reads null); N3-DR the `ResolvedVia` one-reader + the
timed/untimed item contract on both sides of the wire; N3-SP the
manual-resolve exclusion from BOTH Spanish series, the `spanish_inbox_v2` key
bump, and a pin that the resolver-share chart still ATTRIBUTES manual resolves
(so nobody "fixes" it to drop them); BIZ-2 (b) rewritten in place for the
changed literals. Batch C (+3 → 784; DOM +2 → 112; matrix +1 —
`deptreq-expanded-light-wide`): C-N4 the auto-assign pick driven (round-robin
/ existing load / balancing / empty), gate-before-core, the lock + live
re-derivation + batched write + counts-only audit, the client
button/confirm/one-render, and the fixture routing through the VERBATIM pick;
C-N6 `drCanAct_` driven, the detail read's ONE not-found on scope refusal, the
whitelist note, the digest + audit trail label-only, fixture-as-a-function;
C-N8 `saveQaMembers` + `qaCanReviewEmail_` driven in a vm incl. a failed roster
read — with N3-DR (a) rewritten for the new trailing slot and the cycle-17
batch-3 fixture-shape pin's mock-WIDE ban on `patientTrx:` SCOPED to the
coaching rows, because the Dept Requests item's server field IS spelled that
way. Batch D (+1 → 785; DOM +1 → 113): the D-N10 presence pin — the pure rule,
`presenceMap_` failing toward NO flags, the row literal's EXACT four keys read
per LINE (the literal uses ES shorthand, which the colon-only key extractor is
blind to: its first write read two keys out of four), the three polls +
`getTodayPunches_` NOT stamping, the beacon's stamp-BEFORE-send, the chip as a
wrapping block and both (0,3,1) head rules. 38 mutations / 38 bites across the
four (A 6, B 8, C 13, D 11), every one against a COMMITTED tree. **Two harness
lessons:** `run.js` now prints its summary line LAST (Batch B), so the hazard
note above reads "above the SUMMARY line", not "above the exit"; and jsdom's
outside-only trap bit a THIRD time (the A5 / C-N4 / C-N6 handlers are called
directly).
The 2026-09-11 follow-ons round (RT / BP / SA / TW / DR — the deferred
diagnostics retention tier + the suggestion follow-ons) added eleven more, DOM unchanged at **113**, visual matrix unchanged at **102** (re-shot
clean: 0 missing, 0 overflow), editor suite +2: RT-1 (the purge's
fail-safe / contiguous-bottom-up / budget / gate / windows-default-0 contract),
BP-1 (the verbatim positional pairing yields ZERO pairs on the F1 day where the
greedy rule yields one, defined once and called once), BP-2 (the report driven
behaviourally — the F1 day at 9.0h → 8.5h and nothing else; ONE `calcHours_`),
BP-3 (`getTimesheetDoctor` driven with a stubbed scan — the `unpaired` finding
names the dropped stamps, the duplicate group stays a duplicate group), BP-4
(the client all-clear + summary + the "Unpaired break stamps" render), SA-1
(the handler driven with stubs — heartbeat BEFORE the flag, the business-hours
gate, the refused run stamped, registry/wiring/labels/mock asserts), TW-A (the
derived numeric-guard-width scan), TW-B (the token value set derived from the
tokens partial; canvas fallbacks pinned EQUAL; the frozen-literal list; the
two-sided per-file ratchet — RETIRED in Batch P the same day, below), DR-1 (a recording stub sheet asserts the
column-then-row read shape `'2,1,3,1 | 4,1,1,14'`, a padded id matches, a miss
costs one read, a blank id none) — plus TWO auto-generated by the derived
TARGETS/gate-type nets when `purgeOldDiagnostics` and
`autoAssignSpanishThreadsScheduled` entered the arrays (INV-179 paying out
twice more); A2/A3/A5 grew or were rewritten IN PLACE as test doubles of the
changed code. 26 mutations / 26 bites, every one against a COMMITTED tree.
Two lessons: a bite script's RESTORE check must not assume the replacement
string is unique (`count("\n") == 1` can never hold — one restore silently
failed and `git checkout` of the whole file was the recovery, which is exactly
the hazard the commit-first rule exists for), and a `const` inside
`vm.runInContext` is a lexical binding, not a context property — declare
sandbox globals with `var`.
**Batch Q (2026-09-11, the Script-Property size guard) added five pins → 804**
(Q-1 the DERIVED writer scan — every `setProperty` outside `propSetBounded_`
writes an allowlisted scalar, every blob key IS bounded, and the refuse-vs-degrade
mode is asserted per key, so a new blob property fails CI until it picks one;
Q-1b the helper and both shrinkers driven in a vm — refuse writes NOTHING and
names key/size/cap, degrade keeps the NEWEST entry, an unshrinkable value deletes
rather than leaving a stale one, `utf8Len_` counts BYTES; Q-2 every save endpoint,
the one-home badge rule, the derived no-second-tone-rule scan, and the WORST-CASE
arithmetic so a raised entry cap reads as the over-budget it is; Q-3 the Storage
Health line; Q-5 the bounded DeptRequests resolve lookup). Editor suite +1
(a `saveEmailTemplates` over-size case). **9 mutations, 8 bites — and the 9th is
worth keeping: widening the scalar allowlist ALONE is an EQUIVALENT MUTANT**,
because the entry is inert unless something also bypasses the guard; re-run as
bypass + allowlist together it bit on both halves of Q-1 and on Q-2. The lesson is
the one this project keeps re-learning from the other direction: a mutation that
does not bite is sometimes a property of the mutation, not a weak pin — establish
which before tightening anything.
**Batch S (2026-09-11, suite operability) added three pins → 799** — all DERIVED
from `Tests.js` itself: the three shards kind-pure, disjoint, and unioning to every
registration in the file, with every registered function defined EXACTLY ONCE; the
counter driven behaviourally in a vm with every `test_*` stubbed to THROW (so
counting is proven to touch none of them), asserting per-shard sums, a duplicate
name reported, and no `Expected:` line printed without an expectation; and
`_suiteEnvCheck_` naming every `getProperty('…')` literal the rest of the file
reads, using the app's own predicates, never writing and never throwing, and
running FIRST in setup. 8/8 bites. **Its FIX is the reason the once-only clause
exists:** `test_triggerGate_weeklyDigests_nonManagerThrows` had been defined twice
since #239, the later declaration hoisted over the earlier, both registrations ran
the dispatcher body, and `sendCallNotesWeeklyDigests`'s own gate went unverified
while the count read a clean 315 — invisible in every direction a reader looks.
**Batch P (2026-09-11, the first batch of the post-cycle-19 next-steps plan)
REWROTE TW-B in place** — the per-file ratchet half is gone, the token-equality
ban / FROZEN list / canvas-fallback rule stay (a re-added token-equal literal
and a moved canvas fallback both still bite) — and added ONE pin, P2 (the
ribbon's three fallbacks ride `--accent-glow` / `--warn-glow`, the new token
declared in exactly the two base blocks and in no palette block, `--accent-glow`
still 5 × 2, and no Console-only rgba twin left in the clock partial), verified
by a pixel-compare of `clock-light-wide` + `clock-dark-wide` against the
pre-edit baseline rather than by eye. The pure total is read off the run's
summary line from here on (this batch added one pin; the trigger-quota round's
derived gate tests had moved the total twice without a doc edit, which is the
drift this rule exists to stop) — Batch C landed the derivation, so the count
lives in the generated block and in no sentence.
The split-day punch repair (operator 2026-09-03, the same afternoon) added two
more → **752** (TZR-3 — `splitDayRepairPlan_` driven behaviourally: the kept
row is the earliest TIME, not the last APPENDED row (the sheet doctor's rule,
wrong here), deletes come back bottom-up, a non-ClockIn pair and an
unparseable pair are named and untouched, out-of-window rows never plan;
TZR-4 — the contract: gate, dry-run default, the shared resolver, ONE read,
adds validated → dry-run return → lock, adds through the adjust writer BEFORE
bottom-up deletes BEFORE the mirror re-point, `PunchDelete` rows naming the
kept time, untouched groups reported) with TZR-2 rewritten in place for the
shared `tzRepairResolveTargets_`. 7 mutations / 7 bites; one first-draft
assertion was wording-only (a refusal message beside `if (false)` passed) and
was tightened to the live guard shape before it bit.
The break coverage planner (operator 2026-09-03) added four more
(BCV-1 `coverageSplitAtBreaks_` + `breakCoverageSlots_` behavioural — a
partial overlap counts as away, offsets are shift-relative, the 16:45 slot is
on shift for a 17:00 end; BCV-2 `inboundVolumeBuckets_` behavioural against a
REORDERED header row — name discovery, the PST→CST shift with midnight wrap,
internal/weekend/queue filters, the distinct-weekday denominator, a missing
column NAMED with no slots; BCV-3 the server contract — bare read gate, draft
through the sanitizer, memo swap restored in `finally`, display-value reads
only, clean-untruncated-round cache with the test bypass, five named
failures, and the planner's whole-shift push BANNED; BCV-4 the client — one
collector for Save AND the strip, both handlers seq+view guarded, volume once,
last-good on failure, real pressed cells, computed grid columns, own scroller,
the `[hidden]` companion, and fixture keys DERIVED from three server literals)
with BRK-4 rewritten in place (the collection moved into the shared
collector). 11 mutations / 11 bites. Two pins were wrong about the CODE on
first write: the vm-realm `deepStrictEqual` trap (again) and a return-literal
regex that ran past the endpoint's own `catch` and read `{ error }` as a
missing fixture key — anchor a shape extraction on the literal's FIRST key.
Visual matrix +1 (`admin-config-covfail-light-wide`); the demand
bars were too faint on the first crop and were darkened on camera, not by
reasoning.
The per-agent break schedules (operator 2026-09-02) added one more
(BRK-5 — `empShiftSchedule_` driven behaviourally: the per-employee layer
wins over the tz layer, an explicit-empty list is honoured, no id falls to
the tz layer, a column-O override composes with it) and GREW BRK-1..4 IN
PLACE (sanitizer employees map + key/count caps; the resolver stub; the save's
map shape / malformed id / unknown id / per-break rule / offboarded-id
acceptance / canonical persist / read ≡ write / no-key-when-empty /
employees-only-is-not-a-reset; the callers' `id`, the admin view fields, the
client's custom-only collection, the picker and the warn pill). 6 mutations /
6 bites — one first mutation was an EQUIVALENT MUTANT (`!== undefined` →
bare truthiness changes nothing, because `[]` is truthy; the hazardous form
is a `.length` guard, which bites). The fixture's `breakSchedules` mirrors
the server view (`employees` / `roster` / `workAnchorTz`, INV-185).
The Timesheet timezone repair (operator 2026-09-02, the same afternoon) added
two more → **743**: TZR-1 drives the pure `tzRepairPlanRow_` with INJECTED tz
functions (a fixed 13h offset — the pre-flip shift collapses onto one date, a
post-flip row and the boundary itself are left alone, garbage is null, an
identity conversion is a no-op; compared by JSON value — the vm-realm
`deepStrictEqual` trap, hit again), and TZR-2 pins the applier's contract
(gate, `dryRun !== false` default, required flip instant, archive read-through,
bound, dry-run return BEFORE the lock, finally-release, exactly TWO `setValue`
per row so COMMENTS is untouched, no append/delete, per-employee counts-only
audit, collisions reported, mirror re-pointed, ambiguous names refused). 3
mutations / 3 bites.
The design handoff's PR 3 (2026-09-02, the Manage surface) added five more (PR3-1 `punctDayState_` + `punctWeeklyBuckets_` driven behaviourally —
the five states incl. `nopunch`, weekends null, buckets clipped to the range,
a bucket with no graded day reading null not 0 — plus the endpoint's cap in its
LIVE guard shape (a presence check survived `if (false && …)` on the first bite
and was tightened), the additive contract beside `days`, the fixture's
`dayDetail` keys DERIVED from the server's own push literal (INV-185) and the
fixture being a FUNCTION of the range (F14); PR3-2 `punctOutliers_`/
`punctTrend_` behavioural, the empty-panel rule, the chip words, and the
Coach-on-this hand-off through `COACH_PREFILL` + the registered `develop` tool
key; PR3-3 the Manage Time ORDER, the disclosure aria, the `[hidden]` companion,
`MGR_STATE` session-only, the summary feeds on clean/drift/FAIL, and
`mgrSwrRenderBlocked_` keeping exactly two `return true;`; PR3-4 the shared
control on both views — forward vs backward presets, seq guards, D5 — with the
retired `.punct-*`/`cov-controls`/`toneCol`/dead locals banned and the ≤720px
breakpoints; PR3-5 the coverage fixture's keys derived from the return block +
the rep push literal, the six new scenarios, the VIS-COVER marker). 9 mutations
/ 9 bites. Visual matrix +6 (Coverage had never been shot — its tab
left the gap marker). **The first mobile shoot found the one defect of the
round in a SHARED component:** `.app-bar` had no viewport breakpoint, so its
`flex-shrink: 0` right-hand control kept its full width at 390px and squeezed
the Punctuality subtitle into a ~150px, seven-line column beside the preset
strip. The tokens partial now wraps the bar at ≤540px (the shell breakpoint)
with `.app-bar-right` taking the full row — Intake's EN/ES toggle drops under
its title the same way (verified on camera, no regression) — pinned inside
PR3-4 and bite-checked. **A derivation trap worth keeping: the fixture's return
anchor `return { from: from, to: addIso(from, n - 1),` CONSUMED `to`, so the
derived key set lacked it and the pin was red against correct code — an
anchor must consume the same keys on both sides, or re-add what it ate.**
The design handoff's PR 2 (2026-09-02, the Admin surface) added four more (PR2-1 `cnHealthFindings_` driven behaviourally — an all-clear payload
raises nothing, a failed load is a `fail` finding and a `degraded` marker,
not-loaded is distinct from failed, and each per-signal rule fires on exactly the
count that is zero when healthy; PR2-2 the cards, badge and list derive from the
ONE function, both loaders re-derive on success AND failure, X7 `errorStateHtml_`
on all four Admin loaders, the retired derivation/disclosure banned; PR2-3 the
storage inventory through `mtRenderTable_` with the INV-182 detail row, the
retired row classes banned, and a hostile label escaped; PR2-4 the two all-clear
empty fixtures and the five System scenarios) and REWROTE the INV-186 card pin
in place onto the findings function (the honest bookkeeping when a contract moves).
9 mutations / 9 bites. Visual matrix +5. **A vm-realm reminder, hit
again here: `assert.deepStrictEqual` compares prototypes, so an array `.map`'d
inside the sandbox fails against a plain literal — compare by `.join('|')`.**
The design handoff's PR 1 (2026-09-02, the cross-cutting sweep) added five more (PR1-1 the derived no-redundant-fallback scan; PR1-2 `mtPctTone_` +
`mPctClass_` byte-identical across the grid; PR1-3 `mtDateRange_` driven
behaviourally — real buttons, pressed/expanded/controls, escaped labels, the row's
hidden attribute; PR1-4 the `?fixture=empty` hook consulted BEFORE `FIXTURES`;
PR1-5 the three CSS fixes), and REWROTE three in place for the deliberate contract
change (the `#2` metrics-control pin now asserts the shared control and bans the
retired builders; the previous-workday pin reads the preset LIST; the batch-7 mock
pin re-anchors on the `FIXTURES[name]` read) plus widened the `.toolbar-tabs`
overflow pin with the ≤480px wrap.
**The operator's post-push `runAllTests` then reported 302/305, and one of the three was a REAL REGRESSION the suite caught (2026-09-01).** `managerSaveDay_mixedChanges` — a test predating A4 — submits a break with a leave and a blank return, which A4's `managerParseBreakSlots_` refused as a malformed pair. The refusal was wrong: a TRAILING leave with no return is an **in-progress break**, the state the punch clock creates every day at lunch, so Day Edit became unsavable for any rep who was out at that moment. Fixed at both layers (the parser accepts a trailing open break; `managerPlanDay_` matches each half at its own index so the blank REMOVES the return row instead of writing an empty time into it, and an existing lone leave is never deleted-and-re-added), and the A4-1 pin — which had encoded the wrong rule — was rewritten to assert the accepted shape plus the two that stay refused (a leading return, a half followed by more rows). 3 mutations / 3 bites. The other two were test-side: a helper I invented (`_clearAdjustRequests`) that never existed, and the calendar-dependent accrual fixture (see the editor-test hazards). **The lesson is the one the template already states and I did not follow: scan for a module's test doubles BEFORE editing it. `managerSaveDay_mixedChanges` encoded the old contract in plain sight, and reading it first would have surfaced the in-progress-lunch case during design rather than after a push.**
The 2026-09-01 operator round added two more (CLK-DONE — the shift-complete verdict names the ClockOut it was derived from: call-site wiring, the conditional clause, and the hint class being DEFINED in a stylesheet; and BCN-3 — `reloadApp_` escapes the HtmlService iframe rather than reloading its session-bound URL, with the fallback ORDER pinned by COUNTING reloads rather than checking that one appears last, because the first version of that assertion passed against a reload-first mutation). The same round grew three existing blocks IN PLACE: the accrual pin gained the forward-stamp no-op + the caller's conditional write (PR #211), BCN-2 now requires the action to delegate to `reloadApp_` and BANS a bare `location.reload()` in the tick, and the behavioural `getNextActions_` block gained the operator's own question as a test — a stray earlier ClockOut plus an approved `ADJ-ClockIn` (INV-09 strips the prefix, so it IS a state) yields `LunchOut / ClockOut / Adjust`, which is the property the backward scan provides and a forward-scan mutation breaks. DOM stays **91** — the done-state assertions (the named clock-out, the way-out line, and both degradation paths) grew inside the existing punch-state block rather than adding one. 11 mutations / 11 bites across the round; two exposed a pin weaker than its property and were rewritten before they bit.
The 2026-08-31 team-punches-calendar round added two more: the behavioural `getTeamCalendar` pin (the REAL endpoint driven in a vm with the real EMP/ADP/TO enums + `empRosterEmail_`/`normalizeType_`/`calcHours_` — gate + bare-{error} read shape, last-punch-per-type wins, garbage COMMENTS types are not punches, a corrupt time cell reads INCOMPLETE never 0, padded `" Approved "` overlays count, offboarded rows excluded from rows AND rosterCount, archiveNote on a pre-live-tab month) and the client wiring pin (loader beside the lazy cards, key-exact clean-round cache write BEFORE the seq check, the C17-5 painted/cold failure split, role/tabindex/aria-pressed day cells, manager-tz date derivation, future-nav refusal, the bounds-checked Day Edit prefill, the honest no-punches merge, `mtRenderTable_` per V-11, and the fixture's rep-row keys DERIVED from the server's own `repRows.push` literal per INV-185) — 6 mutations / 6 bites, TWO of which exposed the pin as weaker than its property on the first run (the null-hours mutation was UNOBSERVABLE until a corrupt-time fixture row exercised the `calcHours_`-null path — mutate against the property, not its neighbourhood — and the fixture-key drop had to remove the key from EVERY row before the presence check could see it). The omnibus gate test gained the `getTeamCalendar` case IN PLACE.
The 2026-08-17 post-deploy operator round added seven more
(the `mPrevWorkdayIso_` behavioural pin — Monday lands on Friday, weekends
step back, zero-arg defaults to employee-tz today; the My-Stats-preset pin —
Yesterday preset + previous-workday default + the range-trend fill following
the warmed key, with Team Metrics' Today asserted KEPT; the PPD
custom-recipient pin — footer option + empty-guard + the SHARED server
resolver validating custom for every form type; the one-round-trip punch pin
— lock-free wrapper, state attached only to success, try/caught assembly,
client inline-apply + surviving fallback refetch (the M-1 pin repointed at
`recordPunchCore_`); the cross-window reminder-dedupe pin — vm-driven with
two windows over one stubbed localStorage, day rollover, corrupt-blob
degradation; the tz-audit S2 pin — both ends of the ambient week window in
the rep tz; and the `kbSearchScore_` rebalance pin — density, title cap, and
the motivating tied-at-7 flooding case — 10 mutations bite-checked; the
in-lock wrapper mutation was ALSO caught by the M-7 transitive mail scan,
and the old #1 range-fill pin was updated for the deliberate
previous-workday fill source and re-bitten).
The 2026-08-13 pre-pilot observability round added five more
(the digest-chrome pin — all three Call Notes digests through
`buildBrandedEmailHtml_` with real `safeWebAppUrl_` CTAs and per-digest
tones; the errorState-beacon pin — `errorStateHtml_` fires `errBeaconSend_`
with the new three-value source enum accepted by BOTH normalizers; the
spike-alert pin — called post-`releaseLock` (M-7), threshold + window +
cooldown constants asserted from source, recent-messages escaped, and the
`automationProblems_` (g) entry + `last24h` cutoff; the
`viewUsageAggregate_` behavioural pin — vm-driven with real events across
the 7d/30d windows, distinct-rep counts, top-view resolution, and the
malformed-event guard; and the usage-beacon wiring pin — server gate +
shape regex + rate cap + USER lock, client 5-min throttle +
`VIEW_AS.active` skip, panel esc()/A12/A2 asserts — 9 mutations
bite-checked, with one matcher lesson worth keeping: the bite-check
harness must match on the TEST NAME in the ✗ line, not a section-header
console string, or a biting mutation reads as NO-BITE).
The 2026-08-13 settings/speed round added seven more (the settings
flyout — attribute-keyed gears, capture-phase Esc + stopPropagation, all
three control groups inside the panel, the `[hidden]` display companion, and
the single-render-site + shell-root-mount contract folded into the rewritten
palette-picker pin; view-as — `viewAsFlags_` behavioural per role,
admin-gate, no-localStorage session-only, all four `empState`-refresh
reapply sites, banner + real-role row; `tzOffsetMinAt_` behavioural
(CDT −300 / IST +330 / unknown → null) + the offset-not-id compare, UTC
sanity probe, once-a-day key and sticky toast; the dashboard first-frame
4-card skeleton + parallel extras kick + `extraBusy` guard;
`clkDashSeedFromLs_` behavioural — same-day complete rounds only, freshness
never inherited, partial rounds never persisted; the three slow tabs'
paint-any-cache + Spanish head-only refresh + background last-good; and the
`getTeamMetrics` endpoint cache — read after the gate, put gated on a clean
round, test-override bypass — 12 mutations bite-checked; two pins updated
for the deliberate layout/contract changes rather than the code, both
verified to still bite). The colour palettes added seven more
(all seven are DERIVED, so adding the fifth palette (Sage) required no test
edit at all — the AA, constant-luminance, contract, swatch, key-list,
specificity and hue-drift pins all swept it in, which is the INV-179 promise
actually paying out; two Sage-specific mutations were bite-checked to confirm
the scan reaches it. The palette contract — neutrals + accent only, never a semantic colour, and a
block declares the FULL neutral set so it is verifiable alone; the
constant-luminance construction, which catches a hand-edited hex even when it
stays above 4.5:1; the swatch-equals-its-palette pin; the three key lists
agreeing + a corrupt value degrading to Console; the specificity form that
beats the base dark block in both directions; the picker's button semantics +
settings-row adjacency; and a DERIVED check that boot.js stubs every global
index.html defines — 13 mutations bite-checked). The **AA tripwire was
rewritten** from "exactly two hex declarations, light then dark" to a derived
block scan, and the V-1 hue-drift pin now runs per PALETTE (the -deep tokens
mix toward `--ink`/`--paper-card`, which a palette changes).
The 2026-08-12 operator round added seven more
(the clock-card photo + moon stay deleted, selector AND render — the star field
is asserted by its ASSIGNMENT, since a surviving CSS rule proves nothing about
what renders; `dashPctTone_` banding by direction with NO tone absent a target;
`dashDelta_` where an absent comparison is not "no change" and volumes carry no
verdict; `dashboardPrevRange_` like-for-like elapsed days clamped DOWN; the
one-shaper/best-effort-prev/uncached-degraded server contract; both cards
defaulting to a DERIVED MTD index; and the sticky-toast shape — 23 mutations
bite-checked, one of which exposed a pin weaker than its property and was
rewritten). DOM +2 (the sticky lifecycle: survives the auto-dismiss
window, × dismisses, the cap evicts routine toasts first — 4 more bite-checks).
The intake email restyle added two more (the shell's chrome
asserted against `buildBrandedEmailHtml_`'s own source so the two cannot drift
apart again, plus per-form module labels at all four call sites; and the ledger
vocabulary — mono-uppercase band on tint not centred, hairline separators, no
bordered grid, the shared band in BOTH bodies — with the email-safety and
`esc_` guarantees riding the same test — 10 mutations bite-checked).
The decision block added five more (parse; unwalkable-guide reporting;
path resolution incl. a stale answer; one-question-at-a-time + trail + fresh
ticks; fence inertness — 9 mutations bite-checked). The glossary block added three more (parse/aliases/duplicate-refusal,
fence + inertness + attribute quoting, first-mention-only + acronym case + skip
set + both readers wired — 8 mutations bite-checked). The join/reciprocal round added two more, then extracting the pure
classifier folded three source-shape pins into one behavioural one → **484**
(6 geometry decisions bite-checked). The skip/direction correction added one more (column+row
attributes, adjacency deciding step-vs-skip, phase-bypass arcs, source-anchored
arrows — 5 mutations bite-checked). The process-graph round added two more
(measured edges + left-edge classification + redraw + stacking; dangling steps
reported and malformed lines counted — 7 mutations bite-checked). The first
deployed-screenshot round added four
more → **480** (fence-atomic chunk truncation with constants DERIVED from
Code.js; separators surviving kbMd_ escaping — the pin that caught a SHIPPED
sub-team defect; Flow-only-when-recorded; the Expand overlay — 11 mutations
bite-checked). Roster Tier 1 added five
more → **472** (person index folds a multi-team person; three views from one
source + coverage-states-no-verdict; exact tag matching; unique person ids
with a canonical first; tablist ARIA + distinct-people count — 7 mutations
bite-checked), and the chart view four more → **476** (tree roles + all-collapsed
+ CSS disclosure + vertical leaves; structure-not-reporting; own-scroller with
notes OUTSIDE it + the 560px node width; aggregate views bypass the row count —
10 mutations bite-checked). **TWO of those pins did not bite on the first
write, both because the assertion was weaker than the property: an ordering
check (`note index < wrap index`) survived renaming the wrap, and an
initial-render check said nothing about whether the TOGGLE keeps aria-expanded
in step. Mutate against the property, not its neighbourhood.** **A pin that does not bite is not a pin: the verdict-word scan
passed against a mutation until the FIXTURE was given a single-point-of-contact
row, because the sentence it guards only renders in that case.** **A vm-realm trap worth
knowing: `assert.deepStrictEqual` compares PROTOTYPES, so an array created
inside a `vm` context fails against a plain `[]` even when the values match —
compare by value (`.join('|')`) instead.** TWO
lessons from that round's bite-checks, both about the REVERSAL rather than the
pin: a `python` inverse edit must anchor on a string that is unique in the file
— `flex: 0 0 auto` restored into `.instance-banner svg` instead of the grid
rule it came from, and `.sb-theme-btn` restored into a COMMENT — so verify the
restore by re-reading the anchor lines, not just by re-running the suite.
Two of
those six did NOT bite on the first attempt and were tightened: the A1 scan was
line-by-line and missed multi-line markup (it now scans the whole source, where
`[^>]` matches newlines), and the A3 input list held only no-colon cases, all
caught by the length guard, so it passed with the `isNaN` guard deleted (added
`'ab:cd'`, `':'`, `'x:30'`, `'09:mm'`). **Editor-suite hazard found while
writing the A3 smoke test: `_assertEq` compares via `JSON.stringify`, and
`JSON.stringify(NaN)` is the string `"null"` — so `_assertEq(NaN, null)`
PASSES.** Any null-vs-NaN assertion in `Tests.js` must use a strict
`=== null` check via `_assertTrue`, or it is blind to the exact regression it
exists to catch. Editor suite
+6 in cycle 10 (sheet-doctor flow, legacy-hash dual-verify, self-test gate + 3
omnibus gate cases) ≈ 297, +2 cycle-11 (updateTimeOff_dupApproveRejected;
rejectsBadDate horizon cases) ≈ 299, +cycle-12: assertions folded into the
existing `archiveSheetRowsOlderThan_behavioral` (a maxRows case proving bounded
AND monotonic progress), `test_sheetDoctor_detectsAndCollapsesDuplicates` and
the `cnCountNotesResult_` smoke tests (renamed from `countCallNotesInRange_*`
by cycle-13 A4), PLUS two new smoke tests for the
cycle-12 pure helpers (`cn_enrolledSheetId_trimsAndNullGuards`,
`cn_appendBounded_capsAndRollsBack`) ≈ 301, +1 cycle-13
(`timeToMins_nullOnUnparseable`) ≈ 302. Use
the Regression Scenarios below as the canonical full-system
verification path.

A second, **DOM-lifecycle** harness now sits alongside the pure one:
`node test/client/dom/runDom.js` (or `npm run test:dom`; `npm test` runs BOTH).
It loads the FULL `<script>` of the chosen partials into a real **jsdom**
window — the project's only dependency, dev-only, so `clasp` still never
pushes it — and tests the layer the pure harness can't reach: innerHTML
render/escape, overlay lifecycle (`ensureOverlay`/Esc), optimistic-UI
submit + revert (INV-48), `_flagInFlight` double-fire (INV-56), late-callback
`currentView` guards, and the focus trap. Mechanics (see
`test/client/README.md`): `runScripts:'outside-only'` →
`getInternalVMContext()` (window === globalThis, real document; no auto
`DOMContentLoaded`, so module-top init stays dormant); partials share lexical
scope so a trailing **bridge** (`h.t`) get/sets the `const`/`let` module state
(`CN_STATE`, `currentView`, `empState`); a programmable `google.script.run`
mock (`run.resolve`/`reject`/`lastFor`/`countFor`) drives the RPC paths;
`opts.markup:['modals.html']` mounts shared modal DOM for the `tc/` views. The
escape-discipline tests are proven to bite (reverting an `esc()` fails them) —
this is the regression net for the client overlay/lifecycle bug class that
every prior cycle shipped blind. The CI workflow runs it as a second step
(after `npm ci`); the zero-install pure step stays first as the always-on floor.

A third, **static-render VISUAL harness** lives in `test/visual/` (adopted from
the cycle-11 visual audit): `node build.mjs` inlines the production partials
into a standalone `page.html`, and `node shoot.mjs` renders a 102-scenario (at last count — `shoot.mjs`'s own SCENARIOS list is the authority)
matrix (tool × wide/compact/mobile × light/dark) in headless Chromium with a
fixture-backed `google.script.run` mock, writing `shots/*.png` + `report.json`.
It is **manual / on-demand like the editor suite — NOT in CI** (needs a
Chromium install; findings need human eyes). Run it before deploying changes to
`styles*.html` or any view partial. Two rules from its own README: **fixtures
MUST mirror the real server contract** (two fixture-shape bugs — a wrong
`coachAnalytics_` shape and a pre-formatted `lastPunchTimeMgr` — produced
convincing fake defects before this rule), and a `report.json` `missing` entry
means the scenario rendered a loader, not the real view — add the fixture
before trusting the screenshot. **A fixture must never REIMPLEMENT server logic
(cycle-15 F4):** the Team Metrics fixture hand-rolled the queue→department fold
and had already drifted — it omitted the per-group `queues.sort()` — so every
screenshot showed an ordering the server cannot produce. `mock.js` now carries
VERBATIM copies of `groupQueueRows_`, `CDR_QUEUE_UNGROUPED` and the
`CDR_QUEUE_GROUPS` seed under a DO-NOT-EDIT banner, pinned byte-identical by the
F4 mirror test. Copy server logic in and pin it; never paraphrase it.
See `test/visual/README.md`.

**The PTO accrual batches (2026-09-14 → 15) added two pure-harness pins and
two editor registrations, and the harness log has a GAP before them.** Batches C, D1, D2, F1 and F2 are not
written up here; their harness work is recorded in `.cycle/blocks/` instead
(`19-batchD1-…`, `19-followons-D2-…`, `19-F1-…`, `19-F2-followons-…`). This
entry is not backfilling those — it records the accrual work and names the gap
so a reader does not take this file's last dated entry as the harness's last
change. Read the blocks for anything between 2026-09-11 and 2026-09-14.

What the accrual round added:

- **`previewPtoAccruals` is a READ-ONLY dry run that shares the ONE accrual
  resolver** — the shared-resolver claim (one `planPtoAccrualRun_` call, no
  re-derivation of the plan) and the writes-nothing claim (no `setValue` /
  `appendRow` / `deleteRow`, no `adjustLeaveBalance_`, no `writeAuditLog_`, in
  the preview OR the resolver) asserted on both bodies, plus the zero-reason
  split and the report's wording driven behaviourally.
- **`R: the accrual RECONCILES late data`** — the note round-trip mirror
  (builders ↔ `parseAccrualLedger_`, including the fail-closed nulls), the
  window incl. the year boundary and the current-month exclusion, all four
  verdicts of `planAccrualReconcile_` driven in a vm (topup / ok / shortfall /
  skipped), and the structural rules: only a topup reaches the balance mutator,
  one range index build per run, the ledger read bounded and reporting
  `truncated`, the max-hours-wins rule.
- **The editor suite gained `accrualReconcile_topsUpLateData`** (+1
  registration; the run prints its own `Expected:` line), which replays the live 2026-08 sequence end to end rather
  than asserting the parts: open day credits zero → the approval lands late →
  the next run tops up → a re-run does not → a deleted punch reports instead of
  clawing back. It is the acceptance test for the whole change.
- **`serverDecls()` moved into `harness.js`** so the F2c pin and
  `scripts/split-manifest.mjs` share ONE declaration canonicalization. Two
  implementations of the same hash is what produced 43 spurious mismatches
  while F2 was being built.

**Three hazards this round put in the gotcha index rather than here**, because
they are rules for writing pins and not facts about a batch: a pin that asserts
a guard's MESSAGE instead of RUNNING it, `deepStrictEqual` against a
vm-sandbox value comparing realms, and the two ways `bite.sh` misreported a
verdict. See g116 — all four were found by bite-checking, which is the only
reason they are known at all.

## 2026-09-16 — the FORMS and QA fixtures

The `no-undef` net (g118) reported three `_TEST_OVERRIDE_*` names declared
nowhere. Declaring them was the fix; what the declaration EXPOSED is this
round. Two of the three — `_TEST_OVERRIDE_FORMS_SS_ID` and
`_TEST_OVERRIDE_QA_SS_ID` — were read by `getFormsSS_` / `getQaSS_` and
assigned by nothing, so neither redirect could ever fire.

- **`_withTestForms_`.** Five integration tests (`publicForm_tokenLifecycle`,
  `publicForm_blankExpiryFailsClosed`, `cn_getFormSubmission_callerScoped`,
  `cn_managerGetFormSubmission_gatedAndScoped`, `scheduledCalls_flow`) were
  writing FormTokens / FormSubmissions rows to the LIVE forms store — which,
  when `FORMS_SS_ID` is unset, is the ADP/payroll spreadsheet itself. The
  tell was already in the tree: `cleanupTestData` carries a hard-kill backstop
  that sweeps those two tabs by the reserved `@example.invalid` domain, which
  exists because those tabs have no `TEST_`-prefixed column for the standard
  sweep and a 6-minute kill skips `finally`. The backstop STAYS — rows from
  earlier runs are still out there — but it is now belt and braces rather than
  the only thing standing between a killed run and orphaned PHI-class rows in
  the payroll sheet.
- **`_withTestQa_` + `qa_reviewFlowOnFixture`.** QA's dead branch was invisible
  for a different reason: every QA test in the suite asserts a REFUSAL, so the
  store was never reached. That is its own gap — the module had no coverage
  past its gates, and the next person to write an integration test would have
  written it against the live store while `getQaSS_` read as though isolation
  existed. The new test drives manual recording → comment → list → scorecard →
  soft-delete, and **asserts the isolation FIRST, before writing anything**: a
  wrapper that silently failed to redirect would append to the live QA store
  (where QaComments may name a patient) and every later assertion would pass
  identically. It is store-only by construction — a manual recording needs no
  Drive file — so it runs on a deployment with neither `QA_SS_ID` nor
  `QA_RECORDINGS_FOLDER_ID` configured.

**Wrapping idiom:** rename the body to `_test_X_body_` and add a one-line
`function test_X() { return _withTestForms_(_test_X_body_); }` (the
`test_kb_comments_flow` shape). Every wrapped body stays byte-identical, so the
diff is the wrapper and nothing else.

**The pin, and what bite-checking did to it.** `fixtures: every
_TEST_OVERRIDE_* a resolver reads is also ASSIGNED by a fixture` derives the
names from the `typeof … !== 'undefined'` guards in the server and requires
each to be assigned. It took two tightenings, both found by bite-check and
neither by reading:

1. `var X = null;` is itself an assignment, so the first version passed for a
   name nothing else touched — it needed a negative lookbehind on the
   declaration keywords.
2. Every fixture ends `finally { X = null; }`, so deleting the line that sets
   the REAL id STILL left a matching assignment. The bite-check reported NO
   BITE, which is the only reason this was found. The match now has to be an
   assignment to a VALUE.

Both are the g116 shape, in the pin written to prevent a g116-shaped bug. The
three bite-checks that pass now: the QA override unassigned, the FORMS override
unassigned, and the KB override reduced to its declaration plus its reset.

## 2026-09-16 — the operator round (SP · SP2 · PTO)

Three batches, 16 mutations / 16 bites; three new pure pins and three new DOM
pins (the live totals are CLAUDE.md's running-totals block, not this sentence).
What the harness added is below; what it CAUGHT is the more useful record.

**Three defects the pins caught before they shipped**, none of which reading
found:

1. **A regex whose trailing lookahead rejected only the delimiter.**
   `spanishVmDurationSec_` matched `Duration:\s*((?:\d{1,3}:){1,2}\d{1,2})(?!\s*:)`.
   Against `Duration: 00:00:00:01` that returned **0 seconds**: the seconds
   group backtracks to ONE digit, and the next character then being a *digit*
   satisfies a colon-only lookahead, so `00:00:0` matched. A malformed duration
   reading as zero would have SUPPRESSED the card — the one direction that
   feature must never fail in. The lookahead now rejects a following digit too.
   **The rule worth carrying: a fixed-width group plus a delimiter-only
   lookahead can always backtrack into a shorter, wronger match. Anchor on
   "not a digit AND not a delimiter", and drive the malformed case.**
   *(Considered for a gotcha entry and deliberately NOT given one: the Common
   Gotchas bar is "has bitten this project in production", and this never
   shipped. The lesson lives here instead.)*
2. **A shared helper declared in the wrong scope.** `mgrLeaveBalanceText_` was
   first nested inside `renderManagerView`, where `tcalDayTableHtml_` — a
   sibling, not a child — could not see it. PTO2 would have thrown on every
   calendar render.
3. **A DOM pin asserting against SKELETON cards.** The PTO pin's first version
   used `enterTool('timeClock','manager')`, which leaves `currentView='clock'`;
   `loadManagerDashboard` then skips the render behind its own guard, and
   `.emp-card` matches the loading skeleton, so `cards.length === 3` passed
   against placeholders. **The manager landing is the MANAGE tool's `manage`
   tab.** The selector now requires a real `.emp-name` child. It passed the
   count assert and failed the first real one — which is the only reason it
   was caught rather than shipping as a green pin over nothing.

**Harness additions.** `SP1/SP2 DOM` (resolve mutates STATE: the count and
header follow, a failed resolve keeps the row and clears the in-flight class,
and a re-render from the same state does not resurrect the card); `SP4 DOM`
(two suppression counts, separately toned, on the full list AND the empty one);
`SP4`/`SP5` pure pins (the duration parser right-to-left with every branch
driven, the fail-open verdict, the transcript extraction); `PTO1/PTO2 DOM`
(the balance on both surfaces, with the ABSENT cases as the load-bearing
assertions). The A5 toggle pin was updated in place for the chevron — it
asserts the ACCESSIBLE NAME now, because a `textContent` assertion would have
passed against an unnamed icon button.

**Two harness facts this round established.** `scripts/bite.sh` drives the
PURE harness only, so a DOM pin must be bite-checked by hand (mutate, run
`runDom.js`, grep for the ✗, restore). And jsdom does not run CSS animations,
so an `animationend` listener is never exercised there — the SP2 pin verifies
the TIMEOUT fallback, and says so rather than implying coverage it does not
have.

## 2026-09-16 — OOP pricing, the price picker, area eligibility, the store move

This round ADDED sixteen pure pins, four DOM pins and six editor registrations
(the live totals are CLAUDE.md's running-totals block, not here). Thirty-two
mutations bite-checked across it — 19 via `scripts/bite.sh`, 13 by hand on the
DOM harness, which `bite.sh` does not drive.

**What the harnesses gained.** Pure: the `oopQuoteLine_` behaviour pin; the
client↔server MIRROR pin, which loads BOTH `oopQuoteLine_` and
`cnOopQuoteLine_` into one vm context and drives them over a shared table
(including an em dash inside a NAME, so the separator cannot be inferred from
the data); `oopVerifyQuotes_` against a FAKE sheet installed per case, so every
refusal branch is reachable without a spreadsheet; the eligibility
parse/transform/verdict trio driven against the operator's REAL column values;
`locHeaderRole_` / `locRowKind_` / `locCityMatches_`; and the NAMED-TABS and
NO-SEED structural pins. DOM: three for the composer price picker, one for the
eligibility verdicts on both hosts, and one for the delivery-city line.

**SEVEN pins caught defects before the code shipped**, two of them in pins
written in the same batch — the compact-mode grid override without its viewport
twin (g50, in the very file that has been bitten by it, under a comment citing
g50), an input shipped with a placeholder and no accessible name, and the
`_withTestOop_` fixture that shipped with OOP-A and was never called by anything
(g04, and a worse instance than a CONFIG key because a fixture LOOKS like
coverage).

**SIX pins did not bite on first check, and the repairs are the lesson:**

1. **`deepStrictEqual` on a value out of the jsdom sandbox compares
   PROTOTYPES** and failed on an identical payload. Compared as JSON instead —
   g116 verbatim, in a harness that already carries g116's warning.
2. **A host-wide regex for "straight-line"** stayed green with the warehouse
   strip's caveat deleted, because those same words appear inside a
   near-boundary verdict's own reason. Anchored on the strip ELEMENT.
3. **The "could not place a warehouse" branch had no coverage at all** — the
   fixture placed every warehouse, so the branch was unreachable and deleting it
   bit nothing. The fixture now carries an unplaceable one.
4. **`locCityMatches_`'s blank-city guard** passed for the wrong reason: a blank
   query fails to equal any real name anyway, so the assertion was vacuous. The
   fixture now carries a NAMELESS row, which is what the guard exists for.
5. **The NO-SEED pin could not see a hard-coded seed.** All three of its
   assertions watched for the OLD shape of the defect — a Script Property, a
   `CONFIG.` fallback — and none would have caught a warehouse written straight
   into `getLocationAcceptance_`. It now asserts the registry is BUILT EMPTY.
6. **The unreadable-registry render had no assertion behind it**, so deleting it
   bit nothing while on screen every radius rule would read "cannot tell" with
   the items still rendering around it.

Items 2–6 share a shape worth naming: **a pin written from the code rather than
from the failure tends to assert what the code DOES, not what would be wrong if
it stopped.** Four of the five were only found because the bite-check is a
separate step from writing the pin.

**One thing no pin caught, found by re-reading:** a comment claiming the
radius-first ordering in `oopEligibilityParse_` is what stops a state code inside
a radius phrase parsing as a state rule. It was wrong about today's code — the
whole-value-is-codes rule already rejects it. The ordering is defence against a
plausible future relaxation, and the comment now says that. An overclaiming
comment is worse than none: the next reader trusts it and removes the thing that
is actually load-bearing.

## 2026-09-16 (late) — OOP-C, and five pins that agreed with the bug

Added five pure pins; the round's live totals are CLAUDE.md's running-totals
block. Eleven mutations bite-checked, but only AFTER five repairs — and the
repairs are the entry, because they share one shape.

**The fixture agreed with the assumption it was supposed to test.** The OOP
fixture had `Item` in column A, which is exactly the layout that let "column A
is the item name" survive OOP-A and OOP-B unchallenged. The operator's real
sheet has `HCPCS` there. **A fixture built from the same belief as the code
cannot falsify it** — it is not coverage, it is a second copy of the assumption.
The fixture now mirrors the operator's real header row, and the editor tests
search by name AND by code.

**Four more pins could not see their own subject:**

1. The `Image` drop was unobservable because the fixture's Image cell was
   BLANK — an empty cell is filtered by the blank guard whether or not the
   `image` role exists. Now a real Drive URL, plus an assertion that the URL
   reaches no field at all.
2. The code half of the search was covered ONLY by an editor test this
   container cannot run, so deleting the code lookup left the pure harness
   green. `searchOopPricing` is now driven against a fake sheet.
3. The diagnostics' name-column report had no pure pin whatsoever — and that
   report IS the fix for the panel reading `missing: []` while every lookup
   returned nothing.
4. **The client↔server mirror table drove three arguments when the label is the
   fourth.** That is g120's failure mode with a new field: if the two sides
   disagree about the label, every multi-price OOP send refuses with a message
   the rep cannot satisfy. The table now carries the operator's real labels
   verbatim — including the slash and parenthesis a "tidy this up" edit would
   touch — plus an assertion that the label reaches the line, so the new rows
   are not vacuous.

**Two harness-side mistakes worth recording**, both the same shape and both
caught only because the harness went red immediately: replacing a test block by
slicing from "this test" to "the next test" DELETED the `vm.runInContext` loader
lines that sat between them — once taking out every ELIG and OOP-B pin, once the
ELIG function loaders. **The region between two tests is not empty**; anchor a
block replacement on the block, not on its neighbours.

And one mechanical one, outside the harness: a branch whose PR had merged was
recreated by `git push` from the stale pre-merge tip, silently diverging from
`main`. GitHub deletes the branch at merge; a push recreates it wherever the
local ref happens to point. Restart from `origin/main` after a merge — it is now
a Decisions entry in STATE.md rather than something to rediscover.

## 2026-09-17 — the cycle-20 /broad-scan, Batches 1 and 2, and two Dashboard error scenarios

Pure +6, DOM +5, visual +2, one smoke registration; the live totals are
CLAUDE.md's running-totals block. Fifteen mutations bite-checked, fifteen bite
(eleven through `scripts/bite.sh`, four DOM by hand). Three things worth
recording.

**The pin that would have caught the High never ran.** Batch 1's F-01 (the
send-time price verifier keyed column A) had an editor pin against the
real-shape fixture that would have FAILED — but it is an integration test, the
2026-09-17 deploy ran smoke, and the walk recorded green (g116's third
direction). The Node twin could not see it either: its fake sheet had `Item`
in column A. The OOP-B grid now carries the operator's shape with a guard that
the item is never in A, and the F-04 pin forbids a position-0 read in any of
the four OopPricing readers.

**`bite.sh` refuses a mutation with a double quote — quote the JS with regex
instead.** Six Batch 2 bites were silently skipped on the first pass because
the mutation strings quoted JavaScript string literals (`'…'` inside `"…"`),
which the helper refuses by design. Rewriting each as `re.sub(r'…', …, s,
count=1)` with `.` for the quote characters (and `chr(39)` in a lambda when the
replacement needs one) got every bite through. A refused bite prints REFUSING
and exits 2; a loop that only greps for BITES reads that as silence — grep for
`BITE|REFUS|FAILED`.

**jsdom under `runScripts: 'outside-only'` never executes inline `onclick`
attributes.** The first F-02 DOM pin clicked the modal's Close button and
asserted it closed; it did not, because the handler never ran. The pin now
asserts the button's WIRING (`onclick` routes through `closeOverlay`) and
exercises the same path via `closeOverlay` and the document Escape handler.
Any DOM pin that clicks an inline-handler button is testing nothing.

**Visual:** `clock-dash-error-light-wide` (`?failrpc=getDashboardMetrics`) and
`clock-coverage-error-light-wide` (`?failrpc=getMyMetrics`) put Batch 2's two
Dashboard warn states on camera; both rendered clean on the first shoot.

## 2026-09-18 — Batch 3 of the cycle-20 scan, and one editor test that had never run

**Pure harness — seven pins (see the running-totals block for the count):**
`F-07` drives the two tone vocabularies (`mPctClass_` → `m-pct-*`,
`dashPctTone_` → good/warn/crit) over nine (value, target, band) triples and
asserts they AGREE, then the null-band and Transfer % branches and both
delegations to `mtAnswerBand_`; `F-08` renders every `standardSource` string,
the warn/muted split, both heroes' call sites, and bans `threshold || \d`
over the Metrics partial (H2-4's ban named `alertThreshold` and missed the
tooltip); `F-08/F-09 server` runs `cdrStandardProbe_` and `cdrHolidayProbe_`
in a vm through sheet / no-row / empty / unavailable / throw and pins the
reachable-only gate in `getStorageHealth` — cross-context objects are compared
by `JSON.stringify`, not `deepStrictEqual` (a vm context's `Object` is not the
harness's, so a shape-equal object fails the prototype check — the g116
class); `F-08/F-09 client` drives `cnHealthFindings_` through every source for
both findings and asserts an older payload raises neither; `F-35` executes
`getMetricsAmbient` in a vm with stubbed roster / cache / standard / CDR
reader and asserts the DATE it asks for — Monday asks Friday, a Friday holiday
steps to Thursday — the first behavioural pin on that function (H2-4's was
structural); `F-32` pins null from the formula, the team aggregate, both
heroes, the cell, the two averages and the editor smoke; `F-38` bans "US
holiday" / "Federal observance" in the two tc partials (comments stripped
first). H2-1 now expects null for nothing-to-divide; H2-4's Clock-card regex
follows the delegation; the stale "mid band floor stays 50" message in the #4
pin is replaced by the rule it now asserts.

**Bite-checks:** ten mutations, ten bites — incl. the two that matter most:
`mtAnswerBand_` null → 5 (the old card behaviour) and the `unavailable`
message rewritten to say "not set" (the g128 split).

**Fixtures (INV-185):** the three Metrics fixtures carry `standardSource:
'sheet'`; the Storage Health fixture's CDR row carries both probe shapes in the
all-clear state, so the System tab still reaches "Nothing needs attention" and
the passing-check count rises by two.

**Editor suite:** `test_cdrAnswerPct_isTheDashboardFormula` expects null for
`(0, 0)`; `/test-sync` found `test_teamBenchmark_subtractsPublishedExcludes`
expecting 85.7 where `cdrAnswerPct_` has rounded to a whole percent since H2
(run.js H2-2 expected 86 all along) — an editor test that was red as written
and had never run, because the integration tier has never run against the
deployed project (cycle 19 step 8). The pure harness now pins the editor
assertion's text too.

**Visual:** the `metrics` and `admin-system` scenarios were re-shot (0 missing,
0 overflow); the two WARN states of the new CDR findings are pinned but not on
camera — a `?fixture=` variant of `admin-system` is the follow-on.

## 2026-09-18 (later) — Batch 4 of the cycle-20 scan, and a bite that hit the wrong function

**Pure harness — five pins (see the running-totals block for the count):**
`F-20` pins the three `DIGEST_STALE_HOURS` windows, the heartbeat's PLACEMENT
(index arithmetic: missed-punch after the read and before the early return;
the digest's after `if (!report) return`), both digest stamps, then DRIVES
`sendAutomationHealthDigest` in a vm through a throwing and a clean report
(stamp / no heartbeat vs heartbeat + clear + no mail) and `automationProblems_`
with an untabled and a tabled stamp (each reported exactly once), and asserts
the client finding shows the stamp's `message`; `F-19` drives
`accrualEarnedByMonth_` on two 5-hour months (0.02 + 0.02 = 0.04 where the
once-rounded 10 h says 0.05), `accrualMonthRows_`'s split with emp/plan
carried, and round-trips a per-month credit note and a per-month zero note
through the unchanged builders to single-month keys; `F-46` drives
`creditMonthlyPtoAccruals` through both early returns with a stubbed lock,
flag and planner (stamp reason + window, error cleared, lock released,
`stampAutomationError_` a throwing stub so an accidental failure stamp fails
the pin); `F-21 / F-22` reads `cleanupTestData` for the MANAGER_EMAILS strip
form, both by-key sweeps on the right store, no provisioning, and sweeps
`Tests.js` for any surviving positional delete and every DeptRequests probe
row's `TEST_DR_` key; `F-49` is structural plus a fresh-deployment run APPENDED
to the calendar's behavioural pin (the by-name tab returns null, the
provisioner serves an empty tab, the calendar renders). Five existing pins
repointed; the F5 coupling pin, which read only the detail panel's
`DIGEST_LABELS`, made the miss visible when the first edit updated only
`CN_DIGEST_LABELS_`.

**Bite-checks:** twelve mutations, twelve bites — after one lesson. The
un-anchored F-49 mutation ("read the time-off tab by name again") matched a
two-line shape `getTeamCalendar` shares with an unrelated function 700 lines
earlier, changed THAT function, and `bite.sh` reported NO BITE — a true verdict
about the wrong code. A `git diff` showed it; anchoring the regex on
`getTeamCalendar`'s own `monthIso` filter made both F-49 pins bite. g116's
fourth direction; a `--fn` span guard for `bite.sh` is the follow-on.

**Fixtures (INV-185):** both Automation Health fixtures carry the three new
heartbeats fresh, so the all-clear System scenario still reaches "Nothing
needs attention".

**Editor suite:** four tests changed their tidy-up (by key through
`_cleanupRowsByPrefix`), none its assertions; `cleanupTestData` gained the
MANAGER_EMAILS strip and the DeptRequests + ClientErrors sweeps. Registrations
unchanged.

## 2026-09-18 (later still) — Batch 5 of the cycle-20 scan, and two harness lessons

**Pure harness — seven pins (see the running-totals block for the count):**
`F-16` drives the pure `qaRowIsMine_` through six shapes (id wins, a
non-matching id is refused even under my own name, a legacy row under a unique
name, a legacy row under a SHARED name, unattributed, no caller name) and
`qaRosterIdsForName_` over a roster carrying a duplicate and an offboarded row;
`F-10` drives `applyTagTransformAcrossReps_` in a vm whose `getCallNotesSheet_`
THROWS for one rep of three, so the skip list is measured rather than read;
`F-11` checks the probe's fallback + recommendation, that no server comment
still says "PHI-free", the storage map, both fixtures, and drives
`cnHealthFindings_` to confirm the unset store is a WARNING (not the
no-fallback ok); `F-17` bans the `onclick` literal, pins both `data-*` forms
and the single delegated listener, and asserts the `esc()` round trip on a name
carrying both quote kinds; `F-24` pins the refusal BEFORE the mismatch check
(by index), that the conditional gate is gone, both `warning` returns and the
client copy; `F-23` drives six eligibility values; `F-27` compares the three
server banks and the notes pair against the client's BY VALUE, then drives the
server's PPD and PMD/PAP walks (first header, an answered question, the
indent-derived secondary 31a, an unanswered blank, the notes tail, 49
non-header rows, numeric vs string keys, the 1-based secondary rows) and
asserts no preview or send path reads `payload.rows`.

**Two lessons, both about the harness rather than the code.** (1) Arrays
evaluated in two vm realms are never `deepStrictEqual` — the prototypes differ
— so the F-27 bank mirror compares `JSON.parse(JSON.stringify(...))` on both
sides; the same rule the R-reconcile pin learned about `months.join(',')`
(g116). (2) The GATE-SHAPE pin follows the FIRST `return helper_(` inside an
endpoint as a DELEGATING wrapper; F-27's first draft put a `return` inside a
`.map()` callback in `intakeSendPPD` and the pin resolved the callback's
helper as the delegate and failed on it. Hoisting the callback's result into a
local fixed it, and the pin's regex would be better anchored on a top-level
return.

**Bite-checks:** twelve mutations, twelve bites — including the three that
matter most for a PHI-adjacent boundary (an id that is not mine falling
through to the name; a legacy row ignoring name uniqueness; an ambiguous name
resolving to the first roster row) and the server bank drifting by one word.

**Fixtures (INV-185):** both Storage Health fixtures and the deploy-readiness
fixture carry the Dept Requests row; the default Admin System shot gains a
fourth "Needs attention" item (the unset store), which is the finding, and the
all-clear fixture stays clear. `admin-system` and `qa` re-shot: 0 missing, 0
overflow.

## 2026-09-18 (last) — Batch 6 of the cycle-20 scan, and the shot that caught what the pins could not

**Pure harness — eight pins (see the running-totals block for the count):** the
one worth describing is `F-14`'s, which is a BUDGET rather than a match: it
counts `location.reload()` across `script_core` (exactly two, both inside
`reloadApp_`'s documented fallbacks) and asserts ZERO across eight view
partials, so a new call site is red the day it lands. `F-40/F-30` sweeps six
overlays for four properties each (opens through `ensureOverlay`, closes
through `closeOverlay`, no bare `classList` open, no bare `classList` close)
plus the `hover-mode` carry. `F-12` is behavioural: it drives
`cnRenderAdminAugmentHtml_` with the admin's OWN counts present and asserts
they reach no cell, then walks the complete / partial / unreadable / null /
real-zero states. `F-29` is a regex SWEEP for any `<input>` carrying two
`aria-label` attributes rather than a check of the one that was wrong. `F-43`
pins the ABSENCE of `aria-modal` — the drawer does not trap focus, and a pin
that only demanded a role would have invited the lie. `F-36` pins ORDER (the
link is in the DOM before the blockable call) and `F-42`/`F-28` are
straightforward attribute and copy pins. One existing pin repointed: the D1
modal-ordering pin followed `classList.remove('open')`, which no longer exists
in that path, and `indexOf` returning −1 made the comparison silently false —
it follows `closeOverlay` now.

**The lesson of the batch is that the VISUAL matrix caught what eight pins
could not.** Every pin passed and `admin-light-wide` photographed the new KPI
strip's first cell as an em dash: the server has always returned
`getCallNotesTagTaxonomy.totalNotes`, and the visual fixture had never carried
it, so the cell rendered its honest "absent" branch. Nothing in the pure
harness could see it — the pin drove the function with a fixture of its own —
and nothing in the fixture was WRONG in a way a shape check would catch; it was
simply less than the server returns. INV-185's rule ("a fixture mirrors the
real contract") is now pinned for this field too. It is the third time a shoot
has found a fixture gap that a pin could not, and the second where the gap
rendered as a plausible-looking state rather than a crash.

**Bite-checks:** thirteen mutations, thirteen bites, anchored per the g116
fourth-direction rule (each names something only the pinned code contains).
Two are worth keeping: reverting the `hover-mode` carry (the trap g134
describes), and adding `aria-modal` to the drawer (the honesty assertion — a
pin that only checked for a role would have gone green).

**Companion harness:** `a11y-names.mjs` re-run over all twelve surfaces
including the three public forms — `unnamed 0` everywhere, with the shortcuts
close button and the five accordion toggles newly in scope. The `admin`,
`clock` and `reference` scenario groups were re-shot: 0 missing, 0 overflow.

## 2026-09-18 (final) — Batch 7 of the cycle-20 scan: the batch about the pins themselves

The last batch in the scan's plan, and the only one whose subject was the test
layer. Three pins were RETIRED and replaced rather than supplemented, three
bite-checks reported NO BITE and each was a different kind of problem, and two
fixtures turned out to have been photographing defects for weeks.

**Three structural pins became drives, and the originals were deleted (F-52).**
Each had been named for a behaviour and asserted a source shape, and each stayed
green under a mutation that broke the thing its name promised.

- `archiveSheetRowsOlderThan_` runs against a fake source sheet and a fake
  archive sheet. The bound really stops the scan; a second run drains the NEXT
  batch rather than re-appending the one before it (the monotonic-drain property
  the bound exists for); an unbounded run takes every eligible row and only
  those; a slack bound is not a truncation; a tab with nothing eligible appends
  nothing and flushes nothing. The fake archive REFUSES a zero-row `setValues`,
  because Sheets does — see the bite-check note below.
- `getDepartmentEmails_` and `saveDepartmentEmails` run against a fake
  PropertiesService. An array, a number, a blank, a bare name and a
  whitespace-only key are each dropped entry-wise; an all-junk map falls back
  whole rather than to `{}`; names and emails are trimmed; and not one refusal
  on the write path reaches the property.
- `clientBuildHash_` runs against a fake HtmlService plus a fake CacheService
  that hands back SIGNED bytes, as Apps Script does. The hash moves when a
  partial's bytes move, moves when index.html moves, is stable when nothing
  does, and a lost partial is a different build. A warm cache is served and not
  re-put, and a planted cache value wins — so the read is real rather than
  decorative.

The fourth pin, the width-cap one, stayed structural and now says why: it is an
ABSENCE assertion with no function to call, and it cannot see a cap arrive by
another route, which is how the cap arrived the first time. It asserts the
measured visual scenarios that carry the real claim still exist, so nobody
deletes the measurement and leaves the grep behind.

**Three NO BITEs, three different lessons.** The bite-checker was right every
time; what it was right ABOUT differed.

1. Deleting the mover's `if (!toMoveRows.length) return 0;` guard reported NO
   BITE because the fake archive accepted a zero-row range that real Sheets
   refuses. A fixture kinder than production let a mover that appends an empty
   block read as correct here while it would throw on the first nightly run with
   nothing eligible. The fake asserts the range has at least one row now.
2. Collapsing every missing-partial marker to one constant reported NO BITE
   because the assertion varied the FILENAME inside index.html to produce its
   two cases — so the digest input differed whatever the marker did. Holding
   index.html fixed and removing the partials from the fixture instead isolated
   it.
3. After that isolation, the same mutation STILL reported NO BITE, and the third
   reading was the right one: the claim is not observable. The markers sit at
   different positions in the concatenation, so two broken builds digest
   differently even with every marker collapsed. Naming the lost file is a
   property of the log string, not of the fingerprint. The assertion was
   DELETED with the reasoning left in place rather than dressed up into
   something that looks like a check. This is g116's fifth direction and the
   substance of g138.

A fourth NO BITE was not a problem at all: rewriting the client's
`Math.floor((daysDiff + 13) / 14)` as `Math.ceil(daysDiff / 14)` is an
equivalent expression for every integer, verified over the range rather than
assumed, and the follow-up mutation with a genuinely different index bit.

**Two fixtures had been photographing defects.** `test/visual/mock.js`'s
`recentHours` could not produce a null day, so no screenshot could ever show the
sparkline's third state; it ships one now. Worse, the Spanish stats fixture said
`pending: 3` directly above a pending list of four cards, and every Spanish
screenshot for a month showed the two disagreeing with nobody reading it as a
bug. It agrees with itself now, and a pin requires it to: the stats count must
equal the number of cards the list fixture renders. Both are INV-185 — the
fixture has to be able to produce the state the pin claims, and it has to
satisfy the arithmetic a reader would do by eye.

**Two derived walks replaced hand lists.** The gate-tier check walks every
server function and compares the doc comment ENDING immediately above the
declaration against the refusal literal in the body — the first version took
the nearest comment behind the declaration, which resolves to the previous
function's and reports a phantom. The gate counts re-derive all three families
independently of `counts.mjs` and require the generated block to agree with both
derivations. Together they found ten mislabelled endpoints the scan finding had
never named.

**The rest of the batch's pins.** The linter's advanced-service derivation is
driven over manifests the repo does not have; the CDR cache-bypass boolean is
evaluated under three override states and `cdrRosterHash_` is driven to show one
extra name really is a different key; `cdrQueueInventory_` is driven end to end
against a fake sheet for three window shapes; `spanishVmFold_` is driven for the
unconfigured fold, suppression, resolution and the already-seen skip; and the
timesheet mirror is driven on BOTH sides over 70 consecutive days spanning three
period boundaries.

## 2026-09-18 (after the merge) — the first full editor run, and the tool that was lying about it

The operator ran `runAllTestsPartA` and `runAllTestsPartB` against the deployed
project. Part A was clean. Part B reported one failure out of 122, and the
expected-registration line matched, so the suite itself was intact.

**The failure was real and the production code was not at fault.**
`accrualReconcile_topsUpLateData` expected one rep topped up and got zero. The
reconcile compares a month's hours now against what the ledger says was already
paid for, and `readAccrualLedger_` keeps the HIGHEST hours per (employee,
month). `test_previewPtoAccrual_predictsTheCredit` runs earlier in Part B,
credits the same test employee for the same month off an eight-hour day, and
clears only the Timesheet in its `finally`. The AuditLog is append-only and
`cleanupTestData` sweeps it at the end of the suite, so the reconcile test wrote
its own zero-hour row into a ledger that already held the sibling's eight, and
the delta came out zero.

The asymmetry worth remembering: the same test's other assertions read
`_findLatestAuditNote`, which takes the most recent row and therefore saw this
test's own work. Only the ledger takes the maximum. A test can be reading its
own output in one assertion and a sibling's in the next, and nothing about the
failure message says which.

The fix is `_clearTestState(_TEST_INDIA_ID)` before the test reads any baseline,
which is precisely what that helper's own comment says it is for. The
alternative considered was moving the test onto the Philippines test employee;
clearing won because it survives reordering and any future third accrual test.
The pay-cycle difference between the two test identities turned out to be
irrelevant — the accrual path never reads pay cycle. A new pin requires any test
asserting on `toppedUp` / `shortfalls` / `topUpDays` to clear its rep before the
first credit.

**The bite-checker was wrong twice about that fix, in the same way, and it is
now the tool's problem rather than the reader's.** The first two bite attempts
both reported NO BITE. Both had landed: the mutation
`_clearTestState(_TEST_INDIA_ID);` matched the first of TWENTY-FOUR identical
call sites and edited `test_getTodayPunches_sortsOutOfOrderBackfill`, a true
verdict about code that was never under test. That is g116's fourth direction,
and it had already fired once in Batch 4 on `getTeamCalendar`. Two instances in
two sessions is a tooling defect, not a discipline problem.

`scripts/bite.sh` now takes `--fn <function>`. It resolves that function's span
by brace-matching from its declaration, applies the mutation inside it, and
splices the result back; a name that is missing, ambiguous or malformed is
refused rather than guessed. And on a NO BITE it prints the real diff before
restoring the file, because the file is gone a moment later and checking by hand
is then too late. On the case that fired, the printed hunk header names
`test_getTodayPunches_sortsOutOfOrderBackfill` outright, which is the whole
diagnosis in one line.

Six branches were verified by direct execution rather than by a pin, because
bash reads `bite.sh` as it runs and it cannot bite itself: the scoped hit, a
missing name, an ambiguous name, a malformed name, the unscoped fallback, and
the diff output. The pin assertion added to `F1-followon` is structural and says
so, in the posture Batch 7 set for the width-cap pin.

**What this run is really evidence of.** The failing test was written on
2026-09-15, reasoned about carefully, and never executed until three days later.
The integration tier had never run against the deployed project, which is the
same gap that let F-01's red pin count as green. One run, one real find, and the
find was in the tests rather than the product. That is the outcome a first run
should have.

---

## 2026-09-18 — batch R, the Reference two-panel restructure

**Five pure pins (R-1..R-5) and six DOM pins** — the three-price drive, the
degraded path, item-alone, the band, the labels, and R-6. Two existing pins
(ELIG client, OOP-A DOM) were rewritten for the merged panel rather than added
to. Every new pin bite-checked; the two NO BITEs are the point of this entry.

**R-1 derives its field list rather than listing it.** It reads `oopRowObj_`'s
own `const out = {…}` literal and requires each field to appear as `o.<field>`
in `checkOopEligibility`. A hand-written list would have been a second copy of
the contract that drifts the first time a column is added — which is the exact
failure the pin exists to prevent. It carries a `fields.length >= 5` sanity
assert, because a derivation that matches nothing makes every assertion below
it vacuously true (g116).

**NO BITE #1 — a structural pin cannot see a truncated loop.** R-2 is named for
the one-renderer rule and asserts `m.prices` is read and labelled past one
entry. Truncating the map to `[prices[0]]` — the literal defect the batch
exists to fix — left both regexes green. The R DOM eligibility pin goes red on
that mutation, so the net is real, but R-2 now carries a NOTE saying which half
it holds. The general shape: a regex over source can pin that the right DATA is
reached and not that all of it is USED. g138 said a pin whose name promises a
behaviour must drive it; this is the narrower corollary — when a structural pin
and a behavioural pin split a claim, the structural one should say where its
half ends, or the next reader assumes it covers more than it does.

**NO BITE #2 — a guard nothing drives cannot bite.** Removing the item guard
from `oopLookupInput_`'s FAILURE handler changed nothing, while the identical
removal on the success branch bit immediately. The cause was not the pin: the
DOM fixture returned a structured `{error}` for every eligibility call, so the
thrown-RPC channel had no coverage at all. `run.clearResponder` +
`run.flushFailure` now drive it, and the guard bites. Two guards need two
pieces of evidence, and a NO BITE that is confined to one of a pair of
symmetric branches is a coverage report, not a pin report.

**R-6 found its own defect, which is the argument for writing it.** It drives
`kbRenderLanding_` with every manager block seeded — deliberately including the
partial-read branches (`items` present AND a count source unavailable) that a
happy-path fixture never enters — and requires every direct child of `.kb-land`
to be a `.kb-land-sec` or the `.kb-lookups` band. It went red on first run: the
review-due partial-read warning was emitted after its section closed, so it had
always been a direct child of the landing. It rendered correctly for months
only because `.kb-land` and `.kb-land-sec` were both 760px — widening the
landing for the band separated the two measures and would have rendered that
one warning at full band width. Nothing could have caught it before, because
until the band there was no observable difference between being inside the
section and merely sharing its width.

**g65 fired a fifth time, on a hand-rolled bite.** `scripts/bite.sh` refuses a
dirty file precisely because it ends in `git checkout`. A one-off shell helper
written inline for the DOM harness (which `bite.sh` does not drive) had no such
guard, and its restore discarded the uncommitted R-6 fix; the next run's red
was read as a bite before the cause was traced. The fix is procedural and
already in the tool for the pure harness: commit first, then bite. Worth
extending `bite.sh` to run the DOM harness so there is no reason to hand-roll
one — noted, not done.

---

## 2026-09-18 — batch S, the seams round (F1–F5)

**Five pins added or rewritten, eleven bite-checks, all BITE.** No `web-app/`
file changed: this batch is entirely test surface.

**The two-sided net shape, and the derivation that must NOT be built.** F1's
obvious fix was to derive the guarded coerced-column set from the code —
"whatever columns a recovery helper is applied to". That is self-defeating:
delete the last `cnDateLocalString_(row[CN.DATE_LOCAL])` call and the column
leaves the derived set at the same moment the raw read appears, so the net goes
quiet exactly when the defect lands. The shape that works is the one the CN
boundary already used: an EXPLICIT list (which keeps a column guarded whatever
the code does) plus a DERIVED assertion running the other way (every column a
recovery helper touches must be in that list). The list was hoisted to one
place both scans read, so the two can no longer drift apart from each other
either. Bite-checked four ways, including the one that proves the property:
shrinking the list fails the derived half rather than silently narrowing cover.

**`serverCallersOf()` (harness.js), and why it is applied to exactly one pin.**
It derives the set of server declarations calling a marker, for the
enumerated-reader pins whose lists mean "every caller". It is deliberately not
retrofitted: some of those pins BAN their marker, and some guard a narrow set
on purpose, so a blind sweep over all of them over-reports. Measured — a naive
completeness assert flagged thirteen contracts and most were false. The one pin
that needed it (H-1, coaching's parser boundary) was the one with no
global-scan sibling.

**An exemption written as a fact, not a convenience.** H-1 bans
`parseTimestampMs_` in coaching consumers, and `automationDetectorChecks_`
calls it — because it is the runtime self-check that drives BOTH parsers to
prove each still works. Listing it would fail the ban; dropping it from the
derivation silently would hide a real consumer if it ever became one. It is
named in an `EXEMPT` array with the reason beside it, so both facts stay visible.

**Two audit corrections, both the same direction.** The audit that produced
these findings over-reported twice, and the implementation block carries both.
F2 was one real gap of six, not six: five lists were correct as written and
readable as correct because someone had written down what each was for (see
g116's sixth direction). F5's count of entries carrying no `Verify:`
clause was nearly double the real one — most of the difference names its
verification as "Pinned by …", a named tripwire, or a `test_` function, which a
`Verify:`-only scan cannot see. That correction improved the outcome: no
backfill was needed, and the ratchet floor went to INV-139 rather than the
planned INV-213, covering close to three times the span. The three clauses the
plan budgeted for were already written, in the other phrasing.

**The ratchet accepts the phrasings already in use.** Requiring the literal
`Verify:` would have forced a rewrite of 74 entries that already say where
their proof lives — churn, not rigour. Deliberately-vacant numbers
(INV-163/164, claimed by a reflection whose proposals were lost and left
unreused so the metrics note stays traceable) are exempt by shape, not by name.

## T1–T5, the between-cycles Reference round (2026-09-21)

**`scripts/bite.sh --dom`.** Bite-checking a DOM pin used to mean hand-rolling
the mutate → run → `git checkout` loop in a shell one-liner. The one time that
was done, the hand-rolled version had no dirty-file guard and discarded an
uncommitted fix — g65's FIFTH firing, logged then as a follow-on rather than
fixed. `--dom` picks the harness; every guard the tool already had (dirty file,
double quotes in the mutation, the no-op check, `--fn` scoping, the diff on a
NO BITE, the herestring instead of a pipe) now covers both, and the verdict
names which harness ran so a NO BITE cannot be read against the wrong one.
Twenty-one of this round's thirty-two bite-checks were DOM ones.

**Two jsdom limits these pins had to state around, rather than assert through.**
Both matter because the alternative is a pin that asserts the harness:

- **Inline `onclick` attributes are not evaluated.** `el.click()` does not run
  them, so a pin cannot open the term popover by clicking its button. The pins
  assert the wiring (`getAttribute('onclick')`) and then drive the handler
  directly — two assertions where one would have looked sufficient and proved
  nothing. The T4 keyboard pin does the same for Enter: it spies on the primary
  control's `click`, and says in the comment that what the disclosure DOES when
  clicked is the T2 pins' business.
- **`navigator.clipboard` is read-only.** Stubbing it needs
  `Object.defineProperty(..., { configurable: true, writable: true })`; a plain
  assignment throws.

**Three NO BITEs in T4, and every one was a real gap.** The pattern in all
three is the same and worth naming: *the pin READ the source where it should
have DRIVEN the function.*

1. `eligVerdictsAgree_` — the pin asserted the source mentions `.why`, so a
   mutation making the why-comparison compare verdicts sailed through. No
   fixture anywhere had two verdicts matching on verdict and `near` but
   differing in REASON, which is a real case (insurance yes because the address
   is inside the radius, out of pocket yes because the state limit does not
   apply) and collapsing it would print one reason as covering both.
2. The scalar price fallback — same shape. Asserting `m.price` appears in the
   source left a mutation that made the branch unreachable green, because
   nothing ever put a scalar-only payload through it. That payload is what an
   older deployment answers a newer client with, i.e. what every already-open
   tab gets during a New Version deploy.
3. `oopPriceHtml_`'s `idx == null` guard could not be made to fail at all — its
   one caller always passes an index. Dead defensive code, DELETED rather than
   dressed up (g138), with the refusal path that already covered it left to do
   the job.

**A NO BITE in T3 that was NOT a gap, and what was done about it anyway.** The
client's `certain` guard in `oopPayorRulesFor_` could not be made to fail,
because `hcpcsParse_` structurally cannot emit tokens without certainty. That
made it untested defence — unreachable defence is not the same as safe
defence — so the pin now hands the client a payload the server *cannot*
produce (`certain: false` WITH matching tokens) and asserts it still refuses.

**The hand-list that was wrong before it was written.** T5's survey of copy
call sites said five, from a note made one batch earlier; a grep found SEVEN.
So the T5 pin sweeps every partial for `navigator.clipboard` /
`execCommand('copy')` and exempts by NAME with the reason beside each, rather
than listing the callers. This is g116's sixth direction turning up in the same
session that documented it.

**Fixtures that carry one of each.** The ELIG DOM fixture already held one
disagreeing verdict pair among three agreeing ones, which is why T4's collapse
could be pinned on both branches without inventing data. The T3 payor fixture
was built the same way on purpose: one code that names an item, one the pricing
tab lacks, one two rows carry, the shorthand, and a column that is not a code —
every branch of `insCodeItemHtml_` in one result, so a pin over it is never
accidentally exercising only the easy one.

**What the numbers could not see, three times.** Every visual scenario in this
round reported 0px overflow and no console errors while showing something
wrong: the payor cross-reference squeezing a long payor name's rule into a
twice-wrapped column; the manual-copy failover's close button stacked below its
title because `.modal-head` had no CSS rule at all; and that failover's field
scrolled to its END, so the rep saw the tail of a price line instead of the
price. All three were found by READING the shot.

## T6 — the unstyled-class ratchet (2026-09-21)

**The pin passed its first run while checking almost nothing, and a bite-check
is the only reason anyone knows.** The hook derivation counted any plain quoted
word as a selector — correct for `classList.add('foo')`, and catastrophic in an
app that builds its markup in JS, where every `class="a b"` is itself a quoted
string. ~3,500 tokens were harvested as "hooks", i.e. nearly every class in the
app. `.mono` — fifteen elements with no rule — went straight through.

**The non-vacuity check passed BECAUSE of the bug.** It asked whether `modal`
was a hook. It was, for entirely the wrong reason. That is g116's first
direction inside a pin written three batches after that gotcha was last
extended, and it is worth stating plainly: *a non-vacuity check that the defect
also satisfies is not a non-vacuity check.*

The replacement DRIVES the extractor over a synthetic snippet whose only
content is a class attribute, and asserts nothing is harvested from it. Plus a
band check — more hooks than defined classes means over-capture has returned.

**Numbers from the measurement, because the plan had guessed them wrong.**
1,871 classes defined, 1,645 literal tokens used, 118 used-but-never-defined.
Two derivations take that to 33. I had told the operator a naive sweep "would
over-report badly"; it does not, and the claim was retracted.

**Three of the candidates are correct as-is, and a sweep that called them
defects would have you adding empty rules.** `.mh-emp` is the left default
beside a centred `.mh-num` and a right-aligned `.mh-cov`; `.qa-det-right` is
the plain column beside a sticky `.qa-det-left`; `.cn-ob-chip` is ALREADY
muted, so `.is-mut` is the default that `.is-ok` and `.is-warn` override. The
shape recurs: **the default member of a styled set needs its class precisely to
be what the others are distinguished from.**

**Known limits, both erring permissive** — the safe direction for a ratchet, and
recorded so the next reader does not mistake them for coverage: an EMPTY rule
satisfies the pin (deleting a rule's declarations does not bite; renaming its
selector does), and a class defined only as a descendant (`.kb-ins-cell .v`)
counts as globally defined.

## T7–T9 — the eligibility rules and the operator's answers (2026-09-22)

**Two NO BITEs, both real, both mine.** Each was a claim the code did not make.
- A comment said the any-warehouse test ran *first* to stop a name match
  "silently narrowing a broad rule". Mutating the order left the pin green —
  because the returns key off the flag, so order never mattered (g138). The
  comment was rewritten to say what is true, and chasing it found the real
  defect underneath: the warehouse-name match was a bare SUBSTRING, so a site
  called `Ware` matched inside the word "warehouse".
- The T8 panel pin called the RENDERER with an error and asserted the markup.
  Deleting the LOADER's failure branch left it green: it proved the renderer can
  draw an error, not that a failed read produces one. It now makes the RPC throw
  (a responder that throws routes to the failure handler in `boot.js`) and
  drives the real path.

**A fixture the server can no longer produce tests nothing.** T9 made
`hcpcsParse_` read `K0821/23/16`. Three pure pins and two DOM fixtures had used
exactly that string as their canonical UNCERTAIN code — so after T9 they stubbed
a payload the server would never send. Each now uses a range (`K0800-K0803`),
which the server still refuses, so the refusal path is still driven. Category A
(the rule changed deliberately); no assertion was weakened.

**Driving the new engine before pinning it paid for itself.** A scratch vm
harness over the real `oopEligibilityParse_` / `oopEligibilityCheck_` showed the
operator's `100 miles of any warehouse` reading `unknown` under the old grammar
BEFORE T7b was built — which is how the advice to write `…of Dallas warehouse,
or listed cities` for scooters was caught as wrong for the operator's actual
rule. A scratch harness needs the constants the real one supplies
(`OOP_ELIG_NEAR_BAND`); a ReferenceError there is the harness, not the code.

**`--force-with-lease` refused a push as "stale info" after a merge** — the
remote branch had been deleted on merge and the local tracking ref still named
its merged head. `git fetch --prune`, confirm the remote ref is gone and that
nothing on it was unmerged, then push without force.

