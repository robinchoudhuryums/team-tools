---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- DRV-3 — KB article images were unreadable: the domain disables Apps Script's Drive, and every pasted screenshot and every converted Doc image lived in a Drive folder (KB_IMAGES_FOLDER_ID was never even set on this deployment). Article images now live in a `KbImages` tab in the KB spreadsheet, cited as `kbimg:<key>`. This is the operator's 2026-10-05 if-IT-declines plan, with the defaults approved that day: downscale to ≤1600 px wide, cap at 1.5 MB, keep GIF/WebP.

Files modified:
- web-app/00_config.js
- web-app/70_kb.js
- web-app/kb/script_kb.html
- web-app/cn/script_callnotes.html (the Admin "Drive is disabled" finding no longer lists article images among the Drive surfaces)
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- test/visual/mock.js (a `getKbImages` fixture — X1)
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: L (~14 h) — Batch 12, written before the first edit
Actual: ~3.5 h

CHANGES:
DRV-3 | 00_config.js |
  - New constants: `KB_IMAGES_TAB` ('KbImages'), `KB_IMAGES_HEADERS` (the ManualImages header, by reference), `KB_IMAGE_KEY_RE` (`kbimg-` + 24 hex), `KB_IMAGE_MAX_BYTES` (1,572,864), `KB_IMAGES_BATCH` (6), `KB_IMAGE_CACHE_PREFIX` ('kbimg_').
  - `KB_IMG_UPLOAD_MAX_CHARS` stays as the request sanity cap; the store cap is the binding one.
DRV-3 | 70_kb.js | Shared image-tab helpers. The manual functions now delegate to them unchanged:
  - `kbImageTabHeaderOk_(sheet, headers)`;
  - `kbImageTabLedger_(sheet, headers, keyRe)`;
  - `kbImageTabServe_(sheet, keys, spec)` — the M4-FU3 reader rule, parameterised: valid keys only, batched, missing apart from failed (g128), ONE Data read, re-checked type/base64/size, cached by content hash (g157).
DRV-3 | 70_kb.js | KbImages storage:
  - New `getKbImages(keys)`: employee-gated, read-only, no lock.
  - New pure `kbImageItem_(type, base64, kind, hashFn)`: the key is `kbimg-` + the first 24 hex of the content sha256, so the same bytes give the same key. It refuses a type off the png/jpeg/gif/webp list, non-base64 data, or more than 1.5 MB (`tooLarge`).
  - New `getOrCreateKbImagesSheet_`.
  - New `kbImagesStoreLocked_(items)`: takes the script lock (g17) and is APPEND-ONLY — a key already stored whole is reused, never rewritten. A tab whose header was changed is REFUSED by name with nothing appended (g142). Pieces use `kbManualImagesRows_`, so they stay under the cell limit.
DRV-3 | 70_kb.js | The converter at save (`kbResolveDocImages_`):
  - It reads the Doc through DocumentApp outside any lock, stores through `kbImagesStoreLocked_`, and rewrites the token to `kbimg:<key>`.
  - A Doc that will not open, a failed store, or an image over 1.5 MB KEEPS its `kbdoc:` token (pending, named) so a later save can store it. Only an image the Doc does not have, or a type that can never be stored, becomes the placeholder. No Drive.
  - `kbReplaceDocImageTokens_` gains the keep contract: a resolver returning `{ keep: true }` leaves the token, counted in `kept`.
DRV-3 | 70_kb.js | Paste and save:
  - `kbUploadImage`: admin-gated; type list, request cap, then the store cap. It stores in the tab under the lock (a shared tab now, not a Drive file) and returns `{ key, token: 'kbimg:<key>' }`. Its PHI-free audit row is `key=…; type=…; bytes=…[; reused]`.
  - The `kbSaveItem` comment is updated; `imagesExported` now counts images newly stored.
  - `kbGetImageData` and the Drive-thumbnail fallback are unchanged, so old links keep rendering. `getOrCreateKbImagesFolder_` is unchanged and still used by file ingest.
