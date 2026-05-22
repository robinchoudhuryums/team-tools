# UMS Call Notes (legacy Workspace Add-on scaffold)

> **Superseded.** This directory holds the Workspace Add-on scaffold
> as originally drafted. The Add-on path was abandoned because admin
> policy on the org domain blocks Marketplace install without
> ticket-driven allowlisting. The Call Notes feature is now a module
> inside the existing `web-app/` web app: see `web-app/cn/script_callnotes.html`
> for the view and the marked Call Notes section in `web-app/Code.js`
> for the server endpoints. Files here remain for reference during
> the transition and will be removed once the web-app module is in
> production.

The original description below is preserved for context on what the
Add-on path was meant to do — the feature set ported into the web-app
module is a superset of this scope (adds rolling-stack UX,
flag/resolve workflow, EOD digests, manager queues, search).

---

Google Workspace Add-on that augments each rep's call-template Google
Sheet with department-targeted email composers. Replaces the legacy
"CSR Tools" library (script ID `1DCxq0OPsHtGBBuuHAcFlslxJymO_3fAgmPnWQOh2NirFgkLAKIUm01qd`)
with a single-install Workspace Marketplace deployment — no per-rep
bound-script shim required.

## UX

Dual surfaces, both invoking the same handler functions:

- **Custom menu** at `Extensions → CSR Tools`:
  - `Update Order` — opens the main form (multi-recipient, conditional
    Verified Shipping / Repeat Resupply / Close Order / OOP subforms)
  - `Special → OOP Order` — same form pre-populated for OOP
- **Sidebar card** in the right-side Workspace Add-on panel:
  - "Update Order" button (filled)
  - "Special: OOP Order" button

`onOpen` also auto-navigates to today's column in the current month's
sheet tab (e.g. `JUL '25`) — matching legacy behavior.

## Behavior

- Reads the highlighted 2×7 cell range (callback / caller / relationship
  / patient & TRX / issue / transferred to / resolution)
- Smart "self"-relationship logic prepends the caller's name to the
  patient cell when it's just a TRX number
- Missing-TRX prompt blocks the form open if no digits are detected
- Multi-recipient department selection with "Other" → free-form email(s)
- State sales-tax calc for OOP orders (hardcoded rates per state) with
  address-based state auto-detect
- Sends via `MailApp.sendEmail` from the rep's own account, CC'd to
  `robin.choudhury@universalmedsupply.com`
- OOP sends write a generated resolution summary back to cell (7, 2) of
  the highlighted note

## One-time setup

The `.clasp.json` in this directory has
`"scriptId": "REPLACE_ME_AFTER_CLASP_CREATE"` because the Apps Script
project doesn't exist yet. Two ways to create it:

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

## Script Properties to set (optional)

In Apps Script editor → Project Settings → Script Properties:

- `HCPCS_REF_SS_ID` — forward-looking. Spreadsheet ID of the reference
  sheet that will hold HCPCS codes + out-of-pocket costs. Not wired into
  any active handler yet; preserved for future expansion.

No Script Properties are required for today's flows — department
emails, CC address, and the OOP write-back all use values hardcoded in
`Code.js`. If you want to override the CC recipient or add departments,
edit the `departmentEmails` dict and `CN_CONFIG.CC_EMAIL` directly.

## Internal Marketplace deployment

After `clasp push -f` works:

1. Apps Script editor → Deploy → Test deployments → Install for self
   (sanity-check the menu and sidebar appear in a test sheet)
2. Apps Script editor → Deploy → New deployment → "Add-on" type
3. Cloud Console → APIs & Services → Workspace Marketplace SDK →
   App Configuration → fill in the listing (private/internal)
4. Marketplace Store listing → publish to your Workspace domain
5. Reps install once via the Marketplace internal listing; the menu
   and sidebar then appear in every Google Sheet they open

Once everyone's on the new add-on, the legacy library can be retired.
During pilot, the two coexist without conflict (different menu name,
different sidebar entry).

## What was NOT ported from the legacy library

The legacy library has two flows that are not reachable from its
current `onOpen` menu and have been left out of the port:

- **Close Order (standalone)** — `closeOrderEmail.js`,
  `CloseEmailPreview.html`, `UserInputForm.html`. The Close Order
  reason flow is already available as a subform inside the Update
  Order modal, so the standalone version is redundant.
- **Send Docs Email** — `sendDocsEmail.js` plus 4 HTML files
  (`DocsEmailForm.html`, `FileUploadForm.html`, `DocsEmailTemplate.html`,
  `DocsEmailPreview.html`). Includes a PDF/image attachment flow that
  could be revived later if there's demand.

If either flow needs to come back, the source is preserved in
`call-notes-legacy/` for reference.
