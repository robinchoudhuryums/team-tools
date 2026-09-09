---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- (1) getOrCreateKbImagesFolder_ swallowed the stored-folder open failure, so the
  operator-visible warning could only ever report the CREATE error while saying
  "could not open or create" — a trashed folder, a revoked share and a missing
  Drive scope all read identically.
- (2) Nothing in Admin reported whether Drive is usable, so a missing /auth/drive
  grant was invisible until a Doc conversion hit it.

Files modified:
- web-app/Code.js
- web-app/cn/script_callnotes.html
- test/client/run.js
- test/visual/mock.js
- test/visual/shoot.mjs
- CLAUDE.md
- .cycle/STATE.md

CHANGES:
(1) | web-app/Code.js | getOrCreateKbImagesFolder_ carries the stored-folder open
    reason into its throw, says by name when KB_IMAGES_FOLDER_ID is simply UNSET
    (the operator's actual state — the property has never been set on this
    deployment), and appends a re-auth hint only when driveScopeError_ recognises
    Apps Script's own missing-SCOPE shape, so a Drive-SIDE failure (a quota, a
    missing file) is never misdiagnosed as a missing grant. kbResolveDocImages_'s
    warning drops the blanket "Could not open or create" prefix, which now
    double-said what the message explains.
(2) | web-app/Code.js | driveScopeError_ (pure, the ONE shared shape rule) +
    driveAccessStatus_ — introspects the OAuth token (POST body, never a logged
    query string) instead of attempting a write, and probes the stored folder id
    with getFolderById, NEVER getOrCreateKbImagesFolder_, so opening the Admin tab
    can never provision anything. granted:null = the probe failed, reported as
    unknown and never OK (INV-187); folderOk:null = not provisioned yet, never
    "broken" (INV-186). Only a fully-clean round is cached (INV-129).
    getStorageHealth returns `drive` behind a checkDrive opt-out; getDeployReadiness
    passes checkDrive:false, keeping its documented composes-never-scans property.
(2) | web-app/cn/script_callnotes.html | cnHealthFindings_ gains four Drive rules
    (not granted = fail; probe failed = warn; dead folder = warn; granted = ok with
    the unprovisioned folder stated as a fact), so the state reaches the Overview
    Storage card and the System badge for free. cnDriveAccessHtml_ renders the same
    state as a tinted line ABOVE the inventory table — Drive is a capability, not a
    store, and has no tz/retention/link column to fill. Renders NOTHING when the
    field is absent, so deploy skew is safe in both directions. + CSS.
(2) | test/visual/mock.js, shoot.mjs | both getStorageHealth fixtures carry `drive`
    (INV-185); a `?drive=denied` hook and two scenarios shoot the FAILING state,
    which carries the longest string the line can render.
(1)(2) | test/client/run.js | DRV-1..4; PR2-3 gained the new sibling helper in its
    sandbox (the update-the-test-doubles rule); PR2-4's all-clear ban list gained
    the two Drive fields.

TEST RESULTS: passed. Pure 768 → 772 (DRV-1..4), DOM 108 unchanged, node --check
clean. 14 mutations / 14 bites. Visual: admin-system light/dark/mobile/all-clear/
error + the two new nodrive scenarios + cn-log and admin Overview re-shot — all
machine-clean (0 overflow, no missing fixtures), three eyeballed.
ONE bite exposed the PIN as weaker than the property rather than a code defect:
routing the probe through getOrCreateKbImagesFolder_ provisions a replacement,
but its thrown message CARRIES the open reason, so the pin's /gone/ check passed
the mutation. The side-effect assertion became a create-count on the dead-folder
path plus a scoped source ban, and both mutations then bit.

REGRESSION SCENARIOS (Test Command = manual; only overlapping scenarios walked):
- S97 (Admin System findings-first) | PARTIAL PASS — the harness half walked at
  wide/dark/mobile, all-clear and forced-error; the badge, the findings order and
  "N checks passing" all move with the new item. The live half (real payloads)
  is NOT EXECUTABLE in this container.
- S104 (NEW — Drive capability + the folder error) | PARTIAL PASS — same: the
  render half is on camera in three states; the folder-error half is pinned
  behaviourally by DRV-2 and needs the live deployment to walk.
- S63 (Doc→article converter) / S65 (paste-a-screenshot upload) | NOT EXECUTABLE —
  both need Drive + the Apps Script editor. Their only change is the richer failure
  message, driven behaviourally by DRV-2.
