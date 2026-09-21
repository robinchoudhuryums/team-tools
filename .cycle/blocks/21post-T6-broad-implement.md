---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: T6 — the unstyled-class RATCHET (g140's third instance), the two real defects its audit found, and INV-234 / INV-235
Files modified: web-app/styles.html, web-app/metrics/script_metrics.html, test/client/run.js, .cycle/config.md, CLAUDE.md, docs/gotchas.md, docs/test-harness-log.md, .cycle/STATE.md
Estimate: T6 M (~3 h)
Actual: ~3 h

CHANGES:
T6 (the two real defects) | `styles.html`, `script_metrics.html` | **`.mono`** — fifteen elements across four partials carried `class="… mono"` (usage-table figures, the scratchpad status, dashboard card feet, a bare `class="mono"` page counter) and there was no rule, so every one rendered in the UI font. The `--mono` token had existed all along. FAMILY ONLY in the fix: each site sets its own size and colour through the class beside it. **`.m-vol-note`** — a `role="alert"` saying a CDR tab could not be read, with no rule at all, rendering as plain body text while its MUTED sibling `.m-trends-note` was styled. A degraded read with none of the warn tone this app gives every other one (g02 / INV-175).
T6 (the ratchet) | `test/client/run.js` | Three derivations take 118 used-but-undefined classes down to 33: a class attribute carrying a template break holds VARIABLE names; a class named in a JS selector string is a hook; and the harnesses select on classes too. The 33 are named with the REASON each needs no rule, in four groups (default-of-a-styled-set · inline style carries it · the hook is an id or data-attribute · plain wrapper / variant marker). The list may only SHRINK — removing a name while still bare is red, and keeping a name after its rule is written is red the other way, so it cannot become a suppression file.
T6 (the extractor flaw) | `test/client/run.js` | **The pin passed its first run while checking almost nothing.** The hook derivation counted any plain quoted word — right for `classList.add('foo')`, catastrophic here, because this app builds its markup in JS so every `class="a b"` IS a quoted string. ~3,500 tokens were harvested as hooks, i.e. nearly every class in the app. Hooks now come from the CALL: selector literals, `classList.*`, `className =`. 694 instead of 3,557+; the bare set grew 31 → 33 and the four it had masked are audited.
T6 (the guard) | `test/client/run.js` | The non-vacuity check PASSED BECAUSE OF the bug — it asked whether `modal` was a hook, and it was, for the wrong reason. The replacement DRIVES the extractor over a synthetic snippet whose only content is a class attribute and asserts nothing is harvested, plus a band check (more hooks than defined classes = over-capture has returned).
INV-234 | `.cycle/config.md`, S18 | T5's rule, generalised: a helper that can fail reports its outcome, and the caller cannot express success independently of it. Six hand-written fallbacks were the symptom; six hand-written success paths were the defect. S18 gains the denied-clipboard step its Verify clause names.
INV-235 | `.cycle/config.md` | T6's rule, with the extractor lesson and both known limits stated in the entry rather than left to be rediscovered.

TEST RESULTS: passed. Pure 926 → **927**, DOM 143, lint clean, manifest current, counts block agrees (invariants 226 → 228).
**SIX bite-checks, all BITE:** the `.mono` rule deleted · the `.m-vol-note` SELECTOR renamed · a new bare class in the markup · a grandfathered name removed while still bare · a name kept after its rule is written · the hook extractor put back to harvesting class attributes.
**ONE NO BITE that was the whole point:** deleting the `.mono` rule left the pin GREEN, which is how the extractor flaw was found at all. Fixed, and it bites now.
**ONE NO BITE that is a stated limit, not a gap:** deleting a rule's DECLARATIONS does not bite — an empty rule satisfies the pin. Renaming its selector does. Recorded in INV-235 and the harness log rather than papered over.

REGRESSION SCENARIOS (Test Command is `manual`):
- **S18** (Call Notes submit + auto-copy) — UPDATED with the denied-clipboard step. Needs the operator's walk.
- Every scenario touching a surface `.mono` renders on (S18, the Admin usage panel, the Clock dashboard) — **NOT re-walked**: the change is a font family on elements that already had their size and colour. The visual matrix covers the Clock and Reference surfaces and is unchanged in layout.
- **S73** (phone-width grids) — NOT APPLICABLE: no track or box changed.

REGRESSION RISKS:
- `.mono` is a new GLOBAL utility. Fifteen elements change font family — all of them already asked for it. Family only, so no size or colour is overridden. The risk is that a sixteenth element somewhere carries `mono` in a dynamically-built class string and now picks the rule up; that would be the rule working.
- `.m-vol-note` gains a background and padding where it had none, so the Metrics volume panel grows a few pixels when a CDR tab fails — a state the matrix does not shoot.
- The pin is test-only and cannot affect production.

INVARIANTS AT RISK: None violated. **INV-234 and INV-235 written.** g140's index line and narrative now point at the ratchet rather than at the scenarios alone. g116 fired again during the work — first direction this time (a green pin checking nothing) — and is cited where it bit.

NET SCORE: 2 − 0 = 2
(Production fixes: **2, both Low** — `.mono` is cosmetic across fifteen elements; `.m-vol-note` is a degraded-read warning that does not look like one, which matters more than its size suggests on a surface whose whole job is honest failure. Both fire on any page load of those surfaces. New capabilities: 0. Defensive/structural: 1, the ratchet. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. T1 through T6 all ship in this ONE deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Four classes are grandfathered with "intent unverified"** — `dr-mgr`, `ny-card`, `coach-drawer`, `kb-gloss-search`. Each is a specific name beside a styled generic with neither a rule nor an inline style, so it renders as the base component. That may be exactly right or an intended variant nobody wrote; the code cannot say and neither can the pin. Stated honestly in the list rather than claimed fine.
- **An empty rule satisfies the ratchet.** Closing that means parsing declarations, which is a different and larger tool. Recorded as a limit.
- `intakeCopyImage_` still opens a tab on failure without checking the return (g135). Unchanged from T5.

DOCUMENTATION UPDATES NEEDED:
- None outstanding. g140's index line and narrative, `docs/test-harness-log.md`, INV-234, INV-235 and S18 are all part of this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
