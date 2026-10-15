---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F3 (Medium) — the CallNoteEmail audit row's `otherDomain` kept everything after the first "@", so a second "Other" recipient's full address reached the shared AuditLog; now one deduped domain per address
- F9 (Medium) — "Request an article" sent and stored the raw zero-result search query (shown to every manager) even when the rep rewrote the topic; the query is now never sent, stored or shipped
- F6 (Medium) — the NotesArchive cold tier and the manager's call-notes export wrote the note text columns into ordinary cells (leading zeros lost, "3/4" → Date); both now keep them as '@' cells
- F49 (Low) — the intake PMD/PAP backup row stored the typed DOB in a coercing cell ("3/4/28" → 2028-03-04); it is now a '@' cell
New capabilities (G/ST): None (G4 recorded as decided and scheduled as E6 — not implemented here)
Files modified: web-app/30_callnotes.js, web-app/70_kb.js, web-app/kb/script_kb.html, web-app/60_intake.js, web-app/00_config.js, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, .cycle/config.md, .cycle/STATE.md
Estimate: S/M (~4 h) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~1.5 h

CHANGES:
F3 | web-app/30_callnotes.js | `emailFromCallNote`'s `otherDomain` goes through `drRecipientDomains_` (the comma-list helper the Dept Request row already uses) instead of `intakeEmailDomain_`; intake, forms and external-email rows were checked and are single-address by validation
F3 | test/client/run.js | the CN-3 pin (it encoded the old helper) now requires `drRecipientDomains_` and drives it over "jane@gmail.com, john.smith@yahoo.com" → "gmail.com, yahoo.com", no local part, deduped
F9 | web-app/70_kb.js | `kbRequestArticle` ignores its third argument (kept in the signature for cached clients) and writes the Query column blank; `kbGetContentRequests` no longer ships `query`, so rows stored before the fix are never shown
F9 | web-app/kb/script_kb.html | the prompt calls `kbRequestArticle(topic, '')`; the manager landing's "searched “…”" line is gone
F9 | test/client/run.js | "F9 (cycle 25)" pin drives the real `kbRequestArticle` with a stub sheet (an old client's query is not written, the topic is, nothing in the audit row) + source checks on the list endpoint and the client
F6 | web-app/30_callnotes.js | `archiveSheetRowsOlderThan_` takes `opts.textIdx`: those columns are formatted '@' on the NEW archive rows and the block is written through `sheetTextRows_` (an empty list = every cell sheet-safe, so the Timesheet tier is unchanged); `archiveOldCallNotes` passes `CN_TEXT_IDX`; `exportCallNotesRange` formats its seven note-text columns (indices 4–10, Callback … Resolution) '@' and writes through `sheetTextRows_`
F6 | test/client/run.js | "F6 (cycle 25)" pin drives the real mover (format-then-raw-write log, "09171234567" and "3/4" kept, formula text inert in '@'); the behavioural F3/F-52 mover pin gains `sheetTextRows_` (its double encoded the old write); the S2 raw-writer list gains `archiveSheetRowsOlderThan_` and `exportCallNotesRange` (known ten); the CN-tier pin now expects `{ maxRows: budget, textIdx: CN_TEXT_IDX }` (headerRows/width still defaulted)
F49 | web-app/00_config.js, web-app/60_intake.js | `INTAKE_ACCT_TEXT_IDX = [INTAKE_ACCT_SUB_HEADERS.indexOf('DOB')]`; `intakeSendAcct_` writes the backup row with `appendRowsTextSafe_` under a ScriptLock taken AFTER the send (g34) and released in `finally`; a lock timeout lands on the existing store-failure warning
F49 | test/client/run.js | "F49 (cycle 25)" pin: the derived index is [5], the real `appendRowsTextSafe_` formats then writes "3/4/28" raw, the send orders mail → lock → append, the coercing appendRow is gone; the S2 appender list gains `intakeSendAcct_`
All | test/client/server-split-manifest.json, CLAUDE.md | manifest revision recorded (`split-manifest.mjs --why`); running totals regenerated
Docs | CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, .cycle/config.md | g36 + g144 index lines and narratives amended; the self-improving-KB decision amended (F9, G4 → E6); INV-132 and INV-139 amended; S29 (export) and S60 (intake account) gain cycle-25 steps

TEST RESULTS: passed — pure harness 1275/1275, DOM harness 234/234, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current. Each new or changed pin bite-checked by one mutation (old domain helper → CN-3 red; query written back → F9 red; archive '@' format dropped → F6 red; DOB index pointed at PatientInfo → F49 red), file restored each time. Test Command is `manual`: S29 (Call Notes bulk export) and S60 (Intake PMD/PAP) carry the new steps and need the deployed app — NOT RUN here, owed to the operator after deploy; no regression scenario covers the cold archive or "Request an article" (follow-on). The editor-suite tests touching these functions are gate/refusal cases only and are unaffected.
REGRESSION RISKS: (1) F9 — managers no longer see what a rep searched; the topic the rep wrote remains, and E6 brings back a vocabulary-matched hint. (2) F49 — the intake account send now takes the ScriptLock (≤15 s) for the backup row after the email has gone; a timeout warns "not stored" where the unlocked append would have written. Only `intakeSendAcct_` writes the PMD/PAP tabs and nothing purges them, so the positional append cannot collide. (3) F6 — archive rows written before the fix keep what Sheets made of them; nothing is migrated.
INVARIANTS AT RISK: None violated — INV-132 (amended; still move-only, bounded, flushed before delete), INV-153 (the Timesheet tier passes no textIdx — byte-for-byte the same cells), INV-139 (amended), g34 (mail outside the lock), g17 (the lock is the intake send's own, released in finally), the S2 SHEET-SAFE rule (lint + pins green).
NET SCORE: 2 − 1 = +1 (F9 YES — every request stored the raw query; F49 YES — every date-shaped DOB was coerced on send; F3 NO — needs a multi-address "Other", no evidence this month; F6 NO — the archive is off by default and no export is evidenced this month; new failure mode: F49's lock timeout path, documented)

OPERATOR ACTIONS / DEPLOY:
- Walk S29 and S60 (the cycle-25 steps) on the deployed app | BLOCKS DEPLOY: N
Deploy: Server + Client (Reference views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- `exportCallNotesRange` writes into a freshly created sheet with no grid growth — a range with more than ~999 notes would throw (the g145 / TC-01 class, fixed for the payroll export only); not in this batch
- KbContentRequests rows written before F9 still hold raw queries in the sheet (no longer shown in the app); an operator may want to clear that column once
- No regression scenario covers the cold archive (`archiveOldCallNotes`) or "Request an article"
- E6 (G4) is the planned replacement for the removed query context
(see also the cycle-25 /broad-scan report and the Batch 1 block)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (gotchas g36/g144, the KB-loop decision, INV-132/139, S29/S60, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