- S1 / S2 (smoke / full editor suite) | NOT EXECUTABLE here; Tests.js is unchanged,
  so the expected count stays 308.
- S62 (Reference browse/search/edit), S90 (QA), S17–S24 / S31–S36 (Call Notes) |
  NOT APPLICABLE — no touched code path; the CN partial changed only in the Admin
  System render, and cn-log was re-shot clean as a belt-and-braces check.

REGRESSION RISKS:
- getStorageHealth now makes ONE outbound UrlFetchApp call per uncached Admin open
  (~5 min TTL). getDeployReadiness opts out, so the Overview checklist is unchanged.
  UrlFetchApp is already an authorized capability (KB AI, form PDFs, kbIngestFile),
  so no new scope. If the tokeninfo host is unreachable the probe reports unknown
  and nothing else degrades.
- getOrCreateKbImagesFolder_'s THROWN MESSAGE changed shape. Three callers surface
  it (kbResolveDocImages_ warning, kbUploadImage error, kbIngestFile error); all
  three pass it through to a toast, so the change is strictly more informative. No
  caller parses it.
- The old behaviour was not correct in any scenario I can find: the swallowed open
  reason had no consumer, and the blanket "open or create" wording actively
  misdirected (it sent the operator looking for a folder that has never existed).

INVARIANTS AT RISK: None violated. Newly written: INV-197. Deliberately honoured —
INV-186 (an unprovisioned folder is a FACT, not a warning; the check reads zero on
a healthy deployment so it may carry a tone), INV-187 (a failed probe is unknown,
never OK), INV-129 (clean rounds only are cached), INV-185 (both fixtures carry the
new field), INV-188 (the source bans scan a comment-stripped view — the probe's own
comment names the helper it must not call), INV-179 (the pins derive the constants
from Code.js rather than restating them).

NET SCORE: 2 − 0 = 2
- (1) Would it have fired in production this month? YES — it fired on 2026-09-09
  and cost a diagnosis. New failure mode: NO.
- (2) YES — the missing grant was live and invisible; the KB Images folder has
  never been created, so every article image on this deployment has been a
  placeholder and the 2026-08-13 kbGetImageData fallback has been inert.
  New failure mode: NO.

OPERATOR ACTIONS / DEPLOY:
- Re-authorize Drive as the DEPLOYING account: open the Apps Script editor, run any
  function, accept the Drive permission. Three outcomes distinguish a missing
  re-consent from Google's granular consent (an unticked Drive checkbox) from a
  genuine Workspace block. | BLOCKS DEPLOY: N (the deploy is what makes the
  diagnostic visible; the grant is what makes images work)
- After the grant, expect the SECOND, already-documented block: this domain forbids
  the folder's domain-link sharing, so thumbnails 403 and the kbGetImageData
  fallback renders the images instead. | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then Deploy → Manage deployments → Edit →
Version: New version → Deploy. Post-deploy: runAllTests() — still 308.

FOLLOW-ON ITEMS:
- getDeployReadiness deliberately does NOT include the Drive check (it would break
  its composes-never-scans property). A pre-deploy Drive line is arguably worth it
  since re-consent is precisely a post-deploy step — needs the readiness endpoint to
  accept a cheap composed signal rather than a probe.
- driveAccessStatus_ reports the scope, not the capability. A token can carry
  /auth/drive while a domain policy still refuses the write; only an actual write
  proves that, and a write has side effects. Recording the LAST OBSERVED Drive
  failure (the stampAutomationError_ pattern) would close the gap after the fact.
- kbUploadImage / kbIngestFile surface the richer folder error as a plain toast;
  neither is sticky the way the image-export warning is (KBI-3). Small, out of scope.

DOCUMENTATION UPDATES NEEDED: done in this session —
- Common Gotchas: the missing-SCOPE class (how it differs from an admin block and a
  sharing restriction; auto-detected scopes; clasp push never re-prompts; Tests.js
  makes zero DriveApp calls so a green suite vouches for nothing here).
- INV-197 (new).
- Key Design Decisions: Storage Health leads with Drive, which no store row can see.
- Operator State Checklist: the KB_IMAGES_FOLDER_ID entry now records that the
  property has NEVER been set on this deployment and gives the three-outcome
  re-consent test; a new 2026-09-09 round entry.
- Regression Scenarios: S104.
- Test Suite: pure 772, DOM 108, matrix 99 → 101.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
