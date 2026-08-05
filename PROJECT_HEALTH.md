# Project Health — team-tools

## Current Standing
**Cycle 16 (broad scan) CLOSED 2026-08-03 — reflected net +7 (8 prod fixes − 1
new failure mode; 1 capability; 5 defensive).** 0 Critical / 0 High / 6 Medium /
5 Low across 11 findings, ALL implemented across three sessions, each followed by
`/sync-docs`, **merged as PR #152 and deployed** — `runAllTests()` on the
deployed project returned **286 passed / 0 failed / 0 skipped**, the first cycle
since 10 to reach `main` and production inside its own cycle rather than adding
to a deploy backlog. **Axis-B lowest: Test Coverage Quality.**

**The theme is the finding: three separate tripwires each named the right rule
and then scanned a FIXED LIST of past fixes.** Deriving A12's file and class sets
surfaced **28 violations across six partials** that had sat behind a green CI
since cycle 13 — including `train/script_coaching.html`, which renders a load
failure into `.tr-empty`, a class the tripwire already *knew*, in a file it did
not scan. Deriving A2's scan surfaced a fifth candidate (verified NOT a defect
and resolved as a rule refinement rather than an allowlist entry). Deriving the
cycle-15 fixture-mirror pin from its DO-NOT-EDIT region caught `cnNoteCoverage_`,
three tokens of paraphrase that had already diverged where it matters. That is
INV-179 three times in one cycle, and it argues for sweeping the remaining
hand-listed scans proactively rather than one per audit.

**The production fixes cluster into one shape.** F1/F4/F5/F10 are all *a failure
rendered as a confident, complete-looking answer*: a rep whose Sheet could not be
opened appeared on the manager's end-of-shift **performance** table with
`totalNotes:0` and a CRIT-toned 0% badge; a swallowed PTO read made **every rep
count as working**, so the one tool whose purpose is understaffing detection
returned a green all-clear on a day half the team is off; and 28 load-failure
sites read as "there is nothing here", including the Reference tree and the
Ctrl/⌘+K drawer *during a call*. **F9** was the clinical one — `parseInt('')` is
`NaN` and every `NaN` comparison is false, so an unreadable weight capacity read
as **unlimited**. Interface fixes: the Reference reader measured **70px** at
390px (that file carried zero media queries, on the mid-call lookup tool), and
`uiPrompt`'s input had no accessible name while its validator error had no live
region.

**Two honest corrections, both applied at reflection.** (1) The Batch-4/F9 block
reported **0 new failure modes**; a chair silently vanishing from recommendations
behind a **pull-based** detector is one (Low, fail-safe), so the cycle's net went
8 → **7** — a correction that LOWERED the score. (2) The F9 operator check came
back *after* the reflection and changed the finding's **reason**: exactly one
catalog row had an unreadable capacity, and the operator identifies it as a
scratch entry, not a real product. So no genuine chair was recommended above its
capacity, and F9's clinical severity is much lower than first written — but the
fail-open was still reached, by a row that should not have been in the pool at
all. That surfaced a structural gap now documented: **the Offerings catalog has
no concept of a disabled row** (the only inert state is an empty HCPCS), and the
engine's `hcpcsNum >= 848` Group-3 ladder silently classifies any **E-code** as
Group 3 by arithmetic accident. Both logged as follow-ons rather than fixed —
the right shape is a clinical decision.

**Adopted INV-187** (a surface that judges from a best-effort read must carry the
outcome and suppress the judgement when degraded — the class three cycles fixed
one instance at a time) **and INV-188** (a source-scanning tripwire must strip
comments before matching; it has now bitten twice). Tests: pure **391→407**, DOM
69, visual matrix **22→29** scenarios with 0 missing fixtures and 0 horizontal
overflow. Every fix pin bite-checked; four failed their first write and in every
case the *pin* was wrong about the code, twice by tripping on the code's own
explanatory comments. **Estimates were lost again** — given in chat, never
appended when given, the session compacted before reflection; the identical
process failure cycle 13 recorded.

## Prior standing (Cycle 15 close, 2026-07-31)
**Cycle 15 (Seams & Invariants — the cadence audit) CLOSED 2026-07-31 —
reflected net +1 (2 prod fixes − 1 new failure mode; 4 defensive).** The audit
found 0 Critical / 0 High / 2 Medium / 3 Low, and that thin profile is the
finding: 64/64 tests CLAUDE.md names as guards exist, `Object.keys(TOOLS).length`
= 7, triggers = 16 and the "fourteen localStorage keys" claim all verify
mechanically, and two suspected defects were checked and CLEARED rather than
reported. **Axis-B lowest: Parallel Source-of-Truth Drift** — F3 (one question
answered fourteen ways), F4 (a fixture paraphrasing server logic, outside
MIRROR_INDEX) and F5 (the library contradicting the code) are one category, and
it is the category a seams audit exists for.

