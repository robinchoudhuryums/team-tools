#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// split-manifest.mjs — regenerate test/client/server-split-manifest.json.
//
// The manifest is the F2 split's move-only proof: one canonical hash per
// top-level server declaration, and a pin (F2c) that recomputes them from the
// tree. That proof is worth keeping AFTER the split, which means every later
// server edit has to land in the manifest too — otherwise the pin goes red on
// legitimate work and the only way forward is to stop believing it.
//
// So the manifest becomes a LEDGER rather than a snapshot: this script rewrites
// the hashes and APPENDS a revision recording exactly which declarations moved,
// changed or appeared. The git diff of that revision entry is the review
// artifact — "move-only" still means something, it just means it per revision.
//
//   node scripts/split-manifest.mjs --why "<one line>"   rewrite + record
//   node scripts/split-manifest.mjs --check              report drift, write nothing
//
// The declaration parse comes from test/client/harness.js (serverDecls), the
// SAME function the F2c pin uses — a second implementation of this
// canonicalization is what produced 43 spurious mismatches while F2 was built.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'test/client/server-split-manifest.json');
const { serverDecls, serverFiles } = createRequire(import.meta.url)('../test/client/harness.js');

const args = process.argv.slice(2);
const check = args.includes('--check');
const whyAt = args.indexOf('--why');
const why = whyAt >= 0 ? args[whyAt + 1] : '';

const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const { decls, dupes } = serverDecls();
if (dupes.length) {
  console.error('refusing: duplicate top-level name(s) across server files: ' + dupes.join(', '));
  process.exit(1);
}

const added = [...decls.keys()].filter((n) => !man.units[n]).sort();
const removed = Object.keys(man.units).filter((n) => !decls.has(n)).sort();
const changed = Object.keys(man.units)
  .filter((n) => decls.has(n) && decls.get(n).sha !== man.units[n].sha).sort();
const moved = Object.keys(man.units)
  .filter((n) => decls.has(n) && decls.get(n).file !== man.units[n].file).sort();

const drift = added.length + removed.length + changed.length + moved.length;
const say = (label, list) => { if (list.length) console.log(label + ' (' + list.length + '): ' + list.join(', ')); };
say('added', added); say('removed', removed); say('changed', changed); say('moved', moved);

if (!drift) { console.log('manifest is current — ' + decls.size + ' declarations, no drift.'); process.exit(0); }
if (check) { console.error('\nmanifest is STALE. Rerun with --why "<what changed and why>".'); process.exit(1); }
if (!why) {
  console.error('\nrefusing to rewrite without --why "<one line>" — the revision note IS the review artifact.');
  process.exit(1);
}

const units = {};
// Field order matches the original manifest ({file, kind, sha}) so a
// regeneration's diff is the REAL change and not a reshuffle of every line.
[...decls.keys()].sort().forEach((n) => {
  const d = decls.get(n);
  units[n] = { file: d.file, kind: d.kind, sha: d.sha };
});
const out = {
  generatedFrom: man.generatedFrom,
  regeneratedBy: 'scripts/split-manifest.mjs',
  revisions: (man.revisions || []).concat([{
    date: new Date().toISOString().slice(0, 10),
    why: why,
    added: added, removed: removed, changed: changed, moved: moved,
  }]),
  order: serverFiles(),
  units: units,
};
fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 1) + '\n');
console.log('\nrewrote ' + path.relative(ROOT, MANIFEST) + ' — ' + decls.size + ' declarations.');
