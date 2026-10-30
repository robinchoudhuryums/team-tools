/* The handbook app's training plans and team quizzes (HB3.3, operator plan
 * 2026-10-28; operator answers 2026-10-29).
 *
 * A MANAGER (a People row the admin marks) or the ADMIN writes their own
 * quizzes and builds training PLANS: chapters, sections and quizzes, with a
 * due date, assigned to people and/or departments. A reader sees the plans
 * assigned to them under My training, with their progress.
 *
 * The rules the operator chose:
 *   - A chapter or section item is done when the READER marks it read (HB3.4
 *     adds the versioned sign-off). A quiz item is done when it is passed.
 *   - A manager's department assignment reaches their OWN confirmed team in
 *     that department; the admin's reaches everyone in it. People named one by
 *     one are, likewise, the manager's own team (anyone, for the admin).
 *   - A manager's quiz is seen only by the people a live plan assigns it to,
 *     its author and the admin — the Quizzes list stays the official ones for
 *     everyone else.
 * Recipients are resolved at READ time from the author's current team, so a
 * new team member in a department picks up its plans, and someone who moves
 * team stops receiving the old manager's.
 *
 * THE STORE is the Handbook spreadsheet (People.js); only this project writes
 * it, under its own lock. Three tabs, each row's body one JSON cell (a title or
 * a due date never coerces — g144/g13):
 *   TeamQuizzes [Id, Author, QuizJson, UpdatedMs, Status]   live | archived
 *   Plans       [Id, Author, PlanJson, UpdatedMs, Status]   live | archived
 *   ReadMarks   [AtMs, Email, ItemKey, Done, Version]       append-only; the
 *               latest mark per (reader, item) wins; Done is yes / no (g09).
 *               Since HB3.4 a mark IS the sign-off ("I've read this"): it
 *               records the section's version (its body's stamp), and a change
 *               the changelog flags for retraining, dated after it, asks the
 *               reader to sign again — until they do, the item is not done.
 * A team quiz's answer key stays on the server like an official one's
 * (quizStripQuestion_); its author and the admin see it in the editor. */

const HB_TEAM_QUIZZES_TAB = 'TeamQuizzes';
const HB_TEAM_QUIZZES_HEADERS = ['Id', 'Author', 'QuizJson', 'UpdatedMs', 'Status'];
const HB_PLANS_TAB = 'Plans';
const HB_PLANS_HEADERS = ['Id', 'Author', 'PlanJson', 'UpdatedMs', 'Status'];
const HB_READS_TAB = 'ReadMarks';
const HB_READS_HEADERS = ['AtMs', 'Email', 'ItemKey', 'Done', 'Version'];   // HB3.4: the version signed
const HB_TEAM_QUIZ_ID_RE = /^tq-[a-z0-9]{8,24}$/;
const HB_PLAN_ID_RE = /^pl-[a-z0-9]{8,24}$/;
const HB_QUIZ_ID_RE = /^(?:q-[a-z0-9]+(?:-[a-z0-9]+)*|tq-[a-z0-9]{8,24})$/;   // an official or a team quiz
const HB_PLAN_ITEMS_MAX = 50;
const HB_PLAN_PEOPLE_MAX = 300;
const HB_PLAN_TITLE_MAX = 120;
const HB_ITEM_KINDS = ['chapter', 'section', 'quiz'];
const HB_MANAGER_REFUSAL = 'Handbook manager access required.';

// ── Pure helpers ─────────────────────────────────────────────────────────

/** PURE — a TeamQuizzes or Plans tab's rows as records; a row whose id or
 *  JSON will not read is counted, never served half-read. */
function hbJsonRows_(values, idRe) {
  const out = [];
  let unreadable = 0;
  (values || []).slice(1).forEach(function (r, i) {
    const id = String(r[0] || '').trim();
    if (!id) return;
    let body = null;
    try { body = JSON.parse(String(r[2] || '')); } catch (e) { body = null; }
    if (!idRe.test(id) || !body || typeof body !== 'object') { unreadable++; return; }
    out.push({ row: i + 2, id: id, author: hbEmail_(r[1]), body: body, updatedMs: Number(r[3]) || 0, live: String(r[4] || '').toLowerCase() !== 'archived' });
  });
  return { rows: out, unreadable: unreadable };
}
/** PURE — the key a reading mark and a plan item share. */
function hbItemKey_(kind, id) { return kind + ':' + id; }
/** PURE — the latest mark per (reader, item): { 'email|key': {ms, done,
 *  version} } — the sign-offs (HB3.4). */
