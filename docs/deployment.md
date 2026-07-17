# Deployment: blue-green (prod + a personal dev instance)

This project ships as ONE Apps Script Web App synced with `clasp`. To let the
team use a stable version while you keep building, run **two separate Apps
Script projects from the same repo source**:

| | **Prod** (the team) | **Dev** (just you) |
|---|---|---|
| Apps Script project | the committed `web-app/.clasp.json` scriptId | a **separate** project — `web-app/.clasp.dev.json` (gitignored) |
| Web App access | `ANYONE_ANONYMOUS` | **"Only myself"** |
| URL you use | the versioned **`/exec`** URL (stable) | the **`/dev`** HEAD URL (every push is live instantly — no version step) |
| Script Properties → Sheets | the **real** ADP/PHI/HR sheets | **copy** sheets (PHI stores start **empty**) |
| Recipient config (`MANAGER_EMAILS`, dept, intake…) | real | **your own inbox** |
| Automation triggers | installed | your call (they email only you) |

**Why not one project with "dev-tagged" rows?** Email/triggers aren't row-taggable
(dev would email real people), every read path would need a dev filter (miss one →
dev hours in a real paycheck), and dev bugs would operate on real payroll/PHI.
Copy sheets contain the blast radius. See the discussion in the project history.

---

## Code isolation you get for free

- **`clasp push` never changes what the team sees.** The team is on the versioned
  `/exec` URL, which keeps serving the same saved version until you *explicitly*
  cut a **New version** (Apps Script editor → Deploy → Manage deployments → Edit →
  Version: New version → Deploy).
- **Instant rollback.** Manage deployments → Edit → set Version back to the prior
  one → Deploy. Keep this in your pocket.
- **The `/dev` HEAD URL** always runs your latest `clasp push` and is reachable
  only by editors of the script — perfect for a solo dev instance, no version
  ceremony.

## Data + email isolation you must set up (the part that matters)

"Which sheets / which emails" live in **Script Properties**, which are per-project.
So isolating data + email = the separate dev project pointed at copies + your inbox.

---

## Prerequisites (one-time)

The `git` / `npm` / push steps run in a shell; everything else (Drive copies,
Script Properties, cutting versions, running `devScrubRoster_`/`runAllTests`) is
in the browser.

**Do this on a machine with a normal web browser (your laptop), NOT in Google
Cloud Shell.** `clasp login` now uses a **localhost browser callback** — Google
**deprecated the old copy-paste (out-of-band) flow**, so `clasp login
--no-localhost` fails with "request is invalid". A laptop shell has the browser
callback; a headless Cloud Shell does not (see the Cloud Shell fallback below).

Install the two tools if you don't have them:

- **Node.js LTS** (gives you `node` / `npm` / `npx`) — <https://nodejs.org> or
  `winget install --id OpenJS.NodeJS.LTS -e` on Windows. **Reopen your terminal
  after installing** or `npm`/`npx` stay "command not found".
- **Git** — <https://git-scm.com> (on Windows this also gives you **Git Bash**,
  the shell to run these commands in — `push-env.sh` needs bash).

