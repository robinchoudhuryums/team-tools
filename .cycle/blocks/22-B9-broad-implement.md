---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch 9 — interface, accessibility and admin polish
- U1 — the Call Notes export dialog opens/closes through ensureOverlay/closeOverlay, renders its link first and checks window.open (a blocked tab lost the PHI export URL)
- U2 — the shell's Ctrl/⌘+/ and `?` handlers open the shortcuts overlay through cnOpenShortcutsOverlay_ (named dialog, focus stash/restore)
- U3 — Intake "Copy image" fallback checks window.open and says the copy failed (it always toasted "Opened image")
- U4 — the deploy beacon's build hash is memoised per execution only (ScriptCache is shared by HEAD and every versioned deployment)
- U5 — the QA player's Space/arrow shortcuts yield to an open dialog and to focused controls
- U6 — Q39 (every "reveal" single-select) gets arrow keys and click-again-to-clear; Intake Clear confirms before wiping a filled form
- A7 — after saving auto-tag rules the admin's browser adopts the rules the server STORED
- A9 — Save Departments refuses and names half-filled rows instead of dropping them under "saved"
- M11 — the DR tracker and Spanish business-hours copy say "company holidays"; the Spanish stats cache key includes the voicemail settings
Files modified: web-app/10_core.js, web-app/00_config.js, web-app/51_spanish.js, web-app/script_core.html, web-app/modals.html, web-app/cn/script_callnotes.html, web-app/intake/script_intake.html, web-app/qa/script_qa.html, web-app/metrics/script_deptrequests.html, web-app/metrics/script_metrics.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: M (~7.5 h) — U1 S 1h · U5 S 1h · U6 S 1.5h · U2 S 0.5h · U3 S 0.5h · U4 S 1h · A7 S 0.5h · A9 S 0.5h · M11 S 0.5h
Actual: ~2.5 h

CHANGES:
U1 | cn/script_callnotes.html, modals.html | cnOpenExportModal_ clears `#cn-exp-result` and calls ensureOverlay; Cancel and the backdrop call closeOverlay; the success handler renders an "Open the export sheet — N notes" link into the new slot BEFORE `window.open`, checks its return (try/catch, null = blocked), keeps the dialog open to hold the link, and the toast says "opening sheet" or "use the link in the dialog (your browser blocked the new tab)" — the skipped-reps INCOMPLETE warning keeps its wording and gains the same suffix. The F-36 shape the ADP export already had.
U2 | script_core.html | Both shell handlers call cnOpenShortcutsOverlay_ (typeof-guarded) instead of `classList.add('open')`.
U3 | intake/script_intake.html | intakeCopyImageFallbackMsg_ (pure) + the fallback checks `window.open`'s return: "Could not copy the image — it opened in a new tab" or "…your browser blocked the new tab — click the image on the card (or Image link)"; `noopener` set on the returned window instead of the feature string (which makes the return null in some browsers).
U4 | 10_core.js, 00_config.js | clientBuildHash_ drops the ScriptCache get/put; `BUILD_HASH_CACHE_KEY` / `BUILD_HASH_CACHE_TTL_SEC` removed (the F1 rule: no declared-but-unread key). Prompt lag is the client's 15-minute poll alone.
U5 | qa/script_qa.html | qaPlayerOwnsKey_ (pure): never with an open overlay (topOpenOverlay_), never in a text control, never Space on a button/link/summary or a role=button/checkbox/switch/tab/radio/menuitem/option/link, never arrows on a role=radio/tab/slider/option/menuitem/spinbutton. The keydown handler asks it first.
U6 | intake/script_intake.html | intakeRevealPick_ clears on a click of the selected option (and empties its text); intakeRevealKey_ moves the selection with arrows, ignoring keys typed in the reveal text box; both Clear buttons call intakeConfirmClear_, which clears an empty form at once and otherwise asks (danger uiConfirm naming the count, via the pure intakeFilledCount_).
A7 | 10_core.js, cn/script_callnotes.html | saveAutoTagRules returns `rules: clean`; the client sets `CN_STATE.deptConfig.autoTagRules = res.rules`.
A9 | cn/script_callnotes.html | cnDeptRowsCollect_ (pure) → {map, half}; the save handler marks the empty field `aria-invalid`, toasts "Row N has a name or an email but not both … Nothing was saved." and returns before the RPC.
M11 | metrics/script_deptrequests.html, metrics/script_metrics.html, 51_spanish.js | The two business-hours notes read "weekends and company holidays excluded"; spanishCacheHash_ takes an optional `vm` {sender, filter, minSec}, passed by getSpanishInboxStats (a changed key also retires the pre-M5 cached aggregate).