function hbSignMarks_(values) {
  const latest = {};
  (values || []).slice(1).forEach(function (r) {
    const ms = Number(r[0]), email = hbEmail_(r[1]), key = String(r[2] || '');
    if (!email || !key || !(ms > 0)) return;
    const k = email + '|' + key;
    if (!latest[k] || ms >= latest[k].ms) latest[k] = { ms: ms, done: String(r[3] || '').toLowerCase() === 'yes', version: String(r[4] == null ? '' : r[4]) };
  });
  return latest;
}
/** PURE — the latest retraining change to any of `ids` (section ids), from
 *  the handbook's changelog: its date (YYYY-MM-DD) or ''. */
function hbRetrainDate_(changelog, ids) {
  const want = {};
  (ids || []).forEach(function (id) { want[id] = 1; });
  let latest = '';
  (Array.isArray(changelog) ? changelog : []).forEach(function (c) {
    if (!c || c.retraining !== true || !want[c.id] || !/^\d{4}-\d{2}-\d{2}$/.test(String(c.date || ''))) return;
    if (c.date > latest) latest = c.date;
  });
  return latest;
}
/** PURE — where a sign-off stands: 'unsigned' (none, or withdrawn), 'resign'
 *  (a change flagged for retraining is dated AFTER the day it was signed), or
 *  'signed'. A change not flagged for retraining never asks again. */
function hbSignState_(mark, signedDay, retrainDate) {
  if (!mark || !mark.done) return 'unsigned';
  return retrainDate && retrainDate > signedDay ? 'resign' : 'signed';
}
/** PURE — the people an author may assign to: an admin, everyone; a manager
 *  (still a manager), their confirmed team; anyone else, nobody. */
function hbAuthorTeam_(people, author, isAdmin) {
  if (isAdmin) return people.slice();
  const managers = {};
  people.forEach(function (p) { if (p.role === 'manager') managers[p.email] = true; });
  if (!managers[author]) return [];
  return people.filter(function (p) { return p.manager === author && hbStanding_(p, managers) === 'confirmed'; });
}
/** PURE — who a plan reaches now: the author's team (above), narrowed to the
 *  people it names and the departments it names. */
function hbPlanRecipients_(plan, team) {
  const named = {}, depts = {};
  ((plan.assign && plan.assign.people) || []).forEach(function (e) { named[e] = 1; });
  ((plan.assign && plan.assign.departments) || []).forEach(function (d) { depts[d] = 1; });
  return team.filter(function (p) { return named[p.email] || (p.department && depts[p.department]); }).map(function (p) { return p.email; });
}
/** PURE — a plan, checked and normalized: { plan } or { error }. `ctx` names
 *  what may be used: departments (a list), sectionIds and quizIds (id → 1
 *  maps), team (the emails the author may assign) and the time now. */
function hbPlanValidate_(def, ctx) {
  def = def || {};
  const title = String(def.title || '').trim();
  if (!title || title.length > HB_PLAN_TITLE_MAX) return { error: 'A plan needs a title (' + HB_PLAN_TITLE_MAX + ' characters at most).' };
  const due = String(def.due || '').trim();
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: 'The due date must be a date.' };
  if (!Array.isArray(def.items) || !def.items.length || def.items.length > HB_PLAN_ITEMS_MAX) return { error: 'A plan needs 1–' + HB_PLAN_ITEMS_MAX + ' items.' };
  const items = [], seen = {};
  for (let i = 0; i < def.items.length; i++) {
    const it = def.items[i] || {};
    const kind = String(it.kind || ''), id = String(it.id || '').trim();
    if (HB_ITEM_KINDS.indexOf(kind) < 0) return { error: 'Item ' + (i + 1) + ': not a chapter, section or quiz.' };
    const ok = kind === 'chapter' ? ctx.departments.indexOf(id) >= 0 : kind === 'section' ? !!ctx.sectionIds[id] : !!ctx.quizIds[id];
    if (!ok) return { error: 'Item ' + (i + 1) + ': that ' + kind + ' is not one you can assign.' };
    const key = hbItemKey_(kind, id);
    if (seen[key]) continue;
    seen[key] = 1;
    items.push({ kind: kind, id: id });
  }
  const a = def.assign || {};
  const team = {};
  (ctx.team || []).forEach(function (e) { team[e] = 1; });
  const people = [];
  const pIn = Array.isArray(a.people) ? a.people : [];
  if (pIn.length > HB_PLAN_PEOPLE_MAX) return { error: 'Assign to at most ' + HB_PLAN_PEOPLE_MAX + ' people by name — or assign a department.' };
  for (let j = 0; j < pIn.length; j++) {
    const e = hbEmail_(pIn[j]);
    if (!e || !team[e]) return { error: 'You can only assign this plan to your own confirmed team.' };
    if (people.indexOf(e) < 0) people.push(e);
  }
  const departments = [];
  const dIn = Array.isArray(a.departments) ? a.departments : [];
  for (let k = 0; k < dIn.length; k++) {
    const d = String(dIn[k] || '').trim();
    if (ctx.departments.indexOf(d) < 0) return { error: 'A department in the assignment is not a chapter of the handbook.' };
    if (departments.indexOf(d) < 0) departments.push(d);
  }
  if (!people.length && !departments.length) return { error: 'Assign the plan to at least one person or department.' };
  return { plan: { title: title, due: due, items: items, assign: { people: people, departments: departments } } };
}
/** PURE — a team quiz, checked with the shared engine (any type; a section,
 *  when given, must be a published one; the explanation optional). */
