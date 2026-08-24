# Pilot round-3 FOLLOW-ONS — broad-implement block
# (between-cycles operator work, pre-cycle-19; branch claude/team-tools-roadmap-6e2l97)

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- FO-1 | Reference comments in the Ctrl/⌘+K drawer (Phase B — the INV-139 drawer-parity shape, demand now on record)
- FO-2 | Comment edit-in-place (`kbEditComment` — author-ONLY, active-only, cap-refuse, id-only audit + inline edit box)
- FO-4 | Comment-count analytics fold (`kbCommentCounts_` → the existing Most-used/Review-due rows via the shared chip)
- FO-3 | Scratchpad revision history — deliberately NOT implemented: last-write-wins is a stated design (the modal copy
        says so) and its revisit condition (reps reporting lost content) has not occurred; a revision store would
        reverse a design decision, not close a gap
- VIS  | Three defects found by MEASURING the new surfaces: (a) two auto-margin action buttons split apart in the
        comment meta row (the timestamp now carries margin-right:auto and the cluster sits together); (b) the count
        chip sat flush against "14 views" (6px left margin on .kb-fb-tally); (c) **the edit button was an INVISIBLE
        4px empty box — `icon('pencil')` silently returns `''`** (the key is `adjust`; "pencil" appears only in the
        ICONS comment, which is exactly what the grep-for-existence check had matched — the INV-188 trap pointed at
        markup; found only by reading the live button rect after the reader screenshot looked one-button)
- NET  | New DERIVED tripwire: every `icon('name')` literal across the partials must be a real ICONS key (the
        extractor anchors on the value shape `: '<`, not indentation — a fixed-indent anchor matched 19 of 57 keys);
        the sweep found NO other dead key. Plus `reference-reader-light-wide` (the `post` hook opens the reader) +
        a shape-mirrored `getReferenceItem` fixture — the open reader was unshootable before, which is why (c) could
        have shipped invisible.

Files modified: web-app/Code.js, web-app/Tests.js, web-app/kb/script_kb.html,
test/client/run.js, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md

