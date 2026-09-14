---CYCLE SUMMARY BLOCK---
Scope: Test Suite, Server & docs (post-reflect next-steps batches D1/D2/F1/F2 + the /sync-docs pass) | Cycle: 19 / 2026-09-14
Production fixes: 0 — severity: n/a
New capabilities/features: 0
Defensive/structural: 18
New failure modes: 2 — severity: 1 Medium, 1 Low
Net score: 0 − 2 = −2
Invariant candidates:
  INV-204 | The SERVER is the set of files `web-app/.clasp.json`'s `filePushOrder` declares, and it is read only through `serverSource()` — never by FILENAME (`'Code.js'` is an alias for a file that no longer exists) and never by POSITION (two declarations that were adjacent in one file may now be in different ones). A pin that slices between two landmarks keeps parsing after a move; it just reads the wrong text. | Test Suite + Server | Verify: the F1a filename ban across run.js AND scripts/counts.mjs; F2c move-only + no duplicate top-level name across files; F2d shape (Code.js absent, constants first, filePushOrder in the numeric order the filenames advertise).
  INV-205 | A document past a few hundred lines is an INDEX plus entry files, and BOTH directions of that coupling are pinned — a dead link and an orphaned entry are equally bad, because the index is what a reader scans. The ceiling that keeps it an index is one-sided and round, so raising it is a decision rather than a reflex. | Docs + .cycle | Verify: MODULE-MAP, GOTCHA-INDEX, OPERATOR-INDEX, the D1 decisions-index pin, and the 1,000-line CLAUDE-SIZE ceiling.
  INV-206 | A move-only refactor ships with a generated manifest that PROVES it, and regenerating that manifest is the one act that can launder a real change into the baseline — so a commit that regenerates it is a reviewable event, not a way to make CI green. | Test Suite | Verify: F2c compares name set, canonical body hash and target file against `test/client/server-split-manifest.json`. GAP, stated deliberately: nothing today distinguishes "regenerated because a function was added" from "regenerated to hide an edit" — the next Verification Pass should probe exactly that.
Most structurally significant change: CLAUDE.md went from a 12,661-line log to an 836-line map whose every index↔entries coupling is machine-checked in both directions — it changes the substrate every future session loads, where F2 (larger in lines) only changes where the server's text sits.
Should-have-been-deferred: Batch F2, the server split. D1/D2 had EVIDENCE of active harm (counts drifting, a `/sync-docs` pass guessing); a 30,789-line Code.js was unpleasant, not broken. F2 spent the cycle's largest risk budget on a change that cannot be validated from this container, and added the hardest-to-verify item to a deploy backlog that was already six batches deep.
---END CYCLE SUMMARY BLOCK---
