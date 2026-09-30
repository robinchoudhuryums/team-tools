---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Plan B — the procedures-manual import without Drive (M4-FU1..FU3, operator 2026-09-29). The first real import failed with "The feature you are attempting to use has been disabled by your domain administrator" once the Drive scope was re-granted: this Workspace disables Apps Script's Drive service.
- FU2: a locked Import button looks locked and says why ("Import unlocks after a clean Check of this file")
- FU3a: manual.json is chosen from the admin's computer (file picker) and sent to the server as text — no Drive link
- FU3b: the manual's images are stored in the ManualImages tab (base64 split across rows under the cell limit) and served from it — no Drive folder
- FU1 (a missing-scope message naming re-authorization) shipped and was REMOVED with FU3: no Drive call remains in the import to classify
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (storage map, index lines, running totals), docs/design-decisions.md, docs/modules.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-333/334 superseded in place, S124 steps), .cycle/STATE.md
Estimate: M (~4 h) — (a) file picker + text source S 1.5h · (b) images in the tab + serving M 2h · tests/visual S 0.5h — written BEFORE the first edit
Actual: ~2 h

CHANGES:
FU2 | kb/script_kb.html | `.kb-man-go:disabled` is visibly disabled; a `title` and a `#kb-man-gate` line say Import unlocks after a clean Check; `kbManualGate_` shows/hides the line on every lock change.
FU3a | 70_kb.js, kb/script_kb.html | `kbImportManual(source, opts)` accepts only `{text}` (≤ KB_MANUAL_FILE_MAX characters); a string or link is refused ("Choose manual.json…"); `kbManualFileId_` and the DriveApp read are gone. The dialog has `<input type=file id=kb-man-file>`; a FileReader reads the file into `KB_MANUAL_FILE` via `kbManualSetFile_`, which names the file and locks Import until it is checked; `kbManualRun_` sends `{text}`.
FU3b | 00_config.js, 70_kb.js, kb/script_kb.html | ManualImages headers → Key, Sha, Type, Kind, Part, Data, ImportedAt; `KB_MANUAL_IMAGE_CELL_MAX` = 45000; `KB_MANUAL_IMAGE_BUDGET_MS` removed. `kbManualImagesRows_` (pure) splits each image into ordered pieces sorted by key; `kbManualImagesWrite_` rewrites the tab (header included, so an old Drive-layout tab is migrated) under the import's lock, ONLY when an image changed or was dropped; a write failure is `images.error`, never a failed import. `kbManualImagesLedger_` reads Key..Part (never Data), drops a key with a missing/duplicate part, and returns nothing for a tab whose header is not current (`kbManualImagesHeaderOk_`). `getManualImages` does ONE Data read per batch, rejoins in part order and re-checks type/base64/size; "not imported" vs "could not read" kept; content-hash cache kept. Removed: `kbManualUploadImages_`, `kbManualImageName_`, `kbManualTrashReplaced_`. The dialog's image line reports stored / unchanged / removed and a failed write with "press Import again".

TEST RESULTS: passed — pure 1091/1091, DOM 173/173, lint:server clean, counts --check agrees. Rewritten in place: M3-I2/I3/I5 (tab-backed), M1-S5 (text source; link refused; too-large refused), M1 DOM + FU2/FU3 DOM (driven through a real jsdom File + FileReader). 14 bite-checks; 12 bit first time; two NO BITEs acted on: the only dropped-image case also changed an image (a drop-only case now isolates the rewrite condition), and the header check was shielded by the row checks (a reordered-column header now reads as not imported, which only the header check decides). Visual: reference-manual-import-light-wide and reference-manual-images-light-wide re-shot and read — 0 px overflow, no missing fixtures.
Regression scenarios (manual): S124 — steps and Expected rewritten for the file picker and the tab (walk after deploy); S125 image steps PASS against the harness (the client image path is unchanged; the M3 DOM images pin is green); S62/S63 NOT APPLICABLE (hand-written articles and the converter untouched).

REGRESSION RISKS:
- UNVERIFIED IN A REAL RUNTIME: one google.script.run call carries the ~1.6 MB file text (twice — Check, then Import). Expected to be within limits; if Check fails with a transport/size error rather than a message about the file, the fallback is a chunked upload.
- The images now live in the KB spreadsheet (~1.25 MB of base64 in ~170 rows) — the KB spreadsheet grows by that much; getManualImages reads cells instead of Drive files (one read per batch, then cached by hash).
- `kbImportManual`'s signature changed (link → {text}); its only caller is the Manual dialog, updated in the same change.
INVARIANTS AT RISK: None found. INV-333/334 are superseded in place (text rewritten, IDs kept). g126 (one reader per operator store): the ledger and the serve path share `kbManualImagesLedger_`. g129 (never cache a failure): only a success is cached, unchanged. g144 (sheet writes): every image write goes through appendRowsSafe_ / sheetSafeRows_ (base64 pieces can begin with '+').
NET SCORE: 1 production fix (the manual import could not run at all on this domain — it fired on the operator's first import) − 0 new failure modes = +1.

OPERATOR ACTIONS / DEPLOY:
- Merge the branch and deploy (clasp push -f + New version) | BLOCKS DEPLOY: N (it is the deploy)
- After deploy: Reference → Manual → Choose File → manual.json → Check → Import; vet; Publish; walk S124–S126 | BLOCKS DEPLOY: N
Deploy: Server + Client (Reference views): `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version → Deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The same domain policy breaks every other Drive feature: images in the Doc/Sheet → article converter, paste-a-screenshot into an article, the KB Images folder (and the article-image fallback that scopes against it), the Drive-embed reachability check, and QA recording sync/playback from a Drive folder. Options: ask IT to allow Apps Script's Drive service, or rework each without Drive. Recorded in STATE and the operator log; not in this scope.
- Admin → System's Drive row reports the SCOPE; it cannot see an admin-disabled service (the scope reads granted while every call fails). Worth a probe that names "disabled by your domain administrator".

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this change: operator-state (the import steps), the CLAUDE.md storage map and index lines, the M3 images design decision (superseded in part), modules, operator log, harness log, INV-333/334, S124.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