function hbTeamQuizValidate_(def, sectionIds) {
  def = def || {};
  const v = quizValidate_(def, { types: QUIZ_TYPES });
  if (!v.ok) return { error: v.error };
  for (let i = 0; i < v.quiz.questions.length; i++) {
    const s = v.quiz.questions[i].section;
    if (s && !sectionIds[s]) return { error: 'Question ' + (i + 1) + ': that section is not in the handbook.' };
  }
  if (JSON.stringify(v.quiz).length > TRAIN_QUIZ_JSON_MAX) return { error: 'The quiz is too large to store.' };
  return { quiz: v.quiz };
}
/** PURE — today in the app's timezone, YYYY-MM-DD, from fmtDate_'s output. */
function hbPlanOverdue_(due, todayIso, allDone) { return !!due && !allDone && due < todayIso; }

// ── Reads ────────────────────────────────────────────────────────────────

function hbTrainTabValues_(ss, name, width) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, sheet.getLastRow(), width).getValues();
}
function hbTeamQuizRows_(ss) { return hbJsonRows_(hbTrainTabValues_(ss, HB_TEAM_QUIZZES_TAB, HB_TEAM_QUIZZES_HEADERS.length), HB_TEAM_QUIZ_ID_RE); }
function hbPlanRows_(ss) { return hbJsonRows_(hbTrainTabValues_(ss, HB_PLANS_TAB, HB_PLANS_HEADERS.length), HB_PLAN_ID_RE); }
function hbSignOffs_(ss) { return hbSignMarks_(hbTrainTabValues_(ss, HB_READS_TAB, HB_READS_HEADERS.length)); }
/** The published handbook: its chapters, its sections (id → title), and
 *  each section's and chapter's VERSION — the stamp of its text (HB3.4). */
