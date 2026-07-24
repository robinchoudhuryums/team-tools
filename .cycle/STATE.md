# Cycle State

## Current
Cycle: 11
Phase: idle — cycle 11 closed + follow-up visual batch 2 implemented (2026-07-24); pending: PR for the follow-up batch + operator deploy (clasp push -f + New version + editor runAllTests)
Scope: broad (the DUE Seams & Invariants audit — seams counter was 4)
Test Command: manual
Subsystem cycles since last Seams audit: 0 (cycle 11 WAS the seams audit — reset confirmed by /reflect 2026-07-24)
Updated: 2026-07-24

CYCLE 11 AUDIT (2026-07-24, seams-audit lens): 8-agent fan-out (7 subsystem
auditors + 1 cross-cutting seams specialist) + personal verification of every
Medium (0 retracted). ~170 invariant checks against live code — ZERO
substantive drift (every PARTIAL was doc wording: INV-18 anchor rule, INV-23
audit-ordering claim, INV-01/30 "all mutating" overbreadth re lock-free
intake sends). Complete seam sweeps CLEAN: 158 RPC names all resolve, 16
enum-header pairs aligned, 16 triggers wired+gated, 42 script properties all
documented, no write-format/parser pair that fails to round-trip. Findings:
0 Critical / 0 High / 4 Medium / ~30 Low (4th consecutive no-High cycle; the
weight moved into the TEST LAYER — 3 of 4 Mediums are test-integrity).
MEDIUMS: M-1 updateTimeOffStatus lacked the INV-94 dup-date guard on the
to-Approved transition (Denied-to-Approved flip alongside an existing
Approved row double-deducts — the last creator of the H1 signature); M-2
the public-form test's FormSubmissionReceived witness row (synthetic actor
'EXTERNAL', Code.js:7748) escaped the TEST_ cleanup key — every full
runAllTests permanently appended one to the live AuditLog/compliance panel;
M-3 test_training_quizFlow writes the LIVE Quizzes tab and cleanupTestData
never sweeps Quizzes (a timeout-killed run orphans TEST_TRAINING_QUIZ into
the real manager quiz list); M-4 the registry-net/DOM partial lists are four
hand-maintained copies (run.js x3 + dom/boot.js PARTIALS) — only
PARSE_GUARD_PARTIALS is auto-tracked. KEY LOWS: L-1 sanitizeEmailSelections_
passed the four *Details objects through unbounded (SubformData cell
poisoning); L-2 the CSR Transfer tab had NO header validation (cross-repo
seam, silent wrong Transfer KPI on a column reorder); L-3 getMyMetricsRange
cached a failed trend read as fresh for the TTL; L-4 audit-panel truncated
flag false-negative on a CN-empty scan window; L-5 CN.EMAILED_AT raw-read
coercion sibling (untripwired); L-6 fields-only doc completion emails
"Signed"; tripwire false-pass holes (payload-contract nested-brace regex,
SUBMITTED_AT one-variable aliasing, no-mail-in-lock finally region +
depth-1 transitivity, registry nets single-quote-only); MIRROR_INDEX misses
3 documented mirrors (errBeacon caps hardcoded, KB_IMG cap unguarded,
CN_INTERACTIVE_FORM_IDS unindexed); behavioral-coverage gaps on
writeWitnessAuditLog_/health badge/self-test parse/typed signature
(presence-pins only). DOC DRIFT: admin endpoint count 24/28/30 across
CLAUDE.md sections; "fifteen" vs 14 itemized localStorage keys; umsLastView
compact-guard missing from the key list; TimesheetArchive health caption
says 1am (trigger is 6pm); stale "manager-gated" wording on the INV-136
amended endpoints; What's-new "X" button claim. Scan scores: Overall 8.5,
Correctness 8, Security 9, Data Integrity 8.5, Tz 8.5, Concurrency 8.5,
Test Coverage 7.5, Docs 8, GAS Practices 8.5, MgrUX 8, EmpUX 8.5,
Automation 8.5.

BATCH 1 IMPLEMENTED (M-1, M-2, L-1, L-2, L-3 — operator-selected):
- M-1 | Code.js | hasActiveTimeOffOnDate_ gained optional excludeRowIndex;
  updateTimeOffStatus re-runs the dup-guard (own row excluded) before the
  to-Approved deduct. Editor test test_updateTimeOff_dupApproveRejected
  (registered; Utilities.sleep(1100) keeps the two rows' SubmittedAt keys
  distinct; SUBMITTED_AT reads via normalizeAuditTs_ per the tripwire) +
  a Node source pin.
- M-2 | Tests.js | _deleteFormWitnessAuditRow_(token) called from
  test_publicForm_tokenLifecycle's finally; cleanupTestData now sweeps
  (a) FormSubmissionReceived audit rows containing 'example.invalid' and
  (b) orphaned FormTokens/FormSubmissions rows by the same reserved test
  domain (getSheetByName only — never provisions). First post-deploy
  cleanup also removes the LEGACY accumulated witness rows.
