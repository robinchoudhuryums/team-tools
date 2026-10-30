/* The handbook app's quizzes (HB3.2, operator plan 2026-10-28).
 *
 * TAKING the handbook's official quizzes. The quizzes themselves are Team
 * Tools' to publish: written in the repo (manual/data/quizzes.json), checked at
 * export, carried in manual.json and stored by Team Tools' Import in the KB
 * spreadsheet's ManualQuizzes tab (HB3.1). This app READS that tab, and grades
 * with the same engine Team Tools uses — quizGrade_, quizStripQuestion_,
 * quizReview_ and the retry limit trainQuizLockout_, copied verbatim by the
 * sync, never rewritten here.
 *
 * ATTEMPTS live in this app's own Handbook spreadsheet (HANDBOOK_SS_ID, beside
 * People): QuizAttempts, one row per submit, and QuizResets, one row per
 * manager reset — both APPENDED under this project's lock (People.js's
 * hbWithLock_). The reader is named by address. Times are epoch ms (numbers,
 * never a coercible stamp); Passed is a word, never TRUE/FALSE (g09).
 *
 * THE RULES are Team Tools' (TRN-1): a failed attempt uses one of
 * TRAIN_QUIZ_MAX_ATTEMPTS; a pass starts the count over; once they are used
 * the reader waits TRAIN_QUIZ_LOCK_HOURS from the last of them — unless their
 * confirmed manager (or an admin) resets them. A submit while locked is
 * refused WITHOUT being recorded. A wrong answer is shown its explanation and
 * the section to go back to, never which option was right (with retries, the
 * right option would be an answer key by elimination).
 *
 * The questions reach the browser stripped (quizStripQuestion_). The page
 * shuffles questions and options itself and answers in the ORIGINAL order, so
 * the server stays stateless between "open" and "submit". */

const HB_QUIZ_ATTEMPTS_TAB = 'QuizAttempts';
const HB_QUIZ_ATTEMPTS_HEADERS = ['AtMs', 'Email', 'QuizId', 'ScorePct', 'Passed', 'PerQuestion'];
const HB_QUIZ_RESETS_TAB = 'QuizResets';
const HB_QUIZ_RESETS_HEADERS = ['AtMs', 'Email', 'QuizId', 'ResetBy'];
const HB_QUIZZES_CACHE_KEY = 'hb_quizzes_v1';

// ── Pure helpers ─────────────────────────────────────────────────────────

/** PURE — the ManualQuizzes rows (kbManualQuizzesStored_'s shape) as quizzes
 *  with their questions parsed. A row whose questions will not parse is
 *  counted in `unreadable`, never served half-read. */
function hbQuizzesFromRows_(rows) {
  const quizzes = [];
  let unreadable = 0;
  (rows || []).forEach(function (r) {
    let questions = null;
    try { questions = JSON.parse(String(r[5] || '')); } catch (e) { questions = null; }
    if (!Array.isArray(questions) || !questions.length || !KB_MANUAL_QUIZ_ID_RE.test(String(r[0] || ''))) { unreadable++; return; }
    quizzes.push({ id: String(r[0]), title: String(r[1]), section: String(r[2]), anchor: String(r[3]), passPct: Math.round(Number(r[4])) || 0, questions: questions });
  });
  return { quizzes: quizzes, unreadable: unreadable };
}
/** PURE — the attempts and resets tab rows as records (a blank or malformed
 *  row is skipped). */
function hbQuizAttemptsParse_(values) {
  return (values || []).slice(1).map(function (r) {
    return { ms: Number(r[0]), email: hbEmail_(r[1]), quizId: String(r[2] || ''), scorePct: Math.round(Number(r[3])) || 0, passed: String(r[4] || '').toLowerCase() === 'yes' };
  }).filter(function (a) { return a.email && a.quizId && isFinite(a.ms) && a.ms > 0; });
}
function hbQuizResetsParse_(values) {
  return (values || []).slice(1).map(function (r) {
    return { ms: Number(r[0]), email: hbEmail_(r[1]), quizId: String(r[2] || '') };
  }).filter(function (x) { return x.email && x.quizId && isFinite(x.ms) && x.ms > 0; });
}
/** PURE — where one person stands with one quiz: the retry limit over their
 *  attempts since the latest reset, how many they have made, their best score
 *  and whether they have ever passed. */
function hbQuizStanding_(attempts, resets, email, quizId, nowMs) {
  let resetMs = 0;
  (resets || []).forEach(function (x) { if (x.email === email && x.quizId === quizId && x.ms > resetMs) resetMs = x.ms; });
  const mine = (attempts || []).filter(function (a) { return a.email === email && a.quizId === quizId; });
  const since = mine.filter(function (a) { return a.ms > resetMs; }).map(function (a) { return { ms: a.ms, passed: a.passed }; });
  const lk = trainQuizLockout_(since, nowMs, TRAIN_QUIZ_MAX_ATTEMPTS, TRAIN_QUIZ_LOCK_HOURS * 3600000);
  let best = null, passed = false;
  mine.forEach(function (a) { if (best === null || a.scorePct > best) best = a.scorePct; if (a.passed) passed = true; });
  return { locked: lk.locked, retryAtMs: lk.retryAtMs, attemptsLeft: lk.attemptsLeft, maxAttempts: TRAIN_QUIZ_MAX_ATTEMPTS,
    attempts: mine.length, best: best, passed: passed };
}
/** PURE — a quiz as a list row: no questions, just what the list shows. */
function hbQuizSummary_(q) {
  const out = { id: q.id, title: q.title, section: q.section, anchor: q.anchor, passPct: q.passPct, count: q.questions.length };
  if (q.team) { out.team = true; out.authorName = q.authorName; }   // HB3.3
  return out;
}