function hbPublished_() {
  const res = getManualParts();
  if (!res || res.error || !Array.isArray(res.parts)) throw new Error('Could not read the handbook\'s chapters' + (res && res.error ? ': ' + res.error : '') + '.');
  const out = { departments: [], sectionIds: {}, sectionTitle: {}, version: {}, chapterSections: {} };
  res.parts.forEach(function (p) {
    if (!p || !p.department) return;
    const dept = String(p.department), ids = [];
    out.departments.push(dept);
    (p.sections || []).forEach(function (s) {
      out.sectionIds[s.id] = 1; out.sectionTitle[s.id] = String(s.title || '');
      out.version[hbItemKey_('section', s.id)] = hbStamp_(String(s.bodyMd || ''));
      ids.push(s.id);
    });
    out.chapterSections[dept] = ids;
    out.version[hbItemKey_('chapter', dept)] = hbStamp_(ids.map(function (id) { return out.version[hbItemKey_('section', id)]; }).join('|'));
  });
  return out;
}
/** Everything an item's progress is read from, for one request. */
function hbProgressCtx_(ss) {
  const meta = getManualMeta();
  const titles = {};
  hbQuizzes_().quizzes.forEach(function (q) { titles[q.id] = q.title; });
  hbTeamQuizRows_(ss).rows.forEach(function (r) { titles[r.id] = String(r.body.title || ''); });
  return { pub: hbPublished_(), changelog: meta && !meta.error && Array.isArray(meta.changelog) ? meta.changelog : [],
    marks: hbSignOffs_(ss), attempts: hbQuizAttempts_(ss), resets: hbQuizResets_(ss), titles: titles, now: Date.now(), today: fmtDate_(new Date()) };
}
/** One reader's sign-off on one reading item: { state, signedMs, version }. */
function hbSignOf_(ctx, email, kind, id) {
  const key = hbItemKey_(kind, id);
  const mark = ctx.marks[email + '|' + key] || null;
  const ids = kind === 'chapter' ? (ctx.pub.chapterSections[id] || []) : [id];
  const signedDay = mark ? fmtDate_(new Date(mark.ms)) : '';
  return { state: hbSignState_(mark, signedDay, hbRetrainDate_(ctx.changelog, ids)), signedMs: mark && mark.done ? mark.ms : 0,
    changed: !!(mark && mark.done && mark.version && ctx.pub.version[key] && mark.version !== ctx.pub.version[key]) };
}
/** A plan's items for one reader: each with whether it is done (a reading item
 *  signed and not asked again; a quiz passed), the progress, and overdue. */
function hbPlanProgress_(ctx, plan, email) {
  const items = (plan.body.items || []).map(function (it) {
    const key = hbItemKey_(it.kind, it.id);
    if (it.kind === 'quiz') {
      const s = hbQuizStanding_(ctx.attempts, ctx.resets, email, it.id, ctx.now);
      return { kind: 'quiz', id: it.id, key: key, title: ctx.titles[it.id] || '', missing: !ctx.titles[it.id], done: s.passed, quiz: s };
    }
    const so = hbSignOf_(ctx, email, it.kind, it.id);
    return { kind: it.kind, id: it.id, key: key, done: so.state === 'signed', sign: so };
  });
  const n = items.filter(function (i) { return i.done; }).length;
  const due = String(plan.body.due || '');
  return { id: plan.id, title: String(plan.body.title || ''), author: plan.author, authorName: hbNameOf_(plan.author), due: due,
    items: items, done: n, total: items.length, overdue: hbPlanOverdue_(due, ctx.today, n === items.length) };
}
/** A team quiz record as the quiz engine's shape. */
function hbTeamQuizOf_(r) {
  const b = r.body;
  return { id: r.id, title: String(b.title || ''), section: '', anchor: '', passPct: Math.round(Number(b.passPct)) || 0,
    questions: Array.isArray(b.questions) ? b.questions : [], team: true, author: r.author, authorName: hbNameOf_(r.author) };
}
/** Live plans that reach `email` now. */
function hbPlansFor_(plans, people, admins, email) {
  return plans.filter(function (p) { return p.live; }).filter(function (p) {
    const team = hbAuthorTeam_(people, p.author, admins.indexOf(p.author) >= 0);
    return hbPlanRecipients_(p.body, team).indexOf(email) >= 0;
  });
}
/** The team quizzes `email` may see and take: their own, every one for an
 *  admin, and any a live plan assigns them. Archived ones are never offered. */
function hbTeamQuizzesVisible_(ss, email) {
  const tq = hbTeamQuizRows_(ss).rows.filter(function (r) { return r.live; });
  if (!tq.length) return [];
  const admins = hbAdmins_();
  if (admins.indexOf(email) >= 0) return tq.map(hbTeamQuizOf_);
  const assigned = {};
  hbPlansFor_(hbPlanRows_(ss).rows, hbPeopleRead_(ss, false), admins, email).forEach(function (p) {
    (p.body.items || []).forEach(function (it) { if (it.kind === 'quiz') assigned[it.id] = 1; });
  });
  return tq.filter(function (r) { return r.author === email || assigned[r.id]; }).map(hbTeamQuizOf_);
}
/** The caller as an author: { emp, ss, isAdmin, people } or { error } —
 *  a manager (still marked) or an admin. Checked before any lock (g17). */
