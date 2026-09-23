// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 70_kb.js
//  Reference / Knowledge Base: the article store, search, the drawer, the Drive
//  converters and the insurance-payor lookup.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** ADMIN-gated (Phase A) — `callerEmp.isAdmin`, not `isManager`; the doc
 *  claimed the wrong tier for a whole cycle while the code refused every
 *  manager who is not also an admin (F-26). KB AI settings: the daily
 *  org-wide spend cap (USD) + the vendor model. Persists Script Properties
 *  KB_AI_DAILY_CAP / KB_AI_MODEL; AdminConfigChange audit row (INV-57
 *  family; same single-property-write pattern as the sibling saves). The
 *  model must be a KB_AI_MODEL_PRICES key so the cap accounting always has
 *  real rates. The API key itself is NEVER set or returned through any
 *  endpoint — set Script Property KB_AI_API_KEY in the Apps Script editor. */
function saveKbAiSettings(settings) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    settings = settings || {};
    const cap = parseFloat(settings.dailyCap);
    if (!isFinite(cap) || cap < 0 || cap > 100) {
      return { success: false, error: 'Daily cap must be a number between 0 and 100 (USD).' };
    }
    const model = String(settings.model || '').trim();
    if (!KB_AI_MODEL_PRICES[model]) {
      return { success: false, error: 'Unknown model: ' + (model || '(blank)') + '. Pick one of: ' + Object.keys(KB_AI_MODEL_PRICES).join(', ') };
    }
    const props = PropertiesService.getScriptProperties();
    props.setProperty('KB_AI_DAILY_CAP', String(cap));
    props.setProperty('KB_AI_MODEL', model);
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated KB AI settings: dailyCap=$' + cap + '; model=' + model, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Pure (Node-pinned) — KB row tone: warn when the item is review-due (last
 *  review/edit age ≥ dueDays, or never reviewed/edited), else neutral. Mirrors
 *  the kbGetReviewDue staleness rule (INV-126). */
function adminKbReviewTone_(ageDays, dueDays) {
  if (ageDays == null) return 'warn';
  return ageDays >= dueDays ? 'warn' : '';
}
function kbRowStatus_(v) { return String(v || '').trim().toLowerCase() === KB_STATUS_DRAFT ? KB_STATUS_DRAFT : KB_STATUS_PUBLISHED; }
function getKbSS_() {
  if (typeof _TEST_OVERRIDE_KB_SS_ID !== 'undefined' && _TEST_OVERRIDE_KB_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_KB_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('KB_SS_ID') || CONFIG.KB.SS_ID;
  return SpreadsheetApp.openById(id);
}
function getOrCreateKbSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(CONFIG.KB.TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.KB.TAB);
    sheet.appendRow(sheetSafeRow_(KB_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_HEADERS.length).setFontWeight('bold');
  } else {
    // #4 back-compat — widen the header row if new trailing columns
    // (ReviewedAt/ReviewedBy) were appended to KB_HEADERS since this sheet was
    // provisioned. Code indexes by the KB enum so header names are decorative,
    // but this keeps the sheet self-documenting. One-time + self-healing (the
    // guard passes once migrated) — same "provision on first touch" pattern as
    // getCallNotesSheet_.
    const hdr = sheet.getRange(1, 1, 1, KB_HEADERS.length).getValues()[0];
    if (String(hdr[KB_HEADERS.length - 1]) !== KB_HEADERS[KB_HEADERS.length - 1]) {
      sheet.getRange(1, 1, 1, KB_HEADERS.length).setValues(sheetSafeRows_([KB_HEADERS])).setFontWeight('bold');
    }
  }
  return sheet;
}
function invalidateKbCache_() {
  try { CacheService.getScriptCache().remove(KB_CACHE_KEY); } catch (_) {}
  // Phase A — bump the AI-guidance generation salt so cached guidance built
  // on the pre-edit KB content stops being served (the cache key embeds it).
  try {
    const p = PropertiesService.getScriptProperties();
    const g = parseInt(p.getProperty(KB_AI_GEN_PROP) || '0', 10) || 0;
    p.setProperty(KB_AI_GEN_PROP, String(g + 1));
  } catch (_) {}
}
// Parse a Google Drive/Docs/Sheets share URL into { kind, fileId }. kind ∈
// doc | sheet | file. Returns null when no file id can be extracted.
function kbParseDriveUrl_(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  let m;
  if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/))) return { kind: 'sheet', fileId: m[1] };
  if ((m = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)))     return { kind: 'doc',   fileId: m[1] };
  if ((m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)))        return { kind: 'file',  fileId: m[1] };
  if ((m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/)))                              return { kind: 'file',  fileId: m[1] };
  return null;
}
function kbEmbedUrl_(kind, fileId) {
  const id = encodeURIComponent(String(fileId || ''));
  if (kind === 'sheet') return 'https://docs.google.com/spreadsheets/d/' + id + '/preview';
  if (kind === 'file')  return 'https://drive.google.com/file/d/' + id + '/preview';
  return 'https://docs.google.com/document/d/' + id + '/preview';
}
function kbOpenUrl_(kind, fileId) {
  const id = encodeURIComponent(String(fileId || ''));
  if (kind === 'sheet') return 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  if (kind === 'file')  return 'https://drive.google.com/file/d/' + id + '/view';
  return 'https://docs.google.com/document/d/' + id + '/edit';
}
// ── Rep-callable reads (require an enrolled employee; read-only) ──────────
function getReferenceTree() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const cache = CacheService.getScriptCache();
    let cached = null;
    try { cached = cache.get(KB_CACHE_KEY); } catch (_) {}
    // The cache holds ALL items (incl. drafts, each tagged with status); the
    // draft filter is applied per-viewer below so one cache blob serves both.
    const filterForViewer = function (all) {
      return emp.isAdmin ? all : all.filter(function (it) { return it.status !== KB_STATUS_DRAFT; });
    };
    if (cached) {
      const o = JSON.parse(cached);
      return { items: filterForViewer(o.items || []), isManager: !!emp.isManager, isAdmin: !!emp.isAdmin };
    }
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    const items = [];
    if (last >= 2) {
      const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
      rows.forEach(function (r) {
        if (!r[KB.ID]) return;
        items.push({
          id: String(r[KB.ID]), department: String(r[KB.DEPARTMENT] || 'General'),
          title: String(r[KB.TITLE] || '(untitled)'), type: String(r[KB.TYPE] || 'article'),
          driveKind: String(r[KB.DRIVE_KIND] || ''), sortOrder: Number(r[KB.SORT_ORDER] || 0),
          status: kbRowStatus_(r[KB.STATUS]),   // #4 — 'published' | 'draft'
        });
      });
    }
    items.sort(function (a, b) { return a.department.localeCompare(b.department) || (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title); });
    try { cache.put(KB_CACHE_KEY, JSON.stringify({ items: items }), KB_CACHE_TTL); } catch (_) {}
    return { items: filterForViewer(items), isManager: !!emp.isManager, isAdmin: !!emp.isAdmin };
  } catch (err) { return { error: err.message }; }
}
function getReferenceItem(id) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    id = String(id || '').trim();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { error: 'Not found.' };
    // Cycle-9 L-22: id-column scan + ONE full-row fetch (the getWhatsNew /
    // kbMarkReviewed pattern) — this is the HOTTEST KB path (reader, drawer,
    // training reader, every search Open-¶ jump) and the old full-tab read
    // pulled all 13 columns of every row incl. every article's BodyMd, read
    // volume that grew with total KB body size × opens.
    const ids = sheet.getRange(2, KB.ID + 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) !== id) continue;
      const row = sheet.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
      // #4 — a draft is invisible to reps/non-admins (indistinguishable from
      // not-found so its existence doesn't leak).
      const status = kbRowStatus_(row[KB.STATUS]);
      if (status === KB_STATUS_DRAFT && !emp.isAdmin) return { error: 'Not found.' };
      const type = String(row[KB.TYPE] || 'article');
      const base = { id: id, title: String(row[KB.TITLE] || ''), department: String(row[KB.DEPARTMENT] || ''), status: status };
      if (type === 'embed') {
        const kind = String(row[KB.DRIVE_KIND] || 'doc');
        const fid = String(row[KB.DRIVE_FILE_ID] || '');
        base.type = 'embed'; base.driveKind = kind; base.embedUrl = kbEmbedUrl_(kind, fid); base.openUrl = kbOpenUrl_(kind, fid);
        return base;
      }
      base.type = 'article'; base.bodyMd = String(row[KB.BODY_MD] || '');
      return base;
    }
    return { error: 'Not found.' };
  } catch (err) { return { error: err.message }; }
}
/** Shared anchor slug — MUST stay identical to the client `kbSlug_` in
 *  kb/script_kb.html (kbMd_ stamps id="kb-h-<slug>" on headings; search
 *  results carry the server-computed anchor for the jump-to-section link).
 *  The entity de-escape keeps the two identical even though the client slugs
 *  ESCAPED source (kbMd_ escapes &/</> up front) while the server slugs raw
 *  markdown. Pinned by a Node parity test. */
function kbSlug_(text) {
  return String(text || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
/** PURE: split article markdown into heading-delimited sections —
 *  [{heading, anchor, md}]. `md` EXCLUDES its heading line (chunk cards
 *  render the heading separately). The preamble before the first heading is
 *  a section with heading ''. Headings inside ``` fences don't split (kbMd_
 *  masks fences before its heading rule — same contract). Duplicate-heading
 *  anchors dedupe with -2/-3… in document order, matching kbMd_'s ids. */
function kbSplitSections_(bodyMd) {
  const lines = String(bodyMd || '').split(/\r?\n/);
  const sections = [];
  let cur = { heading: '', anchor: '', md: [] };
  let inFence = false;
  const seen = {};
  const push = function () {
    if (cur.heading || cur.md.join('\n').trim()) {
      sections.push({ heading: cur.heading, anchor: cur.anchor, md: cur.md.join('\n').trim() });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*```/.test(ln)) inFence = !inFence;
    const h = !inFence && ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      push();
      let anchor = kbSlug_(h[2]);
      if (anchor) {
        seen[anchor] = (seen[anchor] || 0) + 1;
        if (seen[anchor] > 1) anchor += '-' + seen[anchor];
      }
      cur = { heading: h[2].trim(), anchor: anchor, md: [] };
    } else {
      cur.md.push(ln);
    }
  }
  push();
  return sections;
}
/** PURE: cap a chunk at a paragraph boundary; repair an odd fence count so a
 *  truncated chunk never renders a runaway <pre>. */
function kbChunkTruncate_(md, cap) {
  md = String(md || '');
  cap = cap || KB_CHUNK_MAX_CHARS;
  if (md.length <= cap) return { md: md, truncated: false };
  let cut = md.lastIndexOf('\n\n', cap);
  if (cut < cap * 0.4) cut = cap;

  // A FENCED BLOCK IS ATOMIC. Cutting inside one used to leave an odd fence,
  // which was "repaired" by appending a closing ``` — turning a half block
  // into a SYNTACTICALLY VALID one. That is the worst outcome available: a
  // truncated ```roster rendered as a confident interactive directory missing
  // 4 of 14 teams (reported "40 people" for a 46-person roster), and a
  // truncated ```snippet would hand a rep a canned response to copy that
  // silently stops mid-sentence. Prose can be cut with a "continues in the
  // article" note; these cannot.
  const opens = [];
  const fenceRe = /^[ \t]*```/gm;
  let m;
  while ((m = fenceRe.exec(md)) !== null) opens.push(m.index);
  let inFence = -1;                       // index of the fence open we are inside
  for (let i = 0; i + 1 < opens.length; i += 2) {
    if (opens[i] < cut && cut <= opens[i + 1]) { inFence = i; break; }
  }
  if (inFence >= 0) {
    const closeIdx = opens[inFence + 1];
    const endOfFence = md.indexOf('\n', closeIdx);
    const whole = endOfFence < 0 ? md.length : endOfFence;
    // Prefer keeping the block WHOLE, bounded so one enormous fence cannot
    // blow the payload; otherwise stop before it started.
    cut = (whole <= cap * KB_CHUNK_FENCE_OVERAGE) ? whole : opens[inFence];
  }
  let out = md.substring(0, cut).trim();
  // DISTINCT CASE: a fence the SOURCE never closes. Truncation did not break
  // that — the article did — so the old repair still applies, and without it
  // the stray ``` renders as literal text.
  if ((out.match(/^[ \t]*```/gm) || []).length % 2 === 1) out += '\n```';
  return { md: out, truncated: cut < md.length };
}
/** PURE: weighted token score for one section. 0 unless the section's own
 *  text (heading or body) matches at least one token — a title-only match
 *  must NOT flood every section of that doc into the results (the caller
 *  emits a single doc-level hit for that case instead).
 *  Weights (operator 2026-08-17 rebalance — with a growing KB the old flat
 *  weights let every section of a title-matching doc outrank the one section
 *  actually ABOUT the query; a 2-token title bonus alone, +6 on each of its
 *  sections, tied or beat a section matching the whole query in its text):
 *   - per token, best location: heading +2, body +1 (unchanged)
 *   - DENSITY: extra body occurrences +1 each, capped +2 per token — a
 *     section about the topic outranks one mentioning it in passing
 *   - COVERAGE: (distinct section-matched tokens − 1) × 3 — matching MORE of
 *     the query dominates matching one word anywhere (deliberately counts
 *     matched tokens rather than requiring the full set, so synonym-expanded
 *     tokens the author never typed can't make full coverage unreachable)
 *   - title: +3 per matching token CAPPED at +4 total — a doc-level signal,
 *     not a per-section one (the uncapped form was the flooding mechanism;
 *     the doc-level title-only hit in searchReference stays uncapped, since
 *     "the doc named exactly this" belongs at the top)
 *   - exact phrase in heading/body: +3 (was +2 — a typed phrase appearing
 *     verbatim is the strongest content signal the scorer sees) */
function kbSearchScore_(tokens, q, titleLc, headLc, bodyLc) {
  let score = 0;
  let matched = 0;
  tokens.forEach(function (t) {
    // Bounded occurrence count in the body (cap 4 — density tops out below).
    let cnt = 0, at = bodyLc.indexOf(t);
    while (at >= 0 && cnt < 4) { cnt++; at = bodyLc.indexOf(t, at + t.length); }
    const headHit = headLc.indexOf(t) >= 0;
    if (headHit) { score += 2; matched++; }
    else if (cnt > 0) { score += 1; matched++; }
    else return;
    // A heading-matched token's body occurrences are ALL extra signal; a
    // body-matched token's first occurrence already scored above.
    score += Math.min(headHit ? cnt : cnt - 1, 2);
  });
  if (!matched) return 0;
  score += (matched - 1) * 3;
  let title = 0;
  tokens.forEach(function (t) { if (titleLc.indexOf(t) >= 0) title += 3; });
  score += Math.min(title, 4);
  if (q.length >= 4 && (headLc.indexOf(q) >= 0 || bodyLc.indexOf(q) >= 0)) score += 3;
  return score;
}
function searchReference(query, opts) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    // F(M-12): publishedOnly forces the draft skip REGARDLESS of caller role.
    // Public-callable and narrowing-only, so it can't widen anyone's access.
    // Used by kbGetFacetGuidance — its result caches ORG-WIDE (no viewer role
    // in the key), so admin-triggered retrieval must never include drafts or
    // reps get guidance text + source titles derived from unpublished content.
    const publishedOnly = !!(opts && opts.publishedOnly);
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return { results: [] };
    const tokens = [];
    (q.match(/[a-z0-9]{2,}/g) || []).forEach(function (t) { if (tokens.indexOf(t) < 0) tokens.push(t); });
    if (!tokens.length) return { results: [] };
    kbExpandSynonymTokens_(tokens);   // #8 — pull in synonym-group siblings
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { results: [] };
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    const hits = [];
    const snippetOf = function (md) {
      return md.replace(/[#*`>|\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120);
    };
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i][KB.ID]) continue;
      // #4 — drafts never surface in search to non-admins (nor to ANY caller
      // when publishedOnly is forced — the org-wide-cached AI retrieval path).
      // C17 batch-5: hits now CARRY the status — an admin's search showed a
      // draft chunk identically to a published one, inviting share/assign of
      // unpublished content believed live (rep responses only ever contain
      // 'published', so the field leaks nothing).
      const status = kbRowStatus_(rows[i][KB.STATUS]);
      if (status === KB_STATUS_DRAFT && (publishedOnly || !emp.isAdmin)) continue;
      const id = String(rows[i][KB.ID]);
      const title = String(rows[i][KB.TITLE] || '');
      const dept = String(rows[i][KB.DEPARTMENT] || '');
      const type = String(rows[i][KB.TYPE] || 'article');
      const titleLc = title.toLowerCase();
      let titleScore = 0;
      tokens.forEach(function (t) { if (titleLc.indexOf(t) >= 0) titleScore += 3; });
      if (type === 'embed') {
        // No stored content to chunk — title-only hit.
        if (titleScore > 0) {
          hits.push({ id: id, title: title, department: dept, type: 'embed', status: status,
            heading: '', anchor: '', chunkMd: '', truncated: false, score: titleScore, snippet: '' });
        }
        continue;
      }
      const sections = kbSplitSections_(String(rows[i][KB.BODY_MD] || ''));
      const secHits = [];
      sections.forEach(function (s) {
        const score = kbSearchScore_(tokens, q, titleLc, s.heading.toLowerCase(), s.md.toLowerCase());
        if (score > 0) secHits.push({ section: s, score: score });
      });
      if (!secHits.length) {
        if (titleScore > 0) {
          hits.push({ id: id, title: title, department: dept, type: 'article', status: status,
            heading: '', anchor: '', chunkMd: '', truncated: false, score: titleScore, snippet: '' });
        }
        continue;
      }
      secHits.sort(function (a, b) { return b.score - a.score; });
      secHits.slice(0, KB_SEARCH_MAX_PER_ITEM).forEach(function (sh) {
        const cut = kbChunkTruncate_(sh.section.md, KB_CHUNK_MAX_CHARS);
        hits.push({ id: id, title: title, department: dept, type: 'article', status: status,
          heading: sh.section.heading, anchor: sh.section.anchor,
          chunkMd: cut.md, truncated: cut.truncated, score: sh.score,
          snippet: snippetOf(cut.md) });
      });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    if (hits.length > KB_SEARCH_MAX_RESULTS) hits.length = KB_SEARCH_MAX_RESULTS;
    return { results: hits, sectioned: true };
  } catch (err) { return { error: err.message }; }
}
// #8 — search synonym groups. Read the Script Property, sanitize to an array of
// ≥2-term lowercase groups (never throws — corrupt blob degrades to []).
function getKbSearchSynonyms_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(KB_SYNONYMS_PROP);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const groups = [];
    parsed.forEach(function (g) {
      if (!Array.isArray(g)) return;
      const terms = [];
      g.forEach(function (t) {
        const s = String(t == null ? '' : t).trim().toLowerCase();
        if (s && terms.indexOf(s) < 0) terms.push(s);
      });
      if (terms.length >= 2) groups.push(terms);
    });
    return groups;
  } catch (e) { return []; }
}
/** #8 — expand a query's token set in place: if any token is in a synonym group,
 *  pull in the group's other tokens (multi-word terms split into alnum tokens),
 *  capped at KB_SEARCH_TOKENS_MAX. So "cpap" also matches "pap". */
function kbExpandSynonymTokens_(tokens) {
  const groups = getKbSearchSynonyms_();
  if (!groups.length) return tokens;
  const have = {}; tokens.forEach(function (t) { have[t] = 1; });
  groups.forEach(function (g) {
    const set = [];
    g.forEach(function (term) {
      (term.match(/[a-z0-9]{2,}/g) || []).forEach(function (tk) { if (set.indexOf(tk) < 0) set.push(tk); });
    });
    if (!set.some(function (tk) { return have[tk]; })) return;   // no query token in this group
    set.forEach(function (tk) {
      if (!have[tk] && tokens.length < KB_SEARCH_TOKENS_MAX) { tokens.push(tk); have[tk] = 1; }
    });
  });
  return tokens;
}
/** #8 — admin-gated read/write of the search synonym groups. */
function kbGetSearchConfig() {
  const emp = getEmployeeInfo_();
  if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
  return { synonyms: getKbSearchSynonyms_(), propBudget: propBudgetsFor_([KB_SYNONYMS_PROP]), propValueMax: PROP_VALUE_MAX };
}
function kbSaveSearchConfig(groups) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(groups)) return { success: false, error: 'Invalid synonyms.' };
    if (groups.length > KB_SYNONYM_GROUPS_MAX) return { success: false, error: 'Too many synonym groups (max ' + KB_SYNONYM_GROUPS_MAX + ').' };
    const clean = [];
    for (let i = 0; i < groups.length; i++) {
      if (!Array.isArray(groups[i])) continue;
      const terms = [];
      for (let j = 0; j < groups[i].length && terms.length < KB_SYNONYM_TERMS_MAX; j++) {
        const s = String(groups[i][j] == null ? '' : groups[i][j]).trim().toLowerCase().substring(0, KB_SYNONYM_TERM_MAXLEN);
        if (s && terms.indexOf(s) < 0) terms.push(s);
      }
      if (terms.length >= 2) clean.push(terms);   // a group needs ≥2 terms to be meaningful
    }
    propSetBounded_(KB_SYNONYMS_PROP, JSON.stringify(clean), { hint: 'remove a synonym group' });
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0, 'KB search synonyms: ' + clean.length + ' group(s)', emp.email);
    return { success: true, synonyms: clean };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function getOrCreateKbViewsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_VIEWS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_VIEWS_TAB);
    sheet.appendRow(sheetSafeRow_(KB_VIEWS_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_VIEWS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** Rep-callable, append-only, locked (INV-01). Records one view event —
 *  PHI-free by construction (itemId + repId + a sanitized context token).
 *  The client fires it best-effort; an error here never surfaces. */
function kbRecordView(itemId, context) {
  // Batch K (B) — USER lock, not the global script lock: an append-only
  // fire-and-forget usage log (KbViews) must never make punch/note writes
  // wait. Same rationale as recordClientError; appendRow is atomic and the
  // user lock still serializes one rep's double-fires.
  const lock = LockService.getUserLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const id = String(itemId || '').trim().substring(0, 100);
    if (!id) return { success: false, error: 'Missing item id.' };
    const ctx = String(context || '').replace(/[^a-zA-Z0-9:_-]/g, '').substring(0, 40);
    getOrCreateKbViewsSheet_().appendRow(sheetSafeRow_([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), id, emp.id, ctx,
    ]));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated, read-only. Top KB_USAGE_TOP_N items by opens in the last
 *  KB_USAGE_WINDOW_DAYS, with the in-call (drawer) share broken out. Bounded
 *  tail scan of KbViews (the tab is append-only/chronological). Timestamp
 *  cells are Sheets-coerced Dates — recovered in the KB spreadsheet's OWN tz
 *  (the tz that coerced them; same discipline as normalizeAuditTs_). */
/** KbViews open-counts per item id over the last `windowDays`. Bounded tail
 *  scan (KB_VIEWS_MAX_SCAN). Returns { id: {count, drawerCount} } (empty map
 *  when the tab is missing/empty or on any failure). Shared by kbGetUsageStats
 *  and kbGetReviewDue (#4 prioritizes review-due items by usage). */
function kbUsageCounts_(windowDays) {
  const out = {};
  let unavailable = false;   // F-25: a failed read is NOT an empty map
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_VIEWS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { map: out, unavailable: false };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_VIEWS_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_VIEWS_HEADERS.length).getValues();
    const cutD = new Date();
    cutD.setDate(cutD.getDate() - windowDays);
    // L-5 — build the cutoff in the KB spreadsheet's OWN tz, the same tz the
    // coerced-Date row timestamps are recovered in below; mixing tzs here
    // could shift the 30-day boundary by a day for rows near the edge.
    const cutoff = fmtDateTz_(cutD, ssTz);
    for (let i = 0; i < data.length; i++) {
      const tsRaw = (data[i][0] instanceof Date)
        ? Utilities.formatDate(data[i][0], ssTz, 'yyyy-MM-dd')
        : String(data[i][0] || '').substring(0, 10);
      if (tsRaw < cutoff) continue;
      const id = String(data[i][1] || '').trim();
      if (!id) continue;
      if (!out[id]) out[id] = { count: 0, drawerCount: 0 };
      out[id].count++;
      if (String(data[i][3] || '').indexOf('drawer') === 0) out[id].drawerCount++;
    }
  } catch (e) { unavailable = true; }   // F-25: carried, never rendered as "none"
  return { map: out, unavailable: unavailable };
}
/** #7 PURE (Node-pinned) — "See also" from co-views. `events` is
 *  [{rep, day, id}] (KbViews rows). Two items are co-viewed when they appear in
 *  the same (rep, day) session; the score is the count of DISTINCT sessions that
 *  co-viewed them with `targetId`. Returns [{id, coviews}] with coviews ≥
 *  minCoviews, ranked desc, capped topN. Below the threshold it's silent, so
 *  thin data shows nothing rather than spurious links. */