// ── Reads ────────────────────────────────────────────────────────────────

/** The published quizzes, from the KB's ManualQuizzes tab, cached for
 *  HB_CACHE_TTL (a Team Tools import shows within five minutes). No tab is no
 *  quizzes; an edited header throws (kbManualQuizzesStored_), and a failed
 *  read is never cached (g129). */
function hbQuizzes_() {
  const cache = CacheService.getScriptCache();
  let hit = null;
  try { hit = cache.get(HB_QUIZZES_CACHE_KEY); } catch (e) {}
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const res = hbQuizzesFromRows_(kbManualQuizzesStored_(getKbSS_().getSheetByName(KB_MANUAL_QUIZZES_TAB)));
  try { cache.put(HB_QUIZZES_CACHE_KEY, JSON.stringify(res), HB_CACHE_TTL); } catch (e) {}
  return res;
}
/** A tab of the Handbook spreadsheet, read whole ([] when it does not exist). */
function hbQuizTabRead_(ss, name, width) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(1, 1, sheet.getLastRow(), width).getValues();
}
function hbQuizAttempts_(ss) { return hbQuizAttemptsParse_(hbQuizTabRead_(ss, HB_QUIZ_ATTEMPTS_TAB, HB_QUIZ_ATTEMPTS_HEADERS.length)); }
function hbQuizResets_(ss) { return hbQuizResetsParse_(hbQuizTabRead_(ss, HB_QUIZ_RESETS_TAB, HB_QUIZ_RESETS_HEADERS.length)); }
/** Append one row to a Handbook-spreadsheet tab, creating it with its header.
 *  The caller holds this project's lock (the only writer). */
function hbQuizAppend_(ss, name, headers, row) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(sheetSafeRow_(headers)); }
  sheet.appendRow(sheetSafeRow_(row));
}
/** HB3.3 — a quiz the reader may take, by id: an official one, or a team
 *  quiz they may see (Training.js's rule — their own, the admin's every one,
 *  or one a live plan assigns them). null when there is none. */
function hbQuizFor_(ss, email, id) {
  if (/^q-/.test(id)) return hbQuizzes_().quizzes.filter(function (x) { return x.id === id; })[0] || null;
  return hbTeamQuizzesVisible_(ss, email).filter(function (x) { return x.id === id; })[0] || null;
}
/** May `caller` reset `email`? Their confirmed manager (still a manager), or
 *  an admin. */
function hbMayReset_(people, caller, email, isAdmin) {
  if (isAdmin) return true;
  const managers = {};
  people.forEach(function (p) { if (p.role === 'manager') managers[p.email] = true; });
  const rec = people.filter(function (p) { return p.email === email; })[0];
  return !!rec && rec.manager === caller && !!managers[caller] && hbStanding_(rec, managers) === 'confirmed';
}

// ── Public endpoints ─────────────────────────────────────────────────────

/** The quizzes, each with where the reader stands. `setUp: false` while the
 *  Handbook spreadsheet is unset (a quiz cannot be recorded without it). */
function hbListQuizzes() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  try {
    const q = hbQuizzes_();
    let ss;
    try { ss = getHandbookSS_(); } catch (err) { return { setUp: true, error: 'Could not open the Handbook spreadsheet: ' + err.message }; }
    // Unset: the quizzes can be listed, not taken (nothing could record them).
    if (!ss) return { setUp: false, unreadable: q.unreadable, quizzes: q.quizzes.map(hbQuizSummary_) };
    const attempts = hbQuizAttempts_(ss), resets = hbQuizResets_(ss), now = Date.now();
    const all = q.quizzes.concat(hbTeamQuizzesVisible_(ss, emp.email));   // HB3.3: the team quizzes this reader may see
    return { setUp: true, unreadable: q.unreadable, quizzes: all.map(function (x) {
      return Object.assign(hbQuizSummary_(x), { me: hbQuizStanding_(attempts, resets, emp.email, x.id, now) });
    }) };
  } catch (err) { return { error: err.message }; }
}

/** One quiz to take: its questions without the key, and where the reader
 *  stands (a locked reader is told when they may try again). */
