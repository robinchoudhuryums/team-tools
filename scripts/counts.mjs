#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// counts.mjs — derive every number the docs carry, from the tree itself.
//
// Batch C of the post-cycle-19 next-steps plan. The problem it closes is not
// that any one number was wrong; it is that a dozen counts lived in PROSE, so
// each one went stale on its own schedule and a /sync-docs pass could verify
// file paths and Script Properties mechanically while still READING a sentence
// rather than checking it. The visual-scenario count had drifted two high; the
// admin-endpoint count in INV-136 drifted four times before a pin derived it;
// the harness totals were hand-carried through ~40 batch paragraphs.
//
// The rule this encodes is INV-179 applied to documentation: when a number is
// worth writing down, DERIVE it from the thing that defines it.
//
//   node scripts/counts.mjs              table (runs the harnesses)
//   node scripts/counts.mjs --static     table, no subprocesses
//   node scripts/counts.mjs --json       machine-readable
//   node scripts/counts.mjs --block      the CLAUDE.md block text
//   node scripts/counts.mjs --check      compare against CLAUDE.md, exit 1 on drift
//   node scripts/counts.mjs --write      put the derived block into CLAUDE.md
//
// --write exists because the block was "generated — do not hand-edit" with
// nothing that wrote it: every batch that added a pin edited the rows by hand
// and ran --check to see whether it had typed them right (cycle 26 FW3).
//
// RECURSION: --check and the bare form RUN the two Node harnesses. run.js's own
// pin therefore calls this with --static --json; if it ever asked for the
// harness totals it would spawn the harness that is asking.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// The server source comes from the ONE shim the harness owns, which derives its
// file list from `web-app/.clasp.json`'s filePushOrder (Batch F1). These counts
// read the server BY PATH, which is precisely the coupling INV-202 names: split
// Code.js without moving the derivation and `--check` goes red on a drift that
// is not real. Going through serverSource() means the split is invisible here.
const { serverSource } = createRequire(import.meta.url)('../test/client/harness.js');

export const BEGIN = '<!-- COUNTS:BEGIN -->';
export const END = '<!-- COUNTS:END -->';

// Strip block comments and WHOLE-LINE `//` comments only. A naive `//`-to-EOL
// strip eats `https://…` inside string literals and takes the rest of the line
// — including a closing bracket — with it (the cycle-18 F3 lesson, the inverse
// direction of INV-188). Every comment this has to see is a full line.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}

// The balanced body of `function NAME(` … `}` — the shape run.js's own
// extractors use, so a count here and a pin there read the same region.
function fnBody(src, name) {
  const re = new RegExp('function ' + name + '\\s*\\(');
  const m = re.exec(src);
  if (!m) return '';
  const start = src.indexOf('{', m.index + m[0].length - 1);
  let depth = 0;
  for (let k = start; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(start, k + 1);
  }
  return '';
}

// ── Static derivations ──────────────────────────────────────────────────────

/** Visual matrix: one top-level tuple per scenario in shoot.mjs's own list —
 *  the authority CLAUDE.md already names. Comments stripped first: a `[` inside
 *  a prose comment made the naive walk report 103 against a real 102. */
export function visualScenarios() {
  const body = /const SCENARIOS = \[([\s\S]*?)\n\];/.exec(stripComments(read('test/visual/shoot.mjs')));
  if (!body) throw new Error('counts: could not find the SCENARIOS array in shoot.mjs');
  let depth = 0, n = 0;
  for (const ch of body[1]) {
    if (ch === '[') { if (depth === 0) n++; depth++; }
    else if (ch === ']') depth--;
  }
  return n;
}

/** Editor suite: every `_smokeTest(` / `_integrationTest(` registration. This is
 *  the same set `_expectedTestCount_` walks at runtime — that function is the
 *  authority a real run prints, and this is its static twin for the docs. */
