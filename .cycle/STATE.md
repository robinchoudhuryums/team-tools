# Cycle State

## Current
Cycle: 24 — opened 2026-10-05 by the Seams & Invariants audit (cycle 23 is CLOSED; its block is in `.cycle/HISTORY.md`).
Phase: implement — the operator's MANUAL-UPDATE thread (cycle 24's seams batches are deployed 2026-10-06 and reflected; PR #287, #288 merged)
Scope: the CSR Procedures Manual update (`manual/`), Phases 1 and 2 of 7 DONE. The plan, with every operator decision, is `.cycle/manual-update-plan.md`; the operator's original list (verbatim) is `.cycle/manual-update-list.md`.
Test Command: manual
Estimates: production batch (F1/F2/F3/F4/F6/F8/F19): M (~5 h) — written before the first edit. Actual ~2.5 h. · nets-and-library batch (F5, F7, F8r, F9–F18, F20, F21?): L (~8 h) — written before the first edit. Actual ~4.5 h. · **Manual Phase 1 (Foundations, the operator's manual-update plan): L (~8 h)** — written before the first edit, 2026-10-06. Actual ~5 h. · **Manual chapter colours + icons (operator-approved 2026-10-07): M (~4 h)** — written before the first edit. Actual ~3 h. · **Manual Phase 2 (text edits, six batches 0–1 · 2–3 · 4+9 · 5–6 · 7–8 · 10+appx): L (~12 h, ~2 h a batch)** — written before the first edit, 2026-10-07. Actual ~9 h.
Subsystem cycles since last Seams audit: 1 — reset to 0 by the Seams & Invariants audit of 2026-10-05 (cycle 24); incremented by cycle 24's /reflect (2026-10-06). The cadence is every 4.
Updated: 2026-10-07 (manual Phase 2 complete)

## In progress (facts to carry forward — NOT judgments)
- **Manual update (operator request 2026-10-06).** The operator's ~425-line edit list for the procedures manual was researched item by item; the resulting plan (`.cycle/manual-update-plan.md`) records every decision in Part A0–A0d, the pushback in Part B, existing errors in Part C, the approved design items in Part D, the seven phases in Part E, the review-packet questions in Part F, and an item-by-item status in Appendix 1. Phase 1 (Foundations) is committed and pushed; block: `.cycle/blocks/24-manual-p1-broad-implement.md`.
- Phase 2 (text edits, six batches) is committed and pushed: 9058dda · debddec · 36949f0 · a8bdda3 · 79d8566 · f64a4d7. Block: `.cycle/blocks/24-manual-p2-broad-implement.md` — its FOLLOW-ON list says which list lines wait for images/URLs and which for Phases 3–6.
- Next: Phase 3 (consolidations: 7.9/EAA/O2 billing → Billing, the waiver matrix, compliance in one table, 1.6 into 1.4, 5.6.2 into 5.6.1, deletes B.2 · 10.C · 10.3.4 · 10.A, duplicate scripts). 6.9 → 5.10 and 6.6.3 → 5.9.2 are ALREADY done (Phase 2 items 246/249). Then Phase 4 (the ONE renumber + Chapter rename + app id migration + deploy), Phase 5 (directory, glossary, index curation, cards), Phase 6 (packets), Phase 7 (sweeps, PDF pass).
- Chapter colours + icons: APPROVED (2026-10-07, without the family stripe) and APPLIED — one source, `manual/data/chapter_style.json`; block `.cycle/blocks/24-manual-colours-broad-implement.md`. The Phase 4 renumber must re-key that file (it is keyed by today's part keys) and the reader's `KB_MANUAL_CHAPTER_ICONS` / `--man-pN` / `--dg-pN` with it.


## Completed this cycle
- Seams F1 | 90_qa.js, qa/script_qa.html, test/visual/mock.js | a QA exemption revoke clears the KEY that granted it (`qaExemptKeyFor_`); a revoke of a key with no active grant is refused by name
- Seams F2 | 30_callnotes.js, 00_config.js | the EOD digest stamps `CallNotesEodDigest` on a failed send or an unreadable Sheet; only a run that reached a rep clears it
- Seams F3 | 00_config.js, 10_core.js | `TRIGGER_HANDLER_JOB_KEYS` — the dispatcher stamps a grouped job's KEY (labelled, seen by its heartbeat) and never clears a key the job owns
- Seams F4 | kb/script_kb.html | the Search synonyms and Revision history × go through `closeOverlay` (INV-358); the SH-02 net now flags a hand removal
- Seams F6 | 30_callnotes.js | `findCallNoteRow_` re-checks the fetched row's NoteId (the FORM-1 rule)
- Seams F8 | tc/script_timeoff.html | the Time / PTO calendar names a failed archive read
- Seams F19 | 20_timeclock.js | an un-approve that cannot credit keeps the Deducted charge, names it, and a re-approval never takes the day twice
- Seams F7 | cn/script_callnotes.html | both email composers open with the UI-ESC `unsaved` guard (operator-approved 2026-10-05); scenario S137
- Seams F11 | 10_core.js, 00_config.js, Tests.js, docs/operator-state.md | the full suite REFUSES an unmarked instance unless `allowFullSuiteHere()` opened the 2-hour `SUITE_UNMARKED_OK_UNTIL` window
- Seams F20 | 70_kb.js | a KbImages tab with an edited header reads could-not-read (`headerChanged`), never not-stored
- Seams F18 | 70_kb.js | `kbSearchIndexKey_` hashes `kbSlug_`; a pin derives the builder's call closure
- Seams F5 | .cycle/config.md, run.js | a HELD NUMBERS line in the library; the id pin reads it and fails when it cannot
- Seams F17 | .cycle/config.md, run.js | INV-229/230/231/374/375 written; INV-375's call-graph pin; INV-350 retired; the rest held as proposed
- Seams F9 | run.js | the X1 derivation sees comment-broken chains, bracketed names and stored runners; ten RPCs classified
- Seams F10 | run.js | the gate-coverage net enumerates the QA family
- Seams F12 / F13 / F14 / F8r | run.js | INV-362's owner pins; INV-360 twins compared as whole bodies; Batch 15 cases derived from the shard; doctor/adjust windows pinned below the archive floor
- Seams F15 / F16 | config.md, CLAUDE.md, docs/* | INV-44/85/190/306/371/357 text; Area Eligibility "displayed"; stale dash keys; g112 count and two missing keys (anchor renamed)
- Seams F21 | 60_intake.js | an intake recipient has exactly one @ and no quoted local part

- Manual Phase 1 | manual/{build,make_html,md2model,render,export_reference}.py, render_docx.js, make_all.sh, new roles.py, footnotes.py, rasterize_diagrams.py, check_pdf.py, data/extracts.json; web-app/kb/script_kb.html; run.js MP1-1..6 | role links to the person's B.1 row (one exact-first resolver), Transfer column restored, real tables, Step and ✓/✗ tables (HTML, Word, app), footnotes, index fixes, Word images/diagrams/links/page breaks, PDF blank-page check, Start-here front page, department-guide manifest
- Manual Phase 2 | manual/src/* (all chapters, Cards 0–10), data/{changelog,roster,equipment,fees,glossary}.json, render.py, make_html.py, make_diagrams.py, mocks_b1/b2/power.py, make_flow_diagrams.py, diagrams/*.svg (+ cost-share), web-app/kb/script_manual_diagrams.html | the operator's edit list, chapter by chapter; new sections 0.14, 1.1.10, 2.8.5, 4.10.3, 8.9, 10.15.1, 10.20.5, 9.5.1; new roles PAR team / PAK Appointment Scheduling / T3Q / Denials Team; `roster:oncall`; ☐ checklists; the cost-share diagram; 32 changelog entries
- Manual chapter colours + icons | manual/data/chapter_style.json (new), make_html.py, render_docx.js, rasterize_diagrams.py, mocks_power.py (+ power-process.svg); web-app/script_icons.html, styles_design_tokens.html, kb/script_kb.html, kb/script_manual_diagrams.html; run.js MP2-1..4 | the v2 palette and eleven chapter icons in the HTML (heading badges, sidebar, eyebrows, card chips, card contents), Word (heading badge + stripe) and the Reference reader (title badge + stripe, tree icon, diagram colours); Field Ops light #2D7E52 (4.5:1 on every app paper)

## Pending / not yet done
- **Manual Phase 1 + chapter colours deploy (app part):** `cd web-app && clasp push -f` + New version — the Reference renderer's step / ✓/✗ table styles, AND the chapter badges/stripes/tree icons and the diagrams' chapter colours (the diagram partial changed: a code deploy, not the import). Then re-export `manual.json` and import (Reference → Manual → Choose File → Check → Import): the front page, the four ✓/✗ tables and 6.2's corrected role link update.
- **Manual Phase 2 deploy:** the same `clasp push -f` + New version carries the regenerated diagram partial (lifecycle, escalation chain, eligibility bar, power process, new cost-share); then re-export and import `manual.json`. Also add E0191 (heel protector, $9.76 for 2) to the OopPricing sheet.
- **Manual Phases 3–7** per `.cycle/manual-update-plan.md` Part E. Operator answers still owed: none blocking (A1); defaults 61–87 approved; item 38 deferred.
- Cycle 24 seams batches: DEPLOYED 2026-10-06 (smoke clear) and REFLECTED; their scenario walks below are still owed.
- ~~`/sync-docs` for both cycle-24 batches~~ DONE 2026-10-06 (gotchas ×11 + their index lines, INV-353/355/356/358/362/372/373 amendments, modules.md, design-decisions.md, deployment.md, README, operator-state.md, operator-log.md, test-harness-log.md).
- **Deploy the cycle-24 batches** (`clasp push -f` + New version; `runSmokeTests` on prod), then walk S4 (TC-04 step), S22, S30, S100 (quarter grant → month revoke), S117, the Dept Request Expand, **S137** (both composers ask), **S2's new F11 step** (an unmarked project refuses; `allowFullSuiteHere()` opens two hours), S34, S52, S59/S60 (a normal custom recipient still sends), S62/S128 (search after the index key changes once).
- **Operator, after the deploy:** the full suite now REFUSES on prod (unmarked) — run `allowFullSuiteHere()` first when you mean to run it there, or (better) stand up the DEV instance (cycle 19 step 8).
- **Then `/reflect`** for cycle 24.
- **Cycle 23 post-deploy — NOT confirmed** (each batch's deploy line, with its scenario list, is in the cycle 23 HISTORY block under Pending):
  - one-time operator steps:
    - Batch 2: read Admin → System → Reference lookups ("Cannot read", "Rows that could not be read in full") and fix the named cells.
    - Batch 4b: set `FORMS_SS_ID` and `DEPT_REQUESTS_SS_ID` to the Intake spreadsheet (System shows "not set" until then).
    - Batch 5: the DR-1 check (two DeptRequests rows sharing a ThreadId).
    - TC-02: deny and re-file any break request flagged "filed without add/correct".
    - Batch 12: paste a screenshot into a test article (the KbImages tab appears); convert a Doc with an image — a "Could not open the source Doc" warning means DocumentApp is blocked too (tell IT with the Drive request).
  - tell the team: the quiz retry limit (3 fails, then 24 h or a manager reset), the outside-recipient confirm on intake, Spanish follow-ups returning unclaimed (a plain thank-you does not), the Dept Request resolve link's confirm page.
  - the editor suite: the DEV nightly (or `runAllTestsPartB` on DEV) for the two Integration B cases — `Expected:` 351.
  - the scenario walks, incl. the new S134, S135 and S136.
- **22post, unconfirmed at close:** the manual.json re-export + import (Reference → Manual → Choose File → Check → Import); the S124–S128 walks; publish the manual by part, then unpublish the old guides once vetted.
- **Editorial, operator's call:** whether to add numbered-heading anchors in the manual source for the links `node scripts/manual-xref-report.mjs --list` names (it changes the printed number).
- **Cycle 22's regression walks — NOT confirmed** (S4, S25, S55, S59–S61, S68, S69, S74, S76, S80, S87, S90, S97, S98, S101, S114–S118), plus the 22post batch walks S119–S123.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true` plus standing up the DEV instance (Operator-Only State Gaps, the weakest axis FIVE reflections running); steps 2, 5 and 6 unconfirmed.
- The cycle-20 post-deploy walk items (S111 step 5, S110 step 5, S7's Day Edit steps, S113, the sheet doctor run) and 21post's S64/S18/S112/S73 walks.
- **Operator sheet check (21post):** any `Local` left in `OopPricing` under Admin → System → Reference lookups → "Cannot read".
- **DEFERRED, operator decisions:** F-09's holiday FALLBACK; what a LocationAcceptance city row's Accepts column decides; HR-2 (roadmap — the operator is the only editor of the HR sheet and the script); whether members' first names should join the Spanish courtesy vocabulary ("Gracias Ana" still reopens).

## Open follow-on items
- **Drive for Apps Script (the cycle-23 lead item, still open).** The domain disables it (M4-FU3, 2026-09-29). Article and manual images no longer need it (DRV-3, M4-FU3); Drive embeds, office-file ingest, the embed reachability check and QA recording sync/playback still do. Ask IT to allow Apps Script Drive, or rework each.
- **Cycle 23 batch follow-ons** — full text in each block (`.cycle/blocks/23-*-broad-implement.md`) and listed in the cycle 23 HISTORY block. The heaviest:
  - Batch 15: rules still without an editor case (CN-3, INT-2, CORE-04, the Spanish Gmail readers); the two Integration B cases are verified by reading only.
  - Batch 14: `getTimesheetData` and the manager timesheet ship `archiveError` without rendering it.
  - Batch 13: the pending core's voicemail `seen` set is pending email threads only (a pre-existing double-fold path).
  - Batch 12: no cleanup for orphaned KbImages rows; no Storage Health line for the tab.
  - Batch 8: the QA queue/stats/log/sampler still read the 2,000-row tail; `qaReadExemptions_` is a row-count tail.
  - Batch 7a: `spanishSpanStartRow_` / `schedSpanStartRow_` are one function twice.
  - Batch 6a: approval does not re-check the closed-day rule.
  - Batch 11: the training spec §9.4 still says unlimited retries.
- **Proposed invariants still held (not written):** INV-232, INV-240..242, INV-301..303, INV-351..352 — see the HELD NUMBERS line for each one's status.
- **22post and cycle 22 follow-ons** — full text in their HISTORY blocks (incl. the intermittent DOM pin `the resume request states the unpaid gap before it is filed`, and `assertNotProdInstance_` permitting while `INSTANCE_IS_PROD` is unset).
- **Numbers — do not reuse:** the held invariant numbers now live in `.cycle/config.md`'s `HELD NUMBERS` line (seams F5) — that line, not this one, is what the pin reads. INV-229/230/231/374/375 were written this cycle; INV-350 is retired. **Next free: INV-376; gotcha g168; scenario S138.**

## Decisions made (so the next session doesn't re-litigate)
- **Seams F7 (operator, 2026-10-05):** both email composers ask "Discard changes?" once the rep has typed; Keep editing changes nothing (composer, email, Save & Compose transaction, saved note); Discard runs today's close unchanged. The tab switch and a send still close through the hook directly and never ask.
- **Seams F11 (operator-approved via the batch, 2026-10-05):** an UNSET `INSTANCE_IS_PROD` refuses the full suite. The override is explicit and EXPIRING (`allowFullSuiteHere()` → `SUITE_UNMARKED_OK_UNTIL`, 2 h), owner-only, and never opens on a project marked prod. This reverses the operator-state line that called unset-as-prod "still an operator decision".
- **Seams F20:** only KbImages reports an edited header as could-not-read; ManualImages keeps "old layout reads as not imported" so the next import rewrites it (M4-FU3).
- **Seams F17:** adopt only what is already pinned (229–231) or newly pinned (374 scoped to its three readers, 375 with a call-graph pin); everything else stays held as proposed; INV-350 retired as subsumed.
- **Seams F9:** the ten newly-seen RPCs are LISTED beside their siblings (reads owed a fixture, writes no scenario performs), not given fake fixtures.
- **Seams F19 (cycle 24):** the `Deducted` cell means what the row CURRENTLY holds against the balance — an un-approve that cannot credit (tracking off / PtoEnabled FALSE) keeps it, and a re-approval of a row still holding a charge takes nothing. Keeping the cell alone would restore nothing, so the re-approval guard is what makes it matter. No client path un-approves today.
- **Seams F3 (cycle 24):** the dispatcher keys a grouped job's failure by the job's own key (`TRIGGER_HANDLER_JOB_KEYS`) and never clears a key the job owns — clearing after a normal return would erase the job's own stamp (the EOD digest stamps and returns). `owns` is checked against each job body by a pin, not trusted.
- **Seams F2 (cycle 24):** the EOD digest clears its failure flag only on a run that reached a rep — most hours match nobody, and an idle hour would wipe a failure before the 9am failure digest reads it.
- **Seams F1 (cycle 24):** `qaSetExemption` refuses a revoke of a key with no active grant (a stale page's month revoke) rather than appending a no-op row.
- **TC2-9 (cycle 23 Batch 14):** the archive gate is the archive's OWN reach (its newest date, cached 6 h and cleared by the archiver, unioned with the current window's date) rather than the configured cutoff alone — a window lowered or disabled after a move would otherwise hide rows still in the tab. The export's in-file dedupe now uses the raw COMMENTS key (the accrual's), so only a byte-identical mid-run duplicate is dropped.
- **SP-2 (cycle 23 Batch 13):** the FIRST close wins — a member reply after a manual resolve closes nothing (the old rule let a later reply time the request); a cc'd non-member is neutral (neither answers nor reopens); a member's message answers even on a thread a member opened, as the first-reply rule read it. Operator 2026-10-05: the first-close-wins trade is accepted; courtesy replies are ignored (a message wholly of courtesy words, or a lone courtesy emoji; anything else is a request).
- **Deferred-item decisions (operator, 2026-10-05):** TRN-1 — 3 attempts, then a 24 h wait with a manager reset; the rep sees which questions were wrong and the limit state after a fail, never the correct option. SP-2 — a reopened request comes back unclaimed. KB2-6 — every "and" → either reading in the grid is correct; no grammar change. DRV-3 — the sheet-storage plan proceeds while the IT request runs; defaults: downscale to ≤1600 px wide, cap 1.5 MB, keep GIF/WebP. Intake weight — under 20 lbs or over 1000 lbs reads as unreadable. CN-8 — closed (inside the Workspace BAA). HR-2 — roadmap.
- **TC2-4 (cycle 23 Batch 6b):** a column-O override keeps the tz-default breaks that fall wholly inside its own shift, rather than dropping them all as the scan's plan said — dropping would silently remove still-valid break reminders and lunch grading for overrides that barely move the shift. A per-employee break list is never trimmed.
- **TC-05 (cycle 23 Batch 6a):** rep adjustments are bounded (equal pair, or a shift over `ADJUST_MAX_SHIFT_HOURS` = 16 h), NOT refused on every Clock Out < Clock In — the overnight wrap is a documented, deliberate rule (g127, overnight-local reps), so refusing all wraps would need an operator decision. Manager Day Edit is not bound.
- **TC-04 (cycle 23 Batch 6a):** a row approved before the `Deducted` column existed keeps the old by-type restore — nothing records what it took, so guessing "none" would under-credit every legitimate pre-deploy deduction.
- **KB2-5 (cycle 23 Batch 2):** a LocationAcceptance city row with a BLANK State now reads "cannot tell" — the old "blank = any state" reading dated from when city rows only displayed; since T7 they decide. If the operator wants "any state", the follow-on is an explicit marker in the State cell, not a blank.
- **TC-02 — operator chose option (a) (2026-10-02):** a break adjustment carries its intent ("add a missing break" / "correct the break at HH:MM") on the request (BreakTarget); the server never guesses — a stale target or an unstated break on a day that has one is refused; range mode refuses multi-break days. (b) always-append and (c) refuse-when-ambiguous were rejected: (b) is the same silent wrong write pointed the other way, (c) drops self-service for the common forgotten-second-break case.
- **The procedures manual (operator, 2026-09-28):** maintained long-term in the repo only — `manual/` is the one source; manual sections are read-only in the app; the old guides are unpublished once the manual is live and vetted.
- **No Drive in the manual path (2026-09-29):** the domain disables Apps Script's Drive, so manual.json is chosen from the computer and images live in the ManualImages tab.
- The 22post operator decisions (Close reasons, Scratchpad, presence, Dashboard layout, reply tracking, reopen, DR defaults, Spanish notify) stand as recorded in the 22post HISTORY block.

## Where I left off
Manual-update Phase 2 is committed and pushed on `claude/beautiful-bohr-7l8epj` (f64a4d7). The final head read: pure 1250, DOM 222, lint, counts; manual build ERRORS 0 / WARNINGS 31 / 12 print pages. Next: the operator deploys the app (diagram partial + Phase 1 styles) and re-imports `manual.json`; then start Phase 3 (consolidations) from `.cycle/manual-update-plan.md` Part E. Phase 3 skips 6.9 → 5.10 and 6.6.3 → 5.9.2, which Phase 2 already did.
