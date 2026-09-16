---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: PTO1 (the leave balance on the manager's live-status card) · PTO2 (the same figure on the team-calendar off-chip, where the approve decision is made)
Files modified: web-app/20_timeclock.js, web-app/tc/script_manager.html, web-app/styles.html, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md (derived DOM count 115 → 116), .cycle/STATE.md
Estimate: S (~2 h) — recorded in STATE.md 2026-09-16 BEFORE the first edit
Actual: ~1.5 h

CHANGES:
PTO1 | web-app/20_timeclock.js | The `liveStatus` projection now carries `annualLeave`, `sickLeave` and `ptoEnabled`. The numbers were ALREADY built per rep on the `employees` array; the projection simply did not pass them on, which is why the only manager-facing balance was the `12 → 11 d` chip on a PENDING request. The feature-flag read is hoisted to one `const ptoTracking` above the map — the map runs per rep, and a getter inside it is N property reads.
PTO1 | web-app/tc/script_manager.html, web-app/styles.html | `mgrLeaveBalanceText_` is the ONE predicate for "may this surface show a balance, and what does it say". Muted `.emp-pto` line under the status line — context for the manager, not a status the card is reporting.
PTO2 | web-app/20_timeclock.js | `getTeamCalendar` ships `empId` on its off entries, so the chip joins to the balance BY ID. The day table beside it already merges absent reps by NAME, which works until two people share one; the id costs nothing and does not inherit that fragility.
PTO2 | web-app/tc/script_manager.html | `.tcal-off-bal` on the off chip, through the SAME helper. Two copies of the gate is how one of them quietly stops applying it.

THE ASSERTION THIS BATCH RESTS ON IS AN ABSENCE. `mgrLeaveBalanceText_` returns `''`, not a number, for a rep the balance does not apply to. `adjustLeaveBalance_` no-ops for a pto-disabled rep, so rendering their `0` would read as "used it all" when the truth is "this does not apply" (INV-187 / g114) — and the cycle-8 bug was exactly that shape: a contractor's pending card showed a `12 → 11 d` projection for a deduction that never happened. The gate is the CONJUNCTION the server folds into `ptoEnabled` (the feature flag AND the per-row column). A pin asserting the rendered VALUE for the enabled rep would pass just as well with the gate deleted; only the absent case can fail, so that is what the pin drives.

TEST RESULTS: PASSED. Pure harness 830/830 (unchanged — this batch is client + projection) · DOM harness 115 → 116, 116/116 · `lint-server` clean across 16 server files · `counts --check` green · split manifest regenerated (2 changed).

**THREE THINGS THE PINS CAUGHT THAT READING DID NOT:**
1. The design-token tripwire rejected `var(--muted-2, var(--muted))` — `--muted-2` IS defined in the tokens partial, so the fallback is banned (g57). Fixed to `var(--muted-2)`.
2. `mgrLeaveBalanceText_` was first declared INSIDE `renderManagerView`, where `tcalDayTableHtml_` — a sibling, not a child — could not see it. PTO2 would have thrown on every calendar render.
3. **The DOM pin's first version asserted against three SKELETON cards.** `enterTool('timeClock','manager')` left `currentView='clock'`, `loadManagerDashboard` skipped the render behind its own guard, and `.emp-card` matches the loading skeleton too — so `cards.length === 3` passed against placeholders. The manager landing is the MANAGE tool's `manage` tab. The selector now requires a real `.emp-name` child, so the count means what it says.

Bite-checks — 4 mutations, 4 bites (DOM harness, by hand — `scripts/bite.sh` drives the PURE harness only):
  BITES — the `ptoEnabled` gate dropped (a contractor's 0 renders)
  BITES — a null balance coerced to 0 instead of absence
  BITES — the calendar chip rolls its own gate instead of using the shared helper
  BITES — the card's balance line removed

REGRESSION SCENARIOS (Test Command is `manual`):
  S91 Team punches calendar (Manage → Manage Time) | NOT RUN IN THIS CONTAINER (needs a deployed instance + a browser). DIRECTLY TOUCHED: the off-chips gain a balance segment. The chip's existing content, tone and ordering are unchanged; the balance is appended behind a separator and omitted entirely when it does not apply.
  S10 Cross-timezone live status on dashboard | NOT RUN (same reason). The card gains a line; the status line, tz chip and sparkline above it are untouched.
  S4 Time-off submit, manager approve, balance deducts | NOT RUN. NOT AFFECTED — no write path changed. Worth an operator eye ONCE: the card balance and the pending card's `12 → 11 d` projection now both render on the manager landing, and they must agree (both read `annualLeave` from the same roster row).
  S13 / S27 | NOT AFFECTED — pending-card behaviour is unchanged.

REGRESSION RISKS:
- The balance is a POINT-IN-TIME read of the roster row, refreshed when the manager dashboard reloads. A balance shown beside a pending request is pre-deduction, exactly like the existing `12 → 11 d` chip's left-hand figure. Consistent, but two figures for one rep now appear on one screen; if that reads as confusing in use, the honest fix is to label the card line rather than to remove it.
- `getTeamCalendar`'s off entries gained a FIELD. Additive, and the client tolerates its absence (`o.empId &&` guards the lookup), so a stale cached payload renders the old chip rather than throwing.
- The hoisted `ptoTracking` changes WHEN the flag is read (once per dashboard build instead of once per rep). No behaviour difference — the flag cannot change mid-build.

INVARIANTS AT RISK: None.
- **g33 / INV-24 (`getTeammateStatus` is the low-privilege view) — ALREADY HELD, and more tightly than I would have written it.** I planned to add a tripwire; there is one, and it is a strict allow-list: `'activeNotIn|isSelf|name|status'`, exactly four keys, nothing else. A balance added there turns the pure harness red immediately. No new pin was needed.
- INV-27 (the per-row PTO gate) is the invariant PTO1/PTO2 honour; the conjunction is computed server-side so both surfaces get the same answer.
- INV-187 / g114 (never a confident substitute for a missing value) is what the absence assertion enforces.
- g57 (no `var(--x, fallback)` on a defined token) — violated by my first draft, caught by its pin, fixed.
- INV-128 (design-token hygiene) green: `--muted-2`, `--mono`, `--line`, `--muted` are all defined.

REFLECT:
PTO1 — (a) would it have fired in production this month? NO, in the defect sense: nothing was broken. The operator asked "where can I see this?" and the answer was "only if they have a request pending", which is a capability gap rather than a bug. Scored as a production fix under the R18 rule (cycle ≥12 counts user-visible interface defects), because a manager approving leave without seeing the balance is a real decision made blind. (b) new failure mode? NO.
PTO2 — (a) YES, same reasoning, and this is the surface where the decision is actually made. (b) NO.
NET SCORE: 2 production fixes − 0 new failure modes = 2

OPERATOR ACTIONS / DEPLOY:
- `clasp push -f`, then cut a New version deployment | BLOCKS DEPLOY: N (inert until pushed)
Deploy: N/A — no Deploy Command configured; the documented step is `clasp push -f` + Deploy → Manage deployments → New version.

FOLLOW-ON ITEMS:
- `getManagerDashboard` still calls `getFlag_('enablePtoTracking')` per PENDING row (`:1715`) and once more at the return (`:1949`). The hoisted `ptoTracking` const is right there and identical; swapping those two call sites was left alone as out of scope for PTO1/PTO2.
- Only the ANNUAL balance is rendered. `sickLeave` now rides the projection unused — deliberate (sick leave is UI-removed but backend-dormant, g21), but it is a declared-and-unread field, which is the g04 shape. Either surface it if sick leave ever returns, or drop it from the projection.
- A manager now sees the card balance AND the pending chip's projection on one screen. Worth one operator look to confirm that reads as clarifying rather than redundant.

DOCUMENTATION UPDATES NEEDED:
- **`docs/modules.md`'s Time Clock section** should record that a manager sees leave balances on the live-status card and the calendar off-chip, gated on `EMP.PTO_ENABLED`.
- **INV-27 in `.cycle/config.md`** should name the two new surfaces that apply the per-row gate, so the next person adding a balance surface finds the rule rather than re-deriving it.
- **S91's expected text** should mention the balance segment on the off chip.
- No new operator state, no new Script Property, no new gotcha.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
