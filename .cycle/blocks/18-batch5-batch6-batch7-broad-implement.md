---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Batch 5A | All 15 `ensureOverlay` dialogs carried `role="dialog"` with NO accessible name; five also NESTED a second dialog inside themselves
- Batch 5B | NOT SWEPT — the enforced census is 252 controls against an audit estimate of ~65 (~3.9x); delivered as a measured RATCHET instead (see below)
- F14 | The `getMyMetrics` visual fixture ignored its date argument, rendering a state the server cannot produce
- F8  | Time / PTO — the most recently restructured rep-facing page — had no mobile visual scenario
- F3  | `getTeamMetrics` was the only uncapped range endpoint, and it was opened to every rep on 2026-08-18
- F11 | ViewUsage / ClientErrors retention — investigated, deliberately DOCUMENTATION-ONLY (see follow-ons)

Files modified:
- web-app/script_core.html
- web-app/kb/script_kb.html
- web-app/cn/script_callnotes.html
- web-app/train/script_training.html
- web-app/train/script_empdocs.html
- web-app/tc/script_timeoff.html
- web-app/intake/script_intake.html
- web-app/Code.js
- test/client/run.js
- test/visual/mock.js
- test/visual/shoot.mjs

CHANGES:
5A | web-app/script_core.html | `ensureOverlay` gains `opts.label` (aria-label) and `opts.labelledBy` (aria-labelledby). Setting one CLEARS the other, deliberately: an `aria-labelledby` pointing at a missing id yields NO accessible name at all, which is strictly worse than an `aria-label`, so a stale id can never leave a dialog anonymous.
5A | 7 partials (kb / cn / core / training / empdocs / timeoff / intake) | All 15 call sites (16 including the composer's two mount points) now pass a label: Roster, Search synonyms, Revision history, Reference item editor, Form submission, Patient timeline, Department email composer, External email composer, What's new, Training item, Quiz, Quiz editor, Employee document, Pay statement, Intake preview.
5A | kb/script_kb.html, intake/script_intake.html | Removed FIVE nested `role="dialog" aria-modal="true"` from inner `.modal` divs. `ensureOverlay` already marks the OVERLAY as the dialog, so these were dialogs inside dialogs; the roster's inner `aria-label="Roster"` moved up to the overlay where it now actually names the dialog. The six STATIC modals in modals.html are the real un-nested dialogs and were correctly named all along, as were `uiConfirm`/`uiPrompt` (verified, untouched).
5B | test/client/run.js | `A14` RATCHET + `a11yUnnamedControls()`, deriving its file set from `A11Y_SCAN_PARTIALS` + form_public.html (INV-179) and stripping HTML comments FIRST — the INV-188 lesson applied to MARKUP, since `<input>` inside a comment is not a control and counting them inflated an early census by ~30. Splits the debt by remediation cost: 75 have an adjacent `<label>` missing only a `for=`, 61 are placeholder-only, 116 have nothing. Baseline pinned at those numbers with a two-sided assert — it fails if the count RISES (a new unnamed control) and also if it DROPS by >4 without the baseline being lowered in the same commit, so the ratchet cannot silently drift.
F14 | test/visual/mock.js | `getMyMetrics` is now `function (date)` echoing the date it was asked for. It was a static `date: todayIso`, so with the default preset (Yesterday = previous workday) the shot rendered "TODAY · % ANSWERED" beneath a pressed "YESTERDAY" chip — the client's label logic is correct; the FIXTURE was lying. Fifth instance of the INV-185 drift class.
F8 | test/visual/shoot.mjs | New `timeoff-light-mobile` scenario (matrix 42 → 43).
F3 | web-app/Code.js | `getTeamMetrics` gains a 92-day span cap, matching `getMyMetricsRange`. Placed BEFORE the cache lookup (pinned) so an out-of-range span cannot mint an org-wide cache key on its way to being refused.

TEST RESULTS: passed.
- Pure harness: 576 passed, 0 failed (was 570; +6 tests)
- DOM harness: 75 passed, 0 failed (unchanged)
- node --check: Code.js / Tests.js / DevTools.js clean
- Visual matrix: 43 scenarios, 0 missing / 0 overflow / 0 non-network console errors
- Bite-checks: 11 mutations, all confirmed biting. FOUR did not bite on first attempt: three because I had written NO pin for F3/F14/F8 (the fix existed, the pin did not — caught only because every mutation was checked), and one because the assertion was weaker than the property (`/aria-label/` also matches `removeAttribute('aria-label')` and `aria-labelledby`, so the setters could be deleted and the pin still passed; it now asserts the two `setAttribute` calls specifically).
- TWO pre-existing pins were test doubles encoding the OLD shape and were reconciled as part of the fix: `V-14` regexed `getMyMetrics: \{` (now a function) and my own A14 baseline had been measured with an ad-hoc walk of every .html rather than the scan's own derived file set — a different population that would have made the ratchet fire on day one.
- 5A verified in a REAL BROWSER, not just by attribute: `getByRole('dialog', { name: 'Pay statement' })` matches, so the name reaches Chromium's accessible-name computation; an overlay opened without a label still resolves to none, proving the option is what does the work.
- Regression Scenarios walked (Test Command is `manual`): S42 PASS (Team Metrics presets are 7D/30D — all inside the new 92-day cap; a >92 custom range now returns the same error text its sibling uses); S46 PASS (Time/PTO renders, now also shot at 390px); S54 NOT APPLICABLE (uiConfirm/uiPrompt build their own overlay and were already `aria-labelledby`-named — verified, untouched); S62/S64 PASS (Reference tree + drawer render; the KB dialogs lost only their REDUNDANT inner role); S41 NOT APPLICABLE to production (the F14 change is harness-only); S2 NOT RUN (editor-only).

REGRESSION RISKS:
- `ensureOverlay`'s new options are OPTIONAL — a caller passing neither is byte-identical to before, so nothing outside the 15 labelled sites changed behaviour.
- Removing the nested `role="dialog"` cannot lose a name: in four of the five cases the inner element had no `aria-label` at all, and in the fifth (roster) its label was moved up to the overlay. Verified 0 nested dialogs remain outside modals.html.
- F3 is a NEW REFUSAL: a manager who had bookmarked or scripted a >92-day Team Metrics range now gets an error where they previously got data. That is the intended fix, but it is a behaviour change for a real user, not purely internal. The UI's own presets cannot produce such a range.
- The A14 ratchet's DOWNWARD assert means a legitimate sweep will fail CI until the baseline is lowered in the same commit. That is deliberate (it prevents drift) but it will surprise whoever does the sweep, so it says so in its own failure message.
- F14/F8 touch only the visual harness; no production code path.

INVARIANTS AT RISK:
- INV-83 (ensureOverlay is the sanctioned overlay factory, Esc/focus lifecycle) — EXTENDED, not risked: the focus-trap, close-hook and restore behaviour are untouched; only naming was added.
- INV-173/174 (real controls, exposed state) — the same family; A14 adds the NAME dimension those two do not cover.
- INV-179 (derive the scanned file set) — honored: A14 derives from `A11Y_SCAN_PARTIALS`.
- INV-185 (a fixture must mirror the server) — F14 is a direct application; the fixture now responds to its arguments as the endpoint does.
- INV-188 (strip comments before scanning) — honored, and extended to MARKUP comments, which is a new surface for that rule.
- INV-66 (rep-visible team aggregate) — F3 caps the range but does not change what a rep receives; the `repView` strip is untouched.
- No other invariant touched.

NET SCORE: 3 − 0 = 3
(a) Would it have fired in production this month? 5A YES — every screen-reader user opening any of the 15 dialogs heard "dialog" with no name, and five heard a dialog inside a dialog; F3 NO as an observed incident (it is an abuse/cost surface newly reachable by reps, not a fault anyone hit); F14 and F8 are harness-integrity, not production. Counting 5A as one production fix, F3 as one, and the F14 fixture lie as one (it was actively misleading every visual review of My Stats).
(b) New failure modes introduced? None. F3's new refusal is the intended contract; the ratchet's downward assert is a deliberate, self-describing CI behaviour.

OPERATOR ACTIONS / DEPLOY:
- None new. This batch adds no Script Properties, triggers or migrations | BLOCKS DEPLOY: N
- Carried from Batches 3+4 and still outstanding: re-run `installAutomationTriggers()` (accrual credit → 18:00), run `runAllTests()` after deploying, and answer whether any rep works Saturdays or Sundays | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.
(Not complete in production until the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Batch 5B is the big one and is NOT done.** 252 controls need an accessible name (75 adjacent-label, 61 placeholder-only, 116 nothing), against an audit estimate of ~65. The 75 adjacent-label cases are mechanical (`<label>State</label><select id="cnS-state">` → add `for=`); the 116 with nothing need an author to decide what each control is CALLED, and 92 of the total sit in `cn/script_callnotes.html` inside template-literal render functions where a bad edit breaks rendering. Realistic scope is multi-day, not the ½–1 day estimated. The ratchet holds the line meanwhile.
- **F11 (ViewUsage / ClientErrors retention) was deliberately left as documentation.** Both tabs grow without an archive or purge tier while every other store has a documented retention posture. Their READS are already tail-bounded (8000 / 2000 rows) so nothing slows down; the exposure is sheet-size limits over years. Building a purge trigger would mean a new destructive trigger + a new retention window + new operator state — a feature, not the "note/plan" the finding called for, and the retention model is deliberate per store.
- NOTICED, NOT FIXED (out of scope): `modals.html` contributes 21 of the unnamed controls even though its six dialogs are correctly named — the dialogs were audited, their FIELDS were not.
- Batch 8 (completeness gaps) remains untouched: Offerings browse view, manager pay-statement UI, print stylesheet.

DOCUMENTATION UPDATES NEEDED:
- INV-83: record that `ensureOverlay` now names its dialog, that `label`/`labelledBy` are mutually exclusive by construction, and that an inner `.modal` must NOT repeat `role="dialog"`.
- New invariant (or an INV-173/174 amendment): a form control needs an accessible NAME, a placeholder is not one, and A14 is a ratchet with a stated target of zero — including the census split so the next author knows which bucket is cheap.
- INV-66 / the Metrics KDD: `getTeamMetrics` is now span-capped at 92 days.
- INV-185: add F14 as the fifth instance, with its new rule — a fixture whose response shape depends on its ARGUMENTS must be a function of them, not a static object.
- INV-188: note that the strip-comments rule applies to MARKUP comments too, not only JS.
- Visual Audit Stage: matrix 42 → 43; Time / PTO now has a mobile scenario.
- Test-count narrative: pure 570 → 576.
- Operator State Checklist: ViewUsage / ClientErrors have no retention tier (the F11 note above).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
