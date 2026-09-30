#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// manual-xref-report.mjs — which manual cross-references would preview the
// target's OPENING rather than the part the link is about (Batch M5a).
//
// A preview focuses on the block of the target that clearly matches the
// link's own row / item / paragraph / callout; when no block clearly wins it
// shows the section's opening, exactly as before M5a. This report lists the
// links that land there WITHOUT a heading anchor — the ones worth an anchor in
// the manual source (`[4.11 FAQ](kb:man-4-11#…)` via a numbered heading).
//
// It runs the APP'S OWN functions, read out of web-app/kb/script_kb.html — the
// scorer the reader uses — so the report cannot disagree with the preview a
// rep sees (one scorer, no Python mirror: g126). WARNINGS only: it never
// fails the export and always exits 0 unless the inputs are unreadable.
//
//   node scripts/manual-xref-report.mjs [manual.json] [--list] [--json]
//
// manual/export_reference.py runs it after writing manual.json.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'manual/dist/reference/manual.json');
const LIST = args.includes('--list');
const JSON_OUT = args.includes('--json');

/** The functions the reader scores with, by name, out of the partial. */
export function loadScorer(src) {
  const fn = (name) => {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) throw new Error('script_kb.html has no ' + name);
    let depth = 0, j = src.indexOf('{', i);
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    return src.slice(i, j + 1);
  };
  const decl = (name) => {
    const i = src.indexOf('var ' + name + ' ');
    if (i < 0) throw new Error('script_kb.html has no ' + name);
    const end = src.indexOf(';\n', i);
    const iife = src.slice(i, end).indexOf('(function') >= 0 ? src.indexOf('})();', i) + 5 : end + 1;
    return src.slice(i, iife);
  };
  const ctx = vm.createContext({});
  vm.runInContext([decl('KB_CTX_MARGIN'), decl('KB_CTX_MIN_SHARED'), decl('KB_CTX_STOP'),
    ...['kbManualExcerpt_', 'kbMdPlain_', 'kbNormText_', 'kbCtxTokens_', 'kbManualBlocks_',
      'kbBestBlock_', 'kbXrefFocus_', 'kbMdLinkContexts_'].map(fn)].join('\n'), ctx);
  return ctx;
}

/** Pure — the report over a manual bundle's articles. */
export function report(k, articles) {
  const byId = {};
  articles.forEach((a) => { byId[a.Id || a.id] = a; });
  const out = { links: 0, unanchored: 0, focused: 0, opening: 0, missing: 0, warnings: [] };
  articles.forEach((a) => {
    k.kbMdLinkContexts_(a.BodyMd || a.bodyMd || '').forEach((l) => {
      out.links++;
      const t = byId[l.id];
      if (!t) { out.missing++; return; }
      const hit = k.kbXrefFocus_(t.BodyMd || t.bodyMd || '', l.anchor, l.ctx);
      if (hit) { out.focused++; return; }
      out.opening++;
      if (l.anchor) return;
      out.unanchored++;
      // A one-block target IS its opening — nothing to anchor.
      if (k.kbManualBlocks_(t.BodyMd || t.bodyMd || '').length < 2) return;
      out.warnings.push({ from: a.Id || a.id, to: l.id, text: l.text, ctx: String(l.ctx).replace(/\s+/g, ' ').trim().slice(0, 90) });
    });
  });
  return out;
}

if (import.meta.url === 'file://' + process.argv[1] || process.argv[1] === fileURLToPath(import.meta.url)) {
  let bundle;
  try { bundle = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error('manual-xref-report: cannot read ' + file + ' (' + e.message + ')'); process.exit(2); }
  const k = loadScorer(fs.readFileSync(path.join(ROOT, 'web-app/kb/script_kb.html'), 'utf8'));
  const r = report(k, bundle.articles || []);
  if (JSON_OUT) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log('Cross-references: ' + r.links + ' · previews focus on the linked part: ' + r.focused +
    ' · show the opening: ' + r.opening + (r.missing ? ' · target not in the bundle: ' + r.missing : ''));
  if (r.warnings.length) {
    console.log('WARNING: ' + r.warnings.length + ' link' + (r.warnings.length === 1 ? '' : 's') +
      ' with no heading anchor preview the opening of a multi-part section — an anchor in the source would focus them' +
      (LIST ? ':' : ' (node scripts/manual-xref-report.mjs --list names them).'));
    if (LIST) r.warnings.forEach((w) => console.log('  ' + w.from + ' → ' + w.to + '  “' + w.text + '”  ' + (w.ctx ? '[' + w.ctx + ']' : '[no context — the link stands alone]')));
  }
}