function hbAuthorCall_() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  const st = hbStore_();
  if (st.error) return { error: st.error };
  const isAdmin = hbAdmins_().indexOf(emp.email) >= 0;
  const people = hbPeopleRead_(st.ss, false);
  const isManager = people.some(function (p) { return p.email === emp.email && p.role === 'manager'; });
  if (!isAdmin && !isManager) return { error: HB_MANAGER_REFUSAL };
  return { emp: emp, ss: st.ss, isAdmin: isAdmin, people: people };
}
/** Write a JSON-bodied record: in place when it has a row, appended when new
 *  (the tab created with its header). The caller holds the lock. */
function hbTrainWrite_(ss, name, headers, rec) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(sheetSafeRow_(headers)); }
  const row = [rec.id, rec.author, JSON.stringify(rec.body), rec.updatedMs, rec.live === false ? 'archived' : 'live'];
  if (rec.row) sheet.getRange(rec.row, 1, 1, row.length).setValues(sheetSafeRows_([row]));
  else sheet.appendRow(sheetSafeRow_(row));
}
function hbNewId_(prefix) { return prefix + String(Utilities.getUuid()).replace(/[^0-9a-f]/gi, '').slice(0, 12).toLowerCase(); }

// ── Public endpoints ─────────────────────────────────────────────────────

/** My training: the live plans that reach the reader now, each item with
 *  whether it is done (a chapter/section the reader signed off, not asked
 *  again since; a quiz passed), the progress, the due date and overdue. */
function hbMyTraining() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  let ss;
  try { ss = getHandbookSS_(); } catch (err) { return { error: 'Could not open the Handbook spreadsheet: ' + err.message }; }
  if (!ss) return { setUp: false, plans: [] };
  try {
    const admins = hbAdmins_(), people = hbPeopleRead_(ss, false);
    const plans = hbPlansFor_(hbPlanRows_(ss).rows, people, admins, emp.email);
    if (!plans.length) return { setUp: true, plans: [] };
    const ctx = hbProgressCtx_(ss);
    return { setUp: true, plans: plans.map(function (p) { return hbPlanProgress_(ctx, p, emp.email); }) };
  } catch (err) { return { error: err.message }; }
}

/** The reader signs off a chapter or section — "I've read this" — or
 *  withdraws it. Any signed-in reader; the item must be a published one.
 *  Appends a ReadMarks row with the version signed (HB3.4). */
