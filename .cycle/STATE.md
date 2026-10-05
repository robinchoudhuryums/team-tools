# Cycle State

## Current
Cycle: 24 — opened 2026-10-05 by the Seams & Invariants audit (cycle 23 is CLOSED; its block is in `.cycle/HISTORY.md`).
Phase: implement
Scope: Seams & Invariants — the small production batch (F1, F2, F3, F4, F6, F8 client note, F19) is DONE; the nets-and-library batch is next.
Test Command: manual
Estimates: production batch (F1/F2/F3/F4/F6/F8/F19): M (~5 h) — written before the first edit. Actual ~2.5 h.
Subsystem cycles since last Seams audit: 0 — reset by the Seams & Invariants audit of 2026-10-05 (cycle 24). The cadence is every 4.
Updated: 2026-10-05 (cycle 24 production batch)

## In progress (facts to carry forward — NOT judgments)
- The seams audit's handoff block travelled by paste (as `/audit` does). Its findings, session-local F1–F21, are listed under Pending so a fresh session can continue without it.
- The production batch is committed and pushed on `claude/beautiful-bohr-7l8epj` (7 fix commits + this checkpoint); block: `.cycle/blocks/24-seams-prod-broad-implement.md`. Not deployed.

## Completed this cycle
- Seams F1 | 90_qa.js, qa/script_qa.html, test/visual/mock.js | a QA exemption revoke clears the KEY that granted it (`qaExemptKeyFor_`); a revoke of a key with no active grant is refused by name
- Seams F2 | 30_callnotes.js, 00_config.js | the EOD digest stamps `CallNotesEodDigest` on a failed send or an unreadable Sheet; only a run that reached a rep clears it
- Seams F3 | 00_config.js, 10_core.js | `TRIGGER_HANDLER_JOB_KEYS` — the dispatcher stamps a grouped job's KEY (labelled, seen by its heartbeat) and never clears a key the job owns
- Seams F4 | kb/script_kb.html | the Search synonyms and Revision history × go through `closeOverlay` (INV-358); the SH-02 net now flags a hand removal
- Seams F6 | 30_callnotes.js | `findCallNoteRow_` re-checks the fetched row's NoteId (the FORM-1 rule)
- Seams F8 | tc/script_timeoff.html | the Time / PTO calendar names a failed archive read
- Seams F19 | 20_timeclock.js | an un-approve that cannot credit keeps the Deducted charge, names it, and a re-approval never takes the day twice

## Pending / not yet done
- **Deploy the cycle-24 production batch** (`clasp push -f` + New version), then walk S4 (TC-04 step), S22, S30, S100 (QA2-1 step: grant from the quarter view, then revoke from one of its months — the button reads "Revoke exemption (Q4 …)" and the rep leaves Exempt), S117 (4a-FU1/FU3 step) and the Dept Request Expand.
- **Next batch — nets and library (from the seams audit, not yet done):**
  - F5: the reserved-number guard in the id-uniqueness pin never runs (it matches STATE prose the close-out reworded); read reserved/proposed numbers from a structured list in config.md.
  - F9: `x1ClientRpcNames_` stops at a `//` comment inside a chain and never sees computed names (`kbGetRevisions`, `kbGetSearchConfig`, `kbGetFacetGuidance`, `intakePreviewPMD/PAP`, `intakeSendPMD/PAP`, `submitTimeOffRequest/Range`, `kbConvertDriveSheet` have no fixture).
  - F10: `gatedEndpointsFromSource_` knows two gate families; add QA.
  - F12: INV-362 cites "INT2-3 Node pins" that do not exist — pin `intakeDraftsKept_` / `intakeDraftOwner_`.
  - F13: the INV-360 parity grid misses tokens (n/a, na, no, neg, nil, unk, uncertain, tbd, dunno, "do not know", seat `without`) — compare the lists directly.
  - F14: the Batch 15 runner's `test_c23_*` list is hand-written — derive it from `_registerSmokeTests_`.
  - F18: `kbSearchIndexKey_` hashes three functions but not `kbSlug_`.
  - F15/F16: invariant text drift (INV-190 `empIsOffToday_`, INV-85 `cdr_metrics_v3`, INV-306 `dept_req_v2`, INV-44 dispatcher counts, INV-371 "14") and docs drift (Area Eligibility "not displayed"; `dash_metrics_v4/v6` in design-decisions.md; g112 "Eighteen" localStorage keys).
  - F17: adopt INV-374 (scoped to its three readers) and INV-375 (worded "an image stored in KbImages/ManualImages" — `kbGetImageData` reads legacy Drive links on purpose; its pin should walk the call graph); decide the other PROPOSED numbers (229–232 are already pinned).
  - F8 remainder: pin `TS_DOCTOR_WINDOW_DAYS` (92) below `TIMESHEET_ARCHIVE_MIN_DAYS` (120).
  - F11: `assertNotProdInstance_` permits while `INSTANCE_IS_PROD` is unset (opposite of `isDevInstance_`) — fail closed unless dev, with an explicit override.
  - F20 (KbImages header edit reads "not stored"), F21 (quoted local part vs `isOrgEmail_`, low confidence) — Low.
- **F7 — HELD for the operator:** should the external (and department) email composer ask "Discard changes?" before Escape / the backdrop / × throws typed work away? Recommendation given 2026-10-05: yes, via the existing `unsaved` guard, asking only when the rep typed since open; after Discard today's rollback runs unchanged.
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
- **Proposed invariants, not yet in the library:** INV-350, INV-351, INV-352 (22post); INV-374, INV-375 (cycle 23 — `.cycle/blocks/23-a-reflect.md`).
- **22post and cycle 22 follow-ons** — full text in their HISTORY blocks (incl. the intermittent DOM pin `the resume request states the unpaid gap before it is filed`, and `assertNotProdInstance_` permitting while `INSTANCE_IS_PROD` is unset).
- **Numbers — do not reuse:** INV-225..227 RESERVED (cycle 20); INV-229..232, INV-240..242, INV-301..303, INV-350..352 and INV-374..375 PROPOSED (cycles 21, 21post, 22, 22post, 23), not in the library. **Next free: INV-376; gotcha g168; scenario S137.**

## Decisions made (so the next session doesn't re-litigate)
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
Cycle 24 is open (the Seams & Invariants audit, 2026-10-05). The production batch (F1, F2, F3, F4, F6, F8 note, F19) is committed and pushed on `claude/beautiful-bohr-7l8epj`, green (pure 1232, DOM 221, lint, counts), 13/13 bite-checks; it needs `/sync-docs`, a deploy and the scenario walks under Pending. Next: the nets-and-library batch (F5, F9, F10, F12–F18, F11) and the operator's answer on F7.