- L-1 | Code.js | CN_EMAIL_DETAILS_MAX_CHARS=16000 combined serialized cap
  enforced in validateEmailSelections_ (fires at Preview AND Send);
  sanitizeEmailSelections_ coerces non-object details to null. 3 behavioral
  Node tests (oversize rejected, normal passes, coercion).
- L-2 | Code.js + cn/script_callnotes.html | CSR_TRANSFER_EXPECTED_HEADERS
  (1-indexed = CSRT+1) + pure csrTransferHeaderMismatches_ + session-flagged
  validateCsrTransferColumns_ (the validateCdrColumns_ pattern); wired into
  getCsrTransferPerRepDaily_ (additive meta.columnWarning) and Automation
  Health (cdr.transferColumnWarning; client CDR card tone + a warnBox).
  3 behavioral Node tests + a CSRT-alignment pin + a MIRROR_INDEX entry.
- L-3 | Code.js | getMyMetricsRange: trendFailed marks the round; the cache
  put is gated on !trendFailed; response carries trendUnavailable:true
  (additive, client-ignorable). Node pin on both halves.
Tests: pure 319->327 /0, DOM 65/0, node --check x3 clean. One test-authoring
fix mid-batch: vm-realm array vs deepStrictEqual (switched to .length).

BATCH 2 IMPLEMENTED (M-3, M-4, L-4..L-18, tripwire holes, MIRROR_INDEX):
- M-3 | Tests.js | test_training_quizFlow wraps _withTestKb_ (fixture, not the
  live KB store); cleanupTestData sweeps TRAIN_QUIZ_TAB (live, TQ.TITLE) +
  fixture Quizzes/QuizAttempts (the F-7 gap).
- M-4 | run.js | REGISTRY_SCAN_PARTIALS derived from PARSE_GUARD_PARTIALS
  (minus index/form_public/icons) replaces the 3 hand lists; a new test
  tracks dom/boot.js PARTIALS against it. One derived source, auto-tracked
  via the existing index.html net.
- L-4 | Code.js | cnReadCallNoteAuditRows_ returns oldestScannedDay (window
  oldest, not oldest matching); getCallNotesAuditLog truncated keys off it.
- L-5 | Code.js + run.js | callNoteRowToObject_ emailedAt via
  cnTimestampString_; the INV-142 global scan extended to [CN.EMAILED_AT].
- L-6 | Code.js | notifyEmpDocSigned_(doc, signer, completedOnly) — a
  fields-only completion emails "Completed:", not "Signed:".
- L-7 | Code.js | kbGetUsageStats title join drops drafts (2 thin column
  reads — no BodyMd pull).
- L-8 | metrics/script_metrics.html | SPANISH_STATE.listSeq on the pending +
  resolved list loaders (INV-156 parity with the M-6 stats fetch).
- L-9 | form_public.html | updateFormProgress_ skips hidden conditional
  required fields (offsetParent guard).
- L-10 | script_tour.html | tourVisibleTarget_ — poll + paint require a
  VISIBLE (non-zero-rect) match; first visible wins on multi-match.
- L-11 | Code.js + Tests.js | TIMEOFF_MAX_DAYS_AHEAD=370 / _BACK=90 horizon
  in BOTH submit paths (rep tz / target tz); rejectsBadDate test extended.
- L-12 | Code.js | getIntakeSS_ memoized per execution (getAdpSS_ L-3
  pattern; test override never memoized).
- L-14 | Code.js | deletePunch keeps the personal-sheet mirror when a
  duplicate row of the same (emp,date,type) survives; dashboard canDelete
  backward-only (Math.abs dropped — matches C7).
- L-15 | script_core.html | mtRenderTable_ sortable-header onclick uses
  identifier-charset sanitization (not HTML-entity escaping in a JS-string
  context).
- L-16 | Code.js | archiveSheetRowsOlderThan_ preserves trailing columns
  (width = max(canonical, widest row)) + grows the archive grid if needed —
  INV-132 "never lose" now holds for hand-added columns.
- L-17 | cn/script_callnotes.html | TimesheetArchive health caption 1am→6pm.
- L-18 | Code.js | getFeatureFlags/getDeptRequestSla KEPT by decision with
  comments (they delegate to the same helpers getAdminConfig uses — no
  parallel logic; removal would churn gate tests/INV-136 for zero risk).
- Tripwire holes | run.js | payload-contract: balanced-brace + depth-masked
  key extraction (nested objects no longer hide keys — bite-checked);
  SUBMITTED_AT: new line-whitelist scan over Code.js+Tests.js (alias-proof —
  bite-checked); no-mail-in-lock: region ends at releaseLock() (finally
  pre-release now scanned) + TRANSITIVE sender closure over
  notifyAfter-stripped bodies (bite-checked with a wrapper pair); registry
  nets accept double-quoted literals.
