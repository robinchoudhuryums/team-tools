# Team Tools

Internal tooling for the UMS CSR team. Each tool is a separate Apps
Script project synced via [clasp](https://github.com/google/clasp).

## Projects

- **web-app/** — Multi-module browser app deployed at one Web App URL.
  Currently hosts the Time Clock module (cross-timezone time tracking,
  PTO requests, manager dashboard, ADP-format export). Additional tool
  modules register a view in the client router (`script_core.html`)
  and their server endpoints alongside the existing ones in `Code.js`.

## Development

From any project folder: `clasp pull` to sync down, `clasp push -f` to
deploy changes. After `clasp push`, cut a new deployment version in
the Apps Script editor (Deploy → Manage deployments → Edit → Version:
New version) so users see the change on next load.
