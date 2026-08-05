---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- C17-2 — updateTimeOffStatus compared TO.STATUS case-sensitively on the balance-mutation path (re-deduct / skipped restore / defeated Reconciled terminal guard on a hand-edited cell)
- C17-5 — a structured {error} from the CN loaders wiped last-good notes and rendered the empty-day state (INV-187 class, invisible to the A12 scan)
- C17-6 — exportCallNotesRange presented a PHI export as complete while silently skipping unreadable rep Sheets
- C17-7 — three manager lazy cards (punch-adjust queue, PTO-recon, sheet doctor) rendered NOTHING on failure — a failed read byte-identical to "nothing pending"
- C17-1 — the A2 tripwire's regex never matched styles.html's `[data-compact="1"]` form, so the shared stylesheet was unguarded by the scan that claims to cover it (High, test integrity) — plus the live obligations the fixed scan surfaced

Files modified: web-app/Code.js, web-app/cn/script_callnotes.html, web-app/tc/script_manager.html, web-app/styles.html, test/client/run.js, .cycle/STATE.md, .cycle/HISTORY.md (cycle-16 archive)

CHANGES:
C17-2 | web-app/Code.js | TO.STATUS normalized ONCE (F8/INV-183 pattern): `oldStatusRaw` (revert + audit note only) + lowercase `oldStatus` for every comparison incl. the S1.3 'reconciled' terminal guard, the M-1 dup-date re-check, both balance transitions, and the notify no-op check (now `oldStatus !== newStatus.toLowerCase()` — without this, lowercasing alone would have emailed on a no-op re-approve). newStatus is already server-whitelisted to canonical case.
C17-5 | web-app/cn/script_callnotes.html | cnLoadToday_/cnLoadDateRange_: the wipe now lives ONLY in the not-configured (enrollment) branch; other {error}s preserve last-good, set rollingLoadFailed/historyLoadFailed, and null rollingEntry/historyEntry (a failed round is never served as fresh — INV-129 rule; all stamp readers verified null-safe via viewCacheFresh_). Transport handlers set the same two, unconditionally (state-before-view-check, the file's own rule). cnRenderStack_/cnRenderHistoryStack_ render errorStateHtml_ when a failed load has NO last-good, so a cold failure never reads as an empty day.
C17-6 | web-app/Code.js + web-app/cn/script_callnotes.html | Per-rep catch collects `skippedReps`; success response carries the names (additive field — old client ignores it, old server never sets it); audit note appends `; skippedReps=N (ids) — INCOMPLETE`; all-skipped-with-zero-notes returns a read-failure error instead of "No notes found". Client export handler shows a warn toast naming the unreadable reps instead of the unconditional success toast.
C17-7 | web-app/tc/script_manager.html | All three lazy loaders split `res.error` from genuinely-empty (only the latter may render '') and their failure handlers render errorStateHtml_ (message includes the server error; the helper escapes internally — no outer esc(), per the A12 companion pin). The adjust queue's message says the queue "may NOT be empty"; the two diagnostics say "a failed check, not a clean result".
C17-1 | test/client/run.js + web-app/styles.html | Regex widened to `:root\[data-compact[^\]]*\]`; styles.html then contributed 9 obligations, resolved per-selector: `.actions` + `.field-row` gained REAL @media(540px) rules (2×2 punch grid with prime spanning / stacked modal field pairs); DEAD compact overrides removed for `.actions-grid`, `.ledger` (×3 rules), `.ts-summary`, `.leave-balance-row` (INV-184 — grep-verified zero markup emits any of them; base rules left as a follow-on); `.preset-grid`'s compact `grid-template-columns` dropped (it re-stated the base's identical tracks — gap-only change); `.ts-recent-row` (auto 1fr auto content tracks) and `.hero` (only live consumer `.dash-hero` sets display:block) allowlisted WITH reasons in A2_INVERSE_OK.
Pins | test/client/run.js | 4 new comment-stripped (INV-188) pins — C17-2 (TO.STATUS read exactly once + lowercase comparisons + raw revert), C17-5 (single wipe site per loader, both-handler flags, nulled stamps, cold-failure error renders), C17-6 (push/response/audit/all-skipped/client-toast), C17-7 (≥2 errorStateHtml_ per loader, no empty failure handler, error-vs-empty split). ALL FOUR bite-checked individually (mutate → exactly that pin fails → restore). C17-1 is pinned by the fixed scan itself.

