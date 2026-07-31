# Cycle State

## Current
Cycle: 15
Phase: reflect (complete — cycle 15 is closed; invariants adopted)
Scope: Seams & Invariants audit + implementation
Test Command: manual
Subsystem cycles since last Seams audit: 0 (cycle 15 IS the seams audit, so the
  RESET wins over /reflect's increment — zero subsystem cycles have elapsed SINCE
  it. Setting 1 here would make the next seams audit fall due a cycle early.)
Updated: 2026-07-31

## In progress (facts to carry forward — NOT judgments)
- Cycle 14 is CLOSED (net 0; 4 capabilities). Its reflect block is
  `.cycle/blocks/14-a-reflect.md`; PR #149 merged as 7e6b07b.
- Before this audit, a standalone fix landed (commit fc0e72e): the Automation
  Health CDR card now tones off `likelyMismatches` — the PAIRED set — instead of
  `unmatchedAgents`. Both raw name lists are permanently non-empty here, so
  either one pins the card amber forever. `cdrLikelyNameMismatches_` pairs a
  roster gap against an unmatched CDR agent on normalized-equal OR >=2 shared
  name tokens.
- Cycle 15 (this audit) found 5, all Low/Medium — no Critical/High. That is the
  honest read of a codebase 14 cycles deep, not a shallow pass: 64/64 doc-named
  guards exist, TOOLS=7, triggers=16 and the 14 localStorage keys all verify.
- **All five (F1–F5) are IMPLEMENTED** (commit c2bbbbd). Block:
  `.cycle/blocks/15-F1-F5-broad-implement.md`.

## Completed this cycle
- F3 | Code.js | NEW `empRosterEmail_` predicate; ALL 14 roster walks routed through it (the audit named 9; 5 more surfaced during implementation). getTeamMetrics + getPunctualityReport gained the check they never had.
- F1 | Code.js | 4 dead CONFIG keys removed; EOD_WARNING_WINDOW_MINUTES kept but marked DEAD; the hardcoded FRIDAY explained at the trigger.
- F2 | Code.js | queue-inventory read offsets derived from the CDR enum (the header-validation half reverted — see Decisions).
- F4 | test/visual/mock.js | fixture now calls VERBATIM copies of groupQueueRows_ + the CONFIG groups; registered in MIRROR_INDEX.
- F5 | CLAUDE.md | INV-169 corrected — it cited fields cycle-13 FO-5 removed.
- Tests | pure 394→396, DOM 69; 8 revert scenarios bite-checked; 2 stale pins updated as part of the fix.

## Pending / not yet done
- **/reflect HAS run** (net 2 − 1 = 1; block `.cycle/blocks/15-a-reflect.md`).
  It CORRECTED the implementation block in both directions — +1 production fix
  (the CDR health-card fix predated the batch) and +1 new failure mode (the batch
  reported zero). Trust the reflect block for the tally.
- **ALL SIX invariants are now ADOPTED** into the library (INV-181/182 from
  cycle 14, INV-183–186 from cycle 15). Library is 186 entries, contiguous, no
  duplicates. NOTE the reflection's initial call to leave 181/182 vacant was
  WRONG and was corrected before adoption: the INV-163/164 vacancy precedent
  applies to proposals that were LOST, and 181/182's full text was on disk in
  `.cycle/blocks/14-a-reflect.md` — recoverable, so they keep their original
  numbers rather than becoming a second pair of permanent holes.
- **DEPLOY still outstanding** and now carries cycles 11–15:
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → New version
  3. Re-run `runAllTests()` (expect 286, 0 failed)
- Operator one-liner (F2): read the col-4 header off the DQE tab and add
  `4: '<that text>',` to CDR_EXPECTED_HEADERS.
- CARRIED (cycle-13 A5), DEV PROJECT ONLY: `INSTANCE_IS_PROD=false`.

## Open follow-on items
- Write-only enum members (DR.TO_EMAIL, FS.CONSENT_AT/OPENED_AT, EDS.CERTIFICATE,
  TQA.PER_QUESTION_JSON, KB.REVIEWED_BY, ADP.LOCATION/REASON/STATUS) have no
  marker distinguishing "write-only on purpose" from "forgotten" — the way
  EOD_WARNING_WINDOW_MINUTES now does. Deliberately untouched.
- A roster walk that omits the inclusion check ENTIRELY is still caught only by
  review; the F3 tripwire catches the raw guard shape, not an absent one.
- No Admin editor for CDR_QUEUE_GROUPS (cycle 14).
- FO-6 (remaining TimesheetArchive readers) — carried from cycle 13, unchanged.

## Decisions made (so the next session doesn't re-litigate)
- F2's header-validation half was implemented and then REVERTED ON PURPOSE.
  `validateCdrColumns_` substring-matches; the real col-4 header text in the
  `call-data-reporting`-owned sheet has never been recorded here, so a guessed
  entry would raise a FALSE "Column drift" warning and flip the CDR card amber —
  the identical defect fixed in fc0e72e hours earlier. Do not "finish" F2 by
  guessing; get the header text.
- Routing all 14 walks (not the audit's 9) was required, not scope creep: a
  predicate 5 sites bypass is not shared, and the derived tripwire could not
  exist while raw guards remained.
- The cycle-12 F4 pin was generalized rather than string-swapped — it now bans
  the raw guard shape anywhere in Code.js (INV-179: derive, don't hand-list).
- getPunctualityReport was NOT a real defect (it self-filters on
  `!dates.length`); it was routed through the predicate for consistency only.

## Where I left off
**Cycle 15 is CLOSED, merged (PR #150, `737e6dc` on main), and the invariant
backlog is clear.** Nothing is half-finished in the repo.

**Start a fresh cycle here.** The branch `claude/broad-scan-yhkbe2` was merged,
so it has been RESTARTED from `origin/main` — do not stack onto merged history.

The ONE thing gating value delivery is not code: **the deploy now carries cycles
11 through 15.** Every fix in that span — the CDR health card, the roster
predicate, the whole sub-queue feature, two cycles of interface work — is
sitting behind `clasp push -f` + New version. Ask about it before starting
another audit cycle; auditing further only deepens the undeployed backlog.

Suggested next moves, in order of value:
1. **Deploy** (operator), then `runAllTests()` — expect 286, 0 failed.
2. **F2's one-line close:** read the col-4 header off the DQE tab and add
   `4: '<that text>',` to CDR_EXPECTED_HEADERS. Deliberately NOT guessed.
3. A normal `/broad-scan` cycle (16) — the seams cadence is reset to 0, so the
   next seams audit is not due for 4 subsystem cycles.

Two process rules earned recently, both still live:
- **Before concluding work is lost, check the REMOTE.** The local checkout
  rewound twice in cycle 14; both times `git reset --hard origin/<branch>`
  restored everything.
- **Read the guard before diagnosing which call it rejected** (cycle 14's
  wrong `hasActiveTimeOffOnDate_` diagnosis cost a full operator round-trip).