function kbCoViewRelated_(events, targetId, minCoviews, topN) {
  minCoviews = minCoviews || 2; topN = topN || 5;
  targetId = String(targetId || '');
  const sessions = {};   // (rep|day) → { id: 1 }  (distinct ids per session)
  (events || []).forEach(function (e) {
    if (!e) return;
    const id = String(e.id || '');
    if (!id) return;
    const key = String(e.rep || '') + '|' + String(e.day || '');
    if (!sessions[key]) sessions[key] = {};
    sessions[key][id] = 1;
  });
  const counts = {};
  Object.keys(sessions).forEach(function (key) {
    const ids = sessions[key];
    if (!ids[targetId]) return;
    Object.keys(ids).forEach(function (id) {
      if (id === targetId) return;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .filter(function (id) { return counts[id] >= minCoviews; })
    .map(function (id) { return { id: id, coviews: counts[id] }; })
    .sort(function (a, b) { return (b.coviews - a.coviews) || a.id.localeCompare(b.id); })
    .slice(0, topN);
}
/** #7 — "See also" for the reader. Rep-callable, read-only, bounded KbViews tail
 *  scan. Ranks co-viewed items via the pure kbCoViewRelated_, joins titles from
 *  the KB sheet, drops deleted items + (for non-admins) drafts. PHI-free. */
function kbGetRelated(itemId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const targetId = String(itemId || '').trim();
    if (!targetId) return { items: [] };
    const ss = getKbSS_();
    const viewsSheet = ss.getSheetByName(KB_VIEWS_TAB);
    if (!viewsSheet || viewsSheet.getLastRow() < 2) return { items: [] };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = viewsSheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_VIEWS_MAX_SCAN + 1);
    const data = viewsSheet.getRange(startRow, 1, lastRow - startRow + 1, KB_VIEWS_HEADERS.length).getValues();
    const events = [];
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][1] || '').trim();
      if (!id) continue;
      const day = (data[i][0] instanceof Date)
        ? Utilities.formatDate(data[i][0], ssTz, 'yyyy-MM-dd')
        : String(data[i][0] || '').substring(0, 10);
      events.push({ rep: String(data[i][2] || ''), day: day, id: id });
    }
    const related = kbCoViewRelated_(events, targetId, KB_RELATED_MIN_COVIEWS, KB_RELATED_TOP);
    if (!related.length) return { items: [] };
    const kbSheet = getOrCreateKbSheet_();
    const kbLast = kbSheet.getLastRow();
    const meta = {};
    if (kbLast >= 2) {
      // C9 (cycle 10): column-bound the title join (the L-16 projection
      // pattern) — this rep-callable path ran on EVERY reader open and pulled
      // the full KB width including every article's BodyMd, when it needs
      // only Id/Dept/Title/Type + Status. Two bounded reads, no body cells.
      const head = kbSheet.getRange(2, KB.ID + 1, kbLast - 1, KB.TYPE + 1).getValues();
      const statusCol = kbSheet.getRange(2, KB.STATUS + 1, kbLast - 1, 1).getValues();
      head.forEach(function (r, i) {
        const id = String(r[KB.ID] || '');
        if (!id) return;
        meta[id] = { title: String(r[KB.TITLE] || '(untitled)'), department: String(r[KB.DEPARTMENT] || ''),
          type: String(r[KB.TYPE] || 'article'), status: kbRowStatus_(statusCol[i][0]) };
      });
    }
    const items = [];
    related.forEach(function (rel) {
      const m = meta[rel.id];
      if (!m) return;   // deleted item drops out
      if (m.status === KB_STATUS_DRAFT && !emp.isAdmin) return;   // draft hidden from reps
      items.push({ id: rel.id, title: m.title, department: m.department, type: m.type, coviews: rel.coviews });
    });
    return { items: items };
  } catch (err) { return { error: err.message }; }
}
/** Pure (Node-pinned): score a payor name against query tokens. 0 = no
 *  match. Whole-query substring dominates, then all-tokens-present, then
 *  per-token hits; earlier match position breaks ties. */
function insPayorScore_(name, query) {
  const n = String(name || '').toLowerCase();
  const q = String(query || '').toLowerCase().trim();
  if (!n || !q) return 0;
  let score = 0;
  const pos = n.indexOf(q);
  if (pos >= 0) score += 100 - Math.min(50, pos);   // whole query as a substring
  const toks = q.split(/\s+/).filter(function (t) { return t.length >= 2; });
  if (!toks.length) return score;
  let hits = 0;
  toks.forEach(function (t) { if (n.indexOf(t) >= 0) { hits++; score += 10; } });
  if (hits === toks.length) score += 30;            // every token present
  return score;
}
/** PURE (Node-pinned): the ONE HCPCS tokenizer. Both operator tables name the
 *  same equipment in the same billing vocabulary — the payor sheet as COLUMN
 *  HEADERS (`K0800`, `K0801`), the pricing sheet as a code CELL (`K0800 (C/C)`)
 *  — and that shared vocabulary is the only join key the two tables have.
 *
 *  Returns `{ raw, shaped, certain, tokens }`.
 *
 *  **`tokens` is populated ONLY on the certain path**, which is the safety rule
 *  expressed as a shape rather than as a warning: a consumer cannot assert
 *  coverage from an uncertain parse, because there is nothing there to assert
 *  from.
 *
 *  **The shorthand is a CONFIRMED rule, in exactly one shape.** The operator
 *  writes `K0821/23/16`. Until 2026-09-22 this refused, because `23` and `16`
 *  were codes by no rule we could defend, and guessing would tell a rep a
 *  payor covers an item it may not (g41). The operator then confirmed the
 *  rule: it means K0821, K0823 and K0816 — each digit fragment replaces that
 *  many TRAILING digits of the code before it. That is now a rule we can
 *  defend, so it is applied — but only to the shape that was confirmed: ONE
 *  whole code, FIRST, with no modifier suffix, followed only by 1–3-digit
 *  fragments. Everything else still refuses — a fragment before any code, a
 *  fragment beside two whole codes (which code would it abbreviate?), a
 *  modifier-suffixed anchor, and a range like `K0800-K0803`. Widening any of
 *  those needs the operator's word the way this one got it, not a reading.
 *  An uncertain string still keeps its RAW text for the client to show.
 *
 *  `shaped` separates "a code column we would not parse" from "not a code
 *  column at all" (`Category`, `Comments`), so the client can say WHICH.
 *
 *  A parenthetical is a qualifier, never a code — `K0800 (C/C)` is one code.
 *
 *  SELF-CONTAINED on purpose: the whole rule, including the code shape, is
 *  inside this one function, so a pin that loads it alone really exercises the
 *  rule rather than a fragment of it. */
function hcpcsParse_(raw) {
  const text = String(raw == null ? '' : raw).trim();
  const out = { raw: text, shaped: false, certain: false, tokens: [] };
  const s = text.toUpperCase();
  if (!s) return out;
  out.shaped = /[A-Z]\d{4}/.test(s);
  if (!out.shaped) return out;
  let parts = s.replace(/\([^)]*\)/g, ' ').split(/[/,;&+\s]+/).filter(function (p) { return p; });
  if (!parts.length) return out;
  // The confirmed shorthand (operator, 2026-09-22): `K0821/23/16` is K0821,
  // K0823, K0816. Expanded ONLY in its confirmed shape — one bare whole code
  // first, then nothing but 1–3-digit fragments. Any other string carrying a
  // fragment refuses whole, exactly as before.
  if (parts.some(function (p) { return /^\d{1,3}$/.test(p); })) {
    const anchor = parts[0];
    if (!/^[A-Z]\d{4}$/.test(anchor)) return out;
    for (let j = 1; j < parts.length; j++) {
      if (!/^\d{1,3}$/.test(parts[j])) return out;
    }
    parts = [anchor].concat(parts.slice(1).map(function (f) {
      return anchor.slice(0, anchor.length - f.length) + f;
    }));
  }
  for (let i = 0; i < parts.length; i++) {
    // One unreadable fragment refuses the WHOLE string. Keeping the readable
    // ones would under-claim rather than over-claim, which sounds safer and is
    // not: the rep asked about an item and would be answered about a different
    // one, silently.
    if (!/^[A-Z]\d{4}[A-Z0-9]{0,2}$/.test(parts[i])) return out;
  }
  const seen = {};
  parts.forEach(function (p) { if (!seen[p]) { seen[p] = 1; out.tokens.push(p); } });
  out.certain = true;
  return out;
}

/** The code → item-name index over the pricing tab, for naming the payor
 *  sheet's bare code columns. Read live, like every other OopPricing read.
 *
 *  Built only when a payor result actually carries code-shaped columns, so a
 *  payor with none costs nothing.
 *
 *  A row whose code does not parse CERTAINLY never enters the index — the same
 *  refusal as `hcpcsParse_`, on the other side of the join. A token that names
 *  more than one item keeps BOTH names rather than picking one: the caller
 *  declines to name it and says how many, which is the honest answer to an
 *  ambiguity the spreadsheet allows and cannot resolve.
 *
 *  Returns `{ byToken, error }` — the error is PASSED THROUGH rather than
 *  swallowed, because a payor lookup whose join silently degraded to bare codes
 *  looks exactly like a payor sheet that has no item names to give (g53: a
 *  best-effort overlay whose ABSENCE is reassuring must announce itself). */
function oopCodeIndex_() {
  try {
    const sh = oopSheet_();
    const last = Math.min(sh.getLastRow(), OOP_MAX_ROWS + 1);
    if (last < 2) return { byToken: {}, error: '' };
    const width = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
    const rows = sh.getRange(2, 1, last - 1, width).getDisplayValues();
    const byToken = {};
    for (let i = 0; i < rows.length; i++) {
      const o = oopRowObj_(headers, rows[i]);
      if (!o.name || !o.code) continue;
      const p = hcpcsParse_(o.code);
      if (!p.certain) continue;
      p.tokens.forEach(function (t) {
        if (!byToken[t]) byToken[t] = [];
        if (byToken[t].indexOf(o.name) < 0) byToken[t].push(o.name);
      });
    }
    return { byToken: byToken, error: '' };
  } catch (err) { return { byToken: {}, error: String(err.message || err) }; }
}

/** PURE (Node-pinned): name ONE payor detail entry from the code index.
 *
 *  Mutates and returns the entry, adding `code` (the parse) and, when the join
 *  is unambiguous, `item`. `itemCount` is always set so the client can tell
 *  "no item carries this code" from "two do" without re-deriving either. */
function insNameCodeDetail_(d, byToken) {
  const p = hcpcsParse_(d.label);
  d.code = { shaped: p.shaped, certain: p.certain, tokens: p.tokens };
  d.item = '';
  d.itemCount = 0;
  if (!p.certain) return d;
  const names = [];
  p.tokens.forEach(function (t) {
    (byToken[t] || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
  });
  d.itemCount = names.length;
  if (names.length === 1) d.item = names[0];
  return d;
}

/** Pure (Node-pinned): one payor row → the result object, columns resolved by
 *  header name. Unmatched non-empty headers become generic details entries. */
function insPayorRowObj_(headers, row) {
  const out = { name: String(row[0] == null ? '' : row[0]).trim(), waystar: '', networkStatus: '', qualification: '', reimbursement: '', details: [] };
  for (let c = 1; c < headers.length; c++) {
    const h = String(headers[c] == null ? '' : headers[c]).trim();
    if (!h) continue;
    const v = String(row[c] == null ? '' : row[c]).trim();
    if (/waystar/i.test(h)) out.waystar = v;
    else if (/network/i.test(h)) out.networkStatus = v;
    else if (/qualif/i.test(h)) out.qualification = v;   // the source header is misspelled "Qualifaction" — match the stem
    else if (/reimbur/i.test(h)) out.reimbursement = v;
    else if (v) out.details.push({ label: h, value: v });
  }
  return out;
}
// ════════════════════════════════════════════════════════════════════════════
//  OOP PRICING LOOKUP (operator 2026-09-16) — the NINTH store, read LIVE
// ════════════════════════════════════════════════════════════════════════════

/** The pricing table: a NAMED TAB in the KB store, the `InsurancePayors`
 *  pattern exactly (same store, same class, same maintainer, and the search
 *  below already reuses that lookup's scorer).
 *
 *  NAMED, not "the first sheet". The first version of this reader lived in a
 *  spreadsheet of its own and took `getSheets()[0]`, which was fine while the
 *  file existed for one purpose — and would have failed SILENTLY the moment it
 *  moved, because columns are discovered by header: it would have found the KB
 *  tab, matched no `price` header, and rendered every row blank rather than
 *  throwing. A missing tab says exactly what to create. */
function oopSheet_() {
  const sh = getKbSS_().getSheetByName(OOP_PRICING_TAB);
  if (!sh) {
    throw new Error('OOP pricing is not set up yet — create a tab named "' + OOP_PRICING_TAB +
      '" in the KB spreadsheet, with the item name in column A.');
  }
  return sh;
}

/** PURE (Node-pinned): what ROLE a header column plays, or '' for none.
 *
 *  Header-name discovery rather than fixed positions, because the operator owns
 *  the file and may reorder it — the same reason searchInsurancePayors matches
 *  `waystar|network|qualif|reimbur` on the stem rather than the exact string.
 *
 *  ORDER IS LOAD-BEARING IN THREE PLACES, none of them obvious:
 *
 *   1. `effective` before `price` — "Effective Price Date" contains both stems
 *      and the date reading is the safe one; mistaking a date column for the
 *      price would put a date in front of a customer as a dollar figure.
 *   2. `price` before `name` — "Item Price" contains the item stem, and reading
 *      a money column as the product name would make every row unsearchable
 *      AND put a price where the name belongs.
 *   3. `code` before `name` — a header like "Item Code" is the code.
 *
 *  `name` and `code` were added 2026-09-16 when the operator supplied their real
 *  header row. The reader had ASSUMED column A was the item name; theirs is
 *  `HCPCS`, with the item in column C — so every search by product name scored
 *  zero and the composer would have quoted a billing code to a customer. */
function oopHeaderRole_(header) {
  const h = String(header == null ? '' : header).trim();
  if (!h) return '';
  if (/effective|as[\s_-]*of/i.test(h)) return 'effective';
  if (/area|eligib|region|territor/i.test(h)) return 'eligibility';
  if (/price|cost|oop|amount|charge|\$/i.test(h)) return 'price';
  if (/hcpcs|\bcode\b|\bsku\b|catalog|part\s*(no|num|#)/i.test(h)) return 'code';
  if (/^\s*(item|product|equipment|device|name|description)\b/i.test(h)) return 'name';
  // An image column is RECOGNISED so it can be DROPPED. Left unrecognised it
  // rides along as a "detail" beside the price, and the first time the operator
  // fills it the rep sees a raw Drive URL in a price result.
  if (/^\s*(image|photo|picture|thumbnail|img)\b/i.test(h)) return 'image';
  return '';
}

/** PURE (Node-pinned): which column holds the item NAME.
 *
 *  Returns the index of the first `name`-role header, or 0 when there is none —
 *  the original contract (column A is the item) kept as the fallback, because a
 *  single-purpose sheet with a bare "Item" in A1 has no name header to find and
 *  must keep working.
 *
 *  Reported by the diagnostics. That is not decoration: against the operator's
 *  real sheet the diagnostics said `missing: []` and read CLEAN while every
 *  lookup returned nothing, because the one assumption that was wrong was the
 *  one it never showed. */
function oopNameCol_(headers) {
  for (let c = 0; c < (headers || []).length; c++) {
    if (oopHeaderRole_(headers[c]) === 'name') return c;
  }
  return 0;
}

/** PURE (Node-pinned): one pricing row → the result object.
 *
 *  `prices` is EVERY price-role column in sheet order, each with its header as
 *  the label, because the operator's sheet carries three customer-facing totals
 *  for one item — pick-up, with shipping, with tech delivery. Collapsing them to
 *  one number is not a simplification, it is a wrong quote: the base price is
 *  correct only for a customer collecting in person. `price` remains the FIRST
 *  of them, which is what a single-price sheet has and what the eligibility
 *  surface shows.
 *
 *  Anything unrecognised rides along in `details` VERBATIM — an unknown column
 *  is shown, never dropped and never guessed at (the payor-row discipline,
 *  INV-169's spirit). `image` is the one deliberate exception. */
function oopRowObj_(headers, row) {
  const nameCol = oopNameCol_(headers);
  const out = { name: String(row[nameCol] == null ? '' : row[nameCol]).trim(),
    code: '', price: '', prices: [], eligibility: '', effective: '', details: [] };
  for (let c = 0; c < headers.length; c++) {
    if (c === nameCol) continue;
    const h = String(headers[c] == null ? '' : headers[c]).trim();
    if (!h) continue;
    const v = String(row[c] == null ? '' : row[c]).trim();
    const role = oopHeaderRole_(h);
    if (role === 'image') continue;
    if (role === 'price') { if (v) out.prices.push({ label: h, value: v }); }
    else if (role === 'code' && !out.code) out.code = v;
    else if (role === 'eligibility' && !out.eligibility) out.eligibility = v;
    else if (role === 'effective' && !out.effective) out.effective = v;
    else if (v) out.details.push({ label: h, value: v });
  }
  out.price = out.prices.length ? out.prices[0].value : '';
  // The join key, parsed HERE so both OOP surfaces carry it from the ONE row
  // resolver — the g126 discipline that R-1 applied to the price list applies
  // to this for the same reason: a second parse is a second thing to drift.
  out.codes = hcpcsParse_(out.code);
  return out;
}

/** PURE (Node-pinned): the price entry a quote claims, by LABEL.
 *
 *  A quote names the column it came from, so re-verification compares the price
 *  the customer was actually shown rather than whichever column happens to be
 *  leftmost today. Without this, editing "W/ Shipping Cost" would not refuse a
 *  send quoting it, and editing the base price WOULD refuse one quoting
 *  shipping — both wrong, in opposite directions.
 *
 *  A blank label means a single-price sheet: the first entry. */
function oopPriceByLabel_(prices, label) {
  const list = prices || [];
  const l = String(label == null ? '' : label).trim();
  if (!l) return list.length ? list[0] : null;
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].label).trim() === l) return list[i];
  }
  return null;
}

/** Rep-callable, read-only, no lock. Top-N item matches for a query.
 *
 *  Scores through `insPayorScore_` — the SAME scorer the payor lookup uses,
 *  reused rather than copied: two scorers for two lookups is two things to keep
 *  in step, and nobody would notice them diverging.
 *
 *  Scans the item NAME and the CODE, taking the better of the two, because a rep
 *  mid-call has whichever the customer gave them. Before 2026-09-16 it scanned
 *  column A only; against the operator's real sheet that is `HCPCS`, so a search
 *  for "Drive Scout" scored 0 and rendered the deliberate "not in the sheet"
 *  refusal about an item that was in the sheet.
 *
 *  FAILURE POSTURE, inherited deliberately: a wrong price is a billing error, so
 *  the failure mode is "no match" (visible) and never a confident wrong number.
 *  Ties and near-misses ride along so the REP judges ambiguity. */
/** PURE (Node-pinned): the ONE match score for an OopPricing row — the item
 *  NAME or the CODE, whichever scores higher. Both `searchOopPricing` and
 *  `checkOopEligibility` call this; before 2026-09-17 the eligibility check
 *  still scored `rows[i][0]` (the HCPCS column on the operator's sheet), so a
 *  filtered eligibility query returned "No item matched" for a listed item —
 *  the OOP-C defect again, on the second surface. Two readers of one operator
 *  sheet share ONE resolver (`oopRowObj_`) and ONE scorer (this). */
function oopMatchScore_(o, q) {
  if (!o) return 0;
  return Math.max(o.name ? insPayorScore_(o.name, q) : 0, o.code ? insPayorScore_(o.code, q) : 0);
}
function searchOopPricing(query) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const q = String(query || '').trim();
    if (q.length < 2) return { matches: [], total: 0 };
    const sh = oopSheet_();
    const last = Math.min(sh.getLastRow(), OOP_MAX_ROWS + 1);
    if (last < 2) return { matches: [], total: 0, notFound: true };
    const width = sh.getLastColumn();
    // getDisplayValues throughout — the operator's sheet formats a price the way
    // they mean it to read, and reinterpreting a foreign-authored cell is the
    // INV-64 mistake. A currency cell handed back as a raw float would show a
    // customer a different number than the sheet does.
    const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
    const rows = sh.getRange(2, 1, last - 1, width).getDisplayValues();
    const scored = [];
    for (let i = 0; i < rows.length; i++) {
      const o = oopRowObj_(headers, rows[i]);
      if (!o.name && !o.code) continue;                 // a blank row is not a miss
      const sc = oopMatchScore_(o, q);
      if (sc > 0) scored.push({ i: i, score: sc, o: o });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    const matches = scored.slice(0, OOP_TOP).map(function (t) { return t.o; });
    return { matches: matches, total: scored.length, notFound: scored.length === 0,
      cap: OOP_TOP, truncated: sh.getLastRow() > OOP_MAX_ROWS + 1 };
  } catch (err) { return { error: 'OOP pricing lookup failed: ' + err.message }; }
}

/** PURE (Node-pinned): the ONE canonical rendering of a quoted price, used by
 *  the composer picker to build the line it inserts AND by the send to rebuild
 *  that line from LIVE sheet data. The two must agree character for character —
 *  that is not a coincidence to preserve, it IS the verification: the send
 *  refuses unless the message still contains the line this function derives
 *  from the sheet as it reads right now.
 *
 *  The price is rendered VERBATIM as the sheet displays it. We do not add a
 *  currency symbol, pad decimals or reformat: the operator's cell is how they
 *  mean the number to read, and a price in front of a paying customer is the
 *  last place to improve on their formatting (the getDisplayValues discipline
 *  this whole reader is built on). */
function oopQuoteLine_(name, price, effective, label) {
  const n = String(name == null ? '' : name).trim();
  const p = String(price == null ? '' : price).trim();
  const e = String(effective == null ? '' : effective).trim();
  const l = String(label == null ? '' : label).trim();
  if (!n || !p) return '';
  // The LABEL is the operator's own column header, VERBATIM, for the same
  // reason the price is: inventing friendlier wording for "W/ Tech Delivery
  // Cost" means guessing at what they meant, in an email a customer pays
  // against. A single-price sheet passes no label and reads exactly as before.
  return n + (l ? ' (' + l + ')' : '') + ' \u2014 ' + p +
    (e ? ' (price effective ' + e + ')' : '');
}

/** Re-verify every price line the composer says it inserted, against the sheet
 *  as it reads AT SEND TIME. Returns `{ error }` to refuse the send, or
 *  `{ quoted: [{name, price, effective, line}] }` on success.
 *
 *  WHY this exists, and why it refuses rather than warns: the operator's answer
 *  on 2026-09-16 was that a quoted price IS a commitment — the rep processes
 *  payment on the same call. So three things must be true of a number in a sent
 *  email, and none of them is true without this function:
 *
 *   1. It came from the sheet, not from a rep's typing. The picker inserts it,
 *      but a textarea is a textarea; nothing stops an edit afterwards.
 *   2. It is still the price. A lookup at 10:02 and a send at 10:40 can
 *      straddle an operator edit, and the failure — a rep collecting a
 *      superseded price — is discovered from the customer, never from the app.
 *   3. It is auditable. The sheet will have moved on by the time anyone
 *      disputes the charge, so the row this send writes is the ONLY
 *      reconstruction of what the customer was told.
 *
 *  FAIL DIRECTION (g41 — it is chosen, not inherited): CLOSED. An unreadable
 *  store, a vanished item, a changed price and an edited line all REFUSE, with
 *  a message saying which. The alternative — send anyway, note it in the audit —
 *  trades a blocked send for a wrong commitment, which is the trade this
 *  feature exists to refuse.
 *
 *  A quote whose line is NO LONGER IN THE MESSAGE at all and whose price is
 *  unchanged is not an error: the rep inserted it, thought better of it and
 *  deleted it. It is dropped from the audit, because nothing was quoted. */
function oopVerifyQuotes_(quotes, message) {
  const list = Array.isArray(quotes) ? quotes : [];
  if (!list.length) return { quoted: [] };
  if (list.length > OOP_QUOTE_MAX) {
    return { error: 'Too many price lines on one email (max ' + OOP_QUOTE_MAX + ').' };
  }
  const body = String(message == null ? '' : message);

  let sh, headers, rows, width;
  try {
    sh = oopSheet_();
    width = sh.getLastColumn();
    const last = Math.min(sh.getLastRow(), OOP_MAX_ROWS + 1);
    if (last < 2) return { error: 'The OOP pricing sheet is empty — the quoted price could not be verified.' };
    headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
    rows = sh.getRange(2, 1, last - 1, width).getDisplayValues();
  } catch (err) {
    // Deliberately NOT a best-effort skip. An unreachable pricing store at send
    // time means the number in this email is unverified, and an unverified
    // commitment is the thing we refuse (g53's rule, applied to a price).
    return { error: 'The OOP pricing sheet could not be read, so the quoted price could not be verified: ' + err.message };
  }

  // Keyed by the header-discovered NAME column — the same column the picker's
  // `searchOopPricing` match carried as `name`. Until 2026-09-17 this keyed on
  // column A, which on the operator's real sheet is HCPCS, so `byName` held
  // billing codes and EVERY quoted send was refused with "no longer lists" for
  // an item that was listed. The fail direction was closed (no wrong price
  // shipped), but the feature was dead. Two readers of one operator sheet
  // share ONE column resolver: oopNameCol_.
  const nameCol = oopNameCol_(headers);
  // K7 (cycle 22): EVERY row carrying a name, not the first. Two rows can
  // share an item name (the same product under two HCPCS codes, or a pick-up
  // and a delivered SKU), and keying on the first meant a price the picker
  // offered from the second could never be sent: the send compared it with the
  // wrong row and refused it as "changed". The quote now names its code, and
  // a line is verified if ANY row that could have produced it still does.
  const byName = {};
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i][nameCol] == null ? '' : rows[i][nameCol]).trim().toLowerCase();
    if (key) (byName[key] = byName[key] || []).push(rows[i]);
  }

  const out = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i] || {};
    const name = String(q.name == null ? '' : q.name).trim();
    if (!name) continue;
    let cands = (byName[name.toLowerCase()] || []).map(function (r) { return oopRowObj_(headers, r); });
    const code = String(q.code == null ? '' : q.code).trim().toLowerCase();
    if (code && cands.length) {
      cands = cands.filter(function (o) {
        const codes = [String(o.code || '')].concat(o.codes || []).map(function (c) { return String(c || '').trim().toLowerCase(); });
        return codes.indexOf(code) >= 0;
      });
    }
    if (!cands.length) {
      return { error: 'The pricing sheet no longer lists "' + name + '"' + (code ? ' (' + q.code + ')' : '') +
        '. Re-check the price before sending.' };
    }
    // Resolve the price BY THE LABEL the quote names, not by whichever column is
    // leftmost today. A sheet with pick-up / shipped / tech-delivery totals has
    // several right answers per item, and comparing the wrong one refuses in
    // BOTH directions: an edit to the column actually quoted would sail
    // through, while an edit to a column nobody quoted would block an honest
    // send.
    const label = String(q.label == null ? '' : q.label).trim();
    const claimed = String(q.price == null ? '' : q.price).trim();
    const resolved = cands.map(function (o) {
      const e = oopPriceByLabel_(o.prices, label);
      return { live: o, entry: e, line: (e && e.value) ? oopQuoteLine_(o.name, e.value, o.effective, label) : '' };
    });
    const hit = resolved.filter(function (x) { return x.line && body.indexOf(x.line) >= 0; })[0];
    if (hit) {
      out.push({ name: hit.live.name, price: hit.entry.value, effective: hit.live.effective, label: label, line: hit.line });
      continue;
    }
    // No row still produces a line the message carries. Explain against the
    // row the claim most plausibly came from: one whose price still equals the
    // claim, else the first.
    const priced = resolved.filter(function (x) { return x.entry && x.entry.value; });
    if (!priced.length) {
      return label
        ? { error: 'The pricing sheet no longer has a "' + label + '" for "' + name + '". Remove the line and re-insert it.' }
        : { error: 'The pricing sheet has no price on file for "' + name + '" any more. Remove the line or check with a manager.' };
    }
    const best = priced.filter(function (x) { return x.entry.value === claimed; })[0] || priced[0];
    const entry = best.entry;
    // Not present as the sheet now renders it. Say WHICH of the two reasons.
    if (claimed && claimed !== entry.value) {
      return { error: 'The price for "' + name + '"' + (label ? ' (' + label + ')' : '') +
        ' changed since you looked it up (' + claimed +
        ' \u2192 ' + entry.value + '). Re-insert it and review the email before sending.' };
    }
    // The price is unchanged, so the line is not stale — it was either DELETED
    // or EDITED, and those end very differently. A deleted line leaves nothing
    // in the email; an edited one leaves a price-like figure that no longer
    // matches anything we can verify. Discriminate on the PRICE STRING: if it
    // still appears anywhere in the body, a number is being quoted that this
    // function cannot vouch for, and an unverifiable commitment refuses.
    //
    // THE BOUNDARY, stated rather than implied: a rep who overtypes the figure
    // with a DIFFERENT number defeats this, exactly as a rep who types a price
    // for an item they never picked does. The promise this feature makes is
    // that a price the PICKER inserted is server-sourced and current — not that
    // no wrong number can ever reach an email. Pretending otherwise would be
    // the more dangerous claim.
    if (body.indexOf(entry.value) >= 0 || (claimed && body.indexOf(claimed) >= 0)) {
      return { error: 'The inserted price line for "' + name + '" was edited. Prices must be inserted by the picker \u2014 remove the line and re-insert it.' };
    }
    // Nothing price-like left: the rep inserted it and thought better of it.
    // Nothing was quoted, so nothing is audited.
  }
  return { quoted: out };
}