TEST RESULTS: passed — pure harness 1031/1031 (was 1022; +9 Batch 9 pins), DOM 156/156, lint:server clean, counts --check agrees, split manifest regenerated (two removed constants). New: a DERIVED overlay net — every static overlay id found in the markup (`class="overlay"` + id, any partial or modals.html) is checked for a direct or variable-bound `classList.add/remove('open')` in every file; the F-40 hand list had missed `cn-export-overlay`. Pins updated for the deliberate rule change (Category A): BCN-1 and BCN-1b (the cache assertions replaced by "a hash another deployment left in ScriptCache is never served" and "nothing is written there"), the business-hours copy pin (US → company holidays). 13 bite-checks, all BITE: U1 classList back (the derived net) · U2 the variable-bound form back (the derived net) · U1 open unchecked · U3 false opened · U4 cache read back · U5 button · U5 overlay · U6 no confirm · A7 raw rules · A9 silent drop · M11 key without vm · M11 copy back (one malformed first attempt at M11 re-run). Visual (intake-light-wide, qa-detail-light-wide/-mobile, spanish-light-wide, admin-config-light-wide, deptreq-light-wide): 0px overflow, no missing fixture, only the pre-existing proxy CERT console line. No scenario opens the CN export dialog, the shortcuts overlay or a Clear confirm, so the changed pixels are not photographed.
Regression scenarios (Test Command manual): S25 (shortcuts / pop-out), S59 (PPD), S74 (DR tracker copy), S80 (Spanish), S90 (QA playback keys), S97 (Admin) — NOT APPLICABLE here: each needs the deployed app; the pins above drive the functions they walk.

REGRESSION RISKS:
- U4: every getDeployStamp call and every doGet now recomputes the hash (~20 project-local file reads). No quota applies, but a boot now does two passes over the partials (render + hash).
- U3: `noopener` moved from the feature string to `w.opener = null` so the return value is usable; the opened image tab still cannot reach the app.
- U6: Clear on a filled form is now two clicks; the confirm's Cancel keeps everything.
- U5: Space on a focused Play button now presses the button rather than toggling via the shortcut — the same result for the play button itself.
- A7: an older server returns no `rules`; the client then leaves the session's rules unchanged (it does not fall back to the raw text).

INVARIANTS AT RISK: None broken. Touched: g100/INV-145 (every overlay through ensureOverlay/closeOverlay — now a derived net), g135 (window.open's null return — U1/U3), INV-179 (the derived build hash — unchanged derivation, cache removed), INV-85 (a cache key moves when what it caches changes — M11), g123 (the one calendar — copy aligned), the T6 ratchet (no new class; `exp-result-link` reused).

NET SCORE: 3 − 0 = +3
- Production fixes (would have fired this month): U1 (window.open after an async RPC is exactly what pop-up blockers stop, so a manager's export link was routinely lost), U2 (every ?/Ctrl+/ use dropped focus on <body> with an unnamed dialog), U3 (clipboard image writes routinely fail in the iframe, and the toast then claimed success). The rest need a rarer trigger (a /dev visit, a keyboard user on a QA button, an accidental Clear, the saving admin's own session, a half-filled row, a changed voicemail setting).
- New failure modes: none identified; U4's cost is recorded under regression risks.

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with Batches 1–8, S2, F1–F5 and the follow-ups — none is deployed yet)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The coaching business-days note (train/script_coaching.html) and the Spanish auto-assign flag's description (00_config.js FEATURE registry) still say "US holidays" — the same copy drift as M11, outside the two surfaces the finding named.
- Save Departments still lets two rows share a name (the later silently wins) — adjacent to A9, not in it.
- No visual scenario opens the CN export dialog (with and without the link), the shortcuts overlay from the shell key, or the Intake Clear confirm.
- Deferred by the scan, still open: S6 (a QA reviewer reviewing their own calls — policy), S8 (framing — confirm nothing embeds the app), S10 (quiz feedback/retries vs spec §9.4), M6 (SLA business-hours re-basing — relabel or convert targets), C12 (archive-aware reads — a feature).

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index: amend g100 (a hand list of overlays missed one — the derived net replaces the list; the variable-bound form counts), g135 (the CN export and the intake copy-image fallback), and add or amend for U4: a ScriptCache entry is shared by HEAD and every versioned deployment, so it must never hold a value that depends on the code version.
- docs/design-decisions.md: the deploy-version beacon entry (no cache now; prompt lag is the poll).
- docs/operator-state.md: nothing new (no properties).
- docs/modules.md (Call Notes export, Intake Q39/Clear/copy image, QA keys, Admin auto-tag/departments, Metrics copy), docs/operator-log.md (Batch 9), docs/test-harness-log.md (9 pins, 13 bites, the derived overlay net).
- .cycle/config.md: invariants for the derived overlay rule, the export link-first rule, the per-execution build hash, the QA key yield rule, the reveal clear/arrows + Clear confirm, stored auto-tag rules, half-row refusal, the Spanish key; walk steps on S25, S59, S74, S80, S90, S97.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
