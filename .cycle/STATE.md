# Cycle State

## Current
Cycle: 17
Phase: implement — the broad scan is COMPLETE. Implemented + doc-synced:
  TOP 5 (`17-top5-broad-implement.md`), BATCH ② (`17-batch2-broad-implement.md`,
  net 8), BATCH ③+④ (`17-batch3-batch4-broad-implement.md`, net 8) — the
  consolidated ②③④ /sync-docs is DONE (commit 9098206). BATCH ⑤
  (server-hardening stragglers) is IMPLEMENTED
  (`.cycle/blocks/17-batch5-broad-implement.md`, net 10−1=9; pure 425, DOM 69,
  bite-checks pass, no stylesheet changes so no re-shoot owed). Batch ⑤'s
  /sync-docs is OWED (nine items in its block). Remaining: batches ⑥–⑦.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 3 (cycle 15 was the seams audit;
  16 and 17-so-far have completed since. Cadence is every 4, so the next Seams
  audit is due after cycle 18)
Updated: 2026-08-05

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
- Dead CSS cluster in styles.html (base rules for .ledger/.ledger-3,
  .hero-clock*, .actions-grid/.action-btn, .ts-summary, .leave-balance-row) +
  the stale "ledger" KDD paragraph in CLAUDE.md — the compact halves are gone
  (C17-1), the bases remain.
- cnLoadDate_ is dead code (zero callers) yet CLAUDE.md's loader gotcha lists
  it — remove function + doc mention together (the A4 precedent).
- Scan Lows still open after batch ⑤: Spanish 200-thread cap, manager fan-in
  seq tokens (train/empdocs/coaching), C17-9 SaveDayRange lock amplification,
  unknown-punch-type lockout — the batch-⑥ set.
- acknowledgeDoc's EmpDocs signature is size-bounded but not
  data:image-validated (authenticated signers — lower stakes; same one-line
  shape as the public-form fix if wanted).
- The three raw DR.STATUS readers (INV-183) — the drStatus_ predicate batch.
- form_public accordions toggle 'open' with no aria; outside
  A11Y_SCAN_PARTIALS (standalone page) — genuine gap, out of batch scope.
- Visual matrix: still no Admin panel scenario (needs a getAutomationHealth
  fixture) and no dark Reference/Training/Coaching; error states unshot.
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
Batch ⑤ complete and green (pure 425 / DOM 69 / bite-checks pass /
`node --check` clean; no stylesheet changes, no re-shoot owed), committed +
pushed to `claude/broad-scan-up98b9`. Next: `/sync-docs` for batch ⑤ (nine
items in its block), then batch ⑥ (structural/growth) or ⑦ (visual-lens
expansion). Deploy of all cycle-17 batches remains an operator action.
