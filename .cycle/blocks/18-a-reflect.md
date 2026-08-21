---CYCLE SUMMARY BLOCK---
Scope: broad (pre-audit batches 1–8 + 5B, PR #176) + Seams & Invariants (F1–F5, PR #177) | Cycle: 18 / 2026-08-21
Production fixes: 6 — severity: 1 High (KB `data-src` stored XSS — attribute values DECODE on read, so every interactive-block re-render put raw article text through innerHTML; closed via the `kbFenceSrc_` boundary + 7 coupled sites, INV-193), 2 Medium (5A: all 15 `ensureOverlay` dialogs announced as bare "dialog", five nested a second dialog; 5B: the 168-control accessible-name debt swept to 0, incl. the real PPD `hasInputId` association bug), 3 Low (F2 weekend/PTO reminder nags — chimed sticky toasts every Sat/Sun; F7 accrual-tile footer wrap + the MTD line replacing the planned/projected line; Gap C print — a modal printed one screenful, measured 1587px of payroll data silently dropped, and dark mode printed near-white ink)
New capabilities/features: 3 — the Intake Catalog browse tab (reps no longer open the PHI spreadsheet to look up a HCPCS code), the manager pay-statement UI (the server branch had existed with no caller), and per-job automation liveness derived from `AUTOMATION_JOB_CHECKS` + the `AUTOMATION_LAST_ERRORS` channel
Defensive/structural: 19 — incl. the demotions from the batch self-reports (F4 accrual-failure invisibility and the brief incomplete-banner fire only on failures that have not occurred; F5 `drStatus_` needs a hand-edited cell, the trigger cycle 16 scored NO on the same column; F3 span cap is an abuse surface; F14/F8/liveStatus-drift are harness-integrity), the accrual hours-rebuild (closed 18pre's declared Medium before its first live credit), the print/a11y companion harnesses, and the whole seams round (0−0 by design; its value is verified-held — 6/6 veteran tripwires bite, all doc counts match — plus three closed drift channels)
New failure modes: 2 — severity: 2 Low, both declared + documented (F2's inferred-weekend gate silently costs a future weekend-working rep their break reminders — operator-confirmed inert today; seams-F1's scheme whitelist silently drops a schemeless operator URL from PPD cards/emails — follow-on: an `intakeCatalogIssues_` warning)
Net score: 6 − 2 = 4
Invariant candidates: None new — INV-192..195 were written during the batches; the seams rules were folded as amendments into INV-112 (the byte-equal server whitelist twin), INV-185 (fixtures as functions of their arguments; shape pins derived from server return blocks) and INV-188 (comment-strip for bans, raw source for shape extraction; the packed-key and colon-space extractor traps). Library stays at 195.
Most structurally significant change: `kbFenceSrc_` + INV-193 — naming the attribute-decode round-trip as a CLASS (a stored source read back from a `data-*` attribute is DECODED and must be re-escaped through one boundary), pinnable only in the DOM harness, which also exposed that the pure harness had pinned the vulnerable line as correct
Should-have-been-deferred: the batch-5 A14 census — it shipped as a 252-control ratchet baseline with three counting errors that 5B then had to re-derive (real figure 168); measuring once, correctly, before ratcheting would have cost less than ratchet-then-recount
---END CYCLE SUMMARY BLOCK---

## Scope note (why one row covers two rounds)

Cycle 18's reflection covers everything un-reflected since `18pre-a-reflect.md`:
the pre-audit /broad-scan batches 1–8 + 5B (their blocks carry the `18-` prefix
and the 18pre reflection explicitly excluded them), the accrual hours-rebuild
(landed after the 18pre reflection; it closes 18pre's declared Medium), and the
seams round F1–F5. One `phase=reflect` metrics row per cycle — this is it.

## Correction record (for the verification pack)

The five batch blocks' nets sum to **17 − 0 = 17**; strict per-template
re-derivation gives **6 − 2 = 4**. The demotions and their reasons are in the
metrics `notes` field. This is the cycle-17 pattern repeated and larger —
treat batch-block nets as "real defect" counts, not fired counts. The seams
round self-reported 0 − 0 and that figure SURVIVED scrutiny unchanged (the
first block self-report in three cycles to do so), with one amendment: its F1
silent-URL-drop trade is counted here as the second Low failure mode.