**The two production fixes.** An operator question opened the cycle: Team
Metrics and Automation Health reported "78 CDR agent(s) not matched to roster".
That count can never reach zero — the CDR Report covers the whole phone system
while our roster is one team, and `CONFIG.CDR_DEPARTMENT` was declared, read
NOWHERE, and carried a doc comment claiming it filtered the read. The health
card toned off it and sat permanently amber; the obvious swap
(`rosterWithNoCdr`) fails identically because that set is every named employee
with no calls. The card now tones off the INTERSECTION
(`cdrLikelyNameMismatches_`): a roster rep with no call data whose name
resembles an unmatched CDR agent is one person spelled two ways, so their calls
are silently missing from every metric. Normally empty → the card reaches green,
and it names the exact `Agent Alias Overrides` row to add. Then **F3**: roster
INCLUSION was decided independently by FOURTEEN walks that disagreed — nine
tested raw truthiness, three trimmed, two tested nothing — so a whitespace-only
email cell split them (the INV-167 shape on a second column), and
`getTeamMetrics` ACTED on it: its gate is `cdr || noteCount > 0 || …`, which an
offboarded name still matching DQE history satisfies, putting a departed
employee in the manager's team table with their volume in `teamTotals`. One
predicate (`empRosterEmail_`) now answers it everywhere.

**One half was deliberately REVERTED.** Adding col 4 to `CDR_EXPECTED_HEADERS`
was implemented and backed out: that validator substring-matches and the real
col-4 header text in the `call-data-reporting`-owned sheet has never been
recorded here, so a guess raises a FALSE "Column drift" warning and flips the
CDR card amber — the identical always-wrong-signal defect fixed hours earlier
the same cycle. Shipped the safe half (enum-derived offsets); left a one-line
operator close.

**Process notes worth carrying.** The audit sampled NINE roster walks;
implementation found FOURTEEN — an audit that samples named functions can
undercount, which is the argument for deriving scan sets (INV-179) over
enumerating them. The reflection CORRECTED the implementation self-report in
both directions (+1 production fix the batch never covered, +1 new failure mode
it reported as zero) at the same net, the cycle-13 pattern. Pure harness
394→396, DOM 69; eight revert scenarios bite-checked. **Six invariants adopted
(INV-181–186)**, clearing a backlog that had accumulated across two cycles —
including INV-181/182, which cycle 14 proposed and never wrote.

