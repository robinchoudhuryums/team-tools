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
 * day at most (HANDBOOK_REMINDERS_LAST records the day each was last sent), the
 * plans' titles and due dates, and a link to the handbook. The email carries no
 * quiz answers and nothing typed by the reader. It counts against the deploying
 * account's daily email allowance, which Team Tools shares while the app runs
 * as the same account (HB7.1 moves it).
 *
 * Both functions are reachable by google.script.run (no trailing `_` — g143),
 * so both REFUSE any caller but the owner: under "Execute as me" the effective
 * user is always the deployer, and the active user is the person calling — the
 * same address only for the owner, or for a trigger the owner installed (g26). */

const HB_REMINDERS_PROP = 'HANDBOOK_REMINDERS';
const HB_REMINDERS_LAST_PROP = 'HANDBOOK_REMINDERS_LAST';
const HB_REMINDERS_HANDLER = 'hbSendTrainingReminders';
const HB_REMINDERS_HOUR = 8;

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
 *  were already emailed today. `overdue` maps email → [plans]. */
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

/** The daily run (the trigger's handler). Owner-only; sends nothing while
 *  reminders are off. Returns what it did, for the editor's log. */
function hbSendTrainingReminders() {
  if (!hbOwnerCall_()) return { error: 'Only the handbook\'s owner can run this.' };
  if (!hbRemindersOn_()) return { skipped: 'Reminders are off — set ' + HB_REMINDERS_PROP + ' to on.' };
  const st = hbStore_();
  if (st.error) return { error: st.error };
  const props = PropertiesService.getScriptProperties();
  let last = {};
  try { last = JSON.parse(props.getProperty(HB_REMINDERS_LAST_PROP) || '{}') || {}; } catch (e) { last = {}; }
  const people = hbPeopleRead_(st.ss, false), admins = hbAdmins_(), plans = hbPlanRows_(st.ss).rows;
  const ctx = hbProgressCtx_(st.ss);
  const overdue = {};
  people.forEach(function (p) {
    const late = hbPlansFor_(plans, people, admins, p.email).map(function (pl) { return hbPlanProgress_(ctx, pl, p.email); })
      .filter(function (pl) { return pl.overdue; });
    if (late.length) overdue[p.email] = late;
  });
  const picks = hbReminderPicks_(overdue, last, ctx.today);
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  let sent = 0;
  const failed = [];
  picks.forEach(function (email) {
    try {
      MailApp.sendEmail({ to: email, subject: 'Handbook training overdue', htmlBody: hbReminderHtml_(hbNameOf_(email), overdue[email], url) });
      last[email] = ctx.today; sent++;
    } catch (err) { failed.push(email); console.warn('Reminder to one reader failed: ' + err.message); }
  });
  // Only the people still on the list are kept, so the property stays small.
  const keep = {};
  Object.keys(last).forEach(function (e) { if (overdue[e]) keep[e] = last[e]; });
  try { props.setProperty(HB_REMINDERS_LAST_PROP, JSON.stringify(keep)); } catch (e) { console.warn('Could not record the reminders sent: ' + e.message); }
  return { sent: sent, failed: failed.length, overdue: Object.keys(overdue).length };
}

/** Install the daily trigger (run once from the editor, as the owner). Any
 *  earlier trigger for the handler is replaced, so running it twice is safe. */
function installHandbookReminders() {
  if (!hbOwnerCall_()) return { error: 'Only the handbook\'s owner can run this.' };
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === HB_REMINDERS_HANDLER) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger(HB_REMINDERS_HANDLER).timeBased().everyDays(1).atHour(HB_REMINDERS_HOUR).create();
  return { installed: true, on: hbRemindersOn_() };
}
