/* The handbook app's people (HB2.1, operator plan 2026-10-28).
 *
 * WHO is reading, and whose team they are on. The handbook itself needs no
 * sign-in beyond the domain; this is what later batches build on — a manager
 * needs a team before training plans, sign-offs and quiz results mean anything.
 *
 * THE STORE is the Handbook spreadsheet, named by the HANDBOOK_SS_ID Script
 * Property — the app's OWN store, never the Knowledge Base (which is
 * patient-data-free by policy and shared with Team Tools). Only this project
 * writes it, so this project's ScriptLock serialises every write, and a row is
 * updated in place — unlike the KB tabs, where Handbook.js only appends because
 * Team Tools' lock is not this one. Unset is said by name; reading the handbook
 * never depends on it (g122: no fallback store).
 *
 * THE PEOPLE TAB, one row per person, columns in HB_PEOPLE_HEADERS order (a
 * header that was edited is "could not read", never a guess — g128):
 *   Email       the signed-in address, lowercased — the key
 *   Department  a chapter of the published handbook (the reader's own choice)
 *   Manager     the address of the manager they chose, or blank
 *   Role        'manager' (the admin marks it) or blank
 *   Status      blank (no manager chosen) · 'pending' · 'confirmed' · 'declined'
 *   RequestedMs · ConfirmedMs · ConfirmedBy · UpdatedMs   (epoch ms; text by)
 * Status is a word, never TRUE/FALSE (g09).
 *
 * ROLES. Admins: the HANDBOOK_ADMIN_EMAILS Script Property (comma-separated),
 * or the deploying account while it is unset. Managers: rows the admin marks.
 * Everyone else signed in to the domain is a reader, and on a first visit picks
 * a department and a manager; the manager confirms (or says "not my team"). A
 * change of department or manager asks again. A manager the admin unmarks
 * leaves their people "choose again" — derived on read, nothing rewritten.
 *
 * Every public function (a name that does not end in `_` — g143) checks its
 * caller before it takes the lock (g17), and answers {success, error} or the
 * caller's fresh view. */

const HB_SS_PROP = 'HANDBOOK_SS_ID';
const HB_ADMINS_PROP = 'HANDBOOK_ADMIN_EMAILS';
const HB_PEOPLE_TAB = 'People';
const HB_PEOPLE_HEADERS = ['Email', 'Department', 'Manager', 'Role', 'Status', 'RequestedMs', 'ConfirmedMs', 'ConfirmedBy', 'UpdatedMs'];
const HB_PEOPLE_CACHE_KEY = 'hb_people_v1';
const HB_PEOPLE_CACHE_TTL = 120;
const HB_LOCK_WAIT_MS = 10000;
const HB_EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const HB_STATUSES = ['', 'pending', 'confirmed', 'declined'];

// ── Pure helpers ─────────────────────────────────────────────────────────

/** PURE — an address as the key: trimmed, lowercased; '' when not one. */
function hbEmail_(v) {
  const e = String(v == null ? '' : v).trim().toLowerCase();
  return e.length <= 254 && HB_EMAIL_RE.test(e) ? e : '';
}
/** PURE — a readable name from an address's first part: maria.lopez → Maria Lopez. */
function hbNameOf_(email) {
  const local = String(email || '').split('@')[0];
  const words = local.split(/[._-]+/).filter(Boolean);
  if (!words.length) return String(email || '');
  return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}
/** PURE — the admin list: the property's addresses, else the deployer's. */
function hbAdminList_(prop, deployer) {
  const list = String(prop || '').split(/[\s,;]+/).map(hbEmail_).filter(Boolean);
  if (list.length) return list;
  const d = hbEmail_(deployer);
  return d ? [d] : [];
}
/** PURE — the People tab's rows as records. Throws, naming the tab, when its
 *  header row is not HB_PEOPLE_HEADERS (an edited header could put a manager
 *  in the department column — read nothing rather than that). A row without a
 *  usable address is skipped; `row` is its 1-based sheet row. */
