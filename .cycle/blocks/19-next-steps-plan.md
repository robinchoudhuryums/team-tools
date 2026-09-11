---NEXT-STEPS PLAN (post-cycle-19, 2026-09-11)---
Source: the six project-level suggestions made after the ADMIN_EMAILS run
(suggestion #5, a dedicated deploying account, is an operator question and is
deliberately NOT planned here). Each batch is sized for one `/broad-implement`;
every item appears exactly once; a GUARD lands in the batch AFTER the one that
closes the gap it guards. Estimates are recorded here at planning time — the
first cycle since 12 to do so (Batch P's own rule, applied to itself).

Measurements the plan rests on (2026-09-11):
- web-app/Code.js: 30,508 lines, 835 top-level functions, 349 top-level
  declarations, ZERO real cross-declaration load-order hazards (the one crude
  hit, `CONFIG <- KB`, is a key name), no section banners; the first 413 lines
  are CONFIG/enums/constants. By function-name prefix: timeclock ~5.5k lines,
  core ~4.6k, callnotes ~3.4k, kb ~3.2k, metrics ~2.1k, qa ~1.6k, intake ~1.6k,
  forms ~1.5k, training ~1.1k, deptrequests ~0.9k, spanish ~0.8k, coaching
  ~0.7k, empdocs ~0.7k, ~2.5k unclassified (118 functions, mostly timeclock/core).
- test/client/run.js couples to the filename: 586 `extractRawFunction('Code.js',…)`
  + 69 direct `readFileSync(…Code.js)`; harness.js resolves `path.join(WEB_APP, file)`;
  mock.js's F4 mirror reads Code.js; CI runs `node --check` per named file.
- CLAUDE.md: 12,311 lines — Key Design Decisions 3,849, Operator State 3,011
  (53 dated deploy-round entries), Common Gotchas 2,069, Regression Scenarios
  1,172, the Test Command narrative 1,035, Projects 534, Invariant Library 224
  long lines. Three run.js pins read it (F7 INV-136 paragraph, VIS-COVER
  marker, the `coverage`-left-the-marker assert); scripts/cycle-context.mjs
  ALREADY prefers `.cycle/config.md` for the invariant count when it exists.
- Script Properties: 33 `setProperty(` sites, 18 distinct literal keys plus the
  variable-keyed writers; NO code or doc accounts for the ~9KB per-value cap.
  `CN_EMAIL_TEMPLATE_LIMIT(50) × CN_EMAIL_TEMPLATE_BODY_MAX(4000)` admits 200KB.
- Tests.js: 119 smoke + 195 integration registrations in ONE `_runAllTests`
  list; the last prod run took 17 min mid-shift (Workspace ceiling 30 min).
- docs/deployment.md already documents the dev instance ("One-time dev setup,
  ~30–45 min"); `runNightlySelfTest` already runs the FULL suite on a confirmed
  dev instance (`INSTANCE_LABEL` set + `INSTANCE_IS_PROD` explicitly not 'true').

═══ BATCH 0 — OPERATOR ACTIONS (no code; ~1 h + the dev-instance setup) ═══
In this order, because 0a is the LAST manual full run on prod and 0f makes
prod refuse the next one:
 0a. `cd web-app && clasp push -f`; re-run `runAllTests()` ALONE in the ~6pm CT
     quiet window; expect 312/312; keep `ADMIN_EMAILS` as it is.  (verifies #238)
 0b. Re-authorize Drive as the DEPLOYING account (editor → run any function →
     accept the Drive permission). `KB_IMAGES_FOLDER_ID` has never been set, so
     Reference article images have rendered as placeholders since the converter
     shipped. Admin → System reports the outcome (INV-197).
 0c. Re-run `installAutomationTriggers()` once so triggers #20/#21 exist.
 0d. Run `reportBreakPairingChanges()` once from the editor (read-only) BEFORE the
     next accrual credit; a listed day is a payroll figure that moved.
 0e. Read the mail-routing line on Admin → System (is `MAIL_BCC_ALL` set?).
 0f. Stand up the DEV instance per docs/deployment.md § "One-time dev setup":
     copy sheets, your-inbox recipients, `INSTANCE_LABEL=DEV`,
     `INSTANCE_IS_PROD=false`; on PROD set `INSTANCE_IS_PROD=true` (after 0a —
     it makes `runAllTests` REFUSE there, which is the point); run
     `installAutomationTriggers()` on dev so `runNightlySelfTest` runs the full
     suite there every night. From then on prod gets `runSmokeTests` only.
 BLOCKS DEPLOY: 0a (verification of #238). 0f is the prerequisite for Batch S's
 "the suite never runs on prod by hand" posture.

═══ BATCH P — PROCESS (S, ~2 h) — first, because it shapes the rest ═══
 P1. Estimates: `scripts/cycle-context.mjs` prints "Record S/M/L + hours for each
     batch in its plan message BEFORE the first edit" on SessionStart; STATE.md's
     template gains an `Estimates:` line; every implement block carries
     `Estimate: S/M/L (h)`. `/reflect` then has inputs for estimates.csv again
     (five cycles have none).
 P2. TW-B: retire the per-file RATCHET map + the two-sided assertion (the half
     the cycle-19 reflection named should-have-been-deferred); KEEP the
     token-equality ban, the FROZEN list and the canvas-fallback rule. In the
     same batch land the `--accent-glow` / `--warn-glow` token pair that retires
     the clock ribbon's two rgba colour-mix fallbacks (the residual the ratchet
     recorded), so nothing the ratchet guarded is left unguarded — the ban still
     catches any token-equal literal. INV-200 + the C4 canvas-twin gotcha reworded.
 Verify: run.js green with TW-B's ratchet half gone; a bite that re-adds a
 token-equal literal still fails; the ribbon renders identically (re-shoot
 clock-light-wide + clock-dark-wide).

═══ BATCH S — SUITE OPERABILITY (M, ~4 h) ═══
 S1. Shard `_runAllTests`: smoke list + integration halves A/B, each half an
     editor entry point (`runAllTestsPartA/B`, own setup + cleanup);
     `runAllTests()` still runs everything in one execution; `runNightlySelfTest`
     runs the parts SEQUENTIALLY in one execution on dev (quiet-window runtime
     ~6 min, far under the 30-min ceiling; the parts exist for a mid-shift
     manual run and for the day the suite outgrows one execution).
 S2. `_printSummary` prints "expected N" DERIVED from the registration list, so
     no doc entry has to state the count again (Batch C rewrites the prose).
 S3. `_suiteEnvCheck_()` at setup LOGS (never fails) every deployment setting the
     suite depends on — `ADMIN_EMAILS` (now accommodated), `INSTANCE_IS_PROD`,
     the fixture properties, the TEST rows' state — so today's class ("the suite
     assumed a config state prod does not have") is visible at the top of the log
     rather than as ten failures 90 tests in.
 S4. Pin (run.js): the shard lists are disjoint and their union equals the
     registration count (derived, INV-179); `_suiteEnvCheck_` names every
     Script Property the suite reads (derived from `getProperty('` in Tests.js).
 S5. Docs: the runbook sentence becomes "smoke on prod, full on dev nightly;
     `runAllTests` on prod is the exception, not the routine".
 Verify: `node --check`, run.js, the editor run on DEV (0f) reports both parts.

═══ BATCH Q — SCRIPT PROPERTY SIZE GUARD (M, ~5 h) — the one latent defect ═══
 Q1. `propSetBounded_(key, value)` — ONE writer for every JSON-blob property:
     refuses over `PROP_VALUE_MAX` (9,000 chars — under the documented 9KB
     per-value cap) with a NAMED error ("CN_EMAIL_TEMPLATES would be 12,400
     chars; Script Properties hold ~9,000 — shorten or remove a template").
     Operator-edited blobs REFUSE (nothing written, the INV-96 posture);
     auto-managed blobs DEGRADE by name: the geocode cache self-resets on BYTES
     not entry count (200 entries is on the order of the cap), heartbeats /
     AUTOMATION_LAST_ERRORS / KB_AI_SPEND / WITNESS_AUDIT_FAILS trim oldest.
 Q2. Advertised caps that cannot fit are fixed at the VALIDATOR: every Admin
     save endpoint (templates, external links, auto-tag rules, update
     suggestions, dept emails, break schedules, synonyms, SLA targets, QA
     criteria, QA/Spanish members) checks the SERIALIZED size before the write
     and names the budget; the client editors show "N of 9,000 chars used".
 Q3. Storage Health gains a "Script Properties" capability line — bytes used of
     the 500KB store and the largest value — an `ok` FACT normally (INV-186),
     warn past 80% of either cap.
 Q4. Pins: a derived scan that every `setProperty(` in Code.js routes through
     the helper (a by-name allowlist for the scalar writers, each with a reason);
     the helper driven behaviourally (refuse vs degrade); a worst-case
     arithmetic pin per capped blob (count × per-entry max ≤ PROP_VALUE_MAX, or
     the save enforces serialized size). Tests.js: `saveEmailTemplates` over-size
     → named refusal, nothing written.
 Q5. Also carries the logged DR follow-on (S): `resolveDeptRequest` and
     `markDeptRequestResolved_` route through `drFindRowByReqId_` (the detail
     read's bounded shape) instead of whole-tab reads.
 Verify: run.js + DOM green; 4+ mutations bite-checked (helper bypassed, cap
 raised, degrade→refuse swapped, allowlist widened); editor run on dev.

═══ BATCH C — DERIVED COUNTS (S–M, ~3 h) — after Batch S (S2 makes it honest) ═══
 C1. `scripts/counts.mjs` derives every number the docs carry: pure + DOM test
     registrations, visual scenarios (shoot.mjs SCENARIOS), editor
     registrations (Tests.js), admin-tier endpoints, trigger TARGETS,
     localStorage keys, INV count. Prints a table; `--check` mode exits non-zero
     on drift.
 C2. CLAUDE.md carries ONE generated "Running totals" block between
     `<!-- COUNTS:BEGIN -->` / `<!-- COUNTS:END -->` markers; README's matrix
     count reads from it.
 C3. Rewrite every "expect **N**" / "797 → 798" / "the Nth admin endpoint" prose
     to point at the block or the summary line (the 53 dated operator entries
     included — bulk edit).
 C4. GUARD (lands with C3, guards C2/C3): a run.js pin that the block equals
     `counts.mjs` output, and a derived scan banning a stated harness total or
     "expect N" outside the block. Pin F7's count assertion consumes the same
     derivation.
 Verify: run.js; `node scripts/counts.mjs --check` in CI (one workflow line).

═══ BATCH D1 — CLAUDE.md STRUCTURAL MOVES (M, ~6 h) — after Batch C ═══
 D1a. Cycle Workflow Config → `.cycle/config.md` (Test Command, Health
      Dimensions, Axis B, Subsystems, Invariant Library, Visual Audit Stage,
      Policy, Seams cadence, Regression Scenarios, Frozen, Deploy Command).
      `cycle-context.mjs` already prefers it. CLAUDE.md keeps a `## Cycle
      Workflow Config` STUB naming the file and the Test Command line, so the
      16 template commands that say "read CLAUDE.md's Cycle Workflow Config"
      land on a pointer, not a gap.
 D1b. Key Design Decisions (3,849 lines) → `docs/design-decisions.md`; CLAUDE.md
      keeps a one-line-per-decision INDEX (~120 lines) with anchors.
 D1c. Operator State: keep the storage map + a ONE-LINE-PER-PROPERTY inventory
      (name, purpose, default, where edited, ~150 lines); the 53 dated
      deploy-round entries → `docs/operator-log.md`, append-only newest-first
      (the HISTORY.md pattern). `/sync-docs` appends future rounds there.
 D1d. A "Doc map" section at the TOP of CLAUDE.md: which file holds what, so
      `/sync-docs`'s "update CLAUDE.md" instruction routes to the right home.
 D1e. Repoint the three run.js pins (F7 → config.md; VIS-COVER marker + the
      `coverage` assert → config.md's Visual Audit Stage). `test/visual/README`
      and `test/client/README` cross-links.
 Verify: run.js green; `node scripts/cycle-context.mjs` prints the invariant
 count from config.md; a fresh session's `/cycle-status` resolves.

═══ BATCH D2 — CLAUDE.md REWRITES + SIZE CEILING (M, ~6 h) — after D1 ═══
 D2a. Common Gotchas (2,069 lines): each entry → RULE + trigger + verify pointer
      (≤6 lines), RANKED by how often a change hits it (coercion family, caches,
      gates, esc, tz first); the narrative moves beside its decision in
      docs/design-decisions.md. Target ≤600 lines.
 D2b. Projects (534) → a module MAP table (tool · partial · server file ·
      INVs · scenarios, ~80 lines); per-module narrative → `docs/modules/<tool>.md`.
 D2c. The Test Command narrative (1,035) → `test/client/README.md` (exists);
      config.md keeps the command + a 30-line summary.
 D2d. GUARD (after the rewrites): a run.js CEILING on CLAUDE.md's line count
      (one-sided, set 10% above the post-split size) so the map cannot silt back
      into a log. Target for CLAUDE.md: ≤3,000 lines from 12,311.
 Verify: the same pins; a read-through that every "see the X gotcha" reference
 in code comments still resolves (a derived scan of `see the … gotcha` phrases
 against the gotcha headings).

═══ BATCH F1 — HARNESS SHIM (S, ~2 h) — a no-op landing BEFORE the split ═══
 F1a. `harness.js` exposes `serverSource()` = the concatenation of the server
      files named by `.clasp.json` `filePushOrder` (today: exactly Code.js);
      `extractRawFunction('Code.js', …)` resolves through it, so the 586 pins
      are untouched; the 69 direct `readFileSync(…Code.js)` in run.js and the
      F4 mirror in mock.js call `serverSource()`; CI's `node --check` loops over
      `web-app/*.js`.
 F1b. Pin: `serverSource()` is BYTE-EQUAL to Code.js while the order list has one
      entry (proves the shim changes nothing); a load-order pin that evaluates
      the files IN ORDER in one vm context with GAS stubs and asserts no
      ReferenceError at load.
 Verify: run.js + DOM + mock byte-identical results; commit alone.

═══ BATCH F2 — Code.js SPLIT (L, ~2 days incl. re-verification) — last ═══
 F2a. `00_config.js`: CONFIG, every enum, every top-level constant (the first
      413 lines + the scattered 349 declarations); `filePushOrder` lists it first.
 F2b. Move-only split by prefix: `10_core.js`, `20_timeclock.js`,
      `30_callnotes.js`, `40_metrics.js`, `50_deptrequests.js`, `51_spanish.js`,
      `60_intake.js`, `61_forms.js`, `70_kb.js`, `80_training.js`,
      `81_empdocs.js`, `82_coaching.js`, `90_qa.js`; the 118 unclassified
      functions placed by reading. ZERO edits inside any function body.
 F2c. GUARD (with F2b): a pin that the SET of top-level function names before
      and after is identical and every body is byte-equal (move-only, derived
      from the pre-split file kept at a git tag); the F1b load-order pin now
      exercises 14 files.
 F2d. Tests.js + DevTools.js unchanged (shared global scope); `.clasp.json`
      `filePushOrder` explicit; `clasp push -f` + a smoke run on dev BEFORE prod.
 F2e. Docs: Subsystems → Server file list; "One CONFIG object in web-app/Code.js"
      and every `Code.js` mention in INV-141/154/the mock banner; the Doc map.
 Verify: pure + DOM + visual matrix re-shot + `runAllTests` on DEV, then the
 prod deploy; the same New version carries no behaviour change by construction.

═══ DEFERRED (unchanged — operator/feature decisions, not defect work) ═══
 Suggestion #5 (a dedicated deploying account); the PTO-aware Spanish picker;
 BLOCKING an off-domain MAIL_BCC_ALL; agent-visible QA reviews; a per-rep
 working-days column; a manager pay-statement export; presence-chip
 schedule/PTO gating; the quiz editor's "+ Question" per-block append; the
 `dept_req_v1` salt (the F4 residual); the `getTeammateStatus` full-Timesheet read.

SEQUENCE: 0 → P → S → Q → C → D1 → D2 → F1 → F2.
Why this order: 0 unblocks everything and 0f is the precondition for S's
posture; P is two hours and its estimate rule applies to the rest; S before C
because C's rewrite depends on the summary printing the expected count; Q is
the only latent DEFECT in the set, so it precedes the doc and refactor work; C
before D so the counts block moves once; D before F so the split's doc updates
land in their final homes; F1 alone proves the shim is a no-op before F2 leans
on it. Every batch is independently shippable and leaves the tree coherent.
---END NEXT-STEPS PLAN---
