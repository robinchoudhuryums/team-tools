# Cycle State

## Current
Cycle: 23 — opened by the 2026-10-01 `/broad-scan` (0 Critical / 5 High; plan of 13 batches + 8 deferred, in chat). Cycle 22 and 22post are in `.cycle/HISTORY.md`.
Phase: implement
Scope: broad — Batches 1–5 (TC-02 included), 6a and 6b done and doc-synced; next Batch 7a
Test Command: manual
Estimates: Batch 1: M (~9 h) · Batch 2: M (~11 h) · Batch 3: M (~9.5 h) · Batch 4a: M (~10 h) · 4a follow-ons: S (~3 h) · Batch 4b: M (~11 h) · TC-02 (option a): M (~8 h) · Batch 5: M (~10 h) · Batch 6a: M (~9.5 h) · Batch 6b: M (~10 h) — each written before its first edit
Subsystem cycles since last Seams audit: 3 — reset to 0 by the 2026-09-18 audit; incremented by cycle 22's /reflect (2026-09-25) and 22post's /reflect (2026-09-30). The cadence is every 4, so the next reflection reaches it.
Updated: 2026-10-02 (cycle 23 Batch 6b + its /sync-docs)

## In progress (facts to carry forward — NOT judgments)
- Cycle 23 opened 2026-10-01 with a `/broad-scan` (0 Critical / 5 High / ~110 findings; the full report and 13-batch plan are in that session's chat — the batch→ID list is copied under Pending below).
- Batch 1 implemented on branch `claude/blissful-johnson-cottl5` (block: `.cycle/blocks/23-batch1-broad-implement.md`); NOT yet deployed. TC-02 held back on a decision.
- Batch 2 implemented on the same branch (block: `.cycle/blocks/23-batch2-broad-implement.md`); NOT yet deployed. /sync-docs for Batch 2 done.
- Batch 3 implemented on the same branch (block: `.cycle/blocks/23-batch3-broad-implement.md`); NOT yet deployed. /sync-docs for Batch 3 done.
- Batch 4a and its follow-ons implemented on the same branch (blocks: `.cycle/blocks/23-batch4a-broad-implement.md`, `…-batch4a-followons-broad-implement.md`); NOT yet deployed. /sync-docs for both done.
- Batch 5 implemented on the same branch (block: `.cycle/blocks/23-batch5-broad-implement.md`); NOT yet deployed. /sync-docs done.
- TC-02 implemented on the same branch as option (a) (block: `.cycle/blocks/23-tc02-broad-implement.md`); NOT yet deployed. /sync-docs done.
- Batch 4b implemented on the same branch (block: `.cycle/blocks/23-batch4b-broad-implement.md`); NOT yet deployed. /sync-docs done.
- Batches 1–5 (+ TC-02, 4a follow-ons) merged to main as PR #284 (2026-10-02); the branch was restarted from main after the merge. NOT yet deployed.
- Batch 6b implemented on the same branch (block: `.cycle/blocks/23-batch6b-broad-implement.md`); NOT yet deployed. /sync-docs done.
- Batch 6a implemented on the restarted branch (block: `.cycle/blocks/23-batch6a-broad-implement.md`); NOT yet deployed. /sync-docs done.
- Everything through 22post is merged (PRs #274–#282) and deployed (2026-09-30). The operator was finishing two 22post steps at close: the manual.json re-export + import, and the S124–S128 walks.

## Completed this cycle
- /sync-docs (Batch 6b) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g154/g88/g123/g149/g59 extended (index + AMENDED narratives); the reminders, telemetry-strip and half-day decisions amended; column O, onboarding and Coverage operator notes; INV-354 added; S72/S75/S76/S98/S99/S102/S110/S118 steps
- TC2-1 | script_core.html | the reminder ticker uses a state snapshot only for its own day; a stale day forces one immediate refresh
- TC2-6 | 20_timeclock.js | onboarding refuses a timezone id the runtime does not know (Intl probe; offset tokens and an unable runtime pass)
- TC2-3 | 20_timeclock.js, tc/script_manager.html, mock | the planner counts an approved half day as a tentative presence
- TC2-4 | 20_timeclock.js, script_core.html | a column-O override keeps only tz-default breaks inside its shift; the ticker reminds only of in-shift breaks
- TC2-7 | 20_timeclock.js, tc/script_manager.html | punctuality reads "not started yet" before the shift (plus grace) and for dates ahead
- TC2-8 | 20_timeclock.js, tc/script_manager.html, mock | Team on-time "—" with no graded day; holidays leave the manager trends and are closed in the planner
- COA-2 | 10_core.js, index.html, train/script_coaching.html | the client reads coaching stamps in CONFIG.TIMEZONE (SERVER_STORAGE_TZ)
- MET2-2 | 10_core.js, 40_metrics.js | the inbound-volume average leaves holidays out of its denominator
- /sync-docs (Batch 6a) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g27/g28/g127/g15 extended (index + AMENDED narratives); PTO bucket, reconciliation and punch-queue decisions amended; new operator entry for the TimeOffRequests `Deducted` column (+ inventory line); INV-03/94/159 amended, INV-353 added; S4/S5/S7/S13/S75/S92 steps, S133 added
- TC-03 | 20_timeclock.js, Tests.js | single-date time off refuses a weekend or company holiday (rep + manager paths); the editor fixture date is a working day
- TC-04 | 00_config.js, 20_timeclock.js | TimeOffRequests `Deducted` records what an approval took; un-approving restores exactly that (blank = legacy by-type)
- TC-05 | 00_config.js, 20_timeclock.js | rep adjustments refuse an equal pair or a shift over 16 h at Apply now, submit and approval; the writer keeps the ctx current
- TC-06 | 20_timeclock.js | the reconciliation fix refuses when no credit can land, reverts on a null credit; detector + fix read the recorded charge; PTO-off reps skipped
- TC-08 | 20_timeclock.js, tc/script_manager.html | the doctor's collapse keeps the stamp the hours count (pay unchanged); the card names it
- CORE-07 | 20_timeclock.js | the EmployeeOffboard audit row names the offboarded rep, PunchDate blank
- VIS-1 | modals.html | Day Edit hint says "(check AM or PM)"
- /sync-docs (Batch 5) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g53/g152/g155/g159/g143 extended (index + AMENDED narratives); the voicemail-fold and reply-rules decisions amended; new decision `the-resolve-link-opens-a-confirm-page`; Spanish + DR operator notes (the ThreadId check); INV-31 span text; S74/S80/S101/S105/S122 cycle-23 steps
- SP-1 | 51_spanish.js, 20_timeclock.js | a voicemail after a manual resolve can be resolved (latest-row fold, re-resolve, Needs-you trusts the pending ids)
- SP-3 | 00_config.js, 51_spanish.js, metrics/script_metrics.html | resolve/claim tabs read by a 180-day span; a failed read throws; unknown claims flagged and auto-assign refuses
- SP-4 | 51_spanish.js | auto-assign reads pending through the ungated `spanishPendingCore_`
- DR-2 | 50_deptrequests.js | the latest department reply decides
- DR-1 | 50_deptrequests.js | a shared thread's reply resolves only the request whose link it quotes
- RES-1 | 61_forms.js, 50_deptrequests.js, 00_config.js, metrics/script_deptrequests.html, Tests.js | the resolve link is a confirm page; the sender's own click is 'self', untimed
- DR-3 | 10_core.js, 50_deptrequests.js, 51_spanish.js, metrics/script_deptrequests.html | true medians (`medianWhole_`)
- /sync-docs (Batch 4b + TC-02) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g02/g05/g53/g122/g128/g129/g151 amended; new g163 (an adjustment that names a type must say which); the break-adjustment decision + three amended decisions; BreakTarget + the Forms/DR warnings in operator-state; S7/S43/S44/S62/S64/S95/S96/S97/S114/S117 steps; new S132
- TC-02 | 00_config.js, 20_timeclock.js, modals.html, tc/script_clock.html, tc/script_manager.html | a break adjustment says which break (add / correct the one at HH:MM) — one resolver for every writer, refused rather than guessed; request column BreakTarget; range mode refuses multi-break days; getMyDayBreaks
- ADM-04 | 10_core.js, test/visual/mock.js | Forms / Dept Requests on the ADP fallback read configured:false (still probed)
- ADM-09 | 10_core.js, test/visual/mock.js | deploy readiness gains a `health` row from the one problem list the dot counts
- ADM-07 | cn/script_callnotes.html, test/visual/mock.js | Reference-lookups diagnostics become storage-area findings (cnOopFindings_)
- ADM-08 | 10_core.js, cn/script_callnotes.html | an unset HR/QA store is "not set up" in the formula scan, never "could not open"
- MET-1 | 40_metrics.js | the range endpoint refuses a failed CDR read; a missing DQE tab names itself to the breakdown readers
- MET-2/3/4 | 40_metrics.js | My Stats, the ambient badge and the Team Metrics range trend never cache a degraded round; ambient says `unavailable:'cdr'`
- METUI-1 | metrics/script_metrics.html | the alert badge survives an unreadable or failed poll
- TC2-2 | 20_timeclock.js, cn/script_callnotes.html | shift stats ship `cdrUnavailable`, render a notice, never cache the round
- KBUI-1 | kb/script_kb.html | a failed Reference search (tab + drawer) is an error state, never "No matches"/the CTA; no query in it
- ADM-11 | cn/script_callnotes.html | a truncated note history says so
- /sync-docs (Batch 4a + follow-ons) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g142/g122/g145/g53 extended; INV-151 reworded, INV-161 amended; S9/S55/S99/S117 steps; the automation-health decision amended
- 4a-FU1/FU2/FU3 | 00_config.js, 10_core.js, cn/script_callnotes.html | a stale heartbeat names its job's recent failure (not the trigger); every stamp ships a label from one map; the shared purge deletes contiguous runs (block: 23-batch4a-followons-broad-implement.md)
- CORE-01 | 10_core.js | the brief heartbeats only after it delivers (a failed send lets the four digests resume); send failures + throws stamped; briefConfig names both causes
- CORE-02 | 10_core.js, script_core.html | a failed badge compute is unknown, uncached, dot kept; the health digest stamps clean only after its send
- HR-3 | 81_empdocs.js, 20_timeclock.js, 82_coaching.js, 80_training.js | HR sweeps throw by name when set-but-unreadable (unset = []); training digest says what it could not read; coaching recap counts false sends
- MAIL-4 | 50_deptrequests.js, 20_timeclock.js, 80_training.js | dept reminder, missed-punch alerts and training digest stamp failed sends
- TC-07 | 20_timeclock.js | the timesheet archive stamps its failure
- QA-3 | 10_core.js, 90_qa.js | QA purge on the shared deleter (C5 spare row) with a ms reader; failure stamped
- /sync-docs (Batch 3) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g142 extended (a permission check cannot see a disabled service); the missing-SCOPE + Storage Health decisions amended; KB_IMAGES_FOLDER_ID + QA operator notes; INV-197, S104, S90 amended
- DRV-1 | 00_config.js, 10_core.js, cn/script_callnotes.html | the Drive line exercises the SERVICE (getRootFolder); a disabled service is a FAIL naming every surface; folder advice never says clear the property
- QA-1 | 10_core.js, 90_qa.js, cn/script_callnotes.html | QA folder probed (QA_FOLDER_PROP); sync + playback name a disabled Drive by DRIVE_DISABLED_MSG
- DRV-2 | 70_kb.js, cn/script_callnotes.html | embed scan stops on a disabled service (driveUnavailable), never lists every embed broken
- DRV-4 | 70_kb.js | KB Images folder replaced only when Drive says it is gone
- DRV-5 | 70_kb.js | a folder that cannot open keeps the converter's kbdoc tokens
- (scenario) | test/visual | ?drive=disabled hook + admin-system-drivedisabled-* shots
- TC-01 | web-app/20_timeclock.js | the payroll export appends through appendRowsSafe_ (threw past ~998 rows)
- ADM-05 | web-app/70_kb.js, 00_config.js | data-table import: cell ceiling checked pre-dry-run, grid grown before clear(), previous table restored on a failed write
- SH-01 | web-app/script_core.html | ensureOverlay restacks a reused overlay on reopen (copy-failure modal no longer opens beneath the composer)
- CNUI-07 | script_core.html, cn/script_callnotes.html | the save toast rides the copy outcome
- CNUI-01 | cn/script_callnotes.html | a failed save never overwrites a newer sticky draft
- /sync-docs (Batch 2) | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g41/g128/g120 extended; ELIG + OOP-B decisions amended; the operator sheet rules; S65 + S112 cycle-23 steps
- /sync-docs (Batch 1) | CLAUDE.md, docs/gotchas.md, docs/modules.md, docs/test-harness-log.md, .cycle/config.md | g145/g100/g76/g86 extended (index + AMENDED narratives); modules notes for the export, the data-table import and the save path; S18 updated; S129–S131 added
- KB-1 | web-app/70_kb.js | lowercase or/and are connectives; everyday-word lowercase tokens are not codes
- KB2-1 | web-app/70_kb.js | a state beside the city clause unions only with an explicit "or", no parentheses
- KB2-2 | web-app/70_kb.js | Open parenthetical allow-list (places need an including-word)
- KB2-3 | web-app/70_kb.js | geocode country read; outside the US refused (KB_GEO_US_COUNTRIES)
- KB2-4 | web-app/70_kb.js | warehouse names longest-first, span consumed; radius strip longest-first
- KB2-5 | web-app/70_kb.js | blank-State city rows flagged, never matched (cannot tell)
- KB2-7 | web-app/70_kb.js | whole-line quote match (oopBodyHasLine_)
- KB2-10 | web-app/70_kb.js, kb/script_kb.html | revert keeps the review clock; duplicate warehouse named; Save waits for a pasted image

## Pending / not yet done
- **Cycle 23 plan (from the 2026-10-01 scan; IDs only — the findings are in the scan's chat report):**
  - Batch 1 — DONE (TC-02 done 2026-10-02 as option (a), after the operator's decision).
  - Batch 2 eligibility fail-open — DONE (KB2-1, KB-1, KB2-2, KB2-3, KB2-4, KB2-5, KB2-7, KB2-10)
  - Batch 3 disabled Drive — DONE (DRV-1, QA-1, DRV-2, DRV-4, DRV-5 + the drivedisabled scenarios)
  - Batch 4a automation honesty — DONE (CORE-01, HR-3, MAIL-4, CORE-02, TC-07, QA-3)
  - Batch 4b failure-as-data reads — DONE (ADM-04, ADM-09, ADM-07, ADM-08, MET-1, TC2-2, MET-2/3/4, KBUI-1, METUI-1, ADM-11)
  - Batch 5 Spanish/DR — DONE (SP-1, DR-2, DR-1, RES-1, SP-3, SP-4, DR-3)
  - Batch 6a PTO/punch — DONE (TC-03, TC-04, TC-05, TC-06, TC-08, CORE-07, VIS-1)
  - Batch 6b schedules — DONE (TC2-1, TC2-6, TC2-3, TC2-4, TC2-7, TC2-8, COA-2, MET2-2)
  - Batch 7a store data: FORM-1, HR-1+CN-7, FORM-2, FORM-3, FORM-4, FORM-5, CN-1, CN-2, CN-4, CN-5
  - Batch 7b CN client: CNUI-02, CNUI-03, CNUI-04, CNUI-05, CNUI-06, CNUI-08, CNUI-09
  - Batch 8 QA: QA2-1, QA2-2, QA2-3, QA-2, QA-4, QA-5, QA2-4/5, QAUI-1
  - Batch 9 editors/a11y: UI-ESC, INTUI-1, TRUI-2, KB2-9, KB2-8, ADM-06, ADM-10/KBUI-5, SH-02, SH-03/04/05, TCUI-1
  - Batch 10 PHI/config: KBUI-2, KB-2, INT2-3, INT-1/INT2-1/INT2-2, INT-2/INT2-4, CN-3, ADM-12, ADM-13/CORE-04/05/06/03/TRN-2, MET-5/MET2-1
  - Deferred (decisions): DRV-3, SP-2, KB2-6, HR-2, TRN-1, CN-8, INT-3, TC2-9
- **Batch 1 deploy + walks:** clasp push + New version; S8 with >1,000 rows; S18's blocked-clipboard step twice via Save & Compose; S1.
- **Batch 6b deploy:** optionally set per-employee breaks for reps with a column-O override; walk the reminder scenarios (a window left open overnight), S75 (a misspelled zone), Coverage, S110, Punctuality and the coaching board.
- **Batch 6a deploy:** optionally deny any pre-deploy Pending single-date request on a weekend/holiday (approval is not re-checked); walk S4, S5, S7, S13, S75, S92 and S133.
- **Batch 5 deploy:** the DR-1 operator check (any two DeptRequests rows sharing a ThreadId?); tell the departments the resolve link now opens a page with a button; walk S74/S80/S101/S105/S121/S122.
- **TC-02 deploy:** deny-and-refile any pre-deploy break request the queue marks "filed without add/correct" if its approval is refused; walk S5/S7/S92/S95/S96 and the new break-choice scenario.
- **Batch 4b deploy:** expect System + the Overview checklist to show "Forms (PHI) not set" / "Dept Requests (PHI-adjacent) not set" while those properties are unset (set both to the Intake spreadsheet), a readiness "Automation health" row, and Reference-lookups findings; walk S43/S44/S62/S64/S97/S112/S114/S117.
- **Batch 4a deploy:** expect NEW stamped failures on Admin → System that were invisible before (each names its cause); if `managerDailyBrief` is ON, confirm the 8am brief still arrives (S55).
- **Batch 3 deploy + walks:** after the push, Admin → System should lead with BLOCKING "Drive is disabled for this domain"; walk S104 and S90 (Sync + Play show the disabled message).
- **Batch 2 deploy + operator check:** after the push read Admin → System → Reference lookups ("Cannot read", "Rows that could not be read in full") and fix the cells now named; walk S112's new eligibility cases and S65's save-while-uploading step.
- **22post, unconfirmed at close:** the manual.json re-export + import (Reference → Manual → Choose File → Check → Import); the S124–S128 walks; publish the manual by part, then unpublish the old guides once vetted.
- **Editorial, operator's call:** whether to add numbered-heading anchors in the manual source for the links `node scripts/manual-xref-report.mjs --list` names (it changes the printed number).
- **Cycle 22's regression walks — NOT confirmed** (scenario steps in `.cycle/config.md`: S4, S25, S55, S59–S61, S68, S69, S74, S76, S80, S87, S90, S97, S98, S101, S114–S118), plus the 22post batch walks S119–S123.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true` plus standing up the DEV instance (Operator-Only State Gaps, the weakest axis four reflections running); steps 2, 5 and 6 unconfirmed.
- The cycle-20 post-deploy walk items (S111 step 5, S110 step 5, S7's Day Edit steps, S113, the sheet doctor run) and 21post's S64/S18/S112/S73 walks.
- **Operator sheet check (21post):** any `Local` left in `OopPricing` under Admin → System → Reference lookups → "Cannot read".
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK; what a LocationAcceptance city row's Accepts column decides.

## Open follow-on items
- **Batch 6b follow-ons** (full text in its block): other empState readers were not audited for a day rollover; `saveShiftSchedules` checks timezone keys by shape only; the punctuality table sorts a null on-time first.
- **Batch 6a follow-ons** (full text in its block): approval does not re-check the closed-day rule; `EmployeeAdd`'s audit row has CORE-07's shape; a deny during a tracking-off window clears the record without crediting; no visual fixture for the doctor card; no editor-suite case for the Deducted column, the closed-day refusal or the 16 h bound.
- **Batch 5 follow-ons** (full text in its block): email-request Spanish threads still read any manual resolve as resolving the whole thread; no visual fixture for a 'self' resolve, `claimsUnavailable`, or the resolve page.
- **TC-02 follow-ons** (full text in its block): two same-type "add" requests for one day in one batch are still a duplicate; the personal-sheet mirror is one slot per type; no editor-suite case drives a real multi-break adjustment.
- **Batch 4b follow-ons** (full text in its block): a fallback row repeats the ADP sheet's tz verdict; the readiness health row shows raw problem text; `getMyMetrics` does not flag a failed trend the way the range endpoint now does; no visual scenario for a failed search or shift stats with `cdrUnavailable`.
- **Batch 4a follow-ons — DONE** (4a-FU1/FU2/FU3). Remaining from them: the archive movers may still delete per row under the lock; the mock's automation fixture shows no `failedAt` / `label` state.
- **Batch 3 follow-ons:** the reader's kbdoc pending chip says "appears after Save" to reps; kbGetImageData's generic refusal gives no hint of a disabled Drive; the QA tab has no standing disabled-Drive banner (both responses now carry `driveDisabled`).
- **Lead item for cycle 23 — the domain disables Apps Script's Drive (M4-FU3, confirmed 2026-09-29).** Every other Drive feature is plausibly broken: the converter's images, paste-a-screenshot, the KB Images folder + the article image fallback, the embed reachability check, QA recording sync/playback. Admin → System's Drive row reads the SCOPE and cannot see an admin-disabled service. Ask IT to allow Apps Script Drive, or rework each. The ~1.6 MB single-call manual upload is unverified in a real runtime (fallback: chunked).
- **22post reflection candidates, not yet in the library:** INV-350 (no path the manual import or reader reaches calls Drive), INV-351 (an import that fails in transport says so, never as a defect of the file), INV-352 (the floating Scratchpad stacks beneath every modal overlay — a ui-dialog can open beneath the panel today, z 56).
- **22post batch follow-ons** (full text in the 22post HISTORY block): A — no visual opens the composer on a Close Order, the team Median sub-line ellipsizes at half width, the date range does not reach the server-derived table/cards; B — no pressed toolbar state, no visual of formatted content; C — no DOM harness drives renderManagerView, the manager fixture's Leo Kim has an impossible shape, no toast on the assignee's open window; D — the scan's counts are only logged; E — Half/Full shows on a phone, no drag-to-reorder; M5b — the highlighter marks a two-letter word inside longer words and marks the results heading, `kbMarkReviewed` does not bump the KB generation (named exemption in M5b-I2).
- **Carried from cycle 22** (full list in its HISTORY block): S6 is server-only; the coaching business-days note and the Spanish auto-assign flag description still say "US holidays"; Save Departments lets two rows share a name; the half-day grade's three gaps; M7's class survives in three readers (the client `coachTsMs_` UTC read was fixed in cycle 23 COA-2); X1 names reads owed a fixture and the mock lacks `adminScanStoredFormulas`; the missing visual scenarios; an intermittent DOM pin (`the resume request states the unpaid gap before it is filed`); `assertNotProdInstance_` permits while INSTANCE_IS_PROD is unset.
- **Numbers — do not reuse:** INV-225..227 RESERVED (cycle 20); INV-229..232, INV-240..242, INV-301..303 and INV-350..352 PROPOSED (cycles 21, 21post, 22, 22post), not in the library. **Next free: INV-355; gotcha g164; scenario S134.**

## Decisions made (so the next session doesn't re-litigate)
- **TC2-4 (cycle 23 Batch 6b):** a column-O override keeps the tz-default breaks that fall wholly inside its own shift, rather than dropping them all as the scan's plan said — dropping would silently remove still-valid break reminders and lunch grading for overrides that barely move the shift. A per-employee break list is never trimmed.
- **TC-05 (cycle 23 Batch 6a):** rep adjustments are bounded (equal pair, or a shift over `ADJUST_MAX_SHIFT_HOURS` = 16 h), NOT refused on every Clock Out < Clock In — the overnight wrap is a documented, deliberate rule (g127, overnight-local reps), so refusing all wraps would need an operator decision. Manager Day Edit is not bound.
- **TC-04 (cycle 23 Batch 6a):** a row approved before the `Deducted` column existed keeps the old by-type restore — nothing records what it took, so guessing "none" would under-credit every legitimate pre-deploy deduction.
- **KB2-5 (cycle 23 Batch 2):** a LocationAcceptance city row with a BLANK State now reads "cannot tell" — the old "blank = any state" reading dated from when city rows only displayed; since T7 they decide. If the operator wants "any state", the follow-on is an explicit marker in the State cell, not a blank.
- **TC-02 — operator chose option (a) (2026-10-02):** a break adjustment carries its intent ("add a missing break" / "correct the break at HH:MM") on the request (BreakTarget); the server never guesses — a stale target or an unstated break on a day that has one is refused; range mode refuses multi-break days. (b) always-append and (c) refuse-when-ambiguous were rejected: (b) is the same silent wrong write pointed the other way, (c) drops self-service for the common forgotten-second-break case.
- **The procedures manual (operator, 2026-09-28):** maintained long-term in the repo only — `manual/` is the one source; manual sections are read-only in the app; the old guides are unpublished once the manual is live and vetted.
- **No Drive in the manual path (2026-09-29):** the domain disables Apps Script's Drive, so manual.json is chosen from the computer and images live in the ManualImages tab.
- The 22post operator decisions (Close reasons, Scratchpad, presence, Dashboard layout, reply tracking, reopen, DR defaults, Spanish notify) stand as recorded in the 22post HISTORY block.

## Where I left off
Cycle 23 Batches 1–5 (TC-02 included) are merged to main (PR #284); Batch 6a is committed and pushed on `claude/blissful-johnson-cottl5` (restarted from main). Batch 6a's docs are synced. Batch 6b is committed and pushed too. Batch 6b's docs are synced. Next: deploy and walk the Batch 1–6b scenarios; then `/broad-implement Batch 7a`. The next /reflect reaches the Seams-audit cadence.
