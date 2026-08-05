---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (cycle-17 batch ③ tripwire-integrity sweep + batch ④ interface set)
Batch ④ (interface):
- C17-8 — tour primary button was #fff on theme-flipping --accent (~1.4:1 in dark on the tour's only advance button) → var(--paper-card)
- (banner) — instance banner was #fff on dark-flipped --warning-deep → fixed amber #8a4500 (INV-166: fixed surface, fixed colors)
- C17-10 — training checklist header clipped "My Training" at 390px (compact-only flex-wrap; the file's FIRST media query added: wrap ≤560px, tiles full-width)
- (review-due row) — the stale-note quote overlapped the ✓ Reviewed button at 390px: .kb-land-rd-open now wraps and the note takes flex-basis:100% (its display:block intent, defeated by the flex context)
- (.tr-section-h) — used on two manager surfaces (EmpDocs team dashboard, Coaching "By employee") but DEFINED NOWHERE and rendered as a <div>: now real <h2>s with a defined style in the shared training partial (INV-178 + the reverse of INV-184)
- (mode switch) — the PDF⇄Fillable switch was a listener-bound <div>: keyboard-dead with NO other path to the fillable-form flow, invisible to A1 (which only sees inline onclick) → real <button type=button> with role=switch + aria-checked, re-rendered in step (INV-173/174)
- (disclosures) — CN more-menu toggle + audit-history expander now carry aria-expanded, kept in step on open/close/both transitions (INV-174)
- (kbMd_ fence) — a MID-LINE ```x``` pair was stashed into a block whose sentinel was never re-expanded: content vanished + a stray "C0" glyph rendered. Extraction now matches BLOCK fences only (opening ``` at line start, closing ``` alone on its line), reconstructing the LEGACY body shape byte-identically for real blocks; inline pairs stay literal escaped text

Batch ③ (tripwire integrity, INV-179 applied proactively):
- A13 — class set DERIVED from markup by the naming convention (…card-label/…card-title/…seclabel/…section-h; the hand list had missed .tr-section-h); regex fixed so `class` need not be the FIRST attribute; NEW check: every derived heading class must also be DEFINED in some stylesheet
- A12 — scan widened from LINE-scope to STATEMENT-scope (failure marker + empty-class may now be split across concatenation lines; window extends while the statement visibly continues, capped 8 lines, deduped)
- A11 — vocabulary widened with the disclosure classes 'collapsed'/'expanded'; 'open'/'show' deliberately NOT admitted (dry-run: 17 of 19 hits are the `.overlay.open` dialog-visibility idiom, governed by the ensureOverlay focus lifecycle + DOM harness — documented in the tripwire comment); one reasoned A11Y_DECORATIVE entry (sidebar width-driven label hiding)
- V-1 — the -deep alias set DERIVED from the token file (was a hand-typed name group in the regex); a NEW alias is swept into the in-oklab check automatically and fails until it gets a behavioural hue-pair entry
- (fixtures, INV-185) — three payload-shape drifts fixed in test/visual/mock.js: coaching patientTrx→patientTRX (the TRX chip was unrenderable in every screenshot), kbGetReviewDue usage30→views + total/cap/dueDays added (the F18 cap-note path is now renderable), kbGetContentRequests {requests:[]}→the real {open, resolved, openCount}; pinned by a fixture-shape pin
- (cdrQueueInventory_) — the Transfer H:R occupancy scan re-hardcoded 7..17 beside a comment calling bare offsets the F1 class → now derived from CSRT_QUEUE_COL_FIRST/LAST

Files modified: web-app/script_tour.html, web-app/styles.html, web-app/train/script_training.html, web-app/train/script_empdocs.html, web-app/train/script_coaching.html, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, web-app/Code.js, test/visual/mock.js, test/client/run.js (+ .cycle checkpoint files)

CHANGES: (per-finding detail above; pins:) fence behavioral cases folded into the existing #6 kbMd_ test (inline pair content preserved, no sentinel leak, trailing-text-after-close preserved); A13 gains the CSS-definition check; 4 new pin tests (tour/banner color rule; .tr-head real viewport wrap; switch semantics + both disclosures' aria; fixture payload shapes). Pure 415→419, DOM 69.

TEST RESULTS: pure 419/0; DOM 69/69; `node --check` clean. Bite-checks: A12 statement-scope (planted multi-line violation trips), A13 first-attr (id-before-class div trips), V-1 derivation (planted --zz-deep trips coverage), fence (regex revert trips the content-preservation case), tour color revert trips. One assertion was wrong on first write (it demanded literal backticks where the inline-code pass legitimately renders a code span — relaxed to content preservation; the code was right). One self-inflicted INV-188: a fixture-fix comment containing the old field name tripped the fix script's own assert. Visual re-shoot was running at checkpoint — verify 29/29 + 0 overflow + eyeball training-light-mobile (heading now wraps), reference-light-mobile-bottom (no quote/button overlap), clock/dark unchanged. Scenarios: S62/S64 (KB render paths) PASS by proxy via the kbMd_ pin suite; S67 (training checklist) PASS by proxy (markup change is heading-tag-only); S25/S39 unchanged-by-inspection; S1/S2 NOT APPLICABLE (editor-only).

REGRESSION RISKS:
- kbMd_ fence: block-fence rendering byte-identical (legacy body shape reconstructed); the changed cases are inline pairs (previously content-destroying) and a single-line fence with trailing text (previously mis-extracted) — both now render as literal/escaped text. An article relying on the OLD mis-extraction's accidental output would render differently — none can reasonably exist (the old output was a vanished block + stray glyph).
- .kb-land-rd-open wrap: at desktop the stale-note quote now takes its own line (previously inline) — deliberate, matches its display:block intent.
- The mode switch as a <button>: UA button chrome reset in CSS; click wiring unchanged (listener attaches by class).
- tr-section-h as <h2>: UA heading margins overridden by the new rule (margin: 18px 0 8px).
- Tripwire widenings only ADD obligations; all current code passes.

INVARIANTS AT RISK: none violated — INV-166/173/174/178/179/184/185/188 all advanced. The A13/A11/V-1 derivations narrow future drift the same way A2/A12 did in cycle 16.

NET SCORE: 8 − 0 = 8
(Production-class fixes: C17-8, banner, C17-10, review-due row, tr-section-h, mode switch, disclosures-aria, kbMd_ fence = 8 (the batch-③ tripwire/fixture items are structural/test-quality, not counted). Fired-this-month YES: C17-8 (any dark-mode new hire hitting the tour NOW), C17-10 (every phone view of My Training NOW), review-due row (any manager phone view with a stale-flag note). New failure modes: none identified — all changes are strictly-visible improvements or additive semantics.)

OPERATOR ACTIONS / DEPLOY:
- None beyond the standing post-deploy `runAllTests()` | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- form_public.html accordions toggle 'open' with no aria and are OUTSIDE A11Y_SCAN_PARTIALS (standalone page) — surfaced by the A11 dry-run; genuine gap, deliberately not fixed here (out of batch scope).
- The A13 derivation only sees a heading class as the FIRST class in the attr (class="x card-label" escapes); noted in-code.
- Full fixture-shape derivation (generating mock payload skeletons from server return sites) remains the batch-⑦-scale promotion; the three-shape pin covers the known drifts only.
- Remaining batches ⑤ (server hardening stragglers), ⑥ (structural/growth), ⑦ (visual-lens expansion).

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md A11/A13 tripwire descriptions (derived sets, disclosure vocabulary, the open/show decision); V-1 entry (derived alias set); A12 gotcha (statement-scope); INV-185 (three fixture drifts fixed + shape pin).
- Test count 415 → 419.
- Batch ② sync-docs items are STILL OWED (six items in its block) — fold both batches into one /sync-docs pass.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
