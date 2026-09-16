---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: SP1 (Mark-resolved never mutated the list state, so the unclaimed count, the Pending header and the SWR cache all went stale) · SP2 (no in-flight signal and no exit on a resolved card) · SP3 (Expand/Collapse word-button → chevron)
Files modified: web-app/metrics/script_metrics.html, web-app/styles.html, test/client/dom/runDom.js, CLAUDE.md (derived DOM count 113 → 114), .cycle/STATE.md (estimate line)
Estimate: S (~2 h) — recorded in STATE.md 2026-09-16 BEFORE the first edit
Actual: ~1.5 h

CHANGES:
SP1 | web-app/metrics/script_metrics.html | `spanishResolve_` ended in `card.remove()`. The DOM node went; `SPANISH_STATE.pendingRes.pending` did not — and that array is what `spanishUnclaimedCount_` folds for the Auto-assign button, what the "Pending · N" header counts, and (because `cacheHalf` shares the object by REFERENCE) what the SWR cache serves on re-entry. New `spanishRemovePendingLocal_(tid)` mirrors `spanishSetClaimLocal_`: splice from `pending`, drop the thread's `bodies`/`expanded` entries, refresh the count SYNCHRONOUSLY. It deliberately does NOT re-render — the caller owns that, because the card has to finish leaving first.
SP2 | web-app/metrics/script_metrics.html, web-app/styles.html | Two halves, and the in-flight half was WIRING, not new work: `.sp-task.is-busy` + `@keyframes spTaskBusy` were written for this exact action on 2026-08-24 ("the card now carries its own busy treatment") and were never applied to a card — only the auto-assign BUTTON used the class. Now applied during the RPC and cleared on failure. The exit is new: `.sp-task.is-leaving` + `@keyframes spTaskLeave`, driven by `spanishResolveDone_`, which re-renders on `animationend` with a `SP_LEAVE_FALLBACK_MS` (400ms) timeout fallback.
SP3 | web-app/metrics/script_metrics.html, web-app/styles.html | The toggle renders `icon('chevronUp'/'chevronDown', 14)`. The words WERE the button's accessible name, so the label moved to `aria-label`+`title` via one `spanishToggleLabel_` used by both the card markup and the toggle path. The five call sites that each set `btn.textContent` collapsed into `spanishToggleBtnState_(btn, 'open'|'closed'|'loading')`, which sets the chevron, `aria-expanded` and the name together. Styling scoped to `.sp-toggle`, never `.sp-more` (shared with Mark-resolved — g70). Loading spins the chevron via the existing `@keyframes spin`.
SP3 | test/client/dom/runDom.js | The A5 pin encoded the OLD text button and was updated as part of the fix, not reactively: it now asserts the ACCESSIBLE NAME, because a `textContent` assertion would silently pass against an unnamed icon button.
SP1/SP2 | test/client/dom/runDom.js | New pin: a failed resolve keeps the row, the count and clears the busy state; a successful one drops it from `pendingRes.pending`, updates the count BEFORE the animation finishes, and a re-render from the same state does not resurrect it. Count assertions read the RENDERED button text, never `spanishUnclaimedCount_()` — calling the counter would prove the counter, which was never broken.

TEST RESULTS: PASSED. Pure harness 827/827 · DOM harness 113 → 114, 114/114 · `lint-server` clean across 16 server files · `counts --check` green after the derived DOM row moved 113 → 114.

Bite-checks — 5 mutations, 5 bites (run against the DOM harness by hand; `scripts/bite.sh` drives the PURE harness only, so it does not reach these pins):
  BITES — `card.remove()` restored in place of `spanishResolveDone_`
  BITES — the count refresh dropped from `spanishRemovePendingLocal_`
  BITES — the in-flight class left stuck after a failed resolve
  BITES — the toggle's `aria-label` stripped from the card markup
  BITES — `spanishToggleBtnState_` stops updating the label (rendered vs toggled disagree)

