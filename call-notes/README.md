# UMS Call Notes

Google Workspace Add-on that augments each rep's call-template Google
Sheet with department-targeted email composers. Surfaces dual UX:

- **Custom menu** under `Extensions → Call Notes` (legacy UX so reps
  don't have to relearn anything)
- **Sidebar card** in the Workspace Add-on panel (newer UX; install-
  once via internal Marketplace listing)

Both surfaces dispatch to the same underlying handlers in `Code.js`.

## Status

**Scaffold only.** The handler bodies (`composeForDept_`,
`readNoteTemplate_`, `promptForExtraDetails_`, `formatEmail*_`,
`lookupHcpcs_`) are stubs that demonstrate the intended shape — the
real logic comes in via porting the existing call-template Apps
Script project. Once the legacy code is pasted into this directory,
the handler bodies get filled in to match production behavior.

## One-time setup

The `.clasp.json` in this directory has `"scriptId":
"REPLACE_ME_AFTER_CLASP_CREATE"` because the Apps Script project
doesn't exist yet. Two ways to create it:

### Option 1: `clasp create` (recommended)

```bash
cd call-notes
clasp create --type standalone --title "UMS Call Notes"
# This OVERWRITES .clasp.json with the real scriptId. Commit the result.
clasp push -f
```

### Option 2: Apps Script editor

1. https://script.google.com → New project → rename to "UMS Call Notes"
2. Copy the script ID from `File → Project Properties` (or the URL)
3. Replace `REPLACE_ME_AFTER_CLASP_CREATE` in `call-notes/.clasp.json`
4. `cd call-notes && clasp push -f`

## Script Properties to set

In Apps Script editor → Project Settings → Script Properties:

- `HCPCS_REF_SS_ID` → spreadsheet ID of the reference sheet that holds
  HCPCS codes + out-of-pocket costs. Without it, the HCPCS lookup
  falls back to the inert placeholder in `CN_CONFIG` and fails on
  first open.

Add any additional Script Properties (per-department override
addresses, etc.) as the port surfaces more configuration.

## Internal Marketplace deployment

After `clasp push -f` works:

1. Apps Script editor → Deploy → Test deployments → Install for self
   (sanity-check the menu and sidebar appear)
2. Apps Script editor → Deploy → New deployment → "Add-on" type
3. Cloud Console → APIs & Services → Workspace Marketplace SDK →
   App Configuration → fill in the listing (private/internal)
4. Marketplace Store listing → publish to your Workspace domain
5. Reps install once via the Marketplace internal listing; the menu
   and sidebar then appear in every Google Sheet they open

See https://developers.google.com/workspace/marketplace/how-to-publish
for the full publishing flow.

## Local development

`clasp push -f` deploys the local copy to the Apps Script project.
There's no separate web-app deployment for this project — it runs
inside whatever spreadsheet the user has open.

To test against a real spreadsheet without going through Marketplace:

1. Open a test spreadsheet
2. `Extensions → Apps Script` → set the project's `Run` deployment
   to install for current user
3. Reload the spreadsheet → the "Call Notes" menu should appear