/** PURE (Node-pinned): what ROLE a LocationAcceptance header plays, or ''.
 *
 *  Header-stem discovery, the oopHeaderRole_ discipline and for the same
 *  reason: the operator owns the tab and will reorder it. `accepts` is tested
 *  BEFORE `name`, because "Accepted Items" contains both stems and reading an
 *  item list as a place name would put a row in the warehouse vocabulary that
 *  no radius phrase can ever match. */
function locHeaderRole_(header) {
  const h = String(header == null ? '' : header).trim();
  if (!h) return '';
  if (/^type$|kind|category|row\s*type/i.test(h)) return 'type';
  if (/accept|item|deliver|product|equip/i.test(h)) return 'accepts';
  if (/address|street|location/i.test(h)) return 'address';
  if (/state|province|region/i.test(h)) return 'state';
  if (/name|warehouse|city|site|town/i.test(h)) return 'name';
  if (/note|comment/i.test(h)) return 'notes';
  return '';
}

/** PURE (Node-pinned): classify one LocationAcceptance row.
 *
 *  Returns 'warehouse' | 'city' | '' (unreadable). The `Type` column decides;
 *  when it is blank the row is classified by SHAPE — an address makes it a
 *  warehouse, because an address is the thing only a warehouse row carries and
 *  the thing the radius grammar cannot work without. A row with neither a
 *  usable type nor an address is NOT guessed at: it returns '' and the
 *  diagnostics list it, the same posture the eligibility grammar takes (g41). */
function locRowKind_(typeCell, hasAddress) {
  const t = String(typeCell == null ? '' : typeCell).trim().toLowerCase();
  if (/^(warehouse|wh|depot|hub|dc)\b/.test(t)) return 'warehouse';
  if (/^(city|town|metro|area)\b/.test(t)) return 'city';
  if (t) return '';                      // a type we do not recognise is not a guess
  return hasAddress ? 'warehouse' : '';
}

/** The delivery-reach table. Returns
 *  `{ warehouses: {name: address}, cities: [{name, state, accepts, notes}], unreadable: [...], error }`.
 *
 *  **NO SEED AND NO FALLBACK, deliberately.** The previous version was a Script
 *  Property that fell back to a CONFIG seed of bare city names when it failed to
 *  parse — and bare city names geocode to city CENTRES, so a warehouse twenty
 *  miles out of town silently made every near-boundary radius answer wrong by
 *  up to twenty miles. That is g114 exactly: a plausible substitute for a
 *  missing value, rendered as data. A missing tab now yields an EMPTY registry,
 *  which makes every radius rule parse as UNKNOWN (never as eligible) and shows
 *  up by name in the diagnostics.
 *
 *  A warehouse row with no address is dropped from the registry rather than
 *  registered unplaceable: its NAME is the vocabulary the grammar matches, so
 *  keeping it would turn "100 miles of X" from UNKNOWN (honest: we do not know
 *  that place) into a radius we can never measure. */
function getLocationAcceptance_() {
  const out = { warehouses: {}, cities: [], unreadable: [], noAddress: [], error: '' };
  let sh;
  try {
    sh = getKbSS_().getSheetByName(LOCATION_ACCEPTANCE_TAB);
  } catch (err) {
    out.error = 'The KB spreadsheet could not be read: ' + err.message;
    return out;
  }
  if (!sh) {
    out.error = 'Delivery reach is not set up yet — create a tab named "' + LOCATION_ACCEPTANCE_TAB +
      '" in the KB spreadsheet (Type / Name / Address / State / Accepts).';
    return out;
  }
  const last = Math.min(sh.getLastRow(), LOC_MAX_ROWS + 1);
  if (last < 2) { out.error = 'The "' + LOCATION_ACCEPTANCE_TAB + '" tab is empty.'; return out; }
  const width = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
  out.headers = headers;                              // K12: the diagnostics show each header's role
  const col = {};
  for (let c = 0; c < width; c++) {
    const role = locHeaderRole_(headers[c]);
    if (role && col[role] === undefined) col[role] = c;
  }
  const at = function (row, role) {
    return col[role] === undefined ? '' : String(row[col[role]] == null ? '' : row[col[role]]).trim();
  };
  const rows = sh.getRange(2, 1, last - 1, width).getDisplayValues();
  let seen = 0;
  rows.forEach(function (row) {
    const name = at(row, 'name');
    const address = at(row, 'address');
    if (!name && !address) return;                 // a blank row is not a finding
    seen++;
    const kind = locRowKind_(at(row, 'type'), !!address);
    if (kind === 'warehouse') {
      if (!address) { out.noAddress.push(name); return; }
      if (name && !out.warehouses[name]) out.warehouses[name] = address;
      else if (!name) out.unreadable.push({ name: '', reason: 'a warehouse row with no name' });
      return;
    }
    if (kind === 'city') {
      if (!name) { out.unreadable.push({ name: '', reason: 'a city row with no name' }); return; }
      // K4: the State cell as a CODE, whichever way the operator wrote it. One
      // that is neither a code nor a state name keeps its row (the city is
      // still listed) but is flagged, so the matcher can say "cannot tell"
      // rather than a confident no, and the diagnostics can name it.
      const stRaw = at(row, 'state');
      const stCode = locStateCode_(stRaw);
      if (stCode === null) out.unreadable.push({ name: name, reason: 'its State "' + stRaw + '" is not a US state or code' });
      out.cities.push({ name: name, state: stCode || '', stateRaw: stRaw, stateBad: stCode === null,
        accepts: at(row, 'accepts'), notes: at(row, 'notes') });
      return;
    }
    out.unreadable.push({ name: name, reason: 'Type is "' + at(row, 'type') + '" and there is no address' });
  });
  // ── A tab that yielded NOTHING USABLE is a finding, not an empty registry ──
  // This silence cost the operator real data on 2026-09-22. Their tab had the
  // headers in row 2 and no Name column, so every row read as blank, the
  // registry came back empty with `error` unset, every radius rule fell to
  // `unknown`, and the rep-facing message blamed the pricing sheet's
  // eligibility column. They then rewrote good cells in that column to match
  // what the app appeared to be asking for. A degraded read that reports
  // nothing is indistinguishable from a working one (g02 / INV-175), and here
  // it actively pointed at the wrong file.
  if (!out.error) {
    if (col.name === undefined) {
      out.error = 'The "' + LOCATION_ACCEPTANCE_TAB + '" tab has no Name column, so nothing in it can be ' +
        'matched by a "100 miles of …" rule. The headers must be in ROW 1, and one of them must name the ' +
        'place (Name / Warehouse / City).';
    } else if (!seen) {
      out.error = 'The "' + LOCATION_ACCEPTANCE_TAB + '" tab has no rows with a Name or an Address — ' +
        'check the headers are in ROW 1.';
    } else if (!Object.keys(out.warehouses).length && !out.cities.length) {
      out.error = 'The "' + LOCATION_ACCEPTANCE_TAB + '" tab has ' + seen + ' row' + (seen === 1 ? '' : 's') +
        ', but none could be read as a warehouse or a city. A warehouse row needs a Name AND an Address; ' +
        'a city row needs a Name and Type "city".';
    }
  }
  out.truncated = sh.getLastRow() > LOC_MAX_ROWS + 1;
  return out;
}

/** PURE (Node-pinned): the listed delivery cities that match a geocoded
 *  location. Returns the matching rows, which the caller SHOWS — it never
 *  changes a verdict (operator decision, 2026-09-16).
 *
 *  WHY IT ONLY SHOWS: a verdict that depended on two tables agreeing would let
 *  a stale row in one of them make an undeliverable item read as deliverable,
 *  and the rep would have no way to see which table said what. The Area
 *  Eligibility column stays the single source of the answer; this is the same
 *  reference material `InsurancePayors` is, surfaced at the moment it is
 *  useful.
 *
 *  The STATE is required to match when the row carries one — there is a
 *  Springfield in most of them. */
function locCityMatches_(cities, city, state) {
  const c = locCityNorm_(city);
  if (!c) return [];
  const st = locStateCode_(state) || '';
  return (cities || []).filter(function (r) {
    if (locCityNorm_(r.name) !== c) return false;
    // K4: a row whose State cell could not be read never matches — and never
    // counts as a mismatch either (`locCityUnreadable_` reports it).
    if (r.stateBad) return false;
    if (r.state && st && r.state !== st) return false;
    return true;
  });
}

/** PURE (Node-pinned) — K4 (cycle 22): the listed rows that NAME this city but
 *  whose State cell could not be read. A city list that says "Dallas, Texs"
 *  has not said Dallas is NOT served; the verdict for it is "cannot tell". */
function locCityUnreadable_(cities, city) {
  const c = locCityNorm_(city);
  if (!c) return [];
  return (cities || []).filter(function (r) { return r.stateBad && locCityNorm_(r.name) === c; });
}

/** PURE (Node-pinned) — K4 (cycle 22): a US state as its two-letter code, from
 *  a code ("TX", "tx", "T.X.") or a full name ("Texas"). '' for a blank cell,
 *  NULL for a value that is neither — the caller reads null as UNREADABLE, never
 *  as "a different state". */
function locStateCode_(s) {
  const raw = String(s == null ? '' : s).trim();
  if (!raw) return '';
  const code = raw.replace(/[.\s]/g, '').toUpperCase();
  if (code.length === 2 && US_STATE_CODES.indexOf(code) >= 0) return code;
  const name = raw.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  return Object.prototype.hasOwnProperty.call(US_STATE_NAMES, name) ? US_STATE_NAMES[name] : null;
}

/** PURE (Node-pinned) — K4 (cycle 22): one spelling for a city name, applied
 *  to BOTH the listed row and the geocoded address. Case, punctuation and
 *  spacing are dropped, and the common abbreviations expand (Ft → Fort,
 *  St → Saint, Mt → Mount; a leading N/S/E/W → North/South/East/West), so
 *  "Ft. Worth" and "Fort Worth" are one city. An exact compare turned every such
 *  pair into a confident NO. */
function locCityNorm_(s) {
  const t = String(s == null ? '' : s).toLowerCase()
    .replace(/['\u2019.,]/g, '').replace(/[-\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const ABBR = { ft: 'fort', st: 'saint', ste: 'sainte', mt: 'mount' };
  const DIR = { n: 'north', s: 'south', e: 'east', w: 'west' };
  const toks = t.split(' ');
  return toks.map(function (w, i) {
    if (ABBR[w]) return ABBR[w];
    if (i === 0 && toks.length > 1 && DIR[w]) return DIR[w];
    return w;
  }).join(' ');
}

/** PURE (Node-pinned) — the registry names (warehouses) named in `text`,
 *  WORD-BOUNDED, never as bare substrings: a short name is otherwise found
 *  inside the prose of the rule itself — a warehouse called "Ware" inside
 *  "warehouse", one called "Mi" inside "miles" — and every spurious hit
 *  BROADENS the rule to measure from a site it never named (g41). */
function oopRegistryNamesIn_(text, warehouseNames) {
  const hits = [];
  (warehouseNames || []).forEach(function (n) {
    const name = String(n || '').trim();
    if (!name || hits.indexOf(name) >= 0) return;
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(String(text || ''))) hits.push(name);
  });
  return hits;
}

/** PURE (Node-pinned) — ONE distance clause of an Area Eligibility value
 *  ("100 miles of Dallas or San Antonio warehouse"). Returns a radius rule, or
 *  `{ kind: 'unknown', raw[, noWarehouse] }`.
 *
 *  K3 (cycle 22): NOTHING in the clause is thrown away. Once the distance, the
 *  warehouse names (with their own state code) and the connective words are
 *  removed, any word left over is a restriction this grammar cannot evaluate —
 *  "100 miles of Dallas except Oklahoma", "…, weekdays only after 3pm" — and the
 *  clause is unknown. Before, only an uppercase state code left over was
 *  noticed; every other word was silently dropped, and a dropped restriction
 *  reads as a broader yes (g41). */
function oopRadiusClause_(text, warehouseNames) {
  const raw = String(text == null ? '' : text).trim();
  const lc = raw.toLowerCase();
  const m = lc.match(/(\d{1,4})\s*(?:miles|mile|mi)\b/);
  if (!m) return { kind: 'unknown', raw: raw };
  const miles = parseInt(m[1], 10);
  // ── ANY warehouse ──────────────────────────────────────────────────────
  // "100 miles of any warehouse" is a rule about the NETWORK, not about a
  // place, and the operator confirmed on 2026-09-22 that it is the common
  // case: most items reach 100 miles from ANY warehouse, and the ones naming
  // Dallas or San Antonio are the exceptions a technician has to build. It
  // resolves against whatever the registry holds AT CHECK TIME, so opening a
  // warehouse extends every item carrying it with no edit to the pricing sheet.
  const anyRe = /\b(?:any|all|our|each|every|a)\s+(?:of\s+)?(?:our\s+|the\s+)?warehouses?\b/i;
  const anyWh = anyRe.test(raw);
  const hits = anyWh ? [] : oopRegistryNamesIn_(raw, warehouseNames);
  if (!(miles > 0) || !(anyWh || hits.length)) {
    // A DISTANCE with no registry name is a different failure from a value we
    // cannot parse at all, and conflating them is what sent the operator to
    // edit good pricing data on 2026-09-22: the message named the eligibility
    // column when the delivery table was the thing that was empty. Flag it so
    // the verdict can name the right file (g02 / g142).
    return { kind: 'unknown', raw: raw, noWarehouse: true };
  }
  // Strip what was understood. The distance goes by POSITION (the match was on
  // the lower-cased text; the raw text may say "MILES").
  let rest = raw.slice(0, m.index) + ' ' + raw.slice(m.index + m[0].length);
  if (anyWh) rest = rest.replace(anyRe, ' ');
  // A warehouse name followed by its own state ("Dallas TX", "Dallas, TX") is
  // the warehouse's ADDRESS, not a second rule — strip the pair.
  hits.forEach(function (n) {
    const nameRe = new RegExp('(' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(\\s*,?\\s*)([A-Za-z]{2})?\\b', 'ig');
    rest = rest.replace(nameRe, function (all, nm, gap, st) {
      // The adjacent token is the warehouse's state only when it is an
      // UPPERCASE state code (the name match itself is case-insensitive).
      const own = st && st === st.toUpperCase() && US_STATE_CODES.indexOf(st) >= 0;
      return own ? ' ' : (' ' + (gap || '') + (st || ''));
    });
  });
  const leftover = rest.split(/[\s,;/|&+()\u2013\u2014-]+/).filter(function (t) { return !!t; });
  // F-23 (2026-09-18): a value that ALSO names a state — "TX, 100 miles of
  // Dallas" — is two rules in one cell. Uppercase only: the operator's prose
  // carries "or", and OR is Oregon.
  const stateLeft = leftover.some(function (t) {
    const u = t.replace(/[^A-Za-z]/g, '');
    return u.length === 2 && u === u.toUpperCase() && US_STATE_CODES.indexOf(u) >= 0;
  });
  if (stateLeft) return { kind: 'unknown', raw: raw };
  // K3: the words a distance rule is written WITH. Anything else is content.
  const FILLER = ['of', 'from', 'the', 'a', 'an', 'our', 'or', 'and', 'plus', 'within', 'radius', 'around',
    'near', 'to', 'in', 'at', 'up', 'only', 'warehouse', 'warehouses', 'location', 'locations', 'site', 'sites',
    'facility', 'facilities', 'branch', 'branches', 'delivery', 'deliver', 'mi', 'mile', 'miles'];
  const unconsumed = leftover.map(function (t) { return t.replace(/[^A-Za-z0-9]/g, '').toLowerCase(); })
    .filter(function (t) { return t && FILLER.indexOf(t) < 0; });
  if (unconsumed.length) return { kind: 'unknown', raw: raw };
  return anyWh
    ? { kind: 'radius', miles: miles, warehouses: [], anyWarehouse: true }
    : { kind: 'radius', miles: miles, warehouses: hits };
}

/** PURE (Node-pinned): parse one Area Eligibility cell into a RULE.
 *
 *  Returns one of:
 *    { kind: 'open'   }
 *    { kind: 'states', states: ['TX', …] }
 *    { kind: 'radius', miles: 100, warehouses: ['Dallas', …] }
 *    { kind: 'radius', miles: 100, warehouses: [], anyWarehouse: true }
 *    { kind: 'cities' }                       — the LocationAcceptance city rows
 *    { kind: 'any',    rules: [<rule>, …] }   — any ONE of them qualifies
 *    { kind: 'unknown', raw: '<the cell, verbatim>'[, noWarehouse: true] }
 *
 *  `cities` DELEGATES to the delivery table's city rows rather than listing
 *  them here (operator decision, 2026-09-22). That is the same shape the radius
 *  rule already has — this column states the RULE, the registry supplies its
 *  PARAMETER — and it is why it does not reopen the 2026-09-16 decision that
 *  kept city rows out of verdicts. What that ruled out was city rows acting as
 *  an INDEPENDENT overlay that could silently contradict this column; a value
 *  here that explicitly hands the question to the list is the opposite of a
 *  second opinion. One place to add a service city, and no edit to the pricing
 *  sheet when the list grows.
 *
 *  RADIUS IS TESTED FIRST, and the honest reason is defence against a future
 *  edit rather than a defect in today's code: the STATES branch below requires
 *  the WHOLE value to be state codes, which already rejects "100 miles of the
 *  Dallas TX warehouse". But relaxing that to "extract any state codes present"
 *  is a very plausible next change (someone will want "TX only" to work), and
 *  the moment it happens, a radius phrase containing a state code would parse
 *  as a state rule — confidently wrong, in the far more permissive direction.
 *  The order costs nothing and makes that edit safe.
 *
 *  Warehouse names are matched against the registry WORD-BOUNDED
 *  (`oopRegistryNamesIn_` — never as bare substrings) rather than parsed out of
 *  English. The operator writes "100 miles of Dallas or San
 *  Antonio warehouse"; a grammar that had to understand "or", "warehouse" and
 *  the word order would break on the next phrasing. The registry IS the
 *  vocabulary, so a name it does not contain is not recognised — which is the
 *  right failure: a radius around a warehouse we cannot place is UNKNOWN, not
 *  eligible.
 *
 *  Everything unrecognised is UNKNOWN (g41 — the fail direction on
 *  operator-maintained data is CHOSEN, and this column is one the operator is
 *  still filling in, so unreadable values are the expected case, not the
 *  exceptional one). */
function oopEligibilityParse_(text, warehouseNames) {
  const raw0 = String(text == null ? '' : text).trim();
  if (!raw0) return { kind: 'unknown', raw: '' };

  // ── The CITY clause, detected and STRIPPED before anything else ─────────
  // A value may carry it BESIDE another rule ("100 miles of Dallas, or listed
  // cities"), and the operator's answer on 2026-09-22 was that either one
  // qualifies. So the clause is removed and the remainder parsed on its own,
  // then the two are combined. Reading one clause and dropping the other is
  // F-23's defect exactly, and here it would drop the MORE permissive half.
  const cityRe = /\b(?:listed|exact|service|serviceable|approved)\s+cit(?:y|ies)\b|\bcity\s+list\b/i;
  const hasCity = cityRe.test(raw0);
  let raw = raw0;
  if (hasCity) {
    raw = raw0.replace(cityRe, ' ')
      // the conjunction that joined the two clauses is now dangling
      .replace(/(^|[\s,;/|&+])(?:or|and|plus)(?=[\s,;/|&+]|$)/ig, '$1')
      .replace(/[\s,;/|&+]+/g, ' ')
      .trim();
    if (!raw) return { kind: 'cities' };
  }

  // Combine whatever the REMAINDER parsed to with the city clause. `open`
  // already covers every city, so it absorbs it. An unreadable remainder makes
  // the WHOLE value unknown — the readable half must never quietly become the
  // answer when the operator wrote two rules and we understood one (g41).
  const wrap = function (r) {
    if (!hasCity) return r;
    if (r.kind === 'unknown') return { kind: 'unknown', raw: raw0, noWarehouse: !!r.noWarehouse };
    if (r.kind === 'open') return r;
    // A multi-distance union (K1) takes the city clause as one more branch.
    const branches = r.kind === 'any' ? (r.rules || []).slice() : [r];
    return { kind: 'any', rules: branches.concat([{ kind: 'cities' }]), raw: raw0 };
  };

  const lc = raw.toLowerCase();

  // 1. RADIUS — a distance and at least one registry name.
  //
  // K1 (cycle 22): EVERY distance in the cell, each governing the names that
  // follow it. The first "N miles" used to apply to every name in the cell, so
  // "100 mi of Dallas, 50 mi of San Antonio" answered YES at 80 miles from San
  // Antonio. Each clause is now parsed on its own (`oopRadiusClause_`); equal
  // distances merge into one radius, and different ones become a union.
  const distRe = /(\d{1,4})\s*(?:miles|mile|mi)\b/g;
  const dists = [];
  let dm;
  while ((dm = distRe.exec(lc)) !== null) dists.push(dm.index);
  if (dists.length) {
    const clauses = dists.map(function (at, i) {
      return raw.slice(i === 0 ? 0 : at, i + 1 < dists.length ? dists[i + 1] : raw.length);
    });
    // With two or more distances, a place named BEFORE the first one cannot be
    // assigned to either ("Dallas 100 miles, San Antonio 50 miles"). Guessing
    // would broaden one rule or the other, so the value is unknown (g41).
    if (dists.length > 1 && oopRegistryNamesIn_(raw.slice(0, dists[0]), warehouseNames).length) {
      return wrap({ kind: 'unknown', raw: raw });
    }
    const parts = clauses.map(function (c) { return oopRadiusClause_(c, warehouseNames); });
    const bad = parts.filter(function (x) { return x.kind === 'unknown'; });
    if (bad.length) {
      const u = { kind: 'unknown', raw: raw };
      if (bad.every(function (x) { return !!x.noWarehouse; })) u.noWarehouse = true;
      return wrap(u);
    }
    // Merge clauses that share a distance and a form; one left is the old shape.
    const merged = [];
    parts.forEach(function (x) {
      const same = merged.filter(function (y) { return y.miles === x.miles && !!y.anyWarehouse === !!x.anyWarehouse; })[0];
      if (!same) { merged.push(x); return; }
      (x.warehouses || []).forEach(function (n) { if (same.warehouses.indexOf(n) < 0) same.warehouses.push(n); });
    });
    return wrap(merged.length === 1 ? merged[0] : { kind: 'any', rules: merged, raw: raw });
  }

  // 2. OPEN — the keyword, optionally followed by the operator's own
  //    parenthetical ("Open (anywhere in the US including Hawaii)").
  const bare = raw.replace(/\([^)]*\)/g, ' ').replace(/[.\s]+/g, ' ').trim();
  if (/^(open|all|us|usa|nationwide|anywhere|any|everywhere)$/i.test(bare)) {
    // K3 (cycle 22): the parenthetical is READ, not stripped. "Open (except
    // Hawaii and Alaska)" used to answer yes for Hawaii. One that restricts is
    // a rule this grammar cannot evaluate, so the value is unknown; one that
    // only elaborates ("including Hawaii", "no restrictions") stays open.
    const notes = (raw.match(/\(([^)]*)\)/g) || []).join(' ').toLowerCase()
      .replace(/\bno\s+(?:restrictions?|limits?|limitations?)\b/g, ' ');
    if (/\b(except|excluding|excludes?|excl|not|no|only|but|without|outside|other\s+than|minus|limited|restricted|restriction)\b/.test(notes)) {
      return wrap({ kind: 'unknown', raw: raw });
    }
    return wrap({ kind: 'open' });
  }

  // 3. STATES — the WHOLE value must be state codes. A value that is partly
  //    codes and partly prose is not a state rule; it is a value we cannot read.
  const toks = raw.split(/[\s,;/|&+]+/).filter(function (t) { return !!t; });
  if (toks.length) {
    const codes = [];
    let allCodes = true;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i].toUpperCase().replace(/[^A-Z]/g, '');
      if (t.length !== 2 || US_STATE_CODES.indexOf(t) < 0) { allCodes = false; break; }
      if (codes.indexOf(t) < 0) codes.push(t);
    }
    if (allCodes && codes.length) return wrap({ kind: 'states', states: codes });
  }

  return wrap({ kind: 'unknown', raw: raw });
}

/** PURE (Node-pinned): the rule as it applies to a given PAYMENT METHOD.
 *
 *  The operator's clarification, 2026-09-16, and the whole reason this exists:
 *  the Area Eligibility column states the INSURANCE rule. `TX` means Texas
 *  through insurance and the entire US out of pocket; `100 miles of Dallas`
 *  means 100 miles either way.
 *
 *  ONE rule generalises it, so a value nobody has written yet still resolves:
 *  a restriction that exists because of WHO IS PAYING lifts when nobody is
 *  billing insurance; a restriction that exists because of HOW IT PHYSICALLY
 *  GETS THERE does not. A state limit is licensure and network. A radius is a
 *  delivery van.
 *
 *  UNKNOWN NEVER LIFTS, and that is the load-bearing line: a value we could not
 *  read might be a delivery constraint, and lifting it would be the one guess
 *  that puts an undeliverable order in the system. */