CHANGES:
FO-1 | kb/script_kb.html | `kbDrawerOpenItem_` hosts `#kbd-comments` in BOTH branches + calls the new
       `kbDrawerLoadComments_` (the drawer's own L-18 guards, A12 ×2, ONE shared renderer). `kbRenderComments_` is
       dual-host: per-host suffixed input ids (`kb-cmt-input` / `-d`) with matching label-for; `kbAddComment_` is
       closest()-scoped; `kbCommentsRefresh_` refreshes the HOST the control lives in. The Phase A "drawer stays
       comment-free" pin was REWRITTEN in place (the accrual precedent — honest bookkeeping when a contract changes).
FO-2 | Code.js + kb partial + Tests.js | `kbEditComment(commentId, text)`: locked (INV-01), author-ONLY (NO manager
       escape — moderation is REMOVAL; a manager rewriting a rep's words under their name is a worse surface),
       active-only ('Comment not found.' after a delete — no resurrection), cap-REFUSES (the add rule), audit row
       id-only (INV-32). Client: pencil button on `mine` rows → inline textarea swap (textContent read-back = the
       decoded original, the snippet-copy pattern) + Save/Cancel. `test_kb_comments_flow` gained the edit steps
       (foreign edit refused / own edit changes text in place / deleted row not editable).
FO-4 | Code.js + kb partial | `kbCommentCounts_()` (best-effort, bounded-tail, ACTIVE rows only — the
       kbFeedbackCounts_ shape) folded into `kbGetUsageStats` + `kbGetReviewDue` rows; the shared `kbFbCountHtml_`
       renders the chip, so both manager blocks got it with zero per-block wiring — never a parallel ranked block.
VIS  | kb partial | the three measured fixes above; verified by re-shooting `reference-light-wide` +
       `reference-reader-light-wide` and re-measuring the button rects (edit 4px → real glyph; cluster adjacent
       right-aligned at 1349..1377).
TESTS | run.js + mock.js + shoot.mjs | server pin gained the kbEditComment contract; client pin rewritten for Phase B
       (dual-host, closest-scoped, drawer loader guards, shared renderer); the icon-key tripwire (619 → 620);
       `kbEditComment`/`getReferenceItem` fixtures + `comments:` counts on the analytics fixtures (INV-185).
       **5 mutations / 5 bites** (edit manager-escape, audit text leak, drawer load dropped, bare-id lookup
       regression, icon key reverted to 'pencil').

TEST RESULTS: pure 620/620, DOM 75/75, `node --check` clean on Code.js/Tests.js. Scenario walk (manual):
- S1/S2 — NOT APPLICABLE off-editor; `kb_comments_flow` (now incl. edit) runs at the owed post-deploy `runAllTests()`.
- S62 (Reference) — PASS: comments render in the tab reader (on camera in `reference-reader-light-wide`), esc()'d,
  named form; edit/delete cluster measured adjacent + right-aligned.
- S64 (drawer) — PASS: the drawer now hosts the same thread below the feedback bar via the shared renderer; its
  L-18 guards + A12 paths pinned; S64's steps gained the drawer-comments walk (applied in this session).
- S86 (KB inertness) — PASS: comment text renders through esc() in both hosts; DOM fence tests green.

REGRESSION RISKS: `kbRenderComments_`'s input id changed from a bare `kb-cmt-input` to per-host suffixed — no other
code referenced the bare id (the handlers are closest()-scoped now; verified by grep). The `.kb-cmt-when
margin-right:auto` push is scoped to the comment meta row. `kbGetUsageStats`/`kbGetReviewDue` gained an additive
`comments` field — all consumers guard with `|| 0`. Otherwise none.

INVARIANTS AT RISK: None violated — checked INV-01 (kbEditComment locked + finally; USER-lock exceptions unchanged),
INV-32 (id-only audit, pinned + bitten), INV-140/147 (draft invisibility untouched — edit/delete act on comment rows,
whose add-time target check already gated drafts), INV-169 (unchanged), INV-171 (no gated endpoints added — the
ownership refusals deliberately avoid the gate literal), INV-179 (the new tripwire is derived, and its extractor's
own first-write miss — 19 of 57 keys — was caught before commit), INV-185 (getReferenceItem fixture mirrors the
server's article return), INV-188 (the "pencil" comment-match recorded as the markup form of the trap), INV-139
(drawer parity now SHIPPED for comments — the entry's parity posture, not a violation).

NET SCORE: 0 − 0 = 0 (two capabilities + one analytics fold + three pre-deploy visual catches; the invisible edit
button was introduced by this same session's FO-2 and never deployed, so nothing could have fired in production this
month — strict per the cycle-17/18 correction pattern. The icon-key sweep found no pre-existing dead key.)

OPERATOR ACTIONS / DEPLOY:
- The ONE standing combined deploy (PR #176 + #177 + the whole pilot branch): `cd web-app && clasp push -f` →
  Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy | BLOCKS DEPLOY: Y
- Post-deploy `runAllTests()` — `kb_comments_flow` now includes the edit steps | BLOCKS DEPLOY: N
- Round-1 email spot-check (From name + Reply-To) | BLOCKS DEPLOY: N
Deploy: Server + all client partials + Test Suite ship on that single push + New version.

FOLLOW-ON ITEMS:
- Scratchpad revision history — remains deliberately unbuilt; revisit ONLY if reps report losing content across
  windows (the stated condition).
- A ranked "most commented" block — the fold answers the question on the existing rows; build the ranked view only
  if the operator asks for it specifically.

DOCUMENTATION UPDATES NEEDED:
- APPLIED in this session (the /sync-docs half of the scope): test narrative 607→612→619→620 incl. the icon
  tripwire; storage-map `Scratchpad` + `KbComments` rows; the Visual Audit Stage post-hook note (sched modal +
  Reference reader); the round-3 + follow-ons operator-state entry (six rep-callable endpoints, two auto-managed
  tabs, INV-136/localStorage counts unchanged); saveMyScratchpad in INV-01's USER-lock exception list.
- REMAINING: None — the S64 drawer-comments walk was applied in this session too.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