function hbPeopleParse_(values) {
  if (!values.length) return [];
  const head = values[0].map(function (h) { return String(h || '').trim(); });
  const ok = HB_PEOPLE_HEADERS.every(function (h, i) { return head[i] === h; });
  if (!ok) throw new Error('The "' + HB_PEOPLE_TAB + '" tab\'s header row has been edited — it should read ' + HB_PEOPLE_HEADERS.join(', ') + '.');
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const email = hbEmail_(r[0]);
    if (!email) continue;
    const status = String(r[4] || '').trim().toLowerCase();
    out.push({
      row: i + 1, email: email,
      department: String(r[1] == null ? '' : r[1]).trim(),
      manager: hbEmail_(r[2]),
      role: String(r[3] || '').trim().toLowerCase() === 'manager' ? 'manager' : '',
      status: HB_STATUSES.indexOf(status) >= 0 ? status : '',
      requestedMs: Number(r[5]) || 0, confirmedMs: Number(r[6]) || 0,
      confirmedBy: hbEmail_(r[7]), updatedMs: Number(r[8]) || 0,
    });
  }
  return out;
}
/** PURE — a record as its sheet row. */
function hbPeopleRow_(p) {
  return [p.email, p.department || '', p.manager || '', p.role || '', p.status || '',
    p.requestedMs || '', p.confirmedMs || '', p.confirmedBy || '', p.updatedMs || ''];
}
/** PURE — where a person stands with their manager, as the page shows it:
 *  'none' (no manager chosen) · 'pending' · 'confirmed' · 'declined' ·
 *  'gone' (the manager they chose is no longer one — choose again). */
function hbStanding_(p, managers) {
  if (!p || !p.manager) return 'none';
  if (!managers[p.manager]) return 'gone';
  return p.status === 'confirmed' || p.status === 'declined' ? p.status : 'pending';
}
/** PURE — a record as the page sees it. */
function hbPersonView_(p, managers) {
  return {
    email: p.email, name: hbNameOf_(p.email), department: p.department,
    manager: p.manager, managerName: p.manager ? hbNameOf_(p.manager) : '',
    isManager: p.role === 'manager', standing: hbStanding_(p, managers),
    requestedMs: p.requestedMs, confirmedMs: p.confirmedMs,
  };
}
/** PURE — a reader's profile change applied to their record (or a new one).
 *  A new department or manager asks the manager again; choosing no manager
 *  clears the standing; saving the same choice changes nothing, so a confirmed
 *  reader stays confirmed. Returns { rec, changed }. */
function hbProfileApply_(rec, email, department, manager, nowMs) {
  const base = rec ? Object.assign({}, rec) : { email: email, department: '', manager: '', role: '', status: '', requestedMs: 0, confirmedMs: 0, confirmedBy: '', updatedMs: 0 };
  if (rec && base.department === department && base.manager === manager && base.status !== 'declined') return { rec: base, changed: false };
  base.department = department;
  base.manager = manager;
  if (manager) {
    base.status = 'pending'; base.requestedMs = nowMs; base.confirmedMs = 0; base.confirmedBy = '';
  } else {
    base.status = ''; base.requestedMs = 0; base.confirmedMs = 0; base.confirmedBy = '';
  }
  base.updatedMs = nowMs;
  return { rec: base, changed: true };
}

// ── The store ────────────────────────────────────────────────────────────

let _hbSS = null;
/** The Handbook spreadsheet; null while HANDBOOK_SS_ID is unset (the page says
 *  so). A set id that will not open throws — unreachable is not unset. */
function getHandbookSS_() {
  if (_hbSS) return _hbSS;
  const id = String(PropertiesService.getScriptProperties().getProperty(HB_SS_PROP) || '').trim();
  if (!id) return null;
  _hbSS = SpreadsheetApp.openById(id);
  return _hbSS;
}
/** The People tab; created with its header row when `create` (a first save),
 *  otherwise null while it does not exist (nobody has saved yet). */
function hbPeopleSheet_(ss, create) {
  let sheet = ss.getSheetByName(HB_PEOPLE_TAB);
  if (sheet || !create) return sheet;
  sheet = ss.insertSheet(HB_PEOPLE_TAB);
  sheet.appendRow(sheetSafeRow_(HB_PEOPLE_HEADERS));
  return sheet;
}
/** Every person. Cached for HB_PEOPLE_CACHE_TTL unless `fresh` (a write reads
 *  fresh, under the lock); every write clears the cache. A failed read throws
 *  and is never cached (g129). */
function hbPeopleRead_(ss, fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    let hit = null;
    try { hit = cache.get(HB_PEOPLE_CACHE_KEY); } catch (e) {}
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  const sheet = hbPeopleSheet_(ss, false);
  const people = sheet && sheet.getLastRow() >= 1
    ? hbPeopleParse_(sheet.getRange(1, 1, sheet.getLastRow(), HB_PEOPLE_HEADERS.length).getValues())
    : [];
  try { cache.put(HB_PEOPLE_CACHE_KEY, JSON.stringify(people), HB_PEOPLE_CACHE_TTL); } catch (e) {}
  return people;
}
function hbPeopleForget_() { try { CacheService.getScriptCache().remove(HB_PEOPLE_CACHE_KEY); } catch (e) {} }
/** One record written back to its row, or appended as a new one (the tab
 *  is created by the first write). Clears the cached list. */