function oopEligibilityForPayment_(rule, payingOop) {
  const r = (rule && rule.kind) ? rule : { kind: 'unknown', raw: '' };
  if (!payingOop) return r;
  if (r.kind === 'states') return { kind: 'open', liftedFrom: (r.states || []).slice() };
  // `cities` does NOT lift, and it is the same test the rest of this function
  // applies rather than a special case: a service-city list is HOW IT GETS
  // THERE, not WHO IS PAYING. The operator confirmed it on 2026-09-22 — a
  // scooter in a listed city is available through insurance or out of pocket,
  // and outside one it is available neither way.
  if (r.kind === 'any') {
    const mapped = (r.rules || []).map(function (x) { return oopEligibilityForPayment_(x, true); });
    // One branch lifting to `open` makes the whole union open — nothing can be
    // MORE permissive than open, so the other branches cannot narrow it.
    for (let i = 0; i < mapped.length; i++) if (mapped[i].kind === 'open') return mapped[i];
    return { kind: 'any', rules: mapped, raw: r.raw };
  }
  return r;
}

/** PURE (Node-pinned): does `rule` cover `loc`?
 *
 *  `loc` is { state: 'TX', miles: { '<warehouse name>': 87.2, … } }, where a
 *  missing or null distance means "we could not place that warehouse".
 *  Returns { verdict: 'yes' | 'no' | 'unknown', why, near }.
 *
 *  THE ASYMMETRY IN A RADIUS VERDICT is real and worth stating, because it is
 *  the opposite of what "straight-line is only an estimate" suggests. A
 *  straight line is never LONGER than the drive. So a straight-line distance
 *  over the limit means the drive is over the limit too — a radius NO is
 *  CERTAIN. A YES is the provisional one, and a YES close to the boundary says
 *  so rather than implying a precision the measurement does not have.
 *
 *  UNKNOWN is never folded into NO. "We cannot tell" and "not eligible" send a
 *  rep to two different next actions, and the first one is a phone call
 *  (INV-187 / g114 — a computed answer that could mean more than one thing has
 *  to say which). */
function oopEligibilityCheck_(rule, loc) {
  const r = (rule && rule.kind) ? rule : { kind: 'unknown', raw: '' };
  const where = loc || {};

  if (r.kind === 'open') {
    return { verdict: 'yes', near: false,
      why: r.liftedFrom && r.liftedFrom.length
        ? 'Out of pocket there is no state restriction (the sheet limits insurance orders to ' + r.liftedFrom.join(', ') + ').'
        : 'Available anywhere in the US.' };
  }

  if (r.kind === 'states') {
    const st = String(where.state || '').trim().toUpperCase();
    const list = (r.states || []).join(', ');
    if (!st) {
      return { verdict: 'unknown', near: false,
        why: 'Could not determine the state for that address — the sheet limits this to ' + list + '.' };
    }
    if ((r.states || []).indexOf(st) >= 0) {
      return { verdict: 'yes', near: false, why: st + ' is covered (' + list + ').' };
    }
    return { verdict: 'no', near: false, why: st + ' is outside ' + list + '.' };
  }

  if (r.kind === 'radius') {
    const miles = Number(r.miles) || 0;
    // An ANY-warehouse rule names no places, so it resolves against the
    // registry AS IT IS AT CHECK TIME. That is the point of it: a warehouse
    // opened next month extends every item carrying this rule with no edit to
    // the pricing sheet.
    const names = r.anyWarehouse ? (where.warehouseNames || []) : (r.warehouses || []);
    if (r.anyWarehouse && !names.length) {
      return { verdict: 'unknown', near: false,
        why: 'This item reaches ' + miles + ' miles from any warehouse, but the delivery table has no warehouses in it.' };
    }
    let best = null, bestName = '';
    let anyUnplaced = false;
    names.forEach(function (n) {
      const d = (where.miles || {})[n];
      if (d == null || !isFinite(d)) { anyUnplaced = true; return; }
      if (best === null || d < best) { best = d; bestName = n; }
    });
    if (best === null) {
      return { verdict: 'unknown', near: false,
        why: 'Could not measure the distance to ' + names.join(' or ') + '.' };
    }
    const shown = Math.round(best * 10) / 10;
    if (best <= miles) {
      const near = best > miles * OOP_ELIG_NEAR_BAND;
      return { verdict: 'yes', near: near,
        why: shown + ' mi from ' + bestName + ' (limit ' + miles + ' mi)' +
          (near ? ' — close to the boundary, and this is straight-line distance; the drive is longer. Check before committing.' : '.') +
          (anyUnplaced ? ' One warehouse could not be placed.' : '') };
    }
    // Straight-line already exceeds the limit, so the drive does too — but
    // only for the warehouses we could PLACE. An unplaced one might be nearer,
    // and answering NO on that would be a verdict drawn from incomplete data on
    // a surface where it becomes a commitment (INV-187). It used to say NO with
    // the caveat appended, which reads as a decision with a footnote; an
    // ANY-warehouse rule spans the whole registry and makes it far likelier.
    if (anyUnplaced) {
      return { verdict: 'unknown', near: false,
        why: shown + ' mi from ' + bestName + ', over the ' + miles + ' mi limit — but a warehouse could not be ' +
          'placed and might be nearer. Fix its address in LocationAcceptance to get a firm answer.' };
    }
    return { verdict: 'no', near: false,
      why: shown + ' mi from ' + bestName + ', over the ' + miles + ' mi limit (straight-line — the drive is longer still).' };
  }

  if (r.kind === 'cities') {
    if (!where.hasCityRows) {
      return { verdict: 'unknown', near: false,
        why: 'This item is limited to the listed service cities, but the delivery table has no city rows yet.' };
    }
    const city = String(where.city || '').trim();
    if (!city) {
      return { verdict: 'unknown', near: false,
        why: 'Could not determine the city for that address, and this item is limited to specific cities.' };
    }
    // The MATCHES are handed in already computed, by the one matcher the
    // reference line also uses (`locCityMatches_`). Two matchers over one
    // operator table is g126, and here they would decide and display
    // differently for the same address.
    if ((where.cityMatches || []).length) {
      return { verdict: 'yes', near: false, why: city + ' is a listed service city.' };
    }
    // K4: listed, but under a State cell nobody can read — not a no.
    const bad = where.cityUnreadable || [];
    if (bad.length) {
      return { verdict: 'unknown', near: false,
        why: city + ' is listed, but its State cell ("' + (bad[0].stateRaw || '') + '") could not be read. ' +
          'Fix it in LocationAcceptance to get a firm answer.' };
    }
    return { verdict: 'no', near: false, why: city + ' is not one of the listed service cities.' };
  }

  if (r.kind === 'any') {
    const subs = (r.rules || []).map(function (x) { return oopEligibilityCheck_(x, where); });
    if (!subs.length) return { verdict: 'unknown', near: false, why: 'No rule to check.' };
    const yes = subs.filter(function (s) { return s.verdict === 'yes'; });
    if (yes.length) {
      // The LEAST hedged yes is the headline. A near-boundary yes only keeps
      // its caution when every branch that said yes was near — otherwise the
      // rep would be warned about a boundary another rule already cleared.
      const solid = yes.filter(function (s) { return !s.near; });
      const pick = solid.length ? solid[0] : yes[0];
      const withCities = (r.rules || []).some(function (x) { return x && x.kind === 'cities'; });
      return { verdict: 'yes', near: pick.near,
        why: pick.why + (withCities
          ? ' (Either the distance rule or the city list qualifies this item.)'
          : ' (Any one of the listed distances qualifies this item.)') };
    }
    // An UNKNOWN branch outranks a NO branch: one rule said no and another
    // could not be evaluated, so the item is not established as ineligible.
    // Folding that to NO is the collapse INV-187 exists to prevent.
    // EVERY branch speaks, whichever way it went. A rep told only "could not
    // measure the distance" does not know the city list was also checked and
    // came back empty, and would go chase the wrong half.
    const unk = subs.some(function (s) { return s.verdict === 'unknown'; });
    return { verdict: unk ? 'unknown' : 'no', near: false,
      why: subs.map(function (s) { return s.why; }).join(' ') };
  }

  if (r.noWarehouse) {
    const known = (where.warehouseNames || []);
    return { verdict: 'unknown', near: false,
      why: 'The eligibility column says "' + r.raw + '", which names a distance from a warehouse — but ' +
        (known.length
          ? 'no warehouse in the delivery table matches it (the table lists: ' + known.join(', ') + ').'
          : 'the delivery table has no warehouses in it.') +
        ' Fix the name in LocationAcceptance, not the pricing sheet.' };
  }

  return { verdict: 'unknown', near: false,
    why: r.raw
      ? 'The eligibility column says "' + r.raw + '", which this check cannot read — confirm manually.'
      : 'No area eligibility on file for this item — confirm manually.' };
}

/** Rep-callable, read-only, no lock. Takes an address or ZIP and (optionally) a
 *  item search term, and returns each matching item with BOTH verdicts.
 *
 *  BOTH, labelled, rather than a payment-method toggle: the question a rep
 *  actually has mid-call is "can we deliver this, and does paying out of pocket
 *  change the answer?" A toggle makes them ask it twice.
 *
 *  Failure posture matches the rest of the OOP reader: an unreadable store or an
 *  ungeocodable address is an ERROR, never an empty eligible list. A list of
 *  zero eligible items and a lookup that did not run look identical on screen,
 *  and only one of them means "do not sell this here". */
function checkOopEligibility(address, query) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const addr = String(address || '').trim();
    if (addr.length < 3 || addr.length > KB_MAP_QUERY_MAX) {
      return { error: 'Enter an address or ZIP code (3–' + KB_MAP_QUERY_MAX + ' characters).' };
    }
    const q = String(query || '').trim();

    const loc0 = getLocationAcceptance_();
    const wh = loc0.warehouses;
    const whNames = Object.keys(wh);

    // ── The pricing rows ──────────────────────────────────────────────
    let headers, rows;
    try {
      const sh = oopSheet_();
      const width = sh.getLastColumn();
      const last = Math.min(sh.getLastRow(), OOP_MAX_ROWS + 1);
      if (last < 2) return { error: 'The OOP pricing sheet is empty.' };
      headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
      // K9 (cycle 22): a blank row is not an item. Unfiltered (the address-only
      // check), every empty row in the sheet came back as a nameless item.
      rows = sh.getRange(2, 1, last - 1, width).getDisplayValues().filter(function (r) { return !oopRowIsBlank_(r); });
    } catch (err) {
      return { error: 'OOP pricing could not be read: ' + err.message };
    }

    let picked = rows;
    if (q.length >= 2) {
      const scored = [];
      for (let i = 0; i < rows.length; i++) {
        const sc = oopMatchScore_(oopRowObj_(headers, rows[i]), q);   // name OR code — never column A (the OOP-C rule)
        if (sc > 0) scored.push({ i: i, score: sc });
      }
      scored.sort(function (a, b) { return b.score - a.score; });
      picked = scored.map(function (t) { return rows[t.i]; });
    }
    const total = picked.length;
    picked = picked.slice(0, OOP_ELIG_MAX_ITEMS);
    if (!total) return { success: true, notFound: true, items: [], total: 0, warehouses: [] };

    // ── The location ──────────────────────────────────────────────────
    // The customer's address is geocoded, used and returned — deliberately
    // never cached, the kbMapDistances rule. Only the WAREHOUSES are cached.
    const qGeo = kbGeocodeOne_(addr);
    if (qGeo && qGeo.unavailable) return { error: kbGeocodeUnavailableMsg_(qGeo) };   // F-15: the service, not the address
    if (qGeo && qGeo.partial) return { error: kbGeocodePartialMsg_(qGeo) };            // K5: a guess is not a location
    if (!qGeo) return { error: 'Could not find that location — try a 5-digit ZIP code.' };

    // Warehouses are geocoded only when some picked row actually needs one, so
    // a state-only catalog never pays for a geocode round trip.
    const parsed = picked.map(function (row) { return oopEligibilityParse_(oopRowObj_(headers, row).eligibility, whNames); });
    // A radius nested inside a union still needs the warehouses geocoded.
    // Testing the TOP-LEVEL kind alone would have left every combined rule
    // measuring against an empty distance map — a silent `unknown` on the one
    // shape this batch exists to serve.
    const ruleNeedsRadius = function (r) {
      if (!r) return false;
      if (r.kind === 'radius') return true;
      if (r.kind === 'any') return (r.rules || []).some(ruleNeedsRadius);
      return false;
    };
    const needRadius = parsed.some(ruleNeedsRadius);
    const milesByName = {};
    const whOut = [];
    if (needRadius && whNames.length) {
      const geos = kbGeocodeCached_(whNames.map(function (n) { return wh[n]; }));
      whNames.forEach(function (n, i) {
        const g = geos[i];
        const d = g ? Math.round(kbHaversineMiles_(qGeo.lat, qGeo.lng, g.lat, g.lng) * 10) / 10 : null;
        if (d != null) milesByName[n] = d;
        whOut.push({ name: n, miles: d });
      });
    }
    // Listed delivery cities for this address, matched ONCE. They are shown as
    // reference on every lookup, and they DECIDE only for an item whose own
    // Area Eligibility delegates to them (`cities` / `any` — operator decision,
    // 2026-09-22). The 2026-09-16 rule still holds and is why this is one
    // match, not two: city rows are never an independent overlay that could
    // contradict the column, so nothing can be eligible by this list alone
    // unless the column said to ask it.
    const cityHits = locCityMatches_(loc0.cities, qGeo.city, qGeo.state);

    const loc = { state: qGeo.state, miles: milesByName,
      city: qGeo.city, cityMatches: cityHits, hasCityRows: loc0.cities.length > 0,
      cityUnreadable: locCityUnreadable_(loc0.cities, qGeo.city),
      warehouseNames: whNames };

    const items = picked.map(function (row, i) {
      const o = oopRowObj_(headers, row);
      const rule = parsed[i];
      // The WHOLE row object, not a hand-picked subset of it. `price` on its
      // own is `prices[0]` — the LEFTMOST price column — and on the operator's
      // real sheet that is the pick-up total: the one price that is wrong for
      // every delivery. This endpoint is ABOUT delivery, so shipping only that
      // field meant the delivery surface quoted the collect-in-person number
      // and silently dropped "W/ Shipping" and "W/ Tech Delivery".
      //
      // searchOopPricing already shipped `prices` and rendered them labelled.
      // Two readers of ONE operator tab, diverging because each picked its own
      // subset, is g126 exactly. Shipping the same shape from both lets ONE
      // client row renderer serve both, so they cannot drift apart by being
      // edited separately again.
      return {
        name: o.name, code: o.code, codes: o.codes, price: o.price, prices: o.prices,
        effective: o.effective, eligibility: o.eligibility, details: o.details,
        rule: rule.kind,
        insurance: oopEligibilityCheck_(oopEligibilityForPayment_(rule, false), loc),
        oop: oopEligibilityCheck_(oopEligibilityForPayment_(rule, true), loc),
      };
    });

    return { success: true, formatted: qGeo.formatted, state: qGeo.state, city: qGeo.city,
      warehouses: whOut, items: items, total: total,
      deliveryCities: cityHits,
      // A registry that could not be read is SURFACED rather than silently
      // producing UNKNOWN radius verdicts that read like caution (g02): the
      // rep needs to know the difference between "we do not deliver there" and
      // "nobody has set up the delivery table".
      locationError: loc0.error || '',
      // Per-ROW registry problems, which until now reached only
      // getOopPricingDiagnostics — an endpoint with no caller anywhere in the
      // client, so in practice they reached nobody. A warehouse row that was
      // dropped is the difference between "we do not deliver there" and
      // "that warehouse never made it into the table".
      locationWarnings: (loc0.unreadable || []).map(function (u) {
        return (u.name ? '"' + u.name + '": ' : '') + u.reason;
      }).concat((loc0.noAddress || []).map(function (n) {
        return '"' + n + '" has no address, so no distance can be measured from it.';
      })),
      cap: OOP_ELIG_MAX_ITEMS, truncated: total > OOP_ELIG_MAX_ITEMS };
  } catch (err) { return { error: 'Eligibility check failed: ' + err.message }; }
}

/** PURE (Node-pinned) — K9 (cycle 22): a row with nothing in any cell. It is
 *  not an item and not an unreadable one — it is the gap an operator leaves
 *  between sections. */
function oopRowIsBlank_(row) {
  return !(row || []).some(function (c) { return String(c == null ? '' : c).trim() !== ''; });
}

/** Admin-gated: what the reader actually MATCHED in the operator's sheet.
 *
 *  This exists because header discovery is invisible until it goes wrong. The
 *  operator edits the spreadsheet directly — rename "Price" to "Patient Cost"
 *  and the lookup keeps working; rename it to something the stem list misses
 *  and every result silently shows a blank price. Without this they would find
 *  out from a rep mid-call. It reports the tab it read, every header and the
 *  role assigned to it, and NAMES the roles it could not find — an absent price
 *  column is the finding, not an empty column.
 *
 *  Read-only, no lock, no row content beyond a couple of sample values. */
function getOopPricingDiagnostics() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    const sh = oopSheet_();
    const width = sh.getLastColumn();
    const rows = Math.max(0, sh.getLastRow() - 1);
    const headers = width ? sh.getRange(1, 1, 1, width).getDisplayValues()[0] : [];
    // THE NAME COLUMN IS REPORTED, and that is the finding this panel exists for.
    // Against the operator's real sheet the old version said `missing: []` and
    // read CLEAN while every lookup returned nothing — because the one
    // assumption that was wrong (column A is the item) was the one it never
    // showed. A diagnostic that cannot be wrong about itself is not a
    // diagnostic.
    const nameCol = oopNameCol_(headers);
    const cols = headers.map(function (h, i) {
      return { header: String(h || ''),
        role: i === nameCol ? 'name (the searched column)' : (oopHeaderRole_(h) || '—') };
    });
    const found = {};
    headers.forEach(function (h, i) { if (i !== nameCol) { const r = oopHeaderRole_(h); if (r) found[r] = true; } });
    const missing = ['price', 'eligibility', 'effective'].filter(function (r) { return !found[r]; });
    // An item column that was FOUND by header reads differently from one we fell
    // back to. A sheet whose column A is a billing code and which carries no
    // `Item` header is searchable only by code, and the operator needs to know
    // that rather than discover it from a rep.
    const nameByHeader = oopHeaderRole_(headers[nameCol]) === 'name';
    // ELIG: the eligibility GRAMMAR is invisible until it goes wrong in exactly
    // the same way the header matching is, and worse — an unrecognised value
    // renders "check manually", which reads like caution rather than like a
    // typo. Report the registry the radius form matches against, and how EVERY
    // eligibility value in the sheet parses, grouped. An operator who added
    // "100 mi of Houston" sees it sitting under `unknown` here rather than
    // finding out from a rep.
    const loc = getLocationAcceptance_();
    const wh = loc.warehouses;
    const whNames = Object.keys(wh);
    // Counted BY KIND, and the unknown total is counted rather than derived by
    // subtraction. The old shape enumerated exactly open/states/radius and
    // inferred the rest, so adding a kind made one counter NaN and silently
    // mis-stated the other — an enumerated set that drifts from what the parser
    // can actually return is the failure this project keeps meeting (g137).
    const elig = { open: 0, states: 0, radius: 0, cities: 0, any: 0, unknown: [] };
    let unknownCount = 0;
    if (rows) {
      const all = sh.getRange(2, 1, rows, width).getDisplayValues();
      all.forEach(function (row) {
        if (oopRowIsBlank_(row)) return;             // K9: a gap between sections is not "Cannot read"
        const o = oopRowObj_(headers, row);
        const r = oopEligibilityParse_(o.eligibility, whNames);
        if (r.kind === 'unknown') {
          unknownCount++;
          if (elig.unknown.length < 12) elig.unknown.push({ item: o.name || o.code || '', value: r.raw });
        } else { elig[r.kind] = (elig[r.kind] || 0) + 1; }
      });
    }
    return { tab: sh.getName(), rows: rows, cols: cols, missing: missing,
      nameCol: String(headers[nameCol] || '(column A)'), nameByHeader: nameByHeader,
      truncated: rows > OOP_MAX_ROWS,
      warehouses: whNames.map(function (n) { return { name: n, address: wh[n] }; }),
      // The delivery-reach tab, reported in the SAME breath as the pricing one:
      // an operator who added "100 mi of Houston" and an operator who spelled a
      // warehouse differently in the two tabs both see it here, by name, rather
      // than finding out from a rep reading "cannot tell".
      locationTab: LOCATION_ACCEPTANCE_TAB,
      locationError: loc.error || '',
      // K12 (cycle 22): the ROLE read into every LocationAcceptance header, the
      // pricing tab's `cols` treatment. Header-stem discovery is invisible until
      // it goes wrong: "Delivery City" reads as the ACCEPTS column (it contains
      // "deliver"), and without this the operator could not see why their city
      // names were never matched.
      locCols: loc.headers ? loc.headers.map(function (h) { return { header: String(h || ''), role: locHeaderRole_(h) || '—' }; }) : [],
      cities: loc.cities.length,
      locUnreadable: loc.unreadable,
      locNoAddress: loc.noAddress,
      eligibility: { open: elig.open, states: elig.states, radius: elig.radius,
        cities: elig.cities, any: elig.any,
        unknownCount: unknownCount, unknown: elig.unknown },
      sample: rows ? sh.getRange(2, 1, Math.min(3, rows), width).getDisplayValues() : [] };
  } catch (err) { return { error: String(err.message || err) }; }
}

/** Rep-callable, read-only, no lock. Returns the top-N payor matches for a
 *  query — never a single confident guess: ties and near-misses ride along so
 *  the REP judges ambiguity. A no-match result carries notFound:true (the
 *  client renders the operator's "plan not listed → follow the TRY criteria"
 *  guidance). Unconfigured (no tab) says exactly what to create. */
function searchInsurancePayors(query) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const q = String(query || '').trim();
    if (q.length < 2) return { matches: [], total: 0 };
    const sh = getKbSS_().getSheetByName(INS_PAYOR_TAB);
    if (!sh) return { error: 'Insurance lookup is not set up yet — import the payor CSV into a tab named "' + INS_PAYOR_TAB + '" in the KB spreadsheet.' };
    const last = Math.min(sh.getLastRow(), INS_PAYOR_MAX_ROWS + 1);
    if (last < 2) return { matches: [], total: 0 };
    const width = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
    // Name-column scan for scoring; full rows fetched only for the top N.
    const names = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    const scored = [];
    for (let i = 0; i < names.length; i++) {
      const sc = insPayorScore_(names[i][0], q);
      if (sc > 0) scored.push({ i: i, score: sc });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    const top = scored.slice(0, INS_PAYOR_TOP);
    const matches = top.map(function (t) {
      // getDisplayValues — a foreign-authored sheet's formats are not ours to
      // reinterpret (the INV-64 discipline).
      const row = sh.getRange(t.i + 2, 1, 1, width).getDisplayValues()[0];
      return insPayorRowObj_(headers, row);
    });
    // The JOIN (T3). The payor sheet says `K0802 — Not Accepted`, which is a
    // rule about an item the rep cannot name. The pricing tab knows what K0802
    // is, so name it here rather than leaving the rep to look it up separately
    // mid-call — the whole point of the two panels being one glance apart.
    //
    // Built ONLY when some result actually has code-shaped columns, so the
    // common payor with none costs no extra read at all.
    const wantsCodes = matches.some(function (m) {
      return (m.details || []).some(function (d) { return hcpcsParse_(d.label).shaped; });
    });
    const idx = wantsCodes ? oopCodeIndex_() : { byToken: {}, error: '' };
    if (wantsCodes) {
      matches.forEach(function (m) {
        (m.details || []).forEach(function (d) { insNameCodeDetail_(d, idx.byToken); });
      });
    }
    return { matches: matches, total: scored.length, notFound: scored.length === 0, cap: INS_PAYOR_TOP,
      // NAMED, not inferred from empty `item` fields. A pricing tab that is
      // missing or unreadable produces exactly the same bare codes as a payor
      // sheet whose columns are not codes, and the rep must be able to tell
      // those apart — the second is the sheet working, the first is not.
      codeJoin: { attempted: wantsCodes, error: idx.error } };
  } catch (err) { return { error: 'Insurance lookup failed: ' + err.message }; }
}
/** Pure (Node-pinned) RFC4180-ish CSV parse. Handles quoted fields with
 *  embedded commas, quotes ("" escapes) and NEWLINES — the payor file has all
 *  three, and a naive split on ',' silently shifts every column after the
 *  first quoted comma, which is the failure mode this exists to prevent.
 *  Returns a rectangular grid padded to the widest row. */
function kbParseCsv_(text) {
  const src = String(text || '').replace(/^﻿/, '');   // strip a BOM — Excel writes one
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQ = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;                              // CRLF → LF
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Drop trailing all-empty rows (a file ending in a newline yields one).
  while (rows.length && rows[rows.length - 1].every(function (c) { return String(c).trim() === ''; })) rows.pop();
  const width = rows.reduce(function (w, r) { return Math.max(w, r.length); }, 0);
  return rows.map(function (r) {
    const out = r.slice();
    while (out.length < width) out.push('');
    return out;
  });
}
/** Pure (Node-pinned): what the operator is about to overwrite, and anything
 *  worth knowing before they do. Facts only — a duplicate name or an odd
 *  header is REPORTED, never silently "fixed" (the operator decides; they
 *  already chose to keep the duplicate payor rows). */
function kbDataTableSummary_(grid, spec) {
  const headers = (grid[0] || []).map(function (h) { return String(h || '').trim(); });
  const dataRows = grid.length > 1 ? grid.length - 1 : 0;
  const warnings = [];
  if (!grid.length) warnings.push('The file has no rows.');
  if (headers.length < (spec.minCols || 2)) warnings.push('Only ' + headers.length + ' column(s) — this table expects at least ' + (spec.minCols || 2) + '.');
  if (spec.nameHeader && headers.length && !spec.nameHeader.test(headers[0])) {
    warnings.push('The first column is "' + (headers[0] || '(blank)') + '" — the lookup searches THAT column, so it should hold the payor/plan name.');
  }
  const blankHeaders = headers.filter(function (h) { return !h; }).length;
  if (blankHeaders) warnings.push(blankHeaders + ' column(s) have no header — those attributes will render with a blank label.');
  // Duplicate + blank names in the searched column: the operator asked to be
  // TOLD about these rather than have them merged (2026-08-25).
  const seen = {}, dupes = [], blanks = [];
  for (let r = 1; r < grid.length; r++) {
    const nm = String(grid[r][0] || '').trim();
    if (!nm) { blanks.push(r + 1); continue; }
    const k = nm.toLowerCase();
    if (seen[k]) { if (dupes.length < 12) dupes.push(nm + ' (rows ' + seen[k] + ', ' + (r + 1) + ')'); }
    else seen[k] = r + 1;
  }
  return {
    headers: headers,
    rows: dataRows,
    cols: headers.length,
    sample: grid.slice(1, 4).map(function (r) { return r.slice(0, 6); }),
    duplicateNames: dupes,
    blankNameRows: blanks.slice(0, 12),
    blankNameCount: blanks.length,
    warnings: warnings,
  };
}
/** Upload a CSV into one ALLOWLISTED KB sheet tab. Admin-gated (INV-136 tier —
 *  it rewrites a store the whole team reads), locked (INV-01), audited.
 *  `dryRun` returns the summary WITHOUT writing, so the same parse drives the
 *  preview and the write — one code path, no client/server parser to drift
 *  (the two-stage email posture applied to a destructive import).
 *  The write REPLACES the tab's contents; Sheets' own File → Version history
 *  is the undo, which the client's confirm says out loud. */
