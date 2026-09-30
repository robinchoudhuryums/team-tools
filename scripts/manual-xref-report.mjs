#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// manual-xref-report.mjs — which manual cross-references would preview the
// target's OPENING rather than the part the link is about (Batch M5a).
//
// A preview focuses on the row a link's text names, or the block of the target
// that clearly matches the link's own row / item / paragraph / callout; when
// neither holds it shows the section's opening, exactly as before M5a. That is
// BY DESIGN for a link with its own heading anchor (the author chose the
// place) and for a target with fewer than two numbered sub-sections (there is
// no heading to point at). The WARNING counts only the rest — links an anchor
// in the manual source could focus — and `--list` names each with the
// sub-section whose words best match the link, as a SUGGESTION to check: that
// match is too loose to show a rep unasked (measured 2026-09-30: roughly six
// in ten right), which is exactly why a person decides it here.
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
      'kbBestBlock_', 'kbNamedRow_', 'kbXrefFocus_', 'kbMdLinkContexts_'].map(fn)].join('\n'), ctx);
  return ctx;
}

const NUMBERED = /^(?:\d+|[A-Z])\.[0-9A-Za-z]+(?:\.\d+)*$/;
/** Pure — a section's TOP-LEVEL numbered sub-sections, each with all of its
 *  words (deeper sub-sections included): [{num, title, text}]. */
export function subSections(k, md) {
  const heads = [];
  String(md || '').split('\n').forEach((ln) => {
    const h = ln.match(/^(#{1,6})\s+(\S+)\s*(.*)$/);
    if (h && NUMBERED.test(h[2])) heads.push({ lvl: h[1].length, num: h[2], title: h[3] });
  });
  if (!heads.length) return [];
  const top = Math.min(...heads.map((h) => h.lvl));
  return heads.filter((h) => h.lvl === top).map((h) => ({
    num: h.num, title: h.title, label: h.num + ' ' + h.title,
    text: h.title + ' ' + k.kbMdPlain_(k.kbManualExcerpt_(md, h.num, Infinity).md),
  }));
}

/** Pure — the report over a manual bundle's articles. */
export function report(k, articles) {
  const byId = {};
  articles.forEach((a) => { byId[a.Id || a.id] = a; });
  const out = { links: 0, unanchored: 0, focused: 0, opening: 0, byDesign: 0, missing: 0, warnings: [] };
  articles.forEach((a) => {
    k.kbMdLinkContexts_(a.BodyMd || a.bodyMd || '').forEach((l) => {
      out.links++;
      const t = byId[l.id];
      if (!t) { out.missing++; return; }
      const md = t.BodyMd || t.bodyMd || '';
      if (k.kbXrefFocus_(md, l.anchor, l.ctx, l.text)) { out.focused++; return; }
      out.opening++;
      if (!l.anchor) out.unanchored++;
      const subs = subSections(k, md);
      // By design: the author anchored it, or there is no heading to point at.
      if (l.anchor || subs.length < 2 || k.kbManualBlocks_(md).length < 2) { out.byDesign++; return; }
      const hit = k.kbBestBlock_(subs, k.kbCtxTokens_(l.ctx));
      out.warnings.push({ from: a.Id || a.id, to: l.id, text: l.text, ctx: String(l.ctx).replace(/\s+/g, ' ').trim().slice(0, 90),
        suggest: hit ? hit.block.label : '' });
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
    ' · show the opening: ' + r.opening + ' (' + r.byDesign + ' by design — anchored, or no sub-section to point at)' +
    (r.missing ? ' · target not in the bundle: ' + r.missing : ''));
  if (r.warnings.length) {
    console.log('WARNING: ' + r.warnings.length + ' link' + (r.warnings.length === 1 ? '' : 's') +
      ' preview the opening of a section with numbered sub-sections — pointing ' + (r.warnings.length === 1 ? 'it' : 'each') +
      ' at one in the manual source would focus ' + (r.warnings.length === 1 ? 'it' : 'them') +
      (LIST ? ' (the suggestion is the closest match by words — check it; it is not applied):' : ' (node scripts/manual-xref-report.mjs --list names them, each with a suggested sub-section).'));
    if (LIST) r.warnings.forEach((w) => console.log('  ' + w.from + ' → ' + w.to + '  “' + w.text + '”  ' +
      (w.ctx ? '[' + w.ctx + ']' : '[no context — the link stands alone]') + (w.suggest ? '  → suggest ' + w.suggest : '  → no clear sub-section')));
  }
}
