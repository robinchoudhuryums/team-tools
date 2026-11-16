/* The handbook app's training reminder emails (HB3.4, operator 2026-10-29:
 * "build them, off").
 *
 * OFF until the operator turns them on, in two steps: set the Script Property
 * HANDBOOK_REMINDERS to `on`, and run `installHandbookReminders` once from the
 * Apps Script editor (it installs ONE daily trigger, 8am in the project's
 * timezone, replacing any earlier one). While the property is anything but
 * `on`, the daily run sends nothing and says so.
 *
 * A run emails each reader who has an OVERDUE plan — one email per person per
 * day at most (HANDBOOK_REMINDERS_LAST records who was sent one today), the
 * plans' titles and due dates, and a link to the handbook. The email carries no
 * quiz answers and nothing typed by the reader. It counts against the deploying
 * account's daily email allowance, which Team Tools shares while the app runs
 * as the same account (HB7.1 moves it).
 *
 * Cycle 26 F54: every run ends by recording what it did in
 * HANDBOOK_REMINDERS_OUTCOME (a trigger's return value reaches nobody), which
 * Team progress shows; the sent list is written as the run goes, in pieces a
 * Script Property can hold; one run at a time; and the link is the app's
 * /exec address (HANDBOOK_URL overrides it).
 *
 * Both functions are reachable by google.script.run (no trailing `_` — g143),
 * so both REFUSE any caller but the owner: under "Execute as me" the effective
 * user is always the deployer, and the active user is the person calling — the
 * same address only for the owner, or for a trigger the owner installed (g26). */

const HB_REMINDERS_PROP = 'HANDBOOK_REMINDERS';
const HB_REMINDERS_LAST_PROP = 'HANDBOOK_REMINDERS_LAST';
const HB_REMINDERS_OUTCOME_PROP = 'HANDBOOK_REMINDERS_OUTCOME';
const HB_REMINDERS_RUNNING_PROP = 'HANDBOOK_REMINDERS_RUNNING';
const HB_URL_PROP = 'HANDBOOK_URL';
const HB_REMINDERS_HANDLER = 'hbSendTrainingReminders';
const HB_REMINDERS_HOUR = 8;
const HB_REMINDERS_PIECE = 8000;       // characters of addresses per property — a value holds about 9 KB (g07)
const HB_REMINDERS_PIECES_MAX = 20;    // so the day's list holds about 160 KB of addresses; past it the run says so
const HB_REMINDERS_SAVE_EVERY = 25;    // the sent list is written after this many emails, and at the end
const HB_REMINDERS_LEASE_MS = 900000;  // a run's claim, fifteen minutes — longer than a run can last

/** Are reminder emails on? Only the exact word `on`. */
function hbRemindersOn_() {
  return String(PropertiesService.getScriptProperties().getProperty(HB_REMINDERS_PROP) || '').trim().toLowerCase() === 'on';
}
/** The owner, or a trigger the owner installed — never another reader. */
function hbOwnerCall_() {
  let active = '', effective = '';
  try { active = hbEmail_(Session.getActiveUser().getEmail()); } catch (e) { active = ''; }
  try { effective = hbEmail_(Session.getEffectiveUser().getEmail()); } catch (e) { effective = ''; }
  return !!active && active === effective;
}
/** PURE — who to email today: each person with an overdue plan, unless they
 *  were already emailed today. `overdue` maps email → [plans]; `last` maps
 *  email → the day they were last sent one. */
function hbReminderPicks_(overdue, last, today) {
  return Object.keys(overdue || {}).filter(function (e) { return (overdue[e] || []).length && (last || {})[e] !== today; }).sort();
}
/** PURE — the email's HTML: escaped plan titles and due dates, and the link. */
function hbReminderHtml_(name, plans, url) {
  const rows = plans.map(function (p) {
    return '<li><b>' + esc_(p.title) + '</b>' + (p.due ? ' — due ' + esc_(p.due) : '') + ' (' + p.done + ' of ' + p.total + ' done)</li>';
  }).join('');
  return '<p>Hi ' + esc_(name) + ',</p><p>Your handbook training is overdue:</p><ul>' + rows + '</ul>' +
    (url ? '<p><a href="' + esc_(url) + '">Open the handbook</a> → Training.</p>' : '<p>Open the handbook → Training.</p>') +
    '<p style="color:#666;font-size:12px">An automatic reminder from the UMS Handbook.</p>';
}
/** PURE — the address a reader can open: the HANDBOOK_URL property when it is
 *  an https address, else the service's own with a head (`/dev`) ending made
 *  the deployed one — a /dev link opens only for the project's editors. */