function hbMarkRead(kind, id, done) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  if (kind !== 'chapter' && kind !== 'section') return { success: false, error: 'Only a chapter or a section is marked read.' };
  const st = hbStore_();
  if (st.error) return { success: false, error: st.error };
  let pub;
  try { pub = hbPublished_(); } catch (err) { return { success: false, error: err.message }; }
  const sid = String(id || '');
  if (kind === 'chapter' ? pub.departments.indexOf(sid) < 0 : !pub.sectionIds[sid]) return { success: false, error: 'That ' + kind + ' is not in the handbook.' };
  return hbWithLock_(function () {
    try {
      const key = hbItemKey_(kind, sid);
      hbQuizAppend_(st.ss, HB_READS_TAB, HB_READS_HEADERS, [Date.now(), emp.email, key, done === false ? 'no' : 'yes', pub.version[key] || '']);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Team training, for a manager or the admin: the quizzes they wrote (every
 *  one, for the admin) with their keys, the plans they built (every one, for
 *  the admin) with who each reaches now, the people they may assign, the
 *  published chapters, and the quizzes a plan may use. */
function hbTeamTraining() {
  const c = hbAuthorCall_();
  if (c.error) return { error: c.error };
  try {
    const mine = function (r) { return c.isAdmin || r.author === c.emp.email; };
    const tq = hbTeamQuizRows_(c.ss), pl = hbPlanRows_(c.ss);
    const admins = hbAdmins_();
    const team = hbAuthorTeam_(c.people, c.emp.email, c.isAdmin);
    return {
      isAdmin: c.isAdmin, unreadable: tq.unreadable + pl.unreadable,
      quizzes: tq.rows.filter(mine).map(function (r) {
        return { id: r.id, author: r.author, authorName: hbNameOf_(r.author), live: r.live, updatedMs: r.updatedMs, quiz: r.body };
      }),
      plans: pl.rows.filter(mine).map(function (r) {
        const t = hbAuthorTeam_(c.people, r.author, admins.indexOf(r.author) >= 0);
        return { id: r.id, author: r.author, authorName: hbNameOf_(r.author), live: r.live, updatedMs: r.updatedMs, plan: r.body,
          reaches: r.live ? hbPlanRecipients_(r.body, t).length : 0 };
      }),
      team: team.map(function (p) { return { email: p.email, name: hbNameOf_(p.email), department: p.department }; }),
      official: hbQuizzes_().quizzes.map(function (q) { return { id: q.id, title: q.title }; }),
    };
  } catch (err) { return { error: err.message }; }
}

/** Save a team quiz — a new one, or one the caller wrote (the admin: any). */
function hbSaveTeamQuiz(def) {
  const c = hbAuthorCall_();
  if (c.error) return { success: false, error: c.error };
  let pub;
  try { pub = hbPublished_(); } catch (err) { return { success: false, error: err.message }; }
  const v = hbTeamQuizValidate_(def, pub.sectionIds);
  if (v.error) return { success: false, error: v.error };
  const id = def && def.id ? String(def.id) : '';
  if (id && !HB_TEAM_QUIZ_ID_RE.test(id)) return { success: false, error: 'That is not a team quiz.' };
  return hbWithLock_(function () {
    try {
      let rec;
      if (id) {
        rec = hbTeamQuizRows_(c.ss).rows.filter(function (r) { return r.id === id; })[0];
        if (!rec) return { success: false, error: 'That quiz no longer exists.' };
        if (!c.isAdmin && rec.author !== c.emp.email) return { success: false, error: 'Only its author can change this quiz.' };
        rec = Object.assign({}, rec, { body: v.quiz, updatedMs: Date.now() });
      } else rec = { id: hbNewId_('tq-'), author: c.emp.email, body: v.quiz, updatedMs: Date.now(), live: true };
      hbTrainWrite_(c.ss, HB_TEAM_QUIZZES_TAB, HB_TEAM_QUIZZES_HEADERS, rec);
      return { success: true, id: rec.id };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Save a plan — a new one, or one the caller built (the admin: any). Items
 *  must be published chapters and sections, official quizzes, or team
 *  quizzes the caller wrote (the admin: any live one); people, the caller's
 *  own confirmed team (the admin: anyone). */
function hbSavePlan(def) {
  const c = hbAuthorCall_();
  if (c.error) return { success: false, error: c.error };
  let pub;
  try { pub = hbPublished_(); } catch (err) { return { success: false, error: err.message }; }
  const id = def && def.id ? String(def.id) : '';
  if (id && !HB_PLAN_ID_RE.test(id)) return { success: false, error: 'That is not a plan.' };
  return hbWithLock_(function () {
    try {
      const quizIds = {};
      hbQuizzes_().quizzes.forEach(function (q) { quizIds[q.id] = 1; });
      hbTeamQuizRows_(c.ss).rows.forEach(function (r) { if (r.live && (c.isAdmin || r.author === c.emp.email)) quizIds[r.id] = 1; });
      const people = hbPeopleRead_(c.ss, true);
      const team = hbAuthorTeam_(people, c.emp.email, c.isAdmin).map(function (p) { return p.email; });
      const v = hbPlanValidate_(def, { departments: pub.departments, sectionIds: pub.sectionIds, quizIds: quizIds, team: team });
      if (v.error) return { success: false, error: v.error };
      let rec;
      if (id) {
        rec = hbPlanRows_(c.ss).rows.filter(function (r) { return r.id === id; })[0];
        if (!rec) return { success: false, error: 'That plan no longer exists.' };
        if (!c.isAdmin && rec.author !== c.emp.email) return { success: false, error: 'Only its author can change this plan.' };
        rec = Object.assign({}, rec, { body: v.plan, updatedMs: Date.now() });
      } else rec = { id: hbNewId_('pl-'), author: c.emp.email, body: v.plan, updatedMs: Date.now(), live: true };
      hbTrainWrite_(c.ss, HB_PLANS_TAB, HB_PLANS_HEADERS, rec);
      return { success: true, id: rec.id, reaches: hbPlanRecipients_(v.plan, hbAuthorTeam_(people, rec.author, hbAdmins_().indexOf(rec.author) >= 0)).length };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Archive (or restore) a team quiz or a plan the caller wrote (the admin:
 *  any). An archived quiz is never offered; an archived plan reaches nobody.
 *  Attempts and read marks are kept. */
function hbArchiveTraining(kind, id, archived) {
  const c = hbAuthorCall_();
  if (c.error) return { success: false, error: c.error };
  const isQuiz = kind === 'quiz', sid = String(id || '');
  if (!(isQuiz ? HB_TEAM_QUIZ_ID_RE : HB_PLAN_ID_RE).test(sid)) return { success: false, error: 'That is not a ' + (isQuiz ? 'team quiz' : 'plan') + '.' };
  return hbWithLock_(function () {
    try {
      const rec = (isQuiz ? hbTeamQuizRows_(c.ss) : hbPlanRows_(c.ss)).rows.filter(function (r) { return r.id === sid; })[0];
      if (!rec) return { success: false, error: 'It no longer exists.' };
      if (!c.isAdmin && rec.author !== c.emp.email) return { success: false, error: 'Only its author can archive it.' };
      hbTrainWrite_(c.ss, isQuiz ? HB_TEAM_QUIZZES_TAB : HB_PLANS_TAB, isQuiz ? HB_TEAM_QUIZZES_HEADERS : HB_PLANS_HEADERS,
        Object.assign({}, rec, { live: archived === false, updatedMs: Date.now() }));
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** HB3.4 — the reader's own sign-offs, for the bar above the reader: every
 *  item they have signed (or been asked to sign again), by key. */
function hbMySignOffs() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  let ss;
  try { ss = getHandbookSS_(); } catch (err) { return { error: 'Could not open the Handbook spreadsheet: ' + err.message }; }
  if (!ss) return { setUp: false, signoffs: {} };
  try {
    const marks = hbSignOffs_(ss);
    const meta = getManualMeta();
    const ctx = { marks: marks, changelog: meta && !meta.error && Array.isArray(meta.changelog) ? meta.changelog : [], pub: hbPublished_() };
    const out = {};
    Object.keys(marks).forEach(function (k) {
      const bar = k.indexOf('|');
      if (k.slice(0, bar) !== emp.email) return;
      const key = k.slice(bar + 1), colon = key.indexOf(':');
      const so = hbSignOf_(ctx, emp.email, key.slice(0, colon), key.slice(colon + 1));
      if (so.state !== 'unsigned') out[key] = so;
    });
    return { setUp: true, signoffs: out };
  } catch (err) { return { error: err.message }; }
}

/** HB3.4 — the manager view, per person: a manager's confirmed team (the
 *  admin: everyone), each with every live plan that reaches them (whoever
 *  wrote it) — done, total, overdue; the quizzes they have attempted — best
 *  score, attempts, passed, locked; and their sign-offs — current and asked
 *  again. Whether reminder emails are on rides along. */
function hbTeamProgress() {
  const c = hbAuthorCall_();
  if (c.error) return { error: c.error };
  try {
    const admins = hbAdmins_();
    const plans = hbPlanRows_(c.ss).rows;
    const ctx = hbProgressCtx_(c.ss);
    const team = hbAuthorTeam_(c.people, c.emp.email, c.isAdmin);
    return { remindersOn: hbRemindersOn_(), people: team.map(function (p) {
      const mine = hbPlansFor_(plans, c.people, admins, p.email).map(function (pl) { return hbPlanProgress_(ctx, pl, p.email); });
      const tried = {};
      ctx.attempts.forEach(function (a) { if (a.email === p.email) tried[a.quizId] = 1; });
      const quizzes = Object.keys(tried).map(function (id) {
        const s = hbQuizStanding_(ctx.attempts, ctx.resets, p.email, id, ctx.now);
        return { id: id, title: ctx.titles[id] || id, best: s.best, attempts: s.attempts, passed: s.passed, locked: s.locked };
      });
      let signed = 0, resign = 0;
      Object.keys(ctx.marks).forEach(function (k) {
        if (k.indexOf(p.email + '|') !== 0) return;
        const key = k.slice(p.email.length + 1), colon = key.indexOf(':');
        const st = hbSignOf_(ctx, p.email, key.slice(0, colon), key.slice(colon + 1)).state;
        if (st === 'signed') signed++; else if (st === 'resign') resign++;
      });
      return { email: p.email, name: hbNameOf_(p.email), department: p.department,
        plans: mine.map(function (pl) { return { id: pl.id, title: pl.title, due: pl.due, done: pl.done, total: pl.total, overdue: pl.overdue }; }),
        overdue: mine.filter(function (pl) { return pl.overdue; }).length, quizzes: quizzes, signed: signed, resign: resign };
    }) };
  } catch (err) { return { error: err.message }; }
}
