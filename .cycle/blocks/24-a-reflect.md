---CYCLE SUMMARY BLOCK---
Scope: Seams & Invariants (cross-module) — the audit of 2026-10-05 (21 session-local findings), the production batch (F1, F2, F3, F4, F6, F8 note, F19), the nets-and-library batch (F5, F7, F8 remainder, F9–F18, F20, F21) and /sync-docs. PR #287; deployed 2026-10-06 (operator), runSmokeTests clear. | Cycle: 24 / 2026-10-06
Production fixes: 1 — severity:
  - 1 Medium:
    - F7: Escape, the backdrop or × on either email composer threw away a typed email and, in Save & Compose, rolled back the just-saved note. The composers are the reps' hot path, and Escape inside them is routine (dismissing the Update Type datalist among others).
New capabilities/features: 0
Defensive/structural: 21
  - Production batch: F1, F2, F3, F4, F6, F8, F19.
  - Nets-and-library batch: F5, F8r, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F20, F21.
New failure modes: 1 — severity: 1 Low
  - F19: re-approving a row whose earlier clear-stamp FAILED (best-effort, logged) while its credit landed takes nothing — an under-charge of one request. Only a direct endpoint call can reach it, because no client un-approves.
Net score: 1 − 1 = 0
  - Self-reports summed 3 − 1 = +2. TWO CORRECTIONS (strict re-derivation), both the recurring error — a real CLASS scored as if it had an occurrence — each matched to a cycle-23 precedent:
    1. F1 (QA revoke by key) demoted. Batch 8 scored QA2-1 defensive because the QA module has had little real use while the domain disables Apps Script's Drive, and F1 needs a quarter grant that only QA2-1 (deployed 2026-10-05) can make.
    2. F4 (two KB dialogs' × bypassed closeOverlay) demoted. Batch 9 scored SH-02 — the same focus-return class across a dozen buttons — defensive.
  - F7 is kept as a fix, and that diverges from batch 9's UI-ESC call on purpose: UI-ESC's four editors are admin and manager surfaces opened rarely, the composers are opened dozens of times a day.
Invariant candidates:
  - INV-376 | A trigger dispatcher records a grouped job's unexpected failure under that JOB's key, labelled, and never clears a key the job owns itself — clearing after a normal return erases the job's own stamp | Server (core automation ↔ every grouped job) | Verify: the Seams F3 two-sided net (TRIGGER_HANDLER_JOB_KEYS = the TRIGGER_GROUPS handlers; `owns` = the body stamps AND clears; every key labelled or tabled).
  - INV-377 | A cache key derived from CODE hashes the builder's whole call closure, never a hand-picked subset of it | Server (KB search index; any future code-keyed cache) | Verify: the Seams F18 closure pin (missing and extra both fail).
  - INV-378 | The destructive half of the editor suite runs only on an instance confirmed DEV; the one override is owner-run, EXPIRING, and never opens on an instance marked prod | Test Suite ↔ Server (instance guards) | Verify: the instance-guard pins (unmarked refuses; open / expired / unreadable override; marked prod refuses regardless).
  - INV-379 | A job that runs more often than its readers clears its failure flag only on a run that did work — an idle run proves nothing | Server (EOD digest; any hourly job read by a daily digest) | Verify: the Seams F2 drive (failing run stamps; reaching run clears; idle hour neither).
  - AMENDMENT candidate to INV-368: a KbImages tab that exists with an edited header answers every valid key as could-not-read (`headerChanged`), while ManualImages keeps "old layout = not imported" (Seams F20 drive).
Most structurally significant change: F11 — the first code-side move against the weakest Axis-B category (six cycles running): the full suite now refuses an unmarked instance, so the integration tier can no longer write TEST_ rows into live payroll and PHI by default.
Should-have-been-deferred: F21 — the audit's one low-confidence finding. It needs a rep to type a deliberately malformed address, and the delivery half of its trigger (whether MailApp would split it) is still unverified.
---END CYCLE SUMMARY BLOCK---

Impact summary (beside the block, for the Verification Pass):
- **For a user now:** a rep who presses Escape in an email composer, or clicks off it, keeps the typed email behind one question, and the saved note is not rolled back (F7). Nothing else changes what a rep sees on an ordinary day. Admins get focus back after closing two KB dialogs (F4). QA managers' revokes now take effect (F1). The Time / PTO calendar names a failed archive read (F8), which cannot happen while archiving is off.
- **For the next developer:**
  - Five weak nets are now real: the held-number guard (F5), the X1 RPC finder (F9), the QA gate family (F10), INV-360's twin comparison (F13) and the Batch 15 derivation (F14).
  - Two new nets now guard paths with no live traffic: the INV-375 call-graph pin (F17) and the archive-floor relation (F8r).
  - Five proposed invariants were written into the library (INV-229–231, 374, 375), and the HELD NUMBERS line ends the STATE-prose dependence.
  - Invariant text that described renamed code was corrected (F15, F16).
- **Under scale / concurrent load:** F6 (an unlocked note fetch can no longer show another patient's note during a concurrent delete or archive). F2/F3 make automation failures visible rather than silent.
- **Effort on zero-caller paths:**
  - F19 hardens an endpoint no client calls.
  - F21 guards a deliberate-input edge.
  - F8's note and F8r guard the archive tier, which is off by default.
  - Together, roughly a quarter of the nets batch.

Estimate calibration: both blocks recorded before the first edit — 13 h estimated vs 7 h actual (0.54x). That is closer than cycle 23's 0.34x, because seams-round items are smaller and better specified than broad-scan items; L still runs about half the estimate.
