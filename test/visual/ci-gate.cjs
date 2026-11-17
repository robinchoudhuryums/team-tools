// The visual matrix's CI gate (cycle 25 E5, ST4).
//
// shoot.mjs MEASURES every scenario — sideways overflow, a page taller than its
// content (F69's `verticalRunawayPx`), a text column narrower than a word
// (F69's `narrowText`), RPCs with no fixture, uncaught page errors — but the
// matrix was manual, so a measurement only helped when someone ran it and read
// the report. `node shoot.mjs --ci` shoots the subset below in CI and fails on
// any of them. CommonJS so the Node harness can drive `ciVerdict` directly.
'use strict';

// A page taller than its visible content by more than this is a runaway, not a
// margin (F67's escaped separator made one 8,245px tall for a 900px window).
const RUNAWAY_PX = 200;

// The CI subset: every tool, at the widths where its layout defects have lived
// (390px phone, the 360/480 pop-out), plus the wide reader the F67 runaway was
// found on. Names are EXACT — a name that matches no scenario fails the run
// rather than shooting nothing and passing.
const CI_SCENARIOS = [
  'handbook-home-light-mobile',     // HB1.4: the handbook app's frame
  'handbook-home-light-tablet',     // F65 (cycle 26): 800px — the rail still on screen, the hero folded
  'handbook-search-light-tablet',
  'handbook-search-light-mobile',
  'handbook-section-light-wide',
  'handbook-people-dark-mobile',    // HB2.1: the people view
  'handbook-quiz-take-light-mobile', // HB3.2: a quiz sitting
  'handbook-training-dark-mobile',  // HB3.3: My training + Team training
  'handbook-progress-dark-mobile',  // HB3.4: the per-person progress table
  'handbook-saved-dark-mobile',     // HB2.2: bookmarks and notes
  'handbook-display-light-mobile',  // HB2.3: the Display panel
  'clock-light-mobile',
  'clock-light-wide',
  'manage-light-mobile',
  'manage-periodic-light-mobile',
  'timeoff-light-mobile',
  'cn-log-light-mobile',
  'cn-log-light-compact-sm',
  'cn-history-light-mobile',
  'cn-log-handbook-strip-light-mobile',
  'metrics-light-mobile',
  'metrics-team-light-mobile',
  'spanish-light-mobile',
  'deptreq-looks-light-mobile',
  'intake-light-mobile',
  'reference-light-mobile',
  'reference-drawer-light-compact',
  'reference-manual-light-wide',
  'reference-manual-light-tablet',          // cycle 26: 800px — Reference folded at the shell's breakpoint, the reader the column
  'reference-manual-chapend-light-mobile',  // cycle 26: the chapter-end cards, one to a row when the reader is narrow
  'reference-manual-polish-light-mobile',
  'reference-manual-diagram-light-mobile',
  'training-light-mobile',
  'coaching-light-mobile',
  'qa-queue-light-mobile',
  'admin-system-light-mobile',
  'admin-config-light-mobile',
];

// Findings that are KNOWN and owned elsewhere, each with its reason. The list
// only shrinks: an entry whose finding no longer fires fails the run too, so a
// fix cannot leave a stale excuse behind for the next regression to hide under.
const KNOWN = [];   // cycle 26: the one entry (the masthead index at 390px) is fixed — the masthead is a size container now

function findingsOf(r) {
  const out = [];
  if (r.overflowPx > 0) out.push({ kind: 'overflow', detail: '+' + r.overflowPx + 'px sideways' });
  if (r.verticalRunawayPx > RUNAWAY_PX) out.push({ kind: 'runaway', detail: '+' + r.verticalRunawayPx + 'px past the content' });
  (r.narrowText || []).forEach((n) => out.push({ kind: 'narrowText', detail: n.tag + ' ' + n.w + 'px "' + n.text + '"' }));
  // Cycle 26 F65: a box its scenario says must be usable (shoot.mjs `minWidth`) is narrower than it needs, or gone.
  (r.tooNarrow || []).forEach((n) => out.push({ kind: 'tooNarrow', detail: n.sel + ' ' + (n.w === null ? 'not found' : n.w + 'px') + ' (needs ' + n.min + 'px)' }));
  (r.missing || []).forEach((m) => out.push({ kind: 'missingFixture', detail: m }));
  (r.errors || []).filter((e) => /^PAGEERROR: |threw: /.test(e)).forEach((e) => out.push({ kind: 'pageError', detail: e.slice(0, 160) }));
  return out;
}

// Cycle 26 — the contrast sweep's verdict for one scenario (contrast.cjs). Text
// the sweep could not judge (over an image) is not a finding; it is counted in
// the report so "nothing low" is never read as "everything checked".
function contrastFindings(r) {
  const c = r && r.contrast;
  if (!c) return [{ kind: 'contrast', detail: 'not measured' }];
  return (c.low || []).map((l) => ({ kind: 'contrast',
    detail: l.el + ' ' + l.ratio + ':1 (needs ' + l.need + ') ' + l.fg + ' on ' + l.bg + ' "' + l.text + '"' }));
}

// { ok, failures: [{scenario, kind, detail}], stale: [KNOWN entries that did
// not fire], unshot: [subset names absent from the report] }
function ciVerdict(report, subset, known) {
  const byName = new Map(report.map((r) => [r.name, r]));
  const unshot = subset.filter((n) => !byName.has(n));
  const failures = [];
  const fired = new Set();
  subset.forEach((name) => {
    const r = byName.get(name);
    if (!r) return;
    findingsOf(r).forEach((f) => {
      const k = known.findIndex((x) => x.scenario === name && x.kind === f.kind);
      if (k >= 0) fired.add(k);
      else failures.push({ scenario: name, kind: f.kind, detail: f.detail });
    });
  });
  const stale = known.filter((x, i) => !fired.has(i));
  return { ok: !failures.length && !stale.length && !unshot.length, failures, stale, unshot };
}

module.exports = { RUNAWAY_PX, CI_SCENARIOS, KNOWN, findingsOf, ciVerdict, contrastFindings };
