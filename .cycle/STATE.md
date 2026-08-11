# Cycle State

## Current
Cycle: 17 — CLOSED (reflected, `.cycle/blocks/17-a-reflect.md`; metrics row
appended). Between-cycles OPERATOR WORK continues on the branch (see below);
cycle 18 has not opened. When it does, it should be the DUE Seams &
Invariants audit (counter 4/4); move this cycle's block to HISTORY.md at that
point. NOTE the library is at INV-191 — the 2026-08-11 pilot-feedback round
wrote 189/190/191.
Phase: idle (post-reflect) + operator-requested feature work:
- Operator feedback rounds 1–3 (2026-08-06): pop-out fit-to-template;
  combined color-coded Spanish Inbox; Dept Requests rebuilt on the Spanish
  vocabulary + dept filter (commits 3215f45, ebd1cab, 395c554). Pure 436.
- Metrics improvements #1–#10 (operator-approved, ALL TEN implemented —
  `.cycle/blocks/18pre-metrics-improvements-broad-implement.md`): range-mode
  trend fill, unified preset+Custom controls, diagnostics disclosure, target
  line + threshold-aligned banding, transfer rail rows, coverage CTA,
  best/worst chips, multi-day team trend (INV-66 amendment), rep
  drill-through, copy-table TSV. Pure 446, DOM 69, 8 bite-checks, full
  39-scenario matrix 0/0, banding + [hidden] fix verified by MEASUREMENT.
  /sync-docs for BOTH the feedback rounds and this batch is **DONE**
  (INV-66/129/180 amendments, Phase-1 opt-out caller note, metrics KDD +
  pop-out KDD + DR KDD + Spanish Part-A additions, S25/S41/S42/S74 updates,
  Visual Audit Stage 37→39, test narrative →446, the new [hidden]-vs-display
  gotcha, the no-new-operator-state entry, visual README count). Merged as
  **PR #155** (be53a61); branch restarted from main.