REGRESSION SCENARIOS (Test Command is `manual`):
  S80 Spanish Inbox — resolution-share chart | NOT RUN IN THIS CONTAINER — needs a deployed instance + a browser; neither exists here. RELEVANT: the scenario's "mark a pending request resolved manually and refresh" step is the exact path SP1 changed. The share chart reads `resolvedRes`, which this batch does not touch, and `spanishRenderList_` already called `spanishRenderShare_` first, so the chart re-renders on the resolve path now where before it did not re-render at all. Worth an operator eye.
  S105 Spanish Inbox — manager auto-assign | NOT RUN IN THIS CONTAINER (same reason). Its "read the button's label" step is what SP1 fixes; the DOM pin now covers the label/count coupling automatically.
  S54 uiConfirm/uiPrompt | NOT APPLICABLE — the confirm contract is unchanged (same `uiConfirm` call, same options).
  Visual matrix (`spanish-light-wide`, `spanish-expanded-light-wide`, `spanish-light-mobile`) | NOT RUN — the matrix is manual. The expanded scenario drives `spanishExpand_(document.querySelector('.sp-more[data-thread]'))`, which still resolves (the toggle keeps both `.sp-more` and `data-thread`) and DOM order is unchanged, so the scenario behaves identically. See FOLLOW-ON ITEMS.

REGRESSION RISKS:
- `spanishRemovePendingLocal_` does NOT re-render, unlike its sibling `spanishSetClaimLocal_`. A future caller copying the sibling's shape could forget the re-render and see a correct count against a stale list. Mitigated by naming it in the doc comment; the asymmetry is deliberate and stated.
- `spanishResolveDone_` re-renders on `animationend` OR a timeout, whichever is first, guarded by a `done` flag so the list cannot re-render twice. If both were somehow suppressed the list would hold a row that state no longer has — but the COUNT would still be right, which is the deliberate ordering.
- New CSS adds only new selectors (`.sp-task.is-leaving`, `.sp-more.sp-toggle`); no existing rule was modified, so no specificity collision was introduced. `.sp-more:hover`'s underline is overridden only within `.sp-toggle`.
- The `bodies`/`expanded` cache entries for a resolved thread are now deleted. Nothing else reads them for a thread absent from `pending` (`spanishIsExpanded_` requires both), so this frees memory without changing behaviour.

INVARIANTS AT RISK: None.
- INV-174 (aria-expanded kept in step) is STRENGTHENED — it was maintained at five independent call sites and is now maintained at one.
- INV-173 (a real `<button>`) holds; the element is unchanged, only its content.
- g70 (a class-wide attribute write assumes every member of the class is yours) was the live hazard in SP3 and is respected: every new rule is scoped to `.sp-toggle`, never to `.sp-more`, which Mark-resolved shares.
- g67 (a cached list of TASKS owes an invalidation from every flow that COMPLETES one) is the invariant SP1 RESTORES.
- INV-128 (design-token hygiene) — the new rules use `var(--ease)` only, already defined; the pure harness's token tripwire is green.

REFLECT:
SP1 — (a) would it have fired in production this month? YES. It fires on every manual resolve, and the operator observed it. (b) new failure mode? NO.
SP2 — (a) YES for the missing in-flight signal (the operator asked for it, and the CSS for it had been dead since 2026-08-24). (b) NO — the animation is decoration with a timeout fallback, and the count never depends on it.
SP3 — (a) NO. A word-button is not a defect; this is an interface improvement, scored as a production fix under the R18 rule (cycle ≥12 counts user-visible interface defects), but conservatively I am scoring it 0 because nothing was broken.
NET SCORE: 2 production fixes − 0 new failure modes = 2

OPERATOR ACTIONS / DEPLOY:
- `clasp push -f`, then cut a New version deployment so open clients pick it up | BLOCKS DEPLOY: N (nothing here is server-side; the change is inert until pushed)
Deploy: N/A — no Deploy Command configured in `.cycle/config.md`; the project's documented step is `clasp push -f` + Deploy → Manage deployments → New version.

FOLLOW-ON ITEMS:
- `test/visual/shoot.mjs`'s `spanish-expanded-light-wide` drives `document.querySelector('.sp-more[data-thread]')`. Both the expand toggle AND the Mark-resolved button carry `.sp-more` + `data-thread`, so the selector has always been ambiguous and depends on DOM order. Pre-existing — not introduced or worsened here — but now that `.sp-toggle` exists the selector can be tightened to `.sp-toggle[data-thread]`, which says what it means. Out of scope for SP1–SP3.
- The "Pending · N" header and the Auto-assign count are two independent folds of the same array. They agree now, but nothing pins that they must. A single derived count would remove the class.

DOCUMENTATION UPDATES NEEDED:
- g67's narrative in `docs/gotchas.md` could name this as its second instance (the first was the cycle-19 F4 per-rep result cache). The rule itself needs no change — it already covers this exactly, which is why the diagnosis was quick.
- No CLAUDE.md index change is owed: no new gotcha, no new invariant. The derived DOM count row moved 113 → 114 and `counts --check` is green.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