TEST RESULTS: pure 407→411 passed / 0 failed; DOM 69/69; `node --check` clean on Code.js/Tests.js/DevTools.js; visual matrix re-shot after the styles change — 29/29 scenarios, 0 missing fixtures, 0 horizontal overflow; clock mobile eyeballed. Regression Scenarios (Test Command = manual, overlapping subsystems): S1/S2 NOT APPLICABLE in-container (editor-only — run post-deploy; the 411 pins + syntax check are the proxy). S4 NOT APPLICABLE (live sheet) — code-read verified canonical-case rows take byte-identical branches. S13 NOT APPLICABLE (function untouched). S18/S23 PASS by proxy (DOM harness exercises the CN render paths; loader success paths unchanged). S25 PASS by proxy (compact scenarios 0 overflow; live compact rules unchanged — only dead ones removed, preset-grid keeps its gap). S29 NOT APPLICABLE (live) — response field additive both directions. S39 PASS by proxy (clock wide/compact/mobile shots + 0 overflow).

REGRESSION RISKS:
- C17-2 changes behavior ONLY for non-canonical-case cells (previously misread); canonical rows verified identical. A mixed-case 'reconciled' row now correctly REFUSES status changes where it previously allowed them — that is the fix, but an operator who relied on flipping such a row must hand-correct the cell case first.
- C17-7 renders warn cards on transient dashboard blips where blanks appeared before — accepted noise, the cycle-16 "warn cards where blanks used to be is the fix working" posture.
- C17-6's audit note grows with the skipped list (rep IDs only, bounded by roster size — no cell-limit risk at this team's scale).
- styles.html: new 540px rules affect only ≤540px viewports; desktop and pop-out byte-identical (compact rules for live classes untouched).

INVARIANTS AT RISK: None violated. INV-03/94 transition semantics preserved (comparisons normalized read-side only); INV-129 extended (CN loaders now obey cache-only-on-success); INV-175/187 advanced; INV-184 honored (dead rules removed, not bred); INV-183's family gains a CLOSED fourth column (TO.STATUS). Doc text for INV-183, the A2 gotcha, and INV-46's "skipping that rep" clause needs updating — see below.

NET SCORE: 5 − 1 = 4
(Reflect: C17-5 YES would have fired this month (any transient server error on the highest-traffic surface); C17-7 YES (transient dashboard RPC failures over a month are likely, and the queue misread is the consequence); C17-1's interface half YES (the .actions empty-track/wrapping row was live for every ≤540px viewport right now); C17-2 NO (requires a hand-edited cell); C17-6 NO (requires an unreadable Sheet during an export). New failure modes: 1 — C17-5's preserve-last-good means a rep who misses the toast can briefly read pre-failure notes as current within the same view session; bounded by the nulled freshness stamp (next enter refetches) and identical to the SWR staleness tradeoff every sibling surface already accepts. Low/fail-safe.)

OPERATOR ACTIONS / DEPLOY:
- Run `runAllTests()` from the Apps Script editor after deploying (S1/S2 + the S4 walk could not execute in the container) | BLOCKS DEPLOY: N (post-deploy verification)
Deploy: Server + Client (shell/TC/CN) + Test Suite: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy. (Test-layer files don't ship — no separate step.)

FOLLOW-ON ITEMS:
- The rest of the cycle-17 scan (~30 findings): Mediums C17-3 (getMetricsAmbient unguarded roster walk), C17-4 (ATT zero-as-data in the team benchmark), C17-8 (tour button contrast), C17-9 (managerSaveDayRange lock amplification), C17-10 (training header clip), C17-11 (split-send audit gap), C17-12 (form_public hidden-field persistence), C17-13 (Q43 negation phrases), C17-14–17 + ~25 Lows — see the scan report / STATE.md.
- Dead-CSS cluster BASE rules in styles.html (.ledger/.ledger-3, .hero-clock*, .actions-grid/.action-btn, .ts-summary, .leave-balance-row) — the compact halves are now gone; remove the bases + the stale "ledger" KDD paragraph together.
- cnLoadDate_ is dead (zero callers) but documented as a live guarded loader — remove function + doc mention together (A4 precedent).
- An editor test `test_updateTimeOff_mixedCaseStatusCell` should be WRITTEN AND RUN at next deploy (deliberately not shipped unexecuted from the container).
- The four other INV-187 cross-rep walks C17-6 did not touch (weekly digests, manager search, taxonomy/trends, unresolved-count cache).

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md A2 gotcha: the scan now matches both attribute forms; styles.html genuinely contributes; new carve-outs (ts-recent-row, hero) and the two new 540px breakpoints; the "checked >= 8" floor note.
- INV-183: record TO.STATUS as a CLOSED fourth column (normalize-once + pin), DR's three raw readers still open.
- INV-46 (+ the export mention in INV-32's orbit): replace "skipped rep … doesn't fail the run" with the outcome-carrying contract (skippedReps on response + audit row, INCOMPLETE marker).
- Running pure-test count 407 → 411; A2_INVERSE_OK now has three entries.
- Scan-found doc drift (not from this batch, fix in the same pass): dead cnLoadDate_ in the loader gotcha; the retired "ledger" KDD paragraph; installAutomationTriggers/removeAutomationTriggers listed under the roster-isManager gate list when both gate on MANAGER_EMAILS; the stale Code.js:593 comment claiming mutating endpoints invalidate the ambient cache.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