function kbImportDataTable(tabKey, csvBase64, opts) {
  const o = opts || {};
  const dryRun = o.dryRun !== false;          // default DRY — a bare call never writes
  const lock = dryRun ? null : LockService.getScriptLock();
  if (lock) lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    const spec = Object.prototype.hasOwnProperty.call(KB_DATA_TABLES, String(tabKey)) ? KB_DATA_TABLES[String(tabKey)] : null;
    if (!spec) return { error: 'Unknown data table: ' + String(tabKey) };

    const b64 = String(csvBase64 || '');
    if (!b64) return { error: 'No file received.' };
    if (b64.length > KB_DATA_TABLE_MAX_CHARS) {
      return { error: 'That file is too large (limit ~' + Math.round(KB_DATA_TABLE_MAX_CHARS / 1400000) + 'MB). Split it or trim unused columns.' };
    }
    let text;
    try { text = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString(); }
    catch (e) { return { error: 'Could not read that file as text — is it a .csv?' }; }

    const grid = kbParseCsv_(text);
    if (grid.length < 2) return { error: 'That file has no data rows (a header row plus at least one row is required).' };
    if (grid.length - 1 > KB_DATA_TABLE_MAX_ROWS) {
      return { error: grid.length - 1 + ' rows exceeds the ' + KB_DATA_TABLE_MAX_ROWS + '-row limit for this table.' };
    }
    if (grid[0].length > KB_DATA_TABLE_MAX_COLS) {
      return { error: grid[0].length + ' columns exceeds the ' + KB_DATA_TABLE_MAX_COLS + '-column limit for this table.' };
    }
    const summary = kbDataTableSummary_(grid, spec);

    const ss = getKbSS_();
    const existing = ss.getSheetByName(spec.tab);
    summary.tab = spec.tab;
    summary.label = spec.label;
    summary.replacingRows = existing ? Math.max(0, existing.getLastRow() - 1) : 0;
    if (dryRun) { summary.dryRun = true; return summary; }

    const sh = existing || ss.insertSheet(spec.tab);
    sh.clear();
    const range = sh.getRange(1, 1, grid.length, grid[0].length);
    // Plain-text format BEFORE the write: a payor named "Aetna 5-2024" or a
    // code like "1/2" would otherwise be coerced to a date/number and the
    // getDisplayValues reader would hand reps a reformatted value that is not
    // what the operator's file says (INV-64 — a foreign-authored sheet is
    // never reinterpreted; here we are the one authoring it, so we pin it).
    range.setNumberFormat('@');
    range.setValues(sheetTextRows_(grid, null));   // S2: the whole block was just formatted '@' — raw, no apostrophe
    sh.setFrozenRows(1);
    SpreadsheetApp.flush();

    writeAuditLog_(emp, 'KbDataTableImport', '', '', false, 0,
      'tab=' + spec.tab + '; rows=' + summary.rows + '; cols=' + summary.cols + '; replaced=' + summary.replacingRows);
    summary.imported = true;
    return summary;
  } catch (err) {
    return { error: 'Import failed: ' + err.message };
  } finally {
    if (lock) lock.releaseLock();
  }
}
/** Read-only inventory for the Admin panel: every allowlisted table with what
 *  is in it now. A tab that does not exist yet reports rows 0 rather than an
 *  error — that is the pre-first-import state, not a fault. */
function getKbDataTables() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    const ss = getKbSS_();
    const tables = Object.keys(KB_DATA_TABLES).map(function (k) {
      const spec = KB_DATA_TABLES[k];
      const out = { key: k, tab: spec.tab, label: spec.label, describe: spec.describe, rows: 0, cols: 0, present: false };
      try {
        const sh = ss.getSheetByName(spec.tab);
        if (sh) {
          out.present = true;
          out.rows = Math.max(0, sh.getLastRow() - 1);
          out.cols = sh.getLastColumn();
        }
      } catch (e) { out.unreadable = true; }   // INV-187 — an unreadable tab is not an empty one
      return out;
    });
    return { tables: tables };
  } catch (err) { return { error: err.message }; }
}
function kbGetUsageStats() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const countsRes = kbUsageCounts_(KB_USAGE_WINDOW_DAYS);
    const counts = countsRes.map;
    // F-25: which of the count reads FAILED — a failed read used to render as
    // "No opens recorded" / no feedback / no comments, the g48 shape.
    const unavailable = [];
    if (countsRes.unavailable) unavailable.push('views');
    const ids = Object.keys(counts);
    if (!ids.length) return { items: [], windowDays: KB_USAGE_WINDOW_DAYS, unavailable: unavailable };
    // Join titles from the KB sheet (small — one bounded read). Cycle-11 L-7:
    // read through the Status column and DROP drafts — this was the one usage
    // surface that missed the INV-140 pattern, leaking a draft's title (with
    // admin-preview view counts) into the manager "Most referenced" block.
    // Consistent with kbGetReviewDue: drafts aren't live content.
    const titles = {};
    const kbSheet = getOrCreateKbSheet_();
    const kbLast = kbSheet.getLastRow();
    if (kbLast >= 2) {
      // Two thin reads (Id..Title + the Status column) — a full-width read
      // would pull every article's BodyMd, the read-volume class cycle-9
      // batch 5 bounded.
      const rows = kbSheet.getRange(2, 1, kbLast - 1, 3).getValues();          // Id, Department, Title
      const statuses = kbSheet.getRange(2, KB.STATUS + 1, kbLast - 1, 1).getValues();
      rows.forEach(function (r, i) {
        if (!r[0]) return;
        if (kbRowStatus_(statuses[i][0]) === KB_STATUS_DRAFT) return;
        titles[String(r[0])] = String(r[2] || '(untitled)');
      });
    }
    const fbRes = kbFeedbackCounts_();   // #2 — surface rep helpful/notHelpful tallies
    const ccRes = kbCommentCounts_();    // round-3 FO — surface discussion volume
    if (fbRes.unavailable) unavailable.push('feedback');
    if (ccRes.unavailable) unavailable.push('comments');
    const fb = fbRes.map, cc = ccRes.map;
    const items = ids
      .filter(function (id) { return !!titles[id]; })   // deleted items drop out
      .map(function (id) {
        return {
          id: id, title: titles[id], count: counts[id].count, drawerCount: counts[id].drawerCount,
          helpful: (fb[id] && fb[id].helpful) || 0, notHelpful: (fb[id] && fb[id].notHelpful) || 0,
          comments: cc[id] || 0,
        };
      })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, KB_USAGE_TOP_N);
    return { items: items, windowDays: KB_USAGE_WINDOW_DAYS, unavailable: unavailable };
  } catch (err) { return { error: err.message }; }
}
/** Recovers a KB timestamp cell to a yyyy-MM-dd string. Sheets coerces the
 *  'yyyy-MM-dd HH:mm:ss' strings kbSaveItem writes into Date objects on read,
 *  so recover Dates in the KB SPREADSHEET's own tz (the tz that coerced them —
 *  the kbGetUsageStats / normalizeAuditTs_ discipline; NOT the ADP tz). */
function kbCellDateIso_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd');
  return String(v == null ? '' : v).substring(0, 10);
}
/** Recover a KB timestamp cell to a full 'yyyy-MM-dd HH:mm:ss' string (Sheets
 *  coerces the stored string to a Date on read — recover in the KB sheet's own
 *  tz, the kbCellDateIso_ discipline). Datetime granularity is needed to compare
 *  a stale flag against an item's last-review time (#2 — a same-day review must
 *  clear a stale flag raised earlier that day; a date-only compare couldn't). */
function kbCellTs_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd HH:mm:ss');
  return String(v == null ? '' : v);
}
/** #4 — manager "Mark reviewed": bumps ReviewedAt/ReviewedBy without touching
 *  content (the "still accurate, no edit needed" path). Manager-gated (INV-02),
 *  locked (INV-01), audited (KbItemReviewed). No cache invalidation needed —
 *  the tree cache doesn't carry review state and kbGetReviewDue reads live. */
function kbMarkReviewed(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    id = String(id || '').trim();
    if (!id) return { success: false, error: 'Missing item id.' };
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    sheet.getRange(found, KB.REVIEWED_AT + 1, 1, 2).setValues(sheetSafeRows_([[now, emp.email]]));
    writeAuditLog_(emp, 'KbItemReviewed', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true, reviewedAt: now };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** #4 — manager review-due queue: KB items whose last review (or, for legacy
 *  rows with no ReviewedAt, last edit) is older than CONFIG.KB.REVIEW_DUE_DAYS,
 *  sorted by 30-day usage desc (polish the most-leaned-on stale guides first).
 *  Manager-gated (INV-02), read-only, PHI-free. */
function kbGetReviewDue() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const dueDays = (CONFIG.KB && CONFIG.KB.REVIEW_DUE_DAYS) || 90;
    const ss = getKbSS_();
    const ssTz = ss.getSpreadsheetTimeZone();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { items: [], dueDays: dueDays };
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    const usageRes = kbUsageCounts_(KB_USAGE_WINDOW_DAYS);
    const usage = usageRes.map;
    const unavailable = [];   // F-25 — the count reads that failed, by name
    if (usageRes.unavailable) unavailable.push('views');
    // #2 — a rep "flag as out of date" surfaces the item here regardless of age
    // and sorts it to the top. Build the full-ts last-review map first so
    // kbStaleFlags_ can clear a flag that a later review superseded (the same
    // strictly-newer reset as INV-120, no status column to maintain).
    const reviewedTsByItem = {};
    rows.forEach(function (r) {
      const id = String(r[KB.ID] || '').trim();
      if (id) reviewedTsByItem[id] = kbCellTs_(r[KB.REVIEWED_AT], ssTz);
    });
    const staleRes = kbStaleFlags_(reviewedTsByItem);
    const fbRes = kbFeedbackCounts_();
    const ccRes = kbCommentCounts_();    // round-3 FO — discussion volume chip
    if (staleRes.unavailable) unavailable.push('stale flags');
    if (fbRes.unavailable) unavailable.push('feedback');
    if (ccRes.unavailable) unavailable.push('comments');
    const stale = staleRes.map, fb = fbRes.map, cc = ccRes.map;
    const todayNum = cnIsoToDayNum_(fmtDate_(new Date()));
    const items = [];
    rows.forEach(function (r) {
      const id = String(r[KB.ID] || '').trim();
      if (!id) return;
      if (kbRowStatus_(r[KB.STATUS]) === KB_STATUS_DRAFT) return;   // #4 — drafts aren't live content to review
      const reviewedIso = kbCellDateIso_(r[KB.REVIEWED_AT], ssTz);
      const updatedIso  = kbCellDateIso_(r[KB.UPDATED_AT], ssTz);
      const baseIso = reviewedIso || updatedIso;   // legacy rows fall back to last edit
      let ageDays = null;
      if (baseIso) { const n = cnIsoToDayNum_(baseIso); if (n != null && todayNum != null) ageDays = todayNum - n; }
      const ageDue = (ageDays == null) || (ageDays >= dueDays);
      const staleCount = (stale[id] && stale[id].count) || 0;
      if (!ageDue && !staleCount) return;
      items.push({
        id: id,
        title: String(r[KB.TITLE] || '(untitled)'),
        department: String(r[KB.DEPARTMENT] || ''),
        type: String(r[KB.TYPE] || 'article'),
        lastReviewedIso: reviewedIso || null,
        basedOnUpdate: !reviewedIso,     // true = never explicitly reviewed (age is since last edit)
        ageDays: ageDays,
        views: (usage[id] && usage[id].count) || 0,
        staleFlags: staleCount,          // #2 — open "out of date" flags from reps
        staleNote: (stale[id] && stale[id].lastNote) || '',
        helpful: (fb[id] && fb[id].helpful) || 0,
        notHelpful: (fb[id] && fb[id].notHelpful) || 0,
        comments: cc[id] || 0,
      });
    });
    items.sort(function (a, b) {
      // Rep-flagged-stale first (then by flag count), then most-used, then oldest.
      return ((b.staleFlags ? 1 : 0) - (a.staleFlags ? 1 : 0)) ||
             (b.staleFlags - a.staleFlags) ||
             (b.views - a.views) || ((b.ageDays || 0) - (a.ageDays || 0)) ||
             a.title.localeCompare(b.title);
    });
    // F18: report the pre-slice total so the manager panel can say "showing
    // N of M" — a 50-item cap with no signal reads as "only 50 are due".
    return { items: items.slice(0, KB_REVIEW_DUE_CAP), dueDays: dueDays, unavailable: unavailable,
             total: items.length, cap: KB_REVIEW_DUE_CAP };
  } catch (err) { return { error: err.message }; }
}

// ── Self-improving-KB loop (#1 content-gap requests + #2 rep freshness) ─────
function getOrCreateKbFeedbackSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_FEEDBACK_TAB);
    sheet.appendRow(sheetSafeRow_(KB_FEEDBACK_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_FEEDBACK_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
function getOrCreateKbRequestsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_REQUESTS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_REQUESTS_TAB);
    sheet.appendRow(sheetSafeRow_(KB_REQUESTS_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_REQUESTS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** #2 — open stale flags per item id. An item is "flagged stale" when it has a
 *  KbFeedback 'stale' row NEWER than its last review (reviewedTsByItem[id], a
 *  full 'yyyy-MM-dd HH:mm:ss' string; '' = never reviewed → any flag counts).
 *  This mirrors INV-120's strictly-newer completion-vs-assignment reset — a
 *  manager's kbMarkReviewed bumps ReviewedAt and the flag clears with NO status
 *  column to maintain. Bounded tail scan. Returns { id: {count, lastNote} }. */
function kbStaleFlags_(reviewedTsByItem) {
  const out = {};
  let unavailable = false;   // F-25: a failed read is NOT an empty map
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { map: out, unavailable: false };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_FEEDBACK_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_FEEDBACK_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][KBF.KIND] || '') !== 'stale') continue;
      const id = String(data[i][KBF.ITEM_ID] || '').trim();
      if (!id) continue;
      const flagTs = kbCellTs_(data[i][KBF.TS], ssTz);
      const reviewedTs = (reviewedTsByItem && reviewedTsByItem[id]) || '';
      if (reviewedTs && flagTs <= reviewedTs) continue;   // a later review cleared this flag
      if (!out[id]) out[id] = { count: 0, lastNote: '' };
      out[id].count++;
      const note = String(data[i][KBF.NOTE] || '').trim();
      if (note) out[id].lastNote = note;   // chronological append order → latest note wins
    }
  } catch (e) { unavailable = true; }   // F-25: carried, never rendered as "none"
  return { map: out, unavailable: unavailable };
}
/** #2 — cumulative helpful/notHelpful tallies per item id over the bounded
 *  feedback tail (KB_FEEDBACK_MAX_SCAN — KbFeedback is low-volume, so an
 *  unwindowed count is the more useful cumulative signal, same tail as
 *  kbStaleFlags_). Returns { id: {helpful, notHelpful} }; empty on any failure.
 *  Folded into the manager Most-used + Review-due blocks. */
function kbFeedbackCounts_() {
  const out = {};
  let unavailable = false;   // F-25: a failed read is NOT an empty map
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { map: out, unavailable: false };
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_FEEDBACK_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_FEEDBACK_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      const kind = String(data[i][KBF.KIND] || '');
      if (kind !== 'helpful' && kind !== 'notHelpful') continue;
      const id = String(data[i][KBF.ITEM_ID] || '').trim();
      if (!id) continue;
      if (!out[id]) out[id] = { helpful: 0, notHelpful: 0 };
      if (kind === 'helpful') out[id].helpful++; else out[id].notHelpful++;
    }
  } catch (e) { unavailable = true; }   // F-25: carried, never rendered as "none"
  return { map: out, unavailable: unavailable };
}
/** Round-3 FO — ACTIVE comment count per item over the bounded KbComments
 *  tail (the kbFeedbackCounts_ shape: best-effort, empty map on any failure).
 *  Folded into the SAME manager Most-used + Review-due rows rather than a new
 *  ranked block/endpoint — "which items generate discussion" rides the
 *  existing analytics surfaces, and kbFbCountHtml_ renders the chip. */
function kbCommentCounts_() {
  const out = {};
  let unavailable = false;   // F-25: a failed read is NOT an empty map
  try {
    const sheet = getKbSS_().getSheetByName(KB_COMMENTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { map: out, unavailable: false };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - KB_COMMENTS_SCAN + 1);
    const rows = sheet.getRange(start, 1, last - start + 1, KB_COMMENTS_HEADERS.length).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][KBC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
      const id = String(rows[i][KBC.ITEM_ID] || '').trim();
      if (!id) continue;
      out[id] = (out[id] || 0) + 1;
    }
  } catch (e) { unavailable = true; }   // F-25: carried, never rendered as "none"
  return { map: out, unavailable: unavailable };
}
/** #3 — probe KB embeds for Drive reachability (deleted/moved file or lost
 *  deployer access — a silently-broken embed that renders a dead /preview iframe
 *  with no error anywhere). Bounded (cap) + best-effort; PHI-free (KB is PHI-free
 *  by policy — returns title/department/kind/openUrl + a short reason, never
 *  content). Surfaced in the admin Storage Health panel (getStorageHealth), the
 *  established reachability-probe home. Uses DriveApp (already a project scope —
 *  KB images/converter), so no new OAuth scope. Returns
 *  { total, reachable, broken: [...], truncated }. */
function kbScanBrokenEmbeds_(cap) {
  const out = { total: 0, reachable: 0, probed: 0, broken: [], truncated: false };
  try {
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return out;
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    let probed = 0;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][KB.TYPE] || 'article') !== 'embed') continue;
      const fid = String(rows[i][KB.DRIVE_FILE_ID] || '').trim();
      if (!fid) continue;
      out.total++;
      if (probed >= cap) { out.truncated = true; continue; }
      probed++;
      const kind = String(rows[i][KB.DRIVE_KIND] || 'doc');
      try {
        // getFileById is lazy — getName() forces the existence/access check.
        DriveApp.getFileById(fid).getName();
        out.reachable++;
      } catch (e) {
        out.broken.push({
          id: String(rows[i][KB.ID] || ''),
          title: String(rows[i][KB.TITLE] || '(untitled)'),
          department: String(rows[i][KB.DEPARTMENT] || ''),
          driveKind: kind,
          openUrl: kbOpenUrl_(kind, fid),
          reason: (e && e.message) ? String(e.message).substring(0, 140) : 'unreachable',
        });
      }
    }
    out.probed = probed;
  } catch (e) { /* best-effort — partial/empty result on any failure */ }
  return out;
}
/** #2 — rep freshness signal. kind ∈ helpful | notHelpful | stale. Rep-callable,
 *  append-only, locked (INV-01). PHI-free-by-policy (the KB store; a 'stale' note
 *  describes the doc, not a patient). A 'stale' flag surfaces the item at the top
 *  of the manager review-due queue (kbGetReviewDue) until a manager marks it
 *  reviewed. Only the actionable 'stale' kind writes an audit row (helpful /
 *  notHelpful are lightweight signal, un-audited like KbViews); the audit row is
 *  PHI-free (id only — the rep's note never enters the shared AuditLog). */
function kbFlagItem(itemId, kind, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const id = String(itemId || '').trim().substring(0, 100);
    if (!id) return { success: false, error: 'Missing item id.' };
    const k = String(kind || '').trim();
    if (!KB_FEEDBACK_KINDS[k]) return { success: false, error: 'Unknown feedback kind.' };
    const n = (k === 'stale') ? String(note || '').trim().substring(0, KB_FEEDBACK_NOTE_MAX) : '';
    getOrCreateKbFeedbackSheet_().appendRow(sheetSafeRow_([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), id, emp.id, emp.name, k, n,
    ]));
    if (k === 'stale') writeAuditLog_(emp, 'KbItemFlagged', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function getOrCreateKbCommentsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_COMMENTS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_COMMENTS_TAB);
    sheet.appendRow(sheetSafeRow_(KB_COMMENTS_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_COMMENTS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** Existence + visibility check for a comment target — the getReferenceItem
 *  boundary applied here: a DRAFT item is indistinguishable from not-found
 *  for a non-admin, so commenting can't probe draft existence (INV-140/147).
 *  Bounded: id + status columns only, never BodyMd. */
function kbCommentTargetOk_(emp, itemId) {
  const sheet = getOrCreateKbSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const ids = sheet.getRange(2, KB.ID + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== itemId) continue;
    const status = kbRowStatus_(sheet.getRange(i + 2, KB.STATUS + 1).getValue());
    return status !== KB_STATUS_DRAFT || !!emp.isAdmin;
  }
  return false;
}
/** Add a comment. Rep-callable, locked (INV-01 — the kbFlagItem posture).
 *  Over-cap REFUSES (a comment is the rep's words — never silently cut).
 *  Audit row is id-only: the comment TEXT lives in the KB store, never the
 *  shared AuditLog (the INV-32 discipline). */
function kbAddComment(itemId, text) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const id = String(itemId || '').trim().substring(0, 100);
    if (!id) return { success: false, error: 'Missing item id.' };
    const t = String(text || '').trim();
    if (!t) return { success: false, error: 'Write a comment first.' };
    if (t.length > KB_COMMENT_MAX_CHARS) {
      return { success: false, error: 'Comments are capped at ' + KB_COMMENT_MAX_CHARS + ' characters (' + t.length + ') — trim it and post again.' };
    }
    if (!kbCommentTargetOk_(emp, id)) return { success: false, error: 'Not found.' };
    const commentId = Utilities.getUuid();
    getOrCreateKbCommentsSheet_().appendRow(sheetSafeRow_([
      commentId, id, emp.id, emp.name, t, Date.now(), 'active',   // AtMs: NUMBER cell — coercion-immune
    ]));
    writeAuditLog_(emp, 'KbCommentAdd', '', '', false, 0, 'id=' + id + '; commentId=' + commentId, emp.email);
    return { success: true, commentId: commentId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** The item's ACTIVE comments, oldest-first — the NEWEST `KB_COMMENTS_LIST_CAP`
 *  of them past the cap (K13). Rep-callable, read-only, bounded tail;
 *  payload-capped with the pre-slice total (INV-169 — the client says "showing
 *  the newest N of M"). Draft targets read as empty for non-admins (no leak). */
function kbGetComments(itemId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const id = String(itemId || '').trim();
    if (!id || !kbCommentTargetOk_(emp, id)) return { comments: [], total: 0, cap: KB_COMMENTS_LIST_CAP, canModerate: false };
    const sheet = getKbSS_().getSheetByName(KB_COMMENTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { comments: [], total: 0, cap: KB_COMMENTS_LIST_CAP, canModerate: !!emp.isManager };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - KB_COMMENTS_SCAN + 1);
    const rows = sheet.getRange(start, 1, last - start + 1, KB_COMMENTS_HEADERS.length).getValues();
    const all = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][KBC.ITEM_ID] || '') !== id) continue;
      if (String(rows[i][KBC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
      all.push({
        commentId: String(rows[i][KBC.ID] || ''),
        empId: String(rows[i][KBC.EMP_ID] || ''),
        name: String(rows[i][KBC.EMP_NAME] || ''),
        text: String(rows[i][KBC.TEXT] || ''),
        atMs: Number(rows[i][KBC.AT_MS]) || 0,
        mine: String(rows[i][KBC.EMP_ID] || '') === String(emp.id),
      });
    }
    // K13 (cycle 22): past the cap, keep the NEWEST, still oldest-first. The
    // slice from the front hid every new comment once an article passed the
    // cap, so a reply posted today never appeared.
    return { comments: all.slice(-KB_COMMENTS_LIST_CAP), total: all.length, cap: KB_COMMENTS_LIST_CAP, canModerate: !!emp.isManager };
  } catch (err) { return { error: err.message }; }
}
/** Remove (soft-delete) a comment — its AUTHOR or a manager (moderation).
 *  The refusal is deliberately NOT the manager-gate string: this is a
 *  per-row ownership rule, not a gated endpoint. Locked; audit row id-only. */
function kbDeleteComment(commentId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const wanted = String(commentId || '').trim();
    if (!wanted) return { success: false, error: 'Missing comment id.' };
    const sheet = getKbSS_().getSheetByName(KB_COMMENTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { success: false, error: 'Comment not found.' };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - KB_COMMENTS_SCAN + 1);
    const ids = sheet.getRange(start, KBC.ID + 1, last - start + 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0] || '') !== wanted) continue;
      const rowIdx = start + i;
      const row = sheet.getRange(rowIdx, 1, 1, KB_COMMENTS_HEADERS.length).getValues()[0];
      if (String(row[KBC.STATUS] || '').trim().toLowerCase() !== 'active') {
        return { success: true, already: true };
      }
      if (String(row[KBC.EMP_ID] || '') !== String(emp.id) && !emp.isManager) {
        return { success: false, error: 'You can only remove your own comments.' };
      }
      sheet.getRange(rowIdx, KBC.STATUS + 1).setValue(sheetSafe_('deleted'));
      writeAuditLog_(emp, 'KbCommentDelete', '', '', false, 0, 'commentId=' + wanted, emp.email);
      return { success: true };
    }
    return { success: false, error: 'Comment not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Round-3 FO — edit a comment in place. AUTHOR-only, deliberately narrower
 *  than delete's author-or-manager: moderation is REMOVAL — a manager
 *  rewriting a rep's words under the rep's name is a worse surface than
 *  removing them. Active rows only (an edited-after-delete row reads as not
 *  found); over-cap REFUSES (the kbAddComment rule); the KbComments tab is a
 *  casual PHI-free discussion surface, NOT an attested record, so in-place
 *  Text mutation is acceptable (unlike FormSubmissions/DocSignatures —
 *  §164.312(c) does not reach it). Audit row id-only (INV-32). */
function kbEditComment(commentId, text) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const wanted = String(commentId || '').trim();
    if (!wanted) return { success: false, error: 'Missing comment id.' };
    const t = String(text || '').trim();
    if (!t) return { success: false, error: 'Write a comment first.' };
    if (t.length > KB_COMMENT_MAX_CHARS) {
      return { success: false, error: 'Comments are capped at ' + KB_COMMENT_MAX_CHARS + ' characters (' + t.length + ') — trim it and save again.' };
    }
    const sheet = getKbSS_().getSheetByName(KB_COMMENTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { success: false, error: 'Comment not found.' };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - KB_COMMENTS_SCAN + 1);
    const ids = sheet.getRange(start, KBC.ID + 1, last - start + 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0] || '') !== wanted) continue;
      const rowIdx = start + i;
      const row = sheet.getRange(rowIdx, 1, 1, KB_COMMENTS_HEADERS.length).getValues()[0];
      if (String(row[KBC.STATUS] || '').trim().toLowerCase() !== 'active') {
        return { success: false, error: 'Comment not found.' };
      }
      if (String(row[KBC.EMP_ID] || '') !== String(emp.id)) {
        return { success: false, error: 'You can only edit your own comments.' };
      }
      sheet.getRange(rowIdx, KBC.TEXT + 1).setValue(sheetSafe_(t));
      writeAuditLog_(emp, 'KbCommentEdit', '', '', false, 0, 'commentId=' + wanted, emp.email);
      return { success: true };
    }
    return { success: false, error: 'Comment not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** #1 — content-gap request. Rep-callable, append-only, locked (INV-01). A
 *  DELIBERATE "please write an article about X" (typically fired from a
 *  zero-result Reference search) — the deliberate rep action is what keeps it
 *  PHI-free-by-policy (the rep describes a topic, not patient specifics). Lands
 *  in the manager KbContentRequests queue. Audit row is PHI-free (reqId only —
 *  the topic/note text never enters the shared AuditLog). */
function kbRequestArticle(topic, note, query) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const t = String(topic || '').trim().substring(0, KB_REQUEST_TOPIC_MAX);
    if (!t) return { success: false, error: 'Describe what you were looking for.' };
    const n = String(note || '').trim().substring(0, KB_REQUEST_NOTE_MAX);
    const q = String(query || '').trim().substring(0, KB_REQUEST_TOPIC_MAX);
    const reqId = Utilities.getUuid();
    getOrCreateKbRequestsSheet_().appendRow(sheetSafeRow_([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), reqId, emp.id, emp.name, t, n, q, 'open', '', '',
    ]));
    writeAuditLog_(emp, 'KbContentRequest', '', '', false, 0, 'reqId=' + reqId, emp.email);
    return { success: true, reqId: reqId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** #1 — manager content-gap queue. Manager-gated (INV-02), read-only, bounded
 *  tail scan (KB_REQUESTS_MAX_SCAN). Returns open requests newest-first + a small
 *  recent-resolved tail for context. PHI-free-by-policy. */
function kbGetContentRequests() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REQUESTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { open: [], resolved: [], openCount: 0 };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_REQUESTS_MAX_SCAN + 1);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_REQUESTS_HEADERS.length).getValues();
    const todayNum = cnIsoToDayNum_(fmtDate_(new Date()));
    const open = [], resolved = [];
    for (let i = rows.length - 1; i >= 0; i--) {   // newest-first
      const r = rows[i];
      const reqId = String(r[KBR.REQ_ID] || '').trim();
      if (!reqId) continue;
      const status = String(r[KBR.STATUS] || 'open').trim() || 'open';
      const iso = kbCellDateIso_(r[KBR.TS], ssTz);
      let ageDays = null;
      if (iso) { const nDay = cnIsoToDayNum_(iso); if (nDay != null && todayNum != null) ageDays = todayNum - nDay; }
      const item = {
        reqId: reqId, repName: String(r[KBR.REP_NAME] || ''),
        topic: String(r[KBR.TOPIC] || ''), note: String(r[KBR.NOTE] || ''),
        query: String(r[KBR.QUERY] || ''), createdIso: iso, ageDays: ageDays, status: status,
      };
      if (status === 'open') open.push(item);
      else if (resolved.length < KB_REQUESTS_RESOLVED_TAIL) resolved.push(item);
    }
    return { open: open, resolved: resolved, openCount: open.length };
  } catch (err) { return { error: err.message }; }
}
/** #1 — manager resolve/dismiss a content request. Manager-gated (INV-02),
 *  locked (INV-01), audited (PHI-free — reqId + action only). Bounded
 *  ReqId-column scan → single-row status/resolution write. */
