// Playwright driver for the visual audit: scenarios × viewport × theme.
// Run `node build.mjs` first (page.html is generated, not committed).
// Usage: node shoot.mjs [name-substring ...]   — no args shoots everything.
//        node shoot.mjs --ci   — the CI subset (ci-gate.cjs), exit 1 on a layout finding.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import gate from './ci-gate.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(HERE, 'page.html');
const PAGE_HB = 'file://' + path.join(HERE, 'page-handbook.html');   // HB1.4: the handbook app (opts.page: 'handbook')
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// Chromium resolution: explicit env override → the pre-provisioned pw-browsers
// install (any version) → Playwright's own default download.
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) {
        const exe = path.join(root, hit, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return exe;
      }
    } catch (e) { /* root absent — keep looking */ }
  }
  return undefined; // let Playwright resolve its own managed browser
}

const WIDE = { width: 1440, height: 900 };
const COMPACT = { width: 480, height: 800 };
const COMPACT_SM = { width: 360, height: 640 };
const MOBILE = { width: 390, height: 844 };

// [name, {tool, tab}, viewport, mode, query, post?]
// `post` (optional 6th element) is a JS expression evaluated in the page AFTER
// the nav settles — the first mechanism for shooting a MODAL state (the
// Visual Audit Stage lists modal/overlay states as an uncovered gap; tab
// landings alone cannot reach them).
// The KB lookup post-hooks type a query and let the debounce fire, so the shot
// carries RESULTS. Empty boxes are what the matrix photographed for weeks, and
// empty boxes are not where either 2026-09-21 defect lived.
const KBD_SEARCH = "kbDrawerOpen_(); setTimeout(function(){ var a=document.getElementById('kb-ins-input-d'); if(a){a.value='aetna'; insLookupInput_(a);} var b=document.getElementById('kb-oop-item-d'); var c=document.getElementById('kb-oop-addr-d'); if(b&&c){b.value='scout'; c.value='75038'; oopLookupInput_(c);} }, 10)";
const E6_SIGNAL_SCROLL = "setTimeout(function(){ var r=document.querySelector('#kb-land-blocks .kb-land-req'); if(r) r.scrollIntoView({ block: 'start' }); }, 300)";
const KBL_SEARCH = "var a=document.getElementById('kb-ins-input'); if(a){a.value='aetna'; insLookupInput_(a);} var b=document.getElementById('kb-oop-item'); var c=document.getElementById('kb-oop-addr'); if(b&&c){b.value='scout'; c.value='75038'; oopLookupInput_(c);}";

// The acceptance-by-code grid is behind a disclosure, so the codes T3 NAMES
// were never in a shot. This polls for the button rather than guessing a delay:
// the results arrive on a 350ms debounce and the shooter waits 1000ms, so a
// fixed timeout that drifted either way would photograph a closed panel.
const KBL_CODES = KBL_SEARCH +
  "; (function tick(n){ var b=document.querySelector('#kb-ins-results .kb-ins-det-btn');" +
  " if(b){ insToggleLegend_(b); return; } if(n>0) setTimeout(function(){tick(n-1);}, 50); })(16)";

// 25post B: the eligibility CARDS (verdict lines, facts list) sit below the
// fold inside the panel's own scroller; poll for the last row, then scroll it in.
const KBL_ELIG_CARDS = KBL_SEARCH +
  "; (function tick(n){ var rows=document.querySelectorAll('#kb-oop-results .kb-ins-row');" +
  " if(rows.length >= 3){ rows[rows.length-1].scrollIntoView({ block: 'end' }); return; } if(n>0) setTimeout(function(){tick(n-1);}, 50); })(18)";

// 25post C1: the eligibility map, opened — poll for the toggle, press it,
// scroll the drawn map into view.
// D4 (operator 2026-10-27): the three image-chip states side by side — the
// mock answers "not imported" for these keys, then one chip is put back to
// loading and one to failed, so all three (and an article image's "not
// stored") are in one shot.
const DAYEDIT_ACTIVITY = "openDayEditModal('E-1077', 'Nina Patel', new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10));" +
  " setTimeout(function(){ ['de-clockin','de-clockout'].forEach(function(id){ var e=document.getElementById(id); e.value=''; e.dispatchEvent(new Event('input')); });" +
  " deApplySuggestion_('ClockIn'); }, 500)";
const KBL_IMG_STATES = "var m=document.getElementById('kb-main'); if(m){ m.innerHTML='<div class=\"kb-article\"><h2>Image states</h2>' +" +
  " kbMd_('![The Log screen](manimg:fig-d4-load)\\n\\n![The New Order button](manimg:fig-d4-gone)\\n\\n![The Patient tab](manimg:fig-d4-fail)\\n\\nRow icon ![Hold icon](manimg:icon-d4-gone) beside its name.\\n\\n![Old screenshot](kbimg:kbimg-000000000000000000000000)') + '</div>';" +
  " setTimeout(function(){ var c=m.querySelectorAll('.kb-manimg'); if(c[0]) kbImgChipState_(c[0],'data-mi','loading'); if(c[2]) kbImgChipState_(c[2],'data-mi','failed'); }, 600); }";
const KBL_ELIG_MAP = KBL_SEARCH +
  "; (function tick(n){ var b=document.querySelector('#kb-oop-results .kb-oop-mapbtn');" +
  " if(b){ oopToggleMap_(b); setTimeout(function(){ var m=document.querySelector('#kb-oop-results .kb-oop-map'); if(m) m.scrollIntoView({ block: 'center' }); }, 100); return; }" +
  " if(n>0) setTimeout(function(){tick(n-1);}, 50); })(18)";

// The DRAWER's cross-reference sits under the item row, below the fold at
// ~340px. That width is exactly where T1/T2's defects lived, so it is shot
// rather than reasoned about: scroll the drawer body once the results land.
// Scrolls whatever inside the drawer actually scrolls, rather than naming a
// container — the first attempt named #kbd-body, which is not the scroller, and
// produced a shot identical to the un-scrolled one. A hook that silently does
// nothing photographs the wrong thing and reports 0px overflow either way.
const KBD_XREF = KBD_SEARCH.replace('}, 10)',
  " setTimeout(function(){ var root=document.getElementById('kb-drawer')||document.body;" +
  " Array.prototype.forEach.call(root.querySelectorAll('*'), function(el){" +
  " if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight; }); }, 750); }, 10)");

// The manual-copy failover (T5). It is the failure surface for every text copy
// in the app now, including a saved call note, and nothing had ever drawn it.
// Driven through the REAL path — a denied clipboard and a false execCommand —
// rather than by calling the modal, so the shot is of what a rep would see.
const MANUAL_COPY = "try { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); } catch (e) {}" +
  " document.execCommand = function () { return false; };" +
  " copyWithFeedback_('Drive Scout 3 Wheel (W/ Shipping Cost) \u2014 $1,070.00'," +
  " { ok: 'Copied', label: 'Drive Scout 3 Wheel \u00b7 W/ Shipping Cost' });";

const HB_PAGE = { page: 'handbook' };
const HB_SEARCH = "var q=document.getElementById('hb-q'); q.value='waiting'; hbSearch_('waiting', true)";
const HB_DEPT = "try { localStorage.setItem('umsHbDept', 'Chapter 03 \u2014 Respiratory & Resupply'); } catch (e) {} hbPaintDeptPicker_(); hbHome_(false)";
const HB_FIRST = "hbApplyMe_(99, { email: 'alex.kim@example.com', name: 'Alex Kim', setUp: true, isAdmin: false, isManager: false, me: null, managers: [{ email: 'dana.reyes@example.com', name: 'Dana Reyes' }] }); hbHome_(false)";
const HB_QUIZ_RESULT = "hbTakeQuiz_('q-core-calls', true); setTimeout(function(){ document.querySelectorAll('.hb-qz-q').forEach(function(f){ var i=f.querySelector('input'); if(i) i.checked=true; }); hbSubmitQuiz_(); }, 400)";
const HB_PROGRESS = "hbGoTraining_(); setTimeout(function(){ var e=document.getElementById('hb-tr-progress'); if(e) e.scrollIntoView(); var d=e && e.querySelector('details'); if(d) d.open=true; }, 500)";
const HB_NOTES = "try { localStorage.setItem('umsHbNotes', JSON.stringify({ 'man-0-11': { t: 'Read the Ticket State before the note.\\nA split shipment has two tracking numbers — give both.', ms: Date.now() - 3600000 }, 'man-0-10': { t: 'Pat. Resp. is what they owe BEFORE delivery.', ms: Date.now() - 86400000 }, 'man-0-2': { t: '', ms: 5 } })); } catch (e) {} ";
const HB_LARGE = (o) => "hbApplyDisplay_(" + o + ", true)";
const HB_READING = "Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { q: [], speak: function (u) { this.q.push(u); }, pause: function () {}, resume: function () {}, cancel: function () {}, getVoices: function () { return []; }, addEventListener: function () {} } });" +
  " window.SpeechSynthesisUtterance = function (t) { this.text = t; };" +
  " setTimeout(function () { hbReadAloud_(); var s = window.speechSynthesis; for (var i = 0; i < 2; i++) { var u = s.q[s.q.length - 1]; if (u && u.onend) u.onend(); } }, 400)";
