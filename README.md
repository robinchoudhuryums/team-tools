# Team Tools

Internal tooling for the UMS CSR team.

## Tools

- **time-clock/** — Apps Script web app for cross-timezone time tracking,
  PTO requests, and manager dashboard. Backs an ADP-format Google Sheet.

## Development

Each tool is an Apps Script project synced via [clasp](https://github.com/google/clasp).
From any tool folder: `clasp pull` to sync down, `clasp push` to deploy changes.