export function editorRegistrations() {
  return (stripComments(read('web-app/Tests.js')).match(/^\s*_(?:smokeTest|integrationTest)\(/gm) || []).length;
}

/** Gated server endpoints, by the gate each one applies — the derivation
 *  run.js's F7/F9 pins already use, so INV-136's stated count cannot drift from
 *  what the code enforces (it drifted four times while hand-maintained).
 *
 *  THREE families, not one (F-51, cycle 20). The manager row used to count the
 *  returned `'Manager access required.'` literal alone, so the whole
 *  `assertManagerCaller_` family — the trigger handlers, which THROW instead of
 *  returning — and the whole `canSeeQa_` family were invisible to a figure
 *  captioned "Manager-gated endpoints". A reader narrowing MANAGER_EMAILS was
 *  reading a number that omitted most of what MANAGER_EMAILS actually governs.
 *  `canSeeQa_` gets its OWN row rather than joining the manager one: it admits
 *  `isManager OR email ∈ QA_MEMBERS`, so folding it in would have replaced an
 *  undercount with a wrong claim about who may call. Admin wins over both. */
export function gatedEndpoints() {
  const src = serverSource();
  const out = { admin: [], manager: [], qa: [] };
  const re = /^function ([A-Za-z0-9_]+)\s*\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = fnBody(src.slice(m.index), m[1]);
    if (body.indexOf("'Admin access required.'") >= 0) out.admin.push(m[1]);
    else if (body.indexOf("'Manager access required.'") >= 0 ||
             body.indexOf('assertManagerCaller_(') >= 0) out.manager.push(m[1]);
    else if (body.indexOf("'QA access required.'") >= 0) out.qa.push(m[1]);
  }
  return out;
}

/** Installable triggers the installer creates, and the jobs that ride inside a
 *  dispatcher instead of owning one. Apps Script caps the first at
 *  AUTOMATION_TRIGGER_QUOTA (20) — the cap that threw on the operator. */