function kbResolveContentRequest(reqId, action) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    reqId = String(reqId || '').trim();
    if (!reqId) return { success: false, error: 'Missing request id.' };
    const act = (action === 'dismissed') ? 'dismissed' : 'resolved';
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REQUESTS_TAB);
    const last = sheet ? sheet.getLastRow() : 0;
    if (last < 2) return { success: false, error: 'Request not found.' };
    const ids = sheet.getRange(2, KBR.REQ_ID + 1, last - 1, 1).getValues();
    let found = -1;
    for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]).trim() === reqId) { found = i + 2; break; } }
    if (found < 0) return { success: false, error: 'Request not found.' };
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    sheet.getRange(found, KBR.STATUS + 1, 1, 1).setValue(sheetSafe_(act));
    sheet.getRange(found, KBR.RESOLVED_AT + 1, 1, 2).setValues(sheetSafeRows_([[now, emp.email]]));
    writeAuditLog_(emp, 'KbContentRequestResolve', '', '', false, 0, 'reqId=' + reqId + '; action=' + act, emp.email);
    return { success: true, action: act };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
// ── Manager-gated writes (locked + audited) ──────────────────────────────
function kbSaveItem(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    payload = payload || {};
    const department = String(payload.department || '').trim() || 'General';
    const title = String(payload.title || '').trim();
    const type = (payload.type === 'embed') ? 'embed' : 'article';
    if (!title) return { success: false, error: 'Title is required.' };
    let bodyMd = '', driveKind = '', driveFileId = '';
    let imagesExported = 0, imageWarnings = [];
    if (type === 'embed') {
      const parsed = kbParseDriveUrl_(payload.driveUrl);
      if (!parsed) return { success: false, error: 'Could not read that Drive link — paste a Google Doc, Sheet, or file share URL.' };
      driveKind = parsed.kind; driveFileId = parsed.fileId;
    } else {
      bodyMd = String(payload.body || '');
      // Phase 2b — resolve converter image tokens (kbdoc:<fileId>:<n>) to
      // Drive-hosted URLs BEFORE acquiring the lock: the Doc re-walk + blob
      // exports can take seconds and must not stall the global ScriptLock
      // (every punch / call-note write shares it). Length-check the RESOLVED
      // body — that's what the cell stores.
      if (bodyMd.indexOf('](kbdoc:') >= 0) {
        const resolved = kbResolveDocImages_(bodyMd);
        bodyMd = resolved.bodyMd;
        imagesExported = resolved.exported;
        imageWarnings = resolved.warnings;
      }
      if (bodyMd.length > KB_BODY_MAX) return { success: false, error: 'Article is too long (max ~49,000 chars). Split it into multiple articles.' };
    }
    const sortOrder = Number(payload.sortOrder || 0) || 0;
    // #4 — draft→publish. An explicit payload.status wins; on a plain re-save
    // (status absent) the existing row's status is PRESERVED (so editing a draft
    // doesn't silently publish it, and vice-versa). New items default published.
    const requestedStatus = payload.status
      ? (payload.status === KB_STATUS_DRAFT ? KB_STATUS_DRAFT : KB_STATUS_PUBLISHED)
      : null;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = getOrCreateKbSheet_();
      const id = String(payload.id || '').trim() || Utilities.getUuid();
      const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
      const last = sheet.getLastRow();
      let found = -1, prior = null;
      if (last >= 2 && payload.id) {
        const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
        if (found > 0) prior = sheet.getRange(found, 1, 1, KB_HEADERS.length).getValues()[0];
      }
      const status = requestedStatus || (prior ? kbRowStatus_(prior[KB.STATUS]) : KB_STATUS_PUBLISHED);
      // #4 — saving an item (new or edited) counts as reviewing it: stamp
      // ReviewedAt/ReviewedBy alongside UpdatedAt/UpdatedBy so a fresh edit
      // clears the staleness clock. A no-edit "still accurate" confirmation
      // goes through kbMarkReviewed instead.
      const rowVals = [id, department, title, type, bodyMd, driveKind, driveFileId, sortOrder, now, emp.email, now, emp.email, status];
      if (found > 0) {
        // #4 — snapshot the PRIOR content to the revision log before overwriting.
        kbAppendRevision_(prior, emp.email, 'edit');
        sheet.getRange(found, 1, 1, KB_HEADERS.length).setValues(sheetSafeRows_([rowVals]));
      } else {
        sheet.appendRow(sheetSafeRow_(rowVals));
      }
      invalidateKbCache_();
      writeAuditLog_(emp, 'KbItemSave', '', '', false, 0,
        'id=' + id + '; dept=' + department + '; type=' + type + '; status=' + status +
        (imagesExported ? '; imagesExported=' + imagesExported : '') +
        (imageWarnings.length ? '; imageWarnings=' + imageWarnings.length + ': ' +
          String(imageWarnings[0]).substring(0, 160) : ''), emp.email);
      return { success: true, id: id, status: status, imagesExported: imagesExported, imageWarnings: imageWarnings };
    } finally { lock.releaseLock(); }
  } catch (err) { return { success: false, error: err.message }; }
}
function kbDeleteItem(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) {
          // Cycle-9 L-20: snapshot the FINAL content to KbRevisions before the
          // row disappears — delete was the one content-destroying action with
          // no revision trail (a mistaken admin delete permanently lost the
          // article; kbRevertItem needs a live row, so even earlier snapshots
          // were unreachable). Best-effort (kbAppendRevision_ self-swallows) —
          // a revision-log failure never blocks the delete. Restoring is a
          // manual copy from KbRevisions today; an undelete endpoint is a
          // follow-on.
          const prior = sheet.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
          kbAppendRevision_(prior, emp.email, 'delete');
          sheet.deleteRow(i + 2);
          break;
        }
      }
    }
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemDelete', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── #4 — article revision history + draft→publish ──────────────────────────
function getOrCreateKbRevisionsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_REVISIONS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_REVISIONS_TAB);
    sheet.appendRow(sheetSafeRow_(KB_REVISIONS_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_REVISIONS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** #4 — append a snapshot of a PRIOR KB row's content to KbRevisions before it's
 *  overwritten. `prior` is a full KB row (KB_HEADERS-wide). Best-effort — a
 *  revision-log failure must NEVER fail the save/revert that triggered it. */
function kbAppendRevision_(prior, replacedBy, action) {
  try {
    if (!prior) return;
    const sheet = getOrCreateKbRevisionsSheet_();
    const ssTz = sheet.getParent().getSpreadsheetTimeZone();
    sheet.appendRow(sheetSafeRow_([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
      Utilities.getUuid(),
      String(prior[KB.ID] || ''),
      String(prior[KB.TITLE] || ''),
      String(prior[KB.TYPE] || 'article'),
      String(prior[KB.BODY_MD] || ''),
      String(prior[KB.DRIVE_KIND] || ''),
      String(prior[KB.DRIVE_FILE_ID] || ''),
      kbCellTs_(prior[KB.UPDATED_AT], ssTz),   // coerced-Date safe
      String(prior[KB.UPDATED_BY] || ''),
      replacedBy,
      action,
    ]));
  } catch (e) { /* best-effort */ }
}
/** #4 — admin-gated, read-only. The revision history for one item, newest-first,
 *  bounded. PHI-free by policy (KB content). Each entry carries a preview + the
 *  prior author/timestamp; `revId` is the key kbRevertItem restores. */
function kbGetRevisions(id) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    id = String(id || '').trim();
    if (!id) return { error: 'Missing item id.' };
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REVISIONS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { items: [] };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_REVISIONS_MAX_SCAN + 1);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_REVISIONS_HEADERS.length).getValues();
    const items = [];
    for (let i = rows.length - 1; i >= 0; i--) {   // newest snapshot first
      if (String(rows[i][KBREV.ITEM_ID] || '').trim() !== id) continue;
      const type = String(rows[i][KBREV.TYPE] || 'article');
      const body = String(rows[i][KBREV.BODY_MD] || '');
      items.push({
        revId: String(rows[i][KBREV.REV_ID] || ''),
        capturedAt: kbCellTs_(rows[i][KBREV.CAPTURED_AT], ssTz),
        title: String(rows[i][KBREV.TITLE] || ''),
        type: type,
        priorUpdatedAt: kbCellTs_(rows[i][KBREV.PRIOR_UPDATED_AT], ssTz),
        priorUpdatedBy: String(rows[i][KBREV.PRIOR_UPDATED_BY] || ''),
        replacedBy: String(rows[i][KBREV.REPLACED_BY] || ''),
        action: String(rows[i][KBREV.ACTION] || 'edit'),
        preview: (type === 'embed')
          ? ('[embed] ' + String(rows[i][KBREV.DRIVE_KIND] || ''))
          : body.replace(/\s+/g, ' ').trim().substring(0, 160),
        chars: body.length,
      });
      if (items.length >= KB_REVISIONS_PER_ITEM) break;
    }
    return { items: items };
  } catch (err) { return { error: err.message }; }
}
/** #4 — admin-gated, locked, audited. Restore a prior revision's CONTENT
 *  (title/type/body/drive fields) into the live row; department, sortOrder,
 *  status, and id stay as they are now. The current content is snapshotted first
 *  (action='revert'), so a revert is itself reversible. */
function kbRevertItem(id, revId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim(); revId = String(revId || '').trim();
    if (!id || !revId) return { success: false, error: 'Missing id.' };
    const ss = getKbSS_();
    const revSheet = ss.getSheetByName(KB_REVISIONS_TAB);
    if (!revSheet || revSheet.getLastRow() < 2) return { success: false, error: 'Revision not found.' };
    const revLast = revSheet.getLastRow();
    const revStart = Math.max(2, revLast - KB_REVISIONS_MAX_SCAN + 1);
    const revRows = revSheet.getRange(revStart, 1, revLast - revStart + 1, KB_REVISIONS_HEADERS.length).getValues();
    let snap = null;
    for (let i = revRows.length - 1; i >= 0; i--) {
      if (String(revRows[i][KBREV.REV_ID] || '').trim() === revId && String(revRows[i][KBREV.ITEM_ID] || '').trim() === id) { snap = revRows[i]; break; }
    }
    if (!snap) return { success: false, error: 'Revision not found.' };
    const kbSheet = getOrCreateKbSheet_();
    const last = kbSheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = kbSheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    const cur = kbSheet.getRange(found, 1, 1, KB_HEADERS.length).getValues()[0];
    kbAppendRevision_(cur, emp.email, 'revert');   // current content is reversible too
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    const restored = [
      id,
      String(cur[KB.DEPARTMENT] || 'General'),
      String(snap[KBREV.TITLE] || ''),
      String(snap[KBREV.TYPE] || 'article'),
      String(snap[KBREV.BODY_MD] || ''),
      String(snap[KBREV.DRIVE_KIND] || ''),
      String(snap[KBREV.DRIVE_FILE_ID] || ''),
      Number(cur[KB.SORT_ORDER] || 0) || 0,
      now, emp.email, now, emp.email,
      kbRowStatus_(cur[KB.STATUS]),
    ];
    kbSheet.getRange(found, 1, 1, KB_HEADERS.length).setValues(sheetSafeRows_([restored]));
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemRevert', '', '', false, 0, 'id=' + id + '; revId=' + revId, emp.email);
    return { success: true, id: id };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** #4 — admin-gated, locked, audited. Flip a draft to published (the "Release"
 *  action, mirroring EmpDocs releaseDoc). No content change. */
function kbPublishItem(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim();
    if (!id) return { success: false, error: 'Missing item id.' };
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    sheet.getRange(found, KB.STATUS + 1, 1, 1).setValue(sheetSafe_(KB_STATUS_PUBLISHED));
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemPublish', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true, id: id };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── KB Phase 2 — Google-Doc → markdown article converter ───────────────────
// Per-item, review-before-save migration off Drive embeds: kbConvertDriveDoc
// reads a Google Doc via DocumentApp and emits ONLY the markdown subset kbMd_
// renders (headings, bold/italic, links, ul/ol, hr, paragraphs). The result is
// returned to the editor for the manager to REVIEW (live preview) — nothing is
// saved until they press Save (the existing kbSaveItem path), and the Drive
// file is never modified. A blind "convert all embeds" batch was deliberately
// NOT built: unreviewed conversions could silently replace working embeds with
// degraded articles (images/tables don't survive).
//
// The walker compares String(getType()) / String(getHeading()) /
// String(getGlyphType()) against enum NAMES (DocumentApp enums stringify to
// their names) so the Node harness can drive it with plain-object stubs —
// see the "kb — Doc→markdown converter" tests in test/client/run.js.
/** PURE: unique {fileId, ord} refs from kbdoc image tokens in an article body. */
function kbExtractDocImageRefs_(bodyMd) {
  const out = [];
  const seen = {};
  const re = /!\[[^\]]*\]\(kbdoc:([a-zA-Z0-9_-]+):(\d+)\)/g;
  let m;
  while ((m = re.exec(String(bodyMd || ''))) !== null) {
    const key = m[1] + ':' + m[2];
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ fileId: m[1], ord: parseInt(m[2], 10) });
  }
  return out;
}
/** PURE: swap each kbdoc image token via resolve(fileId, ord) → https URL.
 *  null / a throwing resolver degrades that token to the italic placeholder;
 *  the caller reports `failed` as a warning. */
function kbReplaceDocImageTokens_(bodyMd, resolve) {
  let failed = 0;
  const out = String(bodyMd || '').replace(
    /!\[([^\]]*)\]\(kbdoc:([a-zA-Z0-9_-]+):(\d+)\)/g,
    function (whole, alt, fileId, ordStr) {
      let url = null;
      try { url = resolve(fileId, parseInt(ordStr, 10)); } catch (e) { url = null; }
      if (!url) { failed++; return '*[image — see the original Doc]*'; }
      return '![' + alt + '](' + url + ')';
    });
  return { bodyMd: out, failed: failed };
}
/** Collects a Doc body's INLINE_IMAGE blobs in the SAME walk order the
 *  converter assigns ordinals: paragraph children, document order. Drawings
 *  and images inside tables/list items are never tokenized, so they are not
 *  collected either — the two walks MUST stay mirrored or ordinals drift and
 *  the wrong image exports. 1-based ordinal ord reads blobs[ord-1]. */
function kbCollectDocInlineImages_(body, cap) {
  const blobs = [];
  const n = body.getNumChildren();
  for (let i = 0; i < n && blobs.length < cap; i++) {
    const el = body.getChild(i);
    if (String(el.getType()) !== 'PARAGRAPH') continue;
    const m = el.getNumChildren();
    for (let c = 0; c < m && blobs.length < cap; c++) {
      const child = el.getChild(c);
      if (String(child.getType()) !== 'INLINE_IMAGE') continue;
      blobs.push(child.getBlob());
    }
  }
  return blobs;
}
/** KB Images folder: Script Property first, else create + share domain-link-
 *  viewable (so <img> tags render for any signed-in rep) + store the id.
 *  Workspace policy may forbid link sharing — the create still succeeds with
 *  a console warning, and the readers recover on their own: a blocked
 *  thumbnail is refetched through kbGetImageData (scoped to this folder) and
 *  rendered as a data URL, so manual sharing is an optimization, not a
 *  requirement. */
function getOrCreateKbImagesFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(KB_IMAGES_FOLDER_PROP) || '').trim();
  let openErr = '';
  if (id) {
    try { return DriveApp.getFolderById(id); }
    catch (e) {
      // Operator 2026-09-09: this catch swallowed the reason entirely, so the
      // caller's warning could only ever report the CREATE error — a trashed
      // folder, a revoked share and a missing Drive scope all read alike, and
      // the message said "open or create" while describing only the second
      // half. Carry the reason into the throw (INV-187).
      openErr = KB_IMAGES_FOLDER_PROP + ' is set to ' + id + ' but that folder could not be opened (' + e.message + ')';
      console.warn('KB Images: ' + openErr + ' — creating a replacement.');
    }
  }
  let folder;
  try { folder = DriveApp.createFolder('KB Images'); }
  catch (e) {
    const hint = driveScopeError_(e.message) ? ' — ' + DRIVE_REAUTH_HINT : '';
    throw new Error((openErr
      ? openErr + '; creating a replacement also failed: ' + e.message
      : KB_IMAGES_FOLDER_PROP + ' is not set, and the folder could not be created: ' + e.message) + hint);
  }
  try { folder.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { console.warn('KB Images folder sharing failed (' + e.message + ') — images may not render for reps until shared.'); }
  props.setProperty(KB_IMAGES_FOLDER_PROP, folder.getId());
  return folder;
}
/** Resolves kbdoc image tokens at SAVE time. Runs OUTSIDE the script lock —
 *  Drive exports are slow and only the sheet write needs the lock. Every
 *  failure degrades per-token to the placeholder (warned), never throws. */
function kbResolveDocImages_(bodyMd) {
  const refs = kbExtractDocImageRefs_(bodyMd);
  if (refs.length === 0) return { bodyMd: bodyMd, exported: 0, warnings: [] };
  const warnings = [];
  let folder = null;
  try { folder = getOrCreateKbImagesFolder_(); }
  catch (e) {
    const r0 = kbReplaceDocImageTokens_(bodyMd, function () { return null; });
    warnings.push('KB Images folder: ' + e.message + ' — image(s) left as placeholders.');
    return { bodyMd: r0.bodyMd, exported: 0, warnings: warnings };
  }
  const blobsByDoc = {};   // fileId → blobs[] | null (Doc unreachable)
  const urlCache = {};     // "fileId:ord" → resolved URL
  let exported = 0;
  const resolve = function (fileId, ord) {
    const key = fileId + ':' + ord;
    if (urlCache[key]) return urlCache[key];
    if (!(fileId in blobsByDoc)) {
      try {
        blobsByDoc[fileId] = kbCollectDocInlineImages_(DocumentApp.openById(fileId).getBody(), KB_DOC_IMAGE_CAP);
      } catch (e) {
        blobsByDoc[fileId] = null;
        warnings.push('Could not open the source Doc to export its image(s): ' + e.message);
      }
    }
    const blobs = blobsByDoc[fileId];
    if (!blobs || ord < 1 || ord > blobs.length) return null;
    // NAME a per-image Drive failure. The token replacer's own catch reduces
    // any throw to a bare null, so before this the ONLY message a failed
    // createFile ever produced was the generic "N token(s) could not be
    // resolved" — the operator hit exactly that live (2026-08-27) and had no
    // way to learn WHY (a domain Drive policy, a quota, anything).
    try {
      const name = 'kbdoc-' + fileId + '-' + ord;
      let file = null;
      const existing = folder.getFilesByName(name);
      if (existing.hasNext()) {
        file = existing.next();   // reuse — idempotent re-saves, stable URLs
      } else {
        file = folder.createFile(blobs[ord - 1].copyBlob().setName(name));
        exported++;
      }
      const url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
      urlCache[key] = url;
      return url;
    } catch (e) {
      warnings.push('Image ' + ord + ' could not be exported to Drive: ' + e.message);
      return null;
    }
  };
  const r = kbReplaceDocImageTokens_(bodyMd, resolve);
  if (r.failed > 0) warnings.push(r.failed + ' image token(s) could not be resolved — left as placeholders.');
  return { bodyMd: r.bodyMd, exported: exported, warnings: warnings };
}
/** PURE: parse a data:image/…;base64,… URL → { contentType, base64 } or null.
 *  The whitelist check happens at the caller (this just shape-parses). */
function kbParseImageDataUrl_(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+\/=\s]+)$/i);
  if (!m) return null;
  return { contentType: m[1].toLowerCase(), base64: m[2].replace(/\s+/g, '') };
}
/** ADMIN-gated (`emp.isAdmin`) — the KB editor is admin-only in the code,
 *  whatever INV-02 says about the tier (F-26). Validates the data
 *  URL (type whitelist + size cap), writes the blob to the KB Images folder
 *  as kbpaste-<stamp>-<rand>, audits a PHI-free KbImageUpload row, and
 *  returns the thumbnail URL. Deliberately NO ScriptLock: this writes only a
 *  Drive file (atomic, no shared-sheet state) — holding the global lock
 *  through a multi-second blob upload would stall every punch/note write. */
function kbUploadImage(dataUrl) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    const raw = String(dataUrl || '');
    if (raw.length > KB_IMG_UPLOAD_MAX_CHARS) {
      return { success: false, error: 'Image too large (max ~3MB) — crop or downscale the screenshot.' };
    }
    const parsed = kbParseImageDataUrl_(raw);
    if (!parsed || KB_IMG_UPLOAD_TYPES.indexOf(parsed.contentType) < 0) {
      return { success: false, error: 'Paste a PNG/JPEG/GIF/WebP image.' };
    }
    const folder = getOrCreateKbImagesFolder_();
    const stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss');
    const name = 'kbpaste-' + stamp + '-' + Utilities.getUuid().substring(0, 8);
    const blob = Utilities.newBlob(Utilities.base64Decode(parsed.base64), parsed.contentType, name);
    const file = folder.createFile(blob);
    writeAuditLog_(emp, 'KbImageUpload', '', '', false, 0,
      'fileId=' + file.getId() + '; name=' + name + '; type=' + parsed.contentType, emp.email);
    return { success: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Rep-callable, READ-ONLY, folder-scoped. Returns one KB image as a data URL.
 *  THE SCOPE CHECK IS THE SECURITY BOUNDARY: the file's parents must include
 *  the KB Images folder (Script Property KB_IMAGES_FOLDER_ID). Without it,
 *  this endpoint would let any signed-in employee read ANY Drive file the
 *  deployer's account can open, by id — so an unset property, a file outside
 *  the folder, or an unreadable file all return the same generic refusal
 *  (existence never leaks). No ScriptLock: a read-only Drive fetch must not
 *  queue punch/note writes (the kbUploadImage no-lock reasoning). Type
 *  whitelist + size cap mirror the upload path — anything legitimately in the
 *  folder passes; anything odd degrades to the alt text the reader already
 *  shows. */
function kbGetImageData(fileId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    fileId = String(fileId || '').trim();
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return { error: 'Not available.' };
    const folderId = PropertiesService.getScriptProperties().getProperty(KB_IMAGES_FOLDER_PROP);
    if (!folderId) return { error: 'Not available.' };
    let file;
    try { file = DriveApp.getFileById(fileId); }
    catch (e) { return { error: 'Not available.' }; }
    let inKbFolder = false;
    const parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) { inKbFolder = true; break; }
    }
    if (!inKbFolder) return { error: 'Not available.' };
    const blob = file.getBlob();
    const contentType = String(blob.getContentType() || '').toLowerCase();
    if (KB_IMG_UPLOAD_TYPES.indexOf(contentType) < 0) return { error: 'Not available.' };
    const bytes = blob.getBytes();
    if (bytes.length > KB_IMG_FETCH_MAX_BYTES) return { error: 'Not available.' };
    return { success: true, dataUrl: 'data:' + contentType + ';base64,' + Utilities.base64Encode(bytes) };
  } catch (err) { return { error: 'Not available.' }; }
}
/** PURE: great-circle miles between two lat/lng points (haversine). */
function kbHaversineMiles_(lat1, lon1, lat2, lon2) {
  const R = 3958.8;                        // mean Earth radius, miles
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));
}
/** One geocode through the free built-in service. null when nothing matched;
 *  `{ unavailable }` when the SERVICE failed (F-15); `{ partial, formatted }`
 *  when the only match is partial (K5 — the geocoder guessed); otherwise the
 *  place.
 *
 *  ELIG added `state`, and WHERE it comes from is the point: the geocoder's
 *  own `administrative_area_level_1` short name, never a string-parse of
 *  `formatted_address`. Reading "TX" out of "123 Main St, Dallas, TX 75201,
 *  USA" works until an address formats differently — a military address, a
 *  PO box, a territory — and then it fails SILENTLY, which for an eligibility
 *  check means a confident wrong answer. Absent components → state '' , which
 *  every caller must treat as "could not determine", not as "not eligible". */