function hbPeopleWrite_(ss, rec) {
  const sheet = hbPeopleSheet_(ss, true);
  const row = hbPeopleRow_(rec);
  if (rec.row) sheet.getRange(rec.row, 1, 1, row.length).setValues(sheetSafeRows_([row]));
  else sheet.appendRow(sheetSafeRow_(row));
  hbPeopleForget_();
}
/** The store for a write: { ss } or { error } — unset and unreachable are
 *  different answers (g128). */
function hbStore_() {
  try {
    const ss = getHandbookSS_();
    return ss ? { ss: ss } : { error: 'Profiles are not set up yet: the ' + HB_SS_PROP + ' Script Property is not set.' };
  } catch (err) { return { error: 'Could not open the Handbook spreadsheet: ' + err.message }; }
}
/** Run `fn` holding this project's lock; a busy lock is said, never waited out
 *  silently. Only this project writes the Handbook spreadsheet. */
function hbWithLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(HB_LOCK_WAIT_MS)) return { success: false, error: 'The handbook is busy — try again in a moment.' };
  try { return fn(); } finally { lock.releaseLock(); }
}

/** Who may administer the people list. */
function hbAdmins_() {
  let deployer = '';
  try { deployer = Session.getEffectiveUser().getEmail(); } catch (e) { deployer = ''; }
  return hbAdminList_(PropertiesService.getScriptProperties().getProperty(HB_ADMINS_PROP), deployer);
}
/** The published chapters a reader may name as their department. */
function hbDepartments_() {
  const res = getManualParts();
  if (!res || res.error || !Array.isArray(res.parts)) throw new Error('Could not read the handbook\'s chapters' + (res && res.error ? ': ' + res.error : '') + '.');
  return res.parts.map(function (p) { return String(p && p.department || ''); }).filter(Boolean);
}

/** The caller's view: who they are, their record, the managers they may
 *  choose, their team when they manage one, and everyone when they are an
 *  admin. */
function hbView_(email, people) {
  const managers = {};
  people.forEach(function (p) { if (p.role === 'manager') managers[p.email] = true; });
  const mine = people.filter(function (p) { return p.email === email; })[0] || null;
  const isAdmin = hbAdmins_().indexOf(email) >= 0;
  const isManager = !!managers[email];
  const view = function (p) { return hbPersonView_(p, managers); };
  const out = {
    email: email, name: hbNameOf_(email), setUp: true, isAdmin: isAdmin, isManager: isManager,
    me: mine ? view(mine) : null,
    managers: Object.keys(managers).filter(function (m) { return m !== email; }).sort()
      .map(function (m) { return { email: m, name: hbNameOf_(m) }; }),
  };
  if (isManager) out.team = people.filter(function (p) { return p.manager === email && p.status !== 'declined'; }).map(view);
  if (isAdmin) out.everyone = people.map(view);
  return out;
}

// ── Public endpoints ─────────────────────────────────────────────────────

/** Who is reading. `setUp: false` while HANDBOOK_SS_ID is unset; `error` when
 *  the store or its tab cannot be read. Reading the handbook never waits on it. */
function hbGetMe() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  const base = { email: emp.email, name: hbNameOf_(emp.email), isAdmin: hbAdmins_().indexOf(emp.email) >= 0 };
  let ss;
  try { ss = getHandbookSS_(); } catch (err) { return Object.assign(base, { setUp: true, error: 'Could not open the Handbook spreadsheet: ' + err.message }); }
  if (!ss) return Object.assign(base, { setUp: false });
  try { return hbView_(emp.email, hbPeopleRead_(ss, false)); }
  catch (err) { return Object.assign(base, { setUp: true, error: err.message }); }
}

/** A reader's department and manager. The department is a published chapter;
 *  the manager is someone the admin has marked, never the reader. */