- MIRROR_INDEX | run.js | +3 entries (CN_INTERACTIVE_FORM_IDS, errBeacon
  caps, KB_IMG cap); errBeacon test extracts CLIENT_ERR_MSG_MAX/STACK_MAX
  from Code.js (was hardcoded 400/1500); NEW guard test evaluates the kb
  paste-cap expression against KB_IMG_UPLOAD_MAX_CHARS.
Tests: pure 327->330 /0 (net of consolidations), DOM 65/0, node --check x3;
3 tripwire bite-checks fired + restored (python edits, no git checkout).

VISUAL AUDIT ADDENDUM (2026-07-24, operator-requested "option B"): a
static-render harness (session scratchpad visual/: production partials
inlined into one page, real headless Chromium via Playwright, fixture-backed
google.script.run mock, 20 scenarios = 8 views x light/dark x wide/compact/
mobile, frozen mid-shift clock). Findings V-1..V-10 (1 Medium, 6 Low, 3
Info); two apparent horrors PROVEN artifacts (off-viewport fixed drawer in
fullPage captures; fixed mobile nav stitching). BATCH 3 IMPLEMENTED
(V-1, V-5, V-6, V-7):
- V-1 | styles.html | `.app-shell > * { min-width: 0; }` — the shell main
  column's min-width:auto let note-card nowrap min-content force the 480px
  compact pop-out / 390px mobile to ~822px horizontal scroll (save rail +
  flags off-screen). Fix probe-validated pre-edit AND re-verified post-edit
  in the real partials: scrollWidth 822 -> 480, zero wide elements, ellipsis
  engages; wide mode re-shot unchanged. The shell-level twin of the
  Dashboard minmax(0,1fr) decision.
- V-5 | cn/script_callnotes.html | icon-label gap CSS for the Save &
  Compose / Open Email / Clear inner spans (icon+text share one span; the
  button's own flex gap never applied inside it).
- V-6 | script_core.html | TOOLS.develop gains shortLabel 'Training';
  mobile nav renders shortLabel || label (the full label wrapped 3 lines in
  the 7-item 390px bar). Sidebar keeps the full label.
- V-7 | script_core.html + styles.html | sb-user-id span + nowrap/ellipsis
  (the id wrapped mid-token "E-"/"1042" at the 168px default sidebar).
NOT implemented (visual backlog for a later pick): V-2 ribbon label
collision, V-3 coaching metrics undefined-guards, V-4 coaching ack raw
T-timestamp display, V-8 metrics hero dead space, V-9 reference tree row
wrap + full-width DRAFT pill, V-10 tz-chip wrap (verify on prod data).
Harness stays in the session scratchpad; committing it as test/visual/ was
offered, not yet requested. Tests: pure 330/0, DOM 65/0 after the batch.

## Pending / not yet done
- /reflect (close the cycle; resets the seams counter), PR + operator deploy.
- DONE 2026-07-24: the /sync-docs pass — doc-drift list (admin count 24/28/30, "fifteen" vs
  14 localStorage keys, umsLastView compact-guard, INV-23/18 wording,
  INV-94/129/132/142 amendments from batches 1+2, INV-136 stale
  "manager-gated" annotations, example.invalid cleanup key, Transfer-tab
  validation operator note, What's-new X-button claim).
- Behavioral pins for witness-loss/health-badge/self-test parse (coverage
  gaps CG-1/2/5) — deferred, noted as follow-on.

## Decisions made (so the next session doesn't re-litigate)
- M-1 guard excludes the row's own index — approving a lone Pending row is
  unaffected. Legacy pre-INV-94 half-day pairs with a still-Pending sibling
  now require denying the sibling first (fail-safe; matches the submit-path
  semantics, which already block creating such pairs).
- M-2 sweep key = the reserved-TLD recipient domain 'example.invalid'
  (production-impossible); chosen over changing the witness row's actor
  (production code stays untouched).
- L-1 cap is COMBINED (16k across the four objects) and rejects loudly at
  validate (both Preview and Send) rather than truncating silently.
- L-3 still returns the degraded result for the current render — only the
  cache write is skipped (retry on next open).

## Where I left off
Cycle 11 fully closed (audit -> batches 1+2 -> sync-docs -> visual batch 1 ->
reflect -> PR #141 MERGED) + follow-up visual batch 2 (V-2/3/4/8/9/10 +
test/visual harness adoption) implemented, verified, and pushed as 0779689 on
the restarted claude/broad-scan-seams-audit-88ihg0. Next: PR for the follow-up
batch when the operator asks; then the operator deploy (cd web-app && clasp
push -f + New version + editor runAllTests — retro-purges legacy EXTERNAL
witness rows + TEST_ quiz orphans). Remaining known visual polish: none — the
V-backlog is fully cleared. Next audit cycle is 12 (seams counter 0/4).