function kbGeocodeOne_(addr) {
  try {
    const res = Maps.newGeocoder().setRegion('us').geocode(addr);
    // F-15 (2026-09-17): a non-OK status that is NOT "no such place" — the
    // daily quota (OVER_QUERY_LIMIT), REQUEST_DENIED, a service error, or a
    // throw ("Service invoked too many times") — used to collapse to null, and
    // every caller told the rep the ADDRESS was wrong. It was not. Report the
    // service failure as its own shape; callers treat `unavailable` as
    // "could not check", never as "not found" (g02/g114).
    const status = String((res && res.status) || 'NO_RESPONSE');
    if (status !== 'OK' && status !== 'ZERO_RESULTS') return { unavailable: true, status: status };
    if (status !== 'OK' || !res.results || !res.results.length) return null;
    const r = res.results[0];
    if (!r.geometry || !r.geometry.location) return null;
    // K5 (cycle 22): a PARTIAL match is the geocoder guessing. "500 Main St,
    // Irving TX 750" resolves to SOMEWHERE — often the city centre — and a
    // distance measured from there answers a different question than the one
    // asked. Not found and partly found are different answers (g128), so it
    // comes back as its own shape and the caller asks for a fuller address.
    if (r.partial_match) return { partial: true, formatted: String(r.formatted_address || '') };
    let state = '', city = '';
    const comps = r.address_components || [];
    for (let i = 0; i < comps.length; i++) {
      const types = comps[i].types || [];
      if (!state && types.indexOf('administrative_area_level_1') >= 0) {
        state = String(comps[i].short_name || '').trim().toUpperCase();
      }
      // `locality` is the city proper. `postal_town` is its counterpart where
      // the geocoder does not emit one; a rural address may have neither, and
      // '' is then the honest answer — the caller must treat it as "could not
      // determine", never as "no match in the city list".
      if (!city && (types.indexOf('locality') >= 0 || types.indexOf('postal_town') >= 0)) {
        city = String(comps[i].long_name || '').trim();
      }
    }
    return { lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      formatted: String(r.formatted_address || ''), state: state, city: city };
  } catch (e) { return { unavailable: true, status: 'ERROR', message: String((e && e.message) || e) }; }
}
/** K5 (cycle 22) — the ONE message for a partial geocode: the address only
 *  partly matched, so no distance is measured from Google's guess. */
function kbGeocodePartialMsg_(g) {
  return 'That address only partly matched' + (g && g.formatted ? ' (the closest place found was "' + g.formatted + '")' : '') +
    ' — add the street number and city, or use a 5-digit ZIP code.';
}
/** F-15 — the ONE message for a geocoder service failure, shared by every
 *  caller so "the service is down" never reads as "your address is wrong". */
function kbGeocodeUnavailableMsg_(g) {
  return 'The address service could not be reached (' + String((g && g.status) || 'unavailable') +
    ') — this is not a problem with the address. Try again in a minute; if it persists, the daily lookup quota may be spent.';
}

/** Geocode a list of addresses through the permanent hashed-coordinate cache.
 *
 *  Extracted from kbMapDistances so ELIG's warehouse lookup shares ONE cache
 *  rather than opening a second one with its own hygiene rules — two caches of
 *  the same coordinates is two things to keep bounded, and the second would be
 *  the one nobody remembered to bound. Entries are keyed by an address HASH and
 *  hold lat/lng only; the CALLER'S query is never stored (kbMapDistances says
 *  why, and that stays true here).
 *
 *  Returns an array positionally matching `addrs`, with null where a geocode
 *  was unavailable. */
function kbGeocodeCached_(addrs) {
  const props = PropertiesService.getScriptProperties();
  let cache = {};
  try { cache = JSON.parse(props.getProperty(KB_MAP_GEOCODE_CACHE_PROP) || '{}') || {}; } catch (e) { cache = {}; }
  if (typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  const fresh = {};
  let dirty = false;
  const out = addrs.map(function (a) {
    if (!a) return null;
    const key = kbMapCacheKey_(a);
    const hit = cache[key];
    if (hit && isFinite(hit.lat) && isFinite(hit.lng)) return hit;
    const geo = kbGeocodeOne_(a);
    if (geo && geo.unavailable) return null;   // F-15: a service failure is "not placed", never cached, never a coordinate
    if (geo && geo.partial) return null;       // K5: a warehouse the geocoder could only GUESS at is not placed either
    if (geo) { cache[key] = fresh[key] = { lat: geo.lat, lng: geo.lng }; dirty = true; }
    return geo;
  });
  if (dirty) {
    try {
      if (Object.keys(cache).length > KB_MAP_GEOCODE_CACHE_MAX) cache = fresh;
      // Q1 — and the cache self-resets on BYTES, not only on entry count: 200
      // entries of {lat,lng} keyed by hash sit on the order of the 9KB cap.
      // Over the cap it falls back to THIS run's addresses, then to nothing.
      const freshStr = JSON.stringify(fresh);
      propSetBounded_(KB_MAP_GEOCODE_CACHE_PROP, JSON.stringify(cache), { mode: 'degrade',
        shrink: function (str) { return str !== freshStr && Object.keys(fresh).length ? freshStr : null; } });
    } catch (e) { /* best-effort — a lost cache write only costs quota later */ }
  }
  return out;
}
function kbMapCacheKey_(addr) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(addr).toLowerCase()));
}
/** Rep-callable, read-only, bounded. `addresses` are the article's own wh|
 *  lines (client-supplied but only ever geocoded + measured — nothing is
 *  written per-address beyond the coordinate cache, which stores lat/lng
 *  keyed by an address HASH, never the query). No ScriptLock — read-only
 *  apart from the best-effort cache property write. */
function kbMapDistances(query, addresses) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    query = String(query || '').trim();
    if (query.length < 3 || query.length > KB_MAP_QUERY_MAX) {
      return { error: 'Enter a ZIP code or city (3–' + KB_MAP_QUERY_MAX + ' characters).' };
    }
    if (!Array.isArray(addresses) || !addresses.length) return { error: 'No warehouses to measure.' };
    const addrs = addresses.slice(0, KB_MAP_MAX_WH)
      .map(function (a) { return String(a || '').trim().substring(0, KB_MAP_QUERY_MAX); });
    // Warehouse geocodes: the permanent Script-Property cache, shared with the
    // ELIG radius check through kbGeocodeCached_.
    const whGeo = kbGeocodeCached_(addrs);
    // The QUERY geocode: computed, used, returned — deliberately never stored.
    const qGeo = kbGeocodeOne_(query);
    if (qGeo && qGeo.unavailable) return { error: kbGeocodeUnavailableMsg_(qGeo) };   // F-15: the service, not the address
    if (qGeo && qGeo.partial) return { error: kbGeocodePartialMsg_(qGeo) };            // K5
    if (!qGeo) return { error: 'Could not find that location — try a 5-digit ZIP code.' };
    const results = whGeo.map(function (g, i) {
      if (!g) return { i: i, miles: null };
      return { i: i, miles: Math.round(kbHaversineMiles_(qGeo.lat, qGeo.lng, g.lat, g.lng) * 10) / 10 };
    });
    return { success: true, formatted: qGeo.formatted, results: results };
  } catch (err) { return { error: 'Lookup failed — try again.' }; }
}
/** PURE: whitelist-validate raw client facets against the server-side
 *  vocabularies. Anything not in the vocab is DROPPED (never an error), so
 *  the result can only contain values the server already knows — the vendor
 *  payload is enum-only by construction (INV-119). Matching is
 *  case-insensitive; the canonical (vocab) casing is returned. Tags dedupe
 *  and cap at 8. */
function kbAiSanitizeFacets_(facets, vocab) {
  facets = facets || {}; vocab = vocab || {};
  const out = { department: '', updateType: '', flagType: '', tags: [] };
  const deptIn = String(facets.department || '').trim().toLowerCase();
  (vocab.departments || []).forEach(function (d) {
    if (deptIn && String(d).trim().toLowerCase() === deptIn) out.department = String(d);
  });
  const updIn = String(facets.updateType || '').trim().toLowerCase();
  (vocab.updateTypes || []).forEach(function (u) {
    if (updIn && String(u).trim().toLowerCase() === updIn) out.updateType = String(u);
  });
  const flagIn = String(facets.flagType || '').trim().toLowerCase();
  if ((vocab.flagTypes || []).indexOf(flagIn) >= 0) out.flagType = flagIn;
  const known = {};
  (vocab.tags || []).forEach(function (t) { known[String(t).trim().toLowerCase()] = true; });
  const seen = {};
  (Array.isArray(facets.tags) ? facets.tags : []).forEach(function (t) {
    const tag = String(t || '').trim().toLowerCase();
    if (tag && known[tag] && !seen[tag] && out.tags.length < 8) { seen[tag] = true; out.tags.push(tag); }
  });
  return out;
}
/** PURE: canonical, order-insensitive serialization of sanitized facets —
 *  the cache-key payload (and the client's collapse-after-seen key). Tags
 *  sort; casing lowers; empty facets are omitted. */
function kbAiCanonicalFacets_(clean) {
  clean = clean || {};
  const parts = [];
  if (clean.department) parts.push('dept=' + String(clean.department).toLowerCase());
  if (clean.updateType) parts.push('update=' + String(clean.updateType).toLowerCase());
  if (clean.flagType) parts.push('flag=' + String(clean.flagType).toLowerCase());
  const tags = (clean.tags || []).map(function (t) { return String(t).toLowerCase(); }).sort();
  if (tags.length) parts.push('tags=' + tags.join(','));
  return parts.join('|');
}
/** PURE: search-query terms derived from sanitized facets — feeds the
 *  existing section search (kebab-case tags split into words). */
function kbAiQueryTerms_(clean) {
  clean = clean || {};
  const parts = [];
  if (clean.updateType) parts.push(String(clean.updateType));
  (clean.tags || []).forEach(function (t) { parts.push(String(t).replace(/-/g, ' ')); });
  if (clean.flagType) parts.push(String(clean.flagType));
  if (clean.department) parts.push(String(clean.department));
  return parts.join(' ').trim();
}
/** PURE: assemble the vendor prompt from sanitized facets + KB chunks ONLY.
 *  Deliberately takes no other inputs (INV-119) — there is no parameter
 *  through which free-typed note text could reach the payload. */
function kbAiBuildPrompt_(clean, chunks) {
  const facetLines = [];
  if (clean.department) facetLines.push('Department: ' + clean.department);
  if (clean.updateType) facetLines.push('Update type: ' + clean.updateType);
  if (clean.flagType) facetLines.push('Flag: ' + clean.flagType);
  if (clean.tags && clean.tags.length) facetLines.push('Tags: ' + clean.tags.join(', '));
  let excerpts = '';
  (chunks || []).forEach(function (c, i) {
    excerpts += '\n--- Excerpt ' + (i + 1) + ' — "' + c.title + '"' +
      (c.heading ? ' § "' + c.heading + '"' : '') + ' ---\n' + c.chunkMd + '\n';
  });
  return {
    system: 'You are a concise assistant for a medical-supply customer-service team’s internal knowledge base. ' +
      'You receive call attributes (enums only) and excerpts from the team’s own reference articles. ' +
      'Write 2-4 short sentences of practical guidance for the rep handling this kind of call, based ONLY on the excerpts. ' +
      'If the excerpts do not cover the situation, reply with exactly: NOT_COVERED. ' +
      'Plain text only — no markdown, no preamble.',
    user: 'Call attributes:\n' + facetLines.join('\n') + '\n\nReference excerpts:\n' + excerpts,
  };
}
/** Script-Property-backed runtime config. The API key is the only secret;
 *  model + daily cap are Admin-adjustable (saveKbAiSettings). */
function getKbAiConfig_() {
  const props = PropertiesService.getScriptProperties();
  const cap = parseFloat(props.getProperty('KB_AI_DAILY_CAP'));
  return {
    apiKey: props.getProperty('KB_AI_API_KEY') || '',
    model: String(props.getProperty('KB_AI_MODEL') || KB_AI_DEFAULT_MODEL),
    dailyCap: (isFinite(cap) && cap >= 0) ? cap : KB_AI_DEFAULT_DAILY_CAP,
  };
}
function kbAiGeneration_() {
  try { return PropertiesService.getScriptProperties().getProperty(KB_AI_GEN_PROP) || '0'; }
  catch (_) { return '0'; }
}
/** Today's org-wide vendor spend — {date, usd, calls}; resets on date roll. */
function kbAiReadSpend_() {
  const today = fmtDate_(new Date());
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(KB_AI_SPEND_PROP);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.date === today) return { date: today, usd: Number(o.usd) || 0, calls: Number(o.calls) || 0 };
    }
  } catch (_) {}
  return { date: today, usd: 0, calls: 0 };
}
/** Atomically applies a spend delta under a brief lock: usdDelta (clamped so
 *  the counter never goes negative) and callDelta. Used for reconcile
 *  (actualCost − reserve, +1 call) and refund (−reserve, 0 calls). On lock
 *  contention the write still applies best-effort — the cap is a soft budget
 *  guard, and the vendor-console hard spend cap is the backstop (set one
 *  there too). */
function kbAiApplySpend_(usdDelta, callDelta) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(3000); } catch (_) {}
  try {
    const s = kbAiReadSpend_();
    s.usd = Math.max(0, s.usd + usdDelta);
    s.calls += (callDelta || 0);
    propSetBounded_(KB_AI_SPEND_PROP, JSON.stringify(s), { mode: 'degrade', shrink: function () { return null; } });   // Q1 — a three-field counter; unreachable, so a reset is the only degrade
  } catch (e) {
    // F2 — surface the degradation: if this write fails the daily spend
    // counter freezes while real spend continues (the soft cap stops
    // counting). Best-effort by design — never block the caller — but log
    // it so the silent drift is visible. The Anthropic-console hard cap is
    // the true backstop.
    console.warn('kbAiApplySpend_ failed (spend counter not updated): ' + (e && e.message));
  }
  finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}
/** L-2 — atomic cap check + reservation. Reads today's spend and, in the SAME
 *  lock, reserves `reserve` USD if under the cap. Returns true if the caller
 *  may proceed (reservation applied), false if the cap is already reached.
 *  Doing the read+check+reserve atomically closes the lost-update window where
 *  several concurrent cache misses each read spend < cap and all call the
 *  vendor before any increment lands. The caller reconciles to the real cost
 *  (or refunds the reservation on a failed/empty call) via kbAiApplySpend_.
 *  On lock contention it fails OPEN (returns true) — matching the prior
 *  best-effort posture; the vendor-console hard cap remains the true backstop. */
function kbAiTryReserveSpend_(cap, reserve) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(3000); } catch (_) {}
  try {
    const s = kbAiReadSpend_();
    if (s.usd >= cap) return false;
    s.usd += reserve;
    propSetBounded_(KB_AI_SPEND_PROP, JSON.stringify(s), { mode: 'degrade', shrink: function () { return null; } });
    return true;
  } catch (_) { return true; }
  finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}
/** Estimated cost (USD) of one call from the response's usage tokens.
 *  Unknown model → most expensive known rates (never undercounts the cap). */
function kbAiEstimateCostUsd_(model, usage) {
  let price = KB_AI_MODEL_PRICES[model];
  if (!price) {
    price = { input: 0, output: 0 };
    Object.keys(KB_AI_MODEL_PRICES).forEach(function (k) {
      price.input = Math.max(price.input, KB_AI_MODEL_PRICES[k].input);
      price.output = Math.max(price.output, KB_AI_MODEL_PRICES[k].output);
    });
  }
  const inTok = (usage && Number(usage.input_tokens)) || 0;
  const outTok = (usage && Number(usage.output_tokens)) || 0;
  return (inTok * price.input + outTok * price.output) / 1e6;
}
/** One UrlFetchApp POST to the Anthropic Messages API. Returns
 *  { text, usage } or null on any failure (the caller degrades to none). */
function kbAiCallVendor_(cfg, prompt) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: cfg.model,
      max_tokens: 400,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('kbAiCallVendor_ HTTP ' + res.getResponseCode() + ': ' + String(res.getContentText()).substring(0, 300));
    return null;
  }
  const body = JSON.parse(res.getContentText());
  let text = '';
  (body.content || []).forEach(function (b) { if (b && b.type === 'text') text += b.text; });
  return { text: text.trim(), usage: body.usage || {} };
}
/** Rep-callable (requires an enrolled employee), gated by the kbAiGuidance
 *  feature flag (scope both — the server check here is the enforcement).
 *  See the section comment above for the full posture. Never throws to the
 *  client: every failure path returns { none: true, reason }. */
function kbGetFacetGuidance(facets) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    if (!getFlag_('kbAiGuidance')) return { none: true, reason: 'disabled' };

    // Vocabularies: departments + update types are org config; tags are the
    // CALLER's own established tag vocabulary (tags already on their saved
    // notes — the same source as the tag-autocomplete datalist), so a novel
    // tag typed this minute never reaches the vendor.
    const updByDept = getUpdateSuggestions_() || {};
    const updateTypes = (CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT || []).slice();
    Object.keys(updByDept).forEach(function (d) {
      (updByDept[d] || []).forEach(function (u) { if (updateTypes.indexOf(u) < 0) updateTypes.push(u); });
    });
    let ownTags = [];
    try { const ts = getCallNoteTagSuggestions(); ownTags = (ts && ts.tags) || []; } catch (_) {}
    const clean = kbAiSanitizeFacets_(facets, {
      departments: Object.keys(getDepartmentEmails_() || {}),
      updateTypes: updateTypes,
      flagTypes: CN_FLAG_TYPES.concat(['urgent']),
      tags: ownTags,
    });
    // Department alone is too generic to guide on — require a real signal.
    if (!clean.updateType && !clean.flagType && !clean.tags.length) {
      return { none: true, reason: 'no-facets' };
    }

    const canonical = kbAiCanonicalFacets_(clean);
    const cacheKey = KB_AI_CACHE_PREFIX + kbAiGeneration_() + ':' +
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, canonical)
        .map(function (b) { return ((b & 0xff) + 0x100).toString(16).substring(1); }).join('');
    const cache = CacheService.getScriptCache();
    try {
      const hit = cache.get(cacheKey);
      if (hit) { const o = JSON.parse(hit); o.cached = true; return o; }
    } catch (_) {}
    const noneOut = function (reason, cacheIt) {
      const o = { none: true, reason: reason, facetHash: canonical };
      if (cacheIt) { try { cache.put(cacheKey, JSON.stringify(o), KB_AI_CACHE_TTL); } catch (_) {} }
      return o;
    };

    // Retrieval over our own KB (the existing section search). A thin match
    // never reaches the vendor — the score floor keeps low-signal facet
    // combos free, and the none is cached so they STAY free. A search ERROR
    // (KB sheet unreachable) is NOT cached — transient outages shouldn't
    // pin a 6h none.
    // F(M-12): publishedOnly — guidance caches org-wide, so retrieval must
    // exclude drafts even when the triggering caller is an admin.
    const search = searchReference(kbAiQueryTerms_(clean), { publishedOnly: true });
    if (search && search.error) return noneOut('search-failed', false);
    const chunks = (((search && search.results) || [])
      .filter(function (r) { return r.type === 'article' && r.chunkMd; })
      .slice(0, KB_AI_MAX_CHUNKS));
    if (!chunks.length || chunks[0].score < KB_AI_SCORE_FLOOR) return noneOut('thin', true);

    const cfg = getKbAiConfig_();
    if (!cfg.apiKey) return noneOut('no-key', false);
    // Atomic cap check + reservation (L-2). Holding the lock across the slow
    // vendor fetch is deliberately avoided (the kbResolveDocImages_ lesson);
    // instead we reserve up front so concurrent misses see the bump, then
    // reconcile to the real cost / refund the reservation below.
    if (!kbAiTryReserveSpend_(cfg.dailyCap, KB_AI_CALL_RESERVE_USD)) return noneOut('cap', false);

    let vendor = null;
    try { vendor = kbAiCallVendor_(cfg, kbAiBuildPrompt_(clean, chunks)); }
    catch (e) { Logger.log('kbGetFacetGuidance vendor: ' + e.message); }
    if (!vendor) { kbAiApplySpend_(-KB_AI_CALL_RESERVE_USD, 0); return noneOut('vendor-failed', false); }

    const cost = kbAiEstimateCostUsd_(cfg.model, vendor.usage);
    kbAiApplySpend_(cost - KB_AI_CALL_RESERVE_USD, 1);
    // PHI-free audit row — facets are validated enums, never note content.
    writeAuditLog_(emp, 'KbAiGuidance', '', '', false, 0,
      'facets=' + canonical + '; model=' + cfg.model + '; usd=' + cost.toFixed(4), emp.email);
    if (!vendor.text || vendor.text.indexOf('NOT_COVERED') >= 0) return noneOut('not-covered', true);

    const out = {
      guidance: vendor.text.substring(0, 2000),
      sources: chunks.map(function (c) { return { id: c.id, title: c.title, heading: c.heading, anchor: c.anchor }; }),
      facetHash: canonical,
    };
    try { cache.put(cacheKey, JSON.stringify(out), KB_AI_CACHE_TTL); } catch (_) {}
    return out;
  } catch (err) { return { none: true, reason: 'error', error: err.message }; }
}
/** Extracts formatting runs from a DocumentApp Text element:
 *  [{ text, bold, italic, link }]. */
function kbTextToRuns_(textEl) {
  const s = textEl.getText();
  if (!s) return [];
  const idx = textEl.getTextAttributeIndices();
  if (!idx || idx.length === 0) {
    return [{ text: s, bold: !!textEl.isBold(0), italic: !!textEl.isItalic(0),
              link: textEl.getLinkUrl(0) || '' }];
  }
  const runs = [];
  for (let i = 0; i < idx.length; i++) {
    const start = idx[i];
    const end = (i + 1 < idx.length) ? idx[i + 1] : s.length;
    runs.push({
      text: s.substring(start, end),
      bold: !!textEl.isBold(start),
      italic: !!textEl.isItalic(start),
      link: textEl.getLinkUrl(start) || '',
    });
  }
  return runs;
}
/** PURE: formats runs into inline markdown. Render-safe for kbMd_:
 *  bold+italic collapses to bold (kbMd_ has no *** handling); links are
 *  emitted only for http(s)/mailto, with `()`/whitespace percent-encoded in
 *  the URL (kbMd_'s link regex stops at `)` / whitespace) and `[]` stripped
 *  from the link text; Docs soft line-breaks (\r) become spaces. */
function kbRunsToMarkdown_(runs) {
  return (runs || []).map(function (r) {
    let t = String(r.text == null ? '' : r.text).replace(/\r/g, ' ');
    if (!t) return '';
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const pre = m[1], post = m[3];
    let core = m[2];
    if (!core) return t;   // whitespace-only run
    if (r.bold) core = '**' + core + '**';
    else if (r.italic) core = '*' + core + '*';
    const link = String(r.link || '');
    if (link && /^(https?:|mailto:)/i.test(link)) {
      const safeUrl = link.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
      core = '[' + core.replace(/[\[\]]/g, '') + '](' + safeUrl + ')';
    }
    return pre + core + post;
  }).join('');
}
/** Walks a DocumentApp Body and returns { markdown, warnings }. Paragraphs,
 *  headings, bullet/numbered lists, horizontal rules, and tables convert
 *  faithfully (tables → GFM, row 0 as the header; cell formatting goes
 *  through the runs pipeline so bold/links survive); images become an
 *  italic placeholder — each lossy conversion adds a warning so the reviewing
 *  manager knows to keep the original Doc when visuals matter. */
