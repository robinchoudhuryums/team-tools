#!/usr/bin/env node
// handbook-push.mjs — check, then push handbook-app/ to ITS Apps Script project.
//
//   npm run handbook:push              check the derived copy, then push
//   npm run handbook:push -- --dry-run say which project and which clasp, push nothing
//
// Cycle 26 F57. Two things were wrong with `… && cd handbook-app && clasp push -f`:
//
//  1. The committed handbook-app/.clasp.json carries a PLACEHOLDER script id
//     (the real one is the operator's — a script id is not a secret, but this
//     one was never committed), so the deployed app could only be pushed from a
//     hand-edited, uncommitted file that the next checkout or pull puts back.
//     The id now comes from, in order:
//       - the HANDBOOK_SCRIPT_ID environment variable;
//       - handbook-app/.clasp.local.json — {"scriptId": "…"}, gitignored;
//       - the committed .clasp.json, once somebody commits the real id there.
//     While none gives one, the push REFUSES and says where to put it — it used
//     to hand the placeholder to clasp, which fails with an unrelated message.
//     When the id is not the committed one it is written into .clasp.json for
//     the push only, and the committed file is put back afterwards, pushed or
//     not (the web-app/ dev push does the same — scripts/push-env.sh).
//
//  2. It ran whatever `clasp` was on the PATH. Team Tools pushes with a pinned
//     clasp through npx; this does too, the SAME version (a pin holds the two
//     equal), with the same override: CLASP=clasp npm run handbook:push.
//
// Everything else in .clasp.json (rootDir, filePushOrder — load order matters)
// is the committed file's, whichever id is used.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CLASP_DEFAULT = 'npx --yes @google/clasp@2.4.2';
export const PLACEHOLDER_RE = /^SET-ME/i;
const ID_RE = /^[A-Za-z0-9_-]{20,}$/;

/** PURE — which script id to push to: { id, from } or { error }. */
export function resolveScriptId({ env, local, committed }) {
  const pick = [['the HANDBOOK_SCRIPT_ID environment variable', env], ['handbook-app/.clasp.local.json', local], ['the committed handbook-app/.clasp.json', committed]]
    .map(([from, v]) => [from, String(v == null ? '' : v).trim()])
    .filter(([, v]) => v && !PLACEHOLDER_RE.test(v))[0];
  if (!pick) {
    return { error: 'No script id for the handbook app. The committed handbook-app/.clasp.json holds a placeholder.\n' +
      '  Put the real id (Apps Script editor → Project Settings → Script ID) in ONE of:\n' +
      '    - handbook-app/.clasp.local.json   as {"scriptId": "…"}   (gitignored — it stays on this machine)\n' +
      '    - the HANDBOOK_SCRIPT_ID environment variable\n' +
      '    - handbook-app/.clasp.json itself, committed (see docs/operator-state.md, the handbook app)' };
  }
  if (!ID_RE.test(pick[1])) return { error: 'The script id from ' + pick[0] + ' does not look like one: "' + pick[1] + '".' };
  return { id: pick[1], from: pick[0] };
}

function main(argv) {
  const dry = argv.includes('--dry-run');
  const at = argv.indexOf('--app');
  const app = at >= 0 && argv[at + 1] ? resolve(argv[at + 1]) : join(ROOT, 'handbook-app');
  const file = join(app, '.clasp.json');
  if (!existsSync(file)) { console.error('handbook-push: ' + file + ' is missing.'); return 2; }
  const original = readFileSync(file, 'utf8');
  let committed, local = '';
  try { committed = JSON.parse(original); } catch (e) { console.error('handbook-push: ' + file + ' is not JSON: ' + e.message); return 2; }
  const localFile = join(app, '.clasp.local.json');
  if (existsSync(localFile)) {
    try { local = (JSON.parse(readFileSync(localFile, 'utf8')) || {}).scriptId; }
    catch (e) { console.error('handbook-push: ' + localFile + ' is not JSON: ' + e.message); return 2; }
  }
  const got = resolveScriptId({ env: process.env.HANDBOOK_SCRIPT_ID, local, committed: committed.scriptId });
  if (got.error) { console.error('handbook-push: ' + got.error); return 1; }
  const clasp = String(process.env.CLASP || CLASP_DEFAULT).trim();
  if (dry) {
    console.log('handbook-push (dry run): would push ' + app + ' to script ' + got.id + ' (from ' + got.from + ') with `' + clasp + ' push -f`.');
    return 0;
  }
  const check = spawnSync(process.execPath, [join(ROOT, 'scripts/handbook-sync.mjs'), '--check'], { cwd: ROOT, stdio: 'inherit' });
  if (check.status !== 0) { console.error('handbook-push: the derived copy is stale — run `npm run handbook:sync`, commit, then push.'); return check.status || 1; }
  const swap = committed.scriptId !== got.id;
  let status = 1;
  try {
    if (swap) writeFileSync(file, JSON.stringify(Object.assign({}, committed, { scriptId: got.id }), null, 2) + '\n');
    console.log('→ Pushing the handbook app to script ' + got.id + ' (from ' + got.from + ')…');
    const res = spawnSync(clasp + ' push -f', { cwd: app, stdio: 'inherit', shell: true });
    status = res.status == null ? 1 : res.status;
  } finally {
    if (swap) writeFileSync(file, original);   // the committed file, byte for byte — pushed or not
  }
  if (status === 0) {
    console.log('✓ Pushed. The /exec address still serves the OLD version until you cut a New version');
    console.log('  (Apps Script editor → Deploy → Manage deployments → Edit → Version: New version).');
  } else console.error('handbook-push: clasp exited ' + status + ' — nothing else was changed.');
  return status;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