**Cycle 14 (CDR sub-queue feature) — Phases 0, 1, 2 and 4 shipped; the
operator's ask is MET.** Operator-requested feature work, not an audit cycle:
departments with sub-queues had no way to view sub-queue detail separately or
transparently. Design approved 2026-07-29: discovery first, MANAGER SURFACES
ONLY (dropping the phase that could have defeated INV-124's N=3 anonymization),
expandable per-queue rows plus segmented contribution bars.

**Phase 0 was a GATE and it returned the NEGATIVE verdict — the most valuable
thing this cycle produced.** Measured against the live sheet: **DQE carries ONE
row per (agent, date)**, so answered / missed / % answered / talk-time can never
be split by queue. `CDR.QUEUE_EXT` (col 4) — declared in the enum for years and
read nowhere — holds comma-separated MEMBERSHIP lists (`103,108` vs `108,103`),
a dimension of the AGENT rather than of the call. Two hours of discovery
replaced a day of Phase 1 work landing on sand.

**Phases 1, 2 and 4 were re-scoped on that evidence and shipped.** The `CSR
Transfer Historical Data` tab IS keyed by rep, so its per-queue H:R block is
genuine per-rep attribution — for transfers. `getCsrTransferPerRepDaily_` reads
it behind `opts.withQueues` (default OFF; the three existing callers cache their
payloads), discovering columns BY HEADER NAME so nothing drifts against the
operator-owned `call-data-reporting` repo. Team Metrics gained a Combined / By
department / By queue switcher: the combined view shows each rep's transfer
total with a segmented contribution bar and an expandable per-queue split.
**INV-180 is enforced visually as well as in the payload** — the unattributed
remainder is its own segment and the detail states "N of M attributed", because
a bar built from queues alone would imply a completeness the data does not have.
Grouping is OPERATOR-SUPPLIED, not inferred (Sales / Customer Success / Field
Operations / Power), seeded in CONFIG with a Script Property override; sub-queues
are disjoint from parents so a group total is a plain sum, and an unmapped queue
lands in a trailing "Ungrouped" row rather than being absorbed. Pure harness
375→391, DOM 66→69, visual matrix 20→22 (Team Metrics had never been shot). All
16 cycle-14 pins bite-checked; three needed tightening after failing to bite.
Net 0 by design — a diagnostic plus three capabilities, no defects fixed.

**Cycle 13 (broad) CLOSED 2026-07-29 — reflected net +8 (9 prod fixes − 1 new
failure mode; 12 defensive).** The scan found 0 Critical / 0 High / 6 Medium /
7 Low, with the interface lens producing the top four findings — the second
cycle running in which it outscored the code lens. All five batches shipped
(A1/A2/A3/A11/A12; A4/A6/A8/A9; A5/A7/A10 + FO-2..FO-5; the tripwire
generalization + visual-stage doc + frozen-dir deletion; A13). Headliners: six
keyboard-unreachable controls including one that marks the device in the
clinical email actually sent; `metrics/script_metrics.html` carried ZERO media
queries on a rep-facing tab; 16 load-failure sites rendered as "no data"; and no
heading outline below `<h1>` on ~30 views. **The reflection corrected its own
batch reports in two directions** — promoting eight interface fixes wrongly
scored defensive, and counting one new failure mode the batches reported as zero
— landing at the same net from a different composition. Most structurally
significant: deriving the a11y scan list from `PARSE_GUARD_PARTIALS`, which
immediately found eight defects the human audit missed. Should have been
deferred: A8, hardened on a scan over-claim and deleted entirely one batch
later. Pure 356→375, DOM 66, visual 20/20. Invariants 172→179.

**The operator deploy remains unconfirmed and now covers cycles 11, 12, 13 and
14 Phase 0** (`clasp push -f` + New version + editor `runAllTests`) — and for
Phase 0 the deploy IS the deliverable, since the inventory is how it reports.
A dev-project-only action is also outstanding: add `INSTANCE_IS_PROD=false`.
Seams & Invariants audit due in 1 more subsystem cycle (counter 3 of 4).

- **Cycle 8** (2026-07-10): net +14 (16 prod fixes − 2 deliberate fail-safe
  tradeoffs; 34 defensive). Headliners: the automated payroll export ran
  mid-final-day so PH afternoon punches were missing from every biweekly
  .xlsx; both load-error Retry buttons threw. Defining theme: TEST INTEGRITY
  (the shipped-dead-read-green class lost its habitat — any-index scans,
  reverse mirrors, honest SKIPs, NUL-byte cleanup, paren-anchored extraction).
  Pure 248→277, DOM 55→59.
- **Cycle 9** (2026-07-21): net +9 (10 prod fixes − 1 deliberate fail-safe
  tradeoff; 37 defensive). Headliners: "Coach on this" dead since the Manage
  reorg (wrong enterTool key); every Day Edit save rewrote untouched live
  punches into truncated ADJ- rows. Axis-B lowest: Parallel Source-of-Truth
  Drift — three durable class-retiring tripwires shipped (no-mail-in-lock,
  payload-contract, registry-key nets). Pure 289→302, DOM 60→61.
- **Cycle 10** (2026-07-23, in progress): 7-agent broad scan — **0 Critical /
  0 High / 11 Medium / ~35 Low** (third consecutive no-High cycle; all 11
  Mediums personally verified, 0 retracted at scan; 1 Low retracted at
  implement — C3, contested by pinned tests). Scan-time scores: Overall 8 ·
  Correctness 7.5 · Security & Access Control 9 · Data Integrity 8 ·
  Timezone Correctness 8 · Concurrency Safety 8.5 · Test Coverage 7.5 ·
  Code Clarity & Docs 8.5 · Apps Script Best Practices 8.5 · Manager UX 7.5 ·
  Employee UX 8 · Automation Reliability 8. Dominant classes: sibling-surface
  guard gaps (fix patterns applied to the hot path but not its twins) and
  silent-degradation residue (best-effort writes behind success responses).
  ~26 findings + the /setup-cycle delta implemented across 5 commits
  (top-5 Mediums, A: client guard gaps, B: test integrity incl. the
  live-KB-store fixture isolation, C: server silent-degradation, D: client
  failure handling, E: module-client Lows, F: docs). New: INV-155–158;
  punch state machine server-enforced; witness-audit loss signal;
  `_withTestKb_`. Then the operator-approved follow-on batches G–L landed
  same-cycle: a11y (keyboard calendar/tables/note fields, overlay focus
  lifecycle, skip-link, typed-signature alternative on both pads), visual
  (AA contrast tokens, flag-color collision, designed empty-vs-error
  states), observability (shell health dot on the single-sourced
  `automationProblems_`, MIRROR_INDEX, nightly `runNightlySelfTest`
  trigger — INV-159–162), and data integrity (Timesheet sheet doctor,
  C13 NUL-delimiter hashes with dual-verify). Pure 302→319, DOM 61→65,
  editor ≈297. CLOSED 2026-07-24: reflected net +33 (34 − 1 Low),
  PR #138/#139 merged, DEPLOYED — runAllTests ALL PASSED,
  installAutomationTriggers re-run (16 triggers). Seams audit due next.
- **Cycle 11** (2026-07-24, the DUE seams audit): net +5 (5 prod fixes − 0 new
  failure modes; 28 defensive). 8-agent fan-out + a cross-cutting seams
  specialist ran ~170 invariant checks against live code and found **ZERO
  substantive drift** — the cleanest audit in project history (158 RPCs, 16
  enum/header pairs, 16 triggers, 42 Script Properties all clean). 0 Critical /
  0 High / 4 Medium / ~30 Low, plus a 10-finding static-render VISUAL audit on a
  brand-new harness. Headliners: every full `runAllTests` permanently appended a
  fake EXTERNAL witness row to the LIVE AuditLog and compliance panel, and
  `test_training_quizFlow` wrote the LIVE Quizzes tab with no sweep — 3 of 4
  Mediums were the test suite polluting production data or under-covering
  itself. Axis-B lowest: **Test Coverage Quality** (the code was clean; the
  weight had moved into the test layer). Pure 319→330, DOM 65, editor ≈299.
- **Cycle 12** (2026-07-27, broad + the first VISUAL/UI-UX addendum): net **+11**
  (13 prod fixes − 2 Low fail-safe; 17 defensive, 0 features). Single-session
  scan (no agent fan-out) over the ~520 lines that landed after cycle 11's read,
  then category sweeps. 0 Critical / 0 High / 5 Medium / 8 Low — **plus 14
  visual findings from an addendum the operator had to ASK for**, which is the
  cycle's real lesson: **9 of the 13 production fixes came from that lens**, and
  eleven prior code-lens cycles could not reach the class. Headliners: `color-mix`
  in `oklch` interpolating hue on the polar arc, so `--warning-deep` resolved to
  hue 355 (RED) across ~254 consumers and the same token meant a different hue
  family per theme; AM/PM at 1.20:1 in dark mode on the live clock of a
  time-tracking app; a swallowed per-rep Sheet read rendered as a confident 0%,
  telling reps to re-file work they had already filed. Structural: ONE
  `cnEnrolledSheetId_` predicate retiring a class where 11 of 21 copies of the
  same enrollment test disagreed and silently dropped reps from nine manager
  aggregates; the gated-endpoint + admin sets now DERIVED from source after
  INV-136's count drifted four times; `TimesheetArchive` gained its first reader
  anywhere. Axis-B lowest: **Silent Degradation Posture** (again — failures and
  caps rendered as confident, complete-looking answers). Also: command templates
  synced to workflow-tools v1.23.0 (five releases behind), `/audit` + 5 Tier-3
  commands installed, **UI/UX & Accessibility** added as a 13th Health Dimension
  and **Visual / Interaction Regression Posture** as a 7th Axis-B category,
  invariants 162→172 (INV-165..172; 163/164 left vacant — cycle 11 claimed them
  in metrics but they never reached the library). Pure 330→356, DOM 65→66,
  visual 20/20, editor ≈301. Deploy pending at close-out.

## Prior standing (Cycle 7 close, 2026-07-09)
Cycle 7 (broad) closed 2026-07-09 — scanned, FULLY implemented, reflected,
deployed, and editor-verified in one day. The audit (6-agent fan-out + personal
verification of every Medium+ finding) broke the three-cycle no-High streak:
~40 findings — 0 Critical / **2 High** / ~15 Medium / ~20 Low — and the ENTIRE
backlog shipped same-cycle across 12 turns (fix Turns 1–8 + verification Turn A
+ Seams audit Turn B + detector-liveness Turn C + per-rep schedules Turn D;
PRs #118, #120–#123, all merged on green).

- Scan-time scores (the audit measurement, per the Cycle-2 convention):
  Overall 8 · Correctness 7.5 · Security & Access Control 8.5 · Data Integrity 8.5 ·
  Timezone Correctness 8 · Concurrency Safety 8.5 · Test Coverage 8 ·
  Code Clarity & Docs 8.5 · Apps Script Best Practices 9 · Manager UX 8 ·
  Employee UX 7.5 · Automation Reliability 7.5
- **Cycle 13** (2026-07-29, broad): net **+8** (9 prod fixes − 1 Low fail-safe;
  12 defensive, 0 features). 0 Critical / 0 High / 6 Medium / 7 Low; the
  interface lens produced the top FOUR findings — the second consecutive cycle
  it outscored the code lens, which is why a Visual Audit Stage is now a
  standing requirement of `/broad-scan` (recorded in CLAUDE.md, since
  `.claude/commands/` is template-synced and would be reverted). Headliners:
  six click-only span/div controls with no keyboard path — one of them the
  Intake star that marks the device in the clinical email actually SENT;
  `metrics/script_metrics.html` with ZERO media queries on a rep-facing tab, so
  the split never stacked on a phone; 16 load-failure sites rendering into the
  designed EMPTY state, so a transient CDR outage read as a quiet day; and no
  heading outline below `<h1>` on ~30 views, leaving heading navigation — an SR
  user's primary movement mechanism — stopping at the page title. **The
  reflection corrected its own implementation blocks in BOTH directions**
  (promoting eight interface fixes wrongly scored defensive; counting one new
  failure mode reported as zero), landing at the same net from a different
  composition — read `13-a-reflect.md`, not the batch blocks. Most
  structurally significant: deriving the a11y scan list from
  `PARSE_GUARD_PARTIALS` instead of hand-listing six files, which immediately
  surfaced eight live defects the audit had missed (the third time a
  hand-copied scan set has been found short — now INV-179). Should have been
  deferred: A8, hardened on a scan over-claim and deleted outright one batch
  later. Also: 29 files across three frozen directories deleted. Pure 356→375
  (19 pins, all bite-checked; 3 tightened after failing to bite), DOM 66,
  visual 20/20, editor +1. Invariants 172→179.
- **The cycle's defining failure class was Silent Degradation** — both Highs
  were detectors that could never fire: H-1 coaching-overdue (space-form stamp
  vs a T-only parser — the accountability digest NEVER nagged since Coaching
  shipped) and, same class, M-11 unmatchedAgents (structurally-empty diagnostic).
  Nothing — CI, health panels, the field — surfaced either. H-2: the ADP payroll
  export wrote raw coerced Date cells into an unpinned-tz spreadsheet.
- **Net +14 (14 production fixes − 0 new failure modes; 24 defensive; 1 new
  monitoring capability).** Fired-in-prod fixes incl. the manager Recent-Activity
  feed (constant "12:00 AM" + never-rendered ADJ reasons — the project's own
  gotcha classes unapplied to AuditLog cols 7/8), silent punch-failure toasts,
  intake + CN draft-destroying teardown debounces, whitespace-dropped search,
  double-wired bulk Approve/Deny, the Team Notes sub-tab race, and 'Other'-dept
  SLA noise.
- **Structural headlines:** `createPinnedSpreadsheet_` factory (tz+locale) with
  a no-bare-create CI tripwire; the `cnTimestampString_` locale-coercion
  boundary; subformData whitelist (INV-49/50 back to server-enforced);
  admins⊆managers ENFORCED; KB draft-visibility closed across AI-cache/convert/
  training; **detector-liveness monitoring** (`automationDetectorChecks_` —
  panel + failure digest + smoke test, so the H-1/M-11 class can't ship
  silently again); per-rep shift overrides (roster column O, INV-149).
- **Seams audit (Turn B, counter reset to 0):** found the flagship INV-72
  LEAVE_DEDUCTION mirror had NO tripwire since cycle 1 (now a behavioral-mirror
  test) and pinned the cross-partial intake flush hook; Turn A's persistence
  audit surfaced a LIVE bug (the CN sticky-draft persister deleted drafts on a
  post-teardown fire) that had survived all seven prior cycles.
- Invariant library 140 → **149**; harnesses pure 230 → **248**, DOM 48 → **55**
  (multiple bite-checked); editor suite 259 tests — operator-verified 258/259,
  the one failure being a wrong assertion idiom in a NEW test (the gate it
  tested was proven working by the failure output; fixed in #123).
- **Deployed + verified**: operator ran the deploy and `runAllTests()` same-day.
  Remaining operator step: one `clasp push -f` for the #123 Tests.js fix, then
  a re-run should read 259/0. Optional: fill Employees column O for
  nonstandard-shift reps.
- Estimate calibration: turns ran ~25–40% of their human-dev sizing.
- Last updated: 2026-07-09 (Cycle 7 close, /sync-docs).

## Prior standing (Cycle 5 close, 2026-06-17)
Cycle 5 (broad) closed 2026-06-17. Audit-opened broad-scan of the mature codebase
again found NO Critical/High — one Medium (M-1) + Lows — and the full backlog plus
three manager features shipped and merged (PR #53). Numbered 5 because a parallel
session had claimed Cycle 4 for a non-audit operator-feedback batch (kept distinct).

- Overall 8.5 · Correctness 8.5 · Security & Access Control 9 · Data Integrity 9 ·
  Timezone Correctness 8.5 · Concurrency Safety 9 · Test Coverage 8.5 ·
  Code Clarity & Docs 9 · Apps Script Best Practices 9 · Manager UX 8.5 ·
  Employee UX 7.5 · Automation Reliability 8

- **Movement this cycle:** Correctness 8→8.5 (M-1 — the one real correctness bug,
  a doc/impl drift where adjustLeaveBalance_ gated only on the global PTO flag and
  silently drove `PtoEnabled=FALSE` contractor balances negative, contradicting
  S15/INV-27 — fixed + regression-tested), Manager UX 8→8.5 (three new manager
  tools: Coverage planner, Tag-trend analytics, KB Review-due). All other
  dimensions held: the cycle was mostly feature + hardening on a solid base.
- **One Medium, zero High/Critical** — third consecutive audit with no Critical/High
  (mature-codebase signal). M-1's realistic this-month trigger was narrow
  (manager filing PTO on behalf of a contractor / direct RPC), but it's a real
  contract violation that the existing tests missed (they checked display-hiding,
  not the no-deduct).
- **3 new features** (all manager-gated, read-only, PHI-free, pure Node-pinned
  cores): #5 tag-trend analytics (INV-125), #4 KB review-due (INV-126), #3 coverage
  planner (INV-127). **13 defensive hardenings** — headline ones: getMyMetrics
  endpoint cache (the only rep-facing CDR read, was uncached), KB-AI race-safe spend
  cap, three bounded CN reads, a definitive `verifyDocSignature` tamper flag.
- **Net +1 (1 prod fix − 0 new failure modes; 13 defensive).** Pure harness
  128→133 green; node --check clean; DOM harness unchanged (CI runs it).
- **Still trailing:** Employee UX (7.5) — the new features are manager-facing; the
  highest rep-value roadmap items (#2 follow-up-date on the action flag, #1
  patient/TRX timeline) and the admin-blocked external-form route remain.
- INV-128/129/130 proposed for the next verification pass.
- **Operator deploy of the merged batch is still pending** (`clasp push -f` + New
  version + `runAllTests()`).
- Last updated: 2026-06-17 (Cycle 5 close).

> **Non-audit thread (2026-06-18, branch `claude/practical-gauss-yycwkz`):** a
> parallel UI-redesign batch landed — redesign commits #1–#7 (Time Clock sky
> card + ribbon control surface, Metrics presets/sortable table, Call Notes
> Search cards + Admin sub-tabs, Intake Option-A controls, Training rings/matrix,
> Reference collapsible depts, Coverage heatmap), deferred follow-ons #1–#4
> (range-aggregated My Stats via `getMyMetricsRange`, Sick-leave UI removal /
> backend-dormant, shared `mtRenderTable_` table component, Admin system-status
> cards), and niceties #8–#10. New endpoints `getMyMetricsRange` /
> `getMyNoteHourBuckets`; new tests (`test_cn_search_phoneTrxFieldScopes` + a
> design-token hygiene tripwire). INV-128/129/130 are now DOCUMENTED in CLAUDE.md
> (no longer just proposed). Docs synced via `/sync-docs` (this note). No PR yet;
> operator deploy still pending. This was feature/redesign work, not an audit —
> no health-dimension rescore.

## Prior baseline (Cycle 2 scan-time)
First numeric per-dimension baseline, scored at SCAN time (before the cycle-2
backlog was implemented):

- Overall 7.5 · Correctness 7.5 · Security & Access Control 9 · Data Integrity 8 ·
  Timezone Correctness 8 · Concurrency Safety 8.5 · Test Coverage 7 ·
  Code Clarity & Docs 8.5 · Apps Script Best Practices 8.5 · Manager UX 7.5 ·
  Employee UX 7 · Automation Reliability 7.5
- **The cycle's bug axis shifted**: Cycle 1's Sheets-coercion/tz class produced one
  more fired bug (M1 pending-trend — third bite; a Node tripwire now bans raw
  SUBMITTED_AT reads), but the dominant new axis was **client overlay/lifecycle**:
  every High/Medium client finding (Esc-killed composers, paste-listener leak,
  Enter-on-Cancel, optimistic-revert clobber, stranded spinners, late-callback
  clobbers) lived in the DOM layer no automated test sees. Root cause centralized
  (ensureOverlay/closeOverlay + Esc hooks); a DOM-lifecycle test harness remains
  the highest-leverage coverage investment.
- **Security & Access Control** — strongest dimension: full-codebase XSS sweep found
  zero exploitable sinks from user-typed data; every manager gate verified and now
  test-pinned (all 8 previously-untested gates + the public token endpoints).
- **Whole audit backlog closed same-cycle**: 1 High, 10 Medium, 11-item Low batch.
  Net +8 production fixes, 0 shipped new failure modes, ~13 defensive hardenings,
  3 new CI tripwires (SUBMITTED_AT reads, view-key registry, M1 test parity).
  Editor suite green post-deploy; Node harness 89 → 92.
- **Known gaps carried forward** — L19 composer tab-switch typed input; KB-6
  Esc-discards-editor-edits confirm; DOM-lifecycle harness; P#17 out of repo
  scope. (Shipped post-close: KB Phase 2b/3 + KB AI Phase A on 2026-06-12, then
  the full Training & Employee Docs module T1–T3, the onboarding tour, the
  Google Forms quiz import, and four operator-feedback ergonomics rounds + two
  bugfixes through 2026-06-15 — Node harness 99→123. KB AI Phase B + Training
  T4 stay gated on observed demand.)
- **Per-dimension scores below are FROZEN at the 2026-06-11 audit close** — the
  post-close work above was feature/feedback work, not an audit, so the scored
  standing intentionally hasn't moved. A fresh `/broad-scan` (Cycle 3) would
  re-score; the new Training/Docs + tour surface has not yet had a fresh-eyes
  audit pass.
- Last updated: 2026-06-15 (gaps line refreshed post-feature-work; scores unchanged from the 2026-06-11 close)

## Score History
| Date | Cycle | Overall | Notes |
|------|-------|---------|-------|
| 2026-06-11 | 1 | net +4 (4 prod fixes − 0 new failure modes; 9 defensive) | Broad scan A1–A10 → full backlog implemented (A1–A9, P#1–P#16; P#17 out of scope). Headline: AuditLog ts coercion had blanked the compliance panel in production. KB feature run (tables/images, drawer, section search, usage loop) shipped and operator-verified S62–S64. Editor suite 233/233; Node 89/89. |
| 2026-06-11 | 2 | net +8 (8 prod fixes − 0 new failure modes; ~13 defensive; overall 7.5/10 at scan) | Fresh broad scan (full Code.js read + 4 sub-audits) → entire backlog closed same-cycle: overlay-lifecycle centralization (Esc killed composers / intake paste-listener PHI leak), uiConfirm Enter-on-Cancel, optimistic-revert clobber, SUBMITTED_AT coercion (pending-trend flat zero since ship), stranded spinners, 8 untested manager gates + first public-endpoint tests, digest heartbeats, 11-item Low hygiene batch. Node 89→92 with 3 new tripwires. |
| 2026-06-16 | 3 | net 0 (0 fired-bug fixes − 0 new failure modes; ~9 defensive; overall 8.5/10) | Fresh broad scan of a now-mature codebase found NO Critical/High — all Low (F1 public-form null-res, F2 CDR-field escaping, F3 intake client-PHI drop, F5 err.message guards, F6 bounded break map, F7 ambient-poll handler; F4 retracted) + targeted audit of the two never-scanned subsystems (appsscript.json clean; script_tour T-1/T-2/T-4). HEADLINE structural: built the **jsdom DOM-lifecycle test harness** (the cycle-1+2 top gap) — 36 DOM tests pinning innerHTML escape (proven to bite), overlay/Esc lifecycle, optimistic submit+revert (INV-48), _flagInFlight (INV-56), late-callback guards, focus trap. Test Coverage 7→8.5, Overall →8.5. jsdom = first dev dependency; CI runs pure (zero-dep floor) then npm ci + DOM. 122 pure + 36 DOM green. Deploy of the client batch pending (operator). |
| 2026-06-17 | 5 | net +1 (1 prod fix − 0 new failure modes; 3 features; 13 defensive; overall 8.5/10) | Audit-opened broad-scan of the mature base — again NO Critical/High; one Medium (**M-1**: adjustLeaveBalance_ gated only on the global PTO flag not the per-employee PtoEnabled column → silently deducted `FALSE` contractors, contradicting S15/INV-27; the ptoEnabled tests only checked display-hiding → undetected; fixed + test). Shipped 3 manager features (**#5** tag-trend analytics INV-125, **#4** KB review-due INV-126, **#3** coverage planner INV-127) + 13 hardenings (getMyMetrics endpoint cache, KB-AI race-safe spend, bounded CN reads L-7/L-8/L-10, verifyDocSignature `tampered` flag, tz boundary, comments). Correctness 8→8.5, Manager UX 8→8.5. Numbered 5 (parallel session held Cycle 4). Pure 128→133 green; node --check clean. Merged PR #53; operator deploy pending. INV-128/129/130 proposed. |
| 2026-06-18..07-01 | 6 | — (implement-only; no reflect row) | Non-audit threads between audits: the UI-redesign batch + follow-ons, KB self-improving loop (#107–#112), PPD structured-controls redesign Phases 0–4 (#113–#117), DeptRequests v2, Dashboard/Manage-module/admin-tier work, cycle-6 broad-implement F1–F11. No /reflect ran (sessions closed mid-implement), so no net-score row — see .cycle/STATE.md history. |
| 2026-07-09 | 7 | net +14 (14 prod fixes − 0 new failure modes; 24 defensive; 1 capability; overall 8/10 at scan) | Broad scan broke the no-High streak with TWO silent-dead detectors (H-1 coaching overdue never fired since ship; H-2 payroll export tz) → entire ~35-finding backlog shipped same-cycle (Turns 1–8) + verification/residuals (A), Seams & Invariants audit (B — INV-72 mirror finally tripwired; CN draft-persister live bug found+fixed), detector-liveness monitoring (C), per-rep schedules col O (D). Factory+boundary class fixes tripwired. INV library →149. Pure 230→248, DOM 48→55. Deployed + editor-verified (258/259 → assertion-idiom fix #123). |
| 2026-07-10 | 8 | net +14 (16 prod fixes − 2 deliberate fail-safe tradeoffs; 34 defensive) | Fresh 7-agent scan (0 Critical / 1 High / 15 Medium / ~31 Low) → backlog minus 4 deferrals implemented. Headliners: mid-final-day payroll export missing PH afternoon punches; dead Retry buttons; multi-dept sends bypassing DeptRequests v2. Defining theme: TEST INTEGRITY (any-index scans, reverse INV-72 mirror, honest SKIPs, NUL-byte cleanup, paren-anchored extraction). Pure 248→277, DOM 55→59. |
| 2026-07-21 | 9 | net +9 (10 prod fixes − 1 deliberate fail-safe tradeoff; 37 defensive) | Fresh 8-agent scan (0 Critical / 1 High / 11 Medium / ~36 Low, 0 retracted) → ENTIRE backlog across 7 batches, PR #136. Headliners: "Coach on this" dead since the Manage reorg; Day Edit rewriting untouched live punches. Class-retiring tripwires: no-mail-in-lock, payload-contract, registry-key nets. Pure 289→302, DOM 60→61. |
| 2026-07-24 | 10 | net +33 (34 prod fixes − 1 new failure mode; 38 defensive) | *(backfilled from `.cycle/metrics.csv`.)* The largest cycle to date. Headliners: `recordPunch` gained the server-side next-action state machine (INV-155) so a stale window can no longer append duplicate punches; the intake PHI store became integrity-guarded around the send (INV-157); witness-class audit rows became loss-visible (INV-158). Batches K/L added the Timesheet sheet doctor (INV-159), NUL-delimited EmpDocs hashes with legacy dual-verify (INV-160), the single-sourced failure derivation behind the shell health dot (INV-161) and the nightly in-project self-test (INV-162). |
| 2026-07-24 | 11 | net +5 (5 prod fixes − 0 new failure modes; 28 defensive) | *(backfilled.)* The previous **Seams & Invariants** audit. Hardened the tripwire layer itself: the payload-contract extractor became balanced-brace + depth-masked, the SUBMITTED_AT scan gained a line-whitelist closing the alias hole, the no-mail-in-lock region extended to the last `releaseLock()` and went transitive, and the registry-literal nets were derived from ONE list instead of four hand copies — all bite-checked. Plus the V-1…V-10 visual batch. |
| 2026-07-27 | 12 | net +11 (13 prod fixes − 2 fail-safe new failure modes; 17 defensive) | *(backfilled.)* **9 of the 13 fixes came from an operator-requested VISUAL addendum the code lens structurally could not reach** — the strongest evidence for the Visual Audit Stage now mandated in CLAUDE.md. Headliners: `color-mix(in oklch)` interpolated hue on the polar arc so `--warning-deep` resolved RED across ~254 consumers (V-1); AM/PM at 1.20–2.00:1 on the clock card (V-2); a swallowed per-rep Sheet read rendered as a confident 0% telling reps to re-file work (F5); the column-L predicate `cnEnrolledSheetId_` (F14/INV-167). |
| 2026-07-29 | 13 | net +8 (9 prod fixes − 1 fail-safe new failure mode; 12 defensive) | *(backfilled.)* The interface lens produced the top four findings for the SECOND consecutive cycle: six click-only `span`/`div` controls keyboard-unreachable (A1), compact-mode grids with no viewport breakpoint on a rep-facing tab (A2), nav state carried by CSS class alone so a screen-reader user was never told where they were (A11), 16 load-failure sites rendering into the EMPTY-state container (A12), and ~30 surfaces with no heading outline below the `h1` (A13). `timeToMins_` returned NaN, scoring corrupt rows ON TIME (A3). |
| 2026-07-31 | 14 | net 0 (0 prod fixes − 0 new failure modes; 4 capabilities; 3 defensive) | *(backfilled.)* Operator-requested FEATURE work, not an audit — net 0 is by design. **The headline is a NEGATIVE result:** Phase 0 was a cheap read-only gate built to test whether the approved design was buildable, and it was not (DQE carries one row per (agent, date)), invalidating the original scope before any of it was written. Re-scoped to transfer-only and shipped: queue inventory, per-queue transfer reader, Combined/By-department/By-queue UI, operator-supplied grouping. |
| 2026-07-31 | 15 | net +1 (2 prod fixes − 1 new failure mode; 4 defensive) | **Seams & Invariants** (cadence 4 of 4). 0 Critical / 0 High / 2 Medium / 3 Low. Fixes: the CDR health card toned off a count that can never reach zero (permanently amber → now tones off the actionable pairing and names the alias to add); and `getTeamMetrics` counted offboarded name-only roster rows into the manager's team table and totals (F3 → one `empRosterEmail_` predicate across 14 walks). Also removed 4 declared-but-unread CONFIG keys — two were knobs against a hardcoded FRIDAY, i.e. a silent no-op for an operator moving the weekly digest. Adopted INV-181–186, clearing a two-cycle backlog. Pure 394→396, DOM 69. |
| 2026-08-03 | 16 | net +7 (8 prod fixes − 1 new failure mode; 1 capability; 5 defensive) | Broad scan (0 Critical / 0 High / 6 Medium / 5 Low), entire backlog across three sessions, **merged PR #152 and DEPLOYED** (`runAllTests()` 286/0/0 — first cycle since 10 to ship inside its own cycle). Theme: three tripwires each named the right rule then scanned a FIXED LIST of past fixes — deriving A12's sets surfaced **28 violations across six partials** behind a green CI, one of them using a class the tripwire already knew in a file it did not scan. Fixes cluster as *a failure rendered as a confident answer* (F1 unreadable Sheet → 0 notes + CRIT 0% on the manager performance table; F4 a swallowed PTO read made every rep count as working, so an understaffing planner gave a green all-clear; F5 a confident team judgement from a contaminated numerator; F10 the 28 sites) plus the clinical F9 (`parseInt('')` → NaN → an unreadable weight capacity read as UNLIMITED) and two interface fixes (Reference reader 70px at 390px; `uiPrompt` unnamed input + unannounced validator error). Reflection corrected the batch self-report DOWNWARD (8→7). Post-reflection the operator check changed F9's *reason*: the one malformed row is a scratch entry, so no real chair was mis-recommended — but it exposed that the catalog has no disabled-row concept and the Group-3 ladder misclassifies E-codes (both logged, not fixed). Adopted INV-187/188. Pure 391→407, DOM 69, visual 22→29. |
