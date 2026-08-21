---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch 5B — the accessible-name sweep deferred from Batch 5.
Every form control in the app and on the public form now carries an accessible name.

Files modified:
- web-app/form_public.html, modals.html, script_core.html (no), cn/script_callnotes.html,
  intake/script_intake.html, kb/script_kb.html, metrics/script_metrics.html,
  tc/script_clock.html, tc/script_timeoff.html, tc/script_manager.html,
  train/script_training.html, train/script_empdocs.html, train/script_coaching.html
- test/client/run.js (A14 scan corrections + baseline 0/0/0; F17 anchor repair)
- test/visual/a11y-names.mjs (new — the measurement harness)

CHANGES:
Mechanical | 123 label-for wirings — a <label> carrying the visible name sat next to a
  control with a static unique id. Two ids are duplicated (cnC-individual-email,
  f-patientName) but both are mutually exclusive by construction (two render paths for
  one row; two form templates, one per token), so each for= binds correctly.
Mechanical | 29 placeholder promotions. Long hints and dynamic values got a written name
  instead of the raw placeholder.
Mechanical | 17 money-table rows on the public form, named "<Source> amount" because
  aria-label REPLACES the table context it would otherwise inherit. The two "Other" rows
  per table take a trailing digit — they share a row header, so without it a
  screen-reader user hears the same name twice.
Read-from-context | 30 selects and inputs named from the surrounding UI — severity and
  employee pickers, the sheet-view chooser, SLA hours (named PER DEPARTMENT, since the
  row repeats and the department is the visible label), quiz answer options, employee-doc
  response fields (named from f.label), the external-form prefill fields.
Real bug, not a missing name | The PPD `num` and free-text branches build an input WITH
  an id but never set hasInputId, so the label beside them never got its for=. The
  association machinery was already there, unswitched. Fixed at the flag.

SCAN CORRECTIONS (both found by doing the work):
- form_public.html is already in PARSE_GUARD_PARTIALS, so the concat added when the
  ratchet shipped read it TWICE. Every control on the public form was counted double —
  the real starting debt was 168, not 252.
- forIds now collects every for="…" in a file, not only ones textually inside a <label>
  tag. These partials build the attribute in a separate variable, so five real
  associations were invisible to a contiguous-match regex.
- The F17 severity mirror pin anchored on the exact open tag and so extracted nothing —
  silently comparing [] — the moment the select gained an aria-label. Anchors on the id
  now; re-bitten.

TEST RESULTS: passed. Pure 582, DOM 75, visual matrix clean. A14 baseline 0/0/0,
bite-checked at zero on four real failure shapes (broken for=, removed static
aria-label, removed dynamic aria-label, new unnamed control).
MEASURED in Chromium via the new test/visual/a11y-names.mjs: nine landed in-app views and
all three public-form templates report 0 unnamed and 0 duplicate names.
Regression scenarios: S3/S4/S13/S25/S45/S46/S59/S60/S79 — markup-only changes, no
behaviour touched; the visual matrix confirms no layout movement. S1/S2 editor-only.

REGRESSION RISKS:
- 210 of the edits are attribute additions inside template literals; the parse guard
  covers every partial and caught the one malformed edit (a stray quote plus a wrong
  variable name in the intake reveal control) before it left the working tree.
- Two duplicate ids now have labels bound to them; both verified mutually exclusive.

INVARIANTS AT RISK: none violated. INV-195 is now SATISFIED rather than merely ratcheted.

NET SCORE: 3 production fixes − 0 new failure modes = 3
  (the unnamed-control debt itself; the PPD label-association bug; the double-counting
  scan. The F17 anchor repair is test-integrity, not a production fix.)

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then New version.

FOLLOW-ON ITEMS:
- INV-195's recorded census was wrong in THREE ways and needs correcting, not just
  updating: it said 116 controls needed an author decision (the true figure was ~30, and
  every one was nameable from on-screen text), it attributed 92 of them to
  cn/script_callnotes.html (that was Call Notes' total across all buckets; the biggest
  none-bucket file was form_public.html), and its totals were inflated by the
  double-count above.
- A bite-check reverted uncommitted edits THREE times this batch. The rule already exists
  in CLAUDE.md; what is missing is a guard — bite.sh should refuse to run against a file
  with uncommitted changes.

DOCUMENTATION UPDATES NEEDED:
- INV-195: correct all three census errors; record the sweep as DONE with the baseline at
  zero; add the two scan corrections and the "a placeholder is not a name, and neither is
  visual adjacency" rule now that it is enforced rather than aspirational.
- Test narrative + Visual Audit Stage: note test/visual/a11y-names.mjs as the
  accessible-name harness, and that it is the only coverage the public form has.
- A new Common Gotcha: a bite-check ends in `git checkout`, so running one against a file
  with uncommitted edits discards them.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
