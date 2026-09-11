# Cycle 19 — `/broad-implement Batch P` (2026-09-11)

Batch P of the post-cycle-19 next-steps plan (`.cycle/blocks/19-next-steps-plan.md`):
the PROCESS batch, placed first because its estimate rule applies to every
batch after it. Two items — P1 (estimates in the process) and P2 (retire the
TW-B ratchet half; land the glow-token pair the ratchet had recorded as a
residual). Landed as d111b10 on `claude/broad-scan-fw462g` (the branch was
restarted from `origin/main` first — PR #239 had merged).

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- P1 | Estimates in the process: the SessionStart hook prints the reminder
  (record S/M/L + hours per batch BEFORE the first edit), STATE.md's template
  gains an `Estimates:` line, and every implement block carries `Estimate:` +
  `Actual:` — so `/reflect` has inputs for estimates.csv again after five
  reflections (13, 16, 18, 19pre, 19) skipped the calibration row.
- P2 | TW-B's two-sided per-file RATCHET (the half cycle 19's reflection named
  should-have-been-deferred) retired; the token-equality ban, the FROZEN list
  and the canvas-fallback rule kept. `--warn-glow` joins `--accent-glow` (base
  light + base dark blocks ONLY — a palette never redefines a semantic colour),
  and the clock ribbon's three pre-color-mix fallbacks (note-volume bars,
  break band, legend swatch) ride the glow tokens instead of Console-only rgba
  twins; the color-mix line stays and sets the strength. INV-200 written.
Files modified: scripts/cycle-context.mjs, CLAUDE.md, .cycle/STATE.md,
  web-app/styles_design_tokens.html, web-app/tc/script_clock.html,
  test/client/run.js
Estimate: S (2 h) — the plan's figure, recorded in STATE.md at 20:24Z before the first edit
Actual: ~0.6 h (plan read 20:12Z → merge ~20:45Z; the harness + shoot runs were most of it)

CHANGES:
P1 | scripts/cycle-context.mjs | prints "Estimates: record S/M/L + hours for
  EACH batch in its plan message BEFORE the first edit; carry `Estimate:` +
  `Actual:` into the implement block and STATE.md's `Estimates:` line" on
  every SessionStart (still fail-safe: nothing without `.cycle/`, never throws).
P1 | CLAUDE.md | the STATE.md template gains `Estimates: [per batch — written
  BEFORE the first edit]`; the `.cycle/blocks/` bullet records that every
  implement block carries `Estimate:` + `Actual:` under `Files modified` (a
  project convention — the synced command template is untouched); the
  `estimates.csv` bullet names those lines as its inputs; the hook paragraph
  mentions the reminder.
P1 | .cycle/STATE.md | `Estimates:` line under Current — Batch P's own S (~2 h)
  written before the first edit, plus the plan's figures for S/Q/C/D1/D2/F1/F2.
P2 | test/client/run.js | TW-B rewritten in place: the `RATCHET` map, the
  `other` count and the two-sided report assertion are gone; RULE 1 (a hex
  literal equal to a declared token value is banned outside a canvas fallback
  that EQUALS its token or a named INV-166 freeze, exactly once inside its
  selector) and the `canvasCount === 4` assertion stay. NEW pin P2: `--warn-glow`
  in the base light AND base dark block bodies (via `tokenBlocks()`) and in NO
  palette block; exactly two declarations; `--accent-glow` still 5 × 2; the
  three ribbon rules carry `var(--accent-glow)` / `var(--warn-glow)` as the
  FIRST `background` with the same color-mix line second (34% / 20% / 16%); no
  `rgba(15,138,82` / `rgba(183,121,31` literal left in the clock partial.
P2 | web-app/styles_design_tokens.html | `--warn-glow: rgba(183,121,31,0.16)`
  (light base) / `rgba(255,181,71,0.22)` (dark base), with the comment saying
  why it lives in the base blocks only.
P2 | web-app/tc/script_clock.html | `.ribbon-hist .hbar` → `background:
  var(--accent-glow); background: color-mix(… 34% …)`; `.r-break` →
  `background: var(--warn-glow); background: color-mix(… 20% …)`; the legend
  Notes swatch → `background:var(--accent-glow);background:color-mix(… 16% …)`.
  The comment above the rules states the two-declaration shape.
