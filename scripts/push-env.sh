#!/usr/bin/env bash
# Push web-app/ to the DEV or PROD Apps Script project.
#
#   scripts/push-env.sh dev    → temporarily swap in web-app/.clasp.dev.json,
#                                clasp push -f, then RESTORE the committed
#                                (prod) .clasp.json so muscle-memory pushes and
#                                git never carry the dev scriptId.
#   scripts/push-env.sh prod   → ensure the committed prod .clasp.json, push.
#
# `.clasp.json` stays committed = PROD, so a bare `cd web-app && clasp push -f`
# still targets prod exactly as before. See docs/deployment.md.
set -euo pipefail
env="${1:-}"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root/web-app"

restore_prod() { git -C "$repo_root" checkout -- web-app/.clasp.json 2>/dev/null || true; }

case "$env" in
  dev)
    if [ ! -f .clasp.dev.json ]; then
      echo "ERROR: web-app/.clasp.dev.json is missing." >&2
      echo "  Copy web-app/.clasp.dev.json.example → web-app/.clasp.dev.json and set your dev scriptId." >&2
      exit 1
    fi
    if grep -q "PASTE_YOUR_DEV_SCRIPT_ID_HERE" .clasp.dev.json; then
      echo "ERROR: web-app/.clasp.dev.json still has the placeholder scriptId — paste your real dev scriptId." >&2
      exit 1
    fi
    trap restore_prod EXIT            # restore prod .clasp.json even on failure
    cp .clasp.dev.json .clasp.json
    echo "→ Pushing to DEV project…"
    clasp push -f
    echo "✓ DEV push complete (open the dev project's HEAD /dev URL — it is live now)."
    ;;
  prod)
    restore_prod                      # be certain we target the committed prod scriptId
    echo "→ Pushing to PROD project…"
    clasp push -f
    echo "✓ PROD push complete. Reminder: the /exec URL still serves the OLD version"
    echo "  until you cut a New version (Apps Script editor → Deploy → Manage deployments)."
    ;;
  *)
    echo "usage: scripts/push-env.sh dev|prod" >&2
    exit 1
    ;;
esac