function hbGetQuiz(quizId) {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  const id = String(quizId || '');
  if (!HB_QUIZ_ID_RE.test(id)) return { error: 'That is not a quiz.' };
  try {
    const st = hbStore_();
    if (st.error) return { error: st.error };
    const quiz = hbQuizFor_(st.ss, emp.email, id);
    if (!quiz) return { error: 'That quiz is not in the handbook.' };
    const me = hbQuizStanding_(hbQuizAttempts_(st.ss), hbQuizResets_(st.ss), emp.email, id, Date.now());
    return { quiz: Object.assign(hbQuizSummary_(quiz), { questions: quiz.questions.map(quizStripQuestion_) }), me: me };
  } catch (err) { return { error: err.message }; }
}

/** Submit answers (in the quiz's ORIGINAL question order; an option index, or
 *  a list of them for a multi-select). Refused, and not recorded, while the
 *  reader is locked out. Answers with the score, which questions were wrong,
 *  each wrong one's explanation and section, and where the reader stands now. */
function hbSubmitQuiz(quizId, answers) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  const id = String(quizId || '');
  if (!HB_QUIZ_ID_RE.test(id)) return { success: false, error: 'That is not a quiz.' };
  if (!Array.isArray(answers) || answers.length > TRAIN_QUIZ_MAX_QUESTIONS) return { success: false, error: 'Those are not answers to this quiz.' };
  const st = hbStore_();
  if (st.error) return { success: false, error: st.error };
  let quiz;
  try { quiz = hbQuizFor_(st.ss, emp.email, id); } catch (err) { return { success: false, error: err.message }; }
  if (!quiz) return { success: false, error: 'That quiz is not in the handbook.' };
  if (answers.length !== quiz.questions.length) return { success: false, error: 'Those are not answers to this quiz — reload it and try again.' };
  return hbWithLock_(function () {
    try {
      const now = Date.now();
      const attempts = hbQuizAttempts_(st.ss), resets = hbQuizResets_(st.ss);
      const before = hbQuizStanding_(attempts, resets, emp.email, id, now);
      if (before.locked) return { success: false, locked: true, me: before, error: 'You have used your ' + TRAIN_QUIZ_MAX_ATTEMPTS + ' attempts — try again later, or ask your manager to reset them.' };
      const g = quizGrade_(quiz.questions, answers);
      const passed = g.scorePct >= quiz.passPct;
      hbQuizAppend_(st.ss, HB_QUIZ_ATTEMPTS_TAB, HB_QUIZ_ATTEMPTS_HEADERS,
        [now, emp.email, id, g.scorePct, passed ? 'yes' : 'no', JSON.stringify(g.perQuestion)]);
      attempts.push({ ms: now, email: emp.email, quizId: id, scorePct: g.scorePct, passed: passed });
      return { success: true, scorePct: g.scorePct, right: g.right, total: g.total, passed: passed, passPct: quiz.passPct,
        perQuestion: g.perQuestion, review: quizReview_(quiz.questions, g.perQuestion),
        me: hbQuizStanding_(attempts, resets, emp.email, id, now) };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** A manager's (or an admin's) view of the people locked out of a quiz:
 *  their confirmed team, or everyone for an admin. */
function hbTeamQuizLocks() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  const st = hbStore_();
  if (st.error) return { error: st.error };
  try {
    const isAdmin = hbAdmins_().indexOf(emp.email) >= 0;
    const people = hbPeopleRead_(st.ss, false);
    const who = people.filter(function (p) { return hbMayReset_(people, emp.email, p.email, isAdmin); }).map(function (p) { return p.email; });
    if (!who.length) return { locks: [] };
    const quizzes = hbQuizzes_().quizzes.concat(hbTeamQuizRows_(st.ss).rows.filter(function (r) { return r.live; }).map(hbTeamQuizOf_));   // HB3.3
    const attempts = hbQuizAttempts_(st.ss), resets = hbQuizResets_(st.ss), now = Date.now();
    const locks = [];
    who.forEach(function (email) {
      quizzes.forEach(function (q) {
        const s = hbQuizStanding_(attempts, resets, email, q.id, now);
        if (s.locked) locks.push({ email: email, name: hbNameOf_(email), quizId: q.id, title: q.title, retryAtMs: s.retryAtMs });
      });
    });
    return { locks: locks };
  } catch (err) { return { error: err.message }; }
}

/** Reset a person's attempts at one quiz — their confirmed manager or an
 *  admin. Appends a QuizResets row; the attempts themselves are kept. */
function hbResetQuiz(email, quizId) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  const who = hbEmail_(email), id = String(quizId || '');
  if (!who || !HB_QUIZ_ID_RE.test(id)) return { success: false, error: 'That is not a person and a quiz.' };
  const st = hbStore_();
  if (st.error) return { success: false, error: st.error };
  const isAdmin = hbAdmins_().indexOf(emp.email) >= 0;
  return hbWithLock_(function () {
    try {
      if (!hbMayReset_(hbPeopleRead_(st.ss, true), emp.email, who, isAdmin)) return { success: false, error: 'Only their manager can reset their attempts.' };
      hbQuizAppend_(st.ss, HB_QUIZ_RESETS_TAB, HB_QUIZ_RESETS_HEADERS, [Date.now(), who, id, emp.email]);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });
}
