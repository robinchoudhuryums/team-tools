/* The handbook app's bookmarks and notes (HB2.2, operator plan 2026-10-28:
 * "bookmarks synced to the account; notes in the browser by default, syncing
 * optional and warned against patient information").
 *
 * BOOKMARKS belong to the reader's account: the reader bar's star toggles one,
 * and the Saved page lists them. A bookmark is a published section; its title
 * is the handbook's, never the page's.
 *
 * NOTES live in the reader's browser. A reader may turn on "keep my notes in
 * my account" — behind a warning that a note must never hold patient
 * information — and only then does a note reach this server. Syncing is a
 * MERGE: each side's note per section with the later time wins, and a deleted
 * note is a tombstone (empty text, its time) so the deletion travels too.
 * Turning sync off removes the account's copies (the browser keeps its own).
 *
 * THE STORE is the Handbook spreadsheet (People.js); only this project writes
 * it, under its own lock, the caller checked first (g17). Two tabs, every
 * body a JSON cell (a title or a note never coerces — g144/g13):
 *   Bookmarks [Email, ListJson, UpdatedMs]            one row per reader
 *   Notes     [Email, SectionId, NoteJson, UpdatedMs]  one row per reader and
 *             section; NoteJson is {"t": text} — "" is a deleted note. */

const HB_BOOKMARKS_TAB = 'Bookmarks';
const HB_BOOKMARKS_HEADERS = ['Email', 'ListJson', 'UpdatedMs'];
const HB_NOTES_TAB = 'Notes';
const HB_NOTES_HEADERS = ['Email', 'SectionId', 'NoteJson', 'UpdatedMs'];
const HB_BOOKMARKS_MAX = 100;
const HB_NOTE_MAX = 4000;
const HB_NOTES_SYNC_MAX = 500;
const HB_SECTION_ID_RE = /^man-[a-z0-9-]{1,60}$/;

// ── Pure helpers ─────────────────────────────────────────────────────────

/** PURE — a bookmark list with `id` added (to the top) or removed; deduped,
 *  capped, unknown entries dropped. `title` is the handbook's. */
function hbBookmarksApply_(list, id, title, on, cap) {
  const out = on ? [{ id: id, title: String(title || '') }] : [];
  (Array.isArray(list) ? list : []).forEach(function (b) {
    if (!b || typeof b.id !== 'string' || b.id === id || out.length >= cap) return;
    out.push({ id: b.id, title: String(b.title || '') });
  });
  return out;
}
/** PURE — one note as this app stores it, or null when it will not do: a
 *  string of at most HB_NOTE_MAX, a time that is a positive number not past
 *  `maxMs`. */
function hbNoteClean_(n, maxMs) {
  if (!n || typeof n !== 'object' || typeof n.t !== 'string') return null;
  const ms = Number(n.ms);
  if (!(ms > 0) || ms > maxMs || n.t.length > HB_NOTE_MAX) return null;
  return { t: n.t, ms: ms };
}
/** PURE — merge two note maps ({sectionId: {t, ms}}): per section the later
 *  wins; on a tie the first map's. A tombstone ("" text) is kept so a deletion
 *  reaches the other side. */
function hbNotesMerge_(a, b) {
  const out = {};
  [a || {}, b || {}].forEach(function (m) {
    Object.keys(m).forEach(function (id) {
      const n = m[id];
      if (!n || typeof n.t !== 'string' || !(Number(n.ms) > 0)) return;
      if (!out[id] || Number(n.ms) > out[id].ms) out[id] = { t: n.t, ms: Number(n.ms) };
    });
  });
  return out;
}
/** PURE — the Notes tab's rows for one reader: {map: {id: {t, ms, row}},
 *  unreadable}. A row whose JSON will not read is counted, never served. */
function hbNotesRows_(values, email) {
  const map = {};
  let unreadable = 0;
  (values || []).slice(1).forEach(function (r, i) {
    if (hbEmail_(r[0]) !== email) return;
    const id = String(r[1] || '');
    let body = null;
    try { body = JSON.parse(String(r[2] || '')); } catch (e) { body = null; }
    const ms = Number(r[3]);
    if (!HB_SECTION_ID_RE.test(id) || !body || typeof body.t !== 'string' || !(ms > 0)) { unreadable++; return; }
    if (!map[id] || ms > map[id].ms) map[id] = { t: body.t, ms: ms, row: i + 2 };
  });
  return { map: map, unreadable: unreadable };
}

// ── The tabs ─────────────────────────────────────────────────────────────

/** Unset is said by name (g128): the page then keeps everything in the browser. */
function hbSavedNotSetUp_() { return 'Saving to your account is not set up yet: the ' + HB_SS_PROP + ' Script Property is not set.'; }
function hbSavedSheet_(ss, name, headers, create) {
  let sheet = ss.getSheetByName(name);
  if (sheet || !create) return sheet;
  sheet = ss.insertSheet(name);
  sheet.appendRow(sheetSafeRow_(headers));
  return sheet;
}
/** The reader's bookmarks: {list, row} (row 0 when they have none yet). */
function hbBookmarksRead_(ss, email) {
  const sheet = hbSavedSheet_(ss, HB_BOOKMARKS_TAB, HB_BOOKMARKS_HEADERS, false);
  if (!sheet || sheet.getLastRow() < 2) return { list: [], row: 0 };
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HB_BOOKMARKS_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (hbEmail_(values[i][0]) !== email) continue;
    let list = null;
    try { list = JSON.parse(String(values[i][1] || '')); } catch (e) { list = null; }
    // An unreadable list is said, never read as "no bookmarks" (g53).
    if (!Array.isArray(list)) throw new Error('Your bookmarks could not be read from the Handbook spreadsheet.');
    return { list: hbBookmarksApply_(list, '', '', false, HB_BOOKMARKS_MAX), row: i + 2 };
  }
  return { list: [], row: 0 };
}
function hbNotesValues_(ss) {
  const sheet = hbSavedSheet_(ss, HB_NOTES_TAB, HB_NOTES_HEADERS, false);
  return sheet && sheet.getLastRow() >= 1 ? sheet.getRange(1, 1, sheet.getLastRow(), HB_NOTES_HEADERS.length).getValues() : [];
}
/** The caller and the store, checked before any lock; {error} otherwise. */
function hbSavedCall_() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  let ss;
  try { ss = getHandbookSS_(); } catch (err) { return { error: 'Could not open the Handbook spreadsheet: ' + err.message }; }
  return { emp: emp, ss: ss };
}

