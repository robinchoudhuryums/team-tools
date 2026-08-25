# Operator batch 2 (2026-08-25) — 8x8 Spanish voicemail fold — block

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- B2-1 | VM fold into pending (sender+subject filter over the deployer's
        mailbox; kind:'voicemail'; requester parsed from the subject; claim/
        assign/expand work; first-message re-check; cap folds into truncated)
- B2-2 | Manually-resolved VMs join the resolved list + share chart with a
        NULL duration (never a fake response time)
- B2-3 | ONE shared scope predicate (spanishThreadInScope_) for the three
        by-id endpoints — inbox-addressed OR configured VM shape; release
        stays Gmail-free; stats deliberately untouched
- B2-4 | Client voicemail pill (info-toned) on pending + resolved cards +
        a VM fixture item so it is on camera

Files modified: web-app/Code.js, web-app/metrics/script_metrics.html,
web-app/styles.html, test/client/run.js, test/visual/mock.js

TEST RESULTS: pure 628/628, DOM 79/79; 7 bites (6 mutations + 1 pin
STRENGTHENED when its first bite exposed it — a sender-substring mutation
survived because the negative case didn't contain the address either; the
distinguishing case is a display-name spoof carrying the real address as
TEXT). Two veteran scope pins REWRITTEN in place for the shared predicate
(the accrual precedent). Browser-measured: the pill renders on the VM card
in spanish-light-wide, overflow 0.

REGRESSION RISKS: the scope guard WIDENED (by-id endpoints now also accept
configured VM notifications) — deliberate, narrow (exact sender + subject
filter, both halves required, blank = OFF), and pinned behaviourally incl.
the half-configured collapse.

INVARIANTS AT RISK: INV-31 (the seven-endpoint gate unchanged; the scope
guard widening is documented for the sync-docs amendment), INV-169 (VM cap
rides truncated), INV-32/claims (unchanged — same audit rows).

NET SCORE: 0 − 0 = 0 (one capability)

OPERATOR ACTIONS / DEPLOY:
- Nothing to set up: CONFIG seeds carry your sample (no-reply@8x8.com /
  'via A_Q_Spanish'); Script Properties SPANISH_VM_SENDER /
  SPANISH_VM_SUBJECT_FILTER override without a redeploy; blank either to
  turn the fold off | BLOCKS DEPLOY: N
- Ships on the standing combined deploy | BLOCKS DEPLOY: N
FOLLOW-ON ITEMS: VM items are pending-only until manually resolved/claimed
(no reply semantics) — if members start replying "handled" to the
notifications, a member-reply already resolves them (mirrored loop).
DOCUMENTATION UPDATES NEEDED: INV-31 scope-guard amendment + operator-state
entry — consolidated sync-docs after the sequence.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
