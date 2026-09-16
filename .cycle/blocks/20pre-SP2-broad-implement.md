---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: SP4 (an 8x8 voicemail under `SPANISH_VM_MIN_SECONDS` is a hang-up and never becomes a task card) · SP5 (the voicemail snippet is the TRANSCRIPT, not 240 chars of 8x8 chrome)
Files modified: web-app/51_spanish.js, web-app/00_config.js, web-app/metrics/script_metrics.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md (derived counts), .cycle/STATE.md, .cycle/blocks/20pre-operator-2026-09-16-plan.md
Estimate: S (~2 h) — recorded in STATE.md 2026-09-16 BEFORE the first edit
Actual: ~1.5 h

CHANGES:
SP4 | web-app/51_spanish.js, web-app/00_config.js | `spanishVmDurationSec_` (pure) reads `Duration: MM:SS` from the 8x8 body and RETURNS SECONDS OR NULL. `spanishVmTooShort_` (pure) returns `'show' | 'short' | 'unparsed'` — extracted rather than inlined so a pin can DRIVE it (B14/g116: a pin asserting only an inline guard's message stays green when the guard is deleted). `getSpanishVmMinSeconds_` reads CONFIG seed 5 / Script Property `SPANISH_VM_MIN_SECONDS`; 0 disables. `getSpanishInboxPending` gates the voicemail fold on it and counts what it hid.
SP4 | (parse decision) | PARSED RIGHT-TO-LEFT. The operator's two real samples are `00:01` and `00:18` — both under a minute, so NEITHER settles whether 8x8 renders 90s as `01:30` or `00:01:30`. Reading the last group as seconds, the second-to-last as minutes and a third as hours is correct under both and needs no sample nobody has.
SP4 | (fail direction) | FAILS OPEN. An unreadable duration SHOWS the card. The body belongs to a VENDOR who can restyle it in a release note nobody here reads (g41, pointed at a source the operator does not even own), so the failure had to be "hang-ups reappear" and never "a Spanish-speaking patient silently leaves the queue".
SP4 | web-app/metrics/script_metrics.html | `spanishVmNote_` reports TWO counts, separately, on BOTH Pending states. `vmSuppressed` is neutral-toned (the feature working) and names the threshold; `vmUnparsed` is warning-toned and says the cards were SHOWN. One number could not tell "3 hang-ups" from "the parser is dead", and the second reads as a quiet day. It renders on the EMPTY list too — "all caught up" with three suppressed voicemails is the state the count exists for.
SP5 | web-app/51_spanish.js | `spanishVmTranscript_` (pure) returns the text after the `Transcript` heading, or `''`. The snippet uses it, falling back to the old whole-body text when a voicemail was not transcribed — so the change can only ADD information. Measured: ~220 of the old 240-char snippet was 8x8 boilerplate, so a rep saw a handful of transcript words at most.
(cleanup) | web-app/51_spanish.js | The voicemail branch called `getPlainBody()` TWICE (snippet + hasMore each re-read and re-normalized it) where the non-voicemail loop at `:256` hoists it once. Now one call — which is why SP4 and SP5 together cost no new Gmail read.

TEST RESULTS: PASSED. Pure harness 827 → 830, 830/830 · DOM harness 114 → 115, 115/115 · `lint-server` clean across 16 server files · `counts --check` green · split manifest regenerated (4 added, 2 changed).

**THE PIN CAUGHT A REAL DEFECT IN MY OWN REGEX BEFORE IT SHIPPED.** With a colon-only trailing lookahead (`(?!\s*:)`), `Duration: 00:00:00:01` matched `00:00:0` → 0 seconds: the seconds group backtracks to ONE digit, and the next character then being a DIGIT satisfies a colon-only lookahead. A malformed duration read as zero would have SUPPRESSED the card — the one direction this feature must never fail in. The lookahead now rejects a following digit as well. Found by the assertion, not by reading the regex.

Bite-checks — 7 mutations, 7 bites (4 via `scripts/bite.sh`; the 3 DOM ones by hand, since bite.sh drives the PURE harness only):
  BITES — the fail direction inverted so `unparsed` suppresses
  BITES — the right-to-left fold reversed (HH:MM:SS misread)
  BITES — the digit half of the trailing lookahead removed (the defect above, re-introduced)
  BITES — the transcript fallback removed (empty snippet on untranscribed voicemails)
  BITES — the suppression note dropped from the EMPTY-list branch
  BITES — the two counts merged into one total
  BITES — the warning tone removed from the unparsed note

REGRESSION SCENARIOS (Test Command is `manual`):
  S105 Spanish Inbox — manager auto-assign | NOT RUN IN THIS CONTAINER (needs a deployed instance + a browser) and **MATERIALLY AFFECTED — see REGRESSION RISKS.** INV-31 and S105 both state that auto-assign works voicemails deliberately ("voicemails are INCLUDED, they are worked the same way"), and it distributes whatever `getSpanishInboxPending` returns. A suppressed voicemail is therefore no longer auto-assignable. That is the RIGHT behaviour — nobody wants a 1-second hang-up handed to a rep — but it is a behaviour change, not a no-op, and S105's setup step ("the window holds ≥3 pending requests … one a voicemail card") now needs a voicemail at or above the threshold or the scenario tests nothing.
  S80 Spanish Inbox — resolution-share chart | NOT RUN (same reason). NOT AFFECTED: the chart reads `resolvedRes`, which this batch does not touch. A suppressed voicemail was never pending, so it can never appear as resolved either.
  Visual matrix (`spanish-light-wide`, `spanish-expanded-light-wide`, `spanish-light-mobile`) | NOT RUN — manual. The fixtures may carry a voicemail card; if its body has no `Duration`, it now renders WITH the "no readable duration — shown" note, which is correct but changes the shot.

REGRESSION RISKS:
- **Auto-assign no longer distributes sub-threshold voicemails** (above). Desirable, but it reaches the SCHEDULED `autoAssignSpanishThreadsScheduled` too, so the hourly job's assigned count will drop by however many hang-ups the window holds. Expected, not a fault.
- The gate applies at the PENDING list only. `getSpanishInboxStats` counts threads independently, so a suppressed voicemail may still be inside the stats' `pending` total — the header count and the list length can differ by the suppressed number. The note explains the gap on screen, which is why it renders on both states; a stats-side change was deliberately NOT made, because the stats tile is a scan summary rather than a task list.
- `SPANISH_VM_MIN_SECONDS` defaults to 5 with no operator action, so the gate is ON as soon as this deploys. Setting the property to `0` restores the old behaviour without a redeploy.
- `spanishVmTranscript_` matches the word `Transcript`. A voicemail transcript that itself contains that word earlier than the heading is conceivable but would only shift where the snippet starts, never suppress anything.

INVARIANTS AT RISK:
- **INV-31 needs an amendment, not a fix.** Its narrative states the voicemail fold's rules and that auto-assign includes voicemails; both are still true, but the fold is now CONDITIONAL on duration. Flagged under DOCUMENTATION.
- INV-187 (never a confident substitute for a missing value) is the invariant SP4 is built on: `null` duration is not `0` duration, and the code never collapses them.
- g41 (an operator-maintained source a decision engine reads needs a shape check and a CHOSEN fail direction) — honoured, with the fail direction stated in the code and driven by a pin.
- g02 (a diagnostic that can never be clean is worse than none) — the inverse case, a FILTER that can never be seen, is why the two counts exist.
- No PHI invariant is touched. The transcript can name a patient and carry a callback number (the operator's sample does), and this batch keeps the existing posture exactly: live-read, never stored. `SpanishManualResolved` and `SpanishClaims` still hold only threadId/claim/timestamp.

REFLECT:
SP4 — (a) would it have fired in production this month? YES — the operator supplied a live 1-second hang-up that had become a task card. (b) new failure mode? NO. The parser can stop matching, but that path shows the card and reports itself.
SP5 — (a) YES. Every transcribed voicemail card was showing vendor boilerplate instead of the message. (b) NO.
NET SCORE: 2 production fixes − 0 new failure modes = 2

OPERATOR ACTIONS / DEPLOY:
- `clasp push -f`, then cut a New version deployment | BLOCKS DEPLOY: N (inert until pushed)
- OPTIONAL: Script Property `SPANISH_VM_MIN_SECONDS` to change the threshold, or `0` to disable the gate. No action needed for the default 5s | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured; the documented step is `clasp push -f` + Deploy → Manage deployments → New version.

FOLLOW-ON ITEMS:
- No sample of a voicemail over one minute exists. The right-to-left parse makes the format question moot for the GATE, but if a duration is ever displayed on the card, confirm the long-form rendering first.
- The stats tile's `pending` count and the list length can differ by the suppressed number (above). If that proves confusing in use, the honest fix is to report the suppression on the tile too rather than to silently subtract it.
- Worth considering once real data accumulates: whether 5s is the right threshold, or whether the operator wants the suppressed ones collapsed into an expandable "N hang-ups" row rather than hidden. The count makes either reversible.

DOCUMENTATION UPDATES NEEDED:
- **`SPANISH_VM_MIN_SECONDS` is a NEW operator-settable Script Property and is documented nowhere.** It needs an entry in `docs/operator-state.md` plus its line in CLAUDE.md's operator inventory — the OPERATOR-INDEX pin requires both halves.
- **INV-31 in `.cycle/config.md`** should record that the voicemail fold is now duration-gated, fails open, and reports two counts — and that auto-assign inherits the gate.
- **S105's setup step** should say the voicemail must be at or above `SPANISH_VM_MIN_SECONDS`, or the scenario silently stops covering the voicemail case.
- A gotcha is probably owed for the regex defect (a trailing lookahead that rejects only the delimiter lets a fixed-width group backtrack into a shorter match), but it may fit inside g116 rather than earning its own entry. `/sync-docs` should decide.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