- Operator round-2 follow-ups (2026-08-06, post-#155): (a) the Dashboard
  Team/Department card shows the team aggregate at ANY cohort — operator
  decision; `getDashboardMetrics` MIN_COHORT 3→1, cache `dash_metrics_v2`,
  client null-team message now reads "no data"; INV-124's My Stats per-day
  series guard UNCHANGED and pinned to stay 3 (scope amendment written into
  INV-124 + the Dashboard KDD). (b) List-swap motion: `animateListSwap_`
  (script_core) + `.swap-in`/`listSwapIn` (styles.html, opacity/transform
  only, reduced-motion-neutralized) wired at the DR status + dept chips,
  Spanish tabs, and the Team Metrics scope switcher; keyframes property
  whitelist pinned. Pure 448 (2 new pins, 3 bite-checks), DOM 69, full
  39-matrix 0/0; animation + hidden-message verified by MEASUREMENT
  (computed animationName + stagger). Docs synced in the same commit.
  Merged as **PR #156** (f7bf58f, CI green); branch restarted from main.
- Team-member onboarding (operator request 2026-08-07, PRE-PILOT — the
  operator distributes the app to pilot reps next week): Manage → Admin →
  Config → **Team Members**. Three NEW admin-gated endpoints (INV-136 35→38,
  doc-count net updated in the same commit): `addEmployee` (locked;
  validate-under-lock via the pure `empValidateNewEmployee_` — unique
  email/ID/NAME, no TEST_ ids, tz shape, dept whitelist, H:mm-H:mm-only
  schedule, managerEmail ∈ MANAGER_EMAILS, second-biweekly-anchor reject
  INV-18; appends the 15-col row, invalidates roster cache, audits
  `EmployeeAdd`, optional Call Notes provisioning AFTER lock release),
  `offboardEmployee` (clears ONLY the email — INV-183 convention; self-guard;
  audits `EmployeeOffboard`), `getOnboardingPanel` (readiness: notes/manager/
  tz/CDR-seen + alias suggestion via cdrLikelyNameMismatches_; CDR
  best-effort). Client panel (form + readiness chips + offboard) in the cn
  Admin partial; getOnboardingPanel fixture added (INV-185); omnibus gate
  cases + ADMIN_GATED entries added to Tests.js (F9). Pure 450 (2 new pins,
  4 bite-checks incl. the F7 doc-count net), DOM 69; panel render verified by
  measurement + element screenshot. Docs: new KDD + operator-checklist entry
  + S75 scenario + INV-136 count updates. Merged as **PR #157** (a7b1186).
- Onboarding follow-ups from PILOT TESTING (operator reports 2026-08-08), both
  merged: **PR #158** (c10d767) — `addEmployee` reported FAILURE after a
  successful append (every post-append step sat under the one outer catch;
  `provisionCallNotesSheet`'s waitLock is outside its own try and throws on
  timeout), so a retry hit a phantom duplicate. Now: `appended` flag →
  success-with-warning, post-append bookkeeping individually best-effort,
  provisioning try/caught at the call site, conflict labels name the owning
  row, client double-submit guard. **PR #159** (e3bf86c) — the report's ACTUAL
  cause: a HAND-STUBBED row (ID + name typed into the sheet, no email) reserves
  the ID while `empRosterEmail_` hides it from every in-app list. Conflict
  labels now say the owner has no login email + both resolutions; the panel
  splits email-less rows into offboarded (kept roster data) vs incomplete.
  **PROCESS NOTE: the first diagnosis (#158) was WRONG about this report** —
  the row's SHAPE disproved it (no code path writes an ID with a blank column
  A). #158's fix stands on its own merits; the correction is recorded in the
  KDD so the wrong causal story is not re-derived.
- Pilot-feedback round (operator 2026-08-11, from testing the deployed app —
  three notes, all three implemented): (1) **Reminders are now a SHELL
  capability** — break reminders fired only on the Clock tab, so the pinned
  Call Notes pop-out never showed one; `remindersTick_` (60s, boot-started)
  owns them, plus a synthesized Web Audio chime (on by default), a best-effort
  desktop notification (expected to be REFUSED — cross-origin iframe; the
  toggle says so), a sidebar/mobile-header Alerts row, the `umsNotify` key
  (15th), and a new still-clocked-in nudge (refreshes getEmployeeState at most
  1×/10min, ONLY in the shift-end+5..+120min window; an unknown punch state
  never nags). (2) **Onboarding panel split** — `getOnboardingPanel` no longer
  reads the CDR Report (that 7-day foreign-spreadsheet read was the whole
  panel's latency); `getOnboardingCdrReadiness` is a second-stage admin-gated
  endpoint (INV-136 38→39, doc-count net + gate case updated in the same
  commit) and the client patches `data-cdr-name` chips; `cdr:{deferred:true}`
  ≠ `ok:false` ≠ "no calls" (INV-187). The readiness list became a `.cn-ob-grid`
  column grid (900px stacking breakpoint; the alias column is the wide one; the
  action track is minmax'd because the caller's own row shows a "you" chip).
  (3) **`.compact-header` RETIRED** — the tool-name strip repeated the pop-out
  window title and the tab bar below it, costing ~44px at the top of the app's
  smallest window; helper + 12 render sites + CSS removed (INV-184), the
  manager `#mgr-refresh` control preserved. TWO defects found by MEASUREMENT
  while verifying: the boot theme reflector wrote aria-pressed across the whole
  `.sb-theme-btn` CLASS and silently reset the sound toggle every load (now
  `[data-theme-target]`-scoped — INV-191), and `.toolbar-tabs` overflowed the
  page 25px at 390px (now scrolls internally). Pure 455 (5 new pins, 10
  bite-checks), DOM 69, full 39-matrix 0/0.
- Branded-email restyle (operator 2026-08-11, second request of the day): the
  shared `buildBrandedEmailHtml_` + `brandedKvRows_` were restyled onto the
  dept-email identity — UMS mark over a navy rule ON THE CARD (never on a navy
  fill: `logoUrl` is a transparency-free JPEG), a real 22px heading with a
  tone rule replacing the 11px mono chip + 9px dot, the navy-tinted detail
  table replacing two columns of plain text, and `subLabel` (module name,
  default EMPTY) replacing the generic "Notification" eyebrow. New
  `statusLabel` option; the long-unused `ctaUrl`/`ctaLabel` are now wired
  through the new `safeWebAppUrl_(tabKey)` (returns '' → the wrapper drops the
  button rather than shipping a dead one). Every branded caller now passes a
  module eyebrow. Verified by RENDERING each email and looking (no matrix
  scenario covers server-built mail). Pure 457 (2 pins, 6 bite-checks), DOM 69.
- Sheet→article converter (operator 2026-08-11, third request of the day —
  "a better version" than embedding a roster spreadsheet in Reference):
  `kbConvertDriveSheet` + the pure `kbSheetGridToMarkdown_`. The motivating
  facts are structural, verified in source: an embed is a TITLE-ONLY search hit
  and the Ctrl/⌘+K drawer cannot host an iframe, so an embedded roster is
  invisible mid-call; the /preview iframe also needs each REP's own Drive
  access. Shape-detecting conversion (table vs banded grid). THE bug worth
  remembering: banded rosters partition by COLUMN, so the first implementation
  merged two sub-teams into one line (PPD's people shown as covering MDO) —
  fixed by making headers claim column ranges; and the band test had to become
  "spans the used width" after a 3-col sub-team merge cleared a 60%-of-6 ratio
  bar. Both found by RUNNING the converter on a reconstruction of the
  operator's sheet, not by reading it. Manual/review-before-save by design so
  the eventual "app becomes the source" migration is not fought by a re-sync.
  Pure 462 (5 pins, 6 bite-checks), DOM 69. INV-192 written; INV-136 39→40.
- Interactive roster block (operator 2026-08-11, follow-on to the Sheet
  converter — "could it be executed in a better way with more features"):
  ` ```roster ` fence → filter-as-you-type directory with tag tooltips,
  click-to-copy, lead/new/badge chips. Follows the ```snippet precedent, so
  the kbMd_ escape boundary is untouched (article bodies still cannot carry
  HTML). kbConvertDriveSheet emits the block for a banded sheet by default.
  THREE bugs worth remembering, all found by RUNNING it: the fence content is
  pre-escaped so `&` arrives as `&amp;` and the tag split mangled "C & ATP";
  the global :focus-visible ring is a box-shadow token, so a per-element
  `outline: var(--ring-focus)` was both wrong and redundant; and
  `assert.deepStrictEqual` compares prototypes, so a vm-realm array fails
  against a plain [] even when equal (compare by value). Pure 467 (5 pins, 8
  bite-checks), DOM 69. INV-193 written.
- SEAMS-AUDIT CANDIDATE (for cycle 18, alongside INV-189/190/191): "a
  uniqueness namespace that spans EXCLUDED rows must name the owning row and
  say it is excluded" — recorded as an INV-183 corollary for now.
(Cycle-17 history below is retained until the close-out move.)
Phase (cycle-17 record): implement — the broad scan is COMPLETE. Implemented + doc-synced:
  TOP 5 (`17-top5-broad-implement.md`), BATCH ② (`17-batch2-broad-implement.md`,
  net 8), BATCH ③+④ (`17-batch3-batch4-broad-implement.md`, net 8) — the
  consolidated ②③④ /sync-docs is DONE (commit 9098206). BATCH ⑤
  (server-hardening stragglers) is IMPLEMENTED
  (`.cycle/blocks/17-batch5-broad-implement.md`, net 10−1=9; pure 425, DOM 69,
  bite-checks pass, no stylesheet changes so no re-shoot owed) and its
  /sync-docs is DONE (commit 922a360). BATCHES ⑥+⑦ (structural/growth +
  visual-lens expansion) are IMPLEMENTED
  (`.cycle/blocks/17-batch6-batch7-broad-implement.md`, net 4−0=4 + 1
  structural + 3 harness-capability; pure 433, DOM 69, 7 bite-checks pass,
  FULL 37-scenario matrix re-shot: 0 missing / 0 overflow). Batches ⑥+⑦'s
  /sync-docs is DONE (commit 64007ca). ALL SEVEN cycle-17 batches are
  implemented + doc-synced, and the whole cycle is MERGED to main as
  **PR #154** (merge commit 13eeed2, CI green). Remaining: /reflect to
  close the cycle, and the ONE operator deploy action.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 4 (cycle 15 was the seams audit;
  16 and 17 have completed since, and cycle 17's reflection closes the fourth
  subsystem cycle. Cadence is every 4 — the NEXT audit should be a Seams &
  Invariants audit, which also owes the library its 3 pending candidates:
  INV-189/190/191 were the cycle-17 reflection's candidates, but the
  2026-08-11 pilot-feedback round WROTE those three numbers for its own
  findings — the audit owes fresh candidates, not those)
Updated: 2026-08-11

## In progress (facts to carry forward — NOT judgments)
- Cycle 16 is CLOSED and archived to `.cycle/HISTORY.md` (this cycle's open).
- The cycle-17 broad scan ran with SIX parallel deep-read subagents + the
  mandatory visual stage (29/29 scenarios, 0 missing fixtures, 0 overflow) +
  an independent re-verification pass of every Medium+ claim (all held, zero
  retractions). Findings: **0 Critical / 1 High / ~10 Medium-band / ~25 Low.**
- The TOP 5 are implemented and bite-check-pinned (pure 407→411, DOM 69,
  `node --check` clean):
  C17-2 (TO.STATUS normalize-once on the balance path),
  C17-7 (three manager lazy cards render error states on both failure shapes),
  C17-5 (CN loaders preserve last-good on structured {error} + failed-round
  freshness invalidation + cold-failure error state),
  C17-1 (A2 tripwire regex now matches `[data-compact="1"]`; styles.html
  contributes real obligations — two new 540px breakpoints for .actions /
  .field-row, five DEAD compact overrides removed, two reasoned allowlist
  entries), and
  C17-6 (exportCallNotesRange carries skippedReps on response + audit row +
  client toast; all-skipped returns a read-failure error).
- The post-fix visual re-shoot was running at checkpoint time — verify
  report.json shows 29/29, 0 overflow, and eyeball clock-light-mobile
  (.actions is now 2-col at ≤540px with the prime spanning).

## Completed this cycle
- BATCH ⑥+⑦ | Code.js, styles.html, metrics/train/cn partials, CLAUDE.md
  (paired loader-gotcha edit), test/visual/{mock,shoot,README}, run.js |
  ⑥: C17-9 one-read-indexed range edit + memoized personal-sheet handle
  (was ~124 full reads + ~124 openById inside the global lock);
  getNextActions_ skips unrecognized punch types (the hand-edit lockout);
  Spanish readers report the 200-thread scan cap (INV-169) + client warning;
  trainLoadMgr_/edLoadMgr_/coachLoadMgr_ INV-156 seq tokens guarding every
  state write; ~240 lines of INV-184 dead CSS deleted (incl. four compact
  halves C17-1's grid-only scan couldn't see) + cnLoadDate_ removed with its
  doc mention. ⑦: mock ?failrpc= forced-failure hook; first Admin scenarios
  (light+dark, full INV-185 fixture set incl. the derived getAutomationHealth
  key pin); dark parity for Reference/Training/Coaching; first three
  error-state shots (A12/INV-175 on camera). Matrix 29→37. 8 new pins, 7
  bite-checks. Pure 433. NOTE: a `git checkout` bite-reversal wiped
  uncommitted Code.js once (the batch-3/4 accident repeated) — re-applied;
  bites now revert via python only, and batches commit before the next starts.
- BATCH ⑤ (10 items) | Code.js, form_public.html, intake/kb/cn partials,
  run.js | C17-12 (form_public conditional sections CLEAR on re-hide — stale
  hidden values no longer enter the hashed immutable record), C17-11
  (mixed dept+'Other' split-send: internal-half bookkeeping preserved on
  external failure — EmailedAt for internal depts, audit row +
  `externalCopyFailed`, DR row live; success-with-warning return + client
  warn toast), C17-13 (Q43 custom-add blocks LEADING negation tokens —
  none/nothing/denies/denied/negative/neg), createFormToken prefill caps
  (recipientName ≤200, prefillData object-only ≤50 keys ≤20k JSON),
  submitFormByToken signature must be `data:image/` (blocks the
  reviewer-browser/PDF-conversion URL-fetch leak), getDepartmentEmails_
  whitelist-rebuild on read + saveDepartmentEmails comma/semicolon-free +
  1–60 char dept names (protects drSplitDepts_/INV-131), time-off notes
  capped 1000 chars on both submit paths, intakeListMySubmissions returns
  total+cap (INV-169) + client cap note, searchReference hits carry status
  (admin sees the Draft pill on draft chunks), intakeRecListHtml_
  cache-buster respects an existing query string. 6 new comment-stripped
  pins, bite-checked. Pure 425.
- BATCH ③+④ | tour/styles/training/empdocs/coaching/kb/cn partials, Code.js,
  mock.js, run.js | ④: tour-primary + instance-banner color rule, .tr-head
  real viewport wrap (C17-10), review-due row wrap, .tr-section-h defined +
  <h2>, PDF⇄Fillable switch → role=switch button, more-menu + audit-history
  aria-expanded, kbMd_ block-only fence extraction (inline pairs preserved).
  ③: A13 derived class set + first-attr regex + CSS-definition check, A12
  statement-scope, A11 + 'collapsed'/'expanded' (open/show reasoned OUT),
  V-1 derived -deep set, three mock.js payload-shape fixes + shape pin,
  cdrQueueInventory_ on the CSRT constants. 4 new pin tests + 3 extended;
  bite-checked. Pure 419.
- BATCH ② (9 items) | Code.js, cn/metrics/tc-clock/tc-timeoff/kb partials,
  run.js | C17-3 (ambient walk guard + logged catch + saveTrainingAssignment
  predicate + F3 widened with the bare-truthiness ban), C17-4 (per-rep-daily
  attSeconds null-for-absence), C17-14 (no-CDR noteCountUnavailable branch),
  C17-15 (extras SWR stamps only a fully-successful round), side-rail error
  state, kbDrawer failure guards, admin-config containment, five cross-rep
  walks outcome-carrying (skippedReps/partial + partial-rounds-uncached +
  digest warning line + client notes/badge), search error-states with dual
  query guards. 4 new pins + F3 widening, all bite-checked; one pin rewritten
  after being wrong about the code on first write (documented in the block).
- C17-2 | web-app/Code.js | updateTimeOffStatus normalizes TO.STATUS once
  (lowercase comparisons; raw kept for the compensating revert + audit note;
  notify no-op check compares both sides normalized).
- C17-5 | web-app/cn/script_callnotes.html | cnLoadToday_/cnLoadDateRange_
  preserve last-good notes on a non-enrollment {error}, set
  rollingLoadFailed/historyLoadFailed in BOTH handlers, null the SWR stamps
  (never serve a failed round as fresh); both stack renders show
  errorStateHtml_ when a failed load has no last-good.
- C17-6 | web-app/Code.js + cn/script_callnotes.html | exportCallNotesRange
  collects skippedReps, returns it (additive field), stamps
  `skippedReps=N (ids) — INCOMPLETE` on the audit row, returns a read-failure
  error when all reps were skipped; client shows a warn toast naming the reps.
- C17-7 | web-app/tc/script_manager.html | loadPendingAdjustments_ /
  loadPtoReconciliation_ / loadSheetDoctor_ split res.error from
  genuinely-empty and render errorStateHtml_ on both the {error} and
  transport paths (the adjust queue is operational — a failed read must never
  read as "queue clear").
- C17-1 | test/client/run.js + web-app/styles.html | A2 regex
  `\[data-compact[^\]]*\]`; .actions + .field-row gained real 540px
  breakpoints; dead compact overrides for .actions-grid / .ledger (×3) /
  .ts-summary / .leave-balance-row removed (INV-184 class); .preset-grid's
  redundant identical-tracks declaration dropped; ts-recent-row + hero
  allowlisted WITH reasons in A2_INVERSE_OK.
- Tests | 4 new pins (C17-2/5/6/7), ALL bite-checked individually (mutate →
  exactly that pin fails → restore). Pure 411, DOM 69.

## Pending / not yet done
- **DEPLOY of the top-5 batch**: `cd web-app && clasp push -f` → New version →
  run `runAllTests()` from the editor (cannot run in the container). Expect
  S4-relevant behavior unchanged for canonical-case rows.
- ~~`/sync-docs` for this batch~~ — **DONE** (commit d81bb01): A2 gotcha
  (C17-1 blind spot + resolutions + three-entry allowlist), INV-183 fourth
  column CLOSED (TO.STATUS), INV-46 outcome-carrying export clause, loader
  gotcha (cnLoadDate_ dropped + C17-5 posture), ledger KDD retired,
  trigger-installer gate list corrected, stale Code.js ambient comment fixed,
  test count 407→411.
- The rest of the cycle-17 findings (1 High none — done; the other Mediums:
  C17-3 ambient walk, C17-4 ATT-zero, C17-8 tour contrast, C17-9
  SaveDayRange lock amplification, C17-10 training clip, C17-11 split-send,
  C17-12 form_public hidden fields, C17-13 Q43 negation phrases, C17-14…17 +
  ~25 Lows) — see the scan report. Natural next batches were proposed in chat:
  ② silent-degradation stragglers, ③ tripwire-integrity sweep, ④ interface set.
- Operator one-liner (cycle-15 F2, still open): DQE col-4 header →
  `CDR_EXPECTED_HEADERS`.
- Operator (cycle-16): delete Offerings row 23 or clear B23.
- CARRIED (cycle-13 A5), DEV PROJECT ONLY: set `INSTANCE_IS_PROD=false`.

## Open follow-on items
- NEW (batch ⑦ error scenario surfaced it): when getReferenceTree fails, the
  Reference LANDING pane renders an indefinite loSweep loader below the
  tree's error card (no failure branch of its own) — Low, photographed in
  reference-error-light-mobile.png.
- Scan Lows still open after batch ⑤: Spanish 200-thread cap, manager fan-in
  seq tokens (train/empdocs/coaching), C17-9 SaveDayRange lock amplification,
  unknown-punch-type lockout — the batch-⑥ set.
- acknowledgeDoc's EmpDocs signature is size-bounded but not
  data:image-validated (authenticated signers — lower stakes; same one-line
  shape as the public-form fix if wanted).
- The three raw DR.STATUS readers (INV-183) — the drStatus_ predicate batch.
- form_public accordions toggle 'open' with no aria; outside
  A11Y_SCAN_PARTIALS (standalone page) — genuine gap, out of batch scope.
- Visual matrix (updated post-⑦): Admin, dark Reference/Training/Coaching,
  and error states are now COVERED; still unshot — Coverage/Punctuality tabs,
  Sent Forms, EmpDocs My Docs, and modal/overlay states.
- INV-187 candidates the top-5 batch did NOT close: managerAggregateFlagged_,
  managerSearchCallNotes, taxonomy/trends, managerGetUnresolvedActionCount
  (cached undercount), getMetricsAmbient blanket catch, My Stats no-CDR
  branch, extras SWR partial-fresh, timesheet side-rail skeleton,
  kbDrawerOpenItem_ failure guards, getAdminConfig pane wipe.

## Decisions made (so the next session doesn't re-litigate)
- C17-1 obligations were resolved per-selector, not blanket-allowlisted:
  .actions/.field-row got REAL breakpoints; .actions-grid/.ledger/.ts-summary/
  .leave-balance-row compact overrides were REMOVED as dead (INV-184 — grep
  confirmed zero markup emits them); .preset-grid's compact tracks were
  identical to base (gap-only change) so the redundant declaration was
  dropped rather than allowlisted; .ts-recent-row (auto 1fr auto — content
  tracks) and .hero (only live consumer sets display:block) are allowlisted
  WITH those reasons.
- C17-2 keeps oldStatusRaw for the compensating revert and the audit note so
  the cell is restored/recorded exactly as found; only comparisons normalize.
- C17-7 renders error states for the two DIAGNOSTIC cards too (not just the
  operational queue): a failed check is not a clean check (INV-187), and
  cycle-16's operator note already frames "warn cards where blanks used to
  be" as the fix working.
- C17-5's cold-failure error renders are written multi-line so the
  line-scoped A12 scan can't false-trip on empty-class + failure-marker
  co-occurrence.
- No Tests.js editor case was added for C17-2 (it cannot execute in the
  container and an unexecuted editor test is the cycle-16 "pin wrong about
  the code" hazard); the comment-stripped source pin covers the shape, and a
  `test_updateTimeOff_mixedCaseStatusCell` editor case is noted as a
  follow-on to write AND run at next deploy.

## Where I left off
Cycle 17 is closed (reflected). The operator-feedback rounds + metrics
improvements #1–#10 are implemented AND doc-synced; the operator authorized
PR + merge of the branch (in progress at this checkpoint). Deploy remains
ONE operator action (`cd web-app && clasp push -f` → New version →
`runAllTests()` in the editor). The 2026-08-11 pilot-feedback round
(reminders / onboarding-panel split / pop-out header) is implemented AND
doc-synced — INV-189/190/191 were WRITTEN into the library by that round, so
cycle 18 (the due Seams & Invariants audit) owes the library new candidates
rather than those three; move the cycle-17 block to HISTORY.md when it opens.
