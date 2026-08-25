# Operator batch 4 (2026-08-25) — intake amend & re-send — block

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- B4-1 | Append-only amendments: trailing AmendsId column (header self-heal),
        NEW row per amendment, original never touched; owner-only source
        validation FAILS the send on a bad/foreign id
- B4-2 | Marking to both sides: AMENDED subject prefix + banner (original
        send date + changed-fields diff, capped 8 + remainder; empty diff =
        honest "re-send" wording) applied POST-hash (INV-41 untouched);
        Sent list chips + detail banners both chain directions; superseded
        rows can't be amended again
- B4-3 | Client flow: Amend button (owner, not-superseded) → parked prefill →
        consume AFTER draft restore (language matched first) → in-form
        detachable banner → collectors carry the id → clear/send detaches
Files modified: web-app/Code.js, web-app/intake/script_intake.html,
test/client/run.js
TEST RESULTS: pure 635/635, DOM 79/79; 6 planned mutations — 5 bit, the
POST-HASH pin did NOT and was found VACUOUS (its anchor matched the function
signature); re-anchored on the hash COMPARE and re-bitten. The intake-chrome
pin rewritten in place for the amend-aware send subject (its own rewrite
exposed the definition matching a bare split — filtered).
REGRESSION RISKS: submission-tab width 10→11 — all fixed indices are below
10 and the detail row reads headers.length wide (legacy rows pad blank).
INVARIANTS AT RISK: INV-41 (post-hash, pinned non-vacuously now), INV-116
(append-only preserved — no edit endpoint added), INV-32 (audit id-only),
INV-89 (banner labels esc_'d + email-safe scan).
NET SCORE: 0 − 0 = 0 (one capability)
OPERATOR ACTIONS / DEPLOY: none — auto-managed column; ships on the
standing combined deploy | BLOCKS DEPLOY: N
FOLLOW-ON ITEMS: a changed-fields diff for ACCT forms uses bank INDEX labels;
localized labels follow the send language (acceptable — the recipient sees
the same language as the form).
DOCUMENTATION UPDATES NEEDED: consolidated sync-docs after the sequence
(Sent-tab behaviour + the AmendsId column note).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