function hbAppUrl_(prop, serviceUrl) {
  const p = String(prop || '').trim();
  if (/^https:\/\/\S+$/.test(p)) return p;
  return String(serviceUrl || '').trim().replace(/\/dev$/, '/exec');
}
/** PURE — the day's sent list as the pieces to store: [] when it will not fit
 *  in `maxPieces`. Addresses hold no comma, so they join with one. */
function hbReminderPieces_(emails, pieceChars, maxPieces) {
  const pieces = [];
  let cur = '';
  (emails || []).forEach(function (e) {
    if (cur && cur.length + 1 + e.length > pieceChars) { pieces.push(cur); cur = ''; }
    cur = cur ? cur + ',' + e : e;
  });
  if (cur) pieces.push(cur);
  return pieces.length > maxPieces ? [] : pieces;
}
/** Who was sent a reminder on `today`: { email: today }. The head property is
 *  {day, pieces}; a list from another day, or one that will not read, is
 *  nobody. An older deploy's {email: day} map is read as it was. */
function hbRemindersLast_(props, today) {
  const out = {};
  let head = null;
  try { head = JSON.parse(props.getProperty(HB_REMINDERS_LAST_PROP) || 'null'); } catch (e) { head = null; }
  if (!head || typeof head !== 'object') return out;
  if (typeof head.day !== 'string') {   // the shape before F54
    Object.keys(head).forEach(function (e) { if (head[e] === today) out[e] = today; });
    return out;
  }
  if (head.day !== today) return out;
  for (let i = 1; i <= (Number(head.pieces) || 0); i++) {
    String(props.getProperty(HB_REMINDERS_LAST_PROP + '_' + i) || '').split(',').forEach(function (e) { if (e) out[e] = today; });
  }
  return out;
}
/** Record who has been sent one today. true when stored; false when the list
 *  is too long to keep or a write failed (the outcome then says a second run
 *  today could email people again). Pieces first, the head last, so a head
 *  never names a piece that is not there. */
function hbRemindersLastSave_(props, today, emails) {
  const pieces = hbReminderPieces_(emails, HB_REMINDERS_PIECE, HB_REMINDERS_PIECES_MAX);
  if (emails.length && !pieces.length) return false;
  try {
    let before = 0;
    try { const h = JSON.parse(props.getProperty(HB_REMINDERS_LAST_PROP) || 'null'); before = h && typeof h.day === 'string' ? Number(h.pieces) || 0 : 0; } catch (e) { before = 0; }
    pieces.forEach(function (p, i) { props.setProperty(HB_REMINDERS_LAST_PROP + '_' + (i + 1), p); });
    props.setProperty(HB_REMINDERS_LAST_PROP, JSON.stringify({ day: today, pieces: pieces.length }));
    for (let i = pieces.length + 1; i <= before; i++) props.deleteProperty(HB_REMINDERS_LAST_PROP + '_' + i);
    return true;
  } catch (e) {
    console.warn('Could not record the reminders sent: ' + e.message);
    return false;
  }
}
/** The last run's outcome, for Team progress: {} when none is on record. */
function hbRemindersOutcome_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(HB_REMINDERS_OUTCOME_PROP) || '{}') || {}; } catch (e) { return {}; }
}
/** Record a run's outcome and hand it back. Best-effort: a property that
 *  cannot be written must not hide what the run did from the editor's log. */
function hbRemindersStamp_(props, out) {
  const rec = Object.assign({ at: Date.now() }, out);
  try { props.setProperty(HB_REMINDERS_OUTCOME_PROP, JSON.stringify(rec).slice(0, 8000)); } catch (e) { console.warn('Could not record the reminder run: ' + e.message); }
  return out;
}

/** The daily run (the trigger's handler). Owner-only; sends nothing while
 *  reminders are off. Every path past the owner check records its outcome
 *  (F54): status ok | partial | failed | off, with the counts and the reason
 *  — and `running` from its start, which is what a run cut off leaves behind. */
