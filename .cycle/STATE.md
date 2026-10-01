# Cycle State

## Current
Cycle: 22post CLOSED (2026-10-01) — idle between cycles. Cycle 22 and 22post are in
`.cycle/HISTORY.md`. The next `/audit` or `/broad-scan` opens cycle 23.
Phase: idle
Scope: — (none open)
Test Command: manual
Estimates: — (record per batch BEFORE the first edit once cycle 23 plans its batches)
Subsystem cycles since last Seams audit: 3 — reset to 0 by the 2026-09-18 audit; incremented by cycle 22's /reflect (2026-09-25) and 22post's /reflect (2026-09-30). The cadence is every 4, so the next reflection reaches it.
Updated: 2026-10-01

## In progress (facts to carry forward — NOT judgments)
- Nothing in progress. Everything through 22post is merged (PRs #274–#282) and deployed (2026-09-30).
- The operator was finishing two 22post steps at close: the manual.json re-export + import (the M5b glossary synonyms ride it into ManualMeta), and the S124–S128 walks.

## Completed this cycle
- (none — cycle 23 not yet opened)

## Pending / not yet done
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
- **Numbers — do not reuse:** INV-225..227 RESERVED (cycle 20); INV-229..232, INV-240..242, INV-301..303 and INV-350..352 PROPOSED (cycles 21, 21post, 22, 22post), not in the library. **Next free: INV-353; gotcha g163; scenario S129.**

## Decisions made (so the next session doesn't re-litigate)
- **The procedures manual (operator, 2026-09-28):** maintained long-term in the repo only — `manual/` is the one source; manual sections are read-only in the app; the old guides are unpublished once the manual is live and vetted.
- **No Drive in the manual path (2026-09-29):** the domain disables Apps Script's Drive, so manual.json is chosen from the computer and images live in the ManualImages tab.
- The 22post operator decisions (Close reasons, Scratchpad, presence, Dashboard layout, reply tracking, reopen, DR defaults, Spanish notify) stand as recorded in the 22post HISTORY block.

## Where I left off
22post is closed and archived in HISTORY.md (reflected −3). Nothing is open. The next `/broad-scan` opens cycle 23:
lead with the Drive-dependent features against the domain's Drive block, and note that the next reflection reaches the Seams-audit cadence.
