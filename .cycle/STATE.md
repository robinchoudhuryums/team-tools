# Cycle State

## Current
Cycle: 23 — opened by the 2026-10-01 `/broad-scan` (0 Critical / 5 High; plan of 13 batches + 8 deferred, in chat). Cycle 22 and 22post are in `.cycle/HISTORY.md`.
Phase: implement
Scope: broad — Batch 2 (KB2-1, KB-1, KB2-2, KB2-3, KB2-4, KB2-5, KB2-7, KB2-10); Batch 1 done except TC-02
Test Command: manual
Estimates: Batch 1: M (~9 h) · Batch 2: M (~11 h) — each written before its first edit
Subsystem cycles since last Seams audit: 3 — reset to 0 by the 2026-09-18 audit; incremented by cycle 22's /reflect (2026-09-25) and 22post's /reflect (2026-09-30). The cadence is every 4, so the next reflection reaches it.
Updated: 2026-10-01 (cycle 23 Batch 1)

## In progress (facts to carry forward — NOT judgments)
- Cycle 23 opened 2026-10-01 with a `/broad-scan` (0 Critical / 5 High / ~110 findings; the full report and 13-batch plan are in that session's chat — the batch→ID list is copied under Pending below).
- Batch 1 implemented on branch `claude/blissful-johnson-cottl5` (block: `.cycle/blocks/23-batch1-broad-implement.md`); NOT yet deployed. TC-02 held back on a decision.
- Batch 2 implemented on the same branch (block: `.cycle/blocks/23-batch2-broad-implement.md`); NOT yet deployed. /sync-docs for Batch 2 not yet run.
- Everything through 22post is merged (PRs #274–#282) and deployed (2026-09-30). The operator was finishing two 22post steps at close: the manual.json re-export + import, and the S124–S128 walks.

## Completed this cycle
- TC-01 | web-app/20_timeclock.js | the payroll export appends through appendRowsSafe_ (threw past ~998 rows)
- ADM-05 | web-app/70_kb.js, 00_config.js | data-table import: cell ceiling checked pre-dry-run, grid grown before clear(), previous table restored on a failed write
- SH-01 | web-app/script_core.html | ensureOverlay restacks a reused overlay on reopen (copy-failure modal no longer opens beneath the composer)
- CNUI-07 | script_core.html, cn/script_callnotes.html | the save toast rides the copy outcome
- CNUI-01 | cn/script_callnotes.html | a failed save never overwrites a newer sticky draft
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
  - Batch 1 — DONE except **TC-02 (blocked: needs an operator decision — see Decisions pending)**.
  - Batch 2 eligibility fail-open — DONE (KB2-1, KB-1, KB2-2, KB2-3, KB2-4, KB2-5, KB2-7, KB2-10)
  - Batch 3 disabled Drive: DRV-1, QA-1, DRV-2, DRV-4, DRV-5 + a "scope granted / service disabled" visual scenario
  - Batch 4a automation honesty: CORE-01, HR-3, MAIL-4, CORE-02, TC-07, QA-3
  - Batch 4b failure-as-data reads: ADM-04 (+ the mock fixture + F-11 pin), ADM-09, ADM-07, ADM-08, MET-1, TC2-2, MET-2/3/4, KBUI-1, METUI-1, ADM-11
  - Batch 5 Spanish/DR: SP-1, DR-2, DR-1, RES-1, SP-3, SP-4, DR-3
  - Batch 6a PTO/punch: TC-03, TC-04, TC-05, TC-06, TC-08, CORE-07, VIS-1
  - Batch 6b schedules: TC2-1, TC2-6, TC2-3, TC2-4, TC2-7, TC2-8, COA-2, MET2-2
  - Batch 7a store data: FORM-1, HR-1+CN-7, FORM-2, FORM-3, FORM-4, FORM-5, CN-1, CN-2, CN-4, CN-5
  - Batch 7b CN client: CNUI-02, CNUI-03, CNUI-04, CNUI-05, CNUI-06, CNUI-08, CNUI-09
  - Batch 8 QA: QA2-1, QA2-2, QA2-3, QA-2, QA-4, QA-5, QA2-4/5, QAUI-1
  - Batch 9 editors/a11y: UI-ESC, INTUI-1, TRUI-2, KB2-9, KB2-8, ADM-06, ADM-10/KBUI-5, SH-02, SH-03/04/05, TCUI-1
  - Batch 10 PHI/config: KBUI-2, KB-2, INT2-3, INT-1/INT2-1/INT2-2, INT-2/INT2-4, CN-3, ADM-12, ADM-13/CORE-04/05/06/03/TRN-2, MET-5/MET2-1
  - Deferred (decisions): DRV-3, SP-2, KB2-6, HR-2, TRN-1, CN-8, INT-3, TC2-9
- **Batch 1 deploy + walks:** clasp push + New version; S8 with >1,000 rows; S18's blocked-clipboard step twice via Save & Compose; S1.
- **Batch 2 deploy + operator check:** after the push read Admin → System → Reference lookups ("Cannot read", "Rows that could not be read in full") and fix the cells now named; walk S112's new eligibility cases and S65's save-while-uploading step.
- **22post, unconfirmed at close:** the manual.json re-export + import (Reference → Manual → Choose File → Check → Import); the S124–S128 walks; publish the manual by part, then unpublish the old guides once vetted.
- **Editorial, operator's call:** whether to add numbered-heading anchors in the manual source for the links `node scripts/manual-xref-report.mjs --list` names (it changes the printed number).
- **Cycle 22's regression walks — NOT confirmed** (scenario steps in `.cycle/config.md`: S4, S25, S55, S59–S61, S68, S69, S74, S76, S80, S87, S90, S97, S98, S101, S114–S118), plus the 22post batch walks S119–S123.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true` plus standing up the DEV instance (Operator-Only State Gaps, the weakest axis four reflections running); steps 2, 5 and 6 unconfirmed.
- The cycle-20 post-deploy walk items (S111 step 5, S110 step 5, S7's Day Edit steps, S113, the sheet doctor run) and 21post's S64/S18/S112/S73 walks.
- **Operator sheet check (21post):** any `Local` left in `OopPricing` under Admin → System → Reference lookups → "Cannot read".
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK; what a LocationAcceptance city row's Accepts column decides.

## Open follow-on items
- **Lead item for cycle 23 — the domain disables Apps Script's Drive (M4-FU3, confirmed 2026-09-29).** Every other Drive feature is plausibly broken: the converter's images, paste-a-screenshot, the KB Images folder + the article image fallback, the embed reachability check, QA recording sync/playback. Admin → System's Drive row reads the SCOPE and cannot see an admin-disabled service. Ask IT to allow Apps Script Drive, or rework each. The ~1.6 MB single-call manual upload is unverified in a real runtime (fallback: chunked).
- **22post reflection candidates, not yet in the library:** INV-350 (no path the manual import or reader reaches calls Drive), INV-351 (an import that fails in transport says so, never as a defect of the file), INV-352 (the floating Scratchpad stacks beneath every modal overlay — a ui-dialog can open beneath the panel today, z 56).
- **22post batch follow-ons** (full text in the 22post HISTORY block): A — no visual opens the composer on a Close Order, the team Median sub-line ellipsizes at half width, the date range does not reach the server-derived table/cards; B — no pressed toolbar state, no visual of formatted content; C — no DOM harness drives renderManagerView, the manager fixture's Leo Kim has an impossible shape, no toast on the assignee's open window; D — the scan's counts are only logged; E — Half/Full shows on a phone, no drag-to-reorder; M5b — the highlighter marks a two-letter word inside longer words and marks the results heading, `kbMarkReviewed` does not bump the KB generation (named exemption in M5b-I2).
- **Carried from cycle 22** (full list in its HISTORY block): S6 is server-only; the coaching business-days note and the Spanish auto-assign flag description still say "US holidays"; Save Departments lets two rows share a name; the half-day grade's three gaps; the client `coachTsMs_` reads coaching stamps as UTC and M7's class survives in three readers; X1 names reads owed a fixture and the mock lacks `adminScanStoredFormulas`; the missing visual scenarios; an intermittent DOM pin (`the resume request states the unpaid gap before it is filed`); `assertNotProdInstance_` permits while INSTANCE_IS_PROD is unset.
- **Numbers — do not reuse:** INV-225..227 RESERVED (cycle 20); INV-229..232, INV-240..242, INV-301..303 and INV-350..352 PROPOSED (cycles 21, 21post, 22, 22post), not in the library. **Next free: INV-353; gotcha g163; scenario S132.**

## Decisions made (so the next session doesn't re-litigate)
- **KB2-5 (cycle 23 Batch 2):** a LocationAcceptance city row with a BLANK State now reads "cannot tell" — the old "blank = any state" reading dated from when city rows only displayed; since T7 they decide. If the operator wants "any state", the follow-on is an explicit marker in the State cell, not a blank.
- **TC-02 is NOT a code-only fix (cycle 23 Batch 1):** a break adjustment cannot say "correct my existing break" vs "add a missing one" — the modal and the PunchAdjustRequests row carry no intent. Pending an operator choice among: (a) an intent control on break types, carried in the request; (b) break types always append, corrections via manager Day Edit; (c) refuse a break adjustment on a day that already has that type. Do not guess the semantics.
- **The procedures manual (operator, 2026-09-28):** maintained long-term in the repo only — `manual/` is the one source; manual sections are read-only in the app; the old guides are unpublished once the manual is live and vetted.
- **No Drive in the manual path (2026-09-29):** the domain disables Apps Script's Drive, so manual.json is chosen from the computer and images live in the ManualImages tab.
- The 22post operator decisions (Close reasons, Scratchpad, presence, Dashboard layout, reply tracking, reopen, DR defaults, Spanish notify) stand as recorded in the 22post HISTORY block.

## Where I left off
Cycle 23 Batches 1 and 2 are committed and pushed on `claude/blissful-johnson-cottl5` (Batch 1: 5 of 6, TC-02 awaits the operator's choice; Batch 2: all 8). Next: `/sync-docs` for Batch 2, deploy both batches and walk S8/S18/S112/S65 + read the Reference-lookups diagnostics, then `/broad-implement Batch 3` (disabled Drive). The next /reflect reaches the Seams-audit cadence.
