// ─────────────────────────────────────────────────────────────────────────────
// chromium-path.cjs — ONE Chromium resolver for every script in this folder
// (cycle 26 F74).
//
// Each script carried its own copy, and the copies had drifted two ways:
//   · every copy looked for `chromium-<build>/chrome-linux/chrome`, while the
//     Claude Code web container installs `chrome-linux64/` — so in the one
//     place the Visual Audit Stage says Chromium is pre-installed, no script
//     found it and Playwright asked for a download the container cannot make;
//   · `a11y-names.mjs` and `print-check.mjs` did not read CHROMIUM_PATH at all,
//     so the two companion checks a /broad-scan must run had no way through
//     short of editing them.
// The resolution order is unchanged: CHROMIUM_PATH → the newest `chromium-*`
// build under PLAYWRIGHT_BROWSERS_PATH or /opt/pw-browsers → undefined, which
// lets Playwright resolve its own managed download (what CI uses).
//
// CommonJS, like ci-gate.cjs, so the pure harness can `require` and DRIVE it;
// the scripts import it as `import { chromiumPath } from './chromium-path.cjs'`.
// The environment and the two filesystem reads are parameters for that reason.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Newest layout first: Chrome for Testing ships `chrome-linux64/`, older
// Playwright builds `chrome-linux/`.
const CHROME_DIRS = ['chrome-linux64', 'chrome-linux'];
const DEFAULT_ROOT = '/opt/pw-browsers';

function chromiumPath(env, exists, readdir) {
  env = env || process.env;
  exists = exists || fs.existsSync;
  readdir = readdir || fs.readdirSync;
  if (env.CHROMIUM_PATH) return env.CHROMIUM_PATH;
  const roots = [env.PLAYWRIGHT_BROWSERS_PATH, DEFAULT_ROOT].filter(Boolean);
  for (const root of roots) {
    let builds = [];
    try {
      // NUMERIC order: a plain sort puts chromium-999 after chromium-1243.
      builds = readdir(root).filter((d) => /^chromium-\d+$/.test(d))
        .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
    } catch (e) { continue; /* root absent — keep looking */ }
    for (const build of builds) {
      for (const dir of CHROME_DIRS) {
        const exe = path.join(root, build, dir, 'chrome');
        if (exists(exe)) return exe;
      }
    }
  }
  return undefined; // let Playwright resolve its own managed browser
}

module.exports = { chromiumPath, CHROME_DIRS, DEFAULT_ROOT };
