---CYCLE SUMMARY BLOCK---
Scope: broad — every server file and every client module; the cycle-23 /broad-scan (2026-10-01, 0 Critical / 5 High) Batches 1–10, TC-02, the 4a follow-ons, and the operator-decided follow-up Batches 11–15 (incl. Batch 13's courtesy follow-up). PRs #284 and #285; deployed 2026-10-05 (operator), runSmokeTests clear. | Cycle: 23 / 2026-10-05
Production fixes: 13 — severity:
  - 3 High:
    - CNUI-07: the save toast claimed "copied" before the copy settled, so a rep on a clipboard-blocked browser pasted the previous clipboard (the T5 class; such browsers are proven on this deployment).
    - DRV-3: every pasted and converted article image failed, because the domain disables Apps Script's Drive.
    - SP-2: a requester's follow-up after an answer was invisible to the pending list, the stats and Needs-you.
  - 6 Medium:
    - SH-01: the copy-failure warning reopened beneath the composer.
    - DRV-1: the System tab read green over a disabled Drive.
    - QA-1: QA blamed the folder id and "Recording not found" for the disabled service.
    - ADM-11: a note's history silently missed rows that had scrolled out of the AuditLog tail.
    - ADM-07: the System tab read clean while the lookups panel listed unreadable cells.
    - ADM-04: unset PHI stores read "configured" on their fallback.
  - 4 Low:
    - DRV-2: the embed scan called every Drive file broken.
    - DR-3: median tiles showed the upper-middle value.
    - VIS-1: the Day Edit hint contradicted the inputs.
    - TC2-8: Labor Day showed as a workday bar.
New capabilities/features: 3 — TRN-1 (quiz retry limit with a manager reset), INT-3 (outside-recipient confirm), TC-02 option (a) (a break adjustment says add or correct).
Defensive/structural: 115 — of ~131 classified actions. Includes Batches 7a, 7b, 8, 9, 10 and 15 in full, the scan-time fail-closed engine reads, and the latent TC2-9 archive reader.
New failure modes: 3 — severity: 3 Low.
  - KB-1/KB2 (Batch 2): legitimate Area Eligibility cells (lowercase word-codes, a state beside "listed cities" without "or") now read "cannot tell" until the operator rewords them.
  - KB2 restrictive Open note (Batch 2): the same fail-closed trade.
  - METUI-1 (Batch 4b): a CDR outage now keeps a stale below-target badge instead of clearing it.
Net score: 13 − 3 = 10
  - Self-reports summed 17 − 4 = +13. FIVE CORRECTIONS (strict re-derivation):
    1. Batch 14 TC2-9 demoted to defensive. Archiving is off (TIMESHEET_ARCHIVE_DAYS 0), so no reader ever disagreed. The block itself asked /reflect to confirm or demote.
    2. Batch 5 SP-1 demoted. Its trigger needs 8x8 to thread a repeat voicemail into a resolved thread, which is still UNVERIFIED on the live inbox (the same caveat cycle 22 carried).
    3. Batch 6b COA-2 demoted. It is the client twin of cycle 22's D1, which that reflection demoted as "if coaching is in use, unverified".
    4. Batch 13 follow-up's +1 removed. It closed Batch 13's own failure mode before anything deployed, so it is not a production fix.
    5. Batch 13's new failure mode removed. The thank-you reopen never ran (13 and its follow-up deployed together — the 19-d netting precedent).
  - Corrections 1–3 are the recurring error (a real CLASS scored as if it had an occurrence). Corrections 4–5 are a netted pair.
Invariant candidates:
  - INV-374 | No reader substitutes a proxy for the store's own evidence. The Timesheet archive gate keys on the archive's newest date (never the live tab's oldest row), the Spanish claim floor keys on the thread's last close (never the claim's existence), and liveness keys on the run ledger (never the AuditLog tail length) | seam: Time Clock ↔ Spanish ↔ Admin health | Verify: the TC2-9 back-filled-row drive, the SP-2 floor drive, the A1 window pins.
  - INV-375 | No path that stores or serves an article image, a manual image or the manual import calls DriveApp (the domain disables Apps Script's Drive; extends the still-PROPOSED INV-350 to article images) | Reference/KB | Verify: a derived scan for DriveApp across kbImage* / kbManual* / kbResolveDocImages_ / kbUploadImage, plus the DRV-3 and M4-FU3 drives.
Most structurally significant change: DRV-3 moved the app's last live Drive dependency for authored content into a content-keyed, append-only sheet tier with ONE shared image-tab reader for article and manual images. It takes Reference off a Google service the domain has disabled, rather than routing around it per feature.
Should-have-been-deferred: Batch 7a's form hardening (FORM-1/2/3/5). The public ?form route is blocked for external recipients by Workspace policy on this domain, so those fixes guard a path with no live traffic. They cost about a batch that could have gone to the unverified operator state.
---END CYCLE SUMMARY BLOCK---

Impact summary (beside the block, for the Verification Pass):
- **For a user now:**
  - Article images work again without Drive.
  - Spanish Inbox follow-ups appear unclaimed, and a thank-you does not reopen.
  - A rep on a blocked clipboard is told the truth.
  - Admin health surfaces stop reading green over a disabled Drive, unset PHI stores and unreadable lookup cells.
  - Quizzes cap retries; outside intake recipients need confirmation; a break adjustment says which break.
- **For the next developer:**
  - One Timesheet range reader (archive-aware).
  - One image-tab reader.
  - One Spanish episode rule.
  - Pure editor cases RUN by the Node harness (INV-373).
  - The g116 sixteenth and seventeenth directions.
- **Safer under scale:**
  - The export's 1000-row grid (TC-01) and the data-table import (ADM-05).
  - The QA purge deletes contiguous runs.
  - The archive readers no longer hold a short read when archiving turns on.
- **Effort on zero-traffic paths:** Batch 7a's external-form fixes and Batch 14's reader (archiving is off). The second is a deliberate pre-enable fix the operator chose.
- **Not confirmed:** the Batch 1–15 scenario walks (incl. S134–S136) and the DEV nightly's Integration B run (Expected 351).