const HB_SUGGEST = "setTimeout(function(){ var b=document.querySelector('[data-kb-man-fb=\"suggest\"]'); if(b){ b.disabled=false; MANUAL_HOST.suggestEdit(b); } }, 300)";

const SCENARIOS = [
  // HB1.4 — the handbook app (handbook-app/): its home (first visit, and with a
  // department chosen), a section by link, search, the phone contents and the
  // suggest-an-edit dialog. The reader inside is Team Tools' shared partial,
  // already shot under reference-manual-*; these shoot the frame around it.
  ['handbook-home-light-wide',     {}, WIDE,   'light', '', '', HB_PAGE],
  ['handbook-home-dark-wide',      {}, WIDE,   'dark',  '', '', HB_PAGE],
  ['handbook-home-light-mobile',   {}, MOBILE, 'light', '', '', HB_PAGE],
  ['handbook-mydept-light-wide',   {}, WIDE,   'light', '', HB_DEPT, HB_PAGE],
  ['handbook-section-light-wide',  {}, WIDE,   'light', '?s=3.8.1', '', HB_PAGE],
  ['handbook-search-light-wide',   {}, WIDE,   'light', '', HB_SEARCH, HB_PAGE],
  ['handbook-search-light-mobile', {}, MOBILE, 'light', '', HB_SEARCH, HB_PAGE],
  ['handbook-contents-light-mobile', {}, MOBILE, 'light', '', 'hbToggleSide_()', HB_PAGE],
  ['handbook-suggest-light-wide',  {}, WIDE,   'light', '?s=3.8', HB_SUGGEST, HB_PAGE],
  // HB2.1 — the people view (profile, "Your team", the admin's lists), and a
  // first visit's home prompt.
  ['handbook-people-light-wide',   {}, WIDE,   'light', '', 'hbGoPeople_()', HB_PAGE],
  ['handbook-people-dark-mobile',  {}, MOBILE, 'dark',  '', 'hbGoPeople_()', HB_PAGE],
  ['handbook-firstvisit-light-mobile', {}, MOBILE, 'light', '', HB_FIRST, HB_PAGE],
  // HB3.2 — quizzes: the list, a sitting, a result, the bar on a section.
  ['handbook-quizzes-light-wide',  {}, WIDE,   'light', '', 'hbGoQuizzes_()', HB_PAGE],
  ['handbook-quiz-take-light-mobile', {}, MOBILE, 'light', '', "hbTakeQuiz_('q-core-calls', true)", HB_PAGE],
  ['handbook-quiz-result-dark-wide', {}, WIDE, 'dark', '', HB_QUIZ_RESULT, HB_PAGE],
  ['handbook-quizbar-light-mobile', {}, MOBILE, 'light', '?s=0.11', '', HB_PAGE],
  // HB3.3 — training: My training and Team training; the two editors.
  ['handbook-training-light-wide', {}, WIDE,   'light', '', 'hbGoTraining_()', HB_PAGE],
  ['handbook-training-dark-mobile', {}, MOBILE, 'dark', '', 'hbGoTraining_()', HB_PAGE],
  ['handbook-quiz-editor-light-wide', {}, WIDE, 'light', '', "hbGoTraining_(); setTimeout(function(){ hbEditTeamQuiz_('tq-00000000000a'); }, 400)", HB_PAGE],
  ['handbook-plan-editor-light-mobile', {}, MOBILE, 'light', '', "hbGoTraining_(); setTimeout(function(){ hbEditPlan_('pl-000000000001'); }, 400)", HB_PAGE],
  // HB2.3 — the Display panel; the largest text with wide spacing, high
  // contrast and the easier-reading font at phone width; larger text and high
  // contrast on a desktop; a section being read aloud (the block marked).
  ['handbook-display-light-mobile', {}, MOBILE, 'light', '?s=0.11', "setTimeout(function(){ hbOpenDisplay_(); }, 300)", HB_PAGE],
  ['handbook-large-dark-mobile',   {}, MOBILE, 'dark',  '?s=0.11', HB_LARGE('{ size: 3, spacing: 2, contrast: true, font: true }'), HB_PAGE],
  ['handbook-large-light-wide',    {}, WIDE,   'light', '?s=0.10', HB_LARGE('{ size: 2, contrast: true }'), HB_PAGE],
  ['handbook-reading-light-wide',  {}, WIDE,   'light', '?s=0.11', HB_READING, HB_PAGE],
  // HB2.2 — Saved (bookmarks, one no longer in the handbook; notes, sync off)
  // and the note editor over a section.
  ['handbook-saved-light-wide',    {}, WIDE,   'light', '', HB_NOTES + 'hbGoSaved_()', HB_PAGE],
  ['handbook-saved-dark-mobile',   {}, MOBILE, 'dark',  '', HB_NOTES + 'hbGoSaved_()', HB_PAGE],
  ['handbook-note-light-mobile',   {}, MOBILE, 'light', '?s=0.11', HB_NOTES + "setTimeout(function(){ hbEditNote_('man-0-11'); }, 300)", HB_PAGE],
  // HB3.4 — the sign-off on the bar (signed; the changed-since ask is on
  // handbook-quizbar-light-mobile) and the manager's per-person progress.
  ['handbook-signed-dark-wide',    {}, WIDE,   'dark',  '?s=0.10', '', HB_PAGE],
  ['handbook-progress-light-wide', {}, WIDE,   'light', '', HB_PROGRESS, HB_PAGE],
  ['handbook-progress-dark-mobile', {}, MOBILE, 'dark', '', HB_PROGRESS, HB_PAGE],
  ['clock-light-wide',      { tool: 'timeClock', tab: 'clock' },      WIDE, 'light', ''],
  ['clock-dark-wide',       { tool: 'timeClock', tab: 'clock' },      WIDE, 'dark',  ''],
  // 22post E — Customize dashboard: the panel open mid-edit (Spanish hidden,
  // Your numbers widened), on desktop and phone; and a saved custom layout.
  ['dash-customize-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '', "clkDashOpenCustomize_();clkDashCustSet_(3,'show',false);clkDashCustSet_(1,'width','full')"],
  ['dash-customize-dark-mobile', { tool: 'timeClock', tab: 'clock' }, MOBILE, 'dark', '', "clkDashOpenCustomize_();clkDashCustSet_(3,'show',false)"],
  ['dash-custom-layout-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '', "clkDashWriteOwn_({items:[{id:'needsYou',show:true,width:'half'},{id:'teammates',show:true,width:'half'},{id:'mine',show:true,width:'full'},{id:'requests',show:true,width:'half'},{id:'punches',show:true,width:'half'},{id:'team',show:false,width:'half'},{id:'spanish',show:false,width:'half'}]});clkDashRepaintView_()"],
  // Operator 2026-08-31 — the rep forgot to punch in and has a request
  // AWAITING approval: the chip must be visible above the punch buttons, which
  // is the whole point (it is what stops them punching again "to be safe").
  ['clock-pendingadj-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?pendingadj=1'],
  // Design handoff PR 6 — "Needs you" leads the dashboard's main column. The
  // populated fixture rides every clock scenario; these two shoot the states a
  // populated fixture can never show: a CLEAN empty round (the block renders
  // nothing — the design's own rule) and a failed fetch (the warn card, never
  // "nothing pending" — INV-175/187).
  ['clock-needsyou-empty-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?fixture=empty'],
  ['clock-needsyou-error-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?failrpc=getMyPendingTasks'],
  // F-13 / F-41 (2026-09-17 broad-scan, Batch 2): the two Dashboard reads that
  // used to render a FAILURE as data — the carousels as the authoritative "No
  // call data for this period.", the shift-strip coverage chip as the same
  // blank that means "no call activity today". Both are DOM-pinned; these put
  // the warn card and the "coverage unavailable" chip on camera (a new block
  // ships its error scenario — INV-175: failed ≠ absent, on camera).
  ['clock-dash-error-light-wide',     { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?failrpc=getDashboardMetrics'],
  ['clock-coverage-error-light-wide', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?failrpc=getMyMetrics'],
  ['timeoff-light-wide',    { tool: 'timeClock', tab: 'timeoff' },    WIDE, 'light', ''],
  ['timeoff-dark-wide',     { tool: 'timeClock', tab: 'timeoff' },    WIDE, 'dark',  ''],
  ['manage-light-wide',     { tool: 'manage',    tab: 'manage' },     WIDE, 'light', ''],
  ['manage-dark-wide',      { tool: 'manage',    tab: 'manage' },     WIDE, 'dark',  ''],
  // G1 + F19 (cycle 25 E2): the pay-period close checklist sits in the
  // Periodic group, collapsed by default — these open it.
  ['manage-periodic-light-wide',   { tool: 'manage', tab: 'manage' }, WIDE,   'light', '', "mgrToggleGroup_('periodic', document.querySelector('#mgr-group-periodic .mgr-group-toggle'))"],
  ['manage-periodic-light-mobile', { tool: 'manage', tab: 'manage' }, MOBILE, 'light', '', "mgrToggleGroup_('periodic', document.querySelector('#mgr-group-periodic .mgr-group-toggle'))"],
  ['manage-periodic-error-light-wide', { tool: 'manage', tab: 'manage' }, WIDE, 'light', '?failrpc=getPayPeriodClose', "mgrToggleGroup_('periodic', document.querySelector('#mgr-group-periodic .mgr-group-toggle'))"],
  ['cn-log-light-wide',     { tool: 'callNotes', tab: 'callNotes' },  WIDE, 'light', ''],
  // F35 (cycle 25): History had never been shot; its preset row gained a button.
  ['cn-history-light-wide',   { tool: 'callNotes', tab: 'callNotesHistory' }, WIDE,   'light', ''],
  ['cn-history-light-mobile', { tool: 'callNotes', tab: 'callNotesHistory' }, MOBILE, 'light', ''],
  ['cn-log-dark-wide',      { tool: 'callNotes', tab: 'callNotes' },  WIDE, 'dark',  ''],
  ['metrics-light-wide',    { tool: 'metrics',   tab: null },         WIDE, 'light', ''],
  ['metrics-dark-wide',     { tool: 'metrics',   tab: null },         WIDE, 'dark',  ''],
  // Cycle-14 Phase 2 — Team Metrics was never in the matrix, and it is now the
  // home of the sub-queue views (segmented bars are exactly what code review
  // cannot verify).
  ['metrics-team-light-wide', { tool: 'metrics', tab: 'metricsTeam' },   WIDE, 'light', '?teamrange=7d'],
  // X3 (cycle 22): Team Metrics' DEFAULT range is today, which the one-day-lagged
  // call-data report never covers — every rep listed through notes, no rates
  // (M1: "—", never a red 0%). The three shots above/below preset a past range.
  ['metrics-team-today-light-wide', { tool: 'metrics', tab: 'metricsTeam' }, WIDE, 'light', ''],
  ['metrics-team-dark-wide',  { tool: 'metrics', tab: 'metricsTeam' },   WIDE, 'dark',  '?teamrange=7d'],
  ['intake-light-wide',     { tool: 'intake',    tab: null },         WIDE, 'light', ''],
  ['intake-catalog-light-wide', { tool: 'intake', tab: 'intakeCatalog' }, WIDE, 'light', ''],
  // 2026-08-31 coverage pass — the matrix covered 18 of 29 registry tabs.
  // These three were the highest-value misses: BOTH Intake account forms are
  // PHI-bearing 20+ field layouts that only the PPD sibling was ever shot
  // against, and Team Notes is the manager surface for the whole Call Notes
  // module (training queue, review candidates, per-rep, stats).
  ['intake-pmd-light-wide', { tool: 'intake', tab: 'intakePmdAccount' }, WIDE, 'light', ''],
  ['intake-pap-light-wide', { tool: 'intake', tab: 'intakePapAccount' }, WIDE, 'light', ''],
  // 25post A1: a Sent PPD's detail — each recommendation with its reason.
  ['intake-sent-detail-light-wide', { tool: 'intake', tab: 'intakeSent' }, WIDE, 'light', '', "intakeOpenSent_(document.querySelector('[data-sent-idx]')); setTimeout(function () { var g = document.querySelector('.intk-sent-grp'); if (g) g.scrollIntoView({ block: 'start' }); }, 250)"],
  ['cn-teamnotes-light-wide', { tool: 'callNotes', tab: 'callNotesManage' }, WIDE, 'light', ''],
  // Operator 2026-09-10 — the Per-Rep view: the read-only card with its
  // Coach / Delete actions had never been on camera (the default Team Notes
  // scenario lands on the training queue), which is how Coach shipped as an
  // unstyled native button beside a styled Delete.
  ['cn-teamnotes-rep-light-wide', { tool: 'callNotes', tab: 'callNotesManage' }, WIDE, 'light', '', 'cnMgrLoadRepView_()'],
  ['intake-dark-wide',      { tool: 'intake',    tab: null },         WIDE, 'dark',  ''],
  ['reference-light-wide',  { tool: 'reference', tab: null },         WIDE, 'light', ''],
  // E6 (cycle 25, G4): the admin's "What people search for" block and a content
  // request's search hint sit at the bottom of the landing's own scroller, so
  // the landing shots never reached them — scroll the requests into view.
  ['reference-search-signal-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', E6_SIGNAL_SCROLL],
  ['reference-search-signal-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '', E6_SIGNAL_SCROLL],
  ['training-light-wide',   { tool: 'develop',   tab: null },         WIDE, 'light', ''],
  ['coaching-light-wide',   { tool: 'develop',   tab: 'coaching' },   WIDE, 'light', ''],
  ['clock-light-compact',   { tool: 'timeClock', tab: 'clock' },      COMPACT, 'light', '?compact=1'],
  ['cn-log-light-compact',  { tool: 'callNotes', tab: 'callNotes' },  COMPACT, 'light', '?compact=1'],
  ['cn-log-dark-compact',   { tool: 'callNotes', tab: 'callNotes' },  COMPACT, 'dark',  '?compact=1'],
  ['clock-light-mobile',    { tool: 'timeClock', tab: 'clock' },      MOBILE, 'light', ''],
  ['cn-log-light-mobile',   { tool: 'callNotes', tab: 'callNotes' },  MOBILE, 'light', ''],
  // Cycle-16 Batch 4 — the matrix shot five of nine tools at ONE viewport, and
  // that gap is why F2 survived two interface-focused cycles: Reference's
  // reader measured 70px at 390px and `kb/script_kb.html` carried zero media
  // queries, but the only Reference scenario was `reference-light-wide`, where
  // the two-column shell is correct. Every REP-FACING tool now has a mobile
  // scenario, and the two mid-task tools (the ones whose pop-out the KB drawer
  // edge-tab treats as first-class) have a compact one.
  ['reference-light-mobile',  { tool: 'reference', tab: null },              MOBILE,  'light', ''],
  ['reference-light-compact', { tool: 'reference', tab: null },              COMPACT, 'light', '?compact=1'],
  ['intake-light-mobile',     { tool: 'intake',    tab: null },              MOBILE,  'light', ''],
  ['intake-light-compact',    { tool: 'intake',    tab: null },              COMPACT, 'light', '?compact=1'],
  ['metrics-light-mobile',    { tool: 'metrics',   tab: null },              MOBILE,  'light', ''],
  ['metrics-team-light-mobile', { tool: 'metrics', tab: 'metricsTeam' },     MOBILE,  'light', '?teamrange=7d'],
  ['training-light-mobile',   { tool: 'develop',   tab: null },              MOBILE,  'light', ''],
  // Cycle-17 Batch 7 — three coverage gaps the Visual Audit Stage had been
  // carrying as known-uncovered: (a) dark parity for Reference / Training /
  // Coaching (light-only until now — a theme defect there was unshootable);
  // (b) the Admin panel at ANY viewport (needed the getAutomationHealth-family
  // fixtures); (c) the first ERROR-STATE shots — `?failrpc=<name>` makes the
  // mock invoke the FAILURE handler for the named RPCs, so the
  // errorStateHtml_ paths (A12/INV-175: warn card + glyph, never an
  // empty-state) render on camera instead of only in source pins.
  ['reference-dark-wide',     { tool: 'reference', tab: null },              WIDE, 'dark',  ''],
  ['training-dark-wide',      { tool: 'develop',   tab: null },              WIDE, 'dark',  ''],
  ['coaching-dark-wide',      { tool: 'develop',   tab: 'coaching' },        WIDE, 'dark',  ''],
  // Design handoff PR 4 (K12) — the composer DRAWER (post hook), the empty
  // team state (`?fixture=empty`), the REP view (never shot before — the
  // fixture returned {items:[]}; `?role=rep` flips the role flags), a phone
  // width, and a forced-fail error state (INV-175 — failed ≠ empty).
  ['coaching-drawer-light-wide', { tool: 'develop', tab: 'coaching' }, WIDE, 'light', '', 'coachOpenDrawer_(null)'],
  ['coaching-empty-light-wide',  { tool: 'develop', tab: 'coaching' }, WIDE, 'light', '?fixture=empty'],
  ['coaching-mine-light-wide',   { tool: 'develop', tab: 'coaching' }, WIDE, 'light', '?role=rep'],
  ['coaching-mine-dark-wide',    { tool: 'develop', tab: 'coaching' }, WIDE, 'dark',  '?role=rep'],
  ['coaching-light-mobile',      { tool: 'develop', tab: 'coaching' }, MOBILE, 'light', ''],
  ['coaching-mine-light-mobile', { tool: 'develop', tab: 'coaching' }, MOBILE, 'light', '?role=rep'],
  ['coaching-error-light-wide',  { tool: 'develop', tab: 'coaching' }, WIDE, 'light', '?failrpc=getCoachingDashboard'],
  ['admin-light-wide',        { tool: 'manage',    tab: 'callNotesAdmin' },  WIDE, 'light', ''],
  ['admin-dark-wide',         { tool: 'manage',    tab: 'callNotesAdmin' },  WIDE, 'dark',  ''],
  ['metrics-error-light-wide',    { tool: 'metrics',   tab: null },          WIDE,   'light', '?failrpc=getMyMetrics'],
  ['cn-log-error-light-wide',     { tool: 'callNotes', tab: 'callNotes' },   WIDE,   'light', '?failrpc=getMyCallNotes'],
  ['reference-error-light-mobile', { tool: 'reference', tab: null },         MOBILE, 'light', '?failrpc=getReferenceTree'],
  // Operator feedback 2026-08-06 — the two redesigned status views (combined
  // color-coded lists): fixtures cover all four DR tones + an overdue Spanish
  // pending card, so the tone vocabulary itself is on camera.
  ['spanish-light-wide',   { tool: 'metrics', tab: 'metricsSpanish' }, WIDE, 'light', ''],
  // Operator 2026-09-10 — a pending card EXPANDED (Expand ⇄ Collapse): the
  // full request body in place of the snippet, the button reading Collapse.
  ['spanish-expanded-light-wide', { tool: 'metrics', tab: 'metricsSpanish' }, WIDE, 'light', '', "spanishExpand_(document.querySelector('.sp-more[data-thread]'))"],
  ['deptreq-light-wide',   { tool: 'metrics', tab: 'metricsDeptReq' }, WIDE, 'light', ''],
  // Operator 2026-09-10 (note 6) — a request card EXPANDED: the source note's
  // fields in the detail panel under a subject carrying patient & TRX.
  ['deptreq-expanded-light-wide', { tool: 'metrics', tab: 'metricsDeptReq' }, WIDE, 'light', '', "drExpand_(document.querySelector('.dr-expand[data-req]'))"],
  // DR-3 (operator 2026-10-27): the department's reply on a Replies-to-check card, drawn as a conversation.
  ['deptreq-reply-light-wide', { tool: 'metrics', tab: 'metricsDeptReq' }, WIDE, 'light', '', "drReplyToggle_(document.querySelector('#dr-looks .dr-reply-btn'))"],
  ['deptreq-reply-dark-mobile', { tool: 'metrics', tab: 'metricsDeptReq' }, MOBILE, 'dark', '', "drReplyToggle_(document.querySelector('#dr-looks .dr-reply-btn'))"],
  // 22post A-7 — the manager top row (team-wide cards beside the resolution
  // table) STACKS in the pop-out; and the sort + date controls in dark mode.
  ['deptreq-light-compact', { tool: 'metrics', tab: 'metricsDeptReq' }, COMPACT, 'light', '?compact=1'],
  ['deptreq-dark-wide',     { tool: 'metrics', tab: 'metricsDeptReq' }, WIDE, 'dark', ''],
  // Cycle 25 E4 (ST1): "Replies to check" leads the tab — at phone width too.
  ['deptreq-looks-light-mobile', { tool: 'metrics', tab: 'metricsDeptReq' }, MOBILE, 'light', ''],
  // 22post A-2a — the Scratchpad with the standard modal buttons.
  ['cn-scratchpad-dark-wide', { tool: 'callNotes', tab: 'callNotes' }, WIDE, 'dark', '', "cnOpenScratchpadModal_()"],
  // 22post B-2b — the floating panel in the pop-out: clamped inside the narrow
  // window, the form still visible around it (no backdrop).
  ['cn-scratchpad-light-compact', { tool: 'callNotes', tab: 'callNotes' }, COMPACT, 'light', '?compact=1', "cnOpenScratchpadModal_()"],
  // Operator 2026-08-17 (full-width round): the new .sp-top head+chart grid
  // stacks <1024px — shoot the stacked form so the breakpoint is on camera.
  ['spanish-light-mobile', { tool: 'metrics', tab: 'metricsSpanish' }, MOBILE, 'light', ''],
  // Operator 2026-08-18 (width round): Punctuality had never been shot — the
  // inner 780/820px caps survived two width passes because of it.
  ['punctuality-light-wide', { tool: 'manage', tab: 'punctuality' }, WIDE, 'light', ''],
  // Design handoff PR 3 (Manage): Punctuality dark parity + mobile + the
  // EXPANDED row (the detailRow is the whole point of the redesign), and
  // Coverage — which had never been shot at all — in light/dark/mobile.
  ['punctuality-dark-wide',   { tool: 'manage', tab: 'punctuality' }, WIDE, 'dark', ''],
  ['punctuality-light-mobile', { tool: 'manage', tab: 'punctuality' }, MOBILE, 'light', ''],
  ['punctuality-expanded-light-wide', { tool: 'manage', tab: 'punctuality' }, WIDE, 'light', '', "(function(){var b=document.querySelector('.pt-wrap .m-qtoggle'); if (b) b.click();})()"],
  ['coverage-light-wide',  { tool: 'manage', tab: 'coverage' }, WIDE, 'light', ''],
  ['coverage-dark-wide',   { tool: 'manage', tab: 'coverage' }, WIDE, 'dark', ''],
  ['coverage-light-mobile', { tool: 'manage', tab: 'coverage' }, MOBILE, 'light', ''],
  // QA module Phase 1 (2026-08-27): the queue list — status tones, assignee
  // pills, filter chips. The detail/player needs chunked audio and stays an
  // uncovered scenario (noted in the Visual Audit Stage).
  ['qa-queue-light-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'light', ''],
  ['qa-queue-light-mobile', { tool: 'qa', tab: 'qaQueue' }, MOBILE, 'light', ''],
  // PR 5 (design handoff): dark parity for the coverage-first queue, the
  // genuinely-empty store (`?fixture=empty` — coverage + recordings empty
  // states), and the two-pane detail at a phone width.
  ['qa-queue-dark-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'dark', ''],
  ['qa-queue-empty-light-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'light', '?fixture=empty'],
  ['qa-detail-light-mobile', { tool: 'qa', tab: 'qaQueue' }, MOBILE, 'light', '', "qaOpenDetail_('qaFileBbbbbbbb2')"],
  // QA Phase 2 — the per-agent stats table (mtRenderTable_ with dynamic
  // criterion columns; em dashes for null averages, the '(unassigned)' row).
  ['qa-stats-light-wide', { tool: 'qa', tab: 'qaStats' }, WIDE, 'light', ''],
  // QA Log (operator 2026-09-04): the reviewer's ledger — day groups, a
  // manual (recording-less) entry, Yes/No + dropdown chips, an unindexed
  // recording; the empty twin and the cold failure per the C7 rule.
  ['qa-log-light-wide', { tool: 'qa', tab: 'qaLog' }, WIDE, 'light', ''],
  ['qa-log-light-mobile', { tool: 'qa', tab: 'qaLog' }, MOBILE, 'light', ''],
  ['qa-log-empty-light-wide', { tool: 'qa', tab: 'qaLog' }, WIDE, 'light', '?fixture=empty'],
  ['qa-log-error-light-wide', { tool: 'qa', tab: 'qaLog' }, WIDE, 'light', '?failrpc=getQaLog'],
  ['qa-log-new-light-wide', { tool: 'qa', tab: 'qaLog' }, WIDE, 'light', '', "qaLogNew_()"],
  // QA Phase 3 — the agent-facing read-only My Reviews tab (canSeeQa-gated
  // since the 2026-08-28 operator decision; the persona here is a QA member).
  // The post hook presses Play on the first card, so the follow-on's
  // per-card player + waveform (real decode of the mock's WAV) are on camera.
  ['qa-myreviews-light-wide', { tool: 'qa', tab: 'qaMyReviews' }, WIDE, 'light', '', "qaMyRevPlay_('qaFileCccccccc3')"],
  // The recording DETAIL (follow-on 2026-08-28 — the standing matrix gap):
  // player assembled from the mock's real 1s WAV chunk, waveform, scorecard
  // form + list, comment timeline. Opened via the post hook (the sched-modal
  // precedent).
  ['qa-detail-light-wide', { tool: 'qa', tab: 'qaQueue' }, WIDE, 'light', '', "qaOpenDetail_('qaFileBbbbbbbb2')"],
  // F8 (cycle 18): Time / PTO is the most recently RESTRUCTURED rep-facing page
  // (consolidated to one page 2026-08-18 — quick-actions card + stacked rail)
  // and was shot only at 1440px, so the stacking of that new rail was never on
  // camera. Every other rep-facing tool has a mobile scenario; this closes the
  // gap the Visual Audit Stage's own claim already implied.
  ['timeoff-light-mobile', { tool: 'timeClock', tab: 'timeoff' }, MOBILE, 'light', ''],
  // Operator 2026-08-18 (fluid pop-out type, then the same day's narrow
  // round): the CN pop-out shrunk BELOW its 480px launch width. At 360px this
  // now shows the ≤400px STACKED framing — one-column trio, labels above
  // values, one-column save quadrant, note cards without the timestamp
  // column — with the clamp() type near its floor. Between 401 and 480px the
  // compact grids still hold (2-up trio, 84px labels) and only the type
  // scales; this scenario is the stacked side of that boundary, on camera.
  ['cn-log-light-compact-sm', { tool: 'callNotes', tab: 'callNotes' }, COMPACT_SM, 'light', '?compact=1'],
  // Pilot round 2 (2026-08-24): the scheduled-call reminders modal — the
  // matrix's first modal-state scenario (via the `post` hook). The fixture
  // carries one upcoming + one 2h-overdue item, so the overdue tone and the
  // Done/Cancel controls are on camera; the create form's label-for naming is
  // what a11y-names.mjs cannot reach (it walks tab landings too).
  ['cn-sched-modal-light-wide', { tool: 'callNotes', tab: 'callNotes' }, WIDE, 'light', '', 'cnOpenSchedModal_()'],
  // Round-3 follow-through: dark parity + the compact pop-out form of the same
  // modal (a theme or compact defect there was unshootable while the modal had
  // one scenario — the reference/training dark-parity lesson, batch ⑦).
  ['cn-sched-modal-dark-wide',     { tool: 'callNotes', tab: 'callNotes' }, WIDE,    'dark',  '', 'cnOpenSchedModal_()'],
  ['cn-sched-modal-light-compact', { tool: 'callNotes', tab: 'callNotes' }, COMPACT, 'light', '?compact=1', 'cnOpenSchedModal_()'],
  // Round-3 follow-ons: the OPEN Reference reader — comments thread (edit/
  // delete cluster, add form) + the feedback bar were unshootable while the
  // matrix only walked the Reference landing.
  ['reference-reader-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('kb-1')"],
  // Batch M1 — a procedures-manual article as the export writes it (the real
  // 0.10 since manual fixes E: label-toned callouts, a table inside a callout,
  // the diagram and the icon tables), and the admin Manual dialog after a Check.
  ['reference-manual-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('man-0-10')"],
  // Batch M2 — the part page scrolled to its second section (the "Updated"
  // badge, the per-section feedback bar), and a cross-reference preview card.
  ['reference-manual-part-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('man-0-11')"],
  // Batch M2 — the call router in the Ctrl+K drawer, filtered; and a typed
  // section number in Reference search (the jump row).
  ['reference-manual-router-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenRouterFromTab_(); setTimeout(function(){ var i=document.getElementById('kbd-rt-q'); if(i){ i.value='waiting'; i.dispatchEvent(new Event('input')); } }, 500)"],
  ['reference-manual-router-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '', 'kbOpenRouterFromTab_()'],
  ['reference-manual-jump-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "var s=document.getElementById('kb-search'); if(s){ s.value='0.10.2'; kbDoSearch_('0.10.2'); }"],
  ['reference-manual-xref-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-xref[data-kb-id=\"man-0-10\"]'); if(a) kbXrefShow_(a); }, 400)"],
  ['reference-manual-dark-wide',  { tool: 'reference', tab: null }, WIDE, 'dark',  '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var h=document.getElementById('kb-h-0-11-1-notating-a-call'); if(h) h.scrollIntoView(); }, 300)"],   // the 0.11 feature fixture: nested list, Critical, snippet
  // Batch M3 — the manual's diagrams (the generated partial, themed through
  // the --dg-* token map) in both themes and at phone width (it must scroll
  // inside itself), and its images (a figure, an equipment photo, the icons,
  // and one key the import has not carried: the "not imported" chip).
  ['reference-manual-diagram-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var f=document.querySelector('figure.kb-diagram'); if(f) f.scrollIntoView(); }, 300)"],
  ['reference-manual-diagram-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var f=document.querySelector('figure.kb-diagram'); if(f) f.scrollIntoView(); }, 300)"],
  ['reference-manual-diagram-light-mobile', { tool: 'reference', tab: null }, MOBILE, 'light', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var f=document.querySelector('figure.kb-diagram'); if(f) f.scrollIntoView(); }, 300)"],
  ['reference-manual-diagram-full-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var b=document.querySelector('figure.kb-diagram .kb-diagram-full'); if(b) kbDiagramOpen_(b); }, 400)"],
  // Operator 2026-10-23 — a named button's screenshot beside the text (0.10's
  // Messages), and a 5.2 slide open as its slideshow at full size.
  ['reference-manual-peek-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var p=document.querySelector('.kb-peek[data-peek=\"fig-nav-messages-button\"]'); if(p){ p.scrollIntoView({ block: 'center' }); setTimeout(function(){ kbPeekShow_(p); }, 300); } }, 600)"],
  ['reference-manual-viewer-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-5-2'); setTimeout(function(){ var i=document.querySelector('.kb-gallery .kb-gal-slide img'); if(i) kbImageOpen_(i); }, 700)"],
  ['reference-manual-images-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var h=document.getElementById('kb-h-0-11-3-what-to-include-in-the-body'); if(h) h.scrollIntoView(); }, 600)"],
  ['reference-manual-images-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-0-10'); setTimeout(function(){ var h=document.getElementById('kb-h-0-10-1-trx-type'); if(h) h.scrollIntoView(); }, 600)"],
  // Batch M4 — the manual's recent changes on the Reference landing and in the
  // What's new panel; a HCPCS code clicked (the drawer's lookups, the code in
  // the item box); and a cross-reference previewed from the KEYBOARD.
  ['reference-landing-manual-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '?whatsnew=manual', ''],
  ['reference-landing-manual-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '?whatsnew=manual',
    "setTimeout(function(){ var l=document.querySelector('#kb-main .mr-list'); if(l) l.scrollIntoView(); }, 400)"],
  ['whatsnew-manual-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '?whatsnew=manual', 'whatsNewOpen_()'],
  ['reference-manual-hcpcs-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-hcpcs[data-hcpcs=\"E0601\"]'); if(a) a.click(); }, 600)"],
  ['reference-manual-xref-focus-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-xref[data-kb-id=\"man-0-10\"]'); if(a) a.focus(); }, 500)"],
  // Batch M5a — a preview focused on the part of its target the link is about
  // (the fax row → 0.10's navigation callout), the click that jumped to another
  // chapter (10.4, landed on the deductible answer, with the "Back to 0.11" chip —
  // wide and at phone width, where the chip's title must ellipsize), and the
  // drawer's trail after a cross-reference ("Back to 0.11" above the reader).
  ['reference-manual-xref-part-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-xref[data-kb-id=\"man-0-10\"][data-kb-anchor=\"\"]'); if(a){ a.scrollIntoView({block:'center'}); kbXrefShow_(a); } }, 500)"],
  ['reference-manual-backchip-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-xref[data-kb-id=\"man-10-4\"]'); if(a) a.click(); }, 500)"],
  ['reference-manual-backchip-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '',
    "kbOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kb-man-sec-man-0-11 a.kb-xref[data-kb-id=\"man-10-4\"]'); if(a) a.click(); setTimeout(function(){ var m=document.getElementById('kb-main'); if(m) m.scrollIntoView(); window.scrollTo(0,0); }, 600); }, 500)"],
  ['reference-drawer-backto-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbDrawerOpen_(); kbDrawerOpenItem_('man-0-11'); setTimeout(function(){ var a=document.querySelector('#kbd-body a.kb-xref[data-kb-id=\"man-0-10\"][data-kb-anchor=\"\"]'); if(a) a.click(); }, 600)"],
  // Batch M5b — Reference search: a call-router hit ("The caller said …", the
  // phone mark) above a section, the matched terms marked (a stem, a phrase),
  // in the tab and in the drawer.
  ['reference-search-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "var s=document.getElementById('kb-search'); if(s){ s.value='waiting on doctor'; kbDoSearch_('waiting on doctor'); }"],
  ['reference-search-drawer-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbDrawerOpen_(); setTimeout(function(){ var q=document.getElementById('kbd-q'); if(q){ q.value='waiting on doctor'; kbDrawerSearch_('waiting on doctor'); } }, 300)"],
  ['reference-manual-import-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenManualImport_(); kbManualSetFile_({ name: 'manual.json', size: 1577555, text: 'x'.repeat(1577555) }); kbManualRun_(true)"],
  // Operator testing 2026-10-08 — the reader's polish on two REAL sections (3.8's
  // thumbnail table and policy callout; 5.2's tables and numbered list): the
  // number chips, the chapter-coloured rule and sub-section numbers, and both
  // table kinds, in light, dark and at phone width; and an import that finished
  // (the toast, the result, the rebuilt publish block).
  ['reference-manual-polish-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('man-3-8')"],
  ['reference-manual-polish-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '', "kbOpenItem_('man-3-8')"],
  ['reference-manual-polish-light-mobile', { tool: 'reference', tab: null }, MOBILE, 'light', '', "kbOpenItem_('man-3-8')"],
  ['reference-manual-polish-pak-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', "kbOpenItem_('man-5-2')"],
  ['reference-manual-power-diagram-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenItem_('man-5-1'); setTimeout(function(){ var f=document.querySelector('figure.kb-diagram'); if(f) f.scrollIntoView(); }, 400)"],
  ['reference-manual-power-diagram-dark-wide', { tool: 'reference', tab: null }, WIDE, 'dark', '',
    "kbOpenItem_('man-5-1'); setTimeout(function(){ var f=document.querySelector('figure.kb-diagram'); if(f) f.scrollIntoView(); }, 400)"],
  ['reference-manual-imported-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenManualImport_(); kbManualSetFile_({ name: 'manual.json', size: 1577555, text: 'x'.repeat(1577555) }); kbManualRun_(false)"],
  // Cycle 25 E3 — the handbook loop: the feedback export's answer in the
  // Handbook dialog (a cut window, warn tone), and the Issue field's handbook
  // strip on the Log at phone width and in dark mode.
  ['reference-manual-feedback-export-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',
    "kbOpenManualImport_(); kbManualExportFeedback_()"],
  ['reference-review-due-light-mobile', { tool: 'reference', tab: null }, MOBILE, 'light', '',
    "setTimeout(function(){ var r=document.querySelector('.kb-land-rd'); if(r) r.scrollIntoView(); }, 600)"],
  ['cn-log-handbook-strip-light-mobile', { tool: 'callNotes', tab: 'callNotes' }, MOBILE, 'light', '',
    "cnSetFieldValue_('cn-fld-issue', 'Patient waiting on the doctor to sign the order'); kbHbStripRefresh_()"],
  ['cn-log-handbook-strip-dark-wide', { tool: 'callNotes', tab: 'callNotes' }, WIDE, 'dark', '',
    "cnSetFieldValue_('cn-fld-issue', 'Patient waiting on the doctor to sign the order'); kbHbStripRefresh_()"],
  // Cycle 21 (operator report, 2026-09-21) — the KB DRAWER had never been shot,
  // by any scenario, at any width. That is why both lookups sat inside
  // `.kbd-sec` — a mono/uppercase flex HEADING bar — for weeks: every result
  // rendered as a row of 10px uppercase and the ~340px drawer scrolled
  // sideways, and nothing rendered it. The DOM pins passed throughout because
  // they asserted the sections MOUNT, which they did, inside the heading bar.
  // Shot at WIDE (the drawer is fixed-width, so this is its real geometry) and
  // in the COMPACT pop-out, which is where a rep actually keeps it.
  ['reference-drawer-light-wide',   { tool: 'reference', tab: null }, WIDE,    'light', '',           KBD_SEARCH],
  ['reference-drawer-dark-wide',    { tool: 'reference', tab: null }, WIDE,    'dark',  '',           KBD_SEARCH],
  ['reference-drawer-light-compact',{ tool: 'reference', tab: null }, COMPACT, 'light', '?compact=1', KBD_SEARCH],
  ['reference-results-light-wide',  { tool: 'reference', tab: null }, WIDE,    'light', '',           KBL_SEARCH],
  ['reference-results-dark-wide',   { tool: 'reference', tab: null }, WIDE,    'dark',  '',           KBL_SEARCH],
  ['reference-elig-cards-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', KBL_ELIG_CARDS],
  ['reference-elig-cards-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '', KBL_ELIG_CARDS],
  ['reference-img-states-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', KBL_IMG_STATES],
  ['reference-img-states-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '', KBL_IMG_STATES],
  ['reference-elig-map-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '', KBL_ELIG_MAP],
  ['reference-elig-map-dark-mobile', { tool: 'reference', tab: null }, MOBILE, 'dark', '', KBL_ELIG_MAP],
  // T3 — the join, both directions in one frame: the payor's code columns
  // NAMED (and the three states that are not a name), and the item row's
  // cross-reference to the payor on screen.
  ['reference-codes-light-wide',    { tool: 'reference', tab: null }, WIDE,    'light', '',           KBL_CODES],
  ['reference-codes-dark-wide',     { tool: 'reference', tab: null }, WIDE,    'dark',  '',           KBL_CODES],
  ['reference-drawer-xref-light-wide', { tool: 'reference', tab: null }, WIDE, 'light', '',            KBD_XREF],
  ['manual-copy-light-wide',        { tool: 'reference', tab: null }, WIDE,    'light', '',           MANUAL_COPY],
  ['manual-copy-dark-wide',         { tool: 'reference', tab: null }, WIDE,    'dark',  '',           MANUAL_COPY],

  // Admin lands on OVERVIEW, so the CONFIG pane — where the operator-facing
  // editors live, incl. the 2026-08-25 Reference data-table upload — had no
  // coverage at all. One post-hook closes it (the sched-modal precedent).
  ['admin-config-light-wide', { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '', "cnAdminTab_('config')"],
  // Break coverage strip (2026-09-03): the planner RPC forced to fail on a COLD open — the strip must render the error card, never an empty strip.
  ['admin-config-covfail-light-wide', { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '?failrpc=getBreakCoverage', "cnAdminTab_('config')"],

  // A4 (2026-09-01): the Day Edit modal, rebuilt from four fixed slots to an
  // N-row break list. It had never been shot at all, which is how a modal that
  // silently collapsed a two-break day stayed invisible for as long as it did.
  // The fixture day carries TWO breaks, so the list, its numbering and the
  // remove controls are on camera; compact covers the pop-out width, where a
  // 3-column row (leave / return / remove) is the geometry most at risk.
  ['dayedit-light-wide',    { tool: 'manage', tab: 'manage' }, WIDE,    'light', '',
    "openDayEditModal('E-1077', 'Nina Patel')"],
  ['dayedit-dark-wide',     { tool: 'manage', tab: 'manage' }, WIDE,    'dark',  '',
    "openDayEditModal('E-1077', 'Nina Patel')"],
  ['dayedit-light-compact', { tool: 'manage', tab: 'manage' }, COMPACT, 'light', '?compact=1',
    "openDayEditModal('E-1077', 'Nina Patel')"],
  // Round 12 E2 (operator 2026-10-28): the app-activity strip with both
  // suggestions — a past day, both clock slots cleared, Clock In applied (so
  // the Inferred tag is on camera beside the Out suggestion still offered).
  ['dayedit-activity-light-wide', { tool: 'manage', tab: 'manage' }, WIDE, 'light', '', DAYEDIT_ACTIVITY],
  ['dayedit-activity-dark-mobile', { tool: 'manage', tab: 'manage' }, MOBILE, 'dark', '', DAYEDIT_ACTIVITY],
  // TC-02 (cycle 23): the Adjust modal's "which break" choice. The fixture day
  // already has a Lunch Out (getMyDayBreaks), so the add / correct radios are on
  // camera; the phone width is where the radio labels wrap.
  ['adjust-break-light-wide',   { tool: 'timeClock', tab: 'clock' }, WIDE,   'light', '',
    "openAdjustModal(); var t = document.getElementById('adj-type'); t.value = 'LunchOut'; t.dispatchEvent(new Event('change'))"],
  ['adjust-break-light-mobile', { tool: 'timeClock', tab: 'clock' }, MOBILE, 'light', '',
    "openAdjustModal(); var t = document.getElementById('adj-type'); t.value = 'LunchOut'; t.dispatchEvent(new Event('change'))"],

  // Follow-on (2026-09-01): the ADMIN sub-tabs were the matrix's last
  // wide-only surface, and the Visual Audit Stage had been carrying them as a
  // known gap since the 2026-08-11 `.toolbar-tabs` overflow was found BY HAND
  // at 390px. Each pane is genuinely different content — a status-card grid, a
  // usage panel, three tables, and the long operator-editor stack — so one
  // scenario per pane rather than one for the tab strip.
  ['admin-light-mobile',            { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', ''],
  ['admin-tags-light-mobile',       { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '', "cnAdminTab_('tags')"],
  // A4 (cycle 22) — a failed taxonomy load is a named failure, not "No tags in use yet".
  ['admin-tags-fail-light-mobile',  { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '?failrpc=getCallNotesTagTaxonomy', "cnAdminTab_('tags')"],
  ['admin-compliance-light-mobile', { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '', "cnAdminTab_('compliance')"],
  ['admin-config-light-mobile',     { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '', "cnAdminTab_('config')"],
  ['admin-sheets-light-mobile',     { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '', "cnAdminTab_('sheets')"],
  // Design handoff PR 2 — the findings-first System pane: populated (one
  // warning per area on purpose), dark parity, mobile, the ALL-CLEAR state via
  // ?fixture=empty, and the X7 error state via a forced health-RPC failure.
  ['admin-system-light-mobile',      { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '', "cnAdminTab_('system')"],
  ['admin-system-light-wide',        { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '', "cnAdminTab_('system')"],
  ['admin-system-dark-wide',         { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'dark', '', "cnAdminTab_('system')"],
  // Cycle 25 E4 (ST1): the reply check's review report, scrolled into view (an over-fired rule in amber).
  ['admin-system-replycheck-light-wide', { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '',
    "cnAdminTab_('system'); setTimeout(function(){ var p=document.getElementById('cn-sys-sec-replyreviews'); if(p) p.scrollIntoView(); }, 700)"],
  ['admin-system-replycheck-light-mobile', { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '',
    "cnAdminTab_('system'); setTimeout(function(){ var p=document.getElementById('cn-sys-sec-replyreviews'); if(p) p.scrollIntoView(); }, 700)"],
  ['admin-system-allclear-light-wide', { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '?fixture=empty', "cnAdminTab_('system')"],
  ['admin-system-error-light-wide',  { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '?failrpc=getAutomationHealth', "cnAdminTab_('system')"],
  // The Drive grant the operator was actually missing (2026-09-09) — the
  // failing state of the new capability line, at both widths.
  ['admin-system-nodrive-light-wide',   { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '?drive=denied', "cnAdminTab_('system')"],
  ['admin-system-nodrive-light-mobile', { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '?drive=denied', "cnAdminTab_('system')"],
  // DRV-1 (cycle 23): granted scope, DISABLED service — the domain's real
  // state, which the line read as green. The longest message it carries.
  ['admin-system-drivedisabled-light-wide',   { tool: 'manage', tab: 'callNotesAdmin' }, WIDE, 'light', '?drive=disabled', "cnAdminTab_('system')"],
  ['admin-system-drivedisabled-light-mobile', { tool: 'manage', tab: 'callNotesAdmin' }, MOBILE, 'light', '?drive=disabled', "cnAdminTab_('system')"],

  // Follow-on (2026-09-01): Manage Time was covered only at WIDE, so an inline
  // `grid-template-columns:1fr 1fr` on the analytics pair — which beats every
  // stylesheet rule, media queries included — kept a 44px page overflow at
  // 390px until it was measured by hand. On camera now so the next one is not.
  ['manage-light-mobile', { tool: 'manage', tab: 'manage' }, MOBILE, 'light', ''],
  // Operator 2026-09-02: a PH agent saw "Clock In" at midnight PHT. The
  // server half was roster data (Timezone = Asia/Manila under the ALL-CST
  // policy; fixed by the roster flip + the profile-vs-anchor warning). The
  // CLIENT half — any site reading the browser clock instead of the roster
  // frame — only shows when the two disagree, which no scenario had ever
  // arranged: the harness browser is UTC and the fixture roster was Kolkata,
  // but never with the clock frozen ACROSS the browser's midnight. This one
  // is a CSR whose roster says America/Chicago (`?tz=`), viewed from a
  // Manila browser (7th tuple entry: `timezoneId`), at 00:05 PHT = 11:05 CDT
  // mid-shift. The Dashboard must still read as Chicago: today's date, the
  // punches, the ribbon's now-cursor and the break-chip states all on the
  // CST day, not a fresh PHT day with "Clock In".
  ['clock-light-wide-pht', { tool: 'timeClock', tab: 'clock' }, WIDE, 'light', '?tz=America/Chicago&role=rep', '', { tz: 'Asia/Manila', utc: [16, 5] }],
];

// --ci (cycle 25 E5, ST4): the gate's subset by EXACT name. A name the matrix
// does not have is refused before the browser starts — a filter that matches
// nothing would shoot nothing and pass.
const CI = process.argv.includes('--ci');
if (CI) {
  const names = new Set(SCENARIOS.map((s) => s[0]));
  const absent = gate.CI_SCENARIOS.filter((n) => !names.has(n));
  if (absent.length) { console.error('ci-gate: no such scenario: ' + absent.join(', ')); process.exit(1); }
}
const only = CI ? null : (process.argv[2] ? process.argv.slice(2) : null);
const report = [];
const browser = await chromium.launch({ executablePath: chromiumPath() });

for (const [name, nav, vp, mode, query, post, opts] of SCENARIOS) {
  if (CI && !gate.CI_SCENARIOS.includes(name)) continue;
  if (only && !only.some((o) => name.includes(o))) continue;
  // opts (optional 7th entry): { tz: <IANA browser timezone>, utc: [h, m] frozen instant }.
  const ctxOpts = { viewport: vp, colorScheme: mode === 'dark' ? 'dark' : 'light' };
  if (opts && opts.tz) ctxOpts.timezoneId = opts.tz;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  // umsTzWarnedDay: the fixture roster tz (Asia/Kolkata) never matches the
  // sandbox browser (UTC), so the once-a-day sticky tz-mismatch toast
  // (9c5df81) would cover the top of EVERY screenshot. Seed "already warned
  // today" — the steady state, same posture as the tour-seen flag.
  await page.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('umsTimeClockMode', m); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} }, mode);
  const fake = new Date();
  if (opts && opts.utc) fake.setUTCHours(opts.utc[0], opts.utc[1] || 0, 0, 0);
  else fake.setUTCHours(9, 0, 0, 0);   // 14:30 IST mid-shift
  await page.clock.install({ time: fake });
  await page.goto((opts && opts.page === 'handbook' ? PAGE_HB : PAGE) + query, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (nav.tool) {
    await page.evaluate(([tool, tab]) => { try { window.enterTool(tool, tab || undefined); } catch (e) { console.error('enterTool threw: ' + e.message); } }, [nav.tool, nav.tab]);
    await page.waitForTimeout(1800);
  }
  if (post) {
    await page.evaluate((code) => { try { (0, eval)(code); } catch (e) { console.error('post hook threw: ' + e.message); } }, post);
    await page.waitForTimeout(1000);
  }
  // Compact/mobile use viewport-clipped frames: a fullPage capture PAINTS
  // off-viewport fixed elements (the closed KB drawer, the mobile nav) into
  // the stitched image — artifacts that read as bugs. Wide uses fullPage.
  const clipView = vp.width < 900;
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !clipView });
  if (clipView) { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + '-bottom.png') }); }
  const missing = await page.evaluate(() => Array.from(new Set(window.__MISSING__ || [])));
  const view = await page.evaluate(() => (typeof currentView !== 'undefined' ? currentView : '?'));
  // Cycle-16 Batch 4 — the one thing a SCREENSHOT cannot tell you. CLAUDE.md's
  // A2 gotcha states the rule ("a squeezed layout and an overflowing one look
  // identical in a screenshot — re-measure scrollWidth vs clientWidth after any
  // stacking change") and the harness never implemented it, so every check was
  // a manual side-run. `overflowPx > 0` means the page scrolls sideways.
  // Elements inside a legitimate overflow-x:auto scroller (the tool tab bar)
  // do NOT count — only the DOCUMENT's own scroll width does.
  const layout = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  const overflowPx = Math.max(0, layout.scrollW - layout.clientW);
  // Cycle 25 F69 — the two layout failures overflowPx cannot see.
  // (1) VERTICAL RUNAWAY (F67): a visually hidden `position:absolute` element
  //     with no positioned ancestor inside its scroller escaped it and made the
  //     page 8,245px tall for a 900px window — no sideways scroll, no console
  //     error, just blank pixels. Measured as the document's scroll height past
  //     the bottom of everything VISIBLY laid out; a visually hidden box (a clip,
  //     or under 2px a side) is excluded, because it is exactly the escapee.
  // (2) SQUEEZED TEXT (F68): an unshrinkable sibling squeezed a card's
  //     `min-width: 0` text column to 22px at 390px. Any element that holds a
  //     real run of text (16+ characters of its own) laid out narrower than a
  //     word is reported.
  const shape = await page.evaluate(() => {
    const vh = window.innerHeight;
    let bottom = 0;
    const narrow = [];
    const all = document.body ? document.body.getElementsByTagName('*') : [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if ((cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*(50|100)%/.test(cs.clipPath))) continue;
      if (cs.position === 'fixed') continue;   // fixed chrome never extends the document
      bottom = Math.max(bottom, r.bottom + window.scrollY);
      let own = '';
      for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.nodeValue;
      own = own.replace(/\s+/g, ' ').trim();
      // SVG <text> is drawn, not laid out in a column — a scaled-down diagram's labels are not squeezed text.
      if (own.length >= 16 && r.width < 48 && cs.display !== 'inline' && !(el instanceof SVGElement) && r.right > 0 && r.left < window.innerWidth) {
        narrow.push({ tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
          w: Math.round(r.width), text: own.slice(0, 24) });
      }
    }
    const scrollH = document.documentElement.scrollHeight;
    return { runaway: Math.max(0, Math.round(scrollH - Math.max(bottom, vh))), scrollH, narrow: narrow.slice(0, 5) };
  });
  report.push({
    name, view, missing,
    viewport: vp.width + 'x' + vp.height,
    overflowPx,
    verticalRunawayPx: shape.runaway,
    narrowText: shape.narrow,
    errors: Array.from(new Set(errors)).slice(0, 8),
  });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
const overflowing = report.filter((r) => r.overflowPx > 0);
if (overflowing.length) {
  console.log('\nHORIZONTAL OVERFLOW (the page scrolls sideways — measure, do not eyeball):');
  overflowing.forEach((r) => console.log('  ' + r.name + '  +' + r.overflowPx + 'px @ ' + r.viewport));
}
// F69: a page taller than its content by more than this is a runaway, not a
// margin — ONE constant, the CI gate's.
const RUNAWAY_PX = gate.RUNAWAY_PX;
const runaway = report.filter((r) => r.verticalRunawayPx > RUNAWAY_PX);
if (runaway.length) {
  console.log('\nVERTICAL RUNAWAY (the page scrolls past its content — an escaped absolute element?):');
  runaway.forEach((r) => console.log('  ' + r.name + '  +' + r.verticalRunawayPx + 'px blank @ ' + r.viewport));
}
const squeezed = report.filter((r) => r.narrowText.length);
if (squeezed.length) {
  console.log('\nSQUEEZED TEXT (a text column laid out narrower than a word):');
  squeezed.forEach((r) => console.log('  ' + r.name + ' @ ' + r.viewport + '  ' + r.narrowText.map((n) => n.tag + ' ' + n.w + 'px "' + n.text + '"').join(' · ')));
}
const fixtureGaps = report.filter((r) => r.missing.length);
if (fixtureGaps.length) {
  console.log('\nMISSING FIXTURES (these scenarios rendered a LOADER, not the real view):');
  fixtureGaps.forEach((r) => console.log('  ' + r.name + '  ' + r.missing.join(', ')));
}
if (CI) {
  const v = gate.ciVerdict(report, gate.CI_SCENARIOS, gate.KNOWN);
  console.log('\nCI GATE (' + gate.CI_SCENARIOS.length + ' scenarios): ' + (v.ok ? 'PASS' : 'FAIL'));
  v.failures.forEach((f) => console.log('  ' + f.scenario + '  ' + f.kind + '  ' + f.detail));
  v.stale.forEach((k) => console.log('  KNOWN entry no longer fires — remove it from ci-gate.cjs: ' + k.scenario + ' ' + k.kind));
  v.unshot.forEach((n) => console.log('  not shot: ' + n));
  if (!v.ok) process.exit(1);
}
