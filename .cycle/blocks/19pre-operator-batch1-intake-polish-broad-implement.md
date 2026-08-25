# Operator batch 1 (2026-08-25) — intake polish — broad-implement block
# (between-cycles operator work; branch claude/team-tools-roadmap-6e2l97)

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- B1-1 | Response-button UNSELECT: re-clicking the selected Yes/No / severity /
        choice / ynreveal / ynnum button clears the group ('' = pre-answer state
        everywhere downstream; ynreveal/ynnum clears also hide+empty their
        revealed sub-controls so nothing orphaned serializes)
- B1-2 | PPD "Additional Notes" panel (PMD/PAP already end with Other Notes) —
        non-numeric key 'notes': engine ignores it, 46-ring never counts it,
        the [data-intk-qnum] accessor fallback gives drafts/restore/collect the
        field free; server renders payload.rows verbatim so ZERO server edits;
        Sent detail renders it when present
- B1-3 | Strongly-recommended soft check on Preview (operator field lists):
        blank LISTED fields → warn highlight + note + ONE uiConfirm; never a
        hard block, never an unlisted field; PPD Q1-23/37/38/39a/44 + the Q40
        Yes-without-hours conditional; PMD [1,2,5,6,8,12,13,15,16,17,22] /
        PAP [1,2,5,6,8,12,13,19,23] as BANK INDICES pinned against the live
        labels; marks self-clear when the field gains a value

Files modified: web-app/intake/script_intake.html, test/client/run.js,
test/client/dom/runDom.js

TEST RESULTS: pure 622→625, DOM 75→79, all green; 6 mutations / 6 bites.
One harness lesson: the reveal-hidden guard first used offsetParent, which is
layout-dependent and ALWAYS null in jsdom — the row's inline display (what
intakePpdApplyReveals_ actually sets) is both more precise and testable.
One placement lesson: the first pin insertion landed between the tally print
and process.exit — tests RAN but were uncounted; the safe anchor is the tally
line, not process.exit.
Browser-measured: ring 0/46 with the notes panel present; unselect Yes→'';
empty PPD flags exactly 27; notes textarea never flagged; overflow 0 in all
four re-shot intake scenarios.

REGRESSION RISKS: intakePpdPreview_/intakeAcctPreview_ split into gate + Go
halves — no other caller referenced them (grep). The '' cleared state is the
documented pre-answer state (engine unanswered / email N/A / drafts) so
downstream is unchanged by construction.

INVARIANTS AT RISK: None — INV-112 (engine reads numbered keys only; drift
guards green), INV-89 (notes esc()'d in sent detail; server esc_'s rows),
INV-116 (read paths unchanged), INV-195 (textarea has label for=), A2 (no new
fixed grids), INV-128 (only --warn-soft/--warning-deep, both declared).

NET SCORE: 0 − 0 = 0 (three capabilities, no production bug fixed)

OPERATOR ACTIONS / DEPLOY:
- Ships on the next `clasp push -f` + New version with the standing combined
  deploy | BLOCKS DEPLOY: N
FOLLOW-ON ITEMS: batches 2–7 of the 2026-08-25 sequence (in progress).
DOCUMENTATION UPDATES NEEDED: consolidated /sync-docs after the sequence.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
