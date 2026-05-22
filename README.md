# Team Tools

Internal tooling for the UMS CSR team. Each tool is a separate Apps
Script project synced via [clasp](https://github.com/google/clasp).

## Projects

- **web-app/** — Multi-module browser app deployed at one Web App URL.
  Hosts two modules today, registered side-by-side in the `TOOLS`
  registry in `script_core.html`:
  - **Time Clock** — cross-timezone time tracking, PTO requests,
    manager dashboard, ADP-format export.
  - **Call Notes** — rolling-note panel for CSR call logging. Each
    rep writes to their own per-rep Google Sheet; Ctrl/⌘+Enter saves
    and auto-copies a CRM-friendly serialization. Department emails
    are a separate two-stage flow with preview gate. Three flag
    types (action / training / review) with EOD reminders for
    unresolved action flags and weekly manager digests.

  Adding a new module: append an entry to `TOOLS` in
  `script_core.html`, drop a partial in `web-app/<tool>/script_*.html`,
  `include()` it from `index.html`, and add server endpoints to
  `Code.js` alongside the existing ones.
- **call-notes/** — Legacy Workspace Add-on scaffold; superseded by
  the Call Notes module inside `web-app/`. Kept on disk for reference
  during the transition. The Add-on path was abandoned because admin
  policy on the org domain blocks Marketplace install without
  ticket-driven allowlisting; the web-app pattern works today with
  zero admin involvement.

## Development

From any project folder: `clasp pull` to sync down, `clasp push -f` to
deploy changes. After `clasp push`, cut a new deployment version in
the Apps Script editor (Deploy → Manage deployments → Edit → Version:
New version) so users see the change on next load.