function kbDocBodyToMarkdown_(body, docId) {
  const out = [];
  const warnings = [];
  let imageCount = 0;   // placeholder-degraded: drawings, over-cap, or no docId
  let imageTokens = 0;  // kbdoc:<docId>:<n> tokens emitted (exported on save)
  let imageOrd = 0;     // document-order INLINE_IMAGE ordinal — MUST match
                        // kbCollectDocInlineImages_'s walk (paragraphs only)
  let tableCellLineBreaks = false, nestedTables = false;
  const skippedTypes = {};
  let listBuf = [];
  const flushList = function () {
    if (listBuf.length) { out.push(listBuf.join('\n')); listBuf = []; }
  };
  const n = body.getNumChildren();
  for (let i = 0; i < n; i++) {
    const el = body.getChild(i);
    const t = String(el.getType());
    if (t === 'PARAGRAPH') {
      flushList();
      let isHr = false;
      let parImages = 0;        // → italic placeholder
      const parTokens = [];     // → kbdoc image tokens (Phase 2b)
      const m = el.getNumChildren();
      for (let c = 0; c < m; c++) {
        const ct = String(el.getChild(c).getType());
        if (ct === 'HORIZONTAL_RULE') isHr = true;
        else if (ct === 'INLINE_IMAGE') {
          // Phase 2b — emit an export token instead of a placeholder. The
          // token resolves to a Drive-hosted image when the manager SAVES
          // (kbSaveItem → kbResolveDocImages_); the converter stays
          // read-only. Drawings keep the placeholder (no blob API), as do
          // images past the per-doc cap or a docId-less call (Node stubs).
          imageOrd++;
          if (docId && imageOrd <= KB_DOC_IMAGE_CAP) parTokens.push(imageOrd);
          else parImages++;
        }
        else if (ct === 'INLINE_DRAWING') parImages++;
      }
      if (isHr) { out.push('---'); continue; }
      const text = kbRunsToMarkdown_(kbTextToRuns_(el.editAsText())).trim();
      const prefix = KB_DOC_HEADING_PREFIX[String(el.getHeading())] || '';
      let line = text ? prefix + text : '';
      if (parTokens.length > 0) {
        imageTokens += parTokens.length;
        line = (line ? line + ' ' : '') + parTokens.map(function (ord) {
          return '![Doc image ' + ord + '](kbdoc:' + docId + ':' + ord + ')';
        }).join(' ');
      }
      if (parImages > 0) {
        imageCount += parImages;
        line = (line ? line + ' ' : '') + '*[image — see the original Doc]*';
      }
      if (line) out.push(line);
    } else if (t === 'LIST_ITEM') {
      const glyph = String(el.getGlyphType());
      const ordered = glyph === 'NUMBER' || glyph.indexOf('LATIN') === 0 || glyph.indexOf('ROMAN') === 0;
      const indent = new Array(Math.max(0, el.getNestingLevel()) + 1).join('  ');
      const text = kbRunsToMarkdown_(kbTextToRuns_(el.editAsText())).trim();
      if (text) listBuf.push(indent + (ordered ? '1. ' : '- ') + text);
    } else if (t === 'TABLE') {
      flushList();
      // GFM table: row 0 = header (Docs tables have no header concept), then
      // the |---| separator, then body rows. Literal pipes in cells escape as
      // \| (kbMd_'s tableCells understands that); a cell's internal line
      // breaks join with spaces (GFM cells are single-line). Cell text goes
      // through the runs pipeline so bold/links convert too. Nested tables
      // flatten into the parent cell's text via editAsText() — warned.
      const rowsOut = [];
      let maxCols = 0;
      const numRows = el.getNumRows();
      for (let r = 0; r < numRows; r++) {
        const row = el.getRow(r);
        const cells = [];
        for (let c = 0; c < row.getNumCells(); c++) {
          const cell = row.getCell(c);
          try {
            const cn = cell.getNumChildren ? cell.getNumChildren() : 0;
            for (let k = 0; k < cn; k++) {
              if (String(cell.getChild(k).getType()) === 'TABLE') nestedTables = true;
            }
          } catch (e) {}
          let text = kbRunsToMarkdown_(kbTextToRuns_(cell.editAsText()));
          if (/\n/.test(text)) tableCellLineBreaks = true;
          text = text.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
          cells.push(text);
        }
        rowsOut.push(cells);
        if (cells.length > maxCols) maxCols = cells.length;
      }
      const hasContent = rowsOut.some(function (cells) { return cells.join('') !== ''; });
      if (maxCols > 0 && hasContent) {
        const pad = function (cells) {
          const padded = cells.slice();
          while (padded.length < maxCols) padded.push('');
          return '| ' + padded.join(' | ') + ' |';
        };
        const lines = [pad(rowsOut[0])];
        lines.push('|' + new Array(maxCols + 1).join(' --- |'));
        for (let r2 = 1; r2 < rowsOut.length; r2++) lines.push(pad(rowsOut[r2]));
        out.push(lines.join('\n'));
      }
    } else {
      skippedTypes[t] = true;
    }
  }
  flushList();
  if (imageTokens > 0) {
    warnings.push(imageTokens + ' image(s) marked for export — they upload to the KB Images Drive folder when you press Save (the preview shows their alt text until then).');
  }
  if (imageCount > 0) {
    warnings.push(imageCount + ' image(s)/drawing(s) could not be converted — placeholders inserted; keep the original Doc if the visuals matter.');
  }
  if (nestedTables) {
    warnings.push('Nested table(s) flattened into their parent cell — review the converted table(s).');
  }
  if (tableCellLineBreaks) {
    warnings.push('Some table cell(s) had multiple lines — joined with spaces.');
  }
  const skipped = Object.keys(skippedTypes);
  if (skipped.length > 0) {
    warnings.push('Skipped unsupported element(s): ' + skipped.join(', ') + '.');
  }
  const markdown = out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { markdown: markdown, warnings: warnings };
}
/** Converts one sheet tab to markdown.
 *
 *  Two shapes, chosen by what the sheet actually IS rather than by a setting:
 *
 *  (a) A plain table — a header row and data rows, no merges — becomes a GFM
 *      table, which `kbMd_` already renders.
 *  (b) A BANDED grid — the merged-cell layout people build by hand, where a
 *      full-width merge is a section and a partial merge is a sub-section —
 *      becomes headings + grouped member lines. A GFM table of that shape is a
 *      field of empty cells, which is why the shape is detected rather than
 *      assumed.
 *
 *  Takes a plain accessor object so the Node harness can drive it without a
 *  live spreadsheet (the kbDocBodyToMarkdown_ pattern):
 *    { name, values: string[][], merges: [{row, col, rows, cols}], backgrounds }
 *  Rows/cols are 1-indexed to match the Sheets API. */
function kbSheetGridToMarkdown_(grid) {
  const name = String((grid && grid.name) || '').trim();
  const values = (grid && grid.values) || [];
  const merges = (grid && grid.merges) || [];
  const backgrounds = (grid && grid.backgrounds) || null;
  const warnings = [];
  if (!values.length) return { markdown: '', warnings: ['Sheet "' + name + '" is empty — skipped.'] };

  // Width = the widest row that carries content, so trailing empty columns
  // don't stretch every heading test.
  let width = 0;
  values.forEach(function (r) {
    for (let c = r.length - 1; c >= 0; c--) {
      if (String(r[c] == null ? '' : r[c]).trim()) { if (c + 1 > width) width = c + 1; break; }
    }
  });
  if (!width) return { markdown: '', warnings: ['Sheet "' + name + '" is empty — skipped.'] };

  // Index merges by their anchor cell (Sheets reports the value on the anchor).
  const mergeAt = {};
  merges.forEach(function (m) {
    if (m && m.cols > 1) mergeAt[(m.row - 1) + ':' + (m.col - 1)] = m.cols;
  });

  // Highlighted cells carry meaning in hand-built sheets (a lead, a primary vs
  // a backup) that no text in the cell states. Dropping it silently loses real
  // information, and INVENTING a meaning would be worse — so a highlight is
  // preserved as emphasis and the operator is told to write the legend down.
  const tinted = {};
  const tintSeen = {};
  if (backgrounds) {
    for (let r = 0; r < backgrounds.length; r++) {
      for (let c = 0; c < (backgrounds[r] || []).length; c++) {
        const bg = String(backgrounds[r][c] || '').toLowerCase();
        if (bg && bg !== '#ffffff' && bg !== 'white' && bg !== '#fff') {
          tinted[r + ':' + c] = true;
          tintSeen[bg] = (tintSeen[bg] || 0) + 1;
        }
      }
    }
  }

  const esc = function (v) { return String(v == null ? '' : v).trim().replace(/\|/g, '\\|'); };
  const cellMd = function (r, c) {
    const raw = esc(values[r][c]);
    if (!raw) return '';
    return tinted[r + ':' + c] ? '**' + raw + '**' : raw;
  };

  const out = [];
  if (name) out.push('## ' + name);

  // Shape detection: a grid with NO multi-column merges and a non-empty first
  // row is an ordinary table.
  const hasBands = Object.keys(mergeAt).length > 0;
  if (!hasBands) {
    const head = [];
    for (let c = 0; c < width; c++) head.push(esc(values[0][c]) || ('Column ' + (c + 1)));
    out.push('', '| ' + head.join(' | ') + ' |', '|' + head.map(function () { return '---'; }).join('|') + '|');
    let emitted = 0;
    for (let r = 1; r < values.length; r++) {
      const cells = [];
      let any = false;
      for (let c = 0; c < width; c++) { const v = cellMd(r, c); cells.push(v); if (v) any = true; }
      if (!any) continue;
      out.push('| ' + cells.join(' | ') + ' |');
      emitted++;
    }
    if (!emitted) warnings.push('Sheet "' + name + '" had a header row but no data rows.');
  } else {
    // Banded grid. The load-bearing detail: these sheets partition by COLUMN,
    // not by row — two sub-teams sit side by side in the same rows. A row-wise
    // walk flattens them into one line and reads as though PPD's people cover
    // MDO, which for a call-routing map is worse than not converting at all.
    // So headers claim a COLUMN RANGE and members are collected per range.
    let groups = [];           // [{ title, from, to, members: [] }]
    const flush = function () {
      groups.forEach(function (g) {
        if (!g.members.length && !g.title) return;
        if (g.title) out.push('', '#### ' + g.title.replace(/\|/g, '\\|'));
        if (g.members.length) out.push(g.members.join(' · '));
      });
      groups = [];
    };
    // A BAND spans essentially the whole used width; a sub-team spans a slice
    // of it. A ratio test is too coarse — measured against a real roster, a
    // 3-column sub-team merge cleared a 60%-of-6-columns bar and every
    // sub-team was misread as a department.
    const bandWidth = Math.max(2, width);

    for (let r = 0; r < values.length; r++) {
      const rowVals = [];
      for (let c = 0; c < width; c++) rowVals.push(String(values[r][c] == null ? '' : values[r][c]).trim());
      if (!rowVals.some(function (v) { return v; })) continue;   // blank spacer

      // (1) BAND row — one wide merge carrying the department name.
      let band = '';
      for (let c = 0; c < width; c++) {
        const span = mergeAt[r + ':' + c];
        if (span && span >= bandWidth && rowVals[c]) { band = rowVals[c]; break; }
      }
      if (band) { flush(); out.push('', '### ' + band.replace(/\|/g, '\\|')); continue; }

      // (2) SUB-HEADER row — carries at least one multi-column merge. Every
      // content cell on such a row is a header; each claims the columns from
      // its own position up to the next header (or the end of the row), which
      // is what makes the side-by-side sub-teams separable.
      const headerCells = [];
      let sawMerge = false;
      for (let c = 0; c < width; c++) {
        if (!rowVals[c]) continue;
        const span = mergeAt[r + ':' + c] || 1;
        if (span > 1) sawMerge = true;
        headerCells.push({ title: rowVals[c], col: c });
      }
      if (sawMerge && headerCells.length) {
        flush();
        headerCells.forEach(function (h, i) {
          const next = headerCells[i + 1];
          groups.push({ title: h.title, from: h.col, to: next ? next.col : width, members: [] });
        });
        continue;
      }

      // (3) MEMBER row — each cell joins the group owning its column. Cells
      // outside every group (or a band with no sub-headers) fall to an
      // implicit full-width group so nothing is dropped.
      if (!groups.length) groups = [{ title: '', from: 0, to: width, members: [] }];
      for (let c = 0; c < width; c++) {
        const v = cellMd(r, c);
        if (!v) continue;
        let g = null;
        for (let gi = 0; gi < groups.length; gi++) {
          if (c >= groups[gi].from && c < groups[gi].to) { g = groups[gi]; break; }
        }
        if (!g) { g = { title: '', from: c, to: width, members: [] }; groups.push(g); }
        g.members.push(v);
      }
    }
    flush();
  }

  const tintCount = Object.keys(tintSeen).length;
  if (tintCount) {
    warnings.push('Sheet "' + name + '": ' + tintCount + ' highlight colour(s) were used. Highlighted cells are ' +
      'bolded, but what a colour MEANT is not written anywhere in the sheet — add a legend line to the article.');
  }
  return { markdown: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), warnings: warnings };
}
/** Re-emits a BANDED conversion as a ```roster fence — the interactive
 *  directory block — instead of static headings. Same information, but the
 *  reader gets filter-as-you-type, tag tooltips and click-to-copy, which is
 *  what a routing map is actually used for. Only the banded shape converts:
 *  a tabular sheet is a table, and forcing it into a roster would be a lie
 *  about what the data is. */
function kbRosterFromBanded_(markdown) {
  const lines = String(markdown || '').split('\n');
  const out = [];
  let dept = '', team = '', sub = '', pending = [];
  const flush = function () {
    if (!team || !pending.length) { pending = []; return; }
    out.push('team| ' + team + (sub ? ' > ' + sub : '') + ': ' + pending.join(', '));
    pending = [];
  };
  lines.forEach(function (ln) {
    const t = ln.trim();
    if (!t) return;
    let m = t.match(/^###\s+(.*)$/);
    if (m) {
      flush(); team = ''; sub = '';
      // "PAK (Mary)" → the owner is the parenthesised name.
      const dm = m[1].match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      dept = dm ? dm[1].trim() : m[1].trim();
      out.push('dept| ' + dept + (dm ? ' — ' + dm[2].trim() : ''));
      return;
    }
    m = t.match(/^####\s+(.*)$/);
    if (m) {
      flush();
      const full = m[1].trim();
      const gi = full.indexOf('>');
      if (gi >= 0) { team = full.slice(0, gi).trim(); sub = full.slice(gi + 1).trim(); }
      else { team = full; sub = ''; }
      return;
    }
    if (t.charAt(0) === '#') return;                 // the sheet-name h2
    // A member line: "**Micheal** · Sandra · Selena". Bold marked a highlighted
    // cell, which the sheet used for leads — carried across as the *lead flag.
    t.split('·').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (cell) {
      const bold = /^\*\*(.*)\*\*$/.exec(cell);
      pending.push((bold ? bold[1].trim() : cell) + (bold ? '*lead' : ''));
    });
  });
  flush();
  return out.length ? '```roster\n' + out.join('\n') + '\n```' : '';
}
/** Admin-gated, strictly READ-ONLY (the INV-115 posture): it never writes the
 *  Sheet and never writes a KB row. The manager reviews the markdown in the
 *  editor and the normal kbSaveItem persists it — so re-converting after the
 *  sheet changes is a deliberate refresh, never a background overwrite of an
 *  article someone has since edited by hand. Uses SpreadsheetApp, already an
 *  authorized scope, so unlike the Doc converter this adds NO new OAuth scope. */
function kbConvertDriveSheet(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    payload = payload || {};
    let fileId = '', title = '', department = '', status = '';
    if (payload.itemId) {
      const kb = getOrCreateKbSheet_();
      const last = kb.getLastRow();
      let row = null;
      if (last >= 2) {
        const ids = kb.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === payload.itemId) {
            row = kb.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
            break;
          }
        }
      }
      if (!row) return { error: 'Item not found.' };
      if (String(row[KB.TYPE]) !== 'embed' || String(row[KB.DRIVE_KIND] || '') !== 'sheet') {
        return { error: 'Only embedded Google Sheets can be converted with this action.' };
      }
      fileId = String(row[KB.DRIVE_FILE_ID] || '');
      title = String(row[KB.TITLE] || '');
      department = String(row[KB.DEPARTMENT] || '');
      status = kbRowStatus_(row[KB.STATUS]);   // M-13: a draft must stay a draft
    } else {
      const parsed = kbParseDriveUrl_(payload.driveUrl);
      if (!parsed) return { error: 'Could not read that Drive link — paste a Google Sheet share URL.' };
      if (parsed.kind !== 'sheet') return { error: 'That link is not a Google Sheet.' };
      fileId = parsed.fileId;
    }
    if (!fileId) return { error: 'No Sheet id on this item.' };
    let ss;
    try { ss = SpreadsheetApp.openById(fileId); }
    catch (e) {
      return { error: 'Could not open the Sheet — the deploying account needs at least Viewer access. (' + e.message + ')' };
    }
    const parts = [], warnings = [];
    ss.getSheets().forEach(function (sh) {
      if (sh.isSheetHidden && sh.isSheetHidden()) return;
      const lastRow = Math.min(sh.getLastRow(), KB_SHEET_MAX_ROWS);
      const lastCol = Math.min(sh.getLastColumn(), KB_SHEET_MAX_COLS);
      if (lastRow < 1 || lastCol < 1) return;
      if (sh.getLastRow() > KB_SHEET_MAX_ROWS) {
        warnings.push('Tab "' + sh.getName() + '" has ' + sh.getLastRow() + ' rows — only the first ' +
          KB_SHEET_MAX_ROWS + ' were converted.');
      }
      if (sh.getLastColumn() > KB_SHEET_MAX_COLS) {
        warnings.push('Tab "' + sh.getName() + '" has ' + sh.getLastColumn() + ' columns — only the first ' +
          KB_SHEET_MAX_COLS + ' were converted.');
      }
      const range = sh.getRange(1, 1, lastRow, lastCol);
      // getDisplayValues: a roster carries dates/numbers that must read exactly
      // as the sheet shows them, and the CDR lesson (INV-64) applies to any
      // foreign spreadsheet whose timezone we do not control.
      const grid = {
        name: sh.getName(),
        values: range.getDisplayValues(),
        backgrounds: range.getBackgrounds(),
        merges: range.getMergedRanges().map(function (m) {
          return { row: m.getRow(), col: m.getColumn(), rows: m.getNumRows(), cols: m.getNumColumns() };
        }),
      };
      const res = kbSheetGridToMarkdown_(grid);
      if (res.markdown) parts.push(res.markdown);
      res.warnings.forEach(function (w) { warnings.push(w); });
    });
    if (!parts.length) return { error: 'That Sheet has no readable content.' };
    let markdown = parts.join('\n\n');
    // A banded roster becomes the INTERACTIVE block by default — that is the
    // shape this converter exists for, and a static rendering of it is the
    // thing the operator asked to improve on. `plain: true` opts out.
    if (!payload.plain) {
      const ros = kbRosterFromBanded_(markdown);
      if (ros) {
        markdown = ros;
        warnings.push('Converted to an interactive roster block: reps get filter-as-you-type, ' +
          'tag tooltips and click-to-copy. Add a `legend|` line so the tags explain themselves.');
      }
    }
    if (markdown.length > KB_BODY_MAX) {
      warnings.push('Converted article is over the ~49,000-character limit — trim it before saving, or split it across articles.');
    }
    return {
      success: true,
      markdown: markdown,
      warnings: warnings,
      docTitle: String(ss.getName() || ''),
      title: title,
      department: department,
      status: status,
    };
  } catch (err) { return { error: err.message }; }
}
/** Pure (Node-pinned): what to DO with a file, decided by its name alone.
 *  Kept separate from the I/O so the routing is testable — it is the part
 *  that decides whether a rep ends up with a searchable article or an
 *  iframe. */
function kbIngestPlan_(fileName) {
  const name = String(fileName || '').trim();
  if (!name) return { kind: 'reject', reason: 'The file has no name.' };
  if (KB_INGEST_TEXT_EXT.test(name)) return { kind: 'text' };
  if (KB_INGEST_CSV_EXT.test(name)) return { kind: 'csv' };
  const m = /\.([a-z0-9]+)$/i.exec(name);
  const ext = m ? m[1].toLowerCase() : '';
  if (Object.prototype.hasOwnProperty.call(KB_INGEST_CONVERT, ext)) {
    return { kind: 'convert', ext: ext, target: KB_INGEST_CONVERT[ext].mime, driveKind: KB_INGEST_CONVERT[ext].kind };
  }
  return { kind: 'embed', ext: ext };
}
/** Upload bytes to the KB folder, optionally asking Drive to CONVERT them to
 *  a native Google file. Returns {fileId, converted} or throws. Uses the
 *  script's own OAuth token via UrlFetchApp — no advanced service, no new
 *  declared scope (see the section note). */
function kbDriveUpload_(name, contentType, bytes, targetMime) {
  const folderId = getOrCreateKbImagesFolder_().getId();
  if (!targetMime) {
    const f = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes, contentType, name));
    return { fileId: f.getId(), converted: false };
  }
  const boundary = 'kbingest' + Utilities.getUuid();
  const meta = { name: name, mimeType: targetMime, parents: [folderId] };
  const head = Utilities.newBlob(
    '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + '\r\n' +
    '--' + boundary + '\r\nContent-Type: ' + (contentType || 'application/octet-stream') + '\r\n\r\n').getBytes();
  const tail = Utilities.newBlob('\r\n--' + boundary + '--').getBytes();
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: head.concat(bytes).concat(tail),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Drive conversion refused (HTTP ' + code + ')');
  const body = JSON.parse(res.getContentText() || '{}');
  if (!body.id) throw new Error('Drive conversion returned no file id');
  return { fileId: body.id, converted: true };
}
/** Ingest one uploaded file for the KB editor. Admin-gated (INV-136 tier —
 *  KB content authoring, same as the converters it delegates to), READ-ONLY
 *  w.r.t. the KB sheet, no lock (the only write is a Drive file). */
function kbIngestFile(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    const p = payload || {};
    const name = String(p.name || '').trim();
    const b64 = String(p.base64 || '');
    if (!b64) return { error: 'No file received.' };
    if (b64.length > KB_INGEST_MAX_CHARS) {
      return { error: 'That file is too large (limit ~' + Math.round(KB_INGEST_MAX_CHARS / 1400000) + 'MB).' };
    }
    const plan = kbIngestPlan_(name);
    if (plan.kind === 'reject') return { error: plan.reason };
    const titleGuess = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();

    if (plan.kind === 'text') {
      let text;
      try { text = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString(); }
      catch (e) { return { error: 'Could not read that file as text.' }; }
      return { success: true, kind: 'article', markdown: text, title: titleGuess, warnings: [] };
    }

    if (plan.kind === 'csv') {
      let text;
      try { text = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString(); }
      catch (e) { return { error: 'Could not read that file as text.' }; }
      const grid = kbParseCsv_(text);
      if (!grid.length) return { error: 'That CSV has no rows.' };
      // Reuse the PRODUCTION sheet converter — a CSV becomes the same GFM
      // table an imported Sheet would, with no second generator to drift.
      const conv = kbSheetGridToMarkdown_({ name: titleGuess, values: grid, merges: [], backgrounds: null });
      const warnings = (conv.warnings || []).slice();
      warnings.push('A CSV becomes a table for READING. If this is a lookup the app should QUERY (like the payor table), import it under Admin → Config → Reference data tables instead.');
      return { success: true, kind: 'article', markdown: conv.markdown, title: titleGuess, warnings: warnings };
    }

    // Everything else has to reach Drive.
    const bytes = Utilities.base64Decode(b64);
    const contentType = String(p.contentType || 'application/octet-stream');
    let up = null, convertNote = '';
    if (plan.kind === 'convert') {
      try { up = kbDriveUpload_(titleGuess || name, contentType, bytes, plan.target); }
      catch (e) {
        convertNote = 'This file could not be converted to a Google ' + (plan.driveKind === 'sheet' ? 'Sheet' : 'Doc') +
          ' (' + e.message + '), so it was attached as an embedded file instead — readable in the app, but only its TITLE is searchable.';
        up = null;
      }
    }
    if (!up) {
      try { up = kbDriveUpload_(name, contentType, bytes, null); }
      catch (e) { return { error: 'Could not upload that file to Drive: ' + e.message }; }
    }
    const fileId = up.fileId;
    if (up.converted) {
      // Hand the freshly-converted native file to the EXISTING converter, so
      // the ingest path and the paste-a-Drive-URL path produce byte-identical
      // articles from the same source.
      const url = plan.driveKind === 'sheet'
        ? 'https://docs.google.com/spreadsheets/d/' + fileId + '/edit'
        : 'https://docs.google.com/document/d/' + fileId + '/edit';
      const conv = plan.driveKind === 'sheet' ? kbConvertDriveSheet({ driveUrl: url }) : kbConvertDriveDoc({ driveUrl: url });
      if (conv && !conv.error) {
        return {
          success: true, kind: 'article', markdown: conv.markdown || '',
          title: titleGuess, warnings: (conv.warnings || []).slice(), converted: true,
        };
      }
      // Converted in Drive but the converter refused — the native file is
      // still better than the original, so embed THAT and say what happened.
      return {
        success: true, kind: 'embed', driveUrl: url, title: titleGuess,
        warnings: [(conv && conv.error) || 'The converted file could not be read as an article — embedded instead.'],
      };
    }
    return {
      success: true, kind: 'embed',
      driveUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
      title: titleGuess,
      warnings: convertNote ? [convertNote]
        : ['Attached as an embedded file — readable in the app, but only its TITLE is searchable. Convert it to a Google Doc or Sheet in Drive and re-drop it to get a full article.'],
    };
  } catch (err) { return { error: err.message }; }
}
function kbConvertDriveDoc(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    payload = payload || {};
    let fileId = '', title = '', department = '', status = '';
    const itemId = String(payload.itemId || '').trim();
    if (itemId) {
      const sheet = getOrCreateKbSheet_();
      const last = sheet.getLastRow();
      let row = null;
      if (last >= 2) {
        const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === itemId) {
            row = sheet.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
            break;
          }
        }
      }
      if (!row) return { error: 'Item not found.' };
      if (String(row[KB.TYPE]) !== 'embed' || String(row[KB.DRIVE_KIND] || 'doc') !== 'doc') {
        return { error: 'Only embedded Google Docs can be converted to articles.' };
      }
      fileId = String(row[KB.DRIVE_FILE_ID] || '');
      title = String(row[KB.TITLE] || '');
      department = String(row[KB.DEPARTMENT] || '');
      // F(M-13): carry the item's status so the editor's "Save as draft"
      // checkbox seeds correctly — converting a DRAFT embed then saving used
      // to silently flip it published (the editor always sends an explicit
      // status, which wins over the stored row).
      status = kbRowStatus_(row[KB.STATUS]);
    } else {
      const parsed = kbParseDriveUrl_(payload.driveUrl);
      if (!parsed) return { error: 'Could not read that Drive link — paste a Google Doc share URL.' };
      if (parsed.kind !== 'doc') return { error: 'Only Google Docs convert to articles — Sheets and files stay as embeds.' };
      fileId = parsed.fileId;
    }
    if (!fileId) return { error: 'No Doc id on this item.' };
    let doc;
    try { doc = DocumentApp.openById(fileId); }
    catch (e) {
      return { error: 'Could not open the Doc — the deploying account needs at least Viewer access. (' + e.message + ')' };
    }
    const res = kbDocBodyToMarkdown_(doc.getBody(), fileId);
    if (res.markdown.length > KB_BODY_MAX) {
      res.warnings.push('Converted article is over the ~49,000-character limit — trim it before saving, or split into multiple articles.');
    }
    return {
      success: true,
      markdown: res.markdown,
      warnings: res.warnings,
      docTitle: String(doc.getName() || ''),
      title: title,
      department: department,
      status: status,   // F(M-13): '' on the driveUrl (no-row) path
    };
  } catch (err) { return { error: err.message }; }
}
/** Bounded KB title join: id → {title, kbType}. */
function trainKbTitles_() {
  const sheet = getOrCreateKbSheet_();
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return map;
  // F(L-9): read the full row width so `status` rides along — training must
  // not treat a DRAFT KB item like a published one (draft titles leaked to
  // reps via the checklist, and the item was unopenable for them anyway).
  const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
  rows.forEach(function (r) {
    if (r[0]) map[String(r[0])] = {
      title: String(r[2] || '(untitled)'),
      kbType: String(r[3] || 'article'),
      status: kbRowStatus_(r[KB.STATUS]),
    };
  });
  return map;
}