// ── Endpoints ────────────────────────────────────────────────────────────

/** The reader's bookmarks. { setUp: false } while the Handbook spreadsheet is
 *  unset (the page keeps them in the browser then); { error } when it cannot
 *  be read. */
function hbMyBookmarks() {
  const c = hbSavedCall_();
  if (c.error) return { error: c.error };
  if (!c.ss) return { setUp: false, bookmarks: [] };
  try { return { setUp: true, bookmarks: hbBookmarksRead_(c.ss, c.emp.email).list }; } catch (err) { return { error: err.message }; }
}

/** Add (`on`) or remove a bookmark on a published section; answers with the
 *  whole list, so every window agrees after the next toggle. */
function hbToggleBookmark(id, on) {
  const c = hbSavedCall_();
  if (c.error) return { success: false, error: c.error };
  if (!c.ss) return { success: false, error: hbSavedNotSetUp_() };
  const sid = String(id || '');
  let title = '';
  if (on !== false) {
    if (!HB_SECTION_ID_RE.test(sid)) return { success: false, error: 'Only a section of the handbook can be bookmarked.' };
    let pub;
    try { pub = hbPublished_(); } catch (err) { return { success: false, error: err.message }; }
    if (!pub.sectionIds[sid]) return { success: false, error: 'That section is not in the handbook.' };
    title = pub.sectionTitle[sid];
  }
  return hbWithLock_(function () {
    try {
      const cur = hbBookmarksRead_(c.ss, c.emp.email);
      const list = hbBookmarksApply_(cur.list, sid, title, on !== false, HB_BOOKMARKS_MAX);
      const sheet = hbSavedSheet_(c.ss, HB_BOOKMARKS_TAB, HB_BOOKMARKS_HEADERS, true);
      const row = [c.emp.email, JSON.stringify(list), Date.now()];
      if (cur.row) sheet.getRange(cur.row, 1, 1, row.length).setValues(sheetSafeRows_([row]));
      else sheet.appendRow(sheetSafeRow_(row));
      return { success: true, bookmarks: list };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Sync the reader's notes: `local` ({sectionId: {t, ms}}) is merged with the
 *  account's copy, later wins per section; what changed is written; the
 *  merged map comes back for the browser to keep. A note for a section no
 *  longer in the handbook is kept as it is (the reader may still want it). */
function hbSyncNotes(local) {
  const c = hbSavedCall_();
  if (c.error) return { success: false, error: c.error };
  if (!c.ss) return { success: false, error: hbSavedNotSetUp_() };
  if (!local || typeof local !== 'object' || Array.isArray(local)) return { success: false, error: 'Those notes could not be read.' };
  const ids = Object.keys(local);
  if (ids.length > HB_NOTES_SYNC_MAX) return { success: false, error: 'At most ' + HB_NOTES_SYNC_MAX + ' notes can be kept in your account.' };
  const maxMs = Date.now() + 86400000;
  const clean = {};
  let refused = 0;
  ids.forEach(function (id) {
    const n = HB_SECTION_ID_RE.test(id) ? hbNoteClean_(local[id], maxMs) : null;
    if (n) clean[id] = n; else refused++;
  });
  return hbWithLock_(function () {
    try {
      const mine = hbNotesRows_(hbNotesValues_(c.ss), c.emp.email);
      const merged = hbNotesMerge_(mine.map, clean);
      const sheet = hbSavedSheet_(c.ss, HB_NOTES_TAB, HB_NOTES_HEADERS, true);
      let written = 0;
      Object.keys(merged).forEach(function (id) {
        const had = mine.map[id];
        if (had && had.ms === merged[id].ms && had.t === merged[id].t) return;
        const row = [c.emp.email, id, JSON.stringify({ t: merged[id].t }), merged[id].ms];
        if (had) sheet.getRange(had.row, 1, 1, row.length).setValues(sheetSafeRows_([row]));
        else sheet.appendRow(sheetSafeRow_(row));
        written++;
      });
      return { success: true, notes: merged, written: written, refused: refused, unreadable: mine.unreadable };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

/** Sync turned off: the account's copies of the reader's notes are removed
 *  (their rows emptied — the browser keeps its own). */
function hbForgetNotes() {
  const c = hbSavedCall_();
  if (c.error) return { success: false, error: c.error };
  if (!c.ss) return { success: true, removed: 0 };
  return hbWithLock_(function () {
    try {
      const values = hbNotesValues_(c.ss);
      const sheet = hbSavedSheet_(c.ss, HB_NOTES_TAB, HB_NOTES_HEADERS, false);
      let removed = 0;
      values.slice(1).forEach(function (r, i) {
        if (hbEmail_(r[0]) !== c.emp.email) return;
        sheet.getRange(i + 2, 1, 1, HB_NOTES_HEADERS.length).clearContent();
        removed++;
      });
      return { success: true, removed: removed };
    } catch (err) { return { success: false, error: err.message }; }
  });
}
