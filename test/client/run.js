'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Client-side unit tests for the web-app's pure helper functions.
// Run: `node test/client/run.js`  (no dependencies)
//
// Seeds regression coverage for the client layer, which otherwise has none
// (every client fix — F1/F2/F5/F6/F7/F20 — was guarded only by manual scenarios
// because there was no harness). Start with the pure helpers; extend as more
// pure functions are added. DOM-driving / RPC functions stay out of scope.
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { buildSandbox, loadFunction, extractScript, extractRawFunction, extractFunction } = require('./harness');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.message)); }
}

// Parse-guard: every JS-bearing HtmlService partial's <script> block must
// parse. The per-function harness only brace-matches the slices it loads, so a
// syntax error elsewhere in a partial (e.g. a stray token) would otherwise slip
// past CI — this is the cheap net that catches it across the whole client.
console.log('\nclient — all partials parse (<script> syntax guard)');
// Cycle-9 M-10: this list is now tripwired against index.html's include()
// calls (below) — a newly-included JS-bearing partial that isn't added here
// fails CI instead of silently shipping outside the parse net (the class
// that let metrics/script_deptrequests + train/script_coaching fall out of
// every harness list).
const PARSE_GUARD_PARTIALS = [
  'script_core.html', 'script_icons.html', 'metrics/script_metrics.html',
  'metrics/script_deptrequests.html',
  'cn/script_callnotes.html', 'tc/script_clock.html', 'tc/script_timesheet.html',
  'tc/script_timeoff.html', 'tc/script_manager.html', 'index.html', 'form_public.html',
  'intake/script_intake.html',
  'kb/script_kb.html',
  'train/script_training.html',
  'train/script_empdocs.html',
  'train/script_coaching.html',
  'script_tour.html',
];
PARSE_GUARD_PARTIALS.forEach((f) => {
  test(f + ' parses', () => {
    const src = extractScript(f);
    assert.ok(src.trim().length > 0, 'has a <script> block');
    new vm.Script(src, { filename: f });  // throws on a syntax error
  });
});

// Cycle-11 M-4 — ONE derived list for every registry-literal net
// (enterTool / showView / refreshViewIfCurrent). Previously three
// hand-maintained copies (plus the DOM harness's boot.js PARTIALS) that only
// discipline kept in sync — the exact Parallel-Source-Drift genus the suite
// polices in app code, unpoliced inside the suite itself (the cycle-9 M-10
// class could recur for any non-parse-guard list). Deriving from
// PARSE_GUARD_PARTIALS (itself auto-tracked against index.html below) means
// a newly include()'d JS partial joins every net in one step. Exclusions:
// index.html (boot script only — no registry literals), form_public.html
// (standalone page, no shell), script_icons.html (path data only).
const REGISTRY_SCAN_PARTIALS = PARSE_GUARD_PARTIALS.filter((f) =>
  f !== 'index.html' && f !== 'form_public.html' && f !== 'script_icons.html');

// Cycle-9 M-10 — the parse-guard list auto-tracks index.html. Every partial
// include()'d by the shell that carries a <script> block MUST be in
// PARSE_GUARD_PARTIALS; a new module's partial can no longer ship outside
// the net with CI green. (styles/modals have no <script>; form_public.html
// is standalone — not include()'d — and is listed explicitly above.)
test('every JS-bearing include()d partial is in the parse-guard list', () => {
  const idx = fs.readFileSync(path.join(__dirname, '../../web-app/index.html'), 'utf8');
  const included = [...idx.matchAll(/include\('([^']+)'\)/g)].map((m) => m[1] + '.html');
  assert.ok(included.length >= 10, 'index.html include() calls parsed (got ' + included.length + ')');
  included.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    if (!/<script[\s>]/i.test(src)) return;   // style/markup-only partial
    assert.ok(PARSE_GUARD_PARTIALS.indexOf(f) >= 0,
      f + ' is include()d with a <script> block but missing from PARSE_GUARD_PARTIALS (and probably the DOM/M3 lists too)');
  });
});

// Cycle-11 M-4 — the DOM harness's boot.js PARTIALS is the fourth copy of the
// partial list; track it against the derived registry set so a new partial
// can't fall out of the DOM harness silently (the cycle-9 M-10 class).
test('dom/boot.js PARTIALS covers every registry-scan partial', () => {
  const bootSrc = fs.readFileSync(path.join(__dirname, 'dom/boot.js'), 'utf8');
  const listM = bootSrc.match(/const PARTIALS = \[([\s\S]*?)\];/);
  assert.ok(listM, 'boot.js PARTIALS array found');
  const bootList = [...listM[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(bootList.length >= 10, 'boot.js PARTIALS parsed (got ' + bootList.length + ')');
  REGISTRY_SCAN_PARTIALS.forEach((f) => {
    assert.ok(bootList.indexOf(f) >= 0,
      f + ' is in the registry-scan set but missing from dom/boot.js PARTIALS — the DOM harness never loads it');
  });
});

// Design-token hygiene tripwire: every `var(--x)` in the SHARED design-token
// partials must resolve to a custom property defined somewhere in those same
// partials. Catches the `--accent-deep` bug class (an undefined token that
// silently falls back to a flatter shade / its `var(...)` fallback, so dark
// mode never inverts and the intended deeper tone never renders) — it shipped
// undetected precisely because nothing scanned for it.
//   • `form_public.html` is a STANDALONE page with its own complete :root
//     palette (it does NOT include styles_design_tokens.html), so it neither
//     contributes definitions to the shared set nor is checked against it.
//   • TOKEN_ALLOWLIST holds intentional, pending exceptions (each with a
//     literal fallback so it renders correctly until removed).
console.log('\nclient — design-token hygiene (no undefined var(--x) in shared partials)');
test('every var(--token) resolves to a defined custom property', () => {
  const WEB_APP = path.resolve(__dirname, '../../web-app');
  const STANDALONE = new Set(['form_public.html']); // own palette — excluded
  // Pending-removal exceptions. Remove an entry when its module migration lands.
  // (--brand was removed when the Intake redesign dropped the bespoke navy header.)
  const TOKEN_ALLOWLIST = {};
  const htmlFiles = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(abs, r);
      else if (e.name.endsWith('.html')) htmlFiles.push(r);
    }
  })(WEB_APP, '');
  const shared = htmlFiles.filter((f) => !STANDALONE.has(f));
  const defined = new Set();
  const defRe = /(--[a-z0-9-]+)\s*:/gi;
  const srcByFile = {};
  for (const f of shared) {
    const t = fs.readFileSync(path.join(WEB_APP, f), 'utf8');
    srcByFile[f] = t;
    let m; while ((m = defRe.exec(t))) defined.add(m[1]);
  }
  const useRe = /var\(\s*(--[a-z0-9-]+)/gi;
  const violations = [];
  for (const f of shared) {
    let m; while ((m = useRe.exec(srcByFile[f]))) {
      const name = m[1];
      if (defined.has(name)) continue;
      if (Object.prototype.hasOwnProperty.call(TOKEN_ALLOWLIST, name)) continue;
      violations.push(name + '  <-  ' + f);
    }
  }
  assert.strictEqual(
    violations.length, 0,
    'undefined design tokens used in shared partials (define them in ' +
    'styles_design_tokens.html, or fix the name):\n      ' +
    [...new Set(violations)].join('\n      '));
});

// A11y batch G/I (cycle 10) — contrast + flag-color tripwires.
//   • --muted-2 is the app's "secondary text" tone; it must stay AA-readable
//     (≥4.5:1) on EVERY surface it renders over, in BOTH modes. It regressed
//     to 3.9:1 (light) / 4.2:1 (dark) before the batch-I darken — this pins
//     the fix so a future palette tweak can't silently un-fix it.
//   • --muted-3 is decoration-only by the same decision; no ratio pinned.
//   • The three CN flag stripes (action/training/review) must use three
//     DISTINCT tokens — training + review both rendered the same green until
//     batch I (flag-training was var(--accent), the alias of --good).
console.log('\nclient — contrast + flag-color tripwires (a11y batch G/I)');
// ── Shared token-block parser (palette-aware since 2026-08-12) ─────────────
// Colour now has TWO axes (mode x palette), so a test that assumes "two hex
// declarations, light then dark" is wrong by construction. Parse the token
// file into BLOCKS and derive the list — INV-179: a new palette must be swept
// in automatically, not remembered.
function tokenBlocks() {
  const toks = fs.readFileSync(
    path.resolve(__dirname, '../../web-app/styles_design_tokens.html'), 'utf8');
  const vals = (body) => Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
  const slice = (startSel, stopAt) => {
    const i = toks.indexOf(startSel);
    assert.ok(i >= 0, 'block not found: ' + startSel);
    return toks.slice(i, toks.indexOf(stopAt, i));
  };
  const blocks = [
    { palette: 'console', mode: 'light', body: slice('  :root {', '  @supports (color: color-mix') },
    { palette: 'console', mode: 'dark',
      body: slice('  :root[data-mode="dark"],', '  @supports (color: color-mix(in oklch, red, blue)) {\n    :root[data-mode="dark"]') },
  ];
  const re = /:root\[data-palette="([a-z]+)"\](\[data-mode="dark"\])?[^{]*\{([\s\S]*?)\n  \}/g;
  let m;
  while ((m = re.exec(toks))) {
    blocks.push({ palette: m[1], mode: m[2] ? 'dark' : 'light', body: m[3] });
  }
  blocks.forEach((b) => { b.vals = vals(b.body); b.id = b.palette + '/' + b.mode; });
  return { toks, blocks };
}
function wcagLum(hex) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const wcagRatio = (a, b) => {
  const la = wcagLum(a), lb = wcagLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

test('--muted-2 meets AA (4.5:1) on every surface, in EVERY palette and mode', () => {
  const { blocks } = tokenBlocks();
  assert.ok(blocks.length >= 8, 'expected the two Console blocks plus each palette x mode');
  blocks.forEach((b) => {
    ['paper', 'paper-2', 'paper-card'].forEach((surf) => {
      const m2 = b.vals['muted-2'], sv = b.vals[surf];
      assert.ok(m2 && sv, b.id + ' must declare --muted-2 and --' + surf +
        ' (a palette block declares the FULL neutral set, so it is verifiable on its own)');
      const r = wcagRatio(m2, sv);
      assert.ok(r >= 4.5, b.id + ' --muted-2 ' + m2 + ' on --' + surf + ' ' + sv +
        ' is ' + r.toFixed(2) + ':1 (< 4.5:1 AA)');
    });
  });
});

// V-1 (cycle 12) — the four `-deep` semantic aliases must interpolate in
// OKLAB, not OKLCH. `color-mix(in oklch, …)` interpolates hue POLARLY: mixing
// a warm token with the near-neutral `--ink` (a low-chroma blue-ish grey, hue
// ~265°) drags the result the long way round the hue circle, so
// --warning-deep rendered OLIVE-GREEN and --danger-deep MAGENTA-PURPLE on
// every modern browser (48–75° of drift) — while the pre-2023 fallback hexes
// right above them were correct, which is exactly why reading the file never
// revealed it. The existing --muted-2 tripwire measures LUMINANCE, which a
// pure hue rotation leaves untouched, so nothing in CI could see this.
// Two halves: the space is pinned at source level (a revert to `in oklch`
// fails immediately), and the chosen colour pairs are pinned to be genuinely
// hue-stable under a rectangular mix (worst measured drift: 10°).
test('V-1: the -deep aliases mix in oklab and stay in their own hue family', () => {
  const toks = fs.readFileSync(
    path.resolve(__dirname, '../../web-app/styles_design_tokens.html'), 'utf8');
  const DEEP = [
    ['success-deep', 'good'], ['warning-deep', 'warn'],
    ['danger-deep', 'destructive'], ['info-deep', 'info'],
  ];
  // C17 batch-3 (INV-179): the alias set is DERIVED from the token file, not
  // the hand-typed name group the regex used to carry — a NEW -deep alias is
  // swept into (a) automatically, and the coverage assert below fails until
  // it also gets a behavioural hue-pair entry in DEEP.
  const declaredDeep = new Set((toks.match(/--([a-z0-9-]+-deep):/g) || []).map((x) => x.slice(2, -1)));
  const covered = new Set(DEEP.map((p) => p[0]));
  declaredDeep.forEach((n) => assert.ok(covered.has(n),
    'new -deep alias --' + n + ' is not covered — add a behavioural hue-pair entry to DEEP'));
  // (a) source-level: every color-mix'd -deep declaration uses `in oklab`.
  const mixes = toks.match(/--[a-z0-9-]+-deep:\s*color-mix\([^)]*\)[^;]*;/g) || [];
  assert.strictEqual(mixes.length, declaredDeep.size * 2,
    'expected ' + (declaredDeep.size * 2) + ' color-mix -deep declarations (each alias x light/dark @supports blocks), found ' + mixes.length);
  mixes.forEach((d) => {
    assert.ok(/color-mix\(in oklab,/.test(d),
      'polar hue interpolation is a colour-family bug, not a nuance — use `in oklab`: ' + d.trim());
  });

  // (b) behavioural: the mix result must stay in the source hue's family.
  function hexes(name) {
    const re = new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})', 'g');
    const out = []; let m;
    while ((m = re.exec(toks))) out.push(m[1]);
    return out;
  }
  function toOklab(hex) {
    const lin = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    const [r, g, b] = lin;
    const cb = (x) => (x > 0 ? Math.cbrt(x) : -Math.cbrt(-x));
    const l = cb(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = cb(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = cb(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }
  const hue = (c) => (Math.atan2(c[2], c[1]) * 180 / Math.PI + 360) % 360;
  const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  const MAX_DRIFT_DEG = 20;   // worst measured 10.1 (light --good); oklch was 48–75
  // Each mode block mixes with its own partner + weight (light: ink 45%;
  // dark: paper-card 25%) — read them from the source so a retune can't
  // silently invalidate the pin.
  // Palette-aware (2026-08-12): the -deep tokens are color-mixed toward
  // --ink / --paper-card, and a PALETTE changes both — so the drift must be
  // re-checked for every palette, not just Console. This is the reason a
  // palette may not touch the semantic sources: only the PARTNER varies here.
  const { blocks: palBlocks } = tokenBlocks();
  [['ink', 0], ['paper-card', 1]].forEach(([partnerTok, mode]) => {
    const modeName = mode ? 'dark' : 'light';
    const declared = new RegExp('--success-deep: color-mix\\(in oklab, var\\(--good\\),\\s*var\\(--' +
      partnerTok + '\\) (\\d+)%\\)').exec(toks);
    assert.ok(declared, modeName + ' block mixes --good with --' + partnerTok);
    const w = Number(declared[1]) / 100;
    palBlocks.filter((b) => b.mode === modeName).forEach((blk) => {
    const label = modeName + ' [' + blk.palette + ']';
    const partner = toOklab(blk.vals[partnerTok]);
    DEEP.forEach(([, srcTok]) => {
      const src = toOklab(hexes(srcTok)[mode]);
      const mix = src.map((v, i) => v * (1 - w) + partner[i] * w);
      const chroma = Math.hypot(mix[1], mix[2]);
      assert.ok(chroma > 0.02,
        label + ' --' + srcTok + ' mix is near-neutral (chroma ' + chroma.toFixed(3) +
        ') — the hue compare below would be meaningless');
      const drift = hueDiff(hue(src), hue(mix));
      assert.ok(drift <= MAX_DRIFT_DEG,
        label + ' --' + srcTok + ' hue ' + hue(src).toFixed(0) + '° drifts ' +
        drift.toFixed(0) + '° to ' + hue(mix).toFixed(0) + '° in the -deep mix (max ' +
        MAX_DRIFT_DEG + '°) — a semantic colour must not change family');
    });
    });
  });
});
test('CN flag stripes use three distinct tokens', () => {
  const cn = fs.readFileSync(
    path.resolve(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const stripe = {};
  ['action', 'training', 'review'].forEach((f) => {
    const m = cn.match(new RegExp(
      '\\.cn-card\\.flag-' + f + '\\s*\\{[^}]*inset 3px 0 0 var\\((--[a-z0-9-]+)\\)'));
    assert.ok(m, '.cn-card.flag-' + f + ' stripe rule found');
    stripe[f] = m[1];
  });
  // Name-distinctness alone can't catch the actual bug (--accent is the same
  // green family as --good), so pin the exact semantic choice: action=warn,
  // training=info (the training icon's own tint), review=good.
  assert.deepStrictEqual(stripe,
    { action: '--warn', training: '--info', review: '--good' },
    'flag stripes drifted — training was var(--accent) (== the --good green) ' +
    'before batch I, making training and review cards indistinguishable');
});

// Foundational partials: script_icons (icon), script_core (esc, empTz,
// isoDateTz, __URL_PARAMS), metrics (mTodayIso_, mDaysAgo_). These eval cleanly
// because their top-level is declarations + an init listener (stubbed).
const sb = buildSandbox([
  'script_icons.html',
  'script_core.html',
  'metrics/script_metrics.html',
]);
// cnExtEmailPillHtml_ is extracted standalone rather than loading the whole
// 6500-line Call Notes partial — it only needs esc (core) + icon (icons).
const cnExtEmailPillHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtEmailPillHtml_');
// Card-level urgent flag (Round 2 deferred 8e). cnUrgentPillHtml_ depends on
// cnIsUrgent_ (free var) + icon (from script_icons), so load cnIsUrgent_ into
// the sandbox first.
const cnIsUrgent_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnIsUrgent_');
const cnUrgentPillHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnUrgentPillHtml_');
// #2 — external-email template picker filter logic. These read CN_STATE
// (a free var) + esc (sandbox); load the three helpers and seed CN_STATE.
sb.CN_STATE = { deptConfig: { emailTemplates: [] } };
const cnExtTemplatesAll_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplatesAll_');
const cnExtTemplatesFor_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplatesFor_');
const cnExtTemplateOptionsHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplateOptionsHtml_');
// Phase 0 (sub-queue discovery) — the Automation Health queue-inventory render.
// Self-contained by design (no panel closures), so it loads standalone on
// esc + icon like cnExtEmailPillHtml_.
const cnQueueInventoryHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnQueueInventoryHtml_');
// Quick-link picker (surveys/reviews) — reads CN_STATE.deptConfig.externalLinks + esc.
const cnExtLinksAll_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtLinksAll_');
const cnExtLinkOptionsHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtLinkOptionsHtml_');
// Win-back nudge pure logic (reason matcher + template finder).
const cnIsSwitchingSuppliersReason_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnIsSwitchingSuppliersReason_');
const cnFindWinbackTemplate_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnFindWinbackTemplate_');

// Helper: today's date in a given tz, computed independently of the code under
// test (the oracle).
function isoInTz(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

console.log('\nscript_core — esc()');
test('escapes &, <, >, ", \'', () => {
  assert.strictEqual(sb.esc('a & b'), 'a &amp; b');
  assert.strictEqual(sb.esc('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
  assert.strictEqual(sb.esc(`"q" 'q'`), '&quot;q&quot; &#39;q&#39;');
});

console.log('\nscript_core — mtRenderTable_ sortable-header a11y (batch H)');
test('sortable th carries scope/tabindex/aria-sort + keyboard activation', () => {
  const html = sb.mtRenderTable_({
    columns: [
      { key: 'name', label: 'Rep', sortable: true },
      { key: 'pct', label: '%', numeric: true, sortable: true },
      { key: 'note', label: 'Note' },
    ],
    rows: [{}],
    sort: { key: 'pct', dir: 'desc' },
    onSort: 'mySort',
  });
  assert.ok(/th scope="col"[^>]*aria-sort="none"[^>]*>Rep/.test(html), 'inactive sortable th announces aria-sort=none');
  assert.ok(/aria-sort="descending"[^>]*>%/.test(html), 'active sort col announces direction');
  assert.ok(/tabindex="0"[^>]*aria-sort/.test(html), 'sortable th is keyboard-reachable');
  assert.ok(html.indexOf("onkeydown=\"if(event.key==='Enter'||event.key===' ')") >= 0, 'Enter/Space activates the sort');
  assert.ok(/th scope="col">Note/.test(html), 'non-sortable th gets scope but no interactivity');
});

console.log('\nscript_core — empTz() / isoDateTz()');
test('empTz falls back to a default when empState is unset', () => {
  assert.strictEqual(typeof sb.empTz(), 'string');
  assert.ok(sb.empTz().length > 0);
});
test('isoDateTz returns YYYY-MM-DD for a tz', () => {
  assert.match(sb.isoDateTz('America/Chicago'), /^\d{4}-\d{2}-\d{2}$/);
});

console.log('\nmetrics — mTodayIso_() / mDaysAgo_() use the EMPLOYEE tz, not browser-local (F6)');
// Override the global empTz() (a free-variable reference inside the metrics
// functions) so the date helpers resolve to a known offshore tz.
sb.empTz = () => 'Asia/Kolkata';
test('mTodayIso_ returns today in the employee tz', () => {
  assert.strictEqual(sb.mTodayIso_(), isoInTz('Asia/Kolkata'));
});
test('mDaysAgo_(0) equals mTodayIso_', () => {
  assert.strictEqual(sb.mDaysAgo_(0), sb.mTodayIso_());
});
test('mDaysAgo_(7) is exactly 7 days before the employee-tz today', () => {
  const today = isoInTz('Asia/Kolkata');
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  const expected = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  assert.strictEqual(sb.mDaysAgo_(7), expected);
});
test('mTodayIso_ tracks the tz (PHT vs a deliberately different tz)', () => {
  sb.empTz = () => 'Pacific/Kiritimati'; // UTC+14 — almost always a different calendar day than UTC-ish
  const viaCode = sb.mTodayIso_();
  assert.strictEqual(viaCode, isoInTz('Pacific/Kiritimati'));
  sb.empTz = () => 'Asia/Kolkata'; // restore
});

console.log('\ncn — cnExtEmailPillHtml_() (F20 manager-only recipient lookup)');
test('returns empty string when the note has no external emails', () => {
  assert.strictEqual(cnExtEmailPillHtml_({ subformData: {} }), '');
  assert.strictEqual(cnExtEmailPillHtml_({}), '');
  assert.strictEqual(cnExtEmailPillHtml_(null), '');
});
test('renders the recipient address(es) in the pill tooltip', () => {
  const html = cnExtEmailPillHtml_({
    subformData: { externalEmails: [
      { type: 'customer', to: 'patient@example.com' },
      { type: 'provider', to: 'dr@clinic.org' },
    ] },
  });
  assert.ok(html.includes('cn-ext-email-pill'), 'has the pill class');
  assert.ok(html.includes('patient@example.com'), 'shows recipient 1');
  assert.ok(html.includes('dr@clinic.org'), 'shows recipient 2');
  assert.ok(html.includes('>2<'), 'shows the count');
});
test('escapes a malicious recipient (no raw < survives into the markup)', () => {
  const html = cnExtEmailPillHtml_({
    subformData: { externalEmails: [{ type: 'customer', to: '<img src=x onerror=alert(1)>' }] },
  });
  assert.ok(!html.includes('<img src=x'), 'raw <img must be escaped');
  assert.ok(html.includes('&lt;img'), 'escaped form present');
});

console.log('\ncn — cnIsUrgent_() / cnUrgentPillHtml_() (card-level urgent flag)');
test('cnIsUrgent_ is true only when subformData.flags includes "urgent"', () => {
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['urgent'] } }), true);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['action', 'urgent'] } }), true);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['action'] } }), false);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: [] } }), false);
  assert.strictEqual(cnIsUrgent_({ subformData: {} }), false);
  assert.strictEqual(cnIsUrgent_({}), false);
  assert.strictEqual(cnIsUrgent_(null), false);
});
test('cnUrgentPillHtml_ renders the danger pill only when urgent', () => {
  assert.strictEqual(cnUrgentPillHtml_({ subformData: { flags: ['action'] } }), '');
  const html = cnUrgentPillHtml_({ subformData: { flags: ['urgent'] } });
  assert.ok(html.includes('cn-urgent-pill'), 'has the pill class');
  assert.ok(/urgent/i.test(html), 'shows the urgent label');
});

console.log('\ncn — email template picker filtering (#2)');
test('cnExtTemplatesFor_ returns "any" + matching-type templates only', () => {
  sb.CN_STATE.deptConfig.emailTemplates = [
    { name: 'Generic', recipientType: 'any', body: 'Hi {name}' },
    { name: 'Cust only', recipientType: 'customer', body: 'c' },
    { name: 'Prov only', recipientType: 'provider', body: 'p' },
  ];
  const forCust = cnExtTemplatesFor_('customer').map((t) => t.name);
  assert.deepStrictEqual(forCust, ['Generic', 'Cust only']);
  const forProv = cnExtTemplatesFor_('provider').map((t) => t.name);
  assert.deepStrictEqual(forProv, ['Generic', 'Prov only']);
});
test('cnExtTemplateOptionsHtml_ tags non-any templates and escapes names', () => {
  sb.CN_STATE.deptConfig.emailTemplates = [
    { name: '<b>x</b>', recipientType: 'customer', body: 'c' },
  ];
  const html = cnExtTemplateOptionsHtml_('customer');
  assert.ok(html.includes('Insert a template…'), 'has placeholder option');
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'), 'name is escaped');
  assert.ok(html.includes('(customer)'), 'tags the recipient type');
  assert.ok(!html.includes('<b>x</b>'), 'no raw HTML survives');
});
test('cnExtTemplatesAll_ tolerates a missing deptConfig', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = {};
  const all = cnExtTemplatesAll_();
  assert.ok(Array.isArray(all) && all.length === 0, 'returns an empty array');
  sb.CN_STATE = saved;
});

console.log('\ncn — quick-link picker (surveys / reviews)');
test('cnExtLinkOptionsHtml_ lists labels + escapes them, with a placeholder', () => {
  sb.CN_STATE.deptConfig.externalLinks = [
    { label: 'Satisfaction Survey', url: 'https://survey.example/abc' },
    { label: '<b>Review</b>', url: 'https://g.page/r/xyz' },
  ];
  const html = cnExtLinkOptionsHtml_();
  assert.ok(html.includes('Insert a link…'), 'has placeholder option');
  assert.ok(html.includes('Satisfaction Survey'), 'lists the label');
  assert.ok(html.includes('&lt;b&gt;Review&lt;/b&gt;') && !html.includes('<b>Review</b>'), 'escapes labels');
});
test('cnExtLinksAll_ tolerates a missing deptConfig', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = {};
  assert.ok(Array.isArray(cnExtLinksAll_()) && cnExtLinksAll_().length === 0);
  sb.CN_STATE = saved;
});

console.log('\ncn — win-back nudge (close reason = changing suppliers)');
test('cnIsSwitchingSuppliersReason_ matches switch/change-supplier phrasings', () => {
  ['changing suppliers', 'Changed supplier', 'switching to another provider',
   'going with a different supplier', 'moving to a competitor', 'found supplies elsewhere',
  ].forEach((r) => assert.ok(cnIsSwitchingSuppliersReason_(r), 'should match: ' + r));
});
test('cnIsSwitchingSuppliersReason_ ignores unrelated / empty reasons', () => {
  ['', 'duplicate order', 'patient deceased', 'insurance denied', 'no longer needs equipment',
  ].forEach((r) => assert.ok(!cnIsSwitchingSuppliersReason_(r), 'should NOT match: ' + r));
});
test('cnFindWinbackTemplate_ self-gates on a configured win-back template', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = { deptConfig: { emailTemplates: [{ name: 'Feedback', recipientType: 'customer', body: 'x' }] } };
  assert.strictEqual(cnFindWinbackTemplate_(), null, 'no win-back template → null (nudge stays silent)');
  sb.CN_STATE.deptConfig.emailTemplates.push({ name: 'Win-Back Survey', recipientType: 'customer', body: 'Hi {name}' });
  assert.strictEqual((cnFindWinbackTemplate_() || {}).name, 'Win-Back Survey');
  sb.CN_STATE = saved;
});

console.log('\nCode.js — cnExtractAuditNoteId_() (#3 audit noteId parser)');
// Pure server helper both audit endpoints depend on. Extracted from Code.js
// (raw, not a <script> partial) and run in the sandbox.
vm.runInContext(extractRawFunction('Code.js', 'cnExtractAuditNoteId_'), sb,
  { filename: 'Code.js#cnExtractAuditNoteId_' });
const cnExtractAuditNoteId_ = sb.cnExtractAuditNoteId_;
test('extracts the uuid from a CallNote audit Notes field', () => {
  assert.strictEqual(
    cnExtractAuditNoteId_('noteId=3f2504e0-4f89-41d3-9a0c-0305e82c3301; urgent=on'),
    '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  assert.strictEqual(
    cnExtractAuditNoteId_('noteId=abc12345; depts=Shipping'), 'abc12345');
});
test('returns empty string when no noteId is present', () => {
  assert.strictEqual(cnExtractAuditNoteId_('Updated department emails (3 depts)'), '');
  assert.strictEqual(cnExtractAuditNoteId_(''), '');
  assert.strictEqual(cnExtractAuditNoteId_(null), '');
  assert.strictEqual(cnExtractAuditNoteId_(undefined), '');
});

console.log('\ncn — cnLatestManagerReply_() (L4/L5 feedback[] vs legacy precedence)');
// Pure helper behind both the Training Answers tray and the manager read-only
// card — resolves the latest manager reply, preferring the multi-turn
// feedback[] thread and falling back to the legacy trainingReply field.
const cnLatestManagerReply_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnLatestManagerReply_');
test('prefers the latest manager reply in feedback[] over legacy trainingReply', () => {
  const r = cnLatestManagerReply_({
    trainingReply: 'legacy', trainingReplyBy: 'old@x',
    feedback: [
      { role: 'manager', kind: 'reply', message: 'first', by: 'm1@x' },
      { role: 'agent', kind: 'ack', message: '' },
      { role: 'manager', kind: 'reply', message: 'latest', by: 'm2@x' },
    ],
  });
  assert.strictEqual(r.message, 'latest');
  assert.strictEqual(r.by, 'm2@x');
});
test('falls back to legacy trainingReply when feedback[] has no manager reply', () => {
  const legacy = cnLatestManagerReply_({ trainingReply: 'legacy', trainingReplyBy: 'm@x' });
  assert.strictEqual(legacy.message, 'legacy');
  assert.strictEqual(legacy.by, 'm@x');
  // agent-only feedback with no manager entry → empty
  const agentOnly = cnLatestManagerReply_({ feedback: [{ role: 'agent', kind: 'ack', message: '' }] });
  assert.strictEqual(agentOnly.message, '');
  // missing / null subformData → empty, never throws
  assert.strictEqual(cnLatestManagerReply_({}).message, '');
  assert.strictEqual(cnLatestManagerReply_(null).message, '');
});

console.log('\nCode.js — isValidTimeOffType_() (M1 leave-type whitelist)');
// Pure server helper guarding submitTimeOffRequest / managerSubmitTimeOff.
// Source BOTH the validator and its canonical TIME_OFF_TYPES set from Code.js
// (no local re-declaration → no Category-B drift). Strip the `const` so the
// array lands as a sandbox global the extracted function reads as a free var.
const codeSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
const totMatch = codeSrc.match(/const (TIME_OFF_TYPES\s*=\s*\[[\s\S]*?\]);/);
assert.ok(totMatch, 'TIME_OFF_TYPES declaration found in Code.js');
vm.runInContext(totMatch[1] + ';', sb, { filename: 'Code.js#TIME_OFF_TYPES' });
vm.runInContext(extractRawFunction('Code.js', 'isValidTimeOffType_'), sb,
  { filename: 'Code.js#isValidTimeOffType_' });
const isValidTimeOffType_ = sb.isValidTimeOffType_;

test('accepts every canonical type, case- and whitespace-insensitive', () => {
  sb.TIME_OFF_TYPES.forEach((t) => assert.strictEqual(isValidTimeOffType_(t), true, t));
  assert.strictEqual(isValidTimeOffType_('  full day  '), true);
});
test('rejects unknown / empty / malformed types', () => {
  assert.strictEqual(isValidTimeOffType_('Half Day'), false); // missing - Morning/Afternoon
  assert.strictEqual(isValidTimeOffType_('Sick Leave'), false); // #2 — sick deprecated, no longer creatable
  assert.strictEqual(isValidTimeOffType_('Vacation'), false);
  assert.strictEqual(isValidTimeOffType_(''), false);
  assert.strictEqual(isValidTimeOffType_(null), false);
  assert.strictEqual(isValidTimeOffType_(undefined), false);
});
// Coupling tripwire: every leave type the UI <select> offers must be accepted
// by the server validator, or a legitimate request would now be rejected (the
// new failure mode M1 introduced — TIME_OFF_TYPES ↔ modal options must agree).
test('every day-type <select> option is an accepted leave type', () => {
  const modalsSrc = fs.readFileSync(path.join(__dirname, '../../web-app/modals.html'), 'utf8');
  const block = modalsSrc.slice(modalsSrc.indexOf('id="day-type"'));
  const sel = block.slice(0, block.indexOf('</select>'));
  const opts = [...sel.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(opts.length >= 5, 'parsed the day-type option list');
  opts.forEach((v) => assert.strictEqual(isValidTimeOffType_(v), true,
    `UI offers "${v}" but the server validator rejects it`));
});

console.log('\ntc/script_clock — dashProjection_() (run-rate projection)');
const dashProjection_ = loadFunction(sb, 'tc/script_clock.html', 'dashProjection_');
test('projects MTD/YTD counts by elapsed fraction; null for yesterday / <3d / complete', () => {
  const m = dashProjection_(100, '2026-06-01', '2026-06-10', 'mtd');   // 10 of 30 days → ~300 by EOM
  assert.strictEqual(m.projected, 300); assert.strictEqual(m.endLabel, 'Jun 30');
  const y = dashProjection_(1000, '2026-01-01', '2026-03-01', 'ytd');  // 60 of 365 days
  assert.strictEqual(y.endLabel, 'Dec 31'); assert.ok(y.projected > 6000 && y.projected < 6200);
  assert.strictEqual(dashProjection_(100, '2026-06-25', '2026-06-25', 'yesterday'), null); // not a range period
  assert.strictEqual(dashProjection_(100, '2026-06-01', '2026-06-02', 'mtd'), null);        // < 3 days elapsed
  assert.strictEqual(dashProjection_(null, '2026-06-01', '2026-06-10', 'mtd'), null);       // null value
  assert.strictEqual(dashProjection_(100, '2026-06-01', '2026-06-30', 'mtd'), null);        // complete period
});

console.log('\nCode.js — formTokenCellMs_() (coercion-safe form-token expiry read)');
// Regression for the "every fresh token reads as expired" bug: when FORMS_SS_ID
// points at a sheet that coerces the ISO-T ExpiresAt string to a datetime,
// getValues() returns a Date — the old String()+strict-parse fail-closed it to
// "expired". formTokenCellMs_ must accept a Date directly. Stub its deps
// (CONFIG.TIMEZONE + parseTimestampMs_) so the helper unit-tests in isolation.
vm.runInContext(
  'var CONFIG = { TIMEZONE: "Asia/Kolkata" };' +
  'function parseTimestampMs_(s, tz) { return /^\\d{4}-\\d{2}-\\d{2}T/.test(s) ? 1700000000000 : null; }' +
  'var Utilities = { formatDate: function (d, tz, fmt) { return "ISO:" + d.getTime() + ":" + tz; } };',
  sb, { filename: 'test#formTokenCellMs_deps' });
vm.runInContext(extractRawFunction('Code.js', 'formTokenCellMs_'), sb,
  { filename: 'Code.js#formTokenCellMs_' });
const formTokenCellMs_ = sb.formTokenCellMs_;

// Field-wise asserts (the helper returns a sandbox-realm object, so a whole-
// object deepStrictEqual trips on prototype identity across vm realms).
const expectCell = (r, present, ms) => {
  assert.strictEqual(r.present, present);
  assert.strictEqual(r.ms, ms);
};
test('a coerced Date cell is valid (the bug) — present, ms = getTime()', () => {
  const d = new Date(Date.UTC(2026, 5, 27, 13, 0, 0));
  expectCell(formTokenCellMs_(d), true, d.getTime());
});
test('an empty / null cell is absent (no expiry → skip the check)', () => {
  expectCell(formTokenCellMs_(''), false, null);
  expectCell(formTokenCellMs_(null), false, null);
  expectCell(formTokenCellMs_(undefined), false, null);
});
test('a valid ISO-T string parses; a non-empty garbage string fail-closes (ms=null)', () => {
  expectCell(formTokenCellMs_('2026-06-27T19:00:00'), true, 1700000000000);
  expectCell(formTokenCellMs_('not-a-date'), true, null);
});

// formTokenIsoString_ is the display sibling — the source of the #90 regression
// (two return sites referenced a removed var). Pin its three branches so a
// future refactor of the returned expiresAt/createdAt values can't silently
// leak a coerced-Date blob or break.
vm.runInContext(extractRawFunction('Code.js', 'formTokenIsoString_'), sb,
  { filename: 'Code.js#formTokenIsoString_' });
const formTokenIsoString_ = sb.formTokenIsoString_;
test('formTokenIsoString_: Date + parseable string → reformatted ISO; empty → ""; garbage → raw', () => {
  const d = new Date(Date.UTC(2026, 5, 27, 13, 0, 0));
  assert.strictEqual(formTokenIsoString_(d), 'ISO:' + d.getTime() + ':Asia/Kolkata');       // coerced Date → clean ISO
  assert.strictEqual(formTokenIsoString_('2026-06-27T19:00:00'), 'ISO:1700000000000:Asia/Kolkata');
  assert.strictEqual(formTokenIsoString_(''), '');                                          // empty stays empty
  assert.strictEqual(formTokenIsoString_('garbage'), 'garbage');                            // unparseable passes through
});

console.log('\nCode.js — adminAuditRowTone_() + sheet-view allowlist (Tier 2)');
vm.runInContext(extractRawFunction('Code.js', 'adminAuditRowTone_'), sb,
  { filename: 'Code.js#adminAuditRowTone_' });
const adminAuditRowTone_ = sb.adminAuditRowTone_;
test('row tone: destructive / degradation / automation / neutral', () => {
  ['FormDataPurge', 'CallNoteDelete', 'EmpDocVoid'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'danger', a));
  ['PersonalSheetSyncFail', 'PtoReconciliationFix'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'warn', a));
  ['CallNotesReconcile', 'AdpExport', 'CallNotesArchive', 'CallNotesProvision'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'info', a));
  ['CallNoteCreate', '', null, undefined].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), '', String(a)));
});
// 2b — KB review-due tone (mirrors the kbGetReviewDue staleness rule, INV-126).
vm.runInContext(extractRawFunction('Code.js', 'adminKbReviewTone_'), sb,
  { filename: 'Code.js#adminKbReviewTone_' });
const adminKbReviewTone_ = sb.adminKbReviewTone_;
test('KB review tone: null age or age ≥ dueDays → warn; fresher → neutral', () => {
  assert.strictEqual(adminKbReviewTone_(null, 90), 'warn');   // never reviewed/edited
  assert.strictEqual(adminKbReviewTone_(120, 90), 'warn');
  assert.strictEqual(adminKbReviewTone_(90, 90), 'warn');     // boundary inclusive
  assert.strictEqual(adminKbReviewTone_(30, 90), '');
  assert.strictEqual(adminKbReviewTone_(0, 90), '');
});
// Coupling tripwire: the client view picker must never offer a view the server
// allowlist doesn't honor — the KEY is the security boundary (INV-32/121/122).
test('client CN_SHEET_VIEWS keys ⊆ server adminSheetViewKeys_()', () => {
  const cnSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const serverKeys = (codeSrc.match(/function adminSheetViewKeys_\(\)\s*\{\s*return\s*(\[[^\]]*\])/) || [])[1];
  const clientBlock = (cnSrc.match(/var CN_SHEET_VIEWS\s*=\s*(\[[\s\S]*?\]);/) || [])[1];
  assert.ok(serverKeys && clientBlock, 'found both view lists');
  const sk = JSON.parse(serverKeys.replace(/'/g, '"'));
  const ck = [...clientBlock.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ck.length >= 1, 'parsed client view keys');
  ck.forEach((k) => assert.ok(sk.includes(k), `client offers "${k}" but server allowlist omits it`));
});

console.log('\nCode.js — dashboard metrics pure helpers (period range + cohort-guarded team)');
['dashboardPeriodRange_', 'dashboardTeamAggregate_', 'dashboardTeamTransfer_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn }));
const dashboardPeriodRange_ = sb.dashboardPeriodRange_;
const dashboardTeamAggregate_ = sb.dashboardTeamAggregate_;
const dashboardTeamTransfer_ = sb.dashboardTeamTransfer_;
test('dashboardPeriodRange_: yesterday/mtd/ytd resolve from today (UTC string math)', () => {
  const y = dashboardPeriodRange_('yesterday', '2026-03-01');
  assert.strictEqual(y.from, '2026-02-28'); assert.strictEqual(y.to, '2026-02-28'); // month + leap-safe rollback
  const m = dashboardPeriodRange_('mtd', '2026-06-17');
  assert.strictEqual(m.from, '2026-06-01'); assert.strictEqual(m.to, '2026-06-17');
  const yt = dashboardPeriodRange_('ytd', '2026-06-17');
  assert.strictEqual(yt.from, '2026-01-01'); assert.strictEqual(yt.to, '2026-06-17');
  assert.strictEqual(dashboardPeriodRange_('bogus', '2026-06-17'), null);
  assert.strictEqual(dashboardPeriodRange_('mtd', 'not-a-date'), null);
});
test('dashboardTeamAggregate_: sums, recomputes pct, answered-weighted ATT; null below cohort', () => {
  const agents = {
    A: { totalRung: 100, totalAnswered: 90, totalMissed: 10, attSeconds: 200 },
    B: { totalRung: 100, totalAnswered: 80, totalMissed: 20, attSeconds: 100 },
    C: { totalRung: 0,   totalAnswered: 0,  totalMissed: 0,  attSeconds: 0 },   // no data → not in cohort
  };
  const below = dashboardTeamAggregate_(agents, 3);   // only A,B qualify → cohort 2 < 3
  assert.strictEqual(below.team, null); assert.strictEqual(below.cohort, 2);
  const ok = dashboardTeamAggregate_(agents, 2);
  assert.strictEqual(ok.cohort, 2);
  assert.strictEqual(ok.team.rung, 200); assert.strictEqual(ok.team.answered, 170);
  assert.strictEqual(ok.team.pctAnswered, 85);  // 170/200
  assert.strictEqual(ok.team.attSeconds, Math.round((200 * 90 + 100 * 80) / 170)); // answered-weighted
});
test('dashboardTeamTransfer_: sums calls/transferred, recomputes pct; null below cohort', () => {
  const t = { A: { totalCalls: 50, transferred: 10 }, B: { totalCalls: 50, transferred: 20 }, C: { totalCalls: 0, transferred: 0 } };
  assert.strictEqual(dashboardTeamTransfer_(t, 3).transfer, null);   // cohort 2 < 3
  const ok = dashboardTeamTransfer_(t, 2);
  assert.strictEqual(ok.transfer.totalCalls, 100); assert.strictEqual(ok.transfer.transferred, 30);
  assert.strictEqual(ok.transfer.transferPct, 30);  // 30/100
});

console.log('\nCode.js — coaching pure helpers (coachValidate_ / coachUnackedOverdue_)');
// Source the validator + its whitelist/caps from Code.js (no local re-declare).
const coachSevMatch = codeSrc.match(/const (COACH_SEVERITIES\s*=\s*\[[\s\S]*?\]);/);
const coachTmaxMatch = codeSrc.match(/const (COACH_TEXT_MAX\s*=\s*\d+);/);
const coachTrxMatch = codeSrc.match(/const (COACH_TRX_MAX\s*=\s*\d+);/);
assert.ok(coachSevMatch && coachTmaxMatch && coachTrxMatch, 'COACH_* consts found in Code.js');
vm.runInContext(coachSevMatch[1] + ';' + coachTmaxMatch[1] + ';' + coachTrxMatch[1] + ';', sb,
  { filename: 'Code.js#COACH_consts' });
vm.runInContext(extractRawFunction('Code.js', 'coachValidate_'), sb, { filename: 'Code.js#coachValidate_' });
vm.runInContext(extractRawFunction('Code.js', 'coachUnackedOverdue_'), sb, { filename: 'Code.js#coachUnackedOverdue_' });
const coachValidate_ = sb.coachValidate_;
const coachUnackedOverdue_ = sb.coachUnackedOverdue_;

test('coachValidate_ accepts a well-formed payload, trims + lowercases severity', () => {
  const r = coachValidate_({ empId: ' E1 ', severity: 'Major', whatHappened: ' did x ', whatShould: 'do y', patientTRX: 'TRX1', noteId: 'n1' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.item.empId, 'E1');
  assert.strictEqual(r.item.severity, 'major');
  assert.strictEqual(r.item.whatHappened, 'did x');
  assert.strictEqual(r.item.noteId, 'n1');
});
test('coachValidate_ allows empty whatShould (praise often has none)', () => {
  const r = coachValidate_({ empId: 'E1', severity: 'praise', whatHappened: 'great job' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.item.whatShould, '');
});
test('coachValidate_ rejects missing emp / bad severity / empty narrative / oversize', () => {
  assert.strictEqual(coachValidate_({ severity: 'minor', whatHappened: 'x' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'nope', whatHappened: 'x' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: '  ' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: 'x'.repeat(sb.COACH_TEXT_MAX + 1) }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: 'x', patientTRX: 't'.repeat(sb.COACH_TRX_MAX + 1) }).ok, false);
});
test('coachUnackedOverdue_ returns only open, non-praise items older than N days', () => {
  const now = 1000 * 86400000, day = 86400000;
  const items = [
    { status: 'open', severity: 'major', createdAtMs: now - 10 * day },          // overdue → in
    { status: 'open', severity: 'major', createdAtMs: now - 2 * day },           // too recent → out
    { status: 'acknowledged', severity: 'major', createdAtMs: now - 30 * day },  // acked → out
    { status: 'open', severity: 'praise', createdAtMs: now - 30 * day },         // praise → out
    { status: 'open', severity: 'critical', createdAtMs: now - 8 * day },        // overdue → in
  ];
  const due = coachUnackedOverdue_(items, now, 7);
  assert.strictEqual(due.length, 2);
  assert.ok(due.every((d) => d.status === 'open' && d.severity !== 'praise'));
});
test('coachUnackedOverdue_ never throws on empty / missing input', () => {
  assert.strictEqual(coachUnackedOverdue_(null, 0, 7).length, 0);
  assert.strictEqual(coachUnackedOverdue_([], 0, 7).length, 0);
});

vm.runInContext(extractRawFunction('Code.js', 'coachParseTs_'), sb, { filename: 'Code.js#coachParseTs_' });
vm.runInContext(extractRawFunction('Code.js', 'coachMedian_'), sb, { filename: 'Code.js#coachMedian_' });
vm.runInContext(extractRawFunction('Code.js', 'coachAnalytics_'), sb, { filename: 'Code.js#coachAnalytics_' });
const coachAnalytics_ = sb.coachAnalytics_;
test('coachMedian_ handles even/odd/empty', () => {
  assert.strictEqual(sb.coachMedian_([]), 0);
  assert.strictEqual(sb.coachMedian_([3]), 3);
  assert.strictEqual(sb.coachMedian_([1, 3]), 2);
  assert.strictEqual(sb.coachMedian_([5, 1, 3]), 3);
});
test('coachAnalytics_ aggregates severity / ack-rate / median-days / per-rep', () => {
  const now = Date.UTC(2026, 0, 20, 0, 0, 0); // 2026-01-20
  const items = [
    // acked 3 days after creation
    { empId: 'A', empName: 'Ana', severity: 'major', status: 'acknowledged', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '2026-01-04 09:00:00' },
    // acked 1 day after creation
    { empId: 'A', empName: 'Ana', severity: 'minor', status: 'acknowledged', createdAt: '2026-01-10 09:00:00', acknowledgedAt: '2026-01-11 09:00:00' },
    // open + old → overdue (non-praise)
    { empId: 'B', empName: 'Bo', severity: 'critical', status: 'open', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '' },
    // praise open + old → NOT overdue
    { empId: 'B', empName: 'Bo', severity: 'praise', status: 'open', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '' },
  ];
  const a = coachAnalytics_(items, now, 7);
  assert.strictEqual(a.total, 4);
  assert.strictEqual(a.bySeverity.praise, 1);
  assert.strictEqual(a.bySeverity.minor, 1);
  assert.strictEqual(a.bySeverity.major, 1);
  assert.strictEqual(a.bySeverity.critical, 1);
  assert.strictEqual(a.acknowledged, 2);
  assert.strictEqual(a.ackRatePct, 50);
  assert.strictEqual(a.overdueUnacked, 1, 'critical open+old overdue; praise excluded');
  assert.strictEqual(a.medianDaysToAck, 2, 'median of [3,1] days = 2');
  const ana = a.perRep.find((r) => r.empId === 'A');
  assert.strictEqual(ana.ackRatePct, 100);
  assert.strictEqual(ana.medianDaysToAck, 2);
  // most-overdue rep sorts first
  assert.strictEqual(a.perRep[0].empId, 'B');
});
test('coachAnalytics_ empty input → zeroed shape', () => {
  const a = coachAnalytics_([], Date.now(), 7);
  assert.strictEqual(a.total, 0);
  assert.strictEqual(a.ackRatePct, 0);
  assert.strictEqual(a.perRep.length, 0);
});

// Cycle 7 · H-1 — coaching CreatedAt is stamped in SPACE form; the T-only
// parseTimestampMs_ nulled every row, so overdueUnacked was permanently false
// and the daily digest never nagged about un-acked coaching.
test('coachParseTs_ parses BOTH stamp forms (space + T) and NaNs garbage', () => {
  const ms = sb.coachParseTs_('2026-01-01 09:00:00');
  assert.strictEqual(ms, Date.UTC(2026, 0, 1, 9, 0, 0), 'space form parses');
  assert.strictEqual(sb.coachParseTs_('2026-01-01T09:00:00'), ms, 'T form parses identically');
  assert.ok(isNaN(sb.coachParseTs_('garbage')), 'garbage → NaN (falsy for the overdue guards)');
});
// Cycle 9 · M-11 — the INV-134 fail-closed team-scoping boundary
// (coachCanManagerSee_) had ZERO tests at any layer while its structurally
// identical EmpDocs twin (empDocCanManagerSee_) is fully pinned. Unit-pin the
// scoping rules with a stubbed roster. The stub mirrors the production
// contract: lookupEmployeeById_ lowercases managerEmail at read.
test('C9 M-11: coachCanManagerSee_ — creator OR roster column-M manager; blank narrows; fail-closed', () => {
  const cctx = { String, Boolean };
  vm.createContext(cctx);
  vm.runInContext(
    'var __roster = {};\nfunction lookupEmployeeById_(id) { return __roster[String(id)] || null; }',
    cctx, { filename: 'coachSee#stub' });
  vm.runInContext(extractRawFunction('Code.js', 'coachCanManagerSee_'), cctx, { filename: 'Code.js#coachCanManagerSee_' });
  const see = (caller, item, roster) => { cctx.__roster = roster || {}; return cctx.coachCanManagerSee_(caller, item); };
  const item = { empId: 'E1', createdBy: 'Creator@X.com' };
  assert.strictEqual(see({ isManager: false, email: 'creator@x.com' }, item), false,
    'a non-manager is denied even as the creator');
  assert.strictEqual(see({ isManager: true, email: 'CREATOR@x.COM' }, item), true,
    'the creator is allowed (case-insensitive, no roster row needed)');
  assert.strictEqual(see({ isManager: true, email: 'boss@x.com' }, item,
    { E1: { managerEmail: 'boss@x.com' } }), true, 'the roster column-M manager is allowed');
  assert.strictEqual(see({ isManager: true, email: 'other@x.com' }, item,
    { E1: { managerEmail: 'boss@x.com' } }), false,
    'an unrelated manager is denied — MANAGER_EMAILS membership alone grants nothing');
  assert.strictEqual(see({ isManager: true, email: 'boss@x.com' }, item,
    { E1: { managerEmail: '' } }), false, 'a blank ManagerEmail NARROWS to creator only (fail-closed)');
  assert.strictEqual(see({ isManager: true, email: 'boss@x.com' }, item), false,
    'a missing roster row denies (fail-closed)');
});
test('TRIPWIRE (H-1): coaching overdue consumers use coachParseTs_, never the T-only parseTimestampMs_', () => {
  ['getCoachingDashboard', 'coachUnackedAll_'].forEach((fn) => {
    const src = extractRawFunction('Code.js', fn);
    assert.ok(/coachParseTs_\(/.test(src), fn + ' parses createdAt via coachParseTs_');
    assert.ok(!/parseTimestampMs_\(/.test(src),
      fn + ' must NOT use parseTimestampMs_ on the space-form CreatedAt stamp — it returns null for every row (overdue detection silently dead)');
  });
});

console.log('\nCode.js — sanitizeCallNotePayload_ subformData whitelist (cycle 7 · M-15)');
{
  const snCtx = { Object, Array, JSON, String, Number, Boolean, Math, isFinite, console };
  vm.createContext(snCtx);
  const flagConstMatch = codeSrc.match(/const (CN_FLAG_TYPES\s*=\s*\[[^\]]*\]);/);
  const flagExtMatch = codeSrc.match(/const (CN_FLAG_TYPES_EXTENDED\s*=\s*\[[^\]]*\]);/);
  const flagPriMatch = codeSrc.match(/const (CN_FLAG_PRIORITY\s*=\s*\[[^\]]*\]);/);
  assert.ok(flagConstMatch && flagExtMatch && flagPriMatch, 'CN flag consts found');
  vm.runInContext(flagConstMatch[1] + ';' + flagExtMatch[1] + ';' + flagPriMatch[1] + ';', snCtx);
  ['sanitizeFlagsArray_', 'deriveFlagType_', 'sanitizeTagsArray_', 'sanitizeCallNotePayload_'].forEach((fn) => {
    vm.runInContext(extractRawFunction('Code.js', fn), snCtx, { filename: 'Code.js#' + fn });
  });
  test('subformData whitelist: forged manager-reply / pin / feedback keys are STRIPPED at submit', () => {
    const cleaned = snCtx.sanitizeCallNotePayload_({
      issue: 'x',
      subformData: {
        trainingQuestion: ' why? ',
        completionSeconds: 42.6,
        trainingReply: 'FORGED', trainingReplyBy: 'boss@x.com', trainingReplyAt: 'now',
        feedback: [{ role: 'manager', kind: 'reply', message: 'forged' }],
        pinned: true, pinnedAt: 'now',
        formSubmission: { token: 'x' }, externalEmails: [{ to: 'a@b.c' }],
      },
    });
    assert.deepStrictEqual(Object.keys(cleaned.subformData).sort(), ['completionSeconds', 'trainingQuestion'],
      'only the client-legitimate keys survive (INV-49/50 restored to server-enforced)');
    assert.strictEqual(cleaned.subformData.trainingQuestion, 'why?');
    assert.strictEqual(cleaned.subformData.completionSeconds, 43);
  });
  test('subformData whitelist: flags/tags still fold in; junk-only blob → null; absent blob → null', () => {
    const withFlags = snCtx.sanitizeCallNotePayload_({ issue: 'x', flags: ['urgent', 'action'], tags: ['My Tag'],
      subformData: { pinned: true } });
    assert.strictEqual(JSON.stringify(withFlags.subformData.flags), '["urgent","action"]');
    assert.strictEqual(JSON.stringify(withFlags.subformData.tags), '["my-tag"]');
    assert.strictEqual(withFlags.subformData.pinned, undefined, 'pin-cap bypass stripped');
    assert.strictEqual(withFlags.flagType, 'action', 'FlagType derivation unchanged');
    assert.strictEqual(snCtx.sanitizeCallNotePayload_({ issue: 'x', subformData: { pinned: true } }).subformData, null);
    assert.strictEqual(snCtx.sanitizeCallNotePayload_({ issue: 'x' }).subformData, null);
    const legit = snCtx.sanitizeCallNotePayload_({ issue: 'x', subformData: { completionSeconds: 90 } });
    assert.strictEqual(legit.subformData.completionSeconds, 90);
  });
  test('L-13: a lone legacy flagType=urgent folds into subformData.flags instead of being silently dropped', () => {
    const c = snCtx.sanitizeCallNotePayload_({ issue: 'x', flagType: 'urgent' });
    assert.strictEqual(JSON.stringify(c.subformData.flags), '["urgent"]', 'urgent preserved in the blob');
    assert.strictEqual(c.flagType, 'urgent', 'validation still sees the extended value; sanitizeFlagType_ strips it from the COLUMN downstream (INV-37)');
  });
  // Cycle 9 · M-3 — the intake auto-log note marks its category via
  // subformData.intakeType (the cnIntakePillHtml_ chip) + a top-level
  // 'intake-<type>' tag. The M-15 whitelist silently stripped intakeType, so
  // every intake-logged note persisted un-chipped. Pin the bounded enum:
  // ppd|pmd|pap survive (case-normalized), anything else drops.
  test('C9 M-3: subformData.intakeType survives the whitelist as a bounded enum', () => {
    const kept = snCtx.sanitizeCallNotePayload_({ issue: 'x', tags: ['intake-ppd'],
      subformData: { intakeType: 'ppd' } });
    assert.strictEqual(kept.subformData.intakeType, 'ppd', 'valid intakeType kept');
    assert.strictEqual(JSON.stringify(kept.subformData.tags), '["intake-ppd"]', 'top-level intake tag folds in');
    assert.strictEqual(snCtx.sanitizeCallNotePayload_({ issue: 'x', subformData: { intakeType: 'PMD' } })
      .subformData.intakeType, 'pmd', 'case-normalized');
    assert.strictEqual(snCtx.sanitizeCallNotePayload_({ issue: 'x', subformData: { intakeType: 'evil<script>' } })
      .subformData, null, 'off-enum value drops (blob then empty → null)');
  });
}

console.log('\nCode.js — CN Timestamp coercion boundary (INV-142) + kbRowStatus_ (INV-147)');
test('TRIPWIRE (INV-142): CN Timestamp readers route through cnTimestampString_', () => {
  ['callNoteRowToObject_', 'deleteCallNote', 'getCallNotesAmbient', 'getMyTrainingQA',
   'getMyNoteHourBuckets' /* cycle-8: joined the boundary */].forEach((fn) => {
    const src = extractRawFunction('Code.js', fn);
    assert.ok(/cnTimestampString_\(/.test(src),
      fn + ' must read CN.TIMESTAMP via cnTimestampString_ — a locale-coerced Date stringified raw breaks ' +
      'sorting/shift-span/EOD displays and FAIL-OPENS the 5-min delete window (M-14 class)');
  });
});
test('TRIPWIRE (INV-142, cycle-8 M-15): no NEW raw [CN.TIMESTAMP] reads anywhere in Code.js', () => {
  // The enumerated-reader check above can't see a FIFTH reader added
  // elsewhere (this class bit twice: M-14, cycle-7). Global scan: every
  // `[CN.TIMESTAMP]` occurrence must sit inside a known-safe expression —
  // a cnTimestampString_(…) argument, a bare cell WRITE (setValue/appendRow
  // builders don't read), or the whitelisted inline-guard functions.
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const lines = src.split('\n');
  const offenders = [];
  // Cycle 10: the write-exemption is `=` NOT followed by `=` — a raw
  // COMPARISON read (`row[CN.TIMESTAMP] === x`, a Date-vs-string compare
  // that is always false, exactly the bug class this scan exists for) used
  // to match the `\]\s*=` write shape and pass silently.
  const SAFE_LINE = /cnTimestampString_\(|CN\.(TIMESTAMP|EMAILED_AT) \+ 1|CN\.(TIMESTAMP|EMAILED_AT)\]\s*=(?!=)|^\s*\/\//;
  // C1 (cycle 10): reconcileCallNotes now routes through cnTimestampString_
  // like every other reader (its "equivalent" inline guard recovered in the
  // REP's tz, not the sheet's — a real bug, and the whole-line exemption it
  // needed was itself a copyable false-pass hole). No exemption remains.
  // Cycle-11 L-5: CN.EMAILED_AT joins the scan — it's written in the SAME
  // locale-coercible ISO-T form (emailFromCallNote's stamp) and its raw read
  // was the one untripwired sibling of this boundary.
  lines.forEach((line, idx) => {
    if (line.indexOf('[CN.TIMESTAMP]') < 0 && line.indexOf('[CN.EMAILED_AT]') < 0) return;
    if (SAFE_LINE.test(line)) return;
    offenders.push('line ' + (idx + 1) + ': ' + line.trim());
  });
  assert.deepStrictEqual(offenders, [],
    'raw [CN.TIMESTAMP]/[CN.EMAILED_AT] read(s) outside the cnTimestampString_ boundary — see INV-142');
});
test('coupling — showView\'s intakeFlushDraftNow_ hook resolves cross-partial (Turn-B seams audit)', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const intake = fs.readFileSync(path.join(__dirname, '../../web-app/intake/script_intake.html'), 'utf8');
  assert.ok(/typeof intakeFlushDraftNow_ === 'function'/.test(core), 'showView calls the flush hook (typeof-guarded)');
  assert.ok(/function intakeFlushDraftNow_\(/.test(intake),
    'intake must define intakeFlushDraftNow_ — a rename silently kills the M-2 nav flush (the typeof guard hides the breakage)');
});
{
  const kbCtx = { String: String };
  vm.createContext(kbCtx);
  const stMatch = codeSrc.match(/const (KB_STATUS_DRAFT\s*=\s*'[^']*');/);
  const spMatch = codeSrc.match(/const (KB_STATUS_PUBLISHED\s*=\s*'[^']*');/);
  assert.ok(stMatch && spMatch, 'KB status consts found');
  vm.runInContext(stMatch[1] + ';' + spMatch[1] + ';', kbCtx);
  vm.runInContext(extractRawFunction('Code.js', 'kbRowStatus_'), kbCtx, { filename: 'Code.js#kbRowStatus_' });
  test('kbRowStatus_: blank/legacy/garbage → published; only a literal draft (any case/pad) → draft', () => {
    assert.strictEqual(kbCtx.kbRowStatus_(''), 'published', 'blank legacy cell reads published (back-compat)');
    assert.strictEqual(kbCtx.kbRowStatus_(undefined), 'published');
    assert.strictEqual(kbCtx.kbRowStatus_('published'), 'published');
    assert.strictEqual(kbCtx.kbRowStatus_('draft'), 'draft');
    assert.strictEqual(kbCtx.kbRowStatus_(' Draft '), 'draft', 'trim + case-insensitive');
    assert.strictEqual(kbCtx.kbRowStatus_('archived'), 'published', 'unknown value fails PUBLISHED (never hides content by accident)');
  });
}

console.log('\nCode.js — per-rep shift override (Turn D · parseShiftOverride_)');
{
  const shCtx = { String: String, parseInt: parseInt };
  vm.createContext(shCtx);
  vm.runInContext(extractRawFunction('Code.js', 'parseShiftOverride_'), shCtx, { filename: 'Code.js#parseShiftOverride_' });
  const p = (v) => shCtx.parseShiftOverride_(v);
  test('parseShiftOverride_: valid forms parse to start/length minutes', () => {
    assert.deepStrictEqual({ ...p('9:15-17:45') }, { startMin: 555, lengthMin: 510 });
    assert.deepStrictEqual({ ...p('08:00-17:00') }, { startMin: 480, lengthMin: 540 });
    assert.deepStrictEqual({ ...p('9-17') }, { startMin: 540, lengthMin: 480 }, 'bare hours OK');
    assert.deepStrictEqual({ ...p(' 9:30 - 18:00 ') }, { startMin: 570, lengthMin: 510 }, 'spaces tolerated');
    assert.deepStrictEqual({ ...p('0:00-24:00') }, { startMin: 0, lengthMin: 1440 }, 'full-day bounds');
  });
  test('parseShiftOverride_: blank/garbage/overnight/out-of-range → null (fail-safe to the per-tz schedule)', () => {
    ['', null, undefined, 'lol', '9:00', '9:75-17:00', '17:00-9:00', '9:00-9:00', '9:00-25:00', '9:00–17:00'].forEach((v) => {
      assert.strictEqual(p(v), null, JSON.stringify(v) + ' must fall back');
    });
  });
}
test('TRIPWIRE (Turn D): every schedule consumer routes through empShiftSchedule_ (no bare getShiftSchedule_)', () => {
  const strip = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ['getEmployeeState', 'getCoveragePlan', 'getPunctualityReport'].forEach((fn) => {
    const src = strip(extractRawFunction('Code.js', fn));
    assert.ok(/empShiftSchedule_\(/.test(src), fn + ' uses the per-rep resolver');
    assert.ok(!/getShiftSchedule_\(/.test(src), fn + ' must not call the per-tz schedule directly — the column-O override would be silently ignored');
  });
  const calls = (strip(codeSrc).match(/(?<!function )getShiftSchedule_\(/g) || []).length;
  assert.strictEqual(calls, 1, 'getShiftSchedule_ is called ONLY by empShiftSchedule_ (found ' + calls + ' call sites)');
});

console.log('\nCode.js — detector-liveness wiring (Turn C)');
test('TRIPWIRE (Turn C): detector checks are computed, returned, and consumed by the failure digest', () => {
  const health = extractRawFunction('Code.js', 'computeAutomationHealth_');
  assert.ok(/automationDetectorChecks_\(\)/.test(health), 'computeAutomationHealth_ computes the detector checks');
  assert.ok(/detectors:\s*detectors/.test(health), 'computeAutomationHealth_ returns them');
  // Batch K (E): the failure derivation is factored into automationProblems_
  // so the digest AND the shell health badge share ONE source. The digest and
  // badge must both consume it, and the helper must still cover every failure
  // class (detectors, witness loss, sync-fails, stale digests, reconcile).
  const problemsSrc = extractRawFunction('Code.js', 'automationProblems_');
  assert.ok(/report\.detectors|\(report\.detectors/.test(problemsSrc),
    'automationProblems_ must push failing detectors — a dead detector is the failure class the rest of the digest cannot see (H-1/M-11)');
  assert.ok(/witnessFails\.recent/.test(problemsSrc), 'automationProblems_ covers recent witness loss (C4/INV-158)');
  assert.ok(/syncFails/.test(problemsSrc), 'automationProblems_ covers personal-sheet sync failures');
  assert.ok(/CallNotesReconcile/.test(problemsSrc), 'automationProblems_ covers the stale-reconcile F1 signal');
  assert.ok(/d\.stale/.test(problemsSrc), 'automationProblems_ covers stale digest heartbeats');
  const digest = extractRawFunction('Code.js', 'sendAutomationHealthDigest');
  assert.ok(/automationProblems_\(/.test(digest),
    'sendAutomationHealthDigest consumes automationProblems_ (the shared derivation)');
  const badge = extractRawFunction('Code.js', 'getAutomationHealthBadge');
  assert.ok(/automationProblems_\(/.test(badge) && /computeAutomationHealth_\(/.test(badge),
    'getAutomationHealthBadge consumes the SAME derivation (no badge↔digest drift)');
  assert.ok(/isManager/.test(badge) && /Manager access required/.test(badge),
    'getAutomationHealthBadge is manager-gated (INV-02)');
  const checksSrc = extractRawFunction('Code.js', 'automationDetectorChecks_');
  ['coachOverdue', 'auditStaleness', 'deptReqSla', 'cnTimestamp', 'formTokenExpiry',
   'briefConfig' /* cycle-8 M-11: flag-on-without-trigger config coherence */,
   'managerSource' /* F9: MANAGER_EMAILS ↔ roster isManager drift */].forEach((k) => {
    assert.ok(checksSrc.indexOf("'" + k + "'") >= 0, 'detector check "' + k + '" present');
  });
});

console.log('\nCode.js — managerSourceDrift_() (F9 dual-manager-source drift)');
vm.runInContext(extractRawFunction('Code.js', 'managerSourceDrift_'), sb,
  { filename: 'Code.js#managerSourceDrift_' });
const managerSourceDrift_ = sb.managerSourceDrift_;
test('managerSourceDrift_: flags a demoted roster manager still in MANAGER_EMAILS', () => {
  const props = ['boss@umsupply.com', 'gone@umsupply.com', 'DEPLOYER@umsupply.com'];
  const roster = [
    { email: 'boss@umsupply.com', isManager: true },   // aligned — not flagged
    { email: 'gone@umsupply.com', isManager: false },  // demoted but still in MANAGER_EMAILS → DRIFT
    { email: 'rep@umsupply.com',  isManager: false },  // not in MANAGER_EMAILS → not flagged
    // 'deployer@umsupply.com' has NO roster row → a legit non-roster installer, not flagged
  ];
  assert.strictEqual(managerSourceDrift_(props, roster).join(','), 'gone@umsupply.com');
});
test('managerSourceDrift_: case-insensitive match; no drift on an aligned list', () => {
  assert.strictEqual(
    managerSourceDrift_(['Boss@UMSupply.com'], [{ email: 'boss@umsupply.com', isManager: true }]).join(','), '');
  assert.strictEqual(managerSourceDrift_([], [{ email: 'x@y.com', isManager: false }]).join(','), '',
    'empty MANAGER_EMAILS → nothing to drift against');
  assert.strictEqual(managerSourceDrift_(['x@y.com'], []).join(','), '', 'empty roster → nothing flagged');
});
test('managerSourceDrift_: a demoted email appears once even on duplicate roster rows', () => {
  assert.strictEqual(managerSourceDrift_(
    ['dup@y.com'],
    [{ email: 'dup@y.com', isManager: false }, { email: 'DUP@y.com', isManager: false }]).join(','),
    'dup@y.com');
});

console.log('\nCode.js — dev/prod instance guards (blue-green deploy support)');
const instCtx = { String, JSON, Object, console, _p: {} };
instCtx.PropertiesService = { getScriptProperties: function () {
  return { getProperty: function (k) {
    return Object.prototype.hasOwnProperty.call(instCtx._p, k) ? instCtx._p[k] : null;
  } };
} };
vm.createContext(instCtx);
['instanceLabel_', 'isProdInstance_', 'assertNotProdInstance_', 'isDevInstance_', 'assertDevInstance_'].forEach(function (fn) {
  vm.runInContext(extractRawFunction('Code.js', fn), instCtx, { filename: 'Code.js#' + fn });
});
test('instance guards: prod default (no props) — destructive tests OK, dev tools refuse', () => {
  instCtx._p = {};
  assert.strictEqual(instCtx.instanceLabel_(), '');
  assert.strictEqual(instCtx.isProdInstance_(), false);
  assert.strictEqual(instCtx.isDevInstance_(), false);
  assert.doesNotThrow(() => instCtx.assertNotProdInstance_('runAllTests'));   // prod today still runs runAllTests
  assert.throws(() => instCtx.assertDevInstance_('devScrubRoster_'), /not a confirmed DEV instance/);
});
test('instance guards: INSTANCE_IS_PROD=true blocks destructive tests AND dev tools', () => {
  instCtx._p = { INSTANCE_IS_PROD: 'true', INSTANCE_LABEL: 'PROD' };
  assert.strictEqual(instCtx.isProdInstance_(), true);
  assert.strictEqual(instCtx.isDevInstance_(), false);
  assert.throws(() => instCtx.assertNotProdInstance_('runAllTests'), /PRODUCTION instance/);
  assert.throws(() => instCtx.assertDevInstance_('devScrubRoster_'), /not a confirmed DEV instance/);
});
// A5 (cycle 13) — THE fail-open case this suite used to ASSERT as correct.
// It previously read `{ INSTANCE_LABEL: 'DEV' }` (no INSTANCE_IS_PROD) and
// asserted the dev tools were allowed. But that property set is equally the
// state of a PROD project whose operator added a banner label — which the docs
// recommend — and it let devScrubRoster_ anonymize the live roster and the
// nightly job run the full destructive suite against live payroll. An UNSET
// marker is ambiguous and must now resolve to NOT-dev.
test('instance guards: a LABEL alone is NOT dev — the ambiguous case fails closed (A5)', () => {
  instCtx._p = { INSTANCE_LABEL: 'DEV' };
  assert.strictEqual(instCtx.instanceLabel_(), 'DEV');
  assert.strictEqual(instCtx.isDevInstance_(), false,
    'a label with no explicit INSTANCE_IS_PROD is ambiguous — prod labels itself too');
  assert.throws(() => instCtx.assertDevInstance_('devScrubRoster_'), /not a confirmed DEV instance/);
});
test('instance guards: BOTH markers present → dev tools and the full suite are allowed', () => {
  instCtx._p = { INSTANCE_LABEL: 'DEV', INSTANCE_IS_PROD: 'false' };
  assert.strictEqual(instCtx.isDevInstance_(), true);
  assert.doesNotThrow(() => instCtx.assertNotProdInstance_('runAllTests'));
  assert.doesNotThrow(() => instCtx.assertDevInstance_('devScrubRoster_'));
  // Whitespace/casing must not resurrect the ambiguous case.
  instCtx._p = { INSTANCE_LABEL: 'DEV', INSTANCE_IS_PROD: '   ' };
  assert.strictEqual(instCtx.isDevInstance_(), false, 'blank is still unset');
  instCtx._p = { INSTANCE_LABEL: 'DEV', INSTANCE_IS_PROD: ' TRUE ' };
  assert.strictEqual(instCtx.isDevInstance_(), false, 'TRUE in any casing is prod');
});
test('TRIPWIRE: destructive test writers + dev tools carry the right instance guard', () => {
  assert.ok(/assertNotProdInstance_\(/.test(extractRawFunction('Tests.js', 'runAllTests')),
    'runAllTests must refuse on prod (no TEST_ rows in live payroll/PHI)');
  assert.ok(/assertNotProdInstance_\(/.test(extractRawFunction('Tests.js', 'setupTestEnvironment')),
    'setupTestEnvironment must refuse on prod');
  assert.ok(/assertDevInstance_\(/.test(extractRawFunction('DevTools.js', 'devScrubRoster_')),
    'devScrubRoster_ MUTATES the roster — must be dev-only (bulletproof guard)');
  assert.ok(/assertDevInstance_\(/.test(extractRawFunction('DevTools.js', 'devShowConfig_')),
    'devShowConfig_ must be dev-only');
});

console.log('\nCode.js — PTO reconciliation half-day-pair exemption (cycle 7 · L-4)');
{
  vm.runInContext(extractRawFunction('Code.js', 'ptoLegitHalfDayPair_'), sb, { filename: 'Code.js#ptoLegitHalfDayPair_' });
  test('ptoLegitHalfDayPair_: Morning+Afternoon pair is legitimate; dup same-half / full-day pairs are not', () => {
    const legit = [{ type: 'Half Day - Morning', days: 0.5 }, { type: 'Half Day - Afternoon', days: 0.5 }];
    assert.strictEqual(sb.ptoLegitHalfDayPair_(legit), true, 'complementary halves = a legitimate full day');
    assert.strictEqual(sb.ptoLegitHalfDayPair_([legit[1], legit[0]]), true, 'order-insensitive');
    assert.strictEqual(sb.ptoLegitHalfDayPair_([legit[0], legit[0]]), false, 'Morning+Morning IS the double-deduct signature');
    assert.strictEqual(sb.ptoLegitHalfDayPair_([{ type: 'Full Day', days: 1 }, { type: 'Full Day', days: 1 }]), false);
    assert.strictEqual(sb.ptoLegitHalfDayPair_([{ type: 'Full Day', days: 1 }, legit[0]]), false, 'Full+Half stays flagged');
    assert.strictEqual(sb.ptoLegitHalfDayPair_(legit.concat([legit[0]])), false, 'exactly-two only');
    assert.strictEqual(sb.ptoLegitHalfDayPair_(null), false);
  });
}

console.log('\nCode.js — AuditLog typed reader (auditRowObj_) + coercion tripwires (Batch 3; M-3/M-4/F1 class)');
// Batch 3: the AuditLog was the one core sheet with NO named column enum, so its
// coerced cells were read by bare index (`auditData[i][5]`) — untrippable, which
// is why F1 (raw PunchDate) slipped every per-function tripwire. All coerced-col
// reads now route through the typed auditRowObj_; these pin that boundary.
test('TRIPWIRE (Batch 3): auditRowObj_ recovers every coerced AuditLog column via its normalize helper', () => {
  const src = extractRawFunction('Code.js', 'auditRowObj_');
  assert.ok(/normalizeAuditTs_\(row\[AUDIT\.TS\]\)/.test(src), 'TS recovered via normalizeAuditTs_');
  assert.ok(/normalizeDate_\(row\[AUDIT\.PUNCH_DATE\]\)/.test(src),
    'PunchDate is a Sheets-coerced Date — a raw String() yields "Wed Jul 15 2026 …" and breaks the compliance "View note" deep-link (F1)');
  assert.ok(/normalizeTime_\(row\[AUDIT\.PUNCH_TIME\]\)/.test(src),
    'PunchTime is a coerced time Date — raw String() renders a constant "12:00 AM" (M-3)');
  assert.ok(/AUDIT\.IS_ADJUSTMENT\][^;]*\.toUpperCase\(\)\s*===\s*'TRUE'/.test(src),
    "IsAdjustment is a coerced native boolean — String(true) === 'TRUE' is always false; compare case-insensitively (M-4)");
});
test('TRIPWIRE (Batch 3): the AuditLog object-readers route through auditRowObj_', () => {
  ['getManagerDashboard', 'cnReadCallNoteAuditRows_'].forEach((fn) => {
    assert.ok(/auditRowObj_\(/.test(extractRawFunction('Code.js', fn)),
      fn + ' must build its audit rows via auditRowObj_ (single coercion-recovery point)');
  });
});
test('TRIPWIRE (Batch 3): no raw read of a coerced AUDIT column outside auditRowObj_ — the F1-catching net', () => {
  // Global source scan (the INV-142 pattern): every read of a COERCED AuditLog
  // column (PUNCH_DATE / PUNCH_TIME / IS_ADJUSTMENT) must sit inside the typed
  // reader. A write (`= …` / `+ 1`) or a comment line is exempt. A new function
  // reading `row[AUDIT.PUNCH_DATE]` raw now fails CI (F1 would have).
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const reader = extractRawFunction('Code.js', 'auditRowObj_');
  const COERCED = /\[AUDIT\.(PUNCH_DATE|PUNCH_TIME|IS_ADJUSTMENT)\]/;
  // Cycle 10: `=(?!=)` — a raw comparison read must NOT pass as a write
  // (same hardening as the CN.TIMESTAMP scan above).
  const WRITE_OR_COMMENT = /AUDIT\.(PUNCH_DATE|PUNCH_TIME|IS_ADJUSTMENT)\]\s*=(?!=)|AUDIT\.(PUNCH_DATE|PUNCH_TIME|IS_ADJUSTMENT) \+ 1|^\s*\/\//;
  const offenders = [];
  src.split('\n').forEach((line, idx) => {
    if (!COERCED.test(line) || WRITE_OR_COMMENT.test(line)) return;
    if (reader.indexOf(line) >= 0) return;   // inside auditRowObj_ — the sanctioned reader
    offenders.push('line ' + (idx + 1) + ': ' + line.trim());
  });
  assert.deepStrictEqual(offenders, [],
    'raw coerced-AUDIT-column read(s) outside auditRowObj_ — route through the typed reader (Batch 3 / F1 class)');
});

// Runtime proof the typed reader actually recovers coerced cells (stub its
// normalize deps, the formTokenCellMs_ pattern).
vm.runInContext(
  'var AUDIT = { TS:0, EMP_ID:1, EMP_NAME:2, ACTOR:3, ACTION:4, PUNCH_DATE:5, PUNCH_TIME:6, IS_ADJUSTMENT:7, DAYS_BACK:8, NOTES:9 };' +
  'function normalizeAuditTs_(v){ return v instanceof Date ? ("TS:"+v.getTime()) : String(v==null?"":v).trim(); }' +
  'function normalizeDate_(v){ return v instanceof Date ? ("DATE:"+v.getUTCFullYear()) : String(v==null?"":v).substring(0,10); }' +
  'function normalizeTime_(v){ return v instanceof Date ? ("TIME:"+v.getTime()) : String(v==null?"":v); }',
  sb, { filename: 'test#auditRowObj_deps' });
vm.runInContext(extractRawFunction('Code.js', 'auditRowObj_'), sb, { filename: 'Code.js#auditRowObj_' });
const auditRowObj_ = sb.auditRowObj_;
test('auditRowObj_: recovers a coerced-Date PunchDate + a native-boolean IsAdjustment', () => {
  // The F1/M-4 shapes: Sheets returns a Date for PunchDate and a boolean for IsAdjustment.
  const coerced = auditRowObj_([new Date(), 'E1', 'Ann', 'ann@x.com', 'CallNoteCreate',
    new Date(Date.UTC(2026, 6, 15)), new Date(), true, 3, 'noteId=abc']);
  assert.ok(/^DATE:2026/.test(coerced.punchDate), 'coerced-Date PunchDate recovered via normalizeDate_, not a raw blob');
  assert.strictEqual(coerced.isAdjustment, true, 'native-boolean true → true');
  assert.strictEqual(coerced.daysBack, 3);
  assert.strictEqual(coerced.notes, 'noteId=abc');
});
test('auditRowObj_: string cells pass through; FALSE/blank isAdjustment is false', () => {
  const s = auditRowObj_(['2026-07-15 10:00:00', 'E2', 'Bob', 'bob@x.com', 'CallNoteFlag',
    '2026-07-15', '10:00:00', 'FALSE', 0, 'noteId=xyz']);
  assert.strictEqual(s.punchDate, '2026-07-15', 'string PunchDate untouched');
  assert.strictEqual(s.isAdjustment, false, "'FALSE' → false");
  assert.strictEqual(auditRowObj_([]).isAdjustment, false, 'missing → false');
});

console.log('\nCode.js — spreadsheet-creation timezone/locale tripwires (cycle 7 · H-2/M-14 class)');
test('TRIPWIRE (H-2): createPinnedSpreadsheet_ pins BOTH tz and locale to the ADP sheet', () => {
  const src = extractRawFunction('Code.js', 'createPinnedSpreadsheet_');
  assert.ok(/setSpreadsheetTimeZone\(/.test(src),
    'the factory must pin tz — a script-tz sheet shifts every raw coerced Date/time cell copied into it (the payroll export, H-2)');
  assert.ok(/setSpreadsheetLocale\(/.test(src),
    'the factory must pin locale — a coercing locale turns stored ISO-T strings into Dates on read (the formTokenCellMs_/M-14 class)');
});
test('TRIPWIRE (H-2): no bare SpreadsheetApp.create() outside createPinnedSpreadsheet_', () => {
  // Strip comments first — the factory's own doc comment (and others) mention
  // the call by name; only real call sites should count.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const factorySrc = stripComments(extractRawFunction('Code.js', 'createPinnedSpreadsheet_'));
  const factoryCreates = (factorySrc.match(/SpreadsheetApp\.create\(/g) || []).length;
  const totalCreates = (stripComments(codeSrc).match(/SpreadsheetApp\.create\(/g) || []).length;
  assert.strictEqual(factoryCreates, 1, 'the factory itself creates exactly once');
  assert.strictEqual(totalCreates, 1,
    'every new spreadsheet must go through createPinnedSpreadsheet_ (tz+locale pin) — a bare ' +
    'SpreadsheetApp.create() inherits the script tz + deployer locale, the exact H-2/M-14 bug class');
});
test('TRIPWIRE (H-2): export + provisioning route through the factory', () => {
  ['generateExportSheet_', 'exportCallNotesRange', 'provisionCallNotesSheet'].forEach((fn) => {
    const src = extractRawFunction('Code.js', fn);
    assert.ok(/createPinnedSpreadsheet_\(/.test(src), fn + ' uses createPinnedSpreadsheet_');
  });
});

console.log('\nCode.js — feature-flag registry + getFlag_ (Plan A)');
// These server helpers reference CONFIG (registry defaults) + PropertiesService
// (the override store). Build a dedicated vm context with minimal stubs, then
// load the FEATURE_FLAGS const + the flag helpers straight from Code.js.
const flagCtx = {
  Object, Array, JSON, String, Boolean, console,
  CONFIG: {
    SHOW_TEAMMATE_STATUS: true, SHOW_TEAMMATE_TYPE: true, ENABLE_PTO_TRACKING: true,
    CALL_NOTES: { VOICE_INPUT_ENABLED: false },
  },
  _props: {},
};
flagCtx.PropertiesService = {
  getScriptProperties: function () {
    return { getProperty: function (k) {
      return Object.prototype.hasOwnProperty.call(flagCtx._props, k) ? flagCtx._props[k] : null;
    } };
  },
};
vm.createContext(flagCtx);
const ffSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
const ffConst = ffSrc.match(/const (FEATURE_FLAGS\s*=\s*\[[\s\S]*?\];)/);
assert.ok(ffConst, 'FEATURE_FLAGS declaration found in Code.js');
vm.runInContext(ffConst[1] + ';', flagCtx, { filename: 'Code.js#FEATURE_FLAGS' });
['featureFlagDef_', 'getFlagOverrides_', 'getFlag_', 'getFeatureFlagsResolved_'].forEach(function (fn) {
  vm.runInContext(extractRawFunction('Code.js', fn), flagCtx, { filename: 'Code.js#' + fn });
});

test('registry integrity: unique keys, boolean defaults, valid scope, labelled', () => {
  const seen = {};
  flagCtx.FEATURE_FLAGS.forEach(function (f) {
    assert.ok(f.key && !seen[f.key], 'unique key: ' + f.key); seen[f.key] = 1;
    assert.strictEqual(typeof f.default, 'boolean', f.key + ' default must be boolean');
    assert.ok(['client', 'server', 'both'].indexOf(f.scope) >= 0, f.key + ' scope must be valid');
    assert.ok(f.label, f.key + ' must have a label');
  });
});
test('getFlag_ returns the registry default when no override is set', () => {
  flagCtx._props = {};
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), true);
  assert.strictEqual(flagCtx.getFlag_('voiceInput'), false);
});
test('getFlag_ honors a Script-Property override (both directions, string + bool)', () => {
  flagCtx._props = { CN_FEATURE_FLAGS: JSON.stringify({ oopSalesTax: false, voiceInput: true }) };
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), false);
  assert.strictEqual(flagCtx.getFlag_('voiceInput'), true);
});
test('getFlag_ fails safe: corrupt blob → defaults, unknown key → false', () => {
  flagCtx._props = { CN_FEATURE_FLAGS: '{not valid json' };
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), true);   // corrupt → registry default
  flagCtx._props = {};
  assert.strictEqual(flagCtx.getFlag_('totallyUnknownFlag'), false);  // unknown → fail-safe false
});
test('getFeatureFlagsResolved_ returns a boolean for every registry key', () => {
  flagCtx._props = {};
  const r = flagCtx.getFeatureFlagsResolved_();
  flagCtx.FEATURE_FLAGS.forEach(function (f) {
    assert.strictEqual(typeof r[f.key], 'boolean', f.key + ' resolved to a boolean');
  });
});

console.log('\nCode.js — branded email builders escape user data (#2 INV-105)');
// buildBrandedEmailHtml_ embeds bodyHtml raw (callers pre-esc_ it) but esc_'s
// the heading; brandedKvRows_ esc_'s both label and value. A new field added
// without esc_ is stored XSS in the sent email — these pin that discipline.
// Source esc_ + CN_EMAIL_PALETTE + the two builders straight from Code.js.
const palMatch = codeSrc.match(/const (CN_EMAIL_PALETTE\s*=\s*\{[\s\S]*?\});/);
assert.ok(palMatch, 'CN_EMAIL_PALETTE declaration found in Code.js');
vm.runInContext(palMatch[1] + ';', sb, { filename: 'Code.js#CN_EMAIL_PALETTE' });
['esc_', 'buildBrandedEmailHtml_', 'brandedKvRows_'].forEach(function (fn) {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
const buildBrandedEmailHtml_ = sb.buildBrandedEmailHtml_;
const brandedKvRows_ = sb.brandedKvRows_;

test('buildBrandedEmailHtml_ escapes the heading, embeds caller-escaped body raw', () => {
  const html = buildBrandedEmailHtml_('<img src=x onerror=alert(1)>', '<p>trusted body</p>');
  assert.strictEqual(html.indexOf('<img src=x onerror=alert(1)>'), -1, 'raw heading must not appear');
  assert.ok(html.indexOf('&lt;img src=x onerror=alert(1)&gt;') >= 0, 'heading is HTML-escaped');
  assert.ok(html.indexOf('<p>trusted body</p>') >= 0, 'bodyHtml embeds raw by design (caller esc_s it)');
});
test('brandedKvRows_ escapes BOTH label and value', () => {
  const rows = brandedKvRows_([['Re<b>ason', 'a"<script>x']]);
  assert.strictEqual(rows.indexOf('<b>ason'), -1, 'no raw label markup');
  assert.strictEqual(rows.indexOf('<script>'), -1, 'no raw value markup');
  assert.ok(rows.indexOf('Re&lt;b&gt;ason') >= 0, 'label escaped');
  assert.ok(rows.indexOf('a&quot;&lt;script&gt;x') >= 0, 'value escaped');
});
test('branded email chrome: logo bar degrades, heading is a heading, CTA is opt-in', () => {
  const html = buildBrandedEmailHtml_('ADP export ready', '<p>body</p>',
    { tone: 'info', subLabel: 'Payroll', ctaUrl: 'https://example.invalid/x', ctaLabel: 'Open it' });
  // Many mail clients block remote images by default, so the identity cannot
  // depend on the logo loading — the alt text IS the fallback wordmark and the
  // cell carries its type styling.
  assert.ok(/<img [^>]*alt="UMS Team Tools"/.test(html), 'the logo has a wordmark alt, not a bare "UMS"');
  // The mark sits on the CARD over a navy rule, the treatment every other
  // email in the app uses — and not on a navy band, because logoUrl is a JPEG
  // with no transparency, which a navy band would frame as a white rectangle.
  const logoCell = /<td style="([^"]*)"[^>]*>\s*<img [^>]*alt="UMS Team Tools"/.exec(html.replace(/\n/g, ''));
  assert.ok(logoCell, 'the logo sits in a styled cell');
  assert.ok(/border-bottom:2px solid/.test(logoCell[1]), 'the mark sits over the navy rule');
  assert.ok(!/background:\s*#223b5d/.test(logoCell[1]), 'the mark is never placed on a navy fill (the JPEG has no transparency)');
  assert.ok(/color:#223b5d/.test(logoCell[1]),
    'the cell colours its own text so a BLOCKED image still reads as the brand');
  // The heading used to be an 11px mono chip — the least prominent thing in a
  // message whose whole job is that one line.
  assert.ok(/font-size:22px[^"]*"[^>]*>ADP export ready/.test(html.replace(/\n/g, '')),
    'the heading renders at heading size');
  assert.ok(html.indexOf('Open it') >= 0 && html.indexOf('https://example.invalid/x') >= 0, 'the CTA renders');
  // A missing url or label must drop the button rather than ship a dead one.
  const noCta = buildBrandedEmailHtml_('x', '<p>b</p>', { ctaLabel: 'Open it' });
  assert.strictEqual(noCta.indexOf('Open it'), -1, 'no CTA without a url');
  // The eyebrow names a module; blank by default (repeating the wordmark beside
  // the wordmark is worse than nothing).
  assert.ok(html.indexOf('Payroll') >= 0, 'subLabel renders as the eyebrow');
  assert.strictEqual(buildBrandedEmailHtml_('x', '').indexOf('Notification'), -1,
    'no generic "Notification" eyebrow');
  // Email-safe: no layout property an Outlook client drops (the documented rule).
  assert.ok(!/display:\s*flex|[^-]gap:|filter:/.test(html), 'no flex/gap/filter in email HTML');
});

test('branded email CTA deep-links point at REGISTERED tab keys', () => {
  // A CTA is the one part of these emails that can be silently wrong: a stale
  // tab key still renders a button, it just lands on the default view.
  const nc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const code = nc(fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8'));
  const used = [...code.matchAll(/safeWebAppUrl_\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(used.length >= 4, `CTAs are wired (found ${used.length})`);
  const core = extractScript('script_core.html');
  const tabs = new Set([...core.slice(core.indexOf('const TOOLS = {')).matchAll(/^\s{6}([a-zA-Z]+):\s*\{/gm)].map((m) => m[1]));
  used.forEach((k) => assert.ok(tabs.has(k), `CTA deep-link '${k}' is a registered TOOLS tab key`));
  // Resolution failure drops the button; it never ships a broken href.
  const helper = nc(extractRawFunction('Code.js', 'safeWebAppUrl_'));
  assert.ok(/catch \(e\) \{ return ''; \}/.test(helper) && /if \(!base\) return '';/.test(helper),
    'an unresolvable web-app URL yields empty, which suppresses the CTA');
});

test('branded builders never throw on null / empty inputs', () => {
  assert.doesNotThrow(() => buildBrandedEmailHtml_('', ''));
  assert.doesNotThrow(() => brandedKvRows_([['x', null], [null, undefined]]));
});

// Cycle 9 · M-7 — NO mail send may be reachable inside a locked region. A
// MailApp send is ~0.3–0.5s (an '*' training assignment looped the WHOLE
// roster), and every mutating write shares ONE global ScriptLock with a 15s
// waitLock ceiling — mail inside the lock starves punch/note writes (the
// kbUploadImage / 6pm-archive class). The converted sites defer via a
// `notifyAfter = function () { … };` closure that the finally invokes AFTER
// releaseLock — those closures (and the explicit allowlist) are the only
// exemptions. Two-level scan: inventory every function whose body touches
// MailApp., then flag any locked try-region (waitLock → last finally) that
// references one outside a notifyAfter closure.
test('TRIPWIRE (M-7): no mail sender is called inside a locked region (post-lock notifyAfter + allowlist exempt)', () => {
  const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const funcs = {};
  const fre = /^function (\w+)\(/gm;
  let fm;
  while ((fm = fre.exec(codeSrc))) {
    let i = codeSrc.indexOf('{', fre.lastIndex - 1), depth = 0, j = i;
    for (; j < codeSrc.length; j++) {
      if (codeSrc[j] === '{') depth++;
      else if (codeSrc[j] === '}') { depth--; if (depth === 0) break; }
    }
    funcs[fm[1]] = codeSrc.slice(fm.index, j + 1);
  }
  // Cycle 10: GmailApp.sendEmail joins the inventory — GmailApp is already an
  // authorized project global (Spanish inbox READS), so a future Gmail-based
  // sender would have escaped a MailApp-only scan. Reads (search/getThread)
  // stay out: the documented locked Spanish scope-guard reads are deliberate.
  const senders = Object.keys(funcs).filter((n) => {
    const sb = stripC(funcs[n]);
    return sb.indexOf('MailApp.') >= 0 || sb.indexOf('GmailApp.sendEmail') >= 0;
  });
  assert.ok(senders.length >= 15, 'mail-sender inventory armed (got ' + senders.length + ')');
  // Cycle-11 (tripwire hole): TRANSITIVE closure — a locked fn calling a
  // mail-free wrapper that itself calls a sender escaped the depth-1
  // inventory. Expansion uses notifyAfter-STRIPPED bodies so a function whose
  // only sender reference is its own post-lock closure (the sanctioned
  // pattern) doesn't itself become "a sender" and cascade false positives.
  const senderSet = new Set(senders);
  const strippedBody = (n) => stripC(funcs[n])
    .replace(/notifyAfter = function \(\) \{[^{}]*\};/g, '');
  let grew = true;
  while (grew) {
    grew = false;
    Object.keys(funcs).forEach((n) => {
      if (senderSet.has(n)) return;
      const sb2 = strippedBody(n);
      for (const s of senderSet) {
        if (new RegExp('\\b' + s + '\\s*\\(').test(sb2)) { senderSet.add(n); grew = true; return; }
      }
    });
  }
  const sendersAll = [...senderSet];
  // Deliberate in-lock senders, each with a load-bearing reason:
  const ALLOWLIST = {
    emailFromCallNote: 'INV-42 — send-then-stamp is one locked unit: the send outcome decides success:false vs stamp, and the stamp must not race a concurrent edit',
  };
  const offenders = [];
  Object.keys(funcs).forEach((n) => {
    const sb = stripC(funcs[n]);
    if (sb.indexOf('waitLock(') < 0) return;
    const finIdx = sb.lastIndexOf('finally');
    if (finIdx < 0) return;
    // Cycle-11 (tripwire hole): the locked region ends at the last
    // releaseLock() — not at `finally` — so a sender placed inside the
    // finally BEFORE the release (still in-lock) is scanned too. The
    // sanctioned post-lock notifyAfter() invocation sits AFTER releaseLock().
    const relIdx = sb.lastIndexOf('releaseLock()');
    let region = sb.slice(sb.indexOf('waitLock('), relIdx >= 0 ? relIdx : finIdx);
    region = region.replace(/notifyAfter = function \(\) \{[^{}]*\};/g, '');
    const hits = sendersAll.filter((s) => new RegExp('\\b' + s + '\\s*\\(').test(region));
    if (region.indexOf('MailApp.') >= 0) hits.push('MailApp.');
    if (region.indexOf('GmailApp.sendEmail') >= 0) hits.push('GmailApp.sendEmail');
    if (hits.length && !ALLOWLIST[n]) offenders.push(n + ' → ' + hits.join(','));
  });
  assert.deepStrictEqual(offenders, [],
    'mail reachable inside a locked region — move it to a post-lock notifyAfter closure (or allowlist it WITH a reason): ' + offenders.join(' | '));

  // Cycle 10 — INV-01 structural companion: every waitLock( function must
  // have a finally that releases the lock. Two compounding holes closed:
  // INV-01's finally/releaseLock structure had NO pin across the ~60
  // waitLock sites, and the mail scan above SKIPS a locked function with no
  // finally — so a lock leak also silently exempted it from the mail check.
  let lockedCount = 0;
  const lockOffenders = [];
  Object.keys(funcs).forEach((n) => {
    const sb = stripC(funcs[n]);
    if (sb.indexOf('waitLock(') < 0) return;
    lockedCount++;
    const finIdx = sb.lastIndexOf('finally');
    if (finIdx < 0 || sb.indexOf('releaseLock', finIdx) < 0) lockOffenders.push(n);
  });
  assert.ok(lockedCount >= 40, 'locked-function inventory armed (got ' + lockedCount + ')');
  assert.deepStrictEqual(lockOffenders, [],
    'waitLock( without a finally releaseLock() — INV-01 requires finally-release: ' + lockOffenders.join(', '));
});

console.log('\nCode.js — automation trigger wiring is self-consistent (#3 coupling tripwire)');
// Guards the class of bug that bit purgeOldCallNotes: a ScriptApp.newTrigger('X')
// whose handler is missing from the TARGETS arrays. TARGETS drives BOTH the
// pre-install dedupe loop AND removeAutomationTriggers, so a missing entry means
// re-running install DUPLICATES that trigger and remove can't clean it up.
const installSrc = extractRawFunction('Code.js', 'installAutomationTriggers');
const removeSrc  = extractRawFunction('Code.js', 'removeAutomationTriggers');
function targetsSet_(fnSrc) {
  const m = fnSrc.match(/const TARGETS = \[([\s\S]*?)\]/);
  assert.ok(m, 'TARGETS array found');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}
const newTriggerHandlers = [...installSrc.matchAll(/newTrigger\('([^']+)'\)/g)].map((x) => x[1]).sort();
const installTargets = targetsSet_(installSrc);
const removeTargets  = targetsSet_(removeSrc);

test('every installed trigger handler is in the install TARGETS dedupe list', () => {
  assert.ok(newTriggerHandlers.length >= 8, 'parsed the newTrigger handlers (got ' + newTriggerHandlers.length + ')');
  newTriggerHandlers.forEach((h) => assert.ok(installTargets.indexOf(h) >= 0,
    'newTrigger("' + h + '") is missing from install TARGETS → re-install would duplicate it'));
});
test('install TARGETS lists nothing it does not also create', () => {
  installTargets.forEach((t) => assert.ok(newTriggerHandlers.indexOf(t) >= 0,
    'TARGETS lists "' + t + '" but no newTrigger creates it'));
});
test('removeAutomationTriggers TARGETS matches the install set (cleans up all it adds)', () => {
  assert.deepStrictEqual(removeTargets, installTargets,
    'install and remove TARGETS must list the same handlers');
});

console.log('\nCode.js — every trigger-TARGETS handler uses the assertManagerCaller_ gate (F1 tripwire)');
// F1 (cycle 6): reconcileCallNotes was a daily TRIGGER gated on emp.isAdmin —
// under a narrowed ADMIN_EMAILS (or a non-roster installer) the nightly run
// silently no-op'd. A trigger handler's gate MUST be MANAGER_EMAILS
// (assertManagerCaller_), NEVER emp.isAdmin/roster, because the installer is
// validated against MANAGER_EMAILS. The existing tripwire above only checks
// trigger WIRING; this one checks the GATE TYPE inside each handler body.
// Strip JS comments first — a handler's comment may legitimately MENTION
// emp.isAdmin (e.g. reconcileCallNotes documents "NOT emp.isAdmin"); we only
// care about an isAdmin reference in executable code.
function stripJsComments_(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}
newTriggerHandlers.forEach((h) => {
  test('trigger handler ' + h + ' gates via assertManagerCaller_, not emp.isAdmin', () => {
    const src = stripJsComments_(extractRawFunction('Code.js', h));
    assert.ok(/assertManagerCaller_\s*\(/.test(src),
      h + ': a trigger handler must call assertManagerCaller_ — a narrowed ADMIN_EMAILS / non-roster installer would otherwise silently no-op it (F1)');
    assert.ok(!/\.isAdmin\b/.test(src),
      h + ': a trigger handler must NOT gate on .isAdmin in code — the trigger runs as the installer (MANAGER_EMAILS), so an admin/roster gate can diverge (F1)');
  });
});

console.log('\nParallel-source coupling registry — key-set ⊆ relations (Axis-B drift net)');
// The project's recurring bug GENUS: the same value duplicated across places that
// drift (the F5 Automation-Health labels this cycle; layout mirrors;
// LEAVE_DEDUCTION_CLIENT ↔ getLeaveDeduction_; CN_EMAIL_PALETTE ↔ tokens; ...).
// This is the declarative HOME for SOURCE-LEVEL key-set couplings: each entry
// extracts a `sub` set + a `sup` set and the runner asserts sub ⊆ sup, so the
// NEXT such coupling is ONE registry entry instead of a hand-rolled test. NOTE:
// couplings that need a vm-LOADED value or aren't a plain key-set comparison keep
// their own bespoke tripwires (the day-type↔validator check above; the trigger
// wiring + gate-type checks; the intake layout-row mirror + forms-ID mirror; the
// design-token hygiene + SUBMITTED_AT coercion tripwires) — they're registry-
// ADJACENT but each carries custom logic the generic runner can't express.
const cnHealthSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
// Reusable extractors over raw source (each returns a string[] of keys/items):
function topLevelObjectKeys_(src, declRe, label) {   // multi-line `key: {...},`
  const m = src.match(declRe);
  assert.ok(m, label + ' object literal not found');
  // line-leading `key:` — nested { label, expect } sit after `{` on the same line.
  return [...m[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)].map((x) => x[1]);
}
function flatObjectKeys_(src, declRe, label) {       // single-line `{ a: 1, b: 2 }`
  const m = src.match(declRe);
  assert.ok(m, label + ' object literal not found');
  return [...m[1].matchAll(/([A-Za-z_]\w*)\s*:/g)].map((x) => x[1]);
}
function stringArrayItems_(src, declRe, label) {     // `[ 'a', 'b' ]`
  const m = src.match(declRe);
  assert.ok(m, label + ' array literal not found');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const COUPLING_REGISTRY = [
  {
    name: 'Automation-Health DIGEST_LABELS ⊇ server DIGEST_STALE_HOURS keys (F5)',
    sub: () => flatObjectKeys_(codeSrc, /DIGEST_STALE_HOURS\s*=\s*\{([^}]*)\}/, 'DIGEST_STALE_HOURS'),
    sup: () => topLevelObjectKeys_(cnHealthSrc, /DIGEST_LABELS\s*=\s*\{([\s\S]*?)\n\s*\};/, 'DIGEST_LABELS'),
    why: 'the Automation-Health panel would render the raw digest key',
    minSub: 4,
  },
  {
    name: 'Automation-Health CN_HEALTH_RUN_LABELS ⊇ AUTOMATION_AUDIT_ACTIONS (F5)',
    sub: () => stringArrayItems_(codeSrc, /AUTOMATION_AUDIT_ACTIONS\s*=\s*\[([\s\S]*?)\]/, 'AUTOMATION_AUDIT_ACTIONS'),
    sup: () => topLevelObjectKeys_(cnHealthSrc, /CN_HEALTH_RUN_LABELS\s*=\s*\{([\s\S]*?)\n\s*\};/, 'CN_HEALTH_RUN_LABELS'),
    why: 'the Automation-Health panel would render the raw automation-action key',
    minSub: 6,
  },
];
COUPLING_REGISTRY.forEach((c) => {
  test('coupling — ' + c.name, () => {
    const sub = c.sub(), sup = c.sup();
    if (c.minSub) assert.ok(sub.length >= c.minSub,
      c.name + ': parsed only ' + sub.length + ' source keys (' + sub.join(',') + ') — extractor may be stale');
    sub.forEach((k) => assert.ok(sup.indexOf(k) >= 0,
      c.name + ': "' + k + '" is in the source set but MISSING downstream — ' + c.why));
  });
});

// ── Batch K (D) — MIRROR INDEX ──────────────────────────────────────────────
// The single documented registry of every known client↔server (or
// file↔file) parallel-source mirror, each pointing at the tripwire that
// guards it. The index is SELF-CHECKING: each guard string must appear
// elsewhere in this file (the real test's name/assertion), so a renamed or
// deleted tripwire breaks the index instead of silently orphaning the
// mirror. Adding a new mirror = add the pair here + its guard test.
// `guards: []` entries are deliberate manual-discipline mirrors (documented
// in CLAUDE.md) that cannot be machine-checked — kept in the index so the
// full inventory lives in ONE place.
const MIRROR_INDEX = [
  // Cycle-15 F4: the visual fixture is a MIRROR too — it was outside this
  // registry and had already drifted from the server fold.
  { pair: 'test/visual mock.js groupQueueRows_/CDR_QUEUE_GROUPS ↔ Code.js (F4)',
    guards: ['F4: the visual fixture mirrors groupQueueRows_ and the CONFIG groups byte-for-byte'] },
  // Cycle-16 F7: cycle-15 F4 pinned this sentinel in the visual FIXTURE and
  // left the SHIPPING client on a bare literal — the mirror that mattered.
  { pair: 'client M_QUEUE_UNGROUPED ↔ server CDR_QUEUE_UNGROUPED (INV-181)',
    guards: ['F7: the client Ungrouped sentinel is named and mirrors the server'] },
  { pair: 'LEAVE_DEDUCTION_CLIENT ↔ getLeaveDeduction_ (INV-72)',
    guards: ['every LEAVE_DEDUCTION_CLIENT entry matches the server deduction',
             'TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT keys'] },
  { pair: 'day-type <select> options ⊆ TIME_OFF_TYPES (INV-95)',
    guards: ['every day-type <select> option is an accepted leave type'] },
  { pair: 'INTAKE_PMD/PAP_LAYOUT ↔ INTAKE_PMD/PAP_CLIENT (INV-112)',
    guards: ['client render layout mirrors the server'] },
  { pair: 'server kbSlug_ ↔ client kbSlug_ heading anchors',
    guards: ['server kbSlug_ matches kbMd_'] },
  { pair: 'kbCollectDocInlineImages_ ↔ converter Doc walk (INV-115)',
    guards: ['kbCollectDocInlineImages_ mirrors the converter walk'] },
  { pair: 'form_public SIG_PAD export cap ↔ EmpDocs pad cap (INV-96/122)',
    guards: ['signature-pad export cap parity'] },
  { pair: 'form_public typed-signature ↔ EmpDocs typed-signature (a11y)',
    guards: ['both pads carry setTypedName'] },
  { pair: 'client CN_SHEET_VIEWS ⊆ server adminSheetViewKeys_ (Tier 2)',
    guards: ['CN_SHEET_VIEWS keys ⊆ server adminSheetViewKeys_'] },
  { pair: 'DIGEST_LABELS ⊇ DIGEST_STALE_HOURS (COUPLING_REGISTRY)',
    guards: ['Automation-Health DIGEST_LABELS'] },
  { pair: 'CN_HEALTH_RUN_LABELS ⊇ AUTOMATION_AUDIT_ACTIONS (COUPLING_REGISTRY)',
    guards: ['Automation-Health CN_HEALTH_RUN_LABELS'] },
  { pair: 'CSR_TRANSFER_EXPECTED_HEADERS ↔ CSRT reader columns (L-2 cycle 11)',
    guards: ['csrTransferHeaderMismatches_'] },
  { pair: 'client CN_INTERACTIVE_FORM_IDS ↔ server INTERACTIVE_FORM_TYPES',
    guards: ['CN_INTERACTIVE_FORM_IDS (cn partial) === INTERACTIVE_FORM_TYPES'] },
  { pair: 'client errBeaconPayload_ caps ↔ server CLIENT_ERR_MSG_MAX/STACK_MAX (INV-150)',
    guards: ['capped at the server CLIENT_ERR_MSG_MAX mirror'] },
  { pair: 'client paste-upload cap ↔ server KB_IMG_UPLOAD_MAX_CHARS (INV-118)',
    guards: ['client paste cap mirrors the server KB_IMG_UPLOAD_MAX_CHARS'] },
  { pair: 'health badge ↔ failure digest problem derivation (batch K E)',
    guards: ['getAutomationHealthBadge consumes the SAME derivation'] },
  { pair: 'AUTO_COPY_FORMAT server CONFIG default ↔ client fallback',
    guards: ['client fallback mirrors the server CONFIG default'] },
  { pair: 'CN_EMAIL_PALETTE ↔ styles_design_tokens palette',
    guards: [],   // hand-resolved hex by design (email clients strip <style>)
    manual: 'CLAUDE.md "CN_EMAIL_PALETTE is hand-resolved from design tokens"' },
  { pair: 'PPD engine option values ↔ INTAKE_PPD_CONTROL (drift guards)',
    guards: ['end-to-end config-driven recommendation parity'] },
  // ── F17 (cycle 12): four live mirrors the index had missed. Each is a
  // client literal that must agree with a server enum; a drift is silent
  // (an unreachable period, a rejected severity, a chip that never groups,
  // a punch button with no glyph).
  { pair: 'client CLK_DASH_PERIODS ↔ server DASHBOARD_PERIOD_KEYS',
    guards: ['CLK_DASH_PERIODS === DASHBOARD_PERIOD_KEYS'] },
  { pair: 'coaching severity <select> ⊆ server COACH_SEVERITIES (INV-134)',
    guards: ['coaching severity options === COACH_SEVERITIES'] },
  { pair: 'cnExtLinkOptionsHtml_ inlined categories ↔ CN_EXTERNAL_LINK_CATEGORIES',
    guards: ['ext-link category labels mirror CN_EXTERNAL_LINK_CATEGORIES'] },
  { pair: 'PUNCH_META keys ⊇ server PUNCH_LABELS_ (INV-155 button render)',
    guards: ['PUNCH_META covers every PUNCH_LABELS_ type'] },
];
console.log('\nclient — mirror index (batch K D: every mirror names a live guard)');
test('mirror index — every listed guard test exists in this file', () => {
  const self = fs.readFileSync(__filename, 'utf8');
  MIRROR_INDEX.forEach((m) => {
    (m.guards || []).forEach((g) => {
      // The guard string must appear at least twice: once in this index
      // literal, once in the real test it points at.
      const n = self.split(g).length - 1;
      assert.ok(n >= 2, 'mirror "' + m.pair + '": guard "' + g +
        '" not found elsewhere in run.js — its tripwire was renamed or removed');
    });
    if (!m.guards.length) assert.ok(m.manual, 'unguarded mirror "' + m.pair + '" must document its manual discipline');
  });
});
// ── F17 (cycle 12): the four mirrors the index was missing. ────────────────
// Each extracts BOTH sides from raw source, so a rename on either side fails.
function arrayLiteral_(src, name) {
  const m = new RegExp('(?:const|var|let)\\s+' + name + '\\s*=\\s*\\[([^\\]]*)\\]').exec(src);
  assert.ok(m, name + ' array literal found');
  return m[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

test('F17: client CLK_DASH_PERIODS === DASHBOARD_PERIOD_KEYS', () => {
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  const client = arrayLiteral_(clk, 'CLK_DASH_PERIODS');
  const server = arrayLiteral_(codeSrc, 'DASHBOARD_PERIOD_KEYS');
  // Order matters: it drives the carousel's segmented-chip order AND the
  // three up-front getDashboardMetrics fetches.
  assert.deepStrictEqual(client, server,
    'a client period the server rejects renders a permanently-empty carousel slide, ' +
    'and a server period the client omits is simply unreachable');
});

test('F17: coaching severity options === COACH_SEVERITIES', () => {
  const co = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_coaching.html'), 'utf8');
  const sel = co.slice(co.indexOf("<select id=\"coach-sev\">"));
  const opts = (sel.slice(0, sel.indexOf('</select>')).match(/value="([a-z]+)"/g) || [])
    .map((v) => v.replace(/value="|"/g, ''));
  const server = arrayLiteral_(codeSrc, 'COACH_SEVERITIES');
  assert.deepStrictEqual(opts, server,
    'coachValidate_ whitelists against COACH_SEVERITIES — an option outside it is ' +
    'rejected server-side after the manager has typed the whole coaching note');
});

test('F17: ext-link category labels mirror CN_EXTERNAL_LINK_CATEGORIES', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const m = /var catLabels = \[([\s\S]*?)\];/.exec(cn);
  assert.ok(m, 'the composer picker\'s inlined catLabels literal found');
  const clientCats = (m[1].match(/\['([a-z]+)'/g) || []).map((x) => x.replace(/\['|'/g, ''));
  const server = arrayLiteral_(codeSrc, 'CN_EXTERNAL_LINK_CATEGORIES');
  assert.deepStrictEqual(clientCats, server,
    'cnExtLinkOptionsHtml_ inlines its categories deliberately (so it unit-tests ' +
    'in isolation) — a server category missing here silently never groups, and its ' +
    'links vanish from the picker');
});

test('F17: PUNCH_META covers every PUNCH_LABELS_ type', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const metaBlock = core.slice(core.indexOf('const PUNCH_META = {'));
  const metaKeys = (metaBlock.slice(0, metaBlock.indexOf('\n};')).match(/^\s{2}(\w+):/gm) || [])
    .map((k) => k.trim().replace(':', ''));
  const server = arrayLiteral_(codeSrc, 'PUNCH_LABELS_');
  const missing = server.filter((t) => metaKeys.indexOf(t) < 0);
  assert.deepStrictEqual(missing, [],
    'a server punch type with no PUNCH_META entry renders through the ' +
    "`|| { label:p.type, icon:'info' }` fallback — a raw type name and a generic " +
    'glyph on a punch button: ' + missing.join(', '));
  // Adjust is client-only (it opens a modal, it is not a punch type) — assert
  // the extra keys are exactly that, so a typo'd key can't hide here.
  assert.deepStrictEqual(metaKeys.filter((k) => server.indexOf(k) < 0), ['Adjust'],
    'PUNCH_META may carry only the one client-only entry (Adjust)');
});

test('AUTO_COPY_FORMAT: client fallback mirrors the server CONFIG default', () => {
  // Both templates are same-shaped string-concat literals ending at the
  // {resolution} chunk; parse each and compare byte-for-byte. CLAUDE.md has
  // required this mirror ("keep them in sync") since the multi-line template
  // shipped — this is its first machine check.
  function concatTemplate(src, anchorRe, label) {
    const m = src.match(anchorRe);
    assert.ok(m, label + ' template anchor found');
    const tail = src.slice(m.index, m.index + 900);
    const chunks = tail.match(/'(?:[^'\\]|\\.)*'/g) || [];
    const out = [];
    for (const c of chunks) {
      out.push(c.slice(1, -1).replace(/\\n/g, '\n'));
      if (c.indexOf('{resolution}') >= 0) break;
    }
    return out.join('');
  }
  const cnFullSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const server = concatTemplate(codeSrc, /AUTO_COPY_FORMAT:/, 'server');
  const client = concatTemplate(cnFullSrc, /CN_STATE\.autoCopyFormat\s*\|\|/, 'client');
  assert.ok(server.indexOf('{patientAndTrx}') >= 0, 'server template parsed (carries the Patient & TRX line)');
  assert.strictEqual(client, server,
    'the client first-copy fallback template drifted from the server CONFIG.CALL_NOTES.AUTO_COPY_FORMAT default');
});

console.log('\nCode.js — Sheets-coerced timestamp columns are read via normalizeAuditTs_ (M1 tripwire)');
// The Sheets-coercion class has now bitten twice (AuditLog timestamps, then
// TO.SUBMITTED_AT flattening the pending-trend sparkline to zero). Every read
// of a "yyyy-MM-dd HH:mm:ss" column in the ADP spreadsheet must route through
// normalizeAuditTs_ — a raw String(...) read of a coerced Date yields
// "Thu Jun 11 2026 ...", which silently fails every parse / date filter /
// chronological sort downstream.
test('no raw String() reads of TO/PAR.SUBMITTED_AT remain in Code.js', () => {
  const tsSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  // F(cycle-8 M-15): ANY-index scan — the old regex required the loop index to
  // literally be `i`, so `String(rows[j][TO.SUBMITTED_AT])` or a destructured
  // `String(row[TO.SUBMITTED_AT])` sailed past, re-opening the exact class the
  // tripwire exists for. Now any String( … [TO|PAR.SUBMITTED_AT] …) read
  // trips, whatever the receiver expression looks like.
  const raw = [...tsSrc.matchAll(/String\(\s*[\w.\[\]]*\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.deepStrictEqual(raw.map((m) => m[0]), [],
    'found raw String() read(s) of a SUBMITTED_AT cell — route through normalizeAuditTs_ (M1)');
  // And the normalized reads actually exist (the tripwire stays armed) — same
  // any-index shape.
  const normalized = [...tsSrc.matchAll(/normalizeAuditTs_\(\s*[\w.\[\]]*\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.ok(normalized.length >= 8, 'expected ≥8 normalizeAuditTs_ SUBMITTED_AT reads, got ' + normalized.length);
});
test('Tests.js reads SUBMITTED_AT through normalizeAuditTs_ too', () => {
  const tSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Tests.js'), 'utf8');
  const raw = [...tSrc.matchAll(/String\(\s*[\w.\[\]]*\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.deepStrictEqual(raw.map((m) => m[0]), [], 'test helper must match the production read');
});
// Cycle-11 (tripwire hole): the String( scans above are defeated by a
// one-variable indirection (`const ts = row[TO.SUBMITTED_AT]; String(ts)…`).
// This is the INV-142-style WHITELIST scan: EVERY line touching a
// SUBMITTED_AT index in Code.js/Tests.js must either wrap it in
// normalizeAuditTs_( or be a write (`] =`, not `==`). A line-wrapped index
// still escapes — accepted; the one-variable alias no longer does.
test('every SUBMITTED_AT index touch is normalizeAuditTs_-wrapped or a write (alias-proof)', () => {
  const offenders = [];
  ['Code.js', 'Tests.js'].forEach((f) => {
    const lines = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (!/\[(TO|PAR)\.SUBMITTED_AT\]/.test(line)) return;
      if (/^\s*(\/\/|\*)/.test(line)) return;                              // comment
      if (/\[(TO|PAR)\.SUBMITTED_AT\]\s*=(?!=)/.test(line)) return;        // write
      if (/normalizeAuditTs_\s*\(/.test(line)) return;                     // sanctioned read
      offenders.push(f + ':' + (idx + 1) + ' — ' + line.trim());
    });
  });
  assert.deepStrictEqual(offenders, [],
    'unwrapped SUBMITTED_AT read(s) — route through normalizeAuditTs_ on the same line: ' + offenders.join(' | '));
});

console.log('\nscript_core — view-key literals match the TOOLS registry (M3 tripwire)');
// refreshViewIfCurrent('<tabKey>', …) guards every mutation refresh; a typo'd
// key silently skips the refresh forever (the Manage tab's key is 'manage',
// not 'manager' — exactly that mistake was caught in review). Check every
// literal in the view partials against the LIVE registry from the sandbox.
test("every refreshViewIfCurrent('…') literal is a registered tab key", () => {
  const partials = REGISTRY_SCAN_PARTIALS;   // M-4: one derived list, no hand copy
  // TOOLS / VIEW_TO_TOOL are top-level consts (lexical, not on the sandbox
  // global), so parse the tab keys from the registry source: every tab entry
  // carries an `enter:` handler.
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  // [^{}]* (not [^}]*) so the match can't cross into a nested object — the
  // old class let the match run from a TOOL wrapper key into its tabs:{}
  // block, capturing tool keys instead of tab keys (cycle-9 M-9: the tripwire
  // was false-permissive for exactly the H-1 wrong-key class; the tour test
  // below had the corrected form all along).
  const validKeys = [...toolsBlock[0].matchAll(/(\w+):\s*\{[^{}]*enter:\s*'/g)].map((m) => m[1]);
  assert.ok(validKeys.length >= 10, 'TOOLS registry tab keys parsed (got ' + validKeys.length + ')');
  ['clock', 'timeoff', 'callNotes', 'manage'].forEach((k) => {
    assert.ok(validKeys.indexOf(k) >= 0, 'leaf TAB key ' + k + ' parsed (the [^}]* regression captured tool wrappers instead)');
  });
  partials.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    [...src.matchAll(/refreshViewIfCurrent\(\s*['"]([^'"]+)['"]/g)].forEach((m) => {
      assert.ok(validKeys.indexOf(m[1]) >= 0,
        f + ": refreshViewIfCurrent('" + m[1] + "') is not a TOOLS tab key");
    });
  });
});

// Cycle 9 · H-1 — the manager "Coach on this" button called
// enterTool('training', …) but the Training tool's registry key is 'develop';
// enterTool returns SILENTLY on an unknown tool key, so the INV-134 deep-link
// was a dead no-op that nothing surfaced. Pin every enterTool('<toolKey>' literal
// in the client against the LIVE registry's top-level TOOL keys. The keys are
// extracted with a brace-depth walk (not a regex char class) so nested tab
// keys can neither satisfy nor pollute the valid set.
test("every enterTool('…') literal is a registered TOOL key", () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  const body = toolsBlock[0].slice(toolsBlock[0].indexOf('{'));
  const toolKeys = [];
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') { depth++; continue; }
    if (ch === '}') { depth--; continue; }
    if (depth === 1) {
      const m = /^(\w+)\s*:/.exec(body.slice(i));
      if (m) { toolKeys.push(m[1]); i += m[0].length - 1; }
    }
  }
  assert.ok(toolKeys.length >= 5, 'top-level TOOL keys parsed (got ' + toolKeys.join(',') + ')');
  const partials = REGISTRY_SCAN_PARTIALS;   // M-4: one derived list, no hand copy
  let literalCount = 0;
  const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  partials.forEach((f) => {
    const src = stripC(fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8'));
    [...src.matchAll(/enterTool\(\s*['"]([^'"]+)['"]/g)].forEach((m) => {
      if (m[1].indexOf('${') >= 0) return;  // template-literal interpolation — dynamic key, not a literal
      literalCount++;
      assert.ok(toolKeys.indexOf(m[1]) >= 0,
        f + ": enterTool('" + m[1] + "') is not a registered TOOL key (registry keys: " + toolKeys.join(',') + ')');
    });
  });
  assert.ok(literalCount >= 3, 'enterTool literals found (scan is armed — got ' + literalCount + ')');
});

console.log('\nscript_core — Manage module gating (admin tier)');
// tabVisibleForUser_ reads the `empState` free var; inject it via a factory
// closure (the shared sandbox's lexical empState can't be overridden per-call).
const _tabVisSrc = extractRawFunction('script_core.html', 'tabVisibleForUser_');
const tabVisFactory = new Function('empState', _tabVisSrc + '; return tabVisibleForUser_;');
const tabVisWith = (emp, t) => tabVisFactory(emp)(t);
test('tabVisibleForUser_: adminOnly→isAdmin, managerOnly→isManager|also, plain→all', () => {
  // before state loads, only ungated tabs show
  assert.equal(tabVisWith(null, {}), true);
  assert.equal(tabVisWith(null, { managerOnly: true }), false);
  assert.equal(tabVisWith(null, { adminOnly: true }), false);
  // plain rep
  const rep = { isManager: false, isAdmin: false };
  assert.equal(tabVisWith(rep, { managerOnly: true }), false, 'rep: no manager tab');
  assert.equal(tabVisWith(rep, { adminOnly: true }), false, 'rep: no admin tab');
  assert.equal(tabVisWith(rep, { managerOnly: true, also: 'canSeeSpanish' }), false, 'rep without also');
  // Spanish rep reaches a managerOnly tab via its `also` flag
  assert.equal(tabVisWith({ isManager: false, isAdmin: false, canSeeSpanish: true },
    { managerOnly: true, also: 'canSeeSpanish' }), true, 'also grants the tab');
  // manager (not admin): manager tabs yes, admin tab NO
  const mgr = { isManager: true, isAdmin: false };
  assert.equal(tabVisWith(mgr, { managerOnly: true }), true, 'manager: manager tab');
  assert.equal(tabVisWith(mgr, { adminOnly: true }), false, 'NON-admin manager: NO admin tab');
  // admin sees the admin tab
  assert.equal(tabVisWith({ isManager: true, isAdmin: true }, { adminOnly: true }), true, 'admin: admin tab');
});
test('registry reorg: Manage hosts the moved tabs; Admin is adminOnly; old tools cleared', () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const manageBlock = coreSrc.match(/\n  manage:\s*\{[\s\S]*?\n  \},/);
  assert.ok(manageBlock, 'manage tool block found');
  ['manage:', 'coverage:', 'punctuality:', 'callNotesAdmin:'].forEach((k) =>
    assert.ok(manageBlock[0].indexOf(k) >= 0, 'manage tool hosts ' + k));
  assert.ok(/callNotesAdmin:\s*\{[^}]*adminOnly:\s*true/.test(manageBlock[0]), 'Admin tab is adminOnly');
  const timeClockBlock = coreSrc.match(/\n  timeClock:\s*\{[\s\S]*?\n  \},/);
  assert.ok(timeClockBlock && timeClockBlock[0].indexOf('coverage:') < 0 &&
    timeClockBlock[0].indexOf('punctuality:') < 0 && /\bmanage:/.test(timeClockBlock[0]) === false,
    'timeClock no longer hosts manage/coverage/punctuality');
  const callNotesBlock = coreSrc.match(/\n  callNotes:\s*\{[\s\S]*?\n  \},/);
  assert.ok(callNotesBlock && callNotesBlock[0].indexOf('callNotesAdmin:') < 0,
    'callNotes no longer hosts callNotesAdmin');
});

// ─────────────────────────────────────────────────────────────────────────────
// Intake module — recommendation engine (PPD crown jewel) + layout coupling.
// ─────────────────────────────────────────────────────────────────────────────

// extract a top-level `const NAME = {...};` object literal from a source file
function extractConstObject(file, name) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'web-app', file), 'utf8');
  const start = src.indexOf('const ' + name);
  if (start < 0) throw new Error('const ' + name + ' not found in ' + file);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(open, i); // the {...} text
}
// same for a client partial: read its <script> and slice a `var NAME = {...}`
function extractClientObject(file, name) {
  const src = extractScript(file);
  const start = src.indexOf(name + ' = {');
  if (start < 0) throw new Error(name + ' not found in ' + file);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(open, i);
}

console.log('\nCode.js — intakeFilterRecommendations_() (PPD engine)');
const engineCtx = vm.createContext({});
// The engine now derives its clinical factors via the shared
// intakeDeriveClinicalFactors_ helper (so the engine + the explainability
// surface can't drift) — load it into the ctx first or the engine's call throws.
vm.runInContext(extractRawFunction('Code.js', 'intakeDeriveClinicalFactors_'), engineCtx,
  { filename: 'Code.js#intakeDeriveClinicalFactors_' });
vm.runInContext(extractRawFunction('Code.js', 'intakeExplainFactors_'), engineCtx,
  { filename: 'Code.js#intakeExplainFactors_' });
vm.runInContext(extractRawFunction('Code.js', 'intakeFilterRecommendations_'), engineCtx,
  { filename: 'Code.js#intakeFilterRecommendations_' });
const intakeFilterRecommendations_ = engineCtx.intakeFilterRecommendations_;
const intakeExplainFactors_ = engineCtx.intakeExplainFactors_;

// fixture catalog: [features, hcpcs, weightCap, seatType, pdfLink, imageUrl]
const CAT = [
  ['Std Captain', 'K0823', '350', 'C', 'pdf-823', 'img-823'],
  ['SPO solid',   'K0856', '350', 'S', 'pdf-856', 'img-856'],
  ['G3 solid',    'K0861', '350', 'S', 'pdf-861', 'img-861'],
  ['MPO solid',   'K0843', '450', 'S', 'pdf-843', 'img-843'],
  ['G3 wide',     'K0862', '600', 'S', 'pdf-862', 'img-862'],
];

// NOTE: engine outputs are created inside the vm context (different realm), so
// assert.deepStrictEqual against main-realm literals would fail the prototype
// check. Compare via primitives (join/length) instead.
test('no complex conditions → standard captain chair only, no Group-3/SPO/MPO', () => {
  const r = intakeFilterRecommendations_({ '38': '250 lbs' }, CAT);
  assert.strictEqual(r.standard.map((p) => p.hcpcs).join(','), 'K0823');
  assert.strictEqual(r.complex.length, 0, 'group-3/SPO/MPO require eligibility');
});

test('neuro Dx → solid-seat required (captain dropped) + K0856→K0861 & K0843→K0862 substitutions', () => {
  const r = intakeFilterRecommendations_({ '38': '250', '43': 'multiple sclerosis' }, CAT);
  assert.strictEqual(r.standard.length, 0, 'captain chair fails the solid-seat requirement');
  assert.strictEqual(r.complex.map((p) => p.hcpcs).join(','), 'K0862,K0861', 'substituted + sorted desc');
  // substitution must carry the TARGET code's pdf/image, not the source's
  const k0861 = r.complex.find((p) => p.hcpcs === 'K0861');
  assert.strictEqual(k0861.pdfLink, 'pdf-861');
});

test('weight cap excludes products below the patient weight ceiling', () => {
  const r = intakeFilterRecommendations_({ '38': '500 lbs', '43': 'ALS' }, CAT);
  const all = r.complex.concat(r.standard).map((p) => p.hcpcs);
  assert.ok(all.indexOf('K0862') >= 0, 'the 600-cap chair survives at 500 lbs');
  assert.ok(all.indexOf('K0861') < 0, 'the 350-cap chair is excluded at 500 lbs');
  assert.ok(all.indexOf('K0843') < 0, 'the 450-cap chair is excluded at 500 lbs');
});

test('F(cycle-8): a decimal weight parses as its value, not digits-concatenated', () => {
  // The old \D strip read "250.5 lbs" as 2505 → every cap failed (empty
  // recommendations) and the Q39a mobile-home <285 rule silently didn't fire.
  assert.strictEqual(engineCtx.intakeDeriveClinicalFactors_({ '38': '250.5 lbs' }).patient.weight, 250.5, 'decimal preserved');
  assert.strictEqual(engineCtx.intakeDeriveClinicalFactors_({ '38': '250 lbs' }).patient.weight, 250, 'integer unchanged');
  const r = intakeFilterRecommendations_({ '38': '250.5 lbs', '43': 'ALS' }, CAT);
  assert.ok(r.complex.concat(r.standard).length > 0, '250.5 lbs is not treated as 2505');
});

test('oxygen excludes K0837 (an inherently-solid SPO chair)', () => {
  const oxyCat = [['SPO', 'K0837', '350', 'S', 'p', 'i']];
  const onOxy = intakeFilterRecommendations_({ '38': '250', '32': 'yes', '44': 'yes' }, oxyCat);
  const offOxy = intakeFilterRecommendations_({ '38': '250', '32': 'yes', '44': 'no' }, oxyCat);
  assert.strictEqual(onOxy.complex.concat(onOxy.standard).length, 0, 'K0837 dropped when on oxygen');
  assert.ok(offOxy.complex.concat(offOxy.standard).map((p) => p.hcpcs).indexOf('K0837') >= 0);
});

test('engine never throws on empty answers / empty catalog', () => {
  const e1 = intakeFilterRecommendations_({}, []);
  assert.strictEqual(e1.standard.length + e1.complex.length, 0);
  const e2 = intakeFilterRecommendations_(null, null);
  assert.strictEqual(e2.standard.length + e2.complex.length, 0);
});

// Q39a dwelling restriction (operator rule 2026-07-09): Mobile Home + weight
// under 285 lbs → K0821 only. Operator decisions pinned here: the HOME
// constraint wins over the clinical gates; ≥285 lbs / House / blank weight run
// the standard logic; a catalog with no K0821 yields an EMPTY result (never a
// silent fall-through past the home constraint).
test('Q39a mobile home + weight < 285 → K0821 only; home constraint wins over clinical gates', () => {
  const MH_CAT = [['Std Captain 300', 'K0821', '300', 'C', 'pdf-821', 'img-821']].concat(CAT);
  const r = intakeFilterRecommendations_({ '38': '250', '39a': 'Mobile Home' }, MH_CAT);
  assert.strictEqual(r.standard.map((p) => p.hcpcs).join(','), 'K0821', 'K0821 is the sole recommendation');
  assert.strictEqual(r.complex.length, 0);
  assert.strictEqual(r.standard[0].pdfLink + '|' + r.standard[0].imageUrl, 'pdf-821|img-821', 'carries the catalog row assets');
  assert.ok(/mobile-home/i.test(r.standard[0].justification), 'justification names the constraint');
  // Home constraint WINS: a neuro+spasticity patient who would normally get
  // solid-seat / Group-3 upgrades still gets ONLY K0821.
  const rNeuro = intakeFilterRecommendations_({ '38': '250', '39a': 'Mobile Home', '43': 'multiple sclerosis', '32': 'yes' }, MH_CAT);
  assert.strictEqual(rNeuro.standard.map((p) => p.hcpcs).join(',') + '|' + rNeuro.complex.length, 'K0821|0');
  // Restriction OFF paths — standard logic (both captain chairs offered).
  assert.strictEqual(intakeFilterRecommendations_({ '38': '290', '39a': 'Mobile Home' }, MH_CAT).standard.length, 2, '290 lbs (≥285) → standard logic');
  assert.strictEqual(intakeFilterRecommendations_({ '38': '250', '39a': 'House' }, MH_CAT).standard.length, 2, 'House → standard logic');
  assert.strictEqual(intakeFilterRecommendations_({ '38': '250', '39a': 'Apartment' }, MH_CAT).standard.length, 2, 'Apartment → standard logic');
  assert.strictEqual(intakeFilterRecommendations_({ '39a': 'Mobile Home' }, MH_CAT).standard.length, 2, 'blank weight → rule does not fire (fill Q38)');
  // No K0821 in the catalog → empty result.
  const noK0821 = intakeFilterRecommendations_({ '38': '250', '39a': 'Mobile Home' }, CAT);
  assert.strictEqual(noK0821.standard.length + noK0821.complex.length, 0, 'missing K0821 row → no recommendations, never a fall-through');
});

test('explainability surfaces the dwelling + mobile-home restriction (drift-free)', () => {
  const rows = intakeExplainFactors_({ '38': '250', '39a': 'Mobile Home' });
  const byLabel = {};
  rows.forEach((r) => { byLabel[r.label] = r.value; });
  assert.strictEqual(byLabel['Dwelling (Q39a)'], 'mobile home');
  assert.ok(/K0821 only/.test(byLabel['Mobile-home restriction']), 'restriction row explains the K0821-only outcome');
  const rows2 = intakeExplainFactors_({ '38': '300', '39a': 'Mobile Home' });
  const byLabel2 = {};
  rows2.forEach((r) => { byLabel2[r.label] = r.value; });
  assert.ok(/No — weight is 285/.test(byLabel2['Mobile-home restriction']), '≥285 explains why the rule did not fire');
  const rows3 = intakeExplainFactors_({ '38': '250' });
  assert.ok(!rows3.some((r) => r.label === 'Mobile-home restriction'), 'no restriction row when not a mobile home');
});

// Explainability surface — reuses the SAME derivation the engine does, so a
// manager auditing a sent PPD submission sees exactly the factors that drove it.
test('intakeExplainFactors_ surfaces the engine factors that fired (drift-free)', () => {
  const rows = intakeExplainFactors_({ '38': '250', '43': 'multiple sclerosis', '32': 'yes' });
  const byLabel = {};
  rows.forEach((r) => { byLabel[r.label] = r.value; });
  assert.ok(/Yes — "multiple sclerosis"/.test(byLabel['Valid neuro diagnosis (Q43)']), 'neuro Dx surfaced verbatim');
  assert.strictEqual(byLabel['Spasticity (Q32)'], 'Yes');
  assert.strictEqual(byLabel['Group-3 / neuro eligible'], 'Yes', 'neuro Dx → Group-3 eligible');
  assert.strictEqual(byLabel['Solid-seat required'], 'Yes');
  assert.strictEqual(byLabel['Weight'], '250 lbs');
});
test('intakeExplainFactors_ — a no-condition set reports all gates No, never throws', () => {
  const rows = intakeExplainFactors_({ '38': '200' });
  const byLabel = {};
  rows.forEach((r) => { byLabel[r.label] = r.value; });
  assert.strictEqual(byLabel['Group-3 / neuro eligible'], 'No');
  assert.strictEqual(byLabel['Solid-seat required'], 'No');
  assert.doesNotThrow(() => intakeExplainFactors_(null));
});

// ── PPD redesign Phase 0 — control→engine contract lock ────────────────────
// The PPD UI redesign replaces several free-text questions with STRUCTURED
// controls (multi-select buttons, condition pickers). The engine is fragile +
// substring-based, so BEFORE any UI is built we pin that the EXACT strings the
// new controls will emit produce the SAME clinical factors / recommendations as
// today's free-text. The engine is NOT touched — the control option VALUES are
// designed to feed it the substrings it already matches (INV-112 upgraded from
// "must stay free-text" to "must emit engine-safe values, pinned here").
// BILINGUAL: the emitted value is always canonical ENGLISH ('Feet', 'Paralysis
// Left Arm', …) regardless of the displayed label, which also FIXES the latent
// bug where a Spanish free-text answer never matched the English substrings.
console.log('\nintake — PPD redesign Phase 0: new structured-control values are engine-safe');
const intakeDeriveClinicalFactors_ = engineCtx.intakeDeriveClinicalFactors_;
const _F = (answers) => intakeDeriveClinicalFactors_(answers);

test('Q25 numbness multi-select ("No|Hands|Feet|Legs") drives hasLowerExtremityNumbness like free-text', () => {
  assert.strictEqual(_F({ '25': 'Feet, Legs' }).patient.hasLowerExtremityNumbness, true, 'Feet+Legs → lower-extremity');
  assert.strictEqual(_F({ '25': 'Feet' }).patient.hasLowerExtremityNumbness, true);
  assert.strictEqual(_F({ '25': 'Legs' }).patient.hasLowerExtremityNumbness, true);
  assert.strictEqual(_F({ '25': 'Hands' }).patient.hasLowerExtremityNumbness, false, 'hands is NOT lower-extremity');
  assert.strictEqual(_F({ '25': 'No' }).patient.hasLowerExtremityNumbness, false);
  assert.strictEqual(_F({ '25': '' }).patient.hasLowerExtremityNumbness, false);
  // parity with the free-text the box replaces
  assert.strictEqual(_F({ '25': 'numbness in feet and legs' }).patient.hasLowerExtremityNumbness,
    _F({ '25': 'Feet, Legs' }).patient.hasLowerExtremityNumbness);
});

test('Q34 amputation multi-select values match the engine (knee/left/right, no stray "no")', () => {
  assert.strictEqual(_F({ '34': 'Left (Above Knee)' }).patient.hasAmputation, true);
  assert.strictEqual(_F({ '34': 'Right (Below Knee)' }).patient.hasAmputation, true, '"below" must not read as "no"');
  assert.strictEqual(_F({ '34': 'Left (Above Knee), Right (Below Knee)' }).patient.hasAmputation, true);
  assert.strictEqual(_F({ '34': 'No' }).patient.hasAmputation, false);
  assert.strictEqual(_F({ '34': '' }).patient.hasAmputation, false);
});

test('Q31a stroke multi-select values parse for hemiplegia (comma-join matches the engine split)', () => {
  const both = _F({ '31a': 'Paralysis Left Arm, Paralysis Left Leg' });
  assert.strictEqual(both.qualifiesForHemiplegia, true, 'arm+leg on one side = 2 → hemiplegia');
  assert.strictEqual(both.hemiplegiaSide, 'Left');
  const right = _F({ '31a': 'Paralysis Right Arm, Paralysis Right Leg' });
  assert.strictEqual(right.qualifiesForHemiplegia, true);
  assert.strictEqual(right.hemiplegiaSide, 'Right');
  const one = _F({ '31a': 'Paralysis Left Arm' });
  assert.strictEqual(one.qualifiesForHemiplegia, false, 'single limb ≠ hemiplegia');
  assert.strictEqual(one.hasStrokeWeakness, true, 'but it IS stroke weakness');
  const weak = _F({ '31a': 'Weakness Left Side' });
  assert.strictEqual(weak.hasStrokeWeakness, true);
  assert.strictEqual(weak.qualifiesForHemiplegia, false, 'weakness (no paralysis) ≠ hemiplegia');
  const none = _F({ '31a': 'No' });
  assert.strictEqual(none.hasStrokeWeakness, false);
  assert.strictEqual(none.qualifiesForHemiplegia, false);
});

test('Q43 neuro curated-condition values → valid neuro Dx (empty/exclude-list still excluded)', () => {
  assert.strictEqual(_F({ '43': 'multiple sclerosis' }).hasValidNeuroDiagnosis, true);
  assert.strictEqual(_F({ '43': 'amyotrophic lateral sclerosis' }).hasValidNeuroDiagnosis, true);
  assert.strictEqual(_F({ '43': 'cerebral palsy, spinal cord injury' }).hasValidNeuroDiagnosis, true, 'multi-select join still valid');
  assert.strictEqual(_F({ '43': '' }).hasValidNeuroDiagnosis, false);
  assert.strictEqual(_F({ '43': 'none' }).hasValidNeuroDiagnosis, false);
});

test('Q38 weight number+unit and Yes/No engine questions unchanged', () => {
  assert.strictEqual(_F({ '38': '180 lbs' }).patient.weight, 180);
  assert.strictEqual(_F({ '38': '180' }).patient.weight, 180);
  assert.strictEqual(_F({ '32': 'Yes' }).patient.hasSpasticity, true);
  assert.strictEqual(_F({ '32': 'No' }).patient.hasSpasticity, false);
  assert.strictEqual(_F({ '44': 'Yes' }).patient.isOnOxygen, true);
  assert.strictEqual(_F({ '30': 'Yes' }).patient.usesCatheters, true);
});

test('end-to-end: a full structured-control answer set === the free-text equivalent recommendations', () => {
  // The exact strings the new controls emit …
  const structured = intakeFilterRecommendations_({
    '38': '250', '43': 'multiple sclerosis', '25': 'Feet, Legs',
    '34': 'Left (Above Knee)', '31a': 'Paralysis Left Arm, Paralysis Left Leg', '32': 'Yes',
  }, CAT);
  // … vs the free-text an agent would have typed today.
  const freeText = intakeFilterRecommendations_({
    '38': '250 lbs', '43': 'multiple sclerosis', '25': 'numbness in feet and legs',
    '34': 'left leg above the knee', '31a': 'paralysis in left arm and left leg', '32': 'yes',
  }, CAT);
  const codes = (r) => r.complex.map((p) => p.hcpcs).join(',') + '|' + r.standard.map((p) => p.hcpcs).join(',');
  assert.strictEqual(codes(structured), codes(freeText), 'structured controls must yield identical recommendations');
  assert.strictEqual(codes(structured), 'K0862,K0861|', 'neuro+solid case: substituted Group-3 pair, captain dropped');
});

// PPD redesign Phase 1 — the new control kinds all serialize to/from a STRING so
// draft autosave, intakeCollectPpd_, the engine, and the email builder keep
// working unchanged. Pin the PURE serialization helpers here (vm-realm arrays/
// objects fail deepStrictEqual, so compare via primitives).
console.log('\nintake — PPD redesign Phase 1: control-kind serialization (pure)');
const intakeMultiToggle_ = loadFunction(sb, 'intake/script_intake.html', 'intakeMultiToggle_');
const intakeMultiSerialize_ = loadFunction(sb, 'intake/script_intake.html', 'intakeMultiSerialize_');
const intakeMultiParse_ = loadFunction(sb, 'intake/script_intake.html', 'intakeMultiParse_');
const intakeRevealSerialize_ = loadFunction(sb, 'intake/script_intake.html', 'intakeRevealSerialize_');
const intakeRevealParse_ = loadFunction(sb, 'intake/script_intake.html', 'intakeRevealParse_');

test('multi-select toggle: add / remove, exclusive option clears others (and vice-versa)', () => {
  assert.strictEqual(intakeMultiToggle_([], 'Feet', 'No').join('|'), 'Feet', 'add');
  assert.strictEqual(intakeMultiToggle_(['Feet'], 'Legs', 'No').join('|'), 'Feet|Legs', 'add second');
  assert.strictEqual(intakeMultiToggle_(['Feet', 'Legs'], 'Feet', 'No').join('|'), 'Legs', 're-click removes');
  assert.strictEqual(intakeMultiToggle_(['Feet', 'Legs'], 'No', 'No').join('|'), 'No', 'exclusive clears others');
  assert.strictEqual(intakeMultiToggle_(['No'], 'Feet', 'No').join('|'), 'Feet', 'normal pick drops the exclusive');
  assert.strictEqual(intakeMultiToggle_(['No'], 'No', 'No').length, 0, 're-click exclusive clears it');
  assert.strictEqual(intakeMultiToggle_(['A'], 'B', '').join('|'), 'A|B', 'no exclusive configured');
});

test('multi-select serialize (option order) + parse round-trip', () => {
  const order = ['No', 'Hands', 'Feet', 'Legs'];
  assert.strictEqual(intakeMultiSerialize_(['Legs', 'Feet'], order), 'Feet, Legs', 'follows OPTION order, not click order');
  assert.strictEqual(intakeMultiSerialize_([], order), '');
  assert.strictEqual(intakeMultiSerialize_(['No'], order), 'No');
  assert.strictEqual(intakeMultiParse_('Feet, Legs').join('|'), 'Feet|Legs');
  assert.strictEqual(intakeMultiParse_('').length, 0);
  assert.strictEqual(intakeMultiParse_('  Feet ,, Legs ').join('|'), 'Feet|Legs', 'trims + drops empties');
  const s = intakeMultiSerialize_(['Feet', 'Legs'], order);
  assert.strictEqual(intakeMultiSerialize_(intakeMultiParse_(s), order), s, 'parse∘serialize stable');
});

test('reveal serialize / parse: plain option vs revealOn + text', () => {
  assert.strictEqual(intakeRevealSerialize_('Alone', '', 'Other'), 'Alone');
  assert.strictEqual(intakeRevealSerialize_('Other', 'neighbor helps', 'Other'), 'Other: neighbor helps');
  assert.strictEqual(intakeRevealSerialize_('Other', '', 'Other'), 'Other', 'reveal with no text = just the option');
  assert.strictEqual(intakeRevealSerialize_('', '', 'Other'), '');
  const a = intakeRevealParse_('Alone', 'Other');           assert.strictEqual(a.option + '|' + a.text, 'Alone|');
  const b = intakeRevealParse_('Other: neighbor helps', 'Other'); assert.strictEqual(b.option + '|' + b.text, 'Other|neighbor helps');
  const c = intakeRevealParse_('Other', 'Other');            assert.strictEqual(c.option + '|' + c.text, 'Other|');
  const d = intakeRevealParse_('', 'Other');                 assert.strictEqual(d.option + '|' + d.text, '|');
  const rt = intakeRevealParse_('Other: x', 'Other');
  assert.strictEqual(intakeRevealSerialize_(rt.option, rt.text, 'Other'), 'Other: x', 'round-trip');
});

// PPD redesign Phase 2 — the engine-critical questions (Q25/Q31a/Q34/Q38) now use
// STRUCTURED controls. Their option VALUES must stay exactly the substrings the
// engine parses. Load the live INTAKE_PPD_CONTROL config and feed its values back
// through the engine so a rename (e.g. "Feet" → "Both Feet") fails CI here instead
// of silently breaking recommendations. (Reuses _F / intakeFilterRecommendations_
// / CAT from the engine block above.)
console.log('\nintake — PPD redesign Phase 2: config values stay engine-safe (drift guard)');
const _p2 = vm.createContext({});
vm.runInContext('var CTRL = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PPD_CONTROL') + ';', _p2, { filename: 'INTAKE_PPD_CONTROL' });
const PPD_CTRL = _p2.CTRL;
const _vals = (q) => PPD_CTRL[q].options.map((o) => o.v);

test('Q25 numbness config drives engine lower-extremity detection', () => {
  assert.strictEqual(_vals('25').join('|'), 'No|Hands|Feet|Legs', 'canonical values (rename-guard)');
  assert.strictEqual(PPD_CTRL['25'].exclusive, 'No');
  assert.strictEqual(_F({ '25': 'Feet, Legs' }).patient.hasLowerExtremityNumbness, true);
  assert.strictEqual(_F({ '25': 'Feet' }).patient.hasLowerExtremityNumbness, true);
  assert.strictEqual(_F({ '25': 'Legs' }).patient.hasLowerExtremityNumbness, true);
  assert.strictEqual(_F({ '25': 'Hands' }).patient.hasLowerExtremityNumbness, false);
  assert.strictEqual(_F({ '25': 'No' }).patient.hasLowerExtremityNumbness, false);
});
test('Q34 amputation config: every non-No value fires hasAmputation, no stray "no"', () => {
  assert.strictEqual(PPD_CTRL['34'].exclusive, 'No');
  _vals('34').filter((v) => v !== 'No').forEach((v) => {
    assert.strictEqual(_F({ '34': v }).patient.hasAmputation, true, v + ' → amputation');
  });
  assert.strictEqual(_F({ '34': 'No' }).patient.hasAmputation, false);
});
test('Q31a stroke config: hemiplegia + weakness parse correctly', () => {
  assert.strictEqual(PPD_CTRL['31a'].exclusive, 'No');
  const F = _F({ '31a': 'Paralysis Left Arm, Paralysis Left Leg' });
  assert.strictEqual(F.qualifiesForHemiplegia, true);
  assert.strictEqual(F.hemiplegiaSide, 'Left');
  assert.ok(_vals('31a').indexOf('Weakness Left Side') >= 0, 'weakness option present');
  assert.strictEqual(_F({ '31a': 'Weakness Left Side' }).hasStrokeWeakness, true);
  assert.strictEqual(_F({ '31a': 'Weakness Left Side' }).qualifiesForHemiplegia, false);
});
test('Q39a dwelling config drives the mobile-home factor (rename-guard)', () => {
  assert.strictEqual(_vals('39a').join('|'), 'House|Apartment|Mobile Home', 'canonical values (rename-guard)');
  assert.strictEqual(PPD_CTRL['39a'].kind, 'choice');
  assert.strictEqual(_F({ '39a': 'Mobile Home' }).patient.livesInMobileHome, true);
  assert.strictEqual(_F({ '39a': 'House' }).patient.livesInMobileHome, false);
  assert.strictEqual(_F({ '39a': 'Apartment' }).patient.livesInMobileHome, false);
  assert.strictEqual(_F({}).patient.livesInMobileHome, false, 'legacy submissions (no 39a answer) stay unrestricted');
});

test('Q38 weight is numunit; end-to-end config-driven recommendation parity', () => {
  assert.strictEqual(PPD_CTRL['38'].kind, 'numunit');
  const r = intakeFilterRecommendations_({
    '38': '250', '43': 'multiple sclerosis',
    '25': _vals('25').filter((v) => v !== 'No' && v !== 'Hands').join(', '),   // 'Feet, Legs'
    '34': _vals('34')[1],                                                       // 'Left (Above Knee)'
    '31a': 'Paralysis Left Arm, Paralysis Left Leg',
  }, CAT);
  assert.strictEqual(r.complex.map((p) => p.hcpcs).join(',') + '|' + r.standard.map((p) => p.hcpcs).join(','),
    'K0862,K0861|', 'config values yield the expected neuro+solid recommendation');
});

// PPD redesign Phase 3 — Q29/Q41/Q42/Q43 become curated `condition` pickers whose
// value is a comma-joined string (like `multi`). Q29/Q41/Q42 are display-only; Q43
// is ENGINE-CRITICAL but read only as truthy-vs-the-exclude-list. Pin (a) the pure
// selection helper and (b) a drift guard that loads the LIVE config + lists and
// feeds Q43's list values through the engine so a bad list (or an empty-selection
// regression) fails CI. (Reuses _F / intakeFilterRecommendations_ from above.)
console.log('\nintake — PPD redesign Phase 3: condition pickers (pure + engine drift guard)');
const intakeCondToggleValue_ = loadFunction(sb, 'intake/script_intake.html', 'intakeCondToggleValue_');

test('condition select toggle: add appends, re-click removes, no exclusive logic', () => {
  assert.strictEqual(intakeCondToggleValue_([], 'ALS').join('|'), 'ALS', 'add');
  assert.strictEqual(intakeCondToggleValue_(['ALS'], 'MS').join('|'), 'ALS|MS', 'append in insertion order');
  assert.strictEqual(intakeCondToggleValue_(['ALS', 'MS'], 'ALS').join('|'), 'MS', 're-click removes');
  assert.strictEqual(intakeCondToggleValue_(['ALS'], 'ALS').length, 0, 're-click last clears');
  // round-trips through the shared comma serialize/parse contract
  const s = intakeCondToggleValue_(['A'], 'B').join(', ');
  assert.strictEqual(intakeMultiParse_(s).join('|'), 'A|B');
});

const _p3 = vm.createContext({});
vm.runInContext('var CTRL = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PPD_CONTROL') + ';', _p3, { filename: 'INTAKE_PPD_CONTROL' });
vm.runInContext('var LISTS = ' + extractClientObject('intake/script_intake.html', 'INTAKE_CONDITION_LISTS') + ';', _p3, { filename: 'INTAKE_CONDITION_LISTS' });
const P3_CTRL = _p3.CTRL, P3_LISTS = _p3.LISTS;

test('Q29/Q41/Q42/Q43 are condition pickers whose lists resolve + are non-empty', () => {
  ['29', '41', '42', '43'].forEach((q) => {
    assert.strictEqual(P3_CTRL[q].kind, 'condition', 'Q' + q + ' is a condition picker');
    const key = P3_CTRL[q].list;
    assert.ok(P3_LISTS[key] && P3_LISTS[key].length > 0, 'Q' + q + ' list "' + key + '" resolves + non-empty');
  });
});

test('Q43 neuro list values every make hasValidNeuroDiagnosis true (engine-safe)', () => {
  const neuro = P3_LISTS[P3_CTRL['43'].list];
  neuro.forEach((v) => {
    assert.strictEqual(_F({ '43': v }).hasValidNeuroDiagnosis, true, '"' + v + '" → valid neuro Dx');
  });
  // a multi-select (comma-joined) is still valid; empty selection is NOT a Dx
  assert.strictEqual(_F({ '43': neuro[0] + ', ' + neuro[1] }).hasValidNeuroDiagnosis, true, 'multi-select valid');
  assert.strictEqual(_F({ '43': '' }).hasValidNeuroDiagnosis, false, 'empty = no Dx');
  // none of the seeded values collide with the engine exclude list
  const EXCLUDE = ['no', 'n/a', 'none', '', 'no.'];
  neuro.forEach((v) => assert.ok(EXCLUDE.indexOf(v.toLowerCase()) < 0, '"' + v + '" not in exclude list'));
});

test('condition-picker values never contain a comma (breaks comma-join serialization)', () => {
  ['vascular', 'qualifying', 'cardiopulmonary', 'neuro'].forEach((k) => {
    P3_LISTS[k].forEach((v) => assert.ok(v.indexOf(',') < 0, '"' + v + '" (' + k + ') is comma-free'));
  });
});

// PPD redesign Phase 4 — polish: Q32 spasticity tooltip, Q33a conditional-hide,
// Q45 Yes/No-reveals-multi (arthritis types), Q37 feet-inches → inches parse. None
// of these are engine-read (Q45/Q37 display-only; Q32/Q33 unchanged Yes/No), so
// this pins the PURE serialization/parse + the config wiring, not the engine.
console.log('\nintake — PPD redesign Phase 4: reveal/height polish (pure + config)');
const intakeYnRevealSerialize_ = loadFunction(sb, 'intake/script_intake.html', 'intakeYnRevealSerialize_');
const intakeYnRevealParse_ = loadFunction(sb, 'intake/script_intake.html', 'intakeYnRevealParse_');
const intakeParseHeightInches_ = loadFunction(sb, 'intake/script_intake.html', 'intakeParseHeightInches_');

test('Q45 ynreveal serialize/parse: No / Yes / Yes+subtypes round-trip', () => {
  assert.strictEqual(intakeYnRevealSerialize_('No', [], 'Yes'), 'No');
  assert.strictEqual(intakeYnRevealSerialize_('Yes', [], 'Yes'), 'Yes', 'Yes with no subtype');
  assert.strictEqual(intakeYnRevealSerialize_('Yes', ['Rheumatoid', 'Psoriatic'], 'Yes'), 'Yes: Rheumatoid, Psoriatic');
  assert.strictEqual(intakeYnRevealSerialize_('', [], 'Yes'), '');
  assert.strictEqual(intakeYnRevealSerialize_('No', ['Rheumatoid'], 'Yes'), 'No', 'subtypes ignored when not revealOn');
  const p1 = intakeYnRevealParse_('Yes: Rheumatoid, Osteoarthritis', 'Yes');
  assert.strictEqual(p1.yn + '|' + p1.subs.join(','), 'Yes|Rheumatoid,Osteoarthritis');
  const p2 = intakeYnRevealParse_('No', 'Yes');   assert.strictEqual(p2.yn + '|' + p2.subs.length, 'No|0');
  const p3 = intakeYnRevealParse_('Yes', 'Yes');  assert.strictEqual(p3.yn + '|' + p3.subs.length, 'Yes|0');
  const p4 = intakeYnRevealParse_('', 'Yes');     assert.strictEqual(p4.yn + '|' + p4.subs.length, '|0');
  const p5 = intakeYnRevealParse_('some old free text', 'Yes'); assert.strictEqual(p5.yn + '|' + p5.subs.length, '|0', 'legacy free-text → unselected');
  const rt = intakeYnRevealParse_('Yes: Rheumatoid', 'Yes');
  assert.strictEqual(intakeYnRevealSerialize_(rt.yn, rt.subs, 'Yes'), 'Yes: Rheumatoid', 'round-trip');
});

test('Q37 height parse: feet-inches → total inches; plain number untouched', () => {
  assert.strictEqual(intakeParseHeightInches_("5'1\""), '61');
  assert.strictEqual(intakeParseHeightInches_("5'1"), '61');
  assert.strictEqual(intakeParseHeightInches_('5 ft 1 in'), '61');
  assert.strictEqual(intakeParseHeightInches_("6'"), '72', 'feet only');
  assert.strictEqual(intakeParseHeightInches_('5ft11'), '71');
  assert.strictEqual(intakeParseHeightInches_('61'), '61', 'plain inches unchanged');
  assert.strictEqual(intakeParseHeightInches_(''), '', 'empty unchanged');
  assert.strictEqual(intakeParseHeightInches_('  70  '), '70', 'trims a plain number');
  assert.strictEqual(intakeParseHeightInches_('tall'), 'tall', 'non-numeric unchanged');
});

const _p4 = vm.createContext({});
vm.runInContext('var CTRL = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PPD_CONTROL') + ';', _p4, { filename: 'INTAKE_PPD_CONTROL' });
vm.runInContext('var HELP = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PPD_HELP') + ';', _p4, { filename: 'INTAKE_PPD_HELP' });
vm.runInContext('var REVEAL = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PPD_REVEAL') + ';', _p4, { filename: 'INTAKE_PPD_REVEAL' });

test('Phase 4 config: Q45 ynreveal + subtypes, Q37 height parse, Q32 help, Q33a reveal', () => {
  assert.strictEqual(_p4.CTRL['45'].kind, 'ynreveal');
  assert.strictEqual(_p4.CTRL['45'].sub.join('|'), 'Rheumatoid|Osteoarthritis|Psoriatic');
  assert.strictEqual(_p4.CTRL['45'].revealOn, 'Yes');
  assert.strictEqual(_p4.CTRL['37'].kind, 'numunit');
  assert.strictEqual(_p4.CTRL['37'].parse, 'height');
  assert.ok(_p4.HELP['32'] && _p4.HELP['32'].toLowerCase().indexOf('spasticity') >= 0, 'Q32 spasticity help text');
  assert.strictEqual(_p4.REVEAL['33a'].whenQ, '33');
  assert.strictEqual(_p4.REVEAL['33a'].whenVal, 'Yes');
});

// Operator feedback 2026-07-09 — Q40 two-part control + display-only option
// tones. Q40 is NOT engine-read; the tone attribute never touches the stored
// value (the Phase-2 drift guard separately pins the engine-critical values).
console.log('\nintake — operator feedback: Q40 ynnum + multi option tones (pure + config)');
const intakeYnNumSerialize_ = loadFunction(sb, 'intake/script_intake.html', 'intakeYnNumSerialize_');
const intakeYnNumParse_ = loadFunction(sb, 'intake/script_intake.html', 'intakeYnNumParse_');

test('Q40 ynnum serialize/parse: No / Yes / Yes+hours round-trip; digits-only', () => {
  assert.strictEqual(intakeYnNumSerialize_('', '', 'hours'), '');
  assert.strictEqual(intakeYnNumSerialize_('No', '', 'hours'), 'No');
  assert.strictEqual(intakeYnNumSerialize_('No', '12', 'hours'), 'No', 'hours ignored on No');
  assert.strictEqual(intakeYnNumSerialize_('Yes', '', 'hours'), 'Yes', 'Yes with no count');
  assert.strictEqual(intakeYnNumSerialize_('Yes', '12', 'hours'), 'Yes: 12 hours');
  assert.strictEqual(intakeYnNumSerialize_('Yes', ' 1a2 ', 'hours'), 'Yes: 12 hours', 'non-digits stripped defensively');
  const p1 = intakeYnNumParse_('Yes: 12 hours'); assert.strictEqual(p1.yn + '|' + p1.num, 'Yes|12');
  const p2 = intakeYnNumParse_('No');            assert.strictEqual(p2.yn + '|' + p2.num, 'No|');
  const p3 = intakeYnNumParse_('Yes');           assert.strictEqual(p3.yn + '|' + p3.num, 'Yes|');
  const p4 = intakeYnNumParse_('');              assert.strictEqual(p4.yn + '|' + p4.num, '|');
  const p5 = intakeYnNumParse_('maybe 10 hrs');  assert.strictEqual(p5.yn + '|' + p5.num, '|', 'legacy free-text → unselected');
  const rt = intakeYnNumParse_('Yes: 8 hours');
  assert.strictEqual(intakeYnNumSerialize_(rt.yn, rt.num, 'hours'), 'Yes: 8 hours', 'round-trip');
});

test('config: Q40 is ynnum(hours); Q25/Q31a/Q34 tones are display-only (values byte-unchanged)', () => {
  assert.strictEqual(_p4.CTRL['40'].kind, 'ynnum');
  assert.strictEqual(_p4.CTRL['40'].unit, 'hours');
  // Tones per the operator spec: No = dark ink chip on all three; Q31a
  // Paralysis = danger (light red), Weakness = warn (light yellow); Q25/Q34
  // non-No options = warn.
  const tones = (q) => _p4.CTRL[q].options.map((o) => o.v + '=' + (o.tone || '')).join('|');
  assert.strictEqual(tones('25'), 'No=no|Hands=warn|Feet=warn|Legs=warn');
  assert.strictEqual(tones('34'), 'No=no|Left (Above Knee)=warn|Left (Below Knee)=warn|Right (Above Knee)=warn|Right (Below Knee)=warn');
  assert.strictEqual(tones('31a'),
    'No=no|Paralysis Left Arm=danger|Paralysis Right Arm=danger|Paralysis Left Leg=danger|Paralysis Right Leg=danger|Weakness Left Side=warn|Weakness Right Side=warn');
  // The engine-critical VALUES themselves are additionally pinned by the
  // Phase-2 drift guard, which feeds them through the live engine.
});

console.log('\nintake — client render layout mirrors the server (coupling tripwire)');
const _lcx = vm.createContext({});
vm.runInContext('var SRV_PMD = ' + extractConstObject('Code.js', 'INTAKE_PMD_LAYOUT') + ';', _lcx);
vm.runInContext('var SRV_PAP = ' + extractConstObject('Code.js', 'INTAKE_PAP_LAYOUT') + ';', _lcx);
vm.runInContext('var CLI_PMD = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PMD_CLIENT') + ';', _lcx);
vm.runInContext('var CLI_PAP = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PAP_CLIENT') + ';', _lcx);

[['PMD', _lcx.SRV_PMD, _lcx.CLI_PMD], ['PAP', _lcx.SRV_PAP, _lcx.CLI_PAP]].forEach(([form, srv, cli]) => {
  test(form + ' headers: client (0-based) +1 === server HEADER_ROWS (1-based)', () => {
    assert.deepStrictEqual(cli.headers.map((x) => x + 1), srv.HEADER_ROWS);
  });
  test(form + ' checkbox rows match server CHECKBOX_ROWS', () => {
    assert.deepStrictEqual(cli.checkboxes, srv.CHECKBOX_ROWS);
  });
  test(form + ' secondary rows match server SECONDARY_QUESTION_ROWS', () => {
    assert.deepStrictEqual(cli.secondary, srv.SECONDARY_QUESTION_ROWS);
  });
});

console.log('\nforms — interactive form IDs: client mirrors the server (coupling tripwire)');
test('CN_INTERACTIVE_FORM_IDS (cn partial) === INTERACTIVE_FORM_TYPES (Code.js)', () => {
  const grabArr = (src, name, where) => {
    const m = src.match(new RegExp(name + "\\s*=\\s*\\[([^\\]]*)\\]"));
    assert.ok(m, name + ' not found in ' + where);
    return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  };
  assert.deepStrictEqual(
    grabArr(extractScript('cn/script_callnotes.html'), 'CN_INTERACTIVE_FORM_IDS', 'cn/script_callnotes.html'),
    grabArr(codeSrc, 'INTERACTIVE_FORM_TYPES', 'Code.js'),
    'the client fillable-form ID list must mirror the server list');
});

console.log('\nforms — invite email builders carry no prefilled patient data (hardening Fix 6)');
['buildCustomerEmailHtml_', 'buildProviderEmailHtml_', 'buildCustomerEmailText_', 'buildProviderEmailText_'].forEach((fn) => {
  test(fn + ' takes only (recipientName, message, formNames, formLinks) and never reads prefill', () => {
    const src = extractRawFunction('Code.js', fn);
    const sig = src.match(/function\s+\w+\s*\(([^)]*)\)/)[1].split(',').map((s) => s.trim());
    assert.deepStrictEqual(sig, ['recipientName', 'message', 'formNames', 'formLinks']);
    // Prefill (patient identifiers) must stay in the token store, never the
    // email body — so the invite stays PHI-minimal in cleartext transit.
    assert.ok(!/prefill/i.test(src), fn + ' must not reference prefill data');
  });
});

console.log('\nforms — normalizeWebAppExecUrl_() produces the canonical public /exec link');
const _urlCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'normalizeWebAppExecUrl_'), _urlCtx, { filename: 'Code.js#normalizeWebAppExecUrl_' });
const normalizeWebAppExecUrl_ = _urlCtx.normalizeWebAppExecUrl_;
test('strips the /a/<domain>/ Workspace prefix (the customer-blocking bug)', () => {
  assert.strictEqual(
    normalizeWebAppExecUrl_('https://script.google.com/a/universalmedsupply.com/macros/s/AKfycbABC/exec'),
    'https://script.google.com/macros/s/AKfycbABC/exec');
});
test('rewrites a trailing /dev to /exec', () => {
  assert.strictEqual(
    normalizeWebAppExecUrl_('https://script.google.com/macros/s/AKfycbABC/dev'),
    'https://script.google.com/macros/s/AKfycbABC/exec');
});
test('leaves an already-canonical /exec URL unchanged', () => {
  const u = 'https://script.google.com/macros/s/AKfycbABC/exec';
  assert.strictEqual(normalizeWebAppExecUrl_(u), u);
});

console.log('\nkb — markdown renderer (kbMd_) escapes HTML + sanitizes links');
loadFunction(sb, 'kb/script_kb.html', 'kbSlug_');   // kbMd_ heading ids depend on it
const kbMd_ = loadFunction(sb, 'kb/script_kb.html', 'kbMd_');
test('renders headings (with anchor ids), bold, and lists', () => {
  assert.ok(kbMd_('# Title').indexOf('<h1 id="kb-h-title">Title</h1>') >= 0);
  assert.ok(kbMd_('**b**').indexOf('<strong>b</strong>') >= 0);
  assert.ok(kbMd_('- one\n- two').indexOf('<li>one</li>') >= 0);
  // duplicate headings get -2/-3 suffixed ids (same walk as kbSplitSections_)
  const dup = kbMd_('## Dup\n\n## Dup');
  assert.ok(dup.indexOf('id="kb-h-dup"') >= 0 && dup.indexOf('id="kb-h-dup-2"') >= 0);
});
test('escapes raw HTML / script in the source (no injection)', () => {
  const out = kbMd_('<script>alert(1)</script>');
  assert.ok(out.indexOf('<script') < 0, 'no raw <script>');
  assert.ok(out.indexOf('&lt;script&gt;') >= 0, 'angle brackets escaped');
});
test('allows http(s)/mailto links, strips javascript: URLs to plain text', () => {
  assert.ok(kbMd_('[x](https://a.com)').indexOf('<a href="https://a.com"') >= 0);
  const js = kbMd_('[x](javascript:alert(1))');
  assert.ok(js.indexOf('href="javascript') < 0 && js.indexOf('<a ') < 0, 'javascript: URL not linked');
});
test('percent-encodes quotes in link URLs (no href attribute breakout)', () => {
  // A `"` in the URL would otherwise close the href attribute and inject an
  // event handler (the top-level escape covers &/</> but not quotes).
  const out = kbMd_('[x](https://e.com/"onmouseover=alert`1`)');
  assert.ok(out.indexOf('"onmouseover') < 0, 'quote must not terminate the href attribute');
  assert.ok(out.indexOf('%22') >= 0, 'double quote percent-encoded');
  const single = kbMd_("[x](https://e.com/'q)");
  assert.ok(single.indexOf('%27') >= 0, 'single quote percent-encoded');
});
test('F7: ** / backtick inside a URL do NOT get wrapped in <strong>/<code> (link stays intact)', () => {
  // The emphasis pass runs AFTER link generation, so it used to inject
  // <strong>/<code> INSIDE the href of a URL containing ** or a backtick,
  // producing a broken link. The generated markup is now stashed past that pass.
  const stars = kbMd_('[go](https://e.com/a**b**c)');
  assert.ok(stars.indexOf('href="https://e.com/a**b**c"') >= 0, 'href keeps the literal ** — not <strong>');
  assert.ok(stars.indexOf('<strong>') < 0 && stars.indexOf('<em>') < 0, 'no emphasis injected into the link');
  const tick = kbMd_('[go](https://e.com/a`b`c)');
  assert.ok(tick.indexOf('href="https://e.com/a`b`c"') >= 0, 'href keeps the literal backtick — not <code>');
  assert.ok(tick.indexOf('<code>') < 0, 'no <code> injected into the link');
  // Emphasis INSIDE the link TEXT still renders (regression guard for the fix).
  const boldText = kbMd_('[**bold**](https://e.com)');
  assert.ok(boldText.indexOf('<strong>bold</strong>') >= 0, 'link-text emphasis preserved');
  assert.ok(boldText.indexOf('href="https://e.com"') >= 0, 'link still rendered');
});
test('renders GFM tables (header, body, alignment, pipe escape)', () => {
  const out = kbMd_('| H1 | H2 |\n| --- | :---: |\n| a | b |\n| c | d |');
  assert.ok(out.indexOf('<table>') >= 0 && out.indexOf('</table>') >= 0, 'table element emitted');
  assert.ok(out.indexOf('<th>H1</th>') >= 0, 'header cell');
  assert.ok(out.indexOf('<th style="text-align:center">H2</th>') >= 0, 'alignment honored');
  assert.ok(out.indexOf('<td>a</td>') >= 0, 'body cell (unaligned column)');
  assert.ok(out.indexOf('<td style="text-align:center">d</td>') >= 0, 'body cell inherits column alignment');
  // inline formatting works inside cells
  const fmt = kbMd_('| H |\n| --- |\n| **b** |');
  assert.ok(fmt.indexOf('<td><strong>b</strong></td>') >= 0, 'bold inside a cell');
  // \| is a literal pipe inside a cell, not a column break
  const esc2 = kbMd_('| H |\n| --- |\n| a \\| b |');
  assert.ok(esc2.indexOf('<td>a | b</td>') >= 0, 'escaped pipe stays in the cell');
  // body rows clamp to the header column count (extra cells dropped)
  const clamp = kbMd_('| H |\n| --- |\n| a | extra |');
  assert.ok(clamp.indexOf('<td>extra</td>') < 0, 'extra cell beyond the header is dropped');
  // a lone |-line with no separator is NOT a table (renders as a paragraph)
  const notTable = kbMd_('| just text |');
  assert.ok(notTable.indexOf('<table>') < 0, 'no separator → no table');
});
test('renders images (http(s) only) with escaped alt + URL quotes', () => {
  const out = kbMd_('![cap](https://e.com/i.png)');
  assert.ok(out.indexOf('<img src="https://e.com/i.png"') >= 0, 'img emitted');
  assert.ok(out.indexOf('alt="cap"') >= 0, 'alt carried');
  assert.ok(out.indexOf('loading="lazy"') >= 0, 'lazy loading');
  assert.ok(out.indexOf('<a href="https://e.com/i.png"') >= 0, 'wrapped in an open-full-size anchor');
  // scheme restriction: javascript:/data:/mailto demote to plain alt text
  const js = kbMd_('![x](javascript:alert(1))');
  assert.ok(js.indexOf('<img') < 0 && js.indexOf('javascript:') < 0, 'javascript: image not rendered');
  assert.ok(js.indexOf('x') >= 0, 'alt text kept as plain text');
  assert.ok(kbMd_('![x](data:image/svg+xml,abc)').indexOf('<img') < 0, 'data: image not rendered');
  // attribute breakout guards: quotes encoded in src, entity-escaped in alt
  const q = kbMd_('![a" onerror=alert(1)](https://e.com/i.png)');
  assert.ok(q.indexOf('" onerror') < 0, 'quote in alt must not terminate the attribute');
  assert.ok(q.indexOf('&quot;') >= 0, 'alt quote entity-escaped');
  const uq = kbMd_('![x](https://e.com/"o.png)');
  assert.ok(uq.indexOf('"o.png') < 0 && uq.indexOf('%22') >= 0, 'quote in src percent-encoded');
});
test('#6 — a ```snippet fence renders a copyable card; other fences stay <pre><code>', () => {
  const snip = kbMd_('```snippet: Greeting\nHi {name}, thanks for calling\n```');
  assert.ok(snip.indexOf('class="kb-snippet"') >= 0, 'snippet card emitted');
  assert.ok(snip.indexOf('kbCopySnippet_(this)') >= 0, 'copy button wired');
  assert.ok(snip.indexOf('Greeting') >= 0, 'label carried');
  assert.ok(snip.indexOf('Hi {name}, thanks for calling') >= 0, 'body carried');
  assert.ok(snip.indexOf('<pre class="kb-snippet-body">') >= 0, 'body in a pre');
  // a plain fence and a language fence are NOT snippets (unchanged behavior)
  const code = kbMd_('```\nplain code\n```');
  assert.ok(code.indexOf('<pre><code>') >= 0 && code.indexOf('kb-snippet') < 0, 'plain fence stays a code block');
  const lang = kbMd_('```js\nvar x=1;\n```');
  assert.ok(lang.indexOf('<pre><code>') >= 0 && lang.indexOf('kb-snippet') < 0, 'language fence stays a code block');
  // the snippet body is still HTML-escaped (the escape boundary is not re-opened)
  const xss = kbMd_('```snippet\n<img src=x onerror=alert(1)>\n```');
  assert.ok(xss.indexOf('<img src=x') < 0 && xss.indexOf('&lt;img') >= 0, 'snippet body escaped');
  // C17 batch-4: a MID-LINE backtick pair is NOT a block fence — the old
  // any-occurrence regex stashed its content into a block whose sentinel
  // token was never re-expanded (only whole-line tokens are), so the content
  // vanished and a stray "C0" glyph rendered. Inline pairs stay literal.
  const inline = kbMd_('Use ```x``` here');
  // The inline-code pass may legitimately render the middle as a code span —
  // the pin is CONTENT PRESERVATION (the old regex made `x` vanish entirely
  // and left a stray sentinel glyph), not literal backtick fidelity.
  assert.ok(/x/.test(inline) && /Use/.test(inline) && /here/.test(inline),
    'inline backtick pair content is preserved');
  assert.ok(inline.indexOf('\u0000') < 0, 'no unexpanded sentinel leaks into the render');
  // A block fence with text trailing the closing ``` on the SAME line is not
  // a closed block either — nothing may vanish.
  const trailing = kbMd_('```js\nvar a=1;``` and more');
  assert.ok(trailing.indexOf('var a=1;') >= 0, 'unclosed-block content is preserved');
});

console.log('\nkb — bookmarks (kbBookmarksToggle_ pure list op, #5)');
const kbBookmarksToggle_ = loadFunction(sb, 'kb/script_kb.html', 'kbBookmarksToggle_');
test('toggles add/remove, dedupes by id, prepends newest, caps length', () => {
  let l = kbBookmarksToggle_([], { id: 'a', title: 'A' }, 3);
  assert.equal(l.length, 1); assert.equal(l[0].id, 'a');
  l = kbBookmarksToggle_(l, { id: 'a', title: 'A' }, 3);   // toggling again removes it
  assert.equal(l.length, 0, 'second toggle removes');
  l = kbBookmarksToggle_([{ id: 'b', title: 'B' }], { id: 'c', title: 'C' }, 3);
  assert.equal(l[0].id, 'c'); assert.equal(l[1].id, 'b');   // newest first
  const capped = kbBookmarksToggle_([{ id: '1' }, { id: '2' }, { id: '3' }], { id: '4' }, 3);
  assert.equal(capped.length, 3); assert.equal(capped[0].id, '4');   // cap on add, '3' dropped
});

console.log('\nkb — section-aware search helpers (split / truncate / score / slug parity)');
const _kbSearchCtx = vm.createContext({});
// Seed the module constants kbChunkTruncate_ reads, DERIVED from Code.js so
// the pin tracks the real values instead of a hand-copied guess.
['KB_CHUNK_MAX_CHARS', 'KB_CHUNK_FENCE_OVERAGE'].forEach((k) => {
  const m = new RegExp('const ' + k + '\\s*=\\s*(\\d+)').exec(
    fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8'));
  assert.ok(m, k + ' is declared in Code.js');
  vm.runInContext('const ' + k + ' = ' + m[1] + ';', _kbSearchCtx);
});
['kbSlug_', 'kbSplitSections_', 'kbChunkTruncate_', 'kbSearchScore_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _kbSearchCtx, { filename: 'Code.js#' + fn });
});
const srvKbSlug_ = _kbSearchCtx.kbSlug_;
const kbSplitSections_ = _kbSearchCtx.kbSplitSections_;
const kbChunkTruncate_ = _kbSearchCtx.kbChunkTruncate_;
const kbSearchScore_ = _kbSearchCtx.kbSearchScore_;

// #7 — co-view "See also" ranking (pure)
const _kbRelCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'kbCoViewRelated_'), _kbRelCtx, { filename: 'Code.js#kbCoViewRelated_' });
const kbCoViewRelated_ = _kbRelCtx.kbCoViewRelated_;
test('#7 kbCoViewRelated_: ranks co-viewed items, thresholds thin data, excludes self', () => {
  // target 'A' co-viewed with 'B' in 2 sessions, 'C' in 1 session.
  const ev = [
    { rep: 'r1', day: '2026-07-01', id: 'A' }, { rep: 'r1', day: '2026-07-01', id: 'B' },
    { rep: 'r2', day: '2026-07-01', id: 'A' }, { rep: 'r2', day: '2026-07-01', id: 'B' }, { rep: 'r2', day: '2026-07-01', id: 'C' },
    { rep: 'r3', day: '2026-07-02', id: 'X' }, { rep: 'r3', day: '2026-07-02', id: 'Y' },   // unrelated session
  ];
  const out = kbCoViewRelated_(ev, 'A', 2, 5);
  assert.strictEqual(out.length, 1, 'only B clears the ≥2 co-view threshold');
  assert.strictEqual(out[0].id, 'B');
  assert.strictEqual(out[0].coviews, 2);
  // never returns the target itself, even if repeated
  const self = kbCoViewRelated_([{ rep: 'r', day: 'd', id: 'A' }, { rep: 'r', day: 'd', id: 'A' }], 'A', 1, 5);
  assert.strictEqual(self.length, 0, 'self excluded');
  // distinct sessions: same rep+day counts a pair once regardless of repeats
  const once = kbCoViewRelated_([
    { rep: 'r', day: 'd', id: 'A' }, { rep: 'r', day: 'd', id: 'B' }, { rep: 'r', day: 'd', id: 'B' },
  ], 'A', 1, 5);
  assert.strictEqual(once[0].coviews, 1, 'one session = one co-view');
});

test('kbSplitSections_: preamble + heading sections, heading excluded from md', () => {
  const secs = kbSplitSections_('intro text\n\n# One\nbody one\n\n## Two\nbody two');
  assert.strictEqual(secs.length, 3);
  assert.strictEqual(secs[0].heading, '');
  assert.strictEqual(secs[0].md, 'intro text');
  assert.strictEqual(secs[1].heading, 'One');
  assert.strictEqual(secs[1].anchor, 'one');
  assert.strictEqual(secs[1].md, 'body one');
  assert.strictEqual(secs[2].anchor, 'two');
});
test('kbSplitSections_: fenced # lines do not split; duplicate anchors dedupe', () => {
  const secs = kbSplitSections_('# Real\n```\n# not a heading\n```\nafter\n\n# Real\nx');
  assert.strictEqual(secs.length, 2, 'fenced # stays inside its section');
  assert.ok(secs[0].md.indexOf('# not a heading') >= 0);
  assert.strictEqual(secs[0].anchor, 'real');
  assert.strictEqual(secs[1].anchor, 'real-2', 'duplicate heading anchor suffixed');
});
test('anchor slugs: server kbSlug_ matches kbMd_\'s heading ids (parity pair)', () => {
  // The server slugs RAW markdown; kbMd_ slugs the ESCAPED source — the
  // entity de-escape inside both copies keeps them identical.
  assert.strictEqual(srvKbSlug_('Q&A / Setup'), 'q-a-setup');
  assert.ok(kbMd_('# Q&A / Setup').indexOf('id="kb-h-q-a-setup"') >= 0);
  // and the dedup walks agree
  const anchors = kbSplitSections_('## Dup\nx\n\n## Dup\ny').map((s) => s.anchor);
  assert.strictEqual(anchors.join(','), 'dup,dup-2');
});
test('kbChunkTruncate_: a fenced block is ATOMIC — never cut in half', () => {
  // Cutting inside a ```roster used to leave an odd fence, which was
  // "repaired" by appending a close — producing a syntactically VALID but
  // incomplete block. In production that rendered a confident interactive
  // roster holding 10 of 14 teams and reporting "40 people" for a 46-person
  // roster; a truncated ```snippet would hand a rep a canned response to copy
  // that stops mid-sentence. Prose can carry a "continues in the article"
  // note; these cannot.
  const body = 'intro\n\n```roster\n' + Array.from({ length: 14 },
    (_, i) => 'team| T' + i + ': Ann, Bob, Cy').join('\n') + '\n```';
  const r = kbChunkTruncate_(body, 200);
  assert.strictEqual((r.md.match(/^team\|/gm) || []).length, 14, 'every line of the block survives');
  assert.strictEqual((r.md.match(/^\s*```/gm) || []).length, 2, 'and its fences are the real ones');
  // Bounded: one enormous fence must not blow the payload — it is dropped
  // instead, leaving the prose before it.
  const huge = 'intro\n\n```roster\n' + 'team| T: ' + 'x'.repeat(9000) + '\n```';
  const h = kbChunkTruncate_(huge, 200);
  assert.ok(h.md.indexOf('```') < 0, 'an oversized block is dropped, not halved');
  assert.ok(h.md.indexOf('intro') >= 0, 'the prose before it is kept');
});
test('kbChunkTruncate_: paragraph-boundary cut + odd-fence repair', () => {
  const short = kbChunkTruncate_('small', 100);
  assert.strictEqual(short.truncated, false);
  // boundary at ~44 chars is past the 40%-of-cap floor, so the cut lands there
  const long = kbChunkTruncate_('p '.repeat(22) + '\n\n' + 'x'.repeat(200), 60);
  assert.strictEqual(long.truncated, true);
  assert.ok(long.md.indexOf('x') < 0, 'cut lands on the paragraph boundary before the cap');
  const fence = kbChunkTruncate_('```\ncode\n' + 'y'.repeat(200), 50);
  assert.ok((fence.md.match(/^\s*```/gm) || []).length % 2 === 0, 'odd fence count repaired');
});
test('kbSearchScore_: section-text hit required; heading > body; title + phrase boost', () => {
  // title-only match scores 0 — the caller emits a doc-level hit instead of
  // flooding every section of a title-matched doc into the results
  assert.strictEqual(kbSearchScore_(['war'], 'war', 'warranty guide', 'intro', 'nothing here'), 0);
  // (3-char query → below the 4-char phrase-bonus floor, isolating the weights)
  assert.strictEqual(kbSearchScore_(['war'], 'war', '', '', 'warranty info'), 1, 'body hit = 1');
  assert.strictEqual(kbSearchScore_(['war'], 'war', '', 'warranty terms', 'x'), 2, 'heading hit = 2');
  assert.strictEqual(kbSearchScore_(['war'], 'war', 'warranty guide', '', 'warranty info'), 4, 'body 1 + title 3');
  // a 4+ char single-token query that matches IS its own exact phrase (+2)
  assert.strictEqual(kbSearchScore_(['warranty'], 'warranty', '', '', 'warranty info'), 3, 'body 1 + phrase 2');
  // multi-token: each distinct token scores its best location (no phrase
  // bonus here — the exact phrase appears in neither heading nor body)
  assert.strictEqual(kbSearchScore_(['wheelchair', 'repair'], 'wheelchair repair', '', 'repair process', 'wheelchair steps'),
    3, 'heading hit 2 + body hit 1');
  // exact-phrase bonus when the full query appears
  assert.strictEqual(kbSearchScore_(['return', 'policy'], 'return policy', '', '', 'our return policy is simple'),
    1 + 1 + 2, 'two body hits + phrase bonus');
});

console.log('\nkb — drawer pure helpers (recents list + title-match suggestions)');
const kbRecentsPush_ = loadFunction(sb, 'kb/script_kb.html', 'kbRecentsPush_');
const kbSuggestMatches_ = loadFunction(sb, 'kb/script_kb.html', 'kbSuggestMatches_');
test('kbRecentsPush_: prepends, dedupes by id, caps at 5', () => {
  const l1 = kbRecentsPush_([], { id: 'a', title: 'A' });
  assert.strictEqual(l1.length, 1);
  assert.strictEqual(l1[0].id, 'a');
  // re-opening an item moves it to the front (no duplicate)
  const l2 = kbRecentsPush_([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], { id: 'b', title: 'B' });
  assert.strictEqual(l2.map((r) => r.id).join(','), 'b,a');
  // cap: 5 entries max, oldest dropped
  let list = [];
  for (let i = 0; i < 8; i++) list = kbRecentsPush_(list, { id: 'i' + i, title: 'T' + i });
  assert.strictEqual(list.length, 5);
  assert.strictEqual(list[0].id, 'i7');
  assert.strictEqual(list[4].id, 'i3');
});
test('kbSuggestMatches_: 4+ char tokens, scored by distinct title hits, capped', () => {
  const tree = [
    { id: '1', title: 'Wheelchair repair process' },
    { id: '2', title: 'Repair escalation policy' },
    { id: '3', title: 'PTO calendar' },
  ];
  const m = kbSuggestMatches_(tree, 'patient needs wheelchair repair asap', 3);
  assert.strictEqual(m[0].id, '1', 'two token hits ranks first (wheelchair + repair)');
  assert.strictEqual(m[1].id, '2', 'one token hit second');
  assert.strictEqual(m.length, 2, 'non-matching items excluded');
  // short words never match (no 1-3 char token noise like "pto" mid-word)
  assert.strictEqual(kbSuggestMatches_(tree, 'the a of is to', 3).length, 0);
  assert.strictEqual(kbSuggestMatches_(tree, '', 3).length, 0, 'empty text → no suggestions');
  assert.strictEqual(kbSuggestMatches_(null, 'wheelchair', 3).length, 0, 'no tree → no suggestions');
  // repeated tokens count once (distinct-token scoring)
  const rep = kbSuggestMatches_(tree, 'repair repair repair', 3);
  assert.strictEqual(rep.length, 2, 'duplicate tokens deduped before scoring');
});

console.log('\nCode.js — kbParseDriveUrl_() extracts {kind,fileId} from Drive URLs');
const _kbCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'kbParseDriveUrl_'), _kbCtx, { filename: 'Code.js#kbParseDriveUrl_' });
const kbParseDriveUrl_ = _kbCtx.kbParseDriveUrl_;
test('parses Doc / Sheet / file URLs and rejects junk', () => {
  assert.strictEqual(kbParseDriveUrl_('https://docs.google.com/document/d/ABC123/edit').kind, 'doc');
  assert.strictEqual(kbParseDriveUrl_('https://docs.google.com/spreadsheets/d/SHEET9/edit#gid=0').kind, 'sheet');
  assert.strictEqual(kbParseDriveUrl_('https://drive.google.com/file/d/FILE7/view').fileId, 'FILE7');
  assert.strictEqual(kbParseDriveUrl_('not a url'), null);
});

// ── KB Phase 2 — Doc→markdown converter ─────────────────────────────────────
// kbDocBodyToMarkdown_ compares String(getType()) etc. against enum NAMES
// (DocumentApp enums stringify to their names), so plain-object stubs can
// drive the whole walker here. The stubs mirror exactly the DocumentApp
// surface the converter touches.
console.log('\nkb — Doc→markdown converter (kbDocBodyToMarkdown_ via DocumentApp stubs)');
const _kbConvCtx = vm.createContext({
  KB_DOC_HEADING_PREFIX: {
    TITLE: '# ', HEADING1: '# ', HEADING2: '## ', HEADING3: '### ',
    HEADING4: '#### ', HEADING5: '##### ', HEADING6: '###### ', SUBTITLE: '## ',
  },
  KB_DOC_IMAGE_CAP: 20,   // mirrors Code.js (Phase 2b export cap)
});
['kbTextToRuns_', 'kbRunsToMarkdown_', 'kbDocBodyToMarkdown_',
 'kbExtractDocImageRefs_', 'kbReplaceDocImageTokens_', 'kbCollectDocInlineImages_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _kbConvCtx, { filename: 'Code.js#' + fn });
});
const kbRunsToMarkdown_ = _kbConvCtx.kbRunsToMarkdown_;
const kbDocBodyToMarkdown_ = _kbConvCtx.kbDocBodyToMarkdown_;
const kbExtractDocImageRefs_ = _kbConvCtx.kbExtractDocImageRefs_;
const kbReplaceDocImageTokens_ = _kbConvCtx.kbReplaceDocImageTokens_;
const kbCollectDocInlineImages_ = _kbConvCtx.kbCollectDocInlineImages_;

function mkText(runs) {  // runs: [{text, bold, italic, link}]
  const full = runs.map((r) => r.text).join('');
  const starts = [];
  let pos = 0;
  runs.forEach((r) => { starts.push(pos); pos += r.text.length; });
  const runAt = (off) => {
    for (let i = runs.length - 1; i >= 0; i--) if (off >= starts[i]) return runs[i];
    return runs[0];
  };
  return {
    getText: () => full,
    getTextAttributeIndices: () => starts,
    isBold: (o) => !!runAt(o).bold,
    isItalic: (o) => !!runAt(o).italic,
    getLinkUrl: (o) => runAt(o).link || null,
  };
}
function mkPara(opts) {  // {heading?, runs?, children?: [elementTypeNames]}
  const kids = (opts.children || []).map((t) => ({ getType: () => t }));
  return {
    getType: () => 'PARAGRAPH',
    getHeading: () => opts.heading || 'NORMAL',
    getNumChildren: () => kids.length,
    getChild: (i) => kids[i],
    editAsText: () => mkText(opts.runs || []),
  };
}
function mkList(opts) {  // {glyph?, nest?, runs}
  return {
    getType: () => 'LIST_ITEM',
    getGlyphType: () => (opts.glyph === undefined ? 'BULLET' : opts.glyph),
    getNestingLevel: () => opts.nest || 0,
    editAsText: () => mkText(opts.runs || []),
  };
}
function mkTable(rows) {  // rows: [[cell, ...], ...] — cell: string | {runs, nested?}
  const mkCell = (def) => {
    const runs = (def && typeof def === 'object') ? (def.runs || []) : [{ text: String(def == null ? '' : def) }];
    const kids = (def && typeof def === 'object' && def.nested) ? [{ getType: () => 'TABLE' }] : [];
    return {
      getText: () => runs.map((r) => r.text).join(''),
      editAsText: () => mkText(runs),
      getNumChildren: () => kids.length,
      getChild: (i) => kids[i],
    };
  };
  return {
    getType: () => 'TABLE',
    getNumRows: () => rows.length,
    getRow: (r) => ({
      getNumCells: () => rows[r].length,
      getCell: (c) => mkCell(rows[r][c]),
    }),
  };
}
function mkBody(els) { return { getNumChildren: () => els.length, getChild: (i) => els[i] }; }

test('kbRunsToMarkdown_: bold/italic/link emission is kbMd_-render-safe', () => {
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'plain ' }, { text: 'bold', bold: true }]), 'plain **bold**');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'it', italic: true }]), '*it*');
  // bold+italic collapses to bold (kbMd_ can't render ***)
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'both', bold: true, italic: true }]), '**both**');
  // trailing run whitespace stays OUTSIDE the markers
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'b ', bold: true }, { text: 'after' }]), '**b** after');
  // links: http(s)/mailto only; parens/spaces percent-encoded; [] stripped from text
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'go', link: 'https://e.com/a(1) b' }]),
    '[go](https://e.com/a%281%29%20b)');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'x[y]', link: 'https://e.com' }]), '[xy](https://e.com)');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'js', link: 'javascript:alert(1)' }]), 'js');
  // Docs soft line-break (\r) becomes a space
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'a\rb' }]), 'a b');
});

test('converts headings, paragraphs, lists, and hr', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkPara({ heading: 'HEADING1', runs: [{ text: 'Title' }] }),
    mkPara({ runs: [{ text: 'Body with ' }, { text: 'bold', bold: true }, { text: '.' }] }),
    mkList({ runs: [{ text: 'one' }] }),
    mkList({ runs: [{ text: 'two' }] }),
    mkList({ glyph: 'NUMBER', runs: [{ text: 'first' }] }),
    mkPara({ children: ['HORIZONTAL_RULE'] }),
    mkPara({ heading: 'HEADING2', runs: [{ text: 'Sub' }] }),
  ]));
  assert.strictEqual(res.markdown,
    '# Title\n\nBody with **bold**.\n\n- one\n- two\n1. first\n\n---\n\n## Sub');
  // strictEqual on length (not deepStrictEqual on the array) — the result
  // array comes from the vm context, whose Array prototype differs.
  assert.strictEqual(res.warnings.length, 0);
});

test('converts tables to GFM (row 0 = header); images placeholder + warn WITHOUT a docId', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkTable([['H1', 'H2'], ['a', 'b']]),
    mkPara({ runs: [{ text: 'caption' }], children: ['INLINE_IMAGE'] }),
  ]));
  assert.ok(res.markdown.indexOf('| H1 | H2 |\n| --- | --- |\n| a | b |') >= 0, 'GFM table emitted');
  assert.ok(res.markdown.indexOf('caption *[image — see the original Doc]*') >= 0, 'image placeholder appended');
  assert.strictEqual(res.warnings.length, 1, 'tables no longer warn — only the image does');
  assert.ok(/1 image/.test(res.warnings.join(' ')));
});

test('table cells: formatting survives, pipes escape, ragged rows pad, lossy cases warn', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkTable([
      [{ runs: [{ text: 'Bold', bold: true }] }, 'A | B'],
      [{ runs: [{ text: 'line1\nline2' }] }],                       // ragged + multi-line
      ['x', { runs: [{ text: 'nest' }], nested: true }],            // nested table
    ]),
  ]));
  assert.ok(res.markdown.indexOf('| **Bold** | A \\| B |') >= 0, 'bold survives; literal pipe escaped');
  assert.ok(res.markdown.indexOf('| line1 line2 |  |') >= 0, 'multi-line cell joined; short row padded');
  assert.ok(/multiple lines/.test(res.warnings.join(' ')), 'line-break cells warned');
  assert.ok(/Nested table/.test(res.warnings.join(' ')), 'nested tables warned');
  // Round-trip tripwire: the converter's GFM must be renderable by kbMd_ —
  // the two formats are a parallel source-of-truth pair.
  const html = kbMd_(res.markdown);
  assert.ok(html.indexOf('<table>') >= 0, 'kbMd_ parses the converter output as a table');
  assert.ok(html.indexOf('<th>A | B</th>') >= 0, 'escaped pipe round-trips through kbMd_ (header row)');
  assert.ok(html.indexOf('<th><strong>Bold</strong></th>') >= 0, 'bold round-trips inside a header cell');
});

test('empty table emits nothing (no stray separator)', () => {
  const res = kbDocBodyToMarkdown_(mkBody([mkTable([['', ''], ['', '']])]));
  assert.strictEqual(res.markdown, '');
});

test('skips unsupported elements with a warning; null glyph defaults to bullet', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    { getType: () => 'TABLE_OF_CONTENTS' },
    mkList({ glyph: null, runs: [{ text: 'item' }] }),
  ]));
  assert.strictEqual(res.markdown, '- item');
  assert.ok(/TABLE_OF_CONTENTS/.test(res.warnings.join(' ')), 'skipped type named in warnings');
});

console.log('\nkb — Phase 2b converter image export (tokens, resolution, walk mirror)');
test('with a docId, INLINE_IMAGE emits a kbdoc token; INLINE_DRAWING stays a placeholder', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkPara({ runs: [{ text: 'pic' }], children: ['INLINE_IMAGE'] }),
    mkPara({ runs: [{ text: 'sketch' }], children: ['INLINE_DRAWING'] }),
  ]), 'DOC123_-x');
  assert.ok(res.markdown.indexOf('pic ![Doc image 1](kbdoc:DOC123_-x:1)') >= 0, 'image token emitted');
  assert.ok(res.markdown.indexOf('sketch *[image — see the original Doc]*') >= 0, 'drawing keeps placeholder (no blob API)');
  assert.ok(res.warnings.some((w) => /1 image\(s\) marked for export/.test(w)), 'export warning');
  assert.ok(res.warnings.some((w) => /could not be converted/.test(w)), 'drawing placeholder warning');
});
test('per-doc cap: images past KB_DOC_IMAGE_CAP degrade to placeholders', () => {
  const paras = [];
  for (let i = 0; i < 21; i++) paras.push(mkPara({ runs: [{ text: 'p' + i }], children: ['INLINE_IMAGE'] }));
  const res = kbDocBodyToMarkdown_(mkBody(paras), 'CAPDOC');
  const tokens = res.markdown.match(/kbdoc:CAPDOC:\d+/g) || [];
  assert.strictEqual(tokens.length, 20, '20 tokens');
  assert.strictEqual((res.markdown.match(/\[image — see the original Doc\]/g) || []).length, 1, '21st is a placeholder');
});
test('kbExtractDocImageRefs_ dedupes and parses {fileId, ord}', () => {
  const refs = kbExtractDocImageRefs_(
    '![a](kbdoc:F1:1) text ![b](kbdoc:F1:2) ![dup](kbdoc:F1:1) ![c](kbdoc:F2_x-9:3) ![not](http://x/y.png) kbdoc:F9:9');
  // JSON compare — the refs are vm-realm objects, so deepStrictEqual fails
  // on cross-realm prototypes even when the values match.
  assert.strictEqual(JSON.stringify(refs),
    JSON.stringify([{ fileId: 'F1', ord: 1 }, { fileId: 'F1', ord: 2 }, { fileId: 'F2_x-9', ord: 3 }]),
    'unique image tokens only — bare kbdoc text and http images ignored');
});
test('kbReplaceDocImageTokens_ swaps resolved tokens, degrades failures to placeholders', () => {
  const r = kbReplaceDocImageTokens_(
    '![Doc image 1](kbdoc:F1:1) and ![two](kbdoc:F1:2) and ![boom](kbdoc:F1:3)',
    (fileId, ord) => {
      if (ord === 1) return 'https://drive.google.com/thumbnail?id=ABC&sz=w1200';
      if (ord === 3) throw new Error('nope');
      return null;
    });
  assert.ok(r.bodyMd.indexOf('![Doc image 1](https://drive.google.com/thumbnail?id=ABC&sz=w1200)') >= 0, 'alt preserved, URL swapped');
  assert.strictEqual((r.bodyMd.match(/\[image — see the original Doc\]/g) || []).length, 2, 'null + throw both degrade');
  assert.strictEqual(r.failed, 2);
});
test('kbCollectDocInlineImages_ mirrors the converter walk (paragraph images only, in order, capped)', () => {
  const img = (tag) => ({ getType: () => 'INLINE_IMAGE', getBlob: () => ({ tag }) });
  const para = (kids) => ({
    getType: () => 'PARAGRAPH', getHeading: () => 'NORMAL',
    getNumChildren: () => kids.length, getChild: (i) => kids[i],
    editAsText: () => mkText([]),
  });
  const body = mkBody([
    para([img('a'), { getType: () => 'INLINE_DRAWING' }, img('b')]),
    mkList({ runs: [{ text: 'li' }] }),                     // list images never tokenized → never collected
    mkTable([['x']]),                                        // table images likewise
    para([img('c')]),
  ]);
  const blobs = kbCollectDocInlineImages_(body, 20);
  assert.strictEqual(Array.prototype.map.call(blobs, (b) => b.tag).join(','), 'a,b,c',
    'document order, drawings skipped (string compare — vm-realm array)');
  assert.strictEqual(kbCollectDocInlineImages_(body, 2).length, 2, 'cap respected');
});
test('kbParseImageDataUrl_: shape-parses image data URLs, rejects everything else', () => {
  const parse = (() => {
    const ctx = vm.createContext({});
    vm.runInContext(extractRawFunction('Code.js', 'kbParseImageDataUrl_'), ctx);
    return ctx.kbParseImageDataUrl_;
  })();
  const ok = parse('data:image/png;base64,iVBOR\nw0KGgo=');
  assert.strictEqual(ok.contentType, 'image/png');
  assert.strictEqual(ok.base64, 'iVBORw0KGgo=', 'whitespace stripped from base64');
  assert.strictEqual(parse('data:image/svg+xml;base64,AAAA').contentType, 'image/svg+xml',
    'parser shape-accepts svg — the TYPE WHITELIST at the caller is what rejects it');
  assert.strictEqual(parse('data:text/html;base64,AAAA'), null, 'non-image scheme rejected');
  assert.strictEqual(parse('https://x/y.png'), null);
  assert.strictEqual(parse('data:image/png;base64,!!!'), null, 'non-base64 payload rejected');
  assert.strictEqual(parse(''), null);
});
test('kbMd_: kbdoc tokens demote to alt text in preview; the Drive thumbnail URL renders an <img>', () => {
  const prev = kbMd_('![Doc image 1](kbdoc:F1:1)');
  assert.strictEqual(prev.indexOf('<img'), -1, 'unresolved token never renders an img (non-http scheme)');
  assert.ok(prev.indexOf('Doc image 1') >= 0, 'alt text shows in the editor preview');
  const final = kbMd_('![Doc image 1](https://drive.google.com/thumbnail?id=ABC&sz=w1200)');
  assert.ok(/<img[^>]+src="https:\/\/drive\.google\.com\/thumbnail\?id=ABC&(amp;)?sz=w1200"/.test(final), 'resolved URL renders');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nkb — AI Phase A facet guidance (whitelist / canonical hash / prompt — INV-119)');
// The pure pipeline between the client's raw facets and the vendor payload.
// kbAiSanitizeFacets_ is the privacy boundary: only vocabulary values
// survive, so the prompt builder (which takes ONLY sanitized facets + KB
// chunks) cannot carry free-typed note text to the vendor.
const _aiCtx = vm.createContext({});
['kbAiSanitizeFacets_', 'kbAiCanonicalFacets_', 'kbAiQueryTerms_', 'kbAiBuildPrompt_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _aiCtx, { filename: 'Code.js#' + fn });
});
const _aiVocab = {
  departments: ['Sales', 'Billing'],
  updateTypes: ['Verified Shipping', 'Close Order'],
  flagTypes: ['action', 'training', 'review', 'urgent'],
  tags: ['battery-swap', 'warranty'],
};
test('kbAiSanitizeFacets_: drops every non-vocabulary value (novel facets never survive)', () => {
  const clean = _aiCtx.kbAiSanitizeFacets_({
    department: 'NotADept',
    updateType: 'PATIENT JOHN DOE called about TRX-12345',   // free text masquerading as a facet
    flagType: 'banana',
    tags: ['warranty', 'totally-new-tag', 'warranty'],
  }, _aiVocab);
  assert.strictEqual(clean.department, '');
  assert.strictEqual(clean.updateType, '');
  assert.strictEqual(clean.flagType, '');
  assert.strictEqual(JSON.stringify(clean.tags), '["warranty"]', 'novel tag dropped, dup deduped (vm-realm array — string compare)');
});
test('kbAiSanitizeFacets_: case-insensitive match returns canonical vocab casing; tags cap at 8', () => {
  const clean = _aiCtx.kbAiSanitizeFacets_(
    { department: 'sales', updateType: 'close order', flagType: 'URGENT', tags: ['Battery-Swap'] }, _aiVocab);
  assert.strictEqual(clean.department, 'Sales');
  assert.strictEqual(clean.updateType, 'Close Order');
  assert.strictEqual(clean.flagType, 'urgent');
  assert.strictEqual(JSON.stringify(clean.tags), '["battery-swap"]');
  const manyVocab = { tags: 'abcdefghij'.split('').map((c) => 't-' + c) };
  const many = _aiCtx.kbAiSanitizeFacets_({ tags: manyVocab.tags }, manyVocab);
  assert.strictEqual(many.tags.length, 8, 'tag cap');
});
test('kbAiCanonicalFacets_: order-insensitive, lowercased, empties omitted', () => {
  const a = _aiCtx.kbAiCanonicalFacets_({ department: 'Sales', updateType: 'Close Order', flagType: 'action', tags: ['warranty', 'battery-swap'] });
  const b = _aiCtx.kbAiCanonicalFacets_({ tags: ['battery-swap', 'warranty'], flagType: 'action', updateType: 'Close Order', department: 'Sales' });
  assert.strictEqual(a, b, 'tag order does not change the hash payload');
  assert.strictEqual(a, 'dept=sales|update=close order|flag=action|tags=battery-swap,warranty');
  assert.strictEqual(_aiCtx.kbAiCanonicalFacets_({ flagType: 'action' }), 'flag=action', 'empty facets omitted');
});
test('kbAiQueryTerms_: kebab tags split to words; joins update/flag/dept', () => {
  const q = _aiCtx.kbAiQueryTerms_({ department: 'Sales', updateType: 'Close Order', flagType: 'action', tags: ['battery-swap'] });
  assert.strictEqual(q, 'Close Order battery swap action Sales');
});
test('kbAiBuildPrompt_: payload = sanitized facets + chunks only (INV-119 — free text cannot pass through)', () => {
  const raw = { department: 'Sales', flagType: 'action', tags: ['warranty'],
                issue: 'PATIENT JOHN DOE TRX-9 wheelchair broke', updateType: '' };
  const clean = _aiCtx.kbAiSanitizeFacets_(raw, _aiVocab);
  const prompt = _aiCtx.kbAiBuildPrompt_(clean, [
    { title: 'Warranty guide', heading: 'Swaps', chunkMd: 'Always file a swap ticket first.' },
  ]);
  const all = prompt.system + '\n' + prompt.user;
  assert.ok(all.indexOf('Department: Sales') >= 0 && all.indexOf('Tags: warranty') >= 0, 'facets present');
  assert.ok(all.indexOf('Always file a swap ticket first.') >= 0, 'KB chunk present');
  assert.strictEqual(all.indexOf('JOHN DOE'), -1, 'free-typed text never reaches the prompt');
  assert.strictEqual(all.indexOf('TRX-9'), -1);
});
test('kbGetFacetGuidance source tripwire: the vendor prompt is built from (clean, chunks) only', () => {
  const src = extractRawFunction('Code.js', 'kbGetFacetGuidance');
  assert.ok(src.indexOf('kbAiBuildPrompt_(clean, chunks)') >= 0,
    'prompt builder must be fed the SANITIZED facets, never the raw client payload');
  assert.strictEqual(/kbAiBuildPrompt_\((?!clean, chunks\))/.test(src), false,
    'no alternate kbAiBuildPrompt_ callsite with different inputs');
});

// ─────────────────────────────────────────────────────────────────────────────
// Training & Employee Docs — T1 (docs/training-employee-docs-spec.md).
// trainDeriveStatus_ is the pure status rule shared by getMyTraining +
// getTrainingDashboard (server); trainChipHtml_ is its client render twin.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ntraining — status derivation + chip render (T1)');
vm.runInContext(extractRawFunction('Code.js', 'trainDeriveStatus_'), sb,
  { filename: 'Code.js#trainDeriveStatus_' });
const trainDeriveStatus_ = sb.trainDeriveStatus_;
const trainChipHtml_ = loadFunction(sb, 'train/script_training.html', 'trainChipHtml_');
test('trainDeriveStatus_: done wins regardless of due date', () => {
  assert.strictEqual(trainDeriveStatus_(true, '2026-01-01', '2026-06-12'), 'done');
  assert.strictEqual(trainDeriveStatus_(true, '', '2026-06-12'), 'done');
});
test('trainDeriveStatus_: overdue only past a non-empty due date', () => {
  assert.strictEqual(trainDeriveStatus_(false, '2026-06-11', '2026-06-12'), 'overdue');
  assert.strictEqual(trainDeriveStatus_(false, '2026-06-12', '2026-06-12'), 'pending', 'due today is not overdue');
  assert.strictEqual(trainDeriveStatus_(false, '', '2026-06-12'), 'pending', 'no due date never goes overdue');
});
test('trainChipHtml_: renders the three statuses; unknown degrades to pending', () => {
  assert.ok(trainChipHtml_('done').indexOf('tr-chip done') >= 0);
  assert.ok(trainChipHtml_('overdue').indexOf('Overdue') >= 0);
  assert.ok(trainChipHtml_('<script>').indexOf('tr-chip pending') >= 0, 'unknown status falls back to pending (no injection)');
});

// T2 — quizzes. The three pure helpers (validate / grade / strip) plus the
// answer-key privacy boundary: the rep-facing shape is WHITELIST-built and
// getQuiz must route through it (source tripwire).
console.log('\ntraining — quiz validate / grade / strip (T2)');
['TRAIN_QUIZ_MAX_QUESTIONS', 'TRAIN_QUIZ_MAX_OPTIONS'].forEach((name) => {
  const m = codeSrc.match(new RegExp('const (' + name + '\\s*=\\s*\\d+);'));
  assert.ok(m, name + ' declaration found in Code.js');
  vm.runInContext(m[1] + ';', sb, { filename: 'Code.js#' + name });
});
['trainValidateQuizDef_', 'trainGradeQuiz_', 'trainStripQuizForRep_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
const Q2 = { title: 'T', passPct: 80, questions: [
  { q: 'A?', options: ['x', 'y', 'z'], correct: 2 },
  { q: 'B?', options: ['t', 'f'], correct: 0 },
] };
test('trainValidateQuizDef_: normalizes a good def; rejects bad shapes', () => {
  const ok = sb.trainValidateQuizDef_(Q2);
  assert.ok(ok.ok, 'valid def accepted');
  assert.strictEqual(ok.quiz.questions.length, 2);
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, title: '' }).ok, false, 'empty title rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, passPct: 101 }).ok, false, 'passPct > 100 rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [] }).ok, false, 'no questions rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [{ q: 'A?', options: ['x'], correct: 0 }] }).ok, false, '1 option rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [{ q: 'A?', options: ['x', 'y'], correct: 5 }] }).ok, false, 'correct out of range rejected');
});
test('trainGradeQuiz_: grades right/wrong; missing answers count wrong; never returns correct indices', () => {
  const g = sb.trainGradeQuiz_(Q2.questions, [2, 1]);
  assert.strictEqual(g.scorePct, 50);
  // JSON-compare: sandbox arrays have a different realm prototype, which
  // deepStrictEqual rejects.
  assert.strictEqual(JSON.stringify(g.perQuestion), '[true,false]');
  const g2 = sb.trainGradeQuiz_(Q2.questions, [2]);   // second unanswered
  assert.strictEqual(JSON.stringify(g2.perQuestion), '[true,false]');
  assert.strictEqual(JSON.stringify(g).indexOf('correct'), -1, 'graded result carries no answer key');
});
test('trainStripQuizForRep_: whitelist-built — no correct key anywhere in the rep shape', () => {
  const stripped = sb.trainStripQuizForRep_('q1', sb.trainValidateQuizDef_(Q2).quiz);
  assert.strictEqual(JSON.stringify(stripped).indexOf('correct'), -1, 'answer key never leaves the server');
  assert.strictEqual(stripped.questions.length, 2);
  assert.strictEqual(JSON.stringify(stripped.questions[0].options), '["x","y","z"]');
});
test('trainParseFormId_: edit URL → id; bare id; /d/e/ published → error; junk → empty', () => {
  vm.runInContext(extractRawFunction('Code.js', 'trainParseFormId_'), sb, { filename: 'Code.js#trainParseFormId_' });
  const f = sb.trainParseFormId_;
  assert.strictEqual(f('https://docs.google.com/forms/d/1AbC_dEF-23/edit').id, '1AbC_dEF-23');
  assert.strictEqual(f('https://docs.google.com/forms/d/1AbC_dEF-23/viewform').id, '1AbC_dEF-23');
  assert.strictEqual(f('1AbCdefGhiJklmnopqrstuv').id, '1AbCdefGhiJklmnopqrstuv', 'bare drive-id-shaped string');
  assert.strictEqual(f('https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxxxxxx/viewform').error, 'published-link');
  assert.strictEqual(f('not a url').id, '');
  assert.strictEqual(f('').id, '');
});
test('getQuiz source tripwire: the rep response is built ONLY by trainStripQuizForRep_', () => {
  const src = extractRawFunction('Code.js', 'getQuiz');
  assert.ok(src.indexOf('return trainStripQuizForRep_(') >= 0, 'getQuiz returns the stripped shape');
  assert.strictEqual(src.indexOf('questionsJson'), -1, 'raw questions JSON never returned');
});

// T4 — quiz analytics aggregate (pure; manager-gated endpoint wraps it).
console.log('\ntraining — quiz analytics aggregate (T4)');
vm.runInContext(extractRawFunction('Code.js', 'trainQuizAnalytics_'), sb,
  { filename: 'Code.js#trainQuizAnalytics_' });
test('trainQuizAnalytics_: per-quiz counts, distinct reps, pass rate, averages; no answer keys', () => {
  const quizzes = { q1: { title: 'Safety', passPct: 80 }, q2: { title: 'Billing', passPct: 70 } };
  const attempts = [
    { quizId: 'q1', empId: 'A', scorePct: 100, passed: true },
    { quizId: 'q1', empId: 'A', scorePct: 60, passed: false },   // same rep, second try
    { quizId: 'q1', empId: 'B', scorePct: 50, passed: false },
    { quizId: 'qX', empId: 'C', scorePct: 90, passed: true },    // attempt for a deleted quiz — dropped
  ];
  const out = sb.trainQuizAnalytics_(quizzes, attempts);
  assert.strictEqual(out.length, 2, 'one row per existing quiz; deleted-quiz attempts dropped');
  const billing = out[0], safety = out[1];            // sorted by title: Billing, Safety
  assert.strictEqual(safety.title, 'Safety');
  assert.strictEqual(safety.attemptCount, 3);
  assert.strictEqual(safety.repsAttempted, 2, 'distinct reps');
  assert.strictEqual(safety.repsPassed, 1, 'A passed (once is enough), B did not');
  assert.strictEqual(safety.passRate, 50);
  assert.strictEqual(safety.avgScore, 70, '(100+60+50)/3 rounded');
  assert.strictEqual(safety.avgAttemptsPerRep, 1.5);
  assert.strictEqual(billing.attemptCount, 0, 'a quiz with no attempts still appears');
  assert.strictEqual(billing.passRate, null);
  assert.strictEqual(billing.avgScore, null);
  assert.strictEqual(JSON.stringify(out).indexOf('correct'), -1, 'aggregate carries no answer key');
});

// T4 #5/#6 — metrics anonymized team-avg + transfers data layer (pure helpers).
console.log('\nmetrics — percent parse + anonymized team-avg cohort guard (T4 #5/#6)');
['metricsParsePercent_', 'metricsTeamAvgSeries_', 'metricsBuildKpiSeries_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
test('metricsParsePercent_: strips %, commas; null on empty/garbage', () => {
  assert.strictEqual(sb.metricsParsePercent_('29.79%'), 29.79);
  assert.strictEqual(sb.metricsParsePercent_('10.00%'), 10);
  assert.strictEqual(sb.metricsParsePercent_('5'), 5, 'bare number ok');
  assert.strictEqual(sb.metricsParsePercent_('1,234'), 1234, 'commas stripped');
  assert.strictEqual(sb.metricsParsePercent_(''), null);
  assert.strictEqual(sb.metricsParsePercent_(null), null);
  assert.strictEqual(sb.metricsParsePercent_('n/a'), null, 'garbage → null');
});
test('metricsTeamAvgSeries_: per-day mean, suppressed below the cohort minimum (N=3)', () => {
  const perRepDaily = {
    '2026-05-15': { a: { v: 80 }, b: { v: 90 }, c: { v: 100 } },   // cohort 3 → avg 90
    '2026-05-16': { a: { v: 60 }, b: { v: 80 } },                  // cohort 2 → suppressed
    '2026-05-17': { a: { v: 50 }, b: { v: null }, c: { v: 70 }, d: { v: 60 } },  // null skipped → cohort 3
  };
  const dates = ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'];
  const out = sb.metricsTeamAvgSeries_(perRepDaily, dates, 'v', 3);
  assert.strictEqual(out[0].avg, 90); assert.strictEqual(out[0].cohort, 3);
  assert.strictEqual(out[1].avg, null, 'cohort 2 < 3 → suppressed (anonymity)'); assert.strictEqual(out[1].cohort, 2);
  assert.strictEqual(out[2].avg, 60, '(50+70+60)/3, null skipped'); assert.strictEqual(out[2].cohort, 3);
  assert.strictEqual(out[3].avg, null, 'no data → null'); assert.strictEqual(out[3].cohort, 0);
});
test('metricsBuildKpiSeries_: own value alongside the cohort-guarded team avg', () => {
  const perRepDaily = {
    '2026-05-15': { me: { v: 70 }, b: { v: 90 }, c: { v: 100 } },   // team cohort 3 → avg 86.7
    '2026-05-16': { me: { v: 55 }, b: { v: 65 } },                  // team cohort 2 → suppressed; own still shown
    '2026-05-17': { b: { v: 80 }, c: { v: 60 }, d: { v: 40 } },     // own absent
  };
  const dates = ['2026-05-15', '2026-05-16', '2026-05-17'];
  const out = sb.metricsBuildKpiSeries_(perRepDaily, dates, 'me', 'v', 3);
  assert.strictEqual(out[0].own, 70); assert.ok(Math.abs(out[0].team - 86.7) < 0.05); assert.strictEqual(out[0].cohort, 3);
  assert.strictEqual(out[1].own, 55, 'own shown even when team is suppressed'); assert.strictEqual(out[1].team, null);
  assert.strictEqual(out[2].own, null, 'own null when the rep had no data that day'); assert.strictEqual(out[2].team, 60);
});

// Operator feedback round (2026-06-12) — heuristic tag suggester (Call
// Notes) + search-term highlight tokenizer (KB drawer/Reference).
console.log('\noperator feedback — tag suggest + highlight tokenizer');
const cnSuggestTagsFromText_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnSuggestTagsFromText_');
test('cnSuggestTagsFromText_: matches own-vocabulary tags whose words appear; skips current; caps 4', () => {
  const vocab = ['battery-swap', 'warranty', 'shipping-delay', 'oop', 'a-b'];
  const got = cnSuggestTagsFromText_('Customer asked about a battery swap under warranty', vocab, []);
  assert.strictEqual(JSON.stringify(got), '["battery-swap","warranty"]');
  assert.strictEqual(cnSuggestTagsFromText_('battery swap', vocab, ['battery-swap']).indexOf('battery-swap'), -1, 'already-added tag skipped');
  assert.strictEqual(cnSuggestTagsFromText_('a b', vocab, []).length, 0, 'sub-3-char tag words never match');
  assert.strictEqual(cnSuggestTagsFromText_('', vocab, []).length, 0);
});
const kbHlRegex_ = loadFunction(sb, 'kb/script_kb.html', 'kbHlRegex_');
test('kbHlRegex_: token regex matches case-insensitively; escapes regex chars; null on empty', () => {
  const re = kbHlRegex_('Battery c(1)');
  assert.ok(re.test('the BATTERY light'), 'case-insensitive token');
  re.lastIndex = 0;
  assert.ok(re.test('code c(1) here'), 'regex metachars escaped, matched literally');
  assert.strictEqual(kbHlRegex_('   '), null);
  assert.strictEqual(kbHlRegex_('a'), null, 'single 1-char token yields no regex');
});

// T3 — Employee Docs: issue-payload validator (pure, from Code.js), the
// status-chip renderer, and the signature-pad export-cap parity tripwire.
console.log('\nempdocs — validator / chip / pad export cap (T3)');
['EMPDOC_TYPES', 'EMPDOC_TITLE_MAX', 'EMPDOC_BODY_MAX',
 'EMPDOC_FIELD_TYPES', 'EMPDOC_FIELD_CAP', 'EMPDOC_FIELD_LABEL_MAX', 'EMPDOC_RESPONSE_MAX'].forEach((name) => {
  const m = codeSrc.match(new RegExp('const (' + name + '\\s*=\\s*[^;]+);'));
  assert.ok(m, name + ' declaration found in Code.js');
  vm.runInContext(m[1] + ';', sb, { filename: 'Code.js#' + name });
});
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateFields_'), sb, { filename: 'Code.js#empDocValidateFields_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateResponses_'), sb, { filename: 'Code.js#empDocValidateResponses_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocNeedsAction_'), sb, { filename: 'Code.js#empDocNeedsAction_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateIssue_'), sb,
  { filename: 'Code.js#empDocValidateIssue_' });
test('empDocValidateFields_: normalizes, slugs ids, dedupes, whitelists type, caps', () => {
  const r = sb.empDocValidateFields_([{ label: 'Your Goals' }, { label: 'Your Goals', type: 'textarea' }, { label: 'When', type: 'date', required: false }]);
  assert.ok(r.ok);
  assert.strictEqual(r.fields.length, 3);
  assert.strictEqual(r.fields[0].id, 'your-goals');
  assert.strictEqual(r.fields[1].id, 'your-goals-2', 'dedupes ids');
  assert.strictEqual(r.fields[0].required, true, 'required defaults on');
  assert.strictEqual(r.fields[2].required, false);
  assert.strictEqual(sb.empDocValidateFields_(null).ok, true, 'null → no fields');
  assert.strictEqual(sb.empDocValidateFields_([{ label: '' }]).ok, false, 'blank label rejected');
  assert.strictEqual(sb.empDocValidateFields_([{ label: 'x', type: 'email' }]).ok, false, 'bad type rejected');
});
test('empDocValidateResponses_: requires required fields, bounds, validates dates', () => {
  const fields = [{ id: 'a', label: 'A', type: 'text', required: true }, { id: 'b', label: 'B', type: 'date', required: false }];
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: 'hi' }).ok, true);
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: '' }).ok, false, 'missing required → fail');
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: 'hi', b: '07/01/2026' }).ok, false, 'bad date → fail');
  const big = sb.empDocValidateResponses_(fields, { a: 'x'.repeat(sb.EMPDOC_RESPONSE_MAX + 1) });
  assert.strictEqual(big.ok, false, 'oversize response → fail');
  // only known field ids are kept
  const kept = sb.empDocValidateResponses_(fields, { a: 'hi', zzz: 'ignored' });
  assert.ok(kept.ok && kept.responses.zzz === undefined);
});
test('empDocNeedsAction_: issued + (signature OR required field) needs action', () => {
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: true, fields: [] }), true);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: false, fields: [{ required: true }] }), true);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: false, fields: [{ required: false }] }), false);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'draft', requiresSignature: true, fields: [] }), false, 'draft → no action');
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'signed', requiresSignature: true, fields: [] }), false);
});
test('empDocValidateIssue_: release flag maps to draft/issued status', () => {
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'b' }).doc.status, 'issued', 'default issues');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'b', release: false }).doc.status, 'draft');
});
test('empDocValidateIssue_: accepts a good payload; whitelists type; bounds title/body/date', () => {
  const ok = sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'body', dueAt: '2026-07-01' });
  assert.ok(ok.ok);
  assert.strictEqual(ok.doc.requiresSignature, true, 'signature defaults on');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'memo', title: 'T', bodyMd: 'b' }).ok, false, 'unknown docType rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: '', bodyMd: 'b' }).ok, false, 'empty title rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: 'T', bodyMd: '' }).ok, false, 'empty body rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: 'T', bodyMd: 'b', dueAt: '07/01/2026' }).ok, false, 'bad date shape rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: '', docType: 'pip', title: 'T', bodyMd: 'b' }).ok, false, 'missing empId rejected');
});
const edChipHtml_ = loadFunction(sb, 'train/script_empdocs.html', 'edChipHtml_');
test('edChipHtml_: signed/void/needs-signature/for-review chips', () => {
  assert.ok(edChipHtml_({ status: 'signed' }).indexOf('Signed') >= 0);
  assert.ok(edChipHtml_({ status: 'void' }).indexOf('Void') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: true }).indexOf('Needs signature') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: true, overdue: true }).indexOf('Overdue') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: false }).indexOf('For review') >= 0);
});
test('popOutCurrentView opens SERVER_WEB_APP_URL, never the iframe location (INV-78 class)', () => {
  // The iframe's own window.location is a session-bound googleusercontent
  // URL that renders BLANK as a top-level window — the pop-out shipped
  // broken on exactly this until the operator caught it. Pin: the function
  // must consult the doGet-injected real /exec URL, and index.html must
  // inject it via the unescaped scriptlet.
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const fn = core.match(/function popOutCurrentView\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn, 'popOutCurrentView found');
  assert.ok(fn[0].indexOf('SERVER_WEB_APP_URL') >= 0, 'pop-out uses the injected deploy URL');
  const idx = fs.readFileSync(path.join(__dirname, '../../web-app/index.html'), 'utf8');
  assert.ok(idx.indexOf('window.SERVER_WEB_APP_URL = <?!=') >= 0, 'index.html injects SERVER_WEB_APP_URL unescaped (INV-78)');
});
// #4 — pop-out geometry persistence: the pure parse/range-guard helper.
const popoutParseGeom_ = loadFunction(sb, 'script_core.html', 'popoutParseGeom_');
test('popoutParseGeom_: parses valid geometry, range-guards, drops bad position', () => {
  // JSON-compare: sandbox objects have a different realm prototype (deepStrictEqual rejects).
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":520,"h":820,"x":100,"y":40}')), '{"w":520,"h":820,"x":100,"y":40}');
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":480,"h":800}')), '{"w":480,"h":800}', 'position optional');
  assert.strictEqual(popoutParseGeom_(null), null, 'missing → null');
  assert.strictEqual(popoutParseGeom_('not json'), null, 'corrupt → null');
  assert.strictEqual(popoutParseGeom_('{"w":100,"h":800}'), null, 'too-narrow width rejected');
  assert.strictEqual(popoutParseGeom_('{"w":9999,"h":800}'), null, 'absurd width rejected');
  // valid size but negative position → keep size, drop position (fail-safe)
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":480,"h":800,"x":-5,"y":10}')), '{"w":480,"h":800}');
});
test('signature-pad export cap parity: both pads cap the export at 600px (INV-96)', () => {
  // The empdocs pad is adapted (parameterized) from form_public's — the
  // load-bearing shared rule is the <=600px export downscale that keeps the
  // base64 under the per-cell cap. Pin it in BOTH files.
  ['form_public.html', 'train/script_empdocs.html'].forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    assert.ok(/MAX_W = 600/.test(src), f + ' caps the signature export at 600px');
  });
});

// Onboarding tour — every step's `view` must be a registered TOOLS tab key
// (a tab-key rename would otherwise silently orphan a step). The selector is
// resolved at runtime against the live DOM; the view key is the static
// coupling we can pin here, mirroring the M3 view-key tripwire.
console.log('\nscript_tour — every step view is a registered TOOLS tab key');
test('TOUR_STEPS view keys all resolve in the TOOLS registry', () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  // [^{}]* (not [^}]*) so the match can't cross into a nested object — it
  // captures the leaf TAB keys (clock, timeoff, …), not the tool wrappers.
  const validKeys = [...toolsBlock[0].matchAll(/(\w+):\s*\{[^{}]*enter:\s*'/g)].map((m) => m[1]);
  const tourSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_tour.html'), 'utf8');
  const block = tourSrc.match(/const TOUR_STEPS = \[[\s\S]*?\n\];/);
  assert.ok(block, 'TOUR_STEPS block found');
  const views = [...block[0].matchAll(/view:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(views.length >= 10, 'parsed the step view keys (got ' + views.length + ')');
  views.forEach((v) => {
    assert.ok(validKeys.indexOf(v) >= 0, "TOUR step view '" + v + "' is not a TOOLS tab key");
  });
});

// Tag-trend bucketing (#5) — the pure week-bucketing math behind the manager
// Admin "Tag Trends" panel. Factored out of getCallNotesTagTrends so the
// boundary + bucketing + sort logic is pinnable without a spreadsheet.
console.log('\nCode.js — tag-trend bucketing (#5: cnTrendWeekStarts_ / cnTagTrendsFromEvents_)');
['cnIsoToDayNum_', 'cnDayNumToIso_', 'cnTrendWeekStarts_', 'cnTagTrendsFromEvents_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn }));
const cnTrendWeekStarts_ = sb.cnTrendWeekStarts_;
const cnTagTrendsFromEvents_ = sb.cnTagTrendsFromEvents_;

test('cnTrendWeekStarts_ returns N Monday-anchored, 7-apart, ascending starts', () => {
  // 2026-06-17 is a Wednesday → its week's Monday is 2026-06-15.
  const ws = cnTrendWeekStarts_('2026-06-17', 4);
  assert.strictEqual(ws.length, 4);
  for (let i = 1; i < ws.length; i++) assert.strictEqual(ws[i] - ws[i - 1], 7, 'weeks are 7 days apart');
  assert.strictEqual(sb.cnDayNumToIso_(ws[ws.length - 1]), '2026-06-15', 'last start = Monday of ref week');
});

test('cnTagTrendsFromEvents_ buckets by week, sorts by total, computes delta, drops out-of-window', () => {
  const ref = '2026-06-17';                  // week Monday = 2026-06-15 (idx 3 of 4)
  const events = [
    { tag: 'shipping', date: '2026-06-16' }, // this week
    { tag: 'shipping', date: '2026-06-15' }, // this week
    { tag: 'shipping', date: '2026-06-09' }, // prior week
    { tag: 'billing',  date: '2026-06-16' }, // this week
    { tag: 'old',      date: '2026-01-01' }, // outside the 4-week window → dropped
    { tag: '',         date: '2026-06-16' }, // blank tag → ignored
  ];
  const out = cnTagTrendsFromEvents_(events, ref, 4, 12);
  assert.strictEqual(out.weekStarts.length, 4);
  assert.strictEqual(out.series.length, 2, 'only in-window, non-blank tags');
  assert.strictEqual(out.series[0].tag, 'shipping', 'highest total sorts first');
  assert.strictEqual(out.series[0].total, 3);
  assert.strictEqual(out.series[0].counts[3], 2, 'this-week bucket');
  assert.strictEqual(out.series[0].counts[2], 1, 'prior-week bucket');
  assert.strictEqual(out.series[0].delta, 1, 'delta = this wk − prior wk');
  assert.ok(!out.series.some((s) => s.tag === 'old' || s.tag === ''), 'out-of-window / blank excluded');
});

test('cnTagTrendsFromEvents_ honors topK and tolerates empty input', () => {
  assert.deepStrictEqual(cnTagTrendsFromEvents_([], '2026-06-17', 4, 12).series, []);
  const many = [];
  for (let i = 0; i < 20; i++) many.push({ tag: 'tag' + ('0' + i).slice(-2), date: '2026-06-16' });
  assert.strictEqual(cnTagTrendsFromEvents_(many, '2026-06-17', 4, 5).series.length, 5, 'topK caps the series');
});

// Coverage planner bucketing (#3) — the pure hour-concurrency math behind the
// manager Coverage view (the tz conversion + PTO overlay stay in the endpoint).
console.log('\nCode.js — coverage bucketing (#3: coverageBucketHours_)');
vm.runInContext(extractRawFunction('Code.js', 'coverageBucketHours_'), sb, { filename: 'Code.js#coverageBucketHours_' });
const coverageBucketHours_ = sb.coverageBucketHours_;

test('counts distinct reps per manager-tz hour slot', () => {
  // Day 0: rep A 08:00–17:00 (min 480–1020), rep B 09:00–12:00 (540–720).
  const out = coverageBucketHours_([
    { rep: 'A', absStart: 480, absEnd: 1020, tentative: false },
    { rep: 'B', absStart: 540, absEnd: 720, tentative: false },
  ], 1);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0][7].confirmed, 0, '07:00 — nobody yet');
  assert.strictEqual(out[0][8].confirmed, 1, '08:00 — A only');
  assert.strictEqual(out[0][9].confirmed, 2, '09:00 — A + B');
  assert.strictEqual(out[0][16].confirmed, 1, '16:00 — A only (B ended)');
  assert.strictEqual(out[0][17].confirmed, 0, '17:00 — done');
});

test('a confirmed rep is not double-counted as tentative in the same slot; clips out-of-range', () => {
  const out = coverageBucketHours_([
    { rep: 'A', absStart: 540, absEnd: 600, tentative: false },  // 09:00 confirmed
    { rep: 'A', absStart: 540, absEnd: 600, tentative: true },   // same rep tentative — must not add
    { rep: 'C', absStart: 540, absEnd: 600, tentative: true },   // distinct tentative rep
    { rep: 'D', absStart: -120, absEnd: 60, tentative: false },  // straddles before day 0 → counts hour 0 only
    { rep: 'E', absStart: 1440 * 2, absEnd: 1440 * 2 + 60, tentative: false }, // beyond numDays → clipped
  ], 1);
  assert.strictEqual(out[0][9].confirmed, 1, 'A confirmed at 09:00');
  assert.strictEqual(out[0][9].tentative, 1, 'only C is tentative (A already confirmed)');
  assert.strictEqual(out[0][0].confirmed, 1, 'D spillover covers hour 0');
});

// ─────────────────────────────────────────────────────────────────────────────
// Spanish Inbox → tools cross-navigation (metrics suggestion map + shared hint).
// `sb` already has script_core (appTakeNavHint_/appNavHintBannerHtml_) + metrics
// (SPANISH_TOOL_SUGGESTIONS/spanishSuggestHtml_) + esc/icon loaded.
//   • spanishSuggestHtml_  → keyword→destination routing (EN + ES), CN-collapse,
//                            3-chip cap, data-* contract, no-match empties.
//   • appTakeNavHint_      → one-shot read+null + tool/source gating.
//   • appNavHintBannerHtml_→ esc() of email-derived text (the XSS/PHI boundary —
//                            the banner is injected via innerHTML).
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ncross-nav — Spanish Inbox suggestion routing + shared nav hint');

const spanishSuggestHtml_ = sb.spanishSuggestHtml_;
const appTakeNavHint_ = sb.appTakeNavHint_;
const appNavHintBannerHtml_ = sb.appNavHintBannerHtml_;

test('spanishSuggestHtml_: empty / whitespace / no-keyword text → no chips', () => {
  assert.strictEqual(spanishSuggestHtml_(''), '');
  assert.strictEqual(spanishSuggestHtml_('   '), '');
  assert.strictEqual(spanishSuggestHtml_(null), '');
  assert.strictEqual(spanishSuggestHtml_('hello, can you call me back please'), '',
    'generic text matches no destination');
});

test('spanishSuggestHtml_: shipping keywords (EN + ES) → Verified Shipping CN chip', () => {
  ['where is my shipping', 'tracking number?', '¿dónde está mi envío?', 'rastreo del paquete', 'estado de la entrega']
    .forEach((t) => {
      const html = spanishSuggestHtml_(t);
      assert.ok(/data-tool="callNotes"/.test(html), `${t}: routes to callNotes`);
      assert.ok(/data-template="Verified Shipping"/.test(html), `${t}: carries the Verified Shipping template`);
      assert.ok(/data-tab="callNotes"/.test(html), `${t}: lands on the Log tab`);
    });
});

test('spanishSuggestHtml_: resupply keywords → Repeat Resupply template', () => {
  ['need a resupply', 'resurtido de máscara', 'monthly refill', 'reorder supplies'].forEach((t) => {
    assert.ok(/data-template="Repeat Resupply"/.test(spanishSuggestHtml_(t)), `${t}: Repeat Resupply`);
  });
});

test('spanishSuggestHtml_: order keywords → Close Order template', () => {
  ['order status', 'estado del pedido', 'cancel my order', 'cancelar la orden'].forEach((t) => {
    assert.ok(/data-template="Close Order"/.test(spanishSuggestHtml_(t)), `${t}: Close Order`);
  });
});

test('spanishSuggestHtml_: mobility keywords → PPD intake (distinct intake destination)', () => {
  ['need a wheelchair', 'silla de ruedas', 'problemas de movilidad', 'a power chair'].forEach((t) => {
    const html = spanishSuggestHtml_(t);
    assert.ok(/data-tool="intake"/.test(html), `${t}: intake tool`);
    assert.ok(/data-tab="intakePpd"/.test(html), `${t}: PPD tab`);
    assert.ok(/data-template=""/.test(html), `${t}: intake chips carry no CN template`);
  });
});

test('spanishSuggestHtml_: CPAP keywords → PAP intake; PMD keywords → PMD account', () => {
  ['cpap mask', 'sleep apnea', 'mascarilla resmed airsense'].forEach((t) => {
    assert.ok(/data-tab="intakePapAccount"/.test(spanishSuggestHtml_(t)), `${t}: PAP`);
  });
  ['need a pmd', 'power mobility device'].forEach((t) => {
    assert.ok(/data-tab="intakePmdAccount"/.test(spanishSuggestHtml_(t)), `${t}: PMD`);
  });
});

test('spanishSuggestHtml_: multiple CN matches collapse to ONE chip (same Log destination)', () => {
  // "shipping" + "resupply" + "order" all route to Call Notes Log — only one chip.
  const html = spanishSuggestHtml_('shipping for my resupply order');
  const cnChips = (html.match(/data-tool="callNotes"/g) || []).length;
  assert.strictEqual(cnChips, 1, 'CN matches dedupe to a single chip');
  // The first matching rule (Verified Shipping) wins the single slot.
  assert.ok(/data-template="Verified Shipping"/.test(html), 'first CN rule order wins');
});

test('spanishSuggestHtml_: caps at 3 chips even when more rules match', () => {
  // wheelchair (PPD) + cpap (PAP) + pmd (PMD) + shipping (CN) = 4 distinct → 3.
  const html = spanishSuggestHtml_('wheelchair cpap pmd shipping');
  const chips = (html.match(/class="sp-suggest"/g) || []).length;
  assert.strictEqual(chips, 3, 'hard cap of 3 chips');
});

test('spanishSuggestHtml_: distinct intake destinations are NOT collapsed', () => {
  const html = spanishSuggestHtml_('wheelchair and cpap'); // PPD + PAP — two intake chips
  assert.ok(/data-tab="intakePpd"/.test(html) && /data-tab="intakePapAccount"/.test(html),
    'PPD and PAP both surface (different tabs)');
});

test('appTakeNavHint_: returns null when no hint pending', () => {
  sb.APP_NAV_HINT = null;
  assert.strictEqual(appTakeNavHint_('callNotes'), null);
});

test('appTakeNavHint_: gated by source AND tool; non-match leaves hint intact', () => {
  sb.APP_NAV_HINT = { source: 'spanishInbox', tool: 'callNotes', subject: 'x' };
  assert.strictEqual(appTakeNavHint_('intake'), null, 'wrong tool → null');
  assert.ok(sb.APP_NAV_HINT, 'a non-matching take does NOT consume the hint');
  sb.APP_NAV_HINT = { source: 'coverageStrip', tool: 'callNotes' };
  assert.strictEqual(appTakeNavHint_('callNotes'), null, 'wrong source → null');
});

test('appTakeNavHint_: one-shot — matching take returns the hint then nulls it', () => {
  const hint = { source: 'spanishInbox', tool: 'callNotes', template: 'Verified Shipping', subject: 's' };
  sb.APP_NAV_HINT = hint;
  const got = appTakeNavHint_('callNotes');
  assert.strictEqual(got, hint, 'first take returns the hint');
  assert.strictEqual(sb.APP_NAV_HINT, null, 'hint is consumed (nulled)');
  assert.strictEqual(appTakeNavHint_('callNotes'), null, 'second take returns null — no stale re-fire');
});

test('appNavHintBannerHtml_: escapes email-derived requester/subject/snippet/permalink', () => {
  const html = appNavHintBannerHtml_({
    requester: '<img src=x onerror=alert(1)>',
    subject: '<script>steal()</script>',
    snippet: 'a & b < c',
    permalink: 'https://mail.google.com/"><img onerror=alert(2)>',
  });
  assert.ok(!/<img src=x onerror/.test(html), 'requester markup is escaped');
  assert.ok(!/<script>steal/.test(html), 'subject markup is escaped');
  assert.ok(/&lt;script&gt;/.test(html), 'subject angle-brackets entity-encoded');
  assert.ok(/a &amp; b &lt; c/.test(html), 'snippet ampersand + bracket escaped');
  assert.ok(!/"><img onerror/.test(html), 'permalink attribute breakout escaped');
});

test('appNavHintBannerHtml_: empty hint → empty string', () => {
  assert.strictEqual(appNavHintBannerHtml_(null), '');
});

// ─────────────────────────────────────────────────────────────────────────────
// Intake PPD section structure — the per-section side-rail stepper. intakePpdSections_
// is the SINGLE source the renderer (section ids), the stepper (steps/goto), and
// the progress updater (per-section + overall counts) all consume; pin that the
// three stay in lockstep and that the overall main-question count (the ring
// denominator) is unchanged by the refactor.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nintake — PPD per-section stepper (intakePpdSections_ single source)');
const sbIntake = buildSandbox(['script_icons.html', 'script_core.html', 'intake/script_intake.html']);

['EN', 'ES'].forEach((lang) => {
  test('intakePpdSections_(' + lang + '): well-formed sections; mainQNums are bare numbers + 39a, unique', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    assert.ok(Array.isArray(secs) && secs.length > 0, 'has sections');
    secs.forEach((s, i) => {
      assert.ok(s.title || s.rows.length, 'section ' + i + ' has a title or rows');
      // F(cycle-8): 39a is a FULL-WEIGHT primary question (the engine's
      // mobile-home trigger) lettered only to avoid renumbering — it counts.
      // The conditional sub-questions (31a/33a) still don't.
      s.mainQNums.forEach((q) => assert.ok(/^\d+$/.test(q) || q === '39a',
        'mainQNum "' + q + '" is a bare number or 39a (no 31a/33a sub-questions)'));
    });
    const flat = secs.reduce((a, s) => a.concat(s.mainQNums), []);
    assert.ok(flat.indexOf('39a') >= 0, '39a is in the progress count (the engine-critical dwelling question)');
    assert.strictEqual(new Set(flat).size, flat.length, 'no duplicate main question across sections');
  });

  test('intakePpdSections_(' + lang + '): total mainQNums == the ring denominator (progress count unchanged)', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    const total = secs.reduce((a, s) => a + s.mainQNums.length, 0);
    // Independent recount of the prior progress filter directly off INTAKE_PPD_Q.
    const qs = sbIntake.INTAKE_PPD_Q[lang] || sbIntake.INTAKE_PPD_Q.EN;
    let expected = 0;
    for (let i = 1; i < qs.length; i++) {
      const raw = qs[i];
      if (!raw || !String(raw).trim()) continue;
      const mm = String(raw).trim().match(/^(\d+[a-z]?)\./);
      if (mm && (/^\d+$/.test(mm[1]) || mm[1] === '39a')) expected++;   // F(cycle-8): 39a counts
    }
    assert.strictEqual(total, expected, 'stepper main-count matches the progress filter (bare numbers + 39a)');
  });

  test('intakePpdSections_(' + lang + '): renderer, stepper, and section list agree on count + indices', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    const render = sbIntake.intakeRenderPpdSections_(lang);
    const stepper = sbIntake.intakePpdStepperHtml_(lang);
    const renderIds = (render.match(/id="intk-ppd-sec-(\d+)"/g) || []);
    const steps = (stepper.match(/class="intk-step"/g) || []);
    assert.strictEqual(renderIds.length, secs.length, 'one rendered panel id per section');
    assert.strictEqual(steps.length, secs.length, 'one stepper step per section');
    // Section ids + stepper data-sec/onclick run 0..n-1 in order.
    for (let s = 0; s < secs.length; s++) {
      assert.ok(render.indexOf('id="intk-ppd-sec-' + s + '"') >= 0, 'panel id ' + s + ' present');
      assert.ok(stepper.indexOf('data-sec="' + s + '"') >= 0, 'step data-sec ' + s + ' present');
      assert.ok(stepper.indexOf('intakePpdGotoSection_(' + s + ')') >= 0, 'step ' + s + ' wired to goto');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// View instant-paint (stale-while-revalidate) — viewCacheFresh_ is the pure TTL
// decision behind the Metrics/Call-Notes instant repaint. (script_core, on sb.)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ncross-nav — view instant-paint TTL (viewCacheFresh_)');
const viewCacheFresh_ = sb.viewCacheFresh_;

test('viewCacheFresh_: null / malformed entry → not fresh (fail-safe to fetch)', () => {
  assert.strictEqual(viewCacheFresh_(null, 45000, 1000), false);
  assert.strictEqual(viewCacheFresh_(undefined, 45000, 1000), false);
  assert.strictEqual(viewCacheFresh_({}, 45000, 1000), false, 'no .at → not fresh');
  assert.strictEqual(viewCacheFresh_({ at: 'x' }, 45000, 1000), false, 'non-number .at → not fresh');
});

test('viewCacheFresh_: within TTL → fresh; past TTL → stale', () => {
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000), true, 'age 0 is fresh');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 45000), true, 'exactly at TTL is fresh');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 45001), false, 'past TTL is stale');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 20000), true, 'mid-window is fresh');
});

test('viewCacheFresh_: a future stamp (clock skew) → not fresh', () => {
  assert.strictEqual(viewCacheFresh_({ at: 5000 }, 45000, 1000), false, 'negative age → not fresh');
});

test('viewCacheFresh_: defaults ttl to VIEW_CACHE_TTL_MS when omitted', () => {
  assert.strictEqual(typeof sb.VIEW_CACHE_TTL_MS, 'number', 'default TTL constant present');
  const now = 1000000;
  assert.strictEqual(viewCacheFresh_({ at: now }, undefined, now), true);
  assert.strictEqual(viewCacheFresh_({ at: now - sb.VIEW_CACHE_TTL_MS - 1 }, undefined, now), false);
});

console.log('\nCode.js — buildPatientTimeline_() (#3 patient/TRX timeline merge)');
// Pure server helper: stitches notes + intake submissions + sent forms for one
// TRX into a newest-first timeline. Substring TRX match; forms linked by noteId.
vm.runInContext(extractRawFunction('Code.js', 'buildPatientTimeline_'), sb,
  { filename: 'Code.js#buildPatientTimeline_' });
const buildPatientTimeline_ = sb.buildPatientTimeline_;
test('merges + sorts newest-first; matches TRX as a substring; links forms by noteId', () => {
  const notes = [
    { noteId: 'n1', timestamp: '2026-06-01T09:00:00', caller: 'A', patientAndTrx: 'Jane Doe TRX12345', issue: 'i1' },
    { noteId: 'n2', timestamp: '2026-06-03T11:00:00', caller: 'B', patientAndTrx: 'Other TRX99999', issue: 'i2' },
  ];
  const subs = [
    { formType: 'PPD', submissionId: 's1', timestamp: '2026-06-02 10:00:00', patientInfo: 'Jane Doe TRX12345', repId: 'r1' },
  ];
  const forms = [
    { token: 't1', formName: 'EAA', status: 'submitted', createdAt: '2026-06-04T08:00:00', noteId: 'n1' },
    { token: 't2', formName: 'EAA', status: 'pending', createdAt: '2026-06-05T08:00:00', noteId: 'nX' }, // unlinked
  ];
  const ev = buildPatientTimeline_(notes, subs, forms, 'trx12345');
  // n2 excluded (different TRX); t2 excluded (noteId not matched)
  assert.strictEqual(ev.length, 3, 'note n1 + intake s1 + form t1');
  assert.strictEqual(ev[0].kind, 'form', 'newest first = the 06-04 form');
  assert.strictEqual(ev[ev.length - 1].kind, 'note', 'oldest = the 06-01 note');
  assert.ok(ev.every((e) => e.noteId !== 'n2' && e.token !== 't2'), 'non-matches excluded');
});
test('empty / missing inputs never throw; blank trx returns all notes', () => {
  // (cross-realm: the helper runs in the vm sandbox, so assert on .length, not deepStrictEqual)
  assert.strictEqual(buildPatientTimeline_(null, null, null, 'x').length, 0);
  const all = buildPatientTimeline_([{ noteId: 'n', timestamp: '2026-01-01T00:00:00', patientAndTrx: 'anything' }], [], [], '');
  assert.strictEqual(all.length, 1, 'blank trx → no filter');
});

console.log('\ncoupling — LEAVE_DEDUCTION_CLIENT ↔ getLeaveDeduction_ behavioral mirror (INV-72; Turn-B seams audit)');
// The flagship documented mirror (INV-72) had NO tripwire — it was the intro
// example of the drift class but never got a check. The server side is an
// if-chain (not a key-set), so this is a BEHAVIORAL mirror: every client map
// entry must resolve identically through the real server function, and the
// unknown-type default must agree (annual / 1.0) on both sides.
{
  const ldCtx = { String: String, Object: Object };
  vm.createContext(ldCtx);
  vm.runInContext(extractRawFunction('Code.js', 'getLeaveDeduction_'), ldCtx, { filename: 'Code.js#getLeaveDeduction_' });
  vm.runInContext('var LEAVE_DEDUCTION_CLIENT = ' + extractClientObject('tc/script_timeoff.html', 'LEAVE_DEDUCTION_CLIENT') + ';',
    ldCtx, { filename: 'LEAVE_DEDUCTION_CLIENT' });
  test('every LEAVE_DEDUCTION_CLIENT entry matches the server deduction (bucket + days)', () => {
    const keys = Object.keys(ldCtx.LEAVE_DEDUCTION_CLIENT);
    assert.ok(keys.length >= 5, 'client map parsed (' + keys.length + ' entries)');
    keys.forEach((k) => {
      const s = ldCtx.getLeaveDeduction_(k);
      const c = ldCtx.LEAVE_DEDUCTION_CLIENT[k];
      assert.strictEqual(s.bucket, c.bucket, k + ': bucket drifted (client mis-previews the balance)');
      assert.strictEqual(s.days, c.days, k + ': days drifted (client mis-previews the balance)');
    });
    const dflt = ldCtx.getLeaveDeduction_('Some Future Type');
    assert.strictEqual(dflt.bucket, 'annual');
    assert.strictEqual(dflt.days, 1.0, 'unknown-type default is annual/1.0 — the client fallback must match (INV-72)');
  });
  // F(cycle-8 M-15): the mirror above is one-directional — a NEW leave type
  // added on the SERVER (TIME_OFF_TYPES + a getLeaveDeduction_ branch)
  // without a client map entry passed both it AND the day-type⊆validator
  // tripwire, and the PTO modal silently previewed the annual/1.0 fallback.
  // Reverse subset: every creatable type must have a client preview entry.
  test('TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT keys (reverse direction of the mirror)', () => {
    const codeSrcLd = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
    const m = codeSrcLd.match(/const TIME_OFF_TYPES\s*=\s*(\[[^\]]*\])/);
    assert.ok(m, 'TIME_OFF_TYPES literal found');
    const types = JSON.parse(m[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
    assert.ok(types.length >= 3, 'parsed the type list (' + types.length + ')');
    const clientKeysLc = Object.keys(ldCtx.LEAVE_DEDUCTION_CLIENT).map((k) => k.toLowerCase());
    types.forEach((t) => {
      if (clientKeysLc.indexOf(String(t).toLowerCase()) >= 0) return;   // explicit client entry
      // No client entry → the modal previews via its annual/1.0 FALLBACK,
      // which is only correct while the SERVER also serves this type from the
      // default (e.g. 'Other'). A server branch added without a client entry
      // fails here — the exact one-directional gap.
      const s = ldCtx.getLeaveDeduction_(t);
      assert.ok(s.bucket === 'annual' && s.days === 1.0,
        'TIME_OFF_TYPES entry "' + t + '" resolves to ' + s.bucket + '/' + s.days +
        ' on the server but has no LEAVE_DEDUCTION_CLIENT entry — the modal would preview the annual/1.0 fallback');
    });
  });
}

console.log('\nCode.js — deployReadinessItems_() (#1 pre-deploy checklist)');
vm.runInContext(extractRawFunction('Code.js', 'deployReadinessItems_'), sb,
  { filename: 'Code.js#deployReadinessItems_' });
const deployReadinessItems_ = sb.deployReadinessItems_;
test('required store unset → fail; optional unset → warn; tz mismatch → warn; manager-count 0 → fail', () => {
  const storage = {
    configTimezone: 'Asia/Kolkata',
    stores: [
      { label: 'ADP', prop: 'ADP_SS_ID', configured: false },                          // required → fail
      { label: 'KB', prop: 'KB_SS_ID', configured: true, reachable: true, tzMatch: true }, // ok
      { label: 'CDR', prop: 'CDR_SS_ID', configured: false },                          // optional → warn
      { label: 'Intake', prop: 'INTAKE_SS_ID', configured: true, reachable: true, tzMatch: false, tz: 'America/Los_Angeles' }, // tz → warn
      { label: 'HR', prop: 'HR_DOCS_SS_ID', configured: true, reachable: false },      // unreachable → fail
      { label: 'Forms', prop: 'FORMS_SS_ID', configured: true, reachable: true, tzMatch: true, localeMatch: false, locale: 'en_GB' }, // locale → warn (Turn A)
    ],
  };
  const automation = { digests: [{ key: 'eod', last: '2026-06-23 07:00:00', stale: false }], cdr: { ok: true } };
  const out = deployReadinessItems_(storage, automation, 0);
  const byKey = {};
  out.items.forEach((it) => { byKey[it.key] = it.status; });
  assert.strictEqual(byKey['managers'], 'fail', 'no manager emails → fail');
  assert.strictEqual(byKey['store_ADP_SS_ID'], 'fail', 'required ADP unset → fail');
  assert.strictEqual(byKey['store_KB_SS_ID'], 'ok');
  assert.strictEqual(byKey['store_CDR_SS_ID'], 'warn', 'optional CDR unset → warn');
  assert.strictEqual(byKey['store_INTAKE_SS_ID'], 'warn', 'tz mismatch → warn');
  assert.strictEqual(byKey['store_HR_DOCS_SS_ID'], 'fail', 'configured-but-unreachable → fail');
  assert.strictEqual(byKey['store_FORMS_SS_ID'], 'warn', 'locale mismatch → warn (M-14 class, Turn A)');
  assert.strictEqual(byKey['triggers'], 'ok', 'fresh heartbeat → ok');
  assert.strictEqual(byKey['cdr'], 'ok');
  assert.ok(out.summary.fail >= 3 && out.summary.warn >= 2, 'summary tallies statuses');
});
test('no heartbeats → triggers warn; cdr down → warn; clean → all ok', () => {
  const clean = deployReadinessItems_(
    { configTimezone: 'X', stores: [{ label: 'ADP', prop: 'ADP_SS_ID', configured: true, reachable: true, tzMatch: true }] },
    { digests: [{ key: 'eod', last: null, stale: false }], cdr: { ok: false } }, 2);
  const byKey = {};
  clean.items.forEach((it) => { byKey[it.key] = it.status; });
  assert.strictEqual(byKey['managers'], 'ok');
  assert.strictEqual(byKey['triggers'], 'warn', 'no heartbeat yet → warn');
  assert.strictEqual(byKey['cdr'], 'warn', 'cdr down → warn');
});

console.log('\nCode.js — retentionWarnings_() (Admin Retention panel safety ordering)');
vm.runInContext(extractRawFunction('Code.js', 'retentionWarnings_'), sb,
  { filename: 'Code.js#retentionWarnings_' });
const retentionWarnings_ = sb.retentionWarnings_;
test('clean configs warn-free; unsafe orderings each warn', () => {
  // archive-only (recommended) — no warnings
  assert.strictEqual(retentionWarnings_(90, 0, 0).length, 0);
  // all disabled — no warnings
  assert.strictEqual(retentionWarnings_(0, 0, 0).length, 0);
  // safe 3-tier: archive 90 ≤ purge 365, cold 730 ≥ archive 90 — no warnings
  assert.strictEqual(retentionWarnings_(90, 365, 730).length, 0);
  // purge ON but archive OFF → warn
  assert.strictEqual(retentionWarnings_(0, 90, 0).length, 1);
  // archive window > purge window → warn (loss before archive)
  assert.ok(retentionWarnings_(365, 90, 0).some((w) => w.indexOf('LARGER') >= 0));
  // cold purge shorter than archive window → warn
  assert.ok(retentionWarnings_(90, 0, 30).some((w) => w.indexOf('Cold-store') >= 0));
});

console.log('\nCode.js — DeptRequests v2 (drParseDepartments_ membership)');
vm.runInContext(extractRawFunction('Code.js', 'drParseDepartments_'), sb,
  { filename: 'Code.js#drParseDepartments_' });
const drParseDepartments_ = sb.drParseDepartments_;
test('drParseDepartments_ canonicalizes, dedupes, drops unknowns', () => {
  // vm-realm arrays fail deepStrictEqual against main-realm literals — compare via join.
  const keys = ['Billing', 'Authorizations', 'Shipping'];
  assert.strictEqual(drParseDepartments_('billing; SHIPPING', keys).join(','), 'Billing,Shipping',
    'case-insensitive match → canonical key casing');
  assert.strictEqual(drParseDepartments_('Billing, billing , Billing', keys).join(','), 'Billing', 'deduped');
  assert.strictEqual(drParseDepartments_('Billing; NotADept', keys).join(','), 'Billing', 'unknown dropped');
  assert.strictEqual(drParseDepartments_('', keys).length, 0, 'blank → none');
  assert.strictEqual(drParseDepartments_('Shipping', []).length, 0, 'no valid keys → none');
  assert.doesNotThrow(() => drParseDepartments_(null, null));
});
vm.runInContext(extractRawFunction('Code.js', 'drSlaStatus_'), sb, { filename: 'Code.js#drSlaStatus_' });
const drSlaStatus_ = sb.drSlaStatus_;
test('drSlaStatus_ bands ontime / atrisk(≥75%) / overdue(≥100%) wall-clock', () => {
  assert.strictEqual(drSlaStatus_(60, 48), 'ontime', '1h of a 48h SLA');
  assert.strictEqual(drSlaStatus_(Math.round(48 * 60 * 0.8), 48), 'atrisk', '80% → at-risk');
  assert.strictEqual(drSlaStatus_(48 * 60, 48), 'overdue', '100% → overdue');
  assert.strictEqual(drSlaStatus_(48 * 60 + 100, 48), 'overdue');
  assert.strictEqual(drSlaStatus_(null, 48), null, 'null age → no badge');
  assert.strictEqual(drSlaStatus_(60, 0), null, 'no SLA → no badge');
});

// F(cycle-8 M-5): multi-dept ToDept split — a joined "Billing, Shipping" send
// must reach each component department's inbox / member-resolve / SLA instead
// of behaving as an unknown pseudo-department. Own context: getDeptRequestSla_
// reads CONFIG, and the shared sb must not inherit the stub.
console.log('\nCode.js — DeptRequests multi-dept split (drSplitDepts_ / drSlaForToDept_, cycle-8 M-5)');
const drSb = vm.createContext({ CONFIG: { CALL_NOTES: { DR_SLA_DEFAULT_HOURS: 48 } } });
['drSplitDepts_', 'drSlaForToDept_', 'getDeptRequestSla_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), drSb, { filename: 'Code.js#' + fn }));
test('drSplitDepts_ splits a joined multi-dept label and drops Other', () => {
  assert.strictEqual(drSb.drSplitDepts_('Billing, Shipping').join('|'), 'Billing|Shipping');
  assert.strictEqual(drSb.drSplitDepts_('Billing').join('|'), 'Billing', 'single dept is the identity');
  assert.strictEqual(drSb.drSplitDepts_('Billing, Other').join('|'), 'Billing', "'Other' (untracked pseudo-dept) dropped");
  assert.strictEqual(drSb.drSplitDepts_('Other').length, 0, "legacy 'Other'-only → empty (callers fall back to raw)");
  assert.strictEqual(drSb.drSplitDepts_('').length, 0);
  assert.doesNotThrow(() => drSb.drSplitDepts_(null));
});
test('drSlaForToDept_ takes the strictest component SLA; single-dept unchanged', () => {
  const cfg = { Billing: 24, Shipping: 72 };
  assert.strictEqual(drSb.drSlaForToDept_('Billing', cfg), 24, 'single dept = its own SLA');
  assert.strictEqual(drSb.drSlaForToDept_('Shipping', cfg), 72);
  assert.strictEqual(drSb.drSlaForToDept_('Billing, Shipping', cfg), 24, 'multi-dept → strictest (min hours)');
  assert.strictEqual(drSb.drSlaForToDept_('Authorizations', cfg), 48, 'unlisted dept → default');
  assert.strictEqual(drSb.drSlaForToDept_('Shipping, Other', cfg), 72, "Other never drags in the default's 48");
  assert.strictEqual(drSb.drSlaForToDept_('Other', cfg), 48, 'Other-only falls back to the raw lookup → default');
});

// F(cycle-8): Spanish-inbox scope guard — exact address match, not substring.
console.log('\nCode.js — Spanish inbox address matching (spanishAddrListIncludes_, cycle-8)');
const spSb = vm.createContext({});
['emailAddrOnly_', 'spanishAddrListIncludes_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), spSb, { filename: 'Code.js#' + fn }));
test('spanishAddrListIncludes_ matches parsed addresses only (the substring-guard fix)', () => {
  const A = 'spanishcalls@universalmedsupply.com';
  assert.ok(spSb.spanishAddrListIncludes_('SpanishCalls <' + A + '>', A), 'display-name form matches');
  assert.ok(spSb.spanishAddrListIncludes_('a@x.com, ' + A.toUpperCase(), A), 'list + case-insensitive');
  assert.ok(!spSb.spanishAddrListIncludes_('x' + A, A), 'xspanishcalls@… must NOT pass (the old substring hole)');
  assert.ok(!spSb.spanishAddrListIncludes_('"' + A + '" <other@x.com>', A),
    'the address inside a display NAME must not pass — only the bare address');
  assert.ok(!spSb.spanishAddrListIncludes_('', A) && !spSb.spanishAddrListIncludes_('a@x.com', ''));
});

console.log('\nscript_core.html — client error beacon (#1, INV-150)');
const errBeaconPayload_ = loadFunction(sb, 'script_core.html', 'errBeaconPayload_');
test('errBeaconPayload_ bounds every field and rejects empty messages', () => {
  assert.strictEqual(errBeaconPayload_('', 'stack', 'clock', 'onerror'), null, 'empty message → nothing to send');
  assert.strictEqual(errBeaconPayload_('   ', 'stack', 'clock', 'onerror'), null, 'whitespace message → null');
  assert.strictEqual(errBeaconPayload_(null, null, null, null), null, 'null-safe');
  const p = errBeaconPayload_('x'.repeat(9000), 'y'.repeat(9000), 'z'.repeat(100), 'unhandledrejection');
  // Cycle-11 (mirror hardening): caps extracted from Code.js, not hardcoded —
  // a server cap change now fails here instead of passing green.
  const msgMax = Number((codeSrc.match(/CLIENT_ERR_MSG_MAX\s*=\s*(\d+)/) || [])[1]);
  const stackMax = Number((codeSrc.match(/CLIENT_ERR_STACK_MAX\s*=\s*(\d+)/) || [])[1]);
  assert.ok(msgMax > 0 && stackMax > 0, 'server beacon caps parsed from Code.js');
  assert.strictEqual(p.message.length, msgMax, 'message capped at the server CLIENT_ERR_MSG_MAX mirror');
  assert.strictEqual(p.stack.length, stackMax, 'stack capped at the server CLIENT_ERR_STACK_MAX mirror');
  assert.strictEqual(p.view.length, 40, 'view capped');
  assert.strictEqual(p.source, 'unhandledrejection');
  assert.strictEqual(errBeaconPayload_('boom', '', '', 'garbage').source, 'onerror',
    'unknown source coerces to onerror (mirrors the server whitelist)');
  // PHI posture: the payload has EXACTLY these four keys — no DOM/field slots.
  assert.strictEqual(Object.keys(errBeaconPayload_('m', 's', 'v', 'onerror')).sort().join(','),
    'message,source,stack,view', 'payload shape is closed — no field-value slot can ride along');
});
test('recordClientError is employee-gated, locked, and server-bounded (source tripwire)', () => {
  const src = extractRawFunction('Code.js', 'recordClientError');
  assert.ok(/getEmployeeInfo_\s*\(/.test(src), 'requires getEmployeeInfo_ — not a public endpoint');
  assert.ok(/waitLock\s*\(\s*15000\s*\)/.test(src), 'acquires the ScriptLock (INV-01 — it appends)');
  assert.ok(/CLIENT_ERR_MSG_MAX/.test(src) && /CLIENT_ERR_STACK_MAX/.test(src),
    'bounds message + stack server-side (a crafted RPC must not bloat cells)');
  assert.ok(/CLIENT_ERR_RATE_MAX_PER_HOUR/.test(src), 'rate-caps per rep (flood protection)');
});
test('client-error summary is wired end to end (computeAutomationHealth_ → panel)', () => {
  const healthSrc = extractRawFunction('Code.js', 'computeAutomationHealth_');
  assert.ok(/clientErrors:\s*clientErrorsSummary_\(/.test(healthSrc),
    'computeAutomationHealth_ returns clientErrors — the panel reads this one report');
  const cnSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(/res\.clientErrors/.test(cnSrc), 'cnRenderHealthPanel_ renders the clientErrors block');
});

console.log('\nCode.js — consolidated manager daily brief (#2, INV-151)');
vm.runInContext(extractRawFunction('Code.js', 'managerBriefSections_'), sb,
  { filename: 'Code.js#managerBriefSections_' });
const managerBriefSections_ = sb.managerBriefSections_;
test('managerBriefSections_ keeps only non-empty sections, in render order, with counts', () => {
  assert.strictEqual(managerBriefSections_({}).length, 0, 'all-clear → no sections → silent morning');
  assert.strictEqual(managerBriefSections_(null).length, 0, 'null-safe');
  const s = managerBriefSections_({
    missed: [{}], urgent: [{}, {}], training: [], docs: [{}], coaching: null, deptOverdue: [{}, {}, {}],
  });
  assert.strictEqual(s.map((x) => x.key).join(','), 'urgent,missed,docs,deptOverdue',
    'empty/absent sections dropped; order is the fixed render order (urgent first)');
  assert.strictEqual(s.map((x) => x.count).join(','), '2,1,1,3', 'counts carried for the subject line');
  assert.ok(s.every((x) => x.label), 'every section carries its display label');
});
test('the brief suppresses exactly the four daily manager streams — never the independents (source tripwire)', () => {
  // F(cycle-8 M-11): each suppressed handler consults the LIVENESS helper
  // (flag AND a fresh managerBrief heartbeat), never the bare flag — flipping
  // the flag on without installing the brief trigger used to silently stop
  // every manager notification. The employee-facing paths sit OUTSIDE the
  // gated branch (missed-punch employee reminders + the training-overdue
  // employee nudges send regardless).
  ['sendDailyMissedPunchAlerts', 'sendCallNotesUrgentDigest',
   'sendTrainingOverdueDigest', 'sendDeptRequestReminderDigest'].forEach((h) => {
    const src = extractRawFunction('Code.js', h);
    assert.ok(/managerBriefSuppressionActive_\s*\(/.test(src),
      h + ' must gate suppression on managerBriefSuppressionActive_ (flag + live heartbeat)');
    // Cycle-9 L-18: the digest call sites additionally require a LIVE brief
    // trigger ({checkTrigger:true} — visible in their trigger context, where
    // the runner is the installer). A manual editor run of the brief stamps a
    // fresh heartbeat with no trigger behind it; without this the four
    // digests suppressed into a ~26h silent-outage window the briefConfig
    // detector cannot see (suppression reads active).
    assert.ok(/managerBriefSuppressionActive_\(\s*\{\s*checkTrigger:\s*true\s*\}\s*\)/.test(src),
      h + ' must pass {checkTrigger:true} (the L-18 manual-run window)');
    assert.ok(!/getFlag_\(\s*'managerDailyBrief'\s*\)/.test(src),
      h + ' must NOT gate on the bare flag (the M-11 silent-outage class)');
  });
  // The helper itself is the single place the flag + heartbeat combine:
  // fail-safe (missing/stale/unparseable heartbeat → false → digests send).
  const helperSrc = extractRawFunction('Code.js', 'managerBriefSuppressionActive_');
  assert.ok(/getFlag_\(\s*'managerDailyBrief'\s*\)/.test(helperSrc), 'helper consults the flag');
  assert.ok(/managerBrief/.test(helperSrc) && /DIGEST_LAST_RUN_PROP/.test(helperSrc),
    'helper consults the managerBrief heartbeat');
  assert.ok(/return false/.test(helperSrc), 'helper fails safe (returns false on any doubt)');
  // L-18: the trigger check lives behind opts.checkTrigger and fails toward
  // NOT suppressing (a doubled email beats a silent outage); the PANEL
  // detector must stay argless — a viewing manager isn't the installer, so
  // getProjectTriggers() would false-alarm in that context.
  assert.ok(/checkTrigger/.test(helperSrc) && /getProjectTriggers/.test(helperSrc),
    'helper carries the opts.checkTrigger trigger-existence branch');
  const detectorSrc = extractRawFunction('Code.js', 'automationDetectorChecks_');
  assert.ok(/!managerBriefSuppressionActive_\(\)/.test(detectorSrc),
    'the briefConfig detector calls the helper ARGLESS (no trigger check in viewer context)');
  // The failure watchdog is deliberately NOT consolidated (it's what reports
  // a dead brief trigger) and the weekly digests stay weekly.
  ['sendAutomationHealthDigest', 'sendCallNotesWeeklyDigests'].forEach((h) => {
    const src = extractRawFunction('Code.js', h);
    assert.ok(!/managerDailyBrief/.test(src), h + ' must stay independent of the brief flag');
  });
  // Suppressed daily digests still stamp their heartbeat (dead-trigger
  // detection survives the suppression).
  ['sendCallNotesUrgentDigest', 'sendDeptRequestReminderDigest'].forEach((h) => {
    const src = extractRawFunction('Code.js', h);
    assert.ok(src.indexOf('managerBriefSuppressionActive_(') >= 0 &&
              src.indexOf('stampDigestLastRun_') >= 0, h + ' has both the gate and a heartbeat');
  });
  // The brief itself heartbeats BEFORE its flag check — trigger liveness is
  // observable even while the feature is off.
  const briefSrc = extractRawFunction('Code.js', 'sendManagerDailyBrief');
  assert.ok(briefSrc.indexOf("stampDigestLastRun_('managerBrief')") <
            briefSrc.indexOf("getFlag_('managerDailyBrief')"),
    'sendManagerDailyBrief stamps its heartbeat before the flag gate');
});
test('managerDailyBrief is a registered server-scope flag defaulting OFF', () => {
  const m = codeSrc.match(/key:\s*'managerDailyBrief'[\s\S]*?scope:\s*'(\w+)'/);
  assert.ok(m, 'managerDailyBrief is in the FEATURE_FLAGS registry');
  assert.strictEqual(m[1], 'server', 'server scope — no client UI gates on it');
  assert.ok(/key:\s*'managerDailyBrief'[\s\S]{0,700}?default:\s*false/.test(codeSrc),
    'defaults OFF — a fresh deploy is a behavioral no-op');
});

console.log("\nscript_core.html — What's new panel (#4, INV-152)");
const whatsNewShouldShow_ = loadFunction(sb, 'script_core.html', 'whatsNewShouldShow_');
test('whatsNewShouldShow_ compares the seen-stamp; corrupt blob = never seen; no stamp = never show', () => {
  assert.strictEqual(whatsNewShouldShow_(null, '2026-07-09 10:00:00'), true, 'never seen → show');
  assert.strictEqual(whatsNewShouldShow_('{"seenStamp":"2026-07-09 10:00:00"}', '2026-07-09 10:00:00'), false, 'seen this stamp → quiet');
  assert.strictEqual(whatsNewShouldShow_('{"seenStamp":"2026-07-01 08:00:00"}', '2026-07-09 10:00:00'), true, 'article edited since → re-show');
  assert.strictEqual(whatsNewShouldShow_('not json{', '2026-07-09 10:00:00'), true, 'corrupt blob → treated as never seen');
  assert.strictEqual(whatsNewShouldShow_(null, ''), false, 'no stamp → never auto-open');
});
test('getWhatsNew hides drafts + non-articles and reads WHATSNEW_KB_ID (source tripwire)', () => {
  const src = extractRawFunction('Code.js', 'getWhatsNew');
  assert.ok(/getEmployeeInfo_\s*\(/.test(src), 'rep-gated — not a public endpoint');
  assert.ok(/WHATSNEW_KB_ID/.test(src), 'configured via the WHATSNEW_KB_ID Script Property');
  assert.ok(/KB_STATUS_DRAFT/.test(src), 'a draft article stays invisible (INV-140/147 broadcast rule)');
  assert.ok(/none:\s*true/.test(src), 'every quiet-failure path returns {none:true} — dormant, never breaks boot');
});

// Operator feedback 2026-07-09 — updates surface as greeting-bar carousel
// slides on the Dashboard (whatsNewItems_ extracts them from the article).
const whatsNewItems_ = loadFunction(sb, 'script_core.html', 'whatsNewItems_');
test('whatsNewItems_ extracts list items as plain-text slides (caps, stripping, fallback)', () => {
  const md = '# July updates\n\nIntro line.\n\n- **Faster** saves via [batching](https://x)\n* Second `item`\n3. Third item\n\nOutro.';
  const items = whatsNewItems_(md);
  assert.strictEqual(items.join('|'), 'Faster saves via batching|Second item|Third item',
    'list items extracted with markdown stripped (links keep their text)');
  assert.strictEqual(whatsNewItems_(md, 2).length, 2, 'maxItems cap');
  const long = whatsNewItems_('- ' + 'x'.repeat(300), 8, 50)[0];
  assert.strictEqual(long.length, 50, 'per-item length clamp (ellipsis)');
  assert.strictEqual(whatsNewItems_('# Title\n\nJust a paragraph, no lists.').join('|'),
    'Just a paragraph, no lists.', 'no list items → first paragraph as the single slide');
  assert.strictEqual(whatsNewItems_('').length, 0, 'empty body → no slides');
  assert.strictEqual(whatsNewItems_(null).length, 0, 'null-safe');
});

console.log('\nCode.js — Spanish inbox manual mark-resolved (operator feedback)');
test('resolveSpanishThread is member-gated, scope-guarded, locked, and PHI-free (source tripwire)', () => {
  const src = extractRawFunction('Code.js', 'resolveSpanishThread');
  assert.ok(/canSeeSpanishInbox_\s*\(/.test(src), 'gated on canSeeSpanishInbox_ (members + managers)');
  // F(cycle-8): the scope guard is the EXACT-address matcher, not the old raw
  // substring indexOf (which passed xspanishcalls@… / the address inside a
  // display name).
  assert.ok(/spanishAddrListIncludes_\s*\(/.test(src), 'scope guard — exact-address match against To/Cc');
  assert.ok(!/recips\.indexOf\(addr\)/.test(src), 'the substring guard must not return');
  assert.ok(/waitLock\s*\(\s*15000\s*\)/.test(src), 'locked (INV-01 — it appends)');
  assert.ok(/'SpanishInboxResolve'/.test(src) && /threadId=/.test(src), 'audit row carries the threadId only');
  assert.ok(!/getSubject|getPlainBody/.test(src), 'PHI-free — never reads/stores subject or body');
  // All three readers consult the manual map (pending skips; stats + resolved count it).
  ['getSpanishInboxStats', 'getSpanishInboxPending', 'getSpanishInboxResolved'].forEach((fn) => {
    assert.ok(/spanishManualResolvedMap_\(/.test(extractRawFunction('Code.js', fn)),
      fn + ' consults the manual-resolved map');
  });
});

console.log('\nCode.js — Timesheet cold-archive (#7, INV-153)');
test('archiveOldTimesheetRows is a move-only tier wired through the shared helper', () => {
  const src = extractRawFunction('Code.js', 'archiveOldTimesheetRows');
  assert.ok(/assertManagerCaller_\s*\(/.test(src), 'trigger-handler gate (INV-44)');
  assert.ok(/waitLock\s*\(\s*15000\s*\)/.test(src), 'locked (INV-01 — it mutates the payroll tab)');
  assert.ok(/archiveSheetRowsOlderThan_\(/.test(src), 'reuses the shared append-then-delete mover');
  assert.ok(/headerRows:\s*2/.test(src), 'skips the Timesheet TWO-row header');
  assert.ok(/getTimesheetArchiveDays_\(/.test(src), 'window resolved through the floor-clamped getter');
  assert.ok(!/purgeSheetRowsOlderThan_/.test(src), 'NEVER purges — payroll is keep-forever (move-only)');
});
test('the archive window clamps UP to the safety floor (a typo cannot strip live payroll rows)', () => {
  const src = extractRawFunction('Code.js', 'getTimesheetArchiveDays_');
  assert.ok(/TIMESHEET_ARCHIVE_MIN_DAYS/.test(src), 'floor constant consulted');
  assert.ok(/return TIMESHEET_ARCHIVE_MIN_DAYS/.test(src), 'sub-floor values clamp UP, never down');
  const m = codeSrc.match(/const TIMESHEET_ARCHIVE_MIN_DAYS = (\d+)/);
  assert.ok(m && parseInt(m[1], 10) >= 60,
    'floor comfortably exceeds every active payroll window (adjust 30d, export ≤31d, trends 14d)');
  assert.ok(/TIMESHEET_ARCHIVE_DAYS:\s*0/.test(codeSrc), 'CONFIG default 0 — disabled on a fresh deploy');
});
test('no Timesheet purge tier exists (keep-forever); the CN tier keeps the header/width defaults', () => {
  assert.ok(codeSrc.indexOf('purgeArchivedTimesheet') === -1 &&
            !/purgeSheetRowsOlderThan_\([^)]*Timesheet/i.test(codeSrc),
    'nothing purges the Timesheet archive — payroll rows are only ever MOVED');
  // The CN cold tier passes ONLY maxRows (cycle-12 F3-sibling). headerRows and
  // width must stay defaulted — the CN Notes tab has ONE header row and the
  // CN_HEADERS width, and passing either explicitly here would be drift.
  const cn = extractRawFunction('Code.js', 'archiveOldCallNotes');
  assert.ok(/archiveSheetRowsOlderThan_\(live, archive, CN\.DATE_LOCAL, cutoffMs,\s*\{ maxRows: budget \}\)/
    .test(cn.replace(/\s*\n\s*/g, ' ')),
    'archiveOldCallNotes passes only the per-run bound (headerRows/width stay defaulted)');
  assert.ok(!/headerRows/.test(cn) && !/width:/.test(cn),
    'no headerRows/width drift at the CN call site');
});

console.log('\ntc/script_clock.html — night-sky phases + skeleton loaders (operator picks a+b)');
const clkSkyFor_ = loadFunction(sb, 'tc/script_clock.html', 'clkSkyFor_');

test('clkSkyFor_ walks distinct night sub-phases with star densities (flat "Night" is gone)', () => {
  assert.strictEqual(clkSkyFor_(10).phase + '|' + clkSkyFor_(10).stars, 'Morning|0', 'day phases carry no stars');
  assert.strictEqual(clkSkyFor_(18).phase + '|' + clkSkyFor_(18).stars, 'Dusk|1', 'first stars at dusk');
  assert.strictEqual(clkSkyFor_(21).phase + '|' + clkSkyFor_(21).stars, 'Nightfall|2');
  assert.strictEqual(clkSkyFor_(0).phase + '|' + clkSkyFor_(0).stars, 'Midnight|3', 'densest at midnight');
  assert.strictEqual(clkSkyFor_(23).phase, 'Midnight', '23:00 joins the midnight band');
  assert.strictEqual(clkSkyFor_(3).phase + '|' + clkSkyFor_(3).stars, 'Late night|3');
  assert.strictEqual(clkSkyFor_(4).phase + '|' + clkSkyFor_(4).stars, 'Pre-dawn|1', 'stars fade toward dawn');
  // The IST overnight shift (~18:30–03:00 local) now crosses ≥4 distinct looks.
  const gradients = [18, 21, 0, 3, 4].map((h) => clkSkyFor_(h).grad);
  assert.strictEqual(new Set(gradients).size, gradients.length, 'each night sub-phase has its own gradient');
  [18, 21, 0, 3, 4].forEach((h) => assert.strictEqual(clkSkyFor_(h).glyph, 'moon'));
});

test('the Dashboard uses card-shaped skeletons — no sweep bar remains (operator pick)', () => {
  const clockSrc = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(!/loSweep\(/.test(clockSrc), 'no loSweep() call remains in the Dashboard partial');
  assert.ok(/clkDashSkeleton_\(/.test(clockSrc) && /clkDashSkelKpis_\(/.test(clockSrc),
    'skeleton helpers are wired (initial pair + per-card KPI shapes)');
  assert.ok(/class="skel dash-skel-kpi"/.test(clockSrc), 'skeletons compose the shared .skel shimmer');
});

// ── Cycle 9 · Batch 7 — pins for previously-unpinned recent features ─────────
console.log('\ncycle-9 batch 7 — feature pins + payload-contract tripwire');

test('L-35: PUNCH_MORPH destinations equal the NEXT state\'s primary idle glyph (the F7 half-step class)', () => {
  const clockSrc = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  const m = clockSrc.match(/const PUNCH_MORPH = \{[\s\S]*?\n\};/);
  assert.ok(m, 'PUNCH_MORPH found');
  const morph = {};
  [...m[0].matchAll(/(\w+):\s*\{\s*from:\s*'(\w+)',\s*to:\s*'(\w+)'\s*\}/g)]
    .forEach((mm) => { morph[mm[1]] = { from: mm[2], to: mm[3] }; });
  // LunchOut → mug (On-Lunch's primary LunchIn idles as the mug). LunchIn →
  // doorExit, NOT headset: a lunch RETURN sets afterLunch, which makes
  // ClockOut (idle doorExit) the primary — PUNCH_MORPH.LunchIn.to='headset'
  // was the documented F7 regression (the morph lagged the re-render).
  assert.strictEqual(morph.LunchOut && morph.LunchOut.from, 'headset');
  assert.strictEqual(morph.LunchOut && morph.LunchOut.to, 'coffeeMug');
  assert.strictEqual(morph.LunchIn && morph.LunchIn.from, 'coffeeMug');
  assert.strictEqual(morph.LunchIn && morph.LunchIn.to, 'doorExit',
    "LunchIn morphs to doorExit (afterLunch makes ClockOut primary) — 'headset' is the F7 half-step bug");
});

test('L-35: spanishSearchQuery_ keeps the {to: cc:} brace-OR (Cc\'d requests enter all three readers)', () => {
  const sctx = { String };
  vm.createContext(sctx);
  vm.runInContext(extractRawFunction('Code.js', 'spanishSearchQuery_'), sctx, { filename: 'Code.js#spanishSearchQuery_' });
  const q = sctx.spanishSearchQuery_('inbox@x.com', 7);
  assert.ok(/^\{to:inbox@x\.com cc:inbox@x\.com\}/.test(q),
    'brace-OR over to: AND cc: — a plain to: silently drops Cc\'d requests from stats/pending/resolved');
  assert.ok(/newer_than:7d$/.test(q), 'window rides the query');
});

test('L-35: night-sky runtime gating — shooting stars need deep night + mid-shift + motion-ok', () => {
  const clockSrc = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  const fn = clockSrc.match(/function clkShootMaybe_\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn, 'clkShootMaybe_ found');
  assert.ok(/_clkLastStarDensity < 2/.test(fn[0]), 'deep-night density gate (< 2 returns)');
  assert.ok(/prefers-reduced-motion/.test(fn[0]), 'reduced-motion skip (a non-animating streak would linger)');
  assert.ok(/clkSchedStartMin_/.test(fn[0]), 'rep-local shift-midpoint gate');
});

test('L-35: greeting rotator ties to the startClock/stopClock lifecycle + hover-holds', () => {
  const clockSrc = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/clkGreetRotStart_|clkGreetRot/.test(clockSrc), 'rotator present');
  const stopFn = clockSrc.match(/function stopClock\(\) \{[\s\S]*?\n\}/);
  assert.ok(stopFn && /GreetRot|_greetRot/i.test(stopFn[0]),
    'stopClock tears the rotator down (interval-leak class)');
});

// Strategic #2 — the M-3 drift class: the client kept writing subformData /
// payload keys a later server whitelist silently dropped. Extract every key
// the CLIENT submits (payload.subformData.X assignments + subformData:{...}
// literals in submit payloads, ternary form included) and assert each is on
// sanitizeCallNotePayload_'s whitelist (a rawSub.<key> read).
test('TRIPWIRE (C9): every client-submitted subformData key is on the server whitelist (INV-143)', () => {
  const whitelistSrc = extractRawFunction('Code.js', 'sanitizeCallNotePayload_');
  const serverKeys = new Set([...whitelistSrc.matchAll(/rawSub\.(\w+)/g)].map((m) => m[1]));
  assert.ok(serverKeys.size >= 3, 'server whitelist parsed (got ' + [...serverKeys].join(',') + ')');
  const clientKeys = new Set();
  ['cn/script_callnotes.html', 'intake/script_intake.html'].forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    [...src.matchAll(/(?:payload|notePayload)\.subformData\.(\w+)\s*=/g)].forEach((m) => clientKeys.add(m[1]));
    // Cycle-11 (tripwire hole): balanced-brace extraction. The old
    // `\{([^}]*)\}` stopped at the FIRST `}`, so any nested object in a
    // submit literal hid every key after it from the whitelist check —
    // re-opening the exact M-3 silent-drop class this tripwire retires.
    // Top-level keys are read from a depth-masked copy (nested {[( ... )]}
    // content and quoted strings removed).
    const openRe = /subformData:\s*(?:\w+\s*\?\s*)?\{/g;
    let om;
    while ((om = openRe.exec(src))) {
      let depth = 1, j = openRe.lastIndex;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
      }
      const inner = src.slice(openRe.lastIndex, j - 1)
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
      let masked = '', d = 0;
      for (const ch of inner) {
        if (ch === '{' || ch === '[' || ch === '(') { d++; continue; }
        if (ch === '}' || ch === ']' || ch === ')') { d--; continue; }
        if (d === 0) masked += ch;
      }
      [...masked.matchAll(/(\w+)\s*:/g)].forEach((k) => clientKeys.add(k[1]));
    }
  });
  assert.ok(clientKeys.size >= 3, 'client-submitted keys parsed (got ' + [...clientKeys].join(',') + ')');
  clientKeys.forEach((k) => {
    assert.ok(serverKeys.has(k),
      "client submits subformData." + k + " but sanitizeCallNotePayload_'s whitelist never reads it — it is silently dropped at submit (the cycle-9 M-3 class)");
  });
});

// Batch 7 — extend the view-key net: showView('…') literals are tab keys too
// (the H-1/M-9 family; enterTool literals are covered by their own tripwire).
test("every showView('…') literal is a registered tab key", () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  const validKeys = [...toolsBlock[0].matchAll(/(\w+):\s*\{[^{}]*enter:\s*'/g)].map((m) => m[1]);
  assert.ok(validKeys.length >= 10, 'tab keys parsed');
  let svLiterals = 0;
  const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  REGISTRY_SCAN_PARTIALS.forEach((f) => {   // M-4: one derived list, no hand copy
    const src = stripC(fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8'));
    // Cycle-11: both quote styles — a double-quoted literal escaped the net.
    [...src.matchAll(/showView\(\s*['"]([^'"]+)['"]/g)].forEach((m) => {
      if (m[1].indexOf('${') >= 0) return;
      svLiterals++;
      assert.ok(validKeys.indexOf(m[1]) >= 0,
        f + ": showView('" + m[1] + "') is not a registered tab key");
    });
  });
  assert.ok(svLiterals >= 3, 'showView literals found (scan is armed — got ' + svLiterals + ')');
});

// ── Cycle 10 — top-5 broad-scan fix pins (M-1/M-2/M-3/M-5/M-6) ────────────
console.log('\ncycle-10 — top-5 broad-scan fix pins');

// M-5 behavioral: the intake PHI-store cell cap helper (pure). The cap must
// reject a cell over the Sheets-safe limit and pass ordinary payloads.
test('intakeStoreOversizeError_ caps store cells (M-5, INV-96 spirit)', () => {
  const codeSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const capM = codeSrc.match(/const INTAKE_STORE_CELL_MAX = (\d+)/);
  assert.ok(capM, 'INTAKE_STORE_CELL_MAX declared');
  const cap = parseInt(capM[1], 10);
  assert.ok(cap > 0 && cap < 50000, 'cap under the 50k Sheets cell limit');
  const ctx = { String: String, INTAKE_STORE_CELL_MAX: cap };
  vm.createContext(ctx);
  vm.runInContext(extractRawFunction('Code.js', 'intakeStoreOversizeError_'), ctx,
    { filename: 'Code.js#intakeStoreOversizeError_' });
  assert.strictEqual(vm.runInContext('intakeStoreOversizeError_(["{}", "small"])', ctx), null,
    'small cells pass');
  assert.ok(/too large/.test(vm.runInContext(
    'intakeStoreOversizeError_(["x".repeat(' + (cap + 1) + ')])', ctx) || ''),
    'oversized cell rejected with a clear error');
  // Both intake send paths must consult the cap BEFORE MailApp and surface
  // storeWarning on an append failure (never a bare console.warn again).
  const ppd = extractRawFunction('Code.js', 'intakeSendPPD');
  const acct = extractRawFunction('Code.js', 'intakeSendAcct_');
  [ppd, acct].forEach((src, i) => {
    const label = i === 0 ? 'intakeSendPPD' : 'intakeSendAcct_';
    assert.ok(src.indexOf('intakeStoreOversizeError_') >= 0, label + ' consults the cap');
    assert.ok(src.indexOf('intakeStoreOversizeError_') < src.indexOf('MailApp.sendEmail'),
      label + ' caps BEFORE the send (no email without a record)');
    assert.ok(src.indexOf('intakeStoreFailWarn_') >= 0, label + ' surfaces store failures');
    assert.ok(src.indexOf('storeWarning: storeWarning') >= 0, label + ' returns storeWarning');
  });
});

// M-1 source pins: the live-punch path enforces the client's own state
// machine, and the two manager write paths agree on which duplicate row wins.
test('recordPunch live path enforces getNextActions_; findExistingPunch_ is last-match (M-1)', () => {
  const rp = extractRawFunction('Code.js', 'recordPunch');
  assert.ok(/getNextActions_\(todayPunches\)/.test(rp),
    'recordPunch validates live punches against getNextActions_');
  // Guard must sit INSIDE the !isAdj branch (adjust back-fills bypass) and
  // AFTER the min-interval check (rapid-fire keeps its friendlier error).
  assert.ok(rp.indexOf('MIN_PUNCH_INTERVAL_SECONDS') < rp.indexOf('getNextActions_(todayPunches)'),
    'sequence guard runs after the min-interval check');
  const fep = extractRawFunction('Code.js', 'findExistingPunch_');
  assert.ok(/found = \{ sheet/.test(fep) && !/return \{ sheet/.test(fep),
    'findExistingPunch_ remembers the LAST match (agrees with managerSaveDay’s snapshot)');
  const msd = extractRawFunction('Code.js', 'managerSaveDay');
  assert.ok(/rowsByType/.test(msd) && /collapse/.test(msd),
    'managerSaveDay snapshots ALL rows per type and collapses duplicates');
});

// M-2 source pins: Day Edit bounds the picker on the TARGET employee's today.
test('openDayEditModal uses the target rep timezone; liveStatus ships it (M-2)', () => {
  const mgrSrc = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  const modal = mgrSrc.slice(mgrSrc.indexOf('function openDayEditModal('));
  const body = modal.slice(0, modal.indexOf('\nfunction ', 10));
  assert.ok(/targetTz/.test(body) && /\.timezone/.test(body),
    'openDayEditModal resolves the target’s tz from liveStatus');
  const codeSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const lsBlock = codeSrc.slice(codeSrc.indexOf('const liveStatus = employees.map'));
  assert.ok(/timezone: e\.timezone/.test(lsBlock.slice(0, 2000)),
    'liveStatus entries carry the IANA timezone');
});

// M-3 source pins: pinned-tray render routing + typed-edit preservation.
test('cnReRenderActiveView_ re-renders the pinned tray; tray render is edit-safe (M-3)', () => {
  const cnSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const rr = cnSrc.slice(cnSrc.indexOf('function cnReRenderActiveView_('));
  const rrBody = rr.slice(0, rr.indexOf('\n}') + 2);
  assert.ok(/cnRenderPinnedTray_\(\)/.test(rrBody),
    'cnReRenderActiveView_ routes pinned-tray re-renders');
  const tray = cnSrc.slice(cnSrc.indexOf('function cnRenderPinnedTray_('));
  const trayBody = tray.slice(0, tray.indexOf('\n}') + 2);
  assert.ok(/cnEditSnapshot_\(\)/.test(trayBody) && /cnEditRestore_\(/.test(trayBody),
    'cnRenderPinnedTray_ preserves typed inline-edit values across re-renders');
});

// Batch C server pins (cycle 10): witness-audit wiring, validation, and the
// small silent-degradation guards.
test('cycle-10 batch C: witness wiring + server guards hold', () => {
  const codeSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  // C4 — the three witness rows route through writeWitnessAuditLog_, the
  // health report carries witnessFails, and the failure digest pushes recent.
  ['FormSubmissionReceived', 'EmpDocSigned', 'EmpDocCompleted'].forEach((a) => {
    assert.ok(new RegExp("writeWitnessAuditLog_\\([^)]*'" + a + "'").test(codeSrc),
      a + ' is written via writeWitnessAuditLog_ (C4)');
  });
  assert.ok(/witnessFails: witnessFails/.test(codeSrc), 'computeAutomationHealth_ returns witnessFails');
  assert.ok(/report\.witnessFails\.recent/.test(codeSrc) || /witnessFails && report\.witnessFails\.recent/.test(codeSrc),
    'the failure digest pushes a recent lost witness');
  // C2 — exportAdpRange validates its dates before generating.
  const exp = extractRawFunction('Code.js', 'exportAdpRange');
  assert.ok(exp.indexOf('generateExportSheet_') > exp.indexOf('Invalid start date'),
    'exportAdpRange validates before generating');
  // C7 — backward-only delete window (no symmetric Math.abs).
  const del = extractRawFunction('Code.js', 'deletePunch');
  assert.ok(del.indexOf('Math.abs(daysBetween_') < 0, 'deletePunch window is backward-only (C7)');
  // C8 — auth precedes the feature-flag read.
  const ts = extractRawFunction('Code.js', 'getTeammateStatus');
  assert.ok(ts.indexOf('getEmployeeInfo_') < ts.indexOf("getFlag_('showTeammateStatus')"),
    'getTeammateStatus authenticates before evaluating the flag (C8)');
  // C1 — reconcile routes its Timestamp reads through the boundary helper.
  const rec = extractRawFunction('Code.js', 'reconcileCallNotes');
  assert.ok((rec.match(/cnTimestampString_\(/g) || []).length >= 2,
    'reconcileCallNotes recovers Timestamps via cnTimestampString_ (C1/INV-142)');
  // C5 — a deliberately-cleared {} config stays empty.
  ['getStateTaxRates_', 'getUpdateSuggestions_'].forEach((fn) => {
    const src = extractRawFunction('Code.js', fn);
    assert.ok(/Object\.keys\(parsed\)\.length === 0 \|\|/.test(src),
      fn + ' keeps a cleared {} empty (C5)');
  });
});

// Batch D client pins (cycle 10): failure-handling order + compact guard.
test('cycle-10 batch D: client guards hold', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  // D8 — the pop-out never overwrites the main window's restore tab.
  assert.ok(/if \(!COMPACT_MODE\) \{ try \{ localStorage\.setItem\('umsLastView', view\);/.test(core),
    'umsLastView persist is compact-guarded (D8)');
  // D10 — null-prototype beacon dedupe map.
  assert.ok(/_errBeaconSeen = Object\.create\(null\)/.test(core), 'beacon dedupe map is null-prototype (D10)');
  // D1 — the PTO day-submit checks the result BEFORE closing the modal.
  const to = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_timeoff.html'), 'utf8');
  const seg = to.slice(to.indexOf("document.getElementById('day-submit').addEventListener"));
  assert.ok(seg.indexOf('if (!result.success)') < seg.indexOf("classList.remove('open')"),
    'day-submit keeps the modal open on a server rejection (D1)');
  // D3 — unknown live-status enum degrades, never throws.
  const mgr = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  assert.ok(/MGR_STATUS\[e\.status\] \|\| MGR_STATUS\.not_in/.test(mgr),
    'live-status card falls back on an unknown enum (D3)');
  // D2a — a failed dashboard round is never stamped fresh.
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/CLK_DASH\.loadedAt = anyFail \? 0 : Date\.now\(\)/.test(clk),
    'dashboard freshness stamp skips failed rounds (D2a)');
  // D12 — the tour Escape suppresses same-node capture siblings.
  const tour = fs.readFileSync(path.join(__dirname, '../../web-app/script_tour.html'), 'utf8');
  assert.ok(/Escape'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\);/.test(tour),
    'tour Escape uses stopImmediatePropagation (D12)');
});

// M-6 source pins: all three Metrics loaders carry same-view seq tokens.
test('Metrics loaders carry stale-range seq tokens (M-6, the _covSeq class)', () => {
  const mSrc = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  [['mLoadMyStats_', 'M_STATE.mySeq'], ['mLoadTeamMetrics_', 'M_STATE.teamSeq'],
   ['spanishLoad_', 'SPANISH_STATE.seq']].forEach(([fn, tok]) => {
    const f = mSrc.slice(mSrc.indexOf('function ' + fn + '('));
    const fBody = f.slice(0, f.indexOf('\nfunction ', 10));
    assert.ok(fBody.indexOf(tok + ' = (') >= 0, fn + ' bumps ' + tok);
    assert.ok(fBody.indexOf('seq !== ' + tok) >= 0, fn + ' handlers re-check ' + tok);
  });
});

// ── Batch L pins — sheet doctor + C13 hash dual-verify ─────────────────────
console.log('\nbatch L — sheet doctor + EmpDocs hash dual-verify pins');
test('sheet doctor: coercion-safe scan, last-row-wins fix, gates + lock', () => {
  const scan = extractRawFunction('Code.js', 'tsDoctorScan_');
  ['normalizeDate_', 'normalizeTime_', 'normalizeType_'].forEach((h) => {
    assert.ok(scan.indexOf(h + '(') >= 0, 'tsDoctorScan_ reads via ' + h + ' (Sheets-coercion discipline)');
  });
  assert.ok(/i = 2/.test(scan), 'tsDoctorScan_ starts after the TWO-row Timesheet header');
  assert.ok(/LunchOut/.test(scan) && /LunchIn/.test(scan), 'tsDoctorScan_ collects lunch pairs (operator ask)');
  const doctor = extractRawFunction('Code.js', 'getTimesheetDoctor');
  assert.ok(/isManager/.test(doctor) && /Manager access required/.test(doctor), 'detector is manager-gated (INV-02)');
  const fix = extractRawFunction('Code.js', 'fixTimesheetDuplicates');
  assert.ok(/isManager/.test(fix) && /waitLock\(/.test(fix) && /finally/.test(fix) && /releaseLock/.test(fix),
    'fix is manager-gated + locked with finally release (INV-01/02)');
  assert.ok(/g\.rows\.length - 1/.test(fix),
    'fix keeps the LAST row per group — the findExistingPunch_/managerSaveDay convention (INV-155)');
  assert.ok(/PunchDelete/.test(fix) && /duplicate collapsed/.test(fix),
    'each deletion writes a duplicate-collapsed PunchDelete audit row (INV-08)');
  assert.ok(!/inverted/.test(fix),
    'fix never touches inverted pairs — report-only by the C3 operator decision');
});
test('typed-signature alternative: both pads carry setTypedName (a11y parity pair)', () => {
  // The canvas pads are deliberate twins (the pad-cap parity pin's pair).
  // The typed alternative must exist on BOTH — a keyboard/motor/SR user is
  // equally blocked on the public PHI form and on HR-doc signing.
  const pub = fs.readFileSync(path.join(__dirname, '../../web-app/form_public.html'), 'utf8');
  const ed = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_empdocs.html'), 'utf8');
  [['form_public.html', pub], ['train/script_empdocs.html', ed]].forEach(([name, src]) => {
    assert.ok(src.indexOf('setTypedName') >= 0, name + ' pad exposes setTypedName');
    assert.ok(src.indexOf('Segoe Script') >= 0, name + ' renders the typed name in the script face (same PNG artifact class as a drawn signature)');
    assert.ok(/aria-expanded/.test(src), name + ' typed toggle is a disclosure (aria-expanded)');
  });
});
test('nightly self-test trigger: heartbeat-first, dev-only full suite, failure surfaced', () => {
  const src = extractRawFunction('Code.js', 'runNightlySelfTest');
  assert.ok(/assertManagerCaller_\(/.test(src), 'INV-44 trigger-handler gate');
  // Heartbeat BEFORE the run — trigger liveness stays observable even if the
  // suite crashes (the INV-151 posture).
  assert.ok(src.indexOf("stampDigestLastRun_('selfTest')") < src.indexOf('runSmokeTests'),
    'heartbeat stamps before the suite runs');
  assert.ok(/INSTANCE_IS_PROD/.test(src) && /INSTANCE_LABEL/.test(src),
    'full suite gates on the DEV-instance check — smoke-only anywhere else');
  assert.ok(/isDev\) runAllTests\(\); else runSmokeTests\(\)/.test(src.replace(/\s+/g, ' ')),
    'runAllTests only on dev; runSmokeTests otherwise');
  const problems = extractRawFunction('Code.js', 'automationProblems_');
  assert.ok(/selfTest/.test(problems) && /selfTest\.fail > 0/.test(problems),
    'a failing self-test rides automationProblems_ (health dot + failure digest)');
  const health = extractRawFunction('Code.js', 'computeAutomationHealth_');
  assert.ok(/SELF_TEST_RESULT_PROP/.test(health) && /selfTest: selfTest/.test(health),
    'computeAutomationHealth_ returns the last self-test outcome');
  // F15 (cycle 12): the RUNNING sentinel. An execution-time-limit kill is not
  // catchable, so without it a chronically timing-out suite left the PREVIOUS
  // (green) result in place beside a fresh heartbeat — the newest detector
  // silently unable to fire.
  const sentinel = src.indexOf('running: true');
  assert.ok(sentinel >= 0, 'the run stamps a {running:true} sentinel');
  assert.ok(sentinel < src.indexOf('if (isDev) runAllTests()'),
    'the sentinel is stamped BEFORE the suite runs — otherwise a killed run never records it');
  assert.ok(/startedAt: Date\.now\(\)/.test(src), 'the sentinel carries a start time for the staleness compare');
  assert.ok(/stuck: !!\(st\.running/.test(health) && /SELF_TEST_STUCK_MS/.test(health),
    'the health projection derives `stuck` from a STALE running sentinel (a run in flight is not a problem)');
  assert.ok(/if \(report\.selfTest && report\.selfTest\.stuck\)/.test(problems) &&
            /never finished/.test(problems),
    'a stuck self-test rides automationProblems_ (health dot + failure digest)');
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const selfHtml = cn.slice(cn.indexOf('function cnSelfTestHtml_'));
  assert.ok(selfHtml.indexOf('st.stuck') >= 0 && selfHtml.indexOf('st.stuck') < selfHtml.indexOf('all passing'),
    'the Admin panel reports a stuck run INSTEAD of the stale pass/fail line');
});
test('C13: EmpDocs hashes default to the NUL delimiter; every recompute site dual-verifies', () => {
  const NUL_ESC = '\\' + 'u0000';   // the 6-char escape as source text
  const content = extractRawFunction('Code.js', 'empDocContentHash_');
  const sig = extractRawFunction('Code.js', 'empDocSignatureHash_');
  [content, sig].forEach((src, i) => {
    assert.ok(src.indexOf("(delim === undefined) ? '" + NUL_ESC + "'") >= 0,
      (i ? 'empDocSignatureHash_' : 'empDocContentHash_') + ' defaults to the NUL delimiter (new writes are v2)');
  });
  const ack = extractRawFunction('Code.js', 'acknowledgeDoc');
  assert.ok(/empDocContentHashMatches_\(/.test(ack),
    'acknowledgeDoc integrity gate dual-verifies — a pre-C13 doc must still sign');
  const verify = extractRawFunction('Code.js', 'verifyDocSignature');
  assert.ok(/empDocContentHashMatches_\(/.test(verify), 'verifyDocSignature content check dual-verifies');
  assert.ok(/EMPDOC_HASH_DELIM_LEGACY/.test(verify),
    'verifyDocSignature recomputes the signature hash in the legacy form too');
});

console.log('\nCode.js — cycle-11 fixes (M-1 dup-approve guard, L-1 details cap, L-2 Transfer headers, L-3 range cache)');
// M-1: the status-change path carries the INV-94 dup-guard (source pin — the
// behavioral case is the editor test test_updateTimeOff_dupApproveRejected).
test('updateTimeOffStatus re-checks hasActiveTimeOffOnDate_ (own row excluded) on the approve transition', () => {
  const src = extractRawFunction('Code.js', 'updateTimeOffStatus');
  assert.ok(/hasActiveTimeOffOnDate_\(sheet,\s*empId,\s*date,\s*i\)/.test(src),
    "the →Approved transition must re-run the INV-94 dup-guard excluding the row's own index");
});

// L-1: the four composer detail objects are the one client-writable
// subformData input with a size bound — drive the validator behaviorally.
{
  const capMatch = codeSrc.match(/const (CN_EMAIL_DETAILS_MAX_CHARS\s*=\s*\d+);/);
  assert.ok(capMatch, 'CN_EMAIL_DETAILS_MAX_CHARS declaration found in Code.js');
  vm.runInContext(capMatch[1] + ';', sb, { filename: 'Code.js#CN_EMAIL_DETAILS_MAX_CHARS' });
  vm.runInContext(extractRawFunction('Code.js', 'sanitizeEmailSelections_'), sb,
    { filename: 'Code.js#sanitizeEmailSelections_' });
  vm.runInContext(extractRawFunction('Code.js', 'validateEmailSelections_'), sb,
    { filename: 'Code.js#validateEmailSelections_' });
  const base = { departments: ['Billing'], individualEmail: '', updateInfo: 'Close Order',
    callbackNeeded: false, overwriteResolution: false,
    shippingDetails: null, closeDetails: null, resupplyDetails: null, oopDetails: null };
  test('validateEmailSelections_ passes normal-sized subform details', () => {
    const s = Object.assign({}, base, { shippingDetails: { specialNote: 'left at the side door' } });
    assert.strictEqual(sb.validateEmailSelections_(s).ok, true);
  });
  test('validateEmailSelections_ rejects oversized details with an actionable error (L-1)', () => {
    const s = Object.assign({}, base, { shippingDetails: { specialNote: 'x'.repeat(sb.CN_EMAIL_DETAILS_MAX_CHARS + 100) } });
    const r = sb.validateEmailSelections_(s);
    assert.ok(r.error && r.error.indexOf('too large') >= 0,
      'an over-cap details blob must be rejected at Preview AND Send, not silently poison the SubformData cell');
  });
  test('sanitizeEmailSelections_ coerces non-object details to null', () => {
    const s = sb.sanitizeEmailSelections_({ shippingDetails: 'crafted-string', closeDetails: [1, 2], oopDetails: { ok: 1 } });
    assert.strictEqual(s.shippingDetails, null);
    assert.strictEqual(s.closeDetails, null);
    assert.deepStrictEqual(s.oopDetails, { ok: 1 });
  });
}

// L-2: the CSR Transfer tab gets the validateCdrColumns_ treatment — the
// pure csrTransferHeaderMismatches_ core is driven behaviorally, and the
// expected-header map must cover every column CSRT actually reads.
{
  const hdrMatch = codeSrc.match(/const (CSR_TRANSFER_EXPECTED_HEADERS\s*=\s*\{[\s\S]*?\});/);
  assert.ok(hdrMatch, 'CSR_TRANSFER_EXPECTED_HEADERS declaration found in Code.js');
  vm.runInContext(hdrMatch[1] + ';', sb, { filename: 'Code.js#CSR_TRANSFER_EXPECTED_HEADERS' });
  vm.runInContext(extractRawFunction('Code.js', 'csrTransferHeaderMismatches_'), sb,
    { filename: 'Code.js#csrTransferHeaderMismatches_' });
  const goodHeaders = ['Month-Year', 'Week', 'Date', 'CSR Rep Name', 'Transfer %',
    'Total Calls', 'Total Calls Transferred'];
  test('csrTransferHeaderMismatches_ accepts the documented A1:S1 layout', () => {
    // .length (not deepStrictEqual) — the vm-realm array's prototype differs.
    assert.strictEqual(sb.csrTransferHeaderMismatches_(goodHeaders).length, 0);
  });
  test('csrTransferHeaderMismatches_ flags an inserted/reordered column (the cross-repo seam)', () => {
    const shifted = ['Month-Year', 'Week', 'Region'].concat(goodHeaders.slice(2));
    const mismatches = sb.csrTransferHeaderMismatches_(shifted);
    assert.ok(mismatches.length > 0, 'a column insert before Date must produce mismatches');
  });
  test('csrTransferHeaderMismatches_ expected map covers every CSRT reader column (index alignment)', () => {
    const csrtMatch = codeSrc.match(/const CSRT = \{([^}]*)\}/);
    assert.ok(csrtMatch, 'CSRT enum found');
    const entries = [...csrtMatch[1].matchAll(/(\w+):\s*(\d+)/g)];
    assert.ok(entries.length >= 5, 'CSRT entries parsed');
    entries.forEach(([, name, idx]) => {
      assert.ok(sb.CSR_TRANSFER_EXPECTED_HEADERS[Number(idx) + 1] !== undefined,
        'CSRT.' + name + ' (0-based ' + idx + ') has no expected header at 1-indexed col ' + (Number(idx) + 1) +
        ' — a reordered Transfer column there would go unvalidated');
    });
  });
}

// MIRROR_INDEX omission (cycle 11): the kb editor's paste-upload size check
// carries a literal that must equal the server constant (INV-118 "mirrored
// client-side" finally has a guard). Both sides are numeric expressions —
// evaluate and compare values, so `4*1024*1024` vs a plain number both work.
test('client paste cap mirrors the server KB_IMG_UPLOAD_MAX_CHARS', () => {
  const sm = codeSrc.match(/KB_IMG_UPLOAD_MAX_CHARS\s*=\s*([^;]+);/);
  assert.ok(sm, 'server KB_IMG_UPLOAD_MAX_CHARS found');
  const kbSrc = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const cm = kbSrc.match(/dataUrl\.length\s*>\s*([^)]+)\)[^\n]*mirrors KB_IMG_UPLOAD_MAX_CHARS/);
  assert.ok(cm, "client mirror line not found (the '// mirrors KB_IMG_UPLOAD_MAX_CHARS' comment is the anchor)");
  const evalNum = (expr) => Function('"use strict"; return (' + expr.split('//')[0] + ');')();
  assert.strictEqual(evalNum(cm[1]), evalNum(sm[1]),
    'the kb editor paste cap drifted from the server KB_IMG_UPLOAD_MAX_CHARS');
});

// L-3: a failed per-day trend read must never be cached as a fresh result.
test('getMyMetricsRange skips the cache put when the trend read failed (error-not-cached, L-3)', () => {
  const src = extractRawFunction('Code.js', 'getMyMetricsRange');
  assert.ok(/trendFailed = true/.test(src), 'the trend catch marks the round degraded');
  assert.ok(/useRangeCache && !trendFailed/.test(src),
    'the cache put must be gated on the trend having succeeded — a transient CDR failure was pinned for the full TTL');
});

// ── Cycle-12 broad-scan fix pins (F1–F5) ───────────────────────────────────
console.log('\ncycle 12 — broad-scan fix pins (F1–F5)');

// F1: the Timesheet cold archive (INV-153) had NO reader, so a retroactive ADP
// export silently produced a PARTIAL payroll .xlsx behind {success:true}.
test('F1: generateExportSheet_ reads through the Timesheet cold archive when the range predates the live tab', () => {
  const src = extractRawFunction('Code.js', 'generateExportSheet_');
  assert.ok(src.indexOf('TIMESHEET_ARCHIVE_TAB') >= 0,
    'the export consults the archive tab — without this the range silently returns live rows only');
  assert.ok(/getSheetByName\(TIMESHEET_ARCHIVE_TAB\)/.test(src),
    'read-only w.r.t. tab existence (getSheetByName, never create — the INV-133 discipline)');
  assert.ok(/oldestLiveDate/.test(src) && /startDate < oldestLiveDate/.test(src),
    'the archive read is gated on the window reaching past the live tab (current-period exports stay byte-identical)');
  assert.ok(/liveKeys\.has\(/.test(src),
    'an archive row identical to a live one is skipped — the INV-132 append-then-delete duplicate must not double-count payroll');
  assert.ok(/archivedRowCount/.test(src), 'the result reports how many rows came from the archive');
  const exp = extractRawFunction('Code.js', 'exportAdpRange');
  assert.ok(/archivedRows=/.test(exp), 'the AdpExport audit row records archived-row provenance');
  assert.ok(/archivedRowCount/.test(exp), 'the response carries archivedRowCount for the manager toast');
  // The archive tab must still have no purge tier (payroll is keep-forever).
  assert.ok(codeSrc.indexOf('purgeArchivedTimesheet') === -1,
    'reading the archive must not have introduced a purge tier');
});

// F2: the detector silently truncated at TS_DOCTOR_MAX_GROUPS while the fix
// collapsed EVERYTHING, unbounded, holding the one project-wide ScriptLock.
test('F2: sheet doctor reports truncation and the destructive collapse is bounded per run', () => {
  const doctor = extractRawFunction('Code.js', 'getTimesheetDoctor');
  assert.ok(/totalDuplicates/.test(doctor) && /totalInverted/.test(doctor),
    'the detector counts EVERY finding, not just the ones inside the payload cap');
  assert.ok(/truncated:/.test(doctor),
    'the detector returns a truncation flag like every sibling bounded reader (getCallNotesAuditLog / getAdminSheetView)');
  assert.ok(/totalDuplicateRows/.test(doctor),
    'the ROW count (what a collapse deletes) is reported, not just the group count');
  const fix = extractRawFunction('Code.js', 'fixTimesheetDuplicates');
  assert.ok(/TS_DOCTOR_FIX_MAX_ROWS/.test(fix), 'the collapse is bounded by the per-run cap');
  assert.ok(/remaining/.test(fix), 'the caller learns how much backlog is left (the op is idempotent → re-run)');
  assert.ok(/toDelete\.slice\(0, TS_DOCTOR_FIX_MAX_ROWS\)/.test(fix),
    'the batch is a slice of the descending-rowIdx list — bottom-up deletion + last-row-wins still hold (INV-155)');
  const m = codeSrc.match(/TS_DOCTOR_FIX_MAX_ROWS = (\d+)/);
  assert.ok(m && parseInt(m[1], 10) > 0 && parseInt(m[1], 10) <= 500,
    'the cap exists and is small enough that the global lock is not held for minutes');
  // The client must not promise more than the server will do.
  const mgr = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  assert.ok(/fixMaxRows/.test(mgr), 'the card labels the button from the server-declared per-run cap');
  assert.ok(/res\.truncated/.test(mgr), 'the card surfaces "showing N of M" when the scan truncated');
  assert.ok(/res\.remaining/.test(mgr), 'the toast says how much backlog is left after a bounded run');
});

// F3: unbounded row-by-row deletion could never finish a large first enable,
// and each killed run re-appended the undeleted rows into the archive.
test('F3: archiveSheetRowsOlderThan_ honors a per-run bound; the Timesheet caller passes one', () => {
  const helper = extractRawFunction('Code.js', 'archiveSheetRowsOlderThan_');
  assert.ok(/opts\.maxRows/.test(helper), 'the shared mover accepts a per-run row bound');
  assert.ok(/toMoveRows\.length >= maxRows/.test(helper), 'the scan stops once the bound is reached');
  assert.ok(/\(opts\.maxRows > 0\) \? opts\.maxRows : 0/.test(helper),
    'no maxRows → unbounded, so the CN call sites stay byte-identical (their 4-arg pin above)');
  const ts = extractRawFunction('Code.js', 'archiveOldTimesheetRows');
  assert.ok(/maxRows: TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN/.test(ts),
    'the Timesheet archive (the large, unboundedly-growing tab) passes the bound');
  assert.ok(/hitPerRunCap/.test(ts),
    'a capped run is visible in the audit trail — a draining backlog must not look like a normal small run');
  const m = codeSrc.match(/TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN = (\d+)/);
  assert.ok(m && parseInt(m[1], 10) > 0, 'the per-run cap constant exists');
});

// F4: the INV-124 cohort guard + team average were computed over a roster that
// still included offboarded/placeholder rows every sibling walk excludes.
test('F3: roster inclusion goes through ONE predicate (INV-124 cohort + F3)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  // (a) The predicate TRIMS — the whole point. A whitespace-only email cell
  // must read as "not a current employee" everywhere, or the walks disagree
  // exactly as column L's did before cnEnrolledSheetId_ (INV-167).
  const pred = extractRawFunction('Code.js', 'empRosterEmail_');
  assert.ok(/\.trim\(\)/.test(pred) && /EMP\.EMAIL/.test(pred),
    'empRosterEmail_ reads EMP.EMAIL and trims');

  // (b) DERIVED, not a hand list (INV-179): no raw inclusion guard may exist
  // anywhere in Code.js. This catches a NEW walk written in the old style,
  // which a hand-listed set never would.
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const raw = stripped.match(/if \(![^)\n]*\[EMP\.EMAIL\][^)\n]*\)\s*continue/g) || [];
  assert.deepStrictEqual(raw, [],
    'no roster walk may hand-roll the no-email skip — route it through empRosterEmail_');
  // C17-3 sibling (cycle 17): ALSO ban the POSITIVE bare-truthiness form
  // (`if (rows[i][EMP.EMAIL]) …`) — the saveTrainingAssignment shape, which
  // the negative-continue ban above cannot see. Comparison reads (=== email,
  // identification sites) deliberately do not match.
  const rawPos = stripped.match(/if \(\s*[a-zA-Z_$]+\[[a-zA-Z_$]+\]\[EMP\.EMAIL\]\s*\)/g) || [];
  assert.deepStrictEqual(rawPos, [],
    'no roster walk may bare-truthiness-test EMP.EMAIL — route it through empRosterEmail_');

  // (c) The two regressions this family exists for stay fixed by NAME, since
  // those are the walks where being wrong is expensive: the Metrics cohort
  // (cycle-12 F4 — a stale row un-hides the N=3 anonymized team line) and the
  // manager team table (cycle-15 F3 — a departed rep in the table and totals).
  ['getDashboardMetrics', 'getMyMetrics', 'getTeamMetrics', 'getCoveragePlan',
   'getMetricsAmbient', 'saveTrainingAssignment']   // C17-3 (cycle 17)
    .forEach((fn) => {
      assert.ok(/empRosterEmail_\(/.test(extractRawFunction('Code.js', fn)),
        fn + ' routes roster inclusion through empRosterEmail_');
    });
  // …and in the two cohort walks the skip must still precede the collection.
  ['getDashboardMetrics', 'getMyMetrics'].forEach((fn) => {
    const b = extractRawFunction('Code.js', fn);
    assert.ok(b.indexOf('empRosterEmail_') < b.indexOf('allNames.push'),
      fn + ' checks the email BEFORE collecting the name');
  });
});

// F5: a swallowed per-rep-Sheet read error was indistinguishable from "zero
// notes filed", so the Clock strip told reps to re-file work they had done.
test('F5: a failed note-count read is reported, never rendered as a confident zero', () => {
  const helper = extractRawFunction('Code.js', 'cnCountNotesResult_');
  assert.ok(/unavailable: true/.test(helper), 'the catch reports unavailable instead of a bare 0');
  assert.ok(/unenrolled/.test(helper),
    'an unenrolled rep (INV-35) is distinguished from a FAILED read — only the latter is an error');
  // A4 (cycle 13): this used to assert the `countCallNotesInRange_` wrapper
  // DELEGATED to the helper. That wrapper is gone — it had no production
  // callers, so keeping it preserved the 0-on-error shape under the obvious
  // name. There is now exactly ONE count path by construction, which is a
  // stronger guarantee than the delegation check it replaces; the A4 pin below
  // keeps the wrapper from coming back.
  // Every surface that turns the count into user-facing coverage must null the
  // percentage and flag the round.
  ['getDashboardMetrics', 'getMyMetrics', 'getMyMetricsRange', 'getTeamMetrics'].forEach((fn) => {
    const src = extractRawFunction('Code.js', fn);
    assert.ok(/cnCountNotesResult_\(/.test(src), fn + ' reads the outcome-carrying result');
    assert.ok(/unavailable/.test(src) && /noteCo(verage|untPartial|untUnavailable)/.test(src),
      fn + ' nulls/flags coverage when the read failed');
  });
  // NONE of the three result caches may pin a failed note read as fresh (L-3).
  // Operator #5 widened the guard: a THROWN transfer read is the same class of
  // partial (a reader-returned meta.error — tab absent — is a steady config
  // state and stays cacheable per the documented "trend simply absent" posture).
  assert.ok(/!trendFailed && !transferThrew && !noteRes\.unavailable/.test(extractRawFunction('Code.js', 'getMyMetricsRange')),
    'a failed note/trend/transfer read is a partial round — not cacheable');
  [['getMyMetrics', /useMetricsCache && !noteRes\.unavailable/],
   ['getDashboardMetrics', /useCache && !noteRes\.unavailable/]].forEach(([fn, re]) => {
    assert.ok(re.test(extractRawFunction('Code.js', fn)),
      fn + ' must not cache a degraded notes read for the full TTL');
  });
  // Client: the strip must render the reason, not a "File N missing" CTA.
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  const strip = clk.slice(clk.indexOf('function renderCoverageStrip_'));
  // Anchor on the CTA's MARKUP (ss-cov-cta), not its label text — the label
  // words also appear in the explanatory comment above the guard.
  assert.ok(strip.indexOf('data.noteCountUnavailable') >= 0 &&
            strip.indexOf('data.noteCountUnavailable') < strip.indexOf('ss-cov-cta'),
    'the unavailable branch returns BEFORE the "File N missing" CTA can render');
});

// ---------------------------------------------------------------------------
// Cycle-16 F1 / F5 — the SAME rule as F5 above, in the two surfaces it had
// never reached. The F5 pin enumerates four functions that consume
// cnCountNotesResult_; managerGetShiftStats counts INLINE (it needs flags,
// emails and the median too, not just a count), so it was invisible to that
// list and kept swallowing the per-rep read into totalNotes:0 — a CRIT-toned
// 0% coverage badge on the manager's end-of-shift performance table, drawn
// from a failed read. getTeamMetrics nulled its PER-REP coverage but computed
// the TEAM total unconditionally, so the rail said "partial" while the hint
// below it said "below 80%".
console.log('\ncycle 16 — F1 / F5 note-outcome fix pins');

test('F1: managerGetShiftStats carries the read outcome instead of reporting zeros', () => {
  const fn = extractRawFunction('Code.js', 'managerGetShiftStats');
  assert.ok(/notesUnavailable: false/.test(fn),
    'the per-rep stats object declares the outcome field');
  // The catch must SET it — a console.warn alone is what the bug was.
  const catchIdx = fn.indexOf('catch (e)');
  assert.ok(catchIdx > 0, 'the per-rep try/catch is still there');
  const catchBody = fn.slice(catchIdx, fn.indexOf('}', fn.indexOf('{', catchIdx)) + 1);
  assert.ok(/stats\.notesUnavailable = true/.test(catchBody),
    'the per-rep read failure must be RECORDED, not only logged:\n  ' + catchBody.trim());
  // Coverage is a ratio over a count we may not have.
  assert.ok(/notesUnavailable\s*\?\s*null\s*:\s*cnNoteCoverage_/.test(fn.replace(/\s+/g, ' ')),
    'noteCoverage is null when the notes read failed, never a percentage of an unknown');
  // Client: every column derived from that read renders the unavailable cell.
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(/function cnStatsUnavailCell_\(/.test(cn), 'the shared unavailable cell exists');
  const tbl = cn.slice(cn.indexOf('function cnMgrRenderStats_'));
  const body = tbl.slice(0, tbl.indexOf('\nfunction ', 10));
  // Anchor on the COLUMN-DEFINITION shape (`key: 'x', label:`). A bare
  // `key: 'x'` also matches the default-sort object in the same function, which
  // made this assert read the wrong line entirely (it bit on the first run).
  ['totalNotes', 'action', 'training', 'review', 'emails', 'median'].forEach((key) => {
    const at = body.indexOf("key: '" + key + "', label:");
    assert.ok(at > 0, "the '" + key + "' column definition is still there");
    const cell = body.slice(at, body.indexOf('\n', at));
    assert.ok(/notesUnavailable/.test(cell),
      "the '" + key + "' column renders 0 for a rep whose Sheet could not be read:\n  " + cell.trim());
  });
});

test('F5: the TEAM coverage total is null when any rep Sheet was unreadable', () => {
  const fn = extractRawFunction('Code.js', 'getTeamMetrics');
  assert.ok(/noteCountPartial\s*\?\s*null\s*:\s*cnNoteCoverage_/.test(fn.replace(/\s+/g, ' ')),
    'teamTotals.noteCoverage must not be computed from a partial note count');
  // The client's "below 80%" hint is gated on the value being non-null, so the
  // null is what actually suppresses the judgement — pin both halves.
  const m = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  assert.ok(/t\.noteCoverage != null && t\.noteCoverage < 80/.test(m),
    'the team-wide coverage hint only renders for a real (non-null) coverage figure');
});

// Cycle-16 F4 — the coverage planner's PTO overlay is best-effort by design,
// but silence was not: with ptoMap empty EVERY rep counts as working, so the
// grid renders green on a day half the team is off. A planner whose whole
// purpose is understaffing detection must not fail toward "fully staffed".
test('F4: a failed PTO overlay is surfaced, never rendered as full staffing', () => {
  const fn = extractRawFunction('Code.js', 'getCoveragePlan');
  assert.ok(/ptoUnavailable = true/.test(fn),
    'the PTO catch records the failure instead of swallowing it');
  assert.ok(/ptoUnavailable: ptoUnavailable/.test(fn),
    'the flag reaches the client on the response');
  const mgr = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  const render = mgr.slice(mgr.indexOf('function covRender_'));
  const body = render.slice(0, render.indexOf('\nfunction ', 10));
  assert.ok(/data\.ptoUnavailable/.test(body), 'covRender_ reads the flag');
  assert.ok(/role="alert"/.test(body),
    'the warning is announced, not just coloured (the errorStateHtml_ posture)');
  // The all-clear is the ONE conclusion a missing overlay makes unsafe.
  // Scope the search to the risk TERNARY (between `risks.length` and the
  // all-clear string) — a `lastIndexOf` over the whole body finds the banner's
  // own mention of the flag and passes even with the guard deleted, which is
  // exactly how this assert failed its first bite-check.
  const riskIdx = body.indexOf('risks.length');
  const clearIdx = body.indexOf('All business hours meet');
  assert.ok(riskIdx > 0 && clearIdx > riskIdx, 'the risk ternary and its all-clear branch are still there');
  assert.ok(body.slice(riskIdx, clearIdx).indexOf('data.ptoUnavailable') >= 0,
    'the green "all business hours meet the minimum" all-clear is gated on the PTO read having succeeded');
});

// ---------------------------------------------------------------------------
// Cycle-16 F9 — the PPD engine's weight filter FAILS CLOSED on catalog data it
// cannot read, and the operator is told which rows are wrong.
//
// `parseInt('')` is NaN and every comparison against NaN is false, so a blank /
// non-numeric / half-written capacity used to pass the filter for ANY patient
// weight — the engine read it as unlimited capacity, on a clinical
// recommendation whose output an agent acts on. The Offerings catalog is an
// operator-maintained sheet, so a not-yet-filled capacity cell is ordinary.
console.log('\ncycle 16 — F9 intake catalog fix pins');

// The five shapes reproduced against the exact branch during the audit. Driven
// through the REAL engine (not a re-implementation) so the pin cannot drift
// from the code it guards.
test('F9: an unreadable weight capacity EXCLUDES the product, never admits it', () => {
  const HEAVY = { '38': '400 lbs' };
  [['', 'blank'], ['   ', 'whitespace'], ['n/a', 'non-numeric'],
   ['300-', 'half-written range'], ['-450', 'range with no minimum']].forEach(([cap, why]) => {
    const cat = [['Std Captain', 'K0823', cap, 'C', 'pdf', 'img']];
    const r = intakeFilterRecommendations_(HEAVY, cat);
    assert.strictEqual(r.standard.length + r.complex.length, 0,
      'a ' + why + ' capacity (' + JSON.stringify(cap) + ') must not be treated as UNLIMITED — ' +
      'the engine recommended a chair to a 400 lb patient');
  });
});

test('F9: well-formed capacities are completely unchanged', () => {
  const mk = (cap) => [['Std Captain', 'K0823', cap, 'C', 'pdf', 'img']];
  const hits = (w, cap) => {
    const r = intakeFilterRecommendations_({ '38': String(w) }, mk(cap));
    return r.standard.length + r.complex.length;
  };
  assert.strictEqual(hits(400, '300'), 0, 'over a flat cap → excluded');
  assert.strictEqual(hits(400, '450'), 1, 'under a flat cap → recommended');
  assert.strictEqual(hits(400, '300-450'), 1, 'inside a range → recommended');
  assert.strictEqual(hits(250, '300-450'), 0, 'below a range minimum → excluded');
  assert.strictEqual(hits(250, '350'), 1, 'ordinary case → recommended');
  // A blank patient weight skips the filter entirely — documented behaviour
  // (the Q39a note: "blank weight → standard logic"), NOT changed by F9.
  const noWeight = intakeFilterRecommendations_({}, mk(''));
  assert.strictEqual(noWeight.standard.length, 1,
    'with no recorded patient weight the capacity filter does not run at all');
});

// The validator that keeps the fail-closed direction from being silent.
const intakeCatalogIssues_ = new Function(
  extractRawFunction('Code.js', 'intakeCatalogIssues_') + '; return intakeCatalogIssues_;')();

test('F9: the catalog validator names the rows the engine cannot recommend', () => {
  const rows = [
    ['ok',      'K0823', '350',     'C', 'pdf', 'img'],   // clean
    ['blank',   'K0824', '',        'S', 'pdf', 'img'],   // error: no capacity
    ['bad',     'K0825', 'n/a',     'S', 'pdf', 'img'],   // error: non-numeric
    ['halfrng', 'K0826', '300-',    'S', 'pdf', 'img'],   // error: unreadable range
    ['inv',     'K0827', '450-300', 'S', 'pdf', 'img'],   // error: inverted range
    ['seat',    'K0828', '350',     'x', 'pdf', 'img'],   // error: no s/c
    ['endash',  'K0829', '300–450', 'S', 'pdf', 'img'], // warn: non-ASCII dash
    ['noimg',   'K0830', '350',     'S', 'pdf', ''],      // warn: no image
    ['',        '',      '',        '',  '',    ''],      // trailing blank row — ignored
  ];
  const issues = intakeCatalogIssues_(rows);
  const errs = issues.filter((x) => x.severity === 'error');
  const warns = issues.filter((x) => x.severity === 'warn');
  const errRows = errs.map((x) => x.row).sort((a, b) => a - b);
  // Sheet rows: the A2:F read means index 0 is sheet row 2.
  assert.deepStrictEqual([...new Set(errRows)], [3, 4, 5, 6, 7],
    'every unrecommendable row is named by its SHEET row (A2:F ⇒ index 0 is row 2)');
  assert.ok(!issues.some((x) => x.hcpcs === 'K0823'), 'a clean row raises nothing');
  assert.ok(!issues.some((x) => x.row === 10), 'a trailing blank row is not an error');
  assert.ok(warns.some((x) => x.hcpcs === 'K0829' && /dash/.test(x.detail)),
    'an EN dash reads as a flat cap, not a range — worth a warning');
  assert.ok(warns.some((x) => x.hcpcs === 'K0830' && x.field === 'imageUrl'),
    'a missing device image is a warning (the agent has nothing to send the patient)');
  // A clean catalog must produce NOTHING, or the card can never reach green —
  // the "what does this read on a healthy system" rule.
  assert.deepStrictEqual(
    intakeCatalogIssues_([['ok', 'K0823', '350', 'C', 'pdf', 'img']]), [],
    'a well-formed catalog raises no issues at all');
});

test('F9: the catalog scan is OPT-IN and a failed read is distinguishable from clean', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const compute = extractRawFunction('Code.js', 'computeAutomationHealth_');
  assert.ok(/const scanCatalog = !!\(opts && opts\.scanCatalog\)/.test(compute),
    'defaults OFF — the 10-min-per-manager badge and the daily digest must not open the Intake store');
  assert.ok(/intakeCatalog: scanCatalog \? getIntakeCatalogHealth_\(\) : null/.test(compute),
    'null when unscanned, so the client can tell "not checked" from "clean"');
  const gate = extractRawFunction('Code.js', 'getAutomationHealth');
  assert.ok(/scanCatalog: scanQueues/.test(gate), 'only the panel opts in');
  // A failed READ must not render as a clean catalog (INV-129).
  const health = extractRawFunction('Code.js', 'getIntakeCatalogHealth_');
  assert.ok(/ok: true/.test(health) && /ok: false/.test(health),
    'the result carries the read OUTCOME, not just the issue lists');
  // Client: escaping + the three distinct states.
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const fn = cn.slice(cn.indexOf('function cnIntakeCatalogHtml_('));
  const body = fn.slice(0, fn.indexOf('\nfunction ', 10));
  assert.ok(/if \(!cat\.ok\)/.test(body), 'an unreadable catalog says so instead of reading as clean');
  assert.ok(/checkCircle/.test(body), 'a clean catalog reaches GREEN — a card that never can is worse than none');
  assert.ok(!/\+ *(cat\.error|x\.detail|x\.hcpcs)\b/.test(body.replace(/esc\([^)]*\)/g, '')),
    'every server-sourced string is esc()d before innerHTML');
});

// ---------------------------------------------------------------------------
// F9 / F7 — the access-gate coverage net.
//
// INV-02/31/136 are the project's most load-bearing invariants, and the ONLY
// thing keeping them honest was a hand-maintained list inside the editor-only
// omnibus (`test_managerGates_rejectNonManager`) — a list nobody is forced to
// update. Every prior cycle grew the gated surface and the omnibus caught up
// only by someone remembering. This enumerates the gated set from Code.js
// itself, so a NEW gated endpoint that no gate test touches fails CI.
//
// Trigger handlers are NOT in this set by construction: they gate via
// `assertManagerCaller_` (which THROWS), so they never contain the returned
// error string — their own tripwire (INV-44) covers them.
function gatedEndpointsFromSource_() {
  const out = { admin: [], manager: [] };
  const re = /^function ([A-Za-z0-9_]+)\s*\(/gm;
  let m;
  while ((m = re.exec(codeSrc)) !== null) {
    const start = codeSrc.indexOf('{', m.index + m[0].length - 1);
    let depth = 0, k = start;
    for (; k < codeSrc.length; k++) {
      const ch = codeSrc[k];
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) break;
    }
    const body = codeSrc.slice(start, k + 1);
    // Admin wins: an admin-gated endpoint returns the admin message only.
    if (body.indexOf("'Admin access required.'") >= 0) out.admin.push(m[1]);
    else if (body.indexOf("'Manager access required.'") >= 0) out.manager.push(m[1]);
  }
  return out;
}

test('F9: every gated endpoint is covered by a gate test (enumerated from source, not a hand list)', () => {
  const gated = gatedEndpointsFromSource_();
  assert.ok(gated.manager.length > 40 && gated.admin.length > 20,
    'sanity: the enumeration found the gated surface (' + gated.manager.length +
    ' manager / ' + gated.admin.length + ' admin) — a near-zero count means the scan broke, not that the gates vanished');

  // Concatenate every gate-flavoured editor test body. A dedicated test may
  // call the endpoint directly (no name string), so membership is checked
  // against the whole region rather than a parsed case list.
  const testsSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Tests.js'), 'utf8');
  const gateRe = /^function (test_[A-Za-z0-9_]*(?:[Gg]ate|[Nn]onManager|Rejected|Throws)[A-Za-z0-9_]*)\s*\(/gm;
  let g, blob = '';
  while ((g = gateRe.exec(testsSrc)) !== null) {
    const start = testsSrc.indexOf('{', g.index + g[0].length - 1);
    let depth = 0, k = start;
    for (; k < testsSrc.length; k++) {
      const ch = testsSrc[k];
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) break;
    }
    blob += testsSrc.slice(start, k + 1) + '\n';
  }
  assert.ok(blob.length > 5000, 'sanity: the gate-test region was located');

  // Private helpers whose gate is defense-in-depth: not reachable via
  // google.script.run (trailing underscore), and exercised through public
  // wrappers that ARE in the omnibus. Keep this list tiny and reasoned.
  const ALLOW = {
    // Called only by managerGetTrainingQueue / managerGetReviewCandidates,
    // both of which are omnibus cases.
    managerAggregateFlagged_: 'private helper; public wrappers are covered',
  };
  const uncovered = gated.admin.concat(gated.manager)
    .filter((n) => !ALLOW[n] && blob.indexOf(n) < 0);
  assert.deepStrictEqual(uncovered, [],
    'gated endpoint(s) with no gate test — add them to test_managerGates_rejectNonManager ' +
    '(or a dedicated *_nonManagerRejected test): ' + uncovered.join(', '));
});

test('F7: INV-136 documents exactly the admin-gated set that Code.js enforces', () => {
  const admin = gatedEndpointsFromSource_().admin;
  const claude = fs.readFileSync(path.join(__dirname, '../../CLAUDE.md'), 'utf8');
  const start = claude.indexOf('INV-136 |');
  assert.ok(start > 0, 'INV-136 is present in the invariant library');
  const para = claude.slice(start, claude.indexOf('| Subsystem:', start));
  // The prose count drifted for two cycles (said 30 while the code enforced
  // 35) — the operator reads it to decide whether to narrow ADMIN_EMAILS.
  const stated = /\*\*(\d+) Admin-exclusive endpoints\*\*/.exec(para);
  assert.ok(stated, 'INV-136 states an "N Admin-exclusive endpoints" count');
  assert.strictEqual(Number(stated[1]), admin.length,
    'INV-136 says ' + stated[1] + ' admin-exclusive endpoints; Code.js enforces ' + admin.length);
  const unnamed = admin.filter((n) => para.indexOf('`' + n + '`') < 0);
  assert.deepStrictEqual(unnamed, [],
    'admin-gated endpoint(s) missing from INV-136\'s list: ' + unnamed.join(', '));
});

// ---------------------------------------------------------------------------
// Cycle-12 Batch C pins.
console.log('\ncycle 12 — batch C fix pins (F14 / F16 / F18 / F11 / F3-sibling)');

// F14: the enrollment test was hand-written 21 times; 11 copies tested RAW
// truthiness while 10 trimmed, so a whitespace-only column L made a rep
// "enrolled" for every cross-rep walk (which then threw into its per-rep catch
// and SILENTLY dropped them from the aggregate) while their own panel showed
// the enrollment splash. This is the INV-142 / INV-154 boundary pattern: one
// predicate, plus a global ban on reading the column any other way.
test('F14: every column-L read goes through cnEnrolledSheetId_ (no raw truthiness left)', () => {
  const pred = extractRawFunction('Code.js', 'cnEnrolledSheetId_');
  assert.ok(/String\(row\[EMP\.CALL_NOTES_SHEET_ID\] \|\| ''\)\.trim\(\)/.test(pred),
    'the predicate trims and null-guards — a whitespace-only cell reads as NOT enrolled');

  // Global scan: strip comments, then every remaining EMP.CALL_NOTES_SHEET_ID
  // occurrence must be either the predicate itself or the provisioning WRITE.
  const stripped = codeSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const offenders = [];
  stripped.split('\n').forEach((line, i) => {
    if (line.indexOf('EMP.CALL_NOTES_SHEET_ID') < 0) return;
    // The predicate's own body.
    if (/String\(row\[EMP\.CALL_NOTES_SHEET_ID\]/.test(line)) return;
    // provisionCallNotesSheet's setValue target (a WRITE, not an enrollment test).
    if (/getRange\([^)]*EMP\.CALL_NOTES_SHEET_ID \+ 1\)/.test(line)) return;
    // empValidateNewEmployee_'s row-builder slot (a WRITE — `=` assignment,
    // not `==` comparison; the enum-derived index is the QUEUE_EXT lesson).
    if (/row\[EMP\.CALL_NOTES_SHEET_ID\] =(?!=)/.test(line)) return;
    offenders.push((i + 1) + ': ' + line.trim());
  });
  assert.deepStrictEqual(offenders, [],
    'read column L via cnEnrolledSheetId_(row) — a raw read re-opens the ' +
    'whitespace-only split where trimmed and untrimmed sites disagree:\n  ' +
    offenders.join('\n  '));

  // The predicate must actually be used by the cross-rep walks that had the bug.
  ['getCallNotesTagTaxonomy', 'getCallNotesTagTrends', 'applyTagTransformAcrossReps_',
   'managerSearchCallNotes', 'managerGetShiftStats', 'managerGetUnresolvedActionCount',
   'getStorageHealth', 'exportCallNotesRange', 'managerAggregateFlagged_',
   'managerAggregateUrgent_', 'sendCallNotesEodDigest', 'getTeamMetrics'].forEach((fn) => {
    assert.ok(/cnEnrolledSheetId_\(/.test(extractRawFunction('Code.js', fn)),
      fn + ' must resolve enrollment through the predicate');
  });
});

// F3-sibling: the CN cold-archive twin of the bound shipped for the Timesheet.
test('F3-sibling: archiveOldCallNotes bounds the whole run, not just one rep', () => {
  const src = extractRawFunction('Code.js', 'archiveOldCallNotes');
  assert.ok(/CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN/.test(src), 'a per-run budget exists');
  // A4/A9 (cycle 13): matched `if (budget <= 0) break;` literally until A9 gave
  // the guard a body (it now records whether an ENROLLED rep was left unvisited,
  // so a clean final run stops stamping hitPerRunCap). The invariant being
  // guarded is unchanged: the REP LOOP — not just the per-rep mover — stops when
  // the shared budget is spent.
  assert.ok(/if \(budget <= 0\) \{?[\s\S]{0,260}?break;/.test(src),
    'the REP LOOP stops when the budget is spent — a per-rep cap would not bound ' +
    'a walk that calls the mover once per rep inside one execution + one lock');
  assert.ok(/budget -= moved/.test(src), 'the budget is shared across reps, not reset per rep');
  assert.ok(/hitPerRunCap/.test(src),
    'a capped run is visible in the audit row — a draining backlog must not read as a normal small run');
  const m = codeSrc.match(/CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN = (\d+)/);
  assert.ok(m && parseInt(m[1], 10) > 0, 'the cap constant is a positive number');
});

// F11: the two append-only SubformData arrays were unbounded in LENGTH (L-1
// bounded the email-detail objects' SIZE, one surface over). A long coaching
// thread or a repeatedly-emailed note walks the cell to its ~50k limit, and
// past that EVERY later write on the note throws — including the flag/pin ops.
test('F11: the two growing SubformData arrays are bounded (count + serialized size)', () => {
  const helper = extractRawFunction('Code.js', 'cnAppendBounded_');
  assert.ok(/arr\.length >= maxEntries/.test(helper), 'entry-count cap');
  assert.ok(/JSON\.stringify\(subformData\)\.length/.test(helper) &&
            /CN_SUBFORM_MAX_CHARS/.test(helper),
    'serialized-size check against the cell limit (a count cap alone cannot bound bytes)');
  assert.ok(/arr\.pop\(\)/.test(helper),
    'a rejected entry is REMOVED again — the caller must not half-mutate the record');
  const cap = codeSrc.match(/CN_SUBFORM_MAX_CHARS = (\d+)/);
  assert.ok(cap && parseInt(cap[1], 10) < 50000,
    'the size cap sits UNDER the 50k Sheets cell limit');

  // All FOUR appends route through it: 3 feedback[] + 1 externalEmails[].
  ['setCallNoteTrainingReply', 'setCallNoteManagerComment', 'appendCallNoteFeedback']
    .forEach((fn) => {
      const src = extractRawFunction('Code.js', fn);
      assert.ok(/cnAppendBounded_\(/.test(src), fn + ' appends through the bounded helper');
      assert.ok(!/subformData\.feedback\.push\(/.test(src), fn + ' has no raw push left');
      assert.ok(/if \(fbErr\) return \{ success: false, error: fbErr \}/.test(src),
        fn + ' surfaces the refusal (the note is left untouched, so it stays writable)');
    });
  const ext = extractRawFunction('Code.js', 'sendExternalEmail');
  assert.ok(/cnAppendBounded_\(/.test(ext) && !/externalEmails\.push\(/.test(ext),
    'the externalEmails[] stamp is bounded too');
  // That stamp runs AFTER a successful send (INV-42) — a rejection must NOT be
  // reported as a send failure, and must not write the oversized cell.
  const stampRegion = ext.slice(ext.indexOf('cnAppendBounded_'));
  assert.ok(/console\.warn/.test(stampRegion.slice(0, 500)),
    'a rejected stamp logs (INV-42: never fail an already-sent email)');
  assert.ok(/\} else \{[\s\S]{0,200}setValue\(JSON\.stringify\(subformData\)\)/.test(stampRegion),
    'the cell is written ONLY when the append was accepted');

  // The non-growing writes (flag / resolve / pin) must stay unguarded so an
  // already-oversized note can still be un-flagged or edited back down.
  ['setCallNoteFlag', 'setCallNotePinned'].forEach((fn) => {
    assert.ok(!/cnAppendBounded_|CN_SUBFORM_MAX_CHARS/.test(extractRawFunction('Code.js', fn)),
      fn + ' must NOT be size-gated — it is the recovery path for an oversized note');
  });
});

// F16: the last silently-blanking failure handler. E7 (cycle 10) fixed only the
// success-with-{error} path, so a transport failure still wiped the panel that
// configures two IRREVERSIBLE PHI purges — indistinguishable from "not present".
test('F16: the retention panel reports a failed load instead of blanking', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const fn = cn.slice(cn.indexOf('function cnLoadRetentionPanel_'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  const fh = body.slice(body.indexOf('.withFailureHandler'));
  assert.ok(/errorStateHtml_\(/.test(fh),
    'the failure handler renders the shared error state');
  assert.ok(!/innerHTML = ''/.test(fh), 'no silent blank left');
  assert.ok(/currentView !== 'callNotesAdmin'/.test(fh),
    'still guards against a late callback writing into another view (the CN loader rule)');
});

// F18: four payload-capped readers reported no truncation — the F2 class.
test('F18: payload-capped readers report the pre-slice total', () => {
  const dr = extractRawFunction('Code.js', 'getDeptRequests');
  assert.ok(/DR_LIST_CAP/.test(dr), 'the magic 100 is a named cap');
  // Match the KEY form exactly — a bare substring test passes on a typo'd
  // `mineTotalX`, which is precisely the drift this pin exists to catch.
  ['mineTotal', 'incomingTotal', 'allOpenTotal'].forEach((k) => {
    assert.ok(new RegExp('\\b' + k + '\\b\\s*[:=]').test(dr), 'getDeptRequests returns ' + k);
  });
  assert.ok(/listCap: DR_LIST_CAP/.test(dr), 'the cap itself rides back for the client');
  const kb = extractRawFunction('Code.js', 'kbGetReviewDue');
  assert.ok(/KB_REVIEW_DUE_CAP/.test(kb) && /total: items\.length/.test(kb),
    'kbGetReviewDue returns the pre-slice total');
  // Cycle-13 follow-on: this used to assert getSpanishInboxStats DECLARED its
  // pendingList cap. That list had no client reader at all (both surfaces use
  // the uncapped, live-read getSpanishInboxPending), so the honest fix for a
  // capped list nobody renders was to stop shipping it — which also keeps
  // PHI-adjacent subjects out of the 5-minute CacheService entry. F18's rule is
  // unchanged for the readers that DO render a capped list; this one is simply
  // no longer such a reader.
  const sp = extractRawFunction('Code.js', 'getSpanishInboxStats');
  // Strip comments first — the removal note names the field it removed.
  const spCode = sp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  assert.ok(!/pendingList\s*[:=]/.test(spCode),
    'the reader-less pendingList must not come back — getSpanishInboxPending is the live list');
  assert.ok(/pending: pending\.length/.test(sp), 'the pending COUNT is still returned and complete');

  // Client: "showing N of M", and NOTHING when the list is complete or when an
  // older server omits the total (so a not-yet-redeployed server is safe).
  const drc = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_deptrequests.html'), 'utf8');
  const noteFn = drc.slice(drc.indexOf('function drCapNoteHtml_'));
  assert.ok(/!isFinite\(t\) \|\| t <= shown\) return ''/.test(noteFn),
    'the suffix is omitted when the list is complete or the total is absent');
  assert.strictEqual((drc.match(/drCapNoteHtml_\(/g) || []).length, 4,
    'all three lists (mine / incoming / allOpen) call it, plus the definition');
  const kbc = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  assert.ok(/rdCapped \? rdTotal : rd\.length/.test(kbc),
    'the Review-due pill shows the TRUE total, not the payload length');
});

// ---------------------------------------------------------------------------
// Cycle-12 batches D+E pins. The visual items are pinned at SOURCE level (the
// static-render harness in test/visual/ is manual and not in CI), each anchored
// on the specific mechanism the finding was about — not merely "a rule exists".
console.log('\ncycle 12 — batch D/E fix pins');

test('F12: deletePunch derives the duplicate survivor from the loaded rows (no 2nd sheet read)', () => {
  const src = extractRawFunction('Code.js', 'deletePunch');
  // Strip comments first — the fix's own explanatory comment names the call it
  // removed, and counting that would make the pin permanently red.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const reads = (code.match(/getDataRange\(\)\.getValues\(\)/g) || []).length;
  assert.strictEqual(reads, 1,
    'exactly ONE whole-Timesheet read — the survivor re-scan used a second one INSIDE the lock');
  // The scan must exclude the row being deleted, and run BEFORE deleteRow so the
  // indices need no adjustment.
  assert.ok(/if \(k === i\) continue;/.test(src), 'the row about to be deleted is excluded');
  assert.ok(src.indexOf('survivorExists = true') < src.indexOf('sheet.deleteRow'),
    'the survivor is computed BEFORE the delete (pre-delete rows + index skip)');
});

test('V-5/V-6/V-7: the sidebar + nav use shortLabel and never truncate without a title', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  // V-6: callNotes carries a shortLabel (it was the one mobile label that wrapped).
  const cnEntry = core.slice(core.indexOf('  callNotes: {'), core.indexOf('  metrics: {'));
  assert.ok(/shortLabel:/.test(cnEntry), 'callNotes declares a shortLabel');
  // V-7: the sidebar link renders shortLabel + a full-label title.
  assert.ok(/class="sb-lbl">\$\{esc\(t\.shortLabel \|\| t\.label\)\}/.test(core),
    'the sidebar label uses shortLabel (it CSS-ellipsised the full label at the 168px default)');
  assert.ok(/<button class="sb-link" data-tool="\$\{toolKey\}" title="\$\{esc\(t\.label\)\}"/.test(core),
    'the full label survives as a title');
  // V-5: the sub-label uses shortLabel too — the full one wrapped to 2 lines and
  // pushed every nav item down 11px.
  assert.ok(/lbl\.textContent = tool\.shortLabel \|\| tool\.label/.test(core),
    'the sidebar sub-label uses shortLabel (a 2-line wrap moved the whole nav)');
  // V-7: the two user fields that ellipsis at the default width carry titles.
  assert.ok(/class="sb-user-name" title=/.test(core) && /class="sb-user-id" title=/.test(core),
    'name + employee id carry titles — both truncate at the DEFAULT sidebar width');
});

test('V-4: shift-strip durations never break mid-value', () => {
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/\.ss-hours \.ss-val \{ white-space: nowrap; \}/.test(clk),
    'each value+unit is a nowrap span (the cycle-11 .tz-chip `.seg` rule on its sibling)');
  assert.ok(/class="ss-hours"><span class="ss-val">/.test(clk) &&
            /class="ss-sub ss-val">/.test(clk),
    'BOTH readouts (worked + lunch) are wrapped — one span alone leaves the other breaking');
});

test('V-8: the shared modal primary uses the app accent, not an inverted --ink', () => {
  const st = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  const rule = st.slice(st.indexOf('  .btn-modal-ok {'));
  const body = rule.slice(0, rule.indexOf('}'));
  assert.ok(/background: var\(--accent\)/.test(body),
    'the app has ONE primary vocabulary (--accent); this was the only inverted button');
  assert.ok(!/background: var\(--ink\)/.test(body),
    '--ink on --ink renders near-black in light mode and near-WHITE in dark, ' +
    'out-competing the real primary');
  // The danger variant must still win (it is .ui-dialog-ok.is-danger, 0,2,0).
  assert.ok(/\.ui-dialog-ok\.is-danger \{[^}]*background: var\(--destructive\)/.test(st),
    'destructive confirms stay red');
});

test('V-10: a zero-hour sparkline bar is visible, not background-coloured', () => {
  const st = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  const m = /\.emp-spark \.bar\.zero\s*\{([^}]*)\}/.exec(st);
  assert.ok(m, '.emp-spark .bar.zero rule found');
  assert.ok(!/var\(--paper-2\)/.test(m[1]),
    'a zero day painted in a SURFACE colour is invisible in both themes — ' +
    '"didn\'t work" then looks identical to "no data"');
  assert.ok(/var\(--muted-3\)/.test(m[1]),
    'uses the decoration-only tone (per the token contract) for a visible baseline');
  assert.ok(/min-height: 3px/.test(m[1]), 'tall enough to read as a deliberate floor');
});

test('V-12: the two CN chip rows are different affordances', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const quick = /\.cn-quick-chip \{([^}]*)\}/.exec(cn);
  const filter = /\.cn-filter-chip \{([^}]*)\}/.exec(cn);
  assert.ok(quick && filter, 'both chip rules found');
  // The FILTER row is the toggle pill (aria-pressed state); the JUMP row must
  // not look like one — no pill outline, and a link tone.
  assert.ok(/border-radius: 999px/.test(filter[1]), 'the filter row stays a pill');
  assert.ok(!/border-radius: 999px/.test(quick[1]),
    'the navigating row must NOT be a pill — the two rows were the same shape, ' +
    'same colours and same count vocabulary ~400px apart, doing different things');
  assert.ok(/border: 0/.test(quick[1]) && /var\(--info-deep\)/.test(quick[1]),
    'link treatment (no outline, info tone)');
  assert.ok(/cn-quick-chip:hover \{[^}]*text-decoration: underline/.test(cn),
    'underline on hover — the standard "this navigates" signal');
  assert.ok(/cn-qc-arrow/.test(cn), 'each chip carries a direction glyph');
  assert.ok(/Open in History/.test(cn),
    'the row label names the destination instead of a bare "Jump to history" kicker');
});

test('V-11: the Coaching per-rep table uses the shared component', () => {
  const co = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_coaching.html'), 'utf8');
  assert.ok(/mtRenderTable_\(\{/.test(co),
    'CLAUDE.md: "New manager tables should reuse it rather than hand-rolling <table> markup"');
  assert.ok(!/<table class="tr-table coach-rep-table"/.test(co),
    'the hand-rolled markup is gone (no header treatment / hover / sticky header)');
  assert.ok(/rowClass: function \(r\) \{ return r\.overdue/.test(co),
    'the overdue tone survives via the component\'s rowClass hook');
  // The KPI strip is the visual twin of .telemetry — same alignment.
  assert.ok(/\.coach-kpi \{[^}]*text-align:left/.test(co),
    'the KPI strip is left-aligned like its .telemetry twin (it was centred)');
});

test('V-9: the Reference panels cap on the ITEMS so a short landing hugs content', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const wrap = /\.kb-wrap \{([^}]*)\}/.exec(kb);
  assert.ok(wrap, '.kb-wrap rule found');
  assert.ok(!/height: calc\(100vh/.test(wrap[1]),
    'a FIXED height stretched both panels on the landing (~535px of empty card)');
  assert.ok(/align-items: start/.test(wrap[1]), 'the shorter column does not stretch');
  // Load-bearing: the cap MUST be on the items, or the row overflows the
  // container and the whole PAGE scrolls instead of the reader panel.
  assert.ok(/\.kb-wrap > \* \{[^}]*max-height: calc\(100vh - 150px\)/.test(kb),
    'the viewport cap sits on the grid ITEMS (max-height on a grid CONTAINER does ' +
    'not constrain its row — measured: the article grew the page to 13.7k px)');
});

test('V-14: the visual fixture\'s coverage numbers satisfy the server formula', () => {
  const mock = fs.readFileSync(path.join(__dirname, '../visual/mock.js'), 'utf8');
  // cnNoteCoverage_(noteCount, totalAnswered) = round(n/a*100); the Clock strip
  // derives missing = answered - noteCount. Both must hold in the fixture, or
  // the harness renders data the server cannot produce (its README's first rule).
  const single = /getMyMetrics: \{[^}]*noteCount: (\d+), noteCoverage: (\d+), missingCount: (\d+)/.exec(mock);
  assert.ok(single, 'getMyMetrics fixture found');
  const [, n, cov, missing] = single.map(Number);
  const answered = Number(/totalAnswered: (\d+)/.exec(mock)[1]);
  assert.strictEqual(Math.round((n / answered) * 100), cov,
    'noteCoverage must equal round(noteCount / totalAnswered * 100)');
  assert.strictEqual(answered - n, missing, 'missingCount must equal answered - noteCount');
  const rangeCount = Number(/getMyMetricsRange: \{[\s\S]{0,400}?noteCount: (\d+)/.exec(mock)[1]);
  const rangeCov = Number(/getMyMetricsRange: \{[\s\S]{0,400}?noteCoverage: (\d+)/.exec(mock)[1]);
  const rangeAns = Number(/getMyMetricsRange: \{[\s\S]{0,400}?totalAnswered: (\d+)/.exec(mock)[1]);
  assert.strictEqual(Math.round((rangeCount / rangeAns) * 100), rangeCov,
    'the range fixture must satisfy the same formula (it reused the single-day cdr)');
});

// ---------------------------------------------------------------------------
// Cycle-13 pins.
console.log('\ncycle 13 — A1 / A2 / A3 / A11 / A12 fix pins');

// A3: timeToMins_ returned NaN on an unparseable cell, and NaN's comparisons
// are ALL false — so getPunctualityReport scored the day ON TIME (it fell
// through `lateMin > grace` into the else) and calcHours_ poisoned the running
// total. Behavioural: drive the real extracted functions.
test('A3: timeToMins_ returns null (never NaN) for an unparseable time', () => {
  const b = buildSandbox([]);
  vm.runInContext(extractRawFunction('Code.js', 'timeToMins_'), b, { filename: 'Code.js#timeToMins_' });
  vm.runInContext(extractRawFunction('Code.js', 'calcHours_'), b, { filename: 'Code.js#calcHours_' });
  const t = b.timeToMins_, c = b.calcHours_;
  assert.strictEqual(t('09:30:00'), 570, 'a valid time still parses');
  assert.strictEqual(t('9:05'), 545, 'a bare H:mm still parses');
  // NOTE both rejection paths must be covered: no-colon (length < 2) AND
  // has-a-colon-but-not-numeric (the isNaN guard). A list of only the former
  // passes even with the isNaN guard deleted — bite-checked.
  ['', '9am', 'abc', null, undefined, 'Sat Dec 30 1899',
   'ab:cd', ':', '::', 'x:30', '09:mm'].forEach((bad) => {
    assert.strictEqual(t(bad), null, 'unparseable → null, not NaN: ' + String(bad));
  });
  // The NaN sentinel's actual damage, pinned: a null must not be scored as
  // "on time" (0 minutes late) by a `> grace` test.
  assert.strictEqual(t('9am') > 5, false, 'null is not > grace…');
  assert.strictEqual(t('9am') === null, true, '…and the caller can SEE it, unlike NaN');

  assert.strictEqual(c('09:00:00', '17:00:00', null, null), 8, 'valid pair unchanged');
  assert.strictEqual(c('22:00:00', '06:00:00', null, null), 8, 'C3 overnight wrap preserved');
  assert.strictEqual(c('09:00:00', '17:00:00', '12:00:00', '13:00:00'), 7, 'lunch deduction unchanged');
  assert.strictEqual(c('bogus', '17:00:00', null, null), null, 'corrupt clock pair → null, not NaN');
  assert.strictEqual(c('09:00:00', 'bogus', null, null), null, 'corrupt clock-out → null');
  // A corrupt LUNCH pair must not void an otherwise-good day.
  assert.strictEqual(c('09:00:00', '17:00:00', 'bogus', '13:00:00'), 8,
    'a corrupt lunch pair drops the deduction, it does not null the day');
});

test('A3: the calcHours_ callers route null to their incomplete-day branch', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  assert.ok(/if \(hoursWorked === null\) \{ isIncomplete = true; incompleteCount\+\+; \}\s*\n\s*else \{ totalHours \+= hoursWorked; daysWorked\+\+; \}/.test(src),
    'buildTimesheetForEmployee_ must not add a null/NaN into totalHours');
  assert.ok(/const h = calcHours_[\s\S]{0,120}?if \(h !== null\) sparkHoursMap\[key\] = h;/.test(src),
    'the live-status sparkline drops an unparseable day rather than plotting it');
  assert.ok(/const h = calcHours_[\s\S]{0,120}?if \(h !== null\) hoursByDate\[dateStr\] = h;/.test(src),
    'the calendar drops an unparseable day rather than badging NaN hours');
  assert.ok(/if \(mins === null\) continue;/.test(src),
    'getPunctualityReport skips an unparseable punch instead of scoring it on time');
  // The coverage planner does ARITHMETIC on the result — `x + null` coerces to
  // x, which would silently place a shift at midnight. It must guard explicitly.
  assert.ok(/const absStart = \(convMins === null\) \? null : dayDelta \* 1440 \+ convMins;/.test(src),
    'getCoveragePlan must not let a null coerce to 0 in absStart');
});

// A12: a LOAD FAILURE must render errorStateHtml_ (warn card + role=alert), not
// the designed empty-state class — batch J's decision, previously applied only
// in CN + Clock. Scan the three partials that violated it.
// A1: the six click-only controls are <button>s now. A bare span/div with an
// inline onclick is unreachable by keyboard and has no role for assistive tech.
// Cycle-13 batch 5: GENERALIZED from a hand-listed five files to every scanned
// partial, derived from PARSE_GUARD_PARTIALS (which itself auto-tracks
// index.html's include() calls). A hand-copied file list is the exact class
// cycle-11's M-4 retired — a new tool's partial could otherwise ship outside
// the net with CI green.
const A11Y_SCAN_PARTIALS = PARSE_GUARD_PARTIALS.concat(['modals.html']);
// NOTE: declared HERE rather than beside A1 below because A12 (immediately
// following) is now the FIRST consumer — a `const` used before its
// declaration is a TDZ error, not a hoist.

// Cycle-16 F10: GENERALIZED from three hand-listed files to the RULE, the same
// promotion A1/A11 got in cycle-13 batch 5 and A2 got earlier this cycle. The
// old version scanned `metrics` + `training` + `empdocs` with a hand-copied
// list of THEIR empty-state classes, so 28 violations sat behind it across SIX
// other partials with CI green — including `train/script_coaching.html`, which
// uses `.tr-empty`, a class the tripwire already knew, in a file it did not
// scan. Derive both the FILE set and the CLASS set; enumerate neither.
//
// The class set is derived from the markup itself: any class whose name ends in
// `-empty` or is `no-data` is an empty-state container by this codebase's own
// naming convention (kb-empty, kbd-empty, dr-empty, dash-empty, tr-empty,
// m-empty, cn-audit-hist-empty, cn-stack-empty, …). That means a NEW tool
// inventing `foo-empty` is covered the day it ships.
test('A12: load failures never render into an empty-state container', () => {
  const EMPTY_CLASS = /class="([a-z0-9_ -]*(?:-empty|no-data)[a-z0-9_ -]*)"/g;
  // A line that MENTIONS a failure. Kept broad on purpose — a false positive
  // here costs one `errorStateHtml_` call; a false negative is the 28.
  const FAILURE_LINE = /\.error|err\.message|err && err\.message|e && e\.message|Failed to load|Could not load|errorMsg/;
  const violations = [];
  let scanned = 0;
  A11Y_SCAN_PARTIALS.forEach((rel) => {
    const p = path.join(__dirname, '../../web-app', rel);
    if (!fs.existsSync(p)) return;
    scanned++;
    const src = fs.readFileSync(p, 'utf8');
    // C17 batch-3: STATEMENT-scoped, not line-scoped — a failure handler that
    // assembles its empty-state HTML across concatenation lines used to exit
    // the net entirely (marker and class had to share ONE source line; the 28
    // F10 fixes were single-line, so the gap was latent, not empty). The
    // window extends while the statement visibly continues (a line not ending
    // in ; { or }), capped at 8 lines.
    const lines = src.split('\n');
    const seenAt = new Set();
    lines.forEach((line, i) => {
      if (!FAILURE_LINE.test(line)) return;
      let win = line, j = i;
      while (j + 1 < lines.length && (j - i) < 8 && !/[;{}]\s*$/.test(lines[j].trim())) { j++; win += '\n' + lines[j]; }
      if (win.indexOf('errorStateHtml_') >= 0) return;   // already correct
      EMPTY_CLASS.lastIndex = 0;
      let m;
      while ((m = EMPTY_CLASS.exec(win))) {
        const key = rel + ':' + (i + 1) + ':' + m[1];
        if (seenAt.has(key)) continue;
        seenAt.add(key);
        violations.push(rel + ':' + (i + 1) + '  [.' + m[1] + ']  ' + line.trim().slice(0, 110));
      }
    });
  });
  assert.ok(scanned >= 9, 'the scan covers the tool partials (got ' + scanned + ')');
  assert.deepStrictEqual(violations, [],
    'these render a LOAD FAILURE into an empty-state container, so a failed fetch ' +
    'reads as "there is nothing here" — use errorStateHtml_ (and DROP the outer ' +
    'esc(), which double-escapes since the helper escapes internally):\n  ' +
    violations.join('\n  '));
});

// The companion half: errorStateHtml_ escapes internally (INV-175), so wrapping
// its argument in esc() renders `&amp;lt;` to the user. Cheap to get wrong when
// converting a call site FROM the escaped empty-state form — which is exactly
// what the F10 sweep did 28 times.
test('A12: no call site double-escapes errorStateHtml_', () => {
  const bad = [];
  A11Y_SCAN_PARTIALS.concat(['script_core.html']).forEach((rel) => {
    const p = path.join(__dirname, '../../web-app', rel);
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (/errorStateHtml_\(\s*esc\(/.test(line)) bad.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 100));
    });
  });
  assert.deepStrictEqual(bad, [],
    'errorStateHtml_ escapes its own message — an outer esc() double-escapes:\n  ' + bad.join('\n  '));
});

// ── Cycle-16 Batch 3 fix pins (F6 / F7 / F8) ────────────────────────────────

// F6: uiPrompt is the ONE dialog in the app that validates, and its input had
// no accessible name and its error slot no live region — so a rejected value
// was announced as nothing at all and the dialog read as simply refusing to
// close. uiConfirm needs neither (no field, no validation), which is why this
// pin is uiPrompt-only rather than a rule over both.
test('F6: the uiPrompt input is named and its validator error is announced', () => {
  const fn = extractRawFunction('script_core.html', 'uiPrompt');
  assert.ok(/aria-labelledby="' \+ dlgTitleId/.test(fn),
    'the input is NAMED by the dialog title (a placeholder is not a name)');
  assert.ok(/aria-describedby="' \+ describedBy/.test(fn),
    'the input is described by the message + the error slot');
  assert.ok(/class="ui-dialog-err" id='[^']*\+ dlgErrId \+ '" role="alert"/.test(fn)
    || /ui-dialog-err[\s\S]{0,120}?role="alert"[\s\S]{0,40}?display:none/.test(fn),
    'the inline error slot is a live region, so a rejection is spoken');
  // The describedBy must REACH the error id even when opts.message is absent —
  // the message half is conditional, the error half never is.
  assert.ok(/const describedBy = \(opts\.message \? dlgMsgId \+ ' ' : ''\) \+ dlgErrId/.test(fn),
    'the error id is always in aria-describedby; only the message half is conditional');
});

// F7: the client found the unmapped-queue bucket by comparing against a bare
// 'Ungrouped' literal. That hint is the ONLY signal an operator gets that a
// queue is unmapped (INV-181) — a server-side rename would silently stop it
// rendering while the row itself still appeared, i.e. the gap would look
// closed. Cycle-15 F4 pinned this very constant in the visual FIXTURE while
// the shipping client kept the literal.
test('F7: the client Ungrouped sentinel is named and mirrors the server', () => {
  const client = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  const m = /var M_QUEUE_UNGROUPED = '([^']+)'/.exec(client);
  assert.ok(m, 'the client declares a named sentinel');
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const server = /(?:var|const) CDR_QUEUE_UNGROUPED = '([^']+)'/.exec(code);
  assert.ok(server, 'the server declares CDR_QUEUE_UNGROUPED');
  assert.strictEqual(m[1], server[1],
    'client M_QUEUE_UNGROUPED must equal server CDR_QUEUE_UNGROUPED');
  // And the render must USE it — a named constant beside a surviving literal
  // is the same drift with extra steps.
  const render = extractRawFunction('metrics/script_metrics.html', 'mRenderTeamMetrics_');
  assert.ok(/=== M_QUEUE_UNGROUPED/.test(render), 'the group lookup compares against the constant');
  assert.ok(!/'Ungrouped'/.test(render), 'no bare Ungrouped literal survives in the render');
});

// F8: this function read DR.STATUS raw on ONE line and normalized on every
// other, so a whitespace-padded cell split the two — the INV-167/INV-183
// whitespace class on a third column. Same fix shape: normalize ONCE, feed
// every consumer the normalized value.
test('F8: getDeptRequests normalizes DR.STATUS once and never re-reads it raw', () => {
  // Strip comments FIRST. This function's fix comment quotes the raw read it
  // removed, so a naive scan trips on its own rationale — the same trap the
  // CDR health-card pin documents. (Bite-checked: it failed 3 !== 1 until the
  // strip was added, and still fails 2 !== 1 if the raw comparison returns.)
  const fn = extractRawFunction('Code.js', 'getDeptRequests')
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(/const status = String\(r\[DR\.STATUS\] \|\| 'open'\)\.trim\(\)\.toLowerCase\(\)/.test(fn),
    'the status is normalized once into a local');
  assert.ok(/status: status,/.test(fn), 'the item ships the NORMALIZED status');
  // The raw comparison this fix removed must not come back in any form.
  const raw = fn.match(/r\[DR\.STATUS\]/g) || [];
  assert.strictEqual(raw.length, 1,
    'DR.STATUS is read exactly once (the normalize line); got ' + raw.length + ' reads');
  // The second half: a row marked resolved with a blank/unparseable ResolvedAt
  // has an UNKNOWN duration. The old code fell through to "now − created",
  // pushing an ever-growing age into deptStats.durations every single day.
  assert.ok(/isResolved\s*\?\s*\(\(resolvedMs && createdMs\)/.test(fn.replace(/\s*\n\s*/g, ' ')),
    'a resolved row with no usable ResolvedAt yields null, not a growing age');
  assert.ok(!/\(resolvedMs && createdMs\) \? Math\.round\(\(resolvedMs - createdMs\) \/ 60000\)\s*:\s*\(createdMs/
    .test(fn.replace(/\s*\n\s*/g, ' ')),
    'the old unconditional fallthrough is gone');
});

test('A1: no interactive element is a bare span/div with an inline onclick', () => {
  const offenders = [];
  A11Y_SCAN_PARTIALS.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app', f), 'utf8');
    // Scan the WHOLE source, not line by line: `[^>]` matches newlines, so a
    // tag whose onclick sits on a later line than its `<span` is still caught.
    // A per-line scan missed exactly that and passed a reverted fix —
    // bite-checked.
    const re = /<(div|span|tr|td|li)\b[^>]*?onclick=/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      // The shared modal's stopPropagation shim is a container, not a control.
      if (src.slice(m.index, m.index + 200).indexOf('onclick="event.stopPropagation()"') >= 0) continue;
      const lineNo = src.slice(0, m.index).split('\n').length;
      offenders.push(f + ':' + lineNo + ' ' + m[0].replace(/\s+/g, ' ').slice(0, 90));
    }
  });
  assert.deepStrictEqual(offenders, [],
    'use <button type="button"> for a control — a span/div with onclick is keyboard-unreachable:\n  ' +
    offenders.join('\n  '));
});

// A11 GENERALIZED (cycle-13 batch 5): the specific-surface checks below are
// kept as regression pins, but the RULE is now machine-enforced across every
// scanned partial — wherever a state class is toggled, an ARIA attribute must be
// set in the same function. Running it surfaced eight more instances than the
// six the scan found by hand (the CN flag toolbar, both CN sub-tab strips, the
// KB tree item and the KB editor type toggle), which is the whole point of
// promoting a convention to a tripwire.
// C17 batch-3: vocabulary widened with the DISCLOSURE-state classes
// ('collapsed'/'expanded'). Deliberately NOT widened with 'open'/'show': a
// dry-run found 17 of 19 such hits are the dialog-visibility idiom
// (`.overlay.open` / tour + hover popovers), whose state is conveyed by the
// ensureOverlay focus lifecycle (INV-83) and pinned by the DOM harness — a
// class-toggle scan is the wrong net for dialogs, and admitting them would
// bury the real signal in reasoned exemptions.
const A11Y_STATE_CLASSES = ['active', 'on', 'selected', 'current', 'collapsed', 'expanded'];
// Decorative-only toggles: no state a user could act on, nothing to announce.
// Keep this list tiny and reasoned — each entry is a claim that the class is
// pure presentation.
const A11Y_DECORATIVE = {
  'kb/script_kb.html:kbDrawerSetSearching_': 'a loading spinner — the search status is conveyed by the results region',
  'tc/script_clock.html:clkApplySky_': 'the two cross-fading sky gradient LAYERS behind the clock card',
  // C17 batch-3: sidebar collapse is a CONTINUOUS-WIDTH consequence (labels
  // hide below the snap threshold), not a binary control state — the nav
  // links stay in the tree, named by their sb-lbl text carried as titles.
  'script_core.html:applySidebarWidth_': 'width-driven label hiding on the resizable sidebar — no toggle control carries this state',
};
test('A11 (rule): every state-class toggle also sets an ARIA attribute', () => {
  const offenders = [];
  A11Y_SCAN_PARTIALS.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app', f), 'utf8');
    const re = new RegExp("classList\\.(?:toggle|add)\\('(" + A11Y_STATE_CLASSES.join('|') + ")'", 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      // Locate the enclosing function by walking back to the nearest declaration.
      const before = src.slice(0, m.index);
      const decl = [...before.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].pop();
      const fnName = decl ? decl[1] : '(anonymous)';
      if (A11Y_DECORATIVE[f + ':' + fnName]) continue;
      // The function body from its declaration to the next top-level one.
      const start = decl ? decl.index : Math.max(0, m.index - 400);
      const nextDecl = src.indexOf('\nfunction ', m.index);
      const body = src.slice(start, nextDecl > 0 ? nextDecl : m.index + 600);
      if (/aria-[a-z]+|setAttribute\('aria|removeAttribute\('aria/.test(body)) continue;
      offenders.push(f + ':' + before.split('\n').length + ' in ' + fnName + '()');
    }
  });
  assert.deepStrictEqual(offenders, [],
    'a CSS class is invisible to assistive tech — set aria-current / aria-pressed / ' +
    'aria-selected / aria-checked alongside it (or add a reasoned A11Y_DECORATIVE entry):\n  ' +
    offenders.join('\n  '));
});

// A11: active state must be exposed to assistive tech, not just painted.
test('A11: nav + segmented toggles expose their active state', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  assert.ok(/\.tt-btn'\)\.forEach\([\s\S]{0,240}?aria-current/.test(core),
    'the tab bar sets aria-current alongside .active');
  assert.ok(/sb-link\[data-tool\][\s\S]{0,240}?aria-current/.test(core),
    'the sidebar/mobile nav sets aria-current alongside .active');
  const clock = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/dash-seg-opt[\s\S]{0,200}?aria-pressed/.test(clock), 'the period switcher renders aria-pressed');
  assert.ok(/o\.setAttribute\('aria-pressed'/.test(clock), 'clkDashSet_ keeps aria-pressed in step');
  const coach = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_coaching.html'), 'utf8');
  assert.ok(/role="tab"[^>]*aria-selected/.test(coach), 'the coaching tablist marks its tabs');
  assert.ok(/b\.setAttribute\('aria-selected'/.test(coach), 'coachSwitchMode_ keeps aria-selected in step');
  const mgr = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  assert.ok(/aria-expanded="false" aria-controls=/.test(mgr), 'the coverage day disclosure is marked');
  assert.ok(/btn\.setAttribute\('aria-expanded'/.test(mgr), 'covToggleDay_ keeps aria-expanded in step');
});

// ── Phase 0 (CDR sub-queue discovery) ───────────────────────────────────────
console.log('\nPhase 0 — CDR sub-queue discovery');

// The inventory exists to answer ONE question, so the render must state the
// verdict unambiguously in BOTH directions. A diagnostic that reads the same
// whether or not the data supports the feature is worthless.
test('Phase 0: the queue inventory states the row-shape verdict both ways', () => {
  const base = { ok: true, from: '2026-07-22', to: '2026-07-29', rowsScanned: 100,
    queues: [], sentinels: [], transferCols: [] };

  const yes = cnQueueInventoryHtml_(Object.assign({}, base, {
    rowsInWindow: 40,
    agentDateRows: { max: 3, multiCount: 12, sampleMulti: [{ key: 'Avery Blake|2026-07-28', rows: 3 }] },
  }));
  assert.ok(/Per-queue rep attribution IS available/.test(yes), 'multi-row agent-days read as available');
  assert.ok(yes.indexOf('Avery Blake on 2026-07-28') > 0, 'the sample renders agent + date readably');

  const no = cnQueueInventoryHtml_(Object.assign({}, base, {
    rowsInWindow: 40, agentDateRows: { max: 1, multiCount: 0, sampleMulti: [] },
  }));
  assert.ok(/NOT in this data/.test(no), 'one-row-per-agent-day reads as NOT available');
  assert.ok(no.indexOf('Per-queue rep attribution IS available') < 0, 'the two verdicts are mutually exclusive');

  // No rows is a THIRD state — "cannot determine" must not read as "no".
  const none = cnQueueInventoryHtml_(Object.assign({}, base, {
    rowsInWindow: 0, agentDateRows: { max: 0, multiCount: 0, sampleMulti: [] },
  }));
  assert.ok(/cannot be determined/.test(none), 'an empty window is undetermined, not a negative verdict');
  assert.ok(none.indexOf('NOT in this data') < 0, 'an empty window must not assert the negative');

  // A failed scan surfaces as an error, never as an empty inventory (INV-175).
  const bad = cnQueueInventoryHtml_({ ok: false, error: 'CDR unreachable' });
  assert.ok(/Queue inventory unavailable/.test(bad) && bad.indexOf('CDR unreachable') > 0,
    'a failed scan says so');
});

test('Phase 0: queue identifiers from the sheet are escaped', () => {
  const h = cnQueueInventoryHtml_({
    ok: true, from: 'a', to: 'b', rowsScanned: 5, rowsInWindow: 5,
    agentDateRows: { max: 1, multiCount: 0, sampleMulti: [] },
    queues: [{ queue: '<img src=x onerror=alert(1)>', rows: 3, agents: 2 }],
    sentinels: [{ name: 'A_Q_<b>x</b>', rows: 1 }],
    transferCols: [{ col: 8, header: '"><script>', populated: 4, scanned: 5 }],
  });
  // These strings cross a repo trust boundary (the CDR sheet is written by
  // call-data-reporting), the same boundary the Metrics esc() gotcha names.
  assert.ok(h.indexOf('<img src=x') < 0, 'a queue name cannot inject markup');
  assert.ok(h.indexOf('A_Q_<b>') < 0, 'a sentinel name cannot inject markup');
  assert.ok(h.indexOf('"><script>') < 0, 'a Transfer header cannot inject markup');
  assert.ok(h.indexOf('&lt;img') > 0, 'it renders escaped rather than being dropped');
});

// The scan is a full-sheet read. getAutomationHealthBadge polls it every 10
// MINUTES per manager and sendAutomationHealthDigest runs it daily — both call
// computeAutomationHealth_ directly, so the default must be OFF. This pin is
// the thing standing between a diagnostic and a recurring cost regression.
test('Phase 0: the queue scan is opt-in — badge, digest and deploy-readiness skip it', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  assert.ok(/function computeAutomationHealth_\(opts\)[\s\S]{0,400}?const scanQueues = !!\(opts && opts\.scanQueues\);/.test(src),
    'computeAutomationHealth_ defaults scanQueues OFF');
  assert.ok(/if \(scanQueues\) \{[\s\S]{0,200}?cdrQueueInventory_\(/.test(src),
    'the inventory only runs behind the flag');
  assert.ok(/getAutomationHealth\(\{ scanQueues: false \}\)/.test(src),
    'getDeployReadiness opts out explicitly');
  // The two direct callers must pass no opts at all — adding one would be the
  // regression this pin exists to catch.
  const badge = src.slice(src.indexOf('function getAutomationHealthBadge'));
  assert.ok(/automationProblems_\(computeAutomationHealth_\(\)\)/.test(badge.slice(0, 1200)),
    'the 10-min badge poll calls computeAutomationHealth_ with no opts');
  const digest = src.slice(src.indexOf('function sendAutomationHealthDigest'));
  assert.ok(/report = computeAutomationHealth_\(\);/.test(digest.slice(0, 2000)),
    'the daily digest calls computeAutomationHealth_ with no opts');
});

// The reader must stay READ-ONLY and bounded — it is a discovery tool wired
// into a manager panel, not a data path.
test('Phase 0: cdrQueueInventory_ is read-only, bounded and PHI-free', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const m = src.match(/function cdrQueueInventory_\(from, to\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'cdrQueueInventory_ is present');
  const body = m[0];
  assert.ok(!/setValue|appendRow|getRange\([^)]*\)\.set|deleteRow|insertSheet/.test(body),
    'the inventory never writes');
  assert.ok(/CDR_QUEUE_SCAN_MAX/.test(body) && /truncated/.test(body),
    'the scan is capped AND reports truncation (INV-169)');
  assert.ok(/CDR_QUEUE_LIST_CAP/.test(body), 'the payload lists are capped');
  // It reads 3 columns, not the sibling's 34 — the cost claim in its own doc
  // comment. A widened read here silently multiplies the panel's cost.
  // F2 (cycle 15): the width is DERIVED from the enum rather than the literal
  // 3, so the read follows a column move instead of reading its neighbour.
  // Assert the derivation AND that it still evaluates to 3 columns — the cost
  // claim in the function's own doc comment.
  assert.ok(/getRange\(startRow, qFirst, nRows, qWidth\)/.test(body),
    'the DQE read is bounded by enum-derived offsets');
  assert.ok(/qWidth = \(CDR\.QUEUE_EXT - CDR\.DATE\) \+ 1/.test(body),
    'the width comes from the enum, not a literal');
  const enumSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8')
    .match(/const CDR = \{[\s\S]*?\}/)[0];
  const gi = (k) => Number(enumSrc.match(new RegExp(k + ':\\s*(\\d+)'))[1]);
  assert.strictEqual((gi('QUEUE_EXT') - gi('DATE')) + 1, 3,
    'DATE..QUEUE_EXT is still 3 columns — a wider span multiplies the panel cost');
  // …and every offset used is enum-derived, never a bare index.
  assert.ok(!/vals\[i\]\[[0-9]\]/.test(body), 'no bare positional index into the read');
});

// ── Phase 1 (sub-queue, transfer-only) ──────────────────────────────────────
console.log('\nPhase 1 — transfer-only per-queue attribution');

// Columns are read BY HEADER NAME, which is what makes a reorder inside the
// H:R block self-correcting and avoids a hardcoded queue list that could drift
// against the operator-owned call-data-reporting repo.
test('Phase 1: queue columns are discovered from the header row, blanks skipped', () => {
  const fn = extractRawFunction('Code.js', 'csrTransferQueueColumns_');
  // Read the REAL bounds out of Code.js rather than injecting literals — an
  // injected 7/17 cannot notice the constants moving, which is exactly the
  // drift this test is for (bite-checked: widening LAST to 18 now fails here).
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const first = Number((src.match(/const CSRT_QUEUE_COL_FIRST = (\d+);/) || [])[1]);
  const last = Number((src.match(/const CSRT_QUEUE_COL_LAST = (\d+);/) || [])[1]);
  assert.strictEqual(first, 7, 'the queue block starts at column H (0-indexed 7)');
  assert.strictEqual(last, 17, 'the queue block ends at column R (0-indexed 17) — 18 is Comments');
  const csrTransferQueueColumns_ = new Function(
    'CSRT_QUEUE_COL_FIRST', 'CSRT_QUEUE_COL_LAST',
    fn + '; return csrTransferQueueColumns_;')(first, last);

  const hdr = new Array(19).fill('');
  hdr[7] = 'A_Q_Sales'; hdr[8] = '  '; hdr[9] = 'A_Q_Billing'; hdr[17] = 'A_Q_Denials';
  assert.deepStrictEqual(csrTransferQueueColumns_(hdr),
    [{ col: 7, queue: 'A_Q_Sales' }, { col: 9, queue: 'A_Q_Billing' }, { col: 17, queue: 'A_Q_Denials' }],
    'blank and whitespace-only headers are skipped; the rest keep their column index');
  // Columns OUTSIDE H:R must never be treated as queues — col 6 is
  // "Total Calls Transferred" and col 18 is Comments.
  const wide = new Array(19).fill('');
  wide[6] = 'Total Calls Transferred'; wide[18] = 'Comments';
  assert.deepStrictEqual(csrTransferQueueColumns_(wide), [], 'the block is bounded to H:R');
  assert.deepStrictEqual(csrTransferQueueColumns_(null), [], 'a missing header row degrades to no queues');
});

// The opt-in default is the whole compatibility story: three production callers
// pass 3 args, and their assembled results are CACHED. If the default flipped
// on, those payloads would change shape without an INV-85 cache bump.
test('Phase 1: per-queue reading is opt-in; the three existing callers pass 3 args', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  assert.ok(/function getCsrTransferPerRepDaily_\(from, to, rosterNames, opts\) \{\s*\n\s*const withQueues = !!\(opts && opts\.withQueues\);/.test(src),
    'withQueues defaults OFF');
  // Every call site, excluding the definition itself.
  const calls = (src.match(/getCsrTransferPerRepDaily_\((?!from, to, rosterNames, opts)/g) || []).length;
  const optedIn = (src.match(/getCsrTransferPerRepDaily_\([^)]*\{ withQueues: true \}\)/g) || []).length;
  // THE load-bearing number: the no-queues callers cache their assembled
  // payloads, so this set only changes deliberately. Operator #5 (2026-08-06)
  // added getMyMetricsRange's own transfer aggregate (also cached, also
  // queue-free); the 2026-08-13 dashboard speedup then CONSOLIDATED
  // getDashboardMetrics's two calls (own + team) into one — the own row is
  // derived from the team map, halving the cold-start reads.
  assert.strictEqual(calls - optedIn, 3,
    'exactly the 3 opt-out callers remain 3-arg (getDashboardMetrics shapeWindow + the getMyMetrics trend + getMyMetricsRange #5)');
  // Name the opted-in callers rather than counting them — a bare count has to
  // be edited every time the feature grows (Phase 2 tripped it immediately),
  // which trains the next author to bump the number instead of thinking. This
  // form still fails on an UNDECLARED opt-in, which is the case worth catching.
  const OPTED_IN_CALLERS = ['cdrQueueInventory_', 'getTeamMetrics'];
  const owners = [];
  const re = /getCsrTransferPerRepDaily_\([^)]*\{ withQueues: true \}\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const decl = [...src.slice(0, m.index).matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].pop();
    owners.push(decl ? decl[1] : '(anonymous)');
  }
  assert.deepStrictEqual(owners.sort(), OPTED_IN_CALLERS.slice().sort(),
    'only declared callers opt in — add yours to OPTED_IN_CALLERS deliberately');
  assert.strictEqual(optedIn, OPTED_IN_CALLERS.length, 'no duplicate opt-in inside one caller');
});

// The counts are a COMPONENT of `transferred`, not a partition of it: a real
// sheet routes some transfers to destinations with no A_Q_ column. Deriving the
// total by summing queues would silently under-report.
test('Phase 1: the attributed subtotal is reported alongside the total, never instead of it', () => {
  const fn = extractRawFunction('Code.js', 'getCsrTransferPerRepDaily_');
  assert.ok(/a\.queueTotal = qt;/.test(fn), 'queueTotal is the summed attribution');
  assert.ok(/a\.queueUnattributed = Math\.max\(0, a\.transferred - qt\);/.test(fn),
    'the remainder is reported, so a partial breakdown cannot read as complete');
  assert.ok(!/a\.transferred = qt|transferred = .*queueTotal/.test(fn),
    'transferred is NEVER derived from the queue sum');
  // A zero or blank cell is absence, not a queue with zero traffic — otherwise
  // every rep would appear to staff every queue.
  assert.ok(/if \(!isFinite\(n\) \|\| n === 0\) continue;/.test(fn), 'zero and non-numeric cells are skipped');
});

// ── Phase 2 (sub-queue UI on the Transfer KPI) ──────────────────────────────
console.log('\nPhase 2 — sub-queue views');

const mQueueHue_ = loadFunction(sb, 'metrics/script_metrics.html', 'mQueueHue_');
const mQueueBarHtml_ = loadFunction(sb, 'metrics/script_metrics.html', 'mQueueBarHtml_');
const mQueueDetailHtml_ = loadFunction(sb, 'metrics/script_metrics.html', 'mQueueDetailHtml_');

test('Phase 2: a queue keeps the same colour across renders and both modes', () => {
  assert.strictEqual(mQueueHue_('A_Q_Sales'), mQueueHue_('A_Q_Sales'), 'deterministic');
  assert.notStrictEqual(mQueueHue_('A_Q_Sales'), mQueueHue_('A_Q_Billing'), 'distinct names differ');
  assert.ok(mQueueHue_('') >= 0 && mQueueHue_(null) >= 0, 'degenerate names do not throw');
});

// INV-180 in the UI: a bar drawn from queues ALONE would imply the breakdown
// is complete. The unattributed remainder must be its own segment.
test('Phase 2: the contribution bar renders the unattributed remainder', () => {
  const rep = { transferred: 14, queues: { 'A_Q_Sales': 6, 'A_Q_Billing': 3 }, queueTotal: 9, queueUnattributed: 5 };
  const bar = mQueueBarHtml_(rep);
  assert.ok(/m-qseg-rest/.test(bar), 'the remainder is drawn, not dropped');
  const widths = [...bar.matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.strictEqual(widths.length, 3, 'two queues + the remainder');
  assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.05, 'segments total 100%');
  // A fully attributed rep has no remainder segment.
  const full = mQueueBarHtml_({ transferred: 2, queues: { 'A_Q_Spanish': 2 }, queueTotal: 2, queueUnattributed: 0 });
  assert.ok(!/m-qseg-rest/.test(full), 'no phantom remainder when fully attributed');
  assert.strictEqual(mQueueBarHtml_({ transferred: 0, queues: {} }), '', 'no bar when there is nothing to show');
});

test('Phase 2: the detail states the attributed fraction and escapes queue names', () => {
  const h = mQueueDetailHtml_({ transferred: 14, queues: { 'A_Q_<img src=x>': 9 }, queueTotal: 9, queueUnattributed: 5 });
  assert.ok(h.indexOf('9 of 14 transfers attributed') > 0,
    'the fraction is stated in words, not left to the bar');
  // Queue names cross the call-data-reporting trust boundary (the Metrics
  // esc() gotcha names exactly this).
  assert.ok(h.indexOf('<img src=x') < 0 && h.indexOf('&lt;img') > 0, 'queue names are escaped');
  assert.ok(/Not attributed to a queue/.test(h), 'the remainder is a named row, not a silent gap');
  // A rep with transfers but NO queue attribution must say so rather than
  // render an empty box that reads as a failed load.
  const none = mQueueDetailHtml_({ transferred: 3, queues: {}, queueTotal: 0, queueUnattributed: 3 });
  assert.ok(/No transfer landed in a named queue/.test(none), 'zero-attribution is stated');
});

test('Phase 2: mtRenderTable_ detail rows are additive and the disclosure is real', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const fn = core.slice(core.indexOf('function mtRenderTable_'));
  assert.ok(/if \(opts\.detailRow && opts\.rowId\)/.test(fn),
    'a caller passing neither renders exactly as before');
  assert.ok(/replace\(\/\[\^\\w\.\$-\]\/g, ''\)/.test(fn.slice(0, 3000)),
    'the detail row id is charset-restricted like the sort handler (cycle-11 L-15)');
  const m = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  // INV-173/174: a real <button> carrying aria-expanded, kept in step by a
  // handler rather than a CSS class alone.
  assert.ok(/<button type="button" class="m-qtoggle" aria-expanded="false" aria-controls="/.test(m),
    'the disclosure is a button with aria-controls');
  assert.ok(/btn\.setAttribute\('aria-expanded'/.test(m), 'mToggleQueueRow_ keeps aria-expanded in step');
  // The wrapper is emitted AFTER the buttons in source order, so assert both
  // exist rather than assuming they are adjacent.
  assert.ok(/role="tablist"/.test(m), 'the scope switcher is a tablist');
  assert.ok(/role="tab" aria-selected="' \+ \(on \? 'true' : 'false'\)/.test(m),
    'each scope button carries aria-selected reflecting its state');
});

// The whole team table must not vanish because one auxiliary tab is
// unreachable — and a failure must not read as "no transfers" (INV-175).
test('Phase 2: a failed transfer read degrades to an error strip, not an empty table', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const fn = extractRawFunction('Code.js', 'getTeamMetrics');
  // Anchor on the INNER try — the function body opens with an outer one.
  const guarded = fn.slice(fn.indexOf('var trAgents'));
  assert.ok(/try \{[\s\S]{0,600}?getCsrTransferPerRepDaily_/.test(guarded),
    'the transfer read sits inside its own try');
  assert.ok(/\} catch \(trErr\) \{[\s\S]{0,120}?transferMeta\.error = trErr\.message;/.test(guarded),
    'a throw degrades to transferMeta.error (the INV-67 best-effort posture)');
  assert.ok(/transferMeta: transferMeta/.test(fn), 'the outcome rides back to the client');
  const m = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  assert.ok(/tmeta\.error[\s\S]{0,300}?errorStateHtml_\('Transfer data unavailable/.test(m),
    'the client renders an error, never a silent zero');
  assert.ok(src.indexOf('teamTotals.transferred += rep.transferred') > 0,
    'team totals accumulate transfers for the by-queue footnote');
});

// ── Phase 4 (queue → department grouping) ───────────────────────────────────
console.log('\nPhase 4 — queue grouping');

const groupQueueRows_ = (function () {
  const fn = extractRawFunction('Code.js', 'groupQueueRows_');
  return new Function('CDR_QUEUE_UNGROUPED', fn + '; return groupQueueRows_;')('Ungrouped');
})();

test('Phase 4: group totals SUM their members (sub-queues are disjoint)', () => {
  const rows = [
    { queue: 'A_Q_Sales', transferred: 40, reps: 5 },
    { queue: 'A_Q_PAP', transferred: 25, reps: 3 },
    { queue: 'A_Q_Sales_MWC', transferred: 10, reps: 2 },
    { queue: 'A_Q_FieldOps', transferred: 30, reps: 4 },
  ];
  const groups = { 'Sales': ['A_Q_Sales', 'A_Q_PAP', 'A_Q_Sales_MWC'], 'Field Operations': ['A_Q_FieldOps'] };
  const out = groupQueueRows_(rows, groups);
  const sales = out.filter((g) => g.group === 'Sales')[0];
  assert.strictEqual(sales.transferred, 75, 'a group total is the plain sum of its members');
  assert.strictEqual(sales.queues.length, 3, 'members ride along for the disclosure');
  assert.strictEqual(sales.queues[0].queue, 'A_Q_Sales', 'members sorted by volume desc');
  // reps is a LOWER BOUND (max), never a sum — one rep can work several queues.
  assert.strictEqual(sales.reps, 5, 'reps is the busiest member, not 5+3+2');
  assert.ok(out[0].transferred >= out[out.length - 1].transferred, 'groups sorted by volume desc');
});

test('Phase 4: an unmapped queue stays VISIBLE as Ungrouped, sorted last', () => {
  const rows = [
    { queue: 'A_Q_Mystery', transferred: 900, reps: 9 },   // biggest, but unmapped
    { queue: 'A_Q_Sales', transferred: 10, reps: 1 },
  ];
  const out = groupQueueRows_(rows, { 'Sales': ['A_Q_Sales'] });
  assert.strictEqual(out.length, 2, 'the unmapped queue is not dropped');
  assert.strictEqual(out[out.length - 1].group, 'Ungrouped',
    'Ungrouped sorts LAST regardless of volume — it is a gap, not a department');
  assert.strictEqual(out[out.length - 1].queues[0].queue, 'A_Q_Mystery', 'and it names the queue');
});

// A queue listed under two groups would be counted twice — the INV-180 class.
test('Phase 4: a queue claimed by two groups is counted ONCE', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const fn = extractRawFunction('Code.js', 'getCdrQueueGroups_');
  assert.ok(/if \(!qn \|\| claimed\[qn\]\) return;/.test(fn),
    'the resolver drops a duplicate queue so the first group wins');
  // And the folder itself is first-wins too, independently of the resolver.
  const out = groupQueueRows_(
    [{ queue: 'A_Q_Dup', transferred: 12, reps: 2 }],
    { 'A': ['A_Q_Dup'], 'B': ['A_Q_Dup'] });
  const total = out.reduce((n, g) => n + g.transferred, 0);
  assert.strictEqual(total, 12, 'the queue contributes its volume once, not twice');
  // Sanity: the operator-seeded CONFIG map must itself be a partition.
  const seed = src.slice(src.indexOf('CDR_QUEUE_GROUPS: {'), src.indexOf('},', src.indexOf('CDR_QUEUE_GROUPS: {')));
  const named = [...seed.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((x) => /^(A_Q_|Backup )/.test(x));
  assert.strictEqual(named.length, new Set(named).size,
    'no queue appears under two departments in the shipped seed');
});

test('Phase 4: the resolver sanitizes on read and the UI offers the mode only with data', () => {
  const fn = extractRawFunction('Code.js', 'getCdrQueueGroups_');
  assert.ok(/CONFIG\.CDR_QUEUE_GROUPS/.test(fn), 'CONFIG is the fallback');
  assert.ok(/catch \(e\) \{ \/\* corrupt blob → CONFIG fallback \*\//.test(fn),
    'a corrupt Script Property degrades to CONFIG rather than throwing');
  assert.ok(/!Array\.isArray\(src\[g\]\)/.test(fn), 'a non-array member list is dropped');
  const m = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  assert.ok(/hasGroups \? segBtn\('dept', 'By department'\) : ''/.test(m),
    'the By-department button only renders when there are groups');
  assert.ok(/want === 'dept' && data\.groupRows && data\.groupRows\.length/.test(m),
    'and the mode is only reachable when its data exists');
  assert.ok(/Reps \(min\)/.test(m), 'the reps column is labelled as a lower bound, not a total');
});

// A13: the three section-heading classes render as real <h2>s, so heading
// navigation — the primary way a screen-reader user moves through a dense page
// — works below the view's <h1>. They were <div>/<span>, so every view had a
// heading outline exactly one level deep. Scanning by CLASS (not by counting
// tags) means a NEW card added as a div fails, which is the drift that matters.
// C17 batch-3 (INV-179): the class set is now DERIVED from the markup by this
// codebase's own heading-class naming convention (…card-label / …card-title /
// …seclabel / …section-h) — the hand list above missed .tr-section-h, a live
// div-heading on two manager surfaces (used but DEFINED nowhere). The list
// below is the floor; the derivation can only add to it.
const A13_HEADING_CLASSES = ['card-label', 'tr-card-title', 'dash-seclabel', 'tr-section-h'];
test('A13: section-heading classes render as <h2>, not div/span', () => {
  const offenders = [];
  let seen = 0;
  // Derive convention-named heading classes from the markup itself.
  const derived = new Set(A13_HEADING_CLASSES);
  A11Y_SCAN_PARTIALS.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app', f), 'utf8');
    let dm;
    const dre = /class="([a-z0-9-]*(?:card-label|card-title|seclabel|section-h))[" ]/g;
    while ((dm = dre.exec(src)) !== null) derived.add(dm[1]);
  });
  A11Y_SCAN_PARTIALS.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app', f), 'utf8');
    derived.forEach((cls) => {
      // C17 batch-3: `class` need not be the FIRST attribute — the old
      // `<tag\s+class="` anchor let `<div id="x" class="card-label">` escape
      // the scan entirely.
      const re = new RegExp('<([a-z0-9]+)\\b[^>]*?class="' + cls + '\\b', 'g');
      let m;
      while ((m = re.exec(src)) !== null) {
        seen++;
        if (m[1] === 'h2') continue;
        offenders.push(f + ':' + src.slice(0, m.index).split('\n').length + ' <' + m[1] + ' class="' + cls + '"');
      }
    });
  });
  assert.deepStrictEqual(offenders, [],
    'a card section heading must be an <h2> so it joins the document outline:\n  ' +
    offenders.join('\n  '));
  // C17 batch-3: a heading class must also be DEFINED — .tr-section-h was
  // used on two manager surfaces with no CSS rule anywhere (headings rendered
  // as unstyled body text; INV-184 in reverse: read-but-never-declared).
  const cssHay = A11Y_SCAN_PARTIALS.concat(['styles.html', 'styles_design_tokens.html'])
    .map((f) => { const p = path.join(__dirname, '../../web-app', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; })
    .join('\n');
  derived.forEach((cls) => {
    assert.ok(new RegExp('\\.' + cls + '\\s*[{,:]').test(cssHay),
      'heading class .' + cls + ' is used in markup but defined in no stylesheet');
  });
  // Guard the guard: if a rename silently emptied the scan it would pass vacuously.
  assert.ok(seen >= 27, 'expected the 27 known heading sites, found ' + seen);
  // The UA h2 margin must be zeroed or every card grows a gap above its label.
  const s = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  assert.ok(/\.card-label \{[\s\S]{0,240}?margin-top: 0;/.test(s), '.card-label zeroes the UA h2 margin-top');
  const tr = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_training.html'), 'utf8');
  assert.ok(/\.tr-card-title \{[\s\S]{0,240}?margin: 0;/.test(tr), '.tr-card-title zeroes the UA h2 margin');
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/\.dash-seclabel \{[\s\S]{0,240}?margin: 0;/.test(clk), '.dash-seclabel zeroes the UA h2 margin');
});

// A2: `:root[data-compact]` is the POP-OUT, not a viewport breakpoint. Any grid
// that stacks in compact needs a real media query too, or it never stacks on a
// phone.
//
// Cycle-16 F3: GENERALIZED from three hand-listed fixes to the RULE. The old
// version asserted that cycle-13's three specific fixes (.m-layout, .telemetry,
// .coach-kpis) were still in place — so a FOURTH instance sailed past with CI
// green, and four had accumulated: .kb-wrap (whose file had zero media queries
// at all — the Reference reader measured 70px at 390px), .cnv-trio (114/104/94
// on the app's most-used form), .cnv-row and .intk-row. This is the same
// promotion A1/A11 got in cycle-13 batch 5, and the reason is stated seven
// lines below in the A1 comment: a hand-copied list is the class cycle-11's
// M-4 retired. Derive the set; never enumerate it.
//
// Rule: for every selector that `:root[data-compact]` re-columns, the SAME
// selector must also appear inside some @media block with a
// grid-template-columns declaration. Direction is deliberately not checked —
// .rail-flags legitimately goes 2-up → 4-up in the pop-out (denser icon rail),
// which is the inverse of stacking and not a defect — so it is allowlisted
// WITH that reason rather than silently skipped.
const A2_INVERSE_OK = {
  // selector → why a viewport breakpoint is not required
  'rail-flags': 'compact widens 2-up → 4-up (icon-only rail); the inverse of stacking',
  // C17-1 (cycle 17) — surfaced when the fixed regex reached styles.html:
  'ts-recent-row': 'base is auto 1fr auto (content-sized tracks, one flexible middle) — ' +
    'nothing fixed-width to overflow; the compact override only drops the leading icon column for density',
  'hero': 'the only live consumer is the Clock dashboard, whose .dash-hero (tc/script_clock.html) ' +
    'sets display:block — the base 2-col grid never applies; verified by the 390px clock scenario in the visual matrix',
};
// A grid whose BASE track function is intrinsically responsive (auto-fill /
// auto-fit / min() / clamp()) already reflows with the viewport — it needs no
// breakpoint, and adding one would be noise. `.m-kpi-grid` is the live example:
// `repeat(auto-fill, minmax(140px, 1fr))` drops to 2 columns at 390px on its
// own, and its compact override exists only to PIN 3 columns in the pop-out.
// This is a property of the rule, not a per-selector exception, so it belongs
// here rather than in the allowlist above.
const A2_INTRINSIC = /auto-fill|auto-fit|\bmin\(|\bclamp\(/;
test('A2: EVERY compact-mode grid override has a matching viewport breakpoint', () => {
  // Strip CSS comments so a commented-out rule can neither create nor satisfy
  // an obligation.
  const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const gaps = [];
  let checked = 0;
  A11Y_SCAN_PARTIALS.concat(['styles.html']).forEach((rel) => {
    const p = path.join(__dirname, '../../web-app', rel);
    if (!fs.existsSync(p)) return;
    const src = decomment(fs.readFileSync(p, 'utf8'));
    // Selectors re-columned under :root[data-compact].
    // Cycle-17 C17-1 — the attribute selector must match BOTH written forms:
    // the partials write the bare `:root[data-compact]` but every one of
    // styles.html's ~67 compact overrides writes `:root[data-compact="1"]`,
    // which the old literal `\[data-compact\]` never matched — so the shared
    // stylesheet contributed ZERO selectors and the scan that claims to
    // cover it ("A11Y_SCAN_PARTIALS + styles.html") guarded nothing there
    // (the checked >= 8 floor was satisfied by the partials alone). The
    // INV-179/188 failure shape: a derived scan silently narrower than the
    // thing it derives from.
    const compactSels = new Set();
    const re = /:root\[data-compact[^\]]*\][^{]*?\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*grid-template-columns/g;
    let m;
    while ((m = re.exec(src))) compactSels.add(m[1]);
    if (!compactSels.size) return;
    // Every @media BLOCK in the file, brace-matched (a line/indent-based scan
    // misses both single-line and deeply nested blocks — the false-negative
    // that let this rule look satisfied).
    const mediaBodies = [];
    let idx = 0;
    while ((idx = src.indexOf('@media', idx)) >= 0) {
      const open = src.indexOf('{', idx);
      if (open < 0) break;
      let depth = 0, end = open;
      for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      mediaBodies.push(src.slice(open, end));
      idx = end > idx ? end : idx + 6;
    }
    const media = mediaBodies.join('\n');
    compactSels.forEach((sel) => {
      if (A2_INVERSE_OK[sel]) return;
      // The BASE declaration (outside any @media / :root[data-compact] rule).
      const baseM = new RegExp(
        '(?:^|[},])\\s*\\.' + sel + '\\b[^{}]*\\{([^}]*)\\}', 'm').exec(src);
      if (baseM && A2_INTRINSIC.test(baseM[1])) return;   // already reflows
      checked++;
      const covered = new RegExp('\\.' + sel + '\\b[^{}]*\\{[^}]*grid-template-columns').test(media);
      if (!covered) gaps.push(rel + ': .' + sel);
    });
  });
  assert.ok(checked >= 8, 'the scan found the compact grid overrides (got ' + checked + ')');
  assert.deepStrictEqual(gaps, [],
    'these grids re-column in the POP-OUT but never at a narrow VIEWPORT, so they ' +
    'keep their desktop tracks on a phone:\n  ' + gaps.join('\n  ') +
    '\nAdd a @media breakpoint, or allowlist in A2_INVERSE_OK WITH a reason.');
});

// ---------------------------------------------------------------------------
// Cycle-13 batch 2 pins.
console.log('\ncycle 13 — A4 / A6 / A8 / A9 fix pins');

// A4: cycle-12 F5 replaced the 0-on-error count helper with the
// outcome-carrying cnCountNotesResult_ but kept the old wrapper "for the
// callers that only want the number". There were none — only its own two tests,
// which ASSERTED it returns 0 on an unreadable Sheet, i.e. pinned the exact
// behaviour F5 removed and kept the unsafe variant alive under the obvious name.
test('A4: the 0-on-error count wrapper is gone; only the outcome-carrying helper remains', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  assert.ok(code.indexOf('function countCallNotesInRange_(') < 0,
    'countCallNotesInRange_ must not be re-introduced — use cnCountNotesResult_(…).count ' +
    'and decide what to do with .unavailable');
  assert.ok(/function cnCountNotesResult_\(/.test(code), 'cnCountNotesResult_ is the surviving helper');
  const tests = fs.readFileSync(path.join(__dirname, '../../web-app/Tests.js'), 'utf8');
  // Comments explaining the removal are fine; a CALL is not.
  const calls = tests.split('\n').filter((l) =>
    /countCallNotesInRange_\s*\(/.test(l) && !/^\s*(\/\/|\*)/.test(l.trim()));
  assert.deepStrictEqual(calls, [], 'Tests.js still calls the removed wrapper:\n  ' + calls.join('\n  '));
});

// A6: the ONE RPC in the KB partial with no withFailureHandler, whose success
// path ALSO opened `if (!res || res.error) return;`. It refreshes the tree after
// a save/delete, so both paths silently left the admin looking at a stale list.
test('A6: kbReloadTree_ surfaces a failed refresh instead of returning silently', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const fn = kb.slice(kb.indexOf('function kbReloadTree_('));
  const body = fn.slice(0, fn.indexOf('\nfunction ', 10));
  assert.ok(/withFailureHandler/.test(body), 'kbReloadTree_ has a failure handler');
  assert.ok(!/if \(!res \|\| res\.error\) return;/.test(body),
    'the success path must not bare-return on a server error');
  assert.ok((body.match(/showToast|stale\(/g) || []).length >= 2,
    'BOTH paths (RPC failure and res.error) surface something to the user');
  // Every RPC in this partial now has a failure handler.
  const runs = (kb.match(/google\.script\.run/g) || []).length;
  const fails = (kb.match(/withFailureHandler/g) || []).length;
  assert.ok(fails >= runs, `every KB RPC has a failure handler (${runs} calls, ${fails} handlers)`);
});

// A8: the F5 class one surface over — a failed TimeOffRequests read reported as
// "nothing planned". Latent today (no consumer), fixed so a future reader does
// not inherit the confident zero.
// SUPERSEDED by the cycle-13 follow-on batch: A8 hardened this helper's error
// path, then the follow-on established that BOTH the helper and the
// `annualPlannedUpcoming` field it fed were dead — the only reader
// (renderPtoMini_) was deleted in cycle 8, and the Time/PTO tile computes its
// own total client-side (INV-72). The honest end state is that the whole path is
// gone, which is a stronger guarantee than a hardened catch. This pin now keeps
// it from being reintroduced.
test('A8/follow-on: the dead annualPlannedUpcoming path stays removed', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  assert.ok(stripped.indexOf('function getUpcomingAnnualPlanned_') < 0,
    'the helper stays removed — a whole TimeOffRequests read per getEmployeeState call, for no reader');
  assert.ok(!/annualPlannedUpcoming\s*:/.test(stripped),
    'the field stays off the getEmployeeState response');
});

// A9: `budget <= 0` also fires when the LAST rep consumed exactly the remaining
// rows and nothing was left — so a clean final run stamped hitPerRunCap and an
// operator watching a backlog drain could not tell it had finished.
test('A9: the CN archive stamps hitPerRunCap only when work actually remained', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const fn = code.slice(code.indexOf('function archiveOldCallNotes('));
  const body = fn.slice(0, fn.indexOf('\nfunction ', 10));
  assert.ok(!/const capped = budget <= 0 \?/.test(body),
    'the stamp must not key off `budget <= 0` — that fires on a clean final run too');
  assert.ok(/const capped = truncated\s*\n?\s*\?/.test(body), 'the stamp keys off `truncated`');
  // `truncated` is only set when an ENROLLED rep remained unvisited.
  assert.ok(/if \(budget <= 0\) \{[\s\S]{0,220}?cnEnrolledSheetId_\(roster\[k\]\)[\s\S]{0,80}?truncated = true;/.test(body),
    'truncated is set only when a remaining rep is actually enrolled');
});

// ---------------------------------------------------------------------------
// Cycle-13 batch 3 pins.
console.log('\ncycle 13 — A5 / A7 / A10 fix pins');

// A5: dev-ness must come from BOTH markers. The old inline test in
// runNightlySelfTest (and assertDevInstance_) inferred it from INSTANCE_LABEL
// alone, so labelling prod promoted the nightly job to the full destructive
// suite against live payroll — and assertNotProdInstance_ does not catch it,
// because that only fires on INSTANCE_IS_PROD === 'true'.
test('A5: dev-detection is single-sourced and requires an explicit non-prod marker', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const pred = extractRawFunction('Code.js', 'isDevInstance_');
  assert.ok(/INSTANCE_IS_PROD/.test(pred) && /raw === null \|\| String\(raw\)\.trim\(\) === ''/.test(pred),
    'an UNSET INSTANCE_IS_PROD is ambiguous and must resolve to NOT-dev');
  // Both consumers route through the one predicate — no second inline copy.
  assert.ok(/if \(!isDevInstance_\(\)\)/.test(extractRawFunction('Code.js', 'assertDevInstance_')),
    'assertDevInstance_ delegates to the predicate');
  const self = extractRawFunction('Code.js', 'runNightlySelfTest');
  assert.ok(/const isDev = isDevInstance_\(\);/.test(self),
    'runNightlySelfTest delegates to the predicate');
  assert.ok(!/getProperty\('INSTANCE_LABEL'\)\s*&&/.test(self),
    'the old inline label-only inference must not come back');
  // A half-configured instance says WHY it was downgraded, and the panel shows it.
  assert.ok(/needsMarker/.test(self) && /note:\s*note/.test(self),
    'a downgraded run records a note explaining the missing marker');
  assert.ok(/note: String\(st\.note \|\| ''\)/.test(code),
    'computeAutomationHealth_ carries the note through');
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(/st\.note \?/.test(cn), 'the Admin self-test block renders the note');
});

// A7: the "no data" early return fired BEFORE the F1 cold-archive read-through,
// so once archival drained the live tab a retroactive payroll export refused
// with a misleading error instead of reading the archive holding the rows.
test('A7: the export requires only a HEADER from the live tab, not data rows', () => {
  const fn = extractRawFunction('Code.js', 'generateExportSheet_');
  assert.ok(!/if \(rows\.length < 3\) return \{ error: 'No timesheet data found\.' \};/.test(fn),
    'the < 3 early return must not come back — it short-circuits the archive read-through');
  assert.ok(/if \(rows\.length < 2\)/.test(fn), 'only the two header rows are genuinely required');
  // The archive block must still be reachable from the empty-live-tab state.
  const guardIdx = fn.indexOf('rows.length < 2');
  const archiveIdx = fn.indexOf('TIMESHEET_ARCHIVE_TAB');
  assert.ok(guardIdx >= 0 && archiveIdx > guardIdx, 'the archive read-through comes after the header guard');
  assert.ok(/oldestLiveDate === null \|\| startDate < oldestLiveDate/.test(fn),
    'a live tab with no data rows (oldestLiveDate null) still consults the archive');
});

// A10: the F12 shape — non-transactional reads inside the ONE project-wide lock
// that every punch write contends for.
test('A10: submitQuizAttempt grades before taking the lock', () => {
  const fn = extractRawFunction('Code.js', 'submitQuizAttempt');
  const lockIdx = fn.indexOf('lock.waitLock(15000)');
  assert.ok(lockIdx > 0, 'the lock is still taken (INV-01)');
  const before = fn.slice(0, lockIdx);
  const after = fn.slice(lockIdx);
  ['getEmployeeInfo_(', 'trainReadQuizzes_(', 'trainReadAssignments_(', 'trainGradeQuiz_(']
    .forEach((call) => {
      assert.ok(before.indexOf(call) >= 0, call + ' runs BEFORE the lock');
      assert.ok(after.indexOf(call) < 0, call + ' must not also run inside the lock');
    });
  // These are transactional and MUST stay inside.
  assert.ok(after.indexOf('trainReadCompletions_(') >= 0,
    'the completions dedup is a read-check-write and stays inside the lock');
  assert.ok(after.indexOf('appendRow(') >= 0, 'the appends stay inside the lock');
  assert.ok(/finally \{ lock\.releaseLock\(\); \}/.test(fn), 'the lock is released in finally (INV-01)');
});

// ---------------------------------------------------------------------------
// Cycle-13 follow-on pins.
console.log('\ncycle 13 — follow-on fix pins');

// FO-2: V-8 removed the inverted --ink-on--ink primary from .btn-modal-ok
// precisely because it read as disabled/error on "Generate ADP Export" — but
// that on-page button is a DIFFERENT class and kept the vocabulary V-8 retired.
// The app has ONE primary vocabulary; this was the last holdout.
test('FO-2: no button is still on the retired inverted --ink primary', () => {
  const st = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  const rule = st.slice(st.indexOf('  .export-btn-large {'));
  const body = rule.slice(0, rule.indexOf('}'));
  assert.ok(/background: var\(--accent\)/.test(body),
    '.export-btn-large matches .btn-modal-ok / .actions .prime — one primary vocabulary');
  assert.ok(!/background: var\(--ink\)/.test(body),
    'the inverted --ink primary must not survive on the money-facing export button');
  // INV-165: the old hover mixed `in oklch`, which drags hue on the polar arc.
  const hover = st.slice(st.indexOf('  .export-btn-large:hover {'));
  assert.ok(!/oklch/.test(hover.slice(0, hover.indexOf('}'))),
    'the hover uses --accent-2, not an oklch mix (INV-165)');
});

// FO-3: V-4 made .ss-hours wrap INTERNALLY between its two readouts, but the
// parent row had no flex-wrap at all — so in the 360px Dashboard rail the hours
// readout ran past the card edge. An inner wrap cannot help when the parent row
// has nowhere to wrap to.
test('FO-3: the shift-strip header row can wrap, not just its hours readout', () => {
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  const rule = clk.slice(clk.indexOf('  .shift-strip-head {'));
  const body = rule.slice(0, rule.indexOf('}'));
  assert.ok(/display: flex/.test(body) && /flex-wrap: wrap/.test(body),
    '.shift-strip-head must wrap — five children on one line overflow a 360px rail');
  // The V-4 inner rule must survive alongside it.
  assert.ok(/\.ss-hours \.ss-val \{ white-space: nowrap; \}/.test(clk),
    'V-4 still holds: an individual duration never breaks inside itself');
});

// FO-4: JSON.stringify(NaN) is the string "null", so _assertEq(NaN, null) used
// to PASS — the editor suite was blind to exactly the sentinel class A3 fixed.
test('FO-4: _assertEq can tell NaN from null (and is otherwise unchanged)', () => {
  const ctx = { JSON, Object, Array, isNaN, Infinity, console, Error };
  vm.createContext(ctx);
  vm.runInContext(extractRawFunction('Tests.js', '_describe_'), ctx);
  vm.runInContext(extractRawFunction('Tests.js', '_assertEq'), ctx);
  const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };
  assert.ok(throws(() => ctx._assertEq(NaN, null)), 'NaN vs null must FAIL');
  assert.ok(throws(() => ctx._assertEq({ a: NaN }, { a: null })), 'a NESTED NaN vs null must FAIL');
  assert.ok(!throws(() => ctx._assertEq(NaN, NaN)), 'NaN vs NaN still passes');
  assert.ok(!throws(() => ctx._assertEq(null, null)), 'null vs null still passes');
  // Byte-identical to plain JSON.stringify for every non-NaN value — ~300
  // existing editor assertions compare objects through here and cannot be run
  // outside the Apps Script editor, so the serialization must not shift.
  [[1, 2], { a: 1 }, 'x', null, true, { a: [1, { b: 2 }] }, { a: undefined }, undefined]
    .forEach((v) => {
      assert.strictEqual(ctx._describe_(v), JSON.stringify(v),
        'unchanged serialization for ' + JSON.stringify(v));
    });
});

// ─── CDR name-match health: only the PAIRED set is a signal ──────────────
// A status card toned off either RAW direction can never go green on a shared
// CDR feed (the Report covers the whole phone system; the roster set is every
// named employee incl. managers/PTO), and a permanently-amber health card is
// worse than none — it trains the reader to ignore it.
test('CDR: likely name mismatches pair the two directions, not either alone', () => {
  const ctx = { String, Array, Object };
  vm.createContext(ctx);
  vm.runInContext(extractRawFunction('Code.js', 'cdrNameTokens_'), ctx);
  vm.runInContext(extractRawFunction('Code.js', 'cdrLikelyNameMismatches_'), ctx);
  const pair = ctx.cdrLikelyNameMismatches_;

  // The real case: one person spelled two ways. Their calls are silently
  // missing from every metric until an alias is added.
  const hit = pair(['Bob Smith'], ['Smith, Bob', 'Dana Wu']);
  assert.strictEqual(hit.length, 1, 'a reordered/punctuated name pairs');
  // Field-wise: the objects are built in the vm realm, so deepStrictEqual
  // fails on prototype identity even when the values match.
  assert.strictEqual(hit[0].roster, 'Bob Smith', 'carries the roster spelling');
  assert.strictEqual(hit[0].cdr, 'Smith, Bob', 'carries the CDR spelling to alias');

  // A middle initial still pairs (2 shared tokens).
  assert.strictEqual(pair(['Bob Smith'], ['Bob J. Smith']).length, 1, 'middle initial pairs');

  // A shared SURNAME alone must NOT pair — coincidence on any real roster.
  assert.strictEqual(pair(['Bob Smith'], ['Jane Smith']).length, 0,
    'one shared token is not a mismatch');
  assert.strictEqual(pair(['Maria Garcia'], ['Maria Rodriguez']).length, 0,
    'a shared FIRST name is not a mismatch either');

  // Either direction empty ⇒ nothing to pair. This is what makes the card
  // reach green: strangers in the feed with no matching roster gap are silent.
  assert.strictEqual(pair([], ['Smith, Bob', 'Al Vance']).length, 0, 'no roster gap ⇒ silent');
  assert.strictEqual(pair(['Bob Smith'], []).length, 0, 'no unmatched agents ⇒ silent');
  assert.strictEqual(pair(null, null).length, 0, 'missing inputs never throw');

  // A whole other department in the feed must not raise a single pair.
  assert.strictEqual(
    pair(['Robin Choudhury'], ['Al Vance', 'Dana Wu', 'Kim Park', 'Lee Ann Fox']).length, 0,
    'unrelated departments stay silent');
});

test('CDR: the health card tones off likelyMismatches, never the raw lists', () => {
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const src = stripComments(extractRawFunction('cn/script_callnotes.html', 'cnSetSysFromHealth_'));
  // The tone/value/sub expressions must key off the paired set. Comments are
  // stripped first: this very function EXPLAINS why the raw lists are unusable,
  // so an un-stripped scan trips on its own rationale.
  assert.ok(/likelyMismatches/.test(src), 'the card reads likelyMismatches');
  const toneLine = (src.match(/var cdrTone\s*=.*/) || [''])[0];
  assert.ok(/likely/.test(toneLine), 'cdrTone keys off the paired count');
  assert.ok(!/unmatchedAgents|rosterWithNoCdr/.test(toneLine),
    'cdrTone must NOT key off either raw direction (both are permanently non-empty)');
  // The raw counts must not drive the card's value/sub text either.
  assert.ok(!/unmatchedAgents|rosterWithNoCdr/.test(src),
    'the status card derives from likelyMismatches alone');
});

test('CDR: both name-list renders cap and SAY what was cut', () => {
  // Per-file because the shared-helper NAME differs; a loose whole-function
  // scan for the remainder text passes on the mismatch block alone (caught by
  // bite-check), so each assertion is bound to the LIST HELPER and to the two
  // raw lists routing through it.
  [['cn/script_callnotes.html', 'cnRenderHealthPanel_', 'nameList'],
   ['metrics/script_metrics.html', 'mRenderTeamMetrics_', 'mNameList_']].forEach(([file, fn, helper]) => {
    const src = extractRawFunction(file, fn);
    assert.ok(/likelyMismatches/.test(src), fn + ' surfaces the paired set');
    // The helper itself must name the remainder — never truncate silently.
    const helperBody = new RegExp(helper + ' = function[\\s\\S]{0,400}?more<\\/em>');
    assert.ok(helperBody.test(src), fn + ': ' + helper + ' names the cut remainder');
    // …and BOTH permanently-non-empty lists must go through it.
    ['unmatchedAgents', 'rosterWithNoCdr'].forEach((list) => {
      assert.ok(new RegExp(helper + '\\((?:cdr|data)\\.' + list + '\\)').test(src),
        fn + ': ' + list + ' is capped via ' + helper);
    });
    // The raw unmatched list must no longer read as a warning here.
    assert.ok(/expected when the CDR Report covers other departments/.test(src),
      fn + ' frames off-roster agents as expected, not as a fault');
  });
});

// ─── F4: the visual fixture must not REIMPLEMENT server logic ────────────────
// It used to hand-roll the queue->department fold and had already drifted (it
// omitted the per-group queues.sort()), so the screenshot showed an ordering
// the server cannot produce. The fixture now carries VERBATIM copies; these
// pins are what make "verbatim" true rather than aspirational.
test('F4: the visual fixture mirrors groupQueueRows_ and the CONFIG groups byte-for-byte', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const mock = fs.readFileSync(path.join(__dirname, '../visual/mock.js'), 'utf8');

  // Cycle-16 F10 batch: DERIVE the copied set from the fixture's own
  // DO-NOT-EDIT region instead of naming groupQueueRows_. A hand-listed pin
  // covers the copy that existed when it was written and nothing after — the
  // same shape as A2/A12, and `cnNoteCoverage_` was added to this region in
  // the very next cycle. Every function declared between the banners must be
  // byte-identical to Code.js.
  const region = mock.slice(
    mock.indexOf('VERBATIM copies from web-app/Code.js'),
    mock.indexOf('── end verbatim copies'));
  assert.ok(region.length > 0, 'the verbatim region banners are still present');
  const copied = [...region.matchAll(/^function ([A-Za-z0-9_]+)\(/gm)].map((m) => m[1]);
  assert.ok(copied.length >= 2,
    'the verbatim region should hold the copied fns (found: ' + copied.join(', ') + ')');
  copied.forEach((name) => {
    const re = new RegExp('^function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}', 'm');
    const srvFn = code.match(re);
    const mockFn = region.match(re);
    assert.ok(srvFn, name + ' is in the fixture\'s verbatim region but not in Code.js');
    assert.strictEqual(mockFn[0], srvFn[0],
      'test/visual/mock.js ' + name + ' has DRIFTED from Code.js — copy it verbatim, never paraphrase it');
  });

  // The Ungrouped sentinel the fold compares against.
  const srvUng = code.match(/const CDR_QUEUE_UNGROUPED = '([^']+)'/)[1];
  const mockUng = mock.match(/const CDR_QUEUE_UNGROUPED = '([^']+)'/)[1];
  assert.strictEqual(mockUng, srvUng, 'the Ungrouped sentinel must match');

  // The GROUPS mapping is operator-editable via Script Property, so this is
  // the half that will drift in practice.
  const norm = (b) => b.replace(/\s+/g, ' ').trim();
  const srvG = norm(code.match(/CDR_QUEUE_GROUPS: \{([\s\S]*?)\n  \},/)[1]);
  const mockG = norm(mock.match(/const MOCK_CDR_QUEUE_GROUPS = \{([\s\S]*?)\n\};/)[1]);
  assert.strictEqual(mockG, srvG,
    'the fixture group mapping has drifted from the CONFIG seed');

  // …and the fixture must actually CALL each copy rather than keep a private
  // paraphrase alongside it (the drift this whole pin exists to prevent).
  assert.ok(/groupRows: groupQueueRows_\(/.test(mock),
    'the fixture calls the shared fold instead of reimplementing it');
  assert.ok(/noteCoverage = cnNoteCoverage_\(/.test(mock),
    'the fixture calls cnNoteCoverage_ instead of inlining the percentage — the ' +
    'server returns NULL when answered is 0, an inline Math.round returns NaN');
});

// ─── F1: a declared-but-unread CONFIG key is a defect ────────────────────────
// The next reader assumes it is wired. TRAINING_/REVIEW_DIGEST_WEEKDAY looked
// like knobs for the weekly digest while the trigger hardcoded FRIDAY, so
// editing them was a silent no-op; CDR_DEPARTMENT had a doc comment claiming
// it filtered. Derived, not hand-listed (INV-179).
test('F1: every CONFIG key has a reader (dead declarations are defects)', () => {
  const strip = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const root = path.join(__dirname, '../../web-app');
  let hay = '';
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return walk(f);
    if (/\.(js|html)$/.test(e.name)) hay += strip(fs.readFileSync(f, 'utf8')) + '\n';
  });
  walk(root);

  const code = fs.readFileSync(path.join(root, 'Code.js'), 'utf8');
  const st = code.indexOf('const CONFIG = {') + 'const CONFIG = {'.length;
  let d = 1, i = st;
  while (d) { if (code[i] === '{') d++; else if (code[i] === '}') d--; i++; }
  const bodyRaw = code.slice(st, i);          // comments intact — the DEAD marker lives there
  const body = strip(bodyRaw);

  // A key is LIVE if it is read anywhere outside the CONFIG literal itself —
  // `.KEY` covers both CONFIG.X.KEY and the local-alias form
  // (`const cfg = CONFIG.SHIFT_SCHEDULE; cfg.DEFAULT`).
  const outside = hay.split(body).join('');
  // Deliberately retained, read nowhere — each must SAY so at its declaration.
  const ALLOW = { EOD_WARNING_WINDOW_MINUTES: 'documented dead; the EOD gate is hour-equality' };
  const dead = [];
  const keyRe = /^\s{2,4}([A-Z][A-Z_0-9]+)\s*:/gm;
  let m;
  while ((m = keyRe.exec(body))) {
    const k = m[1];
    if (ALLOW[k]) {
      assert.ok(new RegExp('DEAD[\\s\\S]{0,200}' + k).test(bodyRaw),
        k + ' is allowlisted as dead but its declaration does not say so');
      continue;
    }
    if (!new RegExp('\\.' + k + '\\b').test(outside)) dead.push(k);
  }
  assert.deepStrictEqual(dead, [],
    'CONFIG keys declared but never read — wire them, remove them, or allowlist with a reason');
});

// ---------------------------------------------------------------------------
// Cycle 17 — top-5 fix pins (C17-2 / C17-5 / C17-6 / C17-7). C17-1 is pinned
// by the fixed A2 scan itself (the regex now matches both attribute forms and
// styles.html contributes real obligations). All scans strip comments first
// (INV-188) — the fixes' own comments quote the code they removed.
console.log('\ncycle 17 — top-5 fix pins');

const c17strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
// Balanced-brace body of `function name(` inside an HTML partial's source.
function c17fnBody(src, name) {
  const at = src.indexOf('function ' + name + '(');
  assert.ok(at >= 0, name + ' not found');
  const open = src.indexOf('{', at);
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) return src.slice(open, i + 1); }
  }
  throw new Error('unbalanced ' + name);
}

// C17-2: updateTimeOffStatus — the ONE balance-mutating STATUS reader —
// normalizes TO.STATUS once (F8/INV-183 pattern) and compares lowercase;
// the raw cell survives only for the compensating revert + audit note.
test('C17-2: updateTimeOffStatus reads TO.STATUS once and compares lowercase', () => {
  const body = c17strip(extractRawFunction('Code.js', 'updateTimeOffStatus'));
  const rawReads = (body.match(/\[TO\.STATUS\]/g) || []).length;
  assert.strictEqual(rawReads, 1, 'TO.STATUS indexed-read must appear exactly once (normalize-once), got ' + rawReads);
  assert.ok(/oldStatusRaw\.toLowerCase\(\)/.test(body), 'the read lowercases into the comparison local');
  assert.ok(/oldStatus === 'reconciled'/.test(body), 'the S1.3 terminal guard compares lowercase');
  assert.ok(!/oldStatus\s*(?:!==|===)\s*'(?:Approved|Reconciled|Pending|Denied)'/.test(body),
    'a capitalized comparison against the normalized local remains — the pre-C17-2 shape');
  assert.ok(/setValue\(oldStatusRaw\)/.test(body), 'the compensating revert writes the RAW cell back');
  assert.ok(/oldStatus !== newStatus\.toLowerCase\(\)/.test(body),
    'the notify no-op check compares both sides normalized');
});

// C17-5: a structured {error} from the CN loaders preserves last-good notes,
// marks the round failed + un-fresh (INV-129 rule), and a failed load with NO
// last-good renders an error state — never the empty-day state (INV-175/187).
test('C17-5: CN loaders preserve last-good on {error} and mark the round failed', () => {
  const src = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  const today = c17fnBody(src, 'cnLoadToday_');
  const range = c17fnBody(src, 'cnLoadDateRange_');
  // The wipe may survive ONLY inside the not-configured (enrollment) branch.
  assert.strictEqual((today.match(/rollingNotes = \[\]/g) || []).length, 1,
    'cnLoadToday_ clears rollingNotes exactly once (the enrollment branch)');
  assert.strictEqual((range.match(/historyNotes = \[\]/g) || []).length, 1,
    'cnLoadDateRange_ clears historyNotes exactly once (the enrollment branch)');
  // Both handlers of each loader mark the failed round; success clears it.
  assert.ok((today.match(/rollingLoadFailed = true/g) || []).length >= 2,
    'cnLoadToday_ marks failure in BOTH the {error} and transport handlers');
  assert.ok(/rollingLoadFailed = false/.test(today), 'success clears the flag');
  assert.ok((today.match(/rollingEntry = null/g) || []).length >= 2,
    'a failed round is never served as fresh (both handlers null the SWR stamp)');
  assert.ok((range.match(/historyLoadFailed = true/g) || []).length >= 2,
    'cnLoadDateRange_ marks failure in BOTH handlers');
  assert.ok(/historyLoadFailed = false/.test(range), 'success clears the flag');
  assert.ok((range.match(/historyEntry = null/g) || []).length >= 2,
    'a failed range round is never served as fresh');
  // Cold-failure renders an error state, not the empty-day state.
  const stack = c17fnBody(src, 'cnRenderStack_');
  const hist = c17fnBody(src, 'cnRenderHistoryStack_');
  assert.ok(/rollingLoadFailed && \(CN_STATE\.rollingNotes \|\| \[\]\)\.length === 0/.test(stack) &&
    /errorStateHtml_/.test(stack), 'Log stack: failed-load-with-no-last-good renders errorStateHtml_');
  assert.ok(/historyLoadFailed && allNotes\.length === 0/.test(hist) &&
    /errorStateHtml_/.test(hist), 'History stack: failed-load-with-no-last-good renders errorStateHtml_');
});

// C17-6: a PHI export can never read as complete when reps were unreadable —
// the skipped set rides the response, the audit row, and the client toast.
test('C17-6: exportCallNotesRange carries skippedReps on response + audit row + toast', () => {
  const body = c17strip(extractRawFunction('Code.js', 'exportCallNotesRange'));
  assert.ok(/skippedReps\.push\(/.test(body), 'the per-rep catch collects the skipped rep');
  assert.ok(/skippedReps:\s*skippedReps\.map/.test(body), 'the success response carries skippedReps');
  assert.ok(/skippedReps=/.test(body) && /INCOMPLETE/.test(body),
    'the CallNotesExport audit note records skippedReps= and marks the export INCOMPLETE');
  assert.ok(/skippedReps\.length > 0/.test(body) && /could not read/.test(body),
    'all-skipped-no-notes returns a read-failure error, not "no notes found"');
  const cn = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  assert.ok(/res\.skippedReps && res\.skippedReps\.length > 0/.test(cn),
    'the export client surfaces the skipped list (warn toast)');
});

// C17-7: the three manager lazy cards distinguish a FAILED read from a clean/
// empty result on BOTH failure shapes (structured {error} + transport throw).
// A blank slot may mean only "genuinely nothing to show" (INV-187).
test('C17-7: manager lazy cards render an error state on both failure shapes', () => {
  const src = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8'));
  ['loadPendingAdjustments_', 'loadPtoReconciliation_', 'loadSheetDoctor_'].forEach((fn) => {
    const body = c17fnBody(src, fn);
    assert.ok((body.match(/errorStateHtml_\(/g) || []).length >= 2,
      fn + ' must render errorStateHtml_ on BOTH the {error} and transport paths');
    assert.ok(!/withFailureHandler\(function\s*\(\s*\)\s*\{\s*\}\)/.test(body),
      fn + ' still has an empty failure handler');
    assert.ok(/res && res\.error/.test(body),
      fn + ' must split res.error from the genuinely-empty render');
  });
});

// ---------------------------------------------------------------------------
// Cycle 17 batch-2 pins — the INV-187 silent-degradation stragglers. All
// source scans strip comments first (INV-188): the fixes' comments quote the
// shapes they removed.
console.log('\ncycle 17 — batch-2 (silent degradation) pins');

// C17-4: a rep-day with zero answered calls has NO average talk time, not an
// average of 0 — the per-rep-daily finalize must yield null, which both the
// team mean (v != null) and the own-point builder skip.
test('C17-4: perRepDaily attSeconds is null (absence), never 0, for an answered-nothing day', () => {
  const body = c17strip(extractRawFunction('Code.js', 'getCdrDailyBreakdown_'));
  assert.ok(/p\.attSeconds = p\._attCount > 0 \? Math\.round\(p\._attSum \/ p\._attCount\) : null/.test(body),
    'the per-rep-daily finalize must use null for absence (the pre-C17-4 literal 0 dragged the team benchmark toward 0)');
});

// C17 batch-2: every remaining cross-rep walk carries its outcome —
// skippedReps on the aggregates, partial on the badge count — and no partial
// round is ever cached (INV-129).
test('batch-2: cross-rep walks carry skippedReps and never cache a partial round', () => {
  // Per-function return-shape expectations (a generic "last return mentions
  // it" check was wrong on first write — taxonomy/trends attach the field to
  // a result object built lines above the return).
  [['managerAggregateFlagged_', /return \{ flagType, results, skippedReps \};/],
   ['managerAggregateUrgent_', /return \{ results, skippedReps \};/],
   ['managerSearchCallNotes', /return \{ results, skippedReps \};/],
   ['getCallNotesTagTaxonomy', /skippedReps: skippedReps/],
   ['getCallNotesTagTrends', /out\.skippedReps = skippedReps;/]].forEach(([fn, re]) => {
    const body = c17strip(extractRawFunction('Code.js', fn));
    assert.ok(/skippedReps\.push\(/.test(body), fn + ' collects the skipped rep in its catch');
    assert.ok(re.test(body), fn + ' carries skippedReps on its result');
  });
  const tax = c17strip(extractRawFunction('Code.js', 'getCallNotesTagTaxonomy'));
  assert.ok(/skippedReps\.length > 0/.test(tax), 'taxonomy skips the cache put on a partial round');
  const trends = c17strip(extractRawFunction('Code.js', 'getCallNotesTagTrends'));
  assert.ok(/skippedReps\.length === 0 &&/.test(trends), 'trends caches only a fully-successful round');
  const unres = c17strip(extractRawFunction('Code.js', 'managerGetUnresolvedActionCount'));
  assert.ok(/partial: skippedCount > 0/.test(unres), 'the badge count carries partial (a lower bound)');
  assert.ok(/if \(skippedCount === 0\)/.test(unres), 'a partial badge count is never cached');
  // The digests SEND on skipped-but-empty (a failed read is not an empty
  // queue) and the sender takes + renders the skipped list.
  const weekly = c17strip(extractRawFunction('Code.js', 'sendCallNotesWeeklyDigests'));
  assert.ok((weekly.match(/skippedReps/g) || []).length >= 4, 'both weekly queues gate + pass skippedReps');
  const urgent = c17strip(extractRawFunction('Code.js', 'sendCallNotesUrgentDigest'));
  assert.ok(/skippedReps/.test(urgent), 'the urgent digest gates + passes skippedReps');
  const sender = c17strip(extractRawFunction('Code.js', 'sendManagerFlagDigest_'));
  assert.ok(/skippedReps\)/.test(sender.slice(0, 200)) || /function sendManagerFlagDigest_\(toEmails, label, notes, dateRange, skippedReps\)/.test('function sendManagerFlagDigest_' + sender.slice(0, 80)),
    'sendManagerFlagDigest_ accepts the skippedReps arg');
  assert.ok(/may be incomplete/.test(sender), 'the digest body names the incompleteness');
});

// C17 batch-2 client half: the shared partial-note helper exists and the
// queue/search/admin surfaces consume it; the badge renders the lower bound;
// a failed search renders an error state (query-guarded), never stale results
// under a new label.
test('batch-2: CN client surfaces partial walks and failed searches', () => {
  const cn = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  assert.ok(/function cnSkippedRepsNoteHtml_\(/.test(cn), 'shared helper exists');
  assert.ok((cn.match(/cnSkippedRepsNoteHtml_\(/g) || []).length >= 4,
    'queue + mgr search render + admin augment consume the helper');
  assert.ok(/res\.count > 0 \|\| res\.partial/.test(cn), 'the unresolved badge renders the partial lower bound');
  ['cnFireSearch_', 'cnMgrFireSearch_'].forEach((fn) => {
    const body = c17fnBody(cn, fn);
    assert.ok((body.match(/errorStateHtml_\(/g) || []).length >= 2,
      fn + ' renders an error state on BOTH the {error} and transport paths');
    assert.ok((body.match(/!== requestedQuery\) return;/g) || []).length >= 2,
      fn + ' guards both handlers on the query still being current');
  });
});

// C17-14 / C17-15 / side rail / kbDrawer: the four sibling-branch stragglers.
test('batch-2: the four sibling-branch stragglers are closed', () => {
  const m = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8'));
  const noCdr = m.slice(m.indexOf('No call data found for'), m.indexOf('No call data found for') + 900);
  assert.ok(/noteCountUnavailable/.test(noCdr), 'C17-14: the no-CDR fallback checks noteCountUnavailable');
  const clk = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  const extras = c17fnBody(clk, 'clkLoadDashboardExtras_');
  assert.strictEqual((extras.match(/extraAt = Date\.now\(\)/g) || []).length, 1,
    'C17-15: exactly ONE freshness stamp site');
  assert.ok(/!anyFail\) CLK_DASH\.extraAt = Date\.now\(\)/.test(extras),
    'C17-15: the stamp fires only when the WHOLE round succeeded');
  const to = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_timeoff.html'), 'utf8'));
  const rail = c17fnBody(to, 'loadTimesheetSideRail_');
  assert.ok(/errorStateHtml_\(/.test(rail) && !/withFailureHandler\(\(\) => \{\}\)/.test(rail),
    'side rail: failure renders an error state, never a perpetual skeleton');
  const kb = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8'));
  const drawerItem = c17fnBody(kb, 'kbDrawerOpenItem_');
  const failIdx = drawerItem.indexOf('withFailureHandler');
  const failPart = drawerItem.slice(failIdx);
  assert.ok(/KB_DRAWER\.itemId !== id\) return;/.test(failPart) && /KB_DRAWER\.view !== 'item'\) return;/.test(failPart),
    'kbDrawerOpenItem_: the failure handler carries the L-18 stale-response guards');
  // getAdminConfig containment: the error renders into the config pane slot,
  // never the whole admin area.
  const cn = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  const adm = c17fnBody(cn, 'enterCallNotesAdminView');
  assert.ok(!/area\.innerHTML = errorStateHtml_/.test(adm),
    'a getAdminConfig failure must not wipe the whole admin area');
  assert.ok(/cn-admin-body'\);\s*if \(b\d\) b\d\.innerHTML = errorStateHtml_/.test(adm.replace(/\n\s*/g, ' ')) ||
    /getElementById\('cn-admin-body'\)/.test(adm),
    'the config failure renders into #cn-admin-body');
});

// ---------------------------------------------------------------------------
// Cycle 17 batch-3/4 pins — interface fixes + fixture-shape drifts. Source
// scans strip comments where the fix's own comment quotes removed code
// (INV-188).
console.log('\ncycle 17 — batch-3/4 pins');

// C17-8 + banner: fixed color on a theme-flipping token is the inverse of the
// V-2/INV-166 rule. The tour's only advance button was #fff on dark --accent
// (~1.4:1); the instance banner was #fff on dark-flipped --warning-deep.
test('batch-4: tour primary + instance banner obey the fixed-vs-token color rule', () => {
  const tour = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/script_tour.html'), 'utf8'));
  const prim = /\.tour-btn\.primary\s*\{[^}]*\}/.exec(tour);
  assert.ok(prim && /color:\s*var\(--paper-card\)/.test(prim[0]) && !/color:\s*#fff/.test(prim[0]),
    '.tour-btn.primary must use var(--paper-card), the accent-filled-primary convention');
  const styles = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8'));
  const banner = /\.instance-banner\s*\{[^}]*\}/.exec(styles);
  assert.ok(banner && !/background:\s*var\(--warning-deep\)/.test(banner[0]),
    '.instance-banner takes a FIXED background — the -deep token flips light in dark mode under its white text');
});

// C17-10: the training checklist header wraps at narrow viewports (the
// A2-family flex variant no grid scan can reach — this was the file's first
// media query).
test('C17-10: .tr-head has a real viewport wrap, not only the pop-out one', () => {
  const tr = fs.readFileSync(path.join(__dirname, '../../web-app/train/script_training.html'), 'utf8');
  const media = /@media[^{]*\{[\s\S]*?\n  \}/.exec(tr);
  assert.ok(media && /\.tr-head\s*\{[^}]*flex-wrap:\s*wrap/.test(media[0]),
    '.tr-head must flex-wrap inside a real @media block (the compact-only wrap left "My Training" clipped at 390px)');
});

// batch-4 a11y: the PDF⇄Fillable switch is a real button with switch
// semantics (it was a listener-bound <div> — keyboard-dead with NO other path
// to the fillable-form flow, invisible to A1 which only sees inline onclick),
// and the two CN disclosures expose aria-expanded.
test('batch-4: fillable switch + CN disclosures expose real semantics', () => {
  const cn = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  assert.ok(/<button type="button" class="cn-ext-form-mode-switch/.test(cn), 'the mode switch is a <button>');
  assert.ok(/cn-ext-form-mode-switch[\s\S]{0,400}?role="switch"/.test(cn) &&
            /cn-ext-form-mode-switch[\s\S]{0,400}?aria-checked=/.test(cn),
    'the mode switch carries role=switch + aria-checked');
  assert.ok(/data-cn-action="more" aria-expanded=/.test(cn), 'the more-menu toggle exposes aria-expanded');
  const closeFn = c17fnBody(cn, 'cnCloseMoreMenus_');
  assert.ok(/aria-expanded/.test(closeFn), 'closing the menus resets aria-expanded');
  const histFn = c17fnBody(cn, 'cnToggleAuditHistory_');
  assert.ok((histFn.match(/setAttribute\('aria-expanded'/g) || []).length >= 2,
    'the audit-history expander sets aria-expanded on both transitions');
});

// batch-3 fixture-shape pins (INV-185): the three field-name drifts the scan
// found — each meant a screenshot state the server cannot produce.
test('batch-3: visual-fixture payload shapes match the server field names', () => {
  const mock = fs.readFileSync(path.join(__dirname, '../../test/visual/mock.js'), 'utf8');
  assert.ok(/patientTRX: 'TRX-/.test(mock) && !/patientTrx:/.test(mock),
    'coaching fixture rows carry patientTRX (server casing) — the lowercase drift hid the TRX chip from every shot');
  const rd = /kbGetReviewDue:\s*\{[^\n]*\}/.exec(mock);
  assert.ok(rd && /views:/.test(rd[0]) && !/usage30/.test(rd[0]) && /total:/.test(rd[0]),
    'kbGetReviewDue fixture uses `views` + carries total (the F18 cap-note path is renderable)');
  assert.ok(/kbGetContentRequests:\s*\{ open: \[/.test(mock),
    'kbGetContentRequests fixture uses the real {open, resolved, openCount} shape');
});

// ---------------------------------------------------------------------------
// Cycle 17 batch-5 pins — server-hardening stragglers (consistency of
// established patterns). Comment-stripped per INV-188.
console.log('\ncycle 17 — batch-5 pins');

test('C17-12: form_public conditional sections clear on hide (attested-record hygiene)', () => {
  const fp = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/form_public.html'), 'utf8'));
  assert.ok(/function clearHiddenSection\(/.test(fp), 'the clear helper exists');
  assert.ok((fp.match(/clearHiddenSection\(/g) || []).length >= 4,
    'all three conditional toggles (signer / govAssist / guardian) clear on hide');
});

test('C17-11: a mixed split-send that half-fails still books the delivered half', () => {
  const body = c17strip(extractRawFunction('Code.js', 'emailFromCallNote'));
  assert.ok(/internalSent = true;/.test(body), 'the internal copy send is tracked');
  assert.ok(/if \(!internalSent\)/.test(body) && /externalSendFailed = sendErr\.message/.test(body),
    'a failure AFTER the internal copy falls through to the bookkeeping instead of returning');
  assert.ok(/externalCopyFailed/.test(body), 'the CallNoteEmail audit row marks the partial send');
  assert.ok(/warning:/.test(body) && /do NOT re-send the whole email/.test(body),
    'the partial return warns the rep against duplicating the dept copy');
  const cn = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8'));
  assert.ok(/res\.warning\) showToast\(res\.warning, 'toast-warn'\)/.test(cn),
    'the client surfaces the partial-send warning');
});

test('C17-13: intake condition custom-add blocks LEADING negation tokens', () => {
  const ik = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/intake/script_intake.html'), 'utf8'));
  assert.ok(/negTok = val\.toLowerCase\(\)\.split\(/.test(ik), 'the check keys off the first token');
  ['none', 'nothing', 'denies', 'negative'].forEach((w) => {
    assert.ok(new RegExp("'" + w + "'").test(ik), 'negation vocabulary includes ' + w);
  });
});

test('batch-5: the last uncapped client-writable cells are bounded + validated', () => {
  const tok = c17strip(extractRawFunction('Code.js', 'createFormToken'));
  assert.ok(/slice\(0, 200\)/.test(tok), 'recipientName capped');
  assert.ok(/prefillJson\.length > 20000/.test(tok) && /Object\.keys\(prefillData\)\.length > 50/.test(tok),
    'prefillData bounded BEFORE the append (INV-96 spirit)');
  const sub = c17strip(extractRawFunction('Code.js', 'submitFormByToken'));
  assert.ok(/signatureData && !\/\^data:image/.test(sub),
    'the signature must be validated as a data:image URL (closes the remote-fetch channel)');
  const to1 = c17strip(extractRawFunction('Code.js', 'submitTimeOffRequest'));
  const to2 = c17strip(extractRawFunction('Code.js', 'managerSubmitTimeOff'));
  assert.ok(/slice\(0, 1000\)/.test(to1) && /slice\(0, 1000\)/.test(to2), 'time-off notes capped on both paths');
});

test('batch-5: dept-email config is sanitized on read and comma-safe on write', () => {
  const get = c17strip(extractRawFunction('Code.js', 'getDepartmentEmails_'));
  assert.ok(/clean\[name\] = email/.test(get) && /indexOf\('@'\) > 0/.test(get),
    'getDepartmentEmails_ whitelist-rebuilds on read (the L-12 rule)');
  const save = c17strip(extractRawFunction('Code.js', 'saveDepartmentEmails'));
  assert.ok(/\[,;\]/.test(save), 'saveDepartmentEmails rejects comma/semicolon dept names (the join-on-comma shape)');
});

test('batch-5: capped/annotated list contracts (INV-169) + search hit status + cache-buster', () => {
  const il = c17strip(extractRawFunction('Code.js', 'intakeListMySubmissions'));
  assert.ok(/total: total, cap: INTAKE_LIST_CAP_/.test(il), 'the intake Sent list returns its pre-slice total');
  const ik = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/intake/script_intake.html'), 'utf8'));
  assert.ok(/sentTotal/.test(ik) && /list capped/.test(ik), 'the client renders the cap note');
  const sr = c17strip(extractRawFunction('Code.js', 'searchReference'));
  assert.strictEqual((sr.match(/status: status,/g) || []).length, 3,
    'all three hit pushes carry the item status (draft legibility for admins)');
  const kb = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8'));
  assert.ok(/g\.status === 'draft'/.test(kb), 'the chunk-group header renders the Draft pill');
  const code = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8'));
  assert.ok(/indexOf\('\?'\) >= 0 \? '&v=' : '\?v='/.test(code),
    'the intake image cache-buster respects an existing query string');
});


// ---------------------------------------------------------------------------
// Cycle 17 batch-6 pins — structural/growth: lock amplification, the
// unknown-punch-type lockout, the Spanish scan cap, the manager fan-in seq
// tokens, and the dead-CSS cluster staying deleted. All scans strip comments
// first (INV-188).
console.log('\ncycle 17 — batch-6 pins');

test('C17-9: managerSaveDayRange is one-read indexed; the mirror memoizes its handle', () => {
  const range = c17strip(extractRawFunction('Code.js', 'managerSaveDayRange'));
  assert.ok(/buildAdjustPunchIndex_\(/.test(range), 'the range edit builds ONE Timesheet index for the whole run');
  assert.ok(/'multi-day edit', ctx\)/.test(range), 'the range edit passes the ctx into every punch write');
  const wr = c17strip(extractRawFunction('Code.js', 'writeAdjustPunchForEmployee_'));
  assert.ok(/actorEmail, reason, ctx\)/.test(wr), 'writeAdjustPunchForEmployee_ takes the optional ctx');
  assert.strictEqual((wr.match(/findExistingPunch_\(/g) || []).length, 1,
    'exactly one findExistingPunch_ call — the no-ctx single-punch path');
  assert.ok(/: findExistingPunch_\(/.test(wr), 'findExistingPunch_ is the ctx-absent branch of the ternary');
  const idx = c17strip(extractRawFunction('Code.js', 'buildAdjustPunchIndex_'));
  assert.ok(/idx\[d \+ '\|' \+ normalizeType_\(String\(rows\[i\]\[ADP\.COMMENTS\]\)\)\] = i \+ 1/.test(idx),
    'index assignment is unconditional — LAST match wins (the findExistingPunch_/INV-155 agreement)');
  assert.ok(!/break/.test(idx), 'the index scan never breaks on first match');
  // The personal-sheet mirror opened the SAME spreadsheet by id once per punch
  // (~124 openById round-trips inside the global lock on a full range edit).
  ['writeToEmployeeSheet_', 'clearFromEmployeeSheet_'].forEach((fn) => {
    const b = c17strip(extractRawFunction('Code.js', fn));
    assert.ok(/openPersonalSs_\(/.test(b), fn + ' routes through the per-execution handle memo');
    assert.ok(!/SpreadsheetApp\.openById\(/.test(b), fn + ' has no bare openById');
  });
});

test('batch-6: an unknown punch type is not a state — getNextActions_ skips it (behavioral)', () => {
  const src = extractRawFunction('Code.js', 'getNextActions_');
  const nctx = vm.createContext({ PUNCH_LABELS_: ['ClockIn', 'LunchOut', 'LunchIn', 'ClockOut'] });
  vm.runInContext(src, nctx, { filename: 'Code.js#getNextActions_' });
  // A hand-edited/garbage COMMENTS row appended AFTER a real punch used to
  // become the "state": next actions collapsed to ['Adjust'] and the INV-155
  // live sequence guard then rejected every legitimate punch all day.
  // JSON-compare: the vm context's arrays are cross-realm, and deepStrictEqual
  // compares prototype IDENTITY — a realm mismatch fails on identical values.
  const na = (p) => JSON.stringify(nctx.getNextActions_(p));
  assert.strictEqual(na([{ type: 'ClockIn' }, { type: 'Garbage' }]),
    '["LunchOut","ClockOut","Adjust"]', 'a garbage row after ClockIn no longer locks the rep out');
  assert.strictEqual(na([{ type: 'Garbage' }]),
    '["ClockIn","Adjust"]', 'a garbage-only day reads as not-clocked-in');
  assert.strictEqual(na([{ type: 'ClockOut' }]), '["Adjust"]', 'done-state unchanged');
  assert.strictEqual(na([]), '["ClockIn","Adjust"]', 'fresh-day unchanged');
});

test('batch-6: the Spanish readers report their scan cap (INV-169) and the tab renders it', () => {
  ['getSpanishInboxStats', 'getSpanishInboxPending', 'getSpanishInboxResolved'].forEach((fn) => {
    const b = c17strip(extractRawFunction('Code.js', fn));
    assert.ok(/GmailApp\.search\([\s\S]*?SPANISH_THREAD_SCAN_MAX\)/.test(b), fn + ' searches via the named cap');
    assert.ok(!/, 0, 200\)/.test(b), fn + ' has no bare 200 literal');
    assert.ok(/truncated: threads\.length >= SPANISH_THREAD_SCAN_MAX/.test(b), fn + ' reports truncation');
  });
  const m = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8'));
  assert.ok(/function spanishTruncNote_\(/.test(m), 'the client has the shared truncation note');
  assert.ok((m.match(/spanishTruncNote_\((d|pd|rd)\)/g) || []).length >= 5,
    'the stats note + both combined-list sections consume it');
});

test('batch-6: the three manager fan-ins carry same-view seq tokens (INV-156)', () => {
  [['train/script_training.html', 'trainLoadMgr_', 'TRAIN_STATE.mgrSeq', 5],
   ['train/script_empdocs.html', 'edLoadMgr_', 'ED_STATE.mgrSeq', 3],
   ['train/script_coaching.html', 'coachLoadMgr_', 'COACH_STATE.mgrSeq', 2]].forEach(([file, fn, tok, rpcs]) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + file), 'utf8');
    const body = c17strip(c17fnBody(src, fn));
    assert.ok(body.indexOf(tok + ' = (' + tok + ' || 0) + 1') >= 0, fn + ' bumps ' + tok);
    const handlers = (body.match(/\.withSuccessHandler\(/g) || []).length;
    assert.ok(handlers >= rpcs, fn + ' fires its ' + rpcs + ' RPCs');
    // Every success handler guards the STATE WRITE (not just the render) —
    // a stale round-1 response must not overwrite a field after round 2
    // rendered; the view guard alone can't stop it (same view key).
    const checks = (body.match(new RegExp('seq !== ' + tok.replace('.', '\\.'), 'g')) || []).length;
    assert.ok(checks >= rpcs + 2, fn + ' guards every handler + done + onFail (got ' + checks + ')');
  });
});

test('batch-6: the dead pre-Dashboard CSS clusters stay deleted (INV-184)', () => {
  const css = c17strip(fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8'));
  ['hero-clock', 'actions-grid', 'action-btn', 'ledger', 'ts-summary', 'leave-balance-row',
   'lb-card', 'lb-val', 'lb-unit', 'ts-stat', 'day-card', 'day-list', 'pt-chip',
   'btn-clockin', 'btn-lunchout', 'btn-lunchin', 'btn-clockout', 'btn-adjust'].forEach((cls) => {
    const re = new RegExp('(?<![\\w-])\\.' + cls + '(?![\\w-])');
    assert.ok(!re.test(css), '.' + cls + ' selector reappeared in styles.html — zero markup emits it');
  });
  // The dead thin wrapper (A4 precedent: dead function + its doc mention go together).
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(cn.indexOf('cnLoadDate_') < 0, 'cnLoadDate_ stays removed');
});


// ---------------------------------------------------------------------------
// Cycle 17 batch-7 pins — visual-lens expansion. The harness is not in CI, but
// its SCAFFOLDING is pinnable: the forced-failure hook, the scenario coverage
// the Visual Audit Stage now claims, and the Admin fixture's top-level shape
// DERIVED from the server's own return site (INV-185/179 — a fixture key list
// hand-copied here would drift exactly like the fixtures it checks).
console.log('\ncycle 17 — batch-7 pins');

test('batch-7: the visual mock has the forced-failure hook and it precedes fixture lookup', () => {
  const mock = fs.readFileSync(path.join(__dirname, '../../test/visual/mock.js'), 'utf8');
  const m = c17strip(mock);
  assert.ok(/failrpc=/.test(m), 'mock parses ?failrpc= from the page query');
  const failAt = m.indexOf('FAIL_RPCS.indexOf(name) >= 0');
  const fxAt = m.indexOf('var fx = FIXTURES[name]');
  assert.ok(failAt >= 0 && fxAt >= 0 && failAt < fxAt,
    'the forced failure fires BEFORE fixture lookup (a failed RPC is not a missing fixture)');
});

test('batch-7: the scenario matrix covers admin + dark parity + error states', () => {
  const shoot = c17strip(fs.readFileSync(path.join(__dirname, '../../test/visual/shoot.mjs'), 'utf8'));
  assert.ok(/'admin-light-wide'/.test(shoot) && /'admin-dark-wide'/.test(shoot),
    'the Admin panel is in the matrix at both themes');
  ['reference-dark-wide', 'training-dark-wide', 'coaching-dark-wide'].forEach((n) => {
    assert.ok(shoot.indexOf("'" + n + "'") >= 0, n + ' dark-parity scenario present');
  });
  assert.ok((shoot.match(/\?failrpc=/g) || []).length >= 3, 'at least three error-state scenarios');
});

test('batch-7: the getAutomationHealth fixture mirrors the server return keys (INV-185, derived)', () => {
  // Derive the server's top-level return keys from computeAutomationHealth_'s
  // final return block — never a hand list (INV-179).
  const body = c17strip(extractRawFunction('Code.js', 'computeAutomationHealth_'));
  const retAt = body.lastIndexOf('return {');
  assert.ok(retAt >= 0, 'server return block found');
  const open = body.indexOf('{', retAt);
  let d = 0, end = open;
  for (let i = open; i < body.length; i++) {
    if (body[i] === '{') d++;
    else if (body[i] === '}') { d--; if (d === 0) { end = i; break; } }
  }
  const retBlock = body.slice(open, end + 1);
  const keys = [];
  retBlock.replace(/^\s*([A-Za-z_][A-Za-z0-9_]*):/gm, (all, k) => { keys.push(k); return all; });
  assert.ok(keys.length >= 8, 'derived a real key set (got ' + keys.length + ')');
  const mock = fs.readFileSync(path.join(__dirname, '../../test/visual/mock.js'), 'utf8');
  const fxAt = mock.indexOf('getAutomationHealth: {');
  assert.ok(fxAt >= 0, 'mock has the getAutomationHealth fixture');
  const fxRegion = mock.slice(fxAt, mock.indexOf('getStorageHealth:', fxAt));
  keys.forEach((k) => {
    assert.ok(new RegExp('(^|[\\s{,])' + k + ':').test(fxRegion),
      'fixture carries the server key `' + k + '` — the Admin scenario cannot render a shape the server does not ship');
  });
});


// ---------------------------------------------------------------------------
// Operator-feedback 2026-08-06 pins — the pop-out fit-to-template pass and the
// combined color-coded Spanish / Dept Requests status views.
console.log('\noperator feedback 2026-08-06 pins');

test('pop-out fit: compact-only, popup-only, once, clamped, wired into the Log render', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const body = c17strip(c17fnBody(cn, 'cnPopoutFitToTemplate_'));
  assert.ok(/COMPACT_MODE/.test(body), 'fit runs only in compact mode');
  assert.ok(/umsTeamToolsCompact_/.test(body), 'fit runs only in the named pop-out window (resizeTo is popup-only)');
  assert.ok(/__cnPopoutFitDone/.test(body), 'fit runs once per window session');
  assert.ok(/screen\.availHeight/.test(body) && /screen\.availWidth/.test(body), 'target size is clamped to the screen');
  assert.ok(/resizeTo\(/.test(body), 'the pass actually resizes');
  assert.ok(/\.cnv-layout/.test(body), 'the fit measures the TEMPLATE block (form + rail), not the whole page');
  const stripped = c17strip(cn);
  assert.ok(/cnRenderStack_\(\);\s*cnPopoutFitToTemplate_\(\);/.test(stripped),
    'the Log render path invokes the fit after the frame is built');
});

test('Spanish combined view: fan-in with guarded state writes, tones defined + wired', () => {
  const m = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  const loader = c17strip(c17fnBody(m, 'spanishLoadList_'));
  assert.ok(/getSpanishInboxPending/.test(loader) && /getSpanishInboxResolved/.test(loader),
    'the combined loader fetches BOTH lists');
  assert.ok((loader.match(/seq !== SPANISH_STATE\.listSeq/g) || []).length >= 4,
    'every handler guards the STATE WRITE with the seq token (INV-156 fan-in)');
  const ms = c17strip(m);
  assert.ok(/SPANISH_OVERDUE_HOURS = 24/.test(ms), 'the overdue threshold is a named constant');
  const tone = c17strip(c17fnBody(m, 'spanishPendingToneCls_'));
  assert.ok(/>= SPANISH_OVERDUE_HOURS/.test(tone) && /st-overdue/.test(tone) && /st-pending/.test(tone),
    'pending tone flips to overdue at the threshold');
  assert.ok(/st-resolved/.test(c17strip(c17fnBody(m, 'spanishResolvedCard_'))), 'resolved cards carry the green tone');
  // The INV-178-reverse check: a tone class USED must also be DEFINED — in
  // styles.html since the vocabulary became SHARED with Dept Requests.
  const sharedCss = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  ['st-resolved', 'st-pending', 'st-atrisk', 'st-overdue'].forEach((cls) => {
    assert.ok(new RegExp('\\.sp-task\\.' + cls + '\\s*\\{').test(sharedCss),
      '.sp-task.' + cls + ' is defined in the SHARED stylesheet');
  });
});

test('Dept Requests: Spanish-vocabulary cards, SLA-driven tones, filter chips refetch-free', () => {
  const d = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_deptrequests.html'), 'utf8');
  const tone = c17strip(c17fnBody(d, 'drRowToneCls_'));
  assert.ok(/st-resolved/.test(tone) && /st-overdue/.test(tone) && /st-atrisk/.test(tone) && /st-pending/.test(tone),
    'the tone map covers resolved / overdue / at-risk / open');
  assert.ok(/slaStatus/.test(tone), 'open tones ride the existing per-dept SLA machinery, not a new constant');
  // Operator feedback 2026-08-06 round 2 — the view renders the SHARED
  // .sp-task status cards (the Spanish Inbox vocabulary), not bespoke rows.
  const card = c17strip(c17fnBody(d, 'drRequestCardHtml_'));
  assert.ok(/sp-task /.test(card) && /drRowToneCls_\(item\)/.test(card),
    'every request renders as a shared status card carrying its tone class');
  assert.ok(/sp-task-head/.test(card) && /sp-task-subj/.test(card) && /sp-task-actions|resolveBtn/.test(card),
    'the card uses the shared head/subject/actions slots');
  assert.ok(!/dr-row/.test(c17strip(d)), 'the bespoke .dr-row shape stays retired (INV-184)');
  assert.ok(/class="telemetry"/.test(d), 'the view carries the Spanish-style KPI telemetry strip');
  const setF = c17strip(c17fnBody(d, 'drSetFilter_'));
  assert.ok(/DR_LAST_DATA/.test(setF) && !/google\.script\.run/.test(setF),
    'a filter chip re-renders from the cached payload — never a refetch');
  assert.ok(/data-dr-filter/.test(d) && /aria-pressed/.test(d), 'the chips carry pressed state (A11)');
  // Round 3 — the DEPARTMENT filter: multi-select, empty = all (the default
  // view), refetch-free, and matching a multi-dept send by COMPONENT (the
  // INV-138 drSplitDepts_ shape — never the raw joined "Billing, Shipping").
  const dtog = c17strip(c17fnBody(d, 'drToggleDeptFilter_'));
  assert.ok(/DR_DEPT_FILTER = \[\]/.test(dtog) && /splice/.test(dtog) && /push/.test(dtog),
    'dept chips toggle a multi-select set; the All chip clears it');
  assert.ok(!/google\.script\.run/.test(dtog), 'a dept chip never refetches');
  const dmatch = c17strip(c17fnBody(d, 'drDeptMatch_'));
  assert.ok(/if \(!DR_DEPT_FILTER\.length\) return true/.test(dmatch),
    'an empty selection shows ALL departments (the default view)');
  assert.ok(/drDeptsOf_/.test(dmatch), 'matching is per split component');
  assert.ok(/split\(\/\[,;\]\//.test(c17strip(c17fnBody(d, 'drDeptsOf_'))),
    'components split on the drSplitDepts_ delimiters');
  assert.ok(/data-dr-dept/.test(d), 'the dept chips render');
  ['drDeptMatch_'].forEach(() => {});
  // Every card list consumes the filter (mine + incoming + team-wide + stats).
  assert.ok((c17strip(d).match(/filter\(drDeptMatch_\)/g) || []).length >= 3,
    'mine, incoming, and the team-wide list all pass through the dept filter');
});

// ── Operator metrics improvements #1–#10 (2026-08-06) ───────────────────────
console.log('\nmetrics — operator improvements #1–#10');

// Comment-stripped (INV-188 — several of these fixes have explanatory comments
// that quote the shapes they replaced).
const mopStrip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const mopPartial = mopStrip(fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8'));
const mopCode = mopStrip(fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8'));
const mopFn = (src, name, nextName) => {
  const a = src.indexOf('function ' + name + '(');
  assert.ok(a >= 0, name + ' exists');
  const b = nextName ? src.indexOf('function ' + nextName + '(', a) : -1;
  return b > a ? src.slice(a, b) : src.slice(a, a + 4000);
};

test('#1: range mode fills the you-vs-team section instead of dropping it', () => {
  assert.ok(/id="m-my-trends"/.test(mopPartial), 'range render emits the placeholder');
  const fill = mopFn(mopPartial, 'mFillRangeTrends_', 'mBestWorstDays_');
  assert.ok(/viewCacheFresh_/.test(fill), 'cache-first — the Yesterday preset already warmed the SWR cache');
  assert.ok(/seq !== M_STATE\.mySeq/.test(fill), 'a stale background response is dropped (INV-156)');
  // Operator 2026-08-17: the single-day preset moved to the previous workday,
  // and the fill follows it so cache reuse holds (fetching today would be a
  // second cold read of a day that has no CDR data anyway).
  assert.ok(/getMyMetrics\(day\)/.test(fill), 'the fill source is the previous-workday payload');
  assert.ok(/rangeMode: true/.test(fill), 'the section heading names its own (trailing-30d) window');
});

test('#2: unified time controls — pressed-state presets + Custom disclosure; the old chip class is retired', () => {
  assert.ok(!/m-preset-chip/.test(mopPartial), '.m-preset-chip is fully retired (INV-184 — no dead selectors, no zombie callers)');
  assert.ok(/function mTeamActivePreset_/.test(mopPartial), 'Team presets carry an active state (they had none)');
  assert.ok((mopPartial.match(/data-team-preset/g) || []).length >= 2, 'team chips are stateful (aria-pressed synced by key)');
  const chip = mopFn(mopPartial, 'mCustomChip_', 'mCustomRowOpen_');
  assert.ok(/aria-expanded/.test(chip) && /aria-controls/.test(chip) && /aria-pressed/.test(chip),
    'the Custom chip is a proper disclosure AND a state chip (INV-174)');
  const tog = mopFn(mopPartial, 'mToggleCustom_', 'mLoadMyStats_');
  assert.ok(/setAttribute\('aria-expanded'/.test(tog), 'the toggle keeps aria-expanded in step');
  // Both custom rows exist and render hidden-by-default markup.
  assert.ok(/id="m-my-custom"/.test(mopPartial) && /id="m-team-custom"/.test(mopPartial), 'both tabs carry the Custom row');
  // MEASURED on the first shoot: `.m-controls { display:flex }` out-specifies
  // the UA's `[hidden] { display:none }`, so without this rule the rows render
  // visible with a preset active — the hidden attribute alone is not enough.
  assert.ok(/\.m-custom-row\[hidden\]\s*\{\s*display:\s*none/.test(mopPartial),
    'the [hidden] attribute actually hides the flex row (specificity fix)');
});

test('#3: the two permanently-non-empty CDR reference lists fold behind a disclosure; the actionable warning stays out', () => {
  const render = mopFn(mopPartial, 'mRenderTeamMetrics_', 'mToggleDiag_');
  const likely = render.indexOf('likelyMismatches');
  const diag = render.indexOf('var diagBits');
  assert.ok(likely >= 0 && diag > likely, 'likelyMismatches renders BEFORE (outside) the disclosure — it is the signal (INV-186)');
  assert.ok(/diagBits \+=/.test(render), 'the reference lists assemble into the disclosure body');
  assert.ok(render.indexOf('unmatchedAgents', diag) > 0 && render.indexOf('rosterWithNoCdr', diag) > 0,
    'both info lists live inside the folded body');
  const dtog = mopFn(mopPartial, 'mToggleDiag_', 'mRepDrill_');
  assert.ok(/setAttribute\('aria-expanded'/.test(dtog) && /M_STATE\.diagOpen/.test(dtog),
    'aria kept in step + state survives sort re-renders');
});

test('#4: the alert threshold is server-shipped (never client-mirrored) and drives banding + the target line', () => {
  // Four ships since 2026-08-12: the three Metrics endpoints plus
  // getDashboardMetrics, whose KPI banding uses the same operator-set target.
  const ships = (mopCode.match(/alertThreshold: CONFIG\.CDR_ALERT_THRESHOLD \|\| 85/g) || []).length;
  assert.strictEqual(ships, 4, 'every threshold-banding endpoint ships CONFIG.CDR_ALERT_THRESHOLD');
  // No client mirror: the partial must not hardcode 85 as a fallback — absent
  // field (a ≤5-min stale cached payload) degrades to the LEGACY behavior.
  assert.ok(!/alertThreshold \|\| 85|thr \|\| 85/.test(mopPartial), 'the client never invents its own 85');
  // Behavioral: banding follows the shipped threshold; legacy 80 when absent.
  const mPctClass_ = loadFunction(sb, 'metrics/script_metrics.html', 'mPctClass_');
  assert.strictEqual(mPctClass_(84), 'm-pct-high', 'absent threshold → legacy 80 band (old cached payloads)');
  assert.strictEqual(mPctClass_(84, 85), 'm-pct-mid', 'below the shipped threshold is NOT green');
  assert.strictEqual(mPctClass_(85, 85), 'm-pct-high', 'at threshold is green');
  assert.strictEqual(mPctClass_(49, 85), 'm-pct-low', 'mid band floor stays 50');
  assert.strictEqual(mPctClass_(null, 85), '', 'null stays unclassed');
  // Behavioral: the spark target line renders only when passed, and the
  // y-domain EXTENDS to include a target above every data point (otherwise
  // the line lands outside the viewBox and silently vanishes).
  const mBuildHeroSparkSvg_ = loadFunction(sb, 'metrics/script_metrics.html', 'mBuildHeroSparkSvg_');
  const trend = [{ date: 'a', pctAnswered: 40 }, { date: 'b', pctAnswered: 50 }];
  const withT = mBuildHeroSparkSvg_(trend, 'pctAnswered', null, 100);
  assert.ok(/m-spark-target/.test(withT), 'target line renders when a threshold is passed');
  assert.ok(/y1="4\.0"/.test(withT), 'the domain includes the target (100 maps to the top pad, not off-canvas)');
  assert.ok(!/m-spark-target/.test(mBuildHeroSparkSvg_(trend, 'pctAnswered', null, null)),
    'no threshold → no line (old server / stale cache)');
});

test('#5: transfer rail rows are null-guarded — absence is not zero (INV-180)', () => {
  assert.ok(/if \(data\.transfer != null\)/.test(mopPartial), 'My Stats renders the row only when the scalar exists');
  assert.ok(/data\.transferMeta && data\.transferMeta\.available && t\.transferred != null/.test(mopPartial),
    'Team renders it only when the Transfer read SUCCEEDED (INV-175 — a failed read is not "0 transfers")');
  // Server side: the team pct carries its own denominator or is null (INV-129).
  assert.ok(/transferMeta\.available && teamTotals\.transferCalls > 0/.test(mopCode),
    'teamTotals.transferPct is null without its own-sheet denominator');
  // getMyMetricsRange reads the transfer aggregate best-effort (thrown → null
  // + uncacheable; reader meta.error → absent-but-cacheable steady state).
  const rangeFn = mopStrip(extractRawFunction('Code.js', 'getMyMetricsRange'));
  assert.ok(/getCsrTransferPerRepDaily_\(from, to, \[emp\.name\]\)/.test(rangeFn), 'range endpoint reads own transfer aggregate');
  assert.ok(/transferThrew = true/.test(rangeFn), 'a thrown transfer read marks the round partial');
});

test('#6: the coverage CTA is gated to single-day TODAY and rides the CLK_NAV_HINT mechanism', () => {
  assert.ok(/!isRange && data\.date === mTodayIso_\(\) && missing > 0/.test(mopPartial),
    'CTA only where the CN Log view (today-only) can actually show the work');
  const cta = mopFn(mopPartial, 'mCoverageCta_', 'mFillRangeTrends_');
  assert.ok(/fileMissingCalls_/.test(cta), 'reuses the Clock strip mechanism (CLK_NAV_HINT), not a bare nav');
  assert.ok(/class="m-cta-link"/.test(mopPartial) && /<button type="button" class="m-cta-link"/.test(mopPartial),
    'the CTA is a real button with link treatment (INV-173 / V-12)');
});

test('#7: best/worst day helper — behavioral', () => {
  const mBestWorstDays_ = loadFunction(sb, 'metrics/script_metrics.html', 'mBestWorstDays_');
  const mDowShort_ = loadFunction(sb, 'metrics/script_metrics.html', 'mDowShort_');
  const t = [
    { date: '2026-08-01', pctAnswered: 78.4 },
    { date: '2026-08-02', pctAnswered: null },      // no-data day skipped
    { date: '2026-08-03', pctAnswered: 96.2 },
    { date: '2026-08-04', pctAnswered: 96.2 },      // tie — first occurrence wins
  ];
  const bw = mBestWorstDays_(t);
  assert.strictEqual(bw.best.date, '2026-08-03', 'best found; tie keeps the FIRST occurrence (stable)');
  assert.strictEqual(bw.worst.date, '2026-08-01', 'worst found');
  assert.strictEqual(mBestWorstDays_([{ date: 'x', pctAnswered: 90 }]), null, 'a single data day names no outliers');
  assert.strictEqual(mBestWorstDays_([{ date: 'x', pctAnswered: null }, { date: 'y' }]), null, 'all-null → null');
  assert.strictEqual(mDowShort_('2026-08-03'), 'Mon', 'weekday derived UTC-noon-anchored (DST-safe)');
});

test('#8: multi-day team trend is span-capped + best-effort; the delta names its comparison', () => {
  const teamFn = mopStrip(extractRawFunction('Code.js', 'getTeamMetrics'));
  assert.ok(/rangeSpan >= 2 && rangeSpan <= 92/.test(teamFn),
    'the extra per-day scan is span-capped (getTeamMetrics has no overall cap)');
  // The range-trend read is inside its own try/catch (INV-67 posture): a
  // throw degrades to no sparkline, never a failed team table.
  const elseIdx = teamFn.indexOf('rangeSpan');
  assert.ok(teamFn.slice(elseIdx - 400, elseIdx + 900).indexOf('try {') >= 0 &&
            /catch \(eRt\) \{ trendData = null; \}/.test(teamFn),
    'a failed range-trend read leaves trend null (pre-#8 shape)');
  assert.ok(/period daily average/.test(mopPartial) && /30-day team average/.test(mopPartial),
    'the client delta names which average a multi-day vs single-day trend compares against');
});

test('#9: rep drill-through is a real button riding data-* attributes', () => {
  assert.ok(/<button type="button" class="m-rep-link" data-rep="/.test(mopPartial),
    'the rep cell is a <button> (INV-173), ids in data-* (the audit-panel discipline)');
  const drill = mopFn(mopPartial, 'mRepDrill_', 'mTeamTableTsv_');
  assert.ok(/getAttribute\('data-rep'\)/.test(drill) && /cnAuditDrillToNote_/.test(drill),
    'the handler reads dataset attributes and reuses the existing drill path');
});

test('#10: TSV builder — plain values, scope-aware, unknown is not 0 (behavioral)', () => {
  loadFunction(sb, 'metrics/script_metrics.html', 'mSortReps_');   // dependency
  const mTeamTableTsv_ = loadFunction(sb, 'metrics/script_metrics.html', 'mTeamTableTsv_');
  const data = {
    reps: [
      { repName: 'Nina Patel', totalRung: 52, totalAnswered: 44, totalMissed: 8, pctAnswered: 84.6,
        attSeconds: 238, attFormatted: '0:03:58', noteCount: 41, noteCoverage: 93, transferred: 21 },
      { repName: 'Leo Kim', totalRung: 29, totalAnswered: 27, totalMissed: 2, pctAnswered: 93.1,
        attSeconds: 260, attFormatted: '0:04:20', noteCount: 0, noteCountUnavailable: true, noteCoverage: null, transferred: 3 },
    ],
    queueRows: [{ queue: 'A_Q_Sales', transferred: 6, reps: 2 }],
    groupRows: [{ group: 'Sales', transferred: 6, queues: ['A_Q_Sales'], reps: 2 }],
  };
  const tsv = mTeamTableTsv_(data, 'combined', { key: 'pctAnswered', dir: 'desc' });
  const lines = tsv.split('\n');
  assert.strictEqual(lines[0], ['Rep', 'Rung', 'Answered', 'Missed', '% Ans', 'ATT', 'Notes', 'Coverage', 'Transfers'].join('\t'));
  assert.ok(lines[1].indexOf('Leo Kim') === 0, 'rows follow the CURRENT sort (93.1 desc first)');
  assert.strictEqual(lines[1].split('\t')[6], '', 'an unreadable notes Sheet exports as BLANK, never 0 (INV-187)');
  assert.strictEqual(lines[1].split('\t')[7], '', 'null coverage exports blank');
  assert.ok(tsv.indexOf('<') === -1, 'plain values only — never HTML');
  const qTsv = mTeamTableTsv_(data, 'queue', null);
  assert.strictEqual(qTsv.split('\n')[0], 'Queue\tTransferred\tReps');
  const gTsv = mTeamTableTsv_(data, 'dept', null);
  assert.strictEqual(gTsv.split('\n')[1], 'Sales\t6\t1\t2', 'dept scope exports the member-queue COUNT');
  // No Transfers column when the range produced no queue rows.
  const noQ = mTeamTableTsv_({ reps: data.reps, queueRows: [] }, 'combined', null);
  assert.ok(noQ.split('\n')[0].indexOf('Transfers') === -1, 'Transfers column only when transfer data exists');
});

// ── Operator follow-ups (2026-08-06, round 2) ───────────────────────────────
console.log('\noperator follow-ups: dashboard cohort + list-swap motion');

test('Dashboard team card shows the aggregate at any cohort; the My Stats series guard stays 3', () => {
  const strip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const dash = strip(extractRawFunction('Code.js', 'getDashboardMetrics'));
  assert.ok(/var MIN_COHORT = 1;/.test(dash),
    'the operator decision: the Dashboard card renders team data whenever anyone reported');
  // The key bumps with every payload-semantics change (v2 = cohort hide
  // dropped; v3 = prev/thresholds added) — a stale entry must never serve the
  // previous contract for the TTL after a deploy.
  assert.ok(/dash_metrics_v3:/.test(dash) && !/dash_metrics_v[12]:/.test(dash),
    'the cache key bumped with the payload semantics');
  // The decision is SCOPED: the per-day anonymized series (the back-solvable
  // peer-benchmark surface) keeps its N=3 guard — INV-124 proper.
  const my = strip(extractRawFunction('Code.js', 'getMyMetrics'));
  assert.ok(/var MIN_COHORT = 3;/.test(my), 'getMyMetrics keeps the INV-124 N=3 series guard');
  // Client: the hidden-below-N message is gone (team:null now means no data).
  const clock = strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  assert.ok(!/Team data hidden/.test(clock), 'the cohort-hide message no longer renders');
  assert.ok(/No team call data for this period/.test(clock), 'team:null reads as no-data, not as hidden');
});

test('list-swap motion: shared helper, transform/opacity-only keyframes, wired at the four switch sites', () => {
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const helper = core.slice(core.indexOf('function animateListSwap_'), core.indexOf('function animateListSwap_') + 900);
  assert.ok(/try \{/.test(helper) && /catch \(_\)/.test(helper),
    'decoration only — the helper can never break a render');
  assert.ok(/--d/.test(helper) && /swap-in/.test(helper) && /Math\.min\(i, 12\)/.test(helper),
    'per-item stagger via --d, capped so a long list does not tail out');
  // The keyframes animate ONLY opacity/transform (the motion-system rule —
  // anything else forces layout/paint per frame).
  const styles = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  const kfAt = styles.indexOf('@keyframes listSwapIn');
  assert.ok(kfAt >= 0, 'the keyframes exist in the shared stylesheet');
  const kf = styles.slice(kfAt, styles.indexOf('}', styles.indexOf('to {', kfAt)) + 1);
  const props = [...kf.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  props.forEach((p) => assert.ok(p === 'opacity' || p === 'transform',
    'listSwapIn animates only opacity/transform (found: ' + p + ')'));
  assert.ok(/\.swap-in \{ animation: listSwapIn [^;]*both; animation-delay: var\(--d, 0s\); \}/.test(styles),
    'one-shot (both) + the --d stagger hook');
  // Wired at the four switch sites: DR status chips, DR dept chips, the
  // Spanish tab chips, and the Team Metrics scope switcher.
  const dr = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_deptrequests.html'), 'utf8');
  const met = fs.readFileSync(path.join(__dirname, '../../web-app/metrics/script_metrics.html'), 'utf8');
  const calls = ((dr.match(/animateListSwap_\(/g) || []).length) + ((met.match(/animateListSwap_\(/g) || []).length);
  assert.ok(calls >= 4, 'all four switch sites animate the swap (found ' + calls + ')');
});

// ── Team-member onboarding (operator request 2026-08-07, pre-pilot) ─────────
console.log('\nteam-member onboarding');

test('empValidateNewEmployee_ — behavioral (the roster append is guarded by validation, not convention)', () => {
  // Load the REAL EMP enum + parseShiftOverride_ + the validator into one ctx
  // (the intake-engine pattern — never re-declare the enum in the test).
  const obCtx = vm.createContext({});
  const empConst = /const EMP = \{[\s\S]*?\};/.exec(codeSrc);
  assert.ok(empConst, 'the EMP enum was located');
  vm.runInContext(empConst[0], obCtx);
  vm.runInContext(extractRawFunction('Code.js', 'parseShiftOverride_'), obCtx);
  vm.runInContext(extractRawFunction('Code.js', 'empValidateNewEmployee_'), obCtx);
  // A top-level `const` is a lexical binding, not a context property — read it
  // back through the context rather than off the object.
  const EMPn = vm.runInContext('EMP', obCtx);
  const CTX = {
    existingEmails: ['sam@umsupply.com'], existingIds: ['e-1077'], existingNames: ['sam ortiz'],
    managerEmails: ['robin@umsupply.com'], deptKeys: ['Billing', 'Shipping'], hasBiweeklyAnchor: false,
  };
  const base = { email: 'Ana@umsupply.com', id: 'E-1108', name: 'Ana Cruz', timezone: 'Asia/Manila',
    payCycle: '', payAnchor: '', annual: 12, sick: 5, ptoEnabled: false, isManager: false,
    managerEmail: 'Robin@umsupply.com', departments: 'billing, SHIPPING', schedule: '9:00-17:30' };
  const v = (over, ctxOver) => obCtx.empValidateNewEmployee_(
    Object.assign({}, base, over || {}), Object.assign({}, CTX, ctxOver || {}));
  const ok = v();
  assert.strictEqual(ok.ok, true, 'a fully valid payload passes: ' + (ok.error || ''));
  assert.strictEqual(ok.row.length, 15, 'the row spans the full A–O roster width');
  assert.strictEqual(ok.row[EMPn.EMAIL], 'Ana@umsupply.com');
  assert.strictEqual(ok.row[EMPn.PTO_ENABLED], 'FALSE', 'PTO off writes an EXPLICIT FALSE, never a blank');
  assert.strictEqual(ok.row[EMPn.IS_MANAGER], '', 'non-manager stays blank (the roster convention)');
  assert.strictEqual(ok.row[EMPn.DEPARTMENTS], 'Billing; Shipping', 'departments canonicalize to the configured keys');
  assert.strictEqual(ok.row[EMPn.MANAGER_EMAIL], 'robin@umsupply.com', 'manager email stored lowercased');
  // Uniqueness — all three identity columns, case-insensitively.
  assert.ok(!v({ email: 'SAM@umsupply.com' }).ok, 'duplicate email rejected (case-insensitive)');
  assert.ok(!v({ id: 'e-1077' }).ok, 'duplicate ID rejected');
  assert.ok(!v({ name: 'SAM ORTIZ' }).ok, 'duplicate NAME rejected — repMap/CDR matching are name-keyed');
  // Operator report 2026-08-08: a bare "already in use" sent an admin hunting
  // a roster they had already checked. Every conflict NAMES the owning row
  // when the caller supplies the owners map (and degrades silently without).
  const OWN = { owners: { id: { 'e-1077': 'Sam Ortiz (row 4)' },
                          email: { 'sam@umsupply.com': 'Sam Ortiz (row 4)' },
                          name: { 'sam ortiz': 'Sam Ortiz (row 4)' } } };
  assert.ok(/Sam Ortiz \(row 4\)/.test(v({ id: 'E-1077' }, OWN).error), 'the ID conflict names the owning row');
  assert.ok(/reserved after offboarding/.test(v({ id: 'E-1077' }, OWN).error),
    'and says WHY a seemingly-unused ID can collide (offboarded rows keep theirs)');
  assert.ok(/Sam Ortiz \(row 4\)/.test(v({ email: 'sam@umsupply.com' }, OWN).error), 'the email conflict names the row');
  assert.ok(/Sam Ortiz \(row 4\)/.test(v({ name: 'Sam Ortiz' }, OWN).error), 'the name conflict names the row');
  assert.ok(!/undefined/.test(v({ id: 'e-1077' }).error), 'without an owners map the message stays clean');
  // The production-safety + shape rules.
  assert.ok(/TEST_/.test(v({ id: 'TEST_9' }).error), 'TEST_-prefixed IDs rejected (the cleanup sweep key)');
  assert.ok(!v({ timezone: 'NotATimezone' }).ok, 'a shapeless timezone is rejected');
  assert.ok(!v({ departments: 'Billing, West' }).ok && /West/.test(v({ departments: 'West' }).error),
    'an unknown department is rejected BY NAME (read-time parsing silently drops it)');
  assert.ok(!v({ schedule: '9-17' }).ok, 'bare-hours schedule rejected — Sheets date-coerces 9-17');
  assert.ok(!v({ schedule: '17:00-9:00' }).ok, 'inverted schedule rejected (parseShiftOverride_ null)');
  assert.ok(!v({ managerEmail: 'stranger@umsupply.com' }).ok, 'a manager email outside MANAGER_EMAILS is rejected (fail-closed docs visibility)');
  assert.ok(!v({ annual: -1 }).ok && !v({ sick: 'abc' }).ok, 'balances must be finite 0–365');
  // The INV-18 anchor hazard: one anchored biweekly row governs the boundary.
  assert.ok(!v({ payCycle: 'monthly', payAnchor: '2026-01-05' }).ok, 'anchor without biweekly rejected');
  assert.ok(!v({ payCycle: 'biweekly', payAnchor: '2026-01-05' }, { hasBiweeklyAnchor: true }).ok,
    'a SECOND biweekly anchor is rejected — the first anchored row governs (INV-18)');
  assert.ok(v({ payCycle: 'biweekly', payAnchor: '2026-01-05' }).ok, 'the FIRST anchor is accepted');
});

test('addEmployee / offboardEmployee / getOnboardingPanel — gate, lock, and convention pins', () => {
  const strip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const add = strip(extractRawFunction('Code.js', 'addEmployee'));
  assert.ok(/'Admin access required\.'/.test(add), 'addEmployee is admin-gated (roster management, INV-136 tier)');
  // Validation runs INSIDE the lock against a FRESH sheet read, so uniqueness
  // cannot race a concurrent add; provisioning re-acquires AFTER release
  // (sequential, never nested — LockService is not reentrant).
  const wl = add.indexOf('waitLock'), val = add.indexOf('empValidateNewEmployee_('),
        rel = add.indexOf('releaseLock'), prov = add.indexOf('provisionCallNotesSheet(');
  assert.ok(wl >= 0 && val > wl && rel > val, 'validate-under-lock ordering holds');
  assert.ok(prov > rel, 'Call Notes provisioning runs AFTER the lock releases (sequential re-acquire)');
  assert.ok(/invalidateRosterCache_\(\)/.test(add) && /'EmployeeAdd'/.test(add),
    'cache invalidated (INV-10) + audited (INV-08)');
  // Operator report 2026-08-08 — THE reporting rule (INV-187 applied to a
  // write): once the row is appended, no follow-up failure may report the add
  // as failed. A bare {error} after the append is what produced a phantom
  // "Employee ID already in use" on the admin's retry.
  const appIdx = add.indexOf('appended = true');
  assert.ok(appIdx > 0, 'the append is flagged');
  assert.ok(/if \(appended\) \{[\s\S]*?success: true/.test(add),
    'the outer catch reports success-with-warning once the row exists — never a bare failure');
  assert.ok(/try \{ invalidateRosterCache_\(\); \} catch/.test(add),
    'post-append bookkeeping cannot unwind a completed add');
  assert.ok(/try \{ prov = provisionCallNotesSheet\(result\.id\); \}\s*\n?\s*catch/.test(add),
    'provisioning is caught — its waitLock sits outside its own try, so a lock timeout THROWS');
  const off = strip(extractRawFunction('Code.js', 'offboardEmployee'));
  assert.ok(/'Admin access required\.'/.test(off), 'offboardEmployee is admin-gated');
  // THE convention (INV-183): clear the EMAIL, keep everything else. Exactly
  // one cell write, aimed at column A — never a row delete, never the name.
  const writes = off.match(/setValue\(/g) || [];
  assert.strictEqual(writes.length, 1, 'offboard writes exactly ONE cell');
  assert.ok(/EMP\.EMAIL \+ 1\)\.setValue\(''\)/.test(off), 'the one write clears the EMAIL cell');
  assert.ok(!/deleteRow/.test(off), 'the row is never deleted — history keeps reading');
  assert.ok(/cannot offboard yourself/.test(off), 'self-offboard is rejected (would lock the caller out mid-session)');
  const panel = strip(extractRawFunction('Code.js', 'getOnboardingPanel'));
  assert.ok(/'Admin access required\.'/.test(panel), 'getOnboardingPanel is admin-gated');
  // CDR readiness MOVED to its own endpoint (operator 2026-08-11 — the panel
  // was blocking on it); its best-effort posture is pinned with the split.
  const cdrRead = strip(extractRawFunction('Code.js', 'getOnboardingCdrReadiness'));
  assert.ok(/ok: false/.test(cdrRead),
    'the CDR readiness read is best-effort (INV-67 posture) — an unreachable CDR Report degrades, never throws');
  // The offboarded list carries IDs: an offboarded row still reserves its ID,
  // and it is invisible in the active list — exactly where the conflict hides.
  assert.ok(/offboarded\.push\(\{ id:/.test(panel),
    'getOnboardingPanel returns offboarded rows as {id, name} — the reserved ID must be visible somewhere');
  // Operator report 2026-08-08 (second round): the blocking row was a
  // HAND-STUBBED one (ID + name, no email) — invisible in every in-app list,
  // yet it reserves the ID. An offboarded row keeps its roster data; a stub
  // never had any, and the two resolve differently.
  assert.ok(/incomplete: !hasRosterData/.test(panel),
    'email-less rows are split into offboarded vs incomplete (never all called "offboarded")');
  assert.ok(/EMP\.TIMEZONE/.test(panel) && /EMP\.PAY_CYCLE/.test(panel),
    'the split keys off roster data offboardEmployee PRESERVES (it clears column A only)');
  assert.ok(/NO login email/.test(add) && /clear its Employee ID/.test(add),
    'a conflict with an email-less row says so IN the message + names both resolutions');
  assert.ok(/empRosterEmail_\(/.test(panel) && /empRosterEmail_\(/.test(add) && /empRosterEmail_\(/.test(off),
    'all three route roster inclusion through the ONE predicate (INV-183/F3)');
});

test('onboarding panel — CDR readiness is a SEPARATE second-stage read (operator 2026-08-11)', () => {
  const nc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const panel = nc(extractRawFunction('Code.js', 'getOnboardingPanel'));
  const cdrFn = nc(extractRawFunction('Code.js', 'getOnboardingCdrReadiness'));
  // The whole point: the roster panel must not pay for the CDR read. If the
  // expensive foreign-spreadsheet call creeps back into the panel, the
  // operator's "takes some time to load" report is live again.
  assert.ok(!/getCdrAgentMetrics_|cdrLikelyNameMismatches_/.test(panel),
    'getOnboardingPanel does NOT read the CDR Report — that is what made it slow');
  assert.ok(/cdr: \{ deferred: true \}/.test(panel),
    'the panel marks CDR as deferred (distinct from ok:false, which means the read was attempted and failed)');
  // The split endpoint carries the same gate + the same best-effort posture.
  assert.ok(/isAdmin/.test(cdrFn) && /Admin access required\./.test(cdrFn),
    'getOnboardingCdrReadiness is admin-gated like the panel it was split from (INV-136)');
  assert.ok(/getCdrAgentMetrics_\(/.test(cdrFn) && /cdrLikelyNameMismatches_\(/.test(cdrFn),
    'the split endpoint does the CDR read + the INV-186 alias pairing');
  assert.ok(/catch \(err\) \{ return \{ ok: false/.test(cdrFn),
    'a failed CDR read returns ok:false — never a partial seen-map that would read as "no calls" (INV-187)');
  assert.ok(/empRosterEmail_\(/.test(cdrFn),
    'the split endpoint walks the roster through the ONE inclusion predicate (INV-183/F3)');
  // Client: paints first, patches second, and an unread name never renders as
  // an absent one.
  const cnf = 'cn/script_callnotes.html';
  const load = nc(extractFunction(cnf, 'cnAdminLoadOnboarding_'));
  assert.ok(/cnRenderOnboardingHtml_\(res\)[\s\S]{0,120}cnOnboardLoadCdr_\(/.test(load),
    'the panel renders BEFORE the CDR round-trip is fired (paint first, patch second)');
  const apply = nc(extractFunction(cnf, 'cnOnboardApplyCdr_'));
  assert.ok(/data-cdr-name/.test(apply),
    'the patch is keyed off data-cdr-name cells, not a whole-panel re-render');
  const chip = nc(extractFunction(cnf, 'cnOnboardCdrChipHtml_'));
  assert.ok(/if \(!ok\)[\s\S]{0,220}cdr: unknown/.test(chip),
    'a failed/unavailable CDR read renders "unknown", NEVER "no calls" (INV-187)');
  const render = nc(extractFunction(cnf, 'cnRenderOnboardingHtml_'));
  assert.ok(/cdr: checking…/.test(render),
    'the first paint shows a pending chip so the deferred read is visible, not silently blank');
  assert.ok(/cnOnboardCdrChipHtml_\(/.test(render),
    'first render and the patch share ONE chip builder so the two cannot drift');
});

test('onboarding panel — the readiness list is a column grid, not a wrapping chip row', () => {
  const render = extractFunction('cn/script_callnotes.html', 'cnRenderOnboardingHtml_');
  assert.ok(/class="cn-ob-grid"/.test(render) && /class="cn-ob-row cn-ob-head"/.test(render),
    'the list renders as a headed grid');
  // Six cells per rep row, in a fixed order — that is what makes a column
  // scannable (operator 2026-08-11: "the layout looks messy").
  const rowCells = (render.match(/class="cn-ob-cell/g) || []).length;
  assert.ok(rowCells >= 5, `each rep row emits its readiness cells (found ${rowCells})`);
  assert.ok(!/flex-wrap:wrap/.test(render.slice(0, render.indexOf('var mgrOpts'))),
    'the rep rows no longer wrap chips at arbitrary x positions');
  const css = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  const rule = /\.cn-ob-row \{[\s\S]*?\}/.exec(css);
  assert.ok(rule && /grid-template-columns:/.test(rule[0]),
    '.cn-ob-row declares its columns');
  // A2/F3: a fixed multi-column grid owes a real viewport breakpoint — six
  // columns cannot hold their content on a phone.
  assert.ok(/@media \(max-width: 900px\)[\s\S]{0,400}\.cn-ob-row \{ grid-template-columns: 1fr/.test(css),
    '.cn-ob-row stacks at a real viewport breakpoint (the A2 rule)');
  assert.ok(/\.cn-ob-chip\.is-ok \{ color: var\(--success-deep\)/.test(css) &&
            /\.cn-ob-chip\.is-warn \{ color: var\(--warning-deep\)/.test(css),
    'chip tones come from the semantic tokens, not inline hex');
  // The caller's own row renders a "you" chip where every other row has an
  // Offboard button; a bare `auto` last track sized to it and pulled that
  // row's five readiness columns out of line (MEASURED at 1280px).
  assert.ok(/minmax\(78px, auto\)/.test(rule[0]),
    'the action column is minmax\'d so a narrower last cell cannot shift the row');
  // The Admin sub-tab strip is five pills wide — wider than a phone. It must
  // scroll inside itself rather than push the page sideways (MEASURED: page
  // scrollWidth 415 -> 390 at a 390px viewport).
  const tok = fs.readFileSync(path.join(__dirname, '../../web-app/styles_design_tokens.html'), 'utf8');
  const tabs = /\.toolbar-tabs \{[\s\S]*?\}/.exec(tok);
  assert.ok(tabs && /max-width: 100%/.test(tabs[0]) && /overflow-x: auto/.test(tabs[0]),
    '.toolbar-tabs scrolls internally instead of overflowing the page');
  assert.ok(/\.toolbar-tab \{[^}]*flex: 0 0 auto/.test(tok),
    'the tabs keep their width inside the scroller rather than squashing');
});

console.log('\nkb — interactive roster block (operator 2026-08-11)');

const kbRosCtx = vm.createContext({});
/** kbMd_ escapes & < > BEFORE the fence reaches the parser, so a pin that
 *  feeds RAW text is not testing the production contract. That gap hid a live
 *  defect: `team| A > B` arrived as `A &gt; B` and parsed as ONE team named
 *  "A &gt; B" with an empty sub — which rendered plausibly, because the entity
 *  displays as ">". Every roster pin now feeds input through this. */
const rosEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
['kbSlug_', 'kbRosterParse_', 'kbRosterAttr_', 'kbRosterSlug_', 'kbRosterPeopleIndex_',
 'kbRosterTagChip_', 'kbRosterFlags_', 'kbRosterPersonHtml_', 'kbRosterTeamsHtml_',
 'kbRosterCapabilitiesHtml_', 'kbRosterCoverageHtml_', 'kbRosterChartHtml_',
 'kbRosterKey_', 'kbRosterFlowHtml_', 'kbRosterEdgeKind_', 'kbRosterBodyHtml_',
 'kbRosterModeBtn_', 'kbRosterHtml_', 'kbMd_']
  .forEach((n) => vm.runInContext(extractFunction('kb/script_kb.html', n), kbRosCtx));

test('kbRosterParse_ — structure, flags, tags, and badges that travel with a person', () => {
  const p = kbRosCtx.kbRosterParse_(rosEsc([
    'legend| lead=Team lead; new=Training / New; C=Complex Rehab chair',
    'badge| Parachute: Paula, Erica',
    'dept| PAK — Mary',
    'team| PPD: Micheal*lead, Sandra',
    'dept| Qualifications & Auth — Rajdeep',
    'team| Medical Review > T3Q: Paula (C & ATP)*lead, Alia (P)',
    'team| PT Eval: Erica, Shelby*new',
  ].join('\n')));
  assert.strictEqual(p.depts.length, 2, 'two departments');
  assert.strictEqual(p.depts[0].owner, 'Mary', 'the owner is split off the department name');
  assert.strictEqual(p.depts[1].teams[0].sub, 'T3Q', '"Team > Sub" nests');
  const paula = p.depts[1].teams[0].people[0];
  // NOTE: values come from a vm context, so their Array prototype belongs to
  // that realm and deepStrictEqual (which compares prototypes) fails on a
  // correct result. Compare by value.
  // The fence content arrives HTML-ESCAPED, so an ampersand separator is
  // `&amp;` — splitting on a bare & yields the tag "amp; ATP".
  assert.strictEqual(paula.tags.join('|'), 'C|ATP', 'an escaped & separator splits correctly');
  assert.strictEqual(paula.lead, true, '*lead is a flag, not part of the name');
  assert.strictEqual(paula.name, 'Paula', 'the name is clean of tags and flags');
  // A badge is an attribute of a PERSON, so it follows them onto every team.
  const erica = p.depts[1].teams[1].people[0];
  assert.strictEqual(erica.badges.join('|'), 'Parachute', 'the badge travels to another department');
  assert.strictEqual(paula.badges.join('|'), 'Parachute', 'and to a different team');
  assert.strictEqual(p.depts[1].teams[1].people[1].isNew, true, '*new is parsed');
  // An unparseable line is REPORTED, never silently dropped.
  const bad = kbRosterParse_Warn();
  function kbRosterParse_Warn() { return kbRosCtx.kbRosterParse_('team PPD no pipe here'); }
  assert.strictEqual(bad.warnings.length, 1, 'a malformed line is counted as a warning');
});

test('kbMd_ renders a ```roster fence as the interactive block, and leaves other fences alone', () => {
  const html = kbRosCtx.kbMd_(['Intro.', '', '```roster', 'dept| PAK — Mary', 'team| PPD: Micheal*lead', '```'].join('\n'));
  assert.ok(/<div class="kb-roster"/.test(html), 'the roster fence renders the block');
  assert.ok(/<p>Intro\.<\/p>/.test(html), 'surrounding markdown still renders');
  // Real controls, not divs with handlers (INV-173), and the filter input is
  // NAMED for assistive tech.
  assert.ok(/<button type="button" class="kb-ros-name"/.test(html), 'a person is a real button');
  assert.ok(/aria-label="Filter the roster/.test(html), 'the search input has an accessible name');
  assert.ok(/role="status" aria-live="polite"/.test(html), 'the result count is announced');
  const plain = kbRosCtx.kbMd_(['```js', 'var x = 1;', '```'].join('\n'));
  assert.ok(/<pre><code>/.test(plain) && !/kb-roster/.test(plain), 'an ordinary fence is untouched');
});

test('roster block stays INERT and cannot break out of an attribute', () => {
  // kbMd_ escapes & < > BEFORE the fence is captured, so markup in the body is
  // already neutralised — but the top-level pass does NOT cover quotes, and the
  // renderer puts names into attributes (the same gap kbMd_'s link rule guards).
  const html = kbRosCtx.kbMd_(['```roster', 'dept| D', 'team| T: <script>alert(1)</script>', '```'].join('\n'));
  assert.strictEqual(html.indexOf('<script>'), -1, 'no live script survives');
  assert.ok(/&lt;script&gt;/.test(html), 'it renders as escaped text');
  const quoted = kbRosCtx.kbRosterHtml_('dept| D\nteam| T: A" onmouseover="x');
  // Assert the PROPERTY (the quote is entity-escaped inside the value), not
  // "an on*= follows the attribute" — that heuristic matches the legitimate
  // onclick after a correctly-terminated attribute and fails on good output.
  assert.ok(/data-name="A&quot; onmouseover=&quot;x"/.test(quoted), 'a quote in a name is entity-escaped in its attribute');
  // The SOURCE now rides on the root as an attribute too — same exposure.
  assert.ok(/data-src="[^"]*&quot;[^"]*"/.test(quoted), 'and in the stored source attribute');
  assert.ok(/&quot;/.test(quoted), 'quotes are entity-escaped in attribute contexts');
});

test('the roster block reflows for the 400px drawer, and its content stays searchable', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  // A2: a fixed multi-column grid owes a real viewport breakpoint. The drawer
  // is the surface this block exists for, so this is not optional.
  assert.ok(/\.kb-ros-teams \{[^}]*repeat\(auto-fill/.test(kb), 'the team grid is intrinsic, not fixed tracks');
  assert.ok(/@media \(max-width: 560px\)[\s\S]{0,200}\.kb-ros-teams \{ grid-template-columns: 1fr/.test(kb),
    'it stacks at a real breakpoint');
  assert.ok(/\.kb-ros-teams \{[^}]*align-items: start/.test(kb),
    'a short team does not stretch to match a tall one beside it');
  // The tooltip must not be mouse-only.
  assert.ok(/\.kb-ros-tag\[data-tip\]:hover::after, \.kb-ros-tag\[data-tip\]:focus::after/.test(kb),
    'tag tooltips open on keyboard focus as well as hover');
  // Searchability is the reason this beats an embed: kbSplitSections_ masks
  // fences for HEADING detection only, so the names stay in the section text.
  const secCtx = vm.createContext({});
  ['kbSlug_', 'kbSplitSections_'].forEach((n) => vm.runInContext(extractRawFunction('Code.js', n), secCtx));
  const secs = secCtx.kbSplitSections_('# Roster\n\n```roster\nteam| MDO: Sergio (P)\n```');
  assert.ok(secs.some((x) => x.md.toLowerCase().indexOf('sergio') >= 0),
    'a name inside the roster fence is still part of the searchable section text');
});

console.log('\nintake — email chrome matched to the app (operator 2026-08-11)');

test('the intake shell uses the same chrome as the branded wrapper', () => {
  const shell = extractRawFunction('Code.js', 'intakeEmailShell_');
  const branded = extractRawFunction('Code.js', 'buildBrandedEmailHtml_');
  // The mark sits ON THE CARD over a navy rule — logoUrl is a JPEG with no
  // transparency, so a navy band would frame a white rectangle.
  [shell, branded].forEach(function (fn, i) {
    assert.ok(/border-bottom:2px solid ' \+ P\.brand/.test(fn), 'navy rule under the mark (' + i + ')');
    assert.ok(/alt="UMS Team Tools"/.test(fn), 'the alt text carries the identity when images are blocked (' + i + ')');
    assert.ok(/font-size:22px/.test(fn), 'the subject is a real heading, not a line beside the logo (' + i + ')');
    assert.ok(/width:46px;height:3px/.test(fn), 'with the short rule under it (' + i + ')');
    assert.ok(/text-transform:uppercase;color:' \+ P\.muted3 \+ ';">UMS Team Tools/.test(fn),
      'and the mono wordmark footer (' + i + ')');
  });
  // The module label is per form, so PPD / PMD / PAP are distinguishable.
  // Every CALL SITE names its form via the subLabel (the body arg may be an
  // expression — the 2026-08-13 feedback CTA rides it — so scan a window
  // after each call rather than one rigid arg shape).
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const callSites = code.split('intakeEmailShell_(subject,').slice(1);
  assert.strictEqual(callSites.length, 4, 'four intakeEmailShell_ call sites');
  callSites.forEach(function (c, i) {
    assert.ok(c.slice(0, 220).indexOf("'Intake · ") >= 0, 'call site ' + (i + 1) + ' names its form');
  });
});

test('intake tables use the app ledger vocabulary, and stay email-safe', () => {
  const band = extractRawFunction('Code.js', 'intakeSectionRowHtml_');
  // A solid navy bar with centred white text was the piece that most made
  // these read as a different product from the rest of the app's mail.
  assert.ok(/text-transform:uppercase/.test(band) && /P\.navyTint/.test(band), 'section bands are mono-uppercase on a tint');
  assert.strictEqual(/text-align:center/.test(band), false, 'not centred');
  const ppd = extractRawFunction('Code.js', 'intakeBuildPpdBodyHtml_');
  const acct = extractRawFunction('Code.js', 'intakeBuildAcctBodyHtml_');
  [ppd, acct].forEach(function (fn, i) {
    assert.ok(/border-bottom:1px solid ' \+ P\.line/.test(fn), 'hairline row separators (' + i + ')');
    assert.strictEqual(/border:1px solid ' \+ P\.line \+ ';width:5/.test(fn), false, 'no bordered grid (' + i + ')');
    assert.ok(/intakeSectionRowHtml_\(label\)/.test(fn), 'both bodies share the section band (' + i + ')');
    // Outlook drops these; the palette + tables are the whole layout system.
    ['display:flex', 'gap:', 'filter:'].forEach(function (bad) {
      assert.strictEqual(fn.indexOf(bad), -1, 'email-safe: no ' + bad + ' (' + i + ')');
    });
  });
  // The restyle must not have dropped an esc_ — every patient field is escaped
  // and the server-generated justification stays the ONE raw exception.
  assert.ok(/esc_\(r\.label/.test(ppd) && /esc_\(answerRaw\)/.test(ppd), 'labels and answers are escaped');
});

console.log('\nkb — decision / task-guide block (operator 2026-08-11)');

const kbDecCtx = vm.createContext({});
['kbSlug_', 'kbRosterAttr_', 'kbDecideParse_', 'kbDecideResolve_', 'kbDecideHtml_', 'kbMd_']
  .forEach((n) => vm.runInContext(extractFunction('kb/script_kb.html', n), kbDecCtx));

const DEC_SRC = [
  'ask|  q1: Eval in the last 6 months?',
  'opt|  q1: Yes -> q2',
  'opt|  q1: No -> aPT',
  'ask|  q2: Group 3 chair?',
  'opt|  q2: Yes -> aATP',
  'opt|  q2: No -> aNone',
  'do|   aPT: Route to PT Scheduling',
  'todo| aPT: Book the earliest slot',
  'todo| aPT: Log the appointment date',
  'note| aPT: If the patient declines, send back to MA Education',
  'do|   aATP: Route to ATP Scheduling',
  'do|   aNone: Send to PWC Verification',
].join('\n');

test('kbDecideParse_ — questions, options, actions and their steps', () => {
  const d = kbDecCtx.kbDecideParse_(rosEsc(DEC_SRC));
  assert.strictEqual(d.root, 'q1', 'the FIRST ask is the root');
  assert.strictEqual(d.order.length, 5, 'five nodes');
  assert.strictEqual(d.nodes.q1.opts.length, 2, 'options parse');
  assert.strictEqual(d.nodes.q1.opts[0].to, 'q2', 'and carry their destination');
  assert.strictEqual(d.nodes.aPT.kind, 'do', 'an action is a leaf');
  assert.strictEqual(d.nodes.aPT.todos.length, 2, 'with tickable steps');
  assert.strictEqual(d.nodes.aPT.notes.length, 1, 'and a caveat');
  assert.strictEqual(d.warnings.length + d.dangling.length + d.unreachable.length, 0, 'a sound guide warns about nothing');
});

test('a guide that cannot be walked says so instead of dead-ending mid-call', () => {
  // An option pointing nowhere, and a branch nothing reaches, are authoring
  // errors the reader would otherwise hit as a dead end while on a call.
  const broken = kbDecCtx.kbDecideParse_(rosEsc([
    'ask| q1: Start?', 'opt| q1: Yes -> ghost',
    'do|  orphan: Never reachable',
    'ask| q2: Also unreachable?', 'opt| q2: x -> orphan',
  ].join('\n')));
  assert.ok(broken.dangling.indexOf('ghost') >= 0, 'a dangling destination is caught');
  assert.ok(broken.unreachable.indexOf('orphan') >= 0 && broken.unreachable.indexOf('q2') >= 0,
    'and so is a branch nothing reaches');
  const html = kbDecCtx.kbDecideHtml_(rosEsc('ask| q1: Start?\nopt| q1: Yes -> ghost'), []);
  assert.ok(/role="alert"/.test(html) && /does not exist/.test(html), 'the reader is told, not left guessing');
  // A second title for one id is ambiguous; a question with no answers is a
  // dead end.
  const dup = kbDecCtx.kbDecideParse_(rosEsc('ask| q1: A?\nask| q1: B?'));
  assert.strictEqual(dup.warnings.length, 1, 'a redefined node is refused');
  assert.ok(/no answers recorded/.test(kbDecCtx.kbDecideHtml_(rosEsc('ask| q1: Dead end?'), [])),
    'a question with no options says so');
});

test('the walk resolves a path, and an edited tree cannot strand a reader', () => {
  const d = kbDecCtx.kbDecideParse_(rosEsc(DEC_SRC));
  const r = kbDecCtx.kbDecideResolve_(d, ['Yes', 'No']);
  assert.strictEqual(r.at, 'aNone', 'the path lands on the right action');
  assert.strictEqual(r.trail.length, 2, 'and records the questions answered');
  assert.strictEqual(r.trail[0].a, 'Yes', 'with the answer given');
  // An answer that no longer matches is SKIPPED rather than throwing — an
  // author can edit the tree under a reader mid-walk.
  const stale = kbDecCtx.kbDecideResolve_(d, ['Maybe', 'Yes']);
  assert.strictEqual(stale.at, 'q2', 'an unknown answer is ignored, the rest still applies');
  assert.strictEqual(kbDecCtx.kbDecideResolve_(d, []).at, 'q1', 'an empty path is the start');
});

test('the guide renders one question at a time with a walkable trail', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const start = kbDecCtx.kbDecideHtml_(rosEsc(DEC_SRC), []);
  assert.strictEqual((start.match(/kb-dec-title/g) || []).length, 1, 'exactly one question is shown');
  assert.strictEqual(/kb-dec-crumb/.test(start), false, 'no trail at the start');
  assert.strictEqual(/Start over/.test(start), false, 'and nothing to start over from');
  const mid = kbDecCtx.kbDecideHtml_(rosEsc(DEC_SRC), ['Yes']);
  assert.ok(/kb-dec-crumb/.test(mid), 'answering leaves a crumb');
  assert.ok(/Start over/.test(mid), 'and offers a restart');
  const leaf = kbDecCtx.kbDecideHtml_(rosEsc(DEC_SRC), ['No']);
  assert.ok(/kb-dec-todos/.test(leaf) && /type="checkbox"/.test(leaf), 'the action has tickable steps');
  assert.ok(/Route to PT Scheduling/.test(leaf), 'and names the action');
  // Real controls (INV-173) and the changing question is announced.
  assert.ok(/<button type="button" class="kb-dec-opt"/.test(start), 'options are real buttons');
  assert.ok(/<button type="button" class="kb-dec-crumb"/.test(mid), 'so are the crumbs');
  assert.ok(/aria-live="polite"/.test(start), 'the new question is announced');
  // Ticks belong to the action on screen: carrying them across a re-render
  // would assert work that was not done.
  // Ticks belong to the action on screen: a re-render rebuilds from source, so
  // no checkbox can arrive pre-checked and assert work that was not done.
  assert.strictEqual(/checked/.test(leaf), false, 'a freshly rendered action has nothing ticked');
  const render = extractFunction('kb/script_kb.html', 'kbDecideRender_');
  assert.ok(/kbDecideHtml_\(root\.getAttribute\('data-src'\)/.test(render), 're-render rebuilds from the source');
  assert.ok(/replaceChild/.test(render), 'replacing the node, so no prior state survives');
  assert.ok(/@media \(max-width: 560px\)[\s\S]{0,200}\.kb-dec-opts \{ flex-direction: column/.test(kb),
    'options stack on a phone');
});

test('kbMd_ renders a ```decision fence, inert like the others', () => {
  const html = kbDecCtx.kbMd_(['Intro.', '', '```decision', 'ask| q1: Go?', 'opt| q1: Yes -> a', 'do| a: Done', '```'].join('\n'));
  assert.ok(/<div class="kb-decision"/.test(html), 'the fence renders the block');
  assert.ok(/<p>Intro\.<\/p>/.test(html), 'surrounding markdown is untouched');
  const evil = kbDecCtx.kbMd_(['```decision', 'ask| q1: <script>alert(1)</script>', 'opt| q1: y -> a', 'do| a: x', '```'].join('\n'));
  assert.strictEqual(evil.indexOf('<script>'), -1, 'no live script survives');
  const quoted = kbDecCtx.kbDecideHtml_('ask| q1: A?\nopt| q1: say "yes" -> a\ndo| a: x', []);
  assert.ok(/data-opt="say &quot;yes&quot;"/.test(quoted), 'quotes are escaped in attributes');
});

console.log('\nkb — glossary block (operator 2026-08-11)');

const kbGlossCtx = vm.createContext({});
['kbSlug_', 'kbRosterAttr_', 'kbGlossaryParse_', 'kbGlossaryHtml_', 'kbMd_']
  .forEach((n) => vm.runInContext(extractFunction('kb/script_kb.html', n), kbGlossCtx));

test('kbGlossaryParse_ — terms, aliases, and refusal to define a term twice', () => {
  const g = kbGlossCtx.kbGlossaryParse_(rosEsc([
    'PAR (aka Prior Auth, PA)| Prior Authorization Request',
    'ATP| Assistive Technology Professional',
    'no pipe on this line',
    'ATP| A second, conflicting definition',
    'PPD|',
  ].join('\n')));
  assert.strictEqual(g.terms.length, 2, 'only the sound definitions');
  assert.strictEqual(g.terms[0].term, 'ATP', 'sorted alphabetically');
  const par = g.terms[1];
  assert.strictEqual(par.term, 'PAR', 'the alias clause is stripped from the term');
  assert.strictEqual(par.aliases.join('|'), 'Prior Auth|PA', 'and parsed');
  // A repeated term is ambiguous, and an empty definition is not a definition.
  assert.strictEqual(g.warnings.length, 3, 'malformed, duplicate and empty lines are all counted');
  assert.ok(/2 terms/.test(kbGlossCtx.kbGlossaryHtml_(rosEsc('A| one\nB| two'))), 'the count is rendered');
});

test('kbMd_ renders a ```glossary fence, and the block stays inert', () => {
  const html = kbGlossCtx.kbMd_(['Intro.', '', '```glossary', 'PAR| Prior Authorization', '```'].join('\n'));
  assert.ok(/<div class="kb-glossary"/.test(html), 'the fence renders the block');
  assert.ok(/<p>Intro\.<\/p>/.test(html), 'surrounding markdown is untouched');
  assert.ok(/aria-label="Filter glossary terms"/.test(html), 'the filter has an accessible name');
  const evil = kbGlossCtx.kbMd_(['```glossary', 'X| <script>alert(1)</script>', '```'].join('\n'));
  assert.strictEqual(evil.indexOf('<script>'), -1, 'no live script survives');
  assert.ok(/&lt;script&gt;/.test(evil), 'it renders as escaped text');
  // Definitions ride in attributes for the annotator, so quotes must be escaped
  // there too — the top-level pass does not cover them.
  const quoted = kbGlossCtx.kbGlossaryHtml_('X| a "quoted" definition');
  assert.ok(/data-def="a &quot;quoted&quot; definition"/.test(quoted), 'quotes are escaped in attributes');
});

test('the annotator marks the FIRST mention only, and never inside the glossary', () => {
  const fn = extractFunction('kb/script_kb.html', 'kbGlossaryAnnotate_');
  // A TEXT-NODE walk (the kbHighlightTerms_ pattern) — never string surgery on
  // rendered HTML, so it cannot damage what kbMd_ produced.
  assert.ok(/createTreeWalker\(rootEl, NodeFilter\.SHOW_TEXT/.test(fn), 'walks text nodes');
  assert.ok(/break;\s+\/\/ first mention only/.test(fn), 'stops after the first mention');
  // Marking every mention turns a page into a field of dotted underlines.
  assert.ok(/closest\('\.kb-glossary, code, pre, h1, h2, h3, h4, a, button, \.kb-gloss-mark'\)/.test(fn),
    'skips the glossary itself, headings, code and links');
  // An ALL-CAPS term is an acronym: "par" in ordinary prose must not link to PAR.
  assert.ok(/var acronym = name === name\.toUpperCase\(\)/.test(fn), 'acronyms are detected');
  assert.ok(/acronym \? '' : 'i'/.test(fn), 'and matched case-sensitively');
  assert.ok(/defs\.sort\(function \(a, b\) \{ return b\.length - a\.length; \}\)/.test(fn),
    'longest term first, so "PT Eval" wins over "PT"');
  assert.ok(/catch \(e\) \{ \/\* annotation is decoration/.test(fn), 'and it can never break the reader');
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  assert.ok(/\.kb-gloss-mark:hover::after, \.kb-gloss-mark:focus::after/.test(kb),
    'the definition opens on keyboard focus as well as hover');
  assert.ok(/@media \(max-width: 560px\)[\s\S]{0,200}\.kb-gloss-row \{ grid-template-columns: 1fr/.test(kb),
    'the two-column term list stacks on a phone');
  // Both readers annotate — the tab and the mid-call drawer.
  assert.strictEqual((kb.match(/kbGlossaryAnnotate_\((main|body)\);/g) || []).length, 2,
    'wired into both the Reference reader and the drawer');
});

console.log('\nkb — roster Tier 1: views, person panel, tag filter, ids');

test('the people index folds a person across teams — the question the grid cannot answer', () => {
  const d = kbRosCtx.kbRosterParse_(rosEsc([
    'dept| Q — R',
    'team| PAR > Submission: Kadija, Parker',
    'team| PAR > F/U: Kadija (C), Bella',
  ].join('\n')));
  const idx = kbRosCtx.kbRosterPeopleIndex_(d);
  assert.strictEqual(idx.order.length, 3, 'Kadija counts ONCE, not once per team');
  const k = idx.byName.kadija;
  assert.strictEqual(k.places.length, 2, 'but both of her teams are recorded');
  assert.strictEqual(k.tags.join('|'), 'C', 'tags union across her rows');
});

test('the three views render from one source, and coverage states FACTS not verdicts', () => {
  const src = [
    'legend| C=Complex Rehab chair',
    'dept| Q — R',
    'team| A: Ann (C)*lead, Bob',
    'team| B: Cy (C), Dee (ATP)',
  ].join('\n');
  const d = kbRosCtx.kbRosterParse_(src);
  const teams = kbRosCtx.kbRosterBodyHtml_(d, 'teams');
  const caps = kbRosCtx.kbRosterBodyHtml_(d, 'capabilities');
  const cov = kbRosCtx.kbRosterBodyHtml_(d, 'coverage');
  assert.ok(/kb-ros-dept-name/.test(teams), 'teams view groups by department');
  // The capability view must put people from DIFFERENT teams in one card —
  // that cross-team cut is the whole reason it exists.
  const cCard = /<div class="kb-ros-team-name">C <span class="kb-ros-n">2<\/span>/.test(caps);
  assert.ok(cCard, 'both C-tagged people group together across teams');
  assert.ok(/Ann/.test(caps) && /Cy/.test(caps), 'and both are listed');
  // Coverage reports counts and single-points-of-contact. It must NOT invent a
  // staffing verdict — it has no idea what the target is (INV-187).
  assert.ok(/>4<\/b><span>people</.test(cov), 'counts distinct people');
  assert.ok(/>2<\/b><span>teams</.test(cov), 'and teams');
  assert.ok(/No lead marked on: B\./.test(cov), 'names the teams with no lead — a fact');
  // Dee is the only ATP, so the single-point-of-contact note renders — which
  // is what puts that sentence under the no-verdict scan below.
  assert.ok(/single point of contact/.test(cov), 'flags a capability only one person carries');
  ['understaffed', 'too few', 'insufficient', 'at risk', 'critical'].forEach((w) => {
    assert.strictEqual(cov.toLowerCase().indexOf(w), -1, 'coverage states no verdict: ' + w);
  });
});

test('a tag click matches the tag EXACTLY, not as a substring', () => {
  const src = ['dept| Q — R', 'team| Medical Review: Ann (C)', 'team| Insurance Change: Bob'].join('\n');
  const html = kbRosCtx.kbRosterBodyHtml_(kbRosCtx.kbRosterParse_(src), 'teams');
  // Tags ride pipe-delimited so "C" cannot also match "Medical Review" and
  // "Insurance Change" — a bare substring matched 42 of 46 real people.
  assert.ok(/data-tags="\|c\|"/.test(html), 'tags are pipe-delimited for exact matching');
  assert.ok(/data-tags="\|\|"/.test(html), 'an untagged person has no tag to match');
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  assert.ok(/var q = 'tag:' \+ tag;/.test(kb), 'the tag button drives the same filter box the rep types into');
  assert.ok(/tagNeedle \? false :/.test(kb), 'in tag mode a TEAM name never matches');
});

test('a person on two teams gets unique ids, and the first stays canonical', () => {
  const src = ['dept| Q — R', 'team| A: Kadija', 'team| B: Kadija'].join('\n');
  const html = kbRosCtx.kbRosterBodyHtml_(kbRosCtx.kbRosterParse_(src), 'teams');
  const ids = (html.match(/id="kb-p-[^"]*"/g) || []);
  assert.strictEqual(ids.length, 2, 'both rows are addressable');
  assert.strictEqual(new Set(ids).size, 2, 'duplicate DOM ids would break the anchors this adds');
  assert.ok(/id="kb-p-kadija"/.test(html), 'the FIRST occurrence keeps the bare slug as the canonical target');
  assert.ok(/id="kb-p-kadija-2"/.test(html), 'later ones take the -2/-3 walk kbMd_ uses for repeated headings');
  assert.ok(/id="kb-t-q-a"/.test(html), 'teams are addressable too');
});

test('the mode switcher is a real tablist and the count means the same thing in every view', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const html = kbRosCtx.kbRosterHtml_('dept| Q — R\nteam| A: Ann (C), Bob');
  assert.ok(/role="tablist"/.test(html) && (html.match(/role="tab"/g) || []).length === 4, 'four real tabs');
  assert.ok(/aria-selected="true"/.test(html), 'the active view is exposed, not just painted (INV-174)');
  assert.ok(/setAttribute\('aria-selected'/.test(kb), 'and kept in step on switch');
  // The count previously mixed units: distinct people on first paint, visible
  // ROWS after a filter or mode switch — so a 46-person roster read "49
  // people" in the capability view.
  assert.ok(/seen\[people\[i\]\.getAttribute\('data-name'\)/.test(kb), 'the filter counts DISTINCT people');
  assert.ok(/mode !== 'teams' && mode !== 'capabilities'/.test(kb),
    'every non-grid view bypasses the row count, by RULE rather than a name list');
});

console.log('\nkb — roster chart view (progressive disclosure)');

test('the chart is a real tree whose collapsed width is its TOP level only', () => {
  const d = kbRosCtx.kbRosterParse_([
    'dept| PAK — Mary', 'team| PPD: Ann*lead, Bob',
    'dept| Q — R', 'team| A: Cy', 'team| B: Dee',
  ].join('\n'));
  const html = kbRosCtx.kbRosterChartHtml_(d);
  assert.ok(/role="tree"/.test(html), 'a tree role');
  assert.strictEqual((html.match(/role="treeitem"/g) || []).length, 5, 'every dept and team is a treeitem');
  assert.strictEqual((html.match(/role="group"/g) || []).length, 5, 'each has a child group');
  // Progressive disclosure is what makes this legible at all: showing every
  // leaf at once needs ~90px each (~4100px on the real roster). Children are
  // RENDERED but collapsed, so expand state lives in the DOM and the collapsed
  // width is the top level alone.
  assert.strictEqual((html.match(/aria-expanded="false"/g) || []).length, 10,
    'everything starts collapsed, on both the treeitem and its button');
  assert.strictEqual(html.indexOf('aria-expanded="true"'), -1, 'nothing starts open');
  // Expanding must update BOTH — the treeitem carries the tree state, the
  // button is what a screen reader announces when focused (INV-174).
  const toggle = extractFunction('kb/script_kb.html', 'kbRosterToggleNode_');
  assert.ok(/li\.setAttribute\('aria-expanded'/.test(toggle), 'the treeitem is kept in step');
  assert.ok(/btn\.setAttribute\('aria-expanded'/.test(toggle), 'and so is its button');
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  assert.ok(/\.kb-ros-children \{ display: none; \}/.test(kb), 'children are hidden until their node opens');
  assert.ok(/\.kb-ros-node\.open > \.kb-ros-children\.is-leaves \{ display: block/.test(kb),
    'people stack VERTICALLY inside a team, so opening one costs height not width');
});

test('the chart claims structure, not reporting lines — and says so', () => {
  const html = kbRosCtx.kbRosterChartHtml_(kbRosCtx.kbRosterParse_('dept| D — O\nteam| T: Ann'));
  // The source records team membership only. Person-to-person edges would
  // assert a relationship the data does not contain.
  assert.ok(/not who reports to whom/.test(html), 'the view states what it does not know');
  // NOTE: do not scan for the phrase "reports to" — the disclaimer itself
  // contains it (INV-188's family: a check that trips on its own rationale).
  // What matters is that only membership edges are drawn: dept > team > people.
  assert.strictEqual(html.indexOf('kb-ros-person'), html.lastIndexOf('kb-ros-person'),
    'one person row here — people hang off their TEAM, never off another person');
  assert.ok(/O · 1 teams/.test(html), 'the department owner is shown, which the data does assert');
});

test('the chart scrolls inside its own container, and its notes stay put', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  assert.ok(/\.kb-ros-chartwrap \{ overflow-x: auto/.test(kb), 'the tree scrolls inside itself, never the page');
  const html = kbRosCtx.kbRosterChartHtml_(kbRosCtx.kbRosterParse_('dept| D — O\nteam| T: Ann'));
  // The notes were INSIDE the scroll container and scrolled away with the
  // tree — losing the only explanation of the view exactly when a wide row
  // made it most needed.
  // Structural, not positional: everything from the wrap onward must contain
  // no note. (Checking "note index < wrap index" passes even if the wrap is
  // renamed, which is how the first version of this pin failed to bite.)
  const wrapAt = html.indexOf('class="kb-ros-chartwrap"');
  assert.ok(wrapAt > 0, 'the scrolling wrap exists');
  assert.ok(html.indexOf('kb-ros-note') >= 0, 'the note exists');
  assert.strictEqual(html.slice(wrapAt).indexOf('kb-ros-note'), -1, 'and is NOT inside the scrolling wrap');
  assert.strictEqual(html.slice(wrapAt).indexOf('kb-ros-chart-hint'), -1, 'nor is the scroll hint');
  assert.ok(/has-overflow \.kb-ros-chart-hint \{ display: block/.test(kb),
    'the scroll hint shows only when the row actually overflows');
  assert.ok(/@media \(max-width: 560px\)[\s\S]{0,300}\.kb-ros-nodebox \{ min-width: 104px/.test(kb),
    'two department boxes at their wide min-width overflowed a 400px viewport');
});

test('separators survive kbMd_ escaping — the sub-team and flow arrow', () => {
  // THE PRODUCTION CONTRACT: & < > are already entities when the parser runs.
  // Before this, `team| A > B` parsed as one team literally named "A &gt; B"
  // with an empty sub — and it LOOKED right, because the entity displays as
  // ">". The parser never unescapes (decoding then re-emitting would undo the
  // escape boundary), so every separator matches both forms.
  const d = kbRosCtx.kbRosterParse_(rosEsc([
    'dept| Q — R',
    'team| Medical Review > T3Q: Paula (C & ATP)*lead',
    'flow| Order: Appt Passed -> Medical Review > T3Q',
  ].join('\n')));
  const t = d.depts[0].teams[0];
  assert.strictEqual(t.name, 'Medical Review', 'the team name stops at the separator');
  assert.strictEqual(t.sub, 'T3Q', 'and the sub-team is captured');
  assert.strictEqual(t.people[0].tags.join('|'), 'C|ATP', 'escaped & still splits tags');
  assert.strictEqual(d.flows.length, 1, 'the flow arrow survives escaping');
  assert.strictEqual(d.flows[0].stages.length, 2, 'both stages parse');
  // A stage naming a sub-team must ADDRESS it despite the entity.
  const flowHtml = kbRosCtx.kbRosterFlowHtml_(d);
  assert.ok(/1 person/.test(flowHtml), 'the stage links to the real team, not a plain step');
  // And nothing was unescaped along the way.
  assert.strictEqual(kbRosCtx.kbRosterParse_(rosEsc('team| T: <script>')).depts[0].teams[0].people[0].name,
    '&lt;script&gt;', 'values stay escaped');
});

test('the Flow view exists only when a flow is recorded, and is never guessed', () => {
  const noFlow = kbRosCtx.kbRosterHtml_(rosEsc('dept| D — O\nteam| T: Ann'));
  assert.strictEqual(/data-mode="flow"/.test(noFlow), false, 'no Flow tab without a flow| line');
  const withFlow = kbRosCtx.kbRosterHtml_(rosEsc('dept| D — O\nteam| T: Ann\nflow| A -> B'));
  assert.ok(/data-mode="flow"/.test(withFlow), 'the tab appears once one exists');
  // The sequence work travels in is operational knowledge. Inferring it from
  // the sheet's layout and showing it to reps as fact would be worse than no
  // diagram at all.
  const empty = kbRosCtx.kbRosterFlowHtml_(kbRosCtx.kbRosterParse_(rosEsc('dept| D — O\nteam| T: Ann')));
  assert.ok(/No process flow recorded yet/.test(empty), 'it says so rather than inventing one');
  assert.ok(/phase\| 1\. Intake:/.test(empty), 'and shows exactly what to add');
  const one = kbRosCtx.kbRosterFlowHtml_(kbRosCtx.kbRosterParse_(rosEsc('dept| D — O\nteam| T: Ann\nflow| T -> Ship')));
  assert.strictEqual((one.match(/kb-ros-fnode/g) || []).length >= 2, true, 'both stages render as nodes');
  assert.ok(/is-plain/.test(one), 'a stage that is not a team is not clickable');
  // A branching process: phases + steps, which the linear form cannot express.
  const g = kbRosCtx.kbRosterParse_(rosEsc([
    'dept| D — O', 'team| PT Scheduling: Ann',
    'phase| 2. Qualifications: Qualifications*decision, PT Scheduling, ATP Scheduling',
    'step| Qualifications -> PT Scheduling: Route A',
    'step| Qualifications -> ATP Scheduling: Route B',
    'step| PAR -> Appeals: Denied',
  ].join('\n')));
  assert.strictEqual(g.phases.length, 1, 'the phase parses');
  assert.strictEqual(g.phases[0].nodes[0].decision, true, 'a *decision branch point is marked');
  assert.strictEqual(g.steps.length, 3, 'every labelled edge parses');
  assert.strictEqual(g.steps[0].label, 'Route A', 'edge labels survive');
  const gh = kbRosCtx.kbRosterFlowHtml_(g);
  assert.ok(/is-decision/.test(gh), 'the branch point renders as a decision');
  assert.ok(/Route A/.test(gh) && /Route B/.test(gh), 'both routes are stated on the node they leave');
  assert.ok(/kb-ros-edges/.test(gh), 'a connector layer exists to be measured into');
  // A tab must appear for a phase-only process too — the linear flow| form is
  // not the only way to record one.
  assert.ok(/data-mode="flow"/.test(kbRosCtx.kbRosterHtml_(rosEsc('phase| P: A, B\nstep| A -> B'))),
    'phases alone are enough to offer the Flow view');
});

test('kbRosterEdgeKind_ — the decision every drawing bug lived in', () => {
  const K = kbRosCtx.kbRosterEdgeKind_;
  const box = (left, top) => ({ left, top, right: left + 100, bottom: top + 40, width: 100, height: 40 });
  // SAME COLUMN. Comparing source-RIGHT to target-LEFT called these loop-backs
  // (8 of 14 on the real process) because a stacked sibling always sits left
  // of its parent's right edge.
  assert.strictEqual(K(box(0, 0), box(0, 60), 1, 1, 0, 1, false).kind, 'step', 'adjacent sibling = step');
  assert.strictEqual(K(box(0, 0), box(0, 180), 1, 1, 0, 3, false).kind, 'skip', 'non-adjacent = skip');
  // Direction: an upward edge must still report down:false so the path is
  // anchored at its SOURCE and the arrowhead lands on the target.
  assert.strictEqual(K(box(0, 180), box(0, 0), 1, 1, 3, 0, false).down, false, 'upward is not "down"');
  assert.strictEqual(K(box(0, 0), box(0, 60), 1, 1, 0, 1, false).down, true, 'downward is');
  // COLUMN JUMPS.
  assert.strictEqual(K(box(0, 0), box(200, 0), 1, 2, 0, 0, false).kind, 'forward', 'next column = forward');
  assert.strictEqual(K(box(0, 0), box(400, 0), 0, 2, 0, 0, false).kind, 'phaseSkip', 'past a whole phase = skip');
  assert.strictEqual(K(box(400, 0), box(0, 0), 3, 1, 0, 0, false).kind, 'back', 'leftward = back');
  // RECIPROCAL pairs get one lane each way; drawn on the same centre line they
  // overlap into a single stroke with arrowheads at both ends.
  const down = K(box(0, 0), box(0, 60), 1, 1, 0, 1, true);
  const up = K(box(0, 60), box(0, 0), 1, 1, 1, 0, true);
  assert.ok(down.lane !== 0 && up.lane !== 0, 'both directions are offset');
  assert.ok(down.lane !== up.lane, 'and to OPPOSITE sides');
  assert.strictEqual(K(box(0, 0), box(0, 60), 1, 1, 0, 1, false).lane, 0, 'a one-way edge stays centred');
});

test('the process graph draws edges MEASURED from the laid-out boxes', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const draw = extractFunction('kb/script_kb.html', 'kbRosterDrawEdges_');
  assert.ok(/getBoundingClientRect\(\)/.test(draw), 'positions come from the laid-out boxes');
  assert.ok(/kbRosterEdgeKind_\(ra, rb, colA, colB, rowA, rowB, reciprocal\)/.test(draw),
    'and the classification goes through the pure helper');
  const html = kbRosCtx.kbRosterFlowHtml_(kbRosCtx.kbRosterParse_(rosEsc(
    'phase| *: S\nphase| 1. I: A\nphase| 2. Q: B\nstep| S -> B')));
  assert.ok(/data-col="0"/.test(html) && /data-row="0"/.test(html), 'nodes carry their column and row');
  assert.ok(/kbRosterDrawEdges_\(kbRosterRoot_\(btn\)\)/.test(
    extractFunction('kb/script_kb.html', 'kbRosterToggleNode_')), 'edges redraw after expand/collapse');
  assert.ok(/@media \(max-width: 700px\)[\s\S]{0,300}\.kb-ros-edges \{ display: none/.test(kb),
    'connectors hide once the columns stack, where they would be meaningless');
  assert.ok(/\.kb-ros-edge\.is-skip \{[^}]*stroke-dasharray/.test(kb), 'a skip is visually distinct');
});

test('a join states that it WAITS for every applicable path, not any one', () => {
  const d = kbRosCtx.kbRosterParse_(rosEsc([
    'phase| 2. Qual: Qualifications*decision, PT Scheduling, ATP Scheduling',
    'phase| 3. Auth: PWC Verification*join',
    'step| Qualifications -> PT Scheduling: If PT Eval needed',
    'step| Qualifications -> ATP Scheduling: If ATP Eval needed',
    'step| Qualifications -> PWC Verification: If neither eval is needed',
    'step| PT Scheduling -> PWC Verification',
    'step| ATP Scheduling -> PWC Verification',
  ].join('\n')));
  const pwc = d.phases[1].nodes[0];
  assert.strictEqual(pwc.name, 'PWC Verification', 'the marker is stripped from the name');
  assert.strictEqual(pwc.join, true, 'and recorded');
  // Several inbound paths drawn without this read as ALTERNATIVES — "any one
  // proceeds" — which is the opposite of a stage that waits for all of them.
  const html = kbRosCtx.kbRosterFlowHtml_(d);
  assert.ok(/Waits for every applicable path above to complete/.test(html), 'the AND semantics are stated');
  assert.ok(/kb-ros-flag is-join/.test(html), 'and flagged');
  // Markers compose in either order.
  const both = kbRosCtx.kbRosterParse_(rosEsc('phase| P: X*decision*join, Y*join*decision'));
  assert.strictEqual(both.phases[0].nodes[0].decision && both.phases[0].nodes[0].join, true, 'decision+join');
  assert.strictEqual(both.phases[0].nodes[1].decision && both.phases[0].nodes[1].join, true, 'join+decision');
  assert.strictEqual(both.phases[0].nodes[0].name, 'X', 'name is clean either way');
});

test('a step naming an undeclared node is reported, not silently dropped', () => {
  const withGhost = kbRosCtx.kbRosterFlowHtml_(kbRosCtx.kbRosterParse_(
    rosEsc('phase| P: A, B\nstep| A -> B\nstep| B -> Ghost')));
  // A vanished connection would leave a diagram that LOOKS complete — the
  // reassuring-failure class (INV-187).
  assert.ok(/name a node no phase declares/.test(withGhost), 'the gap is stated');
  assert.ok(/Ghost/.test(withGhost), 'and the offending node is named');
  assert.ok(/role="alert"/.test(withGhost), 'and announced');
  const clean = kbRosCtx.kbRosterFlowHtml_(kbRosCtx.kbRosterParse_(rosEsc('phase| P: A, B\nstep| A -> B')));
  assert.strictEqual(/name a node no phase declares/.test(clean), false, 'a sound process warns about nothing');
  // A malformed phase/step line is COUNTED, not skipped — the block reports
  // "N line(s) were not understood" rather than quietly rendering less.
  const bad = kbRosCtx.kbRosterParse_(rosEsc('phase| no colon here\nstep| no arrow here\nphase| P: A'));
  assert.strictEqual(bad.warnings.length, 2, 'both malformed lines are counted');
  assert.strictEqual(bad.phases.length, 1, 'and the sound one still parses');
});

test('the roster can escape the height-capped reader panel', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const html = kbRosCtx.kbRosterHtml_('dept| D — O\nteam| T: Ann');
  assert.ok(/class="kb-ros-expand"/.test(html), 'the block offers an expand control');
  const fn = extractFunction('kb/script_kb.html', 'kbRosterExpand_');
  // ensureOverlay, never a hand-rolled overlay — Escape, the focus trap and
  // focus-restore all hang off it (INV-83), and onClose must be idempotent.
  assert.ok(/ensureOverlay\('kb-roster-overlay'/.test(fn), 'built via ensureOverlay');
  assert.ok(/onClose:/.test(fn) && /if \(o\) o\.remove\(\)/.test(fn), 'with an idempotent close');
  assert.strictEqual(/createElement\('div'\)[\s\S]{0,120}overlay open/.test(fn), false, 'no hand-rolled overlay');
  assert.ok(/kbRosterHtml_\(src\)/.test(fn), 'the expanded copy is built from the same source');
  assert.ok(/\.kb-roster-modal \{ width: min\(1400px, 96vw\)/.test(kb), 'and gets nearly the viewport');
});

test('the chart and coverage views report distinct people, never a filtered row count', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  // Chart mode has no .kb-ros-dept walk, so the row-counting filter reported
  // "0 people" — the same mixed-units defect as the capability view, in a new
  // mode. Both aggregate views report the index size instead.
  assert.ok(/mode !== 'teams' && mode !== 'capabilities'/.test(kb),
    'every non-grid view bypasses the row-counting filter, by RULE not a name list');
});

console.log('\nkb — Sheet→article converter (operator 2026-08-11)');

// The grid walker, driven with plain objects (the kbDocBodyToMarkdown_ pattern
// — no live spreadsheet needed).
const kbSheetCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'kbSheetGridToMarkdown_'), kbSheetCtx);
const kbSheetGridToMarkdown_ = kbSheetCtx.kbSheetGridToMarkdown_;

test('a BANDED roster keeps each sub-team\'s people separate (they sit side by side, not stacked)', () => {
  // This is the whole reason the converter exists and the one regression that
  // would be actively harmful: these sheets partition by COLUMN, so a row-wise
  // walk merges two sub-teams into one line and tells a rep that PPD's people
  // cover MDO. Measured against the real roster's shape.
  const W = 8, blank = () => Array(W).fill('');
  const at = (pairs) => { const r = blank(); pairs.forEach(([c, v]) => { r[c] = v; }); return r; };
  const values = [
    at([[0, 'PAK (Mary)']]),                                   // full-width band
    at([[0, 'PPD'], [4, 'MDO']]),                              // two sub-teams, side by side
    at([[1, 'Micheal'], [5, 'Sasha']]),
    at([[0, 'Sandra'], [1, 'Selena'], [4, 'Rachel']]),
    blank(),
    at([[0, 'Qualifications & Auth (Rajdeep)']]),
    at([[0, 'PT Eval'], [4, 'MDO Follow-Up']]),
    at([[0, 'Hem'], [4, 'Sergio (P)'], [5, 'Scarlett (C)']]),
  ];
  const merges = [
    { row: 1, col: 1, rows: 1, cols: 8 },   // band
    { row: 2, col: 1, rows: 1, cols: 3 }, { row: 2, col: 5, rows: 1, cols: 3 },
    { row: 6, col: 1, rows: 1, cols: 8 },   // band
    { row: 7, col: 1, rows: 1, cols: 3 }, { row: 7, col: 5, rows: 1, cols: 3 },
  ];
  const md = kbSheetGridToMarkdown_({ name: 'Sheet1', values, merges }).markdown;
  // Departments are h3, sub-teams h4 — so search and the drawer both get a
  // section anchor per sub-team.
  assert.ok(/^### PAK \(Mary\)$/m.test(md), 'the full-width merge is a department band');
  assert.ok(/^#### PPD$/m.test(md) && /^#### MDO$/m.test(md), 'each sub-team is its own sub-heading');
  const ppd = md.slice(md.indexOf('#### PPD'), md.indexOf('#### MDO'));
  const mdo = md.slice(md.indexOf('#### MDO'));
  assert.ok(/Micheal/.test(ppd) && /Sandra/.test(ppd) && /Selena/.test(ppd), 'PPD keeps its own people');
  assert.ok(!/Sasha|Rachel/.test(ppd), 'PPD does NOT absorb the column beside it');
  assert.ok(/Sasha/.test(mdo) && /Rachel/.test(mdo), 'MDO keeps its own people');
  assert.ok(!/Micheal|Sandra/.test(mdo), 'MDO does NOT absorb the column beside it');
  // A band must not be confused with a sub-team: the test is "spans the used
  // width", not a ratio of it — a 3-wide sub-team merge cleared a 60% bar.
  assert.ok(!/^### PPD$/m.test(md), 'a sub-team merge is never promoted to a department band');
});

test('a plain tabular sheet becomes a GFM table; a banded one never does', () => {
  const table = kbSheetGridToMarkdown_({
    name: 'Rates',
    values: [['State', 'Rate'], ['TX', '6.25%'], ['CA', '7.25%']],
    merges: [],
  }).markdown;
  assert.ok(/\| State \| Rate \|/.test(table) && /\|---\|---\|/.test(table), 'no merges ⇒ GFM table');
  assert.ok(/\| TX \| 6\.25% \|/.test(table), 'data rows carry through');
  // A pipe in a cell must not break the table it is rendered into.
  const piped = kbSheetGridToMarkdown_({ name: 'x', values: [['A'], ['a|b']], merges: [] }).markdown;
  assert.ok(/a\\\|b/.test(piped), 'a literal pipe is escaped for GFM');
});

test('cell highlights are preserved as emphasis and their MEANING is reported, never invented', () => {
  // Highlights matter in the BANDED (roster) shape — a table's header row is
  // styled by the renderer, so bolding there would be noise.
  const res = kbSheetGridToMarkdown_({
    name: 'x',
    values: [['Team', ''], ['Lead', 'Backup']],
    merges: [{ row: 1, col: 1, rows: 1, cols: 2 }],
    backgrounds: [['#ffffff', '#ffffff'], ['#c9daf8', '#ffffff']],
  });
  assert.ok(/\*\*Lead\*\*/.test(res.markdown), 'a tinted cell keeps its emphasis');
  assert.ok(!/\*\*Backup\*\*/.test(res.markdown), 'an untinted cell is left alone');
  assert.ok(res.warnings.some((w) => /legend/i.test(w)),
    'the operator is told to write down what a colour meant — the sheet never says');
});

test('converter output RENDERS through the real kbMd_ (the two are a parallel pair)', () => {
  // The Doc converter has this same round-trip guard. It is what makes the
  // section anchors real: search chunks by heading, so a rep searching "MDO"
  // must land on that sub-team's section rather than the whole roster.
  const rtCtx = vm.createContext({});
  vm.runInContext(extractRawFunction('Code.js', 'kbSheetGridToMarkdown_'), rtCtx);
  vm.runInContext(extractFunction('kb/script_kb.html', 'kbSlug_'), rtCtx);
  vm.runInContext(extractFunction('kb/script_kb.html', 'kbMd_'), rtCtx);
  const W = 8, blank = () => Array(W).fill('');
  const at = (pairs) => { const r = blank(); pairs.forEach(([c, v]) => { r[c] = v; }); return r; };
  const md = rtCtx.kbSheetGridToMarkdown_({
    name: 'Sheet1',
    values: [at([[0, 'PAK (Mary)']]), at([[0, 'PPD'], [4, 'MDO']]), at([[1, 'Micheal'], [5, 'Sasha']])],
    merges: [{ row: 1, col: 1, rows: 1, cols: 8 }, { row: 2, col: 1, rows: 1, cols: 3 }, { row: 2, col: 5, rows: 1, cols: 3 }],
    backgrounds: [blank().map(() => '#ffffff'), blank().map(() => '#ffffff'),
                  blank().map((_, c) => (c === 1 ? '#c9daf8' : '#ffffff'))],
  }).markdown;
  const html = rtCtx.kbMd_(md);
  assert.ok(/<h3[^>]*id="kb-h-[^"]*"[^>]*>PAK \(Mary\)<\/h3>/.test(html), 'the department renders as an anchored h3');
  assert.ok(/<h4[^>]*id="kb-h-[^"]*"[^>]*>MDO<\/h4>/.test(html), 'each sub-team gets its own anchor, so search can jump to it');
  assert.ok(/<strong>Micheal<\/strong>/.test(html), 'the highlighted lead survives the round trip');
  assert.strictEqual(/[#*]{2}/.test(html.replace(/<[^>]*>/g, '')), false, 'no raw markdown leaks into the rendered text');
  // A converted TABLE must render as a table, not as escaped pipes.
  const tbl = rtCtx.kbMd_(rtCtx.kbSheetGridToMarkdown_({
    name: 'Rates', values: [['State', 'Rate'], ['TX', '6.25%']], merges: [],
  }).markdown);
  assert.ok(/<table/.test(tbl) && /TX/.test(tbl), 'the tabular shape renders as a real table');
});

test('a banded sheet converts straight to an interactive roster block', () => {
  const cvCtx = vm.createContext({});
  ['kbSheetGridToMarkdown_', 'kbRosterFromBanded_'].forEach((n) => vm.runInContext(extractRawFunction('Code.js', n), cvCtx));
  const W = 8, blank = () => Array(W).fill('');
  const at = (pairs) => { const r = blank(); pairs.forEach(([c, v]) => { r[c] = v; }); return r; };
  const md = cvCtx.kbSheetGridToMarkdown_({
    name: 'Sheet1',
    values: [at([[0, 'PAK (Mary)']]), at([[0, 'PPD'], [4, 'MDO']]), at([[1, 'Micheal'], [5, 'Sasha']])],
    merges: [{ row: 1, col: 1, rows: 1, cols: 8 }, { row: 2, col: 1, rows: 1, cols: 3 }, { row: 2, col: 5, rows: 1, cols: 3 }],
    backgrounds: [blank().map(() => '#fff'), blank().map(() => '#fff'), blank().map((_, c) => (c === 1 ? '#c9daf8' : '#fff'))],
  }).markdown;
  const ros = cvCtx.kbRosterFromBanded_(md);
  assert.ok(/^```roster/.test(ros), 'emits a roster fence');
  assert.ok(/dept\| PAK — Mary/.test(ros), 'the parenthesised owner becomes the department owner');
  assert.ok(/team\| PPD: Micheal\*lead/.test(ros), 'a highlighted cell carries across as the lead flag');
  assert.ok(/team\| MDO: Sasha/.test(ros), 'the side-by-side sub-team stays separate');
  // A TABULAR sheet must NOT be forced into a roster — that would misrepresent
  // what the data is.
  const table = cvCtx.kbSheetGridToMarkdown_({ name: 'Rates', values: [['State', 'Rate'], ['TX', '6.25%']], merges: [] }).markdown;
  assert.strictEqual(cvCtx.kbRosterFromBanded_(table), '', 'a table is left as a table');
  // And the round trip parses back into the same structure.
  const back = kbRosCtx.kbRosterParse_(ros.replace(/^```roster\n/, '').replace(/\n```$/, ''));
  assert.strictEqual(back.depts.length, 1);
  assert.strictEqual(back.depts[0].teams.length, 2, 'both sub-teams survive the round trip');
  assert.strictEqual(back.depts[0].teams[0].people[0].lead, true, 'the lead flag survives');
});

test('kbConvertDriveSheet is admin-gated, read-only, and bounded', () => {
  const nc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const fn = nc(extractRawFunction('Code.js', 'kbConvertDriveSheet'));
  assert.ok(/isAdmin/.test(fn) && /Admin access required\./.test(fn),
    'admin-gated like the Doc converter (INV-136)');
  // READ-ONLY is the contract that makes review-before-save safe: the article
  // is only ever persisted by the admin pressing Save in the editor.
  assert.ok(!/setValue|appendRow|getRange\([^)]*\)\.set/.test(fn), 'the converter writes nothing');
  // Scoped to the FOREIGN sheet's grid read — the itemId branch legitimately
  // uses getValues() on our OWN KB sheet to locate the row.
  assert.ok(/values: range\.getDisplayValues\(\)/.test(fn),
    'the foreign sheet is read as DISPLAYED (its timezone/format is not ours to reinterpret — INV-64)');
  assert.ok(!/values: range\.getValues\(\)/.test(fn), 'never the raw-value read');
  assert.ok(/KB_SHEET_MAX_ROWS/.test(fn) && /KB_SHEET_MAX_COLS/.test(fn), 'the read is bounded');
  assert.ok(/only the first/.test(fn), 'truncation is REPORTED, never silent (INV-169)');
  assert.ok(/kbRowStatus_\(/.test(fn), 'a draft embed converts to a draft article (the M-13 lesson)');
  // No new OAuth scope: SpreadsheetApp is already authorized everywhere.
  assert.ok(/SpreadsheetApp\.openById/.test(fn) && !/DocumentApp/.test(fn), 'uses SpreadsheetApp');
});

console.log('\npop-out: the repeated compact header is retired (operator 2026-08-11)');

test('.compact-header is gone from every partial, its CSS, and cannot return', () => {
  // It repeated the pop-out window title + the tab bar directly below it,
  // costing ~44px at the top of the app's SMALLEST window. A dead selector
  // left behind is the next reader's false lead (INV-184), so the CSS went
  // with the markup and this pin holds both sides down.
  const files = PARSE_GUARD_PARTIALS.concat(['styles.html', 'styles_design_tokens.html']);
  const offenders = [];
  files.forEach((f) => {
    let src;
    try { src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8'); }
    catch (e) { return; }
    // Strip comments so the entries EXPLAINING the retirement don't trip it
    // (INV-188 — this has bitten twice before).
    const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/<!--[\s\S]*?-->/g, '');
    if (/compact-header|cnCompactHeader_/.test(clean)) offenders.push(f);
  });
  assert.deepStrictEqual(offenders, [],
    'no partial or stylesheet references the retired compact header');
  // The one control that lived in it was NOT dead — the manager refresh button
  // survives on its own row, and its handler binds by id.
  const mgr = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_manager.html'), 'utf8');
  assert.ok(/id="mgr-refresh"/.test(mgr) && /mgr-refresh/.test(mgr.replace(/id="mgr-refresh"/, '')),
    'the manager refresh control survived the retirement, still bound by id');
});

console.log('\nreminders: sound + desktop + shell-wide ticker (operator 2026-08-11)');

test('the three reminder channels degrade independently; a blocked one never suppresses the others', () => {
  const nc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const core = 'script_core.html';
  const remind = nc(extractFunction(core, 'notifyRemind_'));
  // The toast fires unconditionally; sound and desktop are each independently
  // gated. A rep with sound off and desktop blocked still SEES the reminder.
  const toastAt = remind.indexOf('showToast(');
  assert.ok(toastAt >= 0, 'notifyRemind_ always shows the in-app toast');
  const toastLine = remind.split('\n').find((l) => l.indexOf('showToast(') >= 0) || '';
  assert.ok(!/p\.sound|p\.desktop|notifyDesktopReady_/.test(toastLine),
    'the toast is guarded only on the helper existing — never on a reminder preference');
  assert.ok(/p\.sound/.test(remind) && /p\.desktop/.test(remind),
    'sound and desktop are separately gated on the stored prefs');
  assert.ok(/notifyDesktopReady_\(\)/.test(remind),
    'desktop is additionally gated on an actually-granted permission');
  // Every browser-capability call is wrapped: a reminder path must never throw.
  const chime = nc(extractFunction(core, 'notifyChime_'));
  assert.ok(/try \{/.test(chime) && /catch \(e\) \{\}/.test(chime),
    'the chime swallows AudioContext failures (suspended/blocked contexts throw)');
  assert.ok(!/new Audio\(|\.src\s*=/.test(chime),
    'the chime is synthesized — no fetched asset (the iframe CSP would block one)');
  const ready = nc(extractFunction(core, 'notifyDesktopReady_'));
  assert.ok(/typeof Notification !== 'undefined'/.test(ready),
    'the Notification API is feature-detected, not assumed');
  const req = nc(extractFunction(core, 'notifyRequestDesktop_'));
  assert.ok(/unavailable/.test(req),
    "a browser that refuses the API resolves 'unavailable' — distinct from a user 'denied'");
  const tog = nc(extractFunction(core, 'notifyToggleDesktop_'));
  assert.ok(/blocked desktop notifications/.test(tog) && /will not allow/.test(tog),
    'a refused permission SAYS why and states that the toast + chime still work (INV-187 honesty)');
  const sync = nc(extractFunction(core, 'notifySyncToggles_'));
  assert.ok(/aria-pressed/.test(sync),
    'the toggles expose their state to assistive tech, not just a class (INV-174)');
  // The sidebar and the mobile header each render a copy of the control, so
  // the toggles are selected by ATTRIBUTE — two elements cannot share an id,
  // and an id-keyed sync would silently update only the first.
  assert.ok(/data-remind=/.test(sync) && !/getElementById\('sb-remind/.test(sync),
    'both rendered copies of each toggle stay in step (attribute-keyed, not id-keyed)');
  assert.ok(!/id="sb-remind/.test(nc(extractScript('script_core.html'))),
    'the duplicated control renders no duplicate ids');
  // The reminder toggles reuse .sb-theme-btn for its look, and the boot theme
  // reflector used to write aria-pressed across that whole CLASS — which
  // silently reset the sound toggle to "off" on every load (MEASURED: markup
  // rendered true, the live attribute read false).
  const idx = fs.readFileSync(path.join(__dirname, '../../web-app/index.html'), 'utf8');
  assert.ok(/querySelectorAll\('\.sb-theme-btn\[data-theme-target\]'\)/.test(idx),
    'the theme reflector writes only to THEME toggles, not to every element sharing the class');
});

test('break reminders fire from the SHELL, once per rep-local day, and the ticker is server-quiet', () => {
  const nc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const core = 'script_core.html';
  const coreSrc = nc(extractScript('script_core.html'));
  assert.ok(/remindersStart_\(\);/.test(coreSrc),
    'the ticker starts at shell boot, so it runs on EVERY view (incl. the pinned pop-out)');
  const tick = nc(extractFunction(core, 'remindersTick_'));
  // The break half is pure arithmetic — no RPC — so the common case costs
  // nothing. The clock-out half is the only one that may refresh, and only
  // inside the end-of-shift window.
  assert.ok(!/google\.script\.run/.test(tick),
    'the tick itself makes no server call; the bounded refresh is its own helper');
  assert.ok(/nowMin >= endMin \+ 5 && nowMin <= endMin \+ 120/.test(tick),
    'the clock-out nudge is confined to a window after the shift ends');
  const refresh = nc(extractFunction(core, 'remindMaybeRefreshState_'));
  assert.ok(/10 \* 60 \* 1000/.test(refresh),
    'the punch-state refresh is throttled to at most once per 10 minutes');
  assert.ok(/withFailureHandler\(function \(\) \{\}\)/.test(refresh),
    'a failed refresh keeps the last-good state rather than clearing it');
  // Once per day, reset on the REP's day rollover (not the browser's).
  const once = nc(extractFunction(core, 'remindOnce_'));
  assert.ok(/_remindFired\[key\]/.test(once), 'each reminder fires at most once per key');
  assert.ok(/today !== _remindDay/.test(tick),
    'the fired-set resets on the rep-local day rollover, so it cannot grow in a long-lived pop-out');
  assert.ok(/isoDateTz\(tz\)/.test(tick) && /empTz/.test(tick),
    'the day and the clock are derived in the REP\'s timezone, never browser-local (the F6 rule)');
  // An unknown punch state must not nag.
  const st = nc(extractFunction(core, 'remindPunchState_'));
  // Both directions must be read explicitly: a fallthrough that assumes
  // "clocked out" would be just as wrong as one that assumes "clocked in".
  assert.ok(/indexOf\('ClockOut'\) >= 0\) return 'in'/.test(st) &&
            /indexOf\('ClockIn'\) >= 0\) return 'out'/.test(st),
    'the state is read off the offered next-actions in BOTH directions');
  assert.strictEqual((st.match(/return 'unknown'/g) || []).length, 2,
    'no-actions AND unrecognised-actions both yield unknown — never a guess');
  assert.ok(/remindPunchState_\(\) === 'in'/.test(tick),
    'only a positively clocked-in state triggers the clock-out reminder');
  // And the Clock view must not double-fire the one that moved.
  const clk = nc(extractFunction('tc/script_clock.html', 'clkUpdateBreak_'));
  assert.ok(!/showToast\(/.test(clk),
    'clkUpdateBreak_ only paints the chip — firing here too would double-toast');
  assert.ok(!/clkBreakReminderMin_/.test(nc(extractScript('tc/script_clock.html'))),
    'the Clock-local lead-time helper went with its only reader (INV-184)');
});

// ---------------------------------------------------------------------------
// Operator round 2026-08-12 — clock-card cleanup, Dashboard KPI banding +
// month-over-month deltas, and reminder toasts that wait for their reader.
console.log('\noperator 2026-08-12: clock cleanup, dashboard deltas, sticky reminders');

test('the clock-card photo capability and the moon are fully gone (INV-184)', () => {
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  // Selector AND behaviour: a dead rule left behind is the next reader's false
  // lead, and a dead localStorage key is operator state nobody maintains.
  ['clk-hero-bg', 'clk-bg-ctrl', 'clk-bg-btn', 'has-bg', 'clk-moon',
   'umsClockBg', 'CLK_BG_KEY', 'clkBgApply_', 'clkBgChoose_', 'clkBgOnFile_',
   'clkBgDownscale_', 'clkMoonPhase_', 'CLK_MOON_SHADE'].forEach((dead) => {
    assert.ok(clk.indexOf(dead) < 0, dead + ' reappeared in the Clock partial');
  });
  // The star field and the shooting star SURVIVE — only the moon went.
  // Assert the star field is still EMITTED, not merely that the class is
  // mentioned somewhere — a surviving CSS rule proves nothing about the render.
  assert.ok(/deco\.className = 'clk-stars'/.test(clk) && /class="st'/.test(clk),
    'the star field still renders');
  assert.ok(/function clkShootMaybe_/.test(clk) && /clk-shoot/.test(clk), 'and the shooting star with it');
  // And the z-index rule no longer excludes selectors nothing emits.
  assert.ok(!/:not\(\.clk-sky-bg\)|:not\(\.clk-bg-ctrl\)/.test(clk),
    'the sky z-index rule dropped its dead :not() exclusions');
});

// The slack constant is module-level, so pull the REAL declaration into the
// sandbox rather than mirroring its value here (a mirrored 5 would drift).
vm.runInContext(
  extractScript('tc/script_clock.html').match(/var DASH_TONE_SLACK_PP = [^;]+;/)[0], sb);
const dashPctTone_ = loadFunction(sb, 'tc/script_clock.html', 'dashPctTone_');
const dashDelta_ = loadFunction(sb, 'tc/script_clock.html', 'dashDelta_');

test('dashPctTone_ — bands by direction, and renders NO verdict without a target', () => {
  // % Answered: higher is better, target 85.
  assert.strictEqual(dashPctTone_(88, 85, false), 'good');
  assert.strictEqual(dashPctTone_(85, 85, false), 'good', 'AT target is good, not warn');
  assert.strictEqual(dashPctTone_(81, 85, false), 'warn', 'within the 5pp slack');
  assert.strictEqual(dashPctTone_(80, 85, false), 'warn', 'exactly 5pp off is still warn');
  assert.strictEqual(dashPctTone_(79, 85, false), 'crit');
  // Transfer %: LOWER is better — the direction is the whole point.
  assert.strictEqual(dashPctTone_(12, 20, true), 'good');
  assert.strictEqual(dashPctTone_(24, 20, true), 'warn');
  assert.strictEqual(dashPctTone_(31, 20, true), 'crit');
  assert.strictEqual(dashPctTone_(12, 20, false), 'crit', 'the direction flag actually flips the band');
  // A colour is a verdict: with no target (operator nulled CDR_TRANSFER_TARGET_PCT,
  // or an older server that ships neither) the value renders untoned.
  assert.strictEqual(dashPctTone_(12, null, true), '', 'no target → no tone');
  assert.strictEqual(dashPctTone_(null, 20, true), '', 'no value → no tone');
});

test('dashDelta_ — an absent comparison is NOT "no change", and volumes get no verdict', () => {
  assert.strictEqual(dashDelta_(88, null, 'pp', false), null, 'missing prior → no delta at all');
  assert.strictEqual(dashDelta_(null, 80, 'pp', false), null);
  assert.strictEqual(dashDelta_(80, 80, 'pp', false).text, 'no change', 'equal IS reported, distinctly');
  const up = dashDelta_(88, 80, 'pp', false);
  assert.strictEqual(up.text, '▲ 8 pp');
  assert.strictEqual(up.tone, 'good', 'rising % Answered is good');
  assert.strictEqual(dashDelta_(24, 20, 'pp', true).tone, 'crit', 'rising Transfer % is not');
  assert.strictEqual(dashDelta_(16, 20, 'pp', true).tone, 'good');
  // A volume delta is call load, not performance — arrow, no colour.
  const vol = dashDelta_(120, 100, 'count');
  assert.strictEqual(vol.text, '▲ 20');
  assert.strictEqual(vol.tone, '', 'volume carries no verdict');
  assert.strictEqual(dashDelta_(310, 295, 'sec').text, '▲ 15s', 'talk time reads in seconds');
});

test('dashboardPrevRange_ — MTD compares LIKE-FOR-LIKE elapsed days, clamped down', () => {
  const ctx = vm.createContext({ Date, String, Math });
  vm.runInContext(extractRawFunction('Code.js', 'dashboardPrevRange_'), ctx, { filename: 'Code.js#prev' });
  vm.runInContext('var DASH_MONTH_ABBR = ' +
    JSON.stringify(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']) + ';', ctx);
  const r = ctx.dashboardPrevRange_('mtd', '2026-08-12');
  // NOT the whole prior month: 12 days against 31 would read as a collapse
  // every month and "recover" on the 31st.
  assert.strictEqual(r.from + '..' + r.to, '2026-07-01..2026-07-12');
  assert.strictEqual(r.label, 'Jul 1–12', 'the label states the window it compares');
  assert.strictEqual(!!r.clamped, false);
  // Clamps DOWN into a shorter month — never up, so the comparison can only
  // under-report (the safe direction for a figure a rep is judged by).
  const feb = ctx.dashboardPrevRange_('mtd', '2026-03-31');
  assert.strictEqual(feb.from + '..' + feb.to, '2026-02-01..2026-02-28');
  assert.strictEqual(feb.clamped, true);
  assert.strictEqual(ctx.dashboardPrevRange_('mtd', '2028-03-30').to, '2028-02-29', 'leap year');
  assert.strictEqual(ctx.dashboardPrevRange_('mtd', '2026-01-09').from, '2025-12-01', 'January crosses the year');
  // Deliberately scoped: only MTD is compared.
  ['yesterday', 'ytd', ''].forEach((k) => assert.strictEqual(ctx.dashboardPrevRange_(k, '2026-08-12'), null));
  assert.strictEqual(ctx.dashboardPrevRange_('mtd', 'nonsense'), null);
});

test('getDashboardMetrics: one shaper for both windows, best-effort prev, degraded rounds uncached', () => {
  const strip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const fn = strip(extractRawFunction('Code.js', 'getDashboardMetrics'));
  // ONE shaper, called for the period AND its comparison — a delta computed
  // from a differently-shaped figure than the value above it is worse than none.
  assert.strictEqual((fn.match(/var shapeWindow = function/g) || []).length, 1, 'ONE shaper');
  assert.strictEqual((fn.match(/= shapeWindow\(/g) || []).length, 2,
    'called for the period AND its comparison window');
  assert.ok(/try \{[\s\S]*shapeWindow\(prevRange\.from, prevRange\.to\)[\s\S]*catch \(e\) \{ prevUnavailable = true/.test(fn),
    'the comparison read is best-effort — a failure drops the deltas, never the numbers');
  assert.ok(/!noteRes\.unavailable && !prevUnavailable/.test(fn),
    'a degraded round is never cached (INV-129) — otherwise the blip outlives itself');
  assert.ok(/transferTarget: \(CONFIG\.CDR_TRANSFER_TARGET_PCT == null\) \? null/.test(fn),
    'an unset transfer target ships null so the client renders NO tone (a verdict nobody set)');
  // The client must not mirror either threshold.
  const clk = strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  assert.ok(!/transferTarget\s*\|\|\s*\d/.test(clk) && !/alertThreshold\s*\|\|\s*\d/.test(clk),
    'the Dashboard never invents its own threshold');
});

test('both dashboard cards open on MTD, derived from the period list', () => {
  const clk = fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8');
  assert.ok(/CLK_DASH_DEFAULT_IDX = CLK_DASH_PERIODS\.indexOf\('mtd'\)/.test(clk),
    'derived, so reordering the period list cannot silently repoint the default');
  assert.ok(/mine: CLK_DASH_DEFAULT_IDX, team: CLK_DASH_DEFAULT_IDX/.test(clk),
    'BOTH cards — two adjacent cards on different periods reads as a bug');
  assert.ok(/CLK_DASH\.mine = CLK_DASH_DEFAULT_IDX; CLK_DASH\.team = CLK_DASH_DEFAULT_IDX;/.test(clk),
    'and the new-day reset returns to the same default, not to index 0');
  // The comparison window is NAMED in the card, and a failed read says so.
  const note = extractFunction('tc/script_clock.html', 'clkDashCompareNote_');
  assert.ok(/vs ' \+ esc\(prevLabel\)/.test(note) && /comparison unavailable/.test(note),
    'the foot names the window, and distinguishes a failed comparison from none');
});

test('a reminder toast waits for its reader; routine toasts still self-dismiss', () => {
  const core = extractFunction('script_core.html', 'showToast');
  assert.ok(/if \(!opts\.sticky\) setTimeout\(dismiss, 3500\)/.test(core),
    'only NON-sticky toasts auto-dismiss');
  assert.ok(/x\.setAttribute\('aria-label'/.test(core) && /createElement\('button'\)/.test(core),
    'a toast with no timeout owes a real, named dismiss control (INV-173)');
  // The cap must not silently evict the reminder the rep has not seen yet.
  assert.ok(/querySelector\('\.toast:not\(\.toast-sticky\)'\) \|\| stack\.firstChild/.test(core),
    'the stack cap evicts the oldest NON-sticky first, and stays a real bound');
  const rem = extractFunction('script_core.html', 'notifyRemind_');
  assert.ok(/showToast\(msg, tone \|\| 'toast-warn', \{ sticky: true \}\)/.test(rem),
    'every reminder goes out sticky — the chime calls the rep back after 3.5s has passed');
  const css = fs.readFileSync(path.join(__dirname, '../../web-app/styles.html'), 'utf8');
  assert.ok(/\.toast-x \{/.test(css), 'the dismiss control is styled, not a bare UA button');
});


// ---------------------------------------------------------------------------
// Colour palettes (operator 2026-08-12). Four rules hold the feature together;
// each is a thing that would be invisible in review and obvious to a user.
console.log('\ncolour palettes — contract, construction, and the picker');

test('a palette redefines the NEUTRALS and the ACCENT — never a semantic colour', () => {
  const { blocks } = tokenBlocks();
  // Green means resolved, amber at risk, red overdue. A theme that restates a
  // verdict in another hue makes every status chip mean something different
  // per user — so the semantic set is off-limits to a palette by contract.
  const FORBIDDEN = ['good', 'good-soft', 'warn', 'warn-soft', 'destructive', 'destructive-soft',
    'info', 'info-soft', 'success-deep', 'warning-deep', 'danger-deep', 'info-deep',
    'intake-ppd', 'intake-pmd', 'intake-pap'];
  const pal = blocks.filter((b) => b.palette !== 'console');
  assert.ok(pal.length >= 6, 'at least three alternative palettes x two modes');
  pal.forEach((b) => {
    FORBIDDEN.forEach((tok) => {
      assert.ok(!new RegExp('--' + tok + ':').test(b.body),
        b.id + ' redefines the semantic token --' + tok + ' — a palette may not restate a verdict');
    });
    // And it must declare the full neutral set, so the block is verifiable on
    // its own rather than depending on what happens to cascade into it.
    ['paper', 'paper-2', 'paper-3', 'paper-card', 'ink', 'muted', 'muted-2', 'muted-3',
     'line', 'line-2', 'accent', 'accent-2'].forEach((tok) => {
      assert.ok(b.vals[tok], b.id + ' is missing --' + tok);
    });
  });
});

test('every palette colour is a hue rotation at CONSTANT luminance', () => {
  const { blocks } = tokenBlocks();
  // This is the CONSTRUCTION that makes the AA test above pass for a palette
  // nobody re-measured by hand: each colour has the same WCAG relative
  // luminance as its Console counterpart, so every contrast ratio in the app
  // is preserved exactly. If someone hand-edits a hex, this catches it even
  // when the edit happens to stay above 4.5:1.
  const base = Object.fromEntries(blocks.filter((b) => b.palette === 'console').map((b) => [b.mode, b.vals]));
  blocks.filter((b) => b.palette !== 'console').forEach((b) => {
    Object.keys(b.vals).forEach((tok) => {
      const ref = base[b.mode][tok];
      if (!ref) return;                       // a token Console does not declare as hex
      const d = Math.abs(wcagLum(b.vals[tok]) - wcagLum(ref));
      assert.ok(d < 0.004, b.id + ' --' + tok + ' ' + b.vals[tok] + ' has luminance ' +
        wcagLum(b.vals[tok]).toFixed(4) + ' vs Console ' + ref + ' ' + wcagLum(ref).toFixed(4) +
        ' — a palette re-tints at constant luminance so contrast is preserved by construction');
    });
    assert.strictEqual(b.vals['paper-card'], base[b.mode]['paper-card'] === '#ffffff' && b.mode === 'light'
      ? '#ffffff' : b.vals['paper-card'],
      'light --paper-card must stay #ffffff — white is the only colour at luminance 1.0');
  });
});

test('the picker swatches are pinned to the palettes they claim to preview', () => {
  const { toks, blocks } = tokenBlocks();
  // The first hand-typed version of the swatch block had ALREADY drifted from
  // the generated palette hexes — a picker that previews the wrong colour is
  // worse than no preview.
  const darkAt = toks.indexOf(':root[data-mode="dark"], body[data-mode="dark"] {\n    --pal-');
  assert.ok(darkAt > 0, 'the dark swatch block exists (a swatch must preview what the rep gets)');
  const sw = (mode) => {
    const scope = mode === 'dark' ? toks.slice(darkAt)
      : toks.slice(toks.indexOf('--pal-console-paper'), darkAt);
    return Object.fromEntries([...scope.matchAll(/--pal-([a-z]+)-(paper|accent):\s*(#[0-9a-f]{6})/g)]
      .map((m) => [m[1] + '-' + m[2], m[3]]));
  };
  ['light', 'dark'].forEach((mode) => {
    const swatches = sw(mode);
    blocks.filter((b) => b.mode === mode).forEach((b) => {
      ['paper', 'accent'].forEach((k) => {
        assert.strictEqual(swatches[b.palette + '-' + k], b.vals[k],
          'swatch --pal-' + b.palette + '-' + k + ' (' + mode + ') must equal the palette block');
      });
    });
  });
});

test('the palette key list is the same in all three places it appears', () => {
  const { toks } = tokenBlocks();
  const core = fs.readFileSync(path.resolve(__dirname, '../../web-app/script_core.html'), 'utf8');
  const idx = fs.readFileSync(path.resolve(__dirname, '../../web-app/index.html'), 'utf8');
  const inCss = [...new Set([...toks.matchAll(/:root\[data-palette="([a-z]+)"\]/g)].map((m) => m[1]))].sort();
  const reg = core.slice(core.indexOf('const PALETTES = ['), core.indexOf('];', core.indexOf('const PALETTES = [')));
  const inReg = [...reg.matchAll(/key: '([a-z]+)'/g)].map((m) => m[1]);
  const inBoot = JSON.parse((idx.match(/var PALETTE_KEYS = (\[[^\]]+\])/) || [])[1].replace(/'/g, '"'));
  // Console is the DEFAULT: it has no stylesheet block by design, so it must
  // be first in both lists and absent from the CSS.
  assert.strictEqual(inReg[0], 'console', 'Console leads the picker');
  assert.strictEqual(inBoot[0], 'console', 'and the boot list');
  assert.ok(inCss.indexOf('console') < 0, 'Console declares no block — an unknown value degrades to it');
  assert.deepStrictEqual(inReg.slice(1).sort().join(','), inCss.join(','),
    'the picker offers exactly the palettes the stylesheet defines');
  assert.deepStrictEqual(inBoot.slice().sort().join(','), inReg.slice().sort().join(','),
    'the boot allowlist and the picker agree');
  // The boot gate must reject an unknown stored value rather than reflect it.
  assert.ok(/PALETTE_KEYS\.indexOf\(storedPal\) > 0 \? storedPal : 'console'/.test(idx),
    'a corrupt stored palette degrades to Console');
});

test('the picker is real buttons inside the settings flyout, reflected on render', () => {
  const core = fs.readFileSync(path.resolve(__dirname, '../../web-app/script_core.html'), 'utf8');
  const css = fs.readFileSync(path.resolve(__dirname, '../../web-app/styles.html'), 'utf8');
  const strip = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const c = strip(core);
  // INV-173: a colour swatch is a control, so it is a <button> with a NAME —
  // a colour alone does not say which palette it is.
  assert.ok(/<button type="button" class="sb-pal-btn" data-palette-target="\$\{p\.key\}"[\s\S]*?aria-label="\$\{esc\(p\.label\)\} palette"/.test(c),
    'each swatch is a named button');
  // INV-191: the reflector keys on the attribute that MEANS palette swatch.
  const idx = strip(fs.readFileSync(path.resolve(__dirname, '../../web-app/index.html'), 'utf8'));
  assert.ok(/querySelectorAll\('\[data-palette-target\]'\)/.test(idx),
    'the reflector selects by data-palette-target, not by a class another control may borrow');
  // Settings-flyout consolidation (operator 2026-08-13): the picker renders
  // ONCE, inside the shared panel both gears open — the panel mounts at the
  // SHELL root (after the .app-shell close), never inside the sidebar, which
  // is display:none on mobile where the header gear must still reach it.
  assert.strictEqual((c.match(/\$\{paletteToggle\}/g) || []).length, 1, 'the panel is the single render site');
  assert.ok(/<\/div>\s*\$\{settingsPanel\}`;/.test(c), 'the panel mounts at the shell root');
  assert.ok(/syncPaletteToggleState\(\);/.test(c), 'renderShell reflects the stored palette on every render');
  assert.ok(!/id="sb-pal/.test(c), 'no id on the swatches');
  // BOTH gears carry the attribute the toggle/reflector key on (INV-191), and
  // the panel owes the [hidden] companion because its class sets display (the
  // [hidden]-vs-display gotcha — without it the panel ships permanently open).
  assert.strictEqual((c.match(/data-settings-toggle/g) || []).length >= 2, true, 'sidebar AND header gears exist');
  assert.ok(/\.settings-panel\[hidden\] \{ display: none; \}/.test(strip(css)),
    'the panel has the [hidden] display companion');
});

test('the DOM harness stubs every global index.html defines (derived)', () => {
  // index.html's <head> script is not a partial, so the jsdom harness stubs
  // its globals by hand — and a new one (setTimeClockPalette) silently broke
  // 19 DOM tests the moment renderShell called it. Derive the obligation
  // rather than remembering it (INV-179).
  const idx = fs.readFileSync(path.resolve(__dirname, '../../web-app/index.html'), 'utf8');
  const boot = fs.readFileSync(path.resolve(__dirname, 'dom/boot.js'), 'utf8');
  const defined = [...new Set([...idx.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=\s*function/g)].map((m) => m[1]))];
  assert.ok(defined.length >= 4, 'found the boot-script globals');
  defined.forEach((g) => assert.ok(new RegExp('window\\.' + g + '\\s*=').test(boot),
    'test/client/dom/boot.js does not stub window.' + g + ' — the shell calls it by bare name'));
});

test('a palette block out-specifies the base dark block in BOTH directions', () => {
  const { toks } = tokenBlocks();
  // The trap this codebase has hit twice (V-2/V-3): :root[data-palette="x"]
  // and :root[data-mode="dark"] are BOTH (0,2,0), so for a dark-mode user on a
  // palette the winner would be decided by SOURCE ORDER. The :not() / paired-
  // attribute forms make both (0,3,0), which beats the base block regardless
  // of where the palette block sits in the file.
  const light = toks.match(/:root\[data-palette="[a-z]+"\]:not\(\[data-mode="dark"\]\)/g) || [];
  const dark = toks.match(/:root\[data-palette="[a-z]+"\]\[data-mode="dark"\]/g) || [];
  assert.ok(light.length >= 3 && light.length === dark.length,
    'each palette carries a :not([data-mode="dark"]) light block and a paired-attribute dark block');
  assert.ok(!/:root\[data-palette="[a-z]+"\]\s*[,{]/.test(toks),
    'a bare :root[data-palette=x] block would tie with the base dark block on specificity');
});

// ---------------------------------------------------------------------------
// Operator round 2026-08-13 — Notes fixes: copy scope + no last-dept default.
console.log('\noperator 2026-08-13: copy scope + composer defaults');

test('a real selection copies natively; the full-template intercept fires only when collapsed', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const i = cn.indexOf("frame.addEventListener('copy'");
  assert.ok(i > 0, 'the copy failover still exists');
  const handler = cn.slice(i, cn.indexOf('});', i));
  // The original rationale (input/textarea contribute nothing to a selection)
  // died with the contenteditable refactor; the blanket intercept had inverted
  // into the bug — copying a phone number pasted the whole template.
  const guardAt = handler.indexOf('sel.isCollapsed');
  const writeAt = handler.indexOf('cnReadActiveForm_');
  assert.ok(guardAt > 0 && writeAt > 0 && guardAt < writeAt,
    'the selection guard runs BEFORE the template write');
  assert.ok(/!sel\.isCollapsed && String\(sel\.toString\(\)\)\.trim\(\)\) return/.test(handler),
    'a non-empty selection returns to the browser default (copies what is selected)');
});

test('the internal composer no longer remembers the last dept selection', () => {
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  // Operator decision: pre-selecting the PREVIOUS note's departments on an
  // unrelated note invites a mis-send — the failure mode is an email leaving
  // the building, not retyping. Reader AND writer both gone (a read with no
  // writer is the INV-184 dead-key class; a writer with no reader recreates
  // the key for nothing).
  [cn, kb].forEach((src, i) => {
    assert.ok(src.indexOf("localStorage.getItem('umsCallNotesLastDept'") < 0 &&
              src.indexOf("localStorage.setItem('umsCallNotesLastDept'") < 0,
      ['cn', 'kb'][i] + ' partial still touches umsCallNotesLastDept');
  });
  // A re-send still restores the note's OWN stored departments — that branch
  // must survive (it is the note's data, not a cross-note guess).
  assert.ok(/departments: \[\], individualEmail: '', updateInfo: '',/.test(cn.replace(/\n\s*/g, ' ')),
    'the subformData restore path is intact');
});

test('dashboard cold start: one read pair per window; first arrival paints, later ones patch', () => {
  const strip = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const fn = strip(extractRawFunction('Code.js', 'getDashboardMetrics'));
  // The own row is DERIVED from the team map — a second [emp.name]-filtered
  // scan of the same sheets doubled the cold-start cost across the periods.
  assert.ok(!/getCdrAgentMetrics_\([^)]*\[emp\.name\]/.test(fn) && !/getCsrTransferPerRepDaily_\([^)]*\[emp\.name\]/.test(fn),
    'no own-only CDR read remains — own comes from the team map');
  assert.ok(/var dq = dqMap\[emp\.name\] \|\| null;/.test(fn), 'own DQE derived');
  assert.ok(/var tr = trMap\[emp\.name\] \|\| null;/.test(fn), 'own transfer derived');
  // Client: the slowest period (YTD) must not gate the first paint.
  const clk = strip(fs.readFileSync(path.join(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  const loader = extractFunction('tc/script_clock.html', 'clkLoadDashboard_');
  const paintAt = loader.indexOf('if (!painted) { painted = true; clkRenderDashboard_(); }');
  const gateAt = loader.indexOf('if (done < need) return;');
  assert.ok(paintAt > 0 && /else clkDashPatchPeriod_\(pk\);/.test(loader),
    'first arrival renders; later arrivals patch their own slides');
  assert.ok(gateAt > paintAt,
    'the paint comes BEFORE the all-arrived gate — moving it after re-creates the wait-for-YTD stall');
  const patch = extractFunction('tc/script_clock.html', 'clkDashPatchPeriod_');
  assert.ok(/trk\.children\[idx\]/.test(patch) && /clkDashFit_\(key\)/.test(patch) &&
    !/clkRenderDashboard_|clkLoadDashboardExtras_/.test(patch),
    'the patch swaps slide innerHTML + refits — never a full re-render (extras RPCs would duplicate)');
  // A pending period renders a SKELETON, never "No call data" (INV-187:
  // absence of a read is not an empty read) — and a new day drops prior-day
  // payloads so the skeleton path is actually reachable.
  const own = extractFunction('tc/script_clock.html', 'clkDashOwnCard_');
  const team = extractFunction('tc/script_clock.html', 'clkDashTeamCard_');
  [own, team].forEach((f, i) => assert.ok(
    f.indexOf('res === undefined) return clkDashSkelKpis_()') > 0 &&
    f.indexOf('res === undefined') < f.indexOf('clkDashEmpty_'),
    ['own', 'team'][i] + ' card: undefined → skeleton, checked BEFORE the empty state'));
  assert.ok(/CLK_DASH\.data = \{\};/.test(clk), 'a new day resets the payload store');
});

test('activity-without-clock-in reminder: grace + activity + CONFIRMED-out, once per day', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const tick = nc(extractFunction('script_core.html', 'remindersTick_'));
  // All four gates, in one condition: shift window past the grace, recent real
  // input, a punch state that positively reads OUT, and not-already-fired.
  assert.ok(/nowMin >= startMin \+ REMIND_CLOCKIN_GRACE_MIN && nowMin < endMin/.test(tick),
    'gated to the shift window past the start grace (everyone opens the app at 9:00 to clock in)');
  assert.ok(/_remindLastActivityAt < REMIND_ACTIVITY_WINDOW_MS/.test(tick),
    'requires recent real input — an app left open on a day off is not activity');
  assert.ok(/remindPunchState_\(\) === 'out'/.test(tick),
    "only a POSITIVE 'out' reading counts — unknown never nags (the (b) posture)");
  // The stale-snapshot trap: a rep who clocked in from ANOTHER window still
  // reads 'out' in this window's boot snapshot. The nag therefore requires a
  // recently-CONFIRMED snapshot; a stale one triggers a bounded refresh and
  // only the NEXT tick may nag.
  assert.ok(/_remindStateOkAt < REMIND_STATE_CONFIRM_MS\) \{\s*\n\s*remindOnce_\(today \+ ':in'/.test(tick),
    'nag only off a confirmed snapshot');
  assert.ok(/\} else \{\s*\n\s*remindMaybeRefreshState_\(\);/.test(tick),
    'a stale out-reading refreshes instead of nagging');
  // And "confirmed" must mean a SUCCESSFUL refresh — stamping on the attempt
  // would promote stale state to confirmed when the refresh failed.
  const refresh = nc(extractFunction('script_core.html', 'remindMaybeRefreshState_'));
  assert.ok(/if \(s && !s\.error\) \{ empState = s; viewAsReapply_\(\); _remindStateOkAt = Date\.now\(\); \}/.test(refresh),
    '_remindStateOkAt is stamped inside the success handler only (and preview flags survive the refresh)');
  assert.ok(!/withFailureHandler\(function \(\) \{[^}]*_remindStateOkAt/.test(refresh),
    'and never on failure');
  // Activity is INPUT, not presence: pointer + keys only, capture + passive.
  const start = nc(extractFunction('script_core.html', 'remindersStart_'));
  assert.ok(/\['pointerdown', 'keydown'\]/.test(start) && /capture: true, passive: true/.test(start),
    'activity listener is input-only, capture-phase, passive');
  assert.ok(!/mousemove|scroll/.test(start), 'mousemove/scroll would count an untouched window as active');
});

test('auto-tag: rules ADD, dismissal sticks, session resets with the form', () => {
  const cnAutoTagsFromText_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnAutoTagsFromText_');
  const rules = [
    { tag: 'close-order', keywords: ['close order', 'cancel order'] },
    { tag: 'billing', keywords: ['invoice'] },
  ];
  // Case-insensitive substring, first matching keyword wins for its rule.
  assert.deepStrictEqual(cnAutoTagsFromText_('Patient wants to CLOSE ORDER today', rules, [], []).join(','), 'close-order');
  assert.deepStrictEqual(cnAutoTagsFromText_('sent invoice; then close order', rules, [], []).join(','), 'close-order,billing');
  // Already-present and dismissed tags are both skipped — a rep who removed an
  // auto-added tag has ANSWERED for this note; re-adding on the next keystroke
  // would fight them for the chip.
  assert.strictEqual(cnAutoTagsFromText_('close order', rules, ['close-order'], []).length, 0, 'present → skip');
  assert.strictEqual(cnAutoTagsFromText_('close order', rules, [], ['close-order']).length, 0, 'dismissed → skip');
  assert.strictEqual(cnAutoTagsFromText_('nothing relevant', rules, [], []).length, 0);
  assert.strictEqual(cnAutoTagsFromText_('', rules, [], []).length, 0, 'empty text matches nothing');
  // Wiring: removal records the dismissal ONLY for auto-added tags, and the
  // form-clear path resets both session sets (they are per NOTE).
  const cn = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(/autoTagApplied \|\| \[\]\)\.indexOf\(t\) >= 0/.test(cn), 'removal checks the auto-applied set');
  const clear = extractFunction('cn/script_callnotes.html', 'cnClearActiveForm_');
  assert.ok(/CN_STATE\.autoTagApplied = \[\];\s*\n\s*CN_STATE\.autoTagDismissed = \[\];/.test(clear),
    'clearing the form resets both auto-tag session sets');
  // The matcher runs CLIENT-side on the same debounce as the suggestions —
  // note text never leaves the browser (the INV-119 posture). Strip comments
  // before matching (INV-188 — the wiring lines carry trailing comments).
  const ncc = cn.replace(/\/\/[^\n]*/g, '');
  assert.ok(/cnApplyAutoTags_\(\);\s*\n\s*cnRefreshTagSuggest_\(\);/.test(ncc),
    'auto-apply rides the existing Issue/Resolution debounce');
});

test('auto-tag rules: sanitize-on-read mirrors the save validation (server)', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const read = nc(extractRawFunction('Code.js', 'getAutoTagRules_'));
  const save = nc(extractRawFunction('Code.js', 'saveAutoTagRules'));
  // Both sides normalize the tag identically (kebab, 2–24) so a rejected save
  // and a sanitized read can never disagree about what a valid rule is.
  const norm = /\.trim\(\)\.toLowerCase\(\)\s*\n?\s*\.replace\(\/\[\^a-z0-9\]\+\/g, '-'\)\.replace\(\/\^-\+\|-\+\$\/g, ''\)/;
  assert.ok(norm.test(read) && norm.test(save), 'read and save share the tag normalization');
  assert.ok(/tag\.length < 2 \|\| tag\.length > 24/.test(read) && /tag\.length < 2 \|\| tag\.length > 24/.test(save),
    'both bound the tag length');
  // Read side DROPS a malformed entry (a corrupt property must not break every
  // rep's matcher); save side REFUSES with the rule named (an admin can fix it).
  assert.ok(/if \(kws\.length\) out\.push/.test(read), 'read: entry-wise drop, never a throw');
  assert.ok(/Admin access required/.test(save), 'save is admin-gated (INV-136 tier)');
  assert.ok(/appears twice/.test(save), 'duplicate tags are refused, not silently merged');
  assert.ok(/CN_AUTO_TAG_RULE_LIMIT/.test(save), 'rule count is bounded');
  // Shipped to reps beside the other composer config; admins get it in the editor.
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  assert.strictEqual((code.match(/autoTagRules: getAutoTagRules_\(\),/g) || []).length, 2,
    'getCallNotesDepartments AND getAdminConfig both carry the rules');
});

test('intake feedback loop: gated writer, existence check, PHI-free audit, CTA outside the hash', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const code = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const w = nc(extractRawFunction('Code.js', 'submitIntakeFeedback'));
  assert.ok(/getEmployeeInfo_\(\)/.test(w) && /Not authorized/.test(w),
    'the writer requires a registered employee — the page only collects text');
  assert.ok(/INTAKE_FORM_TYPES_\.indexOf\(ft\) < 0/.test(w) && /INTAKE_FEEDBACK_MAX_CHARS/.test(w),
    'form type whitelisted + text bounded');
  const existAt = w.indexOf('Submission not found');
  const appendAt = w.indexOf('getIntakeFeedbackSheet_().appendRow');
  assert.ok(existAt > 0 && appendAt > existAt,
    'the submission must EXIST before the append — a forged id cannot seed junk rows');
  // The feedback TEXT may reference the patient: it lives in the Intake (PHI)
  // store only; the shared AuditLog row carries id + type, never the text.
  // The audit call's notes arg must be EXACTLY id+type — extract the call and
  // assert the feedback text variable never enters it (a [^;]* scan stops at
  // the semicolon INSIDE the quoted string, which is how the first version of
  // this pin failed to bite).
  const auditCall = w.slice(w.indexOf("writeAuditLog_(emp, 'IntakeFeedback'"), w.indexOf('emp.email);', w.indexOf("writeAuditLog_(emp, 'IntakeFeedback'")));
  assert.ok(/'type=' \+ ft \+ '; submissionId=' \+ id,\s*$/.test(auditCall) && auditCall.indexOf('body') < 0,
    'audit row is PHI-free — id + type only, never the feedback text');
  assert.ok(/lock\.waitLock\(15000\)/.test(w) && /finally \{ lock\.releaseLock\(\); \}/.test(nc(w)),
    'locked + finally-released (INV-01)');
  // CTA placement: minted BEFORE the send, appended to the FINAL body only —
  // AFTER the hash check, so the INV-41 preview contract (over the BASE body)
  // is untouched. And a dead button is worse than none.
  const ppd = nc(extractRawFunction('Code.js', 'intakeSendPPD'));
  // The BASE body (the hashed one) must stay CTA-free — asserting the exact
  // statement catches an appended CTA, where "the CTA call comes after the
  // hash check" would not (the mutated base line adds its OWN call earlier).
  assert.ok(/const baseBody = intakeBuildPpdBodyHtml_\(patientInfo, payload\.rows \|\| \[\], recData, null\);/.test(ppd),
    'PPD: the hashed base body carries no CTA (INV-41 contract untouched)');
  assert.ok(ppd.indexOf("intakeFeedbackCta_(submissionId, 'PPD')") > ppd.indexOf('intakeBodyHash_(baseBody, subject)'),
    'PPD: CTA joins the final body after the hash check');
  const mintAt = ppd.indexOf('const submissionId = Utilities.getUuid()');
  assert.ok(mintAt > 0 && mintAt < ppd.indexOf('MailApp.sendEmail'),
    'PPD: the id is minted (and BEFORE the send) so the button can reference it — indexOf -1 would pass a < check');
  const cta = nc(extractRawFunction('Code.js', 'intakeFeedbackCta_'));
  assert.ok(/if \(!base\) return '';/.test(cta), 'no resolvable exec URL → no button (never a dead one)');
  // The route exists, and the detail read surfaces the rows for ALL forms.
  assert.ok(/e\.parameter\.intakefb/.test(nc(extractRawFunction('Code.js', 'doGet'))), 'doGet routes ?intakefb=');
  assert.ok(/feedback: intakeFeedbackFor_\(ft, id\)/.test(nc(extractRawFunction('Code.js', 'intakeGetSubmission'))),
    'the Sent detail carries the feedback rows');
  // Client render: escapes, and an EMPTY feedback list renders NOTHING — an
  // empty "Recipient feedback" section would read as "no complaints yet",
  // which the data cannot support.
  const intake = fs.readFileSync(path.join(__dirname, '../../web-app/intake/script_intake.html'), 'utf8');
  assert.ok(/Array\.isArray\(d\.feedback\) && d\.feedback\.length/.test(intake), 'feedback section only when rows exist');
  assert.ok(/esc\(String\(f\.text \|\| ''\)\)/.test(intake), 'feedback text is esc()-escaped before innerHTML');
});

console.log('\nkb — article-image server fallback (operator 2026-08-13)');

test('kbGetImageData: employee-gated, FOLDER-SCOPED, capped, leak-free, lock-free', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const f = nc(extractRawFunction('Code.js', 'kbGetImageData'));
  assert.ok(/getEmployeeInfo_\(\)/.test(f) && /Not authorized/.test(f), 'requires a registered employee');
  // THE SCOPE CHECK IS THE SECURITY BOUNDARY: the web app runs as the
  // deployer, so without the parents check any signed-in employee could read
  // ANY Drive file the deployer's account can open, by id.
  const parentsAt = f.indexOf('file.getParents()');
  const gateAt = f.indexOf('if (!inKbFolder) return');
  const bytesAt = f.indexOf('base64Encode');
  assert.ok(parentsAt > 0 && gateAt > parentsAt && bytesAt > gateAt,
    'parents are checked against the KB Images folder BEFORE any bytes leave');
  assert.ok(/KB_IMAGES_FOLDER_PROP/.test(f) && /if \(!folderId\) return/.test(f),
    'an unset folder property refuses — nothing can legitimately be inside a folder that does not exist');
  // Existence never leaks: unset property, bad id, missing file, out-of-folder,
  // wrong type, oversize — all the SAME generic refusal.
  assert.ok((f.match(/'Not available\.'/g) || []).length >= 6,
    'every refusal path returns the same generic message');
  assert.ok(/KB_IMG_UPLOAD_TYPES\.indexOf\(contentType\) < 0/.test(f) && /KB_IMG_FETCH_MAX_BYTES/.test(f),
    'type whitelist + size cap mirror the upload path');
  assert.ok(!/waitLock/.test(f), 'read-only Drive fetch — no ScriptLock (the kbUploadImage reasoning)');
});

test('client image fallback: capture-phase, thumbnail-scoped, retry-guarded, failure-cached', () => {
  const kb = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  // error events don't bubble — a bubble-phase listener would never fire and
  // the whole fallback would be silently dead (measure, don't assume).
  assert.ok(/document\.addEventListener\('error', function \(e\) \{[\s\S]{0,400}\}, true\);/.test(kb),
    'the error listener is CAPTURE-phase');
  assert.ok(/t\.closest\('\.kb-article'\)/.test(kb), 'scoped to images inside rendered article containers');
  const ctx = vm.createContext({});
  vm.runInContext(extractFunction('kb/script_kb.html', 'kbImgFileId_'), ctx);
  assert.strictEqual(ctx.kbImgFileId_('https://drive.google.com/thumbnail?id=abc123XYZ_-&sz=w1200'), 'abc123XYZ_-');
  assert.strictEqual(ctx.kbImgFileId_('https://drive.google.com/thumbnail?sz=w1200&id=abc123'), 'abc123',
    'id may follow another param');
  // An EXTERNAL image failing must not send its arbitrary URL to our server.
  assert.strictEqual(ctx.kbImgFileId_('https://evil.example/thumbnail?id=abc123'), null, 'non-Drive src → no fetch');
  assert.strictEqual(ctx.kbImgFileId_('data:image/png;base64,AAAA'), null, 'a swapped data URL never re-triggers');
  const fb = extractFunction('kb/script_kb.html', 'kbImgFallback_');
  assert.ok(/if \(!img \|\| img\.dataset\.kbFbTried\) return;/.test(fb),
    'retry guard — the swapped src erroring again cannot loop');
  assert.ok(/KB_IMG_FB\.cache\[fileId\] = dataUrl \|\| 'failed';/.test(fb),
    "a failed fetch caches 'failed' so a broken file cannot hammer the server on every re-render");
  assert.ok(/KB_IMG_FB\.pending\[fileId\]\.push\(img\); return;/.test(fb),
    'concurrent misses of one file fan into a single fetch');
});

console.log('\nkb — warehouse map block (operator 2026-08-13, Tier A — no billing)');

const kbMapCtx = vm.createContext({});
{
  const kbSrc = fs.readFileSync(path.join(__dirname, '../../web-app/kb/script_kb.html'), 'utf8');
  const capLine = kbSrc.match(/var KB_MAP_MAX_WH_CLIENT = \d+;/);
  assert.ok(capLine, 'the client warehouse cap constant exists');
  vm.runInContext(capLine[0], kbMapCtx);
  ['kbSlug_', 'kbRosterAttr_', 'kbMapDecode_', 'kbMapParse_', 'kbMapHtml_', 'kbMd_']
    .forEach((n) => vm.runInContext(extractFunction('kb/script_kb.html', n), kbMapCtx));
}

test('kbMapParse_ — wh| lines against the PRODUCTION (escaped) contract', () => {
  const d = kbMapCtx.kbMapParse_(rosEsc([
    'wh| Dallas Warehouse: 4600 Main & 5th St, Dallas, TX 75201',
    'wh| Phoenix: 88 Oak Ave, Phoenix, AZ 85001',
    '# a comment line',
    'wh| missing an address',
    'not a wh line at all',
  ].join('\n')));
  assert.strictEqual(d.warehouses.length, 2, 'only the sound lines');
  assert.strictEqual(d.warehouses[0].name, 'Dallas Warehouse', 'split on the FIRST colon');
  // The fence content arrives HTML-escaped (the roster &gt; lesson): the
  // parser keeps the escaped form; only URL building decodes.
  assert.ok(d.warehouses[0].addr.indexOf('&amp;') >= 0, 'an & in the address survives as its escaped form');
  assert.strictEqual(d.warnings.length, 2, 'malformed lines are counted, never silently dropped');
  assert.strictEqual(kbMapCtx.kbMapDecode_('A &amp; B &lt;x&gt;'), 'A & B <x>', 'decode covers exactly the three kbMd_ escapes');
  const many = kbMapCtx.kbMapParse_(Array.from({ length: 25 }, (_, i) => 'wh| W' + i + ': ' + i + ' Elm St').join('\n'));
  assert.strictEqual(many.warehouses.length, 20, 'capped at 20');
  assert.strictEqual(many.truncated, 5, 'with the overflow REPORTED (INV-169)');
});

test('kbMapHtml_ — attribute quoting, percent-encoded URLs, real controls, honest copy', () => {
  const html = kbMapCtx.kbMapHtml_(rosEsc('wh| The "Main" Hub: 1 A & B Rd, Dallas, TX'));
  // Quotes are the gap the top-level escape leaves — attributes need their own.
  assert.ok(/data-name="The &quot;Main&quot; Hub"/.test(html), 'quotes escaped in attributes');
  // The href is built from the DECODED address then encodeURIComponent'd —
  // an escaped entity leaking in would geocode "amp;" as part of the street.
  assert.ok(/href="https:\/\/www\.google\.com\/maps\?q=1%20A%20%26%20B%20Rd/.test(html),
    'the & reaches the URL as %26, not &amp;');
  assert.ok(/<button type="button" class="kb-map-embed-btn" aria-expanded="false"/.test(html),
    'the embed toggle is a real button with disclosure state (INV-173/174)');
  assert.ok(/<button type="button" class="kb-ros-expand"/.test(html), 'so is Find nearest');
  assert.ok(/role="status" aria-live="polite"/.test(html), 'lookup results are announced');
  assert.ok(/straight-line estimates/.test(html) && /Prefer a ZIP code/.test(html),
    'the copy states straight-line and prefers a ZIP (the PHI posture)');
  assert.ok(/No warehouses yet/.test(kbMapCtx.kbMapHtml_('')), 'empty fence explains the syntax');
});

test('kbMd_ renders a ```map fence, inert like the others', () => {
  const html = kbMapCtx.kbMd_(['Intro.', '', '```map', 'wh| A: 1 Elm St', '```'].join('\n'));
  assert.ok(/<div class="kb-map"/.test(html), 'the fence renders the block');
  assert.ok(/<p>Intro\.<\/p>/.test(html), 'surrounding markdown is untouched');
  const evil = kbMapCtx.kbMd_(['```map', 'wh| <script>alert(1)</script>: 1 Elm St', '```'].join('\n'));
  assert.strictEqual(evil.indexOf('<script>'), -1, 'no live script survives');
  // The embed iframe is created lazily by the toggle, with aria kept in step.
  const tog = extractFunction('kb/script_kb.html', 'kbMapToggleEmbed_');
  assert.ok(/output=embed/.test(tog) && /encodeURIComponent\(kbMapDecode_/.test(tog),
    'the keyless embed URL is built from the decoded, percent-encoded address');
  assert.ok(/btn\.setAttribute\('aria-expanded', open \? 'true' : 'false'\);/.test(tog),
    'the toggle keeps aria-expanded in step (INV-174)');
  // getAttribute returns DECODED text, so anything read back off a data-attr
  // must be esc()'d before re-entering innerHTML.
  const look = extractFunction('kb/script_kb.html', 'kbMapLookup_');
  assert.ok(/esc\(names\[r\.i\]/.test(look), 'warehouse names are re-escaped in the results render');
  assert.ok(/esc\(res\.formatted \|\| q\)/.test(look), 'and so is the server-formatted location');
});

test('kbHaversineMiles_ — behavioral, and the server contract never stores the query', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const ctx = vm.createContext({ Math });
  vm.runInContext(extractRawFunction('Code.js', 'kbHaversineMiles_'), ctx);
  const dalHou = ctx.kbHaversineMiles_(32.7767, -96.7970, 29.7604, -95.3698);
  assert.ok(dalHou > 215 && dalHou < 235, 'Dallas→Houston ≈ 225 mi great-circle (got ' + dalHou.toFixed(1) + ')');
  assert.strictEqual(ctx.kbHaversineMiles_(41, -87, 41, -87), 0, 'identical points → 0');
  const f = nc(extractRawFunction('Code.js', 'kbMapDistances'));
  assert.ok(/getEmployeeInfo_\(\)/.test(f) && /Not authorized/.test(f), 'rep-gated');
  assert.ok(/slice\(0, KB_MAP_MAX_WH\)/.test(f) && /KB_MAP_QUERY_MAX/.test(f), 'warehouse count + string lengths bounded');
  // THE PRIVACY CONTRACT: warehouse geocodes persist (operator-owned, static);
  // the rep's QUERY never does — a looked-up address may be a patient's.
  // (a) the only property write is the warehouse-coordinate cache;
  const setCalls = f.match(/props\.setProperty\([^)]*\)/g) || [];
  assert.strictEqual(setCalls.length, 1, 'exactly one property write');
  assert.ok(/KB_MAP_GEOCODE_CACHE_PROP/.test(setCalls[0]), 'and it is the coordinate cache');
  // (b) that write happens BEFORE the query is even geocoded, so the query
  //     value cannot be in the serialized blob;
  const writeAt = f.indexOf('props.setProperty');
  const qGeoAt = f.indexOf('kbGeocodeOne_(query)');
  assert.ok(writeAt > 0 && qGeoAt > writeAt, 'cache write precedes the query geocode');
  // (c) cache keys are address HASHES via kbMapCacheKey_, never raw strings;
  assert.ok(/kbMapCacheKey_\(a\)/.test(f) && !/cache\[a\]/.test(f), 'keys are hashed addresses');
  // (d) no audit row, no log line — nothing records what was looked up.
  assert.ok(!/writeAuditLog_/.test(f) && !/Logger\.log/.test(f) && !/console\./.test(f),
    'the lookup is never audited or logged');
  // The free built-in geocoder — the whole point of Tier A. Any Maps-API-key
  // path (UrlFetchApp to googleapis) would mean billing.
  const g = nc(extractRawFunction('Code.js', 'kbGeocodeOne_'));
  assert.ok(/Maps\.newGeocoder\(\)/.test(g), 'uses the built-in Maps service (no API key, no billing)');
  assert.ok(!/UrlFetchApp/.test(f) && !/UrlFetchApp/.test(g), 'no external HTTP — nothing to bill');
  // Hygiene reset keeps THIS run's entries warm (the current article's
  // warehouses are exactly the ones worth keeping).
  assert.ok(/cache = fresh;/.test(f), 'an oversized cache resets to the fresh entries, not to nothing');
});

console.log('\nshell — settings flyout + view-as + tz-mismatch (operator 2026-08-13)');

test('settings flyout: attribute-keyed gears, capture-phase Esc, aria in step', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const core = nc(fs.readFileSync(path.resolve(__dirname, '../../web-app/script_core.html'), 'utf8'));
  // The reflector writes to every [data-settings-toggle], and the outside-click
  // closer exempts both the panel and the gears — keyed on the ATTRIBUTE, not
  // a shared look-class (INV-191).
  assert.ok(/querySelectorAll\('\[data-settings-toggle\]'\)/.test(core), 'aria-expanded reflects on the attribute');
  assert.ok(/closest\('#settings-panel'\) \|\| e\.target\.closest\('\[data-settings-toggle\]'\)/.test(core),
    'outside-click close exempts the panel + gears');
  // Esc is CAPTURE-phase with stopPropagation, so closing the flyout can never
  // also close an overlay underneath it.
  assert.ok(/settingsClose_\(\); e\.stopPropagation\(\);/.test(core), 'Esc consumes the event');
  // All three control groups moved INTO the panel — the reflectors keep
  // working because the attribute markup is unchanged.
  const panel = core.slice(core.indexOf('const settingsPanel'), core.indexOf('const viewAsBanner'));
  assert.ok(/\$\{themeToggle\}/.test(panel) && /\$\{paletteToggle\}/.test(panel) && /\$\{reminderToggle\}/.test(panel),
    'theme + palette + alerts all render inside the panel');
});

test('view-as: admin-gated preview, session-only, flags per role, survives refreshes', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const ctx = vm.createContext({ VIEW_AS: { real: { isAdmin: true, isManager: true, canSeeSpanish: true } } });
  vm.runInContext(extractFunction('script_core.html', 'viewAsFlags_'), ctx);
  const f = (r) => ctx.viewAsFlags_(r);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(f('csr'))), { isAdmin: false, isManager: false, canSeeSpanish: false });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(f('spanish'))), { isAdmin: false, isManager: false, canSeeSpanish: true });
  const m = f('manager');
  assert.ok(!m.isAdmin && m.isManager && m.canSeeSpanish, 'manager preview: non-admin manager, real Spanish access kept');
  const me = f('me');
  assert.ok(me.isAdmin && me.isManager, "'me' restores the real flags");
  const set = nc(extractFunction('script_core.html', 'viewAsSet_'));
  assert.ok(/if \(!VIEW_AS\.real\.isAdmin\) return;/.test(set), 'only a real admin can preview');
  assert.ok(!/localStorage/.test(set), 'session-only — a refresh restores reality by construction');
  // empState is REPLACED by background refreshes; the preview must survive
  // every one of them or the shell silently snaps back mid-preview.
  const clock = nc(fs.readFileSync(path.resolve(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  assert.strictEqual((clock.match(/typeof viewAsReapply_ === 'function'\) viewAsReapply_\(\);/g) || []).length, 3,
    'all three clock refresh sites reapply');
  const core = nc(fs.readFileSync(path.resolve(__dirname, '../../web-app/script_core.html'), 'utf8'));
  assert.ok(/empState = s; viewAsReapply_\(\);/.test(core), 'the reminder-ticker refresh reapplies');
  // The banner names the preview and offers the exit; the View-as row itself
  // keys off the REAL role so the way back exists even while previewing CSR.
  assert.ok(/class="viewas-banner" role="status"/.test(core) && /viewAsSet_\('me'\)/.test(core), 'banner + exit');
  assert.ok(/VIEW_AS\.real \? VIEW_AS\.real\.isAdmin : !!state\.isAdmin/.test(core),
    'the row renders from the REAL role, not the previewed one');
});

test('tzOffsetMinAt_ behavioral + the mismatch check compares OFFSETS once a day', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const ctx = vm.createContext({ Intl, Date, Math });
  vm.runInContext(extractFunction('script_core.html', 'tzOffsetMinAt_'), ctx);
  const at = new Date('2026-08-13T12:00:00Z');
  assert.strictEqual(ctx.tzOffsetMinAt_('America/Chicago', at), -300, 'CDT in August');
  // +5:30 — the only offset that puts a :30 on a whole-hour zone, which is
  // exactly how the operator's mis-stamped notes were diagnosed.
  assert.strictEqual(ctx.tzOffsetMinAt_('Asia/Kolkata', at), 330, 'IST');
  assert.strictEqual(ctx.tzOffsetMinAt_('UTC', at), 0);
  assert.strictEqual(ctx.tzOffsetMinAt_('Not/AZone', at), null, 'unknown id → null (itself a mismatch)');
  const chk = nc(extractFunction('script_core.html', 'tzMismatchCheck_'));
  // Compare OFFSETS, never ids — America/Chicago vs US/Central must not warn.
  assert.ok(/rosterOff !== null && rosterOff === browserOff\) return;/.test(chk), 'equal offsets → silent');
  // Intl sanity probe first: a browser that cannot resolve UTC cannot judge
  // the roster id, and must not nag daily about its own limitation.
  assert.ok(/tzOffsetMinAt_\('UTC', now\) !== 0\) return;/.test(chk), 'the UTC probe gates the check');
  assert.ok(/umsTzWarnedDay/.test(chk), 'once per browser-local day');
  assert.ok(/sticky: true/.test(chk), 'the warning is a sticky toast (INV-190 — it must wait for its reader)');
  assert.ok(/PROFILE timezone/.test(chk), 'the copy says which timezone stamps punches and notes');
});

console.log('\nclock — dashboard cold-start round 2 (operator 2026-08-13)');

test('the first frame holds all four cards, and the extras start in parallel', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const clock = nc(fs.readFileSync(path.resolve(__dirname, '../../web-app/tc/script_clock.html'), 'utf8'));
  const skel = nc(extractFunction('tc/script_clock.html', 'clkDashSkeleton_'));
  // The extras row used to POP IN below the metrics pair; the initial skeleton
  // now renders BOTH pairs so nothing moves when content lands.
  assert.strictEqual((skel.match(/dash-pair/g) || []).length, 2, 'skeleton holds both pairs');
  assert.ok(/clkDashSkelExtra_\(\) \+\s*clkDashSkelExtra_\(\)/.test(skel), 'the second pair is extras-shaped');
  const load = nc(extractFunction('tc/script_clock.html', 'clkLoadDashboard_'));
  // Extras RPCs no longer wait for the first metrics response.
  assert.ok(/clkLoadDashboardExtras_\(\);/.test(load), 'the cold branch kicks the extras in parallel');
  const extras = nc(extractFunction('tc/script_clock.html', 'clkLoadDashboardExtras_'));
  const busyAt = extras.indexOf('if (CLK_DASH.extraBusy) return;');
  const fetchAt = extras.indexOf('google.script.run');
  assert.ok(busyAt > 0 && busyAt < fetchAt, 'the in-flight guard sits before the fetches — a second call is render-only');
  assert.ok(/CLK_DASH\.extraBusy = false;/.test(extras), 'and clears when the round settles');
});

test('same-day localStorage seed: complete successful rounds only, freshness never inherited', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const store = {};
  const ctx = vm.createContext({
    JSON, Object,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    CLK_DASH_PERIODS: ['yesterday', 'mtd', 'ytd'],
    CLK_DASH: { data: {}, loadedDay: '', loadedAt: 0 },
    CLK_DASH_LS_KEY: 'umsDashMetrics',
  });
  vm.runInContext(extractFunction('tc/script_clock.html', 'clkDashSeedFromLs_'), ctx);
  const good = { yesterday: { a: 1 }, mtd: { a: 2 }, ytd: { a: 3 } };
  store.umsDashMetrics = JSON.stringify({ day: '2026-08-13', data: good });
  assert.strictEqual(ctx.clkDashSeedFromLs_('2026-08-12'), false, 'a different day never seeds');
  assert.strictEqual(ctx.clkDashSeedFromLs_('2026-08-13'), true, 'same-day complete round seeds');
  assert.strictEqual(ctx.CLK_DASH.loadedAt, 0, 'freshness is NOT inherited — the refetch still runs (INV-156)');
  store.umsDashMetrics = JSON.stringify({ day: '2026-08-13', data: { yesterday: { a: 1 }, mtd: { error: 'x' }, ytd: { a: 3 } } });
  assert.strictEqual(ctx.clkDashSeedFromLs_('2026-08-13'), false, 'an error payload never seeds');
  store.umsDashMetrics = 'not json';
  assert.strictEqual(ctx.clkDashSeedFromLs_('2026-08-13'), false, 'corrupt blob → cold path');
  // The write-through happens ONLY on a fully-successful round (INV-129).
  const load = nc(extractFunction('tc/script_clock.html', 'clkLoadDashboard_'));
  assert.ok(/if \(!anyFail\) clkDashSaveLs_\(\);/.test(load), 'partial rounds are never persisted');
});

console.log('\nmetrics — SWR paints any same-key cache; getTeamMetrics endpoint cache');

test('the three slow tabs paint last-good instantly and refresh behind the pill', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const my = nc(extractFunction('metrics/script_metrics.html', 'mLoadMyStats_'));
  const team = nc(extractFunction('metrics/script_metrics.html', 'mLoadTeamMetrics_'));
  // ANY same-key cached payload paints (the old fresh-only paint re-showed the
  // loader after the 45s TTL — almost every re-enter); the key is the exact
  // query, so an old payload is never the WRONG data.
  assert.ok(/if \(!opts\.force && cached\) \{/.test(my), 'My Stats paints any cached payload');
  assert.ok(/if \(!opts\.force && cached\) \{/.test(team), 'Team Metrics paints any cached payload');
  const sp = nc(extractFunction('metrics/script_metrics.html', 'spanishLoad_'));
  // Spanish seeds all three parts (stats + both lists) and a background stats
  // arrival swaps ONLY the head, so the painted list is never disturbed.
  assert.ok(/cached && cached\.stats && cached\.pending && cached\.resolved/.test(sp), 'seeds only a complete round');
  assert.ok(/getElementById\('spanish-head'\)/.test(sp) && /spanishHeadHtml_\(d\)/.test(sp), 'refresh swaps the head alone');
  const list = nc(extractFunction('metrics/script_metrics.html', 'spanishLoadList_'));
  assert.ok(/if \(opts\.background\) \{/.test(list) && /spanishRenderList_\(\);/.test(list),
    'background list refresh paints the seeded lists first');
  assert.ok(/if \(!opts\.background\) SPANISH_STATE\.pendingErr/.test(list),
    'a failed background half keeps the painted last-good, never an error card');
});

test('getTeamMetrics endpoint cache: org-wide key, degraded rounds never cached', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const f = nc(extractRawFunction('Code.js', 'getTeamMetrics'));
  const gateAt = f.indexOf('Manager access required');
  const readAt = f.indexOf('teamMetricsCache.get(teamCacheKey)');
  assert.ok(gateAt > 0 && readAt > gateAt, 'the cache read sits AFTER the manager gate');
  // INV-129: cache only a fully-successful round — a per-rep-Sheet failure or
  // a transfer-read error must not pin a degraded aggregate for the TTL.
  assert.ok(/if \(useTeamCache && !teamTotals\.noteCountPartial && !transferMeta\.error\) \{/.test(f),
    'the put is gated on the round being clean');
  assert.ok(/_TEST_OVERRIDE_CDR_SS_ID/.test(f), 'bypassed under the CDR test override (the getMyMetrics pattern)');
  assert.ok(/team_metrics_v1:' \+ from \+ ':' \+ toDate/.test(f), 'keyed by range only — every manager sees the same aggregate');
});

console.log('\nemails — the three CN digests share the branded chrome (operator 2026-08-13)');

test('EOD + flag digests route through buildBrandedEmailHtml_ with real CTAs', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const eod = nc(extractRawFunction('Code.js', 'sendOneRepEodDigest_'));
  assert.ok(/buildBrandedEmailHtml_\(/.test(eod), 'the EOD digest uses the shared chrome');
  // The old body said "hop into the web app" with NO LINK — the exact
  // dead-end the 2026-08-11 restyle fixed on the missed-clock-out email.
  assert.ok(/ctaUrl: safeWebAppUrl_\('callNotes'\), ctaLabel: 'Open Call Notes'/.test(eod),
    'and finally links the rep into Call Notes');
  assert.ok(/tone: 'warn'/.test(eod) && /subLabel: 'Call Notes'/.test(eod), 'warn tone + module eyebrow');
  const flag = nc(extractRawFunction('Code.js', 'sendManagerFlagDigest_'));
  assert.ok(/buildBrandedEmailHtml_\(label, inner,/.test(flag), 'the weekly/urgent digests share it too');
  assert.ok(/tone: label === 'Urgent' \? 'danger' : 'info'/.test(flag),
    'Urgent reads as action-needed; the weekly queues as info');
  assert.ok(/ctaUrl: safeWebAppUrl_\('callNotesManage'\)/.test(flag), 'managers land on Team Notes');
  // The INV-187 warning line and the plain-text fallbacks survive the restyle.
  assert.ok(/skipHtml/.test(flag) && /const textBody/.test(flag) && /const textBody/.test(eod),
    'skippedReps warning + text fallbacks kept');
});

console.log('\nobservability — pre-pilot round (operator 2026-08-13)');

test('errorStateHtml_ beacons handled failures; both normalizers accept errorState', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const f = nc(extractFunction('script_core.html', 'errorStateHtml_'));
  // The ONE choke point where a HANDLED failure becomes visible to a rep
  // (every A12/INV-175 call site) — without this, only unhandled exceptions
  // reached the ClientErrors tab.
  assert.ok(/try \{ if \(typeof errBeaconSend_ === 'function'\) errBeaconSend_\(String\(msg \|\| ''\), '', 'errorState'\); \} catch \(e\) \{\}/.test(f),
    'fires the beacon, guarded so jsdom/boot order can never break the render');
  assert.ok(/role="alert"/.test(f), 'the returned markup is unchanged');
  const pay = nc(extractFunction('script_core.html', 'errBeaconPayload_'));
  assert.ok(/source === 'unhandledrejection' \|\| source === 'errorState'/.test(pay), 'client normalizer accepts it');
  const srv = nc(extractRawFunction('Code.js', 'recordClientError'));
  assert.ok(/p\.source === 'unhandledrejection' \|\| p\.source === 'errorState'/.test(srv), 'server normalizer agrees');
});

test('client-error spike alert: post-lock, thresholded, cooldown-deduped, escaped', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const rec = nc(extractRawFunction('Code.js', 'recordClientError'));
  // M-7: the alert may send mail, so it runs only AFTER the lock releases.
  const releaseAt = rec.indexOf('finally { lock.releaseLock(); }');
  const alertAt = rec.indexOf('clientErrSpikeAlert_();');
  assert.ok(releaseAt > 0 && alertAt > releaseAt, 'the spike check runs post-lock (M-7)');
  const f = nc(extractRawFunction('Code.js', 'clientErrSpikeAlert_'));
  // The threshold is what PRESERVES INV-150's "not pushed" rationale: a single
  // benign quirk still emails no one; a burst that means breakage does.
  assert.ok(/if \(n < CLIENT_ERR_ALERT_MIN\) return;/.test(f), 'thresholded');
  assert.ok(/if \(cache\.get\('client_err_spike_sent'\)\) return;/.test(f) &&
    /CLIENT_ERR_ALERT_COOLDOWN_SEC/.test(f), 'cooldown-deduped — a bad hour cannot flood inboxes');
  assert.ok(/getManagerEmails_\(\)/.test(f) && /buildBrandedEmailHtml_\('Client errors are spiking'/.test(f),
    'branded alert to the manager list');
  assert.ok(/safeWebAppUrl_\('callNotesAdmin'\)/.test(f), 'CTA lands on the Admin panel');
  assert.ok(/esc_\(msg\)/.test(f) && /esc_\(String\(data\[i\]\[2\]/.test(f), 'messages + view keys are esc_\'d');
  assert.ok(/catch \(e\) \{ Logger\.log\('clientErrSpikeAlert_ skipped/.test(f), 'never throws into the beacon');
  // And the 24h burst also rides the health dot + daily digest (thresholded).
  const probs = nc(extractRawFunction('Code.js', 'automationProblems_'));
  assert.ok(/report\.clientErrors && report\.clientErrors\.last24h >= CLIENT_ERR_PROBLEM_MIN/.test(probs),
    'automationProblems_ carries the thresholded 24h entry');
  const sum = nc(extractRawFunction('Code.js', 'clientErrorsSummary_'));
  assert.ok(/if \(tsRaw >= cut24\) out\.last24h\+\+;/.test(sum), 'the 24h count uses the tz-consistent compare');
});

test('viewUsageAggregate_ behavioral — windows, distinct reps, top view', () => {
  const ctx = vm.createContext({ Object, String });
  vm.runInContext(extractRawFunction('Code.js', 'viewUsageAggregate_'), ctx);
  const cut30 = '2026-07-15 00:00:00', cut7 = '2026-08-07 00:00:00';
  const ev = (ts, emp, view) => ({ ts, empId: emp, view, mode: 'full' });
  const out = ctx.viewUsageAggregate_([
    ev('2026-08-13 10:00:00', 'E1', 'callNotes'),
    ev('2026-08-13 11:00:00', 'E1', 'callNotes'),
    ev('2026-08-08 09:00:00', 'E2', 'callNotes'),
    ev('2026-08-01 09:00:00', 'E2', 'clock'),      // 30d only
    ev('2026-07-01 09:00:00', 'E3', 'clock'),      // older than 30d — dropped
  ], cut7, cut30);
  const cn = out.views[0];
  assert.strictEqual(cn.view, 'callNotes', 'sorted by 30d volume');
  assert.strictEqual(cn.n30, 3);
  assert.strictEqual(cn.n7, 3);
  assert.strictEqual(cn.reps30, 2, 'distinct reps, not visits');
  const clock = out.views[1];
  assert.strictEqual(clock.n30, 1, 'the pre-window event is DROPPED, not counted');
  assert.strictEqual(out.totals.reps30, 2, 'E3 (outside the window) is not an active rep');
  assert.strictEqual(out.reps[0].empId, 'E1');
  assert.strictEqual(out.reps[0].topView, 'callNotes');
});

test('usage beacon: gated + capped server, throttled + preview-skipping client', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const srv = nc(extractRawFunction('Code.js', 'recordViewEnter'));
  assert.ok(/getEmployeeInfo_\(\)/.test(srv), 'requires a registered employee');
  assert.ok(/\^\[A-Za-z\]\[A-Za-z0-9\]\{1,39\}\$/.test(srv), 'tab-key shape validated');
  assert.ok(/VIEW_USAGE_RATE_MAX_PER_HOUR/.test(srv), 'rate-capped per rep');
  assert.ok(/getUserLock\(\)/.test(srv) && /finally \{ lock\.releaseLock\(\); \}/.test(srv),
    'USER lock — telemetry must never queue punch writes behind the script lock');
  const cli = nc(extractFunction('script_core.html', 'recordViewUsage_'));
  // An admin exploring View-as must not pollute the very numbers the feature
  // exists to read.
  assert.ok(/if \(typeof VIEW_AS !== 'undefined' && VIEW_AS\.active\) return;/.test(cli), 'view-as previews skipped');
  assert.ok(/VIEW_USAGE_THROTTLE_MS/.test(cli), 'per-tab throttle');
  const core = nc(fs.readFileSync(path.resolve(__dirname, '../../web-app/script_core.html'), 'utf8'));
  assert.ok(/recordViewUsage_\(view\);/.test(core), 'fired from showView — the single navigation entry point');
  // The Admin panel: escaped, error-vs-empty split, and a real breakpoint for
  // its fixed-track grid (the A2 rule).
  const panel = nc(extractFunction('cn/script_callnotes.html', 'cnUsagePanelHtml_'));
  assert.ok(/esc\(cnUsageViewLabel_\(v\.view\)\)/.test(panel) && /esc\(String\(v\.n30\)\)/.test(panel), 'server strings esc()\'d');
  assert.ok(/No usage recorded yet/.test(panel), 'a genuinely empty log reads as quiet no-data');
  const loader = nc(extractFunction('cn/script_callnotes.html', 'cnLoadUsagePanel_'));
  assert.ok((loader.match(/errorStateHtml_\(/g) || []).length === 2, 'both failure shapes render the error card (A12)');
  const cn = fs.readFileSync(path.resolve(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  assert.ok(/@media \(max-width: 700px\) \{\s*\n\s*\.cn-usage-row \{ grid-template-columns: minmax\(0, 1fr\) 44px 62px; \}/.test(cn),
    'the usage grid stacks its fixed tracks on a phone');
});

// ---------------------------------------------------------------------------
// Operator round 2026-08-17 — post-pilot-deploy notes.
console.log('\noperator 2026-08-17: yesterday preset, cross-window reminder dedupe');

test('mPrevWorkdayIso_ behavioral — Monday lands on Friday, weekends step back', () => {
  // Pure over its argument (the empTz default is the zero-arg convenience).
  const ctx = { isoDateTz: () => '2026-08-17', empTz: () => 'America/Chicago' };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('metrics/script_metrics.html', 'mPrevWorkdayIso_'), ctx);
  assert.strictEqual(ctx.mPrevWorkdayIso_('2026-08-17'), '2026-08-14',   // Mon → Fri
    'Monday\'s previous workday is Friday, not Sunday — CDR has no weekend rows');
  assert.strictEqual(ctx.mPrevWorkdayIso_('2026-08-16'), '2026-08-14', 'Sunday → Friday');
  assert.strictEqual(ctx.mPrevWorkdayIso_('2026-08-15'), '2026-08-14', 'Saturday → Friday');
  assert.strictEqual(ctx.mPrevWorkdayIso_('2026-08-19'), '2026-08-18', 'midweek steps back one day');
  assert.strictEqual(ctx.mPrevWorkdayIso_(), '2026-08-14', 'zero-arg defaults to the employee-tz today');
});

test('My Stats lands on the previous workday; Team Metrics deliberately keeps Today', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  const m = nc(extractScript('metrics/script_metrics.html'));
  // The rep-facing preset row: renamed AND repointed (CDR data is never
  // same-day, so a Today preset always showed an empty day).
  assert.ok(/mMyPresetBtn_\('Yesterday', 'yesterday'\)/.test(m), 'the single-day preset is labeled Yesterday');
  assert.ok(!/mMyPresetBtn_\('Today'/.test(m), 'no Today preset remains on My Stats');
  assert.ok(/M_STATE\.myDate = M_STATE\.myDate \|\| mPrevWorkdayIso_\(\);/.test(m),
    'the default landing is the previous workday too');
  const preset = nc(extractFunction('metrics/script_metrics.html', 'mMyPreset_'));
  assert.ok(/key === 'yesterday'.*mPrevWorkdayIso_\(\)/.test(preset), 'the preset sets the previous workday');
  // The range-mode trend fill reuses the SAME warmed cache key.
  const fill = nc(extractFunction('metrics/script_metrics.html', 'mFillRangeTrends_'));
  assert.ok(/mPrevWorkdayIso_\(\)/.test(fill) && !/mTodayIso_\(\)/.test(fill),
    'the range-trend fill fetches the previous workday — the key the Yesterday preset warms');
  // The manager tab keeps Today by operator decision (same-day note counts).
  assert.ok(/mTeamPresetBtn_\('Today', 'today'\)/.test(m), 'Team Metrics keeps its Today preset');
  // The single-day hero label is honest about which day it shows.
  assert.ok(/data\.date === mPrevWorkdayIso_\(\) \? 'Yesterday'/.test(m),
    'the hero period label says Yesterday only when the date IS the previous workday');
});

test('reminders dedupe across windows via the shared localStorage fired-set', () => {
  const nc = (x) => String(x).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // INV-188
  // Behavioral: drive remindOnce_ + remindFiredShared_ in a vm with a stubbed
  // localStorage — window A fires and writes; window B (fresh in-memory set,
  // same storage) must NOT fire the same key; a day rollover resets.
  const store = {};
  const mkWin = () => {
    const ctx = {
      localStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
      },
      JSON: JSON,
      fired: [],
      _remindFired: {},
      _remindDay: '2026-08-17',
    };
    ctx.notifyRemind_ = (msg) => ctx.fired.push(msg);
    vm.createContext(ctx);
    vm.runInContext(extractFunction('script_core.html', 'remindFiredShared_'), ctx);
    vm.runInContext(extractFunction('script_core.html', 'remindOnce_'), ctx);
    return ctx;
  };
  const winA = mkWin(), winB = mkWin();
  assert.strictEqual(vm.runInContext("remindOnce_('2026-08-17:brk:600', 'Break in 10 min')", winA), true,
    'the first window fires the reminder');
  assert.strictEqual(winA.fired.length, 1);
  assert.strictEqual(vm.runInContext("remindOnce_('2026-08-17:brk:600', 'Break in 10 min')", winB), false,
    'a second window sees the shared fired-set and stays quiet — the double-notify fix');
  assert.strictEqual(winB.fired.length, 0, 'no toast/chime from the second window');
  assert.strictEqual(vm.runInContext("remindOnce_('2026-08-17:out', 'Clock out')", winB), true,
    'a DIFFERENT key still fires normally');
  // Day rollover: a next-day set ignores yesterday's blob.
  const winC = mkWin(); winC._remindDay = '2026-08-18';
  assert.strictEqual(vm.runInContext("remindOnce_('2026-08-18:brk:600', 'Break in 10 min')", winC), true,
    'a new day resets the shared set (the in-memory rollover rule)');
  // Corrupt blob degrades to a fresh set, never a throw.
  store.umsRemindFired = '{not json';
  const winD = mkWin();
  assert.strictEqual(vm.runInContext("remindOnce_('2026-08-17:brk:900', 'B2')", winD), true,
    'a corrupt blob reads as a fresh set — per-window dedupe, the pre-fix behavior');
  // Source: the write happens on the FIRE path only (a skip must not re-write).
  const once = nc(extractFunction('script_core.html', 'remindOnce_'));
  assert.ok(/umsRemindFired/.test(nc(extractFunction('script_core.html', 'remindFiredShared_'))),
    'the shared set lives under the documented umsRemindFired key');
  assert.ok(/shared\.keys\[key\]\) \{ _remindFired\[key\] = true; return false;/.test(once),
    'another window\'s fire marks the in-memory set and returns without notifying');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);