function hbSaveProfile(department, manager) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  const dept = String(department == null ? '' : department).trim();
  const mgr = manager ? hbEmail_(manager) : '';
  if (manager && !mgr) return { success: false, error: 'That manager is not an email address.' };
  if (mgr === emp.email) return { success: false, error: 'You cannot be your own manager.' };
  const st = hbStore_();
  if (st.error) return { success: false, error: st.error };
  try {
    if (dept && hbDepartments_().indexOf(dept) < 0) return { success: false, error: 'That department is not a chapter of the handbook.' };
  } catch (err) { return { success: false, error: err.message }; }
  return hbWithLock_(function () {
    try {
      const people = hbPeopleRead_(st.ss, true);
      if (mgr && !people.some(function (p) { return p.email === mgr && p.role === 'manager'; })) return { success: false, error: 'That person is not a manager here.' };
      const rec = people.filter(function (p) { return p.email === emp.email; })[0] || null;
      const next = hbProfileApply_(rec, emp.email, dept, mgr, Date.now());
      if (!next.changed) return { success: true, changed: false, view: hbView_(emp.email, people) };
      hbPeopleWrite_(st.ss, next.rec);
      return { success: true, changed: true, view: hbView_(emp.email, hbPeopleRead_(st.ss, true)) };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** A manager answers a request: `ok` confirms the person on their team, false
 *  says "not my team" (they choose again). An admin may answer for anyone who
 *  has chosen a manager. */
function hbConfirmPerson(email, ok) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  const who = hbEmail_(email);
  if (!who) return { success: false, error: 'That is not an email address.' };
  const st = hbStore_();
  if (st.error) return { success: false, error: st.error };
  const isAdmin = hbAdmins_().indexOf(emp.email) >= 0;
  return hbWithLock_(function () {
    try {
      const people = hbPeopleRead_(st.ss, true);
      const rec = people.filter(function (p) { return p.email === who; })[0];
      if (!rec || !rec.manager) return { success: false, error: 'That person has not chosen a manager.' };
      const stillManager = people.some(function (p) { return p.email === emp.email && p.role === 'manager'; });
      if (!(rec.manager === emp.email && stillManager) && !isAdmin) return { success: false, error: 'Only their manager can answer this.' };
      const now = Date.now();
      const next = Object.assign({}, rec, ok === true
        ? { status: 'confirmed', confirmedMs: now, confirmedBy: emp.email, updatedMs: now }
        : { status: 'declined', confirmedMs: 0, confirmedBy: emp.email, updatedMs: now });
      hbPeopleWrite_(st.ss, next);
      return { success: true, view: hbView_(emp.email, hbPeopleRead_(st.ss, true)) };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** An admin endpoint's gate and store: { emp, ss, who } or { error }. */
function hbAdminCall_(email) {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  if (hbAdmins_().indexOf(emp.email) < 0) return { error: 'Handbook admin access required.' };
  const who = hbEmail_(email);
  if (!who) return { error: 'That is not an email address.' };
  const st = hbStore_();
  if (st.error) return { error: st.error };
  return { emp: emp, ss: st.ss, who: who };
}

/** Admin: mark (or unmark) an address as a manager. A new address gets a row
 *  with only the role, which the person fills in on their first visit. */
function hbSetManager(email, on) {
  const c = hbAdminCall_(email);
  if (c.error) return { success: false, error: c.error };
  return hbWithLock_(function () {
    try {
      const people = hbPeopleRead_(c.ss, true);
      const rec = people.filter(function (p) { return p.email === c.who; })[0];
      const role = on === true ? 'manager' : '';
      if ((rec ? rec.role : '') === role) return { success: true, changed: false, view: hbView_(c.emp.email, people) };
      const next = rec ? Object.assign({}, rec, { role: role, updatedMs: Date.now() })
        : { email: c.who, department: '', manager: '', role: role, status: '', requestedMs: 0, confirmedMs: 0, confirmedBy: '', updatedMs: Date.now() };
      hbPeopleWrite_(c.ss, next);
      return { success: true, changed: true, view: hbView_(c.emp.email, hbPeopleRead_(c.ss, true)) };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Admin: remove a person's row (someone who has left). Anyone they managed
 *  is asked to choose again. */
function hbRemovePerson(email) {
  const c = hbAdminCall_(email);
  if (c.error) return { success: false, error: c.error };
  return hbWithLock_(function () {
    try {
      const people = hbPeopleRead_(c.ss, true);
      const rec = people.filter(function (p) { return p.email === c.who; })[0];
      if (!rec) return { success: true, changed: false, view: hbView_(c.emp.email, people) };
      // Read again under the lock, and only this project writes the tab, so
      // the row is still this person's (g164).
      hbPeopleSheet_(c.ss, false).deleteRow(rec.row);
      hbPeopleForget_();
      return { success: true, changed: true, view: hbView_(c.emp.email, hbPeopleRead_(c.ss, true)) };
    } catch (err) { return { success: false, error: err.message }; }
  });
}