DRV-3 | kb/script_kb.html | Rendering:
  - `kbMd_` renders `kbimg:` as a keyed chip; only the key charset reaches the attribute.
  - The `kbdoc:` chip reads "appears after Save" (no longer promises Drive).
  - New hydrator (`KB_KBIMG`, `kbKbimgApply_`, `kbHydrateKbImages_`, its own MutationObserver), mirroring the manual-image hydrator: batched by `KB_KBIMG_BATCH` (pinned equal to the server's), only a success cached (g129), a "not stored" title, and an image set by property only from a png/jpeg/gif/webp data URL.
  - CSS for the chip's loading / failed / missing states and the image.
DRV-3 | kb/script_kb.html | Paste and save, client side:
  - `KB_IMG_MAX_WIDTH` 1600 and `KB_IMG_MAX_BYTES` (pinned equal to the server's).
  - Pure `kbImgDataUrlBytes_` and `kbImgPastePlan_`: keep an image inside both limits byte for byte (a GIF stays animated); otherwise redraw at ≤1600 px, never upscaled.
  - `kbImgPrepare_` redraws on a white canvas as PNG if that fits, else JPEG at 0.85 / 0.7 / 0.55, else refuses by name.
  - `kbPasteUploadImage_` prepares before it sends and inserts `![Screenshot](kbimg:<key>)` only for a well-formed token.
  - Save says "storing N image(s)" / "N image(s) stored".
(tests) | test/client/run.js, test/visual/mock.js | Moved pins:
  - KBL: Save says "storing".
  - The paste-cap mirror now pins `KB_IMG_MAX_BYTES === KB_IMAGE_MAX_BYTES`; the mirror index entry moved with it.
  - KBI-3: the named Doc-open and store failures.
  - DRV-2: the converter no longer reaches the Drive folder.
  - DRV-5 → DRV-3: a Doc that will not open keeps the tokens; driven through the new resolver.
  - M3-I2/I3: the sandboxes load the shared helpers.
  - The visual mock gains `getKbImages`.

TEST RESULTS: passed.
- Node: 1215/1215 (was 1209), six new pins, all DRIVEN:
  - the item grid (content key, the same bytes giving the same key, type / base64 / size refusals, exactly-the-limit stored);
  - the store (append-only, reused keys, pieces under the cell limit and rejoining exactly, under the lock, a changed header refused with nothing appended);
  - `getKbImages` (rejoined, WebP served, a non-image type failed, a part gap or unknown key missing, a manual key not an article key, ONE Data read, cached by hash, batched, gated);
  - the converter (stored → `kbimg:`, over 1.5 MB → pending and named, missing → placeholder, failed store → pending; the keep contract);
  - `kbUploadImage` (token, audit by key, the same bytes reused, over-cap, SVG, admin gate);
  - the client (chip charset, the converter chip, the batch mirror, the paste plan grid, the cache-success-only and source rules).
- DOM: 218/218 (was 216), two new drives:
  - the hydrator: one batched call, two mentions → two images, "not stored" said, a cached success not asked again, a failure not cached;
  - the paste: a small image sent byte for byte; a 3200 px PNG redrawn at 1600×900 and sent as JPEG because the PNG was over 1.5 MB; a malformed token never inserted.
- lint:server clean; counts --check agrees; split manifest current.
- 24 bite-checks, all BITE: item ×3, store ×3, reader ×3, converter ×5, upload ×3, client ×7. No NO BITE. The Admin Drive-surface sentence is copy with no pin (g138: not dressed up as one).
- Visual: reference-light-wide and admin-system-drivedisabled-light-wide show 0px overflow, nothing missing and no console error (font-CDN certificate aside). The disabled-Drive finding reads "…Reference Drive embeds and file imports, article images uploaded before the move to the KbImages tab…". No scenario photographs a `kbimg:` article image.
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S65 paste-a-screenshot: PASS on the new path. The paste stores in KbImages and inserts `kbimg:`; Save during the upload is still refused (KB2-10).
- S63 Doc→article converter: PASS on the new path. Save stores the Doc's images, or keeps them pending with a named reason. **Unverified: whether this domain also blocks DocumentApp.** If it does, the converter cannot read the Doc at all. That is the same posture as before, but now named and pending.
- S62 Reference article view: PASS. Old Drive-thumbnail images render through the http path and the fallback; `kbimg:` images hydrate.
- S104 Drive capability: PASS. The finding's surface list no longer claims article images.
- S124–S128 manual images: PASS. `getManualImages` is behaviourally unchanged; M3-I2/I3 green on the shared helpers.
REGRESSION RISKS:
- `kbUploadImage` now takes the script lock for its append. One short write, but a paste now queues behind punch/note writes (g17's trade).
- A pasted image over 1600 px or 1.5 MB is now re-encoded in the browser: a large PNG may become a JPEG, and an animated GIF over the limits loses its animation. An image inside both limits is sent byte for byte.
- A converted Doc image over 1.5 MB stays pending until it is shrunk in the Doc. Before, it would have failed on Drive anyway.
- Article images are read in batches of 6 (up to ~12 MB per call). An article with many large images renders progressively.
- The KbImages tab is append-only with no purge. Images pasted but never saved, or removed from an article, stay as orphans. This is the posture the Drive folder had (the config comment says so); a cleanup is a follow-on.
- An admin who edits the KbImages header row stops all image stores until it is restored (refused by name).
INVARIANTS AT RISK: None broken. Checked and holding:
- INV-118 / the mirror index: the client cap is pinned to the server's.
- g17: the store locks.
- g129: only a success is cached.
- g128: missing is told apart from failed.
- g142: a changed header refuses by name.
- g157: the cache key is the content hash.
- g143: `getKbImages` is employee-gated; `kbUploadImage` admin-gated.
- g150 / X1: the new RPC has a fixture.
- g144 / SHEET-SAFE: rows go through `appendRowsSafe_`.
- The KB is PHI-free by policy: the editor's scrub reminder is unchanged; images are ids and bytes only, and the audit row carries no content.
- M4-FU3 / INV-350-candidate: the manual path still never reaches Drive.
- DRV-5's rule (keep what a later save can fix) now covers every retryable failure.
NET SCORE: 1 − 0 = 1. DRV-3 fired in production this month: Drive has been disabled for Apps Script since at least 2026-09-29 (M4-FU3), so every paste and every converted image failed. No new failure mode identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- After the push, paste a screenshot into a test article and save it: the image should appear, and a `KbImages` tab should exist in the KB spreadsheet (auto-created). | BLOCKS DEPLOY: N
- Convert a Google Doc that has an image, then Save. If the toast names "Could not open the source Doc", the domain also blocks DocumentApp (Docs) for Apps Script: tell IT alongside the Drive request, and paste the images instead. | BLOCKS DEPLOY: N
- Do not edit or reorder the KbImages tab (like ManualImages, it is app-owned). | BLOCKS DEPLOY: N
Deploy: Server + Client (Reference, Admin): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- No visual scenario photographs an article with a `kbimg:` image (the mock fixture exists).
- No cleanup for orphaned KbImages rows (pasted and never saved, or removed from every article). A "remove images no article cites" admin action would close it.
- Storage Health has no KbImages line (size or row count). The KB store row covers reachability.
- The Drive-thumbnail fallback (`kbGetImageData`, `KB_IMG_FB`) can be retired once no article holds a Drive thumbnail link; an Admin scan could count them.
- Editor-suite (Tests.js) cases for the store and reader are owed to Batch 15. `test_kb_uploadImage_rejectsInvalidPayloads` still passes on the new messages.

DOCUMENTATION UPDATES NEEDED:
- docs/design-decisions.md: amend "KB Phase 2b — converter images export to Drive at SAVE time", "KB Phase 3 — paste-a-screenshot upload" and "Article images fall back to server-served data" with DRV-3; consider a new decision "Article images live in the KbImages tab".
- docs/operator-state.md: the `KbImages` tab (app-owned, append-only, auto-created; do not edit); `KB_IMAGES_FOLDER_ID` now matters only for file ingest and legacy links; the DocumentApp check.
- CLAUDE.md: the storage map's KB tabs list gains KbImages; the g142 index (DRV) and the Drive-disabled lead item in STATE.
- docs/gotchas.md: g142's Drive passage (article images no longer depend on Drive); g129/g128 instances if wanted.
- docs/modules.md: Reference (paste and converter images now stored in the KB spreadsheet).
- .cycle/config.md: INVs for the KbImages store (append-only, content-keyed, locked, refused header) and reader; extend S63, S65, S62, S104.
- docs/test-harness-log.md: the Batch 12 entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