export function triggers() {
  const src = serverSource();
  const install = fnBody(src, 'installAutomationTriggers');
  const created = [...new Set([...install.matchAll(/newTrigger\('([^']+)'\)/g)].map((m) => m[1]))];
  const groups = /const TRIGGER_GROUPS = \{([\s\S]*?)\n\};/.exec(src);
  const grouped = groups ? [...new Set([...groups[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]))] : [];
  const quota = /const AUTOMATION_TRIGGER_QUOTA = (\d+)/.exec(src);
  return { created: created.length, grouped: grouped.length, quota: quota ? Number(quota[1]) : null };
}

/** Per-browser localStorage keys. Every one is an `ums…` literal; the count has
 *  been stated in words ("Eighteen client-side localStorage keys") and rewritten
 *  by hand on each add and retirement.
 *
 *  A key FAMILY — a prefix completed at run time, `'umsPopoutGeom_' + tool` —
 *  is one entry, named by its prefix. The whole-literal pattern could not see
 *  it (the quote does not follow the underscore's word), so the per-tool
 *  pop-out geometry was counted only by its legacy fallback key (cycle 26
 *  F71). A prefix counts only where some file hands it to localStorage: the
 *  pop-out's WINDOW name is the same shape and is not a key. */
export function localStorageKeys() {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.html')) files.push(rel);
    }
  };
  walk('web-app');
  const keys = new Set();
  const srcs = files.map(read);
  for (const src of srcs) for (const m of src.matchAll(/'(ums[A-Za-z0-9]+)'/g)) keys.add(m[1]);
  const prefixes = new Set();
  for (const src of srcs) for (const m of src.matchAll(/'(ums[A-Za-z0-9]+[_:])'\s*\+/g)) prefixes.add(m[1]);
  for (const pre of prefixes) {
    const stored = new RegExp('localStorage\\.(?:getItem|setItem|removeItem)\\(\\s*\'' + pre + '\'\\s*\\+');
    const viaKey = new RegExp('\\b(\\w+)\\s*=\\s*\'' + pre + '\'\\s*\\+[^\\n]*;[\\s\\S]{0,400}?localStorage\\.(?:getItem|setItem|removeItem)\\(\\s*\\1\\b');
    if (srcs.some((src) => stored.test(src) || viaKey.test(src))) keys.add(pre + '…');
  }
  return [...keys].sort();
}

/** The two libraries whose sizes the prose quotes. They live in
 *  `.cycle/config.md` since Batch D1; CLAUDE.md is the fallback so this keeps
 *  working in both directions while the move lands (the same prefer-then-fall-back
 *  shape `scripts/cycle-context.mjs` already uses). INV-202: a derivation that
 *  reads a file BY PATH is coupled to that file's layout — when the content
 *  moves, the derivation moves with it IN THE SAME COMMIT. */
export const LIBRARY_DOC = '.cycle/config.md';
export function libraryFile() {
  return fs.existsSync(path.join(ROOT, LIBRARY_DOC)) ? LIBRARY_DOC : 'CLAUDE.md';
}
export function docLists() {
  const doc = read(libraryFile());
  return {
    invariants: (doc.match(/^INV-\d+\s*\|/gm) || []).length,
    regressionScenarios: (doc.match(/^S\d+\s*\|/gm) || []).length,
  };
}

// ── Executed derivations ────────────────────────────────────────────────────
// A static count CANNOT equal either harness's total: some tests are registered
// inside loops, so 762 call sites in run.js produce 804 runs. The run is the
// only authority, so we ask it.
const NO_SPAWN = 'COUNTS_NO_SPAWN';

// An expected, explainable failure: the CLI prints its message and exits 1
// with no stack trace. An UNEXPECTED throw still gets the full trace, which
// is the right split — a bug here should be loud, a red harness should not.
export class CountsError extends Error {}

function harnessTotal(rel) {
  // One of the harnesses we spawn (run.js) calls THIS script back, so the
  // spawn is a cycle waiting for a missing --static. Left unguarded it does
  // not fail, it HANGS — in CI that burns the job's whole timeout and reports
  // nothing. The child carries a sentinel; seeing it means we are already
  // inside a harness, and the cycle becomes an immediate, legible error.
  if (process.env[NO_SPAWN]) {
    throw new CountsError(
      'refusing to run ' + rel + ' from inside a harness run — this is the ' +
      'counts.mjs ⇄ harness cycle. The caller must pass --static (run.js does).');
  }
  // A RED harness exits non-zero, so execFileSync THROWS before the summary
  // check below can ever run — and the Error it throws carries the child's
  // whole stdout in `.message`, which is a ~70k-character wall on top of a
  // stack trace for what is really a one-line fact ("the harness is red").
  // Catch it, read the summary out of the captured output, and say that.
  let out;
  try {
    // DOM_ONLY (the DOM harness's bite-check subset) is CLEARED: a count taken
    // from a subset would be a smaller number that looks like the harness's.
    const env = Object.assign({}, process.env, { [NO_SPAWN]: '1' });
    delete env.DOM_ONLY;
    out = execFileSync(process.execPath, [path.join(ROOT, rel)], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
  } catch (e) {
    const captured = String(e && e.stdout || '');
    const sum = /(\d+) passed, (\d+) failed/.exec(captured);
    if (sum && Number(sum[2]) > 0) {
      // Name what failed: a red that does not reproduce (it happened once in CI,
      // 2026-11-02) is untraceable from "1 failing" alone.
      const failed = captured.split('\n').filter((l) => /^\s*✗/.test(l)).slice(0, 10)
        .map((l) => '    ' + l.trim().slice(0, 240));
      throw new CountsError(
        rel + ' is RED (' + sum[2] + ' failing of ' + (Number(sum[1]) + Number(sum[2])) + ') — the harness is ' +
        'red, fix that first. The counts cannot be trusted while it is.\n' +
        (failed.length ? '  Failing:\n' + failed.join('\n') + '\n' : '') +
        '  Run: node ' + rel);
    }
    throw new CountsError(
      'could not run ' + rel + ' (' + (e && e.status != null ? 'exit ' + e.status : String(e && e.code || e)) + ').\n' +
      '  Run: node ' + rel);
  }
  const m = /(\d+) passed, (\d+) failed/.exec(out);
  if (!m) throw new CountsError(rel + ' printed no summary line');
  if (Number(m[2]) !== 0) throw new CountsError(rel + ' reported ' + m[2] + ' failing — fix the suite before trusting its total');
  return Number(m[1]);
}

export function derive({ withHarness = true } = {}) {
  const gated = gatedEndpoints();
  const trig = triggers();
  const lists = docLists();
  return {
    pureTests: withHarness ? harnessTotal('test/client/run.js') : null,
    domTests: withHarness ? harnessTotal('test/client/dom/runDom.js') : null,
    visualScenarios: visualScenarios(),
    editorRegistrations: editorRegistrations(),
    adminEndpoints: gated.admin.length,
    managerEndpoints: gated.manager.length,
    qaEndpoints: gated.qa.length,
    installedTriggers: trig.created,
    groupedTriggerJobs: trig.grouped,
    triggerQuota: trig.quota,
    localStorageKeys: localStorageKeys().length,
    invariants: lists.invariants,
    regressionScenarios: lists.regressionScenarios,
  };
}

// ── The CLAUDE.md block ─────────────────────────────────────────────────────

const ROWS = [
  ['pureTests', 'Pure harness tests', '`node test/client/run.js`'],
  ['domTests', 'DOM harness tests', '`node test/client/dom/runDom.js`'],
  ['visualScenarios', 'Visual matrix scenarios', "`shoot.mjs`'s `SCENARIOS`"],
  ['editorRegistrations', 'Editor suite registrations', "`Tests.js`; a run prints its own `Expected:` line"],
  ['adminEndpoints', 'Admin-tier endpoints (INV-136)', "`'Admin access required.'` in the server source"],
  ['managerEndpoints', 'Manager-gated endpoints', "`'Manager access required.'` or `assertManagerCaller_` in the server source"],
  ['qaEndpoints', 'QA-gated endpoints (`canSeeQa_`)', "`'QA access required.'` in the server source"],
  ['installedTriggers', 'Installable triggers created', '`installAutomationTriggers`'],
  ['groupedTriggerJobs', 'Jobs riding a dispatcher', '`TRIGGER_GROUPS`'],
  ['localStorageKeys', 'localStorage keys', "`ums…` literals in `web-app/` (a per-tool key family counts once)"],
  ['invariants', 'Invariant library entries', '`.cycle/config.md`'],
  ['regressionScenarios', 'Regression scenarios (S*)', '`.cycle/config.md`'],
];

export function renderBlock(c) {
  const lines = [
    BEGIN,
    '<!-- GENERATED by scripts/counts.mjs — do not hand-edit; run `node scripts/counts.mjs --check`. -->',
    '',
    '| Count | Value | Derived from |',
    '|---|---|---|',
  ];
  for (const [key, label, from] of ROWS) {
    const v = c[key];
    lines.push('| ' + label + ' | ' + (v == null ? '—' : String(v)) + ' | ' + from + ' |');
  }
  lines.push('');
  lines.push('Every figure above is DERIVED. Do not restate one in prose — a second');
  lines.push('copy is a second source of truth, and each of these has drifted at least');
  lines.push('once while it was hand-carried. Cite the block or the command instead.');
  lines.push(END);
  return lines.join('\n');
}

export function blockIn(claude) {
  const i = claude.indexOf(BEGIN);
  const j = claude.indexOf(END);
  if (i < 0 || j < 0) return null;
  return claude.slice(i, j + END.length);
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/** --write. In TWO steps, because the harness that supplies two of the rows
 *  holds pins that compare the block's OTHER rows with the tree: while those
 *  rows are stale the harness is red, and a red harness has no totals to give.
 *  So the rows that need no harness are written first (the harness totals kept
 *  as they were), then the harness is run and the two totals written. A harness
 *  that is red for any other reason still refuses — with the static rows
 *  already brought up to date. */
function writeBlock() {
  const file = path.join(ROOT, 'CLAUDE.md');
  const before = blockIn(read('CLAUDE.md'));
  if (before === null) { console.error('counts --write: CLAUDE.md has no ' + BEGIN + ' … ' + END + ' block.'); process.exit(1); }
  const kept = (label) => { const m = new RegExp('\\| ' + label + ' \\| (\\d+) \\|').exec(before); return m ? Number(m[1]) : null; };
  const put = (want) => { const claude = read('CLAUDE.md'); const have = blockIn(claude); if (have !== want) fs.writeFileSync(file, claude.replace(have, () => want)); };
  put(renderBlock(Object.assign(derive({ withHarness: false }), { pureTests: kept('Pure harness tests'), domTests: kept('DOM harness tests') })));
  let c;
  try { c = derive({ withHarness: true }); }
  catch (e) {
    if (!(e instanceof CountsError)) throw e;
    console.error('counts --write: the rows that need no harness are written; the two harness totals are not.\ncounts: ' + e.message);
    process.exit(1);
  }
  const after = renderBlock(c);
  put(after);
  if (after === before) { console.log('counts --write: CLAUDE.md already agrees with the tree.'); return; }
  const h = before.split('\n'), w = after.split('\n');
  for (let i = 0; i < Math.max(h.length, w.length); i++) if (h[i] !== w[i]) console.log('  was: ' + (h[i] ?? '(missing)') + '\n  now: ' + (w[i] ?? '(missing)'));
  console.log('counts --write: CLAUDE.md updated.');
}

if (isMain && process.argv.includes('--write')) {
  // The harness totals are part of the block, so a --static write would
  // blank two rows: refuse rather than write a block --check then rejects.
  if (process.argv.includes('--static')) { console.error('counts --write: needs the harness totals — drop --static.'); process.exit(1); }
  try { writeBlock(); }
  catch (e) { if (!(e instanceof CountsError)) throw e; console.error('counts: ' + e.message); process.exit(1); }
} else if (isMain) {
  const argv = process.argv.slice(2);
  const withHarness = !argv.includes('--static');
  let c;
  try {
    c = derive({ withHarness });
  } catch (e) {
    if (!(e instanceof CountsError)) throw e;
    console.error('counts: ' + e.message);
    process.exit(1);
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify(c, null, 2));
  } else if (argv.includes('--block')) {
    console.log(renderBlock(c));
  } else if (argv.includes('--check')) {
    const claude = read('CLAUDE.md');
    const have = blockIn(claude);
    const want = renderBlock(c);
    if (have === null) {
      console.error('counts --check: CLAUDE.md has no ' + BEGIN + ' … ' + END + ' block.');
      process.exit(1);
    }
    if (have !== want) {
      console.error('counts --check: the CLAUDE.md block is out of date.\n');
      const h = have.split('\n'), w = want.split('\n');
      for (let i = 0; i < Math.max(h.length, w.length); i++) {
        if (h[i] !== w[i]) console.error('  doc:  ' + (h[i] ?? '(missing)') + '\n  tree: ' + (w[i] ?? '(missing)'));
      }
      console.error('\nRegenerate with: node scripts/counts.mjs --write');
      process.exit(1);
    }
    console.log('counts --check: CLAUDE.md agrees with the tree.');
  } else {
    for (const [key, label] of ROWS) {
      const v = c[key];
      console.log(label.padEnd(34) + (v == null ? '— (skipped: --static)' : String(v)));
    }
    if (!withHarness) console.log('\n(--static: the two harness totals need a run; drop --static for them.)');
  }
}
