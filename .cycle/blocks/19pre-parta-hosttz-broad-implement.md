---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Part A — CN coercion recovery formats in the HOST
sheet's own timezone (the 2026-08-27 live reports: a PH rep's just-logged
note missing from today's rolling stack, and the operator's 2:16 PM CST
note displaying 1:46 AM)
Files modified: web-app/Code.js, test/client/run.js, CLAUDE.md,
.cycle/STATE.md

CHANGES:
PartA | web-app/Code.js | getCallNotesSheet_ (the single per-rep opener,
  INV-167 boundary) memos the host sheet's tz per execution
  (`_cnHostTz`/`_cnHostTzById`/`cnHostTz_`; a failed tz read degrades to
  the ADP tz — the pre-fix behavior, never worse). cnTimestampString_
  recovers coerced CN Timestamp/EmailedAt Dates in cnHostTz_() instead of
  adpSheetTz_(). New cnDateLocalString_ — the CN-sheet twin of
  normalizeDate_ — swapped in at all 26 CN-region CN.DATE_LOCAL read
  sites (callNoteRowToObject_, the rolling-stack/history/search/EOD/
  taxonomy/trends/count/reconcile walks); ADP/TO/PAR/AUDIT reads keep
  normalizeDate_ (the ADP sheet is its own host).
PartA | test/client/run.js | PTA-1/PTA-2 behavioral pins driving BOTH
  live symptoms against a real Intl oracle (Chicago-coerced 14:16
  recovers as-written vs the degraded path reproducing the reported
  00:46-next-day shift; Manila-midnight DateLocal keeps its day vs the
  IST fallback shifting it back a day; pinned-sheet no-op equality vs
  normalizeDate_); PTA-3 wiring (memo set off the freshly opened handle,
  recovery never reaches adpSheetTz_ — comment-stripped per INV-188 —
  null-degradation catch, a derived ban on normalizeDate_ over
  CN.DATE_LOCAL, the typed reader's route); B6's normalizeDate_
  assertion REWRITTEN in place for the changed contract.

WHY THE FIRST DIAGNOSIS WAS WRONG: the blank-roster-Timezone-cell theory
was falsified by the operator checking column H (America/Chicago for
them, Asia/Manila for the PH agents — all correct). The write side was
always clean; the stored strings were never wrong. The fault was
read-side: a coercing sheet interprets stored digits in ITS OWN tz, and
recovery formatted in the ADP tz, shifting the digits by the tz delta.
Recovering in the host tz makes the round-trip hold BY CONSTRUCTION for
any sheet tz. "Last-opened wins" memo verified safe: every cross-rep walk
converts rows INLINE within its own rep's iteration (all
callNoteRowToObject_ call sites checked); NotesArchive readers reach the
cold tab via getParent() off the same handle.

TEST RESULTS: pure 660 / DOM 82, all green. 4 mutations / 4 bites
(cnTimestampString_ tz revert → PTA-1+3; typed-reader normalizeDate_
revert → PTA-3; memo kill → PTA-3; cnDateLocalString_ tz revert →
PTA-2+3). vm-realm lesson recorded: an outer-realm Date fails
`instanceof Date` inside a vm context — shadow the vm global with the
outer constructor (ctx.Date = Date).
REGRESSION RISKS: pinned/healthy sheets (host tz == ADP tz) recover
byte-identically (pinned by the PTA-2 equality case). Non-CN consumers of
per-rep DATE_LOCAL (parseRetentionDateMs_ purge windows) unchanged —
accepted off-by-hours on day-granularity windows, documented.
INVARIANTS AT RISK: INV-142 AMENDED in place (recovery tz is now the
host sheet's; the ADP-tz claim was valid only under INV-110 pinning);
INV-110/141 pinning KEPT as defense in depth. None violated.
NET SCORE: 1 production fix (fired THIS WEEK, twice, reported by two
users) − 0 new failure modes = +1

OPERATOR ACTIONS / DEPLOY:
- None beyond the standing pending deploy | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with
PRs #176/#177/#189–#193). Post-deploy: log a note and confirm the card
shows wall-clock time; PH agent confirms a fresh note lands in today's
Log. Historical notes' displayed times self-correct; nothing re-entered.

FOLLOW-ON ITEMS:
- parseRetentionDateMs_ on drifted sheets: purge/archive day windows can
  be off by the tz delta (hours) — immaterial at day granularity,
  accepted + documented.
- The originally-planned blank-tz hardening (tzSource flag,
  automationProblems_ roster-tz entry) was NOT built — the roster cells
  were correct, so it targets a fault that did not exist. Available later
  if a blank cell ever appears.

DOCUMENTATION UPDATES NEEDED: none — applied in-session (host-tz gotcha
rewrite incl. the falsified first diagnosis, CN.DATE_LOCAL gotcha →
cnDateLocalString_, M-14 locale gotcha pointer, INV-142 amendment,
operator-entry Part A addendum with the post-deploy spot-check, test
narrative 657→660, STATE.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