P2 | CLAUDE.md | INV-200 written after INV-199 (the canvas-twin rule; the
  ratchet half's retirement recorded inside it); the C4 gotcha's canvas-twin
  paragraph reworded (ratchet RETIRED, the ribbon pairs on the glow tokens, the
  render byte-identical); the Test Command narrative's TW-B sentence marked
  "RETIRED in Batch P" + a Batch P sentence that reads the pure total off the
  run rather than hand-carrying it (Batch C derives it).

TEST RESULTS:
- pure harness 796 passed / 0 failed (795 before: TW-B rewritten in place,
  +1 for P2); DOM harness 113 / 0; `node --check scripts/cycle-context.mjs`
  clean and the hook prints the reminder + "200 invariants".
- Bite-checks, every one against the COMMITTED tree (d111b10) and restored
  with `git checkout`: (A) a token-equal hex literal re-added to a scanned
  partial (`#b7791f` = `--warn`) → TW-B fails; (B) the qa waveform's `--accent`
  canvas fallback moved to `--accent-2`'s value → TW-B fails; (C) `.r-break`'s
  fallback reverted to the rgba twin → P2 fails; (D) `--warn-glow` redefined
  inside the Sand light block → P2 fails. 4 / 4. (E) dropping the hook's
  reminder line is NOT pinned — recorded as such; the hook prints it or it
  does not, and the STATE.md `Estimates:` line is the durable half.
- Visual: `clock-light-wide` + `clock-dark-wide` re-shot after the edit and
  compared BYTE-FOR-BYTE against PNGs shot on the unmodified tree minutes
  earlier (`cmp`): both IDENTICAL; `overflowPx` 0. The plan's "renders
  identically" is measured, not reasoned.
- Regression Scenarios (Test Command = manual; those overlapping a modified
  file): S39 Clock view layout — PASS by measurement (the byte-identical
  shots cover the ribbon histogram, break bands and legend). S101 Time Clock
  surface — PASS by measurement (same two scenarios; the break chips and the
  ribbon are on camera). S3 golden-path punch — NOT APPLICABLE (a CSS-only
  change to the partial; no punch logic touched). S1/S2 editor suites — NOT
  APPLICABLE (no Code.js / Tests.js change; the Node harnesses are the check
  for run.js + the tokens partial). The non-Console palettes are not on the
  matrix; `--warn-glow` there inherits the base value by construction (the
  palette contract's rule 1, pinned) and every current browser paints the
  color-mix line anyway.
REGRESSION RISKS: None. The modern render is the unchanged color-mix
  declaration (byte-identical shots); the pre-color-mix fallback is now
  palette-aware where it was Console-only, strictly better. Retiring the
  ratchet removes a guard over chromatic literals that match NO token — the
  class the reflection judged not worth a hand-reasoned baseline; a literal
  that DUPLICATES a token still fails (bite A).
INVARIANTS AT RISK: None — INV-128 (the new token is declared), the palette
  contract (semantic colour in base blocks only — pinned), PR1-1 (no
  `var(--x, fallback)`), INV-166 (the ribbon is on the themed shift strip, not
  the fixed sky card) all hold; INV-200 is new.
NET SCORE: 0 − 0 = 0 (two defensive/structural items: a process rule and a
  guard-shape + token consolidation; nothing here fired in production this
  month — every Workspace browser paints the color-mix line, so the wrong-hue
  fallback was never on screen).

OPERATOR ACTIONS / DEPLOY:
- None new. The next New version carries the token + ribbon edit alongside
  the trigger-quota round; nothing to configure. | BLOCKS DEPLOY: N
Deploy: Server + Client (shell) + Client (Time Clock views): `cd web-app &&
clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit →
Version: New version → Deploy. Test Suite: the Node harnesses only (no
Tests.js change; `runAllTests()` stays at 315).

FOLLOW-ON ITEMS:
- `styles.html`'s one `rgba(15,23,42,.04)` box-shadow tint — the other
  residual the ratchet had recorded. Not a token-equal literal, so no pin sees
  it now; a `--shadow-tint` token would be the F7-shaped close if it ever
  earns a second consumer. Left alone (scope).
- The Admin → System findings read `e.error` where `stampAutomationError_`
  writes `message` (every stamped automation failure renders "unknown
  error") — the follow-on the trigger-quota block logged; still open, still
  out of scope here.
- Batch S is next in the plan (suite operability); its precondition is the
  operator's Batch 0f (the DEV instance), which nothing here changes.

DOCUMENTATION UPDATES NEEDED:
- None — applied in-batch (CLAUDE.md: the C4 gotcha, the Test Command
  narrative, INV-200, the `.cycle/` section + template; STATE.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