function hbSendTrainingReminders() {
  if (!hbOwnerCall_()) return { error: 'Only the handbook\'s owner can run this.' };
  const props = PropertiesService.getScriptProperties();
  if (!hbRemindersOn_()) return hbRemindersStamp_(props, { status: 'off', skipped: 'Reminders are off — set ' + HB_REMINDERS_PROP + ' to on.' });
  // One run at a time: a claim taken under the lock, held past it. Two runs at
  // once (the trigger and a press in the editor) each read the sent list
  // before the other wrote it, and emailed everyone twice.
  let claimed = false, claim;
  try {
    claim = hbWithLock_(function () {
      const until = Number(props.getProperty(HB_REMINDERS_RUNNING_PROP)) || 0;
      if (until > Date.now()) return { success: false, running: true };
      props.setProperty(HB_REMINDERS_RUNNING_PROP, String(Date.now() + HB_REMINDERS_LEASE_MS));
      return { success: true };
    });
  } catch (err) { claim = { success: false, error: 'The run could not be started: ' + String(err && err.message || err) }; }
  if (!claim.success) {
    // The other run records its own outcome; this one must not write over it.
    return claim.running ? { skipped: 'Another reminder run is in progress.' } : hbRemindersStamp_(props, { status: 'failed', error: claim.error });
  }
  claimed = true;
  // A run the platform cuts off records nothing more, so it says it started.
  hbRemindersStamp_(props, { status: 'running' });
  try {
    const st = hbStore_();
    if (st.error) return hbRemindersStamp_(props, { status: 'failed', error: st.error });
    const people = hbPeopleRead_(st.ss, false), admins = hbAdmins_(), plans = hbPlanRows_(st.ss).rows;
    const ctx = hbProgressCtx_(st.ss);
    const overdue = {};
    people.forEach(function (p) {
      const late = hbPlansFor_(plans, people, admins, p.email).map(function (pl) { return hbPlanProgress_(ctx, pl, p.email); })
        .filter(function (pl) { return pl.overdue; });
      if (late.length) overdue[p.email] = late;
    });
    const last = hbRemindersLast_(props, ctx.today);
    const picks = hbReminderPicks_(overdue, last, ctx.today);
    let service = '';
    try { service = ScriptApp.getService().getUrl() || ''; } catch (e) { service = ''; }
    const url = hbAppUrl_(props.getProperty(HB_URL_PROP), service);
    let sent = 0, firstError = '', saved = true;
    const failed = [];
    const save = function () { saved = hbRemindersLastSave_(props, ctx.today, Object.keys(last).sort()) && saved; };
    picks.forEach(function (email) {
      try {
        MailApp.sendEmail({ to: email, subject: 'Handbook training overdue', htmlBody: hbReminderHtml_(hbNameOf_(email), overdue[email], url) });
        last[email] = ctx.today; sent++;
        if (sent % HB_REMINDERS_SAVE_EVERY === 0) save();   // a run that is cut off has still recorded these
      } catch (err) {
        failed.push(email);
        if (!firstError) firstError = String(err && err.message || err);
        console.warn('Reminder to one reader failed: ' + err.message);
      }
    });
    if (sent) save();
    const out = { status: failed.length || !saved ? (sent || !failed.length ? 'partial' : 'failed') : 'ok',
      sent: sent, failed: failed.length, overdue: Object.keys(overdue).length };
    if (firstError) out.error = firstError;
    if (!saved) out.notRecorded = true;   // who was sent one today could not be kept: a second run today may email them again
    return hbRemindersStamp_(props, out);
  } catch (err) {
    return hbRemindersStamp_(props, { status: 'failed', error: String(err && err.message || err) });
  } finally {
    if (claimed) { try { props.deleteProperty(HB_REMINDERS_RUNNING_PROP); } catch (e) {} }
  }
}

/** Install the daily trigger (run once from the editor, as the owner). Any
 *  earlier trigger for the handler is replaced, so running it twice is safe. */
function installHandbookReminders() {
  if (!hbOwnerCall_()) return { error: 'Only the handbook\'s owner can run this.' };
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === HB_REMINDERS_HANDLER) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger(HB_REMINDERS_HANDLER).timeBased().everyDays(1).atHour(HB_REMINDERS_HOUR).create();
  return { installed: true, on: hbRemindersOn_() };
}