Then, in a **writable** folder (NOT your bare home dir if it errors "Permission
denied" — use e.g. `cd ~/Documents && mkdir -p dev && cd dev`):

```bash
git clone <this repo> && cd team-tools
npm install                     # dev deps (jsdom for tests) + enables npm run push:*
```

Two clasp one-time steps:

1. **Enable the Apps Script API** for your Google account (once, ever):
   <https://script.google.com/home/usersettings> → turn ON "Google Apps Script
   API". Without it, `clasp push` fails with a 403.
2. **Authenticate as the DEPLOYER account** (the one with edit access to the
   real + copy sheets; the web app runs *as* this account):
   ```bash
   npx --yes @google/clasp@2.4.2 login
   ```
   This opens your browser → approve → the localhost callback stores the token
   in `~/.clasprc.json`. **Do NOT add `--no-localhost`** — that OOB flow is dead.

You do **not** need a global `clasp` install: `npm run push:dev` / `push:prod`
run a **pinned** clasp via `npx` (`scripts/push-env.sh`; override with `CLASP=…`).
The first push in a fresh shell downloads clasp once, then it is cached.

**Cloud Shell fallback (only if you must push from Cloud Shell):** since the OOB
flow is dead, you can't `clasp login` there directly. Log in on your **laptop
first** with the SAME pinned version (`npx --yes @google/clasp@2.4.2 login`),
then copy the resulting `~/.clasprc.json` up to Cloud Shell (it's just the OAuth
token). Version must match — a `.clasprc.json` from clasp 3.x has a different
shape and `login --status` will error "Cannot read properties of undefined
(reading 'access_token')" when read by 2.4.2. `$HOME` in Cloud Shell persists
across sessions (idle ~120 days is recycled — just re-clone + `npm install` +
re-copy the creds; nothing is lost, it's all in git or Google).

## One-time dev setup (~30–45 min, only you can do this)

1. **Create the dev Apps Script project.** Easiest: in the Apps Script editor of the
   current (prod) project → Project Settings → copy the setup, or `clasp create`
   a new standalone project. Copy its **Script ID**.
2. **Point clasp at it locally:**
   ```bash
   cp web-app/.clasp.dev.json.example web-app/.clasp.dev.json
   # edit web-app/.clasp.dev.json → paste your dev Script ID
   npm run push:dev          # pushes the source to the dev project
   ```
   `.clasp.dev.json` is gitignored; `push:dev` swaps it in, pushes, and restores
   the committed prod `.clasp.json` so a bare `clasp push` still targets prod.
3. **Copy the operational (non-PHI) sheets in Google Drive** (File → Make a copy):
   - **ADP spreadsheet** → this is your dev roster/timesheet store. (KB is PHI-free
     too — copy it if you want populated Reference content.)
   - **Do NOT copy the PHI stores** (Intake, Forms, per-rep Notes, HR Docs). They
     start **empty** — you generate test PHI by *using* dev.
4. **Set the dev project's Script Properties** (Apps Script editor → Project
   Settings → Script Properties). Point every store + recipient at dev/you:
   - `INSTANCE_LABEL` = `DEV`  ← shows the DEV banner in the app
   - Sheet IDs: `ADP_SS_ID` (the copy), `KB_SS_ID` (copy, optional). Leave
     `INTAKE_SS_ID` / `FORMS_SS_ID` / `HR_DOCS_SS_ID` pointed at **fresh empty**
     spreadsheets (create blank ones), never the real PHI sheets.
   - Recipients → **your inbox**: `MANAGER_EMAILS`, `ADMIN_EMAILS`,
     `CN_DEPARTMENT_EMAILS`, `INTAKE_SALES_EMAIL`, `INTAKE_SLEEP_EMAIL`,
     `INTAKE_BCC_EMAIL`, `INTAKE_ALL_AGENTS_EMAIL`, `SPANISH_INBOX_MEMBERS`.
   - `CDR_SS_ID`: the CDR report is read-only (owned by another repo). Point at a
     copy, or the same sheet (read-only), or leave unset (Metrics degrades cleanly).
5. **Make the dev roster safe.** After copying the ADP sheet, run once from the dev
   editor: `devScrubRoster_('you@yourdomain.com')` (from `DevTools.js`). It replaces
   every employee email except yours with a `@example.invalid` alias and blanks
   column L, so dev's per-employee emails can never reach a real colleague and no
   dev rep points at a real per-rep Sheet. Then `devShowConfig_()` prints the dev
   config so you can confirm nothing points at prod.
6. **Deploy the dev project** as a Web App: Deploy → New deployment → Web app →
   Execute as **Me**, Who has access **Only myself**. Grab the **`/dev`** (Test
   deployment / HEAD) URL and bookmark it. Every future `npm run push:dev` is live
   there instantly — no re-deploy.
7. *(Optional)* Install triggers in dev (`installAutomationTriggers` from the dev
   editor) if you want to test digests — they'll email only you.

---

## Daily loop

- **Develop:** `npm run push:dev` → refresh your bookmarked `/dev` URL. Fully
  functional — emails send (to you), notes/intake write (to dev copies). Nothing
  reaches the team.
- **Run the full test suite on dev**, never prod: `runAllTests()` from the dev
  editor. (On prod it now refuses — see the guard below.)

## Promote to prod

1. Merge the validated branch → `main` (green CI: `npm test`).
2. `npm run push:prod` (pushes source to the prod scriptId).
3. Apps Script editor (prod) → Deploy → Manage deployments → Edit → Version:
   **New version** → Deploy. The team picks it up on next load.
4. If anything's wrong: re-point that deployment to the **previous** version → Deploy
   (instant rollback).

---

## The instance guards (code-side, already built)

Two optional Script Properties tag an instance. **Both unset = the prod default =
zero behavior change**, so prod is unaffected until you set them.

- **`INSTANCE_LABEL`** (e.g. `DEV`) — renders a strong top **banner** in the app so
  you can never confuse the isolated dev tab with the team's live one. Unset on prod.
- **`INSTANCE_IS_PROD` = `true`** — set this on the **prod** project. It makes the
  destructive `TEST_`-row writers (`runAllTests` / `setupTestEnvironment`) **refuse**
  to run, so you can never seed test rows into live payroll/PHI. (`runSmokeTests`,
  pure logic, still runs anywhere.)
- **Dev-only tooling** (`devScrubRoster_`, `devShowConfig_` in `DevTools.js`) is
  guarded by `assertDevInstance_` — it runs ONLY when `INSTANCE_LABEL` is set and
  `INSTANCE_IS_PROD` is not — so a mutating dev helper can never touch the live
  roster even though the file deploys to both projects.

Recommended property matrix:

| Property | Prod | Dev |
|---|---|---|
| `INSTANCE_LABEL` | *(unset)* | `DEV` |
| `INSTANCE_IS_PROD` | `true` | *(unset)* |

---

## PHI / safety notes

- **Never copy real patient data into dev.** PHI stores (Intake/Forms/Notes/HR)
  start empty; generate test PHI by using dev. This keeps a clean HIPAA separation.
- The web app runs **as the deployer**. Deploy both projects from the same Google
  account so each has OAuth to its own sheets. Redeploying prod as a *different*
  account silently fails until the real sheets are re-shared (see CLAUDE.md).
- Dev email is **not sandboxed** — it truly sends, to whatever dev is configured to
  email. The isolation is that dev's recipients are all *you*. Double-check with
  `devShowConfig_()` before your first send.
