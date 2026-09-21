---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T5 — one honest copy helper, seven call sites routed through it, and the raw clipboard APIs banned everywhere else · the `.modal-head`/`.modal-x` classes that had no CSS rule · the `/sync-docs` pass owed since T1
Files modified: web-app/script_core.html, web-app/styles.html, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, web-app/metrics/script_metrics.html, web-app/intake/script_intake.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, CLAUDE.md, docs/gotchas.md, docs/modules.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/STATE.md
Estimate: T5 M (~4 h)
Actual: ~3.5 h

CHANGES:
T5 (the defect) | five partials | SEVEN text-copy call sites each had a hand-written helper, and every one ran its success path unconditionally. Two reasons, both invisible in a code read and both routine inside an HtmlService iframe: `document.execCommand('copy')` **returns false** when denied and does not throw, so the `try/catch` four of them had caught nothing; and `navigator.clipboard.writeText` **rejects**, which `kbRosterCopy_` never handled at all. The cost is not a button that lied — the rep pastes and gets whatever was on the clipboard BEFORE. On the Call Notes save path (automatic, unwatched, followed seconds later by a paste into the CRM) that is the PREVIOUS patient's note; on the Reference price panel a stale figure read to a customer. Neither surface showed anything wrong.
T5 (the fix) | `script_core.html` | `copyText_` reports the outcome; `manualCopyModal_` shows the text pre-selected and says plainly that nothing was copied (the "manual-copy failover" this repo wrote down as a decision and never built); `copyWithFeedback_` **owns the success branch**, so a call site cannot express "copied" independently of it. That last part is the actual fix — six hand-written success paths were the defect, six hand-written fallbacks were only the symptom. `silent` suppresses the SUCCESS toast only, for an automatic copy the rep did not ask for; a failure is never silent.
T5 (call sites) | kb, cn, metrics, intake | `oopCopyPrice_`, `kbRosterCopy_`, the link card, `kbCopySnippet_`, `cnAutoCopyNote_`, `cnCopyNoteAgain_`, `mCopyTeamTable_`, `intakeCopyLink_`, `intakeCopyText_`. Two cross-partial reaches disappeared with it: Metrics and Reference both called Call Notes' fallback through a `typeof` guard, and that fallback was the one that swallowed failure outright — so reaching for it made them LESS honest. `cnCopyNoteAgain_` used to toast success synchronously, beside a copy that had not finished.
T5 (the pin) | `test/client/run.js` | DERIVED, not enumerated. The survey that opened this work said five sites; a grep found SEVEN (g116's sixth direction, in the same session that documented it). The net sweeps every partial for the raw APIs and exempts by NAME with the reason beside each: `copyText_` itself, and `intakeCopyImage_`, which copies image BYTES via `ClipboardItem` and already degrades visibly by opening the image in a tab. Two non-vacuity checks guard the sweep.
`.modal-head` / `.modal-x` | `styles.html` | **Neither had a CSS rule anywhere.** Both were invented by T2's term popover and never styled, so the heading and the close button stacked as two unstyled block elements — in that popover, which MERGED that way, and then in the failover that reused them. Fixed with one rule pair matching the app's existing `.modal-title` vocabulary. In scope because the modal T5 builds is broken without them.
Failover readability | `script_core.html` | Multiline at 40 characters rather than 60, `scrollLeft`/`scrollTop` reset to 0 after `select()` (selecting scrolls to the caret, which is the END — the rep saw the tail of a price line and not the price), and the box sized to its content, because a fixed 8 rows made a two-line price look like an empty form to fill in.
/sync-docs | 5 doc files | All four checks found something. **Currency:** g76 rewritten (it named a deleted function and stopped at the easy half); g140 and g141 added. **Subsystem paths:** clean — the only two that do not resolve are the documented `Code.js` alias and the operator-created `.clasp.dev.json`. **Operator state:** `InsurancePayors` had no entry, and T3 made that gap real by turning its column HEADERS into a join key; written up with what an operator needs before editing one. **Drift:** the Reference narrative described none of T1–T5; the harness log now carries the round's tooling lessons.

TEST RESULTS: passed. Pure 925 → **926**, DOM 142 → **143**, visual 112 → **114**, lint clean, manifest current, counts block agrees.
**EIGHT bite-checks, all BITE** (four pure, four DOM): a denied `execCommand` reported as success · a rejected `writeText` with no handler · the caller reporting success without the helper · the failover interpolating text into markup · a partial reaching for the raw clipboard again · an automatic copy staying silent when it fails · the save-path copy going back to silent · the failover not pre-selecting.
**Shots READ, and they found two defects no number could:** the failover's close button stacked below its title (`.modal-head` had no rule), and its field scrolled to the END. Both at 0px overflow with no console errors.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S64** (KB reference drawer) — its T4 clipboard step now exercises the SHARED failover. NOT re-walked here; needs the operator's pass on the deployed instance.
- **S4 / S7 / S25** and any scenario that copies a note, a link or a table — the *behaviour* on success is unchanged and the failure path is new. NOT APPLICABLE as written; none of them asserts what happens when the clipboard is denied, which is why this shipped.
- **S73** (phone-width grids) — NOT APPLICABLE: no grid track changed.

REGRESSION RISKS:
- **A blocked clipboard is now INTERRUPTIVE where it used to be silent.** That is the point, but it is a real behaviour change on the Call Notes save path: a rep whose browser always denies the clipboard will see the failover on every save. If that turns out to be someone's normal state, the answer is to fix their browser, not to go back to silence — but it should be watched on the first day.
- `cnAutoCopyNote_` gained an `opts` parameter. Both call sites updated; the default is silent-on-success, which is what the save path had.
- `.modal-head` / `.modal-x` now have rules, which changes how T2's term popover renders. It rendered unstyled before, so this can only be an improvement, and both are shot.
- The shared helpers live in `script_core.html`; every partial is concatenated into one scope, so the call is direct. No load-order risk — the shell is always present.

INVARIANTS AT RISK: None violated. g76 is the rule this implements and it is REWRITTEN around the expensive half. INV-175/187's honest-failure discipline is what the failover is. g100 honoured (a real overlay through the hooks). g49 avoided — the text is assigned to the field, never interpolated. INV-208 unaffected: the price still does not round-trip through the DOM, and the copy is still deliberately not the composer's canonical line.

NET SCORE: 1 − 0 = 1
(Production fixes: **1, High** — seven copy sites reporting success they had not achieved, on paths including a saved call note going into a patient record. It fires whenever the iframe denies the clipboard, which is the documented normal state of this environment. New capabilities: 0. Defensive/structural: 2 — the derived ban, and the two CSS classes. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- Still open from T2: `OON`, `Plan Specific`, `OUT-OF-NETWORK`, `MDX Hawaii` have no definition on file.
- Still open from T3: how many `OopPricing` codes use the `K0821/23/16` shorthand — the operator-state entry now explains that writing them as whole codes makes them joinable with no code change.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T1, T2, T3, T4 and T5 all ship in this ONE deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **A "every class in the markup has a CSS rule" pin.** This defect has now fired three times in one file (`.kb-ins-row`, `.kbd-sec`, `.modal-head`/`.modal-x`). A naive sweep is NOT the answer and was not built: class names here are routinely assembled by concatenation (`'kb-elig-v ' + cls`), so it would over-report badly. A careful version — literal class attributes only, minus a dynamic-construction exemption list — is real work and worth scoping properly.
- `intakeCopyImage_` opens a tab on failure and does not check the return, so a blocked popup is invisible (g135). Out of scope; it is the image path, not a text copy.
- The keyboard walk (T4) still covers only the two lookup panels; the article tree and search results on the same landing are mouse-only.

DOCUMENTATION UPDATES NEEDED:
- None outstanding. The `/sync-docs` pass owed since T1 is DONE and is part of this batch: `docs/gotchas.md` (g76 rewritten, g140 + g141 added, all three indexed in CLAUDE.md), `docs/modules.md` (T1–T5), `docs/operator-state.md` (the new `InsurancePayors` entry, indexed), `docs/test-harness-log.md` (the round's tooling lessons), and `docs/design-decisions.md` (the INV-209 amendment, written in T4).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
